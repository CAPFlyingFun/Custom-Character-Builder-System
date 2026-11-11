/**
 * HER OWN SKIN STRETCHED DOWN TO HER DOORS (Joshua, 2026-11-10, of her skeleton's opening carried into v2: "the whole
 * opening moves down and far from the skin while the skin stays, leaving two openings and different heights"; asked whether
 * to cut her skin where her canal passes or stretch it down as a mound: "I'd go for 2... it would be better and look more
 * realistic... especially since it goes more than 2-3cm").
 *
 * As she opens, her canal comes down behind her pubic arch and turns forward under it (birthCanal.ts `seatedCanal`), her
 * doors at its end; fully open their middle is some 6 cm below where her skin's opening lies shut. Her skin goes with
 * them, as her perineum does round a crowning head: the edge of her skin's opening (its rim) is carried to the foot of
 * her doors, all round, and her skin round it is drawn after it -- less and less out to her own skin at the area's edge --
 * and laid over the tube her canal makes below her (it never lies inside it). One skin, one opening.
 *
 * Everything here is in ONE frame (her pelvis's rest frame, metres) and knows nothing of meshes: the tube is the sleeve
 * round her canal as its rows of points (`sleeveTube`), her skin a grid of rings round her opening by columns out from it
 * (`laySeatSkin`). vulvaMesh.ts reads her skin into that frame as she is posed and puts the result back on her.
 */
import type { P3 } from './pelvisMeasure';

/**
 * GAME TUNING: how far her skin stands off the tube (metres); how far beyond her doors' feet (toward her opening's mouth)
 * the tube is taken on, her doors' own room; how many times her skin's move is pushed off the tube and evened, and how
 * much it is evened each time (0..1); how many places round it a row's size is read at; and, for skin found inside the
 * tube, how deep in it (its distance from the tube's middle, of the wall's) it goes out to its own column's side of the
 * tube rather than straight out -- all of the way below the first, none of it beyond the second. And where the area's
 * own edge lies inside the tube (the tube comes out through her skin beyond it): how far on up the tube's wall that edge
 * is drawn (`tuck`, metres, for an edge `tuckDeep` and more inside the wall), from how far out its column (`tuckFrom`).
 * `doorSlabs`: into how many slices her doors' room (`before`) is cut to read how far out her doors stand in each, and
 * `doorOff` how far her skin stands off them there (metres: more than off the tube -- her doors' own points are some way
 * apart, and her skin lay in and out of them along a ragged line).
 */
export const SEAT_SKIN = Object.freeze({ standOff: 0.0015, before: 0.05, passes: 10, even: 0.5, round: 72, ownSide: [0.35, 0.85] as readonly [number, number], tuck: 0.05, tuckDeep: 0.01, tuckFrom: 0.45, doorSlabs: 10, doorOff: 0.004 });

/** The tube her skin lies over: its rows' middles, the way it runs at each (toward her womb), each row's own "front"
 * (square to that and to `across`), and how far out its wall is at each of `SEAT_SKIN.round` places round it. */
export interface SleeveTube {
  readonly rows: number;
  readonly cols: number;
  readonly across: P3;
  readonly centres: readonly P3[];
  readonly axes: readonly P3[];
  readonly fronts: readonly P3[];
  /** rows x SEAT_SKIN.round: the wall's distance from the row's middle at each place round it (from its front, toward `across`) */
  readonly radius: Float32Array;
  /** its first row's points (her doors' feet, round her opening), and the place round it each is at (radians) */
  readonly foot: readonly P3[];
  readonly footAngle: readonly number[];
  /** the same, flat, for the many times a point is tried against it: middles and ways (rows x 3), each row's widest
   * wall, and a box round all of it (low corner, high corner) */
  readonly flat: { readonly c: Float64Array; readonly a: Float64Array; readonly most: Float64Array; readonly box: Float64Array };
  /**
   * HER DOORS' ROOM, beyond the tube's first row (toward her opening's mouth): how far out her doors stand as they are
   * now, in each of `SEAT_SKIN.doorSlabs` slices of it (the first at their feet) at each place round it -- 0 where no
   * door is. Her skin in front of her opening comes to the foot of her front door ACROSS where that door swings: open,
   * the door stood out through her skin (2026-11-10). Null: her doors are not known, and their room is as wide as their
   * feet all the way.
   */
  readonly doors: Float32Array | null;
  readonly doorsMost: number;
}

const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: P3, b: P3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: P3): P3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const TAU = Math.PI * 2;
const wrap = (a: number): number => ((a % TAU) + TAU) % TAU;

/**
 * The tube, from the sleeve's points: `cols` round each row, its rows from her doors' feet (the first) up her canal. Her
 * canal turns in her middle plane, so `across` (her left) is square to it everywhere: each row's front is square to
 * `across` and to the way the tube runs there, and a place round a row is told from its front toward `across`.
 */
