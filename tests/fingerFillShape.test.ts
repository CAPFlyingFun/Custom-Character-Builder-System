/**
 * HER FINGERS' CUT SIDES CLOSED ROUND (`actor/fingerFillShape.ts`, P4 2026-11-05). A round finger (a cylinder) with a hole
 * down its side, closed straight across as fingerSplit closes it: cut finer, every point added lies on the finger's
 * round surface, not on the flat panel across the hole; the closing and her skin still meet edge for edge, with nothing
 * open; and a point between two fingers stays where its corners put it.
 */
import { describe, expect, it } from 'vitest';
import { roundFills } from '../src/actor/fingerFillShape';

const R = 0.008, AROUND = 10, ROWS = 20, STEP = 0.0015, HOLE = [0, 1] as const; // one column wide, a fifth of the way round

function finger() {
  const pos: number[] = [], drawn: number[] = [], fills: number[] = [];
  const id = (row: number, k: number) => row * AROUND + (((k % AROUND) + AROUND) % AROUND);
  for (let row = 0; row < ROWS; row++) for (let k = 0; k < AROUND; k++) { const a = (k / AROUND) * Math.PI * 2; pos.push(R * Math.cos(a), row * STEP, R * Math.sin(a)); }
  // (her skin: every quad but those of the hole, rows 4 to 15)
  const inHole = (row: number, k: number) => row >= 4 && row < 15 && k >= HOLE[0] && k < HOLE[1];
  for (let row = 0; row + 1 < ROWS; row++) for (let k = -AROUND / 2; k < AROUND / 2; k++) {
    if (inHole(row, k)) continue;
    const a = id(row, k), b = id(row, k + 1), c = id(row + 1, k + 1), d = id(row + 1, k);
    drawn.push(a, d, c, a, c, b);
  }
  // (the hole closed straight across, a zip of its two long sides; its ends are edges of her own rows)
  const L = (row: number) => id(row, HOLE[0]), Rt = (row: number) => id(row, HOLE[1]);
  for (let row = 4; row < 15; row++) { fills.push(L(row), L(row + 1), Rt(row)); fills.push(Rt(row), L(row + 1), Rt(row + 1)); }
  return { pos: Float32Array.from(pos), drawn: Uint32Array.from(drawn), fills: Uint32Array.from(fills) };
}

const onCylinder = (_f: number, p: readonly [number, number, number]): [number, number, number] => { const r = Math.hypot(p[0], p[2]) || 1; return [(p[0] / r) * R, p[1], (p[2] / r) * R]; };

describe('her fingers\' cut sides closed round (fingerFillShape)', () => {
  it('cut finer, every point added lies on the round finger, and her skin and the closing meet with nothing open', () => {
    const { pos, drawn, fills } = finger(), owner = new Int8Array(pos.length / 3).fill(0);
    const r = roundFills(pos, fills, drawn, owner, onCylinder, { step: 0.0015, most: 10, weld: 2e-5 });
    expect(r.count).toBeGreaterThan(0);
    expect(r.tris.length / 3).toBeGreaterThan(fills.length / 3);
    const n = r.base, at = (i: number): [number, number, number] => {
      if (i < n) return [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      const k = i - n, p: [number, number, number] = [r.offset[k * 3], r.offset[k * 3 + 1], r.offset[k * 3 + 2]];
      for (let j = 0; j < 3; j++) for (let c = 0; c < 3; c++) p[c] += r.bary[k * 3 + j] * pos[r.parents[k * 3 + j] * 3 + c];
      return p;
    };
    for (let k = 0; k < r.count; k++) expect(Math.abs(Math.hypot(at(n + k)[0], at(n + k)[2]) - R), `point ${k} on the finger`).toBeLessThan(1e-6);
    // (every edge round the closing has its fellow the other way round, from her skin or the closing)
    const edges = new Set<string>(), all = [...drawn, ...r.tris];
    for (let t = 0; t < all.length; t += 3) for (let k = 0; k < 3; k++) edges.add(`${all[t + k]}>${all[t + (k + 1) % 3]}`);
    for (let t = 0; t < r.tris.length; t += 3) for (let k = 0; k < 3; k++) { const a = r.tris[t + k], b = r.tris[t + (k + 1) % 3]; expect(edges.has(`${b}>${a}`), `edge ${a}-${b} closed`).toBe(true); }
    // (and the closing faces out, as her skin does)
    for (let t = 0; t < r.tris.length; t += 3) {
      const A = at(r.tris[t]), B = at(r.tris[t + 1]), C = at(r.tris[t + 2]);
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const mid = [(A[0] + B[0] + C[0]) / 3, 0, (A[2] + B[2] + C[2]) / 3];
      expect(nn[0] * mid[0] + nn[2] * mid[2], `triangle ${t / 3} faces out`).toBeGreaterThan(0);
    }
  });

  it('a point between two fingers is not moved', () => {
    const { pos, drawn, fills } = finger(), owner = new Int8Array(pos.length / 3).fill(0);
    // (one side of the hole another finger's)
    for (let row = 0; row < ROWS; row++) owner[row * AROUND + HOLE[1]] = 1;
    const r = roundFills(pos, fills, drawn, owner, onCylinder, { step: 0.0015, most: 10, weld: 2e-5 });
    expect(r.count).toBeGreaterThan(0);
    for (let k = 0; k < r.count; k++) expect(Math.hypot(r.offset[k * 3], r.offset[k * 3 + 1], r.offset[k * 3 + 2])).toBe(0);
  });
});
