/**
 * A DRAWN TOP'S OUTLINE (`src/sarahlab/topCut.ts` `TOP_OUTLINES`, `outlinePath`; Joshua, 2026-11-14: "finish all 10
 * remaining shirt tops", his sheet's 06 tank, 07 sports bra, 11 mock neck, 13 camisole and 14 boxy crop tee), on her own
 * rest skin (the room's body file):
 * - every neck opening drawn before is drawn bit for bit as it was (a checksum of both drawings, taken on the code before);
 * - over her shoulders the two drawings agree, as they do for a neck opening;
 * - a strap is its number wide over her shoulder, in both drawings;
 * - every armhole keeps off the row of her triangles that joins her arm's skin to her trunk's;
 * - an armhole's side profile is his line (`ARMSCYES`): one C seen from her side, and on her skin one line from the strap
 *   round the side of her bust to under her arm, seen from her front, her three-quarter and her side;
 * - the templates: which are drawn, their dials, and a look saved before today still opens.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  ARMSCYE, ARMSCYES, BANDEAU, CAMI_FALL, NECK_STYLES, TOP_OUTLINES, armscyeAt, bandeauHeight, bandeauPath, armscyeGate, armscyePath, cutAt, cutEdgeAt, isCutTop, midDepthAt, neckDefault, outlinePath, ridgeAt, smoothMax, topCut, topCutSpec, topFrame,
  type NeckStyle, type TopCut, type TopFrame, type TopOutlineKind,
} from '../src/sarahlab/topCut';
import { loadBody } from '../scripts/preview/body.mjs';
import { COVERAGE_TEMPLATES, OUTLINE_NECK, dialsFor, templateCut, withDial, wornParams, type CoverageParams } from '../src/sarahlab/paintTemplates';
import { readBody } from '../scripts/sarahV2SideLock.mjs';
import { seamDepth, type BodyMap } from '../src/sarahlab/bodyRegions';
import { loadHerBody } from './herBodyMap';

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

  it('MEASURED: under her arm the edge is one smooth line along her side, from the back\'s foot to the armscye\'s and up it', () => {
    // her left side seen square on from her left, her arm's skin left out: for each 1 mm of depth the outermost skin of
    // her trunk at each height, and up it from under the feet the first place `cutAt` (the drawings as the shader reads
    // them) calls bare -- the armhole's lower edge as it lies on her side -- then that line in 3 mm steps
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
        // (her SIDE: from 14 cm behind her rest frame's z = 0 forward. Behind that is her back, where the armhole runs in
        // toward her spine -- a racer's panel leaves her bare from there out -- and the lowest bare skin at a depth is
        // not the armhole's lower edge)
        if (x < 0.1 || z < -0.14 || !(cutAt(cut, x, y0 + j * cell, z, 0) < 0)) continue;
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
      // it runs from the back's foot behind, level under her arm at the armscye's foot, and up the armscye's front to
      // its most forward point: its front end is there, well over the feet
      // (MEASURED 2026-11-15: 123 mm of depth, the mock neck's, to 159, the camisole's)
      expect(edge.length, kind).toBeGreaterThan(110);
      const C = ARMSCYES[kind], fore = C.reduce((m, q) => (q[0] > m[0] ? q : m)), foot = C[C.length - 1][1];
      expect(Math.abs(edge[edge.length - 1][1] - (frame.neckY - fore[1])), kind).toBeLessThan(0.02);
      expect(edge.some((q) => Math.abs(q[1] - cut.spec.outline!.armY) < 0.006), kind).toBe(true);
      // (under her arm, 4 to 7 cm behind her rest frame's z = 0, it is level at the armscye's foot)
      for (const q of edge) if (q[0] > -0.07 && q[0] < -0.04 - (kind === 'mockNeck' ? 0.02 : 0)) expect(Math.abs(q[1] - (frame.neckY - foot)), `${kind} at z ${q[0]}`).toBeLessThan(0.012);
    }
    // MEASURED 2026-11-15, each outline's own armscye (`ARMSCYES`) over a front limit and the back's foot 18.3 cm under
    // her neck joint: tank 14.7, sports bra 10.6, camisole 7.9, mock neck 7.7 degrees in 3 mm at the most.
    // (2026-11-14, the front one sweep of 6 cm to a foot 14 cm under, her back's skin among it: 29.3, 26.8, 23.1, 23.4)
    for (const kind of KINDS) expect(worst[kind], kind).toBeLessThan(20);
  });

  it('an armscye is his line: ONE C seen from her side, forward to one place and back from it, level at its foot', () => {
    // (Joshua, 2026-11-14, his green line over each outline's picture from her side: "Update to the side profile… make it
    // smoother…"; "basically, the side cutout profile matches the side profile of the breasts")
    for (const kind of KINDS) {
      const C = ARMSCYES[kind], k = C.reduce((m, q, i) => (q[0] > C[m][0] ? i : m), 0);
      // forward all the way down to its most forward point, and back all the way from it: one bulge, no second
      for (let i = 1; i <= k; i++) { expect(C[i][0], `${kind} ${i}`).toBeGreaterThanOrEqual(C[i - 1][0]); expect(C[i][1], `${kind} ${i}`).toBeGreaterThanOrEqual(C[i - 1][1]); }
      for (let i = k + 1; i < C.length; i++) { expect(C[i][0], `${kind} ${i}`).toBeLessThanOrEqual(C[i - 1][0]); expect(C[i][1], `${kind} ${i}`).toBeGreaterThanOrEqual(C[i - 1][1]); }
      // most forward beside her bust (9.5 to 13.5 cm under her neck joint), level at its foot under her arm
      expect(C[k][1], kind).toBeGreaterThan(0.095); expect(C[k][1], kind).toBeLessThan(0.135);
      expect(C[C.length - 1][1], kind).toBe(C[C.length - 2][1]);
      expect(C[C.length - 1][1], kind).toBeCloseTo(0.179, 9);
      // the line drawn through them turns smoothly: in 3 mm no more than a curve 1.2 cm round does, and never back on itself
      const path = armscyePath(frame, C), p = [path[1]];
      for (const q of path.slice(1, -1)) if (Math.hypot(q[0] - p[p.length - 1][0], q[1] - p[p.length - 1][1]) >= 0.003) p.push(q);
      let most = 0;
      for (let i = 1; i + 1 < p.length; i++) {
        const ax = p[i][0] - p[i - 1][0], ay = p[i][1] - p[i - 1][1], bx = p[i + 1][0] - p[i][0], by = p[i + 1][1] - p[i][1];
        most = Math.max(most, (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by))))) * 180) / Math.PI);
      }
      // (MEASURED 2026-11-15: tank 13.9, sports bra 13.5, mock neck 9.0; a camisole's 15.2, where it turns out of the
      // line down from over its strap into its bodice's edge, at its peak)
      expect(most, kind).toBeLessThan(kind === 'camisole' ? 18 : 15);
      // it is carried by her frame: hung from her shoulder joints' depth and her neck joint's height
      const cut = outlineOn(kind), S = cut.spec.outline!.side;
      expect(S.z0).toBeCloseTo((frame.arms[0].from[2] + frame.arms[1].from[2]) / 2, 12);
      expect(S.curve).toBe(C);
    }
    // each is his own line for that top: the mock neck's keeps closest to her arm, the camisole's stands furthest forward
    const forward = (kind: TopOutlineKind) => Math.max(...ARMSCYES[kind].map((q) => q[0]));
    expect(forward('mockNeck')).toBeLessThan(forward('sportsBra') - 0.015);
    expect(forward('sportsBra')).toBeLessThan(forward('tank'));
    expect(forward('tank')).toBeLessThan(forward('camisole'));
  });

  it('MEASURED: on her skin an armhole is ONE LINE from the strap round the side of her bust, seen from her front, her three-quarter and her side', () => {
    // the edge by height: each level slice of her trunk's skin (her left side, her arm's left out), walked a quarter
    // millimetre at a time, and where `cutAt` turns from cloth to bare furthest out on her front
    const slice = (y: number) => {
      const segs: number[][] = [];
      for (let k = 0; k + 2 < index.length; k += 3) {
        const v = [index[k], index[k + 1], index[k + 2]];
        if (v.some((i) => arm[i] > 0.5 || rest[i * 3] - frame.mid < 0.08 || rest[i * 3 + 2] < -0.1)) continue;
        const pts: number[][] = [];
        for (let e = 0; e < 3; e++) { const a = v[e], b = v[(e + 1) % 3], ya = rest[a * 3 + 1], yb = rest[b * 3 + 1]; if ((ya - y) * (yb - y) < 0) { const f = (y - ya) / (yb - ya); pts.push([rest[a * 3] + (rest[b * 3] - rest[a * 3]) * f, rest[a * 3 + 2] + (rest[b * 3 + 2] - rest[a * 3 + 2]) * f]); } }
        if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      }
      return segs;
    };
    const heights: number[] = [];
    for (let d = 0.02; d <= 0.1501; d += 0.0025) heights.push(d);
    const slices = heights.map((d) => slice(frame.neckY - d));
    for (const kind of KINDS) {
      const cut = outlineOn(kind), O = cut.spec.outline!, line: number[][] = [];
      heights.forEach((d, h) => {
        const y = frame.neckY - d;
        let best: number[] | null = null;
        for (const [ax, az, bx, bz] of slices[h]) {
          const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.00025));
          let px = ax, pz = az, pd = cutAt(cut, ax, y, az, 0);
          for (let k = 1; k <= n; k++) {
            const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n, dd = cutAt(cut, x, y, z, 0);
            if ((pd > 0) !== (dd > 0)) { const f = pd / (pd - dd), cx = px + (x - px) * f, cz = pz + (z - pz) * f; if (cx - frame.mid > 0.094 && cz > midDepthAt(frame, cx, y) - 0.005 && (!best || cx > best[0])) best = [cx, cz]; }
            px = x; pz = z; pd = dd;
          }
        }
        if (best) line.push([d, best[0] - frame.mid, best[1]]);
      });
      expect(line.length, kind).toBeGreaterThan(heights.length - 3);
      // SEEN FROM HER SIDE it goes forward all the way down to its most forward point and back from there: one C. (With
      // one C begun behind her skin under a limit 11.3 cm out, 2026-11-14, it ran up the first of her bust and turned)
      const k = line.reduce((m, q, i) => (q[2] > line[m][2] ? i : m), 0);
      for (let i = 1; i <= k; i++) expect(line[i][2] - line[i - 1][2], `${kind} from her side at ${(line[i][0] * 100).toFixed(2)} cm under`).toBeGreaterThan(-0.0003);
      for (let i = k + 1; i < line.length; i++) expect(line[i][2] - line[i - 1][2], `${kind} from her side at ${(line[i][0] * 100).toFixed(2)} cm under`).toBeLessThan(0.0003);
      // SEEN FROM HER FRONT it runs down her from the strap, never back toward her middle by more than half a millimetre,
      // out round the side of her bust
      for (let i = 1; i < line.length && line[i][0] < 0.135; i++) expect(line[i][1] - line[i - 1][1], `${kind} from her front at ${(line[i][0] * 100).toFixed(2)} cm under`).toBeGreaterThan(-0.0005);
      expect(Math.max(...line.map((q) => q[1])), kind).toBeGreaterThan(0.125);
      // it leaves the strap where the strap's outer edge is: within 3 mm of her front's limit down to 4.5 cm under her
      // neck joint (a camisole's and a tank's the strap's own edge; a sports bra's and a mock neck's on their way to it)
      const lo = Math.min(O.strapOut, O.limit), hi = Math.max(O.strapOut, O.limit);
      for (const q of line) if (q[0] < 0.045) { expect(q[1], `${kind} at ${q[0]}`).toBeGreaterThan(lo - 0.0005); expect(q[1], `${kind} at ${q[0]}`).toBeLessThan(hi + 0.003); }
      // and it turns smoothly in each view: over 4 mm of it, measured along it
      const turns = ([['front', (q: number[]) => [q[1], -q[0]]], ['threeQuarter', (q: number[]) => [0.766 * q[1] - 0.643 * q[2], -q[0]]], ['side', (q: number[]) => [q[2], -q[0]]]] as const).map(([name, view]) => {
        const pts = line.map(view), R: number[][] = [pts[0]];
        let carry = 0;
        for (let i = 1; i < pts.length; i++) { let a = pts[i - 1]; const b = pts[i]; let l = Math.hypot(b[0] - a[0], b[1] - a[1]); while (carry + l >= 0.001) { const f = (0.001 - carry) / l; a = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; R.push(a); l = Math.hypot(b[0] - a[0], b[1] - a[1]); carry = 0; } carry += l; }
        let most = 0;
        for (let i = 4; i + 4 < R.length; i++) { const ux = R[i][0] - R[i - 4][0], uy = R[i][1] - R[i - 4][1], vx = R[i + 4][0] - R[i][0], vy = R[i + 4][1] - R[i][1]; most = Math.max(most, Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)) * 180 / Math.PI); }
        return [name, +most.toFixed(1)] as const;
      });
      // MEASURED 2026-11-15 (degrees in 4 mm at the most; front, three-quarter, side): tank 12.8, 15.3, 14.0 -- where her
      // bust begins under the strap's edge, her skin's own turn -- sports bra 14.4, 15.8, 13.8; mock neck 9.1, 8.0, 7.5;
      // camisole 21.6, 24.7 (its peak, where its edge leaves the strap) and 17.7. A corner is 90.
      for (const [name, most] of turns) expect(most, `${kind} from her ${name}`).toBeLessThan(kind === 'camisole' ? 30 : 20);
    }
  }, 120_000);

  it('the armscye comes in before her front\'s limit: no band is drawn along the limit where the armscye covers her past it', () => {
    for (const kind of KINDS) {
      const cut = outlineOn(kind), O = cut.spec.outline!, S = O.side, B = cut.spec.bands.neck, f = ARMSCYE.feather;
      // in by more than a bound edge is wide before the limit, and (but a camisole's, whose strap is narrower than its
      // bound edge) not until a bound edge's width past the strap's inner edge
      expect(S.gate).toBe(armscyeGate(O.strapOut, B, O.limit, 1));
      expect(S.gate + f).toBeLessThanOrEqual(O.limit - B - 0.003);
      expect(S.gate).toBeLessThanOrEqual(O.strapOut);
      if (kind !== 'camisole' && kind !== 'mockNeck') expect(S.gate - f).toBeGreaterThanOrEqual(O.strapIn + B + 0.002);
      // on her skin: 1 to 9 mm inside the limit, beside her bust (12 to 14 cm under her neck joint), she is covered and
      // further inside the cut than a band is wide. (MEASURED 2026-11-14 with the armscye in at the tank's strap's
      // outer edge and its limit 11.3 cm out: 9 to 10 mm, a line of the band's shade down the front of each breast)
      for (const under of [0.12, 0.13, 0.14]) for (const inside of [0.001, 0.005, 0.009]) for (const side of [1, -1]) {
        const x = frame.mid + side * (O.limit - inside), y = frame.neckY - under;
        let z = -Infinity;
        for (let k = 0; k + 2 < index.length; k += 3) {
          const a = index[k] * 3, b = index[k + 1] * 3, c = index[k + 2] * 3, den = (rest[b + 1] - rest[c + 1]) * (rest[a] - rest[c]) + (rest[c] - rest[b]) * (rest[a + 1] - rest[c + 1]);
          if (Math.abs(den) < 1e-14) continue;
          const w0 = ((rest[b + 1] - rest[c + 1]) * (x - rest[c]) + (rest[c] - rest[b]) * (y - rest[c + 1])) / den, w1 = ((rest[c + 1] - rest[a + 1]) * (x - rest[c]) + (rest[a] - rest[c]) * (y - rest[c + 1])) / den, w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          z = Math.max(z, w0 * rest[a + 2] + w1 * rest[b + 2] + w2 * rest[c + 2]);
        }
        expect(z, `${kind} skin`).toBeGreaterThan(0);
        expect(cutEdgeAt(cut, x, y, z, 0).distance, `${kind} ${under} ${inside} ${side}`).toBeGreaterThan(B + 0.002);
      }
    }
  });

  it('where two drawings\' edges cross, the corner between them is rounded, and nothing else is moved', () => {
    const k = 0.005;
    // far from one another: the larger, exactly
    expect(smoothMax(0.02, -0.01, k)).toBe(0.02);
    expect(smoothMax(-0.03, 0.004, k)).toBe(0.004);
    expect(smoothMax(0.001, 0.001 + k, k)).toBe(0.001 + k);
    // at the corner itself, a quarter of the rounding more; and the same either way round
    expect(smoothMax(0, 0, k)).toBeCloseTo(k / 4, 12);
    expect(smoothMax(0.001, -0.002, k)).toBe(smoothMax(-0.002, 0.001, k));
    // never less than the larger: what either drawing covers is covered
    for (const [a, b] of [[0.003, 0.004], [-0.002, -0.001], [-0.0005, 0.0004], [0.01, 0.0099]]) expect(smoothMax(a, b, k)).toBeGreaterThanOrEqual(Math.max(a, b));
    // a top without an armscye has no say of her side's at all
    const tee = topCut(topCutSpec({ neckFront: neckDefault('crew', frame), neckStyle: 'crew', sleeve: 0.32 }, frame, -0.06), frame);
    expect(tee.side ?? null).toBeNull();
    expect(armscyeAt(tee, frame.mid + 0.13, frame.neckY - 0.12, 0)).toBeNull();
    // an outline's: nothing nearer her middle than it comes in at; in front of the C covered, behind it the opening
    const tank = outlineOn('tank'), S = tank.spec.outline!.side, range = 0.03;
    expect(armscyeAt(tank, frame.mid + S.gate - 0.003, frame.neckY - 0.12, 0.05)).toBe(-range);
    expect(armscyeAt(tank, frame.mid + 0.13, frame.neckY - 0.12, 0.04)!).toBeGreaterThan(0.02);
    expect(armscyeAt(tank, frame.mid + 0.13, frame.neckY - 0.12, -0.05)!).toBeLessThan(-0.02);
    expect(armscyeAt(tank, frame.mid - 0.13, frame.neckY - 0.12, 0.04)!).toBeGreaterThan(0.02);
    // and under its foot covered, all the way back
    expect(armscyeAt(tank, frame.mid + 0.125, frame.neckY - 0.2, -0.12)!).toBeGreaterThan(0.015);
  });

  it('on her own skin, nothing of a sleeveless top is on the row of triangles that joins her arm to her trunk', async () => {
    // that row runs round her shoulder and through her armpit: outside every strap, and above every armhole's foot.
    // Each of its triangles sampled all over, its place and its share of her arm blended as the shader blends them.
    // (MEASURED 2026-11-15 in the room, the tank: a dotted hairline down the front of each shoulder along that row.
    // It was not this -- nothing here was ever covered -- but the edge's antialiasing, which the shader does and this
    // can not: `fabricMaterial.ts`, each edge by its own slope, `tests/topDetails.test.ts`)
    const body = await loadBody(), P = body.rest, A = body.armShare, I = body.index;
    const row: number[] = [];
    for (let t = 0; t + 2 < I.length; t += 3) { const s = [A[I[t]], A[I[t + 1]], A[I[t + 2]]]; if (Math.max(...s) >= 0.5 && Math.min(...s) < 0.5) row.push(t); }
    expect(row.length).toBeGreaterThan(200);
    const N = 12;
    for (const kind of ['tank', 'sportsBra', 'camisole', 'mockNeck'] as const) {
      const cut = outlineOn(kind);
      let covered = 0, deepest = 0, samples = 0;
      for (const t of row) {
        const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
        for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
          const u = i / N, v = j / N, w = 1 - u - v;
          const at = (k: number) => P[a * 3 + k] * u + P[b * 3 + k] * v + P[c * 3 + k] * w;
          const d = cutAt(cut, at(0), at(1), at(2), A[a] * u + A[b] * v + A[c] * w);
          samples++;
          if (d > 0) { covered++; deepest = Math.max(deepest, d); }
        }
      }
      expect(samples).toBeGreaterThan(10000);
      expect(covered, `${kind}: ${covered} of ${samples} samples covered, up to ${(deepest * 1000).toFixed(1)} mm inside`).toBe(0);
    }
  });

  it('a camisole\'s armscye begins at its peak, wherever its top edge is set', () => {
    for (const neckFront of [OUTLINE_NECK.camisole, OUTLINE_NECK.camisole - 0.04, OUTLINE_NECK.camisole - 0.08]) {
      const cut = topCut(topCutSpec({ ...t('camisole'), neckFront, top: 'camisole' }, frame, -0.06), frame), O = cut.spec.outline!, S = O.side;
      // the peak: `rise` over the top edge, where its strap's outer edge comes down to
      expect(S.startX).toBe(O.strapOut);
      expect(S.startY).toBeCloseTo(cut.spec.dipY + CAMI_FALL.rise, 9);
      expect(S.slope).toBe(CAMI_FALL.slope);
      // out from the strap, over the line its bodice falls away by, her side's drawing says nothing; under it, it speaks
      const out = O.strapOut + 0.012, lineY = S.startY - S.slope * 0.012;
      expect(armscyeAt(cut, frame.mid + out, lineY + 0.004, 0.06)).toBe(-0.03);
      expect(armscyeAt(cut, frame.mid + out, lineY - 0.004, 0.06)!).toBeGreaterThan(0.02);
    }
    // the others' have no such line
    for (const kind of KINDS.filter((x) => x !== 'camisole')) expect(outlineOn(kind).spec.outline!.side.startY).toBe(Infinity);
  });

  it('MEASURED: her areolas are covered by every outline, and her arm\'s skin is clear of it: the armhole goes between them', async () => {
    // her areolas by her skin's own picture: her chest's points redder than her chest (red less green, 0.03 over its median)
    const body = await loadBody(), P = body.rest, neckY = frame.neckY, col = (v: number) => body.skin!.texel(body.uv[v * 2], body.uv[v * 2 + 1]);
    const chest: number[] = [];
    for (let v = 0; v < P.length / 3; v++) if (!(body.armShare[v] > 0.5) && P[v * 3 + 1] > neckY - 0.2 && P[v * 3 + 1] < neckY - 0.06 && P[v * 3 + 2] > 0) chest.push(v);
    const rg = chest.map((v) => col(v)[0] - col(v)[1]).sort((a, b) => a - b), median = rg[rg.length >> 1];
    const areola = chest.filter((v) => col(v)[0] - col(v)[1] > median + 0.03);
    const out = areola.map((v) => Math.abs(P[v * 3])), under = areola.map((v) => neckY - P[v * 3 + 1]);
    // MEASURED 2026-11-14: 631 points, 8.3 to 12.1 cm out from her middle and 11.2 to 15.3 cm under her neck joint
    expect(areola.length).toBeGreaterThan(500);
    expect(Math.max(...out)).toBeLessThan(0.125);
    expect(Math.min(...out)).toBeGreaterThan(0.08);
    expect(Math.min(...under)).toBeGreaterThan(0.108);
    expect(Math.max(...under)).toBeLessThan(0.157);
    for (const kind of KINDS) {
      const cut = outlineOn(kind);
      // MEASURED 2026-11-15, each outline's own armscye: the least covered of them is 14.3 mm inside the line (the
      // camisole: under its top edge) and 15.5 the others'. (2026-11-14, the front one sweep: 6.1 and 5.9, at the upper
      // outer rim of her right one)
      expect(Math.min(...areola.map((v) => cutAt(cut, P[v * 3], P[v * 3 + 1], P[v * 3 + 2], 0))) / MM, kind).toBeGreaterThan(10);
    }
  }, 60_000);

  it('MEASURED: a bandeau covers her areolas and keeps off the row that joins her arm\'s skin to her trunk\'s', async () => {
    // on her as the room maps her (her points' places round her, her arm's skin by her bones, her side seam: what the panel
    // hands the frame). MEASURED 2026-11-23: her areolas 19.2 mm inside it; the row 10.1 mm outside, 18 cm under her neck
    // joint at the back of her armpit. (The painted line at her sides, 14.7 cm under, was inside that row by 26 mm: her
    // arm's skin bare beside cloth)
    const her = await loadHerBody(), m = her.map, J = m.joints!, U = her.unitsPerMetre, P = m.rest!, isArm = (v: number) => m.arm[v] === m.arm[v];
    const f = topFrame({ rest: P, index: her.index, unitsPerMetre: U, facing: m.facing, joints: { neck: J.neck, hipL: J.hipL, hipR: J.hipR, shoulderL: J.shoulderL, elbowL: J.elbowL, wristL: J.wristL, shoulderR: J.shoulderR, elbowR: J.elbowR, wristR: J.wristR }, sideSeam: seamDepth(m) });
    const cut = topCut(topCutSpec({ ...t('bandeau') }, f, 0.56), f), I = her.index;
    const row = new Set<number>();
    for (let k = 0; k + 2 < I.length; k += 3) { const v = [I[k], I[k + 1], I[k + 2]], a = v.map(isArm); if (a.some(Boolean) && !a.every(Boolean)) for (const i of v) if (!isArm(i)) row.add(i); }
    let worst = -Infinity;
    for (const v of row) worst = Math.max(worst, cutAt(cut, P[v * 3], P[v * 3 + 1], P[v * 3 + 2], 0));
    expect(worst / U / MM).toBeLessThan(-5);
    // her areolas by her skin's own picture (the same points of the same file, in metres there)
    const body = await loadBody(), col = (v: number) => body.skin!.texel(body.uv[v * 2], body.uv[v * 2 + 1]);
    expect(body.rest.length).toBe(P.length);
    const chest: number[] = [];
    for (let v = 0; v < P.length / 3; v++) if (!isArm(v) && P[v * 3 + 1] > f.neckY - 0.2 * U && P[v * 3 + 1] < f.neckY - 0.06 * U && P[v * 3 + 2] * m.facing > 0) chest.push(v);
    const rg = chest.map((v) => col(v)[0] - col(v)[1]).sort((a, b) => a - b), median = rg[rg.length >> 1];
    const areola = chest.filter((v) => col(v)[0] - col(v)[1] > median + 0.03);
    expect(areola.length).toBeGreaterThan(500);
    expect(Math.min(...areola.map((v) => cutAt(cut, P[v * 3], P[v * 3 + 1], P[v * 3 + 2], 0))) / U / MM).toBeGreaterThan(15);
    // its two drawings meet at her side seam
    expect(cut.frame.zMid[0]).toBeCloseTo(f.seamRow![0], 6);
  }, 60_000);

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
  it('are drawn: tank, sports bra, camisole, mock neck, crop tee, and since 2026-11-23 the crop top, the maternity tee and the bandeau', () => {
    for (const id of ['tank', 'sportsBra', 'camisole', 'mockNeck', 'cropTee', 'crop', 'maternity', 'bandeau']) expect(isCutTop(t(id)), id).toBe(true);
    // (the crop top and the maternity tee are tees whose hems are their own, each in the neck it was painted with)
    expect(templateCut(map, t('crop'), frame)!.spec.style).toBe('scoop');
    expect(templateCut(map, t('maternity'), frame)!.spec.style).toBe('square');
    expect(templateCut(map, t('crop'), frame)!.spec.hemY).toBeCloseTo(0.9 + 0.62 * 0.5, 9);
    expect(templateCut(map, t('cropTee'), frame)!.spec.outline).toBeUndefined();
    expect(templateCut(map, t('cropTee'), frame)!.spec.hemY).toBeCloseTo(0.9 + 0.32 * 0.5, 9);
    // (its own hem, `LINES.hemSportsBra`: a little under her bust's line, its band clear of its back armhole's foot)
    expect(templateCut(map, t('sportsBra'), frame)!.spec.hemY).toBeCloseTo(0.9 + 0.53 * 0.5, 9);
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
    expect(dialsFor(t('maternity'))).toEqual(['hem', 'neck', 'sleeve']);
    // (strapless: its TOP EDGE and its HEM, no SLEEVE)
    expect(dialsFor(t('bandeau'))).toEqual(['hem', 'neck']);
    expect(t('tank').neckFront).toBe(OUTLINE_NECK.tank);
  });
  it('a bandeau: its top edge straight across her front, down round her bust to under her arms, level behind; its own hem', () => {
    const cut = templateCut(map, t('bandeau'), frame)!, B = cut.spec.bandeau!;
    expect(cut.spec.outline).toBeUndefined();
    expect(cut.spec.sleeve).toBeLessThan(0);
    // (his numbers: its top edge 0.82 over her front; at her sides and behind, no higher than under her arm)
    expect(B.front).toBeCloseTo(0.9 + 0.82 * 0.5, 9);
    expect(B.side).toBeCloseTo(Math.min(0.9 + 0.72 * 0.5, frame.neckY - BANDEAU.underArm), 9);
    expect(cut.spec.hemY).toBeCloseTo(0.9 + 0.56 * 0.5, 9);
    const y = (path: readonly (readonly [number, number])[], x: number) => { for (let k = 0; k + 1 < path.length; k++) { const [ax, ay] = path[k], [bx, by] = path[k + 1]; if (x >= ax && x <= bx && bx > ax) return ay + ((by - ay) * (x - ax)) / (bx - ax); } return NaN; };
    const front = bandeauPath(cut.spec, frame, true), back = bandeauPath(cut.spec, frame, false);
    // (a frame with no places round her, a sketch's: level over her middle, down to her sides' height further out)
    for (const x of [0, 0.05, -0.06]) expect(y(front, frame.mid + x), `front ${x}`).toBeCloseTo(B.front, 6);
    for (const x of [BANDEAU.out + 0.02, -BANDEAU.out - 0.05]) expect(y(front, frame.mid + x), `front ${x}`).toBeCloseTo(B.side, 6);
    for (const x of [0, 0.12, -0.2]) expect(y(back, frame.mid + x), `back ${x}`).toBeCloseTo(B.side, 9);
    // its line round her: his front's height round her front, her sides' at her sides, smooth between
    expect(bandeauHeight(1.3, 1.2, 0.9)).toBe(1.3); expect(bandeauHeight(1.3, 1.2, 0.5)).toBe(1.2); expect(bandeauHeight(1.3, 1.2, 0.2)).toBe(1.2);
    expect(bandeauHeight(1.3, 1.2, 0.6)).toBeCloseTo(1.25, 9);
    // its NECKLINE / TOP EDGE moves its front
    const lower = templateCut(map, withDial(t('bandeau'), 'neck', 0.78), frame)!.spec.bandeau!;
    expect(lower.front).toBeCloseTo(0.9 + 0.78 * 0.5, 9);
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
