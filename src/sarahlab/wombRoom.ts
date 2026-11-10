/**
 * THE ROOM v2's OWN WOMB TAKES, FOR THE ORGANS ROUND IT (the new direction, Joshua 2026-11-09: "everything except for the
 * birth womb is going to be copied over... we are going to use the existing womb and design we have in v2"). v2's womb is
 * a sac measured out from its middle (baby.ts `WombShape`: a radius each way); her belly's organs are kept out of a womb
 * given as slices up its long axis (actor/pregnantWomb.ts `WombRoom`). This reads the one as the other: nothing of v2's
 * womb changes.
 *
 * Her rest frame, metres.
 */
import { WOMB_SHAPE, type WombRoom } from '../actor/pregnantWomb';
import type { P3 } from '../actor/pelvisMeasure';
import { sacRadius, type WombShape } from './baby';

/** How far the sac reaches from a point `t` along its axis from its middle, in a direction square to the axis (metres;
 * 0 where the point is outside it): the sac is a radius each way from its middle, so by bisection. */
function reach(w: WombShape, ax: P3, t: number, dir: P3): number {
  const inside = (s: number): boolean => {
    const x = ax[0] * t + dir[0] * s, y = ax[1] * t + dir[1] * s, z = ax[2] * t + dir[2] * s, d = Math.hypot(x, y, z);
    return d < 1e-9 || d <= sacRadius(w, x / d, y / d, z / d);
  };
  if (!inside(0)) return 0;
  let lo = 0, hi = 0.02;
  while (inside(hi) && hi < 1) { lo = hi; hi *= 2; }
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; }
  return lo;
}

/**
 * v2's womb as the room it takes: WOMB_SHAPE.stations + 1 slices from its bottom to its top along its long axis as it
 * leans front to back (its lean to a side, which a room has none of, is left out: v2's womb stands on her midline), each
 * slice's middle set between its front and its back.
 */
export function wombRoomOf(w: WombShape): WombRoom {
  // (its axis in her front-to-back plane, pointing up)
  let ay = w.axis.y, az = w.axis.z;
  if (ay < 0) { ay = -ay; az = -az; }
  const l = Math.hypot(ay, az) || 1; ay /= l; az /= l;
  const ax: P3 = [0, ay, az], front: P3 = [0, -az, ay], back: P3 = [0, az, -ay], left: P3 = [1, 0, 0], right: P3 = [-1, 0, 0];
  const top = sacRadius(w, 0, ay, az), bottom = -sacRadius(w, 0, -ay, -az), n = WOMB_SHAPE.stations;
  const path: P3[] = [], halves: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    // (its two ends a hair inside, where it still has a width)
    const t = bottom + (top - bottom) * Math.min(0.995, Math.max(0.005, k / n));
    const f = reach(w, ax, t, front), b = reach(w, ax, t, back), across = (reach(w, ax, t, left) + reach(w, ax, t, right)) / 2, shift = (f - b) / 2;
    path.push([w.centre.x, w.centre.y + ay * t + front[1] * shift, w.centre.z + az * t + front[2] * shift]);
    halves.push([Math.max(1e-4, across), Math.max(1e-4, (f + b) / 2)]);
  }
  let high = -Infinity;
  for (let k = 0; k <= n; k++) high = Math.max(high, path[k][1] + halves[k][1] * Math.abs(front[1]));
  return { path, halves, leanDeg: (Math.atan2(az, ay) * 180) / Math.PI, top: Math.max(high, w.centre.y + top * ay) };
}
