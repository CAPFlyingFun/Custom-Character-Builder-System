import { describe, expect, it } from 'vitest';
import { SEAT_SKIN, footAt, laySeatSkin, sleeveTube, tubeOut, type SkinGrid } from '../src/actor/skinSeat';

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
    expect(tube.rows).toBe(9);
    // (its first row, at her doors' feet, runs back into her: -z; its last straight up)
    expect(tube.axes[0][2]).toBeLessThan(-0.9);
    expect(tube.axes[8][1]).toBeGreaterThan(0.99);
    for (let b = 0; b < SEAT_SKIN.round; b += 9) expect(tube.radius[4 * SEAT_SKIN.round + b]).toBeCloseTo(0.05, 3);
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
});
