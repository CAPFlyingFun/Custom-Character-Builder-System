/**
 * A garment designed in a pose (src/sarahlab/designPose.ts, 2026-11-12): a pose's TURNS read from its carry -- a sheet of
 * skin carried as one piece is turned as that piece is, a stretched sheet stretched, the copies of a point along a seam
 * turned as one, a vertex that is not carried not turned; a vertex looked up at its carry and its turn of its slip; and
 * a carry MEASURED with her slip on settled so that the same rule puts every vertex back where it was drawn.
 */
import { describe, expect, it } from 'vitest';
import { POSE_SETTLE_ROUNDS, POSE_SMOOTH_M, POSE_SMOOTH_ROUNDS, layCarried, poseTurns, settleCarry } from '../src/sarahlab/designPose';

/** A repeatable 0..1 (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * A sheet of skin in z = 0: N by N points `gap` apart (metres), each nudged up to a third of that along the sheet so its
 * triangles are uneven. `seam` doubles the points of one column (two vertices at one place, as along a texture seam).
 */
function sheet(N: number, gap: number, seam = false) {
  const rnd = random(7), rest: number[] = [], index: number[] = [], id: number[][] = [];
  for (let j = 0; j < N; j++) { id.push([]); for (let i = 0; i < N; i++) { id[j].push(rest.length / 3); rest.push((i + (rnd() - 0.5) * 0.6) * gap, (j + (rnd() - 0.5) * 0.6) * gap, 0); } }
  const mid = Math.floor(N / 2), right = id.map((row) => row.slice());
  if (seam) for (let j = 0; j < N; j++) { const v = id[j][mid]; right[j][mid] = rest.length / 3; rest.push(rest[v * 3], rest[v * 3 + 1], rest[v * 3 + 2]); }
  for (let j = 0; j + 1 < N; j++) for (let i = 0; i + 1 < N; i++) {
    const g = i >= mid ? right : id, a = g[j][i], b = g[j][i + 1], c = g[j + 1][i], d = g[j + 1][i + 1];
    index.push(a, b, c, b, d, c);
  }
  return { rest: Float32Array.from(rest), index, id, right, N, mid, count: rest.length / 3 };
}
/** Whether grid point (i, j) is well inside the sheet (its edge has neighbours on one side only). */
const inner = (i: number, j: number, N: number, by = 6) => i >= by && j >= by && i < N - by && j < N - by;
const mul = (m: readonly number[], v: readonly number[]) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

