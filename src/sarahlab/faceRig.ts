/**
 * HER FACE, AS A SHADER LAYER (Joshua, 2026-10-24, of Sarah v2 in the Sarah Lab: "would like to somehow add bones in
 * or something around the mouth to open and close like talking, and maybe the illusion of the eyes being able to look
 * around in sync").
 *
 * Her body (`models/sarah-v2-body-slim.glb`, material `Material_0`) is the approved file and it does not change. It is
 * a closed sculpt: the mouth is fused shut, with no opening and nothing behind it; the eyes are blank statue eyes; the
 * brows are faint paint; there is no jaw bone and no face morph. So there is nothing in the file to animate, and adding
 * it would mean a new file. Instead the face is drawn ON her, by a patch to her body material, from where each point of
 * her stands at REST:
 *
 *  - THE JAW opens in the vertex stage. Every vertex carries a seam weight worked out from its rest position (the
 *    `position` attribute: no morph target touches her head, which the file is tested for), 1 on the chin and the lower
 *    lip, 0 on the upper lip and everything above, a sharp half-degree step across the lips and a soft nine-degree one
 *    across the cheeks. Near the corners of the mouth a taper takes some of that back, so the lower lip opens less
 *    toward the commissures and the mouth opens as a lens rather than a box; 8 mm under the seam the taper is gone, so
 *    the lip's body and the chin move wholly. An open jaw turns each vertex about a hinge in front of her ear by the jaw
 *    times its weight, before skinning, so the posed head carries it. Its normal turns with it.
 *  - THE MOUTH'S INSIDE is the lips' own surface. The lips are one sheet, so an open jaw stretches the triangles across
 *    the seam into a curtain. What is painted on it is decided from where each point ACTUALLY IS once the jaw has
 *    opened, against the lips' edges worked out ANALYTICALLY -- the upper lip's edge is the seam, the lower lip's is the
 *    seam carried down by the jaw -- and never from the triangles: the file's own seam vertices carry weights anywhere
 *    from a quarter to six tenths, and anything read off the interpolated weight followed their zigzag (Joshua's first
 *    look at it, 2026-10-24, read as stripes and cracks). So every edge in there is a smooth curve: a lens-shaped dark
 *    opening, red only along the lips' wet inner edge, darkest in the middle, an off-white row of upper teeth that rounds
 *    off toward the corners, and a fainter lower row once the jaw is well open. The interpolated weight is still read,
 *    but only to tell the curtain from a lip's own surface, where it is exactly 0 or 1.
 *  - THE EYES are an almond between the corners painted on her texture, and behind it a virtual eyeball: the fragment
 *    is projected onto a sphere set behind the opening, and the gaze decides where on that sphere the iris and pupil
 *    are. Turning the gaze moves them across the eye; the surface itself never moves. A blink brings the upper lid down
 *    to the lower one, with her own skin showing as the lid. Lashes ride the lid's edge.
 *  - THE BROWS are a band along a curve through head, arch and tail, rounded and a little squared at the head and
 *    tapering to a point at the tail, filled with hairs: short segments rooted in a jittered grid, each with its own
 *    length, lean and darkness, so there is no lattice to see close up, and a tone between them that fills in as the
 *    hairs grow smaller than a pixel, so the brow keeps its weight from across the room. THE LIPS are a tint over the
 *    lips' shape. The eye is wet and smooth -- her skin's normal map is taken off it, and off the mouth's inside --
 *    the lips a little glossy, the mouth's inside matte.
 *
 * Her rest frame, MEASURED from the file: the geometry's units are not metres, and `rest = FACE_REST_SCALE * position +
 * FACE_REST_OFFSET` is bone 0's world matrix times its inverse bind matrix (it has no rotation; the head bone's is the
 * same). In rest metres her feet are at y = 0, she faces +z, +y is up and +x is HER LEFT. Every constant below is in
 * rest metres, as measured; inside the shader the work is done in FACE coordinates, `rest - FACE_ORIGIN`, so the
 * numbers stay small enough for a mediump fragment shader on a phone, and each constant is converted once, here.
 *
 * The patch follows `clothNeckline.ts`'s and `fabricMaterial.ts`'s pattern and lives alongside the fabric's on the same
 * body material, in either order: it chains onto whatever `onBeforeCompile` and `customProgramCacheKey` the material
 * already has, keeps every `#include` token it hooks so the others can still find them, is applied once per material,
 * and every later change is a uniform value. It starts OFF, and with it off (`setFaceRig(material, null)`) every line of
 * it, the jaw included, sits behind a switch, so the material draws exactly as unpatched.
 *
 * The CPU mirrors at the bottom (`faceJawSeam`, `faceJawWeight`, `faceJawMove`, `faceMouthEdges`, `faceMouthSample`,
 * `faceMouthInterior`, `faceEyeRegion`, `faceBrowAlpha`, `faceBrowLine`, `faceLipAlpha`) are the shader's formulas worked in JavaScript, formula for formula, from the same constants, so
 * a test or a probe can say what the shader draws without a GPU. The GLSL is generated from those constants too: there
 * is one table, not two kept in step. `faceMotion.ts` is what moves the face; this file only draws it.
 */
import * as THREE from 'three';

export type V3 = readonly [number, number, number];

// ------------------------------------------------------------------------------------------------------------------
// Her rest frame (MEASURED from `models/sarah-v2-body-slim.glb`)

/** Geometry units to her rest metres: `rest = FACE_REST_SCALE * position + FACE_REST_OFFSET` (bone 0's world × inverse bind; no rotation). */
export const FACE_REST_SCALE = 0.89974678;
/** See `FACE_REST_SCALE`. Metres. */
export const FACE_REST_OFFSET: V3 = [0, 0.8002533, -0.0340415];
/** The shader works in `rest - FACE_ORIGIN`, a point between her eyes and her mouth, so its numbers stay small. */
export const FACE_ORIGIN: V3 = [0, 1.55, -0.02];
/** The head bone: what `restFromWorld` reads her pose through. Her face is weighted to it, its unposed child `Bone_015` and a little of the neck. */
export const FACE_HEAD_BONE = 'Bone_016';
/** MEASURED: the top of her head, the bottom of her chin and the tip of her nose, rest metres. Her face's midline is x = 0. */
export const FACE_HEAD = { top: 1.70, chin: 1.4855, noseTip: [0, 1.547, 0.0293] as V3 } as const;
/** The fragment stage does nothing outside this box (rest metres): |x| below `halfWidth`, y between `yFrom` and `yTo`, z above `zFrom`. */
export const FACE_BOX = { halfWidth: 0.075, yFrom: 1.48, yTo: 1.63, zFrom: -0.04 } as const;

// ------------------------------------------------------------------------------------------------------------------
// The mouth and the jaw (MEASURED)

/**
 * Where her lips meet: the seam is flat across at `seamY`, `seamZ` deep at the middle, out to the corners at
 * ±`cornerX`. The upper lip's red runs up to about `upperTop` at the middle and the lower lip's down to `lowerBottom`.
 */
export const FACE_MOUTH = {
  seamY: 1.5188, seamZ: 0.0107,
  cornerX: 0.024, cornerY: 1.518, cornerZ: -0.004,
  upperTop: 1.528, lowerBottom: 1.508,
} as const;
/** The jaw's hinge, in front of her ears; the jaw turns about the x axis through it. Rest metres. */
export const FACE_JAW_HINGE: V3 = [0, 1.5620, -0.0720];
/** The jaw fully open (jaw = 1), radians: about 14 degrees. */
export const FACE_JAW_MAX = 0.24;
/**
 * The jaw weight's shape. Measured as angles about the hinge, `phi = atan(q.y, q.z)` with `q = rest - hinge`: the seam's
 * angle runs from the middle's to the corners' as (|x| / cornerX)², and the step across it is `lipsDelta` radians either
 * side across the lips (0.5°) widening to `cheekDelta` (9°) across the cheeks, between |x| `deltaFrom` and `deltaTo`.
 * `lowFrom..lowTo` fades it out under the chin toward the throat, `backFrom..backTo` (on q.z, metres) leaves nothing
 * behind the hinge, `neckFrom..neckTo` (rest y) keeps the neck still, and nothing past |x| `halfWidth` moves.
 */
export const FACE_JAW = {
  lipsDelta: 0.009, cheekDelta: 0.16, deltaFrom: 0.018, deltaTo: 0.034,
  lowFrom: -1.31, lowTo: -0.87,
  backFrom: -0.002, backTo: 0.012,
  neckFrom: 1.455, neckTo: 1.478,
  halfWidth: 0.075,
} as const;
/**
 * The corner taper (2026-10-24, the second pass): within `depth` below the seam the jaw weight is scaled by 1 out to
 * |x| `innerX`, easing down to `corner` at |x| `outerX` (the commissure) and held there beyond; `depth` below the seam it
 * is back to the whole weight, so the lip's body and the chin move fully. The lower lip opens less toward the corners.
 */
export const FACE_MOUTH_TAPER = { innerX: 0.010, outerX: 0.024, corner: 0.35, depth: 0.008 } as const;
/**
 * The mouth's inside, painted on the curtain an open jaw stretches across the seam, from where each point is once the
 * jaw has opened (posed rest metres), against the analytic lip edges:
 *  - the LENS: in each column the dark opening spans the middle (1 - (|x| / lensHalfWidth)^lensPower)^½ of the gap
 *    between the lips, all of it at the middle and closing to a point at the commissures; its edge is `edge` soft, in
 *    metres measured across the edge (not along the column), and it is drawn only in front of z `zFrom`, only once the
 *    jaw is open past `jawFrom..jawTo`, and only on the curtain (interpolated seam weight past `curtain`);
 *  - COLOUR: `red` within `redFrom..redTo` of the lens's edge (the lips' wet inner edge), `dark` beyond, shaded down to
 *    `deepShade` from `deepFrom` to `deepTo` in; and OUTSIDE the lens, on the curtain only and for `rim` beyond its
 *    edge, `lipInner`, so the lips' texture stretched across the gap never shows its streaks -- a rim that fades out
 *    over the last `rimTip` before the commissures, so the lens alone makes the corners, and below the lens fades out as
 *    the seam weight runs `rimLowFade` toward the lower lip's own surface, so it meets that lip in a blend rather than
 *    along a triangle's edge (above the lens it is held to the curtain test's own edge: that is where the stretched
 *    texture streaks, and fading it there too brought the streaks back);
 *  - TEETH, `teeth`: the upper row from `from` to `to` below the upper lip's edge out to |x| `halfWidth`, its lower edge
 *    rising toward the corners, there only once the gap at that column passes `opensFrom..opensTo`; the lower row the
 *    same above the lower lip's edge, `share` strong; each band `toothEdge` soft, shaded to `toothShade.edge` along its
 *    edges and to `toothShade.corner` toward the corners.
 */
export const FACE_MOUTH_INSIDE = {
  zFrom: -0.012,
  lensHalfWidth: 0.024, lensPower: 4, edge: 0.0003, slopeStep: 0.0002,
  jawFrom: 0.02, jawTo: 0.08,
  curtain: [0.005, 0.03, 0.97, 0.995] as const,
  red: [0.42, 0.17, 0.16] as V3, dark: [0.05, 0.02, 0.02] as V3, teeth: [0.78, 0.75, 0.68] as V3,
  lipInner: [0.50, 0.24, 0.22] as V3, rim: 0.0025, rimTip: 0.004, rimLowFade: [0.75, 0.97] as const,
  redFrom: 0.0003, redTo: 0.0011,
  deepFrom: 0.0015, deepTo: 0.005, deepShade: 0.55,
  upperTeeth: { from: 0.0004, to: 0.0026, halfWidth: 0.016, opensFrom: 0.0012, opensTo: 0.0018, share: 1 },
  lowerTeeth: { from: 0.0003, to: 0.0016, halfWidth: 0.014, opensFrom: 0.0035, opensTo: 0.0045, share: 0.5 },
  toothEdge: 0.0002,
  toothShade: { edge: 0.80, edgeWidth: 0.0006, corner: 0.75, cornerFrom: 0.004 },
} as const;

// ------------------------------------------------------------------------------------------------------------------
// The eyes (MEASURED from her texture's painted lid lines; tunable)

interface EyeTable {
  /** The almond's inner and outer corners, (x, y) rest metres. */
  readonly inner: readonly [number, number];
  readonly outer: readonly [number, number];
  /** The virtual eyeball's centre, rest metres. */
  readonly centre: V3;
}
/**
 * Each eye's opening is an almond between its corners: with u = -1 at the inner corner and +1 at the outer, and base(u)
 * the straight line between the corners' heights, the upper lid stands `upperLid`·(1 - u²) above it and the lower lid
 * `lowerLid`·(1 - u²) below, with an `edge`-wide soft edge. Behind each opening is a sphere of `radius`, the iris
 * `iris` across it (as a radius on the sphere) and the pupil, by default, `pupil`. Nothing is drawn behind z `zFrom`.
 */
export const FACE_EYES: { readonly right: EyeTable; readonly left: EyeTable; readonly upperLid: number; readonly lowerLid: number; readonly edge: number; readonly radius: number; readonly iris: number; readonly pupil: number; readonly zFrom: number } = {
  right: { inner: [-0.0160, 1.5806], outer: [-0.0450, 1.5835], centre: [-0.0302, 1.5835, -0.0115] },
  left: { inner: [0.0160, 1.5808], outer: [0.0460, 1.5834], centre: [0.0305, 1.5835, -0.0115] },
  upperLid: 0.0059, lowerLid: 0.0046, edge: 0.00025,
  radius: 0.0117, iris: 0.0058, pupil: 0.0019,
  zFrom: -0.02,
};
/** The virtual eyeballs' centres, rest metres (what `faceMotion.ts` aims from). */
export const FACE_EYE_CENTRES: { right: [number, number, number]; left: [number, number, number] } = {
  right: [...FACE_EYES.right.centre],
  left: [...FACE_EYES.left.centre],
};
/**
 * The blink and the lashes. Shut, the upper lid rests `blinkGap` above the lower one, and the eye is gone once the two
 * stand no more than `closeFrom` apart (fully drawn from `closeTo`). Upper lashes are a band `lash` thick (plus
 * `lashOuter` toward the outer corner) along the lid's edge, flicking past the outer corner for `flick` of u and rising
 * `flickRise` over it; lower lashes a `lowerLash` band under the lower lid from u `lowerFrom`. `feather` softens both.
 */
export const FACE_LIDS = {
  blinkGap: 0.0003, closeFrom: 0.0003, closeTo: 0.0006,
  lash: 0.0007, lashOuter: 0.0006, lashAlpha: 0.9,
  flick: 0.18, flickRise: 0.0012,
  lowerLash: 0.00035, lowerAlpha: 0.45, lowerFrom: -0.6,
  feather: 0.00012,
  lidShade: 0.10, shadow: 0.0012, shadowShade: 0.35,
} as const;

// ------------------------------------------------------------------------------------------------------------------
// The brows and the lips (tunable)

/**
 * Each brow is a band along a quadratic curve through `head`, `arch` and `tail` (|x|, y rest metres), `thickness` thick
 * at the three, its lower edge `edgeLow` soft and its upper `edgeHigh`. It ENDS at the head `headEnd` along the curve
 * from the head point, rounded and a little squared off (a superellipse of power `headPower` over `headRound`), and at
 * the tail narrows to a point from s `tailFrom` to `tailEnd` (s is 0 at the head point, 1 at the tail point). `alpha`
 * at amount 1. Nothing behind z `zFrom`.
 *
 * `hairs`: one hair per `cell` of a grid along and across the brow, rooted at a random point in it, with a probability
 * `density.base`, more along the lower edge (`density.lower`) and at the head (`density.head`); `lengthMin..lengthMax`
 * long, `halfWidth` wide tapering to its tip, leaning `lean[0]` (radians from along the brow) at the head to `lean[1]`
 * at the tail, give or take `leanJitter`, its darkness ±`dark`. A fragment looks back along the lean through `reach`
 * rows (or columns) of the grid and `side` cells to either side in each, for the hairs that reach it ((2·side + 1) ·
 * (reach + 1) lookups, 45, on brow pixels only). Between hairs the brow is `fill[1]` strong close up, rising to
 * `fill[0]` as a hair falls under a pixel, and `fillShade` lighter than a hair; hairs reach `overhang` past the band's
 * edges, so its outline is hair and not a cut.
 */
export const FACE_BROWS = {
  head: [0.0140, 1.6010] as const, arch: [0.0330, 1.6070] as const, tail: [0.0500, 1.6025] as const,
  thickness: [0.0048, 0.0036, 0.0013] as const,
  edgeLow: 0.0006, edgeHigh: 0.0010,
  headEnd: -0.0006, headRound: 0.0022, headPower: 2.6,
  tailFrom: 0.80, tailEnd: 1.08,
  alpha: 0.85,
  /**
   * LINEAR, as every colour the shader reads (three works in linear light): the dark auburn brown sRGB (0.24, 0.12,
   * 0.07). Read as linear those same numbers display as a mid tan, which is what made the first brows pale.
   */
  colour: [0.047, 0.0134, 0.006] as V3,
  hairs: {
    cell: 0.00045, reach: 8, side: 2, halfWidth: 0.000035, lengthMin: 0.0015, lengthMax: 0.0035,
    lean: [1.35, 0.12] as const, leanJitter: 10 * Math.PI / 180, dark: 0.15,
    density: { base: 0.45, lower: 0.35, head: 0.3, max: 0.95 },
    fill: [1.0, 0.35] as const, fillShade: 1.05, overhang: 0.0008,
  },
  zFrom: -0.03,
} as const;
/**
 * The lips: across |x| up to `halfWidth`, the upper lip `upper` tall at its fullest (less a 12% dip, `bowWidth` wide, at
 * the cupid's bow) and the lower `lower` deep, from the seam, with a `soft` edge, tinted toward `tint`. Not behind z `zFrom`.
 */
