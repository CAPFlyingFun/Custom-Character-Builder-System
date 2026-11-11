import { describe, expect, it } from 'vitest';
import { SEAT_ROUND, SEAT_SKIN, footAt, layBeyond, laySeatSkin, roundMove, roundOf, sleeveTube, tubeOut, type SkinBeyond, type SkinGrid } from '../src/actor/skinSeat';

/** A sleeve round a canal that comes straight down (-y) from y = 0.10 to 0.04, then turns forward (+z) on a quarter of a
 * circle of 6 cm: `rows` rows of `cols` points, 5 cm round, its first row at its forward end (her doors' feet). */
function sleeve(rows = 9, cols = 24, r = 0.05): { points: Float32Array; cols: number; mid: (s: number) => [number, number, number] } {
  const R = 0.06, arc = (R * Math.PI) / 2, len = arc + 0.06;
  // (s: metres from her doors' feet up the canal)
  const mid = (s: number): [number, number, number] => {
    if (s <= arc) { const a = s / R; return [0, -0.02 + R * (1 - Math.cos(a)), 0.06 - R * Math.sin(a)]; }
    return [0, 0.04 + (s - arc), 0];
  };
  const way = (s: number): [number, number, number] => { if (s <= arc) { const a = s / R; return [0, Math.sin(a), -Math.cos(a)]; } return [0, 1, 0]; };
  const points = new Float32Array(rows * cols * 3);
  for (let k = 0; k < rows; k++) {
    const s = (k / (rows - 1)) * len, c = mid(s), t = way(s), front: [number, number, number] = [0, -t[2], t[1]];
    for (let j = 0; j < cols; j++) {
      const a = (j / cols) * Math.PI * 2, i = (k * cols + j) * 3;
      points[i] = c[0] + Math.sin(a) * r; points[i + 1] = c[1] + Math.cos(a) * r * front[1]; points[i + 2] = c[2] + Math.cos(a) * r * front[2];
    }
  }
  return { points, cols, mid };
}

