/**
 * A skirt's draft (`src/sarahlab/skirt/skirtDraft.ts`): its three numbers, its ring's heights, how far an outline
 * reaches, and the outfits that wear one.
 */
import { describe, expect, it } from 'vitest';
import { ALL_ANCHORS, SKIRT_CUT, SKIRT_DEFAULTS, SKIRT_TOPS, anchorShare, anchorsOf, clampSkirt, fitOf, hemOf, reachOf, ringShare } from '../src/sarahlab/skirt/skirtDraft';
import { OUTFITS, SKIRTS, SKIRT_OVER_BAND, SKIRT_UNDER_BAND } from '../src/sarahlab/sarahLabTool';
import { RISES } from '../src/sarahlab/paintTemplates';

describe('a skirt, drafted', () => {
  it('holds its three numbers to what they may be', () => {
    expect(clampSkirt({})).toEqual(SKIRT_DEFAULTS);
    expect(clampSkirt({ top: 'under', length: 4, flare: -1 })).toEqual({ top: 'under', length: 1, flare: 0, tucked: false });
    expect(clampSkirt({ top: 'sideways' as never, length: NaN })).toEqual({ ...SKIRT_DEFAULTS });
  });
  it('hangs its ring a little under the painted waistband, over her belly or under it', () => {
    // her front, her sides, her back
    for (const top of ['over', 'under'] as const) {
      expect(ringShare(top, 0)).toBeCloseTo(SKIRT_TOPS[top].front, 6);
      expect(ringShare(top, Math.PI / 2)).toBeCloseTo(SKIRT_TOPS[top].side, 6);
      expect(ringShare(top, Math.PI)).toBeCloseTo(SKIRT_TOPS[top].back, 6);
      expect(ringShare(top, -Math.PI / 2)).toBeCloseTo(SKIRT_TOPS[top].side, 6);
    }
    // (over: between her bust, 0.56, and the top of her belly -- well over the high rise's waistband)
    expect(SKIRT_TOPS.over.front).toBeLessThan(SKIRT_OVER_BAND); expect(SKIRT_TOPS.over.front).toBeGreaterThan(SKIRT_OVER_BAND - 0.06); expect(SKIRT_TOPS.over.back).toBeGreaterThan(RISES.high.front + 0.08);
    expect(SKIRT_TOPS.under.front).toBeLessThan(0.125); expect(SKIRT_TOPS.under.back).toBeLessThan(0.2);
    expect(SKIRT_TOPS.under.front).toBeLessThan(SKIRT_TOPS.over.front - 0.15);
  });
  it('reads how far an outline reaches from a point inside it', () => {
    const square = [1, 1, -1, 1, -1, -1, 1, -1]; // (x, z) pairs
    expect(reachOf(square, 0, 0, 0)).toBeCloseTo(1, 9);             // toward her front (+z)
    expect(reachOf(square, 0, 0, Math.PI / 2)).toBeCloseTo(1, 9);   // toward her +x side
    expect(reachOf(square, 0, 0, Math.PI / 4)).toBeCloseTo(Math.SQRT2, 9);
    expect(reachOf(square, 0.5, 0, Math.PI / 2)).toBeCloseTo(0.5, 9);
    expect(reachOf([], 0, 0, 0)).toBe(0);
  });
  it('keeps a long skirt to as many rows as the cloth comes to rest with', () => {
    expect(SKIRT_CUT.mostRows).toBeLessThanOrEqual(36);
    expect(SKIRT_CUT.hold[0]).toBe(1);
  });
  // (Joshua, 2026-11-17: "Did you remove all the paint under the skirts? That would allow more flexibility for
  //  undergarments or none for birth, etc…"; "basically create a shell around the body as the skirt")
  it('is worn by the pilot outfits, each a garment of its own with no paint under it, put after everything there was', () => {
    // (the three with the cloth tee come after them: `tests/clothLayers.test.ts`)
    const worn = OUTFITS.filter((o) => o.skirt && !o.procedural);
    expect(worn.map((o) => o.name)).toEqual(SKIRTS.map(([name]) => name));
    for (const o of worn) {
      expect(o.skirt).toEqual(clampSkirt(o.skirt!));
      // nothing painted but the crop tee over it: no short, no waistband of the leggings whose line its ring is laid on
      expect(o.paint?.map((l) => l.template), o.name).toEqual(['cropTee']);
      expect(o.skirtTint, o.name).toBe(SKIRTS.find(([name]) => name === o.name)![1]);
    }
    for (const o of OUTFITS.filter((x) => x.skirt)) {
      expect((o.paint ?? []).some((l) => l.template === SKIRT_UNDER_BAND || l.template === 'shortsAthletic'), o.name).toBe(false);
      expect(o.skirtTint, o.name).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(SKIRTS.map(([, , s]) => s.top))).toEqual(new Set(['under']));
  });
  // (Joshua, 2026-11-17, of the pencil as cloth, which can not take her stride: "I would do 0% fit for the pencil skirt")
  it('the pencil lies on her (FIT 0); the A-line, the mini and the maxi are cloth (FIT 1)', () => {
    expect(SKIRTS.map(([name, , s]) => [name.split(' ')[1], fitOf(s)])).toEqual([['A-line', 1], ['mini', 1], ['maxi', 1], ['pencil', 0]]);
  });

  // (Joshua, 2026-11-17, three lines across a figure's legs: "0%", "50%", "100%")
  it('counts its length on her legs, as he drew it: 0 where her legs part, 1 the floor, straight between', () => {
    const joints = { hip: [[0.08, 0.9, 0], [-0.08, 0.9, 0]], knee: [[0.08, 0.5, 0], [-0.08, 0.5, 0]] } as never;
    expect(hemOf(joints, 0)).toBeCloseTo(0.9 - SKIRT_CUT.shortest * 0.4, 9);
    expect(hemOf(joints, 1)).toBeCloseTo(SKIRT_CUT.floorClear, 9);
    expect(hemOf(joints, 0.5)).toBeCloseTo((hemOf(joints, 0) + hemOf(joints, 1)) / 2, 9);
    expect(hemOf(joints, -3)).toBe(hemOf(joints, 0)); expect(hemOf(joints, 7)).toBe(hemOf(joints, 1));
    // (where her legs part is a fifth of the way to her knees and a little more: MEASURED on her, 0.22)
    expect(SKIRT_CUT.shortest).toBeGreaterThan(0.15); expect(SKIRT_CUT.shortest).toBeLessThan(0.3);
    // the outfits on that scale: a mini over her mid-thigh's height, an A-line by her knee, a pencil under it, a maxi to the floor
    const of = (word: string) => SKIRTS.find(([name]) => name.includes(word))![2].length, knee = (0.9 - 0.5) / (0.9 - SKIRT_CUT.floorClear);
    expect(hemOf(joints, of('mini'))).toBeGreaterThan(0.5 + 0.12); expect(of('mini')).toBeGreaterThan(0.08);
    expect(Math.abs(hemOf(joints, of('A-line')) - 0.5)).toBeLessThan(0.06);
    expect(hemOf(joints, of('pencil'))).toBeLessThan(0.5 - 0.05); expect(of('pencil')).toBeLessThan(knee + 0.2);
    expect(of('maxi')).toBe(1);
  });

  it('is held by four anchors: all four hold the whole ring, each its quarter, none of them nothing', () => {
    const none = { front: false, back: false, left: false, right: false };
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      expect(anchorShare(ALL_ANCHORS, a)).toBeCloseTo(1, 9);
      expect(anchorShare(none, a)).toBe(0);
    }
    const front = { ...none, front: true };
    expect(anchorShare(front, 0)).toBeCloseTo(1, 9); expect(anchorShare(front, Math.PI / 2)).toBeCloseTo(0, 9); expect(anchorShare(front, Math.PI)).toBeCloseTo(0, 9);
    expect(anchorShare(front, Math.PI / 4)).toBeCloseTo(0.5, 9);
    // +x is her left: a quarter turn from her front
    const left = { ...none, left: true };
    expect(anchorShare(left, Math.PI / 2)).toBeCloseTo(1, 9); expect(anchorShare(left, -Math.PI / 2)).toBeCloseTo(0, 9);
    // all four is said by saying nothing; one released is kept
    expect(clampSkirt({ top: 'over', length: 0.4, flare: 0.5 }).anchors).toBeUndefined();
    expect(clampSkirt({ top: 'over', length: 0.4, flare: 0.5, anchors: ALL_ANCHORS }).anchors).toBeUndefined();
    expect(anchorsOf(clampSkirt({ top: 'under', length: 0.4, flare: 0.5, anchors: { ...ALL_ANCHORS, back: false } }))).toEqual({ ...ALL_ANCHORS, back: false });
  });
});
