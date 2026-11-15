/**
 * A PAINTED TOP'S CUT, DRAWN SMOOTH (Joshua, 2026-11-14: "fix the painted clothes and add smooth edges, shirt
 * collars/sleeves like how you did the bikini bottom"; of the cuts themselves, his sheet of sixteen tops, front and back:
 * "Hopefully these will help to get started and have more than our list").
 *
 * WHAT WAS WRONG (MEASURED 2026-11-14 in the room, v0.9.23, her painted tee in a T-pose). A painted top's edges were a
 * value per vertex of her skin (`paintTemplates.coverage`), the edge drawn where the blend of three of them crosses one
 * half. Her skin over her chest and her arms is in triangles centimetres across, so no line laid that way is smooth:
 * her sleeve's end drew in teeth under her arm, and her V-neck in steps. And the "crew" was a level line across her
 * chest with her shoulders bare 12 cm out from her neck's axis -- a box, not a collar.
 *
 * WHAT THIS GIVES. A top's cut is DRAWN, as his sheet shows a top: once from her front and once from her back, on her
 * REST shape (her body file's: her arms hang beside her). Each drawing is the line of the garment's neck opening --
 * its RIM -- as a curve; what is kept of it is, for every place in a picture laid flat against her (`TOP_CUT.cell`
 * across), how far that place is inside the garment, in metres: + inside, - in the opening. Each pixel of her skin
 * looks itself up there at its own rest place (`fabricMaterial.ts`), in the front drawing or the back by whether it
 * lies in front of her middle depth or behind it (`TopFrame.zMid`: half way between her front skin and her back skin
 * at that place). So the line is a curve at the picture's own resolution whatever her triangles are, and a BAND along
 * it (a collar, a cuff) is as wide all the way round as its number says.
 *
 * Her sleeves' ends and her hem are not in the picture: each is a flat cut through her -- a sleeve's end square to the
 * bone of her arm it ends on (her upper arm's, or past her elbow her forearm's: `sleevePlane`), a hem level -- so the
 * pixel works its own distance out. A sleeve's end cuts her ARM's skin and a hem everything else of her: which is which
 * is her bones' say (`armShare`, a value per vertex: it is 0 or 1 everywhere a sleeve's end or a hem can lie).
 *
 * THE TWO DRAWINGS MEET OVER HER SHOULDERS. Each rim ends at its SIDE POINTS, on the ridge of her shoulders (the
 * highest skin at that distance from her middle: `TopFrame.ridge`), and both drawings carry it straight up from there,
 * so the line crosses her ridge at the side point in both. Skin on top of her shoulder, which neither drawing sees
 * square on, takes the two blended by its depth (`sideBlend`), and there they are nearly one: MEASURED 2026-11-14 on
 * her skin within that depth of her middle depth, the two differ by 1.1 to 2.5 mm on the line itself and by 1.2 to
 * 4.5 mm a band's width inside it, by style (her ridge falls away outward, so a place on it beside a side point is
 * under that point's height: her back's drawing measures it to the point, her front's across to the rim's upright).
 * `tests/topCut.test.ts` holds those.
 *
 * Pure arithmetic over plain arrays; nothing here reads a mesh or the GPU.
 */
import type { CoverageParams } from './paintTemplates';

export type V3 = readonly [number, number, number];

/**
 * GAME TUNING (metres, on her rest shape) but for `cell` and `range`, which are the picture's own.
 * - `cell`: the picture's cells. `range`: how far either side of the neck opening's rim a distance is kept: a collar's
 *   band is never wider, and a place held at the range (`far`, within 2% of it) is far from the rim however far, so
 *   its sleeve's end or its hem alone says where it is (a cuff may be wider than the range).
 * - `halfWidth`, `below`, `above`: the picture's reach about the base of her neck (her neck joint): out to either side,
 *   down and up. Down to under her bust and out past her shoulders: every neck opening, strap and armhole is in it.
 * - `ceiling`: above this over the base of her neck nothing is a garment (her head). No skin of her shoulders stands
 *   within a band's width of it (MEASURED 2026-11-14: her shoulders' ridge is 4.4 cm over her neck joint 6 cm out
 *   from her middle, where the closest collar's side points are, and lower all the way out from there).
 * - `sideBlend`: the two drawings are blended over this much depth either side of her middle depth.
 * - `ridgeCap`: her shoulders' ridge is looked for below this over the base of her neck (her jaw and ears are above).
 * - `elbowTurn`: a sleeve that ends within this of her elbow is cut square to a direction between her two bones' there
 *   (her arm is a little bent at rest: MEASURED 2026-11-14 on her, her forearm 11.9 degrees off her upper arm's line),
 *   so the cut turns with SLEEVE as it passes her elbow and does not jump.
 */
export const TOP_CUT = Object.freeze({
  cell: 0.00125, range: 0.03,
  halfWidth: 0.26, below: 0.36, above: 0.12,
  ceiling: 0.085, sideBlend: 0.006, ridgeCap: 0.075, elbowTurn: 0.03,
});

/**
 * THE NECK OPENINGS, by style (metres on her; GAME TUNING to his sheet, 2026-11-14). `half`: the rim's side points, out
 * from her middle on her shoulders' ridge. `power`: how square the curve is between its lowest point and a side point
 * (2 a half ellipse; more, flatter across the bottom and steeper up the sides). `back`: how far under its side points
 * the rim dips at the middle of her back. `depth`: how far under the base of her neck its lowest point is in front,
 * until the NECKLINE slider moves it.
 * - crew (his 01, 02, 05): close round the base of her neck.
 * - u: the crew's opening taken down her front.
 * - v (03): straight from the side points to a point, its tip rounded `tip` across and its turn at each side point `turn`.
 * - scoop (04): wide on her shoulders and round.
 * - square (12): straight down from her shoulders to a level edge, its corners rounded `corner`.
 */
export const NECK_STYLES = Object.freeze({
  crew: Object.freeze({ half: 0.068, power: 2, back: 0.008, depth: 0.018 }),
  u: Object.freeze({ half: 0.07, power: 2.3, back: 0.008, depth: 0.1 }),
  v: Object.freeze({ half: 0.07, power: 0, back: 0.008, depth: 0.095, tip: 0.006, turn: 0.022 }),
  scoop: Object.freeze({ half: 0.105, power: 2.6, back: 0.014, depth: 0.085 }),
  square: Object.freeze({ half: 0.088, power: 0, back: 0.012, depth: 0.08, corner: 0.012 }),
});
export type NeckStyle = keyof typeof NECK_STYLES;

/** A BAND along an edge, metres wide: a collar, a sleeve's hem or cuff, a hem. 0: none there. */
export interface TopBands { readonly neck: number; readonly sleeve: number; readonly hem: number }
/**
 * GAME TUNING (metres): a tee's bands as his sheet shows them -- a ribbed collar, a turned sleeve hem.
 * NONE AT ITS HEM YET. A shirt's hem is its drape's hem band (`tunicDrape.ts`): a sheet in the shirt's own fabric, solid
 * over the last 18 mm above the hem, which covers her skin's paint there. A band drawn on her skin at her hem (20 mm,
 * his sheet's stitched hem; tried 2026-11-14) showed only where that sheet dips under her skin: MEASURED in the room,
 * a grey patch at her side in the top's own fabric, and, with an edging colour, chips of that colour at her side and
 * hairlines of it round her. To draw a stitched hem the drape's band has to draw it as well.
 */
export const TEE_BANDS: TopBands = Object.freeze({ neck: 0.016, sleeve: 0.018, hem: 0 });

/** What a top's cut is laid by on one body: her own measures, in her mesh's own units (the room's rest positions). */
export interface TopFrame {
  readonly unitsPerMetre: number;
  /** Her middle (x), the base of her neck (her neck joint's height) and her hip joints' height. */
  readonly mid: number; readonly neckY: number; readonly hipY: number;
  /** +1 when she faces +z at rest, -1 when -z. */
  readonly facing: number;
  /** Her shoulders' ridge: her highest skin at each distance out from her middle (`ridgeStep` apart from 0), her two sides' mean. */
  readonly ridge: Float32Array; readonly ridgeStep: number;
  /** Each arm: her left's, then her right's. */
  readonly arms: readonly [TopArm, TopArm];
  /** The picture: its corner (lowest x and y), its cells, and each cell's middle depth (z) of her there. */
  readonly x0: number; readonly y0: number; readonly cell: number; readonly cols: number; readonly rows: number;
  readonly zMid: Float32Array; readonly zLo: number; readonly zHi: number;
}
/**
 * An arm at rest: her shoulder, elbow and wrist joints; her upper arm and her forearm, each a unit vector and a length;
 * and `length`, the two together -- what SLEEVE is a share of (0 her shoulder joint, 1 her wrist).
 */
