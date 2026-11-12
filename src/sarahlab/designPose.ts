/**
 * A GARMENT DESIGNED IN A POSE (2026-11-12; Joshua, of her bikini bottom: "I think we need to design the bottom with the
 * legs apart and when they close, should hopefully look right. We are doing it backwards").
 *
 * WHAT WAS WRONG (MEASURED, 2026-11-12). A designed garment is a field in space round her, looked up for each pixel at
 * its own place on her skin (`fabricMaterial.ts`). Laid round her REST skin, the field had the garment's lines in her
 * creases: at rest her crotch is a tunnel 1.8 cm wide between her thighs, and her thighs lie against her mons. Her skin
 * either side of a line there is the same place in space to within a cell of the field, and when her legs open that
 * skin is drawn two to three times as wide as it lies at rest -- so what the field could not tell apart at rest drew as
 * kinks along the panel's sides and the strap in every open pose.
 *
 * WHAT THIS GIVES. The field is laid round her skin as the room draws it IN THE POSE THE GARMENT WAS DRAWN IN (her legs
 * apart: the creases open, each line clear of the rest of her), and each pixel is looked up at its own place on her
 * skin in that pose: its vertices' rest places and their CARRY to the pose, which the garment keeps for every vertex
 * near it (`scripts/designAthleticBottom.mjs` stores them; `scripts/probe-legs-apart.mjs` measures them from the room).
 *
 * HER SLIP GOES WITH IT. In the room a vertex is not at its rest place on her skin: her shapes slide it along her skin
 * (`skinSlip.ts`), and its slip says how far. A slide along her rest skin is a different slide along her skin in the
 * pose -- turned where her bones turn her skin, longer where they stretch it -- so each vertex's slip is taken through
 * the pose's TURN there: how the carry changes from place to place across her skin (its own change smoothed over her
 * skin first: a carry measured vertex by vertex is not smooth, and her skin's triangles in her creases are under a
 * millimetre across). A vertex is looked up at its rest place + its carry + its turn of its slip.
 *
 * MEASURING A CARRY (`settleCarry`). The room is asked where it draws each vertex in the pose; but the room has her
 * shapes on, so the vertex is drawn where her skin a slip away from its rest place belongs. The carry kept is the one
 * that, with the room's own rule above, puts every vertex back exactly where it was drawn: carry = drawn - turn(carry)
 * of its slip, found in a few rounds from carry = drawn (each round the turns are read from the carry as it then is).
 */

/**
 * GAME TUNING: the smoothing a carry gets before its turns are read from it -- `POSE_SMOOTH_ROUNDS` times, each point
 * goes toward its neighbours' carries: half way where they are nearer it than `POSE_SMOOTH_M` (metres), and
 * 1 / (1 + (how far / POSE_SMOOTH_M) squared) of that where they are farther. So it smooths her creases, where her
 * triangles are under a millimetre across (over a few millimetres of her skin), and leaves her hips, where they are
 * centimetres across, as measured. MEASURED 2026-11-12 on her legs apart: her skin's turn then nowhere folds over,
 * where the carry as measured gave turns that did, in her creases.
 */
export const POSE_SMOOTH_ROUNDS = 20, POSE_SMOOTH_M = 0.003;
/**
 * GAME TUNING: rounds `settleCarry` takes. MEASURED 2026-11-12 on her legs apart: after twelve every vertex is looked up
 * within 0.12 mm of where the room drew it (99 in 100 within the step the carry is stored in); after four, the worst
 * was still 2.5 mm off.
 */
export const POSE_SETTLE_ROUNDS = 12;

/**
 * A pose's TURNS: for each vertex, how the pose turns and stretches her skin there -- the 3 x 3 (nine numbers a vertex,
 * row by row) that takes a small step along her rest skin to the same step along her skin in the pose. `rest`: her
 * vertices at rest; `index`: her triangles; `carry`: each vertex's carry to the pose (three numbers each, the same
 * units as `rest`; none for a vertex not carried); `unitsPerMetre`: how many of those units make a metre. The copies
 * of a vertex along a seam are one point. A vertex that is not carried, or has fewer than three neighbours, is not
 * turned (identity).
 */
