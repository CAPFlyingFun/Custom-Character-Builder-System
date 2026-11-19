/**
 * SARAH'S BASE MANNEQUIN, as the Sarah Lab loads it (`public/models/sarah-base.glb`).
 *
 * Joshua, 2026-10-07: a belly slider "from this max size to almost flat", and
 * clothes for her, tried in a dev menu "before placing live". The bake adds the
 * `belly` morph target (scripts/bellyMorph.mjs) and grows a shirt and leggings
 * from her skin (scripts/growClothes.mjs). This pins what the lab depends on.
 */
import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import * as labTool from '../src/sarahlab/sarahLabTool';
import { BELLY_KEYS, BELLY_MOTION, BELLY_SPRING, bellyMotionWeights, breastBobWeight, breastWeights, BREAST_SPRING, stepBreastSpring, fingerBend, FINGER_LIMITS_DEG, restingBellySpring, stepBellySpring, walkBounceAccel, bellyWeights, bumpLine, fingersLine, sarahLabTool, statusLine, modelLine, SARAH_LAB_MODELS } from '../src/sarahlab/sarahLabTool';


describe('the base mannequin (public/models/sarah-base.glb)', () => {
  it('adds 0.075 mm of navel projection per percent and caps at 140%', () => {
    expect(labTool.navelWeights(0)).toEqual({navelIn:0,navelOut:0});
    for(const percent of [1,25,50,75,100,125,140,150,200]) {
      expect(labTool.navelWeights(percent).navelOut*10.5).toBeCloseTo(Math.min(10.5,percent*.075));
      expect(labTool.navelWeights(percent).navelIn).toBe(0);
    }
    expect(labTool.navelWeights(200)).toEqual({navelIn:0,navelOut:1});
    // v2's outie: settled to 75%, rising smoothly to as modelled by 100%, kept past it
    expect(labTool.navelFlatWeight(0)).toBe(1);
    expect(labTool.navelFlatWeight(75)).toBe(1);
    expect(labTool.navelFlatWeight(87.5)).toBeCloseTo(0.5);
    expect(labTool.navelFlatWeight(100)).toBe(0);
    expect(labTool.navelFlatWeight(200)).toBe(0);
    for (let p = 75; p < 100; p += 1) expect(labTool.navelFlatWeight(p + 1)).toBeLessThanOrEqual(labTool.navelFlatWeight(p));
    // a real T-pose at any angle: arms modelled down are raised toward level, arms modelled level are left alone
    const down = labTool.tPoseTurns([{ x: 0.2, y: 1.4, z: 0 }, { x: 0.2, y: 1.1, z: 0 }], [{ shoulder: 0, elbow: 1, out: 1 }]);
    expect(down).toHaveLength(1); expect(down[0].radians).toBeCloseTo(Math.PI / 2); expect(Math.abs(down[0].az)).toBeCloseTo(1);
    expect(labTool.tPoseTurns([{ x: 0.2, y: 1.4, z: 0 }, { x: 0.2, y: 1.1, z: 0 }], [{ shoulder: 0, elbow: 1, out: 1, fraction: 1 / 3 }])[0].radians).toBeCloseTo(Math.PI / 6);
    expect(labTool.tPoseTurns([{ x: 0.2, y: 1.4, z: 0 }, { x: 0.2, y: 1.1, z: 0 }], [{ shoulder: 0, elbow: 1, out: 1, fraction: 0 }])).toHaveLength(0);
    expect(labTool.tPoseTurns([{ x: 0.2, y: 1.4, z: 0 }, { x: 0.5, y: 1.4, z: 0 }], [{ shoulder: 0, elbow: 1, out: 1 }])).toHaveLength(0);
    expect(labTool.armRaiseWeight(0)).toBe(0); expect(labTool.armRaiseWeight(90)).toBe(1); expect(labTool.armRaiseWeight(45)).toBeCloseTo(0.75);
    expect(labTool.armsLine(30, 'left')).toBe('ARMS · 30° · left only'); expect(labTool.armsLine(90)).toBe('ARMS · 90°');
    // v2's seated corrective: never standing, nothing by 50%, all at 100%, growing to 200%
    for (const p of [0, 50, 100, 150, 200]) expect(labTool.seatCorrectiveV2Weight(0, p)).toBe(0);
    expect(labTool.seatCorrectiveV2Weight(1, 50)).toBe(0);
    expect(labTool.seatCorrectiveV2Weight(1, 100)).toBe(1);
    expect(labTool.seatCorrectiveV2Weight(1, 200)).toBe(2);
    for (let p = 50; p < 200; p += 1) expect(labTool.seatCorrectiveV2Weight(1, p + 1)).toBeGreaterThanOrEqual(labTool.seatCorrectiveV2Weight(1, p));
  });

});


