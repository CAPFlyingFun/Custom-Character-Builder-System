/**
 * A PAINTED BOTTOM'S CUT, DRAWN (`bottomCut.ts`; Joshua, 2026-11-15: "Let's work on all the bottoms…"; "let's still fix
 * the ragged edges for the painted bottoms to still work like pantyhose or tighter bottoms"; "the length of the legs and
 * top are still adjustable like how the painted bottoms work, just in a straight line on the body that also matches her
 * (body) curves").
 *
 * On her own skin (the room's body file, mapped as the room maps her): a bottom's waistband and its legs' ends are where
 * the painted ones were, and now a line and a flat ring; and in the shader, formula for formula.
 */
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  BAND_STEPS, CREASE_STEPS, FOLD_HIP, FOLD_LINE, LOW_BANDS, LOW_CUT, aheadOf, foldAt, foldEase, foldLift, foldNear, foldOf, foldShares, foldStretch, foldStretchAt, isDrawnBottom, legAlong, legBlend, legMeasure, legOf, legPlanes, legShareOf, limbSkin, lowAt, lowFrame, lowGlsl, lowSpec, planeAt, planeFront, roomAt, planeShare, roundAt, spineDepth, stayAt, swingOf,  waistAt, waistBanded,  waistLine,
  type BandPoint, type LowFrame, type LowSpec, type V3,
} from '../src/sarahlab/bottomCut';
import { LOW_SLIP_ATTRIBUTE, fabricLowWorn, setFabricLayer, setFabricLow, setFabricLowFold, setFabricLowFoldStretch, setFabricLowInner, setFabricLowLegs, setFabricLowSwing } from '../src/sarahlab/fabricMaterial';
import { makePulledSlip } from '../src/sarahlab/pulledSlip';
import { COVERAGE_TEMPLATES, RISES, coverage, pieceKind, waistline, withDial, wornParams } from '../src/sarahlab/paintTemplates';
import { loadHerBody, type HerBody } from './herBodyMap';

let her: HerBody, frame: LowFrame, limb: Float32Array, along: Float32Array, MM: number;
const template = (id: string) => COVERAGE_TEMPLATES.find((t) => t.id === id)!;
const DRAWN = ['leggingsHigh', 'leggingsLow', 'leggingsFull', 'leggingsUnder', 'leggingsCapri', 'leggingsKnee', 'shortsAthletic', 'shortsMid', 'shortsBike', 'shortsKnee', 'stockings', 'socksKnee', 'socks'];

beforeAll(async () => {
  her = await loadHerBody();
  const J = her.map.joints!;
  limb = limbSkin(her.map);
  frame = lowFrame({ unitsPerMetre: her.unitsPerMetre, facing: her.map.facing, joints: J, skin: { rest: her.rest, limb, index: her.index } });
  MM = her.unitsPerMetre / 1000;
  // each point's measure along its own leg, at rest
  const cuts = frame.legs.map((leg) => ({ planes: legPlanes(leg), blend: legBlend(leg, frame.unitsPerMetre) }));
  along = new Float32Array(her.rest.length / 3);
  for (let v = 0; v < along.length; v++) { const c = cuts[legOf(frame, her.rest[v * 3]) === frame.legs[0] ? 0 : 1]; along[v] = legMeasure(c.planes, c.blend, [her.rest[v * 3], her.rest[v * 3 + 1], her.rest[v * 3 + 2]]); }
}, 120_000);

describe('which templates are drawn bottoms', () => {
  it('the leggings, the shorts, the stockings and the socks -- and nothing with a top, a leg cut or an outline of its own', () => {
    expect(COVERAGE_TEMPLATES.filter((t) => isDrawnBottom(t.params)).map((t) => t.id)).toEqual(DRAWN);
    for (const id of ['teeShort', 'sportsBra', 'swimsuit', 'bodysuit', 'bodysuitFull', 'bikiniBottom', 'athleticBottom', 'athleticBottomEdge']) expect(isDrawnBottom(template(id).params), id).toBe(false);
    // every bottom the editor offers as a BOTTOM is one, but her bikini's (a designed garment: its own field)
    expect(COVERAGE_TEMPLATES.filter((t) => pieceKind(t.id) === 'bottom' && !isDrawnBottom(t.params)).map((t) => t.id)).toEqual(['athleticBottom', 'athleticBottomEdge']);
    expect(COVERAGE_TEMPLATES.filter((t) => pieceKind(t.id) === 'legwear').every((t) => isDrawnBottom(t.params))).toBe(true);
  });

  it('a look saved before bottoms had bands wears its template\'s, and everything it did say is as it was saved', () => {
    const before = (id: string, changed: Record<string, unknown>) => { const saved = { ...template(id).params, ...changed } as Record<string, unknown>; delete saved.lowBand; return wornParams(id, saved as never); };
    // a mid-thigh short as it was saved: its hem's band is its template's
    const mid = before('shortsMid', { riseFront: 0.11, legEnd: 0.3 });
    expect(mid.lowBand).toEqual({ leg: 0.015 });
    expect(mid.riseFront).toBe(0.11);
    expect(mid.legEnd).toBe(0.3);
    // A DEEP WAISTBAND IS ITS STYLE'S OWN RISE'S: a bike short saved on the rise it had until 2026-11-15 (under her
    // belly, its front at her pubic bone) keeps that rise and its length, and wears the plain band -- not the hand-deep
    // band of his sheet's high rise, which would bury her front
    const bike = before('shortsBike', { riseFront: -0.02, riseSide: 0.26, riseBack: 0.33, riseFrontWidth: 0.8, legEnd: 0.36 });
    expect(bike.lowBand).toEqual({ leg: 0.02 });
    expect([bike.riseFront, bike.riseSide, bike.riseBack, bike.legEnd]).toEqual([-0.02, 0.26, 0.33, 0.36]);
    expect(lowSpec(bike, frame).bands.waist).toBeCloseTo(LOW_BANDS.waist * frame.unitsPerMetre, 9);
    // saved on its style's own rise it has its style's band; and a look that says its bands keeps what it says
    expect(before('shortsBike', {}).lowBand).toEqual({ waist: 0.105, leg: 0.02 });
    expect(wornParams('shortsBike', { ...template('shortsBike').params, riseFront: 0.2, lowBand: { waist: 0.05 } }).lowBand).toEqual({ waist: 0.05 });
  });

  it('his sheet of bottoms\' tight ones are styles, with his sheet\'s rises and lengths', () => {
    const P = (id: string) => template(id).params;
    // 01 and 02: a high rise, level at her waist a hand over her navel; a low rise, a shallow curve under it
    expect([P('leggingsHigh').riseFront, P('leggingsHigh').riseSide, P('leggingsHigh').riseBack]).toEqual([RISES.high.front, RISES.high.side, RISES.high.back]);
    expect([P('leggingsLow').riseFront, P('leggingsLow').riseSide, P('leggingsLow').riseBack]).toEqual([RISES.low.front, RISES.low.side, RISES.low.back]);
    expect(RISES.high.front).toBeGreaterThan(0.232 + 0.1); // (her navel, MEASURED at 0%, and 5 cm)
    expect(RISES.low.front).toBeLessThan(0.232 - 0.08);
    expect(RISES.low.side).toBeGreaterThan(RISES.low.front);
    expect(RISES.low.back).toBeGreaterThan(RISES.low.side);
    for (const id of ['leggingsHigh', 'leggingsLow']) { expect(P(id).legEnd, id).toBe(1); expect(P(id).feet, id).toBe(false); }
    // 03 is the one there was, as it was; 04's front and back are where they were, and its SIDES half-way between
    // (they were at 0.26, over the tops of her hips): his sheet's under-belly line, from her side one line from under
    // her bump up to the small of her back -- three heights in a row
    expect([P('leggingsFull').riseFront, P('leggingsFull').riseSide, P('leggingsFull').riseBack, P('leggingsFull').legEnd]).toEqual([0.48, 0.4, 0.4, 1]);
    expect([P('leggingsUnder').riseFront, P('leggingsUnder').riseSide, P('leggingsUnder').riseBack]).toEqual([-0.02, 0.155, 0.33]);
    expect(P('leggingsUnder').riseSide! * 2).toBeCloseTo(P('leggingsUnder').riseFront! + P('leggingsUnder').riseBack!, 12);
    // 05 and 06: the capri and the bike shorts on his high rise, at his lengths
    expect([P('leggingsCapri').riseFront, P('leggingsCapri').legEnd]).toEqual([RISES.high.front, 0.72]);
    expect([P('shortsBike').riseFront, P('shortsBike').legEnd]).toEqual([RISES.high.front, 0.23]);
    // a high rise's band is a hand deep -- its seam 2.3 cm under her navel (0.232 of her trunk, MEASURED at 0%), clear
    // of it -- and a low rise's less
    for (const id of ['leggingsHigh', 'leggingsCapri', 'shortsBike']) {
      const spec = lowSpec(P(id), frame);
      expect(spec.bands.waist / MM, id).toBeCloseTo(105, 6);
      expect((0.232 * frame.trunk - (spec.waist![0] - frame.hipY - spec.bands.waist)) / MM, id).toBeGreaterThan(18);
    }
    expect(lowSpec(P('leggingsLow'), frame).bands.waist / MM).toBeCloseTo(45, 6);
    // in the editor's order his sheet's: the high rise first
    expect(COVERAGE_TEMPLATES.filter((t) => t.group === 'Leggings').map((t) => t.id)).toEqual(['leggingsHigh', 'leggingsLow', 'leggingsFull', 'leggingsUnder', 'leggingsCapri', 'leggingsKnee']);
  });

  it('the other shorts and the knee leggings are level at her waist, as his sheet\'s are (they had the maternity rises)', () => {
    // (Joshua, 2026-11-15, asked with a picture of the mid-thigh shorts on the base model beside his bike shorts:
    // "Level, like your sheet")
    const P = (id: string) => template(id).params;
    for (const id of ['leggingsKnee', 'shortsAthletic', 'shortsMid', 'shortsKnee']) expect([P(id).riseFront, P(id).riseSide, P(id).riseBack], id).toEqual([RISES.high.front, RISES.high.side, RISES.high.back]);
    // their lengths are as they were
    expect([P('leggingsKnee').legEnd, P('shortsAthletic').legEnd, P('shortsMid').legEnd, P('shortsKnee').legEnd]).toEqual([0.5, 0.12, 0.26, 0.44]);
    // the leggings wear the leggings' hand-deep band; the shorts a plain waistband -- which is what tells the
    // mid-thigh shorts from his bike shorts, now both are level
    expect(lowSpec(P('leggingsKnee'), frame).bands.waist / MM).toBeCloseTo(105, 6);
    for (const id of ['shortsAthletic', 'shortsMid', 'shortsKnee']) expect(lowSpec(P(id), frame).bands.waist / MM, id).toBeCloseTo(LOW_BANDS.waist * 1000, 6);
    expect(lowSpec(P('shortsBike'), frame).bands.waist / MM).toBeCloseTo(105, 6);
    // only the under-belly leggings are cut under a bump now -- and only theirs is a hoop (`lowSpec`'s hinge)
    expect(DRAWN.filter((id) => lowSpec(P(id), frame).hinge !== null)).toEqual(['leggingsUnder']);
  });
});

