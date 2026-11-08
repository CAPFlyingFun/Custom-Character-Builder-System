/**
 * HER BODY KEPT LEVEL (src/actor/levelBody.ts; Trello #273 step 3c): her balance over the same part of her soles on any
 * slope, her pregnancy's pull taken back by leaning her trunk back and her hips a little forward.
 */
import { describe, expect, it } from 'vitest';
import { BODY_KG, centreOfMass, wombKg, wombPlace, type BodyPoints, type ExtraMass, type P3 } from '../src/actor/bodyMass';
import { LEVEL, LEVEL_NONE, easeLevel, leanBody, levelBody, type LevelInput } from '../src/actor/levelBody';
import { rangeDeg } from '../src/data/jointRange';

const DEG = Math.PI / 180;
/** A woman 1.65 m tall standing straight, facing +z, her left at +x (as tests/bodyMass.test.ts). */
function standing(): BodyPoints {
  const both = (x: number, y: number, z = 0) => [[x, y, z], [-x, y, z]] as unknown as readonly [P3, P3];
  return {
    headTop: [0, 1.65, 0], neck: [0, 1.45, 0], hipL: [0.09, 0.88, 0], hipR: [-0.09, 0.88, 0],
    shoulder: both(0.18, 1.38), elbow: both(0.2, 1.1), wrist: both(0.2, 0.85), handEnd: both(0.2, 0.75),
    knee: both(0.09, 0.47), ankle: both(0.08, 0.08), heel: both(0.08, 0, -0.06), toe: both(0.09, 0, 0.17),
  };
}
const pivot: P3 = [0, 1.0, -0.02];
const term = (): ExtraMass => ({ kg: wombKg(40), at: [0, 0.88 + wombPlace(40).up, wombPlace(40).forward] });
const input = (over: Partial<LevelInput> = {}): LevelInput => ({ body: standing(), womb: null, pivot, forward: [0, 1], slopeDeg: 0, ankleHeight: 0.08, ...over });
/** Her balance (x, z) with the posture laid on her. */
function balance(i: LevelInput, level = levelBody(i)): [number, number] {
  const laid = leanBody(i.body, i.pivot, level, i.womb);
  const c = centreOfMass(laid.body, BODY_KG, laid.womb && laid.womb.kg > 0 ? [laid.womb] : []);
  return [c[0], c[2]];
}
const bareZ = centreOfMass(standing())[2];

describe('level ground, not pregnant: she stands as she is', () => {
  it('leans nothing, moves nothing', () => {
    const l = levelBody(input());
    expect(Math.hypot(...l.lean)).toBeLessThan(1e-9);
    expect(Math.hypot(...l.hips)).toBeLessThan(1e-9);
    expect(l.sit).toBe(0);
  });
});

describe('pregnant: her trunk leans back, her hips a little forward, her balance where it was without the weight', () => {
  const i = input({ womb: term() }), l = levelBody(i);
  it('puts her balance back over the same point', () => {
    const [x, z] = balance(i, l);
    expect(Math.abs(x)).toBeLessThan(1e-6);
    expect(Math.abs(z - bareZ)).toBeLessThan(1e-4);
  });
  it('leans her trunk back a few degrees', () => {
    expect(l.lean[1]).toBeLessThan(0);
    expect(-l.lean[1] / DEG).toBeGreaterThan(1);
    expect(-l.lean[1] / DEG).toBeLessThan(10);
  });
  it('moves her hips forward by half the weight\'s pull', () => {
    const pull = balance(i, LEVEL_NONE)[1] - bareZ;
    expect(pull).toBeGreaterThan(0.005);
    expect(l.hips[1]).toBeCloseTo(LEVEL.hipsPregnant * pull, 9);
  });
});

describe('on a slope: her balance carried round with her feet', () => {
  it('uphill she leans into it, hips forward and trunk forward, and her balance moves ahead by the slope\'s carry', () => {
    const i = input({ slopeDeg: 20 }), l = levelBody(i), [, z] = balance(i, l);
    expect(l.lean[1]).toBeGreaterThan(0);
    expect(l.hips[1]).toBeGreaterThan(0);
    expect(l.sit).toBe(0);
    const ahead = bareZ - 0.0;
    expect(z - bareZ).toBeCloseTo(ahead * (Math.cos(20 * DEG) - 1) + 0.08 * Math.sin(20 * DEG), 4);
  });
  it('downhill she sits back: hips back and down, trunk back', () => {
    const l = levelBody(input({ slopeDeg: -20 }));
    expect(l.lean[1]).toBeLessThan(0);
    expect(l.hips[1]).toBeLessThan(0);
    expect(l.sit).toBeCloseTo(LEVEL.sitPerDeg * 20, 9);
  });
  it('more slope, more lean; and the slope ahead of her is what counts, whichever way she faces', () => {
    const a = levelBody(input({ slopeDeg: 10 })), b = levelBody(input({ slopeDeg: 30 }));
    expect(b.lean[1]).toBeGreaterThan(a.lean[1]);
    // facing +x, her body turned with her: the same lean, along x
    const turn = (p: P3): P3 => [p[2], p[1], -p[0]];
    const s = standing(), turned: BodyPoints = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Array.isArray(v[0]) ? (v as readonly P3[]).map(turn) : turn(v as P3)])) as unknown as BodyPoints;
    const t = levelBody(input({ body: turned, pivot: turn(pivot), forward: [1, 0], slopeDeg: 30 }));
    expect(t.lean[0]).toBeCloseTo(b.lean[1], 9);
    expect(Math.abs(t.lean[1])).toBeLessThan(1e-9);
  });
});

describe('her LEAN slider and her back\'s range', () => {
  it('0 is none, 2 is about twice', () => {
    expect(levelBody(input({ slopeDeg: 20, womb: term(), amount: 0 }))).toEqual(LEVEL_NONE);
    const one = levelBody(input({ slopeDeg: 20 })), two = levelBody(input({ slopeDeg: 20, amount: 2 }));
    expect(two.lean[1] / one.lean[1]).toBeGreaterThan(1.8);
    expect(two.lean[1] / one.lean[1]).toBeLessThan(2.2);
  });
  it('never leans her past her back\'s range (data/jointRange.ts)', () => {
    const l = levelBody(input({ slopeDeg: -80, amount: 10 }));
    expect(Math.hypot(...l.lean)).toBeLessThanOrEqual(rangeDeg('back', 'extension', 'female') * DEG + 1e-9);
  });
  it('eases toward a new posture over LEVEL.ease, never past it', () => {
    const want = levelBody(input({ slopeDeg: 20 }));
    const half = easeLevel(LEVEL_NONE, want, LEVEL.ease * Math.LN2);
    expect(half.lean[1]).toBeCloseTo(want.lean[1] / 2, 9);
    expect(easeLevel(LEVEL_NONE, want, 0)).toEqual({ lean: [0, 0], hips: [0, 0], sit: 0 });
    expect(easeLevel(LEVEL_NONE, want, 100).lean[1]).toBeCloseTo(want.lean[1], 9);
  });
});
