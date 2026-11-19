import { describe, expect, it } from 'vitest';
import { bookFor, packExport, picturesUsed, unpackImport } from '../src/sarahlab/characterExport';
import { importBook, sanitizeBook, type CharacterBook } from '../src/sarahlab/characterSaves';
import { samePick, DEFAULT_CHOICE } from '../src/sarahlab/fabricLibrary';

// Joshua, 2026-11-19: "when exporting, you can select 1, multiple, or all"; "a zip with JSON + image if a custom image was used"
const IMG = '0123456789abcdef', IMG2 = 'fedcba9876543210';
const layer = (image?: string) => ({ choice: { ...DEFAULT_CHOICE, fabric: { family: 'flat', colour: 0, ...(image ? { image } : {}) } }, detail: { nipple: 0, navel: 0 }, template: { id: 'tee', params: {} }, mask: '' });
const clothes = (image?: string) => ({ outfit: 'x', shirtLength: 0, layers: [layer(image)], garments: {} });
const raw = {
  version: 1,
  characters: [
    { name: 'Lena', savedAt: 't', body: null, clothes: clothes(IMG) },
    { name: 'Sarah', savedAt: 't', body: null, clothes: { basedOn: 'Red set', overrides: { layers: [], garments: {}, shirtLength: null } } },
    { name: 'Ana', savedAt: 't', body: null, clothes: clothes() },
  ],
  outfits: [
    { name: 'Red set', savedAt: 't', clothes: clothes(IMG2) },
    { name: 'Other', savedAt: 't', clothes: clothes() },
  ],
};
const book: CharacterBook = sanitizeBook(raw);

describe('a picture of his own in a save', () => {
  it('is kept by its id, and an id that is not one is dropped', () => {
    expect(book.characters[0].clothes && 'layers' in book.characters[0].clothes && book.characters[0].clothes.layers[0]?.choice.fabric?.image).toBe(IMG);
    const bad = sanitizeBook({ ...raw, characters: [{ name: 'B', savedAt: 't', body: null, clothes: clothes('../evil') }], outfits: [] });
    const c = bad.characters[0].clothes;
    expect(c && 'layers' in c && c.layers[0]?.choice.fabric?.image).toBeUndefined();
  });
  it('makes two picks of the same family and colour different fabrics', () => {
    expect(samePick({ family: 'flat', colour: 0, image: IMG }, { family: 'flat', colour: 0 })).toBe(false);
    expect(samePick({ family: 'flat', colour: 0, image: IMG }, { family: 'flat', colour: 0, image: IMG })).toBe(true);
  });
});

describe('EXPORT: one, some or all', () => {
  it('takes the chosen characters and the outfits their clothes are based on', () => {
    const one = bookFor(book, ['sarah'], false);
    expect(one.characters.map((c) => c.name)).toEqual(['Sarah']);
    expect(one.outfits.map((o) => o.name)).toEqual(['Red set']);
    expect(bookFor(book, ['Ana', 'Lena'], false).outfits).toEqual([]);
    expect(bookFor(book, ['Ana'], true).outfits.map((o) => o.name)).toEqual(['Red set', 'Other']);
    expect(bookFor(book, book.characters.map((c) => c.name), true).characters).toHaveLength(3);
  });
  it('knows which pictures go with them', () => {
    expect(picturesUsed(bookFor(book, ['Lena'], false))).toEqual([IMG]);
    expect(picturesUsed(bookFor(book, ['Sarah'], false))).toEqual([IMG2]);
    expect(picturesUsed(bookFor(book, ['Ana'], false))).toEqual([]);
  });
  it('is the .json it always was with no picture, and a .zip of the .json and the pictures with one', () => {
    const plain = packExport(bookFor(book, ['Ana'], false), [], 'character-ana');
    expect(plain.name).toBe('character-ana.json');
    expect(typeof plain.data).toBe('string');
    const back = unpackImport(new TextEncoder().encode(plain.data as string))!;
    expect(importBook(back.text)?.characters.map((c) => c.name)).toEqual(['Ana']);

    const bytes = new Uint8Array([0xff, 0xd8, 1, 2, 3, 4]);
    const zip = packExport(bookFor(book, ['Lena'], false), [{ id: IMG, type: 'image/jpeg', bytes }], 'character-lena');
    expect(zip.name).toBe('character-lena.zip');
    const got = unpackImport(zip.data as Uint8Array)!;
    expect(importBook(got.text)?.characters.map((c) => c.name)).toEqual(['Lena']);
    expect(got.pictures).toEqual([{ id: IMG, type: 'image/jpeg', bytes }]);
  });
  it('refuses a file that is neither', () => {
    expect(unpackImport(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9]))).toBeNull();
    expect(importBook(unpackImport(new TextEncoder().encode('hello'))!.text)).toBeNull();
  });
});
