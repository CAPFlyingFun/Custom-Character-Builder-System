/**
 * PONYTAIL: the hairstyle she has had since 2026-10-24 (Joshua: "Start with one face and one hairstyle for Sarah v2"),
 * rebuilt on the toolkit from `scripts/sarahV2Recovery/hair-bake.mjs`, number for number -- its long form bakes to that
 * script's file (`node scripts/hair/bake.mjs --style ponytail --as-today`).
 *
 * Copper-auburn wavy hair parted in the middle, curtain bangs framing her face down past her jaw, pulled back into a
 * ponytail tied with a black elastic at the back of her head about level with her eyes, falling in loose waves to
 * between her shoulder blades. Its SHORTEST (`shorter` at 1): the same ponytail ending at the base of her neck.
 */
import { add, mul, smoothstep } from '../vec.mjs';

/** Her hairline from her forehead round her left side to her nape (MEASURED on her scalp; her right mirrored). */
export const HAIRLINE = [
  [0.000, 1.656, 0.000], [0.024, 1.658, -0.003], [0.048, 1.641, -0.012], [0.062, 1.616, -0.036], [0.070, 1.603, -0.062],
  [0.074, 1.603, -0.090], [0.071, 1.590, -0.112], [0.064, 1.552, -0.121], [0.044, 1.511, -0.131], [0.000, 1.500, -0.137],
];
/** The middle of her cranium (MEASURED). */
export const CRANIUM = [0.0, 1.600, -0.078];
/**
 * HIS HEAD (the male base model, `kit.head.body.id === 'male'`). Her styles' fixed points are hers; on him each is moved
 * by `onHim`, and his own hairline and cranium are used. Her numbers above are untouched, so her bakes are as they were.
 *
 * His hairline from his forehead round his LEFT side to his nape (his right mirrored): GAME TUNING, laid on his scalp by
 * the numbers MEASURED in the hair brief -- the middle of his forehead a little over his brow's crease, higher at the
 * temples (a slight M), a short sideburn to the middle of his ear's front (y 1.565), up over his ear and down behind it
 * to a nape line about y 1.505. Its azimuth about his cranium only grows along it, as the cap's look-up needs. Its
 * point up his ear's front stands AHEAD of his ear (z -0.088; his ear's front is at -0.087 to -0.099): at -0.094 the cap
 * covered the root of his ear's front and lay 0.86 mm under his skin there (MEASURED by `fit.mjs --body male`, 2026-11-21).
 */
export const HIS_HAIRLINE = [
  [0.000, 1.664, 0.004], [0.020, 1.667, 0.000], [0.036, 1.672, -0.010], [0.052, 1.656, -0.024],
  [0.064, 1.628, -0.046], [0.071, 1.598, -0.068], [0.075, 1.566, -0.082], [0.079, 1.600, -0.088],
  [0.077, 1.625, -0.108], [0.073, 1.610, -0.128], [0.066, 1.560, -0.138], [0.050, 1.515, -0.142], [0.000, 1.505, -0.146],
];
/** The middle of his cranium (the brief's, checked by rays from inside his head; GAME TUNING to a centimetre). */
export const HIS_CRANIUM = [0.0, 1.600, -0.070];
/**
 * How much further out his outermost surface is than hers (metres), seen from the upright axis x 0, z -0.075, at
 * azimuths 0 (front) to 180 (back) in 30-degree steps (mirrored for his right), by height from 1.69 m down to 1.12 m in
 * 3 cm steps. MEASURED 2026-11-21 on both bodies' files read into this frame (`head.nearest` within 1.5 mm, marched in
 * from 26 cm out). His back of head is about 2 cm shallower, his neck thicker, his upper back further back, his chest
 * flatter than her bust.
 */
