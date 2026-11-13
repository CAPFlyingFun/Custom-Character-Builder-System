/**
 * HER BREATH AND HEARTBEAT (actor/vitals.ts) and HER SKIN'S BREATH (sarahlab/breathSkin.ts):
 * - at rest she breathes 14 a minute, half a litre, her heart at 70; pregnant at term deeper, a little quicker, her heart
 *   about 12 higher; her peak heart rate is 206 - 0.88 x her age;
 * - working, her breath grows first in size (to about half her vital capacity), then in rate, never past 50 a minute;
 * - her effort climbs over about half a minute and comes down slower; above her threshold her energy drains, below it
 *   fills; spent energy keeps her winded after she stops, and with little left her breaths come quicker and shallower;
 * - her chest's share of each breath by how she lies is research's (59.5% standing, 43.2% on her back...);
 * - her skin's move: her chest's front forward and sides out, her belly's front forward, nothing past her trunk's sides
 *   (her arms) or her back; each move sweeps exactly its share of the breath's air.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY, BREATHING, CHEST_SHARE, HEARTBEAT, PREGNANT_FLARE, breathFlare, breathOf, chestShare, peakHeart, pregnancyShare, restingVitals, stepVitals, vitalsFor,
} from '../src/actor/vitals';
import { BREATH_SLICES, BREATH_SPAN, breathAt, breathVolumes, createBreathUniforms, layBreathTable } from '../src/sarahlab/breathSkin';

/** Step her vitals `seconds` at `intensity`, 1/30 s a step; the last of them. */
function run(v = restingVitals(), seconds: number, intensity: number, weeks = 0) {
  let now = stepVitals(v, 0, intensity, { weeks });
  for (let t = 0; t < seconds; t += 1 / 30) now = stepVitals(v, 1 / 30, intensity, { weeks });
  return now;
}

