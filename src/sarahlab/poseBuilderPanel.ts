/**
 * THE POSE BUILDER (Joshua, 2026-11-26: "copy and import Beyond Extinction's animation/pose builder in CCBS so I can
 * save my own poses and animations and upload to you to save in the Repo"). Pick a part, move its joints in a
 * clinician's degrees (`bodyAngles.ts`), save the pose, drop poses on a timeline as keys, scrub, play, save the clip,
 * and send the file. Every joint is keyed by what it IS, so a pose made on the female body works on the male body and
 * in other games.
 *
 * Plain DOM, as `skirtPanel.ts`: each slider is a line (`data-field`) with its range input right after it; the room owns
 * the pose and hears every move through `hooks.show`; `refresh()` never moves a slider a finger is on. Laid out for a
 * phone held upright: every chip at least 32 px tall with 8 px gaps, rows wrap, nothing wider than the panel.
 */
import { mirrorAngles, type ArmAngles, type BodyAngles, type LegAngles } from '../actor/bodyAngles';
import { clipLength, type PoseClip, type PoseKey } from '../actor/poseClip';
import type { PoseSpec, PoseSupport } from '../actor/poseLibrary';
import { slugOf, type PoseStore } from './poseStore';

export interface BuilderDraft { name: string; support: PoseSupport; seat: number; body: { yaw: number; pitch: number; roll: number }; angles: BodyAngles }

export interface PoseBuilderHooks {
  /** the pose she is in now, its reaches already worked out into angles (the room does that) */
  readonly startFrom: () => BuilderDraft;
  /** the draft changed: the room shows her in it at once (as a finger drags too) */
  readonly show: (draft: BuilderDraft) => void;
  /** play a clip from `t` seconds; null stops. The room plays it and shows her moving. */
  readonly play: (clip: PoseClip | null, t: number) => void;
  /** where the room is in the clip it plays, or null when stopped */
  readonly playing: () => { t: number } | null;
  /** show the clip at `t` (scrubbing, not playing) */
  readonly scrub: (clip: PoseClip, t: number) => void;
  readonly store: PoseStore;
  /** the room's library poses, to drop in as keys */
  readonly library: () => readonly PoseSpec[];
  /** save a file for him (the room makes the download) */
  readonly download: (fileName: string, text: string) => void;
  /** a pose's reaches worked out into plain angles for her body (`bodyAngles.resolveReach`): an arm put on her keeps
   * where it is when a finger first moves one of its joints */
  readonly plain?: (angles: BodyAngles) => BodyAngles;
}

type PartId = 'body' | 'back' | 'neck' | 'armL' | 'armR' | 'legL' | 'legR';
const PARTS: readonly (readonly [PartId, string])[] = [['body', 'BODY'], ['back', 'BACK'], ['neck', 'NECK'], ['armL', 'L ARM'], ['armR', 'R ARM'], ['legL', 'L LEG'], ['legR', 'R LEG']];

