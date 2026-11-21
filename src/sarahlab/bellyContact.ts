/**
 * HER THIGHS GIVE WAY TO HER BUMP, NEVER HER BUMP TO HER THIGHS (Joshua, 2026-11-21: "fix the pinch issues… while
 * preserving her belly shape regardless of pose. If anything, the thighs adjust its shape a little, but never the
 * belly").
 *
 * Seated and in a birth position her bump is carried as she stands (sitBelly.ts) and her thighs come up under it: in
 * SQUAT at 165 and 200% the tops of her thighs stood up into her bump's underside, and seated at 73 and 100% a strip of
 * her bump's lower sides lay a centimetre inside the top of each thigh (MEASURED in the room). Real soft tissue does not
 * pass through itself, and her bump is the firmer of the two: so, on her as she is posed with everything else laid,
 * each point of her thigh that stands behind the nearest of her bump's skin (or nearer it than `gap`) is moved out
 * along her bump's facing there to `gap` off it; the move is spread a little round its neighbours so her thigh is
 * pressed flat without an edge, then turned back into her rest shape through each point's own blended bones, with her
 * normals turned to the moved surface's (as birthContact.ts presses her calf to her thigh). Her bump is not moved.
 */
import * as THREE from 'three';

export const BELLY_CONTACT_FIELD = 'shape:bellyContact';

/** GAME TUNING (metres). */
export const BELLY_CONTACT = {
  /** how far off her bump's skin her thigh is left */
  gap: 0.002,
  /** a point of her thigh further than this from her bump's nearest point is not touching it */
  near: 0.06,
  /** how many times the move is spread over her thigh, and how much each time (0..1) */
  spread: 10, spreadRate: 0.5,
  /** her bump: points of it at least this share of its footprint's most */
  bump: 0.5,
  /** her thigh: points whose leg bones carry at least this of them, and no more than this of her bump's footprint */
  leg: 0.5, legFoot: 0.02,
  /** only where her thigh faces her bump (the cosine between their facings, at the most) */
  facing: 0.3,
};

export interface BellyContact {
  /** the field for her as posed now: `pos`, `nrm` her shape as summed with everything else laid; `footprint` her bump's */
  compute(pos: ArrayLike<number>, nrm: ArrayLike<number>, footprint: ArrayLike<number>): { index: Uint32Array; pos: Float32Array; nrm: Float32Array };
  readonly stats: { inside: number; deepestMm: number; moved: number; mostMm: number };
}

