/**
 * A PICTURE THE BROWSER HAS DROPPED (Joshua, 2026-11-13, of her skin gone black after the screen was turned and turned
 * back: "like it wasn't refreshing the skin texture on rotation... not sure if it could be a phone memory thing as well").
 *
 * A phone short of graphics memory takes a page's graphics away and gives them back (a lost and restored context). The
 * 3D library then draws everything again from the pictures it was given -- but a model file's pictures are handed to it
 * already decoded (an ImageBitmap), and a phone keeps a decoded picture with its graphics: after a restart it can be
 * there in name and empty. Drawn from, it is black. Nothing can be read out of it again; what it came from has to be
 * loaded afresh. A picture loaded as an image element is decoded again by the browser whenever it is needed, and is
 * not at risk.
 *
 * `pictureLost` tells one from the other by looking: the picture drawn very small, and every sample of it nothing.
 *
 * MEASURED 2026-11-13 in the room. A turn of the screen takes nothing away on the build machine, and its browser keeps
 * decoded pictures through a simulated restart of the graphics: she comes back right. With her normal map and her
 * roughness closed first -- what a phone that drops them leaves behind -- she comes back with her skin dark and
 * mottled; then both are found lost, decoded again from her file (assets.ts `redecodePictures`: nothing is downloaded)
 * and her skin is right again. Whether that is what his phone does when it is turned, only the phone can say: the room
 * says when its graphics were restarted and what became of her pictures (`graphicsNote`).
 */

/** How small the picture is drawn to be looked at: 8 x 8, 64 samples across the whole of it. */
export const LOOK_SIZE = 8;

/** The picture's samples (RGBA, `LOOK_SIZE` squared of them), or null where it can not be drawn at all. */
export type Look = (image: unknown) => ArrayLike<number> | null;

let lookCanvas: HTMLCanvasElement | null = null;
/** The browser's own look: the picture drawn into a small canvas and read back. */
export const lookAt: Look = (image) => {
  try {
    if (typeof document === 'undefined') return null;
    lookCanvas ??= document.createElement('canvas');
    lookCanvas.width = LOOK_SIZE; lookCanvas.height = LOOK_SIZE;
    const c = lookCanvas.getContext('2d', { willReadFrequently: true });
    if (!c) return null;
    c.clearRect(0, 0, LOOK_SIZE, LOOK_SIZE);
    c.drawImage(image as CanvasImageSource, 0, 0, LOOK_SIZE, LOOK_SIZE);
    return c.getImageData(0, 0, LOOK_SIZE, LOOK_SIZE).data;
  } catch { return null; }
};

/** Whether `image` is a decoded picture (an ImageBitmap): the kind a phone keeps with its graphics. */
export function decodedPicture(image: unknown): boolean {
  return typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap;
}

/**
 * Whether a decoded picture has been dropped: closed (it has no size), not drawable, or drawn and nothing at all in it
 * (every sample's colour zero -- a skin, a normal map and a roughness map are none of them that anywhere).
 * False for anything that is not a decoded picture.
 */
export function pictureLost(image: unknown, look: Look = lookAt, decoded: (image: unknown) => boolean = decodedPicture): boolean {
  if (!decoded(image)) return false;
  const size = image as { width?: number; height?: number };
  if (!size.width || !size.height) return true;
  const data = look(image);
  if (!data) return true;
  for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) return false;
  return true;
}

/**
 * What the notice over the stage says of the room's graphics: nothing until they have been taken away once; then how
 * often, and what became of her pictures -- decoded again from her files, or (one that has no file here to come from:
 * a picture of his own laid on her, a painting not yet saved) not to be had back without the page being opened again.
 */
export function graphicsNote(g: { readonly lost: number; readonly restored: number; readonly redecoded: number; readonly gone: number }): string {
  if (g.lost === 0 && g.restored === 0) return '';
  if (g.restored < g.lost) return 'graphics lost: waiting for the phone to give them back · ';
  const pictures = g.gone > 0 ? ` (${g.gone} of her pictures could not be brought back: BACK opens the room again)` : g.redecoded > 0 ? ` (${g.redecoded} of her pictures decoded again)` : '';
  return `graphics restarted ×${g.restored}${pictures} · `;
}
