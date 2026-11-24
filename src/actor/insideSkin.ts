/**
 * INSIDE HER SKIN OR NOT (the skeleton-in-v2 test, 2026-11-09). A point is inside a closed skin when a ray from it crosses
 * the skin an odd number of times. Her skin is not quite closed -- her eyes, mouth, opening and the ends of her fingers
 * have holes -- so a point is cast six ways (along her axes, tilted so no ray runs along an edge) and called inside when
 * at least INSIDE_VOTES say so; a hole fools only the rays that pass through it. Its depth is the distance to the nearest
 * triangle of her skin: positive inside, negative outside (through her skin).
 *
 * Triangles are binned into a uniform grid; rays walk it cell by cell (Amanatides & Woo), each triangle tested once a ray
 * (Moller-Trumbore). Pure: no three, no DOM.
 */

/** How many of the six rays must say inside. Three: a hole (her opening, her eyes, her mouth) can fool two or three of
 * them, never more than half from a point well inside. GAME TUNING (checked on a sphere with a hole: tests/insideSkin). */
export const INSIDE_VOTES = 3;

export interface SkinGrid {
  readonly pos: Float32Array;
  readonly tri: ArrayLike<number>;
  readonly lo: readonly [number, number, number];
  readonly cell: number;
  readonly dim: readonly [number, number, number];
  /** triangles per cell, flattened: cell k's are tris[start[k] .. start[k + 1]) */
  readonly start: Uint32Array;
  readonly tris: Uint32Array;
  /** each triangle's box (lo x, y, z, hi x, y, z): a triangle whose box is no nearer than the nearest found is passed over */
  readonly box?: Float32Array;
}

/** Her skin's triangles binned into cells `cell` wide (the units of `pos`). */
export function skinGrid(pos: Float32Array, tri: ArrayLike<number>, cell: number): SkinGrid {
  const lo: [number, number, number] = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], pos[i + a]); hi[a] = Math.max(hi[a], pos[i + a]); }
  for (let a = 0; a < 3; a++) { lo[a] -= cell; hi[a] += cell; }
  const dim: [number, number, number] = [0, 1, 2].map((a) => Math.max(1, Math.ceil((hi[a] - lo[a]) / cell))) as [number, number, number];
  const nt = Math.floor(tri.length / 3), cellsOf = (t: number, f: (k: number) => void) => {
    const b0 = [Infinity, Infinity, Infinity], b1 = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 3; c++) { const i = tri[t * 3 + c] * 3; for (let a = 0; a < 3; a++) { b0[a] = Math.min(b0[a], pos[i + a]); b1[a] = Math.max(b1[a], pos[i + a]); } }
    const c0 = b0.map((v, a) => Math.floor((v - lo[a]) / cell)), c1 = b1.map((v, a) => Math.floor((v - lo[a]) / cell));
    for (let x = c0[0]; x <= c1[0]; x++) for (let y = c0[1]; y <= c1[1]; y++) for (let z = c0[2]; z <= c1[2]; z++) f((z * dim[1] + y) * dim[0] + x);
  };
  const count = new Uint32Array(dim[0] * dim[1] * dim[2] + 1);
  for (let t = 0; t < nt; t++) cellsOf(t, (k) => count[k + 1]++);
  for (let k = 1; k < count.length; k++) count[k] += count[k - 1];
  const tris = new Uint32Array(count[count.length - 1]), fill = count.slice(0, -1);
  for (let t = 0; t < nt; t++) cellsOf(t, (k) => { tris[fill[k]++] = t; });
  const box = new Float32Array(nt * 6);
  for (let t = 0; t < nt; t++) {
    for (let a = 0; a < 3; a++) { box[t * 6 + a] = Infinity; box[t * 6 + 3 + a] = -Infinity; }
    for (let c = 0; c < 3; c++) { const i = tri[t * 3 + c] * 3; for (let a = 0; a < 3; a++) { box[t * 6 + a] = Math.min(box[t * 6 + a], pos[i + a]); box[t * 6 + 3 + a] = Math.max(box[t * 6 + 3 + a], pos[i + a]); } }
  }
  return { pos, tri, lo, cell, dim, start: count, tris, box };
}

