/**
 * HER OPENING AS TWO DOORS (Joshua, 2026-11-08, drawing it: "The yellow is the outer skin/vagina opening, the red circles
 * are where each side hinges, and pink, the tube"; and how they move: "like a swinging door with it like automatically
 * trying to close like a pneumatic door that starts fast, slows down before it touches, but the slider can act like the
 * door opening amount").
 *
 * Her birth canal (the pink tube) comes down to the opening; below the HINGES it curves in to the opening -- a funnel --
 * and each side of that funnel, with the lip below it (her outer skin's, the yellow), is a DOOR hung on its own hinge, one
 * each side of the tube, running front to back. Each door is three pieces with a fold between them and at its root
 * (Joshua: "add 3 more hinges in the skin itself"). Closed, the two lips meet in the middle. Pushed open from inside in a
 * birth (BIRTH OPENING) they are laid round Joshua's 10 cm test circle coming down the middle (`BIRTH_HEAD`): its main
 * hinge turning out and its folds turning in, a half sphere round it with the lips together, then the lips parting round
 * it to its widest; folded back by hand (FOLD BACK) it turns out from the lip's end -- outer, middle, inner --
 * and then its hinge (`foldAngles`); its hinge never takes it back through her skin. Let go, each goes back as a
 * pneumatic door closes -- quickly at first, slowing as it comes to (`swingDoors`). Her outer skin runs on out from each
 * hinge to her thighs and does not move.
 *
 * Laid in her canal's own frame at its opening: across her (x), up into her along the canal (t), and front to back along
 * the opening (n). A TEST PIECE (Joshua: "would be fine to add a test piece to get the look and make sure it's working"):
 * her real outer skin replaces the yellow when her skin is built. Rest metres. Pure: plain arrays.
 */
import { CANAL_OPENING, canalMouth } from './birthCanal';
import type { P3 } from './pelvisMeasure';

/** The doors. GAME TUNING (from Joshua's drawing), each in metres or seconds. */
export const DOORS = Object.freeze({
  /** each hinge this far outside the canal's open radius (CANAL_OPENING), and this far up the canal from its opening */
  hingeOut: 0.006,
  hingeUp: 0.03,
  /** closed, the lips this far either side of the middle (they meet), and hanging this far below the opening */
  gap: 0.0015,
  lip: 0.012,
  /** a door's thickness: the canal's lining inside, her skin outside */
  thick: 0.01,
  /** how long the opening is, front to back */
  length: 0.1,
  /** the most her opening stretches (Joshua, 2026-11-08: "extend the up and down to 12.5cm vs 10cm... basically a
   * 12.5x10cm max opening"): front to back (its ends pushed apart from `length`) and side to side (its lips apart), and
   * how far past what pushes them its ends stand (her skin's thickness round it) */
  lengthMost: 0.125,
  acrossMost: 0.1,
  endClear: 0.01,
  /** HER OPENING AN OVAL (Joshua, 2026-11-08: "make it an oval patch to match the general shape… the top and bottom
   * sides should be smooth and not look so square"): each hinge curves round it rather than running straight, the doors
   * narrowing to meet at its ends -- each station's door as wide, hinge to middle, as `(1 - |u|^ovalPower)^(1/ovalPower)`
   * of its middle's (u -1 at her back end .. 1 at her front), and no narrower than `endWidth` of it. GAME TUNING. */
  ovalPower: 2.4,
  endWidth: 0.18,
  /** how thick a door stays at its ends, as a share of its middle's: its lip carried on round the bands at her
   * opening's ends, not bulky (Joshua, 2026-11-08: "a complete ring... had an edge all around"; "looks bulky"). GAME
   * TUNING. */
  endThick: 0.25,
  /** the band round each end of her opening (`doorLoop`): how many sections across it, and where its four joints are,
   * as shares of the way across it (Joshua's sketch: "the gap between the two sides is where the middle two joints go and
   * then the other two about half way"). GAME TUNING. */
  bandSteps: 12,
  /** how far a band reaches out past her opening's end, as a share of how far across it reaches (a flat curve). GAME
   * TUNING. */
  bandReach: 0.3,
  bandJoints: [0.25, 0.47, 0.53, 0.75] as readonly number[],
  /** ONE RING ROUND ITS ENDS (Joshua, 2026-11-08: "That top and bottom skin flap looks too boxy still and not part of the
   * same mesh… is it possible to merge?"): open, the doors' sections nearer an end than this station, and the bands
   * between them, take on the wall of the section here (`wallOf`) -- as thick, bending the same way -- so the skin round
   * her opening's ends is the doors' own; eased in from nothing at the root over `ringRoot` of the way to the lip. GAME
   * TUNING. */
  ringWall: 3,
  ringRoot: 0.06,
  /** how tall each band of a slice of what passes is, up the canal (`outlineOf`). GAME TUNING (fine enough for its neck,
   * coarse enough that each has a few of its points). */
  sliceBand: 0.004,
  /** the tallest hollow in a slice (up the canal) that is filled across rather than followed in (`outlineOf`). GAME
   * TUNING (shorter than its neck). */
  sliceFill: 0.024,
  /** her outer skin's test piece: how far out from each hinge it runs, and how far it rises as it goes */
  skin: 0.035,
  skinRise: 0.015,
  /** how quickly a door follows: pushed open (it goes where it is pushed), and closing (the pneumatic closer: fast at
   * first, slowing as it comes to) -- the time it takes to come most of the way (1 - 1/e) */
  openS: 0.06,
  closeS: 0.35,
  /** stations front to back, and how finely its lining is cut across (so it can fold) */
  stations: 17,
  fineM: 0.006,
  /** FOLD BACK (by hand): how far each of its three pieces turns out on its fold, degrees (Joshua: "each 1/3 can rotate
   * 30°", the main hinge too); how long each fold's bend is, as a share of the door; and how close a folded door may come
   * to her outer skin before its main hinge stops */
  foldDeg: 30,
  foldBend: 0.08,
  skinClear: 0.002,
});

/** Her canal's frame at its opening (rest metres): its opening, and across, up into her, and front to back. */
export interface DoorFrame { readonly mouth: P3; readonly x: P3; readonly t: P3; readonly n: P3 }

/** The frame from her canal as laid (its opening first): up into her along its first few centimetres. */
export function doorFrame(canal: readonly P3[]): DoorFrame {
  const { mouth, t } = canalMouth(canal, DOORS.hingeUp);
  return { mouth, x: [1, 0, 0], t, n: [0, t[2], -t[1]] };
}

/**
 * One door's cross-section, the right one (+x), closed: [x, t] round it -- the canal's lining from the hinge in to the lip
 * (fine enough to fold), round the lip's rounded end, and her skin back out to the hinge -- with each point's place along
 * the door (`along`: 0 at the hinge, 1 at the lip's end), the opening's edge (the top of the lip) and the hinge. `f`
 * (0..1) is how thick it is and how far its lip hangs, as a share of its own: a door is thickest in its middle and thins
 * to its ends, front and back, as lips do.
 */
interface Section {
  points: [number, number][]; along: number[]; hinge: [number, number]; lining: number; edge: number;
  /** where its three folds are, as shares of the way along it -- inner, mid, outer: its own three corners, so that it
   * bends only at its four joints (Joshua, 2026-11-08: "It should only bend at 4 points") */
  folds: [number, number, number];
}

function section(f = 1, w = 1): Section {
  const D = DOORS, R0 = CANAL_OPENING.diameterM / 2, R = R0 * w, h = D.hingeUp, g = D.gap, k = D.thick * f, lip = -0.1 * h - (D.lip - 0.1 * h) * f;
  const corners = (r: number, lipT: number): [number, number][] => [[r, h], [0.55 * r, 0.8 * h], [0.2 * r, 0.4 * h], [g, 0.1 * h], [g, lipT]];
  const ctrl = corners(R, lip), full = corners(R0, -D.lip);
  // (each stretch between them cut finer -- as finely at every thickness, so every section has as many points -- the
  // corners kept: the opening's edge is one of them)
  const lining: [number, number][] = [ctrl[0]], corner: number[] = [];
  let edge = 0;
  for (let i = 1; i < ctrl.length; i++) {
    const [a, b] = [ctrl[i - 1], ctrl[i]], cuts = Math.max(1, Math.round(Math.hypot(full[i][0] - full[i - 1][0], full[i][1] - full[i - 1][1]) / D.fineM));
    for (let c = 1; c <= cuts; c++) lining.push([a[0] + ((b[0] - a[0]) * c) / cuts, a[1] + ((b[1] - a[1]) * c) / cuts]);
    if (i === 3) edge = lining.length - 1;
    if (i < ctrl.length - 1) corner.push(lining.length - 1);
  }
  const at: number[] = [0];
  for (let i = 1; i < lining.length; i++) at.push(at[i - 1] + Math.hypot(lining[i][0] - lining[i - 1][0], lining[i][1] - lining[i - 1][1]));
  const along = at.map((a) => a / at[at.length - 1]);
  // (its folds at its own corners -- between them it is straight -- so it bends at its four joints and nowhere else)
  const folds = corner.map((k) => along[k]) as [number, number, number];
  // her skin: the lining's points moved out by the door's thickness, square to it (toward her outside); the root's to the hinge
  const skin = lining.map(([x, t], i): [number, number] => {
    const p = lining[Math.max(0, i - 1)], q = lining[Math.min(lining.length - 1, i + 1)], tx = q[0] - p[0], tt = q[1] - p[1], l = Math.hypot(tx, tt) || 1;
    return i === 0 ? [R + D.hingeOut, h - D.thick] : [x - (tt / l) * k, t + (tx / l) * k];
  });
  const last = lining[lining.length - 1], end = skin[skin.length - 1], mid: [number, number] = [(last[0] + end[0]) / 2, (last[1] + end[1]) / 2];
  const round: [number, number][] = [0.25, 0.5, 0.75].map((u) => { const a = Math.PI + u * Math.PI; return [mid[0] + (k / 2) * Math.cos(a), mid[1] + (k / 2) * Math.sin(a)]; });
  return {
    points: [...lining, ...round, ...[...skin].reverse()], along: [...along, 1, 1, 1, ...[...along].reverse()],
    hinge: [R + D.hingeOut, h - D.thick / 2], lining: lining.length, edge, folds,
  };
}

