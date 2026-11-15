/**
 * THE HAIRSTYLES SHE CAN WEAR (Joshua, 2026-11-14: "more hairstyles and colors so we can do Lena... create different
 * hairstyles, hair length and color"). Each is a file baked by the hair toolkit (`node scripts/hair/bake.mjs --style
 * <id>`, its style in `scripts/hair/styles/<id>.mjs`), and a LIGHT twin with about a fifth of the triangles for games
 * with many characters (`--light`).
 *
 * Every file keeps one contract (`scripts/hair/glb.mjs`): one skinned mesh on her skeleton, one material `sarahHair`,
 * one texture in the reference copper (the colour is the material's), and -- `hasLength` -- one morph `shorter` (weight
 * 1 its shortest: the room sets it to 1 - `HairLook.length`).
 *
 * `HeadLook.hair.style` (`headLook.ts`) is one of these ids, or `HAIR_STYLE_NONE`. What the room SHOWS is `name`.
 * Pure: no three.js, no DOM.
 */

export interface HairStyle {
  /** What a save keeps: /^[a-z][a-z0-9-]{0,31}$/. */
  readonly id: string;
  /** What the room shows. */
  readonly name: string;
  /** Its file, under `public/`. */
  readonly file: string;
  /** Its light twin, under `public/`. */
  readonly lightFile: string;
  /** Its file carries the `shorter` morph. */
  readonly hasLength: boolean;
}

/** No hair on her head. */
export const HAIR_STYLE_NONE = 'none';

export const HAIR_STYLES: readonly HairStyle[] = Object.freeze([
  // the style she has worn since 2026-10-24, as the toolkit bakes it: the same hair with its `shorter` morph. MEASURED
  // 2026-11-14 against the file she wore (`models/sarah-v2-hair.glb`, which the story's bake still reads): 76 of its
  // 17,012 points differ, by 2.6 mm at the most, in the ponytail's clumps at y 1.45; pictured from five sides without
  // a browser (`scripts/hair/preview.mjs`), 7 of 853,632 pixels differ. Every other attribute, its triangles, its
  // joints and its texture are the same
  { id: 'ponytail', name: 'Ponytail', file: 'models/hair/ponytail.glb', lightFile: 'models/hair/ponytail-light.glb', hasLength: true },
  // Lena's (`docs/reference/lena/lena-look-2026-11-14.png`)
  { id: 'wavy-ponytail', name: 'Wavy low ponytail', file: 'models/hair/wavy-ponytail.glb', lightFile: 'models/hair/wavy-ponytail-light.glb', hasLength: true },
  // long, parted in the middle, to the middle of her back; shoulder length at its shortest
  { id: 'long-loose', name: 'Long loose hair', file: 'models/hair/long-loose.glb', lightFile: 'models/hair/long-loose-light.glb', hasLength: true },
  // one three-strand plait down the middle of her back, tied near its tip
  { id: 'braid', name: 'Braid', file: 'models/hair/braid.glb', lightFile: 'models/hair/braid-light.glb', hasLength: true },
  // a bun on the top of her head (its LENGTH is the bun's size)
  { id: 'high-bun', name: 'High bun', file: 'models/hair/high-bun.glb', lightFile: 'models/hair/high-bun-light.glb', hasLength: true },
  // cut level just over her shoulders; at her jaw at its shortest
  { id: 'bob', name: 'Bob', file: 'models/hair/bob.glb', lightFile: 'models/hair/bob-light.glb', hasLength: true },
].map((s) => Object.freeze(s)));

/** A style by id; undefined for 'none' or one not known. */
export function hairStyle(id: string): HairStyle | undefined {
  return HAIR_STYLES.find((s) => s.id === id);
}
