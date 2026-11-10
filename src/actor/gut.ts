/**
 * WHAT HER BELLY'S ORGANS HOLD, OVER TIME (Joshua, 2026-11-08: organs "that can tie into later the NPC/AI, and human
 * stats like for food, hygiene, water"). The numbers the NPC brain (P6) reads, kept with the organs that hold them:
 *
 *   eaten / drunk -> STOMACH -> INTESTINES -> COLON -> RECTUM   (hunger; the bathroom need, #2)
 *                     water absorbed -> HER BODY'S WATER -> KIDNEYS -> BLADDER   (thirst; the bathroom need, #1)
 *
 * Each step is first-order (a share of what is there moves on each hour), at the rates measured in people; the room's
 * organs are drawn from the same numbers (actor/abdominalOrgans.ts, actor/pelvicOrgans.ts). Hygiene is not an organ's:
 * it comes later with her skin.
 *
 * Every number is MEASURED (a source in its comment) or GAME TUNING. Pure: no three, no DOM, no clock of its own --
 * `stepGut` is told how many hours pass.
 */
import { BLADDER } from './pelvicOrgans';
import { INTESTINES, RECTUM, STOMACH } from './abdominalOrgans';

export const GUT = Object.freeze({
  /** Half of a drink leaves the stomach in about 15 minutes, half of a solid meal in about 1.5 hours. MEASURED (gastric
   * emptying scintigraphy norms: liquids t1/2 10-20 min; solids t1/2 about 60-120 min; e.g.
   * https://en.wikipedia.org/wiki/Gastric_emptying). */
  waterHalfH: 0.25,
  foodHalfH: 1.5,
  /** Food through the small intestine in about 4 hours (MEASURED: small-bowel transit 2-6 h); what reaches the colon is
   * a small share of what was eaten, by the time it is stool (MEASURED: about 100-200 g of stool a day from about 2 kg
   * of food and drink; GAME TUNING the share, 0.08). */
  intestineMeanH: 4,
  toStoolShare: 0.08,
  /** Through the colon in about 35 hours (MEASURED: mean colonic transit about 30-40 h, a little longer in women). */
  colonMeanH: 35,
  /** Her body's water: about half her weight in a woman (MEASURED, https://en.wikipedia.org/wiki/Body_water). Thirst
   * from about 1% of it lost, strong by 2% (MEASURED: thirst at about 1-2% dehydration). */
  waterShare: 0.5,
  thirstFrom: 0.01,
  thirstFull: 0.02,
  /** Water lost through her skin and breath, about 800 mL a day at rest (MEASURED: insensible loss 700-1000 mL/day). */
  insensibleMlH: 33,
  /** Urine: about 1 mL per kg an hour when she is well watered (MEASURED: normal output 0.5-1.5 mL/kg/h; below 0.5 is too
   * little), the kidneys passing on extra water within a couple of hours (GAME TUNING: half of a surplus in 1.5 h), never
   * less than 0.4 mL/kg/h (MEASURED: the least the body can pass to clear its waste, about 400-500 mL a day). */
  urineMlKgH: 1,
  urineLeastMlKgH: 0.4,
  surplusHalfH: 1.5,
  /** Hunger: none with a full stomach, full once it and most of the small intestine are empty. GAME TUNING (hunger
   * follows the stomach emptying and blood sugar falling a few hours after a meal). */
  satedMl: 600,
  /** Her weight, kg (the room's Sarah: GAME TUNING; the rates scale by it). */
  kg: 60,
});

export interface GutState {
  /** in her stomach: water and food, mL */
  stomachWaterMl: number;
  stomachFoodMl: number;
  /** in her small intestine past what it always holds, mL (a meal on its way) */
  intestineMl: number;
  /** in her colon on its way, mL; in her rectum, mL */
  colonMl: number;
  rectumMl: number;
  /** her body's water: above (+) or below (-) well watered, mL */
  waterMl: number;
  /** in her bladder, mL */
  bladderMl: number;
}

export const restingGut = (): GutState => ({ stomachWaterMl: 100, stomachFoodMl: 150, intestineMl: 0, colonMl: 150, rectumMl: 20, waterMl: 0, bladderMl: BLADDER.defaultMl });

const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));
/** How much of `amount` moves on in `h` hours at a half-life of `half` hours. */
const moved = (amount: number, half: number, h: number) => amount * (1 - Math.pow(0.5, h / half));

