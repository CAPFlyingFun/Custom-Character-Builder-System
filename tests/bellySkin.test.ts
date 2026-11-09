/**
 * HER BELLY'S SKIN, THE TEST BAND (the belly skin proof, v3): laid over her measured bone, carried by her spine, pushed
 * out by what fills her and never through it, never folding or passing through itself, soft after a birth.
 */
import { describe, expect, it } from 'vitest';
import belly from '../src/data/belly/skeleton.json';
import torso from '../src/data/torso/skeleton.json';
import pelvis from '../src/data/pelvis/skeleton.json';
import { BELLY_SKIN, bandFolds, bandState, layBand, rowMatrices, shapeBand, type SavedBelly } from '../src/actor/bellySkin';
import { layOrgans, organMeshes, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { growWomb, type TorsoLandmarks } from '../src/actor/pregnantWomb';

const saved = belly as unknown as SavedBelly;
const band = layBand(saved, torso.landmarks.navel, torso.landmarks.xiphoid, torso.landmarks.symphysisTop);
const identity = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
const still = rowMatrices(band, band.spine.map(identity));
const laid = layOrgans(pelvis as unknown as PelvisLandmarks);
const wombAt = (week: number, grams: number) => {
  const w = growWomb(laid, torso as unknown as TorsoLandmarks, week, [grams]);
  return organMeshes({ ...laid, uterus: { path: w.path, cervixEnds: w.cervixEnds, length: w.length, anteversionDeg: w.leanDeg, halves: w.halves, axes: w.axes } }).uterus.points;
};
/** how far each source point lies outside the drawn band at its own height and angle (metres; + outside the skin) */
function worstOutside(drawn: Float32Array, src: Float32Array): number {
  let worst = -Infinity;
  const step = (band.y[band.rows - 1] - band.y[0]) / (band.rows - 1);
  for (let p = 0; p < src.length; p += 3) {
    const k = Math.round((src[p + 1] - band.y[0]) / step);
    if (k < 2 || k > band.rows - 3) continue;
    const dx = src[p] - band.cx[k], dz = src[p + 2] - band.cz[k], c = ((Math.round((Math.atan2(dx, dz) / (2 * Math.PI)) * band.cols) % band.cols) + band.cols) % band.cols, i = k * band.cols + c;
    worst = Math.max(worst, Math.hypot(dx, dz) - Math.hypot(drawn[3 * i] - band.cx[k], drawn[3 * i + 2] - band.cz[k]));
  }
  return worst;
}

describe('her belly skin band', () => {
  it('is measured off her skeleton: one ring a row from her pubic bone to her xiphoid, carried by her spine', () => {
    expect(saved.rows[0].y).toBeCloseTo(torso.landmarks.symphysisTop[1], 3);
    expect(saved.rows[saved.rows.length - 1].y).toBeCloseTo(torso.landmarks.xiphoid[1], 3);
    expect(saved.spine[0]).toBe(pelvis.bone);
    // (her pelvis carries the bottom row, her chest the top)
    expect(saved.rows[0].weights[saved.spine[0]]).toBeGreaterThan(0.9);
    expect(saved.rows[saved.rows.length - 1].weights[saved.spine[saved.spine.length - 1]]).toBeGreaterThan(0.9);
    expect(band.points.length / 3).toBeGreaterThanOrEqual(1500);
    expect(band.points.length / 3).toBeLessThanOrEqual(2500);
  });
  it('at rest is a slim woman: drawn in at her waist, about 18.5 cm deep at her navel', () => {
    const circ = (k: number) => { let s = 0; for (let c = 0; c < band.cols; c++) { const a = k * band.cols + c, b = k * band.cols + ((c + 1) % band.cols); s += Math.hypot(band.points[3 * a] - band.points[3 * b], band.points[3 * a + 2] - band.points[3 * b + 2]); } return s; };
    const all = Array.from({ length: band.rows }, (_, k) => circ(k)), waist = Math.min(...all.slice(8, 20));
    expect(waist).toBeGreaterThan(0.6); expect(waist).toBeLessThan(0.8);
    expect(waist).toBeLessThan(all[0]); expect(waist).toBeLessThan(all[band.rows - 1]);
    const n = band.y.reduce((best, y, k) => (Math.abs(y - torso.landmarks.navel) < Math.abs(band.y[best] - torso.landmarks.navel) ? k : best), 0);
    const front = band.cz[n] + band.rest[n * band.cols], back = band.cz[n] - band.rest[n * band.cols + band.cols / 2];
    expect(front - back).toBeCloseTo(0.185, 2);
  });
  it('grows with her womb by her weeks, the womb never outside it, never folding', () => {
    let last = 0;
    for (const [week, grams] of [[20, 300], [28, 1000], [36, 2600], [40, 3400]] as const) {
      const src = wombAt(week, grams), s = bandState(band), out = new Float32Array(band.points.length);
      const most = shapeBand(band, still, [src], s, out, 1, 0);
      expect(most).toBeGreaterThan(last); last = most;
      expect(worstOutside(out, src)).toBeLessThan(0);
      expect(bandFolds(band, out, still)).toBe(0);
    }
    expect(last).toBeGreaterThan(0.08); expect(last).toBeLessThan(0.16);
  });
  it('is carried by her spine bending forward without folding or passing through itself', () => {
    // her spine's upper bones turned forward (a sit or a squat's lean): 25 degrees at her chest, less below
    const turn = (deg: number) => { const a = (deg * Math.PI) / 180, m = identity(); m[5] = Math.cos(a); m[6] = Math.sin(a); m[9] = -Math.sin(a); m[10] = Math.cos(a);
      // (about a point on her spine at the bone's own height, so the row stays on her)
      const y = 0.95, z = -0.05; m[13] = y - (Math.cos(a) * y - Math.sin(a) * z); m[14] = z - (Math.sin(a) * y + Math.cos(a) * z); return m; };
    const bent = rowMatrices(band, [identity(), turn(8), turn(16), turn(25)]);
    const src = wombAt(40, 3400), s = bandState(band), out = new Float32Array(band.points.length);
    shapeBand(band, bent, [src], s, out, 1, 0);
    expect(bandFolds(band, out, bent)).toBe(0);
  });
  it('after a birth stays soft and comes back in slowly; otherwise it follows at once', () => {
    const big = wombAt(40, 3400), small = wombAt(20, 300), out = new Float32Array(band.points.length);
    const firm = bandState(band); shapeBand(band, still, [big], firm, out, 1, 0);
    const followed = shapeBand(band, still, [small], firm, out, 1, 0.5);
    const soft = bandState(band); soft.afterBirth = true; const before = shapeBand(band, still, [big], soft, out, 1, 0);
    const a = shapeBand(band, still, [small], soft, out, 1, 1), looseThen = soft.loose;
    let b = a; for (let k = 0; k < 60; k++) b = shapeBand(band, still, [small], soft, out, 1, 1);
    expect(a).toBeGreaterThan(0.9 * before);
    expect(looseThen).toBeGreaterThan(0.3);
    expect(b).toBeLessThan(a);
    expect(Math.abs(b - followed)).toBeLessThan(0.02);
    expect(BELLY_SKIN.soften.seconds).toBeGreaterThan(5);
  });
});
