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

  // (Joshua, 2026-11-13: "Yes, fix the thirst": the marks were counted of her body's water -- half her weight -- where
  // the research means her weight, and her thirst came on twice too early)
  it('her thirst is counted against her weight: felt from half a percent of it lost as water, at its most by 2%', () => {
    const kg: number = GUT.kg, at = (shortMl: number, weight: number = kg) => gutNeeds({ ...restingGut(), waterMl: -shortMl }, weight).thirst;
    expect(at(0)).toBe(0);
    expect(at(0.5 * GUT.thirstFrom * kg * 1000)).toBeCloseTo(0, 9);
    expect(at(GUT.thirstFrom * kg * 1000)).toBeCloseTo(1 / 3, 9);
    expect(at(GUT.thirstFull * kg * 1000)).toBeCloseTo(1, 9);
    // 0.6 L short is where a 60 kg woman's thirst is a third of the way, not its most (2% of her body's water)
    expect(GUT.thirstFull * GUT.waterShare * kg * 1000).toBeCloseTo(600, 9); expect(at(600)).toBeLessThan(0.5);
    // a heavier body is less thirsty for the same water lost
    expect(at(900, 90)).toBeLessThan(at(900, 60));
    // her kidneys hold back by the same mark: the least they can pass by 2% of her weight lost, half-way at 1%
    expect(urineMlH(-GUT.thirstFull * kg * 1000)).toBeCloseTo(GUT.urineLeastMlKgH * kg, 9);
    expect(urineMlH(-GUT.thirstFrom * kg * 1000)).toBeCloseTo(((GUT.urineMlKgH + GUT.urineLeastMlKgH) / 2) * kg, 9);
  });

  it('with nothing drunk her thirst is first felt after about three and a half hours and is at its most after about sixteen', () => {
    let s: GutState = { ...restingGut(), stomachWaterMl: 0, stomachFoodMl: 0 }, felt = 0, half = 0, most = 0;
    for (let m = 1; m <= 24 * 60 && !most; m++) {
      s = stepGut(s, 1 / 60); const t = gutNeeds(s).thirst;
      if (!felt && t > 0.01) felt = m / 60; if (!half && t >= 0.5) half = m / 60; if (t >= 1) most = m / 60;
    }
    expect(felt).toBeGreaterThan(3); expect(felt).toBeLessThan(4);
    // (research: about 12 hours with no drink until a resting person is thirsty, 7 to 24)
    expect(half).toBeGreaterThan(7); expect(half).toBeLessThan(12);
    expect(most).toBeGreaterThan(15); expect(most).toBeLessThan(17.5);
  });
});
