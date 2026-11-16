/**
 * HOW THE ROOM IS DRAWN ON THIS DEVICE (Joshua, 2026-11-16: "add a toggle max performance/max visuals in settings";
 * "Manual on/off + auto"; "Make these with manual overrides from the default for mix and match… Her Skin, Screen
 * Sharpness, Edge Smoothing"). A MODE, and three things a mode sets that may each be set by hand over it:
 *
 * - HER SKIN: her light skin (`skinChoice.ts`, fewer triangles over her own points) or her full one;
 * - SCREEN SHARPNESS: how many of the screen's own pixels are drawn for each CSS pixel, 1 or up to 2;
 * - EDGE SMOOTHING: the graphics' own antialiasing, off or on.
 *
 * AUTO is the room as it was before there were settings: her skin by the device (`wearsLightSkin`), the screen's own
 * sharpness up to 2, edges smoothed. MAX PERFORMANCE is the light skin at 1 with no smoothing; MAX VISUALS her full
 * skin at up to 2, smoothed. A thing set by hand (not `null`) wins over the mode; `?body=` in the address wins over
 * both, and A PROBE OR A BAKE IS NEVER MOVED BY A SETTING: what is measured is measured as it always was.
 *
 * Kept on the device, not with a character: it is the device's, and a save opens the same on a phone and a computer.
 * All three are read once as the page starts (the graphics are made with them): a change is kept, and takes hold when
 * the room is loaded again. Pure: no DOM, no three.
 */
import { wearsLightSkin, type SkinDevice } from './skinChoice';

export const GRAPHICS_MODES = Object.freeze(['auto', 'performance', 'visuals'] as const);
export type GraphicsMode = (typeof GRAPHICS_MODES)[number];
export const GRAPHICS_MODE_NAMES: Readonly<Record<GraphicsMode, string>> = Object.freeze({ auto: 'AUTO', performance: 'MAX PERFORMANCE', visuals: 'MAX VISUALS' });

export interface GraphicsSettings {
  readonly mode: GraphicsMode;
  /** each: `null` is the mode's own */
  readonly skin: 'light' | 'full' | null;
  readonly sharpness: 1 | 2 | null;
  readonly smoothing: boolean | null;
}
export const GRAPHICS_DEFAULT: GraphicsSettings = Object.freeze({ mode: 'auto', skin: null, sharpness: null, smoothing: null });

/** What the page is started with. */
export interface GraphicsInForce {
  readonly lightSkin: boolean;
  /** the most device pixels drawn to a CSS pixel (the device's own ratio, held to this) */
  readonly sharpness: 1 | 2;
  readonly smoothing: boolean;
}

/** What a mode sets where nothing is set by hand. */
export function modeSets(mode: GraphicsMode, device: SkinDevice): GraphicsInForce {
  if (mode === 'performance') return { lightSkin: true, sharpness: 1, smoothing: false };
  if (mode === 'visuals') return { lightSkin: false, sharpness: 2, smoothing: true };
  return { lightSkin: wearsLightSkin({ ...device, asked: null, measuring: false }), sharpness: 2, smoothing: true };
}

/** The settings as the page is to be drawn: by hand over the mode, the address over both, a probe or a bake as ever. */
export function graphicsInForce(s: GraphicsSettings, device: SkinDevice): GraphicsInForce {
  if (device.measuring) return { lightSkin: wearsLightSkin(device), sharpness: 2, smoothing: true };
  const m = modeSets(s.mode, device);
  const lightSkin = device.asked === 'light' ? true : device.asked === 'full' ? false : s.skin !== null ? s.skin === 'light' : m.lightSkin;
  return { lightSkin, sharpness: s.sharpness ?? m.sharpness, smoothing: s.smoothing ?? m.smoothing };
}

export const sameInForce = (a: GraphicsInForce, b: GraphicsInForce): boolean => a.lightSkin === b.lightSkin && a.sharpness === b.sharpness && a.smoothing === b.smoothing;
/** How many of the three are set by hand. */
export const setByHand = (s: GraphicsSettings): number => (s.skin !== null ? 1 : 0) + (s.sharpness !== null ? 1 : 0) + (s.smoothing !== null ? 1 : 0);
/** A mode picked: the three go back to being the mode's own. */
export const withMode = (mode: GraphicsMode): GraphicsSettings => ({ mode, skin: null, sharpness: null, smoothing: null });

export const GRAPHICS_KEY = 'character-builder-graphics';

/** Anything read back, made a settings record: what is not understood is the default's. Never throws. */
export function sanitizeGraphics(raw: unknown): GraphicsSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    mode: (GRAPHICS_MODES as readonly unknown[]).includes(r.mode) ? (r.mode as GraphicsMode) : 'auto',
    skin: r.skin === 'light' || r.skin === 'full' ? r.skin : null,
    sharpness: r.sharpness === 1 || r.sharpness === 2 ? r.sharpness : null,
    smoothing: typeof r.smoothing === 'boolean' ? r.smoothing : null,
  };
}
export function readGraphics(storage: Pick<Storage, 'getItem'> | null | undefined): GraphicsSettings {
  try { const v = storage?.getItem(GRAPHICS_KEY); return v ? sanitizeGraphics(JSON.parse(v)) : GRAPHICS_DEFAULT; } catch { return GRAPHICS_DEFAULT; }
}
export function storeGraphics(storage: Pick<Storage, 'setItem'> | null | undefined, s: GraphicsSettings): void {
  try { storage?.setItem(GRAPHICS_KEY, JSON.stringify(sanitizeGraphics(s))); } catch { /* a private window: the room opens on AUTO */ }
}
