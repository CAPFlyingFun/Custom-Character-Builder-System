/**
 * A SKIRT, DRAFTED ROUND HER (Joshua, 2026-11-16: "a combination of paint and cloth for like skirts, etc… that are loose
 * and flowing"; "We could create a high and a low skirt meaning above or below the belly. Like the above and below
 * leggings… have the top of the skirt above or below the belly, with adjustable length all the way down to the ground
 * and you can select how tight/close it is to the body"; "the top is either one or the other, but both can reach the
 * floor length").
 *
 * The pilot of paint and cloth together: its FITTED part is paint on her skin (a short in its own colour, whose
 * waistband is the skirt's: `sarahLabTool.ts`), its LOOSE part is this -- one sheet of cloth hung from a ring round
 * her just under that waistband, laid here in her REST space (metres; `garment/types.ts` BodyInput) and simulated by
 * the room's cloth (`clothSkirt.ts`).
 *
 * Three numbers, his three:
 * - TOP: 'over' her belly or 'under' it -- the ring's heights at her front, her sides and her back, as shares of her
 *   trunk (0 her hip joints, 1 the base of her neck), a little under the painted waistband's own (`SKIRT_TOPS`); and
 *   UNDER HER BELLY THE RING IS THE UNDER-BELLY LEGGINGS' OWN LINE as it lies on her (`underLine`, `SKIRT_LINE`);
 * - LENGTH: 0 where her legs part, a half a hand under her knee, 1 to the floor -- his drawing's three lines, from
 *   either top (`SKIRT_CUT.shortest`, `hemOf`; the hem is level: one height all round, counted on her legs whatever
 *   her belly does to the ring);
 * - FLARE: 0 a tube that lies on her hips and falls straight from the widest of her, 1 a full skirt.
 * And his fourth, drawn 2026-11-17 beside LENGTH (`SkirtSettings.fit`, `SKIRT_FIT`):
 * - FIT: how closely it holds to her from leg to leg -- 0 on her all the way to its hem, 1 straight from her hips,
 *   between the two that share of the way from her to the cloth.
 *
 * Its rest shape IS its cut: a ring that stands just off her, and under it a surface that never comes back in toward
 * her going down (the convex outline of her hips and both legs at each height, `garment/measure.ts` dressForm -- a
 * skirt spans her legs) and opens by FLARE's angle. The cloth's edges rest at their lengths here, so a wider cut has
 * the cloth for its folds.
 *
 * Pure: no three, no DOM.
 */
import { dressForm, hullAt } from '../garment/measure';
import type { BodyInput } from '../garment/types';

export type SkirtTop = 'over' | 'under';
export interface SkirtSettings {
  readonly top: SkirtTop;
  /** 0 a mini .. 1 to the floor */
  readonly length: number;
  /** 0 a tube on her hips .. 1 a full skirt */
  readonly flare: number;
  /**
   * Worn with a shirt of cloth: true, the skirt is OVER it (the shirt tucked in); false, the shirt hangs over the skirt.
   * Only an over-belly skirt may be either (Joshua, 2026-11-16: "an option for a high waisted skirt to be above or
   * under the shirt, while under the belly is always under the shirt"): under her belly it is always false.
   */
  readonly tucked: boolean;
  /** Which of its four anchors hold it (`SkirtAnchors`); absent: all four. */
  readonly anchors?: SkirtAnchors;
  /**
   * FIT, HIS SECOND NUMBER (Joshua, 2026-11-17, two red lines down a figure's side, "0%" along its leg from hip to ankle
   * and "100%" straight down from its hip: "How tightly it curves with the body from legs to legs. Maybe for tighter
   * ones, it's actually a simple bridge like between the breasts that span the front and back gap between the legs… not
   * cloth and if you do a looser one, it fades somehow to cloth sim"). 0: on her all the way to its hem -- her hips' and
   * her legs' own outline, the gap between her legs spanned front and back. 1: straight from her hips, as every skirt
   * was before it. Between: that share of the way from the one to the other (`SKIRT_FIT`). Absent: 1.
   */
  readonly fit?: number;
}
/** A skirt's FIT as a number: 1, straight from her hips, where it says nothing (every skirt before there was one). */
export const fitOf = (s: { readonly fit?: number | undefined }): number => (Number.isFinite(s.fit) ? Math.min(1, Math.max(0, s.fit!)) : 1);
/**
 * ITS FOUR ANCHORS (Joshua, 2026-11-17: "I would add 4 anchor points for skirts either high or low sitting:
 * front/back/both sides"; "releasing all of them should make it fall down"): where its top is held to her -- her front,
 * her back, her left side and her right. Each holds the quarter of the ring round it and eases to nothing at the next
 * (`anchorShare`): all four on, the whole ring is held as it always was; one off, that quarter hangs from its
 * neighbours; all off, nothing holds it and it falls until her body stops it.
 */
