/**
 * WHAT FOLLOWS HER BELLY (2026-11-23, `paintTemplates.BELLY_FOLLOW`): his five settings at 0, 50, 100, 150 and 200% of
 * her belly, read between -- the under-belly leggings' WAISTBAND (FRONT) and HIPS & BACK RISE, the boxy crop tee's and the
 * maternity tee's HEM / BELLY; their sliders move them on top, kept at every size; FOLLOWS BELLY off keeps them where
 * they are; a look saved before keeps hand-set numbers, and v0.9.74's waistband's `front` / `back` still read.
 */
import { describe, expect, it } from 'vitest';
import {
  BELLY_FOLLOW, COVERAGE_DIALS, COVERAGE_TEMPLATES, UNDER_BELLY_FOLLOW, canFollow, dialValue, followDials, followedAt, followedRises, followedValues, withDial, withDialAt, withFollow, wornParams,
} from '../src/sarahlab/paintTemplates';
import { AUTO_DETAIL, EMPTY_BOOK, clothesFor, type SavedClothes } from '../src/sarahlab/characterSaves';
import type { CoverageParams } from '../src/sarahlab/paintTemplates';

/** Whether a character in a piece made with `b` wears the library outfit made with `a` (her clothes kept as a reference to it). */
function sameClothesMake(a: CoverageParams, b: CoverageParams, id = 'leggingsUnder'): boolean {
  const dress = (params: CoverageParams): SavedClothes => ({
    outfit: 'painted under-belly leggings', shirtLength: 0.5, detail: AUTO_DETAIL, garments: {},
    layers: [{ choice: { fabric: { family: 'athletic', colour: 1 }, match: true } as never, detail: {} as never, template: { id, params }, mask: '' }],
  });
  const book = { ...EMPTY_BOOK, outfits: [{ name: 'Mine', savedAt: '', clothes: dress(a) }] };
  return 'basedOn' in clothesFor(book, dress(b), 'Mine');
}

const own = (id: string) => COVERAGE_TEMPLATES.find((t) => t.id === id)!.params;
const under = own('leggingsUnder');
const L = 'leggingsUnder';

describe('his settings, read between', () => {
  it('are his five at his five sizes', () => {
    const his = [[0, 0.13, 0.37], [50, -0.03, 0.33], [100, -0.06, 0.30], [150, -0.04, 0.27], [200, -0.05, 0.24]];
    for (const [b, front, back] of his) {
      const at = followedAt(L, under, b);
      expect(dialValue(at, 'rise'), `front at ${b}%`).toBeCloseTo(front, 6);
      expect(dialValue(at, 'riseBack'), `back at ${b}%`).toBeCloseTo(back, 6);
    }
    expect(UNDER_BELLY_FOLLOW.length).toBe(5);
  });
  it('the boxy crop tee\'s and the maternity tee\'s hems are his', () => {
    const crop = [[0, 0.29], [50, 0.33], [100, 0.42], [150, 0.53], [200, 0.59]], mat = [[0, 0.19], [50, 0.12], [100, 0.02], [150, 0.02], [200, 0.02]];
    for (const [b, hem] of crop) expect(dialValue(followedAt('cropTee', own('cropTee'), b), 'hem'), `crop tee at ${b}%`).toBeCloseTo(hem, 6);
    for (const [b, hem] of mat) expect(dialValue(followedAt('maternity', own('maternity'), b), 'hem'), `maternity at ${b}%`).toBeCloseTo(hem, 6);
    // (between: straight)
    expect(dialValue(followedAt('cropTee', own('cropTee'), 125), 'hem')).toBeCloseTo(0.475, 6);
    expect(dialValue(followedAt('maternity', own('maternity'), 25), 'hem')).toBeCloseTo(0.155, 6);
    // (its neckline and its sleeve do not follow)
    const a = followedAt('cropTee', own('cropTee'), 0), b = followedAt('cropTee', own('cropTee'), 200);
    expect(dialValue(b, 'neck')).toBe(dialValue(a, 'neck'));
    expect(dialValue(b, 'sleeve')).toBe(dialValue(a, 'sleeve'));
  });
  it('runs straight between two, and holds at the ends', () => {
    expect(followedRises(25).front).toBeCloseTo(0.05, 6);
    expect(followedRises(25).back).toBeCloseTo(0.35, 6);
    expect(followedRises(125).front).toBeCloseTo(-0.05, 6);
    expect(followedRises(175).back).toBeCloseTo(0.255, 6);
    expect(followedRises(-10)).toEqual(followedRises(0));
    expect(followedRises(215)).toEqual(followedRises(200));
    expect(followedRises(Number.NaN)).toEqual(followedRises(0));
    expect(followedValues(L, 75)).toEqual({ rise: followedRises(75).front, riseBack: followedRises(75).back });
  });
  it('moves its sides with its back, as HIPS & BACK RISE does', () => {
    for (const b of [0, 73, 200]) {
      const at = followedAt(L, under, b), byHand = withDial(withDial(under, 'rise', followedRises(b).front), 'riseBack', followedRises(b).back);
      expect(at.riseSide).toBeCloseTo(byHand.riseSide!, 9);
      expect(at.riseFront).toBeCloseTo(byHand.riseFront!, 9);
    }
  });
  it('is those three templates\' alone', () => {
    const follow = Object.keys(BELLY_FOLLOW).sort();
    expect(follow).toEqual(['cropTee', 'leggingsUnder', 'maternity']);
    for (const t of COVERAGE_TEMPLATES) {
      expect(canFollow(t.id), t.id).toBe(follow.includes(t.id));
      expect(!!t.params.follow, t.id).toBe(follow.includes(t.id));
      if (!follow.includes(t.id)) expect(followedAt(t.id, t.params, 150), t.id).toBe(t.params);
    }
    expect(followDials('cropTee')).toEqual(['hem']);
  });
});

