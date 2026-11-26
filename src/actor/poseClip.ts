/**
 * A MOVE BETWEEN POSES (Joshua, 2026-11-26: "copy and import Beyond Extinction's animation/pose builder in CCBS so I can
 * save my own poses and animations and upload to you to save in the Repo, then you can just do animations between
 * different poses"). A clip is a line of KEYS on a timeline, each a pose (`PoseSpec`, or a library pose by its id) at a
 * time; between two keys her angles go on a straight line in degrees (`bodyAngles.mixAngles`) and her body's turn as a
 * whole with them, eased in and out of each key (`ease`). Like Beyond Extinction's Animation Editor (`AnimationEditor.ts`,
 * `AnimStore.ts`), but keyed by what each joint is (`bodyAngles.ts`), not by a rig's bone names: a clip made on the
 * female base model plays on the male and in any game that reads these numbers.
 *
 * What holds her may change on the way (standing to sitting): a clip says it at each key, and between two keys the room
 * moves her from the one's place to the other's.
 *
 * Pure: no three, no DOM.
 */
import { mixAngles, type BodyAngles } from './bodyAngles';
import { anglesAt, type PoseSpec, type PoseSupport } from './poseLibrary';

export interface PoseKey {
  /** seconds from the clip's start */
  readonly t: number;
  /** the pose: written out, or a library pose's id */
  readonly pose: PoseSpec | string;
  /** how she comes into this key from the one before: 'smooth' (eased in and out, the default) or 'linear' */
  readonly ease?: 'smooth' | 'linear';
}
export interface PoseClip {
  readonly id: string;
  readonly name: string;
  readonly tags?: readonly string[];
  /** played round and round (the last key back to the first) */
  readonly loop?: boolean;
  readonly keys: readonly PoseKey[];
}

/** Where a clip is at a time: her angles, her body's turn, and the two keys and how far between them. */
export interface ClipSample {
  readonly angles: BodyAngles;
  readonly body: { readonly yaw: number; readonly pitch: number; readonly roll: number };
  /** the key before and the key after (the same at either end), and the share of the way (0 .. 1, eased) */
  readonly from: number; readonly to: number; readonly share: number;
  readonly support: PoseSupport; readonly seat: number;
}

export const clipLength = (clip: PoseClip): number => (clip.keys.length ? clip.keys[clip.keys.length - 1].t : 0);
const smooth = (x: number) => x * x * (3 - 2 * x);

/** A key's pose, its id looked up. */
export function keyPose(key: PoseKey, lookup: (id: string) => PoseSpec | undefined): PoseSpec | null {
  return typeof key.pose === 'string' ? lookup(key.pose) ?? null : key.pose;
}

/** The clip at `t` seconds (held at its ends; round again if it loops), her belly `bump` (0 .. 2). */
export function sampleClip(clip: PoseClip, t: number, lookup: (id: string) => PoseSpec | undefined, bump = 0): ClipSample | null {
  const keys = clip.keys.filter((k) => keyPose(k, lookup));
  if (!keys.length) return null;
  const length = keys[keys.length - 1].t;
  const at = clip.loop && length > 0 ? ((t % length) + length) % length : Math.min(Math.max(t, keys[0].t), length);
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= at) i += 1;
  const j = Math.min(i + 1, keys.length - 1);
  const a = keyPose(keys[i], lookup)!, b = keyPose(keys[j], lookup)!;
  const span = keys[j].t - keys[i].t, raw = span > 1e-6 ? Math.min(1, Math.max(0, (at - keys[i].t) / span)) : 0;
  const share = keys[j].ease === 'linear' ? raw : smooth(raw);
  const turn = (p: PoseSpec) => ({ yaw: p.body?.yaw ?? 0, pitch: p.body?.pitch ?? 0, roll: p.body?.roll ?? 0 });
  const ta = turn(a), tb = turn(b);
  return {
    angles: mixAngles(anglesAt(a, bump), anglesAt(b, bump), share),
    body: { yaw: ta.yaw + (tb.yaw - ta.yaw) * share, pitch: ta.pitch + (tb.pitch - ta.pitch) * share, roll: ta.roll + (tb.roll - ta.roll) * share },
    from: clip.keys.indexOf(keys[i]), to: clip.keys.indexOf(keys[j]), share,
    support: share < 0.5 ? a.support : b.support, seat: share < 0.5 ? a.seat ?? 0 : b.seat ?? 0,
  };
}

/** A clip's sample as a pose of its own, for `poseLibrary.posePose`. */
export function sampleAsPose(clip: PoseClip, s: ClipSample): PoseSpec {
  return { id: `${clip.id}@`, name: clip.name, sheet: 'clip', ref: clip.id, tags: clip.tags ?? [], support: s.support, seat: s.seat, body: s.body, angles: s.angles, contacts: [] };
}