export interface TopArm {
  readonly from: V3; readonly elbow: V3; readonly to: V3;
  readonly upper: { readonly dir: V3; readonly length: number }; readonly fore: { readonly dir: V3; readonly length: number };
  readonly length: number; readonly side: 1 | -1;
}

export interface TopFrameInput {
  /** Her vertices at rest (three numbers each) and her triangles, in her mesh's own units. */
  readonly rest: ArrayLike<number>; readonly index: ArrayLike<number>;
  readonly unitsPerMetre: number;
  readonly joints: { readonly neck: V3; readonly hipL: V3; readonly hipR: V3; readonly shoulderL: V3; readonly elbowL: V3; readonly wristL: V3; readonly shoulderR: V3; readonly elbowR: V3; readonly wristR: V3 };
  /** +1 facing +z (the default), -1 facing -z. */
  readonly facing?: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a || 1e-12)); return t * t * (3 - 2 * t); };

/** Her measures for a top's cut, from her rest skin and her joints. */
export function topFrame(input: TopFrameInput): TopFrame {
  const { rest: P, index, unitsPerMetre: U, joints: J } = input, facing = input.facing ?? 1;
  const mid = J.neck[0], neckY = J.neck[1], hipY = (J.hipL[1] + J.hipR[1]) / 2;
  const cell = TOP_CUT.cell * U, x0 = mid - TOP_CUT.halfWidth * U, y0 = neckY - TOP_CUT.below * U;
  const cols = Math.round((2 * TOP_CUT.halfWidth * U) / cell), rows = Math.round(((TOP_CUT.below + TOP_CUT.above) * U) / cell);
  // her front-most and back-most skin over every cell: each triangle laid flat on the picture
  const front = new Float32Array(cols * rows).fill(-Infinity), back = new Float32Array(cols * rows).fill(Infinity);
  // her shoulders' ridge: the highest crossing of any of her triangles' sides with each line of constant distance from
  // her middle, under the cap (her head is above it)
  const ridgeStep = 0.0025 * U, ridgeN = Math.ceil((TOP_CUT.halfWidth * U) / ridgeStep) + 1, cap = neckY + TOP_CUT.ridgeCap * U;
  const ridges = [new Float32Array(ridgeN).fill(-Infinity), new Float32Array(ridgeN).fill(-Infinity)];
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    for (const [s, r] of [[1, ridges[0]], [-1, ridges[1]]] as const) {
      const da = (ax - mid) * s, db = (bx - mid) * s;
      if (Math.max(da, db) < 0) continue;
      const lo = Math.max(0, Math.ceil(Math.min(da, db) / ridgeStep)), hi = Math.min(ridgeN - 1, Math.floor(Math.max(da, db) / ridgeStep));
      for (let k = lo; k <= hi; k++) { const t = db === da ? 0 : (k * ridgeStep - da) / (db - da), y = ay + (by - ay) * t; if (y <= cap && y > r[k]) r[k] = y; }
    }
  };
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[b], by = P[b + 1], bz = P[b + 2], cx = P[c], cy = P[c + 1], cz = P[c + 2];
    if (Math.max(ay, by, cy) < y0 - cell || Math.min(ay, by, cy) > cap + 0.2 * U) continue;
    if (Math.max(ay, by, cy) <= cap) { edge(ax, ay, bx, by); edge(bx, by, cx, cy); edge(cx, cy, ax, ay); }
    const u0 = (ax - x0) / cell, v0 = (ay - y0) / cell, u1 = (bx - x0) / cell, v1 = (by - y0) / cell, u2 = (cx - x0) / cell, v2 = (cy - y0) / cell;
    const i0 = Math.max(0, Math.floor(Math.min(u0, u1, u2))), i1 = Math.min(cols - 1, Math.ceil(Math.max(u0, u1, u2)));
    const j0 = Math.max(0, Math.floor(Math.min(v0, v1, v2))), j1 = Math.min(rows - 1, Math.ceil(Math.max(v0, v1, v2)));
    if (i0 > i1 || j0 > j1) continue;
    const den = (v1 - v2) * (u0 - u2) + (u2 - u1) * (v0 - v2);
    if (Math.abs(den) < 1e-12) continue;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const pu = i + 0.5, pv = j + 0.5;
      const w0 = ((v1 - v2) * (pu - u2) + (u2 - u1) * (pv - v2)) / den, w1 = ((v2 - v0) * (pu - u2) + (u0 - u2) * (pv - v2)) / den, w2 = 1 - w0 - w1;
      if (w0 < -1e-3 || w1 < -1e-3 || w2 < -1e-3) continue;
      const z = (w0 * az + w1 * bz + w2 * cz) * facing, k = j * cols + i;
      if (z > front[k]) front[k] = z;
      if (z < back[k]) back[k] = z;
    }
  }
  // her middle depth: half way between the two; cells she does not cover take their neighbours', then all are evened
  let zMid = new Float32Array(cols * rows), known = new Uint8Array(cols * rows);
  for (let k = 0; k < zMid.length; k++) if (front[k] > -Infinity) { zMid[k] = (front[k] + back[k]) / 2; known[k] = 1; }
  for (let pass = 0; pass < cols + rows && known.includes(0); pass++) {
    const nextKnown = known.slice(), next = zMid.slice();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (known[k]) continue;
      let sum = 0, n = 0;
      if (i > 0 && known[k - 1]) { sum += zMid[k - 1]; n++; }
      if (i + 1 < cols && known[k + 1]) { sum += zMid[k + 1]; n++; }
      if (j > 0 && known[k - cols]) { sum += zMid[k - cols]; n++; }
      if (j + 1 < rows && known[k + cols]) { sum += zMid[k + cols]; n++; }
      if (n) { next[k] = sum / n; nextKnown[k] = 1; }
    }
    zMid = next; known = nextKnown;
  }
  for (let pass = 0; pass < 6; pass++) {
    const next = zMid.slice();
    for (let j = 1; j + 1 < rows; j++) for (let i = 1; i + 1 < cols; i++) { const k = j * cols + i; next[k] = (zMid[k] * 4 + zMid[k - 1] + zMid[k + 1] + zMid[k - cols] + zMid[k + cols]) / 8; }
    zMid = next;
  }
  let zLo = Infinity, zHi = -Infinity;
  for (let k = 0; k < zMid.length; k++) { zLo = Math.min(zLo, zMid[k]); zHi = Math.max(zHi, zMid[k]); }
  // (a depth that is the same everywhere still needs a span for the picture's byte: it reads back as that depth)
  if (!(zHi > zLo)) { if (!Number.isFinite(zLo)) zLo = 0; zHi = zLo + 1; }
  // her two sides' ridge as one; a distance none of her skin crosses takes its neighbour's
  const ridge = new Float32Array(ridgeN);
  for (let k = 0; k < ridgeN; k++) { const l = ridges[0][k], r = ridges[1][k]; ridge[k] = l > -Infinity && r > -Infinity ? (l + r) / 2 : Math.max(l, r); }
  for (let k = 1; k < ridgeN; k++) if (!(ridge[k] > -Infinity)) ridge[k] = ridge[k - 1];
  for (let k = ridgeN - 2; k >= 0; k--) if (!(ridge[k] > -Infinity)) ridge[k] = ridge[k + 1];
  const bone = (from: V3, to: V3) => { const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], length = Math.hypot(d[0], d[1], d[2]) || 1; return { dir: [d[0] / length, d[1] / length, d[2] / length] as V3, length }; };
  const arm = (from: V3, elbow: V3, to: V3, side: 1 | -1): TopArm => { const upper = bone(from, elbow), fore = bone(elbow, to); return { from, elbow, to, upper, fore, length: upper.length + fore.length, side }; };
  return { unitsPerMetre: U, mid, neckY, hipY, facing, ridge, ridgeStep, arms: [arm(J.shoulderL, J.elbowL, J.wristL, 1), arm(J.shoulderR, J.elbowR, J.wristR, -1)], x0, y0, cell, cols, rows, zMid, zLo, zHi };
}

/** Her shoulders' ridge at `out` (her units) from her middle. */
export function ridgeAt(frame: TopFrame, out: number): number {
  const u = Math.max(0, Math.min(frame.ridge.length - 1, Math.abs(out) / frame.ridgeStep)), k = Math.min(frame.ridge.length - 2, Math.floor(u)), f = u - k;
  return frame.ridge[k] + (frame.ridge[k + 1] - frame.ridge[k]) * f;
}

