/**
 * HER PELVIS, MEASURED (src/actor/pelvisMeasure.ts, scripts/measurePelvis.ts, src/data/pelvis/; the skeleton-outward
 * plan's Phase 1). The cut through a mesh and the rays across it are exact on shapes whose answer is known; her
 * skeleton's diameters are inside a woman's normal range; and the saved file is what measuring her file again gives.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PELVIS_RIGS, measurePelvisRig, type SavedPelvis } from '../scripts/measurePelvis';
import { cutPelvis, rayToCut } from '../src/actor/pelvisMeasure';

/** A closed tube: a ring of `n` sides, radius `r`, from z = -h to h, about the z axis (points and triangles). */
function tube(r: number, h: number, n = 64): { points: number[]; triangles: number[] } {
  const points: number[] = [], triangles: number[] = [];
  for (let k = 0; k < n; k++) { const a = (2 * Math.PI * k) / n; points.push(r * Math.cos(a), r * Math.sin(a), -h, r * Math.cos(a), r * Math.sin(a), h); }
  for (let k = 0; k < n; k++) { const a = 2 * k, b = 2 * k + 1, c = (2 * k + 2) % (2 * n), d = (2 * k + 3) % (2 * n); triangles.push(a, c, b, b, c, d); }
  return { points, triangles };
}

describe('a cut through a mesh, and rays across it', () => {
  it('cuts a tube across into its ring, and a ray from its middle meets the wall at its radius in every direction', () => {
    const t = tube(0.06, 0.05, 128);
    // the plane z = 0: along +y, across +x, normal +z
    const cut = cutPelvis(t.points, t.triangles, [0, 0, 0], [0, 1, 0], [0, 0, 1]);
    // (each side is two triangles, and the plane cuts both)
    expect(cut.length / 4).toBe(256);
    for (let a = 0; a < 360; a += 15) {
      const r = (a * Math.PI) / 180, d = rayToCut(cut, 0, 0, Math.cos(r), Math.sin(r));
      // (a chord of a 128-gon is within 0.03% of the circle)
      expect(d).toBeGreaterThan(0.06 * 0.999);
      expect(d).toBeLessThanOrEqual(0.06 + 1e-12);
    }
  });
  it('a plane that misses the mesh cuts nothing, and a ray that meets nothing goes on for ever', () => {
    const t = tube(0.06, 0.05);
    expect(cutPelvis(t.points, t.triangles, [0, 0, 0.2], [0, 1, 0], [0, 0, 1]).length).toBe(0);
    const cut = cutPelvis(t.points, t.triangles, [0, 0, 0], [0, 1, 0], [0, 0, 1]);
    expect(rayToCut(cut, 0.5, 0.5, 1, 0)).toBe(Infinity);
  });
});

const saved = (name: string) => JSON.parse(readFileSync(new URL(`../src/data/pelvis/${name}.json`, import.meta.url), 'utf8')) as SavedPelvis;

describe('her skeleton\'s pelvis, saved as data', () => {
  it('is a woman\'s: every diameter inside the normal range (pelvimetry)', () => {
    const { cm } = saved('skeleton');
    expect(cm.obstetricConjugate).toBeGreaterThanOrEqual(10); expect(cm.obstetricConjugate).toBeLessThanOrEqual(12);
    expect(cm.inletTransverse).toBeGreaterThanOrEqual(13); expect(cm.inletTransverse).toBeLessThanOrEqual(14.5);
    expect(cm.interspinous).toBeGreaterThanOrEqual(9.5); expect(cm.interspinous).toBeLessThanOrEqual(11.5);
    expect(cm.intertuberous).toBeGreaterThanOrEqual(10); expect(cm.intertuberous).toBeLessThanOrEqual(12);
  });
  it('runs its canal down from the inlet, round under the symphysis, to the outlet: a curve about the symphysis', () => {
    const p = saved('skeleton'), c = p.landmarks.symphysisCentre;
    expect(p.inlet.angleDeg).toBeLessThan(p.midpelvis.angleDeg);
    expect(p.midpelvis.angleDeg).toBeLessThan(p.outlet.angleDeg);
    expect(p.axis.length).toBeGreaterThan(10);
    // (it goes down all the way, and every point of it is about the same way from the symphysis: the curve of Carus)
    for (let k = 1; k < p.axis.length; k++) expect(p.axis[k][1]).toBeLessThanOrEqual(p.axis[k - 1][1] + 1e-9);
    for (const q of p.axis) expect(Math.abs(Math.hypot(q[1] - c[1], q[2] - c[2]) * 100 - p.cm.arcRadius)).toBeLessThan(1);
    // (the promontory is above and behind the symphysis; the tuberosities below it, either side)
    expect(p.landmarks.promontory[1]).toBeGreaterThan(p.landmarks.symphysisTop[1]);
    expect(p.landmarks.promontory[2]).toBeLessThan(p.landmarks.symphysisBack[2]);
    expect(p.landmarks.tuberosityLeft[1]).toBeLessThan(p.landmarks.symphysisBottom[1]);
    expect(Math.sign(p.landmarks.tuberosityLeft[0] - c[0])).toBe(-Math.sign(p.landmarks.tuberosityRight[0] - c[0]));
  });
  it('is what measuring her file again gives', async () => {
    for (const rig of PELVIS_RIGS) expect((await measurePelvisRig(rig)).saved).toEqual(saved(rig.name));
  }, 120_000);
});
