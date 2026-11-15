/**
 * HER HEAD, READ FROM HER BODY FILE, FOR A HAIRSTYLE TO BE BUILT ON (the toolkit, `scripts/hair/`; first written inside
 * `scripts/sarahV2Recovery/hair-bake.mjs`, taken out as it was so every style is built on the same surface).
 *
 * In her REST METRES (feet at y = 0, facing +z, +y up, +x HER LEFT): her surface above the waist in a grid of 1 cm cells
 * for the nearest point and `keepOff`, her head's triangles for rays, and the weights of her skin near a place, so what
 * lies on her rides her as her skin does.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { add, cross, dot, len, mul, sub, unit } from './vec.mjs';

export const BODY_FILE = 'public/models/sarah-v2-body-slim.glb';
/** Her geometry units to her rest metres: bone 0's world matrix times its inverse bind (MEASURED; faceRig.ts measures the same). */
export const REST_SCALE = 0.89974678, REST_OFFSET = [0, 0.8002533, -0.0340415];
/** Her surface kept for the nearest point: above this height (metres; GAME TUNING -- her chest and shoulders, where hair may lie). */
const SURFACE_FROM_Y = 1.12;
/** Her head's triangles for rays: wholly above this height (metres; GAME TUNING -- her scalp, ears and face). */
const HEAD_FROM_Y = 1.44;
const CELL = 0.01;

export async function hairIo() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
}

/**
 * Her head: {
 *   file, joints (her skeleton's joint names, in order), HEAD, NECK, CHEST (their numbers)
 *   nearest(p, r)      the nearest point of her surface within r: { q, d, n } or null
 *   inside(p, near)    is p inside her
 *   keepOff(p, clear, reach)   p pushed out of her until it stands `clear` off her surface
 *   raycast(o, d)      the distance to her head along a ray (Infinity: none)
 *   weightsNear(p)     the weights of her skin's point nearest p, a Map joint -> weight
 *   blendWeights(a, b, t)
 * }
 */
