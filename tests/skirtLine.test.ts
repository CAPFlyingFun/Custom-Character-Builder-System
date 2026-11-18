/**
 * AN UNDER-BELLY SKIRT'S TOP IS THE UNDER-BELLY LEGGINGS' OWN LINE (`skirt/skirtDraft.ts` `SKIRT_LINE`, `underLine`,
 * `ringOn`; `bottomCut.hoopInside`; Joshua, 2026-11-17: "how the skirt should sit is like how we did the lower rider
 * leggings, just above her pelvis, below her belly following that same curved lines…").
 *
 * On a plain shape, where the answer is known; and on her own skin (the room's body file, with its own `belly` and
 * `belly200` morphs: her 0%, her 100% and her 200%), where the ring has to be under her belly at every size.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { COVERAGE_TEMPLATES } from '../src/sarahlab/paintTemplates';
import { hoopInside, limbSkin, lowFrame, lowSpec, type LowFrame } from '../src/sarahlab/bottomCut';
import { FACE_REST_OFFSET, FACE_REST_SCALE } from '../src/sarahlab/faceRig';
import { bodyInputOf } from '../src/sarahlab/garment/bodyInput';
import { dressForm } from '../src/sarahlab/garment/measure';
import type { BodyInput } from '../src/sarahlab/garment/types';
import { SKIRT_CUT, SKIRT_LINE, SKIRT_TOPS, draftSkirt, hemOf, reachOf, ringOn, underLine } from '../src/sarahlab/skirt/skirtDraft';
import { OUTFITS, SKIRT_UNDER_BAND } from '../src/sarahlab/sarahLabTool';
import { loadHerBody, type HerBody } from './herBodyMap';

/** An upright post, `radius(y)` round, from the floor to 1.5 m: `around` points a ring, a ring every `step`. */
function post(radius: (y: number) => number, around = 72, step = 0.01): BodyInput {
  const rings = Math.round(1.5 / step) + 1, positions = new Float32Array(rings * around * 3), tris: number[] = [];
  for (let r = 0; r < rings; r++) for (let k = 0; k < around; k++) {
    const a = (k / around) * Math.PI * 2, y = r * step, R = radius(y), i = (r * around + k) * 3;
    positions[i] = Math.sin(a) * R; positions[i + 1] = y; positions[i + 2] = Math.cos(a) * R;
    if (r + 1 < rings) { const l = (k + 1) % around, p = r * around + k, q = r * around + l, u = p + around, v = q + around; tris.push(p, q, u, q, v, u); }
  }
  const at = (y: number): [number, number, number] => [0, y, 0], pair = (y: number) => [[0.08, y, 0], [-0.08, y, 0]] as const;
  return {
    positions, triangles: Uint32Array.from(tris), arm: new Float32Array(rings * around),
    joints: { pelvis: at(0.95), chest: at(1.25), neck: at(1.45), head: at(1.5), shoulder: pair(1.4), elbow: pair(1.15), wrist: pair(0.9), hip: pair(0.9), knee: pair(0.5), ankle: pair(0.08) } as unknown as BodyInput['joints'],
  };
}
/** How far under a tilted plane each of a body's points is: the plane at `y0` on the axis, `slope` lower a metre forward. */
const underPlane = (body: BodyInput, y0: number, slope: number): Float32Array => Float32Array.from({ length: body.positions.length / 3 }, (_, v) => y0 - slope * body.positions[v * 3 + 2] - body.positions[v * 3 + 1]);

