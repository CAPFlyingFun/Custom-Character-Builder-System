/**
 * THE SHIRT DRAWN FINELY ROUND HER NAVEL (navelPatch.ts; Joshua, 2026-11-06: "All shirts follow the exact side profile of
 * the bellybutton but just scaled slightly bigger for offsets"). The cloth's triangles over her navel cut into FINE × FINE
 * smaller ones: points on a shared edge are one point (no seams), the cloth's winding kept, every attribute carried as
 * its triangle has it, and each point raised along her navel's axis by what it is given -- nothing given, the cloth's own
 * flat triangles exactly.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { NavelPatch } from '../src/sarahlab/garment/navelPatch';

/** Two triangles sharing the edge 1-2 in the plane z = 0, with a uv each corner and normals +z. */
function source(): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from([0, 0, 1, 0, 0, 1, 1, 1]), 2));
  g.setIndex([0, 1, 2, 1, 3, 2]);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial());
}
const F = 6, corner = (F + 1) * (F + 2) / 2;
const posOf = (p: NavelPatch) => p.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;

describe('NavelPatch', () => {
  it('cuts each triangle F × F; points on the shared edge are one point, so the fine cloth has no seam', () => {
    const src = source(), p = new NavelPatch(src, F);
    p.setTriangles([0, 1, 2, 1, 3, 2]);
    expect(posOf(p).count).toBe(2 * corner - (F + 1));
    expect(p.mesh.geometry.index!.count / 3).toBe(2 * F * F);
    expect(p.mesh.visible).toBe(true);
    expect(p.mesh.material).toBe(src.material);
    p.setTriangles([]);
    expect(p.mesh.visible).toBe(false);
  });

  it('nothing raised: every point on the cloth\'s own flat triangle, every attribute as its triangle has it, facing as it faced', () => {
    const src = source(), p = new NavelPatch(src, F);
    p.setTriangles([0, 1, 2, 1, 3, 2]);
    p.update(() => 0, [0, 0, 1]);
    const P = posOf(p), uv = p.mesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < P.count; i++) {
      expect(P.getZ(i)).toBe(0);
      // (the source's uv is its position here)
      expect(uv.getX(i)).toBeCloseTo(P.getX(i), 6); expect(uv.getY(i)).toBeCloseTo(P.getY(i), 6);
    }
    // the winding kept: every fine triangle faces +z, as the source's do
    const I = p.mesh.geometry.index!, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < I.count; t += 3) {
      a.fromBufferAttribute(P, I.getX(t)); b.fromBufferAttribute(P, I.getX(t + 1)); c.fromBufferAttribute(P, I.getX(t + 2));
      expect(b.sub(a).cross(c.sub(a)).z).toBeGreaterThan(0);
    }
  });

  it('carries a model file\'s packed attributes as their values: normalized, interleaved (the spandex tee\'s knit)', () => {
    const src = source(), g = src.geometry;
    // its uv packed as normalized 16-bit numbers, and a pattern place interleaved with something else
    g.setAttribute('uv', new THREE.BufferAttribute(Uint16Array.from([0, 0, 65535, 0, 0, 65535, 65535, 65535]), 2, true));
    const inter = new THREE.InterleavedBuffer(Float32Array.from([0, 0, 0, 9, 2, 0, 0, 9, 0, 2, 0, 9, 2, 2, 0, 9]), 4);
    g.setAttribute('fabricRest', new THREE.InterleavedBufferAttribute(inter, 3, 0));
    const p = new NavelPatch(src, F);
    p.setTriangles([0, 1, 2, 1, 3, 2]);
    p.update(() => 0, [0, 0, 1]);
    const P = posOf(p), uv = p.mesh.geometry.getAttribute('uv') as THREE.BufferAttribute, rest = p.mesh.geometry.getAttribute('fabricRest') as THREE.BufferAttribute;
    for (let i = 0; i < P.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(P.getX(i), 4); expect(uv.getY(i)).toBeCloseTo(P.getY(i), 4);
      expect(rest.getX(i)).toBeCloseTo(2 * P.getX(i), 6); expect(rest.getY(i)).toBeCloseTo(2 * P.getY(i), 6);
    }
  });

  it('raises each point along the axis by what it is given, and only that', () => {
    const p = new NavelPatch(source(), F);
    p.setTriangles([0, 1, 2, 1, 3, 2]);
    const bump = (x: number, y: number) => Math.max(0, 0.2 - Math.hypot(x - 0.5, y - 0.5) * 0.4);
    p.update((x, y) => bump(x, y), [0, 0, 1]);
    const P = posOf(p);
    for (let i = 0; i < P.count; i++) expect(P.getZ(i)).toBeCloseTo(bump(P.getX(i), P.getY(i)), 6);
    // laid out again only when its triangles change: the same ones keep the same points
    const before = P.count;
    p.setTriangles([0, 1, 2, 1, 3, 2]);
    expect(posOf(p).count).toBe(before);
    p.setTriangles([0, 1, 2]);
    expect(posOf(p).count).toBe(corner);
  });
});
