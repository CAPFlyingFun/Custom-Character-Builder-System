/**
 * HER SKIRT'S CONTROLS, in the OUTFIT tab while the outfit she wears has a skirt (Joshua, 2026-11-17: "is the length
 * adjustable yet or not yet? Setting preset lengths first then will add customization like the painted bottoms?"; and
 * his drawing of the same day, "two variables. 1) Length 2) How tightly it curves with the body from legs to legs").
 *
 *   LENGTH     his yellow lines: 0% where her legs part, 100% the floor; a chip for each of its stops
 *   FIT        his red lines: 0% on her all the way to its hem, 100% straight from her hips, and between them that
 *              share of the way from her to the cloth (`skirtDraft.SKIRT_FIT`)
 *   FLARE      how far it opens from where it is let go: 0% falls straight, 100% a full skirt
 *   HELD AT    its four anchors, each on or off (his: "front/back/both sides"; all off, it falls)
 *   SKIRT DEFAULTS   the outfit's own skirt again
 *
 * A SKIRT IS CUT AGAIN FOR EVERY ONE OF THEM, so a slider reports every move with `final` false -- the room shows it,
 * and the line ends "let go to cut" -- and its let-go with `final` true, when the room cuts; a chip or a button
 * reports `final` true. What it reports is always the room's numbers with only that control changed.
 *
 * Every slider is a LINE (a div with `data-field`) and, right after it, its range input, as the room's own sliders and
 * the new tee's are (`garmentPanel.ts`), so a probe finds one by `[data-field="..."] + input`. A line says what she
 * wears on her own landmarks once a skirt is cut for her (`SkirtMeasures`), and a percentage alone before.
 *
 * `refresh()` shows the room's numbers, and the room calls it often, so it never moves a slider a finger is on. Laid
 * out for the studio's inspector held upright: every slider fills the width, the chip rows wrap, every chip is at least
 * 30 px tall. Colours are the room's `--sl-*` tokens. Plain DOM: it reads the skirt's constants, never the room.
 */
import { SKIRT_CUT, anchorsOf, clampSkirt, fitOf, type SkirtAnchors, type SkirtSettings } from './skirt/skirtDraft';

/** Her own heights, metres from the floor as she stands at rest: her hip, knee and ankle joints. */
export interface SkirtMeasures { readonly hip: number; readonly knee: number; readonly ankle: number }

/** What the panel reads and drives; it never imports the room or the cloth. */
export interface SkirtPanelHooks {
  /** Her skirt's numbers as they stand (what the panel shows); null with no skirt on. */
  readonly settings: () => SkirtSettings | null;
  /** The outfit's own skirt, which SKIRT DEFAULTS goes back to; null with none. */
  readonly own: () => SkirtSettings | null;
  /** A control moved: `final` false as a finger drags, true when it lets go or taps a chip. */
  readonly change: (next: SkirtSettings, final: boolean) => void;
  /** Her landmarks for the lines; null until a skirt is cut for her. */
  readonly measures: () => SkirtMeasures | null;
}

/** `data-field` of each slider's line (its input follows it), for a probe. */
export const SKIRT_PANEL_FIELD = Object.freeze({ length: 'sarahlab-skirt-length', fit: 'sarahlab-skirt-fit', flare: 'sarahlab-skirt-flare' });
/** `data-action` of each button: `${lengthStop}<id>`, `${fitStop}<id>`, `${anchor}<front|back|left|right>`. */
export const SKIRT_PANEL_ACTION = Object.freeze({ lengthStop: 'sarahlab:skirt:length:', fitStop: 'sarahlab:skirt:fit:', anchor: 'sarahlab:skirt:anchor:', defaults: 'sarahlab:skirt:defaults' });
/** The panel's `data-role`. */
export const SKIRT_PANEL_ROLE = 'sarahlab-skirt-panel';
/** Ends a line while a finger drags its slider. */
export const LET_GO_TO_CUT = ' · let go to cut';

