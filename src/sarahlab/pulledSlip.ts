/**
 * HER SKIN'S SLIP, PULLED BACK THROUGH HER SKIN'S OWN STRETCH (2026-11-15): for a line drawn on her that has to stay a
 * smooth line on her at every size of belly -- a painted bottom's WAISTBAND (`bottomCut.ts`).
 *
 * WHAT WAS WRONG (MEASURED 2026-11-15 on her skin's points read out of the room at 0, 73, 100, 150 and 200% of her
 * belly; a waistband's line found on her triangles and its turns from one triangle to the next counted, pieces under
 * 1.5 mm left out). A waistband was a value a vertex of her skin, and a value a vertex rides her points -- which her
 * shapes slide along her skin, each triangle by its own amount (`skinSlip.ts`). The over-belly leggings' waistband,
 * smooth on her body file (its turns 3.4 degrees at their 90th percentile, 8.7 at the most), turned 29 degrees at its
 * 90th percentile and 49 at the most as the room draws her at 100%; 34 and 67 at 0%; 29 and 75 at 200%: torn, at every
 * size. (Joshua saw it where a top leaves her middle bare: under a sports bra.)
 *
 * WHAT HER SLIP GIVES, AND WHERE IT STOPS. Looked up at (its rest place + its slip), a design on her rest skin lies on
 * her as if her points had all moved smoothly (`skinSlip.ts`): 4.8 and 7.3 degrees at 100%, 8.5 and 23.5 at 0%. But at
 * 150% it is 10 and 23, and at 200% 22 and 53, with 24 turns over 15 degrees. A slip is told where her points STAND
 * -- on her skin as it is shaped -- and laid on her REST skin as it is. Where her skin has stretched and turned
 * between the two, a slide of a centimetre along her big belly is not a centimetre along her rest skin, nor in the
 * same direction: her belly's skin at 200% is half as long again as at rest.
 *
 * WHAT THIS GIVES. The slip is PULLED BACK: at each point the smooth part of her movement stretches and turns her skin
 * by some map F (worked out from how its neighbours' smooth movements differ from its own), and what a point slid on
 * her shaped skin is F's inverse of it on her rest skin. MEASURED, the same waistband: 3.9 degrees at its 90th
 * percentile and 6.5 at the most at 200%; 4.0 and 6.3 at 150%; 4.3 and 5.7 at 100%; 4.8 and 6.7 at 73%; 6.1 and 11.4
 * at 0% -- no turn over 15 degrees at any size. (The under-belly band keeps a handful: where it crosses the creases at
 * the tops of her thighs, 6 to 7 cm either side of her middle, as it does on her body file itself.)
 *
 * IT IS WORKED OUT A LITTLE AT A TIME. Its region is her whole middle (26,000 of her points: a waistband may lie
 * anywhere from under her hips to under her bust), and its smoothing costs a tenth of a second on the build machine --
 * a frame and more. So a movement's smooth part is a JOB, stepped a few rounds a frame (`PulledDriver.update`'s
 * budget); what is drawn meanwhile is her slip as it last was, and a slider dragged leaves the line a few tenths of a
 * second behind her shape, never the frame.
 *
 * LINEAR UP TO THE PULL: a movement's smooth part and what is left of it are kept a PART for her shapes as they are
 * and a part for each of her morphs (`SmoothPart`); the parts are summed by the morphs' weights, and the pull back is
 * worked out on the sum (it is not linear: F is the sum's).
 *
 * Pure arithmetic over plain arrays.
 */
import type { SlipSource } from './skinSlip';

/**
 * GAME TUNING. `rounds`, `blend`: the smoothing, as `skinSlip.ts`'s (sixty half steps reach a few centimetres along her
 * skin). `most`: a pulled slip is never longer than this many times the slip it was pulled from (her skin folded on
 * itself, in a crease, has no stretch to pull by). `floor`: a movement that is nowhere more than this (the source's
 * units) is none -- a morph of her face has no part here. `across`: below.
 */
export const PULLED_SLIP = Object.freeze({
  rounds: 60, blend: 0.5, most: 2.5, floor: 0.0002,
  /**
   * her skin's stretch ACROSS her is told between a quarter and four times; and only where her skin stands up enough to
   * have a level line: all of it where its normal is `level[1]` or more off straight up or down (the sine), none at
   * `level[0]`
   */
  across: Object.freeze({ least: 0.25, most: 4, level: Object.freeze([0.15, 0.45] as const) }),
});

