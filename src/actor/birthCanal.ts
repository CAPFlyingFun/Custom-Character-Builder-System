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
}

/** How the canal opens. */
export const CANAL_OPENING = Object.freeze({
  /** Fully open it is as wide as a term head, round, metres. BIOLOGICAL SHAPE (it stretches to the head: 10 cm). */
  diameterM: 0.1,
  /** Points along it. GAME TUNING (the mesh). */
  points: 24,
});

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
export function openCanal(laid: { readonly path: readonly P3[]; readonly width: number; readonly depth: number }, bones: CanalBones, open: number, straight = 0.03): { path: P3[]; width: number; depth: number } {
  const o = smooth(Math.min(1, Math.max(0, Number.isFinite(open) ? open : 0)));
  const n = CANAL_OPENING.points, top = laid.path[laid.path.length - 1], { mouth, t } = canalMouth(laid.path, straight);
  // the way a head comes: up from the doors the way the canal went, then onto the bony canal and up it
  const foot: P3 = [mouth[0], mouth[1] + t[1] * straight, mouth[2] + t[2] * straight], on: P3 = [mouth[0], foot[1] + t[1] * 0.02, foot[2] + t[2] * 0.02];
  const axis = bones.axis.map((p): P3 => [mouth[0], p[1], p[2]]).filter((p) => p[1] > on[1] + 0.01 && p[1] < top[1] - 1e-6).sort((a, b) => a[1] - b[1]);
  let way = resample([mouth, foot, on, ...axis, top], n);
  // (eased so it bends rather than kinks, its doors' part and its ends kept)
  const keep = Math.ceil((straight / Math.max(1e-9, lengthAlong(way))) * (n - 1)) + 1;
  for (let pass = 0; pass < 6; pass++) way = way.map((p, i) => (i <= keep || i === n - 1 ? p : [p[0], (way[i - 1][1] + 2 * p[1] + way[i + 1][1]) / 4, (way[i - 1][2] + 2 * p[2] + way[i + 1][2]) / 4]));
  const as = resample(laid.path, n);
  const path = as.map((p, i): P3 => [p[0] + (way[i][0] - p[0]) * o, p[1] + (way[i][1] - p[1]) * o, p[2] + (way[i][2] - p[2]) * o]);
  const d = CANAL_OPENING.diameterM;
  return { path, width: laid.width + (d - laid.width) * o, depth: laid.depth + (d - laid.depth) * o };
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