describe('her measures for a bottom', () => {
  it('her frame is her map\'s: her middle, her trunk, her spine and where a place stands round her', () => {
    const map = her.map, P = her.rest;
    expect(frame.trunk).toBeCloseTo(map.trunkLength, 9);
    expect(frame.legs[0].name).toBe('L');
    expect(frame.legs[0].hip[0]).toBeGreaterThan(frame.mid);
    expect(frame.legs[1].hip[0]).toBeLessThan(frame.mid);
    let worst = 0;
    for (let v = 0; v < map.around.length; v += 3) worst = Math.max(worst, Math.abs(roundAt(frame, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]).around - map.around[v]));
    expect(worst).toBeLessThan(1e-6);
    // her spine's depth is her nearest joint's beyond its ends
    expect(spineDepth(frame, -1e9)).toBe(frame.spine[0][1]);
    expect(spineDepth(frame, 1e9)).toBe(frame.spine[3][1]);
    // MEASURED 2026-11-15: her thigh 36.6 cm, her shin 41.4, her knee 3.4 degrees off the line from her hip to her ankle
    for (const leg of frame.legs) { expect(leg.thigh / MM / 10).toBeCloseTo(36.6, 0); expect(leg.shin / MM / 10).toBeCloseTo(41.4, 0); }
  });

  it('a waistband\'s line is the painted one\'s, at every place of her', () => {
    const map = her.map, P = her.rest;
    for (const id of ['leggingsFull', 'leggingsUnder']) {
      const p = template(id).params, spec = lowSpec(p, frame);
      let worst = 0;
      for (let v = 0; v < map.around.length; v += 3) {
        const old = (waistline(p, map.around[v]) - map.trunk[v]) * map.trunkLength, now = waistLine(spec.waist!, roundAt(frame, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]).around).height - P[v * 3 + 1];
        worst = Math.max(worst, Math.abs(old - now));
      }
      expect(worst, id).toBeLessThan(1e-5 * MM * 1000);
    }
  });

  it('how far inside a waistband a place is, is measured square to its line: the same where it climbs her hips as where it runs level', () => {
    // (the under-belly rises with no bowl: three heights in a row. Its bowl is told below)
    const spec = lowSpec({ ...template('leggingsUnder').params, lowBowl: 0 }, frame), w = spec.waist!;
    // two places 2 cm under the line by height: one at her front's middle, and one at her front's quarter
    const z = frame.spine[0][1] * frame.facing + frame.seam, at = (x: number, dz: number): V3 => { const r = roundAt(frame, x, 0, (z + dz) * frame.facing); return [x, waistLine(w, r.around).height - 20 * MM, (z + dz) * frame.facing]; };
    const level = at(frame.mid, 0.2), climb = at(frame.mid + 0.1, 0.05), lowest = Math.min(w[0], w[1], w[2]);
    // AN UNDER-BELLY LINE'S THREE HEIGHTS ARE IN A ROW: it climbs as much for each step of `around` all the way round
    // her (a waistband lying in one tilted plane). At the middle of her front a step to her side changes `around` by
    // nothing -- her two sides are alike -- so the line runs level there, and the distance is the height
    expect(waistLine(w, 1).slope).toBeCloseTo(w[0] - w[2], 9);
    expect(waistLine(w, roundAt(frame, ...climb).around).slope).toBeCloseTo(w[0] - w[2], 9);
    expect(Math.abs(w[0] - w[2])).toBeGreaterThan(0.1);
    expect(roundAt(frame, ...level).out).toBe(0);
    expect(waistAt(w, frame, ...level) / MM).toBeCloseTo(20, 6);
    // (at her front's quarter 20 mm under the line by height is nearer the line than that, across its climb; the place
    // is over the lowest of the line, where the straight line's distance is all there is to go by)
    expect(climb[1]).toBeGreaterThan(lowest);
    expect(waistAt(w, frame, ...climb) / MM).toBeLessThan(19.5);
    expect(waistAt(w, frame, ...climb) / MM).toBeGreaterThan(5);
    // A MILLIMETRE FROM HER AXIS, 20 mm under the lowest of the line: `around` runs through all its values within that
    // millimetre, the line's climb for each unit round her goes to no end and a straight line's distance to next to
    // nothing -- but no point of the line is nearer than those 20 mm, and it is inside by them, whatever her skin's
    // length across her
    const foot: V3 = [frame.mid + 0.0007 * frame.unitsPerMetre, lowest - 20 * MM, (z + 0.0007 * frame.unitsPerMetre) * frame.facing];
    expect(roundAt(frame, ...foot).radius / MM).toBeLessThan(1.1);
    { const r = roundAt(frame, ...foot), l = waistLine(w, r.around), c = (l.slope * 0.5 * r.out) / (r.radius * r.radius); expect((l.height - foot[1]) / Math.sqrt(1 + c * c) / MM).toBeLessThan(1); }
    expect(waistAt(w, frame, ...foot)).toBe(lowest - foot[1]);
    expect(waistAt(w, frame, ...foot, -0.5)).toBe(lowest - foot[1]);
    expect(waistAt(w, frame, ...foot, 1)).toBe(lowest - foot[1]);
    // WHERE HER SKIN IS SHORTER ACROSS HER THAN AT REST (her belly's at 0%: half as long) the line climbs as much over
    // half the way round: it is steeper on her, and the same height under it is nearer to it. Where the line runs
    // level, her skin's length across her changes nothing
    const rest = waistAt(w, frame, ...climb), half = waistAt(w, frame, ...climb, -0.5), twice = waistAt(w, frame, ...climb, 1);
    // (MEASURED: 15.5 mm at rest, 10.5 where her skin is half as long across her, 18.5 where it is twice as long)
    expect(half).toBeLessThan(rest * 0.8);
    expect(twice).toBeGreaterThan(rest * 1.15);
    expect(waistAt(w, frame, ...level, -0.5)).toBe(waistAt(w, frame, ...level));
    // by its slope on her: (the height under the line) over the root of (1 + (its rest slope over her skin's length)^2)
    const r = roundAt(frame, ...climb), line = waistLine(w, r.around), slope = (line.slope * 0.5 * r.out) / (r.radius * r.radius);
    expect(half).toBeCloseTo((line.height - climb[1]) / Math.sqrt(1 + (slope / 0.5) ** 2), 9);
    // never taken as shorter than a quarter of its rest length
    expect(waistAt(w, frame, ...climb, -0.99)).toBe(waistAt(w, frame, ...climb, LOW_CUT.acrossLeast - 1));
    // and `lowAt` hands it on
    const spec2 = lowSpec({ ...template('leggingsUnder').params, lowBowl: 0 }, frame);
    expect(lowAt(spec2, frame, climb, 0, 0, -0.5).waist).toBe(half);
    expect(lowAt(spec2, frame, climb, 0, 0).waist).toBe(rest);
  });

  it('a waistband\'s line is one sweep through its three heights: straight when they are in a row, and never turning back between two of them', () => {
    // exactly its heights at her front's middle, at her sides and at her back's middle, whatever they are
    for (const w of [[0.1, 0.5, 0.9], [0.9, 0.4, 0.4], [0.2, 0.2, 0.7], [0.3, 0.8, 0.5], [0.6, 0.6, 0.6]]) {
      expect(waistLine(w, 1).height).toBeCloseTo(w[0], 12);
      expect(waistLine(w, 0.5).height).toBeCloseTo(w[1], 12);
      expect(waistLine(w, 0).height).toBeCloseTo(w[2], 12);
    }
    // three in a row: a straight line in `around` -- a waistband in one tilted plane (from her side one straight line,
    // from her front a shallow U)
    for (let a = 0; a <= 1.0001; a += 0.05) { const l = waistLine([0.1, 0.5, 0.9], a); expect(l.height).toBeCloseTo(0.9 - 0.8 * a, 12); expect(l.slope).toBeCloseTo(-0.8, 12); }
    // three that are not: between two of them it never turns back (its height stays between theirs), its slope is what
    // its height does, and it turns no corner at her side
    for (const w of [[0.9, 0.4, 0.4], [0.2, 0.2, 0.7], [0.1, 0.3, 0.9], [0.9, 0.7, 0.1], [0.3, 0.8, 0.5], [-0.02, 0.26, 0.33]]) {
      for (let a = 0; a <= 1.0001; a += 0.01) {
        const l = waistLine(w, a), lo = a >= 0.5 ? Math.min(w[0], w[1]) : Math.min(w[1], w[2]), hi = a >= 0.5 ? Math.max(w[0], w[1]) : Math.max(w[1], w[2]);
        expect(l.height, `${w} ${a}`).toBeGreaterThanOrEqual(lo - 1e-12);
        expect(l.height, `${w} ${a}`).toBeLessThanOrEqual(hi + 1e-12);
        if (a > 0.001 && a < 0.999) expect(l.slope, `${w} ${a}`).toBeCloseTo((waistLine(w, a + 1e-6).height - waistLine(w, a - 1e-6).height) / 2e-6, 4);
      }
      expect(waistLine(w, 0.5 - 1e-9).slope).toBeCloseTo(waistLine(w, 0.5 + 1e-9).slope, 6);
    }
    // a side as high as the back: level all the way round her back, whatever its front's slider does
    for (const front of [0.9, 0.1, -0.2]) for (let a = 0; a <= 0.5; a += 0.05) { const l = waistLine([front, 0.4, 0.4], a); expect(l.height).toBeCloseTo(0.4, 12); expect(l.slope).toBeCloseTo(0, 12); }
    // a side that is higher than both, or lower: level where it crosses her side (it turns there)
    expect(waistLine([0.3, 0.8, 0.5], 0.5).slope).toBe(0);
    // and a look saved with an under-belly line's old heights (its sides over the tops of her hips) is a line that
    // rises all the way from her front to her back
    for (let a = 0.01; a < 1; a += 0.01) expect(waistLine([-0.02, 0.26, 0.33], a).slope).toBeLessThan(0);
  });
});

describe('her leg\'s measure', () => {
  it('a share of her leg is the place on her bones that the painted line passed through', () => {
    for (const leg of frame.legs) for (const share of [0.12, 0.22, 0.26, 0.36, 0.44, 0.5, 0.58, 0.78, 0.86, 1]) {
      const s = legAlong(leg, share), on: V3 = s <= leg.thigh ? [0, 1, 2].map((c) => leg.hip[c] + (leg.knee[c] - leg.hip[c]) * (s / leg.thigh)) as unknown as V3 : [0, 1, 2].map((c) => leg.knee[c] + (leg.ankle[c] - leg.knee[c]) * ((s - leg.thigh) / leg.shin)) as unknown as V3;
      const line = [0, 1, 2].map((c) => leg.ankle[c] - leg.hip[c]), l2 = line.reduce((a, b) => a + b * b, 0);
      expect([0, 1, 2].reduce((a, c) => a + (on[c] - leg.hip[c]) * line[c], 0) / l2).toBeCloseTo(share, 9);
    }
    // her knee stands at 0.469 of the line: under it her thigh's bone, over it her shin's
    expect(legAlong(frame.legs[0], 0.44)).toBeLessThan(frame.legs[0].thigh);
    expect(legAlong(frame.legs[0], 0.5)).toBeGreaterThan(frame.legs[0].thigh);
  });

  it('counts her rest lengths along each bone, from her hip joint, wherever her bones are', () => {
    const leg = frame.legs[0], rest = legPlanes(leg), at = (p: readonly [number, number, number, number], q: V3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3];
    expect(at(rest.thigh, leg.hip)).toBeCloseTo(0, 9);
    expect(at(rest.thigh, leg.knee)).toBeCloseTo(leg.thigh, 9);
    expect(at(rest.shin, leg.knee)).toBeCloseTo(leg.thigh, 9);
    expect(at(rest.shin, leg.ankle)).toBeCloseTo(leg.thigh + leg.shin, 9);
    // her thigh brought forward a right angle about her hip joint and made a fifth longer by her build, her shin
    // hanging from her knee: a place that rides a bone is as far along her leg as it was
    const turn = (q: V3, about: V3, k: number): V3 => { const d = [q[0] - about[0], q[1] - about[1], q[2] - about[2]]; return [about[0] + d[0] * k, about[1] - d[2] * k, about[2] + d[1] * k]; };
    const knee = turn(leg.knee, leg.hip, 1.2), ankle: V3 = [knee[0] + leg.ankle[0] - leg.knee[0], knee[1] + leg.ankle[1] - leg.knee[1], knee[2] + leg.ankle[2] - leg.knee[2]];
    const posed = legPlanes(leg, { hip: leg.hip, knee, ankle });
    const mid: V3 = [0, 1, 2].map((c) => leg.hip[c] + (leg.knee[c] - leg.hip[c]) * 0.5) as unknown as V3;
    expect(at(posed.thigh, turn(mid, leg.hip, 1.2))).toBeCloseTo(leg.thigh / 2, 9);
    expect(at(posed.thigh, knee)).toBeCloseTo(leg.thigh, 9);
    expect(at(posed.shin, knee)).toBeCloseTo(leg.thigh, 9);
    expect(at(posed.shin, ankle)).toBeCloseTo(leg.thigh + leg.shin, 9);
    // a ring is square to the bone it is on: every place of the cut is as far along (7 units out from the bone's
    // middle, square to it)
    const along = [0, 1, 2].map((c) => (leg.knee[c] - leg.hip[c]) / leg.thigh), out: V3 = [along[1], -along[0], 0], l = Math.hypot(...out);
    const side: V3 = [mid[0] + (out[0] / l) * 0.07, mid[1] + (out[1] / l) * 0.07, mid[2]];
    expect(at(rest.thigh, side)).toBeCloseTo(at(rest.thigh, mid), 9);
    expect(at(posed.thigh, turn(side, leg.hip, 1.2))).toBeCloseTo(at(posed.thigh, turn(mid, leg.hip, 1.2)), 9);
  });

  it('round her knee her skin takes a measure between her two bones\', by where it lies at rest', () => {
    const leg = frame.legs[0], planes = legPlanes(leg), blend = legBlend(leg, frame.unitsPerMetre), U = frame.unitsPerMetre;
    const down = (m: number): V3 => (m < 0 ? [0, 1, 2].map((c) => leg.knee[c] + ((leg.hip[c] - leg.knee[c]) / leg.thigh) * -m * U) : [0, 1, 2].map((c) => leg.knee[c] + ((leg.ankle[c] - leg.knee[c]) / leg.shin) * m * U)) as unknown as V3;
    const by = (p: readonly [number, number, number, number], q: V3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3];
    // her knee joint itself: the same by either bone
    expect(legMeasure(planes, blend, leg.knee)).toBeCloseTo(leg.thigh, 9);
    // 6 cm over her knee her thigh's alone, 6 cm under it her shin's alone
    expect(legMeasure(planes, blend, down(-0.06))).toBeCloseTo(by(planes.thigh, down(-0.06)), 9);
    expect(legMeasure(planes, blend, down(0.06))).toBeCloseTo(by(planes.shin, down(0.06)), 9);
    // her thigh brought up a right angle: skin 10 cm up her thigh is still measured by her thigh, wherever her shin's
    // cut would have it
    const knee: V3 = [leg.hip[0], leg.hip[1], leg.hip[2] + leg.thigh], posed = legPlanes(leg, { hip: leg.hip, knee, ankle: [knee[0], knee[1] - leg.shin, knee[2]] });
    const rest = down(-0.1), now: V3 = [leg.hip[0], leg.hip[1], leg.hip[2] + leg.thigh - 0.1 * U];
    expect(legMeasure(posed, blend, rest, now)).toBeCloseTo(leg.thigh - 0.1 * U, 6);
  });
});

