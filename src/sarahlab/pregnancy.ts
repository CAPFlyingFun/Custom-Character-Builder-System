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
 * THREE SIMPLE NUMBERS AND A COUNTER (Joshua, 2026-11-13: "keep the numbers simple and easier to understand. The
 * gameplay depending on the game, can then work with those numbers and adjust between them"; "Keep it optional, but
 * still there like my example which can save stats per character... like now... just rename the beginning and end of it
 * basically... and maybe a baby counter"). On screen her first week's belly is her START and her delivery's her BIGGEST
 * (the names kept in a save are the ones it always had: `firstWeekBump`, `deliveryBump`, `deliveryWeek`), and two are
 * new:
 *   - `afterBump`, her END: her belly % once it has settled after the birth (postpartum). A number for a game: nothing
 *     in the room is drawn from it;
 *   - `births`, her BABY COUNTER: the pregnancies she has had before this one, by what each was -- one baby, twins or
 *     triplets, since each adds its own amount to her belly. With a count, what is not typed follows THE RULE
 *     (`PREGNANCY_RULE`, below) and not the chart; null is no count -- a save from before the counter -- and her
 *     numbers are then the chart's own, as they were.
 *
 * Kept with her body in her character save (characterSaves `SavedBody.pregnancy`). A save from before held PREGNANT as
 * a body control, `pregnancyWeeks` (0 not pregnant, its approved value 40), and `legacyPregnancy` reads it.
 *
 * Pure: no three, no DOM, no storage.
 */

import { controlSpec } from '../actor/bodyShape';

export interface Pregnancy {
  /** PREGNANT on or off. */
  readonly pregnant: boolean;
  /** The exact week typed (weeks), for her belly at `weekAtBump`. */
  readonly week: number | null;
  /** The belly % that week was typed for. */
  readonly weekAtBump: number | null;
  /** Her START: her belly % in her first week of pregnancy, before it shows. */
  readonly firstWeekBump: number | null;
  /** Her BIGGEST: her belly % at delivery. */
  readonly deliveryBump: number | null;
  /** The week she delivers. */
  readonly deliveryWeek: number | null;
  /** Her END: her belly % once it has settled after the birth. */
  readonly afterBump: number | null;
  /** Her BABY COUNTER: the pregnancies she has had before this one, by what each was. Null: not counted. */
  readonly births: Births | null;
}

/** The pregnancies a woman has had, by how many babies each was. */
export interface Births { readonly single: number; readonly twins: number; readonly triplets: number }
/** A pregnancy's kind, by its babies: one, two, three. */
export const BIRTH_KINDS = Object.freeze(['single', 'twins', 'triplets'] as const);
export type BirthKind = (typeof BIRTH_KINDS)[number];
/** None yet: this is her first. */
export const NO_BIRTHS: Births = Object.freeze({ single: 0, twins: 0, triplets: 0 });

/**
 * The approved body: pregnant (as she always started), nothing typed and nothing counted -- her chart is the chart. What
 * a save from before holds, said or not, and what Sarah's look is read as (sarahLook.ts): everything measured in the
 * room was measured on this.
 */
export const PREGNANCY_DEFAULT: Pregnancy = Object.freeze({ pregnant: true, week: null, weekAtBump: null, firstWeekBump: null, deliveryBump: null, deliveryWeek: null, afterBump: null, births: null });
/**
 * As the room opens her now: not pregnant, nothing typed, and her counter at none -- her first baby, by the rule
 * (Joshua, 2026-11-13: she opens at her START size, 0%, not pregnant; "Women 1 (first baby)- start default 0%, max
 * pregnancy - 120% @ 40 weeks, final belly/postpartum size 10%").
 */
export const PREGNANCY_OPENING: Pregnancy = Object.freeze({ ...PREGNANCY_DEFAULT, pregnant: false, births: NO_BIRTHS });

/**
 * What may be typed. GAME TUNING: a week is 1 to 42 (the chart runs to 42), a belly % is the belly slider's own 0 to 200
 * (her START, her END), a SIZE runs past it (her BIGGEST, and the belly an exact week is typed for: `bellySize`, below),
 * a delivery week 13 to 42 (after week 12, when the chart's belly starts to show), each of her counter's three 0 to 20.
 * Typed to a tenth (her counter whole).
 */
export const PREGNANCY_RANGE = Object.freeze({ week: [1, 42] as const, bump: [0, 200] as const, size: [0, 200 + controlSpec('bellyDepth').max] as readonly [number, number], deliveryWeek: [13, 42] as const, births: [0, 20] as const });

/**
 * THE RULE for what is not typed, once she has a count. Joshua, 2026-11-13: "For easy figuring, let's do 10%... Women 1
 * (first baby)- start default 0%, max pregnancy - 120% @ 40 weeks, final belly/postpartum size 10%... second pregnancy
 * the max size adds +10% to both ending numbers so max 130%, ending at 20% (and if the weeks aren't set for this one, it
 * randomly picks between 38-42 weeks)". Of the twins' own bigger belly, 175% at week 37: "My rules on top". And his
 * correction the same evening, which is the rule as it stands:
 *
 *   "I meant if a woman has triplets for example, she gains +20% to her starting number vs +10% for only one baby.
 *    Single: start 5%, birth 120%, end 15, 2nd birth 130%, end 25%, 3rd birth 140%, end 35%.
 *    Twins: start 10%, birth 175%, end 25%, 2nd birth (single this time) 185%, end 35%.
 *    Triplets: start 20%, birth 180%, end 40%, 2nd birth (single this time) 190%, end 50%.
 *    Single always adds +10% to belly size for pregnancy and after, twins +15%, and triplets +20%."
 *
 * So EVERY PREGNANCY ADDS ITS OWN AMOUNT TO HER BELLY FOR GOOD (`adds`: 10% one baby, 15% twins, 20% triplets) -- to
 * where she ends after it, and to her biggest in every pregnancy from then on:
 *
 *   START    what the pregnancies she has had added (`ruleStart`): from a START of 0 -- a woman who began with more has
 *            her START typed, and it is then where she last ended
 *   END      her START and what this pregnancy adds (`ruleEnd`)
 *   BIGGEST  a first pregnancy's is what its babies need -- one baby `first`, twins and triplets the chart's own
 *            delivery bellies, 175% and 180%, which is what lets them fit -- and each pregnancy after adds its own
 *            amount to her last (baby.ts `ruleBiggest`). It does not move with her START ("start 5%, birth 120%"). A
 *            single after twins is 185%; twins after a single are too -- the twins' 175% and the 10% she had kept --
 *            which his examples do not reach ("Looks good to me"): the one reading that gives the same number
 *            whichever came first. Past the belly slider's 200% it carries over into her Depth, to 215% (`bellySize`)
 *   WEEK     when none is typed a game picks her delivery week, a whole one in `weeks` (`pickDeliveryWeek`); the room
 *            draws her chart at the middle one, the chart's own (baby.ts `DELIVERY_WEEKS`)
 *
 * After a birth a game adds one of its kind to her counter (`bornTo`) and writes her START where she ended; what is
 * blank then follows. What was typed for her BIGGEST or her END was that pregnancy's.
 *
 * GAME TUNING, his numbers; the weeks for twins and triplets a week either side of the chart's delivery week (BIOLOGICAL
 * SHAPE: twins are born around 36-37 weeks, triplets around 33-35, baby.ts). BIOLOGICAL SHAPE behind the rule, looked up
 * the same day: some belly does stay -- not her womb, which is back near its size by about 6 weeks (StatPearls,
 * "Physiology, Postpartum Changes", NBK555904), but her belly's wall (the gap between her stomach muscles still open in
 * 33% of 300 first-time mothers a year on: Sperstad 2016, Br J Sports Med 50(17):1092) and where her fat is laid (more
 * deep belly fat after a birth at the same body fat: Gunderson 2008, PMC2952441) -- and it adds up with each birth,
 * first and later alike (waist 2 to 4 cm a birth: Gunderson 2004, the CARDIA study, nature.com/articles/0802551). On
 * her belly slider 10% is about 12 mm forward (MEASURED 2026-11-13: her 20% bump stands out 24 mm).
 */
export const PREGNANCY_RULE = Object.freeze({
  /** belly %, what a pregnancy adds to her belly for good, by its babies */
  adds: Object.freeze({ 1: 10, 2: 15, 3: 20 }) as Readonly<Record<number, number>>,
  /** belly %, her BIGGEST in a first pregnancy of one baby */
  first: 120,
  /** weeks (whole, both ends in), what her delivery week is picked from, by her babies */
  weeks: Object.freeze({ 1: [38, 42], 2: [36, 38], 3: [33, 35] }) as Readonly<Record<number, readonly [number, number]>>,
});

const clampTo = (v: number, [lo, hi]: readonly [number, number]) => Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optional = (v: unknown, range: readonly [number, number]): number | null => (typeof v === 'number' && Number.isFinite(v) ? clampTo(v, range) : null);
const counted = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(PREGNANCY_RANGE.births[1], Math.max(PREGNANCY_RANGE.births[0], v))) : null);
const babiesOf = (babies: number): number => Math.min(3, Math.max(1, Math.round(Number.isFinite(babies) ? babies : 1)));
/** Her counter out of a file: each kind whole and in range, one left out none of it; anything but a record is no count. */
const readBirths = (v: unknown): Births | null => (isRecord(v) ? { single: counted(v.single) ?? 0, twins: counted(v.twins) ?? 0, triplets: counted(v.triplets) ?? 0 } : null);

