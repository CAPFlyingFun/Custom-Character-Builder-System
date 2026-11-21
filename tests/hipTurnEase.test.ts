import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HIP_TURN, createHipTurn } from '../src/sarahlab/hipTurn';

/**
 * SEATED, HER HIPS' TURN IS EASED IN BY HER THIGH'S SHARE OF A POINT (`compute`'s `ease`, the room's `SIT_HIP_EASE`):
 * turned from `HIP_TURN.least` of a thigh's share at once, a point well away from her hip joint was put millimetres off
 * its neighbour that is not turned -- a dashed hairline across her belly's flank seated (MEASURED in the room). A stand-in
 * for her: a pelvis, a thigh hanging from a hip joint and drawn up 84 degrees, and points in front of the joint carried
 * partly by each.
 */
function standIn(shares: number[]) {
  const pelvis = new THREE.Bone(), thigh = new THREE.Bone();
  thigh.position.set(0.1, 0, 0);
  pelvis.add(thigh);
  const n = shares.length, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  shares.forEach((s, i) => {
    pos.set([0.1, -0.05, 0.2], i * 3); nrm.set([0, 0, 1], i * 3);
    si.set([0, 1, 0, 0], i * 4); sw.set([1 - s, s, 0, 0], i * 4);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex([]);
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  mesh.add(pelvis);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([pelvis, thigh]));
  // her thigh drawn up 84 degrees, as she sits
  thigh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (-84 * Math.PI) / 180);
  mesh.updateMatrixWorld(true);
  const turn = createHipTurn(mesh, [1], [1], new THREE.Matrix4());
  const moved = (ease: number) => {
    const f = turn.compute(pos, nrm, true, 0, ease), out = new Float32Array(n);
    for (let k = 0; k < f.index.length; k++) out[f.index[k]] = Math.hypot(f.pos[k * 3], f.pos[k * 3 + 1], f.pos[k * 3 + 2]);
    return Array.from(out);
  };
  return { moved };
}

describe('her hips turned seated, eased in by her thigh\'s share (hipTurn.ts)', () => {
  const shares = [HIP_TURN.least - 0.001, HIP_TURN.least + 0.001, 0.05, 0.5, 1 - HIP_TURN.least - 0.001, 1 - HIP_TURN.least + 0.001];
  const { moved } = standIn(shares);
  it('as RECLINE has it (no ease) a point is moved millimetres the moment its thigh carries a fiftieth of it', () => {
    const m = moved(0);
    expect(m[0]).toBe(0);
    expect(m[1]).toBeGreaterThan(0.001);
  });
  it('eased, no step where its thigh begins or ends to carry it, and the middle as it was', () => {
    const m = moved(0.15), raw = moved(0);
    expect(Math.abs(m[1] - m[0])).toBeLessThan(1e-5);
    expect(m[2]).toBeLessThan(raw[2]);
    expect(Math.abs(m[5] - m[4])).toBeLessThan(1e-5);
    expect(m[3]).toBeCloseTo(raw[3], 9);
  });
});
