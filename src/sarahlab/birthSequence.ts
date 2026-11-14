/**
 * HER BABY'S BIRTH, AS A TIMELINE (Joshua, 2026-11-02: "semi-realistic, with natural progression, movements, and
 * positioning, but remember it's a game"; one baby first, RECLINE first; a faster birth or a realistic slower one).
 *
 * One clock, in seconds of the FAST pace (REALISTIC runs the same story `REALISTIC_STRETCH` times slower), and every
 * quantity of the birth a function of it -- nothing remembered, so any moment can be shown by asking for it:
 *
 *   LABOUR     contractions come in waves; with each, her cervix opens a step (1 to 10 cm); late in it her baby's head
 *              settles down into her pelvis, onto the top of her cervix (`engage`);
 *   PUSHING    with each contraction the head moves down her canal (`down`, 0 the top of her cervix .. 1 the head's middle
 *              at her opening) and slips back a little between them, turning as it goes so the back of its head comes
 *              round to her front (`turn`);
 *   CROWNING   the head's widest part at her opening, staying there between contractions now;
 *   BIRTH      the head out, a pause (`restitution`: nothing turns -- Joshua, 2026-11-02); a last push and the body follows;
 *   AFTER      her baby out, lifted onto her and resting; her womb settling. Its cord is cut a while after it is
 *              settled on her (`cutAfter`), or sooner with CUT CORD;
 *   AFTERBIRTH the placenta (Joshua, 2026-11-03: "comes on its own after the cut, a DELIVER PLACENTA button for sooner"):
 *              a few mild contractions; it peels off her womb's wall (`separate`), slides down her canal (`placentaDown`,
 *              0 its leading edge at the top of her cervix .. 1 at her opening .. 2 all of it out), into the bowl
 *              (`bowl`); her womb settles smaller again (`afterbirth`).
 *
 * The two buttons are MOMENTS on this clock (`BirthEvents`, FAST seconds): a cut or a placenta asked for sooner than its
 * own time. Dragged back before one, it has not happened yet (the scene forgets it); with none, each comes on its own.
 *
 * WHEN one can be played at all, and WHERE it begins when she is open already (BIRTH OPENING set by hand first), are
 * at the foot of this file: `BIRTH_NEEDS`, `birthNeeds`; `birthBeginsAt`, `BirthEvents.openFrom`, `BirthMoment.held`.
 * And when her pregnancy ends with it: `pregnantAt`.
 *
 * TWINS AND TRIPLETS (P3, Joshua 2026-11-04: "use the same event/animation... it just counts the babies and knows if it
 * should play it once, twice, or more"): ONE labour, then the same pushing, crowning and birth once per baby in turn
 * (`count`). After a baby is born and lifted onto her, her opening eases back and she rests (`MULTIPLE_TIMING.between`);
 * the next baby turns head down if it lay another way (`lieTurn`: Joshua chose "turn head-down after the first is born"
 * over a bottom-first birth) and settles onto her cervix (`engage`), and comes with fewer pushes -- the way is open. Each
 * baby turns to the other side from the one before (mirrored, so each birth looks a little different). Each cord is
 * its own (a CUT CORD cuts every cord that is out); the placentas, one a baby, come after the LAST baby, one after
 * another. The top of a moment speaks for the baby whose turn it is (her opening and canal follow it); `babies` holds
 * each one's own.
 *
 * The shape of it is from how midwives describe labour (contractions every few minutes, about a minute long; the head
 * moving forward with each and back a little between until it crowns; the head turning as it passes her pelvis and back
 * once born) -- with every length GAME TUNING, much shorter than a real labour.
 */

export type BirthStage = 'labour' | 'pushing' | 'crowning' | 'birth' | 'after' | 'afterbirth';
export type BirthPace = 'fast' | 'realistic';

