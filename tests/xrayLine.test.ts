/**
 * X-RAY (Phase 1 step 5): the slider's line says what it does -- off at 0, her bones see-through above it.
 */
import { describe, expect, it } from 'vitest';
import { SARAH_LAB_FIELD, xrayLine } from '../src/sarahlab/sarahLabTool';

describe('the X-RAY slider', () => {
  it('reads off at 0 and names what goes see-through above it', () => {
    expect(SARAH_LAB_FIELD.xray).toBe('sarahlab-xray');
    expect(xrayLine(0)).toBe('X-RAY · off');
    expect(xrayLine(60)).toContain('X-RAY 60%');
    expect(xrayLine(60)).toContain('bones see-through');
    expect(xrayLine(250)).toContain('100%');
    expect(xrayLine(Number.NaN)).toBe('X-RAY · off');
  });
});
