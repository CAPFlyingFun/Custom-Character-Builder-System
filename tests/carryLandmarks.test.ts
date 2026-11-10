/**
 * HER SKELETON'S LANDMARKS CARRIED INTO v2 (sarahlab/skeletonInV2.ts `carryLandmarks`), and the files it wrote
 * (src/data/pelvis/v2.json, torso/v2.json; thorax/v2.json from actor/thoracicOrgans.ts `measureThorax`, all by
 * scripts/bake-skeleton-v2.mjs). Review tests (2026-11-09): what holds is asserted; what does not is `it.fails`, with the
 * numbers in its comment.
 */
import { describe, expect, it } from 'vitest';
import skeletonPelvis from '../src/data/pelvis/skeleton.json';
import skeletonTorso from '../src/data/torso/skeleton.json';
import v2Pelvis from '../src/data/pelvis/v2.json';
import v2Torso from '../src/data/torso/v2.json';
import v2Thorax from '../src/data/thorax/v2.json';
import { carryLandmarks } from '../src/sarahlab/skeletonInV2';
import { diaphragmMesh, heartMesh, layThorax, lungMesh, meshVolume, thoraxSpineAt, type ThoraxLandmarks } from '../src/actor/thoracicOrgans';

const same = (pts: number[][]) => pts.map((p) => [...p]);
const D = [0.001, 0.01, -0.002], shifted = (pts: number[][]) => pts.map((p) => [p[0] + D[0], p[1] + D[1], p[2] + D[2]]);
const numbers = (o: unknown, out: number[] = []): number[] => { if (typeof o === 'number') out.push(o); else if (o && typeof o === 'object') for (const v of Object.values(o)) numbers(v, out); return out; };
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const Th = v2Thorax as unknown as ThoraxLandmarks;

describe('carryLandmarks', () => {
  it('carried nowhere, a file comes back as it was but for its rig, its model and its joint; the file given is not touched', () => {
    const before = JSON.stringify(skeletonPelvis), joint = [0.01, 1.0, 0.02];
    const out = carryLandmarks(skeletonPelvis, same, joint, 'v2-body');
    expect(JSON.stringify(skeletonPelvis)).toBe(before);
    expect(out.rig).toBe('v2-body'); expect(out.model).toContain('laid in v2');
    expect(out.landmarks).toEqual(skeletonPelvis.landmarks); expect(out.inlet).toEqual(skeletonPelvis.inlet); expect(out.axis).toEqual(skeletonPelvis.axis); expect(out.cm).toEqual(skeletonPelvis.cm);
    expect(out.joint).toEqual(joint);
    out.axis.forEach((p, i) => { for (let c = 0; c < 3; c++) expect(out.axisFromJoint[i][c]).toBeCloseTo(p[c] - joint[c], 5); });
    // (with no joint of v2's given, the skeleton's own joint and axisFromJoint are passed through, not carried)
    const none = carryLandmarks(skeletonPelvis, shifted, null, 'v2-body');
    expect(none.joint).toEqual(skeletonPelvis.joint); expect(none.axisFromJoint).toEqual(skeletonPelvis.axisFromJoint);
  });

  it("every point goes with the bone; a height alone and the spine's front go as the point of her spine's front there", () => {
    const p = carryLandmarks(skeletonPelvis, shifted, null, 'v2-body'), t = carryLandmarks(skeletonTorso, shifted, null, 'v2-body');
    for (const k of Object.keys(skeletonPelvis.landmarks) as (keyof typeof skeletonPelvis.landmarks)[]) for (let c = 0; c < 3; c++) expect(p.landmarks[k][c]).toBeCloseTo(skeletonPelvis.landmarks[k][c] + D[c], 5);
    expect(p.outlet.ring.length).toBe(skeletonPelvis.outlet.ring.length);
    p.midpelvis.ring.forEach((q, i) => expect(dist(q, skeletonPelvis.midpelvis.ring[i])).toBeCloseTo(Math.hypot(...D), 4));
    expect(t.landmarks.navel).toBeCloseTo(skeletonTorso.landmarks.navel + D[1], 5);
    t.discs.forEach((y, i) => expect(y).toBeCloseTo(skeletonTorso.discs[i] + D[1], 5));
    t.spineFront.forEach((s, i) => { expect(s.length).toBe(2); expect(s[0]).toBeCloseTo(skeletonTorso.spineFront[i][0] + D[1], 5); expect(s[1]).toBeCloseTo(skeletonTorso.spineFront[i][1] + D[2], 5); });
    expect(t.stature).toBe(skeletonTorso.stature);
    // (its lengths and angles are NOT measured again: they are the skeleton's, whatever the carry did -- see below)
    expect(p.cm).toEqual(skeletonPelvis.cm); expect(p.inlet.angleDeg).toBe(skeletonPelvis.inlet.angleDeg);
  });
});

