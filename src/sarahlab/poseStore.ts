/**
 * HER OWN POSES AND CLIPS, kept on the device, and the file he sends (Joshua, 2026-11-26: "save my own poses and
 * animations and upload to you to save in the Repo"). Poses are `PoseSpec`s and clips `PoseClip`s as the library reads
 * them, so a pose made here plays on either body and in any game. A file is read strictly: it comes from a phone's
 * download folder, so nothing in it is trusted. Plain data: no three, no DOM.
 */
import type { ArmAngles, BodyAngles, Reach, ReachAt } from '../actor/bodyAngles';
import type { PoseClip, PoseKey } from '../actor/poseClip';
import type { PoseProp, PoseSpec, PoseSupport } from '../actor/poseLibrary';

export const POSE_FILE_FORMAT = 'ccbs-poses';
export const POSE_FILE_VERSION = 1;
export const POSE_STORE_KEY = 'ccbs-pose-builder-v1';
/** Angles are held to a turn either way: a file with 9000 degrees is a mistake, not a pose. */
const ANGLE_LIMIT = 360;

const SUPPORTS: readonly PoseSupport[] = ['feet', 'seat', 'floor'];
const REACH_AT: readonly ReachAt[] = ['pelvis', 'hip', 'hipOther', 'chest', 'shoulder', 'shoulderOther', 'elbowOther', 'neck', 'head', 'knee', 'kneeOther'];
const PROP_KINDS: readonly PoseProp['kind'][] = ['phone', 'tablet', 'stool', 'mug', 'book'];
const BEND_KEYS = ['flex', 'side', 'twist'] as const;
const ARM_KEYS = ['raise', 'toward', 'twist', 'elbow', 'pronate', 'wristFlex', 'wristSide'] as const;
const LEG_KEYS = ['flex', 'abduct', 'twist', 'knee', 'ankle', 'ankleIn'] as const;

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isText = (x: unknown): x is string => typeof x === 'string';
const clampAngle = (n: number): number => Math.min(ANGLE_LIMIT, Math.max(-ANGLE_LIMIT, n));

/** The numbers named in `keys`, each finite and clamped; undefined when any is not a number. */
function readNumbers(x: unknown, keys: readonly string[]): Obj | undefined | null {
  if (x === undefined) return undefined;
  if (!isObj(x)) return null;
  const out: Obj = {};
  for (const k of keys) {
    if (x[k] === undefined) continue;
    if (!isNum(x[k])) return null;
    out[k] = clampAngle(x[k] as number);
  }
  return out;
}
function readVec3(x: unknown): [number, number, number] | undefined | null {
  if (x === undefined) return undefined;
  if (!Array.isArray(x) || x.length !== 3 || !x.every(isNum)) return null;
  return [x[0], x[1], x[2]];
}
function readReach(x: unknown): Reach | undefined | null {
  if (x === undefined) return undefined;
  if (!isObj(x) || !REACH_AT.includes(x.at as ReachAt)) return null;
  const off = readVec3(x.off), elbow = readVec3(x.elbow);
  if (off === null || elbow === null) return null;
  return { at: x.at as ReachAt, ...(off ? { off } : {}), ...(elbow ? { elbow } : {}) };
}
function readArm(x: unknown): ArmAngles | undefined | null {
  const n = readNumbers(x, ARM_KEYS);
  if (!n) return n;
  const reach = readReach((x as Obj).reach);
  return reach === null ? null : ({ ...n, ...(reach ? { reach } : {}) } as ArmAngles);
}
function readAngles(x: unknown): BodyAngles | null {
  if (!isObj(x)) return null;
  const back = readNumbers(x.back, BEND_KEYS), neck = readNumbers(x.neck, BEND_KEYS);
  const legL = readNumbers(x.legL, LEG_KEYS), legR = readNumbers(x.legR, LEG_KEYS);
  const armL = readArm(x.armL), armR = readArm(x.armR);
  if ([back, neck, legL, legR, armL, armR].includes(null)) return null;
  const out: Record<string, unknown> = { back, neck, armL, armR, legL, legR };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as BodyAngles;
}
function readTurn(x: unknown): { yaw?: number; pitch?: number; roll?: number } | undefined | null {
  const n = readNumbers(x, ['yaw', 'pitch', 'roll']);
  return n as { yaw?: number; pitch?: number; roll?: number } | undefined | null;
}