/**
 * FOLDED BACK BY HAND (Joshua, 2026-11-08: "add 3 more hinges in the skin itself to basically fold over itself... You can
 * just open, pull it back... split in 3rd, and each 1/3 can rotate 30°... plus the main hinge as well provided it
 * doesn't collide back to the skin... 1st outer 30°, 2nd mid 30°, 3rd inner {closest to body} 30°, 4th default joints"):
 * each door is three pieces, each turning out on its own fold, the lip's end first. FOLD BACK (0..1) folds them in turn --
 * its first quarter the outer third, then the middle, then the inner, then the door on its main hinge -- each by
 * `DOORS.foldDeg`, degrees.
 */
export function foldAngles(fold: number): Angles {
  const f = Math.min(1, Math.max(0, Number.isFinite(fold) ? fold : 0)) * 4, part = (k: number) => Math.min(1, Math.max(0, f - k)) * DOORS.foldDeg;
  return { outer: part(0), mid: part(1), inner: part(2), hinge: part(3) };
}

/** A door's four joints, degrees: its main hinge and its three folds (+ turns it out, away from her middle). */
export interface Angles {
  readonly outer: number; readonly mid: number; readonly inner: number; readonly hinge: number;
  /** how far the door is drawn out longer than it is, from its hinge (1: as it is; a door's skin stretched round what
   * passes to make her opening's rim) */
  readonly long?: number;
}

/**
 * PUSHED OPEN FROM INSIDE, IN A BIRTH, BY JOSHUA'S TEST CIRCLE (2026-11-08: "draw a 10cm circle and test the shape of the
 * skin against it as it goes down… it needs to be flush and touching if possible to be circle"; and "having a real
 * circle and slowly moving in the frame will help determine which joints will be moving"). A head's way, 10 cm across,
 * comes down the middle of the opening; BIRTH OPENING is how far it has come, from just touching the closed doors to
 * where the opening has stretched round its widest. Every joint (the main hinge and the three folds) is as stiff as the
 * next, each pulled back toward closed by the closer; so at each step the doors lie as near closed as the circle lets
 * them -- each joint turned only as far as the circle forces it -- never inside it, the lips never past each other, and a
 * hinge never past shut. Which joints move, and when, is the circle's to say. Let go, it plays back the other way.
 */
export const BIRTH_HEAD = Object.freeze({
  /** across, metres: Joshua's 10 cm, which is the open canal (CANAL_OPENING) and a term head's way. GAME TUNING. */
  diameterM: CANAL_OPENING.diameterM,
  /** how far it comes down between the steps it is solved at, metres. GAME TUNING (smooth enough to look at). */
  stepM: 0.002,
  /** how dear it is to stretch the opening, against bending the joints: a centimetre of opening as dear as this many
   * degrees of bend (her lips are one ring, front to back, and the ring has to stretch for them to part). GAME TUNING. */
  stretchDegPerCm: 60,
});

const RAD = Math.PI / 180;

/** How far a point [x, t] is inside what pushes a door (metres; 0 or less: outside it). */
export type Inside = (x: number, t: number) => number;

/** The circle centred `c` up the canal, and the baby's body behind it as wide (what has come through stays through). */
const circleAt = (c: number): Inside => { const r = BIRTH_HEAD.diameterM / 2; return (x, t) => (t >= c ? r - Math.abs(x) : r - Math.hypot(x, t - c)); };

/** How hard a door is bent with its joints at `a` (radians: hinge, inner, middle, outer) against what pushes it
 * (`inside`): its joints' bend, squared; its opening stretched; and -- far dearer -- anything of it inside what pushes it,
 * past the middle, or its hinge past shut. */
function strain(s: Section, a: readonly number[], inside: Inside): number {
  const K = 1e7, F = fastOf(s), n = F.ox.length;
  poseFast(s, a, F);
  const S = ((BIRTH_HEAD.stretchDegPerCm * RAD) / 0.01) ** 2, lip = F.ox[s.lining - 1] - DOORS.gap;
  let e = a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + K * 1e-4 * Math.min(0, a[0]) ** 2 + S * lip * lip;
  // (its lips no further apart than her opening stretches: what is wider gives instead -- the baby's squeeze)
  e += K * Math.max(0, F.ox[s.lining - 1] - DOORS.acrossMost / 2) ** 2;
  // (and no further than a door goes: its hinge not back over her skin, no fold turned back on itself)
  e += K * 1e-4 * (Math.max(0, a[0] - LIMIT.hinge) ** 2 + Math.max(0, Math.abs(a[1]) - LIMIT.fold) ** 2 + Math.max(0, Math.abs(a[2]) - LIMIT.fold) ** 2 + Math.max(0, Math.abs(a[3]) - LIMIT.fold) ** 2);
  for (let i = 0; i < n; i++) {
    const x = F.ox[i], into = inside(x, F.ot[i]), past = DOORS.gap - x;
    if (into > 0) e += K * into * into;
    if (past > 0) e += K * past * past;
  }
  return e;
}

/** How far a pushed door's joints may go, radians: its hinge not back over her skin, a fold not turned back on itself.
 * GAME TUNING. */
const LIMIT = Object.freeze({ hinge: 150 * RAD, fold: 110 * RAD });

/** A section's pose worked out quickly, again and again (for the pushing): its folds' pivots as laid, each point's share
 * of each fold's turn, and room for the posed points. */
interface Fast { readonly px: Float64Array; readonly pt: Float64Array; readonly w: Float64Array; readonly ox: Float64Array; readonly ot: Float64Array }
const fasts = new WeakMap<Section, Fast>();
function fastOf(s: Section): Fast {
  let F = fasts.get(s);
  if (F) return F;
  const lining = s.points.slice(0, s.lining), at = s.along.slice(0, s.lining), n = s.points.length;
  const pivot = (u: number): [number, number] => { let k = 1; while (k < at.length - 1 && at[k] < u) k++; const f = at[k] > at[k - 1] ? (u - at[k - 1]) / (at[k] - at[k - 1]) : 0; return [lining[k - 1][0] + (lining[k][0] - lining[k - 1][0]) * f, lining[k - 1][1] + (lining[k][1] - lining[k - 1][1]) * f]; };
  const bend = (x: number) => { const t = Math.min(1, Math.max(0, x / DOORS.foldBend + 0.5)); return t * t * (3 - 2 * t); };
  const us = [s.folds[2], s.folds[1], s.folds[0]], px = new Float64Array(3), pt = new Float64Array(3), w = new Float64Array(n * 3);
  us.forEach((u, k) => { const p = pivot(u); px[k] = p[0]; pt[k] = p[1]; for (let i = 0; i < n; i++) w[i * 3 + k] = bend(s.along[i] - u); });
  F = { px, pt, w, ox: new Float64Array(n), ot: new Float64Array(n) };
  fasts.set(s, F);
  return F;
}
/** `pose`, into `F.ox`/`F.ot`: the folds (radians: hinge, inner, middle, outer in `a`) distal first, then the hinge, then
 * drawn out longer from its hinge (`a[4]`: how much longer, as a share). */
function poseFast(s: Section, a: readonly number[], F: Fast): void {
  const A = [a[3], a[2], a[1]], [hx, ht] = s.hinge, ch = Math.cos(a[0]), sh = Math.sin(a[0]), L = 1 + Math.max(0, a[4] ?? 0);
  for (let i = 0; i < s.points.length; i++) {
    let x = s.points[i][0], t = s.points[i][1];
    for (let k = 0; k < 3; k++) {
      const g = A[k] * F.w[i * 3 + k];
      if (g) { const c = Math.cos(g), sn = Math.sin(g), dx = x - F.px[k], dt = t - F.pt[k]; x = F.px[k] + dx * c - dt * sn; t = F.pt[k] + dx * sn + dt * c; }
    }
    if (a[0]) { const dx = x - hx, dt = t - ht; x = hx + dx * ch - dt * sh; t = ht + dx * sh + dt * ch; }
    if (L !== 1) { x = hx + (x - hx) * L; t = ht + (t - ht) * L; }
    F.ox[i] = x; F.ot[i] = t;
  }
}

/** The least of `f` near `from` (Nelder and Mead's simplex: no slopes needed). */
function leastNear(f: (v: number[]) => number, from: readonly number[], step: number, rounds: number): number[] {
  const n = from.length, pts: number[][] = [from.slice()];
  for (let i = 0; i < n; i++) { const p = from.slice(); p[i] += step; pts.push(p); }
  let val = pts.map(f);
  for (let k = 0; k < rounds; k++) {
    const order = val.map((_, i) => i).sort((i, j) => val[i] - val[j]);
    const P = order.map((i) => pts[i]), V = order.map((i) => val[i]);
    const mid = Array.from({ length: n }, (_, d) => P.slice(0, n).reduce((s, p) => s + p[d], 0) / n);
    const along = (u: number) => mid.map((m, d) => m + u * (P[n][d] - m));
    const xr = along(-1), fr = f(xr);
    if (fr < V[0]) { const xe = along(-2), fe = f(xe); P[n] = fe < fr ? xe : xr; V[n] = Math.min(fe, fr); }
    else if (fr < V[n - 1]) { P[n] = xr; V[n] = fr; }
    else {
      const xc = along(fr < V[n] ? -0.5 : 0.5), fc = f(xc);
      if (fc < Math.min(fr, V[n])) { P[n] = xc; V[n] = fc; }
      else for (let i = 1; i <= n; i++) { P[i] = P[i].map((x, d) => P[0][d] + 0.5 * (x - P[0][d])); V[i] = f(P[i]); }
    }
    pts.splice(0, pts.length, ...P); val = V;
    if (V[n] - V[0] < 1e-9 * (1 + Math.abs(V[0])) && P.every((p) => p.every((x, d) => Math.abs(x - P[0][d]) < 2e-5))) break;
  }
  return pts[val.indexOf(Math.min(...val))];
}

