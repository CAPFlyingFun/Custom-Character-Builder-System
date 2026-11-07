/**
 * THE TEE FROZEN ON HER (Joshua, 2026-11-07: "Add a freeze sim frame option in CCBS which I could save and lock in that
 * distance to test... but still want the live cloth option available").
 *
 * The live tee is a simulation the story's player does not run. Frozen, it is what that player WOULD show: the cloth as
 * it lay at one frame, made an ordinary skinned garment on her skeleton -- every drawn point held at the distance from
 * her it had then, and carried from there by her bones as a fitted garment is, nothing simulated. So what is tried in
 * the room is what a story file would carry.
 *
 * - WHICH BONES carry a point: the body's, those of her skin nearest it as she stands (never her forearms' or hands');
 *   a sleeve's, those of the skin the live cloth found under it -- so it goes where the skin under it goes, her legs'
 *   share held down so a hem hangs over her lap, smoothed a few passes over the cloth's own edges (`FREEZE`).
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
import { JIGGLE_ATTRIBUTE, jiggleOf } from '../softBody';

/**
 * How a frozen point takes her bones. GAME TUNING throughout, chosen frozen standing and then seated (2026-11-07).
 *
 * - `near`: the BODY's points carried by the 4 points of her skin nearest each as she stands (each by the inverse
 *   square of its distance, `softM` added; a grid of `cellM` finds them). Carried by the triangle the live cloth's own
 *   contact found, they never took her arm (the cloth's rule, so it is not dragged by it), and seated the underarm opened
 *   and the fronts of her shoulders came through: the tee there lay over skin her arm carries. The SLEEVES keep the
 *   cloth's contact: carried by her nearest skin, a sleeve's underside hanging beside her took her side's bones, and her
 *   arm came through it.
 * - `passes`: smoothed this many passes over the cloth, each moving a point `share` of the way to its neighbours' mean
 *   (about 1.2 cm apart): her skin's own weights are smooth already, and 30 passes carried her chest's bones up over
 *   her shoulders. Where the body meets a sleeve, `seamPasses` more within `seamHops` points of the seam (less further
 *   from it): the two are carried differently, and seated a sliver of her underarm showed between them.
 * - `legShare`: her legs carry at most this much of any point (`FreezeOptions`): carrying all they lie over, the hem
 *   wrapped her thighs like a leotard's seated; at 35% it hangs over her lap.
 * - `bones`: four kept, what three skins with.
 */
export const FREEZE = Object.freeze({ near: 4, cellM: 0.03, softM: 0.003, passes: 4, share: 0.5, seamPasses: 12, seamHops: 4, bones: 4, legShare: 0.35 });

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
  /** Bones whose skin it never takes (her forearms and hands: a tee's hem lies near them, and is never carried by them). */
  readonly ignore?: ReadonlySet<number>;
  /** World units to the metre (the room's 100); default 1. */
  readonly unitsPerMetre?: number;
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
  /** Which kind of piece each particle is on (the body's 1, a sleeve's 0): where they meet is blended further (`FREEZE.seamPasses`). */
  readonly pieces?: ArrayLike<number>;
  /** The cloth's own edges, as particle pairs. */
  readonly edges: ArrayLike<number>;
}

/**
 * Each point of `cloth` (world, 3 each; NaN: none) carried by the `k` of her skin's points nearest it (`skin`, world,
 * 3 each; only those `usable`), each by the inverse square of its distance (`soft` world units added, so a point lying
 * on one is not carried by it alone). A grid of `cell` world units finds them. Pure: for a test.
 */
export function nearestSkin(skin: ArrayLike<number>, usable: ArrayLike<number> | null, cloth: ArrayLike<number>, k: number, cell: number, soft: number): { corners: Int32Array; bary: Float32Array } {
  const grid = new Map<number, number[]>(), key = (x: number, y: number, z: number) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) | 0;
  const ns = Math.floor(skin.length / 3), n = Math.floor(cloth.length / 3);
  for (let v = 0; v < ns; v++) {
    if (usable && !usable[v]) continue;
    const kk = key(Math.floor(skin[v * 3] / cell), Math.floor(skin[v * 3 + 1] / cell), Math.floor(skin[v * 3 + 2] / cell));
    let list = grid.get(kk);
    if (!list) grid.set(kk, list = []);
    list.push(v);
  }
  const corners = new Int32Array(n * k).fill(-1), bary = new Float32Array(n * k);
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
    let total = 0;
    for (let j = 0; j < Math.min(k, best.length); j++) total += 1 / (best[j][0] + soft * soft);
    for (let j = 0; j < Math.min(k, best.length); j++) { corners[i * k + j] = best[j][1]; bary[i * k + j] = 1 / (best[j][0] + soft * soft) / total; }
  }
  return { corners, bary };
}

