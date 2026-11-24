/**
 * HER BARE FEET OVER HER FOOT BONES (Joshua, 2026-11-09: "fix the skin mesh around the heel to cover the bone correctly").
 * v2's bare foot is a simple rounded shape, made to sit in her sneakers; her skeleton's foot bones stand out of it at the
 * heel and the toes. Here her skin is matched to the bone (the port's rule: the skin matches the bone structure): each
 * point of her foot's skin is moved straight out along its own normal until every bone point under it is at least `margin`
 * deep, the move shared smoothly over her skin within `blend` so the foot keeps a smooth shape. Drawn only barefoot (her
 * sneakers are fitted to her foot as it was).
 *
 * Everything in her rest frame, metres. Pure: no three, no DOM.
 */

import { cellKey, runSteps, type Steps } from '../actor/insideSkin';

export interface FootCover { readonly index: Uint32Array; readonly delta: Float32Array; readonly most: number }

/**
 * @param skin her body's points and their unit normals (rest metres), x, y, z each
 * @param region which of her points may move (her feet)
 * @param bone her foot bones' points (rest metres)
 */
export function footCover(skin: Float32Array, normal: Float32Array, region: readonly number[], bone: Float32Array, margin = 0.004, blend = 0.04, reach = 0.018, round = 0.025, rounds = 10): FootCover {
  return runSteps(footCoverSteps(skin, normal, region, bone, margin, blend, reach, round, rounds));
}
/** How many of her foot's points between two of `footCoverSteps`' steps. */
const COVER_STEP = 512;
/** `footCover`, a step at a time (insideSkin.ts `Steps`: the room goes on drawing while her bare feet are fitted). */
export function* footCoverSteps(skin: Float32Array, normal: Float32Array, region: readonly number[], bone: Float32Array, margin = 0.004, blend = 0.04, reach = 0.018, round = 0.025, rounds = 10): Steps<FootCover> {
  // (her foot bones' points in a grid, 2 cm cells)
  const cell = 0.02, key = (x: number, y: number, z: number) => cellKey(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell)), grid = new Map<number, number[]>();
  for (let i = 0; i < bone.length / 3; i++) { const k = key(bone[i * 3], bone[i * 3 + 1], bone[i * 3 + 2]); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
  // how far each point of her foot must come out
  const need = new Float32Array(region.length);
  for (let r = 0; r < region.length; r++) {
    if (r % COVER_STEP === COVER_STEP - 1) yield;
    const v = region[r], sx = skin[v * 3], sy = skin[v * 3 + 1], sz = skin[v * 3 + 2], nx = normal[v * 3], ny = normal[v * 3 + 1], nz = normal[v * 3 + 2];
    const cx = Math.floor(sx / cell), cy = Math.floor(sy / cell), cz = Math.floor(sz / cell);
    let most = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const l = grid.get(cellKey(cx + a, cy + b, cz + c));
      if (l) for (const i of l) {
        const dx = sx - bone[i * 3], dy = sy - bone[i * 3 + 1], dz = sz - bone[i * 3 + 2], depth = dx * nx + dy * ny + dz * nz;
        const lx = dx - depth * nx, ly = dy - depth * ny, lz = dz - depth * nz;
        // (a bone point under this bit of skin, or just through it: not one under the skin beside it -- told by the square
        // of how far beside it first, which costs no root)
        if (depth > margin + 0.03 || lx * lx + ly * ly + lz * lz > reach * reach * 1.000001) continue;
        const side = Math.sqrt(lx * lx + ly * ly + lz * lz);
        if (side > reach) continue;
        most = Math.max(most, (margin - depth) * (1 - side / reach));
      }
    }
    need[r] = most;
  }
  // shared over her skin within `blend`: each point takes the largest nearby need, faded by distance
  const sk = new Map<number, number[]>(), bc = blend;
  region.forEach((v, r) => { if (need[r] <= 0) return; const k = cellKey(Math.floor(skin[v * 3] / bc), Math.floor(skin[v * 3 + 1] / bc), Math.floor(skin[v * 3 + 2] / bc)); let l = sk.get(k); if (!l) sk.set(k, l = []); l.push(r); });
  const index: number[] = [], delta: number[] = [], lift = new Float32Array(region.length);
  let most = 0, ri = 0;
  for (let r0 = 0; r0 < region.length; r0++) {
    if (r0 % COVER_STEP === COVER_STEP - 1) yield;
    const v = region[r0], sx = skin[v * 3], sy = skin[v * 3 + 1], sz = skin[v * 3 + 2], cx = Math.floor(sx / bc), cy = Math.floor(sy / bc), cz = Math.floor(sz / bc);
    let out = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const l = sk.get(cellKey(cx + a, cy + b, cz + c));
      if (l) for (const q of l) {
        const u = region[q], dx = skin[u * 3] - sx, dy = skin[u * 3 + 1] - sy, dz = skin[u * 3 + 2] - sz;
        // (told by the square first, which costs no root: the same points within `blend`)
        if (dx * dx + dy * dy + dz * dz > blend * blend * 1.000001) continue;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < blend) out = Math.max(out, need[q] * (0.5 + 0.5 * Math.cos((Math.PI * d) / blend)));
      }
    }
    lift[ri++] = out;
  }
  // ROUNDED, NOT LUMPY (Joshua, 2026-11-09, on the first try's heel): the moves averaged with their neighbours' within
  // `round` a few times, never below what any point needs, so the heel and ankle round out as a whole
  // (her points kept cell by cell, side by side in memory, in the order they were found: what is summed, and in what order,
  // is as it was -- but read straight through, not hunted for across her skin)
  const rc = round, cellOf = (v: number) => cellKey(Math.floor(skin[v * 3] / rc), Math.floor(skin[v * 3 + 1] / rc), Math.floor(skin[v * 3 + 2] / rc));
  const lists = new Map<number, number[]>();
  region.forEach((v, r) => { const k = cellOf(v); let l = lists.get(k); if (!l) lists.set(k, l = []); l.push(r); });
  const span = new Map<number, [number, number]>(), qs = new Int32Array(region.length), X = new Float64Array(region.length), Y = new Float64Array(region.length), Z = new Float64Array(region.length);
  { let at = 0; for (const [k, l] of lists) { span.set(k, [at, at + l.length]); for (const q of l) { const u = region[q]; qs[at] = q; X[at] = skin[u * 3]; Y[at] = skin[u * 3 + 1]; Z[at] = skin[u * 3 + 2]; at++; } } }
  // (each point's 27 cells, looked up once)
  const near = region.map((v) => {
    const cx = Math.floor(skin[v * 3] / rc), cy = Math.floor(skin[v * 3 + 1] / rc), cz = Math.floor(skin[v * 3 + 2] / rc), out: number[] = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const sp = span.get(cellKey(cx + a, cy + b, cz + c)); if (sp) out.push(sp[0], sp[1]); }
    return out;
  });
  const rr = round * round * 1.000001;
  for (let pass = 0; pass < rounds; pass++) {
    const next = new Float32Array(lift.length);
    for (let r = 0; r < region.length; r++) {
      if (r % COVER_STEP === COVER_STEP - 1) yield;
      const v = region[r], sx = skin[v * 3], sy = skin[v * 3 + 1], sz = skin[v * 3 + 2], cells = near[r];
      let sum = 0, wsum = 0;
      for (let c = 0; c < cells.length; c += 2) for (let s = cells[c]; s < cells[c + 1]; s++) {
        const dx = X[s] - sx, dy = Y[s] - sy, dz = Z[s] - sz;
        if (dx * dx + dy * dy + dz * dz > rr) continue;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < round) { const w = 1 - d / round; sum += lift[qs[s]] * w; wsum += w; }
      }
      next[r] = Math.max(need[r], wsum > 0 ? sum / wsum : lift[r]);
    }
    lift.set(next);
  }
  region.forEach((v, r) => {
    const out = lift[r];
    if (out <= 1e-5) return;
    index.push(v); delta.push(normal[v * 3] * out, normal[v * 3 + 1] * out, normal[v * 3 + 2] * out);
    most = Math.max(most, out);
  });
  return { index: Uint32Array.from(index), delta: Float32Array.from(delta), most };
}
