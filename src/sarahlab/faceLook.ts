/**
 * HER FACE'S COLOURS AS CHOICES (Joshua, 2026-11-14: "making the eye color adjustable... so we can do Lena and add more
 * of a customizable character, as it's kind of limited hair and face wise to one look"; "different face types, eye and
 * lip colors").
 *
 * The swatches the room offers for her eyes and her lips, and what a head's look (`headLook.ts`) sets on her face's
 * layer (`faceRig.ts` `FaceRigState`). A colour the look leaves as HER OWN (null) sets nothing, so the rig's own
 * default draws, exactly as before; HER OWN is not in the lists (the room shows it as the first choice).
 *
 * A picked eye colour is not handed to the shader as the iris's base. The iris is three rings -- a collar round the
 * pupil, the base, a dark limbal ring -- and her own collar and ring are her hazel base times fixed ratios. A dark
 * brown scaled by those went to a near-black disc round a black pupil (the commonest eyes in the world, and Lena's).
 * So `irisPalette` gives a picked colour its own collar, lighter and warmer the darker the eye, and solves the base so
 * that the iris's three rings, averaged over its area as the shader draws them, ARE the picked colour.
 *
 * Pure but for its import of `faceRig.ts`'s types and mirror.
 */
import { colourLinear, HEAD_DEFAULT, type HeadLook } from './headLook';
import { BEARD_STYLE_IDS, FACE_DEFAULTS, faceIrisColour, type BeardStyleId, type FaceRigState } from './faceRig';

type Rgb = [number, number, number];
export interface FaceSwatch { readonly id: string; readonly name: string; readonly colour: string }

/** The eye colours offered (sRGB as a picker gives it), light browns to near black, then hazel, greens, blues, grey, violet. GAME TUNING by eye. */
export const EYE_COLOURS: readonly FaceSwatch[] = Object.freeze([
  { id: 'brown-black', name: 'near black', colour: '#24170f' },
  { id: 'brown-dark', name: 'dark brown', colour: '#3d2516' },
  { id: 'brown', name: 'brown', colour: '#5c3920' },
  { id: 'brown-light', name: 'light brown', colour: '#7f5532' },
  { id: 'amber', name: 'amber', colour: '#a2702a' },
  { id: 'hazel', name: 'hazel', colour: '#86793f' },
  { id: 'green-hazel', name: 'green hazel', colour: '#6c7a42' },
  { id: 'green', name: 'green', colour: '#4c7a46' },
  { id: 'grey-green', name: 'grey green', colour: '#6f7f6e' },
  { id: 'blue', name: 'blue', colour: '#4f6f94' },
  { id: 'blue-light', name: 'light blue', colour: '#7fa2c6' },
  { id: 'grey', name: 'grey', colour: '#848c91' },
  { id: 'violet', name: 'violet', colour: '#6a5a88' },
].map((s) => Object.freeze(s)));

/** The lip colours offered: naturals and nudes, roses and pinks, corals, reds, berries, a plum, a dark. GAME TUNING by eye. */
export const LIP_COLOURS: readonly FaceSwatch[] = Object.freeze([
  { id: 'nude', name: 'nude', colour: '#c48f86' },
  { id: 'nude-peach', name: 'peach nude', colour: '#d29a82' },
  { id: 'rose', name: 'natural rose', colour: '#b46d6a' },
  { id: 'pink', name: 'soft pink', colour: '#d88595' },
  { id: 'mauve', name: 'mauve', colour: '#9c5e6c' },
  { id: 'coral', name: 'coral', colour: '#e06a55' },
  { id: 'red', name: 'red', colour: '#b81c28' },
  { id: 'red-brick', name: 'brick red', colour: '#8c2e24' },
  { id: 'berry', name: 'berry', colour: '#8a2244' },
  { id: 'wine', name: 'wine', colour: '#5c1828' },
  { id: 'plum', name: 'plum', colour: '#62294a' },
  { id: 'dark', name: 'deep brown', colour: '#3c1b1c' },
].map((s) => Object.freeze(s)));

/**
 * A TWO-TONE IRIS's inner ring (2026-11-22, for Mary's hazel eyes: a golden ring round the pupil, green outside it): the
 * colours offered for it, golds and ambers to browns, a green and a grey. GAME TUNING by eye on the reference.
 */