describe('her breath and her heart', () => {
  it('at rest: 14 a minute, half a litre, 70 beats; pregnant at term deeper, quicker, her heart higher', () => {
    const r = vitalsFor(0, 1);
    expect(r.breathsPerMinute).toBeCloseTo(14, 6); expect(r.tidalL).toBeCloseTo(0.5, 6); expect(r.beatsPerMinute).toBeCloseTo(70, 6);
    const p = vitalsFor(0, 1, { weeks: 40 });
    expect(p.tidalL).toBeCloseTo(0.7, 6); expect(p.breathsPerMinute).toBeCloseTo(16, 6); expect(p.beatsPerMinute).toBeCloseTo(82, 6);
    expect(pregnancyShare(0)).toBe(0); expect(pregnancyShare(8)).toBe(0); expect(pregnancyShare(36)).toBe(1);
    expect(peakHeart(28)).toBeCloseTo(181.36, 6); expect(peakHeart(40)).toBeCloseTo(170.8, 6);
  });

  it('working, a breath grows first in size, then in rate, and never past 50 a minute', () => {
    const walk = vitalsFor(ACTIVITY.walk, 1), run6 = vitalsFor(0.6, 1), sprint = vitalsFor(1, 1);
    expect(walk.tidalL).toBeGreaterThan(1); expect(walk.breathsPerMinute).toBeGreaterThan(15); expect(walk.breathsPerMinute).toBeLessThan(24);
    // running, 30-40 a minute; at her hardest near 50
    { const r = vitalsFor(ACTIVITY.run, 1); expect(r.breathsPerMinute).toBeGreaterThan(30); expect(r.breathsPerMinute).toBeLessThan(40); }
    // at 0.6 of her hardest a breath is as big as it gets: half her vital capacity
    expect(run6.tidalL).toBeCloseTo(BREATHING.tidalOfVital * BREATHING.vitalL, 6);
    expect(sprint.tidalL).toBeCloseTo(run6.tidalL, 6);
    expect(sprint.breathsPerMinute).toBeGreaterThan(run6.breathsPerMinute);
    expect(sprint.breathsPerMinute).toBeLessThanOrEqual(BREATHING.mostPerMinute);
    expect(sprint.beatsPerMinute).toBeCloseTo(peakHeart(HEARTBEAT.age), 6);
    // what she breathes a minute grows all the way
    let last = 0;
    for (let e = 0; e <= 1; e += 0.05) { const x = vitalsFor(e, 1), vent = x.tidalL * x.breathsPerMinute; expect(vent).toBeGreaterThanOrEqual(last - 1e-9); last = vent; }
  });

  it('her effort climbs over about half a minute and comes down slower; her energy drains above her threshold and fills below it', () => {
    const v = restingVitals();
    let now = run(v, 30, ACTIVITY.run);
    expect(now.effort).toBeGreaterThan(0.45); expect(now.effort).toBeLessThan(0.6);
    now = run(v, 150, ACTIVITY.run);
    expect(now.effort).toBeGreaterThan(0.79);
    // a hard run tires her over a quarter of an hour; her hardest over minutes
    expect(now.energy).toBeGreaterThan(0.8);
    now = run(v, 600, ACTIVITY.run);
    expect(now.energy).toBeLessThan(0.4); expect(now.energy).toBeGreaterThan(0);
    { const f = restingVitals(); const s5 = run(f, 420, ACTIVITY.sprint); expect(s5.energy).toBeLessThan(0.05); expect(run(restingVitals(), 240, ACTIVITY.sprint).energy).toBeGreaterThan(0.2); }
    const runHeart = now.beatsPerMinute;
    expect(runHeart).toBeGreaterThan(150);
    // stopping: a minute on, her heart has come well down but not to rest, and she is still winded
    const stopped = run(v, 60, ACTIVITY.rest);
    expect(runHeart - stopped.beatsPerMinute).toBeGreaterThan(12);
    expect(stopped.beatsPerMinute).toBeGreaterThan(90);
    expect(stopped.breathsPerMinute).toBeGreaterThan(17);
    // five minutes on, nearly rested
    const later = run(v, 300, ACTIVITY.rest);
    expect(later.energy).toBeGreaterThan(stopped.energy);
    expect(later.beatsPerMinute).toBeLessThan(stopped.beatsPerMinute);
    // walking is below her threshold: it never tires her
    const w = restingVitals(); const walked = run(w, 600, ACTIVITY.walk);
    expect(walked.energy).toBe(1);
  });

  it('with little energy left her breaths come quicker and shallower and her heart drifts up', () => {
    const full = vitalsFor(0.8, 1), spent = vitalsFor(0.8, 0.05);
    expect(spent.breathsPerMinute).toBeGreaterThan(full.breathsPerMinute);
    expect(spent.tidalL).toBeLessThan(full.tidalL);
    const a = restingVitals(), b = restingVitals(); b.energy = 0.05;
    const fresh = run(a, 60, ACTIVITY.jog), tired = run(b, 60, ACTIVITY.jog);
    expect(tired.beatsPerMinute).toBeGreaterThan(fresh.beatsPerMinute + 3);
  });

  it('her breath runs through its cycle: in over the first share, out over the rest', () => {
    expect(breathOf(0)).toBeCloseTo(0, 9); expect(breathOf(0.4)).toBeCloseTo(1, 9); expect(breathOf(0.2)).toBeCloseTo(0.5, 9); expect(breathOf(0.7)).toBeCloseTo(0.5, 9); expect(breathOf(1)).toBeCloseTo(0, 9);
    // a breath taken whole at rest takes about 60/14 s
    const v = restingVitals(); let peaks = 0, was = 0, rising = true;
    for (let t = 0; t < 60; t += 1 / 60) { const b = stepVitals(v, 1 / 60, 0).breath; if (rising && b < was) { peaks++; rising = false; } if (b > was) rising = true; was = b; }
    expect(peaks).toBeGreaterThanOrEqual(13); expect(peaks).toBeLessThanOrEqual(15);
  });

  it("her chest's share by how she lies is research's, and pregnancy flares her lower ribs", () => {
    expect(chestShare({ x: 0, y: -1, z: 0 })).toBeCloseTo(CHEST_SHARE.standing, 9);
    expect(chestShare({ x: 0, y: -1, z: 0 }, true)).toBeCloseTo(CHEST_SHARE.sitting, 9);
    expect(chestShare({ x: 0, y: 0, z: -1 })).toBeCloseTo(CHEST_SHARE.back, 9);
    expect(chestShare({ x: 0, y: 0, z: 1 })).toBeCloseTo(CHEST_SHARE.front, 9);
    expect(chestShare({ x: 1, y: 0, z: 0 })).toBeCloseTo(CHEST_SHARE.side, 9);
    const half = chestShare({ x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 });
    expect(half).toBeCloseTo((CHEST_SHARE.standing + CHEST_SHARE.back) / 2, 9);
    expect(PREGNANT_FLARE).toBeGreaterThan(1.85); expect(PREGNANT_FLARE).toBeLessThan(1.87);
    expect(breathFlare(0)).toBe(1); expect(breathFlare(40)).toBeCloseTo(PREGNANT_FLARE, 9);
  });
});

