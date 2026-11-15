/**
 * A STYLE'S PICTURE (Joshua, 2026-11-14, of the drawn shirts: "are the new shirts available now in the clothing tab
 * with updated images of their style?… or modify the UI to work better"). The outfit editor's STYLE was a list of
 * names; it is a row of small pictures now, each a style's cut on her (`fabricPanel.ts`). This is what each picture is
 * OF, as numbers the room's bake reads (`SarahLabScene.bakeStylePictures`, `scripts/bakeStyleThumbs.mjs`): what she
 * wears for it, and which part of her it shows.
 *
 * ONE COLOUR FOR EVERY STYLE -- his sheet's denim blue on jersey -- so a row of pictures reads as a row of CUTS and not
 * of colours; under it what a person would wear with it, plain: charcoal leggings under a top, a pale tee over a
 * bottom, both with legwear, nothing more with a one-piece. A style whose edging is what it is (the ringer's bands) is
 * pictured as the room's own outfit has it.
 *
 * A BOTTOM'S PICTURE SHOWS ITS WAIST. His sheet of bottoms (2026-11-15) tells a high rise from a low one by its
 * waistband, each figure in a crop tee; under a tee to her hips the four full-length leggings were one picture four
 * times. So the pale tee over a bottom is the CROP tee, its hem where his sheet's outfits have it
 * (`SHEET_BOTTOMS_TEE_HEM`: a hand over her navel), and a bottom is framed from the floor to just over that hem.
 *
 * Pure: no three.js, no DOM.
 */
import { COVERAGE_TEMPLATES, GARMENT_SETS, pieceKind, type PieceKind } from './paintTemplates';
import { OUTFITS, SARAH_LEGGINGS, SHEET_BOTTOMS_TEE_HEM, SHEET_CREAM, SHEET_DENIM, type PaintedLayer } from './sarahLabTool';

/** Where a style's picture is kept under `public/`: `sarahlab/styles/<its template's id, in small letters and hyphens>.jpg`. */
export const styleThumbPath = (templateId: string): string => `sarahlab/styles/${templateId.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}.jpg`;

/** A template that is another's other half (a set's edging layer): worn with it and pictured with it, never a style of its own. */
export const isHelperStyle = (templateId: string): boolean => Object.values(GARMENT_SETS).some((s) => s.edging === templateId);

/**
 * The kind of piece a style is PICTURED as: its own kind (`pieceKind`), but a piece the editor keeps with the one-pieces
 * that has no top of its own -- the tied bikini bottom -- as a BOTTOM: under a tee, from the floor to her waist. (Baked
 * as a one-piece on 2026-11-15 it was a picture of her bare to the waist: a style's picture is of the style.)
 */
export function picturedAs(templateId: string): PieceKind | null {
  const kind = pieceKind(templateId), t = COVERAGE_TEMPLATES.find((x) => x.id === templateId);
  return kind === 'onePiece' && t && t.params.hemFront === null ? 'bottom' : kind;
}

/** The styles that have a picture: every template that is a kind of piece and not a helper, in the editor's order, each with the kind it is pictured as. */
export function picturedStyles(): readonly { readonly id: string; readonly kind: PieceKind }[] {
  return COVERAGE_TEMPLATES.flatMap((t) => { const kind = picturedAs(t.id); return kind && !isHelperStyle(t.id) ? [{ id: t.id, kind }] : []; });
}

const STYLE_FABRIC: PaintedLayer['fabric'] = Object.freeze({ family: 'jersey', colour: 0, tint: SHEET_DENIM });
const UNDER: PaintedLayer = Object.freeze({ template: 'leggingsFull', fabric: Object.freeze({ family: 'athletic', colour: 0, tint: SARAH_LEGGINGS }) });
const OVER: PaintedLayer = Object.freeze({ template: 'teeShort', fabric: Object.freeze({ family: 'jersey', colour: 0, tint: SHEET_CREAM }) });
/** The pale tee over a BOTTOM: cropped, so the bottom's waistband is in its picture (the header). */
const OVER_BOTTOM: PaintedLayer = Object.freeze({ template: 'cropTee', fabric: OVER.fabric, dials: Object.freeze({ hem: SHEET_BOTTOMS_TEE_HEM }) });
const SHORTS: PaintedLayer = Object.freeze({ template: 'shortsMid', fabric: UNDER.fabric });

/** What she wears for a style's picture, as an outfit's paint: bottom layer first (at most three: the room has three paint layers). */
export function stylePictureLayers(templateId: string, kind: PieceKind): readonly PaintedLayer[] {
  // (a style with an edging of its own in one of the room's outfits is pictured as that outfit has it)
  const own = OUTFITS.flatMap((o) => o.paint ?? []).find((l) => l.template === templateId && !!l.edging);
  const style: PaintedLayer = own ?? { template: templateId, fabric: STYLE_FABRIC };
  if (kind === 'top') return [UNDER, style];
  if (kind === 'onePiece') return [style];
  if (kind === 'legwear') return [style, SHORTS, OVER];
  // a bottom: with its set's edging under it when it has one (her athletic bikini bottom's black)
  const set = Object.values(GARMENT_SETS).find((s) => s.fabric === templateId), edge = set ? OUTFITS.flatMap((o) => o.paint ?? []).find((l) => l.template === set.edging) : undefined;
  return edge ? [edge, style, OVER_BOTTOM] : [style, OVER_BOTTOM];
}

/**
 * The part of her a kind of piece is pictured by, between two heights on her (0 her feet, 1 the base of her neck) with a
 * margin above the upper one in metres, and how far round her the eye stands (radians; 0 her front): a top from her
 * hips to her chin, a bottom from the floor to just over its crop tee's hem (0.82: on her rest shape her hip joints
 * are 0.628 of the way up and that hem 0.784 -- 0.8865 and 1.107 m of 1.4111, `bottomCut.lowFrame`'s measures of her;
 * it was 0.74, to her waist, under a tee to her hips), legwear from the floor to her waist, a one-piece all of her
 * below her chin. GAME TUNING, by eye on the row of pictures at a phone's size.
 */
export const STYLE_FRAME: Readonly<Record<PieceKind, { readonly from: number; readonly to: number; readonly over: number; readonly yaw: number }>> = Object.freeze({
  top: Object.freeze({ from: 0.56, to: 1, over: 0.07, yaw: 0.3 }),
  bottom: Object.freeze({ from: 0, to: 0.82, over: 0, yaw: 0.3 }),
  onePiece: Object.freeze({ from: 0, to: 1, over: 0.07, yaw: 0.3 }),
  legwear: Object.freeze({ from: 0, to: 0.66, over: 0, yaw: 0.3 }),
});
