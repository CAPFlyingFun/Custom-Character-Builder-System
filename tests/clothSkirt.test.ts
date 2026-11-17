/**
 * A SKIRT IN THE ROOM, ON A STAND-IN FOR HER (`clothSkirt.ts`): a trunk and two legs skinned to a skeleton laid out as
 * hers is (her pelvis, and a hip, a knee and an ankle a side, at her bones' own numbers), her legs standing a little
 * behind her hips as hers do, and each thigh's bone turned to make a stride.
 * - At FIT 1 the sheet drawn is the cloth, point for point, as it always was.
 * - At FIT 0 no cloth is made: the sheet is her places.
 * - BETWEEN HER AND THE CLOTH (Joshua, 2026-11-17: "…it fades somehow to cloth sim") the sheet is drawn part of the
 *   way from each point's place on her to its point of cloth, and as she strides NO POINT OF IT IS IN HER: her skin
 *   is walked under the sheet where it is drawn and a point found in her is put out through her skin
 *   (`ClothSkirt.outOfHer`). With that switched off (the probe's `floor`) the straight way cuts the corner through
 *   her thighs -- the fault it mends, MEASURED in the room on her own skin: 60 of 2,160 points, 17.7 mm.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ClothSkirt } from '../src/sarahlab/clothSkirt';
import { SARAH_V2_JOINTS } from '../src/sarahlab/garment/bodyInput';
import type { BodyInput } from '../src/sarahlab/garment/types';
import { clampSkirt, type SkirtSettings } from '../src/sarahlab/skirt/skirtDraft';

/** The stand-in, metres: her hips' oval (half across, half deep), her joints' heights, and her legs (where they stand, how thick). */
const TRUNK = { a: 0.17, b: 0.13, top: 1.45 }, HIP = 0.85, KNEE = 0.47, ANKLE = 0.08, LEG = { x: 0.085, z: -0.03 };
const legRadius = (y: number): number => (y >= KNEE ? 0.06 + (0.075 - 0.06) * ((y - KNEE) / (HIP - KNEE)) : 0.05 + (0.06 - 0.05) * ((y - ANKLE) / (KNEE - ANKLE)));

interface Figure { readonly root: THREE.Group; readonly mesh: THREE.SkinnedMesh; readonly input: BodyInput; readonly thigh: readonly [THREE.Bone, THREE.Bone] }

function figure(): Figure {
  const around = 48, step = 0.015, pos: number[] = [], tri: number[] = [], bone: number[] = [];
  /** A tube of rings from y0 up to y1: each ring `at(y, a)`; every triangle turned to face out of the tube's own middle. */
  const tube = (y0: number, y1: number, at: (y: number, a: number) => [number, number], mid: readonly [number, number], boneOf: (y: number) => number) => {
    const rings = Math.round((y1 - y0) / step) + 1, first = pos.length / 3;
    for (let r = 0; r < rings; r++) for (let k = 0; k < around; k++) { const y = y0 + ((y1 - y0) * r) / (rings - 1), [x, z] = at(y, (k / around) * Math.PI * 2); pos.push(x, y, z); bone.push(boneOf(y)); }
    for (let r = 0; r + 1 < rings; r++) for (let k = 0; k < around; k++) {
      const l = (k + 1) % around, p = first + r * around + k, q = first + r * around + l, u = p + around, v = q + around;
      for (const [i, j, m] of [[p, q, u], [q, v, u]] as const) {
        const ax = pos[i * 3], ay = pos[i * 3 + 1], az = pos[i * 3 + 2], ex = pos[j * 3] - ax, ey = pos[j * 3 + 1] - ay, ez = pos[j * 3 + 2] - az, fx = pos[m * 3] - ax, fy = pos[m * 3 + 1] - ay, fz = pos[m * 3 + 2] - az;
        const nx = ey * fz - ez * fy, nz = ex * fy - ey * fx;
        if (nx * (ax - mid[0]) + nz * (az - mid[1]) >= 0) tri.push(i, j, m); else tri.push(i, m, j);
      }
    }
  };
  const J = SARAH_V2_JOINTS;
  tube(HIP, TRUNK.top, (_, a) => [Math.sin(a) * TRUNK.a, Math.cos(a) * TRUNK.b], [0, 0], () => J.pelvis);
  for (const side of [0, 1] as const) { const x = side === 0 ? LEG.x : -LEG.x; tube(ANKLE, HIP, (y, a) => [x + Math.sin(a) * legRadius(y), LEG.z + Math.cos(a) * legRadius(y)], [x, LEG.z], (y) => (y >= KNEE ? J.hip[side] : J.knee[side])); }
  const n = pos.length / 3, g = new THREE.BufferGeometry(), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) { si[v * 4] = bone[v]; sw[v * 4] = 1; }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(tri);
  g.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial()), root = new THREE.Group();
  // her skeleton's sixty-eight bones, the ones a skirt asks about where hers are
  const bones = Array.from({ length: 68 }, () => new THREE.Bone());
  const thigh: THREE.Bone[] = [];
  for (let i = 0; i < bones.length; i++) root.add(bones[i]);
  bones[J.pelvis].position.set(0, 0.9, 0);
  for (const side of [0, 1] as const) {
    const hip = bones[J.hip[side]], knee = bones[J.knee[side]], ankle = bones[J.ankle[side]];
    hip.position.set(side === 0 ? LEG.x : -LEG.x, HIP, LEG.z);
    hip.add(knee); knee.position.set(0, KNEE - HIP, 0);
    knee.add(ankle); ankle.position.set(0, ANKLE - KNEE, 0);
    thigh.push(hip);
  }
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  const pair = (y: number) => [[LEG.x, y, LEG.z], [-LEG.x, y, LEG.z]] as const, at = (y: number): [number, number, number] => [0, y, 0];
  const input: BodyInput = {
    positions: Float32Array.from(pos), triangles: Uint32Array.from(tri), arm: new Float32Array(n),
    joints: { pelvis: at(0.9), chest: at(1.2), neck: at(TRUNK.top), head: at(1.55), shoulder: [[0.2, 1.4, 0], [-0.2, 1.4, 0]], elbow: [[0.25, 1.15, 0], [-0.25, 1.15, 0]], wrist: [[0.27, 0.9, 0], [-0.27, 0.9, 0]], hip: pair(HIP), knee: pair(KNEE), ankle: pair(ANKLE) } as unknown as BodyInput['joints'],
  };
  return { root, mesh, input, thigh: [thigh[0], thigh[1]] };
}

