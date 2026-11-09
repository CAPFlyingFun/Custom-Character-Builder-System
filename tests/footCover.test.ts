import { describe, expect, it } from 'vitest';
import { footCover } from '../src/sarahlab/footCover';

describe('her bare feet over her foot bones', () => {
  // a flat patch of skin (y = 0, facing up) over a bone point 2 mm above it (through the skin)
  const skin: number[] = [], normal: number[] = [];
  for (let x = -0.05; x <= 0.0501; x += 0.005) for (let z = -0.05; z <= 0.0501; z += 0.005) { skin.push(x, 0, z); normal.push(0, 1, 0); }
  const n = skin.length / 3, region = Array.from({ length: n }, (_, i) => i);
  const c = footCover(Float32Array.from(skin), Float32Array.from(normal), region, Float32Array.from([0, 0.002, 0]));
  it('moves the skin over the bone out until the bone is the margin deep', () => {
    const k = c.index.findIndex((i) => Math.abs(skin[i * 3]) < 1e-6 && Math.abs(skin[i * 3 + 2]) < 1e-6);
    expect(c.delta[k * 3 + 1]).toBeCloseTo(0.006, 4);
  });
  it('leaves skin well away from it where it was, and moves only outward', () => {
    expect(c.index.every((i) => Math.hypot(skin[i * 3], skin[i * 3 + 2]) < 0.045)).toBe(true);
    for (let k = 0; k < c.index.length; k++) expect(c.delta[k * 3 + 1]).toBeGreaterThanOrEqual(0);
  });
});