export const FACE_LIPS = {
  halfWidth: 0.024, upper: 0.0095, upperPower: 2.2, bowDip: 0.12, bowWidth: 0.0028,
  lower: 0.0100, lowerPower: 0.85, soft: 0.0007,
  tint: [0.93, 0.70, 0.68] as V3,
  zFrom: -0.012,
  /**
   * A CHOSEN colour (`FaceRigState.lipTint`, 2026-11-14) is not laid as her own tint is. Her own multiplies her skin, and a
   * multiplier can only darken toward itself: no number makes a pale skin a red, a berry or a nude by multiplying it. So a
   * chosen colour REPLACES her skin's colour on her lips, keeping her lips' own light and dark: her skin's linear
   * luminance there over `skinLuminance` (MEASURED: the mean over her lips' shape of the EVEN skin's picture,
   * `scripts/preview/face.mts`), held to `shade`. It is whole at an amount of `paintFull` (GAME TUNING: the room's
   * default amount, 0.55, lays a chosen colour as itself; less fades it toward her skin).
   */
  skinLuminance: 0.372, shade: [0.75, 1.2] as const, paintFull: 0.55,
} as const;
/** What the face looks like: the colours that are not settings, and the roughness of the wet eye, the lips and the mouth. */
export const FACE_LOOK = {
  sclera: [0.92, 0.88, 0.85] as V3, scleraCorner: [0.88, 0.80, 0.76] as V3, caruncle: [0.78, 0.54, 0.52] as V3,
  pupil: [0.04, 0.03, 0.03] as V3,
  /**
   * The iris's inner amber and its dark limbal ring, as given for the default base; with another base (`iris` alone) both
   * scale with it. A CHOSEN eye colour gives its own (`irisAmber`, `irisRing`: `faceLook.ts` `irisPalette`), since a dark
   * brown scaled by these went to a near-black disc round a black pupil.
   */
  amber: [0.54, 0.42, 0.22] as V3, limbal: [0.16, 0.16, 0.10] as V3,
  fibres: 48, fibreContrast: 0.12,
  lash: [0.11, 0.07, 0.06] as V3,
  wetRoughness: 0.12, lipRoughness: 0.45, insideRoughness: 0.6,
} as const;
/** What the optional parts of a `FaceRigState` default to. */
export const FACE_DEFAULTS = {
  pupil: 0.0019, iris: [0.40, 0.43, 0.24] as V3, brow: 1, browColour: FACE_BROWS.colour, lips: 0.55, lashes: 1,
} as const;
/** The pupil's radius is held within these, metres (below the iris's). */
export const FACE_PUPIL_RANGE = [0.0005, 0.005] as const;

// ------------------------------------------------------------------------------------------------------------------
// A body's face (Joshua, 2026-11-21, of the male base model: "Let's work on hair, face, and eye options for the male
// model now"): the face above is HERS, measured on her sculpt and drawn in her rest metres. Another body wears the same
// design through a FRAME that takes its geometry into her rest metres -- fitted to her face, so her eyes, brows and
// mouth fall on his -- with its own brows, lips and lashes where they differ.

/** Numbers widened from their literal types, so another body's design can hold other numbers. */
type Wide<T> = T extends number ? number : T extends string ? string : T extends readonly (infer U)[] ? readonly Wide<U>[] : { readonly [K in keyof T]: Wide<T[K]> };
/**
 * How a body's geometry is taken into the face's design frame (her rest metres): `rest = scale · turnX(pitch) · position
 * + offset`, a turn of `pitch` radians about x (the jaw's own axis, so the jaw turns the same in both). `headBone` is the
 * bone its face rides (`restFromWorld`).
 */
export interface FaceFrame { readonly id: string; readonly scale: number; readonly pitch: number; readonly offset: V3; readonly headBone: string }
/** A body's face: its frame, and its brows, lips, lashes and defaults (hers, or its own); a beard's design if it has one. */
export interface FaceSpec {
  readonly frame: FaceFrame;
  readonly brows: Wide<typeof FACE_BROWS>;
  readonly lips: Wide<typeof FACE_LIPS>;
  readonly lids: Wide<typeof FACE_LIDS>;
  readonly defaults: Wide<typeof FACE_DEFAULTS>;
  /** Facial hair (his: `maleFace.ts`); absent, none is ever drawn and nothing of it is in the program. */
  readonly beard?: BeardDesign;
}

/** The kinds of facial hair (`BeardDesign.styles`): 'none' draws nothing. */
export const BEARD_STYLE_IDS = ['none', 'stubble', 'short', 'full', 'mustache', 'goatee'] as const;
export type BeardStyleId = typeof BEARD_STYLE_IDS[number];
/** One kind of facial hair: which areas it covers (0..1 each), how far its edges are grown, and its hair. */
export interface BeardStyle {
  /** The cheeks, jaw, chin and upper lip down to the neckline; the upper lip alone; the chin and round the mouth. */
  readonly full: number; readonly mustache: number; readonly chin: number;
  /** 0..1: its cheek line raised and its neckline lowered by `BeardDesign.grow`'s. */
  readonly grow: number;
  /** How solid the hair is between the drawn hairs (0..1), a hair's length and its grid's cell (metres), the share of cells with a hair. */
  readonly fill: number; readonly length: number; readonly cell: number; readonly density: number;
  /** 0..1: how much its fill is broken into grain (stubble's, most), at `BeardDesign.grainCell`. */
  readonly grain: number;
}
/**
 * FACIAL HAIR, drawn on the skin as the brows are: an AREA in her rest metres (the face's design frame) made of a cheek
 * line, a back edge in front of the ear, a neckline and, for a mustache and a goatee, the upper lip and the chin -- its
 * edges wavered by a smooth noise so they are not cut lines -- and HAIRS drawn in a chart of the lower face (a sphere's
 * angles about `chart.centre`, `chart.radius` metres to a radian), each a short stroke growing down it, the mustache's
 * leaning out from his philtrum. It is a layer on his skin: it rides his jaw, his face's shapes and his skin.
 */
export interface BeardDesign {
  readonly chart: { readonly centre: V3; readonly radius: number };
  /** The cheek line: y at |x| `inner[0]` and below (`inner[1]`), rising to `outer[1]` by |x| `outer[0]` (the sideburn). */
  readonly cheek: { readonly inner: readonly [number, number]; readonly outer: readonly [number, number] };
  /** In front of the ear: z over `low` below y `from`, over `high` from y `to`. */
  readonly back: { readonly low: number; readonly high: number; readonly from: number; readonly to: number };
  /** The neckline: the plane (in y and z) through `front` [y, z] on the midline, facing up and forward along `normal`. */
  readonly neck: { readonly front: readonly [number, number]; readonly normal: readonly [number, number] };
  /**
   * The mustache: |x| under `halfWidth`, y from `bottom` to `top` in its middle, its top coming down to `corner` over its
   * bottom at its ends (a crescent over the upper lip, not a box: square, it read as a block stuck on his lip).
   */
  readonly mustache: { readonly halfWidth: number; readonly bottom: number; readonly top: number; readonly corner: number };
  /**
   * The chin: |x| under `halfWidth` at the chin's foot and `topHalfWidth` under the lower lip, y under `top`, z over
   * `depth` (not far back under the jaw).
   */
  readonly chin: { readonly halfWidth: number; readonly topHalfWidth: number; readonly top: number; readonly depth: number };
  /** Its edges' softness and their waver (metres), the waver's cell (metres), and how far `grow` moves the cheek line up and the neckline down. */
  readonly edge: number; readonly waver: number; readonly waverCell: number; readonly grainCell: number;
  readonly grow: { readonly cheek: number; readonly neck: number };
  /** A hair's half-width at its root (metres), the hairs' darkness give or take, how much lighter the fill is than a hair, and how much a hair leans (radians: the mustache's out, the rest's). */
  readonly hair: { readonly halfWidth: number; readonly dark: number; readonly fillShade: number; readonly leanMustache: number; readonly lean: number; readonly jitter: number };
  /** Its roughness (matte), at its fullest. */
  readonly roughness: number;
  readonly styles: { readonly [K in Exclude<BeardStyleId, 'none'>]: BeardStyle };
  /** Its colour when none is chosen (LINEAR). */
  readonly colour: V3;
}
/** Her face: her own frame (no pitch) and design. */
export const HER_FACE: FaceSpec = Object.freeze({
  frame: Object.freeze({ id: 'her', scale: FACE_REST_SCALE, pitch: 0, offset: FACE_REST_OFFSET, headBone: FACE_HEAD_BONE }),
  brows: FACE_BROWS, lips: FACE_LIPS, lids: FACE_LIDS, defaults: FACE_DEFAULTS,
});
/** A body's geometry point in the face's design frame (her rest metres). */
export function faceRestOf(frame: FaceFrame, p: readonly number[]): [number, number, number] {
  const c = Math.cos(frame.pitch), s = Math.sin(frame.pitch), k = frame.scale;
  return [k * p[0] + frame.offset[0], k * (c * p[1] - s * p[2]) + frame.offset[1], k * (s * p[1] + c * p[2]) + frame.offset[2]];
}
/** ...and a direction (a move, a normal) from the design frame back into the body's geometry. */
export function faceGeometryMove(frame: FaceFrame, d: readonly number[]): [number, number, number] {
  const c = Math.cos(frame.pitch), s = Math.sin(frame.pitch), k = frame.scale;
  return [d[0] / k, (c * d[1] + s * d[2]) / k, (-s * d[1] + c * d[2]) / k];
}

// ------------------------------------------------------------------------------------------------------------------
// The setting

/** The face as the shader draws it. */
export interface FaceRigState {
  /** 0..1: how far the jaw is open (1 is `FACE_JAW_MAX`). */
  readonly jaw: number;
  /** Where each eye looks: a direction in her rest frame (normalised here). */
  readonly gazeRight: readonly [number, number, number];
  readonly gazeLeft: readonly [number, number, number];
  /** 0..1: 0 open, 1 shut. */
  readonly blink: number;
  /** The pupil's radius, metres; default 0.0019. */
  readonly pupil?: number;
  /** The iris's base colour, 0..1 each; default hazel-green (0.40, 0.43, 0.24). */
  readonly iris?: readonly [number, number, number];
  /** 0..1: how much brow; default 1. */
  readonly brow?: number;
  /** The brows' colour, LINEAR 0..1 each (as the iris's); default a dark auburn brown, sRGB (0.24, 0.12, 0.07). */
  readonly browColour?: readonly [number, number, number];
  /** 0..1: how strongly the lips are tinted; default 0.55. */
  readonly lips?: number;
  /** 0..1: how much lash; default 1. */
  readonly lashes?: number;
  /**
   * The iris's inner collar round the pupil and its limbal ring, LINEAR 0..1 each. Given (both), they are drawn as they
   * are; left out, they are the base's times the default's ratios (`FACE_LOOK.amber`, `.limbal`), exactly as before.
   */
  readonly irisAmber?: readonly [number, number, number];
  readonly irisRing?: readonly [number, number, number];
  /**
   * A CHOSEN lip colour, LINEAR 0..1 each, laid AS that colour over her lips' shape (`FACE_LIPS.skinLuminance`); left out,
   * her own tint (`FACE_LIPS.tint`) multiplies her skin exactly as before.
   */
  readonly lipTint?: readonly [number, number, number];
  /** Facial hair, on a face with a beard design (`FaceSpec.beard`): its kind, how much of it (0..1), its colour (LINEAR; absent, the design's). */
  readonly beard?: { readonly style: BeardStyleId; readonly amount?: number; readonly colour?: readonly [number, number, number] };
  /**
   * A TWO-TONE IRIS: the inner ring's own colour (LINEAR), laid round the pupil as it is; the base (`iris`) is then the
   * outer colour, and the limbal ring `irisRing` (or the base's own ratio). Absent: the collar is `irisAmber`'s, or the base's.
   */
  readonly irisInner?: readonly [number, number, number];
  /** 0..1: how far out the inner ring reaches (0.5 her own; `FACE_IRIS_SPLIT`). Another number asks for the details' program. */
  readonly irisSplit?: number;
  /** A brow's shape: arch -1..1, straight 0..1, tilt -1..1, thick -1..1 (`FACE_BROW_SHAPE`); all 0 her own. */
  readonly browShape?: { readonly arch: number; readonly straight: number; readonly tilt: number; readonly thick: number };
  /** Freckles: amount 0..1, size 0..1, colour LINEAR, and how much of each area (nose, cheeks, forehead, shoulders) 0..1. */
  readonly marks?: { readonly amount: number; readonly size: number; readonly colour: readonly [number, number, number]; readonly areas: readonly [number, number, number, number] };
  /** The face's details, 0..1 each: eyelid crease, deep-set socket's shade, smile lines, philtrum (`FACE_DETAIL`). */
  readonly detail?: { readonly crease: number; readonly socket: number; readonly smile: number; readonly philtrum: number };
}

/** A state reduced to what both the shader and the CPU read: every amount clamped, every direction unit. */
interface Setting {
  readonly jaw: number;
  readonly gazeRight: V3;
  readonly gazeLeft: V3;
  readonly blink: number;
  readonly pupil: number;
  readonly iris: V3;
  readonly brow: number;
  readonly browColour: V3;
  readonly lips: number;
  readonly lashes: number;
  /** null: the base's ratios (her own way). */
  readonly irisAmber: V3 | null;
  readonly irisRing: V3 | null;
  /** null: her own tint. */
  readonly lipTint: V3 | null;
  /** null: none. */
  readonly beard: { readonly style: BeardStyle; readonly amount: number; readonly colour: V3 } | null;
  /** The inner ring's reach (`FACE_IRIS_SPLIT`: 0.5 her own). */
  readonly irisSplit: number;
  /** arch, straight, tilt, thick (all 0: her own). */
  readonly browShape: readonly [number, number, number, number];
  /** null: none. */
  readonly marks: { readonly amount: number; readonly size: number; readonly colour: V3; readonly areas: readonly [number, number, number, number] } | null;
  /** crease, socket, smile, philtrum. */
  readonly detail: readonly [number, number, number, number];
}
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const amount = (x: number | undefined, fallback: number): number => (x !== undefined && Number.isFinite(x) ? clamp(x, 0, 1) : fallback);
function unit(g: readonly number[] | undefined): V3 {
  const x = g?.[0] ?? 0, y = g?.[1] ?? 0, z = g?.[2] ?? 0;
  const length = Math.hypot(x, y, z);
  return Number.isFinite(length) && length > 1e-9 ? [x / length, y / length, z / length] : [0, 0, 1];
}
function colour(c: readonly number[] | undefined, fallback: V3): V3 {
  if (!c || c.length < 3 || !c.slice(0, 3).every(Number.isFinite)) return fallback;
  return [clamp(c[0], 0, 1), clamp(c[1], 0, 1), clamp(c[2], 0, 1)];
}
function settingOf(state: FaceRigState, spec: FaceSpec = HER_FACE): Setting {
  const FACE_DEFAULTS = spec.defaults as typeof HER_FACE.defaults & { readonly iris: V3; readonly browColour: V3 }, FACE_LIPS = spec.lips as typeof HER_FACE.lips & { readonly tint: V3 };
  const pupil = state.pupil !== undefined && Number.isFinite(state.pupil) ? clamp(state.pupil, FACE_PUPIL_RANGE[0], FACE_PUPIL_RANGE[1]) : FACE_DEFAULTS.pupil;
  return {
    jaw: amount(state.jaw, 0),
    gazeRight: unit(state.gazeRight),
    gazeLeft: unit(state.gazeLeft),
    blink: amount(state.blink, 0),
    pupil,
    iris: colour(state.iris, FACE_DEFAULTS.iris),
    brow: amount(state.brow, FACE_DEFAULTS.brow),
    browColour: colour(state.browColour, FACE_DEFAULTS.browColour),
    lips: amount(state.lips, FACE_DEFAULTS.lips),
    lashes: amount(state.lashes, FACE_DEFAULTS.lashes),
    ...pickedIris(state, FACE_DEFAULTS.iris),
    lipTint: state.lipTint ? colour(state.lipTint, FACE_LIPS.tint) : null,
    beard: beardOf(state, spec),
    irisSplit: amount(state.irisSplit, 0.5),
    browShape: state.browShape ? [signed(state.browShape.arch), amount(state.browShape.straight, 0), signed(state.browShape.tilt), signed(state.browShape.thick)] : [0, 0, 0, 0],
    marks: marksOf(state),
    detail: state.detail ? [amount(state.detail.crease, 0), amount(state.detail.socket, 0), amount(state.detail.smile, 0), amount(state.detail.philtrum, 0)] : [0, 0, 0, 0],
  };
}
const signed = (x: number | undefined): number => (x !== undefined && Number.isFinite(x) ? clamp(x, -1, 1) : 0);
/** Freckles a state asks for: none unless some are on some area. */
function marksOf(state: FaceRigState): Setting['marks'] {
  const m = state.marks;
  if (!m) return null;
  const areas = [0, 1, 2, 3].map((i) => amount(m.areas[i], 0)) as unknown as readonly [number, number, number, number];
  const a = amount(m.amount, 0);
  return a > 0 && areas.some((x) => x > 0) ? { amount: a, size: amount(m.size, 0.5), colour: colour(m.colour, [0.42, 0.17, 0.07]), areas } : null;
}
/** The facial hair a state asks of a face that has a design for it (none on a face without one, or for 'none'). */
function beardOf(state: FaceRigState, spec: FaceSpec): Setting['beard'] {
  const b = state.beard, d = spec.beard;
  if (!b || !d || b.style === 'none' || !(b.style in d.styles)) return null;
  return { style: d.styles[b.style as Exclude<BeardStyleId, 'none'>], amount: amount(b.amount, 1), colour: colour(b.colour, d.colour) };
}
/** A collar and a ring are drawn only as a pair (one alone would be half of one look, half of another). */
function pickedIris(state: FaceRigState, iris: V3 = FACE_DEFAULTS.iris): { irisAmber: V3 | null; irisRing: V3 | null } {
  const base = colour(state.iris, iris);
  // (a two-tone iris: its inner ring as chosen, the base the outer colour, the limbal ring the base's own ratio's)
  if (state.irisInner) return { irisAmber: colour(state.irisInner, mul(base, AMBER_RATIO)), irisRing: state.irisRing ? colour(state.irisRing, mul(base, LIMBAL_RATIO)) : mul(base, LIMBAL_RATIO) };
  if (!state.irisAmber || !state.irisRing) return { irisAmber: null, irisRing: null };
  return { irisAmber: colour(state.irisAmber, mul(base, AMBER_RATIO)), irisRing: colour(state.irisRing, mul(base, LIMBAL_RATIO)) };
}
const mul = (a: V3, b: V3): V3 => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];

