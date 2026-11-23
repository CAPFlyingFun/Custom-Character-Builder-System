/**
 * HER FACE'S CONTROLS, AS NAMES AND LINES (Joshua, 2026-10-24: "would like to somehow add bones 🦴 in or something
 * around the mouth to open and close like talking, and maybe the illusion of the eyes being able to look around in
 * sync"). The face itself is a shader layer on her body (`faceRig.ts`) moved by a small animator (`faceMotion.ts`);
 * this is what the FACE section says about it, so a test can read it without a renderer.
 *
 * Pure.
 */
import type { EyeMode } from './faceMotion';
import { EYE_COLOURS, IRIS_INNER_COLOURS, LIP_COLOURS, MARK_COLOURS, swatchOf, type FaceSwatch } from './faceLook';
import { HAIR_COLOURS } from './hairColours';

/** The order EYES steps through: alive by default, then on the viewer, then still. */
export const EYE_MODES: readonly EyeMode[] = Object.freeze(['around', 'camera', 'ahead'] as EyeMode[]);
export function nextEyeMode(mode: EyeMode): EyeMode {
  return EYE_MODES[(EYE_MODES.indexOf(mode) + 1) % EYE_MODES.length];
}
export function eyesLine(mode: EyeMode): string {
  return `EYES · ${mode === 'around' ? 'LOOK AROUND' : mode === 'camera' ? 'AT THE CAMERA' : 'AHEAD'}`;
}

/**
 * Iris colours, LINEAR rgb as the shader takes them (the face's default is the hazel green of her reference sheet, TMB-
 * Story `assets/source/sarah-sheet.png`). The amber round the pupil and the dark rim follow whichever is chosen.
 */
export const IRIS_CHOICES: readonly { readonly name: string; readonly linear: readonly [number, number, number]; readonly swatch: string }[] = Object.freeze([
  { name: 'hazel', linear: [0.40, 0.43, 0.24], swatch: '#a9ad84' },
  { name: 'green', linear: [0.25, 0.42, 0.18], swatch: '#89ad75' },
  { name: 'brown', linear: [0.20, 0.11, 0.05], swatch: '#7c5c3e' },
  { name: 'blue', linear: [0.18, 0.28, 0.42], swatch: '#7590ad' },
  { name: 'grey', linear: [0.30, 0.33, 0.34], swatch: '#949b9e' },
]);

/** The MOUTH slider: held open, 0 to 100. */
export function mouthLine(percent: number, talking: boolean): string {
  const p = Math.round(Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0)));
  return `MOUTH · ${p === 0 ? 'closed' : `${p}% open`}${talking ? ' · and talking' : ''}`;
}
export function browsLine(percent: number): string {
  const p = Math.round(Math.max(0, Math.min(100, percent)));
  return `BROWS · ${p === 0 ? 'none (the sculpt\'s own)' : `${p}%`}`;
}
export function lipsLine(percent: number): string {
  const p = Math.round(Math.max(0, Math.min(100, percent)));
  return `LIP COLOUR · ${p === 0 ? 'her skin' : `${p}%`}`;
}

/**
 * The EYES' and LIPS' colour lines (2026-11-14: her face's colours chosen, `faceLook.ts`): HER OWN for null, else the
 * swatch's name, or the colour itself when it is a picker's and on no list.
 */
function colourLine(label: string, list: readonly FaceSwatch[], colour: string | null): string {
  return `${label} · ${colour ? (swatchOf(list, colour)?.name ?? colour.toLowerCase()) : 'her own'}`;
}
export function eyeColourLine(colour: string | null): string { return colourLine('EYE COLOUR', EYE_COLOURS, colour); }
export function lipColourLine(colour: string | null): string { return colourLine('LIP SHADE', LIP_COLOURS, colour); }

/**
 * THE HEAD PANEL'S LINES (`headPanel.ts`, 2026-11-15: hair, lashes and the shape of her face chosen). A colour line says
 * HER OWN for null, the swatch's name, or the picker's colour itself. Pure, as the lines above.
 */
