/**
 * WHICH OF HER SKINS A DEVICE WEARS (Joshua, 2026-11-16: "set up this lower version for web when it detects a mobile
 * device vs computer like if it's less than 1920x1080, will default to web and the lower quality… PC would use the
 * higher quality"). Her light skin (`scripts/lightBody.mjs`: fewer triangles over her own points) for a phone or a
 * tablet, and for a screen with fewer pixels than 1920 x 1080; her full skin for anything else.
 *
 * - `?body=light` / `?body=full` says which, whatever the device.
 * - A PROBE OR A BAKE (`?probe=`, `?bake=`) WEARS HER FULL SKIN unless its address says otherwise: what is measured in
 *   the room is measured on her, and a card's picture is baked from her -- in a window of whatever size the script
 *   opened.
 * - A phone or a tablet: its first pointer is a finger (`pointer: coarse`) and it has no mouse or pen beside it
 *   (`any-pointer: fine`). A laptop with a touch screen has a trackpad: not one.
 * - A screen's pixels are its own, not the page's: its size in CSS pixels times its pixel ratio (a phone held upright
 *   says 430 x 932 at 3; a 1366 x 768 laptop at 1). The longer side under 1920 or the shorter under 1080: light.
 *
 * NOT DONE: falling back to the light skin on a computer that is drawing slowly ("if it starts to lag, would
 * automatically fade into the lower one especially if multiple characters on screen"). Her triangles are read by a
 * good deal of the room as her file is read (her opening's area, her fingers, what a garment is cut from): the list
 * is put on her before any of it, once. Changing it on a body already in the room is its own piece of work.
 */
export interface SkinDevice {
  /** `?body=`: 'light', 'full', or anything else (not said) */
  readonly asked: string | null;
  /** the address opens the room to measure or bake it (`?probe=`, `?bake=`) */
  readonly measuring: boolean;
  /** its first pointer is a finger; it has a mouse, a trackpad or a pen as well */
  readonly coarse: boolean; readonly fine: boolean;
  /** its screen in CSS pixels, and device pixels to a CSS pixel */
  readonly width: number; readonly height: number; readonly ratio: number;
}

/** GAME TUNING (his): a screen with fewer pixels than this wears her light skin. */
export const FULL_SKIN_SCREEN = Object.freeze({ long: 1920, short: 1080 });

export function wearsLightSkin(d: SkinDevice): boolean {
  if (d.asked === 'light') return true;
  if (d.asked === 'full' || d.measuring) return false;
  if (d.coarse && !d.fine) return true;
  const r = Number.isFinite(d.ratio) && d.ratio > 0 ? d.ratio : 1, w = d.width * r, h = d.height * r;
  if (!(w > 0 && h > 0)) return false;
  return Math.max(w, h) < FULL_SKIN_SCREEN.long || Math.min(w, h) < FULL_SKIN_SCREEN.short;
}
