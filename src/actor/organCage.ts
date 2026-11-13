/**
 * AN ORGAN AS A SIMPLE SOFT BODY (the skeleton-outward plan: "A coarse cage of points keeps its shape with springs,
 * ligament-like springs tie it to its bone, and it is pushed apart from its neighbours... It sways, lags and settles as
 * she moves, instead of being bolted to a bone").
 *
 * The cage: a few dozen points inside and over the organ, each with a mass. Every step:
 *  1. gravity and the step's motion move them (their own velocity, damped);
 *  2. SHAPE: they are pulled toward the organ's rest shape, turned and moved to fit where they are now (shape matching,
 *     Mueller et al. 2005, "Meshless deformations based on shape matching") -- so it keeps its shape but may sway as a
 *     whole and bulge a little;
 *  3. LIGAMENTS: each point is pulled toward where its bone carries its rest place, by its own `tie` (a cervix held hard
 *     by its ligaments, a fundus or a bladder's dome left loose);
 *  4. NEIGHBOURS: points of two cages closer than their radii are pushed apart (`separate`);
 *  and its velocity is what that did. The organ's drawn points follow the cage (`skinToCage`, `followCage`): each is held
 *  by its nearest cage points, turned by the cage's fitted rotation.
 *
 * World metres (y up), so gravity is the world's. Pure: plain arrays, no three.
 */

export type M3 = [number, number, number, number, number, number, number, number, number];

export interface CageTune {
  /** How firmly it keeps its shape, 0..1 a step at 120 steps a second. GAME TUNING. */
  readonly shape: number;
  /** How much of its speed it keeps each second (the rest lost to the tissue round it). GAME TUNING. */
  readonly keep: number;
}

export interface Cage {
  readonly n: number;
  /** Rest places (the bone's frame, metres) and their centre of mass, and each point's offset from it. */
  readonly rest: Float32Array;
  readonly restCentre: [number, number, number];
  readonly q: Float32Array;
  readonly mass: Float32Array;
  /** How hard each point is tied to its rest place, 0..1 a step. */
  readonly tie: Float32Array;
  /** Each point's radius against other cages, metres. */
  readonly radius: Float32Array;
  /** Where the points are and how fast they go (world metres). */
  readonly x: Float32Array;
  readonly v: Float32Array;
  /** The rotation that fits the rest shape to them now (world from rest), and their centre now. */
  R: M3;
  centre: [number, number, number];
  primed: boolean;
}

/** A cage from its rest points (bone frame, metres), their masses, ties and radii. */
export function makeCage(rest: ArrayLike<number>, mass: ArrayLike<number>, tie: ArrayLike<number>, radius: ArrayLike<number>): Cage {
  const n = Math.floor(rest.length / 3), r = Float32Array.from(rest), m = Float32Array.from(mass);
  let M = 0, cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { M += m[i]; cx += m[i] * r[3 * i]; cy += m[i] * r[3 * i + 1]; cz += m[i] * r[3 * i + 2]; }
  cx /= M; cy /= M; cz /= M;
  const q = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { q[3 * i] = r[3 * i] - cx; q[3 * i + 1] = r[3 * i + 1] - cy; q[3 * i + 2] = r[3 * i + 2] - cz; }
  return { n, rest: r, restCentre: [cx, cy, cz], q, mass: m, tie: Float32Array.from(tie), radius: Float32Array.from(radius), x: new Float32Array(3 * n), v: new Float32Array(3 * n), R: [1, 0, 0, 0, 1, 0, 0, 0, 1], centre: [0, 0, 0], primed: false };
}

/**
 * A cage's rest places set again (the bone's frame, metres: what it is tied to, and the shape it keeps) -- an organ
 * carried by something its bone does not carry (her diaphragm as she breathes: sarahlab/abdomenView.ts `ride`). With
 * `carry` (the bone's frame to the world, as `stepCage`'s `boneToWorld`) its points are carried the same way at once:
 * what moves its rest place moves the organ itself, with no lag (her diaphragm pushes what is under it; left to its
 * ties alone a soft organ would trail its rest place by centimetres in a hard breath). Without it, it follows by its ties.
 */