export function poseTurns(rest: ArrayLike<number>, index: ArrayLike<number>, carry: ArrayLike<number>, unitsPerMetre: number, rounds = POSE_SMOOTH_ROUNDS): Float32Array {
  const n = rest.length / 3, turn = new Float32Array(n * 9);
  for (let v = 0; v < n; v++) { turn[v * 9] = 1; turn[v * 9 + 4] = 1; turn[v * 9 + 8] = 1; }
  const carried = new Uint8Array(n);
  let any = false;
  for (let v = 0; v < n; v++) if (carry[v * 3] !== 0 || carry[v * 3 + 1] !== 0 || carry[v * 3 + 2] !== 0) { carried[v] = 1; any = true; }
  if (!any) return turn;
  // her points: every vertex of a triangle with a carried corner, the copies of a vertex along a seam welded
  const pointOf = new Int32Array(n).fill(-1), byPlace = new Map<string, number>(), first: number[] = [];
  const point = (v: number): number => {
    if (pointOf[v] >= 0) return pointOf[v];
    const key = `${rest[v * 3]},${rest[v * 3 + 1]},${rest[v * 3 + 2]}`;
    let p = byPlace.get(key);
    if (p === undefined) { p = first.length; byPlace.set(key, p); first.push(v); }
    return (pointOf[v] = p);
  };
  const tris: number[] = [];
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    if (!carried[a] && !carried[b] && !carried[c]) continue;
    const pa = point(a), pb = point(b), pc = point(c);
    if (pa !== pb && pb !== pc && pa !== pc) tris.push(pa, pb, pc);
  }
  const points = first.length;
  if (!points) return turn;
  const at = new Float64Array(points * 3), moved = new Float64Array(points * 3), copies = new Float64Array(points);
  first.forEach((v, p) => { at[p * 3] = rest[v * 3]; at[p * 3 + 1] = rest[v * 3 + 1]; at[p * 3 + 2] = rest[v * 3 + 2]; });
  for (let v = 0; v < n; v++) { const p = pointOf[v]; if (p < 0) continue; copies[p]++; moved[p * 3] += carry[v * 3]; moved[p * 3 + 1] += carry[v * 3 + 1]; moved[p * 3 + 2] += carry[v * 3 + 2]; }
  for (let p = 0; p < points; p++) { const c = copies[p] || 1; moved[p * 3] /= c; moved[p * 3 + 1] /= c; moved[p * 3 + 2] /= c; }
  // each point's neighbours (every edge once)
  const seen = new Set<number>(), ea: number[] = [], eb: number[] = [];
  for (let t = 0; t < tris.length; t += 3) for (const [a, b] of [[tris[t], tris[t + 1]], [tris[t + 1], tris[t + 2]], [tris[t + 2], tris[t]]]) {
    const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * points + hi;
    if (seen.has(key)) continue;
    seen.add(key); ea.push(lo); eb.push(hi);
  }
  const degree = new Float64Array(points);
  for (let e = 0; e < ea.length; e++) { degree[ea[e]]++; degree[eb[e]]++; }
  // THE CARRY SMOOTHED OVER HER SKIN. Each neighbour's share is its MEAN VALUE weight (as `skinSlip.ts`: for each
  // triangle on the edge p-q, tan of half its angle at p, over the edge's length): with those a carry that is even
  // over a patch -- a stretch, a turn -- averages to itself however unevenly her points lie, and is left as it is.
  // A point on the border of what is carried (an edge of its with one triangle) has neighbours on one side only: held.
  const share = new Map<number, number>(), once = new Map<number, number>();
  const corner = (p: number, q: number, r: number) => {
    const ux = at[q * 3] - at[p * 3], uy = at[q * 3 + 1] - at[p * 3 + 1], uz = at[q * 3 + 2] - at[p * 3 + 2];
    const vx = at[r * 3] - at[p * 3], vy = at[r * 3 + 1] - at[p * 3 + 1], vz = at[r * 3 + 2] - at[p * 3 + 2];
    const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
    const half = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / Math.max(lu * lv + ux * vx + uy * vy + uz * vz, 1e-30);
    if (!(lu > 0 && lv > 0) || !Number.isFinite(half)) return;
    share.set(p * points + q, (share.get(p * points + q) ?? 0) + half / lu);
    share.set(p * points + r, (share.get(p * points + r) ?? 0) + half / lv);
  };
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    corner(a, b, c); corner(b, c, a); corner(c, a, b);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const key = Math.min(p, q) * points + Math.max(p, q); once.set(key, (once.get(key) ?? 0) + 1); }
  }
  const held = new Uint8Array(points);
  for (const [key, count] of once) if (count === 1) { held[Math.floor(key / points)] = 1; held[key % points] = 1; }
  const start = new Int32Array(points + 1);
  for (const key of share.keys()) start[Math.floor(key / points) + 1]++;
  for (let p = 0; p < points; p++) start[p + 1] += start[p];
  const fill = start.slice(0, points), to = new Int32Array(share.size), part = new Float64Array(share.size);
  for (const [key, w] of share) { const p = Math.floor(key / points); to[fill[p]] = key - p * points; part[fill[p]++] = w; }
  // how far a point goes toward its neighbours each round: half way where they are nearer than `reach`, hardly at all
  // where they are much farther (her hips' triangles are centimetres across, and their carry needs no smoothing)
  const go = new Float64Array(points), reach = POSE_SMOOTH_M * unitsPerMetre;
  for (let p = 0; p < points; p++) {
    let sum = 0, far = 0;
    for (let j = start[p]; j < start[p + 1]; j++) { const q = to[j] * 3; sum += part[j]; far += Math.hypot(at[q] - at[p * 3], at[q + 1] - at[p * 3 + 1], at[q + 2] - at[p * 3 + 2]); }
    if (!(sum > 0) || held[p]) continue;
    for (let j = start[p]; j < start[p + 1]; j++) part[j] /= sum;
    far /= (start[p + 1] - start[p]) * reach;
    go[p] = 0.5 / (1 + far * far);
  }
  let smooth = moved.slice(), next = new Float64Array(points * 3);
  for (let r = 0; r < rounds; r++) {
    for (let p = 0; p < points; p++) {
      const i = p * 3, g = go[p];
      if (!g) { next[i] = smooth[i]; next[i + 1] = smooth[i + 1]; next[i + 2] = smooth[i + 2]; continue; }
      let x = 0, y = 0, z = 0;
      for (let j = start[p]; j < start[p + 1]; j++) { const q = to[j] * 3, w = part[j]; x += w * smooth[q]; y += w * smooth[q + 1]; z += w * smooth[q + 2]; }
      next[i] = smooth[i] + g * (x - smooth[i]); next[i + 1] = smooth[i + 1] + g * (y - smooth[i + 1]); next[i + 2] = smooth[i + 2] + g * (z - smooth[i + 2]);
    }
    const swap = smooth; smooth = next; next = swap;
  }
  const posed = new Float64Array(points * 3);
  for (let i = 0; i < posed.length; i++) posed[i] = at[i] + smooth[i];
  // her skin's normal at each point, at rest and in the pose (her triangles' faces, summed)
  const normals = (A: Float64Array): Float64Array => {
    const N = new Float64Array(points * 3);
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
      const ux = A[b] - A[a], uy = A[b + 1] - A[a + 1], uz = A[b + 2] - A[a + 2], vx = A[c] - A[a], vy = A[c + 1] - A[a + 1], vz = A[c + 2] - A[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const p of [a, b, c]) { N[p] += nx; N[p + 1] += ny; N[p + 2] += nz; }
    }
    for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
    return N;
  };
  const nRest = normals(at), nPosed = normals(posed);
  // each point's ring of edges, fitted: sum(posed edge x rest edge) = J sum(rest edge x rest edge), a step along her
  // rest normal going to one along her normal in the pose (as heavy as the ring's edges together: her skin is a sheet,
  // and its edges alone leave the fit free across it)
  const A = new Float64Array(points * 9), B = new Float64Array(points * 9), heavy = new Float64Array(points);
  for (let e = 0; e < ea.length; e++) {
    const a = ea[e], b = eb[e];
    const ex = at[b * 3] - at[a * 3], ey = at[b * 3 + 1] - at[a * 3 + 1], ez = at[b * 3 + 2] - at[a * 3 + 2];
    const fx = posed[b * 3] - posed[a * 3], fy = posed[b * 3 + 1] - posed[a * 3 + 1], fz = posed[b * 3 + 2] - posed[a * 3 + 2];
    const l2 = ex * ex + ey * ey + ez * ez, E = [ex, ey, ez], F = [fx, fy, fz];
    for (const p of [a, b]) {
      heavy[p] += l2;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { A[p * 9 + r * 3 + c] += E[r] * E[c]; B[p * 9 + r * 3 + c] += F[r] * E[c]; }
    }
  }
  const J = new Float64Array(points * 9);
  for (let p = 0; p < points; p++) {
    const o = p * 9, h = heavy[p];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { A[o + r * 3 + c] += h * nRest[p * 3 + r] * nRest[p * 3 + c]; B[o + r * 3 + c] += h * nPosed[p * 3 + r] * nRest[p * 3 + c]; }
    const a = A[o], b = A[o + 1], c = A[o + 2], d = A[o + 3], e = A[o + 4], f = A[o + 5], g = A[o + 6], k = A[o + 7], l = A[o + 8];
    const det = a * (e * l - f * k) - b * (d * l - f * g) + c * (d * k - e * g);
    if (degree[p] < 3 || !(det > 1e-12 * h * h * h)) { J[o] = 1; J[o + 4] = 1; J[o + 8] = 1; continue; }
    const inv = [(e * l - f * k) / det, (c * k - b * l) / det, (b * f - c * e) / det, (f * g - d * l) / det, (a * l - c * g) / det, (c * d - a * f) / det, (d * k - e * g) / det, (b * g - a * k) / det, (a * e - b * d) / det];
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) J[o + r * 3 + q] = B[o + r * 3] * inv[q] + B[o + r * 3 + 1] * inv[3 + q] + B[o + r * 3 + 2] * inv[6 + q];
  }
  for (let v = 0; v < n; v++) { const p = pointOf[v]; if (p < 0 || !carried[v]) continue; for (let i = 0; i < 9; i++) turn[v * 9 + i] = J[p * 9 + i]; }
  return turn;
}

