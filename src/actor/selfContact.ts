/**
 * WHERE ONE PART OF A BODY HAS GONE THROUGH ANOTHER (2026-11-26, for the pose library: "check at 0%, 100% and 200% belly
 * that her bump, arms and legs never go through ... each other"). A skin is one closed surface; a pose that folds an arm
 * into her side or a thigh into her bump puts the points of one part BEHIND the surface of the other. So for each point
 * of part A, the nearest of part B's triangles within `reach`, and which side of it the point is on by that triangle's
 * own facing (or, at an edge or a corner of it, by the mean facing of the triangles as near): behind it by more than
 * `tolerance` is through it.
 *
 * Parts are numbers a point (`part`), 255 a point left out (a blend zone at a joint, where two parts' skin is one). A
 * triangle belongs to a part when all three of its corners do. The skin must face out (its triangles wound so, as a
 * glTF's are).
 *
 * Pure: no three, no DOM.
 */

export interface Through {
  readonly a: number; readonly b: number;
  /** points of `a` behind `b`'s skin by more than the tolerance (square to it) */
  readonly count: number;
  /** the deepest of them, metres (0 with none) */
  readonly deepest: number;
  /** the deepest point's index (-1 with none) */
  readonly at: number;
}
export interface ThroughOptions {
  /** metres a point may be behind the other's skin and not count (default 2 mm) */
  readonly tolerance?: number;
  /** how far a point looks for the other's skin, metres (default 6 cm): deeper than this is not seen */
  readonly reach?: number;
  /** look at every `every`-th point only (default 1: all), for a quick look */
  readonly every?: number;
}

type V = [number, number, number];

/** The closest point of triangle abc to p, and whether it is inside the triangle's face (not on an edge or a corner). */
function closest(p: V, a: V, b: V, c: V): { q: V; face: boolean } {
  const ab: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac: V = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap: V = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dt = (u: V, v: V) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dt(ab, ap), d2 = dt(ac, ap);
  if (d1 <= 0 && d2 <= 0) return { q: a, face: false };
  const bp: V = [p[0] - b[0], p[1] - b[1], p[2] - b[2]], d3 = dt(ab, bp), d4 = dt(ac, bp);
  if (d3 >= 0 && d4 <= d3) return { q: b, face: false };
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return { q: [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v], face: false }; }
  const cp: V = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], d5 = dt(ab, cp), d6 = dt(ac, cp);
  if (d6 >= 0 && d5 <= d6) return { q: c, face: false };
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return { q: [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w], face: false }; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return { q: [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w], face: false }; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return { q: [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w], face: true };
}

/**
 * For each part asked for (`parts`), its points that are behind the nearest skin of ANY OTHER part -- that skin the nearest
 * triangle with no corner of the part itself, a blend zone's (255) among them, so a hand on her hip is told by her hip's
 * own skin and not by the nearest skin that happens to carry a label -- each counted against the part that skin is
 * (the most of its corners that are not 255; 255 when all are: skin at a joint). `pos` posed, metres, three a point;
 * `index` three a triangle; `part` a number a point.
 */
