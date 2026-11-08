/**
 * HER BALANCE, MEASURED (src/actor/bodyMass.ts; Trello #273 step 3b): her centre of mass from her bones and her
 * pregnancy, the outline her feet stand on, and how far inside it she is.
 */
import { describe, expect, it } from 'vitest';
import { BODY_KG, GRAVITY, SEGMENTS_FEMALE, balanceAt, balanceMargin, centreOfMass, extrapolatedCom, supportOutline, wombKg, wombPlace, type BodyPoints, type P3 } from '../src/actor/bodyMass';

/** A woman 1.65 m tall standing straight, facing +z, her left at +x: rough adult proportions. */
function standing(): BodyPoints {
  const side = (s: number, x: number, y: number, z = 0): P3 => [s * x, y, z];
  const both = (x: number, y: number, z = 0) => [side(1, x, y, z), side(-1, x, y, z)] as const;
  return {
    headTop: [0, 1.65, 0], neck: [0, 1.45, 0], hipL: [0.09, 0.88, 0], hipR: [-0.09, 0.88, 0],
    shoulder: both(0.18, 1.38), elbow: both(0.2, 1.1), wrist: both(0.2, 0.85), handEnd: both(0.2, 0.75),
    knee: both(0.09, 0.47), ankle: both(0.08, 0.08), heel: both(0.08, 0, -0.06), toe: both(0.09, 0, 0.17),
  };
}

describe('her weight by body part (de Leva 1996, women)', () => {
  it('shares add up to her whole body', () => {
    const S = SEGMENTS_FEMALE;
    const sum = S.head.mass + S.trunk.mass + 2 * (S.upperArm.mass + S.forearm.mass + S.hand.mass + S.thigh.mass + S.shank.mass + S.foot.mass);
    expect(sum).toBeCloseTo(1, 3);
    expect(BODY_KG).toBe(60);
  });

  it('puts a woman standing straight balanced in the middle, a little over half her height up', () => {
    const c = centreOfMass(standing());
    expect(Math.abs(c[0])).toBeLessThan(1e-9);
    // an adult's centre of mass stands at about 55% of her height
    expect(c[1] / 1.65).toBeGreaterThan(0.52);
    expect(c[1] / 1.65).toBeLessThan(0.6);
  });

  it('moves her balance forward with her pregnancy, by its weight over the whole', () => {
    const b = standing(), alone = centreOfMass(b), kg = wombKg(40), at: P3 = [0, 0.88 + wombPlace(40).up, wombPlace(40).forward];
    const carrying = centreOfMass(b, BODY_KG, [{ kg, at }]);
    // (de Leva's shares add to 0.9999: to the hundredth of a millimetre)
    expect(carrying[2] - alone[2]).toBeCloseTo((kg * (at[2] - alone[2])) / (BODY_KG + kg), 5);
    expect(carrying[2] - alone[2]).toBeGreaterThan(0.01);
  });
});

describe('her pregnancy\'s weight (Hytten, by week)', () => {
  it('is nothing before it starts, 1.1 kg at 20 weeks and 5.8 at 40, and grows steadily between', () => {
    expect(wombKg(0)).toBe(0);
    expect(wombKg(20)).toBeCloseTo(1.14, 9);
    expect(wombKg(40)).toBeCloseTo(5.82, 9);
    expect(wombKg(45)).toBeCloseTo(5.82, 9);
    expect(wombKg(35)).toBeCloseTo((3.28 + 5.82) / 2, 9);
    for (let w = 0; w < 40; w++) expect(wombKg(w + 1)).toBeGreaterThan(wombKg(w));
  });
  it('sits higher and further forward as it grows', () => {
    expect(wombPlace(40).up).toBeGreaterThan(wombPlace(20).up);
    expect(wombPlace(40).forward).toBeGreaterThan(wombPlace(20).forward);
    expect(wombPlace(40).forward).toBeCloseTo(0.13, 9);
  });
});

describe('what holds her up: the outline her feet touch, and her margin inside it', () => {
  const square = supportOutline([[0, 0], [0.3, 0], [0.3, 0.2], [0, 0.2], [0.1, 0.1], [0.15, 0.05]]);
  it('is the outline round the points, its corners only, anticlockwise', () => {
    expect(square).toHaveLength(4);
    let area = 0;
    for (let i = 0; i < square.length; i++) { const a = square[i], b = square[(i + 1) % square.length]; area += a[0] * b[1] - b[0] * a[1]; }
    expect(area / 2).toBeCloseTo(0.06, 12);
  });
  it('measures how far inside she is, and how far outside, signed', () => {
    expect(balanceMargin(square, [0.15, 0.1])).toBeCloseTo(0.1, 12);
    expect(balanceMargin(square, [0.28, 0.1])).toBeCloseTo(0.02, 12);
    expect(balanceMargin(square, [0.35, 0.1])).toBeCloseTo(-0.05, 12);
    expect(balanceMargin(square, [0.15, -0.04])).toBeCloseTo(-0.04, 12);
  });
  it('a single line of contact has no inside', () => {
    expect(balanceMargin(supportOutline([[0, 0], [0.2, 0]]), [0.1, 0])).toBeLessThanOrEqual(0);
  });
  it('names the edge nearest her, inside or out; none with nothing under her', () => {
    const inside = balanceAt(square, [0.28, 0.1]), out = balanceAt(square, [0.15, -0.04]);
    expect(inside.nearest![0]).toBeCloseTo(0.3, 12); expect(inside.nearest![1]).toBeCloseTo(0.1, 12);
    expect(out.nearest![0]).toBeCloseTo(0.15, 12); expect(out.nearest![1]).toBeCloseTo(0, 12);
    expect(balanceAt([], [0, 0])).toEqual({ margin: -Infinity, nearest: null });
  });
});

describe('where her balance is heading (Hof 2005)', () => {
  it('standing still is where her centre of mass is', () => {
    expect(extrapolatedCom([0.1, -0.2], [0, 0], 0.93)).toEqual([0.1, -0.2]);
  });
  it('moving, it runs ahead of her by her speed over sqrt(g / l)', () => {
    const [x, z] = extrapolatedCom([0, 0], [0, 1.2], 0.93);
    expect(x).toBe(0);
    expect(z).toBeCloseTo(1.2 / Math.sqrt(GRAVITY / 0.93), 12);
    // (about 37 cm at a walk: why a walker's next foot lands that far ahead)
    expect(z).toBeGreaterThan(0.35); expect(z).toBeLessThan(0.39);
  });
});