export const IRIS_INNER_COLOURS: readonly FaceSwatch[] = Object.freeze([
  { id: 'gold', name: 'gold', colour: '#bf8f45' },
  { id: 'amber', name: 'amber', colour: '#b57a2c' },
  { id: 'honey', name: 'honey', colour: '#a06c34' },
  { id: 'brown', name: 'brown', colour: '#6e4527' },
  { id: 'dark-brown', name: 'dark brown', colour: '#40291a' },
  { id: 'green', name: 'green', colour: '#7a9446' },
  { id: 'grey', name: 'grey', colour: '#9a9a8c' },
].map((s) => Object.freeze(s)));

/** FRECKLES' colours: light to dark browns and a red-brown. GAME TUNING by eye; the first is theirs when none is chosen. */
export const MARK_COLOURS: readonly FaceSwatch[] = Object.freeze([
  { id: 'warm', name: 'warm brown', colour: '#a8673f' },
  { id: 'light', name: 'light brown', colour: '#c58e62' },
  { id: 'brown', name: 'brown', colour: '#7c4a2b' },
  { id: 'dark', name: 'dark brown', colour: '#553420' },
  { id: 'red', name: 'red brown', colour: '#9c4b2f' },
].map((s) => Object.freeze(s)));
/** Freckles' colour when the look names none. */
export const MARK_COLOUR = MARK_COLOURS[0].colour;

/** A swatch by its colour, or null (her own, or a colour picked off the lists). */
export function swatchOf(list: readonly FaceSwatch[], colour: string | null): FaceSwatch | null {
  return colour ? list.find((s) => s.colour === colour.toLowerCase()) ?? null : null;
}

/**
 * The iris's rings' shares of its area as the shader blends them (`faceIrisColour` over t, weighted by the ring's area,
 * t dt): worked once from the mirror with each ring a primary, so they stay true to the shader whatever its edges are.
 */
const IRIS_SHARE: { readonly amber: number; readonly base: number; readonly ring: number } = (() => {
  const steps = 400;
  let a = 0, b = 0, r = 0, w = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps, c = faceIrisColour(t, { iris: [0, 1, 0], irisAmber: [1, 0, 0], irisRing: [0, 0, 1] });
    a += c[0] * t; b += c[1] * t; r += c[2] * t; w += t;
  }
  return { amber: a / w, base: b / w, ring: r / w };
})();
/** IRIS_PALETTE: GAME TUNING by eye on `scripts/preview/face.mts`'s sheets. */
export const IRIS_PALETTE = {
  /** The ring is the base this much (her own: 0.40, 0.37, 0.42 of her hazel). */
  ring: 0.42,
  /** The collar is the picked colour times this (her own amber over her hazel: 1.35, 0.98, 0.92: a warm shift)... */
  collar: [1.3, 1.0, 0.92] as const,
  /** ...plus this much warm light, all of it at a luminance up to `darkFrom` and none from `darkTo` (linear). */
  collarLift: [0.035, 0.018, 0.006] as const, darkFrom: 0.02, darkTo: 0.14,
  /** A picked colour darker than this (linear luminance) is lifted to it: a darker iris cannot be told from the pupil. */
  floor: 0.02,
  /** The base is never less than this share of the picked colour: a dark eye's mean is then a little over it, never a black disc. */
  baseFloor: 0.7,
} as const;

const luma = (c: readonly number[]): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** A picked colour, linear, lifted to `IRIS_PALETTE.floor` if darker (a darker iris can not be told from its pupil). */
function liftedLinear(hex: string): Rgb {
  const c = colourLinear(hex), l = luma(c), f = IRIS_PALETTE.floor;
  return l >= f ? c : (l > 1e-6 ? c.map((x) => x * f / l) : [f, f, f]) as Rgb;
}
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (e0: number, e1: number, x: number): number => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/** What a picked eye colour ('#rrggbb') is to the shader: the iris's base, its collar and its ring, linear. */
export function irisPalette(hex: string): { readonly iris: Rgb; readonly irisAmber: Rgb; readonly irisRing: Rgb } {
  const P = IRIS_PALETTE;
  let c = colourLinear(hex);
  const l = luma(c);
  if (l < P.floor) c = (l > 1e-6 ? c.map((x) => x * P.floor / l) : [P.floor, P.floor, P.floor]) as Rgb;
  const dark = 1 - smooth(P.darkFrom, P.darkTo, luma(c));
  const amber = c.map((x, i) => clamp01(x * P.collar[i] + dark * P.collarLift[i])) as Rgb;
  // the mean the eye shows = share.amber * collar + share.base * base + share.ring * ring * base = the picked colour
  const base = c.map((x, i) => clamp01(Math.max(x * P.baseFloor, (x - IRIS_SHARE.amber * amber[i]) / (IRIS_SHARE.base + IRIS_SHARE.ring * P.ring)))) as Rgb;
  return { iris: base, irisAmber: amber, irisRing: base.map((x) => x * P.ring) as Rgb };
}

