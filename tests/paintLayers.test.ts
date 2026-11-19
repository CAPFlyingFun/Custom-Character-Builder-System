import { describe, expect, it } from 'vitest';
import { PAINT_LAYER_COUNT, PAINT_PACKED, packPaint, paintAt } from '../src/sarahlab/bodyPaint';

// Joshua, 2026-11-19: "we have a 3 layers, and can we actually raise that amount up to 6 layers?"
describe('six paint layers, two to a number', () => {
  it('are six, in the three numbers a vertex her skin had room for', () => {
    expect(PAINT_LAYER_COUNT).toBe(6);
    expect(PAINT_PACKED).toBe(3);
  });
  it('each layer comes back as it went in, to a 255th, whatever the others are', () => {
    const n = 50, w = new Float32Array(n * 6), out = new Float32Array(n * 3);
    for (let i = 0; i < w.length; i++) w[i] = ((i * 37) % 101) / 100;
    packPaint(w, out);
    for (let v = 0; v < n; v++) for (let l = 0; l < 6; l++) expect(Math.abs(paintAt(out, v, l) - w[v * 6 + l])).toBeLessThanOrEqual(0.5 / 255 + 1e-6);
  });
  it('is a whole number a float holds exactly, and the first three layers alone read as they always did in 255ths', () => {
    const w = new Float32Array([1, 1, 1, 1, 1, 1, 0.5, 0, 0, 0, 0, 0]), out = new Float32Array(6);
    packPaint(w, out);
    expect(out[0]).toBe(255 + 256 * 255);
    expect(Number.isInteger(out[0])).toBe(true);
    expect(out[3]).toBe(128);
  });
});
