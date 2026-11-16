/**
 * A PAINTED BOTTOM'S CUT, DRAWN SMOOTH (Joshua, 2026-11-15, the morning his sixteen tops went in: "Looks good!!! Let's
 * work on all the bottoms…"; of the tops, the day before: "fix the painted clothes and add smooth edges, shirt
 * collars/sleeves like how you did the bikini bottom").
 *
 * WHAT WAS WRONG. A painted bottom's edges were a value a vertex of her skin (`paintTemplates.coverage`): its waistband
 * where the blend of three of them crosses one half, its legs' ends the same. A value a vertex rides her points, and
 * her shapes slide her points along her skin, each triangle by its own amount -- so the waistband was torn wherever
 * a top left her middle bare (MEASURED 2026-11-15, `pulledSlip.ts`: its line turning 29 degrees at its 90th percentile
 * as the room draws her, at any size of belly, where it turns 3.4 on her body file). And a leg's end was a level line
 * on her REST skin, which bends with her skin where her leg's bones share it.
 *
 * WHAT THIS GIVES. A bottom -- leggings, shorts, a stocking, a sock: a template with a waistband or a leg's top, legs
 * and no top of its own (`isDrawnBottom`) -- is drawn by each pixel of her skin (`fabricMaterial.ts`, formula for
 * formula with what is here):
 *
 * - ITS WAISTBAND is a line round her through a height at her front's middle, at her sides and at her back's middle
 *   (`waistLine`: one sweep through the three since 2026-11-15; 1 her front, 0 her back: `aroundAt`), worked out for
 *   each pixel at its own place on her REST skin with her skin's slip taken off (`pulledSlip.ts`). So it stays on the skin it was
 *   put on -- an under-belly band stays under her bump as her bump comes down (her skin there is 8.6 cm lower at 200%
 *   than at rest: MEASURED), which a line held level in the room would not -- and it is a smooth line at every size.
 *   How far inside it a pixel is, is measured square to the line (`waistAt`), so a BAND along it is as wide where
 *   the line climbs her hips as where it runs level.
 *
 * - ITS LEGS' ENDS (and a stocking's or a sock's top) are FLAT RINGS ROUND HER LEG, square to the bone they are on and
 *   carried by that bone as she is posed, as a drawn top's sleeves' ends are (`topCut.sleevePlane`): a place on her
 *   leg's skin is measured along her leg where it IS, posed (`legPlanes`, `legMeasure`: so far down her thigh's bone
 *   from her hip joint, and on down her shin's from her knee, in her own rest lengths -- a leg her build has made
 *   longer keeps its hem at the same share of it). Round her knee the two bones' measures are blended by where the
 *   skin lies at REST (`legBlend`): her knee's skin, bent, takes a ring between her thigh's and her shin's, and skin
 *   above it rides her thigh's alone however far she squats.
 *   A leg's end cuts her LEG's skin (her bones say which: the seat and the hips' sides hang from her thigh bones and
 *   are among it); the rest of her under a waistband is covered whatever her legs do (`legShare`: a belly in front of
 *   a thigh brought forward is not past its hem).
 *
 * - BANDS: a waistband, a hem or a cuff at each leg's end, a welt at a stocking's top -- each as wide as its number all
 *   the way round, in the bottom's own fabric a shade darker with a seam, or in its EDGING colour.
 *
 * WHAT IS LEFT AS IT WAS. Her paint per vertex (`paintTemplates.coverage`) is laid exactly as before, for what reads
 * it (a save, a brush that takes the template off, her navel's flattening, AUTO's detail): only what the shader draws
 * a layer BY has changed. The one-pieces' leg openings and the designed bottoms (her bikini's) are not drawn this way.
 *
 * Pure arithmetic over plain arrays; nothing here reads a mesh or the GPU.
 */
import { MAP_LINES } from './bodyRegions';
import type { CoverageParams } from './paintTemplates';

export type V3 = readonly [number, number, number];
export type V4 = readonly [number, number, number, number];

/**
 * GAME TUNING (metres on her) but `range`, which is the shader's own.
 * - `kneeBlend`: her leg's measure passes from her thigh's bone's to her shin's over this much either side of her knee
 *   (her knee's skin, by where it lies at rest).
 * - `range`: the scale a distance is put on for its edge to be drawn a pixel wide (as a top's cut's).
 * - `slipUnder`, `slipOver`: her pulled slip is worked out from this far under her hip joints to this far over them
 *   (`pulledSlip.ts`): every waistband the WAISTBAND sliders reach, and 6 cm and more round it -- a point on the
 *   region's border is held, and a held border dulls the slip beside it.
 * - `far`: a distance that is no edge (a garment with feet has no end to its legs; a bottom no top to them).
 * - `acrossLeast`: her skin is taken as no shorter across her than this share of its rest length (`waistAt`; the
 *   shader's own guard, `PULLED_SLIP.across`'s least).
 * - `bandFloor`: a waistband's BAND reaches no lower than this far under her hip joints (`LowFrame.floor`,
 *   `waistBanded`): it stops above her cleft, at a level line. An under-belly waistband's front lies a centimetre
 *   under her hip joints, and a band 3 cm deep under it ran to her crotch -- where WHERE A PLACE STANDS ROUND HER
 *   (`roundAt`) HAS NO MEANING: her axis comes out of her there, a millimetre along her skin is half a turn round it,
 *   and a line's height "at that place round her" swings from its front's to its side's and back. MEASURED 2026-11-15
 *   in the room, in a black edging: the band's lower edge dotted, two dark ovals under its point, and (the band held
 *   to a depth by its line's height alone) black streaks from its corners down to her cleft. The top of her cleft is
 *   3.45 cm under her hip joints (`birthArea.BIRTH_AREA`: 48 degrees round a middle 4.8 cm over her crotch's lowest
 *   point, at 4.7 cm).
 * - `stay…`: AN UNDER-BELLY WAISTBAND IS A HOOP THAT SWINGS DOWN UNDER HER BELLY (`stayAt`, which says why).
 *   `stayReach`: its front may stand this much further from its hinge than it does on her body file before it
 *   swings (the room's own 100% stands 1.7 cm further out there than the file's rest shape). `staySwing`: it swings
 *   this many times as far as its front needs to clear her belly -- GAME TUNING to his drawing of her at 200%, whose
 *   line down her hip is steeper than the least swing's (17 degrees; of the sketches at 17, 20 and 23, Joshua:
 *   "sheet-swing-200-s23.png looks good"). `stayRoom`, `stayEase`: its surface is told this much higher than it is
 *   while it has not swung, so that up to the size she was cut for it bares nothing its line covers (her skin under
 *   the line keeps its heights within 8 mm from 0% to 100%), and less as it swings: none from `stayEase` radians
 *   on. `stayGroin`, `stayFold`: between her thighs the cloth's front is ONE STRAIGHT LINE ACROSS HER, this far
 *   (`stayFold`: level with it) in front of the foremost place her leg's skin meets her trunk's within `stayGroin`
 *   of her middle, as she is shaped (`foldOf`, which says why); and within `stayGroin` of her middle her crease is
 *   told at the height it has there. `stayWide`: how far to each side
 *   of her middle her crease's heights are told (`CREASE_STEPS` of them; past it, the last). `stayTurn`: where the places her leg's skin meets her trunk's at one
 *   distance from her middle span more height than this, the line has turned up her hip: her crease ends there.
 *   `stayRound`: how round the corners are where the hoop's edge, her crease and the waistband's own line meet.
 *   `stayNear`: skin up to this far over the line by height is counted with what is under it when the hoop's reach
 *   is measured. `stayUnder`, `stayOver` (shares of her trunk, as a rise is): a waistband whose FRONT is no higher
 *   than the one is under her belly, and a hoop; from the other up it is on her belly or over it and rides her skin
 *   as it stretches (Joshua: "Mid or over the belly it can stretch like it is"); between, its reach grows until it
 *   never swings.
 * - `band…`: A HOOP'S BAND IS TOLD AT STATIONS ROUND HER (`bandStations`, `bandInner`, which say why). `bandUnder`,
 *   `bandOver`: each station's cut of her rest skin runs from this far under her hip joints to this far over them.
 *   `bandLow`, `bandLowAt`, `bandHigh`, `bandHighAt`, `bandMost`: the line the stations turn about -- as far behind her
 *   hip joints as `bandLow` says (under 0) at `bandLowAt` under them, in front of them by `bandHigh` at `bandHighAt`
 *   over them, straight between and on, never further forward than `bandMost`. It leans back as it goes down: by her
 *   crotch the skin between her thighs is a notch in her outline, and seen from a line well behind it the notch's
 *   walls stand nearly edge on -- from a line further forward they spread over the turns her thighs' fronts stand at
 *   (MEASURED 2026-11-15 with an upright line half way between her hip joints and her side seams: the band drawn on
 *   the skin beside her opening, 4.5 to 6.8 cm from the cloth's edge) -- and no further back than her seat's cleft lets
 *   it (with the line 4.5 cm behind her hip joints there: the band drawn in that cleft, 18 cm from the edge).
 *   `bandBridge`: the share of the stations, from her front's middle, among which the band's inner edge is held to
 *   no rise from her middle out to its lowest (`bandInner`). `bandStride`: how many of a cut's points the search for
 *   the cloth's edge steps over at a time.
 * - `moon…`: A HOOP'S FRONT IS A HALF-MOON SEEN FROM HER FRONT (`frontMoon`, which says why). `moonSoft`: how wide the
 *   bell is that its curve is smoothed by (metres along her). `moonFill`: how far over the cut's own edge it may lay
 *   cloth while the hoop has not swung (its rounded bottom over a V's point); none once it has swung `stayEase`.
 *   `moonBlend`: over how much of her width, inside its tips, it eases back to the cut's own edge. `moonOn`,
 *   `moonBack`: it is laid on all of her from `moonOn` behind her axis forward, and on none of her from `moonBack`
 *   behind it back -- the fold under her belly, between her thighs, is in front of that (MEASURED 2026-11-15 at 200%:
 *   its deepest 0.4 to 3.6 cm behind her axis) and is bared with what is over the moon; further back her skin turns
 *   down under her, where a height seen from her front says nothing. The cut's edge further back than `moonOn` is
 *   none of what the moon is fitted to. `moonMiddle`: within
 *   this of her middle a swung moon is not lowered under the cut's own edge (`frontMoon`), and from twice it on it is. `moonStray`:
 *   a station's inner edge further than this off its neighbours' smooth line is left out of the band's (`innerMoon`).
 * - `fold…`: A SWUNG HOOP'S FRONT RUNS IN THE FOLD UNDER HER BELLY (`FOLD_LINE`, `foldAt`, which say why): laid
 *   within `foldIn` of her middle, eased out by `foldOut`, and in front of her from `foldFrom` behind her axis (none)
 *   to `foldTo` (all); `foldReach` higher while the hoop has not swung (so it binds nothing), none of that by
 *   `foldSwing` radians. `foldDepth`, `foldCurve`: of her trunk's skin, none of it further forward than `foldDepth` in
 *   front of her axis at her middle, `foldCurve` x (how far out from her middle)^2 less further out (metres) -- his line
 *   as she is shaped is 3.1 to 3.3 cm in front of it at her middle, 1.6 to 2.0 at 13 cm out (MEASURED). The guard is
 *   the edge there: her rest skin within a quarter of a centimetre of his line stands from 2.5 to 8.5 cm in front of
 *   her axis at her middle at 150% (MEASURED on the room's points), so a rest height alone drew blocks of cloth up her
 *   belly's underside; her skin half a centimetre and more under his line stands 2.5 cm in front of it and less (her
 *   crotch going back), and is never bared by it. It is laid wherever his line is, whatever else covers her there, and
 *   eased off from `foldDeepIn` out to `foldOut` (where the edge goes back round her hips). Between `foldIn` and
 *   `foldOut` the edge is eased from his line to the hoop's: they part there as her belly grows (at 200%, 14 cm out,
 *   his line is 6.7 cm over her hip joints on her rest skin and the hoop's edge 1.8 -- MEASURED on the room's points),
 *   and the nearer of the two, or his line until the hoop's took over, drew the edge up and down again, an ear at each
 *   hip seen from her front. `foldStretchMin`, `foldStretchMax`: what `foldStretch` is held to.
 */
export const LOW_CUT = Object.freeze({
  kneeBlend: 0.04, range: 0.03, slipUnder: 0.08, slipOver: 0.4, far: 1e4, acrossLeast: 0.25, bandFloor: 0.026,
  stayReach: 0.03, staySwing: 1.35, stayRoom: 0.015, stayEase: 0.105, stayGroin: 0.09, stayFold: 0, stayWide: 0.2, stayTurn: 0.03, stayRound: 0.01, stayNear: 0.005, stayUnder: 0.02, stayOver: 0.1,
  bandUnder: 0.14, bandOver: 0.4, bandLow: -0.01, bandHigh: 0.045, bandLowAt: -0.06, bandHighAt: 0.17, bandMost: 0.06, bandBridge: 0.34, bandStride: 6,
  moonSoft: 0.012, moonFill: 0.005, moonBlend: 0.03, moonOn: 0.01, moonBack: 0.03, moonMiddle: 0.02, moonStray: 0.01,
  foldIn: 0.13, foldOut: 0.16, foldFrom: -0.04, foldTo: -0.02, foldReach: 0.2, foldSwing: 0.19, foldDepth: 0.031, foldCurve: 0.85, foldDeepIn: 0.13, foldEase: 3.88, foldEaseLeast: 0.25, nearLeast: 0.2, nearMost: 12, nearCap: 1.8, nearFoldCap: 4, foldStretchMin: 0.9, foldStretchMax: 6,
});
/** How many heights a hoop's front moon is told by, from her middle out to its tips (`frontMoon`; four to a `vec4` of the shader's). */
export const MOON_STEPS = 16;
/** How many heights her crease is told by, from her middle out to `LOW_CUT.stayWide` (the shader's array is this long). */
export const CREASE_STEPS = 16;
/** How many stations a hoop's band is told at, from the middle of her front round to the middle of her back (`bandStations`; four to a `vec4` of the shader's). */
export const BAND_STEPS = 32;

/** A bottom's BANDS, metres wide: its waistband, its legs' hems or cuffs, a stocking's or a sock's top. 0: none there. */
export interface LowBands { readonly waist: number; readonly leg: number; readonly top: number }
/**
 * GAME TUNING (metres): a bottom's bands unless its template says (`CoverageParams.lowBand`) -- an elastic waistband
 * three centimetres deep, a turned hem at each leg's end, a welt at a stocking's top.
 */
export const LOW_BANDS: LowBands = Object.freeze({ waist: 0.03, leg: 0.012, top: 0.03 });

/**
 * One of her legs at rest: her hip, knee and ankle joints, her thigh's and her shin's lengths (her units), its side (+1
 * the leg at x over her middle) and which of her named joints are its own (`hipL`, `kneeL`... or `hipR`...).
 */
