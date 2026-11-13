/**
 * HER SIDES HOLD STILL UNDER HER ARMS (Joshua, 2026-11-12: "do a test around the underarms and make sure we can lock the
 * skin from stretching especially if trying to paint"; "place it the same height like the bikini top lower strap that goes
 * under the underarms as that is where I saw it the worst when I tried to paint it"; and of the ways the test showed him,
 * "I'd do A" -- locked for good, the soft one of the two).
 *
 * THE CAUSE, MEASURED. Her armpits' weights (`sarahV2ArmWeights.mjs`, 2026-10-15) spread her arm's share along her skin,
 * and it runs on down her side: up to 0.56 of a point at her armpit, 0.3 four centimetres under it, the last of it 25 cm
 * down. Her raised-arm shapes (armRaiseL/R) draw the same skin toward her shoulder, by up to 70 mm. So with her arms level
 * (the room, T-POSE, ARMS 90) her side rode up her: at the bikini top's lower strap, 2.0 and 2.4 cm under her armpits, 46.3
 * mm on average and 89.2 mm at the most. A strap painted level there with her arms up dropped up to 66.7 mm when they came
 * down, and anything drawn there with them down climbed into her armpit when they rose.
 *
 * THE LOCK. On her TRUNK -- her skin joined to her belly through triangles wholly below her armpits -- her arm's bones (each
 * upper arm and every bone under it) keep their share at her armpit's own height and lose it, eased, over the `SIDE_LOCK.toM`
 * below that: none from there down. What they give up goes to the bones that already hold the point (her chest and spine),
 * in their own proportions. Her two raised-arm shapes fade over the same band. Her arm itself, her shoulder, and all of her
 * at or above her armpit keep their numbers exactly.
 *
 * How far below her armpit a point lies is read EVENED OVER HER MESH: the file's rest mesh is laid unevenly along her sides
 * (MEASURED: a point sits 1.4 to 2.0 mm, up to 13 mm, off the middle of its neighbours there), so a fade read from raw
 * heights would jump between neighbours. Each point of her trunk within `evenWithinM` of her armpit takes the mean of its
 * neighbours' depths, `evenPasses` times over; everything else is held.
 *
 * WHAT IT GIVES, MEASURED IN THE ROOM (2026-11-12, a line painted level at the strap's height with ARMS at 90, then her
 * arms brought down): the line within 2.6 mm at every arm position (66.7 before), her skin under the strap 3.1 mm up on
 * average with her arms level (46.3 before). WHAT IT COSTS: her arm's stretch is taken up in the 2 cm under her armpit, so
 * a crease shows there with her arms raised, and that band is rougher when she reaches forward. The tight lock he was
 * shown beside it (0 to 1 cm) held the strap to 0.2 mm and creased harder; he chose this one.
 *
 * WHAT IS WORN ON HER SIDE GOES WITH IT. A part modelled in her file with weights of its own takes the fade of the nearest
 * point of her trunk's skin, evened along the part (`wornPasses`), so it stays with her skin as her skin now moves and
 * runs smooth. That is the bikini top's lower strap (MEASURED: 3,228 of its 4,248 points carried up to 0.35 of her arm; no
 * other part of the bikini in the file carries any below her armpits). MEASURED with her arms level: the strap under her
 * arms rose 50.5 mm on average (78.7 at the most) and now 0.8 (3.4), a level line. What is painted on her, laid on her as
 * cloth or made from her skin in the room rides her skin already. THE LIGHT TEE'S OWN FILE IS LEFT AS IT IS
 * (`sarah-v2-spandex-lite.glb`, drawn by its own weights only while CLOTH SIM is off): it stands off her side, and rides
 * up with her arms as a tee does (MEASURED with her arms level: 12 mm off her side on average before the lock and 16 mm
 * with it; 19 of its points there more than 3 mm under her skin before, 17 with it).
 *
 * THE FILES. The room's body, `public/models/sarah-v2-body-slim.glb`, and its KTX2 twin are rewritten: WEIGHTS_0 and the two
 * shapes' POSITION, of her skin and of that strap, at the points the lock reaches. Each file is decoded again as written
 * and every other array, map, material, bone and matrix in it is held to what it was, or nothing is replaced. The approved
 * `assets-archive/models/sarah-v2-body.glb` is not read or written (`tests/sarahV2SideLock.test.ts` holds the room's file
 * to it: the approved numbers with this rule applied, and nothing else). A file that already carries the lock (its mesh's
 * `sideLock` note) is refused, since a fade is not applied twice: to lay it with other numbers, start from the file as it
 * was before (git: 5b07495).
 *
 *   node scripts/sarahV2SideLock.mjs                        both of the room's body files, in place
 *   node scripts/sarahV2SideLock.mjs <from.glb> <to.glb>    one file
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { createHash } from 'node:crypto';
import { renameSync, rmSync, statSync } from 'node:fs';

export const SIDE_LOCK = Object.freeze({
  /** GAME TUNING (metres straight down from her armpit): her arm's share and her raised-arm shapes are whole at `fromM`, gone from `toM`. */
  fromM: 0,
  toM: 0.02,
  /** How many times the depth below her armpit is evened over her mesh (see the header). */
  evenPasses: 30,
  /** Her trunk is evened this far below her armpit, metres (MEASURED: her arm's share ends 25 cm down). */
  evenWithinM: 0.3,
  /**
   * How many times a worn part's fade is evened along the part's own mesh (GAME TUNING, against renders of the bikini top's
   * lower strap, a cord that lies along the band's lower edge, with her arms level). Taken raw from the nearest vertex of
   * her skin the fade differed from one point of the cord to the next and the cord stood up in teeth (MEASURED: a point up
   * to 7.5 mm off its neighbours). Evened 8 times the teeth were gone and the cord ran in waves (4.8 mm, her skin's own
   * last creep under it); 30 times, 2.8 mm; 300 times, 0.7 mm, a smooth line. A cord follows her skin's creep less the more
   * it is evened, so more of it lies a little under her skin: 22 of its 4,248 points by over 2 mm, 2.9 mm at the deepest
   * (none and 1.6 mm before the lock; held quite still, 64 and 3.6 mm).
   */
  wornPasses: 300,
});
/** What a locked file says of itself, on its mesh. */
export const SIDE_LOCK_NOTE = "2026-11-12 her sides hold under her arms: her arm bones' share and her raised-arm shapes faded out over the 20 mm below each armpit";
/** The room's body files (the second is the first with her colour map as KTX2). */
export const SIDE_LOCK_FILES = Object.freeze(['public/models/sarah-v2-body-slim.glb', 'public/models/sarah-v2-body-slim-ktx2.glb']);
/** Her two raised-arm shapes (`sarahV2ArmWeights.mjs`). */
export const SIDE_LOCK_SHAPES = Object.freeze(['armRaiseL', 'armRaiseR']);
/** MEASURED on her file, metres in her rest frame: her midline (her spine's bones stand at x = 0.00332), the heights her armpits lie between (they are at 1.2484 and 1.2525), and her belly's front (its height and how far forward). */
export const MIDLINE_X_M = 0.0033;
const ARMPIT_BETWEEN_M = [1.15, 1.45];
const BELLY_AT_M = [1.0, 0.1];
/** A point of skin this far outside her elbow's joint is her arm's (metres). */
const ELBOW_OUT_M = 0.03;