/** Distance from p to triangle t (Ericson, closest point on a triangle). */
function triDistance(g: SkinGrid, t: number, px: number, py: number, pz: number): number {
  const P = g.pos, a = g.tri[t * 3] * 3, b = g.tri[t * 3 + 1] * 3, c = g.tri[t * 3 + 2] * 3;
  const abx = P[b] - P[a], aby = P[b + 1] - P[a + 1], abz = P[b + 2] - P[a + 2], acx = P[c] - P[a], acy = P[c + 1] - P[a + 1], acz = P[c + 2] - P[a + 2];
  const apx = px - P[a], apy = py - P[a + 1], apz = pz - P[a + 2];
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  // (the closest point is a + ab u + ac v; worked out in place: a function made for it at every call cost more than the rest)
  let u: number, v: number;
  if (d1 <= 0 && d2 <= 0) { u = 0; v = 0; }
  else {
    const bpx = px - P[b], bpy = py - P[b + 1], bpz = pz - P[b + 2], d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    const vc = d1 * d4 - d3 * d2;
    if (d3 >= 0 && d4 <= d3) { u = 1; v = 0; }
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) { u = d1 / (d1 - d3); v = 0; }
    else {
      const cpx = px - P[c], cpy = py - P[c + 1], cpz = pz - P[c + 2], d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
      const vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
      if (d6 >= 0 && d5 <= d6) { u = 0; v = 1; }
      else if (vb <= 0 && d2 >= 0 && d6 <= 0) { u = 0; v = d2 / (d2 - d6); }
      else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); u = 1 - w; v = w; }
      else { const den = 1 / (va + vb + vc); u = vb * den; v = vc * den; }
    }
  }
  const qx = P[a] + abx * u + acx * v, qy = P[a + 1] + aby * u + acy * v, qz = P[a + 2] + abz * u + acz * v;
  // (a plain root: Math.hypot, which guards against overflow no skin needs, costs a dozen times as much)
  const ex = px - qx, ey = py - qy, ez = pz - qz;
  return Math.sqrt(ex * ex + ey * ey + ez * ez);
}

