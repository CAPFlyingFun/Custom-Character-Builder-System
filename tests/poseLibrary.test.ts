/**
 * THE POSE LIBRARY (`actor/poseLibrary.ts`, `data/poses`), its moves (`actor/poseClip.ts`) and its check for parts through
 * one another (`actor/selfContact.ts`): every pose is well formed and poses both of the room's bodies at 0, 100 and 200%
 * with finite turns; her body's turn as a whole tips her the way its numbers say; a clip is its keys at their times and
 * between them on a straight line; a point through another part's skin is told, one beside it is not.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { beforeAll, describe, expect, it } from 'vitest';
import { bodyFrame, qRotate } from '../src/actor/bodyAngles';
import type { BindJoint, HumanMeasure } from '../src/actor/humanRig';
import { measureHuman } from '../src/actor/humanSkeleton';
import { BODY_ANGLE_TURNS, anglesAt, posePose, rootOf, type PoseSpec } from '../src/actor/poseLibrary';
import { clipLength, sampleClip, type PoseClip } from '../src/actor/poseClip';
import { throughEachOther } from '../src/actor/selfContact';
import { POSES, poseById } from '../src/data/poses';

const FILES = { female: 'public/models/sarah-v2-body-slim.glb', male: 'public/models/male-base.glb' } as const;
const bodies: Record<string, { bind: BindJoint[]; measure: HumanMeasure }> = {};
beforeAll(async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  for (const [name, file] of Object.entries(FILES)) {
    const doc = await io.read(file), joints = doc.getRoot().listSkins()[0].listJoints();
    const bind = joints.map((j) => { const m = j.getWorldMatrix(), p = j.getParentNode(); return { name: j.getName(), x: m[12], y: m[13], z: m[14], parent: p ? joints.indexOf(p as never) : -1 }; });
    bodies[name] = { bind, measure: measureHuman(bind) };
  }
}, 60000);

describe('the library', () => {
  it('every pose is well formed: its own id, a sheet and a picture it is drawn from, what holds her', () => {
    const ids = new Set<string>();
    for (const p of POSES) {
      expect(ids.has(p.id), p.id).toBe(false); ids.add(p.id);
      expect(p.id.startsWith(`${p.sheet}-`), p.id).toBe(true);
      expect(p.ref.length).toBeGreaterThan(0);
      expect(['feet', 'seat', 'floor']).toContain(p.support);
      if (p.support === 'seat') expect(p.seat).toBeGreaterThan(0.2);
      expect(poseById(p.id)).toBe(p);
    }
    expect(POSES.filter((p) => p.sheet === 'core')).toHaveLength(16);
  });

  for (const name of Object.keys(FILES)) {
    it(`${name}: every pose poses her at 0, 100 and 200% with finite turns and a unit turn as a whole`, () => {
      const { bind, measure } = bodies[name];
      for (const p of POSES) for (const bump of [0, 1, 2]) {
        const got = posePose(measure, bind, p, { bump });
        expect(got.turns.length).toBeGreaterThanOrEqual(BODY_ANGLE_TURNS);
        for (const t of got.turns) expect(Number.isFinite(t.radians) && Number.isFinite(t.ax), p.id).toBe(true);
        expect(Math.hypot(...got.root)).toBeCloseTo(1, 6);
      }
    });
  }

  it('her body turned as a whole: pitch tips her top forward, roll toward her left, yaw turns her front to her left', () => {
    const { bind, measure } = bodies.female, F = bodyFrame(measure, bind);
    const spec = (body: PoseSpec['body']): PoseSpec => ({ id: 'x', name: 'x', sheet: 'x', ref: 'x', tags: [], support: 'floor', body, angles: {}, contacts: [] });
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(qRotate(rootOf(measure, bind, spec({ pitch: 90 })), F.up), F.fwd)).toBeCloseTo(1, 6);
    expect(dot(qRotate(rootOf(measure, bind, spec({ roll: 90 })), F.up), F.left)).toBeCloseTo(1, 6);
    expect(dot(qRotate(rootOf(measure, bind, spec({ yaw: 90 })), F.fwd), F.left)).toBeCloseTo(1, 6);
  });

  it('a pose`s 200% angles are mixed in by her belly', () => {
    const p = poseById('core-10-cross-legged')!;
    expect(anglesAt(p, 0).legL?.abduct).toBe(32);
    expect(anglesAt(p, 1).legL?.abduct).toBeCloseTo(37);
    expect(anglesAt(p, 2).legL?.abduct).toBeCloseTo(42);
  });
});

describe('a clip between poses', () => {
  const a = poseById('core-01-neutral')!, b: PoseSpec = { ...a, id: 'b', body: { pitch: 20 }, angles: { ...a.angles, back: { flex: 40 } } };
  const clip: PoseClip = { id: 'clip-x', name: 'x', keys: [{ t: 0, pose: a.id }, { t: 2, pose: b, ease: 'linear' }] };
  const look = (id: string) => poseById(id);
  it('is each key at its time and on a straight line between, its support and turn with it', () => {
    expect(clipLength(clip)).toBe(2);
    expect(sampleClip(clip, 0, look)!.angles.back?.flex ?? 0).toBe(0);
    expect(sampleClip(clip, 2, look)!.angles.back?.flex).toBe(40);
    expect(sampleClip(clip, 1, look)!.angles.back?.flex).toBeCloseTo(20);
    expect(sampleClip(clip, 1, look)!.body.pitch).toBeCloseTo(10);
    expect(sampleClip(clip, 5, look)!.angles.back?.flex).toBe(40);
    expect(sampleClip({ ...clip, loop: true }, 3, look)!.angles.back?.flex).toBeCloseTo(20);
  });
  it('eases in and out of a key by default', () => {
    const smooth: PoseClip = { ...clip, keys: [clip.keys[0], { t: 2, pose: b }] };
    expect(sampleClip(smooth, 0.5, look)!.angles.back?.flex).toBeLessThan(10);
  });
});

describe('a part through another', () => {
  // two closed boxes (outward triangles): part 0 a cube of 20 cm, part 1 a small one pushed half into it
  const box = (c: number[], h: number, base: number, pos: number[], index: number[]) => {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pos.push(c[0] + sx * h, c[1] + sy * h, c[2] + sz * h);
    // corners: index = (sx>0)*4 + (sy>0)*2 + (sz>0)
    const f = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    const P = (i: number) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    // each triangle wound to face out of its box's middle
    const out = (a: number, b: number, d: number) => {
      const A = P(a), B = P(b), D = P(d), n = [(B[1] - A[1]) * (D[2] - A[2]) - (B[2] - A[2]) * (D[1] - A[1]), (B[2] - A[2]) * (D[0] - A[0]) - (B[0] - A[0]) * (D[2] - A[2]), (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0])];
      const m = [(A[0] + B[0] + D[0]) / 3 - c[0], (A[1] + B[1] + D[1]) / 3 - c[1], (A[2] + B[2] + D[2]) / 3 - c[2]];
      index.push(...(n[0] * m[0] + n[1] * m[1] + n[2] * m[2] > 0 ? [a, b, d] : [a, d, b]));
    };
    for (const [a, b, c2, d] of f) { out(base + a, base + b, base + c2); out(base + a, base + c2, base + d); }
  };
  it('tells a point behind the other part`s skin, and not one beside it', () => {
    const pos: number[] = [], index: number[] = [];
    box([0, 0, 0], 0.1, 0, pos, index);
    box([0.12, 0, 0], 0.03, 8, pos, index);
    // (the small box's four corners on its -x side are 1 cm inside the big one)
    const part = [...new Array(8).fill(0), ...new Array(8).fill(1)];
    const got = throughEachOther(pos, index, part, [1]);
    expect(got).toHaveLength(1);
    expect(got[0].count).toBe(4);
    expect(got[0].deepest).toBeCloseTo(0.01, 3);
    // moved clear of it: nothing
    const clear = pos.map((v, i) => (i >= 24 && i % 3 === 0 ? v + 0.05 : v));
    expect(throughEachOther(clear, index, part, [1])).toHaveLength(0);
  });
});