export interface SkirtStop { readonly id: string; readonly label: string; readonly at: number }
/**
 * GAME TUNING: LENGTH's stops, on his drawing's scale (`SKIRT_CUT.shortest`: 0 where her legs part, 1 the floor). MINI
 * and MAXI are the room's own two outfits'; KNEE ends just under her knee joints (MEASURED on her: 0.38 is at them),
 * MIDI at the middle of her calf (0.66).
 */
export const SKIRT_LENGTH_STOPS: readonly SkirtStop[] = Object.freeze([
  { id: 'mini', label: 'MINI', at: 0.15 }, { id: 'knee', label: 'KNEE', at: 0.4 }, { id: 'midi', label: 'MIDI', at: 0.66 }, { id: 'maxi', label: 'MAXI', at: 1 },
]);
/** FIT's stops: his two red lines and half-way between. */
export const SKIRT_FIT_STOPS: readonly SkirtStop[] = Object.freeze([
  { id: 'tight', label: 'TIGHT', at: 0 }, { id: 'half', label: 'HALF', at: 0.5 }, { id: 'straight', label: 'STRAIGHT', at: 1 },
]);
const ANCHORS: readonly (readonly [keyof SkirtAnchors, string])[] = [['front', 'FRONT'], ['back', 'BACK'], ['left', 'LEFT'], ['right', 'RIGHT']];

// ------------------------------------------------------------------------------------------------ the lines

const percent = (u: number): number => Math.round(Math.min(1, Math.max(0, u)) * 100);
const cm = (m: number): number => Math.round(Math.abs(m) * 100);
/** Where a skirt's hem is at LENGTH `length` on her, metres from the floor (`skirtDraft.hemOf`, by her two joints). */
export function hemAt(length: number, m: Pick<SkirtMeasures, 'hip' | 'knee'>): number {
  const top = m.hip - SKIRT_CUT.shortest * (m.hip - m.knee);
  return top + (SKIRT_CUT.floorClear - top) * Math.min(1, Math.max(0, length));
}
/** A height on her, said by her own landmarks: against her knee down to the middle of her calf, her ankle and the floor under that. */
function onHer(y: number, m: SkirtMeasures): string {
  const calf = (m.knee + m.ankle) / 2;
  if (Math.abs(y - m.knee) < 0.015) return 'at her knee';
  if (y > m.knee) return `${cm(y - m.knee)} cm over her knee`;
  if (y >= calf) return `${cm(m.knee - y)} cm under her knee`;
  if (Math.abs(y - m.ankle) < 0.015) return 'at her ankle';
  return y > m.ankle ? `${cm(y - m.ankle)} cm over her ankle` : `${cm(y)} cm off the floor`;
}
/** LENGTH at `length` (0..1): the share, and where its hem is on her once she is measured. */
export function lengthLine(length: number, m: SkirtMeasures | null, dragging = false): string {
  const p = percent(length);
  const where = !m ? '' : p >= 100 ? ' · to the floor' : p <= 0 ? ' · where her legs part' : ` · ${onHer(hemAt(length, m), m)}`;
  return `LENGTH · ${p}%${where}${dragging ? LET_GO_TO_CUT : ''}`;
}
/** FIT at `fit` (0..1): his two ends by name, and between them which of the two it is nearer. */
export function fitLine(fit: number, dragging = false): string {
  const p = percent(fit), tail = dragging ? LET_GO_TO_CUT : '';
  if (p >= 100) return `FIT · 100% · straight from her hips${tail}`;
  if (p <= 0) return `FIT · 0% · on her to its hem${tail}`;
  return `FIT · ${p}% · ${p < 50 ? 'close to her' : p > 50 ? 'loose' : 'half-way'}${tail}`;
}
/** FLARE at `flare` (0..1). */
export function flareLine(flare: number, dragging = false): string {
  const p = percent(flare);
  return `FLARE · ${p <= 0 ? 'none · falls straight' : p >= 100 ? '100% · a full skirt' : `${p}%`}${dragging ? LET_GO_TO_CUT : ''}`;
}

