/**
 * LONG LOOSE HAIR (Joshua, 2026-11-14: "create different hairstyles, hair length and color"). Long hair worn down,
 * parted in the middle: from the part it falls down both sides of her head, over her ears (a little of each lobe may
 * show), behind her shoulders and down her back to the middle of her back as ONE full mass -- not a rope -- with two
 * locks each side brought forward over the front of her shoulder onto her upper chest, ending above her bust. Mostly
 * straight, soft waves in its lower third, its tips thinning out.
 *
 * Built from many `kit.lock` strands over the cap (the kit has no curtain builder): the BACK MASS (two layers of wide
 * locks from the back of her scalp down her back), the SIDE FALLS (from the part over her temples and ears, behind her
 * shoulders) and the FRONT LOCKS. Each strand's guide line is laid along a long path and cut by LENGTH (`along`), so
 * both lengths make the same points.
 *
 * LENGTH: at 1 the back reaches mid-back (y about 1.20) and the front locks her upper chest (y about 1.34); at 0 it is
 * shoulder length: the back ends at the base of her neck / tops of her shoulders (y about 1.42), the front locks at her
 * collarbones.
 *
 * WEIGHTS: on her head her scalp's; below it a hanging point gives way to her neck between y 1.52 and 1.46, then to her
 * chest (her upper back) between 1.46 and 1.36; a front lock's chest share is her chest bone's blended half and half
 * with the skin it lies on (`weightsNear`), so it rides her shoulder and her chest.
 *
 * Her measurements below are MEASURED on her rest skin (`scripts/preview/body.mjs`): her back's surface at x 0 lies at
 * z -0.153 (y 1.22), -0.172 (1.28), -0.180 (1.34 to 1.37), -0.168 (1.43); her shoulders' tops y 1.44 (x 0.09), 1.425
 * (0.12), 1.419 (0.15); her chest's front at x 0.08 z 0.025 (y 1.34). Everything else is GAME TUNING, by eye.
 */
import { add, catmull, smoothstep } from '../vec.mjs';
import { CRANIUM, HAIRLINE } from './ponytail.mjs';

/** A guide path cut at `upTo` of its run, resampled to `n` points (so the count never depends on LENGTH). */
const along = (path, upTo, n = 14) => Array.from({ length: n + 1 }, (_, k) => catmull(path, (k / n) * upTo));
/** How much of a falling path's run ends it at height `y` (its height falls along it; found by halving). */
const runTo = (path, y) => { let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (catmull(path, m)[1] > y) lo = m; else hi = m; } return lo; };

