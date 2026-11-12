/**
 * HER BIKINI BOTTOM AS CLOTH (Joshua, 2026-11-11: "MESHY model bottom with stretchy as a cloth sim, but not alter the
 * shape or design of it…"; "keeping a 3mm clearance from body mesh to bottom" -- 3 mm, he confirmed; "so it can stretch
 * when she sits like a spandex/elastic style bikini bottom").
 *
 * The bottom she wears is the modelled one in her body file -- MeshyAI's tie-side brief, as `fitMeshyBikini.mjs` fitted
 * it -- drawn exactly as modelled, every point of it, its knots and bows too, and moved by the room's cloth
 * (`clothSim.ts`, her skin under it from `clothSkin.ts`) as the cloth tee is. This file is the plain part (numbers in,
 * numbers out); `clothBrief.ts` runs it in the room.
 *
 *  - THE CLOTH (`briefClothProxy.ts`): the brief short of its knots and bows, both faces of its fabric, simplified to
 *    about a thousand of its own points. At rest the cloth IS the brief.
 *  - ITS PLACE ON HER: each cloth point is bound to the nearest point of her skin and how far off her the brief stands
 *    there, never less than CLEARANCE (both faces of the fabric lifted together where the inner one is closer, so it
 *    keeps its thickness). That is where it is held, and how far off her it keeps.
 *  - HOW IT IS HELD: its strings and the edges of its panels are held where the brief has them on her -- an elastic edge
 *    grips -- easing to a light hold across the middles of its panels (how far in from the brief's outline each point
 *    is: `bikiniBottomStencil.ts`), so the panels stretch over her and span what they cross as she moves.
 *  - THE BRIEF ON THE CLOTH: every point of the brief rides the nearest triangle of the cloth's outer face (its inner
 *    face's points too, the fabric's thickness under it: the two faces drawn from one never cross), at its own place
 *    (the point on the triangle, its height along the cloth's direction there, and what is left across it), so at rest it is exactly where it was modelled, and moved it keeps its own shape and its
 *    own shading. Its knots and bows ride their side's knot (one held cloth triangle a side) whole, as tied.
 *
 * Units are the caller's (her body-local units in the room); every length is given in metres and turned into them by
 * `unitsPerMetre`.
 */
import type { ClothBinding } from './clothTypes';

export const BRIEF_CLOTH = Object.freeze({
  /** GAME TUNING (Joshua's, 2026-11-11: "a 3mm clearance from body mesh to bottom"): the fabric's inner face never
   *  nearer her skin than this, metres. */
  clearance: 0.003,
  /** MEASURED (2026-11-11, her body file): past 17 cm either side of her middle the brief is its knots and bows
   *  (`scripts/briefCloth.mjs`, which cut the cloth there). */
  tieFrom: 0.17,
  /** GAME TUNING: a cloth point is held fully within `holdEdge` of the brief's outline (metres in along her skin),
   *  easing to `holdMiddle` by `holdFree` in -- elastic edges and strings grip, the panels' middles stretch. */
  holdEdge: 0.004, holdFree: 0.015, holdMiddle: 0.04,
  /** GAME TUNING: cloth points within this of where the knots begin are held fully (metres), so the knots and bows
   *  ride exactly the skin they are tied on. */
  holdKnot: 0.015,
  /** GAME TUNING: the two faces of the fabric are lifted together: each point by what the nearest-to-her point within
   *  this (metres) lacks of the clearance. More than the fabric is thick (about 2 mm, MEASURED on the brief). */
  liftReach: 0.004,
  /** GAME TUNING: a brief point rides a triangle of the cloth's outer face when one is within this (metres: more than
   *  the fabric is thick, so its inner face's points do too); else the nearest of any. */
  faceReach: 0.004,
});