export function throughEachOther(pos: ArrayLike<number>, index: ArrayLike<number>, part: ArrayLike<number>, parts: readonly number[], options: ThroughOptions = {}): Through[] {
  const tol = options.tolerance ?? 0.002, reach = options.reach ?? 0.06, cell = 0.015, rings = Math.ceil(reach / cell);
  const P = (i: number): V => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  // a cell by three whole numbers, each within +-1024 cells (+-15 m) of the origin
  const cellKey = (x: number, y: number, z: number) => ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
  const cells = new Map<number, number[]>(), tris = Math.floor(index.length / 3), normal = new Float64Array(tris * 3), owner = new Uint8Array(tris);
  for (let t = 0; t < tris; t += 1) {
    const i0 = index[t * 3], i1 = index[t * 3 + 1], i2 = index[t * 3 + 2];
    const a = P(i0), bb = P(i1), c = P(i2);
    const n: V = [(bb[1] - a[1]) * (c[2] - a[2]) - (bb[2] - a[2]) * (c[1] - a[1]), (bb[2] - a[2]) * (c[0] - a[0]) - (bb[0] - a[0]) * (c[2] - a[2]), (bb[0] - a[0]) * (c[1] - a[1]) - (bb[1] - a[1]) * (c[0] - a[0])];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    normal[t * 3] = n[0] / l; normal[t * 3 + 1] = n[1] / l; normal[t * 3 + 2] = n[2] / l;
    // whose skin it is: the part most of its labelled corners are
    const labels = [part[i0], part[i1], part[i2]].filter((x) => x !== 255);
    owner[t] = labels.length === 0 ? 255 : labels.sort((x, y) => labels.filter((z) => z === y).length - labels.filter((z) => z === x).length)[0];
    const lo = [Math.min(a[0], bb[0], c[0]), Math.min(a[1], bb[1], c[1]), Math.min(a[2], bb[2], c[2])], hi = [Math.max(a[0], bb[0], c[0]), Math.max(a[1], bb[1], c[1]), Math.max(a[2], bb[2], c[2])];
    for (let x = Math.floor(lo[0] / cell); x <= Math.floor(hi[0] / cell); x += 1)
      for (let y = Math.floor(lo[1] / cell); y <= Math.floor(hi[1] / cell); y += 1)
        for (let z = Math.floor(lo[2] / cell); z <= Math.floor(hi[2] / cell); z += 1) {
          const k = cellKey(x, y, z); let list = cells.get(k); if (!list) cells.set(k, (list = [])); list.push(t);
        }
  }
  const tally = new Map<string, { a: number; b: number; count: number; deepest: number; at: number }>();
  const n = Math.floor(pos.length / 3);
  for (const a of parts) {
    for (let i = 0; i < n; i += options.every ?? 1) {
      if (part[i] !== a) continue;
      const p = P(i), seen = new Set<number>(), cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
      let best = Infinity, q: V = p, near: number[] = [];
      // ring by ring out from its own cell: once the nearest found is nearer than the ring's reach, no further cell holds a nearer
      for (let r = 0; r <= rings && !(best <= r * cell); r += 1) {
        for (let dx = -r; dx <= r; dx += 1) for (let dy = -r; dy <= r; dy += 1) for (let dz = -r; dz <= r; dz += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
          const list = cells.get(cellKey(cx + dx, cy + dy, cz + dz));
          if (!list) continue;
          for (const t of list) {
            if (seen.has(t)) continue;
            seen.add(t);
            const i0 = index[t * 3], i1 = index[t * 3 + 1], i2 = index[t * 3 + 2];
            // (its own skin, and the skin that runs on from it, is not another part's)
            if (part[i0] === a || part[i1] === a || part[i2] === a) continue;
            const c = closest(p, P(i0), P(i1), P(i2));
            const d = Math.hypot(c.q[0] - p[0], c.q[1] - p[1], c.q[2] - p[2]);
            if (d < best - 1e-9) { best = d; q = c.q; near = [t]; } else if (d < best + 1e-9) near.push(t);
          }
        }
      }
      if (!(best <= reach) || !(best > tol)) continue;
      let nx = 0, ny = 0, nz = 0;
      for (const t of near) { nx += normal[t * 3]; ny += normal[t * 3 + 1]; nz += normal[t * 3 + 2]; }
      const nl = Math.hypot(nx, ny, nz) || 1;
      // how far behind that skin it is, square to it: a point beside the edge of skin it runs on from (a curve of her
      // beside a blend zone) is nearly level with it, a point through it is behind it by all its distance
      const depth = -((p[0] - q[0]) * nx + (p[1] - q[1]) * ny + (p[2] - q[2]) * nz) / nl;
      if (!(depth > tol)) continue;
      const b = owner[near[0]], key = `${a}>${b}`;
      let e = tally.get(key); if (!e) tally.set(key, (e = { a, b, count: 0, deepest: 0, at: -1 }));
      e.count += 1; if (depth > e.deepest) { e.deepest = depth; e.at = i; }
    }
  }
  return [...tally.values()];
}
