/**
 * HER PELVIC ORGANS, LAID OUT AGAINST HER BONE (src/actor/pelvicOrgans.ts; the skeleton-outward plan's Phase 1). On her
 * measured skeleton the canal and the womb are their measured lengths and sit where anatomy puts them against her
 * landmarks; the bladder holds what it is said to hold, rises as it fills and never overlaps the womb, which it tips back
 * toward upright instead; and the meshes are whole.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BLADDER, CERVIX, ORGAN_PLACE, UTERUS, VAGINA, bladderRadii, intoEllipsoid, layOrgans, lengthOf, organMeshes, uterusHalf, type PelvisLandmarks } from '../src/actor/pelvicOrgans';

const pelvis = JSON.parse(readFileSync(new URL('../src/data/pelvis/skeleton.json', import.meta.url), 'utf8')) as PelvisLandmarks;
const L = pelvis.landmarks;
/** How far a point is past her pelvic inlet's plane (symphysis top to promontory), metres: + out of the true pelvis. */
function pastInlet(q: readonly number[]): number {
  const a = L.symphysisTop, b = L.promontory, dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dy, dz);
  return ((q[1] - a[1]) * -dz + (q[2] - a[2]) * dy) / len;
}

describe('her pelvic organs on her skeleton', () => {
  const o = layOrgans(pelvis);

  it('the canal is as long as its two walls on average, and runs from below the symphysis up and back to the midpelvis', () => {
    expect(lengthOf(o.vagina.path)).toBeCloseTo((VAGINA.front + VAGINA.back) / 2, 2);
    const open = o.vagina.path[0], top = o.vagina.path[o.vagina.path.length - 1];
    expect(open[1]).toBeCloseTo(L.symphysisBottom[1] - ORGAN_PLACE.introitusBelow, 6);
    expect(top).toEqual([...pelvis.midpelvis.centre]);
    expect(top[1]).toBeGreaterThan(open[1]);
    expect(top[2]).toBeLessThan(open[2]);
  });

  it('the womb is its measured length, its os in the canal just below the canal top, its fundus at about the inlet', () => {
    expect(o.uterus.length).toBeCloseTo(UTERUS.length, 3);
    expect(o.uterus.cervixEnds).toBe(CERVIX.length);
    const os = o.uterus.path[0], fundus = o.uterus.path[o.uterus.path.length - 1];
    expect(pelvis.midpelvis.centre[1] - os[1]).toBeGreaterThan(0);
    expect(pelvis.midpelvis.centre[1] - os[1]).toBeLessThan(ORGAN_PLACE.osBelowTop);
    expect(fundus[1]).toBeGreaterThan(os[1]);
    expect(Math.abs(pastInlet(fundus))).toBeLessThan(0.015);
    expect(o.uterus.anteversionDeg).toBe(ORGAN_PLACE.anteversionDeg);
  });

  it('the bladder holds what it says, sits behind the symphysis and below the womb, and is clear of the womb and canal', () => {
    const [rx, ry, rz] = bladderRadii(BLADDER.defaultMl);
    expect((4 / 3) * Math.PI * rx * ry * rz * 1e6).toBeCloseTo(BLADDER.defaultMl, -1);
    expect(o.bladder.centre[2] + o.bladder.radii[2]).toBeLessThan(L.symphysisBack[2]);
    expect(o.bladder.centre[1]).toBeLessThan(o.uterus.path[o.uterus.path.length - 1][1]);
    expect(intoEllipsoid(o.bladder.centre, o.bladder.radii, o.uterus.path, (t) => uterusHalf(t))).toBeGreaterThanOrEqual(1);
    expect(intoEllipsoid(o.bladder.centre, o.bladder.radii, o.vagina.path, () => [o.vagina.width / 2, o.vagina.depth / 2])).toBeGreaterThanOrEqual(1);
  });

  it('as the bladder fills it rises, and tips the womb back rather than overlapping it', () => {
    let lastTop = -Infinity, lastTip = Infinity;
    for (const ml of [20, 60, 150, 300, 400, 600]) {
      const f = layOrgans(pelvis, ml), top = f.bladder.centre[1] + f.bladder.radii[1];
      expect(top).toBeGreaterThan(lastTop);
      expect(f.uterus.anteversionDeg).toBeLessThanOrEqual(lastTip);
      expect(intoEllipsoid(f.bladder.centre, f.bladder.radii, f.uterus.path, (t) => uterusHalf(t))).toBeGreaterThanOrEqual(1);
      expect(intoEllipsoid(f.bladder.centre, f.bladder.radii, [f.uterus.path[0]], () => [CERVIX.width / 2, CERVIX.width / 2])).toBeGreaterThanOrEqual(1);
      lastTop = top; lastTip = f.uterus.anteversionDeg;
    }
    expect(layOrgans(pelvis, 400).uterus.anteversionDeg).toBeLessThan(ORGAN_PLACE.anteversionDeg);
    // (the cervix's place in the canal is the same at every fill: its ligaments hold it)
    expect(layOrgans(pelvis, 600).uterus.path[0]).toEqual(o.uterus.path[0]);
  });

  it('the drawn womb ends at its os: its rounded end does not reach past it down the canal', () => {
    const m = organMeshes(o).uterus, os = o.uterus.path[0], up = o.uterus.path[8];
    const d = [up[0] - os[0], up[1] - os[1], up[2] - os[2]], n = Math.hypot(...d);
    let least = Infinity;
    for (let i = 0; i < m.points.length; i += 3) least = Math.min(least, ((m.points[i] - os[0]) * d[0] + (m.points[i + 1] - os[1]) * d[1] + (m.points[i + 2] - os[2]) * d[2]) / n);
    expect(least).toBeGreaterThan(-0.001);
    expect(least).toBeLessThan(0.002);
  });

  it('their meshes are whole: every point finite, every triangle on its own points', () => {
    for (const m of Object.values(organMeshes(o))) {
      expect(m.points.length % 3).toBe(0);
      expect(m.points.every(Number.isFinite)).toBe(true);
      const n = m.points.length / 3;
      expect(m.triangles.length % 3).toBe(0);
      expect(Math.max(...m.triangles)).toBeLessThan(n);
    }
  });
});
