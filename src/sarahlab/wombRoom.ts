/**
 * THE ROOM v2's OWN WOMB TAKES, FOR THE ORGANS ROUND IT (the new direction, Joshua 2026-11-09: "everything except for the
 * birth womb is going to be copied over... we are going to use the existing womb and design we have in v2"). v2's womb is
 * a sac measured out from its middle (baby.ts `WombShape`: a radius each way), laid against her belly's skin and hanging
 * with it; her belly's organs are kept out of a womb's room (actor/pregnantWomb.ts `WombRoom`). This reads the one as the
 * other: nothing of v2's womb changes.
 *
 * Her rest frame, metres.
 */
import { WOMB_SHAPE, type WombRoom } from '../actor/pregnantWomb';
import type { P3 } from '../actor/pelvisMeasure';
import { sacRadius, type WombShape } from './baby';

/**
 * How what is in its way is moved aside. v2's womb lies against her belly's skin, so nothing leaves it through her
 * front or goes down: every point in it goes `up` (up and back: her intestines and the colon across her, up under her
 * ribs as a womb at term has them), turned a little the way it already stands from the sac's middle to her side and to
 * her back (`spread` of that, per metre it stands off) -- one smooth way over the whole sac, so neighbours stay
 * neighbours. GAME TUNING: `up`, `spread`, and `far`, the furthest anything is moved (metres).
 */
const ROOM = Object.freeze({ up: [0, 0.8, -0.6] as P3, spread: 6, far: 0.45 });

/**
 * v2's womb as the room it takes. Its slices (the last WOMB_SHAPE.stations + 1, bottom to top up her body) are given for
 * what reads a room's height; whether a point is in it, and the way out of it, are the sac's own (`inside`, `pushOut`).
 */
export function wombRoomOf(w: WombShape): WombRoom {
  const c = w.centre, n = WOMB_SHAPE.stations;
  const inside = (x: number, y: number, z: number, gap = 0): boolean => {
    const dx = x - c.x, dy = y - c.y, dz = z - c.z, d = Math.hypot(dx, dy, dz);
    return d < 1e-9 || d < sacRadius(w, dx / d, dy / d, dz / d) + gap;
  };
  const pushOut = (points: Float32Array, gap: number): number => {
    let moved = 0;
    for (let p = 0; p + 2 < points.length; p += 3) {
      const x = points[p], y = points[p + 1], z = points[p + 2];
      if (!inside(x, y, z, gap)) continue;
      let ux = ROOM.up[0] + (x - c.x) * ROOM.spread, uy = ROOM.up[1], uz = ROOM.up[2] + Math.min(0, z - c.z) * ROOM.spread;
      const l = Math.hypot(ux, uy, uz);
      ux /= l; uy /= l; uz /= l;
      // (the nearest place that way outside it: doubled until out, then halved to the wall)
      let lo = 0, hi = 0.01;
      while (hi < ROOM.far && inside(x + ux * hi, y + uy * hi, z + uz * hi, gap)) { lo = hi; hi *= 2; }
      hi = Math.min(hi, ROOM.far);
      for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (inside(x + ux * m, y + uy * m, z + uz * m, gap)) lo = m; else hi = m; }
      points[p] = x + ux * hi; points[p + 1] = y + uy * hi; points[p + 2] = z + uz * hi;
      moved++;
    }
    return moved;
  };
  // (its slices up her body: each one's middle and half-sizes across her and front to back, by bisection out from its
  // middle's line)
  const reach = (y: number, dx: number, dz: number): number => {
    if (!inside(c.x, y, c.z)) return 0;
    let lo = 0, hi = 0.02;
    while (hi < 1 && inside(c.x + dx * hi, y, c.z + dz * hi)) { lo = hi; hi *= 2; }
    for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (inside(c.x + dx * m, y, c.z + dz * m)) lo = m; else hi = m; }
    return lo;
  };
  const top = c.y + sacRadius(w, 0, 1, 0), bottom = c.y - sacRadius(w, 0, -1, 0);
  const path: P3[] = [], halves: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const y = bottom + (top - bottom) * Math.min(0.995, Math.max(0.005, k / n)), f = reach(y, 0, 1), b = reach(y, 0, -1);
    path.push([c.x, y, c.z + (f - b) / 2]);
    halves.push([Math.max(1e-4, (reach(y, 1, 0) + reach(y, -1, 0)) / 2), Math.max(1e-4, (f + b) / 2)]);
  }
  return { path, halves, leanDeg: 0, top, inside: (x, y, z) => inside(x, y, z), pushOut };
}