export interface SkirtAnchors { readonly front: boolean; readonly back: boolean; readonly left: boolean; readonly right: boolean }
export const ALL_ANCHORS: SkirtAnchors = Object.freeze({ front: true, back: true, left: true, right: true });
export const anchorsOf = (s: { readonly anchors?: Partial<SkirtAnchors> | undefined }): SkirtAnchors => ({
  front: s.anchors?.front !== false, back: s.anchors?.back !== false, left: s.anchors?.left !== false, right: s.anchors?.right !== false,
});
/** How much of the ring's hold there is at angle `a` round her (0 her front, pi/2 her +x side, her LEFT): 0..1; 1 all round with all four. */
export function anchorShare(anchors: SkirtAnchors, a: number): number {
  const c = Math.cos(a), s = Math.sin(a);
  return c * c * ((c >= 0 ? anchors.front : anchors.back) ? 1 : 0) + s * s * ((s >= 0 ? anchors.left : anchors.right) ? 1 : 0);
}
export const SKIRT_DEFAULTS: SkirtSettings = Object.freeze({ top: 'over', length: 0.45, flare: 0.5, tucked: true });
export const clampSkirt = (s: Partial<SkirtSettings>): SkirtSettings => ({
  top: s.top === 'under' ? 'under' : s.top === 'over' ? 'over' : SKIRT_DEFAULTS.top,
  tucked: s.top === 'under' ? false : s.tucked !== false,
  length: Math.min(1, Math.max(0, Number.isFinite(s.length) ? s.length! : SKIRT_DEFAULTS.length)),
  flare: Math.min(1, Math.max(0, Number.isFinite(s.flare) ? s.flare! : SKIRT_DEFAULTS.flare)),
  // (all four is said by saying nothing: an outfit written before there were anchors is as it was)
  ...((() => { const k = anchorsOf(s); return k.front && k.back && k.left && k.right ? {} : { anchors: k }; })()),
  // (...and straight from her hips by saying nothing, the same)
  ...(fitOf(s) < 1 ? { fit: fitOf(s) } : {}),
});
/** Two skirts cut the same: every number of theirs, their anchors and their fit said or not. */
export function sameSkirt(a: Partial<SkirtSettings>, b: Partial<SkirtSettings>): boolean {
  const x = clampSkirt(a), y = clampSkirt(b), p = anchorsOf(x), q = anchorsOf(y);
  return x.top === y.top && x.tucked === y.tucked && Math.abs(x.length - y.length) < 5e-4 && Math.abs(x.flare - y.flare) < 5e-4 && Math.abs(fitOf(x) - fitOf(y)) < 5e-4
    && p.front === q.front && p.back === q.back && p.left === q.left && p.right === q.right;
}

/**
 * A SKIRT'S NUMBERS AS A SAVE KEEPS THEM (`characterSaves.ts` `SavedClothes.skirt`): one versioned record, never its
 * mesh -- loading cuts it again from them and her own body. Kept only where they are not the outfit's own: a save from
 * before a skirt's numbers could be moved has none, and is that outfit's skirt.
 */
export interface SkirtRecord { readonly version: typeof SKIRT_RECORD_VERSION; readonly settings: SkirtSettings }
export const SKIRT_RECORD_VERSION = 1;
/** A record read from a file that may hold anything: null unless it is this version's. */
export function readSkirtRecord(v: unknown): SkirtRecord | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as { version?: unknown; settings?: unknown };
  if (r.version !== SKIRT_RECORD_VERSION || typeof r.settings !== 'object' || r.settings === null) return null;
  const q = r.settings as Record<string, unknown>, num = (x: unknown): number => (typeof x === 'number' ? x : NaN), k = (typeof q.anchors === 'object' && q.anchors !== null ? q.anchors : {}) as Record<string, unknown>;
  return { version: SKIRT_RECORD_VERSION, settings: clampSkirt({
    top: q.top === 'under' ? 'under' : 'over', tucked: q.tucked !== false, length: num(q.length), flare: num(q.flare), fit: num(q.fit),
    anchors: { front: k.front !== false, back: k.back !== false, left: k.left !== false, right: k.right !== false },
  }) };
}

/**
 * GAME TUNING: the ring's heights on her trunk. OVER is between her bust and the top of her belly (Joshua, 2026-11-16, of
 * the first ones, hung 3 cm under the high rise's waistband: "I want the top of the skirts for the high ones right
 * between the breasts and top belly… yours appears mid belly which would fall off in real life"): her underbust is 0.56
 * (`paintTemplates` LINES), and its painted band was taken up to 0.55. THEN, 2026-11-17, of that: "the high skirt point
 * is too low, it should basically sit at the base of the breasts at that crease" -- MEASURED on her body file, the
 * crease under each breast is 0.61 to 0.64 of her trunk (the least of her front's reach, 8 and 11 cm out from her
 * middle), so the band's top is 0.63 (`sarahLabTool.SKIRT_OVER_BAND`; at 0.61 it was pictured a centimetre under the
 * crease) and the ring a centimetre under it. UNDER is 1 to
 * 2 cm under the low rise's (0.125, 0.175, 0.2): where an under-belly skirt's ring was until 2026-11-17 -- its ring is
 * the under-belly leggings' own line now (`SKIRT_LINE`), and these three only where the room has no such line to hand
 * it. The painted band shows above the cloth as the skirt's own waistband.
 */
export const SKIRT_TOPS: Readonly<Record<SkirtTop, { readonly front: number; readonly side: number; readonly back: number }>> = Object.freeze({
  over: Object.freeze({ front: 0.61, side: 0.595, back: 0.585 }),
  under: Object.freeze({ front: 0.095, side: 0.145, back: 0.17 }),
});

