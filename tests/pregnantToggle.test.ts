/**
 * P5, PREGNANT and HER WEEKS (pregnancy.ts; baby.ts `herChart`). Joshua, 2026-11-05: "Don't set a fixed pregnancy week
 * tied to pregnancy on/off... add a text box you can type in the exact week to the % if you have an exact week for that
 * %. Also... the 1st week of pregnancy %, and the delivery week %... then the game can use those numbers later".
 *
 * PREGNANT is on or off and sets no week; with nothing typed her chart is the chart exactly; a week typed for a belly %
 * is the week there, her first week's and her delivery's bellies move the chart's ends, and what was not typed gives way
 * to what was; it is all kept per character in her save (two with the same body, one pregnant and one not, each read
 * back as she was), and a save from before -- PREGNANT as her `pregnancyWeeks` body control -- is read as it meant.
 */
import { describe, expect, it } from 'vitest';
import { defaultBodyShape, serializeShape } from '../src/actor/bodyShape';
import { EMPTY_BOOK, exportBook, importBook, saveInto, type SavedBody, type SavedClothes } from '../src/sarahlab/characterSaves';
import { NO_RULES } from '../src/actor/bodyRandom';
import { PREGNANCY_DEFAULT, legacyPregnancy, pregnancyOf, pregnantLine, readPregnancy, typedNumber, typeWeek, weekIsFor, type Pregnancy } from '../src/sarahlab/pregnancy';
import { bumpForWeek, chartBump, DELIVERY_WEEKS, herChart, herWeek, weekForBump } from '../src/sarahlab/baby';

const typed = (p: Partial<Pregnancy>): Pregnancy => ({ ...PREGNANCY_DEFAULT, ...p });

describe('PREGNANT: on or off, and nothing else', () => {
  it('its line names no week, and turning it never sets one', () => {
    expect(pregnantLine(PREGNANCY_DEFAULT)).toBe('PREGNANT · ON');
    expect(pregnantLine(typed({ pregnant: false }))).toBe('PREGNANT · OFF');
    const sarah = typeWeek(PREGNANCY_DEFAULT, 32, 73), off = { ...sarah, pregnant: false }, on = { ...off, pregnant: true };
    expect(on).toEqual(sarah);
    expect(PREGNANCY_DEFAULT.week).toBeNull();
  });
  it('the approved body starts pregnant with nothing typed, and her chart is the chart', () => {
    expect(PREGNANCY_DEFAULT.pregnant).toBe(true);
    for (const babies of [1, 2, 3]) for (const b of [0, 30, 73, 100, 150, 200]) {
      expect(chartBump(b, babies, PREGNANCY_DEFAULT)).toBe(b);
      expect(herWeek(b, babies, PREGNANCY_DEFAULT)).toBe(weekForBump(b, babies));
    }
    expect(herChart(1, PREGNANCY_DEFAULT)).toMatchObject({ firstWeekBump: 0, deliveryBump: 100, deliveryWeek: 40, unused: [] });
  });
});

describe('her weeks: her own chart', () => {
  it('bumpForWeek is weekForBump the other way round', () => {
    for (const babies of [1, 2, 3]) for (const b of [5, 40, 73, 100, 140, 190]) expect(bumpForWeek(weekForBump(b, babies), babies)).toBeCloseTo(b, 9);
    expect(bumpForWeek(8)).toBe(0); expect(bumpForWeek(45)).toBe(200);
    expect(bumpForWeek(DELIVERY_WEEKS[1])).toBe(100);
  });
  it('a week typed for a belly % is the week there, and her belly either side runs on smoothly', () => {
    const sarah = typeWeek(PREGNANCY_DEFAULT, 30, 73);
    expect(herWeek(73, 1, sarah)).toBeCloseTo(30, 9);
    expect(Math.abs(herWeek(72.5, 1, sarah) - 30)).toBeLessThan(0.3);
    expect(herWeek(0, 1, sarah)).toBe(12);
    expect(herWeek(100, 1, sarah)).toBeCloseTo(40, 9);
    expect(weekIsFor(sarah, 73)).toBe(true); expect(weekIsFor(sarah, 80)).toBe(false);
    // (cleared, the chart again)
    expect(herWeek(73, 1, typeWeek(sarah, null, 73))).toBe(weekForBump(73));
  });
  it('her first week\'s belly and her delivery\'s move the chart\'s ends', () => {
    const round = typed({ firstWeekBump: 30 });
    expect(herWeek(30, 1, round)).toBe(12); expect(herWeek(20, 1, round)).toBe(12);
    expect(herWeek(65, 1, round)).toBeCloseTo(26, 9); expect(herWeek(100, 1, round)).toBeCloseTo(40, 9);
    const small = typed({ deliveryBump: 85, deliveryWeek: 39 });
    expect(herWeek(85, 1, small)).toBeCloseTo(39, 9);
    expect(herChart(1, small)).toMatchObject({ deliveryBump: 85, deliveryWeek: 39, unused: [] });
  });
  it('what was not typed gives way to what was: a week typed past the chart\'s delivery % moves it out', () => {
    const big = typeWeek(PREGNANCY_DEFAULT, 38, 120), chart = herChart(1, big);
    expect(chart.unused).toEqual([]);
    expect(herWeek(120, 1, big)).toBeCloseTo(38, 9);
    expect(chart.deliveryBump).toBeGreaterThan(120);
    expect(herWeek(chart.deliveryBump, 1, big)).toBeCloseTo(40, 9);
  });
  it('a typed number that cannot be on one chart with the others is not used, and says so', () => {
    expect(herChart(1, typeWeek(PREGNANCY_DEFAULT, 10, 20)).unused).toEqual(['week']);
    expect(herWeek(20, 1, typeWeek(PREGNANCY_DEFAULT, 10, 20))).toBe(weekForBump(20));
    expect(herChart(1, { ...typeWeek(PREGNANCY_DEFAULT, 30, 40), firstWeekBump: 50 }).unused).toEqual(['week']);
    expect(herChart(1, typed({ firstWeekBump: 60, deliveryBump: 50 })).unused).toEqual(['delivery']);
  });
  it('twins and triplets read their own chart until something is typed', () => {
    expect(herChart(2, PREGNANCY_DEFAULT).deliveryWeek).toBe(37); expect(herChart(3, PREGNANCY_DEFAULT).deliveryWeek).toBe(34);
    const twins = typeWeek(PREGNANCY_DEFAULT, 18, 50);
    expect(herWeek(50, 2, twins)).toBeCloseTo(18, 9);
  });
});