describe('her skin stretched down to her doors (skinSeat)', () => {
  const S = sleeve(), tube = sleeveTube(S.points, S.cols)!;

  it('reads the tube from the sleeve: its middles, the way it runs, and its wall', () => {
    // (finer than the sleeve: each stretch between two of its nine rows cut in `fine`)
    const last = 8 * SEAT_SKIN.fine;
    expect(tube.rows).toBe(last + 1);
    // (its first row, at her doors' feet, runs back into her: -z; its last straight up)
    expect(tube.axes[0][2]).toBeLessThan(-0.9);
    expect(tube.axes[last][1]).toBeGreaterThan(0.99);
    for (let b = 0; b < SEAT_SKIN.round; b += 9) expect(tube.radius[4 * SEAT_SKIN.fine * SEAT_SKIN.round + b]).toBeCloseTo(0.05, 3);
    // and SMOOTHER: the worst corner between two of its pieces is less than half the worst between two of the sleeve's
    // own rows (this sleeve's rows are 2 cm apart round a 6 cm bend: 18 degrees at each)
    const worst = (P: readonly (readonly number[])[]) => { let m = 0; for (let k = 1; k + 1 < P.length; k++) { const u = [0, 1, 2].map((e) => P[k][e] - P[k - 1][e]), v = [0, 1, 2].map((e) => P[k + 1][e] - P[k][e]); m = Math.max(m, Math.acos(Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v))))); } return (m * 180) / Math.PI; };
    const own = worst(Array.from({ length: 9 }, (_, k) => S.mid((k / 8) * ((0.06 * Math.PI) / 2 + 0.06))));
    expect(own).toBeGreaterThan(15);
    expect(worst(tube.centres)).toBeLessThan(own / 2);
    // (her doors' feet at her front and at her left)
    const front = footAt(tube, 0), left = footAt(tube, Math.PI / 2);
    expect(front[1]).toBeGreaterThan(0.02); expect(Math.abs(front[0])).toBeLessThan(1e-3);
    expect(left[0]).toBeCloseTo(0.05, 3);
  });

  it('puts a point inside the tube out to stand off its wall, and leaves one outside it', () => {
    const c = S.mid(0.05), o = tubeOut(tube, c[0] + 0.02, c[1], c[2])!;
    expect(o).not.toBeNull();
    expect(o[0]).toBeCloseTo(0.03 + SEAT_SKIN.standOff, 3);
    expect(tubeOut(tube, c[0] + 0.06, c[1], c[2])).toBeNull();
    // (in her doors' room, just beyond their feet: kept out as well; far beyond it, and beyond the tube's top: left)
    expect(tubeOut(tube, 0.01, -0.02, 0.08)).not.toBeNull();
    expect(tubeOut(tube, 0.01, -0.02, 0.20)).toBeNull();
    expect(tubeOut(tube, 0.01, 0.20, 0)).toBeNull();
  });

  // her skin: flat at y = 0.045 (the tube's turn hangs below it), its opening a slit along z at z = 0.04..0.06, rings out 12 cm
  const grid = (): SkinGrid => {
    const K = 25, M = 32, at = new Float32Array(K * M * 3), tau = new Float32Array(K * M), angle = new Float32Array(M);
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2; angle[j] = a;
      for (let k = 0; k < K; k++) {
        const t = k / (K - 1), i = (k * M + j) * 3;
        at[i] = Math.sin(a) * 0.12 * t; at[i + 1] = 0.045; at[i + 2] = 0.05 + Math.cos(a) * (0.01 + 0.11 * t);
        tau[k * M + j] = t;
      }
    }
    return { rings: K, cols: M, at, tau, angle };
  };

  it('carries the rim of her skin to her doors\' feet and leaves her skin at the area\'s edge', () => {
    const g = grid(), D = laySeatSkin(g, tube, 1);
    for (let j = 0; j < g.cols; j++) {
      const to = footAt(tube, g.angle[j]);
      for (let c = 0; c < 3; c++) expect(g.at[j * 3 + c] + D[j * 3 + c]).toBeCloseTo(to[c], 6);
      const e = ((g.rings - 1) * g.cols + j) * 3;
      expect(Math.hypot(D[e], D[e + 1], D[e + 2])).toBe(0);
    }
  });

  it('lays none of her skin inside the tube', () => {
    const g = grid(), D = laySeatSkin(g, tube, 1);
    let moved = 0;
    for (let k = 1; k < g.rings - 1; k++) for (let j = 0; j < g.cols; j++) {
      const i = (k * g.cols + j) * 3;
      expect(tubeOut(tube, g.at[i] + D[i], g.at[i + 1] + D[i + 1], g.at[i + 2] + D[i + 2], 0)).toBeNull();
      if (Math.hypot(D[i], D[i + 1], D[i + 2]) > 0.005) moved++;
    }
    expect(moved).toBeGreaterThan(100);
  });

  it('is one smooth skin: no point goes far from its neighbours\' moves', () => {
    const g = grid(), D = laySeatSkin(g, tube, 1), M = g.cols;
    let worst = 0;
    for (let k = 2; k < g.rings - 2; k++) for (let j = 0; j < M; j++) {
      const i = (k * M + j) * 3, l = (k * M + ((j + M - 1) % M)) * 3, r = (k * M + ((j + 1) % M)) * 3, u = ((k - 1) * M + j) * 3, d = ((k + 1) * M + j) * 3;
      worst = Math.max(worst, Math.hypot(...[0, 1, 2].map((c) => D[i + c] - (D[l + c] + D[r + c] + D[u + c] + D[d + c]) / 4)));
    }
    expect(worst).toBeLessThan(0.012);
  });

  it('wraps the tube where the tube comes out through her skin beyond the area: no skin across her canal', () => {
    // (her skin's area ends 3 cm behind her split -- inside the tube's own foot print, which reaches 5 cm behind its
    // middle: her skin's edge there goes out to the tube's wall, and no column of it crosses the tube)
    const K = 25, M = 32, at = new Float32Array(K * M * 3), tau = new Float32Array(K * M), angle = new Float32Array(M);
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2; angle[j] = a;
      for (let k = 0; k < K; k++) {
        const t = k / (K - 1), i = (k * M + j) * 3, back = Math.cos(a) < 0 ? 0.03 : 0.11;
        at[i] = Math.sin(a) * 0.12 * t; at[i + 1] = 0.045; at[i + 2] = 0.03 + Math.cos(a) * (0.01 + back * t);
        tau[k * M + j] = t;
      }
    }
    const D = laySeatSkin({ rings: K, cols: M, at, tau, angle }, tube, 1), P = (k: number, j: number) => { const i = (k * M + j) * 3; return [at[i] + D[i], at[i + 1] + D[i + 1], at[i + 2] + D[i + 2]]; };
    for (let j = 0; j < M; j++) for (let k = 1; k < K; k++) {
      const a = P(k - 1, j), b = P(k, j);
      expect(tubeOut(tube, b[0], b[1], b[2], 0)).toBeNull();
      // (nor between two of its points: nowhere more than half a centimetre inside the wall)
      for (const f of [0.25, 0.5, 0.75]) expect(tubeOut(tube, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, -0.005)).toBeNull();
    }
    // (and that edge is drawn on up the tube's wall, in under her skin beyond it: behind her, some centimetres above
    // where it lay; in front of her, where the area's edge is clear of the tube, it stays her own skin's)
    expect(P(K - 1, M / 2)[1]).toBeGreaterThan(0.045 + 0.025);
    expect(Math.hypot(...[0, 1, 2].map((c) => D[((K - 1) * M) * 3 + c]))).toBeLessThan(1e-9);
  });

  it('goes there evenly as she opens: none of it shut, half of it half way', () => {
    const g = grid(), whole = laySeatSkin(g, tube, 1), half = laySeatSkin(g, tube, 0.5), none = laySeatSkin(g, tube, 0);
    expect(Math.max(...none)).toBe(0);
    for (let i = 0; i < whole.length; i += 37) expect(half[i]).toBeCloseTo(whole[i] / 2, 9);
  });

  // HER SKIN BEYOND THE AREA: a flat sheet at y = 0.045 behind the tube's turn (z from -0.02 back to -0.14), 9 cm either
  // side, its points 5 mm apart, joined along a square grid's edges; its rim of points held
  const sheet = (): { mesh: SkinBeyond; at: Float32Array; side: Float32Array; nx: number; nz: number } => {
    const nx = 37, nz = 25, N = nx * nz, at = new Float32Array(N * 3), side = new Float32Array(N), held = new Uint8Array(N), nb: number[][] = [];
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
      const v = k * nx + i; at[v * 3] = -0.09 + i * 0.005; at[v * 3 + 1] = 0.045; at[v * 3 + 2] = -0.02 - k * 0.005;
      side[v] = Math.atan2(at[v * 3] - tube.centres[0][0], at[v * 3 + 2] - tube.centres[0][2]);
      held[v] = i === 0 || k === 0 || i === nx - 1 || k === nz - 1 ? 1 : 0;
      nb.push([i > 0 ? v - 1 : -1, i < nx - 1 ? v + 1 : -1, k > 0 ? v - nx : -1, k < nz - 1 ? v + nx : -1].filter((o) => o >= 0));
    }
    const from = new Uint32Array(N + 1), to: number[] = [];
    nb.forEach((l, v) => { from[v] = to.length; to.push(...l); }); from[N] = to.length;
    return { mesh: { count: N, from, to: Uint32Array.from(to), held }, at, side, nx, nz };
  };

  it('her skin beyond the area: what the tube stands through goes out to its wall, the rest is drawn after it, its edge stays', () => {
    // (the tube comes straight down through y = 0.045 round x = z = 0, 5 cm round: the sheet's front strip lies across it)
    const S2 = sheet(), D = layBeyond(S2.mesh, S2.at, S2.side, tube, 1), at = (v: number) => [S2.at[v * 3] + D[v * 3], S2.at[v * 3 + 1] + D[v * 3 + 1], S2.at[v * 3 + 2] + D[v * 3 + 2]];
    let inside = 0, moved = 0, most = 0;
    for (let v = 0; v < S2.mesh.count; v++) {
      const far = Math.hypot(D[v * 3], D[v * 3 + 1], D[v * 3 + 2]);
      if (S2.mesh.held[v]) { expect(far).toBe(0); continue; }
      if (far > 1e-6) moved++; most = Math.max(most, far);
      const p = at(v); if (tubeOut(tube, p[0], p[1], p[2], SEAT_SKIN.standOff * 0.5)) inside++;
    }
    expect(inside).toBe(0);
    expect(moved).toBeGreaterThan(200);
    expect(most).toBeGreaterThan(0.01);
    // (taut: down her middle from its held back edge to the tube, each point's move is close to the mean of the two
    // either side of it along that line and its two beside it -- no step, no fold)
    const mid = (S2.nx - 1) / 2;
    let seen = 0;
    for (let k = S2.nz - 2; k > 0; k--) {
      const v = k * S2.nx + mid, p = [S2.at[v * 3], S2.at[v * 3 + 1], S2.at[v * 3 + 2]];
      if (tubeOut(tube, p[0], p[1], p[2], SEAT_SKIN.standOff + 0.004)) break;
      const m = [0, 1, 2].map((c) => (D[(v - 1) * 3 + c] + D[(v + 1) * 3 + c] + D[(v - S2.nx) * 3 + c] + D[(v + S2.nx) * 3 + c]) / 4);
      if (Math.hypot(D[v * 3], D[v * 3 + 1], D[v * 3 + 2]) < 1e-5) continue;
      expect(Math.hypot(D[v * 3] - m[0], D[v * 3 + 1] - m[1], D[v * 3 + 2] - m[2])).toBeLessThan(0.0006);
      seen++;
    }
    expect(seen).toBeGreaterThan(3);
    // (and `share` of it: half the way)
    const H = layBeyond(S2.mesh, S2.at, S2.side, tube, 0.5);
    for (let i = 0; i < D.length; i += 37) expect(H[i]).toBeCloseTo(D[i] * 0.5, 6);
    expect(layBeyond(S2.mesh, S2.at, S2.side, tube, 0).every((x) => x === 0)).toBe(true);
  });

  it('her skin beyond the area: clear of the tube, none of it moves', () => {
    const S2 = sheet(), far = Float32Array.from(S2.at, (x, i) => (i % 3 === 2 ? x - 0.2 : x));
    expect(layBeyond(S2.mesh, far, S2.side, tube, 1).every((x) => x === 0)).toBe(true);
  });
});

