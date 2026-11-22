/**
 * CURLY TOP: a man's cut with the sides and back faded short and a mass of tight curls on top. The fade is the cap
 * alone, a few millimetres thick over his scalp (shortest at his nape and over his ears); the top is a fuller cap
 * under many small coiled locks, each a ribbon wound round its own axis like a spring, so it reads as curls and not
 * as straight strands from every side. The fringe's curls lean forward and fall a little onto the top of his forehead.
 *
 * LENGTH is the curls' length: about 5.5 cm at the longest, about 2.8 cm at the shortest (the fade is the same at both).
 * Built on HIS head (`--body male`); every number is in her rest frame, which his head is read into.
 */
import { add, cross, dot, len, mul, smoothstep, sub, unit } from '../vec.mjs';

/** His hairline from his forehead round his left side to his nape (GAME TUNING off the brief's MEASURED landmarks:
 * his temples covered, the line going back about 1.5 cm from the corner of his forehead then down in front of his ear
 * into a sideburn about 1.2 cm wide to the middle of his ear, over his ear and down to his nape). */
export const MALE_HAIRLINE = [
  [0.000, 1.668, 0.004], [0.022, 1.668, 0.000], [0.044, 1.658, -0.010], [0.058, 1.648, -0.022], [0.066, 1.628, -0.038],
  [0.071, 1.610, -0.056], [0.074, 1.598, -0.070], [0.075, 1.565, -0.075], [0.079, 1.563, -0.086], [0.082, 1.606, -0.097],
  [0.080, 1.618, -0.110], [0.072, 1.578, -0.126],
  [0.058, 1.554, -0.136], [0.030, 1.546, -0.146], [0.000, 1.545, -0.150],
];
/** The curly top's own hairline (the man bun keeps MALE_HAIRLINE): the side-part style's temples and sideburn
 * (hair-male-parted, d71cf44: back about 1.2 cm from the forehead's corner, straight down in front of his ear to a
 * sideburn about 1.2 cm wide to y 1.565, over his ear) with this cut's nape at y 1.545 (GAME TUNING). */
const CURLY_HAIRLINE = [
  [0.000, 1.668, 0.004], [0.022, 1.668, 0.000], [0.042, 1.666, -0.016], [0.054, 1.656, -0.030], [0.064, 1.628, -0.056],
  [0.070, 1.598, -0.070], [0.073, 1.566, -0.075], [0.077, 1.565, -0.086], [0.080, 1.600, -0.097], [0.076, 1.632, -0.108],
  [0.074, 1.630, -0.122], [0.066, 1.590, -0.138], [0.052, 1.556, -0.146], [0.028, 1.546, -0.150], [0.000, 1.545, -0.150],
];
/** The middle of his cranium (the brief's MEASURED estimate). */
export const MALE_CRANIUM = [0, 1.600, -0.070];
/** The curls' length, metres: longest, shortest (GAME TUNING, the brief: 5-6 cm and 2.5-3 cm). */
const CURL = [0.055, 0.028];