describe('her weeks as typed and as saved', () => {
  it('a box: blank is nothing typed, a number in range, anything else left as it was', () => {
    expect(typedNumber('  ', [1, 42])).toBeNull();
    expect(typedNumber('32.46', [1, 42])).toBe(32.5);
    expect(typedNumber('45', [1, 42])).toBe(42);
    expect(typedNumber('abc', [1, 42])).toBeUndefined();
  });
  it('a record read from a file is brought into range; a week without its belly % is no week', () => {
    expect(readPregnancy(null)).toEqual(PREGNANCY_DEFAULT);
    expect(readPregnancy({ pregnant: false, week: 30 })).toEqual(typed({ pregnant: false }));
    expect(readPregnancy({ week: 99, weekAtBump: 500, firstWeekBump: -3, deliveryWeek: 5 })).toEqual(typed({ week: 42, weekAtBump: 200, firstWeekBump: 0, deliveryWeek: 13 }));
  });
  it('two characters with the same body, one pregnant with her weeks typed and one not, are saved and read back each as she was', () => {
    const shape = serializeShape({ ...defaultBodyShape(), bellyWidth: 4 }), clothes = null as unknown as SavedClothes;
    const sarah = typed({ week: 32, weekAtBump: 73, firstWeekBump: 0, deliveryBump: 100, deliveryWeek: 40 }), lena = typed({ pregnant: false, firstWeekBump: 30 });
    const body = (pregnancy: Pregnancy): SavedBody => ({ model: 'v2-body', bump: 50, shape, refine: true, random: NO_RULES, pregnancy });
    let book = saveInto(EMPTY_BOOK, 'Sarah', 'all', body(sarah), clothes, 't1');
    book = saveInto(book, 'Lena', 'all', body(lena), clothes, 't2');
    const back = importBook(exportBook(book));
    expect(back).not.toBeNull();
    const of = (name: string) => back!.characters.find((c) => c.name === name)!.body!;
    expect(pregnancyOf(of('Sarah'))).toEqual(sarah);
    expect(pregnancyOf(of('Lena'))).toEqual(lena);
    // (and the rest of her body, and her belly's size -- her look -- the same for both)
    expect(of('Lena').shape).toBe(of('Sarah').shape);
    expect(of('Lena').bump).toBe(50);
  });
  it('a save from before, PREGNANT as her pregnancyWeeks body control, is read as it meant', () => {
    expect(legacyPregnancy('{"version":1,"shape":{"navel":20}}', 73)).toEqual(PREGNANCY_DEFAULT);
    expect(legacyPregnancy('{"version":1,"shape":{"pregnancyWeeks":0}}', 30)).toEqual(typed({ pregnant: false }));
    expect(legacyPregnancy('{"version":1,"shape":{"pregnancyWeeks":32}}', 73)).toEqual(typed({ week: 32, weekAtBump: 73 }));
    expect(legacyPregnancy('not json', 50)).toEqual(PREGNANCY_DEFAULT);
    expect(pregnancyOf({ bump: 73, shape: '{"version":1,"shape":{"pregnancyWeeks":0}}' }).pregnant).toBe(false);
  });
});
