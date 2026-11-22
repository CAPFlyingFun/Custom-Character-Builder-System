/**
 * SIDE PART: a classic short men's cut, built on HIS head (`--body male`). A clean parting on his LEFT (+x) runs back
 * from his hairline over the top; the top, about 6.5 cm at its longest, is combed across to his right with a little
 * lift at the front; the sides and back are tapered short (about 1 cm, shorter at the nape and over his ears), his
 * sideburns down to about the middle of his ear.
 *
 * HOW IT IS BUILT: the cap (gathered at the top of his head, its thickness the cut's length: thin at the sides, thicker
 * on top), its parting a darker line (`tint`), and over its top a sheet of LOCKS rooted just to the right of the parting
 * and laid across his crown toward his right temple, plus a few short ones falling from the parting to his left.
 *
 * LENGTH: 1 the top's longest 6.5 cm (its locks run 6.5 cm from the parting), 0 the shortest 4 cm; the sides' cap a
 * little thinner too. Every number here is GAME TUNING unless it says MEASURED.
 */
import { add, catmull, smoothstep } from '../vec.mjs';

/** His hairline from his forehead round his LEFT side to his nape (a slight M at his temples, sideburns to mid-ear,
 *  up over his ear and down to his nape). GAME TUNING on the brief's MEASURED points of his head. */
export const HIS_HAIRLINE = [
  // the forehead's corner, back about 1.2 cm at the temple, then straight down in front of his ear as a sideburn about
  // 1.2 cm wide to mid-ear (y 1.565), up his ear's front, over it and down behind it. Up his ear's front it stands AHEAD of
  // his ear (z -0.090; at -0.097 the shortest cap lay 0.56 mm under the root of his ear's front: MEASURED by
  // `fit.mjs --body male`, 2026-11-21)
  [0.000, 1.668, 0.004], [0.022, 1.668, 0.000], [0.042, 1.666, -0.016], [0.054, 1.656, -0.030], [0.064, 1.628, -0.056],
  [0.070, 1.598, -0.070], [0.073, 1.566, -0.075], [0.077, 1.565, -0.086], [0.080, 1.612, -0.090], [0.076, 1.632, -0.108],
  [0.074, 1.630, -0.122],
  [0.066, 1.590, -0.138], [0.052, 1.540, -0.146], [0.028, 1.522, -0.150], [0.000, 1.518, -0.150],
];
/** The middle of his cranium (MEASURED in the brief). */
export const HIS_CRANIUM = [0, 1.60, -0.07];
/** Where his parting runs, metres to his left of his middle. */
const PART_X = 0.034;

/** A path cut at `upTo` of its run, resampled to `n` points (the count never depends on LENGTH). */
const along = (path, upTo, n) => Array.from({ length: n + 1 }, (_, k) => catmull(path, (k / n) * upTo));