/** Any record brought into range (an imported file is untrusted): a week without the % it was typed for is no week. */
export function readPregnancy(v: unknown): Pregnancy {
  if (!isRecord(v)) return PREGNANCY_DEFAULT;
  const week = optional(v.week, PREGNANCY_RANGE.week), at = optional(v.weekAtBump, PREGNANCY_RANGE.size);
  return {
    pregnant: v.pregnant !== false,
    week: week !== null && at !== null ? week : null,
    weekAtBump: week !== null && at !== null ? at : null,
    firstWeekBump: optional(v.firstWeekBump, PREGNANCY_RANGE.bump),
    deliveryBump: optional(v.deliveryBump, PREGNANCY_RANGE.size),
    deliveryWeek: optional(v.deliveryWeek, PREGNANCY_RANGE.deliveryWeek),
    afterBump: optional(v.afterBump, PREGNANCY_RANGE.bump),
    // (a record from before the counter has none: not counted, and her numbers stay the chart's)
    births: readBirths(v.births),
  };
}

/** The kind a pregnancy of this many babies is counted as. */
export const birthKind = (babies: number): BirthKind => BIRTH_KINDS[babiesOf(babies) - 1];
/** How many pregnancies she has had. */
export const birthsCount = (births: Births): number => births.single + births.twins + births.triplets;
/** Belly %, what the pregnancies she has had added to her belly between them: each its own amount. */
export const birthsAdded = (births: Births): number => PREGNANCY_RULE.adds[1] * births.single + PREGNANCY_RULE.adds[2] * births.twins + PREGNANCY_RULE.adds[3] * births.triplets;

