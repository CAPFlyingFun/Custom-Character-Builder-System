/**
 * THE WALK'S WEIGHT (Joshua, 2026-11-08, of his skeleton walking in the room: "the body has no natural weight and bounce
 * while walking"; then, told the walk itself never moves the hips, "Yes, add to the room... Should make it look like a
 * human vs something else").
 *
 * `humanPose.poseHuman` swings the legs, arms and spine, and never the pelvis: the hips stay level, square and over the
 * middle of the feet, so a body walks like a puppet hung from its hips. A person's hips carry the weight, and three things
 * show it (the "determinants of gait"):
 *
 * - THE SIDE SHIFT: the body moves over the foot it stands on, furthest at the end of midstance. Here the whole body is
 *   moved (the room moves her) and the legs lean back under her by the same amount, so the feet stay where they were.
 * - THE LIST: the hip of the swinging leg drops while the other leg carries her. The spine takes the list back out so
 *   the chest stays level, and the legs keep their own swing.
 * - THE TWIST: the pelvis turns to bring the swinging leg's hip forward, most at its heel strike, and the chest turns the
 *   other way (the arms already swing against the legs).
 *
 * The rise and fall -- lowest at double support, highest at midstance -- is not written here: it is what the legs' own
 * angles do once the lowest sole is stood on the floor (the room's `place`).
 *
 * Every turn is in the bind pose's world frame, as `humanRig.JointTurn` defines it, and a child's turn is applied in its
 * parent's bind frame (`HumanRig.apply`: local = P⁻¹ · R · B), so a turn on the pelvis carries everything under it. The
 * thighs and the spine are given the pelvis's turn back (Q⁻¹ · R) so their own swing and lean are unchanged.
 *
 * Pure: no three, no DOM. Core, like the rest of `actor/`.
 */
import type { HumanMeasure, HumanStance, JointTurn, MutableJointTurn } from './humanRig';
import { newJointTurn } from './humanRig';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/**
 * How much weight a walk shows. `sway` is a share of the leg's length (hip to ankle) each way: 0.03 is 2.5 cm each way on
 * her 0.8 m leg, against a walking adult's lateral centre-of-gravity excursion of about 6 cm (Thompson, OUHSC gait
 * kinematics). BIOLOGICAL SHAPE for `sway`; the list and twist (a few degrees each, as walking hips move) GAME TUNING on
 * renders.
 */
export const WALK_WEIGHT = Object.freeze({
  /** The swinging leg's hip dropped, at most, radians. */
  list: 5 * DEG,
  /** The pelvis turned about the vertical, each way, radians. */
  twist: 4 * DEG,
  /** The chest turned against the pelvis, a share of the pelvis's twist. */
  chestCounter: 0.8,
  /** The body over its standing foot, each way, a share of the leg. */
  sway: 0.03,
});

/** A run's weight as shares of the walk's: a narrower track (less side shift), a little more list and twist. GAME TUNING. */
export const RUN_WEIGHT = Object.freeze({ list: 1.2, twist: 1.25, sway: 0.4 });

/** The share of each leg's cycle on the ground, as `humanPose` swings it (walk and stand 0.6, run 0.4). */
const STANCE_SHARE: Readonly<Record<HumanStance, number>> = { stand: 0.6, walk: 0.6, run: 0.4 };

/** This moment's weight: the list and twist in radians (positive list raises her LEFT hip; positive twist brings her
 * RIGHT hip forward), and the side shift as a share of the leg (positive toward her left). */
export interface WalkWeight {
  readonly list: number;
  readonly twist: number;
  readonly sway: number;
}

/**
 * The weight at `phase` of `stance` (0..1, `humanPose`'s cycle: the left foot lands at 0.25, the right at 0.75). A stance
 * of `stand` carries none.
 */
export function walkWeight(phase: number, stance: HumanStance): WalkWeight {
  if (stance === 'stand') return { list: 0, twist: 0, sway: 0 };
  const run = stance === 'run';
  // her weight furthest over her left foot at the end of its midstance: the middle of its stance, which starts at 0.25
  const overLeft = Math.sin(TAU * (phase - (0.25 + STANCE_SHARE[stance] / 2) + 0.25));
  // her left hip furthest forward as her left foot lands (0.25)
  const leftForward = Math.cos(TAU * (phase - 0.25));
  return {
    list: overLeft * WALK_WEIGHT.list * (run ? RUN_WEIGHT.list : 1),
    twist: -leftForward * WALK_WEIGHT.twist * (run ? RUN_WEIGHT.twist : 1),
    sway: overLeft * WALK_WEIGHT.sway * (run ? RUN_WEIGHT.sway : 1),
  };
}

type Q = [number, number, number, number];
const fromAxis = (x: number, y: number, z: number, a: number): Q => { const s = Math.sin(a / 2); return [x * s, y * s, z * s, Math.cos(a / 2)]; };
const mul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const inv = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]];
const ofTurn = (t: JointTurn): Q => fromAxis(t.ax, t.ay, t.az, t.radians);
function write(out: MutableJointTurn, joint: number, q: Q): void {
  let [x, y, z, w] = q;
  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const s = Math.hypot(x, y, z);
  out.joint = joint;
  if (s < 1e-12) { out.ax = 0; out.ay = 1; out.az = 0; out.radians = 0; return; }
  out.ax = x / s; out.ay = y / s; out.az = z / s; out.radians = 2 * Math.atan2(s, w);
}

/**
 * `base` (a `poseHuman` frame) with the walk's weight on it: a turn on the pelvis (list and twist), the thighs and the
 * spine given that turn back (the thighs also leaning under the side shift, so her feet stay put when the room moves her
 * by `sway`), and the chest turned against the pelvis. Written into `out` (grown as needed); every other turn copied.
 * `base` must not be `out`.
 */
export function weighWalk(measure: HumanMeasure, base: readonly JointTurn[], weight: WalkWeight, out: MutableJointTurn[]): readonly JointTurn[] {
  const j = measure.joints, left = measure.leftSign < 0 ? -1 : 1;
  const count = base.length + 1;
  while (out.length < count) out.push(newJointTurn());
  // her forward (the roll axis) and up; a roll about her forward by a positive angle raises her left side
  const fwd: [number, number, number] = [0, 0, left];
  const pelvis = mul(fromAxis(0, 1, 0, weight.twist), fromAxis(fwd[0], fwd[1], fwd[2], weight.list));
  const back = inv(pelvis);
  // the legs leaned under the side shift: her feet moved back toward her right by what her body moved to her left
  const lean = fromAxis(fwd[0], fwd[1], fwd[2], -weight.sway);
  const chest = fromAxis(0, 1, 0, -weight.twist * WALK_WEIGHT.chestCounter);
  let n = 0, pelvisNamed = false;
  for (const t of base) {
    const o = out[n++];
    if (t.joint === j.hipL || t.joint === j.hipR) write(o, t.joint, mul(back, mul(lean, ofTurn(t))));
    else if (t.joint === j.spine) write(o, t.joint, mul(back, ofTurn(t)));
    else if (t.joint === j.chest) write(o, t.joint, mul(chest, ofTurn(t)));
    else if (t.joint === j.pelvis) { write(o, t.joint, mul(pelvis, ofTurn(t))); pelvisNamed = true; }
    else { o.joint = t.joint; o.ax = t.ax; o.ay = t.ay; o.az = t.az; o.radians = t.radians; }
  }
  if (!pelvisNamed) write(out[n++], j.pelvis, pelvis);
  return out.slice(0, n);
}
