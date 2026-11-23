/**
 * THE OUTFIT EDITOR (Joshua, 2026-10-20, reorganised 2026-10-22), in the CLOTHES tab.
 *
 * "I'd like the editor to distinguish clearly between editing an existing outfit... and painting directly onto the
 * body", and, held upright, "the 3D character to remain the main focus... a compact editor drawer". So it works in the
 * order a person thinks:
 *
 *   SELECT -- what she has on, as PIECES: each painted layer named by what its template makes (TOP, BOTTOM, ONE-PIECE,
 *             LEGWEAR, or PAINT when painted by hand), each modelled garment by its kind, and NEW PIECE for an empty
 *             layer. The default outfit's tee is TOP and its leggings BOTTOM, both editable like any other piece.
 *   DESIGN -- only what applies to that piece: its STYLE (a coverage template, `paintTemplates.ts`) and the edges it
 *             offers (neckline, sleeves, waistband, hem, length), its fabric family, colour, cover and stitch; a
 *             garment's trim. ISOLATE shows the piece on its own.
 *   PAINT  -- the brush, eraser, regions, mirror, undo and redo on one paint layer. Painting shows her body: every
 *             garment mesh, every OTHER paint layer, the shirt's drape and the cleavage bridge are hidden (THIS LAYER);
 *             ALL PAINT shows the other layers again, CLEAR BODY hides this one too. Nothing is deleted: leaving PAINT
 *             (or folding the editor, or another tab) puts every piece back as it was.
 *   SAVE   -- the room's outfit operations (`outfitPanel.ts`, handed in by the room).
 *
 * A SET'S TWO HALVES MATCH (Joshua, 2026-11-12, of her bikini: "match up the bikini top and bottom together... just
 * have them matching by default (sync)"). A modelled garment and the painted pieces that are its other half
 * (`paintTemplates.GARMENT_SETS`: her bikini's top, and her painted bottom and its edging) are kept in one fabric while
 * TOP + BOTTOM MATCH is on: a fabric, a colour or a stitch size picked on either half goes on both, the top's edging
 * and the bottom's alike. It is on whenever the two are in one fabric as they go on (a built-in set; a saved look that
 * matched), off for a look saved with them apart; pressed on, the other half takes the selected piece's fabric.
 *
 * BREAST and NAVEL DETAIL through the clothes are one setting for the whole outfit, each AUTO (every piece's own fabric
 * and construction decides, `detailMaterials.ts`) or MANUAL, with its own RESET TO AUTO (Joshua, 2026-10-22). The same
 * setting is shown here and in the BODY tab (`detailControl`), so the two can never disagree.
 *
 * The garment and paint engines underneath are unchanged: a family's atlas is fetched the first time it is chosen, each
 * swatch cut from it once; paint lives in `bodyPaint.ts`, its shader in `fabricMaterial.ts`.
 */
import * as THREE from 'three';
import type { ShapeFields } from '../view/bodyShapeView';
import {
  DEFAULT_CHOICE, FABRIC_FAMILIES, OPACITY_RANGE, STITCH_RANGE, SWATCH_HEX, base64ToBytes, bytesToBase64, colourName, edgingOf,
  fabricFamily, matchSet as matchedSet, opacityOf, setMatches, swatchRect, tileUnits, trimPick, IMAGE_TILE_CM, type FabricChoice, type FabricFamilyId, type FabricLayout,
  type FabricPick, type FabricSet, type OutfitConfig, type PaintTool,
} from './fabricLibrary';
import { LOW_SLIP_ATTRIBUTE, ensureRest, fabricCutWorn, fabricFieldWorn, fabricLowWorn, fabricSlip, fieldCells, setArmSkin, setDetailKeep, setFabricCut, setFabricCutArms, setFabricLayer, setFabricLow, setFabricLowFold, setFabricLowFoldStretch, setFabricLowInner, setFabricLowLegs, setFabricLowMoon, setFabricLowSwing, setHang, setRegionOverlay, setUnder, type FabricCut, type FabricLayer, type FabricLow } from './fabricMaterial';
import { FOLD_LINE, LOW_CUT, bandInner, bandStations, foldEase, foldLift, foldNear, foldOf, foldStretch, frontMoon, innerMoon, stationEdges, hoopInside, isDrawnBottom, legBlend, legPlanes, limbSkin, lowFrame, lowSpec, planeFront, planeShare, roomAt, swingOf, type BandPoint, type BandStations, type FrontMoon, type LowFrame, type LowLeg, type LowSpec } from './bottomCut';
import { makePulledSlip, pulledSlipDriver, type PulledDriver } from './pulledSlip';
import { MOTION_SHAPES } from './levelLine';
import { ARMSCYE, CHEST_CUTOUT, NECK_RANGE, TOP_CUT, type CutoutParams, type CutoutShape, TOP_OUTLINES, cutPicture, hasNoHem, isCatsuit, isCutTop, isOnePiece, sleevePlane, takesTurtleneck, topFrame, type NeckStyle, type TopCut, type TopFrame, type TopOutlineKind } from './topCut';
import type { TopDetailSpec } from './topDetails';
import { layCarried, poseTurns, settleCarry } from './designPose';
import { besideShapes, makeFrameSlip, makeSkinSlip, slipDriver, type SlipDriver } from './skinSlip';
import { PUSH_ATTRIBUTE } from './softBody';
import type { DetailKeep } from './bodyDetail';
import { DEFAULT_LAYER_DETAIL, DEFAULT_VULVA_KEEP, resolveDetail, resolveVulva, type LayerDetail, type ResolvedDetail } from './detailMaterials';
import { BRUSH_RANGE_CM, BodyPaint, PAINT_LAYER_COUNT, packLayer } from './bodyPaint';
import { LEVEL_LINE_OFFERED, lineModeLine, lineModeNote, nextLineMode, type LineMode } from './levelLine';
import { BODY_REGIONS, REGION_GROUPS, groupOf, groupRegions, type BodyMap, type RegionSide } from './bodyRegions';
import { CleavageBridge } from './cleavageBridge';
import { TINT_BASE_COLOUR, readTint, tintLabel, tintPixels } from './fabricTint';
import { keepUpload, pictureImage, pictureName } from './pictureStore';
import { HEM_LIFT_FLAT, HEM_LIFT_RIBBED, TunicDrape } from './tunicDrape';
import { AUTO_DETAIL, type DetailOverride, type SavedClothes } from './characterSaves';
import {
  BAND_SHADE, COVERAGE_DIALS, COVERAGE_TEMPLATES, DEFAULT_SHIRT_LENGTH, DRAWN_NECK, GARMENT_SETS, PIECE_KIND_NAMES, TEMPLATE_GROUPS, coverage, cutLayer, designedField, dialValue, dialsFor, paintedShirtLength, PAINTED_SHIRT_DRAPE, pieceKind, shirtHem,
  templateCut, templateDetail, withDial, wornParams, canFollow, followedAt, withDialAt, withFollow, type CoverageDial, type CoverageParams, type DesignedField, type PieceKind,
} from './paintTemplates';

/** A drawn top's cut as the editor keeps it: what it is cut to (its key), the cut, and what is drawn on it. */
interface WornCut {
  readonly key: string; readonly cut: TopCut; readonly detail: TopDetailSpec | null;
  /** Its hem is the top's OWN edge -- above a LENGTH's reach, no drape's band over it: the sports bra, the boxy crop tee (`FabricCut.ownHem`). */
  readonly ownHem: boolean;
}

export const FABRIC_PANEL_ROLE = 'sarahlab-fabric';
/**
 * GAME TUNING (milliseconds): how often her shapes' slip is worked out again at the most while her rest shape keeps
 * changing (a control dragged, her belly shrinking in a birth): eight times a second, and once more when it stops.
 */
export const SLIP_SHAPE_MS = 120;
/**
 * GAME TUNING (metres): how far round a designed garment's block her points' slip is worked out. The points on the
 * region's border are held (`skinSlip.ts`), and a held border nearer the outline than her slides' own reach dulls the
 * slip beside it: with the region ending at the block (4 cm from the outline), the outline's sharpest turns in her squat
 * were 46 degrees (their 99th percentile) against 33 with the region 4 cm wider, and no better for 8 (MEASURED,
 * 2026-11-12, on her skin's points read out of the room).
 */
export const SLIP_MARGIN_M = 0.04;
/**
 * GAME TUNING (metres): where her points' movement off her frame is worked out for a drawn top (`topCut.ts`) -- about
 * the base of her neck, out to either side, down and up: every neck opening's rim with the margin above round it. Her
 * sleeves' ends and her hem are looked up at her rest places themselves.
 */
export const CUT_SLIP_REACH_M = Object.freeze({ across: 0.22, below: 0.3, above: 0.07 });
/**
 * GAME TUNING (metres): how far under a top's OWN hem (a sports bra's, a boxy crop tee's: `FabricCut.ownHem`) her
 * points' movement off her frame is worked out as well -- the hem is looked up by it, and a triangle that crosses the
 * hem has to have it at all three corners (her triangles across her belly reach 37 mm).
 */
export const CUT_SLIP_HEM_M = 0.06;
/**
 * GAME TUNING (metres): her FRAME for a drawn top's neck opening (`skinSlip.makeFrameSlip`) -- the skin her bust and her
 * belly do not move: her back (behind her neck's axis) from this far under the base of her neck up, and all of her
 * from this little under it up (the base of her neck and the tops of her shoulders).
 */
export const CUT_FRAME_M = Object.freeze({ back: 0.22, neck: 0.02 });
/**
 * GAME TUNING (milliseconds, and a share): how long her skin's slip about her hips is worked on in one frame while a
 * drawn bottom is worn and it is behind her shape -- `share` of the time since the last frame, never under `least` (a
 * few rounds of its smoothing: MEASURED 2026-11-15 on the build machine, 1.75 ms a round over her middle's 23,527
 * points, 60 rounds a movement) and never over `most`. At sixty frames a second a change of her belly is laid in about
 * a third of a second; a slow renderer's long frames give it a whole movement at once.
 */
export const LOW_SLIP_BUDGET_MS = Object.freeze({ share: 0.3, least: 4, most: 250 });
/** GAME TUNING: how dark a band's seam is drawn on a drawn top (0..1), and half how wide (metres). */
export const CUT_SEAM = Object.freeze({ dark: 0.2, halfWidth: 0.0005 });
/** Her points' slip over one region of her skin, kept up to date (`skinSlip.ts`; `plain`: three numbers a vertex of her whole body, none outside the region). */
interface KeptSlip { readonly mesh: THREE.Mesh; readonly driver: SlipDriver; readonly points: number; readonly vertices: Uint32Array; readonly shaped: { version: number }; shapedSeen: number; solvedAt: number; pending: boolean; readonly plain: Float32Array }
/** The painted pieces that cover her crotch: off while she gives birth. */
const LOWER_KINDS: readonly string[] = ['bottom', 'onePiece'];
export type EditorSpace = 'design' | 'paint' | 'save';
export type PaintView = 'layer' | 'all' | 'clear';
export const FABRIC_ACTION = Object.freeze({
  /** A piece: `layer:<i>`, `garment:<name>`, or `new`. */
  piece: (id: string) => `sarahlab:fabric:piece:${id}`,
  /** STYLE's pictures: a style by its template's id, and the kind of piece whose styles are shown. */
  style: (id: string) => `sarahlab:fabric:style:${id}`,
  styleKind: (k: PieceKind) => `sarahlab:fabric:style-kind:${k}`,
  /** A one-piece's or the catsuit's NECK SHAPE (`topCut.NECK_RANGE`): a style of `NECK_STYLES`, or 'turtle'. */
  neckShape: (k: NeckStyle | 'turtle') => `sarahlab:fabric:neck-shape:${k}`,
  /** A one-piece's or the catsuit's CHEST CUTOUT (`topCut.CHEST_CUTOUT`): a shape, or 'none'. */
  cutout: (k: CutoutShape | 'none') => `sarahlab:fabric:cutout:${k}`,
  space: (s: EditorSpace) => `sarahlab:fabric:space:${s}`,
  view: (v: PaintView) => `sarahlab:fabric:view:${v}`,
  isolate: 'sarahlab:fabric:isolate',
  family: (id: FabricFamilyId | 'original') => `sarahlab:fabric:family:${id}`,
  colour: (i: number) => `sarahlab:fabric:colour:${i}`,
  /** The CUSTOM colour: any colour, dyed into the family's White (fabricTint.ts). */
  custom: 'sarahlab:fabric:colour:custom',
  trimCustom: 'sarahlab:fabric:trim-colour:custom',
  /** UPLOAD IMAGE: a picture of his own for the piece selected (`pictureStore.ts`). */
  image: 'sarahlab:fabric:image',
  /** FOLLOWS BELLY: an under-belly waistband laid at her belly's size, by his settings (`paintTemplates.UNDER_BELLY_FOLLOW`), or left where it is set. */
  follow: 'sarahlab:fabric:follow',
  /** A paint layer up (over the one above it) or down. */
  layerUp: 'sarahlab:fabric:layer-up',
  layerDown: 'sarahlab:fabric:layer-down',
  trimFamily: (id: FabricFamilyId) => `sarahlab:fabric:trim-family:${id}`,
  trimColour: (i: number) => `sarahlab:fabric:trim-colour:${i}`,
  match: 'sarahlab:fabric:match',
  /** TOP + BOTTOM MATCH: a set's two halves kept in one fabric. */
  setMatch: 'sarahlab:fabric:set-match',
  tool: (t: PaintTool) => `sarahlab:fabric:tool:${t}`,
  /** a stroke held to a level: FREE, BODY LEVEL, ROOM LEVEL (`levelLine.ts`) */
  line: 'sarahlab:fabric:line',
  region: (id: string) => `sarahlab:fabric:region:${id}`,
  side: (s: RegionSide) => `sarahlab:fabric:side:${s}`,
  showRegions: 'sarahlab:fabric:show-regions',
  mirror: 'sarahlab:fabric:mirror',
  undo: 'sarahlab:fabric:undo',
  redo: 'sarahlab:fabric:redo',
  clear: 'sarahlab:fabric:clear',
  remove: 'sarahlab:fabric:remove',
  /** RESET TO AUTO for one detail. */
  detailAuto: (which: 'nipple' | 'navel' | 'vulva') => `sarahlab:fabric:detail-auto:${which}`,
});
export const FABRIC_FIELD = Object.freeze({
  imageFile: 'fabric-image-file', imageNote: 'fabric-image-note', layerOrder: 'fabric-layer-order',
  nippleKeep: 'fabric-nipple-keep', navelKeep: 'fabric-navel-keep', vulvaKeep: 'fabric-vulva-keep', detailInfo: 'fabric-detail-info',
  style: 'fabric-style', styles: 'fabric-styles', stitch: 'fabric-stitch', opacity: 'fabric-opacity', brush: 'fabric-brush', status: 'fabric-status', pieces: 'fabric-pieces',
});

export interface WornGarment { readonly name: string; readonly label: string; readonly trim: boolean }

type Target = { readonly kind: 'layer'; readonly index: number } | { readonly kind: 'garment'; readonly name: string };
/** A thing she has on that the editor can select. */
export interface Piece {
  readonly id: string;
  readonly kind: PieceKind | 'paint' | 'set' | 'garment' | 'new';
  /** TOP, BOTTOM... */
  readonly title: string;
  /** Its style or garment name. */
  readonly name: string;
  readonly target: Target;
}

