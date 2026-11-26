/**
 * A WHOLE-BODY POSE WRITTEN IN A CLINICIAN'S DEGREES (2026-11-26, for the bed poses Galaxy Defenders' sleepers need and
 * the pose library after them). `humanPose`, `humanSeated` and `humanBirth` each write their turns joint by joint, in the
 * rig's own sign rules; this writes them from ANGLES a person can read and a game can store -- the back bent forward
 * 20 degrees, the hip flexed 60, the knee 90, the upper arm pointing forward and down -- for any body, by role, from its
 * bind. The convention is `humanRig`'s: every turn is an axis and an angle in the bind pose's world frame, applied there
 * and carried by the joint's parents, so each angle below is RELATIVE TO THE PART IT HANGS FROM (the hips to the
 * pelvis, the back to the pelvis, the neck to the chest, the upper arm to the chest, the elbow to the upper arm).
 *
 * THE BACK, THE NECK, THE HIPS, THE KNEES AND THE ANKLES are written in `jointLimits.ts`'s own terms -- the joint
 * coordinate system of Grood & Suntay that the joint table is read in (flexion first, then the swing out, then the
 * rotation about the bone) -- through `JointLimits.compose`, so the numbers here are the numbers the table checks and
 * `JointLimits.read` gives them back. Signs (degrees):
 *   back  / neck : `flex` + forward; `side` + toward her LEFT; `twist` + turns the front toward her LEFT
 *   hip          : `flex` + the knee forward (- behind); `abduct` + out from her middle; `twist` + INTERNAL (toes in)
 *   knee         : `flex` + bent (0 straight)
 *   ankle        : `flex` + toes up (dorsiflexion), - pointed (plantarflexion)
 * The back's turn is shared between her spine and her chest (`BACK_SHARE`), the neck's between her neck and her head
 * (`NECK_SHARE`), as the table reads each pair as one.
 *
 * THE ARMS are not in the table's frame (no table holds a shoulder), and are written as where the UPPER ARM POINTS
 * from the chest, which never locks up at any angle: `raise` from hanging straight down (0) through level (90) to
 * straight up (180), raised in the direction `toward` -- 0 out to her side, 90 straight forward, 180 across her front,
 * -90 behind her -- and turned about its own length by `twist` (+ external: the front of the arm turns out). Then
 * `elbow` (+ bent, 0 straight), the forearm's roll `pronate` (+ pronation: from palm-to-thigh, the palm turns back),
 * the wrist's `wristFlex` (+ toward the palm) and `wristSide` (+ toward the thumb). The forearm's roll is taken half
 * by the forearm and half by the wrist (no twist bone: `sarahlab/armJoints.ts` `FOREARM_SHARE`). Raised past level the
 * collarbone lifts with it (`SHRUG`), as a shoulder blade turns up under a raised arm.
 *
 * Pure: no three, no DOM (core). Allocates per call: a pose is written when it changes, not every frame.
 */
import type { BindJoint, HumanMeasure, JointTurn, MutableJointTurn } from './humanRig';
import { newJointTurn } from './humanRig';
import { JointLimits } from './jointLimits';

/** Degrees about each of a chain's three motions. */
export interface Bend3 { readonly flex?: number; readonly side?: number; readonly twist?: number }
/** One arm (degrees): see the header. */
export interface ArmAngles {
  readonly raise?: number; readonly toward?: number; readonly twist?: number;
  readonly elbow?: number; readonly pronate?: number; readonly wristFlex?: number; readonly wristSide?: number;
  /** Put the WRIST at a place on her (`Reach`) in place of `raise`, `toward`, `twist` and `elbow`: a hand on her hip, at
   * her chin, at her ear. The arm's own pronation and wrist angles still apply. */
  readonly reach?: Reach;
}
/**
 * Where a wrist goes, on her own body, so a hand that rests on her stays on her whatever her build: a joint of hers
 * (`ReachAt`; `own` and `other` side are the reaching arm's) and an offset from it in METRES, `[out, up, fwd]` -- out
 * toward the reaching arm's own side, up her body, forward her front -- in the frame of the part that joint belongs to
 * as she is posed (her pelvis for a hip or a knee, her chest for a shoulder or her neck, her head for her
 * head). `elbow` says which way the elbow points, `[out, up, fwd]` in her chest's frame (default out, down and back).
 * Out of reach, the arm reaches as far as it can toward it.
 */