/** The narrowest the opening is between the two doors, posed (metres). */
const narrowest = (posed: readonly [number, number][]) => 2 * Math.min(...posed.map((p) => p[0]));

let headWay: { centre: number[]; angles: Angles[] } | null = null;

/** The circle's way down and the doors' joints at each step of it (worked out once). */
function wayDown(): { centre: number[]; angles: Angles[] } {
  if (headWay) return headWay;
  const s = section(), r = BIRTH_HEAD.diameterM / 2;
  // (it first touches the closed doors as high as any of them reaches into its way)
  let c = -Infinity;
  for (const [x, t] of s.points) if (Math.abs(x) < r) c = Math.max(c, t + Math.sqrt(r * r - x * x));
  const centre = [c], angles: Angles[] = [{ hinge: 0, inner: 0, mid: 0, outer: 0 }];
  let a = [0, 0, 0, 0];
  for (let k = 0; k < 400; k++) {
    c -= BIRTH_HEAD.stepM;
    const here = c;
    const inside = circleAt(here);
    a = leastNear((v) => strain(s, v, inside), leastNear((v) => strain(s, v, inside), a, 0.05, 400), 0.01, 400);
    centre.push(c);
    angles.push({ hinge: a[0] / RAD, inner: a[1] / RAD, mid: a[2] / RAD, outer: a[3] / RAD });
    // (until the opening has stretched round its widest: its lips up to the circle's middle)
    if (pose(s, a[0], { inner: a[1] / RAD, mid: a[2] / RAD, outer: a[3] / RAD })[s.lining - 1][1] >= c) break;
  }
  return (headWay = { centre, angles });
}

/** Where the circle is at BIRTH OPENING `birth` (0..1): its centre's height up the canal from the opening, metres, in a
 * door's section ([x, t], centred on x = 0). */
export function birthHead(birth: number): { centreT: number; radiusM: number } {
  const w = wayDown(), q = Math.min(1, Math.max(0, Number.isFinite(birth) ? birth : 0)) * (w.centre.length - 1), k = Math.min(w.centre.length - 2, Math.floor(q));
  return { centreT: w.centre[k] + (w.centre[k + 1] - w.centre[k]) * (q - k), radiusM: BIRTH_HEAD.diameterM / 2 };
}

/** The joints' angles at BIRTH OPENING `birth` (0..1), degrees: as the circle has them there. */
export function birthAngles(birth: number): Angles {
  // (closed, as laid: nothing to work out until a birth starts)
  if (!(birth > 0)) return { hinge: 0, inner: 0, mid: 0, outer: 0 };
  const w = wayDown(), q = Math.min(1, Math.max(0, Number.isFinite(birth) ? birth : 0)) * (w.angles.length - 1);
  const k = Math.min(w.angles.length - 2, Math.floor(q)), u = q - k, a = w.angles[k], b = w.angles[k + 1], mix = (x: number, y: number) => x + (y - x) * u;
  return { hinge: mix(a.hinge, b.hinge), inner: mix(a.inner, b.inner), mid: mix(a.mid, b.mid), outer: mix(a.outer, b.outer) };
}

const turnAbout = (p: [number, number], c: [number, number], a: number): [number, number] => {
  const dx = p[0] - c[0], dt = p[1] - c[1], cs = Math.cos(a), sn = Math.sin(a);
  return [c[0] + dx * cs - dt * sn, c[1] + dx * sn + dt * cs];
};

/** One door's section posed (the right one): folded at its three folds (each piece past a fold turned out with it, the
 * fold itself a short bend), then swung `hingeRad` on its main hinge. */
function pose(s: Section, hingeRad: number, folds: { outer: number; mid: number; inner: number; long?: number }): [number, number][] {
  const lining = s.points.slice(0, s.lining), at = s.along.slice(0, s.lining);
  const pivot = (u: number): [number, number] => { let k = 1; while (k < at.length - 1 && at[k] < u) k++; const f = at[k] > at[k - 1] ? (u - at[k - 1]) / (at[k] - at[k - 1]) : 0; return [lining[k - 1][0] + (lining[k][0] - lining[k - 1][0]) * f, lining[k - 1][1] + (lining[k][1] - lining[k - 1][1]) * f]; };
  const bend = (x: number) => { const t = Math.min(1, Math.max(0, x / DOORS.foldBend + 0.5)); return t * t * (3 - 2 * t); };
  const joints: [number, number][] = [[s.folds[2], folds.outer], [s.folds[1], folds.mid], [s.folds[0], folds.inner]], L = Math.max(1, folds.long ?? 1);
  return s.points.map((p, i) => {
    let q = p;
    for (const [u, deg] of joints) if (deg) q = turnAbout(q, pivot(u), ((deg * Math.PI) / 180) * bend(s.along[i] - u));
    if (hingeRad) q = turnAbout(q, s.hinge, hingeRad);
    // (drawn out longer from its hinge: its skin stretched to her opening's rim)
    return L !== 1 ? [s.hinge[0] + (q[0] - s.hinge[0]) * L, s.hinge[1] + (q[1] - s.hinge[1]) * L] : q;
  });
}

/** Whether a posed door (the right one) reaches back through her outer skin beyond its hinge (its own root, where it is
 * her skin, aside). */
function intoSkin(posed: readonly [number, number][], along: readonly number[], hinge: [number, number]): boolean {
  const D = DOORS;
  return posed.some(([x, t], i) => { const r = (x - hinge[0]) / D.skin; return along[i] > 0.15 && r > 0 && t > D.hingeUp - D.thick + D.skinRise * r * r - D.skinClear; });
}

/** A door's angles as laid: what a birth has pushed it to (`b`) and the hand's fold back on top (`h`), its main hinge
 * only so far as keeps the door (section `s`) off her outer skin. */
function laidOn(s: Section, b: Angles, h: Angles): Angles {
  const want = { outer: b.outer + h.outer, mid: b.mid + h.mid, inner: b.inner + h.inner, long: b.long ?? 1 };
  let hinge = ((b.hinge + h.hinge) * Math.PI) / 180;
  if (intoSkin(pose(s, hinge, want), s.along, s.hinge)) { let lo = 0, hi = hinge; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (intoSkin(pose(s, m, want), s.along, s.hinge)) hi = m; else lo = m; } hinge = lo; }
  return { ...want, hinge: (hinge * 180) / Math.PI };
}

/**
 * The angles laid on a door (degrees) pushed open `birth` (BIRTH OPENING's way: by the circle, from inside) and folded
 * back `fold` (FOLD BACK's: by hand, on top of whatever the birth has laid) -- its main hinge only so far as keeps the
 * door off her outer skin.
 */
export function doorAngles(birth: number, fold = 0): Angles {
  return laidOn(section(), birthAngles(birth), foldAngles(fold));
}

/** One door (the right one) posed at `angles` (degrees), in its cross-section's own [x, t] (metres): its outline (the
 * lining's points first), its main hinge and its three folds as they stand -- for drawing how it moves. */
export function doorSection(angles: Angles): { points: [number, number][]; lining: number; hinge: [number, number]; folds: [number, number][] } {
  const s = section(), a = { outer: angles.outer, mid: angles.mid, inner: angles.inner }, hinge = (angles.hinge * Math.PI) / 180;
  const posed = pose(s, hinge, a), at = s.along.slice(0, s.lining);
  const near = (u: number) => at.reduce((best, x, i) => (Math.abs(x - u) < Math.abs(at[best] - u) ? i : best), 0);
  return { points: posed, lining: s.lining, hinge: s.hinge, folds: s.folds.map((u) => posed[near(u)]) };
}

/** How wide the opening is, pushed open `birth` and folded back `fold`: the narrowest between the two doors, metres. */
export function doorOpening(birth: number, fold = 0): number {
  const s = section(), a = doorAngles(birth, fold);
  return narrowest(pose(s, (a.hinge * Math.PI) / 180, a));
}

/**
 * The doors in her rest frame, pushed open `birth` (0..1, BIRTH OPENING) and folded back `fold` (0..1, FOLD BACK) -- or,
 * given `pressed`, each section front to back as what passes through her has pushed it (`pressDoor`) and her opening's
 * ends as far apart as it has stretched them, the hand's fold on top: each door's mesh, coloured lining or skin; her
 * skin round them (`skinRing`); how wide the opening is between the lips at its middle; and the angles laid there on
 * the right door (degrees).
 */