/** GAME TUNING: the FAST pace's seconds. */
export const BIRTH_TIMING = Object.freeze({
  /** labour: so many contractions, each `labourEvery` apart, `labourLong` of it the squeeze */
  labourCount: 5, labourEvery: 8, labourLong: 0.6,
  /** her cervix as labour starts (a share of ten centimetres) */
  cervixFrom: 0.1,
  /** her baby's head settling onto her cervix over the last `engageShare` of labour */
  engageShare: 0.45,
  /** pushing: so many contractions, each `pushEvery` apart, `pushLong` of it the push; the head slips back `slip` of a step
   * between them; by the end of pushing its middle is `pushReach` of the way to her opening (its front edge is there) */
  pushCount: 6, pushEvery: 7, pushLong: 0.6, slip: 0.35, pushReach: 0.82,
  /** crowning: so long, the head's middle eased the rest of the way to her opening, held there */
  crowning: 9,
  /** the head born over `headOut` seconds; a pause of `restitution` (no turn: the game turns it inside her); then the
   * body over `bodyOut` */
  headOut: 3, restitution: 3, bodyOut: 3,
  /** after: its first stretch as it is born (`firstStretch` seconds long), lifted onto her over `toHer`, settled on her
   * by `settle`; her opening easing back over `close` */
  firstStretch: 3.5, toHer: 4, settle: 10, close: 14,
  /** its cord cut on its own this long after it is settled on her (unless CUT CORD cuts it sooner) */
  cutAfter: 12,
  /** AFTERBIRTH: the placenta starts this long after the cut (unless DELIVER PLACENTA starts it sooner); so many mild
   * contractions (`placentaSqueeze` of a birth's), `placentaEvery` apart; it peels off her womb's wall over
   * `placentaSeparate`, comes down her canal over `placentaDown`, out of her over `placentaOut`, settles into the bowl
   * over `placentaBowl`, and her womb settles smaller over `placentaSettle` from when it is out */
  placentaAfterCut: 8, placentaContractions: 3, placentaEvery: 3.5, placentaLong: 0.6, placentaSqueeze: 0.55,
  placentaSeparate: 3, placentaDown: 4, placentaOut: 2, placentaBowl: 1.5, placentaSettle: 8,
});
/** REALISTIC is the same birth this many times slower. GAME TUNING. */
export const REALISTIC_STRETCH = 5;
/** GAME TUNING (FAST seconds): twins and triplets. After a baby is born the next one's pushing starts `between` after it
 * -- its mother's opening eased back first (`BIRTH_TIMING.close`), the next baby turning head down over `turnDown` and
 * settling onto her cervix over `engage` in the last of that rest; it comes with `pushCount` pushes and crowns over
 * `crowning` (the way is open now); the placentas come out `placentaGap` apart. */
export const MULTIPLE_TIMING = Object.freeze({ between: 18, turnDown: 4, engage: 5, pushCount: 3, crowning: 5, placentaGap: 3.5, onHerMost: 2, cutFirst: 2.5 });
// (`onHerMost`: so many lie on her; a baby past them -- a triplet's third, into the bassinet beside her -- has its cord cut
// `cutFirst` after it is born, and is lifted away only then)
/** The most babies a birth carries (the room's BABIES: one, twins, triplets). */
export const MOST_BABIES = 3;
/** How far the back of the baby's head turns, in degrees: from its place in her womb (its back to her front and LEFT,
 * 45 degrees) round to her side (90) as it comes down, all of it inside her: born facing her thigh, its shoulders one
 * above the other -- where a real birth's head turns to once it is out (restitution and external rotation, so its
 * shoulders come one under her pubic bone and one over her perineum), turned here before her opening instead (Joshua,
 * 2026-11-03: "either have it rotated before it gets to the opening, or not at all"; "to the sides with the shoulders
 * up/down"). It turns no more once out. */
export const TURN_DEG = Object.freeze({ inWomb: 45, born: 90 });

/**
 * HOW ITS HEAD AND SHOULDERS TURN: `'inside'` as above (v2's: all of it turned before her opening, Joshua 2026-11-03), or
 * `'accurate'` (v3, on her skeleton -- Joshua, 2026-11-08: "Accurate on v3"): the cardinal movements as most births go.
 * Its head turns to face her back as it comes down her pelvis (internal rotation: the back of its head round from her
 * front-left to her front) and is born facing down, the back of its head under her pubic bone; then, out of her, in the
 * pause, it turns back to line up with its shoulders and on to face her thigh (restitution and external rotation:
 * a quarter turn in all) as its shoulders turn inside her to lie one above the other; then the top shoulder comes out
 * under her pubic bone first -- its body dipped toward her tailbone -- and the bottom one after it, its body lifted
 * toward her front (`shoulderTiltDeg`), then the rest of it.
 */
