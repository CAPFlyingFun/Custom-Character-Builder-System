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
 *   and grown alike;
 * - ORGAN AGAINST ORGAN (Joshua, 2026-11-13, of her spleen pressing into her kidney and her pancreas laid low: "is it an
 *   easy fix?" -- "Yes."): with her kidneys, her stomach and her colon laid in the same body, none of them lies in
 *   another, up through her diaphragm, out through her ribs or in her spine, at a quiet breath out, a quiet breath in and
 *   her deepest breath; her spleen is within her ribs, above her left kidney; her pancreas's neck is level with her
 *   stomach's pylorus at her L1/L2 disc; what lies under her diaphragm rides its domes down together; her stomach, from
 *   empty to as full as she has room for, holds what its number says, its skin smooth, and is in none of the others;
 *   and late in a pregnancy her stomach stays under her diaphragm;
 * - HER INSIDES IN A PREGNANCY (Joshua, 2026-11-13: "go ahead and fix and do the last two things you mentioned"): round a
 *   womb with a back wall, like v2's, her diaphragm risen with her weeks, none of them is in her womb, up through her
 *   diaphragm or (but for a few points) in another; her liver rests on her womb's top and her gallbladder lies further
 *   back under it; her colon across her lies behind the wall, under her stomach, and her bowel under her colon; while her
 *   womb is low her colon rides over it as before.
 */
import { describe, expect, it } from 'vitest';
import thorax from '../src/data/thorax/v2.json';
import pelvis from '../src/data/pelvis/v2.json';
import torso from '../src/data/torso/v2.json';
import { BREATH, DIAPHRAGM, DIAPHRAGM_RISE, diaphragmAt, heartMesh, insideHeart, layThorax, lungMesh, lungVolume, meshVolume, sectionAt, thoraxSpineAt, type ThoraxLandmarks } from '../src/actor/thoracicOrgans';
import { GALLBLADDER, LIVER, PANCREAS, WINDPIPE, bladderBack, diaphragmDrop, domeDrop, kidneysAt, layUpper, pancreasLine, upperBelly, wombFloor } from '../src/actor/upperOrgans';
import { OVARY, TUBE, layAdnexa } from '../src/actor/adnexa';
import { layOrgans, type OrganMesh, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { WOMB_WALL_SLOPE, growWomb, spineFrontAt, wallAt, type TorsoLandmarks, type WombRoom } from '../src/actor/pregnantWomb';
import { ABDOMEN_DEFAULT_FILL, ABDOMEN_PLACE, BREATH_RIDE, STOMACH, WOMB_PUSH, bean, breathRide, coiledMass, inWomb, layAbdomen, layKidneys, layStomach, outOfBlob, outOfWomb, pointsClear, shortBehindWall, sweepAny, tubeVolume } from '../src/actor/abdominalOrgans';
import { diaphragmRise } from '../src/actor/vitals';
import { wombFromSkin } from '../src/sarahlab/baby';
import { wombRoomOf } from '../src/sarahlab/wombRoom';

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
/** How many of a mesh's edges its skin is folded back across (its two triangles there turned more than about 100 degrees
 * to one another): a skin swept round a line tighter than its own half-size, or crumpled by a push, has them. */
function foldedBack(m: OrganMesh): number {
  const P = m.points, X = m.triangles, N: number[][] = [];
  for (let t = 0; t < X.length; t += 3) {
    const a = X[t] * 3, b = X[t + 1] * 3, c = X[t + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
    N.push(l > 1e-12 ? [nx / l, ny / l, nz / l] : [0, 0, 0]);
  }
  const edge = new Map<number, number>(), V = P.length / 3;
  let n = 0;
  for (let t = 0; t < X.length / 3; t++) for (let k = 0; k < 3; k++) {
    const a = X[3 * t + k], b = X[3 * t + (k + 1) % 3], key = Math.min(a, b) * V + Math.max(a, b), o = edge.get(key);
    if (o === undefined) { edge.set(key, t); continue; }
    const p = N[o], q = N[t];
    if ((p[0] || p[1] || p[2]) && (q[0] || q[1] || q[2]) && p[0] * q[0] + p[1] * q[1] + p[2] * q[2] < -0.2) n++;
  }
  return n;
}

/** How many of a's points lie in b. */
function within(a: OrganMesh, b: OrganMesh): number {
  const B = box(b); let n = 0;
  for (let i = 0; i < a.points.length; i += 3) {
    const q = [a.points[i], a.points[i + 1], a.points[i + 2]];
    if (q[0] < B.lo[0] || q[0] > B.hi[0] || q[1] < B.lo[1] || q[1] > B.hi[1] || q[2] < B.lo[2] || q[2] > B.hi[2]) continue;
    if (inside(b, q)) n++;
  }
  return n;
}

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

describe('her upper belly, organ against organ', () => {
  const TV = torso as unknown as TorsoLandmarks & { discs: number[] }, P = pelvis as unknown as PelvisLandmarks, laid = layOrgans(P);
  const opening = laid.vagina.path[0], bladder = { centre: laid.bladder.centre, radii: laid.bladder.radii }, x0 = P.landmarks.symphysisTop[0];
  const kidneys = layKidneys(TV, x0), upper = upperBelly(T, kidneys), A = layAbdomen(TV, P, opening, bladder, undefined, null, laid.vagina.path, upper);
  /** All of them as they are at a breath: her chest's and her upper belly's as laid at it, her stomach and her colon
   * ridden down with her diaphragm's domes as the room's soft bodies are (sarahlab/abdomenView.ts `ride`), and kept off
   * her bowel as the room draws them. */
  const at = (breath: number) => {
    const L = layThorax(T, breath), U = layUpper(L, kidneys), K = kidneysAt(L, kidneys), blob = { centre: A.intestines.centre, radii: A.intestines.radii };
    const ridden = (m: OrganMesh, organ: 'stomach' | 'colon'): OrganMesh => {
      outOfBlob(m.points, blob, 0.003);
      for (let i = 0; i < m.points.length; i += 3) m.points[i + 1] -= breathRide(organ, m.points[i + 1], T.xiphoid[1]) * domeDrop(L, m.points[i]);
      return m;
    };
    const belly = { liver: U.liver as OrganMesh, gallbladder: U.gallbladder, spleen: U.spleen as OrganMesh, pancreas: U.pancreas, kidneyL: bean(K[0]), kidneyR: bean(K[1]), stomach: ridden(sweepAny(A.stomach.path, A.stomach.halves, 18, 4), 'stomach'), colon: ridden(sweepAny(A.colon.path, A.colon.halves, 12, 4), 'colon') };
    return { L, belly, chest: { lungL: lungMesh(L, 1), lungR: lungMesh(L, -1), heart: heartMesh(L, 0) } };
  };

  it('none of them lies in another, at a quiet breath out, a quiet breath in and her deepest breath', () => {
    for (const breath of [0, 1, BREATH.most]) {
      const { belly, chest } = at(breath), all: Record<string, OrganMesh> = { ...belly, ...chest };
      for (const a of Object.keys(belly)) for (const b of Object.keys(all)) {
        // (her gallbladder lies in its hollow in her liver)
        if (a === b || (a === 'gallbladder' && b === 'liver') || (a === 'liver' && b === 'gallbladder')) continue;
        expect(within(all[a], all[b]), `${a} in ${b}, breath ${breath}`).toBe(0);
        if (b in chest) expect(within(all[b], all[a]), `${b} in ${a}, breath ${breath}`).toBe(0);
      }
    }
  }, 60_000);

  it('none of them is up through her diaphragm, out through her ribs or in her spine', () => {
    for (const breath of [0, 1, BREATH.most]) {
      const { L, belly } = at(breath);
      for (const [name, m] of Object.entries(belly)) {
        let over = 0, out = 0, spine = 0;
        for (let i = 0; i < m.points.length; i += 3) {
          const x = m.points[i], y = m.points[i + 1], z = m.points[i + 2];
          over = Math.max(over, y - diaphragmAt(L, x, z));
          // her ribs' sides at every height they reach; their front and back where they ring her (above her lowest ribs' tips)
          if (y >= T.sections[0].y) { const s = sectionAt(T, y); out = Math.max(out, x - s.left, s.right - x); if (y >= T.sections[5].y) out = Math.max(out, s.back - z, z - s.front); }
          if (Math.abs(x - L.mid) < 0.02 && y >= T.spineFront[0][0]) spine = Math.max(spine, thoraxSpineAt(T, y) - z);
        }
        expect(over, `${name} over her diaphragm, breath ${breath}`).toBeLessThanOrEqual(0);
        // (her ribs' inside is measured to the millimetre or two: src/data/thorax/v2.json)
        expect(out, `${name} outside her ribs, breath ${breath}`).toBeLessThan(0.002);
        expect(spine, `${name} in her spine, breath ${breath}`).toBeLessThanOrEqual(0);
      }
    }
  });

  it('her spleen is within her ribs, above her left kidney; her pancreas level with her pylorus at her L1/L2 disc', () => {
    const { belly } = at(0), s = box(belly.spleen), k = box(belly.kidneyL);
    expect(s.lo[1]).toBeGreaterThan(T.sections[0].y + 0.02); // its foot well above her lowest ribs
    expect(s.hi[1]).toBeGreaterThan(k.hi[1] + 0.02);
    expect(s.mid[1]).toBeGreaterThan(k.mid[1] + 0.03);
    // her pancreas: its neck (the middle of its line) at her transpyloric plane -- her stomach's pylorus, her L1/L2 disc
    const line = pancreasLine(layThorax(T, 0), PANCREAS, kidneys).path, neck = line[Math.round(line.length * 0.4)], pylorus = A.stomach.path[A.stomach.path.length - 1];
    expect(Math.abs(neck[1] - pylorus[1])).toBeLessThan(0.012);
    expect(Math.abs(neck[1] - TV.discs[4])).toBeLessThan(0.012);
    // in front of her kidneys: her left kidney behind its tail
    expect(box(belly.pancreas).lo[2]).toBeGreaterThan(k.lo[2] + 0.02);
    // her kidneys, a little under her L1/L2 disc
    expect(kidneys[0].centre[1]).toBeCloseTo(TV.discs[4] - ABDOMEN_PLACE.kidneyBelow, 6);
  });

  it('what lies under her diaphragm rides its domes down together', () => {
    const L1 = layThorax(T, 1), drop = domeDrop(L1, kidneys[0].centre[0]);
    expect(drop).toBeCloseTo(DIAPHRAGM.quietDrop, 3);
    expect(domeDrop(layThorax(T, 0), 0)).toBe(0);
    const a = at(0).belly, b = at(1).belly;
    for (const name of ['spleen', 'pancreas', 'kidneyL', 'kidneyR', 'stomach'] as const) expect(box(a[name]).mid[1] - box(b[name]).mid[1], name).toBeCloseTo(drop, 3);
    expect(kidneysAt(L1, kidneys)[0].centre[1]).toBeCloseTo(kidneys[0].centre[1] - BREATH_RIDE.kidneys * drop, 6);
    // her colon's top rides it and the top of her bowel gives way under it (a little lower: her colon lies on it); their
    // feet, low in her belly, do not
    for (const [organ, under] of [['colon', 0], ['intestines', BREATH_RIDE.bowelUnder]] as const) {
      expect(breathRide(organ, T.xiphoid[1] - 0.09 - under, T.xiphoid[1])).toBe(1);
      expect(breathRide(organ, T.xiphoid[1] - 0.155 - under, T.xiphoid[1])).toBeCloseTo(0.5, 6);
      expect(breathRide(organ, T.xiphoid[1] - 0.22 - under, T.xiphoid[1])).toBe(0);
    }
    // (at one height her bowel's top gives way at least as much as her colon rides)
    for (const down of [0.1, 0.13, 0.16, 0.19]) expect(breathRide('intestines', T.xiphoid[1] - down, T.xiphoid[1])).toBeGreaterThanOrEqual(breathRide('colon', T.xiphoid[1] - down, T.xiphoid[1]));
    expect(breathRide('rectum', T.xiphoid[1] - 0.05, T.xiphoid[1])).toBe(0);
  });

  it('her stomach, from empty to as full as she has room for: it holds what its number says, its skin smooth, in none of the others', () => {
    const L = layThorax(T, 0), U = layUpper(L, kidneys), K = kidneysAt(L, kidneys);
    const others: Record<string, OrganMesh> = { liver: U.liver as OrganMesh, gallbladder: U.gallbladder, spleen: U.spleen as OrganMesh, pancreas: U.pancreas, kidneyL: bean(K[0]), kidneyR: bean(K[1]), lungL: lungMesh(L, 1), lungR: lungMesh(L, -1), heart: heartMesh(L, 0) };
    for (const stomachMl of [STOMACH.emptyMl, ABDOMEN_DEFAULT_FILL.stomachMl, 350, ABDOMEN_PLACE.stomachRoomMl]) {
      const B = layAbdomen(TV, P, opening, bladder, { ...ABDOMEN_DEFAULT_FILL, stomachMl }, null, laid.vagina.path, upper), m = sweepAny(B.stomach.path, B.stomach.halves, 18, 4);
      // (set in place all of a piece: its line and its half-sizes are its own, and it holds its number to the millilitre)
      expect(tubeVolume(B.stomach) * 1e6, `${stomachMl} mL`).toBeCloseTo(stomachMl, 0);
      expect(foldedBack(m), `${stomachMl} mL, its skin folded back`).toBe(0);
      let over = -Infinity; for (let i = 0; i < m.points.length; i += 3) over = Math.max(over, m.points[i + 1] - upper.under(m.points[i], m.points[i + 2]));
      // (set down with 16 points to a ring, measured here with 18: to half a millimetre)
      expect(over, `${stomachMl} mL over what is over it`).toBeLessThanOrEqual(-ABDOMEN_PLACE.underDiaphragm + 0.0005);
      for (const [name, o] of Object.entries(others)) { expect(within(m, o), `${stomachMl} mL in her ${name}`).toBe(0); expect(within(o, m), `her ${name} in it, ${stomachMl} mL`).toBe(0); }
      const colon = sweepAny(B.colon.path, B.colon.halves, 12, 4);
      expect(within(m, colon) + within(colon, m), `${stomachMl} mL and her colon`).toBe(0);
    }
    // fuller than she has room for, it is drawn as full as that, and no fuller (its number goes on counting: actor/gut.ts)
    for (const stomachMl of [STOMACH.fullMl, STOMACH.mostMl]) expect(tubeVolume(layAbdomen(TV, P, opening, bladder, { ...ABDOMEN_DEFAULT_FILL, stomachMl }, null, laid.vagina.path, upper).stomach) * 1e6).toBeCloseTo(ABDOMEN_PLACE.stomachRoomMl, 0);
    expect(tubeVolume(layStomach(TV, STOMACH.fullMl, x0)) * 1e6).toBeCloseTo(STOMACH.fullMl, 0);
    // between meals it lies where its line is written: nothing has to move it
    const written = layStomach(TV, ABDOMEN_DEFAULT_FILL.stomachMl, x0).path[0];
    expect(Math.hypot(A.stomach.path[0][0] - written[0], A.stomach.path[0][1] - written[1], A.stomach.path[0][2] - written[2])).toBeLessThan(0.0005);
    // flat front to back (its ring's first half-size), wider across; and its turn no tighter than its skin allows
    for (const [front, across] of A.stomach.halves) expect(front).toBeLessThanOrEqual(across + 1e-9);
    expect(ABDOMEN_PLACE.stomach.turn).toBeGreaterThan(Math.max(...A.stomach.halves.map((h) => h[1])));
  }, 60_000);

  it('late in a pregnancy her stomach stays under her diaphragm, her womb denting it from below', () => {
    for (const [week, g] of [[34, 2100], [40, 3400]] as const) {
      const womb = growWomb(laid, TV, week, [g]), W = layAbdomen(TV, P, opening, bladder, undefined, womb, laid.vagina.path, upper);
      const pts = sweepAny(W.stomach.path, W.stomach.halves, 16, 4).points;
      let over = 0; for (let i = 0; i < pts.length; i += 3) over = Math.max(over, pts[i + 1] - upper.under(pts[i], pts[i + 2]));
      expect(over, `week ${week}`).toBeLessThan(0.001); // (to the millimetre: it is laid 4 mm under them)
      // (what of it her womb's top takes is pushed out of it point by point, as the room draws it)
      outOfWomb(pts, womb); expect(inWomb(pts, womb)).toBe(0);
    }
  });
});

describe('her insides in a pregnancy, round a womb with a back wall', () => {
  const TV = torso as unknown as TorsoLandmarks & { discs: number[] }, P = pelvis as unknown as PelvisLandmarks, laid = layOrgans(P);
  const opening = laid.vagina.path[0], bladder = { centre: laid.bladder.centre, radii: laid.bladder.radii }, x0 = P.landmarks.symphysisTop[0];
  const kidneys = layKidneys(TV, x0), wall = { y0: P.landmarks.promontory[1], z0: P.landmarks.promontory[2], slope: WOMB_WALL_SLOPE };
  /** A belly's skin, for a womb to be read from as the room reads v2's (sarahlab/baby.ts `wombFromSkin`): a dome `depth`
   * deep in front of her, its middle at height `mid`, `tall` and `wide` its half-sizes. */
  const skin = (depth: number, mid: number, tall: number, wide: number) => {
    const pts: number[] = [];
    for (let y = 0.8; y <= 1.25; y += 0.006) for (let x = -0.24; x <= 0.24; x += 0.006) { const u = (y - mid) / tall, w = x / wide, k = 1 - u * u - w * w; pts.push(x, y, 0.05 + (k > 0 ? depth * Math.sqrt(k) : 0)); }
    return pts;
  };
  /** Wombs like v2's as MEASURED in the room 2026-11-13 (her bump at 73%: its top at 1.171; at 100%: 1.191, half-width
   * 0.129), and a low one; each with her weeks. */
  const WOMBS = { low: [0.06, 0.99, 0.12, 0.12, 18], weeks30: [0.12, 1.02, 0.17, 0.15, 30], term: [0.16, 1.03, 0.19, 0.17, 40] } as const;
  const lay = (name: keyof typeof WOMBS, breath = 0) => {
    const [depth, mid, tall, wide, weeks] = WOMBS[name], rise = diaphragmRise(weeks, DIAPHRAGM_RISE);
    const womb: WombRoom = wombRoomOf(wombFromSkin(skin(depth, mid, tall, wide), weeks), wall), floor = wombFloor(womb, T);
    const upper = upperBelly(T, kidneys, rise, floor), A = layAbdomen(TV, P, opening, bladder, undefined, womb, laid.vagina.path, upper);
    const L = layThorax(T, breath, rise), U = layUpper(L, kidneys, floor), K = kidneysAt(L, kidneys), blob = { centre: A.intestines.centre, radii: A.intestines.radii };
    // (her stomach, her colon and her bowel as the room draws them -- sarahlab/abdomenView.ts `build` -- and ridden down
    // with her diaphragm's domes as its soft bodies are: `ride`)
    const ridden = (m: OrganMesh, organ: 'stomach' | 'colon' | 'intestines'): OrganMesh => { for (let i = 0; i < m.points.length; i += 3) m.points[i + 1] -= breathRide(organ, m.points[i + 1], T.xiphoid[1]) * domeDrop(L, m.points[i]); return m; };
    const drawn = (m: OrganMesh, organ: 'stomach' | 'colon'): OrganMesh => { outOfWomb(m.points, womb); outOfBlob(m.points, blob, 0.003); return ridden(m, organ); };
    const bowel = coiledMass(blob); outOfWomb(bowel.points, womb); outOfBlob(bowel.points, bladder, 0.003);
    for (let pass = 0; pass < 2; pass++) { if (!pointsClear(bowel.points, { under: upper.under, beans: [...upper.organs, ...A.kidneys], tubes: [...(upper.tubes ?? []), A.stomach, A.colon] }, 0.003)) break; outOfWomb(bowel.points, womb); }
    const belly: Record<string, OrganMesh> = { liver: U.liver as OrganMesh, gallbladder: U.gallbladder, spleen: U.spleen as OrganMesh, pancreas: U.pancreas, kidneyL: bean(K[0]), kidneyR: bean(K[1]), stomach: drawn(sweepAny(A.stomach.path, A.stomach.halves, 18, 4), 'stomach'), colon: drawn(sweepAny(A.colon.path, A.colon.halves, 12, 4), 'colon'), intestines: ridden(bowel, 'intestines') };
    return { womb, floor, rise, upper, A, L, belly, chest: { lungL: lungMesh(L, 1), lungR: lungMesh(L, -1), heart: heartMesh(L, 0) } as Record<string, OrganMesh> };
  };
  /** her colon's stations across her middle */
  const across = (A: ReturnType<typeof lay>['A']) => A.colon.path.map((p, k) => ({ p, r: Math.max(A.colon.halves[k][0], A.colon.halves[k][1]) })).filter(({ p }) => Math.abs(p[0] - x0) < 0.05 && p[1] > TV.landmarks.navel - 0.02);

  it('her diaphragm is pushed up with her weeks, 4 cm at term, and her lungs hold less', () => {
    expect(diaphragmRise(0, DIAPHRAGM_RISE)).toBe(0);
    expect(diaphragmRise(40, DIAPHRAGM_RISE)).toBeCloseTo(DIAPHRAGM_RISE, 6);
    expect(diaphragmRise(30, DIAPHRAGM_RISE)).toBeGreaterThan(0.02);
    const L0 = layThorax(T, 0), L1 = layThorax(T, 0, DIAPHRAGM_RISE);
    for (const k of [0, 1]) expect(L1.diaphragm.domes[k].top - L0.diaphragm.domes[k].top).toBeCloseTo(DIAPHRAGM_RISE, 4);
    expect(lungVolume(L1).both).toBeLessThan(lungVolume(L0).both * 0.92);
    // (no further than a pregnancy pushes it)
    expect(layThorax(T, 0, 0.2).rise).toBeCloseTo(DIAPHRAGM_RISE, 9);
    expect(layThorax(T, 0).rise).toBe(0);
  });

  it('none of them is in her womb, up through her diaphragm or -- but for a few points -- in another', () => {
    for (const name of ['low', 'weeks30', 'term'] as const) {
      const { womb, L, belly, chest } = lay(name), all = { ...belly, ...chest };
      if (name !== 'low') expect(womb.top, `${name}: her womb's top`).toBeGreaterThan(name === 'term' ? 1.18 : 1.12);
      for (const [organ, m] of Object.entries(belly)) {
        expect(inWomb(m.points, womb), `${name}: her ${organ} in her womb`).toBe(0);
        let over = -Infinity; for (let i = 0; i < m.points.length; i += 3) over = Math.max(over, m.points[i + 1] - diaphragmAt(L, m.points[i], m.points[i + 2]));
        expect(over, `${name}: her ${organ} over her diaphragm`).toBeLessThanOrEqual(0);
      }
      for (const a of Object.keys(belly)) for (const b of Object.keys(all)) {
        if (a === b || (a === 'gallbladder' && b === 'liver') || (a === 'liver' && b === 'gallbladder')) continue;
        // (a few points: her liver as drawn stands off its own underside as reckoned by a few millimetres at its edges)
        expect(within(all[a], all[b]) + within(all[b], all[a]), `${name}: her ${a} and her ${b}`).toBeLessThanOrEqual(5);
      }
    }
  }, 120_000);

  it('as she breathes in they ride her diaphragm down together, her liver\'s seat on her womb with them', () => {
    for (const name of ['weeks30', 'term'] as const) for (const breath of [1, BREATH.most]) {
      const { L, belly, chest } = lay(name, breath), all = { ...belly, ...chest };
      for (const [organ, m] of Object.entries(belly)) {
        let over = -Infinity; for (let i = 0; i < m.points.length; i += 3) over = Math.max(over, m.points[i + 1] - diaphragmAt(L, m.points[i], m.points[i + 2]));
        expect(over, `${name}, breath ${breath}: her ${organ} over her diaphragm`).toBeLessThanOrEqual(0);
      }
      for (const a of Object.keys(belly)) for (const b of Object.keys(all)) {
        if (a >= b && b in belly) continue;
        if ((a === 'gallbladder' && b === 'liver') || (a === 'liver' && b === 'gallbladder')) continue;
        // (a few points; at her hardest breath her left kidney, ridden 5.7 cm down, touches her colon beside it:
        // MEASURED 2026-11-13, 4 and 7 points)
        expect(within(all[a], all[b]) + within(all[b], all[a]), `${name}, breath ${breath}: her ${a} and her ${b}`).toBeLessThanOrEqual(breath > 1 ? 10 : 5);
      }
    }
  }, 240_000);

  it('her liver rests on her womb\'s top; her gallbladder lies further back under it at term', () => {
    const { floor, L, belly, womb } = lay('term'), liver = belly.liver;
    expect(floor).not.toBeNull();
    // none of her liver under her womb's top where it stands under her
    let under = 0; for (let i = 0; i < liver.points.length; i += 3) { const f = floor!(liver.points[i], liver.points[i + 2]); if (f > -Infinity) under = Math.max(under, f - liver.points[i + 1]); }
    expect(under).toBeLessThanOrEqual(0.0005);
    // it still holds most of a woman's liver (the room over her womb's top is what it has)
    expect(meshVolume(liver) * 1e6).toBeGreaterThan(LIVER.grams / LIVER.density * 0.85);
    const back = bladderBack(layThorax(T, 0, DIAPHRAGM_RISE), floor!);
    expect(back).toBeGreaterThan(0); expect(back).toBeLessThanOrEqual(GALLBLADDER.backMost + 1e-9);
    expect(inWomb(belly.gallbladder.points, womb)).toBe(0);
    let over = -Infinity; const g = belly.gallbladder.points; for (let i = 0; i < g.length; i += 3) over = Math.max(over, g[i + 1] - diaphragmAt(L, g[i], g[i + 2]));
    expect(over).toBeLessThan(-GALLBLADDER.leastLiver);
    // with no womb under her liver it lies where it always does
    expect(bladderBack(layThorax(T, 0), () => -Infinity)).toBe(0);
  });

  it('her colon across her lies behind the wall, under her stomach, and her bowel under her colon', () => {
    for (const name of ['weeks30', 'term'] as const) {
      const { A } = lay(name), cross = across(A), stomachFoot = Math.min(...A.stomach.path.map((q) => q[1]));
      expect(cross.length, name).toBeGreaterThan(6);
      for (const { p, r } of cross) {
        expect(p[2], `${name}: a station across her at x ${p[0].toFixed(3)}, behind the wall`).toBeLessThan(wallAt(wall, p[1]) - r);
        // (in front of her spine where her spine is: beside it her back's hollows run further back)
        if (Math.abs(p[0] - x0) < 0.02) expect(p[2] + 1e-9, `${name}: ...and in front of her spine`).toBeGreaterThanOrEqual(spineFrontAt(TV, p[1]) + r);
        expect(p[1], `${name}: ...under her stomach's line`).toBeLessThan(stomachFoot);
      }
      const foot = Math.min(...cross.filter(({ p }) => Math.abs(p[0] - x0) < 0.04).map(({ p, r }) => p[1] - r));
      expect(A.intestines.centre[1] + A.intestines.radii[1], `${name}: her bowel's top`).toBeLessThanOrEqual(foot + 1e-6);
      // her stomach is not bent by her womb: it holds its number, its skin smooth
      expect(tubeVolume(A.stomach) * 1e6, name).toBeCloseTo(ABDOMEN_DEFAULT_FILL.stomachMl, 0);
      expect(foldedBack(sweepAny(A.stomach.path, A.stomach.halves, 18, 4)), name).toBe(0);
    }
  }, 60_000);

  it('packed flat behind her womb, her bowel still shows its loops; at rest nothing of it has changed', () => {
    const { A } = lay('term'), flat = A.intestines, m = coiledMass(flat);
    expect(flat.radii[2]).toBeLessThan(0.02);
    let most = 0; for (let i = 0; i < m.points.length; i += 3) most = Math.max(most, Math.abs(m.points[i + 2] - flat.centre[2]));
    // (its face stands at least 2 mm off the flat it would be: 7% of 12 mm is under a millimetre)
    expect(most - flat.radii[2]).toBeGreaterThan(0.002);
    const rest = layAbdomen(TV, P, opening, bladder, undefined, null, laid.vagina.path, upperBelly(T, kidneys)).intestines;
    expect(Array.from(coiledMass(rest).points)).toEqual(Array.from(coiledMass(rest, 22, 32, 0.07, 0).points));
  });

  it('while her womb is low her colon rides over it as before, and her liver and her gallbladder are as with no womb', () => {
    const { A, womb, floor, L, rise } = lay('low'), cross = across(A);
    expect(womb.top).toBeLessThan(TV.landmarks.navel);
    // (her womb's top is nowhere near her liver: laid over it, and with no womb at all, to the last point -- and what her
    // stomach and her colon are set under is that same liver. Laid on her gallbladder whenever she had a womb, her liver
    // as drawn stood 7 mm into her stomach with her bump at 0%: MEASURED in the room 2026-11-13)
    expect(floor).not.toBeNull();
    const over = layUpper(L, kidneys, floor), bare = layUpper(L, kidneys, null);
    expect(Array.from(over.liver.points)).toEqual(Array.from(bare.liver.points));
    expect(Array.from(over.gallbladder.points)).toEqual(Array.from(bare.gallbladder.points));
    const a = upperBelly(T, kidneys, rise, floor), b = upperBelly(T, kidneys, rise, null);
    for (const [x, z] of [[-0.06, 0], [-0.03, 0.03], [0, 0.02], [0.03, 0], [0.05, 0.03]]) expect(a.under(x, z)).toBeCloseTo(b.under(x, z), 9);
    // (in front of the wall's line, where it is laid: nothing of her womb stands there yet)
    expect(cross.filter(({ p }) => p[2] > wallAt(wall, p[1])).length).toBeGreaterThan(cross.length / 2);
    // a round fits behind the wall high up, where the wall leans forward of her spine, and not low down
    const spine = (y: number) => spineFrontAt(TV, y);
    expect(shortBehindWall(wall, spine, TV.landmarks.navel + 0.06, 0.02, WOMB_PUSH.gap)).toBeLessThan(0);
    expect(shortBehindWall(wall, spine, TV.landmarks.navel - 0.06, 0.02, WOMB_PUSH.gap)).toBeGreaterThan(0.02);
  });
});
