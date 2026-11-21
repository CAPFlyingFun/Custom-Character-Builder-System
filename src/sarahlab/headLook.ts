/**
 * HER HEAD'S LOOK, AS NUMBERS (Joshua, 2026-11-14: "making the eye color adjustable and more hairstyles and colors so we
 * can do Lena and add more of a customizable character, as it's kind of limited hair and face wise to one look"; "create
 * different hairstyles, hair length and color, different face types, eye and lip colors").
 *
 * One record a character: her hair (which style, how long, what colour), her eyes, her brows, her lips, her lashes and
 * the shape of her face. It is what a character's save keeps of her head and what a game is handed (stats and numbers:
 * CLAUDE.md), and it is the one place the parts that draw her head agree on what a look IS -- her hair's material
 * (`hairMaterial.ts`), her face's layer (`faceRig.ts`), her face's shapes (`faceShapes.ts`), the room's FACE tab.
 *
 * A COLOUR IS `null` OR '#rrggbb'. `null` is HER OWN: what the part drew before it could be chosen (her hair's baked
 * copper, her hazel eyes, her lips' own tint), by the part's own numbers and not through a conversion -- so a look with
 * every colour null draws exactly as the room did on 2026-11-14. A string is an sRGB colour as a colour picker gives it.
 *
 * Pure: no three.js, no DOM.
 */

/** An sRGB colour as a picker gives it ('#rrggbb', lower case), or null: the part's own. */
export type LookColour = string | null;

export interface HairLook {
  /** A hairstyle's id (`HAIR_STYLES`), or 'none': no hair on her head. */
  readonly style: string;
  /** 0..1 along the style's own range of lengths (0 its shortest, 1 its longest); a style with one length ignores it. */
  readonly length: number;
  readonly colour: LookColour;
}
export interface EyesLook {
  /** Her irises. */
  readonly colour: LookColour;
}
export interface BrowsLook {
  /** null: her brows follow her hair's colour (and, her hair's being its own, are the dark auburn they were). */
  readonly colour: LookColour;
  /** 0..1: how much brow (0 none: the sculpt's own faint paint). */
  readonly amount: number;
}
export interface LipsLook {
  readonly colour: LookColour;
  /** 0..1: how strongly her lips are tinted (0 her skin). */
  readonly amount: number;
}
/**
 * FACIAL HAIR (his: Joshua, 2026-11-21, stubble, a short beard, a full beard, a mustache and a goatee; `faceRig.ts`
 * `BEARD_STYLE_IDS`). A face with no design for it (hers) draws none whatever this says.
 */
export interface BeardLook {
  /** 'none', or one of `faceRig.ts` `BEARD_STYLE_IDS`. */
  readonly style: string;
  /** null: it follows his hair's colour, as his brows do (and, his hair's being its own, his brows' dark brown). */
  readonly colour: LookColour;
  /** 0..1: how thick it grows. */
  readonly amount: number;
}
/** No facial hair. */
export const BEARD_NONE: BeardLook = Object.freeze({ style: 'none', colour: null, amount: 1 });

/** Her face's shape: a number from -1 to 1 a slider (`faceShapes.ts` `FACE_SLIDERS`), each 0 where her sculpt is as it is. A slider not named is 0. */
export type FaceShapeLook = Readonly<Record<string, number>>;

export interface HeadLook {
  readonly hair: HairLook;
  readonly eyes: EyesLook;
  readonly brows: BrowsLook;
  readonly lips: LipsLook;
  /** 0..1: her lashes. */
  readonly lashes: number;
  readonly face: FaceShapeLook;
  /** His facial hair; absent, none (`BEARD_NONE`). */
  readonly beard?: BeardLook;
}

/** The hairstyle she has had since 2026-10-24 (`scripts/sarahV2Recovery/hair-bake.mjs`): pulled back into a ponytail, curtain bangs. */
export const HAIR_STYLE_FIRST = 'ponytail';

/** Her head as the room drew it before any of it could be chosen: every colour her own, her brows whole, her lips' tint at 55%. */
export const HEAD_DEFAULT: HeadLook = Object.freeze({
  hair: Object.freeze({ style: HAIR_STYLE_FIRST, length: 1, colour: null }),
  eyes: Object.freeze({ colour: null }),
  brows: Object.freeze({ colour: null, amount: 1 }),
  lips: Object.freeze({ colour: null, amount: 0.55 }),
  lashes: 1,
  face: Object.freeze({}),
});