const HIS_Y0 = 1.69, HIS_DY = 0.03;
const HIS_REACH = [
  [-0.013, -0.013, -0.014, -0.015, -0.018, -0.027, -0.030],
  [-0.004, -0.006, -0.005, -0.005, -0.009, -0.019, -0.024],
  [-0.001, -0.002, -0.001, -0.001, -0.006, -0.016, -0.022],
  [0.001, 0.001, 0.001, -0.001, -0.004, -0.014, -0.020],
  [0.004, 0.000, 0.000, 0.001, -0.002, -0.010, -0.019],
  [-0.003, -0.001, 0.003, 0.002, 0.005, 0.005, -0.008],
  [-0.001, 0.003, 0.004, 0.011, 0.009, 0.013, 0.002],
  [0.060, 0.018, 0.015, 0.022, 0.013, 0.015, 0.009],
  [0.017, 0.017, 0.020, 0.020, 0.048, 0.023, 0.013],
  [0.000, 0.000, 0.010, 0.025, 0.027, 0.033, 0.019],
  [-0.015, -0.012, -0.011, -0.007, 0.040, 0.034, 0.026],
  [-0.024, -0.027, -0.029, 0.014, 0.042, 0.039, 0.035],
  [-0.034, -0.053, -0.019, 0.014, 0.047, 0.042, 0.040],
  [-0.040, -0.070, -0.021, 0.014, 0.055, 0.047, 0.045],
  [-0.038, -0.069, -0.020, -0.030, 0.065, 0.053, 0.046],
  [-0.052, -0.051, -0.009, -0.050, 0.111, 0.064, 0.052],
  [-0.086, -0.046, -0.010, -0.055, 0.121, 0.068, 0.052],
  [-0.120, -0.080, -0.017, -0.061, 0.135, 0.073, 0.057],
  [-0.147, -0.105, -0.034, 0.019, 0.139, 0.076, 0.066],
  [-0.169, -0.127, -0.054, -0.113, 0.062, 0.073, 0.068],
];
/** A point of one of her styles moved onto him: out (or in) from the axis by how much further out his surface is there. */
export function onHim(p) {
  const dx = p[0], dz = p[2] + 0.075, r = Math.hypot(dx, dz);
  if (r < 1e-6) return [p[0], p[1], p[2]];
  const a = (Math.atan2(Math.abs(dx), dz) * 180) / Math.PI / 30, i = Math.min(5, Math.floor(a)), u = Math.min(1, a - i);
  const b = Math.min(HIS_REACH.length - 1, Math.max(0, (HIS_Y0 - p[1]) / HIS_DY)), k = Math.min(HIS_REACH.length - 2, Math.floor(b)), v = b - k;
  const row = (j) => HIS_REACH[j][i] * (1 - u) + HIS_REACH[j][i + 1] * u;
  const d = row(k) * (1 - v) + row(k + 1) * v, t = (r + d) / r;
  return [dx * t, p[1], dz * t - 0.075];
}

/** How much of its path the shortest ponytail keeps: to the base of her neck (GAME TUNING; MEASURED end y about 1.43 m). */
const SHORTEST = 0.62;

