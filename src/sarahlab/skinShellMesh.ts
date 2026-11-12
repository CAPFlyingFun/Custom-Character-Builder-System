/**
 * A SKIN-MADE GARMENT, LAID ON HER IN THE ROOM (`skinShell.ts` for what it is and why).
 *
 * Every vertex of the garment is a place on her skin (three of her vertices and how much of each), so it is given what
 * her skin has there, the way the Sims 4 gives a garment the body's own shape maps and bone weights:
 *   - WHERE: her skin as she is shaped now (her body's own points, every slider and field of hers already in them),
 *     raised off it along her direction there -- laid again whenever her points change (`sync`), so the garment is her
 *     size at every size;
 *   - HER BONES: the three vertices' weights summed, the four strongest kept -- so every pose moves it as her skin;
 *   - HER MOTION SHAPES (belly sizes, breasts, the bounce): each shape's move of her skin there, plus the turn the shape
 *     gives her skin's direction times how high the garment stands off it, so a garment on a growing belly keeps its
 *     height off her and is not left inside her;
 *   - HER SPRINGS (softBody.ts): her belly's and breasts' follow weights and her baby's push, so it bounces with her.
 * Its fabric's pattern is laid from its own shape as it was made (`fabricRest`, triplanar: fabricMaterial.ts), so the
 * knit rides with it and stretches as her skin does instead of sliding across it.
 *
 * Nothing of hers is changed: her body file, her points, her draw (her skin is never hidden under clothes on v2,
 * sarahLabTool.ts bodyNeverHidden) -- the garment is only drawn over her.
 */
import * as THREE from 'three';
import { JIGGLE_ATTRIBUTE, PUSH_ATTRIBUTE, UNITS_PER_METRE } from './softBody';
import { SKIN_SHELL, bakeSkinShell, bridgeLift, heightsOf, layShell, normalizeEach, sampleSkin, type ShellLay, type SkinShellBake } from './skinShell';

export interface SkinShellOptions {
  /** per vertex of hers: the garment's outline field, METRES, positive inside it */
  readonly field: ArrayLike<number>;
  /** her triangles to cut it from -- all of her skin's there (the room's draw index may lack some: pass them too) */
  readonly indices: ArrayLike<number>;
  /** what it is drawn with (shared: never disposed here) */
  readonly material: THREE.Material;
  readonly name: string;
  /** how far off her skin, metres (SKIN_SHELL.offset) */
  readonly offset?: number;
  /** rounds of the robe (SKIN_SHELL.bridgeRounds; 0 for none) */
  readonly bridgeRounds?: number;
}

export interface SkinShell {
  readonly mesh: THREE.SkinnedMesh;
  readonly bake: SkinShellBake;
  /** read her shape back onto it if hers changed (her points, her weights, her baby's push); true when it did */
  sync(): boolean;
  /** how far off her skin it stands, metres (laid again at once) */
  setOffset(metres: number): void;
  readonly offset: number;
  dispose(): void;
  debug(): Record<string, unknown>;
}

/** An attribute as plain floats, one entry a vertex (a quantized or interleaved one read through getComponent). */
function floatsOf(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  if (attr instanceof THREE.BufferAttribute && attr.array instanceof Float32Array && !attr.normalized) return attr.array;
  const n = attr.count, s = attr.itemSize, out = new Float32Array(n * s);
  for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) out[i * s + k] = attr.getComponent(i, k);
  return out;
}

/** Her attribute at each garment vertex (Σ weight × hers), read only at the three vertices of hers each one needs --
 *  her motion shapes are stored packed, and unpacking all of her for every shape cost a sixth of a second (review). */
function sampleAttr(out: Float32Array, attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, size: number, src: Uint32Array, bary: Float32Array, count: number): void {
  if (attr instanceof THREE.BufferAttribute && attr.array instanceof Float32Array && !attr.normalized && attr.itemSize === size) { sampleSkin(out, attr.array, size, src, bary, count); return; }
  for (let p = 0; p < count; p++) for (let k = 0; k < size; k++) {
    let v = 0;
    for (let c = 0; c < 3; c++) { const w = bary[p * 3 + c]; if (w !== 0) v += w * attr.getComponent(src[p * 3 + c], k); }
    out[p * size + k] = v;
  }
}

/**
 * Her springs' follow weights at each garment vertex (softBody.ts): the belly's in x; her breasts' in y and z, or, coded
 * negative there, a leg's -- thigh in y, calf in z, her right leg 10 further down. Each of her three vertices is read
 * apart into what it carries, those are blended, and the blend coded back: a straight blend of coded numbers mixed a
 * leg's weight into nonsense, and zeroing them left the garment's leg edges still while her thighs' skin swung through
 * them (2026-11-11 review). A garment vertex carries one leg, the one weighing more there.
 */