export default {
  id: 'long-loose',
  name: 'Long loose hair',
  build(kit) {
    const { head } = kit, rnd = kit.random(20261115);
    // loose hair is gathered nowhere: the cap's rows run toward her nape
    const f = kit.frame({ centre: CRANIUM, gather: [0, -0.55, -1], hairline: HAIRLINE });
    // the middle part: a darker line on top where the hair turns away from it
    const partLine = (c) => {
      const s = c.s, onTop = smoothstep(1.62, 1.66, s[1]) * smoothstep(-0.12, -0.03, s[2]);
      return 1 - 0.45 * onTop * Math.exp(-Math.pow(s[0] / 0.0035, 2));
    };
    const capped = kit.cap(f, {
      phiMax: 3.0, crown: [0, 1, 0.1], crownWidth: 0.8, thick: { base: 0.008, crown: 0.012, sides: 0.011, gather: 0.006 }, tint: partLine, clear: 0.003,
      ...kit.pick({ around: 96, along: 40 }, { around: 60, along: 28, shells: [0.005] }),
    });
    // reach 6 cm: a light file's wide card can lean its edge 26 mm into her back (MEASURED, `parts.mjs --light`)
    const hold = (p) => head.keepOff(p, 0.004, 0.06);
    const NECK = new Map([[head.NECK, 1]]), CHEST = new Map([[head.CHEST, 1]]);
    /** What a point of a hanging strand rides: her scalp, then her neck, then `low(p)` (her chest / upper back). */
    const hanging = (low) => (p) => {
      const a = 1 - smoothstep(1.46, 1.52, p[1]), b = 1 - smoothstep(1.36, 1.46, p[1]);
      const top = head.blendWeights(head.weightsNear(capped.capPoint(p)), NECK, a);
      return b > 0 ? head.blendWeights(top, low(p), b) : top;
    };
    const backWeights = hanging(() => CHEST);
    const frontWeights = hanging((p) => head.blendWeights(head.weightsNear(p), CHEST, 0.5));
    /** Soft waves in the lower third, side to side; none above. */
    const waved = (pts, amp, phase, across = [1, 0, 0]) => pts.map((p, k) => {
      const s = k / (pts.length - 1), a = amp * smoothstep(0.55, 0.9, s) * Math.sin(2 * Math.PI * (2.2 * s + phase));
      return add(p, [across[0] * a, across[1] * a, across[2] * a]);
    });
    const strand = (lines, { seg, w, lift, offSkin, variant, weightsAt, cross = [0.25, 0.9] }) => kit.lock({
      lines, seg, centre: f.C,
      place: (raw, s) => capped.overHair(raw, 0.0015 + lift * smoothstep(0, 0.25, s), offSkin(s)),
      // full at the root, the tips thinning out
      width: (s) => w * (0.6 + 0.4 * smoothstep(0, 0.1, s)) * (1 - 0.7 * smoothstep(0.72, 1, s)),
      variant, crossVariant: (variant + 2) % 4, crossFrom: cross[0], crossTo: cross[1], hold, weightsAt,
      shade: (s) => 0.96 + 0.1 * smoothstep(0, 0.3, s) - 0.06 * smoothstep(0.85, 1, s),
    });

    // THE BACK MASS: from the back of her scalp, over the back of her head, out over her nape and down her back; two
    // layers (the inner one narrower and nearer her) so no skin shows between the strands
    kit.part('back', () => {
      for (const [layer, N] of [[0, kit.pick(14, 5)], [1, kit.pick(18, 6)]]) for (let c = 0; c < N; c++) {
        const q = N === 1 ? 0.5 : c / (N - 1), x = (q - 0.5) * 2, j = () => rnd() - 0.5;
        const spread = layer ? 1 : 0.85, xb = 0.15 * x * spread;
        const end = kit.long(1.14 + 0.025 * Math.abs(x) + 0.015 * j(), 1.29 + 0.01 * Math.abs(x));
        const path = [
          [0.055 * x, 1.668, -0.07], [0.085 * x, 1.615, -0.155], [0.095 * x, 1.54, -0.19],
          [0.13 * x * spread, 1.48, -0.2], [xb, 1.42, -0.212], [xb * 1.04, 1.35, -0.21], [xb * 1.03, 1.27, -0.192], [xb, 1.18, -0.17], [xb * 0.97, 1.1, -0.15],
        ].map((p) => [p[0] + 0.004 * j(), p[1], p[2]]);
        // cut where her LENGTH ends it: the path's run measured down its height
        const upTo = runTo(path, end);
        const lines = waved(along(path, upTo), kit.long(0.008, 0.003), rnd());
        strand(lines, {
          seg: kit.pick(30, 11), w: kit.pick(0.04, 0.085) * (0.85 + 0.3 * rnd()), lift: 0.004 + 0.004 * layer,
          offSkin: (s) => 0.006 + (layer ? 0.010 : 0.005) * smoothstep(0.25, 0.5, s), variant: (c + layer) % 4, weightsAt: backWeights,
        });
      }
    });

    // THE SIDE FALLS: from the part over each temple, over her ear, behind her shoulder and down her back at its side
    kit.part('sides', () => {
      for (const side of [-1, 1]) {
        const N = kit.pick(14, 4);
        for (let c = 0; c < N; c++) {
          const q = c / (N - 1), j = () => rnd() - 0.5;
          const end = kit.long(1.17 + 0.02 * q + 0.015 * j(), 1.31);
          const path = [
            [side * 0.004, 1.676 - 0.01 * q, 0.002 - 0.06 * q], [side * 0.05, 1.655, -0.005 - 0.05 * q], [side * 0.086, 1.6, -0.03 - 0.05 * q],
            [side * 0.108, 1.54, -0.045 - 0.08 * q], [side * 0.112, 1.48, -0.09 - 0.07 * q], [side * 0.135, 1.43, -0.15 - 0.03 * q],
            [side * 0.155, 1.36, -0.185], [side * 0.155, 1.28, -0.178], [side * 0.15, 1.2, -0.162], [side * 0.145, 1.12, -0.15],
          ].map((p) => [p[0] + 0.003 * j(), p[1], p[2] + 0.003 * j()]);
          const upTo = runTo(path, end);
          const lines = waved(along(path, upTo, 16), kit.long(0.007, 0.003), rnd());
          strand(lines, {
            seg: kit.pick(32, 12), w: kit.pick(0.042, 0.085) * (0.85 + 0.3 * rnd()), lift: 0.006 + 0.0015 * c,
            offSkin: (s) => 0.007 + 0.006 * smoothstep(0.3, 0.5, s), variant: (c + (side > 0 ? 1 : 3)) % 4, weightsAt: backWeights,
          });
        }
      }
    });

    // THE FRONT LOCKS: two each side, from her temple in front of her ear, over the front of her shoulder onto her chest
    kit.part('front', () => {
      for (const side of [-1, 1]) {
        const N = kit.pick(4, 1);
        for (let c = 0; c < N; c++) {
          const q = N === 1 ? 0.5 : c / (N - 1), j = () => rnd() - 0.5;
          const path = [
            [side * 0.02, 1.674, 0.0 - 0.02 * q], [side * 0.06, 1.645, -0.006 - 0.01 * q], [side * 0.08, 1.59, -0.02 - 0.012 * q],
            [side * 0.092, 1.53, -0.03 - 0.012 * q], [side * 0.104, 1.47, -0.04 - 0.01 * q], [side * (0.115 + 0.015 * q), 1.43, -0.035],
            [side * (0.112 + 0.015 * q), 1.39, 0.01], [side * (0.105 + 0.016 * q), 1.335, 0.04],
          ].map((p) => [p[0] + 0.003 * j(), p[1] + 0.003 * j(), p[2]]);
          const lines = waved(along(path, runTo(path, kit.long(1.335, 1.36)), 16), kit.long(0.006, 0.002), rnd(), [0.6 * side, 0, 0.4]);
          strand(lines, {
            seg: kit.pick(32, 12), w: kit.pick(0.04, 0.07) * (0.85 + 0.3 * rnd()), lift: 0.008 + 0.002 * c,
            offSkin: (s) => 0.006 + 0.004 * smoothstep(0.3, 0.6, s), variant: (c + (side > 0 ? 2 : 0)) % 4, weightsAt: frontWeights,
          });
        }
      }
    });
    return { report: 'parted in the middle; back to y 1.19-1.22 (1.42 at its shortest), front locks to y 1.335' };
  },
};
