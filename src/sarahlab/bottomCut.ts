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
 * - ITS WAISTBAND is the line it always was, round her at a height at her front's middle, at her sides and at her
 *   back's middle (`paintTemplates.aroundLine`; 1 her front, 0 her back: `aroundAt`), now worked out for each pixel at
 *   its own place on her REST skin with her skin's slip taken off (`pulledSlip.ts`). So it stays on the skin it was
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
 */
export const LOW_CUT = Object.freeze({ kneeBlend: 0.04, range: 0.03, slipUnder: 0.08, slipOver: 0.4, far: 1e4, acrossLeast: 0.25, bandFloor: 0.026 });

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
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a || 1e-12)); return t * t * (3 - 2 * t); };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Her measures for a bottom's cut, from her joints (as `bodyRegions.mapBody` reads them: the same middle, trunk and spine). */
export function lowFrame(input: LowFrameInput): LowFrame {
  const J = input.joints, U = input.unitsPerMetre, facing = input.facing ?? 1;
  const mid = (J.hipL[0] + J.hipR[0]) / 2, hipY = (J.hipL[1] + J.hipR[1]) / 2, trunk = Math.max(1e-6, J.neck[1] - hipY);
  const spine = [J.pelvis, J.spine, J.chest, J.neck].map((j) => [j[1], j[2]] as const).sort((a, b) => a[0] - b[0]);
  const leg = (hip: V3, knee: V3, ankle: V3, name: 'L' | 'R'): LowLeg => ({ hip, knee, ankle, thigh: Math.hypot(...sub(knee, hip)) || 1e-6, shin: Math.hypot(...sub(ankle, knee)) || 1e-6, side: hip[0] >= mid ? 1 : -1, name });
  const a = leg(J.hipL, J.kneeL, J.ankleL, 'L'), b = leg(J.hipR, J.kneeR, J.ankleR, 'R');
  return { unitsPerMetre: U, mid, hipY, trunk, facing, seam: MAP_LINES.seamAhead * trunk, floor: hipY - LOW_CUT.bandFloor * U, spine, legs: a.side >= b.side ? [a, b] : [b, a] };
}

