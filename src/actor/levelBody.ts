/**
 * HER BODY KEPT LEVEL (Trello #273, step 3c; Joshua, 2026-11-08: "automatic body tilt to keep a level body even if it
 * means like the torso tilts back, hips forward slightly... I would test on different gradient like flat floor at 0, 30
 * straight ahead... any forward or backward tilt").
 *
 * WHERE HER BALANCE GOES. Over the same part of her soles whatever the floor does. On level ground it falls where her own
 * upright posture puts it, her pregnancy left out (actor/bodyMass.ts `centreOfMass`). On a slope her feet tilt to it
 * about her ankles, and the point of her soles that was under her balance is carried round with them: rising ahead of
 * her ankles up a slope, falling behind them down one -- so up a slope she leans into it and down one she sits back, as
 * people do walking slopes (Leroux, Fung & Barbeau 2002: trunk and pelvis tilt forward uphill and back downhill, the
 * knees bending more downhill) and leaning forward standing on a toes-up slope (Kluzik, Horak & Peterka 2007). Her
 * pregnancy's weight in front of her moves her balance forward; she takes it back as a pregnant woman does, her upper
 * body leaning back over her lower back -- which curves more to carry it (Whitcome, Shapiro & Lieberman 2007) -- and
 * her hips a little forward.
 *
 * HOW SHE GETS THERE. Her hips move over her planted feet (her legs reach back to them), and her trunk leans about her
 * lower back (the rig's `spine` joint: everything above it -- her chest, arms, neck and head, and her womb, which hangs
 * from it -- turns with it), her head kept level. Down a slope her knees bend too, as a walker's do.
 *
 * Pure: points in, a posture out (`levelBody`); `leanBody` lays a posture on the points, so a test -- or anyone -- can
 * check where it puts her balance. Metres, radians; y up; horizontal vectors are [x, z].
 */
import { rangeDeg } from '../data/jointRange';
import { BODY_KG, centreOfMass, type BodyPoints, type ExtraMass, type P2, type P3 } from './bodyMass';

/** The tuning. */
export const LEVEL = Object.freeze({
  /** The share of a slope's shift of her balance her hips carry; her trunk leans for the rest. GAME TUNING. */
  hipsSlope: 0.5,
  /** Her hips go forward by this share of how far her pregnancy pulls her balance forward (Joshua: "hips forward
   * slightly"); her trunk leans back for all the rest. GAME TUNING. */
  hipsPregnant: 0.5,
  /** Down a slope her hips come down this far a degree of it, her knees bending to reach her feet, metres. GAME TUNING:
   * 2.4 cm at 20 degrees (Leroux 2002: the knees bend more walking downhill). */
  sitPerDeg: 0.0012,
  /** Seconds to settle into a new posture: a slope or a pregnancy changed under her is leaned into, not snapped to.
   * GAME TUNING. */
  ease: 0.3,
});

/** Where her knees go when her hips move over her planted feet: about this share of the way. BIOLOGICAL SHAPE,
 * approximate: a leg's two bones between a moving hip and a still ankle. */
const KNEE_FOLLOWS = 0.5;

export interface LevelInput {
  /** Her body as it stands now, upright, before any of this posture (metres). */
  readonly body: BodyPoints;
  /** Her pregnancy: the womb and what it holds, kg, and where; null or 0 kg with none. */
  readonly womb: ExtraMass | null;
  /** Her body's own mass, kg (bodyMass.ts `BODY_KG`). */
  readonly bodyKg?: number;
  /** The joint her trunk leans about: her lower back. */
  readonly pivot: P3;
  /** Which way she faces, horizontal, unit. */
  readonly forward: P2;
  /** The floor's pitch along her facing, degrees: + rising ahead of her (uphill), - falling. */
  readonly slopeDeg: number;
  /** Her ankles' height over her soles standing flat, metres. */
  readonly ankleHeight: number;
  /** How much of it (Joshua's LEAN slider): 1 as tuned, 0 none, 2 twice. */
  readonly amount?: number;
}

export interface Level {
  /** Her trunk's lean: which way the top of it goes and how far, radians as a horizontal vector. */
  readonly lean: P2;
  /** How far her hips move over her feet, metres. */
  readonly hips: P2;
  /** How far her hips come down, her knees bending, metres. */
  readonly sit: number;
}

export const LEVEL_NONE: Level = Object.freeze({ lean: Object.freeze([0, 0]) as P2, hips: Object.freeze([0, 0]) as P2, sit: 0 });

/** A point turned about `pivot` by `lean` (the top going `lean`'s way by its length, radians). */
function turnAbout(p: P3, pivot: P3, lean: P2): P3 {
  const a = Math.hypot(lean[0], lean[1]);
  if (a < 1e-12) return p;
  // about the horizontal axis up x lean (so up turns toward lean): Rodrigues
  const kx = lean[1] / a, kz = -lean[0] / a, c = Math.cos(a), s = Math.sin(a);
  const vx = p[0] - pivot[0], vy = p[1] - pivot[1], vz = p[2] - pivot[2];
  const dot = kx * vx + kz * vz;
  // k x v, k = (kx, 0, kz)
  const cx = -kz * vy, cy = kz * vx - kx * vz, cz = kx * vy;
  return [pivot[0] + vx * c + cx * s + kx * dot * (1 - c), pivot[1] + vy * c + cy * s, pivot[2] + vz * c + cz * s + kz * dot * (1 - c)];
}