export type BirthTurn = 'inside' | 'accurate';
/** GAME TUNING: how far its body dips toward her tailbone for its top shoulder and lifts toward her front for its bottom
 * one, degrees, and where in the body's push each is at its most (shares of `BIRTH_TIMING.bodyOut`); and how far its
 * head comes out before it turns, in lengths of the baby (its middle past her opening by its radius and its neck: 0.13
 * of a 51 cm baby is 6.6 cm -- its head out to its chin, its shoulders still in her) */
export const SHOULDER_TILT = Object.freeze({ down: 15, up: 20, downAt: 0.3, upAt: 0.65, headOut: 0.13 });

export interface BirthMoment {
  readonly stage: BirthStage;
  /** seconds since it began (at the pace it runs at) */
  readonly seconds: number;
  /** how hard she is contracting now (0 resting .. 1 the peak) */
  readonly contraction: number;
  /** her cervix (0 shut .. 1 ten centimetres): never less than she was open as the birth began (`BirthEvents.openFrom`) */
  readonly cervix: number;
  /** how open her opening is held, at the least, by where the birth began (`BirthEvents.openFrom`): that, until her
   * first baby's head comes out through it; none once its head is out -- from there her opening is the birth's (as wide
   * as what is passing through it, easing back after) */
  readonly held: number;
  /** her baby's head taken from its place in her womb onto the top of her cervix (0 .. 1) */
  readonly engage: number;
  /** her baby's head down her canal: 0 its middle at the top of her cervix, 1 at her opening; past 1 out of her, in
   * lengths of the baby (2 all of it out) */
  readonly down: number;
  /** the back of its head turned round from her left (degrees: 45 as it lies in her womb, 0 to her front) */
  readonly turnDeg: number;
  /** its body dipped toward her tailbone (below 0) or lifted toward her front as its shoulders come out, degrees (the
   * `'accurate'` turn's; 0 otherwise) */
  readonly shoulderTiltDeg: number;
  /** the whole birth, 0 .. 1 */
  readonly progress: number;
  /** once it is out: lifted from where it was born onto her (0 .. 1) */
  readonly onHer: number;
  /** a newborn's stretch, arms and legs out of its curl (0 .. 1) */
  readonly stretch: number;
  /** after the birth, how far her opening has eased back (0 as the body is born .. 1 settled) */
  readonly closing: number;
  /** its cord cut (and when, FAST seconds; null not yet) */
  readonly cut: boolean;
  readonly cutAt: number | null;
  /** AFTERBIRTH: seconds since the placenta started (below 0, not yet); how far it has peeled off her womb's wall (0..1);
   * how far down (0 its leading edge at the top of her cervix .. 1 at her opening .. 2 all of it out); how far into the
   * bowl (0..1); how far her womb has settled after it (0..1) */
  readonly placentaFor: number;
  readonly separate: number;
  readonly placentaDown: number;
  readonly bowl: number;
  readonly afterbirth: number;
  /** how many babies, and whose turn it is (the one coming, or the last born once all are out) */
  readonly count: number;
  readonly active: number;
  /** each baby's own birth */
  readonly babies: readonly BabyBirth[];
  /** each placenta's own way out (one a baby, after the last baby): seconds since it started (below 0, not yet), peeled
   * off (0..1), down (0..2), into the bowl (0..1) */
  readonly placentas: readonly { readonly placentaFor: number; readonly separate: number; readonly placentaDown: number; readonly bowl: number }[];
  /** how much of what she carried is out of her and her opening eased after it (0 .. 1): her belly settles by it */
  readonly delivered: number;
}