const mul = (x, y) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) o[c * 4 + r] += x[k * 4 + r] * y[c * 4 + k]; return o; };
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Rounded to the nearest whole number, a half to the even one (so the bytes do not lean). */
export const roundEven = (x) => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r; };

/**
 * Her seams welded: a point of skin that is two or three vertices (her mesh is split along its texture seams) becomes one.
 * `pointOf` a vertex's point, `rep` one vertex of each point. The points are numbered in order of their place, so what is
 * summed over a point's neighbours does not depend on the order her vertices come in.
 */
export function weld(rest, grid = 1e-5) {
  const n = rest.length / 3, key = new Float64Array(n * 3), order = new Int32Array(n);
  for (let i = 0; i < n; i += 1) { order[i] = i; for (let c = 0; c < 3; c += 1) key[i * 3 + c] = roundEven(rest[i * 3 + c] / grid); }
  order.sort((a, b) => key[a * 3] - key[b * 3] || key[a * 3 + 1] - key[b * 3 + 1] || key[a * 3 + 2] - key[b * 3 + 2] || a - b);
  const pointOf = new Int32Array(n), rep = [];
  for (let k = 0; k < n; k += 1) {
    const i = order[k], j = k ? order[k - 1] : -1;
    if (j < 0 || key[i * 3] !== key[j * 3] || key[i * 3 + 1] !== key[j * 3 + 1] || key[i * 3 + 2] !== key[j * 3 + 2]) rep.push(i);
    pointOf[i] = rep.length - 1; rep[rep.length - 1] = i;
  }
  return { pointOf, rep: Int32Array.from(rep), count: rep.length };
}

