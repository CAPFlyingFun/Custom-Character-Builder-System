/**
 * JOSHUA'S FABRIC PACK (2026-10-20, "TRADDOMIUM Texture Pack v2"): five fabric families, each a plain atlas and a trim
 * atlas of sixteen colours, at full resolution (his note: "keep the full-resolution texture atlases for now, including
 * on mobile, unless testing shows a meaningful performance hit"). Served from `public/fabrics/`, one family's atlas
 * fetched only when that family is first chosen.
 *
 * A plain atlas is a 4 x 4 grid of swatches, a trim atlas sixteen strips top to bottom, both in the pack's colour
 * order. The pack's two hosiery files were the other way round (09 "plain" was the strips, 10 "trim" the grid); they
 * are stored here by what they are, so `pantyhose-plain.jpg` is the grid.
 *
 * A SIXTH FAMILY IS MADE HERE, NOT THE PACK'S: FLAT, a colour with no weave at all (Joshua, 2026-11-14, of the custom
 * colour picker, which dyes a knit: "we do have a solid custom color picker option set up under all the textures, or
 * does it just alter the texture color?" -- it alters the texture's; of a flat one beside the knits: "go ahead and add
 * that in since I thought it was"). Its two atlases are small pictures of its sixteen colours and nothing else, drawn
 * from `SWATCH_HEX.flat` by `scripts/makeFlatFabric.mjs`: every other part of the room takes it as a family like the
 * rest, and a custom colour dyes its White to exactly the colour picked.
 *
 * Pure data and arithmetic: `fabricMaterial.ts` puts a swatch on a material, `fabricPanel.ts` is the editor.
 */

import type { LayerDetail } from './detailMaterials';
import type { CoverageParams } from './paintTemplates';
import { hexToLinear } from './fabricTint';
export type FabricLayout = 'grid' | 'strips';
export type FabricFamilyId = 'jersey' | 'athletic' | 'sweater' | 'ribbed' | 'pantyhose' | 'flat';

export interface FabricFamily {
  readonly id: FabricFamilyId;
  readonly name: string;
  /** Public paths: the main fabric (a grid) and its edging (strips). */
  readonly plain: string;
  readonly trim: string;
  /** How wide one swatch repeats on her, in centimetres, at stitch size 1x: what makes a knit read as its gauge. */
  readonly tileCm: number;
  /** Hosiery: see-through, by an amount the editor sets (his note: "adjustable transparency in code"). */
  readonly sheer: boolean;
  /** How matte it reads under light, 0 glossy to 1 flat: knits are matte, athletic knit and nylon have a soft sheen. */
  readonly roughness: number;
  /**
   * How much it gives, 0 firm to 1 a stretch knit's: seated, a firm shirt rides up over her lap and a stretchy one
   * stays down (Joshua, 2026-11-06: "Depends on the fabric selected... more stretchy, will stay, more firm, ride up
   * more... even if painted"; tunicDrape.ts RIDE_FROM). Spandex blends and nylon cling and stay; a rib knit stretches
   * far across; a cotton jersey tee gives a little; a heavy sweater knit hardly at all. GAME TUNING.
   */
  readonly stretch: number;
}

export const FABRIC_FAMILIES: readonly FabricFamily[] = Object.freeze(([
  { id: 'jersey', name: 'Jersey', plain: 'fabrics/jersey-plain.jpg', trim: 'fabrics/jersey-trim.jpg', tileCm: 3, sheer: false, roughness: 0.92, stretch: 0.5 },
  { id: 'athletic', name: 'Athletic', plain: 'fabrics/athletic-plain.jpg', trim: 'fabrics/athletic-trim.jpg', tileCm: 5, sheer: false, roughness: 0.72, stretch: 0.9 },
  { id: 'sweater', name: 'Sweater', plain: 'fabrics/sweater-plain.jpg', trim: 'fabrics/sweater-trim.jpg', tileCm: 10, sheer: false, roughness: 0.97, stretch: 0.15 },
  { id: 'ribbed', name: 'Ribbed', plain: 'fabrics/ribbed-plain.jpg', trim: 'fabrics/ribbed-trim.jpg', tileCm: 8, sheer: false, roughness: 0.9, stretch: 0.75 },
  { id: 'pantyhose', name: 'Pantyhose', plain: 'fabrics/pantyhose-plain.jpg', trim: 'fabrics/pantyhose-trim.jpg', tileCm: 3, sheer: true, roughness: 0.6, stretch: 1 },
  // (no weave: its tile's size shows nothing. Matte as a cotton jersey is, and gives as one does: GAME TUNING)
  { id: 'flat', name: 'Flat', plain: 'fabrics/flat-plain.png', trim: 'fabrics/flat-trim.png', tileCm: 3, sheer: false, roughness: 0.92, stretch: 0.5 },
] as FabricFamily[]).map((f) => Object.freeze(f)));

