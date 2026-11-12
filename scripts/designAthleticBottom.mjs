/**
 * HER ATHLETIC BIKINI BOTTOM, DESIGNED ON HER SKIN (Joshua, 2026-11-12, from his eight-view reference of a red bikini
 * with black edging: "map out the exact outline (edging) where it should sit on her first, then basically fill in the
 * polygon"; "remove the side string straps... more of an athletic style anyway and not all bottom use strings
 * especially elastic clothing"; and its cut from his own drawing on a mannequin of her build: "I draw how I want it to
 * look like and your shape should be close", "do the more triangle look not my rounded shape", "Here is the updated
 * look"). The references themselves are not kept in the repo.
 *
 * Nothing here changes her body file. What this writes:
 *   - `src/sarahlab/athleticBottomStencil.ts`: per vertex of her body, two values (metres) -- where the garment's EDGE
 *     is (its outline) and where its FILL begins (`BAND` inside the outline: between the two is the edging) -- each
 *     chosen so that, blended straight across each of her triangles, its zero falls where the true line crosses that
 *     triangle's sides (step 7). The paint's per-vertex coverage, and what is drawn until the field is in.
 *   - `public/models/paint/sarah-v2-athletic-bottom-field.png`: the same garment as a FIELD IN SPACE round her hips
 *     (step 8): a block of `FIELD_VOXEL_M` cells in her rest frame, each holding how far that place is inside the outline
 *     (+) or outside (-), `FIELD_RANGE_M` either way mapped onto 0..255 (128 on the line), its slices laid side by side in
 *     one grey picture. The room looks each pixel of her skin up in it at that pixel's own place on her rest skin
 *     (`fabricMaterial.ts`), so the line is drawn at the field's resolution whatever her triangles are.
 *
 * WHY A FIELD, AND NOT A VALUE PER VERTEX OR A MASK IN HER UV LAYOUT (MEASURED, 2026-11-12): her skin over her hips is
 * in triangles up to 37 mm across, far wider than a 5 mm edging, so no value per vertex draws that edging cleanly. A mask
 * in her UV layout drew it cleanly ON HER BODY FILE -- and still jagged in the room, because the room's shapes (her
 * refined 0%, her smoothed sides, her hybrid belly and her belly morphs) slide her skin's points ALONG her skin by
 * different amounts from point to point: up to 15 mm beside the outline at her default size, 11 mm more at 0%. Anything
 * that belongs to her points -- a value per vertex, a UV, her rest position -- rides those slides, and a line through a
 * big triangle bends at each of its corners. So the room corrects the place each pixel looks up by her points' SLIP
 * (`skinSlip.ts`: the part of their movement that is not smooth), and the garment itself is kept in space, where a
 * corrected place can be looked up anywhere without her UV layout's seams.
 *
 * The steps:
 *   1. HER SKIN, at rest, in metres (+y up, +z her front, +x her left), as `traceBikiniBottom.mjs` reads it; the copies of
 *      a vertex split along a texture seam welded into one point; each point's normal; her arms left out of the design's
 *      ray picks and nearest-point searches (her hands hang beside her hips).
 *   2. THE OUTLINE as three closed curves on her skin: the waistband round her, and the two leg openings. Each is laid
 *      through CONTROL POINTS (below; her left side, mirrored across her middle for her right): a point seen from in
 *      front or behind (the first skin a ray from that side meets at that x and height), or the skin nearest a guide
 *      point where no view sees it well (round her hips, under her crotch). A smooth curve (centripetal Catmull-Rom)
 *      runs through them, sampled every `STEP_M`, and is laid onto her skin (each sample moved to the nearest point of
 *      her skin, smoothed a little and laid again, `SETTLE` times).
 *   3. INSIDE: from a point on her mons, her skin is walked edge by edge without crossing a curve (an edge is crossed
 *      where a curve meets it in the plane of her skin there); what is reached is the garment. Her points within
 *      `BARRIER_M` of a curve are not walked, and every point within `FIELD_WALL_M` of one takes its side from that
 *      curve's wall (step 8) instead.
 *   4. HOW FAR: each point's distance to the nearest curve, straight (her skin is nearly flat over a few centimetres),
 *      out to `FAR_M`; + inside, - outside.
 *   5-7. THE LINES PER VERTEX (the stencil): for the outline and for its `BAND` inset, every edge of her skin the line
 *      crosses has the exact place it crosses it found (along the edge, from the distances); the values are then chosen
 *      (least squares, in millimetres: those crossings weighted `CROSS_WEIGHT` times each value's own true distance) so
 *      the straight blend puts each crossing there.
 *   8. THE FIELD: at each sample of a curve, a WALL stands on her skin: through the curve, along her skin's normal there.
 *      A cell within `FIELD_NEAR_M` of a curve holds its straight distance to the curve, + on the garment's side: which
 *      side of the curve's wall it is on within `FIELD_WALL_M` of the curve (so a place a little off her skin reads as
 *      the skin under it does), and the side her nearest skin is on beyond that. A cell farther from every curve holds
 *      the whole range, + or - by her nearest skin's side.
 *
 * Every number is labelled MEASURED, BIOLOGICAL SHAPE or GAME TUNING.
 *
 *   node scripts/designAthleticBottom.mjs        (from the repo root)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

export const BODY_GLB = 'assets-archive/models/sarah-v2-body.glb';
export const OUT_TS = 'src/sarahlab/athleticBottomStencil.ts';
export const OUT_PNG = 'public/models/paint/sarah-v2-athletic-bottom-field.png';
/** The field's path as the room asks for it (public/ is the site's root). */
export const FIELD_PATH = 'models/paint/sarah-v2-athletic-bottom-field.png';

/** MEASURED: her middle (the x of every bone of her spine). The design is drawn on her left and mirrored across it. */
export const MID_X = 0.0033;
/** GAME TUNING (metres): the black edging's width, inside the outline (his reference's piping, about 5 mm on her). */
export const BAND_M = 0.005;

/**
 * THE DESIGN (her rest, metres; x out from her middle to her left), as Joshua drew it on a mannequin of her build
 * (2026-11-12, his blue lines: "Here is the updated look"; "do the more triangle look not my rounded shape"): a small
 * TRIANGLE over her mons; a thin BAND from each of its top corners along the fold under her bump to her hip; and a V
 * across her seat -- two WINGS from her hips to a point at the foot of her cleft, their top edge arched over each
 * cheek with a notch at her middle. No panel at her sides: the band alone.
 *
 * Her shape, MEASURED in cross-sections (2026-11-12): her bump sits directly on her mons and the tops of her thighs,
 * its fold at y 0.853 at her middle rising to 0.871 (x 0.06), 0.902 (0.10) and 0.943 (0.14); at y 0.98 her hip is
 * widest at x 0.168, z -0.082; her crotch's floor is at y 0.82, between thighs that meet a centimetre below it; the
 * folds under her buttocks at y 0.82; the cleft of her seat is 3 cm deep at y 0.98 and gone by 1.02.
 *
 * His drawing carried to her (MEASURED on it, 1.72 mm of her to a pixel -- his mannequin stands 987 pixels -- from the
 * foot of its crotch and of its cleft): the triangle's top edge 3.3 cm above her crotch and 9.6 cm wide, its foot
 * 3.4 cm wide; the bands' ends at her sides 16 cm above her crotch; the wings' top edge 1.5 cm above those at its
 * highest and 4.6 cm below them at the notch; the wings' lower edges straight from her hips to the foot of her cleft.
 *
 * WAISTBAND (GAME TUNING round those): across her mons 5 mm under her bump's fold and up along it, so the edge shows
 * just under her bump (front-view picks); round her hip at 0.986 (guide points: no view sees her side well); arched
 * over each cheek to 0.996 and down into the notch at 0.955 at her middle (back-view picks). The notch is 2.3 cm higher
 * than his drawing's own proportions put it (0.932): her cleft runs 4 cm higher than his mannequin's, whose notch sits
 * at the top of its cleft; here it is still a notch, 4 cm under the arches, and all but the shallow top of her cleft
 * is covered.
 */
