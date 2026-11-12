/**
 * HER SKIN'S SLIP: the part of her points' movement that is not smooth (2026-11-12).
 *
 * WHAT WAS WRONG (MEASURED, 2026-11-12, on her skin's points read out of the room). A line designed on her body file is
 * smooth there. But the room does not draw her body file: it adds her shapes to it (her refined 0%, her smoothed sides,
 * her hybrid belly, her belly morphs), and those shapes move her skin's points ALONG her skin by different amounts from
 * one point to the next -- beside her bikini bottom's outline up to 15 mm at her default size, and 11 mm more at 0%.
 * Whatever belongs to a point (its paint, its UV, its rest position) rides with it, so a line crossing one of her big
 * triangles (up to 37 mm over her hips) bends at each of its corners: the outline's turns along itself were 27 degrees
 * at their 90th percentile in the room against 6 on her body file. Joshua, of his own painting the same day: "isn't
 * smooth (jagged edges probably because trying to follow the body's mesh which isn't consistent)".
 *
 * WHAT THIS GIVES. A movement of her points is split in two: its SMOOTH part (what a patch of her skin a few
 * centimetres across does together -- her belly growing, her hips widening: real movement of her skin, which a garment
 * painted on her rides) and the rest, her SLIP (each point's own departure from its neighbours'). Along her skin, the
 * slip is where a point went that her skin did not: looked up at (its rest place + its slip), a design on her rest
 * skin lies on her as it would if her points had all moved smoothly. With it the same outline turns 7 degrees at its
 * 90th percentile at her default size, at 0%, at 200% and with her legs apart (MEASURED; her squat and recline fold her
 * skin itself, and read higher on that measure with the line drawn clean).
 *
 * HOW. Her points in a REGION (a box: the garment's block) are welded (a vertex split along a texture seam is one
 * point), and joined as her triangles join them (the points on the region's border are held: no slip is told there). The smooth part of a movement is that movement averaged with its
 * neighbours' `SLIP_ROUNDS` times; the slip is what is left, with the part off her skin (along her rest normal) dropped:
 * only where a point is ALONG her skin matters to a line on it. A neighbour's share in the average is its MEAN VALUE
 * weight (Floater 2003: tan of half the angle each of the two triangles on that edge makes at the point, over the
 * edge's length), not just its nearness: with those shares a point is exactly the average of its neighbours' places on
 * flat skin however unevenly they lie round it, so a movement that is even over a patch (a stretch, a turn, a carry)
 * averages to itself and leaves no slip. Plain nearness left a tenth of a millimetre of false slip for every tenth of
 * stretch on an evenly jittered sheet, and her skin is far less even than that.
 *
 * It is LINEAR: the slip of a sum of movements is the sum of their slips. So the room keeps one slip for her shapes as
 * they are (with what is laid on them point by point before her bones: her belly's push for her baby; and without
 * what of her shape is her pose's, which is no slide of her points but her skin moved: `besideShapes`), and one for
 * each of her morphs, and adds them by the morphs' weights each time those change.
 */

/**
 * GAME TUNING: rounds of averaging, and how far a point goes toward its neighbours' average each round. Sixty half
 * steps reach a few centimetres along her skin (her points' slides come in patches up to about that size); 200 rounds
 * and 60 measured the same on her outline (2026-11-12), and 60 costs a third.
 */
export const SLIP_ROUNDS = 60, SLIP_BLEND = 0.5;

export interface SkinSlip {
  /** Her vertices in the region, in the order `slip` reads and writes them (every copy of a point along a seam). */
  readonly vertices: Uint32Array;
  /** How many points they are, welded. */
  readonly points: number;
  /**
   * The slip of a movement: `move` holds each region vertex's movement (three numbers a vertex, in `vertices`' order,
   * any units); what comes back, the same shape (written to `out` when given), is its not-smooth part along her skin.
   */
  slip(move: ArrayLike<number>, out?: Float32Array): Float32Array;
}

/**
 * Her region's points and how they are joined, ready to take slips. `rest`: her vertices at rest (three numbers each).
 * `index`: her triangles. `inRegion`: whether a rest place is in the region.
 */