describe('a line found on a body: what is under it, and the line', () => {
  const body = post(() => 0.15), inside = underPlane(body, 0.97, 0.5);

  it('keeps what is inside, cut where the line crosses a triangle, and hands back the line', () => {
    const { covered, line } = underLine(body, inside, 0.008);
    expect(line.length % 6).toBe(0);
    expect(line.length / 6).toBeGreaterThan(100);
    // every point kept is inside (the cuts' own are ON the line), and every piece of the line lies on the plane's
    // level set: its height is the plane's there, less the level
    for (let i = 0; i < covered.positions.length; i += 3) expect(0.97 - 0.5 * covered.positions[i + 2] - covered.positions[i + 1]).toBeGreaterThan(0.008 - 1e-5);
    for (let i = 0; i < line.length; i += 3) expect(line[i + 1]).toBeCloseTo(0.97 - 0.5 * line[i + 2] - 0.008, 5);
    // a body of its own, of the points it keeps alone
    expect(covered.positions.length).toBeLessThan(body.positions.length);
    expect(Math.max(...covered.triangles)).toBe(covered.positions.length / 3 - 1);
    expect(covered.arm.length).toBe(covered.positions.length / 3);
  });

  it('leaves her arm\'s skin out, as a dress form does', () => {
    const arm = Float32Array.from(body.arm);
    // (a strip of the post called her arm: no line across it, and nothing of it kept)
    for (let v = 0; v < arm.length; v++) if (body.positions[v * 3] > 0.12) arm[v] = 1;
    const cut = underLine({ ...body, arm }, inside, 0.008), all = underLine(body, inside, 0.008);
    expect(cut.line.length).toBeLessThan(all.line.length);
    for (let i = 0; i < cut.line.length; i += 3) expect(cut.line[i]).toBeLessThan(0.125);
  });

  it('reads the line\'s height and reach in each direction round an axis, the furthest where it is crossed twice', () => {
    const { line } = underLine(body, inside, 0.008), on = ringOn(line, 0, 0, 72);
    expect(on.found).toBe(1);
    for (let c = 0; c < 72; c++) {
      const a = (c / 72) * Math.PI * 2;
      expect(on.r[c]).toBeGreaterThan(0.1495); expect(on.r[c]).toBeLessThan(0.1501);
      expect(on.y[c]).toBeCloseTo(0.97 - 0.5 * 0.15 * Math.cos(a) - 0.008, 3);
    }
    // a second, smaller ring inside the first: the outer one is the one read
    const inner = Float64Array.from(line, (v, i) => (i % 3 === 1 ? v + 0.2 : v * 0.5)), both = new Float64Array(line.length * 2);
    both.set(inner); both.set(line, line.length);
    const outer = ringOn(both, 0, 0, 72);
    for (let c = 0; c < 72; c++) { expect(outer.r[c]).toBeCloseTo(on.r[c], 9); expect(outer.y[c]).toBeCloseTo(on.y[c], 9); }
  });

  it('gives a direction the line does not cross its neighbours\', eased between them', () => {
    // (the line's pieces toward her +x side taken away: a gap of some forty degrees)
    const { line } = underLine(body, inside, 0.008), kept: number[] = [];
    for (let k = 0; k < line.length; k += 6) if (!(line[k] > 0.14 || line[k + 3] > 0.14)) kept.push(...line.slice(k, k + 6));
    const on = ringOn(kept, 0, 0, 72), whole = ringOn(line, 0, 0, 72);
    expect(on.found).toBeLessThan(1); expect(on.found).toBeGreaterThan(0.8);
    for (let c = 0; c < 72; c++) { expect(Math.abs(on.y[c] - whole.y[c])).toBeLessThan(0.004); expect(on.r[c]).toBeGreaterThan(0.14); }
  });
});

describe('a skirt drafted on that line', () => {
  it('has its ring on the line and its hem where it always was', () => {
    const body = post(() => 0.15), inside = underPlane(body, 0.97, 0.5), settings = { top: 'under', length: 0.3, flare: 0.5, tucked: false } as const;
    const plain = draftSkirt(body, settings), d = draftSkirt(body, settings, inside), cols = d.columns;
    expect(d.hemY).toBe(plain.hemY);
    // without the line: the three heights on her trunk; with it: the line's own, lower in front than behind
    expect(plain.ringY[0]).toBeCloseTo(0.9 + SKIRT_TOPS.under.front * 0.55, 5);
    for (let c = 0; c < cols; c++) {
      const a = (c / cols) * Math.PI * 2, i = c * 3;
      expect(d.ringY[c]).toBeCloseTo(0.97 - 0.5 * 0.15 * Math.cos(a) - SKIRT_LINE.inside, 2);
      expect(d.rest[i + 1]).toBe(d.ringY[c]);
      expect(Math.hypot(d.rest[i] - d.axis[0], d.rest[i + 2] - d.axis[1])).toBeCloseTo(0.15 + SKIRT_CUT.ease, 3);
    }
    expect(d.ringY[0]).toBeLessThan(d.ringY[cols / 4] - 0.05); expect(d.ringY[cols / 4]).toBeLessThan(d.ringY[cols / 2] - 0.05);
    // every column ends at the hem, and a longer one (her back's) has its rows further apart
    for (let c = 0; c < cols; c++) expect(d.rest[((d.rows - 1) * cols + c) * 3 + 1]).toBeCloseTo(d.hemY, 6);
  });

  it('is not the line\'s for a skirt over her belly, nor for a line that is not her points\', nor one found round too little of her', () => {
    const body = post(() => 0.15), inside = underPlane(body, 0.97, 0.5);
    const over = { top: 'over', length: 0.3, flare: 0.5, tucked: true } as const, under = { top: 'under', length: 0.3, flare: 0.5, tucked: false } as const;
    expect(Array.from(draftSkirt(body, over, inside).rest)).toEqual(Array.from(draftSkirt(body, over).rest));
    expect(Array.from(draftSkirt(body, under, inside.subarray(0, 100)).rest)).toEqual(Array.from(draftSkirt(body, under).rest));
    // (a line on her front half alone)
    const half = Float32Array.from(inside, (g, v) => (body.positions[v * 3 + 2] < 0 ? -1 : g));
    expect(SKIRT_LINE.least).toBeGreaterThan(0.75);
    expect(Array.from(draftSkirt(body, under, half).ringY)).toEqual(Array.from(draftSkirt(body, under).ringY));
  });

  it('is never cut inside her where she widens going down: each row is read at its own height', () => {
    // (a post that widens fast under the ring, as her seat does under the small of her back: 15 cm round at 1 m and
    // up, 1 cm wider every centimetre down to 0.9 m)
    const wide = (y: number) => 0.15 + Math.min(0.1, Math.max(0, 1 - y));
    const body = post(wide), d = draftSkirt(body, { top: 'under', length: 0.3, flare: 0, tucked: false }, underPlane(body, 0.995, 0));
    expect(d.ringY[0]).toBeCloseTo(0.995 - SKIRT_LINE.inside, 3);
    for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.columns; c += 6) {
      const i = (r * d.columns + c) * 3, R = Math.hypot(d.rest[i], d.rest[i + 2]);
      // (a post of 72 flat sides: its outline is 0.1% inside its corners)
      expect(R, `row ${r}`).toBeGreaterThan(wide(d.rest[i + 1]) * 0.999 + SKIRT_CUT.ease - 2e-4);
    }
  });
});

