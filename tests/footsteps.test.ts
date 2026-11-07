/**
 * HER STEPS (footsteps.ts; Joshua, 2026-11-07): a step is heard when a sneaker's heel comes down onto the floor, from
 * how high it is frame by frame -- never on a timer, and never while she stands.
 */
import { describe, expect, it } from 'vitest';
import { STEP, StepWatch } from '../src/sarahlab/footsteps';

/** A heel walking: up off the floor for the swing (8 cm at most) and down on it for the stance, `period` a stride. */
const walking = (t: number, period: number, phase: number) => {
  const x = ((t / period + phase) % 1 + 1) % 1;
  return x < 0.4 ? 0.08 * Math.sin((Math.PI * x) / 0.4) : 0;
};

describe('her steps', () => {
  it('one a stride for each foot as she walks, at any pace, and none standing', () => {
    for (const period of [0.9, 1.2, 1.8]) {
      const watch = new StepWatch(), dt = 1 / 60, heard: number[] = [0, 0];
      for (let t = 0; t < 10; t += dt) for (const s of watch.update([walking(t, period, 0), walking(t, period, 0.5)], dt)) heard[s.foot]++;
      const strides = Math.floor(10 / period);
      for (const n of heard) { expect(n).toBeGreaterThanOrEqual(strides - 1); expect(n).toBeLessThanOrEqual(strides + 1); }
    }
    const still = new StepWatch();
    let n = 0;
    for (let t = 0; t < 5; t += 1 / 60) n += still.update([0, 0.001], 1 / 60).length;
    expect(n).toBe(0);
  });

  it('a heel resting on the line between down and up is not heard over and over', () => {
    const watch = new StepWatch(), dt = 1 / 60;
    let n = 0;
    watch.update([0.05], dt);
    for (let k = 0; k < 120; k++) n += watch.update([k % 2 ? STEP.down - 0.001 : STEP.down + 0.004], dt).length;
    expect(n).toBe(1);
  });

  it('harder the faster it comes down, never quieter than the quietest', () => {
    const land = (speed: number) => {
      const watch = new StepWatch(), dt = 1 / 60;
      let h = 0.05, got = 0;
      watch.update([h], dt);
      while (!got) { h = Math.max(0, h - speed * dt); const s = watch.update([h], dt); if (s.length) got = s[0].strength; }
      return got;
    };
    expect(land(0.05)).toBe(STEP.quietest);
    expect(land(0.3)).toBeGreaterThan(land(0.1));
    expect(land(2)).toBe(1);
  });
});
