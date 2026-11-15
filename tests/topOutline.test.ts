/**
 * A DRAWN TOP'S OUTLINE (`src/sarahlab/topCut.ts` `TOP_OUTLINES`, `outlinePath`; Joshua, 2026-11-14: "finish all 10
 * remaining shirt tops", his sheet's 06 tank, 07 sports bra, 11 mock neck, 13 camisole and 14 boxy crop tee), on her own
 * rest skin (the room's body file):
 * - every neck opening drawn before is drawn bit for bit as it was (a checksum of both drawings, taken on the code before);
 * - over her shoulders the two drawings agree, as they do for a neck opening;
 * - a strap is its number wide over her shoulder, in both drawings;
 * - every armhole keeps off the row of her triangles that joins her arm's skin to her trunk's;
 * - the templates: which are drawn, their dials, and a look saved before today still opens.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  NECK_STYLES, TOP_OUTLINES, cutAt, cutEdgeAt, isCutTop, midDepthAt, neckDefault, outlinePath, ridgeAt, topCut, topCutSpec, topFrame,
  type NeckStyle, type TopCut, type TopFrame, type TopOutlineKind,
} from '../src/sarahlab/topCut';
import { COVERAGE_TEMPLATES, OUTLINE_NECK, dialsFor, templateCut, wornParams, type CoverageParams } from '../src/sarahlab/paintTemplates';
import { readBody } from '../scripts/sarahV2SideLock.mjs';
import type { BodyMap } from '../src/sarahlab/bodyRegions';

const MM = 0.001;
const KINDS = Object.keys(TOP_OUTLINES) as TopOutlineKind[];
const t = (id: string) => COVERAGE_TEMPLATES.find((x) => x.id === id)!.params;
const drawingAt = (cut: TopCut, x: number, y: number, side: 1 | -1) => {
  const f = cut.frame, field = side > 0 ? cut.front : cut.back;
  const u = Math.max(0, Math.min(f.cols - 1, (x - f.x0) / f.cell - 0.5)), v = Math.max(0, Math.min(f.rows - 1, (y - f.y0) / f.cell - 0.5));
  const i = Math.min(f.cols - 2, Math.floor(u)), j = Math.min(f.rows - 2, Math.floor(v)), fu = u - i, fv = v - j, k = j * f.cols + i;
  return (field[k] * (1 - fu) + field[k + 1] * fu) * (1 - fv) + (field[k + f.cols] * (1 - fu) + field[k + f.cols + 1] * fu) * fv;
};

describe('a top\'s outline on her own rest skin (the room\'s body file)', () => {
  let rest: Float64Array, index: ArrayLike<number>, arm: Float32Array, frame: TopFrame;
  beforeAll(async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read('public/models/sarah-v2-body-slim.glb'), body = readBody(doc);
    rest = body.skin.rest; index = body.skin.index;
    const skin = doc.getRoot().listSkins()[0], at = (name: string) => { const j = skin.listJoints().find((x) => x.getName() === name); if (!j) throw new Error(`no joint ${name}`); return j.getWorldTranslation() as [number, number, number]; };
    const n = rest.length / 3;
    arm = new Float32Array(n);
    for (let v = 0; v < n; v++) { let best = 0; for (let k = 1; k < 4; k++) if (body.skin.weights[v * 4 + k] > body.skin.weights[v * 4 + best]) best = k; arm[v] = body.isArm[body.skin.joints[v * 4 + best]]; }
    frame = topFrame({ rest, index, unitsPerMetre: 1, joints: { neck: at('Bone_017'), hipL: at('Bone_014'), hipR: at('Bone_009'), shoulderL: at('Bone_026'), elbowL: at('Bone_025'), wristL: at('Bone_024'), shoulderR: at('Bone_021'), elbowR: at('Bone_020'), wristR: at('Bone_019') } });
  }, 60_000);
  const outlineOn = (kind: TopOutlineKind) => topCut(topCutSpec({ ...t(kind), top: kind }, frame, -0.06), frame);

  it('draws every neck opening drawn before bit for bit as it was', () => {
    // MEASURED 2026-11-14: a checksum of both drawings of each style, taken on topCut.ts as it was before outlines (d950842)
    const before = OLD_SUMS;
    for (const s of Object.keys(NECK_STYLES) as NeckStyle[]) {
      const c = topCut(topCutSpec({ neckFront: neckDefault(s, frame), neckStyle: s, sleeve: 0.32 }, frame, -0.06), frame);
      expect(c.spec.outline, s).toBeUndefined();
      expect(checksum(c), s).toBe(before[s]);
    }
  });

  it('MEASURED: over her shoulders the two drawings agree, as a neck opening\'s do', () => {
    for (const kind of KINDS) {
      const cut = outlineOn(kind), out = { line: 0, band: 0, places: 0 };
      const test = (x: number, y: number, z: number) => {
        if (y < frame.neckY - 0.06 || y > frame.neckY + 0.08 || Math.abs(x - frame.mid) > 0.22 || Math.abs(z - midDepthAt(frame, x, y)) > cut.spec.sideBlend!) return;
        const f = drawingAt(cut, x, y, 1), b = drawingAt(cut, x, y, -1), lo = Math.min(f, b), hi = Math.max(f, b);
        if (hi < -0.002) return;
        out.places++;
        if (Math.min(Math.abs(f), Math.abs(b)) < 0.002) out.line = Math.max(out.line, hi - lo); else if (lo < 0.02) out.band = Math.max(out.band, hi - lo);
      };
      for (let k = 0; k + 2 < index.length; k += 3) {
        const a = index[k] * 3, b = index[k + 1] * 3, c = index[k + 2] * 3;
        for (const [wa, wb, wc] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]]) test(wa * rest[a] + wb * rest[b] + wc * rest[c], wa * rest[a + 1] + wb * rest[b + 1] + wc * rest[c + 1], wa * rest[a + 2] + wb * rest[b + 2] + wc * rest[c + 2]);
      }
      expect(out.places, kind).toBeGreaterThan(300);
      // (the outside of a strap and the armhole are one line in both; inside a strap a neck opening's own differences)
      expect(out.line / MM, `${kind} on the line`).toBeLessThan(BAR[kind][0]);
      expect(out.band / MM, `${kind} a band in`).toBeLessThan(BAR[kind][1]);
    }
  });

  it('a strap is its number wide over her shoulder, in her front\'s drawing and her back\'s', () => {
    for (const kind of KINDS.filter((k) => k !== 'mockNeck')) {
      const O = outlineOn(kind).spec.outline!, cut = outlineOn(kind);
      for (const side of [1, -1] as const) for (const up of [0.002, 0.01, 0.02]) {
        // walk out along a level line just over her ridge: the garment from where the drawing turns + to where it turns -
        let inner = NaN, outer = NaN, prev = drawingAt(cut, frame.mid + O.strapIn - 0.015, ridgeAt(frame, O.strapIn) + up, side);
        for (let x = O.strapIn - 0.015; x < O.strapOut + 0.015; x += 0.0001) {
          const d = drawingAt(cut, frame.mid + x, ridgeAt(frame, O.strapIn) + up, side);
          if (prev < 0 && d >= 0) inner = x; if (prev >= 0 && d < 0) outer = x;
          prev = d;
        }
        expect(inner, `${kind} ${side} ${up}`).toBeCloseTo(O.strapIn, 3);
        expect(outer, `${kind} ${side} ${up}`).toBeCloseTo(O.strapOut, 3);
      }
    }
  });

  it('MEASURED: keeps every armhole on her trunk\'s skin, off the row that joins her arm\'s', () => {
    // her trunk's points that share a triangle with her arm's: every one of them in the armhole, 5 mm or more from its line
    const row = new Set<number>();
    for (let k = 0; k + 2 < index.length; k += 3) {
      const v = [index[k], index[k + 1], index[k + 2]], a = v.map((i) => arm[i] > 0.5);
      if (a.some(Boolean) && !a.every(Boolean)) for (const i of v) if (!(arm[i] > 0.5)) row.add(i);
    }
    expect(row.size).toBeGreaterThan(50);
    for (const kind of KINDS) {
      const cut = outlineOn(kind);
      let worst = -Infinity;
      for (const v of row) worst = Math.max(worst, cutAt(cut, rest[v * 3], rest[v * 3 + 1], rest[v * 3 + 2], 0));
      expect(worst / MM, kind).toBeLessThan(-5);
      // and her arm's skin is bare
      for (let v = 0; v < arm.length; v += 7) if (arm[v] > 0.5) expect(cutAt(cut, rest[v * 3], rest[v * 3 + 1], rest[v * 3 + 2], 1)).toBeLessThan(0);
    }
  });

  it('each one\'s outline: the tank\'s back higher than its front, the bra\'s racer, the camisole level, the mock neck up her neck', () => {
    const tank = outlineOn('tank'), O = tank.spec.outline!;
    expect(O.backY).toBeGreaterThan(tank.spec.dipY);
    // her back's middle is in the garment between the bra's neck and its band, and bare beside the panel at her shoulder blades
    const bra = outlineOn('sportsBra'), B = bra.spec.outline!, y = (B.racerY + frame.neckY - 0.06) / 2;
    expect(drawingAt(bra, frame.mid, y, -1)).toBeGreaterThan(0);
    expect(drawingAt(bra, frame.mid + 0.07, B.racerY, -1)).toBeLessThan(0);
    expect(drawingAt(bra, frame.mid + 0.07, B.racerY, 1)).toBeGreaterThan(0);
    // the camisole: its edge at one height front and back, `sag` lower at her middle
    const cami = outlineOn('camisole'), path = outlinePath(cami.spec, frame, true), mid = path.reduce((m, p) => (Math.abs(p[0] - frame.mid) < Math.abs(m[0] - frame.mid) ? p : m));
    expect(mid[1]).toBeCloseTo(cami.spec.dipY - TOP_OUTLINES.camisole.sag, 6);
    const backPath = outlinePath(cami.spec, frame, false), inner = (q: readonly (readonly [number, number])[]) => q.filter((p) => Math.abs(p[0] - frame.mid) <= TOP_OUTLINES.camisole.strapIn + 1e-9);
    expect(inner(backPath)).toEqual(inner(path));
    // the mock neck: its front's middle covered up to its collar, bare over it
    const mock = outlineOn('mockNeck'), C = mock.spec.outline!.collarY;
    expect(drawingAt(mock, frame.mid, C - 0.01, 1)).toBeGreaterThan(0.009);
    expect(drawingAt(mock, frame.mid, C + 0.01, 1)).toBeLessThan(-0.009);
    // and a band at a bra's hem
    expect(bra.spec.bands.hem).toBeCloseTo(0.035, 9);
    const e = cutEdgeAt(bra, frame.mid, bra.spec.hemY + 0.01, 0.2, 0);
    expect(e.edge).toBe(2); expect(e.distance).toBeCloseTo(0.01, 6);
  });

  it('MEASURED: under her arm the blended edge is one smooth line down her side, from the front\'s foot to the back\'s', () => {
    // her left side seen square on from her left, her arm's skin left out: for each 1 mm of depth the outermost skin of
    // her trunk at each height, and up it from under the feet the first place `cutAt` (the two drawings blended by
    // depth, as the shader blends them) calls bare -- the edge as it lies on her side -- then that line in 3 mm steps
    const cell = 0.001, z0 = -0.2, y0 = frame.neckY - 0.25, nz = 400, ny = 250, X = new Float32Array(nz * ny).fill(-1);
    for (let k = 0; k + 2 < index.length; k += 3) {
      const v = [index[k], index[k + 1], index[k + 2]];
      if (v.some((i) => arm[i] > 0.5 || rest[i * 3] < 0.05)) continue;
      const p = v.map((i) => [rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]]), us = p.map((q) => (q[2] - z0) / cell), vs = p.map((q) => (q[1] - y0) / cell);
      const den = (vs[1] - vs[2]) * (us[0] - us[2]) + (us[2] - us[1]) * (vs[0] - vs[2]);
      if (Math.abs(den) < 1e-9) continue;
      for (let j = Math.max(0, Math.floor(Math.min(...vs))); j <= Math.min(ny - 1, Math.ceil(Math.max(...vs))); j++) for (let i = Math.max(0, Math.floor(Math.min(...us))); i <= Math.min(nz - 1, Math.ceil(Math.max(...us))); i++) {
        const w0 = ((vs[1] - vs[2]) * (i - us[2]) + (us[2] - us[1]) * (j - vs[2])) / den, w1 = ((vs[2] - vs[0]) * (i - us[2]) + (us[0] - us[2]) * (j - vs[2])) / den, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const x = w0 * p[0][0] + w1 * p[1][0] + w2 * p[2][0];
        if (x > X[j * nz + i]) X[j * nz + i] = x;
      }
    }
    const worst: Record<string, number> = {};
    for (const kind of KINDS) {
      const cut = outlineOn(kind), edge: [number, number][] = [];
      for (let i = 0; i < nz; i++) for (let j = 1; j < ny; j++) {
        const x = X[j * nz + i], z = z0 + i * cell;
        if (x < 0.1 || !(cutAt(cut, x, y0 + j * cell, z, 0) < 0)) continue;
        let lo = y0 + (j - 1) * cell, hi = y0 + j * cell;
        for (let it = 0; it < 20; it++) { const m = (lo + hi) / 2; if (cutAt(cut, x, m, z, 0) < 0) hi = m; else lo = m; }
        edge.push([z, hi]); break;
      }
      const p = [edge[0]];
      for (const q of edge) if (Math.hypot(q[0] - p[p.length - 1][0], q[1] - p[p.length - 1][1]) >= 0.003) p.push(q);
      let most = 0;
      for (let k = 1; k + 1 < p.length; k++) {
        const ax = p[k][0] - p[k - 1][0], ay = p[k][1] - p[k - 1][1], bx = p[k + 1][0] - p[k][0], by = p[k + 1][1] - p[k][1];
        most = Math.max(most, (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by))))) * 180) / Math.PI);
      }
      worst[kind] = +most.toFixed(1);
      // it runs from the front's foot in front to the back's behind
      expect(edge.length, kind).toBeGreaterThan(200);
      expect(Math.abs(edge[edge.length - 1][1] - cut.spec.outline!.frontY), kind).toBeLessThan(0.01);
      expect(edge.some((q) => Math.abs(q[1] - cut.spec.outline!.armY) < 0.006), kind).toBe(true);
    }
    // MEASURED 2026-11-14, the front's foot 12.8 cm under her neck joint and the back's 18.3: tank 16.0, sports bra 26.8,
    // camisole 22.7, mock neck 26.6 degrees in 3 mm at the most (the front's foot 13.5 cm under: 28.6, 26.8, 17.1, 23.3)
    for (const kind of KINDS) expect(worst[kind], kind).toBeLessThan(30);
  });

  it('the paths have no corner: over any 3 mm of them they turn no more than a smooth curve does', () => {
    // (the tightest turn drawn is a camisole's, 8.4 mm round, where its top edge leaves the strap: about 20 degrees in 3 mm,
    // the 3 mm steps taken a point late up to 27; a corner would be 90)
    // (in the air above her shoulders, where the strap is carried up, its corners lie over the ceiling's band and touch no skin)
    for (const kind of KINDS) for (const front of [true, false]) {
      const all = outlinePath(outlineOn(kind).spec, frame, front), p = [all[0]];
      for (const q of all) if (Math.hypot(q[0] - p[p.length - 1][0], q[1] - p[p.length - 1][1]) >= 0.003) p.push(q);
      for (let k = 1; k + 1 < p.length; k++) {
        if (p[k][1] > frame.neckY + 0.07) continue;
        const ax = p[k][0] - p[k - 1][0], ay = p[k][1] - p[k - 1][1], bx = p[k + 1][0] - p[k][0], by = p[k + 1][1] - p[k][1];
        const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
        if (la < 1e-9 || lb < 1e-9) continue;
        const turn = (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) * 180) / Math.PI;
        expect(turn, `${kind} ${front ? 'front' : 'back'} at ${k}`).toBeLessThan(30);
      }
    }
  });
});

describe('the outline tops\' templates', () => {
  const map = { region: new Uint8Array(0), arm: new Float32Array(0), rest: null, trunkLength: 0.5, neckRadius: 0.05, facing: 1 } as unknown as BodyMap;
  const frame = topFrame({ rest: [0, 0.7, 0.1, 0, 1.45, 0.1, 0.2, 1.4, 0.1, 0, 0.7, -0.1, 0, 1.45, -0.1, 0.2, 1.4, -0.1], index: [0, 1, 2, 3, 4, 5], unitsPerMetre: 1, joints: { neck: [0, 1.4, 0], hipL: [0.1, 0.9, 0], hipR: [-0.1, 0.9, 0], shoulderL: [0.15, 1.36, 0], elbowL: [0.3, 1.15, 0], wristL: [0.45, 0.96, 0], shoulderR: [-0.15, 1.36, 0], elbowR: [-0.3, 1.15, 0], wristR: [-0.45, 0.96, 0] } });
  it('are drawn: tank, sports bra, camisole, mock neck and crop tee; crop and bandeau are as they were', () => {
    for (const id of ['tank', 'sportsBra', 'camisole', 'mockNeck', 'cropTee']) expect(isCutTop(t(id)), id).toBe(true);
    for (const id of ['crop', 'bandeau']) { expect(isCutTop(t(id)), id).toBe(false); expect(t(id).top, id).toBeUndefined(); }
    expect(templateCut(map, t('cropTee'), frame)!.spec.outline).toBeUndefined();
    expect(templateCut(map, t('cropTee'), frame)!.spec.hemY).toBeCloseTo(0.9 + 0.32 * 0.5, 9);
    expect(templateCut(map, t('sportsBra'), frame)!.spec.hemY).toBeCloseTo(0.9 + 0.56 * 0.5, 9);
    expect(templateCut(map, t('camisole'), frame)!.spec.outline!.kind).toBe('camisole');
    // sleeveless
    for (const id of ['tank', 'sportsBra', 'camisole', 'mockNeck']) expect(templateCut(map, t(id), frame)!.spec.sleeve).toBeLessThan(0);
  });
  it('offer NECKLINE (a camisole\'s top edge), SLEEVE on the crop tee and its HEM; no SLEEVE on a sleeveless outline', () => {
    expect(dialsFor(t('tank'))).toEqual(['neck']);
    expect(dialsFor(t('camisole'))).toEqual(['neck']);
    expect(dialsFor(t('mockNeck'))).toEqual([]);
    expect(dialsFor(t('sportsBra'))).toEqual(['hem', 'neck']);
    expect(dialsFor(t('cropTee'))).toEqual(['hem', 'neck', 'sleeve']);
    expect(t('tank').neckFront).toBe(OUTLINE_NECK.tank);
  });
  it('a tank or sports bra saved before today opens drawn, with all the numbers it was saved with', () => {
    // as v0.9.26 saved them: no `top`, their old strap numbers, a tank's NECKLINE moved to 78%
    const oldTank = { ...t('tank'), neckFront: 0.78, top: undefined } as CoverageParams, oldBra = { ...t('sportsBra'), band: undefined, top: undefined } as CoverageParams;
    delete (oldTank as { top?: unknown }).top; delete (oldBra as { top?: unknown; band?: unknown }).top; delete (oldBra as { band?: unknown }).band;
    const tank = wornParams('tank', oldTank), bra = wornParams('sportsBra', oldBra);
    expect(tank.top).toBe('tank'); expect(tank.neckFront).toBe(0.78); expect(tank.strap).toBe(0.55);
    const cut = templateCut(map, tank, frame)!;
    expect(cut.spec.outline!.kind).toBe('tank');
    expect(cut.spec.dipY).toBeCloseTo(Math.min(0.9 + 0.78 * 0.5, ridgeAt(frame, TOP_OUTLINES.tank.strapIn) - 0.004), 9);
    expect(bra.top).toBe('sportsBra'); expect(bra.band).toEqual({ hem: 0.035 });
    expect(templateCut(map, bra, frame)!.spec.outline!.back).toBe('racer');
  });
});

/** Both drawings' bits as one number. */
function checksum(c: TopCut): number {
  let h = 0;
  for (const a of [c.front, c.back]) { const u = new Uint32Array(a.buffer, a.byteOffset, a.length); for (let i = 0; i < u.length; i++) h = (Math.imul(h, 31) + u[i]) >>> 0; }
  return h;
}
const OLD_SUMS: Record<NeckStyle, number> = { crew: 2130584800, u: 3189439200, v: 436907168, scoop: 530353056, square: 2856051008 };
/** MEASURED 2026-11-14 (mm): the two drawings over her shoulders, on the line and a band's width in, with a little room. */
// (MEASURED 2026-11-14, within an outline's own blend, 4 cm either side of her middle depth: tank 2.73 and 2.77, sports
// bra 3.90 and 3.92 -- its racer's straps among them -- camisole 0.00, mock neck 2.90 and 2.68; a tee's, within 6 mm,
// 1.1 to 2.5. Over her shoulder the two are one line; under the ridge the front's armhole leans out and the back's
// comes in, and 4 cm of depth reaches that far)
const BAR: Record<TopOutlineKind, readonly [number, number]> = { tank: [3.1, 3.1], sportsBra: [4.3, 4.3], camisole: [0.1, 0.1], mockNeck: [3.3, 3.1] };
