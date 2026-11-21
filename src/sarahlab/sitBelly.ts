import * as THREE from 'three';

/**
 * SEATED, HER BUMP KEEPS ITS STANDING SHAPE, CARRIED AS ONE PIECE, A LITTLE LOWER IN ITS MIDDLE (Joshua, 2026-11-21).
 *
 * Seated she wears the leotard's weights (birthWeights.ts: her belly, mound and vulva carried by her pelvis), which is
 * what shows her mound and her vulva between her thighs. Of her bump:
 * - v0.9.66 carried it by her pelvis with the rest: her pelvis tips back as she sits and her bump rode up with it ("your
 *   updated version sits too high");
 * - v0.9.67 carried it by her own weights over her under-belly line, as v0.9.65 did ("kept the rounder belly and also
 *   sat lower"); but her own weights give her thighs a share of her bump's lower sides, and her thighs, drawn up 84
 *   degrees, pulled them ("73% is changing from the front view like 200% did"), and the line it was laid by runs across
 *   her lower back and her hips, where her own weights and the leotard's differ and the line's value steps between her
 *   leg's skin and her trunk's: a ragged tear across the top of her seat ("the skin is not closing leaving some gaps";
 *   MEASURED in the room at 200%, gone with the field off);
 * - now ("make sure the belly shape from the side and front doesn't change"; "lower the belly more and maybe right in
 *   the middle of the belly a slight sag/downwards dip"): her bump AS SHE STANDS, moved as one piece by how the top of
 *   her bump moves from standing to seated (the turn and carry that best fit it: it is her trunk's, no thigh carries
 *   any of it), and let down a little more under its middle (`SIT_BELLY.sag`). MEASURED on her points read out of the
 *   room: the top of her bump turns 1.0 to 1.6 degrees from standing to seated, and so carried its lowest point stands
 *   57.6 cm off the floor at 200% where v0.9.65's stood at 60.1 (her thighs lifted it), 58.1 at 100% (58.5).
 * Laid by her bump's FOOTPRINT -- how far her 200% bump moves each point from her 0% belly, over the most it moves any
 * (`SIT_BELLY.from` to `.to`): all of her bump, none of her mound (her bump's reach falls from 0.56 to 0.12 of its most
 * over the 3 cm of her skin above her mound, MEASURED down her middle), none of her back, her hips or her seat. A field
 * moves her points, never her weights, so the two carries meet without the tear that blended weights make.
 */
export const SIT_BELLY_FIELD = 'shape:sitBelly';
/**
 * GAME TUNING. `from`/`to`: her bump's footprint (its reach over its most) where its carry begins and where it is all
 * of it. `sag`: how much further under its middle her bump is let down at 200% (metres; that share of it at a smaller
 * bump), all of it at its lowest and none from `sagHigh` of the way up it, across `sagWide` either side of her middle
 * (a bell, metres) -- 2 cm let it down over her mound at 200% from in front and low, past his line drawn just over it:
 * 1 cm. `grow`: her bump's size (0 to 2) by which all of it is carried so -- none at 0%, where her flat belly carried
 * so stood forward of her mound in a fold (MEASURED in the room: 44 mm at the most), and v0.9.66's was smooth.
 */
export const SIT_BELLY = { from: 0.15, to: 0.5, sag: 0.01, sagHigh: 0.5, sagWide: 0.08, grow: 0.5 };

export interface SitBelly {
  /** Her bones as they stand NOW are her standing pose: kept for the next `compute`. */
  holdStanding(): void;
  /**
   * The field, on her shape as it is laid (`pos`, `nrm`: her geometry's `position` and `normal`, her morphs read off the
   * mesh), with her bones as they stand now (seated). Her own weights from `own`; the weights she wears now from her
   * geometry. `bump`: her belly's size (0 to 2); `skip`: morphs left out of her standing bump (her seated correctives).
   */
  compute(pos: ArrayLike<number>, nrm: ArrayLike<number>, own: { index: ArrayLike<number>; weight: ArrayLike<number> }, bump: number, skip?: ReadonlySet<number>): { index: Uint32Array; pos: Float32Array; nrm: Float32Array };
  readonly stats: { laid: number; mostMm: number; computes: number; turnDeg: number; anchors: number };
  /** (a probe's) her bump's footprint, 0 to 1 a point */
  readonly footprint: Float32Array;
  /**
   * Another of her seated fields kept off her bump: each point's move times what of it is NOT her bump's (1 - its
   * footprint). Her hips' turn and her groin's smoothing are worked out with the leotard on; over her bump they would
   * move it off its standing shape.
   */
  under<F extends { index: ArrayLike<number>; pos: Float32Array; nrm: Float32Array }>(field: F): F;
}

