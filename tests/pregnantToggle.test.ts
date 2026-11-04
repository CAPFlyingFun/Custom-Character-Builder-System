/**
 * P5, PREGNANT on or off (sarahLabTool `isPregnant`, `pregnantLine`): her body control `pregnancyWeeks`, so it is kept
 * per character in her save -- the card's test: two characters with the same body, one pregnant and one not, saved
 * and read back each as she was.
 */
import { describe, expect, it } from 'vitest';
import { defaultBodyShape, parseShape, serializeShape } from '../src/actor/bodyShape';
import { EMPTY_BOOK, exportBook, importBook, saveInto, type SavedBody, type SavedClothes } from '../src/sarahlab/characterSaves';
import { NO_RULES } from '../src/actor/bodyRandom';
import { PREGNANT_WEEKS_DEFAULT, isPregnant, pregnantLine } from '../src/sarahlab/sarahLabTool';

describe('PREGNANT on or off', () => {
  it('is her Pregnancy control: 0 weeks is not pregnant, any week is', () => {
    expect(isPregnant(0)).toBe(false);
    expect(isPregnant(32)).toBe(true);
    expect(isPregnant(Number.NaN)).toBe(false);
    expect(pregnantLine(0)).toBe('PREGNANT · OFF');
    expect(pregnantLine(32)).toBe('PREGNANT · ON (32 wk)');
  });
  it('the approved body starts pregnant at full term, as she always was', () => {
    expect(defaultBodyShape().pregnancyWeeks).toBe(PREGNANT_WEEKS_DEFAULT);
    expect(isPregnant(defaultBodyShape().pregnancyWeeks)).toBe(true);
  });
  it('two characters with the same body, one pregnant and one not, are saved and read back each as she was', () => {
    const same = { ...defaultBodyShape(), bellyWidth: 4 };
    const body = (weeks: number): SavedBody => ({ model: 'v2-body', bump: 50, shape: serializeShape({ ...same, pregnancyWeeks: weeks }), refine: true, random: NO_RULES });
    const clothes = null as unknown as SavedClothes;
    let book = saveInto(EMPTY_BOOK, 'Sarah', 'all', body(32), clothes, 't1');
    book = saveInto(book, 'Lena', 'all', body(0), clothes, 't2');
    const back = importBook(exportBook(book));
    expect(back).not.toBeNull();
    const shapeOf = (name: string) => parseShape(back!.characters.find((c) => c.name === name)!.body!.shape);
    expect(isPregnant(shapeOf('Sarah').pregnancyWeeks)).toBe(true);
    expect(shapeOf('Sarah').pregnancyWeeks).toBe(32);
    expect(isPregnant(shapeOf('Lena').pregnancyWeeks)).toBe(false);
    // (and the rest of her body, and her belly's size -- her look -- the same for both)
    expect(shapeOf('Lena').bellyWidth).toBe(shapeOf('Sarah').bellyWidth);
    expect(back!.characters.find((c) => c.name === 'Lena')!.body!.bump).toBe(50);
  });
});