export function makeSkinSlip(rest: ArrayLike<number>, index: ArrayLike<number>, inRegion: (x: number, y: number, z: number) => boolean, options: { readonly rounds?: number; readonly blend?: number } = {}): SkinSlip {
  const rounds = options.rounds ?? SLIP_ROUNDS, blend = options.blend ?? SLIP_BLEND;
  const count = rest.length / 3, pointOf = new Int32Array(count).fill(-1), byPlace = new Map<string, number>(), list: number[] = [], first: number[] = [];
  for (let v = 0; v < count; v++) {
    const x = rest[v * 3], y = rest[v * 3 + 1], z = rest[v * 3 + 2];
    if (!inRegion(x, y, z)) continue;
    const key = `${x},${y},${z}`;
    let p = byPlace.get(key);
    if (p === undefined) { p = first.length; byPlace.set(key, p); first.push(v); }
    pointOf[v] = p; list.push(v);
  }
  const vertices = Uint32Array.from(list), points = first.length;
  const at = new Float64Array(points * 3);
  first.forEach((v, p) => { at[p * 3] = rest[v * 3]; at[p * 3 + 1] = rest[v * 3 + 1]; at[p * 3 + 2] = rest[v * 3 + 2]; });
  // her triangles wholly in the region: their faces give each point its normal, and their corners each neighbour's share
  // (the mean value weight of q for p: for each triangle on the edge p-q, tan of half its angle at p, over the edge's length)
  const normal = new Float64Array(points * 3), weight = new Map<number, number>();
  const corner = (p: number, q: number, r: number) => {
    const ux = at[q * 3] - at[p * 3], uy = at[q * 3 + 1] - at[p * 3 + 1], uz = at[q * 3 + 2] - at[p * 3 + 2];
    const vx = at[r * 3] - at[p * 3], vy = at[r * 3 + 1] - at[p * 3 + 1], vz = at[r * 3 + 2] - at[p * 3 + 2];
    const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
    // tan(angle / 2) = |u x v| / (|u||v| + u.v)
    const half = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / Math.max(lu * lv + ux * vx + uy * vy + uz * vz, 1e-30);
    if (!(lu > 0 && lv > 0) || !Number.isFinite(half)) return;
    weight.set(p * points + q, (weight.get(p * points + q) ?? 0) + half / lu);
    weight.set(p * points + r, (weight.get(p * points + r) ?? 0) + half / lv);
  };
  // (a point on the region's border -- one of its triangles reaches out of the region -- has neighbours on one side
  // only, and nothing to tell its slip from the movement of the skin beyond: it is held, its slip none)
  const held = new Uint8Array(points);
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = pointOf[index[t]], b = pointOf[index[t + 1]], c = pointOf[index[t + 2]];
    if (a < 0 || b < 0 || c < 0) { if (a >= 0) held[a] = 1; if (b >= 0) held[b] = 1; if (c >= 0) held[c] = 1; continue; }
    if (a === b || b === c || a === c) continue;
    const ux = at[b * 3] - at[a * 3], uy = at[b * 3 + 1] - at[a * 3 + 1], uz = at[b * 3 + 2] - at[a * 3 + 2];
    const vx = at[c * 3] - at[a * 3], vy = at[c * 3 + 1] - at[a * 3 + 1], vz = at[c * 3 + 2] - at[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) { normal[p * 3] += nx; normal[p * 3 + 1] += ny; normal[p * 3 + 2] += nz; }
    corner(a, b, c); corner(b, c, a); corner(c, a, b);
  }
  for (let p = 0; p < points; p++) { const l = Math.hypot(normal[p * 3], normal[p * 3 + 1], normal[p * 3 + 2]) || 1; normal[p * 3] /= l; normal[p * 3 + 1] /= l; normal[p * 3 + 2] /= l; }
  // each point's neighbours and their shares (summing to one)
  const start = new Int32Array(points + 1);
  for (const key of weight.keys()) start[Math.floor(key / points) + 1]++;
  for (let p = 0; p < points; p++) start[p + 1] += start[p];
  const fill = start.slice(0, points), to = new Int32Array(weight.size), share = new Float32Array(weight.size);
  for (const [key, w] of weight) { const p = Math.floor(key / points), q = key - p * points; to[fill[p]] = q; share[fill[p]++] = w; }
  for (let p = 0; p < points; p++) {
    let sum = 0;
    for (let j = start[p]; j < start[p + 1]; j++) sum += share[j];
    if (sum > 0) for (let j = start[p]; j < start[p + 1]; j++) share[j] /= sum;
  }
  const copies = new Float32Array(points);
  for (let k = 0; k < vertices.length; k++) copies[pointOf[vertices[k]]]++;
  const moved = new Float32Array(points * 3);
  let smooth = new Float32Array(points * 3), next = new Float32Array(points * 3);
  return {
    vertices, points,
    slip(move, out = new Float32Array(vertices.length * 3)) {
      // each point's movement: its copies' average (they are one point, and move as one but for rounding)
      moved.fill(0);
      for (let k = 0; k < vertices.length; k++) { const p = pointOf[vertices[k]] * 3; moved[p] += move[k * 3]; moved[p + 1] += move[k * 3 + 1]; moved[p + 2] += move[k * 3 + 2]; }
      for (let p = 0; p < points; p++) { const c = copies[p] || 1; moved[p * 3] /= c; moved[p * 3 + 1] /= c; moved[p * 3 + 2] /= c; }
      smooth.set(moved);
      for (let r = 0; r < rounds; r++) {
        for (let p = 0; p < points; p++) {
          const i = p * 3, j0 = start[p], j1 = start[p + 1];
          if (j0 === j1 || held[p]) { next[i] = smooth[i]; next[i + 1] = smooth[i + 1]; next[i + 2] = smooth[i + 2]; continue; }
          let x = 0, y = 0, z = 0;
          for (let j = j0; j < j1; j++) { const q = to[j] * 3, w = share[j]; x += w * smooth[q]; y += w * smooth[q + 1]; z += w * smooth[q + 2]; }
          next[i] = smooth[i] + blend * (x - smooth[i]); next[i + 1] = smooth[i + 1] + blend * (y - smooth[i + 1]); next[i + 2] = smooth[i + 2] + blend * (z - smooth[i + 2]);
        }
        const swap = smooth; smooth = next; next = swap;
      }
      for (let k = 0; k < vertices.length; k++) {
        const p = pointOf[vertices[k]] * 3;
        const x = moved[p] - smooth[p], y = moved[p + 1] - smooth[p + 1], z = moved[p + 2] - smooth[p + 2];
        const off = x * normal[p] + y * normal[p + 1] + z * normal[p + 2];
        out[k * 3] = x - off * normal[p]; out[k * 3 + 1] = y - off * normal[p + 1]; out[k * 3 + 2] = z - off * normal[p + 2];
      }
      return out;
    },
  };
}

