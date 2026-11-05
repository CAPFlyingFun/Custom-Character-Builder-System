/**
 * HER HEELS ARE HER FEET'S (`ankleWeights.ts`, Joshua 2026-11-04): below her ankle joint her shin's weight on a point is
 * handed to her foot -- none above the band's top, all below its bottom, eased between -- in a birth position, and her
 * own weights come back exactly out of one. Here, on a small leg: a shin bone, an ankle bone and a toe under it, points
 * up a column through the joint each carried half by the shin and half by the foot.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ANKLE_WEIGHTS, createAnkleWeights } from '../src/sarahlab/ankleWeights';

/** Heights (metres) of the points, against the ankle joint at 0.1 m: well above, in the band, well below. */
const HEIGHTS = [0.3, 0.16, 0.135, 0.11, 0.1, 0.09, 0.065, 0.04, 0.0];

function leg(opts: { normalizedWeights?: boolean } = {}): { mesh: THREE.SkinnedMesh; shin: number; ankle: number; toe: number } {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(HEIGHTS.flatMap((y) => [0, y, 0]), 3));
  // every point: half shin (0), half ankle (1); the last one a third on its toe (2) too
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(HEIGHTS.flatMap((_, i) => (i === HEIGHTS.length - 1 ? [0, 1, 2, 0] : [0, 1, 0, 0])), 4));
  const w = HEIGHTS.flatMap((_, i) => (i === HEIGHTS.length - 1 ? [0.4, 0.3, 0.3, 0] : [0.5, 0.5, 0, 0]));
  g.setAttribute('skinWeight', opts.normalizedWeights ? new THREE.Uint8BufferAttribute(w.map((x) => Math.round(x * 255)), 4, true) : new THREE.Float32BufferAttribute(w, 4));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  const shin = new THREE.Bone(), ankle = new THREE.Bone(), toe = new THREE.Bone();
  shin.position.set(0, 0.5, 0); ankle.position.set(0, -0.4, 0); toe.position.set(0, -0.05, 0.12);
  shin.add(ankle); ankle.add(toe); mesh.add(shin);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([shin, ankle, toe]));
  return { mesh, shin: 0, ankle: 1, toe: 2 };
}

/** Each point's share carried by its foot (ankle and toe), and by its shin. */
function shares(mesh: THREE.SkinnedMesh): { foot: number; shin: number }[] {
  const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight');
  return HEIGHTS.map((_, i) => {
    let foot = 0, shin = 0;
    for (let c = 0; c < 4; c++) { const b = si.getComponent(i, c), w = sw.getComponent(i, c); if (b === 0) shin += w; else foot += w; }
    return { foot, shin };
  });
}

describe('her heels kept with her feet (ankleWeights)', () => {
  it('below the band all of the point is her foot\'s, above it her own, between it eases', () => {
    const { mesh } = leg(), aw = createAnkleWeights(mesh, new THREE.Matrix4(), [[0, 1]])!;
    expect(aw).not.toBeNull();
    // (points the band touches: from its top down)
    expect(aw.touched).toBe(HEIGHTS.filter((y) => y - 0.1 < ANKLE_WEIGHTS.top).length);
    expect(aw.apply(1)).toBe(true);
    const s = shares(mesh);
    HEIGHTS.forEach((y, i) => {
      const h = y - 0.1;
      expect(s[i].foot + s[i].shin, `point ${i} sums to one`).toBeCloseTo(1, 5);
      if (h >= ANKLE_WEIGHTS.top) expect(s[i].foot, `point ${i} above: own`).toBeCloseTo(0.5, 5);
      else if (h <= ANKLE_WEIGHTS.bottom) expect(s[i].shin, `point ${i} below: none her shin's`).toBeCloseTo(0, 5);
      else expect(s[i].foot, `point ${i} in the band`).toBeGreaterThan(0.5);
    });
    // her foot's share only grows on the way down
    for (let i = 1; i < HEIGHTS.length; i++) expect(s[i].foot).toBeGreaterThanOrEqual(s[i - 1].foot - 1e-6);
    // the toe keeps what it carried (its own slot), the rest of the shin's going to the ankle
    const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight'), last = HEIGHTS.length - 1;
    let toe = 0; for (let c = 0; c < 4; c++) if (si.getComponent(last, c) === 2) toe += sw.getComponent(last, c);
    expect(toe).toBeCloseTo(0.3, 5);
  });

  it('out of a birth position her own weights come back exactly, and nothing is done twice', () => {
    for (const normalizedWeights of [false, true]) {
      const { mesh } = leg({ normalizedWeights }), sw = mesh.geometry.getAttribute('skinWeight'), si = mesh.geometry.getAttribute('skinIndex');
      const ownW = Array.from(sw.array as ArrayLike<number>), ownI = Array.from(si.array as ArrayLike<number>);
      const aw = createAnkleWeights(mesh, new THREE.Matrix4(), [[0, 1]])!;
      expect(aw.apply(0)).toBe(false);
      expect(aw.apply(1)).toBe(true);
      expect(aw.apply(1)).toBe(false);
      expect(Array.from(sw.array as ArrayLike<number>)).not.toEqual(ownW);
      expect(aw.apply(0)).toBe(true);
      expect(Array.from(sw.array as ArrayLike<number>)).toEqual(ownW);
      expect(Array.from(si.array as ArrayLike<number>)).toEqual(ownI);
    }
  });
});