export const TOP_FRONT = [[0.0, 0.848], [0.04, 0.851], [0.06, 0.865], [0.08, 0.880], [0.10, 0.896], [0.12, 0.915], [0.14, 0.937], [0.152, 0.956]];
export const TOP_SIDE = [[0.160, 0.968, -0.012], [0.166, 0.979, -0.045], [0.168, 0.986, -0.082], [0.164, 0.991, -0.115], [0.152, 0.994, -0.15]];
export const TOP_BACK = [[0.135, 0.995], [0.09, 0.996], [0.05, 0.990], [0.026, 0.975], [0.008, 0.960], [0.0, 0.955]];
/**
 * GAME TUNING (metres): the side band's width along her skin. His drawing shows it as a line; this is the garment's
 * black edging either side of it (`BAND_M` each) with as much of its red between.
 */
export const SIDE_BAND_M = 0.015;
/**
 * A LEG OPENING (GAME TUNING): the band's lower edge, from behind her hip round it and down the fold to the triangle
 * (`LEG_BAND`, guide points: each `SIDE_BAND_M` from the waistband's own curve along her skin, worked out from that
 * curve, and MEASURED again when this is generated); the triangle's side, down the crease between her mons and her
 * thigh (`LEG_TRI`, front-view picks); under her crotch the skin nearest a line 1.5 cm either side of her middle -- the
 * foot of the inner wall of each thigh, her crotch's floor being 1.2 cm wide (MEASURED) -- so the strap covers her
 * opening and no more of her thighs than that (Joshua, 2026-11-12: "taper down to 3cm wide which should cover the
 * opening and avoid the paint being drawn on the upper inside thighs"); and from the foot of her cleft out and up
 * across her cheek to behind her hip in one line, a little bowed, as his drawing's wing is (`LEG_BACK`, back-view
 * picks).
 */
export const LEG_BAND = [[0.154, 0.9747, -0.1439], [0.1617, 0.9749, -0.1249], [0.1676, 0.9739, -0.1052], [0.1709, 0.9715, -0.0864], [0.1709, 0.968, -0.0651], [0.1677, 0.9635, -0.0465], [0.1633, 0.9584, -0.028], [0.1588, 0.9464, -0.0129], [0.1524, 0.9321, -0.0001], [0.143, 0.9184, 0.0113], [0.1315, 0.9054, 0.0212], [0.1184, 0.8924, 0.0294], [0.1051, 0.8808, 0.0349], [0.0892, 0.8682, 0.0382]];
export const LEG_TRI = [[0.070, 0.853], [0.052, 0.840], [0.037, 0.830], [0.025, 0.823]];
export const GUSSET = [[0.019, 0.818, 0.012], [0.015, 0.816, -0.010], [0.015, 0.815, -0.040], [0.015, 0.815, -0.070], [0.016, 0.817, -0.098]];
export const LEG_BACK = [[0.016, 0.830], [0.024, 0.853], [0.042, 0.878], [0.064, 0.903], [0.090, 0.929], [0.118, 0.953]];
/** The garment's own skin: her mons, in front of her middle at this height (a front-view pick). */
export const SEED = [0.0, 0.838];

/**
 * THE STRAP BETWEEN HER LEGS HANGS ON HER PELVIS (Joshua, 2026-11-12: "the bottom strap should taper down to 3cm wide
 * which should cover the opening and avoid the paint being drawn on the upper inside thighs as it shouldn't stretch wide
 * as the legs spread open"). Her skin between her legs is three quarters her thigh bones' (MEASURED along her crotch's
 * floor: her pelvis bone 0.15 to 0.32, her two thighs the rest), so paint that rides it spreads with her legs: the
 * gusset drew 6 to 7 cm wide reclined. A real strap does not: it hangs from the garment, and her skin moves under it.
 *
 * So round her crotch the garment is ALSO held inside a shape that stands still on her pelvis, whatever her skin there
 * does (`fabricMaterial.ts` works it out for each pixel from where her bones have carried that point, seen from her
 * pelvis bone as it stood at rest): under her crotch a strap `half` either side of her middle (3 cm across); in front of
 * `front.z` a V opening upward from the height `front.fromY` by `front.slope` metres a metre, and behind `back.z` another
 * (`back.fromY`, `back.slope`) -- the lines of the leg openings as designed, 2 to 3 mm wider, so at rest it cuts nothing
 * off the design (tests/athleticBottom); each comes in over `blend` either side of its z. It only ever takes paint
 * AWAY, and only from her skin within `zoneOuter` of the line under her crotch from `zoneA` (her mons) to `zoneB`
 * (between her cheeks) -- wholly within `zoneInner` of it, fading between.
 *
 * GAME TUNING but `mid` (her middle, MEASURED) and `bone` (her pelvis bone, the first of her skin's joints).
 */
export const STRAP = Object.freeze({
  half: 0.015, blend: 0.012,
  front: Object.freeze({ z: -0.022, fromY: 0.812, slope: 1.95 }),
  back: Object.freeze({ z: -0.085, fromY: 0.815, slope: 0.75 }),
  zoneA: [MID_X, 0.835, 0.025], zoneB: [MID_X, 0.83, -0.135], zoneInner: 0.04, zoneOuter: 0.08,
  bone: 'Bone_000',
});

/** GAME TUNING (metres): the curves' sample spacing, and how many times each is smoothed and laid back on her skin. */
export const STEP_M = 0.002, SETTLE = 3;
/** GAME TUNING (metres): how far either side of the outline distances are kept per vertex (and stored). */
export const FAR_M = 0.03;
/** GAME TUNING: the weight of a line's exact crossings against each value's own true distance (both in millimetres). */
export const CROSS_WEIGHT = 10;
/** GAME TUNING: samples along a crossed edge to find where a line crosses it. */
export const EDGE_SAMPLES = 48;
/** GAME TUNING: the per-vertex values stored in quarter-millimetre steps, as byte `ZERO_BYTE + q`, within +-FAR_M. */
export const STEP_STORE_M = 0.00025, ZERO_BYTE = 128;
/**
 * THE FIELD (GAME TUNING, metres): its cells' size (the outline bends no tighter than about a centimetre, and blending
 * between 2 mm cells places a line within a tenth of a millimetre: MEASURED against the same garment drawn in her UV
 * layout, no difference to see); the range either side of the outline it stores; how far round the curves the block
 * reaches (her points' slip is 15 mm at the most beside the outline, MEASURED, and the room looks nothing up outside the
 * block); how near a curve a cell is measured from the curve's wall; and how many slices lie across its picture.
 */
export const FIELD_VOXEL_M = 0.002, FIELD_RANGE_M = 0.016, FIELD_PAD_M = 0.04, FIELD_NEAR_M = 0.022, FIELD_COLS = 12;
/**
 * GAME TUNING (metres): within this of a curve a cell takes its SIDE from the curve's wall; farther, from her nearest
 * skin. Her skin's side is known per vertex, and a line blended across her triangles from values per vertex runs up to
 * 5.3 mm from the true one (MEASURED), so nearer than 8 mm the wall decides; farther than that her skin's own side is
 * sure, and does not depend on which way a fold of her skin faces the wall.
 */
