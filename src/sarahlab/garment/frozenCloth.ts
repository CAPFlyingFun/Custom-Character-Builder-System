/**
 * THE TEE FROZEN ON HER (Joshua, 2026-11-07: "Add a freeze sim frame option in CCBS which I could save and lock in that
 * distance to test... but still want the live cloth option available").
 *
 * The live tee is a simulation the story's player does not run. Frozen, it is what that player WOULD show: the cloth as
 * it lay at one frame, made an ordinary skinned garment on her skeleton -- every drawn point held at the distance from
 * her it had then, and carried from there by her bones as a fitted garment is, nothing simulated. So what is tried in
 * the room is what a story file would carry.
 *
 * - WHICH BONES carry a point: where it lies ON her skin, exactly that skin's, as paint is (Joshua, 2026-11-07: "a
 *   frozen sim shirt is like a painted shirt... use the same technique"): the closest point of her skin's surface is
 *   found for it as it lies when frozen, and it keeps its distance from it. Where it hangs off her or bridges her: the
 *   body's, those of her skin nearest it (never her forearms' or hands'); a sleeve's, those of the skin the live cloth
 *   found under it -- her legs' share held down so a hem hangs over her lap, smoothed a few passes over the cloth's own
 *   edges (`FREEZE`).
 * - HER BOUNCE: her belly's and breasts' follow weights the same way, so the tee moves with them as her skin does.
 * - EXACT AT THE FRAME IT WAS FROZEN: each point's rest place is the inverse of its own blend of her bones then, so it
 *   is drawn where the cloth was to the hundredth of a millimetre, and goes where her skin goes from there.
 * - HER DETAIL THROUGH IT (the navel and nipples the shader draws) carried with her by the bones under each.
 *
 * Its whole drawing is kept (`save`, as bytes, for the browser's database: keptStore.ts), only the points it draws,
 * positions and weights packed to 16 bits (positions in their own box) and normals to 8, so a tee is a few hundred
 * kilobytes and comes back as it was frozen after a reload (`restore`).
 */
import * as THREE from 'three';
import type { ClothDetailSettle, ClothDetailSpot, ClothDetailState } from '../clothDetail';
import { JIGGLE_ATTRIBUTE, jiggleAt, jiggleOf, type JiggleUniforms } from '../softBody';

/**
 * What her soft body's shader adds to a frozen point before her bones carry it (softBody.ts `patchJiggle`, through the
 * material it shares with her fitted tee): her belly's and breasts' bounce by its follow weights, her belly's soft
 * shape, the baby's kicks and its head's press on her pubic area -- for point `i` of a mesh whose follow weights are
 * `weights` (3 each), standing at x, y, z (geometry units, after its morphs).
 */
function shaderMove(uniforms: JiggleUniforms, weights: Float32Array, push: Float32Array, i: number, x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  jiggleAt({ weights, uniforms, push }, i, out, x, y, z);
  return out;
}

/**
 * How a frozen point takes her bones. GAME TUNING throughout, measured on Joshua's own Sarah (his exported character,
 * 2026-11-07), frozen standing, then seated and walking: how much of her skin the tee had covered came out through it.
 *
 * - `onM`: a point within this of her skin's surface (the closest point of it facing the way the cloth does there, among
 *   the triangles round the `surfaceNear` of her points nearest it) is ON her skin, and carried by that skin alone: its
 *   own bones, bounce and shapes, unsmoothed, so it keeps its distance from it as paint does (Joshua, 2026-11-07: "a
 *   frozen sim shirt is like a painted shirt... use the same technique"). Past `offM` it is off her skin, hanging or
 *   bridging, and carried as below; between, a blend of the two.
 * - `near`: the BODY's points carried by the 4 points of her skin nearest each as she stands (each by the inverse
 *   square of its distance, `softM` added; a grid of `cellM` finds them). Carried by the triangle the live cloth's own
 *   contact found, they never took her arm (the cloth's rule, so it is not dragged by it), and seated the underarm opened
 *   and the fronts of her shoulders came through. A SLEEVE's points the same where they hug her (within `hugM`), the
 *   cloth's contact where they hang off her arm (past `hangM`): by her nearest skin alone, a sleeve's underside hanging
 *   beside her took her side, and her arm came through it.
 * - `passes`: smoothed this many passes over the cloth, each moving a point `share` of the way to its neighbours' mean
 *   (about 1.2 cm apart). Seated, the deepest of her skin through it: 2.7 cm with none, 1.0 with 4, 0.8 with 8, 1.1
 *   with 14 (her chest's bones carried up over her shoulders); walking, 8 the least.
 * - `legShare`: her legs carry at most this much of a point IN FRONT of her (a hem there hangs over her lap instead of
 *   wrapping her thighs like a leotard's), `legShareBack` behind her (her seat, which her legs carry as she sits: held to
 *   35% there, her hips came through the back of the hem), round her sides between (`FreezeOptions.facing`).
 * - `bones`: four kept, what three skins with.
 */
export const FREEZE = Object.freeze({ onM: 0.01, offM: 0.025, surfaceNear: 16, near: 4, cellM: 0.03, softM: 0.003, hugM: 0.008, hangM: 0.02, passes: 8, share: 0.5, bones: 4, legShare: 0.35, legShareBack: 1 });

/**
 * How a freeze takes her bones: smoothing passes over the cloth (FREEZE.passes), and her LEGS -- the bones from each
 * thigh down -- given at most `legShare` of any point (the rest to `hip`, the bone her thighs hang from), so a hem over
 * her thighs is carried by her hips more than by her legs as they swing forward to sit.
 */
export interface FreezeOptions {
  readonly passes?: number;
  readonly legs?: ReadonlySet<number>;
  readonly hip?: number;
  readonly legShare?: number;
  /** Per particle, its own `legShare` (the freeze's, by which side of her hips it is on). */
  readonly legShares?: ArrayLike<number>;
  /** Her hips (world) and the way she faces (a unit vector, world): the hem in FRONT of her keeps `legShare`, behind her `FREEZE.legShareBack`. */
  readonly facing?: { readonly hip: readonly number[]; readonly front: readonly number[] };
  /**
   * Per particle, how much it is ON her skin (0 to 1, the freeze's: `FREEZE.onM`): that much of its own carry, her skin's
   * under it, is kept as it is -- not smoothed toward its neighbours', nor its legs' share held down.
   */
  readonly stiff?: ArrayLike<number>;
  /** Bones whose skin it never takes (her forearms and hands: a tee's hem lies near them, and is never carried by them). */
  readonly ignore?: ReadonlySet<number>;
  /** How near her skin a point is carried by that skin alone (`FREEZE.onM`; 0: never -- a probe's comparison). */
  readonly onSkinM?: number;
  /** World units to the metre (the room's 100); default 1. */
  readonly unitsPerMetre?: number;
  /**
   * Her shapes that move with her pose (the seat's correctives, her raised arms): carried with her skin under each
   * point, as morph targets of the same names, and followed every frame (`follow`).
   */
  readonly morphs?: readonly string[];
}

