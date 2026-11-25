/**
 * HER BREATH AND HER HEARTBEAT, DRIVEN BY WHAT SHE DOES AND HOW MUCH ENERGY SHE HAS LEFT (Joshua, 2026-11-13: "link up
 * the outer skin to the lungs during breathing so the chest and belly would naturally move in and out per breath and
 * synced to like stamina and as she runs out of stamina or uses more energy, her breathing would sync up as well as her
 * heart"). Pure: plain numbers, no three. The room steps it every frame (`stepVitals`); her lungs and heart are drawn
 * from it (sarahlab/thoraxView.ts) and her skin breathes by it (sarahlab/softBody.ts `breathAt`).
 *
 * What she is doing is an INTENSITY, 0 at rest .. 1 her hardest (a share of the most she can do, as exercise is graded
 * by a share of a person's maximum): REST, WALK, JOG, RUN, SPRINT (`ACTIVITY`). Her body follows it with a lag (EFFORT:
 * her heart and breath climb over half a minute or so and come down slower), and above her THRESHOLD her ENERGY drains;
 * below it, it comes back. Spent energy keeps her breathing hard and her heart up after she stops (she is winded), and
 * near empty her breaths come quicker and shallower and her heart drifts up. Her energy starts to come back as soon as she
 * eases off below her threshold.
 *
 * Each character breathes by HER OWN LUNGS AND HEART (`Lungs`, `Heart`, through `VitalsBody`): the female body's
 * (`FEMALE_LUNGS`, `FEMALE_HEART`: the numbers below), the male base body's (`MALE_LUNGS`, `MALE_HEART`), or her own,
 * kept with her save. Left out, the female body's: nothing breathes otherwise than it did.
 *
 * MEASURED (each number's source in its comment), or GAME TUNING where physiology gives a range and a game a number.
 */

/** Her breathing at rest, and how breathing grows with work. MEASURED: a quiet breath 0.5 L, 14 a minute
 * (actor/thoracicOrgans.ts `LUNGS.tidalMl`, `BREATH.perMinute`); her VITAL CAPACITY, all she can breathe in from all out,
 * total lung capacity less what cannot be breathed out: 4.2 - 1.1 = 3.1 L (the women's column,
 * https://en.wikipedia.org/wiki/Lung_volumes_and_capacities). GAME TUNING within physiology's ranges: in hard work a
 * breath grows to about half her vital capacity (`tidalOfVital`) and then only its rate grows; the most air she moves a
 * minute (`mostLPerMin`, a woman's, at her hardest) and the quickest she breathes (`mostPerMinute`); `tidalCurve`, how much
 * of her effort a breath has grown to its most by; `ventCurve`, how a minute's air grows with effort (faster near her
 * hardest); breathing in takes `inRest` of a breath at rest (two seconds of five, thoracicOrgans.ts `BREATH.inShare`) and
 * `inHard` at her hardest. */
export const BREATHING = Object.freeze({
  tidalL: 0.5, perMinute: 14, vitalL: 3.1, tidalOfVital: 0.55, mostLPerMin: 80, mostPerMinute: 50,
  tidalCurve: 0.6, ventCurve: 1.6, inRest: 0.4, inHard: 0.48,
});

/** Her heart. MEASURED: 70 a minute at rest (thoracicOrgans.ts `PULSE.perMinute`); a woman's peak heart rate 206 - 0.88
 * x her age (Gulati et al., "Heart rate response to exercise stress testing in asymptomatic women", Circulation 2010,
 * https://pubmed.ncbi.nlm.nih.gov/20585008/). GAME TUNING: `age`, her years when none is given; `driftMost`, how far her
 * heart drifts up as she runs out of energy while working. */
export const HEARTBEAT = Object.freeze({ restPerMinute: 70, peakAt: 206, peakPerYear: 0.88, age: 28, driftMost: 12 });

