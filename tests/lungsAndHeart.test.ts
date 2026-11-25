/**
 * A CHARACTER'S OWN LUNGS AND HEART (actor/vitals.ts `Lungs`, `Heart`; Galaxy Defender, 2026-11-25: "John, on the male
 * base body, breathes and beats exactly like Mary"; "Per-character lung settings, saved with the character and in its
 * JSON export, as customizable defaults (not fixed by sex)"):
 * - the female body's are exactly the numbers she always breathed by: Mary does not change by a single breath, with them
 *   passed or left out, at rest, walking and at her hardest, pregnant or not;
 * - the male base body's: 65 beats at rest, 208 - 0.7 x his age at his peak; at his hardest about 46 breaths a minute
 *   moving 110 to 120 L a minute;
 * - a pregnancy's changes are laid on top of whatever lungs and heart;
 * - lungs change how much air moves, never how long a body lasts;
 * - they are kept with a saved body and in its JSON export, each number held to its range, a save from before reading as
 *   its model's own.
 */
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY, FEMALE_HEART, FEMALE_LUNGS, HEART_RANGE, LUNG_RANGE, MALE_HEART, MALE_LUNGS, breathDepth, heartDefault, lungsDefault,
  peakHeart, readHeart, readLungs, restingVitals, stepVitals, vitalsFor, type Heart, type Lungs, type VitalsBody,
} from '../src/actor/vitals';
import { exportBook, heartOf, importBook, lungsOf, saveInto, EMPTY_BOOK, type SavedBody } from '../src/sarahlab/characterSaves';

const MARY = { lungs: FEMALE_LUNGS, heart: FEMALE_HEART }, JOHN = { lungs: MALE_LUNGS, heart: MALE_HEART };

/** `seconds` of `intensity` then `rest` seconds resting, 1/30 s a step: every step's vitals. */
function trace(body: VitalsBody, intensity: number, seconds = 600, rest = 120) {
  const v = restingVitals(body.lungs), out: ReturnType<typeof stepVitals>[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) out.push(stepVitals(v, 1 / 30, intensity, body));
  for (let t = 0; t < rest; t += 1 / 30) out.push(stepVitals(v, 1 / 30, 0, body));
  return out;
}

describe("Mary: the female body's lungs and heart are the numbers she always breathed by", () => {
  it('passed or left out, every breath and beat is the same to the bit, pregnant or not, at any age', () => {
    for (const weeks of [0, 20, 40]) for (const age of [undefined, 18, 45]) for (let e = 0; e <= 1.0001; e += 0.05) for (const energy of [1, 0.4, 0]) {
      const a = vitalsFor(e, energy, { weeks, age }), b = vitalsFor(e, energy, { weeks, age, ...MARY });
      expect(b).toEqual(a);
    }
    for (const weeks of [0, 40]) for (const intensity of Object.values(ACTIVITY)) {
      const a = trace({ weeks }, intensity, 300, 60), b = trace({ weeks, ...MARY }, intensity, 300, 60);
      expect(b).toEqual(a);
    }
  });
  it('at rest, walking and at her hardest: as she breathed before (MEASURED off the code before this change)', () => {
    const rest = vitalsFor(0, 1), walk = vitalsFor(ACTIVITY.walk, 1), hard = vitalsFor(1, 1);
    expect([rest.breathsPerMinute, rest.tidalL, rest.beatsPerMinute]).toEqual([14, 0.5, 70]);
    expect(walk.breathsPerMinute).toBeCloseTo(15.996, 2); expect(walk.tidalL).toBeCloseTo(1.1025, 3); expect(walk.beatsPerMinute).toBeCloseTo(103.41, 2);
    expect(hard.breathsPerMinute).toBeCloseTo(46.92, 2); expect(hard.tidalL).toBeCloseTo(1.705, 6); expect(hard.beatsPerMinute).toBeCloseTo(181.36, 2);
    expect(hard.airLPerMin).toBeCloseTo(80, 6);
    expect(FEMALE_LUNGS).toEqual({ totalL: 4.2, vitalL: 3.1, tidalL: 0.5, perMinute: 14, tidalOfVital: 0.55, mostLPerMin: 80, mostPerMinute: 50 });
    expect(FEMALE_HEART).toEqual({ restPerMinute: 70, peakAt: 206, peakPerYear: 0.88 });
  });
});