/** The live cloth as it lies now, per PARTICLE: its place (world), and which of her skin's points carry it. */
export interface FreezeParticles {
  /** World, 3 each; NaN where not worn. */
  readonly position: ArrayLike<number>;
  /**
   * Her body's vertices carrying each particle (`under` each, -1 for none) and how much each carries: the live cloth's
   * own contact with her. Absent, or for the particles `nearest` marks: the `FREEZE.near` of her skin's points nearest
   * it as she stands (`nearestSkin`).
   */
  readonly corners?: ArrayLike<number>;
  readonly bary?: ArrayLike<number>;
  readonly under?: number;
  readonly nearest?: ArrayLike<number>;
  /** The cloth's own edges, as particle pairs. */
  readonly edges: ArrayLike<number>;
}

/**
 * Each point of `cloth` (world, 3 each; NaN: none) carried by the `k` of her skin's points nearest it (`skin`, world,
 * 3 each; only those `usable`), each by the inverse square of its distance (`soft` world units added, so a point lying
 * on one is not carried by it alone). A grid of `cell` world units finds them. Pure: for a test.
 */
export function nearestSkin(skin: ArrayLike<number>, usable: ArrayLike<number> | null, cloth: ArrayLike<number>, k: number, cell: number, soft: number): { corners: Int32Array; bary: Float32Array; distance: Float32Array } {
  const grid = new Map<number, number[]>(), key = (x: number, y: number, z: number) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) | 0;
  const ns = Math.floor(skin.length / 3), n = Math.floor(cloth.length / 3);
  for (let v = 0; v < ns; v++) {
    if (usable && !usable[v]) continue;
    const kk = key(Math.floor(skin[v * 3] / cell), Math.floor(skin[v * 3 + 1] / cell), Math.floor(skin[v * 3 + 2] / cell));
    let list = grid.get(kk);
    if (!list) grid.set(kk, list = []);
    list.push(v);
  }
  const corners = new Int32Array(n * k).fill(-1), bary = new Float32Array(n * k), distance = new Float32Array(n).fill(NaN);
  const best: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = cloth[i * 3], y = cloth[i * 3 + 1], z = cloth[i * 3 + 2];
    if (!Number.isFinite(x + y + z)) continue;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    best.length = 0;
    const seen = new Set<number>();
    for (let r = 1; r <= 8; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r && r > 1) continue;
        const kk = key(cx + dx, cy + dy, cz + dz);
        if (seen.has(kk)) continue;
        seen.add(kk);
        for (const v of grid.get(kk) ?? []) { const ex = skin[v * 3] - x, ey = skin[v * 3 + 1] - y, ez = skin[v * 3 + 2] - z; best.push([ex * ex + ey * ey + ez * ez, v]); }
      }
      // (enough found, and nothing unlooked-at nearer than the k-th: every cell within r of its own is searched)
      if (best.length >= k) { best.sort((a, b) => a[0] - b[0]); if (Math.sqrt(best[k - 1][0]) <= r * cell) break; }
    }
    best.sort((a, b) => a[0] - b[0]);
    if (best.length) distance[i] = Math.sqrt(best[0][0]);
    let total = 0;
    for (let j = 0; j < Math.min(k, best.length); j++) total += 1 / (best[j][0] + soft * soft);
    for (let j = 0; j < Math.min(k, best.length); j++) { corners[i * k + j] = best[j][1]; bary[i * k + j] = 1 / (best[j][0] + soft * soft) / total; }
  }
  return { corners, bary, distance };
}

/**
 * Where on triangle a, b, c (world, 3 each, at offsets a, b, c of `s`) the point x, y, z is nearest: its barycentric
 * weights into out at o (Ericson, Real-Time Collision Detection, 5.1.5).
 */
