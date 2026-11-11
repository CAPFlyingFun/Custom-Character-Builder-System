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
 * apart, and her skin lay in and out of them along a ragged line). `fine`: into how many each stretch of the tube between
 * two of the sleeve's rows is cut (see `sleeveTube`); `sockEven`: how many times her skin's places on the tube's wall are
 * evened with their neighbours' (see `laySeatSkin`).
 */
export const SEAT_SKIN = Object.freeze({ standOff: 0.0015, before: 0.05, passes: 10, even: 0.5, round: 72, ownSide: [0.35, 0.85] as readonly [number, number], tuck: 0.05, tuckDeep: 0.01, tuckFrom: 0.45, doorSlabs: 10, doorOff: 0.004, fine: 3, sockEven: 30 });

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
  const coarse = Math.floor(points.length / 3 / cols);
  if (!(cols >= 3) || coarse < 2) return null;
  return fineTube(coarseTube(points, cols, coarse, across), across, doorPoints);
}

/** The sleeve's own rows read: each one's middle, and how far out its wall is at each place round it. */
function coarseTube(points: ArrayLike<number>, cols: number, rows: number, across: P3): { rows: number; centres: P3[]; radius: Float32Array; foot: P3[]; footAngle: number[] } {
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
  return { rows, centres, radius, foot, footAngle };
}

/**
 * THE TUBE HER SKIN LIES ON IS FINER THAN THE SLEEVE THAT IS DRAWN (2026-11-11). The sleeve has nine rows, a centimetre
 * apart, and her canal turns some 37 degrees within the first four of them: a tube of straight pieces between those rows
 * has a corner of five to ten degrees at each, and her skin, laid on it and lit as it lies, showed them -- rings round
 * the mound under her, light and dark, once her skin there was lit the right way out. So each stretch between two rows
 * is cut in `SEAT_SKIN.fine`: the middles on a smooth curve through the rows' own (Catmull-Rom), the wall's size
 * between the two rows' evenly. The sleeve as drawn lies within a fifth of a millimetre of it, under her skin.
 */