// ------------------------------------------------------------------------------------------------------------------
// The constants in the frames the shader works in, converted once

interface EyeF { readonly inner: readonly [number, number]; readonly outer: readonly [number, number]; readonly centre: readonly [number, number] }
/** The iris's amber centre and limbal ring as multiples of its base colour, so a new base recolours the whole iris. */
const AMBER_RATIO: V3 = [0, 1, 2].map((i) => FACE_LOOK.amber[i] / FACE_DEFAULTS.iris[i]) as unknown as V3;
/** Linear light's luminance (Rec. 709), what a chosen lip colour keeps of her lips' own light and dark. */
const LUMA: V3 = [0.2126, 0.7152, 0.0722];

// GLSL literals from the same numbers
const n = (x: number): string => {
  const s = Number.isInteger(x) ? x.toFixed(1) : String(x);
  return x < 0 ? `(${s})` : s;
};
const v2 = (a: readonly number[]): string => `vec2(${n(a[0])}, ${n(a[1])})`;
const v3 = (a: readonly number[]): string => `vec3(${n(a[0])}, ${n(a[1])}, ${n(a[2])})`;

// ------------------------------------------------------------------------------------------------------------------
// The shader

interface Uniforms {
  readonly faceOn: THREE.IUniform<number>;
  readonly faceJaw: THREE.IUniform<number>;
  readonly faceBlink: THREE.IUniform<number>;
  readonly faceGazeR: THREE.IUniform<THREE.Vector3>;
  readonly faceGazeL: THREE.IUniform<THREE.Vector3>;
  readonly facePupil: THREE.IUniform<number>;
  readonly faceIris: THREE.IUniform<THREE.Vector3>;
  readonly faceBrow: THREE.IUniform<number>;
  readonly faceBrowColour: THREE.IUniform<THREE.Vector3>;
  readonly faceLips: THREE.IUniform<number>;
  readonly faceLashes: THREE.IUniform<number>;
  /** rgb: the lips' tint (her own `FACE_LIPS.tint`) or a chosen colour; w: 1 for a chosen colour, laid as itself. */
  readonly faceLipTint: THREE.IUniform<THREE.Vector4>;
  /** rgb: a chosen collar; w: 1 when the iris's collar and ring are chosen, 0 for the base's ratios. */
  readonly faceIrisAmber: THREE.IUniform<THREE.Vector4>;
  readonly faceIrisRing: THREE.IUniform<THREE.Vector3>;
  /** A face with a beard design only: the areas (full, mustache, chin) and grow; fill, length, cell, density; rgb its colour, w how much (0: none). */
  readonly faceBeardArea?: THREE.IUniform<THREE.Vector4>;
  readonly faceBeardHair?: THREE.IUniform<THREE.Vector4>;
  readonly faceBeardColour?: THREE.IUniform<THREE.Vector4>;
  /** x its grain. */
  readonly faceBeardLook?: THREE.IUniform<THREE.Vector4>;
  /** The details (`FACE_MARKS`, `FACE_DETAIL`, `FACE_BROW_SHAPE`): freckles' amount, size and cell (metres); their colour and alpha; their areas; the brow's arch and tilt (metres), straightness and thickness; crease, socket, smile, philtrum; the iris's split and its softness. */
  readonly faceMarks: THREE.IUniform<THREE.Vector4>;
  readonly faceMarksColour: THREE.IUniform<THREE.Vector4>;
  readonly faceMarksAreas: THREE.IUniform<THREE.Vector4>;
  readonly faceBrowShape: THREE.IUniform<THREE.Vector4>;
  readonly faceDetail: THREE.IUniform<THREE.Vector4>;
  readonly faceIrisSplit: THREE.IUniform<THREE.Vector2>;
}
const patched = new WeakMap<THREE.Material, Uniforms>();

/**
 * WHERE A POINT OF HER SKIN IS IN HER SCULPT, WHATEVER HAS SHAPED HER SINCE. The layer is drawn by a point's place on the
 * sculpt it was measured on. Until her face could be shaped that was the point's `position`: none of her shapes, her
 * build's field or her morphs reaches her head. A shaped face (`faceShapes.ts`, laid into `position` on the CPU) moves
 * it, and the layer has to RIDE that -- a bigger eye is the eye drawn there, bigger; a lifted brow carries its brow --
 * so it reads the place her skin had before any shape: `fabricRest`, which her skin's material carries once the
 * fabric's program is on it (`fabricMaterial.ts` says so with this `#define`; the room puts that program on before it
 * shapes her face: `ensureSkinFabric`). Without it the point's `position`, as before. The test is inside `main`, after
 * every patch's own lines, so it holds whichever of the two patches was laid first.
 */
export const FACE_REST_DEFINE = 'FABRIC_REST_ATTRIBUTE';

// ------------------------------------------------------------------------------------------------------------------
// THE FACE'S DETAILS (Joshua, 2026-11-22, for GDM's Mary and John Fisher: "Freckles / skin marks in the face layer:
// amount, colour, size, area (nose, cheeks, forehead, shoulders)"; "Two-tone iris (inner ring colour + outer colour)";
// "Brow shape per character (arch height, straightness)"; "Deeper face realism: eyelid crease, deep-set eyes, smile
// lines, philtrum"). They are drawn only by a program that has them: a face asks for that program the first time a
// look uses one (`faceNeedsDetails`), and her own program and his stay the text they were until then.

/**
 * FRECKLES: spots in her rest metres (so they ride her skin, her jaw and her face's shapes, and lie where her skin is
 * whatever its shape), laid in a square grid on the plane her skin faces most there (front, side or top), a cell
 * `cell` times the freckle's size across with one freckle in it or none, each its own size, darkness and a little out
 * of round, in two layers, the second smaller and fainter, clustered by a smooth noise. (A first build laid them in a 3D
 * grid, a disc where her skin passes near each point: half the cells missed her skin, and they were too few and too
 * alike -- pictured in the room 2026-11-22.) Their AREAS are soft ellipsoids (and the shoulders a band),
 * MEASURED on her skin 2026-11-22 (`scripts/preview/body.mjs`): her nose's wings end at |x| 0.018 between 1.540 and
 * 1.548, her lower lids at 1.579, her brows' tops at about 1.61, her forehead to 1.68; the tops of her shoulders stand
 * 1.42 to 1.46 from |x| 0.06 to 0.18 (1.40 at 0.18), her neck is about 0.045 to its side. Sizes, densities and shades:
 * GAME TUNING, by eye on Joshua's reference of Mary (`claude-reference` branch, `faces/`).
 */
export const FACE_MARKS = {
  nose: { c: [0, 1.562, 0.016] as V3, r: [0.019, 0.03, 0.03] as V3 },
  /** (laid at |x|: both cheeks, high, under the eyes and across the cheekbones) */
  cheek: { c: [0.031, 1.561, 0.0] as V3, r: [0.025, 0.018, 0.034] as V3 },
  forehead: { c: [0, 1.646, 0.0] as V3, r: [0.06, 0.036, 0.055] as V3 },
  /** The shoulders: rest y eased in over y[0..1] and out over y[2..3], |x| in over x[0..1] and out over x[2..3]. */
  shoulders: { y: [1.27, 1.33, 1.43, 1.47] as const, x: [0.045, 0.075, 0.20, 0.235] as const },
  /** A freckle's diameter (metres) at SIZE 0 and 1; its cell is `cell` diameters across. */
  size: [0.0006, 0.003] as const, cell: 2.4,
  /** The cells with a freckle at AMOUNT 1, where the clusters are thickest; `cluster` (metres) the clusters' size. */
  density: 1.0, cluster: 0.011, clusterLow: 0.55,
  /** The second, smaller layer: its cell against the first's, how strongly it is laid. */
  fine: 0.62, fineAlpha: 0.65,
  /** How strongly a freckle lays its colour at its strongest. */
  alpha: 0.5,
} as const;

/**
 * THE DETAILS OF A FACE, painted as shade on the skin (a warm shadow: `tint`), each 0..1 a character:
 * - an EYELID CREASE: a line `gap` above the upper lid's edge, following it (less arched by `flatten`), from `spread[0]`
 *   to `spread[1]` of the eye's own across (-1 its inner corner, 1 its outer), a `line` wide, with the lid under it in a
 *   softer shade over `under`;
 * - DEEP-SET EYES (the shade of it: the shape is the face slider `eyeDepth`, `faceShapes.ts`): the socket between the
 *   brow and the crease, an ellipse `r` about `up` over the eye's middle line;
 * - SMILE LINES: the fold from the nose's wing (`from`, MEASURED: the wing's outer edge, |x| 0.018 at 1.546) down and out
 *   past the mouth's corner (|x| 0.024 at 1.518, `FACE_MOUTH`) to `to`, through `via` -- a line, its shadow on the
 *   mouth's side, a little light on the cheek's;
 * - the PHILTRUM: two ridges from under the nose (`top`, MEASURED: the skin under her nose turns down at about 1.533) to
 *   the upper lip's edge (`bottom`, 1.528 at |x| 0.004), `ridge` out from the middle at each, lit, the groove between them
 *   and the skin outside them shaded.
 * Places MEASURED as said; widths and shades GAME TUNING by eye on the reference.
 */
export const FACE_DETAIL = {
  crease: { gap: 0.0034, flatten: 0.35, spread: [-1.1, 1.22] as const, line: 0.00065, under: 0.0024, shade: 0.75, underShade: 0.25 },
  socket: { up: 0.0078, r: [0.021, 0.0105] as const, shade: 0.55 },
  smile: { from: [0.0190, 1.5445] as const, via: [0.0255, 1.530] as const, to: [0.0315, 1.5135] as const, line: 0.0011, shadow: 0.0035, shade: 0.45, shadowShade: 0.22, light: 0.05, fadeTop: 0.005, fadeLow: 0.009, zFrom: -0.016 },
  philtrum: { top: 1.5338, bottom: 1.5276, ridge: [0.0034, 0.0047] as const, width: 0.0008, shade: 0.35, light: 0.1, zFrom: 0.004 },
  tint: [0.62, 0.48, 0.44] as V3,
  /** The most a fragment is shaded, all details together. */
  most: 0.75,
} as const;

/**
 * A BROW'S SHAPE (each a character's, 2026-11-22): ARCH lifts its arch by up to `arch` metres (its head kept, its tail
 * keeping `tailKeep` of the lift), STRAIGHT draws it along the straight line from its head to its tail, TILT lifts its
 * tail by up to `tilt` metres, THICKNESS makes it `thick` thicker or thinner at its ends. GAME TUNING.
 */
export const FACE_BROW_SHAPE = { arch: 0.003, tilt: 0.003, thick: 0.6, tailKeep: 0.3 } as const;
/** The iris's inner ring: where the collar gives way to the outer colour, `t` from its middle (0.25 to 0.75; her own 0.5), over `soft` either side. */
export const FACE_IRIS_SPLIT = { from: 0.25, to: 0.75, soft: 0.12 } as const;

/** Whether a state asks for the face's details (and so the program that has them). */
export function faceNeedsDetails(state: Partial<FaceRigState> | null): boolean {
  if (!state) return false;
  const b = state.browShape, d = state.detail, m = state.marks;
  return (m !== undefined && m.amount > 0 && m.areas.some((a) => a > 0))
    || (b !== undefined && (b.arch !== 0 || b.straight !== 0 || b.tilt !== 0 || b.thick !== 0))
    || (d !== undefined && (d.crease > 0 || d.socket > 0 || d.smile > 0 || d.philtrum > 0))
    || (state.irisSplit !== undefined && state.irisSplit !== 0.5);
}

/**
 * The constants in the frames the shader works in, converted once for a body's face (`FaceSpec`): its frame takes its
 * geometry into the face's design frame (her rest metres) by `scale`, a turn of `pitch` about x and `offset`; its own
 * brows and lips are its spec's. Her own are worked out exactly as they always were (a pitch of 0 turns nothing).
 */
function derived(spec: FaceSpec) {
  const FACE_BROWS = spec.brows, FACE_LIPS = spec.lips;
  const FACE_REST_SCALE = spec.frame.scale, FACE_REST_OFFSET = spec.frame.offset;
  const PITCH_C = Math.cos(spec.frame.pitch), PITCH_S = Math.sin(spec.frame.pitch);
  const O = FACE_ORIGIN;
  /** `position` (geometry units) to face coordinates: `f = position * FACE_REST_SCALE + F_OFFSET`. */
  const F_OFFSET: V3 = [FACE_REST_OFFSET[0] - O[0], FACE_REST_OFFSET[1] - O[1], FACE_REST_OFFSET[2] - O[2]];
  /** The hinge in face coordinates, and in geometry units (where the vertex stage turns `transformed`). */
  const HINGE_F: V3 = [FACE_JAW_HINGE[0] - O[0], FACE_JAW_HINGE[1] - O[1], FACE_JAW_HINGE[2] - O[2]];
  const HINGE_Q: V3 = [FACE_JAW_HINGE[0] - FACE_REST_OFFSET[0], FACE_JAW_HINGE[1] - FACE_REST_OFFSET[1], FACE_JAW_HINGE[2] - FACE_REST_OFFSET[2]];
    const HINGE_G: V3 = [
      HINGE_Q[0] / FACE_REST_SCALE,
      (PITCH_C * HINGE_Q[1] + PITCH_S * HINGE_Q[2]) / FACE_REST_SCALE,
      (-PITCH_S * HINGE_Q[1] + PITCH_C * HINGE_Q[2]) / FACE_REST_SCALE,
    ];
  /** The seam's angle about the hinge at the middle and at the corners. */
  const PHI_CENTRE = Math.atan2(FACE_MOUTH.seamY - FACE_JAW_HINGE[1], FACE_MOUTH.seamZ - FACE_JAW_HINGE[2]);
  const PHI_CORNER = Math.atan2(FACE_MOUTH.cornerY - FACE_JAW_HINGE[1], FACE_MOUTH.cornerZ - FACE_JAW_HINGE[2]);
  const NECK_FROM_F = FACE_JAW.neckFrom - O[1];
  const NECK_TO_F = FACE_JAW.neckTo - O[1];
  const BOX_Y0_F = FACE_BOX.yFrom - O[1];
  const BOX_Y1_F = FACE_BOX.yTo - O[1];
  const BOX_Z_F = FACE_BOX.zFrom - O[2];
  const INSIDE_Z_F = FACE_MOUTH_INSIDE.zFrom - O[2];
  const SEAM_F = FACE_MOUTH.seamY - O[1];
  /** The seam in face coordinates: its height and depth at the middle and at the corners. */
  const SEAM_Z_F = FACE_MOUTH.seamZ - O[2];
  const CORNER_Y_F = FACE_MOUTH.cornerY - O[1];
  const CORNER_Z_F = FACE_MOUTH.cornerZ - O[2];
  const LIP_Z_F = FACE_LIPS.zFrom - O[2];
  const EYE_Z_F = FACE_EYES.zFrom - O[2];
  const BROW_Z_F = FACE_BROWS.zFrom - O[2];
  const eyeF = (e: EyeTable): EyeF => ({
    inner: [e.inner[0] - O[0], e.inner[1] - O[1]],
    outer: [e.outer[0] - O[0], e.outer[1] - O[1]],
    centre: [e.centre[0] - O[0], e.centre[1] - O[1]],
  });
  const RIGHT_F = eyeF(FACE_EYES.right);
  const LEFT_F = eyeF(FACE_EYES.left);
  const EYE_R = FACE_EYES.radius;
  const IRIS_ANGLE = Math.asin(FACE_EYES.iris / FACE_EYES.radius);
  const EDGE_HALF = FACE_EYES.edge / 2;
  const LIMBAL_RATIO: V3 = [0, 1, 2].map((i) => FACE_LOOK.limbal[i] / FACE_DEFAULTS.iris[i]) as unknown as V3;
  /** The brows' quadratics in s (0 at the head, 1 at the tail), as a + b·s + c·s², height in face coordinates and thickness. */
  const BROW_S_ARCH = (FACE_BROWS.arch[0] - FACE_BROWS.head[0]) / (FACE_BROWS.tail[0] - FACE_BROWS.head[0]);
  function quadratic(v0: number, va: number, v1: number): readonly [number, number, number] {
    // through (0, v0), (sa, va), (1, v1)
    const sa = BROW_S_ARCH;
    const c = ((va - v0) - (v1 - v0) * sa) / (sa * sa - sa);
    return [v0, (v1 - v0) - c, c];
  }
  const BROW_Y = quadratic(FACE_BROWS.head[1] - O[1], FACE_BROWS.arch[1] - O[1], FACE_BROWS.tail[1] - O[1]);
  const BROW_T = quadratic(FACE_BROWS.thickness[0], FACE_BROWS.thickness[1], FACE_BROWS.thickness[2]);
  const BROW_HEAD_X = FACE_BROWS.head[0];
  const BROW_SPAN = FACE_BROWS.tail[0] - FACE_BROWS.head[0];
  const HAIR = FACE_BROWS.hairs;
  const MI = FACE_MOUTH_INSIDE;
  const MT = FACE_MOUTH_TAPER;
  return { BOX_Y0_F, BOX_Y1_F, BOX_Z_F, BROW_HEAD_X, BROW_SPAN, BROW_S_ARCH, BROW_T, BROW_Y, BROW_Z_F, CORNER_Y_F, CORNER_Z_F, EDGE_HALF, EYE_R, EYE_Z_F, F_OFFSET, HAIR, HINGE_F, HINGE_G, HINGE_Q, INSIDE_Z_F, IRIS_ANGLE, LEFT_F, LIMBAL_RATIO, LIP_Z_F, MI, MT, NECK_FROM_F, NECK_TO_F, O, PHI_CENTRE, PHI_CORNER, RIGHT_F, SEAM_F, SEAM_Z_F };
}
// (her own, for the CPU mirrors below)
const { BOX_Y0_F, BOX_Y1_F, BOX_Z_F, BROW_HEAD_X, BROW_SPAN, BROW_T, BROW_Y, BROW_Z_F, CORNER_Y_F, CORNER_Z_F, EDGE_HALF, EYE_R, EYE_Z_F, HINGE_F, INSIDE_Z_F, IRIS_ANGLE, LEFT_F, LIMBAL_RATIO, LIP_Z_F, MI, MT, NECK_FROM_F, NECK_TO_F, O, PHI_CENTRE, PHI_CORNER, RIGHT_F, SEAM_F, SEAM_Z_F } = derived(HER_FACE);
const L = FACE_LIDS;

