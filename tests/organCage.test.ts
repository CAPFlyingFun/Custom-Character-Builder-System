/**
 * AN ORGAN AS A SIMPLE SOFT BODY (src/actor/organCage.ts). Held still it stays exactly where it was laid; carried, it
 * lags and settles back to where its bone holds it in about a second; leaned, it sags only as far as its ligaments let
 * it and comes back; its shape survives all of it; two cages that touch at rest are not pushed apart standing still, and
 * are when one is pushed into the other; the drawn points follow the cage; and a cage whose rest places are set again (an
 * organ her diaphragm carries down as she breathes in) settles to them, keeping its shape.
 */
import { describe, expect, it } from 'vitest';
import { followCage, makeCage, nearestRotation, restGaps, separate, setRest, skinToCage, stepCage, type M3 } from '../src/actor/organCage';

/** A small block of points, 2 x 2 x 3 cm, 10 g, tied `tie` everywhere. */
function block(tie = 0.05, at: [number, number, number] = [0, 0, 0]) {
  const rest: number[] = [], mass: number[] = [], ties: number[] = [], radius: number[] = [];
  for (const x of [-0.01, 0.01]) for (const y of [-0.015, 0, 0.015]) for (const z of [-0.01, 0.01]) { rest.push(at[0] + x, at[1] + y, at[2] + z); mass.push(10 / 12); ties.push(tie); radius.push(0.006); }
  return makeCage(rest, mass, ties, radius);
}
/** A column-major 4x4 that moves by (x, y, z). */
const moved = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
/** How far the cage's points are from where `m` carries their rest places, at most, metres. */
function off(c: ReturnType<typeof block>, m: number[]): number {
  let most = 0;
  for (let i = 0; i < c.n; i++) most = Math.max(most, Math.hypot(c.x[3 * i] - (c.rest[3 * i] + m[12]), c.x[3 * i + 1] - (c.rest[3 * i + 1] + m[13]), c.x[3 * i + 2] - (c.rest[3 * i + 2] + m[14])));
  return most;
}
const TUNE = { shape: 0.35, keep: 0.08 };

