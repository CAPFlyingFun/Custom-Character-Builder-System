/**
 * A PAINTED TOP'S CUT, DRAWN SMOOTH (`src/sarahlab/topCut.ts`; Joshua, 2026-11-14: "fix the painted clothes and add
 * smooth edges, shirt collars/sleeves like how you did the bikini bottom", and his sheet of sixteen tops).
 *
 * - The arithmetic on a PAPER DOLL small enough to check by hand: two flat sheets, her front and her back, whose top
 *   edge is her shoulders' ridge. Her measures, each style's rim, the drawings' distances and their sign, her sleeves'
 *   ends and her hem, the picture the shader reads, and that none of it depends on her mesh's units or
 *   on which way she faces.
 * - ON HER OWN REST SKIN (the room's body file): the numbers the module's comments call MEASURED, each style's rim
 *   where his sheet has it, nothing of a top on her head, her legs or past its sleeves, and how nearly the two
 *   drawings agree on top of her shoulders, where they are blended.
 * - What a template makes of it (`paintTemplates.ts`): which templates are drawn, a ringer's two layers, the paint per
 *   vertex laid about the line.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  CUT_VERTEX_RAMP_M, NECK_STYLES, TEE_BANDS, TOP_CUT, alongArm, armSide, cutAt, cutCoverage, cutEdgeAt, cutPicture, drawCut, isCutTop, midDepthAt, neckDefault,
  ridgeAt, rimPath, sleevePlane, topCut, topCutSpec, topFrame, type NeckStyle, type TopCut, type TopFrame,
} from '../src/sarahlab/topCut';
import { BAND_SHADE, COVERAGE_TEMPLATES, DRAWN_NECK, coverage, cutLayer, templateCut, wornParams, type CoverageParams } from '../src/sarahlab/paintTemplates';
import { readBody } from '../scripts/sarahV2SideLock.mjs';
import type { BodyMap } from '../src/sarahlab/bodyRegions';

const STYLES = Object.keys(NECK_STYLES) as NeckStyle[];
const MM = 0.001;

// ------------------------------------------------------------------------------------------------ the paper doll
/** Her neck joint's height, and her shoulders' ridge at `x` out from her middle: 5 cm over it at her middle, falling 2 cm in 10. */
const N = 1.4, ridgeOf = (x: number) => N + 0.05 - 0.2 * Math.abs(x);
/**
 * Two flat sheets from y = 0.7 up to her ridge, in strips 1 cm wide out to 25 cm: her front at z = +0.1 * facing and
 * her back at -0.1 * facing, all scaled by `u` (her mesh's units a metre). Her joints: neck (0, N, 0), hips at 0.9,
 * shoulders at (+-0.15, 1.36), elbows 0.26 from them down and out along (0.6, -0.8, 0), and wrists 0.24 on -- along the
 * same line, or, `bent`, straight down from her elbows.
 */
