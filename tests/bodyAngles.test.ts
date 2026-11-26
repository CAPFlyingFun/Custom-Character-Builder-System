/**
 * A POSE IN A CLINICIAN'S DEGREES (`actor/bodyAngles.ts`), on the room's two bodies read off their files (the female
 * base model and the male): the back, neck, hips, knees and ankles come back through the joint table's own reading as
 * they were written; an arm points where its `raise` and `toward` say; an elbow bends its forearm forward; a `reach`
 * puts the wrist where it was sent; a pose mirrored is the same pose on her other side.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { beforeAll, describe, expect, it } from 'vitest';
import { bodyFrame, mirrorAngles, mixAngles, poseAngles, poseChain, type BodyAngles } from '../src/actor/bodyAngles';
import type { BindJoint, HumanMeasure } from '../src/actor/humanRig';
import { measureHuman } from '../src/actor/humanSkeleton';
import { JointLimits } from '../src/actor/jointLimits';

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V): V => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const angle = (a: V, b: V) => (Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180) / Math.PI;

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

for (const name of Object.keys(FILES)) {
  describe(`${name}: angles in, the same angles out`, () => {
    it('reads back the back, neck, hips, knees and ankles as written (the joint table`s own reading)', () => {
      const { bind, measure } = bodies[name], limits = new JointLimits(measure, bind, () => 180);
      const pose: BodyAngles = {
        back: { flex: 25, side: 8, twist: -12 }, neck: { flex: -10, side: -6, twist: 15 },
        legL: { flex: 70, abduct: 15, twist: 10, knee: 80, ankle: 12 }, legR: { flex: -15, abduct: -5, twist: -20, knee: 30, ankle: -25 },
      };
      const r = limits.read(poseAngles(measure, bind, pose));
      const F = bodyFrame(measure, bind);
      expect(r.back.flexion).toBeCloseTo(25, 3);
      // (the table reads a side bend toward her right and a turn toward her left as + on these bodies: the signs here are hers)
      expect(r.back.lateral * F.sideSign).toBeCloseTo(8, 3);
      expect(r.back.rotation * F.twistSign).toBeCloseTo(-12, 3);
      expect(r.neck.flexion).toBeCloseTo(-10, 3);
      expect(r.hipL.flexion).toBeCloseTo(70, 3); expect(r.hipL.abduction).toBeCloseTo(15, 3); expect(r.hipL.rotation).toBeCloseTo(10, 3);
      expect(r.hipR.flexion).toBeCloseTo(-15, 3); expect(r.hipR.abduction).toBeCloseTo(-5, 3); expect(r.hipR.rotation).toBeCloseTo(-20, 3);
      expect(r.kneeL).toBeCloseTo(80, 3); expect(r.kneeR).toBeCloseTo(30, 3);
      expect(r.ankleL).toBeCloseTo(12, 3); expect(r.ankleR).toBeCloseTo(-25, 3);
    });

    it('a side bend toward her left takes her head toward her left; a turn toward her left turns her chest that way', () => {
      const { bind, measure } = bodies[name], F = bodyFrame(measure, bind), j = measure.joints;
      const lean = poseChain(bind, poseAngles(measure, bind, { back: { side: 20 } })).pos;
      expect(dot(sub(lean[j.neck], [bind[j.neck].x, bind[j.neck].y, bind[j.neck].z]), F.left)).toBeGreaterThan(0.05);
      const turn = poseChain(bind, poseAngles(measure, bind, { back: { twist: 30 } })).pos;
      const across = sub(turn[j.shoulderL], turn[j.shoulderR]);
      // her shoulders' line turned toward her left: her left shoulder has gone back
      expect(dot(across, F.fwd)).toBeLessThan(-0.05);
    });

    it('points the upper arm where `raise` and `toward` say, and bends the forearm forward', () => {
      const { bind, measure } = bodies[name], F = bodyFrame(measure, bind), j = measure.joints;
      const arm = (raise: number, toward: number, elbow = 0) => {
        const pos = poseChain(bind, poseAngles(measure, bind, { armL: { raise, toward, elbow }, armR: { raise, toward, elbow } })).pos;
        return { L: sub(pos[j.elbowL], pos[j.shoulderL]), R: sub(pos[j.elbowR], pos[j.shoulderR]), fL: sub(pos[j.wristL], pos[j.elbowL]) };
      };
      const down: V = [-F.up[0], -F.up[1], -F.up[2]], right: V = [-F.left[0], -F.left[1], -F.left[2]];
      expect(angle(arm(0, 0).L, down)).toBeLessThan(1);
      expect(angle(arm(90, 0).L, F.left)).toBeLessThan(1);
      expect(angle(arm(90, 0).R, right)).toBeLessThan(1);
      expect(angle(arm(90, 90).L, F.fwd)).toBeLessThan(1);
      expect(angle(arm(180, 0).L, F.up)).toBeLessThan(25); // (raised past level her collarbone lifts with it: `SHRUG`)
      expect(angle(arm(0, 0, 90).fL, F.fwd)).toBeLessThan(12);
    });

    it('puts a reaching wrist where it was sent, on her own body as she is posed', () => {
      const { bind, measure } = bodies[name], j = measure.joints;
      const pose: BodyAngles = {
        back: { flex: 10, twist: 10 },
        armL: { reach: { at: 'hip', off: [0.06, 0.12, -0.02] } },
        armR: { reach: { at: 'head', off: [0.02, -0.05, 0.12], elbow: [0.5, -1, 0.3] } },
      };
      const turns = poseAngles(measure, bind, pose), { pos, acc } = poseChain(bind, turns), F = bodyFrame(measure, bind);
      const rot = (q: number[], v: V): V => {
        const [x, y, z, w] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
        return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
      };
      const want = (p: V, q: number[], out: V, off: V): V => {
        const local: V = [out[0] * off[0] + F.up[0] * off[1] + F.fwd[0] * off[2], out[1] * off[0] + F.up[1] * off[1] + F.fwd[1] * off[2], out[2] * off[0] + F.up[2] * off[1] + F.fwd[2] * off[2]];
        const r = rot(q, local); return [p[0] + r[0], p[1] + r[1], p[2] + r[2]];
      };
      const right: V = [-F.left[0], -F.left[1], -F.left[2]];
      const hipAim = want(pos[j.hipL], acc[j.pelvis], F.left, [0.06, 0.12, -0.02]);
      const headAim = want(pos[j.head], acc[j.head], right, [0.02, -0.05, 0.12]);
      expect(Math.hypot(...sub(pos[j.wristL], hipAim))).toBeLessThan(0.002);
      expect(Math.hypot(...sub(pos[j.wristR], headAim))).toBeLessThan(0.002);
    });

    it('a pose mirrored is the same pose on her other side', () => {
      const { bind, measure } = bodies[name], j = measure.joints, F = bodyFrame(measure, bind);
      const pose: BodyAngles = { back: { side: 12, twist: 9 }, armL: { raise: 70, toward: 40, elbow: 60 }, legL: { flex: 50, abduct: 10, knee: 40 } };
      const a = poseChain(bind, poseAngles(measure, bind, pose)).pos, b = poseChain(bind, poseAngles(measure, bind, mirrorAngles(pose))).pos;
      // her left wrist's place across her middle in one, her right wrist's in the other: the same, the other side
      const mid = (p: V[]) => p[j.pelvis];
      const across = (p: V[], w: number) => dot(sub(p[w], mid(p)), F.left), height = (p: V[], w: number) => dot(sub(p[w], mid(p)), F.up);
      expect(across(b, j.wristR)).toBeCloseTo(-across(a, j.wristL), 1);
      expect(height(b, j.wristR)).toBeCloseTo(height(a, j.wristL), 1);
      expect(across(b, j.kneeR)).toBeCloseTo(-across(a, j.kneeL), 1);
    });

    it('mixes two poses angle by angle, reach by reach', () => {
      const m = mixAngles({ legL: { knee: 0 }, armL: { reach: { at: 'hip', off: [0, 0, 0] } } }, { legL: { knee: 90 }, armL: { reach: { at: 'hip', off: [0, 0.2, 0] } } }, 0.5);
      expect(m.legL?.knee).toBe(45);
      expect(m.armL?.reach?.off?.[1]).toBeCloseTo(0.1);
    });
  });
}