/**
 * `foot`: her bump's two morphs, at 200% (`to`) and at 0% (`from`); `legBones`: every bone of her legs (her bump's top
 * is what none of them carries).
 */
export function createSitBelly(mesh: THREE.SkinnedMesh, metresPerUnit: number, foot: { to: string; from: string }, legBones: readonly number[]): SitBelly {
  const g = mesh.geometry, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight'), n = si.count;
  const legs = new Set(legBones);
  const bones = mesh.skeleton.bones.length;
  const S: THREE.Matrix4[] = Array.from({ length: bones }, () => new THREE.Matrix4());
  const St: THREE.Matrix4[] = Array.from({ length: bones }, () => new THREE.Matrix4());
  const tmp = new THREE.Matrix4();
  let standing = false;
  const skinOf = (out: THREE.Matrix4[]) => {
    const sk = mesh.skeleton;
    for (let q = 0; q < sk.bones.length; q++) out[q].multiplyMatrices(mesh.bindMatrixInverse, tmp.multiplyMatrices(sk.bones[q].matrixWorld, sk.boneInverses[q])).multiply(mesh.bindMatrix);
  };
  const sum = (M: THREE.Matrix4, mats: THREE.Matrix4[], bone: (k: number) => number, weight: (k: number) => number) => {
    const el = M.elements; el.fill(0);
    for (let k = 0; k < 4; k++) { const w = weight(k); if (w <= 0) continue; const se = mats[bone(k)].elements; for (let e = 0; e < 16; e++) el[e] += w * se[e]; }
    return M;
  };
  // her bump's reach: how far her 200% bump moves each point from her 0% belly, over the most it moves any
  const reach = new Float32Array(n), footprint = new Float32Array(n);
  {
    const dict = mesh.morphTargetDictionary ?? {}, mp = g.morphAttributes.position, a = dict[foot.to], b = dict[foot.from];
    if (mp && a !== undefined && b !== undefined) {
      const A = mp[a], B = mp[b];
      let most = 0;
      for (let i = 0; i < n; i++) { const d = Math.hypot(A.getX(i) - B.getX(i), A.getY(i) - B.getY(i), A.getZ(i) - B.getZ(i)); reach[i] = d; if (d > most) most = d; }
      for (let i = 0; i < n; i++) reach[i] /= most || 1;
    }
  }
  /** her bump's footprint by `SIT_BELLY.from` and `.to`, at her bump's size (worked out again at each laying: a probe may move them) */
  const layFootprint = (bump: number) => { const grow = smooth(0, SIT_BELLY.grow, bump); for (let i = 0; i < n; i++) footprint[i] = grow * smooth(SIT_BELLY.from, SIT_BELLY.to, reach[i]); };
  layFootprint(2);
  const stats = { laid: 0, mostMm: 0, computes: 0, turnDeg: 0, anchors: 0 };
  const Mo = new THREE.Matrix4(), Ms = new THREE.Matrix4(), Mw = new THREE.Matrix4(), Mi = new THREE.Matrix4(), Nw = new THREE.Matrix3(), Ns = new THREE.Matrix3();
  return {
    stats,
    footprint,
    holdStanding() { skinOf(St); standing = true; },
    under(field) {
      for (let k = 0; k < field.index.length; k++) { const f = 1 - (footprint[field.index[k]] ?? 0); if (f >= 1) continue; for (let c = 0; c < 3; c++) { field.pos[k * 3 + c] *= f; field.nrm[k * 3 + c] *= f; } }
      return field;
    },
    compute(pos, nrm, own, bump, skip) {
      stats.computes++; stats.laid = 0; stats.mostMm = 0;
      layFootprint(bump);
      const empty = { index: new Uint32Array(0), pos: new Float32Array(0), nrm: new Float32Array(0) };
      if (!standing) return empty;
      skinOf(S);
      const mInf = mesh.morphTargetInfluences, mPos = g.morphAttributes.position, rel = g.morphTargetsRelative;
      const v = new THREE.Vector3(), vs = new THREE.Vector3(), p = new THREE.Vector3();
      const shapeOf = (i: number, out: THREE.Vector3, leave?: ReadonlySet<number>) => {
        out.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        if (mInf && mPos) for (let q = 0; q < mPos.length; q++) { const w = mInf[q] ?? 0; if (!w || leave?.has(q)) continue; const ma = mPos[q]; if (rel) out.set(out.x + w * ma.getX(i), out.y + w * ma.getY(i), out.z + w * ma.getZ(i)); else out.set(out.x + w * (ma.getX(i) - pos[i * 3]), out.y + w * (ma.getY(i) - pos[i * 3 + 1]), out.z + w * (ma.getZ(i) - pos[i * 3 + 2])); }
        return out;
      };
      const ownIx = (i: number) => (k: number) => own.index[i * 4 + k], ownW = (i: number) => (k: number) => own.weight[i * 4 + k];
      // her bump where she stands (her own weights, her standing bones, her seated correctives left out), and the top
      // of it as she sits (her own weights: none of it her thighs')
      const pts: number[] = [], grown = smooth(0, SIT_BELLY.grow, bump);
      if (grown <= 0) return empty;
      for (let i = 0; i < n; i++) if (footprint[i] > 0) pts.push(i);
      const stand = new Float32Array(pts.length * 3);
      let lo = Infinity, hi = -Infinity;
      const up = new THREE.Vector3(0, 1, 0).transformDirection(tmp.copy(mesh.matrixWorld).invert());
      const across = new THREE.Vector3(1, 0, 0).transformDirection(tmp);
      const A: number[] = [], B: number[] = [], W: number[] = [];
      for (let k = 0; k < pts.length; k++) {
        const i = pts[k];
        shapeOf(i, vs, skip).applyMatrix4(sum(Ms, St, ownIx(i), ownW(i)));
        stand[k * 3] = vs.x; stand[k * 3 + 1] = vs.y; stand[k * 3 + 2] = vs.z;
        if (footprint[i] > 0.5 * grown) { const h = vs.dot(up); if (h < lo) lo = h; if (h > hi) hi = h; }
      }
      for (let k = 0; k < pts.length; k++) {
        const i = pts[k];
        if (footprint[i] < 0.9 * grown) continue;
        let leg = 0; for (let c = 0; c < 4; c++) if (legs.has(own.index[i * 4 + c])) leg += own.weight[i * 4 + c];
        const h = stand[k * 3] * up.x + stand[k * 3 + 1] * up.y + stand[k * 3 + 2] * up.z;
        if (leg > 0.001 || h < lo + 0.6 * (hi - lo)) continue;
        shapeOf(i, v, skip).applyMatrix4(sum(Mo, S, ownIx(i), ownW(i)));
        A.push(stand[k * 3], stand[k * 3 + 1], stand[k * 3 + 2]); B.push(v.x, v.y, v.z); W.push(footprint[i]);
      }
      stats.anchors = W.length;
      if (W.length < 8) return empty;
      const fit = rigidFit(A, B, W);
      stats.turnDeg = +(2 * Math.acos(Math.min(1, Math.abs(fit.q.w))) * 180 / Math.PI).toFixed(2);
      const D = new THREE.Matrix4().compose(fit.t, fit.q, new THREE.Vector3(1, 1, 1)), Dn = new THREE.Matrix3().setFromMatrix4(D);
      // her middle across her, and how far under its middle she is let down
      let mid = 0, mw = 0;
      for (let k = 0; k < pts.length; k++) { const f = footprint[pts[k]]; mid += f * (stand[k * 3] * across.x + stand[k * 3 + 1] * across.y + stand[k * 3 + 2] * across.z); mw += f; }
      mid /= mw || 1;
      const sag = (SIT_BELLY.sag * Math.min(1, Math.max(0, bump / 2))) / metresPerUnit, wide = SIT_BELLY.sagWide / metresPerUnit, high = lo + SIT_BELLY.sagHigh * (hi - lo);
      const idx: number[] = [], dp: number[] = [], dn: number[] = [];
      const nv = new THREE.Vector3(), nr = new THREE.Vector3(), nl = new THREE.Vector3();
      let most = 0;
      for (let k = 0; k < pts.length; k++) {
        const i = pts[k], f = footprint[i];
        shapeOf(i, v);
        sum(Mw, S, (c) => si.getComponent(i, c), (c) => sw.getComponent(i, c));
        // the leotard's place now, and her standing bump's carried as one piece and let down under its middle
        const leo = p.copy(v).applyMatrix4(Mw);
        const t = vs.set(stand[k * 3], stand[k * 3 + 1], stand[k * 3 + 2]).applyMatrix4(D);
        const h = stand[k * 3] * up.x + stand[k * 3 + 1] * up.y + stand[k * 3 + 2] * up.z, x = stand[k * 3] * across.x + stand[k * 3 + 1] * across.y + stand[k * 3 + 2] * across.z - mid;
        const low = 1 - smooth(lo, high, h), bell = Math.exp(-((x / wide) ** 2));
        t.addScaledVector(up, -sag * low * bell);
        t.sub(leo).multiplyScalar(f).add(leo);
        // taken back through the weights she wears: the move in her rest frame
        Mi.copy(Mw).invert();
        t.applyMatrix4(Mi).sub(v);
        const d = t.length() * metresPerUnit;
        if (d < 1e-5) continue;
        // her skin's facing the same way: her standing facing turned with her bump, toward the leotard's by (1 - f)
        nv.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]).normalize();
        nr.copy(nv).applyMatrix3(Ns.getNormalMatrix(sum(Ms, St, ownIx(i), ownW(i)))).normalize().applyMatrix3(Dn).normalize();
        nl.copy(nv).applyMatrix3(Nw.getNormalMatrix(Mw)).normalize();
        nr.sub(nl).multiplyScalar(f).add(nl).normalize().applyMatrix3(Nw.getNormalMatrix(Mw).invert()).normalize().sub(nv);
        idx.push(i); dp.push(t.x, t.y, t.z); dn.push(nr.x, nr.y, nr.z);
        if (d > most) most = d;
      }
      stats.laid = idx.length; stats.mostMm = +(most * 1000).toFixed(1);
      return { index: Uint32Array.from(idx), pos: Float32Array.from(dp), nrm: Float32Array.from(dn) };
    },
  };
}

