/**
 * WAVY LOW PONYTAIL: Lena's hair (Joshua, 2026-11-14: "more hairstyles and colors so we can do Lena"; her picture,
 * `docs/reference/lena/lena-look-2026-11-14.png`). Full and wavy, parted off-centre on her LEFT and swept back loosely
 * with volume on top into a LOW ponytail at her nape, a little to her left, tied with a dark elastic; the tail of loose
 * waves comes round her left side and falls forward over her LEFT shoulder (+x) onto her collarbone and upper chest. A
 * long wavy strand is left loose by each side of her face, the one on her right longer, to her jaw.
 *
 * Her colour (black) is the material's: the file carries the copper atlas like every style.
 * Its SHORTEST (`shorter` at 1): the tail ends on top of her shoulder, and the face strands are a little shorter.
 */
import { add, mul, smoothstep } from '../vec.mjs';
import { CRANIUM, HAIRLINE } from './ponytail.mjs';

/** Where her part runs, metres to her left of her middle (GAME TUNING, read off her picture). */
const PART_X = 0.028;

export default {
  id: 'wavy-ponytail',
  name: 'Wavy low ponytail',
  build(kit) {
    const rnd = kit.random(20261114);
    // gathered low at her nape, a little to her left (where the tail leaves for her shoulder)
    const f = kit.frame({ centre: CRANIUM, gather: [0.30, -0.62, -1], hairline: HAIRLINE });
    // fuller than the ponytail on top and at her sides: loose hair, not pulled tight; the part a darker line where the
    // hair turns away from it
    const partLine = (c) => {
      const s = c.s, onTop = smoothstep(1.62, 1.66, s[1]) * smoothstep(-0.12, -0.04, s[2]);
      return 1 - 0.45 * onTop * Math.exp(-Math.pow((s[0] - PART_X) / 0.0035, 2));
    };
    const capped = kit.cap(f, {
      phiMax: 3.0, crown: [0.15, 1, 0.3], crownWidth: 0.8, thick: { base: 0.0085, crown: 0.016, sides: 0.012, gather: 0.008 }, tint: partLine, clear: 0.003,
      ...kit.pick({}, { around: 60, along: 28, shells: [0.005] }),
    });

    // THE SWEEP: loose wavy locks laid over the cap from her part, back and down round her head to the tie, so the top
    // reads as hair swept back loosely and not as a smooth shell
    const hold = (p) => kit.head.keepOff(p, 0.004, 0.025);
    kit.part('sweep', () => {
      const N = kit.pick(26, 8);
      for (let c = 0; c < N; c++) {
        const q = c / (N - 1), side = q < 0.42 ? 1 : -1, a = side > 0 ? q / 0.42 : (q - 0.42) / 0.58;
        // roots along the part (front to crown), falling to her side and round the back to the tie
        const root = [PART_X + side * 0.004, 1.672 - 0.004 * a, 0.0 - 0.07 * a * a];
        const sideX = side > 0 ? 0.074 : -0.078;
        const mid = [sideX * (0.75 + 0.2 * a), 1.635 - 0.02 * a, -0.05 - 0.04 * a];
        const low = [sideX * (0.8 - 0.1 * a), 1.565 - 0.02 * a, -0.115 - 0.02 * a];
        const tieNear = add(f.gatherOnScalp, [0.012 * side, 0.02, 0.01]);
        const lines = kit.waveLine([root, mid, low, tieNear], { samples: 14, amp: (s) => 0.003 * smoothstep(0.1, 0.4, s), turns: 2.2, across: [0, 1, 0], phase: rnd() });
        const seg = kit.pick(22, 9), w = kit.pick(0.026, 0.05) * (0.85 + 0.3 * rnd());
        kit.lock({
          lines, seg, centre: f.C,
          place: (raw, s) => capped.overHair(raw, 0.0018 + 0.0022 * Math.sin(Math.PI * s) + 0.0009 * (c % 3), 0.006),
          width: (s) => w * (0.6 + 0.4 * smoothstep(0, 0.15, s)) * (1 - 0.5 * smoothstep(0.75, 1, s)),
          variant: c % 4, crossVariant: (c + 2) % 4, crossFrom: 1, crossTo: 0, hold,
          shade: (s) => 0.98 + 0.1 * Math.sin(Math.PI * s), weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
        });
      }
    });

    // THE TAIL: out of the elastic, round her left side and forward over her left shoulder onto her collarbone and chest
    const TIE_OUT = add(f.gatherOnScalp, mul(f.TIE, 0.016));
    const path = [TIE_OUT, [0.078, 1.465, -0.135], [0.118, 1.43, -0.075], [0.124, 1.40, -0.040], [0.112, 1.355, -0.004], [0.100, 1.30, 0.060], [0.092, 1.245, 0.070]];
    const radiusAt = (s) => (s < 0.15 ? 0.013 + (0.03 - 0.013) * smoothstep(0, 0.15, s) : s < 0.6 ? 0.03 - 0.004 * smoothstep(0.15, 0.45, s) : 0.026 * (1 - 0.7 * smoothstep(0.6, 1.0, s)));
    const tl = kit.tailAxis({
      path, samples: kit.pick(40, 16), radiusAt, upTo: kit.long(1, 0.5), side: [0, 1, 0], transport: true, margin: 0.002, reach: 0.09,
      sway: (s) => [0, 0, 0.004 * Math.sin(2 * Math.PI * 1.6 * s) * smoothstep(0.3, 0.7, s)],
    });
    const tailWeights = kit.tailWeights(f.gatherOnScalp, 0.05, 0.4, 0.75, 0.25);
    kit.tailCore(tl, tailWeights, { radial: kit.pick(12, 8), coreScale: 0.6, tipIn: 0.8, hold: 0.002 });
    kit.tailClumps(tl, tailWeights, rnd, {
      ...kit.pick({ count: 48, seg: 30 }, { count: 12, seg: 12, width: [0.036, 0.02] }),
      wave: kit.long([0.013, 0.010], [0.006, 0.004]), waves: 2.3, out01: [0.5, 0.5], flare: kit.long(0.35, 0.2), clear: 0.006, holdEdges: true,
    });
    kit.tie(tl, kit.head.weightsNear(f.gatherOnScalp), { R: 0.0125, ...kit.pick({}, { U: 10, V: 5 }) });

    // THE FACE STRANDS: a long wavy strand loose by each side of her face, from her temple's hairline in front of her ear;
    // the one on her right longer, to her jaw
    kit.part('face-strands', () => {
      for (const side of [-1, 1]) {
        const longer = side < 0, n = kit.pick(5, 2);
        for (let c = 0; c < n; c++) {
          const q = c / (n - 1), x = side * (0.060 + 0.006 * q);
          const end = longer ? kit.long(1.445, 1.49) : kit.long(1.49, 1.525);
          const lines = kit.waveLine([
            [side * (PART_X * (side > 0 ? 1.2 : -0.6) + 0.02), 1.664, 0.002 - 0.01 * q], [side * 0.058, 1.642, -0.004 - 0.008 * q],
            [x + side * 0.010, 1.595, -0.004 - 0.01 * q], [x + side * 0.012, 1.55, -0.008 - 0.008 * q], [x + side * 0.006, end, -0.012 - 0.006 * q],
          ], { samples: 18, amp: (s) => 0.009 * smoothstep(0.3, 0.6, s), turns: 2.6, across: [side, 0, 0.4], phase: rnd() });
          const seg = kit.pick(30, 10), w = kit.pick(0.03, 0.05) * (0.85 + 0.3 * rnd());
          kit.lock({
            lines, seg, centre: f.C,
            place: (raw, s) => capped.overHair(raw, 0.002 + (0.008 + 0.001 * c) * smoothstep(0, 0.3, s), 0.008 + 0.006 * smoothstep(0.2, 0.5, s) + 0.002 * q),
            width: (s) => w * (0.55 + 0.45 * smoothstep(0, 0.12, s)) * (1 - 0.6 * smoothstep(0.65, 1, s)),
            variant: (c + (side > 0 ? 1 : 3)) % 4, crossVariant: (c + 2) % 4, crossFrom: 0.3, crossTo: 0.9, hold,
            weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
          });
        }
      }
    });
    return { report: `tie on her scalp at ${f.gatherOnScalp.map((x) => x.toFixed(3)).join(', ')}; tail ends at ${tl.axis[tl.samples].map((x) => x.toFixed(3)).join(', ')}` };
  },
};