describe('its sliders on top', () => {
  it('keep what they moved it by at every size of her belly', () => {
    let p = followedAt(L, under, 100);
    p = withDialAt(L, p, 'rise', 0.02, 100); // his -0.06 there: 0.08 up
    p = withDialAt(L, p, 'riseBack', 0.28, 100); // his 0.30: 0.02 down
    expect(dialValue(p, 'rise')).toBeCloseTo(0.02, 6);
    for (const b of [0, 50, 150, 200]) {
      const at = followedAt(L, p, b);
      expect(dialValue(at, 'rise'), `${b}%`).toBeCloseTo(followedRises(b).front + 0.08, 6);
      expect(dialValue(at, 'riseBack'), `${b}%`).toBeCloseTo(followedRises(b).back - 0.02, 6);
    }
    // a tee's hem the same
    let t = followedAt('cropTee', own('cropTee'), 50);
    t = withDialAt('cropTee', t, 'hem', 0.38, 50); // his 0.33: 0.05 up
    expect(dialValue(followedAt('cropTee', t, 150), 'hem')).toBeCloseTo(0.58, 6);
  });
  it('are held to their own ranges', () => {
    const rise = COVERAGE_DIALS.find((d) => d.id === 'rise')!;
    const p = withDialAt(L, followedAt(L, under, 0), 'rise', rise.max, 0);
    expect(dialValue(followedAt(L, p, 0), 'rise')).toBeLessThanOrEqual(rise.max + 1e-9);
    expect(dialValue(followedAt(L, p, 100), 'rise')).toBeLessThanOrEqual(rise.max + 1e-9);
  });
  it('another dial is as it was', () => {
    const p = followedAt(L, under, 100);
    expect(withDialAt(L, p, 'legEnd', 0.5, 100)).toEqual(withDial(p, 'legEnd', 0.5));
    const t = followedAt('cropTee', own('cropTee'), 100);
    expect(withDialAt('cropTee', t, 'sleeve', 0.6, 100)).toEqual(withDial(t, 'sleeve', 0.6));
  });
});

describe('FOLLOWS BELLY', () => {
  it('off keeps it where it is, at every size', () => {
    const off = withFollow(L, followedAt(L, under, 150), false, 150);
    expect(off.follow).toBeNull();
    expect(followedAt(L, off, 0)).toBe(off);
    expect(dialValue(off, 'rise')).toBeCloseTo(followedRises(150).front, 6);
  });
  it('on again is his settings, nothing moved on top', () => {
    const moved = withDialAt(L, followedAt(L, under, 50), 'rise', 0.1, 50);
    const off = withFollow(L, moved, false, 50), on = withFollow(L, off, true, 200);
    expect(on.follow).toEqual({ rise: 0, riseBack: 0 });
    expect(dialValue(on, 'rise')).toBeCloseTo(followedRises(200).front, 6);
  });
  it('can not be put on a piece that has no settings of his', () => {
    expect(withFollow('teeShort', own('teeShort'), true, 100).follow).toBeNull();
  });
});

describe('a look saved before it could follow', () => {
  it('untouched, follows', () => {
    const { follow: _no, ...old } = under;
    expect(wornParams(L, old as typeof under).follow).toEqual({ rise: 0, riseBack: 0 });
    const { follow: _none, ...tee } = own('cropTee');
    expect(wornParams('cropTee', tee as CoverageParams).follow).toEqual({ hem: 0 });
  });
  it('with its rises or its hem set by hand, keeps them', () => {
    const { follow: _no, ...old } = withDial(withDial(under, 'rise', 0.13), 'riseBack', 0.37);
    const worn = wornParams(L, old as typeof under);
    expect(worn.follow).toBeNull();
    expect(dialValue(worn, 'rise')).toBeCloseTo(0.13, 6);
    expect(dialValue(worn, 'riseBack')).toBeCloseTo(0.37, 6);
    const { follow: _none, ...tee } = withDial(own('cropTee'), 'hem', 0.42);
    const t = wornParams('cropTee', tee as CoverageParams);
    expect(t.follow).toBeNull();
    expect(dialValue(t, 'hem')).toBeCloseTo(0.42, 6);
  });
  it('saved following, follows', () => {
    const saved = withDialAt(L, followedAt(L, under, 100), 'rise', 0, 100);
    expect(wornParams(L, saved).follow).toEqual(saved.follow);
  });
  it('saved by v0.9.74 (its waistband\'s front and back), reads them', () => {
    const saved = { ...followedAt(L, under, 0), follow: { front: 0.05, back: -0.02 } };
    const at = followedAt(L, wornParams(L, saved), 100);
    expect(dialValue(at, 'rise')).toBeCloseTo(followedRises(100).front + 0.05, 6);
    expect(dialValue(at, 'riseBack')).toBeCloseTo(followedRises(100).back - 0.02, 6);
  });
});

describe('a character\'s outfit', () => {
  it('is the same make at any size of her belly, and her own once a slider moves it', () => {
    const at = (b: number) => followedAt(L, under, b);
    expect(sameClothesMake(at(0), at(200))).toBe(true);
    expect(sameClothesMake(at(0), withDialAt(L, at(0), 'rise', 0.2, 0))).toBe(false);
    expect(sameClothesMake(at(0), withFollow(L, at(0), false, 0))).toBe(false);
    const tee = (b: number) => followedAt('cropTee', own('cropTee'), b);
    expect(sameClothesMake(tee(0), tee(150), 'cropTee')).toBe(true);
    expect(sameClothesMake(tee(0), withDialAt('cropTee', tee(0), 'hem', 0.4, 0), 'cropTee')).toBe(false);
  });
});
