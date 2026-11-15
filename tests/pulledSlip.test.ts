/**
 * HER SKIN'S SLIP, PULLED BACK THROUGH HER SKIN'S OWN STRETCH (`pulledSlip.ts`): on a sheet whose answer is known.
 * (What it does on her own skin, at every size of belly, is in `tests/bottomCut.test.ts` and the module's header.)
 */
import { describe, expect, it } from 'vitest';
import { PULLED_SLIP, PULLED_STEP, makePulledSlip, pulledSlipDriver } from '../src/sarahlab/pulledSlip';
import type { SlipSource } from '../src/sarahlab/skinSlip';

/** A small generator of the same numbers every run. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A flat sheet in the plane z = 0: `n` by `n` points `step` apart, each off its place by up to `uneven` of a step, in triangles. */
function sheet(n: number, step: number, uneven: number, seed = 7) {
  const random = seeded(seed), rest = new Float32Array(n * n * 3), index: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = j * n + i, edge = i === 0 || j === 0 || i === n - 1 || j === n - 1; rest[v * 3] = (i + (edge ? 0 : (random() - 0.5) * uneven)) * step; rest[v * 3 + 1] = (j + (edge ? 0 : (random() - 0.5) * uneven)) * step; }
  for (let j = 0; j + 1 < n; j++) for (let i = 0; i + 1 < n; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; index.push(a, b, d, a, d, c); }
  return { rest, index: Uint32Array.from(index), n, count: n * n };
}
const run = (solver: ReturnType<typeof makePulledSlip>, move: ArrayLike<number>) => { const job = solver.begin(move); job.step(1e6); return job.part(); };

describe('a movement that is even over her skin leaves no slip', () => {
  // (each point up to 0.175 of a step off its place either way: uneven, and no triangle turned over)
  const S = sheet(31, 0.01, 0.35), solver = makePulledSlip(S.rest, S.index, () => true);

  it('a stretch, a turn and a carry of the whole sheet', () => {
    // x' = 1.5 x turned 30 degrees about z, carried (0.02, -0.01, 0.03)
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6), move = new Float32Array(S.count * 3);
    for (let v = 0; v < S.count; v++) { const x = S.rest[v * 3] * 1.5, y = S.rest[v * 3 + 1]; move[v * 3] = c * x - s * y + 0.02 - S.rest[v * 3]; move[v * 3 + 1] = s * x + c * y - 0.01 - S.rest[v * 3 + 1]; move[v * 3 + 2] = 0.03; }
    const part = run(solver, move), slip = solver.pull([{ part, weight: 1 }]);
    let most = 0;
    for (let i = 0; i < slip.length; i += 3) most = Math.max(most, Math.hypot(slip[i], slip[i + 1], slip[i + 2]));
    // (the sheet is 30 cm across and moved by up to 16 cm: its slip is under a hundredth of a millimetre)
    expect(part.most).toBeGreaterThan(0.1);
    expect(most).toBeLessThan(1e-5);
  });

  it('a point on the region\'s border is held: its slip is none, whatever it does', () => {
    const inner = makePulledSlip(S.rest, S.index, (v) => { const i = v % S.n, j = Math.floor(v / S.n); return i >= 5 && i <= 25 && j >= 5 && j <= 25; });
    const random = seeded(3), move = new Float32Array(inner.vertices.length * 3);
    for (let i = 0; i < move.length; i += 3) { move[i] = (random() - 0.5) * 0.004; move[i + 1] = (random() - 0.5) * 0.004; }
    const slip = inner.pull([{ part: run(inner, move), weight: 1 }]);
    let border = 0, inside = 0;
    inner.vertices.forEach((v, k) => { const i = v % S.n, j = Math.floor(v / S.n), l = Math.hypot(slip[k * 3], slip[k * 3 + 1], slip[k * 3 + 2]); if (i === 5 || i === 25 || j === 5 || j === 25) border = Math.max(border, l); else inside = Math.max(inside, l); });
    expect(border).toBe(0);
    expect(inside).toBeGreaterThan(0.001);
  });
});

