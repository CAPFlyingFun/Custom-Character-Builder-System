/**
 * WHAT HER GUT HOLDS OVER TIME (actor/gut.ts): the properties the NPC brain will lean on -- that time may be given in
 * any pieces, that nothing goes below nothing or past what an organ holds, that her needs stay 0..1 whatever she is
 * given, and that a long absence is cheap to catch up. Review tests (2026-11-09), beside tests/abdominalOrgans.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { INTESTINES, RECTUM, STOMACH } from '../src/actor/abdominalOrgans';
import { BLADDER } from '../src/actor/pelvicOrgans';
import { GUT, drawnFill, eat, gutNeeds, hoursToBladderUrge, pee, poop, restingGut, stepGut, urineMlH, type GutState } from '../src/actor/gut';

const KEYS: (keyof GutState)[] = ['stomachWaterMl', 'stomachFoodMl', 'intestineMl', 'colonMl', 'rectumMl', 'waterMl', 'bladderMl'];
const fed = () => eat(restingGut(), 700, 400);

describe('her gut over time', () => {
  it('time given whole or in pieces comes to the same', () => {
    const whole = stepGut(fed(), 6);
    let parts = fed(); for (let k = 0; k < 12; k++) parts = stepGut(parts, 0.5);
    let odd = fed(); for (const h of [0.07, 1.33, 0.6, 2.5, 1.5]) odd = stepGut(odd, h);
    for (const k of KEYS) {
      expect(parts[k]).toBeCloseTo(whole[k], 6);
      // (uneven pieces step the hour differently: within 2% of what moved, or 2 mL)
      expect(Math.abs(odd[k] - whole[k])).toBeLessThan(Math.max(2, 0.02 * Math.abs(whole[k])));
    }
  });

  it('nothing goes below nothing, nor past what holds it, over a week of meals', () => {
    let s = restingGut();
    for (let d = 0; d < 7; d++) for (const [h, food, water] of [[5, 700, 500], [6, 900, 600], [13, 400, 800]] as const) {
      s = stepGut(eat(s, food, water), h);
      for (const k of KEYS) expect(Number.isFinite(s[k])).toBe(true);
      for (const k of ['stomachWaterMl', 'stomachFoodMl', 'intestineMl', 'colonMl', 'rectumMl', 'bladderMl'] as const) expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s.stomachFoodMl + s.stomachWaterMl).toBeLessThanOrEqual(STOMACH.mostMl + 1e-6);
      expect(s.rectumMl).toBeLessThanOrEqual(RECTUM.mostMl); expect(s.bladderMl).toBeLessThanOrEqual(BLADDER.mostMl);
      const n = gutNeeds(s); for (const v of Object.values(n)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      const f = drawnFill(s); expect(f.colonFill).toBeGreaterThanOrEqual(0); expect(f.colonFill).toBeLessThanOrEqual(1); expect(f.intestineMl).toBeGreaterThanOrEqual(INTESTINES.restMl);
      if (gutNeeds(s).bladder > 0.9) s = pee(s);
      if (gutNeeds(s).bowel > 0.9) s = poop(s);
    }
    // (and about a stool a day reaches her rectum from those meals: MEASURED 100-200 g a day)
    const day = stepGut(eat(stepGut(eat(poop(s), 900, 600), 12), 900, 600), 12).rectumMl;
    expect(day).toBeGreaterThan(60); expect(day).toBeLessThan(250);
  });

  it('a full stomach takes no more; a meal that is not a number, or less than none, is no meal', () => {
    const full = eat(restingGut(), 5000, 5000);
    expect(full.stomachFoodMl + full.stomachWaterMl).toBeCloseTo(STOMACH.mostMl, 6);
    expect(eat(full, 300, 300)).toEqual(full);
    expect(eat(restingGut(), -50, -50)).toEqual(restingGut());
  });
  // REVIEW FINDING (gut.ts eat): Math.max(0, NaN) is NaN, so a meal that is not a number makes her whole gut not a number
  // (and every organ drawn from it). `stepGut` guards its hours with Number.isFinite; `eat` does not guard its amounts.
  it('a meal that is not a number leaves her gut as it was', () => {
    const s = eat(restingGut(), NaN, NaN);
    for (const k of KEYS) expect(Number.isFinite(s[k])).toBe(true);
  });

  it('her kidneys never pass less than the least nor a negative amount; time that is not a number is no time', () => {
    for (const w of [-1e6, -600, -1, 0, 1, 500, 1e5]) { expect(urineMlH(w)).toBeGreaterThanOrEqual(GUT.urineLeastMlKgH * GUT.kg - 1e-9); expect(Number.isFinite(urineMlH(w))).toBe(true); }
    expect(stepGut(fed(), NaN)).toEqual(fed()); expect(stepGut(fed(), -3)).toEqual(fed()); expect(stepGut(fed(), Infinity)).toEqual(fed());
    expect(hoursToBladderUrge({ ...restingGut(), bladderMl: 400 })).toBe(0);
  });

  it('a month away is caught up in well under a frame-stopping time', () => {
    const t0 = performance.now(), s = stepGut(fed(), 24 * 30), ms = performance.now() - t0;
    for (const k of KEYS) expect(Number.isFinite(s[k])).toBe(true);
    expect(gutNeeds(s).hunger).toBe(1); expect(gutNeeds(s).thirst).toBe(1);
    expect(ms).toBeLessThan(200);
  });
  // REVIEW FINDING (gut.ts stepGut): her body's water has no floor. Left alone she loses the insensible 33 mL an hour and
  // at least 24 mL an hour of urine for ever: after a month, 40 L short -- more water than she has (GUT.waterShare * kg =
  // 30 L) -- so one drink after a long absence leaves her at full thirst for days of drinking. Expected: held at some
  // most-short (a few % of her body's water).
  it('she can not be shorter of water than she has water', () => {
    expect(-stepGut(restingGut(), 24 * 30).waterMl).toBeLessThan(GUT.waterShare * GUT.kg * 1000);
  });
});
