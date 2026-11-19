/**
 * An early week at her START (Joshua, 2026-11-19: "I want one character to have a 10% starting belly, be at 150% at 42
 * weeks, and end up with a belly size of 30%… But it kept saying she was 12 weeks at 10%"). Before week 12 her belly does
 * not show: at her START she is any week from 1 to 12, and a week typed for it is kept (baby.ts `herWeek`, `herChart`).
 */
import { describe, expect, it } from 'vitest';
import { atHerStart, herChart, herWeek, kickStage } from '../src/sarahlab/baby';

const his = { week: null, weekAtBump: null, firstWeekBump: 10, deliveryBump: 150, deliveryWeek: 42, afterBump: 30, births: null };

describe('her START and the weeks before her belly shows', () => {
  it('his numbers: 10% her START, 150% at week 42, 30% after', () => {
    const c = herChart(1, his);
    expect([c.firstWeekBump, c.deliveryBump, c.deliveryWeek, c.afterBump, c.unused]).toEqual([10, 150, 42, 30, []]);
    expect(atHerStart(10, 1, his)).toBe(true);
    expect(atHerStart(11, 1, his)).toBe(false);
    expect(herWeek(150, 1, his)).toBeCloseTo(42);
  });
  it('a week to 12 typed at her START is the week she is, and moves nothing else of her chart', () => {
    const p = { ...his, week: 6, weekAtBump: 10 };
    expect(herWeek(10, 1, p)).toBe(6);
    expect(herChart(1, p).unused).toEqual([]);
    expect(herWeek(80, 1, p)).toBeCloseTo(herWeek(80, 1, his));
    expect(kickStage(herWeek(10, 1, p))).toEqual({ often: 0, seen: 0 });
  });
  it('with no START typed, the belly an early week is typed for is her START', () => {
    const p = { ...his, firstWeekBump: null, week: 6, weekAtBump: 10 };
    expect(herChart(1, p).firstWeekBump).toBe(10);
    expect(herWeek(10, 1, p)).toBe(6);
  });
  it('an early week typed for a belly over her START is not used', () => {
    const p = { ...his, week: 6, weekAtBump: 40 };
    expect(herChart(1, p).unused).toEqual(['week']);
    expect(herWeek(40, 1, p)).toBeCloseTo(herWeek(40, 1, his));
  });
});
