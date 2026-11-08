/**
 * HER BIRTH OPENING (src/actor/birthCanal.ts, src/actor/birthDoors.ts; the skeleton-outward plan's Phase 1, step 4). The
 * cervix thins before it opens and opens to 10 cm; a term baby's head has room plane by plane through her measured
 * pelvis, least at her ischial spines and tuberosities; her canal opens round to a head's width without moving its
 * opening; and the opening's two doors (Joshua's drawing) meet closed, stand as wide as the tube open, and close as a
 * pneumatic door does -- quickly at first, slowing as they come to, never past shut.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIRTH_OPENING, CANAL_OPENING, canalMouth, cervixAt, headPassage, openCanal, tightest } from '../src/actor/birthCanal';
import { DOORS, doorFrame, doorMeshes, doorOpening, swingDoors, swingFor } from '../src/actor/birthDoors';
import { CERVIX, layOrgans, lengthOf } from '../src/actor/pelvicOrgans';
import { growWomb } from '../src/actor/pregnantWomb';

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
const pelvis = read<Parameters<typeof layOrgans>[0] & Parameters<typeof headPassage>[0] & Parameters<typeof openCanal>[1]>('../src/data/pelvis/skeleton.json');
const torso = read<Parameters<typeof growWomb>[1] & { landmarks: { coccyx: number[] } }>('../src/data/torso/skeleton.json');
const laid = layOrgans(pelvis);

describe('her cervix', () => {
  it('thins first, then opens to 10 cm', () => {
    const closed = cervixAt(0, CERVIX.length, 0.0115), early = cervixAt(0.2, CERVIX.length, 0.0115), thin = cervixAt(BIRTH_OPENING.effacedBy, CERVIX.length, 0.0115), full = cervixAt(1, CERVIX.length, 0.0115);
    expect(closed.lengthM).toBeCloseTo(CERVIX.length, 9);
    expect(closed.openM).toBe(0);
    // (by 2 cm open it is half thinned)
    expect(early.effaced).toBeGreaterThanOrEqual(0.5);
    expect(thin.lengthM).toBeCloseTo(BIRTH_OPENING.rimM, 9);
    expect(full.openM).toBeCloseTo(0.1, 9);
    expect(full.outerM).toBeCloseTo(0.05 + BIRTH_OPENING.rimM, 9);
  });

  it('in her grown womb: drawn up into it from below, its os rising, the womb\'s foot as wide as it opens', () => {
    const closed = growWomb(laid, torso, 40, [3460], 0), open = growWomb(laid, torso, 40, [3460], 1);
    expect(open.path[0][1]).toBeGreaterThan(closed.path[0][1] + 0.02);
    expect(open.halves[0][0]).toBeCloseTo(open.cervix.outerM, 9);
    expect(open.contents.volumeMl).toBe(closed.contents.volumeMl);
  });
});

describe('her baby\'s head through her pelvis', () => {
  it('a term head (51 cm baby) has room at every plane, least at her ischial spines and tuberosities', () => {
    const p = headPassage(pelvis, torso.landmarks.coccyx, 0.51);
    expect(p.map((q) => q.plane)).toEqual(['inlet', 'midpelvis', 'outlet']);
    expect(tightest(p)).toBeGreaterThan(0.005);
    const least = p.flatMap((q) => [q.across, q.along]).reduce((a, b) => (b.left < a.left ? b : a));
    expect(least.room).toBeCloseTo(0.102, 3);
    // (it engages sideways: its longest way across the inlet's widest)
    expect(p[0].across.head).toBeGreaterThan(p[0].along.head);
  });

  it('a bigger baby has less room, and a much bigger one none', () => {
    expect(tightest(headPassage(pelvis, torso.landmarks.coccyx, 0.53))).toBeLessThan(tightest(headPassage(pelvis, torso.landmarks.coccyx, 0.51)));
    expect(tightest(headPassage(pelvis, torso.landmarks.coccyx, 0.58))).toBeLessThan(0);
  });
});

describe('her canal opening', () => {
  it('opens round to a head\'s width, its opening and top where they were, its first centimetres going the way they went', () => {
    const closed = openCanal(laid.vagina, pelvis, 0), open = openCanal(laid.vagina, pelvis, 1);
    expect(closed.width).toBeCloseTo(laid.vagina.width, 9);
    expect(open.width).toBeCloseTo(CANAL_OPENING.diameterM, 9);
    expect(open.depth).toBeCloseTo(CANAL_OPENING.diameterM, 9);
    for (const c of [closed, open]) {
      c.path[0].forEach((v, i) => expect(v).toBeCloseTo(laid.vagina.path[0][i], 6));
      c.path[c.path.length - 1].forEach((v, i) => expect(v).toBeCloseTo(laid.vagina.path[laid.vagina.path.length - 1][i], 6));
    }
    const a = canalMouth(laid.vagina.path, DOORS.hingeUp).t, b = canalMouth(open.path, DOORS.hingeUp).t;
    expect(a[1] * b[1] + a[2] * b[2]).toBeGreaterThan(0.98);
    expect(lengthOf(open.path)).toBeGreaterThan(lengthOf(closed.path) * 0.95);
  });
});

describe('her opening\'s doors', () => {
  const frame = doorFrame(laid.vagina.path);

  it('closed, the lips meet; standing open, the opening is as wide as the open tube', () => {
    expect(doorOpening(0)).toBeLessThan(0.005);
    expect(doorOpening(1)).toBeGreaterThanOrEqual(CANAL_OPENING.diameterM);
    expect(doorMeshes(frame, 0).openM).toBeCloseTo(doorOpening(0), 9);
    const m = doorMeshes(frame, 1);
    expect(m.points.every(Number.isFinite)).toBe(true);
    expect(Math.max(...m.triangles)).toBeLessThan(m.points.length / 3);
  });

  it('BIRTH OPENING sets how far they swing: the opening as wide as the slider says', () => {
    for (const cm of [2, 4, 7, 10]) expect(doorOpening(swingFor(cm / 100))).toBeCloseTo(cm / 100, 4);
    expect(swingFor(0)).toBe(0);
  });

  it('let go, they close as a pneumatic door does: fast at first, slowing as they come to, never past shut', () => {
    let s = 1, last = 1, lastStep = Infinity;
    const steps: number[] = [];
    for (let k = 0; k < 120; k++) { s = swingDoors(s, 0, 1 / 60); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(last); steps.push(last - s); last = s; }
    for (let k = 1; k < 60; k++) { expect(steps[k]).toBeLessThanOrEqual(steps[k - 1] + 1e-12); lastStep = steps[k]; }
    expect(lastStep).toBeLessThan(steps[0] / 4);
    expect(s).toBeLessThan(0.01);
    // (pushed open they go where they are pushed, quickly)
    expect(swingDoors(0, 1, 0.2)).toBeGreaterThan(0.9);
    // (slow frames do not throw them)
    expect(swingDoors(0.5, 0, Number.NaN)).toBe(0.5);
  });
});
