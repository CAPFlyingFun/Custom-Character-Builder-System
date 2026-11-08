/**
 * HER TORSO'S LANDMARKS, MEASURED ON HER BONE (the skeleton-outward plan, Phase 1: "Drive the womb from HER WEEKS... and
 * check its top against the landmarks": the pubic bone at 12 weeks, the navel at 20, the bottom of the breastbone at 36).
 *
 * From one cut down her midline (the same exact plane-triangle cut her pelvis is measured with, `cutPelvis`):
 *  - THE FRONT OF HER SPINE, height by height, from her sacral promontory up: the line a growing womb lies in front of.
 *    Between two vertebral bodies the cut finds no bone at the front (the disc is not in her skeleton's mesh), so the
 *    line bridges each gap with the bodies either side of it;
 *  - THE DISCS: each such gap, counted up from the promontory -- L5/S1, L4/L5, L3/L4, ... -- and HER NAVEL at the third,
 *    L3/L4: in a woman of normal weight the umbilicus lies level with the disc between her third and fourth lumbar
 *    vertebrae (BIOLOGICAL SHAPE: Moore, Clinically Oriented Anatomy). Her skeleton has no skin to find a navel on;
 *  - THE BOTTOM OF HER BREASTBONE (the xiphoid's tip): the lowest point of her sternum on her midline.
 *
 * Rest metres (+y up, +z her front, +x across her). Pure: plain arrays.
 */
import { cutPelvis, type P3 } from './pelvisMeasure';

/** How the cut is read. GAME TUNING (of the measuring, not of her): each a size on her skeleton, metres. */
export const TORSO_MEASURE = Object.freeze({
  /** the height of one sample of the spine's front */
  slice: 0.0025,
  /** how far up and down a gap is bridged by the bodies either side of it */
  window: 0.012,
  /** a sample whose front is this far behind the bodies either side of it is a gap between two of them (a disc) */
  gapDrop: 0.015,
  /** two gaps closer than this are one disc seen twice (a vertebral body is taller than this, thoracic ones too) */
  discMerge: 0.02,
  /** how far up from the promontory the spine is followed */
  reach: 0.32,
  /** the spine: anything this far in front of the promontory or more is not spine (her breastbone is far in front) */
  spineAhead: 0.04,
  /** the breastbone: on her midline, this far in front of the promontory and this far above it at least */
  sternumAhead: 0.08,
  sternumAbove: 0.1,
});

export interface TorsoMeasure {
  /** The front of her spine: [height, how far forward], from the promontory up, every `slice` (rest metres). */
  readonly spineFront: readonly (readonly [number, number])[];
  /** The discs' heights, up from the promontory: L5/S1, L4/L5, L3/L4, L2/L3, L1/L2, T12/L1, ... (rest metres). */
  readonly discs: readonly number[];
  /** Her navel's height: the L3/L4 disc's (rest metres). */
  readonly navel: number;
  /** The xiphoid's tip (rest metres). */
  readonly xiphoid: P3;
}

export class TorsoMeasureError extends Error {}

/** Her torso's landmarks from her skeleton's mesh (rest metres), her midline at `centreX`, above her `promontory`. */
export function measureTorso(points: ArrayLike<number>, triangles: ArrayLike<number>, centreX: number, promontory: P3): TorsoMeasure {
  const T = TORSO_MEASURE;
  // the midline cut: u is how far forward (z), v how high (y)
  const cut = cutPelvis(points, triangles, [centreX, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const samples: [number, number][] = [];
  for (let k = 0; k + 3 < cut.length; k += 4) {
    samples.push([cut[k], cut[k + 1]], [cut[k + 2], cut[k + 3]], [(cut[k] + cut[k + 2]) / 2, (cut[k + 1] + cut[k + 3]) / 2]);
  }
  // the spine's front, sample by sample (NaN where the cut finds no spine at all)
  const n = Math.round(T.reach / T.slice) + 1, ys: number[] = [], front: number[] = [];
  for (let i = 0; i < n; i++) {
    const y = promontory[1] + i * T.slice;
    let z = -Infinity;
    for (const [sz, sy] of samples) if (Math.abs(sy - y) <= T.slice / 2 && sz < promontory[2] + T.spineAhead && sz > z) z = sz;
    ys.push(y); front.push(z);
  }
  const w = Math.round(T.window / T.slice);
  const around = (i: number, side: -1 | 1) => { let z = -Infinity; for (let k = 1; k <= w; k++) { const j = i + side * k; if (j >= 0 && j < n) z = Math.max(z, front[j]); } return z; };
  // a gap: behind the bodies on BOTH sides of it
  const gap = front.map((z, i) => Math.min(around(i, -1), around(i, 1)) - z > T.gapDrop);
  const discs: number[] = [], counts: number[] = [];
  for (let i = 0; i < n; ) {
    if (!gap[i]) { i++; continue; }
    let j = i; while (j + 1 < n && gap[j + 1]) j++;
    const at = (ys[i] + ys[j]) / 2;
    // (a gap the cut breaks in two -- the bone's edge ragged at the disc -- is one disc)
    const last = discs.length - 1;
    if (last >= 0 && at - discs[last] < T.discMerge) { const k = (counts[last] ?? 1) + 1; discs[last] += (at - discs[last]) / k; counts[last] = k; } else { discs.push(at); counts.push(1); }
    i = j + 1;
  }
  if (discs.length < 3) throw new TorsoMeasureError(`found ${discs.length} discs above her promontory, not the three a navel needs`);
  // the line in front of the spine: each sample the most forward within a window either side (it bridges the discs)
  const spineFront: [number, number][] = [];
  for (let i = 0; i < n; i++) { const z = Math.max(front[i], around(i, -1), around(i, 1)); if (Number.isFinite(z)) spineFront.push([ys[i], z]); }
  // the breastbone's lowest point
  let xiphoid: P3 | null = null;
  for (const [sz, sy] of samples) {
    if (sz < promontory[2] + T.sternumAhead || sy < promontory[1] + T.sternumAbove) continue;
    if (!xiphoid || sy < xiphoid[1]) xiphoid = [centreX, sy, sz];
  }
  if (!xiphoid) throw new TorsoMeasureError('no breastbone on her midline');
  return { spineFront, discs, navel: discs[2], xiphoid };
}