function doll(u = 1, facing = 1, bent = false) {
  const rest: number[] = [], index: number[] = [];
  for (const z of [0.1, -0.1]) {
    const base = rest.length / 3;
    for (let i = 0; i <= 50; i++) { const x = -0.25 + i * 0.01; rest.push(x * u, 0.7 * u, z * facing * u, x * u, ridgeOf(x) * u, z * facing * u); }
    for (let i = 0; i < 50; i++) { const a = base + i * 2; index.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  }
  const at = (x: number, y: number): [number, number, number] => [x * u, y * u, 0];
  const ex = 0.15 + 0.6 * 0.26, ey = 1.36 - 0.8 * 0.26, wx = bent ? ex : 0.45, wy = bent ? ey - 0.24 : 0.96;
  const joints = { neck: at(0, N), hipL: at(0.1, 0.9), hipR: at(-0.1, 0.9), shoulderL: at(0.15, 1.36), elbowL: at(ex, ey), wristL: at(wx, wy), shoulderR: at(-0.15, 1.36), elbowR: at(-ex, ey), wristR: at(-wx, wy) };
  return { rest: Float32Array.from(rest), index, joints, frame: topFrame({ rest, index, unitsPerMetre: u, joints, facing }) };
}
const specOf = (frame: TopFrame, style: NeckStyle, over: Partial<{ neckFront: number; sleeve: number; hem: number | null; band: Partial<typeof TEE_BANDS> | null }> = {}) =>
  topCutSpec({ neckFront: over.neckFront ?? neckDefault(style, frame), neckStyle: style, sleeve: over.sleeve ?? 0.3, band: over.band ?? null }, frame, over.hem === undefined ? 0.1 : over.hem);
/** A drawing's own value at a place: its cells blended as the shader's sampler blends them (the nearest cell's beyond the picture). */
const drawingAt = (cut: TopCut, x: number, y: number, side: 1 | -1) => {
  const f = cut.frame, field = side > 0 ? cut.front : cut.back;
  const u = Math.max(0, Math.min(f.cols - 1, (x - f.x0) / f.cell - 0.5)), v = Math.max(0, Math.min(f.rows - 1, (y - f.y0) / f.cell - 0.5));
  const i = Math.min(f.cols - 2, Math.floor(u)), j = Math.min(f.rows - 2, Math.floor(v)), fu = u - i, fv = v - j, k = j * f.cols + i;
  return (field[k] * (1 - fu) + field[k + 1] * fu) * (1 - fv) + (field[k + f.cols] * (1 - fu) + field[k + f.cols + 1] * fu) * fv;
};
const front = (cut: TopCut, x: number, y: number) => drawingAt(cut, x, y, 1), back = (cut: TopCut, x: number, y: number) => drawingAt(cut, x, y, -1);
const most = (a: ArrayLike<number>) => { let m = -Infinity; for (let k = 0; k < a.length; k++) m = Math.max(m, a[k]); return m; };
const least = (a: ArrayLike<number>) => { let m = Infinity; for (let k = 0; k < a.length; k++) m = Math.min(m, a[k]); return m; };

describe('a top\'s cut: her measures (the paper doll)', () => {
  const { frame } = doll();
  it('lays its picture about the base of her neck, 1.25 mm a cell', () => {
    expect([frame.cols, frame.rows]).toEqual([416, 384]);
    expect(frame.cell).toBeCloseTo(0.00125, 12);
    expect([frame.x0, frame.y0]).toEqual([-0.26, N - 0.36].map((v) => expect.closeTo(v, 9)));
    expect([frame.mid, frame.neckY, frame.hipY, frame.facing, frame.unitsPerMetre]).toEqual([0, N, 0.9, 1, 1]);
  });
  it('finds her shoulders\' ridge, her two sides as one, under the cap over her neck', () => {
    for (const x of [0, 0.03, 0.068, 0.1, 0.105, 0.2, 0.25]) expect(ridgeAt(frame, x), `at ${x}`).toBeCloseTo(ridgeOf(x), 6);
    expect(ridgeAt(frame, -0.1)).toBe(ridgeAt(frame, 0.1));
    // skin above the cap (her jaw, her ears) is not her shoulders': a doll with a head on it has the same ridge
    const d = doll(), top = d.rest.length / 3;
    const withHead = topFrame({ rest: [...d.rest, -0.08, N + 0.08, 0.1, 0.08, N + 0.08, 0.1, 0, N + 0.3, 0.1], index: [...d.index, top, top + 1, top + 2], unitsPerMetre: 1, joints: d.joints });
    for (const x of [0, 0.05, 0.1]) expect(ridgeAt(withHead, x)).toBeCloseTo(ridgeOf(x), 6);
  });
  it('takes her middle depth half way between her front skin and her back skin', () => {
    for (const [x, y] of [[0, 1.3], [0.2, 1.1], [-0.15, 1.38]]) expect(midDepthAt(frame, x, y)).toBeCloseTo(0, 9);
    // a doll whose back is twice as far behind her as her front is before her: her middle is where the two average
    const d = doll(), lop = Float32Array.from(d.rest, (v, i) => (i % 3 === 2 && v < 0 ? -0.2 : v));
    const f = topFrame({ rest: lop, index: d.index, unitsPerMetre: 1, joints: d.joints });
    expect(midDepthAt(f, 0, 1.3)).toBeCloseTo(-0.05, 6);
    // (one depth everywhere still has a span, for the picture's byte: it reads back as that depth)
    expect(f.zLo).toBeCloseTo(-0.05, 6);
    expect(f.zHi - f.zLo).toBe(1);
    const blue = cutPicture(topCut(specOf(f, 'crew'), f))[2];
    expect(f.zLo + (blue / 255) * (f.zHi - f.zLo)).toBeCloseTo(-0.05, 6);
  });
  it('measures each arm down its two bones, from her shoulder joint to her elbow and on to her wrist', () => {
    expect(frame.arms.map((a) => [a.upper.length, a.fore.length, a.length])).toEqual([0, 1].map(() => [expect.closeTo(0.26, 9), expect.closeTo(0.24, 9), expect.closeTo(0.5, 9)]));
    expect(frame.arms[0].upper.dir).toEqual([0.6, -0.8, 0].map((v) => expect.closeTo(v, 9)));
    expect(frame.arms[1].fore.dir).toEqual([-0.6, -0.8, 0].map((v) => expect.closeTo(v, 9)));
    // along an arm, on the arm of a place's own side of her
    expect(alongArm(frame, 0.15 + 0.6 * 0.2, 1.36 - 0.8 * 0.2, 0.03)).toBeCloseTo(0.2, 9);
    expect(alongArm(frame, -0.15 - 0.6 * 0.2, 1.36 - 0.8 * 0.2, -0.03)).toBeCloseTo(0.2, 9);
  });
  it('cuts a sleeve\'s end square to the bone it ends on, turning as it passes her elbow', () => {
    // an arm bent at her elbow: her upper arm down and out along (0.6, -0.8), her forearm straight down
    const arm = doll(1, 1, true).frame.arms[0], on = (p: readonly number[], x: number, y: number, z = 0) => x * p[0] + y * p[1] + z * p[2] + p[3];
    expect([arm.upper.length, arm.fore.length, arm.length]).toEqual([0.26, 0.24, 0.5].map((v) => expect.closeTo(v, 9)));
    // a short sleeve: square to her upper arm -- a place beside the bone, 5 cm off it either way, is as far along as the bone is there
    const short = sleevePlane(arm, 0.1, 1), bx = 0.15 + 0.6 * 0.1, by = 1.36 - 0.8 * 0.1;
    expect(short.slice(0, 3)).toEqual([0.6, -0.8, 0].map((v) => expect.closeTo(v, 9)));
    for (const off of [-0.05, 0, 0.05]) expect(on(short, bx + 0.8 * off, by + 0.6 * off, 0.02)).toBeCloseTo(0.1, 9);
    // a long sleeve: square to her forearm -- level, 14 cm under her elbow
    const long = sleevePlane(arm, 0.4, 1), ex = 0.15 + 0.6 * 0.26, ey = 1.36 - 0.8 * 0.26;
    expect(long.slice(0, 3)).toEqual([0, -1, 0].map((v) => expect.closeTo(v, 9)));
    for (const off of [-0.05, 0, 0.05]) expect(on(long, ex + off, ey - 0.14)).toBeCloseTo(0.4, 9);
    // at her elbow: through the joint, square to half way between her two bones
    const at = sleevePlane(arm, 0.26, 1), mid = [0.3, -0.9], l = Math.hypot(mid[0], mid[1]);
    expect(at.slice(0, 3)).toEqual([mid[0] / l, mid[1] / l, 0].map((v) => expect.closeTo(v, 9)));
    expect(on(at, ex, ey)).toBeCloseTo(0.26, 9);
    // and it turns evenly with SLEEVE from 3 cm above her elbow to 3 cm under it: no jump
    let last = Math.atan2(short[0], -short[1]);
    for (let s = 0.2; s <= 0.32; s += 0.002) {
      const p = sleevePlane(arm, s, 1), lean = Math.atan2(p[0], -p[1]);
      expect(lean, `at ${s}`).toBeLessThanOrEqual(last + 1e-9);
      expect(last - lean, `at ${s}`).toBeLessThan(0.06);
      expect(Math.hypot(p[0], p[1], p[2])).toBeCloseTo(1, 9);
      last = lean;
    }
    expect(last).toBeCloseTo(0, 9);
    // with no sleeve (her arms bare) it is her upper arm's own measure, from her shoulder joint
    expect(on(sleevePlane(arm, -1, 1), bx, by)).toBeCloseTo(0.1, 9);
  });
});

describe('a top\'s cut: its numbers from a template\'s sliders', () => {
  const { frame } = doll();
  it('puts the neck opening\'s lowest point where NECKLINE says on her trunk, and a style\'s own until it is moved', () => {
    for (const style of STYLES) {
      expect(neckDefault(style, frame), style).toBeCloseTo(1 - NECK_STYLES[style].depth / 0.5, 12);
      expect(specOf(frame, style).dipY, style).toBeCloseTo(N - NECK_STYLES[style].depth, 9);
    }
    expect(specOf(frame, 'u', { neckFront: 0.8 }).dipY).toBeCloseTo(0.9 + 0.8 * 0.5, 12);
    // never over her shoulders: taken past them it stops 4 mm under her ridge at its side points
    const high = specOf(frame, 'crew', { neckFront: 1.3 });
    expect(high.dipY).toBeCloseTo(ridgeAt(frame, high.half) - 0.004, 9);
  });
  it('opens a crew a little wider as it is taken lower, and no other style', () => {
    expect(specOf(frame, 'crew').half).toBeCloseTo(0.068, 12);
    expect(specOf(frame, 'crew', { neckFront: 0.7 }).half).toBeCloseTo(0.08, 12);
    const part = specOf(frame, 'crew', { neckFront: 0.9 }).half;
    expect(part).toBeGreaterThan(0.068); expect(part).toBeLessThan(0.08);
    for (const style of ['u', 'v', 'scoop', 'square'] as const) expect(specOf(frame, style, { neckFront: 0.7 }).half, style).toBeCloseTo(NECK_STYLES[style].half, 12);
  });
  it('ends a sleeve along her arm, a hem on her trunk, and wears a tee\'s bands until it is given its own', () => {
    const s = specOf(frame, 'crew', { sleeve: 0.32, hem: -0.06 });
    expect(s.sleeve).toBeCloseTo(0.16, 12);
    expect(s.hemY).toBeCloseTo(0.9 - 0.03, 12);
    // (none at its hem: her hem is the drape's hem band, which covers a band drawn on her skin there -- `TEE_BANDS`)
    expect(s.bands).toEqual({ neck: 0.016, sleeve: 0.018, hem: 0 });
    expect(specOf(frame, 'crew', { band: { hem: 0.02 } }).bands.hem).toBe(0.02);
    // sleeveless: her arms bare; a one-piece: no hem
    expect(specOf(frame, 'crew', { sleeve: -0.05 }).sleeve).toBe(-1);
    expect(specOf(frame, 'crew', { hem: null }).hemY).toBe(-Infinity);
    expect(specOf(frame, 'crew', { band: { sleeve: 0.05, hem: 0 } }).bands).toEqual({ neck: 0.016, sleeve: 0.05, hem: 0 });
  });
  it('says which templates are drawn: a shirt with a neck opening and a level hem, no straps', () => {
    const drawn = COVERAGE_TEMPLATES.filter((t) => isCutTop(t.params)).map((t) => t.id);
    expect(drawn).toEqual(['sleeveless', 'teeShort', 'teeU', 'teeV', 'teeScoop', 'teeSquare', 'teeRinger', 'teeThreeQuarter', 'teeLong']);
    for (const id of ['tank', 'crop', 'maternity', 'sportsBra', 'bandeau', 'swimsuit', 'bodysuit', 'leggingsFull', 'athleticBottom']) expect(drawn, id).not.toContain(id);
  });
});

describe('a top\'s cut: the rim of each neck opening', () => {
  const { frame } = doll();
  const turns = (path: readonly (readonly [number, number])[]) => {
    const out: number[] = [];
    for (let k = 1; k + 1 < path.length; k++) {
      const a = Math.atan2(path[k][1] - path[k - 1][1], path[k][0] - path[k - 1][0]), b = Math.atan2(path[k + 1][1] - path[k][1], path[k + 1][0] - path[k][0]);
      let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d;
      out.push((d * 180) / Math.PI);
    }
    return out;
  };
  it('runs from one side point to the other, on her shoulders\' ridge, the same either side of her middle', () => {
    for (const style of STYLES) for (const isFront of [true, false]) {
      const spec = specOf(frame, style), rim = rimPath(spec, frame, isFront), top = ridgeAt(frame, spec.half), name = `${style} ${isFront ? 'front' : 'back'}`;
      expect(rim[0], name).toEqual([expect.closeTo(-spec.half, 9), expect.closeTo(top, 9)]);
      expect(rim[rim.length - 1], name).toEqual([expect.closeTo(spec.half, 9), expect.closeTo(top, 9)]);
      for (let k = 0; k < rim.length; k++) { const m = rim[rim.length - 1 - k]; expect(rim[k][0], name).toBeCloseTo(-m[0], 9); expect(rim[k][1], name).toBeCloseTo(m[1], 9); }
      // from left to right without turning back, and never above its side points
      for (let k = 1; k < rim.length; k++) expect(rim[k][0], name).toBeGreaterThanOrEqual(rim[k - 1][0] - 1e-9);
      for (const p of rim) expect(p[1], name).toBeLessThanOrEqual(top + 1e-9);
    }
  });
  it('dips in front to its NECKLINE, and across her back only a little under its side points', () => {
    for (const style of STYLES) {
      const spec = specOf(frame, style), top = ridgeAt(frame, spec.half);
      expect(Math.min(...rimPath(spec, frame, true).map((p) => p[1])), style).toBeCloseTo(spec.dipY, 6);
      expect(Math.min(...rimPath(spec, frame, false).map((p) => p[1])), style).toBeCloseTo(top - NECK_STYLES[style].back, 6);
    }
  });
  it('is a curve: no corner anywhere on a crew, a U or a scoop, and it leaves each side point straight up', () => {
    for (const style of ['crew', 'u', 'scoop'] as const) for (const isFront of [true, false]) {
      const rim = rimPath(specOf(frame, style), frame, isFront), name = `${style} ${isFront ? 'front' : 'back'}`;
      // (the back's is a shallow arc with the same count of points round a tight end: a few degrees a step there)
      expect(Math.max(...turns(rim)), name).toBeLessThan(isFront ? 2.5 : 12);
      const a = rim[rim.length - 2], b = rim[rim.length - 1];
      expect(Math.abs(b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), name).toBeLessThan(isFront ? 0.03 : 0.2);
    }
  });
  it('a V is two straight sides to a point, its tip and its turn at each side point rounded', () => {
    const spec = specOf(frame, 'v'), rim = rimPath(spec, frame, true);
    // its sides: one straight piece each, a mirror pair, and every other piece a short step round its tip or a turn
    const pieces = rim.slice(1).map((p, k) => ({ from: rim[k], to: p, length: Math.hypot(p[0] - rim[k][0], p[1] - rim[k][1]) })).sort((x, y) => y.length - x.length);
    expect(pieces[0].length).toBeGreaterThan(0.06);
    expect(pieces[1].length).toBeCloseTo(pieces[0].length, 9);
    expect(pieces[2].length).toBeLessThan(0.004);
    const sides = [pieces[0], pieces[1]].sort((x, y) => x.from[0] - y.from[0]);
    expect(sides[0].from[0]).toBeCloseTo(-sides[1].to[0], 9); expect(sides[0].to[0]).toBeCloseTo(-sides[1].from[0], 9);
    // its tip: rounded 6 mm, its lowest point the dip itself at her middle
    const low = rim.reduce((m, p) => (p[1] < m[1] ? p : m));
    expect(low).toEqual([expect.closeTo(0, 9), expect.closeTo(spec.dipY, 9)]);
    expect(Math.max(...turns(rim))).toBeLessThan(15);
  });
  it('a square neck is straight down from her shoulders to a level edge, its corners rounded', () => {
    const spec = specOf(frame, 'square'), rim = rimPath(spec, frame, true), r = NECK_STYLES.square.corner;
    for (const p of rim) if (Math.abs(p[0]) < spec.half - r - 1e-6) expect(p[1]).toBeCloseTo(spec.dipY, 9);
    for (const p of rim) if (p[1] > spec.dipY + r + 1e-6) expect(Math.abs(p[0])).toBeCloseTo(spec.half, 9);
    expect(Math.max(...turns(rim))).toBeLessThan(15);
  });
});

describe('a top\'s cut: the drawings', () => {
  const { frame } = doll();
  const crew = topCut(specOf(frame, 'crew'), frame), dip = crew.spec.dipY, half = crew.spec.half, top = ridgeAt(frame, half);
  it('holds, for every place, how far it is inside the garment: + in it, - in the opening', () => {
    // under and over the rim's lowest point, at her middle
    expect(front(crew, 0, dip - 0.01)).toBeCloseTo(0.01, 4);
    expect(front(crew, 0, dip + 0.01)).toBeCloseTo(-0.01, 4);
    // beside the line that carries a side point straight up: garment outside it, opening inside
    expect(front(crew, half + 0.01, top + 0.02)).toBeCloseTo(0.01, 4);
    expect(front(crew, half - 0.01, top + 0.02)).toBeCloseTo(-0.01, 4);
    expect(back(crew, half + 0.01, top + 0.02)).toBeCloseTo(0.01, 4);
    expect(back(crew, -half - 0.01, top + 0.02)).toBeCloseTo(0.01, 4);
    // her back's rim is high: where her front's is open at her middle, her back is covered
    expect(back(crew, 0, dip + 0.01)).toBeGreaterThan(0.02);
    expect(back(crew, 0, top - NECK_STYLES.crew.back + 0.005)).toBeCloseTo(-0.005, 4);
  });
  it('is no garment above the ceiling over her neck (her head), and all garment far below', () => {
    const ceil = N + TOP_CUT.ceiling;
    for (const x of [-0.25, -0.15, 0.2]) { expect(front(crew, x, ceil + 0.01)).toBeCloseTo(-0.01, 4); expect(front(crew, x, ceil - 0.01)).toBeCloseTo(0.01, 4); expect(back(crew, x, ceil + 0.01)).toBeCloseTo(-0.01, 4); }
    // beyond the picture a place takes its nearest cell's say: over it her head, under it and beside it the garment
    expect(front(crew, 0, N + 0.5)).toBeLessThan(0);
    expect(front(crew, 0, 0.3)).toBeCloseTo(TOP_CUT.range, 7);
    expect(front(crew, 0.4, 1.2)).toBeCloseTo(TOP_CUT.range, 7);
    // and it is kept only within its range of a line
    expect(most(crew.front)).toBeCloseTo(TOP_CUT.range, 7);
    expect(least(crew.front)).toBeCloseTo(-TOP_CUT.range, 7);
  });
  it('is the true distance to the rim: beside a V\'s straight side, under a square\'s level edge, round its corner', () => {
    const v = topCut(specOf(frame, 'v'), frame), rim = rimPath(v.spec, frame, true);
    // its right side: the longest piece of its path right of her middle
    const side = rim.slice(1).map((p, k) => [rim[k], p] as const).filter(([p]) => p[0] >= 0).sort((x, y) => Math.hypot(y[1][0] - y[0][0], y[1][1] - y[0][1]) - Math.hypot(x[1][0] - x[0][0], x[1][1] - x[0][1]))[0], a = side[0], b = side[1];
    // a place 8 mm off the middle of it, out into the garment (the side's own normal)
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (b[1] - a[1]) / l, ny = -(b[0] - a[0]) / l;
    expect(front(v, mx + nx * 0.008, my + ny * 0.008)).toBeCloseTo(0.008, 4);
    expect(front(v, mx - nx * 0.008, my - ny * 0.008)).toBeCloseTo(-0.008, 4);
    expect(front(v, 0, v.spec.dipY - 0.005)).toBeCloseTo(0.005, 4);
    const q = topCut(specOf(frame, 'square'), frame), r = NECK_STYLES.square.corner;
    expect(front(q, 0.03, q.spec.dipY - 0.012)).toBeCloseTo(0.012, 4);
    expect(front(q, q.spec.half + 0.012, q.spec.dipY + 0.04)).toBeCloseTo(0.012, 4);
    // round its corner: the same distance from the corner's own centre, less its radius
    const cx = q.spec.half - r, cy = q.spec.dipY + r;
    expect(front(q, cx + 0.02 * Math.SQRT1_2, cy - 0.02 * Math.SQRT1_2)).toBeCloseTo(0.02 - r, 4);
  });
  it('gives the shader one byte a cell for each drawing and her depth, rows from the lowest up', () => {
    const bytes = cutPicture(crew), k = (x: number, y: number) => Math.floor((y - frame.y0) / frame.cell) * frame.cols + Math.floor((x - frame.x0) / frame.cell);
    expect(bytes).toHaveLength(416 * 384 * 4);
    const read = (i: number, c: number) => ((bytes[i * 4 + c] - 127.5) / 127.5) * TOP_CUT.range;
    for (const [x, y] of [[0, dip - 0.01], [0, dip + 0.01], [half + 0.01, top + 0.02], [0.1, 1.2], [0.2, N + 0.1]]) {
      const i = k(x, y);
      expect(read(i, 0), `front at ${x}, ${y}`).toBeCloseTo(crew.front[i], 3.5);
      expect(read(i, 1), `back at ${x}, ${y}`).toBeCloseTo(crew.back[i], 3.5);
      expect(bytes[i * 4 + 3]).toBe(255);
    }
    // (a byte is a quarter of a millimetre)
    expect((2 * TOP_CUT.range) / 255).toBeLessThan(0.00025);
  });
  it('is the same drawing whatever a sleeve\'s length or a hem\'s height: those are not in the picture', () => {
    const other = drawCut(specOf(frame, 'crew', { sleeve: 0.9, hem: 0.4 }), frame, true);
    expect(Array.from(other)).toEqual(Array.from(crew.front));
  });
});

describe('a top\'s cut: at a place on her', () => {
  const { frame } = doll();
  const cut = topCut(specOf(frame, 'crew', { sleeve: 0.3, hem: 0.1 }), frame);
  it('reads her front\'s drawing in front of her middle depth and her back\'s behind it, blended across it', () => {
    const y = cut.spec.dipY + 0.01, f = cutAt(cut, 0, y, 0.1, 0), b = cutAt(cut, 0, y, -0.1, 0);
    expect(f).toBeCloseTo(-0.01, 4);
    // (behind her the place is under her back's rim by more than the drawings' range: far in, her hem's to say)
    expect(b).toBeCloseTo(y - 0.95, 9);
    expect(cutAt(cut, 0, y, TOP_CUT.sideBlend, 0)).toBeCloseTo(f, 9);
    expect(cutAt(cut, 0, y, -TOP_CUT.sideBlend, 0)).toBeCloseTo(b, 9);
    // half way: the two drawings' own values, half each (her back's is held at the range there: 3 cm in)
    expect(cutAt(cut, 0, y, 0, 0)).toBeCloseTo((front(cut, 0, y) + back(cut, 0, y)) / 2, 6);
    expect(back(cut, 0, y)).toBeCloseTo(TOP_CUT.range, 7);
  });
  it('holds a place at the drawings\' range to be far from the neck opening: its sleeve\'s end or its hem alone says', () => {
    // her waist, 30 cm above her hem: not "3 cm in" (the drawings' range) but as far in as her hem says
    expect(cutAt(cut, 0.05, 1.25, 0.1, 0)).toBeCloseTo(1.25 - 0.95, 9);
    // and a long sleeve's cuff may be wider than the range: 4 cm up from its end is 4 cm, on its sleeve's edge
    const long = topCut(specOf(frame, 'crew', { sleeve: 0.9, hem: 0.1 }), frame), at = 0.45 - 0.04;
    expect(cutEdgeAt(long, 0.15 + 0.6 * at, 1.36 - 0.8 * at, 0.02, 1)).toEqual({ distance: expect.closeTo(0.04, 9), edge: 1 });
  });
  it('ends at her hem on everything but her arms, and at her sleeve\'s end on her arms', () => {
    const hem = 0.9 + 0.1 * 0.5;
    expect(cutAt(cut, 0.05, hem + 0.01, 0.1, 0)).toBeCloseTo(0.01, 9);
    expect(cutAt(cut, 0.05, hem - 0.01, 0.1, 0)).toBeCloseTo(-0.01, 9);
    // a place 14 cm down her left arm, and 16: her sleeve ends at 15
    const arm = (along: number): [number, number, number] => [0.15 + 0.6 * along, 1.36 - 0.8 * along, 0.02];
    expect(cutAt(cut, ...arm(0.14), 1)).toBeCloseTo(0.01, 9);
    expect(cutAt(cut, ...arm(0.16), 1)).toBeCloseTo(-0.01, 9);
    // her hand hangs below her hem and is her arm's: the sleeve's end decides, not the hem
    expect(cutAt(cut, ...arm(0.5), 1)).toBeCloseTo(-0.35, 9);
    // the same place as her trunk's skin would be the hem's to say
    expect(cutAt(cut, ...arm(0.14), 0)).toBeCloseTo(1.36 - 0.8 * 0.14 - hem, 6);
  });
  it('tells her arm\'s skin from the rest of her at one half, over a narrow band either side', () => {
    expect([0, 0.4, 0.5, 0.6, 1].map(armSide)).toEqual([0, 0, 0.5, 1, 1]);
  });
  it('names the nearest edge, for a band\'s own width there', () => {
    expect(cutEdgeAt(cut, 0, cut.spec.dipY - 0.005, 0.1, 0)).toEqual({ distance: expect.closeTo(0.005, 4), edge: 0 });
    expect(cutEdgeAt(cut, 0.05, 0.96, 0.1, 0)).toEqual({ distance: expect.closeTo(0.01, 9), edge: 2 });
    expect(cutEdgeAt(cut, 0.15 + 0.6 * 0.14, 1.36 - 0.8 * 0.14, 0.02, 1)).toEqual({ distance: expect.closeTo(0.01, 9), edge: 1 });
  });
  it('lays the paint per vertex as a ramp about the line: one half on it, whole 15 mm inside', () => {
    const y = cut.spec.dipY, rest = [0, y, 0.1, 0, y - 0.0075, 0.1, 0, y - 0.03, 0.1, 0, y + 0.0075, 0.1, 0, y + 0.03, 0.1];
    const c = cutCoverage(cut, rest, null);
    expect(CUT_VERTEX_RAMP_M).toBe(0.015);
    expect(Array.from(c)).toEqual([0.5, 0.75, 1, 0.25, 0].map((v) => expect.closeTo(v, 2)));
  });
});

describe('a top\'s cut: her mesh\'s own units and which way she faces', () => {
  const metres = doll(), U = 1.111423, room = doll(U), turned = doll(1, -1);
  it('is the same cut in her mesh\'s units as in metres', () => {
    expect([room.frame.cols, room.frame.rows]).toEqual([metres.frame.cols, metres.frame.rows]);
    for (const style of STYLES) {
      const a = topCut(specOf(metres.frame, style), metres.frame), b = topCut(specOf(room.frame, style), room.frame);
      expect(b.spec.dipY / U, style).toBeCloseTo(a.spec.dipY, 6);
      expect(b.spec.half / U, style).toBeCloseTo(a.spec.half, 6);
      expect(b.spec.sleeve / U, style).toBeCloseTo(a.spec.sleeve, 6);
      expect(b.spec.bands.neck / U, style).toBeCloseTo(a.spec.bands.neck, 9);
      let worst = 0;
      for (let k = 0; k < a.front.length; k += 7) worst = Math.max(worst, Math.abs(b.front[k] / U - a.front[k]), Math.abs(b.back[k] / U - a.back[k]));
      expect(worst, style).toBeLessThan(2e-5);
    }
  });
  it('reads her front\'s drawing on her front whichever way she faces', () => {
    const a = topCut(specOf(metres.frame, 'scoop'), metres.frame), b = topCut(specOf(turned.frame, 'scoop'), turned.frame), y = a.spec.dipY + 0.01;
    expect(turned.frame.facing).toBe(-1);
    expect(cutAt(b, 0, y, -0.1, 0)).toBeCloseTo(cutAt(a, 0, y, 0.1, 0), 9);
    expect(cutAt(b, 0, y, 0.1, 0)).toBeCloseTo(cutAt(a, 0, y, -0.1, 0), 9);
  });
});

// ------------------------------------------------------------------------------------------------ on her own skin
describe('a top\'s cut on her own rest skin (the room\'s body file)', () => {
  let rest: Float64Array, index: ArrayLike<number>, arm: Float32Array, frame: TopFrame;
  beforeAll(async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read('public/models/sarah-v2-body-slim.glb'), body = readBody(doc);
    rest = body.skin.rest; index = body.skin.index;
    const skin = doc.getRoot().listSkins()[0], at = (name: string) => { const j = skin.listJoints().find((x) => x.getName() === name); if (!j) throw new Error(`no joint ${name}`); return j.getWorldTranslation() as [number, number, number]; };
    // her arm's skin: what the bone that weighs most on a vertex says (as her regions are told: bodyRegions.ts)
    const n = rest.length / 3;
    arm = new Float32Array(n);
    for (let v = 0; v < n; v++) { let best = 0; for (let k = 1; k < 4; k++) if (body.skin.weights[v * 4 + k] > body.skin.weights[v * 4 + best]) best = k; arm[v] = body.isArm[body.skin.joints[v * 4 + best]]; }
    frame = topFrame({ rest, index, unitsPerMetre: 1, joints: { neck: at('Bone_017'), hipL: at('Bone_014'), hipR: at('Bone_009'), shoulderL: at('Bone_026'), elbowL: at('Bone_025'), wristL: at('Bone_024'), shoulderR: at('Bone_021'), elbowR: at('Bone_020'), wristR: at('Bone_019') } });
  }, 60_000);
  const cutOn = (style: NeckStyle, sleeve = 0.32) => topCut(topCutSpec({ neckFront: neckDefault(style, frame), neckStyle: style, sleeve }, frame, -0.06), frame);

  it('MEASURED: the base of her neck, her trunk, her arms and her shoulders\' ridge', () => {
    expect(frame.neckY).toBeCloseTo(1.4111, 3);
    expect(frame.neckY - frame.hipY).toBeCloseTo(0.5246, 3);
    expect(Math.abs(frame.mid)).toBeLessThan(0.005);
    // her arms: 26.0 cm to her elbow and 22.4 on to her wrist, her forearm 11.9 degrees off her upper arm's line at rest
    for (const a of frame.arms) {
      expect([a.upper.length, a.fore.length, a.length]).toEqual([0.2601, 0.2244, 0.4845].map((v) => expect.closeTo(v, 3)));
      const bend = (Math.acos(a.upper.dir[0] * a.fore.dir[0] + a.upper.dir[1] * a.fore.dir[1] + a.upper.dir[2] * a.fore.dir[2]) * 180) / Math.PI;
      expect(bend).toBeCloseTo(11.9, 0.5);
    }
    // her ridge: 4.4 cm over her neck joint at 6 cm out, 1.9 cm at 10, a few millimetres at 16
    for (const [out, y] of [[0.06, 1.455], [0.068, 1.4485], [0.08, 1.4406], [0.1, 1.43], [0.12, 1.4225], [0.16, 1.4135]]) expect(ridgeAt(frame, out), `at ${out}`).toBeCloseTo(y, 2.5);
    // from the closest collar's side points out, none of her shoulders is within 3.5 cm of the ceiling over her neck
    for (let out = 0.06; out <= 0.25; out += 0.0025) expect(frame.neckY + TOP_CUT.ceiling - ridgeAt(frame, out), `at ${out}`).toBeGreaterThan(0.035);
  });
  it('his sheet\'s neck openings on her: where each one\'s lowest point and side points are', () => {
    // (millimetres: its lowest point under the base of her neck, its side points out from her middle, and how far over
    // the base of her neck her ridge is there)
    const want = { crew: [18, 68, 37.4], u: [100, 70, 35.9], v: [95, 70, 35.9], scoop: [85, 105, 16.6], square: [80, 88, 25] } as const;
    for (const s of STYLES) {
      const c = cutOn(s), name = `${s}`;
      expect((frame.neckY - c.spec.dipY) / MM, name).toBeCloseTo(want[s][0], 6);
      expect(c.spec.half / MM, name).toBeCloseTo(want[s][1], 6);
      expect(Math.abs((ridgeAt(frame, c.spec.half) - frame.neckY) / MM - want[s][2]), name).toBeLessThan(1);
    }
    // and what the templates' NECKLINE starts at is each style's own on her trunk
    for (const s of STYLES) expect(DRAWN_NECK[s], s).toBeCloseTo(neckDefault(s, frame), 2.5);
  });
  it('leaves her head, her legs and her arms past its sleeves bare, and covers her trunk between', () => {
    for (const style of STYLES) {
      const cut = cutOn(style), cover = cutCoverage(cut, rest, arm);
      let head = 0, legs = 0, past = 0, covered = 0, chest = 0, chestIn = 0;
      for (let v = 0; v < cover.length; v++) {
        const x = rest[v * 3], y = rest[v * 3 + 1], z = rest[v * 3 + 2], on = cover[v] > 0.5;
        if (on) covered++;
        if (on && y > frame.neckY + TOP_CUT.ceiling + 0.01) head++;
        if (on && y < cut.spec.hemY - 0.01 && !arm[v]) legs++;
        if (on && arm[v] && alongArm(frame, x, y, z, cut.spec.sleeve) > cut.spec.sleeve + 0.01) past++;
        // her trunk well inside every line: under her bust to her waist
        if (!arm[v] && y > 1.0 && y < 1.2) { chest++; if (cover[v] === 1) chestIn++; }
      }
      expect({ head, legs, past }, style).toEqual({ head: 0, legs: 0, past: 0 });
      expect(chestIn, style).toBe(chest);
      expect(covered, style).toBeGreaterThan(29000);
    }
    // a wider, deeper opening covers less of her
    const count = (style: NeckStyle) => cutCoverage(cutOn(style), rest, arm).reduce((s, c) => s + (c > 0.5 ? 1 : 0), 0);
    expect(count('crew')).toBeGreaterThan(count('v')); expect(count('v')).toBeGreaterThan(count('scoop'));
    // and a longer sleeve more
    expect(cutCoverage(cutOn('crew', 1), rest, arm).reduce((s, c) => s + (c > 0.5 ? 1 : 0), 0)).toBeGreaterThan(count('crew') + 5000);
  });
  it('MEASURED: on top of her shoulders, where the two drawings are blended, they agree to a few millimetres', () => {
    // every place of her skin (her triangles' corners, their sides' middles and their own) within the blend's depth of
    // her middle depth, where either drawing has it in the garment or on the line
    const worst = (style: NeckStyle) => {
      const cut = cutOn(style), out = { line: 0, band: 0, places: 0 };
      const test = (x: number, y: number, z: number) => {
        if (y < frame.neckY - 0.06 || y > frame.neckY + 0.08 || Math.abs(x - frame.mid) > 0.22 || Math.abs(z - midDepthAt(frame, x, y)) > TOP_CUT.sideBlend) return;
        const f = front(cut, x, y), b = back(cut, x, y), lo = Math.min(f, b), hi = Math.max(f, b);
        if (hi < -0.002) return;
        out.places++;
        if (Math.min(Math.abs(f), Math.abs(b)) < 0.002) out.line = Math.max(out.line, hi - lo); else if (lo < 0.02) out.band = Math.max(out.band, hi - lo);
      };
      for (let t = 0; t + 2 < index.length; t += 3) {
        const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
        for (const [wa, wb, wc] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]]) test(wa * rest[a] + wb * rest[b] + wc * rest[c], wa * rest[a + 1] + wb * rest[b + 1] + wc * rest[c + 1], wa * rest[a + 2] + wb * rest[b + 2] + wc * rest[c + 2]);
      }
      return out;
    };
    // MEASURED 2026-11-14 (mm): on the line 2.4 crew, 2.5 U, 2.3 V, 1.1 scoop, 1.6 square; a band's width in 3.1, 4.5, 2.2, 1.2, 3.0.
    // (Her ridge falls away outward, so a place on it beside a side point is under that point's height: her back's
    // drawing measures it to the point itself, her front's across to the rim's upright -- the same place, two views.)
    const bar = { crew: [2.7, 3.4], u: [2.8, 4.8], v: [2.6, 2.5], scoop: [1.4, 1.5], square: [1.9, 3.3] } as const;
    for (const style of STYLES) {
      const w = worst(style);
      expect(w.places, style).toBeGreaterThan(3000);
      expect(w.line / MM, `${style} on the line`).toBeLessThan(bar[style][0]);
      expect(w.band / MM, `${style} a band in`).toBeLessThan(bar[style][1]);
    }
  });
});