/** The face's shader lines for a body's face (`FaceSpec`), from the same numbers as the CPU mirrors. */
function shaderFor(spec: FaceSpec, x = false): ShaderLines {
  const FACE_BROWS = spec.brows, FACE_LIPS = spec.lips, FACE_LIDS = spec.lids;
  const FACE_REST_SCALE = spec.frame.scale;
  const { BOX_Y0_F, BOX_Y1_F, BOX_Z_F, BROW_HEAD_X, BROW_S_ARCH, BROW_SPAN, BROW_T, BROW_Y, BROW_Z_F, CORNER_Y_F, CORNER_Z_F, EDGE_HALF, EYE_R, EYE_Z_F, F_OFFSET, HAIR, HINGE_F, HINGE_G, INSIDE_Z_F, IRIS_ANGLE, LEFT_F, LIMBAL_RATIO, LIP_Z_F, MI, MT, NECK_FROM_F, NECK_TO_F, PHI_CENTRE, PHI_CORNER, RIGHT_F, SEAM_F, SEAM_Z_F } = derived(spec);
  // where a point of the sculpt stands in face coordinates, and (the jaw turned) its height: her own lines as they
  // always were; a frame with a pitch turns the point about x first
  const pc = Math.cos(spec.frame.pitch), ps = Math.sin(spec.frame.pitch), k = FACE_REST_SCALE;
  const FACE_F_OF_REST = spec.frame.pitch === 0 ? `faceRestAt * ${n(FACE_REST_SCALE)} + ${v3(F_OFFSET)}`
    : `vec3(faceRestAt.x * ${n(k)}, dot(${v2([k * pc, -k * ps])}, faceRestAt.yz), dot(${v2([k * ps, k * pc])}, faceRestAt.yz)) + ${v3(F_OFFSET)}`;
  const FACE_POSED_Y = spec.frame.pitch === 0 ? `(${n(HINGE_G[1])} + faceR.x * faceCp - faceR.y * faceSp) * ${n(FACE_REST_SCALE)} + ${n(F_OFFSET[1])}`
    : `dot(${v2([k * pc, -k * ps])}, ${v2([HINGE_G[1], HINGE_G[2]])} + vec2(faceR.x * faceCp - faceR.y * faceSp, faceR.x * faceSp + faceR.y * faceCp)) + ${n(F_OFFSET[1])}`;
  // the seam weight (`faceJawSeam` below) and the corner taper (`faceJawWeight` is their product); `f` is the rest
  // point in face coordinates
  const GLSL_JAW_WEIGHT = `
  float faceJawSeam(vec3 f) {
    float ax = abs(f.x);
    if (ax > ${n(FACE_JAW.halfWidth)}) return 0.0;
    float qy = f.y - ${n(HINGE_F[1])};
    float qz = f.z - ${n(HINGE_F[2])};
    float phi = atan(qy, qz);
    float k = min(1.0, (ax / ${n(FACE_MOUTH.cornerX)}) * (ax / ${n(FACE_MOUTH.cornerX)}));
    float phiSeam = ${n(PHI_CENTRE)} + ${n(PHI_CORNER - PHI_CENTRE)} * k;
    float delta = mix(${n(FACE_JAW.lipsDelta)}, ${n(FACE_JAW.cheekDelta)}, smoothstep(${n(FACE_JAW.deltaFrom)}, ${n(FACE_JAW.deltaTo)}, ax));
    float wSeam = 1.0 - smoothstep(phiSeam - delta, phiSeam + delta, phi);
    float wLow = smoothstep(${n(FACE_JAW.lowFrom)}, ${n(FACE_JAW.lowTo)}, phi);
    float wBack = smoothstep(${n(FACE_JAW.backFrom)}, ${n(FACE_JAW.backTo)}, qz);
    float wNeck = smoothstep(${n(NECK_FROM_F)}, ${n(NECK_TO_F)}, f.y);
    return wSeam * wLow * wBack * wNeck;
  }
  float faceJawTaper(vec3 f) {
    float ax = abs(f.x);
    float k = min(1.0, (ax / ${n(FACE_MOUTH.cornerX)}) * (ax / ${n(FACE_MOUTH.cornerX)}));
    float below = mix(${n(SEAM_F)}, ${n(CORNER_Y_F)}, k) - f.y;
    float corner = mix(1.0, ${n(MT.corner)}, smoothstep(${n(MT.innerX)}, ${n(MT.outerX)}, ax));
    return mix(corner, 1.0, smoothstep(0.0, ${n(MT.depth)}, below));
  }`;

  const VERTEX_PARS = [
    'uniform float faceOn;',
    'uniform float faceJaw;',
    'varying float vFaceJaw;',
    'varying vec3 vFaceF;',
    'varying float vFacePosedY;',
    GLSL_JAW_WEIGHT,
  ].join('\n');


  // After morphnormal_vertex, which in three's standard shader comes before begin_vertex: the weight and the angle are
  // worked out once here, at main()'s scope, and the normal turned; the point is turned after morphtarget_vertex, before
  // skinning, and where its place on her SCULPT then stands (its posed rest-frame y: the sculpt's point turned with the
  // jaw, not the shaped one, so a longer chin is not read as an open mouth) handed on. `vFaceJaw` carries the SEAM weight, untapered:
  // exactly 0 or 1 on the lips' own surfaces, so the fragment stage can tell them from the curtain. The varyings are
  // written whatever the switch says, so they are never undefined; nothing they hold reaches the picture with it off.
  const VERTEX_NORMAL = `
      float faceTheta = 0.0;
      #ifdef ${FACE_REST_DEFINE}
      vec3 faceRestAt = fabricRest;
      #else
      vec3 faceRestAt = position;
      #endif
      vFaceF = ${FACE_F_OF_REST};
      vFaceJaw = 0.0;
      vFacePosedY = vFaceF.y;
      if (faceOn > 0.5) {
        vFaceJaw = faceJawSeam(vFaceF);
        faceTheta = faceJaw * ${n(FACE_JAW_MAX)} * vFaceJaw * faceJawTaper(vFaceF);
        float faceCn = cos(faceTheta), faceSn = sin(faceTheta);
        objectNormal.yz = vec2(objectNormal.y * faceCn - objectNormal.z * faceSn, objectNormal.y * faceSn + objectNormal.z * faceCn);
      }`;
  const VERTEX_JAW = `
      if (faceOn > 0.5 && faceTheta != 0.0) {
        vec2 faceQ = transformed.yz - ${v2([HINGE_G[1], HINGE_G[2]])};
        float faceCp = cos(faceTheta), faceSp = sin(faceTheta);
        transformed.yz = ${v2([HINGE_G[1], HINGE_G[2]])} + vec2(faceQ.x * faceCp - faceQ.y * faceSp, faceQ.x * faceSp + faceQ.y * faceCp);
        vec2 faceR = faceRestAt.yz - ${v2([HINGE_G[1], HINGE_G[2]])};
        vFacePosedY = ${FACE_POSED_Y};
      }`;

  const L = FACE_LIDS;
  const GLSL_FRAGMENT_FUNCTIONS = `
  float faceHash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float faceHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

  float faceLipAlpha(vec3 f) {
    if (f.z <= ${n(LIP_Z_F)}) return 0.0;
    float t = abs(f.x) / ${n(FACE_LIPS.halfWidth)};
    if (t >= 1.0) return 0.0;
    float bow = f.x / ${n(FACE_LIPS.bowWidth)};
    float hu = ${n(FACE_LIPS.upper)} * (1.0 - pow(max(t, 1e-6), ${n(FACE_LIPS.upperPower)})) * (1.0 - ${n(FACE_LIPS.bowDip)} * exp(-bow * bow));
    float hl = ${n(FACE_LIPS.lower)} * pow(max(1.0 - t * t, 1e-8), ${n(FACE_LIPS.lowerPower)});
    float s = ${n(FACE_LIPS.soft / 2)};
    return smoothstep(${n(SEAM_F)} - hl - s, ${n(SEAM_F)} - hl + s, f.y) * (1.0 - smoothstep(${n(SEAM_F)} + hu - s, ${n(SEAM_F)} + hu + s, f.y));
  }

  // the lips' edges, analytically: the upper lip's is the seam (flat across, curving to the corners' height), the lower
  // lip's that seam point turned by the whole jaw times the corner taper, as the lower lip's own edge is
  float faceSeamK(float ax) { float k = ax / ${n(FACE_MOUTH.cornerX)}; return min(1.0, k * k); }
  float faceSeamUp(float ax) { return mix(${n(SEAM_F)}, ${n(CORNER_Y_F)}, faceSeamK(ax)); }
  float faceSeamLo(float ax, float jaw) {
    float k = faceSeamK(ax);
    float qy = mix(${n(SEAM_F)}, ${n(CORNER_Y_F)}, k) - ${n(HINGE_F[1])};
    float qz = mix(${n(SEAM_Z_F)}, ${n(CORNER_Z_F)}, k) - ${n(HINGE_F[2])};
    float th = jaw * ${n(FACE_JAW_MAX)} * mix(1.0, ${n(MT.corner)}, smoothstep(${n(MT.innerX)}, ${n(MT.outerX)}, ax));
    return ${n(HINGE_F[1])} + qy * cos(th) - qz * sin(th);
  }
  // one edge of the lens (side +1 the top, -1 the bottom): the middle of the gap between the lips, give or take the share
  // of it the lens spans in this column
  float faceLensEdge(float ax, float jaw, float side) {
    float up = faceSeamUp(ax), lo = faceSeamLo(ax, jaw);
    float q = sqrt(max(1.0 - pow(ax / ${n(MI.lensHalfWidth)}, ${n(MI.lensPower)}), 0.0));
    return 0.5 * (up + lo) + side * 0.5 * (up - lo) * q;
  }
  // how far inside the lens a posed point stands, in metres across its nearer edge (negative outside)
  float faceLensDistance(float ax, float y, float jaw) {
    float mid = 0.5 * (faceSeamUp(ax) + faceSeamLo(ax, jaw));
    float side = y > mid ? 1.0 : -1.0;
    float b0 = faceLensEdge(ax, jaw, side);
    float slope = (faceLensEdge(ax + ${n(MI.slopeStep)}, jaw, side) - b0) / ${n(MI.slopeStep)};
    return min(side * (b0 - y) / sqrt(1.0 + slope * slope), ${n(MI.lensHalfWidth)} - ax);
  }
  // how much of the mouth's inside a fragment is: on the curtain, in the lens or its rim, in front, with the jaw open
  float faceMouthAmount(float w, vec3 f, float y, float jaw, out float dist, out float gap) {
    float ax = abs(f.x);
    gap = faceSeamUp(ax) - faceSeamLo(ax, jaw);
    dist = faceLensDistance(ax, y, jaw);
    float curtain = smoothstep(${n(MI.curtain[0])}, ${n(MI.curtain[1])}, w) * (1.0 - smoothstep(${n(MI.curtain[2])}, ${n(MI.curtain[3])}, w));
    float lens = smoothstep(${n(-MI.edge / 2)}, ${n(MI.edge / 2)}, dist);
    float below = step(y, 0.5 * (faceSeamUp(ax) + faceSeamLo(ax, jaw)));
    float rim = smoothstep(${n(-MI.rim)}, ${n(-MI.rim / 2)}, dist) * (1.0 - smoothstep(${n(MI.lensHalfWidth - MI.rimTip)}, ${n(MI.lensHalfWidth - 0.0005)}, ax))
      * (1.0 - below * smoothstep(${n(MI.rimLowFade[0])}, ${n(MI.rimLowFade[1])}, w));
    return curtain * step(${n(INSIDE_Z_F)}, f.z) * max(lens, rim) * smoothstep(${n(MI.jawFrom)}, ${n(MI.jawTo)}, jaw);
  }
  // a row of teeth, d from its lip's edge: from..to at the middle, the far edge closing in toward |x| halfWidth
  float faceToothRow(float ax, float d, float gap, float from, float to, float halfWidth, float opensFrom, float opensTo, out float shade) {
    float reach = sqrt(max(1.0 - (ax / halfWidth) * (ax / halfWidth), 0.0));
    float far = from + (to - from) * reach;
    float e = ${n(MI.toothEdge)};
    shade = mix(${n(MI.toothShade.edge)}, 1.0, smoothstep(0.0, ${n(MI.toothShade.edgeWidth)}, min(d - from, far - d)))
      * mix(1.0, ${n(MI.toothShade.corner)}, smoothstep(${n(MI.toothShade.cornerFrom)}, halfWidth, ax));
    return smoothstep(from - e, from + e, d) * (1.0 - smoothstep(far - e, far + e, d)) * smoothstep(opensFrom, opensTo, gap);
  }

  vec4 faceHash42(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
  }

  // half the brow's thickness, a along it from the head point: the quadratic, rounded off at the head, pointed at the tail
  float faceBrowHalf(float a) {
    if (a <= ${n(FACE_BROWS.headEnd)}) return 0.0; // exactly nothing before the head: pow() rounds a hair's breadth past 0
    float s = a / ${n(BROW_SPAN)};
    float th = ${n(BROW_T[0])} + ${n(BROW_T[1])} * s + ${n(BROW_T[2])} * s * s;
    float capT = clamp((${n(FACE_BROWS.headEnd + FACE_BROWS.headRound)} - a) / ${n(FACE_BROWS.headRound)}, 0.0, 1.0);
    float cap = pow(max(1.0 - pow(capT, ${n(FACE_BROWS.headPower)}), 0.0), ${n(1 / FACE_BROWS.headPower)});
    float tail = clamp((${n(FACE_BROWS.tailEnd)} - s) / ${n(FACE_BROWS.tailEnd - FACE_BROWS.tailFrom)}, 0.0, 1.0);
    return 0.5 * th * cap * tail${x ? ' * faceBrowShape.w' : ''};
  }
  // the band's cover, its edges grown further out by grow (0 for the band itself, the overhang for where hairs may still show)
  float faceBrowCover(vec3 f, float grow, out float a, out float across) {
    a = abs(f.x) - ${n(BROW_HEAD_X)};
    float s = a / ${n(BROW_SPAN)};
    ${x ? 'across = f.y - faceBrowShaped(s);' : `across = f.y - (${n(BROW_Y[0])} + ${n(BROW_Y[1])} * s + ${n(BROW_Y[2])} * s * s);`}
    float hb = faceBrowHalf(a);
    return smoothstep(-hb - grow - ${n(FACE_BROWS.edgeLow / 2)}, -hb - grow + ${n(FACE_BROWS.edgeLow / 2)}, across)
      * (1.0 - smoothstep(hb + grow - ${n(FACE_BROWS.edgeHigh / 2)}, hb + grow + ${n(FACE_BROWS.edgeHigh / 2)}, across))
      * smoothstep(0.0, 0.0004, hb);
  }
  float faceBrowLean(float s) { return mix(${n(HAIR.lean[0])}, ${n(HAIR.lean[1])}, pow(clamp(s, 0.0, 1.0), 0.8)); }

  // the hairs at a point (a along the brow, c across it), each a short segment from a cell of a jittered grid: how much of
  // a hair covers it (antialiased against the pixel's size, px) and that hair's darkness. A hair grows from its root along
  // its lean, so the roots that can reach a point lie behind it along the lean. The search walks the grid's own rows (or
  // columns, whichever the lean is nearer), every one of them in turn, and in each the cells either side of where the
  // line back along the lean crosses it: stepping a cell at a time along the lean instead skips cells, and a skipped
  // root draws its hair as dashes.
  float faceBrowHairs(vec2 p, float px, out float dark) {
    float c = ${n(HAIR.cell)};
    float th = faceBrowLean(p.x / ${n(BROW_SPAN)});
    vec2 dir = vec2(cos(th), sin(th));
    bool rows = dir.y > dir.x;
    vec2 g = p / c;
    float major = rows ? g.y : g.x, minor = rows ? g.x : g.y;
    float slope = rows ? dir.x / dir.y : dir.y / dir.x;
    float best = 0.0;
    dark = 1.0;
    for (int k = 0; k <= ${HAIR.reach}; k++) {
      float line = floor(major) - float(k);
      float xing = minor - (major - (line + 0.5)) * slope;
      for (int l = -${HAIR.side}; l <= ${HAIR.side}; l++) {
        vec2 cell = rows ? vec2(floor(xing) + float(l), line) : vec2(line, floor(xing) + float(l));
        vec4 h = faceHash42(cell);
        vec2 root = (cell + h.xy) * c;
        float hb = faceBrowHalf(root.x);
        float v = root.y / max(hb, 1e-5);
        float sr = root.x / ${n(BROW_SPAN)};
        float density = min(${n(HAIR.density.base)} + ${n(HAIR.density.lower)} * (1.0 - smoothstep(-0.6, 0.4, v)) + ${n(HAIR.density.head)} * (1.0 - smoothstep(0.1, 0.45, sr)), ${n(HAIR.density.max)});
        if (hb < 0.0002 || abs(v) > 1.1 || h.z > density) continue;
        float h5 = faceHash12(cell + vec2(17.0, 31.0));
        float len = mix(${n(HAIR.lengthMin)}, ${n(HAIR.lengthMax)}, h.w);
        float ang = faceBrowLean(sr) + (2.0 * h5 - 1.0) * ${n(HAIR.leanJitter)};
        vec2 d = vec2(cos(ang), sin(ang));
        vec2 dp = p - root;
        float t = clamp(dot(dp, d), 0.0, len);
        float dist = length(dp - d * t);
        float hw = ${n(HAIR.halfWidth)} * (1.0 - 0.6 * t / len);
        float w = max(hw, 0.5 * px);
        float hit = (hw / w) * (1.0 - smoothstep(w - 0.5 * px, w + 0.5 * px, dist));
        if (hit > best) { best = hit; dark = 1.0 + ${n(HAIR.dark)} * (2.0 * fract(h5 * 13.7) - 1.0); }
      }
    }
    return best;
  }

  // one eye: its almond between the corners, the virtual eyeball behind it, the lid and the lashes
  void faceEye(vec2 p, vec2 inner, vec2 outer, vec2 centre, vec3 g, inout vec3 col, inout float wet) {
    float u = 2.0 * (p.x - inner.x) / (outer.x - inner.x) - 1.0;
    float base = mix(inner.y, outer.y, 0.5 * (u + 1.0));
    float bulge = 1.0 - u * u;
    float yUp = base + ${n(FACE_EYES.upperLid)} * bulge;
    float yLo = base - ${n(FACE_EYES.lowerLid)} * bulge;
    float yLid = mix(yUp, yLo + ${n(L.blinkGap)}, faceBlink);
    float e = ${n(EDGE_HALF)};
    float open = smoothstep(yLo - e, yLo + e, p.y) * (1.0 - smoothstep(yLid - e, yLid + e, p.y)) * smoothstep(${n(L.closeFrom)}, ${n(L.closeTo)}, yLid - yLo);
    float lid = smoothstep(yLid - e, yLid + e, p.y) * (1.0 - smoothstep(yUp - e, yUp + e, p.y)) * smoothstep(0.0, ${n(L.blinkGap)}, yUp - yLid);
    if (open > 0.0) {
      vec3 eye = mix(${v3(FACE_LOOK.sclera)}, ${v3(FACE_LOOK.sclera.map((c, i) => c * FACE_LOOK.scleraCorner[i]))}, smoothstep(0.35, 1.0, abs(u)));
      eye = mix(eye, ${v3(FACE_LOOK.caruncle)}, 1.0 - smoothstep(-0.9, -0.8, u));
      vec2 d = p - centre;
      float r2 = dot(d, d);
      if (r2 < ${n(EYE_R * EYE_R)}) {
        vec3 nrm = vec3(d, sqrt(${n(EYE_R * EYE_R)} - r2)) / ${n(EYE_R)};
        float ang = acos(clamp(dot(nrm, g), -1.0, 1.0));
        vec3 rt = cross(vec3(0.0, 1.0, 0.0), g);
        rt = dot(rt, rt) > 1e-6 ? normalize(rt) : vec3(1.0, 0.0, 0.0);
        vec3 up = cross(g, rt);
        float a = atan(dot(nrm, up), dot(nrm, rt) + 1e-6);
        float t = ang / ${n(IRIS_ANGLE)};
        vec3 iris = mix(mix(faceIris * ${v3(AMBER_RATIO)}, faceIrisAmber.rgb, faceIrisAmber.w), faceIris, ${x ? 'smoothstep(faceIrisSplit.x - faceIrisSplit.y, faceIrisSplit.x + faceIrisSplit.y, t)' : 'smoothstep(0.38, 0.62, t)'});
        iris = mix(iris, mix(faceIris * ${v3(LIMBAL_RATIO)}, faceIrisRing, faceIrisAmber.w), smoothstep(0.80, 0.97, t));
        float fib = (a + 3.14159265) * ${n(FACE_LOOK.fibres / (2 * Math.PI))};
        float fi = floor(fib);
        float h = mix(faceHash11(mod(fi, ${n(FACE_LOOK.fibres)})), faceHash11(mod(fi + 1.0, ${n(FACE_LOOK.fibres)})), smoothstep(0.3, 0.7, fract(fib)));
        iris *= 1.0 + ${n(FACE_LOOK.fibreContrast)} * (2.0 * h - 1.0);
        eye = mix(eye, iris, 1.0 - smoothstep(${n(IRIS_ANGLE)} - 0.03, ${n(IRIS_ANGLE)} + 0.03, ang));
        float pa = asin(min(facePupil / ${n(EYE_R)}, 0.95));
        eye = mix(eye, ${v3(FACE_LOOK.pupil)}, 1.0 - smoothstep(pa - 0.025, pa + 0.025, ang));
      }
      eye *= 1.0 - ${n(L.shadowShade)} * smoothstep(yLid - ${n(L.shadow)}, yLid, p.y);
      col = mix(col, eye, open);
      wet = max(wet, open);
    }
    col *= 1.0 - ${n(L.lidShade)} * lid;
    // lashes: along the lid's edge, a flick past the outer corner, and a fainter row under the lower lid
    float f = ${n(L.feather)};
    float th = ${n(L.lash)} + ${n(L.lashOuter)} * smoothstep(-0.2, 1.0, min(u, 1.0));
    float upper = smoothstep(yLid - f, yLid + f, p.y) * (1.0 - smoothstep(yLid + th - f, yLid + th + f, p.y)) * smoothstep(-1.0, -0.8, u) * (1.0 - step(1.0, u));
    float s = (u - 1.0) / ${n(L.flick)};
    float flick = 0.0;
    if (s >= 0.0 && s < 1.0) {
      float yb = base + faceBlink * ${n(L.blinkGap)} + ${n(L.flickRise)} * s;
      float tf = ${n(L.lash + L.lashOuter)} * (1.0 - s);
      flick = smoothstep(yb - f, yb + f, p.y) * (1.0 - smoothstep(yb + tf - f, yb + tf + f, p.y));
    }
    float lower = smoothstep(yLo - ${n(L.lowerLash)} - f, yLo - ${n(L.lowerLash)} + f, p.y) * (1.0 - smoothstep(yLo - f, yLo + f, p.y))
      * smoothstep(${n(L.lowerFrom)}, ${n(L.lowerFrom + 0.15)}, u) * (1.0 - smoothstep(0.9, 1.0, u)) * ${n(L.lowerAlpha)};
    col = mix(col, ${v3(FACE_LOOK.lash)}, max(max(upper, flick) * ${n(L.lashAlpha)}, lower) * faceLashes);
  }`;

  // THE FACE'S DETAILS (a program that has them: `x`). Before the functions above, what the brow reads; after them, the
  // freckles and the painted shade, in face coordinates (`vFaceF`: rest metres less `FACE_ORIGIN`)
  const BS = FACE_BROW_SHAPE, SA = BROW_S_ARCH;
  const DETAIL_PRE = x ? [
    'uniform vec4 faceMarks;',
    'uniform vec4 faceMarksColour;',
    'uniform vec4 faceMarksAreas;',
    'uniform vec4 faceBrowShape;',
    'uniform vec4 faceDetail;',
    'uniform vec2 faceIrisSplit;',
    `
  // the brow's middle line at s (0 its head, 1 its tail) as a character's shape has it: drawn toward the straight line
  // from its head to its tail, its arch lifted (its head kept, its tail keeping some of it), its tail lifted
  float faceBrowShaped(float s) {
    float own = ${n(BROW_Y[0])} + ${n(BROW_Y[1])} * s + ${n(BROW_Y[2])} * s * s;
    float line = ${n(BROW_Y[0])} + ${n(BROW_Y[1] + BROW_Y[2])} * s;
    float arch = s < ${n(SA)} ? smoothstep(0.0, ${n(SA)}, s) : 1.0 - ${n(1 - BS.tailKeep)} * smoothstep(${n(SA)}, 1.0, s);
    return mix(own, line, faceBrowShape.y) + faceBrowShape.x * arch + faceBrowShape.z * clamp(s, 0.0, 1.2);
  }`,
  ].join('\n') : '';
  const OF = (p: readonly number[]): V3 => [p[0] - O[0], p[1] - O[1], p[2] - O[2]];
  const MK = FACE_MARKS, DT = FACE_DETAIL;
  // the smile line as |x| of y (face coordinates): the quadratic through its three points
  const SM = DT.smile, smY = [SM.from[1] - O[1], SM.via[1] - O[1], SM.to[1] - O[1]], smX = [SM.from[0], SM.via[0], SM.to[0]];
  const smC = ((smX[0] - smX[1]) / (smY[0] - smY[1]) - (smX[1] - smX[2]) / (smY[1] - smY[2])) / (smY[0] - smY[2]);
  const smB = (smX[0] - smX[1]) / (smY[0] - smY[1]) - smC * (smY[0] + smY[1]);
  const smA = smX[0] - smB * smY[0] - smC * smY[0] * smY[0];
  const CR = DT.crease, SK = DT.socket, PH = DT.philtrum;
  const DETAIL_POST = x ? `
  vec4 faceHash43(vec3 p) {
    vec4 p4 = fract(vec4(p.xyzx) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
  }
  // a smooth value noise in 3D, 0..1, a cell a unit
  float faceNoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(faceHash43(i).x, faceHash43(i + vec3(1.0, 0.0, 0.0)).x, f.x), b = mix(faceHash43(i + vec3(0.0, 1.0, 0.0)).x, faceHash43(i + vec3(1.0, 1.0, 0.0)).x, f.x);
    float c = mix(faceHash43(i + vec3(0.0, 0.0, 1.0)).x, faceHash43(i + vec3(1.0, 0.0, 1.0)).x, f.x), d = mix(faceHash43(i + vec3(0.0, 1.0, 1.0)).x, faceHash43(i + vec3(1.0, 1.0, 1.0)).x, f.x);
    return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
  }
  float faceEll(vec3 p, vec3 c, vec3 r) { return 1.0 - smoothstep(0.45, 1.0, length((p - c) / r)); }
  // how much of the freckles' areas a point is (face coordinates)
  float faceMarkArea(vec3 f) {
    vec3 a = vec3(abs(f.x), f.y, f.z);
    float nose = faceEll(f, ${v3(OF(MK.nose.c))}, ${v3(MK.nose.r)});
    float cheek = faceEll(a, ${v3(OF(MK.cheek.c))}, ${v3(MK.cheek.r)});
    float fore = faceEll(f, ${v3(OF(MK.forehead.c))}, ${v3(MK.forehead.r)});
    float sh = smoothstep(${n(MK.shoulders.y[0] - O[1])}, ${n(MK.shoulders.y[1] - O[1])}, f.y) * (1.0 - smoothstep(${n(MK.shoulders.y[2] - O[1])}, ${n(MK.shoulders.y[3] - O[1])}, f.y))
      * smoothstep(${n(MK.shoulders.x[0])}, ${n(MK.shoulders.x[1])}, a.x) * (1.0 - smoothstep(${n(MK.shoulders.x[2])}, ${n(MK.shoulders.x[3])}, a.x));
    return max(max(nose * faceMarksAreas.x, cheek * faceMarksAreas.y), max(fore * faceMarksAreas.z, sh * faceMarksAreas.w));
  }
  // one layer of freckles in a square grid of cells of side c (metres) on the plane the skin faces most (seed: that
  // plane's): each cell has one with the chance 'chance', its middle within the cell's middle 0.36, its radius 0.10 to
  // 0.27 of the cell (mostly small; so it never leaves its cell), a little out of round, its edge soft: how much of
  // one covers p, and how dark it is (0.35..1)
  float faceMarkLayer(vec2 p, float c, float chance, float px, float seed) {
    vec2 g = p / c + seed * 17.0;
    vec2 cell = floor(g);
    vec4 h = faceHash42(cell + seed * 31.0);
    if (h.w > chance) return 0.0;
    vec4 k = faceHash42(cell + 17.0 + seed);
    float rad = mix(0.10, 0.27, k.x * k.x);
    vec2 q = g - (cell + 0.32 + 0.36 * h.xy);
    q *= vec2(1.0 + 0.35 * (k.z - 0.5), 1.0 - 0.35 * (k.z - 0.5));
    float e = max(0.5 * px / c, rad * 0.35);
    return (1.0 - smoothstep(rad - e, rad + e, length(q))) * mix(0.35, 1.0, k.y);
  }
  // the freckles over the colour under them (not under paint: cover), laid on the plane her skin faces most there (its
  // facing from the point's own slopes, worked out first, where every pixel near it takes the same path); far off,
  // where a pixel is wider than a freckle, they are laid as the tone they average to, so they never shimmer
  vec3 faceMarksLay(vec3 f, float px, float cover, vec3 col) {
    vec3 fn = abs(cross(dFdx(f), dFdy(f)));
    float area = faceMarkArea(f) * (1.0 - cover);
    if (area <= 0.0) return col;
    bool front = fn.z >= max(fn.x, fn.y), side = fn.x >= fn.y;
    vec2 p = front ? f.xy : side ? f.zy : f.xz;
    float seed = front ? 0.0 : side ? 0.41 : 0.73;
    float c = faceMarks.z;
    float cluster = mix(${n(MK.clusterLow)}, 1.0, smoothstep(0.3, 0.75, faceNoise3(f / ${n(MK.cluster)})));
    float chance = faceMarks.x * area * cluster * ${n(MK.density)};
    float a = max(faceMarkLayer(p, c, chance, px, seed), ${n(MK.fineAlpha)} * faceMarkLayer(p, c * ${n(MK.fine)}, chance, px, seed + 0.37));
    a = mix(a, chance * ${n(0.06 * (1 + MK.fineAlpha))}, smoothstep(0.12 * c, 0.4 * c, px));
    return mix(col, faceMarksColour.rgb, a * faceMarksColour.w * (1.0 - faceLipAlpha(f)));
  }
  // the face's painted details over the colour under them (in the face's box)
  vec3 faceDetailLay(vec3 f, vec3 col) {
    float ax = abs(f.x), shade = 0.0, light = 0.0;
    // the eyelid's crease and the socket over it, about this side's eye
    if (faceDetail.x + faceDetail.y > 0.0 && f.z > ${n(EYE_Z_F)}) {
      vec2 inner = f.x < 0.0 ? ${v2(RIGHT_F.inner)} : ${v2(LEFT_F.inner)};
      vec2 outer = f.x < 0.0 ? ${v2(RIGHT_F.outer)} : ${v2(LEFT_F.outer)};
      vec2 centre = f.x < 0.0 ? ${v2(RIGHT_F.centre)} : ${v2(LEFT_F.centre)};
      float u = 2.0 * (f.x - inner.x) / (outer.x - inner.x) - 1.0;
      float base = mix(inner.y, outer.y, 0.5 * (u + 1.0));
      float yUp = base + ${n(FACE_EYES.upperLid)} * max(1.0 - u * u, 0.0);
      float yC = yUp + ${n(CR.gap)} * (1.0 - ${n(CR.flatten)} * u * u);
      float w = smoothstep(${n(CR.spread[0])}, ${n(CR.spread[0] + 0.25)}, u) * (1.0 - smoothstep(${n(CR.spread[1] - 0.3)}, ${n(CR.spread[1])}, u));
      float d = f.y - yC;
      float line = exp(-(d * d) / ${n(CR.line * CR.line)});
      float under = smoothstep(${n(-CR.under)}, 0.0, d) * (1.0 - smoothstep(0.0, ${n(CR.line)}, d)) * step(yUp, f.y);
      shade += faceDetail.x * w * (${n(CR.shade)} * line + ${n(CR.underShade)} * under);
      vec2 q = (f.xy - vec2(centre.x, base + ${n(SK.up)})) / ${v2(SK.r)};
      shade += faceDetail.y * ${n(SK.shade)} * (1.0 - smoothstep(0.15, 1.0, length(q))) * step(yUp, f.y);
    }
    // the smile lines, from the nose's wings down and out past the mouth's corners
    if (faceDetail.z > 0.0 && f.z > ${n(SM.zFrom - O[2])} && f.y < ${n(smY[0])} && f.y > ${n(smY[2])}) {
      float xl = ${n(smA)} + ${n(smB)} * f.y + ${n(smC)} * f.y * f.y, sl = ${n(smB)} + ${n(2 * smC)} * f.y;
      float d = (ax - xl) / sqrt(1.0 + sl * sl);
      float w = smoothstep(${n(smY[2])}, ${n(smY[2] + SM.fadeLow)}, f.y) * (1.0 - smoothstep(${n(smY[0] - SM.fadeTop)}, ${n(smY[0])}, f.y)) * (1.0 - smoothstep(0.004, 0.008, abs(ax - xl)));
      shade += faceDetail.z * w * (${n(SM.shade)} * exp(-(d * d) / ${n(SM.line * SM.line)}) + ${n(SM.shadowShade)} * smoothstep(${n(-SM.shadow)}, 0.0, d) * (1.0 - step(0.0, d)));
      light += faceDetail.z * w * ${n(SM.light)} * smoothstep(0.0, 0.0015, d) * (1.0 - smoothstep(0.0015, 0.005, d));
    }
    // the philtrum: two ridges from under the nose to the upper lip
    if (faceDetail.w > 0.0 && ax < 0.009 && f.z > ${n(PH.zFrom - O[2])} && f.y < ${n(PH.top - O[1] + 0.001)} && f.y > ${n(PH.bottom - O[1] - 0.001)}) {
      float t = clamp((${n(PH.top - O[1])} - f.y) / ${n(PH.top - PH.bottom)}, 0.0, 1.0);
      float ridge = mix(${n(PH.ridge[0])}, ${n(PH.ridge[1])}, t);
      float w = smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.85, 1.0, t)) * (1.0 - faceLipAlpha(f));
      float groove = 1.0 - smoothstep(0.0, ridge, ax);
      float rq = (ax - ridge) / ${n(PH.width)}, rim = exp(-rq * rq);
      float outside = smoothstep(ridge + ${n(PH.width)}, ridge + ${n(2.5 * PH.width)}, ax) * (1.0 - smoothstep(ridge + ${n(3 * PH.width)}, ridge + ${n(6 * PH.width)}, ax));
      shade += faceDetail.w * w * ${n(PH.shade)} * (groove + 0.6 * outside);
      light += faceDetail.w * w * ${n(PH.light)} * rim;
    }
    col *= mix(vec3(1.0), ${v3(DT.tint)}, min(shade, ${n(DT.most)}));
    return col * (1.0 + light);
  }` : '';

  const FRAGMENT_PARS = [
    'uniform float faceOn;',
    'uniform float faceJaw;',
    'uniform float faceBlink;',
    'uniform vec3 faceGazeR;',
    'uniform vec3 faceGazeL;',
    'uniform float facePupil;',
    'uniform vec3 faceIris;',
    'uniform float faceBrow;',
    'uniform vec3 faceBrowColour;',
    'uniform float faceLips;',
    'uniform float faceLashes;',
    'uniform vec4 faceLipTint;',
    'uniform vec4 faceIrisAmber;',
    'uniform vec3 faceIrisRing;',
    'varying float vFaceJaw;',
    'varying vec3 vFaceF;',
    'varying float vFacePosedY;',
    ...(x ? [DETAIL_PRE] : []),
    GLSL_FRAGMENT_FUNCTIONS,
    ...(x ? [DETAIL_POST] : []),
  ].join('\n');

  // After color_fragment, so it lies over her texture, any vertex colour and any fabric painted on her. The three
  // amounts the roughness and normal hooks read are declared here, at main()'s scope, whatever the switch says. The size
  // of a pixel on her is measured before any branch that depends on where the fragment is, because a derivative is only
  // defined where neighbouring fragments take the same path; the switch is a uniform, so inside it is safe.
  const FRAGMENT_COLOUR = `
      float faceWet = 0.0, faceLipMask = 0.0, faceInner = 0.0;
      if (faceOn > 0.5) {
        float facePx = max(max(fwidth(vFaceF.x), fwidth(vFaceF.y)), 1e-6);${x ? `
        if (faceMarks.x > 0.0) diffuseColor.rgb = faceMarksLay(vFaceF, facePx, FACE_PAINT_COVER, diffuseColor.rgb);` : ''}
        if (abs(vFaceF.x) < ${n(FACE_BOX.halfWidth)} && vFaceF.y > ${n(BOX_Y0_F)} && vFaceF.y < ${n(BOX_Y1_F)} && vFaceF.z > ${n(BOX_Z_F)}) {${x ? `
          if (dot(faceDetail, vec4(1.0)) > 0.0) diffuseColor.rgb = faceDetailLay(vFaceF, diffuseColor.rgb);` : ''}
          faceLipMask = faceLipAlpha(vFaceF);
          diffuseColor.rgb *= mix(vec3(1.0), faceLipTint.rgb, faceLipMask * faceLips * (1.0 - faceLipTint.w));
          float faceLipShade = clamp(dot(diffuseColor.rgb, ${v3(LUMA)}) / ${n(FACE_LIPS.skinLuminance)}, ${n(FACE_LIPS.shade[0])}, ${n(FACE_LIPS.shade[1])});
          diffuseColor.rgb = mix(diffuseColor.rgb, faceLipTint.rgb * faceLipShade, faceLipMask * clamp(faceLips / ${n(FACE_LIPS.paintFull)}, 0.0, 1.0) * faceLipTint.w);
          float faceDist, faceGap;
          faceInner = faceMouthAmount(vFaceJaw, vFaceF, vFacePosedY, faceJaw, faceDist, faceGap);
          if (faceInner > 0.0) {
            float faceAx = abs(vFaceF.x), faceShadeU, faceShadeL;
            float faceLens = smoothstep(${n(-MI.edge / 2)}, ${n(MI.edge / 2)}, faceDist);
            vec3 faceM = mix(${v3(MI.red)}, ${v3(MI.dark)}, smoothstep(${n(MI.redFrom)}, ${n(MI.redTo)}, faceDist));
            faceM = mix(faceM, ${v3(MI.lipInner)}, smoothstep(0.0, ${n(MI.rim / 2)}, -faceDist));
            float faceUpper = ${n(MI.upperTeeth.share)} * faceToothRow(faceAx, faceSeamUp(faceAx) - vFacePosedY, faceGap, ${n(MI.upperTeeth.from)}, ${n(MI.upperTeeth.to)}, ${n(MI.upperTeeth.halfWidth)}, ${n(MI.upperTeeth.opensFrom)}, ${n(MI.upperTeeth.opensTo)}, faceShadeU);
            float faceLower = ${n(MI.lowerTeeth.share)} * faceToothRow(faceAx, vFacePosedY - faceSeamLo(faceAx, faceJaw), faceGap, ${n(MI.lowerTeeth.from)}, ${n(MI.lowerTeeth.to)}, ${n(MI.lowerTeeth.halfWidth)}, ${n(MI.lowerTeeth.opensFrom)}, ${n(MI.lowerTeeth.opensTo)}, faceShadeL);
            faceM = mix(faceM, ${v3(MI.teeth)} * faceShadeU, faceUpper * faceLens);
            faceM = mix(faceM, ${v3(MI.teeth)} * faceShadeL, faceLower * faceLens);
            faceM *= mix(1.0, ${n(MI.deepShade)}, smoothstep(${n(MI.deepFrom)}, ${n(MI.deepTo)}, faceDist));
            diffuseColor.rgb = mix(diffuseColor.rgb, faceM, faceInner);
          }
          if (vFaceF.z > ${n(EYE_Z_F)}) {
            if (vFaceF.x < 0.0) faceEye(vFaceF.xy, ${v2(RIGHT_F.inner)}, ${v2(RIGHT_F.outer)}, ${v2(RIGHT_F.centre)}, faceGazeR, diffuseColor.rgb, faceWet);
            else faceEye(vFaceF.xy, ${v2(LEFT_F.inner)}, ${v2(LEFT_F.outer)}, ${v2(LEFT_F.centre)}, faceGazeL, diffuseColor.rgb, faceWet);
          }
          if (vFaceF.z > ${n(BROW_Z_F)}) {
            float faceA, faceAcross;
            float faceReach = faceBrowCover(vFaceF, ${n(HAIR.overhang)}, faceA, faceAcross);
            if (faceReach > 0.0) {
              float faceB = faceBrowCover(vFaceF, 0.0, faceA, faceAcross);
              float faceDark;
              float faceHair = faceBrowHairs(vec2(faceA, faceAcross), facePx, faceDark);
              float faceFill = mix(${n(HAIR.fill[0])}, ${n(HAIR.fill[1])}, clamp(${n(2 * HAIR.halfWidth)} / facePx, 0.0, 1.0));
              vec3 faceBC = faceBrowColour * mix(${n(HAIR.fillShade)}, faceDark, faceHair);
              diffuseColor.rgb = mix(diffuseColor.rgb, faceBC, ${n(FACE_BROWS.alpha)} * faceBrow * max(faceB * mix(faceFill, 1.0, faceHair), faceReach * faceHair));
            }
          }
        }
      }`;
  const FRAGMENT_ROUGHNESS = `
      if (faceOn > 0.5) {
        roughnessFactor = mix(roughnessFactor, ${n(FACE_LOOK.lipRoughness)}, faceLipMask);
        roughnessFactor = mix(roughnessFactor, ${n(FACE_LOOK.insideRoughness)}, faceInner);
        roughnessFactor = mix(roughnessFactor, ${n(FACE_LOOK.wetRoughness)}, faceWet);
      }`;
  // After normal_fragment_maps: her skin's normal map (pores, the statue eye's own relief) clouds a wet eye white, so
  // there the normal goes back to the surface's own; three r185 declares `nonPerturbedNormal` in normal_fragment_begin,
  // before the maps, and the fabric patch reads it the same way. The mouth's inside faces the camera outright (view space
  // +z): its triangles are the lips stretched across the gap, each with its own half-turned vertex normals, and lit by
  // those they showed every triangle as a streak.
  const FRAGMENT_NORMAL = `
      if (faceOn > 0.5) {
        normal = normalize(mix(normal, nonPerturbedNormal, faceWet));
        normal = normalize(mix(normal, vec3(0.0, 0.0, 1.0), faceInner));
      }`;
  if (!spec.beard) return { VERTEX_PARS, VERTEX_NORMAL, VERTEX_JAW, FRAGMENT_PARS, FRAGMENT_COLOUR, FRAGMENT_ROUGHNESS, FRAGMENT_NORMAL };
  // FACIAL HAIR (a face with a beard design only: hers has none, and her program's text is as it was): its functions and
  // uniforms after the rest, its colour laid last in the face's own branch, outside the eyes' and mouth's box (a beard
  // reaches under the chin and back to the ear), and its matte roughness
  const B = beardLines(spec.beard);
  const close = FRAGMENT_COLOUR.lastIndexOf('\n      }');
  return {
    VERTEX_PARS, VERTEX_NORMAL, VERTEX_JAW,
    FRAGMENT_PARS: `${FRAGMENT_PARS}\n${B.pars}`,
    FRAGMENT_COLOUR: `\n      float faceBeardA = 0.0;${FRAGMENT_COLOUR.slice(0, close)}${B.colour}${FRAGMENT_COLOUR.slice(close)}`,
    FRAGMENT_ROUGHNESS: `${FRAGMENT_ROUGHNESS}${B.roughness}`,
    FRAGMENT_NORMAL,
  };
}

