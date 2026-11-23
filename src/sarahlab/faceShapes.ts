/**
 * THE SHAPE OF HER FACE, AS SLIDERS (Joshua, 2026-11-14: "add more of a customizable character, as it's kind of limited
 * hair and face wise to one look"; "create different hairstyles, hair length and color, different face types, eye and
 * lip colors").
 *
 * Every character in his games is one female body with different numbers on it; her head was one sculpt, with no morph
 * touching it (`faceRig.ts`). Here each slider is a FIELD IN SPACE: a function of a place in her rest METRES (feet at
 * y = 0, facing +z, +y up, +x HER LEFT) giving how that place moves, in metres -- not a list of vertices -- so the same
 * numbers move her skin, her hair, her lashes and a lighter copy of her body with other points alike.
 *
 * A field is a sum of TERMS. A term is a smooth bump (`(1 - r²)³` over an ellipsoid: no step and no corner anywhere,
 * nothing outside its ellipsoid) times a move `v + M·(p - c)` -- a carry, or a stretch / turn about its centre. A term
 * off her midline is laid twice, at its centre and at its mirror, the mirror's move turned round in x, so every field
 * is mirrored exactly (`field(-x) = mirror(field(x))`) and smooth across her midline. All of it is then eased to nothing
 * down her neck (`NECK`), and nothing outside `FACE_SHAPE_BOX` moves.
 *
 * `faceShapeMove` is LINEAR in every slider's number: the sum of `look[id] * field_id(p)`. The room may lay each slider
 * once as a shape and blend them by their numbers. Her face's painted layer (eyes, brows, lips) is drawn at each skin
 * point's REST place, so it rides whatever moves her skin: EYE SIZE grows the eye drawn there, BROW HEIGHT lifts the brow.
 *
 * Each slider's comment gives its biggest move at ±1, MEASURED on her skin's points (`tests/faceShapes.test.ts` holds
 * every one to its bound). The terms' places are MEASURED on her skin (`scripts/preview/body.mjs`'s rest metres) or are
 * `faceRig.ts`'s measured landmarks; their sizes and amounts are GAME TUNING, judged by eye on the preview sheets
 * (`scripts/preview/faceShapes.mts`).
 *
 * Pure: no three.js, no DOM.
 */
import { FACE_BROWS, FACE_EYES, FACE_HEAD, FACE_MOUTH } from './faceRig';
import type { FaceShapeLook } from './headLook';

type V3 = readonly [number, number, number];
type M3 = readonly [V3, V3, V3];

/** One slider as the room shows it. `id` is what a save keeps. */
export interface FaceSlider { readonly id: string; readonly name: string; readonly group: FaceGroup }
export type FaceGroup = 'FACE' | 'JAW & CHIN' | 'CHEEKS' | 'NOSE' | 'LIPS' | 'EYES & BROWS' | 'EARS';

/** A bump with a move: within the ellipsoid of half-sizes `r` about `c`, `(1 - r²)³ · (v + M·(p - c))`. */
interface Term { readonly c: V3; readonly r: V3; readonly v?: V3; readonly m?: M3; readonly mirror?: boolean }

/**
 * Her neck's line: every field is whole above `to` and eased (smootherstep) to nothing at `from` (rest y, metres).
 * MEASURED: her chin's bottom is 1.4855 (`FACE_HEAD.chin`), the underside of her jaw meets her neck at about 1.47
 * at her middle; GAME TUNING how far down it eases.
 */
export const NECK = { from: 1.425, to: 1.47 } as const;

/** Outside this box (rest metres) every field is exactly nothing; every term's ellipsoid lies inside it. */
export const FACE_SHAPE_BOX = { xFrom: -0.13, xTo: 0.13, yFrom: NECK.from, yTo: 1.745, zFrom: -0.185, zTo: 0.12 } as const;

// landmarks (MEASURED on her skin, rest metres, 2026-11-14, unless named from `faceRig.ts`)
const EYE: V3 = [(FACE_EYES.left.inner[0] + FACE_EYES.left.outer[0]) / 2, (FACE_EYES.left.inner[1] + FACE_EYES.left.outer[1]) / 2 + 0.001, 0.0];
const BROW: V3 = [FACE_BROWS.arch[0], FACE_BROWS.arch[1] - 0.002, 0.004];
const SEAM: V3 = [0, FACE_MOUTH.seamY, FACE_MOUTH.seamZ];
const NOSE = FACE_HEAD.noseTip;
/** The corner of her jaw below her ear: MEASURED, her skin's widest at 1.50-1.51 in front of z -0.05 is |x| 0.047 at z -0.048. */
const JAW_CORNER: V3 = [0.05, 1.513, -0.062];
/** Her cheekbone: MEASURED, her face's widest in front of her ears, |x| 0.063 at 1.57, z -0.045; its front a little forward. */
const CHEEKBONE: V3 = [0.054, 1.566, -0.022];
/** Her ear: MEASURED, her skin outside |x| 0.068 spans y 1.546-1.640 and z -0.129 to -0.066; its root about |x| 0.068. */
const EAR: V3 = [0.072, 1.592, -0.096];