export const SKIRT_CUT = Object.freeze({
  /** points round her (GAME TUNING: 1.3 cm apart at her hips) */
  columns: 72,
  /** metres between rows down it, and the most rows there are: a longer skirt's are further apart (`clothSkirt.ts`, how stiff it can be) */
  rowStep: 0.02, mostRows: 30,
  /** the ring, and a tube under it, stand this far off her (metres); over a tucked shirt, this far (the shirt lies
   *  1.5 mm off her, is held in to 2 mm more under the band, is drawn 3 mm out of that, and the two keep 3 mm apart:
   *  `clothLayers.ts`) */
  ease: 0.006, easeTucked: 0.01,
  /**
   * LENGTH'S TWO ENDS ARE HIS DRAWING (Joshua, 2026-11-17, three lines across a figure's legs, "0%", "50%", "100%": "I
   * can draw and set the 0% to 100% lengths"): at 0 its hem is where her legs part, at 1 the floor, and half-way a
   * hand under her knee. `shortest`: at 0, this share of the way from her hip joints down to her knees; `floorClear`:
   * at 1, this far over the floor as cut, metres (worn, it hangs about a twentieth longer). MEASURED off his
   * drawing: his 0% line 545 px down a figure whose legs part at 548 (give or take 8) and whose feet stand at 992; his
   * 50% line at 746, 46% of the way from his 0% to his 100% and 46 px under its knees. MEASURED on her, the room's
   * points at 0%: the gap between her thighs opens 8.0 cm under her hip joints, 0.22 of the 36.5 cm to her knees; a
   * straight scale from there to the floor puts 50% at 43.3 cm, 8.8 under her knee joints. Until then 0 was 30 cm
   * under the ring, 11 cm over her knee: longer than a mini. GAME TUNING to his lines.
   * `leastDrop`: its hem is never nearer the lowest of its ring than this (metres): a ring gone down under a big
   * belly would meet a short hem.
   */
  shortest: 0.22, floorClear: 0.06, leastDrop: 0.08,
  /** FLARE at 1 opens by this angle from straight down (degrees) */
  fullAngle: 38,
  /** rows held to her from the top: all of the first, less of each after (the waistband's grip) */
  hold: Object.freeze([1, 0.7, 0.3]),
  /** the outline's slices (metres) */
  formStep: 0.01,
});

/**
 * FIT (`SkirtSettings.fit`), HOW IT IS MADE. Every skirt is the cloth it always was: cut STRAIGHT (never back in
 * toward her going down, opened by FLARE), hung from its ring and simulated. Under FIT 1 it has a second cut, ON HER
 * (`hug`): her own outline at each height -- her hips, and under them the convex outline of both her legs, the gap
 * between them spanned front and back -- `ease` off her, in and out as she goes. Each point of that cut has a place
 * on her as she moves (`clothSkirt.ts`): on her skin where it was cut, or, over the gap between her legs, on the
 * straight span between the points either side of it ("a simple bridge… not cloth"). THE SKIRT IS DRAWN FIT OF THE
 * WAY FROM THAT PLACE TO WHERE THE CLOTH IS: at 0 on her and no cloth at all, at 1 the cloth and nothing else, and
 * between them his two red lines' in-between -- "it fades somehow to cloth sim".
 *
 * WHY THE CLOTH ITSELF IS NEVER CUT CLOSER (two builds of it, 2026-11-17, each MEASURED in the room on the pencil
 * skirt, walking with the clock held):
 * - ON HER DOWN TO SOME HEIGHT, CLOTH FROM THERE (FIT 0.5: on her to her mid-thigh, cloth to her calf). Cloth let go
 *   on her legs is a tube as big round as her two thighs, 74 cm at her knees; her stride wants 108 there and 131 at
 *   her calf. It rode up her legs and stood in a crumpled roll at her knees in every stride.
 * - CUT FIT OF THE WAY FROM ON-HER TO STRAIGHT, EVERY POINT TOLD WHERE TO BE: that share of the way from its place on
 *   her to the straight cut as her pelvis carries it, outright up to a FIT of a half and as cloth drawn there past
 *   it. A straight cut carried by her pelvis knows nothing of her legs: her knee came out through it (kept out of
 *   her legs' capsules along each point's way, a point whose way was barred stood on her beside one whose way was
 *   clear: a nick in the hem at each leg), and as cloth drawn toward such places it was pulled through her legs,
 *   its hem in rags.
 * The cloth as it always was already goes round her legs; half-way between it and her is round them too.
 *
 * EACH POINT'S PLACE ON HER IS THE NEAREST OF HER TO THAT POINT OF THE CLOTH AS CUT (`nearestOn`: of her outline at
 * its height, `ease` off it). The way from the one to the other is then straight out of her, and no share of that
 * way is in her. A FAULT FOUND 2026-11-17 in the first pictures of it from her back, fixed and told: her calves stood
 * through the pencil skirt at every FIT from a quarter to three quarters. Each row of the on-her cut was laid round
 * its outline's own middle, a point of it in each column's direction from there; the cloth's is laid round the one
 * upright axis at its ring; and her calves stand BEHIND that axis (her outline under her knees does not hold it at
 * all). So a point's place and its cloth were at two different places round her leg -- up to 8.6 cm apart along her
 * outline -- and the straight way between them cut the corner through the back of her calf. MEASURED on her body
 * file at 0%, the pencil as cut (LENGTH 0.54, FLARE 0): half-way, 32 of its 2,088 points under its ring were inside
 * her outline, 11.7 mm at the most, all in its last four rows; at a quarter 34 and 7.8 mm, at three quarters 20 and
 * 7.2. Laid at the nearest of her: none at any of the three, in the pencil, the A-line, the mini and the maxi
 * (`tests/skirtFit.test.ts`). The on-her cut's points are no longer evenly spaced round her (1.6 to 20.7 mm apart in
 * the pencil: close where her outline turns, far along its straight runs), and with FLARE they move along her
 * outline, never off it. Its first rows are not eased from its ring into her outline, as they were while the two
 * were laid round two middles: under its ring the cloth is cut ON her, and so its place is.
 *
 * GAME TUNING: `span`, metres: a point cut further than this off her skin, under where her legs part, is over the gap
 * between them and is spanned; `clear`, metres: a span is kept this far outside her legs' capsules at the least
 * where it was cut further off them than that (`clothSkirt.ts` `spanKeep`); `bridge`, metres under where her legs
 * part, and `bridgeFront`, degrees round her from her front (all of it within the first, none past the second): the
 * crease at the top of her thighs, which a sheet is drawn taut over (`clothSkirt.ts` `bridgeTo`).
 */
