import { describe, expect, it } from 'vitest';
import { BELLY_HOLD, bellyHold } from '../src/sarahlab/hipTurn';

describe('her belly held to her body in RECLINE (hipTurn.ts)', () => {
  it('none to her body file\'s belly, all from 150%, half way between', () => {
    expect(bellyHold(0)).toBe(0);
    expect(bellyHold(73)).toBe(0);
    expect(bellyHold(BELLY_HOLD.from)).toBe(0);
    expect(bellyHold((BELLY_HOLD.from + BELLY_HOLD.full) / 2)).toBeCloseTo(0.5, 9);
    expect(bellyHold(BELLY_HOLD.full)).toBe(1);
    expect(bellyHold(200)).toBe(1);
  });
  it('her hip\'s own skin is left to her thigh: none of the hold near the joint or where a thigh carries a fifth and more', () => {
    expect(BELLY_HOLD.near).toBeLessThan(BELLY_HOLD.far);
    expect(BELLY_HOLD.most).toBeLessThan(BELLY_HOLD.mostNone);
    expect(BELLY_HOLD.mostNone).toBeLessThanOrEqual(0.25);
  });
});
