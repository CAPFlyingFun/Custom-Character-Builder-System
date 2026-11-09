/**
 * INSIDE HER SKIN OR NOT (the skeleton-in-v2 test, 2026-11-09). A point is inside a closed skin when a ray from it crosses
 * the skin an odd number of times. Her skin is not quite closed -- her eyes, mouth, opening and the ends of her fingers
 * have holes -- so a point is cast six ways (along her axes, tilted so no ray runs along an edge) and called inside when
 * at least four say so; a hole fools only the rays that pass through it. Its depth is the distance to the nearest
 * triangle of her skin: positive inside, negative outside (through her skin).
 *
 * Triangles are binned into a uniform grid; rays walk it cell by cell (Amanatides & Woo), each triangle tested once a ray
 * (Moller-Trumbore). Pure: no three, no DOM.
 */

export interface SkinGrid {
  readonly pos: Float32Array;
  readonly tri: ArrayLike<number>;
  readonly lo: readonly [number, number, number];
  readonly cell: number;
  readonly dim: readonly [number, number, number];
  /** triangles per cell, flattened: cell k's are tris[start[k] .. start[k + 1]) */
  readonly start: Uint32Array;
  readonly tris: Uint32Array;
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
  return { pos, tri, lo, cell, dim, start: count, tris };
}

/** Distance from p to triangle t (Ericson, closest point on a triangle). */
function triDistance(g: SkinGrid, t: number, px: number, py: number, pz: number): number {
  const P = g.pos, a = g.tri[t * 3] * 3, b = g.tri[t * 3 + 1] * 3, c = g.tri[t * 3 + 2] * 3;
  const abx = P[b] - P[a], aby = P[b + 1] - P[a + 1], abz = P[b + 2] - P[a + 2], acx = P[c] - P[a], acy = P[c + 1] - P[a + 1], acz = P[c + 2] - P[a + 2];
  const apx = px - P[a], apy = py - P[a + 1], apz = pz - P[a + 2];
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  const at = (u: number, v: number) => { const qx = P[a] + abx * u + acx * v, qy = P[a + 1] + aby * u + acy * v, qz = P[a + 2] + abz * u + acz * v; return Math.hypot(px - qx, py - qy, pz - qz); };
  if (d1 <= 0 && d2 <= 0) return at(0, 0);
  const bpx = px - P[b], bpy = py - P[b + 1], bpz = pz - P[b + 2], d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return at(1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return at(d1 / (d1 - d3), 0);
  const cpx = px - P[c], cpy = py - P[c + 1], cpz = pz - P[c + 2], d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return at(0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return at(0, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return at(1 - w, w); }
  const den = 1 / (va + vb + vc);
  return at(vb * den, vc * den);
}

/** Crossings of the skin by a ray from p along d. */
function crossings(g: SkinGrid, px: number, py: number, pz: number, d: readonly number[], stamp: Uint32Array, id: number): number {
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
      if (f * (e2x * qx + e2y * qy + e2z * qz) > 0) hits++;
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
 * Each point's depth inside her skin (the units of the grid; negative = outside), up to `reach` (further than that from
 * any triangle reads as `reach`, with its sign). `points`: x, y, z each.
 */
export function depthsInSkin(g: SkinGrid, points: Float32Array, reach: number): Float32Array {
  const out = new Float32Array(points.length / 3), stamp = new Uint32Array(g.tri.length / 3);
  let id = 0;
  const span = Math.ceil(reach / g.cell);
  for (let i = 0; i < out.length; i++) {
    const px = points[i * 3], py = points[i * 3 + 1], pz = points[i * 3 + 2];
    let inside = 0;
    for (const d of RAYS) if (crossings(g, px, py, pz, d, stamp, ++id) % 2 === 1) inside++;
    // nearest triangle within `reach`
    let best = reach;
    const cx = Math.floor((px - g.lo[0]) / g.cell), cy = Math.floor((py - g.lo[1]) / g.cell), cz = Math.floor((pz - g.lo[2]) / g.cell), mark = ++id;
    for (let z = cz - span; z <= cz + span; z++) for (let y = cy - span; y <= cy + span; y++) for (let x = cx - span; x <= cx + span; x++) {
      if (x < 0 || y < 0 || z < 0 || x >= g.dim[0] || y >= g.dim[1] || z >= g.dim[2]) continue;
      const k = (z * g.dim[1] + y) * g.dim[0] + x;
      for (let s = g.start[k]; s < g.start[k + 1]; s++) { const t = g.tris[s]; if (stamp[t] === mark) continue; stamp[t] = mark; best = Math.min(best, triDistance(g, t, px, py, pz)); }
    }
    out[i] = inside >= 4 ? best : -best;
  }
  return out;
}
