/**
 * THE UNDER-BELLY WAISTBAND FOLLOWS HER BELLY (2026-11-23, `paintTemplates.UNDER_BELLY_FOLLOW`): his five settings of
 * WAISTBAND (FRONT) and HIPS & BACK RISE at 0, 50, 100, 150 and 200% of her belly, read between; its sliders move it on
 * top, kept at every size; FOLLOWS BELLY off keeps it where it is; a look saved before keeps hand-set numbers.
 */
import { describe, expect, it } from 'vitest';
import {
  COVERAGE_DIALS, COVERAGE_TEMPLATES, UNDER_BELLY_FOLLOW, canFollow, dialValue, followedAt, followedRises, withDial, withDialAt, withFollow, wornParams,
} from '../src/sarahlab/paintTemplates';
import { AUTO_DETAIL, EMPTY_BOOK, clothesFor, type SavedClothes } from '../src/sarahlab/characterSaves';
import type { CoverageParams } from '../src/sarahlab/paintTemplates';

/** Whether a character in leggings made with `b` wears the library outfit made with `a` (her clothes kept as a reference to it). */
function sameClothesMake(a: CoverageParams, b: CoverageParams): boolean {
  const dress = (params: CoverageParams): SavedClothes => ({
    outfit: 'painted under-belly leggings', shirtLength: 0.5, detail: AUTO_DETAIL, garments: {},
    layers: [{ choice: { fabric: { family: 'athletic', colour: 1 }, match: true } as never, detail: {} as never, template: { id: 'leggingsUnder', params }, mask: '' }],
  });
  const book = { ...EMPTY_BOOK, outfits: [{ name: 'Mine', savedAt: '', clothes: dress(a) }] };
  return 'basedOn' in clothesFor(book, dress(b), 'Mine');
}

const under = COVERAGE_TEMPLATES.find((t) => t.id === 'leggingsUnder')!.params;

describe('his settings, read between', () => {
  it('are his five at his five sizes', () => {
    const his = [[0, 0.13, 0.37], [50, -0.03, 0.33], [100, -0.06, 0.30], [150, -0.04, 0.27], [200, -0.05, 0.24]];
    for (const [b, front, back] of his) {
      const at = followedAt(under, b);
      expect(dialValue(at, 'rise'), `front at ${b}%`).toBeCloseTo(front, 6);
      expect(dialValue(at, 'riseBack'), `back at ${b}%`).toBeCloseTo(back, 6);
    }
    expect(UNDER_BELLY_FOLLOW.length).toBe(5);
  });
  it('runs straight between two, and holds at the ends', () => {
    expect(followedRises(25).front).toBeCloseTo(0.05, 6);
    expect(followedRises(25).back).toBeCloseTo(0.35, 6);
    expect(followedRises(125).front).toBeCloseTo(-0.05, 6);
    expect(followedRises(175).back).toBeCloseTo(0.255, 6);
    expect(followedRises(-10)).toEqual(followedRises(0));
    expect(followedRises(215)).toEqual(followedRises(200));
    expect(followedRises(Number.NaN)).toEqual(followedRises(0));
  });
  it('moves its sides with its back, as HIPS & BACK RISE does', () => {
    for (const b of [0, 73, 200]) {
      const at = followedAt(under, b), byHand = withDial(withDial(under, 'rise', followedRises(b).front), 'riseBack', followedRises(b).back);
      expect(at.riseSide).toBeCloseTo(byHand.riseSide!, 9);
      expect(at.riseFront).toBeCloseTo(byHand.riseFront!, 9);
    }
  });
  it('is the under-belly leggings\' alone', () => {
    expect(canFollow('leggingsUnder')).toBe(true);
    for (const t of COVERAGE_TEMPLATES) if (t.id !== 'leggingsUnder') {
      expect(canFollow(t.id), t.id).toBe(false);
      expect(followedAt(t.params, 150), t.id).toBe(t.params);
    }
  });
});

describe('its sliders on top', () => {
  it('keep what they moved it by at every size of her belly', () => {
    let p = followedAt(under, 100);
    p = withDialAt(p, 'rise', 0.02, 100); // his -0.06 there: 0.08 up
    p = withDialAt(p, 'riseBack', 0.28, 100); // his 0.30: 0.02 down
    expect(dialValue(p, 'rise')).toBeCloseTo(0.02, 6);
    for (const b of [0, 50, 150, 200]) {
      const at = followedAt(p, b);
      expect(dialValue(at, 'rise'), `${b}%`).toBeCloseTo(followedRises(b).front + 0.08, 6);
      expect(dialValue(at, 'riseBack'), `${b}%`).toBeCloseTo(followedRises(b).back - 0.02, 6);
    }
  });
  it('are held to their own ranges', () => {
    const rise = COVERAGE_DIALS.find((d) => d.id === 'rise')!;
    const p = withDialAt(followedAt(under, 0), 'rise', rise.max, 0);
    expect(dialValue(followedAt(p, 0), 'rise')).toBeLessThanOrEqual(rise.max + 1e-9);
    expect(dialValue(followedAt(p, 100), 'rise')).toBeLessThanOrEqual(rise.max + 1e-9);
  });
  it('another dial is as it was', () => {
    const p = followedAt(under, 100);
    expect(withDialAt(p, 'legEnd', 0.5, 100)).toEqual(withDial(p, 'legEnd', 0.5));
  });
});

describe('FOLLOWS BELLY', () => {
  it('off keeps the waistband where it is, at every size', () => {
    const off = withFollow(followedAt(under, 150), false, 150);
    expect(off.follow).toBeNull();
    expect(followedAt(off, 0)).toBe(off);
    expect(dialValue(off, 'rise')).toBeCloseTo(followedRises(150).front, 6);
  });
  it('on again is his settings, nothing moved on top', () => {
    const moved = withDialAt(followedAt(under, 50), 'rise', 0.1, 50);
    const off = withFollow(moved, false, 50), on = withFollow(off, true, 200);
    expect(on.follow).toEqual({ front: 0, back: 0 });
    expect(dialValue(on, 'rise')).toBeCloseTo(followedRises(200).front, 6);
  });
});

describe('a look saved before it could follow', () => {
  it('untouched, follows', () => {
    const { follow: _no, ...old } = under;
    expect(wornParams('leggingsUnder', old as typeof under).follow).toEqual({ front: 0, back: 0 });
  });
  it('with its rises set by hand, keeps them', () => {
    const { follow: _no, ...old } = withDial(withDial(under, 'rise', 0.13), 'riseBack', 0.37);
    const worn = wornParams('leggingsUnder', old as typeof under);
    expect(worn.follow).toBeNull();
    expect(dialValue(worn, 'rise')).toBeCloseTo(0.13, 6);
    expect(dialValue(worn, 'riseBack')).toBeCloseTo(0.37, 6);
  });
  it('saved following, follows', () => {
    const saved = withDialAt(followedAt(under, 100), 'rise', 0, 100);
    expect(wornParams('leggingsUnder', saved).follow).toEqual(saved.follow);
  });
});

describe('a character\'s outfit', () => {
  it('is the same make at any size of her belly, and her own once a slider moves it', () => {
    const at = (b: number) => followedAt(under, b);
    expect(sameClothesMake(at(0), at(200))).toBe(true);
    expect(sameClothesMake(at(0), withDialAt(at(0), 'rise', 0.2, 0))).toBe(false);
    expect(sameClothesMake(at(0), withFollow(at(0), false, 0))).toBe(false);
  });
});
