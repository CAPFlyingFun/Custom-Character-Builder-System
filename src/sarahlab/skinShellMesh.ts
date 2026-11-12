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

  // her bones: the three vertices' weights summed where each vertex lies, the four strongest kept
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined;
  const outI = new Uint16Array(P * 4), outW = new Float32Array(P * 4);
  let weightsVersion = -1;
  const readWeights = () => {
    if (!si || !sw) return;
    weightsVersion = sw.version;
    const I = floatsOf(si), W = floatsOf(sw), acc = new Map<number, number>();
    outI.fill(0); outW.fill(0);
    for (let p = 0; p < P; p++) {
      acc.clear();
      for (let k = 0; k < 3; k++) {
        const s = bake.src[p * 3 + k], b = bake.bary[p * 3 + k];
        if (b <= 0) continue;
        for (let j = 0; j < 4; j++) { const w = W[s * 4 + j]; if (w > 0) acc.set(I[s * 4 + j], (acc.get(I[s * 4 + j]) ?? 0) + b * w); }
      }
      const top = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((m, [, w]) => m + w, 0) || 1;
      top.forEach(([bone, w], j) => { outI[p * 4 + j] = bone; outW[p * 4 + j] = w / sum; });
    }
  };
  readWeights();
  geom.setAttribute('skinIndex', new THREE.BufferAttribute(outI, 4));
  geom.setAttribute('skinWeight', new THREE.BufferAttribute(outW, 4));

  // her springs: the belly's and breasts' follow weights (her legs' ride the breasts' channels coded negative -- a blend
  // of them is no weight, so the garment keeps none of those) and her baby's push
  const jig = g.getAttribute(JIGGLE_ATTRIBUTE) as THREE.BufferAttribute | undefined;
  if (jig) {
    const j = new Float32Array(P * 3); sampleSkin(j, floatsOf(jig), 3, bake.src, bake.bary, P);
    for (let q = 0; q < P; q++) { if (j[q * 3 + 1] < 0) j[q * 3 + 1] = 0; if (j[q * 3 + 2] < 0) j[q * 3 + 2] = 0; }
    geom.setAttribute(JIGGLE_ATTRIBUTE, new THREE.BufferAttribute(j, 3));
  }
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
      const out = new Float32Array(P * 3); sampleSkin(out, floatsOf(mp[k]), 3, bake.src, bake.bary, P);
      const n = mn?.[k];
      let nOut: Float32Array | null = null;
      if (n) { nOut = new Float32Array(P * 3); sampleSkin(nOut, floatsOf(n), 3, bake.src, bake.bary, P); tmp.set(nOut); for (let p = 0; p < P; p++) for (let c = 0; c < 3; c++) out[p * 3 + c] += heights[p] * tmp[p * 3 + c]; }
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
