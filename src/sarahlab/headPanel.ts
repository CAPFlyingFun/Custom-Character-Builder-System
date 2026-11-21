/**
 * HER HEAD'S CONTROLS, in the FACE tab (Joshua, 2026-11-14: "making the eye color adjustable and more hairstyles and
 * colors so we can do Lena and add more of a customizable character"; "create different hairstyles, hair length and
 * color, different face types, eye and lip colors"; of the room on a phone: "it's hard to press certain buttons").
 *
 *   HAIR         STYLE chips (and None), LENGTH, COLOUR swatches (her own, the list, custom)
 *   EYES         COLOUR swatches
 *   BROWS        COLOUR (match her hair, or custom), AMOUNT
 *   LASHES       AMOUNT
 *   LIPS         SHADE swatches, AMOUNT
 *   FACIAL HAIR  (his: `hooks.beard`) STYLE chips, THICKNESS, COLOUR (match his hair, the list, custom)
 *   FACE SHAPE   FACE TYPE chips, then her sliders in a <details> a group, RESET FACE
 *   RESET HEAD   every part back to the body's own head (`hooks.own`; `HEAD_DEFAULT`)
 *
 * On HIM (`hooks.male`) its lines say "his" where they say "her".
 *
 * It is modelled on `garmentPanel.ts` and keeps its conventions: a slider is a LINE (`data-field`) and, right after it, its
 * range input (a probe finds one by `[data-field="..."] + input`); a slider reports each move with `final` false and its
 * let-go with `final` true, a chip or a swatch reports `final` true; it never moves a slider a finger is on (a pointer
 * down on it, or the focus) -- that slider's line follows the slider instead; the room's events stay off the room.
 *
 * THE ROOM OWNS THE LOOK. The panel keeps no copy: every change hands `hooks.change` a NEW whole `HeadLook` (only the
 * changed part differs; a face slider's key unknown to `FACE_SLIDERS` is kept as it was) and the panel shows what
 * `hooks.look()` says on the next `refresh()`. The one exception is a custom colour's native picker while it is open: a
 * refresh never changes its value then, or the picker would jump under the finger.
 *
 * A look can name a hairstyle the panel does not know (a save from a later build): no style chip is pressed and nothing
 * throws, and LENGTH is on (the style's file is not known to be one length). Touch: swatches are 32 px round with 8 px
 * gaps, chips at least 32 px tall, `touch-action: manipulation` (Joshua: "it's hard to press certain buttons").
 *
 * Plain DOM: no three.js, no room.
 */
import {
  BEARD_NAMES, beardColourLine, beardLine, browColourLine, browsLine, eyeColourLine, faceGroupLine, faceSliderLine, hairColourLine, hairLengthLine, lashesLine, lipColourLine, lipsLine,
} from './faceChoices';
import { BEARD_STYLE_IDS } from './faceRig';
import { EYE_COLOURS, LIP_COLOURS, type FaceSwatch } from './faceLook';
import { FACE_SLIDERS, FACE_TYPES, type FaceGroup } from './faceShapes';
import { HAIR_COLOURS } from './hairColours';
import { HAIR_STYLES, HAIR_STYLE_NONE, type HairStyle } from './hairStyles';
import { BEARD_NONE, HEAD_DEFAULT, isDefaultHead, lookColour, type FaceShapeLook, type HeadLook, type LookColour } from './headLook';

/** What the panel reads and drives; it never imports the room. */
export interface HeadPanelHooks {
  /** Her head's look now. */
  look(): HeadLook;
  /** A change the person made: the WHOLE new look. `final` is false while a slider is dragged. */
  change(next: HeadLook, final: boolean): void;
  /** The hairstyles on offer; absent, `HAIR_STYLES`. */
  styles?(): readonly HairStyle[];
  /** The body's own head, what RESET HEAD gives back; absent, `HEAD_DEFAULT`. */
  own?(): HeadLook;
  /** Whether FACIAL HAIR is offered (a face with a design for it: his); absent, not. */
  beard?(): boolean;
  /** Whether the body is his (the lines say "his"); absent, hers. */
  male?(): boolean;
}