/** The facial hair's shader lines from its design (`BeardDesign`), in the face's coordinates (`rest - FACE_ORIGIN`). */
function beardLines(d: BeardDesign): { pars: string; colour: string; roughness: string } {
  const O = FACE_ORIGIN, C = d.chart.centre, nl = Math.hypot(d.neck.normal[0], d.neck.normal[1]), N = [d.neck.normal[0] / nl, d.neck.normal[1] / nl];
  const reach = Math.ceil(Math.max(...Object.values(d.styles).map((st) => st.length / st.cell))) + 1;
  const pars = [
    'uniform vec4 faceBeardArea;',
    'uniform vec4 faceBeardHair;',
    'uniform vec4 faceBeardColour;',
    'uniform vec4 faceBeardLook;',
    `
  // a smooth value noise, 0..1, a cell a unit
  float faceBeardNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(faceHash12(i), faceHash12(i + vec2(1.0, 0.0)), f.x), mix(faceHash12(i + vec2(0.0, 1.0)), faceHash12(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // where facial hair is (0..1), at a point r of the face (her rest metres), and the point in the hair's chart
  float faceBeardWhere(vec3 r, out vec2 chart) {
    float ax = abs(r.x);
    vec3 q = r - ${v3(C)};
    float el = atan(q.y, length(q.xz));
    chart = vec2(atan(q.x, q.z) * cos(el), el) * ${n(d.chart.radius)};
    float wv = (faceBeardNoise(chart / ${n(d.waverCell)}) - 0.5) * ${n(2 * d.waver)};
    float e = ${n(d.edge)};
    float yTop = mix(${n(d.cheek.inner[1])}, ${n(d.cheek.outer[1])}, smoothstep(${n(d.cheek.inner[0])}, ${n(d.cheek.outer[0])}, ax)) + faceBeardArea.w * ${n(d.grow.cheek)};
    float zBack = mix(${n(d.back.low)}, ${n(d.back.high)}, smoothstep(${n(d.back.from)}, ${n(d.back.to)}, r.y));
    float neck = dot(r.yz - ${v2(d.neck.front)}, ${v2(N)}) + faceBeardArea.w * ${n(d.grow.neck)};
    float below = smoothstep(-e, e, yTop - r.y + wv), front = smoothstep(-e, e, r.z - zBack + wv), above = smoothstep(-e, e, neck + wv);
    float mTop = mix(${n(d.mustache.top)}, ${n(d.mustache.bottom + d.mustache.corner)}, smoothstep(${n(0.3 * d.mustache.halfWidth)}, ${n(d.mustache.halfWidth)}, ax));
    float must = smoothstep(-e, e, ${n(d.mustache.halfWidth)} - ax + wv) * smoothstep(-e, e, mTop - r.y + 0.5 * wv) * smoothstep(-e, e, r.y - ${n(d.mustache.bottom)});
    // (a full area takes in the upper lip as well: the cheek line runs down to the mouth's corners, under his nose's wings)
    float full = max(below * front * above, must);
    float cW = mix(${n(d.chin.topHalfWidth)}, ${n(d.chin.halfWidth)}, smoothstep(${n(d.chin.top)}, ${n(d.chin.top - 0.022)}, r.y));
    float chin = smoothstep(-e, e, cW - ax + wv) * smoothstep(-e, e, ${n(d.chin.top)} - r.y) * above * smoothstep(-e, e, r.z - ${n(d.chin.depth)} + wv);
    return max(full * faceBeardArea.x, max(must * faceBeardArea.y, chin * faceBeardArea.z));
  }
  // the hairs at a point of the chart (y flipped: they grow toward +y, down his face), as the brows' are: how much of a
  // hair covers it, antialiased against the pixel's size px, and that hair's darkness. A hair grows from a root in a cell
  // of a jittered grid (faceBeardHair.z a side; faceBeardHair.w the share of cells with one) for up to faceBeardHair.y,
  // leaning by lean; the roots that reach a point lie up the chart from it, so the search walks the rows above
  float faceBeardHairs(vec2 p, float px, float lean, out float dark) {
    float c = faceBeardHair.z, len = faceBeardHair.y;
    vec2 g = p / c;
    float slope = tan(lean);
    float best = 0.0;
    dark = 1.0;
    for (int k = 0; k <= ${reach}; k++) {
      float line = floor(g.y) - float(k);
      float xing = g.x - (g.y - (line + 0.5)) * slope;
      for (int l = -1; l <= 1; l++) {
        vec2 cell = vec2(floor(xing) + float(l), line);
        vec4 h = faceHash42(cell + vec2(71.0, 13.0));
        if (h.z > faceBeardHair.w) continue;
        vec2 root = (cell + h.xy) * c;
        float L = len * mix(0.55, 1.0, h.w);
        float a = lean + (faceHash12(cell + vec2(5.0, 9.0)) - 0.5) * ${n(2 * d.hair.jitter)};
        vec2 dir = vec2(sin(a), cos(a));
        vec2 dp = p - root;
        float t = clamp(dot(dp, dir), 0.0, L);
        float hw = ${n(d.hair.halfWidth)} * (1.0 - 0.5 * t / L);
        float w = max(hw, 0.5 * px);
        float hit = (hw / w) * (1.0 - smoothstep(w - 0.5 * px, w + 0.5 * px, length(dp - dir * t)));
        if (hit > best) { best = hit; dark = 1.0 + ${n(d.hair.dark)} * (2.0 * fract(h.w * 31.7) - 1.0); }
      }
    }
    return best;
  }`,
  ].join('\n');
  const colour = `
        if (faceBeardColour.w > 0.0 && vFaceF.y < ${n(d.cheek.outer[1] + d.grow.cheek + 0.01 - O[1])} && vFaceF.z > ${n(Math.min(d.back.low, d.back.high) - 0.01 - O[2])} && abs(vFaceF.x) < ${n(0.1)}) {
          vec3 faceR = vFaceF + ${v3(O)};
          vec2 faceChart;
          float faceArea = faceBeardWhere(faceR, faceChart) * (1.0 - faceLipMask) * (1.0 - faceInner);
          if (faceArea > 0.0) {
            float faceBpx = max(max(fwidth(faceChart.x), fwidth(faceChart.y)), 1e-6);
            // (over the upper lip a hair leans out from the middle, as a mustache grows; elsewhere nearly straight down)
            float faceLean = clamp(faceR.x / 0.004, -1.0, 1.0);
            faceLean *= mix(${n(d.hair.lean)}, ${n(d.hair.leanMustache)}, (1.0 - smoothstep(${n(d.mustache.halfWidth - 0.004)}, ${n(d.mustache.halfWidth + 0.002)}, abs(faceR.x))) * smoothstep(${n(d.mustache.bottom)}, ${n(d.mustache.bottom + 0.004)}, faceR.y));
            float faceDarkB;
            float faceHairB = faceBeardHairs(vec2(faceChart.x, -faceChart.y), faceBpx, faceLean, faceDarkB);
            float faceFillB = faceBeardHair.x * mix(0.8, 1.0, faceBeardNoise(faceChart / 0.0015)) * mix(1.0 - faceBeardLook.x, 1.0 + 0.5 * faceBeardLook.x, faceBeardNoise(faceChart / ${n(d.grainCell)}));
            vec3 faceBC = faceBeardColour.rgb * mix(${n(d.hair.fillShade)}, faceDarkB, faceHairB);
            faceBeardA = faceArea * faceBeardColour.w * max(faceFillB, faceHairB);
            diffuseColor.rgb = mix(diffuseColor.rgb, faceBC, faceBeardA);
          }
        }`;
  const roughness = `
      if (faceOn > 0.5) roughnessFactor = mix(roughnessFactor, ${n(d.roughness)}, faceBeardA);`;
  return { pars, colour, roughness };
}
interface ShaderLines { readonly VERTEX_PARS: string; readonly VERTEX_NORMAL: string; readonly VERTEX_JAW: string; readonly FRAGMENT_PARS: string; readonly FRAGMENT_COLOUR: string; readonly FRAGMENT_ROUGHNESS: string; readonly FRAGMENT_NORMAL: string }
const shaders = new Map<FaceSpec, [ShaderLines | null, ShaderLines | null]>();
// (the lines are written indented inside `shaderFor`; her program's text is as it was before, to the letter)
const dedent = (t: string) => t.replace(/^ {2}/gm, '');
const linesFor = (spec: FaceSpec, details = false): ShaderLines => {
  let pair = shaders.get(spec);
  if (!pair) { pair = [null, null]; shaders.set(spec, pair); }
  const i = details ? 1 : 0;
  let s = pair[i];
  if (!s) { const raw = shaderFor(spec, details); s = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, dedent(v)])) as unknown as ShaderLines; pair[i] = s; }
  return s;
};
/** Materials whose face draws its details (`faceNeedsDetails`): their program has them from then on. */
const detailed = new WeakSet<THREE.Material>();
/** Whether a material's face program has the details (`faceNeedsDetails` asked for them once). */
export function faceHasDetails(material: THREE.Material): boolean { return detailed.has(material); }
/**
 * WHAT IS PAINTED ON HER IS NOT FRECKLED: the details' freckles are laid where her skin's paint covers none of her
 * (`fabricMatte`, the fabric program's own: `fabricMaterial.ts`). That program's text goes in by its own patch, which may
 * be laid on the material before or after the face's; so the name is a placeholder in the face's lines, put right by a
 * last step that runs after every patch then on the material -- `fabricMatte` where the fabric's program is in the
 * text, else nothing covers her. (The room lays the fabric's program on her before it asks for the details.)
 */
