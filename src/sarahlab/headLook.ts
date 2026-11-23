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
  /** Her irises (with an inner ring of its own: their OUTER colour). */
  readonly colour: LookColour;
  /**
   * A TWO-TONE IRIS (Joshua, 2026-11-22, for GDM's Mary: "Two-tone iris (inner ring colour + outer colour) for hazel
   * eyes"): the ring round her pupil in a colour of its own. Absent or null: the ring her eye colour gives, as before.
   */
  readonly inner?: LookColour;
  /** 0..1: how far out that ring reaches (0.5, or absent: as before). */
  readonly innerSize?: number;
}
export interface BrowsLook {
  /** null: her brows follow her hair's colour (and, her hair's being its own, are the dark auburn they were). */
  readonly colour: LookColour;
  /** 0..1: how much brow (0 none: the sculpt's own faint paint). */
  readonly amount: number;
  /**
   * THEIR SHAPE (2026-11-22: "Brow shape per character (arch height, straightness), not only colour and thickness";
   * `faceRig.ts` `FACE_BROW_SHAPE`), each absent or 0 as before: ARCH -1..1 (lower and flatter .. higher), STRAIGHT 0..1
   * (her own curve .. a straight line), TILT -1..1 (tail down .. up), THICK -1..1 (thinner .. heavier).
   */
  readonly arch?: number;
  readonly straight?: number;
  readonly tilt?: number;
  readonly thick?: number;
}
/** FRECKLES (2026-11-22: "Freckles / skin marks in the face layer: amount, colour, size, area (nose, cheeks, forehead, shoulders)"). */
export interface MarksLook {
  /** 0..1: how many (0 none). */
  readonly amount: number;
  /** 0..1: how big (`faceRig.ts` `FACE_MARKS.size`). */
  readonly size: number;
  /** null: a warm light brown (`faceLook.ts` `MARK_COLOUR`). */
  readonly colour: LookColour;
  readonly nose: boolean;
  readonly cheeks: boolean;
  readonly forehead: boolean;
  readonly shoulders: boolean;
}
/** No freckles: what the FACE tab starts from when they are first given an amount. */
export const MARKS_NONE: MarksLook = Object.freeze({ amount: 0, size: 0.5, colour: null, nose: true, cheeks: true, forehead: false, shoulders: false });
/**
 * THE FACE'S DETAILS (2026-11-22: "Deeper face realism: eyelid crease, deep-set eyes, smile lines, philtrum"), 0..1 each,
 * painted as shade (`faceRig.ts` `FACE_DETAIL`). Deep-set eyes are a face slider (`face.eyeDepth`: their shape, and its
 * shade with it).
 */
export interface DetailLook {
  readonly crease: number;
  readonly smile: number;
  readonly philtrum: number;
}
export const DETAIL_NONE: DetailLook = Object.freeze({ crease: 0, smile: 0, philtrum: 0 });
/**
 * A PICTURE OF HIS OWN ON HER SKIN (2026-11-22: "A per-character skin overlay picture (UV decal) saved with the
 * character, for face detail"): laid over the skin she wears, in her skin's own layout, `amount` of it (0..1). `image`
 * is its id in the device's store (`pictureStore.ts`); an exported character takes the picture with it.
 */