export function doorMeshes(f: DoorFrame, birth: number, fold = 0, pressed?: PressedDoors): { points: Float32Array; triangles: Uint32Array; lining: Uint8Array; openM: number; angles: Angles; skin: { points: Float32Array; triangles: Uint32Array } } {
  const J = DOORS.stations, hand = foldAngles(fold), uniform = pressed ? null : birthAngles(birth), ends = pressed?.ends ?? ENDS_SHUT, mid = (J - 1) / 2;
  const laid = (side: 0 | 1) => Array.from({ length: J }, (_, j) => laidOn(stationSection(j), pressed ? (side === 0 ? pressed.right : pressed.left)[j] : uniform!, hand));
  const R = laid(0), L = laid(1), loop = doorLoop(R, L, ends, !!pressed);
  // (round the loop, each section joined to the next: one mesh, both doors and the bands at their ends)
  const n = section().points.length, lin = stationSection(0).lining, pts: number[] = [], tris: number[] = [], lining: number[] = [], C = loop.length;
  const at = (x: number, t: number, a: number) => [0, 1, 2].map((c) => f.mouth[c] + f.x[c] * x + f.t[c] * t + f.n[c] * a);
  for (const sec of loop) for (let i = 0; i < n; i++) { pts.push(...at(sec.points[i][0], sec.points[i][1], sec.points[i][2])); lining.push(i < lin ? 1 : 0); }
  for (let c = 0; c < C; c++) for (let i = 0; i < n; i++) {
    const a = c * n + i, b = c * n + ((i + 1) % n), cc = ((c + 1) % C) * n + i, d = ((c + 1) % C) * n + ((i + 1) % n);
    tris.push(a, cc, b, b, cc, d);
  }
  const middle = (a: Angles) => pose(stationSection(mid), (a.hinge * Math.PI) / 180, a);
  const openM = narrowest(middle(R[mid])) / 2 + narrowest(middle(L[mid])) / 2;
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), lining: Uint8Array.from(lining), openM, angles: R[mid], skin: skinRing(f, ends, R, L, loop) };
}

/**
 * HER OPENING'S TOP AND BOTTOM AS THE DOORS' OWN SKIN (Joshua, 2026-11-08, sketching it: "think of a ring that folds in
 * the middle (with the fold up and down so it opens and closes left to right)... as it opens, also rising up so from the
 * side view, it's a even line as well as looking directly in it"; "the top and bottom part you have looks like separate
 * pieces and it's not on the same layer/mesh, and looks bulky"): round each end of her opening, from the right door's
 * last section to the left door's, a band of the same skin -- the end section turned round her opening's end, half a turn,
 * its hinge on a curve joining the two doors' hinges -- each of its sections posed between the two doors' end sections,
 * bending most at the slit (the middle two of Joshua's four joints) and half way out to each side (the other two). Closed
 * it gathers neatly at the slit's end; opening, it goes as the doors' ends go -- out and level with them as her opening's
 * edge becomes one ring. The loop: the right door back to front, the band round her front end, the left door front to
 * back, the band round her back end; each section [x, t, along] in her opening's frame (metres), posed.
 */
function doorLoop(R: readonly Angles[], L: readonly Angles[], ends: Ends, ring = false): { points: [number, number, number][]; root: [number, number, number] }[] {
  const J = DOORS.stations, M = DOORS.bandSteps, out: { points: [number, number, number][]; root: [number, number, number] }[] = [];
  const posed = (j: number, a: Angles) => pose(stationSection(j), (a.hinge * Math.PI) / 180, a);
  // (each section's points' share of the way from its root to its lip, for `roundRing`)
  const shares: Float64Array[] = [];
  const add = (q: [number, number][], map: (x: number, t: number) => [number, number, number]) => {
    const p = q.map(([x, t]) => map(x, t)), l = lineOf(q);
    out.push({ points: p, root: p[p.length - 1] });
    shares.push(Float64Array.from(q, ([x, t]) => Math.min(1, Math.max(0, ((x - l.ax) * l.ux + (t - l.at) * l.ut) / l.len))));
  };
  const PR = R.map((a, j) => posed(j, a)), PL = L.map((a, j) => posed(j, a));
  // (open, the doors' narrow ends and the bands between them take the shape of the door's own wall a little way in from
  // each end -- `ringWall` -- so her opening's edge round its ends is the same skin as along its sides)
  const lin = stationSection(0).lining, open = Math.max(...[...PR, ...PL].map((q) => q[lin - 1][0]));
  const g0 = ring ? Math.min(1, Math.max(0, (open - PRESS.ringFrom) / (PRESS.ringBy - PRESS.ringFrom))) : 0, g = g0 * g0 * (3 - 2 * g0);
  const js = DOORS.ringWall, back = (D: readonly [number, number][][]) => wallOf(D[js]), front = (D: readonly [number, number][][]) => wallOf(D[J - 1 - js]);
  const walls = g > 0 ? { backR: back(PR), backL: back(PL), frontR: front(PR), frontL: front(PL) } : null;
  const endness = (j: number) => { const e = Math.min(1, Math.max(0, Math.max(js - j, j - (J - 1 - js)) / js)); return e * e * (3 - 2 * e); };
  const asWall = (q: [number, number][], wall: Wall | null, e: number) => (wall && e * g > 0 ? onWall(q, wall, e * g) : q);
  // (a band's sections between the doors' end sections: turned about her opening's end, half a turn from one door to the
  // other; how far along is shaped by the four joints -- most of the change across the slit and half way out to each side)
  const band = (j: number, from: Angles, to: Angles, sign: 1 | -1, wFrom: Wall | null, wTo: Wall | null) => {
    const a0 = stationOf(j, ends).along;
    for (let k = 1; k < M; k++) {
      const v = k / M, g = bandShare(v), mix = (x: number, y: number) => x + (y - x) * g, phi = Math.PI * v;
      const a: Angles = { hinge: mix(from.hinge, to.hinge), inner: mix(from.inner, to.inner), mid: mix(from.mid, to.mid), outer: mix(from.outer, to.outer), long: mix(from.long ?? 1, to.long ?? 1) };
      // (round her opening's end in a flat curve -- out past it only `bandReach` as far as across -- so its edge carries the
      // doors' on round the end rather than bulging past it)
      const ux = Math.cos(phi) * sign, un = Math.sin(phi) * sign * DOORS.bandReach;
      add(asWall(posed(j, a), wFrom && wTo ? mixWall(wFrom, wTo, v) : null, 1), (x, t) => [x * ux, t, a0 + x * un]);
    }
  };
  for (let j = 0; j < J; j++) add(asWall(PR[j], walls && (j < J / 2 ? walls.backR : walls.frontR), endness(j)), (x, t) => [x, t, stationOf(j, ends).along]);
  band(J - 1, R[J - 1], L[J - 1], 1, walls?.frontR ?? null, walls?.frontL ?? null);
  for (let j = J - 1; j >= 0; j--) add(asWall(PL[j], walls && (j < J / 2 ? walls.backL : walls.frontL), endness(j)), (x, t) => [-x, t, stationOf(j, ends).along]);
  band(0, L[0], R[0], -1, walls?.backL ?? null, walls?.backR ?? null);
  if (g > 0) roundRing(out, shares, g);
  return out;
}

/**
 * HER OPENING ONE ROUND OVAL, NOT A STRAIGHT-SIDED ONE CAPPED AT EACH END (Joshua, 2026-11-08: "can you smooth the left
 * and right sides with a more rounded curve -- At the top and bottom sides? Those slightly rounded half circles at the top
 * and bottom also looks off"): open (`g`), seen looking into her, every section's lip is carried out onto one smooth oval
 * round them all -- as wide as the widest, as long as the longest each way -- and its root onto another round the roots;
 * each point between as far as its share of the way from root to lip. Only ever outward, so off whatever passes; the
 * skin round them follows their roots.
 */
function roundRing(loop: { points: [number, number, number][]; root: [number, number, number] }[], shares: readonly Float64Array[], g: number): void {
  const n = loop[0].points.length, tip = stationSection(0).lining + 1;
  // (an oval round the points given, a quarter at a time -- across each way and along each way -- grown to take them all
  // in, and where each would go on it, straight out from its middle)
  const oval = (at: (c: number) => [number, number, number]) => {
    const P = loop.map((_, c) => at(c)), most = (f: (p: readonly number[]) => number) => Math.max(1e-6, ...P.map(f));
    const ax = [most((p) => p[0]), most((p) => -p[0])], an = [most((p) => p[2]), most((p) => -p[2])];
    const norm = (p: readonly number[]) => [p[0] / ax[p[0] >= 0 ? 0 : 1], p[2] / an[p[2] >= 0 ? 0 : 1]];
    const k = Math.max(1, ...P.map((p) => Math.hypot(...norm(p))));
    return P.map((p) => { const [u, v] = norm(p), r = Math.hypot(u, v) || 1, s = k / r; return [p[0] * s - p[0], p[2] * s - p[2]]; });
  };
  const lip = oval((c) => loop[c].points[tip]), root = oval((c) => loop[c].points[n - 1]);
  loop.forEach((sec, c) => {
    const pts = sec.points.map((p, i): [number, number, number] => {
      const s = shares[c][i], w = s * s * (3 - 2 * s);
      return [p[0] + (root[c][0] + (lip[c][0] - root[c][0]) * w) * g, p[1], p[2] + (root[c][1] + (lip[c][1] - root[c][1]) * w) * g];
    });
    sec.points = pts;
    sec.root = pts[n - 1];
  });
}

/**
 * A DOOR'S WALL, AS A SHAPE ANY SECTION CAN TAKE ON (Joshua, 2026-11-08: "That top and bottom skin flap looks too boxy
 * still and not part of the same mesh… is it possible to merge?"): each point of a posed section as how far it is from
 * its root toward its lip's end (0 .. 1) and how far it stands off that line (metres) -- so laid on another section's own
 * root and lip, that section has the same wall: as thick, bending the same way, only as long as it is.
 */