export const SKIRT_FIT = Object.freeze({ span: 0.016, clear: 0.008, bridge: 0.04, bridgeFront: Object.freeze([50, 85] as const) });
export interface SkirtDraft {
  readonly count: number;
  readonly columns: number;
  readonly rows: number;
  /** rest places, metres (count x 3): x her side to side, y up from the floor, z out of her front */
  readonly rest: Float32Array;
  readonly triangles: Uint32Array;
  /** 0 free .. 1 held to her (count) */
  readonly pin: Float32Array;
  /** the ring's own height at each column, and the hem's (metres) */
  readonly ringY: Float32Array;
  readonly hemY: number;
  /** the upright axis it is laid round: (x, z), metres */
  readonly axis: readonly [number, number];
  /** its FIT (`SKIRT_FIT`): 1 straight from her hips */
  readonly fit: number;
  /**
   * Under FIT 1, its second cut, ON HER (`SKIRT_FIT`; count x 3, as `rest`, which is the cloth's own, the straight
   * one, at every FIT): where each of its points has a place on her. Null at FIT 1.
   */
  readonly hug: Float32Array | null;
  /** the rows that have a place on her, from its ring down: 1 at FIT 1 (its ring), all of them under it */
  readonly heldRows: number;
  /** the share of its columns the under-belly waistband's line crossed (`SKIRT_LINE`): 1 all round her; 0 with no line handed in, or a skirt over her belly; under `SKIRT_LINE.least`, the line was not used */
  readonly lineFound: number;
}

/**
 * AN UNDER-BELLY SKIRT SITS WHERE THE UNDER-BELLY LEGGINGS DO (Joshua, 2026-11-17, of the skirts moved under her belly,
 * their rings at three heights on her trunk: "how the skirt should sit is like how we did the lower rider leggings, just
 * above her pelvis, below her belly following that same curved lines…"). Those leggings' waistband is a hoop
 * (`bottomCut.ts` `planeAt`): one tilted plane on her as she stands, its front under her belly and its back over her
 * seat, swung down as her belly grows until its front lies in the crease her belly hangs over. A ring at fixed heights
 * on her trunk is on the FRONT OF HER BUMP by 100% (MEASURED in the room, 2026-11-17: the skirt's top stood off her
 * under a tee's hem, and at 200% the skirt hung from the front of her belly).
 *
 * So the room hands the draft that waistband itself: how far INSIDE it each point of her skin is, as she is shaped
 * (`inside`: metres, + inside the garment; `fabricPanel.hoopOn`). The ring is where that is `SKIRT_LINE.inside` -- in
 * the painted band, which shows over the cloth as the skirt's waistband -- found on her triangles; and what the cloth
 * goes round, under the ring, is HER SKIN UNDER THAT LINE alone: her hips, her seat and her legs, never the belly that
 * hangs in front of it. GAME TUNING (metres): `inside`; `smooth`, how many times the ring's heights and reaches are
 * evened with their neighbours' (her triangles are 1 to 4 cm there, and the line bends at each); `least`, the share
 * of its columns the line must cross for it to be used at all -- a waistband goes all the way round her (MEASURED on
 * the room's points at 0, 50, 73, 100, 150 and 200%: every one of the 72), and half a line is no line.
 */
export const SKIRT_LINE = Object.freeze({ inside: 0.008, smooth: 2, least: 0.9 });

/**
 * HER SKIN UNDER A WAISTBAND'S LINE, AND THE LINE (`SKIRT_LINE`): her triangles cut where `inside` is `level` -- what
 * is inside kept (a body for `dressForm`: her own points and the cuts' new ones), and each cut's two ends a piece of
 * the line (x, y, z twice a piece). A triangle two of whose corners are her arm's is left out, as a dress form
 * leaves it out.
 */
