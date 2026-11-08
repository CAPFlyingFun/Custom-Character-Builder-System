/**
 * THE SKELETON, RIGGED (Joshua, 2026-11-07: "I had MESHY made a female skeleton and it didn't rig it... can you rig it,
 * and rig only the main parts we would need like head, spine, arms, fingers, legs"; "the jaw bone... it might need to be
 * split"; "How about pushing to main as a new model to test so I can test as like the poses").
 *
 *     node scripts/rigSkeleton.mjs
 *
 * Reads his Meshy skeleton (assets-archive/models/meshy-female-skeleton.glb: one fused mesh, T-pose, no rig) and Sarah's
 * own skeleton (public/models/sarah-v2-body-slim.glb), and writes public/models/sarah-skeleton.glb: the skeleton with
 * SARAH'S 68 BONES -- the same names, order and hierarchy, so the room's poses find it as they find her -- each placed on
 * the skeleton's own joints, plus a 69th, `Jaw`, under her head bone at the jaw joints. Every piece of bone is carried
 * rigidly by one bone (a fused joint softened over two rings so it stretches, never tears); the jaw is cut from the skull
 * along the bite so it opens clean.
 *
 * Coordinates below are the Meshy file's own (1.832 units tall, feet at -0.916, facing +z, the character's left +x). The
 * output is in metres at Sarah's size: skull top 1.69 m under her 1.70 m scalp, soles 1.5 cm up (her heel pad), its hip
 * joints on hers in x and z. MEASURED (renders and slices, 2026-11-07) unless a line says otherwise.
 */
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inFile = path.join(ROOT, 'assets-archive/models/meshy-female-skeleton.glb');
const sarahFile = path.join(ROOT, 'public/models/sarah-v2-body-slim.glb');
const outFile = path.join(ROOT, 'public/models/sarah-skeleton.glb');
const t0 = Date.now(), log = (...a) => console.log(`[rigSkeleton ${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const src = await io.read(inFile);
const prim = src.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL').getArray();
const UV = prim.getAttribute('TEXCOORD_0')?.getArray();
const I = prim.getIndices().getArray(), n = P.length / 3;
// Sarah's skeleton: each joint's name, parent and world position, as her file's nodes place it
const sarah = await (async () => {
  const doc = await io.read(sarahFile), joints = doc.getRoot().listSkins()[0].listJoints(), world = new Map();
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c*4+r] += a[k*4+r] * b[c*4+k]; return o; };
  const wm = (nd) => { if (world.has(nd)) return world.get(nd); const p = nd.getParentNode(); const m = p ? mul(wm(p), nd.getMatrix()) : nd.getMatrix(); world.set(nd, m); return m; };
  return joints.map((j) => { const m = wm(j), par = j.getParentNode(); return { name: j.getName(), parent: par ? joints.indexOf(par) : -1, world: [m[12], m[13], m[14]] }; });
})();
if (sarah.length !== 68) throw new Error(`rigSkeleton: Sarah's file has ${sarah.length} bones, not her 68`);

// ---- weld + adjacency (welded representatives) ----
const keyOf = (v) => `${P[v*3].toFixed(5)},${P[v*3+1].toFixed(5)},${P[v*3+2].toFixed(5)}`;
const seen = new Map(), weld = new Int32Array(n);
for (let v = 0; v < n; v++) { const k = keyOf(v); const w = seen.get(k); if (w === undefined) { seen.set(k, v); weld[v] = v; } else weld[v] = w; }
const deg = new Int32Array(n + 1);
for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = weld[I[t+e]], b = weld[I[t+(e+1)%3]]; if (a !== b) { deg[a]++; deg[b]++; } }
const off = new Int32Array(n + 1); for (let v = 0; v < n; v++) off[v+1] = off[v] + deg[v];
const adj = new Int32Array(off[n]), fill = off.slice(0, n);
for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = weld[I[t+e]], b = weld[I[t+(e+1)%3]]; if (a !== b) { adj[fill[a]++] = b; adj[fill[b]++] = a; } }
const reps = []; for (let v = 0; v < n; v++) if (weld[v] === v) reps.push(v);
log('vertices', n, 'welded', reps.length);