export function sleeveTube(points: ArrayLike<number>, cols: number, across: P3 = [1, 0, 0], doorPoints?: ArrayLike<number>): SleeveTube | null {
  const rows = Math.floor(points.length / 3 / cols);
  if (!(cols >= 3) || rows < 2) return null;
  const at = (k: number, c: number): P3 => { const i = (k * cols + c) * 3; return [points[i], points[i + 1], points[i + 2]]; };
  const centres: P3[] = [];
  for (let k = 0; k < rows; k++) { const m = [0, 0, 0]; for (let c = 0; c < cols; c++) { const p = at(k, c); m[0] += p[0] / cols; m[1] += p[1] / cols; m[2] += p[2] / cols; } centres.push([m[0], m[1], m[2]]); }
  const axes: P3[] = [], fronts: P3[] = [];
  for (let k = 0; k < rows; k++) {
    const a = unit(sub(centres[Math.min(rows - 1, k + 1)], centres[Math.max(0, k - 1)]));
    // (square to `across`: her canal is in her middle plane)
    const d = dot(a, across), ax = unit([a[0] - across[0] * d, a[1] - across[1] * d, a[2] - across[2] * d]);
    axes.push(ax); fronts.push(unit(cross(across, ax)));
  }
  const N = SEAT_SKIN.round, radius = new Float32Array(rows * N);
  const angles = (k: number): { a: number; r: number }[] => {
    const out: { a: number; r: number }[] = [];
    for (let c = 0; c < cols; c++) {
      const v = sub(at(k, c), centres[k]), along = dot(v, axes[k]), flat: P3 = [v[0] - axes[k][0] * along, v[1] - axes[k][1] * along, v[2] - axes[k][2] * along];
      out.push({ a: wrap(Math.atan2(dot(flat, across), dot(flat, fronts[k]))), r: Math.hypot(flat[0], flat[1], flat[2]) });
    }
    return out.sort((x, y) => x.a - y.a);
  };
  for (let k = 0; k < rows; k++) {
    const A = angles(k);
    for (let b = 0; b < N; b++) {
      const want = (b / N) * TAU;
      // (the two of its points either side of this place, round it)
      let hi = A.findIndex((x) => x.a >= want); if (hi < 0) hi = 0;
      const lo = (hi + A.length - 1) % A.length, span = wrap(A[hi].a - A[lo].a) || TAU, f = wrap(want - A[lo].a) / span;
      radius[k * N + b] = A[lo].r + (A[hi].r - A[lo].r) * Math.min(1, Math.max(0, f));
    }
  }
  const foot: P3[] = [], footAngle: number[] = [];
  for (let c = 0; c < cols; c++) { const p = at(0, c), v = sub(p, centres[0]); foot.push(p); footAngle.push(wrap(Math.atan2(dot(v, across), dot(v, fronts[0])))); }
  const c = new Float64Array(rows * 3), a = new Float64Array(rows * 3), most = new Float64Array(rows), box = new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
  let widest = 0;
  for (let k = 0; k < rows; k++) { for (let e = 0; e < 3; e++) { c[k * 3 + e] = centres[k][e]; a[k * 3 + e] = axes[k][e]; } for (let b = 0; b < N; b++) most[k] = Math.max(most[k], radius[k * N + b]); widest = Math.max(widest, most[k]); }
  for (let k = 0; k < rows; k++) for (let e = 0; e < 3; e++) { box[e] = Math.min(box[e], centres[k][e]); box[3 + e] = Math.max(box[3 + e], centres[k][e]); }
  // (and her doors' room beyond its first row)
  for (let e = 0; e < 3; e++) { const v = centres[0][e] - axes[0][e] * SEAT_SKIN.before; box[e] = Math.min(box[e], v); box[3 + e] = Math.max(box[3 + e], v); }
  for (let e = 0; e < 3; e++) { box[e] -= widest + 0.01; box[3 + e] += widest + 0.01; }
  // her doors' room: each of her doors' points into its slice and its place round, the farthest out kept; then each
  // place takes the most of its neighbours either side (her doors' points are some way apart)
  let doors: Float32Array | null = null, doorsMost = 0;
  if (doorPoints && doorPoints.length >= 9) {
    const S = SEAT_SKIN.doorSlabs, raw = new Float32Array(S * N), c0 = centres[0], a0 = axes[0], f0 = fronts[0];
    for (let i = 0; i + 2 < doorPoints.length; i += 3) {
      const v: P3 = [doorPoints[i] - c0[0], doorPoints[i + 1] - c0[1], doorPoints[i + 2] - c0[2]], al = dot(v, a0);
      // (what of a door is up the tube from its feet is under her skin there already)
      const s0 = -al / SEAT_SKIN.before;
      if (s0 < -0.05 || s0 > 1) continue;
      const flat: P3 = [v[0] - a0[0] * al, v[1] - a0[1] * al, v[2] - a0[2] * al], r = Math.hypot(flat[0], flat[1], flat[2]);
      const slab = Math.min(S - 1, Math.max(0, Math.floor(s0 * S))), b = Math.floor((wrap(Math.atan2(dot(flat, across), dot(flat, f0))) / TAU) * N) % N;
      if (r > raw[slab * N + b]) raw[slab * N + b] = r;
    }
    doors = new Float32Array(S * N);
    const spread = Math.max(1, Math.round(N / 24)), wide = new Float32Array(S * N);
    for (let sl = 0; sl < S; sl++) for (let b = 0; b < N; b++) {
      let m = 0;
      for (let ds = -1; ds <= 1; ds++) { const q = sl + ds; if (q < 0 || q >= S) continue; for (let db = -spread; db <= spread; db++) m = Math.max(m, raw[q * N + ((b + db + N) % N)]); }
      wide[sl * N + b] = m;
    }
    // (ONE SMOOTH SHAPE ROUND THEM: that -- the most of each place's neighbours -- stepped from place to place as her
    // doors' points fell in one or the next, and her skin put off it lay in steps and fins round her doors, 2026-11-10. So
    // it is evened over the same neighbours: as far out as her doors wherever they are, and no step in it)
    for (let sl = 0; sl < S; sl++) for (let b = 0; b < N; b++) {
      let m = 0, n = 0;
      for (let ds = -1; ds <= 1; ds++) { const q = sl + ds; if (q < 0 || q >= S) continue; for (let db = -spread; db <= spread; db++) { m += wide[q * N + ((b + db + N) % N)]; n++; } }
      m = Math.max(m / n, raw[sl * N + b]);
      // (at their feet, never less than the tube's own first row: her skin's rim is there)
      doors[sl * N + b] = sl === 0 ? Math.max(m, radius[b]) : m > 0 ? m + SEAT_SKIN.doorOff - SEAT_SKIN.standOff : 0;
      doorsMost = Math.max(doorsMost, doors[sl * N + b]);
    }
    for (let e = 0; e < 3; e++) { box[e] -= Math.max(0, doorsMost - widest); box[3 + e] += Math.max(0, doorsMost - widest); }
  }
  return { rows, cols, across, centres, axes, fronts, radius, foot, footAngle, flat: { c, a, most, box }, doors, doorsMost };
}

