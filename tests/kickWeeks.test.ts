/**
 * Kicks by her week (baby.ts `kickStage`, `KICK_WEEKS`). Joshua, 2026-11-19: "No movement at all before about week 16";
 * "Make 19 weeks the average week the first movement is felt"; "From about week 22, kicks can show on the outside of her
 * belly, small at first, getting stronger and more often… up to the strongest around weeks 28 to 36, then a little less
 * room and a little less often near her delivery week"; "Twins and triplets follow the same weeks"; "BABY KICKS (0-200%)
 * still scales how often on top of this, and 0 still means none".
 */
import { describe, expect, it } from 'vitest';
import { KICK_WEEKS, kickStage, nextMove } from '../src/sarahlab/baby';

const at = (w: number, d = 40) => kickStage(w, d);

describe('kicks by her week', () => {
  it('none at all before week 16', () => {
    for (const w of [0, 8, 12, 15.9]) expect(at(w)).toEqual({ often: 0, seen: 0 });
    expect(at(Number.NaN)).toEqual({ often: 0, seen: 0 });
  });
  it('from 16 to 22 she feels them, rare at first, and nothing shows on her belly', () => {
    for (const w of [16, 17, 19, 21.9]) { expect(at(w).often).toBeGreaterThan(0); expect(at(w).seen).toBe(0); }
    expect(at(17).often).toBeLessThan(at(KICK_WEEKS.firstFelt).often);
    expect(at(KICK_WEEKS.firstFelt).often).toBeCloseTo(KICK_WEEKS.felt);
    expect(at(21).often).toBeLessThan(0.5);
  });
  it('the week first felt is one tuning number', () => {
    const later = { ...KICK_WEEKS, firstFelt: 20 };
    expect(kickStage(19, 40, later).often).toBeLessThan(kickStage(19, 40).often);
    expect(kickStage(20, 40, later).often).toBeCloseTo(KICK_WEEKS.felt);
  });
  it('from 22 they show, small at first, and grow to their strongest by 28', () => {
    expect(at(22).seen).toBeCloseTo(KICK_WEEKS.seenFrom);
    expect(at(25).seen).toBeGreaterThan(at(22).seen);
    expect(at(25).often).toBeGreaterThan(at(22).often);
    expect(at(28)).toEqual({ often: 1, seen: 1 });
    expect(at(30)).toEqual({ often: 1, seen: 1 });
    expect(at(36)).toEqual({ often: 1, seen: 1 });
  });
  it('a little less near her delivery week, never none', () => {
    expect(at(38).often).toBeLessThan(1); expect(at(38).often).toBeGreaterThan(KICK_WEEKS.late);
    expect(at(40)).toEqual({ often: KICK_WEEKS.late, seen: KICK_WEEKS.late });
    expect(at(42)).toEqual({ often: KICK_WEEKS.late, seen: KICK_WEEKS.late });
  });
  it('twins and triplets the same weeks, crowded before their own delivery week', () => {
    for (const d of [37, 34]) {
      expect(kickStage(12, d)).toEqual({ often: 0, seen: 0 });
      expect(kickStage(19, d)).toEqual(at(19));
      expect(kickStage(22, d)).toEqual(at(22));
      expect(kickStage(30, d)).toEqual(at(30));
      expect(kickStage(d, d)).toEqual({ often: KICK_WEEKS.late, seen: KICK_WEEKS.late });
    }
    expect(kickStage(33, 37).often).toBeLessThan(1 + 1e-9); expect(kickStage(35, 37).often).toBeLessThan(1);
  });
  it('BABY KICKS still scales how often on top, and 0 is none', () => {
    const rnd = () => 0.5;
    expect(nextMove(rnd, 0 * at(30).often).inS).toBe(Infinity);
    expect(nextMove(rnd, 100 * at(12).often).inS).toBe(Infinity);
    expect(nextMove(rnd, 100 * at(19).often).inS).toBeGreaterThan(nextMove(rnd, 100 * at(30).often).inS);
    expect(nextMove(rnd, 200 * at(30).often).inS).toBeLessThan(nextMove(rnd, 100 * at(30).often).inS);
  });
});

// HOW HER BELLY GROWS WITH THE WEEKS (Joshua, 2026-11-19: "Yes, so hybrid"): half an even line, half a square
import { BELLY_CURVE, bellyGrown, bellyWeeksGone, bumpForWeek, herWeek, weekForBump } from '../src/sarahlab/baby';
describe('her belly by week: his hybrid curve', () => {
  it('is half an even line and half a square, and the other way round undoes it', () => {
    expect(BELLY_CURVE).toBe(0.5);
    expect(bellyGrown(0)).toBe(0); expect(bellyGrown(1)).toBe(1); expect(bellyGrown(0.5)).toBeCloseTo(0.375);
    for (const u of [0, 0.1, 0.375, 0.8, 1, 1.2]) expect(bellyGrown(bellyWeeksGone(u))).toBeCloseTo(u, 12);
  });
  it('his character: 10% at her START, 150% at week 42 -- no jump at the end', () => {
    const his = { week: null, weekAtBump: null, firstWeekBump: 10, deliveryBump: 150, deliveryWeek: 42, afterBump: 30, births: null };
    for (const [b, w] of [[10, 12], [49.2, 24], [77.2, 30], [110.8, 36], [136.3, 40], [150, 42]] as const) expect(herWeek(b, 1, his)).toBeCloseTo(w, 0);
    // (each week, never more than 7.2% of her belly: a straight line would be 4.7, the old chart's last two weeks 35)
    for (let w = 13; w <= 42; w++) {
      const step = [w - 1, w].map((x) => { let lo = 10, hi = 150; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (herWeek(m, 1, his) < x) lo = m; else hi = m; } return lo; });
      expect(step[1] - step[0]).toBeLessThan(7.3);
    }
  });
  it('one baby, twins and triplets: week 12 at 0%, their delivery bellies at their delivery weeks, the chart both ways', () => {
    for (const [n, b, w] of [[1, 100, 40], [2, 175, 37], [3, 180, 34]] as const) {
      expect(weekForBump(0, n)).toBe(12); expect(weekForBump(b, n)).toBeCloseTo(w, 9); expect(weekForBump(200, n)).toBe(n === 1 ? 42 : n === 2 ? 38 : 35);
      for (let x = 0; x <= 200; x += 7) expect(bumpForWeek(weekForBump(x, n), n)).toBeCloseTo(x, 6);
    }
  });
});