const k3 = (a: number, b: number, c: number): M3 => [[a, 0, 0], [0, b, 0], [0, 0, c]];

/**
 * The sliders: each its terms. The `max` in each comment is MEASURED: the largest move of any of her skin's points at ±1.
 */
const FIELDS: Readonly<Record<string, readonly Term[]>> = {
  // FACE
  /** max 4.2 mm. Her face wider or narrower in front of her ears, her cranium kept. */
  faceWidth: [{ c: [0, 1.535, -0.01], r: [0.11, 0.1, 0.1], m: k3(0.16, 0, 0) }],
  /** max 8.6 mm. Her lower face longer: what is under her eyes is carried down, most at her chin. */
  faceLength: [{ c: [0, 1.495, -0.03], r: [0.1, 0.085, 0.14], v: [0, -0.009, 0.001] }],
  /** max 6.9 mm. Her forehead taller and fuller, or lower and flatter. */
  forehead: [{ c: [0, 1.648, 0.012], r: [0.075, 0.05, 0.06], v: [0, 0.006, 0.0035] }],
  // JAW & CHIN
  /** max 9.4 mm. Her jaw's corners out or in. */
  jawWidth: [{ c: JAW_CORNER, r: [0.035, 0.04, 0.045], v: [0.0095, 0, 0], mirror: true }],
  /** max 4.5 mm. The corner of her jaw squarer (out and down) or rounder. */
  jawCorner: [{ c: [0.05, 1.505, -0.066], r: [0.028, 0.026, 0.03], v: [0.0042, -0.004, 0], mirror: true }],
  /** max 7.6 mm. Her chin longer or shorter. */
  chinLength: [{ c: [0, 1.488, 0.0], r: [0.03, 0.03, 0.045], v: [0, -0.0075, 0.0015] }],
  /** max 4.8 mm. Her chin broader or pointed. */
  chinWidth: [{ c: [0.012, 1.492, 0.0], r: [0.02, 0.022, 0.035], v: [0.0048, 0, 0], mirror: true }],
  /** max 7.5 mm. Her chin forward or back. */
  chinForward: [{ c: [0, 1.49, 0.004], r: [0.03, 0.032, 0.045], v: [0, 0, 0.0075] }],
  // CHEEKS
  /** max 7.9 mm. Her cheeks full and soft, or hollow. */
  cheekFullness: [{ c: [0.042, 1.53, -0.015], r: [0.042, 0.04, 0.05], v: [0.0045, 0, 0.0065], mirror: true }],
  /** max 5.3 mm. Her cheekbones high and out, or flat. */
  cheekbones: [{ c: CHEEKBONE, r: [0.03, 0.024, 0.036], v: [0.0042, 0.0013, 0.0032], mirror: true }],
  // NOSE
  /** max 3.7 mm. The wings of her nose wider or narrower. */
  noseWidth: [{ c: [0.009, 1.54, 0.014], r: [0.013, 0.014, 0.018], v: [0.0038, 0, 0], mirror: true }],
  /** max 4.3 mm. Her nose longer (its tip lower and further out) or shorter. */
  noseLength: [{ c: [0, NOSE[1] - 0.003, NOSE[2] - 0.003], r: [0.016, 0.02, 0.022], v: [0, -0.0038, 0.0023] }],
  /** max 3.7 mm. The bridge of her nose higher or lower. */
  noseBridge: [{ c: [0, 1.567, 0.017], r: [0.011, 0.022, 0.02], v: [0, 0, 0.0038] }],
  /** max 3.8 mm. The tip of her nose turned up or down. */
  noseTip: [{ c: [0, NOSE[1] - 0.002, NOSE[2]], r: [0.011, 0.011, 0.014], v: [0, 0.0038, -0.0004] }],
  // LIPS
  /** max 2.3 mm. Her lips fuller (each taller from the seam, and forward) or thinner. */
  lipFullness: [{ c: SEAM, r: [0.03, 0.017, 0.02], v: [0, 0, 0.0018], m: k3(0, 0.5, 0) }],
  /** max 4.5 mm. Her mouth wider or narrower at its corners. */
  mouthWidth: [{ c: [0.02, FACE_MOUTH.cornerY, 0.002], r: [0.02, 0.016, 0.025], v: [0.0045, 0, 0], mirror: true }],
  // EYES & BROWS
  /** max 1.6 mm. Her eyes bigger or smaller: the skin round each spread from its middle (her lids drawn on it with it). */
  eyeSize: [{ c: EYE, r: [0.022, 0.017, 0.03], m: k3(0.3, 0.3, 0), mirror: true }],
  /** max 3.8 mm. Her eyes further apart or closer. */
  eyeSpacing: [{ c: EYE, r: [0.024, 0.02, 0.03], v: [0.0038, 0, 0], mirror: true }],
  /** max 1.4 mm. Her eyes' outer corners up (a lifted, cat-like eye) or down. */
  eyeTilt: [{ c: EYE, r: [0.024, 0.018, 0.03], m: [[0, 0, 0], [0.25, 0, 0], [0, 0, 0]], mirror: true }],
  /** max 4.0 mm. Her brows higher or lower. */
  browHeight: [{ c: BROW, r: [0.03, 0.013, 0.03], v: [0, 0.0042, 0], mirror: true }],
  /**
   * max 3.4 mm. DEEP-SET EYES (Joshua, 2026-11-22, for GDM's John: "deep-set eyes"): her eyes and the skin round them
   * back into her head, the ridge of her brow a little forward and down over them; at -1 her eyes stand out. Its shade,
   * the socket's shadow, is the face layer's (`faceRig.ts` `FACE_DETAIL.socket`), laid by the same number.
   */
  eyeDepth: [
    { c: [EYE[0], EYE[1] + 0.003, EYE[2]], r: [0.023, 0.016, 0.03], v: [0, 0, -0.0034], mirror: true },
    { c: BROW, r: [0.028, 0.011, 0.03], v: [0, -0.0005, 0.0012], mirror: true },
  ],
  // EARS
  /** max 3.2 mm. Her ears bigger or smaller, about their root. */
  earSize: [{ c: EAR, r: [0.016, 0.056, 0.045], m: k3(0.16, 0.24, 0.24), mirror: true }],
};

