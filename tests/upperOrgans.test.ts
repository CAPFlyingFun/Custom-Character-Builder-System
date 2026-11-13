/**
 * HER LIVER, GALLBLADDER, SPLEEN, PANCREAS AND WINDPIPE (actor/upperOrgans.ts), and HER OVARIES AND TUBES
 * (actor/adnexa.ts), laid in her own measured rib cage and beside her womb:
 * - her liver holds a woman's liver's volume, under her diaphragm's right dome, to her right of her midline mostly, its
 *   left lobe crossing it; it goes down with her diaphragm on a breath in;
 * - her gallbladder is under her liver's right lobe, her spleen high at the back of her left side under her diaphragm, her
 *   pancreas across her back wall with its head right of her midline and its tail to her left, her windpipe on her
 *   midline from her neck to where it parts behind her sternal angle;
 * - none of them is in her lungs or her heart (her bronchi's ends excepted: they go into her lungs);
 * - her ovaries and tubes lie either side of her womb at its upper corners, at their measured sizes, for her womb small
 *   and grown alike.
 */
import { describe, expect, it } from 'vitest';
import thorax from '../src/data/thorax/v2.json';
import pelvis from '../src/data/pelvis/v2.json';
import torso from '../src/data/torso/v2.json';
import { insideHeart, layThorax, lungMesh, meshVolume, type ThoraxLandmarks } from '../src/actor/thoracicOrgans';
import { GALLBLADDER, LIVER, WINDPIPE, diaphragmDrop, layUpper } from '../src/actor/upperOrgans';
import { OVARY, TUBE, layAdnexa } from '../src/actor/adnexa';
import { layOrgans, type OrganMesh, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { growWomb, type TorsoLandmarks } from '../src/actor/pregnantWomb';

const T = thorax as unknown as ThoraxLandmarks, mid = T.xiphoid[0];
/** Whether a point is inside a closed mesh (a ray along +x crossing it an odd number of times). */
function inside(m: OrganMesh, p: readonly number[]): boolean {
  let c = 0; const P = m.points, X = m.triangles;
  for (let t = 0; t < X.length; t += 3) {
    const a = X[t] * 3, b = X[t + 1] * 3, d = X[t + 2] * 3;
    const ay = P[a + 1] - p[1], az = P[a + 2] - p[2], by = P[b + 1] - p[1], bz = P[b + 2] - p[2], dy = P[d + 1] - p[1], dz = P[d + 2] - p[2];
    const det = (by - ay) * (dz - az) - (bz - az) * (dy - ay); if (Math.abs(det) < 1e-14) continue;
    const u = (-ay * (dz - az) + az * (dy - ay)) / det, v = ((by - ay) * -az - (bz - az) * -ay) / det;
    if (u < 0 || v < 0 || u + v > 1) continue;
    if (P[a] + u * (P[b] - P[a]) + v * (P[d] - P[a]) > p[0]) c++;
  }
  return c % 2 === 1;
}
const box = (m: OrganMesh) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < m.points.length; i++) { lo[i % 3] = Math.min(lo[i % 3], m.points[i]); hi[i % 3] = Math.max(hi[i % 3], m.points[i]); } return { lo, hi, mid: lo.map((v, k) => (v + hi[k]) / 2) }; };
const pathLength = (m: OrganMesh) => m.points.length;