interface SliderDef { readonly prop: string; readonly label: string; readonly min: number; readonly max: number; readonly note?: (v: number) => string; readonly scale?: number; readonly unit?: string }
const ARM_SLIDERS: readonly SliderDef[] = [
  { prop: 'raise', label: 'RAISE', min: 0, max: 180 },
  { prop: 'toward', label: 'DIRECTION', min: -90, max: 180, note: (v) => (v < -10 ? 'BEHIND' : v < 45 ? 'OUT' : v < 135 ? 'FORWARD' : 'ACROSS') },
  { prop: 'twist', label: 'TWIST', min: -90, max: 90 },
  { prop: 'elbow', label: 'ELBOW', min: 0, max: 150 },
  { prop: 'pronate', label: 'FOREARM ROLL', min: -90, max: 90 },
  { prop: 'wristFlex', label: 'WRIST BEND', min: -80, max: 80 },
  { prop: 'wristSide', label: 'WRIST SIDE', min: -30, max: 30 },
  { prop: 'fingers', label: 'FINGERS CURLED', min: 0, max: 100, scale: 100, unit: '%' },
];
const LEG_SLIDERS: readonly SliderDef[] = [
  { prop: 'flex', label: 'HIP BEND', min: -30, max: 140 },
  { prop: 'abduct', label: 'OUT', min: -30, max: 60 },
  { prop: 'twist', label: 'TWIST', min: -45, max: 45, note: (v) => (v > 0 ? 'TOES IN' : '') },
  { prop: 'knee', label: 'KNEE', min: 0, max: 150 },
  { prop: 'ankle', label: 'ANKLE', min: -60, max: 40, note: (v) => (v > 0 ? 'TOES UP' : '') },
];
const SLIDERS: Readonly<Record<PartId, readonly SliderDef[]>> = {
  body: [{ prop: 'yaw', label: 'TURN', min: -180, max: 180 }, { prop: 'pitch', label: 'TIP FORWARD', min: -180, max: 180 }, { prop: 'roll', label: 'TIP SIDE', min: -180, max: 180 }],
  back: [{ prop: 'flex', label: 'BEND', min: -45, max: 80 }, { prop: 'side', label: 'SIDE', min: -45, max: 45 }, { prop: 'twist', label: 'TWIST', min: -45, max: 45 }],
  neck: [{ prop: 'flex', label: 'BEND', min: -70, max: 80 }, { prop: 'side', label: 'SIDE', min: -45, max: 45 }, { prop: 'twist', label: 'TURN', min: -80, max: 80 }],
  armL: ARM_SLIDERS, armR: ARM_SLIDERS, legL: LEG_SLIDERS, legR: LEG_SLIDERS,
};

const fieldName = (part: string, prop: string): string => `sarahlab-pb-${part}-${prop}`;
export const POSE_BUILDER_ROLE = 'sarahlab-pose-builder';
const fields: Record<string, string> = { line: 'sarahlab-pb-line', keys: 'sarahlab-pb-keys', seat: 'sarahlab-pb-seat', name: 'sarahlab-pb-name', clipName: 'sarahlab-pb-clip-name', keyTime: 'sarahlab-pb-key-time', scrub: 'sarahlab-pb-scrub', library: 'sarahlab-pb-library', poses: 'sarahlab-pb-poses', clips: 'sarahlab-pb-clips', file: 'sarahlab-pb-file' };
for (const [part] of PARTS) for (const s of SLIDERS[part]) fields[`${part}-${s.prop}`] = fieldName(part, s.prop);
/** `data-field` of each slider's line (`<part>-<prop>`, e.g. `armL-raise`) and of the other controls. */
export const POSE_BUILDER_FIELD: Readonly<Record<string, string>> = Object.freeze(fields);
/** `data-action` of each button; a suffix says which (`step:<part>-<prop>:<delta>`, `reset:<part>-<prop>`). */
export const POSE_BUILDER_ACTION = Object.freeze({
  part: 'sarahlab:pb:part:', step: 'sarahlab:pb:step:', reset: 'sarahlab:pb:reset:', start: 'sarahlab:pb:start', neutral: 'sarahlab:pb:neutral', mirror: 'sarahlab:pb:mirror:',
  support: 'sarahlab:pb:support:', savePose: 'sarahlab:pb:save-pose', loadPose: 'sarahlab:pb:load-pose:', removePose: 'sarahlab:pb:remove-pose:',
  addKey: 'sarahlab:pb:add-key', key: 'sarahlab:pb:key:', removeKey: 'sarahlab:pb:remove-key', play: 'sarahlab:pb:play', loop: 'sarahlab:pb:loop',
  saveClip: 'sarahlab:pb:save-clip', loadClip: 'sarahlab:pb:load-clip:', removeClip: 'sarahlab:pb:remove-clip:', exportAll: 'sarahlab:pb:export', import: 'sarahlab:pb:import',
});
const A = POSE_BUILDER_ACTION;