/** The sliders, in the order the room shows them. */
export const FACE_SLIDERS: readonly FaceSlider[] = [
  { id: 'faceWidth', name: 'FACE WIDTH', group: 'FACE' },
  { id: 'faceLength', name: 'FACE LENGTH', group: 'FACE' },
  { id: 'forehead', name: 'FOREHEAD', group: 'FACE' },
  { id: 'jawWidth', name: 'JAW WIDTH', group: 'JAW & CHIN' },
  { id: 'jawCorner', name: 'JAW CORNER', group: 'JAW & CHIN' },
  { id: 'chinLength', name: 'CHIN LENGTH', group: 'JAW & CHIN' },
  { id: 'chinWidth', name: 'CHIN WIDTH', group: 'JAW & CHIN' },
  { id: 'chinForward', name: 'CHIN FORWARD', group: 'JAW & CHIN' },
  { id: 'cheekFullness', name: 'CHEEK FULLNESS', group: 'CHEEKS' },
  { id: 'cheekbones', name: 'CHEEKBONES', group: 'CHEEKS' },
  { id: 'noseWidth', name: 'NOSE WIDTH', group: 'NOSE' },
  { id: 'noseLength', name: 'NOSE LENGTH', group: 'NOSE' },
  { id: 'noseBridge', name: 'NOSE BRIDGE', group: 'NOSE' },
  { id: 'noseTip', name: 'NOSE TIP', group: 'NOSE' },
  { id: 'lipFullness', name: 'LIP FULLNESS', group: 'LIPS' },
  { id: 'mouthWidth', name: 'MOUTH WIDTH', group: 'LIPS' },
  { id: 'eyeSize', name: 'EYE SIZE', group: 'EYES & BROWS' },
  { id: 'eyeSpacing', name: 'EYE SPACING', group: 'EYES & BROWS' },
  { id: 'eyeTilt', name: 'EYE TILT', group: 'EYES & BROWS' },
  { id: 'browHeight', name: 'BROW HEIGHT', group: 'EYES & BROWS' },
  { id: 'eyeDepth', name: 'DEEP-SET EYES', group: 'EYES & BROWS' },
  { id: 'earSize', name: 'EAR SIZE', group: 'EARS' },
];

/**
 * Named faces made of the sliders (GAME TUNING, judged on the preview sheets). HER OWN, every slider 0, is not here.
 * ROUND is the first character's (Lena: "a rounder, softer, fuller-cheeked face than the sculpt's lean one").
 */