/** What `slipDriver` reads of her body each time it is asked: her rest, her shapes laid on it, and her morphs. */
export interface SlipSource {
  /** her vertices at rest, and as her shapes leave them before her morphs and bones (three numbers each, the same units) */
  readonly rest: ArrayLike<number>;
  readonly shaped: ArrayLike<number>;
  /**
   * A movement of her vertices laid on top of her shapes before her bones, where she has one (her belly made room for
   * her baby: `softBody.ts`'s push, which the shader adds point by point): three numbers a vertex, the same units.
   */
  readonly pushed?: ArrayLike<number> | null;
  /** a number that changes whenever `shaped` or `pushed` does */
  readonly shapedVersion: number;
  /** her morphs' weights now, and morph k's movement of vertex v (written into `out`: three numbers) */
  readonly weights: ArrayLike<number>;
  morph(k: number, v: number, out: Float32Array): void;
}

/**
 * What is laid on her shapes beside them, for `SlipSource.pushed` (written into `out`, three numbers a vertex; null when
 * there is nothing): `push`, a movement added to her shapes point by point before her bones (her belly's push for her
 * baby), LESS what of her shape is her POSE's -- each of `posed` a shape field laid on her by how she is posed (the
 * vertices it moves, how far at full weight, and its weight now). Her slip is her own shapes': what her pose does to her
 * skin before her bones is hers to ride, as what her bones do is. MEASURED 2026-11-12: with her pose's fields counted
 * as her shapes, her slip reclined differed from her slip with her legs apart by 3 to 5 mm half way down her bikini
 * bottom's panel (her hips are turned round only reclined), and the panel's sides jogged out there -- while Joshua's
 * two drawings of that panel, each mark riding her skin from one pose to the other, are within 2.7 mm of each other.
 */
