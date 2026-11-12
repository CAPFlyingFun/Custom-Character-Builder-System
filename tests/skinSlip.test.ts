/**
 * Her skin's slip (src/sarahlab/skinSlip.ts, 2026-11-12): the part of her points' movement that is not smooth, along her
 * skin. On a sheet of skin laid unevenly, as hers is: a movement the whole sheet makes together has next to no slip; a
 * point's own slide along the sheet comes back as its slip; what a point moves off the sheet is not slip; the copies of
 * a point along a seam slip as one; and slips add. And the driver that keeps her slip as her shapes and morphs change,
 * with what is laid on her shapes beside them: her belly's push counted, what of her shape is her pose's taken off.
 */
import { describe, expect, it } from 'vitest';
import { SLIP_MORPH_FLOOR, SLIP_STEP, besideShapes, makeSkinSlip, slipDriver, type SlipSource } from '../src/sarahlab/skinSlip';

/** A repeatable 0..1 (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * A sheet of skin: N by N points about 5 mm apart (metres), each nudged up to 1.5 mm along the sheet so its triangles
 * are uneven, lying in z = 0. `seam` doubles the points of one column (two vertices at one place, as along a texture seam).
 */
function sheet(N = 41, seam = false) {
  const rnd = random(7), rest: number[] = [], index: number[] = [], id: number[][] = [];
  for (let j = 0; j < N; j++) { id.push([]); for (let i = 0; i < N; i++) { id[j].push(rest.length / 3); rest.push(i * 0.005 + (rnd() - 0.5) * 0.003, j * 0.005 + (rnd() - 0.5) * 0.003, 0); } }
  // the seam: column 20's points again, used by the triangles to its right
  const right = id.map((row) => row.slice());
  if (seam) for (let j = 0; j < N; j++) { const v = id[j][20]; right[j][20] = rest.length / 3; rest.push(rest[v * 3], rest[v * 3 + 1], rest[v * 3 + 2]); }
  for (let j = 0; j + 1 < N; j++) for (let i = 0; i + 1 < N; i++) {
    const g = i >= 20 ? right : id, a = g[j][i], b = g[j][i + 1], c = g[j + 1][i], d = g[j + 1][i + 1];
    index.push(a, b, c, b, d, c);
  }
  return { rest: Float32Array.from(rest), index, id, right, N };
}
const everywhere = () => true;
/** Whether grid point (i, j) is well inside the sheet (its edge has fewer neighbours to average with). */
const inner = (i: number, j: number, N: number) => i >= 10 && j >= 10 && i < N - 10 && j < N - 10;