describe('the bump\'s spring', () => {
  it('lags a jolt and settles like a weight, not a jelly: the second swing is a fraction of the first', () => {
    const s = restingBellySpring();
    s.vy = 0.3;
    const ys: number[] = [];
    for (let k = 0; k < 240; k += 1) { stepBellySpring(s, 1 / 60, 0, 0); ys.push(s.y); }
    const first = Math.max(...ys.slice(0, 20));
    // the opposite swing, then the next same-side peak
    const firstAt = ys.indexOf(first);
    const back = Math.min(...ys.slice(firstAt, firstAt + 30));
    expect(first).toBeGreaterThan(0.004);
    expect(first).toBeLessThanOrEqual(BELLY_SPRING.maxM);
    expect(-back / first).toBeLessThan(0.45);
    expect(-back / first).toBeGreaterThan(0.15);
    // four seconds on, it has stopped
    expect(Math.abs(s.y)).toBeLessThan(0.0002);
  });

  it('throws the bump against the body: rising drops it, a step left swings it right; a jump is clamped', () => {
    const s = restingBellySpring();
    stepBellySpring(s, 0.05, 5, 5);
    expect(s.y).toBeGreaterThan(0);
    expect(s.x).toBeLessThan(0);
    const t = restingBellySpring();
    stepBellySpring(t, 0.05, 1e6, Number.NaN);
    expect(Math.abs(t.y)).toBeLessThanOrEqual(BELLY_SPRING.maxM);
    expect(t.x).toBe(0);
  });

  it('scales with the bump: a flat belly carries no weight, and the slider tilts a full one by its degrees', () => {
    const s = restingBellySpring();
    s.y = 0.01; s.x = 0.005;
    for (const w of Object.values(bellyMotionWeights(0, 3, s))) expect(w).toBe(0);
    const still = bellyMotionWeights(100, 3, restingBellySpring());
    expect(still[BELLY_MOTION.tilt]).toBeCloseTo((3 * Math.PI) / 180 / BELLY_MOTION.tiltRad, 6);
    expect(still[BELLY_MOTION.bob]).toBe(0);
    const half = bellyMotionWeights(50, 2, restingBellySpring());
    expect(half[BELLY_MOTION.tilt]).toBeCloseTo((0.5 * 2 * Math.PI) / 180 / BELLY_MOTION.tiltRad, 6);
    // up to 10°, and a bigger belly tilts by the slider's degrees, not twice them
    const ten = (10 * Math.PI) / 180 / BELLY_MOTION.tiltRad;
    expect(bellyMotionWeights(100, 99, restingBellySpring())[BELLY_MOTION.tilt]).toBeCloseTo(ten, 6);
    // past 100% the size tilts it by itself, evenly to 20° at 200%, on top of the slider
    const deg = (d: number) => (d * Math.PI) / 180 / BELLY_MOTION.tiltRad;
    expect(bellyMotionWeights(100, 0, restingBellySpring())[BELLY_MOTION.tilt]).toBe(0);
    expect(bellyMotionWeights(150, 0, restingBellySpring())[BELLY_MOTION.tilt]).toBeCloseTo(deg(10), 6);
    expect(bellyMotionWeights(200, 0, restingBellySpring())[BELLY_MOTION.tilt]).toBeCloseTo(deg(20), 6);
    expect(bellyMotionWeights(200, 10, restingBellySpring())[BELLY_MOTION.tilt]).toBeCloseTo(deg(30), 6);
  });

  it('lets the breasts bounce on a spring of their own, lighter and quicker, as big as they are', () => {
    const s = restingBellySpring(), b = restingBellySpring();
    s.vy = 0.3; b.vy = 0.3;
    let peakS = 0, peakB = 0, tS = 0, tB = 0;
    for (let k = 1; k <= 60; k += 1) {
      stepBellySpring(s, 1 / 120, 0, 0); stepBreastSpring(b, 1 / 120, 0, 0);
      if (s.y > peakS) { peakS = s.y; tS = k; }
      if (b.y > peakB) { peakB = b.y; tB = k; }
    }
    expect(tB).toBeLessThan(tS); // quicker
    expect(peakB).toBeLessThanOrEqual(BREAST_SPRING.maxM);
    const lifted = restingBellySpring(); lifted.y = 0.01;
    expect(breastBobWeight(200, lifted)).toBeCloseTo((1.55 / 1.3) * breastBobWeight(100, lifted), 6);
    expect(breastBobWeight(0, lifted)).toBeGreaterThan(0);
  });

  it("adds a walk's bounce, two a stride", () => {
    expect(walkBounceAccel(0, 1)).toBeLessThan(0);
    expect(walkBounceAccel(0.25, 1)).toBeGreaterThan(0);
    expect(walkBounceAccel(0.5, 1)).toBeCloseTo(walkBounceAccel(0, 1), 9);
    expect(walkBounceAccel(0.3, 0)).toBe(0);
  });
});

