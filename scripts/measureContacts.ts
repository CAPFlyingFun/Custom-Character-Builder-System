/**
 * CONTACT POINTS SAVED AS DATA (P4, touch & grip; the card's first task: "a measurement script per rig ... from each bone
 * to the skin's surface, saved as data"). Run by hand: `npx tsx scripts/measureContacts.ts` (writes `src/data/contacts/`).
 *
 * For each rig below: her file is read under node (three's GLTFLoader, its pictures left out), her body mesh is put in
 * her REST frame exactly as the room puts it (the file's own frame at her bind pose: +y up), in metres, her joints are found
 * by `measureHuman` (actor/humanSkeleton.ts) and her contact points by `measureContacts` (actor/contactPoints.ts) -- the
 * same code the room runs live -- and each is written with the bone it rides by NAME, its triangle of the file's own
 * triangles and where on it, how deep her skin is over the bone there, and the place and outward way at rest. The
 * Godot rebuild and the other games read these files; the room measures again live, on her as she is drawn.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { measureContacts, type ContactSet } from '../src/actor/contactPoints';
import { measureHuman } from '../src/actor/humanSkeleton';
import { BABY_MODEL_LENGTH, BABY_STRAIGHT_MODEL } from '../src/sarahlab/baby';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The rigs measured: a name for the file written, the model, and its body mesh (the skinned mesh with the most points). */
export const CONTACT_RIGS = Object.freeze([
  { name: 'female-v2', model: 'models/sarah-v2-body-slim.glb', metresPerUnit: 1, size: 1 },
  // (the newborn's file is drawn 50 cm long from its crown to its heel, sarahlab/baby.ts; against her 1.70 m, MEASURED)
  // (and its arms have two bones above the elbow, so `measureHuman`'s count takes the elbow one too high: its elbows are
  // where its arms bend, 60 degrees, the third joint from the collarbone; MEASURED on the model)
  { name: 'newborn', model: BABY_STRAIGHT_MODEL, metresPerUnit: 0.5 / BABY_MODEL_LENGTH, size: 0.5 / 1.7, elbows: { L: 'Bone_031', R: 'Bone_025' } },
]);

/** A GLB with its images, textures and samplers removed: the rig and the mesh, nothing that needs a browser to decode. */
export function withoutTextures(file: string): ArrayBuffer {
  const buf = readFileSync(join(ROOT, 'public', file)), length = buf.readUInt32LE(8);
  let off = 12, json: Record<string, unknown> | null = null, bin: Buffer | null = null;
  while (off < length) {
    const n = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), data = buf.subarray(off + 8, off + 8 + n);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8')) as Record<string, unknown>; else if (type === 0x004e4942) bin = data;
    off += 8 + n;
  }
  if (!json || !bin) throw new Error(`${file}: not a GLB`);
  delete json.images; delete json.textures; delete json.samplers;
  for (const m of (json.materials as Record<string, unknown>[] | undefined) ?? []) { delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; delete m.extensions; const pbr = m.pbrMetallicRoughness as Record<string, unknown> | undefined; if (pbr) { delete pbr.baseColorTexture; delete pbr.metallicRoughnessTexture; } }
  const keep = (list: unknown) => ((list as string[] | undefined) ?? []).filter((e) => !['EXT_texture_webp', 'KHR_texture_basisu', 'KHR_texture_transform'].includes(e));
  json.extensionsUsed = keep(json.extensionsUsed); json.extensionsRequired = keep(json.extensionsRequired);
  let text = Buffer.from(JSON.stringify(json), 'utf8'); while (text.length % 4) text = Buffer.concat([text, Buffer.from(' ')]);
  let body = bin; while (body.length % 4) body = Buffer.concat([body, Buffer.from([0])]);
  const total = 28 + text.length + body.length, out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(text.length, 12); out.writeUInt32LE(0x4e4f534a, 16); text.copy(out, 20);
  out.writeUInt32LE(body.length, 20 + text.length); out.writeUInt32LE(0x004e4942, 24 + text.length); body.copy(out, 28 + text.length);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

export interface RigContacts {
  readonly rig: string;
  readonly model: string;
  /** how many points and triangles her file's body mesh has (a triangle index below is one of its triangles) */
  readonly vertices: number;
  readonly triangles: number;
  readonly frame: string;
  /** how many metres a unit of her file is (her points and the depths below are in metres) */
  readonly metresPerUnit: number;
  /** how tall her body is, crown to sole, as measured (metres) */
  readonly heightM: number;
  readonly points: readonly { site: string; side: 'L' | 'R'; bone: string; tri: number; bary: number[]; depthMm: number; point: number[]; normal: number[] }[];
  readonly missing: readonly string[];
}

/** One rig's body at rest, as the room has it: her points (metres), triangles, joints and their parents, her bones' names
 * and the joints `measureHuman` finds. */