function closestOnTriangle(s: ArrayLike<number>, a: number, b: number, c: number, x: number, y: number, z: number, out: Float64Array): void {
  const ax = s[a], ay = s[a + 1], az = s[a + 2];
  const abx = s[b] - ax, aby = s[b + 1] - ay, abz = s[b + 2] - az, acx = s[c] - ax, acy = s[c + 1] - ay, acz = s[c + 2] - az;
  const apx = x - ax, apy = y - ay, apz = z - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  const set = (u: number, v: number, w: number) => { out[0] = u; out[1] = v; out[2] = w; };
  if (d1 <= 0 && d2 <= 0) return set(1, 0, 0);
  const bpx = x - s[b], bpy = y - s[b + 1], bpz = z - s[b + 2];
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return set(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return set(1 - v, v, 0); }
  const cpx = x - s[c], cpy = y - s[c + 1], cpz = z - s[c + 2];
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return set(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return set(1 - w, 0, w); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return set(0, 1 - w, w); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  set(1 - v - w, v, w);
}

/**
 * Each point of `cloth` (world, 3 each; NaN: none) on the closest point of her skin's SURFACE: the corners of the
 * triangle of `index` (her body's, 3 a triangle; only those whose corners are all `usable`) it lies nearest, where on it
 * (barycentric), and how far from there. Only skin facing the way the cloth does there (`facing`, its outside, 3 each;
 * null: any) is the skin it lies ON: a body panel at her side faces out, as her side does, and the inside of her arm
 * faces it; a sleeve's underside faces her side, as the inside of her arm does. The triangles round the `k` of her
 * skin's points nearest it are tried (a grid of `cell`). Pure: for a test.
 */
export function closestSurface(skin: ArrayLike<number>, usable: ArrayLike<number> | null, index: ArrayLike<number>, cloth: ArrayLike<number>, facing: ArrayLike<number> | null, k: number, cell: number): { corners: Int32Array; bary: Float32Array; distance: Float32Array } {
  const ns = Math.floor(skin.length / 3), nt = Math.floor(index.length / 3), n = Math.floor(cloth.length / 3);
  // each of her points' triangles (those it may be carried by), and each triangle's outside
  const count = new Int32Array(ns + 1), normal = new Float32Array(nt * 3), ok = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
    if (usable && !(usable[a] && usable[b] && usable[c])) continue;
    const ux = skin[b * 3] - skin[a * 3], uy = skin[b * 3 + 1] - skin[a * 3 + 1], uz = skin[b * 3 + 2] - skin[a * 3 + 2];
    const vx = skin[c * 3] - skin[a * 3], vy = skin[c * 3 + 1] - skin[a * 3 + 1], vz = skin[c * 3 + 2] - skin[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
    if (!(l > 0)) continue;
    ok[t] = 1; normal[t * 3] = nx / l; normal[t * 3 + 1] = ny / l; normal[t * 3 + 2] = nz / l;
    count[a + 1]++; count[b + 1]++; count[c + 1]++;
  }
  for (let v = 0; v < ns; v++) count[v + 1] += count[v];
  const tris = new Int32Array(count[ns]), fill = count.slice(0, ns);
  for (let t = 0; t < nt; t++) if (ok[t]) for (let j = 0; j < 3; j++) tris[fill[index[t * 3 + j]]++] = t;
  const near = nearestSkin(skin, usable, cloth, k, cell, 0);
  const corners = new Int32Array(n * 3).fill(-1), bary = new Float32Array(n * 3), distance = new Float32Array(n).fill(NaN);
  const w = new Float64Array(3), tried = new Set<number>();
  for (let i = 0; i < n; i++) {
    const x = cloth[i * 3], y = cloth[i * 3 + 1], z = cloth[i * 3 + 2];
    if (!Number.isFinite(x + y + z)) continue;
    const fx = facing ? facing[i * 3] : 0, fy = facing ? facing[i * 3 + 1] : 0, fz = facing ? facing[i * 3 + 2] : 0, faced = Number.isFinite(fx + fy + fz) && fx * fx + fy * fy + fz * fz > 0;
    let best = Infinity;
    tried.clear();
    for (let j = 0; j < k; j++) {
      const v = near.corners[i * k + j];
      if (v < 0) break;
      for (let e = count[v]; e < count[v + 1]; e++) {
        const t = tris[e];
        if (tried.has(t)) continue;
        tried.add(t);
        if (faced && fx * normal[t * 3] + fy * normal[t * 3 + 1] + fz * normal[t * 3 + 2] <= 0) continue;
        const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
        closestOnTriangle(skin, a * 3, b * 3, c * 3, x, y, z, w);
        const qx = w[0] * skin[a * 3] + w[1] * skin[b * 3] + w[2] * skin[c * 3] - x, qy = w[0] * skin[a * 3 + 1] + w[1] * skin[b * 3 + 1] + w[2] * skin[c * 3 + 1] - y, qz = w[0] * skin[a * 3 + 2] + w[1] * skin[b * 3 + 2] + w[2] * skin[c * 3 + 2] - z;
        const d = qx * qx + qy * qy + qz * qz;
        if (d >= best) continue;
        best = d;
        corners[i * 3] = a; corners[i * 3 + 1] = b; corners[i * 3 + 2] = c;
        bary[i * 3] = w[0]; bary[i * 3 + 1] = w[1]; bary[i * 3 + 2] = w[2];
      }
    }
    if (best < Infinity) distance[i] = Math.sqrt(best);
  }
  return { corners, bary, distance };
}

/** One drawn mesh to freeze: its vertices' particles when it has them (its own sheet), else each takes the nearest particle's (the navel's fine drawing). */
export interface FreezeSource {
  readonly mesh: THREE.Mesh;
  readonly particleOf?: ArrayLike<number>;
}

/** Each particle's outside (world, 3 each; NaN: none drawn), from the normals of the sheets drawn by it. */
function particleFacing(sources: readonly FreezeSource[], np: number): Float32Array {
  const out = new Float32Array(np * 3), m = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const s of sources) {
    const nor = s.mesh.geometry.getAttribute('normal');
    if (!s.particleOf || !nor) continue;
    s.mesh.updateMatrixWorld(true);
    m.getNormalMatrix(s.mesh.matrixWorld);
    for (let i = 0; i < nor.count; i++) {
      const q = s.particleOf[i];
      if (!(q >= 0 && q < np)) continue;
      v.set(nor.getX(i), nor.getY(i), nor.getZ(i)).applyMatrix3(m);
      if (!Number.isFinite(v.x + v.y + v.z)) continue;
      out[q * 3] += v.x; out[q * 3 + 1] += v.y; out[q * 3 + 2] += v.z;
    }
  }
  for (let q = 0; q < np; q++) {
    const l = Math.hypot(out[q * 3], out[q * 3 + 1], out[q * 3 + 2]);
    for (let c = 0; c < 3; c++) out[q * 3 + c] = l > 0 ? out[q * 3 + c] / l : NaN;
  }
  return out;
}

/** Her skin's skinning, read once: four bones and weights a vertex, and her bounce weights (null: none). */
export interface SkinOf {
  readonly index: ArrayLike<number>;
  readonly weight: ArrayLike<number>;
  readonly jiggle: ArrayLike<number> | null;
}

/** A blend of bones: bone index to weight. */
type Blend = Map<number, number>;

/**
 * Each worn particle's bones and bounce weights, from her skin's points carrying it blended by how much each carries
 * (her legs' packed bounce channels, the negative ones, left out), smoothed `FREEZE.passes` over the cloth's edges.
 * Pure: for a test.
 */
export function particleSkin(skin: SkinOf, p: FreezeParticles & { readonly corners: ArrayLike<number>; readonly bary: ArrayLike<number> }, passes: number = FREEZE.passes, share: number = FREEZE.share, options: FreezeOptions = {}): { blends: (Blend | null)[]; jiggle: Float32Array } {
  const legs = options.legs, hip = options.hip ?? -1, legShare = Math.min(1, Math.max(0, options.legShare ?? FREEZE.legShare));
  const stiffOf = (i: number) => Math.min(1, Math.max(0, options.stiff?.[i] ?? 0));
  const legShareOf = (i: number) => { const own = Math.min(1, Math.max(0, options.legShares?.[i] ?? legShare)); return own + (1 - own) * stiffOf(i); };
  const K = p.under ?? 3, n = Math.floor(p.corners.length / K), blends: (Blend | null)[] = new Array(n).fill(null), jiggle = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // (worn where any of her skin carries it)
    let carried = false;
    for (let k = 0; k < K && !carried; k++) carried = p.corners[i * K + k] >= 0 && p.bary[i * K + k] > 0;
    if (!carried) continue;
    const b: Blend = new Map();
    for (let k = 0; k < K; k++) {
      const v = p.corners[i * K + k], s = p.bary[i * K + k];
      if (!(v >= 0) || !(s > 0)) continue;
      for (let j = 0; j < 4; j++) { const w = skin.weight[v * 4 + j]; if (w > 0) { const bone = skin.index[v * 4 + j]; b.set(bone, (b.get(bone) ?? 0) + s * w); } }
      if (skin.jiggle) for (let c = 0; c < 3; c++) jiggle[i * 3 + c] += s * Math.max(0, skin.jiggle[v * 3 + c]);
    }
    // her legs' share held to legShare (this particle's), the rest given to her hips
    if (legs && hip >= 0 && legShareOf(i) < 1) {
      let onLegs = 0, total = 0;
      for (const [bone, w] of b) { total += w; if (legs.has(bone)) onLegs += w; }
      const most = legShareOf(i) * total;
      if (onLegs > most) {
        const k = most / onLegs;
        for (const [bone, w] of b) if (legs.has(bone)) b.set(bone, w * k);
        b.set(hip, (b.get(hip) ?? 0) + (onLegs - most));
      }
    }
    blends[i] = b;
  }
  // smoothed over the cloth: each worn particle toward the mean of its worn neighbours
  const near: number[][] = Array.from({ length: n }, () => []);
  for (let e = 0; e + 1 < p.edges.length; e += 2) {
    const a = p.edges[e], c = p.edges[e + 1];
    if (blends[a] && blends[c]) { near[a].push(c); near[c].push(a); }
  }
  for (let pass = 0; pass < passes; pass++) {
    const nextB: (Blend | null)[] = blends.slice(), nextJ = jiggle.slice();
    for (let i = 0; i < n; i++) {
      const own = blends[i], nb = near[i], s = share * (1 - stiffOf(i));
      if (!own || nb.length === 0 || !(s > 0)) continue;
      const mix: Blend = new Map(), k = s / nb.length;
      for (const [bone, w] of own) mix.set(bone, (1 - s) * w);
      for (const q of nb) for (const [bone, w] of blends[q]!) mix.set(bone, (mix.get(bone) ?? 0) + k * w);
      nextB[i] = mix;
      for (let c = 0; c < 3; c++) { let m = 0; for (const q of nb) m += jiggle[q * 3 + c]; nextJ[i * 3 + c] = (1 - s) * jiggle[i * 3 + c] + s * (m / nb.length); }
    }
    for (let i = 0; i < n; i++) blends[i] = nextB[i];
    jiggle.set(nextJ);
  }
  return { blends, jiggle };
}

