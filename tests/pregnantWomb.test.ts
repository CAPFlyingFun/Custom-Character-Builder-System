/**
 * HER WOMB BY HER WEEKS (src/actor/pregnantWomb.ts, src/actor/torsoMeasure.ts, scripts/measureTorso.ts; the skeleton-
 * outward plan's Phase 1). Her torso's landmarks are measured on her skeleton and saved; her womb holds what the weeks
 * say it holds (its wall, her baby, its fluid and placenta) and is that big; not pregnant it is the womb her organs were
 * laid with; it rises out of her pelvis by 12 weeks and its fundal height is about a centimetre a week from 20 to 36; it
 * stays in front of her spine, presses her bladder rather than overlapping it, and its sac is inside it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { measureTorsoRig, type SavedTorso } from '../scripts/measureTorso';
import { PELVIS_RIGS } from '../scripts/measurePelvis';
import { intoEllipsoid, layOrgans, organMeshes, wombHalf, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { WOMB_GROWTH, WOMB_SHAPE, growWomb, insideWomb, pregnantLayout, spineFrontAt, wombContents, wombSac } from '../src/actor/pregnantWomb';

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
const pelvis = read<PelvisLandmarks>('../src/data/pelvis/skeleton.json');
const torso = read<SavedTorso>('../src/data/torso/skeleton.json');
const laid = layOrgans(pelvis);
/** The chart's average baby, g (sarahlab/baby.ts FETAL_CHART: Hadlock). */
const CHART: Record<number, number> = { 12: 14, 16: 100, 20: 300, 24: 600, 28: 1000, 32: 1700, 36: 2620, 40: 3460 };
/** The chart's baby at any week (straight between its weeks; nothing before 12 worth weighing). */
function chartG(week: number): number {
  const ks = Object.keys(CHART).map(Number);
  if (week <= ks[0]) return CHART[ks[0]] * (Math.max(0, week) / ks[0]) ** 3;
  for (let i = 1; i < ks.length; i++) if (week <= ks[i]) return CHART[ks[i - 1]] + ((CHART[ks[i]] - CHART[ks[i - 1]]) * (week - ks[i - 1])) / (ks[i] - ks[i - 1]);
  return CHART[ks[ks.length - 1]];
}
const at = (week: number) => growWomb(laid, torso, week, [chartG(week)]);
/** How far a point is past her pelvic inlet's plane (symphysis top to promontory), metres: + out of her true pelvis. */
function pastInlet(q: readonly number[]): number {
  const a = pelvis.landmarks.symphysisTop, b = pelvis.landmarks.promontory, dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dy, dz);
  return ((q[1] - a[1]) * -dz + (q[2] - a[2]) * dy) / len;
}
/** A closed mesh's volume, m³ (its triangles' signed tetrahedra). */
function volume(points: Float32Array, triangles: Uint32Array): number {
  let v = 0;
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [triangles[t], triangles[t + 1], triangles[t + 2]].map((i) => [points[3 * i], points[3 * i + 1], points[3 * i + 2]]);
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return Math.abs(v);
}

describe('her torso, measured on her skeleton', () => {
  it('finds her lumbar discs in order up from her promontory, her navel at the third, below her breastbone', () => {
    const d = torso.discs;
    expect(d.length).toBeGreaterThanOrEqual(5);
    for (let k = 1; k < d.length; k++) { expect(d[k] - d[k - 1]).toBeGreaterThan(0.02); expect(d[k] - d[k - 1]).toBeLessThan(0.06); }
    expect(d[0]).toBeGreaterThan(pelvis.landmarks.promontory[1]);
    expect(torso.landmarks.navel).toBe(d[2]);
    expect(torso.landmarks.navel).toBeGreaterThan(torso.landmarks.symphysisTop[1] + 0.15);
    expect(torso.landmarks.xiphoid[1]).toBeGreaterThan(torso.landmarks.navel + 0.08);
    // (her breastbone in front of her spine; her spine's front behind her pubic bone)
    expect(torso.landmarks.xiphoid[2]).toBeGreaterThan(spineFrontAt(torso, torso.landmarks.xiphoid[1]) + 0.08);
    expect(spineFrontAt(torso, torso.landmarks.navel)).toBeLessThan(pelvis.landmarks.symphysisTop[2]);
    // (a navel at about 0.6 of her height, as a woman's is)
    expect(torso.landmarks.navel / torso.stature).toBeGreaterThan(0.57);
    expect(torso.landmarks.navel / torso.stature).toBeLessThan(0.65);
  });

  it('the saved file is what measuring her file again gives', async () => {
    const { saved } = await measureTorsoRig(PELVIS_RIGS[0]);
    expect(JSON.parse(JSON.stringify(saved))).toEqual(torso);
  }, 120_000);
});