// ---- small vector helpers ----
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const lerp = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const mirror = (p) => [-p[0], p[1], p[2]];
const pos = (v) => [P[v*3], P[v*3+1], P[v*3+2]];
function segDist(p, a, b) { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1))); return len(sub(p, lerp(a, b, t))); }
function solve4(A, b) { // Gaussian elimination, 4x4
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 4; c++) { let p = c; for (let r = c+1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 5; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[4] / r[i]);
}
// A ball joint's head: the convex surface (normals pointing away from the centre) within a shell, least squares, iterated.
function fitBall(c0, r0, pick) {
  let c = c0.slice(), r = r0, m = 0;
  for (let it = 0; it < 10; it++) {
    const A = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], b = [0,0,0,0]; m = 0;
    for (const v of reps) {
      const p = pos(v); if (!pick(p)) continue;
      const d = sub(p, c), dl = len(d); if (Math.abs(dl - r) > 0.006 || dl === 0) continue;
      if ((N[v*3]*d[0] + N[v*3+1]*d[1] + N[v*3+2]*d[2]) / dl < 0.6) continue;
      const row = [2*p[0], 2*p[1], 2*p[2], 1], rhs = dot(p, p);
      for (let i = 0; i < 4; i++) { b[i] += row[i] * rhs; for (let j = 0; j < 4; j++) A[i][j] += row[i] * row[j]; }
      m++;
    }
    if (m < 50) break;
    const s = solve4(A, b); c = [s[0], s[1], s[2]]; r = Math.sqrt(s[3] + dot(c, c));
  }
  return { c, r, m };
}