interface Wall { readonly s: Float64Array; readonly d: Float64Array }
function lineOf(q: readonly [number, number][]): { ax: number; at: number; bx: number; bt: number; len: number; ux: number; ut: number } {
  const lin = stationSection(0).lining, n = q.length, ax = (q[0][0] + q[n - 1][0]) / 2, at = (q[0][1] + q[n - 1][1]) / 2, [bx, bt] = q[lin + 1];
  const len = Math.hypot(bx - ax, bt - at) || 1e-9;
  return { ax, at, bx, bt, len, ux: (bx - ax) / len, ut: (bt - at) / len };
}
function wallOf(q: readonly [number, number][]): Wall {
  const l = lineOf(q), s = new Float64Array(q.length), d = new Float64Array(q.length);
  q.forEach(([x, t], i) => { const px = x - l.ax, pt = t - l.at; s[i] = (px * l.ux + pt * l.ut) / l.len; d[i] = -px * l.ut + pt * l.ux; });
  return { s, d };
}
const mixWall = (a: Wall, b: Wall, v: number): Wall => ({ s: a.s.map((x, i) => x + (b.s[i] - x) * v), d: a.d.map((x, i) => x + (b.d[i] - x) * v) });
/** Section `q` given `wall`'s shape by `w` (0 .. 1) -- its root kept where it is (the shape eased in over the first
 * `DOORS.ringRoot` of the way out, so where it meets her skin and her canal does not move) and its lip's end too. */
function onWall(q: readonly [number, number][], wall: Wall, w: number): [number, number][] {
  const l = lineOf(q);
  return q.map(([x, t], i) => {
    const s = wall.s[i], d = wall.d[i], tx = l.ax + s * (l.bx - l.ax) - d * l.ut, tt = l.at + s * (l.bt - l.at) + d * l.ux;
    const r = Math.min(1, Math.max(0, s / DOORS.ringRoot)), k = w * r * r * (3 - 2 * r);
    // (and on its own side of her middle, as it was)
    return [Math.max(x + (tx - x) * k, Math.min(x, DOORS.gap)), t + (tt - t) * k];
  });
}

/** How far across a band (0 at the door it leaves .. 1 at the door it meets) its sections have gone from the one door's
 * pose to the other's: in four bends -- half way out to each side and either side of the slit, the four joints of Joshua's
 * sketch -- straight between them. */
function bandShare(v: number): number {
  const J4 = DOORS.bandJoints, knots: [number, number][] = [[0, 0], [J4[0], 0.25], [J4[1], 0.45], [J4[2], 0.55], [J4[3], 0.75], [1, 1]];
  for (let k = 1; k < knots.length; k++) if (v <= knots[k][0]) { const [x0, y0] = knots[k - 1], [x1, y1] = knots[k]; return y0 + ((y1 - y0) * (v - x0)) / Math.max(1e-9, x1 - x0); }
  return 1;
}

const CLOSED: Angles = Object.freeze({ hinge: 0, inner: 0, mid: 0, outer: 0 });

/** Her opening's two ends, how far each is from its middle along it (metres): `front` toward her pubic bone (+n) and
 * `back` toward her tailbone. */
export interface Ends { readonly front: number; readonly back: number }
/** Her opening's ends as laid: its length, half each way. */
export const ENDS_SHUT: Ends = Object.freeze({ front: DOORS.length / 2, back: DOORS.length / 2 });

/** Station `j` of a door, front to back (0 .. DOORS.stations - 1), with her opening's ends at `ends`: its share of the
 * way (-1 .. 1), its place along the opening (metres), and how thick and how wide it is there, as shares of its middle's
 * (a door thins to its ends, as lips do, and narrows round her oval opening to meet the other at each end). */
function stationOf(j: number, ends: Ends = ENDS_SHUT): { u: number; along: number; f: number; w: number } {
  const u = -1 + (2 * j) / (DOORS.stations - 1), p = DOORS.ovalPower;
  return { u, along: u * (u >= 0 ? ends.front : ends.back), f: Math.max(DOORS.endThick, Math.sqrt(1 - u * u)), w: Math.max(DOORS.endWidth, (1 - Math.abs(u) ** p) ** (1 / p)) };
}
const sections: Section[] = [];
const stationSection = (j: number): Section => { const st = stationOf(j); return (sections[j] ??= section(st.f, st.w)); };

/**
 * THE DOORS PUSHED BY WHAT PASSES THROUGH HER (Joshua, 2026-11-08: "make a simple collision between the head vertices and
 * the sections to automatically push back on touch", and then "based on the whole baby's model, not just the head so it
 * doesn't close up while the baby is still halfway out"): her baby's points -- all of it, head, shoulders, body and legs
 * -- cut into a slice at each of a door's stations front to back, each slice's outline (the convex hull of its points,
 * across her and up the canal), for the right door and, mirrored, the left. Each section is then pushed by its own
 * slice as the circle pushes them (`pressDoor`): so the doors stand round the baby's own shape, wider where it is wider,
 * a half sphere front to back as well as across, and stay round its body until its feet are through.
 */
export interface Outline {
  /** the first band's height up the canal (metres) and how tall each band is */
  readonly t0: number; readonly dt: number;
  /** each band's furthest point toward the door (`hi`) and furthest from it (`lo`), across her (metres; NaN: none there) */
  readonly hi: Float64Array; readonly lo: Float64Array;
  /** across, least and most; up the canal, least and most */
  readonly box: readonly number[];
}
export interface PassingOutlines { readonly right: readonly (Outline | null)[]; readonly left: readonly (Outline | null)[]; /** how far apart it pushes her opening's ends, each within its 12.5 cm */ readonly ends: Ends }
/** Each section's angles, the right door's and the left's, front to back (degrees). */
export interface PressedDoors { readonly right: readonly Angles[]; readonly left: readonly Angles[]; readonly ends?: Ends }

/**
 * A SLICE'S OWN OUTLINE, NOT A FILLED-IN ONE (Joshua, 2026-11-08, choosing it: the ring "tightens round the neck after the
 * head"): what passes through her, band by band up the canal, as far as it reaches across each way -- so where it is
 * narrower, as its neck is behind its head, the slice is narrower too and a door can close in there, as her opening does
 * round its neck once its head is born. Each band reaches to its neighbours' furthest as well (a band's few points
 * cannot leave a notch a door would catch in); bands with nothing between bands with something are filled from them.
 * Null for fewer than three points.
 */
function outlineOf(points: [number, number][]): Outline | null {
  if (points.length < 3) return null;
  const dt = DOORS.sliceBand;
  let tMin = Infinity, tMax = -Infinity, xMin = Infinity, xMax = -Infinity;
  for (const [x, t] of points) { if (t < tMin) tMin = t; if (t > tMax) tMax = t; if (x < xMin) xMin = x; if (x > xMax) xMax = x; }
  const B = Math.max(1, Math.floor((tMax - tMin) / dt) + 1), hi0 = new Float64Array(B).fill(NaN), lo0 = new Float64Array(B).fill(NaN);
  for (const [x, t] of points) { const i = Math.min(B - 1, Math.floor((t - tMin) / dt)); if (!(x <= hi0[i])) hi0[i] = x; if (!(x >= lo0[i])) lo0[i] = x; }
  // (bands with nothing, between bands with something: filled across from them)
  const fill = (a: Float64Array) => {
    let last = -1;
    for (let i = 0; i < B; i++) {
      if (Number.isNaN(a[i])) continue;
      if (last >= 0 && i - last > 1) for (let k = last + 1; k < i; k++) a[k] = a[last] + ((a[i] - a[last]) * (k - last)) / (i - last);
      last = i;
    }
  };
  fill(hi0); fill(lo0);
  // (each band out to its neighbours' furthest, and then a notch narrower than `DOORS.sliceFill` up the canal filled
  // across -- between fingers, an arm against its side -- while one as long as its neck stays: a door closes in round its
  // neck, not into every small hollow)
  const reach = (a: Float64Array, r: number, more: boolean) => Float64Array.from(a, (_, i) => {
    let v = a[i];
    for (let k = Math.max(0, i - r); k <= Math.min(B - 1, i + r); k++) if (Number.isNaN(v) || (more ? a[k] > v : a[k] < v)) v = a[k];
    return v;
  });
  const r = Math.max(1, Math.round(DOORS.sliceFill / 2 / dt));
  const hi = reach(reach(reach(hi0, 1, true), r, true), r, false), lo = reach(reach(reach(lo0, 1, false), r, false), r, true);
  return { t0: tMin, dt, hi, lo, box: [xMin, xMax, tMin - dt / 2, tMax + dt / 2] };
}

/** How far a point is inside an outline (metres; 0 or less, outside): across, to the nearer side of its band (read
 * between bands), and no deeper than it is from the outline's top or bottom. */
export const insideOf = (o: Outline): Inside => (x, t) => {
  if (x < o.box[0] || x > o.box[1] || t < o.box[2] || t > o.box[3]) return -1;
  const u = Math.min(o.hi.length - 1, Math.max(0, (t - o.t0) / o.dt - 0.5)), i = Math.floor(u), k = Math.min(o.hi.length - 1, i + 1), w = u - i;
  const hi = o.hi[i] + (o.hi[k] - o.hi[i]) * w, lo = o.lo[i] + (o.lo[k] - o.lo[i]) * w;
  if (!(hi >= lo)) return -1;
  return Math.min(hi - x, x - lo, t - o.box[2], o.box[3] - t);
};

/** What passes through her opening (`points`: x, y, z after one another, her rest frame, metres) cut into each door
 * station's slice and outlined, for the right door and the left, its stations where her opening's ends stand now
 * (`ends`); and how far apart what crosses her opening (by its rim, `rimT` up the canal, and on up to its hinges) pushes
 * those ends -- past it by her skin, from her opening's own
 * length to the most it stretches (Joshua's 12.5 cm). Only what is near the doors counts. */