function sampleJiggle(out: Float32Array, jig: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, src: Uint32Array, bary: Float32Array, count: number): void {
  const OFF = 10;
  for (let p = 0; p < count; p++) {
    let belly = 0, bl = 0, br = 0, tl = 0, cl = 0, tr = 0, cr = 0;
    for (let c = 0; c < 3; c++) {
      const w = bary[p * 3 + c]; if (w === 0) continue;
      const v = src[p * 3 + c], x = jig.getComponent(v, 0), y = jig.getComponent(v, 1), z = jig.getComponent(v, 2);
      belly += w * x;
      if (y >= 0) bl += w * y; else { const a = -y; if (a >= OFF) tr += w * (a % OFF); else tl += w * a; }
      if (z >= 0) br += w * z; else { const a = -z; if (a >= OFF) cr += w * (a % OFF); else cl += w * a; }
    }
    out[p * 3] = belly;
    const left = tl + cl, right = tr + cr;
    if (left <= 0 && right <= 0) { out[p * 3 + 1] = bl; out[p * 3 + 2] = br; continue; }
    // (her legs and her breasts never share a vertex of hers: a leg wins where the blend has both, as it is packed)
    const off = right > left ? OFF : 0, t = right > left ? tr : tl, cc = right > left ? cr : cl;
    out[p * 3 + 1] = -(t + off); out[p * 3 + 2] = -(cc + off);
  }
}