/** Her body with a posture laid on it: hips moved (knees KNEE_FOLLOWS of the way, feet still) and down, trunk leaned. */
export function leanBody(b: BodyPoints, pivot: P3, level: Level, womb: ExtraMass | null = null): { body: BodyPoints; womb: ExtraMass | null; pivot: P3 } {
  const [hx, hz] = level.hips, sit = level.sit;
  const move = (p: P3, share = 1): P3 => [p[0] + hx * share, p[1] - sit * share, p[2] + hz * share];
  const P = move(pivot);
  const top = (p: P3): P3 => turnAbout(move(p), P, level.lean);
  const pair = (q: readonly [P3, P3], f: (p: P3) => P3) => [f(q[0]), f(q[1])] as const;
  return {
    body: {
      headTop: top(b.headTop), neck: top(b.neck), hipL: move(b.hipL), hipR: move(b.hipR),
      shoulder: pair(b.shoulder, top), elbow: pair(b.elbow, top), wrist: pair(b.wrist, top), handEnd: pair(b.handEnd, top),
      knee: pair(b.knee, (p) => move(p, KNEE_FOLLOWS)), ankle: b.ankle, heel: b.heel, toe: b.toe,
    },
    womb: womb ? { kg: womb.kg, at: top(womb.at) } : null,
    pivot: P,
  };
}

const flat = (p: P3): P2 => [p[0], p[2]];

/** Her balance (horizontal) with a posture laid on her. */
function balanceWith(i: LevelInput, level: Level): P2 {
  const laid = leanBody(i.body, i.pivot, level, i.womb);
  return flat(centreOfMass(laid.body, i.bodyKg ?? BODY_KG, laid.womb && laid.womb.kg > 0 ? [laid.womb] : []));
}

/** The most her trunk leans, each way, radians: her back's range (data/jointRange.ts), as she moves herself. */
function leanMost(towardFront: boolean): number {
  return (rangeDeg('back', towardFront ? 'flexion' : 'extension', 'female') * Math.PI) / 180;
}

/** The posture that keeps her level (see the header). */
export function levelBody(i: LevelInput): Level {
  const amount = Math.max(0, i.amount ?? 1);
  if (!(amount > 0)) return LEVEL_NONE;
  const kg = i.bodyKg ?? BODY_KG, [fx, fz] = i.forward;
  // where her balance is, where it is without her pregnancy, and where her ankles are
  const now = flat(centreOfMass(i.body, kg, i.womb && i.womb.kg > 0 ? [i.womb] : []));
  const bare = flat(centreOfMass(i.body, kg));
  const ankles: P2 = [(i.body.ankle[0][0] + i.body.ankle[1][0]) / 2, (i.body.ankle[0][2] + i.body.ankle[1][2]) / 2];
  // where it goes: over the same point of her soles as on level ground, carried round with her feet as they tilt to the
  // slope about her ankles -- that point stood `ahead` in front of her ankles and `ankleHeight` under them
  const th = (Math.max(-89, Math.min(89, i.slopeDeg || 0)) * Math.PI) / 180;
  const ahead = (bare[0] - ankles[0]) * fx + (bare[1] - ankles[1]) * fz;
  const slopeShift = (ahead * (Math.cos(th) - 1) + i.ankleHeight * Math.sin(th)) * amount;
  const pull: P2 = [(now[0] - bare[0]) * amount, (now[1] - bare[1]) * amount];
  const want: P2 = [now[0] + fx * slopeShift - pull[0], now[1] + fz * slopeShift - pull[1]];
  // her hips: a share of the slope's shift, and forward a little against her pregnancy's pull -- each as far as moves
  // her balance that far (her legs below her hips move less than her hips do)
  const hipsAlone = balanceWith(i, { lean: [0, 0], hips: [fx, fz], sit: 0 }), carried = (hipsAlone[0] - now[0]) * fx + (hipsAlone[1] - now[1]) * fz;
  const hipsSlope = (LEVEL.hipsSlope * slopeShift) / Math.max(1e-3, carried);
  const hips: P2 = [fx * hipsSlope + LEVEL.hipsPregnant * pull[0], fz * hipsSlope + LEVEL.hipsPregnant * pull[1]];
  const sit = LEVEL.sitPerDeg * Math.max(0, -(i.slopeDeg || 0)) * amount;
  // her trunk: leaned until her balance is where it goes (Newton's method on how far a lean carries it)
  let lean: P2 = [0, 0];
  for (let n = 0; n < 3; n++) {
    const at = balanceWith(i, { lean, hips, sit }), mx = want[0] - at[0], mz = want[1] - at[1], miss = Math.hypot(mx, mz);
    if (miss < 1e-6) break;
    const dx = mx / miss, dz = mz / miss, h = 1e-3;
    const tried = balanceWith(i, { lean: [lean[0] + dx * h, lean[1] + dz * h], hips, sit });
    const per = ((tried[0] - at[0]) * dx + (tried[1] - at[1]) * dz) / h;
    if (!(per > 1e-6)) break;
    lean = [lean[0] + (dx * miss) / per, lean[1] + (dz * miss) / per];
  }
  // within her back's range: forward to its flexion, back to its extension
  const a = Math.hypot(lean[0], lean[1]);
  if (a > 0) {
    const most = leanMost(lean[0] * fx + lean[1] * fz >= 0);
    if (a > most) lean = [(lean[0] * most) / a, (lean[1] * most) / a];
  }
  return { lean, hips, sit };
}

/** A posture eased toward `want` over `dt` seconds (LEVEL.ease). */
export function easeLevel(from: Level, want: Level, dt: number): Level {
  const k = dt > 0 ? 1 - Math.exp(-dt / LEVEL.ease) : 0;
  const mix = (a: number, b: number) => a + (b - a) * k;
  return { lean: [mix(from.lean[0], want.lean[0]), mix(from.lean[1], want.lean[1])], hips: [mix(from.hips[0], want.hips[0]), mix(from.hips[1], want.hips[1])], sit: mix(from.sit, want.sit) };
}
