/**
 * THE POSE LIBRARY: FIXED POSES ANY GAME CAN READ (Joshua, 2026-11-26: "Can you create more animations and poses other
 * games can use?"; then "do fixed poses"; then "don't do the animations as it's game specific"). Each pose is DATA -- a
 * name, what it is for, what she rests on, her body's turn as a whole and her joints' angles in a clinician's degrees
 * (`bodyAngles.ts`) -- and `posePose` turns it into the rig's turns for any body, by role, from its bind, as
 * `humanSeated.poseSeated` does for sitting. How a game moves her from one pose to another is the game's.
 *
 * A pose is written for her at 0% and may say how it changes by her 200% belly (`bump`): a pregnant woman kneels with her
 * knees wider and keeps her arms off her bump. Her angles are mixed between the two by her belly (0 .. 2).
 *
 * PLACING HER: her body is turned as a whole by `body` (yaw, then pitch, then roll, about her hips' middle), then set on
 * what holds her (`support`): her lowest point on the floor (`feet`, `floor`), or her seat on a seat `seat` metres high.
 * Where her lowest point is depends on her skin, so the room finds it on her skin; for a game without her skin, the
 * preview (`scripts/preview/pose.mts`) measures it.
 *
 * Every pose's angles are GAME TUNING, by eye off the picture it is drawn from (`ref`), and checked on the room's two
 * bodies at 0, 100 and 200% for parts through one another (`selfContact.ts`).
 *
 * Pure: no three, no DOM.
 */
import { BODY_ANGLE_TURNS, bodyFrame, mixAngles, poseChain, qAxis, qMul, type BodyAngles } from './bodyAngles';
import { poseAngles } from './bodyAngles';
import type { BindJoint, HumanMeasure, JointTurn, MutableJointTurn } from './humanRig';

/** What holds her: her feet on the floor, a seat, or the floor itself under her (sitting, kneeling, on all fours, lying). */
export type PoseSupport = 'feet' | 'seat' | 'floor';
/** Something she holds or sits on: a prop a game puts in her hand, or under her. */
export interface PoseProp { readonly kind: 'phone' | 'tablet' | 'stool' | 'mug' | 'book'; readonly hand?: 'L' | 'R' }

export interface PoseSpec {
  /** unique, `<sheet>-<nn>-<name>` */
  readonly id: string;
  /** on screen */
  readonly name: string;
  /** the sheet it came from ('core', 'standing', 'stool', 'floor', 'yoga') */
  readonly sheet: string;
  /** where it is drawn from: the sheet's picture and its number on it */
  readonly ref: string;
  /** what a game might use it for: 'idle', 'talk', 'phone', 'sit', 'floor', 'exercise', 'rest' ... */
  readonly tags: readonly string[];
  readonly support: PoseSupport;
  /** her body turned as a whole (degrees): `yaw` + toward her left, `pitch` + tips her top forward (down), `roll` + tips
   * her top toward her left. 0, 0, 0 is upright, facing her own front. */
  readonly body?: { readonly yaw?: number; readonly pitch?: number; readonly roll?: number };
  readonly angles: BodyAngles;
  /** the pose at her 200% belly where it is not `angles`: mixed in by her belly's size (0 at 0%, all at 200%) */
  readonly bump?: BodyAngles;
  /** her body's turn at her 200% belly, where it is not `body` */
  readonly bumpBody?: { readonly yaw?: number; readonly pitch?: number; readonly roll?: number };
  /** where she touches what holds her: 'soleL', 'soleR', 'heelL', 'toesL', 'kneeL', 'palmL', 'forearmL', 'seat', 'hips',
   * 'forehead', 'chest', 'belly' ... (each side's own) */
  readonly contacts: readonly string[];
  /** a seat's top above the floor, metres (`support` 'seat') */
  readonly seat?: number;
  readonly props?: readonly PoseProp[];
  /** a word for a game: what not to use it for (a pose a woman late in a pregnancy would not take) */
  readonly note?: string;
}