/**
 * A CHARACTER'S OWN LUNGS AND HEART (Galaxy Defender's Mary and John, 2026-11-25: "John, on the male base body, breathes
 * and beats exactly like Mary"; "Per-character lung settings, saved with the character and in its JSON export, as
 * customizable defaults (not fixed by sex)"). What `vitalsFor` and `stepVitals` take through `VitalsBody` (left out:
 * the female body's, which is everything above, number for number). A pregnancy's changes are laid on top of them, as
 * on hers. They change how much air a body moves and how fast its heart goes -- never how long it lasts: its energy
 * drains and fills by its share of its own hardest (`STAMINA`), whatever its lungs.
 */
export interface Lungs {
  /** total lung capacity, litres (all the air in them breathed all the way in) */
  readonly totalL: number;
  /** vital capacity, litres: all that can be breathed in from all the way out */
  readonly vitalL: number;
  /** a breath at rest, litres */
  readonly tidalL: number;
  /** breaths a minute at rest */
  readonly perMinute: number;
  /** the biggest a breath grows in hard work, a share of the vital capacity (past it only the rate grows) */
  readonly tidalOfVital: number;
  /** the most air moved a minute at the hardest, litres */
  readonly mostLPerMin: number;
  /** the quickest breathing, breaths a minute */
  readonly mostPerMinute: number;
}
/** A character's heart: at rest, and its peak by age (`peakAt` - `peakPerYear` x years). */
export interface Heart {
  readonly restPerMinute: number;
  readonly peakAt: number;
  readonly peakPerYear: number;
}

/** THE FEMALE BODY'S: `BREATHING` and `HEARTBEAT` above, her total lung capacity 4.2 L (MEASURED, the women's column
 * there). A character given these breathes and beats exactly as one given none. */
export const FEMALE_LUNGS: Lungs = Object.freeze({
  totalL: 4.2, vitalL: BREATHING.vitalL, tidalL: BREATHING.tidalL, perMinute: BREATHING.perMinute,
  tidalOfVital: BREATHING.tidalOfVital, mostLPerMin: BREATHING.mostLPerMin, mostPerMinute: BREATHING.mostPerMinute,
});
export const FEMALE_HEART: Heart = Object.freeze({ restPerMinute: HEARTBEAT.restPerMinute, peakAt: HEARTBEAT.peakAt, peakPerYear: HEARTBEAT.peakPerYear });

/**
 * THE MALE BASE BODY'S DEFAULTS (GAME TUNING: Galaxy Defender's numbers for John, 2026-11-25, within physiology's: a man's
 * total lung capacity 6.0 L and vital capacity 4.8, a breath at rest 0.5 -- the men's column,
 * https://en.wikipedia.org/wiki/Lung_volumes_and_capacities; 4.7 here; his biggest working breath the same 55% of his
 * vital capacity as hers, 2.6 L; the most air an untrained man moves a minute at his hardest, about 100 to 140 L; a peak
 * heart rate of 208 - 0.7 x his age, MEASURED: Tanaka, Monahan and Seals, "Age-predicted maximal heart rate revisited",
 * J. Am. Coll. Cardiol. 2001, https://pubmed.ncbi.nlm.nih.gov/11153730/; 65 a minute at rest). A default, not a rule
 * of his sex: a character keeps its own (`SavedBody.lungs`, `.heart`).
 */
export const MALE_LUNGS: Lungs = Object.freeze({ totalL: 6.0, vitalL: 4.7, tidalL: 0.5, perMinute: 14, tidalOfVital: 0.55, mostLPerMin: 120, mostPerMinute: 50 });
export const MALE_HEART: Heart = Object.freeze({ restPerMinute: 65, peakAt: 208, peakPerYear: 0.7 });

/** What each may be set to, [least, most]. GAME TUNING (wide enough for a child to an athlete, narrow enough that the
 * sums stay sane). */
export const LUNG_RANGE: Readonly<Record<keyof Lungs, readonly [number, number]>> = Object.freeze({
  totalL: [1, 10], vitalL: [0.5, 8], tidalL: [0.2, 2], perMinute: [6, 30], tidalOfVital: [0.2, 0.8], mostLPerMin: [20, 250], mostPerMinute: [20, 70],
});
export const HEART_RANGE: Readonly<Record<keyof Heart, readonly [number, number]>> = Object.freeze({
  restPerMinute: [30, 120], peakAt: [150, 240], peakPerYear: [0, 1.5],
});
export const LUNG_KEYS = Object.freeze(Object.keys(LUNG_RANGE) as (keyof Lungs)[]);
export const HEART_KEYS = Object.freeze(Object.keys(HEART_RANGE) as (keyof Heart)[]);