/** Her middle depth at a place of the picture (her units; the nearest cell's beyond its sides), blended between cells. */
export function midDepthAt(frame: TopFrame, x: number, y: number): number {
  const u = Math.max(0, Math.min(frame.cols - 1, (x - frame.x0) / frame.cell - 0.5)), v = Math.max(0, Math.min(frame.rows - 1, (y - frame.y0) / frame.cell - 0.5));
  const i = Math.min(frame.cols - 2, Math.floor(u)), j = Math.min(frame.rows - 2, Math.floor(v)), fu = u - i, fv = v - j, k = j * frame.cols + i, Z = frame.zMid;
  return (Z[k] * (1 - fu) + Z[k + 1] * fu) * (1 - fv) + (Z[k + frame.cols] * (1 - fu) + Z[k + frame.cols + 1] * fu) * fv;
}

/** A top's cut as numbers: what the drawings, the sleeves' ends and the hem are laid from (her units). */
export interface TopCutSpec {
  readonly style: NeckStyle;
  /** The rim's side points out from her middle, and the height of its lowest point in front. */
  readonly half: number; readonly dipY: number;
  /** Where a sleeve ends along her arm from her shoulder joint, down her upper arm and on down her forearm (her units); negative: no sleeve, her arms bare. */
  readonly sleeve: number;
  /** Her hem's height; -Infinity: none (a one-piece). */
  readonly hemY: number;
  readonly bands: TopBands;
  /**
   * A top whose OUTLINE is more than a neck opening (`TOP_OUTLINES`: straps, armholes, a racerback, a straight top edge,
   * a mock neck), laid in her units; absent, the neck opening alone, exactly as before.
   */
  readonly outline?: TopOutlineSpec;
  /**
   * How far either side of her middle depth the two drawings are blended (her units); absent, `TOP_CUT.sideBlend`. An
   * outline's front and back armholes are different lines down her (her front's a limit straight down from the strap,
   * her back's in toward her spine and out again), and blended over this depth the edge passes from one to the other
   * round her shoulder as a slope, not a step (`OUTLINE_SIDE_BLEND`).
   */
  readonly sideBlend?: number;
}

/**
 * THE OUTLINES, by kind (Joshua, 2026-11-14: "finish all 10 remaining shirt tops"; his sheet's 06, 07, 11 and 13). Metres
 * on her rest shape, heights under the base of her neck (her neck joint); GAME TUNING to his sheet but where said.
 * - `strapIn`, `strapOut`: a strap's inner and outer edge out from her middle where they cross her shoulders' ridge, the
 *   same numbers front and back (a strap is `strapOut - strapIn` wide over her shoulder). Both drawings carry each
 *   edge straight up from her ridge, as a neck opening's side points are.
 * - `armX`, `armDrop`: her back's armhole's foot, out from her middle and under the base of her neck; it runs from the
 *   strap's outer edge on her ridge, straight down at first, round to level at its foot (no corner at either end), and
 *   on out level round her side. `armLimit`: how far out from her middle her FRONT's limit of the armhole runs down
 *   her (`FRONT_ARM`). What a person sees of an armhole from her front and her side is its ARMSCYE, a drawing of her
 *   side that each outline has of its own (`ARMSCYES`).
 *   MEASURED 2026-11-14 on her rest skin (`armShare`, the row of her triangles that joins her arm's skin to her trunk's):
 *   that row crosses her ridge 15.8 cm out from her middle; down her front it is 13 to 14 cm out from 5 to 11 cm under
 *   her neck joint (her armpit's apex in front, 12 cm under it); down her back 11.3 to 13 cm out, as low as 17 cm under
 *   it. Under her arm her trunk is 12.1 to 12.4 cm out from 18 to 21 cm under it. So every armhole is out of that row:
 *   in FRONT a limit no further out than 11.3 cm and the armscye, which runs 3 cm and more in front of that row;
 *   BEHIND in to `BACK_ARM` and out to level `armDrop` (18.3 cm) under, the armscye's foot level 17.9 cm under.
 *   A tank's strap's outer edge is 10.6 cm out. `tests/topOutline.test.ts` holds every point of that row 5 mm or more
 *   inside the armhole, for every outline.
 * - `neck`: the front's neck opening between the straps, a `NECK_STYLES` curve whose side points are the straps'
 *   inner edges; its depth is the NECKLINE slider's. `back`: how the back is cut between them -- 'scoop' to `backDrop`
 *   under her neck joint; 'racer', its neck opening to `backDrop` and the straps' outer edges curving in to one panel
 *   `racerX` either side of her spine `racerDrop` under her neck joint, and out from there to the armhole's foot;
 *   'straight', the front's own top edge.
 * - 'straight' front (the camisole): a top edge at the NECKLINE slider's height, dipping `sag` at her middle, turned up
 *   into each strap round `corner`; outside the strap its edge runs from a peak just over the top edge out and down
 *   round the side of her bust (`CAMI_FALL`, its armscye; its back is the same top edge, and its back armhole a tank's).
 * - `collar` (the mock neck): no neck opening -- it goes up her neck to a level rim `collar` over her neck joint, and
 *   across her shoulders out to its armholes. MEASURED: her ridge is 4.4 cm over her neck joint 6 cm out, so a rim at
 *   6.2 cm stands 2 cm up the side of her neck and higher at its front (the base of her neck is lower there).
 */
export const TOP_OUTLINES = Object.freeze({
  tank: Object.freeze({ strapIn: 0.07, strapOut: 0.106, armX: 0.15, armDrop: 0.183, armLimit: 0.106, neck: 'scoop' as NeckStyle, front: 'neck', back: 'scoop', backDrop: 0.07, depth: 0.11 }),
  sportsBra: Object.freeze({ strapIn: 0.074, strapOut: 0.11, armX: 0.15, armDrop: 0.183, armLimit: 0.11, neck: 'scoop' as NeckStyle, front: 'neck', back: 'racer', backDrop: 0.055, racerX: 0.03, racerDrop: 0.14, depth: 0.12 }),
  camisole: Object.freeze({ strapIn: 0.088, strapOut: 0.096, armX: 0.15, armDrop: 0.183, armLimit: 0.113, neck: 'scoop' as NeckStyle, front: 'straight', back: 'straight', sag: 0.01, corner: 0.012, depth: 0.1 }),
  mockNeck: Object.freeze({ strapIn: 0.1, strapOut: 0.1, armX: 0.15, armDrop: 0.183, armLimit: 0.106, neck: 'crew' as NeckStyle, front: 'collar', back: 'collar', collar: 0.062, corner: 0.01, depth: 0 }),
});
export type TopOutlineKind = keyof typeof TOP_OUTLINES;
/** The drawn tops that are not a tee's neck opening, sleeves and level hem alone: the outlines, and the boxy crop tee (a crew tee with a hem of its own). */
export type CutTopKind = TopOutlineKind | 'cropTee';
/** An outline laid on one body (her units; heights absolute). */
export interface TopOutlineSpec {
  readonly kind: TopOutlineKind;
  readonly strapIn: number; readonly strapOut: number; readonly armX: number; readonly armY: number;
  /** The front limit's foot (the back's: what lies between them at her side is the armscye's to say, `side`), and how far out from her middle the limit runs down her front. */
  readonly frontY: number; readonly limit: number;
  /**
   * THE ARMHOLE'S SIDE PROFILE (`ARMSCYES`): her side's drawing covers what is in front of and under `curve` (metres:
   * ahead of her shoulder joints, under her neck joint), on skin further out from her middle than `gate` (her units);
   * `z0`: her shoulder joints' depth, the drawing's origin along z. A camisole's is cut off besides by a line of its own
   * (`CAMI_FALL`): nothing of it over `startY` out to `startX`, lower by `slope` for each unit further out.
   */
  readonly side: { readonly z0: number; readonly gate: number; readonly curve: readonly P2[]; readonly startX: number; readonly startY: number; readonly slope: number };
  readonly front: 'neck' | 'straight' | 'collar'; readonly back: 'scoop' | 'racer' | 'straight' | 'collar';
  readonly backY: number; readonly racerX: number; readonly racerY: number; readonly sag: number; readonly corner: number; readonly collarY: number;
}

/** Whether a template's top is drawn this way: a shirt with a level hem and a neck opening (no straps, no straight top edge, no lower part of its own). */
export function isCutTop(p: Pick<CoverageParams, 'hemFront' | 'strap' | 'topFront' | 'riseFront' | 'length' | 'neckFront' | 'top'>): boolean {
  // (a kind of its own -- the outlines and the crop tee -- is drawn whatever else a look saved before said of it)
  if (p.top && (p.top === 'cropTee' || p.top in TOP_OUTLINES)) return true;
  return p.hemFront !== null && p.neckFront !== null && p.length !== null && !(p.strap > 0) && p.topFront === null && p.riseFront === null;
}

