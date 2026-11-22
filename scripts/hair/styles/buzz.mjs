/**
 * BUZZ CUT: a man's hair clipped all over to one short length, lying close on his scalp. A cap and two thin shells of
 * loose strands over it, so it reads as dense short hair and not a helmet; no locks. Built on HIS head (`--body male`).
 *
 * Its longest: about 5 mm over the crown and 4 mm at the sides; its shortest (`shorter` at 1): about 1.5 mm, a stubble.
 */

/**
 * His hairline from his forehead round his LEFT side to his nape (his right mirrored). GAME TUNING, laid on his scalp
 * by the numbers MEASURED in the brief: the forehead's middle a little over his brow's crease (y 1.665), higher at the
 * temples (a slight M), a short sideburn to the middle of his ear's front (y 1.565), up over his ear, down behind it
 * to a nape line about y 1.505.
 */
export const MALE_HAIRLINE = [
  // forehead, its corner, and a soft recess of about 1.2 cm back from the corner
  [0.000, 1.664, 0.004], [0.022, 1.667, 0.000], [0.042, 1.666, -0.010], [0.054, 1.656, -0.022],
  // the temple covered: the edge turns down, nearly upright, toward the front of his ear
  [0.066, 1.620, -0.022], [0.072, 1.595, -0.028], [0.076, 1.578, -0.040], [0.077, 1.570, -0.058],
  // the sideburn, about 1.2 cm wide in front of his ear (MEASURED ear front z -0.087 to -0.099), down to mid-ear
  [0.077, 1.565, -0.075], [0.078, 1.563, -0.082], [0.079, 1.592, -0.085],
  // closely round the top of his ear, then down behind it to the nape
  [0.077, 1.612, -0.098], [0.076, 1.588, -0.108], [0.073, 1.545, -0.122], [0.068, 1.532, -0.132],
  [0.050, 1.530, -0.142], [0.000, 1.532, -0.148],
];
/** The middle of his cranium in the frame his styles are drawn in (the brief's, GAME TUNING to within a centimetre). */
export const MALE_CRANIUM = [0.0, 1.600, -0.070];

/**
 * The hairline's edge widened so the alpha cut runs along a smooth curve and not along the cap's grid. The kit fades a
 * cap point's alpha over a few millimetres of `hairMask`; dividing the mask stretches that fade to about 2.5 of the
 * cap's cells (some 4 mm a cell, and some 8 mm in the light file) while its zero, the visible line, stays where it is
 * (GAME TUNING).
 */
export function softEdge(kit, f) {
  const k = kit.pick(0.5, 0.25);
  return { ...f, hairMask: (p) => f.hairMask(p) * k };
}

export default {
  id: 'buzz',
  name: 'Buzz cut',
  build(kit) {
    // the rows run out from his crown, so the hub closes over the top of his head
    const f = softEdge(kit, kit.frame({ centre: MALE_CRANIUM, gather: [0, 1, -0.15], hairline: MALE_HAIRLINE }));
    // thickness is the cut's length: the sum is base + crown + 1.3 mm (GAME TUNING)
    kit.cap(f, {
      phi0: 0.008, phiMax: 2.6, hub: false, crown: [0, 1, -0.1], crownWidth: 0.7,
      thick: { base: kit.long(0.0025, 0.0002), crown: kit.long(0.0012, 0.0), sides: 0, gather: 0 },
      shells: kit.pick([kit.long(0.0009, 0.0003), kit.long(0.0018, 0.0006)], [kit.long(0.0012, 0.0004)]),
      clear: 0.0025,
      // the kit darkens the roots where the rows gather; here they gather at his crown, which would show as a dark
      // spot there, so that darkening is undone (GAME TUNING)
      tint: (c) => 1 / (0.8 + 0.2 * Math.min(1, Math.max(0, c.t / 0.2)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, c.t / 0.2)))),
      ...kit.pick({ around: 120, along: 56 }, { around: 56, along: 26 }),
    });
    return { report: 'buzz cut cap' };
  },
};