describe('a pose\'s turns, read from its carry (2026-11-12)', () => {
  it('turns a sheet carried as one piece as that piece is turned, wherever it is carried to', () => {
    const { rest, index, N, count } = sheet(31, 0.005);
    // a quarter turn about x and a tilt about z, then carried 30 cm off
    const a = Math.PI / 2, b = 0.4, Rx = [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)], Rz = [Math.cos(b), -Math.sin(b), 0, Math.sin(b), Math.cos(b), 0, 0, 0, 1];
    const R = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => Rz[r * 3] * Rx[c] + Rz[r * 3 + 1] * Rx[3 + c] + Rz[r * 3 + 2] * Rx[6 + c]));
    const carry = new Float32Array(count * 3);
    for (let v = 0; v < count; v++) { const p = [rest[v * 3], rest[v * 3 + 1], rest[v * 3 + 2]], q = mul(R, p); carry[v * 3] = q[0] + 0.3 - p[0]; carry[v * 3 + 1] = q[1] - 0.1 - p[1]; carry[v * 3 + 2] = q[2] + 0.2 - p[2]; }
    const turn = poseTurns(rest, index, carry, 1);
    let worst = 0;
    for (let v = 0; v < count; v++) if (inner(v % N, Math.floor(v / N), N)) for (let k = 0; k < 9; k++) worst = Math.max(worst, Math.abs(turn[v * 9 + k] - R[k]));
    expect(worst).toBeLessThan(1e-4);
  });

  it('stretches where the pose stretches her skin, and keeps her skin\'s thickness as it is', () => {
    const { rest, index, N, count } = sheet(31, 0.005), carry = new Float32Array(count * 3);
    // twice as wide, and sheared a quarter: x' = 2x + 0.25y
    for (let v = 0; v < count; v++) carry[v * 3] = rest[v * 3] + 0.25 * rest[v * 3 + 1];
    const turn = poseTurns(rest, index, carry, 1), want = [2, 0.25, 0, 0, 1, 0, 0, 0, 1];
    let worst = 0;
    for (let v = 0; v < count; v++) if (inner(v % N, Math.floor(v / N), N)) for (let k = 0; k < 9; k++) worst = Math.max(worst, Math.abs(turn[v * 9 + k] - want[k]));
    expect(worst).toBeLessThan(1e-4);
  });

  it('smooths a carry that is not smooth over fine skin, and leaves coarse skin as it is carried', () => {
    // a stretch by a half, with each point's carry jittered by a twentieth of a millimetre
    const jitter = (count: number) => { const rnd = random(3), j = new Float32Array(count * 3); for (let i = 0; i < j.length; i++) j[i] = i % 3 === 2 ? 0 : (rnd() - 0.5) * 0.0001; return j; };
    const worstOff = (gap: number, rounds: number) => {
      const { rest, index, N, count } = sheet(41, gap), j = jitter(count), carry = new Float32Array(count * 3);
      for (let v = 0; v < count; v++) { carry[v * 3] = 0.5 * rest[v * 3] + j[v * 3]; carry[v * 3 + 1] = j[v * 3 + 1]; }
      const turn = poseTurns(rest, index, carry, 1, rounds);
      let worst = 0;
      for (let v = 0; v < count; v++) if (inner(v % N, Math.floor(v / N), N, 10)) worst = Math.max(worst, Math.abs(turn[v * 9] - 1.5), Math.abs(turn[v * 9 + 1]), Math.abs(turn[v * 9 + 3]), Math.abs(turn[v * 9 + 4] - 1));
      return worst;
    };
    // fine skin (points half a millimetre apart, far nearer each other than POSE_SMOOTH_M): the jitter is a fifth of the
    // spacing, and read as it lies it turns her skin by tenths; smoothed, by hundredths
    expect(0.0005).toBeLessThan(POSE_SMOOTH_M / 4);
    expect(worstOff(0.0005, 0)).toBeGreaterThan(0.1);
    expect(worstOff(0.0005, POSE_SMOOTH_ROUNDS)).toBeLessThan(0.03);
    // coarse skin (points 3 cm apart): the same jitter is nothing against the spacing, smoothed or not
    expect(worstOff(0.03, POSE_SMOOTH_ROUNDS)).toBeLessThan(0.01);
  });

  it('turns the copies of a point along a seam as one, and does not turn a vertex that is not carried', () => {
    const { rest, index, id, right, N, mid, count } = sheet(31, 0.005, true), carry = new Float32Array(count * 3);
    expect(count).toBe(N * N + N);
    // her left half carried (stretched and lifted), her right half not; the seam's column is carried
    for (let v = 0; v < count; v++) if (rest[v * 3] <= rest[id[0][mid] * 3] + 0.002) { carry[v * 3] = 0.4 * rest[v * 3] + 0.001; carry[v * 3 + 2] = 0.3 * rest[v * 3 + 1] + 0.001; }
    const turn = poseTurns(rest, index, carry, 1);
    for (let j = 0; j < N; j++) for (let k = 0; k < 9; k++) expect(turn[right[j][mid] * 9 + k]).toBe(turn[id[j][mid] * 9 + k]);
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    let notCarried = 0;
    for (let v = 0; v < count; v++) if (!carry[v * 3] && !carry[v * 3 + 2]) { notCarried++; expect(Array.from(turn.subarray(v * 9, v * 9 + 9))).toEqual(identity); }
    expect(notCarried).toBeGreaterThan(N * 10);
    // and nothing carried: nothing turned
    expect(Array.from(poseTurns(rest, index, new Float32Array(count * 3), 1).subarray(0, 9))).toEqual(identity);
  });

  it('looks a vertex up at its carry and its turn of its slip', () => {
    const carry = Float32Array.from([1, 2, 3, 0, 0, 0]), turn = Float32Array.from([0, -1, 0, 1, 0, 0, 0, 0, 2, 1, 0, 0, 0, 1, 0, 0, 0, 1]), slip = Float32Array.from([0.1, 0.2, 0.3, 0.5, 0.6, 0.7]);
    const out = layCarried(new Float32Array(6), carry, turn, slip);
    [1 - 0.2, 2 + 0.1, 3 + 0.6, 0.5, 0.6, 0.7].forEach((want, i) => expect(out[i]).toBeCloseTo(want, 6));
  });
});