export interface LowLeg { readonly hip: V3; readonly knee: V3; readonly ankle: V3; readonly thigh: number; readonly shin: number; readonly side: 1 | -1; readonly name: 'L' | 'R' }
/** What a bottom's cut is laid by on one body: her own measures, in her mesh's own units (the room's rest positions). */
export interface LowFrame {
  readonly unitsPerMetre: number;
  /** Her middle (x), her hip joints' height, her trunk's length (her hip joints to the base of her neck) and which way she faces along z. */
  readonly mid: number; readonly hipY: number; readonly trunk: number; readonly facing: number;
  /** How far in front of her spine her side seam runs (her units): `around` is a half there. */
  readonly seam: number;
  /** The height a waistband's BAND reaches no lower than (her units; `LOW_CUT.bandFloor` under her hip joints). */
  readonly floor: number;
  /**
   * What an under-belly waistband's hoop is laid by (`stayAt`): how much further than on her body file its front may
   * stand before it swings, how much higher its surface is told while it has not swung, how round its corners are, how
   * far over the line by height a point of her skin is still counted with it and how far to each side of her middle
   * her crease is told, and how far in front of her groin's foremost place the cloth's front runs (her units); how
   * many times as far as it needs to it swings, and the swing its room is gone by (radians).
   */
  readonly stay: { readonly reach: number; readonly room: number; readonly round: number; readonly near: number; readonly wide: number; readonly fold: number; readonly swing: number; readonly ease: number };
  /**
   * THE MIDDLE OF HER FRONT: her trunk's points within 6 mm of her middle and in front of her axis, from 10 cm under
   * her hip joints to 35 over them, in order up her REST skin -- which of her vertices they are (`middle`) and each
   * one's height and how far ahead of her axis it stands at rest (`fore`: two numbers a point, her units). How far a
   * hoop's front stands from its hinge is measured off them at rest (`lowSpec`), and how far it has swung off where the
   * room has them now (`swingOf`). Empty with no skin given (`LowFrameInput.skin`): no waistband is a hoop then.
   */
  readonly middle: Uint32Array; readonly fore: Float32Array;
  /** The middle of her back at rest, from her hip joints up: each point's height and how far BEHIND her axis it stands (two numbers a point, the lowest first; her units). A hoop's hinge is on it (`rearAt`). */
  readonly rear: Float32Array;
  /**
   * HER CREASE, where her thighs meet her trunk in front: its height on her REST skin at `CREASE_STEPS` distances to
   * the side of her middle, out to `stay.wide` (her units) -- at each, the lowest place her leg's skin meets her
   * trunk's in front of her hip joints; never lower further out than nearer, held from where the line turns up her
   * hip, told within `LOW_CUT.stayGroin` of her middle as it stands at that distance, evened once. A hoop bares
   * nothing under it (`underAt`). Null with no skin given.
   */
  readonly crease: Float32Array | null;
  /**
   * HER GROIN: the vertices at which her leg's skin meets her trunk's in front of her hip joints, within
   * `LOW_CUT.stayGroin` of her middle. The cloth's front between her thighs is told off where the room has them now
   * (`foldOf`). Empty with no skin given.
   */
  readonly groin: Uint32Array;
  /** Her spine as a line: four joints' [height, depth], the lowest first. */
  readonly spine: readonly (readonly [number, number])[];
  /** Her legs: the one on the side of x over her middle, then the other. */
  readonly legs: readonly [LowLeg, LowLeg];
}
export interface LowFrameInput {
  readonly unitsPerMetre: number;
  /** +1 facing +z (the default), -1 facing -z. */
  readonly facing?: number;
  readonly joints: Readonly<Record<'pelvis' | 'spine' | 'chest' | 'neck' | 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR', V3>>;
  /** Her rest skin (xyz a point, her units), which of it is a limb's (`limbSkin`) and her triangles: the middle of her front and of her back and her crease are measured off them (`LowFrame.middle`, `rear`, `crease`). */
  readonly skin?: { readonly rest: ArrayLike<number>; readonly limb: ArrayLike<number>; readonly index: ArrayLike<number> };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a || 1e-12)); return t * t * (3 - 2 * t); };
/** The lesser of two distances, the corner between them rounded over `k`. */
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Her measures for a bottom's cut, from her joints (as `bodyRegions.mapBody` reads them: the same middle, trunk and spine). */
export function lowFrame(input: LowFrameInput): LowFrame {
  const J = input.joints, U = input.unitsPerMetre, facing = input.facing ?? 1;
  const mid = (J.hipL[0] + J.hipR[0]) / 2, hipY = (J.hipL[1] + J.hipR[1]) / 2, trunk = Math.max(1e-6, J.neck[1] - hipY);
  const spine = [J.pelvis, J.spine, J.chest, J.neck].map((j) => [j[1], j[2]] as const).sort((a, b) => a[0] - b[0]);
  const leg = (hip: V3, knee: V3, ankle: V3, name: 'L' | 'R'): LowLeg => ({ hip, knee, ankle, thigh: Math.hypot(...sub(knee, hip)) || 1e-6, shin: Math.hypot(...sub(ankle, knee)) || 1e-6, side: hip[0] >= mid ? 1 : -1, name });
  const a = leg(J.hipL, J.kneeL, J.ankleL, 'L'), b = leg(J.hipR, J.kneeR, J.ankleR, 'R');
  const stay = { reach: LOW_CUT.stayReach * U, room: LOW_CUT.stayRoom * U, round: LOW_CUT.stayRound * U, near: LOW_CUT.stayNear * U, wide: LOW_CUT.stayWide * U, fold: LOW_CUT.stayFold * U, swing: LOW_CUT.staySwing, ease: LOW_CUT.stayEase };
  const frame: LowFrame = { unitsPerMetre: U, mid, hipY, trunk, facing, seam: MAP_LINES.seamAhead * trunk, floor: hipY - LOW_CUT.bandFloor * U, stay, middle: new Uint32Array(0), fore: new Float32Array(0), rear: new Float32Array(0), crease: null, groin: new Uint32Array(0), spine, legs: a.side >= b.side ? [a, b] : [b, a] };
  if (!input.skin) return frame;
  const { rest, limb, index } = input.skin;
  // the middle of her front, up her rest skin, and the middle of her back
  const front: number[] = [], back: (readonly [number, number])[] = [], y0 = hipY - 0.1 * U, y1 = hipY + 0.45 * U;
  for (let v = 0; v < limb.length; v++) {
    const y = rest[v * 3 + 1];
    if (limb[v] > 0.5 || y < y0 || y > y1 || Math.abs(rest[v * 3] - mid) > 0.006 * U) continue;
    const ahead = aheadOf(frame, y, rest[v * 3 + 2]);
    if (ahead > 0) { if (limb[v] === 0 && y < hipY + 0.35 * U) front.push(v); } else if (ahead < 0 && y >= hipY) back.push([y, -ahead]);
  }
  front.sort((p, q) => rest[p * 3 + 1] - rest[q * 3 + 1]);
  back.sort((p, q) => p[0] - q[0]);
  // her crease: the lowest place her leg's skin meets her trunk's at each distance from her middle, in front of her
  // hip joints (behind them the two meet round her seat)
  const N = CREASE_STEPS, low = new Float64Array(N).fill(Infinity), high = new Float64Array(N).fill(-Infinity), hipZ = (J.hipL[2] + J.hipR[2]) / 2, groin = new Set<number>();
  for (let t = 0; t + 2 < index.length; t += 3) for (let e = 0; e < 3; e++) {
    const p = index[t + e], q = index[t + ((e + 1) % 3)];
    if (!((limb[p] === 0 && limb[q] < -0.5) || (limb[q] === 0 && limb[p] < -0.5))) continue;
    if (((rest[p * 3 + 2] + rest[q * 3 + 2]) / 2 - hipZ) * facing <= 0) continue;
    const y = (rest[p * 3 + 1] + rest[q * 3 + 1]) / 2, out = Math.abs((rest[p * 3] + rest[q * 3]) / 2 - mid), k = Math.round((out / stay.wide) * (N - 1));
    if (k < N) { low[k] = Math.min(low[k], y); high[k] = Math.max(high[k], y); }
    if (out <= LOW_CUT.stayGroin * U) { groin.add(p); groin.add(q); }
  }
  let crease: Float32Array | null = null;
  if (low.some((y) => Number.isFinite(y))) {
    const told = new Float64Array(N);
    let last = -Infinity, held = NaN;
    for (let k = 0; k < N; k++) {
      // (where the line has turned up her hip its heights at one distance from her middle span her hip: held from there)
      if (Number.isNaN(held) && Number.isFinite(low[k]) && high[k] - low[k] > LOW_CUT.stayTurn * U) held = Math.max(low[k], last);
      told[k] = last = Math.max(Number.isNaN(held) ? (Number.isFinite(low[k]) ? low[k] : last) : held, last);
    }
    // (between her thighs it is told as it stands at her groin's edge: there the cloth's front is a cut across her as
    // she is shaped, `foldOf`, and no height on her rest skin -- which is a tongue of her belly's underside)
    const edge = Math.min(N - 1, Math.round((LOW_CUT.stayGroin * U * (N - 1)) / stay.wide));
    for (let k = 0; k < edge; k++) told[k] = Math.max(told[k], told[edge]);
    for (let k = 0; k < N; k++) if (!Number.isFinite(told[k])) told[k] = hipY;
    crease = Float32Array.from(told, (_y, k) => (k === 0 || k === N - 1 ? told[k] : 0.25 * told[k - 1] + 0.5 * told[k] + 0.25 * told[k + 1]));
  }
  return { ...frame, middle: Uint32Array.from(front), fore: Float32Array.from(front.flatMap((v) => [rest[v * 3 + 1], aheadOf(frame, rest[v * 3 + 1], rest[v * 3 + 2])])), rear: Float32Array.from(back.flat()), crease, groin: Uint32Array.from(groin).sort() };
}