/** Each point's neighbours over the triangles (welded points, three a triangle), each once, in order. */
function neighbours(tri, count) {
  const pairs = new Set(), near = Array.from({ length: count }, () => []);
  for (let t = 0; t < tri.length; t += 3) for (const [a, b] of [[tri[t], tri[t + 1]], [tri[t + 1], tri[t + 2]], [tri[t + 2], tri[t]]]) {
    if (a === b) continue;
    const k = a < b ? a * count + b : b * count + a; if (pairs.has(k)) continue;
    pairs.add(k); near[a].push(b); near[b].push(a);
  }
  for (const list of near) list.sort((a, b) => a - b);
  return near;
}

/** A number a vertex evened over a mesh: every point takes the mean of its neighbours', `passes` times over (seam copies are one point). */
export function evenOver(values, rest, index, passes) {
  const { pointOf, rep, count } = weld(rest), tri = new Int32Array(index.length);
  for (let k = 0; k < index.length; k += 1) tri[k] = pointOf[index[k]];
  const near = neighbours(tri, count);
  let d = new Float64Array(count), next = new Float64Array(count);
  for (let u = 0; u < count; u += 1) d[u] = values[rep[u]];
  for (let pass = 0; pass < passes; pass += 1) {
    for (let u = 0; u < count; u += 1) { if (!near[u].length) { next[u] = d[u]; continue; } let sum = 0; for (const v of near[u]) sum += d[v]; next[u] = sum / near[u].length; }
    [d, next] = [next, d];
  }
  const out = new Float64Array(values.length); for (let i = 0; i < out.length; i += 1) out[i] = d[pointOf[i]];
  return out;
}

/** Which points are joined through the triangles `keep` passes: `find(point)` names its group. */
function groups(tri, count, keep) {
  const parent = new Int32Array(count); for (let u = 0; u < count; u += 1) parent[u] = u;
  const find = (u) => { while (parent[u] !== u) { parent[u] = parent[parent[u]]; u = parent[u]; } return u; };
  for (let t = 0; t < tri.length; t += 3) {
    if (!keep(t / 3)) continue;
    const a = find(tri[t]), b = find(tri[t + 1]); if (a !== b) parent[b] = a;
    const c = find(tri[t + 2]), d = find(a); if (c !== d) parent[c] = d;
  }
  return find;
}

/**
 * HER ARMS AND HER TRUNK, AND HOW FAR EACH POINT OF HER TRUNK LIES BELOW ITS ARMPIT.
 *
 * `rest` her skin's points (metres, her rest frame: +y up, +x her left), `index` its triangles, `midX` her midline,
 * `elbows` her two elbow joints. An armpit's height is the highest level below which her arm is still a piece of its own:
 * cut her skin at a height, keep the triangles wholly below it, and her arm (the skin by her elbow) and her trunk (her
 * belly) are joined or they are not. Returns per vertex: `arm` (+1 her +x arm below its armpit, -1 the other, 0 the rest of
 * her), `trunkBelow` (1 where she is joined to her belly below both armpits and lies below her own side's), `drop` (metres
 * below her side's armpit, evened over her mesh as the header says); and `cut`, the two armpits' heights (+x, -x).
 */
