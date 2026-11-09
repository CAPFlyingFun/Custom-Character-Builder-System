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
import { depthsInSkin, fitWhole, pullInside, raysAt, raysAtBrute, skinGrid } from '../actor/insideSkin';

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
  /** each limb's joints in order, by bone name: [hip, knee, ankle, ball of the foot] or [shoulder, elbow, wrist] */
  readonly chains: readonly (readonly string[])[];
  /** a bone's joint at bind in her rest frame (metres): the skeleton file's, and v2's */
  readonly skeletonJoint: (name: string) => THREE.Vector3 | null;
  readonly v2Joint: (name: string) => THREE.Vector3 | null;
  /** pieces left as they are by the fit under her skin (her fingers: v2 draws its own) */
  readonly noFit?: ReadonlySet<string>;
  /** groups of pieces moved in whole first, keeping their shape (her skull and jaw; each foot's bones), by bone name */
  readonly whole?: readonly (readonly string[])[];
  /** a set size for each whole group (1 its own), slid in but never made smaller than that; null: as small as it must be */
  readonly wholeScale?: readonly (number | null)[];
}

/**
 * HOW THE BONE IS KEPT UNDER HER SKIN (actor/insideSkin.ts `pullInside`): at least this deep (metres), each move shared
 * over this much of its piece. GAME TUNING (Joshua: "it's okay if it's close"; the bone "can be changed a little").
 */
