/**
 * THE ROOM v2's OWN WOMB TAKES (sarahlab/wombRoom.ts `wombRoomOf`): whether a point is in it, and the way out of it, for
 * her belly's organs (actor/abdominalOrgans.ts `outOfWomb`, `layAbdomen`) -- on v2's carried landmark files.
 * Review tests (2026-11-09): what holds is asserted; what does not is left as `it.fails` with the numbers in its comment.
 */
import { describe, expect, it } from 'vitest';
import torso from '../src/data/torso/v2.json';
import pelvis from '../src/data/pelvis/v2.json';
import { coiledMass, inWomb, layAbdomen, outOfWomb, sweepAny, WOMB_PUSH } from '../src/actor/abdominalOrgans';
import { layOrgans, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { insideWomb, WOMB_SHAPE, type TorsoLandmarks } from '../src/actor/pregnantWomb';
import { sacRadius, wombFromSkin } from '../src/sarahlab/baby';
import { wombRoomOf } from '../src/sarahlab/wombRoom';

const T = torso as unknown as TorsoLandmarks & { discs: number[] }, P = pelvis as unknown as PelvisLandmarks;
/** a belly's skin as tests/sarahBaby.test.ts builds one: a dome `depth` deep in front of her */
const belly = (depth: number) => {
  const pts: number[] = [];
  for (let y = 0.8; y <= 1.23; y += 0.006) for (let x = -0.22; x <= 0.22; x += 0.006) { const u = (y - 1.02) / 0.2, w = x / 0.2, k = 1 - u * u - w * w; pts.push(x, y, 0.05 + (k > 0 ? depth * Math.sqrt(k) : 0)); }
  return pts;
};
const term = wombFromSkin(belly(0.17), 40), room = wombRoomOf(term), c = term.centre;
const finite = (a: ArrayLike<number>) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false; return true; };
/** points all through the sac (seeded, so a failure repeats) */
const through = (n: number) => {
  const out = new Float32Array(3 * n); let s = 12345;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < n; i++) {
    const th = Math.acos(2 * rnd() - 1), ph = 2 * Math.PI * rnd(), d = [Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)], r = sacRadius(term, d[0], d[1], d[2]) * Math.cbrt(rnd()) * 0.999;
    out[3 * i] = c.x + d[0] * r; out[3 * i + 1] = c.y + d[1] * r; out[3 * i + 2] = c.z + d[2] * r;
  }
  return out;
};

describe("v2's womb as a room", () => {
  it('has its slices bottom to top, finite, and says what is in it', () => {
    expect(room.path.length).toBe(WOMB_SHAPE.stations + 1); expect(room.halves.length).toBe(room.path.length);
    expect(finite(room.path.flat())).toBe(true); expect(finite(room.halves.flat())).toBe(true);
    for (let k = 1; k < room.path.length; k++) expect(room.path[k][1]).toBeGreaterThan(room.path[k - 1][1]);
    expect(room.top).toBeGreaterThan(room.path[0][1]);
    expect(insideWomb(room, c.x, c.y, c.z)).toBe(true); // (its very middle: no direction to divide by)
    expect(insideWomb(room, c.x, room.top + 0.02, c.z)).toBe(false);
    expect(insideWomb(room, NaN, c.y, c.z)).toBe(false);
  });

  it('moves every point out of it, by the gap, within its furthest move, never forward; a few thousand in milliseconds', () => {
    const pts = through(5000), was = Float32Array.from(pts), t0 = performance.now(), moved = room.pushOut!(pts, WOMB_PUSH.gap), ms = performance.now() - t0;
    expect(moved).toBe(5000); expect(finite(pts)).toBe(true); expect(inWomb(pts, room)).toBe(0);
    let far = 0, forward = 0;
    for (let i = 0; i < pts.length; i += 3) { far = Math.max(far, Math.hypot(pts[i] - was[i], pts[i + 1] - was[i + 1], pts[i + 2] - was[i + 2])); forward = Math.max(forward, pts[i + 2] - was[i + 2]); }
    expect(far).toBeLessThanOrEqual(0.45 + 1e-6); expect(forward).toBeLessThanOrEqual(1e-6);
    expect(ms).toBeLessThan(250);
    console.log(`[wombRoom] 5000 points out in ${ms.toFixed(1)} ms; furthest move ${(far * 100).toFixed(1)} cm`);
    // (points that are not numbers, and none at all, are left alone)
    expect(room.pushOut!(new Float32Array([NaN, 1, 0]), 0.006)).toBe(0); expect(room.pushOut!(new Float32Array(0), 0.006)).toBe(0);
  });

  it("her belly's organs laid on v2's landmarks round v2's womb: all finite, none left in it", () => {
    const laid = layOrgans(P), bladder = { centre: laid.bladder.centre, radii: laid.bladder.radii };
    expect(finite(laid.vagina.path.flat())).toBe(true);
    const t0 = performance.now(), A = layAbdomen(T, P, laid.vagina.path[0], bladder, undefined, room);
    const meshes = [sweepAny(A.stomach.path, A.stomach.halves, 18, 4).points, sweepAny(A.colon.path, A.colon.halves, 12, 4).points, coiledMass(A.intestines).points];
    for (const m of meshes) { outOfWomb(m, room); expect(finite(m)).toBe(true); expect(inWomb(m, room)).toBe(0); }
    console.log(`[wombRoom] layAbdomen + three meshes round v2's womb: ${(performance.now() - t0).toFixed(1)} ms`);
    expect(A.intestines.centre[1]).toBeGreaterThan(layAbdomen(T, P, laid.vagina.path[0], bladder).intestines.centre[1]);
  });

  // REVIEW FINDING (wombRoom.ts pushOut): the way out is the point's own way from the sac's middle with its forward part
  // taken off, so in FRONT of the middle it is decided by a point's small x and y alone -- two points of one organ a few
  // millimetres apart, either side of the sac's forward axis, are sent opposite ways (left/right, or up/down) to opposite
  // walls. A mesh crossing that axis is torn. Expected of a mesh: neighbours stay neighbours (within a few cm).
  it('neighbouring points in front of its middle stay neighbours when moved out', () => {
    const z = c.z + 0.6 * sacRadius(term, 0, 0, 1), pair = new Float32Array([c.x - 0.012, c.y + 0.002, z, c.x + 0.012, c.y + 0.002, z]);
    room.pushOut!(pair, WOMB_PUSH.gap);
    const apart = Math.hypot(pair[3] - pair[0], pair[4] - pair[1], pair[5] - pair[2]);
    console.log(`[wombRoom] two points 2.4 cm apart in front of its middle end ${(apart * 100).toFixed(1)} cm apart`);
    expect(apart).toBeLessThan(0.06);
  });
  // REVIEW FINDING: "up for what is above its middle" -- but what is BELOW its middle in front is sent DOWN (and sideways),
  // toward her pelvis's floor, not up or back.
  it('nothing in it is moved down out of it', () => {
    const z = c.z + 0.5 * sacRadius(term, 0, 0, 1), p = new Float32Array([c.x + 0.004, c.y - 0.03, z]);
    room.pushOut!(p, WOMB_PUSH.gap);
    console.log(`[wombRoom] a point 3 cm below its middle, in front, is moved ${((c.y - 0.03 - p[1]) * 100).toFixed(1)} cm DOWN`);
    expect(p[1]).toBeGreaterThanOrEqual(c.y - 0.03);
  });
});
