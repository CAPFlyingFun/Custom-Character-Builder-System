/**
 * HOW FLAT A GARMENT PRESSES HER NAVEL (`detailMaterials.ts` NAVEL_PRESS; Joshua, 2026-11-05, of her navel under the red
 * tee from the side: "boxy for some reason and not smooth following the rounded shape"). Every material row has a press;
 * paint presses nothing; a stretch knit presses more than a loose thick knit; a row it does not know presses as a stretch
 * knit does. And what shows of her pressed navel is drawn as it stood (`DetailSpots.cloth`'s navelShows): a positive
 * relief that much higher, between 1 and NAVEL_SHOWS_MOST times, an innie's dimple as it is.
 */
import { describe, expect, it } from 'vitest';
import { DETAIL_MATERIALS, NAVEL_PRESS, detailMaterial, navelPressOf } from '../src/sarahlab/detailMaterials';
import { NAVEL_SHOWS_MOST } from '../src/sarahlab/detailSpots';

describe('NAVEL_PRESS: how flat a garment presses her navel', () => {
  it('has a press for every material row, each 0 to 1, paint none', () => {
    for (const m of DETAIL_MATERIALS) {
      expect(NAVEL_PRESS[m.id], m.id).toBeGreaterThanOrEqual(0);
      expect(NAVEL_PRESS[m.id], m.id).toBeLessThanOrEqual(1);
    }
    for (const id of ['paintMedium', 'paintThin', 'paintThick']) expect(navelPressOf(detailMaterial(id))).toBe(0);
  });
  it('a stretch knit presses more than a loose thick knit; nothing known, a stretch knit\'s', () => {
    expect(navelPressOf(detailMaterial('athleticKnit'))).toBeGreaterThan(navelPressOf(detailMaterial('chunkySweater')));
    expect(navelPressOf(null)).toBe(NAVEL_PRESS.athleticKnit);
    expect(navelPressOf({ ...detailMaterial('fineJersey')!, id: 'nothing-known' })).toBe(NAVEL_PRESS.athleticKnit);
  });
  it('lets the drawn navel stand up to NAVEL_SHOWS_MOST times its pressed height', () => {
    expect(NAVEL_SHOWS_MOST).toBeGreaterThan(1);
  });
});