export interface FabricHooks {
  meshes(): readonly THREE.SkinnedMesh[];
  /**
   * Her belly's size as the belly slider has it (%): a waistband that FOLLOWS HER BELLY (`CoverageParams.follow`,
   * `paintTemplates.UNDER_BELLY_FOLLOW`) is laid at it. Missing: 0.
   */
  bellyPct?(): number;
  /** Her skin: the mesh carrying `_cloth_cover`, or null before she is in. */
  body(): THREE.SkinnedMesh | null;
  /** What she has on now, by material name. */
  worn(): readonly WornGarment[];
  rest(mesh: THREE.Mesh): ShapeFields | null;
  /** How many of the mesh's own units make one centimetre on her. */
  unitsPerCm(mesh: THREE.Mesh): number;
  /**
   * How many of her body's own REST units make one metre on her, as her bones carry her (`HumanRig.bindScale`). A skinned
   * body's own node is not scaled -- her skeleton is -- so `unitsPerCm`, which reads the node, is not this on her
   * (MEASURED 2026-11-14: it says 100 units a metre where her rest shape has 111.14). What is laid on her rest shape
   * in metres (a drawn top's cut: `topCut.ts`) asks this. Missing: `unitsPerCm`'s say.
   */
  unitsPerMetre?(mesh: THREE.Mesh): number;
  /**
   * How one of her arm's bones carries her now: what takes a place of her REST shape that rides that bone alone to
   * where she is posed, both in her mesh's own space (written into `out`; null for a body with no such bone). `bone`:
   * her upper arm's (her shoulder joint's) or her forearm's (her elbow joint's). A drawn top's sleeve ends square to the
   * bone it ends on, wherever that bone is (`fabricMaterial.setFabricCutArms`). A drawn bottom's legs' ends the same:
   * her thigh's bone (her hip joint's), her shin's (her knee's) and her foot's (her ankle's) say where her leg's three
   * joints are (`fabricMaterial.setFabricLowLegs`).
   */
  boneCarry?(mesh: THREE.Mesh, bone: 'shoulderL' | 'elbowL' | 'shoulderR' | 'elbowR' | 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR', out: THREE.Matrix4): THREE.Matrix4 | null;
  /** An atlas, decoded, or null if it could not be fetched. */
  loadImage(path: string): Promise<(CanvasImageSource & { width: number; height: number }) | null>;
  /**
   * Which modelled garments the room draws: all of them, none (while painting her body), or only the one named (a
   * garment ISOLATED in DESIGN). The room applies her look again after it.
   */
  garmentsShown(which: 'all' | 'none' | string): void;
  /**
   * Take a worn garment off her (Joshua, 2026-11-20: "make the skirts as a layer to remove… I can't remove as a bottom";
   * "check the cloth shirts as well"): REMOVE PIECE on a garment's piece. Absent: a garment can not be taken off here.
   */
  takeOff?(name: string): void;
  /** The camera and the canvas size in CSS pixels, for a brush stroke. */
  view(): { camera: THREE.Camera; width: number; height: number };
  /** Which model and outfit, for an exported config. */
  describe(): { base: string; outfit: string };
  /** Her body mapped for painting (`bodyRegions.ts`), or null when she cannot be mapped. */
  regions(): BodyMap | null;
  /** The vertex her navel morph moves most, if she has one: where her navel is. */
  navelHint(): number | undefined;
  /** A vertex at the middle of her vulva, if the room knows it: what AUTO's VULVA DETAIL reads the paint at. */
  vulvaHint?(): number | undefined;
  /** Her shape needs applying again (the navel's softening under paint changed). */
  reshape(): void;
  /** The SAVE workspace's contents (the room's outfit operations), if the room has them. */
  saveSection?(): HTMLElement | null;
  /**
   * A style's PICTURE (Joshua, 2026-11-14, of the new shirts in the clothing tab: "with updated images of their style?…
   * or modify the UI to work better"): the address of the small picture of a template's cut on her
   * (`sarahLabTool.styleThumbPath`, baked by `scripts/bakeStyleThumbs.mjs`), or null where there are none. A style whose
   * picture does not load shows its name alone.
   */
  stylePicture?(templateId: string): string | null;
  /** Her clothes changed (a fabric, a style, a stroke, the detail): the room's SAVE status follows. */
  changed?(): void;
  /**
   * A garment lying over her nipples and navel as cloth (the CLOTH SIM tee), by material name and label, or null: it
   * counts for AUTO's BREAST and NAVEL DETAIL as a painted piece over them does (Joshua, 2026-10-24: "the overrides
   * should be working").
   */
  clothOver?(): { readonly name: string; readonly label: string } | null;
  /**
   * All of her skin's triangles, each once -- with those another mesh draws in her place (the area round her opening,
   * vulvaMesh.ts, cut out of her own list while it stands in): what her points' slip is worked out over. Without it
   * her own list is used. MEASURED 2026-11-12: over her own list alone 2,481 of her 2,622 vertices under that area had
   * no slip at all (they are in none of its triangles), and a designed garment's edge was frayed all over the area.
   */
  skinTriangles?(body: THREE.Mesh): ArrayLike<number> | null;
  /**
   * The shape fields that are her POSE's, by name (the room made between her thighs for a birth pose, her hips and knees
   * turned round...): what her pose does to her skin before her bones do the rest. A designed garment RIDES those, as it
   * rides her bones; her slip (`skinSlip.ts`) is her own shapes' alone.
   */
  poseFields?(): readonly string[];
  /** How much of pose field `name` a garment rides at each of her vertices (0 to 1; null: all of it everywhere). */
  poseRide?(name: string): Float32Array | null;
}

export interface FabricPanel {
  readonly element: HTMLElement;
  /** Re-lay every choice on whatever materials she has now (a new shirt, a model switch); cheap when nothing changed. */
  sync(): void;
  /** Rebuild the pieces from what she wears. */
  refreshTargets(): void;
  /** True while her body is being painted (BODY PAINT, with the editor showing). */
  readonly painting: boolean;
  /** The brush or eraser while painting, else null (a drag then orbits as usual). */
  tool(): 'brush' | 'erase' | 'region' | null;
  strokeStart(x: number, y: number): void;
  strokeMove(x: number, y: number): void;
  strokeEnd(): void;
  exportConfig(): OutfitConfig;
  /**
   * Put on a painted outfit: each of its layers a coverage template in a fabric swatch, bottom first. Layers a previous
   * painted outfit filled and this one does not are cleared; layers painted by hand are left alone unless this outfit
   * needs them. Null takes a painted outfit off. Its detail goes back to AUTO. False if her body is not ready yet.
   * `garments` dresses the outfit's modelled garments in their fabrics (a garment the last outfit dressed and this one
   * does not goes back to its own look; fabrics picked by hand on other garments are left alone), and `trims` their
   * edgings in a fabric of their own (without one a garment's edging follows its fabric).
   */
  wearOutfit(layers: readonly { readonly template: string; readonly fabric: FabricPick; readonly edging?: FabricPick; readonly dials?: Readonly<Partial<Record<CoverageDial['id'], number>>>; readonly neckShape?: NeckStyle | null; readonly cutout?: CutoutParams | null }[] | null, garments?: Readonly<Record<string, FabricPick | undefined>>, trims?: Readonly<Record<string, FabricPick | undefined>>): boolean;
  /** Whether a set's two halves are kept in one fabric (TOP + BOTTOM MATCH). */
  setMatched(): boolean;
  /** Every paint layer and garment fabric off (a blank NEW OUTFIT); the detail back to AUTO. */
  clearAll(): boolean;
  /**
   * How far toward flat her navel's own `navelFlat` morph should go under paint: (1 - NAVEL DETAIL) times how much
   * paint covers her navel, so a bare or bikini navel is never touched. 0 with nothing painted there.
   */
  navelFlatten(): number;
  /** The cleavage bridge and the drape: re-laid once a frame, and again after her shape changes. Her points' slip too. */
  frame(): void;
  reshaped(): void;
  /** (a probe's) Her points' slip as it is kept for the designed garment she wears, or null with none: how many of her points, how many slips worked out, which morphs carry one, and the longest slip laid (her mesh's own units). */
  slipState(): { readonly points: number; readonly vertices: number; readonly solved: number; readonly morphs: readonly number[]; readonly longest: number } | null;
  /** (a probe's) That slip itself, three numbers a vertex of her body (her mesh's own units; none outside the garment's reach), before her carry to the garment's pose is laid with it: the SAME array each call, read-only. Null with no designed garment on. */
  slipNow(): Float32Array | null;
  /**
   * (a probe's) The DRAWN bottoms she wears (`bottomCut.ts`), or null before her body is measured for one: her own
   * measures (her mesh's own units but `unitsPerMetre`), each paint layer's bottom (its waistband's three heights and its
   * reach, where its legs end and begin along her leg, its bands; null for a layer that is not one), and her skin's slip
   * about her hips as it is kept for them (`pulledSlip.ts`: `pending` while what is laid is behind what she is;
   * `across`, the least and the most her skin is longer across her than at rest).
   */
  /** A fabric's pictures or a designed garment's field are still being fetched for what she wears: she is not dressed yet. */
  busy(): boolean;
  /**
   * How far inside a style's hoop of a waistband each point of her skin is, as she is shaped (`bottomCut.hoopInside`:
   * metres, + inside the garment, one a point) -- for a cloth skirt's ring, which is laid on that line. `shaped`: her
   * points before her bones pose her, xyz each, her mesh's own units. Null for a style whose waistband is no hoop,
   * and before her body is measured.
   */
  hoopOn(template: string, shaped: ArrayLike<number>): Float32Array | null;
  lowState(): {
    readonly frame: { readonly unitsPerMetre: number; readonly mid: number; readonly hipY: number; readonly trunk: number; readonly facing: number; readonly legs: readonly { readonly name: string; readonly thigh: number; readonly shin: number }[] };
    readonly worn: boolean;
    readonly layers: readonly ({ readonly template: string; readonly waist: readonly number[] | null; readonly end: number | null; readonly start: number | null; readonly bands: readonly number[]; readonly edged: boolean } | null)[];
    readonly slip: { readonly points: number; readonly vertices: number; readonly laid: boolean; readonly pending: boolean; readonly solved: number; readonly pulled: number; readonly morphs: readonly number[]; readonly longest: number; readonly across: readonly number[] } | null;
  } | null;
  /** (a probe's) Her cleavage bridge left off (or put back): her painted skin alone where it would span her, to tell what is the sheet's and what her skin's. */
  bridgeLeftOff(off: boolean): void;
  /**
   * (a probe's) The DRAWN top she wears (`topCut.ts`), or null with none: her own measures it is laid by (her mesh's own
   * units but `unitsPerMetre`), its cut's numbers, which paint layers are drawn from it, her points' slip about her
   * neck as it is kept for it (as `slipState`), and her cleavage bridge under it (its slices and the heights on her
   * trunk they span). `detail`: with how the bridge's sheet meets her skin, point by point (`CleavageBridge.junction`).
   */
  cutState(detail?: boolean): {
    readonly frame: { readonly unitsPerMetre: number; readonly mid: number; readonly neckY: number; readonly hipY: number; readonly facing: number; readonly cols: number; readonly rows: number; readonly zLo: number; readonly zHi: number; readonly arms: readonly number[] };
    readonly cut: { readonly style: string; readonly half: number; readonly dipY: number; readonly sleeve: number; readonly hemY: number | null; readonly bands: readonly number[] };
    /** (each paint layer drawn from it: 'whole', its bands in its own fabric, or 'edged', in a colour of their own) */
    readonly layers: readonly (('whole' | 'edged') | null)[];
    /** (`byRim`: the longest slip of her skin from 16 cm under the base of her neck up, where every neck opening's rim is) */
    readonly slip: { readonly points: number; readonly vertices: number; readonly solved: number; readonly morphs: readonly number[]; readonly longest: number; readonly byRim: number } | null;
    readonly bridge: { readonly visible: boolean; readonly drawn: boolean; readonly slices: number; readonly from: number | null; readonly to: number | null; readonly gaps: readonly number[]; readonly own: number; readonly layer: number } | null;
    readonly junction?: ReturnType<CleavageBridge['junction']>;
  } | null;
  /**
   * (a probe's) The carry a designed garment keeps for the pose she is in now (`designPose.settleCarry`), measured
   * against her slip as it is laid: `drawn` is each vertex's place as the room draws it (seen from her pelvis as it stood
   * at rest) less its rest place, three numbers a vertex in her mesh's own units, none for a vertex left out; `step` the
   * step it is stored in (those units). With it, how far the room's own look-up then is from where each vertex was drawn
   * (those units: the worst of them and what 99 in 100 are within -- `off` over every vertex given, `offNear` over
   * those looked up inside the garment's block). Null with no designed garment on (her slip is only kept with one).
   */
  poseCarry(drawn: Float32Array, step: number): { readonly carry: Float32Array; readonly off: { readonly worst: number; readonly most: number }; readonly offNear: { readonly worst: number; readonly most: number; readonly vertices: number } } | null;
  /** A painted shirt's LENGTH, 0 just above her crotch to 1 just above her knee (Joshua, 2026-10-22). */
  setShirtLength(length: number): void;
  shirtLength(): number;
  /** Whether she has a painted shirt on that SHIRT LENGTH moves. */
  wearsShirt(): boolean;
  /** Her clothes as a save holds them (`characterSaves.ts`), but for the outfit's name, which the room knows. */
  clothes(): Omit<SavedClothes, 'outfit'>;
  /** Put saved clothes on: every paint layer as saved (an empty one cleared), the garments' fabrics, length, detail. */
  putOnClothes(saved: Omit<SavedClothes, 'outfit'>): boolean;
  /** The pieces as the SELECT row lists them, and the one selected. */
  pieces(): readonly Piece[];
  selected(): string;
  select(id: string): void;
  setSpace(space: EditorSpace): void;
  space(): EditorSpace;
  /**
   * Whether the editor is on screen (held upright, the CLOTHES tab may be folded away). Off, nothing is hidden and
   * nothing is painted: her outfit is whole again.
   */
  setActive(on: boolean): void;
  /** Every paint layer hidden (true) or as the editor shows them (false): her skin bare for the FACE section's brush; nothing is lost. */
  setBare(on: boolean): void;
  /** Her painted bottoms and one-pieces hidden (true; her birth positions), every other layer as it was; nothing is lost. */
  setLowerBare(on: boolean): void;
  /** Whether a painted bottom or one-piece is on her (whatever is shown now). */
  coversLower(): boolean;
  /** The shared BREAST and NAVEL DETAIL as saved, and a way to set either (null: AUTO). */
  detail(): DetailOverride;
  /** How much of her shows through a modelled garment: the MANUAL values where set, else AUTO from its fabric. */
  garmentDetail(name: string): DetailKeep;
  setDetail(which: 'nipple' | 'navel' | 'vulva', value: number | null): void;
  /**
   * How much of her vulva's lips' shape shows through what is over it now (0 none .. 1 all; Joshua, 2026-10-31: "a
   * slider... to have the lips around the vagina more defined or not... like the nipple and navel slider through
   * clothes with auto per fabric with manual override"): the MANUAL value where set, else AUTO from the painted piece
   * over it, else a stretch knit's.
   */
  vulvaKeep(): number;
  /** Another view of the same BREAST and NAVEL DETAIL controls, for the BODY tab. */
  detailControl(): HTMLElement;
  dispose(): void;
}

const BTN = 'min-height:40px;padding:6px 9px;border:1px solid var(--sl-btn-line,#ffffff30);border-radius:8px;background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:600 11px system-ui';
const ON = 'var(--sl-on,#806020)', OFF = 'var(--sl-btn,#151b23)';
const GOLD = 'var(--sl-accent,#d4a853)';

/** What kind of piece a modelled garment is, by its material name. */
function garmentKind(name: string): Piece['kind'] {
  if (/^shirt/.test(name)) return 'top';
  if (/^leggings/.test(name)) return 'bottom';
  if (name === 'swimsuit') return 'onePiece';
  if (name === 'bikini') return 'set';
  if (name === 'skirt') return 'bottom';
  return 'garment';
}
const KIND_TITLE: Readonly<Record<Piece['kind'], string>> = { ...PIECE_KIND_NAMES, paint: 'PAINT', set: 'SET', garment: 'GARMENT', new: '+ NEW PIECE' };
/** SELECT lists tops first, then one-pieces, bottoms, legwear, hand paint, then garments. */
const KIND_ORDER: readonly Piece['kind'][] = ['top', 'onePiece', 'set', 'bottom', 'legwear', 'paint', 'garment', 'new'];

export function fabricPanel(hooks: FabricHooks): FabricPanel {
  const garmentChoices = new Map<string, FabricChoice>();
  const paintChoices: FabricChoice[] = Array.from({ length: PAINT_LAYER_COUNT }, () => DEFAULT_CHOICE);
  const atlases = new Map<string, Promise<(CanvasImageSource & { width: number; height: number }) | null>>();
  const swatches = new Map<string, THREE.Texture>();
  /** Designed garments' fields by path, and their fetches (`fieldFor`). */
  const fields = new Map<string, THREE.Data3DTexture>(), fieldLoads = new Map<string, Promise<void>>();
  /** Her points' slip, kept while she wears a designed garment (`laySlip`): its region's, with the garment's carry to the pose it was designed in. */
  let slip: (KeptSlip & { readonly path: string; readonly carry: Float32Array | null; readonly turn: Float32Array | null; readonly unitsPerMetre: number; readonly block: { readonly lo: readonly number[]; readonly hi: readonly number[] }; /** which of her vertices are in its region */ readonly own: Uint8Array }) | null = null;
  /** Her points' slip about her neck, kept while she wears a drawn top (`laySlip`, `CUT_SLIP_REACH_M`), and how far under the base of her neck it reaches (her units). */
  let cutSlip: KeptSlip | null = null, cutSlipBelow = 0;
  /** What `fabricSlip` was last laid from (`laySlip`): the body, the designed garment and whether a drawn top's slip is in it. */
  let slipMerged = '';
  /** Her own measures for a drawn top's cut (`topCut.topFrame`), once a body; the cuts laid from them by what they are cut to; and each one's picture. */
  let frameOf: { readonly mesh: THREE.Mesh; readonly frame: TopFrame | null } | null = null;
  const cuts = new Map<string, { readonly cut: TopCut; readonly detail: TopDetailSpec | null }>(), cutTextures = new Map<string, THREE.DataTexture>();
  /** The drawn top's cut laid on her skin now (the topmost shown), what is drawn on it (`topDetails.ts`), and its key. */
  let wornCut: WornCut | null = null;
  /** Her own measures for a drawn bottom (`bottomCut.lowFrame`), once a body; and the body whose limbs' skin is laid on it (`fabricMaterial.setArmSkin`). */
  let lowOf: { readonly mesh: THREE.Mesh; readonly frame: LowFrame | null } | null = null, limbLaid: THREE.Mesh | null = null;
  /**
   * Her skin's slip about her hips, kept while she wears a drawn bottom (`layLowSlip`, `pulledSlip.ts`); `laid`, whether
   * its attribute holds it now (and not the SHOW REGIONS overlay's tints, whose attribute it rides in:
   * `fabricMaterial.LOW_SLIP_ATTRIBUTE`); `at`, when it was last stepped.
   */
  let lowSlip: { readonly mesh: THREE.Mesh; readonly driver: PulledDriver; readonly points: number; readonly vertices: Uint32Array; readonly shaped: { version: number }; shapedSeen: number; laid: boolean; at: number } | null = null;
  let target: Target = { kind: 'layer', index: 0 };
  let space: EditorSpace = 'design', paintView: PaintView = 'layer', isolated = false, active = true;
  let tool: PaintTool = 'brush', brushCm: number = BRUSH_RANGE_CM.initial;
  /** The brush and the eraser held to a level, or going as the finger goes (`levelLine.ts`; Joshua, 2026-11-12). */
  let line: LineMode = 'free';
  let painting = false, disposed = false, stroking = false, side: RegionSide = 'both', showingRegions = false;
  let paint: BodyPaint | null = null;
  let override: DetailOverride = AUTO_DETAIL;
  /** Each layer's template, if its coverage came from one (dials move it until the layer is painted by hand). */
  const templates: ({ id: string; params: CoverageParams } | null)[] = Array.from({ length: PAINT_LAYER_COUNT }, () => null);
  /** Each layer's own detail (AUTO from its fabric unless an older save set OVERRIDE or OFF on it). */
  const details: LayerDetail[] = Array.from({ length: PAINT_LAYER_COUNT }, () => DEFAULT_LAYER_DETAIL);
  const layer = () => (target.kind === 'layer' ? target.index : -1);

  // ------------------------------------------------------------ building blocks
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, css = '') => { const e = document.createElement(tag); if (css) e.style.cssText = css; return e; };
  const heading = (text: string) => { const h = el('div', 'font-size:11px;opacity:.75;margin-top:2px;letter-spacing:.06em'); h.textContent = text; return h; };
  const row = () => el('div', 'display:flex;gap:5px;flex-wrap:wrap');
  const grid = () => el('div', 'display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:5px');
  const button = (label: string, action: string, onClick: () => void) => {
    const b = el('button', BTN); b.type = 'button'; b.textContent = label; b.dataset.action = action;
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); }); return b;
  };
  const press = (b: HTMLButtonElement, on: boolean) => { b.setAttribute('aria-pressed', String(on)); b.style.background = on ? ON : OFF; };
  const slider = (field: string, range: { min: number; max: number; step: number }, onInput: (v: number) => void) => {
    const label = el('label', 'font-size:12px');
    const input = el('input', `width:100%;accent-color:${GOLD}`); input.type = 'range'; input.dataset.field = field;
    input.min = String(range.min); input.max = String(range.max); input.step = String(range.step);
    input.addEventListener('input', () => onInput(Number(input.value)));
    const wrap = el('div', 'display:flex;flex-direction:column;gap:4px'); wrap.append(label, input);
    return { wrap, label, input };
  };
  const swatch = (action: string, onClick: () => void) => {
    const b = el('button', 'aspect-ratio:1;min-height:32px;border-radius:7px;border:2px solid transparent;padding:0'); b.type = 'button'; b.dataset.action = action;
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); }); return b;
  };
  /** A button that asks once: the first tap arms it for a few seconds, the second does it. */
  const twoTap = (label: string, armed: string, action: string, onConfirm: () => void) => {
    const reset = () => { b.dataset.armed = ''; b.textContent = label; b.style.borderColor = 'var(--sl-btn-line,#ffffff30)'; };
    const b = button(label, action, () => {
      if (b.dataset.armed === '1') { reset(); onConfirm(); return; }
      b.dataset.armed = '1'; b.textContent = armed; b.style.borderColor = 'var(--sl-danger,#d46a53)';
      setTimeout(() => { if (b.dataset.armed === '1') reset(); }, 3000);
    });
    return b;
  };

  // ------------------------------------------------------------ the drawer
  const panel = el('details', 'border-top:1px solid var(--sl-line,#ffffff20);padding-top:8px;touch-action:pan-y');
  panel.dataset.role = FABRIC_PANEL_ROLE;
  const summary = el('summary', 'cursor:pointer;padding:8px 0;font:700 12px system-ui;letter-spacing:.06em');
  const content = el('div', 'display:flex;flex-direction:column;gap:8px;padding:4px 0');

  // SELECT: one row of pieces, scrolling sideways on a narrow screen rather than growing
  const pieceRow = el('div', 'display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin;touch-action:pan-x');
  pieceRow.dataset.field = FABRIC_FIELD.pieces;
  const pieceButtons = new Map<string, HTMLButtonElement>();

  // the workspaces
  const spaces = el('div', 'display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:var(--sl-well,#0b0f14);border-radius:10px;padding:3px');
  const spaceButtons = new Map<EditorSpace, HTMLButtonElement>((['design', 'paint', 'save'] as const).map((s) => {
    const b = button(s === 'paint' ? 'BODY PAINT' : s.toUpperCase(), FABRIC_ACTION.space(s), () => setSpace(s));
    b.style.minHeight = '36px'; b.style.border = '0'; return [s, b];
  }));
  spaces.append(...spaceButtons.values());

  // the showing: DESIGN's isolate, PAINT's three views
  const isolateButton = button('ISOLATE', FABRIC_ACTION.isolate, () => { isolated = !isolated; updateView(); draw(); });
  const viewButtons = new Map<PaintView, HTMLButtonElement>([
    ['layer', button('THIS LAYER', FABRIC_ACTION.view('layer'), () => { paintView = 'layer'; updateView(); draw(); })],
    ['all', button('ALL PAINT', FABRIC_ACTION.view('all'), () => { paintView = 'all'; updateView(); draw(); })],
    ['clear', button('CLEAR BODY', FABRIC_ACTION.view('clear'), () => { paintView = 'clear'; updateView(); draw(); })],
  ]);
  const showRow = row(); showRow.append(isolateButton, ...viewButtons.values());

  // ---- DESIGN
  const designBox = el('div', 'display:flex;flex-direction:column;gap:8px');
  const styleSelect = el('select', 'min-height:38px;font:600 13px system-ui;width:100%');
  styleSelect.dataset.field = FABRIC_FIELD.style; styleSelect.setAttribute('aria-label', 'Style');
  styleSelect.add(new Option('Choose a style…', ''));
  for (const g of TEMPLATE_GROUPS) {
    const og = document.createElement('optgroup'); og.label = g;
    for (const t of COVERAGE_TEMPLATES.filter((x) => x.group === g)) og.appendChild(new Option(t.name, t.id));
    styleSelect.appendChild(og);
  }
  styleSelect.addEventListener('change', () => { const t = COVERAGE_TEMPLATES.find((x) => x.id === styleSelect.value); if (t) applyTemplate(t.id, t.params); });
  const dials = new Map(COVERAGE_DIALS.map((d) => [d.id, slider(`fabric-dial-${d.id}`, { min: d.min, max: d.max, step: 0.01 }, (v) => moveDial(d.id, v))]));
  const dialBox = el('div', 'display:flex;flex-direction:column;gap:6px');
  // NECK SHAPE (a one-piece's and the catsuit's, `topCut.NECK_RANGE`): a style of the drawn tees', at its own depth, or a
  // turtleneck; NECKLINE and NECK WIDTH under it move it from there
  const NECK_SHAPE_NAMES: Readonly<Record<NeckStyle | 'turtle', string>> = { crew: 'CREW', u: 'U', v: 'V', scoop: 'SCOOP', square: 'SQUARE', turtle: 'TURTLENECK' };
  const neckShapeRow = el('div', 'display:flex;gap:4px;flex-wrap:wrap');
  const neckShapeButtons = new Map((Object.keys(NECK_SHAPE_NAMES) as (NeckStyle | 'turtle')[]).map((k) => {
    const b = button(NECK_SHAPE_NAMES[k], FABRIC_ACTION.neckShape(k), () => pickNeckShape(k)); b.style.minHeight = '32px'; b.style.padding = '4px 8px'; b.style.fontSize = '11px'; return [k, b] as const;
  }));
  neckShapeRow.append(...neckShapeButtons.values());
  const neckShapeBox = el('div', 'display:flex;flex-direction:column;gap:4px'); neckShapeBox.append(heading('NECK SHAPE'), neckShapeRow);
  dialBox.append(neckShapeBox);
  // CHEST CUTOUT (`topCut.CHEST_CUTOUT`): none, or a shape at its own size and place, which its three sliders move
  const CUTOUT_NAMES: Readonly<Record<CutoutShape | 'none', string>> = { none: 'NONE', oval: 'OVAL', diamond: 'DIAMOND', keyhole: 'KEYHOLE' };
  const cutoutRow = el('div', 'display:flex;gap:4px;flex-wrap:wrap');
  const cutoutButtons = new Map((Object.keys(CUTOUT_NAMES) as (CutoutShape | 'none')[]).map((k) => {
    const b = button(CUTOUT_NAMES[k], FABRIC_ACTION.cutout(k), () => pickCutout(k)); b.style.minHeight = '32px'; b.style.padding = '4px 8px'; b.style.fontSize = '11px'; return [k, b] as const;
  }));
  cutoutRow.append(...cutoutButtons.values());
  const cutoutBox = el('div', 'display:flex;flex-direction:column;gap:4px'); cutoutBox.append(heading('CHEST CUTOUT'), cutoutRow);
  dialBox.append(cutoutBox);
  // FOLLOWS BELLY (an under-belly waistband's): its WAISTBAND (FRONT) and HIPS & BACK RISE his settings at her belly's
  // size, the two sliders moving it on top; off, it stays where they set it
  const followButton = button('FOLLOWS BELLY', FABRIC_ACTION.follow, () => toggleFollow());
  followButton.style.minHeight = '32px'; followButton.style.padding = '4px 8px'; followButton.style.fontSize = '11px';
  const followBox = el('div', 'display:flex;gap:4px;flex-wrap:wrap;align-items:center'); followBox.append(followButton);
  dialBox.append(followBox);
  for (const d of dials.values()) dialBox.append(d.wrap);
  // STYLE AS PICTURES: the styles of one kind of piece in a row that scrolls sideways, each a small picture of its cut on
  // her with its name under it; a tap puts it on the piece. The kinds are a row of four above it (the piece's own kind is
  // shown when a piece is picked); the list under it still names every style
  const STYLE_KINDS: readonly PieceKind[] = ['top', 'bottom', 'onePiece', 'legwear'];
  const STYLE_KIND_NAMES: Readonly<Record<PieceKind, string>> = { top: 'TOPS', bottom: 'BOTTOMS', onePiece: 'ONE-PIECE', legwear: 'LEGWEAR' };
  /** Templates that are another's other half (a set's edging layer): put on with it, not picked as a style. */
  const helperStyles = new Set(Object.values(GARMENT_SETS).map((x) => x.edging));
  let stripKind: PieceKind = 'top', stripFor = '', stripSeen = '';
  const styleKinds = el('div', 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px');
  const styleKindButtons = new Map(STYLE_KINDS.map((k) => { const b = button(STYLE_KIND_NAMES[k], FABRIC_ACTION.styleKind(k), () => { stripKind = k; draw(); }); b.style.minHeight = '32px'; b.style.padding = '4px 2px'; b.style.fontSize = '10px'; return [k, b] as const; }));
  styleKinds.append(...styleKindButtons.values());
  const styleStrip = el('div', 'display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:thin;touch-action:pan-x;overscroll-behavior-x:contain');
  styleStrip.dataset.field = FABRIC_FIELD.styles;
  const styleTiles = new Map<string, HTMLButtonElement>();
  let stripShown: PieceKind | null = null;
  function fillStyleStrip(): void {
    if (stripShown === stripKind) return;
    stripShown = stripKind; styleTiles.clear();
    styleStrip.replaceChildren(...COVERAGE_TEMPLATES.filter((t) => pieceKind(t.id) === stripKind && !helperStyles.has(t.id)).map((t) => {
      const b = el('button', 'flex:none;width:84px;display:flex;flex-direction:column;gap:3px;padding:3px 3px 5px;border-radius:9px;border:2px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);text-align:center');
      b.type = 'button'; b.dataset.action = FABRIC_ACTION.style(t.id); b.title = t.name; b.setAttribute('aria-label', t.name);
      const well = el('div', 'width:100%;aspect-ratio:3/4;border-radius:6px;overflow:hidden;background:var(--sl-well,#0b0f14);display:flex;align-items:center;justify-content:center;font:700 10px system-ui;opacity:.9');
      const src = hooks.stylePicture?.(t.id) ?? null;
      if (src) {
        const img = el('img', 'width:100%;height:100%;object-fit:cover;display:block');
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.draggable = false;
        // (a style baked no picture yet: its name's first letters stand in the well)
        img.addEventListener('error', () => { well.textContent = t.name.split(/[\s-]+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(); });
        img.src = src; well.appendChild(img);
      } else well.textContent = t.name.split(/[\s-]+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
      const name = el('span', 'font:600 9.5px/1.15 system-ui;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:22px');
      name.textContent = t.name;
      b.append(well, name);
      b.addEventListener('click', (e) => { e.stopPropagation(); applyTemplate(t.id, t.params); });
      styleTiles.set(t.id, b);
      return b;
    }));
  }
  const styleBox = el('div', 'display:flex;flex-direction:column;gap:6px'); styleBox.append(heading('STYLE'), styleKinds, styleStrip, styleSelect, dialBox);
  const families = row(), colours = grid();
  const familyButtons = new Map<string, HTMLButtonElement>();
  familyButtons.set('original', button('ORIGINAL', FABRIC_ACTION.family('original'), () => set({ fabric: null })));
  // a custom colour stays when the family changes: the new family's White, dyed the same
  for (const f of FABRIC_FAMILIES) familyButtons.set(f.id, button(f.name.toUpperCase(), FABRIC_ACTION.family(f.id), () => { const was = current().fabric; set({ fabric: { family: f.id, colour: was?.tint ? TINT_BASE_COLOUR : was?.colour ?? 0, ...(was?.tint ? { tint: was.tint } : {}) } }); }));
  families.append(...familyButtons.values());
  const colourButtons = Array.from({ length: 16 }, (_, i) => swatch(FABRIC_ACTION.colour(i), () => set({ fabric: { family: current().fabric?.family ?? 'jersey', colour: i } })));
  colours.append(...colourButtons);
  // CUSTOM COLOUR (Joshua, 2026-10-23, from the Character Studio preview): the seventeenth swatch is the system's colour
  // picker; what it picks dyes the family's White, so the knit stays the knit
  const custom = el('label', 'position:relative;aspect-ratio:1;min-height:32px;border-radius:7px;border:2px solid transparent;box-sizing:border-box;overflow:hidden;cursor:pointer;'
    + 'background:conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)');
  custom.dataset.action = FABRIC_ACTION.custom; custom.title = 'Any colour';
  const customInput = el('input', 'position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;padding:0;cursor:pointer');
  customInput.type = 'color'; customInput.dataset.field = 'fabric-custom-colour'; customInput.setAttribute('aria-label', 'Any colour');
  let customTimer: ReturnType<typeof setTimeout> | null = null;
  const pickCustom = () => {
    const tint = readTint(customInput.value);
    if (!tint) return;
    set({ fabric: { family: current().fabric?.family ?? 'jersey', colour: TINT_BASE_COLOUR, tint } });
  };
  // the picker reports every move: a new dye is cut at most every 120 ms, and once more where it stops
  customInput.addEventListener('input', () => { if (customTimer) clearTimeout(customTimer); customTimer = setTimeout(() => { customTimer = null; pickCustom(); }, 120); });
  customInput.addEventListener('change', () => { if (customTimer) { clearTimeout(customTimer); customTimer = null; } pickCustom(); });
  custom.addEventListener('click', (e) => e.stopPropagation());
  custom.appendChild(customInput);
  colours.append(custom);
  // A PICTURE OF HIS OWN for the piece selected (Joshua, 2026-11-19: "it should be for that top/bottom, etc… and what's
  // selected"): it replaces the swatch or colour of this piece alone; a family, a swatch or a colour picked after puts
  // it back to that. SCALE sizes it (`IMAGE_TILE_CM` at 1).
  const imageRow = row(), imageNote = el('div', 'font-size:11px;opacity:.75;line-height:1.4;overflow-wrap:anywhere');
  imageNote.dataset.field = FABRIC_FIELD.imageNote;
  const imageInput = el('input', 'display:none');
  imageInput.type = 'file'; imageInput.accept = 'image/*'; imageInput.dataset.field = FABRIC_FIELD.imageFile;
  const imageButton = button('UPLOAD IMAGE…', FABRIC_ACTION.image, () => imageInput.click());
  let imageBusy = false;
  imageInput.addEventListener('change', () => {
    const f = imageInput.files?.[0]; imageInput.value = '';
    if (!f) return;
    const forTarget = target;
    imageBusy = true; imageNote.textContent = `Loading ${f.name}…`;
    void keepUpload(f).then(({ id }) => {
      imageBusy = false;
      if (disposed) return;
      if (target !== forTarget) { draw(); return; }
      const was = current().fabric;
      set({ fabric: { family: 'flat', colour: was?.tint ? TINT_BASE_COLOUR : was?.colour ?? 0, ...(was?.tint ? { tint: was.tint } : {}), image: id } });
    }, (e: unknown) => { imageBusy = false; imageNote.textContent = e instanceof Error ? e.message : 'Could not read that picture.'; });
  });
  imageRow.append(imageButton, imageInput);
  const trimBox = el('div', 'display:flex;flex-direction:column;gap:8px');
  const trimOwn = el('div', 'display:flex;flex-direction:column;gap:8px');
  const match = button('MATCH', FABRIC_ACTION.match, () => { const c = current(); set({ match: !c.match, trim: c.trim ?? c.fabric }); });
  const trimFamilies = row(), trimColours = grid();
  const trimFamilyButtons = new Map<FabricFamilyId, HTMLButtonElement>();
  // (a custom colour stays when the trim's family changes, as the fabric's does)
  for (const f of FABRIC_FAMILIES) trimFamilyButtons.set(f.id, button(f.name.toUpperCase(), FABRIC_ACTION.trimFamily(f.id), () => { const was = current().trim; set({ trim: { family: f.id, colour: was?.tint ? TINT_BASE_COLOUR : was?.colour ?? 0, ...(was?.tint ? { tint: was.tint } : {}) } }); }));
  trimFamilies.append(...trimFamilyButtons.values());
  const trimColourButtons = Array.from({ length: 16 }, (_, i) => swatch(FABRIC_ACTION.trimColour(i), () => { const c = current(); set({ trim: { family: c.trim?.family ?? c.fabric?.family ?? 'jersey', colour: i } }); }));
  trimColours.append(...trimColourButtons);
  // (the trim's own "any colour", as the fabric's above: its family's White, dyed)
  const trimCustom = el('label', 'position:relative;aspect-ratio:1;min-height:32px;border-radius:7px;border:2px solid transparent;box-sizing:border-box;overflow:hidden;cursor:pointer;'
    + 'background:conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)');
  trimCustom.dataset.action = FABRIC_ACTION.trimCustom; trimCustom.title = 'Any colour';
  const trimCustomInput = el('input', 'position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;padding:0;cursor:pointer');
  trimCustomInput.type = 'color'; trimCustomInput.dataset.field = 'fabric-trim-custom-colour'; trimCustomInput.setAttribute('aria-label', 'Any colour');
  let trimCustomTimer: ReturnType<typeof setTimeout> | null = null;
  const pickTrimCustom = () => {
    const tint = readTint(trimCustomInput.value), c = current();
    if (!tint) return;
    set({ trim: { family: c.trim?.family ?? c.fabric?.family ?? 'jersey', colour: TINT_BASE_COLOUR, tint } });
  };
  trimCustomInput.addEventListener('input', () => { if (trimCustomTimer) clearTimeout(trimCustomTimer); trimCustomTimer = setTimeout(() => { trimCustomTimer = null; pickTrimCustom(); }, 120); });
  trimCustomInput.addEventListener('change', () => { if (trimCustomTimer) { clearTimeout(trimCustomTimer); trimCustomTimer = null; } pickTrimCustom(); });
  trimCustom.addEventListener('click', (e) => e.stopPropagation());
  trimCustom.appendChild(trimCustomInput);
  trimColours.append(trimCustom);
  const matchRow = row(); matchRow.append(match);
  trimOwn.append(trimFamilies, trimColours);
  const trimNote = el('div', 'font-size:11px;opacity:.7;line-height:1.4');
  const trimHeading = heading('TRIM');
  trimBox.append(trimHeading, matchRow, trimOwn, trimNote);
  const opacity = slider(FABRIC_FIELD.opacity, OPACITY_RANGE, (v) => set({ opacity: v }));
  const stitch = slider(FABRIC_FIELD.stitch, STITCH_RANGE, (v) => set({ stitch: v }));
  // ITS PLACE AMONG HER LAYERS (Joshua, 2026-11-19: "make each layer adjustable so you can like place above or below
  // another layer and maybe set layer 1 as way top and 6 as bottom, and then you can drag or press an arrow to move them
  // between layers"): layer 1 is drawn over all the others, layer 6 under them; ▲ takes the piece up one, over what was
  // there, ▼ down one -- into an empty layer as well
  const orderRow = row(), orderNote = el('span', 'font:600 11px system-ui;opacity:.8;align-self:center');
  orderNote.dataset.field = FABRIC_FIELD.layerOrder;
  const moveLayer = (by: 1 | -1) => {
    const p = bodyPaint(), i = layer(), j = i + by;
    if (!p || i < 0 || j < 0 || j >= PAINT_LAYER_COUNT) return;
    p.swapLayers(i, j);
    const sw = <T,>(xs: T[]) => { const t = xs[i]; xs[i] = xs[j]; xs[j] = t; };
    sw(templates); sw(paintChoices); sw(details);
    swapLowLayers(i, j);
    target = { kind: 'layer', index: j };
    sync(); refreshTargets(); touched(); void apply();
  };
  const upButton = button('▲ UP', FABRIC_ACTION.layerUp, () => moveLayer(1));
  const downButton = button('▼ DOWN', FABRIC_ACTION.layerDown, () => moveLayer(-1));
  orderRow.append(orderNote, upButton, downButton);
  const removeRow = row();
  removeRow.append(twoTap('REMOVE PIECE', 'REMOVE? TAP AGAIN', FABRIC_ACTION.remove, () => {
    // (a garment she wears: taken off her by the room, its fabric choice let go)
    if (target.kind === 'garment') { const name = target.name; if (hooks.takeOff) { garmentChoices.delete(name); hooks.takeOff(name); refreshTargets(); touched(); } return; }
    const p = bodyPaint(), i = layer();
    if (!p || i < 0) return;
    p.checkpoint(i); p.clear(i); templates[i] = null; paintChoices[i] = DEFAULT_CHOICE; details[i] = DEFAULT_LAYER_DETAIL;
    sync(); refreshTargets(); touched();
  }));
  const fabricHeading = heading('FABRIC');
  // a set's two halves in one fabric (the header says how): shown on either half of a set she has on
  const setMatchButton = button('TOP + BOTTOM MATCH', FABRIC_ACTION.setMatch, () => { setMatch = !setMatch; if (setMatch) matchSet(target); draw(); void apply(); touched(); });
  const setMatchRow = row(); setMatchRow.append(setMatchButton);
  designBox.append(orderRow, styleBox, fabricHeading, setMatchRow, families, colours, imageRow, imageNote, trimBox, opacity.wrap, stitch.wrap, removeRow);

  // ---- PAINT
  const paintBox = el('div', 'display:flex;flex-direction:column;gap:8px');
  const tools = row();
  const toolButtons = new Map<PaintTool, HTMLButtonElement>([
    ['brush', button('BRUSH', FABRIC_ACTION.tool('brush'), () => { tool = 'brush'; draw(); })],
    ['erase', button('ERASER', FABRIC_ACTION.tool('erase'), () => { tool = 'erase'; draw(); })],
    ['region', button('FILL REGION', FABRIC_ACTION.tool('region'), () => { tool = 'region'; draw(); })],
    ['orbit', button('TURN HER', FABRIC_ACTION.tool('orbit'), () => { tool = 'orbit'; draw(); })],
  ]);
  tools.append(...toolButtons.values());
  const lineButton = button(lineModeLine(line), FABRIC_ACTION.line, () => { line = nextLineMode(line); draw(); });
  const lineRow = row(); lineRow.append(lineButton);
  const brush = slider(FABRIC_FIELD.brush, BRUSH_RANGE_CM, (v) => { brushCm = v; draw(); });
  const edits = row();
  const undoButton = button('UNDO', FABRIC_ACTION.undo, () => { const l = bodyPaint()?.undo() ?? -1; if (l >= 0) { templates[l] = null; sync(); refreshTargets(); touched(); } });
  const redoButton = button('REDO', FABRIC_ACTION.redo, () => { const l = bodyPaint()?.redo() ?? -1; if (l >= 0) { sync(); refreshTargets(); touched(); } });
  edits.append(
    button('MIRROR L ↔ R', FABRIC_ACTION.mirror, () => { const p = bodyPaint(), map = regionMap(), i = layer(); if (p && map && i >= 0) { p.checkpoint(i); p.mirror(i, map.mirror); sync(); draw(); touched(); } }),
    undoButton, redoButton,
    twoTap('CLEAR LAYER', 'CLEAR? TAP AGAIN', FABRIC_ACTION.clear, () => { const p = bodyPaint(), i = layer(); if (p && i >= 0) { p.checkpoint(i); p.clear(i); templates[i] = null; sync(); refreshTargets(); touched(); } }),
  );
  // body regions: tap one to paint it whole with the BRUSH, or clear it with the ERASER (Joshua, 2026-10-20)
  const sides = row();
  const sideButtons = new Map<RegionSide, HTMLButtonElement>([
    ['both', button('BOTH SIDES', FABRIC_ACTION.side('both'), () => { side = 'both'; draw(); })],
    ['L', button('HER LEFT', FABRIC_ACTION.side('L'), () => { side = 'L'; draw(); })],
    ['R', button('HER RIGHT', FABRIC_ACTION.side('R'), () => { side = 'R'; draw(); })],
  ]);
  sides.append(...sideButtons.values());
  const regions = row();
  for (const g of REGION_GROUPS) regions.append(button(g.name, FABRIC_ACTION.region(g.id), () => {
    const p = bodyPaint(), map = regionMap(), i = layer();
    if (!p || !map || i < 0) return;
    const erase = tool === 'erase';
    p.checkpoint(i);
    p.fillRegions(i, map.region, groupRegions(g, side), erase);
    templates[i] = null;
    if (!erase) ensurePaintFabric(); else sync();
    refreshTargets(); touched();
  }));
  const showRegions = button('SHOW REGIONS', FABRIC_ACTION.showRegions, () => { showingRegions = !showingRegions; overlay(); draw(); });
  const regionsBox = el('details', 'border-top:1px solid var(--sl-line,#ffffff20);padding-top:4px');
  const regionsHead = el('summary', 'cursor:pointer;font-size:11px;opacity:.8;padding:4px 0'); regionsHead.textContent = 'REGIONS · tap to fill or clear a whole region';
  const regionsShow = row(); regionsShow.append(showRegions);
  regionsBox.append(regionsHead, sides, regions, regionsShow);
  paintBox.append(heading('TOOL'), tools, lineRow, brush.wrap, edits, regionsBox);

  // ---- SAVE (the room's)
  const saveBox = el('div', 'display:flex;flex-direction:column;gap:8px');

  // ---- DETAIL, shared with the BODY tab
  const detailViews: { draw(): void }[] = [];
  const detailFold = el('details', 'border-top:1px solid var(--sl-line,#ffffff20);padding-top:4px');
  const detailHead = el('summary', 'cursor:pointer;font-size:11px;opacity:.8;padding:4px 0'); detailHead.textContent = 'BREAST, NAVEL & VULVA DETAIL THROUGH CLOTHES';

  const status = el('div', 'font-size:11px;line-height:1.4;overflow-wrap:anywhere;opacity:.85');
  status.dataset.field = FABRIC_FIELD.status;
  status.setAttribute('aria-live', 'polite');

  content.append(pieceRow, spaces, showRow, designBox, paintBox, saveBox, detailFold, status);
  panel.append(summary, content);
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) panel.addEventListener(ev, (e) => e.stopPropagation());
  panel.addEventListener('toggle', () => { updateView(); draw(); });

  // ------------------------------------------------------------ the detail controls (one setting, many views)
  function detailControl(): HTMLElement {
    const box = el('div', 'display:flex;flex-direction:column;gap:6px');
    const info = el('div', 'font-size:10px;opacity:.7;line-height:1.35');
    info.dataset.field = FABRIC_FIELD.detailInfo;
    const one = (which: 'nipple' | 'navel' | 'vulva', title: string, field: string) => {
      const s = slider(field, { min: 0, max: 1, step: 0.05 }, (v) => setDetailValue(which, v));
      const reset = button('RESET TO AUTO', FABRIC_ACTION.detailAuto(which), () => setDetailValue(which, null));
      reset.style.minHeight = '30px'; reset.style.padding = '3px 8px'; reset.style.fontSize = '10px';
      const head = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:6px');
      head.append(s.label, reset);
      const wrap = el('div', 'display:flex;flex-direction:column;gap:2px'); wrap.append(head, s.input);
      return { wrap, draw() {
        const manual = override[which] ?? null;
        const auto = autoDetail(which);
        const value = manual ?? auto?.keep ?? null;
        s.label.textContent = `${title} · ${manual !== null ? 'MANUAL' : 'AUTO'} ${value === null ? '—' : `${Math.round(value * 100)}%`}`;
        s.input.value = String(value ?? 0.5);
        reset.style.display = manual !== null ? '' : 'none';
      } };
    };
    const nip = one('nipple', 'BREAST DETAIL', FABRIC_FIELD.nippleKeep), nav = one('navel', 'NAVEL DETAIL', FABRIC_FIELD.navelKeep), vul = one('vulva', 'VULVA DETAIL', FABRIC_FIELD.vulvaKeep);
    box.append(nip.wrap, nav.wrap, vul.wrap, info);
    detailViews.push({ draw() {
      nip.draw(); nav.draw(); vul.draw();
      const parts = (['nipple', 'navel', 'vulva'] as const).map((w) => {
        const a = autoDetail(w), word = w === 'nipple' ? 'Breast' : w === 'navel' ? 'Navel' : 'Vulva';
        if ((override[w] ?? null) !== null) return `${word}: your value, on every piece over it.`;
        return a ? `${word}: AUTO from the ${a.piece.toLowerCase()} (${a.material}).` : `${word}: AUTO; nothing painted over it now.`;
      });
      info.textContent = `${parts.join(' ')} Bare skin is never changed.`;
    } });
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) box.addEventListener(ev, (e) => e.stopPropagation());
    return box;
  }
  function setDetailValue(which: 'nipple' | 'navel' | 'vulva', value: number | null): void {
    const v = value === null ? null : Math.max(0, Math.min(1, value));
    // (the vulva's AUTO is left out of the saved override, so an outfit saved before it had one reads the same)
    if (which === 'vulva') { const { vulva: _old, ...rest } = override; void _old; override = v === null ? rest : { ...rest, vulva: v }; }
    else override = { ...override, [which]: v };
    sync(); drawDetail(); touched();
  }
  const drawDetail = () => { for (const v of detailViews) v.draw(); };
  detailFold.append(detailHead, detailControl());

  /** A modelled garment's own detail: AUTO from the fabric it is dyed in (its family's row). */
  const garmentResolved = (name: string): ResolvedDetail => resolveDetail(DEFAULT_LAYER_DETAIL, garmentChoices.get(name)?.fabric?.family ?? null, undefined);
  /** What a modelled garment shows of her: the outfit's MANUAL values where set, else its own AUTO. */
  const garmentDetail = (name: string): DetailKeep => { const own = garmentResolved(name).keep; return { nipple: override.nipple ?? own.nipple, navel: override.navel ?? own.navel }; };
  /** A layer's own detail: its mode, its fabric's family and its template's construction. */
  const resolved = (i: number): ResolvedDetail => resolveDetail(details[i], paintChoices[i].fabric?.family ?? null, templates[i] ? COVERAGE_TEMPLATES.find((t) => t.id === templates[i]!.id)?.construction : undefined);
  /** What a layer keeps: the outfit's MANUAL values where set, else the layer's own. */
  const keepOf = (i: number): DetailKeep => { const own = resolved(i).keep; return { nipple: override.nipple ?? own.nipple, navel: override.navel ?? own.navel }; };
  /** AUTO's value for a detail: of the pieces shown over it, the one that hides most, as the shader decides. */
  function autoDetail(which: 'nipple' | 'navel' | 'vulva'): { keep: number; piece: string; material: string } | null {
    let best: { keep: number; piece: string; material: string } | null = null, most = -1;
    // a simulated garment over her lies over both, wholly (a top: never over her vulva)
    const over = which === 'vulva' ? null : hooks.clothOver?.();
    if (over && which !== 'vulva') {
      const r = garmentResolved(over.name);
      best = { keep: r.keep[which], piece: over.label, material: r.material?.name.toLowerCase() ?? 'its fabric' };
      most = 1 - r.keep[which];
    }
    const p = paint;
    if (!p) return best;
    const at = (which === 'navel' ? [p.navelVertex] : which === 'vulva' ? [hooks.vulvaHint?.() ?? -1] : p.nippleVertices).filter((v) => v >= 0);
    if (!at.length) return best;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      if (!p.has(i) || !paintChoices[i].fabric || !layerShown(i)) continue;
      const c = Math.max(...at.map((v) => Math.min(1, p.coverAt(v, [i]) * 1.4)));
      if (c < 0.2) continue;
      const r = resolved(i), keep = which === 'vulva' ? resolveVulva(details[i], paintChoices[i].fabric?.family ?? null, templates[i] ? COVERAGE_TEMPLATES.find((t) => t.id === templates[i]!.id)?.construction : undefined) : r.keep[which], hide = c * (1 - keep);
      if (hide > most) { most = hide; best = { keep, piece: titleOf(i), material: r.material?.name.toLowerCase() ?? (details[i].mode === 'off' ? 'detail off on it' : 'set on it') }; }
    }
    return best;
  }

  // ------------------------------------------------------------ state
  const current = (): FabricChoice => (target.kind === 'layer' ? paintChoices[target.index] : garmentChoices.get(target.name) ?? DEFAULT_CHOICE);
  function set(change: Partial<FabricChoice>): void {
    const next = { ...current(), ...change };
    if (target.kind === 'layer') paintChoices[target.index] = next; else garmentChoices.set(target.name, next);
    if (setMatch) matchSet(target);
    draw(); void apply(); touched();
  }
  // ------------------------------------------------------------ a set's two halves in one fabric
  /** TOP + BOTTOM MATCH (the header): on, a change to either half of a set goes on both. */
  let setMatch = true;
  /** The sets she has on: each one's garment, whether that has an edging of its own, and its painted pieces' layers (-1: not on her). */
  function setsOn(): { garment: string; trim: boolean; fill: number; edging: number }[] {
    const out: { garment: string; trim: boolean; fill: number; edging: number }[] = [];
    for (const [garment, s] of Object.entries(GARMENT_SETS)) {
      const w = hooks.worn().find((x) => x.name === garment);
      const fill = templates.findIndex((x) => x?.id === s.fabric), edging = templates.findIndex((x) => x?.id === s.edging);
      if (w && (fill >= 0 || edging >= 0)) out.push({ garment, trim: w.trim, fill, edging });
    }
    return out;
  }
  /** The set a piece is half of, if she has both halves on. */
  const setOf = (t: Target) => setsOn().find((s) => (t.kind === 'garment' ? t.name === s.garment : t.index === s.fill || t.index === s.edging)) ?? null;
  const choicesOf = (s: { garment: string; fill: number; edging: number }): FabricSet => ({ top: garmentChoices.get(s.garment) ?? DEFAULT_CHOICE, fill: s.fill >= 0 ? paintChoices[s.fill] : null, edging: s.edging >= 0 ? paintChoices[s.edging] : null });
  /** The other half of `from`'s set takes its fabric (`fabricLibrary.matchSet`). */
  function matchSet(from: Target): void {
    const s = setOf(from);
    if (!s) return;
    const was = choicesOf(s), next = matchedSet(from.kind === 'garment' ? 'top' : from.index === s.fill ? 'fill' : 'edging', was, s.trim);
    if (next.top !== was.top) garmentChoices.set(s.garment, next.top);
    if (s.fill >= 0 && next.fill) paintChoices[s.fill] = next.fill;
    if (s.edging >= 0 && next.edging) paintChoices[s.edging] = next.edging;
  }
  /** Whether every set she has on is in one fabric now: what TOP + BOTTOM MATCH starts as when clothes go on. */
  const setsMatch = (): boolean => setsOn().every((s) => setMatches(choicesOf(s), s.trim));
  let notify = false;
  /** Tell the room, once per burst of changes. */
  function touched(): void {
    if (notify || !hooks.changed) return;
    notify = true;
    queueMicrotask(() => { notify = false; if (!disposed) hooks.changed?.(); });
  }
  function setSpace(next: EditorSpace): void {
    // painting is on a paint layer: from a garment, BODY PAINT takes the first painted layer, or an empty one
    if (next === 'paint' && target.kind !== 'layer') {
      const first = pieces().find((p) => p.target.kind === 'layer');
      if (first) target = first.target;
    }
    space = next; updateView(); draw(); void apply();
  }
  const editing = () => panel.open && active;
  /** Whether paint layer `i` is drawn now. Hidden only while the editor shows it hidden; its paint is kept. */
  function layerShown(i: number): boolean {
    // her skin painted bare in FACE (CLOTHES · HIDDEN): no paint layer shows, and every one is kept
    if (bare) return false;
    // giving birth: whatever is painted over her crotch is off (a bottom or a one-piece; legwear and tops stay)
    if (lowerBare && templates[i] && LOWER_KINDS.includes(pieceKind(templates[i]!.id) ?? 'top')) return false;
    if (!editing()) return true;
    if (space === 'paint') return paintView === 'all' || (paintView === 'layer' && layer() === i);
    if (space === 'design' && isolated) return layer() === i;
    return true;
  }
  function garmentView(): 'all' | 'none' | string {
    if (!editing()) return 'all';
    if (space === 'paint') return 'none';
    if (space === 'design' && isolated) return target.kind === 'garment' ? target.name : 'none';
    return 'all';
  }
  let shownGarments: 'all' | 'none' | string = 'all';
  /** Every paint layer hidden for the room's FACE section (`setBare`). */
  let bare = false;
  /** Her painted bottoms hidden for her birth positions (`setLowerBare`). */
  let lowerBare = false;
  function updateView(): void {
    const next = editing() && space === 'paint' && target.kind === 'layer';
    if (next !== painting) { painting = next; if (!next) strokeEnd(); overlay(); }
    const g = garmentView();
    if (g !== shownGarments) { shownGarments = g; hooks.garmentsShown(g); } else sync();
  }
  /** A fill or a first stroke on a layer with no fabric chosen paints in its first swatch, so it shows. */
  function ensurePaintFabric(): void {
    const i = layer();
    if (i < 0) return;
    if (!paintChoices[i].fabric) { paintChoices[i] = { ...paintChoices[i], fabric: { family: 'jersey', colour: 0 } }; void apply(); }
    else sync();
  }
  function applyTemplate(id: string, params: CoverageParams): void {
    const p = bodyPaint(), map = regionMap(), i = layer();
    if (!p || !map || i < 0) return;
    p.checkpoint(i);
    // a shirt keeps the length chosen for shirts
    // (a waistband that follows her belly, at her belly's size)
    const withLength = followedAt(params.length !== null ? withDial(params, 'length', shirtLength) : params, belly());
    templates[i] = { id, params: withLength };
    p.setLayer(i, coverage(map, withLength, cutOf(withLength)?.cut ?? null));
    ensurePaintFabric(); refreshTargets(); touched();
  }
  /**
   * HER OWN MEASURES FOR A DRAWN TOP (`topCut.ts`): made once a body from her rest skin and her joints, with which of
   * her skin is her arm's laid on her for the shader. Null while her body or her map is not ready.
   */
  function topFrameNow(): TopFrame | null {
    const body = hooks.body(), map = regionMap();
    if (!body || !map?.rest || !map.joints) return null;
    if (frameOf?.mesh !== body) {
      const index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? body.geometry.index?.array, J = map.joints;
      const frame = index ? topFrame({ rest: map.rest, index, unitsPerMetre: hooks.unitsPerMetre?.(body) ?? hooks.unitsPerCm(body) * 100, facing: map.facing, joints: { neck: J.neck, hipL: J.hipL, hipR: J.hipR, shoulderL: J.shoulderL, elbowL: J.elbowL, wristL: J.wristL, shoulderR: J.shoulderR, elbowR: J.elbowR, wristR: J.wristR } }) : null;
      frameOf = { mesh: body, frame };
      for (const t of cutTextures.values()) t.dispose();
      cuts.clear(); cutTextures.clear(); wornCut = null;
      if (frame) layLimbSkin(body, map);
    }
    return frameOf.frame;
  }
  /** Which of her skin is a limb's, laid on her once a body (`bottomCut.limbSkin`): a sleeve's end cuts her arm's skin, a leg's end her leg's. */
  function layLimbSkin(body: THREE.Mesh, map: BodyMap): void {
    if (limbLaid === body) return;
    limbLaid = body;
    setArmSkin(body, limbSkin(map), hooks.rest(body));
  }
  /**
   * HER OWN MEASURES FOR A DRAWN BOTTOM (`bottomCut.ts`): made once a body from her joints, with which of her skin is a
   * limb's laid on her for the shader. Null while her body or her map is not ready.
   */
  function lowFrameNow(): LowFrame | null {
    const body = hooks.body(), map = regionMap();
    if (!body || !map?.joints) return null;
    if (lowOf?.mesh !== body) {
      const J = map.joints, index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? (body.geometry as THREE.BufferGeometry).index?.array;
      // (her rest skin and her triangles with it: the middle of her front and of her back and her crease are measured
      // off them, for an under-belly waistband's hoop)
      lowOf = { mesh: body, frame: lowFrame({ unitsPerMetre: hooks.unitsPerMetre?.(body) ?? hooks.unitsPerCm(body) * 100, facing: map.facing, joints: { pelvis: J.pelvis, spine: J.spine, chest: J.chest, neck: J.neck, hipL: J.hipL, kneeL: J.kneeL, ankleL: J.ankleL, hipR: J.hipR, kneeR: J.kneeR, ankleR: J.ankleR }, ...(map.rest && index ? { skin: { rest: map.rest, limb: limbSkin(map), index } } : {}) }) };
      lowSlip = null;
    }
    if (lowOf.frame) layLimbSkin(body, map);
    return lowOf.frame;
  }
  /** Her skin's material (a function, not a constant: `sync` runs before the panel's constants further down are made). */
  function skinMaterialOf(body: THREE.Mesh): THREE.Material { return Array.isArray(body.material) ? body.material[0] : body.material; }
  /** A template's drawn bottom on her (`bottomCut.lowSpec`); null for any other template. */
  /** THE CATSUIT'S LEGS (`topCut.isCatsuit`): a drawn bottom's legs' ends at its LEG LENGTH, a cuff at each, no waistband -- its cut is the rest of it. */
  function catsuitLegs(params: CoverageParams): LowSpec | null {
    const frame = lowFrameNow();
    if (!frame) return null;
    const s = lowSpec({ ...params, legStart: 0 }, frame);
    return { ...s, waist: null, start: null, hinge: null, bands: { ...s.bands, waist: 0, top: 0 } };
  }
  function lowOfParams(params: CoverageParams | null | undefined): LowSpec | null {
    if (!params || !isDrawnBottom(params)) return null;
    const frame = lowFrameNow();
    return frame ? lowSpec(params, frame) : null;
  }
  /** A drawn bottom's layer beside its fabric: its waistband (and its hoop's hinge, an under-belly one's), its legs' ends, its bands and its EDGING. */
  const lowLayerOf = (spec: LowSpec, c: FabricChoice): NonNullable<FabricLayer['low']> => ({ waist: spec.waist, end: spec.end, start: spec.start, band: [spec.bands.waist, spec.bands.leg, spec.bands.top], shade: BAND_SHADE, hinge: spec.hinge ? spec.hinge[0] : null, edging: edgingOf(c) });
  /** Her measures as her skin's material reads them for a drawn bottom (`fabricMaterial.FabricLow`), her legs' cuts as they are at rest. */
  function fabricLowOf(frame: LowFrame): FabricLow {
    const U = frame.unitsPerMetre, S = frame.spine, leg = (l: LowLeg) => { const p = legPlanes(l); return [p.thigh, p.shin, legBlend(l, U)] as const; };
    const T = frame.stay;
    return { axis: [frame.mid, frame.facing, frame.seam, LOW_CUT.range * U], spineA: [S[0][0], S[0][1], S[1][0], S[1][1]], spineB: [S[2][0], S[2][1], S[3][0], S[3][1]], floor: frame.floor, stay: [T.wide, 0, 0, T.round], crease: frame.crease, moon: [LOW_CUT.moonBlend * U, LOW_CUT.moonBack * U, LOW_CUT.moonOn * U, 0], front: [LOW_CUT.foldIn * U, LOW_CUT.foldOut * U, LOW_CUT.foldFrom * U, LOW_CUT.foldTo * U], fold: [0.01 * U, frame.hipY, LOW_CUT.foldDepth * U, LOW_CUT.foldCurve / U], foldLine: FOLD_LINE.map((y) => y * U), legL: leg(frame.legs[0]), legR: leg(frame.legs[1]), seam: [CUT_SEAM.dark, CUT_SEAM.halfWidth * U] };
  }
  /** A template's drawn cut on her (`paintTemplates.templateCut`), kept by what it is cut to; null for any other template. */
  function cutOf(params: CoverageParams | null | undefined): WornCut | null {
    const map = regionMap(), frame = params ? topFrameNow() : null;
    if (!params || !map || !frame) return null;
    // (everything a cut and what is drawn on it are laid from: a kind of its own -- an outline, the crop tee -- and a
    // hem of its own where a top has no LENGTH are among it since 2026-11-14. Without them a camisole whose NECKLINE
    // was moved to a tank's wore the tank's cut)
    const key = JSON.stringify([params.neckStyle, params.neckShape ?? null, params.neckWide ?? null, params.cutout ?? null, params.neckFront, params.sleeve, params.length, params.band ?? null, params.top ?? null, params.length === null ? params.hemFront : null, params.detail ?? null]);
    let made = cuts.get(key);
    if (made) cuts.delete(key);
    else {
      const cut = templateCut(map, params, frame);
      if (!cut) return null;
      made = { cut, detail: templateDetail(params, cut) };
      // (a slider dragged lays a cut for every stop: the ones longest unused are let go)
      if (cuts.size >= 24) { const oldest = cuts.keys().next().value as string; cuts.delete(oldest); cutTextures.get(oldest)?.dispose(); cutTextures.delete(oldest); }
    }
    cuts.set(key, made);
    return { key, cut: made.cut, detail: made.detail, ownHem: params.length === null && params.hemFront !== null && !hasNoHem(params) };
  }
  /** A drawn top's layer beside its fabric: its bands, its EDGING and what is drawn on it. */
  const cutLayerOf = (worn: WornCut, c: FabricChoice) => ({ ...cutLayer(worn.cut), edging: edgingOf(c), detail: worn.detail ? { pack: worn.detail.pack } : null });
  /**
   * A cut as her skin's material reads it (`fabricMaterial.FabricCut`): its picture, made the first time it is worn.
   * Its two drawings are blended over the cut's own depth (`TopCutSpec.sideBlend`: an outline's front and back armholes
   * end at feet of their own, and under her arm the edge slopes from one to the other across that depth), a tee's
   * over `TOP_CUT.sideBlend`. An outline's armscye -- her side's drawing, the picture's alpha -- goes with it (`side`,
   * `start`: `topCut.armscyeAt`'s numbers).
   */
  function fabricCutOf(worn: WornCut): FabricCut {
    const { cut, key } = worn, f = cut.frame, U = f.unitsPerMetre;
    let texture = cutTextures.get(key);
    if (!texture) {
      texture = new THREE.DataTexture(cutPicture(cut), f.cols, f.rows, THREE.RGBAFormat, THREE.UnsignedByteType);
      texture.colorSpace = THREE.NoColorSpace; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping; texture.generateMipmaps = false; texture.needsUpdate = true;
      cutTextures.set(key, texture);
    }
    const arm = (a: TopFrame['arms'][number]) => sleevePlane(a, cut.spec.sleeve, U), S = cut.side ? cut.spec.outline?.side : null;
    return {
      texture, rect: [f.x0, f.y0, 1 / (f.cols * f.cell), 1 / (f.rows * f.cell)], depth: [f.zLo, f.zHi - f.zLo, cut.spec.sideBlend ?? TOP_CUT.sideBlend * U, TOP_CUT.range * U],
      armL: arm(f.arms[0]), armR: arm(f.arms[1]), limb: [f.mid, cut.spec.sleeve, Number.isFinite(cut.spec.hemY) ? cut.spec.hemY : -1e9, f.facing], seam: [CUT_SEAM.dark, CUT_SEAM.halfWidth * U],
      side: S ? [S.z0, S.gate, ARMSCYE.feather * U, ARMSCYE.join * U] : null, start: S && Number.isFinite(S.startY) ? [S.startX, S.startY, S.slope] : null,
      ownHem: worn.ownHem,
    };
  }
  /** A one-piece's or the catsuit's neck shape as it is worn: its own pick, else its outline's or its template's style; past the base of her neck, a turtleneck. */
  function neckShapeOf(p: CoverageParams): NeckStyle | 'turtle' {
    if (p.neckFront !== null && p.neckFront > 1) return 'turtle';
    if (p.neckShape) return p.neckShape;
    return p.top && p.top in TOP_OUTLINES ? TOP_OUTLINES[p.top as TopOutlineKind].neck : p.neckStyle;
  }
  /** A NECK SHAPE picked: that style at its own depth (`DRAWN_NECK`), or a turtleneck at its tallest. */
  function pickNeckShape(k: NeckStyle | 'turtle'): void {
    const i = layer(), t = i >= 0 ? templates[i] : null, p = bodyPaint(), map = regionMap();
    if (!t || !p || !map) return;
    templates[i] = { id: t.id, params: k === 'turtle' ? { ...t.params, neckFront: NECK_RANGE.dial } : { ...t.params, neckShape: k, neckFront: DRAWN_NECK[k] } };
    p.setLayer(i, coverage(map, templates[i]!.params, cutOf(templates[i]!.params)?.cut ?? null));
    sync(); draw(); touched();
  }
  /** A CHEST CUTOUT picked: that shape at the size and place the piece's cutout had (or its own), or none. */
  function pickCutout(k: CutoutShape | 'none'): void {
    const i = layer(), t = i >= 0 ? templates[i] : null, p = bodyPaint(), map = regionMap();
    if (!t || !p || !map) return;
    templates[i] = { id: t.id, params: { ...t.params, cutout: k === 'none' ? null : { ...(t.params.cutout ?? CHEST_CUTOUT.default), shape: k } } };
    p.setLayer(i, coverage(map, templates[i]!.params, cutOf(templates[i]!.params)?.cut ?? null));
    sync(); draw(); touched();
  }
  function moveDial(dial: (typeof COVERAGE_DIALS)[number]['id'], value: number): void {
    const i = layer(), t = i >= 0 ? templates[i] : null, p = bodyPaint(), map = regionMap();
    if (!t || !p || !map) return;
    if (dial === 'length') shirtLength = paintedShirtLength(value);
    templates[i] = { id: t.id, params: withDialAt(t.params, dial, value, belly()) };
    p.setLayer(i, coverage(map, templates[i]!.params, cutOf(templates[i]!.params)?.cut ?? null));
    sync(); draw(); touched();
  }
  /** FOLLOWS BELLY on (his settings at her belly's size, nothing moved on top) or off (where it is now, kept). */
  function toggleFollow(): void {
    const i = layer(), t = i >= 0 ? templates[i] : null, p = bodyPaint(), map = regionMap();
    if (!t || !p || !map || !canFollow(t.id)) return;
    p.checkpoint(i);
    templates[i] = { id: t.id, params: withFollow(t.params, !t.params.follow, belly()) };
    p.setLayer(i, coverage(map, templates[i]!.params, cutOf(templates[i]!.params)?.cut ?? null));
    sync(); draw(); touched();
  }
  /** Her belly's size (%), as the belly slider has it. */
  const belly = (): number => hooks.bellyPct?.() ?? 0;
  /**
   * A WAISTBAND THAT FOLLOWS HER BELLY, laid again as her belly changes: at most every `FOLLOW_EVERY_MS` while the
   * slider is dragged, and at the size it comes to rest on. Not a change by hand: a look is not touched by it. (A laying
   * is 37 to 52 ms on the build machine -- MEASURED 2026-11-23 -- so it is not laid each frame while her belly moves.)
   */
  const FOLLOW_EVERY_MS = 250;
  let followAt = NaN, followLaid = -Infinity;
  function layFollow(): void {
    const b = belly();
    if (b === followAt) return;
    const now = performance.now();
    if (now - followLaid < FOLLOW_EVERY_MS) return;
    const p = paint, map = p ? regionMap() : null;
    followAt = b; followLaid = now;
    if (!p || !map) return;
    let moved = false;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const t = templates[i];
      if (!t?.params.follow) continue;
      const q = followedAt(t.params, b);
      if (Math.abs((q.riseFront ?? 0) - (t.params.riseFront ?? 0)) < 1e-4 && Math.abs((q.riseBack ?? 0) - (t.params.riseBack ?? 0)) < 1e-4 && Math.abs((q.riseSide ?? 0) - (t.params.riseSide ?? 0)) < 1e-4) continue;
      templates[i] = { id: t.id, params: q };
      p.setLayer(i, coverage(map, q, cutOf(q)?.cut ?? null));
      moved = true;
    }
    if (moved) { sync(); draw(); }
  }

  let regionCache: { mesh: THREE.Mesh; map: BodyMap | null } | null = null;
  function regionMap(): BodyMap | null {
    const body = hooks.body();
    if (!body) return null;
    if (regionCache?.mesh !== body) regionCache = { mesh: body, map: hooks.regions() };
    return regionCache.map;
  }
  /** The SHOW REGIONS tint: on only while painting with it switched on. */
  function overlay(): void {
    const p = bodyPaint();
    if (!p) return;
    const on = painting && showingRegions && !!regionMap();
    if (on) p.showRegions(regionMap()!.region, BODY_REGIONS.map((r) => r.tint));
    const material = Array.isArray(p.mesh.material) ? p.mesh.material[0] : p.mesh.material;
    setRegionOverlay(p.mesh, material, on, { layers: PAINT_LAYER_COUNT, rest: hooks.rest(p.mesh) });
    // (the overlay's tints and her skin's slip about her hips share one attribute: `LOW_SLIP_ATTRIBUTE`)
    if (lowSlip) lowSlip.laid = false;
    if (!on) layLowSlip();
  }
  function bodyPaint(): BodyPaint | null {
    const body = hooks.body();
    if (!body) return null;
    if (paint?.mesh !== body) {
      paint = new BodyPaint(body);
      // (what of her shape is her pose's now: a stroke held to BODY LEVEL is level on her standing shape, which is without it)
      paint.posed = () => { const fields = hooks.rest(body); return (hooks.poseFields?.() ?? []).flatMap((name) => { const f = fields?.fields.get(name), weight = fields?.laid?.get(name) ?? 0; return f && weight ? [{ index: f.index, pos: f.pos, weight }] : []; }); };
    }
    return paint;
  }
  const garmentName = () => (target.kind === 'garment' ? target.name : '');
  const wornTrim = () => !!hooks.worn().find((w) => w.name === garmentName())?.trim;

  // ------------------------------------------------------------ pieces
  function kindOf(i: number): Piece['kind'] | null {
    const t = templates[i];
    if (t) return pieceKind(t.id) ?? 'paint';
    return paint && paint.has(i) ? 'paint' : null;
  }
  function titleOf(i: number): string { const k = kindOf(i); return k ? KIND_TITLE[k] : `LAYER ${i + 1}`; }
  function fabricName(c: FabricChoice): string { if (c.fabric?.image) return `image ${pictureName(c.fabric.image) || ''}`.trim(); return c.fabric ? `${fabricFamily(c.fabric.family).name} ${c.fabric.tint ? tintLabel(c.fabric.tint) : colourName(c.fabric.family, c.fabric.colour).toLowerCase()}` : ''; }
  function pieces(): Piece[] {
    const out: Piece[] = [];
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const k = kindOf(i);
      if (!k) continue;
      const t = templates[i], name = t ? COVERAGE_TEMPLATES.find((x) => x.id === t.id)?.name ?? t.id : 'Hand painted';
      out.push({ id: `layer:${i}`, kind: k, title: `${KIND_TITLE[k]} · L${PAINT_LAYER_COUNT - i}`, name, target: { kind: 'layer', index: i } });
    }
    for (const w of hooks.worn()) out.push({ id: `garment:${w.name}`, kind: garmentKind(w.name), title: KIND_TITLE[garmentKind(w.name)], name: w.label, target: { kind: 'garment', name: w.name } });
    // (her paint layers in the order they lie on her, the top one first -- Joshua, 2026-11-19: "set layer 1 as way top and
    // 6 as bottom"; the garments she wears after them, as they always were among themselves)
    const lay = (p: Piece) => (p.target.kind === 'layer' ? PAINT_LAYER_COUNT - p.target.index : PAINT_LAYER_COUNT + 1 + KIND_ORDER.indexOf(p.kind));
    out.sort((a, b) => lay(a) - lay(b));
    // an empty layer to start a new piece in (the lowest free one)
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) if (!kindOf(i)) { out.push({ id: 'new', kind: 'new', title: KIND_TITLE.new, name: `layer ${PAINT_LAYER_COUNT - i} of ${PAINT_LAYER_COUNT}`, target: { kind: 'layer', index: i } }); break; }
    return out;
  }
  const idOf = (t: Target) => (t.kind === 'layer' ? (kindOf(t.index) ? `layer:${t.index}` : 'new') : `garment:${t.name}`);
  function select(id: string): void {
    const p = pieces().find((x) => x.id === id);
    if (!p) return;
    target = p.target;
    if (target.kind === 'garment' && space === 'paint') space = 'design';
    updateView(); draw();
  }
  /** Rebuild the SELECT row from what she wears; a selection that no longer exists moves to the first piece. */
  function refreshTargets(): void {
    const list = pieces();
    const gone = target.kind === 'garment' && !hooks.worn().some((w) => w.name === garmentName());
    // an empty layer stays selected only as the NEW PIECE being started
    const emptied = target.kind === 'layer' && !kindOf(target.index) && list.find((x) => x.id === 'new')?.target.kind === 'layer' && (list.find((x) => x.id === 'new')!.target as { index: number }).index !== target.index;
    if (gone || emptied) target = list[0]?.target ?? { kind: 'layer', index: 0 };
    pieceButtons.clear();
    pieceRow.replaceChildren(...list.map((p) => {
      const b = el('button', 'flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-height:44px;max-width:160px;padding:5px 10px;border-radius:9px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);text-align:left');
      b.type = 'button'; b.dataset.action = FABRIC_ACTION.piece(p.id);
      const t = el('span', 'font:800 12px system-ui;letter-spacing:.06em'); t.textContent = p.title;
      const n = el('span', 'font:500 10px system-ui;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px'); n.textContent = p.name;
      b.append(t, n);
      b.addEventListener('click', (e) => { e.stopPropagation(); select(p.id); });
      pieceButtons.set(p.id, b);
      return b;
    }));
    updateView(); draw();
  }

  // ------------------------------------------------------------ the editor's own look
  function draw(): void {
    const c = current(), fam = c.fabric?.family ?? null, tp = trimPick(c), onLayer = target.kind === 'layer', i = layer();
    const selectedId = idOf(target);
    for (const [id, b] of pieceButtons) {
      const on = id === selectedId;
      b.style.background = on ? 'var(--sl-on-soft,#3a2c10)' : 'var(--sl-btn,#151b23)'; b.style.borderColor = on ? GOLD : 'var(--sl-btn-line,#ffffff30)'; b.setAttribute('aria-pressed', String(on));
    }
    for (const [s, b] of spaceButtons) press(b, s === space);
    {
      const on = onLayer && i >= 0 && !!kindOf(i);
      orderRow.style.display = on ? 'flex' : 'none';
      if (on) {
        orderNote.textContent = `LAYER ${PAINT_LAYER_COUNT - i} of ${PAINT_LAYER_COUNT} · 1 is on top`;
        upButton.disabled = i >= PAINT_LAYER_COUNT - 1; downButton.disabled = i <= 0;
        upButton.style.opacity = upButton.disabled ? '.4' : '1'; downButton.style.opacity = downButton.disabled ? '.4' : '1';
      }
    }
    designBox.style.display = space === 'design' ? 'flex' : 'none';
    paintBox.style.display = space === 'paint' ? 'flex' : 'none';
    saveBox.style.display = space === 'save' ? 'flex' : 'none';
    if (space === 'save' && !saveBox.childElementCount) {
      const section = hooks.saveSection?.() ?? null;
      if (section) saveBox.append(section); else saveBox.append(heading('Saving outfits is not available here.'));
    }
    detailFold.style.display = space === 'save' ? 'none' : '';
    showRow.style.display = space === 'save' ? 'none' : 'flex';
    isolateButton.style.display = space === 'design' ? '' : 'none';
    press(isolateButton, isolated);
    isolateButton.textContent = isolated ? 'SHOW ALL' : `ISOLATE ${selectedId === 'new' ? 'PIECE' : onLayer ? titleOf(i) : 'GARMENT'}`;
    for (const [v, b] of viewButtons) { b.style.display = space === 'paint' ? '' : 'none'; press(b, v === paintView); }
    // STYLE: a paint layer's template, grouped as the library groups them
    styleBox.style.display = onLayer ? 'flex' : 'none';
    if (onLayer) {
      const tpl = templates[i];
      // the pictures show the piece's own kind when another piece (or another style of another kind) is picked; the
      // four kinds above them show any other
      const own = tpl ? pieceKind(tpl.id) : null, key = `${i}:${tpl?.id ?? ''}`;
      if (key !== stripFor) { stripFor = key; if (own) stripKind = own; }
      fillStyleStrip();
      for (const [k, b] of styleKindButtons) press(b, k === stripKind);
      for (const [id, b] of styleTiles) { const on = id === tpl?.id; b.style.borderColor = on ? GOLD : 'var(--sl-btn-line,#ffffff30)'; b.setAttribute('aria-pressed', String(on)); }
      // (the one worn is brought into view along the row, without moving the page)
      const worn = tpl ? styleTiles.get(tpl.id) : undefined;
      if (worn && stripSeen !== key && styleStrip.clientWidth > 0) { stripSeen = key; styleStrip.scrollLeft = Math.max(0, worn.offsetLeft - styleStrip.offsetLeft - (styleStrip.clientWidth - worn.offsetWidth) / 2); }
      styleSelect.value = tpl?.id ?? '';
      styleSelect.options[0].text = kindOf(i) ? 'Hand painted (choose a style to replace it)' : 'Choose a style…';
      const used = tpl ? dialsFor(tpl.params) : [];
      dialBox.style.display = tpl ? 'flex' : 'none';
      const shaped = !!tpl && takesTurtleneck(tpl.params);
      neckShapeBox.style.display = shaped ? 'flex' : 'none';
      if (shaped) { const on = neckShapeOf(tpl!.params); for (const [k, b] of neckShapeButtons) press(b, k === on); }
      cutoutBox.style.display = shaped ? 'flex' : 'none';
      if (shaped) { const on = tpl!.params.cutout?.shape ?? 'none'; for (const [k, b] of cutoutButtons) press(b, k === on); }
      const follows = !!tpl && canFollow(tpl.id);
      followBox.style.display = follows ? 'flex' : 'none';
      if (follows) press(followButton, !!tpl!.params.follow);
      for (const [id, d] of dials) {
        d.wrap.style.display = used.includes(id) ? 'flex' : 'none';
        if (tpl) { const v = dialValue(tpl.params, id); d.input.value = String(v); d.label.textContent = `${COVERAGE_DIALS.find((x) => x.id === id)!.name} · ${v.toFixed(2)}${tpl.params.follow && (id === 'rise' || id === 'riseBack') ? ' · follows belly' : ''}`; }
      }
    }
    removeRow.style.display = (onLayer && kindOf(i)) || (!onLayer && !!hooks.takeOff) ? 'flex' : 'none';
    setMatchRow.style.display = setOf(target) ? 'flex' : 'none';
    press(setMatchButton, setMatch);
    const fabricShown = !onLayer || !!kindOf(i);
    fabricHeading.style.display = families.style.display = fabricShown ? '' : 'none';
    families.style.display = fabricShown ? 'flex' : 'none';
    colours.style.display = fabricShown ? 'grid' : 'none';
    familyButtons.get('original')!.textContent = onLayer ? 'NONE' : 'ORIGINAL';
    for (const [id, b] of familyButtons) press(b, (id === 'original' && !fam) || id === fam);
    const show = (pick: FabricPick | null, family: FabricFamilyId | null, buttons: HTMLButtonElement[]) => buttons.forEach((b, k) => {
      const chosen = !!pick && !pick.tint && pick.colour === k;
      b.style.background = SWATCH_HEX[family ?? 'jersey'][k];
      b.style.opacity = family ? '1' : '.45';
      b.style.borderColor = chosen && family ? GOLD : 'transparent';
      b.setAttribute('aria-label', colourName(family ?? 'jersey', k));
      b.setAttribute('aria-pressed', String(chosen));
    });
    const image = c.fabric?.image ?? null;
    if (image) for (const b of familyButtons.values()) press(b, false);
    show(image ? null : c.fabric, fam, colourButtons);
    imageRow.style.display = fabricShown ? 'flex' : 'none';
    imageNote.style.display = fabricShown && (image || imageBusy || imageNote.textContent) ? '' : 'none';
    press(imageButton, !!image);
    imageButton.textContent = image ? 'CHANGE IMAGE…' : 'UPLOAD IMAGE…';
    if (!imageBusy) imageNote.textContent = image ? `Image: ${pictureName(image) || 'your picture'} · STITCH sizes it · pick a fabric or colour to go back` : '';
    const tint = image ? null : c.fabric?.tint ?? null;
    custom.style.background = tint ?? 'conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)';
    custom.style.borderColor = tint && fam ? GOLD : 'transparent';
    custom.style.opacity = fam ? '1' : '.45';
    custom.setAttribute('aria-pressed', String(!!tint));
    custom.title = tint ? `Custom ${tintLabel(tint)}` : 'Any colour';
    if (tint && customInput.value !== tint && document.activeElement !== customInput) customInput.value = tint;
    // trim: a garment with a separate edging only. The recovered shirts' edging is baked into their texture and
    // follows the shirt (Joshua: don't risk their approved geometry for it)
    const isShirt = /^shirt/.test(garmentName());
    // ...and a DRAWN top's layer (`topCut.ts`): its bands -- its collar and its sleeve bands or cuffs -- are
    // its EDGING, the top's own fabric a touch darker while MATCH is on, or one colour of their own (`edgingOf`)
    const edged = onLayer && !!fam && !!templates[i] && (isCutTop(templates[i]!.params) || isDrawnBottom(templates[i]!.params));
    const trimmed = !onLayer && wornTrim();
    trimHeading.textContent = edged ? 'EDGING' : 'TRIM';
    trimBox.style.display = (!onLayer && fam && (wornTrim() || isShirt)) || edged ? 'flex' : 'none';
    matchRow.style.display = trimmed || edged ? '' : 'none';
    trimOwn.style.display = (trimmed || edged) && !c.match ? 'flex' : 'none';
    trimNote.textContent = edged ? (c.match ? "The collar and bands are the top's own fabric, a touch darker." : "The collar and bands take this colour on the top's own knit. FLAT makes them a flat colour.")
      : isShirt && !wornTrim() ? "This shirt's edging is part of its own texture, so it takes the shirt's fabric." : '';
    press(match, c.match);
    for (const [id, b] of trimFamilyButtons) press(b, tp?.family === id);
    show(tp, tp?.family ?? null, trimColourButtons);
    const trimTint = !c.match ? tp?.tint ?? null : null;
    trimCustom.style.background = trimTint ?? 'conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)';
    trimCustom.style.borderColor = trimTint ? GOLD : 'transparent';
    trimCustom.setAttribute('aria-pressed', String(!!trimTint));
    trimCustom.title = trimTint ? `Custom ${tintLabel(trimTint)}` : 'Any colour';
    if (trimTint && trimCustomInput.value !== trimTint && document.activeElement !== trimCustomInput) trimCustomInput.value = trimTint;
    const op = opacityOf(c);
    opacity.wrap.style.display = stitch.wrap.style.display = fam && fabricShown ? 'flex' : 'none';
    opacity.label.textContent = `${onLayer ? 'COVER' : 'OPACITY'} · ${Math.round(op * 100)}%`; opacity.input.value = String(op);
    stitch.label.textContent = `STITCH · ${c.stitch.toFixed(2)}×`; stitch.input.value = String(c.stitch);
    // BODY PAINT
    for (const [t, b] of toolButtons) press(b, t === tool);
    for (const [k, b] of sideButtons) press(b, k === side);
    undoButton.disabled = !paint?.canUndo; redoButton.disabled = !paint?.canRedo;
    undoButton.style.opacity = paint?.canUndo ? '1' : '.4'; redoButton.style.opacity = paint?.canRedo ? '1' : '.4';
    press(showRegions, showingRegions);
    brush.label.textContent = `BRUSH · ${brushCm.toFixed(1)} cm`; brush.input.value = String(brushCm);
    brush.wrap.style.display = tool === 'orbit' || tool === 'region' ? 'none' : 'flex';
    lineButton.textContent = lineModeLine(line); lineButton.title = lineModeNote(line); press(lineButton, line !== 'free');
    lineRow.style.display = !LEVEL_LINE_OFFERED || tool === 'orbit' || tool === 'region' ? 'none' : 'flex';
    // the summary names what is being edited, so a folded drawer still says it
    const piece = pieces().find((p) => p.id === selectedId);
    const name = fabricName(c);
    summary.textContent = `EDIT OUTFIT · ${piece ? `${piece.title}${piece.kind === 'new' ? '' : ` · ${piece.name}`}` : '—'}${name && piece?.kind !== 'new' ? ` · ${name}` : ''}`;
    const layerWord = i >= 0 ? titleOf(i).toLowerCase() : 'paint';
    status.textContent = space === 'paint'
      ? `${paintView === 'layer' ? `Only the ${layerWord} layer shows; her other clothes come back when you leave BODY PAINT.` : paintView === 'all' ? 'Every paint layer shows; modelled garments stay hidden while you paint.' : 'Her body is clear: you paint the selected layer without seeing it.'} ${tool === 'orbit' ? 'Drag to turn her.' : tool === 'region' ? 'Tap her to fill the region you touch.' : `Drag on her to ${tool === 'brush' ? 'paint' : 'erase'}; two fingers turn and zoom.`}`
      : space === 'save' ? ''
        : selectedId === 'new' ? 'Choose a style for the new piece, or switch to BODY PAINT to paint it by hand.'
          : onLayer ? `${piece?.title ?? 'This piece'} in ${name || 'no fabric yet'}.` : fam ? `${piece?.name ?? 'This garment'} in ${name}.` : `${piece?.name ?? 'This garment'} wears its own material.`;
    drawDetail();
  }

  // ------------------------------------------------------------ swatches
  const swatchKey = (pick: FabricPick, which: 'plain' | 'trim') => pick.image ? `image:${pick.image}` : `${which === 'plain' ? fabricFamily(pick.family).plain : fabricFamily(pick.family).trim}#${pick.colour}${pick.tint ? `~${pick.tint}` : ''}`;
  /** A swatch as a tiling texture, cut from its atlas once, at the atlas's own resolution and proportions. */
  async function swatchTexture(pick: FabricPick, which: 'plain' | 'trim'): Promise<THREE.Texture | null> {
    // a picture of his own: the picture itself, repeated as it is (not mirrored: a print or a logo reads one way)
    if (pick.image) {
      const key = swatchKey(pick, which), have = swatches.get(key);
      if (have) return have;
      const img = await pictureImage(pick.image);
      if (!img || disposed) return null;
      const texture = new THREE.Texture(img as TexImageSource);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8;
      texture.flipY = !(typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap); texture.needsUpdate = true;
      swatches.set(key, texture);
      return texture;
    }
    const fam = fabricFamily(pick.family), path = which === 'plain' ? fam.plain : fam.trim;
    const layout: FabricLayout = which === 'plain' ? 'grid' : 'strips';
    const key = swatchKey(pick, which), have = swatches.get(key);
    if (have) return have;
    if (!atlases.has(path)) atlases.set(path, hooks.loadImage(path));
    const image = await atlases.get(path)!;
    if (!image || disposed) { atlases.delete(path); return null; }
    const r = swatchRect(layout, pick.colour, image.width);
    const canvas = document.createElement('canvas'), ctx2d = canvas.getContext('2d');
    if (!ctx2d) return null;
    if (layout === 'grid') {
      canvas.width = r.w; canvas.height = r.h;
      ctx2d.drawImage(image, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    } else {
      // a strip's knit band, stacked (mirrored every other time) into a square: the same gauge both ways, unstretched
      const sideLength = Math.round(image.width / 4);
      canvas.width = canvas.height = sideLength;
      for (let y = 0, k = 0; y < sideLength; y += r.h, k++) {
        ctx2d.save();
        if (k % 2) { ctx2d.translate(0, 2 * y + r.h); ctx2d.scale(1, -1); }
        ctx2d.drawImage(image, r.x, r.y, sideLength, r.h, 0, y, sideLength, r.h);
        ctx2d.restore();
      }
    }
    // a custom colour: the White swatch just cut, dyed (fabricTint.ts)
    if (pick.tint) {
      const pixels = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
      tintPixels(pixels.data, pick.tint, SWATCH_HEX[pick.family][TINT_BASE_COLOUR]);
      ctx2d.putImageData(pixels, 0, 0);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.anisotropy = 8;
    swatches.set(key, texture);
    return texture;
  }

  let applying = 0;
  /** fetches in flight for what she wears (`busy`) */
  let loadsOut = 0;
  async function apply(): Promise<void> {
    const id = ++applying;
    const wanted: [FabricPick, 'plain' | 'trim'][] = [];
    for (const c of garmentChoices.values()) { if (c.fabric) wanted.push([c.fabric, 'plain']); const t = trimPick(c); if (t) wanted.push([t, 'trim']); }
    for (const c of paintChoices) if (c.fabric) wanted.push([c.fabric, 'plain']);
    const pending = wanted.filter(([p, w]) => !swatches.has(swatchKey(p, w)));
    if (pending.length) {
      status.textContent = 'Loading fabric…';
      loadsOut++;
      let got: (THREE.Texture | null)[];
      try { got = await Promise.all(pending.map(([p, w]) => swatchTexture(p, w))); } finally { loadsOut--; }
      if (disposed || id !== applying) return;
      draw();
      if (got.some((t) => !t)) status.textContent = 'That fabric could not be downloaded. Check your connection, then pick it again.';
    }
    sync();
    // dyes no longer worn are let go: a colour picker dragged across the wheel cuts one for every stop
    const worn = new Set(wanted.map(([p, w]) => swatchKey(p, w)));
    for (const [key, texture] of swatches) if (key.includes('~') && !worn.has(key)) { texture.dispose(); swatches.delete(key); }
  }

  /**
   * A designed garment's field (`paintTemplates.designedField`) for paint layer i, while that layer is still the design
   * (a stroke or a fill by hand takes its template off, and the layer is drawn from its own paint again). Fetched the
   * first time it is wanted; the layer is drawn from its paint until it is in.
   */
  function fieldFor(i: number, body: THREE.SkinnedMesh): NonNullable<FabricLayer['field']> | null {
    const t = templates[i], d = t ? designedField(t.params, body.geometry.getAttribute('position').count) : null;
    if (!d) return null;
    const f = d.field, have = fields.get(f.path);
    if (have) return { texture: have, level: d.level, scale: f.scale, offset: f.offset, open: d.open === true };
    if (!fieldLoads.has(f.path)) { loadsOut++; fieldLoads.set(f.path, hooks.loadImage(f.path).finally(() => { loadsOut--; }).then((image) => {
      if (!image || disposed) return;
      // its picture read back as numbers (its slices lie side by side), and laid as one block: linear data, blended
      // between cells, nothing beyond its faces
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const cells = fieldCells(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, f.dims, f.cols);
      if (!cells) { console.error(`[fabric] ${f.path} is not the picture of a ${f.dims.join(' x ')} field`); return; }
      const texture = new THREE.Data3DTexture(cells, f.dims[0], f.dims[1], f.dims[2]);
      texture.format = THREE.RedFormat; texture.type = THREE.UnsignedByteType; texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; texture.unpackAlignment = 1;
      texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping; texture.needsUpdate = true;
      fields.set(f.path, texture);
      sync();
    })); }
    return null;
  }
  /**
   * Her points' slip over a region of her rest skin, ready to be kept up to date (`skinSlip.ts`): her shapes' slip and
   * her morphs' -- or, with a `frame`, their movement off it. Null for a body it cannot be told on (no triangles, or a rest shape that is not plain numbers in her
   * mesh's own units, as her shape fields leave it).
   */
  function slipOver(body: THREE.Mesh, inRegion: (x: number, y: number, z: number) => boolean, without: ReadonlySet<string> | null = null, frame: ((v: number) => boolean) | null = null): KeptSlip | null {
    const g = body.geometry as THREE.BufferGeometry;
    const rest = g.getAttribute('fabricRest') as THREE.BufferAttribute, pos = g.getAttribute('position') as THREE.BufferAttribute, index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array;
    if (!rest || !index || !(pos.array instanceof Float32Array) || pos.normalized) return null;
    const morphs = g.morphTargetsRelative ? g.morphAttributes.position ?? [] : [];
    // (`frame`: not her slip but her points' movement off her frame, whose points these are: `skinSlip.makeFrameSlip`)
    const solver = frame ? makeFrameSlip(rest.array, inRegion, frame) : makeSkinSlip(rest.array, index, inRegion);
    // (`shaped.version` is stepped when her shapes' slip is to be worked out again: the driver reads it)
    const shaped = { version: 0 };
    // what is laid on her shapes beside them: her belly's push for her baby (added point by point in the shader:
    // softBody.ts), less what of her shape is her pose's (`hooks.poseFields`; `skinSlip.besideShapes` says why)
    const laid = new Float32Array(pos.count * 3);
    const beside = (): Float32Array | null => {
      const push = g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined, fields = hooks.rest(body);
      const posed = posedFields(fields);
      return besideShapes(laid, push && push.array instanceof Float32Array && push.count === pos.count ? push.array : null, posed);
    };
    let besideNow: Float32Array | null = null, besideAt = NaN;
    // (`without`: her morphs that are no slide of her points but her skin moved by her pose -- their weights read as none)
    const skip = without ? Object.entries(body.morphTargetDictionary ?? {}).filter(([name]) => without.has(name)).map(([, k]) => k) : [];
    const weights: number[] = [];
    const weighed = (): ArrayLike<number> => {
      const w = body.morphTargetInfluences ?? [];
      if (!skip.length) return w;
      weights.length = w.length;
      for (let k = 0; k < w.length; k++) weights[k] = w[k];
      for (const k of skip) if (k < weights.length) weights[k] = 0;
      return weights;
    };
    const driver = slipDriver(solver, () => {
      // (worked out again only when her shapes' slip is: `shaped.version` steps then)
      if (shaped.version !== besideAt) { besideNow = beside(); besideAt = shaped.version; }
      return {
        rest: rest.array, shaped: pos.array, pushed: besideNow, shapedVersion: shaped.version, weights: weighed(),
        morph: (k, v, out) => { const a = morphs[k]; if (a) { out[0] = a.getX(v); out[1] = a.getY(v); out[2] = a.getZ(v); } else { out[0] = 0; out[1] = 0; out[2] = 0; } },
      };
    });
    return { mesh: body, driver, points: solver.points, vertices: solver.vertices, shaped, shapedSeen: -1, solvedAt: -Infinity, pending: true, plain: new Float32Array(pos.count * 3) };
  }
  /**
   * A kept slip brought up to date: her shapes' slip worked out again when her rest shape or her belly's push has
   * changed (at most once every `SLIP_SHAPE_MS` while a control is dragged, and once more when it stops), her morphs'
   * added by their weights. True when its numbers changed.
   */
  function stepSlip(k: KeptSlip): boolean {
    const g = k.mesh.geometry as THREE.BufferGeometry, pos = g.getAttribute('position') as THREE.BufferAttribute, now = performance.now();
    // (her shapes or her belly's push changed: both are written whole, and each write steps its version)
    const seen = pos.version * 65536 + ((g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined)?.version ?? 0);
    if (seen !== k.shapedSeen) { k.shapedSeen = seen; k.pending = true; }
    if (k.pending && now - k.solvedAt >= SLIP_SHAPE_MS) { k.shaped.version++; k.pending = false; k.solvedAt = now; }
    return k.driver.update(k.plain);
  }
  /**
   * HER POINTS' SLIP, kept up to date while something worn is drawn by its PLACE on her skin (`skinSlip.ts`): what the
   * shader adds to a pixel's rest place to look itself up.
   * - A designed garment's field (her bikini bottom): her slip over the garment's block, and, for a garment designed in
   *   a pose (`designPose.ts`: with her legs apart), each vertex's CARRY to that pose laid with it, its slip taken
   *   through the pose's turn there.
   * - A drawn top's cut (`topCut.ts`): about her neck (`CUT_SLIP_REACH_M`), where its neck opening's rim is looked up,
   *   her points' movement OFF HER FRAME (`skinSlip.makeFrameSlip`, `CUT_FRAME_M`): its rim stays where it was drawn
   *   about her neck and shoulders, following her build and not her bust or her belly under it -- her own shapes' and
   *   her morphs', not her pose's or her motion's (`MOTION_SHAPES`), which it rides as it rides her bones. (A shirt's
   *   hem, under its drape's band, is looked up at her rest places themselves; a hem that is the top's OWN edge -- a
   *   sports bra's, a boxy crop tee's -- where her points stand about her frame, as its rim is, so the reach goes down
   *   past it: `FabricCut.ownHem`, `CUT_SLIP_HEM_M`. Its sleeves' ends are where her arms' bones carry them: `layCutArms`.)
   * The two are laid in one attribute: where a vertex is in both regions the designed garment's stands (they do not
   * meet on her: the bottom's block ends at her waist). Nothing is done with neither on.
   */
  function laySlip(): void {
    const body = hooks.body();
    if (!body) return;
    const material = Array.isArray(body.material) ? body.material[0] : body.material;
    const g = body.geometry as THREE.BufferGeometry;
    // ---- a designed garment's
    let worn: DesignedField | null = null;
    if (fabricFieldWorn(material)) for (let i = 0; i < PAINT_LAYER_COUNT && !worn; i++) { const t = templates[i], d = t ? designedField(t.params, g.getAttribute('position').count) : null; if (d && fields.has(d.field.path)) worn = d.field; }
    if (worn && (!slip || slip.mesh !== body || slip.path !== worn.path)) {
      const rest = g.getAttribute('fabricRest') as THREE.BufferAttribute, pos = g.getAttribute('position') as THREE.BufferAttribute, index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array;
      const pad = SLIP_MARGIN_M * worn.unitsPerMetre;
      const carry = worn.carry && worn.carry.length === pos.count * 3 ? worn.carry : null;
      // her points in the garment's reach: those whose place where the garment is looked up -- in its pose -- is in its
      // block or within the margin of it. Their rest places' own box is the region her slip is worked out in.
      let lo: number[] = worn.lo.map((v) => v - pad), hi: number[] = worn.hi.map((v) => v + pad);
      if (carry && rest) {
        const R = rest.array, from = lo, to = hi;
        lo = [Infinity, Infinity, Infinity]; hi = [-Infinity, -Infinity, -Infinity];
        for (let v = 0; v < pos.count; v++) {
          const x = R[v * 3] + carry[v * 3], y = R[v * 3 + 1] + carry[v * 3 + 1], z = R[v * 3 + 2] + carry[v * 3 + 2];
          if (x < from[0] || x > to[0] || y < from[1] || y > to[1] || z < from[2] || z > to[2]) continue;
          for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], R[v * 3 + k]); hi[k] = Math.max(hi[k], R[v * 3 + k]); }
        }
      }
      const kept = index ? slipOver(body, (x, y, z) => x >= lo[0] && x <= hi[0] && y >= lo[1] && y <= hi[1] && z >= lo[2] && z <= hi[2]) : null;
      if (kept && index) {
        const own = new Uint8Array(pos.count);
        for (const v of kept.vertices) own[v] = 1;
        slip = { ...kept, path: worn.path, carry, turn: carry && poseTurns(rest.array, index, carry, worn.unitsPerMetre), unitsPerMetre: worn.unitsPerMetre, block: { lo: worn.lo, hi: worn.hi }, own };
      }
    }
    const field = worn && slip && slip.mesh === body && slip.path === worn.path ? slip : null;
    // ---- a drawn top's
    // (a top whose hem is its OWN edge -- a sports bra's, a boxy crop tee's -- looks its hem up where her points stand
    // about her frame as well (`FabricCut.ownHem`): the reach goes down past it, and is made again when one worn after
    // needs more than the last)
    const cutFrame = wornCut && frameOf?.mesh === body ? frameOf.frame : null;
    const below = cutFrame && wornCut ? Math.max(CUT_SLIP_REACH_M.below * cutFrame.unitsPerMetre, wornCut.ownHem && Number.isFinite(wornCut.cut.spec.hemY) ? cutFrame.neckY - wornCut.cut.spec.hemY + CUT_SLIP_HEM_M * cutFrame.unitsPerMetre : 0) : 0;
    if (wornCut && fabricCutWorn(material) && (cutSlip?.mesh !== body || cutSlipBelow < below)) {
      const frame = cutFrame;
      if (frame) {
        const U = frame.unitsPerMetre, R = CUT_SLIP_REACH_M, x0 = frame.mid - R.across * U, x1 = frame.mid + R.across * U, y0 = frame.neckY - below, y1 = frame.neckY + R.above * U;
        cutSlipBelow = below;
        // her frame's points: her back down to `CUT_FRAME_M.back` under the base of her neck, and all of her at it
        const map = regionMap(), behind = map ? map.forward ?? map.front : null, at = (g.getAttribute('fabricRest') as THREE.BufferAttribute).array;
        const backY = frame.neckY - CUT_FRAME_M.back * U, neckY = frame.neckY - CUT_FRAME_M.neck * U;
        const ofFrame = (v: number) => at[v * 3 + 1] > neckY || (!!behind && behind[v] < 0 && at[v * 3 + 1] > backY);
        // (without her pose's and her motion's morphs -- her raised arms' above all: what her pose does to her skin a
        // garment rides, as it rides her bones. MEASURED 2026-11-14 with them in, in her T-pose: a slip of 3.3 cm
        // somewhere about her shoulders, and her collar a centimetre further out on one side than the other)
        cutSlip = slipOver(body, (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, MOTION_SHAPES, ofFrame);
      }
    }
    const cut = wornCut && fabricCutWorn(material) && cutSlip?.mesh === body ? cutSlip : null;
    // (each is stepped: `||` would leave the second a frame behind)
    const fieldMoved = field ? stepSlip(field) : false, cutMoved = cut ? stepSlip(cut) : false;
    const key = `${body.uuid}|${field ? field.path : ''}|${cut ? 'cut' : ''}`;
    if (!fieldMoved && !cutMoved && key === slipMerged) return;
    slipMerged = key;
    // (with neither on nothing reads it: it is left as it was)
    if (!field && !cut) return;
    const target = fabricSlip(body, hooks.rest(body)), out = target.array as Float32Array;
    if (!field) out.fill(0);
    else if (field.carry && field.turn) layCarried(out, field.carry, field.turn, field.plain);
    else out.set(field.plain);
    if (cut) {
      const P = cut.plain, own = field?.own ?? null;
      for (const v of cut.vertices) { if (own && own[v]) continue; out[v * 3] = P[v * 3]; out[v * 3 + 1] = P[v * 3 + 1]; out[v * 3 + 2] = P[v * 3 + 2]; }
    }
    target.needsUpdate = true;
  }
  /**
   * EACH SLEEVE'S END, CARRIED BY HER ARM'S BONE (once a frame while a drawn top is worn). A sleeve's end is a flat cut
   * square to the bone it ends on (`topCut.sleevePlane`); laid on her rest shape, it was a flat ring only where her skin
   * rides that bone alone -- under her arm her skin is shared with her trunk, and with her arm raised the end ran back
   * toward her armpit there in teeth (MEASURED 2026-11-14 in her T-pose, a ringer's band). So the cut is taken where the
   * bone is now, and each point of her skin is measured against it at its own POSED place.
   */
  const carried = new THREE.Matrix4(), carriedNormal = new THREE.Matrix3(), carriedDir = new THREE.Vector3();
  function layCutArms(): void {
    const body = hooks.body(), worn = wornCut;
    if (!body || !worn) return;
    const material = Array.isArray(body.material) ? body.material[0] : body.material;
    if (!fabricCutWorn(material)) return;
    const f = worn.cut.frame, sleeve = worn.cut.spec.sleeve;
    const planes = f.arms.map((arm, k): readonly [number, number, number, number] => {
      const rest = sleevePlane(arm, sleeve, f.unitsPerMetre), side = k === 0 ? 'L' : 'R';
      const m = hooks.boneCarry?.(body, sleeve > arm.upper.length ? `elbow${side}` : `shoulder${side}`, carried) ?? null;
      if (!m) return rest;
      // a place p of her rest shape is carried to A p + t: the cut's direction n goes to A^-T n, and what is added to
      // a place's reach along it loses that direction's reach of t
      carriedDir.set(rest[0], rest[1], rest[2]).applyMatrix3(carriedNormal.getNormalMatrix(m));
      const e = m.elements;
      return [carriedDir.x, carriedDir.y, carriedDir.z, rest[3] - (carriedDir.x * e[12] + carriedDir.y * e[13] + carriedDir.z * e[14])];
    });
    setFabricCutArms(material, planes[0], planes[1]);
  }
  /**
   * HER SKIN'S SLIP ABOUT HER HIPS, kept up to date while a drawn bottom is worn (`pulledSlip.ts`): what the shader adds
   * to a pixel's rest place to look a waistband's line up, so the line stays a smooth one on her whatever her shapes
   * have slid her points by. It is worked out a little each frame (a third of the frame's time, and never less than a
   * few rounds): a slider dragged leaves the line a few tenths of a second behind her shape, never the frame. Its
   * numbers ride in the SHOW REGIONS overlay's attribute (`LOW_SLIP_ATTRIBUTE`): while the overlay is on they are left
   * out, and laid again when it comes off (`overlay`).
   */
  function layLowSlip(): void {
    const body = hooks.body();
    if (!body) return;
    const material = skinMaterialOf(body), g = body.geometry as THREE.BufferGeometry;
    if (!fabricLowWorn(material)) return;
    const frame = lowOf?.mesh === body ? lowOf.frame : null, map = regionMap();
    if (!frame || !map) return;
    if (painting && showingRegions) { if (lowSlip) lowSlip.laid = false; return; }
    if (lowSlip?.mesh !== body) lowSlip = lowSlipOver(body, frame, map);
    // (the attribute is there, all nothing, before anything is told: a shader reads an attribute a mesh does not have
    // as 0, 0, 0, 1 -- and a fourth number of 1 is "her skin is twice as long across her")
    const count = g.getAttribute('position').count;
    let attr = g.getAttribute(LOW_SLIP_ATTRIBUTE) as THREE.BufferAttribute | undefined;
    if (!attr || attr.itemSize !== 4 || attr.count !== count) { attr = new THREE.BufferAttribute(new Float32Array(count * 4), 4); g.setAttribute(LOW_SLIP_ATTRIBUTE, attr); if (lowSlip) lowSlip.laid = false; }
    if (!lowSlip) return;
    const out = attr.array as Float32Array, k = lowSlip, now = performance.now();
    // (her shapes or her belly's push changed: both are written whole, and each write steps its version)
    const pos = g.getAttribute('position') as THREE.BufferAttribute, seen = pos.version * 65536 + ((g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined)?.version ?? 0);
    if (seen !== k.shapedSeen) { k.shapedSeen = seen; k.shaped.version++; }
    const fresh = !k.laid;
    // (whatever else was in the attribute -- the overlay's tints -- is not her slip)
    if (fresh) out.fill(0);
    const budget = Math.max(LOW_SLIP_BUDGET_MS.least, Math.min(LOW_SLIP_BUDGET_MS.most, (now - k.at) * LOW_SLIP_BUDGET_MS.share));
    k.at = now; k.laid = true;
    if (k.driver.update(out, 4, budget, fresh) || fresh) attr.needsUpdate = true;
  }
  /** Her skin's pulled slip over her middle, ready to be kept up to date: null for a body it cannot be told on (as `slipOver`). */
  function lowSlipOver(body: THREE.Mesh, frame: LowFrame, map: BodyMap): typeof lowSlip {
    const g = body.geometry as THREE.BufferGeometry;
    const rest = g.getAttribute('fabricRest') as THREE.BufferAttribute | undefined, pos = g.getAttribute('position') as THREE.BufferAttribute, index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array;
    if (!rest || !index || !(pos.array instanceof Float32Array) || pos.normalized) return null;
    const morphs = g.morphTargetsRelative ? g.morphAttributes.position ?? [] : [];
    // her middle, from under her hip joints to under her bust, her arms' skin (which hangs beside it) left out
    const U = frame.unitsPerMetre, y0 = frame.hipY - LOW_CUT.slipUnder * U, y1 = frame.hipY + LOW_CUT.slipOver * U, R = rest.array;
    const solver = makePulledSlip(R, index, (v) => !Number.isFinite(map.arm[v]) && R[v * 3 + 1] >= y0 && R[v * 3 + 1] <= y1);
    const shaped = { version: 0 };
    // what is laid on her shapes beside them, and her morphs that are her motion's, as `slipOver` reads them
    const laid = new Float32Array(pos.count * 3);
    const beside = (): Float32Array | null => {
      const push = g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined, fields = hooks.rest(body);
      const posed = posedFields(fields);
      return besideShapes(laid, push && push.array instanceof Float32Array && push.count === pos.count ? push.array : null, posed);
    };
    let besideNow: Float32Array | null = null, besideAt = NaN;
    const skip = Object.entries((body as THREE.SkinnedMesh).morphTargetDictionary ?? {}).filter(([name]) => MOTION_SHAPES.has(name)).map(([, k]) => k);
    const weights: number[] = [];
    const weighed = (): ArrayLike<number> => {
      const w = (body as THREE.SkinnedMesh).morphTargetInfluences ?? [];
      if (!skip.length) return w;
      weights.length = w.length;
      for (let k = 0; k < w.length; k++) weights[k] = w[k];
      for (const k of skip) if (k < weights.length) weights[k] = 0;
      return weights;
    };
    const driver = pulledSlipDriver(solver, () => {
      if (shaped.version !== besideAt) { besideNow = beside(); besideAt = shaped.version; }
      return {
        rest: rest.array, shaped: pos.array, pushed: besideNow, shapedVersion: shaped.version, weights: weighed(),
        morph: (k, v, out) => { const a = morphs[k]; if (a) { out[0] = a.getX(v); out[1] = a.getY(v); out[2] = a.getZ(v); } else { out[0] = 0; out[1] = 0; out[2] = 0; } },
      };
    });
    return { mesh: body, driver, points: solver.points, vertices: solver.vertices, shaped, shapedSeen: -1, laid: false, at: performance.now() };
  }
  /**
   * EACH LEG'S TWO CUTS, CARRIED BY HER LEG'S BONES (once a frame while a drawn bottom is worn): her hip, knee and ankle
   * joints as her thigh's, her shin's and her foot's bones have them now, and her leg's measure laid from them
   * (`bottomCut.legPlanes`) -- a leg's end is then a flat ring square to the bone it is on in any pose, as a sleeve's.
   */
  const legCarried = new THREE.Matrix4(), legJoint = new THREE.Vector3();
  function layLowLegs(): void {
    const body = hooks.body(), frame = body && lowOf?.mesh === body ? lowOf.frame : null;
    if (!body || !frame) return;
    const material = skinMaterialOf(body);
    if (!fabricLowWorn(material)) return;
    const posed = (leg: LowLeg, joint: 'hip' | 'knee' | 'ankle'): readonly [number, number, number] => {
      const at = leg[joint], m = hooks.boneCarry?.(body, `${joint}${leg.name}`, legCarried) ?? null;
      if (!m) return at;
      legJoint.set(at[0], at[1], at[2]).applyMatrix4(m);
      return [legJoint.x, legJoint.y, legJoint.z];
    };
    const cuts = frame.legs.map((leg) => { const p = legPlanes(leg, { hip: posed(leg, 'hip'), knee: posed(leg, 'knee'), ankle: posed(leg, 'ankle') }); return [p.thigh, p.shin] as const; });
    setFabricLowLegs(material, cuts[0], cuts[1]);
  }
  /**
   * HOW FAR EACH LAYER'S HOOP HAS SWUNG (once a frame while a drawn bottom is worn; `bottomCut.swingOf`): the middle of
   * her front as her skin's shader has it before her bones pose her -- her points as her shape fields leave them, her
   * morphs by their weights and her belly's push -- and each under-belly waistband's swing off it, laid on its layer
   * with its surface's room (`fabricMaterial.setFabricLowSwing`); and, while one has swung, where the cloth's front
   * runs between her thighs, off her groin as it is shaped (`bottomCut.foldOf`, `setFabricLowFold`). Some hundreds of
   * points: it is told every frame, so a belly's slider dragged carries the waistband with it.
   */
  const lowSpecs: (LowSpec | null)[] = Array.from({ length: PAINT_LAYER_COUNT }, () => null), lowSwings: number[] = Array.from({ length: PAINT_LAYER_COUNT }, () => 0);
  let middleNow = new Float32Array(0), groinNow = new Float32Array(0), lowFold: number = LOW_CUT.far;
  function layLowSwing(): void {
    const body = hooks.body(), frame = body && lowOf?.mesh === body ? lowOf.frame : null;
    if (!body || !frame) return;
    const material = skinMaterialOf(body);
    if (!fabricLowWorn(material)) return;
    let told = false, swung = false;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const spec = lowSpecs[i];
      let swing = 0;
      if (spec?.hinge && frame.middle.length) {
        if (!told) { middleNow = shapedNow(body, frame.middle, middleNow); told = true; }
        swing = swingOf(frame, spec, middleNow);
      }
      lowSwings[i] = swing;
      swung ||= swing > 0;
      setFabricLowSwing(material, i, swing, roomAt(frame, swing), [foldLift(frame, swing), foldEase(swing), planeShare(spec?.hinge ?? null), spec?.hinge && spec.waist ? planeFront(frame, spec, middleNow) : 0]);
    }
    if (swung) { groinNow = shapedNow(body, frame.groin, groinNow); lowFold = foldOf(frame, groinNow); setFabricLowFold(material, lowFold); }
  }
  /** Some of her vertices as she is shaped now, before her bones pose her (xyz each; into `out` when it is the size, or a new array). */
  function shapedNow(body: THREE.Mesh, vertices: Uint32Array, out: Float32Array): Float32Array {
    const g = body.geometry as THREE.BufferGeometry, pos = g.getAttribute('position') as THREE.BufferAttribute, push = g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined;
    const morphs = g.morphTargetsRelative ? g.morphAttributes.position ?? [] : [], weights = (body as THREE.SkinnedMesh).morphTargetInfluences ?? [];
    const to = out.length === vertices.length * 3 ? out : new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      let x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      for (let k = 0; k < morphs.length; k++) { const w = weights[k] ?? 0, a = morphs[k]; if (w && a) { x += w * a.getX(v); y += w * a.getY(v); z += w * a.getZ(v); } }
      if (push && push.count === pos.count) { x += push.getX(v); y += push.getY(v); z += push.getZ(v); }
      to[i * 3] = x; to[i * 3 + 1] = y; to[i * 3 + 2] = z;
    }
    return to;
  }
  /**
   * EACH HOOP'S BAND, laid as she is shaped (once a frame while a drawn bottom is worn; `bottomCut.bandInner`): the
   * band's inner edge found on her skin -- down each of her stations' cuts from the cloth's own edge to where that edge
   * is the band's depth away -- and laid on its layer as heights on her rest skin (`fabricMaterial.setFabricLowInner`),
   * so an under-belly waistband's band is as wide on her at every size of belly. Her stations are cut once a body, the
   * first time a hoop is worn (`bandStations`). A table is told again only when what it is told from has changed: her
   * shape (her points, her morphs' weights, her belly's push), her skin's slip about her hips as it lands, the hoop's
   * swing, the cloth's front between her thighs, or the layer's own cut -- some hundreds of her points while a
   * slider is dragged (the search for each station's edge begins where it was found the frame before), nothing while
   * she stands or walks as she is.
   */
  let lowBand: { readonly mesh: THREE.Mesh; readonly stations: BandStations; readonly limb: Float32Array; readonly near: Uint32Array } | null = null;
  const lowInner: (Float32Array | null)[] = Array.from({ length: PAINT_LAYER_COUNT }, () => null), lowInnerKept = Array.from({ length: PAINT_LAYER_COUNT }, () => new Int32Array(0));
  const lowInnerSeen: ({ spec: LowSpec; pos: number; push: number; slip: number; weights: number; swing: number; fold: number } | null)[] = Array.from({ length: PAINT_LAYER_COUNT }, () => null);
  let lowBandMs = 0, lowBandTold = 0, lowStretch: Float32Array | null = null;
  const lowMoons: ([FrontMoon, FrontMoon] | null)[] = Array.from({ length: PAINT_LAYER_COUNT }, () => null);
  /** A drawn bottom's band worked out for layers `a` and `b` let go, to be worked out again where each now is. */
  function swapLowLayers(a: number, b: number): void {
    for (const k of [a, b]) { lowSpecs[k] = null; lowSwings[k] = 0; lowInner[k] = null; lowInnerSeen[k] = null; lowMoons[k] = null; lowInnerKept[k] = new Int32Array(0); }
  }
  function layLowBand(): void {
    const body = hooks.body(), frame = body && lowOf?.mesh === body ? lowOf.frame : null;
    if (!body || !frame) return;
    const material = skinMaterialOf(body);
    if (!fabricLowWorn(material)) return;
    const banded = (i: number) => { const spec = lowSpecs[i]; return spec?.waist && spec.hinge && spec.bands.waist > 0 ? spec : null; };
    let any = false;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) { if (banded(i)) any = true; else if (lowInnerSeen[i]) { lowInnerSeen[i] = null; lowInner[i] = null; lowMoons[i] = null; setFabricLowInner(material, i, null); setFabricLowMoon(material, i, null, null); } }
    if (!any) return;
    const map = regionMap(), g = body.geometry as THREE.BufferGeometry;
    const restAttr = g.getAttribute('fabricRest') as THREE.BufferAttribute | undefined, rest = restAttr && restAttr.array instanceof Float32Array ? restAttr.array : map?.rest;
    if (!map || !rest) return;
    if (lowBand?.mesh !== body) {
      const index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array;
      if (!index) return;
      const limb = limbSkin(map);
      lowBand = { mesh: body, stations: bandStations(frame, { rest, limb, index }), limb, near: foldNear(frame, rest) };
      lowInnerSeen.fill(null);
    }
    const { stations, limb, near } = lowBand;
    const pos = g.getAttribute('position') as THREE.BufferAttribute, push = g.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute | undefined, pushed = push && push.count === pos.count ? push : null;
    // (her skin's slip rides in the SHOW REGIONS overlay's attribute: while the overlay is on the shader looks a waistband up at her rest place itself, and so does this)
    const slipAttr = g.getAttribute(LOW_SLIP_ATTRIBUTE) as THREE.BufferAttribute | undefined, slip = slipAttr && slipAttr.itemSize === 4 && lowSlip?.mesh === body && lowSlip.laid && !(painting && showingRegions) ? (slipAttr.array as Float32Array) : null;
    const morphs = g.morphTargetsRelative ? g.morphAttributes.position ?? [] : [], weights = (body as THREE.SkinnedMesh).morphTargetInfluences ?? [];
    let weighed = 0;
    const active: [number, THREE.BufferAttribute | THREE.InterleavedBufferAttribute][] = [];
    for (let k = 0; k < morphs.length; k++) { const w = weights[k] ?? 0; if (w && morphs[k]) { active.push([w, morphs[k]]); weighed += w * (k + 1) + w * w; } }
    const seen = { pos: pos.version, push: pushed ? pushed.version : -1, slip: slip ? slipAttr!.version : -1, weights: weighed, fold: lowFold };
    const point: BandPoint = (v, out) => {
      let x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      for (let k = 0; k < active.length; k++) { const w = active[k][0], a = active[k][1]; x += w * a.getX(v); y += w * a.getY(v); z += w * a.getZ(v); }
      if (pushed) { x += pushed.getX(v); y += pushed.getY(v); z += pushed.getZ(v); }
      out[0] = x; out[1] = y; out[2] = z;
      out[3] = rest[v * 3] + (slip ? slip[v * 4] : 0); out[4] = rest[v * 3 + 1] + (slip ? slip[v * 4 + 1] : 0); out[5] = rest[v * 3 + 2] + (slip ? slip[v * 4 + 2] : 0);
      out[6] = limb[v]; out[7] = slip ? slip[v * 4 + 3] : 0;
    };
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const spec = banded(i);
      if (!spec) continue;
      const was = lowInnerSeen[i], swing = lowSwings[i];
      if (was && was.spec === spec && was.pos === seen.pos && was.push === seen.push && was.slip === seen.slip && was.weights === seen.weights && was.fold === seen.fold && was.swing === swing) continue;
      lowInnerSeen[i] = { spec, ...seen, swing };
      if (lowInnerKept[i].length !== stations.count) lowInnerKept[i] = new Int32Array(stations.count).fill(-1);
      // (its front moon off the cut's own edge, then its band's table and inner edge in front with the moon laid on)
      const t0 = performance.now(), bare = stationEdges(frame, spec, stations, point, swing, lowFold), moon = frontMoon(frame, bare.E, swing), front: number[] = [];
      const table = bandInner(frame, spec, stations, point, swing, lowFold, lowInnerKept[i], moon, front), inner = moon && table ? innerMoon(frame, front, moon.width) : null;
      const stretch = swing > 0 ? foldStretch(frame, near, point, swing, spec.bands.waist) : null;
      lowBandMs = performance.now() - t0; lowBandTold++;
      lowInner[i] = table; lowMoons[i] = moon && inner ? [moon, inner] : null; lowStretch = stretch;
      setFabricLowInner(material, i, table ? { line: stations, table, front: inner } : null);
      setFabricLowFoldStretch(material, stretch);
      setFabricLowMoon(material, i, moon, inner);
    }
  }
  const cached = (pick: FabricPick | null, which: 'plain' | 'trim') => (pick ? swatches.get(swatchKey(pick, which)) ?? null : null);
  function layerFor(mesh: THREE.Mesh, c: FabricChoice, pick: FabricPick | null, which: 'plain' | 'trim') {
    const texture = cached(pick, which);
    if (!pick || !texture) return null;
    const fam = fabricFamily(pick.family);
    return { texture, tile: pick.image ? IMAGE_TILE_CM * c.stitch * hooks.unitsPerCm(mesh) : tileUnits(fam, c.stitch, hooks.unitsPerCm(mesh)), opacity: opacityOf(c), roughness: fam.roughness };
  }

  /** Her pose's fields as a garment rides them (`hooks.poseRide`: a share of one at each vertex). */
  function posedFields(fields: ReturnType<FabricHooks['rest']>): { index: ArrayLike<number>; pos: ArrayLike<number>; weight: number }[] {
    return (hooks.poseFields?.() ?? []).flatMap((name) => {
      const f = fields?.fields.get(name), weight = fields?.laid?.get(name) ?? 0;
      if (!f || !weight) return [];
      const share = hooks.poseRide?.(name) ?? null;
      if (!share) return [{ index: f.index, pos: f.pos, weight }];
      // (worked out afresh each time: a field may be laid again in place)
      const out = new Float32Array(f.pos.length);
      for (let k = 0; k < f.index.length; k++) { const s = share[f.index[k]] ?? 1; out[k * 3] = f.pos[k * 3] * s; out[k * 3 + 1] = f.pos[k * 3 + 1] * s; out[k * 3 + 2] = f.pos[k * 3 + 2] * s; }
      return [{ index: f.index, pos: out, weight }];
    });
  }
  function sync(): void {
    if (disposed) return;
    const body = hooks.body();
    for (const mesh of hooks.meshes()) {
      if (mesh === body) continue;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const isTrim = material.name.endsWith('Trim'), owner = isTrim ? material.name.slice(0, -4) : material.name;
        const c = garmentChoices.get(owner);
        const l = c ? layerFor(mesh, c, isTrim ? trimPick(c) : c.fabric, isTrim ? 'trim' : 'plain') : null;
        setFabricLayer(mesh, material, 0, l, { layers: 1, masked: false, rest: hooks.rest(mesh) });
      }
    }
    if (body) {
      const material = Array.isArray(body.material) ? body.material[0] : body.material;
      const p = paint?.mesh === body ? paint : null;
      // the softening needs her detail stored and her map; it acts only where paint is, so an unpainted body is untouched
      if (p && [0, 1, 2].some((i) => p.has(i))) {
        const map = regionMap();
        if (map) { ensureRest(body.geometry as THREE.BufferGeometry, hooks.rest(body)); p.prepareDetail(map, hooks.navelHint()); }
        setDetailKeep(body, material, details.map((_, i) => keepOf(i)), { layers: PAINT_LAYER_COUNT, rest: hooks.rest(body) });
      }
      // the navel's own flattening morph follows the paint over it (the scene re-shapes her when it changes)
      const flatten = navelFlatten();
      if (Math.abs(flatten - lastFlatten) > 1e-3) { lastFlatten = flatten; queueMicrotask(() => hooks.reshape()); }
      // a DRAWN top (`topCut.ts`): the topmost layer shown whose template is one. Its cut is laid on her skin's material
      // (one at a time), and every layer shown that is cut the same way is drawn from it
      let worn: WornCut | null = null;
      const shown = (i: number) => !!p && p.has(i) && layerShown(i) && !!paintChoices[i].fabric;
      for (let i = PAINT_LAYER_COUNT - 1; i >= 0 && !worn; i--) if (shown(i) && templates[i]) worn = cutOf(templates[i]!.params);
      for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
        const c = paintChoices[i];
        // a layer shows once something is painted on it and while the editor is not hiding it: an empty or hidden
        // layer leaves her approved skin shader alone (its paint is kept)
        const l = p && p.has(i) && layerShown(i) ? layerFor(body, c, c.fabric, 'plain') : null;
        // (a one-piece is drawn by its cut only once its leg openings' field is in: a cut with no hem alone would paint her legs)
        const t = templates[i], field = l ? fieldFor(i, body) : null;
        const mine = l && worn && t && cutOf(t.params)?.key === worn.key && (!isOnePiece(t.params) || field) ? cutLayerOf(worn, c) : null;
        // a DRAWN bottom (`bottomCut.ts`): each layer whose template is one is drawn from its own waistband and legs
        // (and the catsuit's legs' ends beside its cut: `catsuitLegs`)
        const lowSpecOf = l && t ? (!mine ? lowOfParams(t.params) : isCatsuit(t.params) ? catsuitLegs(t.params) : null) : null;
        lowSpecs[i] = lowSpecOf;
        setFabricLayer(body, material, i, l ? { ...l, field, cut: mine, low: lowSpecOf ? lowLayerOf(lowSpecOf, c) : null } : null, { layers: PAINT_LAYER_COUNT, masked: true, rest: hooks.rest(body) });
      }
      wornCut = worn;
      setFabricCut(material, worn ? fabricCutOf(worn) : null);
      layCutArms();
      const lowFrameWorn = fabricLowWorn(material) && lowOf?.mesh === body ? lowOf.frame : null;
      if (lowFrameWorn) setFabricLow(material, fabricLowOf(lowFrameWorn));
      layLowLegs();
      layLowSwing();
      layLowSlip();
      layLowBand();
      laySlip();
      dressBridge(body, p);
      dressDrape(body, p);
    }
  }
  /**
   * The drape goes on with the topmost painted shirt (a template with a LENGTH) that is shown, in its fabric, down to
   * its hem; with none, or while she is being painted, it comes off.
   */
  let drape: TunicDrape | null = null;
  let shirtLength = DEFAULT_SHIRT_LENGTH;
  /** The paint layer the drape is the shirt of, and the drape fit its "hangs clear" values were last laid from. */
  let drapeLayer = -1, hangLaid = '';
  const bodyMaterial = (body: THREE.Mesh) => (Array.isArray(body.material) ? body.material[0] : body.material);
  /** The drape's "hangs clear of her" values onto her skin, whenever it has been fitted again (or taken off). */
  function layHang(): void {
    const body = hooks.body();
    if (!body) return;
    const key = drape && drapeLayer >= 0 ? `${drapeLayer}:${drape.hangVersion}` : '';
    if (key === hangLaid) return;
    hangLaid = key;
    setHang(body, bodyMaterial(body), key ? drapeLayer : -1, key ? drape!.hang : null, { layers: PAINT_LAYER_COUNT, rest: hooks.rest(body) });
  }
  function unhang(): void { drapeLayer = -1; }
  function dressDrape(body: THREE.Mesh, p: BodyPaint | null): void {
    let top = -1;
    for (let i = PAINT_LAYER_COUNT - 1; i >= 0 && top < 0; i--) {
      if (p && p.has(i) && layerShown(i) && paintChoices[i].fabric && templates[i] && templates[i]!.params.length !== null) top = i;
    }
    const map = regionMap();
    // (how much of the drape a painted shirt wears: PAINTED_SHIRT_DRAPE)
    if (PAINTED_SHIRT_DRAPE === 'off' || top < 0 || painting || !p || !map || !(body as THREE.SkinnedMesh).isSkinnedMesh) { drape?.wear(null); unhang(); layHang(); return; }
    drapeLayer = top;
    if (drape && drape.mesh.parent !== body) { drape.dispose(); drape = null; }
    if (!drape) drape = new TunicDrape(body as THREE.SkinnedMesh, map, shirtHem(map, 1));
    const c = paintChoices[top];
    // a sweater's hem is turned and ribbed, and stands a little proud; every other fabric's lies flat (Joshua, 2026-10-23);
    // seated, how far its front rides up is its fabric's stretch (Joshua, 2026-11-06)
    const family = c.fabric ? fabricFamily(c.fabric.family) : null;
    drape.wear(shirtHem(map, templates[top]!.params.length!), family?.id === 'sweater' ? HEM_LIFT_RIBBED : HEM_LIFT_FLAT, (v) => p.coverAt(v, [top]), PAINTED_SHIRT_DRAPE === 'band', family?.stretch ?? 0);
    setFabricLayer(drape.mesh, drape.mesh.material as THREE.Material, 0, layerFor(body, c, c.fabric, 'plain'), { layers: 1, masked: false, rest: null });
    drape.feathered();
  }
  function setShirtLength(length: number): void {
    shirtLength = paintedShirtLength(length);
    const p = bodyPaint(), map = regionMap();
    if (!p || !map) return;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const t = templates[i];
      if (!t || t.params.length === null || t.params.length === shirtLength) continue;
      templates[i] = { id: t.id, params: withDial(t.params, 'length', shirtLength) };
      p.setLayer(i, coverage(map, templates[i]!.params, cutOf(templates[i]!.params)?.cut ?? null));
    }
    sync(); draw(); touched();
  }
  /**
   * The cleavage bridge goes on with the topmost painted top (a template with an upper part) that is shown, in its
   * fabric, cut to its neckline; with no painted top shown, or while she is being painted, it comes off.
   */
  let bridge: CleavageBridge | null = null;
  /** The paint layer the bridge is the top of, and the bridge's "behind it" values last laid on her skin. */
  let bridgeLayer = -1, underLaid = '';
  /** (a probe's) The bridge left off, to see her painted skin alone where it would span her. */
  let bridgeOff = false;
  /** The skin behind the bridge loses its top's paint (only the outside layer is the shirt), whenever that changes. */
  function layUnder(): void {
    const body = hooks.body();
    if (!body) return;
    const key = bridge && bridgeLayer >= 0 && bridge.mesh.visible ? `${bridgeLayer}:${bridge.underVersion}` : '';
    if (key === underLaid) return;
    underLaid = key;
    setUnder(body, bodyMaterial(body), key ? bridgeLayer : -1, key ? bridge!.under : null, { layers: PAINT_LAYER_COUNT, rest: hooks.rest(body) });
  }
  /** GAME TUNING (her trunk, 0 her hip joints, 1 the base of her neck): a drawn top's neckline under this has no cleavage bridge -- a deep V or U (his sheet's V is 0.819, U 0.809). */
  const LOW_NECK_NO_BRIDGE = 0.9;
  function dressBridge(body: THREE.Mesh, p: BodyPaint | null): void {
    let top = -1;
    for (let i = PAINT_LAYER_COUNT - 1; i >= 0 && top < 0; i--) {
      if (p && p.has(i) && layerShown(i) && paintChoices[i].fabric && templates[i] && templates[i]!.params.hemFront !== null && templates[i]!.params.topFront === null) top = i;
    }
    if (top < 0 || painting || bridgeOff || !p || !(body as THREE.SkinnedMesh).isSkinnedMesh) { bridge?.wear(null); bridgeLayer = -1; layUnder(); return; }
    const map = regionMap();
    if (!map) return;
    if (bridge && bridge.mesh.parent !== body) { bridge.dispose(); bridge = null; }
    if (!bridge) bridge = new CleavageBridge(body as THREE.SkinnedMesh, map);
    bridgeLayer = top;
    const c = paintChoices[top], under = top, params = templates[top]!.params;
    // a DRAWN top's sheet is cut by its neck opening's rim as her skin is, pixel by pixel (`topCut.ts`): it spans all of
    // her cleavage, in the top's fabric with its collar's band -- in its edging's colour, when it has one
    const mine = wornCut ? cutOf(params) : null, cut = mine && wornCut && mine.key === wornCut.key ? wornCut : null;
    // (a drawn top whose neckline dips under LOW_NECK_NO_BRIDGE has none: its opening is wider than her cleavage over
    // all of the sheet but its foot, and where the sheet stood off her across the gap the rim on it and on her skin behind
    // did not meet -- MEASURED 2026-11-20 in the room, a low V and a low U (0.7 of her trunk) from her three-quarter at her
    // 10% and 73% bellies: a notch in the far side of the rim at the sheet's top, gone with the sheet left off. Seen only
    // up to a little over the neckline's lowest point, or folded down to it, the skin behind it was cut on the sheet's
    // own rows and stood across the opening in steps)
    // (nor one with a CHEST CUTOUT: the hole is cut where the sheet would stand off her across her cleavage)
    if (cut && ((params.neckFront !== null && params.neckFront < LOW_NECK_NO_BRIDGE) || params.cutout)) { bridge.wear(null); bridgeLayer = -1; layUnder(); return; }
    bridge.wear({ params, covered: (v) => p.coverAt(v, [under]), drawn: !!cut });
    const sheet = bridge.mesh.material as THREE.Material, l = layerFor(body, c, c.fabric, 'plain');
    setFabricLayer(bridge.mesh, sheet, 0, l ? { ...l, cut: cut ? cutLayerOf(cut, c) : null } : null, { layers: 1, masked: false, rest: null, cut: true });
    setFabricCut(sheet, cut ? fabricCutOf(cut) : null);
    bridge.feathered();
  }

  // ------------------------------------------------------------ strokes
  function strokeStart(x: number, y: number): void {
    const p = bodyPaint(), i = layer();
    if (!painting || tool === 'orbit' || !p || i < 0) return;
    // her rest surface (fabricRest) is what a brush radius is measured on; make sure it exists before the first dab
    ensureRest(p.mesh.geometry as THREE.BufferGeometry, hooks.rest(p.mesh));
    const v = hooks.view();
    p.beginStroke(v.camera, v.width, v.height);
    if (tool === 'region') {
      // a tap selects the region under the finger (the one nearest the camera), on that side only
      const map = regionMap(), hit = p.pick(x, y);
      p.endStroke();
      const group = map && hit >= 0 ? groupOf(map.region[hit]) : null;
      if (!map || !group) return;
      const touchedRegion = BODY_REGIONS[map.region[hit] - 1];
      p.checkpoint(i);
      p.fillRegions(i, map.region, side === 'both' && touchedRegion.side ? [map.region[hit]] : groupRegions(group, side), false);
      templates[i] = null;
      ensurePaintFabric(); refreshTargets(); touched();
      return;
    }
    p.checkpoint(i);
    templates[i] = null;
    stroking = true;
    strokeMove(x, y);
  }
  function strokeMove(x: number, y: number): void {
    const p = paint, i = layer();
    if (!stroking || !p || i < 0) return;
    const units = hooks.unitsPerCm(p.mesh);
    if (p.stroke(x, y, i, brushCm * units, tool === 'erase', undefined, { mode: LEVEL_LINE_OFFERED ? line : 'free', unitsPerCm: units }) && tool === 'brush') ensurePaintFabric();
    else sync();
  }
  let lastFlatten = 0;
  function navelFlatten(): number {
    const p = paint, body = hooks.body();
    if (!p || p.mesh !== body || p.navelVertex < 0) return 0;
    // the layer over her navel that hides most of it decides, scaled by how much of that layer is there
    let most = 0;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      if (!paintChoices[i].fabric || !p.has(i) || !layerShown(i)) continue;
      most = Math.max(most, (1 - keepOf(i).navel) * Math.min(1, p.coverAt(p.navelVertex, [i]) * 1.4));
    }
    return most;
  }
  function strokeEnd(): void { if (stroking) { stroking = false; paint?.endStroke(); refreshTargets(); touched(); } }

  // which layers the last painted outfit filled (so taking it off clears them and nothing painted by hand)
  const outfitLayers: boolean[] = Array.from({ length: PAINT_LAYER_COUNT }, () => false);
  // ...and which garments it dressed
  const outfitGarments = new Set<string>();
  function wearOutfit(layers: readonly { readonly template: string; readonly fabric: FabricPick; readonly edging?: FabricPick; readonly dials?: Readonly<Partial<Record<CoverageDial['id'], number>>>; readonly neckShape?: NeckStyle | null; readonly cutout?: CutoutParams | null }[] | null, garments: Readonly<Record<string, FabricPick | undefined>> = {}, trims: Readonly<Record<string, FabricPick | undefined>> = {}): boolean {
    const p = bodyPaint(), map = regionMap();
    if (!p || !map) return false;
    for (const name of outfitGarments) if (!garments[name]) garmentChoices.delete(name);
    outfitGarments.clear();
    for (const [name, pick] of Object.entries(garments)) if (pick) { const trim = trims[name]; garmentChoices.set(name, { ...DEFAULT_CHOICE, fabric: pick, ...(trim ? { match: false, trim } : {}) }); outfitGarments.add(name); }
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const want = layers?.[i], t = want ? COVERAGE_TEMPLATES.find((x) => x.id === want.template) : undefined;
      if (want && t) {
        // (a shirt at the room's LENGTH; and the outfit's own settings of the template's sliders, a crop tee's hem)
        let params = t.params.length !== null ? withDial(t.params, 'length', shirtLength) : t.params;
        if (want.cutout !== undefined) params = { ...params, cutout: want.cutout };
        if (want.neckShape) params = { ...params, neckShape: want.neckShape, neckFront: DRAWN_NECK[want.neckShape] };
        // (an outfit's rise on a waistband that follows her belly is a move on top of his settings; then it is laid at her belly's size)
        for (const [dial, value] of Object.entries(want.dials ?? {}) as [CoverageDial['id'], number][]) if (Number.isFinite(value)) params = withDialAt(params, dial, value, belly());
        params = followedAt(params, belly());
        templates[i] = { id: t.id, params };
        p.setLayer(i, coverage(map, params, cutOf(params)?.cut ?? null));
        // (a drawn top's bands in a colour of their own: its trim, not matched)
        paintChoices[i] = { ...DEFAULT_CHOICE, fabric: want.fabric, ...(want.edging ? { match: false, trim: want.edging } : {}) };
        details[i] = DEFAULT_LAYER_DETAIL;
        outfitLayers[i] = true;
      } else if (outfitLayers[i]) {
        p.clear(i); templates[i] = null; paintChoices[i] = DEFAULT_CHOICE; details[i] = DEFAULT_LAYER_DETAIL;
        outfitLayers[i] = false;
      }
    }
    override = AUTO_DETAIL;
    setMatch = setsMatch();
    void apply(); refreshTargets(); selectFirst();
    return true;
  }
  /** After an outfit goes on, its first piece (her top, usually) is the one selected. */
  function selectFirst(): void { const first = pieces()[0]; if (first && space !== 'paint') { target = first.target; updateView(); draw(); } }
  function clearAll(): boolean {
    const p = bodyPaint();
    if (!p) return false;
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) { p.clear(i); templates[i] = null; paintChoices[i] = DEFAULT_CHOICE; details[i] = DEFAULT_LAYER_DETAIL; outfitLayers[i] = false; }
    garmentChoices.clear(); outfitGarments.clear();
    override = AUTO_DETAIL;
    setMatch = true;
    void apply(); refreshTargets(); selectFirst(); touched();
    return true;
  }

  function clothes(): Omit<SavedClothes, 'outfit'> {
    const p = paint;
    return {
      shirtLength,
      garments: Object.fromEntries(garmentChoices),
      layers: paintChoices.map((choice, i) => {
        if (!p || !p.has(i)) return null;
        const t = templates[i];
        return { choice, detail: details[i], template: t ? { id: t.id, params: t.params } : null, mask: t ? '' : bytesToBase64(packLayer(p.weights, i)) };
      }),
      detail: override,
    };
  }
  function putOnClothes(saved: Omit<SavedClothes, 'outfit'>): boolean {
    const p = bodyPaint(), map = regionMap();
    if (!p || !map) return false;
    // (a look saved with a longer painted shirt is worn at the longest a painted shirt goes now)
    shirtLength = paintedShirtLength(saved.shirtLength);
    for (let i = 0; i < PAINT_LAYER_COUNT; i++) {
      const l = saved.layers[i] ?? null;
      if (l) {
        // (what a look saved before its template gained a field does not say is the template's own: `wornParams`)
        // (and a waistband that follows her belly, at her belly's size)
        const params = l.template ? followedAt(wornParams(l.template.id, l.template.params), belly()) : null;
        templates[i] = l.template && params ? { id: l.template.id, params } : null;
        p.setLayer(i, params ? coverage(map, params, cutOf(params)?.cut ?? null) : Float32Array.from(base64ToBytes(l.mask), (b) => b / 255));
        paintChoices[i] = l.choice;
        details[i] = l.detail;
        outfitLayers[i] = true;
      } else if (p.has(i) || templates[i]) {
        p.clear(i); templates[i] = null; paintChoices[i] = DEFAULT_CHOICE; details[i] = DEFAULT_LAYER_DETAIL; outfitLayers[i] = false;
      }
    }
    garmentChoices.clear(); outfitGarments.clear();
    for (const [k, v] of Object.entries(saved.garments)) garmentChoices.set(k, v);
    override = saved.detail ?? AUTO_DETAIL;
    setMatch = setsMatch();
    void apply(); refreshTargets(); selectFirst();
    return true;
  }

  function exportConfig(): OutfitConfig {
    const d = hooks.describe();
    return {
      version: 1, base: d.base, outfit: d.outfit,
      garments: Object.fromEntries(garmentChoices),
      paint: paintChoices.map((choice, i) => ({ choice, detail: details[i], template: templates[i], mask: paint && paint.has(i) ? bytesToBase64(packLayer(paint.weights, i)) : '' })),
    };
  }

  refreshTargets();
  return {
    element: panel,
    sync,
    refreshTargets,
    get painting() { return painting; },
    tool: () => (painting && tool !== 'orbit' ? tool : null),
    strokeStart, strokeMove, strokeEnd,
    exportConfig,
    wearOutfit,
    setMatched: () => setMatch,
    clearAll,
    navelFlatten,
    frame() { layFollow(); bridge?.update(); drape?.update(); layHang(); layUnder(); laySlip(); layCutArms(); layLowSlip(); layLowLegs(); layLowSwing(); layLowBand(); },
    slipState() {
      const body = hooks.body();
      if (!slip || slip.mesh !== body) return null;
      let longest = 0;
      for (const v of slip.vertices) longest = Math.max(longest, Math.hypot(slip.plain[v * 3], slip.plain[v * 3 + 1], slip.plain[v * 3 + 2]));
      return { points: slip.points, vertices: slip.vertices.length, solved: slip.driver.stats.solved, morphs: slip.driver.stats.morphs.slice(), longest };
    },
    slipNow() { return slip && slip.mesh === hooks.body() ? slip.plain : null; },
    busy: () => loadsOut > 0,
    hoopOn(template, shaped) {
      const body = hooks.body(), frame = lowFrameNow(), map = regionMap(), t = COVERAGE_TEMPLATES.find((x) => x.id === template);
      return body && frame && map && t && isDrawnBottom(t.params) ? hoopInside(frame, lowSpec(t.params, frame), limbSkin(map), shaped) : null;
    },
    lowState() {
      const body = hooks.body(), frame = body && lowOf?.mesh === body ? lowOf.frame : null;
      if (!body || !frame) return null;
      const k = lowSlip?.mesh === body ? lowSlip : null, attr = body.geometry.getAttribute(LOW_SLIP_ATTRIBUTE) as THREE.BufferAttribute | undefined;
      let longest = 0, narrowest = 0, widest = 0;
      if (k?.laid && attr) for (const v of k.vertices) { longest = Math.max(longest, Math.hypot(attr.getX(v), attr.getY(v), attr.getZ(v))); narrowest = Math.min(narrowest, attr.getW(v)); widest = Math.max(widest, attr.getW(v)); }
      return {
        frame: { unitsPerMetre: frame.unitsPerMetre, mid: frame.mid, hipY: frame.hipY, trunk: frame.trunk, facing: frame.facing, legs: frame.legs.map((l) => ({ name: l.name, thigh: l.thigh, shin: l.shin })), middle: frame.middle.length, groin: frame.groin.length, crease: frame.crease ? Array.from(frame.crease) : null, fold: lowFold, band: lowBand?.mesh === body ? { stations: lowBand.stations.count, cuts: lowBand.stations.a.map((a) => a.length), lean: lowBand.stations.lean, ms: lowBandMs, told: lowBandTold } : null },
        worn: fabricLowWorn(skinMaterialOf(body)),
        layers: templates.map((t, i) => { const spec = t && paint?.has(i) && layerShown(i) && paintChoices[i].fabric ? lowOfParams(t.params) : null; return spec ? { template: t!.id, waist: spec.waist, end: spec.end, start: spec.start, bands: [spec.bands.waist, spec.bands.leg, spec.bands.top], edged: !!edgingOf(paintChoices[i]), hinge: spec.hinge, reach: spec.reach, swing: lowSwings[i], inner: lowInner[i] ? Array.from(lowInner[i]!) : null, stretch: lowStretch ? Array.from(lowStretch, (k) => +k.toFixed(3)) : null, moon: lowMoons[i] ? { width: lowMoons[i]![0].width, fill: lowMoons[i]![0].fill, edge: Array.from(lowMoons[i]![0].table), inner: Array.from(lowMoons[i]![1].table) } : null } : null; }),
        slip: k ? { points: k.points, vertices: k.vertices.length, laid: k.laid, pending: k.driver.pending, solved: k.driver.stats.solved, pulled: k.driver.stats.pulled, morphs: k.driver.stats.morphs.slice(), longest, across: [narrowest, widest] } : null,
      };
    },
    bridgeLeftOff(off) { bridgeOff = off; sync(); },
    cutState(detail = false) {
      const body = hooks.body(), worn = wornCut, frame = body && frameOf?.mesh === body ? frameOf.frame : null;
      if (!body || !worn || !frame) return null;
      const k = cutSlip?.mesh === body ? cutSlip : null;
      let longest = 0, byRim = 0;
      const restAt = body.geometry.getAttribute('fabricRest') as THREE.BufferAttribute | undefined, rimY = frame.neckY - 0.16 * frame.unitsPerMetre;
      if (k) for (const v of k.vertices) { const l = Math.hypot(k.plain[v * 3], k.plain[v * 3 + 1], k.plain[v * 3 + 2]); longest = Math.max(longest, l); if (restAt && restAt.getY(v) > rimY) byRim = Math.max(byRim, l); }
      const spec = worn.cut.spec, b = bridge?.state() ?? null;
      return {
        frame: { unitsPerMetre: frame.unitsPerMetre, mid: frame.mid, neckY: frame.neckY, hipY: frame.hipY, facing: frame.facing, cols: frame.cols, rows: frame.rows, zLo: frame.zLo, zHi: frame.zHi, arms: frame.arms.map((a) => a.length) },
        cut: { style: spec.style, half: spec.half, dipY: spec.dipY, sleeve: spec.sleeve, hemY: Number.isFinite(spec.hemY) ? spec.hemY : null, bands: [spec.bands.neck, spec.bands.sleeve, spec.bands.hem] },
        layers: templates.map((t, i) => (t && cutOf(t.params)?.key === worn.key ? (edgingOf(paintChoices[i]) ? 'edged' : 'whole') : null)),
        slip: k ? { points: k.points, vertices: k.vertices.length, solved: k.driver.stats.solved, morphs: k.driver.stats.morphs.slice(), longest, byRim } : null,
        bridge: b && bridgeLayer >= 0 ? { ...b, layer: bridgeLayer } : null,
        ...(detail ? { junction: bridge && bridgeLayer >= 0 ? bridge.junction(frame.unitsPerMetre) : null } : {}),
      };
    },
    poseCarry(drawn, step) {
      const body = hooks.body();
      if (!body || !slip || slip.mesh !== body) return null;
      const g = body.geometry as THREE.BufferGeometry, rest = g.getAttribute('fabricRest') as THREE.BufferAttribute, index = hooks.skinTriangles?.(body) ?? (body.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array;
      if (!index) return null;
      const carry = settleCarry(rest.array, index, drawn, slip.plain, step, slip.unitsPerMetre);
      const back = layCarried(new Float32Array(carry.length), carry, poseTurns(rest.array, index, carry, slip.unitsPerMetre), slip.plain), off: number[] = [], near: number[] = [];
      const R = rest.array, { lo, hi } = slip.block;
      for (let i = 0; i < carry.length; i += 3) {
        if (drawn[i] === 0 && drawn[i + 1] === 0 && drawn[i + 2] === 0) continue;
        const d = Math.hypot(back[i] - drawn[i], back[i + 1] - drawn[i + 1], back[i + 2] - drawn[i + 2]);
        off.push(d);
        if ([0, 1, 2].every((k) => R[i + k] + back[i + k] > lo[k] && R[i + k] + back[i + k] < hi[k])) near.push(d);
      }
      off.sort((a, b) => a - b); near.sort((a, b) => a - b);
      const stats = (a: number[]) => ({ worst: a[a.length - 1] ?? 0, most: a[Math.floor(a.length * 0.99)] ?? 0 });
      return { carry, off: stats(off), offNear: { ...stats(near), vertices: near.length } };
    },
    reshaped() { bridge?.reshape(); drape?.reshape(); },
    setShirtLength,
    shirtLength: () => shirtLength,
    clothes,
    putOnClothes,
    pieces,
    selected: () => idOf(target),
    select,
    setSpace,
    space: () => space,
    setActive(on) { if (on === active) return; active = on; updateView(); draw(); },
    setBare(on) { if (on === bare) return; bare = on; sync(); },
    setLowerBare(on) { if (on === lowerBare) return; lowerBare = on; sync(); },
    coversLower() { return templates.some((t) => !!t && LOWER_KINDS.includes(pieceKind(t.id) ?? 'top')); },
    detail: () => override,
    garmentDetail,
    setDetail: setDetailValue,
    vulvaKeep: () => override.vulva ?? autoDetail('vulva')?.keep ?? DEFAULT_VULVA_KEEP,
    detailControl() { const e = detailControl(); drawDetail(); return e; },
    wearsShirt: () => !!paint && templates.some((t, i) => !!t && t.params.length !== null && paint!.has(i) && !!paintChoices[i].fabric),
    dispose() {
      bridge?.dispose(); bridge = null;
      drape?.dispose(); drape = null;
      garmentChoices.clear();
      paintChoices.fill(DEFAULT_CHOICE);
      if (paint) for (let i = 0; i < PAINT_LAYER_COUNT; i++) paint.clear(i);
      try { sync(); } catch { /* her meshes may already be released */ }
      disposed = true;
      for (const t of swatches.values()) t.dispose();
      swatches.clear();
      for (const t of fields.values()) t.dispose();
      fields.clear();
      for (const t of cutTextures.values()) t.dispose();
      cutTextures.clear(); cuts.clear(); wornCut = null;
      slip = null; cutSlip = null; lowSlip = null; lowOf = null; lowBand = null; limbLaid = null;
    },
  };
}
