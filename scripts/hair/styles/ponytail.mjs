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
/** How much of its path the shortest ponytail keeps: to the base of her neck (GAME TUNING; MEASURED end y about 1.43 m). */
const SHORTEST = 0.62;

export default {
  id: 'ponytail',
  name: 'Ponytail',
  build(kit) {
    const f = kit.frame({ centre: CRANIUM, gather: [0, 0.018, -1], hairline: HAIRLINE });
    const capped = kit.cap(f, kit.pick({}, { around: 60, along: 28, shells: [0.0045] }));

    const rnd = kit.random(20261024);
    const TIE_OUT = add(f.gatherOnScalp, mul(f.TIE, 0.019));
    // out of the elastic a little back and down, over her nape, onto her upper back between her shoulder blades
    const path = [TIE_OUT, add(TIE_OUT, [0, -0.022, -0.034]), [0, 1.530, -0.236], [0, 1.450, -0.238], [0, 1.380, -0.233], [0, 1.305, -0.224]];
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
          const lines = [layer.roots(q), ...layer.guide(q)].map((p) => [side * (p[0] + 0.002 * j()), p[1] + 0.002 * j(), p[2] + 0.002 * j()]);
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