/** One baby's own part of the birth. */
export interface BabyBirth {
  /** a baby that lay another way turning head down before its turn (0 .. 1; the first baby is turned already) */
  readonly lieTurn: number;
  readonly engage: number;
  readonly down: number;
  /** as `BirthMoment.turnDeg`, mirrored to her other side for every other baby */
  readonly turnDeg: number;
  /** its body dipped toward her tailbone (below 0) or lifted toward her front as its shoulders come out, degrees (0 but
   * for the `'accurate'` turn) */
  readonly shoulderTiltDeg: number;
  readonly onHer: number;
  readonly stretch: number;
  /** its own after: her opening eased back after IT (0 .. 1) */
  readonly closing: number;
  readonly born: boolean;
  readonly cut: boolean;
  readonly cutAt: number | null;
}

/** A cut or a placenta asked for sooner than its own time: the moment it was asked (FAST seconds), or null. `cuts`: every
 * CUT CORD pressed (a press cuts each cord out of her by then that is not cut yet). `openFrom`: how open she was as the
 * birth began (0..1 of ten centimetres: BIRTH OPENING, set by hand before it) -- `BirthMoment.cervix` and `.held`. */
export interface BirthEvents { readonly cutAt?: number | null; readonly cuts?: readonly number[]; readonly placentaAt?: number | null; readonly openFrom?: number | null }

const smooth = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** How open she was as the birth began (0 where none is given). */
const openFromOf = (events: BirthEvents): number => (typeof events.openFrom === 'number' && Number.isFinite(events.openFrom) ? clamp01(events.openFrom) : 0);

/** One baby's turn, FAST seconds: when it starts turning head down and settling (its rest before), its pushing,
 * crowning, birth (its head out), after (all of it out), its navel out, its own cut. */
export interface BabyPlan { readonly turnFrom: number; readonly engageFrom: number; readonly pushing: number; readonly crowning: number; readonly birth: number; readonly after: number; readonly navelOut: number; readonly cut: number }

/** Each part's start and the whole length, in FAST seconds -- the cuts and the placentas at their own times, or at the
 * moments `events` asked for them (never a cut before its navel is out of her, never a placenta before the last cut).
 * The single-baby fields (pushing .. cut) are the FIRST baby's; `babies` holds each one's. */
export function birthPlan(events: BirthEvents = {}, count = 1): { labour: number; pushing: number; crowning: number; birth: number; after: number; navelOut: number; cut: number; placenta: number; placentaOut: number; total: number; babies: readonly BabyPlan[]; placentas: readonly number[] } {
  const T = BIRTH_TIMING, M = MULTIPLE_TIMING, n = Math.max(1, Math.min(MOST_BABIES, Math.round(count) || 1));
  const presses = [events.cutAt, ...(events.cuts ?? [])].filter((p): p is number => p !== null && p !== undefined && Number.isFinite(p));
  const babies: BabyPlan[] = [];
  const labourEnd = T.labourCount * T.labourEvery;
  for (let i = 0; i < n; i++) {
    const prev = babies[i - 1];
    const pushing = i === 0 ? labourEnd : prev.after + M.between;
    const engageFrom = i === 0 ? labourEnd * (1 - T.engageShare) : pushing - M.engage, turnFrom = i === 0 ? engageFrom : engageFrom - M.turnDown;
    const crowning = pushing + (i === 0 ? T.pushCount : M.pushCount) * T.pushEvery, birth = crowning + (i === 0 ? T.crowning : M.crowning);
    const after = birth + T.headOut + T.restitution + T.bodyOut;
    // (its navel out of her: half way along its body, in the body's last push)
    const navelOut = birth + T.headOut + T.restitution + T.bodyOut * 0.5, ownCut = i >= M.onHerMost ? after + 0.5 + M.cutFirst : after + 0.5 + T.toHer + T.cutAfter;
    // (a press cuts it once its turn has come -- the first baby's at any time, as one baby's always did)
    const asked = presses.filter((p) => i === 0 || p >= birth);
    const cut = asked.length ? Math.min(ownCut, Math.max(navelOut, Math.min(...asked))) : ownCut;
    babies.push({ turnFrom, engageFrom, pushing, crowning, birth, after, navelOut, cut });
  }
  const last = babies[n - 1], lastCut = Math.max(...babies.map((b) => b.cut));
  const ownPlacenta = lastCut + T.placentaAfterCut;
  const placenta = events.placentaAt !== null && events.placentaAt !== undefined && Number.isFinite(events.placentaAt) ? Math.min(ownPlacenta, Math.max(lastCut, events.placentaAt)) : ownPlacenta;
  const placentas = Array.from({ length: n }, (_, k) => placenta + k * M.placentaGap);
  const placentaOut = placentas[n - 1] + T.placentaSeparate + T.placentaDown + T.placentaOut;
  const first = babies[0];
  return { labour: 0, pushing: first.pushing, crowning: first.crowning, birth: first.birth, after: first.after, navelOut: first.navelOut, cut: first.cut, placenta, placentaOut, total: Math.max(last.after + T.settle, placentaOut + T.placentaSettle), babies, placentas };
}

