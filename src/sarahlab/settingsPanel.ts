/**
 * THE ROOM'S SETTINGS (Joshua, 2026-11-16: "add a toggle max performance/max visuals in settings"; "Manual on/off +
 * auto"; "Make these with manual overrides from the default for mix and match… Her Skin, Screen Sharpness, Edge
 * Smoothing"; "move the Light/Dark theme in settings"; "Yes to all": what is kept on this device and what the phone
 * did, the version, which skin is on). Opened by the ⚙ at the stage's top right, where LIGHT / DARK was.
 *
 *   PERFORMANCE   AUTO · MAX PERFORMANCE · MAX VISUALS, then three rows a mode sets and a hand may set over it:
 *                 HER SKIN (light / full), SCREEN SHARPNESS (1× / 2×), EDGE SMOOTHING (off / on) -- each row's first
 *                 chip is the mode's own and says what that is
 *   LOAD AGAIN    there only while what is kept is not what the page was started with (`graphicsSettings.ts`: the
 *                 graphics are made with all three)
 *   THEME         LIGHT / DARK, at once
 *   THIS DEVICE   what of the room is kept here, and what the phone did to the page
 *   ABOUT         the version, and her skin as she wears it now
 *
 * The room owns everything: the panel keeps no copy and draws what its hooks say on `refresh()`. Plain DOM.
 */
import { GRAPHICS_MODES, GRAPHICS_MODE_NAMES, sameInForce, setByHand, withMode, type GraphicsInForce, type GraphicsMode, type GraphicsSettings } from './graphicsSettings';
import type { StudioTheme } from './studioTheme';

export const SETTINGS_ACTION = Object.freeze({
  /** the ⚙ on the stage */
  open: 'sarahlab:settings',
  mode: 'sarahlab:settings:mode:',
  skin: 'sarahlab:settings:skin:',
  sharpness: 'sarahlab:settings:sharpness:',
  smoothing: 'sarahlab:settings:smoothing:',
  apply: 'sarahlab:settings:apply',
});
export const SETTINGS_FIELD = Object.freeze({ mode: 'sarahlab-settings-mode', pending: 'sarahlab-settings-pending', skin: 'sarahlab-settings-skin', about: 'sarahlab-settings-about', notice: 'sarahlab-settings-notice' });
/** In a row's `data-action`: the chip that gives the row back to the mode. */
export const BY_MODE = 'mode';

export interface SettingsPanelHooks {
  /** the settings as kept on this device */
  settings(): GraphicsSettings;
  /** what this page was started with, and what it would be started with on those settings */
  inForce(): GraphicsInForce;
  wouldBe(settings: GraphicsSettings): GraphicsInForce;
  /** keep them (nothing is drawn differently until the room is loaded again) */
  change(next: GraphicsSettings): void;
  /** load the room again */
  apply(): void;
  theme(): StudioTheme;
  setTheme(theme: StudioTheme): void;
  /** the theme button's `data-action` (the one it had on the stage) */
  readonly themeAction?: string;
  /** the device line's `data-field` */
  readonly deviceField?: string;
  /** what of the room is kept on this device; what the phone did to the page ('' for nothing) */
  deviceLine(): string;
  notice(): string;
  /** her skin as she wears it now, in words ('' before she is in) */
  skinLine(): string;
  readonly version: string;
}

export interface SettingsPanel { readonly element: HTMLElement; refresh(): void }

const skinName = (light: boolean) => (light ? 'LIGHT' : 'FULL');
const sharpName = (n: 1 | 2) => (n === 1 ? '1×' : 'UP TO 2×');
const smoothName = (on: boolean) => (on ? 'ON' : 'OFF');

export const SETTINGS_CSS = `
.sl-set{display:flex;flex-direction:column;gap:9px}
.sl-set h3{margin:0 0 7px;font:750 11px system-ui,sans-serif;letter-spacing:.06em;color:var(--sl-ink)}
.sl-set .sl-set-label{margin:9px 0 5px;font:700 9.5px system-ui,sans-serif;letter-spacing:.1em;color:var(--sl-muted)}
.sl-set .sl-set-chips{display:flex;gap:6px}
.sl-set .sl-set-chips>button{flex:1 1 0;min-width:0;min-height:38px;padding:5px 4px;border-radius:10px;border:1px solid var(--sl-btn-line);background:var(--sl-btn);color:var(--sl-ink);
  font:700 10.5px/1.2 system-ui,sans-serif;letter-spacing:.03em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sl-set .sl-set-chips>button small{display:block;font:600 9px system-ui,sans-serif;letter-spacing:.02em;opacity:.75;margin-top:1px}
.sl-set .sl-set-chips>button[aria-pressed="true"]{background:var(--sl-accent);border-color:var(--sl-accent);color:var(--sl-chrome)}
.sl-set .sl-set-note{font:500 10.5px/1.4 system-ui,sans-serif;color:var(--sl-muted)}
.sl-set .sl-set-pending{border-color:var(--sl-accent)!important}
.sl-set .sl-set-apply{margin-top:8px;width:100%;min-height:44px;border-radius:10px;border:1px solid var(--sl-accent);background:var(--sl-on-soft);color:var(--sl-ink);font:700 12px system-ui,sans-serif;letter-spacing:.08em;cursor:pointer}
.sl-set .sl-set-theme{min-height:38px;padding:5px 14px;border-radius:10px;border:1px solid var(--sl-btn-line);background:var(--sl-btn);color:var(--sl-ink);font:700 11px system-ui,sans-serif;letter-spacing:.05em;cursor:pointer}
.sl-set .sl-set-danger{color:var(--sl-danger,#d46a53);font-weight:700}`;

