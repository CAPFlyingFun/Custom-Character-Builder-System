/**
 * BOB (Joshua, 2026-11-14: "create different hairstyles, hair length and color"): a classic bob. Parted a little to her
 * LEFT, the hair falls straight and smooth from the part and the crown down both sides and the back to ONE even length
 * all round, its ends turned slightly under toward her neck and jaw. Full at the sides (it stands off her head by her
 * cheeks), neat at the back, her ears covered. No tail, no tie, no fringe: her forehead stays clear.
 *
 * HOW IT IS BUILT: the toolkit's cap (a shell over her scalp, alpha-cut at her hairline, its strands running toward her
 * nape) and, over it, one LOCK for each of `N` azimuths round her head's upright axis. A lock starts at the part (or,
 * at the back, her crown), is laid over the cap down to her ears' level and from there hangs on a PROFILE: the
 * outermost her surface stands at that azimuth and height (`outerReach`, MEASURED on her, marching in from outside),
 * taken as the widest it has been anywhere ABOVE that height (hair falls straight off the widest part of her skull, and
 * stands clear of her cheeks and over her ears), plus a gap for the hair's own volume, less a turn under over the last
 * few centimetres. Every point is held off her skin (`keepOff`).
 *
 * LENGTH: 1 is a long bob, its ends just above her shoulders (y 1.452 at her sides and front, her nape 1.464);
 * 0 is a short bob at her jaw and ear lobes (y 1.532, her nape 1.544). The same locks, the same points: only the hem
 * line's height differs (`kit.long`).
 *
 * WEIGHTS: all of it follows her head; the lowest ends take up to 40% of her neck's weight (`NECK_SHARE`), so
 * they stay on her neck's side and do not cut into it when she turns her head.
 */
import { add, mul, smoothstep } from '../vec.mjs';
import { CRANIUM, HAIRLINE, HIS_CRANIUM, HIS_HAIRLINE, onHim } from './ponytail.mjs';

/** Where her part runs, metres to her left of her middle (Joshua's brief: about 2.5 cm; GAME TUNING). */
const PART_X = 0.025;
/** The hem's height when longest and shortest at her front and sides (metres; GAME TUNING to the brief: long just
 *  above her shoulders (MEASURED: her shoulders' skin starts under y 1.43 beside her neck), short at her ear lobes). */
const HEM = [1.452, 1.532];
/** How much shorter her nape is than her sides (metres; GAME TUNING). */
const NAPE_UP = 0.012;
/** The hair's own volume off the widest part of her, at her middle line and at her sides (metres; GAME TUNING). */
const GAP = [0.009, 0.017];
/** How far the ends turn under (metres, the last 4 cm; GAME TUNING). */
const TURN_UNDER = 0.013;
/** The most of her neck's weight the lowest ends take (GAME TUNING). */
const NECK_SHARE = 0.4;
/** The axis her head's azimuths are measured round (x, z); y is up (MEASURED: her cranium's middle). */
const HER_AXIS = [0, CRANIUM[2]];
/** Heights her profile is read at, top to bottom (metres). */
const Y_TOP = 1.66, Y_STEP = 0.02;