/**
 * HIS head as the room first draws him (the male base model; Joshua, 2026-11-21): a crew cut in a dark brown, clean-shaven,
 * the rest as hers (his face's own brows, lashes and lips are his face's: `maleFace.ts`). GAME TUNING.
 */
export const HEAD_DEFAULT_MALE: HeadLook = Object.freeze({
  hair: Object.freeze({ style: 'crew', length: 1, colour: '#3b2a20' }),
  eyes: Object.freeze({ colour: null }),
  brows: Object.freeze({ colour: null, amount: 1 }),
  lips: Object.freeze({ colour: null, amount: 0.55 }),
  lashes: 1,
  face: Object.freeze({}),
});
/** A body's own head: his, or hers. */
export const headDefault = (male: boolean): HeadLook => (male ? HEAD_DEFAULT_MALE : HEAD_DEFAULT);

const unit = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
/** A colour from untrusted data: '#rrggbb' in lower case, or null (her own) for anything else. */
export function lookColour(v: unknown): LookColour {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}
/** '#rrggbb' as three sRGB numbers 0..1. */
export function colourRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/** ...and as LINEAR light, as a shader takes a colour (three works in linear light: `faceRig.ts`). */
export function colourLinear(hex: string): [number, number, number] {
  return colourRgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
}
/** Three sRGB numbers 0..1 as '#rrggbb'. */
export function rgbColour(rgb: readonly [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A head's look from untrusted data (a save, a shared character): what is missing or wrong is `HEAD_DEFAULT`'s, so a
 * character saved before her head could be chosen has the head she had. A face slider's number is held to -1..1; a
 * slider's NAME is kept as it is (the shapes know which they have: one they do not is nothing).
 */
export function normaliseHead(v: unknown, base: HeadLook = HEAD_DEFAULT): HeadLook {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>, part = (k: string) => (o[k] && typeof o[k] === 'object' ? o[k] : {}) as Record<string, unknown>;
  const hair = part('hair'), eyes = part('eyes'), brows = part('brows'), lips = part('lips'), face = part('face'), beard = part('beard');
  const HEAD_DEFAULT = base;
  // a colour left out is the body's own; one there, even null, is what was kept
  const kept = (p: Record<string, unknown>, own: LookColour): LookColour => ('colour' in p ? lookColour(p.colour) : own);
  const shape: Record<string, number> = {};
  for (const [k, x] of Object.entries(face)) if (typeof x === 'number' && Number.isFinite(x) && x !== 0 && /^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(k)) shape[k] = Math.min(1, Math.max(-1, x));
  return {
    hair: { style: typeof hair.style === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(hair.style) ? hair.style : HEAD_DEFAULT.hair.style, length: unit(hair.length, HEAD_DEFAULT.hair.length), colour: kept(hair, HEAD_DEFAULT.hair.colour) },
    eyes: { colour: lookColour(eyes.colour) },
    brows: { colour: lookColour(brows.colour), amount: unit(brows.amount, HEAD_DEFAULT.brows.amount) },
    lips: { colour: lookColour(lips.colour), amount: unit(lips.amount, HEAD_DEFAULT.lips.amount) },
    lashes: unit(o.lashes, HEAD_DEFAULT.lashes),
    face: shape,
    ...beardOf(beard),
  };
}
/** Facial hair from untrusted data: kept only when it is not `BEARD_NONE` (a look without any is exactly as before). */
function beardOf(b: Record<string, unknown>): { beard?: BeardLook } {
  const style = typeof b.style === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(b.style) ? b.style : BEARD_NONE.style;
  const look: BeardLook = { style, colour: lookColour(b.colour), amount: unit(b.amount, BEARD_NONE.amount) };
  return look.style === BEARD_NONE.style && look.colour === null && look.amount === BEARD_NONE.amount ? {} : { beard: look };
}
/** Whether a look is the body's own head (`HEAD_DEFAULT`, or his) in every part (a save need not keep it). */
export function isDefaultHead(h: HeadLook, base: HeadLook = HEAD_DEFAULT): boolean {
  const d = base, b = h.beard ?? BEARD_NONE;
  return h.hair.style === d.hair.style && h.hair.length === d.hair.length && h.hair.colour === d.hair.colour && h.eyes.colour === null && h.brows.colour === null && h.brows.amount === d.brows.amount
    && h.lips.colour === null && h.lips.amount === d.lips.amount && h.lashes === d.lashes && Object.values(h.face).every((x) => x === 0)
    && b.style === BEARD_NONE.style && b.colour === null && b.amount === BEARD_NONE.amount;
}