export const SKELETON_FIT = Object.freeze({ margin: 0.004, blend: 0.035, passes: 5, jointBlend: 0.07, jointShare: 0.7 });

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
  /** the fit under her skin: how many points it could not get deep enough, and the most any point moved (mm) */
  fitLeft = 0;
  fitMostMm = 0;
  /** its points in her rest frame as laid (metres) */
  private rest: Float32Array = new Float32Array(0);
  /** The points of the pieces named, in her rest frame (metres): for her skin to be fitted over them (her bare feet). */
  restPointsOf(names: ReadonlySet<string>): Float32Array {
    const out: number[] = [];
    for (let i = 0; i < this.owner.length; i++) if (names.has(this.owner[i])) out.push(this.rest[i * 3], this.rest[i * 3 + 1], this.rest[i * 3 + 2]);
    return Float32Array.from(out);
  }
  /** how far the fit moved each point (metres) */
  private moved: Float32Array = new Float32Array(0);
  /** each whole group's fit: how much smaller, how far slid (mm), how many points still too near */
  readonly wholeFits: { bones: string; scale: number; slideMm: number[]; left: number }[] = [];
  /** the most any point of each piece moved in the fit, mm */
  readonly fitMoves: Record<string, number> = {};

  constructor(skeletonMesh: THREE.SkinnedMesh, skeletonToRest: THREE.Matrix4, private readonly body: THREE.SkinnedMesh, bodyToRest: THREE.Matrix4, fit: LimbFit | null = null, trunkWeights = true) {
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
    type Seg = { from: THREE.Vector3; to: THREE.Vector3; toEnd?: THREE.Vector3; q: THREE.Quaternion; axis: THREE.Vector3; s: number; end?: undefined } | { end: true; from: THREE.Vector3; to: THREE.Vector3; q: THREE.Quaternion };
    const partOf = new Map<string, Seg>();
    if (fit) for (const chain of fit.chains) {
      const J = chain.map(fit.skeletonJoint), V = chain.map(fit.v2Joint);
      if (J.some((x) => !x) || V.some((x) => !x)) continue;
      const seg = (k: number): Seg & { s: number } => {
        const dj = J[k + 1]!.clone().sub(J[k]!), dv = V[k + 1]!.clone().sub(V[k]!);
        const s = dv.length() / Math.max(1e-6, dj.length()), axis = dj.clone().normalize();
        this.stretch[chain[k]] = +s.toFixed(3);
        return { from: J[k]!, to: V[k]!, toEnd: V[k + 1]!, q: new THREE.Quaternion().setFromUnitVectors(axis, dv.clone().normalize()), axis, s };
      };
      // each bone between two joints of the chain on its segment; every bone under the last joint carried on as the last
      // segment turned (a hand under its wrist, toes under the ball of the foot)
      const segs = chain.slice(0, -1).map((_, k) => seg(k)), last = chain.length - 1;
      const end: Seg = { end: true, from: J[last]!, to: V[last]!, q: segs[segs.length - 1].q };
      const under = (bone: THREE.Object3D, top: string): boolean => { for (let o: THREE.Object3D | null = bone; o; o = o.parent) if (o.name === top) return true; return false; };
      for (const bone of theirs) {
        for (let k = last; k >= 0; k--) if (under(bone, chain[k])) { partOf.set(bone.name, k === last ? end : segs[k]); break; }
      }
    }
    const R = new Float32Array(n * 3), P = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3(), d = new THREE.Vector3();
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
      v.toArray(R, i * 3);
      if (nrm) d.applyMatrix3(toBodyN).normalize().toArray(N, i * 3);
    }
    // KEPT UNDER HER SKIN (SKELETON_FIT): against her body at her bind, as shaped now, in her rest frame
    if (fit) {
      const bp = body.geometry.getAttribute('position'), m = bp.count, S = new Float32Array(m * 3), w = new THREE.Vector3();
      for (let i = 0; i < m; i++) { THREE.Mesh.prototype.getVertexPosition.call(body, i, w); w.applyMatrix4(bodyToRest).toArray(S, i * 3); }
      const ix = (body.userData.allIndices as ArrayLike<number> | undefined) ?? body.geometry.index?.array;
      if (ix) {
        const ids = new Map<string, number>(), own = Int32Array.from(this.owner, (o) => { let k = ids.get(o); if (k === undefined) ids.set(o, (k = ids.size)); return k; });
        const skip = new Set([...(fit.noFit ?? [])].map((o) => ids.get(o) ?? -1)), before = R.slice(), grid = skinGrid(S, ix, 0.02);
        // (whole pieces first: her skull in her head and her foot bones in her feet keep their shapes)
        for (const names of fit.whole ?? []) {
          const set = new Set(names), which: number[] = [];
          for (let i = 0; i < n; i++) if (set.has(this.owner[i])) which.push(i);
          if (!which.length) this.wholeFits.push({ bones: names.join(' ') + ' (no points)', scale: 1, slideMm: [], left: 0 });
          const set0 = fit.wholeScale?.[this.wholeFits.length] ?? null;
          if (which.length && set0 !== null) {
            // (its size set: made that size about its middle, then only slid in)
            let cx = 0, cy = 0, cz = 0; for (const i of which) { cx += R[i * 3]; cy += R[i * 3 + 1]; cz += R[i * 3 + 2]; } cx /= which.length; cy /= which.length; cz /= which.length;
            for (const i of which) { R[i * 3] = cx + (R[i * 3] - cx) * set0; R[i * 3 + 1] = cy + (R[i * 3 + 1] - cy) * set0; R[i * 3 + 2] = cz + (R[i * 3 + 2] - cz) * set0; }
          }
          if (which.length) { const r = set0 !== null ? fitWhole(grid, R, which, SKELETON_FIT.margin, 24, 1, 1) : fitWhole(grid, R, which, SKELETON_FIT.margin); if (set0 !== null) r.scale = set0; this.wholeFits.push({ bones: names.join(' '), scale: +r.scale.toFixed(3), slideMm: r.slide.map((x) => Math.round(x * 1000)), left: r.left }); }
        }
        const afterWhole = R.slice();
        this.fitLeft = pullInside(grid, R, own, SKELETON_FIT.margin, SKELETON_FIT.blend, (k) => !skip.has(k), SKELETON_FIT.passes);
        this.moved = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const mm = Math.hypot(R[i * 3] - before[i * 3], R[i * 3 + 1] - before[i * 3 + 1], R[i * 3 + 2] - before[i * 3 + 2]) * 1000;
          // (relit only where the smooth pull reshaped it: a whole piece moved in keeps its shape, and its light)
          this.moved[i] = Math.hypot(R[i * 3] - afterWhole[i * 3], R[i * 3 + 1] - afterWhole[i * 3 + 1], R[i * 3 + 2] - afterWhole[i * 3 + 2]);
          this.fitMostMm = Math.max(this.fitMostMm, mm); this.fitMoves[this.owner[i]] = Math.max(this.fitMoves[this.owner[i]] ?? 0, Math.round(mm));
        }
        this.fitMostMm = +this.fitMostMm.toFixed(1);
      }
    }
    // HER TRUNK MOVES AS HER FLESH DOES (the port's rule 3, anchored not rigid): v2's rig bends her chest, shoulders and hips
    // as an auto-rig's blend of bones, not her spine's, so a rib carried by one bone alone comes out through her side as she
    // bends. Every piece of her trunk -- ribs, spine, breastbone, collarbones, shoulder blades, pelvis, skull -- takes the
    // weights of the skin nearest it (her four nearest points within 10 cm, by inverse distance); her limbs' long bones
    // stay carried by their own bones, rigid.
    if (fit && trunkWeights) {
      const bp = body.geometry.getAttribute('position'), bi = body.geometry.getAttribute('skinIndex'), bw = body.geometry.getAttribute('skinWeight'), m = bp.count, S = new Float32Array(m * 3), w = new THREE.Vector3();
      for (let i = 0; i < m; i++) { THREE.Mesh.prototype.getVertexPosition.call(body, i, w); w.applyMatrix4(bodyToRest).toArray(S, i * 3); }
      const cell = 0.05, key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`, grid = new Map<string, number[]>();
      for (let i = 0; i < m; i++) { const k = key(S[i * 3], S[i * 3 + 1], S[i * 3 + 2]); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
      const near: [number, number][] = [], acc = new Map<number, number>();
      for (let i = 0; i < n; i++) {
        // (a limb's long bone stays rigid, but its ends -- the ball of the thigh bone in her hip, the head of the upper arm
        // in her shoulder, the knee's and elbow's ends -- share her skin's weights within JOINT_BLEND of the joint: v2's
        // rig bends her skin there as a blend, and a rigid end comes out through it at the limits of a hip or a shoulder)
        const part = partOf.get(this.owner[i]);
        let share = 1;
        if (part) {
          if (part.end) continue;
          const px = R[i * 3], py = R[i * 3 + 1], pz = R[i * 3 + 2], d0 = Math.hypot(px - part.to.x, py - part.to.y, pz - part.to.z), d1 = part.toEnd ? Math.hypot(px - part.toEnd.x, py - part.toEnd.y, pz - part.toEnd.z) : Infinity;
          share = Math.max(0, 1 - Math.min(d0, d1) / SKELETON_FIT.jointBlend) * SKELETON_FIT.jointShare;
          if (share <= 0) continue;
        }
        const x = R[i * 3], y = R[i * 3 + 1], z = R[i * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        near.length = 0;
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) {
          const l = grid.get(`${cx + a},${cy + b},${cz + c}`);
          if (l) for (const j of l) { const d = Math.hypot(S[j * 3] - x, S[j * 3 + 1] - y, S[j * 3 + 2] - z); if (d < 0.1) near.push([d, j]); }
        }
        if (!near.length) continue;
        near.sort((p, q) => p[0] - q[0]);
        acc.clear();
        for (const [d, j] of near.slice(0, 4)) { const f = 1 / Math.max(1e-4, d); for (let c = 0; c < 4; c++) { const wt = bw.getComponent(j, c); if (wt > 0) { const b = bi.getComponent(j, c); acc.set(b, (acc.get(b) ?? 0) + wt * f); } } }
        const top = [...acc.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4), sum = top.reduce((t, e) => t + e[1], 0) || 1;
        if (share >= 1) { for (let c = 0; c < 4; c++) { I[i * 4 + c] = top[c]?.[0] ?? 0; W[i * 4 + c] = top[c] ? top[c][1] / sum : 0; } continue; }
        // (a limb's end: its own bone's weights and her skin's, mixed by `share`)
        acc.clear();
        for (let c = 0; c < 4; c++) if (W[i * 4 + c] > 0) acc.set(I[i * 4 + c], (acc.get(I[i * 4 + c]) ?? 0) + W[i * 4 + c] * (1 - share));
        for (const [b, wt] of top) acc.set(b, (acc.get(b) ?? 0) + (wt / sum) * share);
        const mix = [...acc.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4), msum = mix.reduce((t, e) => t + e[1], 0) || 1;
        for (let c = 0; c < 4; c++) { I[i * 4 + c] = mix[c]?.[0] ?? 0; W[i * 4 + c] = mix[c] ? mix[c][1] / msum : 0; }
      }
    }
    this.rest = R;
    for (let i = 0; i < n; i++) v.fromArray(R, i * 3).applyMatrix4(toBody).toArray(P, i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    // (its normals laid again where the fit under her skin reshaped it -- kept, a flattened shin is lit as if still round
    // -- but only there, and blended into the file's own: laid afresh everywhere, its seams and fine detail shaded blotchy)
    if (nrm && this.fitMostMm && src.index) {
      const F = new Float32Array(n * 3), ix = src.index.array;
      for (let t = 0; t + 2 < ix.length; t += 3) {
        const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        for (const k of [a, b, c]) { F[k] += nx; F[k + 1] += ny; F[k + 2] += nz; }
      }
      for (let i = 0; i < n; i++) {
        const moved = Math.min(1, (this.moved[i] ?? 0) / 0.004);
        if (moved <= 0) continue;
        const l = Math.hypot(F[i * 3], F[i * 3 + 1], F[i * 3 + 2]) || 1;
        let x = N[i * 3] + (F[i * 3] / l - N[i * 3]) * moved, y = N[i * 3 + 1] + (F[i * 3 + 1] / l - N[i * 3 + 1]) * moved, z = N[i * 3 + 2] + (F[i * 3 + 2] / l - N[i * 3 + 2]) * moved;
        const m = Math.hypot(x, y, z) || 1; N[i * 3] = x / m; N[i * 3 + 1] = y / m; N[i * 3 + 2] = z / m;
      }
    }
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
    let near = 0, nearUsed = 0; const used = new Uint8Array(m); for (let t = 0; t < ix.length; t++) used[ix[t]] = 1;
    for (let i = 0; i < m; i++) if (Math.hypot(S[i * 3] - x, S[i * 3 + 1] - y, S[i * 3 + 2] - z) < 0.15 * units) { near++; if (used[i]) nearUsed++; }
    let dmin = Infinity, hiY = -Infinity; for (let i = 0; i < m; i++) { dmin = Math.min(dmin, Math.hypot(S[i * 3] - x, S[i * 3 + 1] - y, S[i * 3 + 2] - z)); hiY = Math.max(hiY, S[i * 3 + 1]); }
    return { brute: raysAtBrute(S, ix, x, y, z), dmin: dmin / units, hiY: hiY / units, rays: raysAt(g, x, y, z), tris: ix.length / 3, verts: m, lo: g.lo, dim: g.dim, near, nearUsed, all: !!body.userData.allIndices, index: body.geometry.index?.count ?? 0 } as never;
  }

  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
