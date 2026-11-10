/**
 * HER BIRTH OPENING AND HER BABY'S WAY OUT (the skeleton-outward plan, Phase 1: "Open the cervix and canal with the
 * room's BIRTH OPENING slider, and check the baby's path against the pelvic diameters").
 *
 * THE CERVIX, as BIRTH OPENING goes from closed to full: it thins first and then opens -- in a first labour it is
 * drawn up into the womb (effaced) before it dilates much -- to 10 cm across, when it is gone into the womb's lower
 * segment and womb and canal are one tube.
 *
 * THE BABY'S WAY OUT, checked against her measured pelvis plane by plane, as a head comes through in the usual way
 * (occiput anterior: the cardinal movements): it ENGAGES across her inlet, its long front-to-back diameter (occipito-
 * frontal) lying in the inlet's widest, side to side, and its width (biparietal) in the inlet's narrowest, front to back
 * (the obstetric conjugate); it FLEXES, so what leads is the smaller suboccipitobregmatic, and TURNS to face her back
 * by her ischial spines, its width now across them; and comes out under her pubic arch the same way, its width between
 * her ischial tuberosities. Each passage is its room less the head: positive, it has room.
 *
 * Rest metres. Pure: plain arrays.
 */
import type { P3 } from './pelvisMeasure';

/** How her birth opens. */
export const BIRTH_OPENING = Object.freeze({
  /** Fully dilated, the cervix is this wide inside, metres. MEASURED (10 cm: https://en.wikipedia.org/wiki/Cervical_dilation). */
  dilationM: 0.1,
  /** The share of BIRTH OPENING by which it has thinned completely: a first labour's cervix effaces before it dilates
   * far (BIOLOGICAL SHAPE), here by 4 cm. GAME TUNING (where). */
  effacedBy: 0.4,
  /** The rim left of it when it is thinned, metres: a few millimetres of tissue round the opening. BIOLOGICAL SHAPE. */
  rimM: 0.005,
});

/** A baby's head at term, metres: across (biparietal), its smallest front-to-back when flexed (suboccipitobregmatic),
 * and front to back unflexed (occipitofrontal). MEASURED (obstetric texts: 9.5, 9.5 and 11.5 cm). The room draws a term
 * head 9.5 cm across on a 51 cm baby (SarahLabScene's BIRTH_HEAD); a baby of another size is that in proportion. */
export const TERM_HEAD = Object.freeze({ biparietal: 0.095, suboccipitobregmatic: 0.095, occipitofrontal: 0.115, babyLengthM: 0.51 });

