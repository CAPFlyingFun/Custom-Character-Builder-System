/**
 * v2'S APPROVED BELLY, MEASURED (Joshua, 2026-11-09: "I do approve the v2 belly look and shapes... apply it all to v3"):
 * how far it stands out from her 0% shape at each key size, where, and how much volume it adds. Run by hand:
 * `npx tsx scripts/measureV2Belly.ts [models/sarah-v2-body-slim.glb]`.
 */
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { withoutTextures } from './measureContacts';
const file = process.argv[2] ?? 'models/sarah-v2-body-slim.glb';
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf: any = await new Promise((ok, no) => loader.parse(withoutTextures(file), '', ok, no));
gltf.scene.updateMatrixWorld(true);
let mesh: any = null;
gltf.scene.traverse((o: any) => { if (o.isSkinnedMesh && o.morphTargetDictionary?.belly !== undefined && (!mesh || o.geometry.attributes.position.count > mesh.geometry.attributes.position.count)) mesh = o; });
const g = mesh.geometry, dict = mesh.morphTargetDictionary, P = g.attributes.position, n = P.count;
console.log('mesh', mesh.name, n, Object.keys(dict).filter((k) => k.startsWith('belly')).join(' '), 'relative', g.morphTargetsRelative);
const sk = mesh.skeleton, toRest = new THREE.Matrix4().copy(mesh.bindMatrixInverse).multiply(sk.bones[0].matrixWorld).multiply(sk.boneInverses[0]).multiply(mesh.bindMatrix);
const W = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, toRest);
// metres: her height
const v = new THREE.Vector3(); let lo = 1e9, hi = -1e9; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i).applyMatrix4(W); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
const s = 1.675 / (hi - lo); console.log('height units', (hi - lo).toFixed(3), 'scale to 1.675 m', s.toFixed(4));
const at = (key: string | null) => { const out = new Float32Array(n * 3), d = key ? g.morphAttributes.position[dict[key]] : null; for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (d) { v.x += d.getX(i); v.y += d.getY(i); v.z += d.getZ(i); } v.applyMatrix4(W); out[3 * i] = v.x * s; out[3 * i + 1] = (v.y - lo) * s; out[3 * i + 2] = v.z * s; } return out; };
const zero = at('belly');
const keys: [number, string | null][] = [[0.25, 'belly25'], [0.3, 'belly30'], [0.5, 'belly50'], [0.6, 'belly60'], [0.75, 'belly75'], [1, null], [1.5, 'belly150'], [2, 'belly200']];
// her midline front at 0%
const front = (pts: Float32Array, y: number) => { let z = -1e9; for (let i = 0; i < n; i++) if (Math.abs(pts[3 * i]) < 0.02 && Math.abs(pts[3 * i + 1] - y) < 0.006 && pts[3 * i + 2] > z) z = pts[3 * i + 2]; return z; };
const out: any = { scale: s, keys: [] as any[] };
for (const [k, name] of keys) {
  const p = at(name); let best = 0, by = 0, bot = 1e9, top = -1e9, wide = 0;
  for (let i = 0; i < n; i++) { const dz = p[3 * i + 2] - zero[3 * i + 2], d = Math.hypot(p[3 * i] - zero[3 * i], p[3 * i + 1] - zero[3 * i + 1], dz); if (dz > best) { best = dz; by = zero[3 * i + 1]; } if (d > 0.005 && zero[3 * i + 2] > -0.05) { bot = Math.min(bot, zero[3 * i + 1]); top = Math.max(top, zero[3 * i + 1]); wide = Math.max(wide, Math.abs(p[3 * i])); } }
  const prof = []; for (let y = 0.85; y <= 1.30; y += 0.025) prof.push([+y.toFixed(3), +((front(p, y) - front(zero, y)) * 100).toFixed(1)]);
  out.keys.push({ pct: k * 100, outCm: +(best * 100).toFixed(1), atY: +by.toFixed(3), from: +bot.toFixed(3), to: +top.toFixed(3), halfWidth: +wide.toFixed(3), profile: prof });
  console.log(k * 100, '% out', (best * 100).toFixed(1), 'cm at y', by.toFixed(3), 'region', bot.toFixed(3), '-', top.toFixed(3), 'half width', wide.toFixed(3));
}
const prof0 = []; for (let y = 0.80; y <= 1.30; y += 0.025) prof0.push([+y.toFixed(3), +front(zero, y).toFixed(3)]);
console.log('0% front', JSON.stringify(prof0));
for (const k of out.keys) console.log(k.pct, JSON.stringify(k.profile));
const idx = g.index.array;
const vol = (p: Float32Array) => { let v = 0; for (let t = 0; t < idx.length; t += 3) { const a = 3 * idx[t], b = 3 * idx[t + 1], c = 3 * idx[t + 2]; v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6; } return v; };
const v0 = vol(zero);
for (const [k, name] of keys) console.log('volume', k * 100, '% +', ((vol(at(name)) - v0) * 1e3).toFixed(2), 'L');