/** Her spine's depth at a height (`bodyRegions.mapBody`'s `spineZ`: the nearest joint's beyond its ends). */
export function spineDepth(frame: LowFrame, y: number): number {
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

/** Whether a template's bottom is drawn this way: a waistband or a leg's top, legs, no top of its own, no leg cut and no outline of its own. */
export function isDrawnBottom(p: Pick<CoverageParams, 'riseFront' | 'hemFront' | 'neckFront' | 'legCut' | 'outline'>): boolean {
  return p.riseFront !== null && p.hemFront === null && p.neckFront === null && !p.legCut && !p.outline;
}

/** A bottom's cut as numbers (her units): what the shader's layer is laid from. */
export interface LowSpec {
  /** Its waistband: its height at the middle of her front, at her sides and at the middle of her back, and how far round her the front's height holds (`aroundLine`'s `frontReach`). Null: none (a stocking, a sock). */
  readonly waist: V4 | null;
  /** Where its legs end, and where they begin, along her leg from her hip joint (`legAlong`); null: no end (it has feet), no top of its own (it has a waistband). */
  readonly end: number | null; readonly start: number | null;
  readonly bands: LowBands;
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
export function lowSpec(p: Pick<CoverageParams, 'riseFront' | 'riseSide' | 'riseBack' | 'riseFrontWidth' | 'legStart' | 'legEnd' | 'feet'> & { readonly lowBand?: Partial<LowBands> | null }, frame: LowFrame): LowSpec {
  const U = frame.unitsPerMetre, at = (t: number) => frame.hipY + t * frame.trunk, along = (f: number) => (legAlong(frame.legs[0], f) + legAlong(frame.legs[1], f)) / 2;
  const front = p.riseFront ?? 0, back = p.riseBack ?? front, side = p.riseSide ?? (front + back) / 2;
  // (legwear -- a leg's top of its own -- has no waistband: `paintTemplates.coverage`)
  const waist: V4 | null = p.legStart > 0 ? null : [at(front), at(side), at(back), p.riseFrontWidth ?? 1];
  const B = p.lowBand ?? {};
  return {
    waist, end: p.feet ? null : along(p.legEnd), start: p.legStart > 0 ? along(p.legStart) : null,
    bands: { waist: waist ? (B.waist ?? LOW_BANDS.waist) * U : 0, leg: p.feet ? 0 : (B.leg ?? LOW_BANDS.leg) * U, top: p.legStart > 0 ? (B.top ?? LOW_BANDS.top) * U : 0 },
  };
}

/** A waistband's line at `around` (`paintTemplates.aroundLine` with a waistband's back reach, a half): its height, and how fast that changes with `around`. */
export function waistLine(waist: V4, around: number): { readonly height: number; readonly slope: number } {
  const [front, side, back] = waist, fr = Math.max(0.55, Math.min(1, waist[3]));
  if (around >= 0.5) { const t = Math.min(1, (around - 0.5) / (fr - 0.5)); return { height: side + (front - side) * t * t * (3 - 2 * t), slope: ((front - side) * 6 * t * (1 - t)) / (fr - 0.5) }; }
  const t = Math.min(1, around / 0.5);
  return { height: back + (side - back) * t * t * (3 - 2 * t), slope: ((side - back) * 6 * t * (1 - t)) / 0.5 };
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
  const r = roundAt(frame, x, y, z), line = waistLine(waist, r.around), climb = (line.slope * 0.5 * r.out) / (r.radius * r.radius * Math.max(LOW_CUT.acrossLeast, 1 + across));
  const d = (line.height - y) / Math.sqrt(1 + climb * climb);
  // (never nearer the line than the place is UNDER THE LOWEST of it, or over the highest: below)
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
 * its waistband's line as its BAND counts it (`waistBanded`: the band is where that is under `spec.bands.waist`). `place`: where the pixel
 * lies on her rest skin with her slip taken off; `along`: its leg's measure (`legMeasure`); `limb`: which of her skin
 * it is (`limbSkin`, blended as the pixel's place is: 1 her arm's, -1 her leg's, 0 the rest of her); `across`: how
 * much longer her skin is across her there than at rest (`waistAt`).
 */
export function lowAt(spec: LowSpec, frame: LowFrame, place: V3, along: number, limb: number, across = 0): { readonly waist: number; readonly end: number; readonly top: number; readonly inside: number; readonly banded: number } {
  const far = LOW_CUT.far, waist = spec.waist ? waistAt(spec.waist, frame, place[0], place[1], place[2], across) : far;
  const banded = spec.waist ? waistBanded(waist, spec.bands.waist, frame, place[1]) : far;
  const end = spec.end === null ? far : spec.end - along, top = spec.start === null ? far : along - spec.start;
  // her leg's skin: every edge; the rest of her: under a waistband, and nothing of a stocking; her arm's skin, which
  // hangs beside her hips under any waistband: never
  const inside = limb > 0.5 ? -far : legShareOf(limb) > 0.5 ? Math.min(waist, end, top) : spec.waist ? waist : -far;
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
 * THE SHADER'S OWN FUNCTIONS for a bottom's cut, formula for formula with `spineDepth`, `roundAt`, `waistLine` and
 * `waistAt` above. They read: `fabricLowAxis` (her middle, which way she faces, her side seam ahead of her spine, and
 * the scale an edge's distance is put on), `fabricLowSpineA` and `fabricLowSpineB` (her spine's four joints: height,
 * depth, height, depth each). (A waistband's band and its floor, `waistBanded`, are the material's own lines: each of
 * the band's two edges is antialiased by its own slope -- `fabricMaterial.ts`, `fabricLowFloor`.)
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
vec2 fabricLowLine(vec4 w, float u) {
  float fr = clamp(w.w, 0.55, 1.0);
  if (u >= 0.5) { float t = min(1.0, (u - 0.5) / (fr - 0.5)); return vec2(w.y + (w.x - w.y) * t * t * (3.0 - 2.0 * t), (w.x - w.y) * 6.0 * t * (1.0 - t) / (fr - 0.5)); }
  float t = min(1.0, u / 0.5);
  return vec2(w.z + (w.y - w.z) * t * t * (3.0 - 2.0 * t), (w.y - w.z) * 6.0 * t * (1.0 - t) / 0.5);
}
float fabricLowInside(vec4 w, vec3 p, vec3 r, float across) {
  vec2 l = fabricLowLine(w, r.x);
  float climb = l.y * 0.5 * r.y / (r.z * r.z * max(${LOW_CUT.acrossLeast.toFixed(2)}, 1.0 + across));
  float d = (l.x - p.y) / sqrt(1.0 + climb * climb);
  return min(max(d, min(w.x, min(w.y, w.z)) - p.y), max(w.x, max(w.y, w.z)) - p.y);
}`;
}
