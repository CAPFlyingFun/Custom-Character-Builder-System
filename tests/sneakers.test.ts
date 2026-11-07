/**
 * HER SNEAKERS (sneakers.ts; Joshua, 2026-11-07): built round her own foot. A made-up foot stands in for hers: a sole
 * 24 cm long and 9 cm across at the ball, its heel a centimetre up, a dome over it, and her leg rising from over the
 * back of it; its points carried by her ankle (onFoot 1), her leg's by her shin (0).
 */
import { describe, expect, it } from 'vitest';
import { SNEAKER, buildSneaker, measureFoot } from '../src/sarahlab/sneakers';

function foot(side: 1 | -1): { rest: Float32Array; onFoot: Float32Array } {
  const pts: number[] = [], on: number[] = [];
  const L = 0.24, cx = side * 0.1;
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, z = -0.18 + u * L;
    // half its width along it (narrow heel, wide ball, a rounded toe), its top's height, its heel up a little
    const w = 0.045 * (u < 0.7 ? 0.62 + 0.38 * Math.sin((u / 0.7) * Math.PI / 2) : Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 2)));
    const top = 0.03 + 0.05 * Math.max(0, 1 - u * 1.4), bottom = 0.01 * Math.max(0, 1 - u / 0.4);
    for (let j = 0; j <= 16; j++) {
      const a = Math.PI * (j / 16), x = Math.cos(a) * w, y = bottom + (top - bottom) * Math.sin(a);
      pts.push(cx + x, y, z); on.push(1);
      pts.push(cx + x, bottom, z); on.push(1);
    }
  }
  // her leg: a column 3.5 cm round over the back of her foot, from 6 cm up to 30
  for (let k = 0; k <= 24; k++) for (let j = 0; j < 16; j++) {
    const a = (2 * Math.PI * j) / 16;
    pts.push(cx + 0.035 * Math.cos(a), 0.06 + k * 0.01, -0.14 + 0.035 * Math.sin(a)); on.push(k < 3 ? 0.6 : 0);
  }
  return { rest: Float32Array.from(pts), onFoot: Float32Array.from(on) };
}

describe('sneakers: built round her foot', () => {
  const left = foot(1), right = foot(-1);
  const mL = measureFoot(left.rest, left.onFoot), sL = buildSneaker(mL);

  it('measures her foot: toward her toes, outward away from her other foot, heel to toe', () => {
    expect(mL.along[2]).toBeGreaterThan(0.99);
    expect(mL.out[0]).toBeGreaterThan(0.99);
    expect(measureFoot(right.rest, right.onFoot).out[0]).toBeLessThan(-0.99);
    expect(mL.length).toBeCloseTo(0.24, 2);
  });

  it('is whole: every part built, nothing NaN, one label of two triangles', () => {
    expect(sL.position.every(Number.isFinite)).toBe(true);
    expect(new Set(sL.groups.map((g) => g.material))).toEqual(new Set(['upper', 'midsole', 'outsole', 'tongue', 'label', 'laces', 'collar']));
    expect(sL.groups.find((g) => g.material === 'label')!.count).toBe(6);
    expect(Math.max(...sL.index)).toBeLessThan(sL.position.length / 3);
  });

  it('stands on its sole under her foot, lifting her by it, and holds her foot with room all round', () => {
    const xs: number[] = [], ys: number[] = [], zs: number[] = [];
    for (let i = 0; i < sL.position.length; i += 3) { xs.push(sL.position[i]); ys.push(sL.position[i + 1]); zs.push(sL.position[i + 2]); }
    expect(Math.min(...ys)).toBeCloseTo(-SNEAKER.stack, 3);
    expect(sL.lift).toBe(SNEAKER.stack);
    // her foot (below its collar) inside its outline, with room before her toes and behind her heel
    expect(Math.max(...zs)).toBeGreaterThan(-0.18 + 0.24 + SNEAKER.toeRoom - 0.002);
    expect(Math.min(...zs)).toBeLessThan(-0.18 - SNEAKER.sideRoom + 0.001);
    expect(Math.max(...xs)).toBeGreaterThan(0.1 + 0.045 + SNEAKER.sideRoom - 0.001);
    expect(Math.min(...xs)).toBeLessThan(0.1 - 0.045 - SNEAKER.sideRoom + 0.001);
    // and no higher at its heel than its collar (the tab a little over it)
    expect(Math.max(...ys)).toBeLessThan(SNEAKER.collarBack + 0.03);
  });

  it('the right shoe is the left one mirrored, but for its label, which reads TMB the right way round on both', () => {
    const sR = buildSneaker(measureFoot(right.rest, right.onFoot));
    expect(sR.position.length).toBe(sL.position.length);
    const pointsOf = (part: string) => { const g = sL.groups.find((x) => x.material === part)!; return new Set(Array.from(sL.index.slice(g.start, g.start + g.count))); };
    const labelPoints = pointsOf('label');
    // (the tubes -- laces, collar padding, heel tab -- are mirrored as tubes: the points round each are laid from the same
    // start, so one shoe's are turned a little round from the other's)
    const tubes = new Set([...pointsOf('laces'), ...pointsOf('collar')]);
    let worst = 0;
    for (let i = 0; i < sL.position.length; i += 3) {
      if (labelPoints.has(i / 3) || tubes.has(i / 3)) continue;
      worst = Math.max(worst, Math.abs(sR.position[i] + sL.position[i]), Math.abs(sR.position[i + 1] - sL.position[i + 1]), Math.abs(sR.position[i + 2] - sL.position[i + 2]));
    }
    expect(worst).toBeLessThan(1e-6);
    let tubeWorst = 0;
    for (const v of tubes) tubeWorst = Math.max(tubeWorst, Math.abs(sR.position[3 * v] + sL.position[3 * v]), Math.abs(sR.position[3 * v + 2] - sL.position[3 * v + 2]));
    expect(tubeWorst).toBeLessThanOrEqual(2 * SNEAKER.padRadius + 1e-6);
    // (its picture's left edge, u 0, on her right -- the left as she is looked at -- on both shoes)
    for (const s of [sL, sR]) {
      const pts = [...labelPoints].map((v) => ({ x: s.position[3 * v], u: s.uv[2 * v] })), mid = pts.reduce((m, p) => m + p.x, 0) / pts.length;
      expect(pts.filter((p) => p.u === 0).every((p) => p.x < mid)).toBe(true);
    }
  });
});