describe('each drawn bottom on her own rest skin', () => {
  /** Where an edge crosses the sides of her triangles (her leg's skin's, or all of her but her arms'): the crossings' places. */
  const crossings = (value: (v: number) => number, keep: (v: number) => boolean): V3[] => {
    const out: V3[] = [], P = her.rest, I = her.index;
    for (let t = 0; t < I.length; t += 3) {
      const tri = [I[t], I[t + 1], I[t + 2]];
      if (!tri.every(keep)) continue;
      for (const [a, b] of [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]]) {
        const fa = value(a), fb = value(b);
        if ((fa > 0) === (fb > 0)) continue;
        const u = fa / (fa - fb);
        out.push([P[a * 3] + (P[b * 3] - P[a * 3]) * u, P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * u, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * u]);
      }
    }
    return out;
  };

  it('its legs end in a flat ring square to the bone, where the painted line ran', () => {
    const report: string[] = [];
    for (const id of DRAWN) {
      const p = template(id).params, spec = lowSpec(p, frame);
      for (const [edge, share] of [[spec.end, p.legEnd], [spec.start, p.legStart]] as const) {
        if (edge === null) continue;
        const ring = crossings((v) => edge - along[v], (v) => limb[v] === -1);
        expect(ring.length, id).toBeGreaterThan(300);
        let flat = 0, old = 0;
        for (const q of ring) {
          const leg = legOf(frame, q[0]), onThigh = edge <= leg.thigh, from = onThigh ? leg.hip : leg.knee, to = onThigh ? leg.knee : leg.ankle, length = onThigh ? leg.thigh : leg.shin;
          flat = Math.max(flat, Math.abs([0, 1, 2].reduce((a, c) => a + ((q[c] - from[c]) * (to[c] - from[c])) / length, 0) - (onThigh ? edge : edge - leg.thigh)));
          const line = [0, 1, 2].map((c) => leg.ankle[c] - leg.hip[c]), l2 = line.reduce((a, b) => a + b * b, 0);
          old = Math.max(old, Math.abs([0, 1, 2].reduce((a, c) => a + (q[c] - leg.hip[c]) * line[c], 0) / l2 - share) * Math.sqrt(l2));
        }
        report.push(`${id}: ${ring.length} crossings, ${(flat / MM).toFixed(2)} mm off flat, the painted line ${(old / MM).toFixed(2)} mm off it`);
        // (MEASURED 2026-11-15: flat to a hundredth of a millimetre on her thigh and her shin; within 4 cm of her knee,
        // where her two bones' cuts are blended and stand 3.4 degrees apart at rest, 0.7 to 0.9 mm off one bone's)
        expect(flat / MM, id).toBeLessThan(Math.abs(edge - legOf(frame, 1).thigh) < LOW_CUT.kneeBlend * frame.unitsPerMetre ? 1.2 : 0.02);
        // (the painted line was square to the line from her hip to her ankle: 1.7 to 3.5 mm off across her leg)
        expect(old / MM, id).toBeLessThan(4);
      }
    }
    expect(report.length).toBe(13);
  });

  it('its legs\' ends are clear of the row of her triangles that joins her leg\'s skin to the rest of her', () => {
    const I = her.index, row: number[] = [];
    for (let t = 0; t < I.length; t += 3) { const tri = [I[t], I[t + 1], I[t + 2]], legs = tri.filter((v) => limb[v] === -1).length; if (legs > 0 && legs < 3 && tri.every((v) => limb[v] <= 0)) row.push(...tri); }
    // (MEASURED: 627 triangles, round her groin's creases, over her seat and up to her hips' crests)
    expect(row.length / 3).toBeGreaterThan(500);
    for (const id of DRAWN) {
      const spec = lowSpec(template(id).params, frame);
      // a leg's end is under the row by more than its band and 2 cm (the shortest shorts': 45 mm); a stocking's top 12 cm under it
      if (spec.end !== null) expect(Math.min(...row.map((v) => spec.end! - along[v])) / MM, id).toBeGreaterThan(spec.bands.leg / MM + 20);
      if (spec.start !== null) expect(Math.min(...row.map((v) => spec.start! - along[v])) / MM, id).toBeGreaterThan(100);
    }
    // no triangle of hers joins an arm's skin to a leg's: one number a vertex says both
    for (let t = 0; t < I.length; t += 3) { const l = [limb[I[t]], limb[I[t + 1]], limb[I[t + 2]]]; expect(l.includes(1) && l.includes(-1)).toBe(false); }
    expect(legShareOf(-1)).toBe(1); expect(legShareOf(0)).toBe(0); expect(legShareOf(1)).toBe(0);
  });

  it('her paint per vertex finds the garment where the room draws it, and nothing of a bottom is on her arms', () => {
    const P = her.rest, n = P.length / 3;
    for (const id of DRAWN) {
      const p = template(id).params, spec = lowSpec(p, frame), paint = coverage(her.map, p);
      let checked = 0, wrong = 0;
      for (let v = 0; v < n; v++) {
        const e = lowAt(spec, frame, [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], along[v], limb[v]);
        if (limb[v] === 1) { expect(e.inside).toBeLessThan(0); if (paint[v] > 0.01) wrong++; continue; }
        // (5 cm from any edge: a painted edge's ramp is 2 to 3 cm either side of it)
        if (Math.abs(e.inside) < 50 * MM) continue;
        checked++;
        if ((e.inside > 0) !== (paint[v] > 0.5)) wrong++;
      }
      expect(checked, id).toBeGreaterThan(70_000);
      expect(wrong, id).toBe(0);
    }
  }, 60_000);

  it('a stocking has no waistband and is on her leg\'s skin alone; a bottom covers the rest of her under its waistband whatever her legs do', () => {
    const stockings = lowSpec(template('stockings').params, frame), shorts = lowSpec(template('shortsAthletic').params, frame);
    expect(stockings.waist).toBeNull();
    expect(stockings.end).toBeNull();
    expect(stockings.bands).toEqual({ waist: 0, leg: 0, top: 0.045 * frame.unitsPerMetre });
    expect(shorts.bands.waist).toBeCloseTo(LOW_BANDS.waist * frame.unitsPerMetre, 9);
    expect(shorts.bands.leg).toBeCloseTo(0.015 * frame.unitsPerMetre, 9);
    expect(shorts.start).toBeNull();
    // her seat's skin, under the shorts' waistband: her leg's (it hangs from her thigh bone), and the garment's
    const seat: V3 = [frame.mid + 0.08, frame.hipY, (frame.spine[0][1] - 0.1) * frame.facing];
    expect(lowAt(shorts, frame, seat, 0.02, -1).inside).toBeGreaterThan(0);
    // skin that is not her leg's, far past the hem as her thigh's cut would measure it (her belly, in front of a thigh
    // brought forward): the garment's all the same; her leg's skin there is bare
    expect(lowAt(shorts, frame, seat, 0.5, 0).inside).toBeGreaterThan(0);
    expect(lowAt(shorts, frame, seat, 0.5, -1).inside).toBeLessThan(0);
    // and the same places in a stocking: her leg's skin past its top, and nothing else of her
    expect(lowAt(stockings, frame, seat, 0.5, -1).inside).toBeGreaterThan(0);
    expect(lowAt(stockings, frame, seat, 0.5, 0).inside).toBeLessThan(0);
    expect(lowAt(stockings, frame, seat, 0.1, -1).inside).toBeLessThan(0);
  });

  it('a waistband\'s band stops at a level line above her cleft, whatever its line does', () => {
    // the floor: 2.6 cm under her hip joints (the top of her cleft is 3.45 cm under them)
    expect((frame.hipY - frame.floor) / MM).toBeCloseTo(LOW_CUT.bandFloor * 1000, 6);
    const U = frame.unitsPerMetre, z = (frame.spine[0][1] + 0.1) * frame.facing, under = lowSpec(template('leggingsUnder').params, frame), depth = under.bands.waist;
    expect(depth / MM).toBeCloseTo(15, 6);
    const frontAt = (cm: number): V3 => [frame.mid, frame.hipY + (cm / 100) * U, z], banded = (spec: LowSpec, at: V3) => lowAt(spec, frame, at, 0, 0).banded;
    // an under-belly waistband's front lies a centimetre under her hip joints. Two centimetres under them a place is
    // 1 cm inside its line and 0.6 over the floor: the band's; three centimetres under, it is 2 cm inside the line -- a
    // band 3 cm deep would have it -- and under the floor: not the band's
    expect(waistAt(under.waist!, frame, ...frontAt(-2)) / MM).toBeCloseTo(9.5, 0);
    expect(banded(under, frontAt(-2))).toBeLessThan(depth);
    expect(waistAt(under.waist!, frame, ...frontAt(-3)) / MM).toBeLessThan(30);
    expect(banded(under, frontAt(-3))).toBeGreaterThan(depth);
    // exactly at the floor it is the band's edge, wherever the place stands round her and however its line climbs there
    for (const x of [0, 0.03, 0.07, 0.11]) expect(lowAt(under, frame, [frame.mid + x * U, frame.floor, z], 0, 0).banded, String(x)).toBeGreaterThanOrEqual(depth - 1e-9);
    // well over the floor the band is as its line has it: `waistBanded` gives the distance inside the line back
    const side: V3 = [frame.mid + 0.18 * U, frame.hipY + 0.12 * U, frame.spine[0][1] * frame.facing + frame.seam];
    expect(banded(under, side)).toBe(waistAt(under.waist!, frame, ...side));
    expect(waistBanded(0.01, 0.03, frame, frame.floor + 0.05)).toBe(0.01);
    expect(waistBanded(0.01, 0.03, frame, frame.floor)).toBe(0.03);
    expect(waistBanded(0.01, 0.03, frame, frame.floor + 0.012)).toBeCloseTo(0.018, 12);
    // a high rise's hand-deep band ends 10 cm over her hip joints, far over the floor: untouched
    const high = lowSpec(template('leggingsHigh').params, frame);
    expect(banded(high, frontAt(15))).toBe(waistAt(high.waist!, frame, ...frontAt(15)));
    // a stocking has no waistband: nothing is its band's
    expect(lowAt(lowSpec(template('stockings').params, frame), frame, frontAt(-2), 0.5, -1).banded).toBe(LOW_CUT.far);
  });

  it('between her legs, where her axis comes out of her, a place is as far inside a waistband as it is under the lowest of its line', () => {
    const P = her.rest, I = her.index, U = frame.unitsPerMetre, half = (LOW_CUT.range * U) / 2;
    // the distance to a straight line alone, as it was: what the bound mends
    const straight = (w: readonly number[], x: number, y: number, z: number) => { const r = roundAt(frame, x, y, z), l = waistLine(w as Parameters<typeof waistLine>[0], r.around), climb = (l.slope * 0.5 * r.out) / (r.radius * r.radius); return (l.height - y) / Math.sqrt(1 + climb * climb); };
    // every triangle of hers from 12 cm under her hip joints up to 2 cm under the LOWEST of the line (her arms' left
    // out), twenty-eight places a triangle: how many are told to be within half the edge's range of the line -- drawn
    // part cloth, part her skin
    const told: Record<string, number> = {}, was: Record<string, number> = {};
    let nearest = Infinity, nearestAt = [0, 0, 0, 0], nearer = 0;
    for (const id of ['leggingsUnder', 'leggingsLow', 'leggingsFull', 'leggingsHigh']) {
      const w = lowSpec(template(id).params, frame).waist!, lo = Math.min(w[0], w[1], w[2]);
      told[id] = 0; was[id] = 0;
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3, top = Math.max(P[a + 1], P[b + 1], P[c + 1]);
        if (top > lo - 0.02 * U || top < frame.hipY - 0.12 * U || limb[I[t]] > 0.5) continue;
        for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6 - i; j++) {
          const u = i / 6, v = j / 6, k = 1 - u - v, x = P[a] * k + P[b] * u + P[c] * v, y = P[a + 1] * k + P[b + 1] * u + P[c + 1] * v, z = P[a + 2] * k + P[b + 2] * u + P[c + 2] * v;
          const d = waistAt(w, frame, x, y, z), s = straight(w, x, y, z);
          if (d < half) told[id]++;
          if (s < half) { was[id]++; if (id === 'leggingsUnder' && s < nearest) { nearest = s; nearestAt = [roundAt(frame, x, y, z).radius, frame.hipY - y, lo - y, d]; } }
          // (the bound only ever takes a place further from the line, and never under how far under the lowest it is)
          if (d < s || d < lo - y) nearer++;
        }
      }
    }
    expect(nearer).toBe(0);
    // MEASURED 2026-11-15, the straight line's distance alone: thousands of places under an under-belly line, a few
    // under a low rise and an over-belly one, none under the high rise (which is nearly level)...
    expect(was.leggingsUnder).toBeGreaterThan(1500);
    expect(was.leggingsLow).toBeGreaterThan(10);
    expect(was.leggingsFull).toBeGreaterThan(5);
    expect(was.leggingsHigh).toBe(0);
    // ...the nearest of them a quarter of a millimetre from the line, at a place within 2 mm of her axis, 3 to 5 cm
    // under her hip joints and more than 2 cm under the lowest of the line -- which the bound says it is inside by
    expect(nearest / MM).toBeLessThan(1);
    expect(nearestAt[0] / MM).toBeLessThan(2);
    expect(nearestAt[1] / MM).toBeGreaterThan(30);
    expect(nearestAt[1] / MM).toBeLessThan(50);
    expect(nearestAt[3]).toBeCloseTo(nearestAt[2], 12);
    expect(nearestAt[3] / MM).toBeGreaterThan(20);
    // with it: none
    expect(told).toEqual({ leggingsUnder: 0, leggingsLow: 0, leggingsFull: 0, leggingsHigh: 0 });
  }, 120_000);

  it('the bound changes nothing between the lowest and the highest of a line, and holds over the highest as under the lowest', () => {
    const U = frame.unitsPerMetre, under = lowSpec({ ...template('leggingsUnder').params, lowBowl: 0 }, frame).waist!, lo = Math.min(under[0], under[1], under[2]), hi = Math.max(under[0], under[1], under[2]);
    expect(hi - lo).toBeGreaterThan(0.1 * U);
    const straight = (x: number, y: number, z: number) => { const r = roundAt(frame, x, y, z), l = waistLine(under, r.around), climb = (l.slope * 0.5 * r.out) / (r.radius * r.radius); return (l.height - y) / Math.sqrt(1 + climb * climb); };
    // rings round her axis at many distances from it, a millionth of a metre among them, at heights from the lowest of
    // the line to the highest: exactly the straight line's distance
    for (const t of [0, 0.1, 0.37, 0.5, 0.82, 1]) {
      const y = lo + (hi - lo) * t, ax = frame.mid, az = spineDepth(frame, y) + frame.seam * frame.facing;
      for (const radius of [1e-6, 0.001, 0.02, 0.1, 0.16]) for (let k = 0; k < 24; k++) {
        const th = (k / 24) * Math.PI * 2, x = ax + Math.sin(th) * radius * U, z = az + Math.cos(th) * radius * U * frame.facing;
        expect(waistAt(under, frame, x, y, z), `${t} ${radius} ${k}`).toBe(straight(x, y, z));
      }
    }
    // a millionth of a metre from her axis, where the line climbs: the straight line's distance is next to nothing
    // whatever the height -- 5 cm under the lowest of the line it is inside by those 5 cm, 5 cm over the highest it is
    // outside by them
    const y0 = lo - 0.05 * U, y1 = hi + 0.05 * U;
    let seen = 0;
    for (let k = 0; k < 48; k++) {
      const th = (k / 48) * Math.PI * 2, at = (y: number): [number, number, number] => [frame.mid + Math.sin(th) * 1e-6 * U, y, spineDepth(frame, y) + frame.seam * frame.facing + Math.cos(th) * 1e-6 * U * frame.facing];
      // (but straight ahead of her axis and straight behind it, where a step to her side changes `around` by nothing)
      if (Math.abs(Math.sin(th)) > 0.1) { seen++; expect(Math.abs(straight(...at(y0))) / MM, String(k)).toBeLessThan(0.1); expect(Math.abs(straight(...at(y1))) / MM, String(k)).toBeLessThan(0.1); }
      expect(waistAt(under, frame, ...at(y0)), String(k)).toBeGreaterThanOrEqual(0.05 * U - 1e-9);
      expect(waistAt(under, frame, ...at(y1)), String(k)).toBeLessThanOrEqual(-0.05 * U + 1e-9);
    }
    expect(seen).toBeGreaterThan(8);
  });

  it('the sliders move its edges as they moved the painted ones: WAISTBAND, HIPS & BACK RISE, LEG LENGTH, LEG TOP', () => {
    const p = template('shortsBike').params, was = lowSpec(p, frame);
    const higher = lowSpec(withDial(p, 'rise', 0.2), frame), back = lowSpec(withDial(p, 'riseBack', 0.5), frame), longer = lowSpec(withDial(p, 'legEnd', 0.6), frame);
    expect(higher.waist![0] - was.waist![0]).toBeCloseTo((0.2 - p.riseFront!) * frame.trunk, 9);
    expect(higher.waist!.slice(1)).toEqual(was.waist!.slice(1));
    expect(back.waist![2] - was.waist![2]).toBeCloseTo((0.5 - p.riseBack!) * frame.trunk, 9);
    expect(back.waist![1] - was.waist![1]).toBeCloseTo((0.5 - p.riseBack!) * frame.trunk, 9);
    expect(longer.end! - was.end!).toBeGreaterThan(0.15 * frame.unitsPerMetre);
    const s = template('stockings').params, lower = lowSpec(withDial(s, 'legStart', 0.4), frame);
    expect(lower.start!).toBeGreaterThan(lowSpec(s, frame).start! + 0.1 * frame.unitsPerMetre);
  });
});