export interface Reach {
  readonly at: ReachAt;
  readonly off?: readonly [number, number, number];
  readonly elbow?: readonly [number, number, number];
  /** the way her fingers point, `[out, up, fwd]` in the same frame as `off`: then `off` is where the PALM'S MIDDLE goes,
   * and the hand is turned so (half its roll taken by the forearm), with its palm facing `palm` (default: as near as it was) */
  readonly hand?: readonly [number, number, number];
  readonly palm?: readonly [number, number, number];
}
export type ReachAt = 'pelvis' | 'hip' | 'hipOther' | 'chest' | 'shoulder' | 'shoulderOther' | 'elbowOther' | 'neck' | 'head' | 'knee' | 'kneeOther';
/** Her measure's units a metre, for a `Reach`'s offsets (1: the bind is in metres). */
export interface AngleOptions { readonly unitsPerMetre?: number }
/** One leg (degrees): see the header. `ankleIn` turns the sole in (inversion, + ) about the foot's length. */
export interface LegAngles {
  readonly flex?: number; readonly abduct?: number; readonly twist?: number;
  readonly knee?: number; readonly ankle?: number; readonly ankleIn?: number;
}
/** A whole body's angles. Anything left out is at its bind (the arms hanging as rigged, the legs straight). */
export interface BodyAngles {
  readonly back?: Bend3; readonly neck?: Bend3;
  readonly armL?: ArmAngles; readonly armR?: ArmAngles;
  readonly legL?: LegAngles; readonly legR?: LegAngles;
}

/** How the back's turn is shared, spine then chest; the neck's, neck then head. GAME TUNING (a back bends most low, a
 * neck most at its base). */
export const BACK_SHARE = Object.freeze([0.55, 0.45] as const);
export const NECK_SHARE = Object.freeze([0.6, 0.4] as const);
/** The share of the forearm's roll the elbow's bone takes; the wrist takes the rest. As `armJoints.FOREARM_SHARE`. */
export const FOREARM_SHARE = 0.5;
/** The collarbone lifts this share of how far the arm is raised past `from` degrees, to at most `most`. BIOLOGICAL
 * SHAPE (the scapulohumeral rhythm: past the first 60 or so degrees the shoulder blade gives about a third of the
 * rise), GAME TUNING in its numbers: the rig's collarbone carries the top of the shoulder, not the blade. */
export const SHRUG = Object.freeze({ from: 90, share: 0.3, most: 22 });

type V = [number, number, number];
type Q = [number, number, number, number];
const DEG = Math.PI / 180;
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const unit = (a: V): V => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-12 ? scale(a, 1 / l) : [0, 1, 0]; };
const square = (a: V, n: V): V => unit(sub(a, scale(n, dot(a, n))));
export const qMul = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
export const qConj = (q: Q): Q => [-q[0], -q[1], -q[2], q[3]];
export const qAxis = (axis: V, a: number): Q => { const n = unit(axis), s = Math.sin(a / 2); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(a / 2)]; };
export function qRotate(q: Q, v: V): V {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
/** The shortest turn taking unit a to unit b. */
export function qArc(a: V, b: V): Q {
  const d = dot(a, b);
  if (d < -0.999999) { const o = Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]); return qAxis(o, Math.PI); }
  const c = cross(a, b), q: Q = [c[0], c[1], c[2], 1 + d], l = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
/** A quaternion's power (`t` of its turn), the short way. */
export function qPow(q: Q, t: number): Q {
  let [x, y, z, w] = q;
  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const s = Math.hypot(x, y, z);
  if (s < 1e-12) return [0, 0, 0, 1];
  const a = 2 * Math.atan2(s, w) * t, k = Math.sin(a / 2) / s;
  return [x * k, y * k, z * k, Math.cos(a / 2)];
}
export function writeTurn(out: MutableJointTurn, joint: number, q: Q): void {
  let [x, y, z, w] = q;
  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const s = Math.hypot(x, y, z);
  out.joint = joint;
  if (s < 1e-9) { out.ax = 0; out.ay = 1; out.az = 0; out.radians = 0; return; }
  out.ax = x / s; out.ay = y / s; out.az = z / s; out.radians = 2 * Math.atan2(s, w);
}

/** One arm's bind, read once: its joints, the hand's way and palm, and the axes its angles turn about. */
interface ArmRig {
  readonly clav: number; readonly shoulder: number; readonly elbow: number; readonly wrist: number;
  readonly out: V; readonly ub: V; readonly fb: V; readonly hinge: V; readonly kink: number;
  readonly extSign: number; readonly pronSign: number;
  readonly flexAxis: V; readonly radialAxis: V;
  /** the hand in the bind: the way its fingers go (wrist to the middle of the fingers' second joints), its palm's facing,
   * and how far along it from the wrist its palm's middle is (bind units) */
  readonly along: V; readonly palm: V; readonly palmAt: number;
}
/** A body's frame and arms, read once from its bind. */
export interface BodyFrame {
  readonly up: V; readonly left: V; readonly fwd: V;
  readonly limits: JointLimits;
  readonly arm: { readonly L: ArmRig; readonly R: ArmRig };
  readonly sideSign: number; readonly twistSign: number;
  /** the sign that makes an ankle's rotation about its foot an inversion (the sole turned toward her middle), each side */
  readonly inSign: { readonly L: number; readonly R: number };
}
const frames = new WeakMap<readonly BindJoint[], BodyFrame>();