export interface BriefClothInput {
  /** The brief as in her file: every vertex (three numbers each) and its triangles. */
  readonly brief: { readonly positions: ArrayLike<number>; readonly index: ArrayLike<number>; readonly normals?: ArrayLike<number> };
  /** The cloth's triangles, in the brief's vertex numbering (`briefClothTriangles`). */
  readonly cloth: ArrayLike<number>;
  /** Her skin at the same rest as the brief: her points, her triangles (all of them), her outward normals (for which
   *  way her triangles face). */
  readonly skin: { readonly positions: ArrayLike<number>; readonly index: ArrayLike<number>; readonly normals: ArrayLike<number> };
  readonly unitsPerMetre: number;
  /** Per vertex of hers: how far in from the brief's outline (metres, + inside); absent: every cloth point held fully. */
  readonly field?: ArrayLike<number> | null;
  /** Her middle, left to right (her units; default 0). */
  readonly middleX?: number;
  /** (a probe's) the hold across the panels' middles, in place of BRIEF_CLOTH.holdMiddle (1: held everywhere) */
  readonly holdMiddle?: number;
}

export interface BriefClothBake {
  /** The brief as drawn: its used vertices (`source` names each one's vertex in the file), triangles and rest. */
  readonly vertices: number;
  readonly source: Uint32Array;
  readonly index: Uint32Array;
  readonly rest: Float32Array;
  readonly restNormal: Float32Array;
  /** The cloth: its points (each a drawn vertex, `particleVertex`), triangles over them, and rest. */
  readonly particles: number;
  readonly particleVertex: Uint32Array;
  readonly triangles: Uint32Array;
  readonly particleRest: Float32Array;
  /** Each cloth point's place on her (her units: the offset along her outward face normal), and how firmly held. */
  readonly binding: ClothBinding;
  readonly pin: Float32Array;
  /** Each drawn vertex on the cloth: its triangle (a cloth triangle's number), the place on it (two weights; the
   *  third is the rest), and its place and direction across, along and off the cloth there (her units). */
  readonly wrapTri: Uint32Array;
  readonly wrapBary: Float32Array;
  readonly wrapLocal: Float32Array;
  readonly wrapNormal: Float32Array;
  /** 1 for a knot's or bow's vertex (riding its knot's triangle whole). */
  readonly tie: Uint8Array;
  /** For checking: cloth points lifted for the clearance and the most any was, the fewest and most held. */
  readonly lifted: number;
  readonly liftMost: number;
  readonly wrongFace: number;
}

/** Closest point of triangle abc to p (Ericson), as barycentric weights into `out`. */
function closestBary(px: number, py: number, pz: number, P: ArrayLike<number>, a: number, b: number, c: number, out: number[]): void {
  const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
  const abx = P[b * 3] - ax, aby = P[b * 3 + 1] - ay, abz = P[b * 3 + 2] - az, acx = P[c * 3] - ax, acy = P[c * 3 + 1] - ay, acz = P[c * 3 + 2] - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) { out[0] = 1; out[1] = 0; out[2] = 0; return; }
  const bpx = px - P[b * 3], bpy = py - P[b * 3 + 1], bpz = pz - P[b * 3 + 2];
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) { out[0] = 0; out[1] = 1; out[2] = 0; return; }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); out[0] = 1 - v; out[1] = v; out[2] = 0; return; }
  const cpx = px - P[c * 3], cpy = py - P[c * 3 + 1], cpz = pz - P[c * 3 + 2];
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) { out[0] = 0; out[1] = 0; out[2] = 1; return; }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); out[0] = 1 - w; out[1] = 0; out[2] = w; return; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); out[0] = 0; out[1] = 1 - w; out[2] = w; return; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  out[0] = 1 - v - w; out[1] = v; out[2] = w;
}

/** A grid of triangles by the cells their bounds touch (cell in the points' units). */
function triangleGrid(P: ArrayLike<number>, tris: ArrayLike<number>, cell: number, keep?: (t: number) => boolean): Map<string, number[]> {
  const grid = new Map<string, number[]>();
  for (let t = 0; t < tris.length / 3; t++) {
    if (keep && !keep(t)) continue;
    const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, c = tris[t * 3 + 2] * 3;
    const lo = [0, 1, 2].map((k) => Math.floor(Math.min(P[a + k], P[b + k], P[c + k]) / cell)), hi = [0, 1, 2].map((k) => Math.floor(Math.max(P[a + k], P[b + k], P[c + k]) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const k = `${x},${y},${z}`; const l = grid.get(k); if (l) l.push(t); else grid.set(k, [t]);
    }
  }
  return grid;
}

/** Each point's direction over a mesh: its triangles' cross products summed (by area) and made unit length. */
export function clothNormals(P: ArrayLike<number>, tris: ArrayLike<number>, count: number, out: Float32Array): Float32Array {
  out.fill(0, 0, count * 3);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    out[a] += x; out[a + 1] += y; out[a + 2] += z; out[b] += x; out[b + 1] += y; out[b + 2] += z; out[c] += x; out[c + 1] += y; out[c + 2] += z;
  }
  for (let i = 0; i < count * 3; i += 3) { const l = Math.hypot(out[i], out[i + 1], out[i + 2]); if (l > 1e-12) { out[i] /= l; out[i + 1] /= l; out[i + 2] /= l; } else { out[i] = 0; out[i + 1] = 0; out[i + 2] = 1; } }
  return out;
}