/** `data-field` of each line (its slider follows it) and of each swatch row, for a probe. A face slider's is `${faceSlider}<id>`. */
export const HEAD_PANEL_FIELD = Object.freeze({
  hairLength: 'sarahlab-head-hair-length',
  hairColour: 'sarahlab-head-hair-colour',
  eyeColour: 'sarahlab-head-eye-colour',
  browColour: 'sarahlab-head-brow-colour',
  browAmount: 'sarahlab-head-brow-amount',
  lashes: 'sarahlab-head-lashes',
  lipColour: 'sarahlab-head-lip-colour',
  lipAmount: 'sarahlab-head-lip-amount',
  beardAmount: 'sarahlab-head-beard-amount',
  beardColour: 'sarahlab-head-beard-colour',
  faceSlider: 'sarahlab-head-face-',
});

/**
 * `data-action` of each button. A colour swatch's is `${hairColour}<id | own | custom>` (likewise eye, brow, lip; brows
 * have `own` -- match hair -- and `custom` only); a style chip's `${hairStyle}<id | none>`; a face type's `${faceType}<id>`.
 */
export const HEAD_PANEL_ACTION = Object.freeze({
  hairStyle: 'sarahlab:head:hair-style:',
  hairColour: 'sarahlab:head:hair-colour:',
  eyeColour: 'sarahlab:head:eye-colour:',
  browColour: 'sarahlab:head:brow-colour:',
  lipColour: 'sarahlab:head:lip-colour:',
  beardStyle: 'sarahlab:head:beard-style:',
  beardColour: 'sarahlab:head:beard-colour:',
  faceType: 'sarahlab:head:face-type:',
  resetFace: 'sarahlab:head:reset-face',
  resetHead: 'sarahlab:head:reset-head',
});

/** `data-role` of the panel, of each section (`${section}<name>`), of each face group's <details> (`${faceGroup}<group>`) and of each colour input. */
export const HEAD_PANEL_ROLE = Object.freeze({
  panel: 'sarahlab-head-panel',
  section: 'sarahlab-head-section-',
  faceGroup: 'sarahlab-head-group-',
  colourInput: 'sarahlab-head-colour-input-',
});

/** Smallest touch targets, px (GAME TUNING, Joshua: "it's hard to press certain buttons"; garmentPanel's chips are 30). */
export const HEAD_TOUCH = Object.freeze({ swatch: 32, chip: 32, gap: 8 });

const BODY_CSS = 'display:flex;flex-direction:column;gap:8px;min-width:0';
const SECTION_CSS = 'display:flex;flex-direction:column;gap:2px;min-width:0;padding-top:8px;border-top:1px solid var(--sl-line,#ffffff1f)';
const HEAD_CSS = 'font:700 10px system-ui,sans-serif;letter-spacing:.12em;color:var(--sl-muted,#9aa0a8)';
const LINE_CSS = 'font-size:12px;letter-spacing:.05em;margin-top:4px;overflow-wrap:anywhere';
const INPUT_CSS = 'display:block;box-sizing:border-box;width:100%;margin:2px 0;accent-color:var(--sl-accent,#d4a853);height:28px';
const ROW_CSS = `display:flex;flex-wrap:wrap;gap:${HEAD_TOUCH.gap}px;min-width:0;margin:2px 0`;
const CHIP_CSS = `box-sizing:border-box;min-height:${HEAD_TOUCH.chip}px;max-width:100%;padding:7px 10px;border-radius:10px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:700 11px system-ui,sans-serif;letter-spacing:.05em;cursor:pointer;touch-action:manipulation`;
const SWATCH_CSS = `box-sizing:border-box;width:${HEAD_TOUCH.swatch}px;height:${HEAD_TOUCH.swatch}px;padding:0;border-radius:50%;border:2px solid var(--sl-btn-line,#ffffff30);color:var(--sl-ink,#e8e2d8);font:700 13px system-ui,sans-serif;line-height:1;cursor:pointer;touch-action:manipulation;flex:none`;
const SUMMARY_CSS = 'min-height:32px;display:flex;align-items:center;font:700 11px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;touch-action:manipulation';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, css: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.style.cssText = css;
  return e;
};
const pointerOf = (e: Event): number | undefined => (e as Partial<PointerEvent>).pointerId;
const stopEvent = (e: Event): void => e.stopPropagation();