/** The hand under `wrist`: its bone (the first with four or more branches), and its thumb's, index's and little
 * finger's second joints (`humanReach.bindPalm`'s reading). Null when the rig has no fingers. */
function handOf(bind: readonly BindJoint[], wrist: number): { hand: number; thumb: V; index: V; little: V } | null {
  const kids: number[][] = bind.map(() => []);
  bind.forEach((b, i) => { if (b.parent >= 0) kids[b.parent].push(i); });
  let hand = -1;
  const queue = [wrist];
  while (queue.length) { const at = queue.shift()!; if (kids[at].length >= 4) { hand = at; break; } queue.push(...kids[at]); }
  if (hand < 0) return null;
  const P = (i: number): V => [bind[i].x, bind[i].y, bind[i].z];
  const bases = kids[hand].map((k) => P(kids[k][0] ?? k));
  const c = scale(bases.reduce((s, b) => add(s, b), [0, 0, 0] as V), 1 / bases.length);
  const far = (b: V, o: V) => Math.hypot(b[0] - o[0], b[1] - o[1], b[2] - o[2]);
  const ti = bases.reduce((best, b, i) => (far(b, c) > far(bases[best], c) ? i : best), 0);
  const rest = bases.filter((_, i) => i !== ti).sort((a, b) => far(a, bases[ti]) - far(b, bases[ti]));
  if (rest.length < 2) return null;
  return { hand, thumb: bases[ti], index: rest[0], little: rest[rest.length - 1] };
}

/** A body's frame from its bind (cached per bind). */
export function bodyFrame(measure: HumanMeasure, bind: readonly BindJoint[]): BodyFrame {
  const known = frames.get(bind);
  if (known) return known;
  const j = measure.joints, P = (i: number): V => [bind[i].x, bind[i].y, bind[i].z];
  // the body's axes, as JointLimits reads them: up its spine, left across its hips, forward the way its toes point
  const up = unit(sub(P(j.neck), P(j.pelvis)));
  const left = square(sub(P(j.hipL), P(j.hipR)), up);
  let fwd = unit(cross(left, up));
  const toeOf = (ankle: number) => { const k = bind.findIndex((b) => b.parent === ankle); return k >= 0 ? sub(P(k), P(ankle)) : null; };
  const toe = toeOf(j.ankleL) ?? toeOf(j.ankleR);
  if (toe && dot(toe, fwd) < 0) fwd = scale(fwd, -1);
  const limits = new JointLimits(measure, bind, () => 180);
  // JointLimits' sideways bend turns toward fwd x up; its rotation about up turns fwd toward up x fwd
  const sideSign = dot(cross(fwd, up), left) > 0 ? 1 : -1;
  const twistSign = dot(cross(up, fwd), left) > 0 ? 1 : -1;
  const arm = (s: 'L' | 'R'): ArmRig => {
    const shoulder = s === 'L' ? j.shoulderL : j.shoulderR, elbow = s === 'L' ? j.elbowL : j.elbowR, wrist = s === 'L' ? j.wristL : j.wristR;
    const out = s === 'L' ? left : scale(left, -1);
    const ub = unit(sub(P(elbow), P(shoulder))), fb = unit(sub(P(wrist), P(elbow)));
    // the elbow's hinge: square to the upper arm and to her forward, so a turn about it brings the forearm forward
    const hinge = unit(cross(ub, fwd));
    const kink = Math.atan2(dot(cross(ub, fb), hinge), dot(ub, fb));
    // external rotation turns the arm's front (forward) out, about the hanging arm
    const extSign = dot(cross(scale(up, -1), fwd), out) > 0 ? 1 : -1;
    // the hand: its way (wrist to knuckles), its palm (toward her middle in the bind, arms down), its thumb's way
    const h = handOf(bind, wrist);
    const knuckles = h ? scale(add(add(h.index, h.little), h.thumb), 1 / 3) : null;
    const reachOf = h ? Math.hypot(...sub(scale(add(h.index, h.little), 0.5), P(wrist))) : 0;
    const along = h ? unit(sub(scale(add(h.index, h.little), 0.5), P(wrist))) : fb;
    void knuckles;
    let palm: V = h ? unit(cross(along, sub(h.index, h.little))) : scale(out, -1);
    if (dot(palm, out) > 0) palm = scale(palm, -1);
    const thumbWay = h ? square(sub(h.index, h.little), along) : fwd;
    // pronation: from palm-to-thigh, turns the palm to face behind her
    const turned = qRotate(qAxis(fb, 0.3), palm);
    const pronSign = dot(turned, fwd) < dot(palm, fwd) ? 1 : -1;
    return {
      clav: bind[shoulder].parent, shoulder, elbow, wrist, out, ub, fb, hinge, kink, extSign, pronSign,
      flexAxis: unit(cross(along, palm)), radialAxis: unit(cross(along, thumbWay)),
      along, palm: square(palm, along), palmAt: reachOf * 0.6,
    };
  };
  // an ankle's rotation about its foot (pointing forward) turns the sole (down) toward cross(fwd, -up)
  const soleWay = cross(fwd, scale(up, -1)), inSign = { L: dot(soleWay, scale(left, -1)) > 0 ? 1 : -1, R: dot(soleWay, left) > 0 ? 1 : -1 };
  const frame: BodyFrame = { up, left, fwd, limits, arm: { L: arm('L'), R: arm('R') }, sideSign, twistSign, inSign };
  frames.set(bind, frame);
  return frame;
}