export function sideRegions({ rest, index, midX = MIDLINE_X_M, elbows }, lock = SIDE_LOCK) {
  const n = rest.length / 3, { pointOf, rep, count } = weld(rest);
  const tri = new Int32Array(index.length); for (let k = 0; k < index.length; k += 1) tri[k] = pointOf[index[k]];
  const nt = tri.length / 3, top = new Float64Array(nt), y = (u) => rest[rep[u] * 3 + 1];
  for (let t = 0; t < nt; t += 1) top[t] = Math.max(y(tri[t * 3]), y(tri[t * 3 + 1]), y(tri[t * 3 + 2]));
  const nearest = (x, yy, z) => { let best = -1, bd = Infinity; for (let u = 0; u < count; u += 1) { const i = rep[u] * 3, d = (rest[i] - x) ** 2 + (rest[i + 1] - yy) ** 2 + (rest[i + 2] - z) ** 2; if (d < bd) { bd = d; best = u; } } return best; };
  const belly = nearest(midX, BELLY_AT_M[0], BELLY_AT_M[1]);
  const armOf = new Int8Array(count), trunkOf = new Uint8Array(count).fill(1), cut = [NaN, NaN];
  for (const e of elbows) {
    const sgn = e[0] >= midX ? 1 : -1, seed = nearest(e[0] + ELBOW_OUT_M * sgn, e[1], e[2]);
    let [lo, hi] = ARMPIT_BETWEEN_M;
    for (let k = 0; k < 24; k += 1) { const h = (lo + hi) / 2, find = groups(tri, count, (t) => top[t] < h); if (find(seed) !== find(belly)) lo = h; else hi = h; }
    const find = groups(tri, count, (t) => top[t] < lo), a = find(seed), b = find(belly);
    if (a === b) throw new Error('her arm is not a piece of its own below her armpit');
    for (let u = 0; u < count; u += 1) { const g = find(u); if (g === a) armOf[u] = sgn; if (g !== b) trunkOf[u] = 0; }
    cut[sgn > 0 ? 0 : 1] = lo;
  }
  if (!(cut[0] > 0 && cut[1] > 0)) throw new Error('expected an elbow on each side of her');
  // each point's depth below its own side's armpit, as the file lays it
  const raw = new Float64Array(n), trunkBelow = new Uint8Array(n), arm = new Int8Array(n);
  for (let i = 0; i < n; i += 1) {
    raw[i] = (rest[i * 3] >= midX ? cut[0] : cut[1]) - rest[i * 3 + 1];
    arm[i] = armOf[pointOf[i]];
    trunkBelow[i] = trunkOf[pointOf[i]] && raw[i] > 0 ? 1 : 0;
  }
  // ...and evened over her mesh: each point's neighbours, over every triangle of her
  const near = neighbours(tri, count);
  let d = new Float64Array(count), next = new Float64Array(count);
  const free = new Uint8Array(count);
  for (let u = 0; u < count; u += 1) { const i = rep[u]; d[u] = raw[i]; free[u] = trunkBelow[i] && raw[i] < lock.evenWithinM ? 1 : 0; }
  for (let pass = 0; pass < lock.evenPasses; pass += 1) {
    for (let u = 0; u < count; u += 1) {
      if (!free[u]) { next[u] = d[u]; continue; }
      let sum = 0; for (const v of near[u]) sum += d[v];
      next[u] = sum / Math.max(near[u].length, 1);
    }
    [d, next] = [next, d];
  }
  const drop = new Float64Array(n); for (let i = 0; i < n; i += 1) drop[i] = d[pointOf[i]];
  return { arm, trunkBelow, drop, cut };
}

/** How much of her arm's share (and of her raised-arm shapes) each vertex of her skin keeps: 1 off her trunk below her armpits. */
export function fadeOf({ trunkBelow, drop }, lock = SIDE_LOCK) {
  const f = new Float64Array(drop.length).fill(1);
  for (let i = 0; i < f.length; i += 1) if (trunkBelow[i]) f[i] = 1 - smoothstep(lock.fromM, lock.toM, drop[i]);
  return f;
}

/**
 * THE WEIGHTS: each vertex's four bytes (they sum to 255) with her arm's share scaled by `fade` and the rest of the point
 * given what that frees, in the proportions its other bones already held. The arm's own bytes are rounded to the nearest (a
 * faded share under half a byte is gone, so the fade's tail leaves no single-byte speckle); the others take what is left by
 * largest remainders. Two remainders alike go to the larger share. A vertex her arm holds alone is left as it is. Returns the new bytes and how many vertices changed.
 */
