/**
 * The exact-value box's look-up (valueLookup.ts). Joshua, 2026-11-19: "if you start typing 5… it will only show things
 * starting at 5 like 50-59, if it was 1, it would should 1, 11-19, 100-199".
 */
import { describe, expect, it } from 'vitest';
import { valuesStartingWith } from '../src/sarahlab/valueLookup';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

describe('a value looked up as it is typed', () => {
  it('5 shows 5 and 50-59 on the belly slider (0-200%)', () => {
    expect(valuesStartingWith('5', 0, 200)).toEqual([5, ...range(50, 59)]);
  });
  it('1 shows 1, 10-19 and 100-199', () => {
    expect(valuesStartingWith('1', 0, 200)).toEqual([1, ...range(10, 19), ...range(100, 199)]);
  });
  it('two digits narrow it: 7 then 76', () => {
    expect(valuesStartingWith('7', 0, 200)).toEqual([7, ...range(70, 79)]);
    expect(valuesStartingWith('76', 0, 200)).toEqual([76]);
    expect(valuesStartingWith('20', 0, 200)).toEqual([20, 200]);
  });
  it('nothing typed is the whole list; a % sign and spaces are let be; anything else finds nothing', () => {
    expect(valuesStartingWith('', 0, 200)).toEqual(range(0, 200));
    expect(valuesStartingWith(' 3% ', 0, 200)).toEqual([3, ...range(30, 39)]);
    expect(valuesStartingWith('x', 0, 200)).toEqual([]);
    expect(valuesStartingWith('300', 0, 200)).toEqual([]);
  });
  it('keeps to its own range: her pregnancy\'s boxes (a size to 215%, a week 1-42)', () => {
    expect(valuesStartingWith('21', 0, 215)).toEqual([21, ...range(210, 215)]);
    expect(valuesStartingWith('4', 1, 42)).toEqual([4, 40, 41, 42]);
  });
});