/** How far out the tube's wall is at a row and a place round it (between its rows, `f` of the way to the next). */
function wallAt(t: SleeveTube, k: number, f: number, angle: number): number {
  const N = SEAT_SKIN.round, b = (wrap(angle) / TAU) * N, b0 = Math.floor(b) % N, b1 = (b0 + 1) % N, g = b - Math.floor(b);
  const row = (r: number) => t.radius[r * N + b0] + (t.radius[r * N + b1] - t.radius[r * N + b0]) * g;
  const k1 = Math.min(t.rows - 1, k + 1);
  return row(k) + (row(k1) - row(k)) * f;
}

const orders = new WeakMap<SleeveTube, { a: number; i: number }[]>();
/** Her doors' feet in order round her opening (worked out once a tube). */
function footOrder(t: SleeveTube): { a: number; i: number }[] {
  let o = orders.get(t);
  if (!o) { o = t.footAngle.map((a, i) => ({ a, i })).sort((x, y) => x.a - y.a); orders.set(t, o); }
  return o;
}
/** How far out her doors stand `ahead` metres beyond their feet (toward her opening's mouth) at a place round them. */
function doorWallAt(t: SleeveTube, ahead: number, angle: number): number {
  if (!t.doors) return wallAt(t, 0, 0, angle);
  const N = SEAT_SKIN.round, S = SEAT_SKIN.doorSlabs, b = (wrap(angle) / TAU) * N, b0 = Math.floor(b) % N, b1 = (b0 + 1) % N, g = b - Math.floor(b);
  const s = Math.min(S - 1e-6, Math.max(0, (ahead / SEAT_SKIN.before) * S - 0.5)), s0 = Math.floor(s), s1 = Math.min(S - 1, s0 + 1), h = s - s0;
  const row = (r: number) => t.doors![r * N + b0] + (t.doors![r * N + b1] - t.doors![r * N + b0]) * g;
  return row(s0) + (row(s1) - row(s0)) * h;
}
/** The point of her doors' feet (the tube's first row) at a place round her opening. */
export function footAt(t: SleeveTube, angle: number): P3 {
  const want = wrap(angle), n = t.foot.length, order = footOrder(t);
  let hi = order.findIndex((x) => x.a >= want); if (hi < 0) hi = 0;
  const lo = (hi + n - 1) % n, A = order[lo], B = order[hi], span = wrap(B.a - A.a) || TAU, f = Math.min(1, Math.max(0, wrap(want - A.a) / span));
  const p = t.foot[A.i], q = t.foot[B.i];
  return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
}

