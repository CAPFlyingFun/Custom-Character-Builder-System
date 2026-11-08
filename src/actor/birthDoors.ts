/**
 * HER OPENING AS TWO DOORS (Joshua, 2026-11-08, drawing it: "The yellow is the outer skin/vagina opening, the red circles
 * are where each side hinges, and pink, the tube"; and how they move: "like a swinging door with it like automatically
 * trying to close like a pneumatic door that starts fast, slows down before it touches, but the slider can act like the
 * door opening amount").
 *
 * Her birth canal (the pink tube) comes down to the opening; below the HINGES it curves in to the opening -- a funnel --
 * and each side of that funnel, with the lip below it (her outer skin's, the yellow), is a DOOR hung on its own hinge, one
 * each side of the tube, running front to back. Closed, the two lips meet in the middle; opening, each door swings out
 * round its hinge until the funnel stands straight down under the tube and the opening is as wide as the tube; let go,
 * each swings back as a pneumatic door closes -- quickly at first, slowing as it comes to (`swingDoors`). Her outer skin
 * runs on out from each hinge to her thighs and does not move.
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
  /** stations front to back */
  stations: 17,
});

/** Her canal's frame at its opening (rest metres): its opening, and across, up into her, and front to back. */
export interface DoorFrame { readonly mouth: P3; readonly x: P3; readonly t: P3; readonly n: P3 }

/** The frame from her canal as laid (its opening first): up into her along its first few centimetres. */
export function doorFrame(canal: readonly P3[]): DoorFrame {
  const { mouth, t } = canalMouth(canal, DOORS.hingeUp);
  return { mouth, x: [1, 0, 0], t, n: [0, t[2], -t[1]] };
}

/** One door's cross-section, the right one (+x), closed: [x, t] round it, the canal's lining first (from the hinge in to
 * the lip) then her skin (round the lip's rounded end and back out to the hinge); and its hinge. `f` (0..1) is how thick it is and how far its lip hangs, as a share of its own: a
 * door is thickest in its middle and thins to its ends, front and back, as lips do. */
function section(f = 1): { points: [number, number][]; hinge: [number, number]; lining: number } {
  const D = DOORS, R = CANAL_OPENING.diameterM / 2, h = D.hingeUp, g = D.gap, k = D.thick * f, lip = -0.1 * h - (D.lip - 0.1 * h) * f;
  const lining: [number, number][] = [[R, h], [0.55 * R, 0.8 * h], [0.2 * R, 0.4 * h], [g, 0.1 * h], [g, lip]];
  const round: [number, number][] = [225, 270, 315].map((a) => [g + k / 2 + (k / 2) * Math.cos((a * Math.PI) / 180), lip + (k / 2) * Math.sin((a * Math.PI) / 180)]);
  const skin: [number, number][] = [...round, [g + k, lip], [0.2 * R + k, 0.4 * h - k], [0.55 * R + 0.8 * k, 0.8 * h - k], [R + D.hingeOut, h - D.thick]];
  return { points: [...lining, ...skin], hinge: [R + D.hingeOut, h - D.thick / 2], lining: lining.length };
}

/** How far a door swings to stand open, radians: its opening edge turned to stand straight below its hinge (the opening
 * then as wide as its hinges are apart). */
export function fullSwing(): number {
  const s = section(), [hx, ht] = s.hinge, [ex, et] = s.points[3];
  return -Math.PI / 2 - Math.atan2(et - ht, ex - hx);
}

/** How wide the opening is between the lips at a swing (0 closed .. 1 standing open), metres. */
export function doorOpening(swing: number): number {
  const s = section(), [hx, ht] = s.hinge, [ex, et] = s.points[3], th = Math.min(1, Math.max(0, swing)) * fullSwing();
  return 2 * Math.abs(hx + (ex - hx) * Math.cos(th) - (et - ht) * Math.sin(th));
}

/** The swing that opens it `widthM` wide (as far as it goes: standing open). */
export function swingFor(widthM: number): number {
  if (!(widthM > doorOpening(0))) return 0;
  let lo = 0, hi = 1;
  if (doorOpening(1) <= widthM) return 1;
  for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (doorOpening(m) < widthM) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** The doors at a swing (0 closed .. 1 standing open), in her rest frame: each door's mesh, coloured lining or skin; and
 * how wide the opening is between the lips. */
export function doorMeshes(f: DoorFrame, swing: number): { points: Float32Array; triangles: Uint32Array; lining: Uint8Array; openM: number } {
  const D = DOORS, s = section(), n = s.points.length, J = D.stations, full = fullSwing(), th = Math.min(1, Math.max(0, swing)) * full;
  const pts: number[] = [], tris: number[] = [], lining: number[] = [];
  const at = (x: number, t: number, along: number) => [0, 1, 2].map((c) => f.mouth[c] + f.x[c] * x + f.t[c] * t + f.n[c] * along);
  let openM = 0;
  for (const side of [1, -1]) {
    const base = pts.length / 3, [hx, ht] = s.hinge, c = Math.cos(th), sn = Math.sin(th);
    // (turned round the hinge, out and down; the left door the right one mirrored)
    const turn = ([x, t]: [number, number]): [number, number] => { const dx = x - hx, dt = t - ht; return [side * (hx + dx * c - dt * sn), ht + dx * sn + dt * c]; };
    openM = 2 * Math.abs(turn(s.points[3])[0]);
    for (let j = 0; j < J; j++) {
      const u = -1 + (2 * j) / (J - 1), along = (u * D.length) / 2;
      // (thickest in the middle, thinning to its ends)
      const here = section(Math.max(0.08, Math.sqrt(1 - u * u)));
      for (let i = 0; i < n; i++) { pts.push(...at(...turn(here.points[i]), along)); lining.push(i < s.lining ? 1 : 0); }
    }
    for (let j = 0; j + 1 < J; j++) for (let i = 0; i < n; i++) {
      const a = base + j * n + i, b = base + j * n + ((i + 1) % n), cc = a + n, d = b + n;
      if (side > 0) tris.push(a, cc, b, b, cc, d); else tris.push(a, b, cc, b, d, cc);
    }
  }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), lining: Uint8Array.from(lining), openM };
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
 * One step of the doors toward where BIRTH OPENING holds them (`want`, 0..1 of standing open): pushed open they go where
 * they are pushed (`DOORS.openS`); let close, they close as a pneumatic door does -- quickly at first, slowing as they come
 * to, never slamming (`DOORS.closeS`).
 */
export function swingDoors(now: number, want: number, dt: number): number {
  const w = Math.min(1, Math.max(0, want)), h = Math.max(0, Number.isFinite(dt) ? dt : 0);
  const tau = w > now ? DOORS.openS : DOORS.closeS;
  const next = w + (now - w) * Math.exp(-h / tau);
  return Math.abs(next - w) < 1e-4 ? w : next;
}
