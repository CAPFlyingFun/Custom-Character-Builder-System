/**
 * HIS SIDES HOLD STILL UNDER HIS ARMS -- her side lock (`scripts/sarahV2SideLock.mjs`, Joshua 2026-11-12: "lock the skin from
 * stretching"; "I'd do A") laid on the MALE BASE MODEL (Joshua, 2026-11-19: "get the sliders to work… and everything else").
 *
 * THE CAUSE, MEASURED on `assets-archive/models/male-base-touched.glb` (2026-11-19): Meshy's weights give his arm's bones a
 * share of his side down to 14 cm under his armpit -- 0.79 at the most and 0.30 on average in the first 2 cm, 0.76 / 0.26 at
 * 2-4 cm, 0.62 / 0.19 at 4-6, 0.40 / 0.10 at 8-10, 0.12 at 12-14. He is modelled with his arms angled down (an A), so in
 * T-POSE (his arms raised 45 degrees and more) his sides were drawn up with them into flaps from his ribs to his arms.
 *
 * THE LOCK, as hers (her `sideRegions` and `fadeOf`, her `SIDE_LOCK` numbers: whole at his armpit, gone 2 cm under it): on
 * his TRUNK below his armpits his arm's bones (each upper arm and every bone under it) lose their share, and what they give
 * up goes to the bones that already hold the point, in their own proportions. His weights are 32-bit numbers (hers are
 * bytes), so they are scaled as numbers. Nothing else in the file changes.
 *
 * FIRST HIS ARMPITS ARE WEIGHTED AS HERS WERE (`scripts/sarahV2ArmWeights.mjs`, 2026-10-15: the arm's share solved along
 * the skin round each shoulder, the shoulder's top kept, and the raised-arm tucks armRaiseL / armRaiseR made): MEASURED in the
 * room with only the lock, his T-POSE still stood in flaps from his back to his arms -- the back of his torso dragged up with
 * the arm, as hers was before that script. Then the lock, which fades the two tucks with his arm's share.
 *
 *   node scripts/male/maleSideLock.mjs        archive -> public/models/male-base.glb (both steps)
 */
import { NodeIO } from '@gltf-transform/core';
import { sideRegions, fadeOf, SIDE_LOCK, SIDE_LOCK_SHAPES } from '../sarahV2SideLock.mjs';
import { sarahV2ArmWeights } from '../sarahV2ArmWeights.mjs';

export const MALE_SOURCE = 'assets-archive/models/male-base-touched.glb';
export const MALE_ROOM_FILE = 'public/models/male-base.glb';
export const MALE_SIDE_LOCK_NOTE = "2026-11-19 his sides hold under his arms: his arm bones' share faded out over the 20 mm below each armpit (her SIDE_LOCK)";

const mul = (x, y) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += x[k * 4 + r] * y[c * 4 + k]; return o; };