/** A paper trunk: an elliptic cylinder from 0.8 to 1.45 m, 0.3 wide and 0.24 deep, with two arms beside it (cylinders
 * 0.04 across, 0.04 out from its sides). Points and triangles, and each point's arm share. */
function paperBody() {
  const pts: number[] = [], idx: number[] = [], arm: number[] = [];
  const tube = (cx: number, cz: number, rx: number, rz: number, isArm: number) => {
    const A = 48, R = 66, first = pts.length / 3;
    for (let r = 0; r < R; r++) for (let a = 0; a < A; a++) { const t = (a / A) * Math.PI * 2, y = 0.8 + (r / (R - 1)) * 0.65; pts.push(cx + rx * Math.sin(t), y, cz + rz * Math.cos(t)); arm.push(isArm); }
    for (let r = 0; r + 1 < R; r++) for (let a = 0; a < A; a++) { const p = first + r * A + a, q = first + r * A + ((a + 1) % A); idx.push(p, p + A, q, q, p + A, q + A); }
  };
  tube(0, 0, 0.15, 0.12, 0); tube(0.21, 0, 0.02, 0.02, 1); tube(-0.21, 0, 0.02, 0.02, 1);
  return { rest: Float32Array.from(pts), index: idx, arm: Float32Array.from(arm) };
}

