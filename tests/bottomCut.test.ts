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
  LOW_BANDS, LOW_CUT, isDrawnBottom, legAlong, legBlend, legMeasure, legOf, legPlanes, legShareOf, limbSkin, lowAt, lowFrame, lowGlsl, lowSpec, roundAt, spineDepth, waistAt, waistBanded, waistLine,
  type LowFrame, type LowSpec, type V3,
} from '../src/sarahlab/bottomCut';
import { LOW_SLIP_ATTRIBUTE, fabricLowWorn, setFabricLayer, setFabricLow, setFabricLowLegs } from '../src/sarahlab/fabricMaterial';
import { makePulledSlip } from '../src/sarahlab/pulledSlip';
import { COVERAGE_TEMPLATES, RISES, coverage, pieceKind, waistline, withDial, wornParams } from '../src/sarahlab/paintTemplates';
import { loadHerBody, type HerBody } from './herBodyMap';

let her: HerBody, frame: LowFrame, limb: Float32Array, along: Float32Array, MM: number;
const template = (id: string) => COVERAGE_TEMPLATES.find((t) => t.id === id)!;
const DRAWN = ['leggingsHigh', 'leggingsLow', 'leggingsFull', 'leggingsUnder', 'leggingsCapri', 'leggingsKnee', 'shortsAthletic', 'shortsMid', 'shortsBike', 'shortsKnee', 'stockings', 'socksKnee', 'socks'];