export function underLine(body: BodyInput, inside: ArrayLike<number>, level: number): { readonly covered: BodyInput; readonly line: Float64Array } {
  const P = body.positions, T = body.triangles, A = body.arm, n = P.length / 3;
  // (a body of its own, of the points it keeps alone: a dress form welds and sorts every point it is handed)
  const at = new Int32Array(n).fill(-1), pos: number[] = [], armOf: number[] = [], tris: number[] = [], line: number[] = [];
  const own = (v: number): number => { if (at[v] < 0) { at[v] = armOf.length; pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); armOf.push(A[v]); } return at[v]; };
  // (the point where the line crosses the edge from `a`, inside, to `b`, outside)
  const cut = (a: number, b: number, fa: number, fb: number): number => {
    const t = fa / (fa - fb), x = P[a * 3] + (P[b * 3] - P[a * 3]) * t, y = P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * t, z = P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t;
    pos.push(x, y, z); armOf.push(A[a] + (A[b] - A[a]) * t); line.push(x, y, z);
    return armOf.length - 1;
  };
  for (let k = 0; k + 2 < T.length; k += 3) {
    const a = T[k], b = T[k + 1], c = T[k + 2];
    if ((A[a] >= 0.5 ? 1 : 0) + (A[b] >= 0.5 ? 1 : 0) + (A[c] >= 0.5 ? 1 : 0) > 1) continue;
    const fa = inside[a] - level, fb = inside[b] - level, fc = inside[c] - level, ia = fa >= 0, ib = fb >= 0, ic = fc >= 0, count = (ia ? 1 : 0) + (ib ? 1 : 0) + (ic ? 1 : 0);
    if (!(fa === fa && fb === fb && fc === fc) || count === 0) continue;
    if (count === 3) { tris.push(own(a), own(b), own(c)); continue; }
    // (turned so that the odd corner out is first: the one inside of one, or the one outside of two)
    const odd = count === 1 ? (ia ? 0 : ib ? 1 : 2) : (!ia ? 0 : !ib ? 1 : 2);
    const [p, q, r, fp, fq, fr] = odd === 0 ? [a, b, c, fa, fb, fc] : odd === 1 ? [b, c, a, fb, fc, fa] : [c, a, b, fc, fa, fb];
    if (count === 1) { const u = cut(p, q, fp, fq), v = cut(p, r, fp, fr); tris.push(own(p), u, v); }
    else { const u = cut(q, p, fq, fp), v = cut(r, p, fr, fp), Q = own(q), R = own(r); tris.push(Q, R, u, R, v, u); }
  }
  return { covered: { positions: Float32Array.from(pos), triangles: Uint32Array.from(tris), arm: Float32Array.from(armOf), joints: body.joints }, line: Float64Array.from(line) };
}

/**
 * Where a line round her (`underLine`'s pieces) crosses each of `cols` directions from the upright axis (cx, cz): its
 * height there and how far out it is -- the furthest, where it crosses one more than once; a direction it does not
 * cross takes its neighbours', eased between them. `found`: the share of the directions it did cross.
 */
export function ringOn(line: ArrayLike<number>, cx: number, cz: number, cols: number): { readonly y: Float64Array; readonly r: Float64Array; readonly found: number } {
  const y = new Float64Array(cols).fill(NaN), r = new Float64Array(cols).fill(0), step = (Math.PI * 2) / cols;
  for (let k = 0; k + 5 < line.length; k += 6) {
    const px = line[k] - cx, pz = line[k + 2] - cz, qx = line[k + 3] - cx, qz = line[k + 5] - cz, ex = qx - px, ez = qz - pz;
    let a0 = Math.atan2(px, pz), a1 = Math.atan2(qx, qz);
    if (a1 < a0) { const t = a0; a0 = a1; a1 = t; }
    // (the short way round; a piece that spans more than a quarter turn passes by the axis itself: not a place on her)
    if (a1 - a0 > Math.PI) { const t = a0 + Math.PI * 2; a0 = a1; a1 = t; }
    if (a1 - a0 > Math.PI / 2) continue;
    for (let i = Math.ceil(a0 / step - 1e-9); i * step <= a1 + 1e-9; i++) {
      const a = i * step, dx = Math.sin(a), dz = Math.cos(a), den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (px * ez - pz * ex) / den, u = (px * dz - pz * dx) / den, c = ((i % cols) + cols) % cols;
      if (t > r[c] && u >= -1e-6 && u <= 1 + 1e-6) { r[c] = t; y[c] = line[k + 1] + (line[k + 4] - line[k + 1]) * Math.min(1, Math.max(0, u)); }
    }
  }
  let found = 0;
  for (let c = 0; c < cols; c++) if (y[c] === y[c]) found++;
  if (found > 0 && found < cols) {
    const had = Array.from(y, (v) => v === v);
    for (let c = 0; c < cols; c++) {
      if (had[c]) continue;
      let b = 1, f = 1;
      while (!had[(c - b + cols * 2) % cols]) b++;
      while (!had[(c + f) % cols]) f++;
      const i = (c - b + cols * 2) % cols, j = (c + f) % cols, w = b / (b + f);
      y[c] = y[i] + (y[j] - y[i]) * w; r[c] = r[i] + (r[j] - r[i]) * w;
    }
  }
  return { y, r, found: found / cols };
}
/** A ring of numbers evened with its neighbours', `times` over (a quarter of each neighbour, half of its own). */
function evened(v: Float64Array, times: number): Float64Array {
  let a = v;
  for (let k = 0; k < times; k++) { const b = new Float64Array(a.length), n = a.length; for (let c = 0; c < n; c++) b[c] = 0.5 * a[c] + 0.25 * (a[(c + 1) % n] + a[(c + n - 1) % n]); a = b; }
  return a;
}

