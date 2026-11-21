import * as THREE from 'three';

/**
 * SEATED, HER BUMP IS CARRIED AS HER OWN WEIGHTS CARRY IT, AND WHAT IS UNDER IT AS THE LEOTARD'S DO (Joshua, 2026-11-21,
 * of her seated at 100, 150 and 200% from in front and low, v0.9.65 against v0.9.66: "before looked better as it kept
 * the rounder belly and also sat lower… your updated version sits too high and the profile is different and not the
 * same… from the lower belly edge up is how it was, below the belly into the pelvis/opening, keep your fix").
 *
 * Seated she wears the leotard's weights (birthWeights.ts: her belly, mound and vulva carried by her pelvis), which is
 * what shows her mound and her vulva between her thighs; but it carries her BUMP by her pelvis too, which tips back as
 * she sits, and her bump rides up with it, flatter underneath than her own weights left it. So a shape field: each point
 * of her bump laid where her OWN weights put it, worked out as her hips' turn is (hipTurn.ts) -- that place taken back
 * through the weights she wears -- and laid by how far ABOVE her under-belly line it stands (`bottomCut.hoopInside`, the
 * under-belly leggings' line: "just above her pelvis, below her belly"): all of it from `SIT_BELLY.whole` over that line,
 * none from `SIT_BELLY.none` under it. A field moves her points, never her weights, so the two carries meet without the
 * tear that blended weights make (four bones a point: the smallest dropped from one point to the next).
 */
export const SIT_BELLY_FIELD = 'shape:sitBelly';
/**
 * metres over (-) and under (+) her under-belly line (`hoopInside`'s own sign: + inside the garment): all hers over
 * `whole`, none under `none`. GAME TUNING, his pick (2026-11-21) of two pictured at 100 and 200% from in front and low:
 * this one, and 1.5 cm higher (-0.025 to 0.01). Lower again (-0.01 to 0.045, 0 to 0.06), the underside of her bump stood
 * over her lower belly in a hard ledge seen from below. (A probe may move it: `sitBelly(on, { whole, none })`.)
 */
export const SIT_BELLY = { whole: -0.01, none: 0.025 };

export interface SitBelly {
  /**
   * The field, on her shape as it is laid (`pos`, `nrm`: her geometry's `position` and `normal`, her morphs read off the
   * mesh), with her bones as they stand now; `inside` how far inside her under-belly line each point is (metres). Her
   * own weights from `own`; the weights she wears now from her geometry.
   */
  compute(pos: ArrayLike<number>, nrm: ArrayLike<number>, inside: ArrayLike<number>, own: { index: ArrayLike<number>; weight: ArrayLike<number> }): { index: Uint32Array; pos: Float32Array; nrm: Float32Array };
  readonly stats: { laid: number; mostMm: number; computes: number };
  /** (a probe's) the last laying's share of each point (0 to 1) and its `inside` */
  readonly last: { mask: Float32Array | null; inside: Float32Array | null };
  /**
   * Another of her seated fields kept off her bump as this laying lays it: each point's move times what of it is NOT her
   * bump's (1 - its share). Her hips' turn and her groin's smoothing are worked out with the leotard's weights on; over her
   * under-belly line they would move her bump off where her own weights put it.
   */
  under<F extends { index: ArrayLike<number>; pos: Float32Array; nrm: Float32Array }>(field: F): F;
}