export interface Cervix {
  /** how long it still is (closed, CERVIX.length; thinned, its rim), metres */
  readonly lengthM: number;
  /** how wide it is open inside, and its outer radius, metres */
  readonly openM: number;
  readonly outerM: number;
  /** how far it has thinned, 0..1 */
  readonly effaced: number;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Her cervix at BIRTH OPENING `open` (0 closed .. 1 full), from its length and radius closed. */
export function cervixAt(open: number, closedLengthM: number, closedRadiusM: number): Cervix {
  const o = Math.min(1, Math.max(0, Number.isFinite(open) ? open : 0)), B = BIRTH_OPENING;
  const effaced = smooth(o / B.effacedBy), openM = B.dilationM * o;
  return { lengthM: closedLengthM + (B.rimM - closedLengthM) * effaced, openM, outerM: Math.max(closedRadiusM, openM / 2 + B.rimM), effaced };
}

/** What the check needs of her measured pelvis and torso (src/data/pelvis/, src/data/torso/). */
export interface PassageBones {
  readonly cm: { readonly obstetricConjugate: number; readonly inletTransverse: number; readonly interspinous: number; readonly intertuberous: number };
  readonly landmarks: { readonly symphysisBottom: readonly number[] };
  readonly midpelvis: { readonly ring: readonly (readonly number[])[] };
}

/** One plane of her pelvis as the head passes it: its room either way and the head's, metres. */
export interface Passage {
  readonly plane: 'inlet' | 'midpelvis' | 'outlet';
  /** across her (side to side) and front to back: the room, the head's diameter lying that way, and what is left */
  readonly across: { readonly room: number; readonly head: number; readonly left: number; readonly headIs: string };
  readonly along: { readonly room: number; readonly head: number; readonly left: number; readonly headIs: string };
}

/** A plane ring's front-to-back diameter: between its points nearest her midline, front and back (metres). */
export function ringFrontToBack(ring: readonly (readonly number[])[], centreX: number): number {
  const near = ring.filter((p) => Math.abs(p[0] - centreX) < 0.004);
  if (near.length < 2) return NaN;
  let best = 0;
  for (const a of near) for (const b of near) best = Math.max(best, Math.hypot(a[1] - b[1], a[2] - b[2]));
  return best;
}

/**
 * Her baby's head through her pelvis, plane by plane (see the top): `babyLengthM` the baby's crown-heel length as drawn
 * (its head in proportion to a term head on a 51 cm baby); `coccyx` her tailbone's tip, the back of her outlet.
 */
export function headPassage(bones: PassageBones, coccyx: readonly number[], babyLengthM: number): Passage[] {
  const k = babyLengthM / TERM_HEAD.babyLengthM, H = { bpd: TERM_HEAD.biparietal * k, sob: TERM_HEAD.suboccipitobregmatic * k, ofd: TERM_HEAD.occipitofrontal * k };
  const cm = bones.cm, s = bones.landmarks.symphysisBottom, x = s[0];
  const pass = (room: number, head: number, headIs: string) => ({ room, head, left: room - head, headIs });
  return [
    { plane: 'inlet', across: pass(cm.inletTransverse / 100, H.ofd, 'occipitofrontal (it engages sideways)'), along: pass(cm.obstetricConjugate / 100, H.bpd, 'biparietal') },
    { plane: 'midpelvis', across: pass(cm.interspinous / 100, H.bpd, 'biparietal (turned to face her back)'), along: pass(ringFrontToBack(bones.midpelvis.ring, x), H.sob, 'suboccipitobregmatic (flexed)') },
    { plane: 'outlet', across: pass(cm.intertuberous / 100, H.bpd, 'biparietal'), along: pass(Math.hypot(coccyx[1] - s[1], coccyx[2] - s[2]), H.sob, 'suboccipitobregmatic (under her pubic arch)') },
  ];
}

/** The tightest passage, metres left (negative: the head is bigger than the room there). */
export const tightest = (p: readonly Passage[]): number => Math.min(...p.flatMap((q) => [q.across.left, q.along.left]));

/** The canal's way when it is open, from her pelvis: the bony canal's curved centre line (the curve of Carus), and how
 * far forward it turns under her pubic arch to its opening. */
export interface CanalBones {
  readonly axis: readonly (readonly number[])[];
  /** her pubic arch (the lower edge of her symphysis and her two sit bones) and how far apart her sit bones are inside:
   * with them, her opening stands below her bones, under where her arch lets a head by (`seatedCanal`) */
  readonly landmarks?: { readonly symphysisBottom: readonly number[]; readonly tuberosityLeft?: readonly number[]; readonly tuberosityRight?: readonly number[] };
  readonly cm?: { readonly intertuberous?: number };
  /** the inner edge of her pubic arch as measured, point by point (the pelvis file's outlet ring): what her canal's wall is
   * kept off; without it, straight lines from her symphysis to her sit bones */
  readonly outlet?: { readonly ring: readonly (readonly number[])[] };
  /** her tailbone's tip (src/data/torso/ `landmarks.coccyx`): her canal's wall keeps off it too */
  readonly tail?: readonly number[];
}

/** How the canal opens. */
export const CANAL_OPENING = Object.freeze({
  /** Fully open it is as wide as a term head, round, metres. BIOLOGICAL SHAPE (it stretches to the head: 10 cm). */
  diameterM: 0.1,
  /** Points along it. GAME TUNING (the mesh). */
  points: 24,
});

/**
 * WHERE HER OPENING STANDS (Joshua, 2026-11-10: "I don't remember the opening cutting into the bone... how could the baby
 * make that tight of a turn"; "the bones shouldn't be visible... if you see bones, you know something is still off").
 *
 * Her pubic arch is a narrow V: its point the lower edge of her symphysis, its sides the bones running down and back to
 * her sit bones (on her skeleton 8.2 cm long and 10.2 cm apart at their ends: 64 degrees between them, where a woman's is
 * more often 80 or over). A head's width of canal passes under it only where the V is that wide -- its middle about
 * 10 cm back from the symphysis along the arch's plane, just behind the line between her sit bones -- not at the middle
 * of the arch (6 cm back, where it is under 8 cm wide: the measured centre line's lower end, and her opening as it first
 * was, 2 cm behind the symphysis, were both inside the V -- her doors and her canal cut through its bones, and her baby
 * had 3.8 cm to jog forward to its way out).
 *
 * So her canal passes her arch there, square to its plane, and only below her bones turns forward to her opening
 * (`turnDeg`): her doors, which hang from its last `straight` metres, and the skin round them are wholly under her bones.
 */
export const OPEN_SEAT = Object.freeze({
  /** how far clear of her arch's bones her canal's wall passes, open, metres. GAME TUNING: on her skeleton a head's width of
   * canal has 1.15 cm to spare between her arch's measured edge and her tailbone's tip where they are closest, and this
   * and `tailClear` share it. */
  archClear: 0.003,
  /** UNDER HER ARCH IT TURNS FORWARD (Joshua, 2026-11-10, with diagrams of a birth from the side: in each the head comes
   * down, turns forward under the pubic bone and is born below it, facing up and out -- "it does appear to sit further
   * down"). From where it passes her arch, going straight down as she stands, her canal turns forward on one curve of
   * radius `turnRadius` -- below her bones, where nothing is in its way -- until it goes `turnDeg` forward of square to
   * her arch's plane, and its last centimetres, where her doors hang, run straight on: her opening is below her pubic
   * bone, facing forward as she stands. BIOLOGICAL SHAPE (the curve of Carus's last part: a head's extension under the
   * symphysis); GAME TUNING how far and how tightly (checked against her skeleton's own bone mesh,
   * scripts/probe-canal-bones.mts: her doors and her canal's wall clear of every bone). */
  turnDeg: 60,
  turnRadius: 0.06,
  /** how far below her bones her doors' hinges stand at the least: half a door's thickness and the flesh over the bone,
   * metres (what the turn tried against her bone mesh was held to). GAME TUNING. */
  boneClear: 0.01,
  /** how far clear of her tailbone's tip her canal's wall passes, open, metres. GAME TUNING (see `archClear`; its tip is a
   * knob round the measured point: at 3 mm it stood through the canal's back wall). */
  tailClear: 0.008,
  /** WHERE HER BONES PINCH IT: between her arch and her tailbone a head's width of round canal has a millimetre to spare
   * on her skeleton's own bones, and they stood through its wall. So there it is narrower front to back -- what passes
   * is moulded by her bones, as a head is -- by as much as keeps its wall `pinchArch` off her arch's edge and `pinchTail`
   * off her tailbone's tip (metres), and never under `mould` of its width (Joshua, 2026-11-08: "squeeze up to 22%...
   * like moulding"). GAME TUNING. */
  pinchArch: 0.006,
  pinchTail: 0.008,
  mould: 0.78,
});

/** The way a head comes where her canal is not seated under her arch (laid from her own skin: v2 for now): from her
 * opening `mouth` up into her, `straight` metres the way her canal leaves her opening (`t`: where her doors hang), then
 * onto her bony canal's measured centre line and up it to `top`; eased so it bends rather than kinks. */
function headWay(mouth: P3, t: P3, bones: CanalBones, top: P3, straight: number): P3[] {
  const n = CANAL_OPENING.points;
  const foot: P3 = [mouth[0], mouth[1] + t[1] * straight, mouth[2] + t[2] * straight], on: P3 = [mouth[0], foot[1] + t[1] * 0.02, foot[2] + t[2] * 0.02];
  const axis = bones.axis.map((p): P3 => [mouth[0], p[1], p[2]]).filter((p) => p[1] > on[1] + 0.01 && p[1] < top[1] - 1e-6).sort((a, b) => a[1] - b[1]);
  let way = resample([mouth, foot, on, ...axis, top], n);
  const keep = Math.ceil((straight / Math.max(1e-9, lengthAlong(way))) * (n - 1)) + 1;
  for (let pass = 0; pass < 6; pass++) way = way.map((p, i) => (i <= keep || i === n - 1 ? p : [p[0], (way[i - 1][1] + 2 * p[1] + way[i + 1][1]) / 4, (way[i - 1][2] + 2 * p[2] + way[i + 1][2]) / 4]));
  return way;
}

/** How much of its depth (front to back: `deep`) and of its width (across her: `wide`) her open canal keeps at each point
 * of `way`, 1 all of it (OPEN_SEAT `pinchArch`): each of her arch's points and her tailbone's tip level with a point of
 * it must be outside its wall there -- an ellipse -- by its clearance; a bone more to its side than before or behind it
 * narrows it across, another front to back. Eased along it so it narrows and widens gently. */
function pinchOf(way: readonly P3[], bones: CanalBones): { deep: number[]; wide: number[] } {
  const arch = archOf(bones, way[0][0]), r = CANAL_OPENING.diameterM / 2, n = way.length;
  if (!arch) return { deep: way.map(() => 1), wide: way.map(() => 1) };
  const stops: { q: P3; c: number }[] = arch.pts.map((q) => ({ q, c: OPEN_SEAT.pinchArch }));
  if (bones.tail) stops.push({ q: [0, bones.tail[1], bones.tail[2]], c: OPEN_SEAT.pinchTail });
  const deep: number[] = [], wide: number[] = [];
  way.forEach((p, i) => {
    const a = way[Math.max(0, i - 1)], b = way[Math.min(n - 1, i + 1)], l = Math.hypot(b[1] - a[1], b[2] - a[2]) || 1, ty = (b[1] - a[1]) / l, tz = (b[2] - a[2]) / l;
    let kd = 1, kw = 1;
    for (const { q, c } of stops) {
      const dy = q[1] - p[1], dz = q[2] - p[2], along = dy * ty + dz * tz;
      if (Math.abs(along) > 0.012) continue;
      const ap = Math.abs(-dy * tz + dz * ty), lat = q[0];
      if (lat > ap) { if (ap < r + c) kw = Math.min(kw, (lat / Math.sqrt(1 - (ap / (r + c)) ** 2) - c) / r); }
      else if (lat < r + c) kd = Math.min(kd, (ap / Math.sqrt(1 - (lat / (r + c)) ** 2) - c) / r);
    }
    deep.push(Math.max(OPEN_SEAT.mould, kd)); wide.push(Math.max(OPEN_SEAT.mould, kw));
  });
  // (as narrow as its neighbours need, then eased)
  const ease = (k0: number[]) => {
    let k = k0.map((_, i) => Math.min(k0[Math.max(0, i - 1)], k0[i], k0[Math.min(n - 1, i + 1)]));
    for (let pass = 0; pass < 2; pass++) k = k.map((v, i) => Math.min(v, (k[Math.max(0, i - 1)] + 2 * v + k[Math.min(n - 1, i + 1)]) / 4));
    return k;
  };
  return { deep: ease(deep), wide: ease(wide) };
}

/** Her pubic arch as her canal's wall must clear it: its inner edge's points, each [how far out from her midline, y, z]
 * (as measured -- the pelvis file's outlet ring -- with her sit bones' inner points; without a ring, along straight lines
 * from the symphysis's lower edge to each sit bone), and how far a point on her midline must stand from them (`need`: half
 * the open canal and OPEN_SEAT.archClear). */
interface Arch { readonly pts: readonly P3[]; readonly need: number }
function archOf(bones: CanalBones, x: number): Arch | null {
  const L = bones.landmarks, a = L?.tuberosityLeft, b = L?.tuberosityRight;
  if (!L || !a || !b) return null;
  const half = bones.cm?.intertuberous ? bones.cm.intertuberous / 200 : Math.abs(a[0] - b[0]) / 2;
  if (!(half > 0)) return null;
  const s = L.symphysisBottom, pts: P3[] = [[half, a[1], a[2]], [half, b[1], b[2]]];
  const ring = bones.outlet?.ring;
  if (ring && ring.length > 8) for (const q of ring) pts.push([Math.abs(q[0] - x), q[1], q[2]]);
  else for (let k = 0; k <= 24; k++) { const f = k / 24, ty = (a[1] + b[1]) / 2, tz = (a[2] + b[2]) / 2; pts.push([half * f, s[1] + (ty - s[1]) * f, s[2] + (tz - s[2]) * f]); }
  return { pts, need: CANAL_OPENING.diameterM / 2 + OPEN_SEAT.archClear };
}
/** The point of the arch's edge nearest a point on her midline: [how far out from her midline, y, z]. */
function archNearest(p: readonly number[], A: Arch): P3 {
  let best = A.pts[0], least = Infinity;
  for (const q of A.pts) { const d = q[0] * q[0] + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < least) { least = d; best = q; } }
  return best;
}
function archDistance(p: readonly number[], A: Arch): number { const c = archNearest(p, A); return Math.hypot(c[0], p[1] - c[1], p[2] - c[2]); }
/** A point on her midline moved, in her midline's plane, straight away from the arch's edge until it is `need` from it. */
function offArch(p: P3, A: Arch): P3 {
  let q = p;
  for (let k = 0; k < 4; k++) {
    const c = archNearest(q, A), dy = q[1] - c[1], dz = q[2] - c[2], l = Math.hypot(dy, dz);
    if (Math.hypot(c[0], l) >= A.need || l < 1e-9) break;
    const want = Math.sqrt(Math.max(0, A.need * A.need - c[0] * c[0]));
    q = [q[0], c[1] + (dy / l) * want, c[2] + (dz / l) * want];
  }
  return q;
}