/** Lungs as kept: each number clamped to its range, one not given (or not a number) the `base`'s, and the vital capacity
 * never more than the total. Never throws: a save's or a game's numbers are read through it. */
export function readLungs(v: unknown, base: Lungs = FEMALE_LUNGS): Lungs {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>, out = {} as Record<keyof Lungs, number>;
  for (const k of LUNG_KEYS) { const x = o[k], [lo, hi] = LUNG_RANGE[k]; out[k] = typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : base[k]; }
  out.vitalL = Math.min(out.vitalL, out.totalL);
  return Object.freeze(out);
}
/** A heart as kept, the same way. */
export function readHeart(v: unknown, base: Heart = FEMALE_HEART): Heart {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>, out = {} as Record<keyof Heart, number>;
  for (const k of HEART_KEYS) { const x = o[k], [lo, hi] = HEART_RANGE[k]; out[k] = typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : base[k]; }
  return Object.freeze(out);
}
export const sameLungs = (a: Lungs, b: Lungs): boolean => LUNG_KEYS.every((k) => a[k] === b[k]);
export const sameHeart = (a: Heart, b: Heart): boolean => HEART_KEYS.every((k) => a[k] === b[k]);
/** The body's own: the male base body's, or the female's. */
export const lungsDefault = (male = false): Lungs => (male ? MALE_LUNGS : FEMALE_LUNGS);
export const heartDefault = (male = false): Heart => (male ? MALE_HEART : FEMALE_HEART);

/**
 * How deep a breath of `tidalL` litres is, in the drawn chest's own measure (sarahlab/thoraxView.ts `drive`: 1 a quiet
 * breath of hers, 0.5 L): the breath's share of THESE lungs' vital capacity, as that share of hers. So a man's 0.5 L
 * breath at rest moves his bigger chest less than hers, and his hardest breath -- 55% of his vital capacity, as hers --
 * as deep as hers. Hers is exactly the litres over 0.5 L, as before.
 */
export const breathDepth = (tidalL: number, lungs: Lungs = FEMALE_LUNGS): number => (tidalL * (FEMALE_LUNGS.vitalL / lungs.vitalL)) / FEMALE_LUNGS.tidalL;

/** What pregnancy does to them, at full term (eased in over her weeks, `pregnancyShare`). MEASURED ("A summary of
 * physiological changes in pregnancy", https://derangedphysiology.com/main/required-reading/obstetric-intensive-care/Chapter-301/summary-physiological-changes-pregnancy):
 * "Tidal volume increases by ~ 30-50%" (40% here), "Respiratory rate increases to 15-17" (+2 a minute), "Heart rate
 * increases (from 75 to 85-90)" (+12 a minute); the lower rib cage widens, its subcostal angle "from the normal 68.5° at
 * the beginning of pregnancy to 103.5° at term" (https://derangedphysiology.com/main/cicm-primary-exam/respiratory-system/Chapter-925/influence-pregnancy-respiratory-function).
 * GAME TUNING: `thresholdDrop`, how much lower the work she can keep up is at term; from `fromWeeks` to `fullWeeks` it
 * grows in. */
export const PREGNANT_BREATH = Object.freeze({ tidalShare: 0.4, perMinute: 2, heart: 12, thresholdDrop: 0.1, fromWeeks: 8, fullWeeks: 36 });