export const FIELD_WALL_M = 0.008;
/** GAME TUNING: rounds of smoothing of her skin's normal along a curve (a crease turns it fast), and how far along her skin from a curve its inner side is asked (metres: beyond `BARRIER_M`). */
export const FRAME_SMOOTH = 4, FRAME_PROBE_M = 0.008;
/**
 * GAME TUNING (metres): her points nearer a curve than this are not walked in finding the garment's inside (step 3).
 * In a crease -- her bump on her mons -- her skin's triangles are under a millimetre across, and the walk slipped
 * over a curve between them (MEASURED 2026-11-12: with the waistband 5 mm under that fold the walk came out over
 * 68,525 of her points). Beside a curve a point's side is the curve's wall's (`curveWalls`), as a cell's of the field is.
 */
export const BARRIER_M = 0.004;
/** GAME TUNING (metres): a curve's samples with another curve nearer than this (the side band) do not vote on which side its walls face. */
export const FRAME_ALONE_M = 0.03;
/** GAME TUNING (layout only): base64 characters per line of the generated module. */
export const LINE_CHARS = 110;

// ── 1. her skin ─────────────────────────────────────────────────────────────────────────────────────────────────────
const mul = (x, y) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) o[c * 4 + r] += x[k * 4 + r] * y[c * 4 + k]; return o; };
const apply = (m, v, w) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + w * m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + w * m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + w * m[14]];

async function load(file) {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(file);
  const skin = doc.getRoot().listSkins()[0], joints = skin.listJoints();
  const T = mul(joints[0].getWorldMatrix(), Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16)));
  const body = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  if (body.getMaterial()?.getName() !== 'Material_0') throw new Error(`${file}: expected her body ('Material_0') as the first primitive`);
  const P = body.getAttribute('POSITION'), n = P.getCount(), v = [];
  const pos = new Float64Array(n * 3);
  for (let i = 0; i < n; i += 1) { P.getElement(i, v); pos.set(apply(T, v, 1), i * 3); }
  // her arms: every joint branching off her spine above her hips, off her middle (her collarbones), and all below them
  const index = new Map(joints.map((j, k) => [j, k])), arm = new Uint8Array(joints.length);
  const at = (j) => { const k = index.get(j); const ibm = skin.getInverseBindMatrices().getArray().slice(k * 16, k * 16 + 16); const inv = invert(Array.from(ibm)); return apply(T, [inv[12], inv[13], inv[14]], 1); };
  const hipsY = at(joints[0])[1];
  for (const j of joints) {
    const parent = j.getParentNode();
    if (!parent || !index.has(parent)) continue;
    const p = at(j);
    if (p[1] > hipsY + 0.3 && Math.abs(p[0] - MID_X) > 0.02 && Math.abs(at(parent)[0] - MID_X) < 0.02) {
      const stack = [j];
      while (stack.length) { const q = stack.pop(); if (index.has(q)) arm[index.get(q)] = 1; stack.push(...q.listChildren()); }
    }
  }
  const J = body.getAttribute('JOINTS_0'), W = body.getAttribute('WEIGHTS_0'), onArm = new Uint8Array(n), jv = [], wv = [];
  for (let i = 0; i < n; i += 1) { J.getElement(i, jv); W.getElement(i, wv); let b = 0; for (let k = 1; k < 4; k += 1) if (wv[k] > wv[b]) b = k; onArm[i] = arm[jv[b]]; }
  // her rest frame from her mesh's own units (the room lays her fabric by her mesh's own rest positions): one scale, no turn
  if (Math.abs(T[0] - T[5]) > 1e-6 || Math.abs(T[0] - T[10]) > 1e-6 || [1, 2, 4, 6, 8, 9].some((k) => Math.abs(T[k]) > 1e-6)) throw new Error(`${file}: her rest frame is turned or stretched from her mesh's units`);
  return { pos, idx: body.getIndices().getArray(), onArm, vertices: n, toMetres: { scale: T[0], offset: [T[12], T[13], T[14]] } };
}

function invert(a) {
  const r = new Array(16).fill(0);
  const d = a[0] * (a[5] * a[10] - a[9] * a[6]) - a[4] * (a[1] * a[10] - a[9] * a[2]) + a[8] * (a[1] * a[6] - a[5] * a[2]), id = 1 / d;
  r[0] = (a[5] * a[10] - a[9] * a[6]) * id; r[4] = -(a[4] * a[10] - a[8] * a[6]) * id; r[8] = (a[4] * a[9] - a[8] * a[5]) * id;
  r[1] = -(a[1] * a[10] - a[9] * a[2]) * id; r[5] = (a[0] * a[10] - a[8] * a[2]) * id; r[9] = -(a[0] * a[9] - a[8] * a[1]) * id;
  r[2] = (a[1] * a[6] - a[5] * a[2]) * id; r[6] = -(a[0] * a[6] - a[4] * a[2]) * id; r[10] = (a[0] * a[5] - a[4] * a[1]) * id;
  r[12] = -(r[0] * a[12] + r[4] * a[13] + r[8] * a[14]); r[13] = -(r[1] * a[12] + r[5] * a[13] + r[9] * a[14]); r[14] = -(r[2] * a[12] + r[6] * a[13] + r[10] * a[14]); r[15] = 1;
  return r;
}

/** The copies of a vertex split along a texture seam are one point (within 0.01 mm, as `traceBikiniBottom.mjs`). */
function weld(pos) {
  const n = pos.length / 3, pointOf = new Int32Array(n), byKey = new Map(), first = [];
  for (let v = 0; v < n; v += 1) {
    const key = `${Math.round(pos[v * 3] / 1e-5)},${Math.round(pos[v * 3 + 1] / 1e-5)},${Math.round(pos[v * 3 + 2] / 1e-5)}`;
    let p = byKey.get(key);
    if (p === undefined) { p = first.length; byKey.set(key, p); first.push(v); }
    pointOf[v] = p;
  }
  const at = new Float64Array(first.length * 3);
  first.forEach((v, p) => { at[p * 3] = pos[v * 3]; at[p * 3 + 1] = pos[v * 3 + 1]; at[p * 3 + 2] = pos[v * 3 + 2]; });
  return { pointOf, at, count: first.length };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const pt = (A, i) => [A[i * 3], A[i * 3 + 1], A[i * 3 + 2]];

/** A grid of cells over items with boxes, for nearest-point searches (2048 cells a side round her, far more than her). */
class Grid {
  constructor(cell) { this.cell = cell; this.cells = new Map(); }
  key(x, y, z) { return ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024); }
  add(item, lo, hi) {
    const c = this.cell;
    for (let x = Math.floor(lo[0] / c); x <= Math.floor(hi[0] / c); x += 1) for (let y = Math.floor(lo[1] / c); y <= Math.floor(hi[1] / c); y += 1) for (let z = Math.floor(lo[2] / c); z <= Math.floor(hi[2] / c); z += 1) {
      const k = this.key(x, y, z), l = this.cells.get(k);
      if (l) l.push(item); else this.cells.set(k, [item]);
    }
  }
  /** Items in the cells within `r` of p (each once). */
  near(p, r) {
    const c = this.cell, out = new Set();
    for (let x = Math.floor((p[0] - r) / c); x <= Math.floor((p[0] + r) / c); x += 1) for (let y = Math.floor((p[1] - r) / c); y <= Math.floor((p[1] + r) / c); y += 1) for (let z = Math.floor((p[2] - r) / c); z <= Math.floor((p[2] + r) / c); z += 1) {
      const l = this.cells.get(this.key(x, y, z));
      if (l) for (const i of l) out.add(i);
    }
    return out;
  }
}