/** A contraction's strength at `phase` (0..1 of its cycle): a rise and fall over the first `long` of it, then rest. */
export function squeeze(phase: number, long: number): number {
  if (phase >= long || phase < 0) return 0;
  return Math.sin((phase / long) * Math.PI) ** 1.5;
}

/** One baby at `t` (FAST seconds) by its own plan: where it is, and how hard she is pushing it (its contraction). */
function babyAt(t: number, B: BabyPlan, i: number, pushes: number, crowningLong: number, turn: BirthTurn = 'inside'): BabyBirth & { contraction: number } {
  const T = BIRTH_TIMING;
  let contraction = 0, down = 0, onHer = 0, stretchK = 0, closing = 0;
  const lieTurn = i === 0 ? 1 : smooth(B.turnFrom, B.engageFrom, t);
  const engage = smooth(B.engageFrom, B.pushing, t);
  if (t < B.pushing) { /* still waiting its turn: in her womb, turning and settling */ }
  else if (t < B.crowning) {
    const u = t - B.pushing, k = Math.min(pushes - 1, Math.floor(u / T.pushEvery)), ph = (u - k * T.pushEvery) / T.pushEvery;
    contraction = squeeze(ph, T.pushLong);
    const step = T.pushReach / pushes, base = k * step, slip = T.slip * step;
    // forward through the push, from where the last slip left it, to the next step; back a little as it eases off
    const from = k === 0 ? 0 : base - slip, to = base + step;
    down = ph < T.pushLong ? from + (to - from) * smooth(0, T.pushLong, ph) : to - (k === pushes - 1 ? 0 : slip) * smooth(T.pushLong, 1, ph);
  } else if (t < B.birth) {
    const u = t - B.crowning, ph = (u % T.pushEvery) / T.pushEvery;
    contraction = squeeze(ph, T.pushLong);
    down = T.pushReach + (1 - T.pushReach) * smooth(0, crowningLong, u);
  } else if (t < B.after) {
    const u = t - B.birth;
    contraction = u < T.headOut ? squeeze(u / T.headOut, 1) : u > T.headOut + T.restitution ? squeeze((u - T.headOut - T.restitution) / T.bodyOut, 1) : 0;
    // the head out (its middle past her opening by a third of the baby -- or, turning as most births do, only to its chin,
    // its shoulders still in her while they turn: SHOULDER_TILT.headOut), held while it turns, then the rest of it
    const headTo = turn === 'accurate' ? SHOULDER_TILT.headOut : 0.35;
    down = u < T.headOut + T.restitution ? 1 + headTo * smooth(0, T.headOut, u) : 1 + headTo + (1 - headTo) * smooth(T.headOut + T.restitution, T.headOut + T.restitution + T.bodyOut, u);
  } else {
    down = 2;
    const u = t - B.after;
    // lifted onto her (a baby past those on her: once its cord is cut, into the bassinet); a stretch as it meets the air,
    // and smaller ones as it settles
    const liftFrom = i >= MULTIPLE_TIMING.onHerMost ? B.cut - B.after + 1 : 0.5;
    onHer = smooth(liftFrom, liftFrom + T.toHer, u);
    stretchK = u < T.firstStretch ? Math.sin((u / T.firstStretch) * Math.PI) : 0.25 * Math.max(0, Math.sin(((u - T.firstStretch) / 3) * Math.PI)) * (1 - smooth(T.settle - 2, T.settle, u));
    closing = smooth(0, T.close, u);
  }
  // the turn: round to her front as the head comes down her pelvis, all of it done before it reaches her opening; none
  // once it is out (2026-11-02, Joshua: "the baby is rotating halfway out of her body... either have it rotated before it
  // gets to the opening, or not at all as it looks weird"): the pause after the head is a pause, nothing turning. Every
  // other baby to her other side.
  const side = i % 2 === 0 ? 1 : -1;
  let turnDeg = side * (t < B.pushing ? TURN_DEG.inWomb : t < B.birth ? TURN_DEG.inWomb + (TURN_DEG.born - TURN_DEG.inWomb) * smooth(0.2, 0.75, down) : TURN_DEG.born), shoulderTiltDeg = 0;
  if (turn === 'accurate') {
    // (round to her front coming down -- born facing down -- then, out of her, back and on to face her thigh)
    const out = B.birth + T.headOut, body = out + T.restitution, S = SHOULDER_TILT;
    turnDeg = side * (t < B.pushing ? TURN_DEG.inWomb : t < B.birth ? TURN_DEG.inWomb * (1 - smooth(0.2, 0.75, down)) : TURN_DEG.born * smooth(out, body, t));
    // (its top shoulder under her pubic bone, its body dipped; then its bottom one, its body lifted; then straight on)
    const v = (t - body) / T.bodyOut;
    if (v > 0 && v < 1) shoulderTiltDeg = v < S.downAt ? -S.down * smooth(0, S.downAt, v) : v < S.upAt ? -S.down + (S.down + S.up) * smooth(S.downAt, S.upAt, v) : S.up * (1 - smooth(S.upAt, 1, v));
  }
  const cut = t >= B.cut;
  return { lieTurn, engage, down, turnDeg, shoulderTiltDeg, onHer, stretch: clamp01(stretchK), closing, born: t >= B.after, cut, cutAt: cut ? B.cut : null, contraction };
}

