/**
 * A skirt's draft (`src/sarahlab/skirt/skirtDraft.ts`): its three numbers, its ring's heights, how far an outline
 * reaches, and the outfits that wear one.
 */
import { describe, expect, it } from 'vitest';
import { ALL_ANCHORS, SKIRT_CUT, SKIRT_DEFAULTS, SKIRT_TOPS, anchorShare, anchorsOf, clampSkirt, reachOf, ringShare } from '../src/sarahlab/skirt/skirtDraft';
import { OUTFITS, SKIRTS, SKIRT_OVER_BAND, SKIRT_UNDER_BAND, SKIRT_UNDER_LEGS } from '../src/sarahlab/sarahLabTool';
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
  it('is worn by the pilot outfits, each over a short painted in its colour, put after everything there was', () => {
    // (the three with the cloth tee come after them: `tests/clothLayers.test.ts`)
    const worn = OUTFITS.filter((o) => o.skirt && !o.procedural);
    expect(worn.map((o) => o.name)).toEqual(SKIRTS.map(([name]) => name));
    for (const o of worn) {
      // (under her belly its painted part is the under-belly leggings cut short, whose line its ring is laid on:
      // `tests/skirtLine.test.ts`; over it, the short shorts with their waistband in the crease under her bust)
      expect(o.paint?.[0].template, o.name).toBe(o.skirt!.top === 'under' ? SKIRT_UNDER_BAND : 'shortsAthletic');
      expect(o.skirt).toEqual(clampSkirt(o.skirt!));
      if (o.skirt!.top === 'under') expect(o.paint?.[0].dials, o.name).toEqual({ legEnd: SKIRT_UNDER_LEGS });
      else expect(o.paint?.[0].dials?.rise, o.name).toBe(SKIRT_OVER_BAND);
    }
    expect(new Set(SKIRTS.map(([, , s]) => s.top))).toEqual(new Set(['under']));
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