/**
 * HER CANAL SEATED UNDER HER ARCH (see OPEN_SEAT): its line, her opening first, up to `top`; her opening (`mouth`) and the
 * way up into her there (`t`, unit); and where it passes her arch's plane (`pass`). Null without her sit bones.
 *
 * Down from `top` it follows her bony canal's measured centre line as far as that keeps a head's width of canal off her
 * arch and her tailbone, then passes behind her arch between them (its wall held off both all the way); from its rearmost
 * point -- where, as she stands, it is going straight down -- it turns forward on one curve (`turnRadius`) until it goes
 * the way her opening faces (`turnDeg` forward of square to her arch's plane), and its last `straight` metres, where her
 * doors hang, run straight on to her opening.
 */
export function seatedCanal(bones: CanalBones, x: number, top: P3, straight = 0.03): { path: P3[]; mouth: P3; t: P3; pass: P3 } | null {
  const arch = archOf(bones, x), L = bones.landmarks, a = L?.tuberosityLeft, b = L?.tuberosityRight;
  if (!arch || !L || !a || !b) return null;
  const s = L.symphysisBottom, ty = (a[1] + b[1]) / 2, tz = (a[2] + b[2]) / 2, run = Math.hypot(ty - s[1], tz - s[2]);
  if (!(run > 1e-6)) return null;
  // (her arch's plane, in her midline: `u` back along it from her symphysis, `n` up into her square to it)
  const uy = (ty - s[1]) / run, uz = (tz - s[2]) / run, n: [number, number] = -uz >= 0 ? [-uz, uy] : [uz, -uy];
  const at = (d: number, h: number): P3 => [x, s[1] + uy * d + n[0] * h, s[2] + uz * d + n[1] * h];
  // (back along her arch's plane to the first place a head's width of canal clears her arch -- there, and a little either
  // side of the plane)
  let d = run * 0.4;
  const clears = (q: number) => [-0.01, 0, 0.01, 0.02].every((h) => archDistance(at(q, h), arch) >= arch.need);
  while (d < run * 3 && !clears(d)) d += 0.0005;
  const pass = at(d, 0), N = CANAL_OPENING.points;
  // ITS WAY DOWN TO HER ARCH: from below her arch's plane straight up through `pass`, onto the measured line (down only
  // to where that turns forward into the arch's middle, its rearmost point, and only where it is clear) and up to `top`;
  // eased, its wall kept off her arch and her tailbone (each in turn, twice, the arch's last -- between them there is
  // room)
  const tail = bones.tail ?? null, tailNeed = CANAL_OPENING.diameterM / 2 + OPEN_SEAT.tailClear;
  const offTail = (p: P3): P3 => {
    if (!tail) return p;
    const dy = p[1] - tail[1], dz = p[2] - tail[2], l = Math.hypot(dy, dz);
    return l >= tailNeed || l < 1e-9 ? p : [p[0], tail[1] + (dy / l) * tailNeed, tail[2] + (dz / l) * tailNeed];
  };
  const clear = (p: P3) => offArch(offTail(offArch(offTail(p), arch)), arch);
  let axis = bones.axis.map((p): P3 => [x, p[1], p[2]]);
  if (axis.length) {
    const rear = axis.reduce((m, p) => (p[2] < m[2] ? p : m), axis[0]);
    axis = axis.filter((p) => p[1] >= rear[1] && archDistance(p, arch) >= arch.need && (!tail || Math.hypot(p[1] - tail[1], p[2] - tail[2]) >= tailNeed));
  }
  const below = at(d, -0.05), on = at(d, 0.02);
  axis = axis.filter((p) => p[1] > on[1] + 0.01 && p[1] < top[1] - 1e-6).sort((p, q) => p[1] - q[1]);
  let down = resample([below, at(d, -0.02), on, ...axis, top], N);
  const keep = Math.ceil((0.03 / Math.max(1e-9, lengthAlong(down))) * (N - 1)) + 1;
  down = down.map((p, i) => (i <= keep || i === N - 1 ? p : clear(p)));
  for (let k = 0; k < 6; k++) down = down.map((p, i) => (i <= keep || i === N - 1 ? p : clear([p[0], (down[i - 1][1] + 2 * p[1] + down[i + 1][1]) / 4, (down[i - 1][2] + 2 * p[2] + down[i + 1][2]) / 4])));
  // UNDER HER ARCH IT TURNS FORWARD: from its rearmost point round one curve to the way her opening faces
  let r = 0;
  for (let i = 1; i < N; i++) if (down[i][2] < down[r][2]) r = i;
  const O = OPEN_SEAT, lean = (O.turnDeg * Math.PI) / 180, rho = O.turnRadius, R = down[r];
  const t: P3 = [0, uy * Math.sin(lean) + n[0] * Math.cos(lean), uz * Math.sin(lean) + n[1] * Math.cos(lean)];
  const turn = Math.atan2(-t[2], t[1]), round = (f: number): P3 => [x, R[1] - rho * Math.sin(f), R[2] + rho * (1 - Math.cos(f))];
  const foot = round(turn), mouth: P3 = [x, foot[1] - t[1] * straight, foot[2] - t[2] * straight];
  const line: P3[] = [mouth, foot], steps = Math.max(4, Math.ceil((turn * rho) / 0.006));
  for (let k = steps - 1; k >= 1; k--) line.push(round((turn * k) / steps));
  for (let i = r; i < N; i++) line.push(down[i]);
  return { path: resample(line, N), mouth, t, pass };
}