export function lockWeights(bytes, joints, isArm, fade) {
  const out = Uint8Array.from(bytes), n = bytes.length / 4, ia = [false, false, false, false], nw = [0, 0, 0, 0], q = [0, 0, 0, 0];
  let changed = 0;
  for (let i = 0; i < n; i += 1) {
    if (!(fade[i] < 1)) continue;
    let a8 = 0; for (let c = 0; c < 4; c += 1) { ia[c] = !!isArm[joints[i * 4 + c]] && bytes[i * 4 + c] > 0; if (ia[c]) a8 += bytes[i * 4 + c]; }
    if (!a8) continue;
    const a = a8 / 255, an = a * fade[i];
    let rest = 0; for (let c = 0; c < 4; c += 1) if (!ia[c]) rest += bytes[i * 4 + c] / 255;
    if (!(rest > 1e-9)) continue;
    let left = 255, others = 0;
    for (let c = 0; c < 4; c += 1) {
      const w = bytes[i * 4 + c] / 255;
      if (ia[c]) { nw[c] = w * (an / a); q[c] = roundEven(nw[c] * 255); left -= q[c]; } else { nw[c] = w * ((1 - an) / rest); others += nw[c]; }
    }
    const slots = [];
    let spare = left;
    for (let c = 0; c < 4; c += 1) if (!ia[c]) { const share = nw[c] / others * left; q[c] = Math.floor(share + 1e-9); slots.push([c, share - q[c]]); spare -= q[c]; }
    // (two remainders the same to a billionth are a tie: the larger share takes the byte, whatever the last digit of the arithmetic says)
    slots.sort((x, y) => (Math.abs(y[1] - x[1]) > 1e-9 ? y[1] - x[1] : q[y[0]] - q[x[0]] || x[0] - y[0]));
    if (spare < 0 || spare > slots.length) throw new Error(`vertex ${i}: its bytes cannot be made to sum to 255`);
    for (let k = 0; k < spare; k += 1) q[slots[k][0]] += 1;
    let differs = false; for (let c = 0; c < 4; c += 1) { if (q[c] !== bytes[i * 4 + c]) differs = true; out[i * 4 + c] = q[c]; }
    if (differs) changed += 1;
  }
  return { bytes: out, changed };
}

/** A SHAPE: its position changes (the file's whole numbers, three a vertex) scaled by `fade`. Returns the new numbers and how many vertices changed. */
export function lockShape(deltas, fade) {
  const out = deltas.slice(), n = deltas.length / 3;
  let changed = 0;
  for (let i = 0; i < n; i += 1) {
    if (!(fade[i] < 1)) continue;
    let differs = false;
    for (let c = 0; c < 3; c += 1) { const v = roundEven(deltas[i * 3 + c] * fade[i]); if (v !== deltas[i * 3 + c]) differs = true; out[i * 3 + c] = v; }
    if (differs) changed += 1;
  }
  return { deltas: out, changed };
}

/**
 * The fade a worn part's vertices take: each one's nearest vertex of her trunk's skin (`arm` 0: not her arm below its
 * armpit, which lies against her side there) gives it its own. `skin` and `part` are rest points, metres.
 */
export function fadeOfPart(part, skin, arm, fade, cell = 0.01) {
  const grid = new Map(), at = (v) => Math.floor(v / cell), key = (x, y, z) => (x + 512) * 1048576 + (y + 512) * 1024 + (z + 512);
  for (let i = 0; i < arm.length; i += 1) { if (arm[i]) continue; const k = key(at(skin[i * 3]), at(skin[i * 3 + 1]), at(skin[i * 3 + 2])); let list = grid.get(k); if (!list) grid.set(k, list = []); list.push(i); }
  const n = part.length / 3, out = new Float64Array(n), off = new Float64Array(n);
  for (let p = 0; p < n; p += 1) {
    const x = part[p * 3], y = part[p * 3 + 1], z = part[p * 3 + 2], cx = at(x), cy = at(y), cz = at(z);
    let best = -1, bd = Infinity;
    for (let r = 0; r < 64 && (best < 0 || (r - 1) * cell < Math.sqrt(bd)); r += 1) {
      for (let dx = -r; dx <= r; dx += 1) for (let dy = -r; dy <= r; dy += 1) for (let dz = -r; dz <= r; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
        const list = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!list) continue;
        for (const i of list) { const d = (skin[i * 3] - x) ** 2 + (skin[i * 3 + 1] - y) ** 2 + (skin[i * 3 + 2] - z) ** 2; if (d < bd || (d === bd && i < best)) { bd = d; best = i; } }
      }
    }
    if (best < 0) throw new Error('a worn point found no skin near it');
    out[p] = fade[best]; off[p] = Math.sqrt(bd);
  }
  return { fade: out, off };
}

/**
 * HER FILE, READ FOR THE LOCK: her skin (the part drawn in `Material_0`) and every other skinned part of her mesh, each with
 * its rest points (metres), triangles, joints, weight bytes and the two shapes' numbers; her midline, her two elbows, and
 * which of her bones are her arms' (each upper arm and all under it). `skip` names materials whose parts are left unread
 * (the approved archive still carries the clothes the room's file dropped).
 */