beforeAll(async () => {
  her = await loadHerBody();
  const J = her.map.joints!;
  frame = lowFrame({ unitsPerMetre: her.unitsPerMetre, facing: her.map.facing, joints: J });
  limb = limbSkin(her.map);
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
    // 03 and 04 are the two there were, as they were
    expect([P('leggingsFull').riseFront, P('leggingsFull').riseSide, P('leggingsFull').riseBack, P('leggingsFull').legEnd]).toEqual([0.48, 0.4, 0.4, 1]);
    expect([P('leggingsUnder').riseFront, P('leggingsUnder').riseSide, P('leggingsUnder').riseBack, P('leggingsUnder').riseFrontWidth]).toEqual([-0.02, 0.26, 0.33, 0.8]);
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
    const spec = lowSpec(template('leggingsUnder').params, frame), w = spec.waist!;
    // two places 2 cm under the line by height: one at her front's middle, where the line runs level, and one at
    // her front's quarter, where it climbs to her side
    const z = frame.spine[0][1] * frame.facing + frame.seam, at = (x: number, dz: number): V3 => { const r = roundAt(frame, x, 0, (z + dz) * frame.facing); return [x, waistLine(w, r.around).height - 20 * MM, (z + dz) * frame.facing]; };
    const level = at(frame.mid, 0.2), climb = at(frame.mid + 0.1, 0.05), lowest = Math.min(w[0], w[1], w[2]);
    expect(Math.abs(waistLine(w, roundAt(frame, ...level).around).slope)).toBe(0);
    expect(Math.abs(waistLine(w, roundAt(frame, ...climb).around).slope)).toBeGreaterThan(0.1);
    expect(waistAt(w, frame, ...level) / MM).toBeCloseTo(20, 6);
    // (20 mm under the line by height is nearer the line than that across its climb; the place is over the lowest of
    // the line, where the straight line's distance is all there is to go by)
    expect(climb[1]).toBeGreaterThan(lowest);
    expect(waistAt(w, frame, ...climb) / MM).toBeLessThan(19.5);
    expect(waistAt(w, frame, ...climb) / MM).toBeGreaterThan(5);
    // AT THE FOOT OF THE CLIMB, 20 mm under a line that has climbed 8 mm, a place is 12 mm under the LOWEST of the
    // line: no point of the line is nearer than that, though a straight line through the point over it would be (11.3
    // mm; 6.5 where her skin is half as long across her) -- it is inside by those 12 mm, whatever her skin's length
    const foot = at(frame.mid + 0.1, 0.06);
    expect((lowest - foot[1]) / MM).toBeGreaterThan(11);
    expect((lowest - foot[1]) / MM).toBeLessThan(13);
    expect(waistAt(w, frame, ...foot)).toBe(lowest - foot[1]);
    expect(waistAt(w, frame, ...foot, -0.5)).toBe(lowest - foot[1]);
    expect(waistAt(w, frame, ...foot, 1)).toBeGreaterThan(lowest - foot[1]);
    // WHERE HER SKIN IS SHORTER ACROSS HER THAN AT REST (her belly's at 0%: half as long) the line climbs as much over
    // half the way round: it is steeper on her, and the same height under it is nearer to it. Where the line runs
    // level, her skin's length across her changes nothing
    const rest = waistAt(w, frame, ...climb), half = waistAt(w, frame, ...climb, -0.5), twice = waistAt(w, frame, ...climb, 1);
    expect(half).toBeLessThan(rest * 0.8);
    expect(twice).toBeGreaterThan(rest * 1.15);
    expect(waistAt(w, frame, ...level, -0.5)).toBe(waistAt(w, frame, ...level));
    // by its slope on her: (the height under the line) over the root of (1 + (its rest slope over her skin's length)^2)
    const r = roundAt(frame, ...climb), line = waistLine(w, r.around), slope = (line.slope * 0.5 * r.out) / (r.radius * r.radius);
    expect(half).toBeCloseTo((line.height - climb[1]) / Math.sqrt(1 + (slope / 0.5) ** 2), 9);
    // never taken as shorter than a quarter of its rest length
    expect(waistAt(w, frame, ...climb, -0.99)).toBe(waistAt(w, frame, ...climb, LOW_CUT.acrossLeast - 1));
    // and `lowAt` hands it on
    const spec2 = lowSpec(template('leggingsUnder').params, frame);
    expect(lowAt(spec2, frame, climb, 0, 0, -0.5).waist).toBe(half);
    expect(lowAt(spec2, frame, climb, 0, 0).waist).toBe(rest);
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
  });

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
    expect(depth / MM).toBeCloseTo(30, 6);
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
    const U = frame.unitsPerMetre, under = lowSpec(template('leggingsUnder').params, frame).waist!, lo = Math.min(under[0], under[1], under[2]), hi = Math.max(under[0], under[1], under[2]);
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
      const slope = waistLine(under, roundAt(frame, ...at(y0)).around).slope;
      if (Math.abs(slope) > 0.05 * U) { seen++; expect(Math.abs(straight(...at(y0))) / MM, String(k)).toBeLessThan(0.1); expect(Math.abs(straight(...at(y1))) / MM, String(k)).toBeLessThan(0.1); }
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
  setFabricLayer(mesh, m, 1, low ? { ...layer, low: { waist: low.waist, end: low.end, start: low.start, band: [low.bands.waist, low.bands.leg, low.bands.top], shade: 0.1, edging: null } } : layer, { layers: 3, masked: true, rest: null });
  const s = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>', fragmentShader: '#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>\n#include <map_fragment>' };
  m.onBeforeCompile(s as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return { ...s, material: m, mesh, key: m.customProgramCacheKey(), hash: createHash('sha256').update(`${s.vertexShader}\n---\n${s.fragmentShader}`).digest('hex') };
}

