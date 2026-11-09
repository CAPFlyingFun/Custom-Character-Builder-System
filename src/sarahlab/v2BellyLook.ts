/**
 * v2'S BELLY AS THE ROOM COMPOSES IT, standing (Joshua, 2026-11-09: "we need to make sure we copy everything over to
 * v3's belly skin... it's not just a pregnancy sim, but will be used as the base body for all the female characters").
 *
 * The weights the room gives v2's morph targets and shape fields for her belly at a size, her belly curve and her Body
 * panel's belly controls -- the belly-region parts of SarahLabScene's `lookWeights`, `applyMotion`'s resting size tilt and
 * `fieldWeightsAt`, from the same functions they call. Used to measure v2's composed belly for v3
 * (`scripts/measureV2Shapes.ts`). Left out: her navel (its own piece, carried over with the navel), her breasts and
 * chest, the seated and moving shapes (v3's own settle and spring), her birth area and arms.
 */
import type { BodyShape } from '../actor/bodyShape';
import { BELLY_MOTION, BELLY_UPPER_TARGET, bellyUpperWeight, bellyWeights, bodyShapeFieldWeights, effectiveTiltDeg, sizeTiltDeg } from './sarahLabTool';
import type { BellyCurve } from './bellyInterpolation';
import { babyFieldWeights, groinFieldWeights, sidesFieldWeights, UPPER_FIELD_PREFIX, ZERO_FIELD, zeroRefineWeight } from './zeroRefine';

/** The anchors v2's refinement weights are read against (zeroRefine.ts `sidesAnchors`, `babyAnchors`, `groinAnchors`). */
export interface V2Anchors { readonly sides: readonly number[]; readonly baby: readonly number[]; readonly groin: readonly number[] }

/** Her morph targets' and shape fields' weights for her belly at `bump` %, standing. */
export function v2BellyLook(body: BodyShape, bump: number, curve: BellyCurve, anchors: V2Anchors): { morphs: Record<string, number>; fields: Record<string, number> } {
  const morphs: Record<string, number> = { ...bellyWeights(bump, curve), [BELLY_UPPER_TARGET]: bellyUpperWeight(bump, curve) };
  // (the bump's resting tilt from its size, standing: bellyMotionWeights' tilt with no lean and no spring)
  morphs[BELLY_MOTION.tilt] = (sizeTiltDeg(bump, effectiveTiltDeg(body.bellyTilt, 0)) * (Math.PI / 180)) / BELLY_MOTION.tiltRad;
  const fields: Record<string, number> = { ...bodyShapeFieldWeights(body, bump, curve), [ZERO_FIELD]: zeroRefineWeight(bump, curve) };
  for (const [key, w] of Object.entries(bellyWeights(bump, curve))) fields[UPPER_FIELD_PREFIX + key] = w;
  Object.assign(fields, sidesFieldWeights(bump, anchors.sides, curve), groinFieldWeights(bump, anchors.groin, curve), babyFieldWeights(bump, body.babyWeight, anchors.baby, curve));
  return { morphs, fields };
}

/** v2's belly controls v3 carries over, with the values each is measured at (its least and most; its default between). */
export const V2_BELLY_CONTROLS = Object.freeze(['bellyTilt', 'bellyHeight', 'bellyWidth', 'bellyDepth', 'bellyUpper', 'bellyLower', 'babyWeight'] as const);
export type V2BellyControl = (typeof V2_BELLY_CONTROLS)[number];
/** The belly sizes v2's composed belly is measured at, and each control's change at (`scripts/measureV2Shapes.ts`). */
export const V2_SIZES = Object.freeze(Array.from({ length: 41 }, (_, i) => i * 5));
export const V2_CONTROL_SIZES = Object.freeze([0, 25, 50, 75, 100, 125, 150, 175, 200]);
