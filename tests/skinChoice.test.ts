import { describe, expect, it } from 'vitest';
import { wearsLightSkin, type SkinDevice } from '../src/sarahlab/skinChoice';

const pc: SkinDevice = { asked: null, measuring: false, coarse: false, fine: true, width: 1920, height: 1080, ratio: 1 };

describe('which of her skins a device wears', () => {
  it('a computer with a 1920 x 1080 screen or more wears her full skin', () => {
    expect(wearsLightSkin(pc)).toBe(false);
    expect(wearsLightSkin({ ...pc, width: 2560, height: 1440 })).toBe(false);
    // (a screen scaled 150%: 1280 x 720 CSS pixels at 1.5 is 1920 x 1080 of its own)
    expect(wearsLightSkin({ ...pc, width: 1280, height: 720, ratio: 1.5 })).toBe(false);
    // (a laptop with a touch screen has a trackpad)
    expect(wearsLightSkin({ ...pc, coarse: true, fine: true })).toBe(false);
  });
  it('a phone, a tablet and a small screen wear her light skin', () => {
    expect(wearsLightSkin({ ...pc, coarse: true, fine: false, width: 430, height: 932, ratio: 3 })).toBe(true);
    expect(wearsLightSkin({ ...pc, coarse: true, fine: false, width: 1366, height: 1024, ratio: 2 })).toBe(true);
    expect(wearsLightSkin({ ...pc, width: 1366, height: 768 })).toBe(true);
    expect(wearsLightSkin({ ...pc, width: 1080, height: 1920 })).toBe(false);
    expect(wearsLightSkin({ ...pc, width: 1600, height: 900 })).toBe(true);
  });
  it('the address says which, whatever the device', () => {
    expect(wearsLightSkin({ ...pc, asked: 'light' })).toBe(true);
    expect(wearsLightSkin({ ...pc, asked: 'full', coarse: true, fine: false, width: 430, height: 932, ratio: 3 })).toBe(false);
  });
  it('a probe or a bake wears her full skin unless its address says light', () => {
    const phone = { ...pc, coarse: true, fine: false, width: 430, height: 932, ratio: 3 };
    expect(wearsLightSkin({ ...phone, measuring: true })).toBe(false);
    expect(wearsLightSkin({ ...pc, width: 640, height: 640, measuring: true })).toBe(false);
    expect(wearsLightSkin({ ...phone, measuring: true, asked: 'light' })).toBe(true);
  });
  it('a screen that says nothing of its size is left on her full skin', () => {
    expect(wearsLightSkin({ ...pc, width: 0, height: 0 })).toBe(false);
    expect(wearsLightSkin({ ...pc, ratio: NaN })).toBe(false);
  });
});