/** Her spine's depth at a height (`bodyRegions.mapBody`'s `spineZ`: the nearest joint's beyond its ends). */
export function spineDepth(frame: Pick<LowFrame, 'spine'>, y: number): number {
  const S = frame.spine;
  if (y <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (y <= S[i][0]) { const a = S[i - 1], b = S[i], u = (y - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  return S[S.length - 1][1];
}
/**
 * Where a place stands ROUND her (`BodyMap.around`, told by where the place is: 1 the middle of her front, 0 the middle
 * of her back, a half at her side seam), how far out from her middle it is, and how far from her axis (her units).
 */
export function roundAt(frame: LowFrame, x: number, y: number, z: number): { readonly around: number; readonly out: number; readonly radius: number } {
  const dz = (z - spineDepth(frame, y)) * frame.facing - frame.seam, dx = x - frame.mid, r = Math.hypot(dx, dz);
  return { around: r > 1e-9 ? 0.5 + 0.5 * (dz / r) : 0.5, out: Math.abs(dx), radius: Math.max(r, 1e-9) };
}
export const aroundAt = (frame: LowFrame, x: number, y: number, z: number): number => roundAt(frame, x, y, z).around;
/** How far in front of her axis (`roundAt`'s: the line of her side seams) a height and a depth stand (her units; behind it, under 0). */
export const aheadOf = (frame: Pick<LowFrame, 'spine' | 'facing' | 'seam'>, y: number, z: number): number => (z - spineDepth(frame, y)) * frame.facing - frame.seam;
/** How far in front of her axis the middle of her BACK stands at a height (under 0: it is behind it), off her rest skin (`LowFrame.rear`); null with none told. */
export function rearAt(frame: LowFrame, height: number): number | null {
  const R = frame.rear, n = R.length >> 1;
  if (!n) return null;
  if (height <= R[0]) return -R[1];
  for (let i = 1; i < n; i++) if (height <= R[i * 2]) { const u = (height - R[i * 2 - 2]) / Math.max(1e-9, R[i * 2] - R[i * 2 - 2]); return -(R[i * 2 - 1] + (R[i * 2 + 1] - R[i * 2 - 1]) * u); }
  return -R[n * 2 - 1];
}

/** Whether a template's bottom is drawn this way: a waistband or a leg's top, legs, no top of its own, no leg cut and no outline of its own. */
export function isDrawnBottom(p: Pick<CoverageParams, 'riseFront' | 'hemFront' | 'neckFront' | 'legCut' | 'outline'>): boolean {
  return p.riseFront !== null && p.hemFront === null && p.neckFront === null && !p.legCut && !p.outline;
}

/** A bottom's cut as numbers (her units): what the shader's layer is laid from. */
export interface LowSpec {
  /**
   * Its waistband: its height at the middle of her front, at her sides and at the middle of her back (`waistLine`; a
   * fourth number, 0, is not read). Null: none (a stocking, a sock).
   */
  readonly waist: V4 | null;
  /** Where its legs end, and where they begin, along her leg from her hip joint (`legAlong`); null: no end (it has feet), no top of its own (it has a waistband). */
  readonly end: number | null; readonly start: number | null;
  readonly bands: LowBands;
  /**
   * AN UNDER-BELLY WAISTBAND IS A HOOP (`stayAt`): `hinge`, where it swings about -- how far in front of her axis
   * (under 0: behind it) and how high, the middle of her back at its back's height; `reach`, how far from that hinge
   * its front may stand before it swings down (as far as the middle of her front stands under its line on her body
   * file, and `frame.stay.reach` more; her units). Null and `LOW_CUT.far`: a waistband that is no hoop -- its front on
   * her belly or over it -- and no waistband.
   */
  readonly hinge: readonly [number, number] | null; readonly reach: number;
}

/**
 * How far along her leg (her units from her hip joint, down her thigh's bone and on down her shin's) a share of her
 * leg is -- `fraction` as `BodyMap.leg` counts it, 0 at her hip joint and 1 at her ankle along the straight line
 * between them: the place on her bones that line's cut passes through. So a leg's end is where it was on her leg's
 * middle, and square to the bone it is on. (Her knee stands 3.4 degrees off that line: MEASURED 2026-11-15, her thigh
 * 36.6 cm and her shin 41.4, her knee at 0.469 of the line.)
 */
export function legAlong(leg: LowLeg, fraction: number): number {
  const line = sub(leg.ankle, leg.hip), l2 = dot(line, line) || 1e-12, thigh = sub(leg.knee, leg.hip), shin = sub(leg.ankle, leg.knee);
  const onThigh = (fraction * l2) / (dot(thigh, line) || 1e-12);
  if (onThigh <= 1) return onThigh * leg.thigh;
  return leg.thigh + ((fraction * l2 - dot(thigh, line)) / (dot(shin, line) || 1e-12)) * leg.shin;
}

/** A template's bottom on her: its waistband by its rises, its legs' ends and tops by its LEG LENGTH and LEG TOP, its bands. */
export function lowSpec(p: Pick<CoverageParams, 'riseFront' | 'riseSide' | 'riseBack' | 'legStart' | 'legEnd' | 'feet'> & { readonly lowBand?: Partial<LowBands> | null; readonly lowBowl?: number | null }, frame: LowFrame): LowSpec {
  const U = frame.unitsPerMetre, at = (t: number) => frame.hipY + t * frame.trunk, along = (f: number) => (legAlong(frame.legs[0], f) + legAlong(frame.legs[1], f)) / 2;
  const front = p.riseFront ?? 0, back = p.riseBack ?? front, side = p.riseSide ?? (front + back) / 2;
  // (legwear -- a leg's top of its own -- has no waistband: `paintTemplates.coverage`)
  const waist: V4 | null = p.legStart > 0 ? null : [at(front), at(side), at(back), p.lowBowl ?? 0];
  // (a waistband whose front is under her belly is a hoop: its hinge on the middle of her back, and its front's reach
  // -- the furthest from that hinge that the middle of her front stands under its line as she rests; `stayAt`)
  const hold = waist && frame.crease ? 1 - smoothstep(LOW_CUT.stayUnder, LOW_CUT.stayOver, front) : 0, behind = waist && hold > 1e-4 && waist[2] > waist[0] ? rearAt(frame, waist[2]) : null;
  let hinge: readonly [number, number] | null = null, reach: number = LOW_CUT.far;
  if (waist && behind !== null) {
    let most = 0;
    for (let i = 0; i < frame.fore.length; i += 2) if (frame.fore[i] <= waist[0] + frame.stay.near) most = Math.max(most, Math.hypot(frame.fore[i + 1] - behind, waist[2] - frame.fore[i]));
    if (most > 0) { hinge = [behind, waist[2]]; reach = Math.min(LOW_CUT.far, (most + frame.stay.reach) / hold); }
  }
  const B = p.lowBand ?? {};
  return {
    waist, end: p.feet ? null : along(p.legEnd), start: p.legStart > 0 ? along(p.legStart) : null,
    bands: { waist: waist ? (B.waist ?? LOW_BANDS.waist) * U : 0, leg: p.feet ? 0 : (B.leg ?? LOW_BANDS.leg) * U, top: p.legStart > 0 ? (B.top ?? LOW_BANDS.top) * U : 0 },
    hinge, reach,
  };
}

/**
 * A WAISTBAND'S LINE ROUND HER: ONE SWEEP through its height at the middle of her front (`around` 1), at her sides (a
 * half) and at the middle of her back (0) -- its height at `around`, and how fast that changes with `around`.
 *
 * Joshua, 2026-11-15, of the under-belly leggings pictured from her side beside his sheet's: "Change to side
 * profile… wait to push." His sheet's under-belly waistband, from her side, is one line from under her bump up to the
 * small of her back; from her front, a shallow U under her bump. The line was eased from each height to the next
 * (`paintTemplates.aroundLine`), level where it crossed each and, under her bump, held low across the bump's width
 * (its `frontReach`, 0.8) before it climbed: all of the climb from under her bump to over her hips -- 14.7 cm --
 * lay between 53 and 90 degrees round her, and from her side it was a wall up her flank with a corner at its foot
 * and another at its top, a level shelf behind it.
 *
 * `around` is HOW FAR FORWARD a place lies of all its distance from her axis (a half and half its cosine: `roundAt`),
 * so a line whose height is STRAIGHT in `around` is a waistband lying in a tilted plane -- from her side one straight
 * line, from her front a shallow U, level where it crosses the middle of her front and of her back (which a
 * waistband is, by her two sides being alike). So the line is drawn in `around` itself, and three heights in a row
 * give exactly that. Three that are not: the smooth curve through them that never turns back between two of them
 * (a monotone cubic through three points, Fritsch and Carlson's: its steepness at her side the harmonic mean of the
 * two runs', nothing where they differ in sign; at her front and at her back by the three-point rule, held to no
 * turn). A side as high as the back is level all the way round her back, whatever its front's slider does, and sweeps
 * down from her sides. The line's highest and lowest are among its three heights (`waistAt`'s bound reads them).
 *
 * `waist`: [front, side, back] heights, and its front's BOWL (0: the sweep as above).
 *
 * THE BOWL (Joshua, 2026-11-15, a yellow U drawn over the under-belly waistband pictured from her front at 0 and at
 * 100%: "needs to have a rounder curve and not so V shaped but like a U"): three heights in a row are a tilted plane,
 * and on her at 0% -- her hips' skin a third as long across her as on her body file -- a plane's cut is a V with
 * straight arms. A bowl holds the line low out from her front's middle and climbs it nearer her side: along the run
 * from her side to her front's middle the sweep is read at 1 - (1 - t)^(1 + bowl) for t, level where it crosses the
 * middle of her front. Her side and her back are as they were.
 */
export function waistLine(waist: readonly number[], around: number): { readonly height: number; readonly slope: number } {
  const front = waist[0], side = waist[1], back = waist[2];
  // the two runs' climb for each unit of `around`: her back's middle to her side, her side to her front's middle
  const d1 = 2 * (side - back), d2 = 2 * (front - side);
  const mid = d1 * d2 > 0 ? (2 * d1 * d2) / (d1 + d2) : 0;
  const ahead = around >= 0.5, s = clamp01(ahead ? (around - 0.5) * 2 : around * 2), bowl = ahead ? waist[3] ?? 0 : 0;
  const t = bowl > 0 ? 1 - Math.pow(1 - s, 1 + bowl) : s, eased = bowl > 0 ? (1 + bowl) * Math.pow(1 - s, bowl) : 1;
  const p0 = ahead ? side : back, p1 = ahead ? front : side, m0 = 0.5 * (ahead ? mid : sweepEnd(d1, d2)), m1 = 0.5 * (ahead ? sweepEnd(d2, d1) : mid);
  const t2 = t * t, t3 = t2 * t;
  return {
    height: (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (3 * t2 - 2 * t3) * p1 + (t3 - t2) * m1,
    slope: 2 * eased * ((6 * t2 - 6 * t) * (p0 - p1) + (3 * t2 - 4 * t + 1) * m0 + (3 * t2 - 2 * t) * m1),
  };
}
/** The sweep's steepness at an end (her front's middle, or her back's): `run`, the climb of the run that ends there; `other`, the other run's. */
function sweepEnd(run: number, other: number): number {
  const m = 0.5 * (3 * run - other);
  return m * run <= 0 ? 0 : run * other < 0 && Math.abs(m) > 3 * Math.abs(run) ? 3 * run : m;
}
/**
 * How far inside a waistband's line a place is (her units; + under the line, in the garment): its height under the
 * line's there, measured square to the line -- the line climbs `slope` for each unit of `around`, and `around` changes
 * by half of (how far out from her middle the place is) over (its distance from her axis) squared for each unit round
 * her at that distance.
 *
 * `across`: how much longer her skin is ACROSS her there as she is shaped than at rest (`pulledSlip.ts`: 0 as long,
 * -0.5 half as long). A line that climbs a centimetre for each centimetre round her REST skin climbs two where her
 * skin is half as long across -- her belly's, at 0%: her body file's rest shape has its 100% belly, and from there
 * to none her skin keeps its heights (MEASURED 2026-11-15: within 8 mm, from under her hips to under her bust) and
 * comes in up to 13.8 cm. Square to the line AS IT LIES ON HER is by that slope.
 *
 * IT IS THE DISTANCE TO A STRAIGHT LINE, and right where the line is nearly one over a band's depth: a level
 * waistband's, anywhere. An under-belly waistband runs level across her front, climbs her hips and levels at her
 * sides, and beside its climb this is short of the truth. MEASURED on her skin's points from the room, a band 3 cm
 * deep, from its inner edge straight to its line, beside where the line climbs (beside where it runs level: 3.1 to
 * 3.2 cm at every size): 1.7 cm at 0%, 2.4 at 73%, 2.9 at 100%, 3.2 at 150%, 3.4 at 200% (by her rest skin alone:
 * 1.3 at 0% and 5.2 at 200%). TRIED the same day, offline: the distance to the line ITSELF -- its heights eight
 * steps either side of the place, joined, the nearest point of the pieces: 3.1 cm at 73%, 3.4 at 100%, 3.3 at 150%,
 * 3.4 at 200% -- and 2.0 at 0%, where all of the climb is 3 cm of her skin across her (11 on her body file) and her
 * skin's length across her changes threefold within it, which one number at a place can not say. Nine looks at the
 * line a pixel for a band nobody would tell from this one: not taken.
 *
 * NEVER NEARER THE LINE THAN THE PLACE IS UNDER THE LOWEST OF IT (or over the highest of it): no point of the line is
 * nearer than that. A straight line's distance does not know it. Where her axis comes out of her between her legs a
 * place's distance from her axis goes to nothing, `around` runs through all its values within a millimetre, the line's
 * climb for each unit round her goes to no end -- and the distance "square to the line" to nothing, at a place a hand
 * under any waistband. MEASURED 2026-11-15 on her rest skin (twenty-eight places a triangle, every triangle of hers
 * from 12 cm under her hip joints up to 2 cm under the lowest of the line, her arms' left out): told to be within
 * 1.5 cm of the line -- drawn part cloth, part her skin -- 2,291 of 339,444 places under an under-belly line (the
 * nearest 0.25 mm, at a place 2.8 cm under the lowest of it), 54 under a low rise, 22 under an over-belly one (2.2 mm,
 * 24.8 cm under it), none under the high rise, which is nearly level; the nearest of each within a millimetre of her
 * axis, 3.8 cm under her hip joints. In the room, the under-belly leggings at 100% from below: a pale hairline V under
 * the point of its front, its two strokes the two directions round her in which the line climbs. With the bound:
 * none, under any of them (`tests/bottomCut.test.ts`).
 */
export function waistAt(waist: V4, frame: LowFrame, x: number, y: number, z: number, across = 0): number {
  const r = roundAt(frame, x, y, z);
  return lineInside(waist, r.around, r.out, r.radius, y, across);
}
/** `waistAt`'s arithmetic, for a place told by where it stands round her, how far out from her middle and from her axis it is, and its height. */
function lineInside(waist: V4, around: number, out: number, radius: number, y: number, across: number): number {
  const line = waistLine(waist, around), climb = (line.slope * 0.5 * out) / (radius * radius * Math.max(LOW_CUT.acrossLeast, 1 + across));
  const d = (line.height - y) / Math.sqrt(1 + climb * climb);
  // (never nearer the line than the place is UNDER THE LOWEST of it, or over the highest: `waistAt`'s note)
  return Math.min(Math.max(d, Math.min(waist[0], waist[1], waist[2]) - y), Math.max(waist[0], waist[1], waist[2]) - y);
}
/**
 * A place's distance inside a waistband's line AS ITS BAND COUNTS IT (her units; the band is where this is under the
 * band's depth): `inside`, how far inside the line it is (`waistAt`) -- and never less than (the band's depth less how
 * far the place stands over `LowFrame.floor`), so that at the floor and under it nothing is the band's, and the band's
 * lower edge there is the floor's own level line. (The shader draws the same places as two edges, each antialiased by
 * its own slope: inside the line by less than the band's depth, and over the floor.)
 */
export function waistBanded(inside: number, depth: number, frame: LowFrame, y: number): number {
  return Math.max(inside, depth - (y - frame.floor));
}

/**
 * AN UNDER-BELLY WAISTBAND IS A HOOP THAT SWINGS DOWN UNDER HER BELLY (Joshua, 2026-11-15, of the under-belly leggings
 * pictured at 200%: "The under the belly leggings should be below the belly, the 200% render is stretched about
 * halfway under the belly… Need to offset it closer to the body and adjust the height just a little bit to keep it
 * from moving from 0-200%. Mid or over the belly it can stretch like it is, but realistically, it wouldn't stay
 * halfway like that with a large belly and slide down (closer to the pelvis)"; with his line drawn on her 200%
 * drawing sheet from her front, her 45 degrees, her side and her back: "Here is how 200% should look like… if you get
 * 200 good, smaller should be better"; and of the sketches of this against that sheet: "sheet-swing-200-s23.png looks
 * good, just need to fix at the pelvis…").
 *
 * HIS LINE AT 200%, MEASURED off his sheet by its corner marks (centimetres over her hip joints): level across her
 * back at 17.2 to 18.0, the top of her seat; from her side ONE STRAIGHT LINE 35 degrees under level, from the back of
 * her seat (13.0) across her hip -- 7 at her hip's widest, 1 UNDER her hip joints where it crosses the line of her
 * side seams -- into the crease where her thigh meets her belly, and along that crease to her middle. From her front
 * there is nothing of it but at her hips' outlines: her belly hangs over the rest.
 *
 * WHY IT WAS OUT ON HER BELLY. A waistband's line is kept on the skin it was put on (`pulledSlip.ts`), which is right
 * for a waistband ON her belly: it stretches with her. Under her belly the same rule carried it off her. MEASURED
 * 2026-11-15 on her skin's points read out of the room, down the middle of her front: the skin under an under-belly
 * line's front (a centimetre under her hip joints on her body file) stands 9.7 cm in front of her axis at 100%, 14.2
 * at 150% and 18.8 at 200%, and 1.8, 6.0 and 9.9 cm UNDER her hip joints -- the underside of her belly as it hangs,
 * of which the cloth was more than half by 200%. Her belly's skin begins at the top of her cleft: the centimetre of
 * her rest skin from 3.8 to 2.8 cm under her hip joints is 9.7 cm of that underside at 200%. So no line at one
 * height on her rest skin is under her belly at every size; and no level in the room is either, for at 200% her
 * belly hangs 10 cm under her hip joints, in front of where a waistband lies.
 *
 * WHAT IT IS. A waistband under a belly does not stretch out along it: it is a HOOP of its own size, held up behind by
 * her seat. It lies where it was cut to lie while her belly is no bigger than that; a bigger belly pushes its front
 * down, and all of it swings about the middle of her back -- its HINGE (`LowSpec.hinge`) -- until its front lies in
 * the crease on her thighs and her belly hangs over it. So:
 *
 * - THE HOOP'S SURFACE IS THE LINE'S OWN, IN SPACE: the heights `waistLine` gives round her axis, taken as a surface
 *   about her frame and not as a line on her skin, SWUNG DOWN ABOUT THE HINGE by `swing` (radians). From her side it
 *   is a straight line through the hinge, as his is.
 * - A place of her skin that stands OVER that surface AS SHE IS SHAPED (her shapes and her morphs, before her bones
 *   pose her: `shaped`) is not the garment's, whatever its line says -- her trunk's skin and her leg's alike: his
 *   line crosses her hip's side, whose skin hangs from her thigh bone.
 * - BUT NOTHING UNDER HER CREASE (`LowFrame.crease`, `waistHeld`): swung, the surface dips under the tops of her
 *   thighs, and the garment is on them, up into the crease her belly's underside leaves them at -- and, by her
 *   middle, over her cleft. Her crease is a line on her skin, told where a waistband's line is told (her skin's rest
 *   place with her slip pulled back): told by her rest places themselves it drew torn, in teeth, as a waistband did.
 * - HOW FAR IT HAS SWUNG is told off the middle of her front as she is shaped (`swingOf`): not at all up to the size
 *   she was cut for, where the garment is its line's alone -- not a number of it differs.
 *
 * The answer: how far under the swung surface a place stands (her units; + inside the garment), and the surface's
 * room while it has hardly swung (`roomAt`). `hinge`: `LowSpec.hinge`.
 */
export function stayAt(frame: LowFrame, waist: V4, hinge: readonly [number, number], swing: number, shaped: V3): number {
  // the place, swung back up about the hinge to where the surface was cut (in the plane of her side)
  const X = aheadOf(frame, shaped[1], shaped[2]) - hinge[0], Y = shaped[1] - hinge[1], c = Math.cos(swing), s = Math.sin(swing);
  const a = hinge[0] + X * c - Y * s, y = hinge[1] + X * s + Y * c, out = Math.abs(shaped[0] - frame.mid), radius = Math.max(Math.hypot(out, a), 1e-9);
  return lineInside(waist, 0.5 + (0.5 * a) / radius, out, radius, y, 0) + roomAt(frame, swing);
}
/** How much higher a hoop's surface is told than it is, by how far it has swung (her units): `frame.stay.room` while it has not, none from `frame.stay.ease` radians on. */
export function roomAt(frame: LowFrame, swing: number): number { return frame.stay.room * (1 - smoothstep(0, frame.stay.ease, swing)); }
/**
 * HOW FAR A HOOP HAS SWUNG DOWN (radians; `stayAt`). `middle`: the middle of her front AS SHE IS SHAPED NOW -- xyz a
 * point, her units, `frame.middle`'s vertices in their order (up her rest skin). The cloth's front may stand no
 * further from the hinge than `spec.reach`: the LEAST swing that leaves every part of the middle of her front that
 * stands further than that OVER the hoop's surface -- a place `rho` from the hinge and an angle under the level ahead
 * of it is over a surface swung by more than that angle less the angle whose sine is (the surface's own depth under
 * its hinge) over `rho`; read at her points and where her front crosses the reach between two of them, so that it
 * grows evenly as she does -- and `frame.stay.swing` times that (`LOW_CUT.staySwing`, which says why). None (0) while
 * nothing of her front under the line stands further than the reach -- up to the size she was cut for -- and for a
 * waistband that is no hoop.
 */
export function swingOf(frame: LowFrame, spec: Pick<LowSpec, 'waist' | 'hinge' | 'reach'>, middle: ArrayLike<number>): number {
  const w = spec.waist, h = spec.hinge, reach = spec.reach;
  if (!w || !h || !(reach < LOW_CUT.far)) return 0;
  const deep = h[1] - w[0];
  if (!(deep > 0)) return 0;
  // (a place X ahead of the hinge and Y under it: the swing that brings the surface's front down to it)
  const need = (X: number, Y: number): number => { const rho = Math.hypot(X, Y); return rho > deep ? Math.atan2(Y, X) - Math.asin(deep / rho) : 0; };
  let most = 0, pX = 0, pY = 0, pRho = 0, had = false;
  for (let i = 0; i * 3 + 2 < middle.length; i++) {
    const y = middle[i * 3 + 1], a = aheadOf(frame, y, middle[i * 3 + 2]), X = a - h[0], Y = h[1] - y, rho = Math.hypot(X, Y);
    if (a > 0 && rho > reach) most = Math.max(most, need(X, Y));
    if (had && (pRho - reach) * (rho - reach) < 0) { const t = (reach - pRho) / (rho - pRho), cx = pX + (X - pX) * t; if (cx + h[0] > 0) most = Math.max(most, need(cx, pY + (Y - pY) * t)); }
    pX = X; pY = Y; pRho = rho; had = true;
  }
  return Math.min(most * frame.stay.swing, Math.PI / 2);
}
/** Her crease's height on her rest skin at a place's distance to the side of her middle (`LowFrame.crease`; her units). */
export function creaseAt(frame: LowFrame, x: number): number {
  const C = frame.crease;
  if (!C) return -LOW_CUT.far;
  const t = Math.min(Math.abs(x - frame.mid) / frame.stay.wide, 1) * (CREASE_STEPS - 1), k = Math.min(Math.floor(t), CREASE_STEPS - 2);
  return C[k] + (C[k + 1] - C[k]) * (t - k);
}
/**
 * THE CLOTH'S FRONT BETWEEN HER THIGHS IS ONE STRAIGHT LINE ACROSS HER (her units in front of her axis; `underAt`).
 * Joshua, 2026-11-15, of the room's pictures of the hoop at 150% and 200%: "Under the belly is still not fixed and
 * like has a tongue 👅 look on the big belly… need to keep that line straight and smooth curves."
 *
 * By her middle there is none of her leg's skin for her crease to be told by. Held there at one HEIGHT on her rest
 * skin (over the top of her cleft) it was a tongue: under her belly her skin lies level -- a millimetre of height is
 * a centimetre along it, and by 200% five. MEASURED 2026-11-15 on her skin's points from the room, down her middle: at
 * 200% the cloth ran 6.4 cm in front of her axis, where her creases either side of it stand 2.1 to 3.0. So between
 * her thighs the cloth's front is no height on her skin but A STRAIGHT CUT ACROSS HER AS SHE IS SHAPED: nothing of
 * her TRUNK's skin in front of this line is under her crease (her leg's is, all of it: her thighs' fronts stand
 * further forward than that), and behind it all of her trunk's that lies no higher on her rest skin than her crease
 * stands at her groin's edge (`LowFrame.crease`). The line: `frame.stay.fold` in front of the foremost place her
 * leg's skin meets her trunk's by her middle -- the row of her triangles that joins the two is behind it, so the
 * edge is this cut's and none of it that row's -- and it runs on into her crease either side. `groin`:
 * `frame.groin`'s vertices as she is shaped now, xyz a point.
 */
export function foldOf(frame: LowFrame, groin: ArrayLike<number>): number {
  let most = -Infinity;
  for (let i = 0; i + 2 < groin.length; i += 3) most = Math.max(most, aheadOf(frame, groin[i + 1], groin[i + 2]));
  return most > -Infinity ? most + frame.stay.fold : LOW_CUT.far;
}
/**
 * How far UNDER HER CREASE a place is (her units; + under it, where a hoop bares nothing): `creaseAt` less the height
 * of the place a waistband's line is looked up at (`place`) -- and, of her trunk's skin, no more than the place
 * stands behind the cloth's front between her thighs as she is shaped (`fold`, `foldOf`; `shaped`), the corner
 * between the two rounded. `leg`: her leg's share of the place (`legShareOf`).
 */
export function underAt(frame: LowFrame, place: V3, shaped: V3, leg: number, fold: number): number {
  const behind = fold - aheadOf(frame, shaped[1], shaped[2]);
  return smin(creaseAt(frame, place[0]) - place[1], behind + (LOW_CUT.far - behind) * leg, frame.stay.round);
}
/**
 * NOTHING OF HER TRUNK'S SKIN IN FRONT OF THE CLOTH'S FRONT BETWEEN HER THIGHS IS THE HOOP'S (`foldOf`): a hoop's
 * distance (`held`, `hoopAt`) held to how far behind that cut her trunk's skin stands as she is shaped, the corner
 * rounded; her leg's skin as it was (`leg`, `legShareOf`). Its crease alone was held so (`underAt`), and under the swung
 * surface her belly's underside by her middle stayed the garment's -- MEASURED 2026-11-15, the room's points at 200%:
 * an island of it over the cloth's front, seen from below, and the tab of cloth in the fold under her belly seen from
 * her side (Joshua, of that picture: "Double check under the belly").
 */
export function foldHeld(frame: LowFrame, held: number, shaped: V3, leg: number, fold: number): number {
  const behind = fold - aheadOf(frame, shaped[1], shaped[2]);
  return smin(held, behind + (LOW_CUT.far - behind) * leg, frame.stay.round);
}
/**
 * HIS LINE UNDER HER BELLY ON HER REST SKIN (Joshua, 2026-11-15, drawn on the room's close-ups of her from underneath
 * at 120, 150 and 200%: "Here is where it should sit looking underneath"): its height over her hip joints (metres) at
 * each centimetre out from her middle, 0 to 15 cm. MEASURED the same day: the skin under each pixel of his line (the
 * room's own camera, the point nearest it), read on her rest skin with her slip pulled back -- at the three sizes
 * within 2 to 9 mm of one another at every distance out (here their mean). As she is shaped it is the fold where her
 * belly, coming down, meets the tops of her thighs: 3.1 to 3.3 cm in front of her axis at her middle, 0.5 to 1.6 at
 * 13 to 15 cm out, at all three sizes alike -- a straight line across her seen from underneath. GAME TUNING to his
 * marks, on the base model.
 */
export const FOLD_LINE: readonly number[] = Object.freeze([-0.033, -0.033, -0.032, -0.030, -0.025, -0.020, -0.012, -0.007, -0.001, 0.007, 0.016, 0.027, 0.041, 0.056, 0.067, 0.081]);
/**
 * A SWUNG HOOP'S FRONT RUNS IN THE FOLD UNDER HER BELLY, along his line (`FOLD_LINE`): in front of her, between her
 * hips, her skin is the garment's under the waistband's own line and under his -- both on her rest skin with her slip
 * pulled back (`place`), so it rides her skin as the line does and is as smooth. Until then the swung surface and her
 * crease bared her skin up to 2.6 cm under his line at her sides, and at her middle the cut between her thighs and
 * her crease dipped into her crotch. The answer: how far under his line the place is (her units), his line `lift`
 * higher (`foldLift`: while the hoop has hardly swung it binds nothing).
 */
export function foldAt(frame: LowFrame, place: V3, shaped: V3, leg: number, lift: number, ease = 1): { readonly line: number; readonly deep: number } {
  const U = frame.unitsPerMetre, f = Math.min(Math.abs(place[0] - frame.mid) / (0.01 * U), FOLD_LINE.length - 1), k = Math.min(Math.floor(f), FOLD_LINE.length - 2);
  // (square to his line on her rest skin: where it climbs her hips it climbs up to 1.4 cm a centimetre out -- its slope
  // at each knot, between the two either side, eased from knot to knot: a slope stepped from one centimetre to the next
  // stepped the band's inner edge there, in teeth a centimetre apart -- MEASURED 2026-11-15 in the room)
  const rise = foldRise(k, ease) + (foldRise(k + 1, ease) - foldRise(k, ease)) * (f - k);
  const line = (frame.hipY + (foldKnot(k, ease) + (foldKnot(k + 1, ease) - foldKnot(k, ease)) * (f - k)) * U + lift - place[1]) / Math.sqrt(1 + rise * rise);
  // (her trunk's skin no further forward than the fold: right by her middle her rest skin under her belly is so
  // stretched that a millimetre of it is a centimetre or two as she is shaped, and his line alone laid patches of cloth
  // up her belly's underside -- MEASURED 2026-11-15 in a sketch at 150 and 200%)
  const x = (shaped[0] - frame.mid) / U, deep = (LOW_CUT.foldDepth - LOW_CUT.foldCurve * x * x) * U + lift - aheadOf(frame, shaped[1], shaped[2]);
  // (none of that round her hips, past his line's reach: `foldDeepIn` to `foldOut`)
  const loose = Math.max(leg, smoothstep(LOW_CUT.foldDeepIn * U, LOW_CUT.foldOut * U, Math.abs(shaped[0] - frame.mid)));
  return { line, deep: deep + (LOW_CUT.far - deep) * loose };
}
/**
 * HIS LINE'S BAND IS AS DEEP ON HER AS ANY BAND (`foldStretch`): her skin under his line is drawn out as she is shaped
 * -- at her middle at 150%, a centimetre of her rest skin under it is 2 to 3 cm of her (MEASURED on the room's points:
 * her skin half a centimetre under it stands 1.5 to 2.5 cm in front of her axis, a centimetre under it 0 to 1, the fold
 * itself 3.1 to 3.3), and a band 3 cm deep on her rest skin ran down her pubic mound into her crotch. Her rest skin
 * near his line: how far under it (square to it), out to her units. `near`: her points in front of her between her
 * hips, from 18 cm under her hip joints to 12 over (`foldNear`, once a body).
 */
export function foldNear(frame: LowFrame, rest: ArrayLike<number>): Uint32Array {
  const U = frame.unitsPerMetre, out: number[] = [];
  for (let v = 0; v * 3 < rest.length; v++) {
    const x = rest[v * 3], y = rest[v * 3 + 1], z = rest[v * 3 + 2];
    if (Math.abs(x - frame.mid) > (LOW_CUT.foldOut + 0.01) * U || y < frame.hipY - 0.18 * U || y > frame.hipY + 0.12 * U || aheadOf(frame, y, z) < LOW_CUT.foldFrom * U - 0.02 * U) continue;
    out.push(v);
  }
  return Uint32Array.from(out);
}
/**
 * How many of her units as she is shaped a unit of her rest skin is, down from his line over its band, at each
 * centimetre out from her middle (`FOLD_LINE`'s knots; `foldAt` reads it at a place's own distance out): for each of
 * her points under the cloth's edge in front (`near`, `BandPoint`), how far it stands as she is shaped from the
 * nearest point of that edge (her points within `FOLD_EDGE` of it, in that centimetre and the two either side), over
 * how far under his line it is on her rest skin -- the middle of those that stand within half the band's depth of the
 * band's depth -- a centimetre with none taking its neighbours', each eased with the two either side. Null with no
 * points at the edge.
 */
export function foldStretch(frame: LowFrame, near: ArrayLike<number>, point: BandPoint, swing: number, depth: number): Float32Array | null {
  const U = frame.unitsPerMetre, K = FOLD_LINE.length, lift = foldLift(frame, swing), at = new Float64Array(8);
  const edge: number[][] = Array.from({ length: K }, () => []), under: { b: number; x: number; y: number; z: number; d: number }[] = [];
  for (let i = 0; i < near.length; i++) {
    point(near[i], at);
    const shaped: V3 = [at[0], at[1], at[2]], place: V3 = [at[3], at[4], at[5]];
    const b = Math.round(Math.abs(shaped[0] - frame.mid) / (0.01 * U));
    if (b >= K || foldShares(frame, shaped)[1] < 0.5) continue;
    const f = foldAt(frame, place, shaped, legShareOf(at[6]), lift, foldEase(swing)), cut = Math.min(f.line, f.deep);
    if (cut >= 0 && cut <= FOLD_EDGE * U) edge[b].push(shaped[0], shaped[1], shaped[2]);
    else if (cut > 0 && f.line > FOLD_EDGE * U && f.line < 3 * depth) under.push({ b, x: shaped[0], y: shaped[1], z: shaped[2], d: f.line });
  }
  const ratios: number[][] = Array.from({ length: K }, () => []);
  for (const u of under) {
    let best = Infinity;
    for (let b = Math.max(u.b - 1, 0); b <= Math.min(u.b + 1, K - 1); b++) { const e = edge[b]; for (let k = 0; k < e.length; k += 3) { const dx = u.x - e[k], dy = u.y - e[k + 1], dz = u.z - e[k + 2], d = dx * dx + dy * dy + dz * dz; if (d < best) best = d; } }
    if (!Number.isFinite(best)) continue;
    const D = Math.sqrt(best);
    if (D > depth * 0.5 && D < depth * 1.5) ratios[u.b].push(D / u.d);
  }
  const raw = ratios.map((r) => { if (!r.length) return NaN; r.sort((a, b) => a - b); return r[r.length >> 1]; });
  if (raw.every((r) => !Number.isFinite(r))) return null;
  for (let pass = 0; pass < K; pass++) for (let b = 0; b < K; b++) if (!Number.isFinite(raw[b])) { const l = raw[b - 1], r = raw[b + 1]; raw[b] = Number.isFinite(l) && Number.isFinite(r) ? (l + r) / 2 : Number.isFinite(l) ? l : r; }
  // (held to its bounds, then eased three times over with the two either side: one centimetre's number beside the
  // next's stepped the band's depth -- 1.85 to 0.67 between 5 and 7 cm out at 200%, a lobe in the edging, MEASURED in
  // the room 2026-11-15)
  let now = Float32Array.from(raw, (r) => Math.min(Math.max(r, LOW_CUT.foldStretchMin), LOW_CUT.foldStretchMax));
  for (let pass = 0; pass < 3; pass++) { const next = new Float32Array(K); for (let b = 0; b < K; b++) next[b] = (now[Math.max(b - 1, 0)] + 2 * now[b] + now[Math.min(b + 1, K - 1)]) / 4; now = next; }
  return now;
}
/** Her points this far under the cloth's edge in front stand at it (`foldStretch`; metres). */
const FOLD_EDGE = 0.003;
/** `foldStretch` at a place's distance out from her middle (her rest skin's; 1 with no table). */
export function foldStretchAt(frame: LowFrame, stretch: ArrayLike<number> | null | undefined, place: V3): number {
  if (!stretch) return 1;
  const f = Math.min(Math.abs(place[0] - frame.mid) / (0.01 * frame.unitsPerMetre), stretch.length - 1), k = Math.min(Math.floor(f), stretch.length - 2);
  return stretch[k] + (stretch[k + 1] - stretch[k]) * (f - k);
}
/** His line's climb at its `k`th knot (metres a metre out): between the knots either side, or to the one beside it at an end. */
function foldRise(k: number, ease = 1): number { const a = Math.max(k - 1, 0), b = Math.min(k + 1, FOLD_LINE.length - 1); return (foldKnot(b, ease) - foldKnot(a, ease)) / ((b - a) * 0.01); }
/** His line's `k`th knot with its climb up her hips eased (`foldEase`): past `FOLD_HIP` out, only `ease` of its climb from there. */
function foldKnot(k: number, ease: number): number { return k > FOLD_HIP ? FOLD_LINE[FOLD_HIP] + (FOLD_LINE[k] - FOLD_LINE[FOLD_HIP]) * ease : FOLD_LINE[k]; }
/** The knot his line's climb up her hips is eased from (`foldEase`): 8 cm out from her middle. */
export const FOLD_HIP = 8;
/**
 * HIS LINE MEETS THE HOOP AT HER HIPS (Joshua, 2026-11-15, circling each hip of the 200% pictured from her front, a
 * smooth arc drawn from her hip down to her middle: "needs to have a rounder curve"). His line ends 15 cm out at her
 * side's own height, 8.1 cm over her hip joints on her rest skin; the hoop's edge 16 cm out, as it swings, is at 7.3 cm
 * at 120%, 5.5 at 150% and 2.9 at 200% (MEASURED on the room's points: swings of 10.8, 17.4 and 23.1 degrees), and an
 * edge eased from one to the other across that gap waved. So his line's climb past `FOLD_HIP` is held to the share
 * that ends it where the hoop's edge is: 1 - `LOW_CUT.foldEase` x swing^2 (radians) -- 0.86, 0.64 and 0.37 at those
 * three, the hoop's own 0.90, 0.68 and 0.37 -- never under `LOW_CUT.foldEaseLeast`. GAME TUNING.
 */
export function foldEase(swing: number): number { return Math.max(LOW_CUT.foldEaseLeast, 1 - LOW_CUT.foldEase * swing * swing); }
/** How much higher his line is told as the hoop swings (her units; `foldAt`): `LOW_CUT.foldReach` unswung, none from `foldSwing` radians on. */
export function foldLift(frame: LowFrame, swing: number): number { return LOW_CUT.foldReach * frame.unitsPerMetre * (1 - smoothstep(0, LOW_CUT.foldSwing, swing)); }
/** How much of a place his line is laid on (0 to 1; `foldAt`): between her hips (`shaped`, as she is shaped), in front of her. */
export function foldShare(frame: LowFrame, shaped: V3): number { const [o, a] = foldShares(frame, shaped); return o * a; }
/** `foldShare`'s two parts: how far out from her middle (all of it to `foldIn`), and how far ahead (all of it from `foldTo`). */
export function foldShares(frame: LowFrame, shaped: V3): readonly [number, number] {
  const U = frame.unitsPerMetre, out = Math.abs(shaped[0] - frame.mid), ahead = aheadOf(frame, shaped[1], shaped[2]);
  return [1 - smoothstep(LOW_CUT.foldIn * U, LOW_CUT.foldOut * U, out), smoothstep(LOW_CUT.foldFrom * U, LOW_CUT.foldTo * U, ahead)];
}
/**
 * How far inside a hoop a place is (her units): the further inside of how far under the swung surface it stands
 * (`stay`, `stayAt`) and how far under her crease (`under`, `underAt`), the corner between the two rounded (`round`:
 * `frame.stay.round`).
 */
export function hoopAt(stay: number, under: number, round: number): number { return -smin(-stay, -under, round); }
/**
 * A waistband's distance inside its line with its hoop laid on it (her units): the nearer of the line's (`inside`,
 * `waistAt`) and the hoop's (`held`, `hoopAt`), the corner between the two rounded.
 */
export function waistHeld(inside: number, held: number, round: number): number { return smin(inside, held, round); }

/**
 * THE STATIONS A HOOP'S BAND IS TOLD AT: `count` cuts of her REST skin, each by an upright half-plane through a line
 * down her middle (`lean`: the line's depth at a height is `lean[0] + lean[1] * height`, no further forward than
 * `lean[2]`; `LOW_CUT.band…` says where it stands and why it leans), at even turns from the middle of her front (the
 * first half a step off it) round to the middle of her back, on the side of x over her middle -- her other side is its
 * mirror. A cut is the points where the half-plane crosses the edges of her triangles, in order from its top down:
 * for each, the two vertices of the edge (`a`, `b`) and how far from the first to the second (`t`). They are places
 * ON HER SKIN, so where a cut stands as she is shaped, and what a bottom's cut says along it, are read off her
 * vertices (`bandInner`).
 */
export interface BandStations {
  readonly count: number;
  readonly mid: number; readonly facing: number; readonly lean: readonly [number, number, number];
  readonly a: readonly Uint32Array[]; readonly b: readonly Uint32Array[]; readonly t: readonly Float32Array[];
}
/** The line a band's stations turn about: its depth (z) at a height. */
export function bandDepth(line: Pick<BandStations, 'lean' | 'facing'>, y: number): number {
  const d = line.lean[0] + line.lean[1] * y;
  return line.facing > 0 ? Math.min(d, line.lean[2]) : Math.max(d, line.lean[2]);
}
/** Where a place stands round the stations' line (radians: 0 the middle of her front, pi the middle of her back; her two sides alike). */
export function bandTurn(line: Pick<BandStations, 'mid' | 'lean' | 'facing'>, x: number, y: number, z: number): number {
  return Math.atan2(Math.abs(x - line.mid), (z - bandDepth(line, y)) * line.facing);
}
/**
 * Her stations for a hoop's band (`BandStations`), off her rest skin: her trunk's and her legs' triangles from
 * `LOW_CUT.bandUnder` under her hip joints to `bandOver` over them (her arms', which hang beside her hips, left out).
 * A half-plane cuts her skin in more pieces than one (a breast that hangs into the heights, the inside of her other
 * thigh): a station's cut is the piece that spans the most height -- her trunk's, on down her leg. Her points that are
 * one place (the copies along her texture's seams) are taken as one, so a cut runs on across a seam.
 */
export function bandStations(frame: LowFrame, skin: { readonly rest: ArrayLike<number>; readonly limb: ArrayLike<number>; readonly index: ArrayLike<number> }, count: number = BAND_STEPS): BandStations {
  const { rest, limb, index } = skin, U = frame.unitsPerMetre, mid = frame.mid, facing = frame.facing, n = limb.length;
  const hipZ = (frame.legs[0].hip[2] + frame.legs[1].hip[2]) / 2, slope = ((LOW_CUT.bandHigh - LOW_CUT.bandLow) * facing) / (LOW_CUT.bandHighAt - LOW_CUT.bandLowAt);
  const lean: [number, number, number] = [hipZ + LOW_CUT.bandLow * U * facing - slope * (frame.hipY + LOW_CUT.bandLowAt * U), slope, hipZ + LOW_CUT.bandMost * U * facing];
  const line = { lean, facing }, y0 = frame.hipY - LOW_CUT.bandUnder * U, y1 = frame.hipY + LOW_CUT.bandOver * U, step = Math.PI / count;
  // where each of her points stands round the line (+ on the side of x over her middle), told once a point
  const turns = new Float32Array(n).fill(NaN);
  const turnOf = (v: number): number => { let a = turns[v]; if (a !== a) { a = Math.atan2(rest[v * 3] - mid, (rest[v * 3 + 2] - bandDepth(line, rest[v * 3 + 1])) * facing); turns[v] = a; } return a; };
  // each station's triangles: those whose corners stand either side of its turn
  const crossed: number[][] = Array.from({ length: count }, () => []);
  for (let k = 0; k + 2 < index.length; k += 3) {
    const p = index[k], q = index[k + 1], r = index[k + 2];
    if (limb[p] > 0.5 || limb[q] > 0.5 || limb[r] > 0.5) continue;
    const yp = rest[p * 3 + 1], yq = rest[q * 3 + 1], yr = rest[r * 3 + 1];
    if (Math.max(yp, yq, yr) < y0 || Math.min(yp, yq, yr) > y1) continue;
    let ap = turnOf(p), aq = turnOf(q), ar = turnOf(r);
    // (a triangle across the middle of her back: its corners' turns are told on from pi)
    if (Math.max(ap, aq, ar) - Math.min(ap, aq, ar) > Math.PI) { if (ap < 0) ap += 2 * Math.PI; if (aq < 0) aq += 2 * Math.PI; if (ar < 0) ar += 2 * Math.PI; }
    const lo = Math.min(ap, aq, ar), hi = Math.max(ap, aq, ar);
    if (!(hi > 0)) continue;
    for (let s = Math.max(0, Math.ceil(lo / step - 0.5)); s < count && (s + 0.5) * step <= hi; s++) crossed[s].push(p, q, r);
  }
  // her points that are one place, as one
  const welded = new Int32Array(n).fill(-1), places = new Map<string, number>();
  const weld = (v: number): number => { let w = welded[v]; if (w < 0) { const key = `${rest[v * 3]},${rest[v * 3 + 1]},${rest[v * 3 + 2]}`, seen = places.get(key); if (seen === undefined) { places.set(key, v); w = v; } else w = seen; welded[v] = w; } return w; };
  const A: Uint32Array[] = [], B: Uint32Array[] = [], T: Float32Array[] = [];
  for (let s = 0; s < count; s++) {
    const turn = (s + 0.5) * step, sn = Math.sin(turn), cs = Math.cos(turn), tris = crossed[s];
    // (which side of the half-plane's plane a point is on, and how far out along the half-plane a place of an edge is)
    const side = (v: number): number => { const d = (rest[v * 3] - mid) * cs - (rest[v * 3 + 2] - bandDepth(line, rest[v * 3 + 1])) * facing * sn; return d === 0 ? 1e-12 : d; };
    const nodes = new Map<number, { a: number; b: number; t: number; y: number; next: number[] }>();
    const node = (p: number, q: number): number | null => {
      const a = Math.min(p, q), b = Math.max(p, q), key = a * n + b;
      if (!nodes.has(key)) {
        const sa = side(a), sb = side(b), t = sa / (sa - sb);
        const x = rest[a * 3] + (rest[b * 3] - rest[a * 3]) * t, y = rest[a * 3 + 1] + (rest[b * 3 + 1] - rest[a * 3 + 1]) * t, z = rest[a * 3 + 2] + (rest[b * 3 + 2] - rest[a * 3 + 2]) * t;
        if (y < y0 || y > y1 || !((x - mid) * sn + (z - bandDepth(line, y)) * facing * cs > 0)) return null;
        nodes.set(key, { a, b, t, y, next: [] });
      }
      return key;
    };
    for (let k = 0; k < tris.length; k += 3) {
      const v = [weld(tris[k]), weld(tris[k + 1]), weld(tris[k + 2])], sd = [side(v[0]), side(v[1]), side(v[2])];
      let first = -1, second = -1;
      for (let e = 0; e < 3; e++) if ((sd[e] > 0) !== (sd[(e + 1) % 3] > 0)) { const key = node(v[e], v[(e + 1) % 3]); if (key !== null) { if (first < 0) first = key; else second = key; } }
      if (second >= 0 && first !== second) { nodes.get(first)!.next.push(second); nodes.get(second)!.next.push(first); }
    }
    // its pieces, each walked from an end: the one that spans the most height
    let best: number[] = [], span = -1;
    const done = new Set<number>();
    for (const [key, nd] of nodes) {
      if (done.has(key) || nd.next.length !== 1) continue;
      const piece = [key];
      done.add(key);
      for (let prev = -1, cur = key; ;) { const from = prev, nx = nodes.get(cur)!.next.find((x) => x !== from && !done.has(x)); if (nx === undefined) break; piece.push(nx); done.add(nx); prev = cur; cur = nx; }
      let lo = Infinity, hi = -Infinity;
      for (const c of piece) { const y = nodes.get(c)!.y; lo = Math.min(lo, y); hi = Math.max(hi, y); }
      if (hi - lo > span) { span = hi - lo; best = piece; }
    }
    if (best.length && nodes.get(best[0])!.y < nodes.get(best[best.length - 1])!.y) best.reverse();
    A.push(Uint32Array.from(best, (c) => nodes.get(c)!.a)); B.push(Uint32Array.from(best, (c) => nodes.get(c)!.b)); T.push(Float32Array.from(best, (c) => nodes.get(c)!.t));
  }
  return { count, mid, facing, lean, a: A, b: B, t: T };
}

/**
 * What a vertex of hers is told by for a band's stations, eight numbers into `out`: where it stands AS SHE IS SHAPED
 * (xyz: `stayAt`'s `shaped`), the place a waistband's line is looked up at (xyz: its rest place and her skin's slip
 * there), which of her skin it is (`limbSkin`) and how much longer her skin is across her there (`waistAt`'s `across`).
 */
export type BandPoint = (vertex: number, out: Float64Array) => void;
/** A hoop's band's inner edge as it is laid: the line its stations turn about, and its height on her rest skin at each station's turn (`bandInner`). */
export interface BandInner { readonly line: Pick<BandStations, 'count' | 'mid' | 'facing' | 'lean'>; readonly table: ArrayLike<number>; readonly front?: FrontMoon | null; readonly stretch?: ArrayLike<number> | null }

/**
 * A HOOP'S BAND IS AS WIDE AS IT LIES ON HER, AT EVERY SIZE OF BELLY: its inner edge, as heights on her rest skin at
 * the stations' turns (`stations.count` of them; null with no waistband, no band, or no station that finds its edge).
 *
 * Joshua, 2026-11-15, of the under-belly leggings pictured from 0% to 200%: "I am noticing the edging at 0% starts
 * fading as the belly gets bigger, needs to stay consistent no matter the belly%."
 *
 * WHAT WAS WRONG. A band was where a distance the CUT tells is under the band's depth: how far inside the line
 * (`waistAt`: a height on her rest skin, measured square to the line), and -- once the hoop had swung -- how far under
 * the swung surface or under her crease (`stayAt`, `underAt`: a height in the room, a height on her rest skin, a
 * depth behind the cloth's front). None of them is a length ALONG HER SKIN AS SHE IS SHAPED. Under her belly her skin
 * lies nearly level on her body file, so 3 cm of height is all of it; between her thighs it runs back level under
 * the swung surface, so 3 cm under that surface is all of it too; on the top of her thigh the two disagree. MEASURED
 * 2026-11-15 on her skin's points read out of the room (from each piece of the band's inner edge straight to the
 * nearest piece of the cloth's edge; the band 3 cm deep): 1.9 to 4.1 cm at 0%, 2.9 to 6.6 at 100%, 3.0 to 6.3 at
 * 120% -- with no inner edge at all across her front, the band running on to her crotch -- 2.4 to 3.5 at 150% and
 * 1.7 to 4.4 at 200%, its inner edge gone between her thighs. In the room, in a black edging: a notch under the point
 * of its front at 0%; a scalloped lower edge at 100% (the band's floor between two arcs of its depth); at 110% a
 * black triangle down to her crotch; from 120% a band thinning to a sliver along her crease, with tabs by her middle.
 *
 * WHAT IT IS NOW. The band's inner edge is FOUND ON HER SKIN AS SHE IS SHAPED, and told to the shader as a line on her
 * rest skin -- where a waistband's own line is told, so it rides her skin as that does, through any pose. Down each
 * station's cut (`BandStations`) from its top: THE CLOTH'S OWN EDGE, where the waistband's cover begins (`lowAt`'s
 * `waist`: its line, and its hoop as it has swung). Those, of every station and of their mirrors on her other side,
 * joined round her, are the edge. Then on down the cut to the first place from which that edge is the band's depth
 * away, straight, as she is shaped: its height where a waistband's line is looked up (and its turn there, a little
 * off the station's own by her slip: the heights are read across to the stations' own turns). `innerAt` is the curve
 * through them; the band is the cloth above it.
 *
 * BETWEEN HER THIGHS IT NEVER STANDS HIGHER THAN NEARER HER MIDDLE. Once a hoop lies in her crease the lowest of the
 * band's inner edge in front is on her thighs, and between them it crosses the folds beside her opening, where 3 cm
 * as she is shaped is a different height on her rest skin from one cut to the next (at 200%: 4.5 cm under her hip
 * joints at her middle, 3.6 two stations out, 5.6 on her thigh). Held to no rise from her middle out to its lowest
 * (among the first `LOW_CUT.bandBridge` of the stations), it bridges her thighs in one line -- wider there than its
 * depth by up to 1.8 cm, and no narrower anywhere.
 *
 * MEASURED the same way with it, 32 stations: 2.6 to 3.0 cm at 0%, 2.6 to 3.2 at 50% and at 73%, 2.7 to 3.2 at 100%,
 * 2.3 to 3.2 at 120%, 2.7 to 3.9 at 130%, 2.8 to 4.2 at 150%, 2.8 to 4.8 at 200% (the most of the last three between
 * her thighs, by the bridge; the median 3.0 at every size). With 24 stations and with 48: the same to a millimetre
 * or two.
 *
 * `point`: her vertices as she is now (`BandPoint`). `swing`, `fold`: the hoop's (`swingOf`, `foldOf`). `kept`: where
 * each station's edge was found the last time (its place down the cut; -1 none), read to begin the search there and
 * written -- a slider dragged moves the edge a little a frame.
 */
export function bandInner(frame: LowFrame, spec: LowSpec, stations: BandStations, point: BandPoint, swing: number, fold: number, kept: Int32Array | null = null, moon: FrontMoon | null = null, front: number[] | null = null): Float32Array | null {
  const K = stations.count, depth = spec.bands.waist;
  if (!spec.waist || !(depth > 0)) return null;
  const lower = new Float64Array(8), upper = new Float64Array(8), walk = stationWalk(stations, point);
  const { E, edgeAt, edgeU } = stationEdges(frame, spec, stations, point, swing, fold, kept, moon), at = walk.at;
  const segs: number[] = [];
  { let last = -1, first = -1; for (let i = 0; i < 2 * K; i++) { if (E[i * 3] !== E[i * 3]) continue; if (last >= 0) segs.push(last * 3, i * 3); else first = i; last = i; } if (first >= 0 && last > first) segs.push(last * 3, first * 3); }
  if (!segs.length) return null;
  const away = (p: Float64Array): number => {
    let least = Infinity;
    for (let i = 0; i < segs.length; i += 2) {
      const o = segs[i], e = segs[i + 1], ax = E[o], ay = E[o + 1], az = E[o + 2], bx = E[e] - ax, by = E[e + 1] - ay, bz = E[e + 2] - az;
      const u = Math.max(0, Math.min(1, ((p[0] - ax) * bx + (p[1] - ay) * by + (p[2] - az) * bz) / (bx * bx + by * by + bz * bz || 1e-18)));
      least = Math.min(least, Math.hypot(p[0] - ax - bx * u, p[1] - ay - by * u, p[2] - az - bz * u));
    }
    return least;
  };
  // each station's inner edge: on down its cut from its edge, to where the edge is the band's depth away
  const found: [number, number][] = [];
  for (let s = 0; s < K; s++) {
    if (edgeAt[s] < 0) continue;
    const n = stations.a[s].length, j0 = edgeAt[s];
    at(s, j0 - 1, lower); at(s, j0, upper);
    for (let k = 0; k < 8; k++) lower[k] += (upper[k] - lower[k]) * edgeU[s];
    let was = 0;
    for (let j = j0; j < n; j++) {
      at(s, j, upper);
      const d = away(upper);
      if (d >= depth) { const w = (depth - was) / Math.max(1e-12, d - was); for (let k = 0; k < 8; k++) lower[k] += (upper[k] - lower[k]) * w; break; }
      lower.set(upper); was = d;
    }
    found.push([bandTurn(stations, lower[3], lower[4], lower[5]), lower[4]]);
    if (front) front.push(lower[0], lower[1], lower[2]);
  }
  if (!found.length) return null;
  found.sort((x, y) => x[0] - y[0]);
  const table = new Float32Array(K);
  for (let s = 0, i = 0; s < K; s++) {
    const want = ((s + 0.5) * Math.PI) / K;
    while (i < found.length - 2 && found[i + 1][0] < want) i++;
    const f0 = found[i], f1 = found[Math.min(found.length - 1, i + 1)];
    table[s] = want <= f0[0] || f1 === f0 ? f0[1] : want >= f1[0] ? f1[1] : f0[1] + ((f1[1] - f0[1]) * (want - f0[0])) / Math.max(1e-9, f1[0] - f0[0]);
  }
  // (between her thighs: no rise from her middle out to its lowest in front)
  { const front = Math.max(1, Math.round(K * LOW_CUT.bandBridge)); let low = 0; for (let s = 1; s < front; s++) if (table[s] < table[low]) low = s; for (let s = 1; s < low; s++) table[s] = Math.min(table[s], table[s - 1]); }
  return table;
}
/** A station's places as a bottom's cut reads them (`BandPoint`'s eight numbers), `j` down its cut. */
function stationWalk(stations: BandStations, point: BandPoint) {
  const a8 = new Float64Array(8), b8 = new Float64Array(8);
  return { at: (s: number, j: number, out: Float64Array): Float64Array => { point(stations.a[s][j], a8); point(stations.b[s][j], b8); const t = stations.t[s][j]; for (let k = 0; k < 8; k++) out[k] = a8[k] + (b8[k] - a8[k]) * t; return out; } };
}
/**
 * WHERE THE CLOTH'S OWN EDGE CROSSES EACH OF HER STATIONS' CUTS, as she is shaped (`lowAt`'s `waist`: its line, its
 * hoop as it has swung, and its front moon when one is given): `E`, 2 x `stations.count` places round her (xyz each,
 * NaN where a station finds none) -- the stations' mirrors on her other side first, from the middle of her back
 * forward, then the stations themselves from the middle of her front back; and for each station the point of its cut
 * just under the edge (`edgeAt`, -1 none) and how far toward it from the one before the edge lies (`edgeU`).
 * `kept`: where each was found the last time, read to begin the search there and written.
 */
export function stationEdges(frame: LowFrame, spec: LowSpec, stations: BandStations, point: BandPoint, swing: number, fold: number, kept: Int32Array | null = null, moon: FrontMoon | null = null): { readonly E: Float64Array; readonly edgeAt: Int32Array; readonly edgeU: Float64Array } {
  const K = stations.count, mid = stations.mid, stride = LOW_CUT.bandStride, q = new Float64Array(8), lower = new Float64Array(8), upper = new Float64Array(8), at = stationWalk(stations, point).at;
  const cover = (p: Float64Array): number => lowAt(spec, frame, [p[3], p[4], p[5]], 0, Math.min(p[6], 0), p[7], [p[0], p[1], p[2]], swing, fold, null, moon).waist;
  const edgeAt = new Int32Array(K).fill(-1), edgeU = new Float64Array(K), E = new Float64Array(K * 2 * 3).fill(NaN);
  if (!spec.waist) return { E, edgeAt, edgeU };
  for (let s = 0; s < K; s++) {
    const n = stations.a[s].length;
    if (n < 2) continue;
    let lo = Math.max(0, Math.min(n - 1, (kept && kept[s] > 0 ? kept[s] : 0) - 1)), cLo = cover(at(s, lo, q));
    // (begun under the edge: back up the cut to bare skin)
    while (cLo > 0 && lo > 0) { lo = Math.max(0, lo - 2 * stride); cLo = cover(at(s, lo, q)); }
    if (cLo > 0) continue;
    let hi = lo, cHi = cLo;
    while (!(cHi > 0) && hi < n - 1) { lo = hi; cLo = cHi; hi = Math.min(n - 1, hi + stride); cHi = cover(at(s, hi, q)); }
    if (!(cHi > 0)) continue;
    while (hi - lo > 1) { const m = (lo + hi) >> 1, c = cover(at(s, m, q)); if (c > 0) { hi = m; cHi = c; } else { lo = m; cLo = c; } }
    edgeAt[s] = hi; edgeU[s] = cLo / (cLo - cHi);
    at(s, lo, lower); at(s, hi, upper);
    for (let k = 0; k < 3; k++) { const v = lower[k] + (upper[k] - lower[k]) * edgeU[s]; E[(K + s) * 3 + k] = v; E[(K - 1 - s) * 3 + k] = k === 0 ? 2 * mid - v : v; }
  }
  if (kept) kept.set(edgeAt);
  return { E, edgeAt, edgeU };
}

/**
 * A HOOP'S FRONT MOON (`frontMoon`): how far out from her middle its tips are (`width`, her units), its heights as she
 * is shaped at `MOON_STEPS` even steps from her middle out to them (`table`), and how far over the cut's own edge it
 * may lay cloth (`fill`, her units).
 */
export interface FrontMoon { readonly width: number; readonly table: Float32Array; readonly fill: number }
/**
 * A HOOP'S FRONT IS A HALF-MOON SEEN FROM HER FRONT (Joshua, 2026-11-15, of the under-belly leggings pictured from 0%
 * to 200%: "Double check under the belly… also, the jagged edges. Needs to have a smooth and gentle curve, looks like
 * it's not like a smooth half moon 🌙 shape…"; asked whether the smaller sizes are meant too: "Fix them too").
 *
 * WHAT WAS WRONG. Seen from her front, the cloth's top edge between her hips is where the cut puts it, and the cut is
 * told round her axis and on her skin: MEASURED 2026-11-15 on her skin's points from the room (the edge's height over
 * her hip joints by how far out from her middle), at 0% a V -- -1.1 cm at her middle, rising 0.65 cm for each cm out,
 * straight to her hips, because where it crosses her front her skin is only a centimetre or two in front of her axis;
 * at 150% and 200% a flat bottom whose sides step up and down by half a centimetre from one of her triangles to the
 * next (her crease, and the cut between her thighs).
 *
 * WHAT IT IS. Off where the cut's own edge crosses her stations (`stationEdges`, as she is shaped): the places in
 * front of her, by how far out from her middle each is and how high (as seen from her front; her two sides alike, so
 * mirrored); the lowest convex line under them all (no tooth of the cut's survives it); and that line smoothed by a
 * bell `LOW_CUT.moonSoft` wide (a convex line smoothed stays convex: a V's point is rounded into a U, a flat bottom's
 * steps go). `moonHeld` lays it on her: in front of her, between her hips, the cloth's top edge is this curve.
 */
export function frontMoon(frame: LowFrame, E: ArrayLike<number>, swing: number): FrontMoon | null {
  const U = frame.unitsPerMetre, pts: [number, number][] = [];
  for (let i = 0; i + 2 < E.length; i += 3) {
    if (E[i] !== E[i]) continue;
    if (aheadOf(frame, E[i + 1], E[i + 2]) < -LOW_CUT.moonOn * U) continue;
    const x = Math.abs(E[i] - frame.mid);
    pts.push([x, E[i + 1]], [-x, E[i + 1]]);
  }
  if (pts.length < 6) return null;
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  // the lowest convex line under them (Andrew's lower hull)
  const hull: [number, number][] = [];
  for (const p of pts) {
    while (hull.length >= 2) { const a = hull[hull.length - 2], b = hull[hull.length - 1]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0) hull.pop(); else break; }
    hull.push(p);
  }
  const width = hull[hull.length - 1][0];
  if (!(width > 0.02 * U)) return null;
  const hullAt = (x: number): number => {
    // (beyond its ends, on along its end's slope)
    let i = 0;
    while (i < hull.length - 2 && hull[i + 1][0] < x) i++;
    const a = hull[i], b = hull[i + 1];
    return a[1] + ((b[1] - a[1]) * (x - a[0])) / Math.max(1e-12, b[0] - a[0]);
  };
  // smoothed by a bell, as the mean of the line under it (Simpson's rule over three widths each side)
  const sigma = LOW_CUT.moonSoft * U, n = 24, table = new Float32Array(MOON_STEPS);
  for (let k = 0; k < MOON_STEPS; k++) {
    const x = (k / (MOON_STEPS - 1)) * width;
    let sum = 0, weight = 0;
    for (let j = -n; j <= n; j++) { const t = (3 * j) / n, w = Math.exp(-0.5 * t * t) * (j === -n || j === n ? 1 : j % 2 ? 4 : 2); sum += w * hullAt(x + t * sigma); weight += w; }
    table[k] = sum / weight;
  }
  // (a convex line smoothed lies over it -- by most at a corner. Lowered to lie on it or under it, but for what it may
  // fill: so wherever it is laid the cloth's edge is the moon's, and none of the cut's own steps shows under it. Not
  // between her thighs: there a swung hoop's front is already one straight cut across her (`foldOf`), and a moon under
  // it bares her where her skin turns under her -- MEASURED 2026-11-15 at 200%, lowered all across: the cloth's front
  // between her thighs in rags. It is lowered from `LOW_CUT.moonMiddle` out from her middle on, eased in over as much
  // again)
  const fill = LOW_CUT.moonFill * U * (1 - smoothstep(0, frame.stay.ease, swing)), m0 = LOW_CUT.moonMiddle * U;
  let over = 0;
  for (let k = 0; k <= 4 * (MOON_STEPS - 1); k++) { const x = (k / (4 * (MOON_STEPS - 1))) * width; if (x >= 2 * m0) over = Math.max(over, moonAt({ width, table, fill }, x) - hullAt(x)); }
  if (over > fill) for (let k = 0; k < MOON_STEPS; k++) table[k] -= (over - fill) * smoothstep(m0, 2 * m0, (k / (MOON_STEPS - 1)) * width);
  return { width, table, fill };
}
/** A front moon's height (her units, as she is shaped) at a distance out from her middle: the smooth curve through its table (Catmull and Rom's), level at her middle. */
export function moonAt(moon: FrontMoon, out: number): number {
  const N = MOON_STEPS, T = moon.table, f = Math.min(Math.abs(out) / moon.width, 1) * (N - 1), i = Math.min(Math.floor(f), N - 2), t = f - i;
  const knot = (k: number): number => T[k < 0 ? -k : k >= N ? 2 * (N - 1) - k : k];
  const p0 = knot(i - 1), p1 = knot(i), p2 = knot(i + 1), p3 = knot(i + 2);
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}
/** How much of a place a front moon is laid on (0 to 1): between its tips, eased out over `LOW_CUT.moonBlend` inside them, and in front of her (`moonOn`, `moonBack`). `shaped`: where the place stands as she is shaped. */
export function moonShare(frame: LowFrame, moon: FrontMoon, shaped: V3): number {
  const U = frame.unitsPerMetre, out = Math.abs(shaped[0] - frame.mid), ahead = aheadOf(frame, shaped[1], shaped[2]);
  return (1 - smoothstep(moon.width - LOW_CUT.moonBlend * U, moon.width, out)) * smoothstep(-LOW_CUT.moonBack * U, -LOW_CUT.moonOn * U, ahead);
}
/**
 * A waistband's distance inside it with its front moon laid on (her units): where the moon is laid (`moonShare`), how
 * far under the moon the place stands as she is shaped -- never more than `fill` further inside than the cut says, so
 * a moon laid over a V's point fills it while the hoop has not swung and only ever bares once it has (its rounded
 * bottom over the swung cut would lay cloth back on her belly's underside).
 */
export function moonHeld(frame: LowFrame, moon: FrontMoon, inside: number, shaped: V3): number {
  const w = moonShare(frame, moon, shaped);
  if (!(w > 0)) return inside;
  return inside + (Math.min(inside + moon.fill, moonAt(moon, shaped[0] - frame.mid) - shaped[1]) - inside) * w;
}
/**
 * A HOOP'S BAND'S INNER EDGE IN FRONT, SMOOTH AS SEEN FROM HER FRONT (`frontMoon`'s twin; Joshua, 2026-11-15, of the
 * band pictured from below at every size: "it wasn't the shape that was bad, but the wavy edging"). Off where each
 * station finds the band's inner edge as she is shaped (`bandInner`'s `front`, xyz a place: the band's depth from the
 * cloth's edge, straight, along her skin), seen from her front -- how far out from her middle, how high -- and
 * smoothed by a bell `LOW_CUT.moonSoft` wide, a station that stands more than `LOW_CUT.moonStray` off its
 * neighbours' smooth line left out (between her thighs a station's cut can run down into a fold the next one does
 * not). Laid on her where the front moon is (`lowAt`): there the band is the cloth over this curve.
 */
export function innerMoon(frame: LowFrame, front: ArrayLike<number>, width: number): FrontMoon | null {
  const U = frame.unitsPerMetre, pts: [number, number][] = [];
  for (let i = 0; i + 2 < front.length; i += 3) {
    if (aheadOf(frame, front[i + 1], front[i + 2]) < -LOW_CUT.moonOn * U) continue;
    const x = Math.abs(front[i] - frame.mid);
    pts.push([x, front[i + 1]], [-x, front[i + 1]]);
  }
  if (pts.length < 6 || !(width > 0)) return null;
  const sigma = LOW_CUT.moonSoft * U;
  const mean = (x: number, keep: (p: [number, number]) => boolean, skip?: [number, number]): number => {
    let sum = 0, weight = 0;
    for (const p of pts) { if (p === skip || !keep(p)) continue; const t = (p[0] - x) / sigma, w = Math.exp(-0.5 * t * t); sum += w * p[1]; weight += w; }
    return weight > 1e-6 ? sum / weight : NaN;
  };
  // (a stray station left out: its height against its neighbours' bell, without it)
  const stray = new Set<[number, number]>();
  for (const p of pts) { const m = mean(p[0], () => true, p); if (m === m && Math.abs(p[1] - m) > LOW_CUT.moonStray * U) stray.add(p); }
  const table = new Float32Array(MOON_STEPS);
  for (let k = 0; k < MOON_STEPS; k++) { const v = mean((k / (MOON_STEPS - 1)) * width, (p) => !stray.has(p)); table[k] = v === v ? v : k ? table[k - 1] : mean(0, () => true); }
  return { width, table, fill: 0 };
}
/**
 * A hoop's band's inner edge at a place: its height on her rest skin there (her units; the band is the cloth above
 * it), by the table of the stations' (`bandInner`) -- the smooth curve through them by where the place stands round
 * the stations' line (Catmull and Rom's, which passes through each and turns no corner at one), her two sides alike:
 * it is level where it crosses the middle of her front and of her back.
 */
export function innerAt(inner: BandInner, x: number, y: number, z: number): number {
  const K = inner.line.count, T = inner.table, f = (bandTurn(inner.line, x, y, z) / Math.PI) * K - 0.5, i = Math.floor(f), t = f - i;
  const knot = (k: number): number => T[k < 0 ? -k - 1 : k >= K ? 2 * K - 1 - k : k];
  const p0 = knot(i - 1), p1 = knot(i), p2 = knot(i + 1), p3 = knot(i + 2);
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

/**
 * HER LEG'S MEASURE AS TWO FLAT CUTS, one square to her thigh's bone and one to her shin's: how far along her leg a
 * place p is (her units at rest, from her hip joint) is `p . (the first three) + the fourth` -- by her thigh's bone 0
 * at her hip joint and `leg.thigh` at her knee, by her shin's `leg.thigh` at her knee and `leg.thigh + leg.shin` at
 * her ankle. `posed`: where her three joints are now (her mesh's own space); none, at rest. A bone her build has made
 * longer still counts its rest length from end to end.
 */
export function legPlanes(leg: LowLeg, posed: { readonly hip: V3; readonly knee: V3; readonly ankle: V3 } = leg): { readonly thigh: V4; readonly shin: V4 } {
  const t = sub(posed.knee, posed.hip), s = sub(posed.ankle, posed.knee), kt = leg.thigh / (dot(t, t) || 1e-12), ks = leg.shin / (dot(s, s) || 1e-12);
  const nt: V3 = [t[0] * kt, t[1] * kt, t[2] * kt], ns: V3 = [s[0] * ks, s[1] * ks, s[2] * ks];
  return { thigh: [nt[0], nt[1], nt[2], -dot(posed.hip, nt)], shin: [ns[0], ns[1], ns[2], leg.thigh - dot(posed.knee, ns)] };
}
/**
 * Which bone's measure her leg's skin takes, by where it lies at REST: four numbers, `r . (the first three) + the
 * fourth` under -1 her thigh's, over 1 her shin's, eased between (`LOW_CUT.kneeBlend` either side of her knee joint,
 * along the mean of her two bones' directions).
 */
export function legBlend(leg: LowLeg, unitsPerMetre: number): V4 {
  const t = sub(leg.knee, leg.hip), s = sub(leg.ankle, leg.knee), d: V3 = [t[0] / leg.thigh + s[0] / leg.shin, t[1] / leg.thigh + s[1] / leg.shin, t[2] / leg.thigh + s[2] / leg.shin];
  const l = (Math.hypot(...d) || 1) * LOW_CUT.kneeBlend * unitsPerMetre, n: V3 = [d[0] / l, d[1] / l, d[2] / l];
  return [n[0], n[1], n[2], -dot(leg.knee, n)];
}
const plane = (p: V4, x: number, y: number, z: number) => p[0] * x + p[1] * y + p[2] * z + p[3];
/** How far along her leg a place is (her units at rest): `rest` where it lies at rest, `posed` where it is now; `planes` her leg's cuts now (`legPlanes`). */
export function legMeasure(planes: { readonly thigh: V4; readonly shin: V4 }, blend: V4, rest: V3, posed: V3 = rest): number {
  const w = smoothstep(-1, 1, plane(blend, rest[0], rest[1], rest[2]));
  const a = plane(planes.thigh, posed[0], posed[1], posed[2]), b = plane(planes.shin, posed[0], posed[1], posed[2]);
  return a + (b - a) * w;
}
/** Her leg on the side of a place at rest: the first of `frame.legs` for x at or over her middle. */
export const legOf = (frame: LowFrame, x: number): LowLeg => (x >= frame.mid ? frame.legs[0] : frame.legs[1]);

/**
 * A bottom at a place, as the shader works it out for a pixel (her units): `waist`, how far inside its waistband's
 * line (`LOW_CUT.far` with none); `end`, how far short of its leg's end; `top`, how far past its leg's top -- and
 * `inside`, how far inside the garment the place is by the nearest edge that applies to it; `banded`, how far inside
 * its waistband's edge as its BAND counts it (the band is where that is under `spec.bands.waist`: inside its line by
 * `waistBanded`'s count -- or, a hoop's with its inner edge laid, the band's depth less how far the place stands
 * over that edge on her rest skin: `innerAt`). `place`: where the pixel
 * lies on her rest skin with her slip taken off; `along`: its leg's measure (`legMeasure`); `limb`: which of her skin
 * it is (`limbSkin`, blended as the pixel's place is: 1 her arm's, -1 her leg's, 0 the rest of her); `across`: how
 * much longer her skin is across her there than at rest (`waistAt`); `shaped`: where the pixel stands as she is
 * shaped, before her bones pose her, `swing`: how far its waistband's hoop has swung (`stayAt`, `swingOf`; none,
 * the line alone), `fold`: where the cloth's front runs between her thighs (`foldOf`), and `inner`: its hoop's
 * band's inner edge as it is laid (`bandInner`; none: the line's band).
 */
export function lowAt(spec: LowSpec, frame: LowFrame, place: V3, along: number, limb: number, across = 0, shaped: V3 | null = null, swing = 0, fold: number = LOW_CUT.far, inner: BandInner | null = null, moon: FrontMoon | null = null): { readonly waist: number; readonly end: number; readonly top: number; readonly inside: number; readonly banded: number } {
  const far = LOW_CUT.far, leg = legShareOf(limb) > 0.5, line = spec.waist ? waistAt(spec.waist, frame, place[0], place[1], place[2], across) : far;
  // (a hoop that has swung bares what stands over it, of her trunk's skin and her leg's alike, down to her crease)
  const held = spec.waist && spec.hinge && shaped && swing > 0 ? foldHeld(frame, hoopAt(stayAt(frame, spec.waist, spec.hinge, swing, shaped), underAt(frame, place, shaped, legShareOf(limb), fold), frame.stay.round), shaped, legShareOf(limb), fold) : far;
  const cut = held < far ? waistHeld(line, held, frame.stay.round) : line;
  // (its front, seen from her front: the moon laid on it, smoothing the cut's own edge: `frontMoon`)
  let waist = spec.waist && moon && shaped ? moonHeld(frame, moon, cut, shaped) : cut;
  let banded = !spec.waist ? far : inner ? spec.bands.waist - (place[1] - innerAt(inner, place[0], place[1], place[2])) : waistBanded(line, spec.bands.waist, frame, place[1]);
  // (where its front moon is laid its band is the cloth over its inner edge seen from her front: `innerMoon`)
  if (spec.waist && moon && shaped && inner?.front) { const w = moonShare(frame, moon, shaped); if (w > 0) banded += (spec.bands.waist - (shaped[1] - moonAt(inner.front, shaped[0] - frame.mid)) - banded) * w; }
  // (in front of her, once the hoop has swung, his line under her belly in place of all of that, and its band under
  // it: `foldAt`)
  if (held < far && shaped) {
    const [wOut, wAhead] = foldShares(frame, shaped);
    if (wAhead > 0) {
      // (eased into the hoop's edge out towards her hips, and her trunk's skin no further forward than the fold
      // wherever it is laid: `LOW_CUT.foldIn`, `foldDepth`)
      const f = foldAt(frame, place, shaped, legShareOf(limb), foldLift(frame, swing), foldEase(swing)), fc = Math.min(line, f.line);
      const front = Math.min(waist + (fc - waist) * wOut, f.deep), frontBand = banded + (f.line * foldStretchAt(frame, inner?.stretch, place) - banded) * wOut;
      waist += (front - waist) * wAhead; banded += (frontBand - banded) * wAhead;
    }
  }
  const end = spec.end === null ? far : spec.end - along, top = spec.start === null ? far : along - spec.start;
  // her leg's skin: every edge; the rest of her: under a waistband, and nothing of a stocking; her arm's skin, which
  // hangs beside her hips under any waistband: never
  const inside = limb > 0.5 ? -far : leg ? Math.min(waist, end, top) : spec.waist ? waist : -far;
  return { waist, end, top, inside, banded };
}

/**
 * Which of her skin is a LIMB's, a value a vertex: 1 her arm's, -1 her leg's (the bone that weighs most on it,
 * followed up her skeleton: `BodyMap.arm`, `BodyMap.leg`), 0 the rest of her. One number for the two: no triangle of
 * hers joins an arm's skin to a leg's, and across the one row that joins a limb's to her trunk's it blends from the
 * limb's to nothing. A sleeve's end cuts her arm's skin (`topCut.ts` reads it over a half), a leg's end her leg's
 * (under minus a half).
 */
export function limbSkin(map: { readonly arm: ArrayLike<number>; readonly leg: ArrayLike<number> }): Float32Array {
  const out = new Float32Array(map.arm.length);
  for (let v = 0; v < out.length; v++) out[v] = Number.isFinite(map.arm[v]) ? 1 : Number.isFinite(map.leg[v]) ? -1 : 0;
  return out;
}
/** Her leg's share of a pixel, from `limbSkin` blended across a triangle (the shader's). */
export function legShareOf(limb: number): number { return smoothstep(0.4, 0.6, -limb); }

/**
 * THE SHADER'S OWN FUNCTIONS for a bottom's cut, formula for formula with `spineDepth`, `roundAt`, `waistLine`,
 * `waistAt`, `stayAt`, `creaseAt`, `underAt`, `hoopAt` and `waistHeld` above. They read: `fabricLowAxis` (her middle, which way she faces,
 * her side seam ahead of her spine, and the scale an edge's distance is put on), `fabricLowSpineA` and
 * `fabricLowSpineB` (her spine's four joints: height, depth, height, depth each), `fabricLowStay` (how far to each side
 * of her middle her crease is told, where the cloth's front runs between her thighs -- `foldOf`, laid as she is
 * shaped -- nothing, and how round a hoop's corners are: `LowFrame.stay`) and
 * `fabricLowCrease` (her crease's heights: `LowFrame.crease`). A hoop's own four numbers (`g`): how far in front of her
 * axis its hinge is, the cosine and the sine of its swing, and its surface's room (`roomAt`); its hinge's height is its
 * waistband's back's. (A waistband's band and its floor, `waistBanded`, are the material's own lines: each of
 * the band's two edges is antialiased by its own slope -- `fabricMaterial.ts`, `fabricLowFloor`.)
 * A HOOP'S BAND, with `bandTurn` and `innerAt`: `fabricLowTurn` (the line its stations turn about: `BandStations.lean`)
 * and `fabricLowInner` (each layer's table, `BAND_STEPS` heights, four to a vector: `bandInner`) --
 * `fabricLowTurnAt`, where a place stands among the stations (a station's own number at its turn);
 * A SWUNG HOOP'S FRONT ALONG HIS LINE, with `foldAt` and `foldShare`: `fabricLowFrontK` (`LOW_CUT.foldIn`,
 * `foldOut`, `foldFrom`, `foldTo`, her units), `fabricLowFoldK` (a centimetre, her hip joints' height, `foldDepth` and `foldCurve`, her units)
 * and `fabricLowFoldT` (`FOLD_LINE`, her units), and the layer's `lift` (`foldLift`).
 * A HOOP'S FRONT MOON, with `moonAt` and `moonShare`: `fabricLowMoon` (each layer's two tables, `MOON_STEPS` heights
 * each -- its front moon's and its band's inner edge's, `innerMoon` -- four to a vector), `fabricLowMoonK` (how far
 * inside its tips it eases out, and `moonBack` and `moonOn`, her units) and the layer's own four numbers (`m`: its
 * tips' distance out, its fill, whether it is laid, its inner edge's tips).
 * `fabricLowInnerAt`, a layer's inner edge's height there; and `fabricLowSteep`, how much a number told on her rest
 * skin changes for each unit ALONG HER SKIN AS SHE IS SHAPED (off the pixel's own slopes: a seam along the band's
 * inner edge is as wide on her whatever her skin's stretch there).
 */
export function lowGlsl(): string {
  return `
float fabricLowSpine(float y) {
  vec4 a = fabricLowSpineA, b = fabricLowSpineB;
  if (y <= a.x) return a.y;
  if (y <= a.z) return mix(a.y, a.w, (y - a.x) / max(1e-6, a.z - a.x));
  if (y <= b.x) return mix(a.w, b.y, (y - a.z) / max(1e-6, b.x - a.z));
  if (y <= b.z) return mix(b.y, b.w, (y - b.x) / max(1e-6, b.z - b.x));
  return b.w;
}
vec3 fabricLowRound(vec3 p) {
  float dz = (p.z - fabricLowSpine(p.y)) * fabricLowAxis.y - fabricLowAxis.z, dx = p.x - fabricLowAxis.x, r = length(vec2(dx, dz));
  return vec3(r > 1e-9 ? 0.5 + 0.5 * dz / r : 0.5, abs(dx), max(r, 1e-9));
}
float fabricLowEnd(float run, float other) {
  float m = 0.5 * (3.0 * run - other);
  return m * run <= 0.0 ? 0.0 : (run * other < 0.0 && abs(m) > 3.0 * abs(run) ? 3.0 * run : m);
}
vec2 fabricLowLine(vec4 w, float u) {
  float d1 = 2.0 * (w.y - w.z), d2 = 2.0 * (w.x - w.y), mid = d1 * d2 > 0.0 ? 2.0 * d1 * d2 / (d1 + d2) : 0.0;
  bool ahead = u >= 0.5;
  float s = clamp(ahead ? (u - 0.5) * 2.0 : u * 2.0, 0.0, 1.0), bowl = ahead ? w.w : 0.0;
  float t = bowl > 0.0 ? 1.0 - pow(1.0 - s, 1.0 + bowl) : s, eased = bowl > 0.0 ? (1.0 + bowl) * pow(max(1.0 - s, 0.0), bowl) : 1.0, t2 = t * t, t3 = t2 * t;
  float p0 = ahead ? w.y : w.z, p1 = ahead ? w.x : w.y, m0 = 0.5 * (ahead ? mid : fabricLowEnd(d1, d2)), m1 = 0.5 * (ahead ? fabricLowEnd(d2, d1) : mid);
  return vec2((2.0 * t3 - 3.0 * t2 + 1.0) * p0 + (t3 - 2.0 * t2 + t) * m0 + (3.0 * t2 - 2.0 * t3) * p1 + (t3 - t2) * m1,
    2.0 * eased * ((6.0 * t2 - 6.0 * t) * (p0 - p1) + (3.0 * t2 - 4.0 * t + 1.0) * m0 + (3.0 * t2 - 2.0 * t) * m1));
}
float fabricLowInside(vec4 w, vec3 p, vec3 r, float across) {
  vec2 l = fabricLowLine(w, r.x);
  float climb = l.y * 0.5 * r.y / (r.z * r.z * max(${LOW_CUT.acrossLeast.toFixed(2)}, 1.0 + across));
  float d = (l.x - p.y) / sqrt(1.0 + climb * climb);
  return min(max(d, min(w.x, min(w.y, w.z)) - p.y), max(w.x, max(w.y, w.z)) - p.y);
}
float fabricLowStayAt(vec4 w, vec4 g, vec3 q) {
  float X = (q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z - g.x, Y = q.y - w.z;
  float a = g.x + X * g.y - Y * g.z, y = w.z + X * g.z + Y * g.y, o = abs(q.x - fabricLowAxis.x), r = max(length(vec2(o, a)), 1e-9);
  return fabricLowInside(w, vec3(0.0, y, 0.0), vec3(0.5 + 0.5 * a / r, o, r), 0.0) + g.w;
}
float fabricLowCreaseAt(float x) {
  float t = min(abs(x - fabricLowAxis.x) / fabricLowStay.x, 1.0) * ${(CREASE_STEPS - 1).toFixed(1)}, k = min(floor(t), ${(CREASE_STEPS - 2).toFixed(1)});
  int i = int(k);
  return mix(fabricLowCrease[i], fabricLowCrease[i + 1], t - k);
}
float fabricLowUnder(vec3 p, vec3 q, float leg) {
  float behind = fabricLowStay.y - ((q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z);
  float a = fabricLowCreaseAt(p.x) - p.y, b = mix(behind, ${LOW_CUT.far.toFixed(1)}, leg), k = fabricLowStay.w, h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float fabricLowHoop(float stay, float under) {
  float k = fabricLowStay.w, h = max(k - abs(stay - under), 0.0) / k;
  return max(stay, under) + h * h * k * 0.25;
}
float fabricLowMoonKnot(int layer, int part, int k) {
  int i = k < 0 ? -k : (k >= ${MOON_STEPS} ? ${2 * (MOON_STEPS - 1)} - k : k), j = layer * ${(2 * MOON_STEPS) / 4} + part * ${MOON_STEPS / 4} + i / 4;
  return fabricLowMoon[j][i - (i / 4) * 4];
}
float fabricLowMoonAt(int layer, int part, float o, float width) {
  float f = min(abs(o) / max(width, 1e-6), 1.0) * ${(MOON_STEPS - 1).toFixed(1)}, fl = min(floor(f), ${(MOON_STEPS - 2).toFixed(1)}), t = f - fl;
  int i = int(fl);
  float p0 = fabricLowMoonKnot(layer, part, i - 1), p1 = fabricLowMoonKnot(layer, part, i), p2 = fabricLowMoonKnot(layer, part, i + 1), p3 = fabricLowMoonKnot(layer, part, i + 2);
  return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}
float fabricLowMoonShare(vec4 m, vec3 q) {
  float o = abs(q.x - fabricLowAxis.x), a = (q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z;
  return (1.0 - smoothstep(m.x - fabricLowMoonK.x, m.x, o)) * smoothstep(-fabricLowMoonK.y, -fabricLowMoonK.z, a);
}
float fabricLowFoldKnot(int k, float ease) {
  return k > ${FOLD_HIP} ? mix(fabricLowFoldT[${FOLD_HIP}], fabricLowFoldT[k], ease) : fabricLowFoldT[k];
}
float fabricLowFoldRise(int k, float ease) {
  int a = max(k - 1, 0), b = min(k + 1, ${FOLD_LINE.length - 1});
  return (fabricLowFoldKnot(b, ease) - fabricLowFoldKnot(a, ease)) / (float(b - a) * fabricLowFoldK.x);
}
vec4 fabricLowFoldLine(vec3 p, vec3 q, float leg, float lift, float ease) {
  float o = abs(q.x - fabricLowAxis.x), a = (q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z;
  float wo = 1.0 - smoothstep(fabricLowFrontK.x, fabricLowFrontK.y, o), wa = smoothstep(fabricLowFrontK.z, fabricLowFrontK.w, a);
  float f = min(abs(p.x - fabricLowAxis.x) / fabricLowFoldK.x, ${(FOLD_LINE.length - 1).toFixed(1)}), k = min(floor(f), ${(FOLD_LINE.length - 2).toFixed(1)});
  int i = int(k);
  float rise = mix(fabricLowFoldRise(i, ease), fabricLowFoldRise(i + 1, ease), f - k);
  float line = (fabricLowFoldK.y + mix(fabricLowFoldKnot(i, ease), fabricLowFoldKnot(i + 1, ease), f - k) + lift - p.y) * inversesqrt(1.0 + rise * rise);
  float deep = fabricLowFoldK.z - fabricLowFoldK.w * o * o + lift - a;
  return vec4(wo, wa, line, mix(deep, ${LOW_CUT.far.toFixed(1)}, max(leg, smoothstep(fabricLowFrontK.y * ${(LOW_CUT.foldDeepIn / LOW_CUT.foldOut).toFixed(6)}, fabricLowFrontK.y, o))));
}
float fabricLowFoldStretch(vec3 p) {
  float f = min(abs(p.x - fabricLowAxis.x) / fabricLowFoldK.x, ${(FOLD_LINE.length - 1).toFixed(1)}), k = min(floor(f), ${(FOLD_LINE.length - 2).toFixed(1)});
  int i = int(k);
  return mix(fabricLowFoldS[i], fabricLowFoldS[i + 1], f - k);
}
float fabricLowFold(float held, vec3 q, float leg) {
  float behind = fabricLowStay.y - ((q.z - fabricLowSpine(q.y)) * fabricLowAxis.y - fabricLowAxis.z);
  float b = mix(behind, ${LOW_CUT.far.toFixed(1)}, leg), k = fabricLowStay.w, h = max(k - abs(held - b), 0.0) / k;
  return min(held, b) - h * h * k * 0.25;
}
float fabricLowHeld(float inside, float held) {
  float k = fabricLowStay.w, h = max(k - abs(inside - held), 0.0) / k;
  return min(inside, held) - h * h * k * 0.25;
}
float fabricLowTurnAt(vec3 p) {
  float d = fabricLowTurn.x + fabricLowTurn.y * p.y;
  d = fabricLowAxis.y > 0.0 ? min(d, fabricLowTurn.z) : max(d, fabricLowTurn.z);
  return atan(abs(p.x - fabricLowAxis.x), (p.z - d) * fabricLowAxis.y) * ${(BAND_STEPS / Math.PI).toFixed(6)} - 0.5;
}
float fabricLowKnot(int layer, int k) {
  int i = k < 0 ? -k - 1 : (k >= ${BAND_STEPS} ? ${2 * BAND_STEPS - 1} - k : k);
  return fabricLowInner[layer * ${BAND_STEPS / 4} + i / 4][i - (i / 4) * 4];
}
float fabricLowInnerAt(int layer, float f) {
  float fl = floor(f), t = f - fl;
  int i = int(fl);
  float p0 = fabricLowKnot(layer, i - 1), p1 = fabricLowKnot(layer, i), p2 = fabricLowKnot(layer, i + 1), p3 = fabricLowKnot(layer, i + 2);
  return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}
float fabricLowSteep(float g) {
  vec3 px = dFdx(vFabricLow.xyz), py = dFdy(vFabricLow.xyz);
  float gx = dFdx(g), gy = dFdy(g), e = dot(px, px), f = dot(px, py), h = dot(py, py);
  return sqrt(max(h * gx * gx - 2.0 * f * gx * gy + e * gy * gy, 0.0) / max(e * h - f * f, 1e-30));
}
float fabricLowNearTo(float g, float cap) {
  float st = fabricLowSteep(g);
  return g > ${(LOW_CUT.far / 100).toFixed(1)} || st > ${LOW_CUT.nearMost.toFixed(1)} ? ${LOW_CUT.far.toFixed(1)} : g / clamp(st, ${LOW_CUT.nearLeast.toFixed(2)}, cap);
}
float fabricLowNear(float g) { return fabricLowNearTo(g, ${LOW_CUT.nearCap.toFixed(2)}); }`;
}