/** `tubeOut`'s work, with nothing made on the way: the move into `out` (three numbers), whether there is one. */
function pushOut(t: SleeveTube, x: number, y: number, z: number, standOff: number, side: number | undefined, out: Float64Array): boolean {
  const F = t.flat, B = F.box;
  if (x < B[0] || y < B[1] || z < B[2] || x > B[3] || y > B[4] || z > B[5]) return false;
  const C = F.c, A = F.a, X = t.across, rows = t.rows;
  let found = false, least = 0;
  for (let k = 0; k + 1 < rows; k++) {
    const i = k * 3, ax0 = C[i], ay0 = C[i + 1], az0 = C[i + 2], bx = C[i + 3] - ax0, by = C[i + 4] - ay0, bz = C[i + 5] - az0, l2 = bx * bx + by * by + bz * bz || 1e-12;
    let f = ((x - ax0) * bx + (y - ay0) * by + (z - az0) * bz) / l2, ended = false;
    // (past an end of this piece, the next piece has it -- but for the room that is left between two pieces where the
    // tube turns, which this one's end fills as a ball; beyond its first row: on along its first piece, her doors' room;
    // beyond its last: nothing)
    if (k === 0 && f < 0) { if (-f * Math.sqrt(l2) > SEAT_SKIN.before) continue; } else if (f < 0) { f = 0; ended = true; }
    if (f > 1) { if (k === rows - 2) continue; f = 1; ended = true; }
    const fc = f < 0 ? 0 : f;
    let ux = A[i] + (A[i + 3] - A[i]) * fc, uy = A[i + 1] + (A[i + 4] - A[i + 1]) * fc, uz = A[i + 2] + (A[i + 5] - A[i + 2]) * fc;
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    const vx = x - (ax0 + bx * f), vy = y - (ay0 + by * f), vz = z - (az0 + bz * f), al = ended ? 0 : vx * ux + vy * uy + vz * uz;
    const rx = vx - ux * al, ry = vy - uy * al, rz = vz - uz * al, d = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const ahead = k === 0 && f < 0 ? -f * Math.sqrt(l2) : -1;
    if (d > (ahead >= 0 && t.doors ? Math.max(t.doorsMost, F.most[0]) : Math.max(F.most[k], F.most[k + 1])) + standOff) continue;
    // (its front here: square to `across` and to the way it runs)
    let fx = X[1] * uz - X[2] * uy, fy = X[2] * ux - X[0] * uz, fz = X[0] * uy - X[1] * ux;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    const here = Math.atan2(rx * X[0] + ry * X[1] + rz * X[2], rx * fx + ry * fy + rz * fz), wall = (ahead >= 0 ? doorWallAt(t, ahead, here) : wallAt(t, k, fc, here)) + standOff;
    // (the piece of the tube it is deepest in decides)
    if (d >= wall || d - wall >= least) continue;
    least = d - wall; found = true;
    // which way out: straight out from the tube's middle where it is near the wall; deep in it, toward ITS OWN SIDE of
    // the tube (`side`) -- near the middle "straight out" is any way at all, and one column of her skin went out one
    // side and the next the other, a skin across her canal
    let gx = d < 1e-9 ? fx : rx / d, gy = d < 1e-9 ? fy : ry / d, gz = d < 1e-9 ? fz : rz / d;
    if (side !== undefined) {
      const cs = Math.cos(side), sn = Math.sin(side), ox = fx * cs + X[0] * sn, oy = fy * cs + X[1] * sn, oz = fz * cs + X[2] * sn;
      const u = Math.min(1, Math.max(0, (d / wall - SEAT_SKIN.ownSide[0]) / (SEAT_SKIN.ownSide[1] - SEAT_SKIN.ownSide[0]))), w = u * u * (3 - 2 * u);
      const mx = ox + (gx - ox) * w, my = oy + (gy - oy) * w, mz = oz + (gz - oz) * w, ml = Math.sqrt(mx * mx + my * my + mz * mz);
      if (ml > 1e-6) { gx = mx / ml; gy = my / ml; gz = mz / ml; } else { gx = ox; gy = oy; gz = oz; }
    }
    const there = Math.atan2(gx * X[0] + gy * X[1] + gz * X[2], gx * fx + gy * fy + gz * fz), to = (ahead >= 0 ? doorWallAt(t, ahead, there) : wallAt(t, k, fc, there)) + standOff;
    out[0] = gx * to - rx; out[1] = gy * to - ry; out[2] = gz * to - rz;
  }
  return found;
}
const pushed = new Float64Array(3);
/**
 * A point kept out of the tube: where it lies inside the tube's wall (or within `standOff` of it), how far it has to go
 * to stand `standOff` off it -- [dx, dy, dz], or null where it is clear of it: straight out from the tube's middle line,
 * or (`side`, a place round the tube, as her doors' feet are told) toward that side of it where it lies deep in.
 * The tube is taken on `SEAT_SKIN.before` beyond its first row (her doors' room) and ends at its last (inside her).
 */
export function tubeOut(t: SleeveTube, x: number, y: number, z: number, standOff: number = SEAT_SKIN.standOff, side?: number): P3 | null {
  return pushOut(t, x, y, z, standOff, side, pushed) ? [pushed[0], pushed[1], pushed[2]] : null;
}

/**
 * How deep in the tube a point lies -- its wall's distance from the tube's middle there, less the point's own (metres; 0
 * and less: not in it) -- and the way the tube runs there, toward her womb.
 */
