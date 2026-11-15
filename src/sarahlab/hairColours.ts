/**
 * HER HAIR'S COLOUR, WORKED OUT FROM ITS TEXTURE'S TONE (Joshua, 2026-11-14: "more hairstyles and colors so we can do
 * Lena" -- Lena's hair is black; "hair length and color").
 *
 * Every hairstyle's texture is baked in ONE palette, her copper (`scripts/sarahV2Recovery/hair-bake.mjs` `PAL`,
 * `strandColour(t)`): a strand's TONE t, 0 (a root, a shadowed strand) to 1 (a glint), run through four stops. That is
 * the contract with every hairstyle now and later, so a colour is not a second texture: the hair's material reads a
 * texel, takes its tone back out of the palette (`hairTone`), and draws that tone in the CHOSEN colour's own ramp
 * (`hairRamp`, `hairColourAt`). `null` is HER OWN, her baked copper untouched, and never reaches a ramp.
 *
 * ONE TABLE: `HAIR_TONE` is the bake's palette. The CPU functions here, the GLSL (`hairToneGlsl`, drawn by
 * `hairMaterial.ts`) and the tests all read it, as `faceRig.ts` builds its GLSL from its constants.
 *
 * Pure: no three.js, no DOM. Colours are '#rrggbb' strings as `headLook.ts` defines them.
 */
import { colourRgb, rgbColour } from './headLook';

type Rgb = readonly [number, number, number];

/**
 * The bake's palette and where its stops lie along the tone (MEASURED: copied from `hair-bake.mjs` `PAL` and
 * `strandColour`; sRGB numbers, written as bytes). The red alone rises along it (0.24, 0.45, 0.63, 0.80), so a texel's
 * red says where on the ramp it is: that is how a tone is read back.
 */
export const HAIR_TONE = Object.freeze({
  dark: [0.24, 0.10, 0.05] as Rgb,
  mid: [0.45, 0.20, 0.10] as Rgb,
  light: [0.63, 0.31, 0.16] as Rgb,
  glint: [0.80, 0.50, 0.30] as Rgb,
  /** The tone where the ramp reaches its mid and its light stop (dark is 0, glint 1). */
  midAt: 0.35,
  lightAt: 0.8,
});

