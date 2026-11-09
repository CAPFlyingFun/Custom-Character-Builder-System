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
import { depthsInSkin, raysAt, skinGrid } from '../actor/insideSkin';

/** What counts as close to her skin: a bone this near it (or through it) is reported. GAME TUNING (Joshua, 2026-11-09:
 * "it's okay if it's close"). Metres. */
export const SKELETON_CLOSE_M = 0.005;

/**
 * HER LIMBS ON v2's JOINTS (Joshua, 2026-11-09: "the skin matches to the bone structure, not bone to skin... the bone size
 * can be changed a little"; the port's rule 1, v2's rig wins). The skeleton file stands in a T with its arms out and its
 * own joints (knees 6 cm lower, shoulders 6 cm further apart than v2's rig); v2 binds with her arms down. Each limb's
 * bones are laid on v2's joints: the upper bone from v2's first joint to its second, the lower from the second to the
 * third -- turned onto v2's line and stretched along it to v2's length, never thicker or thinner -- and the hand or foot
 * carried on from the third joint as the lower bone turned. Her trunk, pelvis, ribs and skull stay where the skeleton
 * file has them (v2's spine joints are an auto-rig's, not her spine's).
 */
export interface LimbFit {
  /** each limb's three joints, by bone name: [hip, knee, ankle] or [shoulder, elbow, wrist] */
  readonly chains: readonly (readonly [string, string, string])[];
  /** a bone's joint at bind in her rest frame (metres): the skeleton file's, and v2's */
  readonly skeletonJoint: (name: string) => THREE.Vector3 | null;
  readonly v2Joint: (name: string) => THREE.Vector3 | null;
}

export interface BoneDepth { readonly bone: string; readonly points: number; readonly leastMm: number; readonly at: readonly number[]; readonly closeCount: number; readonly throughCount: number }

export class SkeletonInV2 {
  readonly mesh: THREE.SkinnedMesh;
  /** each vertex's bone name (the one that carries it most), for the report */
  private readonly owner: string[];

  /**
   * @param skeletonMesh the skeleton file's skinned mesh, and `skeletonToRest` its geometry to her rest frame (metres)
   * @param body v2's skinned body mesh, and `bodyToRest` its geometry to her rest frame (metres)
   */
  /** each limb laid on v2's joints (LimbFit): how far its bones were stretched, by joint, for the report */
  readonly stretch: Record<string, number> = {};