export default {
  id: 'curly-top',
  name: 'Curly top',
  build(kit) {
    const rnd = kit.random(20261121);
    const f = kit.frame({ centre: MALE_CRANIUM, gather: [0, 1, 0.1], hairline: CURLY_HAIRLINE });
    // the fade: about 2.5 mm on his sides and back (1.2 of base and the kit's own 1.3), thinning to about 1.3 mm at
    // the hairline as the kit tapers it; one close shell and a fine repeat so it reads short and dense, not as long
    // strands. phiMax 3.13 so its grid reaches down past his sideburns (at 2.75 it stopped above his temples and the
    // hairline there had no cap to keep); the top a fuller cap round the crown, wider toward the front, that the curls stand on (GAME TUNING)
    const capped = kit.cap(f, {
      phiMax: 3.13, crown: unit([0, 1, 0.35]), crownWidth: 0.68, clear: 0.002, uRepeat: 18, shells: kit.pick([0.0008], []),
      thick: { base: 0.0012, crown: kit.long(0.016, 0.010), sides: 0, gather: kit.long(0.004, 0.002) },
      ...kit.pick({}, { around: 60, along: 28 }),
    });

    // ---------------------------------------------------------------------------------------------------------------
    // THE CURLS: roots spread evenly over the top of his scalp (a Fibonacci spiral of directions from his cranium's
    // middle), kept to the top -- above his temples and well inside his hairline -- so the sides stay faded
    const L = kit.long(CURL[0], CURL[1]);
    const N = kit.pick(260, 70), SEG = kit.pick(36, 14);
    const roots = [];
    for (let i = 0; i < 1400 && roots.length < N; i++) {
      const y = 1 - (i + 0.5) / 700, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.399963;
      if (y < 0.25) continue;
      const d = unit([r * Math.sin(a), y, r * Math.cos(a)]), dist = kit.head.raycast(f.C, d);
      if (!Number.isFinite(dist)) continue;
      const s = add(f.C, mul(d, dist)), m = f.hairMask(s);
      // the top: inside the hairline, down to his temples at the front-sides (so no flat cap shows there); the back of the crown down to about 1.64 m
      if (m < 0.004 || s[1] < (s[2] > -0.04 ? 1.612 : 1.640)) continue;
      roots.push(s);
    }
    kit.part('curls', () => {
      for (const [c, s] of roots.entries()) {
        const n = unit(sub(s, f.C));
        const front = smoothstep(-0.04, 0.0, s[2]);          // the fringe's curls
        const side = Math.abs(s[0]) / 0.07;
        // each curl's axis: out of his scalp, leaning forward a little (more at the fringe, which falls onto his
        // forehead), and out over his sides; the length is a little shorter toward the edges of the top
        // each curl's axis fans out from the top of his head over his scalp, half lying on it and half standing off it,
        // so the top reads as one mass of curls and not spikes; the fringe's curls stand up into the mass and droop less, so
        // none hangs loose over his forehead
        const away = unit(add(sub(s, [0, s[1], 0]), [0, 0, 0.02]));
        const tang = unit(sub(away, mul(n, dot(away, n))));
        const lean = add(mul(n, 0.6 + 0.1 * front), mul(tang, 0.75 - 0.25 * front));
        const ax = unit(add(lean, [0.15 * (rnd() - 0.5), 0.15 * (rnd() - 0.5), 0.15 * (rnd() - 0.5)]));
        const h = L * (0.5 + 0.4 * rnd()) * (1 - 0.25 * smoothstep(0.6, 1, side));
        // its coil: a radius of 4-6 mm, 2.5-4 turns; held a little into the cap at its root so it grows out of the hair
        const coilR = (0.004 + 0.002 * rnd()) * (0.8 + 0.2 * (L / CURL[0])), turns = 2.5 + 1.5 * rnd(), ph0 = rnd() * 6.283;
        const u0 = unit(cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), u1 = cross(ax, u0);
        const base = capped.overHair(add(s, mul(n, 0.01)), -0.004, 0.003);
        const pts = [], nrm = [], along = [], widths = [];
        for (let k = 0; k <= SEG; k++) {
          const t = k / SEG, ph = ph0 + turns * 2 * Math.PI * t, rr = coilR * (0.6 + 0.4 * smoothstep(0, 0.15, t));
          // the axis droops at its tip, as a long curl's does
          const centre = add(base, add(mul(ax, h * t), mul([0, -1, 0], 0.4 * (1 - 0.6 * front) * h * t * t)));
          const radial = add(mul(u0, Math.cos(ph)), mul(u1, Math.sin(ph)));
          pts.push(kit.head.keepOff(add(centre, mul(radial, rr)), 0.002, 0.03));
          nrm.push(radial); along.push(ax);
          // the ribbon spreads along its axis, almost a pitch wide, so the coil reads closed from the side
          widths.push(kit.pick(1, 1.7) * (h / turns) * 0.95 * (1 - 0.6 * smoothstep(0.8, 1, t)));
        }
        const wts = kit.head.weightsNear(capped.capPoint(s));
        kit.card(pts, along, widths, nrm, c % 4, (t) => 0.85 + 0.2 * t, () => wts, 0, 1, (p) => kit.head.keepOff(p, 0.0015, 0.03));
      }
    });
    return { report: `${roots.length} curls, ${L.toFixed(3)} m at their longest` };
  },
};