describe('a waistband on her own skin as her belly moves it (her body file\'s own belly morphs)', () => {
  /**
   * A line's turns from one of her triangles to the next (degrees; pieces under 1.5 mm left out: a sliver's turn is no
   * kink a person sees): where `value`, a number a vertex, crosses nothing over the region's triangles, on `surface`.
   */
  const turnsOf = (value: Float32Array, surface: Float32Array, inRegion: Uint8Array) => {
    const P = her.rest, I = her.index, n = P.length / 3, pointOf = new Int32Array(n), ids = new Map<string, number>();
    for (let v = 0; v < n; v++) { const k = `${P[v * 3]},${P[v * 3 + 1]},${P[v * 3 + 2]}`; let p = ids.get(k); if (p === undefined) { p = ids.size; ids.set(k, p); } pointOf[v] = p; }
    const ends = new Map<number, V3>(), segs: [number, number][] = [];
    const cross = (a: number, b: number): number | null => {
      if ((value[a] > 0) === (value[b] > 0)) return null;
      const pa = pointOf[a], pb = pointOf[b], k = pa < pb ? pa * ids.size + pb : pb * ids.size + pa;
      if (!ends.has(k)) { const t = value[a] / (value[a] - value[b]); ends.set(k, [surface[a * 3] + (surface[b * 3] - surface[a * 3]) * t, surface[a * 3 + 1] + (surface[b * 3 + 1] - surface[a * 3 + 1]) * t, surface[a * 3 + 2] + (surface[b * 3 + 2] - surface[a * 3 + 2]) * t]); }
      return k;
    };
    for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (!inRegion[a] || !inRegion[b] || !inRegion[c]) continue; const ks = [cross(a, b), cross(b, c), cross(c, a)].filter((k): k is number => k !== null); if (ks.length === 2) segs.push([ks[0], ks[1]]); }
    const at = new Map<number, number[]>();
    segs.forEach(([a, b], i) => { for (const k of [a, b]) { const l = at.get(k); if (l) l.push(i); else at.set(k, [i]); } });
    const turns: number[] = [];
    for (const [k, list] of at) {
      if (list.length !== 2) continue;
      const other = (i: number) => (segs[i][0] === k ? segs[i][1] : segs[i][0]);
      const a = ends.get(other(list[0]))!, m = ends.get(k)!, b = ends.get(other(list[1]))!;
      const u = [m[0] - a[0], m[1] - a[1], m[2] - a[2]], w = [b[0] - m[0], b[1] - m[1], b[2] - m[2]], lu = Math.hypot(...u), lw = Math.hypot(...w);
      if (lu < 1.5 * MM || lw < 1.5 * MM) continue;
      turns.push((Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (lu * lw)))) * 180) / Math.PI);
    }
    turns.sort((x, y) => x - y);
    return { count: turns.length, ninety: turns[Math.floor(turns.length * 0.9)], most: turns[turns.length - 1], over15: turns.filter((t) => t > 15).length };
  };

  it('looked up at her rest place it is torn; with her slip pulled back it is a line again, at her biggest belly and at none', () => {
    const P = her.rest, n = P.length / 3, U = frame.unitsPerMetre, g = her.mesh.geometry, named = her.mesh.morphTargetDictionary!;
    const y0 = frame.hipY - LOW_CUT.slipUnder * U, y1 = frame.hipY + LOW_CUT.slipOver * U;
    const solver = makePulledSlip(P, her.index, (v) => limb[v] !== 1 && P[v * 3 + 1] >= y0 && P[v * 3 + 1] <= y1);
    // (MEASURED 2026-11-15: 23,527 points, 26,138 of her vertices)
    expect(solver.points).toBeGreaterThan(20_000);
    const inRegion = new Uint8Array(n);
    for (const v of solver.vertices) inRegion[v] = 1;
    const waist = lowSpec(template('leggingsFull').params, frame).waist!;
    const atRest = new Float32Array(n);
    for (let v = 0; v < n; v++) atRest[v] = waistAt(waist, frame, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    // on her body file itself the over-belly waistband is a line (MEASURED: its turns 3.2 degrees at their 90th
    // percentile, 9.1 at the most)
    const file = turnsOf(atRest, P, inRegion);
    expect(file.ninety).toBeLessThan(4.5);
    expect(file.most).toBeLessThan(12);
    // `belly200`: her file's 100% belly to her 200%, 13.6 cm at the most; `belly`: to none, 16.2 cm
    for (const [name, tornAt, lineAt, lineMost, front] of [['belly200', 12, 5.5, 12, [1.05, 1.4]], ['belly', 22, 7.5, 26, [0.4, 0.6]]] as const) {
      const m = g.morphAttributes.position![named[name]], move = new Float32Array(solver.vertices.length * 3), surface = Float32Array.from(P);
      for (let v = 0; v < n; v++) { surface[v * 3] += m.getX(v); surface[v * 3 + 1] += m.getY(v); surface[v * 3 + 2] += m.getZ(v); }
      solver.vertices.forEach((v, k) => { move[k * 3] = m.getX(v); move[k * 3 + 1] = m.getY(v); move[k * 3 + 2] = m.getZ(v); });
      const job = solver.begin(move);
      job.step(1e6);
      const across = new Float32Array(solver.vertices.length), slip = solver.pull([{ part: job.part(), weight: 1 }], undefined, across);
      const pulled = Float32Array.from(atRest);
      solver.vertices.forEach((v, k) => { pulled[v] = waistAt(waist, frame, P[v * 3] + slip[k * 3], P[v * 3 + 1] + slip[k * 3 + 1], P[v * 3 + 2] + slip[k * 3 + 2]); });
      // (MEASURED 2026-11-15, a value a vertex as it was: 16.7 degrees at its 90th percentile and 61 at the most, 20
      // turns over 15 degrees at 200%; 31.0 and 68, 33 turns, at none. Pulled back: 4.0 and 7.9, none over 15, at
      // 200%; 5.7 and 20.6, one, at none)
      const torn = turnsOf(atRest, surface, inRegion), line = turnsOf(pulled, surface, inRegion);
      expect(torn.ninety, name).toBeGreaterThan(tornAt);
      expect(torn.over15, name).toBeGreaterThan(15);
      expect(line.ninety, name).toBeLessThan(lineAt);
      expect(line.most, name).toBeLessThan(lineMost);
      expect(line.over15, name).toBeLessThan(3);
      // HER SKIN'S LENGTH ACROSS HER, a third of the way up her trunk: at her front's middle half as long at none
      // (MEASURED 0.49) and a fifth longer at 200% (1.18); at her back as long as it was
      const frontMid: number[] = [], back: number[] = [];
      solver.vertices.forEach((v, k) => { if (Math.abs((P[v * 3 + 1] - frame.hipY) / frame.trunk - 0.26) > 0.02) return; if (her.map.around[v] > 0.93) frontMid.push(1 + across[k]); if (her.map.around[v] < 0.1) back.push(1 + across[k]); });
      const middle = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1];
      expect(middle(frontMid), name).toBeGreaterThan(front[0]);
      expect(middle(frontMid), name).toBeLessThan(front[1]);
      expect(middle(back), name).toBeCloseTo(1, 1);
    }
  }, 120_000);
});