export function tubeDepth(t: SleeveTube, x: number, y: number, z: number): { depth: number; way: P3 } {
  let depth = -Infinity, way: P3 = t.axes[0];
  const p: P3 = [x, y, z];
  for (let k = 0; k + 1 < t.rows; k++) {
    const a = t.centres[k], b = t.centres[k + 1], ab = sub(b, a), l2 = dot(ab, ab) || 1e-12;
    let f = dot(sub(p, a), ab) / l2, ended = false;
    if (k === 0 && f < 0) { if (-f * Math.sqrt(l2) > SEAT_SKIN.before) continue; } else if (f < 0) { f = 0; ended = true; }
    if (f > 1) { if (k === t.rows - 2) continue; f = 1; ended = true; }
    const fc = Math.min(1, Math.max(0, f)), c: P3 = [a[0] + ab[0] * f, a[1] + ab[1] * f, a[2] + ab[2] * f];
    const ax = unit([t.axes[k][0] + (t.axes[k + 1][0] - t.axes[k][0]) * fc, t.axes[k][1] + (t.axes[k + 1][1] - t.axes[k][1]) * fc, t.axes[k][2] + (t.axes[k + 1][2] - t.axes[k][2]) * fc]);
    const v = sub(p, c), al = ended ? 0 : dot(v, ax), r: P3 = [v[0] - ax[0] * al, v[1] - ax[1] * al, v[2] - ax[2] * al], d = Math.hypot(r[0], r[1], r[2]);
    const front = unit(cross(t.across, ax)), in0 = wallAt(t, k, fc, Math.atan2(dot(r, t.across), dot(r, front))) - d;
    if (in0 > depth) { depth = in0; way = ax; }
  }
  return { depth: Number.isFinite(depth) ? depth : 0, way };
}

const lengths = new WeakMap<SleeveTube, Float64Array>();
/** How far up the tube each of its rows is from its first, along its middle line (metres; worked out once a tube). */
function rowsAlong(t: SleeveTube): Float64Array {
  let l = lengths.get(t);
  if (!l) { l = new Float64Array(t.rows); for (let k = 1; k < t.rows; k++) l[k] = l[k - 1] + Math.hypot(t.centres[k][0] - t.centres[k - 1][0], t.centres[k][1] - t.centres[k - 1][1], t.centres[k][2] - t.centres[k - 1][2]); lengths.set(t, l); }
  return l;
}
/**
 * A point in the tube's own terms, into `out`: how far up the tube from its first row it lies (metres along its middle
 * line; under 0: beyond its first row, toward her opening's mouth -- her doors' room), how far from its middle line, where
 * round it (radians, from its front toward `across`), and how far out its wall is there (her doors, in their room). By
 * the place on its middle line nearest the point.
 */
function tubeAt(t: SleeveTube, x: number, y: number, z: number, out: Float64Array): void {
  const C = t.flat.c, A = t.flat.a, X = t.across, rows = t.rows, L = rowsAlong(t);
  // the piece of its middle line nearest the point, and how far along that piece
  let best = Infinity, bk = 0, bf = 0;
  for (let k = 0; k + 1 < rows; k++) {
    const i = k * 3, ax0 = C[i], ay0 = C[i + 1], az0 = C[i + 2], bx = C[i + 3] - ax0, by = C[i + 4] - ay0, bz = C[i + 5] - az0, l2 = bx * bx + by * by + bz * bz || 1e-12;
    let f = ((x - ax0) * bx + (y - ay0) * by + (z - az0) * bz) / l2;
    // (beyond its first row: on along its first piece, as far as her doors' room goes; beyond its last: its last row)
    f = k === 0 ? Math.max(-SEAT_SKIN.before / Math.sqrt(l2), f) : Math.max(0, f);
    if (f > 1) f = 1;
    const vx = x - (ax0 + bx * f), vy = y - (ay0 + by * f), vz = z - (az0 + bz * f), whole = vx * vx + vy * vy + vz * vz;
    if (whole < best) { best = whole; bk = k; bf = f; }
  }
  const i = bk * 3, bx = C[i + 3] - C[i], by = C[i + 4] - C[i + 1], bz = C[i + 5] - C[i + 2], l = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-6, fc = bf < 0 ? 0 : bf;
  let ux = A[i] + (A[i + 3] - A[i]) * fc, uy = A[i + 1] + (A[i + 4] - A[i + 1]) * fc, uz = A[i + 2] + (A[i + 5] - A[i + 2]) * fc;
  const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1; ux /= ul; uy /= ul; uz /= ul;
  const vx = x - (C[i] + bx * bf), vy = y - (C[i + 1] + by * bf), vz = z - (C[i + 2] + bz * bf), al = vx * ux + vy * uy + vz * uz, rx = vx - ux * al, ry = vy - uy * al, rz = vz - uz * al;
  let fx = X[1] * uz - X[2] * uy, fy = X[2] * ux - X[0] * uz, fz = X[0] * uy - X[1] * ux;
  const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  const angle = Math.atan2(rx * X[0] + ry * X[1] + rz * X[2], rx * fx + ry * fy + rz * fz);
  out[0] = bf < 0 ? bf * l : L[bk] + bf * l; out[1] = Math.sqrt(rx * rx + ry * ry + rz * rz); out[2] = angle;
  out[3] = bf < 0 ? doorWallAt(t, -bf * l, angle) : wallAt(t, bk, fc, angle);
}
/** The point of the tube's wall `up` metres up it from its first row (under 0: of her doors' room beyond it) at a place
 * round it, stood `off` metres out from it: into `out`. */
