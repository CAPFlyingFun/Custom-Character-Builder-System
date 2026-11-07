/**
 * THE TEE FROZEN ON HER (frozenCloth.ts; Joshua, 2026-11-07). A made-up body stands in for hers: a strip 2 m tall, its
 * lower half carried by one bone and its upper by another (a knee at 1 m), and a cloth a few centimetres in front of it.
 * Frozen, the cloth is drawn exactly where it was; her knee bent, it goes where her skin under it goes; kept and put
 * back, it is drawn as it was frozen.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FrozenCloth, nearestSkin, particleSkin, topBones } from '../src/sarahlab/garment/frozenCloth';

/** Rows of the strip: 1.25 cm apart, as the cloth's particles are about 1.2 cm. */
const ROWS = 161;

function body(): { mesh: THREE.SkinnedMesh; knee: THREE.Bone; root: THREE.Group } {
  const pos: number[] = [], si: number[] = [], sw: number[] = [], idx: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    const y = (2 * r) / (ROWS - 1), up = Math.min(1, Math.max(0, (y - 0.9) / 0.2));
    for (const x of [-0.1, 0.1]) { pos.push(x, y, 0); si.push(0, 1, 0, 0); sw.push(1 - up, up, 0, 0); }
    if (r > 0) { const a = (r - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  const hip = new THREE.Bone(), knee = new THREE.Bone();
  knee.position.y = 1; hip.add(knee);
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  const root = new THREE.Group();
  root.add(hip); root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([hip, knee]));
  return { mesh, knee, root };
}

/** The cloth: the strip 3 cm in front of her, one particle a vertex, each over her skin's own vertex there. */
function cloth(): { mesh: THREE.Mesh; particles: { position: Float32Array; corners: Int32Array; bary: Float32Array; edges: Uint32Array } } {
  const pos: number[] = [], corners: number[] = [], bary: number[] = [], edges: number[] = [], idx: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < 2; c++) { const v = r * 2 + c; pos.push(c ? 0.1 : -0.1, (2 * r) / (ROWS - 1), 0.03); corners.push(v, v, v); bary.push(1, 0, 0); }
    edges.push(r * 2, r * 2 + 1);
    if (r > 0) { const a = (r - 1) * 2; edges.push(a, a + 2, a + 1, a + 3); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((_, i) => (i % 3 === 0 ? [i / 3, 0] : [])), 2));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  return { mesh, particles: { position: Float32Array.from(pos), corners: Int32Array.from(corners), bary: Float32Array.from(bary), edges: Uint32Array.from(edges) } };
}

/** Each drawn point of a skinned mesh as three draws it, world. */
function drawn(m: THREE.SkinnedMesh): THREE.Vector3[] {
  m.skeleton.update();
  const out: THREE.Vector3[] = [], n = m.geometry.getAttribute('position').count;
  for (let v = 0; v < n; v++) out.push(m.getVertexPosition(v, new THREE.Vector3()).applyMatrix4(m.matrixWorld));
  return out;
}