  constructor(skeletonMesh: THREE.SkinnedMesh, skeletonToRest: THREE.Matrix4, private readonly body: THREE.SkinnedMesh, bodyToRest: THREE.Matrix4, fit: LimbFit | null = null) {
    const src = skeletonMesh.geometry, pos = src.getAttribute('position'), nrm = src.getAttribute('normal');
    const toBody = new THREE.Matrix4().copy(bodyToRest).invert(), toBodyN = new THREE.Matrix3().getNormalMatrix(toBody);
    const restN = new THREE.Matrix3().getNormalMatrix(skeletonToRest);
    // its bones by name onto v2's (the skeleton's Jaw onto v2's head: the bone its own Jaw hangs from)
    const theirs = skeletonMesh.skeleton.bones, ours = body.skeleton.bones, byName = new Map(ours.map((b, k) => [b.name, k]));
    const map = theirs.map((b) => byName.get(b.name) ?? byName.get(b.parent?.name ?? '') ?? 0);
    const si = src.getAttribute('skinIndex'), sw = src.getAttribute('skinWeight');
    const n = pos.count, I = new Uint16Array(n * 4), W = new Float32Array(n * 4);
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
    // each limb's bones onto v2's joints (rest metres): which part of a limb each bone of the skeleton is
    type Seg = { from: THREE.Vector3; to: THREE.Vector3; q: THREE.Quaternion; axis: THREE.Vector3; s: number; end?: undefined } | { end: true; from: THREE.Vector3; to: THREE.Vector3; q: THREE.Quaternion };
    const partOf = new Map<string, Seg>();
    if (fit) for (const [a, b, c] of fit.chains) {
      const J = [a, b, c].map(fit.skeletonJoint), V = [a, b, c].map(fit.v2Joint);
      if (J.some((x) => !x) || V.some((x) => !x)) continue;
      const seg = (k: number): Seg & { s: number } => {
        const dj = J[k + 1]!.clone().sub(J[k]!), dv = V[k + 1]!.clone().sub(V[k]!);
        const s = dv.length() / Math.max(1e-6, dj.length()), axis = dj.clone().normalize();
        this.stretch[[a, b][k]] = +s.toFixed(3);
        return { from: J[k]!, to: V[k]!, q: new THREE.Quaternion().setFromUnitVectors(axis, dv.clone().normalize()), axis, s };
      };
      const upper = seg(0), lower = seg(1), end: Seg = { end: true, from: J[2]!, to: V[2]!, q: lower.q };
      // (every bone under the third joint goes with the hand or foot; the first and second carry their own parts)
      const under = (bone: THREE.Object3D, top: string): boolean => { for (let o: THREE.Object3D | null = bone; o; o = o.parent) if (o.name === top) return true; return false; };
      for (const bone of theirs) {
        if (under(bone, c)) partOf.set(bone.name, end);
        else if (under(bone, b)) partOf.set(bone.name, lower);
        else if (under(bone, a)) partOf.set(bone.name, upper);
      }
    }
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(skeletonToRest);
      if (nrm) d.fromBufferAttribute(nrm, i).applyMatrix3(restN);
      const part = partOf.get(this.owner[i]);
      if (part) {
        v.sub(part.from);
        if (!part.end) v.addScaledVector(part.axis, (part.s - 1) * v.dot(part.axis));
        v.applyQuaternion(part.q).add(part.to);
        d.applyQuaternion(part.q);
      }
      v.applyMatrix4(toBody).toArray(P, i * 3);
      if (nrm) d.applyMatrix3(toBodyN).normalize().toArray(N, i * 3);
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
  /** the points `depths` last found within SKELETON_CLOSE_M of her skin or through it (world), to mark them */
  flagged: { x: number; y: number; z: number; through: boolean }[] = [];

  /**
   * How deep each piece of bone sits under her skin now, by the bone that carries it (actor/insideSkin.ts: inside by six
   * rays, depth to the nearest triangle of her skin): its least depth (mm; negative = through her skin), how many of its
   * points are within SKELETON_CLOSE_M of her skin or through it, and where its worst point is (her rest frame as she is
   * placed: metres in the world over `units`). Every `stride`th point of the skeleton is checked against her body as drawn
   * now (morphs, shapes and pose; not the jiggle). Bones in `skip` are left out (her fingers: v2 draws its own over them).
   */
  depths(units: number, stride = 3, skip: ReadonlySet<string> = new Set()): BoneDepth[] {
    const body = this.body, bp = body.geometry.getAttribute('position');
    body.updateMatrixWorld(true); this.mesh.updateMatrixWorld(true);
    const m = bp.count, S = new Float32Array(m * 3), v = new THREE.Vector3();
    for (let i = 0; i < m; i++) { body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld).toArray(S, i * 3); }
    const ix = (body.userData.allIndices as ArrayLike<number> | undefined) ?? body.geometry.index?.array;
    if (!ix) return [];
    const grid = skinGrid(S, ix, 0.02 * units);
    const sp = this.mesh.geometry.getAttribute('position'), which: number[] = [];
    for (let i = 0; i < sp.count; i += stride) if (!skip.has(this.owner[i])) which.push(i);
    const pts = new Float32Array(which.length * 3);
    which.forEach((i, k) => { this.mesh.getVertexPosition(i, v); v.applyMatrix4(this.mesh.matrixWorld).toArray(pts, k * 3); });
    const depth = depthsInSkin(grid, pts, 0.06 * units);
    const out = new Map<string, { points: number; least: number; at: number[]; close: number; through: number }>();
    this.flagged = [];
    which.forEach((i, k) => {
      if (depth[k] / units < SKELETON_CLOSE_M) this.flagged.push({ x: pts[k * 3], y: pts[k * 3 + 1], z: pts[k * 3 + 2], through: depth[k] < 0 });
      const o = out.get(this.owner[i]) ?? { points: 0, least: Infinity, at: [], close: 0, through: 0 }, d = depth[k] / units;
      o.points++;
      if (d < o.least) { o.least = d; o.at = [pts[k * 3] / units, pts[k * 3 + 1] / units, pts[k * 3 + 2] / units].map((x) => +x.toFixed(3)); }
      if (d < SKELETON_CLOSE_M) o.close++;
      if (d < 0) o.through++;
      out.set(this.owner[i], o);
    });
    return [...out.entries()].map(([bone, o]) => ({ bone, points: o.points, leastMm: +(o.least * 1000).toFixed(1), at: o.at, closeCount: o.close, throughCount: o.through })).sort((a, b) => a.leastMm - b.leastMm);
  }

  /** For probes: her skin's grid as drawn now, and each ray's crossings from a world point. */
  raysAt(units: number, x: number, y: number, z: number): { rays: number[]; tris: number; verts: number; lo: readonly number[]; dim: readonly number[] } {
    const body = this.body, bp = body.geometry.getAttribute('position'), m = bp.count, S = new Float32Array(m * 3), v = new THREE.Vector3();
    body.updateMatrixWorld(true);
    for (let i = 0; i < m; i++) { body.getVertexPosition(i, v); v.applyMatrix4(body.matrixWorld).toArray(S, i * 3); }
    const ix = (body.userData.allIndices as ArrayLike<number> | undefined) ?? body.geometry.index!.array, g = skinGrid(S, ix, 0.02 * units);
    return { rays: raysAt(g, x, y, z), tris: ix.length / 3, verts: m, lo: g.lo, dim: g.dim };
  }

  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