/**
 * A template's cut on her: its style and its NECKLINE slider (`neckFront`, on her trunk: 0 her hip joints, 1 the base
 * of her neck) give the rim, its SLEEVE (0 her shoulder joint, 1 her wrist) the sleeves' ends, `hemTrunk` (her hem on
 * her trunk) the hem.
 */
export function topCutSpec(p: Pick<CoverageParams, 'neckFront' | 'neckStyle' | 'sleeve'> & { readonly band?: Partial<TopBands> | null; readonly top?: CutTopKind | null }, frame: TopFrame, hemTrunk: number | null): TopCutSpec {
  if (p.top && p.top in TOP_OUTLINES) return outlineSpec(p, p.top as TopOutlineKind, frame, hemTrunk);
  const style: NeckStyle = (p.neckStyle in NECK_STYLES ? p.neckStyle : 'crew') as NeckStyle, S = NECK_STYLES[style], U = frame.unitsPerMetre;
  const trunk = frame.neckY - frame.hipY, dipY = frame.hipY + (p.neckFront ?? 1) * trunk;
  // a crew taken lower than a crew opens a little wider as it goes (it never takes her shoulders: Joshua, 2026-10-23)
  const deeper = style === 'crew' ? smoothstep(0, 0.07 * U, frame.neckY - S.depth * U - dipY) : 0;
  const half = (S.half + 0.012 * deeper) * U;
  const armLength = (frame.arms[0].length + frame.arms[1].length) / 2;
  return {
    style, half, dipY: Math.min(dipY, ridgeAt(frame, half) - 0.004 * U),
    sleeve: p.sleeve >= -0.04 ? p.sleeve * armLength : -U,
    hemY: hemTrunk === null ? -Infinity : frame.hipY + hemTrunk * trunk,
    bands: { neck: (p.band?.neck ?? TEE_BANDS.neck) * U, sleeve: (p.band?.sleeve ?? TEE_BANDS.sleeve) * U, hem: (p.band?.hem ?? TEE_BANDS.hem) * U },
  };
}
/** An outline's spec on her: its own numbers, its NECKLINE (the front's depth, or a camisole's top edge) and its hem; no sleeves. */
function outlineSpec(p: Pick<CoverageParams, 'neckFront'> & { readonly band?: Partial<TopBands> | null }, kind: TopOutlineKind, frame: TopFrame, hemTrunk: number | null): TopCutSpec {
  const O = TOP_OUTLINES[kind] as unknown as Readonly<Record<string, number>> & { readonly neck: NeckStyle; readonly front: string; readonly back: string }, U = frame.unitsPerMetre;
  const n = (k: string) => (O[k] ?? 0) * U;
  const trunk = frame.neckY - frame.hipY, half = O.strapIn * U;
  const dipY = Math.min(frame.hipY + (p.neckFront ?? 1 - O.depth * U / trunk) * trunk, ridgeAt(frame, half) - 0.004 * U);
  const bound = (p.band?.neck ?? OUTLINE_BANDS.neck) * U, cami = kind === 'camisole';
  return {
    style: O.neck, half, dipY, sleeve: -U,
    hemY: hemTrunk === null ? -Infinity : frame.hipY + hemTrunk * trunk,
    bands: { neck: bound, sleeve: 0, hem: (p.band?.hem ?? OUTLINE_BANDS.hem) * U },
    sideBlend: OUTLINE_SIDE_BLEND * U,
    outline: {
      kind, strapIn: half, strapOut: O.strapOut * U, armX: O.armX * U, armY: frame.neckY - O.armDrop * U, frontY: frame.neckY - O.armDrop * U, limit: O.armLimit * U,
      side: {
        z0: shoulderDepth(frame), gate: armscyeGate(O.strapOut * U, bound, O.armLimit * U, U), curve: ARMSCYES[kind],
        // (a camisole's bodice begins at its peak: nothing over it but its strap)
        startX: O.strapOut * U, startY: cami ? camiPeakY(dipY, ridgeAt(frame, O.strapOut * U), U) : Infinity, slope: cami ? CAMI_FALL.slope : 0,
      },
      front: O.front as TopOutlineSpec['front'], back: O.back as TopOutlineSpec['back'],
      backY: frame.neckY - n('backDrop'), racerX: n('racerX'), racerY: frame.neckY - n('racerDrop'), sag: n('sag'), corner: n('corner'), collarY: frame.neckY + n('collar'),
    },
  };
}
/**
 * GAME TUNING (metres): how far either side of her middle depth an outline's two drawings are blended. Each drawing keeps
 * its distances only to `TOP_CUT.range` (3 cm), and where its two lines are more than two ranges apart both are held
 * there, so the blend crosses zero at its own middle: a step. Blended 4 cm either side, the edge passes from her
 * front's line to her back's as one slope. Under her arm both drawings' feet are at one height (18.3 cm under her neck
 * joint) and the armscye's foot is the edge (17.9): MEASURED along her side's skin, `tests/topOutline.test.ts`, no turn
 * over 15 degrees in 3 mm. (2026-11-14, her front's armhole a sweep of its own to a foot 14.0 cm under and the two
 * blended down her side: 23 to 29 degrees; at a blend of 2.5 cm that slope fell 4.5 cm over 1.6.) A wider gap between
 * two lines wants a wider `TOP_CUT.range` (the shader's).
 */
export const OUTLINE_SIDE_BLEND = 0.04;
/** GAME TUNING (metres): an outline's bound edge -- round its neck, its straps and its armholes alike -- and no band at its hem unless its template says. */
export const OUTLINE_BANDS: TopBands = Object.freeze({ neck: 0.01, sleeve: 0, hem: 0 });
/** A style's NECKLINE setting until the slider moves it: its lowest point on her trunk (0 her hip joints, 1 the base of her neck). */
export function neckDefault(style: NeckStyle, frame: Pick<TopFrame, 'neckY' | 'hipY' | 'unitsPerMetre'>): number {
  return 1 - (NECK_STYLES[style].depth * frame.unitsPerMetre) / (frame.neckY - frame.hipY);
}

type P2 = readonly [number, number];
/** A corner of a path turned into an arc of radius `r` (a list of points along it), or the corner itself when it cannot be. */
function fillet(a: P2, corner: P2, b: P2, r: number, step: number): P2[] {
  const ux = a[0] - corner[0], uy = a[1] - corner[1], vx = b[0] - corner[0], vy = b[1] - corner[1];
  const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
  if (!(lu > 1e-9 && lv > 1e-9) || !(r > 0)) return [corner];
  const cos = (ux * vx + uy * vy) / (lu * lv), half = Math.acos(Math.max(-1, Math.min(1, cos))) / 2;
  if (!(half > 1e-3) || Math.abs(Math.PI / 2 - half) < 1e-3) return [corner];
  const reach = Math.min(r / Math.tan(half), lu * 0.9, lv * 0.9), rr = reach * Math.tan(half);
  const p0: P2 = [corner[0] + (ux / lu) * reach, corner[1] + (uy / lu) * reach], p1: P2 = [corner[0] + (vx / lv) * reach, corner[1] + (vy / lv) * reach];
  // the arc's centre lies on the corner's bisector
  const bx = ux / lu + vx / lv, by = uy / lu + vy / lv, bl = Math.hypot(bx, by) || 1, dist = rr / Math.sin(half);
  const cx = corner[0] + (bx / bl) * dist, cy = corner[1] + (by / bl) * dist;
  let a0 = Math.atan2(p0[1] - cy, p0[0] - cx), a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
  while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
  while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
  // (an even count: a corner that is the same either side has its middle point on its own middle line)
  const n = 2 * Math.max(1, Math.ceil((Math.abs(a1 - a0) * rr) / step / 2)), out: P2[] = [];
  for (let k = 0; k <= n; k++) { const t = a0 + ((a1 - a0) * k) / n; out.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]); }
  return out;
}

/**
 * A drawing's rim, as a path across her from its left side point to its right (x out from her middle, y her height,
 * her units): `front` her front's, else her back's. Its ends are the side points themselves.
 */