/** How far the outline `h` ((x, z) pairs) reaches from (cx, cz) toward (sin a, cos a): 0 when it does not hold the point. */
export function reachOf(h: ArrayLike<number>, cx: number, cz: number, a: number): number {
  const n = h.length >> 1, dx = Math.sin(a), dz = Math.cos(a);
  let best = 0;
  for (let k = 0; k < n; k++) {
    const l = (k + 1) % n, ax = h[2 * k] - cx, az = h[2 * k + 1] - cz, ex = h[2 * l] - h[2 * k], ez = h[2 * l + 1] - h[2 * k + 1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ez - az * ex) / den, u = (ax * dz - az * dx) / den;
    if (t > best && u >= -1e-9 && u <= 1 + 1e-9) best = t;
  }
  return best;
}

/**
 * The point of the outline `h` ((x, z) pairs: convex, either way round) nearest (px, pz), into `out` [x, z, inside]:
 * `inside` 1 where the outline holds the point (its nearest point is then the nearest of its rim all the same). False
 * with no outline.
 */
export function nearestOn(h: ArrayLike<number>, px: number, pz: number, out: Float64Array | number[]): boolean {
  const n = h.length >> 1;
  if (n < 3) return false;
  let best = Infinity, bx = 0, bz = 0, left = 0, right = 0;
  for (let k = 0; k < n; k++) {
    const l = (k + 1) % n, ax = h[2 * k], az = h[2 * k + 1], ex = h[2 * l] - ax, ez = h[2 * l + 1] - az, ee = ex * ex + ez * ez;
    let t = ee > 1e-18 ? ((px - ax) * ex + (pz - az) * ez) / ee : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + ex * t, qz = az + ez * t, d = (px - qx) * (px - qx) + (pz - qz) * (pz - qz);
    if (d < best) { best = d; bx = qx; bz = qz; }
    const side = ex * (pz - az) - ez * (px - ax);
    if (side > 1e-15) left++; else if (side < -1e-15) right++;
  }
  out[0] = bx; out[1] = bz; out[2] = left === 0 || right === 0 ? 1 : 0;
  return true;
}

/** The ring's height at angle `a` round her (0 her front, pi/2 her +x side), a share of her trunk. */
export function ringShare(top: SkirtTop, a: number): number {
  const t = SKIRT_TOPS[top], f = (1 + Math.cos(a)) / 2, s = Math.sin(a) ** 2;
  return (1 - s) * (t.back + (t.front - t.back) * f) + s * t.side;
}

/** A skirt's hem at LENGTH `length`, metres from the floor: 0 where her legs part, 1 the floor (`SKIRT_CUT.shortest`, `floorClear`: his drawing). */
export function hemOf(joints: BodyInput['joints'], length: number): number {
  const hipY = (joints.hip[0][1] + joints.hip[1][1]) / 2, kneeY = (joints.knee[0][1] + joints.knee[1][1]) / 2, top = hipY - SKIRT_CUT.shortest * (hipY - kneeY);
  return top + (SKIRT_CUT.floorClear - top) * Math.min(1, Math.max(0, length));
}
/**
 * THE POINTS OF ITS ON-HER CUT THAT ARE OVER A GAP (`SKIRT_FIT`), row by row: each run of points cut further than `far`
 * off her skin (`off`: how far each point of `hug` stands off the skin it is bound to, in `far`'s units), between two
 * points of its row that are on her skin -- `a` and `b` (-1 for a point with skin of its own), and `u` of the way from
 * the one to the other as it was cut. Never its ring, which is on its waistband's line as it always was; and at FIT
 * 1, where there is no on-her cut, none at all. A row with no point on her skin is left as it is.
 *
 * ONLY UNDER WHERE HER LEGS PART (`below`: a height, metres; `hemOf(joints, 0)`). A gap between her two legs is
 * between two things that move apart, and a point over it has no one skin to go with; a hollow of her trunk -- across
 * the front of her hips from the top of one thigh to the other's, over her cleft -- is all one thing, and a point over
 * it goes with the skin under it, however far off that it was cut -- and, in front of her, with the run from its
 * ring to her thighs (`clothSkirt.ts` `bridgeTo`), which is what is taut over the crease there. (Spanned across like
 * a gap, the first build: a span from the top of one thigh to the other's as they scissor is no place for the front
 * of a skirt.)
 */
