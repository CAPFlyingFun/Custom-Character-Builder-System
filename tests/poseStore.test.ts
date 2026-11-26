/**
 * HER OWN POSES AND CLIPS (src/sarahlab/poseStore.ts; Joshua, 2026-11-26: "save my own poses and animations and upload
 * to you to save in the Repo"): a file is read strictly, ids stay unique, and the store works with no storage.
 */
import { describe, expect, it } from 'vitest';
import type { PoseClip } from '../src/actor/poseClip';
import type { PoseSpec } from '../src/actor/poseLibrary';
import { POSE_FILE_FORMAT, createPoseStore, readClip, readPose, slugOf } from '../src/sarahlab/poseStore';

const pose = (over: Record<string, unknown> = {}): PoseSpec => ({
  id: 'x', name: 'Wave', sheet: 'mine', ref: 'built in the room', tags: ['mine'], support: 'feet', body: { yaw: 10, pitch: 0, roll: 0 },
  angles: { armL: { raise: 90, elbow: 40, reach: { at: 'head', off: [0, 0.1, 0.05] } }, legR: { knee: 20 }, back: { flex: 5 } }, contacts: [], ...over,
}) as PoseSpec;
const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('reading', () => {
  it('accepts a good pose and drops unknown keys', () => {
    const p = readPose({ ...pose(), junk: 1, angles: { back: { flex: 5, bogus: 3 }, extra: {} } });
    expect(p).not.toBeNull();
    expect(p!.angles).toEqual({ back: { flex: 5 } });
    expect((p as unknown as Record<string, unknown>).junk).toBeUndefined();
  });
  it('keeps a reach and clamps angles', () => {
    const p = readPose(pose({ angles: { armR: { raise: 9000, reach: { at: 'hip', elbow: [0, 0, 1] } } } }))!;
    expect(p.angles.armR!.raise).toBe(360);
    expect(p.angles.armR!.reach).toEqual({ at: 'hip', elbow: [0, 0, 1] });
  });
  it('refuses what is not valid', () => {
    expect(readPose(null)).toBeNull();
    expect(readPose(pose({ support: 'hover' }))).toBeNull();
    expect(readPose(pose({ id: '' }))).toBeNull();
    expect(readPose(pose({ angles: { back: { flex: NaN } } }))).toBeNull();
    expect(readPose(pose({ angles: { back: { flex: Infinity } } }))).toBeNull();
    expect(readPose(pose({ angles: { armL: { reach: { at: 'moon' } } } }))).toBeNull();
    expect(readPose(pose({ angles: { armL: { reach: { at: 'head', off: [0, NaN, 0] } } } }))).toBeNull();
    expect(readPose(pose({ angles: { armL: { reach: { at: 'head', off: [0, 1] } } } }))).toBeNull();
    expect(readPose(pose({ body: { yaw: 'a' } }))).toBeNull();
  });
  it('reads a clip, sorts its keys, and refuses bad ones', () => {
    const c = readClip({ id: 'c', name: 'C', keys: [{ t: 2, pose: 'core-01' }, { t: 0, pose: pose() }] })!;
    expect(c.keys.map((k) => k.t)).toEqual([0, 2]);
    expect(readClip({ id: 'c', name: 'C', keys: [{ t: -1, pose: 'core-01' }] })).toBeNull();
    expect(readClip({ id: 'c', name: 'C', keys: [{ t: 0, pose: '' }] })).toBeNull();
    expect(readClip({ id: 'c', name: 'C', keys: [{ t: 0, pose: pose({ support: 'x' }) }] })).toBeNull();
    expect(readClip({ id: 'c', name: 'C', keys: [{ t: NaN, pose: 'a' }] })).toBeNull();
    expect(readClip({ id: 'c', name: 'C' })).toBeNull();
  });
  it('slugs are short, plain and never empty', () => {
    expect(slugOf('Hello, World!')).toBe('hello-world');
    expect(slugOf('???')).toBe('pose');
    expect(slugOf('a'.repeat(100)).length).toBe(40);
  });
});

describe('the store', () => {
  it('names a pose mine-<slug>, makes it unique, and replaces the same id', () => {
    const s = createPoseStore(memory());
    const a = s.savePose(pose({ id: 'core-01' })), b = s.savePose(pose({ id: 'core-02' }));
    expect(a.id).toBe('mine-wave');
    expect(b.id).toBe('mine-wave-2');
    expect(a.sheet).toBe('mine');
    s.savePose({ ...a, name: 'Wave again' });
    expect(s.poses()).toHaveLength(2);
    expect(s.poses()[0].name).toBe('Wave again');
    s.removePose('mine-wave-2');
    expect(s.poses()).toHaveLength(1);
  });
  it('clips are clip-<slug>', () => {
    const s = createPoseStore(memory());
    const clip: PoseClip = { id: 'new', name: 'My Move', keys: [{ t: 0, pose: 'a' }, { t: 1, pose: 'b' }] };
    expect(s.saveClip(clip).id).toBe('clip-my-move');
    expect(s.saveClip(clip).id).toBe('clip-my-move-2');
  });
  it('keeps what it is given on the device', () => {
    const m = memory();
    createPoseStore(m).savePose(pose());
    expect(createPoseStore(m).poses()).toHaveLength(1);
  });
  it('round-trips through the file into a fresh store', () => {
    const s = createPoseStore(memory());
    s.savePose(pose()); s.savePose(pose({ name: 'Sit', support: 'seat', seat: 0.5 }));
    s.saveClip({ id: 'c', name: 'Go', loop: true, keys: [{ t: 0, pose: 'core-01' }, { t: 1.5, pose: pose(), ease: 'linear' }] });
    const text = s.exportJson();
    expect(JSON.parse(text).format).toBe(POSE_FILE_FORMAT);
    const t = createPoseStore(memory());
    expect(t.importJson(text)).toEqual({ poses: 2, clips: 1, errors: [] });
    expect(t.poses()).toEqual(s.poses());
    expect(t.clips()).toEqual(s.clips());
  });
  it('imports a bare array and lists what it refuses', () => {
    const s = createPoseStore(memory());
    const r = s.importJson(JSON.stringify([pose(), pose({ support: 'no' }), 5]));
    expect(r.poses).toBe(1);
    expect(r.errors).toHaveLength(2);
    expect(s.importJson('not json').errors).toHaveLength(1);
    expect(s.importJson('{"format":"other"}').poses).toBe(0);
  });
  it('works for the session when storage throws or is missing', () => {
    const bad = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    for (const storage of [bad, null]) {
      const s = createPoseStore(storage);
      s.savePose(pose());
      expect(s.poses()).toHaveLength(1);
      expect(s.importJson(s.exportJson()).poses).toBe(1);
    }
  });
});