export async function loadHead(file = BODY_FILE) {
  const io = await hairIo(), doc = await io.read(file);
  const bodyPrim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const floats = (a) => { const x = a.getArray(); if (!a.getNormalized()) return Float32Array.from(x); const s = x instanceof Int16Array ? 32767 : x instanceof Int8Array ? 127 : x instanceof Uint16Array ? 65535 : 255; return Float32Array.from(x, (v) => Math.max(-1, v / s)); };
  const GP = floats(bodyPrim.getAttribute('POSITION')), GN = floats(bodyPrim.getAttribute('NORMAL'));
  const BJ = bodyPrim.getAttribute('JOINTS_0').getArray(), BW = floats(bodyPrim.getAttribute('WEIGHTS_0'));
  const BI = bodyPrim.getIndices().getArray();
  const nv = GP.length / 3;
  const RP = new Float64Array(nv * 3), RN = new Float64Array(nv * 3);
  for (let v = 0; v < nv; v++) {
    for (let k = 0; k < 3; k++) RP[v * 3 + k] = GP[v * 3 + k] * REST_SCALE + REST_OFFSET[k];
    const n = unit([GN[v * 3], GN[v * 3 + 1], GN[v * 3 + 2]]); RN.set(n, v * 3);
  }
  const restOf = (v) => [RP[v * 3], RP[v * 3 + 1], RP[v * 3 + 2]];
  const joints = doc.getRoot().listSkins()[0].listJoints().map((j) => j.getName());
  const HEAD = joints.indexOf('Bone_016'), NECK = joints.indexOf('Bone_017'), CHEST = joints.indexOf('Bone_002');
  if (HEAD < 0 || NECK < 0 || CHEST < 0) throw new Error('hair: her head, neck or chest bone is missing');

  const tris = [];
  for (let t = 0; t < BI.length; t += 3) {
    const a = BI[t], b = BI[t + 1], c = BI[t + 2];
    if (Math.max(RP[a * 3 + 1], RP[b * 3 + 1], RP[c * 3 + 1]) > SURFACE_FROM_Y) tris.push(a, b, c);
  }
  const grid = new Map(), cellKey = (x, y, z) => `${x},${y},${z}`;
  const triAt = (t) => [restOf(tris[t]), restOf(tris[t + 1]), restOf(tris[t + 2])];
  for (let t = 0; t < tris.length; t += 3) {
    const ps = triAt(t);
    const lo = [0, 1, 2].map((k) => Math.floor(Math.min(ps[0][k], ps[1][k], ps[2][k]) / CELL)), hi = [0, 1, 2].map((k) => Math.floor(Math.max(ps[0][k], ps[1][k], ps[2][k]) / CELL));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const key = cellKey(x, y, z); let list = grid.get(key); if (!list) grid.set(key, (list = [])); list.push(t);
    }
  }
  function triNormal(t) {
    // the smooth normal: her vertices' own, averaged (the face's would flip on a sliver)
    const n = [0, 0, 0];
    for (let k = 0; k < 3; k++) { const v = tris[t + k]; n[0] += RN[v * 3]; n[1] += RN[v * 3 + 1]; n[2] += RN[v * 3 + 2]; }
    return unit(n);
  }
  function nearest(p, r = 0.05) {
    const lo = p.map((x) => Math.floor((x - r) / CELL)), hi = p.map((x) => Math.floor((x + r) / CELL));
    let best = null, bestD = r; const seen = new Set();
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      for (const t of grid.get(cellKey(x, y, z)) ?? []) {
        if (seen.has(t)) continue; seen.add(t);
        const [a, b, c] = triAt(t), q = closestOnTriangle(p, a, b, c), d = len(sub(p, q));
        if (d < bestD) { bestD = d; best = { q, d, n: triNormal(t) }; }
      }
    }
    return best;
  }
  const inside = (p, near) => near && dot(sub(p, near.q), near.n) < 0;
  function keepOff(p, clear, reach = 0.06) {
    let q = p;
    for (let k = 0; k < 6; k++) {
      const near = nearest(q, reach);
      if (!near) return q;
      const signed = inside(q, near) ? -near.d : near.d;
      if (signed >= clear - 1e-5) return q;
      q = add(q, mul(near.n, clear - signed));
    }
    return q;
  }
  /** How far p stands off her (negative: inside her), within reach; null if her surface is not that near. */
  function signedOff(p, reach = 0.05) { const near = nearest(p, reach); return near ? (inside(p, near) ? -near.d : near.d) : null; }
  const headTris = []; for (let t = 0; t < tris.length; t += 3) { const [a, b, c] = triAt(t); if (Math.min(a[1], b[1], c[1]) > HEAD_FROM_Y) headTris.push(t); }
  function raycast(o, d) {
    let best = Infinity;
    for (const t of headTris) {
      const [a, b, c] = triAt(t), e1 = sub(b, a), e2 = sub(c, a), pv = cross(d, e2), det = dot(e1, pv);
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det, tv = sub(o, a), u = dot(tv, pv) * inv; if (u < 0 || u > 1) continue;
      const qv = cross(tv, e1), v = dot(d, qv) * inv; if (v < 0 || u + v > 1) continue;
      const dist = dot(e2, qv) * inv; if (dist > 1e-4 && dist < best) best = dist;
    }
    return best;
  }
  const vgrid = new Map();
  for (let v = 0; v < nv; v++) { if (RP[v * 3 + 1] < SURFACE_FROM_Y) continue; const k = cellKey(...restOf(v).map((x) => Math.floor(x / CELL))); let l = vgrid.get(k); if (!l) vgrid.set(k, (l = [])); l.push(v); }
  function weightsNear(p) {
    let best = -1, bd = Infinity;
    for (let r = 1; best < 0 && r < 8; r++) {
      const c = p.map((x) => Math.floor(x / CELL));
      for (let x = c[0] - r; x <= c[0] + r; x++) for (let y = c[1] - r; y <= c[1] + r; y++) for (let z = c[2] - r; z <= c[2] + r; z++) for (const v of vgrid.get(cellKey(x, y, z)) ?? []) { const d = len(sub(restOf(v), p)); if (d < bd) { bd = d; best = v; } }
    }
    const m = new Map();
    for (let k = 0; k < 4; k++) { const w = BW[best * 4 + k]; if (w > 0) m.set(BJ[best * 4 + k], (m.get(BJ[best * 4 + k]) ?? 0) + w); }
    return m;
  }
  return { file, joints, HEAD, NECK, CHEST, nearest, inside, keepOff, signedOff, raycast, weightsNear, blendWeights };
}

export function blendWeights(a, b, t) {
  const m = new Map();
  for (const [j, w] of a) m.set(j, (m.get(j) ?? 0) + w * (1 - t));
  for (const [j, w] of b) m.set(j, (m.get(j) ?? 0) + w * t);
  return m;
}

function closestOnTriangle(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, mul(ab, d1 / (d1 - d3)));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, mul(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const denom = 1 / (va + vb + vc); return add(a, add(mul(ab, vb * denom), mul(ac, vc * denom)));
}