// ---- joints, Meshy coordinates (right side, x < 0; the left mirrors) ----
// the femoral heads sit deep in their sockets, so a fit takes the rim as well; placed on the front render instead (hip3)
// (a shell fit gives (-0.1036, -0.0007, -0.0323) r 0.029, rim included; the ball seen from the front is centred at x -0.111
// r 0.0215, hip4): between the two
const hipR = { c: [-0.108, -0.003, -0.033], r: 0.024, m: 'placed' }, hipL = { c: [0.108, -0.003, -0.033], r: 0.024, m: 'placed' };
const shR = fitBall([-0.185, 0.572, -0.072], 0.024, (p) => p[0] < -0.168 && p[0] > -0.23 && p[1] < 0.598);
const shL = fitBall([0.185, 0.572, -0.072], 0.024, (p) => p[0] > 0.168 && p[0] < 0.23 && p[1] < 0.598);
log('femoral heads', JSON.stringify([hipR, hipL].map((b) => ({ c: b.c.map((x) => +x.toFixed(4)), r: +b.r.toFixed(4), m: b.m }))));
log('humeral heads', JSON.stringify([shR, shL].map((b) => ({ c: b.c.map((x) => +x.toFixed(4)), r: +b.r.toFixed(4), m: b.m }))));
const avgMirror = (a, b) => { const m = [(-a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; return m; }; // right-side point, |x| averaged
const hip = avgMirror(hipR.c, hipL.c), shoulder = avgMirror(shR.c, shL.c);
const HIP = [-hip[0], hip[1], hip[2]], SHOULDER = [-shoulder[0], shoulder[1], shoulder[2]];

// the wrist where the radius meets the carpals, the hand bone where the carpals meet the palm (render wrist-0)
const ELBOW = [-0.497, 0.557, -0.080], WRIST = [-0.748, 0.553, -0.046], HAND = [-0.787, 0.552, -0.042];
// fingers: initial lines from the slices (fingers.mjs), refined below
let fingers = {
  thumb: [[-0.772, 0.537, -0.018], [-0.808, 0.523, 0.004], [-0.835, 0.514, 0.021], [-0.858, 0.510, 0.032]],
  index: [[-0.850, 0.555, -0.008], [-0.886, 0.557, -0.004], [-0.909, 0.557, -0.003], [-0.928, 0.557, -0.003]],
  middle: [[-0.855, 0.558, -0.034], [-0.898, 0.562, -0.033], [-0.926, 0.561, -0.033], [-0.951, 0.560, -0.034]],
  ring: [[-0.850, 0.557, -0.058], [-0.890, 0.562, -0.055], [-0.917, 0.561, -0.053], [-0.940, 0.561, -0.053]],
  pinky: [[-0.840, 0.555, -0.078], [-0.870, 0.557, -0.075], [-0.893, 0.557, -0.074], [-0.913, 0.557, -0.073]],
};
const SHARE = { thumb: [0.43, 0.75], finger: [0.47, 0.75] }; // joint places along the line: BIOLOGICAL SHAPE (phalanx proportions)
const NAMES = Object.keys(fingers);
function polyDist(p, line) { let d = Infinity; for (let k = 0; k + 1 < line.length; k++) d = Math.min(d, segDist(p, line[k], line[k+1])); return d; }
for (let round = 0; round < 3; round++) {
  const bins = Object.fromEntries(NAMES.map((f) => [f, new Map()])), far = Object.fromEntries(NAMES.map((f) => [f, 0]));
  for (const v of reps) {
    const p = pos(v); if (p[0] > -0.79 || p[1] < 0.48) continue; // right hand only (the left is its mirror)
    let best = null, bd = Infinity;
    for (const f of NAMES) { const L = fingers[f]; if (-p[0] < -L[0][0] + 0.004) continue; const d = polyDist(p, L); if (d < bd) { bd = d; best = f; } }
    if (!best || bd > 0.012) continue;
    const a = -p[0], k = Math.round(a / 0.0025), m = bins[best];
    const e = m.get(k) ?? m.set(k, [0, 0, 0, 0]).get(k); e[0] += p[1]; e[1] += p[2]; e[2]++; far[best] = Math.max(far[best], a);
  }
  for (const f of NAMES) {
    const L = fingers[f], m = bins[f], base = -L[0][0], tip = far[f] - 0.003;
    const at = (a) => { let best = null; for (const [k, e] of m) if (e[2] >= 5 && (!best || Math.abs(k * 0.0025 - a) < Math.abs(best[0] * 0.0025 - a))) best = [k, e]; return best ? [best[1][0] / best[1][2], best[1][1] / best[1][2]] : null; };
    const share = f === 'thumb' ? SHARE.thumb : SHARE.finger;
    const next = [L[0]];
    for (const s of [...share, 1]) {
      const a = base + (tip - base) * s, yz = at(a) ?? [L[0][1], L[0][2]];
      next.push([-a, yz[0], yz[1]]);
    }
    fingers[f] = next;
  }
}
log('fingers', JSON.stringify(Object.fromEntries(NAMES.map((f) => [f, fingers[f].map((p) => p.map((x) => +x.toFixed(3)))]))));

const KNEE = [-0.095, -0.428, -0.052], ANKLE = [-0.083, -0.822, -0.050], BALL = [-0.105, -0.892, 0.075], TOE = [-0.098, -0.905, 0.148];
const SPINE = {
  root: [0, HIP[1] + 0.02, HIP[2]], pelvis: [0, 0.095, -0.045], lumbar34: [0, 0.16, -0.032], lumbar12: [0, 0.225, -0.030],
  chest: [0, 0.265, -0.035], neck: [0, 0.612, -0.050], head: [0, 0.700, -0.045], top: [0, 0.885, -0.030],
};
const CLAVICLE = [-0.025, 0.552, 0.022];

// Sarah's order: index -> Meshy point
const place = new Array(68);
const spineOrder = ['root', 'pelvis', 'lumbar34', 'lumbar12', 'chest', 'neck', 'head', 'top'];
spineOrder.forEach((k, i) => (place[i] = SPINE[k]));
const armRight = [CLAVICLE, SHOULDER, ELBOW, WRIST, HAND, ...fingers.thumb, ...fingers.pinky, ...fingers.ring, ...fingers.index, ...fingers.middle];
armRight.forEach((p, k) => { place[8 + k] = p; place[33 + k] = mirror(p); });
[HIP, KNEE, ANKLE, BALL, TOE].forEach((p, k) => { place[58 + k] = p; place[63 + k] = mirror(p); });
for (let i = 0; i < 68; i++) if (!place[i]) throw new Error(`joint ${i} not placed`);
// THE JAW (Joshua, 2026-11-07: "the jaw bone… it might need to be split as it appears could be joined together closed"): a
// 69th bone after Sarah's 68, a child of her head bone, its joint between the two jaw joints (condyles, render skull-90)
const JAW = [0, 0.765, -0.025];
// THE BITE (Joshua, 2026-11-07: "You have the jaw split too high in front, but the jaw rotation point is correct"; then,
// circling the jaw on the render, "Need to be a little lower in the jaw… you can naturally see the ridge line"): the
// ridge where the upper front teeth overhang the lower, a step in the teeth's outer face at 0.717 on the midline
// (crease.mjs), followed back along his line (raycast from his circle: 0.714-0.718 at the front, 0.721-0.722 at the
// premolars and molars, 0.725-0.727 where it meets the jaw's branch). MEASURED.
const BITE = { front: 0.717, back: 0.725, frontZ: 0.078, backZ: 0.015 };
const biteAt = (z) => BITE.front + (BITE.back - BITE.front) * Math.max(0, Math.min(1, (BITE.frontZ - z) / (BITE.frontZ - BITE.backZ)));
place.push(JAW);
const BONES = [...sarah, { name: 'Jaw', parent: 6, world: null }];

// ---- labels: which bone carries each vertex (rough rules, then cleaned by connectivity) ----
const B = { root: 0, pelvis: 1, l34: 2, l12: 3, chest: 4, neck: 5, head: 6, jaw: 68 };
const arm = (left) => { const o = left ? 33 : 8; return { clav: o, upper: o+1, fore: o+2, wrist: o+3, hand: o+4, thumb: o+5, pinky: o+9, ring: o+13, index: o+17, middle: o+21 }; };
const leg = (left) => { const o = left ? 63 : 58; return { thigh: o, shin: o+1, foot: o+2, toes: o+3 }; };
const handSegments = (left) => {
  const A = arm(left), m = left ? mirror : (p) => p, segs = [[A.wrist, WRIST, HAND]];
  for (const f of ['index', 'middle', 'ring', 'pinky']) segs.push([A.hand, HAND, fingers[f][0]]);
  for (const f of NAMES) { const L = fingers[f]; for (let k = 0; k < 3; k++) segs.push([A[f] + k, L[k], L[k+1]]); }
  return segs.map(([b, a, c]) => [b, m(a), m(c)]);
};
const HANDS = [handSegments(false), handSegments(true)];
const ballCut = (a) => 0.085 - Math.max(0, Math.min(1, (a - 0.07) / 0.08)) * 0.035; // the MTP line runs back from the big toe to the little one
function scapulaCut(y) { return y < 0.52 ? -0.127 : y > 0.545 ? -0.103 : -0.127 + (y - 0.52) / 0.025 * 0.024; }
const label = new Int16Array(n).fill(-1);
for (const v of reps) {
  const [x, y, z] = pos(v), a = Math.abs(x), left = x > 0, A = arm(left), Lg = leg(left);
  const sh = left ? mirror(SHOULDER) : SHOULDER, hp = left ? mirror(HIP) : HIP;
  const nx = N[v*3], ny = N[v*3+1], nz = N[v*3+2];
  const convexTo = (c, r) => { const d = [x - c[0], y - c[1], z - c[2]], dl = len(d); return dl < r + 0.007 && (nx*d[0] + ny*d[1] + nz*d[2]) / (dl || 1) > 0.2; };
  let b;
  if ((y >= 0.70 || (y >= 0.64 && z > -0.022) || (y >= 0.66 && a > 0.038 && a < 0.07)) && a < 0.12) b = B.head; // the skull, and the jaw hanging in front of the neck
  else if (y > 0.44 && a >= 0.20 && a < WRIST[0] * -1) b = a < -ELBOW[0] ? A.upper : A.fore;
  else if (y > 0.44 && a >= -WRIST[0]) { let bd = Infinity; for (const [bone, s, e] of HANDS[left ? 1 : 0]) { const d = segDist([x, y, z], s, e); if (d < bd) { bd = d; b = bone; } } }
  else if (a >= 0.165 && y > 0.5 && convexTo(sh, (left ? shL : shR).r)) b = A.upper;
  else if (y >= 0.36 && y < 0.64 && a >= 0.05 && a < 0.215 && z < scapulaCut(y)) b = A.clav;            // scapula, behind the ribs
  else if (y >= 0.53 && y < 0.612 && a >= 0.035 && a < 0.17 && z > -0.05) b = A.clav;                     // clavicle
  else if (y >= 0.50 && y < 0.64 && a >= 0.13 && a < 0.215) b = A.clav;                                   // acromion, coracoid, glenoid
  else if (y >= 0.612 && y < 0.70 && a < 0.042) b = B.neck;
  else if ((y < -0.09 && a > 0.02) || (y < -0.035 && a > 0.105) || (y < 0.01 && a > 0.13)
    || (a > 0.105 && segDist([a, y, z], [Math.abs(hp[0]), hp[1], hp[2]], [0.150, -0.050, -0.035]) < 0.017 && y < 0.012)
    || (a > 0.085 && a < 0.14 && y > -0.03 && y < 0.03 && convexTo(hp, (left ? hipL : hipR).r))) {
    b = y >= -0.43 ? Lg.thigh : y >= -0.815 ? Lg.shin : z < ballCut(a) ? Lg.foot : Lg.toes;
  }
  else if (y < 0.095 || (y < 0.16 && a >= 0.045)) b = B.pelvis;
  else if (y < 0.265 && (a < 0.05 || y < 0.20)) b = y < 0.16 ? B.pelvis : y < 0.225 ? B.l34 : B.l12;
  else if (y < 0.612) b = B.chest;
  else b = y < 0.66 ? B.chest : B.neck; // the first rib, curling over the top of the chest
  label[v] = b;
}
// the lower jaw: below the bite, and its two branches up to the jaw joints; not the hyoid under it, not the neck behind it
for (const v of reps) {
  const [x, y, z] = pos(v), a = Math.abs(x);
  if (label[v] !== B.head || z < -0.046 || a > 0.068 || y < 0.655 || y > 0.775) continue;
  const hyoid = y < 0.705 && a < 0.042 && z < 0.025, behindChin = a < 0.03 && z < 0.0;
  const body = y < biteAt(z) && !hyoid && !behindChin;
  const ramus = y >= biteAt(z) && a >= 0.046 && z < 0.022 && (y < 0.762 || a < 0.06); // (the branch is outside the upper molars)
  const behindRamus = y >= 0.715 && z < -0.02 - (y - 0.72) * 0.5; // the mastoid, behind the branch as it climbs back to the joint
  const besideJoint = a > 0.058 && z < -0.012 && y > 0.728; // the ear's bone, just outside and behind the jaw joint (raycast)
  if ((body || ramus) && !behindRamus && !besideJoint) label[v] = B.jaw;
}

// connectivity cleanup: a piece of one label that is cut off from the rest of it and touches another is the other's
function components() {
  const comp = new Int32Array(n).fill(-1), sizes = [], labelOf = [];
  for (const v of reps) {
    if (comp[v] >= 0) continue;
    const id = sizes.length, L = label[v], stack = [v]; comp[v] = id; let s = 0;
    while (stack.length) { const u = stack.pop(); s++; for (let k = off[u]; k < off[u+1]; k++) { const w = adj[k]; if (comp[w] < 0 && label[w] === L) { comp[w] = id; stack.push(w); } } }
    sizes.push(s); labelOf.push(L);
  }
  return { comp, sizes, labelOf };
}
for (let round = 0; round < 8; round++) {
  const { comp, sizes, labelOf } = components();
  const biggest = new Map(); sizes.forEach((s, id) => { const L = labelOf[id]; if (!biggest.has(L) || s > sizes[biggest.get(L)]) biggest.set(L, id); });
  const total = new Map(); sizes.forEach((s, id) => total.set(labelOf[id], (total.get(labelOf[id]) ?? 0) + s));
  const touches = new Map(); // comp id -> Map(label -> edges)
  for (const v of reps) { const c = comp[v]; if (biggest.get(labelOf[c]) === c) continue; for (let k = off[v]; k < off[v+1]; k++) { const w = adj[k], L = label[w]; if (L === label[v]) continue; const m = touches.get(c) ?? touches.set(c, new Map()).get(c); m.set(L, (m.get(L) ?? 0) + 1); } }
  let moved = 0, movedVerts = 0;
  const target = new Map();
  for (const [c, m] of touches) {
    if (sizes[c] > 0.2 * total.get(labelOf[c])) continue;
    let best = -1, bc = 0; for (const [L, e] of m) if (e > bc) { bc = e; best = L; }
    if (best >= 0) { target.set(c, best); moved++; movedVerts += sizes[c]; if (sizes[c] > 300) log('  moved', sizes[c], 'vertices of bone', labelOf[c], 'to bone', best); }
  }
  if (!moved) { log('cleanup settled after', round, 'rounds'); break; }
  for (const v of reps) { const t = target.get(comp[v]); if (t !== undefined) label[v] = t; }
  log('cleanup round', round, 'moved', moved, 'pieces,', movedVerts, 'vertices');
}
// the ball of each femur and humerus is its bone's whatever the cleanup made of it: the socket around it is concave
// (its normals face the centre), the ball convex
for (const v of reps) {
  const p = pos(v), left = p[0] > 0, nn = [N[v*3], N[v*3+1], N[v*3+2]];
  for (const [c, r, bone] of [[left ? mirror(HIP) : HIP, 0.024, leg(left).thigh], [left ? mirror(SHOULDER) : SHOULDER, (left ? shL : shR).r, arm(left).upper]]) {
    const d = sub(p, c), dl = len(d);
    if (dl < r + 0.005 && dot(nn, d) > 0.3 * dl && Math.abs(p[0]) > Math.abs(c[0]) - r * 0.65) label[v] = bone;
  }
}
for (let v = 0; v < n; v++) label[v] = label[weld[v]];

// ---- weights: one bone each, softened over two rings where two bones meet (a fused joint stretches, not tears) ----
const W = new Map(); // welded vertex -> Map(bone -> weight), only near borders
// (the jaw and the skull are not blended: they are cut apart below, so the jaw opens clean)
const parted = (p, q) => (p === B.head && q === B.jaw) || (p === B.jaw && q === B.head);
const border = [];
for (const v of reps) { for (let k = off[v]; k < off[v+1]; k++) if (label[adj[k]] !== label[v] && !parted(label[adj[k]], label[v])) { border.push(v); break; } }
const near = new Set(border); for (let ring = 0; ring < 2; ring++) for (const v of [...near]) for (let k = off[v]; k < off[v+1]; k++) near.add(adj[k]);
for (const v of near) W.set(v, new Map([[label[v], 1]]));
for (let it = 0; it < 3; it++) {
  const next = new Map();
  for (const v of near) {
    const acc = new Map(W.get(v)), cnt = off[v+1] - off[v];
    for (const [b, w] of acc) acc.set(b, w * cnt);
    for (let k = off[v]; k < off[v+1]; k++) { const w = adj[k]; if (parted(label[w], label[v])) continue; const src = W.get(w) ?? new Map([[label[w], 1]]); for (const [b, x] of src) acc.set(b, (acc.get(b) ?? 0) + x); }
    let s = 0; for (const x of acc.values()) s += x; for (const [b, x] of acc) acc.set(b, x / s);
    next.set(v, acc);
  }
  for (const [v, m] of next) W.set(v, m);
}
const JOINTS = new Uint8Array(n * 4), WEIGHTS = new Float32Array(n * 4);
for (let v = 0; v < n; v++) {
  const m = W.get(weld[v]);
  if (!m) { JOINTS[v*4] = label[v]; WEIGHTS[v*4] = 1; continue; }
  const top = [...m].sort((p, q) => q[1] - p[1]).slice(0, 4); const s = top.reduce((t, e) => t + e[1], 0);
  top.forEach(([b, w], k) => { JOINTS[v*4+k] = b; WEIGHTS[v*4+k] = w / s; });
}
const count = new Map(); for (const v of reps) count.set(label[v], (count.get(label[v]) ?? 0) + 1);
// THE SPLIT: a triangle with a corner on the skull and a corner on the jaw goes whole to whichever has more of it, its
// other corners copied for it, so no triangle spans the bite (opening the jaw parts the teeth instead of stretching them)
const idx = new Uint32Array(I), dupOf = new Map(), dups = []; // dups: [source vertex, bone]
for (let t = 0; t < idx.length; t += 3) {
  let h = 0, j = 0; for (let k = 0; k < 3; k++) { const L = label[idx[t+k]]; if (L === B.head) h++; else if (L === B.jaw) j++; }
  if (!h || !j) continue;
  const keep = j > h ? B.jaw : B.head;
  for (let k = 0; k < 3; k++) {
    const v = idx[t+k], L = label[v]; if (L === keep || !parted(L, keep)) continue;
    const key = v * 128 + keep; let d = dupOf.get(key);
    if (d === undefined) { d = n + dups.length; dupOf.set(key, d); dups.push([v, keep]); }
    idx[t+k] = d;
  }
}
const n2 = n + dups.length;
// the cut through the teeth follows triangle edges and comes out saw-toothed; its corners near the bite are laid on it
const onCut = new Set();
for (let t = 0; t < idx.length; t += 3) { const ls = [0, 1, 2].map((k) => label[I[t+k]]); if (ls.includes(B.head) && ls.includes(B.jaw)) for (let k = 0; k < 3; k++) onCut.add(I[t+k]); }
const snapped = new Set();
for (const v of onCut) { const [x, y, z] = pos(v); if (Math.abs(y - biteAt(z)) < 0.006 && z > -0.005 && Math.abs(x) < 0.06) snapped.add(v); }
log('jaw split:', dups.length, 'corners copied');

// ---- into Sarah's space ----
const K = 1.675 / 1.832; // MEASURED (Meshy span 1.832 units) -> GAME TUNING (skull top 1.69 m under her 1.70 m scalp)
const sarahHip = [(sarah[58].world[0] + sarah[63].world[0]) / 2, (sarah[58].world[2] + sarah[63].world[2]) / 2];
const OX = sarahHip[0] - 0, OZ = sarahHip[1] - HIP[2] * K;
const toSarah = (p) => [p[0] * K + OX, (p[1] + 0.916) * K + 0.015, p[2] * K + OZ];
const outP = new Float32Array(n2 * 3), outN = new Float32Array(n2 * 3), outUV = UV ? new Float32Array(n2 * 2) : null;
const outJ = new Uint8Array(n2 * 4), outW = new Float32Array(n2 * 4);
for (let v = 0; v < n2; v++) {
  const s0 = v < n ? v : dups[v - n][0];
  const p0 = pos(s0); if (snapped.has(s0)) p0[1] = biteAt(p0[2]);
  outP.set(toSarah(p0), v * 3); outN.set(N.subarray(s0 * 3, s0 * 3 + 3), v * 3); if (UV) outUV.set(UV.subarray(s0 * 2, s0 * 2 + 2), v * 2);
  if (v < n) { outJ.set(JOINTS.subarray(v * 4, v * 4 + 4), v * 4); outW.set(WEIGHTS.subarray(v * 4, v * 4 + 4), v * 4); }
  else { outJ[v * 4] = dups[v - n][1]; outW[v * 4] = 1; }
}
const world = place.map(toSarah);

// ---- the file ----
const doc = new Document(), buf = doc.createBuffer();
const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buf);
const mat = doc.createMaterial('bone').setBaseColorFactor([0.87, 0.82, 0.72, 1]).setRoughnessFactor(0.6).setMetallicFactor(0);
const p2 = doc.createPrimitive().setAttribute('POSITION', acc('VEC3', outP)).setAttribute('NORMAL', acc('VEC3', outN))
  .setAttribute('JOINTS_0', acc('VEC4', outJ)).setAttribute('WEIGHTS_0', acc('VEC4', outW)).setIndices(acc('SCALAR', idx)).setMaterial(mat);
if (UV) p2.setAttribute('TEXCOORD_0', acc('VEC2', outUV));
const mesh = doc.createMesh('sarahSkeleton').addPrimitive(p2);
const nodes = BONES.map((j) => doc.createNode(j.name));
BONES.forEach((j, i) => { const par = j.parent; const w = world[i], pw = par >= 0 ? world[par] : [0, 0, 0]; nodes[i].setTranslation([w[0]-pw[0], w[1]-pw[1], w[2]-pw[2]]); if (par >= 0) nodes[par].addChild(nodes[i]); });
const armature = doc.createNode('SkeletonArmature').addChild(nodes[0]);
const ibm = new Float32Array(16 * BONES.length);
world.forEach((w, i) => { ibm.set([1,0,0,0, 0,1,0,0, 0,0,1,0, -w[0],-w[1],-w[2],1], i * 16); });
const skin = doc.createSkin('sarahSkeletonSkin').setSkeleton(nodes[0]).setInverseBindMatrices(acc('MAT4', ibm));
nodes.forEach((nd) => skin.addJoint(nd));
const meshNode = doc.createNode('sarahSkeleton').setMesh(mesh).setSkin(skin);
doc.createScene('Scene').addChild(armature).addChild(meshNode);
// packed as her own files are (EXT_meshopt_compression, quantized): the room reads its bind through the skin
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outFile, doc);
log('wrote', path.relative(ROOT, outFile), '--', BONES.length, 'bones,', count.size, 'carrying bone');