/** How many turns `poseAngles` writes: spine, chest, neck, head; each arm's collarbone, shoulder, elbow and wrist; each
 * leg's hip, knee and ankle. Every call writes all of them (a joint at its bind is a zero turn), so a consumer that
 * applies only what it is given never keeps a stale angle. */
export const BODY_ANGLE_TURNS = 4 + 8 + 6;

/** The upper arm's turn from its chest (applied in the bind frame) for `a`, and the collarbone's lift under it. */
function armTurns(F: BodyFrame, A: ArmRig, a: ArmAngles): { clav: Q; shoulder: Q; elbow: Q; wrist: Q } {
  const raise = (a.raise ?? NaN) * DEG, toward = (a.toward ?? 0) * DEG;
  const down = scale(F.up, -1);
  let shoulderWorld: Q;
  let clav: Q = [0, 0, 0, 1];
  if (Number.isFinite(raise)) {
    // from the arm as rigged to straight down, then swung up by `raise` toward `toward`, then turned about itself
    const toDown = qArc(A.ub, down);
    const h = add(scale(A.out, Math.cos(toward)), scale(F.fwd, Math.sin(toward)));
    const swing = qAxis(cross(down, h), raise);
    const d = qRotate(swing, down);
    shoulderWorld = qMul(qAxis(d, A.extSign * (a.twist ?? 0) * DEG), qMul(swing, toDown));
    const lift = Math.min(SHRUG.most, Math.max(0, (raise / DEG - SHRUG.from) * SHRUG.share)) * DEG;
    if (lift > 0) clav = qAxis(cross(A.out, F.up), lift);
  } else {
    // no raise given: the arm as rigged, turned about itself only
    shoulderWorld = qAxis(A.ub, A.extSign * (a.twist ?? 0) * DEG);
  }
  const shoulder = qMul(qConj(clav), shoulderWorld);
  const pron = (a.pronate ?? 0) * DEG * A.pronSign;
  const elbow = qMul(qAxis(A.hinge, (a.elbow ?? 0) * DEG - A.kink), qAxis(A.fb, pron * FOREARM_SHARE));
  const wrist = qMul(qAxis(A.fb, pron * (1 - FOREARM_SHARE)), qMul(qAxis(A.flexAxis, (a.wristFlex ?? 0) * DEG), qAxis(A.radialAxis, (a.wristSide ?? 0) * DEG)));
  return { clav, shoulder, elbow, wrist };
}


/** Forward kinematics in the bind frame (`humanSeated.posedJoints`' rule), with each joint's accumulated turn. */
export function poseChain(bind: readonly BindJoint[], turns: readonly JointTurn[]): { acc: Q[]; pos: V[] } {
  const own: Q[] = bind.map(() => [0, 0, 0, 1] as Q);
  for (const t of turns) if (t.joint >= 0 && t.joint < bind.length) own[t.joint] = qAxis([t.ax, t.ay, t.az], t.radians);
  const acc: Q[] = new Array(bind.length), pos: V[] = new Array(bind.length), done = new Uint8Array(bind.length);
  const visit = (i: number): void => {
    if (done[i]) return;
    const p = bind[i].parent;
    if (p < 0) { acc[i] = own[i]; pos[i] = [bind[i].x, bind[i].y, bind[i].z]; } else {
      visit(p);
      acc[i] = qMul(acc[p], own[i]);
      pos[i] = add(pos[p], qRotate(acc[p], [bind[i].x - bind[p].x, bind[i].y - bind[p].y, bind[i].z - bind[p].z]));
    }
    done[i] = 1;
  };
  for (let i = 0; i < bind.length; i += 1) visit(i);
  return { acc, pos };
}

