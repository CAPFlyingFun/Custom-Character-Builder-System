/**
 * CREW CUT: his default hairstyle. The sides and back clipped short (about 7 mm, tapering to 3 mm at the nape and over
 * his ears), the top left longer (about 3 cm at its longest at the front, 1.5 cm at the crown), fuller at the front
 * and pushed a little up and forward. The top is a cap that thickens toward the front of his head, with short
 * textured clumps (locks) laid over it so it is not a smooth dome. Built on HIS head (`--body male`).
 *
 * Its shortest (`shorter` at 1): the sides about 3 mm, the top about 1.2 cm -- a short crew.
 */
import { add, mul, smoothstep } from '../vec.mjs';
import { MALE_HAIRLINE, MALE_CRANIUM, softEdge } from './buzz.mjs';

export default {
  id: 'crew',
  name: 'Crew cut',
  build(kit) {
    const f = softEdge(kit, kit.frame({ centre: MALE_CRANIUM, gather: [0, 1, -0.15], hairline: MALE_HAIRLINE }));
    const rnd = kit.random(20261121);
    const L = kit.length;

    // THE CAP. Its thickness is its length: the sides `base`, the top `crown` more, fullest toward the front of his
    // head (the crown's direction tilted forward). GAME TUNING.
    const capped = kit.cap(f, {
      phi0: 0.008, phiMax: 2.6, hub: false, crown: [0, 0.8, 0.6], crownWidth: 0.8,
      thick: { base: kit.long(0.0050, 0.0018), crown: kit.long(0.0165, 0.0075), sides: 0, gather: kit.long(0.002, 0.001) },
      shells: kit.pick([kit.long(0.0015, 0.0006), kit.long(0.0030, 0.0012)], [kit.long(0.0020, 0.0008)]),
      clear: 0.0025,
      // the kit darkens the roots where the rows gather; here they gather at his crown, which would show as a dark
      // spot there, so that darkening is undone (GAME TUNING)
      tint: (c) => 1 / (0.8 + 0.2 * Math.min(1, Math.max(0, c.t / 0.2)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, c.t / 0.2)))),
      ...kit.pick({ around: 120, along: 56 }, { around: 56, along: 26 }),
    });

    // THE TOP'S TEXTURE: short clumps over the top of his head, each rooted on the cap and swept forward and up a
    // little, longer toward the front (GAME TUNING). Laid on a grid of the top, jittered, the same count at both lengths.
    kit.part('top', () => {
      const ROWS = kit.pick(7, 3), COLS = kit.pick(9, 4);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const j = () => rnd() - 0.5;
        // z from the crown (-0.10) to the front hairline (-0.005); x across the top, narrower behind
        const qz = (r + 0.5 + 0.4 * j()) / ROWS, qx = (c + 0.5 + 0.4 * j()) / COLS - 0.5;
        const z = -0.105 + 0.098 * qz, x = qx * (0.085 + 0.02 * qz);
        const front = smoothstep(0.3, 1, qz);
        const root = [x, 1.70, z];
        // a clump runs forward 1.5 to 3 cm (shortened with the cut), and outward a little at the sides
        const run = (0.016 + 0.016 * front) * (0.45 + 0.55 * L) * (0.85 + 0.3 * rnd());
        const tip = [x * 1.15, 1.70, z + run];
        const mid = [x * 1.07, 1.70, z + run * 0.5];
        const lift = 0.6 + 1.4 * front; // the front rows stand up in a soft quiff (GAME TUNING)
        kit.lock({
          lines: [root, mid, tip], seg: kit.pick(8, 4), centre: f.C,
          // laid on the cap, rising off it toward its tip (pushed up a little at the front)
          place: (raw, s) => capped.overHair(raw, kit.long(0.0008, 0.0004) + kit.long(0.006, 0.002) * lift * Math.sin(Math.PI * Math.min(1, s * 0.8)), 0.004),
          width: (s) => kit.pick(0.020, 0.034) * (0.8 + 0.4 * rnd()) * (1 - 0.6 * smoothstep(0.55, 1, s)),
          variant: (r + c) % 4, shade: (s) => 0.82 + 0.3 * s, crossVariant: (r + c + 2) % 4, crossFrom: 0.1, crossTo: 0.8, crossWidth: 0.5,
          weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
          hold: (p) => kit.head.keepOff(p, 0.003, 0.03),
        });
      }
    });
    return { report: 'crew cut cap and top clumps' };
  },
};