function wallPoint(t: SleeveTube, up: number, angle: number, off: number, out: Float64Array): void {
  const C = t.flat.c, A = t.flat.a, X = t.across, L = rowsAlong(t), rows = t.rows;
  let k = 0;
  while (k < rows - 2 && L[k + 1] < up) k++;
  const i = k * 3, l = L[k + 1] - L[k] || 1e-9, f = Math.min(1, (up - L[k]) / l), fc = f < 0 ? 0 : f;
  let ux = A[i] + (A[i + 3] - A[i]) * fc, uy = A[i + 1] + (A[i + 4] - A[i + 1]) * fc, uz = A[i + 2] + (A[i + 5] - A[i + 2]) * fc;
  const ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1; ux /= ul; uy /= ul; uz /= ul;
  let fx = X[1] * uz - X[2] * uy, fy = X[2] * ux - X[0] * uz, fz = X[0] * uy - X[1] * ux;
  const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  const r = (f < 0 ? doorWallAt(t, -f * l, angle) : wallAt(t, k, fc, angle)) + off, cs = Math.cos(angle), sn = Math.sin(angle);
  for (let e = 0; e < 3; e++) out[e] = C[i + e] + (C[i + 3 + e] - C[i + e]) * f + ((e === 0 ? fx : e === 1 ? fy : fz) * cs + X[e] * sn) * r;
}

/** Her skin round her opening, as a grid: `rings` rings (the first its rim, the last her own skin at the area's edge) by
 * `cols` columns out from it; each one's place as her skin lies; how far out its column each is (`tau`: 0 its rim, 1 the
 * area's edge); and the place round her opening each column's rim point is to go to (radians: 0 her front, toward
 * `across`). */
export interface SkinGrid {
  readonly rings: number;
  readonly cols: number;
  readonly at: ArrayLike<number>;
  readonly tau: ArrayLike<number>;
  readonly angle: ArrayLike<number>;
}

/**
 * How far each point of her skin's grid goes (rings x cols x 3, metres) -- `share` of it (0 her skin as it lies, 1 all of
 * it, evenly between).
 *
 * AS A SOCK ON THE TUBE. Each column of her skin runs from her opening's rim out to the area's edge; as it lies, its
 * inner part is inside the tube (her canal has come down through it) and the rest outside. Its rim goes to her doors'
 * feet, at the column's place round them, and its inner part -- every ring of it out to the last that lies inside the
 * tube -- is laid ALONG THE TUBE'S WALL from there up to where that last ring is, each as far along as it was along her
 * skin; the rest of the column stays her skin as it lies. (It was the rim's move handed down each column, less and less,
 * and then put out of the tube: rings went out of it every which way and lay over one another, a ragged collar round her
 * doors -- 2026-11-10.) Then, `SEAT_SKIN.passes` times, its move is evened with its neighbours' (its rim and its edge
 * held) and whatever that draws into the tube put out to stand off its wall (`tubeOut`) -- so the corner where it leaves
 * the tube for her skin is drawn taut, one skin with no step -- and put out of the tube again, last.
 */