/** The angles that put `side`'s wrist at its `reach` (degrees), given every other turn of the pose as posed. */
function solveReach(measure: HumanMeasure, bind: readonly BindJoint[], F: BodyFrame, side: 'L' | 'R', reach: Reach, turns: readonly JointTurn[], upm: number): { raise: number; toward: number; twist: number; elbow: number } {
  const j = measure.joints, A = F.arm[side], other = side === 'L' ? 'R' : 'L';
  const { acc, pos } = poseChain(bind, turns);
  const own = (n: 'hip' | 'shoulder' | 'knee' | 'elbow', s: 'L' | 'R') => j[`${n}${s}` as const];
  const at = (() => {
    switch (reach.at) {
      case 'pelvis': return { p: pos[j.pelvis], q: acc[j.pelvis] };
      case 'hip': return { p: pos[own('hip', side)], q: acc[j.pelvis] };
      case 'hipOther': return { p: pos[own('hip', other)], q: acc[j.pelvis] };
      case 'chest': return { p: pos[j.chest], q: acc[j.chest] };
      case 'shoulder': return { p: pos[own('shoulder', side)], q: acc[j.chest] };
      case 'shoulderOther': return { p: pos[own('shoulder', other)], q: acc[j.chest] };
      case 'elbowOther': return { p: pos[own('elbow', other)], q: acc[j.chest] };
      case 'neck': return { p: pos[j.neck], q: acc[j.chest] };
      case 'head': return { p: pos[j.head], q: acc[j.head] };
      case 'knee': return { p: pos[own('knee', side)], q: acc[j.pelvis] };
      case 'kneeOther': return { p: pos[own('knee', other)], q: acc[j.pelvis] };
    }
  })();
  const way = (v: readonly [number, number, number] | undefined, q: Q): V => {
    const [o, u, f] = v ?? [0, 0, 0];
    return qRotate(q, add(add(scale(A.out, o), scale(F.up, u)), scale(F.fwd, f)));
  };
  // (with the hand's way given, `off` is the palm's middle: the wrist is its own way short of it)
  const palmMid = add(at.p, scale(way(reach.off, at.q), upm));
  const target = reach.hand ? sub(palmMid, scale(unit(way(reach.hand, at.q)), A.palmAt)) : palmMid;
  const cp = acc[bind[A.clav].parent] ?? [0, 0, 0, 1];
  const S = pos[A.shoulder];
  const a = Math.hypot(bind[A.elbow].x - bind[A.shoulder].x, bind[A.elbow].y - bind[A.shoulder].y, bind[A.elbow].z - bind[A.shoulder].z);
  const b = Math.hypot(bind[A.wrist].x - bind[A.elbow].x, bind[A.wrist].y - bind[A.elbow].y, bind[A.wrist].z - bind[A.elbow].z);
  const D = sub(target, S), dist = Math.min(Math.max(Math.hypot(D[0], D[1], D[2]), Math.abs(a - b) + 1e-6), (a + b) * 0.999), Dn = unit(D);
  const elbowIn = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - dist * dist) / (2 * a * b))));
  const atShoulder = Math.acos(Math.max(-1, Math.min(1, (a * a + dist * dist - b * b) / (2 * a * dist))));
  // the elbow's way: given, or out, down and back, in her chest's frame as posed
  const pole = way(reach.elbow ?? [1, -0.6, -0.5], acc[j.chest]);
  let n = sub(pole, scale(Dn, dot(pole, Dn)));
  if (Math.hypot(n[0], n[1], n[2]) < 1e-9) n = way([0, -1, 0], acc[j.chest]);
  n = unit(n);
  const u = add(scale(Dn, Math.cos(atShoulder)), scale(n, Math.sin(atShoulder)));
  const E = add(S, scale(u, a)), e = unit(sub(target, E));
  // in the frame her collarbone hangs from
  const uL = qRotate(qConj(cp), u), eL = qRotate(qConj(cp), e), down = scale(F.up, -1);
  const raise = Math.acos(Math.max(-1, Math.min(1, dot(uL, down))));
  const toward = Math.atan2(dot(uL, F.fwd), dot(uL, A.out));
  const elbow = Math.PI - elbowIn;
  // the arm turned about itself so its elbow bends the forearm toward the target
  const h = add(scale(A.out, Math.cos(toward)), scale(F.fwd, Math.sin(toward)));
  const sw0 = qMul(qAxis(cross(down, h), raise), qArc(A.ub, down));
  const f0 = qRotate(sw0, qRotate(qAxis(A.hinge, elbow - A.kink), A.fb));
  const pf = sub(f0, scale(uL, dot(f0, uL))), pe = sub(eL, scale(uL, dot(eL, uL)));
  const psi = Math.atan2(dot(cross(pf, pe), uL), dot(pf, pe));
  const R = 180 / Math.PI;
  return { raise: raise * R, toward: toward * R, twist: (psi * R) / A.extSign, elbow: elbow * R };
}