/** How fast her body follows what she does, and her energy. GAME TUNING (in physiology's range: a heart rate climbs to
 * a steady pace over a minute or two of steady work, and a fit heart drops by well over 12 beats in the first minute
 * after stopping -- Cole et al., NEJM 1999): `riseS`, the time her effort takes to climb most of the way (63%) to what
 * she is doing; `fallS`, to come back down; `threshold`, the share of her hardest she can keep up without tiring;
 * `drainS`, how long her hardest takes to empty her energy from full, and `drainPower`, how much faster the work drains it
 * the nearer her hardest it is (a person keeps up her hardest for some minutes and a hard run for a quarter of an hour or
 * more: her RUN empties her in about 14 minutes, her SPRINT in 5, a JOG all but never); `refillS`, how long resting takes to fill it
 * from empty; `winded`, how much of her effort spent energy keeps up after she stops; `quickMost` and `shallowMost`, how
 * much quicker and how much shallower her breaths are with no energy left; `depthS`, how long a breath's size takes to
 * follow (so a breath does not jump in the middle). */
export const STAMINA = Object.freeze({ riseS: 30, fallS: 90, threshold: 0.5, drainS: 300, drainPower: 2, refillS: 120, winded: 0.6, quickMost: 0.2, shallowMost: 0.15, depthS: 3 });

/** What she can be doing, as an intensity (a share of her hardest). GAME TUNING (an easy walk is about a third of a
 * person's most, a run most of it). */
export const ACTIVITY = Object.freeze({ rest: 0, walk: 0.3, jog: 0.55, run: 0.8, sprint: 1 });
export type Activity = keyof typeof ACTIVITY;
export const ACTIVITIES = Object.freeze(Object.keys(ACTIVITY) as Activity[]);

/** Her vitals as they stand: her effort (0..1, her body's lag behind what she does), her energy (1 full .. 0 spent),
 * how far through a breath and a beat she is (0..1), and the breath's size (litres, following what is asked). */
export interface Vitals { effort: number; energy: number; cycle: number; pulse: number; tidalL: number; drift: number }
export const restingVitals = (lungs: Lungs = FEMALE_LUNGS): Vitals => ({ effort: 0, energy: 1, cycle: 0, pulse: 0, tidalL: lungs.tidalL, drift: 0 });

/** Who she is, for her vitals: her age (years), how far into a pregnancy she is (weeks; 0 not pregnant), and her own
 * lungs and heart (each left out: the female body's, `FEMALE_LUNGS`, `FEMALE_HEART`). */
export interface VitalsBody { readonly age?: number; readonly weeks?: number; readonly lungs?: Lungs; readonly heart?: Heart }

/** What her breath and heart are this moment. */
export interface VitalsNow {
  readonly breathsPerMinute: number;
  readonly beatsPerMinute: number;
  /** a breath's size now (litres) */
  readonly tidalL: number;
  /** the air she moves a minute now (litres): a breath's size times her breaths a minute. Over her lungs' `mostLPerMin`,
   * how hard her breathing is working (a little over 1 as she runs out of energy at her hardest: quicker, shallower). */
  readonly airLPerMin: number;
  /** air in her above the end of a breath out now (litres): 0 .. `tidalL` */
  readonly breathL: number;
  /** her breath 0 (all out) .. 1 (all in) */
  readonly breath: number;
  /** her heart's squeeze 0 .. 1 */
  readonly beat: number;
  /** the share of a breath spent breathing in */
  readonly inShare: number;
  readonly effort: number;
  readonly energy: number;
  /** her effort as her breath and heart feel it: her lag behind the work, or the energy she has spent, whichever is more */
  readonly felt: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const ease = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };

/** How far a pregnancy at `weeks` has changed her breath and heart: 0 .. 1 at full term. */
export function pregnancyShare(weeks = 0): number {
  const P = PREGNANT_BREATH;
  return weeks > 0 ? ease((weeks - P.fromWeeks) / (P.fullWeeks - P.fromWeeks)) : 0;
}

/** Her breath through one cycle (`at` 0..1 of it): 0 all out .. 1 all in. Breathing in takes `inShare` of it and
 * breathing out the rest, each eased at both ends. */
export function breathOf(at: number, inShare: number = BREATHING.inRest): number {
  const c = at - Math.floor(at), inn = clamp(inShare, 0.1, 0.9);
  return c < inn ? (1 - Math.cos((Math.PI * c) / inn)) / 2 : (1 + Math.cos((Math.PI * (c - inn)) / (1 - inn))) / 2;
}

