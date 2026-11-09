import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { depthsInSkin, skinGrid } from '../src/actor/insideSkin';

describe('inside her skin', () => {
  const g0 = new THREE.SphereGeometry(1, 48, 32), pos = g0.getAttribute('position').array as Float32Array, tri = g0.index!.array;
  const grid = skinGrid(new Float32Array(pos), tri, 0.1);
  it('reads depth inside a closed skin positive and outside negative', () => {
    const d = depthsInSkin(grid, new Float32Array([0, 0, 0, 0.5, 0, 0, 0, 0.95, 0, 1.1, 0, 0, 0, 0, -1.3]), 0.6);
    expect(d[0]).toBeCloseTo(0.6, 3); // (farther than reach)
    expect(d[1]).toBeGreaterThan(0.45); expect(d[1]).toBeLessThan(0.51);
    expect(d[2]).toBeGreaterThan(0.03); expect(d[2]).toBeLessThan(0.06);
    expect(d[3]).toBeLessThan(-0.08); expect(d[3]).toBeGreaterThan(-0.11);
    expect(d[4]).toBeLessThan(-0.28);
  });
  it('still calls a point inside with a hole in the skin', () => {
    // (a cap of triangles near +x removed: the ray that way escapes, the other five do not)
    const keep: number[] = [];
    for (let t = 0; t < tri.length; t += 3) { const a = tri[t] * 3; if (!(pos[a] > 0.97)) keep.push(tri[t], tri[t + 1], tri[t + 2]); }
    const d = depthsInSkin(skinGrid(new Float32Array(pos), keep, 0.1), new Float32Array([0.3, 0, 0]), 0.9);
    expect(d[0]).toBeGreaterThan(0);
  });
});