describe("John: the male base body's defaults", () => {
  it('65 beats at rest, 208 - 0.7 x his age at his peak; half a litre 14 times a minute at rest', () => {
    const rest = vitalsFor(0, 1, JOHN);
    expect([rest.breathsPerMinute, rest.tidalL, rest.beatsPerMinute]).toEqual([14, 0.5, 65]);
    expect(peakHeart(28, MALE_HEART)).toBeCloseTo(208 - 0.7 * 28, 9);
    expect(vitalsFor(1, 1, { ...JOHN, age: 40 }).beatsPerMinute).toBeCloseTo(208 - 0.7 * 40, 9);
    expect(MALE_LUNGS).toEqual({ totalL: 6.0, vitalL: 4.7, tidalL: 0.5, perMinute: 14, tidalOfVital: 0.55, mostLPerMin: 120, mostPerMinute: 50 });
  });
  it('at his hardest about 46 breaths a minute, a breath 55% of his vital capacity, 110 to 120 L a minute', () => {
    const hard = vitalsFor(1, 1, JOHN);
    expect(hard.breathsPerMinute).toBeGreaterThan(45); expect(hard.breathsPerMinute).toBeLessThan(47);
    expect(hard.tidalL).toBeCloseTo(0.55 * 4.7, 9);
    expect(hard.airLPerMin).toBeGreaterThanOrEqual(110); expect(hard.airLPerMin).toBeLessThanOrEqual(120);
    // held at his hardest until he is spent: quicker and shallower, as she is -- never past 50 a minute
    const t = trace(JOHN, 1, 900, 0), last = t[t.length - 1];
    expect(last.energy).toBe(0);
    expect(Math.max(...t.map((x) => x.breathsPerMinute))).toBeLessThanOrEqual(50);
    expect(last.airLPerMin).toBeGreaterThan(105); expect(last.airLPerMin).toBeLessThan(120);
  });
  it('a game reads how hard his breathing works as his air over his most', () => {
    for (const [body, lungs] of [[MARY, FEMALE_LUNGS], [JOHN, MALE_LUNGS]] as const) {
      expect(vitalsFor(1, 1, body).airLPerMin / lungs.mostLPerMin).toBeCloseTo(1, 9);
      const now = trace(body, ACTIVITY.walk, 60, 0).pop()!;
      expect(now.airLPerMin).toBeCloseTo(now.tidalL * now.breathsPerMinute, 9);
    }
  });
});

describe("a pregnancy's changes are laid on top of a character's own", () => {
  it('a breath 40% bigger at term, 2 more a minute, her heart 12 higher, whatever her lungs and heart', () => {
    for (const body of [MARY, JOHN, { lungs: { ...MALE_LUNGS, tidalL: 0.6, perMinute: 12 }, heart: { ...MALE_HEART, restPerMinute: 58 } }]) {
      const not = vitalsFor(0, 1, body), term = vitalsFor(0, 1, { ...body, weeks: 40 });
      expect(term.tidalL / not.tidalL).toBeCloseTo(1.4, 9);
      expect(term.breathsPerMinute - not.breathsPerMinute).toBeCloseTo(2, 9);
      expect(term.beatsPerMinute - not.beatsPerMinute).toBeCloseTo(12, 9);
    }
  });
});

describe('bigger lungs move more air, and do not make anyone last longer', () => {
  it('his effort and his energy go exactly as hers at every activity', () => {
    for (const intensity of Object.values(ACTIVITY)) {
      const a = trace(MARY, intensity, 600, 120), b = trace(JOHN, intensity, 600, 120);
      for (let k = 0; k < a.length; k += 30) { expect(b[k].energy).toBe(a[k].energy); expect(b[k].effort).toBe(a[k].effort); }
    }
  });
});