/** The closest point of triangle (a, b, c) to p (Ericson, Real-Time Collision Detection 5.1.5). */
function closestOnTriangle(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, scale(ab, d1 / (d1 - d3)));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, scale(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, scale(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return add(a, add(scale(ab, vb * den), scale(ac, vc * den)));
}

/** Moller-Trumbore, either face: how far along the ray it meets the triangle, or -1. */
function meet(o, d, a, b, c) {
  const e1 = sub(b, a), e2 = sub(c, a), h = cross(d, e2), det = dot(e1, h);
  if (Math.abs(det) < 1e-14) return -1;
  const inv = 1 / det, s = sub(o, a), u = dot(s, h) * inv;
  if (u < 0 || u > 1) return -1;
  const q = cross(s, e1), v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return -1;
  return dot(e2, q) * inv;
}

function skinTools(at, tris, keep) {
  const T = [];
  for (let t = 0; t < tris.length; t += 3) if (keep[t / 3]) T.push(t);
  const grid = new Grid(0.01);
  for (const t of T) {
    const a = pt(at, tris[t]), b = pt(at, tris[t + 1]), c = pt(at, tris[t + 2]);
    grid.add(t, [0, 1, 2].map((k) => Math.min(a[k], b[k], c[k])), [0, 1, 2].map((k) => Math.max(a[k], b[k], c[k])));
  }
  /** The nearest point of her skin to p, and the triangle it is on (its place in `tris`). */
  const projectOn = (p) => {
    for (let r = 0.01; r < 0.5; r *= 2) {
      let best = null, bd = Infinity, on = -1;
      for (const t of grid.near(p, r)) {
        const q = closestOnTriangle(p, pt(at, tris[t]), pt(at, tris[t + 1]), pt(at, tris[t + 2])), d = len(sub(q, p));
        if (d < bd) { bd = d; best = q; on = t; }
      }
      if (best && bd <= r) return [best, on];
    }
    throw new Error(`no skin near ${p}`);
  };
  const project = (p) => projectOn(p)[0];
  /** The first skin a ray along `dir` meets, coming from far off through `point`. */
  const pick = (dir, point) => {
    const o = sub(point, scale(dir, 2));
    let best = Infinity;
    for (const t of T) {
      const h = meet(o, dir, pt(at, tris[t]), pt(at, tris[t + 1]), pt(at, tris[t + 2]));
      if (h > 0 && h < best) best = h;
    }
    if (best === Infinity) throw new Error(`no skin seen at ${point}`);
    return add(o, scale(dir, best));
  };
  return { project, projectOn, pick, triangles: T };
}

// ── 2. the outline ──────────────────────────────────────────────────────────────────────────────────────────────────
const FRONT = [0, 0, -1], BACK = [0, 0, 1];
const mirror = (p) => [2 * MID_X - p[0], p[1], p[2]];

function catmullClosed(ctrl, step) {
  const n = ctrl.length, out = [];
  for (let i = 0; i < n; i += 1) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    const tj = (ti, a, b) => ti + Math.sqrt(Math.max(len(sub(b, a)), 1e-9));
    const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
    const m = Math.max(2, Math.ceil(len(sub(p2, p1)) / step));
    const lerp = (a, b, ta, tb, t) => add(scale(a, (tb - t) / (tb - ta)), scale(b, (t - ta) / (tb - ta)));
    for (let k = 0; k < m; k += 1) {
      const t = t1 + ((t2 - t1) * k) / m;
      const A1 = lerp(p0, p1, t0, t1, t), A2 = lerp(p1, p2, t1, t2, t), A3 = lerp(p2, p3, t2, t3, t);
      const B1 = lerp(A1, A2, t0, t2, t), B2 = lerp(A2, A3, t1, t3, t);
      out.push(lerp(B1, B2, t1, t2, t));
    }
  }
  return out;
}

function onSkin(curve, project) {
  let c = curve.map(project);
  for (let r = 0; r < SETTLE; r += 1) {
    const n = c.length;
    c = c.map((p, i) => project(add(add(scale(c[(i - 1 + n) % n], 0.25), scale(p, 0.5)), scale(c[(i + 1) % n], 0.25))));
  }
  return c;
}

function designCurves(tools) {
  const { pick, project } = tools;
  const front = ([x, y]) => pick(FRONT, [MID_X + x, y, 0]), back = ([x, y]) => pick(BACK, [MID_X + x, y, 0]);
  const guide = ([x, y, z]) => project([MID_X + x, y, z]);
  // the waistband: her front's middle, round her left to her back's middle, and back round her right
  const left = [...TOP_FRONT.map(front), ...TOP_SIDE.map(guide), ...TOP_BACK.map(back)];
  const inner = left.slice(1, -1), top = [left[0], ...inner, left[left.length - 1], ...inner.slice().reverse().map((p) => project(mirror(p)))];
  // her left leg's opening, and her right's (mirrored, and run the other way round so both go the same way about her)
  const legL = [...LEG_BAND.map(guide), ...LEG_TRI.map(front), ...GUSSET.map(guide), ...LEG_BACK.map(back)];
  const legR = legL.map((p) => project(mirror(p))).reverse();
  return [top, legL, legR].map((ctrl) => onSkin(catmullClosed(ctrl, STEP_M), project));
}

// ── 3-4. inside, and how far ────────────────────────────────────────────────────────────────────────────────────────
function skinGraph(count, tris) {
  const seen = new Set(), ea = [], eb = [];
  for (let t = 0; t < tris.length; t += 3) for (const [a, b] of [[tris[t], tris[t + 1]], [tris[t + 1], tris[t + 2]], [tris[t + 2], tris[t]]]) {
    if (a === b) continue;
    const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * count + hi;
    if (seen.has(key)) continue;
    seen.add(key); ea.push(lo); eb.push(hi);
  }
  const start = new Int32Array(count + 1);
  for (let e = 0; e < ea.length; e += 1) { start[ea[e] + 1] += 1; start[eb[e] + 1] += 1; }
  for (let p = 0; p < count; p += 1) start[p + 1] += start[p];
  const fill = start.slice(0, count), to = new Int32Array(ea.length * 2), edgeOf = new Int32Array(ea.length * 2);
  for (let e = 0; e < ea.length; e += 1) { to[fill[ea[e]]] = eb[e]; edgeOf[fill[ea[e]]++] = e; to[fill[eb[e]]] = ea[e]; edgeOf[fill[eb[e]]++] = e; }
  return { ea: Int32Array.from(ea), eb: Int32Array.from(eb), start, to, edgeOf };
}

function pointNormals(at, count, tris) {
  const nrm = new Float64Array(count * 3);
  for (let t = 0; t < tris.length; t += 3) {
    const a = pt(at, tris[t]), b = pt(at, tris[t + 1]), c = pt(at, tris[t + 2]), n = cross(sub(b, a), sub(c, a));
    for (const k of [tris[t], tris[t + 1], tris[t + 2]]) { nrm[k * 3] += n[0]; nrm[k * 3 + 1] += n[1]; nrm[k * 3 + 2] += n[2]; }
  }
  for (let i = 0; i < nrm.length; i += 3) { const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1; nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l; }
  return nrm;
}

/** The curves' segments, filed by cell, and the distance from a point to the nearest (out to `far`). */
function segments(curves) {
  const a = [], b = [];
  for (const c of curves) for (let i = 0; i < c.length; i += 1) { a.push(c[i]); b.push(c[(i + 1) % c.length]); }
  const grid = new Grid(0.02);
  a.forEach((p, i) => grid.add(i, [0, 1, 2].map((k) => Math.min(p[k], b[i][k])), [0, 1, 2].map((k) => Math.max(p[k], b[i][k]))));
  const distance = (p, far) => {
    let best = far;
    for (const i of grid.near(p, far)) {
      const ab = sub(b[i], a[i]), t = Math.max(0, Math.min(1, dot(sub(p, a[i]), ab) / Math.max(dot(ab, ab), 1e-18)));
      const d = len(sub(add(a[i], scale(ab, t)), p));
      if (d < best) best = d;
    }
    return best;
  };
  return { a, b, grid, distance };
}