export function rimPath(spec: TopCutSpec, frame: TopFrame, front: boolean): P2[] {
  const S = NECK_STYLES[spec.style], U = frame.unitsPerMetre, w = spec.half, top = ridgeAt(frame, w), step = 0.0015 * U;
  const dip = front ? spec.dipY : top - S.back * U, h = Math.max(1e-6, top - dip);
  const half: P2[] = [];
  if (front && spec.style === 'v') {
    const V = NECK_STYLES.v, r = Math.min(V.turn * U, h * 0.6), rt = V.tip * U;
    // each side runs straight from the tip toward a corner under its side point, placed so that the turn there (radius
    // `turn`) ends at the side point itself, running straight up; and the tip is rounded so its lowest point is the dip.
    // The two depend on each other through the sides' lean off her middle line: worked round until they agree
    let yc = top - r, tipY = dip;
    for (let k = 0; k < 16; k++) {
      const lean = Math.atan2(w, Math.max(1e-6, yc - tipY));
      tipY = dip - (rt / Math.sin(lean) - rt);
      yc = top - r / Math.tan((Math.PI - lean) / 2);
    }
    const tip: P2 = [0, tipY];
    const point = fillet([-w, yc], tip, [w, yc], rt, step).filter((p) => p[0] >= -1e-9).map((p): P2 => [Math.max(0, p[0]), p[1]]);
    const turn = fillet(tip, [w, yc], [w, top + r * 4], r, step);
    half.push(...point, ...turn);
    half[half.length - 1] = [w, top];
  } else if (front && spec.style === 'square') {
    const Q = NECK_STYLES.square;
    half.push([0, dip], ...fillet([0, dip], [w, dip], [w, top], Q.corner * U, step), [w, top]);
  } else {
    // a half ellipse, or squarer: from its lowest point at her middle round and straight up into the side point
    const n = front ? S.power || 2 : 2, count = Math.max(8, Math.ceil(((Math.PI / 2) * Math.max(w, h)) / step));
    for (let k = 0; k <= count; k++) { const t = ((Math.PI / 2) * k) / count; half.push([w * Math.sin(t) ** (2 / n), top - h * Math.cos(t) ** (2 / n)]); }
  }
  const out: P2[] = [];
  for (let k = half.length - 1; k >= 1; k--) out.push([-half[k][0], half[k][1]]);
  if (half[0][0] > 1e-9) out.push([-half[0][0], half[0][1]]);
  out.push(...half);
  return out;
}

/**
 * One drawing as distances: for every cell of the picture, how far its middle is inside the garment (her units; + in
 * the garment, - in the neck opening or above the ceiling), within +-`range`. The opening is all that is above the
 * rim between its side points, above the lines straight up from them, or above the ceiling.
 */
export function drawCut(spec: TopCutSpec, frame: TopFrame, front: boolean): Float32Array {
  if (spec.outline) return pathDistances(outlinePath(spec, frame, front), frame);
  const { cols, cell } = frame, U = frame.unitsPerMetre, range = TOP_CUT.range * U;
  const rim = rimPath(spec, frame, front), ceil = frame.neckY + TOP_CUT.ceiling * U, far = frame.x0 + cols * cell + range * 4;
  const w = spec.half, top = rim[rim.length - 1][1];
  // the opening's edge, left to right: the ceiling, down the line over the left side point, the rim, up, the ceiling
  const path: P2[] = [[frame.x0 - range * 4, ceil], [frame.mid - w, ceil], ...rim.map((p): P2 => [frame.mid + p[0], p[1]]), [frame.mid + w, ceil], [far, ceil]];
  if (ceil <= top) { path.splice(1, 1); path.splice(path.length - 2, 1); }
  return pathDistances(path, frame);
}
/** A path's distances: every cell's distance to it within the range, minus where an odd number of its pieces lie under the cell (the opening). */
function pathDistances(path: readonly P2[], frame: TopFrame): Float32Array {
  const { cols, rows, cell, x0, y0 } = frame, range = TOP_CUT.range * frame.unitsPerMetre;
  const dist = new Float32Array(cols * rows).fill(range);
  for (let s = 0; s + 1 < path.length; s++) {
    const ax = path[s][0], ay = path[s][1], bx = path[s + 1][0], by = path[s + 1][1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - range - x0) / cell)), i1 = Math.min(cols - 1, Math.ceil((Math.max(ax, bx) + range - x0) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - range - y0) / cell)), j1 = Math.min(rows - 1, Math.ceil((Math.max(ay, by) + range - y0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + (i + 0.5) * cell, py = y0 + (j + 0.5) * cell;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0, d = Math.hypot(px - ax - dx * t, py - ay - dy * t), k = j * cols + i;
      if (d < dist[k]) dist[k] = d;
    }
  }
  // which side: in the opening when above the path -- an odd number of its pieces lie under the cell's middle
  for (let i = 0; i < cols; i++) {
    const px = x0 + (i + 0.5) * cell, under: number[] = [];
    for (let s = 0; s + 1 < path.length; s++) {
      const ax = path[s][0], bx = path[s + 1][0];
      if (ax === bx || px < Math.min(ax, bx) || px >= Math.max(ax, bx)) continue;
      under.push(path[s][1] + ((path[s + 1][1] - path[s][1]) * (px - ax)) / (bx - ax));
    }
    for (let j = 0; j < rows; j++) {
      const py = y0 + (j + 0.5) * cell;
      let below = 0;
      for (const y of under) if (y < py) below++;
      if (below % 2 === 1) dist[j * cols + i] = -dist[j * cols + i];
    }
  }
  return dist;
}

/**
 * AN OUTLINE's drawing as one path, left to right (her units): from far out at her left at the armhole's foot, in round
 * her side and up her left armhole to her strap's outer edge on her ridge, straight up to the ceiling and across the
 * strap, down its inner edge into the neck opening (or the camisole's top edge, or round the mock neck's collar), and
 * the same mirrored out to her right. Above it is the opening. Everything outside the straps' outer edges is the same
 * in both drawings, so they agree over her shoulders and down her sides.
 */