describe("Sarah's fingers in the lab", () => {
  it('bend each joint only toward the palm and only as far as a hand can: never backward, never past its limit', () => {
    const deg = (r: number) => (r * 180) / Math.PI;
    for (const thumb of [false, true]) {
      const limits = thumb ? FINGER_LIMITS_DEG.thumb : FINGER_LIMITS_DEG.finger;
      limits.forEach((limit, k) => {
        expect(fingerBend(0, k, thumb)).toBe(0);
        expect(deg(fingerBend(100, k, thumb))).toBeCloseTo(limit, 6);
        expect(deg(fingerBend(50, k, thumb))).toBeCloseTo(limit / 2, 6);
        expect(fingerBend(-40, k, thumb)).toBe(0); // no bending back
        expect(deg(fingerBend(250, k, thumb))).toBeCloseTo(limit, 6); // no bending past
      });
    }
    // a fist no longer folds a finger 240° into its own palm, and the thumb's base barely bends
    expect(FINGER_LIMITS_DEG.finger.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(220);
    expect(FINGER_LIMITS_DEG.thumb[0]).toBeLessThan(FINGER_LIMITS_DEG.thumb[1]);
  });
});


describe('the Sarah Lab', () => {
  it('hides only triangles fully inside a visible garment and restores all skin when undressed', () => {
    const cut = (labTool as unknown as { uncoveredSkinIndices: (indices: Uint16Array, coverage: Uint8Array, shown: number) => Uint32Array }).uncoveredSkinIndices;
    expect(cut).toBeTypeOf('function');
    const indices = new Uint16Array([0, 1, 2, 2, 3, 4, 3, 4, 5]);
    const coverage = new Uint8Array([1, 1, 1, 2, 2, 2]);
    expect([...cut(indices, coverage, 1)]).toEqual([2, 3, 4, 3, 4, 5]);
    expect([...cut(indices, coverage, 2)]).toEqual([0, 1, 2, 2, 3, 4]);
    expect([...cut(indices, coverage, 3)]).toEqual([2, 3, 4]);
    expect([...cut(indices, coverage, 0)]).toEqual([...indices]);
  });
  it('is a dev tool of its own, reading only the base model', () => {
    expect(sarahLabTool.sceneId).toBe('lab:sarah');
  });
  it('reads the bump slider as how much bump there is', () => {
    const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum(bellyWeights(100))).toBe(0);
    expect(bellyWeights(0)).toMatchObject({ belly: 1, belly25: 0 });
    expect(bellyWeights(75)).toMatchObject({ belly75: 1, belly50: 0 });
    expect(bellyWeights(30)).toMatchObject({ belly30: 1, belly25: 0, belly50: 0 });
    expect(bellyWeights(40).belly30).toBeCloseTo(.5, 8);
    expect(bellyWeights(40).belly50).toBeCloseTo(.5, 8);
    expect(bellyWeights(60)).toMatchObject({ belly60: 1, belly50: 0, belly75: 0 });
    expect(bellyWeights(62.5).belly75).toBeCloseTo(1/6);
    expect(bellyWeights(62.5).belly60).toBeCloseTo(5/6);
    expect(bellyWeights(62.5).belly50).toBe(0);
    // past the model: 150% is its own key, 175% halfway to 200%, and it stops at 200%
    expect(bellyWeights(150)).toMatchObject({ belly150: 1, belly200: 0, belly75: 0 });
    expect(bellyWeights(175).belly200).toBeCloseTo(0.5);
    expect(bellyWeights(125).belly150).toBeCloseTo(0.5);
    expect(bellyWeights(500)).toMatchObject({ belly200: 1, belly150: 0 });
    expect(bumpLine(160)).toMatch(/past full term/);
    // (past HER full term: her BIGGEST, 120% for a first baby by the rule and 175% with twins -- pregnancy.ts)
    expect(bumpLine(120, 120)).toBe(bumpLine(120).replace(' · past full term', '')); expect(bumpLine(121, 120)).toMatch(/past full term/);
    expect(bumpLine(160, 175)).not.toMatch(/past full term/); expect(bumpLine(101)).toMatch(/past full term/);
    // Original model at zero, then nominal volume targets 1.30 and 1.55.
    expect(breastWeights(0)).toEqual({ breast0: 0, breast100: 0 });
    expect(breastWeights(50).breast100).toBeCloseTo(.15 / .55, 8);
    expect(breastWeights(100).breast100).toBeCloseTo(.30 / .55, 8);
    expect(breastWeights(150).breast100).toBeCloseTo(.425 / .55, 8);
    expect(breastWeights(200).breast100).toBeCloseTo(1, 8);
    expect(breastWeights(-10)).toEqual(breastWeights(0));
    expect(breastWeights(300)).toEqual(breastWeights(200));
    expect(breastWeights(Number.NaN)).toEqual(breastWeights(100));
    expect(bumpLine(0)).toMatch(/bust volume target 1.00×/);
    expect(bumpLine(100)).toMatch(/bust volume target 1.30×/);
    expect(bumpLine(200)).toMatch(/bust volume target 1.55×/);
    expect(bumpLine(100)).toMatch(/as modelled/);
    expect(bumpLine(0)).toMatch(/nearly flat/);
    expect(fingersLine(100)).toMatch(/fist/);
    expect(statusLine(false, true, [], false)).toMatch(/did not load/);
    expect(statusLine(true, false, [], true, SARAH_LAB_MODELS.findIndex((m) => m.id === 'skeleton'))).toBe('model skeleton · belly slider · no clothes in this file yet');
    // (Joshua, 2026-11-13: "disable all other models and call it like it's supposed to 'Female Base Model'"; "let's
    // remove the word Sarah and keep everything generic")
    const { modelsOnMenu, nextModel, modelName } = labTool;
    const base = SARAH_LAB_MODELS.findIndex((m) => m.id === 'v2-body');
    expect(modelLine(base)).toBe('MODEL · Female Base Model');
    expect(statusLine(true, false, ['a', 'b'], true, base)).toBe('Female Base Model · belly slider · 2 garments');
    // (left off when it is already the line above: a character with no name of her own goes by her model's)
    expect(statusLine(true, false, ['a', 'b'], true, base, false)).toBe('belly slider · 2 garments');
    expect(statusLine(false, false, [], false, base)).toBe('loading Female Base Model…');
    for (let i = 0; i < SARAH_LAB_MODELS.length; i++) expect(statusLine(false, false, [], false, i)).not.toMatch(/sarah/i);
    // one model on the menu: MODEL has nowhere else to step, from any model
    expect(modelsOnMenu()).toBe(1);
    for (let i = 0; i < SARAH_LAB_MODELS.length; i++) expect(nextModel(i)).toBe(base);
    expect(modelName('v2-body')).toBe('Female Base Model'); expect(modelName('skeleton')).toBe('skeleton');
    expect(SARAH_LAB_MODELS.map((m) => m.path)).toEqual(['models/sarah-v2-body-slim.glb', 'models/sarah-skeleton.glb']);
  });
});