export function readBody(doc, skip = new Set()) {
  const root = doc.getRoot(), mesh = root.listMeshes().find((m) => m.listPrimitives().some((p) => p.getMaterial()?.getName() === 'Material_0'));
  if (!mesh) throw new Error('no body (Material_0) in this file');
  const node = root.listNodes().find((x) => x.getMesh() === mesh), skin = node?.getSkin();
  if (!skin) throw new Error('her body has no skin (bones)');
  const joints = skin.listJoints(), wt = joints.map((j) => j.getWorldTranslation());
  const T = mul(joints[0].getWorldMatrix(), Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16)));
  const child = (k) => joints[k].listChildren().find((c) => joints.includes(c));
  // her two upper arms, found as `sarahV2ArmWeights.mjs` finds them: beside her chest, with a long bone under them
  const ups = joints.map((_, k) => k).filter((k) => { const t = wt[k], c = child(k); if (!c) return false; const e = c.getWorldTranslation(); return Math.abs(t[0]) > 0.1 && Math.abs(t[0]) < 0.3 && t[1] > 1.2 && t[1] < 1.55 && Math.hypot(e[0] - t[0], e[1] - t[1], e[2] - t[2]) > 0.18; });
  if (ups.length !== 2) throw new Error(`expected two upper arms, found ${ups.length}`);
  const under = (k, top) => { for (let x = joints[k]; x; x = x.getParentNode?.()) { if (x === joints[top]) return true; if (!joints.includes(x)) return false; } return false; };
  const isArm = Uint8Array.from(joints, (_, k) => (ups.some((up) => under(k, up)) ? 1 : 0));
  const names = mesh.getExtras()?.targetNames ?? [], shapeAt = SIDE_LOCK_SHAPES.map((name) => names.indexOf(name));
  if (shapeAt.some((k) => k < 0)) throw new Error('her raised-arm shapes are not in this file');
  const parts = mesh.listPrimitives().map((prim, at) => {
    const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
    if (!P || !J || !W || skip.has(prim.getMaterial()?.getName() ?? '')) return null;
    const n = P.getCount(), rest = new Float64Array(n * 3), v = [];
    for (let i = 0; i < n; i += 1) { P.getElement(i, v); for (let c = 0; c < 3; c += 1) rest[i * 3 + c] = T[c] * v[0] + T[4 + c] * v[1] + T[8 + c] * v[2] + T[12 + c]; }
    const shapes = shapeAt.map((k) => prim.listTargets()[k]?.getAttribute('POSITION') ?? null);
    if (!(W.getArray() instanceof Uint8Array) || !W.getNormalized()) throw new Error(`part ${at}: its weights are not bytes`);
    if (shapes.some((a) => !a || !(a.getArray() instanceof Int16Array) || !a.getNormalized())) throw new Error(`part ${at}: its raised-arm shapes are not 16-bit numbers`);
    return { at, prim, material: prim.getMaterial()?.getName() ?? '', n, rest, index: prim.getIndices().getArray(), joints: J.getArray(), weights: W.getArray(), shapes: shapes.map((a) => a.getArray()), accessors: { weights: W, shapes } };
  }).filter(Boolean);
  const skinPart = parts.find((p) => p.material === 'Material_0');
  if (!(Math.abs(wt[0][0] - MIDLINE_X_M) < 1e-4)) throw new Error(`her spine stands at x = ${wt[0][0]}, not at her measured midline`);
  return { mesh, names, joints: joints.map((j) => j.getName()), upperArms: ups, isArm, midX: MIDLINE_X_M, elbows: ups.map((up) => child(up).getWorldTranslation()), skin: skinPart, worn: parts.filter((p) => p !== skinPart) };
}

/**
 * THE LOCK, WORKED OUT for a file read by `readBody`: for her skin and for each worn part her arm's share reaches below
 * her armpits, the new weight bytes and the new numbers of her two shapes. Nothing is written. `from` gives the numbers
 * the lock is laid on when they are not the file's own (a test lays it on the approved file's: `{ skin: { weights, shapes },
 * worn: [{ weights, shapes }, ...] }`).
 */