export function setRest(c: Cage, rest: ArrayLike<number>, carry: ArrayLike<number> | null = null): void {
  if (carry && c.primed) for (let i = 0; i < c.n; i++) {
    const dx = rest[3 * i] - c.rest[3 * i], dy = rest[3 * i + 1] - c.rest[3 * i + 1], dz = rest[3 * i + 2] - c.rest[3 * i + 2];
    c.x[3 * i] += carry[0] * dx + carry[4] * dy + carry[8] * dz; c.x[3 * i + 1] += carry[1] * dx + carry[5] * dy + carry[9] * dz; c.x[3 * i + 2] += carry[2] * dx + carry[6] * dy + carry[10] * dz;
  }
  let M = 0, cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < c.n; i++) { c.rest[3 * i] = rest[3 * i]; c.rest[3 * i + 1] = rest[3 * i + 1]; c.rest[3 * i + 2] = rest[3 * i + 2]; M += c.mass[i]; cx += c.mass[i] * rest[3 * i]; cy += c.mass[i] * rest[3 * i + 1]; cz += c.mass[i] * rest[3 * i + 2]; }
  cx /= M; cy /= M; cz /= M; c.restCentre[0] = cx; c.restCentre[1] = cy; c.restCentre[2] = cz;
  for (let i = 0; i < c.n; i++) { c.q[3 * i] = c.rest[3 * i] - cx; c.q[3 * i + 1] = c.rest[3 * i + 1] - cy; c.q[3 * i + 2] = c.rest[3 * i + 2] - cz; }
}

