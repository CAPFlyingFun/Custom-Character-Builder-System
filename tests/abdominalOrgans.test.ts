/**
 * HER BELLY'S ORGANS (Joshua, 2026-11-08: the stomach, the intestines as one soft mass, the bowel and rectum, the kidneys)
 * and WHAT THEY HOLD OVER TIME (actor/gut.ts: the numbers the NPC brain reads later).
 */
import { describe, expect, it } from 'vitest';
import torso from '../src/data/torso/skeleton.json';
import pelvis from '../src/data/pelvis/skeleton.json';
import { KIDNEY, RECTUM, STOMACH, inWomb, layAbdomen, layStomach, outOfWomb, sweepAny, tubeVolume } from '../src/actor/abdominalOrgans';
import { BLADDER, layOrgans, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { growWomb, type TorsoLandmarks } from '../src/actor/pregnantWomb';
import { eat, gutNeeds, hoursToBladderUrge, pee, restingGut, stepGut, urineMlH } from '../src/actor/gut';

const T = torso as unknown as TorsoLandmarks & { discs: number[] }, P = pelvis as unknown as PelvisLandmarks;
const laid = layOrgans(P), opening = laid.vagina.path[0], bladder = { centre: laid.bladder.centre, radii: laid.bladder.radii };
const x0 = P.landmarks.symphysisTop[0];

describe('her belly organs, laid out', () => {
  const L = layAbdomen(T, P, opening, bladder, undefined, null, laid.vagina.path);
  it('the stomach under her left ribs holds what it is given', () => {
    for (const ml of [STOMACH.emptyMl, 250, STOMACH.fullMl, STOMACH.mostMl]) expect(tubeVolume(layStomach(T, ml, x0)) * 1e6).toBeCloseTo(ml, -1);
    const fundus = L.stomach.path[0], pylorus = L.stomach.path[L.stomach.path.length - 1];
    expect(fundus[0]).toBeGreaterThan(x0 + 0.04); // her left
    expect(pylorus[0]).toBeLessThan(x0); // just right of her middle
    expect(fundus[1]).toBeGreaterThan(T.landmarks.xiphoid[1]); // up under her diaphragm
  });
  it('the kidneys sit either side of her spine at her back, the right lower', () => {
    const [left, right] = L.kidneys;
    expect(left.centre[0] - x0).toBeCloseTo(0.064, 3);
    expect(right.centre[0] - x0).toBeCloseTo(-0.064, 3);
    expect(left.centre[1] - right.centre[1]).toBeCloseTo(KIDNEY.rightLower, 4);
    expect(left.radii[1] * 2).toBeCloseTo(KIDNEY.length, 4);
    expect(left.centre[2]).toBeLessThan(-0.06); // behind her spine's front
  });
  it('the rectum runs down behind her birth canal to her anus behind her opening', () => {
    const anus = L.rectum.path[L.rectum.path.length - 1];
    expect(opening[2] - anus[2]).toBeCloseTo(0.033, 3);
    // never in front of the canal: at each height the rectum is behind it
    for (const p of L.rectum.path) {
      if (p[1] > laid.vagina.path[laid.vagina.path.length - 1][1] || p[1] < opening[1]) continue;
      const v = laid.vagina.path.reduce((best, q) => (Math.abs(q[1] - p[1]) < Math.abs(best[1] - p[1]) ? q : best));
      expect(p[2]).toBeLessThan(v[2] - 0.01);
    }
    for (const h of L.rectum.halves) { expect(Number.isFinite(h[0])).toBe(true); expect(h[0]).toBeGreaterThan(0); }
    // the ampulla widens as it fills
    const widest = (ml: number) => Math.max(...layAbdomen(T, P, opening, bladder, { stomachMl: 250, intestineMl: 1000, colonFill: 0.4, rectumMl: ml }).rectum.halves.map((h) => h[0]));
    expect(widest(RECTUM.urgeMl)).toBeGreaterThan(widest(10));
  });
  it('a growing womb moves them out of it', () => {
    for (const [week, g] of [[28, 1000], [40, 3400]] as const) {
      const womb = growWomb(laid, T, week, [g]), A = layAbdomen(T, P, opening, bladder, undefined, womb);
      expect(A.intestines.centre[1]).toBeGreaterThan(L.intestines.centre[1]);
      // (each moved round it as a whole tube: almost none of it left inside; the room's drawn points are then pushed
      // clear one by one -- outOfWomb -- so none is)
      for (const t of [A.stomach, A.colon]) { const pts = sweepAny(t.path, t.halves, 12, 3).points; expect(inWomb(pts, womb)).toBeLessThan(0.02 * pts.length / 3); outOfWomb(pts, womb); expect(inWomb(pts, womb)).toBe(0); }
    }
  });
});

describe('what her gut holds over time', () => {
  it('a meal leaves her stomach over hours, a drink in minutes; hunger comes back', () => {
    const fed = eat(restingGut(), 600, 300);
    expect(gutNeeds(fed).hunger).toBe(0);
    const later = stepGut(fed, 0.5);
    expect(later.stomachWaterMl).toBeLessThan(0.3 * 400);
    expect(later.stomachFoodMl).toBeGreaterThan(0.6 * 750);
    expect(gutNeeds(stepGut(fed, 6)).hunger).toBeGreaterThan(0.5);
  });
  it('her kidneys make about 1 mL per kg an hour, more with water to spare, filling her bladder to the urge in hours', () => {
    expect(urineMlH(0, 60)).toBeCloseTo(60, 5);
    expect(urineMlH(500, 60)).toBeGreaterThan(60);
    expect(urineMlH(-600, 60)).toBeCloseTo(24, 5);
    const h = hoursToBladderUrge(restingGut());
    expect(h).toBeGreaterThan(3); expect(h).toBeLessThan(5);
    const s = stepGut(eat(restingGut(), 0, 500), 4);
    expect(s.bladderMl).toBeGreaterThan(BLADDER.urgeMl[0]);
    expect(gutNeeds(s).bladder).toBeGreaterThan(0.3);
    expect(pee(s).bladderMl).toBeLessThan(10);
  });
  it('short of water she grows thirsty', () => {
    expect(gutNeeds(stepGut(restingGut(), 12)).thirst).toBeGreaterThan(0.5);
  });
  it('her bowel fills over days to the urge', () => {
    let s = restingGut();
    for (let d = 0; d < 3; d++) { s = eat(s, 700, 250); s = stepGut(s, 8); s = eat(s, 700, 250); s = stepGut(s, 16); }
    expect(s.rectumMl).toBeGreaterThan(RECTUM.feelMl);
    expect(gutNeeds(s).bowel).toBeGreaterThan(0);
  });
});
