/** His belly and navel (maleBelly.ts; Joshua, 2026-11-19: "yes to belly"; "maybe a max 100%"; an outie "in some rare occasions"). */
import { describe, expect, it } from 'vitest';
import { MALE_BELLY, bellyBell, bellyEgg, bellyRound, maleBellyField, maleOutieField } from '../src/sarahlab/maleBelly';

const M = MALE_BELLY;
describe('his belly', () => {
  it('follows his own side profile: from his pubic bone bottom to his breastbone, fullest a little under his navel, steep below and gentle above', () => {
    const at = (t: number) => M.pubisY + t * (M.ribsY - M.pubisY), mid = at(M.eggMiddle);
    expect(bellyBell(mid)).toBeCloseTo(1, 1);
    expect(mid).toBeLessThan(M.navelY);
    expect(bellyBell(M.pubisY)).toBe(0); expect(bellyBell(M.ribsY)).toBe(0);
    expect(bellyBell(at(0.1))).toBeGreaterThan(bellyBell(at(0.9)));
    expect(bellyBell(M.navelY)).toBeGreaterThan(0.85);
    // (its bottom edge a U: at his side it begins higher)
    expect(bellyBell(at(0.05), M, M.midX + 0.12)).toBe(0); expect(bellyBell(at(0.05))).toBeGreaterThan(0.05);
  });
  it('is an egg from his front, wider low than high, eased into his sides, none behind', () => {
    expect(bellyRound(M.midX, M.middleZ + 0.1)).toBeCloseTo(1);
    expect(bellyRound(M.midX + 0.1, M.middleZ + 0.1, M, M.pubisY + 0.05)).toBeGreaterThan(bellyRound(M.midX + 0.1, M.middleZ + 0.1, M, M.ribsY - 0.05));
    expect(bellyRound(M.midX, M.middleZ - 0.1)).toBe(0);
  });
  it('meets his skin softly at both ends from his side', () => {
    expect(bellyEgg(0.02)).toBeLessThan(0.05); expect(bellyEgg(0.98)).toBeLessThan(0.05); expect(bellyEgg(M.eggMiddle)).toBe(1);
  });
  it('moves his front forward by its most at 100%, and nothing his limbs carry', () => {
    const y = M.pubisY + 0.45 * (M.ribsY - M.pubisY), rest = Float32Array.of(M.midX, y, 0.13, M.midX, y, 0.13, M.midX, y, -0.08);
    const f = maleBellyField(rest, Float32Array.of(1, 0, 1));
    expect(f[2]).toBeCloseTo(M.most, 3); expect(f[5]).toBe(0); expect(f[8]).toBe(0);
  });
  it('his navel: its floor comes out to his skin and a little past at OUTIE; nothing off his navel', () => {
    const rest = Float32Array.of(M.midX, M.navelY, 0.121, M.midX, M.navelY + 0.05, 0.12);
    const f = maleOutieField(rest, 0.129);
    expect(0.121 + f[2]).toBeCloseTo(0.129 + M.outiePast, 4); expect(f[5]).toBe(0);
  });
});
