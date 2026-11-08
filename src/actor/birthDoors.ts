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
interface Section { points: [number, number][]; along: number[]; hinge: [number, number]; lining: number; edge: number }

function section(f = 1): Section {
  const D = DOORS, R = CANAL_OPENING.diameterM / 2, h = D.hingeUp, g = D.gap, k = D.thick * f, lip = -0.1 * h - (D.lip - 0.1 * h) * f;
  const corners = (lipT: number): [number, number][] => [[R, h], [0.55 * R, 0.8 * h], [0.2 * R, 0.4 * h], [g, 0.1 * h], [g, lipT]];
  const ctrl = corners(lip), full = corners(-D.lip);
  // (each stretch between them cut finer -- as finely at every thickness, so every section has as many points -- the
  // corners kept: the opening's edge is one of them)
  const lining: [number, number][] = [ctrl[0]];
  let edge = 0;
  for (let i = 1; i < ctrl.length; i++) {
    const [a, b] = [ctrl[i - 1], ctrl[i]], cuts = Math.max(1, Math.round(Math.hypot(full[i][0] - full[i - 1][0], full[i][1] - full[i - 1][1]) / D.fineM));
    for (let c = 1; c <= cuts; c++) lining.push([a[0] + ((b[0] - a[0]) * c) / cuts, a[1] + ((b[1] - a[1]) * c) / cuts]);
    if (i === 3) edge = lining.length - 1;
  }
  const at: number[] = [0];
  for (let i = 1; i < lining.length; i++) at.push(at[i - 1] + Math.hypot(lining[i][0] - lining[i - 1][0], lining[i][1] - lining[i - 1][1]));
  const along = at.map((a) => a / at[at.length - 1]);
  // her skin: the lining's points moved out by the door's thickness, square to it (toward her outside); the root's to the hinge
  const skin = lining.map(([x, t], i): [number, number] => {
    const p = lining[Math.max(0, i - 1)], q = lining[Math.min(lining.length - 1, i + 1)], tx = q[0] - p[0], tt = q[1] - p[1], l = Math.hypot(tx, tt) || 1;
    return i === 0 ? [R + D.hingeOut, h - D.thick] : [x - (tt / l) * k, t + (tx / l) * k];
  });
  const last = lining[lining.length - 1], end = skin[skin.length - 1], mid: [number, number] = [(last[0] + end[0]) / 2, (last[1] + end[1]) / 2];
  const round: [number, number][] = [0.25, 0.5, 0.75].map((u) => { const a = Math.PI + u * Math.PI; return [mid[0] + (k / 2) * Math.cos(a), mid[1] + (k / 2) * Math.sin(a)]; });
  return {
    points: [...lining, ...round, ...[...skin].reverse()], along: [...along, 1, 1, 1, ...[...along].reverse()],
    hinge: [R + D.hingeOut, h - D.thick / 2], lining: lining.length, edge,
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
export interface Angles { readonly outer: number; readonly mid: number; readonly inner: number; readonly hinge: number }

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
type Inside = (x: number, t: number) => number;

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
  const us = [2 / 3, 1 / 3, 0], px = new Float64Array(3), pt = new Float64Array(3), w = new Float64Array(n * 3);
  us.forEach((u, k) => { const p = pivot(u); px[k] = p[0]; pt[k] = p[1]; for (let i = 0; i < n; i++) w[i * 3 + k] = bend(s.along[i] - u); });
  F = { px, pt, w, ox: new Float64Array(n), ot: new Float64Array(n) };
  fasts.set(s, F);
  return F;
}
/** `pose`, into `F.ox`/`F.ot`: the folds (radians: hinge, inner, middle, outer in `a`) distal first, then the hinge. */
function poseFast(s: Section, a: readonly number[], F: Fast): void {
  const A = [a[3], a[2], a[1]], [hx, ht] = s.hinge, ch = Math.cos(a[0]), sh = Math.sin(a[0]);
  for (let i = 0; i < s.points.length; i++) {
    let x = s.points[i][0], t = s.points[i][1];
    for (let k = 0; k < 3; k++) {
      const g = A[k] * F.w[i * 3 + k];
      if (g) { const c = Math.cos(g), sn = Math.sin(g), dx = x - F.px[k], dt = t - F.pt[k]; x = F.px[k] + dx * c - dt * sn; t = F.pt[k] + dx * sn + dt * c; }
    }
    if (a[0]) { const dx = x - hx, dt = t - ht; x = hx + dx * ch - dt * sh; t = ht + dx * sh + dt * ch; }
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
function pose(s: Section, hingeRad: number, folds: { outer: number; mid: number; inner: number }): [number, number][] {
  const lining = s.points.slice(0, s.lining), at = s.along.slice(0, s.lining);
  const pivot = (u: number): [number, number] => { let k = 1; while (k < at.length - 1 && at[k] < u) k++; const f = at[k] > at[k - 1] ? (u - at[k - 1]) / (at[k] - at[k - 1]) : 0; return [lining[k - 1][0] + (lining[k][0] - lining[k - 1][0]) * f, lining[k - 1][1] + (lining[k][1] - lining[k - 1][1]) * f]; };
  const bend = (x: number) => { const t = Math.min(1, Math.max(0, x / DOORS.foldBend + 0.5)); return t * t * (3 - 2 * t); };
  const joints: [number, number][] = [[2 / 3, folds.outer], [1 / 3, folds.mid], [0, folds.inner]];
  return s.points.map((p, i) => {
    let q = p;
    for (const [u, deg] of joints) if (deg) q = turnAbout(q, pivot(u), ((deg * Math.PI) / 180) * bend(s.along[i] - u));
    return hingeRad ? turnAbout(q, s.hinge, hingeRad) : q;
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
  const want = { outer: b.outer + h.outer, mid: b.mid + h.mid, inner: b.inner + h.inner };
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
  return { points: posed, lining: s.lining, hinge: s.hinge, folds: [0, 1 / 3, 2 / 3].map((u) => posed[near(u)]) };
}

/** How wide the opening is, pushed open `birth` and folded back `fold`: the narrowest between the two doors, metres. */
export function doorOpening(birth: number, fold = 0): number {
  const s = section(), a = doorAngles(birth, fold);
  return narrowest(pose(s, (a.hinge * Math.PI) / 180, a));
}

/**
 * The doors in her rest frame, pushed open `birth` (0..1, BIRTH OPENING) and folded back `fold` (0..1, FOLD BACK) -- or,
 * given `pressed`, each section front to back as what passes through her has pushed it (`pressDoor`), the hand's fold
 * on top: each door's mesh, coloured lining or skin; how wide the opening is between the lips at its middle; and the
 * angles laid there on the right door (degrees).
 */
export function doorMeshes(f: DoorFrame, birth: number, fold = 0, pressed?: PressedDoors): { points: Float32Array; triangles: Uint32Array; lining: Uint8Array; openM: number; angles: Angles } {
  const D = DOORS, n = section().points.length, J = D.stations, hand = foldAngles(fold), uniform = pressed ? null : birthAngles(birth);
  const pts: number[] = [], tris: number[] = [], lining: number[] = [], mid = (J - 1) / 2, posedMid: [number, number][][] = [];
  let angles: Angles = CLOSED;
  const at = (x: number, t: number, along: number) => [0, 1, 2].map((c) => f.mouth[c] + f.x[c] * x + f.t[c] * t + f.n[c] * along);
  for (const side of [1, -1]) {
    const base = pts.length / 3;
    for (let j = 0; j < J; j++) {
      // (thickest in the middle, thinning to its ends; the left door the right one mirrored)
      const st = stationOf(j), s = stationSection(j);
      const a = laidOn(s, pressed ? (side > 0 ? pressed.right : pressed.left)[j] : uniform!, hand), here = pose(s, (a.hinge * Math.PI) / 180, a);
      if (j === mid) { posedMid.push(here); if (side > 0) angles = a; }
      for (let i = 0; i < n; i++) { pts.push(...at(side * here[i][0], here[i][1], st.along)); lining.push(i < s.lining ? 1 : 0); }
    }
    for (let j = 0; j + 1 < J; j++) for (let i = 0; i < n; i++) {
      const a = base + j * n + i, b = base + j * n + ((i + 1) % n), cc = a + n, d = b + n;
      if (side > 0) tris.push(a, cc, b, b, cc, d); else tris.push(a, b, cc, b, d, cc);
    }
  }
  const openM = narrowest(posedMid[0]) / 2 + narrowest(posedMid[1]) / 2;
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), lining: Uint8Array.from(lining), openM, angles };
}

const CLOSED: Angles = Object.freeze({ hinge: 0, inner: 0, mid: 0, outer: 0 });

/** Station `j` of a door, front to back (0 .. DOORS.stations - 1): its share of the way (-1 .. 1), its place along the
 * opening (metres) and how thick it is there, as a share of its middle's (a door thins to its ends, as lips do). */
function stationOf(j: number): { u: number; along: number; f: number } {
  const u = -1 + (2 * j) / (DOORS.stations - 1);
  return { u, along: (u * DOORS.length) / 2, f: Math.max(0.08, Math.sqrt(1 - u * u)) };
}
const sections: Section[] = [];
const stationSection = (j: number): Section => (sections[j] ??= section(stationOf(j).f));

/**
 * THE DOORS PUSHED BY WHAT PASSES THROUGH HER (Joshua, 2026-11-08: "make a simple collision between the head vertices and
 * the sections to automatically push back on touch", and then "based on the whole baby's model, not just the head so it
 * doesn't close up while the baby is still halfway out"): her baby's points -- all of it, head, shoulders, body and legs
 * -- cut into a slice at each of a door's stations front to back, each slice's outline (the convex hull of its points,
 * across her and up the canal), for the right door and, mirrored, the left. Each section is then pushed by its own
 * slice as the circle pushes them (`pressDoor`): so the doors stand round the baby's own shape, wider where it is wider,
 * a half sphere front to back as well as across, and stay round its body until its feet are through.
 */
export interface Outline { readonly nx: Float64Array; readonly nt: Float64Array; readonly c: Float64Array; readonly box: readonly number[] }
export interface PassingOutlines { readonly right: readonly (Outline | null)[]; readonly left: readonly (Outline | null)[] }
/** Each section's angles, the right door's and the left's, front to back (degrees). */
export interface PressedDoors { readonly right: readonly Angles[]; readonly left: readonly Angles[] }

/** The convex outline of points [x, t] (anticlockwise; each edge's outward normal and offset), or null for fewer than three. */
function outlineOf(points: [number, number][]): Outline | null {
  if (points.length < 3) return null;
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  const h = [...lower.slice(0, -1), ...upper.slice(0, -1)], m = h.length;
  if (m < 3) return null;
  const nx = new Float64Array(m), nt = new Float64Array(m), c = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const a = h[i], b = h[(i + 1) % m], ex = b[0] - a[0], et = b[1] - a[1], l = Math.hypot(ex, et) || 1;
    nx[i] = et / l; nt[i] = -ex / l; c[i] = nx[i] * a[0] + nt[i] * a[1];
  }
  return { nx, nt, c, box: [Math.min(...h.map((q) => q[0])), Math.max(...h.map((q) => q[0])), Math.min(...h.map((q) => q[1])), Math.max(...h.map((q) => q[1]))] };
}

/** How far a point is inside an outline (metres; 0 or less, outside). */
const insideOf = (o: Outline): Inside => (x, t) => {
  if (x < o.box[0] || x > o.box[1] || t < o.box[2] || t > o.box[3]) return -1;
  let d = Infinity;
  for (let i = 0; i < o.c.length; i++) { const e = o.c[i] - o.nx[i] * x - o.nt[i] * t; if (e < d) { d = e; if (d <= 0) return d; } }
  return d;
};

/** What passes through her opening (`points`: x, y, z after one another, her rest frame, metres) cut into each door
 * station's slice and outlined, for the right door and the left. Only what is near the doors counts. */
export function passingOutlines(f: DoorFrame, points: ArrayLike<number>): PassingOutlines {
  const J = DOORS.stations, step = DOORS.length / (J - 1), slab = 0.75 * step, half = DOORS.length / 2;
  const slices: [number, number][][] = Array.from({ length: J }, () => []);
  for (let i = 0; i + 2 < points.length; i += 3) {
    const dx = points[i] - f.mouth[0], dy = points[i + 1] - f.mouth[1], dz = points[i + 2] - f.mouth[2];
    const x = dx * f.x[0] + dy * f.x[1] + dz * f.x[2], t = dx * f.t[0] + dy * f.t[1] + dz * f.t[2], n = dx * f.n[0] + dy * f.n[1] + dz * f.n[2];
    if (t < -0.8 || t > 0.2 || Math.abs(x) > 0.25) continue;
    const lo = Math.max(0, Math.ceil((n - slab + half) / step)), hi = Math.min(J - 1, Math.floor((n + slab + half) / step));
    for (let j = lo; j <= hi; j++) slices[j].push([x, t]);
  }
  return { right: slices.map((q) => outlineOf(q)), left: slices.map((q) => outlineOf(q.map(([x, t]): [number, number] => [-x, t]))) };
}

/**
 * Where station `j` of a door lies, pushed by `outline` (the right door's side of its slice; the left door's mirrored
 * onto it): as near closed as it lets it, every joint as stiff as the next (as the circle pushes them: `strain`) --
 * found from `from` (degrees: where it lay last), as a door is pushed on from where it stood. Nothing in the way of its
 * closing: closed.
 */
/** How long a pushed section is worked at each time (the simplex's rounds, coarse then fine). GAME TUNING (a frame's time). */
const PRESS_ROUNDS = [40, 25];

export function pressDoor(outline: Outline | null, from: Angles, j: number): Angles {
  if (!outline) return CLOSED;
  const s = stationSection(j), inside = insideOf(outline);
  if (!pose(s, 0, CLOSED).some(([x, t]) => inside(x, t) > 0)) return CLOSED;
  const f = (v: number[]) => strain(s, v, inside);
  const a = leastNear(f, leastNear(f, [from.hinge, from.inner, from.mid, from.outer].map((d) => d * RAD), 0.03, PRESS_ROUNDS[0]), 0.008, PRESS_ROUNDS[1]);
  return { hinge: a[0] / RAD, inner: a[1] / RAD, mid: a[2] / RAD, outer: a[3] / RAD };
}

/** One step of a pushed section toward where it is pushed (`want`): as fast as it is pushed (`DOORS.openS`), and as the
 * pneumatic closer brings it back once let go (`DOORS.closeS`). */
export function followDoor(now: Angles, want: Angles, dt: number): Angles {
  const h = Math.max(0, Number.isFinite(dt) ? dt : 0), bend = (a: Angles) => Math.abs(a.hinge) + Math.abs(a.inner) + Math.abs(a.mid) + Math.abs(a.outer);
  const k = 1 - Math.exp(-h / (bend(want) > bend(now) ? DOORS.openS : DOORS.closeS)), go = (x: number, y: number) => { const v = x + (y - x) * k; return Math.abs(v - y) < 1e-3 ? y : v; };
  return { hinge: go(now.hinge, want.hinge), inner: go(now.inner, want.inner), mid: go(now.mid, want.mid), outer: go(now.outer, want.outer) };
}

/** Her outer skin's test piece: a strip each side from the hinge out toward her thigh, rising as it goes (rest frame). */
export function outerSkin(f: DoorFrame): { points: Float32Array; triangles: Uint32Array } {
  const D = DOORS, R = CANAL_OPENING.diameterM / 2, pts: number[] = [], tris: number[] = [], J = D.stations, K = 6;
  const at = (x: number, t: number, along: number) => [0, 1, 2].map((c) => f.mouth[c] + f.x[c] * x + f.t[c] * t + f.n[c] * along);
  for (const side of [1, -1]) {
    const base = pts.length / 3;
    for (let j = 0; j < J; j++) {
      const along = ((-1 + (2 * j) / (J - 1)) * (D.length + 0.02)) / 2;
      for (let k = 0; k < K; k++) { const r = k / (K - 1); pts.push(...at(side * (R + D.hingeOut + D.skin * r), D.hingeUp - D.thick + D.skinRise * r * r, along)); }
    }
    for (let j = 0; j + 1 < J; j++) for (let k = 0; k + 1 < K; k++) { const a = base + j * K + k, b = a + 1, c = a + K, d = c + 1; tris.push(a, c, b, b, c, d); }
  }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris) };
}

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