export default {
  id: 'side-part',
  name: 'Side part',
  build(kit) {
    const { head } = kit, rnd = kit.random(20261121);
    // gathered under the hair over his right ear (cut away by the hairline), so the cap's strands run ACROSS his head with the sweep
    const f0 = kit.frame({ centre: HIS_CRANIUM, gather: [-0.8, -1.2, -0.25], hairline: HIS_HAIRLINE });
    // THE HAIRLINE'S SOFT EDGE: the cap's alpha ramps across about 5 mm of the hairline distance, about one grid cell
    // here, so its cut stepped along the cells. The distance is shrunk so the ramp spans about 2.5 cells (the light
    // file's cells are coarser, so more); the cut still falls at the same line. GAME TUNING.
    // The kit's distance is the ELEVATION gap times the radius, which along a steep run (the temple, the sideburn) is far
    // smaller than the true distance across the line, so the ramp there was under a cell: divided by the line's slope
    // it is the distance square to the line.
    const hairMask = (p) => {
      const q = [p[0] - f0.C[0], p[1] - f0.C[1], p[2] - f0.C[2]], L = Math.hypot(...q);
      const az = Math.atan2(q[0], q[2]), el = Math.asin(Math.max(-1, Math.min(1, q[1] / L)));
      const slope = (f0.hairlineEl(az + 1e-3) - f0.hairlineEl(az - 1e-3)) / 2e-3 / Math.max(0.2, Math.cos(el));
      return ((el - f0.hairlineEl(az)) * L) / Math.sqrt(1 + slope * slope) * kit.pick(0.4, 0.2);
    };
    const f = { ...f0, hairMask };
    // the parting: a darker line on top, from his hairline back to his crown
    const partLine = (c) => {
      const s = c.s, onTop = smoothstep(1.63, 1.66, s[1]) * smoothstep(-0.13, -0.09, s[2]);
      return 1 - 0.55 * onTop * Math.exp(-Math.pow((s[0] - PART_X) / 0.003, 2));
    };
    const capped = kit.cap(f, {
      // the volume on top: about 1.8 cm over his crown, fullest toward his forehead (the sweep's lift), the sides 6-7 mm
      phi0: 0.03, hub: false, phiMax: 3.13, crown: [0.15, 1, 0.45], crownWidth: 0.75, clear: 0.002, tint: partLine,
      thick: { base: kit.long(0.0052, 0.0042), crown: kit.long(0.017, 0.010), sides: 0, gather: 0 },
      ...kit.pick({ around: 128, along: 60 }, { around: 60, along: 28, shells: [0.003] }),
    });
    const weightsAt = (p) => head.weightsNear(capped.capPoint(p));

    kit.part('top', () => {
      // THE SWEEP: rows from his front hairline back to his crown, each rooted just right of the parting and laid across
      // his head toward his right temple; two layers so no cap shows through
      const ROWS = kit.pick(13, 5), LAYERS = kit.pick(2, 1);
      for (let li = 0; li < LAYERS; li++) for (let r = 0; r < ROWS; r++) {
        const q = r / (ROWS - 1), z = 0.004 - 0.112 * q + (li ? 0.004 : 0), front = 1 - smoothstep(0, 0.35, q);
        const y = 1.66 + 0.035 * Math.sin(Math.PI * Math.min(1, (0.004 - z) / 0.16));
        const path = [
          [PART_X - 0.002, y, z], [0.012, y + 0.02, z - 0.004], [-0.020, y + 0.012, z - 0.006],
          [-0.048, y - 0.02, z - 0.010 - 0.01 * q], [-0.066, y - 0.06, z - 0.016 - 0.01 * q],
        ];
        const lines = along(path, kit.long(1, 0.62) * (0.94 + 0.06 * rnd()), 8);
        const lift = 0.003 + 0.0015 * li + 0.001 * rnd(), w = kit.pick(0.03, 0.055) * (0.75 + 0.5 * rnd()), tone = 0.85 + 0.25 * rnd();
        kit.lock({
          lines, seg: kit.pick(18, 8), centre: f.C,
          // the front rows lift a little off his forehead's hairline, most a third of the way along
          shade: (s) => tone * (0.8 + 0.25 * smoothstep(0, 0.3, s)),
          place: (raw, s) => capped.overHair(raw, lift + 0.010 * front * Math.sin(Math.PI * Math.min(1, s * 1.5)) * kit.long(1, 0.6), 0.003),
          width: (s) => w * (0.7 + 0.3 * smoothstep(0, 0.15, s)) * (1 - 0.45 * smoothstep(0.7, 1, s)),
          variant: (r + li) % 4, crossVariant: (r + 2) % 4, crossFrom: 0.2, crossTo: 0.8, crossWidth: 0.5,
          weightsAt, hold: (p) => head.keepOff(p, 0.0025, 0.03),
        });
      }
      // THE SHORT SIDE: from the parting down to his left, short and neat
      const LEFT = kit.pick(7, 3);
      for (let r = 0; r < LEFT; r++) {
        const q = r / (LEFT - 1), z = -0.004 - 0.10 * q;
        const y = 1.66 + 0.03 * Math.sin(Math.PI * Math.min(1, (0.004 - z) / 0.16));
        const path = [[PART_X + 0.002, y, z], [0.052, y - 0.012, z - 0.006], [0.068, y - 0.04, z - 0.012]];
        const lines = along(path, kit.long(1, 0.7), 5), w = kit.pick(0.02, 0.04);
        kit.lock({
          lines, seg: kit.pick(10, 5), centre: f.C,
          place: (raw) => capped.overHair(raw, 0.0025, 0.003),
          width: (s) => w * (1 - 0.5 * smoothstep(0.6, 1, s)),
          variant: (r + 1) % 4, crossVariant: r % 4, crossFrom: 1, crossTo: 0,
          weightsAt, hold: (p) => head.keepOff(p, 0.0025, 0.03),
        });
      }
    });
    return { report: `parting at x ${PART_X}` };
  },
};