/** His skin read for the lock: rest points (metres), triangles, joints, weights, which bones are his arms', his midline and elbows. */
export function readMale(doc) {
  const root = doc.getRoot(), mesh = root.listMeshes()[0], node = root.listNodes().find((x) => x.getMesh() === mesh), skin = node?.getSkin();
  if (!skin) throw new Error('his body has no skin (bones)');
  const joints = skin.listJoints(), wt = joints.map((j) => j.getWorldTranslation());
  const T = mul(joints[0].getWorldMatrix(), Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16)));
  const child = (k) => joints[k].listChildren().find((c) => joints.includes(c));
  // his two upper arms: beside his chest, the shoulder's child, with a long bone under them (the forearms are under these)
  const long = (k) => { const c = child(k); if (!c) return false; const e = c.getWorldTranslation(), t = wt[k]; return Math.hypot(e[0] - t[0], e[1] - t[1], e[2] - t[2]) > 0.18; };
  const ups = joints.map((_, k) => k).filter((k) => Math.abs(wt[k][0]) > 0.1 && Math.abs(wt[k][0]) < 0.3 && wt[k][1] > 1.2 && wt[k][1] < 1.55 && long(k));
  if (ups.length !== 2) throw new Error(`expected two upper arms, found ${ups.length}`);
  const under = (k, top) => { for (let x = joints[k]; x; x = x.getParentNode?.()) { if (x === joints[top]) return true; if (!joints.includes(x)) return false; } return false; };
  const isArm = Uint8Array.from(joints, (_, k) => (ups.some((up) => under(k, up)) ? 1 : 0));
  const prim = mesh.listPrimitives()[0], P = prim.getAttribute('POSITION'), n = P.getCount(), rest = new Float64Array(n * 3), v = [];
  for (let i = 0; i < n; i++) { P.getElement(i, v); for (let c = 0; c < 3; c++) rest[i * 3 + c] = T[c] * v[0] + T[4 + c] * v[1] + T[8 + c] * v[2] + T[12 + c]; }
  const W = prim.getAttribute('WEIGHTS_0');
  if (!(W.getArray() instanceof Float32Array)) throw new Error('his weights are not 32-bit numbers');
  const names = mesh.getExtras()?.targetNames ?? [], shapes = SIDE_LOCK_SHAPES.map((name) => prim.listTargets()[names.indexOf(name)]?.getAttribute('POSITION') ?? null);
  return { mesh, prim, n, rest, index: prim.getIndices().getArray(), joints: prim.getAttribute('JOINTS_0').getArray(), W, isArm, shapes, midX: wt[0][0], elbows: ups.map((k) => child(k).getWorldTranslation()) };
}

/** Each vertex's arm share scaled by its fade, the rest of the point given what that frees in its own proportions. */
export function lockFloatWeights(weights, joints, isArm, fade) {
  const out = Float32Array.from(weights);
  let changed = 0;
  for (let i = 0; i < fade.length; i++) {
    if (!(fade[i] < 1)) continue;
    let a = 0, rest = 0;
    for (let c = 0; c < 4; c++) { const w = weights[i * 4 + c]; if (isArm[joints[i * 4 + c]]) a += w; else rest += w; }
    if (!(a > 0) || !(rest > 1e-9)) continue;
    const an = a * fade[i], scaleRest = (a + rest - an) / rest;
    for (let c = 0; c < 4; c++) out[i * 4 + c] = weights[i * 4 + c] * (isArm[joints[i * 4 + c]] ? fade[i] : scaleRest);
    changed++;
  }
  return { weights: out, changed };
}

export async function maleSideLock(src = MALE_SOURCE, dst = MALE_ROOM_FILE, lock = SIDE_LOCK) {
  const armed = dst.replace(/\.glb$/, '.arms-tmp.glb');
  await sarahV2ArmWeights(src, armed);
  const io = new NodeIO(), doc = await io.read(armed), body = readMale(doc);
  (await import('node:fs')).rmSync(armed);
  if (body.mesh.getExtras()?.sideLock) throw new Error(`${src} already carries the lock`);
  const region = sideRegions({ rest: body.rest, index: body.index, midX: body.midX, elbows: body.elbows }, lock), fade = fadeOf(region, lock);
  const { weights, changed } = lockFloatWeights(body.W.getArray(), body.joints, body.isArm, fade);
  body.W.setArray(weights);
  for (const A of body.shapes) if (A) { const d = Float32Array.from(A.getArray()); for (let i = 0; i < fade.length; i++) for (let c = 0; c < 3; c++) d[i * 3 + c] *= fade[i]; A.setArray(d); }
  body.mesh.setExtras({ ...(body.mesh.getExtras() ?? {}), sideLock: MALE_SIDE_LOCK_NOTE });
  await io.write(dst, doc);
  const report = { file: dst, armpits: region.cut.map((h) => +h.toFixed(4)), vertices: body.n, changed };
  console.log(JSON.stringify(report));
  return report;
}

if (process.argv[1]?.endsWith('maleSideLock.mjs')) await maleSideLock(...process.argv.slice(2));