export function outlinePath(spec: TopCutSpec, frame: TopFrame, front: boolean): P2[] {
  const O = spec.outline!, U = frame.unitsPerMetre, step = 0.0015 * U, ceil = frame.neckY + TOP_CUT.ceiling * U, far = frame.x0 + frame.cols * frame.cell + TOP_CUT.range * U * 4;
  const xi = O.strapIn, xo = O.strapOut, ti = ridgeAt(frame, xi), to = ridgeAt(frame, xo), how = front ? O.front : O.back;
  const half: P2[] = [];
  // the armhole's foot: the front's under her front's armpit (or a camisole's top edge, if that is lower), the back's
  const foot = front ? (how === 'straight' ? Math.min(O.frontY, spec.dipY) : O.frontY) : O.armY;
  // the middle: from her middle out to the strap's inner edge on her ridge
  if (how === 'neck' || how === 'scoop' || how === 'racer') {
    const rim = rimPath(how === 'neck' ? spec : { ...spec, style: 'crew', dipY: Math.min(O.backY, ti - 0.004 * U) }, frame, true);
    half.push(...rim.slice(Math.floor(rim.length / 2)).map((p): P2 => [Math.max(0, p[0]), p[1]]));
  } else if (how === 'straight') {
    // level across her, `sag` lower at her middle, turned up into the strap round `corner`
    const y = spec.dipY, k = 0.8, n = Math.max(8, Math.ceil((xi * k) / step));
    for (let j = 0; j <= n; j++) { const x = (xi * k * j) / n; half.push([x, y - O.sag * (1 - (x / xi) ** 2)]); }
    half.push(...fillet(half[half.length - 1], [xi, y], [xi, ti], O.corner, step));
  }
  if (how === 'collar') {
    // level round her neck, turned down at the armhole's top into its line
    const n = Math.max(8, Math.ceil((xo * 0.8) / step));
    for (let j = 0; j <= n; j++) half.push([(xo * 0.8 * j) / n, O.collarY]);
    half.push(...fillet(half[half.length - 1], [xo, O.collarY], [xo, to], O.corner, step));
  } else {
    // the strap: its inner edge up to the ceiling, across, and its outer edge down to her ridge
    half.push([xi, ti], [xi, ceil], [xo, ceil]);
  }
  half.push([xo, to]);
  if (!front) {
    // behind: the strap's outer edge curving in down her back (to the racer's panel, or for any other back to `BACK_ARM`,
    // inside the row her arm's skin joins her back by), and out again to the armhole's foot -- two cubics, upright at
    // her ridge and where they meet, level at the foot
    const racer = how === 'racer', rx = racer ? O.racerX : Math.min(xo, BACK_ARM.x * U), ry = racer ? O.racerY : frame.neckY - BACK_ARM.drop * U;
    const a = (to - ry) * 0.55, b = (ry - O.armY) * 0.6;
    half.push(...cubic([xo, to], [xo, to - a], [rx, ry + a], [rx, ry], step).slice(1));
    // (a racer's comes out from her spine: its level run is begun further in, or seen on her back as it turns to her side
    // it bent 41 degrees in 3 mm; MEASURED)
    half.push(...cubic([rx, ry], [rx, ry - b], [O.armX - (O.armX - rx) * (racer ? 0.75 : 0.5), O.armY], [O.armX, O.armY], step).slice(1));
  } else if (how === 'straight') {
    // a camisole's front: from the strap's foot on its top edge, straight down and out to the front's turn under her
    // armpit, and out level; an edge set at or below the foot runs straight out level
    const y = spec.dipY, r = O.corner, L = O.limit;
    // the strap's outer edge comes down to a PEAK over the top edge, and from there the bodice's edge runs straight out
    // and down to the front's limit and down it (`FRONT_ARM`, `CAMI_FALL`); an edge set at or below the foot runs straight out level
    const peak: P2 = [xo, camiPeakY(y, to, U)], turn: P2 = [L, peak[1] - Math.max(0, L - xo) * CAMI_FALL.slope];
    if (y - foot > 0.008 * U && turn[1] - foot > 0.03 * U) half.push(...fillet([xo, to], peak, turn, r * 0.75, step), ...fillet(peak, turn, [L, foot], FRONT_ARM.round * U, step), ...fillet(turn, [L, foot], [O.armX, foot], FRONT_ARM.turn * U, step), [O.armX, foot]);
    else half.push(...fillet([xo, to], [xo, foot], [O.armX, foot], r, step), [O.armX, foot]);
  } else {
    // in front the LIMIT of the armhole (`FRONT_ARM`): from the strap's outer edge straight to the outline's own limit
    // under her collarbone, then straight down to the foot and out. What is covered outside it is the armscye's to say
    // (`ARMSCYES`)
    const L = O.limit, turn: P2 = [L, frame.neckY - FRONT_ARM.drop * U];
    half.push(...fillet([xo, to], turn, [L, foot], FRONT_ARM.round * U, step), ...fillet(turn, [L, foot], [O.armX, foot], FRONT_ARM.turn * U, step), [O.armX, foot]);
  }
  const mid = frame.mid, out: P2[] = [[frame.x0 - TOP_CUT.range * U * 4, foot]];
  for (let k = half.length - 1; k >= 1; k--) out.push([mid - half[k][0], half[k][1]]);
  if (half[0][0] > 1e-9) out.push([mid - half[0][0], half[0][1]]);
  for (const p of half) out.push([mid + p[0], p[1]]);
  out.push([far, foot]);
  return out;
}
/**
 * THE ARMHOLE'S SIDE PROFILE IS HIS DRAWING (Joshua, 2026-11-14, on the pictures of the four outlines from her side and
 * her three-quarter, his green line over each: "Update to the side profile… make it smoother…"; "basically, the side
 * cutout profile matches the side profile of the breasts"; before that, of the tank's front: "make the side a smoother
 * curve… it looks like it changes shape in the curve… like these two images… round the sides of the breasts"; the two
 * were kept in `docs/reference/tops/` while it was built, to v0.9.27 -- git, 6e0b67b).
 *
 * An armhole is an opening round her arm, and seen from her SIDE it is one smooth C: down from the strap, forward round
 * the side of her bust, and back under her arm. Her front's drawing can not say that: the side of her bust and the root
 * of her arm share a place seen from her front (13 cm out, 5 cm apart in depth), and her skin there faces her side -- a
 * line drawn from her front lands on it anywhere. So an outline has a THIRD drawing, of her side: the C, in depth and
 * height. Skin further out from her middle than `gate` is COVERED where it lies in front of the C or under it, as well
 * as where her front's and her back's drawings cover it (her front's is a limit only, `FRONT_ARM`). On her body the
 * edge is where her skin crosses the C: it wraps the side of whatever bust she has (a cut is looked up about her frame;
 * a fuller bust stands further in front of the C, and more of its side is covered).
 *
 * `ARMSCYES`: each outline's C, as points [ahead of her shoulder joints, under her neck joint] (metres) from over its
 * strap to level under her arm; the line is drawn smoothly through them (`through`) and runs straight up from its first
 * and level back from its last. EACH IS HIS OWN LINE FOR THAT TOP, CARRIED TO HER: his two lines (her side, square on;
 * her three-quarter, each point of it found on her skin) are 1 to 2.5 cm apart in depth where they are furthest, and
 * the C is between them -- most forward 12.7 cm ahead of her shoulder joints for the tank (1.1 cm in front of her rest
 * frame's z = 0, 12.5 cm under her neck joint), 11.8 for the sports bra, 13.4 for the camisole (10.5 cm under: its
 * bodice's edge comes forward over the first of her bust) and 9.9 for the mock neck (a high neck's armhole keeps close
 * to her arm), all level 17.9 cm under from about 4 cm ahead of them back.
 *
 * WHERE THE C AND THE LIMIT MEET, THEY MEET ON HER SKIN. Her front's limit runs straight down her from the strap
 * (`armLimit`), and each C begins IN FRONT of her skin along that line, comes down onto it where her bust begins (the
 * tank's 7.5 cm under her neck joint, the sports bra's 8, the mock neck's 5 to 6.5; a camisole's at its peak), and
 * from there runs behind it: above, her front's limit is the edge; below, the C -- one line (`tests/topOutline.test.ts`:
 * seen from her side it goes forward all the way down to its most forward point and back from there, and it turns no
 * more than 16 degrees in 4 mm from her front, her three-quarter or her side; a camisole's 25, at its peak). MEASURED
 * 2026-11-14 on her rest skin with ONE C for every top, begun behind her skin, and the limit 11.3 cm out: from 4.5 to
 * 9 cm under her neck joint the limit was the edge, down the front wall of her armpit where her skin's depth changes
 * 3 cm for a centimetre out -- the edge ran up the first of her bust (2.4 cm forward in 1.5 cm of height) and turned
 * onto the C: a kink seen from her side and her three-quarter, and a step of 3 mm where the two first met.
 * `feather`: the drawing comes in over this much either side of `gate` (metres).
 * `join`: where the armscye's edge and her front's or her back's cross, the corner between them is rounded over this
 * much (`smoothMax`). A rounding holds the edge off both lines where they meet -- a quarter of it -- and down the first
 * of her bust, where her skin is steep, a millimetre out is three back: at 12 mm the edge stood 4 mm behind the C from
 * 7.5 to 8 cm under her neck joint and came back to it by 9.5 (a hump seen from her side); at 5 mm, 1.7 and 1.3 mm.
 * GAME TUNING but the curves, which are his.
 */
export const ARMSCYE = Object.freeze({ feather: 0.002, join: 0.005 });
const armscye = (points: readonly (readonly [number, number])[]): readonly P2[] => Object.freeze(points.map((p): P2 => Object.freeze([p[0], p[1]] as const)));
export const ARMSCYES: Readonly<Record<TopOutlineKind, readonly P2[]>> = Object.freeze({
  tank: armscye([[0.082, 0.04], [0.0855, 0.045], [0.0885, 0.05], [0.0907, 0.055], [0.0927, 0.06], [0.0939, 0.065], [0.095, 0.07], [0.0958, 0.0725], [0.097, 0.075], [0.1015, 0.08], [0.1062, 0.085], [0.1107, 0.09], [0.1149, 0.095], [0.1186, 0.1], [0.1216, 0.105], [0.124, 0.11], [0.1257, 0.115], [0.1267, 0.12], [0.1272, 0.125], [0.127, 0.13], [0.126, 0.135], [0.1242, 0.14], [0.1204, 0.145], [0.1147, 0.15], [0.1067, 0.155], [0.0972, 0.16], [0.0862, 0.165], [0.0732, 0.17], [0.0572, 0.175], [0.0462, 0.1778], [0.0342, 0.179], [0.0202, 0.179]]),
  sportsBra: armscye([[0.0827, 0.045], [0.0854, 0.05], [0.0878, 0.055], [0.0894, 0.06], [0.0906, 0.065], [0.0916, 0.07], [0.0925, 0.075], [0.0934, 0.0775], [0.0948, 0.08], [0.0988, 0.085], [0.1026, 0.09], [0.106, 0.095], [0.109, 0.1], [0.1116, 0.105], [0.1138, 0.11], [0.1155, 0.115], [0.1167, 0.12], [0.1174, 0.125], [0.1176, 0.13], [0.117, 0.135], [0.1157, 0.14], [0.1135, 0.145], [0.11, 0.15], [0.1037, 0.155], [0.0952, 0.16], [0.0852, 0.165], [0.0742, 0.17], [0.0602, 0.175], [0.0492, 0.1778], [0.0372, 0.179], [0.0232, 0.179]]),
  camisole: armscye([[0.1082, 0.066], [0.1083, 0.069], [0.1086, 0.0715], [0.1092, 0.0735], [0.1102, 0.0755], [0.1116, 0.0775], [0.1137, 0.08], [0.1198, 0.085], [0.1254, 0.09], [0.13, 0.095], [0.1328, 0.1], [0.1338, 0.105], [0.1335, 0.11], [0.1328, 0.115], [0.1319, 0.12], [0.1308, 0.125], [0.1294, 0.13], [0.1274, 0.135], [0.1246, 0.14], [0.1204, 0.145], [0.1144, 0.15], [0.1067, 0.155], [0.0972, 0.16], [0.0862, 0.165], [0.0742, 0.17], [0.0602, 0.175], [0.0492, 0.1778], [0.0372, 0.179], [0.0232, 0.179]]),
  mockNeck: armscye([[0.0702, 0.03], [0.0742, 0.035], [0.0785, 0.04], [0.0815, 0.045], [0.084, 0.05], [0.0868, 0.055], [0.0894, 0.06], [0.0913, 0.065], [0.0928, 0.07], [0.094, 0.075], [0.095, 0.08], [0.0959, 0.085], [0.0968, 0.09], [0.0976, 0.095], [0.0983, 0.1], [0.0988, 0.105], [0.0991, 0.11], [0.0991, 0.115], [0.0986, 0.12], [0.0973, 0.125], [0.0953, 0.13], [0.0923, 0.135], [0.0883, 0.14], [0.0836, 0.145], [0.0786, 0.15], [0.0736, 0.155], [0.0686, 0.16], [0.0636, 0.165], [0.0582, 0.17], [0.0512, 0.175], [0.0442, 0.1778], [0.0342, 0.179], [0.0202, 0.179]]),
});
/**
 * How far out from her middle an armscye's drawing comes in (her units): at the strap's outer edge, and never nearer her
 * front's limit than a bound edge is wide and a little more. Her front's limit is an edge of her front's drawing, and a
 * band is drawn along every edge by its distance: where the armscye covers her past the limit, the limit is no edge of
 * the top, and the armscye has to have come in before her front's distance falls to a band's width. MEASURED
 * 2026-11-14, the tank with it at its strap's outer edge (10.6 cm out, the limit then 11.3): a line of the bound edge's
 * shade down the front of each breast from the strap to her under-bust, 10.3 to 10.4 cm out.
 */