/**
 * One movement's smooth part and the rest of it, a point (three numbers each); `most`, the longest the movement is, and
 * `rough`, the longest what is left of it is.
 */
export interface SmoothPart { readonly smooth: Float32Array; readonly rest: Float32Array; readonly most: number; readonly rough: number }
/** A movement being smoothed: `step` does up to `rounds` rounds and says whether it is done; `part` is it, once done. */
export interface SmoothJob { step(rounds: number): boolean; readonly left: number; part(): SmoothPart }

export interface PulledSlip {
  /** Her vertices in the region, in the order a movement is given and a slip comes back in (every copy of a point along a seam). */
  readonly vertices: Uint32Array;
  /** How many points they are, welded. */
  readonly points: number;
  /** A movement (three numbers a region vertex, in `vertices`' order, any units) begun to be smoothed. */
  begin(move: ArrayLike<number>): SmoothJob;
  /**
   * The pulled slip of parts summed by their weights: three numbers a region vertex (written to `out` when given). And,
   * into `across` when given (a number a region vertex), HOW MUCH LONGER HER SKIN IS ACROSS HER there once it has moved
   * -- along a level line on her rest skin, by the smooth movement's stretch: 0 as long, -0.5 half as long, 1 twice
   * (`PULLED_SLIP.across`; 0 where her skin faces up or down and has no level line, or is folded).
   */
  pull(parts: readonly { readonly part: SmoothPart; readonly weight: number }[], out?: Float32Array, across?: Float32Array): Float32Array;
}

/**
 * Her region's points and how they are joined, ready to take movements. `rest`: her vertices at rest (three numbers
 * each). `index`: her triangles. `inRegion`: whether a vertex is in the region (by its number: her arms' skin, which
 * hangs beside her hips, is left out by what it is and not where).
 */