/** The rotation taking the frame (a1, a2) onto (b1, b2): each pair's first exactly, its second as near as square to it. */
export function qFromFrames(a1: V, a2: V, b1: V, b2: V): Q {
  const e1 = unit(a1), e2 = square(a2, e1), e3 = cross(e1, e2), f1 = unit(b1), f2 = square(b2, f1), f3 = cross(f1, f2);
  // R = F E^T, as a matrix, then a quaternion
  const m = (r: number, c: number) => f1[r] * e1[c] + f2[r] * e2[c] + f3[r] * e3[c];
  const tr = m(0, 0) + m(1, 1) + m(2, 2);
  let q: Q;
  if (tr > 0) { const k = 0.5 / Math.sqrt(tr + 1); q = [(m(2, 1) - m(1, 2)) * k, (m(0, 2) - m(2, 0)) * k, (m(1, 0) - m(0, 1)) * k, 0.25 / k]; }
  else if (m(0, 0) > m(1, 1) && m(0, 0) > m(2, 2)) { const k = 2 * Math.sqrt(1 + m(0, 0) - m(1, 1) - m(2, 2)); q = [0.25 * k, (m(0, 1) + m(1, 0)) / k, (m(0, 2) + m(2, 0)) / k, (m(2, 1) - m(1, 2)) / k]; }
  else if (m(1, 1) > m(2, 2)) { const k = 2 * Math.sqrt(1 + m(1, 1) - m(0, 0) - m(2, 2)); q = [(m(0, 1) + m(1, 0)) / k, 0.25 * k, (m(1, 2) + m(2, 1)) / k, (m(0, 2) - m(2, 0)) / k]; }
  else { const k = 2 * Math.sqrt(1 + m(2, 2) - m(0, 0) - m(1, 1)); q = [(m(0, 2) + m(2, 0)) / k, (m(1, 2) + m(2, 1)) / k, 0.25 * k, (m(1, 0) - m(0, 1)) / k]; }
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
/** How far `q` turns about unit `axis` (its twist, radians). */
const twistAbout = (q: Q, axis: V) => { let t = 2 * Math.atan2(q[0] * axis[0] + q[1] * axis[1] + q[2] * axis[2], q[3]); if (t > Math.PI) t -= 2 * Math.PI; if (t < -Math.PI) t += 2 * Math.PI; return t; };

/** A reaching hand turned the way its `reach.hand` and `reach.palm` say: the wrist's turn, half the roll in the forearm. */
function orientHand(measure: HumanMeasure, bind: readonly BindJoint[], F: BodyFrame, side: 'L' | 'R', reach: Reach, out: MutableJointTurn[], k0: number): void {
  const A = F.arm[side], j = measure.joints;
  const { acc } = poseChain(bind, out);
  // the frame the reach is written in (as `solveReach` reads it)
  const frameOf: Record<ReachAt, number> = {
    pelvis: j.pelvis, hip: j.pelvis, hipOther: j.pelvis, chest: j.chest, shoulder: j.chest, shoulderOther: j.chest, elbowOther: j.chest, neck: j.chest, head: j.head,
    knee: j.pelvis, kneeOther: j.pelvis,
  };
  const fq = acc[frameOf[reach.at]];
  const way = (v: readonly [number, number, number]): V => qRotate(fq, add(add(scale(A.out, v[0]), scale(F.up, v[1])), scale(F.fwd, v[2])));
  const parent = bind[A.wrist].parent, Ap = acc[parent];
  const handW = unit(way(reach.hand!));
  // the palm: as given, or as it faces now
  const palmNow = qRotate(acc[A.wrist], A.palm), palmW = reach.palm ? way(reach.palm) : palmNow;
  const Q = qFromFrames(A.along, A.palm, handW, palmW);
  let wrist = qMul(qConj(Ap), Q);
  // half its roll about the forearm into the elbow (the forearm turns with the hand)
  const roll = twistAbout(wrist, A.fb) * FOREARM_SHARE;
  const t = out[k0 + 2], elbowNow = qAxis([t.ax, t.ay, t.az], t.radians);
  writeTurn(out[k0 + 2], A.elbow, qMul(elbowNow, qAxis(A.fb, roll)));
  wrist = qMul(qAxis(A.fb, -roll), wrist);
  writeTurn(out[k0 + 3], A.wrist, wrist);
}

/**
 * A pose's reaches worked out into plain angles, for this body: each reaching arm's `raise`, `toward`, `twist` and
 * `elbow` as `poseAngles` solves them, and -- when its hand is turned -- its `pronate`, `wristFlex` and `wristSide` that
 * turn it so (as near as three angles can). For the pose builder: what a finger then moves is a number.
 */
export function resolveReach(measure: HumanMeasure, bind: readonly BindJoint[], angles: BodyAngles, options: AngleOptions = {}): BodyAngles {
  if (!angles.armL?.reach && !angles.armR?.reach) return angles;
  const F = bodyFrame(measure, bind), turns = poseAngles(measure, bind, angles, [], options);
  const { acc } = poseChain(bind, turns), R = 180 / Math.PI;
  const solve = (s: 'L' | 'R'): ArmAngles | undefined => {
    const given = s === 'L' ? angles.armL : angles.armR;
    if (!given?.reach) return given;
    const A = F.arm[s], cp = acc[bind[A.clav].parent] ?? [0, 0, 0, 1];
    // the upper arm's way from her collarbone's frame, as `solveReach` measures it
    const u = qRotate(qConj(cp), unit(sub(qRotate(acc[A.shoulder], A.ub), [0, 0, 0])));
    const down = scale(F.up, -1);
    const raise = Math.acos(Math.max(-1, Math.min(1, dot(u, down)))), toward = Math.atan2(dot(u, F.fwd), dot(u, A.out));
    // its twist and elbow: the rest of the shoulder's turn about the arm, and the elbow's bend
    const h = add(scale(A.out, Math.cos(toward)), scale(F.fwd, Math.sin(toward)));
    const sw0 = qMul(qAxis(cross(down, h), raise), qArc(A.ub, down));
    const shoulderLocal = qMul(qConj(cp), acc[A.shoulder]);
    const twist = twistAbout(qMul(shoulderLocal, qConj(sw0)), u) / A.extSign;
    const fore = qRotate(qConj(acc[A.shoulder]), qRotate(acc[A.elbow], A.fb));
    const elbow = A.kink + Math.atan2(dot(cross(A.fb, fore), A.hinge), dot(A.fb, fore));
    const arm: ArmAngles = { ...given, raise: raise * R, toward: toward * R, twist: twist * R, elbow: elbow * R };
    delete (arm as { reach?: Reach }).reach;
    if (!given.reach.hand) return arm;
    // the hand: the three angles that come nearest the turn it was given (a few steps of Gauss-Newton on the hand's frame)
    const want = qMul(qConj(acc[A.shoulder]), acc[A.wrist]);
    const err = (p: number, f: number, sd: number): number[] => {
      const t = armTurns(F, A, { ...arm, pronate: p, wristFlex: f, wristSide: sd });
      const got = qMul(t.elbow, t.wrist), a1 = qRotate(got, A.along), a2 = qRotate(got, A.palm), b1 = qRotate(want, A.along), b2 = qRotate(want, A.palm);
      return [...sub(a1, b1), ...sub(a2, b2)];
    };
    let x = [0, 0, 0];
    for (let it = 0; it < 12; it += 1) {
      const e0 = err(x[0], x[1], x[2]), J: number[][] = [];
      for (let c = 0; c < 3; c += 1) { const d = [...x]; d[c] += 0.5; const e1 = err(d[0], d[1], d[2]); J.push(e1.map((v, i) => (v - e0[i]) / 0.5)); }
      // normal equations (3 x 3)
      const N = [0, 1, 2].map((r) => [0, 1, 2].map((c) => J[r].reduce((acc2, v, i) => acc2 + v * J[c][i], 0) + (r === c ? 1e-6 : 0)));
      const g = [0, 1, 2].map((r) => -J[r].reduce((acc2, v, i) => acc2 + v * e0[i], 0));
      const det = (M: number[][]) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
      const D = det(N); if (Math.abs(D) < 1e-12) break;
      const col = (c: number) => N.map((row, r) => row.map((v, cc) => (cc === c ? g[r] : v)));
      const step = [0, 1, 2].map((c) => det(col(c)) / D);
      x = x.map((v, c) => Math.max(-180, Math.min(180, v + step[c])));
      if (Math.hypot(...step) < 1e-3) break;
    }
    return { ...arm, pronate: x[0], wristFlex: x[1], wristSide: x[2] };
  };
  return { ...angles, armL: solve('L'), armR: solve('R') };
}

/**
 * A body in `angles`: its turns, written into `out` (grown to BODY_ANGLE_TURNS) and returned. Not held to any range:
 * the owner holds it (`JointLimits.limit`), as every other pose is.
 */
export function poseAngles(measure: HumanMeasure, bind: readonly BindJoint[], angles: BodyAngles, out: MutableJointTurn[] = [], options: AngleOptions = {}): readonly JointTurn[] {
  while (out.length < BODY_ANGLE_TURNS) out.push(newJointTurn());
  const F = bodyFrame(measure, bind), j = measure.joints, L = F.limits;
  const chain = (where: 'back' | 'neck', b: Bend3 | undefined, share: readonly [number, number]): [Q, Q] => {
    const whole = L.compose(where, b?.flex ?? 0, (b?.side ?? 0) * F.sideSign, (b?.twist ?? 0) * F.twistSign);
    return [qPow(whole, share[0]), qPow(whole, share[1])];
  };
  const [spine, chest] = chain('back', angles.back, BACK_SHARE);
  const [neck, head] = chain('neck', angles.neck, NECK_SHARE);
  writeTurn(out[0], j.spine, spine); writeTurn(out[1], j.chest, chest);
  writeTurn(out[2], j.neck, neck); writeTurn(out[3], j.head, head);
  // the legs first, then the arms: a hand that reaches for her own body reaches for it as posed
  let k = 12;
  for (const s of ['L', 'R'] as const) {
    const g = (s === 'L' ? angles.legL : angles.legR) ?? {};
    writeTurn(out[k++], s === 'L' ? j.hipL : j.hipR, L.compose(s === 'L' ? 'hipL' : 'hipR', g.flex ?? 0, g.abduct ?? 0, g.twist ?? 0));
    writeTurn(out[k++], s === 'L' ? j.kneeL : j.kneeR, L.compose(s === 'L' ? 'kneeL' : 'kneeR', g.knee ?? 0));
    writeTurn(out[k++], s === 'L' ? j.ankleL : j.ankleR, L.compose(s === 'L' ? 'ankleL' : 'ankleR', g.ankle ?? 0, 0, (g.ankleIn ?? 0) * F.inSign[s]));
  }
  const upm = options.unitsPerMetre ?? 1;
  // the arms: each at its bind first, then those given by their angles, then those that reach (for her own body as posed,
  // the other arm among it)
  const slot = (s: 'L' | 'R') => (s === 'L' ? 4 : 8);
  for (const s of ['L', 'R'] as const) { const A = F.arm[s]; [A.clav, A.shoulder, A.elbow, A.wrist].forEach((jt, i) => writeTurn(out[slot(s) + i], jt, [0, 0, 0, 1])); }
  const write = (s: 'L' | 'R', a: ArmAngles) => {
    const A = F.arm[s], t = armTurns(F, A, a), k0 = slot(s);
    writeTurn(out[k0], A.clav, t.clav); writeTurn(out[k0 + 1], A.shoulder, t.shoulder);
    writeTurn(out[k0 + 2], A.elbow, t.elbow); writeTurn(out[k0 + 3], A.wrist, t.wrist);
  };
  const armOf = (s: 'L' | 'R') => (s === 'L' ? angles.armL : angles.armR) ?? {};
  for (const s of ['L', 'R'] as const) if (!armOf(s).reach) write(s, armOf(s));
  for (const s of ['L', 'R'] as const) {
    const given = armOf(s);
    if (!given.reach) continue;
    // solved with the collarbone at its bind, then once more with it lifted by the solved raise
    let a: ArmAngles = { ...given, ...solveReach(measure, bind, F, s, given.reach, out, upm) };
    if (a.raise! > SHRUG.from) { writeTurn(out[slot(s)], F.arm[s].clav, armTurns(F, F.arm[s], a).clav); a = { ...given, ...solveReach(measure, bind, F, s, given.reach, out, upm) }; }
    write(s, a);
    if (given.reach.hand) orientHand(measure, bind, F, s, given.reach, out, slot(s));
  }
  if (out.length !== BODY_ANGLE_TURNS) out.length = BODY_ANGLE_TURNS;
  return out;
}

/** `a` and `b` mixed `t` of the way (0 a, 1 b), every angle on a straight line; a field one of them leaves out is 0 there
 * (the arm's `raise`, when either gives it, is the other's or 0). For a move between two poses. */
export function mixAngles(a: BodyAngles, b: BodyAngles, t: number): BodyAngles {
  const m = (x: number | undefined, y: number | undefined) => (x === undefined && y === undefined ? undefined : (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t);
  const obj = <T extends object>(x: T | undefined, y: T | undefined): T | undefined => {
    if (!x && !y) return undefined;
    const keys = new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})]);
    const o: Record<string, number> = {};
    for (const key of keys) {
      if (key === 'reach') continue;
      const v = m((x as Record<string, number> | undefined)?.[key], (y as Record<string, number> | undefined)?.[key]); if (v !== undefined) o[key] = v;
    }
    const rx = (x as ArmAngles | undefined)?.reach, ry = (y as ArmAngles | undefined)?.reach;
    if (rx || ry) (o as unknown as { reach: Reach }).reach = mixReach(rx, ry, t);
    return o as T;
  };
  return { back: obj(a.back, b.back), neck: obj(a.neck, b.neck), armL: obj(a.armL, b.armL), armR: obj(a.armR, b.armR), legL: obj(a.legL, b.legL), legR: obj(a.legR, b.legR) };
}

