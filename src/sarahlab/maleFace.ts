/**
 * HIS FACE (Joshua, 2026-11-21: "Let's work on hair, face, and eye options for the male model now").
 *
 * The face layer (`faceRig.ts`) is drawn in HER rest metres: her eyes, her lids, her brows, her lips and her jaw are
 * numbers measured on her sculpt. His face wears the same design through a FRAME that takes his geometry (metres, as his
 * file has it) into hers -- a scale and a turn about x, fitted to her face -- with brows, lashes and lips of his own.
 *
 * THE FRAME (MEASURED 2026-11-21, `male-base.glb` against her body file, both read with the rest of their skin left
 * out: each face from its brow to its chin, nose to ears): an iterative closest-point fit of her face onto his, a scale,
 * a turn about x alone and a carry (his face is square to his body as hers is, so no other turn was let in). Her face on
 * his is `his = 1.0234 · turnX(-4.35°) · hers + (0.0096, -0.0225, 0.1978)`, half its points within 1.41 mm of his skin;
 * this is that taken the other way. His nose's tip, which the fit was not told of, falls 2.0 mm from hers (her
 * `FACE_HEAD.noseTip`); her eyes' centres fall in his sockets, her lips' seam on his.
 *
 * His bones are named one on from hers (`maleRig.ts`): his head is `Bone_017`.
 */
import { FACE_BROWS, FACE_DEFAULTS, FACE_LIDS, FACE_LIPS, type FaceSpec, type V3 } from './faceRig';

/** Her face fitted onto his (MEASURED, above): `his = scale · turnX(pitch) · hers + carry`, metres and radians. */
export const MALE_FACE_FIT = { scale: 1.0234, pitch: -4.35 * Math.PI / 180, carry: [0.0096, -0.0225, 0.1978] as V3 } as const;

/** The frame that takes his geometry into her rest metres: the fit taken the other way. */
function frameOf(fit: typeof MALE_FACE_FIT) {
  const k = 1 / fit.scale, pitch = -fit.pitch, c = Math.cos(pitch), s = Math.sin(pitch), t = fit.carry;
  const offset: V3 = [-k * t[0], -k * (c * t[1] - s * t[2]), -k * (s * t[1] + c * t[2])];
  return Object.freeze({ id: 'male', scale: k, pitch, offset, headBone: 'Bone_017' });
}

/**
 * HIS BROWS (GAME TUNING, by eye on him): a man's brow sits lower over his eye and runs flatter than hers -- its arch a
 * few millimetres over its head where hers is 6 -- and fuller: thicker along all of it, its head squarer, its tail
 * ending blunter. Dark brown (sRGB about 0.20, 0.13, 0.09). His hair's colour gives them their own once he has hair.
 */
const BROWS = {
  ...FACE_BROWS,
  head: [0.0130, 1.5990] as const, arch: [0.0320, 1.6025] as const, tail: [0.0500, 1.5995] as const,
  thickness: [0.0062, 0.0054, 0.0028] as const,
  edgeLow: 0.0007, edgeHigh: 0.0011,
  headRound: 0.0016, headPower: 3.2,
  tailFrom: 0.84, tailEnd: 1.04,
  alpha: 0.9,
  colour: [0.033, 0.016, 0.009] as V3,
  hairs: { ...FACE_BROWS.hairs, density: { base: 0.55, lower: 0.35, head: 0.3, max: 0.97 }, lengthMax: 0.0042 },
};
/** HIS LASHES (GAME TUNING): shorter and finer, with no flick past the outer corner. */
const LIDS = { ...FACE_LIDS, lash: 0.00045, lashOuter: 0.00015, lashAlpha: 0.8, flick: 0.05, flickRise: 0.0002, lowerLash: 0.0003, lowerAlpha: 0.3 };
/** HIS LIPS (GAME TUNING): their own colour, nearer his skin's, his upper lip a little thinner. */
const LIPS = { ...FACE_LIPS, upper: 0.0085, tint: [0.95, 0.80, 0.78] as V3 };
/** What his face starts as: his brows' colour (her amounts: the FACE tab's own, `faceLook.OWN_AMOUNTS`). */
const DEFAULTS = { ...FACE_DEFAULTS, browColour: BROWS.colour };

/** His face: his frame, and his brows, lashes and lips. */
export const MALE_FACE: FaceSpec = Object.freeze({ frame: frameOf(MALE_FACE_FIT), brows: BROWS, lips: LIPS, lids: LIDS, defaults: DEFAULTS });