/**
 * A TUBE STRAIGHT UP (+y) from her doors' feet at y = 0, 5 cm round, 9 cm long; and her skin laid on it: up its wall
 * (stood off it) to `rise`, then out along her own skin, which runs `tilt` radians up from square to the tube, to 12 cm
 * from the wall, where it is held. `rings` points along each of 72 lines round it.
 */
function mound(rise = 0.04, tilt = 0, rings = 81): { tube: NonNullable<ReturnType<typeof sleeveTube>>; laid: Float32Array; held: Uint8Array; at: (line: number, k: number) => [number, number, number]; along: number[] } {
  const rows = 10, cols = 24, r = 0.05, pts = new Float32Array(rows * cols * 3);
  for (let k = 0; k < rows; k++) for (let j = 0; j < cols; j++) { const a = (j / cols) * Math.PI * 2, i = (k * cols + j) * 3; pts[i] = Math.sin(a) * r; pts[i + 1] = k * 0.01; pts[i + 2] = Math.cos(a) * r; }
  const tube = sleeveTube(pts, cols)!, lines = 72, laid = new Float32Array(lines * rings * 3), held = new Uint8Array(lines * rings), along: number[] = [];
  const far = 0.12, whole = rise + far, off = r + SEAT_SKIN.standOff;
  for (let k = 0; k < rings; k++) along.push((k / (rings - 1)) * whole);
  for (let l = 0; l < lines; l++) for (let k = 0; k < rings; k++) {
    const a = (l / lines) * Math.PI * 2, s = along[k], out = s <= rise ? 0 : (s - rise) * Math.cos(tilt), up = s <= rise ? s : rise + (s - rise) * Math.sin(tilt), i = (l * rings + k) * 3;
    laid[i] = Math.sin(a) * (off + out); laid[i + 1] = up; laid[i + 2] = Math.cos(a) * (off + out);
    if (k === rings - 1) held[l * rings + k] = 1;
  }
  return { tube, laid, held, at: (l, k) => [laid[(l * rings + k) * 3], laid[(l * rings + k) * 3 + 1], laid[(l * rings + k) * 3 + 2]], along };
}