describe('her skin breathes', () => {
  const marks = { pubisTop: 0.87, xiphoid: 1.2, sternumTop: 1.37, midX: 0, ribsLowest: 1.09 };
  it("her trunk's table is her own skin's width, depth and spine, her arms left out", () => {
    const u = createBreathUniforms(), P = paperBody();
    layBreathTable(u, P.rest, P.arm, marks);
    const k = Math.round((1.1 - BREATH_SPAN.from) / BREATH_SPAN.step), s = u.breathSlices.value[k];
    expect(s.x).toBeCloseTo(0.15, 3); expect(s.y).toBeCloseTo(0.15, 3); expect(s.w).toBeCloseTo(0.12, 3); expect(s.z).toBeCloseTo(-0.12 + 0.11, 3);
    expect(u.breathSlices.value.length).toBe(BREATH_SLICES);
    expect(u.breathMarks.value.toArray()).toEqual([0.87, 1.2, 1.37, 0]);
  });

  it('her chest moves forward and out, her belly forward; her back, her arms and below her pubic bone stay', () => {
    const u = createBreathUniforms(), P = paperBody(), o = new THREE.Vector3();
    layBreathTable(u, P.rest, P.arm, marks);
    u.breath.value.set(0.01, 0.01, 1, 1.09);
    // her chest's front, at her breastbone's middle: forward
    breathAt(u, 0, 1.3, 0.12, o); expect(o.z).toBeGreaterThan(0.007); expect(Math.abs(o.x)).toBeLessThan(1e-6);
    // her lower chest's side: out to her left -- below her breastbone's bottom too, where her lower ribs reach down her side
    breathAt(u, 0.15, 1.21, 0, o); expect(o.x).toBeGreaterThan(0.0065);
    breathAt(u, 0.15, 1.13, 0, o); expect(o.x).toBeGreaterThan(0.007);
    // ...but not at her front there: her belly's
    { const c = new THREE.Vector3(); breathAt(u, 0, 1.13, 0.12, c); u.breath.value.y = 0; breathAt(u, 0, 1.13, 0.12, o); u.breath.value.y = 0.01; expect(o.z).toBeLessThan(0.3 * c.z); }
    // her belly's front: forward
    breathAt(u, 0, 1.0, 0.12, o); expect(o.z).toBeGreaterThan(0.009);
    // her back, her arm beside her, below her pubic bone, above her breastbone's top: nothing
    for (const [x, y, z] of [[0, 1.1, -0.12], [0, 1.3, -0.12], [0.21, 1.1, 0.02], [-0.21, 1.25, 0], [0, 0.85, 0.12], [0, 1.42, 0.12]]) {
      breathAt(u, x, y, z, o); expect(o.length()).toBeLessThan(1e-4);
    }
    // a flared pregnancy: her lower ribs out further, her front the same
    const a = breathAt(u, 0.15, 1.12, 0, new THREE.Vector3()).x; u.breath.value.z = PREGNANT_FLARE; const b = breathAt(u, 0.15, 1.12, 0, new THREE.Vector3()).x;
    expect(b / a).toBeGreaterThan(1.5);
    // breathing nothing moves nothing
    u.breath.value.set(0, 0, 1, 1.09); breathAt(u, 0, 1.3, 0.12, o); expect(o.length()).toBe(0);
  });

  it('each move sweeps exactly its share of the air', () => {
    const u = createBreathUniforms(), P = paperBody();
    layBreathTable(u, P.rest, P.arm, marks);
    const swept = breathVolumes(u, P.rest, P.index);
    expect(swept.chest).toBeGreaterThan(0.01); expect(swept.belly).toBeGreaterThan(0.01);
    // breathe half a litre, 60% chest: move every point and measure the paper body's volume grow
    const air = 0.0005, share = 0.6;
    u.breath.value.set((share * air) / swept.chest, ((1 - share) * air) / swept.belly, 1, 1.09);
    const vol = (pts: ArrayLike<number>) => { let v = 0; for (let t = 0; t < P.index.length; t += 3) { const [i, j, k] = [P.index[t], P.index[t + 1], P.index[t + 2]]; if (P.arm[i]) continue;
      v += (pts[i * 3] * (pts[j * 3 + 1] * pts[k * 3 + 2] - pts[j * 3 + 2] * pts[k * 3 + 1]) - pts[i * 3 + 1] * (pts[j * 3] * pts[k * 3 + 2] - pts[j * 3 + 2] * pts[k * 3]) + pts[i * 3 + 2] * (pts[j * 3] * pts[k * 3 + 1] - pts[j * 3 + 1] * pts[k * 3])) / 6; } return v; };
    const moved = Float32Array.from(P.rest), o = new THREE.Vector3();
    for (let i = 0; i < moved.length / 3; i++) { breathAt(u, P.rest[i * 3], P.rest[i * 3 + 1], P.rest[i * 3 + 2], o); moved[i * 3] += o.x; moved[i * 3 + 1] += o.y; moved[i * 3 + 2] += o.z; }
    // (the open tube's volume change: its walls' sweep; its ends do not move)
    const grew = Math.abs(vol(moved) - vol(P.rest));
    expect(grew / air).toBeGreaterThan(0.97); expect(grew / air).toBeLessThan(1.03);
  });
});
