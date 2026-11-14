/**
 * HER LEGS OPEN HER (src/sarahlab/legsOpen.ts; Joshua, 2026-11-14: "how far the 🦵 legs are spread apart does naturally
 * open the opening to a max of 20% in recline and squat, legs apart would be 12%"). How far her legs are spread is read
 * across her, so a walk's stride is not a spread; and the table holds his numbers at every size of belly.
 */
import { describe, expect, it } from 'vitest';
import { LEGS_OPEN, LEGS_OPEN_MOST, easeLegsOpen, legSpreadDeg, legsOpen, type Vec3 } from '../src/sarahlab/legsOpen';

const DEG = Math.PI / 180;
/** her hips 20 cm apart, each thigh 40 cm long: swung `out` degrees to its own side and `fore` degrees forward (her left: +x) */
const legs = (outL: number, outR = outL, foreL = 0, foreR = foreL): [Vec3, Vec3, Vec3, Vec3] => {
  const thigh = (side: 1 | -1, out: number, fore: number): Vec3 => {
    // (hanging -y; swung forward about her hips' line, then out to its side)
    const y = -Math.cos(fore * DEG), z = Math.sin(fore * DEG);
    return [side * 0.1 + side * 0.4 * Math.sin(out * DEG) * Math.abs(y), 0.9 + 0.4 * y * Math.cos(out * DEG), 0.4 * z];
  };
  return [[0.1, 0.9, 0], thigh(1, outL, foreL), [-0.1, 0.9, 0], thigh(-1, outR, foreR)];
};

describe('how far her legs are spread', () => {
  it('is nothing with her thighs side by side, and the angle between them when each is the same way out', () => {
    expect(legSpreadDeg(...legs(0))).toBeCloseTo(0, 6);
    expect(legSpreadDeg(...legs(18))).toBeCloseTo(36, 4);
    expect(legSpreadDeg(...legs(46))).toBeCloseTo(92, 4);
  });
  it('is not a walk\'s stride: one thigh forward and one back are far apart in space and not spread at all', () => {
    const [hl, kl, hr, kr] = legs(0, 0, 20, -20);
    const l = [kl[0] - hl[0], kl[1] - hl[1], kl[2] - hl[2]], r = [kr[0] - hr[0], kr[1] - hr[1], kr[2] - hr[2]];
    const between = Math.acos((l[0] * r[0] + l[1] * r[1] + l[2] * r[2]) / (Math.hypot(...l) * Math.hypot(...r))) / DEG;
    expect(between).toBeCloseTo(40, 4);
    expect(legSpreadDeg(hl, kl, hr, kr)).toBeCloseTo(0, 6);
    expect(legsOpen(legSpreadDeg(hl, kl, hr, kr))).toBe(0);
  });
  it('counts a thigh drawn in across her against one swung out', () => {
    expect(legSpreadDeg(...legs(20, -20))).toBeCloseTo(0, 6);
    expect(legSpreadDeg(...legs(30, 10))).toBeCloseTo(40, 4);
  });
  it('is the same however she is turned and wherever she stands', () => {
    const turn = (p: Vec3): Vec3 => { const a = 0.7, b = -0.4; const x = p[0] * Math.cos(a) + p[2] * Math.sin(a), z = -p[0] * Math.sin(a) + p[2] * Math.cos(a); return [x + 3, p[1] * Math.cos(b) - z * Math.sin(b) - 1, p[1] * Math.sin(b) + z * Math.cos(b) + 2]; };
    const j = legs(31, 31, 50), t = j.map(turn) as [Vec3, Vec3, Vec3, Vec3];
    expect(legSpreadDeg(...t)).toBeCloseTo(legSpreadDeg(...j), 6);
  });
  it('is nothing where a joint is missing', () => {
    expect(legSpreadDeg([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, -1, 0])).toBe(0);
    expect(legSpreadDeg([0, 1, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0])).toBe(0);
    expect(legSpreadDeg([NaN, 1, 0], [0, 0, 0], [0.2, 1, 0], [0, 0, 0])).toBe(0);
  });
  it('reads her own joints as the room gave them (MEASURED 2026-11-14, centimetres, her belly at 150%)', () => {
    // standing, LEGS APART, SQUAT, RECLINE: hipL, kneeL, hipR, kneeR
    expect(legSpreadDeg([10, 90, -6], [14, 54, -8], [-10, 90, -6], [-13, 54, -8])).toBeLessThan(14);
    expect(legSpreadDeg([10, 78, -6], [27, 47, 3], [-10, 78, -6], [-26, 47, 3])).toBeGreaterThan(50);
    expect(legSpreadDeg([10, 78, -6], [27, 47, 3], [-10, 78, -6], [-26, 47, 3])).toBeLessThan(58);
    expect(legSpreadDeg([10, 39, -18], [41, 54, -4], [-10, 39, -18], [-40, 54, -4])).toBeGreaterThan(108);
    expect(legSpreadDeg([10, 55, -6], [39, 73, 7], [-10, 55, -6], [-38, 73, 7])).toBeGreaterThan(100);
    // a stride of her walk: 37 degrees between her thighs in space, 13 across her
    const stride: [Vec3, Vec3, Vec3, Vec3] = [[12, 88, -5], [15, 54, 7], [-8, 87, -6], [-12, 52, -16]];
    expect(legSpreadDeg(...stride)).toBeLessThan(15);
  });
});

