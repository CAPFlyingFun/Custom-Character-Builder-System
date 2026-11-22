/**
 * SLICKED BACK: a men's cut built on HIS head (`--body male`). The top, about 9 cm at its longest, is combed straight
 * back close to his scalp from his hairline over his crown, a slight lift right at the front; the sides, about 1.5 cm,
 * are combed back too; the ends lie neatly at the back of his head above his nape, never down his neck. Smooth, with
 * the comb's lines showing: long locks lying flat on the cap, the cap's strands running front to back.
 *
 * LENGTH: 1 the top's longest 9 cm, 0 the shortest 5 cm (each lock's run along his head). Every number here is
 * GAME TUNING unless it says MEASURED.
 */
import { catmull, smoothstep } from '../vec.mjs';
import { HIS_CRANIUM, HIS_HAIRLINE } from './side-part.mjs';

/** A path cut at `upTo` of its run, resampled to `n` points (the count never depends on LENGTH). */
const along = (path, upTo, n) => Array.from({ length: n + 1 }, (_, k) => catmull(path, (k / n) * upTo));
/** The lowest a lock's end may lie at the back of his head (above his nape: his hairline there is about y 1.51). */
const LOWEST = 1.55;

export default {
  id: 'slicked-back',
  name: 'Slicked back',
  build(kit) {
    const { head } = kit, rnd = kit.random(20261122);
    // gathered under his nape (cut away by the hairline, so no end shows), so the cap's strands run from his forehead back
    const f0 = kit.frame({ centre: HIS_CRANIUM, gather: [0, -1.4, -1], hairline: HIS_HAIRLINE });
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
    const capped = kit.cap(f, {
      // about 1.3 cm over his crown, rising toward his forehead; the sides 6-7 mm
      phi0: 0.03, phiMax: 2.9, crown: [0, 1, 0.5], crownWidth: 0.8, clear: 0.002, hub: false,
      thick: { base: kit.long(0.0055, 0.0045), crown: kit.long(0.012, 0.007), sides: 0, gather: 0 },
      ...kit.pick({ around: 128, along: 60 }, { around: 60, along: 28, shells: [0.003] }),
    });
    const weightsAt = (p) => head.weightsNear(capped.capPoint(p));
    const hold = (p) => head.keepOff(p, 0.0025, 0.03);

    kit.part('combed', () => {
      // THE TOP: rows of locks rooted across his head (from his hairline back toward his crown), each combed straight
      // back over his crown; the rows overlap so the comb lines run unbroken to the back of his head
      const COLS = kit.pick(15, 6), ROWS = kit.pick(3, 2);
      for (let row = 0; row < ROWS; row++) for (let c = 0; c < COLS; c++) {
        const q = c / (COLS - 1), x = (q - 0.5) * 0.11 * (1 - 0.15 * row), dz = -0.035 * row;
        const zFront = 0.004 - 0.02 * Math.pow(Math.abs(x) / 0.055, 2) + dz;
        const path = [
          [x, 1.666 + 0.01 * row, zFront], [x * 1.05, 1.69, zFront - 0.035], [x * 1.08, 1.69, -0.08],
          [x * 1.1, 1.66, -0.13], [x * 1.05, 1.60, -0.17], [x, LOWEST, -0.17],
        ];
        const lines = along(path, kit.long(0.62, 0.36) * (0.95 + 0.05 * rnd()) + 0.08 * row, 10);
        const lift = 0.003 + 0.0012 * row + 0.001 * rnd(), w = kit.pick(0.024, 0.04) * (0.75 + 0.5 * rnd()), first = row === 0 ? 1 : 0, tone = 0.85 + 0.25 * rnd();
        kit.lock({
          lines, seg: kit.pick(22, 9), centre: f.C,
          // the slight lift right at the front hairline
          shade: (s) => tone * (0.82 + 0.22 * smoothstep(0, 0.2, s)),
          place: (raw, s) => capped.overHair(raw, lift + 0.007 * first * Math.sin(Math.PI * Math.min(1, s * 4)), 0.003),
          width: (s) => w * (0.75 + 0.25 * smoothstep(0, 0.1, s)) * (1 - 0.4 * smoothstep(0.8, 1, s)),
          variant: (c + row) % 4, crossVariant: (c + 2) % 4, crossFrom: 1, crossTo: 0,
          weightsAt, hold,
        });
      }
      // THE SIDES: short locks from his temples combed back over his ears' tops to the back of his head
      for (const side of [-1, 1]) {
        const N = kit.pick(5, 2);
        for (let c = 0; c < N; c++) {
          const q = c / (N - 1), y = 1.645 - 0.04 * q;
          // rooted 1.5 cm behind the temple's hairline, so their square ends lie on the cap and not stacked on its edge
          const path = [[side * 0.068, y, -0.058 - 0.02 * q], [side * 0.078, y - 0.005, -0.09], [side * 0.072, y - 0.01, -0.13], [side * 0.05, Math.max(LOWEST + 0.01, y - 0.03), -0.16]];
          const lines = along(path, kit.long(1, 0.65), 6), w = kit.pick(0.016, 0.028);
          kit.lock({
            lines, seg: kit.pick(12, 6), centre: f.C,
            place: (raw) => capped.overHair(raw, 0.0025, 0.003),
            width: (s) => w * (0.35 + 0.65 * smoothstep(0, 0.25, s)) * (1 - 0.4 * smoothstep(0.7, 1, s)),
            variant: c % 4, crossVariant: (c + 1) % 4, crossFrom: 1, crossTo: 0,
            weightsAt, hold,
          });
        }
      }
    });
    return { report: 'combed back' };
  },
};
