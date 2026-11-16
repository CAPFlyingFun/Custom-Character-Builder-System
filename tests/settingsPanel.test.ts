// @vitest-environment jsdom
/**
 * THE ROOM'S SETTINGS (src/sarahlab/settingsPanel.ts; Joshua, 2026-11-16). A mode, three rows a hand may set over it,
 * LOAD AGAIN only while what is kept is not what the page was started with, the theme, what is kept on the device, the
 * version and her skin. The panel keeps no copy: it draws what its hooks say. And the layout has a SETTINGS section
 * with no rail button.
 */
import { describe, expect, it, vi } from 'vitest';
import { GRAPHICS_DEFAULT, graphicsInForce, type GraphicsSettings } from '../src/sarahlab/graphicsSettings';
import { BY_MODE, SETTINGS_ACTION, SETTINGS_FIELD, settingsPanel } from '../src/sarahlab/settingsPanel';
import { STUDIO_ROLE, STUDIO_SECTIONS, isStudioSection, studioLayout } from '../src/sarahlab/studioLayout';
import type { SkinDevice } from '../src/sarahlab/skinChoice';
import type { StudioTheme } from '../src/sarahlab/studioTheme';

const pc: SkinDevice = { asked: null, measuring: false, coarse: false, fine: true, width: 2560, height: 1440, ratio: 1 };

function room(device: SkinDevice = pc) {
  let kept: GraphicsSettings = GRAPHICS_DEFAULT, theme: StudioTheme = 'light';
  const started = graphicsInForce(kept, device), apply = vi.fn();
  const said = { device: 'the whole room is saved here (37 files, 44 MB)', notice: '' };
  const panel = settingsPanel(document, {
    settings: () => kept, inForce: () => started, wouldBe: (g) => graphicsInForce(g, device),
    change: (g) => { kept = g; }, apply,
    theme: () => theme, setTheme: (t) => { theme = t; }, themeAction: 'sarahlab:theme',
    deviceLine: () => said.device, notice: () => said.notice,
    skinLine: () => 'her full skin (208,592 triangles)', version: '0.9.35 · abc1234',
  });
  const button = (action: string) => panel.element.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const field = (id: string) => panel.element.querySelector<HTMLElement>(`[data-field="${id}"]`)!;
  return { panel, button, field, apply, said, kept: () => kept, theme: () => theme };
}
const on = (b: HTMLButtonElement) => b.getAttribute('aria-pressed') === 'true';