describe('her skin\'s slip (2026-11-12)', () => {
  it('finds next to none in a movement her skin makes together', () => {
    const { rest, index, N } = sheet(), s = makeSkinSlip(rest, index, everywhere);
    expect(s.points).toBe(N * N);
    // the whole sheet carried 2 cm, stretched a tenth, and bulged 1 cm off itself in one long wave
    const move = new Float32Array(s.vertices.length * 3);
    s.vertices.forEach((v, k) => { const x = rest[v * 3], y = rest[v * 3 + 1]; move[k * 3] = 0.02 + 0.1 * x; move[k * 3 + 1] = -0.01 + 0.1 * y; move[k * 3 + 2] = 0.01 * Math.sin(x * 15) * Math.sin(y * 15); });
    const slip = s.slip(move);
    let most = 0;
    s.vertices.forEach((v, k) => { if (inner(v % N, Math.floor(v / N), N)) most = Math.max(most, Math.hypot(slip[k * 3], slip[k * 3 + 1], slip[k * 3 + 2])); });
    // (a tenth of a millimetre: the stretch moves each point 2 to 20 mm)
    expect(most).toBeLessThan(0.0001);
  });

  it('gives back a point\'s own slide along her skin, and nothing of what it moves off her skin', () => {
    const { rest, index, N } = sheet(), s = makeSkinSlip(rest, index, everywhere), rnd = random(11);
    const slide = new Float32Array(s.vertices.length * 3), move = new Float32Array(s.vertices.length * 3);
    s.vertices.forEach((v, k) => {
      // each point slid up to 3 mm its own way along the sheet, on top of the sheet's shared movement; and lifted off it
      slide[k * 3] = (rnd() - 0.5) * 0.006; slide[k * 3 + 1] = (rnd() - 0.5) * 0.006;
      move[k * 3] = 0.02 + 0.1 * rest[v * 3] + slide[k * 3]; move[k * 3 + 1] = 0.1 * rest[v * 3 + 1] + slide[k * 3 + 1]; move[k * 3 + 2] = (rnd() - 0.5) * 0.01;
    });
    const slip = s.slip(move);
    let err = 0, size = 0, off = 0, n = 0;
    s.vertices.forEach((v, k) => {
      if (!inner(v % N, Math.floor(v / N), N)) return;
      err += (slip[k * 3] - slide[k * 3]) ** 2 + (slip[k * 3 + 1] - slide[k * 3 + 1]) ** 2; size += slide[k * 3] ** 2 + slide[k * 3 + 1] ** 2; off = Math.max(off, Math.abs(slip[k * 3 + 2])); n++;
    });
    expect(n).toBeGreaterThan(400);
    // the slides come back to within a fifth of their own size (what is left is the little they share with neighbours)
    expect(Math.sqrt(err / size)).toBeLessThan(0.2);
    expect(off).toBeLessThan(1e-9);
  });

  it('slips the copies of a point along a seam as one, joins her skin across it, and adds', () => {
    const { rest, index, id, right, N } = sheet(41, true), s = makeSkinSlip(rest, index, everywhere), rnd = random(3);
    expect(s.points).toBe(N * N);
    expect(s.vertices.length).toBe(N * N + N);
    const at = new Map<number, number>(); s.vertices.forEach((v, k) => at.set(v, k));
    const a = new Float32Array(s.vertices.length * 3), b = new Float32Array(s.vertices.length * 3), both = new Float32Array(s.vertices.length * 3);
    for (let i = 0; i < a.length; i++) { a[i] = i % 3 === 2 ? 0 : (rnd() - 0.5) * 0.004; b[i] = i % 3 === 2 ? 0 : (rnd() - 0.5) * 0.004; both[i] = a[i] + 2 * b[i]; }
    const sa = s.slip(a).slice(), sb = s.slip(b).slice(), sum = s.slip(both);
    for (let j = 0; j < N; j++) {
      const k0 = at.get(id[j][20])!, k1 = at.get(right[j][20])!;
      for (let c = 0; c < 3; c++) expect(sa[k0 * 3 + c]).toBe(sa[k1 * 3 + c]);
    }
    let worst = 0;
    for (let i = 0; i < sum.length; i++) worst = Math.max(worst, Math.abs(sum[i] - (sa[i] + 2 * sb[i])));
    expect(worst).toBeLessThan(1e-7);
    // across the seam her skin is one sheet: a movement both sides share has no slip at it
    const shared = new Float32Array(s.vertices.length * 3);
    s.vertices.forEach((v, k) => { shared[k * 3] = 0.1 * rest[v * 3]; });
    const none = s.slip(shared);
    for (let j = 10; j < N - 10; j++) expect(Math.abs(none[at.get(id[j][20])! * 3])).toBeLessThan(0.0001);
  });

  it('keeps to its region', () => {
    const { rest, index, N } = sheet(), s = makeSkinSlip(rest, index, (x) => x < 0.1);
    expect(s.vertices.length).toBeLessThan(N * N);
    expect(s.vertices.length).toBeGreaterThan(N * 15);
    for (const v of s.vertices) expect(rest[v * 3]).toBeLessThan(0.1);
  });
});