export function passingOutlines(f: DoorFrame, points: ArrayLike<number>, ends: Ends = ENDS_SHUT, rimT = -DOORS.lip): PassingOutlines {
  const D = DOORS, J = D.stations, step = Math.max(ends.front, ends.back) / ((J - 1) / 2), slab = 1.25 * step;
  const along = Array.from({ length: J }, (_, j) => stationOf(j, ends).along), slices: [number, number][][] = Array.from({ length: J }, () => []);
  let front = 0, back = 0;
  for (let i = 0; i + 2 < points.length; i += 3) {
    const dx = points[i] - f.mouth[0], dy = points[i + 1] - f.mouth[1], dz = points[i + 2] - f.mouth[2];
    const x = dx * f.x[0] + dy * f.x[1] + dz * f.x[2], t = dx * f.t[0] + dy * f.t[1] + dz * f.t[2], n = dx * f.n[0] + dy * f.n[1] + dz * f.n[2];
    if (t < -0.8 || t > 0.2 || Math.abs(x) > 0.25) continue;
    // (crossing her opening, between its lips and its hinges: how far along it, each way)
    // (from a little past her opening's rim where it stands now -- out of her when it is stretched round what passes -- up
    // to its hinges)
    if (t > Math.min(rimT, -D.lip) - 0.01 && t < D.hingeUp && Math.abs(x) < D.acrossMost / 2) { if (n > front) front = n; if (-n > back) back = -n; }
    for (let j = 0; j < J; j++) if (Math.abs(n - along[j]) <= slab) slices[j].push([x, t]);
  }
  const reach = (r: number) => Math.min(D.lengthMost / 2, Math.max(D.length / 2, r + D.endClear));
  return { right: slices.map((q) => outlineOf(q)), left: slices.map((q) => outlineOf(q.map(([x, t]): [number, number] => [-x, t]))), ends: { front: reach(front), back: reach(back) } };
}

/**
 * Where station `j` of a door lies, pushed by `outline` (the right door's side of its slice; the left door's mirrored
 * onto it): as near closed as it lets it, every joint as stiff as the next (as the circle pushes them: `strain`) --
 * found from `from` (degrees: where it lay last), as a door is pushed on from where it stood. Nothing in the way of its
 * closing: closed.
 *
 * THE DOOR AS ONE PIECE FRONT TO BACK (Joshua, 2026-11-08, choosing it: "Link each section to the ones beside it, so a
 * door bends as one piece from front to back. Let the main hinge do the work whenever it and the inner fold would do the
 * same job"): each section is drawn toward the sections beside it (`near`, as they stand: `PRESS.link`), and its inner
 * fold -- which turns about nearly the same place as its main hinge -- is dearer than the hinge (`PRESS.inner`), so of
 * two ways that look alike a section takes the one its neighbours take, its hinge doing the turning.
 */
export function pressDoor(outline: Outline | null, from: Angles, j: number, near: readonly Angles[] = [], ring?: { readonly t: number; readonly k: number }): Angles {
  if (!outline && !ring) return CLOSED;
  const s = stationSection(j), inside: Inside = outline ? insideOf(outline) : () => -1, F = fastOf(s);
  if (!ring && !pose(s, 0, CLOSED).some(([x, t]) => inside(x, t) > 0)) return CLOSED;
  const vec = (a: Angles) => [a.hinge * RAD, a.inner * RAD, a.mid * RAD, a.outer * RAD, (a.long ?? 1) - 1], by = near.map(vec);
  const f = (v: number[]) => {
    let e = strain(s, v, inside) + (PRESS.inner - 1) * v[1] * v[1] + PRESS.lengthen * v[4] * v[4] + 1e3 * (Math.min(0, v[4]) ** 2 + Math.max(0, v[4] - (PRESS.longest - 1)) ** 2);
    // (never turned out so far on its hinge that it flips over, its lining outward -- Joshua, 2026-11-08, choosing it:
    // "doors can't flip or kink"; pressed harder than that, it gives against what passes instead. The narrow last
    // section at each end aside: it is the corner of her opening, turned out round what passes as her opening's ends
    // stretch.)
    if (j > 0 && j < DOORS.stations - 1) e += 1e6 * Math.max(0, v[0] - PRESS.hingeMost * RAD) ** 2;
    // (its lip drawn to her opening's rim, where the rest of it stands: one ring -- its skin stretching, if it must)
    if (ring) e += ring.k * (F.ot[s.lining - 1] - ring.t) ** 2;
    // (and its lips held hard to their own side of her middle -- harder than anything that pulls or bends them over it)
    for (let i = 0; i < F.ox.length; i++) { const past = DOORS.gap - F.ox[i]; if (past > 0) e += 1e8 * past * past; }
    for (const b of by) e += PRESS.link * ((v[0] - b[0]) ** 2 + (v[1] - b[1]) ** 2 + (v[2] - b[2]) ** 2 + (v[3] - b[3]) ** 2 + (v[4] - b[4]) ** 2);
    return e;
  };
  // (drawn longer only once her opening is a ring: before that a door is as long as it is)
  const n = ring ? 5 : 4, start = vec(from).slice(0, n);
  const a = leastNear((v) => f(n === 5 ? v : [...v, 0]), leastNear((v) => f(n === 5 ? v : [...v, 0]), start, 0.03, PRESS.rounds[0]), 0.008, PRESS.rounds[1]);
  return { hinge: a[0] / RAD, inner: a[1] / RAD, mid: a[2] / RAD, outer: a[3] / RAD, long: 1 + Math.max(0, a[4] ?? 0) };
}

/** How much deeper than its own bend a section's inner fold costs (its hinge does that turning), how dear drawing a
 * door out longer is (per share longer, squared, against its bend) and the longest it goes, how hard each section
 * is drawn toward each beside it (against its own bend: radians squared), how long each is worked at (the simplex's
 * rounds, coarse then fine: a frame's time), how many passes of smoothing front to back; and how hard each lip is drawn
 * to her opening's rim once it is stretched round what passes (per metre squared: OFF for now -- drawing every lip to
 * one rim stretched the doors out of shape; the bands round her opening's ends carry its edge round instead), from how
 * far open at its middle and at its full by how far, and how near the widest-open a section must be to set the rim
 * (`rimOf`). GAME TUNING. */
const PRESS = Object.freeze({ inner: 4, link: 6, rounds: [40, 25] as const, smooth: 2, ring: 0, ringFrom: 0.01, ringBy: 0.03, ringLead: 0.85, lengthen: 3, longest: 2.2, hingeMost: 110, softPull: 2 });

/** How far a section at station `j`, at `a` (degrees), reaches past her middle toward the other door (metres; 0 or less:
 * on its own side). */
function pressedPast(a: Angles, j: number): number {
  const s = stationSection(j), F = fastOf(s);
  poseFast(s, [a.hinge * RAD, a.inner * RAD, a.mid * RAD, a.outer * RAD, (a.long ?? 1) - 1], F);
  let most = -Infinity;
  for (let i = 0; i < F.ox.length; i++) most = Math.max(most, DOORS.gap - F.ox[i]);
  return most;
}

/** How far a section at station `j`, at `a` (degrees), goes into `outline` (metres; 0 or less: clear of it). */
function pressedInto(outline: Outline | null, a: Angles, j: number): number {
  if (!outline) return 0;
  const s = stationSection(j), inside = insideOf(outline), F = fastOf(s);
  poseFast(s, [a.hinge * RAD, a.inner * RAD, a.mid * RAD, a.outer * RAD, (a.long ?? 1) - 1], F);
  let most = 0;
  for (let i = 0; i < F.ox.length; i++) most = Math.max(most, inside(F.ox[i], F.ot[i]));
  return most;
}

/**
 * A door pushed by what passes through her, all its sections in a step (`was` where each lay; `rest` what one with
 * nothing at it holds): each section worked out from where it lay, drawn toward the sections beside it as they now stand
 * (`pressDoor`) -- every one, or half of them (`half`: 0 the even stations, 1 the odd; the others keep where they lay:
 * a frame's time) -- then the door smoothed front to back (`PRESS.smooth` passes), a section kept where it was worked
 * out wherever smoothing would take it into the baby.
 */
export function pressDoorLine(outlines: readonly (Outline | null)[], was: readonly Angles[], rest: Angles = CLOSED, half?: 0 | 1): Angles[] {
  const J = DOORS.stations, out = was.slice(), rim = rimOf(was, outlines);
  // (stretched round what passes, her opening's edge is one ring: where its widest-open sections hold their lips is where
  // its rim is, and every other section's lip, touched or not, is drawn to it -- those few set it, the rest follow, so
  // the ring cannot chase itself)
  const ring = rim.k > 0 ? { t: rim.t, k: rim.k } : undefined;
  for (let j = 0; j < J; j++) {
    if (!outlines[j] && !ring) { out[j] = rest; continue; }
    if (half !== undefined && j % 2 !== half) continue;
    out[j] = pressDoor(outlines[j], out[j], j, [out[j - 1], out[j + 1]].filter((a): a is Angles => !!a), ring && !rim.leads[j] ? ring : undefined);
  }
  const keys = ['hinge', 'inner', 'mid', 'outer'] as const;
  for (let pass = 0; pass < PRESS.smooth; pass++) {
    const was2 = out.slice();
    for (let j = 0; j < J; j++) {
      if (!outlines[j] && !ring) continue;
      const a = was2[j - 1] ?? was2[j], b = was2[j + 1] ?? was2[j], c = was2[j];
      const m = { ...(Object.fromEntries(keys.map((k) => [k, (a[k] + 2 * c[k] + b[k]) / 4])) as unknown as Angles), long: ((a.long ?? 1) + 2 * (c.long ?? 1) + (b.long ?? 1)) / 4 };
      if (pressedInto(outlines[j], m, j) <= Math.max(0.0005, pressedInto(outlines[j], c, j)) && pressedPast(m, j) <= Math.max(0.0002, pressedPast(c, j))) out[j] = m;
    }
  }
  return levelRim(out, outlines);
}

