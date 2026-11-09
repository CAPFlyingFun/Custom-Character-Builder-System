/**
 * v2'S APPROVED BELLY, EVERY SHAPE OF IT, SAVED FOR v3'S SKIN (Joshua, 2026-11-09: "I do approve the v2 belly look and
 * shapes... apply it all to v3"; "it can go to 200% + extra depth and other variables like upper, mid, lower, width,
 * height, etc... we need to make sure we copy everything over to v3's belly skin"). Run by hand:
 * `npx tsx scripts/measureV2Shapes.ts` (writes `src/data/belly/v2-shapes.json`).
 *
 * v2's look is three layers, all measured here:
 *  1. her file's morph targets: the size keys (0..200%), `bellyUpper`, the size tilt `bellyTilt` (and the seated and
 *     motion shapes, kept for later);
 *  2. her Body panel's shape fields in the same file (`shape:bellyHeight*`, `shape:bellyWidth`, `shape:bellyDepth`,
 *     `shape:bellyUpper`, `shape:bellyLower`, and the chest ones under her breasts);
 *  3. her refinement files: her refined 0% shape, her upper belly per size, her sides and underside, her chest and groin
 *     (models/sarah-v2-body-zero.bin) and her baby's weight carrying her belly (models/sarah-v2-body-womb.bin).
 *
 * Each is read in her rest frame (as scripts/measureV2Belly.ts), scaled to v3's stature, and measured as her OUTLINE on
 * the grid v3's belly band uses -- a row for each of the band's rows, from the bottom of her bump (her pubic bone) to its
 * top (under her breastbone), its cells at angles round each row's middle (0 her front, toward +x her left): the
 * farthest her skin reaches from that middle. Saved: her raw file's outline (`base`), and each shape's change to it at
 * weight 1 (metres, rounded to 0.1 mm; shapes that move her belly less than half a millimetre anywhere are left out),
 * with the anchors her refinement weights are read against. v3 sums them with the weights v2 computes
 * (sarahlab/v2BellyLook.ts) -- her outline is close to linear in them over the belly.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { withoutTextures } from './measureContacts';
import { applyShapeFields, liftShapeFields } from '../src/view/bodyShapeView';
import { applyWomb, applyZeroRefine, babyAnchors, groinAnchors, parseWombFile, parseZeroRefine, sidesAnchors, WOMB_PATH, ZERO_REFINE_PATH } from '../src/sarahlab/zeroRefine';
import { controlSpec, defaultBodyShape, setControl } from '../src/actor/bodyShape';
import { DEFAULT_BELLY_CURVE } from '../src/sarahlab/bellyInterpolation';
import { V2_BELLY_CONTROLS, V2_CONTROL_SIZES, V2_SIZES, v2BellyLook } from '../src/sarahlab/v2BellyLook';
import { packOutline } from '../src/actor/bellySkin';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = 'models/sarah-v2-body-slim.glb', COLS = 64, TORSO = 0.19, BUMP_MOVES = 0.005, LEAST = 0.0005;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const bytes = (rel: string) => { const b = readFileSync(join(ROOT, 'public', rel)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise<{ scene: THREE.Group }>((ok, no) => loader.parse(withoutTextures(FILE), '', ok as never, no));
gltf.scene.updateMatrixWorld(true);
let found: THREE.SkinnedMesh | null = null;
gltf.scene.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh && m.morphTargetDictionary?.belly !== undefined && (!found || m.geometry.getAttribute('position').count > found.geometry.getAttribute('position').count)) found = m; });
if (!found) throw new Error(`${FILE}: no body with belly targets`);
const mesh = found as THREE.SkinnedMesh, g = mesh.geometry, n = g.getAttribute('position').count;
// her shape fields, lifted from the file as the room lifts them, and her refinement files' added
let fields = liftShapeFields(mesh);
if (!fields) throw new Error('no shape fields');
const zero = applyZeroRefine(mesh, fields, parseZeroRefine(bytes(ZERO_REFINE_PATH)));
if (!zero) throw new Error('zero refine does not fit');
fields = zero.fields;
const withWomb = applyWomb(mesh, fields, parseWombFile(bytes(WOMB_PATH)));
if (!withWomb) throw new Error('womb file does not fit');
fields = withWomb;
const dict = mesh.morphTargetDictionary!;
const sk = mesh.skeleton, toRest = new THREE.Matrix4().copy(mesh.bindMatrixInverse).multiply(sk.bones[0].matrixWorld).multiply(sk.boneInverses[0]).multiply(mesh.bindMatrix);
const W = new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, toRest), v = new THREE.Vector3();
// (her raw rest shape: no field, no morph)
applyShapeFields(mesh, fields, {});
const rawPos = Float32Array.from(g.getAttribute('position').array as Float32Array);
let lo = Infinity, hi = -Infinity;
for (let i = 0; i < n; i++) { v.fromArray(rawPos, 3 * i).applyMatrix4(W); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
const torso = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'torso', 'skeleton.json'), 'utf8')) as { stature: number };
const belly = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'belly', 'skeleton.json'), 'utf8')) as { rows: unknown[] };
const s = torso.stature / (hi - lo), ROWS = belly.rows.length;
/** her points (rest metres) with `morph` at weight 1 or `field` at weight 1, or neither */
const at = (morph: string | null, field: string | null): Float32Array => {
  let src = rawPos;
  if (field) { applyShapeFields(mesh, fields!, { [field]: 1 }); src = g.getAttribute('position').array as Float32Array; }
  const d = morph ? (g.morphAttributes.position![dict[morph]] as THREE.BufferAttribute) : null, out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v.fromArray(src, 3 * i); if (d) { v.x += d.getX(i); v.y += d.getY(i); v.z += d.getZ(i); } v.applyMatrix4(W); out[3 * i] = v.x * s; out[3 * i + 1] = (v.y - lo) * s; out[3 * i + 2] = v.z * s; }
  return out;
};
const raw = at(null, null), z0 = at('belly', null);
// v2's bump, top to bottom: where her 100% moves her skin from her 0%, on her torso
let bottom = Infinity, top = -Infinity;
for (let i = 0; i < n; i++) { if (Math.abs(raw[3 * i]) > TORSO) continue; const d = Math.hypot(raw[3 * i] - z0[3 * i], raw[3 * i + 1] - z0[3 * i + 1], raw[3 * i + 2] - z0[3 * i + 2]); if (d > BUMP_MOVES) { bottom = Math.min(bottom, z0[3 * i + 1]); top = Math.max(top, z0[3 * i + 1]); } }
const step = (top - bottom) / (ROWS - 1), cz = new Float32Array(ROWS), cx = new Float32Array(ROWS);
for (let k = 0; k < ROWS; k++) {
  const y = bottom + k * step; let f = -Infinity, b = Infinity, l = Infinity, rr = -Infinity;
  for (let i = 0; i < n; i++) { if (Math.abs(z0[3 * i]) > TORSO || Math.abs(z0[3 * i + 1] - y) > step) continue; f = Math.max(f, z0[3 * i + 2]); b = Math.min(b, z0[3 * i + 2]); l = Math.min(l, z0[3 * i]); rr = Math.max(rr, z0[3 * i]); }
  cz[k] = (f + b) / 2; cx[k] = (l + rr) / 2;
}
/** Her OUTLINE: in each cell the farthest her skin reaches from the row's middle, from where her points ARE. */
const outline = (p: Float32Array) => {
  const grid = new Float32Array(ROWS * COLS).fill(NaN);
  for (let i = 0; i < n; i++) {
    const x = p[3 * i], y = p[3 * i + 1], z = p[3 * i + 2];
    if (Math.abs(x) > TORSO) continue;
    const k = Math.round((y - bottom) / step);
    if (k < 0 || k >= ROWS || Math.abs(y - (bottom + k * step)) > step * 0.5) continue;
    const dx = x - cx[k], dz = z - cz[k], c = ((Math.round((Math.atan2(dx, dz) / (2 * Math.PI)) * COLS) % COLS) + COLS) % COLS, r = Math.hypot(dx, dz), j = k * COLS + c;
    if (Number.isNaN(grid[j]) || r > grid[j]) grid[j] = r;
  }
  for (let pass = 0; pass < 64 && grid.some(Number.isNaN); pass++) {
    const prev = Float32Array.from(grid);
    for (let k = 0; k < ROWS; k++) for (let c = 0; c < COLS; c++) {
      const i = k * COLS + c; if (!Number.isNaN(prev[i])) continue;
      const near = [k * COLS + ((c + 1) % COLS), k * COLS + ((c + COLS - 1) % COLS), k > 0 ? i - COLS : -1, k < ROWS - 1 ? i + COLS : -1].filter((j) => j >= 0 && !Number.isNaN(prev[j]));
      if (near.length) grid[i] = near.reduce((a, j) => a + prev[j], 0) / near.length;
    }
  }
  return grid;
};
const anchors = { sides: sidesAnchors(fields), baby: babyAnchors(fields), groin: groinAnchors(fields) };
const dictNames = new Set(Object.keys(dict));
/** her belly as the room composes it (sarahlab/v2BellyLook.ts) for `body` at `bump` %: her outline */
const composed = (body: ReturnType<typeof defaultBodyShape>, bump: number): Float32Array => {
  const look = v2BellyLook(body, bump, DEFAULT_BELLY_CURVE, anchors);
  applyShapeFields(mesh, fields!, look.fields);
  const src = g.getAttribute('position').array as Float32Array, out = new Float32Array(n * 3);
  const morphs = Object.entries(look.morphs).filter(([k, w]) => w && dictNames.has(k)).map(([k, w]) => [g.morphAttributes.position![dict[k]] as THREE.BufferAttribute, w] as const);
  for (let i = 0; i < n; i++) {
    v.fromArray(src, 3 * i);
    for (const [d, w] of morphs) { v.x += w * d.getX(i); v.y += w * d.getY(i); v.z += w * d.getZ(i); }
    v.applyMatrix4(W); out[3 * i] = v.x * s; out[3 * i + 1] = (v.y - lo) * s; out[3 * i + 2] = v.z * s;
  }
  return outline(out);
};
const body0 = defaultBodyShape();
// HER BELLY AT EVERY SIZE (0..200% every 5%), her controls as she comes
const sizes = V2_SIZES.map((b) => composed(body0, b));
// EACH CONTROL'S CHANGE at its least and its most, at each of a few sizes
const controls: Record<string, { least: number; most: number; fallback: number; down: string[]; up: string[] }> = {};
for (const key of V2_BELLY_CONTROLS) {
  const spec = controlSpec(key), at0 = V2_CONTROL_SIZES.map((b) => sizes[V2_SIZES.indexOf(b)]);
  const delta = (value: number) => V2_CONTROL_SIZES.map((b, j) => { const o = composed(setControl(body0, key, value), b); return packOutline(o.map((r, i) => r - at0[j][i])); });
  controls[key] = { least: spec.min, most: spec.max, fallback: spec.fallback, down: spec.min < spec.fallback ? delta(spec.min) : [], up: spec.max > spec.fallback ? delta(spec.max) : [] };
  console.log('control', key, spec.min, spec.fallback, spec.max);
}
applyShapeFields(mesh, fields, {});
const saved = {
  frame: "v3 belly band grid: rows from v2's bump bottom (her pubic bone) to its top (under her breastbone), cols round each row from her front toward +x her left. sizes: her composed outline at each of `sizeAt` (metres from each row's middle, packed); controls: each Body-panel belly control's change to it at its least (down) and most (up), at each of `controlSizeAt`",
  model: FILE, curve: DEFAULT_BELLY_CURVE, scale: r4(s), v2Bump: [r4(bottom), r4(top)], rows: ROWS, cols: COLS,
  sizeAt: V2_SIZES, sizes: sizes.map((o) => packOutline(o)), controlSizeAt: V2_CONTROL_SIZES, controls,
};
mkdirSync(join(ROOT, 'src', 'data', 'belly'), { recursive: true });
writeFileSync(join(ROOT, 'src', 'data', 'belly', 'v2-shapes.json'), JSON.stringify(saved) + '\n');
const front = (o: Float32Array) => { let m = 0; for (let k = 0; k < ROWS; k++) m = Math.max(m, o[k * COLS]); return m; };
console.log('rows', ROWS, 'bump', bottom.toFixed(3), top.toFixed(3), 'front at 0/100/200%:', [0, 20, 40].map((i) => (front(sizes[i]) * 100).toFixed(1)).join(' / '), 'cm from the middle');