export function planSideLock(body, from = null, lock = SIDE_LOCK) {
  const region = sideRegions({ rest: body.skin.rest, index: body.skin.index, midX: body.midX, elbows: body.elbows }, lock), fade = fadeOf(region, lock);
  const lay = (part, own, f) => {
    const w = lockWeights(own?.weights ?? part.weights, part.joints, body.isArm, f), shapes = (own?.shapes ?? part.shapes).map((d) => lockShape(d, f));
    return { at: part.at, material: part.material, n: part.n, weights: w.bytes, weightsChanged: w.changed, shapes: shapes.map((s) => s.deltas), shapesChanged: shapes.map((s) => s.changed) };
  };
  const skin = lay(body.skin, from?.skin, fade);
  const worn = body.worn.map((part, k) => {
    const near = fadeOfPart(part.rest, body.skin.rest, region.arm, fade), even = evenOver(near.fade, part.rest, part.index, lock.wornPasses);
    return { ...lay(part, from?.worn?.[k], even), off: near.off, fade: even };
  });
  return { region, fade, skin, worn };
}

// ------------------------------------------------------------------------------------------------ the files

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** Everything in a file that must come out as it went in: every array of every part, every map, and the rest of it as written. */
function everything(doc) {
  const root = doc.getRoot(), out = new Map();
  const put = (name, array) => { if (array) out.set(name, { type: array.constructor.name, length: array.length, hash: digest(Buffer.from(array.buffer, array.byteOffset, array.byteLength)) }); };
  root.listMeshes().forEach((mesh, m) => {
    out.set(`mesh${m}`, { name: mesh.getName(), weights: JSON.stringify(mesh.getWeights()), extras: JSON.stringify({ ...(mesh.getExtras() ?? {}), sideLock: undefined }) });
    mesh.listPrimitives().forEach((p, k) => {
      const at = `mesh${m}.part${k}`;
      out.set(at, { material: p.getMaterial()?.getName() ?? '', mode: p.getMode(), targets: p.listTargets().length });
      put(`${at}.index`, p.getIndices()?.getArray());
      for (const s of p.listSemantics()) { const a = p.getAttribute(s); put(`${at}.${s}`, a.getArray()); out.set(`${at}.${s}.as`, { type: a.getType(), normalized: a.getNormalized() }); }
      p.listTargets().forEach((t, j) => { for (const s of t.listSemantics()) { const a = t.getAttribute(s); put(`${at}.shape${j}.${s}`, a.getArray()); out.set(`${at}.shape${j}.${s}.as`, { type: a.getType(), normalized: a.getNormalized() }); } });
    });
  });
  root.listSkins().forEach((skin, s) => { put(`skin${s}.inverseBind`, skin.getInverseBindMatrices()?.getArray()); out.set(`skin${s}.joints`, skin.listJoints().map((j) => j.getName()).join(',')); });
  root.listNodes().forEach((node, k) => out.set(`node${k}`, JSON.stringify([node.getName(), node.getTranslation(), node.getRotation(), node.getScale(), node.getParentNode?.()?.getName() ?? null, node.getMesh()?.getName() ?? null, node.getExtras()])));
  root.listTextures().forEach((t, k) => out.set(`map${k}`, { name: t.getName(), mime: t.getMimeType(), size: t.getImage()?.byteLength ?? 0, hash: t.getImage() ? digest(t.getImage()) : '' }));
  root.listMaterials().forEach((mat, k) => out.set(`material${k}`, JSON.stringify([mat.getName(), mat.getBaseColorFactor(), mat.getMetallicFactor(), mat.getRoughnessFactor(), mat.getEmissiveFactor(), mat.getAlphaMode(), mat.getAlphaCutoff(), mat.getDoubleSided(), mat.getBaseColorTexture()?.getName() ?? null, mat.getNormalTexture()?.getName() ?? null, mat.getNormalScale(), mat.getMetallicRoughnessTexture()?.getName() ?? null, mat.getOcclusionTexture()?.getName() ?? null, mat.getEmissiveTexture()?.getName() ?? null, [mat.getBaseColorTextureInfo(), mat.getNormalTextureInfo()].map((i) => (i ? [i.getTexCoord(), i.getWrapS(), i.getWrapT(), i.getMinFilter(), i.getMagFilter()] : null)), mat.listExtensions().map((e) => e.extensionName), mat.getExtras()])));
  out.set('animations', root.listAnimations().length);
  out.set('scenes', JSON.stringify(root.listScenes().map((s) => [s.getName(), s.listChildren().map((c) => c.getName())])));
  out.set('extensions', JSON.stringify([root.listExtensionsUsed().map((e) => e.extensionName).sort(), root.listExtensionsRequired().map((e) => e.extensionName).sort()]));
  return out;
}