/** The birth at `seconds` since it began, at `pace` (and `events`: a cut or placenta asked for sooner, FAST seconds), for
 * `count` babies born one after another. */
export function birthAt(seconds: number, pace: BirthPace = 'fast', events: BirthEvents = {}, count = 1, turn: BirthTurn = 'inside'): BirthMoment {
  const T = BIRTH_TIMING, n = Math.max(1, Math.min(MOST_BABIES, Math.round(count) || 1)), P = birthPlan(events, n), stretch = pace === 'realistic' ? REALISTIC_STRETCH : 1;
  const real = Math.max(0, Number.isFinite(seconds) ? seconds : 0), t = real / stretch;
  const babies = P.babies.map((B, i) => babyAt(t, B, i, i === 0 ? T.pushCount : MULTIPLE_TIMING.pushCount, i === 0 ? T.crowning : MULTIPLE_TIMING.crowning, turn));
  // whose turn: the last baby whose rest before it has begun (the first from the start)
  let active = 0;
  for (let i = 1; i < n; i++) if (t >= P.babies[i - 1].after) active = i;
  const A = babies[active], AP = P.babies[active];
  // the last one out of her, for her opening's easing back
  let lastBorn = -1;
  for (let i = 0; i < n; i++) if (babies[i].born) lastBorn = i;
  let stage: BirthStage, contraction = A.contraction, cervix = 1;
  // (how open she was as it began: her cervix is never less, and her opening not until her first baby's head is out)
  const from = openFromOf(events);
  if (t < P.pushing) {
    stage = 'labour';
    const k = Math.floor(t / T.labourEvery), ph = (t - k * T.labourEvery) / T.labourEvery;
    contraction = squeeze(ph, T.labourLong);
    // her cervix a step with each contraction, rising through the squeeze and holding after it
    const stepOf = (1 - T.cervixFrom) / T.labourCount, during = smooth(0, T.labourLong, ph);
    cervix = Math.max(from, T.cervixFrom + stepOf * (k + during));
  } else if (t < AP.pushing) stage = 'after';
  else if (t < AP.crowning) stage = 'pushing';
  else if (t < AP.birth) stage = 'crowning';
  else if (t < AP.after) stage = 'birth';
  else stage = t < P.placenta ? 'after' : 'afterbirth';
  // the top speaks for the baby whose turn it is; while it waits its turn, her opening is still easing after the one
  // before (its `closing`), and the first baby keeps its place on her (`onHer`, its `stretch`)
  const closing = stage === 'after' || stage === 'afterbirth' ? (lastBorn >= 0 ? babies[lastBorn].closing : 0) : 0;
  const shown = stage === 'after' && active > 0 && !A.born ? babies[lastBorn] : A;
  // THE AFTERBIRTH: mild contractions; each placenta peels off her womb's wall, comes down her canal and out of her, and
  // settles into the bowl, one after another; her womb settles smaller after them
  const v = t - P.placenta, span = (n - 1) * MULTIPLE_TIMING.placentaGap;
  const down0 = T.placentaSeparate, out0 = down0 + T.placentaDown, bowl0 = out0 + T.placentaOut;
  const placentas = P.placentas.map((at) => {
    const w = t - at;
    if (w < 0) return { placentaFor: w, separate: 0, placentaDown: 0, bowl: 0 };
    return { placentaFor: w, separate: smooth(0, T.placentaSeparate, w), placentaDown: w < out0 ? smooth(down0, out0, w) : 1 + smooth(out0, bowl0, w), bowl: smooth(bowl0, bowl0 + T.placentaBowl, w) };
  });
  let afterbirth = 0;
  if (v >= 0) {
    if (v < T.placentaContractions * T.placentaEvery + span) contraction = Math.max(contraction, T.placentaSqueeze * squeeze((v % T.placentaEvery) / T.placentaEvery, T.placentaLong));
    afterbirth = smooth(bowl0 - T.placentaOut * 0.5, bowl0 + span + T.placentaSettle, v);
  }
  // (the placenta at her opening now: the latest that has started down, else the first)
  let pk = 0;
  for (let k = 0; k < n; k++) if (placentas[k].separate > 0) pk = k;
  const pl = placentas[pk];
  const delivered = babies.reduce((sum, b) => sum + b.closing, 0) / n;
  // (held where it began until her first baby's head is born: over the seconds its head takes to come out)
  const held = from * (1 - smooth(P.babies[0].birth, P.babies[0].birth + T.headOut, t));
  return { stage, seconds: real, contraction: clamp01(contraction), cervix: clamp01(cervix), held, engage: clamp01(A.engage), down: A.down, turnDeg: A.turnDeg, shoulderTiltDeg: A.shoulderTiltDeg, progress: clamp01(t / P.total), onHer: babies[0].onHer, stretch: shown.stretch, closing,
    cut: babies[0].cut, cutAt: babies[0].cutAt, placentaFor: v, separate: pl.separate, placentaDown: pl.placentaDown, bowl: pl.bowl, afterbirth,
    count: n, active, babies: babies.map(({ contraction: _c, ...b }) => b), placentas, delivered };
}