describe('a drawn chest breathes by the breath\'s share of its own lungs', () => {
  it('hers is the litres over her quiet half litre, exactly; his hardest as deep as hers', () => {
    for (const t of [0.5, 0.69, 1.1, 1.705]) expect(breathDepth(t)).toBe(t / 0.5);
    expect(breathDepth(0.55 * 4.7, MALE_LUNGS)).toBeCloseTo(breathDepth(0.55 * 3.1), 9);
    expect(breathDepth(0.5, MALE_LUNGS)).toBeLessThan(1);
  });
});

describe('lungs and a heart as kept', () => {
  it('each number held to its range, a missing one the base\'s, her vital capacity never more than her total', () => {
    const l = readLungs({ totalL: 99, vitalL: 9, tidalL: 'x', perMinute: -5, mostLPerMin: NaN }, MALE_LUNGS);
    expect(l.totalL).toBe(LUNG_RANGE.totalL[1]);
    expect(l.vitalL).toBe(LUNG_RANGE.vitalL[1]);
    expect(l.tidalL).toBe(MALE_LUNGS.tidalL);
    expect(l.perMinute).toBe(LUNG_RANGE.perMinute[0]);
    expect(l.mostLPerMin).toBe(MALE_LUNGS.mostLPerMin);
    expect(readLungs({ totalL: 3, vitalL: 4 }).vitalL).toBe(3);
    expect(readLungs(null)).toEqual(FEMALE_LUNGS);
    expect(readHeart({ restPerMinute: 500, peakPerYear: 0.5 }, MALE_HEART)).toEqual({ restPerMinute: HEART_RANGE.restPerMinute[1], peakAt: 208, peakPerYear: 0.5 });
    expect(lungsDefault(true)).toBe(MALE_LUNGS); expect(heartDefault(false)).toBe(FEMALE_HEART);
  });
  it('are kept with a saved body and in its JSON export; a save from before reads as its model\'s own', () => {
    const body = (model: string, lungs?: Lungs, heart?: Heart): SavedBody => ({ model, bump: 0, shape: '', refine: false, random: { rules: {}, groups: [] }, ...(lungs ? { lungs } : {}), ...(heart ? { heart } : {}) });
    const johnLungs: Lungs = { ...MALE_LUNGS, vitalL: 5.2, mostLPerMin: 140 }, johnHeart: Heart = { ...MALE_HEART, restPerMinute: 58 };
    let book = saveInto(EMPTY_BOOK, 'John', 'body', body('male-base', johnLungs, johnHeart), { outfit: 'x', shirtLength: 0, layers: [], garments: {} }, 't');
    book = saveInto(book, 'Mary', 'body', body('v2-body', FEMALE_LUNGS, FEMALE_HEART), { outfit: 'x', shirtLength: 0, layers: [], garments: {} }, 't');
    const text = exportBook(book), json = JSON.parse(text);
    expect(json.characters.find((c: { name: string }) => c.name === 'John').body.lungs).toEqual(johnLungs);
    expect(json.characters.find((c: { name: string }) => c.name === 'John').body.heart).toEqual(johnHeart);
    const back = importBook(text)!;
    const john = back.characters.find((c) => c.name === 'John')!.body!, mary = back.characters.find((c) => c.name === 'Mary')!.body!;
    expect(lungsOf(john)).toEqual(johnLungs); expect(heartOf(john)).toEqual(johnHeart);
    expect(lungsOf(mary)).toEqual(FEMALE_LUNGS); expect(heartOf(mary)).toEqual(FEMALE_HEART);
    // from before: none kept, his model's own and hers
    expect(lungsOf(body('male-base'))).toBe(MALE_LUNGS); expect(heartOf(body('male-base'))).toBe(MALE_HEART);
    expect(lungsOf(body('v2-body'))).toBe(FEMALE_LUNGS); expect(heartOf(null)).toBe(FEMALE_HEART);
    // an imported number out of its range is held to it
    const odd = importBook(JSON.stringify({ version: 1, characters: [{ name: 'Odd', savedAt: 't', body: { ...body('male-base'), lungs: { tidalL: 40 } }, clothes: null }], outfits: [] }))!;
    expect(odd.characters[0].body!.lungs).toEqual({ ...MALE_LUNGS, tidalL: LUNG_RANGE.tidalL[1] });
  });
});