describe("Sarah v2's own belly (public/models/sarah-v2.glb; scripts/bellyV2.mjs)", () => {
  it('steps through the same keys as v1, carries the switchable curve, and moves no breast with the belly', async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(`public/${labTool.SARAH_V2_BODY_MODEL}`);
    const names: string[] = doc.getRoot().listMeshes()[0].getExtras().targetNames as string[];
    // every stop of the slider has its own key (a missing 30% or 60% showed 100%)
    for (const [, name] of BELLY_KEYS) if (name) expect(names).toContain(name);
    expect(names).toContain(labTool.BELLY_REFINE_TARGET);
  }, 60000);

  it('turns the curve on at 100% only when asked, fading out below and above', () => {
    expect(labTool.refineWeight(false, 100)).toBe(0);
    expect(labTool.refineWeight(true, 100)).toBe(1);
    expect(labTool.refineWeight(true, 80)).toBe(0);
    expect(labTool.refineWeight(true, 125)).toBeCloseTo(0.5);
    expect(labTool.refineWeight(true, 150)).toBe(0);
    expect(labTool.refineLine(false)).toBe('CURVE · as modelled');
    expect(labTool.refineLine(true)).toBe('CURVE · refined');
  });
});

describe('the athletic-fit tee (scripts/fitAthleticTee.mjs)', () => {
  it('offers the under-the-belly leggings only to a model that carries them, with their trims', () => {
    const v2 = ['shirt', 'leggings', 'leggingsLow', 'bikini'] as const, v1 = ['shirtAthletic', 'shirt', 'leggings', 'bikini', 'swimsuit'] as const;
    const low = labTool.OUTFITS.findIndex((o) => o.garments.includes('leggingsLow'));
    expect(low).toBeGreaterThan(0);
    expect(labTool.nextOutfit(low - 1, [...v2])).toBe(low);
    expect(labTool.nextOutfit(low - 1, [...v1])).not.toBe(low);
    expect(labTool.wornGarments(low, [...v2])).toEqual(['shirt', 'leggingsLow']);
    expect(labTool.coverMask(['leggingsLow'])).toBe(1 << 5);
    expect(labTool.trimShown('shirtTrim', ['shirt', 'leggings'])).toBe(true);
    expect(labTool.trimShown('leggingsTrim', ['shirt', 'leggings'])).toBe(false);
    expect(labTool.trimShown('leggingsLowTrim', ['shirt', 'leggingsLow'])).toBe(true);
    expect(labTool.trimShown('leggingsLowTrim', ['shirt', 'leggings'])).toBe(false);
    expect(labTool.trimShown('shirt', ['shirt'])).toBeNull();
  });
});