/** The birth's whole length in seconds at `pace`, for `count` babies. */
export const birthLength = (pace: BirthPace = 'fast', count = 1): number => birthPlan({}, count).total * (pace === 'realistic' ? REALISTIC_STRETCH : 1);

/**
 * WHERE A BIRTH BEGINS WHEN SHE IS OPEN ALREADY (Joshua, 2026-11-14, of a birth played with BIRTH OPENING set by hand
 * first: "the opening didn't sync up as when I tried it, I set the start at 40% opening before I pressed it"). By hand
 * BIRTH OPENING opens her opening and her cervix together; a birth begun from there goes on from there (`openFrom`, a
 * share of ten centimetres):
 *
 *   - her cervix is never less than that (`birthAt`'s `cervix`): labour takes it on, it does not start over from a
 *     centimetre;
 *   - its clock starts at the contraction in which her labour's own cervix passes that -- what of labour is behind her
 *     is not played -- and never later than the contraction in which her baby's head begins to settle onto her cervix
 *     (it has to come down first);
 *   - her opening is held at least that open until her first baby's head is born (`BirthMoment.held`), and from there
 *     it is the birth's: as wide as what passes through it, easing back after.
 *
 * The seconds on the birth's clock, at `pace`, such a birth begins at (0: from the start).
 */