/** Her skin's program as three compiles it, from a stub of its standard chunks, with (or without) a drawn bottom on a layer. */
function compiled(low: LowSpec | null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  const m = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(g, m);
  const layer = { texture: new THREE.Texture(), tile: 1, opacity: 1 };
  setFabricLayer(mesh, m, 1, low ? { ...layer, low: { waist: low.waist, end: low.end, start: low.start, band: [low.bands.waist, low.bands.leg, low.bands.top], shade: 0.1, hinge: low.hinge ? low.hinge[0] : null, edging: null } } : layer, { layers: 3, masked: true, rest: null });
  const s = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>', fragmentShader: '#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>\n#include <map_fragment>' };
  m.onBeforeCompile(s as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return { ...s, material: m, mesh, key: m.customProgramCacheKey(), hash: createHash('sha256').update(`${s.vertexShader}\n---\n${s.fragmentShader}`).digest('hex') };
}

describe('a bottom\'s cut in the shader', () => {
  it('her skin\'s program is exactly as it was until a layer is a drawn bottom', () => {
    const plain = compiled(null);
    // (the hash `tests/topDetails.test.ts` holds her skin's program to)
    // (2026-11-19: her paint unpacked two layers to a number, `bodyPaint.PAINT_PACK`, for six layers)
    expect(plain.hash).toBe('60f831b4ca8a567a0aa1b1c282665f5df1528a66473d1d20945ce0fd739807c0');
    expect(plain.key).not.toContain('-low');
    expect(plain.fragmentShader).not.toContain('fabricLow');
    expect(plain.vertexShader).not.toContain('vFabricLow');
    expect(fabricLowWorn(plain.material)).toBe(false);
    // her measures laid on a material that has no bottom's code change nothing
    setFabricLow(plain.material, null);
    expect(plain.uniforms.fabricLowAxis).toBeUndefined();
  });

  it('a layer that is one is given the code, its uniforms, and its edges each antialiased by its own slope', () => {
    const spec = lowSpec(template('shortsBike').params, frame), s = compiled(spec);
    expect(s.key).toContain('-low');
    expect(fabricLowWorn(s.material)).toBe(true);
    expect(s.fragmentShader).toContain(lowGlsl());
    for (const i of [0, 1, 2]) for (const u of [`uniform float fabricLowOn${i};`, `uniform vec4 fabricLowWaist${i};`, `uniform vec4 fabricLowLeg${i};`, `uniform vec4 fabricLowBand${i};`, `uniform vec4 fabricLowSwing${i};`, `uniform float fabricLowInnerOn${i};`]) expect(s.fragmentShader).toContain(u);
    for (const u of ['uniform vec4 fabricLowStay;', `uniform float fabricLowCrease[${CREASE_STEPS}];`, 'uniform vec4 fabricLowTurn;', `uniform vec4 fabricLowInner[${(BAND_STEPS / 4) * 3}];`]) expect(s.fragmentShader).toContain(u);
    // her leg's measure: by her thigh's bone and her shin's where they are now, blended by where the point lies at
    // rest -- the fourth number of a varying whose first three are where the point stands AS SHE IS SHAPED, before her
    // bones pose her (a hoop's surface is told there)
    expect(s.vertexShader).toContain('float fabricByThigh = dot(fabricLegLeft ? fabricLowLegL[0] : fabricLowLegR[0], fabricPosed), fabricByShin = dot(fabricLegLeft ? fabricLowLegL[1] : fabricLowLegR[1], fabricPosed);');
    expect(s.vertexShader).toContain('vFabricLow.w = mix(fabricByThigh, fabricByShin, smoothstep(-1.0, 1.0, dot(fabricLegLeft ? fabricLowLegL[2] : fabricLowLegR[2], vec4(fabricRest, 1.0))));');
    expect(s.vertexShader).toContain('vFabricLow.xyz = transformed;\n#include <skinning_vertex>');
    // the waistband is looked up at the pixel's rest place and her skin's slip -- which rides in the SHOW REGIONS
    // overlay's attribute, and is left out while the overlay is on
    expect(LOW_SLIP_ATTRIBUTE).toBe('fabricRegionTint');
    expect(s.fragmentShader).toContain('vec3 fabricLowPlace = vFabricPos + vFabricTint.xyz * (1.0 - fabricShowRegions);');
    // (its fourth number: how much longer her skin is across her there than at rest)
    expect(s.fragmentShader).toContain('float fabricLowAcross = vFabricTint.w * (1.0 - fabricShowRegions);');
    for (const i of [0, 1, 2]) expect(s.fragmentShader).toContain(`fwd = fabricLowInside(fabricLowWaist${i}, fabricLowPlace, fabricLowR, fabricLowAcross); fcw = fabricEdge(clamp(0.5 + fwd / (2.0 * fabricLowAxis.w), 0.0, 1.0));`);
    // AN UNDER-BELLY WAISTBAND'S HOOP: once it has swung (its sine over nothing) its distance is the nearer of its
    // line's and its hoop's -- how far the pixel stands under the swung surface as she is shaped, or under her crease --
    // and its cover is that distance's. A waistband that has not swung is its line's alone
    for (const i of [0, 1, 2]) {
      expect(s.fragmentShader).toContain(`if (fabricLowLeg${i}.z > 0.5 && fabricLowSwing${i}.z > 0.0) {`);
      expect(s.fragmentShader).toContain(`fhd = fabricLowFold(fabricLowHoop(fabricLowStayAt(fabricLowWaist${i}, fabricLowSwing${i}, vFabricLow.xyz), fabricLowUnder(fabricLowPlace, vFabricLow.xyz, fabricLegShare)), vFabricLow.xyz, fabricLegShare);`);
      // IN FRONT OF HER, HIS LINE UNDER HER BELLY (`foldAt`; after its front moon): eased into the hoop's edge out
      // towards her hips, her trunk's skin no further forward than the fold wherever it is laid, and its band his
      // line's, as deep on her as she is drawn out there (`foldStretch`)
      expect(s.fragmentShader).toContain(`vec4 ffl = fabricLowFoldLine(fabricLowPlace, vFabricLow.xyz, fabricLegShare, fabricLowFront${i}.x, fabricLowFront${i}.y);`);
    }
    expect(s.fragmentShader).toContain('fws = fabricLowHeld(fwd, fhd);');
    expect(s.fragmentShader).toContain('ffw = ffl.y * ffl.x;');
    expect(s.fragmentShader).toContain('ffd = ffl.z * fabricLowFoldStretch(fabricLowPlace);');
    expect(s.fragmentShader).toContain('fws += (min(mix(fws, min(fwd, ffl.z), ffl.x), ffl.w) - fws) * ffl.y;');
    expect(s.fragmentShader).toContain('fnd = fabricLowHeld(fnw, fabricLowNear(fhd));');
    expect(s.fragmentShader).toContain('fws = mix(fws, fpl, fpw);');
    // (its band by how far along her skin: where her skin lies nearly along the plane -- under the front of a belly at
    // 100% -- the plane's own distance drew the band three times as deep, MEASURED in the room)
    expect(s.fragmentShader).toContain('fpd = fabricLowNearTo(fpl, 1.0);');
    expect(s.fragmentShader).toContain(`fnd += (min(mix(fnd, min(fnw, fabricLowNearTo(ffl.z, ${LOW_CUT.nearFoldCap.toFixed(1)})), ffl.x), fabricLowNear(ffl.w)) - fnd) * ffl.y;`);
    expect(s.fragmentShader).toContain('uniform float fabricLowFoldT[16];');
    expect(s.fragmentShader).toContain('uniform float fabricLowFoldS[16];');
    // (his line is laid after the moon, so where it is laid it is all of the edge)
    expect(s.fragmentShader.indexOf('vec4 ffl = fabricLowFoldLine')).toBeGreaterThan(s.fragmentShader.indexOf('fmw = fabricLowMoonShare'));
    expect(s.fragmentShader).toContain('fcw = fabricEdge(clamp(0.5 + fws / (2.0 * fabricLowAxis.w), 0.0, 1.0));');
    // A WAISTBAND'S BAND: inside its line by less than its depth AND over the floor, a level line above her cleft --
    // two edges, each antialiased by its own slope; under the floor nothing of it is drawn, whatever the distance
    // inside its line says there (`waistBanded`: the same places)
    expect(s.fragmentShader).toContain('uniform float fabricLowFloor;');
    for (const i of [0, 1, 2]) {
      expect(s.fragmentShader).toContain(`} else if (fabricLowBand${i}.x > 0.0) {`);
      expect(s.fragmentShader).toContain(`float fa = max(fwidth(fwd) * 0.75, 1e-7), fh = fabricLowPlace.y - fabricLowFloor, fg = max(fwidth(fh) * 0.75, 1e-7);`);
      expect(s.fragmentShader).toContain(`float fin = 1.0 - smoothstep(fabricLowBand${i}.x - fa, fabricLowBand${i}.x + fa, fwd), fup = smoothstep(-fg, fg, fh), fi = fin * fup;`);
      // its seam: along its inner edge over the floor, and along the floor where that cuts it
      expect(s.fragmentShader).toContain(`fc *= 1.0 - fabricCutSeam.x * max(fup * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fa, abs(fwd - fabricLowBand${i}.x))), fin * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fg, abs(fh))));`);
    }
    // A HOOP'S BAND IS ITS OWN TABLE'S, once one is laid: the cloth over its inner edge -- a height on her rest skin at
    // each turn round her -- one edge antialiased by its own slope, with no floor; its seam as wide ALONG HER SKIN AS
    // SHE IS SHAPED as any band's (its half-width in heights, by how fast the height changes along her there)
    expect(s.fragmentShader).toContain('float fabricLowAmong = fabricLowTurnAt(fabricLowPlace);');
    for (const i of [0, 1, 2]) {
      expect(s.fragmentShader).toContain(`if (fabricLowBand${i}.x > 0.0 && fabricLowInnerOn${i} > 0.5) {`);
      // ITS BAND IS AS DEEP ALL ROUND HER (Joshua, 2026-11-15: "the edging still looks different sizes and not
      // consistent all around"): how far a pixel is from the cloth's edge along her skin as she is shaped (`fnd`: each
      // part of the edge's own distance over its own slope, `fabricLowNear`), his line's own band in front of her
      // (`ffd`) -- and only inside the table's region widened by the band's depth (`fgo`), which keeps it out of the
      // creases of her thighs, where a slope says nothing
      expect(s.fragmentShader).toContain(`float fgo = mix(mix(fabricLowPlace.y - fabricLowInnerAt(${i}, fabricLowAmong), vFabricLow.y - fabricLowMoonAt(${i}, 1, vFabricLow.x - fabricLowAxis.x, fabricLowMoonW${i}.w), fmw), fabricLowBand${i}.x - ffd, ffw) + fabricLowBand${i}.x, fao = max(fwidth(fgo) * 0.75, 1e-7);`);
      expect(s.fragmentShader).toContain(`float fg = fabricLowBand${i}.x - mix(fnd, fpd, fpw), fa = max(fwidth(fg) * 0.75, 1e-7), fi = smoothstep(-fa, fa, fg) * mix(smoothstep(-fao, fao, fgo), 1.0, fpw);`);
      // ONCE IT HAS SWUNG, ALL OF IT IS ONE PLANE ON HER AS SHE STANDS (\`planeAt\`): its edge and its band the one distance
      expect(s.fragmentShader).toContain(`float fpl = fabricLowPlane(vec4(fabricLowFront${i}.w, fabricLowWaist${i}.yzw), fabricLowSwing${i}, vFabricLow.xyz, fabricLegShare, fabricLowFront${i}.x);`);
      expect(s.fragmentShader).toContain(`fpw = fabricLowFront${i}.z;`);
    }
    expect(s.fragmentShader).toContain('float fs = fabricCutSeam.y * fabricLowSteep(fg);');
    expect(s.fragmentShader).toContain('fc *= 1.0 - fabricCutSeam.x * (1.0 - smoothstep(fs, fs + fa, abs(fg)));');
    // her leg's skin, the rest of her, and her arm's skin (which hangs beside her hips and is never a bottom's) -- by a
    // flag READ INSIDE THE TRIANGLE A PIXEL IS DRAWN FOR (`centroid`): at the pixel's middle, outside a triangle that
    // covers only part of the pixel, the flag runs on past its corners' -- from her leg's -1 past the rest of her's 0
    // to "her arm's", on the row that joins her leg's skin to her trunk's, and that part of the pixel was bare
    expect(s.fragmentShader).toContain('float fabricLegShare = smoothstep(0.4, 0.6, -vFabricLimb), fabricNotArm = 1.0 - smoothstep(0.4, 0.6, vFabricLimb);');
    expect(s.fragmentShader).toContain('centroid varying float vFabricLimb;');
    expect(s.vertexShader).toContain('centroid varying float vFabricLimb;');
    expect(s.vertexShader).toContain('vFabricLimb = fabricAux.z;');
    // (nothing of a bottom's cut reads the flag as it is told at the pixel's middle)
    for (const l of s.fragmentShader.split('\n').filter((x) => /fabricLow|fabricLegShare|fabricNotArm/.test(x))) expect(l, l).not.toContain('vFabricAux.z');
    // (each edge's distance held to its own range before its slope is taken: far inside a garment, and between her
    // legs where a place's stand round her swings from pixel to pixel, its slope is no pixel's width)
    for (const i of [0, 1, 2]) {
      expect(s.fragmentShader).toContain(`float fle = fabricLowLeg${i}.x - vFabricLow.w, fls = vFabricLow.w - fabricLowLeg${i}.y;`);
      expect(s.fragmentShader).toContain(`fe${i} = fcw * mix(fabricLowLeg${i}.z, fabricEdge(clamp(0.5 + fle / (2.0 * fabricLowAxis.w), 0.0, 1.0)) * fabricEdge(clamp(0.5 + fls / (2.0 * fabricLowAxis.w), 0.0, 1.0)), fabricLegShare) * fabricNotArm;`);
    }
    // the layer it was put on has its numbers; the others are off
    const u = s.uniforms, far = LOW_CUT.far;
    expect(u.fabricLowOn1.value).toBe(1);
    expect(u.fabricLowOn0.value).toBe(0);
    expect((u.fabricLowWaist1.value as THREE.Vector4).toArray()).toEqual(Array.from(Float32Array.from(spec.waist!), Number).map((x, k) => (u.fabricLowWaist1.value as THREE.Vector4).toArray()[k] === x ? x : spec.waist![k]));
    expect((u.fabricLowLeg1.value as THREE.Vector4).toArray()).toEqual([spec.end, -far, 1, 0]);
    expect((u.fabricLowBand1.value as THREE.Vector4).x).toBeCloseTo(spec.bands.waist, 9);
    expect((u.fabricLowBand1.value as THREE.Vector4).w).toBeCloseTo(0.1, 9);
    // (bike shorts are level at her waist: no hoop -- unswung, and no table)
    expect(spec.hinge).toBeNull();
    expect((u.fabricLowSwing1.value as THREE.Vector4).toArray()).toEqual([0, 1, 0, 0]);
    expect(u.fabricLowInnerOn1.value).toBe(0);
    // a stocking: no waistband, no end, a top
    const st = lowSpec(template('stockings').params, frame);
    setFabricLayer(s.mesh, s.material, 2, { texture: new THREE.Texture(), tile: 1, opacity: 0.5, low: { waist: null, end: null, start: st.start, band: [0, 0, st.bands.top], shade: 0.1 } }, { layers: 3, masked: true, rest: null });
    expect((u.fabricLowLeg2.value as THREE.Vector4).toArray()).toEqual([far, st.start, 0, 0]);
    // her measures, and her legs' cuts as her bones carry them
    const leg = (l: LowFrame['legs'][number]) => { const p = legPlanes(l); return [p.thigh, p.shin, legBlend(l, frame.unitsPerMetre)] as const; };
    const lowOf = () => ({ axis: [frame.mid, frame.facing, frame.seam, LOW_CUT.range * frame.unitsPerMetre] as [number, number, number, number], spineA: [frame.spine[0][0], frame.spine[0][1], frame.spine[1][0], frame.spine[1][1]] as [number, number, number, number], spineB: [frame.spine[2][0], frame.spine[2][1], frame.spine[3][0], frame.spine[3][1]] as [number, number, number, number], floor: frame.floor, stay: [frame.stay.wide, 0, 0, frame.stay.round] as [number, number, number, number], crease: frame.crease, legL: leg(frame.legs[0]), legR: leg(frame.legs[1]), seam: [0.2, 0.0005] as [number, number] });
    setFabricLow(s.material, lowOf());
    expect((u.fabricLowAxis.value as THREE.Vector4).x).toBeCloseTo(frame.mid, 6);
    expect(u.fabricLowFloor.value).toBe(frame.floor);
    expect((u.fabricLowLegL.value as THREE.Vector4[])[2].toArray().every((x) => Number.isFinite(x))).toBe(true);
    setFabricLowLegs(s.material, [[1, 2, 3, 4], [5, 6, 7, 8]], [[9, 10, 11, 12], [13, 14, 15, 16]]);
    expect((u.fabricLowLegL.value as THREE.Vector4[])[0].toArray()).toEqual([1, 2, 3, 4]);
    expect((u.fabricLowLegR.value as THREE.Vector4[])[1].toArray()).toEqual([13, 14, 15, 16]);
    // her crease's heights, and how wide it is told and how round a hoop's corners are
    expect(Array.from(u.fabricLowCrease.value as Float32Array)).toEqual(Array.from(frame.crease!));
    expect((u.fabricLowStay.value as THREE.Vector4).x).toBeCloseTo(frame.stay.wide, 6);
    expect((u.fabricLowStay.value as THREE.Vector4).w).toBeCloseTo(frame.stay.round, 6);
    // taken off: no layer is a bottom
    setFabricLow(s.material, null);
    expect(fabricLowWorn(s.material)).toBe(false);
  });

  it('a hoop\'s layer has its hinge; its swing, the cloth\'s front and its band\'s table are laid as she is shaped', () => {
    const spec = lowSpec(template('leggingsUnder').params, frame), s = compiled(spec), u = s.uniforms;
    expect(spec.hinge).not.toBeNull();
    const swung = u.fabricLowSwing1.value as THREE.Vector4;
    // its hinge, unswung: a cosine of one, a sine of nothing, no room
    expect(swung.x).toBeCloseTo(spec.hinge![0], 6);
    expect([swung.y, swung.z, swung.w]).toEqual([1, 0, 0]);
    setFabricLowSwing(s.material, 1, 0.4, 0.002);
    expect(swung.x).toBeCloseTo(spec.hinge![0], 6);
    expect(swung.y).toBeCloseTo(Math.cos(0.4), 6);
    expect(swung.z).toBeCloseTo(Math.sin(0.4), 6);
    expect(swung.w).toBeCloseTo(0.002, 9);
    setFabricLowSwing(s.material, 1, 0, 0.01);
    expect([swung.y, swung.z, swung.w]).toEqual([1, 0, 0]);
    // the cloth's front between her thighs rides in her measures' second number, and laying her measures again keeps it
    setFabricLowFold(s.material, 0.031);
    expect((u.fabricLowStay.value as THREE.Vector4).y).toBeCloseTo(0.031, 9);
    const leg = (l: LowFrame['legs'][number]) => { const p = legPlanes(l); return [p.thigh, p.shin, legBlend(l, frame.unitsPerMetre)] as const; };
    setFabricLow(s.material, { axis: [frame.mid, frame.facing, frame.seam, LOW_CUT.range * frame.unitsPerMetre], spineA: [frame.spine[0][0], frame.spine[0][1], frame.spine[1][0], frame.spine[1][1]], spineB: [frame.spine[2][0], frame.spine[2][1], frame.spine[3][0], frame.spine[3][1]], floor: frame.floor, stay: [frame.stay.wide, 0, 0, frame.stay.round], crease: frame.crease, legL: leg(frame.legs[0]), legR: leg(frame.legs[1]), seam: [0.2, 0.0005] });
    expect((u.fabricLowStay.value as THREE.Vector4).y).toBeCloseTo(0.031, 9);
    // HIS LINE'S BAND'S STRETCH (`foldStretch`): one at each of his line's knots, and none is one
    expect(Array.from(u.fabricLowFoldS.value as Float32Array)).toEqual(Array(16).fill(1));
    const stretch = Float32Array.from({ length: FOLD_LINE.length }, (_, k) => 1 + k / 8);
    setFabricLowFoldStretch(s.material, stretch);
    expect(Array.from(u.fabricLowFoldS.value as Float32Array)).toEqual(Array.from(stretch));
    setFabricLowFoldStretch(s.material, null);
    expect(Array.from(u.fabricLowFoldS.value as Float32Array)).toEqual(Array(16).fill(1));
    // ITS BAND'S TABLE: the line its stations turn about, and the layer's own heights -- four to a vector, after the
    // layers before it
    expect(u.fabricLowInnerOn1.value).toBe(0);
    const table = Float32Array.from({ length: BAND_STEPS }, (_, k) => 1 + k / 100), line = { count: BAND_STEPS, mid: frame.mid, facing: frame.facing, lean: [0.25, -0.5, 0.125] as const };
    setFabricLowInner(s.material, 1, { line, table });
    expect(u.fabricLowInnerOn1.value).toBe(1);
    expect((u.fabricLowTurn.value as THREE.Vector4).toArray()).toEqual([0.25, -0.5, 0.125, 0]);
    const all = u.fabricLowInner.value as Float32Array;
    expect(all.length).toBe(BAND_STEPS * 3);
    expect(Array.from(all.subarray(BAND_STEPS, 2 * BAND_STEPS))).toEqual(Array.from(table));
    expect(Array.from(all.subarray(0, BAND_STEPS)).every((x) => x === 0)).toBe(true);
    // a table of another length is not laid; none takes it off; and a layer that is no hoop's has none
    setFabricLowInner(s.material, 1, { line: { ...line, count: 8 }, table: table.subarray(0, 8) });
    expect(u.fabricLowInnerOn1.value).toBe(0);
    setFabricLowInner(s.material, 1, { line, table });
    setFabricLowInner(s.material, 1, null);
    expect(u.fabricLowInnerOn1.value).toBe(0);
    setFabricLowInner(s.material, 1, { line, table });
    const bike = lowSpec(template('shortsBike').params, frame);
    setFabricLayer(s.mesh, s.material, 1, { texture: new THREE.Texture(), tile: 1, opacity: 1, low: { waist: bike.waist, end: bike.end, start: bike.start, band: [bike.bands.waist, bike.bands.leg, bike.bands.top], shade: 0.1, hinge: null } }, { layers: 3, masked: true, rest: null });
    expect(u.fabricLowInnerOn1.value).toBe(0);
    expect((u.fabricLowSwing1.value as THREE.Vector4).toArray()).toEqual([0, 1, 0, 0]);
  });

  it('the shader\'s functions are the ones here, formula for formula', () => {
    const glsl = lowGlsl();
    // `spineDepth` and `roundAt`
    expect(glsl).toContain('float dz = (p.z - fabricLowSpine(p.y)) * fabricLowAxis.y - fabricLowAxis.z, dx = p.x - fabricLowAxis.x, r = length(vec2(dx, dz));');
    expect(glsl).toContain('return vec3(r > 1e-9 ? 0.5 + 0.5 * dz / r : 0.5, abs(dx), max(r, 1e-9));');
    // `waistLine`: the sweep through its three heights -- the two runs' climbs, their harmonic mean at her side, the
    // three-point rule at an end (held to no turn), and the cubic between
    expect(glsl).toContain('float d1 = 2.0 * (w.y - w.z), d2 = 2.0 * (w.x - w.y), mid = d1 * d2 > 0.0 ? 2.0 * d1 * d2 / (d1 + d2) : 0.0;');
    expect(glsl).toContain('float m = 0.5 * (3.0 * run - other);');
    expect(glsl).toContain('return m * run <= 0.0 ? 0.0 : (run * other < 0.0 && abs(m) > 3.0 * abs(run) ? 3.0 * run : m);');
    expect(glsl).toContain('float p0 = ahead ? w.y : w.z, p1 = ahead ? w.x : w.y, m0 = 0.5 * (ahead ? mid / (1.0 + bowl) : fabricLowEnd(d1, d2)), m1 = 0.5 * (ahead ? fabricLowEnd(d2, d1) : mid);');
    expect(glsl).toContain('return vec2((2.0 * t3 - 3.0 * t2 + 1.0) * p0 + (t3 - 2.0 * t2 + t) * m0 + (3.0 * t2 - 2.0 * t3) * p1 + (t3 - t2) * m1,');
    expect(glsl).toContain('2.0 * eased * ((6.0 * t2 - 6.0 * t) * (p0 - p1) + (3.0 * t2 - 4.0 * t + 1.0) * m0 + (3.0 * t2 - 2.0 * t) * m1));');
    // (its front's bowl: the run from her side to her front's middle read at 1 - (1 - s)^(1 + bowl))
    expect(glsl).toContain('float s = clamp(ahead ? (u - 0.5) * 2.0 : u * 2.0, 0.0, 1.0), bowl = ahead ? w.w : 0.0;');
    expect(glsl).toContain('float t = bowl > 0.0 ? 1.0 - pow(1.0 - s, 1.0 + bowl) : s, eased = bowl > 0.0 ? (1.0 + bowl) * pow(max(1.0 - s, 0.0), bowl) : 1.0, t2 = t * t, t3 = t2 * t;');
    // (`waistAt`)
    expect(glsl).toContain('float fabricLowInside(vec4 w, vec3 p, vec3 r, float across) {');
    expect(glsl).toContain('float climb = l.y * 0.5 * r.y / (r.z * r.z * max(0.25, 1.0 + across));');
    expect(glsl).toContain('float d = (l.x - p.y) / sqrt(1.0 + climb * climb);');
    // (...and never nearer the line than the place is under the lowest of it, or over the highest)
    expect(glsl).toContain('return min(max(d, min(w.x, min(w.y, w.z)) - p.y), max(w.x, max(w.y, w.z)) - p.y);');
    // `stayAt`: the place swung back up about the hinge (at the height of the waistband's back), and the line's own
    // arithmetic there, with the surface's room
    expect(glsl).toContain('float X = (q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z - g.x, Y = q.y - w.z;');
    expect(glsl).toContain('float a = g.x + X * g.y - Y * g.z, y = w.z + X * g.z + Y * g.y, o = abs(q.x - fabricLowAxis.x), r = max(length(vec2(o, a)), 1e-9);');
    expect(glsl).toContain('return fabricLowInside(w, vec3(0.0, y, 0.0), vec3(0.5 + 0.5 * a / r, o, r), 0.0) + g.w;');
    // `creaseAt`, `underAt`, `hoopAt`, `waistHeld`
    expect(glsl).toContain(`float t = min(abs(x - fabricLowAxis.x) / fabricLowStay.x, 1.0) * ${(CREASE_STEPS - 1).toFixed(1)}, k = min(floor(t), ${(CREASE_STEPS - 2).toFixed(1)});`);
    expect(glsl).toContain('return mix(fabricLowCrease[i], fabricLowCrease[i + 1], t - k);');
    expect(glsl).toContain('float behind = fabricLowStay.y - ((q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z);');
    expect(glsl).toContain('float a = fabricLowCreaseAt(p.x) - p.y, b = mix(behind, 10000.0, leg), k = fabricLowStay.w, h = max(k - abs(a - b), 0.0) / k;');
    expect(glsl).toContain('return max(stay, under) + h * h * k * 0.25;');
    expect(glsl).toContain('return min(inside, held) - h * h * k * 0.25;');
    // `bandTurn` and `innerAt`: where a place stands among the stations (a station's own number at its turn), a
    // layer's knots mirrored at her front's middle and at her back's, and Catmull and Rom's curve through four
    expect(glsl).toContain('float d = fabricLowTurn.x + fabricLowTurn.y * p.y;');
    expect(glsl).toContain('d = fabricLowAxis.y > 0.0 ? min(d, fabricLowTurn.z) : max(d, fabricLowTurn.z);');
    expect(glsl).toContain(`return atan(abs(p.x - fabricLowAxis.x), (p.z - d) * fabricLowAxis.y) * ${(BAND_STEPS / Math.PI).toFixed(6)} - 0.5;`);
    expect(glsl).toContain(`int i = k < 0 ? -k - 1 : (k >= ${BAND_STEPS} ? ${2 * BAND_STEPS - 1} - k : k);`);
    expect(glsl).toContain(`return fabricLowInner[layer * ${BAND_STEPS / 4} + i / 4][i - (i / 4) * 4];`);
    expect(glsl).toContain('return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));');
    // (how fast a number told on her rest skin changes along her skin as she is shaped: off the pixel's own slopes)
    expect(glsl).toContain('vec3 px = dFdx(vFabricLow.xyz), py = dFdy(vFabricLow.xyz);');
    expect(glsl).toContain('return sqrt(max(h * gx * gx - 2.0 * f * gx * gy + e * gy * gy, 0.0) / max(e * h - f * f, 1e-30));');
    // (a distance over its own slope, the slope held between a fifth and 1.8 -- in a crease of her skin it is anything --
    // and nothing of a number that is no distance: far, or changing faster than any skin does)
    expect(glsl).toContain(`return g > ${(LOW_CUT.far / 100).toFixed(1)} || st > ${LOW_CUT.nearMost.toFixed(1)} ? ${LOW_CUT.far.toFixed(1)} : g / clamp(st, ${LOW_CUT.nearLeast.toFixed(2)}, cap);`);
    expect(glsl).toContain(`float fabricLowNear(float g) { return fabricLowNearTo(g, ${LOW_CUT.nearCap.toFixed(2)}); }`);
    // `foldShares`, `foldAt` and `foldStretchAt`: his line's height at a centimetre's knots, its climb at each knot
    // between the two either side, eased from knot to knot, the distance square to it, and the guard
    expect(glsl).toContain(`int a = max(k - 1, 0), b = min(k + 1, ${FOLD_LINE.length - 1});`);
    expect(glsl).toContain(`return k > ${FOLD_HIP} ? mix(fabricLowFoldT[${FOLD_HIP}], fabricLowFoldT[k], ease) : fabricLowFoldT[k];`);
    expect(glsl).toContain('return (fabricLowFoldKnot(b, ease) - fabricLowFoldKnot(a, ease)) / (float(b - a) * fabricLowFoldK.x);');
    expect(glsl).toContain('float wo = 1.0 - smoothstep(fabricLowFrontK.x, fabricLowFrontK.y, o), wa = smoothstep(fabricLowFrontK.z, fabricLowFrontK.w, a);');
    expect(glsl).toContain('float rise = mix(fabricLowFoldRise(i, ease), fabricLowFoldRise(i + 1, ease), f - k);');
    expect(glsl).toContain('float line = (fabricLowFoldK.y + mix(fabricLowFoldKnot(i, ease), fabricLowFoldKnot(i + 1, ease), f - k) + lift - p.y) * inversesqrt(1.0 + rise * rise);');
    expect(glsl).toContain('float deep = fabricLowFoldK.z - fabricLowFoldK.w * o * o + lift - a;');
    expect(glsl).toContain(`return vec4(wo, wa, line, mix(deep, ${LOW_CUT.far.toFixed(1)}, max(leg, smoothstep(fabricLowFrontK.y * ${(LOW_CUT.foldDeepIn / LOW_CUT.foldOut).toFixed(6)}, fabricLowFrontK.y, o))));`);
    expect(glsl).toContain('return mix(fabricLowFoldS[i], fabricLowFoldS[i + 1], f - k);');
    // `planeAt`: the swung surface with the place taken no further forward than the fold (but round her hips), and her
    // trunk's skin no further forward than the fold
    expect(glsl).toContain('float stay = fabricLowStayAt(w, g, vec3(q.x, q.y, q.z - max(a - fold, 0.0) * (1.0 - round) * fabricLowAxis.y)) - g.w;');
    expect(glsl).toContain(`return min(stay + rise, mix(deep, ${LOW_CUT.far.toFixed(1)}, max(leg, round)));`);
    // (its front half's rise between her belly and her hips: a metre is a hundred of his line's centimetres)
    expect(glsl).toContain('float u = fabricLowFoldK.x * 100.0;');
    expect(glsl).toContain(`float rise = ${LOW_CUT.planeRise.toFixed(4)} * u * smoothstep(${LOW_CUT.planeRiseSwing[0].toFixed(3)}, ${LOW_CUT.planeRiseSwing[1].toFixed(3)}, asin(clamp(g.z, 0.0, 1.0)))`);
  });
});

describe('his line under her belly (an under-belly waistband\'s front, once its hoop has swung)', () => {
  const U = () => frame.unitsPerMetre;
  /** Her points with her body file's `belly200` morph laid on (her 200%), and the under-belly waistband swung as the room's is. */
  const at200 = () => {
    const P = her.rest, n = P.length / 3, m = her.mesh.geometry.morphAttributes.position![her.mesh.morphTargetDictionary!.belly200], shaped = Float32Array.from(P);
    for (let v = 0; v < n; v++) { shaped[v * 3] += m.getX(v); shaped[v * 3 + 1] += m.getY(v); shaped[v * 3 + 2] += m.getZ(v); }
    const spec = lowSpec(template('leggingsUnder').params, frame), pick = (vs: ArrayLike<number>) => { const o = new Float32Array(vs.length * 3); Array.from(vs).forEach((v, i) => { o[i * 3] = shaped[v * 3]; o[i * 3 + 1] = shaped[v * 3 + 1]; o[i * 3 + 2] = shaped[v * 3 + 2]; }); return o; };
    // (her file's own 200% swings the hoop 10 degrees, where his line is still lifted a little; the room's 200% swings
    // it 23.1 -- MEASURED -- and that is the swing these are told at)
    expect(swingOf(frame, spec, pick(frame.middle))).toBeGreaterThan(0.1);
    return { shaped, spec, swing: 0.403, fold: foldOf(frame, pick(frame.groin)) };
  };

  it('is his drawing: rising from her middle to her side\'s own height, and the distance under it is square to it with no step', () => {
    expect(FOLD_LINE.length).toBe(16);
    for (let k = 1; k < FOLD_LINE.length; k++) expect(FOLD_LINE[k]).toBeGreaterThanOrEqual(FOLD_LINE[k - 1]);
    // (its end, 15 cm out, is her under-belly waistband's own height at her side: within 3 mm)
    const spec = lowSpec(template('leggingsUnder').params, frame);
    expect(Math.abs(frame.hipY + FOLD_LINE[15] * U() - spec.waist![1])).toBeLessThan(3 * MM);
    // square to it where it runs level, and less than straight down where it climbs (to its climb's own share)
    const place = (out: number, under: number): V3 => [frame.mid + out * U(), frame.hipY + under * U(), 0];
    const deepAhead: V3 = [frame.mid, frame.hipY, -1e3];
    expect(foldAt(frame, place(0, FOLD_LINE[0] - 0.03), deepAhead, 0, 0).line / U()).toBeCloseTo(0.03, 4);
    const climbing = foldAt(frame, place(0.135, FOLD_LINE[13] + 0.5 * (FOLD_LINE[14] - FOLD_LINE[13]) - 0.03), deepAhead, 0, 0).line / U();
    expect(climbing).toBeLessThan(0.025);
    expect(climbing).toBeGreaterThan(0.015);
    // A BAND'S DEPTH UNDER IT HAS NO STEP FROM ONE KNOT TO THE NEXT: 3 cm under it, a tenth of a millimetre out at a
    // time across all of it, never more than a twentieth of a millimetre between two (its climb stepped knot to knot,
    // 0.6 mm at the knot 12 cm out -- the teeth a centimetre apart along the band's inner edge in the room)
    let worst = 0, last = NaN;
    for (let out = 0; out <= 0.15; out += 0.0001) {
      const f = Math.min(out / 0.01, 14.999), k = Math.floor(f), y = FOLD_LINE[k] + (FOLD_LINE[k + 1] - FOLD_LINE[k]) * (f - k) - 0.03;
      const d = foldAt(frame, place(out, y), deepAhead, 0, 0).line / U();
      if (Number.isFinite(last)) worst = Math.max(worst, Math.abs(d - last));
      last = d;
    }
    expect(worst).toBeLessThan(0.00005);
  });

  it('its front is a U: a bowl holds the under-belly line low out from her middle, and his line\'s climb up her hips is eased as the hoop swings', () => {
    const plain = lowSpec({ ...template('leggingsUnder').params, lowBowl: 0 }, frame).waist!, bowl = lowSpec(template('leggingsUnder').params, frame).waist!;
    expect(bowl[3]).toBeGreaterThan(0);
    expect(Array.from(bowl.slice(0, 3))).toEqual(Array.from(plain.slice(0, 3)));
    // her back's run, her side and her front's middle are as they were; between her side and her front it is lower, and
    // level where it crosses her front's middle
    for (const a of [0, 0.2, 0.5, 1]) expect(waistLine(bowl, a).height).toBeCloseTo(waistLine(plain, a).height, 9);
    for (const a of [0.6, 0.75, 0.9]) expect(waistLine(bowl, a).height).toBeLessThan(waistLine(plain, a).height - 5 * MM);
    expect(waistLine(bowl, 1).slope).toBeCloseTo(0, 9);
    // (its slope is its height's: a small step of `around`)
    for (const a of [0.55, 0.7, 0.93]) expect(waistLine(bowl, a).slope).toBeCloseTo((waistLine(bowl, a + 1e-6).height - waistLine(bowl, a - 1e-6).height) / 2e-6, 3);
    // her paint per vertex has the same line
    expect(waistline(template('leggingsUnder').params, 0.75) * frame.trunk + frame.hipY).toBeCloseTo(waistLine(bowl, 0.75).height, 6);
    // HIS LINE'S CLIMB PAST 8 CM OUT is all of it unswung and less as the hoop swings: 0.86, 0.64 and 0.37 at the
    // room's 120, 150 and 200% (the hoop's own edge 16 cm out: 0.90, 0.68, 0.37 -- MEASURED)
    expect(foldEase(0)).toBe(1);
    expect(foldEase((10.8 * Math.PI) / 180)).toBeCloseTo(0.86, 2);
    expect(foldEase((17.4 * Math.PI) / 180)).toBeCloseTo(0.64, 2);
    expect(foldEase((23.1 * Math.PI) / 180)).toBeCloseTo(0.37, 2);
    expect(foldEase(2)).toBe(LOW_CUT.foldEaseLeast);
    const U = frame.unitsPerMetre, away: V3 = [frame.mid, frame.hipY, -1e3], on = (out: number, h: number): V3 => [frame.mid + out * U, frame.hipY + h * U, 0];
    expect(foldAt(frame, on(0.05, FOLD_LINE[5]), away, 0, 0, 0.4).line).toBeCloseTo(0, 6);
    expect(foldAt(frame, on(0.15, FOLD_LINE[FOLD_HIP] + (FOLD_LINE[15] - FOLD_LINE[FOLD_HIP]) * 0.4), away, 0, 0, 0.4).line).toBeCloseTo(0, 6);
  });

  it('once it has swung it is one plane on her as she stands: a line from her side, level in front of the fold, and its band the same distance', () => {
    const spec = lowSpec(template('leggingsUnder').params, frame), swing = 0.403, U = frame.unitsPerMetre;
    // ITS FRONT COMES DOWN WITH HER BELLY: with none (the middle of her front 8.5 cm ahead of her axis and less) it is a
    // centimetre and a half under her side's height; as she is on her body file, the waistband's own front; between, between
    const mid = (ahead: number) => { const y = frame.hipY + 0.2 * U; return [frame.mid, y, spineDepth(frame, y) + frame.facing * (frame.seam + ahead)]; };
    let full = -Infinity; for (let i = 1; i < frame.fore.length; i += 2) full = Math.max(full, frame.fore[i]);
    expect(planeFront(frame, spec, mid(0.05 * U))).toBeCloseTo(spec.waist![1] - LOW_CUT.planeDip * U, 9);
    expect(planeFront(frame, spec, mid(LOW_CUT.planeFlat * U))).toBeCloseTo(spec.waist![1] - LOW_CUT.planeDip * U, 9);
    expect(planeFront(frame, spec, mid(full))).toBeCloseTo(spec.waist![0], 9);
    expect(planeFront(frame, spec, mid(full + 0.1 * U))).toBeCloseTo(spec.waist![0], 9);
    const half = planeFront(frame, spec, mid((LOW_CUT.planeFlat * U + full) / 2));
    expect(half).toBeCloseTo((spec.waist![1] - LOW_CUT.planeDip * U + spec.waist![0]) / 2, 6);
    // (a hoop is its plane at every size; a waistband with no hoop never)
    expect(planeShare(spec.hinge)).toBe(1);
    expect(planeShare(null)).toBe(0);
    const at = (out: number, ahead: number, y: number): V3 => [frame.mid + out * U, y, spineDepth(frame, y) + frame.facing * (frame.seam + ahead * U)];
    // ITS FRONT RISES TO THE CREASE UNDER HER BELLY once it has swung: `planeRise` across her middle and out to 8 cm, eased
    // to `planeRiseSide` of it by 14 cm and held round her hip (a curve from her side, not a corner), none 17 cm behind
    // her side's seam, and none unswung
    const leg1 = (out: number, ahead: number, sw: number) => planeAt(frame, spec.waist!, spec.hinge!, sw, at(out, ahead, frame.hipY), 1) - (stayAt(frame, spec.waist!, spec.hinge!, sw, at(out, ahead, frame.hipY)) - roomAt(frame, sw));
    expect(leg1(0.0, 0.0, swing) / U).toBeCloseTo(LOW_CUT.planeRise, 6);
    expect(leg1(LOW_CUT.planeRiseOut[2], 0.0, swing) / U).toBeCloseTo(LOW_CUT.planeRise, 6);
    const ss = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
    const sideAt0 = ss(LOW_CUT.planeRiseAheadSide[0], LOW_CUT.planeRiseAheadSide[1], 0);
    expect(leg1((LOW_CUT.planeRiseOut[2] + LOW_CUT.planeRiseOut[3]) / 2, 0.0, swing) / U).toBeCloseTo(LOW_CUT.planeRise * ((1 + LOW_CUT.planeRiseSide) / 2) * ((1 + sideAt0) / 2), 6);
    expect(leg1(LOW_CUT.planeRiseOut[3], 0.0, swing) / U).toBeCloseTo(LOW_CUT.planeRise * LOW_CUT.planeRiseSide * sideAt0, 6);
    expect(leg1(0.2, 0.0, swing) / U).toBeCloseTo(LOW_CUT.planeRise * LOW_CUT.planeRiseSide * sideAt0, 6);
    expect(leg1(0.0, -0.11, swing)).toBeCloseTo(0, 9);
    // (round her hip it runs out further back, and more gently: from 6 cm ahead of her side's seam to 20 behind)
    expect(leg1(0.2, -0.07, swing) / U).toBeCloseTo(LOW_CUT.planeRise * LOW_CUT.planeRiseSide / 2, 6);
    expect(leg1(0.2, -0.2, swing)).toBeCloseTo(0, 9);
    expect(leg1(0.05, 0.0, 0.05)).toBeCloseTo(0, 9);
    // BEHIND THE FOLD it is the swung surface itself, whatever skin: a place on it is on the edge, and places along it
    // from her back to the fold lie on one straight line seen from her side (their heights fall by the same for each
    // step forward)
    const onIt = (out: number, ahead: number) => { let lo = frame.hipY - 0.4 * U, hi = frame.hipY + 0.4 * U; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (stayAt(frame, spec.waist!, spec.hinge!, swing, at(out, ahead, m)) > 0) lo = m; else hi = m; } return (lo + hi) / 2; };
    const ys = [-0.3, -0.26, -0.22, -0.18].map((a) => onIt(0.0, a));
    for (const [i, a] of [-0.3, -0.26, -0.22, -0.18].entries()) expect(Math.abs(planeAt(frame, spec.waist!, spec.hinge!, swing, at(0, a, ys[i]), 1))).toBeLessThan(0.05 * MM);
    // IN FRONT OF THE FOLD IT RUNS LEVEL, at the fold's own height: her leg's skin 3 and 8 cm in front of the fold is
    // as far inside it as her skin at the fold, at the same height
    const fold = LOW_CUT.foldDepth, yF = onIt(0, fold);
    for (const more of [0.03, 0.08]) expect(planeAt(frame, spec.waist!, spec.hinge!, swing, at(0, fold + more, yF - 0.02 * U), 1)).toBeCloseTo(planeAt(frame, spec.waist!, spec.hinge!, swing, at(0, fold, yF - 0.02 * U), 1), 6);
    // her trunk's skin in front of the fold is bare, by how far in front of it
    expect(planeAt(frame, spec.waist!, spec.hinge!, swing, at(0, fold + 0.03, yF - 0.02 * U), 0) / U).toBeCloseTo(-0.03, 6);
    // and \`lowAt\` hands it on, the edge and the band alike
    const place: V3 = [frame.mid, frame.hipY, 0], sh = at(0.05, -0.2, onIt(0.05, -0.2) - 0.01 * U), e = lowAt(spec, frame, place, 0.3, -1, 0, sh, swing, LOW_CUT.far);
    expect(e.waist).toBeCloseTo(planeAt(frame, spec.waist!, spec.hinge!, swing, sh, 1), 9);
    expect(e.banded).toBeCloseTo(e.waist, 12);
    expect(e.waist).toBeGreaterThan(0);
    expect(e.waist).toBeLessThan(spec.bands.waist);
  });

  it('bares her trunk\'s skin in front of the fold, never her leg\'s, and none of it round her hips', () => {
    const behind = (ahead: number, out: number): V3 => { const y = frame.hipY - 0.05 * U(); return [frame.mid + out * U(), y, spineDepth(frame, y) + frame.facing * (frame.seam + ahead * U())]; };
    const place: V3 = [frame.mid, frame.hipY - 0.2 * U(), 0];
    // at her middle the guard is the fold itself: `foldDepth` in front of her axis
    expect(aheadOf(frame, behind(0.01, 0)[1], behind(0.01, 0)[2]) / U()).toBeCloseTo(0.01, 6);
    expect(foldAt(frame, place, behind(LOW_CUT.foldDepth - 0.002, 0), 0, 0).deep).toBeGreaterThan(0);
    expect(foldAt(frame, place, behind(LOW_CUT.foldDepth + 0.002, 0), 0, 0).deep).toBeLessThan(0);
    // her leg's skin, and her trunk's past `foldOut`, never
    expect(foldAt(frame, place, behind(0.1, 0), 1, 0).deep).toBe(LOW_CUT.far);
    expect(foldAt(frame, place, behind(0.1, LOW_CUT.foldOut + 0.01), 0, 0).deep).toBe(LOW_CUT.far);
    // laid in front of her from `foldTo`, and none of it from `foldFrom` back; all of his line within `foldIn` of her
    // middle, eased into the hoop's by `foldOut`
    expect(foldShares(frame, behind(LOW_CUT.foldTo, 0))).toEqual([1, 1]);
    expect(foldShares(frame, behind(LOW_CUT.foldFrom - 0.001, 0))[1]).toBe(0);
    expect(foldShares(frame, behind(0, LOW_CUT.foldIn - 0.001))[0]).toBe(1);
    expect(foldShares(frame, behind(0, LOW_CUT.foldOut + 0.001))[0]).toBe(0);
    // (and while the hoop has hardly swung it is lifted out of the way)
    expect(foldLift(frame, 0) / U()).toBeCloseTo(LOW_CUT.foldReach, 9);
    expect(foldLift(frame, LOW_CUT.foldSwing)).toBe(0);
  });

  it('at her 200% belly: none of her trunk\'s skin in front of the fold is covered, and her skin well under his line is', () => {
    const { shaped, spec, swing, fold } = at200(), P = her.rest, n = P.length / 3;
    expect(swing).toBeGreaterThan(LOW_CUT.foldSwing);
    let bared = 0, kept = 0, wrong = 0;
    for (let v = 0; v < n; v++) {
      if (limb[v] > 0.5) continue;
      const sh: V3 = [shaped[v * 3], shaped[v * 3 + 1], shaped[v * 3 + 2]], out = Math.abs(sh[0] - frame.mid) / U(), ahead = aheadOf(frame, sh[1], sh[2]) / U();
      if (out > LOW_CUT.foldIn || ahead < LOW_CUT.foldTo || Math.abs(sh[1] - frame.hipY) > 0.2 * U()) continue;
      const place: V3 = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], e = lowAt(spec, frame, place, along[v], limb[v], 0, sh, swing, fold);
      // her trunk's skin in front of the fold
      if (limb[v] > -0.5 && ahead > LOW_CUT.foldDepth - LOW_CUT.foldCurve * out * out + 0.001) { bared++; if (e.waist > 0) wrong++; }
      // her skin a centimetre and more inside the swung plane
      else if (planeAt(frame, spec.waist!, spec.hinge!, swing, sh, legShareOf(limb[v])) > 0.01 * U()) { kept++; if (!(e.waist > 0)) wrong++; }
    }
    expect(bared).toBeGreaterThan(500);
    expect(kept).toBeGreaterThan(100);
    expect(wrong).toBe(0);
  });

  it('its band is as deep on her as any band: her skin under his line as she is drawn out, centimetre by centimetre out', () => {
    const { shaped, spec, swing } = at200(), P = her.rest, near = foldNear(frame, P);
    expect(near.length).toBeGreaterThan(1000);
    const point: BandPoint = (v, out) => { out[0] = shaped[v * 3]; out[1] = shaped[v * 3 + 1]; out[2] = shaped[v * 3 + 2]; out[3] = P[v * 3]; out[4] = P[v * 3 + 1]; out[5] = P[v * 3 + 2]; out[6] = limb[v]; out[7] = 0; };
    const k = foldStretch(frame, near, point, swing, spec.bands.waist)!;
    expect(k.length).toBe(FOLD_LINE.length);
    for (const x of k) { expect(x).toBeGreaterThanOrEqual(LOW_CUT.foldStretchMin); expect(x).toBeLessThanOrEqual(LOW_CUT.foldStretchMax); }
    // at her middle her skin under his line is drawn out (MEASURED on the room's points at 200%: 2.4 to 2.6 within 4 cm of her middle)
    expect(k[0]).toBeGreaterThan(1.3);
    // read at a place's own distance out, eased between the knots; with no table, one
    const at = (out: number) => foldStretchAt(frame, k, [frame.mid + out * U(), 0, 0]);
    expect(at(0.025)).toBeCloseTo((k[2] + k[3]) / 2, 6);
    expect(at(0.3)).toBe(k[15]);
    expect(foldStretchAt(frame, null, [frame.mid, 0, 0])).toBe(1);
    // (a hoop's band is its plane's own distance at every size, and this table is read
    // only by the cut it replaces)
  });
});
