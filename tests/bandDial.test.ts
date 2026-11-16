import { describe, expect, it } from 'vitest';
import { LOW_BANDS, lowFrame, lowSpec } from '../src/sarahlab/bottomCut';
import { BAND_DIAL, COVERAGE_DIALS, COVERAGE_TEMPLATES, dialValue, dialsFor, withDial, wornParams } from '../src/sarahlab/paintTemplates';

const t = (id: string) => COVERAGE_TEMPLATES.find((x) => x.id === id)!.params;

describe('EDGING WIDTH: a drawn bottom\'s waistband\'s band, in centimetres', () => {
  it('is offered for a bottom whose edges are drawn, and for nothing else', () => {
    for (const id of ['leggingsUnder', 'leggingsHigh', 'leggingsLow', 'shortsBike']) expect(dialsFor(t(id))).toContain('band');
    for (const id of COVERAGE_TEMPLATES.map((x) => x.id)) { const p = t(id); if (p.riseFront === null || p.hemFront !== null || p.neckFront !== null || p.legCut || p.outline) expect(dialsFor(p), id).not.toContain('band'); }
    expect(COVERAGE_DIALS.find((d) => d.id === 'band')).toMatchObject({ min: BAND_DIAL.min, max: BAND_DIAL.max });
  });
  it('reads the template\'s own band, or the plain one where it says none', () => {
    expect(dialValue(t('leggingsUnder'), 'band')).toBeCloseTo(1.5, 9);
    expect(dialValue(t('leggingsHigh'), 'band')).toBeCloseTo(10.5, 9);
    expect(BAND_DIAL.unset / 100).toBe(LOW_BANDS.waist);
    expect(dialValue({ ...t('leggingsUnder'), lowBand: undefined }, 'band')).toBeCloseTo(BAND_DIAL.unset, 9);
  });
  it('moves the band the shader is told, keeps the template\'s other bands, and is held to its range', () => {
    const p = withDial(t('leggingsUnder'), 'band', 1);
    expect(p.lowBand).toEqual({ ...t('leggingsUnder').lowBand, waist: 0.01 });
    expect(dialValue(p, 'band')).toBeCloseTo(1, 9);
    expect(dialValue(withDial(p, 'band', 0), 'band')).toBeCloseTo(BAND_DIAL.min, 9);
    // (a hoop's is held to what its band stays whole at; another waistband's to the slider's own most)
    expect(dialValue(withDial(p, 'band', 99), 'band')).toBeCloseTo(BAND_DIAL.hoopMax, 9);
    expect(dialValue(withDial(t('leggingsHigh'), 'band', 99), 'band')).toBeCloseTo(BAND_DIAL.max, 9);
    // (nothing else of it moves)
    const { lowBand: _a, ...rest } = p, { lowBand: _b, ...own } = t('leggingsUnder');
    expect(rest).toEqual(own);
  });
  it('a look saved with a width keeps it', () => {
    const saved = withDial(t('leggingsUnder'), 'band', 1.2);
    expect(dialValue(wornParams('leggingsUnder', saved), 'band')).toBeCloseTo(1.2, 9);
  });
});
void lowFrame; void lowSpec;