/** Crossings of the skin by a ray from p along d (and the nearest crossing's distance, in `nearest[0]` when given). */
function crossings(g: SkinGrid, px: number, py: number, pz: number, d: readonly number[], stamp: Uint32Array, id: number, nearest?: number[]): number {
  const P = g.pos, [nx, ny, nz] = g.dim;
  let x = Math.floor((px - g.lo[0]) / g.cell), y = Math.floor((py - g.lo[1]) / g.cell), z = Math.floor((pz - g.lo[2]) / g.cell);
  const step = d.map((v) => (v > 0 ? 1 : -1)), o = [px, py, pz], cellOf = [x, y, z];
  const tMax = [0, 1, 2].map((a) => { const edge = g.lo[a] + (cellOf[a] + (d[a] > 0 ? 1 : 0)) * g.cell; return d[a] !== 0 ? (edge - o[a]) / d[a] : Infinity; });
  const tDelta = d.map((v) => (v !== 0 ? g.cell / Math.abs(v) : Infinity));
  let hits = 0;
  while (x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz) {
    const k = (z * ny + y) * nx + x;
    for (let s = g.start[k]; s < g.start[k + 1]; s++) {
      const t = g.tris[s];
      if (stamp[t] === id) continue;
      stamp[t] = id;
      const a = g.tri[t * 3] * 3, b = g.tri[t * 3 + 1] * 3, c = g.tri[t * 3 + 2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const hx = d[1] * e2z - d[2] * e2y, hy = d[2] * e2x - d[0] * e2z, hz = d[0] * e2y - d[1] * e2x, det = e1x * hx + e1y * hy + e1z * hz;
      if (Math.abs(det) < 1e-12) continue;
      const f = 1 / det, sx = px - P[a], sy = py - P[a + 1], sz = pz - P[a + 2], u = f * (sx * hx + sy * hy + sz * hz);
      if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = f * (d[0] * qx + d[1] * qy + d[2] * qz);
      if (v < 0 || u + v > 1) continue;
      const tt = f * (e2x * qx + e2y * qy + e2z * qz);
      if (tt > 0) { hits++; if (nearest && tt < nearest[0]) nearest[0] = tt; }
    }
    if (tMax[0] < tMax[1] && tMax[0] < tMax[2]) { x += step[0]; tMax[0] += tDelta[0]; }
    else if (tMax[1] < tMax[2]) { y += step[1]; tMax[1] += tDelta[1]; }
    else { z += step[2]; tMax[2] += tDelta[2]; }
  }
  return hits;
}

/** Six ray directions along the axes, each tilted a little so none runs along an edge or a seam. */
const RAYS: readonly (readonly number[])[] = [[1, 0.13, 0.07], [-1, 0.11, -0.09], [0.08, 1, 0.12], [-0.1, -1, 0.06], [0.12, 0.07, 1], [-0.07, -0.1, -1]].map((v) => { const l = Math.hypot(v[0], v[1], v[2]); return v.map((x) => x / l); });

/**
 * What the rays said of points, kept between calls (`depthsInSkin`'s `kept`): each point's votes (-1: not cast yet), where it
 * stood when cast, and how far it was then from the nearest of her skin (up to the reach asked).
 */
export interface RaysKept { readonly votes: Int8Array; readonly at: Float32Array; readonly room: Float32Array }
export function raysKept(n: number): RaysKept { return { votes: new Int8Array(n).fill(-1), at: new Float32Array(n * 3), room: new Float32Array(n) }; }

/**
 * Each point's depth inside her skin (the units of the grid; negative = outside), up to `reach` (further than that from
 * any triangle reads as `reach`, with its sign). `points`: x, y, z each.
 * `kept`: a point whose six rays all agreed when last cast, and that has since moved less than it then stood from the nearest
 * of her skin, has crossed none of her skin and is not cast again (`pullInside` and `fitWhole` move their points a little
 * at a time, most of them not at all: casting each again every pass was most of the laying of her skeleton -- 140 s on the
 * build machine, a minute and a crash on Joshua's phone, 2026-11-24).
 */
export function depthsInSkin(g: SkinGrid, points: Float32Array, reach: number, kept?: RaysKept): Float32Array {
  return runSteps(depthsInSkinSteps(g, points, reach, kept));
}

/**
 * A piece of work done a step at a time (`runSteps`, or a little each frame: SarahLabScene's `inSlices`): it yields now and
 * then, and returns what it made. Her skeleton and her bare feet are laid so (Joshua, 2026-11-24: "pressing to turn off the
 * sneakers causes the app to lock up for about 60s, then crash/restart"): the room goes on drawing while they are made.
 */
export type Steps<T> = Generator<void, T, void>;
/** A piece of work's steps, all of them now. */
export function runSteps<T>(steps: Steps<T>): T {
  for (;;) { const r = steps.next(); if (r.done) return r.value; }
}
/** How many points between two of `depthsInSkinSteps`' steps. */
const DEPTH_STEP = 128;

/** `depthsInSkin`, a step at a time. */
export function* depthsInSkinSteps(g: SkinGrid, points: Float32Array, reach: number, kept?: RaysKept): Steps<Float32Array> {
  const out = new Float32Array(points.length / 3), stamp = new Uint32Array(g.tri.length / 3), box = g.box;
  let id = 0;
  const span = Math.ceil(reach / g.cell);
  for (let i = 0; i < out.length; i++) {
    if (i % DEPTH_STEP === DEPTH_STEP - 1) yield;
    const px = points[i * 3], py = points[i * 3 + 1], pz = points[i * 3 + 2];
    // nearest triangle within `reach` (a cell, or a triangle's box, no nearer than the nearest yet found is passed over:
    // what is found is the same)
    let best = reach;
    const cx = Math.floor((px - g.lo[0]) / g.cell), cy = Math.floor((py - g.lo[1]) / g.cell), cz = Math.floor((pz - g.lo[2]) / g.cell), mark = ++id;
    for (let z = cz - span; z <= cz + span; z++) for (let y = cy - span; y <= cy + span; y++) for (let x = cx - span; x <= cx + span; x++) {
      if (x < 0 || y < 0 || z < 0 || x >= g.dim[0] || y >= g.dim[1] || z >= g.dim[2]) continue;
      const k = (z * g.dim[1] + y) * g.dim[0] + x;
      if (g.start[k] === g.start[k + 1]) continue;
      const bx = Math.max(0, g.lo[0] + x * g.cell - px, px - (g.lo[0] + (x + 1) * g.cell)), by = Math.max(0, g.lo[1] + y * g.cell - py, py - (g.lo[1] + (y + 1) * g.cell)), bz = Math.max(0, g.lo[2] + z * g.cell - pz, pz - (g.lo[2] + (z + 1) * g.cell));
      if (bx * bx + by * by + bz * bz >= best * best) continue;
      for (let s = g.start[k]; s < g.start[k + 1]; s++) {
        const t = g.tris[s];
        if (stamp[t] === mark) continue;
        stamp[t] = mark;
        if (box) {
          const ex = Math.max(0, box[t * 6] - px, px - box[t * 6 + 3]), ey = Math.max(0, box[t * 6 + 1] - py, py - box[t * 6 + 4]), ez = Math.max(0, box[t * 6 + 2] - pz, pz - box[t * 6 + 5]);
          if (ex * ex + ey * ey + ez * ez >= best * best) continue;
        }
        best = Math.min(best, triDistance(g, t, px, py, pz));
      }
    }
    let votes = -1;
    if (kept) {
      const v = kept.votes[i];
      if ((v === 0 || v === RAYS.length) && (px - kept.at[i * 3]) ** 2 + (py - kept.at[i * 3 + 1]) ** 2 + (pz - kept.at[i * 3 + 2]) ** 2 < kept.room[i] * kept.room[i]) votes = v;
    }
    if (votes < 0) {
      votes = 0;
      for (const d of RAYS) if (crossings(g, px, py, pz, d, stamp, ++id) % 2 === 1) votes++;
      if (kept) { kept.votes[i] = votes; kept.at[i * 3] = px; kept.at[i * 3 + 1] = py; kept.at[i * 3 + 2] = pz; kept.room[i] = best; }
    }
    out[i] = votes >= INSIDE_VOTES ? best : -best;
  }
  return out;
}

/** For probes: how many times each of the six rays from p crosses the skin. */
export function raysAt(g: SkinGrid, px: number, py: number, pz: number): number[] {
  const stamp = new Uint32Array(g.tri.length / 3);
  return RAYS.map((d, k) => crossings(g, px, py, pz, d, stamp, k + 1));
}

/** For probes: the same crossings by testing every triangle (no grid), to check the grid's walk. */
export function raysAtBrute(pos: Float32Array, tri: ArrayLike<number>, px: number, py: number, pz: number): number[] {
  const nt = Math.floor(tri.length / 3), all = new Uint32Array(nt + 1), list = new Uint32Array(nt);
  for (let t = 0; t < nt; t++) list[t] = t;
  all[1] = nt;
  const g: SkinGrid = { pos, tri, lo: [px - 1e6, py - 1e6, pz - 1e6], cell: 4e6, dim: [1, 1, 1], start: all, tris: list };
  const stamp = new Uint32Array(nt);
  return RAYS.map((d, k) => crossings(g, px, py, pz, d, stamp, k + 1));
}

/**
 * One number for a cell of a grid of whole cells (each index within 2^16 either side: under 2^51, so every one is a
 * whole number exactly): a Map's key, as a string of the three was (and slower to make and to look up).
 */
export function cellKey(x: number, y: number, z: number): number {
  return ((x + 65536) * 131072 + (y + 65536)) * 131072 + (z + 65536);
}

/**
 * BONE KEPT UNDER HER SKIN (Joshua, 2026-11-09: "the skin matches to the bone structure, not bone to skin... the bone size
 * can be changed a little"): each point of a piece of bone nearer her skin than `margin` (or through it) is drawn in toward
 * the middle of its own piece, and the move is shared smoothly with the points of the same piece within `blend` of it so
 * the bone keeps its shape -- it is made a little smaller or slimmer where her body is, never cut. Repeated `passes`
 * times. `points` (x, y, z each) is changed in place; `owner` is each point's piece (its bone); a piece `keep` says no to
 * is left alone. Returns how many points were still within `margin` at the last pass. Units are the grid's.
 */
export function pullInside(g: SkinGrid, points: Float32Array, owner: ArrayLike<number>, margin: number, blend: number, keep: (piece: number) => boolean, passes = 4): number {
  return runSteps(pullInsideSteps(g, points, owner, margin, blend, keep, passes));
}
/** `pullInside`, a step at a time. */
export function* pullInsideSteps(g: SkinGrid, points: Float32Array, owner: ArrayLike<number>, margin: number, blend: number, keep: (piece: number) => boolean, passes = 4): Steps<number> {
  const n = points.length / 3, centre = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < n; i++) { const c = centre.get(owner[i]) ?? [0, 0, 0, 0]; c[0] += points[i * 3]; c[1] += points[i * 3 + 1]; c[2] += points[i * 3 + 2]; c[3]++; centre.set(owner[i], c); }
  for (const c of centre.values()) { c[0] /= c[3]; c[1] /= c[3]; c[2] /= c[3]; }
  let left = 0;
  // (what the rays said of each point, kept from pass to pass: `RaysKept`)
  const kept = raysKept(n);
  for (let pass = 0; pass < passes; pass++) {
    const depth = yield* depthsInSkinSteps(g, points, margin * 4, kept), push = new Float32Array(n * 3);
    left = 0;
    for (let i = 0; i < n; i++) {
      if (!keep(owner[i]) || depth[i] >= margin) continue;
      left++;
      const c = centre.get(owner[i])!, dx = c[0] - points[i * 3], dy = c[1] - points[i * 3 + 1], dz = c[2] - points[i * 3 + 2], l = Math.hypot(dx, dy, dz) || 1, need = (margin - depth[i]) * 1.2;
      push[i * 3] = (dx / l) * need; push[i * 3 + 1] = (dy / l) * need; push[i * 3 + 2] = (dz / l) * need;
    }
    if (!left) break;
    // (shared over the piece's points within `blend`: each takes the largest nearby move, faded by distance)
    const cell = blend, grid = new Map<number, number[]>();
    for (let i = 0; i < n; i++) if (push[i * 3] || push[i * 3 + 1] || push[i * 3 + 2]) { const k = cellKey(Math.floor(points[i * 3] / cell), Math.floor(points[i * 3 + 1] / cell), Math.floor(points[i * 3 + 2] / cell)); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
    const move = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (i % 2048 === 2047) yield;
      if (!keep(owner[i])) continue;
      const px = points[i * 3], py = points[i * 3 + 1], pz = points[i * 3 + 2], cx = Math.floor(px / cell), cy = Math.floor(py / cell), cz = Math.floor(pz / cell);
      let best = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const l = grid.get(cellKey(cx + a, cy + b, cz + c));
        if (l) for (const j of l) {
          if (owner[j] !== owner[i]) continue;
          const ex = points[j * 3] - px, ey = points[j * 3 + 1] - py, ez = points[j * 3 + 2] - pz;
          if (ex * ex + ey * ey + ez * ez > blend * blend * 1.000001) continue;
          const r = Math.sqrt(ex * ex + ey * ey + ez * ez);
          if (r >= blend) continue;
          const f = 0.5 + 0.5 * Math.cos((Math.PI * r) / blend), m = Math.hypot(push[j * 3], push[j * 3 + 1], push[j * 3 + 2]) * f;
          if (m > best) { best = m; move[i * 3] = push[j * 3] * f; move[i * 3 + 1] = push[j * 3 + 1] * f; move[i * 3 + 2] = push[j * 3 + 2] * f; }
        }
      }
    }
    for (let i = 0; i < n * 3; i++) points[i] += move[i];
  }
  return left;
}

