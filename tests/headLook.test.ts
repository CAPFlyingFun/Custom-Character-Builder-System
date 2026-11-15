/**
 * HER HEAD'S LOOK AS NUMBERS (`headLook.ts`; Joshua, 2026-11-14: "making the eye color adjustable and more hairstyles and
 * colors so we can do Lena"): what a save keeps of her head, and what every part that draws her head agrees a look is.
 */
import { describe, expect, it } from 'vitest';
import { HEAD_DEFAULT, colourLinear, colourRgb, isDefaultHead, lookColour, normaliseHead, rgbColour } from '../src/sarahlab/headLook';

describe('her head\'s look', () => {
  it('a character saved before her head could be chosen has the head she had: her own colours, her ponytail', () => {
    for (const saved of [undefined, null, 7, 'x', {}, { hair: null, eyes: 3 }]) expect(normaliseHead(saved)).toEqual(HEAD_DEFAULT);
    expect(isDefaultHead(normaliseHead({}))).toBe(true);
    expect(HEAD_DEFAULT.hair).toEqual({ style: 'ponytail', length: 1, colour: null });
    expect(HEAD_DEFAULT.lips.amount).toBe(0.55);
  });
  it('keeps what is chosen, and holds what is out of range', () => {
    const lena = normaliseHead({ hair: { style: 'wavy-ponytail', length: 0.6, colour: '#1B1A1D' }, eyes: { colour: '#4a2e1c' }, brows: { colour: null, amount: 3 }, lips: { colour: '#b0616a', amount: -1 }, lashes: 0.8, face: { jawWidth: 0.4, cheeks: -7, nose: 0, 'bad name': 1, x: Number.NaN } });
    expect(lena.hair).toEqual({ style: 'wavy-ponytail', length: 0.6, colour: '#1b1a1d' });
    expect(lena.eyes.colour).toBe('#4a2e1c');
    expect(lena.brows).toEqual({ colour: null, amount: 1 });
    expect(lena.lips).toEqual({ colour: '#b0616a', amount: 0 });
    expect(lena.lashes).toBe(0.8);
    expect(lena.face).toEqual({ jawWidth: 0.4, cheeks: -1 });
    expect(isDefaultHead(lena)).toBe(false);
  });
  it('a colour is \'#rrggbb\' or her own', () => {
    for (const bad of ['red', '#12', '#12345g', 0x112233, null, undefined]) expect(lookColour(bad)).toBeNull();
    expect(lookColour('#AABBCC')).toBe('#aabbcc');
    expect(colourRgb('#ff8000')).toEqual([1, 128 / 255, 0]);
    expect(rgbColour([1, 128 / 255, 0])).toBe('#ff8000');
    // linear light: sRGB's mid grey is about a fifth of the light, black and white are themselves
    const [r, g, b] = colourLinear('#808080');
    expect(r).toBeCloseTo(0.2159, 3); expect(g).toBe(r); expect(b).toBe(r);
    expect(colourLinear('#000000')).toEqual([0, 0, 0]); expect(colourLinear('#ffffff')).toEqual([1, 1, 1]);
  });
});
