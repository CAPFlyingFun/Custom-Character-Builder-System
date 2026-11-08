/**
 * THE WALKING STRIP (src/sarahlab/walkStrip.ts; Joshua, 2026-11-08: "a 5x10 meter walking strip and if it gets to the end,
 * will loop back seamlessly"): drawn moving under her, a mark on it stays where it is on the strip however far she walks,
 * and its stretches look alike, so the loop cannot be seen.
 */
import { describe, expect, it } from 'vitest';
import { SLOPE, STRIP, slopeGrade, slopeLine, slopeNormal, stripFade, stripOffset } from '../src/sarahlab/walkStrip';

/** Where in the pattern (stretches, 0..1) the strip shows at `z` metres from her, once she has walked `walked`: the
 * plane's v runs from 0 at z = +fade to 1 at z = -fade, and the texture repeats `2 fade / stretch` times along it. */
function patternAt(z: number, walked: number): number {
  const v = (-z + STRIP.fade) / (2 * STRIP.fade), p = v * ((2 * STRIP.fade) / STRIP.stretch) + stripOffset(walked);
  return p - Math.floor(p);
}
const sameMark = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

describe('the walking strip', () => {
  it('is Joshua\'s 5 x 10 m', () => {
    expect(STRIP.width).toBe(5);
    expect(STRIP.stretch).toBe(10);
  });

  it('holds a mark where it is on the strip as she walks past it: drawn `walked` metres further back', () => {
    for (const mark of [0, 0.3, 3.7, 9.99]) {
      const at0 = patternAt(mark, 0);
      for (const walked of [0.01, 1.1, 4.4, 9.5, 10, 23.7, 1234.5]) expect(sameMark(patternAt(mark - walked, walked), at0)).toBeLessThan(1e-9);
    }
  });

  it('looks the same a whole stretch on: the loop is seamless', () => {
    for (const walked of [0, 2.5, 7.25]) for (const z of [-3, 0, 2, 5]) expect(sameMark(patternAt(z, walked + STRIP.stretch), patternAt(z, walked))).toBeLessThan(1e-9);
  });

  it('starts her on a stretch\'s start line', () => {
    expect(sameMark(patternAt(0, 0), 0)).toBeLessThan(1e-9);
  });

  it('shows in full near her and fades away ahead of her and behind her, before its drawn ends', () => {
    expect(stripFade(0)).toBe(1);
    expect(stripFade(STRIP.clear)).toBe(1);
    expect(stripFade(-STRIP.clear)).toBe(1);
    expect(stripFade((STRIP.clear + STRIP.fade) / 2)).toBeCloseTo(0.5, 9);
    expect(stripFade(STRIP.fade)).toBe(0);
    expect(stripFade(-STRIP.fade - 1)).toBe(0);
    for (let z = STRIP.clear; z < STRIP.fade; z += 0.5) expect(stripFade(z + 0.5)).toBeLessThanOrEqual(stripFade(z));
  });
});

describe('the slope (Joshua, 2026-11-08: "-30/-20/-10/0/+10/+20/+30")', () => {
  const DEG = Math.PI / 180;
  it('runs from -30 to +30, ahead of her or across her path', () => {
    expect(SLOPE.most).toBe(30);
    expect([...SLOPE.headings]).toEqual(['ahead', 'across']);
  });
  it('ahead: + rises in front of her (uphill), - falls (downhill)', () => {
    expect(slopeGrade({ deg: 20, heading: 'ahead' }).z).toBeCloseTo(Math.tan(20 * DEG), 12);
    expect(slopeGrade({ deg: -20, heading: 'ahead' }).z).toBeCloseTo(-Math.tan(20 * DEG), 12);
    expect(slopeGrade({ deg: 20, heading: 'ahead' }).x).toBe(0);
  });
  it('across: + rises to her left, - to her right, whichever way her bind faces', () => {
    expect(slopeGrade({ deg: 10, heading: 'across' }, 1).x).toBeCloseTo(Math.tan(10 * DEG), 12);
    expect(slopeGrade({ deg: 10, heading: 'across' }, -1).x).toBeCloseTo(-Math.tan(10 * DEG), 12);
    expect(slopeGrade({ deg: -10, heading: 'across' }, 1).x).toBeCloseTo(-Math.tan(10 * DEG), 12);
  });
  it('never past 30 either way; its normal leans away from the rise', () => {
    expect(slopeGrade({ deg: 45, heading: 'ahead' }).z).toBeCloseTo(Math.tan(30 * DEG), 12);
    expect(slopeGrade({ deg: -45, heading: 'ahead' }).z).toBeCloseTo(-Math.tan(30 * DEG), 12);
    const [nx, ny, nz] = slopeNormal({ deg: 30, heading: 'ahead' });
    expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 12);
    expect(nz).toBeLessThan(0);
    expect(Math.acos(ny)).toBeCloseTo(30 * DEG, 12);
  });
  it('says what it is', () => {
    expect(slopeLine({ deg: 0, heading: 'ahead' })).toBe('SLOPE · 0° · flat');
    expect(slopeLine({ deg: 20, heading: 'ahead' })).toBe('SLOPE · +20° · uphill');
    expect(slopeLine({ deg: -30, heading: 'ahead' })).toBe('SLOPE · −30° · downhill');
    expect(slopeLine({ deg: -10, heading: 'across' })).toBe('SLOPE · −10° · across, rising to her right');
  });
});