describe('her upper belly and her windpipe', () => {
  const L0 = layThorax(T, 0), U = layUpper(L0);

  it('her liver holds a woman\'s liver, under her right dome, its left lobe across her midline', () => {
    const want = LIVER.grams / LIVER.density;
    expect(U.liver.ml).toBeCloseTo(want, 6);
    expect(meshVolume(U.liver) * 1e6 / want).toBeGreaterThan(0.95);
    expect(meshVolume(U.liver) * 1e6 / want).toBeLessThan(1.02);
    const b = box(U.liver);
    expect(b.lo[0]).toBeLessThan(mid - 0.09); expect(b.hi[0]).toBeGreaterThan(mid + 0.03); expect(b.hi[0]).toBeLessThan(mid + 0.08);
    expect(b.hi[0] - b.lo[0]).toBeGreaterThan(LIVER.width * 0.95);
    // its top at her diaphragm, near her xiphoid's height and above it at the dome
    expect(b.hi[1]).toBeGreaterThan(T.xiphoid[1]); expect(b.lo[1]).toBeLessThan(T.xiphoid[1] - 0.06);
  });

  it('her gallbladder is under her right lobe, her spleen high on her left at her back, her pancreas across her back wall', () => {
    const g = box(U.gallbladder), s = box(U.spleen), p = box(U.pancreas);
    expect(g.mid[0]).toBeLessThan(mid); expect(g.hi[2] - g.lo[2]).toBeGreaterThan(GALLBLADDER.length * 0.7);
    expect(s.mid[0]).toBeGreaterThan(mid + 0.07); expect(s.mid[2]).toBeLessThan(T.xiphoid[2] - 0.1);
    expect(p.lo[0]).toBeLessThan(mid - 0.05); expect(p.hi[0]).toBeGreaterThan(mid + 0.07);
    expect(p.hi[2]).toBeLessThan(T.xiphoid[2] - 0.05);
    for (const m of [U.gallbladder, U.spleen, U.pancreas]) expect(pathLength(m)).toBeGreaterThan(100);
  });

  it('her windpipe runs down her midline to where it parts behind her sternal angle, its bronchi into her lungs', () => {
    const w = box(U.windpipe);
    expect(w.hi[1] - (T.sternumTop[1] - WINDPIPE.carinaBelow)).toBeGreaterThan(WINDPIPE.length * 0.95);
    expect(w.lo[0]).toBeLessThan(mid - 0.015); expect(w.hi[0]).toBeGreaterThan(mid + 0.03);
  });

  it('none of them is in her lungs or her heart', () => {
    const lungs = [lungMesh(L0, 1), lungMesh(L0, -1)];
    for (const name of ['liver', 'gallbladder', 'spleen', 'pancreas'] as const) {
      const m = U[name]; let bad = 0;
      for (let i = 0; i < m.points.length; i += 3) { const q = [m.points[i], m.points[i + 1], m.points[i + 2]]; if (lungs.some((l) => inside(l, q)) || insideHeart(L0, q[0], q[1], q[2])) bad++; }
      expect(bad, name).toBe(0);
    }
  });

  it('on a breath in her liver, gallbladder and pancreas go down with her diaphragm', () => {
    const L1 = layThorax(T, 1), U1 = layUpper(L1), drop = diaphragmDrop(L1);
    expect(drop).toBeGreaterThan(0.005);
    expect(diaphragmDrop(L0)).toBe(0);
    for (const name of ['liver', 'gallbladder', 'pancreas'] as const) expect(box(U1[name]).mid[1], name).toBeLessThan(box(U[name]).mid[1] - 0.003);
    // their meshes keep their triangles: the room writes only their points
    for (const name of ['liver', 'gallbladder', 'spleen', 'pancreas', 'windpipe'] as const) { expect(U1[name].points.length).toBe(U[name].points.length); expect(Array.from(U1[name].triangles)).toEqual(Array.from(U[name].triangles)); }
  });
});

describe('her ovaries and tubes', () => {
  const P = pelvis as unknown as PelvisLandmarks, laid = layOrgans(P);
  const check = (w: Parameters<typeof layAdnexa>[0]) => {
    const A = layAdnexa(w), [left, right] = A.ovaryCentres;
    // one each side of her womb's middle, level with each other
    expect(left[0]).toBeGreaterThan(right[0] + 0.06); expect(Math.abs(left[1] - right[1])).toBeLessThan(1e-9);
    // each ovary at its measured size (its volume an ellipsoid's of 3 x 1.5 x 1 cm, within its mesh's facets)
    const ml = (Math.PI / 6) * OVARY.length * OVARY.width * OVARY.thickness * 1e6;
    expect((meshVolume(A.ovaries) * 1e6) / (2 * ml)).toBeGreaterThan(0.9); expect((meshVolume(A.ovaries) * 1e6) / (2 * ml)).toBeLessThan(1.01);
    // below and outside its corner
    for (const k of [0, 1]) { const c = A.corners[k], o = A.ovaryCentres[k]; expect(Math.abs(o[0] - w.path[0][0])).toBeGreaterThan(Math.abs(c[0] - w.path[0][0])); expect(o[1]).toBeLessThan(c[1]); }
    return A;
  };
  it('beside her womb not pregnant, on her pelvis\'s side walls', () => {
    const A = check(laid.uterus);
    // inside her pelvis's inlet's width
    for (const o of A.ovaryCentres) expect(Math.abs(o[0] - P.landmarks.symphysisTop[0])).toBeLessThan(0.075);
    // each tube about 10-14 cm (its line's own length; the mesh's points run round it)
    expect(TUBE.length).toBeGreaterThanOrEqual(0.1);
  });
  it('carried up on her womb as it grows', () => {
    const grown = growWomb(laid, torso as unknown as TorsoLandmarks, 30, [1300]);
    const small = check(laid.uterus), big = check({ path: grown.path, halves: grown.halves });
    expect(big.ovaryCentres[0][1]).toBeGreaterThan(small.ovaryCentres[0][1] + 0.1);
  });
});
