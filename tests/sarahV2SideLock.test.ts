/**
 * HER SIDES HOLD STILL UNDER HER ARMS (`scripts/sarahV2SideLock.mjs`; Joshua, 2026-11-12: "do a test around the underarms
 * and make sure we can lock the skin from stretching especially if trying to paint", and of the ways shown him, "I'd do
 * A").
 *
 * - The rule itself, on numbers small enough to check by hand: the bytes, a shape's numbers, her seams welded, her arms
 *   told from her trunk on a paper doll, a worn point's nearest skin.
 * - THE ROOM'S BODY FILE IS THE APPROVED FILE WITH THE RULE LAID ON IT. Her skin's weights and her two raised-arm shapes,
 *   and those of every part of the bikini in the file, are exactly what the rule makes of the approved archive's numbers
 *   -- so nothing else of them differs from what he approved -- and the lock reached what the bake reported.
 * - What the lock promises of her: none of her arm's share on her trunk from 2 cm under her armpit down; her arms, her
 *   shoulders and everything above her armpits as approved; every vertex's bytes still a whole.
 * - The KTX2 twin carries the same numbers, and a locked file is refused a second lock.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MIDLINE_X_M, SIDE_LOCK, SIDE_LOCK_FILES, SIDE_LOCK_NOTE, evenOver, fadeOf, fadeOfPart, lockShape, lockWeights, planSideLock, readBody, roundEven, sideLock,
  sideRegions, smoothstep, weld, type Body,
} from '../scripts/sarahV2SideLock.mjs';

describe('side lock: the rule', () => {
  it('rounds a half to the even number, either side of zero', () => {
    expect([0.5, 1.5, 2.5, 3.5, 2.4, 2.6].map(roundEven)).toEqual([0, 2, 2, 4, 2, 3]);
    expect([-1.5, -2.5, -3.5, -2.4, -2.6].map(roundEven)).toEqual([-2, -2, -4, -2, -3]);
    expect(Math.abs(roundEven(-0.5))).toBe(0);
  });

  it('fades from whole at her armpit to nothing 2 cm under it, eased at both ends', () => {
    expect(SIDE_LOCK.fromM).toBe(0);
    expect(SIDE_LOCK.toM).toBe(0.02);
    const f = fadeOf({ trunkBelow: Uint8Array.from([1, 1, 1, 1, 1, 0, 0]), drop: Float64Array.from([-0.01, 0, 0.01, 0.02, 0.3, 0.01, 0.3]) });
    expect(Array.from(f)).toEqual([1, 1, 0.5, 0, 0, 1, 1]); // (the last two are not her trunk below her armpits: whole, whatever their depth)
    expect(smoothstep(0, 0.02, 0.005)).toBeCloseTo(0.15625, 12);
    for (let d = 0; d < 0.02; d += 0.001) expect(smoothstep(0, 0.02, d + 0.001)).toBeGreaterThan(smoothstep(0, 0.02, d));
  });

  it("scales her arm's bytes and gives what that frees to the point's other bones, in their own proportions", () => {
    const isArm = Uint8Array.from({ length: 12 }, (_, k) => (k >= 9 ? 1 : 0));
    // MEASURED vertex 12237 of her skin: her spine 130, her arm 91, her chest 18, her collar 16
    const one = lockWeights([130, 91, 18, 16], [2, 9, 4, 8], isArm, [0]);
    expect(Array.from(one.bytes)).toEqual([202, 0, 28, 25]);
    expect(one.changed).toBe(1);
    // half her arm's share kept: 91 -> 45.5 -> 46 (the even one), the other 209 shared as 130 : 18 : 16
    expect(Array.from(lockWeights([130, 91, 18, 16], [2, 9, 4, 8], isArm, [0.5]).bytes)).toEqual([166, 46, 23, 20]);
    // whole, or none of her arm in it, or her arm's alone: as it was
    for (const [bytes, joints, fade] of [[[130, 91, 18, 16], [2, 9, 4, 8], 1], [[200, 30, 20, 5], [2, 3, 4, 8], 0], [[255, 0, 0, 0], [9, 2, 3, 4], 0], [[200, 55, 0, 0], [9, 10, 2, 3], 0.3]] as const) {
      const r = lockWeights(bytes, joints, isArm, [fade]);
      expect(Array.from(r.bytes)).toEqual(bytes);
      expect(r.changed).toBe(0);
    }
    // two bones of her arm keep their split of what is kept
    expect(Array.from(lockWeights([100, 60, 30, 65], [2, 9, 10, 4], isArm, [0.5]).bytes)).toEqual([127, 30, 15, 83]);
    // MEASURED vertex 33595: two remainders exactly alike (141/237 each) -- the larger share takes the byte
    expect(Array.from(lockWeights([179, 37, 21, 18], [2, 3, 4, 9], isArm, [0]).bytes)).toEqual([193, 40, 22, 0]);
  });

  it('keeps every vertex a whole (255) whatever the bytes and the fade', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const isArm = Uint8Array.from({ length: 16 }, (_, k) => (k >= 8 ? 1 : 0)), n = 4000, bytes = new Uint8Array(n * 4), joints = new Uint8Array(n * 4), fade = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const cut = [0, Math.floor(rnd() * 256), Math.floor(rnd() * 256), Math.floor(rnd() * 256), 255].sort((a, b) => a - b);
      for (let c = 0; c < 4; c++) { bytes[i * 4 + c] = cut[c + 1] - cut[c]; joints[i * 4 + c] = Math.floor(rnd() * 16); }
      fade[i] = rnd() < 0.2 ? 0 : rnd();
    }
    const out = lockWeights(bytes, joints, isArm, fade).bytes;
    for (let i = 0; i < n; i++) {
      expect(out[i * 4] + out[i * 4 + 1] + out[i * 4 + 2] + out[i * 4 + 3]).toBe(255);
      let was = 0, now = 0, rest = 0;
      for (let c = 0; c < 4; c++) if (isArm[joints[i * 4 + c]]) { was += bytes[i * 4 + c]; now += out[i * 4 + c]; } else rest += bytes[i * 4 + c];
      if (rest > 0) expect(Math.abs(now - was * fade[i])).toBeLessThanOrEqual(1.5); else expect(now).toBe(was);
    }
  });

  it("scales a shape's numbers and leaves the rest of it", () => {
    const r = lockShape(Int16Array.from([100, -101, 7, 3, 3, 3, -5, 0, 32767]), [0.5, 1, 0]);
    expect(Array.from(r.deltas)).toEqual([50, -50, 4, 3, 3, 3, 0, 0, 0]); // (-50.5 and 3.5 go to the even one)
    expect(r.changed).toBe(2);
  });

  it('welds a seam: two vertices at one place are one point, numbered by their place', () => {
    const w = weld([0.2, 0, 0, 0.1, 0, 0, 0.2, 0, 0.000001, 0.1, 0.5, 0]);
    expect(w.count).toBe(3);
    expect(Array.from(w.pointOf)).toEqual([2, 0, 2, 1]);
    expect(Array.from(w.rep)).toEqual([1, 3, 2]);
  });

  it('evens a number over a mesh: a flat field stays flat, a spike is spread, and the two sides of a seam stay one', () => {
    // a strip two points wide and seven long: point (i, row) is vertex 2i + row -- and vertex 14 stands where vertex 3
    // does, the other side of a seam (the first quad uses 3, the second 14)
    const rest: number[] = [], index: number[] = [];
    for (let i = 0; i < 7; i++) rest.push(i * 0.01, 0, 0, i * 0.01, 0.01, 0);
    rest.push(rest[9], rest[10], rest[11]);
    const v = (i: number, row: number, quad: number) => (i === 1 && row === 1 && quad === 1 ? 14 : 2 * i + row);
    for (let q = 0; q < 6; q++) index.push(v(q, 0, q), v(q + 1, 0, q), v(q + 1, 1, q), v(q, 0, q), v(q + 1, 1, q), v(q, 1, q));
    const flat = evenOver(new Float64Array(15).fill(0.4), rest, index, 30);
    for (const v of flat) expect(v).toBeCloseTo(0.4, 12);
    const spike = new Float64Array(15); spike[6] = 1; spike[7] = 1;
    const once = evenOver(spike, rest, index, 1), many = evenOver(spike, rest, index, 30);
    expect(once[6]).toBeLessThan(1); expect(once[4]).toBeGreaterThan(0); expect(once[0]).toBe(0);
    expect(Math.max(...many) - Math.min(...many)).toBeLessThan(0.05);
    expect(Math.min(...many)).toBeGreaterThan(0);
    // the seam's two copies are one point: the same number, whatever each was given
    const seam = new Float64Array(15); seam[3] = 1; seam[14] = 0;
    const out = evenOver(seam, rest, index, 3);
    expect(out[3]).toBe(out[14]);
    expect(evenOver(spike, rest, index, 0)).toEqual(spike);
  });

  /** A paper doll in one plane: a trunk, an arm either side hanging beside it, each joined to it only from its armpit up. */
  function doll(armpitLeft: number, armpitRight: number) {
    const rest: number[] = [], index: number[] = [], at = new Map<string, number>(), step = 0.01;
    const vertex = (ix: number, iy: number) => { const k = `${ix},${iy}`; let v = at.get(k); if (v === undefined) { v = rest.length / 3; at.set(k, v); rest.push(MIDLINE_X_M + ix * step, iy * step, 0.1); } return v; };
    const quad = (ix: number, iy: number) => { const a = vertex(ix, iy), b = vertex(ix + 1, iy), c = vertex(ix + 1, iy + 1), d = vertex(ix, iy + 1); index.push(a, b, c, a, c, d); };
    for (let iy = 90; iy < 150; iy++) {
      for (let ix = -15; ix < 15; ix++) quad(ix, iy);                                  // her trunk, 30 cm wide, 0.9 to 1.5 m
      if (iy >= 100) for (let ix = 17; ix < 25; ix++) { quad(ix, iy); quad(-ix - 1, iy); } // her arms, from 1.0 m up
      if (iy >= Math.round(armpitLeft * 100)) { quad(15, iy); quad(16, iy); }           // ...joined to her from her armpits up
      if (iy >= Math.round(armpitRight * 100)) { quad(-16, iy); quad(-17, iy); }
    }
    const x = (v: number) => Math.round((rest[v * 3] - MIDLINE_X_M) / step), y = (v: number) => Math.round(rest[v * 3 + 1] / step);
    return { rest: Float64Array.from(rest), index: Uint32Array.from(index), elbows: [[0.21, 1.1, 0.1], [-0.21, 1.1, 0.1]], x, y, n: rest.length / 3 };
  }

  it('tells her arms from her trunk, and finds each armpit: the highest level below which her arm is a piece of its own', () => {
    const d = doll(1.25, 1.3), r = sideRegions(d);
    // the lowest triangle joining an arm to her reaches 1 cm above where the join starts
    expect(r.cut[0]).toBeCloseTo(1.26, 6);
    expect(r.cut[1]).toBeCloseTo(1.31, 6);
    for (let v = 0; v < d.n; v++) {
      const ix = d.x(v), iy = d.y(v);
      // her trunk: hers below her LOWER armpit (it is joined to her belly below both), and never an arm
      if (Math.abs(ix) <= 15) { expect(r.arm[v]).toBe(0); expect(r.trunkBelow[v]).toBe(iy <= 125 ? 1 : 0); continue; }
      // her arms, each a piece of its own below its own armpit; the strips that join them to her are neither
      expect(r.trunkBelow[v]).toBe(0);
      expect(r.arm[v]).toBe(ix >= 17 ? (iy <= 125 ? 1 : 0) : ix <= -17 ? (iy <= 130 ? -1 : 0) : 0);
    }
    const at = (ix: number, iy: number) => { for (let v = 0; v < d.n; v++) if (d.x(v) === ix && d.y(v) === iy) return v; throw new Error('no such point'); };
    // well below her armpits her depth is her height below her own side's (within the evening's centimetre)
    expect(Math.abs(r.drop[at(10, 110)] - (1.26 - 1.1))).toBeLessThan(0.01);
    expect(Math.abs(r.drop[at(-10, 110)] - (1.31 - 1.1))).toBeLessThan(0.01);
    const f = fadeOf(r);
    expect(f[at(10, 110)]).toBe(0);       // her side, 16 cm under her armpit
    expect(f[at(10, 140)]).toBe(1);       // above her armpit
    expect(f[at(20, 110)]).toBe(1);       // her arm
    expect(f[at(10, 125)]).toBeGreaterThan(0); // the band under her armpit
    expect(f[at(10, 125)]).toBeLessThan(1);
  });

  it('a worn point takes the fade of the nearest point of her TRUNK, though her arm lies nearer', () => {
    // her trunk's skin at x = 0, her arm's at x = 0.02, a strap between them at x = 0.015
    const skin = [0, 1.2, 0, 0, 1.21, 0, 0.02, 1.2, 0, 0.02, 1.21, 0], arm = [0, 0, 1, 1], fade = [0.25, 0.75, 1, 1];
    const r = fadeOfPart([0.015, 1.201, 0, 0.015, 1.209, 0, 0.3, 1.5, 0.2], skin, arm, fade);
    expect(Array.from(r.fade)).toEqual([0.25, 0.75, 0.75]);
    expect(r.off[0]).toBeCloseTo(Math.hypot(0.015, 0.001), 12);
  });
});