describe('the skirts on the menu', () => {
  it('all sit under her belly, their ring on the under-belly leggings\' line -- the style\'s line, which none of them wears', () => {
    const worn = OUTFITS.filter((o) => o.skirt);
    expect(worn.length).toBe(7);
    for (const o of worn) {
      expect(o.skirt!.top, o.name).toBe('under');
      expect((o.paint ?? []).some((l) => l.template === SKIRT_UNDER_BAND), o.name).toBe(false);
    }
    // (that style is a drawn bottom with a hoop of a waistband: what `fabricPanel.hoopOn` is asked of)
    expect(COVERAGE_TEMPLATES.some((t) => t.id === SKIRT_UNDER_BAND)).toBe(true);
  });
});

describe('on her own skin, at her body file\'s 0%, 100% and 200% bellies', () => {
  let her: HerBody, frame: LowFrame, limb: Float32Array;
  const sizes = { none: { belly: 1 }, full: {}, twice: { belly200: 1 } } as const;
  const at = (size: keyof typeof sizes) => {
    const input = bodyInputOf(her.mesh, sizes[size]), P = input.positions, places = new Float32Array(P.length);
    for (let i = 0; i < P.length; i++) places[i] = (P[i] - FACE_REST_OFFSET[i % 3]) / FACE_REST_SCALE;
    const spec = lowSpec(COVERAGE_TEMPLATES.find((t) => t.id === SKIRT_UNDER_BAND)!.params, frame), inside = hoopInside(frame, spec, limb, places)!;
    return { input, inside, spec, hipY: (input.joints.hip[0][1] + input.joints.hip[1][1]) / 2 };
  };
  beforeAll(async () => {
    her = await loadHerBody(); limb = limbSkin(her.map);
    frame = lowFrame({ unitsPerMetre: her.unitsPerMetre, facing: her.map.facing, joints: her.map.joints!, skin: { rest: her.rest, limb, index: her.index } });
  }, 120_000);

  it('tells how far inside the under-belly waistband each of her points is: her legs in, her arms and her chest out', () => {
    const { input, inside, hipY } = at('full');
    expect(inside.length).toBe(input.positions.length / 3);
    let armIn = 0, legOut = 0, chestIn = 0;
    for (let v = 0; v < inside.length; v++) {
      const y = input.positions[v * 3 + 1] - hipY;
      if (limb[v] > 0.5 && inside[v] > 0) armIn++;
      if (limb[v] < -0.5 && y < -0.2 && !(inside[v] > 0)) legOut++;
      if (y > 0.3 && inside[v] > 0) chestIn++;
    }
    expect([armIn, legOut, chestIn]).toEqual([0, 0, 0]);
    // (and a waistband that is no hoop has none to tell)
    expect(hoopInside(frame, lowSpec(COVERAGE_TEMPLATES.find((t) => t.id === 'leggingsHigh')!.params, frame), limb, new Float32Array(inside.length * 3))).toBeNull();
  });

  it('lays the ring on that line: under her belly in front, over her hips at her sides, at the small of her back behind', () => {
    const settings = { top: 'under', length: 0.17, flare: 0.55, tucked: false } as const, fronts: number[] = [];
    for (const size of ['none', 'full', 'twice'] as const) {
      const { input, inside, hipY } = at(size), d = draftSkirt(input, settings, inside), plain = draftSkirt(input, settings), cols = d.columns;
      const cm = (c: number) => (d.ringY[c] - hipY) * 100;
      fronts.push(cm(0));
      // one sweep up from her front to her back, the same on her two sides (within a centimetre)
      expect(cm(0), size).toBeLessThan(cm(cols / 4) - 3); expect(cm(cols / 4), size).toBeLessThan(cm(cols / 2) - 3);
      expect(Math.abs(cm(cols / 4) - cm((3 * cols) / 4)), size).toBeLessThan(1);
      // her back: the under-belly leggings' own back, 17.4 cm over her hip joints, less the band's share
      expect(cm(cols / 2), size).toBeGreaterThan(14.5); expect(cm(cols / 2), size).toBeLessThan(17.5);
      // no step in it: a column to the next, never more than 1.6 cm of height
      for (let c = 0; c < cols; c++) expect(Math.abs(d.ringY[c] - d.ringY[(c + 1) % cols]) * 100, `${size} col ${c}`).toBeLessThan(1.6);
      // the hem is where it was, and the ring is on her: each of its points 6 mm off the line, the line on her skin
      expect(d.hemY).toBe(plain.hemY);
      const { covered, line } = underLine(input, inside, SKIRT_LINE.inside), on = ringOn(line, 0, d.axis[1], cols);
      expect(on.found, size).toBe(1);
      // ...and under the ring it goes round her skin UNDER THE LINE, never inside it: at each row's own height
      // (her outline at a height between two slices: between the two slices' reaches)
      const form = dressForm(covered, d.hemY - 0.02, Math.max(...d.ringY) + 0.02, SKIRT_CUT.formStep);
      let insideHer = 0, read = 0;
      for (let r = 1; r < d.rows; r++) for (let c = 0; c < cols; c += 3) {
        const i = (r * cols + c) * 3, f = (d.rest[i + 1] - form.y0) / form.step, lo = form.hulls[Math.floor(f)], hi = form.hulls[Math.min(form.hulls.length - 1, Math.floor(f) + 1)];
        if (!lo || !hi || lo.length < 6 || hi.length < 6) continue;
        const a = (c / cols) * Math.PI * 2, p = reachOf(lo, 0, d.axis[1], a), q = reachOf(hi, 0, d.axis[1], a), reach = p + (f - Math.floor(f)) * (q - p);
        read++;
        if (Math.hypot(d.rest[i], d.rest[i + 2] - d.axis[1]) < reach + SKIRT_CUT.ease - 1e-4) insideHer++;
      }
      expect(read, size).toBeGreaterThan(400);
      expect(insideHer, size).toBe(0);
    }
    // HIS DRAWING'S LENGTHS ON HER: 0% where her legs part (8 cm under her hip joints), 50% a hand under her knee
    {
      const { input, inside, hipY } = at('none'), kneeY = (input.joints.knee[0][1] + input.joints.knee[1][1]) / 2;
      expect((hipY - hemOf(input.joints, 0)) * 100).toBeGreaterThan(7); expect((hipY - hemOf(input.joints, 0)) * 100).toBeLessThan(9);
      expect((kneeY - hemOf(input.joints, 0.5)) * 100).toBeGreaterThan(7); expect((kneeY - hemOf(input.joints, 0.5)) * 100).toBeLessThan(11);
      expect(draftSkirt(input, { ...settings, length: 0 }, inside).hemY).toBeCloseTo(hemOf(input.joints, 0), 9);
      // ...and a hem is never nearer the lowest of its ring than `leastDrop`: the shortest skirt under her biggest belly
      const big = at('twice'), d = draftSkirt(big.input, { ...settings, length: 0 }, big.inside), lowest = Math.min(...d.ringY);
      expect(d.hemY).toBeLessThanOrEqual(lowest - SKIRT_CUT.leastDrop + 1e-6);
      expect(d.hemY).toBeLessThanOrEqual(hemOf(big.input.joints, 0) + 1e-9);
    }
    // UNDER HER BELLY AT EVERY SIZE: its front comes down as her belly grows -- over her hip joints with none, under
    // them at her body file's 100%, lower again at its 200% -- where three heights on her trunk left it on her bump
    expect(fronts[0]).toBeGreaterThan(2); expect(fronts[0]).toBeLessThan(6.5);
    expect(fronts[1]).toBeLessThan(-0.5); expect(fronts[1]).toBeGreaterThan(-4);
    expect(fronts[2]).toBeLessThan(fronts[1] - 1);
    expect(SKIRT_TOPS.under.front * 52.6).toBeGreaterThan(fronts[1] + 5);
  });
});