/** The `count` heaviest bones of a blend, adding to one, into index/weight at o (4 each). */
export function topBones(b: Blend | null, index: Uint16Array, weight: Float32Array, o: number, count: number = FREEZE.bones): void {
  const kept = b ? [...b].filter((e) => e[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, count) : [];
  const total = kept.reduce((s, e) => s + e[1], 0);
  for (let c = 0; c < 4; c++) { index[o + c] = kept[c]?.[0] ?? 0; weight[o + c] = total > 0 ? (kept[c]?.[1] ?? 0) / total : c === 0 ? 1 : 0; }
}

/** What a skinned mesh's bones do to a point, as three's shader does it: `outer · Σ w (boneWorld · boneInverse) · bindMatrix`, read once a frame. */
export class BonePose {
  private readonly bone: THREE.Matrix4[] = [];
  private readonly outer = new THREE.Matrix4();
  private readonly bind = new THREE.Matrix4();
  /** Read the pose: `mesh` the skinned mesh the points are drawn by (its world matrix and bind matrices), its skeleton's bones as they stand. */
  read(mesh: THREE.SkinnedMesh): this {
    const sk = mesh.skeleton;
    for (let b = 0; b < sk.bones.length; b++) (this.bone[b] ??= new THREE.Matrix4()).multiplyMatrices(sk.bones[b].matrixWorld, sk.boneInverses[b]);
    this.outer.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse);
    this.bind.copy(mesh.bindMatrix);
    return this;
  }
  /** The matrix taking a point of the mesh's geometry to the world, for four bones and weights at o. */
  matrix(index: ArrayLike<number>, weight: ArrayLike<number>, o: number, out: THREE.Matrix4): THREE.Matrix4 {
    const e = out.elements;
    e.fill(0);
    for (let c = 0; c < 4; c++) {
      const w = weight[o + c], m = this.bone[index[o + c]];
      if (!(w > 0) || !m) continue;
      const s = m.elements;
      for (let k = 0; k < 16; k++) e[k] += w * s[k];
    }
    return out.premultiply(this.outer).multiply(this.bind);
  }
}

// ---------------------------------------------------------------------------------------------------------- saving

/** One attribute packed: how, and its bytes. */
interface PackedAttribute { readonly size: number; readonly kind: 'i16box' | 'i8unit' | 'u16' | 'u16unit' | 'f32'; readonly data: Uint8Array; readonly min?: number[]; readonly max?: number[] }
interface PackedMesh {
  readonly name: string;
  readonly attributes: Record<string, PackedAttribute>;
  readonly index: { readonly kind: 'u16' | 'u32'; readonly data: Uint8Array };
  readonly groups: { start: number; count: number; materialIndex?: number }[];
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  readonly renderOrder?: number;
  readonly morphs?: { readonly name: string; readonly data: PackedAttribute }[];
}
/** How her detail through the tee is carried: per spot, its freeze-time matrix's inverse and the bones it is carried by. */
interface SpotCarry { readonly inverse: number[]; readonly index: number[]; readonly weight: number[] }
/**
 * The kept freeze's version: 2 since it is carried by her skin under it (2026-11-07); a freeze kept by v1, carried by the
 * cloth's contact, is not put back but frozen again.
 */
export const FROZEN_SAVE_VERSION = 2;

/** A frozen tee as it is kept between visits. */
export interface FrozenSave {
  readonly v: number;
  readonly at: string;
  readonly meshes: PackedMesh[];
  readonly detail: { readonly state: ClothDetailState; readonly carry: (SpotCarry | null)[] } | null;
}

/** A typed array's own bytes, copied (kept apart from the array they came from). */
const bytesOf = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength).slice();
/** Bytes back as a buffer of their own, aligned for any typed array over it. */
const bufferOf = (b: Uint8Array): ArrayBuffer => b.slice().buffer;

/** Positions to 16 bits in their own box; unit vectors to 8; bones and weights to 16; anything else as it is. */
function packAttribute(name: string, a: THREE.BufferAttribute): PackedAttribute {
  const size = a.itemSize, n = a.count, src = a.array as ArrayLike<number>;
  if (name === 'skinIndex') return { size, kind: 'u16', data: bytesOf(Uint16Array.from(src)) };
  if (name === 'skinWeight') return { size, kind: 'u16unit', data: bytesOf(Uint16Array.from(src, (v) => Math.round(Math.min(1, Math.max(0, v)) * 65535))) };
  if (/normal/i.test(name) && size === 3) return { size, kind: 'i8unit', data: bytesOf(Int8Array.from(src, (v) => Math.round(Math.min(1, Math.max(-1, v)) * 127))) };
  if ((name === 'position' || name === 'fabricRest') && size === 3) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { const v = src[i * 3 + c]; if (Number.isFinite(v)) { min[c] = Math.min(min[c], v); max[c] = Math.max(max[c], v); } }
    for (let c = 0; c < 3; c++) if (!(max[c] >= min[c])) { min[c] = 0; max[c] = 0; }
    const q = new Uint16Array(n * 3);
    for (let i = 0; i < n * 3; i++) { const c = i % 3, span = max[c] - min[c], v = src[i]; q[i] = span > 0 && Number.isFinite(v) ? Math.round(((v - min[c]) / span) * 65535) : 0; }
    return { size, kind: 'i16box', data: bytesOf(q), min, max };
  }
  return { size, kind: 'f32', data: bytesOf(Float32Array.from(src)) };
}
function unpackAttribute(p: PackedAttribute): THREE.BufferAttribute {
  const buf = bufferOf(p.data);
  switch (p.kind) {
    case 'u16': return new THREE.BufferAttribute(new Uint16Array(buf), p.size);
    case 'u16unit': {
      // (each point's weights added back to one: rounding leaves them a hair off it)
      const q = new Uint16Array(buf), w = new Float32Array(q.length);
      for (let i = 0; i < q.length; i += p.size) { let s = 0; for (let c = 0; c < p.size; c++) s += q[i + c]; for (let c = 0; c < p.size; c++) w[i + c] = s > 0 ? q[i + c] / s : c === 0 ? 1 : 0; }
      return new THREE.BufferAttribute(w, p.size);
    }
    case 'i8unit': {
      const q = new Int8Array(buf), v = new Float32Array(q.length);
      for (let i = 0; i < q.length; i += 3) { const x = q[i] / 127, y = q[i + 1] / 127, z = q[i + 2] / 127, l = Math.hypot(x, y, z) || 1; v[i] = x / l; v[i + 1] = y / l; v[i + 2] = z / l; }
      return new THREE.BufferAttribute(v, 3);
    }
    case 'i16box': {
      const q = new Uint16Array(buf), v = new Float32Array(q.length), min = p.min ?? [0, 0, 0], max = p.max ?? [0, 0, 0];
      for (let i = 0; i < q.length; i++) { const c = i % 3; v[i] = min[c] + (q[i] / 65535) * (max[c] - min[c]); }
      return new THREE.BufferAttribute(v, 3);
    }
    default: return new THREE.BufferAttribute(new Float32Array(buf), p.size);
  }
}