describe('what her womb holds, by week', () => {
  it('its wall from 60 g to 1100 g at term; the fluid as measured; a 500 g placenta for a term baby', () => {
    expect(wombContents(0, []).wallG).toBe(60);
    expect(wombContents(40, [3460]).wallG).toBe(WOMB_GROWTH.wallTermG);
    expect(wombContents(10, [10]).fluidMl).toBeCloseTo(25, 6);
    expect(wombContents(20, [300]).fluidMl).toBeCloseTo(400, 6);
    expect(wombContents(30, [1300]).fluidMl).toBeCloseTo(800, 6);
    expect(wombContents(40, [3460]).placentaG).toBeCloseTo(500, 6);
    // (about half the baby's weight at 20 weeks)
    expect(wombContents(20, [300]).placentaG / 300).toBeGreaterThan(0.4);
    expect(wombContents(20, [300]).placentaG / 300).toBeLessThan(0.7);
  });

  it('about 5 L at term (Williams: "averages approximately 5 L"); twins hold more; it only grows', () => {
    const term = wombContents(40, [3460]);
    expect(term.volumeMl - (term.wallG - 24) / WOMB_GROWTH.density).toBeGreaterThan(4000);
    expect(term.volumeMl - (term.wallG - 24) / WOMB_GROWTH.density).toBeLessThan(6000);
    expect(wombContents(32, [1500, 1500]).volumeMl).toBeGreaterThan(wombContents(32, [1700]).volumeMl);
    let last = 0;
    for (let w = 0; w <= 38; w += 2) { const v = wombContents(w, [chartG(w)]).volumeMl; expect(v).toBeGreaterThanOrEqual(last); last = v; }
  });
});

describe('her womb grown by her weeks', () => {
  it('not pregnant it is the womb her organs were laid with', () => {
    const w = at(0), top = Math.max(...laid.uterus.path.map((p) => p[1]));
    expect(Math.abs(w.top - top)).toBeLessThan(0.006);
    expect(w.size[0]).toBeCloseTo(0.046, 2);
    expect(w.path[0]).toEqual(laid.uterus.path[0]);
  });

  it('is as big as what it holds (its drawn body within 3% of it)', () => {
    for (const week of [16, 24, 32, 40]) {
      const w = at(week), mesh = organMeshes(pregnantLayout(laid, w)).uterus;
      const ml = volume(mesh.points, mesh.triangles) * 1e6;
      expect(ml / w.contents.volumeMl).toBeGreaterThan(0.97);
      expect(ml / w.contents.volumeMl).toBeLessThan(1.03);
    }
  });

  it('rises out of her pelvis by 12 weeks, and keeps rising', () => {
    expect(pastInlet([0, at(12).top, at(12).path[at(12).path.length - 1][2]])).toBeGreaterThan(0.03);
    let top = 0, tape = 0;
    for (const week of [12, 16, 20, 24, 28, 32, 36, 40]) { const w = at(week); expect(w.top).toBeGreaterThan(top); expect(w.fundalHeight).toBeGreaterThan(tape); top = w.top; tape = w.fundalHeight; }
  });

  it('measures about a centimetre a week on the midwife\'s tape from 20 to 36 weeks (within 1.5 cm; 2 is normal)', () => {
    for (const week of [20, 24, 28, 32, 36]) expect(Math.abs(at(week).fundalHeight * 100 - week)).toBeLessThan(1.5);
  });

  it('stays in front of her spine, and presses her bladder rather than overlapping it', () => {
    for (const week of [20, 32, 40]) {
      const w = at(week), body0 = w.path.length - WOMB_SHAPE.stations - 1, lean = (w.leanDeg * Math.PI) / 180;
      for (let k = body0 + 1; k < w.path.length; k++) {
        const backY = w.path[k][1] + Math.sin(lean) * w.halves[k][1], backZ = w.path[k][2] - Math.cos(lean) * w.halves[k][1];
        expect(backZ).toBeGreaterThan(spineFrontAt(torso, backY) + WOMB_SHAPE.spineGap - 0.002);
      }
      const l = pregnantLayout(laid, w);
      expect(intoEllipsoid(l.bladder.centre, l.bladder.radii, l.uterus.path, wombHalf(l.uterus))).toBeGreaterThanOrEqual(1);
      // (pressed flatter, it holds what it held)
      const b = l.bladder.radii, b0 = laid.bladder.radii;
      expect(b[0] * b[1] * b[2]).toBeCloseTo(b0[0] * b0[1] * b0[2], 9);
    }
  });

  it('its sac is inside it: its middle inside, every way out a little short of its wall', () => {
    const w = at(32), s = wombSac(w, 12, 16);
    expect(insideWomb(w, ...s.centre)).toBe(true);
    expect(insideWomb(w, s.centre[0], s.centre[1] + 1, s.centre[2])).toBe(false);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 16; j++) {
      const th = (Math.PI * i) / 11, ph = (2 * Math.PI * j) / 16, r = s.r[i * 16 + j];
      const p = [s.centre[0] + Math.sin(th) * Math.sin(ph) * r, s.centre[1] + Math.cos(th) * r, s.centre[2] + Math.sin(th) * Math.cos(ph) * r] as const;
      expect(r).toBeGreaterThan(0.01);
      expect(insideWomb(w, ...p)).toBe(true);
    }
  });
});