/** Cut the garment from `body`'s skin and lay it on her. Null when its outline takes in none of her. */
export function createSkinShell(body: THREE.SkinnedMesh, opts: SkinShellOptions): SkinShell | null {
  const g = body.geometry as THREE.BufferGeometry;
  const bp = g.getAttribute('position') as THREE.BufferAttribute, bn = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (!bp || !bn) return null;
  const U = UNITS_PER_METRE;
  const field = new Float32Array(bp.count);
  for (let i = 0; i < field.length; i++) { const x = opts.field[i]; field[i] = Number.isFinite(x) ? x * U : -1; }
  const bake = bakeSkinShell({ positions: floatsOf(bp), indices: opts.indices, field, weld: SKIN_SHELL.weld * U, snap: SKIN_SHELL.snap * U });
  if (!bake.faceCount || !bake.index.length) return null;
  const P = bake.count;

  let offsetM = opts.offset ?? SKIN_SHELL.offset;
  const lay = (): ShellLay => ({ offset: offsetM * U, hemBulge: SKIN_SHELL.hemBulge, hemFoot: SKIN_SHELL.hemFoot * U });

  // her skin under every vertex, and her direction there
  const skin = new Float32Array(P * 3), dir = new Float32Array(P * 3);
  const readSkin = () => {
    sampleSkin(skin, floatsOf(bp), 3, bake.src, bake.bary, P);
    sampleSkin(dir, floatsOf(bn), 3, bake.src, bake.bary, P);
    normalizeEach(dir);
  };
  readSkin();
  // the robe, worked out once on her as she is now and carried with her after
  const rounds = opts.bridgeRounds ?? SKIN_SHELL.bridgeRounds;
  let lift: Float32Array | null = rounds > 0 ? bridgeLift(bake, skin, dir, lay().offset, rounds) : null;

  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(P * 3), nrm = new Float32Array(P * 3);
  layShell(bake, skin, dir, lift, lay(), pos, nrm);
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  // its fabric's pattern laid from its shape as made
  geom.setAttribute('fabricRest', new THREE.BufferAttribute(pos.slice(), 3));
  geom.setAttribute('fabricRestNormal', new THREE.BufferAttribute(nrm.slice(), 3));

  // her bones: the three vertices' weights summed where each vertex lies -- then SMOOTHED over the garment, its edges
  // held to her skin's own (`SKIN_SHELL.weightRounds`): the Sims 4 makers' "smooth skirt weights across both legs". Her
  // skin's weights change sharply where her body folds or parts -- down the middle of her crotch each lip is its own
  // side's -- and a garment given them exactly creased and tore along that line as her legs parted (2026-11-11, RECLINE
  // and SQUAT, seen from under her: its triangles there turned over). Fabric spans those lines; so its weights flow
  // between its edges, which stay on her skin where they lie. The four strongest kept.
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined;
  const outI = new Uint16Array(P * 4), outW = new Float32Array(P * 4);
  let weightsVersion = -1;
  const readWeights = () => {
    if (!si || !sw) return;
    weightsVersion = sw.version;
    const I = floatsOf(si), W = floatsOf(sw), F = bake.faceCount;
    // the bones it uses, numbered densely, and each face vertex's weight on each
    const slot = new Map<number, number>(), bones: number[] = [];
    for (let p = 0; p < F; p++) for (let k = 0; k < 3; k++) { const s = bake.src[p * 3 + k]; if (bake.bary[p * 3 + k] <= 0) continue; for (let j = 0; j < 4; j++) if (W[s * 4 + j] > 0 && !slot.has(I[s * 4 + j])) { slot.set(I[s * 4 + j], bones.length); bones.push(I[s * 4 + j]); } }
    const B = bones.length;
    let A = new Float32Array(F * B), Z = new Float32Array(F * B);
    for (let p = 0; p < F; p++) for (let k = 0; k < 3; k++) {
      const s = bake.src[p * 3 + k], b = bake.bary[p * 3 + k];
      if (b <= 0) continue;
      for (let j = 0; j < 4; j++) { const w = W[s * 4 + j]; if (w > 0) A[p * B + slot.get(I[s * 4 + j])!] += b * w; }
    }
    for (let r = 0; r < SKIN_SHELL.weightRounds; r++) {
      for (let p = 0; p < F; p++) {
        const s0 = bake.nbrStart[p], e0 = bake.nbrStart[p + 1];
        if (bake.edge[p] || e0 === s0) { for (let q = 0; q < B; q++) Z[p * B + q] = A[p * B + q]; continue; }
        const k = SKIN_SHELL.weightStep / (e0 - s0);
        for (let q = 0; q < B; q++) {
          let m = 0; for (let j = s0; j < e0; j++) m += A[bake.nbr[j] * B + q];
          Z[p * B + q] = (1 - SKIN_SHELL.weightStep) * A[p * B + q] + k * m;
        }
      }
      [A, Z] = [Z, A];
    }
    outI.fill(0); outW.fill(0);
    const order = Array.from({ length: B }, (_, q) => q);
    for (let p = 0; p < P; p++) {
      // (a hem vertex takes the weights of the face's edge it rolls down from)
      const f = p < F ? p : bake.hemOf[p];
      order.sort((x, y) => A[f * B + y] - A[f * B + x]);
      let sum = 0; for (let j = 0; j < 4 && j < B; j++) sum += A[f * B + order[j]];
      for (let j = 0; j < 4 && j < B; j++) { outI[p * 4 + j] = bones[order[j]]; outW[p * 4 + j] = sum > 0 ? A[f * B + order[j]] / sum : j === 0 ? 1 : 0; }
    }
  };
  readWeights();
  geom.setAttribute('skinIndex', new THREE.BufferAttribute(outI, 4));
  geom.setAttribute('skinWeight', new THREE.BufferAttribute(outW, 4));

  // her springs: the belly's and breasts' follow weights (her legs' ride the breasts' channels coded negative -- a blend
  // of them is no weight, so the garment keeps none of those) and her baby's push
  const jig = g.getAttribute(JIGGLE_ATTRIBUTE) as THREE.BufferAttribute | undefined;
  if (jig) { const j = new Float32Array(P * 3); sampleJiggle(j, jig, bake.src, bake.bary, P); geom.setAttribute(JIGGLE_ATTRIBUTE, new THREE.BufferAttribute(j, 3)); }
  const push = new Float32Array(P * 3);
  let pushVersion = -1;
  const pushOf = () => g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined;
  if (pushOf()) geom.setAttribute(PUSH_ATTRIBUTE, new THREE.BufferAttribute(push, 3));

  // her motion shapes still on the GPU: each one's move of her skin, and its turn of her direction carried at the
  // garment's height off her -- only those that move it at all (her face's, her feet's are not sent: the GPU keeps a
  // texture of every shape a mesh has), its own influences copied from hers every frame it is drawn (`sync`)
  const heights = new Float32Array(P);
  let keep: number[] = [];
  const influences: number[] = [];
  const readShapes = () => {
    heightsOf(bake, dir, lift, lay(), heights);
    const mp = g.morphAttributes.position, mn = g.morphAttributes.normal;
    if (!mp?.length) return;
    const tmp = new Float32Array(P * 3), pos2: THREE.BufferAttribute[] = [], nrm2: THREE.BufferAttribute[] = [];
    keep = [];
    const moves = (a: Float32Array, eps: number) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i]) > eps) return true; return false; };
    for (let k = 0; k < mp.length; k++) {
      const out = new Float32Array(P * 3); sampleAttr(out, mp[k], 3, bake.src, bake.bary, P);
      const n = mn?.[k];
      let nOut: Float32Array | null = null;
      if (n) { nOut = new Float32Array(P * 3); sampleAttr(nOut, n, 3, bake.src, bake.bary, P); tmp.set(nOut); for (let p = 0; p < P; p++) for (let c = 0; c < 3; c++) out[p * 3 + c] += heights[p] * tmp[p * 3 + c]; }
      if (!moves(out, 1e-7 * U) && !(nOut && moves(nOut, 1e-4))) continue;
      keep.push(k); pos2.push(new THREE.BufferAttribute(out, 3));
      if (nOut) nrm2.push(new THREE.BufferAttribute(nOut, 3));
    }
    geom.morphAttributes = {};
    if (keep.length) {
      geom.morphAttributes.position = pos2;
      if (mn?.length && nrm2.length === pos2.length) geom.morphAttributes.normal = nrm2;
    }
    geom.morphTargetsRelative = g.morphTargetsRelative;
    influences.length = keep.length; influences.fill(0);
  };
  readShapes();
  const names = () => { const dict = body.morphTargetDictionary; if (!dict) return undefined; const out: Record<string, number> = {}; for (const [name, k] of Object.entries(dict)) { const i = keep.indexOf(k); if (i >= 0) out[name] = i; } return out; };
  const copyInfluences = () => { const from = body.morphTargetInfluences; if (!from) return; for (let i = 0; i < keep.length; i++) influences[i] = from[keep[i]] ?? 0; };
  geom.setIndex(new THREE.BufferAttribute(bake.index, 1));
  geom.computeBoundingSphere();

  const mesh = new THREE.SkinnedMesh(geom, opts.material);
  mesh.name = opts.name;
  mesh.frustumCulled = false;
  mesh.castShadow = body.castShadow; mesh.receiveShadow = body.receiveShadow;
  mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion); mesh.scale.copy(body.scale);
  if (keep.length) { mesh.morphTargetDictionary = names(); mesh.morphTargetInfluences = influences; copyInfluences(); }
  else { mesh.morphTargetDictionary = undefined; mesh.morphTargetInfluences = undefined; }
  mesh.bind(body.skeleton, body.bindMatrix);
  mesh.userData.skinShell = true;
  // her shapes' influences as she is drawn this frame (set after the room's own step, for her belly's tilt and her seat:
  // copied in `sync` alone, it ran a frame behind -- review)
  mesh.onBeforeRender = () => { copyInfluences(); };
  body.parent?.add(mesh);

  let posVersion = bp.version, nrmVersion = bn.version, lays = 1;
  const relay = () => {
    layShell(bake, skin, dir, lift, lay(), pos, nrm);
    (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geom.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    lays++;
  };
  const api: SkinShell = {
    mesh, bake,
    get offset() { return offsetM; },
    sync() {
      let changed = false;
      // her shapes' influences as she is drawn now, for the shapes it carries
      copyInfluences();
      if (bp.version !== posVersion || bn.version !== nrmVersion) {
        posVersion = bp.version; nrmVersion = bn.version;
        readSkin(); relay(); changed = true;
      }
      if (sw && sw.version !== weightsVersion) { readWeights(); (geom.getAttribute('skinWeight') as THREE.BufferAttribute).needsUpdate = true; (geom.getAttribute('skinIndex') as THREE.BufferAttribute).needsUpdate = true; changed = true; }
      const bpush = pushOf();
      if (bpush && bpush.version !== pushVersion) {
        pushVersion = bpush.version; sampleSkin(push, floatsOf(bpush), 3, bake.src, bake.bary, P);
        const a = geom.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined; if (a) a.needsUpdate = true;
        changed = true;
      }
      return changed;
    },
    setOffset(metres: number) {
      if (!(metres > 0) || metres === offsetM) return;
      offsetM = metres;
      lift = rounds > 0 ? bridgeLift(bake, skin, dir, lay().offset, rounds) : null;
      relay(); readShapes();
      if (keep.length) { mesh.morphTargetDictionary = names(); mesh.morphTargetInfluences = influences; copyInfluences(); }
      // (the GPU keeps a geometry's motion shapes until it is told they are new: dropped, they are sent again)
      geom.dispose();
    },
    dispose() { mesh.removeFromParent(); geom.dispose(); },
    debug() {
      let most = 0; if (lift) for (let i = 0; i < lift.length; i += 3) most = Math.max(most, Math.hypot(lift[i], lift[i + 1], lift[i + 2]));
      return {
        vertices: P, face: bake.faceCount, triangles: bake.index.length / 3, faceTriangles: bake.faceTriangles, loops: bake.loops.map((l) => l.length),
        dropped: bake.dropped, duplicates: bake.duplicates, inside: bake.inside.length / 3, cut: bake.cut.length / 3,
        offsetCm: +(offsetM * 100).toFixed(2), robeMostCm: +((most / U) * 100).toFixed(2), lays,
        shapes: keep.length, ofHers: g.morphAttributes.position?.length ?? 0,
      };
    },
  };
  return api;
}