const PAINT_COVER = 'FACE_PAINT_COVER';
function finishDetails(material: THREE.Material): void {
  const inner = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    inner.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.split(PAINT_COVER).join(/float fabricMatte\b/.test(shader.fragmentShader) ? 'fabricMatte' : '0.0');
  };
}


/** Patch a material once (idempotent) with a body's face (hers unless said); the face starts OFF. */
export function patchFaceRig(material: THREE.Material, spec: FaceSpec = HER_FACE): void {
  patch(material, spec);
}
/** The face a material was patched with (null: none). */
export function faceSpecOf(material: THREE.Material): FaceSpec | null {
  return specOf.get(material) ?? null;
}
const specOf = new WeakMap<THREE.Material, FaceSpec>();

function patch(material: THREE.Material, spec: FaceSpec = HER_FACE): Uniforms {
  const known = patched.get(material);
  if (known) return known;
  const FACE_DEFAULTS = spec.defaults as typeof HER_FACE.defaults & { readonly iris: V3; readonly browColour: V3 }, FACE_LIPS = spec.lips as typeof HER_FACE.lips & { readonly tint: V3 };
  const uniforms: Uniforms = {
    faceOn: { value: 0 },
    faceJaw: { value: 0 },
    faceBlink: { value: 0 },
    faceGazeR: { value: new THREE.Vector3(0, 0, 1) },
    faceGazeL: { value: new THREE.Vector3(0, 0, 1) },
    facePupil: { value: FACE_DEFAULTS.pupil },
    faceIris: { value: new THREE.Vector3(...FACE_DEFAULTS.iris) },
    faceBrow: { value: FACE_DEFAULTS.brow },
    faceBrowColour: { value: new THREE.Vector3(...FACE_DEFAULTS.browColour) },
    faceLips: { value: FACE_DEFAULTS.lips },
    faceLashes: { value: FACE_DEFAULTS.lashes },
    faceLipTint: { value: new THREE.Vector4(...FACE_LIPS.tint, 0) },
    faceIrisAmber: { value: new THREE.Vector4(...FACE_LOOK.amber, 0) },
    faceIrisRing: { value: new THREE.Vector3(...FACE_LOOK.limbal) },
    ...(spec.beard ? { faceBeardArea: { value: new THREE.Vector4() }, faceBeardHair: { value: new THREE.Vector4() }, faceBeardColour: { value: new THREE.Vector4() }, faceBeardLook: { value: new THREE.Vector4() } } : {}),
    // (the details' own: read only by a program that has them)
    faceMarks: { value: new THREE.Vector4() }, faceMarksColour: { value: new THREE.Vector4() }, faceMarksAreas: { value: new THREE.Vector4() },
    faceBrowShape: { value: new THREE.Vector4(0, 0, 0, 1) }, faceDetail: { value: new THREE.Vector4() }, faceIrisSplit: { value: new THREE.Vector2(0.5, FACE_IRIS_SPLIT.soft) },
  };
  const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    previous.call(this, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    const { VERTEX_PARS, VERTEX_NORMAL, VERTEX_JAW, FRAGMENT_PARS, FRAGMENT_COLOUR, FRAGMENT_ROUGHNESS, FRAGMENT_NORMAL } = linesFor(spec, detailed.has(material));
    shader.vertexShader = [VERTEX_PARS, shader.vertexShader].join('\n')
      .replace('#include <morphnormal_vertex>', () => `#include <morphnormal_vertex>${VERTEX_NORMAL}`)
      .replace('#include <morphtarget_vertex>', () => `#include <morphtarget_vertex>${VERTEX_JAW}`);
    shader.fragmentShader = [FRAGMENT_PARS, shader.fragmentShader].join('\n')
      .replace('#include <color_fragment>', () => `#include <color_fragment>${FRAGMENT_COLOUR}`)
      .replace('#include <roughnessmap_fragment>', () => `#include <roughnessmap_fragment>${FRAGMENT_ROUGHNESS}`)
      .replace('#include <normal_fragment_maps>', () => `#include <normal_fragment_maps>${FRAGMENT_NORMAL}`);
  };
  // (her own program's key as it always was; another body's face is another program)
  const tag = spec === HER_FACE ? '' : `-${spec.frame.id}`;
  material.customProgramCacheKey = function () { return `${cacheKey.call(this)}|face-rig-v3${tag}${detailed.has(material) ? '-details' : ''}`; };
  material.needsUpdate = true;
  patched.set(material, uniforms);
  specOf.set(material, spec);
  return uniforms;
}