describe('a bottom\'s cut in the shader', () => {
  it('her skin\'s program is exactly as it was until a layer is a drawn bottom', () => {
    const plain = compiled(null);
    // (the hash `tests/topDetails.test.ts` holds her skin's program to)
    expect(plain.hash).toBe('e5eb05f2d3311a1f9eee17b7552652aaf011ce6d556dc1746c3b11e275c311a1');
    expect(plain.key).not.toContain('-low');
    expect(plain.fragmentShader).not.toContain('fabricLow');
    expect(plain.vertexShader).not.toContain('vFabricLeg');
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
    for (const i of [0, 1, 2]) for (const u of [`uniform float fabricLowOn${i};`, `uniform vec4 fabricLowWaist${i};`, `uniform vec4 fabricLowLeg${i};`, `uniform vec4 fabricLowBand${i};`]) expect(s.fragmentShader).toContain(u);
    // her leg's measure: by her thigh's bone and her shin's where they are now, blended by where the point lies at rest
    expect(s.vertexShader).toContain('float fabricByThigh = dot(fabricLegLeft ? fabricLowLegL[0] : fabricLowLegR[0], fabricPosed), fabricByShin = dot(fabricLegLeft ? fabricLowLegL[1] : fabricLowLegR[1], fabricPosed);');
    expect(s.vertexShader).toContain('vFabricLeg = mix(fabricByThigh, fabricByShin, smoothstep(-1.0, 1.0, dot(fabricLegLeft ? fabricLowLegL[2] : fabricLowLegR[2], vec4(fabricRest, 1.0))));');
    // the waistband is looked up at the pixel's rest place and her skin's slip -- which rides in the SHOW REGIONS
    // overlay's attribute, and is left out while the overlay is on
    expect(LOW_SLIP_ATTRIBUTE).toBe('fabricRegionTint');
    expect(s.fragmentShader).toContain('vec3 fabricLowPlace = vFabricPos + vFabricTint.xyz * (1.0 - fabricShowRegions);');
    // (its fourth number: how much longer her skin is across her there than at rest)
    expect(s.fragmentShader).toContain('float fabricLowAcross = vFabricTint.w * (1.0 - fabricShowRegions);');
    for (const i of [0, 1, 2]) expect(s.fragmentShader).toContain(`fwd = fabricLowInside(fabricLowWaist${i}, fabricLowPlace, fabricLowR, fabricLowAcross); fcw = fabricEdge(clamp(0.5 + fwd / (2.0 * fabricLowAxis.w), 0.0, 1.0));`);
    // A WAISTBAND'S BAND: inside its line by less than its depth AND over the floor, a level line above her cleft --
    // two edges, each antialiased by its own slope; under the floor nothing of it is drawn, whatever the distance
    // inside its line says there (`waistBanded`: the same places)
    expect(s.fragmentShader).toContain('uniform float fabricLowFloor;');
    for (const i of [0, 1, 2]) {
      expect(s.fragmentShader).toContain(`float fa = max(fwidth(fwd) * 0.75, 1e-7), fh = fabricLowPlace.y - fabricLowFloor, fg = max(fwidth(fh) * 0.75, 1e-7);`);
      expect(s.fragmentShader).toContain(`float fin = 1.0 - smoothstep(fabricLowBand${i}.x - fa, fabricLowBand${i}.x + fa, fwd), fup = smoothstep(-fg, fg, fh), fi = fin * fup;`);
      // its seam: along its inner edge over the floor, and along the floor where that cuts it
      expect(s.fragmentShader).toContain(`fc *= 1.0 - fabricCutSeam.x * max(fup * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fa, abs(fwd - fabricLowBand${i}.x))), fin * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fg, abs(fh))));`);
    }
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
    for (const i of [0, 1, 2]) expect(s.fragmentShader).toContain(`fe${i} = fcw * mix(fabricLowLeg${i}.z, fabricEdge(clamp(0.5 + fle / (2.0 * fabricLowAxis.w), 0.0, 1.0)) * fabricEdge(clamp(0.5 + fls / (2.0 * fabricLowAxis.w), 0.0, 1.0)), fabricLegShare) * fabricNotArm;`);
    // the layer it was put on has its numbers; the others are off
    const u = s.uniforms, far = LOW_CUT.far;
    expect(u.fabricLowOn1.value).toBe(1);
    expect(u.fabricLowOn0.value).toBe(0);
    expect((u.fabricLowWaist1.value as THREE.Vector4).toArray()).toEqual(Array.from(Float32Array.from(spec.waist!), Number).map((x, k) => (u.fabricLowWaist1.value as THREE.Vector4).toArray()[k] === x ? x : spec.waist![k]));
    expect((u.fabricLowLeg1.value as THREE.Vector4).toArray()).toEqual([spec.end, -far, 1, 0]);
    expect((u.fabricLowBand1.value as THREE.Vector4).x).toBeCloseTo(spec.bands.waist, 9);
    expect((u.fabricLowBand1.value as THREE.Vector4).w).toBeCloseTo(0.1, 9);
    // a stocking: no waistband, no end, a top
    const st = lowSpec(template('stockings').params, frame);
    setFabricLayer(s.mesh, s.material, 2, { texture: new THREE.Texture(), tile: 1, opacity: 0.5, low: { waist: null, end: null, start: st.start, band: [0, 0, st.bands.top], shade: 0.1 } }, { layers: 3, masked: true, rest: null });
    expect((u.fabricLowLeg2.value as THREE.Vector4).toArray()).toEqual([far, st.start, 0, 0]);
    // her measures, and her legs' cuts as her bones carry them
    const leg = (l: LowFrame['legs'][number]) => { const p = legPlanes(l); return [p.thigh, p.shin, legBlend(l, frame.unitsPerMetre)] as const; };
    setFabricLow(s.material, { axis: [frame.mid, frame.facing, frame.seam, LOW_CUT.range * frame.unitsPerMetre], spineA: [frame.spine[0][0], frame.spine[0][1], frame.spine[1][0], frame.spine[1][1]], spineB: [frame.spine[2][0], frame.spine[2][1], frame.spine[3][0], frame.spine[3][1]], floor: frame.floor, legL: leg(frame.legs[0]), legR: leg(frame.legs[1]), seam: [0.2, 0.0005] });
    expect((u.fabricLowAxis.value as THREE.Vector4).x).toBeCloseTo(frame.mid, 6);
    expect(u.fabricLowFloor.value).toBe(frame.floor);
    expect((u.fabricLowLegL.value as THREE.Vector4[])[2].toArray().every((x) => Number.isFinite(x))).toBe(true);
    setFabricLowLegs(s.material, [[1, 2, 3, 4], [5, 6, 7, 8]], [[9, 10, 11, 12], [13, 14, 15, 16]]);
    expect((u.fabricLowLegL.value as THREE.Vector4[])[0].toArray()).toEqual([1, 2, 3, 4]);
    expect((u.fabricLowLegR.value as THREE.Vector4[])[1].toArray()).toEqual([13, 14, 15, 16]);
    // taken off: no layer is a bottom
    setFabricLow(s.material, null);
    expect(fabricLowWorn(s.material)).toBe(false);
  });

  it('the shader\'s functions are the ones here, formula for formula', () => {
    const glsl = lowGlsl();
    // `spineDepth`, `roundAt`, `waistLine` and `waistAt`
    expect(glsl).toContain('float dz = (p.z - fabricLowSpine(p.y)) * fabricLowAxis.y - fabricLowAxis.z, dx = p.x - fabricLowAxis.x, r = length(vec2(dx, dz));');
    expect(glsl).toContain('return vec3(r > 1e-9 ? 0.5 + 0.5 * dz / r : 0.5, abs(dx), max(r, 1e-9));');
    expect(glsl).toContain('float fr = clamp(w.w, 0.55, 1.0);');
    expect(glsl).toContain('return vec2(w.y + (w.x - w.y) * t * t * (3.0 - 2.0 * t), (w.x - w.y) * 6.0 * t * (1.0 - t) / (fr - 0.5));');
    expect(glsl).toContain('return vec2(w.z + (w.y - w.z) * t * t * (3.0 - 2.0 * t), (w.y - w.z) * 6.0 * t * (1.0 - t) / 0.5);');
    // (`waistAt`)
    expect(glsl).toContain('float fabricLowInside(vec4 w, vec3 p, vec3 r, float across) {');
    expect(glsl).toContain('float climb = l.y * 0.5 * r.y / (r.z * r.z * max(0.25, 1.0 + across));');
    expect(glsl).toContain('float d = (l.x - p.y) / sqrt(1.0 + climb * climb);');
    // (...and never nearer the line than the place is under the lowest of it, or over the highest)
    expect(glsl).toContain('return min(max(d, min(w.x, min(w.y, w.z)) - p.y), max(w.x, max(w.y, w.z)) - p.y);');
  });
});