/**
 * How deep in one of her LEGS a point is, metres (0: not in one), her thighs' bones turned `swing` (radians: her +x leg
 * forward and her other back). Only under `JOINT` below her hip joints, as each leg has it: where a tube of a thigh
 * is hinged into a tube of a trunk the stand-in passes through itself as it turns, and has no skin to speak of.
 */
const JOINT = 0.06;
function inHer(x: number, y: number, z: number, swing: number): number {
  let deep = 0;
  for (const side of [0, 1] as const) {
    // (into the leg's own rest frame: turned back about its hip joint's own side-to-side line)
    const t = side === 0 ? -swing : swing, c = Math.cos(-t), s = Math.sin(-t), dy = y - HIP, dz = z - LEG.z;
    const ry = HIP + dy * c - dz * s, rz = LEG.z + dy * s + dz * c;
    if (ry < ANKLE || ry > HIP - JOINT) continue;
    const d = legRadius(ry) - Math.hypot(x - (side === 0 ? LEG.x : -LEG.x), rz - LEG.z);
    if (d > deep) deep = d;
  }
  return deep;
}

const skirtOn = (f: Figure, over: Partial<SkirtSettings>): ClothSkirt => new ClothSkirt({ body: f.mesh, input: f.input, settings: clampSkirt({ top: 'under', length: 0.5, flare: 0, tucked: false, ...over }), material: new THREE.MeshStandardMaterial(), unitsPerMetre: 1, scale: 1, offset: [0, 0, 0] });
/** She strides: her thighs' bones turned a little more each frame up to `swing`, then held; the deepest any drawn point is in her over the last `held` frames, and how many are deeper than half a millimetre at the last. */
function stride(f: Figure, skirt: ClothSkirt, swing: number, frames = 40, held = 10): { deepest: number; count: number } {
  let deepest = 0, count = 0;
  for (let k = 0; k < frames + held; k++) {
    const a = swing * Math.min(1, (k + 1) / frames);
    f.thigh[0].rotation.x = -a; f.thigh[1].rotation.x = a;
    f.root.updateMatrixWorld(true);
    skirt.frame(1 / 60);
    if (k < frames) continue;
    const x = skirt.shown!, cols = skirt.draft.columns;
    count = 0;
    for (let p = cols; p < skirt.draft.count; p++) { const d = inHer(x[p * 3], x[p * 3 + 1], x[p * 3 + 2], a); if (d > deepest) deepest = d; if (d > 0.0005) count++; }
  }
  return { deepest, count };
}