/** Her canal's opening (its first point) and the way it goes up into her over its first `reach` metres (unit). */
export function canalMouth(canal: readonly P3[], reach: number): { mouth: P3; t: P3 } {
  const m = canal[0];
  let k = 1, s = 0;
  while (k < canal.length - 1 && s < reach) { s += Math.hypot(canal[k][0] - canal[k - 1][0], canal[k][1] - canal[k - 1][1], canal[k][2] - canal[k - 1][2]); k++; }
  const d: P3 = [0, canal[k][1] - m[1], canal[k][2] - m[2]], l = Math.hypot(...d) || 1;
  return { mouth: [m[0], m[1], m[2]], t: [0, d[1] / l, d[2] / l] };
}

/**
 * Her birth canal at BIRTH OPENING `open`: as laid (a flattened tube up and back from its opening) when closed; open, a
 * round tube as wide as a head, its centre line drawn from as laid onto the way a head comes down through her pelvis
 * (the bony canal's curved centre line, the curve of Carus). Its first `straight` metres -- where the doors hang
 * (actor/birthDoors.ts) -- keep going the way it went as laid, so the doors and the tube stay one opening.
 */
export function openCanal(laid: { readonly path: readonly P3[]; readonly width: number; readonly depth: number }, bones: CanalBones, open: number, straight = 0.03): { path: P3[]; width: number; depth: number; narrow?: number[]; narrowAcross?: number[] } {
  const o = smooth(Math.min(1, Math.max(0, Number.isFinite(open) ? open : 0)));
  const n = CANAL_OPENING.points, top = laid.path[laid.path.length - 1], { mouth, t } = canalMouth(laid.path, straight);
  // the way a head comes: where her canal is laid from its seat under her arch, that line itself; laid from her own skin
  // (v2, whose opening is still where her skin has it), up from her doors the way it went, then onto her bony canal
  const seat = seatedCanal(bones, mouth[0], top, straight), seated = !!seat && Math.hypot(seat.mouth[1] - mouth[1], seat.mouth[2] - mouth[2]) < 1e-4;
  const way = seated ? seat!.path : headWay(mouth, t, bones, top, straight);
  const as = resample(laid.path, n);
  const path = as.map((p, i): P3 => [p[0] + (way[i][0] - p[0]) * o, p[1] + (way[i][1] - p[1]) * o, p[2] + (way[i][2] - p[2]) * o]);
  const d = CANAL_OPENING.diameterM;
  // (and where her bones pinch it, narrower as it opens: `narrow`, the share of its depth it keeps at even steps along
  // it, and `narrowAcross`, of its width)
  const pinch = seated && o > 0 ? pinchOf(way, bones) : null, eased = (k: number[]) => k.map((v) => 1 - (1 - v) * o);
  return { path, width: laid.width + (d - laid.width) * o, depth: laid.depth + (d - laid.depth) * o, ...(pinch ? { narrow: eased(pinch.deep), narrowAcross: eased(pinch.wide) } : {}) };
}

const lengthAlong = (path: readonly P3[]) => path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1], p[2] - path[i - 1][2]) : 0), 0);

/** A line resampled to `n` points evenly along it. */
export function resample(path: readonly P3[], n: number): P3[] {
  const at: number[] = [0];
  for (let k = 1; k < path.length; k++) at.push(at[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1], path[k][2] - path[k - 1][2]));
  const total = at[at.length - 1], out: P3[] = [];
  for (let i = 0; i < n; i++) {
    const s = (total * i) / (n - 1);
    let k = 1; while (k < path.length - 1 && at[k] < s) k++;
    const f = at[k] > at[k - 1] ? (s - at[k - 1]) / (at[k] - at[k - 1]) : 0, a = path[k - 1], b = path[k];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return out;
}