export const fabricFamily = (id: FabricFamilyId): FabricFamily => FABRIC_FAMILIES.find((f) => f.id === id)!;

/** The pack's sixteen colours, in its order (README_FOR_CLAUDE.md, "Suggested color order"). */
export const FABRIC_COLOURS = Object.freeze([
  'White', 'Light gray', 'Medium gray', 'Dark gray', 'Black', 'Cream', 'Brown', 'Pink',
  'Red', 'Orange', 'Yellow', 'Olive', 'Green', 'Cyan', 'Blue', 'Purple',
]);
/** The hosiery set has no olive: its row runs green, mint, cyan. */
const HOSIERY_COLOURS = Object.freeze([...FABRIC_COLOURS.slice(0, 11), 'Green', 'Mint', 'Cyan', 'Blue', 'Purple']);
export const colourName = (family: FabricFamilyId, index: number): string => (family === 'pantyhose' ? HOSIERY_COLOURS : FABRIC_COLOURS)[index] ?? '';

/**
 * Each family's sixteen swatches as one colour, the average of its plain atlas cell (measured from the pack's files,
 * 2026-10-20): what the editor's colour buttons show before an atlas has been fetched.
 */
export const SWATCH_HEX: Readonly<Record<FabricFamilyId, readonly string[]>> = Object.freeze({
  jersey: Object.freeze(['#cfd1d2', '#999ea3', '#65676f', '#37383e', '#191b1e', '#b59d83', '#5b3d2b', '#852d31', '#a6221b', '#c7642d', '#d9ba44', '#4e642e', '#247842', '#238592', '#1144a1', '#532191']),
  athletic: Object.freeze(['#ededee', '#a7a8af', '#605f68', '#2d2d33', '#101016', '#e0be95', '#562a18', '#c80e25', '#d60a07', '#f0530e', '#f4d90b', '#3b6921', '#158a42', '#0ea6d4', '#1824cd', '#540cd0']),
  sweater: Object.freeze(['#dfdedc', '#a0a3aa', '#66656e', '#2d2f37', '#18191f', '#d2b291', '#623823', '#b4152b', '#c40909', '#e85810', '#eec415', '#466e26', '#0b7e3a', '#0994b3', '#1231b9', '#5e10b6']),
  ribbed: Object.freeze(['#e4e3e3', '#9c9ca3', '#56545b', '#2a292f', '#1a191d', '#deb88b', '#693722', '#c3182c', '#ca0b0a', '#e85210', '#efcf19', '#456e28', '#148d46', '#0babcf', '#1631bc', '#5f11bd']),
  pantyhose: Object.freeze(['#ece5df', '#acaab0', '#6c6b70', '#323035', '#141416', '#dea285', '#7c5248', '#ef2a7b', '#d91914', '#f26411', '#f5d217', '#0e8551', '#65dfb0', '#11b8f1', '#2431e5', '#5c21dd']),
  // FLAT's are not measured: they ARE its swatches (`scripts/makeFlatFabric.mjs` draws its atlases from this line), the
  // pack's sixteen colours in its order, each a plain clear colour. GAME TUNING.
  flat: Object.freeze(['#f2f2f2', '#b0b0b6', '#6c6c74', '#34343a', '#121216', '#e6cfa8', '#5e3420', '#f06a9a', '#d81e1e', '#f0641a', '#f2d21a', '#56702a', '#1e8e46', '#16a6d2', '#1e3ccc', '#5e1ec8']),
});

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/**
 * Where colour `index` sits in an atlas `size` pixels square. A grid cell is inset a few pixels so no neighbour bleeds
 * in at its edge; a strip keeps its middle band, the knit without the stitched edges that make it trim.
 */