export function makePulledSlip(rest: ArrayLike<number>, index: ArrayLike<number>, inRegion: (v: number) => boolean, options: { readonly rounds?: number; readonly blend?: number } = {}): PulledSlip {
  const rounds = options.rounds ?? PULLED_SLIP.rounds, blend = options.blend ?? PULLED_SLIP.blend;
  const count = rest.length / 3, pointOf = new Int32Array(count).fill(-1), byPlace = new Map<string, number>(), list: number[] = [], first: number[] = [];
  for (let v = 0; v < count; v++) {
    if (!inRegion(v)) continue;
    const key = `${rest[v * 3]},${rest[v * 3 + 1]},${rest[v * 3 + 2]}`;
    let p = byPlace.get(key);
    if (p === undefined) { p = first.length; byPlace.set(key, p); first.push(v); }
    pointOf[v] = p; list.push(v);
  }
  const vertices = Uint32Array.from(list), points = first.length;
  const at = new Float64Array(points * 3);
  first.forEach((v, p) => { at[p * 3] = rest[v * 3]; at[p * 3 + 1] = rest[v * 3 + 1]; at[p * 3 + 2] = rest[v * 3 + 2]; });
  // her triangles wholly in the region: their faces give each point its normal, their corners each neighbour's share
  // (its mean value weight, as `skinSlip.ts`: a movement that is even over a patch averages to itself)
  const normal = new Float64Array(points * 3), weight = new Map<number, number>(), sides = new Map<number, number>(), held = new Uint8Array(points);
  const corner = (p: number, q: number, r: number) => {
    const ux = at[q * 3] - at[p * 3], uy = at[q * 3 + 1] - at[p * 3 + 1], uz = at[q * 3 + 2] - at[p * 3 + 2];
    const vx = at[r * 3] - at[p * 3], vy = at[r * 3 + 1] - at[p * 3 + 1], vz = at[r * 3 + 2] - at[p * 3 + 2];
    const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
    const half = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / Math.max(lu * lv + ux * vx + uy * vy + uz * vz, 1e-30);
    if (!(lu > 0 && lv > 0) || !Number.isFinite(half)) return;
    weight.set(p * points + q, (weight.get(p * points + q) ?? 0) + half / lu);
    weight.set(p * points + r, (weight.get(p * points + r) ?? 0) + half / lv);
    sides.set(p * points + q, (sides.get(p * points + q) ?? 0) + 1);
    sides.set(p * points + r, (sides.get(p * points + r) ?? 0) + 1);
  };
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = pointOf[index[t]], b = pointOf[index[t + 1]], c = pointOf[index[t + 2]];
    // (a point on the region's border has neighbours on one side only: it is held, its slip none)
    if (a < 0 || b < 0 || c < 0) { if (a >= 0) held[a] = 1; if (b >= 0) held[b] = 1; if (c >= 0) held[c] = 1; continue; }
    if (a === b || b === c || a === c) continue;
    const ux = at[b * 3] - at[a * 3], uy = at[b * 3 + 1] - at[a * 3 + 1], uz = at[b * 3 + 2] - at[a * 3 + 2];
    const vx = at[c * 3] - at[a * 3], vy = at[c * 3 + 1] - at[a * 3 + 1], vz = at[c * 3 + 2] - at[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) { normal[p * 3] += nx; normal[p * 3 + 1] += ny; normal[p * 3 + 2] += nz; }
    corner(a, b, c); corner(b, c, a); corner(c, a, b);
  }
  for (let p = 0; p < points; p++) { const l = Math.hypot(normal[p * 3], normal[p * 3 + 1], normal[p * 3 + 2]) || 1; normal[p * 3] /= l; normal[p * 3 + 1] /= l; normal[p * 3 + 2] /= l; }
  // (and a point on an open edge of her skin itself -- an edge with a triangle on one side only -- the same)
  for (const [key, n] of sides) if (n === 1) held[Math.floor(key / points)] = 1;
  const start = new Int32Array(points + 1);
  for (const key of weight.keys()) start[Math.floor(key / points) + 1]++;
  for (let p = 0; p < points; p++) start[p + 1] += start[p];
  const fill = start.slice(0, points), to = new Int32Array(weight.size), share = new Float32Array(weight.size);
  for (const [key, w] of weight) { const p = Math.floor(key / points), q = key - p * points; to[fill[p]] = q; share[fill[p]++] = w; }
  for (let p = 0; p < points; p++) {
    let sum = 0;
    for (let j = start[p]; j < start[p + 1]; j++) sum += share[j];
    if (sum > 0) for (let j = start[p]; j < start[p + 1]; j++) share[j] /= sum;
  }
  // each neighbour's place about its point, for the stretch: the edges of a point's ring, at rest
  const edge = new Float32Array(weight.size * 3);
  for (let p = 0; p < points; p++) for (let j = start[p]; j < start[p + 1]; j++) { const q = to[j]; edge[j * 3] = at[q * 3] - at[p * 3]; edge[j * 3 + 1] = at[q * 3 + 1] - at[p * 3 + 1]; edge[j * 3 + 2] = at[q * 3 + 2] - at[p * 3 + 2]; }
  const copies = new Float32Array(points);
  for (let k = 0; k < vertices.length; k++) copies[pointOf[vertices[k]]]++;
  const sumSmooth = new Float32Array(points * 3), sumRest = new Float32Array(points * 3), pulled = new Float32Array(points * 3), wide = new Float32Array(points);

  return {
    vertices, points,
    begin(move) {
      // each point's movement: its copies' average (they are one point, and move as one but for rounding)
      const moved = new Float32Array(points * 3);
      let most = 0;
      for (let k = 0; k < vertices.length; k++) { const p = pointOf[vertices[k]] * 3; moved[p] += move[k * 3]; moved[p + 1] += move[k * 3 + 1]; moved[p + 2] += move[k * 3 + 2]; }
      for (let p = 0; p < points; p++) { const c = copies[p] || 1, i = p * 3; moved[i] /= c; moved[i + 1] /= c; moved[i + 2] /= c; most = Math.max(most, Math.hypot(moved[i], moved[i + 1], moved[i + 2])); }
      let smooth = moved.slice(), next = new Float32Array(points * 3), left = most > 0 ? rounds : 0;
      return {
        get left() { return left; },
        step(n) {
          for (let r = 0; r < n && left > 0; r++, left--) {
            for (let p = 0; p < points; p++) {
              const i = p * 3, j0 = start[p], j1 = start[p + 1];
              if (j0 === j1 || held[p]) { next[i] = smooth[i]; next[i + 1] = smooth[i + 1]; next[i + 2] = smooth[i + 2]; continue; }
              let x = 0, y = 0, z = 0;
              for (let j = j0; j < j1; j++) { const q = to[j] * 3, w = share[j]; x += w * smooth[q]; y += w * smooth[q + 1]; z += w * smooth[q + 2]; }
              next[i] = smooth[i] + blend * (x - smooth[i]); next[i + 1] = smooth[i + 1] + blend * (y - smooth[i + 1]); next[i + 2] = smooth[i + 2] + blend * (z - smooth[i + 2]);
            }
            const swap = smooth; smooth = next; next = swap;
          }
          return left === 0;
        },
        part() {
          const restOf = new Float32Array(points * 3);
          let rough = 0;
          for (let i = 0; i < restOf.length; i += 3) { restOf[i] = moved[i] - smooth[i]; restOf[i + 1] = moved[i + 1] - smooth[i + 1]; restOf[i + 2] = moved[i + 2] - smooth[i + 2]; rough = Math.max(rough, Math.hypot(restOf[i], restOf[i + 1], restOf[i + 2])); }
          return { smooth, rest: restOf, most, rough };
        },
      };
    },
    pull(parts, out = new Float32Array(vertices.length * 3), across) {
      sumSmooth.fill(0); sumRest.fill(0);
      for (const { part, weight: w } of parts) {
        if (!w) continue;
        const S = part.smooth, R = part.rest;
        for (let i = 0; i < sumSmooth.length; i++) { sumSmooth[i] += w * S[i]; sumRest[i] += w * R[i]; }
      }
      const cap = PULLED_SLIP.most, A = PULLED_SLIP.across;
      if (across) wide.fill(0);
      for (let p = 0; p < points; p++) {
        const i = p * 3, x = sumRest[i], y = sumRest[i + 1], z = sumRest[i + 2];
        const nx = normal[i], ny = normal[i + 1], nz = normal[i + 2];
        // her slip as it is told: what is left of her movement, along her skin
        const off = x * nx + y * ny + z * nz, px = x - off * nx, py = y - off * ny, pz = z - off * nz, plain = Math.hypot(px, py, pz);
        pulled[i] = px; pulled[i + 1] = py; pulled[i + 2] = pz;
        const j0 = start[p], j1 = start[p + 1];
        if (j1 - j0 < 2 || (!(plain > 1e-9) && !across)) continue;
        // F, the smooth movement's stretch and turn of her skin here: the map that best takes each edge of the point's
        // ring to where the smooth movement leaves it, and her normal to itself (F e = e + (smooth q - smooth p), least
        // squares: F = B A^-1, A the sum of e eT and B the sum of (F e) eT)
        let a00 = 0, a01 = 0, a02 = 0, a11 = 0, a12 = 0, a22 = 0, b00 = 0, b01 = 0, b02 = 0, b10 = 0, b11 = 0, b12 = 0, b20 = 0, b21 = 0, b22 = 0, size = 0;
        for (let j = j0; j < j1; j++) {
          const q = to[j] * 3, ex = edge[j * 3], ey = edge[j * 3 + 1], ez = edge[j * 3 + 2];
          const fx = ex + sumSmooth[q] - sumSmooth[i], fy = ey + sumSmooth[q + 1] - sumSmooth[i + 1], fz = ez + sumSmooth[q + 2] - sumSmooth[i + 2];
          a00 += ex * ex; a01 += ex * ey; a02 += ex * ez; a11 += ey * ey; a12 += ey * ez; a22 += ez * ez; size += ex * ex + ey * ey + ez * ez;
          b00 += fx * ex; b01 += fx * ey; b02 += fx * ez; b10 += fy * ex; b11 += fy * ey; b12 += fy * ez; b20 += fz * ex; b21 += fz * ey; b22 += fz * ez;
        }
        const w = size / (j1 - j0);
        a00 += w * nx * nx; a01 += w * nx * ny; a02 += w * nx * nz; a11 += w * ny * ny; a12 += w * ny * nz; a22 += w * nz * nz;
        b00 += w * nx * nx; b01 += w * nx * ny; b02 += w * nx * nz; b10 += w * ny * nx; b11 += w * ny * ny; b12 += w * ny * nz; b20 += w * nz * nx; b21 += w * nz * ny; b22 += w * nz * nz;
        const det = a00 * (a11 * a22 - a12 * a12) - a01 * (a01 * a22 - a12 * a02) + a02 * (a01 * a12 - a11 * a02);
        if (!(Math.abs(det) > 1e-30)) continue;
        const i00 = (a11 * a22 - a12 * a12) / det, i01 = (a02 * a12 - a01 * a22) / det, i02 = (a01 * a12 - a02 * a11) / det, i11 = (a00 * a22 - a02 * a02) / det, i12 = (a01 * a02 - a00 * a12) / det, i22 = (a00 * a11 - a01 * a01) / det;
        const f00 = b00 * i00 + b01 * i01 + b02 * i02, f01 = b00 * i01 + b01 * i11 + b02 * i12, f02 = b00 * i02 + b01 * i12 + b02 * i22;
        const f10 = b10 * i00 + b11 * i01 + b12 * i02, f11 = b10 * i01 + b11 * i11 + b12 * i12, f12 = b10 * i02 + b11 * i12 + b12 * i22;
        const f20 = b20 * i00 + b21 * i01 + b22 * i02, f21 = b20 * i01 + b21 * i11 + b22 * i12, f22 = b20 * i02 + b21 * i12 + b22 * i22;
        const d = f00 * (f11 * f22 - f12 * f21) - f01 * (f10 * f22 - f12 * f20) + f02 * (f10 * f21 - f11 * f20);
        // (her skin folded flat or turned inside out here: no stretch to pull by)
        if (!(d > 1e-3)) continue;
        if (across) {
          // the level direction along her rest skin here (up crossed with her normal), and how long F leaves it
          const flat = Math.hypot(nx, nz), share = Math.min(1, Math.max(0, (flat - A.level[0]) / (A.level[1] - A.level[0])));
          if (share > 0) {
            const hx = nz / flat, hz = -nx / flat, long = Math.hypot(f00 * hx + f02 * hz, f10 * hx + f12 * hz, f20 * hx + f22 * hz);
            if (Number.isFinite(long)) wide[p] = (Math.min(A.most, Math.max(A.least, long)) - 1) * share * share * (3 - 2 * share);
          }
        }
        if (!(plain > 1e-9)) continue;
        const rx = ((f11 * f22 - f12 * f21) * x + (f02 * f21 - f01 * f22) * y + (f01 * f12 - f02 * f11) * z) / d;
        const ry = ((f12 * f20 - f10 * f22) * x + (f00 * f22 - f02 * f20) * y + (f02 * f10 - f00 * f12) * z) / d;
        const rz = ((f10 * f21 - f11 * f20) * x + (f01 * f20 - f00 * f21) * y + (f00 * f11 - f01 * f10) * z) / d;
        const o = rx * nx + ry * ny + rz * nz, qx = rx - o * nx, qy = ry - o * ny, qz = rz - o * nz, length = Math.hypot(qx, qy, qz);
        if (!Number.isFinite(length)) continue;
        const k = length > cap * plain ? (cap * plain) / length : 1;
        pulled[i] = qx * k; pulled[i + 1] = qy * k; pulled[i + 2] = qz * k;
      }
      for (let k = 0; k < vertices.length; k++) { const p = pointOf[vertices[k]] * 3; out[k * 3] = pulled[p]; out[k * 3 + 1] = pulled[p + 1]; out[k * 3 + 2] = pulled[p + 2]; }
      if (across) for (let k = 0; k < vertices.length; k++) across[k] = wide[pointOf[vertices[k]]];
      return out;
    },
  };
}

