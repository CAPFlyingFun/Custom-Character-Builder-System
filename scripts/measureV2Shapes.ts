/**
 * v2'S APPROVED BELLY SHAPES, SAVED FOR v3'S SKIN (Joshua, 2026-11-09: "I do approve the v2 belly look and shapes... and
 * would like to apply it all to v3"; the hybrid, "Sounds good"). Run by hand: `npx tsx scripts/measureV2Shapes.ts`
 * (writes `src/data/belly/v2-shapes.json`).
 *
 * v2's body file is read under node in her rest frame (as scripts/measureV2Belly.ts), scaled to v3's stature, and each of
 * her belly's key shapes (0, 25, 30, 50, 60, 75, 150, 200%: morph targets against her 100% base) is laid on the grid v3's
 * belly band uses: a row for each of the band's rows, from the bottom of v2's bump (her pubic bone) to its top (under her
 * breastbone), each row's points at the same angles round its middle (0 her front, toward +x her left). In each cell: how
 * far that key moves her skin straight out from the row's middle (metres; + outward), averaged over v2's points there.
 * v3's band blends them as v2's BUMP slider blends its targets (`bellyWeights`) and lays the result on its own rows.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { withoutTextures } from './measureContacts';
import { BELLY_KEYS } from '../src/sarahlab/sarahLabTool';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = 'models/sarah-v2-body-slim.glb', COLS = 64, TORSO = 0.19, BUMP_MOVES = 0.005;
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise<{ scene: THREE.Group }>((ok, no) => loader.parse(withoutTextures(FILE), '', ok as never, no));
gltf.scene.updateMatrixWorld(true);
let mesh: THREE.SkinnedMesh | null = null;
gltf.scene.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh && m.morphTargetDictionary?.belly !== undefined && (!mesh || m.geometry.getAttribute('position').count > mesh.geometry.getAttribute('position').count)) mesh = m; });
if (!mesh) throw new Error(`${FILE}: no body with belly targets`);
const m = mesh as THREE.SkinnedMesh, g = m.geometry, dict = m.morphTargetDictionary!, P = g.getAttribute('position'), n = P.count;
const sk = m.skeleton, toRest = new THREE.Matrix4().copy(m.bindMatrixInverse).multiply(sk.bones[0].matrixWorld).multiply(sk.boneInverses[0]).multiply(m.bindMatrix);
const W = new THREE.Matrix4().multiplyMatrices(m.matrixWorld, toRest), v = new THREE.Vector3();
let lo = Infinity, hi = -Infinity;
for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i).applyMatrix4(W); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
const torso = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'torso', 'skeleton.json'), 'utf8')) as { stature: number };
const belly = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'belly', 'skeleton.json'), 'utf8')) as { rows: unknown[] };
const s = torso.stature / (hi - lo), ROWS = belly.rows.length;
const at = (key: string | null) => {
  const out = new Float32Array(n * 3), d = key ? (g.morphAttributes.position![dict[key]] as THREE.BufferAttribute) : null;
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); if (d) { v.x += d.getX(i); v.y += d.getY(i); v.z += d.getZ(i); } v.applyMatrix4(W); out[3 * i] = v.x * s; out[3 * i + 1] = (v.y - lo) * s; out[3 * i + 2] = v.z * s; }
  return out;
};
const base = at(null), zero = at('belly');
// v2's bump, top to bottom: where her 100% moves her skin from her 0%, on her torso
let bottom = Infinity, top = -Infinity;
for (let i = 0; i < n; i++) { if (Math.abs(base[3 * i]) > TORSO) continue; const d = Math.hypot(base[3 * i] - zero[3 * i], base[3 * i + 1] - zero[3 * i + 1], base[3 * i + 2] - zero[3 * i + 2]); if (d > BUMP_MOVES) { bottom = Math.min(bottom, zero[3 * i + 1]); top = Math.max(top, zero[3 * i + 1]); } }
// each row's middle at her 0%: across, halfway between her front and back
const step = (top - bottom) / (ROWS - 1), cz = new Float32Array(ROWS), cx = new Float32Array(ROWS);
for (let k = 0; k < ROWS; k++) {
  const y = bottom + k * step; let f = -Infinity, b = Infinity, l = Infinity, rr = -Infinity;
  for (let i = 0; i < n; i++) { if (Math.abs(zero[3 * i]) > TORSO || Math.abs(zero[3 * i + 1] - y) > step) continue; f = Math.max(f, zero[3 * i + 2]); b = Math.min(b, zero[3 * i + 2]); l = Math.min(l, zero[3 * i]); rr = Math.max(rr, zero[3 * i]); }
  cz[k] = (f + b) / 2; cx[k] = (l + rr) / 2;
}
const names = BELLY_KEYS.map(([, name]) => name).filter((x): x is string => !!x);
const shapes: Record<string, number[]> = {};
for (const name of names) {
  const p = at(name), sum = new Float64Array(ROWS * COLS), cnt = new Float64Array(ROWS * COLS);
  for (let i = 0; i < n; i++) {
    const x = zero[3 * i], y = zero[3 * i + 1], z = zero[3 * i + 2];
    if (Math.abs(x) > TORSO) continue;
    const t = (y - bottom) / step, k = Math.round(t);
    if (k < 0 || k >= ROWS) continue;
    const dx = x - cx[k], dz = z - cz[k], rl = Math.hypot(dx, dz) || 1, c = ((Math.round((Math.atan2(dx, dz) / (2 * Math.PI)) * COLS) % COLS) + COLS) % COLS;
    // (how far this key moves it straight out from the row's middle, against her 100% base)
    const out = ((p[3 * i] - base[3 * i]) * dx + (p[3 * i + 2] - base[3 * i + 2]) * dz) / rl;
    sum[k * COLS + c] += out; cnt[k * COLS + c]++;
  }
  // (cells no point of hers fell in take their neighbours' round the row, then up and down)
  const grid = new Float32Array(ROWS * COLS).fill(NaN);
  for (let i = 0; i < grid.length; i++) if (cnt[i]) grid[i] = sum[i] / cnt[i];
  for (let pass = 0; pass < 64 && grid.some(Number.isNaN); pass++) {
    const prev = Float32Array.from(grid);
    for (let k = 0; k < ROWS; k++) for (let c = 0; c < COLS; c++) {
      const i = k * COLS + c; if (!Number.isNaN(prev[i])) continue;
      const near = [k * COLS + ((c + 1) % COLS), k * COLS + ((c + COLS - 1) % COLS), k > 0 ? i - COLS : -1, k < ROWS - 1 ? i + COLS : -1].filter((j) => j >= 0 && !Number.isNaN(prev[j]));
      if (near.length) grid[i] = near.reduce((a, j) => a + prev[j], 0) / near.length;
    }
  }
  shapes[name] = Array.from(grid, (x) => r5(Number.isNaN(x) ? 0 : x));
}
const saved = { model: FILE, frame: 'v3 belly band grid: rows from v2\'s bump bottom (her pubic bone) to its top (under her breastbone), cols round each row from her front toward +x her left; metres straight out from the row\'s middle, each key against her 100% base', scale: r5(s), v2Bump: [r5(bottom), r5(top)], rows: ROWS, cols: COLS, shapes };
mkdirSync(join(ROOT, 'src', 'data', 'belly'), { recursive: true });
writeFileSync(join(ROOT, 'src', 'data', 'belly', 'v2-shapes.json'), JSON.stringify(saved) + '\n');
const front = (name: string) => { let best = 0; for (let k = 0; k < ROWS; k++) best = Math.max(best, -saved.shapes[name][k * COLS]); return best; };
console.log('rows', ROWS, 'cols', COLS, 'v2 bump', bottom.toFixed(3), top.toFixed(3), '0% front against 100% (cm):', (front('belly') * 100).toFixed(1));