/** A chip or swatch shows whether it is the one chosen, as the room's own buttons do. */
function lit(b: HTMLButtonElement, on: boolean, swatch = false): void {
  const v = String(on);
  if (b.getAttribute('aria-pressed') === v) return;
  b.setAttribute('aria-pressed', v);
  if (swatch) {
    b.style.borderColor = on ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)';
    b.style.boxShadow = on ? '0 0 0 2px var(--sl-accent,#d4a853)' : 'none';
  } else {
    b.style.background = on ? 'var(--sl-on,#806020)' : 'var(--sl-btn,#151b23)';
    b.style.borderColor = on ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)';
  }
}

/** `v` on a range input's steps, as a browser holds it. */
function snap(v: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(v)) return min;
  const top = min + Math.max(0, Math.floor((max - min) / step + 1e-9)) * step;
  return Math.min(top, Math.max(min, min + Math.round((v - min) / step) * step));
}

/** One slider: how it reads the look, writes it and says it. `x` is the slider's own number. */
interface SliderSpec {
  readonly field: string;
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly get: (l: HeadLook) => number;
  readonly set: (l: HeadLook, x: number) => HeadLook;
  readonly line: (x: number, l: HeadLook) => string;
  /** Whether the slider can be used with this look (HAIR LENGTH is off for a style with one length). */
  readonly enabled?: (l: HeadLook) => boolean;
}
interface Slider { readonly spec: SliderSpec; readonly line: HTMLDivElement; readonly input: HTMLInputElement }

/** Which colour part a swatch row sets. */
type ColourPart = 'hair' | 'eyes' | 'brows' | 'lips' | 'beard';
const withColour = (l: HeadLook, part: ColourPart, colour: LookColour): HeadLook => ({ ...l, [part]: { ...(part === 'beard' ? l.beard ?? BEARD_NONE : l[part]), colour } }) as HeadLook;
const colourOf = (l: HeadLook, part: ColourPart): LookColour => (part === 'beard' ? l.beard?.colour ?? null : l[part].colour);

const pct = (u: number): number => Math.round(u * 100);

const SLIDERS: readonly SliderSpec[] = [
  {
    field: HEAD_PANEL_FIELD.hairLength, name: 'Hair length', min: 0, max: 100,
    get: (l) => pct(l.hair.length), set: (l, x) => ({ ...l, hair: { ...l.hair, length: x / 100 } }),
    line: (x, l) => hairLengthLine(x, l.hair.style === HAIR_STYLE_NONE ? 'none' : 'on'),
  },
  {
    field: HEAD_PANEL_FIELD.browAmount, name: 'Brows', min: 0, max: 100,
    get: (l) => pct(l.brows.amount), set: (l, x) => ({ ...l, brows: { ...l.brows, amount: x / 100 } }), line: (x) => browsLine(x),
  },
  {
    field: HEAD_PANEL_FIELD.lashes, name: 'Lashes', min: 0, max: 100,
    get: (l) => pct(l.lashes), set: (l, x) => ({ ...l, lashes: x / 100 }), line: (x) => lashesLine(x),
  },
  {
    field: HEAD_PANEL_FIELD.lipAmount, name: 'Lip colour amount', min: 0, max: 100,
    get: (l) => pct(l.lips.amount), set: (l, x) => ({ ...l, lips: { ...l.lips, amount: x / 100 } }), line: (x) => lipsLine(x),
  },
  {
    field: HEAD_PANEL_FIELD.beardAmount, name: 'Beard thickness', min: 0, max: 100,
    get: (l) => pct((l.beard ?? BEARD_NONE).amount), set: (l, x) => ({ ...l, beard: { ...(l.beard ?? BEARD_NONE), amount: x / 100 } }),
    line: (x, l) => beardLine((l.beard ?? BEARD_NONE).style, x), enabled: (l) => (l.beard ?? BEARD_NONE).style !== 'none',
  },
];