export function heldSpans(d: Pick<SkirtDraft, 'count' | 'columns' | 'heldRows'> & { readonly hug: ArrayLike<number> | null }, off: ArrayLike<number>, far: number, below = Infinity): { readonly a: Int32Array; readonly b: Int32Array; readonly u: Float32Array; readonly count: number } {
  const A = new Int32Array(d.count).fill(-1), B = new Int32Array(d.count).fill(-1), U = new Float32Array(d.count), cols = d.columns, R = d.hug;
  if (!R) return { a: A, b: B, u: U, count: 0 };
  // (over a gap: cut far off her skin, and under where her legs part)
  const gap = (p: number): boolean => off[p] > far && R[p * 3 + 1] < below;
  let count = 0;
  for (let r = 1; r < d.heldRows; r++) {
    const row = r * cols;
    let first = -1;
    for (let c = 0; c < cols && first < 0; c++) if (!gap(row + c)) first = c;
    if (first < 0) continue;
    for (let k = 1; k < cols; ) {
      if (!gap(row + ((first + k) % cols))) { k++; continue; }
      let len = 1;
      while (k + len < cols && gap(row + ((first + k + len) % cols))) len++;
      const a = row + ((first + k - 1) % cols), b = row + ((first + k + len) % cols);
      const ex = R[b * 3] - R[a * 3], ey = R[b * 3 + 1] - R[a * 3 + 1], ez = R[b * 3 + 2] - R[a * 3 + 2], l2 = ex * ex + ey * ey + ez * ez;
      for (let j = 0; j < len; j++) {
        const q = row + ((first + k + j) % cols);
        const u = l2 > 1e-12 ? ((R[q * 3] - R[a * 3]) * ex + (R[q * 3 + 1] - R[a * 3 + 1]) * ey + (R[q * 3 + 2] - R[a * 3 + 2]) * ez) / l2 : (j + 1) / (len + 1);
        A[q] = a; B[q] = b; U[q] = Math.min(1, Math.max(0, u)); count++;
      }
      k += len;
    }
  }
  return { a: A, b: B, u: U, count };
}
/**
 * `inside`: for a skirt UNDER her belly, how far inside the under-belly waistband each point of her skin is as she is
 * shaped (`SKIRT_LINE`; one a point of `body.positions`). Without it, or where that line is not found round her, the
 * ring is at `SKIRT_TOPS`' heights.
 */