/**
 * HER OPENING'S EDGE LEVEL ALL ROUND (Joshua, 2026-11-08: "as it opens, also rising up so from the side view, it's a even
 * line as well as looking directly in it", and from the end: the band at the top and bottom stood short of the doors'
 * lips): once her opening is open (`PRESS.ringFrom`, all of it by `PRESS.ringBy`), every section whose lip stands short
 * of where the widest-open sections hold theirs is turned on its hinge and drawn out longer until its lip is level with
 * theirs -- out as far as keeps it off what passes -- so the doors' narrow ends, and the bands between them, come out with
 * the rest and her opening's edge is one level ring.
 */
function levelRim(stations: Angles[], outlines: readonly (Outline | null)[]): Angles[] {
  const lipOf = (a: Angles, j: number) => { const s = stationSection(j), F = fastOf(s); poseFast(s, [a.hinge * RAD, a.inner * RAD, a.mid * RAD, a.outer * RAD, (a.long ?? 1) - 1], F); return [F.ox[s.lining - 1], F.ot[s.lining - 1]]; };
  const lips = stations.map(lipOf), open = Math.max(...lips.map((l) => l[0]));
  const g0 = Math.min(1, Math.max(0, (open - PRESS.ringFrom) / (PRESS.ringBy - PRESS.ringFrom))), g = g0 * g0 * (3 - 2 * g0);
  if (!(g > 0)) return stations;
  // (where the widest-open hold their lips)
  let sw = 0, st = 0;
  lips.forEach(([x, t]) => { if (x >= PRESS.ringLead * open) { sw += x; st += x * t; } });
  const rimT = st / sw;
  return stations.map((a, j) => {
    const [lx, lt] = lips[j], want = lt + (rimT - lt) * g;
    if (!(want < lt - 0.001)) return a;
    const [hx, ht] = stationSection(j).hinge, from = Math.atan2(lt - ht, lx - hx), len = Math.hypot(lx - hx, lt - ht) || 1e-6;
    const to = (x: number): Angles => ({ ...a, hinge: a.hinge + ((Math.atan2(want - ht, x - hx) - from) * 180) / Math.PI, long: (a.long ?? 1) * (Math.hypot(x - hx, want - ht) / len) });
    // (as far out from her middle as keeps it off what passes, and on its own side of her middle)
    const bad = (x: number) => pressedInto(outlines[j], to(x), j) > 0.0005 || pressedPast(to(x), j) > 0.0002;
    let x = lx;
    if (bad(x)) { let lo = lx, hi = lx + 0.04; for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (bad(m)) lo = m; else hi = m; } x = hi; }
    // (never so far round on its hinge that it would lie back over her skin, nor flipped over: then as far toward level
    // as it can go -- not left where it was, or it and the section beside it, levelled, would stand a step apart and
    // tear the mesh between them)
    const s = stationSection(j), toward = (k: number): Angles => {
      const w = lt + (want - lt) * k, x2 = x;
      return { ...a, hinge: a.hinge + ((Math.atan2(w - ht, x2 - hx) - from) * 180) / Math.PI, long: (a.long ?? 1) * (Math.hypot(x2 - hx, w - ht) / len) };
    };
    const fits = (b: Angles) => !(b.hinge > PRESS.hingeMost && j > 0 && j < DOORS.stations - 1) && !intoSkin(pose(s, (b.hinge * Math.PI) / 180, b), s.along, s.hinge);
    if (bad(x)) return a;
    if (fits(toward(1))) return toward(1);
    let lo = 0, hi = 1;
    for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (fits(toward(m))) lo = m; else hi = m; }
    // (and the rest of the way to level by drawing it out longer as it now points, not turning it further)
    const b = lo > 0 ? toward(lo) : a, F = fastOf(s);
    poseFast(s, [b.hinge * RAD, b.inner * RAD, b.mid * RAD, b.outer * RAD, (b.long ?? 1) - 1], F);
    const bt = F.ot[s.lining - 1], more = (want - ht) / (bt - ht);
    const c = more > 1 && Number.isFinite(more) ? { ...b, long: (b.long ?? 1) * Math.min(more, 2) } : b;
    return pressedPast(c, j) > 0.0002 ? b : c;
  });
}

/**
 * PLAN B: ONE POSE, SOLVED AGAINST THE BABY AS THE CIRCLE WAS (Joshua, 2026-11-08: "keep the same sim concept, but
 * do it on the fixed slider and like how we measured the circle and egg, we use that same concept but we use the baby
 * model instead with the non-sim version and it can average points between the joints to open correctly"): both doors
 * take one set of joints for all their sections, as the BIRTH OPENING slider does, found the way Joshua's circle found
 * them -- every joint as stiff as the next, the least bending that keeps every section off what passes -- with every
 * section's own slice of the baby counted together, so the one pose is the one that suits them all. Then her rim is
 * levelled and her opening's ends stretch round it as before.
 */
export function sharedDoors(f: DoorFrame, points: ArrayLike<number>, ends: Ends, rimT: number, was?: { right: readonly Angles[]; left: readonly Angles[] }): { right: Angles[]; left: Angles[]; ends: Ends } {
  const J = DOORS.stations, o = passingOutlines(f, points, ends, rimT), mid = (J - 1) / 2;
  // (both doors the one pose, as the slider has them: every section of each counted against its own slice)
  const at = [...o.right, ...o.left].map((q) => (q ? insideOf(q) : null));
  // (nothing at them where they stand closed: closed)
  const shut = () => ({ right: Array.from({ length: J }, () => CLOSED), left: Array.from({ length: J }, () => CLOSED), ends: o.ends });
  if (!at.some((q, k) => q && pose(stationSection(k % J), 0, CLOSED).some(([x, t]) => q(x, t) > 0))) return shut();
  // (and never wider than her opening's most, 10 cm across at its middle: past that what passes gives instead)
  const sm = stationSection(mid), Fm = fastOf(sm), most = DOORS.acrossMost / 2;
  const cost = (v: number[]) => {
    let e = 0; for (let k = 0; k < at.length; k++) { const q = at[k]; if (q) e += strain(stationSection(k % J), v, q); }
    poseFast(sm, [v[0], v[1], v[2], v[3], 0], Fm); let near = Infinity; for (let i = 0; i < Fm.ox.length; i++) near = Math.min(near, Fm.ox[i]);
    if (near > most) e += 1e7 * (near - most) ** 2;
    // (and never flipped over, its lining outward: past `PRESS.hingeMost` what passes gives instead)
    e += 1e9 * Math.max(0, v[0] - PRESS.hingeMost * RAD) ** 2;
    return e;
  };
  const a0 = was?.right[mid] ?? CLOSED, start = [a0.hinge * RAD, a0.inner * RAD, a0.mid * RAD, a0.outer * RAD];
  const v = leastNear(cost, leastNear(cost, start, 0.03, PRESS.rounds[0]), 0.008, PRESS.rounds[1]);
  const a: Angles = { hinge: v[0] / RAD, inner: v[1] / RAD, mid: v[2] / RAD, outer: v[3] / RAD }, row = () => Array.from({ length: J }, () => a);
  // (its rim levelled as the slider's is -- every section alike: checked section by section against the baby, some were
  // levelled and the ones beside them not, and the step between them tore the mesh -- Joshua, 2026-11-08: "why the Plan
  // B even if it looks better, the mesh is warp/ripped/missing?")
  const none = row().map(() => null);
  return { right: levelRim(row(), none), left: levelRim(row(), none), ends: o.ends };
}

/**
 * HER DOORS AS THE SLIDER HAS THEM, SET BY WHAT PASSES (Joshua, 2026-11-08, after the real baby tore them: "What if we
 * don't do soft body and keep it like the slider which looks good, or just make the first 2 (outer and mid) sections soft
 * body, but the rest is not like a hybrid"): every section of both doors at the one BIRTH OPENING pose (`birthAngles`) --
 * found from what passes: while its head comes down, where Joshua's 10 cm circle would be with its middle where its
 * head's is (its crown, the furthest out of it near her middle, a head's half away); its head through, as far open as it
 * is wide between her doors' hinges and their lips (its neck, then its shoulders, its body). Her opening's ends stretch
 * round it as before, and her rim is levelled. `soft`: the hybrid -- each section's outer and mid folds, the lip's two
 * thirds, pushed by its own slice of what passes, drawn to the slider's pose and to the sections beside it; its main
 * hinge and inner fold the slider's.
 */