/** Two reaches mixed: the same joint, its offset and elbow on a straight line; another joint, whichever is nearer. */
function mixReach(a: Reach | undefined, b: Reach | undefined, t: number): Reach {
  if (!a) return b!;
  if (!b || a.at !== b.at) return t < 0.5 || !b ? a : b;
  const v3 = (p?: readonly [number, number, number], q?: readonly [number, number, number]): [number, number, number] | undefined => {
    if (!p && !q) return undefined;
    const x = p ?? [0, 0, 0], y = q ?? [0, 0, 0];
    return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
  };
  const off = v3(a.off, b.off), elbow = v3(a.elbow ?? [1, -0.6, -0.5], b.elbow ?? [1, -0.6, -0.5]);
  return { at: a.at, ...(off ? { off } : {}), ...(elbow ? { elbow } : {}) };
}

/** `a` with her left and right swapped: a pose on her left side made one on her right. */
export function mirrorAngles(a: BodyAngles): BodyAngles {
  const bend = (b?: Bend3): Bend3 | undefined => b && { ...b, ...(b.side !== undefined ? { side: -b.side } : {}), ...(b.twist !== undefined ? { twist: -b.twist } : {}) };
  return { back: bend(a.back), neck: bend(a.neck), armL: a.armR, armR: a.armL, legL: a.legR, legR: a.legL };
}