/** The mean colour (linear) an iris shows over its area, its fibres aside: what `irisPalette` makes the picked colour. */
export function irisMean(state: Pick<FaceRigState, 'iris' | 'irisAmber' | 'irisRing'>): Rgb {
  const steps = 400, out: Rgb = [0, 0, 0];
  let w = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps, c = faceIrisColour(t, state);
    for (let k = 0; k < 3; k++) out[k] += c[k] * t;
    w += t;
  }
  return out.map((x) => x / w) as Rgb;
}

/**
 * The part of the face rig's state a head's look sets: each field left out where the look says HER OWN (a null colour,
 * an amount at `HEAD_DEFAULT`'s), so the rig's own default draws. Her brows take `head.brows.colour`, else
 * `browFromHair` (the colour that goes with her hair, or null), else her own.
 */
export function faceRigLook(head: HeadLook, browFromHair: string | null): Partial<FaceRigState> {
  const out: { -readonly [K in keyof FaceRigState]?: FaceRigState[K] } = {};
  // a two-tone iris: its inner ring as chosen, its outer colour the base itself (a picked colour, as dark as a pupil's
  // floor at the darkest; or her own); one colour alone: the palette, as before
  if (head.eyes.inner) {
    out.irisInner = colourLinear(head.eyes.inner);
    if (head.eyes.colour) out.iris = liftedLinear(head.eyes.colour);
  } else if (head.eyes.colour) Object.assign(out, irisPalette(head.eyes.colour));
  if (head.eyes.innerSize !== undefined && head.eyes.innerSize !== 0.5) out.irisSplit = head.eyes.innerSize;
  const b = head.brows;
  if (b.arch || b.straight || b.tilt || b.thick) out.browShape = { arch: b.arch ?? 0, straight: b.straight ?? 0, tilt: b.tilt ?? 0, thick: b.thick ?? 0 };
  const m = head.marks;
  if (m && m.amount > 0 && (m.nose || m.cheeks || m.forehead || m.shoulders)) {
    out.marks = { amount: m.amount, size: m.size, colour: colourLinear(m.colour ?? MARK_COLOUR), areas: [m.nose ? 1 : 0, m.cheeks ? 1 : 0, m.forehead ? 1 : 0, m.shoulders ? 1 : 0] };
  }
  // (deep-set eyes are a face slider: its shade comes with it, from 0 up)
  const d = head.detail, socket = Math.max(0, Math.min(1, head.face.eyeDepth ?? 0));
  if (d?.crease || d?.smile || d?.philtrum || socket > 0) out.detail = { crease: d?.crease ?? 0, socket, smile: d?.smile ?? 0, philtrum: d?.philtrum ?? 0 };
  const brow = head.brows.colour ?? browFromHair;
  if (brow) out.browColour = colourLinear(brow);
  if (head.brows.amount !== HEAD_DEFAULT.brows.amount) out.brow = head.brows.amount;
  if (head.lips.colour) out.lipTint = colourLinear(head.lips.colour);
  if (head.lips.amount !== HEAD_DEFAULT.lips.amount) out.lips = head.lips.amount;
  if (head.lashes !== HEAD_DEFAULT.lashes) out.lashes = head.lashes;
  // his facial hair: its own colour, else his brows' (which follow his hair's), else the design's own
  const beard = head.beard;
  if (beard && isBeardStyle(beard.style) && beard.style !== 'none') {
    const colour = beard.colour ?? brow;
    out.beard = { style: beard.style, amount: beard.amount, ...(colour ? { colour: colourLinear(colour) } : {}) };
  }
  return out;
}
const isBeardStyle = (id: string): id is BeardStyleId => (BEARD_STYLE_IDS as readonly string[]).includes(id);
/** (Her own amounts are the rig's: `HEAD_DEFAULT` and `FACE_DEFAULTS` agree, which a test holds.) */
export const OWN_AMOUNTS = { brow: FACE_DEFAULTS.brow, lips: FACE_DEFAULTS.lips, lashes: FACE_DEFAULTS.lashes } as const;