/** A face slider's spec: -100..100 for -1..1; a slider back at 0 REMOVES its key, and keys it does not own stay. */
function faceSpec(id: string, name: string): SliderSpec {
  return {
    field: `${HEAD_PANEL_FIELD.faceSlider}${id}`, name, min: -100, max: 100,
    get: (l) => pct(l.face[id] ?? 0),
    set: (l, x) => {
      const face: Record<string, number> = { ...l.face };
      if (x === 0) delete face[id]; else face[id] = x / 100;
      return { ...l, face };
    },
    line: (x) => faceSliderLine(name, x / 100),
  };
}

/** Whether two faces are the same shape: the same moved sliders at the same numbers (a 0 is the same as no key). */
function sameFace(a: FaceShapeLook, b: FaceShapeLook): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

interface SwatchRow {
  readonly part: ColourPart;
  readonly own: HTMLButtonElement;
  readonly list: readonly { readonly colour: string; readonly button: HTMLButtonElement }[];
  readonly custom: HTMLButtonElement | null;
  readonly input: HTMLInputElement;
  readonly line: HTMLDivElement;
  readonly say: (colour: LookColour) => string;
}

export class HeadPanel {
  readonly element: HTMLElement;
  private readonly hooks: HeadPanelHooks;
  private readonly sliders: Slider[] = [];
  private readonly byInput = new Map<HTMLInputElement, Slider>();
  private readonly rows: SwatchRow[] = [];
  private readonly held = new Map<HTMLInputElement, number | undefined>();
  private readonly moved = new Set<HTMLInputElement>();
  private reporting: HTMLInputElement | null = null;
  private disposed = false;
  private readonly styleRow = el('div', ROW_CSS);
  private styleChips: { readonly id: string; readonly button: HTMLButtonElement }[] = [];
  private styleKey = '';
  private readonly typeChips: { readonly id: string; readonly look: FaceShapeLook; readonly button: HTMLButtonElement }[] = [];
  private readonly groups: { readonly group: FaceGroup; readonly summary: HTMLElement; readonly ids: readonly string[] }[] = [];
  private resetFace!: HTMLButtonElement;
  private resetHead!: HTMLButtonElement;
  private readonly beardSection: HTMLDivElement;
  private readonly beardChips: { readonly id: string; readonly button: HTMLButtonElement }[] = [];
  private readonly lifted = (e: Event): void => this.release(pointerOf(e), e.type === 'pointercancel');