describe("side lock: the room's body file", () => {
  /** The clothes the room's file dropped from the approved one (`scripts/sarahV2Recovery/body-slim.mjs`). */
  const DROPPED = new Set(['leggings', 'leggingsTrim', 'leggingsLow', 'leggingsLowTrim', 'shirt', 'shirtTrim']);
  let room: Body, approved: Body, twin: Body, plan: ReturnType<typeof planSideLock>, note: unknown;
  /** Two arrays hold the same numbers, in the same form. */
  const same = (a: Uint8Array | Int16Array, b: Uint8Array | Int16Array) => a.constructor === b.constructor && Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
  beforeAll(async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    room = readBody(await io.read(SIDE_LOCK_FILES[0]));
    twin = readBody(await io.read(SIDE_LOCK_FILES[1]));
    approved = readBody(await io.read('assets-archive/models/sarah-v2-body.glb'), DROPPED);
    note = room.mesh.getExtras()?.sideLock;
    // the rule laid on the APPROVED numbers, over the room's own mesh (its points carry his approved mesh fix)
    plan = planSideLock(room, { skin: approved.skin, worn: approved.worn });
  }, 120000);

  it('reads her as she is: two upper arms with every bone under them, and her armpits where they were measured', () => {
    expect(room.upperArms.map((k) => room.joints[k]).sort()).toEqual(['Bone_021', 'Bone_026']);
    expect(Array.from(room.isArm).reduce((a, b) => a + b, 0)).toBe(48);
    expect(plan.region.cut[0]).toBeCloseTo(1.2484, 4); // MEASURED: her +x armpit
    expect(plan.region.cut[1]).toBeCloseTo(1.2525, 4); // MEASURED: her -x armpit
    expect(room.skin.n).toBe(115710);
    expect(approved.skin.n).toBe(room.skin.n);
    expect(approved.worn.map((p) => [p.material, p.n])).toEqual(room.worn.map((p) => [p.material, p.n]));
  });

  it('is the approved file with the rule laid on it, and says so', () => {
    expect(note).toBe(SIDE_LOCK_NOTE);
    expect(same(room.skin.weights, plan.skin.weights)).toBe(true);
    plan.skin.shapes.forEach((shape, s) => expect(same(room.skin.shapes[s], shape)).toBe(true));
    room.worn.forEach((part, k) => {
      expect(same(part.weights, plan.worn[k].weights)).toBe(true);
      plan.worn[k].shapes.forEach((shape, s) => expect(same(part.shapes[s], shape)).toBe(true));
    });
  });

  it('reached what the bake reported: her side skin and the bikini top\'s lower strap, nothing else worn', () => {
    // MEASURED 2026-11-12
    expect(plan.skin.weightsChanged).toBe(2030);
    expect(plan.skin.shapesChanged).toEqual([1109, 1084]);
    const touched = plan.worn.filter((p) => p.weightsChanged || p.shapesChanged.some(Boolean));
    expect(touched.map((p) => [p.material, p.n, p.weightsChanged, p.shapesChanged])).toEqual([['bikini', 4248, 3228, [1872, 1896]]]);
    // the strap lies on her skin: no point of it further than 14 mm off her trunk
    expect(Math.max(...touched[0].off!)).toBeLessThan(0.014);
  });

  it("leaves none of her arm's share on her trunk from 2 cm under her armpit down, and all of her elsewhere as approved", () => {
    const { trunkBelow, drop, arm } = plan.region, w = room.skin.weights, was = approved.skin.weights, j = room.skin.joints;
    // (counted, and held to none at the end: an expect at every vertex is slow)
    let low = 0, kept = 0, band = 0, faded = 0, notWhole = 0, changedOffTrunk = 0, armOnTrunk = 0, grew = 0, leftBelow = 0;
    for (let i = 0; i < room.skin.n; i++) {
      let share = 0, shareWas = 0, sum = 0;
      for (let c = 0; c < 4; c++) { sum += w[i * 4 + c]; if (room.isArm[j[i * 4 + c]]) { share += w[i * 4 + c]; shareWas += was[i * 4 + c]; } }
      if (sum !== 255) notWhole++;
      if (!trunkBelow[i]) { for (let c = 0; c < 4; c++) if (w[i * 4 + c] !== was[i * 4 + c]) changedOffTrunk++; kept++; continue; }
      if (arm[i] !== 0) armOnTrunk++;
      if (share > shareWas) grew++;
      if (drop[i] >= SIDE_LOCK.toM) { if (share !== 0) leftBelow++; low++; } else { band++; if (share < shareWas) faded++; }
    }
    expect([notWhole, changedOffTrunk, armOnTrunk, grew, leftBelow]).toEqual([0, 0, 0, 0, 0]);
    expect(low).toBeGreaterThan(50000);  // her trunk, hips and legs below the band
    expect(kept).toBeGreaterThan(50000); // her arms, her shoulders, her head
    expect(band).toBeGreaterThan(1000);  // the 2 cm under her armpits
    expect(faded).toBeGreaterThan(200);
    // her two shapes: nothing of them left on her trunk below the band, and untouched off it
    plan.skin.shapes.forEach((_, s) => {
      const d = room.skin.shapes[s], d0 = approved.skin.shapes[s];
      let changedOff = 0, left = 0;
      for (let i = 0; i < room.skin.n; i++) {
        if (!trunkBelow[i]) { if (d[i * 3] !== d0[i * 3] || d[i * 3 + 1] !== d0[i * 3 + 1] || d[i * 3 + 2] !== d0[i * 3 + 2]) changedOff++; continue; }
        if (drop[i] >= SIDE_LOCK.toM && (d[i * 3] !== 0 || d[i * 3 + 1] !== 0 || d[i * 3 + 2] !== 0)) left++;
      }
      expect([changedOff, left]).toEqual([0, 0]);
    });
  });

  it('has a KTX2 twin with the same numbers', () => {
    expect(twin.mesh.getExtras()?.sideLock).toBe(SIDE_LOCK_NOTE);
    expect(same(twin.skin.weights, room.skin.weights)).toBe(true);
    twin.skin.shapes.forEach((shape, s) => expect(same(shape, room.skin.shapes[s])).toBe(true));
    expect(twin.worn.length).toBe(room.worn.length);
    twin.worn.forEach((part, k) => {
      expect(same(part.weights, room.worn[k].weights)).toBe(true);
      part.shapes.forEach((shape, s) => expect(same(shape, room.worn[k].shapes[s])).toBe(true));
    });
  });

  it('is refused a second lock', async () => {
    await expect(sideLock(SIDE_LOCK_FILES[0], join(tmpdir(), 'side-lock-twice.glb'), { log: () => {} })).rejects.toThrow(/already carries the lock/);
  });
});