/** A pose as a body takes it. */
export interface PosedBody {
  /** the rig's turns (`BODY_ANGLE_TURNS` of them) */
  readonly turns: readonly JointTurn[];
  /** her body's turn as a whole, a quaternion [x, y, z, w] in her bind's frame, about her hips' middle */
  readonly root: readonly [number, number, number, number];
  readonly support: PoseSupport;
  readonly seat: number;
}

export interface PoseOptions {
  /** her belly, 0 (0%) .. 2 (200%) */
  readonly bump?: number;
  /** her bind's units a metre */
  readonly unitsPerMetre?: number;
}

const mixTurn = (a: PoseSpec['body'], b: PoseSpec['body'], t: number) => ({
  yaw: (a?.yaw ?? 0) + ((b?.yaw ?? a?.yaw ?? 0) - (a?.yaw ?? 0)) * t,
  pitch: (a?.pitch ?? 0) + ((b?.pitch ?? a?.pitch ?? 0) - (a?.pitch ?? 0)) * t,
  roll: (a?.roll ?? 0) + ((b?.roll ?? a?.roll ?? 0) - (a?.roll ?? 0)) * t,
});

/** A pose's angles at her belly (0 .. 2): `angles`, and `bump`'s mixed in by `bump / 2`. */
export function anglesAt(spec: PoseSpec, bump = 0): BodyAngles {
  const t = Math.min(1, Math.max(0, bump / 2));
  if (!spec.bump || t <= 0) return spec.angles;
  // what `bump` leaves out is `angles`'
  const whole: BodyAngles = {
    back: { ...spec.angles.back, ...spec.bump.back }, neck: { ...spec.angles.neck, ...spec.bump.neck },
    armL: { ...spec.angles.armL, ...spec.bump.armL }, armR: { ...spec.angles.armR, ...spec.bump.armR },
    legL: { ...spec.angles.legL, ...spec.bump.legL }, legR: { ...spec.angles.legR, ...spec.bump.legR },
  };
  return mixAngles(spec.angles, whole, t);
}

/** Her body's turn as a whole at her belly, as a quaternion in her bind's frame. */
export function rootOf(measure: HumanMeasure, bind: readonly BindJoint[], spec: PoseSpec, bump = 0): [number, number, number, number] {
  const F = bodyFrame(measure, bind), r = mixTurn(spec.body, spec.bumpBody, Math.min(1, Math.max(0, bump / 2))), D = Math.PI / 180;
  const cross = (a: readonly number[], b: readonly number[]): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // yaw turns her front toward her left; pitch her top toward her front; roll her top toward her left
  const yaw = qAxis(cross(F.fwd, F.left), r.yaw * D), pitch = qAxis(cross(F.up, F.fwd), r.pitch * D), roll = qAxis(cross(F.up, F.left), r.roll * D);
  return qMul(yaw, qMul(pitch, roll));
}

/** A pose on a body: its turns into `out`, and how she is turned and held. */
export function posePose(measure: HumanMeasure, bind: readonly BindJoint[], spec: PoseSpec, options: PoseOptions = {}, out: MutableJointTurn[] = []): PosedBody {
  const bump = options.bump ?? 0;
  const turns = poseAngles(measure, bind, anglesAt(spec, bump), out, { unitsPerMetre: options.unitsPerMetre ?? 1 });
  return { turns, root: rootOf(measure, bind, spec, bump), support: spec.support, seat: spec.seat ?? 0 };
}

/** Which of a body's parts each point is (for `selfContact.throughEachOther`): 0 trunk (her head with it), 1 her left arm,
 * 2 her right, 3 her left leg, 4 her right; 255 left out -- a point no bone carries `most` of (where two parts' skin is
 * one: its part's bones carry less than `most` of it), or, as posed, within `nearArm` of its shoulder joint or `nearLeg` of
 * its hip joint. */