/** Her heart's squeeze through one beat (`at` 0..1): up and back over its first `squeezeShare`, slack after. */
export function beatOf(at: number, squeezeShare = 0.3): number {
  const c = at - Math.floor(at);
  return c < squeezeShare ? Math.sin((Math.PI * c) / squeezeShare) : 0;
}

/** A peak heart rate (a minute) at `age`, by a heart's own formula (hers: 206 - 0.88 x her age). */
export const peakHeart = (age: number = HEARTBEAT.age, heart: Heart = FEMALE_HEART): number => heart.peakAt - heart.peakPerYear * clamp(age, 12, 90);

/** What her breath and heart are for a FELT effort (0..1) and her energy, as she is (not stepped: what `stepVitals`
 * asks), by her own lungs and heart (`body.lungs`, `body.heart`; left out, the female body's). */
export function vitalsFor(felt: number, energy: number, body: VitalsBody = {}): { breathsPerMinute: number; tidalL: number; airLPerMin: number; beatsPerMinute: number; inShare: number } {
  const B = BREATHING, L = body.lungs ?? FEMALE_LUNGS, H = body.heart ?? FEMALE_HEART, P = PREGNANT_BREATH, S = STAMINA, p = pregnancyShare(body.weeks), e = clamp(felt, 0, 1), spent = 1 - clamp(energy, 0, 1);
  // a breath at rest and her rate, pregnancy's share added; what she breathes a minute grows with her effort (to no
  // less than she breathes at rest: lungs set with a small most)
  const tidalRest = L.tidalL * (1 + P.tidalShare * p), rateRest = L.perMinute + P.perMinute * p, ventRest = tidalRest * rateRest;
  const vent = ventRest + (Math.max(ventRest, L.mostLPerMin) - ventRest) * Math.pow(e, B.ventCurve);
  const tidalMost = Math.max(tidalRest, L.tidalOfVital * L.vitalL);
  let tidal = tidalRest + (tidalMost - tidalRest) * ease(e / B.tidalCurve);
  // spent: quicker, shallower
  tidal *= 1 - S.shallowMost * spent;
  const rate = clamp((vent / tidal) * (1 + S.quickMost * spent * e), 4, L.mostPerMinute);
  const rest = H.restPerMinute + P.heart * p, peak = Math.max(rest + 20, peakHeart(body.age, H));
  const beats = clamp(rest + (peak - rest) * e, 30, peak);
  return { breathsPerMinute: rate, tidalL: tidal, airLPerMin: tidal * rate, beatsPerMinute: beats, inShare: B.inRest + (B.inHard - B.inRest) * e };
}

/**
 * One step of `dt` seconds of her vitals, in place, while she does `intensity` (0..1, `ACTIVITY`): her effort follows it
 * (quicker up than down), her energy drains above her threshold and fills below it, her breath and her heart go on at
 * the rates her felt effort asks, a breath's size following smoothly. Returns what they are now.
 */
export function stepVitals(v: Vitals, dt: number, intensity: number, body: VitalsBody = {}): VitalsNow {
  const S = STAMINA, h = clamp(dt, 0, 0.5), want = clamp(intensity, 0, 1), p = pregnancyShare(body.weeks);
  if (!Number.isFinite(v.effort)) Object.assign(v, restingVitals());
  // her effort lags what she does
  const tau = want > v.effort ? S.riseS : S.fallS;
  v.effort += (want - v.effort) * (1 - Math.exp(-h / tau));
  // her energy: working above her threshold drains it (the harder her body is working, the faster); doing less than it,
  // it fills again from the moment she eases off (the less she does, the faster)
  const threshold = S.threshold - PREGNANT_BREATH.thresholdDrop * p;
  if (want >= threshold) v.energy -= (h / S.drainS) * Math.pow(Math.max(0, v.effort - threshold) / (1 - threshold), S.drainPower);
  else v.energy += (h / S.refillS) * ((threshold - want) / threshold);
  v.energy = clamp(v.energy, 0, 1);
  // what her breath and heart feel: her effort, or her spent energy keeping her winded, whichever is more
  const spent = 1 - v.energy, felt = Math.max(v.effort, S.winded * spent);
  const now = vitalsFor(felt, v.energy, body);
  // her heart drifts up as she works on with little left, and settles as she rests
  const driftWant = HEARTBEAT.driftMost * spent * clamp(v.effort / threshold, 0, 1);
  v.drift += (driftWant - v.drift) * (1 - Math.exp(-h / S.riseS));
  const beats = now.beatsPerMinute + v.drift;
  // a breath's size follows smoothly; her breath and her pulse go on
  v.tidalL += (now.tidalL - v.tidalL) * (1 - Math.exp(-h / S.depthS));
  v.cycle = (v.cycle + (h * now.breathsPerMinute) / 60) % 1;
  v.pulse = (v.pulse + (h * beats) / 60) % 1;
  const breath = breathOf(v.cycle, now.inShare);
  return {
    breathsPerMinute: now.breathsPerMinute, beatsPerMinute: beats, tidalL: v.tidalL, airLPerMin: v.tidalL * now.breathsPerMinute, breathL: v.tidalL * breath, breath,
    beat: beatOf(v.pulse), inShare: now.inShare, effort: v.effort, energy: v.energy, felt,
  };
}

