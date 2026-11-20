/**
 * HIS PELVIC ORGANS (the male base model's; Joshua, 2026-11-19: "redraw the organs for a male"). His bladder is laid as
 * hers is (`pelvicOrgans.ts` `layOrgans`: behind his pubic bone, rising as it fills); he has no womb, canal or ovaries;
 * under his bladder lies his PROSTATE, laid here off his pubic bone as the skeleton laid in him has it (his rest frame:
 * +y up, +z his front, +x across him, metres).
 *
 * BIOLOGICAL SHAPE (Gray's Anatomy; an adult's prostate, about 20 mL): a walnut about 4 cm across, 3 cm tall and 2.5 cm
 * front to back, its base against the neck of his bladder and its apex down by the lower edge of his pubic symphysis, about
 * 2 cm behind the back of the symphysis (the retropubic space between), with his rectum behind it.
 */
import type { PelvisLandmarks } from './pelvicOrgans';
import type { P3 } from './pelvisMeasure';

export const PROSTATE = Object.freeze({
  /** BIOLOGICAL SHAPE: its half sizes across, up and front to back, metres (4 x 3 x 2.5 cm). */
  radii: [0.02, 0.015, 0.0125] as const,
  /** BIOLOGICAL SHAPE: its middle this far behind the back of his symphysis (the retropubic space and its own front half). */
  behind: 0.03,
  /** BIOLOGICAL SHAPE: its middle this far above the lower edge of his symphysis (its apex near that edge). */
  above: 0.012,
});

/** Where his prostate lies, its middle and half sizes (metres, his rest frame). */
export function layProstate(p: PelvisLandmarks, at = PROSTATE): { centre: P3; radii: P3 } {
  const L = p.landmarks, x = L.symphysisTop[0], bottom = L.symphysisBottom, back = L.symphysisBack;
  return { centre: [x, bottom[1] + at.above, back[2] - at.behind], radii: [...at.radii] as P3 };
}