// ------------------------------------------------------------------------------------------------ the sliders

type SliderKey = keyof typeof SKIRT_PANEL_FIELD;
interface SliderSpec {
  readonly name: string;
  readonly get: (s: SkirtSettings) => number;
  readonly set: (s: SkirtSettings, x: number) => SkirtSettings;
  readonly line: (x: number, s: SkirtSettings, m: SkirtMeasures | null, dragging: boolean) => string;
  readonly presets?: { readonly stops: readonly SkirtStop[]; readonly action: string };
}
const SLIDERS: Readonly<Record<SliderKey, SliderSpec>> = Object.freeze({
  length: { name: 'Skirt length', get: (s) => s.length, set: (s, x) => ({ ...s, length: x }), line: (x, _s, m, d) => lengthLine(x, m, d), presets: { stops: SKIRT_LENGTH_STOPS, action: SKIRT_PANEL_ACTION.lengthStop } },
  fit: { name: 'Skirt fit', get: (s) => fitOf(s), set: (s, x) => ({ ...s, fit: x }), line: (x, _s, _m, d) => fitLine(x, d), presets: { stops: SKIRT_FIT_STOPS, action: SKIRT_PANEL_ACTION.fitStop } },
  flare: { name: 'Skirt flare', get: (s) => s.flare, set: (s, x) => ({ ...s, flare: x }), line: (x, _s, _m, d) => flareLine(x, d) },
});
const ORDER: readonly SliderKey[] = ['length', 'fit', 'flare'];

// ------------------------------------------------------------------------------------------------ the look
// (the new tee's panel's, `garmentPanel.ts`: the room's own controls in the theme's tokens, held to a narrow column)
const BODY_CSS = 'display:flex;flex-direction:column;gap:2px;min-width:0;padding-top:8px;border-top:1px solid var(--sl-line,#ffffff1f)';
const HEAD_CSS = 'font:700 10px system-ui,sans-serif;letter-spacing:.12em;color:var(--sl-muted,#9aa0a8)';
const LINE_CSS = 'font-size:12px;letter-spacing:.05em;margin-top:4px;overflow-wrap:anywhere';
const INPUT_CSS = 'display:block;box-sizing:border-box;width:100%;margin:2px 0;accent-color:var(--sl-accent,#d4a853);height:28px';
const ROW_CSS = 'display:flex;flex-wrap:wrap;gap:6px;min-width:0;margin:2px 0';
const CHIP_CSS = 'box-sizing:border-box;min-height:30px;max-width:100%;padding:7px 10px;border-radius:10px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:700 11px system-ui,sans-serif;letter-spacing:.05em;cursor:pointer';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, css: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.style.cssText = css;
  return e;
};
/** A chip shows whether it is the one chosen, as the room's own buttons do. */
function lit(b: HTMLButtonElement, on: boolean): void {
  const v = String(on);
  if (b.getAttribute('aria-pressed') === v) return;
  b.setAttribute('aria-pressed', v);
  b.style.background = on ? 'var(--sl-on,#806020)' : 'var(--sl-btn,#151b23)';
  b.style.borderColor = on ? 'var(--sl-accent,#d4a853)' : 'var(--sl-btn-line,#ffffff30)';
}
const pointerOf = (e: Event): number | undefined => (e as Partial<PointerEvent>).pointerId;
const stopEvent = (e: Event): void => e.stopPropagation();
/** What the panel shows before the room has a skirt to tell it of. */
const BLANK: SkirtSettings = clampSkirt({ top: 'under', length: 0.36, flare: 0.5, tucked: false });

interface Slider { readonly spec: SliderSpec; readonly line: HTMLDivElement; readonly input: HTMLInputElement; readonly chips: readonly { readonly stop: SkirtStop; readonly button: HTMLButtonElement }[] }