export function laySeatSkin(grid: SkinGrid, tube: SleeveTube, share: number): Float32Array {
  const { rings: K, cols: M } = grid, D = new Float32Array(K * M * 3), s = Math.min(1, Math.max(0, share));
  if (!(s > 0) || K < 2) return D;
  // (how far out each column is worked at all: to its last ring inside the tube and as many rings on as it is evened
  // times -- beyond that her skin lies as it did and nothing reaches it)
  const reach = new Int32Array(M);
  { const tc = new Float64Array(4), w = new Float64Array(3), along = new Float64Array(K);
    for (let j = 0; j < M; j++) {
      const to = footAt(tube, grid.angle[j]);
      for (let c = 0; c < 3; c++) D[j * 3 + c] = to[c] - grid.at[j * 3 + c];
      // the last of its rings inside the tube, where it is in the tube's terms, and how far along her skin each ring is
      let last = 0, up = 0, round = 0;
      along[0] = 0;
      for (let k = 1; k < K; k++) {
        const i = (k * M + j) * 3, h = ((k - 1) * M + j) * 3;
        along[k] = along[k - 1] + Math.hypot(grid.at[i] - grid.at[h], grid.at[i + 1] - grid.at[h + 1], grid.at[i + 2] - grid.at[h + 2]);
        tubeAt(tube, grid.at[i], grid.at[i + 1], grid.at[i + 2], tc);
        if (tc[1] < tc[3] + SEAT_SKIN.standOff) { last = k; up = tc[0]; round = tc[2]; }
      }
      reach[j] = last;
      if (!last || !(along[last] > 0)) continue;
      // (round the tube the short way from its place at her doors' feet to where that ring is)
      const a0 = grid.angle[j]; let turn = round - a0; turn -= Math.round(turn / TAU) * TAU;
      // (its edge is her own skin and is not laid here: it is put out of the tube below as the rest is, where it lies in it)
      for (let k = 1; k <= Math.min(last, K - 2); k++) {
        const u = along[k] / along[last], i = (k * M + j) * 3;
        wallPoint(tube, up * u, a0 + turn * u, SEAT_SKIN.standOff, w);
        for (let c = 0; c < 3; c++) D[i + c] = w[c] - grid.at[i + c];
      }
    }
    // (a column is evened with its neighbours either side as well: it is worked as far out as the furthest of them)
    const own = Int32Array.from(reach), spread = SEAT_SKIN.passes + 2;
    for (let j = 0; j < M; j++) { let m = 0; for (let d = -spread; d <= spread; d++) m = Math.max(m, own[(j + d + M) % M]); reach[j] = Math.min(K - 1, m + spread); } }
  const out = () => {
    // (its rim is her doors' feet, on the tube's wall: it stays. The area's edge is her own skin and stays -- but where
    // the tube comes out through her skin beyond the area, the edge there lies inside the tube: it goes out to its own
    // side of the tube's wall as the rest does, which is where her skin beyond it meets the tube)
    for (let j = 0; j < M; j++) for (let k = 1; k <= reach[j]; k++) {
      const i = (k * M + j) * 3;
      if (pushOut(tube, grid.at[i] + D[i], grid.at[i + 1] + D[i + 1], grid.at[i + 2] + D[i + 2], SEAT_SKIN.standOff, grid.angle[j], pushed)) { D[i] += pushed[0]; D[i + 1] += pushed[1]; D[i + 2] += pushed[2]; }
    }
  };
  const next = new Float32Array(D.length), w = SEAT_SKIN.even;
  for (let pass = 0; pass < SEAT_SKIN.passes; pass++) {
    out();
    next.set(D);
    for (let j = 0; j < M; j++) for (let k = 1; k <= Math.min(reach[j], K - 2); k++) {
      const i = (k * M + j) * 3, l = (k * M + ((j + M - 1) % M)) * 3, r = (k * M + ((j + 1) % M)) * 3, u = ((k - 1) * M + j) * 3, d = ((k + 1) * M + j) * 3;
      for (let c = 0; c < 3; c++) next[i + c] = D[i + c] * (1 - w) + ((D[l + c] + D[r + c] + D[u + c] + D[d + c]) / 4) * w;
    }
    D.set(next);
  }
  // (out of one piece of a tube that turns may be into the next: until it is out of all of it)
  for (let k = 0; k < 4; k++) out();
  // WHERE THE TUBE COMES OUT THROUGH HER SKIN BEYOND THE AREA, the area's edge lies inside the tube's own foot print and
  // has gone out to the tube's wall where it was -- level with her skin there as the area has it, while her skin beyond
  // (the cleft behind her) is further up the tube, and the tube showed bare between the two. Those columns' outer halves
  // are drawn on up the tube's wall, toward her womb, `tuck` at their edge: in under her skin beyond, which hides their
  // end. How much, by how deep in the tube the column's edge lay, evened round her opening.
  { const tuck = new Float32Array(M), way = new Float32Array(M * 3);
    for (let j = 0; j < M; j++) {
      const e = ((K - 1) * M + j) * 3, q = tubeDepth(tube, grid.at[e], grid.at[e + 1], grid.at[e + 2]), u = Math.min(1, Math.max(0, q.depth / SEAT_SKIN.tuckDeep));
      tuck[j] = SEAT_SKIN.tuck * u * u * (3 - 2 * u); way[j * 3] = q.way[0]; way[j * 3 + 1] = q.way[1]; way[j * 3 + 2] = q.way[2];
    }
    // (evened round her opening -- but only ever among the columns whose own edge is in the tube: one whose edge is
    // clear of it stays her own skin's there, to the last point, or its edge stands off her as a flap)
    const own = Float32Array.from(tuck), ev = new Float32Array(M), W = Math.max(1, Math.round(M / 40));
    for (let pass = 0; pass < 2; pass++) { for (let j = 0; j < M; j++) { let a = 0; for (let d = -W; d <= W; d++) a += tuck[(j + d + M) % M]; ev[j] = a / (2 * W + 1); } tuck.set(ev); }
    for (let j = 0; j < M; j++) tuck[j] = Math.min(tuck[j], own[j]);
    let any = false;
    for (let j = 0; j < M; j++) {
      if (!(tuck[j] > 1e-5)) continue;
      any = true;
      for (let k = 1; k < K; k++) {
        const g = Math.min(1, Math.max(0, (grid.tau[k * M + j] - SEAT_SKIN.tuckFrom) / (1 - SEAT_SKIN.tuckFrom))), w = tuck[j] * g * g * (3 - 2 * g), i = (k * M + j) * 3;
        D[i] += way[j * 3] * w; D[i + 1] += way[j * 3 + 1] * w; D[i + 2] += way[j * 3 + 2] * w;
      }
    }
    if (any) for (let k = 0; k < 4; k++) out(); }
  // (and `share` of all that: from her skin as it lies, evenly, to all of it)
  if (s < 1) for (let i = 0; i < D.length; i++) D[i] *= s;
  return D;
}