describe("the files written for v2", () => {
  it('are finite, in metres about her, and in order', () => {
    for (const f of [v2Pelvis, v2Torso, v2Thorax]) for (const x of numbers(f)) expect(Number.isFinite(x)).toBe(true);
    for (const p of [...Object.values(v2Pelvis.landmarks), ...v2Pelvis.inlet.ring, ...v2Pelvis.midpelvis.ring, ...v2Pelvis.outlet.ring, ...v2Pelvis.axis]) { expect(Math.abs(p[0])).toBeLessThan(0.12); expect(p[1]).toBeGreaterThan(0.7); expect(p[1]).toBeLessThan(1.0); expect(Math.abs(p[2])).toBeLessThan(0.2); }
    expect(v2Pelvis.inlet.ring.length).toBe(skeletonPelvis.inlet.ring.length); expect(v2Pelvis.axis.length).toBe(skeletonPelvis.axis.length);
    for (let i = 1; i < v2Torso.spineFront.length; i++) expect(v2Torso.spineFront[i][0]).toBeGreaterThan(v2Torso.spineFront[i - 1][0]);
    for (let i = 1; i < v2Torso.discs.length; i++) expect(v2Torso.discs[i]).toBeGreaterThan(v2Torso.discs[i - 1]);
    const s = Th.sections;
    for (let i = 0; i < s.length; i++) { expect(s[i].left).toBeGreaterThan(s[i].right + 0.05); expect(s[i].front).toBeGreaterThan(s[i].back + 0.03); if (i) expect(s[i].y).toBeGreaterThan(s[i - 1].y); }
    for (let i = 1; i < Th.spineFront.length; i++) expect(Th.spineFront[i][0]).toBeGreaterThan(Th.spineFront[i - 1][0]);
    expect(Th.xiphoid[1]).toBeCloseTo(v2Torso.landmarks.xiphoid[1], 2); expect(Th.xiphoid[2]).toBeCloseTo(v2Torso.landmarks.xiphoid[2], 2);
  });

  it('her chest lays on them: every point a number, her lungs holding a woman\'s', () => {
    const L = layThorax(Th, 0), left = lungMesh(L, 1), right = lungMesh(L, -1), L1 = layThorax(Th, 1);
    for (const m of [left, right, heartMesh(L, 1), diaphragmMesh(L)]) for (const v of m.points) expect(Number.isFinite(v)).toBe(true);
    const out = (meshVolume(left) + meshVolume(right)) * 1e6, tidal = (meshVolume(lungMesh(L1, 1)) + meshVolume(lungMesh(L1, -1))) * 1e6 - out;
    expect(out).toBeGreaterThan(1800); expect(out).toBeLessThan(4200); expect(tidal).toBeGreaterThan(250);
    for (let k = 0; k < 20; k++) layThorax(Th, k / 20); // (warm)
    const t0 = performance.now(); let n = 0;
    for (let b = 0; b < 1; b += 0.012) { const A = layThorax(Th, b); lungMesh(A, 1); lungMesh(A, -1); diaphragmMesh(A); heartMesh(A, 0.5); n++; }
    console.log(`[v2 thorax] lungs ${out.toFixed(0)} mL at rest, a quiet breath ${tidal.toFixed(0)} mL (LUNGS.tidalMl 500); laid again ${n} times a breath in, ${((performance.now() - t0) / n).toFixed(2)} ms each here`);
  });

  // REVIEW FINDINGS. Each is `it.fails`: the assertion says what should hold, the comment what the file has.
  // thorax/v2.json sternumTop = [0.00462, 1.38349, -0.0631]: its z is the FRONT OF HER SPINE there (-0.0612), not her
  // breastbone (her xiphoid is at z +0.054; her rib cage's inner front at y 1.37 is -0.027). measureThorax took a neck
  // vertebra's body for "the bone on her midline at her front": above her breastbone the widest hollow on her midline is
  // her spinal canal. layThorax reads only its height (the breastbone's length, for her domes): about 3 cm too long.
  it.fails("the top of her breastbone is in front of her spine, as her xiphoid is", () => {
    expect(Th.sternumTop[2]).toBeGreaterThan(thoraxSpineAt(Th, Th.sternumTop[1]) + 0.03);
  });
  // ... and the top slice (y 1.37892, which is `apex`, the top of her lungs) has its inner FRONT wall (-0.0657) behind
  // the front of her spine (-0.0615): it is a slice of her neck's base, not of her rib cage.
  it.fails("every slice's inner front wall is ahead of her spine's front", () => {
    for (const s of Th.sections) expect(s.front).toBeGreaterThan(thoraxSpineAt(Th, s.y));
  });
  // The slice at y 1.28892 is 1.5 cm wider on her left (0.1339) and 1.0 cm on her right than the slices 1 cm above and
  // below it (0.1192 / 0.1188): bone that is not rib (carried by her chest bone) in that slice. Her lungs follow the wall.
  it.fails('her rib cage is no wider in one slice than in its neighbours by a centimetre', () => {
    const s = Th.sections;
    for (let i = 1; i + 1 < s.length; i++) expect(s[i].left - Math.max(s[i - 1].left, s[i + 1].left)).toBeLessThan(0.01);
  });
  // pelvis/v2.json keeps the skeleton's `cm` ("its lengths and angles left as measured ... the fit moves a bone's
  // surface by millimetres, not its size") -- but the carry moved symphysisBottom 18.4 mm and symphysisBack 5.4 mm, so
  // its own points give an obstetric conjugate of 11.07 cm where `cm` says 11.6.
  it.fails("the pelvis file's lengths are its own points'", () => {
    expect(dist(v2Pelvis.landmarks.promontory, v2Pelvis.landmarks.symphysisBack) * 100).toBeCloseTo(v2Pelvis.cm.obstetricConjugate, 1);
  });
  it.fails('the fit moved her pelvis\'s landmarks by millimetres (under 5), as carryLandmarks says', () => {
    for (const k of Object.keys(skeletonPelvis.landmarks) as (keyof typeof skeletonPelvis.landmarks)[]) expect(dist(v2Pelvis.landmarks[k], skeletonPelvis.landmarks[k])).toBeLessThan(0.005);
  });
});
