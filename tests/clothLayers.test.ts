/**
 * One cloth over another (`src/sarahlab/clothLayers.ts`): the outer cloth's floors raised over the inner cloth, 3 mm
 * clear of it, and only where the inner cloth lies between it and her skin.
 */
import { describe, expect, it } from 'vitest';
import { CLOTH_LAYERS, ClothUnder, cinchUnder, raiseOver } from '../src/sarahlab/clothLayers';
import { createContacts } from '../src/sarahlab/clothTypes';
import { clampSkirt } from '../src/sarahlab/skirt/skirtDraft';
import { OUTFITS, TEE_SKIRTS } from '../src/sarahlab/sarahLabTool';

const M = 100;
/** an inner cloth: a flat sheet `h` world units in front of the plane z = 0, a point each centimetre, from y 0 to 20 */
function sheet(h: number): Float32Array {
  const out: number[] = [];
  for (let x = -10; x <= 10; x++) for (let y = 0; y <= 20; y++) out.push(x, y, h);
  return Float32Array.from(out);
}
/** outer contacts on the plane z = 0 facing +z, at (x, y) */
function floors(at: readonly (readonly [number, number])[]) {
  const c = createContacts(at.length);
  at.forEach(([x, y], i) => { c.point.set([x, y, 0], i * 3); c.normal.set([0, 0, 1], i * 3); c.standOff[i] = 0.15; });
  return c;
}

describe('one cloth over another', () => {
  it('keeps his 3 mm between them', () => { expect(CLOTH_LAYERS.gap).toBe(0.003); });
  it('raises a floor to the inner cloth\'s height and the gap, where the inner cloth is under it', () => {
    const inner = new ClothUnder(), x = sheet(0.8);
    inner.build(x, x.length / 3, CLOTH_LAYERS.cell * M);
    const c = floors([[0, 10], [3, 5], [0, 60]]);
    expect(raiseOver(inner, c, 3, M)).toBe(2);
    expect(c.standOff[0]).toBeCloseTo(0.8 + 0.3, 5);
    expect(c.standOff[1]).toBeCloseTo(0.8 + 0.3, 5);
    // far over the top of the inner cloth: as it was
    expect(c.standOff[2]).toBeCloseTo(0.15, 6);
  });
  it('leaves a floor that is already clear, one with no way out, and a held point', () => {
    const inner = new ClothUnder(), x = sheet(0.8);
    inner.build(x, x.length / 3, CLOTH_LAYERS.cell * M);
    const c = floors([[0, 10], [0, 10], [0, 10]]);
    c.standOff[0] = 5; c.normal.set([0, 0, 0], 3);
    expect(raiseOver(inner, c, 3, M, { held: [0, 0, 1] })).toBe(0);
    expect(Array.from(c.standOff)).toEqual([5, expect.closeTo(0.15, 6), expect.closeTo(0.15, 6)]);
  });
  it('raises no further than asked (a tucked shirt\'s loose hem is not a skirt\'s floor), and skips what is not worn', () => {
    const inner = new ClothUnder(), x = sheet(6);
    x[0] = NaN;
    inner.build(x, x.length / 3, CLOTH_LAYERS.cell * M);
    expect(inner.count).toBe(x.length / 3 - 1);
    const c = floors([[0, 10]]);
    raiseOver(inner, c, 1, M, { most: CLOTH_LAYERS.tuckedMost });
    expect(c.standOff[0]).toBeCloseTo((CLOTH_LAYERS.tuckedMost + CLOTH_LAYERS.gap) * M, 5);
    const d = floors([[0, 10]]);
    raiseOver(inner, d, 1, M);
    expect(d.standOff[0]).toBeCloseTo(6.3, 5);
  });
  it('does not look behind her skin or past its reach', () => {
    const behind = new ClothUnder(), xb = sheet(-3);
    behind.build(xb, xb.length / 3, CLOTH_LAYERS.cell * M);
    const far = new ClothUnder(), xf = sheet(CLOTH_LAYERS.reach * M + 4);
    far.build(xf, xf.length / 3, CLOTH_LAYERS.cell * M);
    const c = floors([[0, 10]]);
    expect(raiseOver(behind, c, 1, M)).toBe(0);
    expect(raiseOver(far, c, 1, M)).toBe(0);
  });
  it('an under-belly skirt is never over the shirt; an over-belly one is either', () => {
    expect(clampSkirt({ top: 'under', tucked: true }).tucked).toBe(false);
    expect(clampSkirt({ top: 'over' }).tucked).toBe(true);
    expect(clampSkirt({ top: 'over', tucked: false }).tucked).toBe(false);
  });
  it('is worn by the cloth tee with a skirt: tucked into a high one, over a high one, over a low one', () => {
    const worn = OUTFITS.filter((o) => o.skirt && o.procedural);
    expect(worn.map((o) => o.name)).toEqual(TEE_SKIRTS.map(([name]) => name));
    expect(OUTFITS.slice(-TEE_SKIRTS.length).map((o) => o.name)).toEqual(TEE_SKIRTS.map(([name]) => name));
    expect(worn.map((o) => `${o.skirt!.top}/${o.skirt!.tucked}`)).toEqual(['over/true', 'over/false', 'under/false']);
    // tucked, the tee is a short one: a hand of it under the skirt's band (which sits in the crease under her bust), not a hip-length shirt
    expect(worn[0].cut?.length).toBe(6);
    for (const o of worn) expect(o.skirt).toEqual(clampSkirt(o.skirt!));
  });
});

describe('a tucked shirt held in by the skirt over it', () => {
  it('brings a point of the shirt back to its stand-off and the slack where the band lies over its floor, and nowhere else', () => {
    // the band: a sheet 0.8 off the plane from y 0 to 20; the shirt's points: one under it standing 3 off, one under it
    // lying close, one far above the band standing 3 off
    const band = new ClothUnder(), b = sheet(0.8);
    band.build(b, b.length / 3, CLOTH_LAYERS.cell * M);
    const c = floors([[0, 10], [2, 10], [0, 60]]);
    const x = Float32Array.from([0, 10, 3, 2, 10, 0.2, 0, 60, 3]), v = Float32Array.from([0, 0, 5, 0, 0, 5, 0, 0, 5]);
    expect(cinchUnder(band, c, x, v, 3, M)).toBe(1);
    expect(x[2]).toBeCloseTo(0.15 + CLOTH_LAYERS.cinchSlack * M, 5); expect(v[2]).toBe(0);
    expect(x[5]).toBeCloseTo(0.2, 6); expect(v[5]).toBe(5);
    expect(x[8]).toBe(3); expect(v[8]).toBe(5);
  });
});