/** A cloth triangle's frame at a place on it: the point, and across (e1), along (e2) and off (n) the cloth there. */
const F = new Float64Array(12);
function frameAt(P: ArrayLike<number>, N: ArrayLike<number>, a: number, b: number, c: number, u: number, v: number): Float64Array {
  const w = 1 - u - v, A = a * 3, B = b * 3, C = c * 3;
  for (let k = 0; k < 3; k++) { F[k] = u * P[A + k] + v * P[B + k] + w * P[C + k]; F[9 + k] = u * N[A + k] + v * N[B + k] + w * N[C + k]; }
  let l = Math.hypot(F[9], F[10], F[11]) || 1; F[9] /= l; F[10] /= l; F[11] /= l;
  // across: the triangle's first edge laid square to n (its second, should the first lie along n)
  let ex = P[B] - P[A], ey = P[B + 1] - P[A + 1], ez = P[B + 2] - P[A + 2];
  let d = ex * F[9] + ey * F[10] + ez * F[11]; ex -= d * F[9]; ey -= d * F[10]; ez -= d * F[11];
  l = Math.hypot(ex, ey, ez);
  if (!(l > 1e-9)) { ex = P[C] - P[A]; ey = P[C + 1] - P[A + 1]; ez = P[C + 2] - P[A + 2]; d = ex * F[9] + ey * F[10] + ez * F[11]; ex -= d * F[9]; ey -= d * F[10]; ez -= d * F[11]; l = Math.hypot(ex, ey, ez) || 1; }
  F[3] = ex / l; F[4] = ey / l; F[5] = ez / l;
  F[6] = F[10] * F[5] - F[11] * F[4]; F[7] = F[11] * F[3] - F[9] * F[5]; F[8] = F[9] * F[4] - F[10] * F[3];
  return F;
}

