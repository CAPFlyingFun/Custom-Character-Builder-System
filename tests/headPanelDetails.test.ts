// @vitest-environment jsdom
/**
 * THE FACE TAB'S DETAILS (2026-11-22, `headPanel.ts`): an INNER RING for the eyes, the brows' SHAPE, FRECKLES with their
 * areas, FACE DETAIL with deep-set eyes (the face slider `eyeDepth`, shown there and not in its FACE SHAPE group), and
 * SKIN PICTURE only where the room can keep a picture. Each reports the whole new look, as the rest of the panel does.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HEAD_PANEL_ACTION as A, HEAD_PANEL_FIELD as F, HEAD_PANEL_ROLE, HeadPanel, type HeadPanelHooks } from '../src/sarahlab/headPanel';
import { HEAD_DEFAULT, MARKS_NONE, type HeadLook } from '../src/sarahlab/headLook';
import { IRIS_INNER_COLOURS, MARK_COLOURS } from '../src/sarahlab/faceLook';

const panels: HeadPanel[] = [];
afterEach(() => { for (const p of panels.splice(0)) p.dispose(); document.body.replaceChildren(); });

function setup(extra: Partial<HeadPanelHooks> = {}, start: HeadLook = HEAD_DEFAULT) {
  let look = start;
  const change = vi.fn((next: HeadLook) => { look = next; });
  const panel = new HeadPanel({ look: () => look, change, ...extra });
  panels.push(panel);
  document.body.appendChild(panel.element);
  panel.refresh();
  return { root: panel.element, change, look: () => look, panel };
}
const line = (r: HTMLElement, f: string) => r.querySelector<HTMLElement>(`[data-field="${f}"]`)!;
const slider = (r: HTMLElement, f: string) => r.querySelector<HTMLInputElement>(`[data-field="${f}"] + input`)!;
const btn = (r: HTMLElement, a: string) => r.querySelector<HTMLButtonElement>(`[data-action="${a}"]`)!;
const slide = (i: HTMLInputElement, v: number) => { i.value = String(v); i.dispatchEvent(new Event('change', { bubbles: true })); };
const section = (r: HTMLElement, name: string) => r.querySelector<HTMLElement>(`[data-role="${HEAD_PANEL_ROLE.section}${name}"]`)!;

describe('the details in the FACE tab', () => {
  it('has an inner ring, a brow shape, freckles and the face\'s details', () => {
    const { root } = setup();
    for (const c of IRIS_INNER_COLOURS) expect(btn(root, `${A.eyeInner}${c.id}`)).toBeTruthy();
    for (const f of [F.eyeInnerSize, F.browArch, F.browStraight, F.browTilt, F.browThick, F.marksAmount, F.marksSize, F.detailCrease, F.detailSmile, F.detailPhiltrum, `${F.faceSlider}eyeDepth`]) {
      expect(slider(root, f)?.type, f).toBe('range');
    }
    for (const id of ['nose', 'cheeks', 'forehead', 'shoulders']) expect(btn(root, `${A.marksArea}${id}`)).toBeTruthy();
    for (const c of MARK_COLOURS.slice(1)) expect(btn(root, `${A.marksColour}${c.id}`)).toBeTruthy();
    expect(line(root, F.eyeInner).textContent).toBe('INNER RING · none (one colour)');
    expect(line(root, F.marksAmount).textContent).toBe('FRECKLES · none');
    // deep-set eyes in FACE DETAIL, once
    expect(root.querySelectorAll(`[data-field="${F.faceSlider}eyeDepth"]`).length).toBe(1);
    expect(section(root, 'detail').querySelector(`[data-field="${F.faceSlider}eyeDepth"]`)).toBeTruthy();
  });
  it('reports each as the whole new look', () => {
    const { root, look } = setup();
    btn(root, `${A.eyeInner}gold`).click();
    expect(look().eyes.inner).toBe('#bf8f45');
    expect(line(root, F.eyeInner).textContent).toBe('INNER RING · gold');
    slide(slider(root, F.browArch), 40);
    expect(look().brows.arch).toBe(0.4);
    slide(slider(root, F.detailCrease), 60);
    expect(look().detail).toEqual({ crease: 0.6, smile: 0, philtrum: 0 });
    slide(slider(root, `${F.faceSlider}eyeDepth`), 50);
    expect(look().face.eyeDepth).toBe(0.5);
    // an area switched on with no freckles gives them an amount to be seen by; its chip shows it
    btn(root, `${A.marksArea}shoulders`).click();
    expect(look().marks).toEqual({ ...MARKS_NONE, shoulders: true, amount: 0.5 });
    expect(btn(root, `${A.marksArea}shoulders`).getAttribute('aria-pressed')).toBe('true');
    btn(root, `${A.marksArea}nose`).click();
    expect(look().marks?.nose).toBe(false);
    expect(look().hair).toBe(HEAD_DEFAULT.hair);
  });
  it('offers SKIN PICTURE only where the room can keep a picture, and keeps one through its hook', async () => {
    expect(section(setup().root, 'overlay').style.display).toBe('none');
    const upload = vi.fn(async () => null);
    const { root, look } = setup({ uploadOverlay: upload, overlayState: () => ({ name: 'freckles', missing: false }) }, { ...HEAD_DEFAULT, overlay: { image: 'aaaaaaaaaaaaaaaa', amount: 0.5 } });
    expect(section(root, 'overlay').style.display).toBe('flex');
    expect(line(root, F.overlay).textContent).toBe('SKIN PICTURE · freckles · 50%');
    const input = root.querySelector<HTMLInputElement>(`[data-role="${HEAD_PANEL_ROLE.overlayInput}"]`)!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'mary.png', { type: 'image/png' })] });
    input.dispatchEvent(new Event('change'));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(line(root, F.overlay).textContent).toBe('SKIN PICTURE · keeping the picture…');
    await new Promise((r) => setTimeout(r, 0));
    btn(root, A.overlayRemove).click();
    expect(look().overlay).toBeUndefined();
    expect(line(root, F.overlay).textContent).toBe('SKIN PICTURE · none');
  });
});