describe('how open her legs have her', () => {
  it('is his numbers at every size of belly: 12% in LEGS APART, 20% in SQUAT and in RECLINE', () => {
    // (MEASURED across her at 0, 100, 150 and 200% of her belly)
    for (const apart of [36.2, 47.1, 54.1, 60.0]) expect(legsOpen(apart)).toBeCloseTo(0.12, 9);
    for (const squat of [102.7, 111.3, 112.1, 116.4]) expect(legsOpen(squat)).toBeCloseTo(0.2, 9);
    for (const recline of [92.8, 101.1, 104.1, 107.5]) expect(legsOpen(recline)).toBeCloseTo(0.2, 9);
  });
  it('is closed standing and walking at every size of belly, and seated up to 150%', () => {
    for (const stand of [0, 7.9, 12.6, 14.2]) expect(legsOpen(stand)).toBe(0);
    for (const walk of [11.1, 12.4, 14.2, 17.2]) expect(legsOpen(walk)).toBe(0);
    expect(legsOpen(22.1)).toBe(0);
    // (seated at 200% her knees are 31 degrees apart, nearly LEGS APART's: a little open, less than LEGS APART has her)
    expect(legsOpen(31.1)).toBeGreaterThan(0);
    expect(legsOpen(31.1)).toBeLessThan(0.06);
  });
  it('never closes as her legs open, and is never more than 20%', () => {
    let last = 0;
    for (let a = -10; a <= 200; a += 0.5) { const v = legsOpen(a); expect(v).toBeGreaterThanOrEqual(last - 1e-12); expect(v).toBeLessThanOrEqual(0.2 + 1e-12); last = v; }
    expect(LEGS_OPEN_MOST).toBe(0.2);
    expect(legsOpen(180)).toBe(0.2);
    expect(legsOpen(NaN)).toBe(0);
  });
  it('is eased to: no faster than its rate, never past where her legs have her', () => {
    expect(easeLegsOpen(0, 100, 0.1)).toBeCloseTo(LEGS_OPEN.perSecond * 0.1, 9);
    expect(easeLegsOpen(0, 100, 10)).toBeCloseTo(0.2, 9);
    expect(easeLegsOpen(0.2, 0, 0.1)).toBeCloseTo(0.2 - LEGS_OPEN.perSecond * 0.1, 9);
    expect(easeLegsOpen(0.2, 0, 10)).toBe(0);
    expect(easeLegsOpen(0.12, 50, 1)).toBeCloseTo(0.12, 9);
    expect(easeLegsOpen(0.05, 100, NaN)).toBeCloseTo(0.05, 9);
  });
});