export function swatchRect(layout: FabricLayout, index: number, size: number): Rect {
  const i = Math.max(0, Math.min(15, Math.floor(index)));
  if (layout === 'grid') {
    const cell = size / 4, inset = Math.round(cell * 0.015);
    return { x: Math.round((i % 4) * cell) + inset, y: Math.round(Math.floor(i / 4) * cell) + inset, w: Math.round(cell) - 2 * inset, h: Math.round(cell) - 2 * inset };
  }
  const strip = size / 16;
  return { x: 0, y: Math.round(i * strip + strip * 0.3), w: size, h: Math.max(1, Math.round(strip * 0.4)) };
}

/**
 * What a choice is: a family's colour, or nothing (the garment's own material). A CUSTOM colour (Joshua, 2026-10-23,
 * from the Character Studio preview) is `tint`: the family's White swatch dyed that colour (`fabricTint.ts`), with
 * `colour` kept at White.
 */
export interface FabricPick { readonly family: FabricFamilyId; readonly colour: number; readonly tint?: string }

export interface FabricChoice {
  readonly fabric: FabricPick | null;
  /** Trim follows the fabric (MATCH) or has its own pick. */
  readonly match: boolean;
  readonly trim: FabricPick | null;
  /** Multiplies the family's repeat: 0.5 finer stitches, 2 coarser. The swatch keeps its own proportions. */
  readonly stitch: number;
  /** 1 opaque; lower is see-through on a garment, a lighter coat when painted on. Null: the family's own default. */
  readonly opacity: number | null;
}

export const DEFAULT_CHOICE: FabricChoice = Object.freeze({ fabric: null, match: true, trim: null, stitch: 1, opacity: null });
export const STITCH_RANGE = Object.freeze({ min: 0.5, max: 2, step: 0.05 });
export const OPACITY_RANGE = Object.freeze({ min: 0.1, max: 1, step: 0.05 });
/** Hosiery starts half see-through (his note: "start around 50% opacity"); everything else opaque. */
export const opacityOf = (choice: FabricChoice): number => choice.opacity ?? (choice.fabric && fabricFamily(choice.fabric.family).sheer ? 0.5 : 1);

/** The trim a choice dresses the edging in: the fabric's own colour from the family's trim atlas while matched. */
export function trimPick(choice: FabricChoice): FabricPick | null {
  return choice.match ? choice.fabric : choice.trim;
}

/** A pick as one colour: its custom colour, or its swatch's (`SWATCH_HEX`). */
export const pickHex = (pick: FabricPick): string => pick.tint ?? SWATCH_HEX[pick.family][Math.max(0, Math.min(15, Math.floor(pick.colour)))];

/**
 * A DRAWN TOP'S EDGING (Joshua, 2026-11-14: "for the collars and sleeve bands, are those colors also adjustable? So
 * for example can pick a solid pink shirt with solid red color edging"): its bands -- its collar and its sleeve bands
 * or cuffs (a tee has no band at its hem: `topCut.TEE_BANDS`) -- in a colour of their own, when its fabric's trim does not MATCH (one colour for all of a top's
 * bands; with MATCH, as every look saved before this is, they are the top's own fabric a touch darker). What the
 * shader draws them by (`fabricMaterial.FabricLayer.cut.edging`): `colour`, the trim's in linear light; `knit`, one
 * over the top's own fabric's average light, so the colour is laid on the top's own knit -- or 0, flat, for a trim
 * picked from the FLAT family. Null: no colour of their own.
 */
export function edgingOf(choice: FabricChoice): { readonly colour: readonly [number, number, number]; readonly knit: number } | null {
  if (choice.match || !choice.trim || !choice.fabric) return null;
  const base = hexToLinear(pickHex(choice.fabric)), light = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2];
  // (a fabric as dark as the pack's blacks still has a knit to keep: its light is held off nothing)
  return { colour: hexToLinear(pickHex(choice.trim)), knit: choice.trim.family === 'flat' ? 0 : 1 / Math.max(light, 0.002) };
}

/** Whether two picks are one fabric: the same family, colour and dye (two of none are; one of none and a fabric are not). */
export const samePick = (a: FabricPick | null, b: FabricPick | null): boolean => (!a || !b ? a === b : a.family === b.family && a.colour === b.colour && (a.tint ?? '') === (b.tint ?? ''));