/**
 * HOW MUCH OF A BREATH HER CHEST TAKES (the rest her belly), by how she lies. MEASURED (Bai et al., "Body Positions and
 * Physical Activity Levels Modulate the Ratio of Abdominal to Thoracic Breathing and Respiratory Rate in Young
 * Individuals", J. Clin. Med. 2024, https://www.mdpi.com/2077-0383/13/24/7825: two belts, at her tenth thoracic vertebra
 * and her fourth lumbar, at rest): her chest's share standing 59.5%, sitting 54.5%, on her back 43.2%, on her front
 * 47.8%. On her side: none measured (GAME TUNING, half). It holds as she works harder: her rib cage's and belly's shares
 * of each breath stay in proportion whatever the work (Aliverti et al., "Human respiratory muscle actions and control
 * during exercise", J. Appl. Physiol. 1997). Pregnancy does not move it one consistent way: one study found her extra
 * breath taken mostly by her rib cage (Gilroy, Mangura and Lavietes, Am. Rev. Respir. Dis. 1988), another her diaphragm's
 * share growing by her third trimester (LoMauro et al., J. Appl. Physiol. 2019) -- so it is kept, and her lower ribs
 * widening is drawn instead (`breathFlare`). `down`: the way down in her own frame (+y up, +z her front, +x her left).
 */
export const CHEST_SHARE = Object.freeze({ standing: 0.595, sitting: 0.545, back: 0.432, front: 0.478, side: 0.5 });
export function chestShare(down: { x: number; y: number; z: number }, seated = false): number {
  const C = CHEST_SHARE, l = Math.hypot(down.x, down.y, down.z) || 1;
  const up = Math.max(0, -down.y / l) ** 2, back = Math.max(0, -down.z / l) ** 2, front = Math.max(0, down.z / l) ** 2, side = (down.x / l) ** 2;
  const sum = up + back + front + side;
  if (!(sum > 0)) return seated ? C.sitting : C.standing;
  return (up * (seated ? C.sitting : C.standing) + back * C.back + front * C.front + side * C.side) / sum;
}

/** How much more her lower ribs swing out sideways with a breath at full term than before her pregnancy: her subcostal
 * angle opening from 68.5 to 103.5 degrees (MEASURED above) -- as the half-angle's tangent, 1.86 times. */
export const PREGNANT_FLARE = Math.tan((103.5 * Math.PI) / 360) / Math.tan((68.5 * Math.PI) / 360);
export const breathFlare = (weeks = 0): number => 1 + (PREGNANT_FLARE - 1) * pregnancyShare(weeks);

/** How far her diaphragm's domes have been pushed up at `weeks` of a pregnancy, metres: `most` (actor/thoracicOrgans.ts
 * `DIAPHRAGM_RISE`, 4 cm at term), eased in with the rest of what a pregnancy does to her breath (`pregnancyShare`). */
export const diaphragmRise = (weeks = 0, most = 0.04): number => most * pregnancyShare(weeks);
