/**
 * HER SKELETON INSIDE v2 (Joshua, 2026-11-09: "Add the skeleton in v2, and match the skeleton to v2, doing random poses to
 * make sure the skeleton doesn't come through the skin and can help us plan everything around the actual skeleton
 * structure"; the plan doc's new direction, step 1, and its rules for the port: v2's rig and proportions win, any joint
 * moved is its own reviewed change).
 *
 * The skeleton model (models/sarah-skeleton.glb, scripts/rigSkeleton.mjs) carries Sarah's own 68 bones -- the same names,
 * order and hierarchy as v2's -- each piece of bone carried rigidly by one of them. Here its bone pieces are laid into v2's
 * body as they stand in her rest frame (metres; both files share it: her hip joints matched in x and z, her height) and
 * bound to v2's OWN bones by name, with v2's own bind: at rest they stay exactly where the skeleton file has them, and as
 * she moves each piece turns with v2's bone of its name. v2's bones never move (her skin, morphs, clothes and face are
 * tied to them). Its `Jaw` (the skeleton's 69th bone) rides v2's head bone.
 *
 * `depths` measures, in any pose, how far each piece of bone sits under her skin as drawn now (her belly and shapes
 * included): the random-pose test's numbers.
 */
import * as THREE from 'three';

/** What counts as close to her skin: a bone this near it (or through it) is reported. GAME TUNING (Joshua, 2026-11-09:
 * "it's okay if it's close"). Metres. */
export const SKELETON_CLOSE_M = 0.005;

export interface BoneDepth { readonly bone: string; readonly points: number; readonly leastMm: number; readonly closeCount: number; readonly throughCount: number }

export class SkeletonInV2 {
  readonly mesh: THREE.SkinnedMesh;
  /** each vertex's bone name (the one that carries it most), for the report */
  private readonly owner: string[];

  /**
   * @param skeletonMesh the skeleton file's skinned mesh, and `skeletonToRest` its geometry to her rest frame (metres)
   * @param body v2's skinned body mesh, and `bodyToRest` its geometry to her rest frame (metres)
   */
  constructor(skeletonMesh: THREE.SkinnedMesh, skeletonToRest: THREE.Matrix4, private readonly body: THREE.SkinnedMesh, bodyToRest: THREE.Matrix4) {
    const src = skeletonMesh.geometry, pos = src.getAttribute('position'), nrm = src.getAttribute('normal');
    const toBody = new THREE.Matrix4().copy(bodyToRest).invert().multiply(skeletonToRest), toBodyN = new THREE.Matrix3().getNormalMatrix(toBody);
    const n = pos.count, P = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(toBody).toArray(P, i * 3);
      if (nrm) v.fromBufferAttribute(nrm, i).applyMatrix3(toBodyN).normalize().toArray(N, i * 3);
    }
    // its bones by name onto v2's (the skeleton's Jaw onto v2's head: the bone its own Jaw hangs from)
    const theirs = skeletonMesh.skeleton.bones, ours = body.skeleton.bones, byName = new Map(ours.map((b, k) => [b.name, k]));
    const map = theirs.map((b) => byName.get(b.name) ?? byName.get(b.parent?.name ?? '') ?? 0);
    const si = src.getAttribute('skinIndex'), sw = src.getAttribute('skinWeight');
    const I = new Uint16Array(n * 4), W = new Float32Array(n * 4);
    this.owner = new Array(n);
    for (let i = 0; i < n; i++) {
      let best = 0, bestW = -1;
      for (let c = 0; c < 4; c++) {
        const j = si.getComponent(i, c), w = sw.getComponent(i, c);
        I[i * 4 + c] = map[j] ?? 0; W[i * 4 + c] = w;
        if (w > bestW) { bestW = w; best = j; }
      }
      this.owner[i] = theirs[best]?.name ?? '?';
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    if (nrm) g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); else g.computeVertexNormals();
    g.setAttribute('skinIndex', new THREE.BufferAttribute(I, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(W, 4));
    if (src.index) g.setIndex(src.index.clone());
    const mat = (Array.isArray(skeletonMesh.material) ? skeletonMesh.material[0] : skeletonMesh.material).clone();
    this.mesh = new THREE.SkinnedMesh(g, mat);
    this.mesh.name = 'skeletonInV2';
    this.mesh.frustumCulled = false;
    // beside her body, in its frame, on her own bones with her own bind
    this.mesh.position.copy(body.position); this.mesh.quaternion.copy(body.quaternion); this.mesh.scale.copy(body.scale);
    this.mesh.bindMode = body.bindMode;
    body.parent?.add(this.mesh);
    this.mesh.bind(body.skeleton, body.bindMatrix);
  }