export const armscyeGate = (strapOut: number, band: number, limit: number, U: number): number => Math.min(strapOut, limit - band - (ARMSCYE.feather + 0.004) * U);
/** Her shoulder joints' depth as she faces (her units): where an armscye's drawing is hung along z. */
export const shoulderDepth = (frame: TopFrame): number => ((frame.arms[0].from[2] + frame.arms[1].from[2]) / 2) * frame.facing;
/**
 * An armscye as a path in her side's drawing (across: `frame.mid` + her units ahead of her shoulder joints; up: her
 * height): from over her head straight down to the C's first point, through its points, and from its last level back to
 * far behind her. Above the path is the opening (`pathDistances`): behind the C and over its foot.
 */
export function armscyePath(frame: TopFrame, curve: readonly P2[]): P2[] {
  const U = frame.unitsPerMetre, at = (p: P2): P2 => [frame.mid + p[0] * U, frame.neckY - p[1] * U];
  const c = curve.map(at), first = c[0], last = c[c.length - 1], lead = 0.03 * U;
  return [[first[0], frame.neckY + (TOP_CUT.above + 0.05) * U], ...through(c, [first[0], first[1] + lead], [last[0] - lead, last[1]], 0.0015 * U), [frame.x0 - TOP_CUT.range * U * 4, last[1]]];
}
/**
 * A smooth line through points, `step` apart or so: through every one of them, never further from the straight line
 * between two than they are apart (a centripetal Catmull-Rom spline). It leaves its first point as if it had come from
 * `from`, and reaches its last as if it went on to `to`.
 */
function through(points: readonly P2[], from: P2, to: P2, step: number): P2[] {
  const P = [from, ...points, to], out: P2[] = [points[0]], root = (a: P2, b: P2) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-9;
  for (let i = 1; i + 2 < P.length; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2], t1 = root(p0, p1), t2 = t1 + root(p1, p2), t3 = t2 + root(p2, p3);
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = t1 + ((t2 - t1) * k) / n, mix = (a: P2, b: P2, ta: number, tb: number): P2 => { const f = (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; };
      const a1 = mix(p0, p1, 0, t1), a2 = mix(p1, p2, t1, t2), a3 = mix(p2, p3, t2, t3);
      out.push(mix(mix(a1, a2, 0, t2), mix(a2, a3, t1, t3), t1, t2));
    }
  }
  return out;
}
/**
 * HER FRONT'S LIMIT OF AN ARMHOLE: from the strap's outer edge on her ridge straight to the outline's `armLimit` out
 * from her middle `drop` under her neck joint, round `round` into a straight run down to the foot (the back's), and round
 * `turn` out level. The edge a person sees is this line down to where her bust begins, and the armscye's from there
 * (`ARMSCYES`); on a small or flat bust, whose skin lies behind the C, it is this line all the way: a tank's plain
 * armhole. `armLimit` by outline (`TOP_OUTLINES`; GAME TUNING to his lines): the tank's is its strap's own outer edge,
 * straight down (10.6 cm); the sports bra's 11.1, the mock neck's 10.9, as far out as his lines keep their straps'
 * edges; the camisole's 11.3, which its bodice's edge runs out to from its peak, inside its armscye.
 * MEASURED 2026-11-14 on her rest skin: her arm's skin joins her front 13 to 14 cm out from 5 to 11 cm under her neck
 * joint, its apex 12.6 cm out 11 cm under; her side is 13.7 cm out 14 cm under and 12.1 to 12.5 from 18 under: every
 * limit is inside all of that, so her side's skin is the armscye's to say.
 * BEFORE, the same day: a quarter ellipse to a foot 20.5 cm under (the outer third of each breast bare); straight to
 * 11.8 cm out, a 12 mm turn and level 13.5 then 12.8 cm under (her bust covered, and the kink he saw from her front);
 * one sweep of 6 cm round to level 14 cm under (smooth from her front; from her side a point forward over her bust
 * and a shelf under it, which his green lines took off); and a limit 11.3 cm out for every top under one C begun
 * behind her skin (`ARMSCYES`: the kink where they met).
 */
export const FRONT_ARM = Object.freeze({ drop: 0.045, round: 0.06, turn: 0.012 });
/**
 * A CAMISOLE's bodice outside its strap (his 13: its straps meet it at two peaks): the strap's outer edge comes down
 * to a peak `rise` over the top edge. From there her front's limit runs out and down, `slope` down for each unit out,
 * to its `armLimit` and down it; and its armscye is cut off over that same line carried on. With its top edge where
 * the room opens it (10 cm under her neck joint, its peak 7.3) the line lies along the armscye's own edge for its first
 * 3 cm and over it from there (MEASURED on her rest skin: the two within 0.7 mm of one another from the peak to 9.5 cm
 * under), and the edge is the armscye's: his line, from the peak out and down round the side of her bust. With its top
 * edge taken lower, its peak is lower than the armscye begins, and the edge is that line from the peak down to the
 * armscye. GAME TUNING (metres; a slope is a number).
 */
export const CAMI_FALL = Object.freeze({ rise: 0.027, slope: 1.3 });
/** A camisole's peak's height: `rise` over its top edge `y`, and under her ridge `to` there. */
const camiPeakY = (y: number, to: number, U: number): number => Math.min(y + CAMI_FALL.rise * U, to - 0.004 * U);
/**
 * Behind, an armhole comes in to `x` out from her middle `drop` under her neck joint before it goes out to its foot:
 * the row joining her arm's skin to her back is 11.3 to 12.1 cm out from 15 to 17.3 cm under it (MEASURED, `TOP_OUTLINES`).
 * GAME TUNING inside that.
 */
export const BACK_ARM = Object.freeze({ x: 0.096, drop: 0.16 });
/** A cubic curve's points, `step` apart or so. */
function cubic(a: P2, b: P2, c: P2, d: P2, step: number): P2[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]) + Math.hypot(d[0] - c[0], d[1] - c[1]), n = Math.max(8, Math.ceil(len / step)), out: P2[] = [];
  for (let j = 0; j <= n; j++) { const t = j / n, u = 1 - t; out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); }
  return out;
}

/** A top's two drawings, ready to look up. */
/** A top's drawings, ready to look up: her front's, her back's, and for an outline her side's (its armscye, `ARMSCYE`). */
export interface TopCut { readonly spec: TopCutSpec; readonly frame: TopFrame; readonly front: Float32Array; readonly back: Float32Array; readonly side?: Float32Array | null }
export function topCut(spec: TopCutSpec, frame: TopFrame): TopCut {
  return { spec, frame, front: drawCut(spec, frame, true), back: drawCut(spec, frame, false), side: spec.outline?.side ? pathDistances(armscyePath(frame, spec.outline.side.curve), frame) : null };
}
/**
 * Her side's drawing at a place (her units; + covered): the armscye's say, come in over `ARMSCYE.feather` past `gate`;
 * -range (the opening) where it does not apply. Null for a top without.
 */
