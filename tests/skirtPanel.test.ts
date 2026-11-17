// @vitest-environment jsdom
/**
 * HER SKIRT'S CONTROLS (src/sarahlab/skirtPanel.ts; Joshua, 2026-11-17: "is the length adjustable yet…? …will add
 * customization like the painted bottoms"; his drawing's two numbers, LENGTH and how closely it holds to her):
 * - LENGTH, FIT and FLARE are each a line and, right after it, its slider in percent (a probe finds one by
 *   `[data-field] + input`); LENGTH and FIT carry a chip a stop; HELD AT is its four anchors; SKIRT DEFAULTS;
 * - a slider reports each move with `final` false -- a skirt is cut again when the finger lets go -- and its let-go
 *   with `final` true, with only its own number changed; chips and buttons report `final` true;
 * - refresh() shows the room's numbers, never moving a slider a finger is on;
 * - the lines say what she wears on her own landmarks once a skirt is cut for her.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LET_GO_TO_CUT, SKIRT_FIT_STOPS, SKIRT_LENGTH_STOPS, SKIRT_PANEL_ACTION as A, SKIRT_PANEL_FIELD as F, SKIRT_PANEL_ROLE, SkirtPanel, fitLine, flareLine, hemAt, lengthLine,
  type SkirtMeasures, type SkirtPanelHooks,
} from '../src/sarahlab/skirtPanel';
import { SKIRT_CUT, anchorsOf, clampSkirt, fitOf, hemOf, type SkirtSettings } from '../src/sarahlab/skirt/skirtDraft';
import { SKIRTS } from '../src/sarahlab/sarahLabTool';
import type { BodyInput } from '../src/sarahlab/garment/types';

/** Her own heights at 0% (MEASURED in the room, 2026-11-17). */
const HER: SkirtMeasures = Object.freeze({ hip: 0.8865, knee: 0.5213, ankle: 0.1096 });
const OWN: SkirtSettings = clampSkirt({ top: 'under', length: 0.36, flare: 0.55, tucked: false });

const panels: SkirtPanel[] = [];
afterEach(() => { for (const p of panels.splice(0)) p.dispose(); document.body.replaceChildren(); });