/**
 * Set the face (patching first if needed). Null switches it all off, the jaw too (the material then draws exactly as
 * unpatched, apart from the cost of the branch); a material never patched is left alone by it. Only uniform values
 * change, never the program.
 */
export function setFaceRig(material: THREE.Material, state: FaceRigState | null): void {
  if (!state && !patched.has(material)) return; // nothing to take off a material never patched
  const u = patch(material), spec = specOf.get(material) ?? HER_FACE;
  const FACE_DEFAULTS = spec.defaults as typeof HER_FACE.defaults & { readonly iris: V3; readonly browColour: V3 }, FACE_LIPS = spec.lips as typeof HER_FACE.lips & { readonly tint: V3 };
  const s = state ? settingOf(state, spec) : null;
  u.faceOn.value = s ? 1 : 0;
  u.faceJaw.value = s ? s.jaw : 0;
  u.faceBlink.value = s ? s.blink : 0;
  u.faceGazeR.value.set(...(s ? s.gazeRight : [0, 0, 1] as const));
  u.faceGazeL.value.set(...(s ? s.gazeLeft : [0, 0, 1] as const));
  u.facePupil.value = s ? s.pupil : FACE_DEFAULTS.pupil;
  u.faceIris.value.set(...(s ? s.iris : FACE_DEFAULTS.iris));
  u.faceBrow.value = s ? s.brow : FACE_DEFAULTS.brow;
  u.faceBrowColour.value.set(...(s ? s.browColour : FACE_DEFAULTS.browColour));
  u.faceLips.value = s ? s.lips : FACE_DEFAULTS.lips;
  u.faceLashes.value = s ? s.lashes : FACE_DEFAULTS.lashes;
  const lip = s?.lipTint, amber = s?.irisAmber, ring = s?.irisRing;
  u.faceLipTint.value.set(...(lip ?? FACE_LIPS.tint), lip ? 1 : 0);
  u.faceIrisAmber.value.set(...(amber ?? FACE_LOOK.amber), amber ? 1 : 0);
  u.faceIrisRing.value.set(...(ring ?? FACE_LOOK.limbal));
  if (u.faceBeardArea && u.faceBeardHair && u.faceBeardColour) {
    const b = s?.beard;
    u.faceBeardArea.value.set(b ? b.style.full : 0, b ? b.style.mustache : 0, b ? b.style.chin : 0, b ? b.style.grow : 0);
    u.faceBeardHair.value.set(b ? b.style.fill : 0, b ? b.style.length : 0.001, b ? b.style.cell : 0.001, b ? b.style.density * b.amount : 0);
    u.faceBeardColour.value.set(...(b ? b.colour : [0, 0, 0] as const), b ? b.amount : 0);
    u.faceBeardLook?.value.set(b ? b.style.grain : 0, 0, 0, 0);
  }
  // THE DETAILS: the program that has them is asked for once, the first time a state wants one
  if (s && state && faceNeedsDetails(state) && !detailed.has(material)) {
    detailed.add(material);
    finishDetails(material);
    material.needsUpdate = true;
  }
  const m = s?.marks, size = m ? mix(FACE_MARKS.size[0], FACE_MARKS.size[1], m.size) : FACE_MARKS.size[0];
  u.faceMarks.value.set(m ? m.amount : 0, size, size * FACE_MARKS.cell, 0);
  u.faceMarksColour.value.set(...(m ? m.colour : [0, 0, 0] as const), FACE_MARKS.alpha);
  u.faceMarksAreas.value.set(...(m ? m.areas : [0, 0, 0, 0] as const));
  const bs = s ? s.browShape : [0, 0, 0, 0] as const;
  u.faceBrowShape.value.set(bs[0] * FACE_BROW_SHAPE.arch, bs[1], bs[2] * FACE_BROW_SHAPE.tilt, 1 + bs[3] * FACE_BROW_SHAPE.thick);
  u.faceDetail.value.set(...(s ? s.detail : [0, 0, 0, 0] as const));
  u.faceIrisSplit.value.set(irisSplitAt(s ? s.irisSplit : 0.5), FACE_IRIS_SPLIT.soft);
}
/** Where the inner ring gives way, `t` from the iris's middle, for a reach of 0..1 (0.5: her own, 0.5). */
export function irisSplitAt(reach: number): number {
  return FACE_IRIS_SPLIT.from + (FACE_IRIS_SPLIT.to - FACE_IRIS_SPLIT.from) * clamp(reach, 0, 1);
}

// ------------------------------------------------------------------------------------------------------------------
// Where the camera is, in her rest frame

const skin = new THREE.Matrix4();
const local = new THREE.Vector3();

/**
 * For a skinned mesh of her body: the world point (the camera, say) in her REST frame, through the head bone
 * (`FACE_HEAD_BONE`) as posed now. A vertex weighted wholly to bone b is drawn at
 * `mesh.matrixWorld · bindMatrixInverse · bone.matrixWorld · boneInverses[b] · bindMatrix · v` (geometry units); this
 * inverts that for the head bone and applies the rest transform. It reads the matrices as they were last updated (by a
 * render or `updateMatrixWorld`), and changes nothing. Her eyes are weighted about nine parts in ten to the head (it and
 * its unposed child `Bone_015`, which moves with it) and one to the neck, so with the head turned against the neck the
 * answer is the head's, which is what the eyes ride. Null if the mesh has no such bone.
 */
export function restFromWorld(mesh: THREE.SkinnedMesh, world: THREE.Vector3, out?: [number, number, number], frame: FaceFrame = HER_FACE.frame): [number, number, number] | null {
  const skeleton = mesh.skeleton;
  const b = skeleton ? skeleton.bones.findIndex((bone) => bone.name === frame.headBone) : -1;
  if (b < 0 || !skeleton.boneInverses[b]) return null;
  skin.multiplyMatrices(mesh.matrixWorld, mesh.bindMatrixInverse)
    .multiply(skeleton.bones[b].matrixWorld)
    .multiply(skeleton.boneInverses[b])
    .multiply(mesh.bindMatrix);
  if (skin.determinant() === 0) return null;
  local.copy(world).applyMatrix4(skin.invert());
  const r = out ?? [0, 0, 0];
  if (frame.pitch === 0) {
    r[0] = frame.scale * local.x + frame.offset[0];
    r[1] = frame.scale * local.y + frame.offset[1];
    r[2] = frame.scale * local.z + frame.offset[2];
    return r;
  }
  const q = faceRestOf(frame, [local.x, local.y, local.z]);
  r[0] = q[0]; r[1] = q[1]; r[2] = q[2];
  return r;
}

// ------------------------------------------------------------------------------------------------------------------
// The CPU mirrors, formula for formula with the GLSL above, for tests and probes

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;
const toF = (rest: V3): V3 => [rest[0] - O[0], rest[1] - O[1], rest[2] - O[2]];
const inBox = (f: V3): boolean => Math.abs(f[0]) < FACE_BOX.halfWidth && f[1] > BOX_Y0_F && f[1] < BOX_Y1_F && f[2] > BOX_Z_F;

function jawSeamF(f: V3): number {
  const ax = Math.abs(f[0]);
  if (ax > FACE_JAW.halfWidth) return 0;
  const qy = f[1] - HINGE_F[1];
  const qz = f[2] - HINGE_F[2];
  const phi = Math.atan2(qy, qz);
  const k = Math.min(1, (ax / FACE_MOUTH.cornerX) * (ax / FACE_MOUTH.cornerX));
  const phiSeam = PHI_CENTRE + (PHI_CORNER - PHI_CENTRE) * k;
  const delta = mix(FACE_JAW.lipsDelta, FACE_JAW.cheekDelta, smoothstep(FACE_JAW.deltaFrom, FACE_JAW.deltaTo, ax));
  const wSeam = 1 - smoothstep(phiSeam - delta, phiSeam + delta, phi);
  const wLow = smoothstep(FACE_JAW.lowFrom, FACE_JAW.lowTo, phi);
  const wBack = smoothstep(FACE_JAW.backFrom, FACE_JAW.backTo, qz);
  const wNeck = smoothstep(NECK_FROM_F, NECK_TO_F, f[1]);
  return wSeam * wLow * wBack * wNeck;
}

function jawTaperF(f: V3): number {
  const ax = Math.abs(f[0]);
  const k = Math.min(1, (ax / FACE_MOUTH.cornerX) * (ax / FACE_MOUTH.cornerX));
  const below = mix(SEAM_F, CORNER_Y_F, k) - f[1];
  const corner = mix(1, MT.corner, smoothstep(MT.innerX, MT.outerX, ax));
  return mix(corner, 1, smoothstep(0, MT.depth, below));
}

/**
 * The SEAM weight of a rest point (rest metres): 1 below the lips' seam, 0 above, before the corner taper. Exactly 0
 * or 1 on the lips' own surfaces; it is what the vertex stage passes on as `vFaceJaw`, for the curtain test.
 */
export function faceJawSeam(rest: readonly [number, number, number]): number {
  return jawSeamF(toF(rest));
}

/** The jaw weight of a rest point (rest metres): how much of the jaw's turn it takes, 1 moves wholly, 0 stays. The seam weight times the corner taper. */
export function faceJawWeight(rest: readonly [number, number, number]): number {
  const f = toF(rest);
  return jawSeamF(f) * jawTaperF(f);
}

/** Where a rest point stands with the jaw `jaw` (0..1) open: turned about the hinge's x axis by jaw · FACE_JAW_MAX · its weight. */
export function faceJawMove(rest: readonly [number, number, number], jaw: number): [number, number, number] {
  const theta = amount(jaw, 0) * FACE_JAW_MAX * faceJawWeight(rest);
  if (theta === 0) return [rest[0], rest[1], rest[2]]; // as the vertex stage skips the turn, so nothing moves by rounding
  const qy = rest[1] - FACE_JAW_HINGE[1], qz = rest[2] - FACE_JAW_HINGE[2];
  const c = Math.cos(theta), s = Math.sin(theta);
  return [rest[0], FACE_JAW_HINGE[1] + qy * c - qz * s, FACE_JAW_HINGE[2] + qy * s + qz * c];
}

/** What part of an eye a rest point shows. */
export type FaceEyeRegion = 'none' | 'lid' | 'sclera' | 'iris' | 'pupil' | 'caruncle';

/** The almond's terms for one eye at a face-coordinate point, as `faceEye` works them. */
function eyeTerms(p: readonly [number, number], eye: EyeF, blink: number): { u: number; open: number; lid: number } {
  const u = 2 * (p[0] - eye.inner[0]) / (eye.outer[0] - eye.inner[0]) - 1;
  const base = mix(eye.inner[1], eye.outer[1], 0.5 * (u + 1));
  const bulge = 1 - u * u;
  const yUp = base + FACE_EYES.upperLid * bulge;
  const yLo = base - FACE_EYES.lowerLid * bulge;
  const yLid = mix(yUp, yLo + L.blinkGap, blink);
  const e = EDGE_HALF;
  const open = smoothstep(yLo - e, yLo + e, p[1]) * (1 - smoothstep(yLid - e, yLid + e, p[1])) * smoothstep(L.closeFrom, L.closeTo, yLid - yLo);
  const lid = smoothstep(yLid - e, yLid + e, p[1]) * (1 - smoothstep(yUp - e, yUp + e, p[1])) * smoothstep(0, L.blinkGap, yUp - yLid);
  return { u, open, lid };
}

/**
 * Which part of an eye the shader draws at a rest point for a face state: the opening's inside more than half drawn is
 * the pupil, the iris or the sclera by where it falls on the virtual eyeball against the gaze, the caruncle in the
 * opening's inner 15% off the eyeball; the lid more than half drawn is 'lid'; anything else 'none'. The shader blends
 * across each of these lines; these are the lines.
 */
export function faceEyeRegion(rest: readonly [number, number, number], state: FaceRigState): FaceEyeRegion {
  const f = toF(rest);
  if (!inBox(f) || !(f[2] > EYE_Z_F)) return 'none';
  const s = settingOf(state);
  const right = f[0] < 0;
  const eye = right ? RIGHT_F : LEFT_F;
  const g = right ? s.gazeRight : s.gazeLeft;
  const { u, open, lid } = eyeTerms([f[0], f[1]], eye, s.blink);
  if (open > 0.5) {
    const dx = f[0] - eye.centre[0], dy = f[1] - eye.centre[1];
    const r2 = dx * dx + dy * dy;
    if (r2 < EYE_R * EYE_R) {
      const nz = Math.sqrt(EYE_R * EYE_R - r2);
      const c = (dx * g[0] + dy * g[1] + nz * g[2]) / EYE_R;
      const ang = Math.acos(clamp(c, -1, 1));
      if (ang < Math.asin(Math.min(s.pupil / EYE_R, 0.95))) return 'pupil';
      if (ang < IRIS_ANGLE) return 'iris';
    }
    return 1 - smoothstep(-0.9, -0.8, u) > 0.5 ? 'caruncle' : 'sclera';
  }
  return lid > 0.5 ? 'lid' : 'none';
}

/** Half the brow's thickness `a` metres along it from the head point, as `faceBrowHalf`. */
function browHalf(a: number): number {
  if (a <= FACE_BROWS.headEnd) return 0;
  const s = a / BROW_SPAN;
  const th = BROW_T[0] + BROW_T[1] * s + BROW_T[2] * s * s;
  const capT = clamp((FACE_BROWS.headEnd + FACE_BROWS.headRound - a) / FACE_BROWS.headRound, 0, 1);
  const cap = Math.pow(Math.max(1 - Math.pow(capT, FACE_BROWS.headPower), 0), 1 / FACE_BROWS.headPower);
  const tail = clamp((FACE_BROWS.tailEnd - s) / (FACE_BROWS.tailEnd - FACE_BROWS.tailFrom), 0, 1);
  return 0.5 * th * cap * tail;
}