/** A pose from untrusted JSON: null unless every part of it is what it should be. */
export function readPose(x: unknown): PoseSpec | null {
  if (!isObj(x) || !isText(x.id) || !x.id || !isText(x.name) || !SUPPORTS.includes(x.support as PoseSupport)) return null;
  const angles = readAngles(x.angles);
  if (!angles) return null;
  const body = readTurn(x.body), bumpBody = readTurn(x.bumpBody);
  if (body === null || bumpBody === null) return null;
  let bump: BodyAngles | undefined;
  if (x.bump !== undefined) { const b = readAngles(x.bump); if (!b) return null; bump = b; }
  if (x.seat !== undefined && !isNum(x.seat)) return null;
  if (x.sheet !== undefined && !isText(x.sheet)) return null;
  if (x.ref !== undefined && !isText(x.ref)) return null;
  if (x.note !== undefined && !isText(x.note)) return null;
  let tags: string[] = [], contacts: string[] = [];
  if (x.tags !== undefined) { if (!Array.isArray(x.tags) || !x.tags.every(isText)) return null; tags = [...x.tags]; }
  if (x.contacts !== undefined) { if (!Array.isArray(x.contacts) || !x.contacts.every(isText)) return null; contacts = [...x.contacts]; }
  let props: PoseProp[] | undefined;
  if (x.props !== undefined) {
    if (!Array.isArray(x.props)) return null;
    props = [];
    for (const p of x.props) {
      if (!isObj(p) || !PROP_KINDS.includes(p.kind as PoseProp['kind']) || (p.hand !== undefined && p.hand !== 'L' && p.hand !== 'R')) return null;
      props.push({ kind: p.kind as PoseProp['kind'], ...(p.hand ? { hand: p.hand as 'L' | 'R' } : {}) });
    }
  }
  return {
    id: x.id, name: x.name, sheet: (x.sheet as string | undefined) ?? 'mine', ref: (x.ref as string | undefined) ?? '', tags,
    support: x.support as PoseSupport, ...(body ? { body } : {}), angles, ...(bump ? { bump } : {}), ...(bumpBody ? { bumpBody } : {}),
    contacts, ...(x.seat !== undefined ? { seat: x.seat as number } : {}), ...(props ? { props } : {}), ...(x.note !== undefined ? { note: x.note as string } : {}),
  };
}

/** A clip from untrusted JSON: its keys sorted by time, each a pose written out or a library pose's id. */
export function readClip(x: unknown): PoseClip | null {
  if (!isObj(x) || !isText(x.id) || !x.id || !isText(x.name) || !Array.isArray(x.keys)) return null;
  if (x.loop !== undefined && typeof x.loop !== 'boolean') return null;
  let tags: string[] | undefined;
  if (x.tags !== undefined) { if (!Array.isArray(x.tags) || !x.tags.every(isText)) return null; tags = [...x.tags]; }
  const keys: PoseKey[] = [];
  for (const k of x.keys) {
    if (!isObj(k) || !isNum(k.t) || k.t < 0) return null;
    if (k.ease !== undefined && k.ease !== 'smooth' && k.ease !== 'linear') return null;
    let pose: PoseSpec | string;
    if (isText(k.pose)) { if (!k.pose) return null; pose = k.pose; } else { const p = readPose(k.pose); if (!p) return null; pose = p; }
    keys.push({ t: k.t, pose, ...(k.ease ? { ease: k.ease as 'smooth' | 'linear' } : {}) });
  }
  keys.sort((a, b) => a.t - b.t);
  return { id: x.id, name: x.name, ...(tags ? { tags } : {}), ...(x.loop !== undefined ? { loop: x.loop as boolean } : {}), keys };
}