/** Bind the brief's cloth to her and lay the brief on the cloth (see the file's head). */
export function bakeBriefCloth(input: BriefClothInput): BriefClothBake {
  const U = input.unitsPerMetre, BP = input.brief.positions, BI = input.brief.index, mid = input.middleX ?? 0;
  const S = input.skin.positions, SI = input.skin.index, SN = input.skin.normals;
  const tieFrom = BRIEF_CLOTH.tieFrom * U, isTie = (x: number) => Math.abs(x - mid) > tieFrom;

  // THE BRIEF AS DRAWN: its used vertices, renumbered
  const nB = Math.floor(BP.length / 3), renum = new Int32Array(nB).fill(-1), src: number[] = [];
  for (let i = 0; i < BI.length; i++) { const v = BI[i]; if (renum[v] < 0) { renum[v] = src.length; src.push(v); } }
  const V = src.length, source = Uint32Array.from(src), index = Uint32Array.from(BI, (v) => renum[v]);
  const rest = new Float32Array(V * 3);
  for (let i = 0; i < V; i++) for (let k = 0; k < 3; k++) rest[i * 3 + k] = BP[src[i] * 3 + k];
  let restNormal = new Float32Array(V * 3);
  const given = input.brief.normals;
  if (given && given.length >= nB * 3) {
    for (let i = 0; i < V; i++) { const s = src[i] * 3, l = Math.hypot(given[s], given[s + 1], given[s + 2]) || 1; for (let k = 0; k < 3; k++) restNormal[i * 3 + k] = given[s + k] / l; }
  } else restNormal = clothNormals(rest, index, V, restNormal);

  // THE CLOTH: its points (drawn vertices) and triangles over them
  const pOf = new Int32Array(V).fill(-1), pv: number[] = [];
  const triangles = new Uint32Array(input.cloth.length);
  for (let i = 0; i < input.cloth.length; i++) {
    const v = renum[input.cloth[i]];
    if (v < 0) throw new RangeError(`bakeBriefCloth: cloth corner ${input.cloth[i]} is not a vertex the brief draws`);
    if (pOf[v] < 0) { pOf[v] = pv.length; pv.push(v); }
    triangles[i] = pOf[v];
  }
  const N = pv.length, particleVertex = Uint32Array.from(pv), particleRest = new Float32Array(N * 3);
  for (let p = 0; p < N; p++) for (let k = 0; k < 3; k++) particleRest[p * 3 + k] = rest[pv[p] * 3 + k];

  // ITS PLACE ON HER: her nearest skin to each cloth point, among her triangles near the brief
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < V * 3; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], rest[i + k]); hi[k] = Math.max(hi[k], rest[i + k]); }
  const margin = 0.05 * U; lo = lo.map((x) => x - margin); hi = hi.map((x) => x + margin);
  const near = (t: number) => { for (const c of [0, 1, 2]) { const v = SI[t * 3 + c] * 3; if (S[v] < lo[0] || S[v] > hi[0] || S[v + 1] < lo[1] || S[v + 1] > hi[1] || S[v + 2] < lo[2] || S[v + 2] > hi[2]) return false; } return true; };
  const cell = 0.01 * U, skinGrid = triangleGrid(S, SI, cell, near);
  // which way her triangles face: their winding against her own normals, voted over those near the brief
  let vote = 0;
  for (const l of skinGrid.values()) for (const t of l) {
    const a = SI[t * 3] * 3, b = SI[t * 3 + 1] * 3, c = SI[t * 3 + 2] * 3;
    const ux = S[b] - S[a], uy = S[b + 1] - S[a + 1], uz = S[b + 2] - S[a + 2], vx = S[c] - S[a], vy = S[c + 1] - S[a + 1], vz = S[c + 2] - S[a + 2];
    vote += (uy * vz - uz * vy) * (SN[a] + SN[b] + SN[c]) + (uz * vx - ux * vz) * (SN[a + 1] + SN[b + 1] + SN[c + 1]) + (ux * vy - uy * vx) * (SN[a + 2] + SN[b + 2] + SN[c + 2]);
  }
  const sign = vote < 0 ? -1 : 1, bc = [0, 0, 0];
  const tri = new Uint32Array(N * 3), bary = new Float32Array(N * 3), offset = new Float32Array(N), field = input.field ?? null, inside = new Float32Array(N).fill(-1), skinN = new Float32Array(N * 3);
  for (let p = 0; p < N; p++) {
    const px = particleRest[p * 3], py = particleRest[p * 3 + 1], pz = particleRest[p * 3 + 2];
    let best = -1, bd = Infinity, bb = [1, 0, 0];
    const cx = Math.floor(px / cell), cy = Math.floor(py / cell), cz = Math.floor(pz / cell);
    for (let r = 0; r <= 5 && !(best >= 0 && Math.sqrt(bd) <= (r - 1) * cell); r++) {
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
        if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
        for (const t of skinGrid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
          const a = SI[t * 3], b = SI[t * 3 + 1], c = SI[t * 3 + 2];
          closestBary(px, py, pz, S, a, b, c, bc);
          const qx = bc[0] * S[a * 3] + bc[1] * S[b * 3] + bc[2] * S[c * 3], qy = bc[0] * S[a * 3 + 1] + bc[1] * S[b * 3 + 1] + bc[2] * S[c * 3 + 1], qz = bc[0] * S[a * 3 + 2] + bc[1] * S[b * 3 + 2] + bc[2] * S[c * 3 + 2];
          const d = (px - qx) ** 2 + (py - qy) ** 2 + (pz - qz) ** 2;
          if (d < bd) { bd = d; best = t; bb = bc.slice(); }
        }
      }
    }
    if (best < 0) throw new Error(`bakeBriefCloth: no skin of hers within reach of cloth point ${p}`);
    const a = SI[best * 3], b = SI[best * 3 + 1], c = SI[best * 3 + 2];
    tri[p * 3] = a; tri[p * 3 + 1] = b; tri[p * 3 + 2] = c; bary[p * 3] = bb[0]; bary[p * 3 + 1] = bb[1]; bary[p * 3 + 2] = bb[2];
    const ux = S[b * 3] - S[a * 3], uy = S[b * 3 + 1] - S[a * 3 + 1], uz = S[b * 3 + 2] - S[a * 3 + 2], vx = S[c * 3] - S[a * 3], vy = S[c * 3 + 1] - S[a * 3 + 1], vz = S[c * 3 + 2] - S[a * 3 + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = (Math.hypot(nx, ny, nz) || 1) * sign; nx /= l; ny /= l; nz /= l;
    const qx = bb[0] * S[a * 3] + bb[1] * S[b * 3] + bb[2] * S[c * 3], qy = bb[0] * S[a * 3 + 1] + bb[1] * S[b * 3 + 1] + bb[2] * S[c * 3 + 1], qz = bb[0] * S[a * 3 + 2] + bb[1] * S[b * 3 + 2] + bb[2] * S[c * 3 + 2];
    offset[p] = (px - qx) * nx + (py - qy) * ny + (pz - qz) * nz;
    skinN[p * 3] = nx; skinN[p * 3 + 1] = ny; skinN[p * 3 + 2] = nz;
    if (field) inside[p] = bb[0] * field[a] + bb[1] * field[b] + bb[2] * field[c];
  }
  // THE CLEARANCE, both faces of the fabric together: each point lifted by what the point nearest her within liftReach lacks
  const C = BRIEF_CLOTH.clearance * U, reach = BRIEF_CLOTH.liftReach * U, pg = new Map<string, number[]>();
  for (let p = 0; p < N; p++) { const k = `${Math.floor(particleRest[p * 3] / reach)},${Math.floor(particleRest[p * 3 + 1] / reach)},${Math.floor(particleRest[p * 3 + 2] / reach)}`; const l = pg.get(k); if (l) l.push(p); else pg.set(k, [p]); }
  const lift = new Float32Array(N); let lifted = 0, liftMost = 0;
  for (let p = 0; p < N; p++) {
    let least = offset[p];
    const cx = Math.floor(particleRest[p * 3] / reach), cy = Math.floor(particleRest[p * 3 + 1] / reach), cz = Math.floor(particleRest[p * 3 + 2] / reach);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (const q of pg.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
      if (Math.hypot(particleRest[q * 3] - particleRest[p * 3], particleRest[q * 3 + 1] - particleRest[p * 3 + 1], particleRest[q * 3 + 2] - particleRest[p * 3 + 2]) <= reach) least = Math.min(least, offset[q]);
    }
    lift[p] = Math.max(0, C - least);
  }
  for (let p = 0; p < N; p++) { offset[p] = Math.max(offset[p] + lift[p], C); if (lift[p] > 0) { lifted++; liftMost = Math.max(liftMost, lift[p]); } }

  // HOW IT IS HELD
  const pin = new Float32Array(N), e0 = BRIEF_CLOTH.holdEdge, e1 = BRIEF_CLOTH.holdFree, knot = tieFrom - BRIEF_CLOTH.holdKnot * U;
  for (let p = 0; p < N; p++) {
    let h = 1;
    if (field) { const t = Math.min(1, Math.max(0, (inside[p] - e0) / (e1 - e0))), s = t * t * (3 - 2 * t); h = 1 - s * (1 - (input.holdMiddle ?? BRIEF_CLOTH.holdMiddle)); }
    if (Math.abs(particleRest[p * 3] - mid) > knot) h = 1;
    pin[p] = h;
  }

  // THE BRIEF ON THE CLOTH
  const cn = clothNormals(particleRest, triangles, N, new Float32Array(N * 3)), T = triangles.length / 3;
  const faceN = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) {
    const a = triangles[t * 3] * 3, b = triangles[t * 3 + 1] * 3, c = triangles[t * 3 + 2] * 3, R = particleRest;
    const ux = R[b] - R[a], uy = R[b + 1] - R[a + 1], uz = R[b + 2] - R[a + 2], vx = R[c] - R[a], vy = R[c + 1] - R[a + 1], vz = R[c + 2] - R[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, l = Math.hypot(x, y, z) || 1;
    faceN[t * 3] = x / l; faceN[t * 3 + 1] = y / l; faceN[t * 3 + 2] = z / l;
  }
  // its OUTER face: a cloth triangle facing away from her (her own direction under its corners)
  const outer = new Uint8Array(T);
  for (let t = 0; t < T; t++) {
    let d = 0; for (let c = 0; c < 3; c++) { const q = triangles[t * 3 + c] * 3; d += faceN[t * 3] * skinN[q] + faceN[t * 3 + 1] * skinN[q + 1] + faceN[t * 3 + 2] * skinN[q + 2]; }
    outer[t] = d > 0 ? 1 : 0;
  }
  const wcell = 0.006 * U, clothGrid = triangleGrid(particleRest, triangles, wcell);
  // each side's knot: of the cloth triangles held fully on that side, the one nearest its knots' and bows' middle
  const tieMid = [[0, 0, 0, 0], [0, 0, 0, 0]];
  for (let i = 0; i < V; i++) if (isTie(rest[i * 3])) { const s = rest[i * 3] > mid ? 1 : 0; for (let k = 0; k < 3; k++) tieMid[s][k] += rest[i * 3 + k]; tieMid[s][3]++; }
  const knotTri = [-1, -1];
  for (const s of [0, 1]) {
    if (!tieMid[s][3]) continue;
    const m = tieMid[s].slice(0, 3).map((x) => x / tieMid[s][3]);
    let bd = Infinity;
    for (let t = 0; t < T; t++) {
      const a = triangles[t * 3], b = triangles[t * 3 + 1], c = triangles[t * 3 + 2];
      if (pin[a] < 1 || pin[b] < 1 || pin[c] < 1) continue;
      const x = (particleRest[a * 3] + particleRest[b * 3] + particleRest[c * 3]) / 3;
      if ((x > mid ? 1 : 0) !== s) continue;
      const d = (x - m[0]) ** 2 + ((particleRest[a * 3 + 1] + particleRest[b * 3 + 1] + particleRest[c * 3 + 1]) / 3 - m[1]) ** 2 + ((particleRest[a * 3 + 2] + particleRest[b * 3 + 2] + particleRest[c * 3 + 2]) / 3 - m[2]) ** 2;
      if (d < bd) { bd = d; knotTri[s] = t; }
    }
  }
  const wrapTri = new Uint32Array(V), wrapBary = new Float32Array(V * 2), wrapLocal = new Float32Array(V * 3), wrapNormal = new Float32Array(V * 3), tie = new Uint8Array(V);
  let wrongFace = 0;
  for (let i = 0; i < V; i++) {
    const px = rest[i * 3], py = rest[i * 3 + 1], pz = rest[i * 3 + 2];
    let t = -1, u = 1 / 3, v = 1 / 3;
    if (isTie(px) && knotTri[px > mid ? 1 : 0] >= 0) { t = knotTri[px > mid ? 1 : 0]; tie[i] = 1; }
    else {
      // nearest on the cloth's outer face within reach, else nearest of any
      let bSame = Infinity, tSame = -1, uS = 0, vS = 0, bAny = Infinity, tAny = -1, uA = 0, vA = 0;
      const cx = Math.floor(px / wcell), cy = Math.floor(py / wcell), cz = Math.floor(pz / wcell);
      for (let r = 0; r <= 4 && !(tSame >= 0 && Math.sqrt(bSame) <= (r - 1) * wcell); r++) {
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) {
          if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== r) continue;
          for (const q of clothGrid.get(`${cx + a},${cy + b},${cz + c}`) ?? []) {
            closestBary(px, py, pz, particleRest, triangles[q * 3], triangles[q * 3 + 1], triangles[q * 3 + 2], bc);
            let d = 0;
            for (let k = 0; k < 3; k++) { const x = bc[0] * particleRest[triangles[q * 3] * 3 + k] + bc[1] * particleRest[triangles[q * 3 + 1] * 3 + k] + bc[2] * particleRest[triangles[q * 3 + 2] * 3 + k]; d += ((k === 0 ? px : k === 1 ? py : pz) - x) ** 2; }
            // every point of the brief rides the cloth's outer face -- its inner face's too, the fabric's thickness under it
            // -- so the two faces are drawn from one and never cross (they did where her birth shaping opens her: RECLINE,
            // 2026-11-11)
            const same = outer[q] === 1;
            if (d < bAny) { bAny = d; tAny = q; uA = bc[0]; vA = bc[1]; }
            if (same && d < bSame) { bSame = d; tSame = q; uS = bc[0]; vS = bc[1]; }
          }
        }
      }
      if (tSame >= 0 && Math.sqrt(bSame) <= BRIEF_CLOTH.faceReach * U) { t = tSame; u = uS; v = vS; }
      else { t = tAny; u = uA; v = vA; if (tSame !== tAny) wrongFace++; }
      if (t < 0) { t = knotTri[px > mid ? 1 : 0] >= 0 ? knotTri[px > mid ? 1 : 0] : 0; u = v = 1 / 3; }
    }
    const f = frameAt(particleRest, cn, triangles[t * 3], triangles[t * 3 + 1], triangles[t * 3 + 2], u, v);
    const dx = px - f[0], dy = py - f[1], dz = pz - f[2];
    wrapTri[i] = t; wrapBary[i * 2] = u; wrapBary[i * 2 + 1] = v;
    wrapLocal[i * 3] = dx * f[3] + dy * f[4] + dz * f[5]; wrapLocal[i * 3 + 1] = dx * f[6] + dy * f[7] + dz * f[8]; wrapLocal[i * 3 + 2] = dx * f[9] + dy * f[10] + dz * f[11];
    const nx = restNormal[i * 3], ny = restNormal[i * 3 + 1], nz = restNormal[i * 3 + 2];
    wrapNormal[i * 3] = nx * f[3] + ny * f[4] + nz * f[5]; wrapNormal[i * 3 + 1] = nx * f[6] + ny * f[7] + nz * f[8]; wrapNormal[i * 3 + 2] = nx * f[9] + ny * f[10] + nz * f[11];
  }

  return {
    vertices: V, source, index, rest, restNormal,
    particles: N, particleVertex, triangles, particleRest,
    binding: { count: N, tri, bary, offset }, pin,
    wrapTri, wrapBary, wrapLocal, wrapNormal, tie, lifted, liftMost, wrongFace,
  };
}

