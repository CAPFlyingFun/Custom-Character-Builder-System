// @vitest-environment jsdom
/**
 * THE HEAD PANEL (src/sarahlab/headPanel.ts, the FACE tab's hair, eyes, brows, lashes, lips and face shape):
 * - every control is found by its data-field / data-action, a slider's line followed by its input;
 * - each change reports the WHOLE new look (a new object, only its part changed) with `final` false while a slider drags
 *   and true on let-go, chips and swatches;
 * - refresh() shows the room's look and never moves a slider a finger is on;
 * - a style with one length (or none) turns LENGTH off; a face type replaces the face and is marked only on an exact match;
 *   a face slider back at 0 drops its key; unknown styles and face keys neither throw nor are lost;
 * - RESET chips show only when they would do something; the touch sizes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HEAD_PANEL_ACTION as A, HEAD_PANEL_FIELD as F, HEAD_PANEL_ROLE, HEAD_TOUCH, HeadPanel, type HeadPanelHooks } from '../src/sarahlab/headPanel';
import { HEAD_DEFAULT, type HeadLook } from '../src/sarahlab/headLook';
import { HAIR_STYLES, type HairStyle } from '../src/sarahlab/hairStyles';
import { HAIR_COLOURS } from '../src/sarahlab/hairColours';
import { EYE_COLOURS, LIP_COLOURS } from '../src/sarahlab/faceLook';
import { FACE_SLIDERS, FACE_TYPES } from '../src/sarahlab/faceShapes';

const panels: HeadPanel[] = [];
afterEach(() => { for (const p of panels.splice(0)) p.dispose(); document.body.replaceChildren(); });

const ONE_LENGTH: HairStyle = { id: 'crop', name: 'Crop', file: 'x', lightFile: 'y', hasLength: false };

function setup(opts: { look?: HeadLook; store?: boolean; styles?: readonly HairStyle[] } = {}) {
  let look = opts.look ?? HEAD_DEFAULT;
  const change = vi.fn((next: HeadLook, _f: boolean) => { if (opts.store) look = next; });
  const hooks: HeadPanelHooks = { look: () => look, change, ...(opts.styles ? { styles: () => opts.styles! } : {}) };
  const panel = new HeadPanel(hooks);
  panels.push(panel);
  document.body.appendChild(panel.element);
  panel.refresh();
  return { panel, root: panel.element, change, set: (l: HeadLook) => { look = l; panel.refresh(); } };
}
const line = (r: HTMLElement, f: string) => r.querySelector<HTMLElement>(`[data-field="${f}"]`)!;
const slider = (r: HTMLElement, f: string) => r.querySelector<HTMLInputElement>(`[data-field="${f}"] + input`)!;
const btn = (r: HTMLElement, a: string) => r.querySelector<HTMLButtonElement>(`[data-action="${a}"]`)!;
const slide = (i: HTMLInputElement, v: number, type: 'input' | 'change' = 'input') => { i.value = String(v); i.dispatchEvent(new Event(type, { bubbles: true })); };
const last = (c: ReturnType<typeof vi.fn>) => c.mock.calls[c.mock.calls.length - 1] as [HeadLook, boolean];
const withFace = (face: Record<string, number>): HeadLook => ({ ...HEAD_DEFAULT, face });

describe('the controls exist', () => {
  it('has every line, slider, chip and swatch', () => {
    const { root } = setup();
    expect(root.dataset.role).toBe(HEAD_PANEL_ROLE.panel);
    for (const f of [F.hairLength, F.browAmount, F.lashes, F.lipAmount]) expect(slider(root, f).type).toBe('range');
    for (const f of [F.hairColour, F.eyeColour, F.browColour, F.lipColour]) expect(line(root, f)).toBeTruthy();
    for (const s of HAIR_STYLES) expect(btn(root, `${A.hairStyle}${s.id}`)).toBeTruthy();
    expect(btn(root, `${A.hairStyle}none`)).toBeTruthy();
    for (const c of [A.hairColour, A.eyeColour, A.browColour, A.lipColour]) { expect(btn(root, `${c}own`)).toBeTruthy(); expect(btn(root, `${c}custom`)).toBeTruthy(); }
    for (const c of HAIR_COLOURS) expect(btn(root, `${A.hairColour}${c.id}`)).toBeTruthy();
    for (const c of EYE_COLOURS) expect(btn(root, `${A.eyeColour}${c.id}`)).toBeTruthy();
    for (const c of LIP_COLOURS) expect(btn(root, `${A.lipColour}${c.id}`)).toBeTruthy();
    expect(root.querySelectorAll(`[data-action^="${A.browColour}"]`).length).toBe(2);
    for (const t of FACE_TYPES) expect(btn(root, `${A.faceType}${t.id}`)).toBeTruthy();
    for (const s of FACE_SLIDERS) expect(slider(root, `${F.faceSlider}${s.id}`).min).toBe('-100');
  });
  it('groups the face sliders in <details>, closed, in the order the groups first appear', () => {
    const { root } = setup();
    const ds = [...root.querySelectorAll<HTMLDetailsElement>('details')];
    const order = [...new Set(FACE_SLIDERS.map((s) => s.group))];
    expect(ds.map((d) => d.dataset.role)).toEqual(order.map((g) => `${HEAD_PANEL_ROLE.faceGroup}${g}`));
    expect(ds.every((d) => !d.open)).toBe(true);
    expect(ds[0].querySelector('summary')!.textContent).toBe('FACE');
  });
  it('says nothing that names her', () => {
    expect(setup().root.textContent!.toLowerCase()).not.toContain('sarah');
  });
});

describe('changes report the whole new look', () => {
  it('a hair length drag is not final, its let-go is, and the look is new', () => {
    const { root, change } = setup();
    slide(slider(root, F.hairLength), 40);
    let [next, final] = last(change);
    expect(final).toBe(false);
    expect(next).not.toBe(HEAD_DEFAULT);
    expect(next.hair).toEqual({ ...HEAD_DEFAULT.hair, length: 0.4 });
    expect(next.eyes).toEqual(HEAD_DEFAULT.eyes);
    slide(slider(root, F.hairLength), 40, 'change');
    [next, final] = last(change);
    expect(final).toBe(true);
    expect(HEAD_DEFAULT.hair.length).toBe(1);
  });
  it('brows, lashes and lips amounts', () => {
    const { root, change } = setup();
    slide(slider(root, F.browAmount), 30);
    expect(last(change)[0].brows).toEqual({ colour: null, amount: 0.3 });
    slide(slider(root, F.lashes), 0, 'change');
    expect(last(change)[0].lashes).toBe(0);
    slide(slider(root, F.lipAmount), 80);
    expect(last(change)[0].lips.amount).toBe(0.8);
  });
  it('a style chip, a colour swatch and own', () => {
    const { root, change } = setup();
    btn(root, `${A.hairStyle}none`).click();
    expect(last(change)).toEqual([{ ...HEAD_DEFAULT, hair: { ...HEAD_DEFAULT.hair, style: 'none' } }, true]);
    btn(root, `${A.hairColour}${HAIR_COLOURS[0].id}`).click();
    expect(last(change)[0].hair.colour).toBe(HAIR_COLOURS[0].colour);
    btn(root, `${A.eyeColour}${EYE_COLOURS[3].id}`).click();
    expect(last(change)[0].eyes.colour).toBe(EYE_COLOURS[3].colour);
    btn(root, `${A.lipColour}${LIP_COLOURS[2].id}`).click();
    expect(last(change)[0].lips.colour).toBe(LIP_COLOURS[2].colour);
    btn(root, `${A.browColour}own`).click();
    expect(last(change)[0].brows.colour).toBeNull();
  });
  it('a custom colour input reports non-final on input and final on change', () => {
    const { root, change } = setup();
    const input = root.querySelector<HTMLInputElement>(`[data-role="${HEAD_PANEL_ROLE.colourInput}eyes"]`)!;
    input.value = '#aabbcc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(last(change)).toEqual([{ ...HEAD_DEFAULT, eyes: { colour: '#aabbcc' } }, false]);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(last(change)[1]).toBe(true);
    const brow = root.querySelector<HTMLInputElement>(`[data-role="${HEAD_PANEL_ROLE.colourInput}brows"]`)!;
    brow.value = '#112233';
    brow.dispatchEvent(new Event('change', { bubbles: true }));
    expect(last(change)[0].brows.colour).toBe('#112233');
  });
});

describe('refresh shows the room\'s look', () => {
  it('lines, pressed chips and swatches follow it', () => {
    const { set, root } = setup();
    const look: HeadLook = { ...HEAD_DEFAULT, hair: { style: 'wavy-ponytail', length: 0.8, colour: HAIR_COLOURS[1].colour }, eyes: { colour: '#aabbcc' }, lashes: 0.25 };
    set(look);
    expect(btn(root, `${A.hairStyle}wavy-ponytail`).getAttribute('aria-pressed')).toBe('true');
    expect(btn(root, `${A.hairStyle}ponytail`).getAttribute('aria-pressed')).toBe('false');
    expect(line(root, F.hairLength).textContent).toBe('HAIR LENGTH 80%');
    expect(slider(root, F.hairLength).value).toBe('80');
    expect(line(root, F.hairColour).textContent).toBe(`HAIR COLOUR · ${HAIR_COLOURS[1].name}`);
    expect(btn(root, `${A.hairColour}${HAIR_COLOURS[1].id}`).getAttribute('aria-pressed')).toBe('true');
    expect(btn(root, `${A.hairColour}own`).getAttribute('aria-pressed')).toBe('false');
    expect(line(root, F.eyeColour).textContent).toBe('EYE COLOUR · #aabbcc');
    expect(btn(root, `${A.eyeColour}custom`).getAttribute('aria-pressed')).toBe('true');
    expect(line(root, F.lashes).textContent).toBe('LASHES · 25%');
  });
  it('never moves a slider under a finger or the focus, whose line follows it', () => {
    const { set, root } = setup();
    const input = slider(root, F.lashes);
    input.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    input.value = '55';
    set({ ...HEAD_DEFAULT, lashes: 0.1 });
    expect(input.value).toBe('55');
    expect(line(root, F.lashes).textContent).toBe('LASHES · 55%');
    input.dispatchEvent(new Event('pointerup', { bubbles: true }));
    document.dispatchEvent(new Event('pointerup'));
    set({ ...HEAD_DEFAULT, lashes: 0.1 });
    expect(input.value).toBe('10');
  });
});

describe('hair length', () => {
  it('is off for a style with one length and for none, and its line says so', () => {
    const { set, root } = setup({ styles: [...HAIR_STYLES, ONE_LENGTH] });
    set({ ...HEAD_DEFAULT, hair: { ...HEAD_DEFAULT.hair, style: 'crop' } });
    expect(slider(root, F.hairLength).disabled).toBe(true);
    expect(line(root, F.hairLength).textContent).toContain('one length');
    set({ ...HEAD_DEFAULT, hair: { ...HEAD_DEFAULT.hair, style: 'none' } });
    expect(slider(root, F.hairLength).disabled).toBe(true);
    expect(line(root, F.hairLength).textContent).toContain('no hair');
    set(HEAD_DEFAULT);
    expect(slider(root, F.hairLength).disabled).toBe(false);
  });
  it('offers the hooks\' styles, and an unknown style presses nothing and does not throw', () => {
    const { set, root } = setup({ styles: [ONE_LENGTH] });
    expect(btn(root, `${A.hairStyle}crop`)).toBeTruthy();
    expect(btn(root, `${A.hairStyle}ponytail`)).toBeNull();
    expect(() => set({ ...HEAD_DEFAULT, hair: { ...HEAD_DEFAULT.hair, style: 'from-the-future' } })).not.toThrow();
    expect(root.querySelectorAll(`[data-action^="${A.hairStyle}"][aria-pressed="true"]`).length).toBe(0);
    expect(slider(root, F.hairLength).disabled).toBe(false);
  });
});

describe('the shape of her face', () => {
  it('a face type replaces the face, and is marked only on an exact match', () => {
    const t = FACE_TYPES[1];
    const { root, change, set } = setup({ look: withFace({ nose: 1, jawWidth: 0.5 }) });
    btn(root, `${A.faceType}${t.id}`).click();
    const [next, final] = last(change);
    expect(final).toBe(true);
    expect(next.face).toEqual(t.look);
    expect(next.face).not.toBe(t.look);
    set(next);
    expect(btn(root, `${A.faceType}${t.id}`).getAttribute('aria-pressed')).toBe('true');
    set(withFace({ ...t.look, eyeSize: 0.99 }));
    expect(btn(root, `${A.faceType}${t.id}`).getAttribute('aria-pressed')).toBe('false');
  });
  it('a slider moves its key; back at 0 it drops the key; unknown keys survive', () => {
    const { root, change } = setup({ look: withFace({ mystery: 0.3, noseWidth: 0.5 }) });
    const s = slider(root, `${F.faceSlider}noseWidth`);
    expect(s.value).toBe('50');
    expect(line(root, `${F.faceSlider}noseWidth`).textContent).toBe('NOSE WIDTH +50%');
    slide(s, 35);
    expect(last(change)[0].face).toEqual({ mystery: 0.3, noseWidth: 0.35 });
    slide(s, -20, 'change');
    expect(last(change)).toEqual([withFace({ mystery: 0.3, noseWidth: -0.2 }), true]);
    slide(s, 0, 'change');
    expect('noseWidth' in last(change)[0].face).toBe(false);
    expect(last(change)[0].face.mystery).toBe(0.3);
    expect(line(root, `${F.faceSlider}noseLength`).textContent).toBe('NOSE LENGTH 0');
  });
  it('a group says how many of its sliders are moved', () => {
    const { root } = setup({ look: withFace({ noseWidth: 0.5, noseTip: -0.1, jawWidth: 0.2 }) });
    const sum = (g: string) => root.querySelector(`[data-role="${HEAD_PANEL_ROLE.faceGroup}${g}"] summary`)!.textContent;
    expect(sum('NOSE')).toBe('NOSE · 2 changed');
    expect(sum('JAW & CHIN')).toBe('JAW & CHIN · 1 changed');
    expect(sum('EARS')).toBe('EARS');
  });
});

describe('the reset chips', () => {
  it('RESET FACE shows only when something is moved and empties the face', () => {
    const { root, change, set } = setup();
    expect(btn(root, A.resetFace).hidden).toBe(true);
    set(withFace({ noseWidth: 0.1 }));
    expect(btn(root, A.resetFace).hidden).toBe(false);
    btn(root, A.resetFace).click();
    expect(last(change)).toEqual([{ ...withFace({ noseWidth: 0.1 }), face: {} }, true]);
  });
  it('RESET HEAD shows only when the look is not the default and gives HEAD_DEFAULT', () => {
    const { root, change, set } = setup();
    expect(btn(root, A.resetHead).hidden).toBe(true);
    set({ ...HEAD_DEFAULT, lashes: 0.2 });
    expect(btn(root, A.resetHead).hidden).toBe(false);
    btn(root, A.resetHead).click();
    expect(last(change)).toEqual([HEAD_DEFAULT, true]);
  });
});

describe('touch', () => {
  it('swatches are 32 px round, chips at least 32 px tall', () => {
    const { root } = setup();
    const swatch = btn(root, `${A.hairColour}own`), chip = btn(root, A.resetHead);
    expect(swatch.style.width).toBe(`${HEAD_TOUCH.swatch}px`);
    expect(swatch.style.height).toBe(`${HEAD_TOUCH.swatch}px`);
    expect(HEAD_TOUCH.swatch).toBeGreaterThanOrEqual(30);
    expect(HEAD_TOUCH.gap).toBeGreaterThanOrEqual(8);
    expect(chip.style.minHeight).toBe(`${HEAD_TOUCH.chip}px`);
    expect(HEAD_TOUCH.chip).toBeGreaterThanOrEqual(32);
  });
  it('keeps the room\'s events off the room', () => {
    const { root } = setup();
    const heard = vi.fn();
    document.body.addEventListener('pointerdown', heard);
    root.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(heard).not.toHaveBeenCalled();
  });
});