/**
 * A SET'S TWO HALVES IN ONE FABRIC (Joshua, 2026-11-12, of her bikini: "match up the bikini top and bottom together...
 * just have them matching by default (sync)"). A set is a modelled garment (`top`: her bikini top) and the painted
 * pieces that are its other half (`paintTemplates.GARMENT_SETS`): `fill`, which wears the garment's fabric, and
 * `edging`, which wears its edging's -- either null when it is not on her. `trim`: whether the garment has an edging of
 * its own (cords, a binding: its `<garment>Trim`).
 *
 * `matchSet` hands the fabric of the half that was just changed (`from`) to the other: the garment's fabric and the
 * fill are one, the garment's edging and the painted edging are one (so MATCH on the garment, its edging following its
 * fabric, takes the painted edging with it), and one stitch size. A half with no fabric chosen (the garment in its
 * ORIGINAL material, a layer set to NONE) hands nothing on: paint has no look of its own to go back to.
 */
export interface FabricSet { readonly top: FabricChoice; readonly fill: FabricChoice | null; readonly edging: FabricChoice | null }
export function matchSet(from: 'top' | 'fill' | 'edging', set: FabricSet, trim: boolean): FabricSet {
  let top = set.top;
  if (from === 'fill' && set.fill?.fabric) top = { ...top, fabric: set.fill.fabric, stitch: set.fill.stitch };
  if (from === 'edging' && trim && set.edging?.fabric) top = { ...top, match: false, trim: set.edging.fabric, stitch: set.edging.stitch };
  const edge = trim ? trimPick(top) : null;
  return {
    top,
    fill: set.fill && top.fabric ? { ...set.fill, fabric: top.fabric, stitch: top.stitch } : set.fill,
    edging: set.edging && edge ? { ...set.edging, fabric: edge, stitch: top.stitch } : set.edging,
  };
}
/** Whether a set is in one fabric now: what the editor's TOP + BOTTOM MATCH starts as when clothes go on. */
export function setMatches(set: FabricSet, trim: boolean): boolean {
  return (!set.fill || samePick(set.top.fabric, set.fill.fabric)) && (!set.edging || !trim || samePick(trimPick(set.top), set.edging.fabric));
}

/**
 * PAINTED ON (Joshua, 2026-10-19: "clothing needs to sit over the body, and/or be painted on"; 2026-10-20: paint is
 * "a separate, editable paint layer" with a brush and an eraser). A FILL lays one garment's footprint at once: the
 * body carries, at every vertex, which of the original garments covers it (`_cloth_cover`, the bits of `coverMask`).
 */
export interface PaintFill { readonly id: string; readonly name: string; readonly bits: number }
export const PAINT_FILLS: readonly PaintFill[] = Object.freeze([
  { id: 'top', name: 'TEE', bits: 1 << 0 },
  { id: 'leggings', name: 'HIGH LEGGINGS', bits: 1 << 1 },
  { id: 'leggingsLow', name: 'LOW LEGGINGS', bits: 1 << 5 },
].map((a) => Object.freeze(a)));
export const PAINT_LAYER_NAMES = Object.freeze(['Paint layer 1', 'Paint layer 2', 'Paint layer 3']);

export type FabricMode = 'garment' | 'paint';
export type PaintTool = 'brush' | 'erase' | 'region' | 'orbit';

/** Centimetres of repeat to the material's own units: `unitsPerCm` is how many of the mesh's local units make 1 cm. */
export const tileUnits = (family: FabricFamily, stitch: number, unitsPerCm: number): number => family.tileCm * stitch * unitsPerCm;

/**
 * AN OUTFIT AS DATA (Joshua, 2026-10-20: "save, load, duplicate, and reuse these outfits for Sarah, Lena, and other
 * characters sharing the female base model... a lightweight configuration format such as JSON"). Not yet saved
 * anywhere; this is the shape a preset manager will store. Meshes and textures stay in their own files: an outfit
 * names them by id. A paint layer's mask is one byte a vertex of the shared base body, base64.
 */
export interface OutfitConfig {
  readonly version: 1;
  /** The base model the paint masks were made on (they are per vertex of it). */
  readonly base: string;
  readonly outfit: string;
  readonly garments: Readonly<Record<string, FabricChoice>>;
  /**
   * Each paint layer: its fabric, its detail through paint (AUTO / OVERRIDE / OFF, `detailMaterials.ts`), the template
   * it came from with its dial settings (null once painted by hand), and its mask.
   */
  readonly paint: readonly { readonly choice: FabricChoice; readonly detail: LayerDetail; readonly template: { readonly id: string; readonly params: CoverageParams } | null; readonly mask: string }[];
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(text: string): Uint8Array {
  const s = atob(text), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