const mix = (a: Rgb, b: Rgb, t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** The bake's `strandColour(t)`: a tone's colour in her own copper, sRGB 0..1. */
export function copperAt(t: number): [number, number, number] {
  const H = HAIR_TONE;
  return t < H.midAt ? mix(H.dark, H.mid, t / H.midAt) : t < H.lightAt ? mix(H.mid, H.light, (t - H.midAt) / (H.lightAt - H.midAt)) : mix(H.light, H.glint, (t - H.lightAt) / (1 - H.lightAt));
}

/**
 * A texel's tone, 0..1: the palette's ramp read backwards through its red (sRGB 0..1). Exact on the ramp; off it (a
 * mip texel that blended with its neighbours, a texel the encoder moved by a byte) the red is taken as it comes and
 * held to the ramp's ends.
 */
export function hairTone(srgb: Rgb): number {
  const H = HAIR_TONE, r = srgb[0];
  if (r <= H.mid[0]) return clamp01(H.midAt * (r - H.dark[0]) / (H.mid[0] - H.dark[0]));
  if (r <= H.light[0]) return H.midAt + (H.lightAt - H.midAt) * (r - H.mid[0]) / (H.light[0] - H.mid[0]);
  return clamp01(H.lightAt + (1 - H.lightAt) * (r - H.light[0]) / (H.glint[0] - H.light[0]));
}

/** A chosen colour's own ramp: four stops in LINEAR light, as a shader takes them. */
export interface HairRamp {
  readonly dark: [number, number, number];
  readonly mid: [number, number, number];
  readonly light: [number, number, number];
  readonly glint: [number, number, number];
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luma = (c: Rgb): number => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
/** The colour's own hue and chroma at a different brightness: scaled down, or (past what it can reach) mixed toward white. */
function atLuma(c: Rgb, target: number): [number, number, number] {
  const y = luma(c);
  if (target <= y) { const k = y > 1e-6 ? target / y : 0; return [c[0] * k, c[1] * k, c[2] * k]; }
  return mix(c, [1, 1, 1], clamp01((target - y) / (1 - y)));
}

/**
 * GAME TUNING, judged on `scripts/preview/hairColours.mts`'s sheet (black, blonde, white and pink read right). The
 * chosen colour is what the hair reads as overall, which on her own ramp is between its mid and its light stop (an
 * average strand's tone is about 0.65), so the LIGHT stop is the colour lifted a little, the MID 0.80 of that, the
 * DARK 0.42 of it (roots and shadowed strands), and the GLINT lifts toward white by a share of what room is left and
 * loses a quarter of its colour. A black has little room above it and a white little below: `floorDark` and
 * `sheen` keep black hair's strands apart and give it a sheen, and `ceiling` keeps a white one under pure white so its
 * glint is still lighter than its light.
 */
export const HAIR_RAMP = Object.freeze({
  lift: 0.06, midOf: 0.80, darkOf: 0.42, floorDark: 0.035, glintLift: 0.34, glintLose: 0.25, ceiling: 0.955,
});

/**
 * A chosen colour's own ramp ('#rrggbb'). dark < mid < light < glint in luminance for every colour, from black to
 * white: black keeps its strands (its dark is near black, its glint a cool grey sheen) and white keeps its strands
 * (its dark a light grey) -- neither is flat.
 */
export function hairRamp(colour: string): HairRamp {
  const R = HAIR_RAMP, c = colourRgb(colour) as Rgb, y0 = Math.min(R.ceiling, luma(c));
  const light = atLuma(c, y0 + (1 - y0) * R.lift);
  const yl = luma(light);
  const mid = atLuma(light, yl * R.midOf);
  const dark = atLuma(light, Math.max(R.floorDark, yl * R.darkOf));
  // the glint: lighter by a share of the room above, and a little less saturated (toward its own grey)
  const lifted = atLuma(light, Math.min(R.ceiling + 0.025, yl + (1 - yl) * R.glintLift)), grey = luma(lifted);
  const glint = mix(lifted, [grey, grey, grey], R.glintLose);
  return { dark: lin(dark), mid: lin(mid), light: lin(light), glint: lin(glint) };
}
const lin = (c: Rgb): [number, number, number] => [toLinear(clamp01(c[0])), toLinear(clamp01(c[1])), toLinear(clamp01(c[2]))];

/** A tone's colour on a ramp (LINEAR): the bake's piecewise ramp (`copperAt`) with the chosen ramp's stops. */
export function hairColourAt(tone: number, ramp: HairRamp): [number, number, number] {
  const H = HAIR_TONE, t = clamp01(tone);
  return t < H.midAt ? mix(ramp.dark, ramp.mid, t / H.midAt) : t < H.lightAt ? mix(ramp.mid, ramp.light, (t - H.midAt) / (H.lightAt - H.midAt)) : mix(ramp.light, ramp.glint, (t - H.lightAt) / (1 - H.lightAt));
}

/** A swatch the room offers. */
export interface HairColour { readonly id: string; readonly name: string; readonly colour: string }

/**
 * The swatches, natural first, then fashion. Her own copper is not here: it is `null`, "HER OWN", the room's first
 * choice. Each is what the hair reads as overall (its ramp lies round it). GAME TUNING, by eye on the sheet.
 */
export const HAIR_COLOURS: readonly HairColour[] = Object.freeze([
  { id: 'black', name: 'Black', colour: '#1c1b1d' },
  { id: 'dark-brown', name: 'Dark brown', colour: '#4a2f1f' },
  { id: 'chestnut', name: 'Chestnut', colour: '#6e4128' },
  { id: 'light-brown', name: 'Light brown', colour: '#8b6342' },
  { id: 'auburn', name: 'Auburn', colour: '#8a3d22' },
  { id: 'ginger', name: 'Ginger', colour: '#b5551f' },
  { id: 'strawberry-blonde', name: 'Strawberry blonde', colour: '#c98b64' },
  { id: 'golden-blonde', name: 'Golden blonde', colour: '#d3a959' },
  { id: 'ash-blonde', name: 'Ash blonde', colour: '#b9aa91' },
  { id: 'platinum', name: 'Platinum', colour: '#e6e0d0' },
  { id: 'grey', name: 'Grey', colour: '#8f9094' },
  { id: 'white', name: 'White', colour: '#f1f1ee' },
  { id: 'burgundy', name: 'Burgundy', colour: '#6b1b2e' },
  { id: 'pink', name: 'Pink', colour: '#e0709f' },
  { id: 'teal', name: 'Blue-teal', colour: '#1f8a99' },
  { id: 'purple', name: 'Purple', colour: '#6f3fa3' },
]);

/**
 * The brow that goes with a hair colour ('#rrggbb'): the hair's hue, less saturated and darker (a brow is the darker of
 * a person's hair), and never lighter than a mid brown-grey, so blonde and white hair still have brows. GAME TUNING.
 */
export const BROW_FROM_HAIR = Object.freeze({ darker: 0.62, keepColour: 0.55, lightest: 0.40, darkest: 0.07 });
export function browFromHair(colour: string): string {
  const B = BROW_FROM_HAIR, c = colourRgb(colour) as Rgb, y = luma(c);
  const grey: Rgb = [y, y, y], muted = mix(grey, c, B.keepColour);
  // a pale hair's brow is the brown-grey floor of lightness; a dark hair's is darker than it, but not past black
  const target = Math.min(B.lightest, Math.max(B.darkest, y * B.darker));
  const my = luma(muted), k = my > 1e-6 ? target / my : 0;
  return rgbColour([muted[0] * k, muted[1] * k, muted[2] * k]);
}

/** A number as a GLSL float literal. */
const f = (x: number): string => { const s = Number.isInteger(x) ? x.toFixed(1) : String(+x.toPrecision(9)); return x < 0 ? `(${s})` : s; };

/**
 * The shader's half, generated from `HAIR_TONE` (`hairMaterial.ts` draws it): `hairToneOf(r)` takes a texel's LINEAR
 * red and returns its tone exactly as `hairTone` does; `hairRampAt(t)` is `hairColourAt` on the uniforms `hairDark`,
 * `hairMid`, `hairLight`, `hairGlint` (linear).
 */
export function hairToneGlsl(): string {
  const H = HAIR_TONE;
  return `
uniform float hairTintOn;
uniform vec3 hairDark;
uniform vec3 hairMid;
uniform vec3 hairLight;
uniform vec3 hairGlint;
float hairToneOf( float linearRed ) {
	float r = linearRed <= 0.0031308 ? linearRed * 12.92 : 1.055 * pow( linearRed, 1.0 / 2.4 ) - 0.055;
	if ( r <= ${f(H.mid[0])} ) return clamp( ${f(H.midAt)} * ( r - ${f(H.dark[0])} ) / ${f(+(H.mid[0] - H.dark[0]).toPrecision(9))}, 0.0, 1.0 );
	if ( r <= ${f(H.light[0])} ) return ${f(H.midAt)} + ${f(+(H.lightAt - H.midAt).toPrecision(9))} * ( r - ${f(H.mid[0])} ) / ${f(+(H.light[0] - H.mid[0]).toPrecision(9))};
	return clamp( ${f(H.lightAt)} + ${f(+(1 - H.lightAt).toPrecision(9))} * ( r - ${f(H.light[0])} ) / ${f(+(H.glint[0] - H.light[0]).toPrecision(9))}, 0.0, 1.0 );
}
vec3 hairRampAt( float t ) {
	t = clamp( t, 0.0, 1.0 );
	if ( t < ${f(H.midAt)} ) return mix( hairDark, hairMid, t / ${f(H.midAt)} );
	if ( t < ${f(H.lightAt)} ) return mix( hairMid, hairLight, ( t - ${f(H.midAt)} ) / ${f(+(H.lightAt - H.midAt).toPrecision(9))} );
	return mix( hairLight, hairGlint, ( t - ${f(H.lightAt)} ) / ${f(+(1 - H.lightAt).toPrecision(9))} );
}`;
}