/**
 * GAME TUNING (the source's units): her pulled slip is laid again once her morphs' weights have moved IT by about this
 * somewhere (a fifth of a millimetre: no line is seen to move by less). What a morph's weight moves it by is told from
 * the morph's part: all of what is not smooth in it, and a tenth of how far it moves her at all (her slip as it
 * stands, pulled through a stretch that has changed).
 */
export const PULLED_STEP = 0.0002;
const reach = (part: SmoothPart): number => part.rough + 0.1 * part.most;

export interface PulledDriver {
  /**
   * Her pulled slip brought toward where she is now, working no longer than `budgetMs` (one round at the least): true
   * when it wrote -- into `target`, `stride` numbers a VERTEX of her whole body, its first three; and, when there is a
   * fourth, how much longer her skin is across her there (`PulledSlip.pull`'s `across`). Vertices outside the region
   * are left alone. `force` lays it again whatever has changed (after something else has written `target`).
   */
  update(target: Float32Array, stride: number, budgetMs: number, force?: boolean): boolean;
  /** Whether what is laid is behind what she is: a movement is still being smoothed, or one is waiting to be. */
  readonly pending: boolean;
  /** (a probe's) how many movements it has smoothed, how often it has pulled, and which morphs carry a part. */
  readonly stats: { solved: number; pulled: number; morphs: number[] };
}