/**
 * The brief laid on the cloth: `cloth` its points where they are now and `clothNormal` their directions (`clothNormals`
 * over the cloth's triangles), in any frame; `scale` how many of those units one of the bake's is (the room's world per
 * her body-local unit). Positions and directions of every drawn vertex into `pos` and `nrm`.
 */
export function layBrief(bake: BriefClothBake, cloth: ArrayLike<number>, clothNormal: ArrayLike<number>, scale: number, pos: Float32Array, nrm: Float32Array): void {
  const { wrapTri: WT, wrapBary: WB, wrapLocal: WL, wrapNormal: WN, triangles: TR } = bake;
  for (let i = 0; i < bake.vertices; i++) {
    const t = WT[i] * 3, f = frameAt(cloth, clothNormal, TR[t], TR[t + 1], TR[t + 2], WB[i * 2], WB[i * 2 + 1]), i3 = i * 3;
    const a = WL[i3] * scale, b = WL[i3 + 1] * scale, c = WL[i3 + 2] * scale;
    pos[i3] = f[0] + a * f[3] + b * f[6] + c * f[9];
    pos[i3 + 1] = f[1] + a * f[4] + b * f[7] + c * f[10];
    pos[i3 + 2] = f[2] + a * f[5] + b * f[8] + c * f[11];
    const x = WN[i3], y = WN[i3 + 1], z = WN[i3 + 2];
    nrm[i3] = x * f[3] + y * f[6] + z * f[9]; nrm[i3 + 1] = x * f[4] + y * f[7] + z * f[10]; nrm[i3 + 2] = x * f[5] + y * f[8] + z * f[11];
  }
}