// ------------------------------------------------------------------------------------------------ the look
const BODY_CSS = 'display:flex;flex-direction:column;gap:4px;min-width:0;box-sizing:border-box;max-width:100%;padding-top:8px;color:var(--sl-ink,#e8e2d8)';
const HEAD_CSS = 'font:700 10px system-ui,sans-serif;letter-spacing:.12em;color:var(--sl-muted,#9aa0a8);margin-top:8px';
const LINE_CSS = 'font-size:12px;letter-spacing:.05em;margin-top:4px;overflow-wrap:anywhere';
const INPUT_CSS = 'display:block;box-sizing:border-box;width:100%;margin:2px 0;accent-color:var(--sl-accent,#d4a853);height:32px';
const ROW_CSS = 'display:flex;flex-wrap:wrap;gap:8px;min-width:0;margin:2px 0';
const CHIP_CSS = 'box-sizing:border-box;min-height:32px;max-width:100%;padding:7px 10px;border-radius:10px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:700 11px system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;cursor:pointer';
const FIELD_CSS = 'box-sizing:border-box;min-height:32px;max-width:100%;min-width:0;padding:6px 8px;border-radius:10px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:700 12px system-ui,sans-serif;text-transform:uppercase';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, css: string): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); e.style.cssText = css; return e; };
function lit(b: HTMLElement, on: boolean): void {
  const v = String(on);
  if (b.getAttribute('aria-pressed') === v) return;
  b.setAttribute('aria-pressed', v);
  b.style.background = on ? 'var(--sl-on,#806020)' : 'var(--sl-btn,#151b23)';
  b.style.borderColor = on ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)';
}
const pointerOf = (e: Event): number | undefined => (e as Partial<PointerEvent>).pointerId;
const stopEvent = (e: Event): void => e.stopPropagation();
const clampTo = (v: number, d: SliderDef): number => Math.min(d.max, Math.max(d.min, v));
const copyDraft = (d: BuilderDraft): BuilderDraft => ({ ...d, body: { ...d.body }, angles: JSON.parse(JSON.stringify(d.angles)) as BodyAngles });
const NEUTRAL: BuilderDraft = { name: 'my pose', support: 'feet', seat: 0.45, body: { yaw: 0, pitch: 0, roll: 0 }, angles: {} };
const DELETE_WAIT_MS = 3000;

function readFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsText(file); });
}

interface SliderRow { readonly part: PartId; readonly def: SliderDef; readonly line: HTMLDivElement; readonly input: HTMLInputElement }