export function createSitBelly(mesh: THREE.SkinnedMesh, metresPerUnit: number): SitBelly {
  const g = mesh.geometry, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  const S: THREE.Matrix4[] = mesh.skeleton.bones.map(() => new THREE.Matrix4()), tmp = new THREE.Matrix4();
  const Mo = new THREE.Matrix4(), Mw = new THREE.Matrix4(), Mi = new THREE.Matrix4(), No = new THREE.Matrix3(), Nw = new THREE.Matrix3();
  const sum = (M: THREE.Matrix4, bone: (k: number) => number, weight: (k: number) => number) => {
    const el = M.elements; el.fill(0);
    for (let k = 0; k < 4; k++) { const w = weight(k); if (w <= 0) continue; const se = S[bone(k)].elements; for (let e = 0; e < 16; e++) el[e] += w * se[e]; }
  };
  const stats = { laid: 0, mostMm: 0, computes: 0 }, last: { mask: Float32Array | null; inside: Float32Array | null } = { mask: null, inside: null };
  return {
    stats,
    last,
    under(field) {
      const mask = last.mask;
      if (!mask) return field;
      for (let k = 0; k < field.index.length; k++) { const f = 1 - (mask[field.index[k]] ?? 0); if (f >= 1) continue; for (let c = 0; c < 3; c++) { field.pos[k * 3 + c] *= f; field.nrm[k * 3 + c] *= f; } }
      return field;
    },
    compute(pos, nrm, inside, own) {
      const sk = mesh.skeleton;
      for (let q = 0; q < sk.bones.length; q++) S[q].multiplyMatrices(mesh.bindMatrixInverse, tmp.multiplyMatrices(sk.bones[q].matrixWorld, sk.boneInverses[q])).multiply(mesh.bindMatrix);
      const mInf = mesh.morphTargetInfluences, mPos = g.morphAttributes.position, rel = g.morphTargetsRelative;
      const n = Math.min(si.count, inside.length), idx: number[] = [], dp: number[] = [], dn: number[] = [];
      const v = new THREE.Vector3(), p = new THREE.Vector3(), nv = new THREE.Vector3(), nt = new THREE.Vector3();
      let most = 0;
      const mask = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = Math.min(1, Math.max(0, (inside[i] - SIT_BELLY.whole) / (SIT_BELLY.none - SIT_BELLY.whole))), m = 1 - t * t * (3 - 2 * t);
        mask[i] = m;
        if (m <= 0) continue;
        // (only where the weights she wears are not her own)
        let same = true;
        for (let k = 0; k < 4 && same; k++) if (Math.abs(sw.getComponent(i, k) - own.weight[i * 4 + k]) > 1e-4 || (own.weight[i * 4 + k] > 0 && si.getComponent(i, k) !== own.index[i * 4 + k])) same = false;
        if (same) continue;
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        if (mInf && mPos) for (let q = 0; q < mPos.length; q++) { const w = mInf[q] ?? 0; if (!w) continue; const ma = mPos[q]; if (rel) v.set(v.x + w * ma.getX(i), v.y + w * ma.getY(i), v.z + w * ma.getZ(i)); else v.set(v.x + w * (ma.getX(i) - pos[i * 3]), v.y + w * (ma.getY(i) - pos[i * 3 + 1]), v.z + w * (ma.getZ(i) - pos[i * 3 + 2])); }
        sum(Mo, (k) => own.index[i * 4 + k], (k) => own.weight[i * 4 + k]);
        sum(Mw, (k) => si.getComponent(i, k), (k) => sw.getComponent(i, k));
        // where her own weights put it, taken back through the weights she wears: the move in her rest frame
        p.copy(v).applyMatrix4(Mo);
        Mi.copy(Mw).invert();
        p.applyMatrix4(Mi).sub(v).multiplyScalar(m);
        const d = p.length() * metresPerUnit;
        if (d < 1e-5) continue;
        // and her skin's facing the same way
        nv.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]).normalize();
        No.getNormalMatrix(Mo); Nw.getNormalMatrix(Mw).invert();
        nt.copy(nv).applyMatrix3(No).applyMatrix3(Nw).normalize().sub(nv).multiplyScalar(m);
        idx.push(i); dp.push(p.x, p.y, p.z); dn.push(nt.x, nt.y, nt.z);
        if (d > most) most = d;
      }
      stats.computes++; last.mask = mask; last.inside = Float32Array.from(inside as ArrayLike<number>);
      stats.laid = idx.length; stats.mostMm = +(most * 1000).toFixed(1);
      return { index: Uint32Array.from(idx), pos: Float32Array.from(dp), nrm: Float32Array.from(dn) };
    },
  };
}