export default {
  id: 'ponytail',
  name: 'Ponytail',
  build(kit) {
    const his = kit.head.body.id === 'male', P = his ? onHim : (p) => p;
    // on him the tie sits about 2 cm further forward (his head is shallower behind): the fall is brought in with it so
    // it lies on his nape and upper back (GAME TUNING, by eye on his preview from the side) -- all of it at his nape,
    // none of it from 1.40 m down, where his upper back stands further back than hers (brought in there, the tail's
    // end lay 1.2 mm under his skin, and the light file's 5.8 mm: MEASURED by `fit.mjs --body male`, 2026-11-21)
    const HIS_TAIL_IN = [0, 0, 0.022], tailIn = (p) => add(onHim(p), mul(HIS_TAIL_IN, smoothstep(1.40, 1.50, p[1])));
    const f = kit.frame({ centre: his ? HIS_CRANIUM : CRANIUM, gather: [0, 0.018, -1], hairline: his ? HIS_HAIRLINE : HAIRLINE });
    const capped = kit.cap(f, kit.pick({}, { around: 60, along: 28, shells: [0.0045] }));

    const rnd = kit.random(20261024);
    const TIE_OUT = add(f.gatherOnScalp, mul(f.TIE, 0.019));
    // out of the elastic a little back and down, over her nape, onto her upper back between her shoulder blades
    const path = [TIE_OUT, add(TIE_OUT, [0, -0.022, -0.034]), ...[[0, 1.530, -0.236], [0, 1.450, -0.238], [0, 1.380, -0.233], [0, 1.305, -0.224]].map(his ? tailIn : P)];
    const radiusAt = (s) => (s < 0.2 ? 0.0145 + (0.036 - 0.0145) * smoothstep(0, 0.2, s) : s < 0.6 ? 0.036 - 0.003 * smoothstep(0.2, 0.6, s) : 0.033 * (1 - 0.8 * smoothstep(0.6, 1.0, s)));
    const tl = kit.tailAxis({
      path, samples: kit.pick(40, 16), radiusAt, upTo: kit.long(1, SHORTEST),
      // a lazy sway, as a fall of hair has
      sway: (s) => [0.005 * Math.sin(2 * Math.PI * (1.15 * s + 0.1)) * smoothstep(0.1, 0.5, s), 0, 0],
    });
    const tailWeights = kit.tailWeights(f.gatherOnScalp);
    kit.tailCore(tl, tailWeights, { radial: kit.pick(12, 8) });
    kit.tailClumps(tl, tailWeights, rnd, { ...kit.pick({}, { count: 12, seg: 10, width: [0.034, 0.02] }), wave: kit.long([0.009, 0.009], [0.004, 0.004]), flare: kit.long(0.35, 0.15) });
    kit.tie(tl, kit.head.weightsNear(f.gatherOnScalp), kit.pick({}, { U: 10, V: 5 }));

    // THE CURTAIN: from the middle parting over each temple, in front of her ears, to below her jaw
    kit.part('curtain', () => {
      for (const side of [-1, 1]) {
        // two layers: long strands from the parting over each temple and down past her jaw, and shorter ones under them
        // from her temple's hairline to her cheekbone, so no skin shows between them
        const layers = [
          { count: kit.pick(7, 3), lift: 0.0085, roots: (q) => [0.006, 1.676 + 0.016 * q, 0.004 - 0.040 * q], guide: (q) => [
            [0.036 + 0.006 * q, 1.668 - 0.002 * q, 0.006 - 0.030 * q], [0.058 + 0.006 * q, 1.632 - 0.004 * q, -0.008 - 0.024 * q],
            [0.069 + 0.004 * q, 1.585 - 0.006 * q, -0.020 - 0.022 * q], [0.066 + 0.005 * q, 1.525 - 0.010 * q, -0.030 - 0.016 * q],
            [0.060 + 0.008 * q, 1.478 - 0.012 * q, -0.040 - 0.010 * q], [0.058 + 0.010 * q, 1.446 - 0.016 * q, -0.046 - 0.008 * q]] },
          { count: kit.pick(4, 2), lift: 0.0068, roots: (q) => [0.040 + 0.016 * q, 1.648 - 0.022 * q, -0.004 - 0.026 * q], guide: (q) => [
            [0.060 + 0.004 * q, 1.615 - 0.008 * q, -0.016 - 0.020 * q], [0.066 + 0.003 * q, 1.565 - 0.010 * q, -0.028 - 0.016 * q],
            [0.064 + 0.004 * q, 1.520 - 0.010 * q, -0.036 - 0.010 * q]] },
        ];
        const widen = kit.pick(1, 2.2);
        for (const [li, layer] of layers.entries()) for (let c = 0; c < layer.count; c++) {
          const q = c / (layer.count - 1), j = () => (rnd() - 0.5);
          const lines = [layer.roots(q), ...layer.guide(q)].map((p) => [side * (p[0] + 0.002 * j()), p[1] + 0.002 * j(), p[2] + 0.002 * j()]).map(P);
          const seg = kit.pick(li === 0 ? 34 : 20, li === 0 ? 12 : 8);
          kit.lock({
            lines, seg, centre: f.C,
            place: (raw, s) => capped.overHair(raw, 0.0012 + (layer.lift + 0.0012 * c) * smoothstep(0, 0.3, s), 0.006 + 0.010 * smoothstep(0.15, 0.45, s) * (1 - 0.4 * smoothstep(0.7, 1, s)) + 0.003 * q + (li === 0 ? 0.003 : 0)),
            width: (s) => widen * (li === 0 ? 0.030 : 0.024) * (0.85 + 0.3 * rnd()) * (1 - 0.65 * smoothstep(0.65, 1, s)) * (0.55 + 0.45 * smoothstep(0, 0.12, s)),
            variant: (c + li + (side > 0 ? 1 : 3)) % 4, crossVariant: (c + li + 2) % 4,
            crossFrom: li === 0 ? 0.22 : 0.05, crossTo: 0.86,
            weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
            // the light file's wider cards would dip into her temple at their edges
            hold: kit.pick(null, (p) => kit.head.keepOff(p, 0.003, 0.02)),
          });
        }
      }
    });
    return { report: `tie on her scalp at ${f.gatherOnScalp.map((x) => x.toFixed(3)).join(', ')}; ponytail ends at ${tl.axis[tl.samples].map((x) => x.toFixed(3)).join(', ')}` };
  },
};
