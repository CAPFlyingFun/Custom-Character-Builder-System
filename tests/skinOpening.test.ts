import { describe, expect, it } from 'vitest';
import { VULVA_OPEN, skinDome, skinOpenAcross } from '../src/sarahlab/vulvaMesh';

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
  it('its ends held where her split\'s are, its rim drawn level wide open', () => {
    expect(VULVA_OPEN.endsHeld).toBe(1);
    expect(VULVA_OPEN.rimLevel).toBe(1);
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
});