function smooth(a: number, b: number, x: number): number { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

/**
 * The turn and carry that best take points `A` onto `B` (flat x, y, z triples), weighed by `W` (Horn's quaternion: the
 * largest eigenvector of his 4 x 4, by power iteration on it shifted to be positive).
 */
export function rigidFit(A: ArrayLike<number>, B: ArrayLike<number>, W: ArrayLike<number>): { q: THREE.Quaternion; t: THREE.Vector3 } {
  const m = W.length, ca = new THREE.Vector3(), cb = new THREE.Vector3();
  let sw = 0;
  for (let i = 0; i < m; i++) { const w = W[i]; sw += w; ca.x += w * A[i * 3]; ca.y += w * A[i * 3 + 1]; ca.z += w * A[i * 3 + 2]; cb.x += w * B[i * 3]; cb.y += w * B[i * 3 + 1]; cb.z += w * B[i * 3 + 2]; }
  ca.multiplyScalar(1 / sw); cb.multiplyScalar(1 / sw);
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0;
  for (let i = 0; i < m; i++) {
    const w = W[i], ax = A[i * 3] - ca.x, ay = A[i * 3 + 1] - ca.y, az = A[i * 3 + 2] - ca.z, bx = B[i * 3] - cb.x, by = B[i * 3 + 1] - cb.y, bz = B[i * 3 + 2] - cb.z;
    Sxx += w * ax * bx; Sxy += w * ax * by; Sxz += w * ax * bz; Syx += w * ay * bx; Syy += w * ay * by; Syz += w * ay * bz; Szx += w * az * bx; Szy += w * az * by; Szz += w * az * bz;
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];
  // (Gershgorin: no eigenvalue is under minus the largest row's sum)
  let shift = 0; for (const r of N) shift = Math.max(shift, Math.abs(r[0]) + Math.abs(r[1]) + Math.abs(r[2]) + Math.abs(r[3]));
  let e = [1, 0, 0, 0];
  for (let it = 0; it < 300; it++) {
    const nx = [0, 0, 0, 0];
    for (let r = 0; r < 4; r++) { let s = shift * e[r]; for (let c = 0; c < 4; c++) s += N[r][c] * e[c]; nx[r] = s; }
    const l = Math.hypot(nx[0], nx[1], nx[2], nx[3]) || 1; e = nx.map((x) => x / l);
  }
  // (Horn's quaternion is w, x, y, z)
  const q = new THREE.Quaternion(e[1], e[2], e[3], e[0]).normalize();
  const t = cb.clone().sub(ca.clone().applyQuaternion(q));
  return { q, t };
}
