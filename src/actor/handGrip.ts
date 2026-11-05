/**
 * A HAND CLOSED ONTO WHAT IT HOLDS (P4, touch & grip; Joshua, 2026-11-03: "program the fingers to naturally get in the
 * grab position... it can actually accurately find and hold on to the points").
 *
 * What a hand holds is a SHAPE a point can be asked how far outside it is (a signed distance: negative inside) -- a box
 * (a tablet, a badge, a panel), a cylinder (a cup, a handle, a rail), a sphere -- in the world's frame. Each finger is
 * closed from straight, its joints bending together as the room's curl bends them (sarahLabTool.fingerBend), until the
 * nearest of its contact points (its pad, its tip -- actor/contactPoints.ts, read on the live skin) comes to within
 * `gap` of the shape: the first touch, found by stepping out and then halving. A finger that meets nothing closes as
 * far as it is asked to (`most`), as a hand closes round a thing too thin to stop it.
 *
 * Pure: no three, no DOM. The caller turns the finger's bones for each closure asked about and reads its points back.
 */

export type Vec3 = readonly [number, number, number];

/** What a hand can hold, in the world's frame (metres). */
export type GripShape =
  | { readonly kind: 'sphere'; readonly centre: Vec3; readonly radius: number }
  /** an upright or tipped cylinder: its axis from `a` to `b`, capped flat at both ends */
  | { readonly kind: 'cylinder'; readonly a: Vec3; readonly b: Vec3; readonly radius: number }
  /** a box: its middle, its three unit axes, and its half sizes along them */
  | { readonly kind: 'box'; readonly centre: Vec3; readonly axes: readonly [Vec3, Vec3, Vec3]; readonly half: Vec3 };

const sub = (a: Vec3, b: Vec3): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** How far `p` is outside the shape (metres; less than 0 inside it). */
export function shapeDistance(s: GripShape, p: Vec3): number {
  if (s.kind === 'sphere') return Math.hypot(...sub(p, s.centre)) - s.radius;
  if (s.kind === 'cylinder') {
    const ax = sub(s.b, s.a), h = Math.hypot(...ax), u: Vec3 = [ax[0] / h, ax[1] / h, ax[2] / h];
    const rel = sub(p, s.a), along = dot(rel, u), radial = Math.hypot(rel[0] - u[0] * along, rel[1] - u[1] * along, rel[2] - u[2] * along);
    // (the exact distance to a capped cylinder: outside its side, past its caps, or the nearer of the two from inside)
    const dr = radial - s.radius, dh = Math.abs(along - h / 2) - h / 2;
    return Math.min(Math.max(dr, dh), 0) + Math.hypot(Math.max(dr, 0), Math.max(dh, 0));
  }
  const rel = sub(p, s.centre), q = [0, 1, 2].map((k) => Math.abs(dot(rel, s.axes[k])) - s.half[k]);
  return Math.min(Math.max(q[0], q[1], q[2]), 0) + Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
}

/** GAME TUNING: a pad stops this far off what it holds (skin and a little give); the closure is stepped this many times
 * out to the most it may close, then halved this many times between the last step clear of the shape and the first not. */
export const HAND_GRIP = Object.freeze({ gap: 0.002, steps: 24, halvings: 7 });

/**
 * How far a finger closes (0 straight .. `most`) before it first touches: `clearance(c)` turns the finger to closure c and
 * says how far its nearest contact point is from the shape. 0 when it already touches straight; `most` when nothing stops
 * it. Monotone closure is assumed, as a finger closes along one arc.
 */
export function closeToTouch(clearance: (closure: number) => number, most = 1, gap: number = HAND_GRIP.gap, steps: number = HAND_GRIP.steps, halvings: number = HAND_GRIP.halvings): { closure: number; touched: boolean } {
  if (!(most > 0)) return { closure: 0, touched: false };
  if (clearance(0) <= gap) return { closure: 0, touched: true };
  let clear = 0, hit = -1;
  for (let k = 1; k <= steps; k++) { const c = (most * k) / steps; if (clearance(c) <= gap) { hit = c; break; } clear = c; }
  if (hit < 0) return { closure: most, touched: false };
  for (let k = 0; k < halvings; k++) { const mid = (clear + hit) / 2; if (clearance(mid) <= gap) hit = mid; else clear = mid; }
  return { closure: clear, touched: true };
}
