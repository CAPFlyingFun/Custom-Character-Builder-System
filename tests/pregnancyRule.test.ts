/**
 * HER PREGNANCY AS THREE SIMPLE NUMBERS AND A BABY COUNTER (pregnancy.ts `PREGNANCY_RULE`; baby.ts `herChart`,
 * `ruleBiggest`). Joshua, 2026-11-13: "keep the numbers simple and easier to understand. The gameplay depending on the
 * game, can then work with those numbers and adjust between them"; "Keep it optional, but still there like my example
 * which can save stats per character... just rename the beginning and end of it basically... and maybe a baby counter...
 * For easy figuring, let's do 10%. Example: Women 1 (first baby)- start default 0%, max pregnancy - 120% @ 40 weeks,
 * final belly/postpartum size 10%... second pregnancy the max size adds +10% to both ending numbers so max 130%, ending
 * at 20% (and if the weeks aren't set for this one, it randomly picks between 38-42 weeks)... Example for Sarah: No start
 * is selected, but I want her starting to be 15%, and ending up at 130% at 41 weeks, ending up with a final belly size of
 * 25%." Of the twins' own bigger belly, 175% at week 37: "My rules on top". And his correction that evening, the rule as
 * it stands:
 *
 *   "I meant if a woman has triplets for example, she gains +20% to her starting number vs +10% for only one baby.
 *    Single: start 5%, birth 120%, end 15, 2nd birth 130%, end 25%, 3rd birth 140%, end 35%.
 *    Twins: start 10%, birth 175%, end 25%, 2nd birth (single this time) 185%, end 35%.
 *    Triplets: start 20%, birth 180%, end 40%, 2nd birth (single this time) 190%, end 50%.
 *    Single always adds +10% to belly size for pregnancy and after, twins +15%, and triplets +20%."
 *
 * Her START, her BIGGEST at its week and her END follow her counter when they are not typed; what is typed wins; a
 * character from before the counter keeps the chart she was saved with; and the numbers are all there is here -- a game
 * picks her week and moves her between them.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_BOOK, exportBook, importBook, saveInto, type SavedBody, type SavedClothes } from '../src/sarahlab/characterSaves';
import { NO_RULES } from '../src/actor/bodyRandom';
import { controlSpec } from '../src/actor/bodyShape';
import { bumpForWeek, chartBump, DELIVERY_WEEKS, herChart, herWeek, ruleBiggest, ruleFirst, weekForBump } from '../src/sarahlab/baby';
import {
  BIRTH_KINDS, NO_BIRTHS, PREGNANCY_DEFAULT, PREGNANCY_OPENING, PREGNANCY_RANGE, PREGNANCY_RULE, bellySetting, bellySize, birthKind, birthsAdded, birthsCount, bornTo, numbersLine, ordinal,
  pickDeliveryWeek, pregnancyOf, readPregnancy, ruleEnd, ruleStart, typeBirths, typeWeek, type Births, type Pregnancy,
} from '../src/sarahlab/pregnancy';
import { SARAH_LOOK } from '../src/sarahlab/sarahLook';

/** her numbers in force: [START, BIGGEST, its week, END] */
const row = (p: Pregnancy, babies = 1): [number, number, number, number] => { const c = herChart(babies, p); return [c.firstWeekBump, c.deliveryBump, c.deliveryWeek, c.afterBump]; };
/** a woman counted, with what she has had */
const had = (births: Partial<Births> = {}, more: Partial<Pregnancy> = {}): Pregnancy => ({ ...PREGNANCY_OPENING, ...more, births: { ...NO_BIRTHS, ...births } });
const last = <T,>(a: readonly T[]): T => a[a.length - 1];
/**
 * A woman's pregnancies one after another, as a game steps them: she starts at `start`; after each birth one more of its
 * kind is on her counter and she starts where she ended. Each pregnancy's [START, BIGGEST, END].
 */
