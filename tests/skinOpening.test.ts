import { describe, expect, it } from 'vitest';
import { VULVA_OPEN, skinDome, skinOpenAcross, skinOpenShape } from '../src/sarahlab/vulvaMesh';
import { edgeShare } from '../src/sarahlab/vulvaPatch';

// HER SKIN-MADE OPENING OPENED AS HER LIPS WERE (Joshua, 2026-11-11): his scale, and his dome.
describe('her skin-made opening, opened on Joshua\'s scale', () => {
  it('0.1 cm just open, 0.15 at 1%, 0.2 at 2%, then a tenth of a centimetre a percent to 10 cm', () => {
    expect(skinOpenAcross(0)).toBeCloseTo(0.001, 6);
    expect(skinOpenAcross(0.01)).toBeCloseTo(0.0015, 6);
    expect(skinOpenAcross(0.02)).toBeCloseTo(0.002, 6);
    for (const p of [3, 10, 25, 50, 75, 100]) expect(skinOpenAcross(p / 100)).toBeCloseTo(0.001 * p, 6);
    // (never narrower as it opens; nothing past 10 cm)
    let last = 0;
    for (let p = 0; p <= 100; p += 0.5) { const w = skinOpenAcross(p / 100); expect(w).toBeGreaterThanOrEqual(last - 1e-12); last = w; }
    expect(skinOpenAcross(2)).toBeCloseTo(0.1, 6);
    expect(skinOpenAcross(Number.NaN)).toBeCloseTo(VULVA_OPEN.shutAcross, 6);
  });
  it('its rim drawn level wide open', () => {
    expect(VULVA_OPEN.rimLevel).toBe(1);
  });
  // (her split as measured on her in RECLINE: 4.15 cm ahead of its middle and behind it)
  const SPLIT = 0.0415;
  it('her split\'s ends held as it opens -- slit, then oval -- until it is wider than about two thirds', () => {
    for (const p of [1, 10, 25, 50, 60]) {
      const o = skinOpenShape(p / 100, SPLIT, SPLIT, skinOpenAcross(p / 100) / 2);
      expect(o.centre + o.half).toBeCloseTo(SPLIT, 6);
      expect(o.centre - o.half).toBeCloseTo(-SPLIT, 6);
      expect(o.across * 2).toBeCloseTo(skinOpenAcross(p / 100), 6);
    }
  });
  it('at 100% a slight oval 12.5 cm along her split by 10 cm across, its top 6 cm ahead of her split\'s middle (her pubic bone does not give), the rest toward her perineum', () => {
    const o = skinOpenShape(1, SPLIT, SPLIT, skinOpenAcross(1) / 2);
    expect(o.half * 2).toBeCloseTo(0.125, 6);
    expect(o.across * 2).toBeCloseTo(0.1, 6);
    expect(o.centre + o.half).toBeCloseTo(0.06, 6);
    expect(o.centre - o.half).toBeCloseTo(-0.065, 6);
    expect(VULVA_OPEN.passMostAlong).toBeCloseTo(0.125, 6);
    expect(VULVA_OPEN.passMostAcross).toBeCloseTo(0.1, 6);
  });
  it('its ends move smoothly once it outgrows her split: never back, never a jump', () => {
    let top = -Infinity, bottom = Infinity;
    for (let p = 0; p <= 100; p += 0.5) {
      const o = skinOpenShape(p / 100, SPLIT, SPLIT, skinOpenAcross(p / 100) / 2), t = o.centre + o.half, b = o.centre - o.half;
      expect(t).toBeGreaterThanOrEqual(top - 1e-12); expect(b).toBeLessThanOrEqual(bottom + 1e-12);
      if (p > 0) { expect(t - top).toBeLessThan(0.0005); expect(bottom - b).toBeLessThan(0.0008); }
      top = t; bottom = b;
    }
  });
  it('held narrower by her legs, it keeps her split\'s length and its own width', () => {
    const o = skinOpenShape(1, SPLIT, SPLIT, 0.03);
    expect(o.across).toBeCloseTo(0.03, 6);
    expect(o.half * 2).toBeCloseTo(Math.max(2 * SPLIT, 0.125 * 0.6), 6);
  });
  it('a 2 cm dome at every opening, even all round, the same height from just open to wide open', () => {
    expect(skinDome(0, 0).height).toBe(0);
    for (const p of [5, 10, 25, 50, 75, 100]) { const d = skinDome(p / 100, 0); expect(d.height).toBeCloseTo(0.02, 6); expect(d.lean).toBe(0); }
    // (eased in over the first few percent, never past it)
    expect(skinDome(0.025, 0).height).toBeGreaterThan(0);
    expect(skinDome(0.025, 0).height).toBeLessThan(0.02);
  });
  it('a birth\'s push past it still leans to her bottom, as much as it is the more', () => {
    const full = skinDome(1, 1);
    expect(full.height).toBeCloseTo(VULVA_OPEN.bulge, 6);
    expect(full.lean).toBeGreaterThan(0);
    expect(full.lean).toBeLessThan(VULVA_OPEN.bulgeLean);
    // (a push no more than the dome: the dome, even)
    const small = skinDome(1, 0.2);
    expect(small.height).toBeCloseTo(0.02, 6);
    expect(small.lean).toBe(0);
  });
  it('its skin reaches her groin creases (Joshua\'s #2): her legs kept out only from each leg opening itself, her inner thighs\' tops the opening\'s', () => {
    expect(VULVA_OPEN.legMask).toBe(0);
    expect(VULVA_OPEN.legUnder).toBe(false);
    // (her legs\' rule still holds it off her legs beyond them)
    expect(VULVA_OPEN.legClear).toBeGreaterThan(0);
  });
  it('its skin rides her legs\' springs where it meets her own: all of them at its edge, less the further in, none past the band', () => {
    // (Joshua, 2026-11-12: "When walking, there is taring on both thighs" -- its edge stood still beside her thigh's skin)
    // a flat sheet of her skin, 11 x 11 points 5 mm apart: the area its middle 8 x 8 squares, the squares round them hers
    // to draw; a seam of her texture up its middle (two vertices a point there, one for each side); and a hole in her skin
    // in the middle of the area (one square no triangle of hers fills)
    const N = 11, step = 0.005, rest: number[] = [], key: number[] = [], area: number[] = [], keep: number[] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { rest.push(x * step, y * step, 0); key.push(y * N + x); }
    const at = (x: number, y: number) => y * N + x, seam = (y: number) => N * N + y;
    for (let y = 0; y < N; y++) { rest.push(5 * step, y * step, 0); key.push(at(5, y)); }
    const right = (x: number, y: number) => (x === 5 ? seam(y) : at(x, y));
    for (let y = 0; y + 1 < N; y++) for (let x = 0; x + 1 < N; x++) {
      if (x === 4 && y === 5) continue;
      const v = x >= 5 ? right : at, inside = x >= 1 && x < 9 && y >= 1 && y < 9;
      (inside ? area : keep).push(v(x, y), v(x + 1, y), v(x, y + 1), v(x + 1, y), v(x + 1, y + 1), v(x, y + 1));
    }
    const share = edgeShare(rest, key, area, keep, 0.012);
    // its edge, where her own triangles begin; and her skin beyond it
    for (let k = 1; k <= 9; k++) for (const v of [at(k, 1), at(k, 9), at(1, k), at(9, k)]) expect(share[v]).toBe(1);
    expect(share[at(0, 0)]).toBe(1); expect(share[at(10, 4)]).toBe(1);
    // 5 and 10 mm in from its edge: less and less; 15 and 20 mm in: none
    expect(share[at(2, 5)]).toBeLessThan(1); expect(share[at(3, 5)]).toBeLessThan(share[at(2, 5)]); expect(share[at(3, 5)]).toBeGreaterThan(0);
    expect(share[at(4, 5)]).toBe(0); expect(share[at(5, 5)]).toBe(0);
    // her seam is no edge of it, and neither is the hole: by how far in the point is
    expect(share[seam(5)]).toBe(0); expect(share[seam(2)]).toBe(share[at(5, 2)]); expect(share[at(5, 2)]).toBeCloseTo(share[at(2, 5)], 6);
    expect(share[seam(1)]).toBe(1); expect(share[at(4, 6)]).toBe(0);
    // and the band itself: well short of her lips, on her opening's own skin (6.6 cm out beside her split at the least)
    expect(VULVA_OPEN.legSpringBand).toBeGreaterThan(0.005); expect(VULVA_OPEN.legSpringBand).toBeLessThan(0.066 - VULVA_OPEN.width);
  });
});