export function draftSkirt(body: BodyInput, settings: SkirtSettings, inside: ArrayLike<number> | null = null): SkirtDraft {
  const C = SKIRT_CUT, s = clampSkirt(settings), J = body.joints, anchors = anchorsOf(s);
  const hipY = (J.hip[0][1] + J.hip[1][1]) / 2, trunk = J.neck[1] - hipY;
  if (!(trunk > 0.2)) throw new RangeError(`draftSkirt: her trunk reads ${trunk} m`);
  const cols = C.columns, ringY = new Float32Array(cols);
  let lowest = Infinity, highest = -Infinity;
  for (let c = 0; c < cols; c++) { const y = hipY + ringShare(s.top, (c / cols) * Math.PI * 2) * trunk; ringY[c] = y; if (y < lowest) lowest = y; if (y > highest) highest = y; }
  // (its hem is counted on her legs, whatever its top does: a ring that follows her belly down does not take the hem
  // down with it -- but for a hem it would meet, `leastDrop`)
  let hemY = hemOf(J, s.length);
  // UNDER HER BELLY, ON THE UNDER-BELLY WAISTBAND'S OWN LINE (`SKIRT_LINE`): the ring's heights and how far out it is,
  // off her skin itself; and under it only her skin under that line
  let under: { readonly form: BodyInput; readonly r: Float64Array; readonly cz: number } | null = null, lineFound = 0;
  if (s.top === 'under' && inside && inside.length * 3 === body.positions.length) {
    const cut = underLine(body, inside, SKIRT_LINE.inside);
    let zMin = Infinity, zMax = -Infinity;
    for (let k = 2; k < cut.line.length; k += 3) { if (cut.line[k] < zMin) zMin = cut.line[k]; if (cut.line[k] > zMax) zMax = cut.line[k]; }
    if (zMax > zMin) {
      const cz = (zMin + zMax) / 2, on = ringOn(cut.line, 0, cz, cols);
      lineFound = on.found;
      if (on.found >= SKIRT_LINE.least) {
        const y = evened(on.y, SKIRT_LINE.smooth), r = evened(on.r, SKIRT_LINE.smooth);
        lowest = Infinity; highest = -Infinity;
        for (let c = 0; c < cols; c++) { ringY[c] = y[c]; if (y[c] < lowest) lowest = y[c]; if (y[c] > highest) highest = y[c]; }
        under = { form: cut.covered, r, cz };
      }
    }
  }
  hemY = Math.min(hemY, lowest - C.leastDrop);
  const rows = Math.min(C.mostRows, Math.max(4, Math.ceil((highest - hemY) / C.rowStep) + 1));
  const form = dressForm(under?.form ?? body, Math.max(0.01, hemY - 0.02), highest + 0.02, C.formStep);
  // the axis: her middle, half-way between her front and her back at the ring
  const ring = hullAt(form, (lowest + highest) / 2);
  let zMin = Infinity, zMax = -Infinity;
  for (let k = 1; k < ring.length; k += 2) { if (ring[k] < zMin) zMin = ring[k]; if (ring[k] > zMax) zMax = ring[k]; }
  const cx = 0, cz = under ? under.cz : Number.isFinite(zMin) ? (zMin + zMax) / 2 : 0;
  const tan = Math.tan((C.fullAngle * s.flare * Math.PI) / 180), ease = s.tucked ? C.easeTucked : C.ease;
  const count = cols * rows, rest = new Float32Array(count * 3), pin = new Float32Array(count);
  // HOW FAR HER OUTLINE REACHES TOWARD EACH COLUMN, READ ONCE A SLICE (a height between two slices: between their two
  // reaches, as `hullAt` blends their outlines; a slice with nothing of her takes the other's). Asked of `hullAt`
  // itself for every row and every slice between rows, each asking made the two outlines again: most of a cut's time.
  const levels = form.hulls.length, table = new Float64Array(levels * cols).fill(NaN);
  for (let i = 0; i < levels; i++) { const h = form.hulls[i]; if (h.length >= 6) for (let c = 0; c < cols; c++) table[i * cols + c] = reachOf(h, cx, cz, (c / cols) * Math.PI * 2); }
  const reachAt = (c: number, y: number): number => {
    if (levels === 0) return 0;
    const f = Math.min(levels - 1, Math.max(0, (y - form.y0) / form.step)), i = Math.min(levels - 1, Math.floor(f)), j = Math.min(levels - 1, i + 1), p = table[i * cols + c], q = table[j * cols + c];
    return p !== p ? (q !== q ? 0 : q) : q !== q ? p : p + (f - i) * (q - p);
  };
  // THE NEAREST OF HER OUTLINE, `ease` off it, TO A POINT OF THE CLOTH AS CUT, at a height (between two slices: between
  // their two; a slice with nothing of her takes the other's; a point the outline holds, or nearer it than `ease`, is
  // its own): where a point of the ON-HER cut is laid (`SKIRT_FIT`, "each point's place is the nearest of her").
  const near = [0, 0, 0], foot = [0, 0];
  const footOn = (i: number, tx: number, tz: number): boolean => {
    if (!nearestOn(form.hulls[i], tx, tz, near)) return false;
    const dx = tx - near[0], dz = tz - near[1], l = Math.hypot(dx, dz);
    if (near[2] > 0 || l <= ease) { foot[0] = tx; foot[1] = tz; } else { foot[0] = near[0] + (dx / l) * ease; foot[1] = near[1] + (dz / l) * ease; }
    return true;
  };
  const footAt = (tx: number, tz: number, y: number, out: number[]): void => {
    out[0] = tx; out[1] = tz;
    if (levels === 0) return;
    const f = Math.min(levels - 1, Math.max(0, (y - form.y0) / form.step)), i = Math.min(levels - 1, Math.floor(f)), j = Math.min(levels - 1, i + 1);
    const a = footOn(i, tx, tz), ax = foot[0], az = foot[1], b = footOn(j, tx, tz);
    if (a && b) { out[0] = ax + (f - i) * (foot[0] - ax); out[1] = az + (f - i) * (foot[1] - az); } else if (a) { out[0] = ax; out[1] = az; } else if (b) { out[0] = foot[0]; out[1] = foot[1]; }
  };
  // FIT (`SKIRT_FIT`): under 1 its second cut, ON HER (`hug`), beside the cloth's own, which is as it always was
  const fit = fitOf(s), hug = fit < 1 ? new Float32Array(count * 3) : null, on = [0, 0];
  for (let c = 0; c < cols; c++) {
    const a = (c / cols) * Math.PI * 2, y0 = ringY[c], held = anchorShare(anchors, a);
    const r0 = (under ? under.r[c] : reachAt(c, y0)) + ease;
    let widest = r0;
    for (let r = 0; r < rows; r++) {
      const y = y0 + (hemY - y0) * (r / (rows - 1)), drop = y0 - y;
      // never back in toward her going down: the widest of her from the ring to here, read every slice of the way
      const yPrev = r > 0 ? y0 + (hemY - y0) * ((r - 1) / (rows - 1)) : y0;
      // (...and at the row's own height: read only on the slices' steps from the row above, a row between two of them
      // was cut for the slice OVER it -- where she widens fast going down, the top of her seat under a ring at the
      // small of her back, the cloth as cut was 3 mm inside her: MEASURED 2026-11-17 on the room's points at 0%)
      for (let yy = yPrev; ; yy -= C.formStep) { const q = reachAt(c, Math.max(yy, y)) + ease; if (q > widest) widest = q; if (yy <= y) break; }
      const R = Math.max(widest, r0 + tan * drop), i = (r * cols + c) * 3;
      rest[i] = cx + Math.sin(a) * R; rest[i + 1] = y; rest[i + 2] = cz + Math.cos(a) * R;
      pin[r * cols + c] = (C.hold[r] ?? 0) * held;
      if (!hug) continue;
      // ON HER: the ring as it is; under it the nearest of her own outline at this height to the cloth's point here,
      // in and out as she goes
      if (r === 0) { hug[i] = rest[i]; hug[i + 1] = y; hug[i + 2] = rest[i + 2]; continue; }
      footAt(rest[i], rest[i + 2], y, on);
      hug[i] = on[0]; hug[i + 1] = y; hug[i + 2] = on[1];
    }
  }
  const triangles = new Uint32Array(cols * (rows - 1) * 6);
  let t = 0;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
    const d = (c + 1) % cols, p00 = r * cols + c, p01 = r * cols + d, p10 = (r + 1) * cols + c, p11 = (r + 1) * cols + d;
    // (columns run from her front toward her +x side: this winding faces out of her; the diagonal alternates)
    if ((r + c) & 1) { triangles[t++] = p00; triangles[t++] = p11; triangles[t++] = p01; triangles[t++] = p00; triangles[t++] = p10; triangles[t++] = p11; }
    else { triangles[t++] = p00; triangles[t++] = p10; triangles[t++] = p01; triangles[t++] = p01; triangles[t++] = p10; triangles[t++] = p11; }
  }
  return { count, columns: cols, rows, rest, triangles, pin, ringY, hemY, fit, hug, heldRows: hug ? rows : 1, axis: [cx, cz], lineFound };
}