// ------------------------------------------------------------------------------------------------- the frozen tee

/** A point moved by m; a direction turned by it (its length kept, or made one when `unit`). */
const pointBy = (a: readonly number[], m: THREE.Matrix4): [number, number, number] => new THREE.Vector3(a[0], a[1], a[2]).applyMatrix4(m).toArray() as [number, number, number];
const turnBy = (a: readonly number[], m: THREE.Matrix4, unit: boolean): [number, number, number] => {
  const v = new THREE.Vector3(a[0], a[1], a[2]).applyMatrix3(new THREE.Matrix3().setFromMatrix4(m));
  return (unit ? v.normalize() : v).toArray() as [number, number, number];
};
/** A detail state as plain numbers (its profile's heights may be a typed array over a buffer it shares), kept apart. */
const plain = <T>(state: T): T => JSON.parse(JSON.stringify(state, (_k, v: unknown) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v))) as T;
/** The largest of many numbers (a spread of a long array into Math.max overflows the stack). */
function largest(a: ArrayLike<number>): number { let m = -Infinity; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }

export class FrozenCloth {
  /** Its drawings, skinned to her skeleton (children of her body). */
  readonly meshes: THREE.SkinnedMesh[];
  private readonly detail: FrozenSave['detail'];
  private readonly pose = new BonePose();
  private readonly m = new THREE.Matrix4();

  /** Her soft body's uniforms its shader reads (her body's), for `drawnNow`. */
  private readonly bounce: JiggleUniforms | null;

  /** How many of the cloth's points the freeze put on her skin, between, and off it (null: put back from a keep). */
  held: { readonly onSkin: number; readonly between: number; readonly off: number } | null = null;

  private constructor(meshes: THREE.SkinnedMesh[], detail: FrozenSave['detail'], bounce: JiggleUniforms | null) {
    this.meshes = meshes; this.detail = detail; this.bounce = bounce;
  }