/** The edges of her skin a curve crosses: where they meet in the plane of her skin at the edge's middle. */
function blockedEdges(at, nrm, graph, segs) {
  const { ea, eb } = graph, blocked = new Uint8Array(ea.length);
  for (let e = 0; e < ea.length; e += 1) {
    const A = pt(at, ea[e]), B = pt(at, eb[e]), m = scale(add(A, B), 0.5), el = len(sub(B, A));
    const near = segs.grid.near(m, el / 2 + 0.004);
    if (!near.size) continue;
    let n = add(pt(nrm, ea[e]), pt(nrm, eb[e])); n = scale(n, 1 / (len(n) || 1));
    let u = sub(B, A); u = sub(u, scale(n, dot(u, n)));
    const lu = len(u);
    if (lu < 1e-12) continue;
    u = scale(u, 1 / lu);
    const w = cross(n, u), L = dot(sub(B, A), u);
    for (const i of near) {
      const sa = sub(segs.a[i], A), sb = sub(segs.b[i], A), ya = dot(sa, w), yb = dot(sb, w);
      if (ya * yb > 0 || ya === yb) continue;
      const t = ya / (ya - yb), xc = dot(sa, u) + (dot(sb, u) - dot(sa, u)) * t, zc = dot(sa, n) + (dot(sb, n) - dot(sa, n)) * t;
      if (xc >= 0 && xc <= L && Math.abs(zc) < Math.max(0.006, 0.6 * el)) { blocked[e] = 1; break; }
    }
  }
  return blocked;
}

/** Her points walked to from the seed without crossing a blocked edge or stepping on a `barrier` point. */
function flood(seedPoint, at, count, graph, blocked, barrier) {
  let s = -1, bd = Infinity;
  for (let p = 0; p < count; p += 1) { if (barrier[p]) continue; const d = len(sub(pt(at, p), seedPoint)); if (d < bd) { bd = d; s = p; } }
  const inside = new Uint8Array(count), stack = [s];
  inside[s] = 1;
  while (stack.length) {
    const p = stack.pop();
    for (let j = graph.start[p]; j < graph.start[p + 1]; j += 1) {
      const q = graph.to[j];
      if (inside[q] || barrier[q] || blocked[graph.edgeOf[j]]) continue;
      inside[q] = 1; stack.push(q);
    }
  }
  return inside;
}

