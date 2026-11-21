import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SIT_BELLY, createSitBelly } from '../src/sarahlab/sitBelly';

/**
 * SEATED, HER BUMP IS CARRIED AS HER OWN WEIGHTS CARRY IT (sitBelly.ts), over her under-belly line; under it as the
 * leotard's do. A stand-in for her: a pelvis, a thigh drawn up 84 degrees as she sits, and points her own weights give
 * the thigh a share of while the weights she wears now (the leotard's) give it none.
 */
function standIn(share: number, n: number) {
  const pelvis = new THREE.Bone(), thigh = new THREE.Bone();
  thigh.position.set(0.1, 0, 0);
  pelvis.add(thigh);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const ownIndex = new Uint16Array(n * 4), ownWeight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    pos.set([0.1, -0.05, 0.2], i * 3); nrm.set([0, 0, 1], i * 3);
    si.set([0, 1, 0, 0], i * 4); sw.set([1, 0, 0, 0], i * 4);
    ownIndex.set([0, 1, 0, 0], i * 4); ownWeight.set([1 - share, share, 0, 0], i * 4);
  }
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
  thigh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (-84 * Math.PI) / 180);
  mesh.updateMatrixWorld(true);
  mesh.skeleton.update();
  return { mesh, pos, nrm, own: { index: ownIndex, weight: ownWeight } };
}

describe('her bump seated, carried by her own weights over her under-belly line (sitBelly.ts)', () => {
  // three points: well over her line, half-way across its band, and under it
  const inside = [SIT_BELLY.whole - 0.01, (SIT_BELLY.whole + SIT_BELLY.none) / 2, SIT_BELLY.none + 0.01];
  const { mesh, pos, nrm, own } = standIn(0.4, inside.length);
  const sit = createSitBelly(mesh, 1);
  const f = sit.compute(pos, nrm, inside, own);
  const drawn = (i: number) => {
    const k = Array.from(f.index).indexOf(i), v = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    if (k >= 0) v.add(new THREE.Vector3(f.pos[k * 3], f.pos[k * 3 + 1], f.pos[k * 3 + 2]));
    const g = mesh.geometry, at = new THREE.BufferGeometry();
    at.setAttribute('position', new THREE.BufferAttribute(new Float32Array([v.x, v.y, v.z]), 3));
    at.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from({ length: 4 }, (_, c) => g.getAttribute('skinIndex').getComponent(i, c)), 4));
    at.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(Array.from({ length: 4 }, (_, c) => g.getAttribute('skinWeight').getComponent(i, c))), 4));
    const one = new THREE.SkinnedMesh(at, mesh.material as THREE.Material);
    one.bind(mesh.skeleton, mesh.bindMatrix);
    return one.getVertexPosition(0, new THREE.Vector3());
  };
  const ownPlace = (i: number) => {
    const at = new THREE.BufferGeometry();
    at.setAttribute('position', new THREE.BufferAttribute(new Float32Array([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]), 3));
    at.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(own.index.subarray(i * 4, i * 4 + 4)), 4));
    at.setAttribute('skinWeight', new THREE.BufferAttribute(own.weight.slice(i * 4, i * 4 + 4), 4));
    const one = new THREE.SkinnedMesh(at, mesh.material as THREE.Material);
    one.bind(mesh.skeleton, mesh.bindMatrix);
    return one.getVertexPosition(0, new THREE.Vector3());
  };
  // (the leotard's: her pelvis alone)
  const leoPlace = (i: number) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(new THREE.Matrix4().multiplyMatrices(mesh.bindMatrixInverse, new THREE.Matrix4().multiplyMatrices(mesh.skeleton.bones[0].matrixWorld, mesh.skeleton.boneInverses[0])).multiply(mesh.bindMatrix));

  it('over her line, drawn exactly where her own weights put it', () => {
    expect(drawn(0).distanceTo(ownPlace(0))).toBeLessThan(1e-6);
    expect(ownPlace(0).distanceTo(leoPlace(0))).toBeGreaterThan(0.01);
  });
  it('under it, the leotard\'s place, untouched', () => {
    expect(Array.from(f.index)).not.toContain(2);
    expect(drawn(2).distanceTo(leoPlace(2))).toBeLessThan(1e-6);
  });
  it('across its band, between the two', () => {
    const a = drawn(1).distanceTo(ownPlace(1)), b = drawn(1).distanceTo(leoPlace(1));
    expect(a).toBeGreaterThan(1e-4); expect(b).toBeGreaterThan(1e-4);
  });
  it('another seated field is kept off her bump by `under`, whole under her line', () => {
    const field = { index: Uint32Array.from([0, 1, 2]), pos: new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]), nrm: new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]) };
    sit.under(field);
    expect(field.pos[0]).toBe(0);
    expect(field.pos[3]).toBeGreaterThan(0); expect(field.pos[3]).toBeLessThan(1);
    expect(field.pos[6]).toBe(1);
  });
});