describe('a slide of her points on skin that has stretched is pulled back to her rest skin', () => {
  // each point slid along the sheet by up to 2.5 mm its own way, and the sheet then stretched half as long again along x
  // and turned 25 degrees: where a point STANDS is S(rest + slide). A line drawn on the rest sheet is looked up at
  // (rest + slip); on the stretched sheet it is a straight line again only if the slip is the slide itself
  const S = sheet(41, 0.01, 0.5, 11), solver = makePulledSlip(S.rest, S.index, () => true);
  const random = seeded(5), slide = new Float32Array(S.count * 3), stood = new Float32Array(S.count * 3), move = new Float32Array(S.count * 3);
  const c = Math.cos((25 * Math.PI) / 180), s = Math.sin((25 * Math.PI) / 180), map = (x: number, y: number): [number, number] => [c * 1.5 * x - s * y, s * 1.5 * x + c * y];
  for (let v = 0; v < S.count; v++) {
    const i = v % S.n, j = Math.floor(v / S.n), edge = i === 0 || j === 0 || i === S.n - 1 || j === S.n - 1;
    if (!edge) { slide[v * 3] = (random() - 0.5) * 0.005; slide[v * 3 + 1] = (random() - 0.5) * 0.005; }
    const [x, y] = map(S.rest[v * 3] + slide[v * 3], S.rest[v * 3 + 1] + slide[v * 3 + 1]);
    stood[v * 3] = x; stood[v * 3 + 1] = y;
    move[v * 3] = x - S.rest[v * 3]; move[v * 3 + 1] = y - S.rest[v * 3 + 1];
  }
  const part = run(solver, move), pulled = solver.pull([{ part, weight: 1 }]);
  /** How far off straight the line x = `at` of the rest sheet is on the sheet as it stands, looked up at (rest + `slip`): the worst of where it crosses her triangles' sides, well inside the sheet. */
  const offStraight = (slip: ArrayLike<number>, at: number): number => {
    const value = (v: number) => S.rest[v * 3] + slip[v * 3] - at;
    let worst = 0;
    for (let t = 0; t < S.index.length; t += 3) for (const [a, b] of [[S.index[t], S.index[t + 1]], [S.index[t + 1], S.index[t + 2]], [S.index[t + 2], S.index[t]]]) {
      const fa = value(a), fb = value(b);
      if ((fa > 0) === (fb > 0)) continue;
      const u = fa / (fa - fb), x = stood[a * 3] + (stood[b * 3] - stood[a * 3]) * u, y = stood[a * 3 + 1] + (stood[b * 3 + 1] - stood[a * 3 + 1]) * u;
      // back through the stretch: on the rest sheet the crossing should be at x = `at`
      const rx = (c * x + s * y) / 1.5, ry = -s * x + c * y;
      if (ry < 0.08 || ry > 0.32) continue;
      worst = Math.max(worst, Math.abs(rx - at));
    }
    return worst;
  };

  it('the line is straight on the stretched sheet with the pulled slip, and is not with the slip as it is told', () => {
    // the slip as `skinSlip.ts` tells it: what is left of the movement, along the sheet -- the slide as it STANDS,
    // half as long again along the stretch and turned with it
    const plain = Float32Array.from(part.rest), none = new Float32Array(S.count * 3);
    for (let i = 2; i < plain.length; i += 3) plain[i] = 0;
    const lines = [0.15, 0.2, 0.25];
    const withNone = Math.max(...lines.map((x) => offStraight(none, x))), withPlain = Math.max(...lines.map((x) => offStraight(plain, x))), withPulled = Math.max(...lines.map((x) => offStraight(pulled, x)));
    // (MEASURED 2026-11-15: with no slip the line is 2.3 mm off at the most; with her slip as told 1.4 mm; pulled back,
    // 0.3 mm -- what is left is the smooth part of the slides themselves, which no slip is)
    expect(withNone).toBeGreaterThan(0.002);
    expect(withPlain).toBeGreaterThan(0.001);
    expect(withPulled).toBeLessThan(0.0005);
    expect(withPulled).toBeLessThan(withPlain / 2);
  });

  it('the pulled slip is the slide: a point\'s own, less what its neighbours slid with it', () => {
    let off = 0, size = 0, count = 0;
    for (let v = 0; v < S.count; v++) {
      const i = v % S.n, j = Math.floor(v / S.n);
      if (i < 8 || j < 8 || i > S.n - 9 || j > S.n - 9) continue;
      off += Math.hypot(pulled[v * 3] - slide[v * 3], pulled[v * 3 + 1] - slide[v * 3 + 1]) ** 2; size += Math.hypot(slide[v * 3], slide[v * 3 + 1]) ** 2; count++;
    }
    // (MEASURED 2026-11-15, root mean square: the slides are 2.0 mm, and the pulled slip is within 0.14 mm of them)
    expect(Math.sqrt(size / count)).toBeGreaterThan(0.0015);
    expect(Math.sqrt(off / count)).toBeLessThan(0.15 * Math.sqrt(size / count));
  });

  it('is never longer than `most` times the slip it was pulled from, and parts are summed by their weights before the pull', () => {
    for (let i = 0; i < pulled.length; i += 3) {
      const told = Math.hypot(part.rest[i], part.rest[i + 1]);
      expect(Math.hypot(pulled[i], pulled[i + 1], pulled[i + 2])).toBeLessThanOrEqual(PULLED_SLIP.most * told + 1e-9);
    }
    // two halves of the movement as two parts are the movement
    const half = Float32Array.from(move, (m) => m / 2), a = run(solver, half), twice = solver.pull([{ part: a, weight: 1 }, { part: a, weight: 1 }]), scaled = solver.pull([{ part: a, weight: 2 }]);
    let most = 0;
    for (let i = 0; i < twice.length; i++) most = Math.max(most, Math.abs(twice[i] - pulled[i]), Math.abs(scaled[i] - pulled[i]));
    expect(most).toBeLessThan(2e-6);
  });
});