describe('an organ as a soft body', () => {
  it('held still and upright it stays exactly where it was laid', () => {
    const c = block(), m = moved(0, 1, 0);
    for (let k = 0; k < 120; k++) stepCage(c, 1 / 60, m, [0, 0, 0], TUNE);
    expect(off(c, m)).toBeLessThan(1e-6);
  });

  it('carried 5 cm in one step it lags, then settles back where its bone holds it within about a second', () => {
    const c = block(), still = moved(0, 0, 0);
    stepCage(c, 1 / 60, still, [0, 0, 0], TUNE);
    const there = moved(0.05, 0, 0);
    stepCage(c, 1 / 60, there, [0, 0, 0], TUNE);
    expect(off(c, there)).toBeGreaterThan(0.01);
    for (let k = 0; k < 60; k++) stepCage(c, 1 / 60, there, [0, 0, 0], TUNE);
    expect(off(c, there)).toBeLessThan(0.0005);
  });

  it('leaned so gravity pulls it sideways it sags only a little, keeps its shape, and comes back when she straightens', () => {
    const c = block(), m = moved(0, 0, 0);
    for (let k = 0; k < 120; k++) stepCage(c, 1 / 60, m, [9.81 * Math.sin(0.5), 0, 0], TUNE);
    const sag = off(c, m);
    expect(sag).toBeGreaterThan(1e-5);
    expect(sag).toBeLessThan(0.01);
    // (its shape: the fitted rotation is still a rotation, and its points still sit their rest distance apart)
    const d = Math.hypot(c.x[0] - c.x[3], c.x[1] - c.x[4], c.x[2] - c.x[5]), r = Math.hypot(c.rest[0] - c.rest[3], c.rest[1] - c.rest[4], c.rest[2] - c.rest[5]);
    expect(d).toBeCloseTo(r, 3);
    for (let k = 0; k < 120; k++) stepCage(c, 1 / 60, m, [0, 0, 0], TUNE);
    expect(off(c, m)).toBeLessThan(1e-4);
  });

  it('a slow frame or a broken dt does not throw it', () => {
    const c = block(), m = moved(0, 0, 0);
    stepCage(c, 1 / 60, m, [0, 0, 0], TUNE);
    stepCage(c, 5, moved(0.2, 0, 0), [0, 0, 0], TUNE);
    stepCage(c, Number.NaN, m, [0, 0, 0], TUNE);
    expect(Array.from(c.x).every(Number.isFinite)).toBe(true);
  });

  it('the nearest rotation to a turned and stretched block is the turn', () => {
    const a = 0.4, R: M3 = [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
    const S = [1.3, 0.8, 1.1], A = R.map((v, k) => v * S[k % 3]) as M3;
    const got = nearestRotation(A, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    got.forEach((v, k) => expect(v).toBeCloseTo(R[k], 5));
  });

  it('two cages touching at rest are not pushed apart standing still, and are when one is pushed into the other', () => {
    const a = block(0.05, [0, 0, 0]), b = block(0.05, [0, 0, 0.025]), m = moved(0, 0, 0);
    stepCage(a, 0, m, [0, 0, 0], TUNE); stepCage(b, 0, m, [0, 0, 0], TUNE);
    const gaps = restGaps(a, b);
    expect(separate(a, b)).toBeGreaterThan(0);
    // (laid again where they were)
    a.primed = false; b.primed = false; stepCage(a, 0, m, [0, 0, 0], TUNE); stepCage(b, 0, m, [0, 0, 0], TUNE);
    expect(separate(a, b, gaps)).toBe(0);
    for (let i = 0; i < b.n; i++) b.x[3 * i + 2] -= 0.003;
    expect(separate(a, b, gaps)).toBeGreaterThan(0);
  });

  it('the drawn points follow the cage: at rest exactly where they were, carried with it when it moves', () => {
    const c = block(), pts = [0.005, 0.002, -0.004, -0.008, 0.012, 0.009, 0, 0, 0];
    const skin = skinToCage(c, pts, 4), out = new Float32Array(pts.length);
    stepCage(c, 0, moved(0, 0, 0), [0, 0, 0], TUNE);
    followCage(c, skin, out);
    out.forEach((v, k) => expect(v).toBeCloseTo(pts[k], 6));
    const there = moved(0.1, -0.2, 0.3);
    c.primed = false; stepCage(c, 0, there, [0, 0, 0], TUNE);
    followCage(c, skin, out);
    out.forEach((v, k) => expect(v).toBeCloseTo(pts[k] + there[12 + (k % 3)], 6));
  });

  it('its rest places set again, it settles to them: carried down as her diaphragm carries an organ', () => {
    const c = block(0.12), still = moved(0, 0, 0);
    stepCage(c, 0, still, [0, 0, 0], TUNE);
    expect(off(c, still)).toBe(0);
    // every rest place 1.6 cm lower (a quiet breath in): its middle and its shape's offsets go with them
    const lower = Float32Array.from(c.rest); for (let i = 1; i < lower.length; i += 3) lower[i] -= 0.016;
    const middle = c.restCentre[1], q = Float32Array.from(c.q);
    setRest(c, lower);
    expect(c.restCentre[1]).toBeCloseTo(middle - 0.016, 6);
    expect(Math.max(...Array.from(c.q, (v, i) => Math.abs(v - q[i])))).toBeLessThan(1e-6);
    // it has not moved yet; in a second it has settled where its bone now holds it
    expect(off(c, still)).toBeCloseTo(0.016, 5);
    for (let k = 0; k < 60; k++) stepCage(c, 1 / 60, still, [0, 0, 0], TUNE);
    expect(off(c, still)).toBeLessThan(0.0005);
    // carried (her diaphragm pushes what is under it): its points go with its rest places at once, in its bone's frame --
    // here turned a quarter about z and moved, so "down" in her frame is the world's +x
    const turned = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0.3, 0.2, 0.1, 1], d = block(0.12);
    stepCage(d, 0, turned, [0, 0, 0], TUNE);
    const was = Float32Array.from(d.x), lower2 = Float32Array.from(d.rest); for (let i = 1; i < lower2.length; i += 3) lower2[i] -= 0.057;
    setRest(d, lower2, turned);
    for (let i = 0; i < d.n; i++) { expect(d.x[3 * i] - was[3 * i]).toBeCloseTo(0.057, 6); expect(d.x[3 * i + 1] - was[3 * i + 1]).toBeCloseTo(0, 6); expect(d.x[3 * i + 2] - was[3 * i + 2]).toBeCloseTo(0, 6); }
    // and it stays there: nothing is left for its ties to pull
    stepCage(d, 1 / 60, turned, [0, 0, 0], TUNE);
    for (let i = 0; i < d.n; i++) expect(Math.hypot(d.x[3 * i] - was[3 * i] - 0.057, d.x[3 * i + 1] - was[3 * i + 1], d.x[3 * i + 2] - was[3 * i + 2])).toBeLessThan(1e-5);
  });
});