// ── 5-7. the lines per vertex ───────────────────────────────────────────────────────────────────────────────────────
function fitLine(field, level, at, graph, segs, count) {
  const g = Float64Array.from(field, (f) => f - level), { ea, eb } = graph;
  const crossed = [];
  for (let e = 0; e < ea.length; e += 1) if ((g[ea[e]] > 0) !== (g[eb[e]] > 0)) crossed.push(e);
  const tstar = new Float64Array(crossed.length);
  crossed.forEach((e, k) => {
    const a = ea[e], b = eb[e], A = pt(at, a), B = pt(at, b), h = new Float64Array(EDGE_SAMPLES), d = new Float64Array(EDGE_SAMPLES);
    for (let i = 0; i < EDGE_SAMPLES; i += 1) d[i] = segs.distance(add(A, scale(sub(B, A), i / (EDGE_SAMPLES - 1))), 0.045);
    const flips = (field[a] > 0) !== (field[b] > 0);
    let j = 0; for (let i = 1; i < EDGE_SAMPLES; i += 1) if (d[i] < d[j]) j = i;
    for (let i = 0; i < EDGE_SAMPLES; i += 1) h[i] = (flips && i > j ? Math.sign(field[b]) : Math.sign(field[a])) * d[i] - level;
    let t = g[a] / (g[a] - g[b]);
    for (let i = 0; i + 1 < EDGE_SAMPLES; i += 1) if ((h[i] > 0) !== (h[i + 1] > 0)) { t = (i + h[i] / (h[i] - h[i + 1])) / (EDGE_SAMPLES - 1); break; }
    tstar[k] = t;
  });
  // (I + W C'C) x = g, in millimetres, by conjugate gradients: the crossings exact, each value near its own distance
  const x = Float64Array.from(g, (v) => v * 1000), rhs = x.slice(), W = CROSS_WEIGHT;
  const normal = (v, out) => {
    out.set(v);
    crossed.forEach((e, k) => { const t = tstar[k], s = (1 - t) * v[ea[e]] + t * v[eb[e]]; out[ea[e]] += W * (1 - t) * s; out[eb[e]] += W * t * s; });
  };
  const Ax = new Float64Array(count); normal(x, Ax);
  const r = rhs.map((v, i) => v - Ax[i]), p = r.slice(), Ap = new Float64Array(count);
  let rr = r.reduce((s, v) => s + v * v, 0);
  for (let it = 0; it < 500 && rr > 1e-12; it += 1) {
    normal(p, Ap);
    const alpha = rr / p.reduce((s, v, i) => s + v * Ap[i], 0);
    for (let i = 0; i < count; i += 1) { x[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; }
    const next = r.reduce((s, v) => s + v * v, 0);
    for (let i = 0; i < count; i += 1) p[i] = r[i] + (next / rr) * p[i];
    rr = next;
  }
  const out = Float64Array.from(x, (v) => v / 1000);
  let flipped = 0;
  for (let i = 0; i < count; i += 1) if ((out[i] > 0) !== (g[i] > 0)) { out[i] = g[i] > 0 ? 1e-5 : -1e-5; flipped += 1; }
  const errs = crossed.map((e, k) => { const va = out[ea[e]], vb = out[eb[e]]; return Math.abs(va / (va - vb) - tstar[k]) * len(sub(pt(at, eb[e]), pt(at, ea[e]))); }).sort((p1, p2) => p1 - p2);
  return { values: out, crossed: crossed.length, flipped, errMedian: errs[errs.length >> 1], errMax: errs[errs.length - 1] };
}

// ── storing ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const MAX_Q = Math.round(FAR_M / STEP_STORE_M);
function encode(values) {
  const bytes = [];
  let prev = -1, entries = 0;
  for (let v = 0; v < values.length; v += 1) {
    let q = Math.round(values[v] / STEP_STORE_M);
    q = Math.max(-MAX_Q, Math.min(MAX_Q, q !== 0 ? q : values[v] > 0 ? 1 : -1));
    if (q === -MAX_Q) continue;
    let gap = v - prev;
    prev = v;
    while (gap >= 0x80) { bytes.push((gap & 0x7f) | 0x80); gap >>>= 7; }
    bytes.push(gap, ZERO_BYTE + q);
    entries += 1;
  }
  return { data: Buffer.from(bytes).toString('base64'), entries };
}
function decode(data, vertices) {
  const bin = Buffer.from(data, 'base64'), field = new Float32Array(vertices).fill(-FAR_M);
  let at = 0, v = -1;
  while (at < bin.length) {
    let gap = 0, shift = 0, byte = 0;
    do { byte = bin[at++]; gap |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
    v += gap;
    field[v] = (bin[at++] - ZERO_BYTE) * STEP_STORE_M;
  }
  return field;
}

// ── 8. the field ────────────────────────────────────────────────────────────────────────────────────────────────────
/** A point's weights in its triangle (a, b, c), the point taken as lying on it. */
function weightsIn(q, a, b, c) {
  const v0 = sub(b, a), v1 = sub(c, a), v2 = sub(q, a), d00 = dot(v0, v0), d01 = dot(v0, v1), d11 = dot(v1, v1), d20 = dot(v2, v0), d21 = dot(v2, v1);
  const den = d00 * d11 - d01 * d01 || 1e-30, v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
  return [1 - v - w, v, w];
}

/**
 * Each curve's WALLS: at each of its samples, the direction along her skin toward the garment's side -- her skin's
 * normal there (blended from its triangle's corners, smoothed a little along the curve) crossed with the curve's own
 * direction, and turned to face the side the curve's samples find the garment on, `FRAME_PROBE_M` along it: the
 * corner of her skin's triangle there nearest the probe that was walked or not (`walked`; a `barrier` corner says
 * nothing). Only samples with no other curve within `FRAME_ALONE_M` vote: along the side band the two curves are
 * nearer each other than her triangles are wide, and no point of her skin there says which side is which.
 */
function curveWalls(curves, tools, at, tris, nrm, walked, barrier) {
  return curves.map((c, which) => {
    const n = c.length;
    let normals = c.map((p) => {
      const [q, t] = tools.projectOn(p), w = weightsIn(q, pt(at, tris[t]), pt(at, tris[t + 1]), pt(at, tris[t + 2]));
      const m = add(add(scale(pt(nrm, tris[t]), w[0]), scale(pt(nrm, tris[t + 1]), w[1])), scale(pt(nrm, tris[t + 2]), w[2]));
      return scale(m, 1 / (len(m) || 1));
    });
    for (let r = 0; r < FRAME_SMOOTH; r += 1) normals = normals.map((m, i) => { const s = add(add(scale(normals[(i - 1 + n) % n], 0.25), scale(m, 0.5)), scale(normals[(i + 1) % n], 0.25)); return scale(s, 1 / (len(s) || 1)); });
    let inward = c.map((p, i) => { const along = sub(c[(i + 1) % n], c[(i - 1 + n) % n]), b = cross(normals[i], along); return scale(b, 1 / (len(b) || 1)); });
    const others = curves.filter((_, k) => k !== which).flat();
    let agree = 0, votes = 0;
    c.forEach((p, i) => {
      if (others.some((o) => len(sub(o, p)) < FRAME_ALONE_M)) return;
      const [q, t] = tools.projectOn(add(p, scale(inward[i], FRAME_PROBE_M)));
      let best = -1, bd = Infinity;
      for (const k of [tris[t], tris[t + 1], tris[t + 2]]) { if (barrier[k]) continue; const d = len(sub(pt(at, k), q)); if (d < bd) { bd = d; best = k; } }
      if (best < 0) return;
      votes += 1;
      if (walked[best]) agree += 1;
    });
    if (agree * 2 < votes) { inward = inward.map((b) => scale(b, -1)); agree = votes - agree; }
    // the samples that vote must agree which side the garment is on, or the curve is not one loop round it
    if (votes < 20 || agree < 0.8 * votes) throw new Error(`curve ${which}: only ${agree} of ${votes} samples find the garment on one side`);
    return { points: c, inward, agree: agree / votes };
  });
}

/** Which side of the nearest curve's wall a place is on: + the garment's. */
function wallSide(p, walls) {
  let best = Infinity, side = 0;
  for (const w of walls) {
    const c = w.points, n = c.length;
    for (let a = 0; a < n; a += 1) {
      const b = (a + 1) % n, ab = sub(c[b], c[a]), u = Math.max(0, Math.min(1, dot(sub(p, c[a]), ab) / Math.max(dot(ab, ab), 1e-18)));
      const off = sub(p, add(c[a], scale(ab, u))), d = len(off);
      if (d < best) { best = d; side = dot(off, add(scale(w.inward[a], 1 - u), scale(w.inward[b], u))); }
    }
  }
  return side;
}

/**
 * The garment as a block of cells in her rest frame: `lo` its corner (metres), `dims` its cells along x, y, z, and one
 * value a cell (metres, + inside, within +-FIELD_RANGE_M), x fastest then y then z.
 */
function fieldVolume(at, tris, tools, walls, field) {
  const h = FIELD_VOXEL_M, R = FIELD_RANGE_M;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const w of walls) for (const q of w.points) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], q[k] - FIELD_PAD_M); hi[k] = Math.max(hi[k], q[k] + FIELD_PAD_M); }
  const dims = [0, 1, 2].map((k) => Math.ceil((hi[k] - lo[k]) / h)), [nx, ny, nz] = dims, N = nx * ny * nz;
  const centre = (i, k) => lo[k] + (i + 0.5) * h;
  // every curve sample, with the samples before and after it on its own loop
  const P = [], B = [], prev = [], next = [];
  for (const w of walls) { const off = P.length, n = w.points.length; w.points.forEach((p, i) => { P.push(p); B.push(w.inward[i]); prev.push(off + (i - 1 + n) % n); next.push(off + (i + 1) % n); }); }
  // near a curve: each cell's nearest sample
  const nearest = new Int32Array(N).fill(-1), d2 = new Float32Array(N).fill(Infinity), reach = FIELD_NEAR_M;
  P.forEach((p, s) => {
    const x0 = Math.max(0, Math.floor((p[0] - reach - lo[0]) / h)), x1 = Math.min(nx - 1, Math.floor((p[0] + reach - lo[0]) / h));
    const y0 = Math.max(0, Math.floor((p[1] - reach - lo[1]) / h)), y1 = Math.min(ny - 1, Math.floor((p[1] + reach - lo[1]) / h));
    const z0 = Math.max(0, Math.floor((p[2] - reach - lo[2]) / h)), z1 = Math.min(nz - 1, Math.floor((p[2] + reach - lo[2]) / h));
    for (let z = z0; z <= z1; z += 1) { const dz = centre(z, 2) - p[2]; for (let y = y0; y <= y1; y += 1) { const dy = centre(y, 1) - p[1], row = (z * ny + y) * nx; for (let x = x0; x <= x1; x += 1) {
      const dx = centre(x, 0) - p[0], d = dx * dx + dy * dy + dz * dz;
      if (d < reach * reach && d < d2[row + x]) { d2[row + x] = d; nearest[row + x] = s; }
    } } }
  });
  // the side her nearest skin is on, for every cell: her skin's own cells first (each triangle sampled finer than a
  // cell, its side from its corners' distances), then outward cell by cell from them
  const side = new Int8Array(N), queue = new Int32Array(N);
  let head = 0, tail = 0;
  for (const t of tools.triangles) {
    const a = pt(at, tris[t]), b = pt(at, tris[t + 1]), c = pt(at, tris[t + 2]);
    if ([0, 1, 2].some((k) => Math.max(a[k], b[k], c[k]) < lo[k] || Math.min(a[k], b[k], c[k]) > lo[k] + dims[k] * h)) continue;
    const fa = field[tris[t]], fb = field[tris[t + 1]], fc = field[tris[t + 2]];
    const m = Math.max(1, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a)), len(sub(c, b))) / (0.7 * h)));
    for (let i = 0; i <= m; i += 1) for (let j = 0; i + j <= m; j += 1) {
      const u = i / m, w = j / m, k0 = 1 - u - w;
      const x = Math.floor((a[0] * k0 + b[0] * u + c[0] * w - lo[0]) / h), y = Math.floor((a[1] * k0 + b[1] * u + c[1] * w - lo[1]) / h), z = Math.floor((a[2] * k0 + b[2] * u + c[2] * w - lo[2]) / h);
      if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) continue;
      const cell = (z * ny + y) * nx + x;
      if (side[cell]) continue;
      side[cell] = fa * k0 + fb * u + fc * w > 0 ? 1 : -1; queue[tail++] = cell;
    }
  }
  if (!tail) throw new Error('none of her skin lies in the field');
  while (head < tail) {
    const cell = queue[head++], x = cell % nx, y = Math.floor(cell / nx) % ny, z = Math.floor(cell / (nx * ny)), s = side[cell];
    if (x > 0 && !side[cell - 1]) { side[cell - 1] = s; queue[tail++] = cell - 1; }
    if (x < nx - 1 && !side[cell + 1]) { side[cell + 1] = s; queue[tail++] = cell + 1; }
    if (y > 0 && !side[cell - nx]) { side[cell - nx] = s; queue[tail++] = cell - nx; }
    if (y < ny - 1 && !side[cell + nx]) { side[cell + nx] = s; queue[tail++] = cell + nx; }
    if (z > 0 && !side[cell - nx * ny]) { side[cell - nx * ny] = s; queue[tail++] = cell - nx * ny; }
    if (z < nz - 1 && !side[cell + nx * ny]) { side[cell + nx * ny] = s; queue[tail++] = cell + nx * ny; }
  }
  const value = new Float32Array(N);
  let near = 0;
  for (let z = 0; z < nz; z += 1) for (let y = 0; y < ny; y += 1) for (let x = 0; x < nx; x += 1) {
    const i = (z * ny + y) * nx + x, s = nearest[i];
    if (s < 0) continue;
    const c = [centre(x, 0), centre(y, 1), centre(z, 2)];
    // the nearer of the two segments at that sample, and the wall there (blended between the segment's two samples)
    let best = Infinity, inward = 0;
    for (const [a, b] of [[prev[s], s], [s, next[s]]]) {
      const ab = sub(P[b], P[a]), u = Math.max(0, Math.min(1, dot(sub(c, P[a]), ab) / Math.max(dot(ab, ab), 1e-18)));
      const q = add(P[a], scale(ab, u)), off = sub(c, q), d = len(off);
      if (d >= best) continue;
      best = d; inward = dot(off, add(scale(B[a], 1 - u), scale(B[b], u)));
    }
    value[i] = (best < FIELD_WALL_M ? inward > 0 : side[i] > 0) ? Math.min(R, best) : -Math.min(R, best); near += 1;
  }
  for (let i = 0; i < N; i += 1) if (nearest[i] < 0) value[i] = side[i] > 0 ? R : -R;
  return { lo, dims, value, near };
}