// ------------------------------------------------------------------------------------------------ what a template makes of it
describe('a drawn top\'s template', () => {
  const d = doll(), n = d.rest.length / 3;
  // a map as `mapBody` makes it, with only what a cut reads: her rest, her trunk's length and no arms
  const map = { region: new Uint8Array(n), arm: new Float32Array(n).fill(NaN), rest: d.rest, trunkLength: 0.5, neckRadius: 0.05, facing: 1 } as unknown as BodyMap;
  const t = (id: string) => COVERAGE_TEMPLATES.find((x) => x.id === id)!.params;
  it('is cut from her measures: its neck by its style, its sleeves by SLEEVE, its hem by its LENGTH', () => {
    const cut = templateCut(map, t('teeV'), d.frame)!;
    expect(cut.spec.style).toBe('v');
    expect(cut.spec.sleeve).toBeCloseTo(0.32 * 0.5, 9);
    expect(Number.isFinite(cut.spec.hemY)).toBe(true);
    expect(templateCut(map, t('tank'), d.frame)).toBeNull();
    expect(templateCut(map, t('leggingsFull'), d.frame)).toBeNull();
    expect(templateCut(map, t('teeV'), null)).toBeNull();
  });
  it('wears its bands in its own fabric, a shade darker with a seam; a ringer has a collar and sleeve bands and none at its hem', () => {
    const cut = templateCut(map, t('teeShort'), d.frame)!, b = cut.spec.bands;
    expect(cutLayer(cut)).toEqual({ band: [b.neck, b.sleeve, b.hem], shade: BAND_SHADE });
    const ringer = templateCut(map, t('teeRinger'), d.frame)!, r = ringer.spec.bands;
    expect([r.neck, r.sleeve, r.hem]).toEqual([0.016, 0.016, 0]);
    // (one layer, like every drawn top: what makes it a ringer is its bands' colour, its fabric's edging)
    expect(cutLayer(ringer)).toEqual({ band: [0.016, 0.016, 0], shade: BAND_SHADE });
    expect(t('teeRinger').outlineLine).toBeUndefined();
    // a long sleeve's cuff is 5 cm
    expect(templateCut(map, t('teeLong'), d.frame)!.spec.bands.sleeve).toBeCloseTo(0.05, 12);
  });
  it('a look saved before its template gained a field wears that field as the template has it now, and all it said as saved', () => {
    // a long-sleeve tee as v0.9.23 saved it: its NECKLINE at 94%, and no word of a cuff
    const saved = { riseFront: null, riseSide: null, riseBack: null, riseFrontWidth: 1, legStart: 0, legEnd: 0, feet: false, hemFront: -0.1, hemBack: -0.1, neckFront: 0.94, neckBack: 0.97, sleeve: 1, topFront: null, topBack: null, topSide: null, strap: 0, strapIn: 0, armhole: null, neckStyle: 'crew', legCut: null, length: 0 } as unknown as CoverageParams;
    const worn = wornParams('teeLong', saved);
    expect(worn.neckFront).toBe(0.94); expect(worn.sleeve).toBe(1); expect(worn.length).toBe(0);
    expect(worn.band).toEqual({ sleeve: 0.05 });
    const cut = templateCut(map, worn, d.frame)!;
    // its lowest point where it was saved: 94% of the way up her trunk
    expect(cut.spec.dipY).toBeCloseTo(0.9 + 0.94 * 0.5, 9);
    expect(cut.spec.bands.sleeve).toBeCloseTo(0.05, 12);
    // a short-sleeve tee has gained none: as saved
    expect(wornParams('teeShort', { ...saved, sleeve: 0.32 })).toEqual({ ...saved, sleeve: 0.32 });
    // and a template this build does not know is left as it was saved
    expect(wornParams('noSuchTemplate', saved)).toBe(saved);
  });
  it('lays its paint per vertex about its own line: one half on the rim, all of it a band inside', () => {
    const ringer = templateCut(map, t('teeRinger'), d.frame)!, y = ringer.spec.dipY;
    const one = { ...map, rest: Float32Array.from([0, y - 0.016, 0.1, 0, y, 0.1]), region: new Uint8Array(2), arm: new Float32Array(2).fill(NaN) } as unknown as BodyMap;
    expect(Array.from(coverage(one, t('teeRinger'), ringer))).toEqual([1, 0.5].map((v) => expect.closeTo(v, 2)));
  });
});
