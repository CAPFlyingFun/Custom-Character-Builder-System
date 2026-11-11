import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createBirthNormals } from '../src/sarahlab/birthNormals';

/**
 * A SHEET OF SKIN UNDER HER, FACING DOWN (rest metres: +y up, +z her front), on one bone: a grid 40 cm square at the
 * height of her crotch, a column of its points down her middle (the band's middle is found from them). `spare` more
 * points stand within the band and belong to NO triangle -- as her fingers' joins' points do where her fingers are cut
 * apart (actor/fingerSplit.ts), her right hand hanging within the band's reach at rest.
 */
function sheet(spare: number): { mesh: THREE.SkinnedMesh; indices: Uint32Array; pos: Float32Array; nrm: Float32Array; grid: number } {
  const N = 21, step = 0.02, pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { pos.push((i - 10) * step, 0.8 + 0.02 * Math.cos((i - 10) * 0.3), (j - 10) * step); nrm.push(0, -1, 0); }
  // (wound so that each triangle's own face is DOWN, as her skin's is out)
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx.push(a, b, c, b, d, c); }
  for (let k = 0; k < spare; k++) { pos.push(-0.29 + 0.001 * k, 0.79, 0.0); nrm.push(-1, 0, 0); }
  const g = new THREE.BufferGeometry(), n = pos.length / 3;
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(nrm), 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from({ length: n * 4 }, (_, q) => (q % 4 === 0 ? 1 : 0)), 4));
  g.setIndex(idx);
  const root = new THREE.Group(), bone = new THREE.Bone(), mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  root.add(bone, mesh); root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([bone]));
  return { mesh, indices: Uint32Array.from(idx), pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), grid: N * N };
}

describe('her groin lit as it is bent (birthNormals.ts)', () => {
  it('lays its normals facing OUT of her: her triangles\' side that her own normals are on', () => {
    const s = sheet(0), b = createBirthNormals(s.mesh, new THREE.Matrix4(), s.indices)!;
    expect(b).not.toBeNull();
    const f = b.compute(s.pos, s.nrm);
    expect(f.index.length).toBeGreaterThan(100);
    expect(b.facing.lastSide * Math.sign(b.facing.last)).toBe(1);
    // each watched point's normal as she is drawn with the field: still down, never up into her
    for (let k = 0; k < f.index.length; k++) { const i = f.index[k]; expect(s.nrm[i * 3 + 1] + f.nrm[k * 3 + 1], `point ${i}`).toBeLessThan(-0.5); }
  });

  it('is not turned inside out by points no triangle has (her fingers\' joins, cut apart): they are not watched', () => {
    const bare = sheet(0), s = sheet(30);
    const a = createBirthNormals(bare.mesh, new THREE.Matrix4(), bare.indices)!, b = createBirthNormals(s.mesh, new THREE.Matrix4(), s.indices)!;
    // (the spare points stand in the band -- they would be watched -- and are left out)
    expect(b.watched).toBe(a.watched);
    const f = b.compute(s.pos, s.nrm);
    expect(Number.isFinite(b.facing.first)).toBe(true);
    expect(Number.isFinite(b.facing.last)).toBe(true);
    expect(b.facing.lastSide * Math.sign(b.facing.last)).toBe(1);
    for (let k = 0; k < f.index.length; k++) {
      const i = f.index[k];
      expect(i, 'a point with no triangle is given no normal').toBeLessThan(s.grid);
      for (let c = 0; c < 3; c++) expect(Number.isFinite(f.nrm[k * 3 + c]) && Number.isFinite(f.pos[k * 3 + c])).toBe(true);
      expect(s.nrm[i * 3 + 1] + f.nrm[k * 3 + 1], `point ${i}`).toBeLessThan(-0.5);
    }
  });
});