/**
 * HER SKIN BEYOND THE AREA, CARRIED OUT WITH IT (Joshua, 2026-11-10, drawing her skin on a cut through her middle -- one
 * slope from her tailbone down to the back edge of her opening: "the green is the skin").
 *
 * Her canal's back wall comes down past her tailbone and out through her skin BEHIND the area that is rebuilt to open
 * (the cleft behind her perineum), and the area's own skin ended there at a step: under it her own skin lay as it was,
 * across the tube. So her own skin there goes out too: what the tube stands through is put out to stand off its wall,
 * and the skin round that is drawn after it, less and less, to nothing where it is held -- by her tailbone, and all
 * round the piece of her that is taken. A skin held at its edge and lifted in its middle lies taut between the two: from
 * her tailbone it runs straight down to the tube's wall, and on over it to her doors.
 *
 * `SkinBeyond`: that piece of her skin as points (a seam's vertices one point) -- each one's neighbours along her
 * triangles' edges (`to[from[k] .. from[k + 1]]` are point k's) and whether it is held (1: its edge).
 */
export interface SkinBeyond { readonly count: number; readonly from: Uint32Array; readonly to: Uint32Array; readonly held: Uint8Array }

/** GAME TUNING: how many times what the tube holds out is put off it and evened with its neighbours, how much it is
 * evened each time (0..1); and how many times the rest is drawn after it (each point to the mean of its neighbours'
 * moves, `over` of the way and past it -- successive over-relaxation, which settles a skin this size in that many -- or
 * until no point moves `still` metres in a round). */
export const BEYOND_SKIN = Object.freeze({ passes: 6, even: 0.5, settle: 140, over: 1.6, still: 1e-5 });

/**
 * How far each point of that skin goes (count x 3, metres), `share` of it: `at` where each lies now (count x 3, the
 * tube's own frame), `side` the place round the tube each is at (radians, as her doors' feet are told: where a point deep
 * in the tube goes out to).
 */
export function layBeyond(mesh: SkinBeyond, at: ArrayLike<number>, side: ArrayLike<number>, tube: SleeveTube, share: number): Float32Array {
  const n = mesh.count, D = new Float32Array(n * 3), s = Math.min(1, Math.max(0, share)), B = BEYOND_SKIN;
  if (!(s > 0) || n === 0) return D;
  const { from, to, held } = mesh, onTube = new Uint8Array(n);
  const out = () => {
    for (let v = 0; v < n; v++) {
      if (held[v]) continue;
      const i = v * 3;
      if (pushOut(tube, at[i] + D[i], at[i + 1] + D[i + 1], at[i + 2] + D[i + 2], SEAT_SKIN.standOff, side[v], pushed)) { D[i] += pushed[0]; D[i + 1] += pushed[1]; D[i + 2] += pushed[2]; onTube[v] = 1; }
    }
  };
  const next = new Float32Array(D.length);
  for (let pass = 0; pass < B.passes; pass++) {
    out();
    next.set(D);
    for (let v = 0; v < n; v++) {
      const a = from[v], b = from[v + 1];
      if (held[v] || b === a) continue;
      for (let c = 0; c < 3; c++) { let m = 0; for (let k = a; k < b; k++) m += D[to[k] * 3 + c]; next[v * 3 + c] = D[v * 3 + c] * (1 - B.even) + (m / (b - a)) * B.even; }
    }
    D.set(next);
  }
  for (let k = 0; k < 3; k++) out();
  // the skin round what the tube holds: drawn after it, taut -- each point where its neighbours' moves put it
  let any = false;
  for (let v = 0; v < n && !any; v++) any = onTube[v] === 1;
  if (any) for (let sweep = 0; sweep < B.settle; sweep++) {
    let most = 0;
    for (let v = 0; v < n; v++) {
      const a = from[v], b = from[v + 1];
      if (held[v] || onTube[v] || b === a) continue;
      for (let c = 0; c < 3; c++) { let m = 0; for (let k = a; k < b; k++) m += D[to[k] * 3 + c]; const step = B.over * (m / (b - a) - D[v * 3 + c]); D[v * 3 + c] += step; if (step > most) most = step; else if (-step > most) most = -step; }
    }
    // (settled: no point moved a hundredth of a millimetre)
    if (most < B.still) break;
  }
  else D.fill(0);
  // (and off the tube, where that drew any of it in)
  for (let k = 0; k < 3; k++) out();
  if (s < 1) for (let i = 0; i < D.length; i++) D[i] *= s;
  return D;
}