export function besideShapes(out: Float32Array, push: ArrayLike<number> | null, posed: readonly { readonly index: ArrayLike<number>; readonly pos: ArrayLike<number>; readonly weight: number }[]): Float32Array | null {
  const live = posed.filter((f) => f.weight !== 0 && f.index.length > 0);
  if (!push && !live.length) return null;
  if (push) out.set(push as ArrayLike<number>); else out.fill(0);
  for (const f of live) for (let k = 0; k < f.index.length; k++) { const i = f.index[k] * 3; out[i] -= f.weight * f.pos[k * 3]; out[i + 1] -= f.weight * f.pos[k * 3 + 1]; out[i + 2] -= f.weight * f.pos[k * 3 + 2]; }
  return out;
}

/**
 * GAME TUNING (the source's units): a morph whose slip is nowhere more than `SLIP_MORPH_FLOOR` at full weight is left
 * out (her bobbing and swaying shapes move her smoothly); and her slip is laid again once the morphs' weights have
 * moved it by `SLIP_STEP` somewhere (a tenth of a millimetre in her mesh's units: no line can be seen to move by less).
 */
export const SLIP_MORPH_FLOOR = 0.0002, SLIP_STEP = 0.0001;

export interface SlipDriver {
  /**
   * Her slip as she is now, written into `target` (three numbers a VERTEX of her whole body; vertices outside the
   * region are left alone): true when it wrote. `force` lays it whatever has changed.
   */
  update(target: Float32Array, force?: boolean): boolean;
  /** (a probe's) how many slips it has worked out, and which morphs carry one. */
  readonly stats: { solved: number; morphs: number[] };
}

/**
 * Her slip kept up to date from a source: her shapes' slip worked out again when they change, each morph's worked out
 * the first time it is on, and their sum by the morphs' weights whenever those have moved it enough to see.
 */
export function slipDriver(solver: SkinSlip, source: () => SlipSource): SlipDriver {
  const n = solver.vertices.length, move = new Float32Array(n * 3), one = new Float32Array(3);
  let shapedAt = NaN, shapes: Float32Array | null = null;
  const morphs = new Map<number, { readonly slip: Float32Array; readonly most: number } | null>();
  let applied: number[] = [], laid = false;
  const stats = { solved: 0, morphs: [] as number[] };
  return {
    stats,
    update(target, force = false) {
      const s = source();
      let changed = force || !laid;
      if (s.shapedVersion !== shapedAt || !shapes) {
        const push = s.pushed ?? null;
        for (let k = 0; k < n; k++) { const v = solver.vertices[k] * 3; move[k * 3] = s.shaped[v] - s.rest[v] + (push ? push[v] : 0); move[k * 3 + 1] = s.shaped[v + 1] - s.rest[v + 1] + (push ? push[v + 1] : 0); move[k * 3 + 2] = s.shaped[v + 2] - s.rest[v + 2] + (push ? push[v + 2] : 0); }
        shapes = solver.slip(move, shapes ?? undefined); shapedAt = s.shapedVersion; stats.solved++; changed = true;
      }
      let drift = 0;
      for (let m = 0; m < s.weights.length; m++) {
        const w = s.weights[m] || 0;
        if (w !== 0 && !morphs.has(m)) {
          for (let k = 0; k < n; k++) { s.morph(m, solver.vertices[k], one); move[k * 3] = one[0]; move[k * 3 + 1] = one[1]; move[k * 3 + 2] = one[2]; }
          const slip = solver.slip(move);
          let most = 0;
          for (let i = 0; i < slip.length; i += 3) most = Math.max(most, Math.hypot(slip[i], slip[i + 1], slip[i + 2]));
          morphs.set(m, most > SLIP_MORPH_FLOOR ? { slip, most } : null); stats.solved++;
          if (most > SLIP_MORPH_FLOOR) stats.morphs.push(m);
        }
        const have = morphs.get(m);
        if (have) drift += Math.abs(w - (applied[m] ?? 0)) * have.most;
      }
      if (!changed && drift < SLIP_STEP) return false;
      const sum = shapes.slice();
      applied = Array.from(s.weights, (w) => w || 0);
      for (const [m, have] of morphs) { const w = applied[m] ?? 0; if (have && w !== 0) for (let i = 0; i < sum.length; i++) sum[i] += w * have.slip[i]; }
      for (let k = 0; k < n; k++) { const v = solver.vertices[k] * 3; target[v] = sum[k * 3]; target[v + 1] = sum[k * 3 + 1]; target[v + 2] = sum[k * 3 + 2]; }
      laid = true;
      return true;
    },
  };
}