function fineTube(T: { rows: number; centres: P3[]; radius: Float32Array; foot: P3[]; footAngle: number[] }, across: P3, doorPoints?: ArrayLike<number>): SleeveTube {
  const N = SEAT_SKIN.round, F = Math.max(1, Math.round(SEAT_SKIN.fine)), R0 = T.rows, rows = (R0 - 1) * F + 1, cols = T.foot.length, foot = T.foot, footAngle = T.footAngle;
  const cm = (k: number): P3 => (k < 0 ? [2 * T.centres[0][0] - T.centres[1][0], 2 * T.centres[0][1] - T.centres[1][1], 2 * T.centres[0][2] - T.centres[1][2]] : k >= R0 ? [2 * T.centres[R0 - 1][0] - T.centres[R0 - 2][0], 2 * T.centres[R0 - 1][1] - T.centres[R0 - 2][1], 2 * T.centres[R0 - 1][2] - T.centres[R0 - 2][2]] : T.centres[k]);
  const centres: P3[] = [], radius = new Float32Array(rows * N);
  for (let q = 0; q < rows; q++) {
    const k = Math.min(R0 - 2, Math.floor(q / F)), f = q / F - k, p0 = cm(k - 1), p1 = cm(k), p2 = cm(k + 1), p3 = cm(k + 2), f2 = f * f, f3 = f2 * f;
    centres.push([0, 1, 2].map((e) => 0.5 * (2 * p1[e] + (p2[e] - p0[e]) * f + (2 * p0[e] - 5 * p1[e] + 4 * p2[e] - p3[e]) * f2 + (3 * p1[e] - p0[e] - 3 * p2[e] + p3[e]) * f3)) as unknown as P3);
    for (let b = 0; b < N; b++) radius[q * N + b] = T.radius[k * N + b] + (T.radius[(k + 1) * N + b] - T.radius[k * N + b]) * f;
  }
  const axes: P3[] = [], fronts: P3[] = [];
  for (let k = 0; k < rows; k++) {
    const a = unit(sub(centres[Math.min(rows - 1, k + 1)], centres[Math.max(0, k - 1)]));
    const d = dot(a, across), ax = unit([a[0] - across[0] * d, a[1] - across[1] * d, a[2] - across[2] * d]);
    axes.push(ax); fronts.push(unit(cross(across, ax)));
  }
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
const placed = new Float64Array(4);
/** A point in the tube's own terms (a probe's reading): [metres up it from its first row, metres out from its middle
 * line, its place round it (radians), how far out the tube's wall is there]. */
export function tubePlace(t: SleeveTube, x: number, y: number, z: number): [number, number, number, number] { tubeAt(t, x, y, z, placed); return [placed[0], placed[1], placed[2], placed[3]]; }
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
 * tube -- is laid ALONG THE TUBE'S WALL from there up to where the first ring past it stands, each as far along as it
 * was along her skin, and each one's place on the wall evened with its neighbours' all round; the rest of the column
 * stays her skin as it lies. (It was the rim's move handed down each column, less and less,
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
    // each of its points' own place in the tube's terms (how far up it, where round it), and the sock's: the points laid
    // on its wall, each one's place there
    const upO = new Float32Array(K * M), anO = new Float32Array(K * M), UP = new Float32Array(K * M), AN = new Float32Array(K * M), sock = new Uint8Array(K * M), lastOf = new Int32Array(M);
    for (let j = 0; j < M; j++) {
      const to = footAt(tube, grid.angle[j]);
      for (let c = 0; c < 3; c++) D[j * 3 + c] = to[c] - grid.at[j * 3 + c];
      // the last of its rings inside the tube, and how far along her skin each ring is
      let last = 0;
      along[0] = 0;
      for (let k = 1; k < K; k++) {
        const i = (k * M + j) * 3, h = ((k - 1) * M + j) * 3;
        along[k] = along[k - 1] + Math.hypot(grid.at[i] - grid.at[h], grid.at[i + 1] - grid.at[h + 1], grid.at[i + 2] - grid.at[h + 2]);
        tubeAt(tube, grid.at[i], grid.at[i + 1], grid.at[i + 2], tc);
        upO[k * M + j] = tc[0]; anO[k * M + j] = tc[2];
        // (INSIDE it: not standing on its wall. Her own skin at the area's edge has been put out to the wall already
        // -- it stands off it by exactly as much -- and by a hair's rounding one column's edge read as inside and its
        // neighbour's as out: half a millimetre is taken off)
        if (tc[1] < tc[3] + SEAT_SKIN.standOff - 0.0005) last = k;
      }
      lastOf[j] = last; reach[j] = last;
      // WHERE THE SOCK ENDS: the first of the column's rings past the last inside the tube -- on the tube's wall or out
      // beyond it, its own place -- and the sock runs from her doors' feet to there, each ring as far along as it was
      // along her skin. (It ran to where the last ring INSIDE the tube lay, taken out to the wall -- and a ring deep in
      // the tube, near its middle line, is anywhere round it: one column's sock ended a quarter of the way round from
      // its neighbour's, and her skin on the mound lay in crossed folds, 2026-11-11.)
      const land = Math.min(K - 1, last + 1);
      if (!last || !(along[land] > 0)) continue;
      const a0 = grid.angle[j]; let turn = anO[land * M + j] - a0; turn -= Math.round(turn / TAU) * TAU;
      // (its edge is her own skin and is not laid here: it is put out of the tube below as the rest is, where it lies in it)
      for (let k = 1; k <= Math.min(last, K - 2); k++) { const u = along[k] / along[land], q = k * M + j; UP[q] = upO[land * M + j] * u; AN[q] = a0 + turn * u; sock[q] = 1; }
    }
    // ONE SKIN ON THE WALL: each of the sock's points' place on it evened with its four neighbours' -- along its column
    // and across to the columns either side, her doors' feet and whatever is not the sock's staying where they are --
    // `sockEven` times: no column crosses the next, and none is gathered where the next is stretched.
    for (let pass = 0; pass < SEAT_SKIN.sockEven; pass++) for (let j = 0; j < M; j++) for (let k = 1; k <= Math.min(lastOf[j], K - 2); k++) {
      const q = k * M + j;
      if (!sock[q]) continue;
      let su = 0, sa = 0;
      for (const [k2, j2] of [[k - 1, j], [k + 1, j], [k, (j + M - 1) % M], [k, (j + 1) % M]]) {
        const n = k2 * M + j2, u2 = k2 === 0 ? 0 : sock[n] ? UP[n] : upO[n];
        let a2 = (k2 === 0 ? grid.angle[j2] : sock[n] ? AN[n] : anO[n]) - AN[q]; a2 -= Math.round(a2 / TAU) * TAU;
        su += u2; sa += a2;
      }
      UP[q] = su / 4; AN[q] += sa / 4;
    }
    for (let q = M; q < K * M; q++) {
      if (!sock[q]) continue;
      wallPoint(tube, UP[q], AN[q], SEAT_SKIN.standOff, w);
      for (let c = 0; c < 3; c++) D[q * 3 + c] = w[c] - grid.at[q * 3 + c];
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

/**
 * THE MOUND ROUNDED INTO HER (Joshua, 2026-11-11, drawing lines over it that flare out from her doors' feet onto her
 * body: "add a more rounded shape upwards towards it so it looks better and not like a cylinder").
 *
 * Laid, her skin runs up the tube's wall from her doors' feet and, where the tube comes through her, out along her own
 * skin: a corner all round behind her opening -- a collar standing off her (lying back, 3 to 4.5 cm of it: MEASURED on
 * her laid skin in the tube's terms). A corner is rounded by taking the two straight runs that meet in it for the legs
 * of one curve: from her doors' feet, toward a point a little way out along her own skin (`lean` of the curve's reach
 * past the corner), to her own skin `reach` past the corner -- a curve that leaves her doors' feet leaning out from the
 * wall and comes down onto her own skin lying along it (a conic: both ends true). Every point of her skin near the two
 * runs moves to the curve by how far along them it is; past the curve's end nothing moves.
 *
 * It is a warp of the PLACE, not of a mesh: the area's own skin and her body's go by the same rule, so where the two
 * meet they still meet, and it knows nothing of her bones: where her skin leaves the wall at her doors' feet (in front
 * of her, lying back) there is no corner and nothing is rounded; where her skin runs up nearly along the tube (her
 * back) the two runs are nearly one line and the curve is nearly that line.
 *
 * `SeatRound`, at each of `SEAT_SKIN.round` places round the tube: how far up the wall the corner is (`rise`, metres),
 * which way her skin runs from it in the plane through the tube's line (`out` from the wall, `up` the tube: a unit
 * way), how far along it the curve comes down (`reach`, metres) and how much of the rounding the place takes (`share`).
 */
export interface SeatRound { readonly rise: Float32Array; readonly out: Float32Array; readonly up: Float32Array; readonly reach: Float32Array; readonly share: Float32Array }

/**
 * GAME TUNING: how far past the corner the curve comes down, of the corner's height (`reach`), at most (`most`, metres)
 * and no nearer her skin's held edge than `hold` of the way to it; a corner lower than `least` is not rounded (all of it
 * from twice that); how far out along her skin the curve's middle leg points (`lean`, of its reach: 0 leaves her doors'
 * feet straight up the wall); how near the two runs a point must be to go with them (all of it within `near`, none
 * past `far`, metres); her skin just off the wall is read between `fit[0]` and `near` out from it for the corner's
 * height, and out to `fit[1]` for the way it runs; and over how many places either side all of it is evened round her.
 */
export const SEAT_ROUND = Object.freeze({ reach: 1.5, most: 0.07, hold: 0.85, least: 0.006, lean: 0.35, near: 0.012, far: 0.03, fit: [0.004, 0.035] as readonly [number, number], even: 3 });

const smoothTo = (a: number, b: number, v: number): number => { const u = Math.min(1, Math.max(0, (v - a) / (b - a))); return u * u * (3 - 2 * u); };

/**
 * The corner all round, read off her skin as it is laid (`laid`: x, y, z a point, the tube's own frame -- her body's
 * skin and the area's together); `held` marks the points that cannot move (her skin's edge: the curve comes down
 * short of the nearest of them at each place).
 */
export function roundOf(t: SleeveTube, laid: ArrayLike<number>, held?: ArrayLike<number>): SeatRound {
  const N = SEAT_SKIN.round, R = SEAT_ROUND, n = Math.floor(laid.length / 3), top = rowsAlong(t)[t.rows - 1], tc = new Float64Array(4);
  const up = new Float32Array(n), rho = new Float32Array(n), bin = new Int32Array(n).fill(-1);
  // her skin beyond the wall at each place, in bands 4 mm wide out from it: each band's points' heights up the tube
  const BANDS = Math.max(3, Math.round((R.fit[1] - R.fit[0]) / 0.004)), wide = (R.fit[1] - R.fit[0]) / BANDS, bands: number[][] = Array.from({ length: N * BANDS }, () => []);
  for (let i = 0; i < n; i++) {
    tubeAt(t, laid[i * 3], laid[i * 3 + 1], laid[i * 3 + 2], tc);
    // (her doors' room below the tube's first row, and what lies past its last, are not the tube's wall)
    if (!(tc[0] > -0.002) || tc[0] > top - 0.002) continue;
    up[i] = tc[0]; rho[i] = tc[1] - tc[3] - SEAT_SKIN.standOff; bin[i] = Math.round((wrap(tc[2]) / TAU) * N) % N;
    const q = Math.floor((rho[i] - R.fit[0]) / wide);
    if (q >= 0 && q < BANDS) bands[bin[i] * BANDS + q].push(tc[0]);
  }
  // THE CORNER at each place: her skin's own line there -- through the LOWEST of it in each band (what is seen of her
  // from her doors' side: other skin may lie further up the tube behind it), a straight line fitted to them -- and
  // where that line meets the wall. (The lowest of her skin just off the wall is not it: where her skin runs on up
  // steeply, that is already well up it.) Her skin's points are few where it is stretched: each place reads its own
  // and its two neighbours', 15 degrees of her.
  const rise = new Float32Array(N), out = new Float32Array(N).fill(1), upW = new Float32Array(N), reach = new Float32Array(N), share = new Float32Array(N), room = new Float32Array(N).fill(Infinity);
  for (let b = 0; b < N; b++) {
    let sn = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let q = 0; q < BANDS; q++) {
      const L = [...bands[((b + N - 1) % N) * BANDS + q], ...bands[b * BANDS + q], ...bands[((b + 1) % N) * BANDS + q]];
      if (!L.length) continue;
      L.sort((x, y) => x - y);
      const x = R.fit[0] + (q + 0.5) * wide, y = L[Math.floor(L.length * 0.15)];
      sn++; sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    const den = sn * sxx - sx * sx;
    if (sn < 3 || !(den > 1e-12)) continue;
    const slope = (sn * sxy - sx * sy) / den, at0 = (sy - slope * sx) / sn;
    // (never steeper up the tube than 80 degrees, nor down it than 30)
    const a = Math.min(1.4, Math.max(-0.52, Math.atan(slope)));
    rise[b] = Math.max(0, at0); out[b] = Math.cos(a); upW[b] = Math.sin(a);
  }
  if (held) for (let i = 0; i < n; i++) { const b = bin[i]; if (b < 0 || !held[i] || !(rise[b] > 0)) continue; const s = rho[i] * out[b] + (up[i] - rise[b]) * upW[b]; if (s > 0 && s < room[b]) room[b] = s; }
  for (let b = 0; b < N; b++) {
    reach[b] = Math.max(0, Math.min(R.reach * rise[b], R.most, R.hold * room[b]));
    // (and never past the tube's own end: beyond it there is no wall to tell a place by)
    if (upW[b] > 0.05) reach[b] = Math.max(0, Math.min(reach[b], (top - 0.004 - rise[b]) / upW[b]));
    share[b] = smoothTo(R.least, 2 * R.least, rise[b]) * smoothTo(0, R.least, reach[b]);
  }
  // evened round her, so the rounding does not step from place to place (its reach first no further than its neighbours')
  const E = R.even, ev = (A: Float32Array) => { const B = new Float32Array(N); for (let b = 0; b < N; b++) { let m = 0; for (let d = -E; d <= E; d++) m += A[(b + d + N) % N]; B[b] = m / (2 * E + 1); } A.set(B); };
  { const least = Float32Array.from(reach); for (let b = 0; b < N; b++) reach[b] = Math.min(least[(b + N - 1) % N], least[b], least[(b + 1) % N]); }
  // (a place with no corner has no height or way of its own to even in: it takes its neighbours' as they are evened)
  { const w = Float32Array.from(share), ax = new Float32Array(N), ay = new Float32Array(N), ar = new Float32Array(N), al = new Float32Array(N), aw = new Float32Array(N);
    for (let b = 0; b < N; b++) for (let d = -E; d <= E; d++) { const q = (b + d + N) % N; ax[b] += out[q] * w[q]; ay[b] += upW[q] * w[q]; ar[b] += rise[q] * w[q]; al[b] += reach[q] * w[q]; aw[b] += w[q]; }
    for (let b = 0; b < N; b++) { if (!(aw[b] > 1e-6)) { rise[b] = 0; reach[b] = 0; out[b] = 1; upW[b] = 0; continue; } const l = Math.hypot(ax[b], ay[b]) || 1; out[b] = ax[b] / l; upW[b] = ay[b] / l; rise[b] = ar[b] / aw[b]; reach[b] = al[b] / aw[b]; } }
  ev(share);
  return { rise, out, up: upW, reach, share };
}

const rm = new Float64Array(4), rw0 = new Float64Array(3), rw1 = new Float64Array(3);
/** How far a point of her laid skin goes to be on the rounded corner (`roundOf`): into `out` (three numbers), whether it moves at all. */
/**
 * WHERE HER SKIN LEAVES THE TUBE, ALL ROUND (`roundOf`'s corner at each place: `rise` up the wall from its first row, as
 * sure as its `share`): the wall's point there, each place's in turn (x, y, z, metres; a place not read: the tube's first
 * row). Her doors' feet are raised to it (pelvicOrgansView.ts `setFootRise`): her skin then meets them where it is, with
 * no wall of her own skin between.
 */
export function riseRing(t: SleeveTube, r: SeatRound): Float32Array {
  const N = SEAT_SKIN.round, out = new Float32Array(N * 3), p = new Float64Array(3);
  for (let b = 0; b < N; b++) { wallPoint(t, r.rise[b] * Math.min(1, r.share[b]), (b / N) * TAU, 0, p); out[b * 3] = p[0]; out[b * 3 + 1] = p[1]; out[b * 3 + 2] = p[2]; }
  return out;
}

export function roundMove(t: SleeveTube, r: SeatRound, x: number, y: number, z: number, out: Float64Array): boolean {
  tubeAt(t, x, y, z, rm);
  const up = rm[0], rho = rm[1] - rm[3], ang = rm[2];
  if (!(up > 0) || up > rowsAlong(t)[t.rows - 1] - 0.002) return false;
  const N = SEAT_SKIN.round, R = SEAT_ROUND, b = (wrap(ang) / TAU) * N, b0 = Math.floor(b) % N, b1 = (b0 + 1) % N, g = b - Math.floor(b);
  const share = r.share[b0] + (r.share[b1] - r.share[b0]) * g;
  if (!(share > 1e-4)) return false;
  const H = r.rise[b0] + (r.rise[b1] - r.rise[b0]) * g, ell = r.reach[b0] + (r.reach[b1] - r.reach[b0]) * g;
  if (!(H > 1e-4) || !(ell > 1e-4)) return false;
  let dx = r.out[b0] + (r.out[b1] - r.out[b0]) * g, dy = r.up[b0] + (r.up[b1] - r.up[b0]) * g;
  const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  // where it is along the two runs -- up the wall, then out along her skin -- by the nearer run the more
  const q = Math.max(0, rho - SEAT_SKIN.standOff), aw = Math.min(up, H), nw = up <= H ? q : Math.hypot(q, up - H);
  const sb = Math.max(0, q * dx + (up - H) * dy), nb = Math.hypot(q - sb * dx, up - H - sb * dy);
  const ww = 1 / (nw + 1e-4), wb = 1 / (nb + 1e-4), a = (aw * ww + (H + sb) * wb) / (ww + wb), L = H + ell;
  if (!(a < L)) return false;
  const fade = 1 - smoothTo(R.near, R.far, Math.min(nw, nb));
  if (!(fade > 0)) return false;
  // the curve there (its legs: her doors' feet -> a point `lean` of its reach out along her skin -> her skin at its
  // reach), and the point of the two runs it stands for
  const f = a / L, u = 1 - f, bx = 2 * f * u * (R.lean * ell * dx) + f * f * (ell * dx), by = 2 * f * u * (H + R.lean * ell * dy) + f * f * (H + ell * dy);
  const px = a <= H ? 0 : (a - H) * dx, py = a <= H ? a : H + (a - H) * dy, k = share * fade;
  wallPoint(t, up, ang, rho, rw0); wallPoint(t, up + (by - py) * k, ang, rho + (bx - px) * k, rw1);
  out[0] = rw1[0] - rw0[0]; out[1] = rw1[1] - rw0[1]; out[2] = rw1[2] - rw0[2];
  return true;
}
