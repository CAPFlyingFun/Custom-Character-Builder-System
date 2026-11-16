/**
 * HOW THE ROOM IS DRAWN ON THIS DEVICE (src/sarahlab/graphicsSettings.ts; Joshua, 2026-11-16: "add a toggle max
 * performance/max visuals in settings"; "Manual on/off + auto"; "manual overrides from the default for mix and match…
 * Her Skin, Screen Sharpness, Edge Smoothing"). AUTO is the room as it was; a thing set by hand wins over the mode; the
 * address wins over both; a probe or a bake is never moved by a setting; what is kept never throws.
 */
import { describe, expect, it } from 'vitest';
import { GRAPHICS_DEFAULT, GRAPHICS_KEY, graphicsInForce, modeSets, readGraphics, sameInForce, sanitizeGraphics, setByHand, storeGraphics, withMode, type GraphicsSettings } from '../src/sarahlab/graphicsSettings';
import { wearsLightSkin, type SkinDevice } from '../src/sarahlab/skinChoice';

const phone: SkinDevice = { asked: null, measuring: false, coarse: true, fine: false, width: 430, height: 932, ratio: 3 };
const pc: SkinDevice = { asked: null, measuring: false, coarse: false, fine: true, width: 2560, height: 1440, ratio: 1 };

describe('the graphics settings', () => {
  it('AUTO is the room as it was: her skin by the device, up to 2x, smoothed', () => {
    expect(graphicsInForce(GRAPHICS_DEFAULT, phone)).toEqual({ lightSkin: true, sharpness: 2, smoothing: true });
    expect(graphicsInForce(GRAPHICS_DEFAULT, pc)).toEqual({ lightSkin: false, sharpness: 2, smoothing: true });
    for (const d of [phone, pc]) expect(graphicsInForce(GRAPHICS_DEFAULT, d).lightSkin).toBe(wearsLightSkin(d));
  });

  it('MAX PERFORMANCE and MAX VISUALS are the same on any device', () => {
    for (const d of [phone, pc]) {
      expect(graphicsInForce(withMode('performance'), d)).toEqual({ lightSkin: true, sharpness: 1, smoothing: false });
      expect(graphicsInForce(withMode('visuals'), d)).toEqual({ lightSkin: false, sharpness: 2, smoothing: true });
      expect(modeSets('performance', d)).toEqual(graphicsInForce(withMode('performance'), d));
    }
  });

  it('a thing set by hand wins over the mode, each by itself', () => {
    const mix: GraphicsSettings = { mode: 'performance', skin: 'full', sharpness: null, smoothing: true };
    expect(graphicsInForce(mix, phone)).toEqual({ lightSkin: false, sharpness: 1, smoothing: true });
    expect(setByHand(mix)).toBe(2);
    expect(graphicsInForce({ mode: 'visuals', skin: null, sharpness: 1, smoothing: null }, pc)).toEqual({ lightSkin: false, sharpness: 1, smoothing: true });
    expect(graphicsInForce({ mode: 'auto', skin: 'light', sharpness: null, smoothing: false }, pc)).toEqual({ lightSkin: true, sharpness: 2, smoothing: false });
    // a mode picked gives the three back to the mode
    expect(setByHand(withMode('visuals'))).toBe(0);
  });

  it('the address wins over a setting, and a probe or a bake is never moved by one', () => {
    expect(graphicsInForce(withMode('visuals'), { ...pc, asked: 'light' }).lightSkin).toBe(true);
    expect(graphicsInForce({ ...withMode('performance'), skin: 'light' }, { ...phone, asked: 'full' }).lightSkin).toBe(false);
    const measuring = { ...phone, measuring: true };
    expect(graphicsInForce(withMode('performance'), measuring)).toEqual({ lightSkin: false, sharpness: 2, smoothing: true });
    expect(graphicsInForce(withMode('performance'), { ...measuring, asked: 'light' })).toEqual({ lightSkin: true, sharpness: 2, smoothing: true });
  });

  it('says when a reload would draw differently', () => {
    const now = graphicsInForce(GRAPHICS_DEFAULT, pc);
    expect(sameInForce(now, graphicsInForce(withMode('visuals'), pc))).toBe(true);
    expect(sameInForce(now, graphicsInForce(withMode('performance'), pc))).toBe(false);
  });

  it('keeps them on the device, and reads anything back as settings', () => {
    const kept = new Map<string, string>();
    const store = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, v); } };
    expect(readGraphics(store)).toEqual(GRAPHICS_DEFAULT);
    const mix: GraphicsSettings = { mode: 'visuals', skin: 'light', sharpness: 1, smoothing: false };
    storeGraphics(store, mix);
    expect(kept.has(GRAPHICS_KEY)).toBe(true);
    expect(readGraphics(store)).toEqual(mix);
    kept.set(GRAPHICS_KEY, '{not json');
    expect(readGraphics(store)).toEqual(GRAPHICS_DEFAULT);
    expect(sanitizeGraphics({ mode: 'turbo', skin: 3, sharpness: 4, smoothing: 'yes' })).toEqual(GRAPHICS_DEFAULT);
    expect(sanitizeGraphics(null)).toEqual(GRAPHICS_DEFAULT);
    const broken = { getItem: () => { throw new Error('private'); }, setItem: () => { throw new Error('private'); } };
    expect(readGraphics(broken)).toEqual(GRAPHICS_DEFAULT);
    expect(() => storeGraphics(broken, mix)).not.toThrow();
    expect(readGraphics(null)).toEqual(GRAPHICS_DEFAULT);
  });
});
