import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createBirthWeights } from '../src/sarahlab/birthWeights';

/**
 * SEATED, THE SIDE AND THE BACK OF HER HIPS KEEP HER OWN WEIGHTS (birthWeights.ts `SIT_KEEP`). A stand-in for her hips in
 * her rest frame (metres, +x her left, +z her front): her hip joints and knees found from skin they carry wholly, and four
 * points carried half by her pelvis and half by her left thigh -- the crease of her groin in front, the side of her hip,
 * her buttock, and the strip behind her vulva.
 */
function standIn() {
  const pts: [number, number, number, number[], number[]][] = [];
  const ring = (x: number, y: number, bone: number) => { for (const [dx, dz] of [[0.01, 0], [-0.01, 0], [0, 0.01], [0, -0.01]]) pts.push([x + dx, y, dz, [bone, 0, 0, 0], [1, 0, 0, 0]]); };
  ring(0.09, 0.92, 1); ring(-0.09, 0.92, 2); ring(0.09, 0.5, 3); ring(-0.09, 0.5, 4);
  const half = (x: number, y: number, z: number) => pts.push([x, y, z, [0, 1, 0, 0], [0.5, 0.5, 0, 0]]);
  const at = pts.length;
  half(0.07, 0.88, 0.08); // her groin's crease, in front
  half(0.16, 0.92, 0); // the side of her hip
  half(0.08, 0.85, -0.1); // her buttock
  half(0.01, 0.84, -0.04); // behind her vulva
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flatMap((p) => [p[0], p[1], p[2]])), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(pts.flatMap((p) => p[3]), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(pts.flatMap((p) => p[4])), 4));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  const bw = createBirthWeights(mesh, new THREE.Matrix4(), 0, 1, 2, 3, 4)!;
  const read = (i: number) => { const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), m = new Map<number, number>(); for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > 1e-6) m.set(si.getComponent(i, c), (m.get(si.getComponent(i, c)) ?? 0) + w); } return m; };
  return { bw, read, groin: at, side: at + 1, buttock: at + 2, strip: at + 3 };
}

describe('seated, the side and the back of her hips keep her own weights (SIT_KEEP)', () => {
  it('keeps all of her own weights at the side of her hip and on her buttock', () => {
    const k = standIn();
    expect(k.bw.keepOf(k.side)).toBeCloseTo(1, 6);
    expect(k.bw.keepOf(k.buttock)).toBeCloseTo(1, 6);
    k.bw.apply(1, 0, true);
    for (const i of [k.side, k.buttock]) { const m = k.read(i); expect(m.get(0)).toBeCloseTo(0.5, 5); expect(m.get(1)).toBeCloseTo(0.5, 5); }
  });
  it('leaves the leotard\'s weights in the crease of her groin and on the strip behind her vulva', () => {
    const k = standIn();
    expect(k.bw.keepOf(k.groin)).toBe(0);
    expect(k.bw.keepOf(k.strip)).toBe(0);
    k.bw.apply(1, 0, false);
    const leo = [k.read(k.groin), k.read(k.strip)];
    k.bw.apply(1, 0, true);
    [k.groin, k.strip].forEach((i, j) => { const m = k.read(i); for (const [b, w] of leo[j]) expect(m.get(b) ?? 0).toBeCloseTo(w, 6); });
    // (and the leotard does move them: the strip behind her vulva is her pelvis's, not her own half and half)
    expect(Math.abs((leo[1].get(1) ?? 0) - 0.5)).toBeGreaterThan(0.05);
  });
  it('without `keep` (SQUAT and RECLINE) every point is the leotard\'s, as before', () => {
    const k = standIn();
    k.bw.apply(1, 0, false);
    expect(Math.abs((k.read(k.buttock).get(1) ?? 0) - 0.5)).toBeGreaterThan(0.05);
  });
});
