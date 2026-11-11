import { describe, expect, it } from 'vitest';
import { VULVA_OPEN, skinDome, skinOpenAcross, skinOpenShape } from '../src/sarahlab/vulvaMesh';

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
});