export function armscyeAt(cut: TopCut, x: number, y: number, z: number): number | null {
  const S = cut.spec.outline?.side;
  if (!S || !cut.side) return null;
  const { frame } = cut, U = frame.unitsPerMetre, f = ARMSCYE.feather * U, range = TOP_CUT.range * U;
  const out = Math.abs(x - frame.mid);
  let w = smoothstep(S.gate - f, S.gate + f, out);
  // a camisole's: nothing of it over the line its bodice falls away by from its peak
  if (S.startY < Infinity) { const start = S.startY - S.slope * Math.max(0, out - S.startX); w *= 1 - smoothstep(start - f, start + f, y); }
  return w > 0 ? -range + (cellAt(frame, cut.side, frame.mid + z * frame.facing - S.z0, y) + range) * w : -range;
}
/**
 * The larger of two distances, rounded where they are within `k` of one another: where the edges of two covers cross,
 * the corner between them is a curve of about that radius and not a kink.
 */
export const smoothMax = (a: number, b: number, k: number): number => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };

const cellAt = (frame: TopFrame, field: Float32Array, x: number, y: number): number => {
  const u = Math.max(0, Math.min(frame.cols - 1, (x - frame.x0) / frame.cell - 0.5)), v = Math.max(0, Math.min(frame.rows - 1, (y - frame.y0) / frame.cell - 0.5));
  const i = Math.min(frame.cols - 2, Math.floor(u)), j = Math.min(frame.rows - 2, Math.floor(v)), fu = u - i, fv = v - j, k = j * frame.cols + i;
  return (field[k] * (1 - fu) + field[k + 1] * fu) * (1 - fv) + (field[k + frame.cols] * (1 - fu) + field[k + frame.cols + 1] * fu) * fv;
};

/**
 * THE FLAT CUT A SLEEVE'S END IS, for a sleeve that ends `sleeve` along an arm (her units from her shoulder joint, down
 * her upper arm and on down her forearm): through the place on her arm's bones that far along, square to the bone it is
 * on -- her upper arm's or her forearm's, and within `elbowTurn` of her elbow a direction turning from the one to the
 * other. As four numbers: how far along her arm a place p is, as this cut measures it, is `p . (the first three) + the
 * fourth` (the shader's `fabricCutArm`); the sleeve covers what is under `sleeve` of that.
 */
export function sleevePlane(arm: TopArm, sleeve: number, unitsPerMetre: number): readonly [number, number, number, number] {
  const u = arm.upper, f = arm.fore, t = smoothstep(u.length - TOP_CUT.elbowTurn * unitsPerMetre, u.length + TOP_CUT.elbowTurn * unitsPerMetre, sleeve);
  const d = [u.dir[0] + (f.dir[0] - u.dir[0]) * t, u.dir[1] + (f.dir[1] - u.dir[1]) * t, u.dir[2] + (f.dir[2] - u.dir[2]) * t], l = Math.hypot(d[0], d[1], d[2]) || 1;
  const on = sleeve <= u.length ? [arm.from[0] + u.dir[0] * sleeve, arm.from[1] + u.dir[1] * sleeve, arm.from[2] + u.dir[2] * sleeve] : [arm.elbow[0] + f.dir[0] * (sleeve - u.length), arm.elbow[1] + f.dir[1] * (sleeve - u.length), arm.elbow[2] + f.dir[2] * (sleeve - u.length)];
  return [d[0] / l, d[1] / l, d[2] / l, sleeve - (d[0] * on[0] + d[1] * on[1] + d[2] * on[2]) / l];
}
/**
 * How far a place is along an arm from her shoulder joint (her units), on the arm of its own side of her, as the cut of
 * a sleeve ending `sleeve` along it measures it (`sleevePlane`).
 */
export function alongArm(frame: TopFrame, x: number, y: number, z: number, sleeve = 0): number {
  const p = sleevePlane(x >= frame.mid ? frame.arms[0] : frame.arms[1], sleeve, frame.unitsPerMetre);
  return x * p[0] + y * p[1] + z * p[2] + p[3];
}

/** The drawings' say at a place: how far inside the neck opening's rim it is (her units), Infinity when it is held at their range. */
function neckAt(cut: TopCut, x: number, y: number, z: number): number {
  const { frame } = cut, U = frame.unitsPerMetre;
  const blend = cut.spec.sideBlend ?? TOP_CUT.sideBlend * U, side = smoothstep(-blend, blend, z * frame.facing - midDepthAt(frame, x, y));
  let d = cellAt(frame, cut.back, x, y) * (1 - side) + cellAt(frame, cut.front, x, y) * side;
  // an outline's armscye: what her side's drawing covers is covered, whatever her front's and her back's say
  const arm = armscyeAt(cut, x, y, z);
  if (arm !== null) d = smoothMax(d, arm, ARMSCYE.join * U);
  return d >= 0.98 * TOP_CUT.range * U ? Infinity : d;
}
/**
 * How far inside the garment a place on her rest skin is (her units; + inside), as the shader works it out for a
 * pixel: the drawings' say by the place's depth, and the sleeve's end on her arm's skin (`armShare` 1) or the hem on
 * the rest of her (0).
 */
export function cutAt(cut: TopCut, x: number, y: number, z: number, armShare: number): number {
  const { frame, spec } = cut;
  const neck = neckAt(cut, x, y, z);
  const hem = spec.hemY === -Infinity ? Infinity : y - spec.hemY;
  const sleeve = spec.sleeve - alongArm(frame, x, y, z, spec.sleeve);
  const a = armSide(armShare);
  return Math.min(neck, hem * (1 - a) + sleeve * a);
}
/**
 * Her arm's skin or not, from `armShare` blended across a triangle: one or the other but in the middle of the one row
 * of her triangles that joins the two (round her shoulder and through her armpit), where a sleeved top's sleeve and
 * hem both have her covered.
 */
export const armSide = (armShare: number): number => smoothstep(0.4, 0.6, armShare);
/** As `cutAt`, with which edge is nearest: for telling a band's own width (0 neck, 1 sleeve, 2 hem). */
export function cutEdgeAt(cut: TopCut, x: number, y: number, z: number, armShare: number): { readonly distance: number; readonly edge: 0 | 1 | 2 } {
  const { frame, spec } = cut;
  const neck = neckAt(cut, x, y, z);
  const a = armSide(armShare), limb = (spec.hemY === -Infinity ? Infinity : y - spec.hemY) * (1 - a) + (spec.sleeve - alongArm(frame, x, y, z, spec.sleeve)) * a;
  return neck <= limb ? { distance: neck, edge: 0 } : { distance: limb, edge: a > 0.5 ? 1 : 2 };
}

/**
 * GAME TUNING (metres): the ramp a cut's paint per vertex has either side of its line (as `paintTemplates.OUTLINE_EDGE_M`:
 * wider than her triangles, so what reads her paint per vertex -- her nipples' softening, the bridge's ends -- finds the
 * line where it is across them). The line itself is drawn from the drawings.
 */
export const CUT_VERTEX_RAMP_M = 0.015;

/** The cut's coverage at every vertex, 0 to 1 (one half on its line). `armShare`: a value a vertex, or none (no arms). */
export function cutCoverage(cut: TopCut, rest: ArrayLike<number>, armShare: ArrayLike<number> | null, out = new Float32Array(rest.length / 3)): Float32Array {
  const ramp = CUT_VERTEX_RAMP_M * cut.frame.unitsPerMetre;
  for (let v = 0; v < out.length; v++) out[v] = clamp01(0.5 + cutAt(cut, rest[v * 3], rest[v * 3 + 1], rest[v * 3 + 2], armShare ? armShare[v] : 0) / (2 * ramp));
  return out;
}

/**
 * The drawings as the shader reads them: one byte each a cell -- red her front's distance, green her back's (0..255
 * for -range..+range), blue her middle depth (0..255 for `zLo`..`zHi`), alpha full. Rows from the lowest up.
 */
export function cutPicture(cut: TopCut): Uint8Array {
  const { frame } = cut, n = frame.cols * frame.rows, range = TOP_CUT.range * frame.unitsPerMetre, out = new Uint8Array(n * 4);
  const byte = (d: number) => Math.max(0, Math.min(255, Math.round(127.5 + (d / range) * 127.5)));
  for (let k = 0; k < n; k++) {
    out[k * 4] = byte(cut.front[k]); out[k * 4 + 1] = byte(cut.back[k]);
    out[k * 4 + 2] = Math.max(0, Math.min(255, Math.round(((frame.zMid[k] - frame.zLo) / (frame.zHi - frame.zLo)) * 255)));
    // (alpha: her side's drawing, an outline's armscye -- across, her units ahead of her shoulder joints; whole without one)
    out[k * 4 + 3] = cut.side ? byte(cut.side[k]) : 255;
  }
  return out;
}