/** The field's slices (each nx by ny, one for each z) laid `FIELD_COLS` across, as bytes: 128 on the outline. */
function fieldAtlas({ dims, value }) {
  const [nx, ny, nz] = dims, cols = FIELD_COLS, rows = Math.ceil(nz / cols), W = cols * nx, H = rows * ny, bytes = new Uint8Array(W * H);
  for (let z = 0; z < nz; z += 1) {
    const ox = (z % cols) * nx, oy = Math.floor(z / cols) * ny;
    for (let y = 0; y < ny; y += 1) for (let x = 0; x < nx; x += 1) bytes[(oy + y) * W + ox + x] = Math.max(0, Math.min(255, Math.round((0.5 + value[(z * ny + y) * nx + x] / (2 * FIELD_RANGE_M)) * 255)));
  }
  return { bytes, width: W, height: H, cols, rows };
}

function moduleSource({ vertices, edge, fill, report, volume, atlas, toMetres, sideBand }) {
  const lines = (data) => { const out = []; for (let i = 0; i < data.length; i += LINE_CHARS) out.push(`    '${data.slice(i, i + LINE_CHARS)}'`); return out.join(' +\n'); };
  return `/**
 * GENERATED by \`scripts/designAthleticBottom.mjs\` -- do not edit by hand. To regenerate, from the repo root:
 *   node scripts/designAthleticBottom.mjs
 *
 * HER ATHLETIC BIKINI BOTTOM, DESIGNED ON HER SKIN (Joshua, 2026-11-12: "map out the exact outline (edging) where it
 * should sit on her first, then basically fill in the polygon"; "remove the side string straps... more of an athletic
 * style"; its cut as he drew it on a mannequin of her build: a triangle over her mons, a thin band to each hip, a V
 * across her seat). The script says how it is drawn and every number it was drawn with.
 *
 * Two values per vertex of her approved body (sarah-v2-body.glb, ${vertices} vertices), metres: EDGE, how far inside (+) or
 * outside (-) the garment's outline the vertex is, and FILL, the same for the line ${BAND_M * 1000} mm inside it where the
 * edging ends. Each is chosen so its zero, blended straight across her triangles, falls where the true line crosses
 * their sides. They belong to the vertex, so they stay on the same skin at every belly size and in every pose. The
 * crisp lines are drawn from the field (\`ATHLETIC_BOTTOM.field\`: the same garment as a block of cells in space round
 * her hips, looked up at each pixel's own place on her rest skin); these give the paint's coverage, and are what is
 * drawn until the field is in.
 *
 * Measured when generated: ${report}
 *
 * Encoding (each field): for each stored vertex in index order, the gap from the previous stored index (the first
 * counts from -1) as a 7-bit varint (low 7 bits first), then one byte: value = (byte - ${ZERO_BYTE}) * step, within +-far. A
 * vertex not stored reads -far (outside). A value nearer zero than half a step is stored one step out on its own side.
 */
export const ATHLETIC_BOTTOM = Object.freeze({
  vertices: ${vertices},
  step: ${STEP_STORE_M},
  far: ${FAR_M},
  /** metres: the edging's width (FILL's line is this far inside EDGE's) */
  band: ${BAND_M},
  /** metres: the band over each hip -- its designed width along her skin, and the least and most it measures as laid */
  sideBand: Object.freeze({ width: ${SIDE_BAND_M}, laid: Object.freeze([${sideBand.map((v) => +v.toFixed(5)).join(', ')}] as const) }),
  /**
   * the field (public/): a block of \`voxel\`-metre cells, \`dims\` of them along x, y and z from its corner \`lo\`
   * (her rest frame, metres), each cell's value \`range\` either side of the outline over 0..255 (128 on the outline);
   * its slices (one for each z, \`dims[0]\` by \`dims[1]\`) lie \`cols\` across the picture, row after row. \`toMetres\`
   * is her rest frame from her mesh's own units (metres = units * scale + offset; MEASURED from her body file).
   */
  field: Object.freeze({
    path: '${FIELD_PATH}', dims: Object.freeze([${volume.dims.join(', ')}] as const), lo: Object.freeze([${volume.lo.map((v) => +v.toFixed(6)).join(', ')}] as const),
    voxel: ${FIELD_VOXEL_M}, range: ${FIELD_RANGE_M}, cols: ${atlas.cols},
    toMetres: Object.freeze({ scale: ${+toMetres.scale.toFixed(9)}, offset: Object.freeze([${toMetres.offset.map((v) => +v.toFixed(9)).join(', ')}] as const) }),
  }),
  /**
   * the strap between her legs hangs on her pelvis (\`bone\`): round her crotch (within \`zoneOuter\` metres of the line
   * from \`zoneA\` to \`zoneB\`, wholly within \`zoneInner\`) the garment is also held inside a shape that stands still on
   * her pelvis -- \`half\` either side of her middle \`mid\` under her crotch; in front of \`front.z\` opening upward from
   * the height \`front.fromY\` by \`front.slope\`, and behind \`back.z\` from \`back.fromY\` by \`back.slope\` (each coming
   * in over \`blend\` either side of its z). Metres, her rest frame.
   */
  strap: Object.freeze({
    bone: '${STRAP.bone}', mid: ${MID_X}, half: ${STRAP.half}, blend: ${STRAP.blend},
    front: Object.freeze({ z: ${STRAP.front.z}, fromY: ${STRAP.front.fromY}, slope: ${STRAP.front.slope} }), back: Object.freeze({ z: ${STRAP.back.z}, fromY: ${STRAP.back.fromY}, slope: ${STRAP.back.slope} }),
    zoneA: Object.freeze([${STRAP.zoneA.join(', ')}] as const), zoneB: Object.freeze([${STRAP.zoneB.join(', ')}] as const), zoneInner: ${STRAP.zoneInner}, zoneOuter: ${STRAP.zoneOuter},
  }),
  edge:
${lines(edge.data)},
  fill:
${lines(fill.data)},
});

const decoded: { edge?: Float32Array; fill?: Float32Array } = {};

/**
 * One of the two fields, per vertex of the body it was designed on (metres, + inside). Null when \`vertexCount\` is given
 * and is not that body's. Decoded once and cached: every call returns the SAME array, so treat it as read-only.
 */
export function athleticBottomField(which: 'edge' | 'fill', vertexCount?: number): Float32Array | null {
  const s = ATHLETIC_BOTTOM;
  if (vertexCount !== undefined && vertexCount !== s.vertices) return null;
  const have = decoded[which];
  if (have) return have;
  const bin = globalThis.atob(s[which]), field = new Float32Array(s.vertices).fill(-s.far);
  let at = 0, v = -1;
  while (at < bin.length) {
    let gap = 0, shift = 0, byte = 0;
    do { byte = bin.charCodeAt(at++); gap |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
    v += gap;
    field[v] = (bin.charCodeAt(at++) - ${ZERO_BYTE}) * s.step;
  }
  return (decoded[which] = field);
}
`;
}