/**
 * Her pulled slip kept up to date from a source (`skinSlip.SlipSource`): her shapes' part smoothed again when they
 * change (the one in hand is finished first: a slider dragged does not start it over for ever), each morph's the first
 * time it is on, and the pull whenever a part lands or the morphs' weights have moved her enough to see.
 */
export function pulledSlipDriver(solver: PulledSlip, source: () => SlipSource, now: () => number = () => performance.now()): PulledDriver {
  const n = solver.vertices.length, move = new Float32Array(n * 3), one = new Float32Array(3);
  let shapes: SmoothPart | null = null, shapesAt = NaN;
  const morphs = new Map<number, SmoothPart | null>();
  let job: { readonly run: SmoothJob; readonly morph: number; readonly version: number } | null = null;
  let applied: number[] = [], laid = false, waiting = false;
  const stats = { solved: 0, pulled: 0, morphs: [] as number[] };
  const out = new Float32Array(n * 3), wide = new Float32Array(n);
  return {
    stats,
    get pending() { return job !== null || waiting; },
    update(target, stride, budgetMs, force = false) {
      const s = source(), until = now() + Math.max(0, budgetMs);
      let changed = force || false;
      for (let first = true; first || now() < until; first = false) {
        if (!job) {
          if (s.shapedVersion !== shapesAt) {
            const push = s.pushed ?? null;
            for (let k = 0; k < n; k++) { const v = solver.vertices[k] * 3; move[k * 3] = s.shaped[v] - s.rest[v] + (push ? push[v] : 0); move[k * 3 + 1] = s.shaped[v + 1] - s.rest[v + 1] + (push ? push[v + 1] : 0); move[k * 3 + 2] = s.shaped[v + 2] - s.rest[v + 2] + (push ? push[v + 2] : 0); }
            job = { run: solver.begin(move), morph: -1, version: s.shapedVersion };
          } else {
            let m = -1;
            for (let k = 0; k < s.weights.length && m < 0; k++) if ((s.weights[k] || 0) !== 0 && !morphs.has(k)) m = k;
            if (m < 0) break;
            for (let k = 0; k < n; k++) { s.morph(m, solver.vertices[k], one); move[k * 3] = one[0]; move[k * 3 + 1] = one[1]; move[k * 3 + 2] = one[2]; }
            job = { run: solver.begin(move), morph: m, version: 0 };
          }
        }
        // (a few rounds between looks at the clock)
        if (!job.run.step(4)) continue;
        const part = job.run.part();
        stats.solved++;
        if (job.morph < 0) { shapes = part; shapesAt = job.version; }
        else { const keep = part.most > PULLED_SLIP.floor; morphs.set(job.morph, keep ? part : null); if (keep) stats.morphs.push(job.morph); }
        job = null; changed = true;
      }
      waiting = s.shapedVersion !== shapesAt;
      if (!waiting) for (let k = 0; k < s.weights.length && !waiting; k++) if ((s.weights[k] || 0) !== 0 && !morphs.has(k)) waiting = true;
      if (!shapes) return false;
      let drift = 0;
      for (const [m, part] of morphs) if (part) drift += Math.abs((s.weights[m] || 0) - (applied[m] ?? 0)) * reach(part);
      if (!changed && laid && drift < PULLED_STEP) return false;
      applied = Array.from(s.weights, (w) => w || 0);
      const parts: { part: SmoothPart; weight: number }[] = [{ part: shapes, weight: 1 }];
      for (const [m, part] of morphs) { const w = applied[m] ?? 0; if (part && w !== 0) parts.push({ part, weight: w }); }
      const four = stride >= 4;
      solver.pull(parts, out, four ? wide : undefined);
      stats.pulled++;
      for (let k = 0; k < n; k++) { const v = solver.vertices[k] * stride; target[v] = out[k * 3]; target[v + 1] = out[k * 3 + 1]; target[v + 2] = out[k * 3 + 2]; if (four) target[v + 3] = wide[k]; }
      laid = true;
      return true;
    },
  };
}