/** The panel on fake hooks. `store`: a room that keeps every change it hears (by default it keeps nothing). */
function setup(opts: { settings?: SkirtSettings | null; measures?: SkirtMeasures | null; store?: boolean } = {}) {
  let settings = opts.settings === undefined ? OWN : opts.settings, measures = opts.measures === undefined ? HER : opts.measures;
  const change = vi.fn((next: SkirtSettings, _final: boolean) => { if (opts.store) settings = next; });
  const hooks: SkirtPanelHooks = { settings: () => settings, own: () => OWN, change, measures: () => measures };
  const panel = new SkirtPanel(hooks);
  panels.push(panel);
  document.body.appendChild(panel.element);
  panel.refresh();
  return { panel, root: panel.element, change, set: (next: SkirtSettings | null) => { settings = next; }, setMeasures: (m: SkirtMeasures | null) => { measures = m; } };
}
const line = (root: HTMLElement, field: string) => root.querySelector<HTMLElement>(`[data-field="${field}"]`)!;
const slider = (root: HTMLElement, field: string) => root.querySelector<HTMLInputElement>(`[data-field="${field}"] + input`)!;
const chip = (root: HTMLElement, action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
const slide = (input: HTMLInputElement, value: number, type: 'input' | 'change' = 'input') => { input.value = String(value); input.dispatchEvent(new Event(type, { bubbles: true })); };
const pointer = (target: EventTarget, type: string, id = 1) => { const e = new Event(type, { bubbles: true }); Object.defineProperty(e, 'pointerId', { value: id }); target.dispatchEvent(e); };

describe('the lines', () => {
  it('LENGTH says his scale and where its hem is on her', () => {
    expect(lengthLine(0.36, null)).toBe('LENGTH · 36%');
    expect(lengthLine(0, HER)).toBe('LENGTH · 0% · where her legs part');
    expect(lengthLine(1, HER)).toBe('LENGTH · 100% · to the floor');
    expect(lengthLine(0.15, HER)).toBe('LENGTH · 15% · 17 cm over her knee');
    expect(lengthLine(0.38, HER)).toBe('LENGTH · 38% · at her knee');
    expect(lengthLine(0.5, HER)).toBe('LENGTH · 50% · 9 cm under her knee');
    expect(lengthLine(0.86, HER)).toBe('LENGTH · 86% · 5 cm over her ankle');
    expect(lengthLine(0.95, HER)).toBe('LENGTH · 95% · at her ankle');
    expect(lengthLine(0.98, HER)).toBe('LENGTH · 98% · 7 cm off the floor');
    expect(lengthLine(0.5, HER, true)).toBe(`LENGTH · 50% · 9 cm under her knee${LET_GO_TO_CUT}`);
  });
  it('...by the draft\'s own hem', () => {
    const joints = { hip: [[0.09, HER.hip, 0], [-0.09, HER.hip, 0]], knee: [[0.1, HER.knee, 0], [-0.1, HER.knee, 0]] } as unknown as BodyInput['joints'];
    for (const l of [0, 0.15, 0.36, 0.5, 1]) expect(hemAt(l, HER)).toBeCloseTo(hemOf(joints, l), 9);
    expect(hemAt(1, HER)).toBeCloseTo(SKIRT_CUT.floorClear, 9);
  });
  it('FIT says his two ends by name, and between them which way it leans', () => {
    expect(fitLine(1)).toBe('FIT · 100% · straight from her hips');
    expect(fitLine(0)).toBe('FIT · 0% · on her to its hem');
    expect(fitLine(0.25)).toBe('FIT · 25% · close to her');
    expect(fitLine(0.5)).toBe('FIT · 50% · half-way');
    expect(fitLine(0.51)).toBe('FIT · 51% · loose');
    expect(fitLine(0.8)).toBe('FIT · 80% · loose');
    expect(fitLine(0.5, true)).toBe(`FIT · 50% · half-way${LET_GO_TO_CUT}`);
  });
  it('FLARE says how far it opens', () => {
    expect(flareLine(0)).toBe('FLARE · none · falls straight');
    expect(flareLine(0.55)).toBe('FLARE · 55%');
    expect(flareLine(1)).toBe('FLARE · 100% · a full skirt');
  });
});

describe('the panel', () => {
  it('is three lines each with its slider after it, in percent, chips for LENGTH\'s and FIT\'s stops, four anchors and SKIRT DEFAULTS', () => {
    const { root } = setup();
    expect(root.dataset.role).toBe(SKIRT_PANEL_ROLE); expect(root.dataset.tab).toBe('outfit');
    for (const f of [F.length, F.fit, F.flare]) { const i = slider(root, f); expect([i.type, i.min, i.max, i.step]).toEqual(['range', '0', '100', '1']); expect(i.getAttribute('aria-label')).toBeTruthy(); }
    expect([slider(root, F.length).value, slider(root, F.fit).value, slider(root, F.flare).value]).toEqual(['36', '100', '55']);
    expect(line(root, F.length).textContent).toBe('LENGTH · 36% · 2 cm over her knee');
    expect(line(root, F.fit).textContent).toBe('FIT · 100% · straight from her hips');
    for (const s of SKIRT_LENGTH_STOPS) expect(chip(root, `${A.lengthStop}${s.id}`).textContent).toBe(s.label);
    for (const s of SKIRT_FIT_STOPS) expect(chip(root, `${A.fitStop}${s.id}`).textContent).toBe(s.label);
    for (const k of ['front', 'back', 'left', 'right']) expect(chip(root, `${A.anchor}${k}`).getAttribute('aria-pressed')).toBe('true');
    expect(chip(root, A.defaults).textContent).toBe('SKIRT DEFAULTS');
    expect(chip(root, `${A.fitStop}straight`).getAttribute('aria-pressed')).toBe('true'); expect(chip(root, `${A.fitStop}tight`).getAttribute('aria-pressed')).toBe('false');
    for (const b of root.querySelectorAll('button')) expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(30);
  });
  it('its stops are the room\'s own two outfits\' at their ends', () => {
    const by = (n: string) => SKIRTS.find(([name]) => name.includes(n))![2].length;
    expect(SKIRT_LENGTH_STOPS.find((s) => s.id === 'mini')!.at).toBe(by('mini')); expect(SKIRT_LENGTH_STOPS.find((s) => s.id === 'maxi')!.at).toBe(by('maxi'));
  });
  it('reports a slider\'s every move as not final and its let-go as final, with only its own number changed', () => {
    const { root, change } = setup();
    const fit = slider(root, F.fit);
    pointer(fit, 'pointerdown'); slide(fit, 40);
    expect(change).toHaveBeenLastCalledWith({ ...OWN, fit: 0.4 }, false);
    expect(line(root, F.fit).textContent).toBe(`FIT · 40% · close to her${LET_GO_TO_CUT}`);
    slide(fit, 25, 'change');
    expect(change).toHaveBeenLastCalledWith({ ...OWN, fit: 0.25 }, true);
    slide(slider(root, F.length), 80, 'change');
    expect(change).toHaveBeenLastCalledWith({ ...OWN, length: 0.8 }, true);
    slide(slider(root, F.flare), 0, 'change');
    expect(change).toHaveBeenLastCalledWith({ ...OWN, flare: 0 }, true);
    // (FIT back at 100% says nothing of it, as every skirt before it)
    slide(fit, 100, 'change');
    expect(change).toHaveBeenLastCalledWith(OWN, true);
  });
  it('a gesture the browser takes away still ends final', () => {
    const { root, change } = setup();
    const length = slider(root, F.length);
    pointer(length, 'pointerdown', 7); slide(length, 60);
    pointer(length, 'pointercancel', 7);
    expect(change).toHaveBeenLastCalledWith({ ...OWN, length: 0.6 }, true);
  });
  it('a chip sets its stop, an anchor is let go and taken up, and SKIRT DEFAULTS is the outfit\'s own, each final', () => {
    const { root, change, panel } = setup({ store: true });
    chip(root, `${A.lengthStop}maxi`).click();
    expect(change).toHaveBeenLastCalledWith({ ...OWN, length: 1 }, true);
    expect(slider(root, F.length).value).toBe('100'); expect(chip(root, `${A.lengthStop}maxi`).getAttribute('aria-pressed')).toBe('true');
    chip(root, `${A.fitStop}tight`).click();
    expect(fitOf(change.mock.lastCall![0])).toBe(0); expect(line(root, F.fit).textContent).toBe('FIT · 0% · on her to its hem');
    chip(root, `${A.anchor}left`).click();
    expect(anchorsOf(change.mock.lastCall![0])).toEqual({ front: true, back: true, left: false, right: true });
    expect(chip(root, `${A.anchor}left`).getAttribute('aria-pressed')).toBe('false');
    chip(root, `${A.anchor}left`).click();
    expect('anchors' in change.mock.lastCall![0]).toBe(false);
    chip(root, A.defaults).click();
    expect(change).toHaveBeenLastCalledWith(OWN, true);
    panel.refresh();
    expect([slider(root, F.length).value, slider(root, F.fit).value]).toEqual(['36', '100']);
  });
  it('shows the room\'s numbers on refresh, but never moves a slider a finger is on', () => {
    const { root, panel, set } = setup();
    const length = slider(root, F.length);
    pointer(length, 'pointerdown', 3); slide(length, 70);
    set({ ...OWN, length: 0.2, flare: 0.1 });
    panel.refresh();
    expect(length.value).toBe('70'); expect(slider(root, F.flare).value).toBe('10');
    pointer(length, 'pointerup', 3); length.dispatchEvent(new Event('change', { bubbles: true }));
    panel.refresh();
    expect(length.value).toBe('20');
  });
  it('with no skirt on it changes nothing and reports nothing; before she is measured its lines are percentages', () => {
    const { root, change, set, setMeasures, panel } = setup({ settings: null });
    chip(root, `${A.lengthStop}mini`).click(); slide(slider(root, F.fit), 30, 'change');
    expect(change).not.toHaveBeenCalled();
    set(OWN); setMeasures(null); panel.refresh();
    expect(line(root, F.length).textContent).toBe('LENGTH · 36%');
  });
  it('keeps its events off the room behind it', () => {
    const { root } = setup(), heard = vi.fn();
    document.body.addEventListener('pointerdown', heard); document.body.addEventListener('keydown', heard); document.body.addEventListener('wheel', heard);
    slider(root, F.length).dispatchEvent(new Event('pointerdown', { bubbles: true })); root.dispatchEvent(new Event('keydown', { bubbles: true })); root.dispatchEvent(new Event('wheel', { bubbles: true }));
    expect(heard).not.toHaveBeenCalled();
  });
});
