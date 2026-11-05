/**
 * HER HEELS ARE HER FEET'S (Joshua, 2026-11-04: "Check the weight of the skin around the foot like you did with the hips,
 * thighs and legs so far… that way, you can still keep the flat foot as it's not too much or realistically impossible").
 *
 * Sat back on the mat after a squat birth her feet lie flat on it, her ankles pointed about 55 degrees (inside a woman's
 * range, data/jointRange.ts) -- and the back of each ankle crumpled into a notch over her heel. Her skin there, read
 * against her bind (the room's `ankleWeights` probe): ABOVE her ankle joint her own blend is a sound one, half and half at
 * the joint and all shin 6 cm up; BELOW it -- her heel, its pad, the underside of her foot behind its arch, all of which
 * move with her foot -- her foot carried only 30 to 60% of each point and her shin the rest (Meshy's auto-rig). So pointing
 * her foot left half her heel behind with her shin.
 *
 * Below the joint her shin's say over each point is handed to her foot: none of it `top` metres above the joint (measured
 * along her shin), all of it from `bottom` down, eased between -- over 6 cm, not 3 (Joshua, 2026-11-04, of her heels sat
 * back: "check at the heels as it appears the skin is not smoother": handed over in 3 cm, the back of her ankle folded
 * along one hard line; over 6 it bends round). In a birth position, as her hips' weights are
 * (birthWeights.ts); standing and walking she has exactly her own weights. Her body file is untouched: only the weights
 * she is drawn with change, and back again.
 */
import * as THREE from 'three';

/** GAME TUNING (metres along her shin from her ankle joint, up positive). */
export const ANKLE_WEIGHTS = Object.freeze({ top: 0.03, bottom: -0.03 });

export interface AnkleWeights {
  /** hand `share` (0 none .. 1 all) of her shin's say below each ankle to her foot; true when anything changed */
  apply(share: number): boolean;
  /** how many of her points it touches at all */
  readonly touched: number;
  /** how much of a point's shin weight goes to its foot at a share of 1 (0..1) */
  takeOf(i: number): number;
}

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * For `mesh` (her body): `legs` each leg's shin bone and ankle bone (its foot: that bone and every bone under it) as
 * indices in its skeleton; `toRest` takes her geometry to her rest frame (metres). Null when it has no skin weights.
 */
export function createAnkleWeights(mesh: THREE.SkinnedMesh, toRest: THREE.Matrix4, legs: readonly (readonly [number, number])[]): AnkleWeights | null {
  const g = mesh.geometry as THREE.BufferGeometry;
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined, pa = g.getAttribute('position');
  if (!si || !sw || !pa || (si as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute || (sw as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute) return null;
  const n = pa.count, B = ANKLE_WEIGHTS, bones = mesh.skeleton.bones;
  // a joint's bind place in her rest frame: through her bind matrix into her geometry (kneeTurn.ts), then to rest
  const bindInv = new THREE.Matrix4().copy(mesh.bindMatrix).invert();
  const jointAt = (b: number) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(mesh.skeleton.boneInverses[b]).invert())).applyMatrix4(toRest);
  // her own weights, as plain numbers (a quantized file stores them as normalized integers), kept to come back to
  const ownI = new Uint16Array(n * 4), ownW = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) { ownI[i * 4 + c] = si.getComponent(i, c); ownW[i * 4 + c] = sw.getComponent(i, c); }
  // each point her shin carries any of below the top of the band: how much of that goes to which foot
  const take = new Float32Array(n), shinOf = new Int32Array(n).fill(-1), footOf = new Int32Array(n).fill(-1), v = new THREE.Vector3();
  let touched = 0;
  for (const [shin, ankle] of legs) {
    if (!bones[shin] || !bones[ankle]) continue;
    const A = jointAt(ankle), up = jointAt(shin).sub(A).normalize();
    for (let i = 0; i < n; i++) {
      let ws = 0; for (let c = 0; c < 4; c++) if (ownI[i * 4 + c] === shin) ws += ownW[i * 4 + c];
      if (ws <= 0) continue;
      const t = smooth(B.top, B.bottom, v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(toRest).sub(A).dot(up));
      if (t <= 0) continue;
      take[i] = t; shinOf[i] = shin; footOf[i] = ankle; touched++;
    }
  }
  let shareNow = 0;
  const I = si.array as ArrayLike<number> & { [k: number]: number }, W = sw.array as ArrayLike<number> & { [k: number]: number };
  const normalized = sw.normalized, scale = normalized ? (W instanceof Uint8Array ? 255 : W instanceof Uint16Array ? 65535 : 1) : 1;
  const put = (i: number, c: number, b: number, w: number) => { I[i * 4 + c] = b; W[i * 4 + c] = normalized && scale > 1 ? Math.round(w * scale) : w; };
  return {
    touched,
    takeOf: (i: number) => take[i] ?? 0,
    apply(share: number): boolean {
      share = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));
      if (share === shareNow) return false;
      shareNow = share;
      const ix = [0, 0, 0, 0], w = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) {
        if (take[i] <= 0) continue;
        const shin = shinOf[i], foot = footOf[i], k = take[i] * share;
        let moved = 0, at = -1;
        for (let c = 0; c < 4; c++) {
          ix[c] = ownI[i * 4 + c]; w[c] = ownW[i * 4 + c];
          if (ix[c] === shin && w[c] > 0) { const m = w[c] * k; w[c] -= m; moved += m; }
          if (ix[c] === foot && ownW[i * 4 + c] > 0) at = c;
        }
        // (the foot's own slot, or the emptiest one -- the shin's, once all of it is taken)
        if (at < 0) { let low = 0; for (let c = 1; c < 4; c++) if (w[c] < w[low]) low = c; at = low; moved += w[at]; w[at] = 0; ix[at] = foot; }
        w[at] += moved;
        const sum = w[0] + w[1] + w[2] + w[3] || 1;
        for (let c = 0; c < 4; c++) put(i, c, ix[c], w[c] / sum);
      }
      si.needsUpdate = true; sw.needsUpdate = true;
      return true;
    },
  };
}