/**
 * A WHOLE PIECE MOVED IN, NOT RESHAPED (her skull and jaw in her head, each foot's bones in her foot): the points `which`
 * of `points` moved together -- slid by the mean of how far each point too near or through her skin needs to go in (toward
 * the piece's middle), and where sliding is not enough, made a little smaller about its middle (by `shrinkStep` a time,
 * never below `leastScale`) -- until none is nearer her skin than `margin`, or `steps` are spent. Returns the scale and the
 * slide (the grid's units) it took.
 */
export function fitWhole(g: SkinGrid, points: Float32Array, which: readonly number[], margin: number, steps = 24, shrinkStep = 0.985, leastScale = 0.82, mostSlide = Infinity): { scale: number; slide: [number, number, number]; left: number } {
  return runSteps(fitWholeSteps(g, points, which, margin, steps, shrinkStep, leastScale, mostSlide));
}
/** `fitWhole`, a step at a time. */
export function* fitWholeSteps(g: SkinGrid, points: Float32Array, which: readonly number[], margin: number, steps = 24, shrinkStep = 0.985, leastScale = 0.82, mostSlide = Infinity): Steps<{ scale: number; slide: [number, number, number]; left: number }> {
  const sub = new Float32Array(which.length * 3);
  which.forEach((i, k) => { sub[k * 3] = points[i * 3]; sub[k * 3 + 1] = points[i * 3 + 1]; sub[k * 3 + 2] = points[i * 3 + 2]; });
  let scale = 1, left = 0;
  const slide: [number, number, number] = [0, 0, 0], kept = raysKept(which.length);
  for (let step = 0; step < steps; step++) {
    const d = yield* depthsInSkinSteps(g, sub, margin * 6, kept);
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < which.length; k++) { cx += sub[k * 3]; cy += sub[k * 3 + 1]; cz += sub[k * 3 + 2]; }
    cx /= which.length; cy /= which.length; cz /= which.length;
    let mx = 0, my = 0, mz = 0; left = 0;
    for (let k = 0; k < which.length; k++) {
      if (d[k] >= margin) continue;
      left++;
      const dx = cx - sub[k * 3], dy = cy - sub[k * 3 + 1], dz = cz - sub[k * 3 + 2], l = Math.hypot(dx, dy, dz) || 1, need = margin - d[k];
      mx += (dx / l) * need; my += (dy / l) * need; mz += (dz / l) * need;
    }
    if (!left) break;
    // (slid by the mean need of the points too near; a push from both sides at once cancels, and then it shrinks)
    mx /= left; my /= left; mz /= left;
    // (never slid further than `mostSlide` in all)
    { const nx = slide[0] + mx, ny = slide[1] + my, nz = slide[2] + mz, l = Math.hypot(nx, ny, nz);
      if (l > mostSlide) { const k = mostSlide / l; mx = nx * k - slide[0]; my = ny * k - slide[1]; mz = nz * k - slide[2]; } }
    const shrink = Math.hypot(mx, my, mz) < margin * 0.5 && scale * shrinkStep >= leastScale ? shrinkStep : 1;
    for (let k = 0; k < which.length; k++) {
      sub[k * 3] = cx + (sub[k * 3] - cx) * shrink + mx; sub[k * 3 + 1] = cy + (sub[k * 3 + 1] - cy) * shrink + my; sub[k * 3 + 2] = cz + (sub[k * 3 + 2] - cz) * shrink + mz;
    }
    scale *= shrink; slide[0] += mx; slide[1] += my; slide[2] += mz;
    if (shrink === 1 && Math.hypot(mx, my, mz) < margin * 0.05) break;
  }
  which.forEach((i, k) => { points[i * 3] = sub[k * 3]; points[i * 3 + 1] = sub[k * 3 + 1]; points[i * 3 + 2] = sub[k * 3 + 2]; });
  return { scale, slide, left };
}

/** How far a ray from p along the unit direction d runs before it meets the skin (Infinity: never). */
export function rayToSkin(g: SkinGrid, px: number, py: number, pz: number, d: readonly number[]): number {
  const nearest = [Infinity];
  crossings(g, px, py, pz, d, new Uint32Array(g.tri.length / 3), 1, nearest);
  return nearest[0];
}