export interface OverlayLook {
  readonly image: string;
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
  /** Freckles; absent, none (`MARKS_NONE`). */
  readonly marks?: MarksLook;
  /** The face's details; absent, none (`DETAIL_NONE`). */
  readonly detail?: DetailLook;
  /** A picture over her skin; absent, none. */
  readonly overlay?: OverlayLook;
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
  const hair = part('hair'), eyes = part('eyes'), brows = part('brows'), lips = part('lips'), face = part('face'), beard = part('beard'), marks = part('marks'), detail = part('detail'), overlay = part('overlay');
  const HEAD_DEFAULT = base;
  // a colour left out is the body's own; one there, even null, is what was kept
  const kept = (p: Record<string, unknown>, own: LookColour): LookColour => ('colour' in p ? lookColour(p.colour) : own);
  const shape: Record<string, number> = {};
  for (const [k, x] of Object.entries(face)) if (typeof x === 'number' && Number.isFinite(x) && x !== 0 && /^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(k)) shape[k] = Math.min(1, Math.max(-1, x));
  return {
    hair: { style: typeof hair.style === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(hair.style) ? hair.style : HEAD_DEFAULT.hair.style, length: unit(hair.length, HEAD_DEFAULT.hair.length), colour: kept(hair, HEAD_DEFAULT.hair.colour) },
    eyes: { colour: lookColour(eyes.colour), ...innerOf(eyes) },
    brows: { colour: lookColour(brows.colour), amount: unit(brows.amount, HEAD_DEFAULT.brows.amount), ...browShapeOf(brows) },
    lips: { colour: lookColour(lips.colour), amount: unit(lips.amount, HEAD_DEFAULT.lips.amount) },
    lashes: unit(o.lashes, HEAD_DEFAULT.lashes),
    face: shape,
    ...beardOf(beard),
    ...marksOf(marks),
    ...detailOf(detail),
    ...overlayOf(overlay),
  };
}
const signed = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(-1, v)) : 0);
/** A two-tone iris's parts, each kept only where it is not as before. */
function innerOf(e: Record<string, unknown>): { inner?: LookColour; innerSize?: number } {
  const inner = lookColour(e.inner), size = unit(e.innerSize, 0.5);
  return { ...(inner ? { inner } : {}), ...(size !== 0.5 ? { innerSize: size } : {}) };
}
/** A brow's shape, each number kept only where it is not 0. */
function browShapeOf(b: Record<string, unknown>): { arch?: number; straight?: number; tilt?: number; thick?: number } {
  const arch = signed(b.arch), straight = unit(b.straight, 0), tilt = signed(b.tilt), thick = signed(b.thick);
  return { ...(arch ? { arch } : {}), ...(straight ? { straight } : {}), ...(tilt ? { tilt } : {}), ...(thick ? { thick } : {}) };
}
/** Freckles, kept only when they are not `MARKS_NONE`. */
function marksOf(m: Record<string, unknown>): { marks?: MarksLook } {
  const flag = (k: keyof MarksLook) => (typeof m[k] === 'boolean' ? m[k] as boolean : MARKS_NONE[k] as boolean);
  const look: MarksLook = { amount: unit(m.amount, 0), size: unit(m.size, MARKS_NONE.size), colour: lookColour(m.colour), nose: flag('nose'), cheeks: flag('cheeks'), forehead: flag('forehead'), shoulders: flag('shoulders') };
  return sameMarks(look, MARKS_NONE) ? {} : { marks: look };
}
const sameMarks = (a: MarksLook, b: MarksLook): boolean => a.amount === b.amount && a.size === b.size && a.colour === b.colour && a.nose === b.nose && a.cheeks === b.cheeks && a.forehead === b.forehead && a.shoulders === b.shoulders;
/** The face's details, kept only when one is not 0. */
function detailOf(d: Record<string, unknown>): { detail?: DetailLook } {
  const look: DetailLook = { crease: unit(d.crease, 0), smile: unit(d.smile, 0), philtrum: unit(d.philtrum, 0) };
  return look.crease || look.smile || look.philtrum ? { detail: look } : {};
}
/** A picture over her skin: an id as the device's store makes them (16 hex), and how much of it. */
function overlayOf(o: Record<string, unknown>): { overlay?: OverlayLook } {
  return typeof o.image === 'string' && /^[0-9a-f]{16}$/.test(o.image) ? { overlay: { image: o.image, amount: unit(o.amount, 1) } } : {};
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
    && b.style === BEARD_NONE.style && b.colour === null && b.amount === BEARD_NONE.amount
    && !h.eyes.inner && (h.eyes.innerSize ?? 0.5) === 0.5 && !h.brows.arch && !h.brows.straight && !h.brows.tilt && !h.brows.thick
    && sameMarks(h.marks ?? MARKS_NONE, MARKS_NONE) && !h.detail?.crease && !h.detail?.smile && !h.detail?.philtrum && !h.overlay;
}