export function birthBeginsAt(openFrom: number, pace: BirthPace = 'fast'): number {
  const T = BIRTH_TIMING, from = clamp01(Number.isFinite(openFrom) ? openFrom : 0), stepOf = (1 - T.cervixFrom) / T.labourCount;
  // (the contraction that takes her past it: none of them while she is no more open than labour starts her)
  const passes = from <= T.cervixFrom ? 0 : Math.floor((from - T.cervixFrom) / stepOf + 1e-9);
  // (the last contraction that begins before its head starts to settle)
  const settles = Math.floor((T.labourCount * T.labourEvery * (1 - T.engageShare)) / T.labourEvery + 1e-9);
  return Math.max(0, Math.min(passes, settles, T.labourCount - 1)) * T.labourEvery * (pace === 'realistic' ? REALISTIC_STRETCH : 1);
}

/**
 * WHEN A BIRTH CAN BE PLAYED: while she is pregnant, from RECLINE or SQUAT (Joshua, 2026-11-02 -- LEGS APART is her
 * pre-labour stance). No size of belly is asked of her: he set one that morning ("only when pregnancy is on and the belly
 * size is greater than 90%") and took it back the same day -- 2026-11-14, "let's remove the minimum pregnancy limit as
 * that's automatically set from the max". Read here as: her belly at a birth is her BIGGEST BELLY's to say
 * (pregnancy.ts), not a second number's.
 */
export const BIRTH_NEEDS = Object.freeze({ poses: Object.freeze(['recline', 'squat']) as readonly string[] });
/** Why a birth can not begin now -- the line the room shows for it -- or null when it can. */
export function birthNeeds(pregnant: boolean, pose: string): string | null {
  if (!pregnant) return 'BIRTH · not pregnant (PREGNANT · ON)';
  if (!BIRTH_NEEDS.poses.includes(pose)) return 'BIRTH · from RECLINE or SQUAT';
  return null;
}

/**
 * HER PREGNANCY ENDS WITH THE BIRTH (Joshua, 2026-11-14: "just keep it simple and automatically turn off the pregnancy
 * state after birth"): whether she is still pregnant at this moment of a birth -- until her last baby is out of her (a
 * baby is `born` once all of it is: its 'after'). With twins and triplets she is pregnant until the last. Like every
 * other reading of the birth it is the clock's: dragged back before then she is pregnant again, and with no birth on
 * the clock (`null`) her state is whatever it was set to.
 */
export const pregnantAt = (m: BirthMoment | null): boolean => !m || !m.babies.every((b) => b.born);

/** Her cervix as a gameplay reading (Joshua, 2026-11-02: "a stat that says like 'Open 2.7cm - not yet'"). */
export function cervixLine(cervix: number): string {
  const cm = Math.max(0, Math.min(10, cervix * 10));
  return `Cervix ${cm.toFixed(1)} cm · ${cm >= 9.95 ? 'ready to push' : cm >= 8 ? 'nearly' : 'not yet'}`;
}

/** The line shown for it: where the birth is, her cervix, and her opening (`openCm`, as drawn) when given. */
export function birthLine(m: BirthMoment | null, openCm?: number): string {
  if (!m) return 'BIRTH · not started';
  const name: Record<BirthStage, string> = { labour: 'labour', pushing: 'pushing', crowning: 'crowning', birth: 'birth', after: 'born', afterbirth: 'afterbirth' };
  const squeezing = m.contraction > 0.15 ? ' · contraction' : '';
  const open = openCm !== undefined ? ` · Opening ${openCm.toFixed(1)} cm` : '';
  // (twins and triplets: whose turn it is, A B C in the order they are born)
  const who = (i: number) => 'ABC'[i] ?? String(i + 1);
  let stage = name[m.stage];
  if ((m.count ?? 1) > 1) {
    const out = m.babies.filter((b) => b.born).length;
    stage = m.stage === 'labour' ? 'labour'
      : out < m.count && (m.stage === 'after') ? `baby ${who(m.active - 1)} born · ${who(m.active)} next`
      : out < m.count ? `baby ${who(m.active)} · ${stage}`
      : `${stage} · ${out} of ${m.count}`;
  }
  return `BIRTH · ${stage}${squeezing} · ${cervixLine(m.cervix)}${open}`;
}