  constructor(hooks: HeadPanelHooks) {
    this.hooks = hooks;
    this.element = document.createElement('div');
    this.element.dataset.tab = 'face';
    this.element.dataset.role = HEAD_PANEL_ROLE.panel;
    this.element.style.cssText = 'box-sizing:border-box;min-width:0;max-width:100%';
    const body = el('div', BODY_CSS);
    const [length, browAmount, lashes, lipAmount, beardAmount] = SLIDERS;

    // HAIR
    const hair = this.section('HAIR', 'hair');
    hair.append(this.caption('STYLE'), this.styleRow, ...this.sliderParts(length), ...this.swatchRow('hair', HEAD_PANEL_FIELD.hairColour, HEAD_PANEL_ACTION.hairColour, HAIR_COLOURS, 'her own', hairColourLine));
    // EYES
    const eyes = this.section('EYES', 'eyes');
    eyes.append(...this.swatchRow('eyes', HEAD_PANEL_FIELD.eyeColour, HEAD_PANEL_ACTION.eyeColour, EYE_COLOURS, 'her own', eyeColourLine));
    // BROWS
    const brows = this.section('BROWS', 'brows');
    brows.append(...this.swatchRow('brows', HEAD_PANEL_FIELD.browColour, HEAD_PANEL_ACTION.browColour, [], 'match her hair', browColourLine), ...this.sliderParts(browAmount));
    // LASHES
    const lashSection = this.section('LASHES', 'lashes');
    lashSection.append(...this.sliderParts(lashes));
    // LIPS
    const lips = this.section('LIPS', 'lips');
    lips.append(...this.swatchRow('lips', HEAD_PANEL_FIELD.lipColour, HEAD_PANEL_ACTION.lipColour, LIP_COLOURS, 'her own', lipColourLine), ...this.sliderParts(lipAmount));
    // FACIAL HAIR (his)
    this.beardSection = this.section('FACIAL HAIR', 'beard');
    const beardRow = el('div', ROW_CSS);
    for (const id of BEARD_STYLE_IDS) {
      const button = this.chip(BEARD_NAMES[id] ?? id, `${HEAD_PANEL_ACTION.beardStyle}${id}`, (l) => ({ ...l, beard: { ...(l.beard ?? BEARD_NONE), style: id } }), true);
      this.beardChips.push({ id, button });
      beardRow.appendChild(button);
    }
    this.beardSection.append(this.caption('STYLE'), beardRow, ...this.sliderParts(beardAmount), ...this.swatchRow('beard', HEAD_PANEL_FIELD.beardColour, HEAD_PANEL_ACTION.beardColour, HAIR_COLOURS, 'match his hair', beardColourLine));
    // FACE SHAPE
    const face = this.section('FACE SHAPE', 'face');
    face.append(this.caption('FACE TYPE'), this.typeRow(), ...this.faceGroups());
    this.resetFace = this.chip('RESET FACE', HEAD_PANEL_ACTION.resetFace, (l) => ({ ...l, face: {} }), false);
    const faceFoot = el('div', ROW_CSS);
    faceFoot.appendChild(this.resetFace);
    face.appendChild(faceFoot);
    // RESET HEAD
    const foot = el('div', `${ROW_CSS};padding-top:8px;border-top:1px solid var(--sl-line,#ffffff1f)`);
    this.resetHead = this.chip('RESET HEAD', HEAD_PANEL_ACTION.resetHead, () => this.own(), false);
    foot.appendChild(this.resetHead);

    body.append(hair, eyes, brows, lashSection, lips, this.beardSection, face, foot);
    this.element.appendChild(body);

    // the room behind never hears it: no orbit from a drag on it, no shortcut from a key in it
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown']) this.element.addEventListener(type, stopEvent);
    const doc = this.element.ownerDocument;
    doc.addEventListener('pointerup', this.lifted, true);
    doc.addEventListener('pointercancel', this.lifted, true);

    this.show(HEAD_DEFAULT);
  }

  /** Show the room's look as it stands now (the room calls it from its own refresh). */
  refresh(): void {
    if (this.disposed) return;
    this.show(this.hooks.look());
  }

  dispose(): void {
    this.disposed = true;
    const doc = this.element.ownerDocument;
    doc.removeEventListener('pointerup', this.lifted, true);
    doc.removeEventListener('pointercancel', this.lifted, true);
    this.held.clear();
    this.moved.clear();
    this.element.remove();
  }

  // ------------------------------------------------------------------------------------------------ building

