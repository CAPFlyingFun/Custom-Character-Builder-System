/**
 * HER BODY AS THE GARMENT GENERATOR READS IT (`types.ts`, BodyInput), taken from her loaded SkinnedMesh: her rest shape
 * in metres (her geometry carried by FACE_REST_SCALE/OFFSET), the share of each vertex her arm bones carry, and her
 * joints where her skeleton binds them.
 *
 * Which shape: her position attribute as it stands (her shape sliders write it on the CPU) plus the morph targets named
 * in `morphs` at the weights given -- the generator cuts for her design at 0% belly, so the room passes her 'belly'
 * target (her 0% shape) at 1. Her pose is never read: this is her at rest.
 */
import * as THREE from 'three';
import { FACE_REST_OFFSET, FACE_REST_SCALE } from '../faceRig';
import type { BodyInput, BodyJoints, Vec3 } from './types';

/** Her arm bones (skeleton indices): shoulder to fingertips, both sides (the cloth file's `armBones`). */
export const SARAH_V2_ARM_BONES: readonly number[] = Object.freeze([...Array.from({ length: 24 }, (_, i) => 9 + i), ...Array.from({ length: 24 }, (_, i) => 34 + i)]);
/** Her skeleton's joints by index ([her +x side, her -x side] for pairs): bone 34 binds at +x. */
export const SARAH_V2_JOINTS = Object.freeze({ pelvis: 1, chest: 4, neck: 5, head: 6, shoulder: [34, 9], elbow: [35, 10], wrist: [36, 11], hip: [63, 58], knee: [64, 59], ankle: [65, 60] } as const);

/**
 * A BODY AS THE GARMENT GENERATOR READS IT: its skeleton's joints by index ([its +x side, its -x side] for pairs), its
 * arm bones, and how its geometry's units are carried into its rest metres (rest = geometry * scale + offset). Hers is
 * `SARAH_V2_RIG`; the MALE BASE MODEL's is `rigOf` his skeleton (his bones are named one on from hers, and found by role).
 */
export interface GarmentRig {
  readonly joints: {
    readonly pelvis: number; readonly chest: number; readonly neck: number; readonly head: number;
    readonly shoulder: readonly [number, number]; readonly elbow: readonly [number, number]; readonly wrist: readonly [number, number];
    readonly hip: readonly [number, number]; readonly knee: readonly [number, number]; readonly ankle: readonly [number, number];
  };
  readonly armBones: readonly number[];
  readonly scale: number;
  readonly offset: readonly [number, number, number];
}
export const SARAH_V2_RIG: GarmentRig = Object.freeze({ joints: SARAH_V2_JOINTS, armBones: SARAH_V2_ARM_BONES, scale: FACE_REST_SCALE, offset: FACE_REST_OFFSET });

/**
 * A body's rig from its joints by role (`humanSkeleton.ts` `HumanJoints`: L and R as that file has them), each pair put
 * +x first by where its skeleton binds it; its arm bones every bone from a shoulder down. `scale`: metres a unit.
 */
export function rigOf(mesh: THREE.SkinnedMesh, j: Readonly<Record<'pelvis' | 'chest' | 'neck' | 'head' | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'wristL' | 'wristR' | 'hipL' | 'hipR' | 'kneeL' | 'kneeR' | 'ankleL' | 'ankleR', number>>, scale: number, offset: readonly [number, number, number] = [0, 0, 0]): GarmentRig {
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), bindInverse = mesh.bindMatrix.clone().invert();
  const x = (i: number) => p.setFromMatrixPosition(m.copy(mesh.skeleton.boneInverses[i]).invert()).applyMatrix4(bindInverse).x;
  const plusLeft = x(j.shoulderL) >= x(j.shoulderR);
  const pair = (l: number, r: number): readonly [number, number] => (plusLeft ? [l, r] : [r, l]);
  const bones = mesh.skeleton.bones, arm: number[] = [];
  for (const s of [j.shoulderL, j.shoulderR]) bones[s].traverse((b) => { const k = bones.indexOf(b as THREE.Bone); if (k >= 0) arm.push(k); });
  return {
    joints: { pelvis: j.pelvis, chest: j.chest, neck: j.neck, head: j.head, shoulder: pair(j.shoulderL, j.shoulderR), elbow: pair(j.elbowL, j.elbowR), wrist: pair(j.wristL, j.wristR), hip: pair(j.hipL, j.hipR), knee: pair(j.kneeL, j.kneeR), ankle: pair(j.ankleL, j.ankleR) },
    armBones: arm, scale, offset,
  };
}