/** `tris`: her triangles; `legBones`: every bone of her legs; `perMetre`: her geometry's units a metre. */
export function createBellyContact(mesh: THREE.SkinnedMesh, tris: ArrayLike<number>, legBones: readonly number[], perMetre: number): BellyContact {
  const C = BELLY_CONTACT, g = mesh.geometry, pa = g.getAttribute('position') as THREE.BufferAttribute, n = pa.count;
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute;
  const legs = new Set(legBones);
  // her points welded by place (a seam's two copies move as one)
  const key = new Int32Array(n), keyMap = new Map<string, number>();
  for (let i = 0; i < n; i++) { const s = `${Math.round(pa.getX(i) * 1e4)},${Math.round(pa.getY(i) * 1e4)},${Math.round(pa.getZ(i) * 1e4)}`; let id = keyMap.get(s); if (id === undefined) { id = keyMap.size; keyMap.set(s, id); } key[i] = id; }
  const K = keyMap.size, anyOf = new Int32Array(K).fill(-1);
  for (let i = 0; i < n; i++) if (anyOf[key[i]] < 0) anyOf[key[i]] = i;
  const S: THREE.Matrix4[] = mesh.skeleton.bones.map(() => new THREE.Matrix4());
  const Sv = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const blend = (i: number) => { const el = Sv.elements; el.fill(0); for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w <= 0) continue; const se = S[si.getComponent(i, k)].elements; for (let e = 0; e < 16; e++) el[e] += w * se[e]; } return Sv; };
  const stats = { inside: 0, deepestMm: 0, moved: 0, mostMm: 0 };
  const empty = () => ({ index: new Uint32Array(0), pos: new Float32Array(0), nrm: new Float32Array(0) });
  return {
    stats,
    compute(pos, nrm, footprint) {
      stats.inside = 0; stats.deepestMm = 0; stats.moved = 0; stats.mostMm = 0;
      let most = 0; for (let i = 0; i < n; i++) if (footprint[i] > most) most = footprint[i];
      if (most <= 0) return empty();
      const sk = mesh.skeleton;
      for (let q = 0; q < sk.bones.length; q++) S[q].multiplyMatrices(mesh.bindMatrixInverse, tmp.multiplyMatrices(sk.bones[q].matrixWorld, sk.boneInverses[q])).multiply(mesh.bindMatrix);
      // which welded points are her bump's and which her thigh's
      const bumpK = new Uint8Array(K), legK = new Uint8Array(K);
      for (let k = 0; k < K; k++) {
        const i = anyOf[k], f = footprint[i];
        if (f >= C.bump * most) { bumpK[k] = 1; continue; }
        if (f > C.legFoot * most) continue;
        let w = 0; for (let c = 0; c < 4; c++) if (legs.has(si.getComponent(i, c))) w += sw.getComponent(i, c);
        if (w >= C.leg) legK[k] = 1;
      }
      // her bump and her thighs where she stands posed
      const mInf = mesh.morphTargetInfluences, mPos = g.morphAttributes.position, rel = g.morphTargetsRelative;
      const posed = new Float64Array(K * 3), v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const placeOf = (k: number) => {
        const i = anyOf[k];
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        if (mInf && mPos) for (let m = 0; m < mPos.length; m++) { const w = mInf[m] ?? 0; if (!w) continue; const ma = mPos[m]; if (rel) v.set(v.x + w * ma.getX(i), v.y + w * ma.getY(i), v.z + w * ma.getZ(i)); else v.set(v.x + w * (ma.getX(i) - pos[i * 3]), v.y + w * (ma.getY(i) - pos[i * 3 + 1]), v.z + w * (ma.getZ(i) - pos[i * 3 + 2])); }
        v.applyMatrix4(blend(i)); posed[k * 3] = v.x; posed[k * 3 + 1] = v.y; posed[k * 3 + 2] = v.z;
      };
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (let k = 0; k < K; k++) if (bumpK[k]) { placeOf(k); for (let d = 0; d < 3; d++) { lo[d] = Math.min(lo[d], posed[k * 3 + d]); hi[d] = Math.max(hi[d], posed[k * 3 + d]); } }
      const reach = C.near * perMetre;
      // (only her thigh near her bump)
      for (let k = 0; k < K; k++) if (legK[k]) { placeOf(k); let inBox = true; for (let d = 0; d < 3; d++) if (posed[k * 3 + d] < lo[d] - reach || posed[k * 3 + d] > hi[d] + reach) inBox = false; if (!inBox) legK[k] = 0; }
      // posed normals from her posed triangles, turned out the way her skin faces; and her thigh's neighbours
      const N = new Float64Array(K * 3), nbr: number[][] = [];
      for (let t = 0; t + 2 < tris.length; t += 3) {
        const ka = key[tris[t]], kb = key[tris[t + 1]], kc = key[tris[t + 2]];
        const isBump = bumpK[ka] && bumpK[kb] && bumpK[kc], isLeg = legK[ka] || legK[kb] || legK[kc];
        if (!isBump && !isLeg) continue;
        if (isLeg) for (const [p, q] of [[ka, kb], [kb, kc], [kc, ka]]) { if (legK[p]) (nbr[p] ??= []).push(q); if (legK[q]) (nbr[q] ??= []).push(p); }
        if (!(bumpK[ka] || legK[ka]) || !(bumpK[kb] || legK[kb]) || !(bumpK[kc] || legK[kc])) continue;
        a.set(posed[ka * 3], posed[ka * 3 + 1], posed[ka * 3 + 2]); b.set(posed[kb * 3], posed[kb * 3 + 1], posed[kb * 3 + 2]).sub(a); c.set(posed[kc * 3], posed[kc * 3 + 1], posed[kc * 3 + 2]).sub(a); b.cross(c);
        for (const k of [ka, kb, kc]) { N[k * 3] += b.x; N[k * 3 + 1] += b.y; N[k * 3 + 2] += b.z; }
      }
      // (which way round her triangles wind: most posed normals agree with her own, turned by her bones)
      let agree = 0; const m3 = new THREE.Matrix3();
      for (let k = 0; k < K; k += 5) { if (!bumpK[k] && !legK[k]) continue; const i = anyOf[k]; m3.getNormalMatrix(blend(i)); a.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]).applyMatrix3(m3); agree += Math.sign(a.x * N[k * 3] + a.y * N[k * 3 + 1] + a.z * N[k * 3 + 2]); }
      const wind = agree >= 0 ? 1 : -1;
      for (let k = 0; k < K; k++) { const l = Math.hypot(N[k * 3], N[k * 3 + 1], N[k * 3 + 2]); if (l > 0) { N[k * 3] *= wind / l; N[k * 3 + 1] *= wind / l; N[k * 3 + 2] *= wind / l; } }
      // her bump's points in a grid of `near` cells
      const grid = new Map<string, number[]>(), gk = (x: number, y: number, z: number) => `${Math.floor(x / reach)},${Math.floor(y / reach)},${Math.floor(z / reach)}`;
      for (let k = 0; k < K; k++) if (bumpK[k]) { const kk = gk(posed[k * 3], posed[k * 3 + 1], posed[k * 3 + 2]); (grid.get(kk) ?? grid.set(kk, []).get(kk)!).push(k); }
      const gap = C.gap * perMetre, move = new Float64Array(K * 3), touched = new Uint8Array(K);
      let deepest = 0;
      for (let k = 0; k < K; k++) {
        if (!legK[k]) continue;
        const x = posed[k * 3], y = posed[k * 3 + 1], z = posed[k * 3 + 2], cx = Math.floor(x / reach), cy = Math.floor(y / reach), cz = Math.floor(z / reach);
        let best = -1, bd = reach * reach;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`); if (l) for (const o of l) { const d = (posed[o * 3] - x) ** 2 + (posed[o * 3 + 1] - y) ** 2 + (posed[o * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = o; } } }
        if (best < 0) continue;
        const h = (x - posed[best * 3]) * N[best * 3] + (y - posed[best * 3 + 1]) * N[best * 3 + 1] + (z - posed[best * 3 + 2]) * N[best * 3 + 2];
        if (h >= gap) continue;
        // (and only where the two face each other)
        if (N[k * 3] * N[best * 3] + N[k * 3 + 1] * N[best * 3 + 1] + N[k * 3 + 2] * N[best * 3 + 2] > C.facing) continue;
        if (h < 0) { stats.inside++; deepest = Math.max(deepest, -h); }
        const d = gap - h;
        move[k * 3] = N[best * 3] * d; move[k * 3 + 1] = N[best * 3 + 1] * d; move[k * 3 + 2] = N[best * 3 + 2] * d; touched[k] = 1;
      }
      stats.deepestMm = +((deepest / perMetre) * 1000).toFixed(1);
      if (!touched.some((x) => x)) return empty();
      // spread round her thigh (never less than it was where it was asked for)
      const sp = new Float64Array(K * 3);
      for (let pass = 0; pass < C.spread; pass++) {
        sp.set(move);
        for (let k = 0; k < K; k++) {
          const nb = nbr[k]; if (!legK[k] || !nb?.length) continue;
          let mx = 0, my = 0, mz = 0, cnt = 0; for (const o of nb) { if (!legK[o]) continue; mx += move[o * 3]; my += move[o * 3 + 1]; mz += move[o * 3 + 2]; cnt++; }
          if (!cnt) continue;
          mx /= cnt; my /= cnt; mz /= cnt;
          let nx = move[k * 3] + (mx - move[k * 3]) * C.spreadRate, ny = move[k * 3 + 1] + (my - move[k * 3 + 1]) * C.spreadRate, nz = move[k * 3 + 2] + (mz - move[k * 3 + 2]) * C.spreadRate;
          if (touched[k]) { const was = Math.hypot(move[k * 3], move[k * 3 + 1], move[k * 3 + 2]), now = Math.hypot(nx, ny, nz); if (now < was && now > 1e-12) { nx *= was / now; ny *= was / now; nz *= was / now; } }
          sp[k * 3] = nx; sp[k * 3 + 1] = ny; sp[k * 3 + 2] = nz;
        }
        move.set(sp);
      }
      // the moved surface's normals, for her normals
      const N2 = new Float64Array(K * 3);
      for (let t = 0; t + 2 < tris.length; t += 3) {
        const ka = key[tris[t]], kb = key[tris[t + 1]], kc = key[tris[t + 2]];
        if (!legK[ka] || !legK[kb] || !legK[kc]) continue;
        a.set(posed[ka * 3] + move[ka * 3], posed[ka * 3 + 1] + move[ka * 3 + 1], posed[ka * 3 + 2] + move[ka * 3 + 2]);
        b.set(posed[kb * 3] + move[kb * 3], posed[kb * 3 + 1] + move[kb * 3 + 1], posed[kb * 3 + 2] + move[kb * 3 + 2]).sub(a);
        c.set(posed[kc * 3] + move[kc * 3], posed[kc * 3 + 1] + move[kc * 3 + 1], posed[kc * 3 + 2] + move[kc * 3 + 2]).sub(a);
        b.cross(c).multiplyScalar(wind);
        for (const k of [ka, kb, kc]) { N2[k * 3] += b.x; N2[k * 3 + 1] += b.y; N2[k * 3 + 2] += b.z; }
      }
      const idx: number[] = [], dp: number[] = [], dn: number[] = [], Li = new THREE.Matrix3(), back = new THREE.Matrix3();
      let mostMove = 0;
      for (let i = 0; i < n; i++) {
        const k = key[i]; if (!legK[k]) continue;
        const len = Math.hypot(move[k * 3], move[k * 3 + 1], move[k * 3 + 2]);
        if (len < 1e-5 * perMetre) continue;
        mostMove = Math.max(mostMove, len);
        const B = blend(i); Li.setFromMatrix4(B).invert();
        a.set(move[k * 3], move[k * 3 + 1], move[k * 3 + 2]).applyMatrix3(Li);
        m3.getNormalMatrix(B); const own = b.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]).applyMatrix3(m3).normalize();
        c.set(N2[k * 3], N2[k * 3 + 1], N2[k * 3 + 2]);
        if (c.lengthSq() < 1e-20) c.copy(own); else if (c.dot(own) < 0) c.negate();
        c.normalize().applyMatrix3(back.copy(m3).invert()).normalize();
        v.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]).normalize();
        idx.push(i); dp.push(a.x, a.y, a.z); dn.push(c.x - v.x, c.y - v.y, c.z - v.z);
      }
      stats.moved = idx.length; stats.mostMm = +((mostMove / perMetre) * 1000).toFixed(1);
      return { index: Uint32Array.from(idx), pos: Float32Array.from(dp), nrm: Float32Array.from(dn) };
    },
  };
}
