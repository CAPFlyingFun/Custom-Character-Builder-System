/** His belly and navel (maleBelly.ts; Joshua, 2026-11-19: "yes to belly"; "maybe a max 100%"; an outie "in some rare occasions"). */
import { describe, expect, it } from 'vitest';
import { MALE_BELLY, bellyBell, bellyRound, maleBellyField, maleOutieField } from '../src/sarahlab/maleBelly';

const M = MALE_BELLY;
describe('his belly', () => {
  it('is fullest a little under his navel and nothing under his pubic bone or well over his ribs', () => {
    expect(bellyBell(M.fullestY)).toBeCloseTo(1);
    expect(bellyBell(M.pubisY - 0.01)).toBe(0);
    expect(bellyBell(M.ribsY + M.over + 0.01)).toBe(0);
    expect(bellyBell(M.navelY)).toBeGreaterThan(0.95);
  });
  it('is all of it ahead of him, some at his sides, none behind', () => {
    expect(bellyRound(M.midX, M.middleZ + 0.1)).toBeCloseTo(1);
    expect(bellyRound(M.midX + 0.1, M.middleZ)).toBeCloseTo(M.sides);
    expect(bellyRound(M.midX, M.middleZ - 0.1)).toBe(0);
  });
  it('moves his front forward by its most at 100%, and nothing his limbs carry', () => {
    const rest = Float32Array.of(M.midX, M.fullestY, 0.13, M.midX, M.fullestY, 0.13, M.midX, M.fullestY, -0.08);
    const f = maleBellyField(rest, Float32Array.of(1, 0, 1));
    expect(f[2]).toBeCloseTo(M.most); expect(f[5]).toBe(0); expect(f[8]).toBe(0);
  });
  it('his navel: its floor comes out to his skin and a little past at OUTIE; nothing off his navel', () => {
    const rest = Float32Array.of(M.midX, M.navelY, 0.121, M.midX, M.navelY + 0.05, 0.12);
    const f = maleOutieField(rest, 0.129);
    expect(0.121 + f[2]).toBeCloseTo(0.129 + M.outiePast, 4); expect(f[5]).toBe(0);
  });
});
