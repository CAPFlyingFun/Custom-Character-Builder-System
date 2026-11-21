import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SIT_BELLY, createSitBelly, rigidFit } from '../src/sarahlab/sitBelly';

/**
 * SEATED, HER BUMP KEEPS ITS STANDING SHAPE, CARRIED AS ONE PIECE (sitBelly.ts). A stand-in for her: a pelvis that tips
 * back 12 degrees as she sits, a spine above it that turns back upright, and a thigh drawn up 84 degrees. Her bump's top
 * is her spine's; its lower part her own weights give partly to her thigh, the leotard's (the weights she wears seated)
 * wholly to her pelvis. One point lies outside her bump's footprint.
 */
function standIn() {
  const pelvis = new THREE.Bone(), spine = new THREE.Bone(), thigh = new THREE.Bone();
  spine.position.set(0, 0.15, 0); thigh.position.set(0.1, -0.05, 0);
  pelvis.add(spine); pelvis.add(thigh);
  // her bump (x across, y up, z her front; metres): a ring of points round its top, more down its lower part
  const pts: [number, number, number, 'top' | 'low' | 'off'][] = [];
  for (let a = 0; a < 8; a++) pts.push([0.08 * Math.cos((a * Math.PI) / 4), 0.3 + 0.02 * Math.sin((a * Math.PI) / 4), 0.22, 'top']);
  for (let a = 0; a < 8; a++) pts.push([0.1 * Math.cos((a * Math.PI) / 4), 0.08 + 0.03 * Math.sin((a * Math.PI) / 4), 0.25, 'low']);
  pts.push([0, 0.02, 0.24, 'low']);
  pts.push([0.15, -0.1, 0.05, 'off']);
  const n = pts.length, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const ownIndex = new Uint16Array(n * 4), ownWeight = new Float32Array(n * 4), to = new Float32Array(n * 3), from = new Float32Array(n * 3);
  pts.forEach(([x, y, z, kind], i) => {
    pos.set([x, y, z], i * 3); nrm.set([0, 0, 1], i * 3);
    if (kind === 'top') { si.set([1, 0, 0, 0], i * 4); sw.set([1, 0, 0, 0], i * 4); ownIndex.set([1, 0, 0, 0], i * 4); ownWeight.set([1, 0, 0, 0], i * 4); }
    else { si.set([0, 2, 0, 0], i * 4); sw.set([1, 0, 0, 0], i * 4); ownIndex.set([0, 2, 0, 0], i * 4); ownWeight.set([0.6, 0.4, 0, 0], i * 4); }
    // her 200% bump moves her bump's points 20 cm from her 0% belly, the point outside it none
    if (kind !== 'off') to.set([0, 0, 0.1], i * 3), from.set([0, 0, -0.1], i * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.morphAttributes.position = [new THREE.BufferAttribute(to, 3), new THREE.BufferAttribute(from, 3)];
  g.morphTargetsRelative = true;
  g.setIndex([]);
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  mesh.morphTargetDictionary = { belly200: 0, belly: 1 };
  mesh.morphTargetInfluences = [0, 0];
  mesh.add(pelvis);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([pelvis, spine, thigh]));
  const sit = createSitBelly(mesh, 1, { to: 'belly200', from: 'belly' }, [2]);
  // standing: her bones at rest
  mesh.updateMatrixWorld(true);
  sit.holdStanding();
  // seated: her pelvis tipped back, her spine back upright, her thigh drawn up; and set down 40 cm
  pelvis.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (-12 * Math.PI) / 180);
  spine.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (12 * Math.PI) / 180);
  thigh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (-84 * Math.PI) / 180);
  pelvis.position.y = -0.4;
  mesh.updateMatrixWorld(true);
  mesh.skeleton.update();
  const standing = pts.map((_, i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  const drawn = (f: { index: Uint32Array; pos: Float32Array }) => pts.map((_, i) => {
    const k = Array.from(f.index).indexOf(i), v = standing[i].clone();
    if (k >= 0) v.add(new THREE.Vector3(f.pos[k * 3], f.pos[k * 3 + 1], f.pos[k * 3 + 2]));
    const M = new THREE.Matrix4(), el = M.elements; el.fill(0);
    for (let c = 0; c < 4; c++) { const w = sw[i * 4 + c]; if (!w) continue; const B = new THREE.Matrix4().multiplyMatrices(mesh.bindMatrixInverse, new THREE.Matrix4().multiplyMatrices(mesh.skeleton.bones[si[i * 4 + c]].matrixWorld, mesh.skeleton.boneInverses[si[i * 4 + c]])).multiply(mesh.bindMatrix); for (let e = 0; e < 16; e++) el[e] += w * B.elements[e]; }
    return v.applyMatrix4(M);
  });
  return { sit, pos, nrm, own: { index: ownIndex, weight: ownWeight }, pts, standing, drawn };
}

describe('her bump seated, as she stands and carried as one piece (sitBelly.ts)', () => {
  it('the turn and carry that best take points onto others (Horn)', () => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.5, 0.2)), t = new THREE.Vector3(0.1, -0.4, 0.25);
    const A: number[] = [], B: number[] = [], W: number[] = [];
    for (let i = 0; i < 12; i++) { const a = new THREE.Vector3(Math.sin(i * 1.7), Math.cos(i * 2.3), Math.sin(i * 0.9) * 0.5); A.push(a.x, a.y, a.z); const b = a.clone().applyQuaternion(q).add(t); B.push(b.x, b.y, b.z); W.push(1 + (i % 3)); }
    const fit = rigidFit(A, B, W);
    expect(fit.q.angleTo(q)).toBeLessThan(1e-6);
    expect(fit.t.distanceTo(t)).toBeLessThan(1e-6);
  });
  const sag = SIT_BELLY.sag;
  it('with no sag, its shape is its standing shape: every two of its points as far apart as standing', () => {
    SIT_BELLY.sag = 0;
    const { sit, pos, nrm, own, pts, standing, drawn } = standIn();
    const f = sit.compute(pos, nrm, own, 2);
    SIT_BELLY.sag = sag;
    expect(sit.stats.anchors).toBe(8);
    const now = drawn(f);
    for (let a = 0; a < pts.length - 1; a++) for (let b = a + 1; b < pts.length - 1; b++) expect(Math.abs(now[a].distanceTo(now[b]) - standing[a].distanceTo(standing[b]))).toBeLessThan(1e-5);
  });
  it('outside its footprint nothing is moved', () => {
    const { sit, pos, nrm, own, pts } = standIn();
    const f = sit.compute(pos, nrm, own, 2);
    expect(sit.footprint[pts.length - 1]).toBe(0);
    expect(Array.from(f.index)).not.toContain(pts.length - 1);
  });
  it('let down under its middle by SIT_BELLY.sag at 200%, half that at 100%, nothing at its top', () => {
    const at = (bump: number, s: number) => { SIT_BELLY.sag = s; const k = standIn(); const out = k.drawn(k.sit.compute(k.pos, k.nrm, k.own, bump)); SIT_BELLY.sag = sag; return out; };
    const none = at(2, 0), full = at(2, 0.02), half = at(1, 0.02);
    const lowest = 16; // her bump's lowest point, under its middle
    expect(none[lowest].y - full[lowest].y).toBeCloseTo(0.02, 4);
    expect(none[lowest].y - half[lowest].y).toBeCloseTo(0.01, 4);
    expect(Math.abs(none[0].y - full[0].y)).toBeLessThan(1e-6);
  });
  it('none of it at 0% (her flat belly is the leotard\'s, as v0.9.66 had it), all of it from SIT_BELLY.grow', () => {
    const k = standIn();
    expect(k.sit.compute(k.pos, k.nrm, k.own, 0).index.length).toBe(0);
    expect(Math.max(...k.sit.footprint)).toBe(0);
    k.sit.compute(k.pos, k.nrm, k.own, SIT_BELLY.grow);
    expect(Math.max(...k.sit.footprint)).toBeCloseTo(1, 6);
  });
  it('another seated field is kept off her bump by `under`, whole outside it', () => {
    const { sit, pos, nrm, own, pts } = standIn();
    sit.compute(pos, nrm, own, 2);
    const field = { index: Uint32Array.from([0, pts.length - 1]), pos: new Float32Array([1, 1, 1, 1, 1, 1]), nrm: new Float32Array([1, 0, 0, 1, 0, 0]) };
    sit.under(field);
    expect(field.pos[0]).toBe(0);
    expect(field.pos[3]).toBe(1);
  });
});