/**
 * How strongly a brow covers a rest point: `FACE_BROWS.alpha` · `amount` · the band, softened at its edges, rounded at
 * its head and pointed at its tail. The shader draws hairs in it on top (between hairs the brow is 0.35 of this close up
 * and all of it once a hair is under a pixel; on a hair all of it, and a hair may overhang the band by 0.8 mm); they are
 * a hash the GPU works in 32-bit floats, so they are not mirrored here.
 */
export function faceBrowAlpha(rest: readonly [number, number, number], amountOf = 1, shape?: FaceRigState['browShape']): number {
  const f = toF(rest);
  if (!inBox(f) || !(f[2] > BROW_Z_F)) return 0;
  const a = Math.abs(f[0]) - BROW_HEAD_X, s = a / BROW_SPAN;
  const across = f[1] - browY(s, shape);
  const hb = browHalf(a) * browThick(shape);
  const cover = smoothstep(-hb - FACE_BROWS.edgeLow / 2, -hb + FACE_BROWS.edgeLow / 2, across)
    * (1 - smoothstep(hb - FACE_BROWS.edgeHigh / 2, hb + FACE_BROWS.edgeHigh / 2, across))
    * smoothstep(0, 0.0004, hb);
  return FACE_BROWS.alpha * amount(amountOf, FACE_DEFAULTS.brow) * cover;
}

/** The brow's centre line at |x| (rest metres): its height and full thickness there, as the shader works them. */
export function faceBrowLine(x: number, shape?: FaceRigState['browShape']): { readonly y: number; readonly thickness: number } {
  const a = Math.abs(x) - BROW_HEAD_X, s = a / BROW_SPAN;
  return { y: browY(s, shape) + O[1], thickness: 2 * browHalf(a) * browThick(shape) };
}
/** Her brow's middle line at s (face coordinates), as a shape has it (the shader's `faceBrowShaped`; none: her own). */
function browY(s: number, shape?: FaceRigState['browShape']): number {
  const own = BROW_Y[0] + BROW_Y[1] * s + BROW_Y[2] * s * s;
  if (!shape) return own;
  const sa = (FACE_BROWS.arch[0] - FACE_BROWS.head[0]) / (FACE_BROWS.tail[0] - FACE_BROWS.head[0]);
  const line = BROW_Y[0] + (BROW_Y[1] + BROW_Y[2]) * s;
  const arch = s < sa ? smoothstep(0, sa, s) : 1 - (1 - FACE_BROW_SHAPE.tailKeep) * smoothstep(sa, 1, s);
  return mix(own, line, clamp(shape.straight, 0, 1)) + clamp(shape.arch, -1, 1) * FACE_BROW_SHAPE.arch * arch + clamp(shape.tilt, -1, 1) * FACE_BROW_SHAPE.tilt * clamp(s, 0, 1.2);
}
const browThick = (shape?: FaceRigState['browShape']): number => (shape ? 1 + clamp(shape.thick, -1, 1) * FACE_BROW_SHAPE.thick : 1);

/** How much of the lips a rest point is (0..1): the shape the tint is laid by, before the tint's own amount. */
export function faceLipAlpha(rest: readonly [number, number, number]): number {
  const f = toF(rest);
  if (!inBox(f) || f[2] <= LIP_Z_F) return 0;
  const t = Math.abs(f[0]) / FACE_LIPS.halfWidth;
  if (t >= 1) return 0;
  const bow = f[0] / FACE_LIPS.bowWidth;
  const hu = FACE_LIPS.upper * (1 - Math.pow(Math.max(t, 1e-6), FACE_LIPS.upperPower)) * (1 - FACE_LIPS.bowDip * Math.exp(-bow * bow));
  const hl = FACE_LIPS.lower * Math.pow(Math.max(1 - t * t, 1e-8), FACE_LIPS.lowerPower);
  const s = FACE_LIPS.soft / 2;
  return smoothstep(SEAM_F - hl - s, SEAM_F - hl + s, f[1]) * (1 - smoothstep(SEAM_F + hu - s, SEAM_F + hu + s, f[1]));
}

// the mouth's analytic edges and lens, in face coordinates, as faceSeamUp, faceSeamLo, faceLensEdge and faceLensDistance
const seamK = (ax: number): number => Math.min(1, (ax / FACE_MOUTH.cornerX) * (ax / FACE_MOUTH.cornerX));
const seamUpF = (ax: number): number => mix(SEAM_F, CORNER_Y_F, seamK(ax));
function seamLoF(ax: number, jaw: number): number {
  const k = seamK(ax);
  const qy = mix(SEAM_F, CORNER_Y_F, k) - HINGE_F[1];
  const qz = mix(SEAM_Z_F, CORNER_Z_F, k) - HINGE_F[2];
  const th = jaw * FACE_JAW_MAX * mix(1, MT.corner, smoothstep(MT.innerX, MT.outerX, ax));
  return HINGE_F[1] + qy * Math.cos(th) - qz * Math.sin(th);
}
function lensEdgeF(ax: number, jaw: number, side: number): number {
  const up = seamUpF(ax), lo = seamLoF(ax, jaw);
  const q = Math.sqrt(Math.max(1 - Math.pow(ax / MI.lensHalfWidth, MI.lensPower), 0));
  return 0.5 * (up + lo) + side * 0.5 * (up - lo) * q;
}
function lensDistanceF(ax: number, y: number, jaw: number): number {
  const mid = 0.5 * (seamUpF(ax) + seamLoF(ax, jaw));
  const side = y > mid ? 1 : -1;
  const b0 = lensEdgeF(ax, jaw, side);
  const slope = (lensEdgeF(ax + MI.slopeStep, jaw, side) - b0) / MI.slopeStep;
  return Math.min(side * (b0 - y) / Math.sqrt(1 + slope * slope), MI.lensHalfWidth - ax);
}
function toothRow(ax: number, d: number, gap: number, row: { readonly from: number; readonly to: number; readonly halfWidth: number; readonly opensFrom: number; readonly opensTo: number }): number {
  const reach = Math.sqrt(Math.max(1 - (ax / row.halfWidth) * (ax / row.halfWidth), 0));
  const far = row.from + (row.to - row.from) * reach;
  const e = MI.toothEdge;
  return smoothstep(row.from - e, row.from + e, d) * (1 - smoothstep(far - e, far + e, d)) * smoothstep(row.opensFrom, row.opensTo, gap);
}

/**
 * The lips' edges at `x` (rest metres) with the jaw `jaw` open, as the fragment stage works them: `up` the upper lip's
 * edge (the seam, which does not move), `lo` the lower lip's (the seam point turned by the whole jaw times the corner
 * taper), both posed rest-frame heights in metres, and the `gap` between them.
 */
export function faceMouthEdges(x: number, jaw: number): { readonly up: number; readonly lo: number; readonly gap: number } {
  const ax = Math.abs(x), j = amount(jaw, 0);
  const up = seamUpF(ax), lo = seamLoF(ax, j);
  return { up: up + O[1], lo: lo + O[1], gap: up - lo };
}

/** What the fragment stage paints of the mouth's inside at one fragment (see `faceMouthSample`). */
export interface FaceMouthSample {
  /** 0..1: how much of the mouth's inside is painted there (the lens and the inner-lip rim around it, on the curtain). */
  readonly amount: number;
  /** 0..1: how much of the lens (the opening itself, before the curtain and jaw gates), its edge 0.3 mm soft. */
  readonly lens: number;
  /** 0..1: how much of the dark inside is painted there: amount · lens · (1 - red). */
  readonly dark: number;
  /** Metres inside the lens's edge, measured across it (negative outside). */
  readonly distance: number;
  /** The gap between the lips' edges in that column, metres. */
  readonly gap: number;
  /** 0..1: the inner lips' red (the rest is the dark inside). */
  readonly red: number;
  /** 1 at the edge down to `deepShade` deep in. */
  readonly deep: number;
  /** 0..1: the upper and lower rows of teeth inside the lens (the lower already at its half strength). */
  readonly upperTeeth: number;
  readonly lowerTeeth: number;
}

/**
 * The mouth's inside at one fragment, formula for formula with the shader: `jawWeightInterpolated` is the SEAM weight as
 * interpolated across the triangle (strictly between 0 and 1 only on the curtain), `rest` the fragment's interpolated
 * rest point (its x and z are read), `jaw` how far open, `posedY` where the fragment actually is once the jaw has
 * opened (posed rest-frame height, metres).
 */
export function faceMouthSample(jawWeightInterpolated: number, rest: readonly [number, number, number], jaw: number, posedY: number): FaceMouthSample {
  const f = toF(rest);
  const ax = Math.abs(f[0]), j = amount(jaw, 0), y = posedY - O[1], w = jawWeightInterpolated;
  const gap = seamUpF(ax) - seamLoF(ax, j);
  const distance = lensDistanceF(ax, y, j);
  const curtain = smoothstep(MI.curtain[0], MI.curtain[1], w) * (1 - smoothstep(MI.curtain[2], MI.curtain[3], w));
  const lens = smoothstep(-MI.edge / 2, MI.edge / 2, distance);
  const below = y <= 0.5 * (seamUpF(ax) + seamLoF(ax, j)) ? 1 : 0; // as GLSL step(y, mid)
  const rim = smoothstep(-MI.rim, -MI.rim / 2, distance) * (1 - smoothstep(MI.lensHalfWidth - MI.rimTip, MI.lensHalfWidth - 0.0005, ax))
    * (1 - below * smoothstep(MI.rimLowFade[0], MI.rimLowFade[1], w));
  const amountOf = inBox(f) ? curtain * (f[2] < INSIDE_Z_F ? 0 : 1) * Math.max(lens, rim) * smoothstep(MI.jawFrom, MI.jawTo, j) : 0;
  const red = 1 - smoothstep(MI.redFrom, MI.redTo, distance);
  return {
    amount: amountOf,
    lens,
    dark: amountOf * lens * (1 - red),
    distance,
    gap,
    red,
    deep: mix(1, MI.deepShade, smoothstep(MI.deepFrom, MI.deepTo, distance)),
    upperTeeth: MI.upperTeeth.share * toothRow(ax, seamUpF(ax) - y, gap, MI.upperTeeth) * lens,
    lowerTeeth: MI.lowerTeeth.share * toothRow(ax, y - seamLoF(ax, j), gap, MI.lowerTeeth) * lens,
  };
}

/** How much of the mouth's inside a fragment shows: `faceMouthSample(...).amount`. */
export function faceMouthInterior(jawWeightInterpolated: number, rest: readonly [number, number, number], jaw: number, posedY: number): number {
  return faceMouthSample(jawWeightInterpolated, rest, jaw, posedY).amount;
}

// ------------------------------------------------------------------------------------------------------------------
// The colours the face lays, mirrored (2026-11-14: her eyes' and lips' colours chosen; `faceLook.ts`, the preview)

/**
 * The iris's colour (linear) at `t` of the way from its middle to its edge (0..1, the shader's `ang / IRIS_ANGLE`),
 * before its fibres: the collar, the base, the limbal ring, blended as `faceEye` blends them.
 */
export function faceIrisColour(t: number, state: Pick<FaceRigState, 'iris' | 'irisAmber' | 'irisRing' | 'irisInner' | 'irisSplit'>): [number, number, number] {
  return irisAt(t, settingOf({ jaw: 0, gazeRight: [0, 0, 1], gazeLeft: [0, 0, 1], blink: 0, ...state }));
}
function irisAt(t: number, s: Setting): [number, number, number] {
  const amber = s.irisAmber ?? mul(s.iris, AMBER_RATIO), ring = s.irisRing ?? mul(s.iris, LIMBAL_RATIO);
  const c = irisSplitAt(s.irisSplit), a = smoothstep(c - FACE_IRIS_SPLIT.soft, c + FACE_IRIS_SPLIT.soft, t), b = smoothstep(0.80, 0.97, t);
  return [0, 1, 2].map((i) => mix(mix(amber[i], s.iris[i], a), ring[i], b)) as [number, number, number];
}

/** The lips' layer over her skin's colour `under` (linear) at a rest point: her own tint multiplied in, or a chosen colour laid. */
export function faceLipLayer(under: readonly [number, number, number], rest: readonly [number, number, number], state: FaceRigState): [number, number, number] {
  const s = settingOf(state), m = faceLipAlpha(rest);
  const own = s.lipTint ? 0 : m * s.lips, tint = s.lipTint ?? FACE_LIPS.tint;
  const c = [0, 1, 2].map((i) => under[i] * mix(1, tint[i], own)) as [number, number, number];
  if (!s.lipTint) return c;
  const shade = clamp((c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2]) / FACE_LIPS.skinLuminance, FACE_LIPS.shade[0], FACE_LIPS.shade[1]);
  const k = m * clamp(s.lips / FACE_LIPS.paintFull, 0, 1);
  return [0, 1, 2].map((i) => mix(c[i], tint[i] * shade, k)) as [number, number, number];
}

const hash11 = (p: number): number => { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); };
const fract = (x: number): number => x - Math.floor(x);
/**
 * An eye's layer over the colour `under` (linear) at a rest point, as `faceEye` draws it -- the sclera, the caruncle,
 * the iris with its fibres, the pupil, the lid's shadow and shade, the lashes -- and how wet it is (0..1). Its fibres
 * are the shader's hash worked in 64-bit floats, so a fibre may differ from the GPU's in its last place.
 */
export function faceEyeLayer(under: readonly [number, number, number], rest: readonly [number, number, number], state: FaceRigState): { colour: [number, number, number]; wet: number } {
  const f = toF(rest);
  let col: [number, number, number] = [under[0], under[1], under[2]];
  if (!inBox(f) || !(f[2] > EYE_Z_F)) return { colour: col, wet: 0 };
  const s = settingOf(state), right = f[0] < 0, eye = right ? RIGHT_F : LEFT_F, g = right ? s.gazeRight : s.gazeLeft;
  const { u, open, lid } = eyeTerms([f[0], f[1]], eye, s.blink);
  const base = mix(eye.inner[1], eye.outer[1], 0.5 * (u + 1)), bulge = 1 - u * u;
  const yUp = base + FACE_EYES.upperLid * bulge, yLo = base - FACE_EYES.lowerLid * bulge, yLid = mix(yUp, yLo + L.blinkGap, s.blink);
  const lerp3 = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  if (open > 0) {
    let e = lerp3(FACE_LOOK.sclera, FACE_LOOK.sclera.map((c, i) => c * FACE_LOOK.scleraCorner[i]), smoothstep(0.35, 1, Math.abs(u)));
    e = lerp3(e, FACE_LOOK.caruncle, 1 - smoothstep(-0.9, -0.8, u));
    const dx = f[0] - eye.centre[0], dy = f[1] - eye.centre[1], r2 = dx * dx + dy * dy;
    if (r2 < EYE_R * EYE_R) {
      const nz = Math.sqrt(EYE_R * EYE_R - r2), nrm: V3 = [dx / EYE_R, dy / EYE_R, nz / EYE_R];
      const ang = Math.acos(clamp(nrm[0] * g[0] + nrm[1] * g[1] + nrm[2] * g[2], -1, 1));
      let rt: V3 = [g[2], 0, -g[0]]; // cross((0, 1, 0), g)
      const rl = Math.hypot(rt[0], rt[1], rt[2]);
      rt = rl * rl > 1e-6 ? [rt[0] / rl, rt[1] / rl, rt[2] / rl] : [1, 0, 0];
      const up: V3 = [g[1] * rt[2] - g[2] * rt[1], g[2] * rt[0] - g[0] * rt[2], g[0] * rt[1] - g[1] * rt[0]];
      const a = Math.atan2(nrm[0] * up[0] + nrm[1] * up[1] + nrm[2] * up[2], nrm[0] * rt[0] + nrm[1] * rt[1] + nrm[2] * rt[2] + 1e-6);
      const iris = irisAt(ang / IRIS_ANGLE, s);
      const fib = (a + Math.PI) * (FACE_LOOK.fibres / (2 * Math.PI)), fi = Math.floor(fib);
      const h = mix(hash11(fi % FACE_LOOK.fibres), hash11((fi + 1) % FACE_LOOK.fibres), smoothstep(0.3, 0.7, fract(fib)));
      const k = 1 + FACE_LOOK.fibreContrast * (2 * h - 1);
      e = lerp3(e, iris.map((c) => c * k), 1 - smoothstep(IRIS_ANGLE - 0.03, IRIS_ANGLE + 0.03, ang));
      const pa = Math.asin(Math.min(s.pupil / EYE_R, 0.95));
      e = lerp3(e, FACE_LOOK.pupil, 1 - smoothstep(pa - 0.025, pa + 0.025, ang));
    }
    const sh = 1 - L.shadowShade * smoothstep(yLid - L.shadow, yLid, f[1]);
    col = lerp3(col, e.map((c) => c * sh), open);
  }
  col = col.map((c) => c * (1 - L.lidShade * lid)) as [number, number, number];
  const fe = L.feather, th = L.lash + L.lashOuter * smoothstep(-0.2, 1, Math.min(u, 1));
  const upper = smoothstep(yLid - fe, yLid + fe, f[1]) * (1 - smoothstep(yLid + th - fe, yLid + th + fe, f[1])) * smoothstep(-1, -0.8, u) * (u >= 1 ? 0 : 1);
  const sF = (u - 1) / L.flick;
  let flick = 0;
  if (sF >= 0 && sF < 1) {
    const yb = base + s.blink * L.blinkGap + L.flickRise * sF, tf = (L.lash + L.lashOuter) * (1 - sF);
    flick = smoothstep(yb - fe, yb + fe, f[1]) * (1 - smoothstep(yb + tf - fe, yb + tf + fe, f[1]));
  }
  const lower = smoothstep(yLo - L.lowerLash - fe, yLo - L.lowerLash + fe, f[1]) * (1 - smoothstep(yLo - fe, yLo + fe, f[1]))
    * smoothstep(L.lowerFrom, L.lowerFrom + 0.15, u) * (1 - smoothstep(0.9, 1, u)) * L.lowerAlpha;
  col = lerp3(col, FACE_LOOK.lash, Math.max(Math.max(upper, flick) * L.lashAlpha, lower) * s.lashes);
  return { colour: col, wet: open };
}