/**
 * Where each vertex is looked up from its rest place, written into `out` (three numbers a vertex): its carry, and its
 * slip taken through the pose's turn there (`slip`: three numbers a vertex, none where it has none).
 */
export function layCarried(out: Float32Array, carry: ArrayLike<number>, turn: ArrayLike<number>, slip: ArrayLike<number>): Float32Array {
  const n = out.length / 3;
  for (let v = 0; v < n; v++) {
    const i = v * 3, o = v * 9, x = slip[i], y = slip[i + 1], z = slip[i + 2];
    out[i] = carry[i] + turn[o] * x + turn[o + 1] * y + turn[o + 2] * z;
    out[i + 1] = carry[i + 1] + turn[o + 3] * x + turn[o + 4] * y + turn[o + 5] * z;
    out[i + 2] = carry[i + 2] + turn[o + 6] * x + turn[o + 7] * y + turn[o + 8] * z;
  }
  return out;
}

/**
 * The carry to keep for a pose MEASURED IN THE ROOM. `drawn`: each vertex's place as the room draws it in the pose less
 * its rest place (three numbers a vertex; none for a vertex left out); `slip`: her slip as she was drawn; `step`: the
 * step the carry is stored in (all in the units of `rest`, `unitsPerMetre` of them a metre). What comes back, in those
 * steps, is the carry that `layCarried` turns back into `drawn` with that slip: every vertex is then looked up where
 * the room drew it, and with any other slip, where her skin that far along belongs.
 */
export function settleCarry(rest: ArrayLike<number>, index: ArrayLike<number>, drawn: ArrayLike<number>, slip: ArrayLike<number>, step: number, unitsPerMetre: number, rounds = POSE_SETTLE_ROUNDS): Float32Array {
  const n = rest.length / 3, carry = new Float32Array(n * 3), turned = new Float32Array(n * 3), none = new Float32Array(n * 3);
  const kept = (v: number) => drawn[v * 3] !== 0 || drawn[v * 3 + 1] !== 0 || drawn[v * 3 + 2] !== 0;
  const store = (x: number) => { const q = Math.round(x / step); return q === 0 ? 0 : q * step; };
  for (let i = 0; i < carry.length; i++) carry[i] = store(drawn[i]);
  for (let r = 0; r < rounds; r++) {
    layCarried(turned, none, poseTurns(rest, index, carry, unitsPerMetre), slip);
    for (let v = 0; v < n; v++) if (kept(v)) for (let k = 0; k < 3; k++) carry[v * 3 + k] = store(drawn[v * 3 + k] - turned[v * 3 + k]);
  }
  return carry;
}
