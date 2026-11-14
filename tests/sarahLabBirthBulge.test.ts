import { describe, expect, it } from 'vitest';
import { birthBulgeLine, birthOpenLine } from '../src/sarahlab/sarahLabTool';

// The birth bulge is its own slider (Joshua, 2026-11-02): the opening no longer pushes the area out by itself.
describe('birth bulge line', () => {
  it('reads none at zero and centimetres out otherwise', () => {
    expect(birthBulgeLine(0)).toBe('BIRTH BULGE · none');
    expect(birthBulgeLine(50, 5)).toBe('BIRTH BULGE 50% · 2.5 cm out');
    expect(birthBulgeLine(100, 5)).toBe('BIRTH BULGE 100% · 5.0 cm out');
  });
  it('clamps to the slider range', () => {
    expect(birthBulgeLine(-4)).toBe('BIRTH BULGE · none');
    expect(birthBulgeLine(140, 5)).toBe('BIRTH BULGE 100% · 5.0 cm out');
  });
  it('leaves the opening line as it was', () => {
    expect(birthOpenLine(100)).toBe('BIRTH OPENING 100% · 10.0 cm across');
    expect(birthOpenLine(0)).toBe('BIRTH OPENING · closed');
    expect(birthOpenLine(40, 0.021)).toBe('BIRTH OPENING 40% · held to 2.1 cm by her legs');
  });
});

// Her legs' spread opens her (Joshua, 2026-11-14: "to a max of 20% in recline and squat, legs apart would be 12%"), and a
// birth has her opening from where the slider stood ("I set the start at 40% opening before I pressed it").
describe('birth opening line: her legs, and a birth', () => {
  it('says what her legs add when it is more than is set by hand', () => {
    expect(birthOpenLine(0, null, 12)).toBe('BIRTH OPENING 0% · her legs open her 12% · 1.2 cm across');
    expect(birthOpenLine(0, null, 20)).toBe('BIRTH OPENING 0% · her legs open her 20% · 2.0 cm across');
    expect(birthOpenLine(10, null, 20)).toBe('BIRTH OPENING 10% · her legs open her 20% · 2.0 cm across');
  });
  it('says only what is set by hand once that is the more open', () => {
    expect(birthOpenLine(20, null, 20)).toBe('BIRTH OPENING 20% · 2.0 cm across');
    expect(birthOpenLine(40, null, 20)).toBe('BIRTH OPENING 40% · 4.0 cm across');
    expect(birthOpenLine(0, null, 0)).toBe('BIRTH OPENING · closed');
    expect(birthOpenLine(0, null, NaN)).toBe('BIRTH OPENING · closed');
  });
  it('in a birth, says the birth has it and where it began', () => {
    expect(birthOpenLine(40, null, 20, true)).toBe('BIRTH OPENING · with the birth now · it began at 40% (RESET to set it)');
    expect(birthOpenLine(0, null, 20, true)).toBe('BIRTH OPENING · with the birth now · it began at 0% (RESET to set it)');
  });
});