describe('how much longer her skin is across her once it has moved', () => {
  // (a sheet standing up: x across, y up, its normal along z -- a level line on it runs along x)
  const S = sheet(21, 0.01, 0.35, 4), solver = makePulledSlip(S.rest, S.index, () => true);
  const acrossOf = (s: ReturnType<typeof makePulledSlip>, move: ArrayLike<number>) => { const across = new Float32Array(s.vertices.length); s.pull([{ part: run(s, move), weight: 1 }], undefined, across); return across; };
  const stretched = (kx: number, ky: number, turn = 0, rest: ArrayLike<number> = S.rest) => {
    const c = Math.cos(turn), s = Math.sin(turn), move = new Float32Array(S.count * 3);
    for (let v = 0; v < S.count; v++) { const x = rest[v * 3] * kx, y = rest[v * 3 + 1] * ky; move[v * 3] = c * x - s * y - rest[v * 3]; move[v * 3 + 1] = s * x + c * y - rest[v * 3 + 1]; }
    return move;
  };

  it('is the stretch along a level line of her rest skin, whatever it does up her and however it is turned', () => {
    for (const [kx, ky, turn, want] of [[1.5, 1, 0, 0.5], [0.5, 1, 0, -0.5], [0.5, 1.3, 0.6, -0.5], [1, 1.4, 0, 0], [2, 0.7, -1.1, 1]] as const) {
      const across = acrossOf(solver, stretched(kx, ky, turn));
      for (const a of across) expect(a).toBeCloseTo(want, 4);
    }
    // nothing moved: nothing
    expect(Math.max(...acrossOf(solver, new Float32Array(S.count * 3)).map(Math.abs))).toBeLessThan(1e-9);
    // and it is not asked for unless a place is given for it
    expect(solver.pull([{ part: run(solver, stretched(1.5, 1)), weight: 1 }]).length).toBe(S.count * 3);
  });

  it('is told between a quarter and four times as long', () => {
    for (const a of acrossOf(solver, stretched(9, 1))) expect(a).toBeCloseTo(PULLED_SLIP.across.most - 1, 5);
    for (const a of acrossOf(solver, stretched(0.1, 1))) expect(a).toBeCloseTo(PULLED_SLIP.across.least - 1, 5);
  });

  it('skin that faces up or down has no level line, and none is told for it', () => {
    // the same sheet laid flat (y for z), stretched along x; and tilted until it stands
    const lying = (tilt: number) => { const c = Math.cos(tilt), s = Math.sin(tilt), rest = new Float32Array(S.rest.length); for (let v = 0; v < S.count; v++) { rest[v * 3] = S.rest[v * 3]; rest[v * 3 + 1] = S.rest[v * 3 + 1] * s; rest[v * 3 + 2] = S.rest[v * 3 + 1] * c; } return rest; };
    const told = (tilt: number) => { const rest = lying(tilt), s = makePulledSlip(rest, S.index, () => true), move = new Float32Array(S.count * 3); for (let v = 0; v < S.count; v++) move[v * 3] = rest[v * 3] * 0.5; const a = acrossOf(s, move); return a[Math.floor(a.length / 2)]; };
    // flat (its normal straight up): none; its normal 5 degrees off straight up: still none; 30 degrees and more: all
    expect(told(0)).toBe(0);
    expect(told((5 * Math.PI) / 180)).toBe(0);
    expect(told((30 * Math.PI) / 180)).toBeCloseTo(0.5, 4);
    expect(told(Math.PI / 2)).toBeCloseTo(0.5, 4);
    // between, eased
    const part = told((17 * Math.PI) / 180);
    expect(part).toBeGreaterThan(0.05);
    expect(part).toBeLessThan(0.45);
  });
});

