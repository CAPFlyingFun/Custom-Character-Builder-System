// @vitest-environment jsdom
/**
 * THE POSE BUILDER (src/sarahlab/poseBuilderPanel.ts; Joshua, 2026-11-26: "copy and import Beyond Extinction's
 * animation/pose builder in CCBS so I can save my own poses and animations"): sliders, keys, saves and the file, on fake
 * hooks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PoseBuilderPanel, POSE_BUILDER_ACTION as A, POSE_BUILDER_FIELD as F, type BuilderDraft, type PoseBuilderHooks } from '../src/sarahlab/poseBuilderPanel';
import { createPoseStore } from '../src/sarahlab/poseStore';

const START: BuilderDraft = { name: 'now', support: 'feet', seat: 0.45, body: { yaw: 0, pitch: 0, roll: 0 }, angles: { armL: { raise: 30, reach: { at: 'head' } }, legL: { knee: 40 }, back: { flex: 10 } } };
const panels: PoseBuilderPanel[] = [];
afterEach(() => { for (const p of panels.splice(0)) p.dispose(); document.body.replaceChildren(); });

function setup() {
  const store = createPoseStore(null);
  const show = vi.fn<(d: BuilderDraft) => void>(), scrub = vi.fn(), play = vi.fn(), download = vi.fn();
  const hooks: PoseBuilderHooks = { startFrom: () => JSON.parse(JSON.stringify(START)) as BuilderDraft, show, play, playing: () => null, scrub, store, library: () => [], download };
  const panel = new PoseBuilderPanel(hooks);
  panels.push(panel);
  document.body.appendChild(panel.root);
  return { panel, root: panel.root, show, scrub, play, download, store };
}
const tap = (root: HTMLElement, action: string) => { const b = root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!; expect(b, action).toBeTruthy(); b.click(); };
const slider = (root: HTMLElement, field: string) => root.querySelector<HTMLInputElement>(`[data-field="${field}"] + input`)!;
const slide = (input: HTMLInputElement, v: number) => { input.value = String(v); input.dispatchEvent(new Event('input', { bubbles: true })); };
const start = (h: ReturnType<typeof setup>) => tap(h.root, A.start);
const last = (show: { mock: { calls: BuilderDraft[][] } }) => show.mock.calls[show.mock.calls.length - 1][0];

describe('sliders', () => {
  it('a move calls show with only that angle changed', () => {
    const h = setup(); start(h);
    tap(h.root, `${A.part}back`);
    slide(slider(h.root, F['back-twist']), 20);
    const d = last(h.show);
    expect(d.angles.back).toEqual({ flex: 10, twist: 20 });
    expect(d.angles.legL).toEqual({ knee: 40 });
    expect(F.line).toBeTruthy();
  });
  it('an arm slider drops the reach and keeps the numbers', () => {
    const h = setup(); start(h);
    tap(h.root, `${A.part}armL`);
    slide(slider(h.root, F['armL-elbow']), 90);
    const arm = last(h.show).angles.armL!;
    expect(arm.reach).toBeUndefined();
    expect(arm).toMatchObject({ raise: 30, elbow: 90, toward: 0, twist: 0 });
  });
  it('±5 and reset work, held to the range', () => {
    const h = setup(); start(h);
    tap(h.root, `${A.part}legL`);
    tap(h.root, `${A.step}legL-knee:5`);
    expect(last(h.show).angles.legL!.knee).toBe(45);
    tap(h.root, `${A.step}legL-knee:-5`); tap(h.root, `${A.step}legL-knee:-5`);
    expect(last(h.show).angles.legL!.knee).toBe(35);
    tap(h.root, `${A.reset}legL-knee`);
    expect(last(h.show).angles.legL!.knee).toBe(0);
    slide(slider(h.root, F['legL-knee']), 150); tap(h.root, `${A.step}legL-knee:5`);
    expect(last(h.show).angles.legL!.knee).toBe(150);
  });
  it('shows its line in degrees', () => {
    const h = setup(); start(h);
    tap(h.root, `${A.part}armL`);
    expect(h.root.querySelector(`[data-field="${F['armL-raise']}"]`)!.textContent).toBe('RAISE · 30°');
  });
  it('copies a limb to the other side and swaps sides', () => {
    const h = setup(); start(h);
    tap(h.root, `${A.part}legL`); tap(h.root, `${A.mirror}legL`);
    expect(last(h.show).angles.legR).toEqual({ knee: 40 });
    h.panel.setDraft({ ...START, body: { yaw: 30, pitch: 5, roll: -10 }, angles: { armL: { raise: 80 }, back: { side: 12 } } });
    tap(h.root, `${A.mirror}body`);
    const d = last(h.show);
    expect(d.angles.armR).toEqual({ raise: 80 });
    expect(d.angles.armL).toBeUndefined();
    expect(d.angles.back).toEqual({ side: -12 });
    expect(d.body).toEqual({ yaw: -30, pitch: 5, roll: 10 });
  });
  it('shows the seat height slider only for SEAT', () => {
    const h = setup();
    const line = h.root.querySelector<HTMLElement>(`[data-field="${F.seat}"]`)!;
    expect(line.style.display).toBe('none');
    tap(h.root, `${A.support}seat`);
    expect(line.style.display).toBe('block');
    expect(last(h.show).support).toBe('seat');
  });
});

describe('saving', () => {
  it('SAVE POSE stores a pose from the draft', () => {
    const h = setup(); start(h);
    h.panel.root.querySelector<HTMLInputElement>(`[data-field="${F.name}"]`)!.value = 'My Squat';
    h.panel.root.querySelector<HTMLInputElement>(`[data-field="${F.name}"]`)!.dispatchEvent(new Event('input'));
    tap(h.root, A.savePose);
    const p = h.store.poses()[0];
    expect(p).toMatchObject({ id: 'mine-my-squat', name: 'My Squat', sheet: 'mine', ref: 'built in the room', tags: ['mine'], contacts: [], support: 'feet' });
    expect(p.angles.legL).toEqual({ knee: 40 });
    expect(h.root.querySelector(`[data-action="${A.loadPose}mine-my-squat"]`)).toBeTruthy();
  });
  it('a saved pose loads back and × needs a second tap', () => {
    const h = setup(); start(h); tap(h.root, A.savePose);
    tap(h.root, `${A.part}legL`); slide(slider(h.root, F['legL-knee']), 99);
    tap(h.root, `${A.loadPose}mine-now`);
    expect(last(h.show).angles.legL!.knee).toBe(40);
    tap(h.root, `${A.removePose}mine-now`);
    expect(h.store.poses()).toHaveLength(1);
    tap(h.root, `${A.removePose}mine-now`);
    expect(h.store.poses()).toHaveLength(0);
  });
  it('two keys and SAVE CLIP store a clip at 0 s and 1 s; one key says no', () => {
    const h = setup(); start(h);
    tap(h.root, A.addKey); tap(h.root, A.saveClip);
    expect(h.store.clips()).toHaveLength(0);
    expect(h.root.querySelector(`[data-field="${F.line}"]`)!.textContent).toContain('2 KEYS');
    tap(h.root, A.addKey); tap(h.root, A.saveClip);
    const c = h.store.clips()[0];
    expect(c.keys.map((k) => k.t)).toEqual([0, 1]);
    expect(typeof c.keys[0].pose).toBe('object');
  });
  it('a selected key follows the sliders', () => {
    const h = setup(); start(h);
    tap(h.root, A.addKey); tap(h.root, A.addKey);
    tap(h.root, `${A.key}0`);
    expect(h.scrub).toHaveBeenCalled();
    tap(h.root, `${A.part}back`); slide(slider(h.root, F['back-flex']), 33);
    tap(h.root, A.saveClip);
    const [k0, k1] = h.store.clips()[0].keys.map((k) => k.pose as { angles: { back: { flex: number } } });
    expect(k0.angles.back.flex).toBe(33);
    expect(k1.angles.back.flex).toBe(10);
  });
});

describe('file', () => {
  it('EXPORT ALL downloads the store as JSON', () => {
    const h = setup(); start(h); tap(h.root, A.savePose); tap(h.root, A.exportAll);
    expect(h.download).toHaveBeenCalledWith('ccbs-poses.json', h.store.exportJson());
  });
  it('IMPORT adds the poses of a file', async () => {
    const h = setup();
    const other = createPoseStore(null);
    other.savePose({ id: 'a', name: 'Far', sheet: 'mine', ref: '', tags: [], support: 'floor', angles: { neck: { flex: 5 } }, contacts: [] });
    const input = h.root.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.accept).toContain('.json');
    Object.defineProperty(input, 'files', { value: [new File([other.exportJson()], 'p.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(h.store.poses()).toHaveLength(1));
    expect(h.root.querySelector(`[data-field="${F.line}"]`)!.textContent).toContain('IMPORTED 1 POSES, 0 CLIPS');
    expect(h.root.querySelector(`[data-action="${A.loadPose}mine-far"]`)).toBeTruthy();
  });
});

describe('the look', () => {
  it('every button and chip is at least 32 px tall', () => {
    const h = setup(); start(h); tap(h.root, A.savePose);
    const all = h.root.querySelectorAll<HTMLElement>('button');
    expect(all.length).toBeGreaterThan(20);
    for (const b of all) expect(parseInt(b.style.minHeight, 10), b.dataset.action).toBeGreaterThanOrEqual(32);
  });
  it('refresh does not move a slider that has focus', () => {
    const h = setup(); start(h);
    const knee = (tap(h.root, `${A.part}legL`), slider(h.root, F['legL-knee']));
    knee.focus();
    expect(document.activeElement).toBe(knee);
    knee.value = '77';
    h.panel.refresh();
    expect(knee.value).toBe('77');
    knee.blur();
    h.panel.refresh();
    expect(knee.value).toBe('40');
  });
});