/** A name as an id's tail: a-z, 0-9 and '-', 40 at most, never empty. */
export function slugOf(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  return s || 'pose';
}

export interface PoseStore {
  poses(): readonly PoseSpec[];
  clips(): readonly PoseClip[];
  savePose(p: PoseSpec): PoseSpec;
  removePose(id: string): void;
  saveClip(c: PoseClip): PoseClip;
  removeClip(id: string): void;
  exportJson(): string;
  importJson(text: string): { poses: number; clips: number; errors: string[] };
}

export function safeLocalStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

/** An id that keeps its own prefix (saving it again replaces), else made from the name and made unique among the others. */
function idFor(prefix: string, id: string, name: string, taken: (id: string) => boolean): string {
  if (id.startsWith(prefix)) return id;
  const base = `${prefix}${slugOf(name || id)}`;
  let out = base, n = 2;
  while (taken(out)) out = `${base}-${n++}`;
  return out;
}

export function createPoseStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage()): PoseStore {
  let poses: PoseSpec[] = [], clips: PoseClip[] = [];
  try {
    const text = storage?.getItem(POSE_STORE_KEY);
    if (text) {
      const data = JSON.parse(text) as Obj;
      if (isObj(data)) {
        poses = (Array.isArray(data.poses) ? data.poses : []).map(readPose).filter((p): p is PoseSpec => !!p);
        clips = (Array.isArray(data.clips) ? data.clips : []).map(readClip).filter((c): c is PoseClip => !!c);
      }
    }
  } catch { /* nothing kept, or unreadable: start empty */ }

  const persist = (): void => {
    try { storage?.setItem(POSE_STORE_KEY, JSON.stringify({ poses, clips })); } catch { /* kept for this session only */ }
  };
  const put = <T extends { id: string }>(list: T[], item: T): void => {
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item; else list.push(item);
  };
  const savePose = (p: PoseSpec, save = true): PoseSpec => {
    const id = idFor('mine-', p.id, p.name, (t) => poses.some((x) => x.id === t));
    const saved: PoseSpec = { ...p, id, sheet: 'mine' };
    put(poses, saved);
    if (save) persist();
    return saved;
  };
  const saveClip = (c: PoseClip, save = true): PoseClip => {
    const id = idFor('clip-', c.id, c.name, (t) => clips.some((x) => x.id === t));
    const saved: PoseClip = { ...c, id };
    put(clips, saved);
    if (save) persist();
    return saved;
  };
  return {
    poses: () => poses,
    clips: () => clips,
    savePose,
    saveClip,
    removePose(id) { poses = poses.filter((p) => p.id !== id); persist(); },
    removeClip(id) { clips = clips.filter((c) => c.id !== id); persist(); },
    exportJson: () => JSON.stringify({ format: POSE_FILE_FORMAT, version: POSE_FILE_VERSION, poses, clips }, null, 2),
    importJson(text) {
      const result = { poses: 0, clips: 0, errors: [] as string[] };
      let data: unknown;
      try { data = JSON.parse(text); } catch { result.errors.push('not a JSON file'); return result; }
      let rawPoses: unknown[], rawClips: unknown[] = [];
      if (Array.isArray(data)) rawPoses = data;
      else if (isObj(data) && data.format === POSE_FILE_FORMAT) {
        if (data.version !== POSE_FILE_VERSION) { result.errors.push(`version ${String(data.version)} is not one this reads`); return result; }
        rawPoses = Array.isArray(data.poses) ? data.poses : [];
        rawClips = Array.isArray(data.clips) ? data.clips : [];
      } else { result.errors.push('not a pose file'); return result; }
      rawPoses.forEach((x, i) => { const p = readPose(x); if (p) { savePose(p, false); result.poses += 1; } else result.errors.push(`pose ${i + 1} refused`); });
      rawClips.forEach((x, i) => { const c = readClip(x); if (c) { saveClip(c, false); result.clips += 1; } else result.errors.push(`clip ${i + 1} refused`); });
      persist();
      return result;
    },
  };
}
