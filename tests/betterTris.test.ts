/**
 * HER TRIANGLES JOINED BETTER WHERE THEY ARE THIN (`actor/betterTris.ts`, P4 2026-11-05). Two slivers sharing a long edge
 * on a flat patch are turned into two fat triangles, facing the same way, with her texture the right way round; where the
 * two are split by a seam of her texture (no point shared by number), or the turn would bend the surface sharply, nothing
 * changes; and as many triangles are kept, on the same points.
 */
import { describe, expect, it } from 'vitest';
import { betterTris } from '../src/actor/betterTris';

// (a long thin diamond: a, b the long diagonal, c, d either side of it, close)
const flat = () => ({ pos: Float32Array.from([0, 0, 0, 0.02, 0, 0, 0.01, 0.0003, 0, 0.01, -0.0003, 0]), nrm: Float32Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), uv: Float32Array.from([0, 0, 1, 0, 0.5, 0.015, 0.5, -0.015]) });
const normalOf = (pos: Float32Array, a: number, b: number, c: number) => { const u = [0, 1, 2].map((k) => pos[b * 3 + k] - pos[a * 3 + k]), v = [0, 1, 2].map((k) => pos[c * 3 + k] - pos[a * 3 + k]); return u[0] * v[1] - u[1] * v[0]; };

describe('her triangles joined better where they are thin (betterTris)', () => {
  it('two slivers sharing a long edge are turned, facing her way, her texture the right way round', () => {
    const { pos, nrm, uv } = flat(), tris = [0, 1, 2, 1, 0, 3];
    const r = betterTris(pos, tris, () => true, nrm, uv);
    expect(r.turned).toBe(1);
    expect(r.tris.length).toBe(tris.length);
    expect(new Set(r.tris)).toEqual(new Set(tris));
    // (the long edge gone, the short one in)
    const has = (a: number, b: number) => { for (let t = 0; t < 6; t += 3) for (let k = 0; k < 3; k++) if (r.tris[t + k] === a && r.tris[t + (k + 1) % 3] === b) return true; return false; };
    expect(has(0, 1) || has(1, 0)).toBe(false);
    expect(has(2, 3) || has(3, 2)).toBe(true);
    for (let t = 0; t < 6; t += 3) expect(normalOf(pos, r.tris[t], r.tris[t + 1], r.tris[t + 2]), 'faces +z as her skin does').toBeGreaterThan(0);
  });

  it('across a seam of her texture, or where turning bends the surface, nothing changes', () => {
    const { pos, nrm, uv } = flat();
    // (the same diamond, the far side's corners its own points: a seam)
    const seamPos = Float32Array.from([...pos, 0, 0, 0, 0.02, 0, 0]), seamNrm = Float32Array.from([...nrm, 0, 0, 1, 0, 0, 1]), seamUv = Float32Array.from([...uv, 0.2, 0.2, 0.8, 0.2]);
    expect(betterTris(seamPos, [0, 1, 2, 5, 4, 3], () => true, seamNrm, seamUv).turned).toBe(0);
    // (a ridge: c and d dropped steeply either side, so the short diagonal would make a valley)
    const ridge = Float32Array.from(pos); ridge[2 * 3 + 2] = -0.004; ridge[3 * 3 + 2] = -0.004;
    expect(betterTris(ridge, [0, 1, 2, 1, 0, 3], () => true, nrm, uv).turned).toBe(0);
    // (and none it is not let turn)
    expect(betterTris(pos, [0, 1, 2, 1, 0, 3], () => false, nrm, uv).turned).toBe(0);
  });
});