export function sliderDoors(f: DoorFrame, points: ArrayLike<number>, ends: Ends, rimT: number, soft: boolean, was?: { right: readonly Angles[]; left: readonly Angles[] }): { right: Angles[]; left: Angles[]; ends: Ends; birth: number } {
  const D = DOORS, J = D.stations, o = passingOutlines(f, points, ends, rimT), r = BIRTH_HEAD.diameterM / 2;
  // (its crown, and how wide it is between her doors' hinges and lips: across her, from her middle)
  let crown = Infinity, wide = 0;
  const lipT = Math.min(rimT, -D.lip);
  for (let i = 0; i + 2 < points.length; i += 3) {
    const dx = points[i] - f.mouth[0], dy = points[i + 1] - f.mouth[1], dz = points[i + 2] - f.mouth[2];
    const x = dx * f.x[0] + dy * f.x[1] + dz * f.x[2], t = dx * f.t[0] + dy * f.t[1] + dz * f.t[2], n = dx * f.n[0] + dy * f.n[1] + dz * f.n[2];
    if (Math.abs(x) < r && Math.abs(n) < D.lengthMost / 2 && t < crown && t > -0.8) crown = t;
    if (t > lipT - 0.005 && t < D.hingeUp && Math.abs(n) < D.lengthMost / 2) wide = Math.max(wide, Math.abs(x));
  }
  // (BIRTH OPENING from its head's middle, by the circle's way down; then from how wide it is, by how far each opens)
  const c0 = birthHead(0).centreT, c1 = birthHead(1).centreT, head = crown + r;
  let birth: number;
  if (!Number.isFinite(crown) || head > c0) birth = 0;
  else if (head > c1) { let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (birthHead(m).centreT > head) lo = m; else hi = m; } birth = (lo + hi) / 2; }
  else { const want = Math.min(D.acrossMost, 2 * wide); let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (doorOpening(m) < want) lo = m; else hi = m; } birth = hi; }
  const at = birthAngles(birth), row = (): Angles[] => Array.from({ length: J }, () => at);
  let right = row(), left = row();
  if (soft) {
    // (the hybrid: its lip's two folds pushed by its own slice, the slider's hinge and inner fold under them)
    const lips = (outlines: readonly (Outline | null)[], from: readonly Angles[] | undefined): Angles[] => {
      const out: Angles[] = [];
      for (let j = 0; j < J; j++) {
        const s = stationSection(j), inside: Inside = outlines[j] ? insideOf(outlines[j]!) : () => -1, prev = from?.[j] ?? at, side = [out[j - 1], from?.[j + 1]].filter((a): a is Angles => !!a);
        const full = (v: number[]) => [at.hinge * RAD, at.inner * RAD, v[0], v[1]];
        const cost = (v: number[]) => {
          let e = strain(s, full(v), inside) + PRESS.softPull * ((v[0] - at.mid * RAD) ** 2 + (v[1] - at.outer * RAD) ** 2);
          for (const b of side) e += PRESS.link * ((v[0] - b.mid * RAD) ** 2 + (v[1] - b.outer * RAD) ** 2);
          return e;
        };
        const a = leastNear(cost, leastNear(cost, [prev.mid * RAD, prev.outer * RAD], 0.03, PRESS.rounds[0]), 0.008, PRESS.rounds[1]);
        out.push({ ...at, mid: a[0] / RAD, outer: a[1] / RAD });
      }
      return out;
    };
    right = lips(o.right, was?.right); left = lips(o.left, was?.left);
  }
  return { right: levelRim(right, soft ? o.right : right.map(() => null)), left: levelRim(left, soft ? o.left : left.map(() => null)), ends: o.ends, birth };
}

/**
 * HER OPENING'S RIM, ONE RING (Joshua, 2026-11-08: "the whole opening when the baby is coming out, is a complete ring...
 * at max open, the opening needs to literally look like a 12.5x10 oval/ring, as that top and bottom skin moves"): where
 * a door's sections stand (`stations`, degrees; `outlines`, what pushes each), how far up the canal their lips are on the
 * whole, the widest-open counting most (`t`, metres; below 0 out of her), how far open it is (`open`: the widest lip from
 * her middle, metres), and how hard every lip is drawn to that rim (`k`: none until it is open `PRESS.ringFrom`, all of
 * it by `PRESS.ringBy` -- a ring pulled tight lies flat round what it holds).
 */
export function rimOf(stations: readonly Angles[], outlines?: readonly (Outline | null)[]): { t: number; open: number; k: number; leads: boolean[] } {
  const lips = stations.map((a, j) => {
    if (outlines && !outlines[j]) return null;
    const s = stationSection(j), F = fastOf(s);
    poseFast(s, [a.hinge * RAD, a.inner * RAD, a.mid * RAD, a.outer * RAD, (a.long ?? 1) - 1], F);
    return [F.ox[s.lining - 1], F.ot[s.lining - 1]];
  });
  const open = Math.max(0, ...lips.map((l) => (l ? l[0] : 0)));
  // (its widest-open sections set where it is)
  const leads = lips.map((l) => !!l && l[0] >= PRESS.ringLead * open);
  let sw = 0, st = 0;
  lips.forEach((l, j) => { if (l && leads[j]) { sw += l[0]; st += l[0] * l[1]; } });
  const g = Math.min(1, Math.max(0, (open - PRESS.ringFrom) / (PRESS.ringBy - PRESS.ringFrom)));
  return { t: sw > 0 ? st / sw : -DOORS.lip, open, k: PRESS.ring * g * g * (3 - 2 * g), leads };
}

/** One step of a pushed section toward where it is pushed (`want`): as fast as it is pushed (`DOORS.openS`), and as the
 * pneumatic closer brings it back once let go (`DOORS.closeS`). */
export function followDoor(now: Angles, want: Angles, dt: number): Angles {
  const h = Math.max(0, Number.isFinite(dt) ? dt : 0), bend = (a: Angles) => Math.abs(a.hinge) + Math.abs(a.inner) + Math.abs(a.mid) + Math.abs(a.outer) + 100 * ((a.long ?? 1) - 1);
  const k = 1 - Math.exp(-h / (bend(want) > bend(now) ? DOORS.openS : DOORS.closeS)), go = (x: number, y: number) => { const v = x + (y - x) * k; return Math.abs(v - y) < 1e-3 ? y : v; };
  return { hinge: go(now.hinge, want.hinge), inner: go(now.inner, want.inner), mid: go(now.mid, want.mid), outer: go(now.outer, want.outer), long: go(now.long ?? 1, want.long ?? 1) };
}

/** One step of her opening's ends toward where they are pushed (`want`): as fast as they are pushed, and back as the
 * closer brings them once let go. */
export function followEnds(now: Ends, want: Ends, dt: number): Ends {
  const h = Math.max(0, Number.isFinite(dt) ? dt : 0), go = (x: number, y: number) => { const v = y + (x - y) * Math.exp(-h / (y > x ? DOORS.openS : DOORS.closeS)); return Math.abs(v - y) < 1e-5 ? y : v; };
  return { front: go(now.front, want.front), back: go(now.back, want.back) };
}

/**
 * Her outer skin's test piece, all the way round her opening, as ONE piece (Joshua, 2026-11-08: "can you extend the up
 * and down and keep the skin, but have an outward curve around it?", and then "The skin on top and bottom of the opening
 * needs to be blended so it's all smooth and not disconnected"): a ring whose inner edge is where her doors meet her skin
 * as they stand now -- along each side the foot of each door section's skin by its hinge, at each end the end sections'
 * skin from hinge round to hinge -- and whose outer edge is her skin lying flat (a rounded frame out toward her thighs and
 * front and back). Every row between is blended from one to the other: across and along it straight, and in its height as
 * a dome's shoulder (close to the doors' edge near them, rising to her flat skin further out), so as the doors bulge and
 * her opening's ends are pushed apart (`ends`) the whole ring goes with them, smoothly, with no seam. `right`, `left`: each
 * door's sections as posed, front to back (the right door's own [x, t]; the left's mirrored). Rest frame; a test piece
 * until her real skin is built.
 */
export function skinRing(f: DoorFrame, ends: Ends = ENDS_SHUT, right?: readonly Angles[], left?: readonly Angles[], loop?: ReturnType<typeof doorLoop>): { points: Float32Array; triangles: Uint32Array } {
  const D = DOORS, R0 = CANAL_OPENING.diameterM / 2, J = D.stations, K = 8, N = D.lengthMost / 2 + 0.025, flatT = D.hingeUp - D.thick, X = R0 + D.hingeOut + D.skin;
  const shut = Array.from({ length: J }, () => CLOSED);
  // its inner edge: the foot of each of the doors' sections round the loop, by its hinge -- the bands' too, so it meets
  // them at their hinge all the way round and never dips into the slit; its outer edge an oval on her flat skin, each
  // point of the inner edge going straight out to it as laid
  const inner = (loop ?? doorLoop(right ?? shut, left ?? shut, ends)).map((c) => c.root);
  const outer = doorLoop(shut, shut, ENDS_SHUT).map(({ root: [x, , a] }) => { const g = Math.atan2(a / N, x / X); return [X * Math.cos(g), flatT + D.skinRise, N * Math.sin(g)]; });
  const C = inner.length, pts: number[] = [], tris: number[] = [];
  const at = (x: number, t: number, a: number) => [0, 1, 2].map((c) => f.mouth[c] + f.x[c] * x + f.t[c] * t + f.n[c] * a);
  for (let k = 0; k <= K; k++) {
    const sK = k / K;
    for (let c = 0; c < C; c++) { const i = inner[c], o = outer[c]; pts.push(...at(i[0] + (o[0] - i[0]) * sK, i[1] + (o[1] - i[1]) * sK * sK, i[2] + (o[2] - i[2]) * sK)); }
  }
  for (let k = 0; k < K; k++) for (let c = 0; c < C; c++) { const a = k * C + c, b = k * C + ((c + 1) % C), cc = a + C, d = b + C; tris.push(a, cc, b, b, cc, d); }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris) };
}

/** Her outer skin's test piece as laid, round her closed opening (`skinRing`). */
export const outerSkin = (f: DoorFrame): { points: Float32Array; triangles: Uint32Array } => skinRing(f);

/**
 * One step of the doors toward where they are held (`want`, 0..1: BIRTH OPENING's push, or FOLD BACK's): pushed open they go where
 * they are pushed (`DOORS.openS`); let close, they close as a pneumatic door does -- quickly at first, slowing as they come
 * to, never slamming (`DOORS.closeS`).
 */
export function swingDoors(now: number, want: number, dt: number): number {
  const w = Math.min(1, Math.max(0, want)), h = Math.max(0, Number.isFinite(dt) ? dt : 0);
  const tau = w > now ? DOORS.openS : DOORS.closeS;
  const next = w + (now - w) * Math.exp(-h / tau);
  return Math.abs(next - w) < 1e-4 ? w : next;
}