export async function restOfRig(rig: { model: string; metresPerUnit: number }) {
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise<{ scene: THREE.Group }>((ok, no) => loader.parse(withoutTextures(rig.model), '', ok as never, no));
  gltf.scene.updateMatrixWorld(true);
  let mesh: THREE.SkinnedMesh | null = null;
  gltf.scene.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh && (!mesh || m.geometry.getAttribute('position').count > mesh.geometry.getAttribute('position').count)) mesh = m; });
  if (!mesh) throw new Error(`${rig.model}: no skinned mesh`);
  const m = mesh as THREE.SkinnedMesh, sk = m.skeleton, g = m.geometry;
  // (her rest frame as the room's restOfMesh makes it, the file's scene at its root, in metres)
  const skin = new THREE.Matrix4().copy(m.bindMatrixInverse).multiply(sk.bones[0].matrixWorld).multiply(sk.boneInverses[0]).multiply(m.bindMatrix);
  const toRest = new THREE.Matrix4().makeScale(rig.metresPerUnit, rig.metresPerUnit, rig.metresPerUnit).multiply(m.matrixWorld).multiply(skin), bindInv = new THREE.Matrix4().copy(m.bindMatrix).invert();
  const pa = g.getAttribute('position'), v = new THREE.Vector3(), pos = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) v.fromBufferAttribute(pa, i).applyMatrix4(toRest).toArray(pos, i * 3);
  const joints = new Float32Array(sk.bones.length * 3), M = new THREE.Matrix4();
  sk.bones.forEach((_, k) => v.setFromMatrixPosition(M.multiplyMatrices(bindInv, new THREE.Matrix4().copy(sk.boneInverses[k]).invert())).applyMatrix4(toRest).toArray(joints, k * 3));
  const parents = sk.bones.map((b) => sk.bones.indexOf(b.parent as THREE.Bone));
  const names = sk.bones.map((b) => b.name);
  const measure = measureHuman(names.map((name, k) => ({ name, parent: parents[k], x: joints[k * 3], y: joints[k * 3 + 1], z: joints[k * 3 + 2] })));
  // (each point's heaviest bone, for anything measuring one bone's own part of her: scripts/measurePelvis.ts)
  const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), heaviest = new Uint16Array(pa.count);
  for (let i = 0; i < pa.count; i++) { let best = 0; for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k; heaviest[i] = si.getComponent(i, best); }
  return { pos, tris: g.index!.array, joints, parents, names, measure, vertices: pa.count, heaviest };
}

/** One rig's contact points, measured from its file as the room measures them. */
export async function measureRig(rig: { name: string; model: string; metresPerUnit: number; size: number; elbows?: { L: string; R: string } }): Promise<RigContacts> {
  const { pos, tris, joints, parents, names, measure, vertices } = await restOfRig(rig);
  const j = measure.joints, bone = (name: string) => { const k = names.indexOf(name); if (k < 0) throw new Error(`${rig.model}: no bone ${name}`); return k; };
  const elbowL = rig.elbows ? bone(rig.elbows.L) : j.elbowL, elbowR = rig.elbows ? bone(rig.elbows.R) : j.elbowR;
  const set: ContactSet = measureContacts({ pos, tris, joints, parents, named: { wristL: j.wristL, wristR: j.wristR, elbowL, elbowR, kneeL: j.kneeL, kneeR: j.kneeR, ankleL: j.ankleL, ankleR: j.ankleR }, size: rig.size });
  const ys = pos.filter((_, k) => k % 3 === 1);
  const r = (x: number, k = 1e5) => Math.round(x * k) / k;
  return {
    rig: rig.name, model: rig.model, vertices, triangles: tris.length / 3, metresPerUnit: r(rig.metresPerUnit, 1e8), heightM: r(Math.max(...ys) - Math.min(...ys), 1e3),
    frame: 'her rest frame: +y up, +z her front, +x her left, metres (the file\'s scene at her bind pose)',
    points: set.points.map((p) => ({ site: p.site, side: p.side, bone: names[p.bone], tri: p.tri, bary: p.bary.map((x) => r(x, 1e6)), depthMm: r(p.depth * 1000, 100), point: p.point.map((x) => r(x)), normal: p.normal.map((x) => r(x, 1e4)) })),
    missing: set.missing,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const dir = join(ROOT, 'src', 'data', 'contacts'); mkdirSync(dir, { recursive: true });
  for (const rig of CONTACT_RIGS) {
    const out = await measureRig(rig);
    writeFileSync(join(dir, `${rig.name}.json`), JSON.stringify(out, null, 1) + '\n');
    console.log(rig.name, out.points.length, 'points', out.missing.length ? `missing ${out.missing.join(', ')}` : 'none missing');
  }
}