function life(start: number, pregnancies: readonly number[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  let births: Births = NO_BIRTHS, at = start;
  for (const babies of pregnancies) {
    const c = herChart(babies, had(births, { firstWeekBump: at }));
    out.push([c.firstWeekBump, c.deliveryBump, c.afterBump]);
    births = bornTo(births, babies); at = c.afterBump;
  }
  return out;
}

describe('the rule: every pregnancy adds its own amount to her belly for good', () => {
  it('the room opens her on her first baby: not pregnant, nothing typed, her counter at none', () => {
    expect(PREGNANCY_OPENING).toMatchObject({ pregnant: false, births: { single: 0, twins: 0, triplets: 0 }, week: null, firstWeekBump: null, deliveryBump: null, deliveryWeek: null, afterBump: null });
    expect(PREGNANCY_RULE.adds).toEqual({ 1: 10, 2: 15, 3: 20 });
  });
  it('from 0%: a first baby 0% -> 120% at week 40 -> 10%; a second 10 -> 130 -> 20; a third 20 -> 140 -> 30', () => {
    expect(row(had())).toEqual([0, 120, 40, 10]);
    expect(row(had({ single: 1 }))).toEqual([10, 130, 40, 20]);
    expect(row(had({ single: 2 }))).toEqual([20, 140, 40, 30]);
  });
  it('his three women, as he wrote them', () => {
    // "Single: start 5%, birth 120%, end 15, 2nd birth 130%, end 25%, 3rd birth 140%, end 35%."
    expect(life(5, [1, 1, 1])).toEqual([[5, 120, 15], [15, 130, 25], [25, 140, 35]]);
    // "Twins: start 10%, birth 175%, end 25%, 2nd birth (single this time) 185%, end 35%."
    expect(life(10, [2, 1])).toEqual([[10, 175, 25], [25, 185, 35]]);
    // "Triplets: start 20%, birth 180%, end 40%, 2nd birth (single this time) 190%, end 50%."
    expect(life(20, [3, 1])).toEqual([[20, 180, 40], [40, 190, 50]]);
  });
  it('"she gains +20% to her starting number vs +10% for only one baby": her END is her START and what this one adds', () => {
    for (const start of [0, 5, 10, 20, 37]) {
      expect(row(had({}, { firstWeekBump: start }), 1)[3]).toBe(start + 10);
      expect(row(had({}, { firstWeekBump: start }), 2)[3]).toBe(start + 15);
      expect(row(had({}, { firstWeekBump: start }), 3)[3]).toBe(start + 20);
    }
    expect(ruleEnd(195, 3)).toBe(200);
  });
  it('her BIGGEST does not move with her START: "start 5%, birth 120%"', () => {
    for (const start of [0, 5, 15, 40]) {
      expect(row(had({}, { firstWeekBump: start }), 1)[1]).toBe(120);
      expect(row(had({}, { firstWeekBump: start }), 2)[1]).toBe(175);
      expect(row(had({}, { firstWeekBump: start }), 3)[1]).toBe(180);
      expect(row(had({ twins: 1 }, { firstWeekBump: start }), 1)[1]).toBe(185);
    }
  });
  it('"single always adds +10% to belly size for pregnancy and after, twins +15%, and triplets +20%": each after the first adds its own to her last', () => {
    // (every order of up to four pregnancies: her BIGGEST and her END each go up by this pregnancy's amount -- and her
    // BIGGEST by 50 more the first time she carries more than one, when it becomes what they need -- no further than a
    // size goes, 215%)
    const orders: number[][] = [[]];
    for (let k = 0; k < 4; k++) for (const o of orders.filter((x) => x.length === k)) for (const b of [1, 2, 3]) orders.push([...o, b]);
    expect(orders.length).toBe(1 + 3 + 9 + 27 + 81);
    for (const order of orders.filter((o) => o.length >= 2)) {
      const steps = life(0, order);
      for (let k = 1; k < steps.length; k++) {
        const add = PREGNANCY_RULE.adds[order[k]], firstMultiples = order[k] > 1 && order.slice(0, k).every((b) => b === 1);
        expect(steps[k][0], `${order}: START ${k}`).toBe(steps[k - 1][2]);
        expect(steps[k][2] - steps[k - 1][2], `${order}: END ${k}`).toBe(add);
        expect(steps[k][1], `${order}: BIGGEST ${k}`).toBe(Math.min(215, steps[k - 1][1] + add + (firstMultiples ? 50 : 0)));
      }
    }
  });
  it('twins after one baby are 185% too -- their 175% and the 10% she had kept: the same number whichever came first', () => {
    expect(life(0, [1, 2])[1]).toEqual([10, 185, 25]);
    expect(life(0, [2, 1])[1]).toEqual([15, 185, 25]);
    // (said without the order: every pregnancy adds its amount on top of a floor -- the biggest need less its own amount)
    expect(ruleFirst(1) - PREGNANCY_RULE.adds[1]).toBe(110); expect(ruleFirst(2) - PREGNANCY_RULE.adds[2]).toBe(160); expect(ruleFirst(3) - PREGNANCY_RULE.adds[3]).toBe(160);
    for (const [a, b] of [[[1, 1, 2], [2, 1, 1]], [[1, 2, 1], [1, 1, 2]], [[3, 2], [2, 3]], [[1, 3, 1], [3, 1, 1]]] as const) expect(last(life(0, a))[1]).toBe(last(life(0, b))[1]);
    expect(last(life(0, [1, 1, 2]))).toEqual([20, 195, 35]);
    expect(last(life(0, [3, 2]))).toEqual([20, 195, 35]);
  });
  it('her belly reaches its BIGGEST at her delivery week: a first baby\'s 120% is the chart\'s week 40', () => {
    const first = had({}, { pregnant: true });
    expect(herWeek(120, 1, first)).toBeCloseTo(40, 9);
    expect(herWeek(0, 1, first)).toBe(12);
    expect(herWeek(60, 1, first)).toBeCloseTo(26, 9);
    expect(herWeek(100, 1, first)).toBeCloseTo(35.33, 2);
    // (and past it the chart's own growth, as before)
    expect(chartBump(150, 1, first)).toBeCloseTo(130, 9);
    // a second baby's chart is the first's, 10% further up her slider
    for (const b of [10, 40, 73, 130, 160]) expect(chartBump(b, 1, had({ single: 1 }))).toBeCloseTo(chartBump(b - 10, 1, first), 9);
    // one baby after twins: her 185% belly is week 40
    expect(herWeek(185, 1, had({ twins: 1 }))).toBeCloseTo(40, 9);
  });
  it('twins and triplets keep their own bigger bellies as a first pregnancy, and their chart is still the chart', () => {
    expect(ruleFirst(1)).toBe(120); expect(ruleFirst(2)).toBe(175); expect(ruleFirst(3)).toBe(180);
    expect(ruleFirst(2)).toBe(bumpForWeek(DELIVERY_WEEKS[2], 2)); expect(ruleFirst(3)).toBe(bumpForWeek(DELIVERY_WEEKS[3], 3));
    expect(row(had(), 2)).toEqual([0, 175, 37, 15]);
    expect(row(had(), 3)).toEqual([0, 180, 34, 20]);
    for (const babies of [2, 3]) for (const b of [0, 30, 73, 100, 150, 175, 200]) {
      expect(chartBump(b, babies, had())).toBeCloseTo(b, 9);
      expect(herWeek(b, babies, had())).toBeCloseTo(weekForBump(b, babies), 9);
    }
    // after one baby, twins: she starts 10% up, and so does all of their chart
    expect(row(had({ single: 1 }), 2)).toEqual([10, 185, 37, 25]);
    expect(chartBump(110, 2, had({ single: 1 }))).toBeCloseTo(100, 9);
  });
  it('her baby is never bigger for her belly by the rule than on the chart: the chart\'s % is at most her own', () => {
    for (const single of [0, 1, 3, 8, 20]) for (const twins of [0, 1, 4]) for (const triplets of [0, 2]) for (const babies of [1, 2, 3]) for (let b = 0; b <= 215; b += 5) {
      const p = had({ single, twins, triplets }), on = chartBump(b, babies, p);
      expect(on).toBeGreaterThanOrEqual(0); expect(on).toBeLessThanOrEqual(b + 1e-9);
      expect(herWeek(b, babies, p)).toBeLessThanOrEqual(weekForBump(b, babies) + 1e-9);
    }
  });
  it('nothing the rule gives is past what a size can be, however many she has had: her BIGGEST to 215%, her START and END on the slider', () => {
    for (let single = 0; single <= PREGNANCY_RANGE.births[1]; single += 2) for (let twins = 0; twins <= PREGNANCY_RANGE.births[1]; twins += 5) for (let triplets = 0; triplets <= PREGNANCY_RANGE.births[1]; triplets += 5) for (const babies of [1, 2, 3]) {
      const [start, biggest, , end] = row(had({ single, twins, triplets }), babies);
      expect(start).toBeGreaterThanOrEqual(0); expect(biggest).toBeLessThanOrEqual(215); expect(end).toBeLessThanOrEqual(200);
      expect(start).toBeLessThan(biggest); expect(end).toBeGreaterThan(start);
      expect(biggest).toBeGreaterThanOrEqual(ruleFirst(babies));
    }
    // (what she keeps stops adding once a first baby's BIGGEST has no more room under 215%: 95%)
    expect(ruleStart({ single: 9, twins: 0, triplets: 0 })).toBe(90); expect(ruleStart({ single: 20, twins: 20, triplets: 20 })).toBe(95);
    expect(row(had({ single: 9 }))).toEqual([90, 210, 40, 100]);
    expect(row(had({ single: 20 }))).toEqual([95, 215, 40, 105]);
    expect(birthsAdded({ single: 2, twins: 1, triplets: 1 })).toBe(55); expect(birthsCount({ single: 2, twins: 1, triplets: 1 })).toBe(4);
    expect(ruleBiggest({ single: 0, twins: 3, triplets: 3 }, 3)).toBe(215);
  });
});

describe('past the belly slider: "anything past the 200% default slider will carry over into the extra depth slider which can go an additional +15%"', () => {
  it('a size runs to 215%: the belly slider\'s 200% and the Depth control\'s own top', () => {
    expect(PREGNANCY_RANGE.bump).toEqual([0, 200]);
    expect(controlSpec('bellyDepth').max).toBe(15);
    expect(PREGNANCY_RANGE.size).toEqual([0, 200 + controlSpec('bellyDepth').max]);
  });
  it('her belly\'s size is her belly slider\'s %, and at its top what her Depth adds; below the top her Depth is her shape, not her size', () => {
    expect(bellySize(73, 0)).toBe(73); expect(bellySize(73, 15)).toBe(73); expect(bellySize(199, 15)).toBe(199);
    expect(bellySize(200, 0)).toBe(200); expect(bellySize(200, 10)).toBe(210); expect(bellySize(200, 15)).toBe(215);
    // (a Depth taken in is not a smaller size, and nothing is past 215)
    expect(bellySize(200, -15)).toBe(200); expect(bellySize(200, 40)).toBe(215); expect(bellySize(260, 15)).toBe(215);
    expect(bellySize(-5, 3)).toBe(0); expect(bellySize(Number.NaN, Number.NaN)).toBe(0);
  });
  it('and a size is shown by her belly slider, with what is past its top on her Depth', () => {
    expect(bellySetting(130)).toEqual({ bump: 130, depth: 0 });
    expect(bellySetting(200)).toEqual({ bump: 200, depth: 0 });
    expect(bellySetting(210)).toEqual({ bump: 200, depth: 10 });
    expect(bellySetting(400)).toEqual({ bump: 200, depth: 15 });
    for (const size of [0, 40, 185, 200, 203, 215]) { const set = bellySetting(size); expect(bellySize(set.bump, set.depth)).toBe(size); }
  });
  it('a fourth pregnancy that the rule takes to 210% reaches her week 40 there: her slider at its top and her Depth at +10', () => {
    const p = had({ single: 2, triplets: 1 }, { pregnant: true });
    expect(row(p)).toEqual([40, 210, 40, 50]);
    expect(herWeek(bellySize(200, 10), 1, p)).toBeCloseTo(40, 9);
    expect(herWeek(bellySize(200, 0), 1, p)).toBeLessThan(40);
    // (her BIGGEST may be typed that far, and an exact week typed for a belly that size is kept)
    expect(readPregnancy({ deliveryBump: 212, firstWeekBump: 212, afterBump: 212, week: 39, weekAtBump: 212 })).toMatchObject({ deliveryBump: 212, firstWeekBump: 200, afterBump: 200, weekAtBump: 212 });
    expect(readPregnancy({ deliveryBump: 400 }).deliveryBump).toBe(215);
    expect(typeWeek(p, 39, bellySize(200, 12)).weekAtBump).toBe(212);
  });
});

describe('what is typed wins over the rule', () => {
  const sarah = had({}, { firstWeekBump: 15, deliveryBump: 130, deliveryWeek: 41 });
  it('his Sarah: starts 15%, 130% at week 41, and ends 25% -- typed or not, her END is her START and 10%', () => {
    expect(row(sarah)).toEqual([15, 130, 41, 25]);
    expect(row({ ...sarah, afterBump: 25 })).toEqual([15, 130, 41, 25]);
    expect(row({ ...sarah, afterBump: 40 })[3]).toBe(40);
    expect(herWeek(130, 1, sarah)).toBeCloseTo(41, 9);
    expect(herWeek(15, 1, sarah)).toBe(12);
    expect(herChart(1, sarah).unused).toEqual([]);
  });
  it('her BIGGEST is her size at whichever week she delivers: the week typed moves the week, not the size', () => {
    for (const week of [38, 39, 40, 41, 42]) {
      const p = had({ single: 1 }, { pregnant: true, deliveryWeek: week });
      expect(row(p)).toEqual([10, 130, week, 20]);
      expect(herWeek(130, 1, p)).toBeCloseTo(week, 9);
    }
  });
  it('the exact week for a belly % still holds, between her START and her BIGGEST', () => {
    const p = typeWeek(had({}, { pregnant: true }), 32, 73);
    expect(herWeek(73, 1, p)).toBeCloseTo(32, 9);
    expect(herWeek(120, 1, p)).toBeCloseTo(40, 9);
    expect(herChart(1, p).unused).toEqual([]);
    // (and what she has not typed still gives way to it: a week 40 typed for her 100% is her BIGGEST there)
    const full = typeWeek(had({}, { pregnant: true }), 40, 100);
    expect(herChart(1, full)).toMatchObject({ deliveryBump: 100, unused: [] });
    expect(herWeek(100, 1, full)).toBeCloseTo(40, 9);
  });
  it('a START typed at or past the rule\'s BIGGEST leaves her a pregnancy above it, and nothing is called unused', () => {
    const round = herChart(1, had({}, { firstWeekBump: 150 }));
    expect(round.firstWeekBump).toBe(150); expect(round.deliveryBump).toBeGreaterThan(150); expect(round.unused).toEqual([]);
  });
});

describe('a character from before the counter keeps the chart she was saved with', () => {
  it('no count: her numbers are the chart\'s own, one baby 0% -> 100% at week 40, and her chart is the chart', () => {
    expect(PREGNANCY_DEFAULT.births).toBeNull();
    expect(row(PREGNANCY_DEFAULT)).toEqual([0, 100, 40, 10]);
    expect(row(PREGNANCY_DEFAULT, 2)).toEqual([0, 175, 37, 15]);
    expect(herChart(1, PREGNANCY_DEFAULT).ruled).toBe(false); expect(herChart(1, PREGNANCY_OPENING).ruled).toBe(true);
    for (const babies of [1, 2, 3]) for (const b of [0, 30, 73, 100, 120, 200]) expect(chartBump(b, babies, PREGNANCY_DEFAULT)).toBe(b);
    expect(row({ ...PREGNANCY_DEFAULT, firstWeekBump: 30 })).toEqual([30, 100, 40, 40]);
  });
  it('a record with no counter in it is read as not counted, and one with a counter as it says', () => {
    expect(readPregnancy({ pregnant: true }).births).toBeNull();
    expect(readPregnancy({ pregnant: true, firstWeekBump: 5, deliveryBump: 110, deliveryWeek: 39 })).toEqual({ ...PREGNANCY_DEFAULT, firstWeekBump: 5, deliveryBump: 110, deliveryWeek: 39 });
    expect(readPregnancy({ births: { single: 2, twins: 1, triplets: 0 }, afterBump: 30 })).toMatchObject({ births: { single: 2, twins: 1, triplets: 0 }, afterBump: 30 });
    // (an imported file is untrusted: brought into range, each of her counter's three whole, one left out none)
    expect(readPregnancy({ births: { single: 2.6, twins: -4, triplets: 99 }, afterBump: 500 })).toMatchObject({ births: { single: 3, twins: 0, triplets: 20 }, afterBump: 200 });
    expect(readPregnancy({ births: { twins: 1, more: 7 } }).births).toEqual({ single: 0, twins: 1, triplets: 0 });
    expect(readPregnancy({ births: {} }).births).toEqual(NO_BIRTHS);
    for (const not of [2, 'two', [1, 0, 0], true]) expect(readPregnancy({ births: not, afterBump: '30' })).toMatchObject({ births: null, afterBump: null });
  });
  it('Sarah as he saved her is from before: everything measured on her in the room was measured on the chart', () => {
    expect(SARAH_LOOK).not.toBeNull();
    const hers = pregnancyOf(SARAH_LOOK!.body);
    expect(hers).toEqual(PREGNANCY_DEFAULT);
    expect(herWeek(SARAH_LOOK!.body.bump, 1, hers)).toBe(weekForBump(73));
  });
  it('one of her counter\'s three typed counts her; cleared, she has no count again', () => {
    expect(typeBirths(PREGNANCY_DEFAULT, 'twins', 1).births).toEqual({ single: 0, twins: 1, triplets: 0 });
    expect(typeBirths(had({ twins: 1 }), 'single', 2.4).births).toEqual({ single: 2, twins: 1, triplets: 0 });
    expect(typeBirths(had({ twins: 1 }), 'twins', 500).births!.twins).toBe(20);
    // (a box left blank: none of that kind, once she is counted; and nothing at all for a woman not counted)
    expect(typeBirths(had({ single: 2, twins: 1 }), 'twins', null).births).toEqual({ single: 2, twins: 0, triplets: 0 });
    expect(typeBirths(PREGNANCY_DEFAULT, 'single', null).births).toBeNull();
    expect(typeBirths(had({ single: 2 }), null, null).births).toBeNull();
    expect(typeBirths(PREGNANCY_DEFAULT, 'single', 0).births).toEqual(NO_BIRTHS);
  });
  it('her new numbers are kept per character in her save, and read back as they were', () => {
    const clothes = null as unknown as SavedClothes;
    const sarah: Pregnancy = { ...PREGNANCY_OPENING, pregnant: true, firstWeekBump: 15, deliveryBump: 130, deliveryWeek: 41, afterBump: 25 }, lena = had({ single: 1, twins: 1 });
    const body = (pregnancy: Pregnancy): SavedBody => ({ model: 'v2-body', bump: 20, shape: '{"version":1,"shape":{}}', refine: false, random: NO_RULES, pregnancy });
    let book = saveInto(EMPTY_BOOK, 'Sarah', 'all', body(sarah), clothes, 't1');
    book = saveInto(book, 'Lena', 'all', body(lena), clothes, 't2');
    book = saveInto(book, 'Before', 'all', body(PREGNANCY_DEFAULT), clothes, 't3');
    const back = importBook(exportBook(book));
    const of = (name: string) => pregnancyOf(back!.characters.find((c) => c.name === name)!.body!);
    expect(of('Sarah')).toEqual(sarah); expect(of('Lena')).toEqual(lena); expect(of('Before')).toEqual(PREGNANCY_DEFAULT);
    expect(row(of('Lena'))).toEqual([25, 195, 40, 35]);
  });
});

describe('for a game: her delivery week picked, and her counter after a birth', () => {
  it('a week not typed is picked from 38 to 42 for one baby, each whole week as likely as the next', () => {
    expect(PREGNANCY_RULE.weeks[1]).toEqual([38, 42]);
    expect(pickDeliveryWeek(1, () => 0)).toBe(38); expect(pickDeliveryWeek(1, () => 0.999999)).toBe(42); expect(pickDeliveryWeek(1, () => 1)).toBe(42);
    expect([0.1, 0.3, 0.5, 0.7, 0.9].map((r) => pickDeliveryWeek(1, () => r))).toEqual([38, 39, 40, 41, 42]);
    expect(pickDeliveryWeek(1, () => Number.NaN)).toBe(38);
    const seen = new Set<number>(); let seed = 7;
    for (let i = 0; i < 400; i++) { seed = (seed * 9301 + 49297) % 233280; const w = pickDeliveryWeek(1, () => seed / 233280); expect(Number.isInteger(w)).toBe(true); seen.add(w); }
    expect([...seen].sort()).toEqual([38, 39, 40, 41, 42]);
  });
  it('what is picked from is centred on the week the room draws her chart at, for one baby, twins and triplets', () => {
    for (const babies of [1, 2, 3]) {
      const [lo, hi] = PREGNANCY_RULE.weeks[babies];
      expect((lo + hi) / 2).toBe(DELIVERY_WEEKS[babies]);
      expect(herChart(babies, had()).deliveryWeek).toBe(DELIVERY_WEEKS[babies]);
      for (const r of [0, 0.5, 0.99]) { const w = pickDeliveryWeek(babies, () => r); expect(w).toBeGreaterThanOrEqual(lo); expect(w).toBeLessThanOrEqual(hi); expect(w).toBeGreaterThanOrEqual(PREGNANCY_RANGE.deliveryWeek[0]); }
    }
  });
  it('a birth puts one more of its kind on her counter', () => {
    expect(BIRTH_KINDS).toEqual(['single', 'twins', 'triplets']);
    expect([1, 2, 3, 0, 7, Number.NaN].map(birthKind)).toEqual(['single', 'twins', 'triplets', 'single', 'triplets', 'single']);
    expect(bornTo(NO_BIRTHS, 1)).toEqual({ single: 1, twins: 0, triplets: 0 });
    expect(bornTo(bornTo(bornTo(null, 2), 1), 2)).toEqual({ single: 1, twins: 2, triplets: 0 });
    expect(bornTo({ single: 0, twins: 0, triplets: 20 }, 3).triplets).toBe(20);
    expect(NO_BIRTHS).toEqual({ single: 0, twins: 0, triplets: 0 });
  });
});

describe('her numbers as the room\'s one line', () => {
  it('says which pregnancy this is and her three numbers in force', () => {
    expect(numbersLine(had(), herChart(1, had()), 1)).toBe('1st pregnancy · starts 0% · biggest 120% at week 40 (not typed: a game picks 38 to 42) · ends 10%');
    expect(numbersLine(had({ single: 1 }), herChart(1, had({ single: 1 })), 1)).toBe('2nd pregnancy · starts 10% · biggest 130% at week 40 (not typed: a game picks 38 to 42) · ends 20%');
    expect(numbersLine(had({ twins: 1 }), herChart(1, had({ twins: 1 })), 1)).toBe('2nd pregnancy · starts 15% · biggest 185% at week 40 (not typed: a game picks 38 to 42) · ends 25%');
    const sarah = had({}, { firstWeekBump: 15, deliveryBump: 130, deliveryWeek: 41 });
    expect(numbersLine(sarah, herChart(1, sarah), 1)).toBe('1st pregnancy · starts 15% · biggest 130% at week 41 · ends 25%');
    expect(numbersLine(had(), herChart(2, had()), 2)).toBe('1st pregnancy · starts 0% · biggest 175% at week 37 (not typed: a game picks 36 to 38) · ends 15%');
    expect(numbersLine(had({ single: 2, triplets: 1 }), herChart(1, had({ single: 2, triplets: 1 })), 1)).toBe('4th pregnancy · starts 40% · biggest 210% at week 40 (not typed: a game picks 38 to 42) · ends 50%');
    expect(numbersLine(PREGNANCY_DEFAULT, herChart(1, PREGNANCY_DEFAULT), 1)).toBe("no baby count: the chart's own · starts 0% · biggest 100% at week 40 (not typed: a game picks 38 to 42) · ends 10%");
  });
  it('counts in words a reader expects', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });
});