export class PoseBuilderPanel {
  readonly root: HTMLElement;
  private readonly hooks: PoseBuilderHooks;
  private d: BuilderDraft;
  private part: PartId = 'body';
  private note = '';
  private keys: PoseKey[] = [];
  private selected: PoseKey | null = null;
  private loop = false;
  private clipName = 'my clip';
  private scrubT = 0;
  private disposed = false;
  private pending: { kind: 'pose' | 'clip'; id: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private readonly rows: SliderRow[] = [];
  private readonly groups = new Map<PartId, HTMLElement>();
  private readonly partChips = new Map<PartId, HTMLButtonElement>();
  private readonly supportChips = new Map<PoseSupport, HTMLButtonElement>();
  private readonly held = new Map<HTMLInputElement, number | undefined>();
  private readonly line = el('div', LINE_CSS);
  private readonly seatLine = el('div', LINE_CSS);
  private readonly seatInput = el('input', INPUT_CSS);
  private readonly nameInput = el('input', FIELD_CSS);
  private readonly clipInput = el('input', FIELD_CSS);
  private readonly keyRow = el('div', ROW_CSS);
  private readonly keyTime = el('input', FIELD_CSS);
  private readonly scrubInput = el('input', INPUT_CSS);
  private readonly playBtn = el('button', CHIP_CSS);
  private readonly loopBtn = el('button', CHIP_CSS);
  private readonly libSelect = el('select', FIELD_CSS);
  private readonly poseRow = el('div', ROW_CSS);
  private readonly clipRow = el('div', ROW_CSS);
  private readonly fileInput = el('input', 'display:none');
  private listSig = '';
  private libCount = -1;
  private readonly lifted = (e: Event): void => { for (const [i, id] of [...this.held]) if (id === pointerOf(e)) this.held.delete(i); };

  constructor(hooks: PoseBuilderHooks) {
    this.hooks = hooks;
    this.d = copyDraft(NEUTRAL);
    this.root = el('div', BODY_CSS);
    this.root.dataset.role = POSE_BUILDER_ROLE;
    this.line.dataset.field = POSE_BUILDER_FIELD.line;
    this.root.appendChild(this.line);

    // 2. start from
    this.root.append(this.head('START FROM'), this.row(this.btn('CURRENT POSE', A.start, () => this.replace(hooks.startFrom(), true)), this.btn('NEUTRAL', A.neutral, () => this.replace(copyDraft(NEUTRAL), true))));
    // 3. parts
    const parts = this.row();
    for (const [id, label] of PARTS) { const b = this.btn(label, `${A.part}${id}`, () => { this.part = id; this.sync(); }); this.partChips.set(id, b); parts.appendChild(b); }
    this.root.append(this.head('PART'), parts);
    // 4. sliders
    for (const [id] of PARTS) this.root.appendChild(this.group(id));
    // 5. support
    const sup = this.row();
    for (const s of ['feet', 'seat', 'floor'] as PoseSupport[]) { const b = this.btn(s.toUpperCase(), `${A.support}${s}`, () => { this.d.support = s; this.changed(); }); this.supportChips.set(s, b); sup.appendChild(b); }
    this.seatLine.dataset.field = POSE_BUILDER_FIELD.seat;
    this.seatInput.type = 'range'; this.seatInput.min = '30'; this.seatInput.max = '90'; this.seatInput.step = '1';
    this.seatInput.addEventListener('input', () => { this.d.seat = Number(this.seatInput.value) / 100; this.changed(); });
    this.watch(this.seatInput);
    this.root.append(this.head('SUPPORT'), sup, this.seatLine, this.seatInput);
    // 6. poses
    this.nameInput.type = 'text'; this.nameInput.dataset.field = POSE_BUILDER_FIELD.name; this.nameInput.setAttribute('aria-label', 'Pose name');
    this.nameInput.addEventListener('input', () => { this.d.name = this.nameInput.value; this.paintLine(); });
    this.nameInput.addEventListener('keydown', stopEvent);
    this.poseRow.dataset.field = POSE_BUILDER_FIELD.poses;
    this.root.append(this.head('NAME'), this.row(this.nameInput, this.btn('SAVE POSE', A.savePose, () => this.savePose())), this.head('MY POSES'), this.poseRow);
    // 7. animation
    this.keyRow.dataset.field = POSE_BUILDER_FIELD.keys;
    this.keyTime.type = 'number'; this.keyTime.min = '0'; this.keyTime.step = '0.1'; this.keyTime.dataset.field = POSE_BUILDER_FIELD.keyTime; this.keyTime.style.width = '88px';
    this.keyTime.setAttribute('aria-label', 'Key time');
    this.keyTime.addEventListener('change', () => this.moveKey());
    this.keyTime.addEventListener('keydown', stopEvent);
    this.libSelect.dataset.field = POSE_BUILDER_FIELD.library; this.libSelect.setAttribute('aria-label', 'Add library pose');
    this.libSelect.addEventListener('change', () => this.addLibrary());
    this.scrubInput.type = 'range'; this.scrubInput.min = '0'; this.scrubInput.max = '1'; this.scrubInput.step = '0.01'; this.scrubInput.value = '0';
    this.scrubInput.dataset.field = POSE_BUILDER_FIELD.scrub;
    this.scrubInput.addEventListener('input', () => { this.scrubT = Number(this.scrubInput.value); this.hooks.scrub(this.clip(), this.scrubT); });
    this.watch(this.scrubInput);
    this.playBtn.type = 'button'; this.playBtn.dataset.action = A.play;
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.loopBtn.type = 'button'; this.loopBtn.dataset.action = A.loop; this.loopBtn.textContent = 'LOOP'; this.loopBtn.setAttribute('aria-pressed', 'false');
    this.loopBtn.addEventListener('click', () => { this.loop = !this.loop; lit(this.loopBtn, this.loop); });
    this.clipInput.type = 'text'; this.clipInput.dataset.field = POSE_BUILDER_FIELD.clipName; this.clipInput.value = this.clipName; this.clipInput.setAttribute('aria-label', 'Clip name');
    this.clipInput.addEventListener('input', () => { this.clipName = this.clipInput.value; });
    this.clipInput.addEventListener('keydown', stopEvent);
    this.clipRow.dataset.field = POSE_BUILDER_FIELD.clips;
    this.root.append(
      this.head('ANIMATION · KEYS'), this.keyRow,
      this.row(this.btn('+ KEY', A.addKey, () => this.addKey()), this.btn('✕ KEY', A.removeKey, () => this.removeKey()), this.labelled('KEY TIME', this.keyTime)),
      this.row(this.libSelect), this.scrubInput,
      this.row(this.playBtn, this.loopBtn), this.row(this.clipInput, this.btn('SAVE CLIP', A.saveClip, () => this.saveClip())),
      this.head('MY CLIPS'), this.clipRow,
    );
    // 8. file
    this.fileInput.type = 'file'; this.fileInput.accept = '.json,application/json'; this.fileInput.dataset.field = POSE_BUILDER_FIELD.file;
    this.fileInput.addEventListener('change', () => void this.importFile());
    this.root.append(this.head('FILE'), this.row(this.btn('EXPORT ALL', A.exportAll, () => { hooks.download('ccbs-poses.json', hooks.store.exportJson()); this.say('exported'); }), this.btn('IMPORT', A.import, () => this.fileInput.click())), this.fileInput);

    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown']) this.root.addEventListener(type, stopEvent);
    const doc = this.root.ownerDocument;
    doc.addEventListener('pointerup', this.lifted, true);
    doc.addEventListener('pointercancel', this.lifted, true);
    this.sync();
  }

  draft(): BuilderDraft { return copyDraft(this.d); }
  /** The room hands the panel a pose to show; the room already shows it, so `show` is not called. */
  setDraft(d: BuilderDraft): void { this.d = copyDraft(d); this.sync(); }

  refresh(): void {
    if (this.disposed) return;
    this.lists();
    this.libraryOptions();
    const p = this.hooks.playing();
    if (p) { this.scrubT = p.t; if (!this.underFinger(this.scrubInput)) this.scrubInput.value = String(Math.min(p.t, Number(this.scrubInput.max))); }
    this.playBtn.textContent = p ? '■ STOP' : '▶ PLAY';
    this.syncSliders();
  }

  dispose(): void {
    this.disposed = true;
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = null;
    const doc = this.root.ownerDocument;
    doc.removeEventListener('pointerup', this.lifted, true);
    doc.removeEventListener('pointercancel', this.lifted, true);
    this.root.remove();
  }

  // ---------------------------------------------------------------------------------------------- building
  private head(text: string): HTMLElement { const h = el('div', HEAD_CSS); h.textContent = text; return h; }
  private row(...kids: HTMLElement[]): HTMLElement { const r = el('div', ROW_CSS); r.append(...kids); return r; }
  private labelled(text: string, input: HTMLElement): HTMLElement {
    const l = el('label', 'display:flex;align-items:center;gap:8px;font:700 11px system-ui,sans-serif;letter-spacing:.05em');
    l.append(document.createTextNode(text), input);
    return l;
  }
  private btn(label: string, action: string, onTap: () => void): HTMLButtonElement {
    const b = el('button', CHIP_CSS);
    b.type = 'button'; b.textContent = label; b.dataset.action = action;
    b.addEventListener('click', (e) => { e.stopPropagation(); if (!this.disposed) onTap(); });
    return b;
  }
  /** Remember a finger on a slider, so `refresh` leaves it alone. */
  private watch(input: HTMLInputElement): void { input.addEventListener('pointerdown', (e) => this.held.set(input, pointerOf(e))); }
  private underFinger(input: HTMLInputElement): boolean { return this.held.has(input) || input.ownerDocument.activeElement === input; }

  private group(part: PartId): HTMLElement {
    const g = el('div', 'display:flex;flex-direction:column;min-width:0');
    this.groups.set(part, g);
    for (const def of SLIDERS[part]) {
      const key = `${part}-${def.prop}`;
      const line = el('div', LINE_CSS);
      line.dataset.field = fieldName(part, def.prop);
      const input = el('input', INPUT_CSS);
      input.type = 'range'; input.min = String(def.min); input.max = String(def.max); input.step = '1'; input.setAttribute('aria-label', def.label);
      input.addEventListener('input', () => this.set(part, def, Number(input.value)));
      this.watch(input);
      const small = this.row(
        this.btn('−5', `${A.step}${key}:-5`, () => this.set(part, def, this.read(part, def) - 5)),
        this.btn('+5', `${A.step}${key}:5`, () => this.set(part, def, this.read(part, def) + 5)),
        this.btn('↺', `${A.reset}${key}`, () => this.set(part, def, 0)),
      );
      g.append(line, input, small);
      this.rows.push({ part, def, line, input });
    }
    if (part === 'body') g.appendChild(this.row(this.btn('SWAP SIDES', `${A.mirror}body`, () => this.swapSides())));
    else if (part.startsWith('arm') || part.startsWith('leg')) g.appendChild(this.row(this.btn('COPY TO OTHER SIDE', `${A.mirror}${part}`, () => this.copyLimb(part))));
    return g;
  }

  // ---------------------------------------------------------------------------------------------- the draft
  private read(part: PartId, def: SliderDef): number {
    const k = def.scale ?? 1;
    if (part === 'body') return Math.round(((this.d.body as Record<string, number>)[def.prop] ?? 0) * k);
    return Math.round((((this.d.angles[part] as Record<string, number> | undefined)?.[def.prop]) ?? 0) * k);
  }
  private set(part: PartId, def: SliderDef, raw: number): void {
    const v = clampTo(Math.round(raw), def) / (def.scale ?? 1);
    if (part === 'body') this.d.body = { ...this.d.body, [def.prop]: v };
    else {
      const old = (this.d.angles[part] ?? {}) as Record<string, unknown>;
      let next: Record<string, unknown> = { ...old, [def.prop]: v };
      if (part === 'armL' || part === 'armR') {
        // a hand put on her is dropped the moment a joint is moved; the arm keeps where it was (its reach worked out into
        // plain angles for her body by the room), and only the joint moved changes
        if (old.reach) {
          const plain = (this.hooks.plain?.(this.d.angles)?.[part] ?? {}) as Record<string, unknown>;
          const { reach: _drop, ...rest } = { ...old };
          void _drop;
          next = { raise: 0, toward: 0, twist: 0, elbow: 0, ...rest, ...plain, [def.prop]: v };
          delete next.reach;
        }
      }
      this.d.angles = { ...this.d.angles, [part]: next };
    }
    this.changed();
  }
  private swapSides(): void {
    this.d.angles = mirrorAngles(this.d.angles);
    this.d.body = { ...this.d.body, yaw: -this.d.body.yaw, roll: -this.d.body.roll };
    this.changed();
  }
  private copyLimb(part: PartId): void {
    const other = ({ armL: 'armR', armR: 'armL', legL: 'legR', legR: 'legL' } as Record<string, PartId>)[part];
    const mine = this.d.angles[part as 'armL'] as ArmAngles | LegAngles | undefined;
    this.d.angles = { ...this.d.angles, [other]: mine ? JSON.parse(JSON.stringify(mine)) : undefined };
    this.changed();
  }
  /** Load a draft (a start, a saved pose or a key). */
  private replace(d: BuilderDraft, show: boolean): void {
    this.d = copyDraft(d);
    this.selected = null;
    this.sync();
    if (show) this.hooks.show(copyDraft(this.d));
  }
  /** The draft changed by hand: the selected key follows it, the room shows it. */
  private changed(): void {
    if (this.selected) this.selected = this.swapKey(this.selected, { ...this.selected, pose: this.specOf('key') });
    this.sync();
    this.hooks.show(copyDraft(this.d));
  }
  private swapKey(old: PoseKey, next: PoseKey): PoseKey { const i = this.keys.indexOf(old); if (i >= 0) this.keys[i] = next; return next; }
  private specOf(id: string): PoseSpec {
    const d = this.d;
    return {
      id, name: d.name.trim() || 'my pose', sheet: 'mine', ref: 'built in the room', tags: ['mine'], support: d.support, body: { ...d.body },
      angles: JSON.parse(JSON.stringify(d.angles)) as BodyAngles, contacts: [], ...(d.support === 'seat' ? { seat: d.seat } : {}),
    };
  }
  private draftOf(p: PoseSpec): BuilderDraft {
    return { name: p.name, support: p.support, seat: p.seat ?? 0.45, body: { yaw: p.body?.yaw ?? 0, pitch: p.body?.pitch ?? 0, roll: p.body?.roll ?? 0 }, angles: JSON.parse(JSON.stringify(p.angles)) as BodyAngles };
  }

  // ---------------------------------------------------------------------------------------------- poses
  private savePose(): void {
    const name = this.d.name.trim() || 'my pose';
    const saved = this.hooks.store.savePose(this.specOf(`mine-${slugOf(name)}`));
    this.say(`saved ${saved.name}`);
    this.lists(true);
  }

  // ---------------------------------------------------------------------------------------------- keys
  private clip(): PoseClip { return { id: `clip-${slugOf(this.clipName)}`, name: this.clipName.trim() || 'my clip', ...(this.loop ? { loop: true } : {}), keys: this.keys.map((k) => ({ ...k })) }; }
  private addKey(): void {
    const t = this.keys.length ? Math.floor(this.keys[this.keys.length - 1].t) + 1 : 0;
    const k: PoseKey = { t, pose: this.specOf(`key-${this.keys.length + 1}`) };
    this.keys.push(k);
    this.selected = k;
    this.sync();
  }
  private addLibrary(): void {
    const id = this.libSelect.value;
    this.libSelect.value = '';
    if (!id) return;
    const t = this.keys.length ? Math.floor(this.keys[this.keys.length - 1].t) + 1 : 0;
    const k: PoseKey = { t, pose: id };
    this.keys.push(k);
    this.pickKey(k);
  }
  private removeKey(): void {
    if (!this.selected) return;
    this.keys = this.keys.filter((k) => k !== this.selected);
    this.selected = null;
    this.sync();
  }
  private pickKey(k: PoseKey): void {
    this.selected = k;
    const p = typeof k.pose === 'string' ? this.hooks.library().find((x) => x.id === k.pose) : k.pose;
    if (p) this.d = this.draftOf(p);
    this.scrubT = k.t;
    this.sync();
    this.hooks.scrub(this.clip(), k.t);
  }
  private moveKey(): void {
    if (!this.selected) return;
    const t = Math.max(0, Number(this.keyTime.value) || 0);
    const next = { ...this.selected, t };
    this.selected = this.swapKey(this.selected, next);
    this.keys.sort((a, b) => a.t - b.t);
    this.sync();
  }
  private togglePlay(): void {
    if (this.hooks.playing()) this.hooks.play(null, 0);
    else if (this.keys.length) this.hooks.play(this.clip(), this.scrubT);
    else this.say('add a key first');
    this.refresh();
  }
  private saveClip(): void {
    if (this.keys.length < 2) { this.say('a clip needs at least 2 keys'); return; }
    const saved = this.hooks.store.saveClip(this.clip());
    this.say(`saved clip ${saved.name}`);
    this.lists(true);
  }

  // ---------------------------------------------------------------------------------------------- file
  private async importFile(): Promise<void> {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    try {
      const r = this.hooks.store.importJson(await readFile(file));
      this.say(`imported ${r.poses} pose${r.poses === 1 ? "" : "s"}, ${r.clips} clip${r.clips === 1 ? "" : "s"}${r.errors.length ? ` · ${r.errors.join(', ')}` : ''}`);
    } catch { this.say('could not read that file'); }
    try { this.fileInput.value = ''; } catch { /* a file input may refuse */ }
    if (!this.disposed) this.lists(true);
  }

  // ---------------------------------------------------------------------------------------------- showing
  private say(text: string): void { this.note = text; this.paintLine(); }
  private paintLine(): void {
    const base = `POSE BUILDER · ${(this.d.name.trim() || 'my pose').toUpperCase()} · ${this.d.support.toUpperCase()}`;
    const t = this.note ? `${base} · ${this.note.toUpperCase()}` : base;
    if (this.line.textContent !== t) this.line.textContent = t;
  }
  private sync(): void {
    for (const [id, b] of this.partChips) lit(b, id === this.part);
    for (const [id, g] of this.groups) g.style.display = id === this.part ? 'flex' : 'none';
    for (const [s, b] of this.supportChips) lit(b, s === this.d.support);
    const seat = this.d.support === 'seat';
    this.seatLine.style.display = this.seatInput.style.display = seat ? 'block' : 'none';
    this.seatLine.textContent = `SEAT HEIGHT · ${Math.round(this.d.seat * 100)} CM`;
    if (!this.underFinger(this.seatInput)) this.seatInput.value = String(Math.round(this.d.seat * 100));
    if (this.nameInput !== this.nameInput.ownerDocument.activeElement && this.nameInput.value !== this.d.name) this.nameInput.value = this.d.name;
    this.syncSliders();
    this.paintKeys();
    this.paintLine();
  }
  private syncSliders(): void {
    for (const r of this.rows) {
      if (r.part !== this.part) continue;
      const v = this.read(r.part, r.def);
      if (!this.underFinger(r.input)) r.input.value = String(v);
      const note = r.def.note?.(v);
      const t = `${r.def.label} · ${v}${r.def.unit ?? '°'}${note ? ` · ${note}` : ''}`;
      if (r.line.textContent !== t) r.line.textContent = t;
    }
  }
  private paintKeys(): void {
    this.keyRow.replaceChildren();
    this.keys.forEach((k, i) => {
      const b = this.btn(`${i + 1} · ${k.t.toFixed(1)}s`, `${A.key}${i}`, () => this.pickKey(k));
      lit(b, k === this.selected);
      this.keyRow.appendChild(b);
    });
    if (!this.keys.length) this.keyRow.textContent = 'NO KEYS YET';
    this.keyTime.disabled = !this.selected;
    if (this.selected && this.keyTime !== this.keyTime.ownerDocument.activeElement) this.keyTime.value = String(this.selected.t);
    const len = Math.max(clipLength({ id: '', name: '', keys: this.keys }), 0.1);
    this.scrubInput.max = String(len);
    this.playBtn.textContent = this.hooks.playing() ? '■ STOP' : '▶ PLAY';
  }
  private libraryOptions(): void {
    const lib = this.hooks.library();
    if (lib.length === this.libCount) return;
    this.libCount = lib.length;
    this.libSelect.replaceChildren();
    const first = document.createElement('option'); first.value = ''; first.textContent = '+ LIBRARY POSE';
    this.libSelect.appendChild(first);
    for (const p of lib) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name.toUpperCase(); this.libSelect.appendChild(o); }
  }
  /** MY POSES and MY CLIPS: a chip each, and a × that needs a second tap. */
  private lists(force = false): void {
    const poses = this.hooks.store.poses(), clips = this.hooks.store.clips();
    const sig = JSON.stringify([poses.map((p) => [p.id, p.name]), clips.map((c) => [c.id, c.name]), this.pending?.id ?? '']);
    if (!force && sig === this.listSig) return;
    this.listSig = sig;
    this.poseRow.replaceChildren(...poses.map((p) => this.pair('pose', p.id, p.name, A.loadPose, A.removePose, () => this.replace(this.draftOf(p), true))));
    this.clipRow.replaceChildren(...clips.map((c) => this.pair('clip', c.id, c.name, A.loadClip, A.removeClip, () => {
      this.keys = c.keys.map((k) => ({ ...k })); this.selected = null; this.clipName = c.name; this.clipInput.value = c.name; this.loop = !!c.loop; lit(this.loopBtn, this.loop); this.scrubT = 0; this.sync();
    })));
    if (!poses.length) this.poseRow.textContent = 'NONE YET';
    if (!clips.length) this.clipRow.textContent = 'NONE YET';
  }
  private pair(kind: 'pose' | 'clip', id: string, name: string, load: string, remove: string, onLoad: () => void): HTMLElement {
    const w = el('div', 'display:flex;gap:4px;min-width:0;max-width:100%');
    const armed = this.pending?.kind === kind && this.pending.id === id;
    const del = this.btn(armed ? 'TAP AGAIN' : '×', `${remove}${id}`, () => {
      if (this.pending && this.pending.kind === kind && this.pending.id === id) {
        clearTimeout(this.pending.timer); this.pending = null;
        if (kind === 'pose') this.hooks.store.removePose(id); else this.hooks.store.removeClip(id);
        this.say('deleted');
      } else {
        if (this.pending) clearTimeout(this.pending.timer);
        this.pending = { kind, id, timer: setTimeout(() => { this.pending = null; if (!this.disposed) this.lists(true); }, DELETE_WAIT_MS) };
        this.say('tap again to delete');
      }
      this.lists(true);
    });
    del.setAttribute('aria-label', `Delete ${name}`);
    w.append(this.btn(name, `${load}${id}`, onLoad), del);
    return w;
  }
}