/** One drawn mesh to freeze: its vertices' particles when it has them (its own sheet), else each takes the nearest particle's (the navel's fine drawing). */
export interface FreezeSource {
  readonly mesh: THREE.Mesh;
  readonly particleOf?: ArrayLike<number>;
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
export function particleSkin(skin: SkinOf, p: FreezeParticles & { readonly corners: ArrayLike<number>; readonly bary: ArrayLike<number> }, passes: number = FREEZE.passes, shareAll: number = FREEZE.share, options: FreezeOptions = {}): { blends: (Blend | null)[]; jiggle: Float32Array } {
  const legs = options.legs, hip = options.hip ?? -1, legShare = Math.min(1, Math.max(0, options.legShare ?? FREEZE.legShare));
  const K = p.under ?? 3, n = Math.floor(p.corners.length / K), blends: (Blend | null)[] = new Array(n).fill(null), jiggle = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (!(p.corners[i * K] >= 0)) continue;
    const b: Blend = new Map();
    for (let k = 0; k < K; k++) {
      const v = p.corners[i * K + k], s = p.bary[i * K + k];
      if (!(v >= 0) || !(s > 0)) continue;
      for (let j = 0; j < 4; j++) { const w = skin.weight[v * 4 + j]; if (w > 0) { const bone = skin.index[v * 4 + j]; b.set(bone, (b.get(bone) ?? 0) + s * w); } }
      if (skin.jiggle) for (let c = 0; c < 3; c++) jiggle[i * 3 + c] += s * Math.max(0, skin.jiggle[v * 3 + c]);
    }
    // her legs' share held to legShare, the rest given to her hips
    if (legs && hip >= 0 && legShare < 1) {
      let onLegs = 0, total = 0;
      for (const [bone, w] of b) { total += w; if (legs.has(bone)) onLegs += w; }
      const most = legShare * total;
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
  // ...and more where two kinds of piece meet (`pieces`: the body and a sleeve), within `seamHops` of the seam, fading
  // out away from it: the two are carried differently, and the seam between them is blended over a few centimetres
  const hops = new Int32Array(n).fill(-1);
  if (p.pieces) {
    let front: number[] = [];
    for (let i = 0; i < n; i++) if (blends[i] && near[i].some((q) => p.pieces![q] !== p.pieces![i])) { hops[i] = 0; front.push(i); }
    for (let h = 1; h <= FREEZE.seamHops && front.length; h++) {
      const next: number[] = [];
      for (const i of front) for (const q of near[i]) if (hops[q] < 0) { hops[q] = h; next.push(q); }
      front = next;
    }
  }
  const seamPasses = p.pieces ? FREEZE.seamPasses : 0;
  for (let pass = 0; pass < passes + seamPasses; pass++) {
    const nextB: (Blend | null)[] = blends.slice(), nextJ = jiggle.slice(), seamOnly = pass >= passes;
    for (let i = 0; i < n; i++) {
      const own = blends[i], nb = near[i];
      if (!own || nb.length === 0) continue;
      const share = seamOnly ? (hops[i] < 0 ? 0 : shareAll * (1 - hops[i] / (FREEZE.seamHops + 1))) : shareAll;
      if (share <= 0) continue;
      const mix: Blend = new Map(), k = share / nb.length;
      for (const [bone, w] of own) mix.set(bone, (1 - share) * w);
      for (const q of nb) for (const [bone, w] of blends[q]!) mix.set(bone, (mix.get(bone) ?? 0) + k * w);
      nextB[i] = mix;
      for (let c = 0; c < 3; c++) { let m = 0; for (const q of nb) m += jiggle[q * 3 + c]; nextJ[i * 3 + c] = (1 - share) * jiggle[i * 3 + c] + share * (m / nb.length); }
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
}
/** How her detail through the tee is carried: per spot, its freeze-time matrix's inverse and the bones it is carried by. */
interface SpotCarry { readonly inverse: number[]; readonly index: number[]; readonly weight: number[] }
/** A frozen tee as it is kept between visits. */
export interface FrozenSave {
  readonly v: 1;
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

  private constructor(meshes: THREE.SkinnedMesh[], detail: FrozenSave['detail']) {
    this.meshes = meshes; this.detail = detail;
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
    // which of her skin carries each particle: as the cloth's contact has it, or the points of her skin nearest it as she
    // stands now (`nearest`, or every one without a contact)
    const np = Math.floor(particles.position.length / 3), given = particles.corners && particles.bary ? (particles.under ?? 3) : 0;
    const wants = (i: number) => !given || !!particles.nearest?.[i];
    let near: { corners: Int32Array; bary: Float32Array } | null = null;
    if (Array.from({ length: np }, (_, i) => i).some(wants)) {
      const bp = body.geometry.getAttribute('position'), ns = bp.count, world = new Float32Array(ns * 3), usable = new Uint8Array(ns), v = new THREE.Vector3();
      body.skeleton.update();
      for (let i = 0; i < ns; i++) {
        body.getVertexPosition(i, v).applyMatrix4(body.matrixWorld).toArray(world, i * 3);
        let ignored = 0;
        if (options.ignore) for (let j = 0; j < 4; j++) if (options.ignore.has(skin.index[i * 4 + j])) ignored += skin.weight[i * 4 + j];
        usable[i] = ignored < 0.5 ? 1 : 0;
      }
      const perM = options.unitsPerMetre ?? 1, at = new Float32Array(np * 3).fill(NaN);
      for (let i = 0; i < np; i++) if (wants(i)) for (let c = 0; c < 3; c++) at[i * 3 + c] = particles.position[i * 3 + c];
      near = nearestSkin(world, usable, at, FREEZE.near, FREEZE.cellM * perM, FREEZE.softM * perM);
    }
    const K = Math.max(given, near ? FREEZE.near : 0), corners = new Int32Array(np * K).fill(-1), bary = new Float32Array(np * K);
    for (let i = 0; i < np; i++) {
      const fromNear = wants(i) && near && near.corners[i * FREEZE.near] >= 0;
      const k = fromNear ? FREEZE.near : given, C = fromNear ? near!.corners : particles.corners!, B = fromNear ? near!.bary : particles.bary!;
      if (!k) continue;
      for (let j = 0; j < k; j++) { corners[i * K + j] = C[i * k + j]; bary[i * K + j] = B[i * k + j]; }
    }
    const carriers = { corners, bary, under: K };
    const { blends, jiggle } = particleSkin(skin, { ...particles, ...carriers }, options.passes ?? FREEZE.passes, FREEZE.share, options);
    const worn: number[] = [];
    for (let i = 0; i < blends.length; i++) if (blends[i]) worn.push(i);
    const nearest = (x: number, y: number, z: number): number => {
      let best = -1, bd = Infinity;
      for (const i of worn) { const dx = particles.position[i * 3] - x, dy = particles.position[i * 3 + 1] - y, dz = particles.position[i * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } }
      return best;
    };
    // her bounce now: each point's rest place is taken without it, so it is where the cloth was when she is still
    const bounce = jiggleOf(body)?.uniforms ?? null;
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
      const world = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const v = kept[i];
        p.set(pos.getX(v), pos.getY(v), pos.getZ(v)).applyMatrix4(src);
        p.toArray(world, i * 3);
        if (!Number.isFinite(p.x + p.y + p.z)) { topBones(null, index, weight, i * 4); continue; }
        const q = s.particleOf ? s.particleOf[v] : nearest(p.x, p.y, p.z), b = q >= 0 ? blends[q] : null;
        topBones(b, index, weight, i * 4);
        if (q >= 0) for (let c = 0; c < 3; c++) jig[i * 3 + c] = jiggle[q * 3 + c];
        pose.matrix(index, weight, i * 4, M);
        inv.copy(M).invert();
        p.applyMatrix4(inv);
        if (bounce) {
          const J = jig, o = i * 3, be = bounce.belly.value, l = bounce.breastL.value, r = bounce.breastR.value;
          p.x -= J[o] * be.x + J[o + 1] * l.x + J[o + 2] * r.x; p.y -= J[o] * be.y + J[o + 1] * l.y + J[o + 2] * r.y; p.z -= J[o] * be.z + J[o + 1] * l.z + J[o + 2] * r.z;
        }
        p.toArray(position, i * 3);
        if (nor) { nrm.set(nor.getX(v), nor.getY(v), nor.getZ(v)).applyMatrix3(srcN).transformDirection(inv); nrm.toArray(normal, i * 3); } else normal[i * 3 + 2] = 1;
      }
      g.setAttribute('position', new THREE.BufferAttribute(position, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(index, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(weight, 4));
      if (sj) g.setAttribute(JIGGLE_ATTRIBUTE, new THREE.BufferAttribute(jig, 3));
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
    return new FrozenCloth(meshes, carried);
  }

  /** A kept freeze put back on her (null: it could not be read). */
  static restore(body: THREE.SkinnedMesh, saved: FrozenSave, material: THREE.Material): FrozenCloth | null {
    if (!saved || saved.v !== 1 || !Array.isArray(saved.meshes)) return null;
    try {
      const meshes = saved.meshes.map((pm) => {
        const g = new THREE.BufferGeometry();
        for (const [name, pa] of Object.entries(pm.attributes)) g.setAttribute(name, unpackAttribute(pa));
        const buf = bufferOf(pm.index.data);
        g.setIndex(new THREE.BufferAttribute(pm.index.kind === 'u16' ? new Uint16Array(buf) : new Uint32Array(buf), 1));
        for (const gr of pm.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
        const mesh = new THREE.SkinnedMesh(g, material);
        mesh.name = pm.name; mesh.frustumCulled = false; mesh.castShadow = pm.castShadow ?? false; mesh.receiveShadow = pm.receiveShadow ?? false; mesh.renderOrder = pm.renderOrder ?? 0;
        body.add(mesh);
        mesh.bindMode = body.bindMode;
        mesh.bind(body.skeleton, body.bindMatrix);
        return mesh;
      });
      return new FrozenCloth(meshes, saved.detail ?? null);
    } catch (error) {
      console.warn('[sarahlab] a kept frozen tee could not be read', error);
      return null;
    }
  }

  /** Kept: everything it draws with, packed, and how her detail through it is carried. */
  save(): FrozenSave {
    return {
      v: 1, at: new Date().toISOString(), detail: this.detail,
      meshes: this.meshes.map((m) => {
        const g = m.geometry, attributes: Record<string, PackedAttribute> = {};
        for (const [name, a] of Object.entries(g.attributes)) attributes[name] = packAttribute(name, a as THREE.BufferAttribute);
        const idx = g.getIndex()!, big = largest(idx.array as ArrayLike<number>) > 65535;
        return {
          name: m.name, attributes, groups: g.groups.map((gr) => ({ start: gr.start, count: gr.count, materialIndex: gr.materialIndex })),
          castShadow: m.castShadow, receiveShadow: m.receiveShadow, renderOrder: m.renderOrder,
          index: { kind: big ? 'u32' : 'u16', data: bytesOf(big ? Uint32Array.from(idx.array as ArrayLike<number>) : Uint16Array.from(idx.array as ArrayLike<number>)) },
        };
      }),
    };
  }

  /** How many bytes a save of it holds (its arrays). */
  static bytes(saved: FrozenSave): number {
    let n = 0;
    for (const m of saved.meshes) { n += m.index.data.byteLength; for (const a of Object.values(m.attributes)) n += a.data.byteLength; }
    return n;
  }

  get visible(): boolean { return this.meshes[0]?.visible ?? false; }
  set visible(on: boolean) { for (const m of this.meshes) m.visible = on; }

  /** How many points it draws (all its drawings). */
  get vertices(): number { return this.meshes.reduce((s, m) => s + m.geometry.getAttribute('position').count, 0); }

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