describe('the mound rounded into her (skinSeat roundOf, roundMove)', () => {
  it('reads the corner all round: how far up the wall her skin leaves it, which way it runs, how far the curve reaches', () => {
    const M = mound(0.04), R = roundOf(M.tube, M.laid, M.held);
    for (let b = 0; b < SEAT_SKIN.round; b += 7) {
      // (read from her skin just off the wall, between 4 mm and 12 mm out: within a few millimetres of the corner)
      expect(Math.abs(R.rise[b] - 0.04)).toBeLessThan(0.004);
      expect(R.out[b]).toBeGreaterThan(0.97); expect(Math.abs(R.up[b])).toBeLessThan(0.2);
      expect(R.reach[b]).toBeCloseTo(SEAT_ROUND.reach * R.rise[b], 2);
      expect(R.share[b]).toBeCloseTo(1, 3);
    }
  });

  it('rounds the corner: her skin leaves her doors\' feet leaning out and comes down onto her own skin, with no fold', () => {
    const M = mound(0.04), R = roundOf(M.tube, M.laid, M.held), mv = new Float64Array(3), line = 18;
    const prof: [number, number][] = [];
    for (let k = 0; k < M.along.length; k++) {
      const p = M.at(line, k), moved = roundMove(M.tube, R, p[0], p[1], p[2], mv), q = moved ? [p[0] + mv[0], p[1] + mv[1], p[2] + mv[2]] : p;
      prof.push([Math.hypot(q[0], q[2]) - 0.05, q[1]]);
      // (its edge is held, and nothing past the curve's reach moves)
      if (M.along[k] > 0.04 + SEAT_ROUND.reach * 0.044) expect(moved).toBe(false);
    }
    // her doors' feet stay; half way up the wall her skin already stands well out from it; the corner itself has come
    // out and down
    expect(prof[0][0]).toBeCloseTo(SEAT_SKIN.standOff, 4); expect(prof[0][1]).toBeCloseTo(0, 5);
    const half = prof[M.along.findIndex((s) => s >= 0.02)], corner = prof[M.along.findIndex((s) => s >= 0.04)];
    expect(half[0]).toBeGreaterThan(0.004);
    expect(corner[0]).toBeGreaterThan(0.012); expect(corner[1]).toBeLessThan(0.037);
    // one curve: further out all the way, never back down toward her doors, and no step between neighbours
    for (let k = 1; k < prof.length; k++) {
      expect(prof[k][0], `out at ${k}`).toBeGreaterThanOrEqual(prof[k - 1][0] - 1e-5);
      expect(prof[k][1], `up at ${k}`).toBeGreaterThanOrEqual(prof[k - 1][1] - 1e-4);
      expect(Math.hypot(prof[k][0] - prof[k - 1][0], prof[k][1] - prof[k - 1][1])).toBeLessThan(0.012);
    }
    // and it lands lying along her own skin: its last moved stretch runs out nearly square to the tube, as her skin does
    const end = M.along.findIndex((s) => s >= 0.04 + SEAT_ROUND.reach * 0.04 * 0.85);
    expect(Math.atan2(prof[end][1] - prof[end - 2][1], prof[end][0] - prof[end - 2][0])).toBeLessThan(0.35);
  });

  it('is a rule of the place: two skins that meet there still meet (the same point, the same move)', () => {
    const M = mound(0.04), R = roundOf(M.tube, M.laid, M.held), a = new Float64Array(3), b = new Float64Array(3);
    const p = M.at(3, 14);
    expect(roundMove(M.tube, R, p[0], p[1], p[2], a)).toBe(true);
    expect(roundMove(M.tube, R, p[0], p[1], p[2], b)).toBe(true);
    expect(Array.from(a)).toEqual(Array.from(b));
    // (and a point a hair from it moves a hair differently: no tear)
    expect(roundMove(M.tube, R, p[0] + 1e-4, p[1], p[2] + 1e-4, b)).toBe(true);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(3e-4);
  });

  it('leaves her alone where there is no corner: her skin leaving the wall at her doors\' feet, or running on up nearly along it', () => {
    const flat = mound(0.0), R0 = roundOf(flat.tube, flat.laid, flat.held), mv = new Float64Array(3);
    for (let b = 0; b < SEAT_SKIN.round; b += 5) expect(R0.share[b]).toBeLessThan(1e-3);
    for (let k = 0; k < flat.along.length; k += 3) { const p = flat.at(5, k); expect(roundMove(flat.tube, R0, p[0], p[1], p[2], mv)).toBe(false); }
    // (her back: her skin runs on up at 75 degrees -- the two runs are nearly one line, and no point leaves that line
    // by more than a few millimetres, though it may slide along it)
    const tilt = (75 * Math.PI) / 180, steep = mound(0.04, tilt), R1 = roundOf(steep.tube, steep.laid, steep.held);
    let off = 0, most = 0;
    for (let k = 0; k < steep.along.length; k++) {
      const p = steep.at(5, k); if (!roundMove(steep.tube, R1, p[0], p[1], p[2], mv)) continue;
      const out = Math.hypot(p[0] + mv[0], p[2] + mv[2]) - 0.05 - SEAT_SKIN.standOff, up = p[1] + mv[1];
      // (how far from the two runs: the wall up to the corner, then her skin's line from it)
      const s = Math.max(0, out * Math.cos(tilt) + (up - 0.04) * Math.sin(tilt)), toSkin = Math.hypot(out - s * Math.cos(tilt), up - 0.04 - s * Math.sin(tilt)), toWall = up <= 0.04 ? Math.abs(out) : Math.hypot(out, up - 0.04);
      off = Math.max(off, Math.min(toSkin, toWall)); most = Math.max(most, Math.hypot(mv[0], mv[1], mv[2]));
    }
    expect(off).toBeLessThan(0.005);
    expect(most).toBeLessThan(0.02);
  });

  it('comes down short of her skin\'s held edge', () => {
    // (held 2 cm from the wall: the curve's reach is no more than `hold` of that)
    const M = mound(0.04), held = new Uint8Array(M.held.length), rings = M.along.length;
    for (let l = 0; l < 72; l++) for (let k = 0; k < rings; k++) if (M.along[k] >= 0.04 + 0.02) held[l * rings + k] = 1;
    const R = roundOf(M.tube, M.laid, held);
    for (let b = 0; b < SEAT_SKIN.round; b += 7) expect(R.reach[b]).toBeLessThanOrEqual(SEAT_ROUND.hold * 0.0235);
  });
});