/**
 * PAST THE BELLY SLIDER (Joshua, 2026-11-13, of a BIGGEST the rule takes over 200%: "I guess anything past the 200%
 * default slider will carry over into the extra depth slider which can go an additional +15%"). Her belly's SIZE is her
 * belly slider's %, and once that is at its top what her DEPTH control adds (actor/bodyShape.ts `bellyDepth`, to +15):
 * a size runs to 215%. Her BIGGEST is a size, and so is the belly her chart reads her week at. GAME TUNING, his
 * reckoning: a point of Depth past the slider's top for a point of size (the Depth control itself is a share of her
 * bump's own forward projection, and below the slider's top it is her shape, not her size).
 */
export function bellySize(bump: number, depth: number): number {
  const top = PREGNANCY_RANGE.bump[1], b = Math.min(top, Math.max(0, Number.isFinite(bump) ? bump : 0));
  return b < top ? b : Math.min(PREGNANCY_RANGE.size[1], top + Math.max(0, Number.isFinite(depth) ? depth : 0));
}
/** What shows her at a size (for a game): her belly slider, and what carries over into her Depth past its top. */
export function bellySetting(size: number): { readonly bump: number; readonly depth: number } {
  const top = PREGNANCY_RANGE.bump[1], s = Math.min(PREGNANCY_RANGE.size[1], Math.max(0, Number.isFinite(size) ? size : 0));
  return { bump: Math.min(top, s), depth: Math.max(0, s - top) };
}

/**
 * Her START by the rule: what the pregnancies she has had added to her belly, and no more than leaves a first baby's
 * BIGGEST its place under the top a size can be (past that, what she keeps stops adding).
 */
export function ruleStart(births: Births): number {
  return Math.min(birthsAdded(births), PREGNANCY_RANGE.size[1] - PREGNANCY_RULE.first);
}