export async function designAthleticBottom({ log = console.log } = {}) {
  const t0 = Date.now();
  const { pos, idx, onArm, vertices, toMetres } = await load(BODY_GLB);
  const { pointOf, at, count } = weld(pos);
  const tris = Int32Array.from(idx, (v) => pointOf[v]);
  const keep = new Uint8Array(tris.length / 3);
  for (let t = 0; t < tris.length; t += 3) keep[t / 3] = tris[t] !== tris[t + 1] && tris[t + 1] !== tris[t + 2] && tris[t] !== tris[t + 2] && !onArm[idx[t]] && !onArm[idx[t + 1]] && !onArm[idx[t + 2]] ? 1 : 0;
  const tools = skinTools(at, tris, keep);
  const curves = designCurves(tools);
  const lengths = curves.map((c) => c.reduce((s, p, i) => s + len(sub(c[(i + 1) % c.length], p)), 0));
  log(`body: ${vertices} vertices, ${count} points; outline: waistband ${lengths[0].toFixed(3)} m, leg openings ${lengths[1].toFixed(3)} and ${lengths[2].toFixed(3)} m (${curves.map((c) => c.length).join(' / ')} samples)`);

  const graph = skinGraph(count, tris), nrm = pointNormals(at, count, tris), segs = segments(curves);
  const blocked = blockedEdges(at, nrm, graph, segs);
  // (only her skin within reach of the curves is measured; the rest is FAR_M inside or out)
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const c of curves) for (const q of c) for (let k = 0; k < 3; k += 1) { lo[k] = Math.min(lo[k], q[k] - FAR_M); hi[k] = Math.max(hi[k], q[k] + FAR_M); }
  const far = new Float64Array(count), barrier = new Uint8Array(count);
  let sided = 0;
  for (let p = 0; p < count; p += 1) {
    const q = pt(at, p), reach = q.every((v, k) => v >= lo[k] && v <= hi[k]);
    far[p] = reach ? segs.distance(q, FAR_M) : FAR_M;
    if (far[p] < BARRIER_M) barrier[p] = 1;
  }
  // the walk, which stops short of the curves; then every point beside a curve by that curve's wall, as far out as the
  // field's own cells take their side from it (so the middle of the side band, which no walk reaches, is the garment)
  const inside = flood(tools.pick(FRONT, [MID_X + SEED[0], SEED[1], 0]), at, count, graph, blocked, barrier);
  const walls = curveWalls(curves, tools, at, tris, nrm, inside, barrier);
  for (let p = 0; p < count; p += 1) if (far[p] < FIELD_WALL_M) { inside[p] = wallSide(pt(at, p), walls) > 0 ? 1 : 0; sided += 1; }
  let inCount = 0; for (let p = 0; p < count; p += 1) inCount += inside[p];
  // a curve with a gap would let the walk out over all of her: the garment is a few thousand points, not tens of thousands
  if (inCount > 20000 || inCount < 1000) throw new Error(`the garment came out ${inCount} points: an outline is not closed`);
  const field = new Float64Array(count);
  for (let p = 0; p < count; p += 1) field[p] = inside[p] ? far[p] : -far[p];
  log(`inside: ${inCount} points (${blocked.reduce((s, b) => s + b, 0)} edges of her skin crossed by the outline, ${sided} points beside it sided by its walls)`);
  // the side band as laid: each of its lower edge's guide points to the waistband's curve
  const waist = segments([curves[0]]), bandWide = LEG_BAND.map(([x, y, z]) => waist.distance(tools.project([MID_X + x, y, z]), 0.1));
  const sideBand = [Math.min(...bandWide), Math.max(...bandWide)];
  log(`side band: ${(sideBand[0] * 1000).toFixed(1)} to ${(sideBand[1] * 1000).toFixed(1)} mm wide along its ${LEG_BAND.length} guide points (designed ${SIDE_BAND_M * 1000} mm)`);

  const edge = fitLine(field, 0, at, graph, segs, count), fill = fitLine(field, BAND_M, at, graph, segs, count);
  const mm = (m) => (m * 1000).toFixed(2);
  log(`edge line: ${edge.crossed} edges crossed, placed within ${mm(edge.errMedian)} mm (median), ${mm(edge.errMax)} mm (most); ${edge.flipped} values held to their side`);
  log(`fill line: ${fill.crossed} edges crossed, placed within ${mm(fill.errMedian)} mm (median), ${mm(fill.errMax)} mm (most); ${fill.flipped} values held to their side`);

  const perVertex = (values) => Float64Array.from(pointOf, (p) => values[p]);
  const edgeV = perVertex(edge.values), fillV = perVertex(fill.values);
  const E = encode(edgeV), F = encode(fillV);
  // the round trip, through the module's own decoder: every vertex within a step, on its own side
  for (const [name, values, enc] of [['edge', edgeV, E], ['fill', fillV, F]]) {
    const back = decode(enc.data, vertices);
    let worst = 0, lost = 0;
    for (let v = 0; v < vertices; v += 1) {
      const want = Math.max(-FAR_M, Math.min(FAR_M, values[v]));
      if (want > -FAR_M + STEP_STORE_M / 2) worst = Math.max(worst, Math.abs(back[v] - want));
      if ((back[v] > 0) !== (values[v] > 0)) lost += 1;
    }
    if (worst > STEP_STORE_M || lost) throw new Error(`${name}: round trip off by ${mm(worst)} mm, ${lost} vertices on the wrong side`);
  }

  const volume = fieldVolume(at, tris, tools, walls, field), atlas = fieldAtlas(volume);
  mkdirSync(dirname(OUT_PNG), { recursive: true });
  await sharp(Buffer.from(atlas.bytes), { raw: { width: atlas.width, height: atlas.height, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9 }).toFile(OUT_PNG);
  log(`field: ${volume.dims.join(' x ')} cells of ${FIELD_VOXEL_M * 1000} mm from (${volume.lo.map((v) => v.toFixed(3)).join(', ')}), ${volume.near} of them within reach of a curve (the curves' walls face the garment at ${walls.map((w) => (w.agree * 100).toFixed(0)).join(' / ')} % of their samples); written ${OUT_PNG} (${atlas.width} x ${atlas.height})`);

  const report = `the garment ${inCount} of her skin's ${count} points; the outline's lines per vertex land within ${mm(edge.errMax)} mm (edge) and ${mm(fill.errMax)} mm (fill) of the true lines on ${edge.crossed} and ${fill.crossed} crossed edges (median ${mm(edge.errMedian)} and ${mm(fill.errMedian)} mm).`;
  writeFileSync(OUT_TS, moduleSource({ vertices, edge: E, fill: F, report, volume, atlas, toMetres, sideBand }));
  log(`wrote ${OUT_TS}: ${E.entries} + ${F.entries} entries (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return { curves, inside: inCount, edge, fill, volume };
}

if (process.argv[1]?.endsWith('designAthleticBottom.mjs')) await designAthleticBottom();
