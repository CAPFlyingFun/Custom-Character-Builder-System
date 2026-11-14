/**
 * HER PREGNANCY, AS NUMBERS (P5; Joshua, 2026-11-03: "being able to select a female character with a belly without it
 * automatically thinking she's pregnant just because the belly slider is say at 30%... Maybe add a toggle for that";
 * 2026-11-05: "Don't set a fixed pregnancy week tied to pregnancy on/off, lol. Instead, add a text box you can type in
 * the exact week to the % if you have an exact week for that %. Also, you could add the 1st week of pregnancy %, and the
 * delivery week %... then the game can use those numbers later").
 *
 * PREGNANT is on or off and nothing else: turning it on or off never sets a week. Her weeks are what is TYPED, each one
 * optional (null: nothing typed, the chart's is used):
 *   - `week` for `weekAtBump`: the exact week her belly stands for at that belly % (Sarah in the story: 32 weeks at 73%);
 *   - `firstWeekBump`: her belly % in her first week, before it shows (0 on the approved body; more for a woman whose
 *     belly is round without a baby in it);
 *   - `deliveryBump` at `deliveryWeek`: her belly % when she delivers, and the week (the chart's: 100% at week 40 for
 *     one baby).
 * Together they are HER CHART (baby.ts `herChart`): the room reads the week her belly stands for off it -- her baby's
 * size, her womb, her navel -- and the game can grow her along it. With nothing typed it is the chart exactly.
 *
 * Kept with her body in her character save (characterSaves `SavedBody.pregnancy`). A save from before held PREGNANT as
 * a body control, `pregnancyWeeks` (0 not pregnant, its approved value 40), and `legacyPregnancy` reads it.
 *
 * Pure: no three, no DOM, no storage.
 */

export interface Pregnancy {
  /** PREGNANT on or off. */
  readonly pregnant: boolean;
  /** The exact week typed (weeks), for her belly at `weekAtBump`. */
  readonly week: number | null;
  /** The belly % that week was typed for. */
  readonly weekAtBump: number | null;
  /** Her belly % in her first week of pregnancy. */
  readonly firstWeekBump: number | null;
  /** Her belly % at delivery. */
  readonly deliveryBump: number | null;
  /** The week she delivers. */
  readonly deliveryWeek: number | null;
}

/** The approved body: pregnant (as she always started), nothing typed. What a save from before holds, said or not. */
export const PREGNANCY_DEFAULT: Pregnancy = Object.freeze({ pregnant: true, week: null, weekAtBump: null, firstWeekBump: null, deliveryBump: null, deliveryWeek: null });
/** As the room opens her now: not pregnant, nothing typed (Joshua, 2026-11-13: she opens at her START size, 0%, not pregnant). */
export const PREGNANCY_OPENING: Pregnancy = Object.freeze({ ...PREGNANCY_DEFAULT, pregnant: false });

/**
 * What may be typed. GAME TUNING: a week is 1 to 42 (the chart runs to 42), a belly % is the belly slider's own 0 to 200,
 * a delivery week 13 to 42 (after week 12, when the chart's belly starts to show). Typed to a tenth.
 */
export const PREGNANCY_RANGE = Object.freeze({ week: [1, 42] as const, bump: [0, 200] as const, deliveryWeek: [13, 42] as const });

const clampTo = (v: number, [lo, hi]: readonly [number, number]) => Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optional = (v: unknown, range: readonly [number, number]): number | null => (typeof v === 'number' && Number.isFinite(v) ? clampTo(v, range) : null);

/** Any record brought into range (an imported file is untrusted): a week without the % it was typed for is no week. */
export function readPregnancy(v: unknown): Pregnancy {
  if (!isRecord(v)) return PREGNANCY_DEFAULT;
  const week = optional(v.week, PREGNANCY_RANGE.week), at = optional(v.weekAtBump, PREGNANCY_RANGE.bump);
  return {
    pregnant: v.pregnant !== false,
    week: week !== null && at !== null ? week : null,
    weekAtBump: week !== null && at !== null ? at : null,
    firstWeekBump: optional(v.firstWeekBump, PREGNANCY_RANGE.bump),
    deliveryBump: optional(v.deliveryBump, PREGNANCY_RANGE.bump),
    deliveryWeek: optional(v.deliveryWeek, PREGNANCY_RANGE.deliveryWeek),
  };
}

/**
 * A save from before (2026-11-03 to 11-05): PREGNANT was her body control `pregnancyWeeks` in the shape text -- 0 not
 * pregnant; left out, its approved 40, which was the fixed week and is now no week typed; any other week the one she
 * was given, which is read as typed for the belly she was saved with.
 */
export function legacyPregnancy(shapeText: string, bump: number): Pregnancy {
  let weeks: unknown;
  try { const raw = JSON.parse(shapeText) as { shape?: Record<string, unknown> }; weeks = isRecord(raw) && isRecord(raw.shape) ? raw.shape.pregnancyWeeks : undefined; } catch { weeks = undefined; }
  if (typeof weeks !== 'number' || !Number.isFinite(weeks) || weeks === 40) return PREGNANCY_DEFAULT;
  if (weeks <= 0) return { ...PREGNANCY_DEFAULT, pregnant: false };
  return { ...PREGNANCY_DEFAULT, week: clampTo(weeks, PREGNANCY_RANGE.week), weekAtBump: clampTo(Number.isFinite(bump) ? bump : 0, PREGNANCY_RANGE.bump) };
}

/** Her pregnancy from a save: its own record, or what a save from before held. */
export function pregnancyOf(saved: { readonly bump: number; readonly shape: string; readonly pregnancy?: Pregnancy }): Pregnancy {
  return saved.pregnancy ? readPregnancy(saved.pregnancy) : legacyPregnancy(saved.shape, saved.bump);
}

/**
 * A number box as typed: blank is nothing typed (null), a number is brought into range, anything else is left as it was
 * (undefined: the box is put back).
 */
export function typedNumber(text: string, range: readonly [number, number]): number | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? clampTo(v, range) : undefined;
}

/** Her exact week typed (or cleared, with null) for her belly now. */
export function typeWeek(p: Pregnancy, week: number | null, bump: number): Pregnancy {
  return week === null ? { ...p, week: null, weekAtBump: null } : { ...p, week, weekAtBump: clampTo(bump, PREGNANCY_RANGE.bump) };
}

/** True when the week typed is for this belly % (to the slider's whole percent). */
export function weekIsFor(p: Pregnancy, bump: number): boolean {
  return p.week !== null && p.weekAtBump !== null && Math.round(p.weekAtBump) === Math.round(bump);
}

/** Nothing typed: her chart is the chart. */
export function nothingTyped(p: Pregnancy): boolean {
  return p.week === null && p.firstWeekBump === null && p.deliveryBump === null && p.deliveryWeek === null;
}

export function pregnantLine(p: Pregnancy): string {
  return p.pregnant ? 'PREGNANT · ON' : 'PREGNANT · OFF';
}

/** A week as the room writes it: whole when it is near one, else to a tenth. */
export function weekText(week: number): string {
  return week % 1 < 0.05 || week % 1 > 0.95 ? String(Math.round(week)) : week.toFixed(1);
}