describe('her slip kept as she changes (slipDriver)', () => {
  /** A sheet, one morph that slides its points their own way, one that carries them all together. */
  function world() {
    const { rest, index, N } = sheet(), solver = makeSkinSlip(rest, index, (x) => x < 0.15), rnd = random(5), n = rest.length / 3;
    const shaped = rest.slice(), slides = new Float32Array(n * 3), carry = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) { slides[v * 3] = (rnd() - 0.5) * 0.006; slides[v * 3 + 1] = (rnd() - 0.5) * 0.006; carry[v * 3] = 0.01; }
    const state = { shapedVersion: 0, weights: [0, 0], pushed: null as Float32Array | null };
    const source = (): SlipSource => ({ rest, shaped, pushed: state.pushed, shapedVersion: state.shapedVersion, weights: state.weights, morph: (k, v, out) => { const m = k === 0 ? slides : carry; out[0] = m[v * 3]; out[1] = m[v * 3 + 1]; out[2] = m[v * 3 + 2]; } });
    return { rest, shaped, slides, solver, state, driver: slipDriver(solver, source), target: new Float32Array(n * 3), N, n };
  }
  const longest = (a: Float32Array) => { let m = 0; for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i], a[i + 1], a[i + 2])); return m; };

  it('lays her slip once, and again only when it has moved enough to see', () => {
    const w = world();
    expect(w.driver.update(w.target)).toBe(true);
    expect(longest(w.target)).toBe(0);
    expect(w.driver.update(w.target)).toBe(false);
    // a morph that slides her points: its slip comes in by its weight
    w.state.weights = [1, 0];
    expect(w.driver.update(w.target)).toBe(true);
    const full = longest(w.target);
    expect(full).toBeGreaterThan(0.001);
    expect(w.driver.stats.morphs).toEqual([0]);
    w.state.weights = [0.5, 0];
    expect(w.driver.update(w.target)).toBe(true);
    expect(longest(w.target)).toBeCloseTo(full / 2, 6);
    // a change too small to see is not laid (the step, against the morph's longest slip)
    w.state.weights = [0.5 + (0.5 * SLIP_STEP) / full, 0];
    expect(w.driver.update(w.target)).toBe(false);
    // a morph that carries her skin together has no slip to speak of, and is left out
    w.state.weights = [0.5, 1];
    w.driver.update(w.target);
    expect(w.driver.stats.morphs).toEqual([0]);
    expect(SLIP_MORPH_FLOOR).toBeGreaterThan(0);
  });

  it('works her shapes\' slip out again when her rest shape changes, and writes only her region', () => {
    const w = world(), before = w.driver.stats.solved;
    w.driver.update(w.target);
    expect(w.driver.stats.solved).toBe(before + 1);
    // her shapes slide her points (the same slides, now in her rest shape)
    for (let i = 0; i < w.shaped.length; i++) w.shaped[i] = w.rest[i] + w.slides[i];
    expect(w.driver.update(w.target)).toBe(false);     // nothing said her shape changed
    w.state.shapedVersion = 1;
    expect(w.driver.update(w.target)).toBe(true);
    expect(w.driver.stats.solved).toBe(before + 2);
    expect(longest(w.target)).toBeGreaterThan(0.001);
    for (let v = 0; v < w.n; v++) if (w.rest[v * 3] >= 0.15) expect(Math.hypot(w.target[v * 3], w.target[v * 3 + 1], w.target[v * 3 + 2])).toBe(0);
  });

  it('counts what is laid on her shapes point by point before her bones (her belly\'s push for her baby)', () => {
    const w = world();
    w.driver.update(w.target);
    expect(longest(w.target)).toBe(0);
    // the same slides, laid as a push: the shader adds them to her points, so they are part of where her skin is
    w.state.pushed = w.slides; w.state.shapedVersion = 1;
    expect(w.driver.update(w.target)).toBe(true);
    const pushed = w.target.slice();
    expect(longest(pushed)).toBeGreaterThan(0.001);
    // ...exactly as if her shapes had moved them
    const v = world();
    for (let i = 0; i < v.shaped.length; i++) v.shaped[i] = v.rest[i] + v.slides[i];
    v.driver.update(v.target);
    let worst = 0;
    for (let i = 0; i < pushed.length; i++) worst = Math.max(worst, Math.abs(pushed[i] - v.target[i]));
    expect(worst).toBeLessThan(1e-7);
  });

  it('leaves what of her shape is her pose\'s out of her slip (a designed garment rides it), her belly\'s push in', () => {
    const w = world(), n = w.n;
    w.driver.update(w.target);
    // a pose's field that slides her points their own way, laid on her shapes at half weight: as her shapes, it is slip
    const index = Uint32Array.from({ length: n }, (_, v) => v), half = 0.5;
    for (let i = 0; i < w.shaped.length; i++) w.shaped[i] = w.rest[i] + half * w.slides[i];
    w.state.shapedVersion = 1;
    w.driver.update(w.target);
    expect(longest(w.target)).toBeGreaterThan(0.0005);
    // named as her pose's, it is taken off before her slip is worked out: none
    const beside = besideShapes(new Float32Array(n * 3), null, [{ index, pos: w.slides, weight: half }]);
    expect(beside).not.toBeNull();
    w.state.pushed = beside; w.state.shapedVersion = 2;
    w.driver.update(w.target);
    expect(longest(w.target)).toBeLessThan(1e-7);
    // and with her belly's push as well, her slip is the push's alone
    const push = Float32Array.from(w.slides, (x) => 0.25 * x), both = besideShapes(new Float32Array(n * 3), push, [{ index, pos: w.slides, weight: half }])!;
    w.state.pushed = both; w.state.shapedVersion = 3;
    w.driver.update(w.target);
    const withPush = w.target.slice(), v = world();
    v.state.pushed = push; v.state.shapedVersion = 1;
    v.driver.update(v.target);
    let worst = 0;
    for (let i = 0; i < withPush.length; i++) worst = Math.max(worst, Math.abs(withPush[i] - v.target[i]));
    expect(worst).toBeLessThan(1e-7);
    // nothing laid beside her shapes: nothing to give; a field at no weight is none
    expect(besideShapes(new Float32Array(n * 3), null, [])).toBeNull();
    expect(besideShapes(new Float32Array(n * 3), null, [{ index, pos: w.slides, weight: 0 }])).toBeNull();
  });
});