export class SkirtPanel {
  readonly element: HTMLElement;
  private readonly hooks: SkirtPanelHooks;
  private readonly sliders = new Map<SliderKey, Slider>();
  private readonly byInput = new Map<HTMLInputElement, Slider>();
  private readonly anchors = new Map<keyof SkirtAnchors, HTMLButtonElement>();
  /** The sliders a finger is on, each with that finger's pointer id. */
  private readonly held = new Map<HTMLInputElement, number | undefined>();
  /** Sliders moved since they last reported `final`. */
  private readonly moved = new Set<HTMLInputElement>();
  /** The slider whose own event is being reported (the room may refresh from inside `change`). */
  private reporting: HTMLInputElement | null = null;
  private disposed = false;
  /** A finger lifts anywhere: it may have slid off the slider it held. */
  private readonly lifted = (e: Event): void => this.release(pointerOf(e), e.type === 'pointercancel');

  constructor(hooks: SkirtPanelHooks) {
    this.hooks = hooks;
    this.element = document.createElement('div');
    this.element.dataset.tab = 'outfit';
    this.element.dataset.role = SKIRT_PANEL_ROLE;
    // no display of its own: the room shows and hides it
    this.element.style.cssText = 'box-sizing:border-box;min-width:0;max-width:100%';
    const body = el('div', BODY_CSS), head = el('div', HEAD_CSS);
    head.textContent = 'SKIRT';
    body.appendChild(head);
    for (const key of ORDER) body.append(...this.slider(key));
    const hold = el('div', HEAD_CSS);
    hold.textContent = 'HELD AT';
    hold.style.marginTop = '6px';
    const row = el('div', ROW_CSS);
    for (const [k, label] of ANCHORS) {
      const b = this.button(label, `${SKIRT_PANEL_ACTION.anchor}${k}`, (s) => { const a = anchorsOf(s); return { ...s, anchors: { ...a, [k]: !a[k] } }; }, true);
      this.anchors.set(k, b);
      row.appendChild(b);
    }
    body.append(hold, row);
    const foot = el('div', ROW_CSS);
    foot.style.marginTop = '6px';
    foot.appendChild(this.button('SKIRT DEFAULTS', SKIRT_PANEL_ACTION.defaults, () => this.hooks.own(), false));
    body.appendChild(foot);
    this.element.appendChild(body);

    // the room behind never hears it: no orbit from a drag on it, no shortcut from a key in it
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown']) this.element.addEventListener(type, stopEvent);
    const doc = this.element.ownerDocument;
    doc.addEventListener('pointerup', this.lifted, true);
    doc.addEventListener('pointercancel', this.lifted, true);
    for (const c of this.sliders.values()) this.show(c, BLANK, null, false);
    this.light(BLANK);
  }

