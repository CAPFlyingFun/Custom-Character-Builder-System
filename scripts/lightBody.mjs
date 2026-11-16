/**
 * HER LIGHT SKIN (Joshua, 2026-11-15/16: "lower vertices between 4-8k... a smart cut on the current skin, while leaving
 * certain parts like belly, breasts, etc higher resolution"; "set up this lower version for web when it detects a
 * mobile device"): a second list of TRIANGLES for her own skin, over her own points.
 *
 *   node scripts/lightBody.mjs            -> public/models/sarah-v2-body-light.bin   (Uint32, three a triangle)
 *   node scripts/lightBody.mjs --check    says what it would write, and writes nothing
 *
 * Nothing of her body file changes and no point of hers moves: the light skin draws a few thousand of her 115,710
 * vertices and leaves the rest undrawn, so every shape, weight, paint and measurement told by her vertices is told the
 * same on it. It is thinned (meshoptimizer, which keeps her texture's seams) against her body file's shape AND her
 * `belly` and `belly200` shapes at once -- her 0% and her 200% -- so it holds at every size of belly.
 *
 * WHERE IT IS DENSER (`LIGHT.share`, GAME TUNING): her head, her hands and feet, and her bust, belly and groin in front.
 * WHAT IS LEFT WHOLE (`whole`): her opening's area and the skin round it, which the room rebuilds from her own triangles
 * there (`vulvaMesh.ts`), and her navel. The points two parts share are kept by both.
 */
import { writeFileSync } from 'node:fs';
import { MeshoptSimplifier } from 'meshoptimizer';
import { gltfIo, BODY_FILE } from './preview/body.mjs';
import { readBody } from './sarahV2SideLock.mjs';

export const LIGHT_FILE = 'public/models/sarah-v2-body-light.bin';
/** GAME TUNING: its triangles (besides what is left whole), and the denser part's share of them. */
export const LIGHT = Object.freeze({ triangles: 12000, share: 0.62 });
const HIP_Y = 0.8865;

const check = process.argv.includes('--check');
const io = await gltfIo(), doc = await io.read(BODY_FILE), body = readBody(doc), part = body.skin, n = part.n, R = Float32Array.from(part.rest);
const index = Uint32Array.from(part.index);
// her 0% and her 200%, in the same metres as her rest points (a shape's numbers are in her geometry's units: the
// difference between a point moved and unmoved, through the same frame)
const node = doc.getRoot().listNodes().find((x) => x.getMesh() === body.mesh), skin = node.getSkin();
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const T = mul(skin.listJoints()[0].getWorldMatrix(), Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16)));
const shaped = (name) => {
  const k = body.names.indexOf(name); if (k < 0) throw new Error(`her body has no shape "${name}"`);
  const a = part.prim.listTargets()[k].getAttribute('POSITION'), out = new Float32Array(n * 3), e = [];
  for (let v = 0; v < n; v++) { a.getElement(v, e); for (let c = 0; c < 3; c++) out[v * 3 + c] = R[v * 3 + c] + T[c] * e[0] + T[4 + c] * e[1] + T[8 + c] * e[2]; }
  return out;
};
const none = shaped('belly'), most = shaped('belly200');
// her arm's and her leg's skin, by the bone that weighs most on a point
const isArmV = new Uint8Array(n);
for (let v = 0; v < n; v++) { let best = 0; for (let k = 1; k < 4; k++) if (part.weights[v * 4 + k] > part.weights[v * 4 + best]) best = k; isArmV[v] = body.isArm[part.joints[v * 4 + best]]; }
const at = (v) => [Math.abs(R[v * 3] - body.midX), R[v * 3 + 1], R[v * 3 + 2]];
const whole = (v) => { const [x, y, z] = at(v); return (x < 0.1 && y > HIP_Y - 0.17 && y < HIP_Y - 0.01 && !isArmV[v]) || (x < 0.035 && y > HIP_Y + 0.09 && y < HIP_Y + 0.155 && z > 0.1); };
const dense = (v) => { const [x, y, z] = at(v); return y > 1.42 || (isArmV[v] && x > 0.2 && y < 0.95) || y < 0.1 || (!isArmV[v] && y > HIP_Y - 0.12 && y < 1.36 && z > -0.02 && x < 0.2); };
const kind = Uint8Array.from({ length: n }, (_x, v) => (whole(v) ? 2 : dense(v) ? 1 : 0));
const groups = [[], [], []];
for (let t = 0; t < index.length; t += 3) {
  const a = index[t], b = index[t + 1], c = index[t + 2], w = (kind[a] === 2) + (kind[b] === 2) + (kind[c] === 2), d = (kind[a] === 1) + (kind[b] === 1) + (kind[c] === 1);
  groups[w >= 1 ? 2 : d >= 2 ? 1 : 0].push(a, b, c);
}
// one place for the copies at her texture's seams; a place two groups share is kept, every copy of it
const ids = new Map(), place = new Uint32Array(n);
for (let v = 0; v < n; v++) { const k = `${R[v * 3]},${R[v * 3 + 1]},${R[v * 3 + 2]}`; let p = ids.get(k); if (p === undefined) { p = ids.size; ids.set(k, p); } place[v] = p; }
const inGroup = groups.map((g) => { const s = new Uint8Array(ids.size); for (const v of g) s[place[v]] = 1; return s; });
const lock = Uint8Array.from({ length: n }, (_x, v) => (inGroup[0][place[v]] + inGroup[1][place[v]] + inGroup[2][place[v]] > 1 ? 1 : 0));
await MeshoptSimplifier.ready;
const attrs = new Float32Array(n * 6);
for (let v = 0; v < n; v++) for (let c = 0; c < 3; c++) { attrs[v * 6 + c] = none[v * 3 + c]; attrs[v * 6 + 3 + c] = most[v * 3 + c]; }
const thin = (I, goal) => MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(I), R, 3, attrs, 6, [1, 1, 1, 1, 1, 1], lock, Math.max(3, Math.round(goal) * 3), 1)[0];
const a = thin(groups[1], LIGHT.triangles * LIGHT.share), b = thin(groups[0], LIGHT.triangles * (1 - LIGHT.share));
const light = Uint32Array.from([...b, ...a, ...groups[2]]);
const used = new Set(light), places = new Set(Array.from(used, (v) => place[v]));
console.log(`her skin: ${n} vertices, ${ids.size} places, ${index.length / 3} triangles`);
console.log(`light: ${light.length / 3} triangles (${b.length / 3} sparse, ${a.length / 3} dense, ${groups[2].length / 3} left whole) on ${used.size} vertices, ${places.size} places`);
if (!check) { writeFileSync(LIGHT_FILE, Buffer.from(light.buffer)); console.log(`${LIGHT_FILE}: ${(light.byteLength / 1024).toFixed(0)} KB`); }