  set visible(on: boolean) { this.mesh.visible = on; }

  /**
   * How deep each piece of bone sits under her skin now, by the bone that carries it: its least depth (mm; negative =
   * through her skin), and how many of its points are within SKELETON_CLOSE_M of her skin or through it. Every `stride`th
   * point of the skeleton is checked against every point of her body as drawn (morphs, shapes and pose; not the jiggle).
   * `units`: world units per metre.
   */
  depths(units: number, stride = 3): BoneDepth[] {
    const body = this.body, bp = body.geometry.getAttribute('position');
    body.updateMatrixWorld(true); this.mesh.updateMatrixWorld(true);
    // her skin as drawn now (world), and its normals from its triangles
    const m = bp.count, S = new Float32Array(m * 3), v = new THREE.Vector3();
    for (let i = 0; i < m; i++) { body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld).toArray(S, i * 3); }
    const SN = new Float32Array(m * 3), ix = (body.userData.allIndices as ArrayLike<number> | undefined) ?? body.geometry.index?.array;
    if (!ix) return [];
    for (let t = 0; t + 2 < ix.length; t += 3) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
      const ux = S[b] - S[a], uy = S[b + 1] - S[a + 1], uz = S[b + 2] - S[a + 2], wx = S[c] - S[a], wy = S[c + 1] - S[a + 1], wz = S[c + 2] - S[a + 2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      for (const k of [a, b, c]) { SN[k] += nx; SN[k + 1] += ny; SN[k + 2] += nz; }
    }
    // (a grid of her skin's points, 3 cm cells)
    const cell = 0.03 * units, key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    const grid = new Map<string, number[]>();
    for (let i = 0; i < m; i++) { const k = key(S[i * 3], S[i * 3 + 1], S[i * 3 + 2]); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
    const out = new Map<string, { points: number; least: number; close: number; through: number }>();
    const sp = this.mesh.geometry.getAttribute('position'), p = new THREE.Vector3();
    for (let i = 0; i < sp.count; i += stride) {
      this.mesh.getVertexPosition(i, p); p.applyMatrix4(this.mesh.matrixWorld);
      const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
      let best = -1, bd = Infinity;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
        if (l) for (const j of l) { const d = (S[j * 3] - p.x) ** 2 + (S[j * 3 + 1] - p.y) ** 2 + (S[j * 3 + 2] - p.z) ** 2; if (d < bd) { bd = d; best = j; } }
      }
      const o = out.get(this.owner[i]) ?? { points: 0, least: Infinity, close: 0, through: 0 };
      o.points++;
      if (best >= 0) {
        // depth under her skin along its outward normal there (metres; < 0 through it)
        const nl = Math.hypot(SN[best * 3], SN[best * 3 + 1], SN[best * 3 + 2]) || 1;
        const depth = ((S[best * 3] - p.x) * SN[best * 3] + (S[best * 3 + 1] - p.y) * SN[best * 3 + 1] + (S[best * 3 + 2] - p.z) * SN[best * 3 + 2]) / nl / units;
        o.least = Math.min(o.least, depth);
        if (depth < SKELETON_CLOSE_M) o.close++;
        if (depth < 0) o.through++;
      }
      out.set(this.owner[i], o);
    }
    return [...out.entries()].map(([bone, o]) => ({ bone, points: o.points, leastMm: Number.isFinite(o.least) ? +(o.least * 1000).toFixed(1) : 999, closeCount: o.close, throughCount: o.through })).sort((a, b) => a.leastMm - b.leastMm);
  }

  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