  /** Show the numbers and lines as they stand now (the room calls it from its own refresh). */
  refresh(): void {
    if (this.disposed) return;
    const s = this.hooks.settings();
    if (!s) return;
    const m = this.hooks.measures();
    for (const c of this.sliders.values()) this.show(c, s, m);
    this.light(s);
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

  /** A slider: its line, its input right after it, and its stops' chips under it. In percent. */
  private slider(key: SliderKey): HTMLElement[] {
    const spec = SLIDERS[key];
    const line = el('div', LINE_CSS);
    line.dataset.field = SKIRT_PANEL_FIELD[key];
    const input = el('input', INPUT_CSS);
    input.type = 'range';
    input.min = '0'; input.max = '100'; input.step = '1';
    input.setAttribute('aria-label', spec.name);
    const presets = spec.presets;
    const chips = presets ? presets.stops.map((stop) => ({ stop, button: this.button(stop.label, `${presets.action}${stop.id}`, (s) => spec.set(s, stop.at), true) })) : [];
    const c: Slider = { spec, line, input, chips };
    this.sliders.set(key, c);
    this.byInput.set(input, c);
    input.addEventListener('input', () => { if (this.disposed) return; this.moved.add(input); this.report(c, false); });
    input.addEventListener('change', () => { if (this.disposed) return; this.moved.delete(input); this.report(c, true); });
    input.addEventListener('pointerdown', (e) => { if (this.disposed) return; this.moved.delete(input); this.held.set(input, pointerOf(e)); });
    input.addEventListener('pointerup', (e) => this.release(pointerOf(e), false));
    input.addEventListener('pointercancel', (e) => this.release(pointerOf(e), true));
    if (!chips.length) return [line, input];
    const row = el('div', ROW_CSS);
    row.append(...chips.map((x) => x.button));
    return [line, input, row];
  }

  /** A chip (`toggle`: it shows whether it is on) or a button: a tap reports `next` of the room's numbers, final. */
  private button(label: string, action: string, next: (s: SkirtSettings) => SkirtSettings | null, toggle: boolean): HTMLButtonElement {
    const b = el('button', CHIP_CSS);
    b.type = 'button';
    b.textContent = label;
    b.dataset.action = action;
    if (toggle) b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.disposed) return;
      const s = this.hooks.settings(), to = s ? next(s) : null;
      if (!to) return;
      this.dropFocus();
      this.hooks.change(clampSkirt(to), true);
      this.refresh();
    });
    return b;
  }

  /** The room hears this slider where it stands, `final` or not, its own line first. */
  private report(c: Slider, final: boolean): void {
    const s = this.hooks.settings();
    if (!s) return;
    this.show(c, s, this.hooks.measures(), true);
    const next = clampSkirt(c.spec.set(s, Number(c.input.value) / 100));
    this.reporting = c.input;
    try { this.hooks.change(next, final); } finally { this.reporting = null; }
  }

  /**
   * Finger `id` lifts from the slider it held -- or the browser takes the gesture away (`cancelled`: a scroll), which
   * sends no `change`, so where the finger left the slider is final.
   */
  private release(id: number | undefined, cancelled: boolean): void {
    if (this.disposed) return;
    for (const [input, holder] of [...this.held]) {
      if (holder !== id) continue;
      this.held.delete(input);
      const c = this.byInput.get(input)!;
      if (cancelled && this.moved.has(input)) { this.moved.delete(input); this.report(c, true); }
      else { const s = this.hooks.settings(); if (s) this.show(c, s, this.hooks.measures(), true); }
    }
  }

  /** One slider's input, line and chips: from the room's numbers, or -- while a finger is on it (`own`) -- from the slider itself, which is then never moved. */
  private show(c: Slider, s: SkirtSettings, m: SkirtMeasures | null, own = this.underFinger(c.input)): void {
    let x: number;
    if (own) x = Number(c.input.value) / 100;
    else {
      x = c.spec.get(s);
      const v = String(percent(x));
      if (c.input.value !== v) c.input.value = v;
    }
    // (a line is told of the skirt as it would be with this slider where it stands)
    const text = c.spec.line(x, c.spec.set(s, x), m, this.held.has(c.input) && this.moved.has(c.input));
    if (c.line.textContent !== text) { c.line.textContent = text; c.input.setAttribute('aria-valuetext', text); }
    for (const { stop, button } of c.chips) lit(button, Math.abs(x - stop.at) < 5e-3);
  }

  /** A finger is on it: a pointer down on it, the focus (a keyboard's arrows), or its own event being reported now. */
  private underFinger(input: HTMLInputElement): boolean {
    return this.held.has(input) || this.reporting === input || input.ownerDocument.activeElement === input;
  }

  /** A tap on the panel: a slider still focused from an earlier drag lets go of the focus, so it shows what the tap set. */
  private dropFocus(): void {
    const a = this.element.ownerDocument.activeElement;
    if (a instanceof HTMLInputElement && this.byInput.has(a) && !this.held.has(a)) a.blur();
  }

  private light(s: SkirtSettings): void {
    const a = anchorsOf(s);
    for (const [k, b] of this.anchors) lit(b, a[k]);
  }
}