describe('a carry measured in the room, settled against her slip (settleCarry)', () => {
  /** A pose of the sheet: stretched across, and rolled a little out of its plane. */
  const pose = (x: number, y: number): [number, number, number] => [1.6 * x + 0.2 * y, y * Math.cos(0.5 * x / 0.03) * 0.9 + 0.01, 0.03 * Math.sin(x / 0.03) + 0.2 * y];

  it('gives the carry the room\'s own look-up turns back into where it drew her', () => {
    const { rest, index, N, count } = sheet(41, 0.001), rnd = random(11), step = 0.00005;
    // her slip as she was drawn: each vertex up to half a millimetre along the sheet from its rest place; and where the
    // room drew it: where her skin that far along belongs in the pose
    const slip = new Float32Array(count * 3), drawn = new Float32Array(count * 3);
    for (let v = 0; v < count; v++) {
      slip[v * 3] = (rnd() - 0.5) * 0.001; slip[v * 3 + 1] = (rnd() - 0.5) * 0.001;
      const p = pose(rest[v * 3] + slip[v * 3], rest[v * 3 + 1] + slip[v * 3 + 1]);
      for (let k = 0; k < 3; k++) drawn[v * 3 + k] = p[k] - rest[v * 3 + k];
    }
    const carry = settleCarry(rest, index, drawn, slip, step, 1);
    // stored in its steps
    for (let i = 0; i < carry.length; i += 97) expect(Math.abs(carry[i] / step - Math.round(carry[i] / step))).toBeLessThan(1e-3);
    // the room's look-up with that slip: back where she was drawn, to the step
    const back = layCarried(new Float32Array(count * 3), carry, poseTurns(rest, index, carry, 1), slip);
    let worst = 0, own = 0, raw = 0;
    for (let v = 0; v < count; v++) {
      if (!inner(v % N, Math.floor(v / N), N, 8)) continue;
      worst = Math.max(worst, Math.hypot(back[v * 3] - drawn[v * 3], back[v * 3 + 1] - drawn[v * 3 + 1], back[v * 3 + 2] - drawn[v * 3 + 2]));
      // and the carry itself is where the vertex's OWN rest place belongs in the pose -- which what was drawn is not
      const p = pose(rest[v * 3], rest[v * 3 + 1]);
      own = Math.max(own, Math.hypot(rest[v * 3] + carry[v * 3] - p[0], rest[v * 3 + 1] + carry[v * 3 + 1] - p[1], rest[v * 3 + 2] + carry[v * 3 + 2] - p[2]));
      raw = Math.max(raw, Math.hypot(rest[v * 3] + drawn[v * 3] - p[0], rest[v * 3 + 1] + drawn[v * 3 + 1] - p[1], rest[v * 3 + 2] + drawn[v * 3 + 2] - p[2]));
    }
    expect(worst).toBeLessThan(2 * step);
    expect(raw).toBeGreaterThan(0.0005);
    expect(own).toBeLessThan(raw / 5);
    expect(POSE_SETTLE_ROUNDS).toBeGreaterThanOrEqual(4);
  });

  it('keeps what was drawn where she has no slip, and nothing for a vertex left out', () => {
    const { rest, index, count } = sheet(21, 0.002), drawn = new Float32Array(count * 3), step = 0.00005;
    for (let v = 0; v < count; v++) if (rest[v * 3] < 0.02) { const p = pose(rest[v * 3], rest[v * 3 + 1]); for (let k = 0; k < 3; k++) drawn[v * 3 + k] = p[k] - rest[v * 3 + k]; }
    const carry = settleCarry(rest, index, drawn, new Float32Array(count * 3), step, 1);
    let kept = 0;
    for (let v = 0; v < count; v++) {
      if (rest[v * 3] < 0.02) { kept++; for (let k = 0; k < 3; k++) expect(Math.abs(carry[v * 3 + k] - drawn[v * 3 + k])).toBeLessThanOrEqual(step / 2 + 1e-9); }
      else expect([carry[v * 3], carry[v * 3 + 1], carry[v * 3 + 2]]).toEqual([0, 0, 0]);
    }
    expect(kept).toBeGreaterThan(100);
  });
});