export function settingsPanel(doc: Document, hooks: SettingsPanelHooks): SettingsPanel {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const root = el('div', 'sl-set');
  const style = el('style'); style.textContent = SETTINGS_CSS;
  root.appendChild(style);
  const card = (title: string) => { const c = el('div', 'sl-card'); c.appendChild(el('h3', '', title)); root.appendChild(c); return c; };
  const chip = (action: string, onClick: () => void) => {
    const b = el('button'); b.type = 'button'; b.dataset.action = action;
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); panel.refresh(); });
    return b;
  };
  const say = (b: HTMLButtonElement, label: string, sub = '') => {
    const want = sub ? `${label}\n${sub}` : label;
    if (b.dataset.says === want) return;
    b.dataset.says = want; b.textContent = label;
    if (sub) b.appendChild(el('small', '', sub));
  };

  // ------------------------------------------------------------ performance
  const perf = card('PERFORMANCE');
  const modes = el('div', 'sl-set-chips');
  const modeChips = new Map<GraphicsMode, HTMLButtonElement>();
  for (const m of GRAPHICS_MODES) { const b = chip(`${SETTINGS_ACTION.mode}${m}`, () => hooks.change(withMode(m))); say(b, GRAPHICS_MODE_NAMES[m]); modeChips.set(m, b); modes.appendChild(b); }
  perf.appendChild(modes);
  const modeNote = el('div', 'sl-set-note'); modeNote.dataset.field = SETTINGS_FIELD.mode; modeNote.style.marginTop = '6px';
  perf.appendChild(modeNote);

  interface Row<T> { readonly own: HTMLButtonElement; readonly picks: readonly [T, HTMLButtonElement][] }
  function row<T extends string | number | boolean>(label: string, action: string, values: readonly [T, string, string][], set: (s: GraphicsSettings, v: T | null) => GraphicsSettings): Row<T> {
    perf.appendChild(el('div', 'sl-set-label', label));
    const chips = el('div', 'sl-set-chips');
    const own = chip(`${action}${BY_MODE}`, () => hooks.change(set(hooks.settings(), null)));
    chips.appendChild(own);
    const picks: [T, HTMLButtonElement][] = values.map(([v, id, name]) => { const b = chip(`${action}${id}`, () => hooks.change(set(hooks.settings(), v))); say(b, name); chips.appendChild(b); return [v, b]; });
    perf.appendChild(chips);
    return { own, picks };
  }
  const skinRow = row<'light' | 'full'>('HER SKIN', SETTINGS_ACTION.skin, [['light', 'light', 'LIGHT'], ['full', 'full', 'FULL']], (s, v) => ({ ...s, skin: v }));
  const sharpRow = row<1 | 2>('SCREEN SHARPNESS', SETTINGS_ACTION.sharpness, [[1, '1', '1×'], [2, '2', 'UP TO 2×']], (s, v) => ({ ...s, sharpness: v }));
  const smoothRow = row<boolean>('EDGE SMOOTHING', SETTINGS_ACTION.smoothing, [[false, 'off', 'OFF'], [true, 'on', 'ON']], (s, v) => ({ ...s, smoothing: v }));
  const tip = el('div', 'sl-set-note', 'Light skin: fewer triangles, the same shape. 1× sharpness and no smoothing draw fewer pixels: faster, a little softer and rougher at the edges.');
  tip.style.marginTop = '9px';
  perf.appendChild(tip);

  // ------------------------------------------------------------ load again
  const pending = el('div', 'sl-card sl-set-pending'); pending.dataset.field = SETTINGS_FIELD.pending; pending.style.display = 'none';
  const pendingLine = el('div', 'sl-set-note');
  const apply = el('button', 'sl-set-apply', 'LOAD THE ROOM AGAIN'); apply.type = 'button'; apply.dataset.action = SETTINGS_ACTION.apply;
  apply.addEventListener('click', (e) => { e.stopPropagation(); hooks.apply(); });
  pending.append(pendingLine, apply);
  root.appendChild(pending);

  // ------------------------------------------------------------ theme
  const themeCard = card('THEME');
  const themeButton = el('button', 'sl-set-theme');
  themeButton.type = 'button'; if (hooks.themeAction) themeButton.dataset.action = hooks.themeAction;
  themeButton.addEventListener('click', (e) => { e.stopPropagation(); hooks.setTheme(hooks.theme() === 'light' ? 'dark' : 'light'); panel.refresh(); });
  themeCard.appendChild(themeButton);

  // ------------------------------------------------------------ this device, about
  const deviceCard = card('THIS DEVICE');
  // (the field's name is the one the line had in the Library: `scripts/probe-on-device.mjs` reads it)
  const deviceLine = el('div', 'sl-set-note'); deviceLine.dataset.field = hooks.deviceField ?? 'sarahlab-device';
  const notice = el('div', 'sl-set-note sl-set-danger'); notice.dataset.field = SETTINGS_FIELD.notice; notice.style.marginTop = '4px';
  deviceCard.append(deviceLine, notice);
  const about = card('ABOUT');
  const aboutLine = el('div', 'sl-set-note'); aboutLine.dataset.field = SETTINGS_FIELD.about;
  const skinLine = el('div', 'sl-set-note'); skinLine.dataset.field = SETTINGS_FIELD.skin;
  about.append(aboutLine, skinLine);

  const text = (node: HTMLElement, t: string) => { if (node.textContent !== t) node.textContent = t; };
  const pressed = (b: HTMLButtonElement, on: boolean) => { const v = String(on); if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v); };

  const panel: SettingsPanel = {
    element: root,
    refresh() {
      const s = hooks.settings(), now = hooks.inForce(), next = hooks.wouldBe(s), mode = hooks.wouldBe(withMode(s.mode));
      for (const [m, b] of modeChips) pressed(b, m === s.mode);
      const hand = setByHand(s);
      text(modeNote, `${GRAPHICS_MODE_NAMES[s.mode]}${s.mode === 'auto' ? ' picks for this device' : ''}: ${skinName(mode.lightSkin).toLowerCase()} skin, ${sharpName(mode.sharpness).toLowerCase()}, smoothing ${smoothName(mode.smoothing).toLowerCase()}${hand ? ` · ${hand} set by hand` : ''}`);
      say(skinRow.own, 'BY MODE', skinName(mode.lightSkin)); pressed(skinRow.own, s.skin === null);
      for (const [v, b] of skinRow.picks) pressed(b, s.skin === v);
      say(sharpRow.own, 'BY MODE', sharpName(mode.sharpness)); pressed(sharpRow.own, s.sharpness === null);
      for (const [v, b] of sharpRow.picks) pressed(b, s.sharpness === v);
      say(smoothRow.own, 'BY MODE', smoothName(mode.smoothing)); pressed(smoothRow.own, s.smoothing === null);
      for (const [v, b] of smoothRow.picks) pressed(b, s.smoothing === v);
      const changed = !sameInForce(now, next);
      pending.style.display = changed ? '' : 'none';
      if (changed) {
        const parts: string[] = [];
        if (now.lightSkin !== next.lightSkin) parts.push(`her ${skinName(next.lightSkin).toLowerCase()} skin`);
        if (now.sharpness !== next.sharpness) parts.push(`${sharpName(next.sharpness).toLowerCase()} sharpness`);
        if (now.smoothing !== next.smoothing) parts.push(`smoothing ${smoothName(next.smoothing).toLowerCase()}`);
        text(pendingLine, `Kept. To draw with ${parts.join(', ')} the room loads again: save her first (Library) if she has changes to keep.`);
      }
      text(themeButton, hooks.theme() === 'light' ? '☀ LIGHT · tap for dark' : '☾ DARK · tap for light');
      // (the line was the Library's and names itself: the card's title says it here)
      const kept = hooks.deviceLine().replace(/^THIS DEVICE · /, ''), said = hooks.notice();
      text(deviceLine, kept || 'Nothing is kept on this device here (a development page, or a browser that keeps nothing).');
      text(notice, said); notice.style.display = said ? '' : 'none';
      text(aboutLine, `Character Builder ${hooks.version}`);
      const skin = hooks.skinLine();
      text(skinLine, skin ? `Now drawn: ${skin}, ${sharpName(now.sharpness).toLowerCase()} sharpness, smoothing ${smoothName(now.smoothing).toLowerCase()}` : '');
    },
  };
  panel.refresh();
  return panel;
}