describe('the seated corrective (scripts/addSeatCorrective.mjs)', () => {
  it('is on only while she sits, around 100%, fading out by 50% and by 150%', () => {
    expect(labTool.seatCorrectiveWeight(0, 100)).toBe(0);
    expect(labTool.seatCorrectiveWeight(0, 200)).toBe(0);
    expect(labTool.seatCorrectiveWeight(1, 100)).toBe(1);
    expect(labTool.seatCorrectiveWeight(0.5, 100)).toBeCloseTo(0.5);
    expect(labTool.seatCorrectiveWeight(1, 20)).toBe(0);
    expect(labTool.seatCorrectiveWeight(1, 130)).toBeCloseTo(0.5);
    expect(labTool.seatCorrectiveWeight(1, 150)).toBe(0);
    expect(labTool.seatCorrectiveWeight(1, 200)).toBe(0);
  });
});

describe('the pregnant sit opens for a bigger belly', () => {
  it('parts the knees further past 100% and keeps the 100% sit exactly', async () => {
    const { poseSeated } = await import('../src/actor/humanSeated');
    const { measureHuman } = await import('../src/actor/humanSkeleton');
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(`public/${labTool.SARAH_V2_BODY_MODEL}`);
    const joints = doc.getRoot().listSkins()[0].listJoints();
    const bind = joints.map((j) => { const m = j.getWorldMatrix(); const p = j.getParentNode(); return { x: m[12], y: m[13], z: m[14], parent: p ? joints.indexOf(p as never) : -1 }; });
    const me = measureHuman(bind as never);
    const sit = (bump?: number) => JSON.stringify(poseSeated(me, bind as never, { style: 'sit', seconds: 0, posture: 'pregnant', bump }, []));
    expect(sit(1)).toBe(sit(undefined));
    expect(sit(0.5)).toBe(sit(1));
    expect(sit(2)).not.toBe(sit(1));
  }, 60000);
});