export default {
  id: 'bob',
  name: 'Bob',
  build(kit) {
    const rnd = kit.random(20261115);
    const his = kit.head.body.id === 'male', P = his ? onHim : (p) => p;
    const f = kit.frame({ centre: his ? HIS_CRANIUM : CRANIUM, gather: [0, 1, 0.05], hairline: his ? HIS_HAIRLINE : HAIRLINE });
    // on him the roots are laid by `overHair` on his own scalp and not moved by `onHim` (moved in at his crown, their
    // reach came to a peak over his head, GAME TUNING by eye)
    const AXIS = his ? [0, HIS_CRANIUM[2]] : HER_AXIS;
    const partLine = (c) => {
      const s = c.s, onTop = smoothstep(1.62, 1.66, s[1]) * smoothstep(-0.12, -0.02, s[2]);
      return 1 - 0.4 * onTop * Math.exp(-Math.pow((s[0] - PART_X) / 0.0035, 2));
    };
    const capped = kit.cap(f, {
      phi0: 0.03, hub: false, phiMax: 2.3, crown: [0.1, 1, 0.1], crownWidth: 0.8, thick: { base: 0.0085, crown: 0.014, sides: 0.012, gather: 0.008 }, tint: partLine, clear: 0.003,
      ...kit.pick({ around: 80, along: 34 }, { around: 60, along: 28, shells: [0.005] }),
    });

    // HER OUTERMOST SURFACE at an azimuth (0 her front, +90 her left) and height: marched in from 17 cm out until her
    // surface is within 3 mm (her ears, cheeks, jaw, neck and shoulders all count)
    const reachMemo = new Map();
    function outerReach(theta, y) {
      const key = `${theta.toFixed(4)},${y.toFixed(3)}`;
      if (reachMemo.has(key)) return reachMemo.get(key);
      const dx = Math.sin(theta), dz = Math.cos(theta);
      let reach = 0;
      for (let r = 0.17; r > 0.02; r -= 0.004) if (kit.head.nearest([AXIS[0] + dx * r, y, AXIS[1] + dz * r], 0.003)) { reach = r; break; }
      reachMemo.set(key, reach); return reach;
    }
    /** The widest it has been from this height up to her cranium's widest (so a lock falls straight off her skull). */
    function widestAbove(theta, y) {
      let w = 0;
      for (let yy = Y_TOP; yy >= y - 1e-9; yy -= Y_STEP) w = Math.max(w, outerReach(theta, yy));
      return w;
    }

    kit.part('bob', () => {
      const N = kit.pick(116, 28);
      // her front is left clear: the locks run from her temples (about 52 degrees off her front) round her back
      const FROM = 0.9, SPAN = 2 * Math.PI - 2 * FROM;
      for (let c = 0; c < N; c++) {
        const theta = FROM + SPAN * (c / (N - 1)) , sgn = Math.sin(theta) >= 0 ? 1 : -1;
        const back = smoothstep(2.0, 2.9, Math.abs(Math.atan2(Math.sin(theta), Math.cos(theta))));
        const hem = kit.long(HEM[0], HEM[1]) + NAPE_UP * back + 0.0015 * (rnd() - 0.5);
        const gap = GAP[0] + (GAP[1] - GAP[0]) * Math.abs(Math.sin(theta));
        // the profile, from the top of her head down to the hem
        const guide = [];
        const root = (his ? (q) => q : P)([PART_X + sgn * (0.003 + 0.014 * Math.abs(Math.sin(theta))), 1.680, AXIS[1] + 0.05 * Math.cos(theta)]);
        guide.push(root);
        guide.push((his ? (q) => q : P)([PART_X + sgn * (0.006 + 0.035 * Math.abs(Math.sin(theta))), 1.668, AXIS[1] + 0.07 * Math.cos(theta)]));
        const rows = 8;
        for (let k = 0; k <= rows; k++) {
          const y = 1.640 + (hem - 1.640) * (k / rows);
          const under = TURN_UNDER * smoothstep(hem + 0.04, hem, y);
          // on him the gap closes toward his crown, so the top rounds over his head and does not stand off it in a ridge
          // (GAME TUNING, by eye on his front and back views)
          const r = widestAbove(theta, y) + (his ? gap * (0.25 + 0.75 * smoothstep(1.645, 1.585, y)) : gap) - under;
          guide.push([AXIS[0] + Math.sin(theta) * r, y, AXIS[1] + Math.cos(theta) * r]);
        }
        const seg = kit.pick(34, 13), w = kit.pick(0.022, 0.05) * (0.9 + 0.2 * rnd());
        kit.lock({
          lines: guide, seg, centre: f.C,
          // on him the upper sides are lifted further off his head, which is narrower at its top than hers, so the bob rounds
          // over his crown instead of coming to a ridge (GAME TUNING, by eye on his front and back views)
          place: (raw, s) => (raw[1] > 1.63 ? capped.overHair(raw, his ? 0.002 + 0.0015 * (c % 3) + 0.011 * Math.abs(Math.sin(theta)) * smoothstep(1.63, 1.655, raw[1]) * (1 - smoothstep(1.67, 1.69, raw[1])) : 0.002 + 0.0015 * (c % 3), 0.006) : raw),
          width: (s) => w * (0.7 + 0.3 * smoothstep(0, 0.1, s)) * (1 - 0.12 * smoothstep(0.85, 1, s)),
          variant: c % 4, crossVariant: (c + 2) % 4, crossFrom: 0.25, crossTo: 0.93, hold: (p) => kit.head.keepOff(p, 0.004, 0.025),
          weightsAt: (p) => {
            const t = NECK_SHARE * smoothstep(1.56, 1.47, p[1]);
            return kit.head.blendWeights(kit.head.weightsNear(capped.capPoint(p)), new Map([[kit.head.NECK, 1]]), t);
          },
        });
      }
    });
    return { report: `bob hem at y ${kit.long(HEM[0], HEM[1]).toFixed(3)}` };
  },
};