describe('a skirt worn on a stand-in for her', () => {
  it('the stand-in is what the tests take it for: its skin turns with its thigh, and a point is in a leg or is not', () => {
    const f = figure(), swing = 0.4;
    f.thigh[0].rotation.x = -swing; f.thigh[1].rotation.x = swing; f.root.updateMatrixWorld(true);
    const v = new THREE.Vector3(), P = f.input.positions;
    let read = 0;
    for (let i = 0; i < P.length / 3; i += 5) {
      // a vertex of a leg's skin, well under its top: ON the leg as posed -- a millimetre in, in her; a millimetre out, not
      if (P[i * 3 + 1] > HIP - JOINT - 0.02 || P[i * 3 + 1] < ANKLE + 0.02) continue;
      f.mesh.getVertexPosition(i, v).applyMatrix4(f.mesh.matrixWorld);
      const side = P[i * 3] > 0 ? 0 : 1, t = side === 0 ? -swing : swing, ax = side === 0 ? LEG.x : -LEG.x;
      // (the leg's own line as posed: from its hip joint, turned)
      const down = HIP - P[i * 3 + 1], cy = HIP - down * Math.cos(t), cz = LEG.z - down * Math.sin(t), out = new THREE.Vector3(v.x - ax, v.y - cy, v.z - cz).normalize();
      expect(inHer(v.x - out.x * 0.001, v.y - out.y * 0.001, v.z - out.z * 0.001, swing), `vertex ${i}`).toBeGreaterThan(0.0005);
      expect(inHer(v.x + out.x * 0.001, v.y + out.y * 0.001, v.z + out.z * 0.001, swing), `vertex ${i}`).toBe(0);
      read++;
    }
    expect(read).toBeGreaterThan(500);
    expect(inHer(0.3, 0.6, 0, swing)).toBe(0);
  });

  it('at FIT 1 the sheet drawn is the cloth, point for point, and nothing of it is put anywhere', () => {
    const f = figure(), skirt = skirtOn(f, {});
    stride(f, skirt, 0.45, 20, 5);
    const n = skirt.draft.count;
    expect(skirt.draft.hug).toBeNull();
    expect(skirt.positions!.length).toBe(n * 3);
    expect(Array.from(skirt.shown!)).toEqual(Array.from(skirt.positions!.subarray(0, n * 3)));
    expect(skirt.stats().skinPut).toBe(0);
  });

  it('at FIT 0 no cloth is made: the sheet is her places, on her as she strides', () => {
    const f = figure(), skirt = skirtOn(f, { fit: 0 }), n = skirt.draft.count;
    const s = stride(f, skirt, 0.45);
    expect(skirt.positions!.length).toBe(n * 3);
    expect(Array.from(skirt.shown!)).toEqual(Array.from(skirt.positions!));
    expect(s.deepest).toBeLessThan(0.001);
    // ...and near her: no point of it further than a hand off her legs' own lines (a place over the gap between them is between them)
    const x = skirt.shown!;
    for (let p = skirt.draft.columns; p < n; p++) expect(Math.abs(x[p * 3]), `point ${p}`).toBeLessThan(0.2);
  });

  it('between her and the cloth no point of the sheet is in her as she strides; with her skin not its floor, the straight way goes through her', () => {
    for (const fit of [0.25, 0.5, 0.75]) {
      const f = figure(), skirt = skirtOn(f, { fit }), n = skirt.draft.count;
      const s = stride(f, skirt, 0.45);
      // the cloth's points and her places are both the cloth's own particles; the sheet is neither, and is between them
      expect(skirt.positions!.length).toBe(n * 6);
expect(s.deepest, `FIT ${fit}`).toBeLessThan(0.001);
      expect(skirt.stats().jumps).toBe(0);
      const X = skirt.positions!, x = skirt.shown!;
      let between = 0, read = 0;
      for (let p = skirt.draft.columns; p < n; p += 3) {
        const ex = X[p * 3] - X[(n + p) * 3], ey = X[p * 3 + 1] - X[(n + p) * 3 + 1], ez = X[p * 3 + 2] - X[(n + p) * 3 + 2], l2 = ex * ex + ey * ey + ez * ez;
        if (l2 < 1e-6) continue;
        const u = ((x[p * 3] - X[(n + p) * 3]) * ex + (x[p * 3 + 1] - X[(n + p) * 3 + 1]) * ey + (x[p * 3 + 2] - X[(n + p) * 3 + 2]) * ez) / l2;
        read++; if (Math.abs(u - fit) < 0.2) between++;
      }
      // (most of it is that share of the way; what was put out of her is where her skin has it)
      expect(read).toBeGreaterThan(200); expect(between / read, `FIT ${fit}`).toBeGreaterThan(0.6);
    }
    const f = figure(), bare = skirtOn(f, { fit: 0.5 });
    bare.probe.floor = false;
    const s = stride(f, bare, 0.45);
expect(s.deepest).toBeGreaterThan(0.003); expect(s.count).toBeGreaterThan(5);
  });
});