export function hairColourLine(colour: string | null): string {
  return `HAIR COLOUR · ${colour ? (swatchOf(HAIR_COLOURS, colour)?.name ?? `custom ${colour.toLowerCase()}`) : 'her own'}`;
}
/** HAIR LENGTH, or why it is off: a style with one length (`hasLength` false) and no hair at all say so. */
export function hairLengthLine(percent: number, state: 'on' | 'one-length' | 'none'): string {
  if (state === 'none') return 'HAIR LENGTH · no hair';
  if (state === 'one-length') return 'HAIR LENGTH · this style has one length';
  return `HAIR LENGTH ${Math.round(Math.max(0, Math.min(100, percent)))}%`;
}
/** BROW COLOUR: null follows her hair. */
export function browColourLine(colour: string | null): string {
  return `BROW COLOUR · ${colour ? `custom ${colour.toLowerCase()}` : 'matches her hair'}`;
}
export function lashesLine(percent: number): string {
  const p = Math.round(Math.max(0, Math.min(100, percent)));
  return `LASHES · ${p === 0 ? 'none' : `${p}%`}`;
}
/** One face slider at `v` (-1..1): "NOSE WIDTH +35%", "NOSE WIDTH 0". */
export function faceSliderLine(name: string, v: number): string {
  const p = Math.round(v * 100);
  return p === 0 ? `${name} 0` : `${name} ${p > 0 ? '+' : '-'}${Math.abs(p)}%`;
}
/** A group's summary: "NOSE", or "NOSE · 2 changed". */
export function faceGroupLine(group: string, changed: number): string {
  return changed > 0 ? `${group} · ${changed} changed` : group;
}

/** His facial hair's kinds as the FACIAL HAIR chips name them (`faceRig.ts` `BEARD_STYLE_IDS`, in its order). */
export const BEARD_NAMES: Readonly<Record<string, string>> = Object.freeze({
  none: 'None', stubble: 'Stubble', short: 'Short beard', full: 'Full beard', mustache: 'Mustache', goatee: 'Goatee',
});
/** "BEARD · thickness 80%", or "BEARD · none". */
export function beardLine(style: string, percent: number): string {
  const p = Math.round(Math.max(0, Math.min(100, percent)));
  return style === 'none' ? 'BEARD · none' : `BEARD · ${BEARD_NAMES[style] ?? style} · ${p === 0 ? 'none' : `${p}% thick`}`;
}
export function beardColourLine(colour: string | null): string {
  return `BEARD COLOUR · ${colour ? (swatchOf(HAIR_COLOURS, colour)?.name ?? `custom ${colour.toLowerCase()}`) : 'matches his hair'}`;
}

// THE FACE'S DETAILS' LINES (2026-11-22, for GDM's Mary and John Fisher: freckles, a two-tone iris, a brow's shape, the
// face's details, a picture on her skin)
const pct = (v: number, lo = 0): number => Math.round(Math.max(lo, Math.min(100, Number.isFinite(v) ? v : 0)));
/** INNER RING: null is one colour, the ring her eye colour gives. */
export function eyeInnerLine(colour: string | null): string {
  return `INNER RING · ${colour ? (swatchOf(IRIS_INNER_COLOURS, colour)?.name ?? `custom ${colour.toLowerCase()}`) : 'none (one colour)'}`;
}
export function eyeInnerSizeLine(percent: number): string { return `INNER RING SIZE ${pct(percent)}%${pct(percent) === 50 ? ' (as before)' : ''}`; }
/** A brow shape's slider: ARCH, TILT, THICKNESS -100..100; STRAIGHT 0..100. */
export function browShapeLine(name: string, percent: number): string {
  const p = Math.round(Math.max(-100, Math.min(100, Number.isFinite(percent) ? percent : 0)));
  return p === 0 ? `${name} · her own` : `${name} ${p > 0 && name !== 'STRAIGHT' ? '+' : p < 0 ? '-' : ''}${Math.abs(p)}%`;
}
export function marksLine(percent: number): string { return `FRECKLES · ${pct(percent) === 0 ? 'none' : `${pct(percent)}%`}`; }
export function marksSizeLine(percent: number): string { return `FRECKLE SIZE ${pct(percent)}%`; }
export function marksColourLine(colour: string | null): string {
  return `FRECKLE COLOUR · ${colour ? (swatchOf(MARK_COLOURS, colour)?.name ?? `custom ${colour.toLowerCase()}`) : MARK_COLOURS[0].name}`;
}
/** A face detail's slider, 0..100. */
export function detailLine(name: string, percent: number): string { return `${name} · ${pct(percent) === 0 ? 'none' : `${pct(percent)}%`}`; }
/** The picture on her skin: none, the picture's name and how much of it, or kept on another device. */
export function overlayLine(state: { readonly name: string; readonly amount: number; readonly missing: boolean } | null): string {
  if (!state) return 'SKIN PICTURE · none';
  if (state.missing) return 'SKIN PICTURE · not on this device (import the character with its picture)';
  return `SKIN PICTURE · ${state.name || 'picture'} · ${pct(state.amount * 100)}%`;
}