const reader = async () => { await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]); return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder }); };

/** Lays the lock on one file (`dst` may be `src`). Returns what it changed; throws, leaving `dst` as it was, if anything else would differ. */
export async function sideLock(src, dst = src, { log = console.log } = {}) {
  const io = await reader(), doc = await io.read(src), body = readBody(doc);
  if (body.mesh.getExtras()?.sideLock) throw new Error(`${src} already carries the lock (${body.mesh.getExtras().sideLock}); start from the file as it was before it`);
  const before = everything(doc), plan = planSideLock(body);
  const expect = new Map();
  const m = doc.getRoot().listMeshes().indexOf(body.mesh), report = { file: dst, armpits: plan.region.cut.map((h) => +h.toFixed(4)), parts: [] };
  const own = (accessor, part, slot) => {
    // an array two parts or two shapes share is given a copy of its own first, so only this one changes
    if (accessor.listParents().filter((p) => p.propertyType !== 'Root').length < 2) return accessor;
    const copy = accessor.clone(); slot(copy); return copy;
  };
  for (const [part, laid] of [[body.skin, plan.skin], ...body.worn.map((p, k) => [p, plan.worn[k]])]) {
    const changed = laid.weightsChanged + laid.shapesChanged.reduce((a, b) => a + b, 0);
    if (!changed) continue;
    if (laid.weightsChanged) { own(part.accessors.weights, part, (c) => part.prim.setAttribute('WEIGHTS_0', c)).setArray(laid.weights); expect.set(`mesh${m}.part${part.at}.WEIGHTS_0`, laid.weights); }
    laid.shapesChanged.forEach((count, s) => {
      if (!count) return;
      const k = body.names.indexOf(SIDE_LOCK_SHAPES[s]), target = part.prim.listTargets()[k];
      own(part.accessors.shapes[s], part, (c) => target.setAttribute('POSITION', c)).setArray(laid.shapes[s]); expect.set(`mesh${m}.part${part.at}.shape${k}.POSITION`, laid.shapes[s]);
    });
    report.parts.push({ part: part.at, material: part.material, vertices: part.n, weightsChanged: laid.weightsChanged, shapesChanged: Object.fromEntries(SIDE_LOCK_SHAPES.map((name, s) => [name, laid.shapesChanged[s]])), ...(laid.off ? { offHerSkinMm: +(Math.max(...laid.off) * 1000).toFixed(1) } : {}) });
  }
  if (!report.parts.length) throw new Error('the lock found nothing to change');
  body.mesh.setExtras({ ...(body.mesh.getExtras() ?? {}), sideLock: SIDE_LOCK_NOTE });
  if (!dst.endsWith('.glb')) throw new Error('the lock writes a .glb');
  const tmp = dst.replace(/\.glb$/, '.side-lock-tmp.glb');
  try {
    await io.write(tmp, doc);
    // read back as written: the arrays the lock set are the lock's, and everything else in the file is what it was
    const after = everything(await io.read(tmp)), wrong = [];
    for (const name of new Set([...before.keys(), ...after.keys()])) {
      const a = before.get(name), b = after.get(name), want = expect.get(name);
      if (want) { if (!b || b.type !== want.constructor.name || b.hash !== digest(Buffer.from(want.buffer, want.byteOffset, want.byteLength))) wrong.push(`${name}: not what the lock laid`); continue; }
      if (JSON.stringify(a) !== JSON.stringify(b)) wrong.push(`${name}: ${JSON.stringify(a)?.slice(0, 120)} became ${JSON.stringify(b)?.slice(0, 120)}`);
    }
    if (wrong.length) throw new Error(`the file as written differs where it should not:\n  ${wrong.slice(0, 12).join('\n  ')}`);
    report.held = before.size - expect.size; report.bytes = [statSync(src).size, statSync(tmp).size];
    renameSync(tmp, dst);
  } finally { rmSync(tmp, { force: true }); }
  log(JSON.stringify(report));
  return report;
}

if (process.argv[1]?.endsWith('sarahV2SideLock.mjs')) {
  const [from, to] = process.argv.slice(2);
  if (from) await sideLock(from, to ?? from); else for (const file of SIDE_LOCK_FILES) await sideLock(file);
}