export function toRest(x: number, y: number, z: number): Vec3 {
  return [x * FACE_REST_SCALE + FACE_REST_OFFSET[0], y * FACE_REST_SCALE + FACE_REST_OFFSET[1], z * FACE_REST_SCALE + FACE_REST_OFFSET[2]];
}

export function bodyInputOf(mesh: THREE.SkinnedMesh, morphs: Readonly<Record<string, number>> = { belly: 1 }, rig: GarmentRig = SARAH_V2_RIG): BodyInput {
  const armBones = rig.armBones, rest = (a: number, b: number, c: number): Vec3 => [a * rig.scale + rig.offset[0], b * rig.scale + rig.offset[1], c * rig.scale + rig.offset[2]];
  const g = mesh.geometry, P = g.getAttribute('position'), n = P.count, dict = mesh.morphTargetDictionary ?? {};
  const targets = Object.entries(morphs).filter(([k, w]) => w !== 0 && dict[k] !== undefined).map(([k, w]) => [g.morphAttributes.position![dict[k]], w] as const);
  const rel = g.morphTargetsRelative;
  const positions = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    let x = P.getX(v), y = P.getY(v), z = P.getZ(v);
    for (const [M, w] of targets) { if (rel) { x += w * M.getX(v); y += w * M.getY(v); z += w * M.getZ(v); } else { x += w * (M.getX(v) - x); y += w * (M.getY(v) - y); z += w * (M.getZ(v) - z); } }
    const r = rest(x, y, z);
    positions[v * 3] = r[0]; positions[v * 3 + 1] = r[1]; positions[v * 3 + 2] = r[2];
  }
  const index = g.index!;
  const triangles = new Uint32Array(index.count);
  for (let i = 0; i < index.count; i++) triangles[i] = index.getX(i);
  const arm = new Float32Array(n), bones = new Set(armBones), SI = g.getAttribute('skinIndex'), SW = g.getAttribute('skinWeight');
  for (let v = 0; v < n; v++) for (let k = 0; k < 4; k++) if (bones.has(SI.getComponent(v, k))) arm[v] += SW.getComponent(v, k);
  const bindInverse = mesh.bindMatrix.clone().invert(), m = new THREE.Matrix4(), p = new THREE.Vector3();
  const joint = (i: number): Vec3 => { p.setFromMatrixPosition(m.copy(mesh.skeleton.boneInverses[i]).invert()).applyMatrix4(bindInverse); return rest(p.x, p.y, p.z); };
  const J = rig.joints;
  const pair = (a: readonly [number, number]) => [joint(a[0]), joint(a[1])] as const;
  const joints: BodyJoints = { pelvis: joint(J.pelvis), chest: joint(J.chest), neck: joint(J.neck), head: joint(J.head), shoulder: pair(J.shoulder), elbow: pair(J.elbow), wrist: pair(J.wrist), hip: pair(J.hip), knee: pair(J.knee), ankle: pair(J.ankle) };
  const N = g.getAttribute('normal'), normals = N ? new Float32Array(n * 3) : undefined;
  if (N && normals) for (let v = 0; v < n; v++) { normals[v * 3] = N.getX(v); normals[v * 3 + 1] = N.getY(v); normals[v * 3 + 2] = N.getZ(v); }
  return { positions, triangles, arm, joints, normals };
}