export const PART = Object.freeze({ trunk: 0, armL: 1, armR: 2, legL: 3, legR: 4, none: 255 });
export const PART_LEAVE = Object.freeze({ most: 0.8, nearArm: 0.1, nearLeg: 0.1 });
export function partsOf(measure: HumanMeasure, bind: readonly BindJoint[], joints: ArrayLike<number>, /** 0 .. 1 */ weights: ArrayLike<number>, posedJoint: (j: number) => readonly [number, number, number], posed: ArrayLike<number>, unitsPerMetre = 1, leave: { readonly most: number; readonly nearArm: number; readonly nearLeg: number } = PART_LEAVE): Uint8Array {
  const j = measure.joints, n = Math.floor(posed.length / 3), out = new Uint8Array(n).fill(PART.none);
  const F = bodyFrame(measure, bind);
  // each bone's part: under a shoulder (the upper arm's joint), a hip; the rest is her trunk
  const partOfBone = bind.map((_, b) => {
    for (let x = b; x >= 0; x = bind[x].parent) {
      if (x === F.arm.L.shoulder) return PART.armL; if (x === F.arm.R.shoulder) return PART.armR;
      if (x === j.hipL) return PART.legL; if (x === j.hipR) return PART.legR;
    }
    return PART.trunk;
  });
  const sL = posedJoint(F.arm.L.shoulder), sR = posedJoint(F.arm.R.shoulder), hL = posedJoint(j.hipL), hR = posedJoint(j.hipR);
  const far = (i: number, p: readonly number[], m: number) => Math.hypot(posed[i * 3] - p[0], posed[i * 3 + 1] - p[1], posed[i * 3 + 2] - p[2]) > m * unitsPerMetre;
  for (let i = 0; i < n; i += 1) {
    // the part that carries most of it: its bones' weights summed
    const share = [0, 0, 0, 0, 0];
    for (let k = 0; k < 4; k += 1) share[partOfBone[joints[i * 4 + k]] ?? PART.trunk] += weights[i * 4 + k];
    let best = 0;
    for (let q = 1; q < 5; q += 1) if (share[q] > share[best]) best = q;
    const w = share[best];
    if (w < leave.most) continue;
    const p = best;
    if (p === PART.armL && !far(i, sL, leave.nearArm)) continue;
    if (p === PART.armR && !far(i, sR, leave.nearArm)) continue;
    if (p === PART.legL && !far(i, hL, leave.nearLeg)) continue;
    if (p === PART.legR && !far(i, hR, leave.nearLeg)) continue;
    out[i] = p;
  }
  return out;
}
/** The pairs a pose is checked for: each arm against her trunk, the other arm and each leg; each leg against her trunk
 * (her bump among it) and the other leg. Both ways where a part can go into another from either side. */
export const CHECK_PAIRS = Object.freeze([
  { a: PART.armL, b: PART.trunk }, { a: PART.armR, b: PART.trunk }, { a: PART.trunk, b: PART.armL }, { a: PART.trunk, b: PART.armR },
  { a: PART.armL, b: PART.armR }, { a: PART.armR, b: PART.armL },
  { a: PART.armL, b: PART.legL }, { a: PART.armL, b: PART.legR }, { a: PART.armR, b: PART.legL }, { a: PART.armR, b: PART.legR },
  { a: PART.legL, b: PART.armL }, { a: PART.legL, b: PART.armR }, { a: PART.legR, b: PART.armL }, { a: PART.legR, b: PART.armR },
  { a: PART.legL, b: PART.trunk }, { a: PART.legR, b: PART.trunk }, { a: PART.trunk, b: PART.legL }, { a: PART.trunk, b: PART.legR },
  { a: PART.legL, b: PART.legR }, { a: PART.legR, b: PART.legL },
]);
export const PART_NAMES = ['trunk', 'armL', 'armR', 'legL', 'legR'] as const;

export { BODY_ANGLE_TURNS, poseChain };