describe("Sarah v2's refinement (scripts/sarahV2Refine.mjs, 2026-10-15)", () => {
  it('carries the upper-belly and breast-growth shapes, and the Lab weighs the upper belly by the ratios stamped in the file', async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(`public/${labTool.SARAH_V2_BODY_MODEL}`);
    const extras = doc.getRoot().listMeshes()[0].getExtras() as { targetNames: string[]; bellyUpperScale: [number, number][] };
    expect(extras.targetNames).toContain(labTool.BELLY_UPPER_TARGET);
    expect(extras.targetNames).toContain(labTool.BREAST_GROW_TARGET);
    expect(extras.bellyUpperScale).toEqual(labTool.BELLY_UPPER_SCALE.map(([s, r]) => [s, r]));
  }, 60000);

  it('grows the upper belly with each size: nothing flat, all of it at 100%, more past it', () => {
    expect(labTool.bellyUpperWeight(0)).toBe(0);
    expect(labTool.bellyUpperWeight(100)).toBe(1);
    expect(labTool.bellyUpperWeight(200)).toBeCloseTo(1.649);
    expect(labTool.bellyUpperWeight(125)).toBeCloseTo((1 + 1.32) / 2);
    for (let p = 0; p < 200; p += 5) expect(labTool.bellyUpperWeight(p + 5)).toBeGreaterThanOrEqual(labTool.bellyUpperWeight(p));
  });

  it('grows the bust evenly to the same volume targets, and only on a model that carries the shape', () => {
    expect(labTool.breastGrowWeight(0)).toBe(0);
    expect(labTool.breastGrowWeight(200)).toBeCloseTo(1);
    // an even scaling by (1 + w·(∛1.55 − 1)) holds the nominal volume target at every size
    for (const p of [25, 50, 100, 150, 200]) {
      const s = 1 + labTool.breastGrowWeight(p) * (Math.cbrt(labTool.BREAST_GROW_MAX_VOLUME) - 1);
      expect(s ** 3).toBeCloseTo(labTool.breastVolumeRatio(p), 6);
    }
    expect(labTool.breastWeightsFor(100, false)).toEqual(labTool.breastWeights(100));
    expect(labTool.breastWeightsFor(100, true)).toEqual({ breast0: 0, breast100: 0, breastGrow: labTool.breastGrowWeight(100) });
  });

  it('sits v2 the settled way and leaves v1 its own sit', () => {
    expect(labTool.settledSitFor('v1')).toBe(false);
    expect(labTool.settledSitFor('v2')).toBe(true);
    expect(labTool.settledSitFor('v2-arms')).toBe(true);
    expect(labTool.settledSitFor('v2-body')).toBe(true);
  });
});

describe('the settled pregnant sit (Sarah v2)', () => {
  it('parts the knees by the belly, brings the feet in under them, and leaves the older sit exactly', async () => {
    const { poseSeated, posedJoints } = await import('../src/actor/humanSeated');
    const { measureHuman } = await import('../src/actor/humanSkeleton');
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(`public/${labTool.SARAH_V2_BODY_MODEL}`);
    const joints = doc.getRoot().listSkins()[0].listJoints();
    const bind = joints.map((j) => { const m = j.getWorldMatrix(); const p = j.getParentNode(); return { x: m[12], y: m[13], z: m[14], parent: p ? joints.indexOf(p as never) : -1 }; });
    const me = measureHuman(bind as never), J = me.joints;
    const sit = (bump: number, settled?: boolean) => poseSeated(me, bind as never, { style: 'sit', seconds: 0, posture: 'pregnant', bump, settled }, []);
    // not asking for it changes nothing
    expect(JSON.stringify(sit(1, false))).toBe(JSON.stringify(sit(1)));
    let lastKnees = 0;
    for (const bump of [0, 1, 1.5, 2]) {
      const P = posedJoints(bind as never, sit(bump, true));
      const knees = Math.abs(P[J.kneeL][0] - P[J.kneeR][0]), feet = Math.abs(P[J.ankleL][0] - P[J.ankleR][0]);
      // Joshua, 2026-10-15: "the feet could be closer together while the legs/knees are spread out more"
      expect(feet).toBeLessThan(knees);
      expect(knees).toBeGreaterThan(lastKnees);
      lastKnees = knees;
      // and never splayed past the older sit's
      const O = posedJoints(bind as never, sit(bump));
      expect(feet).toBeLessThan(Math.abs(O[J.ankleL][0] - O[J.ankleR][0]));
    }
  }, 60000);
});

describe('the Lab opens on the newest v2', () => {
  it('starts on v2-body: v2-arms with the body-shape fields, which at their defaults is v2-arms', () => {
    expect(labTool.SARAH_LAB_MODELS[labTool.SARAH_LAB_DEFAULT_MODEL].id).toBe('v2-body');
  });
});
