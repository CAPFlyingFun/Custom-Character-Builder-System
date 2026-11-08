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
 * birth (BIRTH OPENING) it goes through Joshua's stages -- its inner piece bulging out with its hinge starting to give,
 * then the middle, then the outer, then the final push swinging it open as far as the head needs (`BIRTH_STAGES`); folded back by hand (FOLD BACK) it turns out from the lip's end -- outer, middle, inner --
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
function section(f = 1): { points: [number, number][]; along: number[]; hinge: [number, number]; lining: number; edge: number } {
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

/** How far a door swings to stand open, radians: its opening edge turned to stand straight below its hinge (the opening
 * then as wide as its hinges are apart). */
export function fullSwing(): number {
  const s = section(), [hx, ht] = s.hinge, [ex, et] = s.points[s.edge];
  return -Math.PI / 2 - Math.atan2(et - ht, ex - hx);
}

/**
 * FOLDED BACK BY HAND (Joshua, 2026-11-08: "add 3 more hinges in the skin itself to basically fold over itself... You can
 * just open, pull it back... split in 3rd, and each 1/3 can rotate 30°... plus the main hinge as well provided it
 * doesn't collide back to the skin... 1st outer 30°, 2nd mid 30°, 3rd inner {closest to body} 30°, 4th default joints"):
 * each door is three pieces, each turning out on its own fold, the lip's end first. FOLD BACK (0..1) folds them in turn --
 * its first quarter the outer third, then the middle, then the inner, then the door on its main hinge -- each by
 * `DOORS.foldDeg`, degrees.
 */
export function foldAngles(fold: number): { outer: number; mid: number; inner: number; hinge: number } {
  const f = Math.min(1, Math.max(0, Number.isFinite(fold) ? fold : 0)) * 4, part = (k: number) => Math.min(1, Math.max(0, f - k)) * DOORS.foldDeg;
  return { outer: part(0), mid: part(1), inner: part(2), hinge: part(3) };
}

/**
 * PUSHED OPEN FROM INSIDE, IN A BIRTH (Joshua, 2026-11-08: "for birth, do the opposite hybrid... It starts bulging the
 * inner, mid, outer, and once it's a max, then it acts like how it is now, which opens wide... with the baby's head
 * pushing from the inside outward"; and then, exactly: "technically for the birth with the bulge, the inner 3rd and main
 * joints would start together"). His stages, in order along `birth` (0..1), each joint going straight from one to the
 * next: [main hinge, inner, middle, outer] degrees -- the last one's hinge as far as the head needs (`fullSwing` at most).
 * Let go, it plays back the other way.
 */
export const BIRTH_STAGES = Object.freeze([
  { name: 'closed', hinge: 0, inner: 0, mid: 0, outer: 0 },
  { name: 'starting pressure', hinge: 15, inner: 30, mid: 0, outer: 0 },
  { name: 'bulging', hinge: 30, inner: 30, mid: 30, outer: 0 },
  { name: 'bulged', hinge: 30, inner: 30, mid: 30, outer: 30 },
  { name: 'final push', hinge: NaN, inner: 30, mid: 30, outer: 30 },
] as const);

/** The joints' angles at `birth` (0..1) along BIRTH_STAGES, degrees (the final push's hinge standing open). */
export function birthAngles(birth: number, stages: readonly { readonly hinge: number; readonly inner: number; readonly mid: number; readonly outer: number }[] = BIRTH_STAGES): { outer: number; mid: number; inner: number; hinge: number } {
  const S = stages, q = Math.min(1, Math.max(0, Number.isFinite(birth) ? birth : 0)) * (S.length - 1);
  const k = Math.min(S.length - 2, Math.floor(q)), u = q - k, a = S[k], b = S[k + 1];
  const hingeOf = (h: number) => (Number.isNaN(h) ? (fullSwing() * 180) / Math.PI : h);
  const mix = (x: number, y: number) => x + (y - x) * u;
  return { inner: mix(a.inner, b.inner), mid: mix(a.mid, b.mid), outer: mix(a.outer, b.outer), hinge: mix(hingeOf(a.hinge), hingeOf(b.hinge)) };
}

const turnAbout = (p: [number, number], c: [number, number], a: number): [number, number] => {
  const dx = p[0] - c[0], dt = p[1] - c[1], cs = Math.cos(a), sn = Math.sin(a);
  return [c[0] + dx * cs - dt * sn, c[1] + dx * sn + dt * cs];
};

/** One door's section posed (the right one): folded at its three folds (each piece past a fold turned out with it, the
 * fold itself a short bend), then swung `hingeRad` on its main hinge. */
function pose(s: ReturnType<typeof section>, hingeRad: number, folds: { outer: number; mid: number; inner: number }): [number, number][] {
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

/**
 * The angles laid on a door (degrees) pushed open `birth` (BIRTH OPENING's way: from inside) and folded back `fold` (FOLD
 * BACK's: by hand), each joint as far as the further of the two takes it -- its main hinge only so far as keeps the door
 * off her outer skin.
 */
export function doorAngles(birth: number, fold = 0): { outer: number; mid: number; inner: number; hinge: number } {
  const s = section(), b = birthAngles(birth), h = foldAngles(fold);
  const want = { outer: Math.max(b.outer, h.outer), mid: Math.max(b.mid, h.mid), inner: Math.max(b.inner, h.inner) };
  let hinge = (Math.max(b.hinge, h.hinge) * Math.PI) / 180;
  if (intoSkin(pose(s, hinge, want), s.along, s.hinge)) { let lo = 0, hi = hinge; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (intoSkin(pose(s, m, want), s.along, s.hinge)) hi = m; else lo = m; } hinge = lo; }
  return { ...want, hinge: (hinge * 180) / Math.PI };
}

/** One door (the right one) posed at `angles` (degrees), in its cross-section's own [x, t] (metres): its outline (the
 * lining's points first), its main hinge and its three folds as they stand -- for drawing how it moves. */
export function doorSection(angles: { outer: number; mid: number; inner: number; hinge: number }): { points: [number, number][]; lining: number; hinge: [number, number]; folds: [number, number][] } {
  const s = section(), a = { outer: angles.outer, mid: angles.mid, inner: angles.inner }, hinge = (angles.hinge * Math.PI) / 180;
  const posed = pose(s, hinge, a), at = s.along.slice(0, s.lining);
  const near = (u: number) => at.reduce((best, x, i) => (Math.abs(x - u) < Math.abs(at[best] - u) ? i : best), 0);
  return { points: posed, lining: s.lining, hinge: s.hinge, folds: [0, 1 / 3, 2 / 3].map((u) => posed[near(u)]) };
}

/** How wide the opening is between the lips, pushed open `birth` and folded back `fold`, metres. */
export function doorOpening(birth: number, fold = 0): number {
  const s = section(), a = doorAngles(birth, fold);
  return 2 * Math.abs(pose(s, (a.hinge * Math.PI) / 180, a)[s.edge][0]);
}

/**
 * The doors in her rest frame, pushed open `birth` (0..1, BIRTH OPENING) and folded back `fold` (0..1, FOLD BACK): each
 * door's mesh, coloured lining or skin; how wide the opening is between the lips; and the angles laid (degrees).
 */
export function doorMeshes(f: DoorFrame, birth: number, fold = 0): { points: Float32Array; triangles: Uint32Array; lining: Uint8Array; openM: number; angles: { outer: number; mid: number; inner: number; hinge: number } } {
  const D = DOORS, s = section(), n = s.points.length, J = D.stations, angles = doorAngles(birth, fold), hinge = (angles.hinge * Math.PI) / 180;
  const pts: number[] = [], tris: number[] = [], lining: number[] = [];
  const at = (x: number, t: number, along: number) => [0, 1, 2].map((c) => f.mouth[c] + f.x[c] * x + f.t[c] * t + f.n[c] * along);
  for (const side of [1, -1]) {
    const base = pts.length / 3;
    for (let j = 0; j < J; j++) {
      const u = -1 + (2 * j) / (J - 1), along = (u * D.length) / 2;
      // (thickest in the middle, thinning to its ends; the left door the right one mirrored)
      const here = pose(section(Math.max(0.08, Math.sqrt(1 - u * u))), hinge, angles);
      for (let i = 0; i < n; i++) { pts.push(...at(side * here[i][0], here[i][1], along)); lining.push(i < s.lining ? 1 : 0); }
    }
    for (let j = 0; j + 1 < J; j++) for (let i = 0; i < n; i++) {
      const a = base + j * n + i, b = base + j * n + ((i + 1) % n), cc = a + n, d = b + n;
      if (side > 0) tris.push(a, cc, b, b, cc, d); else tris.push(a, b, cc, b, d, cc);
    }
  }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), lining: Uint8Array.from(lining), openM: 2 * Math.abs(pose(s, hinge, angles)[s.edge][0]), angles };
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
