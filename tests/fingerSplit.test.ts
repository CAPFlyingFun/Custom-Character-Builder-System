/**
 * HER FINGERS APART (`actor/fingerSplit.ts`, Joshua 2026-11-05: "Separate in code"). Here, a mitten: two fingers side by
 * side whose skin is one closed surface round both -- as Sarah v2's are where they touched as she was modelled -- capped
 * at the knuckles and at the tips. Cut apart past the webbing, each finger's skin is its own, and the surface is still
 * closed: every edge shared by exactly two triangles, one each way round.
 */
import { describe, expect, it } from 'vitest';
import { FINGER_SPLIT, alongLine, splitFingers, type V3 } from '../src/actor/fingerSplit';

const R = 0.008, APART = 0.01, LONG = 0.08, RINGS = 33;

/** One ring of the mitten at height y: round the left finger's far side, across its top, round the right finger, back. */
function ring(y: number): V3[] {
  const out: V3[] = [];
  for (let k = 0; k <= 8; k++) { const a = Math.PI / 2 + (Math.PI * k) / 8; out.push([-APART + R * Math.cos(a), y, R * Math.sin(a)]); }
  for (const x of [-0.005, 0.0004, 0.005]) out.push([x, y, -R]);
  for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + (Math.PI * k) / 8; out.push([APART + R * Math.cos(a), y, R * Math.sin(a)]); }
  for (const x of [0.005, -0.0004, -0.005]) out.push([x, y, R]);
  return out;
}

function mitten(): { pos: Float32Array; tris: number[] } {
  const pts: V3[] = [], tris: number[] = [];
  const rings = Array.from({ length: RINGS }, (_, k) => ring((LONG * k) / (RINGS - 1)));
  const M = rings[0].length;
  rings.forEach((r) => pts.push(...r));
  for (let k = 0; k + 1 < RINGS; k++) for (let j = 0; j < M; j++) {
    const a = k * M + j, b = k * M + ((j + 1) % M), c = (k + 1) * M + j, d = (k + 1) * M + ((j + 1) % M);
    tris.push(a, c, b, b, c, d);
  }
  // (capped: below the knuckles and past the tips, a fan to a point in the middle)
  const base = pts.length; pts.push([0, -0.004, 0]);
  const tip = pts.length; pts.push([0, LONG + 0.006, 0]);
  for (let j = 0; j < M; j++) { tris.push(base, j, (j + 1) % M); tris.push(tip, (RINGS - 1) * M + ((j + 1) % M), (RINGS - 1) * M + j); }
  return { pos: Float32Array.from(pts.flat()), tris };
}

const LINES: V3[][] = [[[-APART, 0, 0], [-APART, 0.04, 0], [-APART, 0.07, 0], [-APART, 0.085, 0]], [[APART, 0, 0], [APART, 0.04, 0], [APART, 0.07, 0], [APART, 0.085, 0]]];

describe('her fingers cut apart (fingerSplit)', () => {
  it('past the webbing no triangle joins two fingers, every hole is closed, and her surface is still whole', () => {
    const { pos, tris } = mitten(), s = splitFingers(pos, tris, LINES);
    expect(s.cut).toBeGreaterThan(0);
    expect(s.filled).toBeGreaterThan(0);
    expect(s.open).toBe(0);
    // (every point plainly one finger's is that finger's)
    for (let i = 0; i < pos.length / 3; i++) {
      const x = pos[i * 3];
      if (x < -0.002) expect(s.owner[i], `point ${i}`).toBe(0);
      if (x > 0.002) expect(s.owner[i], `point ${i}`).toBe(1);
    }
    // (no triangle of hers past the webbing has corners on both fingers -- the closing ones at the foot of the cut aside)
    const kept = s.tris.length / 3 - s.filled;
    for (let t = 0; t < kept; t++) {
      const v = [s.tris[t * 3], s.tris[t * 3 + 1], s.tris[t * 3 + 2]];
      if (Math.min(...v.map((i) => s.past[i])) > FINGER_SPLIT.web + 0.002 && v.every((i) => s.owner[i] >= 0)) expect(new Set(v.map((i) => s.owner[i])).size).toBe(1);
    }
    // (closed: each edge once each way round)
    const edges = new Map<string, number>();
    for (let t = 0; t < s.tris.length / 3; t++) for (let k = 0; k < 3; k++) { const a = s.tris[t * 3 + k], b = s.tris[t * 3 + (k + 1) % 3], key = `${a}>${b}`; edges.set(key, (edges.get(key) ?? 0) + 1); }
    for (const [key, n] of edges) { expect(n, key).toBe(1); const [a, b] = key.split('>'); expect(edges.get(`${b}>${a}`), `${key} has its other side`).toBe(1); }
  });

  it('a hand whose fingers are already apart is left as it is', () => {
    const { pos, tris } = mitten();
    // (only the left finger's line: nothing is two fingers')
    const s = splitFingers(pos, tris, [LINES[0], []]);
    expect(s.cut).toBe(0);
    expect(Array.from(s.tris)).toEqual(tris);
  });

  it('measures along a bent line', () => {
    const r = alongLine([0.003, 0.05, 0], [[0, 0, 0], [0, 0.04, 0], [0, 0.07, 0]]);
    expect(r.d).toBeCloseTo(0.003, 6);
    expect(r.s).toBeCloseTo(0.05, 6);
  });
});