describe('the frozen tee', () => {
  it('blends each point from her skin under it and smooths it over the cloth', () => {
    const skin = { index: [0, 0, 0, 0, 1, 0, 0, 0], weight: [1, 0, 0, 0, 1, 0, 0, 0], jiggle: [0.5, 0, 0, 0, 1, -3] };
    const p = { position: [0, 0, 0, 0, 1, 0], corners: [0, 0, 0, 1, 1, 1], bary: [1, 0, 0, 1, 0, 0], edges: [0, 1] };
    const none = particleSkin(skin, p, 0);
    expect([...none.blends[0]!]).toEqual([[0, 1]]);
    expect(Array.from(none.jiggle)).toEqual([0.5, 0, 0, 0, 1, 0]); // (a leg's packed channel, negative, left out)
    const once = particleSkin(skin, p, 1, 0.5);
    expect(once.blends[0]!.get(0)).toBeCloseTo(0.5); expect(once.blends[0]!.get(1)).toBeCloseTo(0.5);
    const index = new Uint16Array(4), weight = new Float32Array(4);
    topBones(new Map([[3, 1], [7, 3], [2, 0.5], [9, 0.25], [5, 0.25]]), index, weight, 0);
    expect(Array.from(index)).toEqual([7, 3, 2, 9]);
    expect(weight.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("finds her skin's nearest points as a search of all of them would, never one she cannot carry it by", () => {
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const skin = Float32Array.from({ length: 3000 }, () => rand() * 0.5), usable = Uint8Array.from({ length: 1000 }, (_, v) => (v % 7 === 0 ? 0 : 1));
    const cloth = Float32Array.from({ length: 150 }, () => rand() * 0.5);
    const { corners, bary } = nearestSkin(skin, usable, cloth, 4, 0.03, 0.003);
    for (let i = 0; i < 50; i++) {
      const d = (v: number) => (skin[v * 3] - cloth[i * 3]) ** 2 + (skin[v * 3 + 1] - cloth[i * 3 + 1]) ** 2 + (skin[v * 3 + 2] - cloth[i * 3 + 2]) ** 2;
      const all = Array.from({ length: 1000 }, (_, v) => v).filter((v) => usable[v]).sort((a, b) => d(a) - d(b)).slice(0, 4);
      expect(Array.from(corners.subarray(i * 4, i * 4 + 4))).toEqual(all);
      expect(bary.subarray(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
      // (the nearest carrying it most)
      expect(bary[i * 4]).toBeGreaterThanOrEqual(bary[i * 4 + 3]);
    }
  });

  it('is drawn exactly where the cloth was, and goes where her skin goes when she moves', () => {
    const b = body(), c = cloth();
    // (frozen with her knee already a little bent, the cloth laid over her that way)
    b.knee.rotation.z = 0.3; b.root.updateMatrixWorld(true);
    const her0 = drawn(b.mesh), P = c.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, N = c.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
    for (let v = 0; v < P.count; v++) { P.setXYZ(v, her0[v].x, her0[v].y, her0[v].z + 0.03); N.setXYZ(v, 0, 0, 1); c.particles.position.set([her0[v].x, her0[v].y, her0[v].z + 0.03], v * 3); }
    const f = FrozenCloth.freeze(b.mesh, [{ mesh: c.mesh, particleOf: Array.from({ length: P.count }, (_, v) => v) }], c.particles, new THREE.MeshBasicMaterial(), null);
    const at0 = drawn(f.meshes[0]);
    for (let v = 0; v < P.count; v++) expect(at0[v].distanceTo(new THREE.Vector3(P.getX(v), P.getY(v), P.getZ(v)))).toBeLessThan(1e-5);
    // her knee bent further: each point keeps its 3 cm off her, turned with her, wherever her skin is carried by one bone
    // (and the cloth's smoothing has not reached: FREEZE.passes of its rows)
    b.knee.rotation.z = 1.1; b.root.updateMatrixWorld(true);
    const her = drawn(b.mesh), at = drawn(f.meshes[0]), turn = new THREE.Vector3(0, 0, 0.03);
    for (let v = 0; v < P.count; v++) {
      const y = P.getY(v);
      if (y < 0.7 || y > 1.3) expect(at[v].distanceTo(her[v].clone().add(turn))).toBeLessThan(1e-4);
      // (and round her knee, where its smoothed bones are not quite her skin's, within a millimetre of its 3 cm off her)
      expect(Math.abs(at[v].distanceTo(her[v]) - 0.03)).toBeLessThan(0.001);
    }
    // its uv carried as it was
    expect(Array.from(f.meshes[0].geometry.getAttribute('uv').array)).toEqual(Array.from(c.mesh.geometry.getAttribute('uv').array));
  });

  it("carries her pose's shapes: exact as frozen with one on, and moved as her skin is moved when she has more of it on", () => {
    const b = body(), c = cloth(), g = b.mesh.geometry, n = g.getAttribute('position').count;
    // (a shape moving her upper half 10 cm to her side, put on halfway)
    g.morphAttributes.position = [Object.assign(new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => (i % 3 === 0 && g.getAttribute('position').getY(Math.floor(i / 3)) > 1.2 ? 0.1 : 0)), 3), { name: 'lean' })];
    g.morphTargetsRelative = true;
    b.mesh.updateMorphTargets(); b.mesh.morphTargetInfluences![0] = 0.5;
    const her0 = drawn(b.mesh), P = c.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let v = 0; v < P.count; v++) { P.setXYZ(v, her0[v].x, her0[v].y, her0[v].z + 0.03); c.particles.position.set([her0[v].x, her0[v].y, her0[v].z + 0.03], v * 3); }
    const f = FrozenCloth.freeze(b.mesh, [{ mesh: c.mesh, particleOf: Array.from({ length: P.count }, (_, v) => v) }], c.particles, new THREE.MeshBasicMaterial(), null, { morphs: ['lean', 'none such'] });
    expect(Object.keys(f.meshes[0].morphTargetDictionary ?? {})).toEqual(['lean']);
    f.follow(b.mesh);
    const at0 = drawn(f.meshes[0]);
    for (let v = 0; v < P.count; v++) expect(at0[v].distanceTo(new THREE.Vector3(P.getX(v), P.getY(v), P.getZ(v)))).toBeLessThan(1e-5);
    b.mesh.morphTargetInfluences![0] = 1; f.follow(b.mesh);
    const her = drawn(b.mesh), at = drawn(f.meshes[0]);
    for (let v = 0; v < P.count; v++) if (Math.abs(P.getY(v) - 1.2) > 0.05) expect(at[v].x - her[v].x).toBeCloseTo(0, 4);
    // and kept: put back with its shape
    const back = FrozenCloth.restore(body().mesh, structuredClone(f.save()), new THREE.MeshBasicMaterial())!;
    expect(Object.keys(back.meshes[0].morphTargetDictionary ?? {})).toEqual(['lean']);
  });

  it('freezes only what the cloth draws (a cut-away sleeve is not carried)', () => {
    const b = body(), c = cloth(), g = c.mesh.geometry, all = Array.from(g.getIndex()!.array);
    // (the cloth drawing only its lower half)
    g.setIndex(all.slice(0, all.length / 2));
    const f = FrozenCloth.freeze(b.mesh, [{ mesh: c.mesh, particleOf: Array.from({ length: ROWS * 2 }, (_, v) => v) }], c.particles, new THREE.MeshBasicMaterial(), null);
    const used = new Set(all.slice(0, all.length / 2));
    expect(f.meshes[0].geometry.getAttribute('position').count).toBe(used.size);
    expect(f.meshes[0].geometry.getIndex()!.count).toBe(all.length / 2);
    expect(Math.max(...Array.from(f.meshes[0].geometry.getIndex()!.array))).toBe(used.size - 1);
  });

  it('kept and put back, it is drawn as it was frozen (to a twentieth of a millimetre at this size)', () => {
    const b = body(), c = cloth();
    const f = FrozenCloth.freeze(b.mesh, [{ mesh: c.mesh, particleOf: Array.from({ length: ROWS * 2 }, (_, v) => v) }], c.particles, new THREE.MeshBasicMaterial(), null);
    const kept = structuredClone(f.save()); // (as the browser's database keeps it)
    f.dispose();
    expect(b.mesh.children.length).toBe(0);
    const back = FrozenCloth.restore(b.mesh, kept, new THREE.MeshBasicMaterial())!;
    expect(back).not.toBeNull();
    b.knee.rotation.z = 0.7; b.root.updateMatrixWorld(true);
    const a = drawn(back.meshes[0]);
    // the put-back tee, her knee bent, against the tee frozen straight and never kept, her knee bent alike
    const straight = body(), sc = cloth();
    const original = FrozenCloth.freeze(straight.mesh, [{ mesh: sc.mesh, particleOf: Array.from({ length: ROWS * 2 }, (_, v) => v) }], sc.particles, new THREE.MeshBasicMaterial(), null);
    straight.knee.rotation.z = 0.7; straight.root.updateMatrixWorld(true);
    const o = drawn(original.meshes[0]);
    for (let v = 0; v < o.length; v++) expect(a[v].distanceTo(o[v])).toBeLessThan(5e-5);
    expect(Array.from(back.meshes[0].geometry.getIndex()!.array)).toEqual(Array.from(c.mesh.geometry.getIndex()!.array));
    // (a freeze kept by v1, carried the old way, is not put back: the room freezes it again)
    expect(FrozenCloth.restore(body().mesh, { ...kept, v: 1 }, new THREE.MeshBasicMaterial())).toBeNull();
  });
});