export const FACE_TYPES: readonly { readonly id: string; readonly name: string; readonly look: FaceShapeLook }[] = [
  { id: 'oval', name: 'OVAL', look: { faceWidth: -0.2, faceLength: 0.3, jawWidth: -0.3, jawCorner: -0.4, chinWidth: -0.2, cheekbones: 0.3 } },
  { id: 'round', name: 'ROUND', look: { faceWidth: 0.6, faceLength: -0.5, jawCorner: -0.8, jawWidth: 0.2, chinLength: -0.4, chinWidth: 0.4, cheekFullness: 1, cheekbones: -0.4, noseLength: -0.3, eyeSize: 0.4, lipFullness: 0.3 } },
  { id: 'heart', name: 'HEART', look: { forehead: 0.5, faceWidth: 0.2, jawWidth: -0.8, jawCorner: -0.5, chinWidth: -0.7, chinLength: 0.2, cheekbones: 0.8, eyeSize: 0.2 } },
  { id: 'square', name: 'SQUARE', look: { jawWidth: 0.65, jawCorner: 0.5, chinWidth: 0.7, faceLength: -0.2, faceWidth: 0.3, cheekFullness: -0.2, browHeight: -0.3 } },
  { id: 'long', name: 'LONG', look: { faceLength: 1, faceWidth: -0.5, chinLength: 0.6, forehead: 0.5, noseLength: 0.6, cheekFullness: -0.3 } },
  { id: 'soft', name: 'SOFT', look: { cheekFullness: 0.7, jawCorner: -0.6, chinForward: -0.3, noseBridge: -0.4, noseTip: 0.4, lipFullness: 0.6, eyeSize: 0.5, browHeight: 0.3, cheekbones: -0.3 } },
  { id: 'sharp', name: 'SHARP', look: { cheekbones: 1, cheekFullness: -0.8, jawCorner: 0.6, chinForward: 0.5, chinWidth: -0.5, noseBridge: 0.7, noseWidth: -0.5, eyeTilt: 0.7, lipFullness: -0.2 } },
];

/** A field: a place in her rest metres in, its move in metres out. */
export type FaceField = (rest: V3, out?: [number, number, number]) => [number, number, number];

const smoother = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const inBox = (p: V3): boolean => p[0] > FACE_SHAPE_BOX.xFrom && p[0] < FACE_SHAPE_BOX.xTo && p[1] > FACE_SHAPE_BOX.yFrom && p[1] < FACE_SHAPE_BOX.yTo
  && p[2] > FACE_SHAPE_BOX.zFrom && p[2] < FACE_SHAPE_BOX.zTo;

/** One term's move at p (added into `out`), laid at `c` with the move turned round in x when `flip`. */
function addTerm(t: Term, p: V3, flip: boolean, w: number, out: [number, number, number]): void {
  const s = flip ? -1 : 1, cx = t.c[0] * s;
  const dx = p[0] - cx, dy = p[1] - t.c[1], dz = p[2] - t.c[2];
  const r2 = (dx / t.r[0]) ** 2 + (dy / t.r[1]) ** 2 + (dz / t.r[2]) ** 2;
  if (r2 >= 1) return;
  const b = (1 - r2) ** 3 * w, v = t.v ?? [0, 0, 0], m = t.m;
  // mirrored: the move's x turned round, and so are M's entries that join x to y or z (M' = S·M·S, S = diag(s, 1, 1))
  let mx = v[0] * s, my = v[1], mz = v[2];
  if (m) {
    mx += m[0][0] * dx + s * (m[0][1] * dy + m[0][2] * dz);
    my += s * m[1][0] * dx + m[1][1] * dy + m[1][2] * dz;
    mz += s * m[2][0] * dx + m[2][1] * dy + m[2][2] * dz;
  }
  out[0] += b * mx; out[1] += b * my; out[2] += b * mz;
}

function fieldInto(terms: readonly Term[], p: V3, w: number, out: [number, number, number]): void {
  if (w === 0 || !inBox(p)) return;
  const neck = smoother(NECK.from, NECK.to, p[1]);
  if (neck === 0) return;
  for (const t of terms) {
    addTerm(t, p, false, w * neck, out);
    if (t.mirror) addTerm(t, p, true, w * neck, out);
  }
}

/** One slider's field (at +1). An id that is not a slider is the field that moves nothing. */
export function faceShapeField(id: string): FaceField {
  const terms = FIELDS[id] ?? [];
  return (rest, out = [0, 0, 0]) => { out[0] = 0; out[1] = 0; out[2] = 0; fieldInto(terms, rest, 1, out); return out; };
}

/** How far a look moves a place in her rest metres: the sum of each slider's number times its field. Metres. */
export function faceShapeMove(rest: V3, look: FaceShapeLook, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  out[0] = 0; out[1] = 0; out[2] = 0;
  for (const id in look) {
    const terms = FIELDS[id], w = look[id];
    if (terms && Number.isFinite(w)) fieldInto(terms, rest, w, out);
  }
  return out;
}