  private section(title: string, name: string): HTMLDivElement {
    const s = el('div', SECTION_CSS), h = el('div', HEAD_CSS);
    s.dataset.role = `${HEAD_PANEL_ROLE.section}${name}`;
    h.textContent = title;
    s.appendChild(h);
    return s;
  }
  private caption(text: string): HTMLDivElement {
    const c = el('div', `${HEAD_CSS};margin-top:4px`);
    c.textContent = text;
    return c;
  }

  /** A chip (`toggle`: shows whether it is the one chosen) that reports `next(look)`, final. */
  private chip(label: string, action: string, next: (l: HeadLook) => HeadLook, toggle: boolean): HTMLButtonElement {
    const b = el('button', CHIP_CSS);
    b.type = 'button';
    b.textContent = label;
    b.dataset.action = action;
    if (toggle) b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.disposed) return;
      this.dropFocus();
      this.hooks.change(next(this.hooks.look()), true);
      this.refresh();
    });
    return b;
  }

  /** A slider's line and, right after it, its range input. */
  private sliderParts(spec: SliderSpec): HTMLElement[] {
    const line = el('div', LINE_CSS);
    line.dataset.field = spec.field;
    const input = el('input', INPUT_CSS);
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = '1';
    input.setAttribute('aria-label', spec.name);
    const c: Slider = { spec, line, input };
    this.sliders.push(c);
    this.byInput.set(input, c);
    input.addEventListener('input', () => {
      if (this.disposed) return;
      this.moved.add(input);
      this.report(c, false);
    });
    input.addEventListener('change', () => {
      if (this.disposed) return;
      this.moved.delete(input);
      this.report(c, true);
    });
    input.addEventListener('pointerdown', (e) => {
      if (this.disposed) return;
      this.moved.delete(input);
      this.held.set(input, pointerOf(e));
    });
    input.addEventListener('pointerup', (e) => this.release(pointerOf(e), false));
    input.addEventListener('pointercancel', (e) => this.release(pointerOf(e), true));
    return [line, input];
  }

  /**
   * A colour's line and its row: "own" first, then the list, then (for a part with a custom colour) CUSTOM, which opens
   * the native picker kept hidden inside the panel.
   */
  private swatchRow(part: ColourPart, field: string, action: string, list: readonly FaceSwatch[], ownTitle: string, say: (c: LookColour) => string): HTMLElement[] {
    const line = el('div', LINE_CSS);
    line.dataset.field = field;
    const row = el('div', ROW_CSS);
    const swatch = (id: string, title: string, bg: string, text = ''): HTMLButtonElement => {
      const b = el('button', `${SWATCH_CSS};background:${bg}`);
      b.type = 'button';
      b.title = title;
      b.setAttribute('aria-label', title);
      b.setAttribute('aria-pressed', 'false');
      b.dataset.action = `${action}${id}`;
      b.textContent = text;
      row.appendChild(b);
      return b;
    };
    const own = swatch('own', ownTitle === 'her own' ? 'her own' : ownTitle, 'transparent', '/');
    own.dataset.title = own.title;
    own.addEventListener('click', (e) => this.pick(e, part, null));
    const entries = list.map((s) => {
      const button = swatch(s.id, s.name, s.colour);
      button.addEventListener('click', (e) => this.pick(e, part, s.colour));
      return { colour: s.colour, button };
    });
    const input = el('input', 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none');
    input.type = 'color';
    input.tabIndex = -1;
    input.dataset.role = `${HEAD_PANEL_ROLE.colourInput}${part}`;
    input.setAttribute('aria-label', `${part} custom colour`);
    input.addEventListener('input', () => {
      const c = lookColour(input.value);
      if (c && !this.disposed) this.hooks.change(withColour(this.hooks.look(), part, c), false);
    });
    input.addEventListener('change', () => {
      const c = lookColour(input.value);
      if (c && !this.disposed) { this.hooks.change(withColour(this.hooks.look(), part, c), true); this.refresh(); }
    });
    const custom = swatch('custom', 'custom colour', 'conic-gradient(#e33,#ee3,#3e3,#3ee,#33e,#e3e,#e33)');
    custom.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.disposed) return;
      const now = colourOf(this.hooks.look(), part);
      if (now) input.value = now;
      input.click();
    });
    row.appendChild(input);
    this.rows.push({ part, own, list: entries, custom, input, line, say });
    return [line, row];
  }

  private pick(e: Event, part: ColourPart, colour: LookColour): void {
    e.stopPropagation();
    if (this.disposed) return;
    this.dropFocus();
    this.hooks.change(withColour(this.hooks.look(), part, colour), true);
    this.refresh();
  }

  private typeRow(): HTMLElement {
    const row = el('div', ROW_CSS);
    for (const t of FACE_TYPES) {
      const button = this.chip(t.name, `${HEAD_PANEL_ACTION.faceType}${t.id}`, (l) => ({ ...l, face: { ...t.look } }), true);
      this.typeChips.push({ id: t.id, look: t.look, button });
      row.appendChild(button);
    }
    return row;
  }

  /** One <details> a group, in the order the groups first appear in `FACE_SLIDERS`, closed at first. */
  private faceGroups(): HTMLElement[] {
    const order: FaceGroup[] = [];
    for (const s of FACE_SLIDERS) if (!order.includes(s.group)) order.push(s.group);
    return order.map((group) => {
      const d = el('details', 'min-width:0');
      d.dataset.role = `${HEAD_PANEL_ROLE.faceGroup}${group}`;
      const summary = el('summary', SUMMARY_CSS);
      d.appendChild(summary);
      const mine = FACE_SLIDERS.filter((s) => s.group === group);
      for (const s of mine) d.append(...this.sliderParts(faceSpec(s.id, s.name)));
      this.groups.push({ group, summary, ids: mine.map((s) => s.id) });
      return d;
    });
  }

  // ------------------------------------------------------------------------------------------------ showing

  /** The room hears this slider where it stands, `final` or not, its own line first. */
  private report(c: Slider, final: boolean): void {
    const look = this.hooks.look();
    this.showSlider(c, look, true);
    const next = c.spec.set(look, Number(c.input.value));
    this.reporting = c.input;
    try { this.hooks.change(next, final); } finally { this.reporting = null; }
  }

  private release(id: number | undefined, cancelled: boolean): void {
    if (this.disposed) return;
    for (const [input, holder] of [...this.held]) {
      if (holder !== id) continue;
      this.held.delete(input);
      const c = this.byInput.get(input)!;
      if (cancelled && this.moved.has(input)) { this.moved.delete(input); this.report(c, true); }
      else this.showSlider(c, this.hooks.look(), true);
    }
  }

  private underFinger(input: HTMLInputElement): boolean {
    return this.held.has(input) || this.reporting === input || input.ownerDocument.activeElement === input;
  }
  private dropFocus(): void {
    const a = this.element.ownerDocument.activeElement;
    if (a instanceof HTMLInputElement && this.byInput.has(a) && !this.held.has(a)) a.blur();
  }

  private showSlider(c: Slider, look: HeadLook, own = this.underFinger(c.input)): void {
    const s = c.spec;
    let x: number;
    if (own) x = Number(c.input.value);
    else {
      x = s.get(look);
      const v = String(snap(x, s.min, s.max, 1));
      if (c.input.value !== v) c.input.value = v;
    }
    const known = s.field !== HEAD_PANEL_FIELD.hairLength || look.hair.style === HAIR_STYLE_NONE || this.styles().some((h) => h.id === look.hair.style);
    const oneLength = s.field === HEAD_PANEL_FIELD.hairLength && known && look.hair.style !== HAIR_STYLE_NONE && this.styles().find((h) => h.id === look.hair.style)?.hasLength === false;
    const noHair = s.field === HEAD_PANEL_FIELD.hairLength && look.hair.style === HAIR_STYLE_NONE;
    const off = oneLength || noHair;
    const text = this.said(s.field === HEAD_PANEL_FIELD.hairLength ? hairLengthLine(x, noHair ? 'none' : oneLength ? 'one-length' : 'on') : s.line(x, look));
    if (c.line.textContent !== text) {
      c.line.textContent = text;
      c.input.setAttribute('aria-valuetext', text);
    }
    const disabled = off || (s.enabled ? !s.enabled(look) : false);
    if (c.input.disabled !== disabled) c.input.disabled = disabled;
  }

  private styles(): readonly HairStyle[] {
    return this.hooks.styles ? this.hooks.styles() : HAIR_STYLES;
  }
  private own(): HeadLook {
    return this.hooks.own ? this.hooks.own() : HEAD_DEFAULT;
  }
  /** A line as the body has it: "his" for "her" on him. */
  private said(text: string): string {
    return this.hooks.male?.() ? text.replace(/\bher\b/g, 'his') : text;
  }

  private show(look: HeadLook): void {
    // the style chips follow the hooks' list (it may grow once files are known)
    const styles = this.styles(), key = styles.map((s) => s.id).join('|');
    if (key !== this.styleKey) {
      this.styleKey = key;
      this.styleRow.replaceChildren();
      this.styleChips = [...styles.map((s) => ({ id: s.id, name: s.name })), { id: HAIR_STYLE_NONE, name: 'None' }].map(({ id, name }) => {
        const button = this.chip(name, `${HEAD_PANEL_ACTION.hairStyle}${id}`, (l) => ({ ...l, hair: { ...l.hair, style: id } }), true);
        this.styleRow.appendChild(button);
        return { id, button };
      });
    }
    for (const { id, button } of this.styleChips) lit(button, look.hair.style === id);

    for (const c of this.sliders) this.showSlider(c, look);

    for (const r of this.rows) {
      const colour = colourOf(look, r.part);
      const text = this.said(r.say(colour));
      if (r.line.textContent !== text) r.line.textContent = text;
      const ownTitle = this.said(r.own.dataset.title ?? r.own.title);
      if (r.own.title !== ownTitle) { r.own.title = ownTitle; r.own.setAttribute('aria-label', ownTitle); }
      lit(r.own, colour === null, true);
      let onList = false;
      for (const { colour: c, button } of r.list) { const on = colour !== null && c === colour.toLowerCase(); onList ||= on; lit(button, on, true); }
      if (r.custom) {
        const custom = colour !== null && !onList;
        lit(r.custom, custom, true);
        if (colour && r.input.ownerDocument.activeElement !== r.input && r.input.value !== colour) r.input.value = colour;
      }
    }

    let anyType = false;
    for (const t of this.typeChips) { const on = sameFace(look.face, t.look) && Object.keys(t.look).length > 0; anyType ||= on; lit(t.button, on); }
    const known = new Set(FACE_SLIDERS.map((s) => s.id));
    const moved = Object.entries(look.face).filter(([k, v]) => known.has(k) && v !== 0).length;
    for (const g of this.groups) {
      const n = g.ids.filter((id) => (look.face[id] ?? 0) !== 0).length;
      const text = faceGroupLine(g.group, n);
      if (g.summary.textContent !== text) g.summary.textContent = text;
    }
    this.resetFace.hidden = moved === 0 && Object.values(look.face).every((v) => v === 0);
    this.resetFace.style.display = this.resetFace.hidden ? 'none' : '';
    this.resetHead.hidden = isDefaultHead(look, this.own());
    this.resetHead.style.display = this.resetHead.hidden ? 'none' : '';
    const beard = this.hooks.beard?.() ?? false, style = (look.beard ?? BEARD_NONE).style;
    this.beardSection.hidden = !beard;
    this.beardSection.style.display = beard ? 'flex' : 'none';
    for (const { id, button } of this.beardChips) lit(button, style === id);
  }
}