/** A 4x4 (column-major, as three's `Matrix4.elements`) applied to a point. */
function apply(e: ArrayLike<number>, x: number, y: number, z: number, out: Float32Array | number[], o: number): void {
  out[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
  out[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
  out[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
}

/** The rotation nearest a 3x3 (row-major), by its polar decomposition (iterated, warm-started from `R`). */
export function nearestRotation(A: M3, R: M3, iterations = 12): M3 {
  // (McAdams-style: R <- (R + R^-T)/2 from a good start converges to the polar factor; restart from identity if singular)
  let r = R.slice() as M3;
  const fit = (m: M3): M3 => {
    // m^-T = cofactor / det
    const [a, b, c, d, e, f, g, h, i] = m;
    const C: M3 = [e * i - f * h, f * g - d * i, d * h - e * g, c * h - b * i, a * i - c * g, b * g - a * h, b * f - c * e, c * d - a * f, a * e - b * d];
    const det = a * C[0] + b * C[1] + c * C[2];
    if (Math.abs(det) < 1e-18) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    return m.map((v, k) => 0.5 * (v + C[k] / det)) as M3;
  };
  // start: A itself if it is well conditioned, scaled to a determinant of 1 (the iteration is slow to find a scale far
  // from 1, and a cage's A is grams times centimetres squared), else the last rotation
  const detA = A[0] * (A[4] * A[8] - A[5] * A[7]) - A[1] * (A[3] * A[8] - A[5] * A[6]) + A[2] * (A[3] * A[7] - A[4] * A[6]);
  if (detA > 1e-30) { const k = 1 / Math.cbrt(detA); r = A.map((v) => v * k) as M3; }
  for (let k = 0; k < iterations; k++) r = fit(r);
  const det = r[0] * (r[4] * r[8] - r[5] * r[7]) - r[1] * (r[3] * r[8] - r[5] * r[6]) + r[2] * (r[3] * r[7] - r[4] * r[6]);
  return det > 0 && Number.isFinite(det) ? r : R;
}

/** Put the cage where its bone holds it, at rest (`boneToWorld`: a column-major 4x4, metres). */
export function placeCage(c: Cage, boneToWorld: ArrayLike<number>): void {
  for (let i = 0; i < c.n; i++) apply(boneToWorld, c.rest[3 * i], c.rest[3 * i + 1], c.rest[3 * i + 2], c.x, 3 * i);
  c.v.fill(0); c.primed = true;
  fitShape(c);
}

/** The cage's centre now, and the rotation that best fits its rest shape to it. */
function fitShape(c: Cage): void {
  let M = 0, cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < c.n; i++) { const m = c.mass[i]; M += m; cx += m * c.x[3 * i]; cy += m * c.x[3 * i + 1]; cz += m * c.x[3 * i + 2]; }
  cx /= M; cy /= M; cz /= M;
  const A: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < c.n; i++) {
    const m = c.mass[i], px = c.x[3 * i] - cx, py = c.x[3 * i + 1] - cy, pz = c.x[3 * i + 2] - cz, qx = c.q[3 * i], qy = c.q[3 * i + 1], qz = c.q[3 * i + 2];
    A[0] += m * px * qx; A[1] += m * px * qy; A[2] += m * px * qz;
    A[3] += m * py * qx; A[4] += m * py * qy; A[5] += m * py * qz;
    A[6] += m * pz * qx; A[7] += m * pz * qy; A[8] += m * pz * qz;
  }
  c.R = nearestRotation(A, c.R);
  c.centre = [cx, cy, cz];
}

/**
 * One step of `dt` seconds (substepped at `hz`): gravity (world, m/s²) and the cage's own velocity, then its shape, then
 * its ligaments to where `boneToWorld` carries its rest places now.
 */
export function stepCage(c: Cage, dt: number, boneToWorld: ArrayLike<number>, gravity: readonly [number, number, number], tune: CageTune, hz = 120): void {
  if (!c.primed) { placeCage(c, boneToWorld); return; }
  const total = Math.min(Math.max(0, Number.isFinite(dt) ? dt : 0), 0.1), steps = Math.max(1, Math.ceil(total * hz)), h = total / steps;
  if (!(h > 0)) return;
  const keep = Math.pow(Math.max(0, Math.min(1, tune.keep)), h), shape = 1 - Math.pow(1 - Math.max(0, Math.min(1, tune.shape)), (h * 120));
  const old = new Float32Array(3 * c.n), want = [0, 0, 0];
  for (let s = 0; s < steps; s++) {
    old.set(c.x);
    for (let i = 0; i < 3 * c.n; i++) { c.v[i] = c.v[i] * keep + gravity[i % 3] * h; c.x[i] += c.v[i] * h; }
    fitShape(c);
    const R = c.R, [cx, cy, cz] = c.centre;
    for (let i = 0; i < c.n; i++) {
      const qx = c.q[3 * i], qy = c.q[3 * i + 1], qz = c.q[3 * i + 2], o = 3 * i;
      // its shape: where the fitted rest shape puts it
      c.x[o] += (R[0] * qx + R[1] * qy + R[2] * qz + cx - c.x[o]) * shape;
      c.x[o + 1] += (R[3] * qx + R[4] * qy + R[5] * qz + cy - c.x[o + 1]) * shape;
      c.x[o + 2] += (R[6] * qx + R[7] * qy + R[8] * qz + cz - c.x[o + 2]) * shape;
      // its ligaments: where its bone holds its rest place now
      const tie = 1 - Math.pow(1 - c.tie[i], h * 120);
      if (tie > 0) {
        apply(boneToWorld, c.rest[o], c.rest[o + 1], c.rest[o + 2], want, 0);
        c.x[o] += (want[0] - c.x[o]) * tie; c.x[o + 1] += (want[1] - c.x[o + 1]) * tie; c.x[o + 2] += (want[2] - c.x[o + 2]) * tie;
      }
    }
    for (let i = 0; i < 3 * c.n; i++) c.v[i] = (c.x[i] - old[i]) / h;
  }
  fitShape(c);
}

/**
 * How close two cages' points may come: their radii, or less where they were laid closer than that (organs that touch
 * at rest, as a bladder lies on the canal, are not pushed apart standing still). `a.n` x `b.n`, metres.
 */
export function restGaps(a: Cage, b: Cage): Float32Array {
  const out = new Float32Array(a.n * b.n);
  for (let i = 0; i < a.n; i++) for (let j = 0; j < b.n; j++) {
    const d = Math.hypot(b.rest[3 * j] - a.rest[3 * i], b.rest[3 * j + 1] - a.rest[3 * i + 1], b.rest[3 * j + 2] - a.rest[3 * i + 2]);
    out[i * b.n + j] = Math.min(a.radius[i] + b.radius[j], d);
  }
  return out;
}

/** Two cages' points pushed apart where closer than their radii, or than `gaps` (`restGaps`) allows (each moves by its
 * share of the two masses). */
export function separate(a: Cage, b: Cage, gaps?: Float32Array): number {
  let pushes = 0;
  for (let i = 0; i < a.n; i++) for (let j = 0; j < b.n; j++) {
    const dx = b.x[3 * j] - a.x[3 * i], dy = b.x[3 * j + 1] - a.x[3 * i + 1], dz = b.x[3 * j + 2] - a.x[3 * i + 2];
    const d = Math.hypot(dx, dy, dz), want = gaps ? gaps[i * b.n + j] : a.radius[i] + b.radius[j];
    if (d >= want || d < 1e-9) continue;
    const ma = a.mass[i], mb = b.mass[j], push = (want - d) / d, ka = mb / (ma + mb), kb = ma / (ma + mb);
    a.x[3 * i] -= dx * push * ka; a.x[3 * i + 1] -= dy * push * ka; a.x[3 * i + 2] -= dz * push * ka;
    b.x[3 * j] += dx * push * kb; b.x[3 * j + 1] += dy * push * kb; b.x[3 * j + 2] += dz * push * kb;
    pushes++;
  }
  return pushes;
}

/** How a drawn point follows the cage: its `k` nearest cage points (rest), their weights, and its offset from each. */
export interface CageSkin { readonly k: number; readonly index: Uint16Array; readonly weight: Float32Array; readonly offset: Float32Array }

/** Bind drawn points (bone frame, metres) to a cage at rest: each to its `k` nearest cage points, weighted 1/d². */
export function skinToCage(c: Cage, points: ArrayLike<number>, k = 4): CageSkin {
  const n = Math.floor(points.length / 3), index = new Uint16Array(n * k), weight = new Float32Array(n * k), offset = new Float32Array(n * k * 3);
  const d2 = new Float64Array(c.n);
  for (let p = 0; p < n; p++) {
    const px = points[3 * p], py = points[3 * p + 1], pz = points[3 * p + 2];
    for (let i = 0; i < c.n; i++) d2[i] = (c.rest[3 * i] - px) ** 2 + (c.rest[3 * i + 1] - py) ** 2 + (c.rest[3 * i + 2] - pz) ** 2;
    const order = Array.from({ length: c.n }, (_, i) => i).sort((a, b) => d2[a] - d2[b]).slice(0, k);
    let sum = 0;
    order.forEach((i, s) => { const w = 1 / Math.max(1e-8, d2[i]); index[p * k + s] = i; weight[p * k + s] = w; sum += w; });
    for (let s = 0; s < k; s++) {
      weight[p * k + s] /= sum;
      const i = index[p * k + s], o = (p * k + s) * 3;
      offset[o] = px - c.rest[3 * i]; offset[o + 1] = py - c.rest[3 * i + 1]; offset[o + 2] = pz - c.rest[3 * i + 2];
    }
  }
  return { k, index, weight, offset };
}

/** The drawn points where the cage has them now (world metres), into `out`. */
export function followCage(c: Cage, skin: CageSkin, out: Float32Array): void {
  const R = c.R, n = Math.floor(out.length / 3);
  for (let p = 0; p < n; p++) {
    let x = 0, y = 0, z = 0;
    for (let s = 0; s < skin.k; s++) {
      const a = p * skin.k + s, i = skin.index[a], w = skin.weight[a], ox = skin.offset[3 * a], oy = skin.offset[3 * a + 1], oz = skin.offset[3 * a + 2];
      x += w * (c.x[3 * i] + R[0] * ox + R[1] * oy + R[2] * oz);
      y += w * (c.x[3 * i + 1] + R[3] * ox + R[4] * oy + R[5] * oz);
      z += w * (c.x[3 * i + 2] + R[6] * ox + R[7] * oy + R[8] * oz);
    }
    out[3 * p] = x; out[3 * p + 1] = y; out[3 * p + 2] = z;
  }
}