describe('the settings panel', () => {
  it('opens on AUTO with every row the mode\'s own, and nothing to load again', () => {
    const r = room();
    expect(on(r.button(`${SETTINGS_ACTION.mode}auto`))).toBe(true);
    for (const row of [SETTINGS_ACTION.skin, SETTINGS_ACTION.sharpness, SETTINGS_ACTION.smoothing]) expect(on(r.button(`${row}${BY_MODE}`))).toBe(true);
    // the mode's own chip says what the mode picks here
    expect(r.button(`${SETTINGS_ACTION.skin}${BY_MODE}`).textContent).toContain('FULL');
    expect(r.field(SETTINGS_FIELD.pending).style.display).toBe('none');
    expect(r.field(SETTINGS_FIELD.about).textContent).toContain('0.9.35');
    expect(r.field(SETTINGS_FIELD.skin).textContent).toContain('208,592');
    expect(r.panel.element.textContent).toContain('37 files');
  });

  it('a mode is kept, says what it sets, and asks for the room to be loaded again', () => {
    const r = room();
    r.button(`${SETTINGS_ACTION.mode}performance`).click();
    expect(r.kept()).toEqual({ mode: 'performance', skin: null, sharpness: null, smoothing: null });
    expect(r.button(`${SETTINGS_ACTION.skin}${BY_MODE}`).textContent).toContain('LIGHT');
    expect(r.button(`${SETTINGS_ACTION.sharpness}${BY_MODE}`).textContent).toContain('1×');
    expect(r.button(`${SETTINGS_ACTION.smoothing}${BY_MODE}`).textContent).toContain('OFF');
    const pending = r.field(SETTINGS_FIELD.pending);
    expect(pending.style.display).toBe('');
    expect(pending.textContent).toContain('light skin');
    expect(r.apply).not.toHaveBeenCalled();
    r.button(SETTINGS_ACTION.apply).click();
    expect(r.apply).toHaveBeenCalledTimes(1);
    // back to what the page was started with: nothing to load
    r.button(`${SETTINGS_ACTION.mode}visuals`).click();
    expect(pending.style.display).toBe('none');
  });

  it('each row is set by hand over the mode, and given back to it', () => {
    const r = room();
    r.button(`${SETTINGS_ACTION.mode}performance`).click();
    r.button(`${SETTINGS_ACTION.skin}full`).click();
    r.button(`${SETTINGS_ACTION.smoothing}on`).click();
    expect(r.kept()).toEqual({ mode: 'performance', skin: 'full', sharpness: null, smoothing: true });
    expect(on(r.button(`${SETTINGS_ACTION.skin}full`))).toBe(true);
    expect(on(r.button(`${SETTINGS_ACTION.skin}${BY_MODE}`))).toBe(false);
    expect(r.field(SETTINGS_FIELD.mode).textContent).toContain('2 set by hand');
    // only the sharpness is left to change
    expect(r.field(SETTINGS_FIELD.pending).textContent).toContain('1× sharpness');
    expect(r.field(SETTINGS_FIELD.pending).textContent).not.toContain('skin');
    r.button(`${SETTINGS_ACTION.skin}${BY_MODE}`).click();
    expect(r.kept().skin).toBeNull();
    r.button(`${SETTINGS_ACTION.sharpness}2`).click();
    expect(r.kept().sharpness).toBe(2);
    // a mode picked gives all three back
    r.button(`${SETTINGS_ACTION.mode}auto`).click();
    expect(r.kept()).toEqual(GRAPHICS_DEFAULT);
  });

  it('the theme changes at once, by the button that was on the stage', () => {
    const r = room();
    const b = r.button('sarahlab:theme');
    expect(b.textContent).toContain('LIGHT');
    b.click();
    expect(r.theme()).toBe('dark');
    expect(b.textContent).toContain('DARK');
    expect(r.field(SETTINGS_FIELD.pending).style.display).toBe('none');
  });

  it('says what the phone did only when there is something', () => {
    const r = room();
    expect(r.field(SETTINGS_FIELD.notice).style.display).toBe('none');
    r.said.notice = 'page loaded again ×2';
    r.panel.refresh();
    expect(r.field(SETTINGS_FIELD.notice).style.display).toBe('');
    expect(r.field(SETTINGS_FIELD.notice).textContent).toBe('page loaded again ×2');
  });
});

describe('the settings section', () => {
  it('is a section of the layout with no button on the rail', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const layout = studioLayout(root, { changed: () => undefined });
    expect(isStudioSection('settings')).toBe(true);
    expect(STUDIO_SECTIONS.map((s) => s.id as string)).not.toContain('settings');
    const rail = root.querySelector(`[data-role="${STUDIO_ROLE.rail}"]`)!;
    expect(rail.querySelectorAll('button').length).toBe(STUDIO_SECTIONS.length);
    layout.show('settings');
    expect(layout.open).toBe('settings');
    expect(root.querySelector(`[data-role="${STUDIO_ROLE.title}"]`)!.textContent).toBe('Settings');
    expect(root.querySelector('[data-section="settings"]')!.hasAttribute('data-open')).toBe(true);
    // no rail button is pressed while it is open
    expect([...rail.querySelectorAll('button')].some((b) => b.getAttribute('aria-pressed') === 'true')).toBe(false);
  });
});
