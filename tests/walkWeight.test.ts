/**
 * THE WALK'S WEIGHT (src/actor/walkWeight.ts; Joshua, 2026-11-08: "the body has no natural weight and bounce while
 * walking"): her hips list, twist and carry her over her standing foot, and her legs and chest keep what the walk gave them.
 */
import { describe, expect, it } from 'vitest';
import type { HumanMeasure, JointTurn } from '../src/actor/humanRig';
import { walkWeight, weighWalk, WALK_WEIGHT } from '../src/actor/walkWeight';

type Q = [number, number, number, number];
const q = (t: { ax: number; ay: number; az: number; radians: number }): Q => { const s = Math.sin(t.radians / 2); return [t.ax * s, t.ay * s, t.az * s, Math.cos(t.radians / 2)]; };
const mul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const rotate = (r: Q, v: [number, number, number]): [number, number, number] => { const p = mul(mul(r, [v[0], v[1], v[2], 0]), [-r[0], -r[1], -r[2], r[3]]); return [p[0], p[1], p[2]]; };
const near = (a: number[], b: number[], eps = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < eps);

// a body facing +z, its left toward +x, as Sarah and her skeleton are bound
const measure = { joints: { pelvis: 1, spine: 2, chest: 4, neck: 5, head: 6, shoulderL: 34, elbowL: 35, wristL: 36, shoulderR: 9, elbowR: 10, wristR: 11, hipL: 63, kneeL: 64, ankleL: 65, hipR: 58, kneeR: 59, ankleR: 60 }, leftSign: 1, height: 1.6, armSpan: 1.5, legLength: 0.8, hipWidth: 0.2 } as unknown as HumanMeasure;
const turn = (joint: number, ax: number, ay: number, az: number, radians: number): JointTurn => ({ joint, ax, ay, az, radians });

describe('the walk carries weight', () => {
  it('a body standing carries none', () => {
    expect(walkWeight(0.4, 'stand')).toEqual({ list: 0, twist: 0, sway: 0 });
  });

  it('is over her left foot at the end of its midstance (0.55), her right hip dropped; and over her right at 0.05', () => {
    const l = walkWeight(0.55, 'walk'), r = walkWeight(0.05, 'walk');
    expect(l.sway).toBeCloseTo(WALK_WEIGHT.sway, 9);
    expect(l.list).toBeCloseTo(WALK_WEIGHT.list, 9);
    expect(r.sway).toBeCloseTo(-WALK_WEIGHT.sway, 9);
    expect(r.list).toBeCloseTo(-WALK_WEIGHT.list, 9);
    // a positive list raises her left hip (+x): the pelvis's turn takes her left hip up, her right down
    const pelvis = weighWalk(measure, [turn(63, 1, 0, 0, 0), turn(58, 1, 0, 0, 0), turn(2, 1, 0, 0, 0), turn(4, 1, 0, 0, 0)], l, []).find((t) => t.joint === 1)!;
    expect(rotate(q(pelvis), [0.1, 0, 0])[1]).toBeGreaterThan(0);
    expect(rotate(q(pelvis), [-0.1, 0, 0])[1]).toBeLessThan(0);
  });

  it('brings her left hip forward as her left foot lands (0.25), her right as it lands (0.75)', () => {
    const base = [turn(63, 1, 0, 0, 0), turn(58, 1, 0, 0, 0), turn(2, 1, 0, 0, 0), turn(4, 1, 0, 0, 0)];
    const at = (phase: number) => q(weighWalk(measure, base, walkWeight(phase, 'walk'), []).find((t) => t.joint === 1)!);
    expect(rotate(at(0.25), [0.1, 0, 0])[2]).toBeGreaterThan(0.004);
    expect(rotate(at(0.75), [-0.1, 0, 0])[2]).toBeGreaterThan(0.004);
  });

  it('keeps her legs swinging as the walk swung them, leaned only under the side shift, and her spine as it was', () => {
    const thigh = turn(63, 1, 0, 0, -0.4), spine = turn(2, 1, 0, 0, 0.05), chest = turn(4, 1, 0, 0, -0.02), arm = turn(34, 0, 0, 1, 0.3);
    const w = walkWeight(0.4, 'walk');
    const out = weighWalk(measure, [spine, chest, arm, thigh], w, []);
    const P = q(out.find((t) => t.joint === 1)!);
    // the thigh's world turn: the pelvis's times its own, as `HumanRig.apply` composes a child on its parent
    const legWorld = mul(P, q(out.find((t) => t.joint === 63)!));
    const lean = q({ ax: 0, ay: 0, az: 1, radians: -w.sway });
    expect(near(rotate(legWorld, [0, -0.8, 0]), rotate(mul(lean, q(thigh)), [0, -0.8, 0]), 1e-9)).toBe(true);
    // the spine as the walk leaned it
    expect(near(rotate(mul(P, q(out.find((t) => t.joint === 2)!)), [0, 0.3, 0.1]), rotate(q(spine), [0, 0.3, 0.1]), 1e-9)).toBe(true);
    // the arm copied as it was
    expect(out.find((t) => t.joint === 34)).toEqual(arm);
  });

  it('a run shifts her less from side to side than a walk', () => {
    expect(Math.abs(walkWeight(0.45, 'run').sway)).toBeLessThan(Math.abs(walkWeight(0.55, 'walk').sway));
  });
});

describe('the feet that carry her', () => {
  it('only a foot on the ground carries her: the left from its landing (0.25) to its lifting, never in its swing', async () => {
    const { footContact } = await import('../src/actor/walkWeight');
    expect(footContact(0.55, 'walk')).toEqual([1, 0]);
    expect(footContact(0.05, 'walk')).toEqual([0, 1]);
    // both on the ground as the weight moves across (double support), eased, never both nothing
    for (let p = 0; p < 1; p += 0.01) { const [l, r] = footContact(p, 'walk'); expect(l + r).toBeGreaterThan(0); }
    expect(footContact(0.3, 'walk')[0]).toBeGreaterThan(0);
    expect(footContact(0.3, 'walk')[1]).toBeGreaterThan(0);
    expect(footContact(0.4, 'stand')).toEqual([1, 1]);
  });
});