/** Urine made an hour now, mL: her kidneys at their usual rate when well watered, more with water to spare, less short. */
export function urineMlH(waterMl: number, kg: number = GUT.kg): number {
  const usual = GUT.urineMlKgH * kg, least = GUT.urineLeastMlKgH * kg;
  if (waterMl >= 0) return usual + waterMl * (1 - Math.pow(0.5, 1 / GUT.surplusHalfH));
  // (short of water the kidneys hold it back, down to the least they can pass, by 2% lost)
  const short = clamp01(-waterMl / (GUT.thirstFull * GUT.waterShare * kg * 1000));
  return usual + (least - usual) * short;
}

/** She eats `foodMl` and drinks `waterMl` (into her stomach, up to the most it holds). */
export function eat(s: GutState, foodMl: number, waterMl = 0): GutState {
  const room = Math.max(0, STOMACH.mostMl - s.stomachFoodMl - s.stomachWaterMl), f = Math.min(room, Math.max(0, foodMl)), w = Math.min(room - f, Math.max(0, waterMl));
  return { ...s, stomachFoodMl: s.stomachFoodMl + f, stomachWaterMl: s.stomachWaterMl + w };
}

/** `hours` pass (stepped in pieces of at most 6 minutes). */
export function stepGut(s: GutState, hours: number, kg: number = GUT.kg): GutState {
  let out = { ...s }, left = Math.max(0, Number.isFinite(hours) ? hours : 0);
  while (left > 1e-9) {
    const h = Math.min(0.1, left); left -= h;
    const w = moved(out.stomachWaterMl, GUT.waterHalfH, h), f = moved(out.stomachFoodMl, GUT.foodHalfH, h);
    const i = out.intestineMl * (1 - Math.exp(-h / GUT.intestineMeanH)), c = out.colonMl * (1 - Math.exp(-h / GUT.colonMeanH));
    const urine = urineMlH(out.waterMl, kg) * h;
    out = {
      stomachWaterMl: out.stomachWaterMl - w, stomachFoodMl: out.stomachFoodMl - f,
      intestineMl: out.intestineMl + f - i, colonMl: out.colonMl + i * GUT.toStoolShare - c,
      rectumMl: Math.min(RECTUM.mostMl, out.rectumMl + c),
      // (a drink's water is taken up as it reaches the intestine; food brings its own water too, as about half of it)
      waterMl: out.waterMl + w + 0.5 * i - urine - GUT.insensibleMlH * h,
      bladderMl: Math.min(BLADDER.mostMl, out.bladderMl + urine),
    };
  }
  return out;
}

/** She empties her bladder; her bowel. */
export const pee = (s: GutState): GutState => ({ ...s, bladderMl: 5 });
export const poop = (s: GutState): GutState => ({ ...s, rectumMl: 0 });

/** What the NPC brain reads, each 0 (none) .. 1 (at its most): hunger, thirst, and the two bathroom needs. */
export interface GutNeeds { readonly hunger: number; readonly thirst: number; readonly bladder: number; readonly bowel: number }
export function gutNeeds(s: GutState, kg: number = GUT.kg): GutNeeds {
  const water = GUT.waterShare * kg * 1000, lost = -s.waterMl / water;
  const [urgeFrom, urgeFull] = BLADDER.urgeMl;
  return {
    hunger: clamp01(1 - (s.stomachFoodMl + 0.5 * s.intestineMl) / GUT.satedMl),
    thirst: clamp01((lost - GUT.thirstFrom * 0.5) / (GUT.thirstFull - GUT.thirstFrom * 0.5)),
    // (felt from about half the urge's start, at its most by the top of it)
    bladder: clamp01((s.bladderMl - urgeFrom / 2) / (urgeFull - urgeFrom / 2)),
    bowel: clamp01((s.rectumMl - RECTUM.feelMl) / (RECTUM.urgeMl * 1.6 - RECTUM.feelMl)),
  };
}

/** Hours until her bladder reaches the start of the urge (300 mL) at the rate her kidneys make urine now (Infinity: never). */
export function hoursToBladderUrge(s: GutState, kg: number = GUT.kg): number {
  const rate = urineMlH(s.waterMl, kg), need = BLADDER.urgeMl[0] - s.bladderMl;
  return need <= 0 ? 0 : rate > 0 ? need / rate : Infinity;
}

/** The organs' fill as drawn from a gut state: the stomach all it holds; the intestines their rest plus a meal on its way;
 * the colon's fill 0..1 (0 at none, 1 at two days of stool, about 300 mL: GAME TUNING); the rectum. */
export function drawnFill(s: GutState): { stomachMl: number; intestineMl: number; colonFill: number; rectumMl: number } {
  return { stomachMl: s.stomachFoodMl + s.stomachWaterMl, intestineMl: INTESTINES.restMl + s.intestineMl, colonFill: clamp01(s.colonMl / 300), rectumMl: s.rectumMl };
}