describe('her pulled slip kept up to date, a little at a time', () => {
  const S = sheet(21, 0.01, 0.5, 2), random = seeded(9);
  const shaped = Float32Array.from(S.rest), morph = new Float32Array(S.count * 3);
  const jolt = (into: Float32Array, size: number) => { for (let v = 0; v < S.count; v++) { const i = v % S.n, j = Math.floor(v / S.n); if (i === 0 || j === 0 || i === S.n - 1 || j === S.n - 1) continue; into[v * 3] += (random() - 0.5) * size; into[v * 3 + 1] += (random() - 0.5) * size; } };
  jolt(shaped, 0.004); jolt(morph, 0.004);
  const state = { version: 1, weights: [0] as number[] };
  const source = (): SlipSource => ({ rest: S.rest, shaped, shapedVersion: state.version, weights: state.weights, morph: (_k, v, out) => { out[0] = morph[v * 3]; out[1] = morph[v * 3 + 1]; out[2] = morph[v * 3 + 2]; } });
  // (a clock that a look at it moves on: with no budget an update does one piece of work and stops)
  let clock = 0;
  const longest = (target: Float32Array, stride: number) => { let m = 0; for (let v = 0; v < S.count; v++) m = Math.max(m, Math.hypot(target[v * stride], target[v * stride + 1], target[v * stride + 2])); return m; };

  it('a movement is smoothed over several updates, and what is laid meanwhile is left as it was', () => {
    const solver = makePulledSlip(S.rest, S.index, () => true), driver = pulledSlipDriver(solver, source, () => clock++);
    const target = new Float32Array(S.count * 4).fill(7);
    let updates = 0, wrote = false;
    while (!wrote && updates < 200) { wrote = driver.update(target, 4, 0); updates++; if (!wrote) { expect(driver.pending).toBe(true); expect(target[0]).toBe(7); } }
    // (sixty rounds, four to a piece)
    expect(updates).toBe(PULLED_SLIP.rounds / 4);
    expect(driver.pending).toBe(false);
    expect(driver.stats).toMatchObject({ solved: 1, pulled: 1 });
    // its first three numbers a vertex are her slip; the fourth, how much longer her skin is across her there (the
    // sheet's points are jolted along it, a few tenths of a step: a little longer here and shorter there)
    expect(longest(target, 4)).toBeGreaterThan(0.0005);
    let widest = 0;
    for (let v = 0; v < S.count; v++) { expect(target[v * 4 + 3]).not.toBe(7); expect(Math.abs(target[v * 4 + 3])).toBeLessThan(0.5); widest = Math.max(widest, Math.abs(target[v * 4 + 3])); }
    expect(widest).toBeGreaterThan(0.001);
    // nothing has changed: nothing is written
    expect(driver.update(target, 4, 0)).toBe(false);
    // with time to spare a whole movement is smoothed in one update
    state.version = 2; jolt(shaped, 0.004);
    expect(driver.update(target, 4, 1e9)).toBe(true);
    expect(driver.stats.solved).toBe(2);
    state.version = 1;
  });

  it('a morph\'s part is worked out the first time it is on, and laid by its weight', () => {
    const solver = makePulledSlip(S.rest, S.index, () => true), driver = pulledSlipDriver(solver, source, () => clock++);
    const target = new Float32Array(S.count * 3), before = new Float32Array(S.count * 3);
    state.weights = [0];
    expect(driver.update(target, 3, 1e9)).toBe(true);
    before.set(target);
    expect(driver.stats.morphs).toEqual([]);
    state.weights = [1];
    expect(driver.pending).toBe(false);
    expect(driver.update(target, 3, 1e9)).toBe(true);
    expect(driver.stats).toMatchObject({ solved: 2, morphs: [0] });
    let moved = 0;
    for (let i = 0; i < target.length; i++) moved = Math.max(moved, Math.abs(target[i] - before[i]));
    expect(moved).toBeGreaterThan(0.0005);
    // a weight that moves her slip by less than a line is seen to move is not laid; one that does, is
    const part = solver.begin(Float32Array.from(morph)); part.step(1e6);
    const reach = part.part().rough + 0.1 * part.part().most;
    state.weights = [1 + (0.5 * PULLED_STEP) / reach];
    expect(driver.update(target, 3, 1e9)).toBe(false);
    state.weights = [1 + (2 * PULLED_STEP) / reach];
    expect(driver.update(target, 3, 1e9)).toBe(true);
    // `force` lays it again whatever has changed (after something else has written the target)
    target.fill(0);
    expect(driver.update(target, 3, 1e9, true)).toBe(true);
    expect(longest(target, 3)).toBeGreaterThan(0.0005);
    state.weights = [0];
  });

  it('a movement that is nowhere worth telling has no part', () => {
    const still = Float32Array.from(S.rest), solver = makePulledSlip(S.rest, S.index, () => true);
    const driver = pulledSlipDriver(solver, () => ({ rest: S.rest, shaped: still, shapedVersion: 1, weights: [1], morph: (_k, _v, out) => { out[0] = PULLED_SLIP.floor / 4; out[1] = 0; out[2] = 0; } }), () => clock++);
    const target = new Float32Array(S.count * 3);
    expect(driver.update(target, 3, 1e9)).toBe(true);
    expect(driver.stats.morphs).toEqual([]);
    expect(longest(target, 3)).toBe(0);
  });
});