/** Her END by the rule: her START and what a pregnancy of this many babies adds, on the belly slider. */
export function ruleEnd(start: number, babies: number): number {
  return clampTo(start + PREGNANCY_RULE.adds[babiesOf(babies)], PREGNANCY_RANGE.bump);
}

/**
 * Her delivery week when none is typed (the rule's WEEK; Joshua: "if the weeks aren't set for this one, it randomly
 * picks between 38-42 weeks"): a whole week, each as likely as the next. For a game to call when her pregnancy begins;
 * the room never picks one for her (2026-11-05: "Don't set a fixed pregnancy week tied to pregnancy on/off").
 */
export function pickDeliveryWeek(babies: number, random: () => number = Math.random): number {
  const [lo, hi] = PREGNANCY_RULE.weeks[babiesOf(babies)], r = random();
  return lo + Math.min(hi - lo, Math.floor(Math.min(1, Math.max(0, Number.isFinite(r) ? r : 0)) * (hi - lo + 1)));
}

/** Her counter with one more pregnancy of this many babies on it (from none, if she was not counted). */
export function bornTo(births: Births | null, babies: number): Births {
  const had = births ?? NO_BIRTHS, kind = birthKind(babies);
  return { ...had, [kind]: counted(had[kind] + 1) ?? 0 };
}

/**
 * One of her counter's three typed: how many pregnancies of that kind she has had (blank is none of it, once she is
 * counted). `kind` null clears her counter: no count, and her numbers are the chart's own.
 */
export function typeBirths(p: Pregnancy, kind: BirthKind | null, count: number | null): Pregnancy {
  if (kind === null) return { ...p, births: null };
  if (count === null && p.births === null) return p;
  return { ...p, births: { ...(p.births ?? NO_BIRTHS), [kind]: counted(count) ?? 0 } };
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

/** Her exact week typed (or cleared, with null) for her belly now (its size: `bellySize`). */
export function typeWeek(p: Pregnancy, week: number | null, bump: number): Pregnancy {
  return week === null ? { ...p, week: null, weekAtBump: null } : { ...p, week, weekAtBump: clampTo(bump, PREGNANCY_RANGE.size) };
}

/** True when the week typed is for this belly % (to the slider's whole percent). */
export function weekIsFor(p: Pregnancy, bump: number): boolean {
  return p.week !== null && p.weekAtBump !== null && Math.round(p.weekAtBump) === Math.round(bump);
}

/** Nothing typed that her chart is drawn from: it is the rule's for her counter, or with no count the chart itself. */
export function nothingTyped(p: Pregnancy): boolean {
  return p.week === null && p.firstWeekBump === null && p.deliveryBump === null && p.deliveryWeek === null;
}

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ordinal(n: number): string {
  const t = n % 100, u = n % 10;
  return `${n}${t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'}`;
}

/**
 * HER NUMBERS AS THE ROOM'S ONE LINE, typed or not: which pregnancy this is by her counter, and her START, her BIGGEST
 * and its week, and her END as they are in force (baby.ts `herChart`). A week not typed says so: the room draws her at
 * the middle of what a game would pick from.
 */
export function numbersLine(p: Pregnancy, inForce: { readonly firstWeekBump: number; readonly deliveryBump: number; readonly deliveryWeek: number; readonly afterBump: number }, babies: number): string {
  const whole = (v: number) => String(Math.round(v)), [lo, hi] = PREGNANCY_RULE.weeks[babiesOf(babies)];
  const which = p.births === null ? "no baby count: the chart's own" : `${ordinal(birthsCount(p.births) + 1)} pregnancy`;
  const week = p.deliveryWeek === null ? `week ${weekText(inForce.deliveryWeek)} (not typed: a game picks ${lo} to ${hi})` : `week ${weekText(inForce.deliveryWeek)}`;
  return `${which} · starts ${whole(inForce.firstWeekBump)}% · biggest ${whole(inForce.deliveryBump)}% at ${week} · ends ${whole(inForce.afterBump)}%`;
}

export function pregnantLine(p: Pregnancy): string {
  return p.pregnant ? 'PREGNANT · ON' : 'PREGNANT · OFF';
}

/** A week as the room writes it: whole when it is near one, else to a tenth. */
export function weekText(week: number): string {
  return week % 1 < 0.05 || week % 1 > 0.95 ? String(Math.round(week)) : week.toFixed(1);
}