  /**
   * Freeze the cloth as it is drawn now onto her: `sources` its drawings (world), `particles` the cloth under them,
   * `detail` her detail through it now (null: none). Call with her pose as it is drawn (her world matrices updated).
   */
  static freeze(body: THREE.SkinnedMesh, sources: readonly FreezeSource[], particles: FreezeParticles, material: THREE.Material, detail: ClothDetailState | null, options: FreezeOptions = {}): FrozenCloth {
    const si = body.geometry.getAttribute('skinIndex'), sw = body.geometry.getAttribute('skinWeight'), sj = body.geometry.getAttribute(JIGGLE_ATTRIBUTE);
    const read = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, k: number) => {
      const out = new Float32Array(a.count * k), get = [a.getX, a.getY, a.getZ, a.getW];
      for (let i = 0; i < a.count; i++) for (let c = 0; c < k; c++) out[i * k + c] = get[c].call(a, i);
      return out;
    };
    const skin: SkinOf = { index: read(si, 4), weight: read(sw, 4), jiggle: sj ? read(sj, 3) : null };
    // which of her skin carries each particle. The BODY's (`nearest`): the points of her skin nearest it as she stands now.
    // A SLEEVE's: the same where it hugs her (within FREEZE.hugM), the skin the cloth's own contact found under it where
    // it hangs off her arm (past FREEZE.hangM; nearest, a sleeve's underside hanging beside her took her side), blended
    // between. Every one by her nearest skin without a contact.
    const np = Math.floor(particles.position.length / 3), given = particles.corners && particles.bary ? (particles.under ?? 3) : 0, perM = options.unitsPerMetre ?? 1;
    const bp = body.geometry.getAttribute('position'), ns = bp.count, world = new Float32Array(ns * 3), usable = new Uint8Array(ns), vv = new THREE.Vector3();
    body.skeleton.update();
    for (let i = 0; i < ns; i++) {
      body.getVertexPosition(i, vv).applyMatrix4(body.matrixWorld).toArray(world, i * 3);
      let ignored = 0;
      if (options.ignore) for (let j = 0; j < 4; j++) if (options.ignore.has(skin.index[i * 4 + j])) ignored += skin.weight[i * 4 + j];
      usable[i] = ignored < 0.5 ? 1 : 0;
    }
    // ON HER SKIN (Joshua: "it measures all the points and distances to the closest vertices and it stays close to
    // that"): where on her skin's surface each particle lies nearest -- the skin facing the way the cloth does there --
    // and how far. Within FREEZE.onM it is carried by that skin's own bones, bounce and shapes alone, so it keeps its
    // distance from it as paint would; past FREEZE.offM by the carry below; between, a blend of the two.
    const facing = particleFacing(sources, np);
    const bodyIndex = body.geometry.getIndex(), tri = bodyIndex ? (bodyIndex.array as ArrayLike<number>) : Uint32Array.from({ length: ns - (ns % 3) }, (_, v) => v);
    const surfaceK = FREEZE.surfaceNear, cell = FREEZE.cellM * perM;
    // (the cloth's outside the way her skin's is: turned round if, on the whole, it faces into her)
    {
      const any = closestSurface(world, usable, tri, particles.position, null, surfaceK, cell);
      let agree = 0;
      for (let i = 0; i < np; i++) {
        if (!(any.distance[i] < FREEZE.offM * perM) || !Number.isFinite(facing[i * 3])) continue;
        const [a, b, c] = [any.corners[i * 3], any.corners[i * 3 + 1], any.corners[i * 3 + 2]];
        const ux = world[b * 3] - world[a * 3], uy = world[b * 3 + 1] - world[a * 3 + 1], uz = world[b * 3 + 2] - world[a * 3 + 2];
        const vx = world[c * 3] - world[a * 3], vy = world[c * 3 + 1] - world[a * 3 + 1], vz = world[c * 3 + 2] - world[a * 3 + 2];
        agree += facing[i * 3] * (uy * vz - uz * vy) + facing[i * 3 + 1] * (uz * vx - ux * vz) + facing[i * 3 + 2] * (ux * vy - uy * vx) > 0 ? 1 : -1;
      }
      if (agree < 0) for (let i = 0; i < facing.length; i++) facing[i] = -facing[i];
    }
    const surface = closestSurface(world, usable, tri, particles.position, facing, surfaceK, cell);
    const stiff = new Float32Array(np);
    let onSkin = 0, between = 0, off = 0;
    for (let i = 0; i < np; i++) {
      const d = surface.distance[i] / perM;
      if (!Number.isFinite(particles.position[i * 3])) continue;
      const t = !(d >= 0) || options.onSkinM === 0 ? 0 : Math.min(1, Math.max(0, (FREEZE.offM - d) / (FREEZE.offM - (options.onSkinM ?? FREEZE.onM))));
      stiff[i] = t * t * (3 - 2 * t);
      if (stiff[i] >= 0.999) onSkin++; else if (stiff[i] > 0) between++; else off++;
    }
    const near = nearestSkin(world, usable, particles.position, FREEZE.near, FREEZE.cellM * perM, FREEZE.softM * perM);
    const S = 3, K = S + FREEZE.near + given, corners = new Int32Array(np * K).fill(-1), bary = new Float32Array(np * K);
    for (let i = 0; i < np; i++) {
      const hasNear = near.corners[i * FREEZE.near] >= 0, hasContact = given > 0 && particles.corners![i * given] >= 0;
      const hang = !given || particles.nearest?.[i] || !hasContact ? 0
        : Math.min(1, Math.max(0, (near.distance[i] / perM - FREEZE.hugM) / (FREEZE.hangM - FREEZE.hugM)));
      const on = surface.corners[i * 3] >= 0 ? stiff[i] : 0, rest = 1 - on;
      const fromNear = hasNear ? (1 - hang) * rest : 0, fromContact = hasContact ? rest - fromNear : 0;
      for (let j = 0; j < S; j++) { corners[i * K + j] = surface.corners[i * 3 + j]; bary[i * K + j] = on * surface.bary[i * 3 + j]; }
      for (let j = 0; j < FREEZE.near; j++) { corners[i * K + S + j] = near.corners[i * FREEZE.near + j]; bary[i * K + S + j] = fromNear * near.bary[i * FREEZE.near + j]; }
      for (let j = 0; j < given; j++) { corners[i * K + S + FREEZE.near + j] = particles.corners![i * given + j]; bary[i * K + S + FREEZE.near + j] = fromContact * particles.bary![i * given + j]; }
    }
    // her legs' share by which side of her hips each particle is on: in front of her, FREEZE's legShare; behind her (her
    // seat, which her legs carry as she sits), FREEZE.legShareBack; round her sides between
    let legShares: Float32Array | undefined;
    if (options.facing) {
      const [hx, , hz] = options.facing.hip, [fx, , fz] = options.facing.front, front = options.legShare ?? FREEZE.legShare;
      legShares = new Float32Array(np);
      for (let i = 0; i < np; i++) {
        // (round her, level: which way from her hips it lies, not how high)
        const dx = particles.position[i * 3] - hx, dz = particles.position[i * 3 + 2] - hz, l = Math.hypot(dx, dz) || 1;
        const t = Math.min(1, Math.max(0, ((dx * fx + dz * fz) / (l * (Math.hypot(fx, fz) || 1)) + 0.2) / 0.8));
        legShares[i] = FREEZE.legShareBack + (front - FREEZE.legShareBack) * t * t * (3 - 2 * t);
      }
    }
    const carriers = { corners, bary, under: K };
    const { blends, jiggle } = particleSkin(skin, { ...particles, ...carriers }, options.passes ?? FREEZE.passes, FREEZE.share, { ...options, stiff, ...(legShares ? { legShares } : {}) });
    // her shapes that move with her pose, as her skin carrying each particle has them, and how much of each she has on now
    const dict = body.morphTargetDictionary ?? {}, shapes = body.geometry.morphAttributes.position ?? [], base = body.geometry.getAttribute('position');
    const named = (options.morphs ?? []).filter((name) => dict[name] !== undefined && shapes[dict[name]]);
    const shapeOf = named.map((name) => {
      const a = shapes[dict[name]], out = new Float32Array(np * 3), rel = body.geometry.morphTargetsRelative;
      for (let i = 0; i < np; i++) for (let j = 0; j < K; j++) {
        const v = corners[i * K + j], w = bary[i * K + j];
        if (!(v >= 0) || !(w > 0)) continue;
        out[i * 3] += w * (a.getX(v) - (rel ? 0 : base.getX(v))); out[i * 3 + 1] += w * (a.getY(v) - (rel ? 0 : base.getY(v))); out[i * 3 + 2] += w * (a.getZ(v) - (rel ? 0 : base.getZ(v)));
      }
      return out;
    });
    const shapeNow = named.map((name) => body.morphTargetInfluences?.[dict[name]] ?? 0);
    const worn: number[] = [];
    for (let i = 0; i < blends.length; i++) if (blends[i]) worn.push(i);
    const nearest = (x: number, y: number, z: number): number => {
      let best = -1, bd = Infinity;
      for (const i of worn) { const dx = particles.position[i * 3] - x, dy = particles.position[i * 3 + 1] - y, dz = particles.position[i * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } }
      return best;
    };
    // her bounce now: each point's rest place is taken without it, so it is where the cloth was when she is still
    const bounce = jiggleOf(body)?.uniforms ?? null, move = new THREE.Vector3();
    const meshes: THREE.SkinnedMesh[] = [];
    const pose = new BonePose(), M = new THREE.Matrix4(), inv = new THREE.Matrix4(), p = new THREE.Vector3(), nrm = new THREE.Vector3(), src = new THREE.Matrix4(), srcN = new THREE.Matrix3();
    let spotSkin: { index: Uint16Array; weight: Float32Array; world: Float32Array } | null = null;
    for (const s of sources) {
      const from = s.mesh.geometry, pos = from.getAttribute('position'), nor = from.getAttribute('normal');
      // only what it draws now: the triangles in its draw range, and the points they use, numbered afresh
      const idx = from.getIndex(), start = Math.max(0, from.drawRange.start);
      const tris = idx ? Array.from((idx.array as ArrayLike<number>)).slice(start, start + Math.min(idx.count - start, from.drawRange.count)) : Array.from({ length: pos.count }, (_, v) => v);
      const kept = [...new Set(tris)].sort((a, b) => a - b), at = new Map(kept.map((v, k) => [v, k])), n = kept.length;
      const g = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(from.attributes)) {
        if (name === 'position' || name === 'normal' || (a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) continue;
        const b = a as THREE.BufferAttribute, k = b.itemSize, out = new Float32Array(n * k), arr = b.array as ArrayLike<number>;
        kept.forEach((v, i) => { for (let c = 0; c < k; c++) out[i * k + c] = arr[v * k + c]; });
        g.setAttribute(name, new THREE.BufferAttribute(out, k, b.normalized));
      }
      g.setIndex(tris.map((v) => at.get(v)!));
      for (const gr of from.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
      const mesh = new THREE.SkinnedMesh(g, material);
      mesh.name = `${s.mesh.name || 'cloth'}-frozen`;
      mesh.frustumCulled = false; mesh.castShadow = s.mesh.castShadow; mesh.receiveShadow = s.mesh.receiveShadow; mesh.renderOrder = s.mesh.renderOrder;
      body.add(mesh);
      mesh.bindMode = body.bindMode;
      mesh.bind(body.skeleton, body.bindMatrix);
      mesh.updateMatrixWorld(true);
      pose.read(mesh);
      s.mesh.updateMatrixWorld(true);
      src.copy(s.mesh.matrixWorld); srcN.getNormalMatrix(src);
      const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), index = new Uint16Array(n * 4), weight = new Float32Array(n * 4), jig = new Float32Array(n * 3);
      const world = new Float32Array(n * 3), moved = named.map(() => new Float32Array(n * 3)), noPush = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const v = kept[i];
        p.set(pos.getX(v), pos.getY(v), pos.getZ(v)).applyMatrix4(src);
        p.toArray(world, i * 3);
        if (!Number.isFinite(p.x + p.y + p.z)) { topBones(null, index, weight, i * 4); continue; }
        if (nor) nrm.set(nor.getX(v), nor.getY(v), nor.getZ(v)).applyMatrix3(srcN).normalize(); else nrm.set(0, 0, 1);
        const q = s.particleOf ? s.particleOf[v] : nearest(p.x, p.y, p.z), b = q >= 0 ? blends[q] : null;
        topBones(b, index, weight, i * 4);
        if (q >= 0) for (let c = 0; c < 3; c++) jig[i * 3 + c] = jiggle[q * 3 + c];
        pose.matrix(index, weight, i * 4, M);
        inv.copy(M).invert();
        p.applyMatrix4(inv);
        // what her soft body's shader adds to it taken off (her bounce, her belly's soft shape, the baby's press on her):
        // it is added back as she has it, frame by frame. (It depends a little on where the point is: three rounds find it)
        if (bounce) {
          const base = p.clone();
          for (let k = 0; k < 3; k++) { shaderMove(bounce, jig, noPush, i, p.x, p.y, p.z, move); p.copy(base).sub(move); }
        }
        // her pose's shapes as they are on her now taken off too: they are put back as she has them, frame by frame
        if (q >= 0) named.forEach((_, t) => {
          const d = shapeOf[t], w = shapeNow[t];
          for (let c = 0; c < 3; c++) { moved[t][i * 3 + c] = d[q * 3 + c]; p.setComponent(c, p.getComponent(c) - w * d[q * 3 + c]); }
        });
        p.toArray(position, i * 3);
        nrm.transformDirection(inv); nrm.toArray(normal, i * 3);
      }
      g.setAttribute('position', new THREE.BufferAttribute(position, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(index, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4));
      if (sj) g.setAttribute(JIGGLE_ATTRIBUTE, new THREE.BufferAttribute(jig, 3));
      if (named.length) {
        g.morphAttributes.position = named.map((name, t) => Object.assign(new THREE.BufferAttribute(moved[t], 3), { name }));
        g.morphTargetsRelative = true;
        mesh.updateMorphTargets();
      }
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
      meshes.push(mesh);
      spotSkin ??= { index, weight, world };
    }
    // her detail through it: each spot carried by the bones of the cloth's point nearest it
    let carried: FrozenSave['detail'] = null;
    if (detail && spotSkin && meshes[0]) {
      pose.read(meshes[0]);
      const carryAt = (c: readonly number[]): SpotCarry | null => {
        const W = spotSkin!.world;
        let best = -1, bd = Infinity;
        for (let v = 0; v < W.length / 3; v++) { const dx = W[v * 3] - c[0], dy = W[v * 3 + 1] - c[1], dz = W[v * 3 + 2] - c[2], d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v; } }
        if (best < 0) return null;
        const index = Array.from(spotSkin!.index.subarray(best * 4, best * 4 + 4)), weight = Array.from(spotSkin!.weight.subarray(best * 4, best * 4 + 4));
        pose.matrix(index, weight, 0, M);
        return { inverse: Array.from(inv.copy(M).invert().elements), index, weight };
      };
      carried = {
        state: plain(detail),
        carry: [detail.navel ? carryAt(detail.navel.center) : null, ...[0, 1].map((k) => (detail.nipples[k] ? carryAt(detail.nipples[k].center) : null))],
      };
    }
    const made = new FrozenCloth(meshes, carried, bounce);
    made.held = { onSkin, between, off };
    return made;
  }

  /** A kept freeze put back on her (null: it could not be read). */
  static restore(body: THREE.SkinnedMesh, saved: FrozenSave, material: THREE.Material): FrozenCloth | null {
    if (!saved || saved.v !== FROZEN_SAVE_VERSION || !Array.isArray(saved.meshes)) return null;
    try {
      const meshes = saved.meshes.map((pm) => {
        const g = new THREE.BufferGeometry();
        for (const [name, pa] of Object.entries(pm.attributes)) g.setAttribute(name, unpackAttribute(pa));
        const buf = bufferOf(pm.index.data);
        g.setIndex(new THREE.BufferAttribute(pm.index.kind === 'u16' ? new Uint16Array(buf) : new Uint32Array(buf), 1));
        for (const gr of pm.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
        if (pm.morphs?.length) { g.morphAttributes.position = pm.morphs.map((sh) => Object.assign(unpackAttribute(sh.data), { name: sh.name })); g.morphTargetsRelative = true; }
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
        const mesh = new THREE.SkinnedMesh(g, material);
        if (pm.morphs?.length) mesh.updateMorphTargets();
        mesh.name = pm.name; mesh.frustumCulled = false; mesh.castShadow = pm.castShadow ?? false; mesh.receiveShadow = pm.receiveShadow ?? false; mesh.renderOrder = pm.renderOrder ?? 0;
        body.add(mesh);
        mesh.bindMode = body.bindMode;
        mesh.bind(body.skeleton, body.bindMatrix);
        return mesh;
      });
      return new FrozenCloth(meshes, saved.detail ?? null, jiggleOf(body)?.uniforms ?? null);
    } catch (error) {
      console.warn('[sarahlab] a kept frozen tee could not be read', error);
      return null;
    }
  }

  /** Kept: everything it draws with, packed, and how her detail through it is carried. */
  save(): FrozenSave {
    return {
      v: FROZEN_SAVE_VERSION, at: new Date().toISOString(), detail: this.detail,
      meshes: this.meshes.map((m) => {
        const g = m.geometry, attributes: Record<string, PackedAttribute> = {};
        for (const [name, a] of Object.entries(g.attributes)) attributes[name] = packAttribute(name, a as THREE.BufferAttribute);
        const idx = g.getIndex()!, big = largest(idx.array as ArrayLike<number>) > 65535;
        return {
          name: m.name, attributes, groups: g.groups.map((gr) => ({ start: gr.start, count: gr.count, materialIndex: gr.materialIndex })),
          castShadow: m.castShadow, receiveShadow: m.receiveShadow, renderOrder: m.renderOrder,
          // (her pose's shapes, packed as positions are)
          morphs: (g.morphAttributes.position ?? []).map((a) => ({ name: a.name, data: packAttribute('position', a as THREE.BufferAttribute) })),
          index: { kind: big ? 'u32' : 'u16', data: bytesOf(big ? Uint32Array.from(idx.array as ArrayLike<number>) : Uint16Array.from(idx.array as ArrayLike<number>)) },
        };
      }),
    };
  }

  /** How many bytes a save of it holds (its arrays). */
  static bytes(saved: FrozenSave): number {
    let n = 0;
    for (const m of saved.meshes) { n += m.index.data.byteLength; for (const a of [...Object.values(m.attributes), ...(m.morphs ?? []).map((x) => x.data)]) n += a.data.byteLength; }
    return n;
  }

  /** Her pose's shapes as she has them on now (`FreezeOptions.morphs`), every frame. */
  follow(body: THREE.SkinnedMesh): void {
    const dict = body.morphTargetDictionary, on = body.morphTargetInfluences;
    if (!dict || !on) return;
    for (const m of this.meshes) {
      const own = m.morphTargetDictionary, mine = m.morphTargetInfluences;
      if (!own || !mine) continue;
      for (const [name, k] of Object.entries(own)) mine[k] = dict[name] !== undefined ? on[dict[name]] ?? 0 : 0;
    }
  }

  get visible(): boolean { return this.meshes[0]?.visible ?? false; }
  set visible(on: boolean) { for (const m of this.meshes) m.visible = on; }

  /** How many points it draws (all its drawings). */
  get vertices(): number { return this.meshes.reduce((s, m) => s + m.geometry.getAttribute('position').count, 0); }

  /**
   * Its sheet as it is drawn now (its first drawing, the cloth's own; world, 3 each): each point skinned as three skins
   * it, and its normal from the triangles round it. For a probe: where her skin comes through it.
   */
  drawnNow(): { position: Float32Array; normal: Float32Array } {
    const m = this.meshes[0], g = m.geometry, rest = g.getAttribute('position'), n = rest.count, position = new Float32Array(n * 3), normal = new Float32Array(n * 3);
    // (as its shader draws it: its pose's shapes, her soft body's move, then her bones)
    const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), jig = g.getAttribute(JIGGLE_ATTRIBUTE) as THREE.BufferAttribute | undefined;
    const shapes = g.morphAttributes.position ?? [], on = m.morphTargetInfluences ?? [], weights = jig ? (jig.array as Float32Array) : new Float32Array(n * 3), noPush = new Float32Array(n * 3);
    const index = [0, 0, 0, 0], weight = [0, 0, 0, 0], get = [si.getX, si.getY, si.getZ, si.getW], getW = [sw.getX, sw.getY, sw.getZ, sw.getW], M = new THREE.Matrix4(), v = new THREE.Vector3(), mv = new THREE.Vector3();
    this.pose.read(m);
    for (let i = 0; i < n; i++) {
      v.set(rest.getX(i), rest.getY(i), rest.getZ(i));
      shapes.forEach((a, t) => { const w = on[t] ?? 0; if (w) v.set(v.x + w * a.getX(i), v.y + w * a.getY(i), v.z + w * a.getZ(i)); });
      if (this.bounce) v.add(shaderMove(this.bounce, weights, noPush, i, v.x, v.y, v.z, mv));
      for (let c = 0; c < 4; c++) { index[c] = get[c].call(si, i); weight[c] = getW[c].call(sw, i); }
      v.applyMatrix4(this.pose.matrix(index, weight, 0, M)).toArray(position, i * 3);
    }
    const idx = g.getIndex()!.array as ArrayLike<number>, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const i = idx[t], j = idx[t + 1], k = idx[t + 2];
      a.fromArray(position, i * 3); b.fromArray(position, j * 3).sub(a); c.fromArray(position, k * 3).sub(a); b.cross(c);
      for (const q of [i, j, k]) { normal[q * 3] += b.x; normal[q * 3 + 1] += b.y; normal[q * 3 + 2] += b.z; }
    }
    for (let i = 0; i < n; i++) { const l = Math.hypot(normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2]) || 1; normal[i * 3] /= l; normal[i * 3 + 1] /= l; normal[i * 3 + 2] /= l; }
    return { position, normal };
  }

  /** Her detail through it as she stands now: each spot moved from where it was frozen as the bones under it have moved since. */
  carriedDetail(): ClothDetailState | null {
    const d = this.detail;
    if (!d || !this.meshes[0]) return null;
    this.pose.read(this.meshes[0]);
    const T = (c: SpotCarry | null): THREE.Matrix4 | null => {
      if (!c) return null;
      this.pose.matrix(c.index, c.weight, 0, this.m);
      return new THREE.Matrix4().fromArray(c.inverse).premultiply(this.m);
    };
    const spot = (s: ClothDetailSpot | null | undefined, m: THREE.Matrix4 | null): ClothDetailSpot | null =>
      s ? (m ? { ...s, center: pointBy(s.center, m), normal: turnBy(s.normal, m, true) } : s) : null;
    const navelT = T(d.carry[0]);
    const settle = (s: ClothDetailSettle | null | undefined): ClothDetailSettle | null => {
      if (!s) return null;
      if (!navelT) return s;
      const A = new THREE.Matrix3().setFromMatrix4(navelT), C = new THREE.Matrix3().set(...(s.curvature as [number, number, number, number, number, number, number, number, number]));
      // (its curvature turned with it: A C Aᵀ)
      const turned = new THREE.Matrix3().multiplyMatrices(A, C).multiply(A.clone().transpose());
      const e = turned.elements; // column-major
      return {
        ...s, center: pointBy(s.center, navelT), normal: turnBy(s.normal, navelT, true), slope: turnBy(s.slope, navelT, false),
        curvature: [e[0], e[3], e[6], e[1], e[4], e[7], e[2], e[5], e[8]],
        profile: s.profile ? { ...s.profile, crown: pointBy(s.profile.crown, navelT) } : s.profile,
      };
    };
    return {
      navel: spot(d.state.navel, navelT),
      nipples: d.state.nipples.map((s, k) => spot(s, T(d.carry[k + 1]))!).filter((s) => !!s),
      settle: settle(d.state.settle),
    };
  }

  dispose(): void {
    for (const m of this.meshes) { m.removeFromParent(); m.geometry.dispose(); }
    this.meshes.length = 0;
  }
}
