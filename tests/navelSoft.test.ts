/**
 * HER NAVEL AS HER CLOTHES FEEL IT (`navelSoft.ts` `NavelOffset.felt`; Joshua, 2026-11-06: "render like you did - a
 * graph... of how the bellybutton is shape and match it up"). The readers of her body on the CPU -- her clothes -- add
 * her navel's push at `felt` when there is one, else at `out`, the amount the shaders draw; under a garment the room
 * draws it a little flatter than her clothes feel it, so the cloth lying on its shape always covers what is drawn.
 */
import { describe, expect, it } from 'vitest';
import { navelOffsetAt, type NavelOffset } from '../src/sarahlab/navelSoft';

const delta = Float32Array.from([0, 0, 0, 0, 0.2, 0.4, 0.8, 0]);

describe('her navel as her clothes feel it (navelOffsetAt)', () => {
  it('reads felt when there is one, out when there is not, and nothing away from her navel', () => {
    const at = { x: 0, y: 0, z: 0 };
    const drawnOnly: NavelOffset = { out: { value: 0.5 }, delta };
    navelOffsetAt(drawnOnly, 1, at);
    expect(at.x).toBeCloseTo(0.1, 6); expect(at.y).toBeCloseTo(0.2, 6); expect(at.z).toBeCloseTo(0.4, 6);
    const felt: NavelOffset = { out: { value: 0.375 }, felt: { value: 0.5 }, delta };
    navelOffsetAt(felt, 1, at);
    expect(at.x).toBeCloseTo(0.1, 6); expect(at.y).toBeCloseTo(0.2, 6); expect(at.z).toBeCloseTo(0.4, 6);
    navelOffsetAt(felt, 0, at);
    expect([at.x, at.y, at.z]).toEqual([0, 0, 0]);
    navelOffsetAt({ out: { value: 1 }, felt: { value: 0 }, delta }, 1, at);
    expect([at.x, at.y, at.z]).toEqual([0, 0, 0]);
  });
});
