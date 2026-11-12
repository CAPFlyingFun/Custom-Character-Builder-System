/**
 * THE BIKINI BOTTOM'S OUTLINE, TRACED ONTO HER SKIN (Joshua, 2026-11-11: her bottom rebuilt by "duplicating the
 * body's skin... with an offset like 5mm, and we just match the same outline/shape").
 *
 * A shell copied from her own skin and raised off it fits her the way her skin does, at every belly size and in every
 * pose, so the one thing the old garment still has to give is its OUTLINE. That outline is the tie-side brief Joshua
 * had MeshyAI make (2026-10-14), as `scripts/fitMeshyBikini.mjs` fitted it onto this body through
 * `scripts/sarahV2Bikini.mjs` (`PLACE_V2`): wrapped about 3 mm off her skin and kept in her body file as its first
 * `bikini` primitive. Nothing here changes that file. What this writes is, for every vertex of her body, how far it
 * stands inside (+) or outside (-) that outline, measured over her skin, as `src/sarahlab/bikiniBottomStencil.ts`,
 * stored the way `src/sarahlab/leotardStencil.ts` stores Joshua's traced leotard line. The shell is cut where it
 * crosses zero.
 *
 *   1. HER NORMALS. Her mesh is split along its texture seams (one copy of a vertex for each side), so one copy's own
 *      triangles see only part of the skin round it. A normal here is the sum of the triangles' normals all round the
 *      POINT, every copy's together, so the copies look the same way and ask the same question in step 2.
 *   2. WHAT THE BRIEF COVERS. From a few millimetres inside her skin (so fabric lying on her or a little into her is
 *      still found) a ray goes out along her normal, and the first piece of the brief it meets decides: its fabric
 *      covers her there; a side tie does not (its bow and strings lie on her hip beside the fabric, and the shell
 *      takes the fabric's shape, not the ties'), and nor does meeting nothing. Ties are told from fabric where the
 *      fitter itself split them: past `TIE_X` either side of her middle. Only skin near the brief is asked (`BAND`).
 *   3. HER SKIN AS A GRAPH. The copies of a vertex are one point; her triangles' edges join the points, each edge as
 *      long as it is on her at rest.
 *   4. HOW FAR FROM THE OUTLINE. The outline crosses every edge whose two ends disagree, halfway along it. From there
 *      the distance is walked over her skin (Dijkstra), each side keeping to its own side, so it is the way round her
 *      body (the crotch, the creases of her thighs), never straight through it. Inside reads +, outside -, out to
 *      `FAR_M`; skin beyond that is either deep inside (+FAR_M) or bare and not stored.
 *   5. A SMOOTH EDGE. Each vertex is simply in or out, so the line those give steps from edge to edge of her mesh. A
 *      few rounds of averaging near the line (each point half its own value, half its neighbours' mean) turn the steps
 *      into a line that runs smoothly between the vertices. What is only a vertex or so wide goes with the steps: on
 *      this body (2026-11-11) the narrow strings that join the brief's panels to its ties, and stray hits beside a
 *      tie. The holes the folds of her vulva leave (rays from inside a fold meet nothing) are filled, and the floor of
 *      the cleft of her seat is left as a few specks apart from the rest. The run's report says how far the field
 *      reaches and in how many pieces.
 *   6. STORED per vertex of her body in index order, each copy of a point taking the point's value: a gap and a byte,
 *      as in `leotardStencil.ts` (the generated module says exactly how). A value nearer zero than half a step is
 *      stored one step out on its own side, so the sign of every stored value still tells inside from outside.
 *
 * Every number below is labelled MEASURED (read off her body file or the fitted brief), BIOLOGICAL SHAPE, or GAME
 * TUNING (chosen, and changeable).
 *
 *   node scripts/traceBikiniBottom.mjs [body.glb] [out.ts]
 *     (from the repo root; defaults assets-archive/models/sarah-v2-body.glb and src/sarahlab/bikiniBottomStencil.ts)
 */
import { writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

export const BODY_GLB = 'assets-archive/models/sarah-v2-body.glb';
export const OUT_TS = 'src/sarahlab/bikiniBottomStencil.ts';

/**
 * GAME TUNING: two vertices within this of each other (per axis, on a grid) are one point of her skin, the rule
 * `vertexNeighbours` in bodyPaint.ts uses. MEASURED on her body: the seam copies stand at exactly the same place
 * (115710 vertices, 104296 points either way) and the nearest two different points are 0.11 mm apart.
 */
export const WELD_M = 1e-5;
/**
 * GAME TUNING round a MEASURED extent: the fitted brief spans y 0.81-0.94 m and |x| up to 0.20 m on her (at rest,
 * metres, +y up). Only her skin in this box is asked whether it is covered: the brief's whole reach with room to
 * spare, and the outline's `FAR_M` fringe stays inside it.
 */
export const BAND = Object.freeze({ y0: 0.74, y1: 1.06, x: 0.3 });
/**
 * GAME TUNING between MEASURED heights: a triangle of the bikini primitive with a vertex above this belongs to the
 * halter, not the brief (whose top is at 0.94 m). On this file none does (the halter's old vertices, up to 1.50 m,
 * are left unused in this primitive since `sarahV2BikiniFinish.mjs` rebuilt its straps); the rule keeps them out
 * should a refit use them.
 */
export const HALTER_ABOVE_Y = 1.05;
/**
 * MEASURED: where the fitter split the brief's fabric from its side ties, `TIE_FROM` (0.44 in the scan's frame) at
 * the brief's scale in `PLACE_V2` (0.43): 0.189 m either side of her middle. A brief triangle whose centre is
 * further out is a tie (bow or string).
 */
export const TIE_X = 0.189;
/**
 * GAME TUNING: a ray starts this far inside her skin, so fabric lying on her or a little into her is still met (on
 * this body none is: MEASURED, the nearest fabric any ray met was 1.1 mm off her).
 */
export const RAY_INSIDE_M = 0.004;
/**
 * GAME TUNING: and runs this far along her normal, 4 cm out of her skin: well past the fabric (3 mm off her,
 * `GAP_M`) and the tie bows laid on her hip (at most 11 mm off, `TIE_REACH_M`), and far enough that skin deep in her
 * folds (the cleft of her seat, the crotch), which the fabric bridges, still meets it (MEASURED: up to 40 mm there).
 */
export const RAY_M = 0.044;
/**
 * GAME TUNING (search speed only; the answer does not depend on them): the brief's triangles are filed by cell, and a
 * ray looks in the cell under it every `MARCH_M`.
 */
export const CELL_M = 0.01, MARCH_M = 0.005;
/**
 * GAME TUNING: how far either side of the outline the distance is kept, metres. Beyond it, covered skin reads +FAR_M
 * and bare skin is not stored (reads -FAR_M).
 */
export const FAR_M = 0.03;
/**
 * GAME TUNING: the edge's smoothing: rounds, how near the line a point must be (metres) to be smoothed, and how much
 * of its neighbours' mean it takes per round.
 */
export const SMOOTH = Object.freeze({ rounds: 6, within: 0.015, blend: 0.5 });
/**
 * Step 5b, THE CLEFT OF HER SEAT: the brief spans it, but the rays from its walls meet nothing (they look across at the
 * other wall), so its walls read bare between her cheeks' fabric and its floor's specks. Across it, at every height, the
 * skin between the fabric either side is the fabric's. GAME TUNING round MEASURED: how far either side of her middle
 * (`x`, metres) and how high a slice (`dy`) is looked across at once.
 */
export const CLEFT = Object.freeze({ x: 0.035, dy: 0.003 });
/**
 * Step 5c, WHERE THE PANELS BECOME STRINGS: the narrow bands that join each panel to its tie are about one of her
 * vertices wide, and her skin over her hips is coarse there (her triangles' edges 6 mm, a tenth of them 15 mm or more:
 * MEASURED), too coarse for a band a centimetre wide to be cut from it -- cut, it came out in broken pieces (2026-11-11).
 * So the strings are the modelled brief's own, drawn from her body file past `only` either side of her middle
 * (SarahLabScene `cutBriefToStrings`, the same number), and here past `only` her skin is bare. Short of it, each
 * panel's corner is drawn out toward its string: the string found as a line -- the middle of what the rays met past
 * `from`, front and back apart, 4 mm at a time (`bin`), smoothed -- and a band `half` either side of it taken in, so the
 * corner narrows into the string instead of ending ragged. GAME TUNING (metres).
 */
export const STRINGS = Object.freeze({ from: 0.1, bin: 0.004, past: 0.015, half: 0.006, smooth: 3, only: 0.125 });
/**
 * Step 5d, HOLES: bare skin the fabric closes round on every side (her navel would be one, were it under it; here the
 * last of her cleft's floor and her lips' folds) is the fabric's. A bare piece is a hole when none of it reaches skin
 * far outside the outline (unstored), and it is smaller than `most` points. GAME TUNING.
 */
export const HOLES = Object.freeze({ most: 2000 });
/** GAME TUNING: stored in half-millimetre steps, at most `MAX_Q` of them either way (60 x 0.5 mm = `FAR_M`), as byte `ZERO_BYTE + q`. */
export const STEP_M = 0.0005, MAX_Q = 60, ZERO_BYTE = 128;
/** GAME TUNING (layout only): base64 characters per line of the generated module, as in leotardStencil.ts. */
export const LINE_CHARS = 110;

// ── small helpers (as in fitMeshyBikini.mjs) ──
const mul = (x, y) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) for (let k = 0; k < 4; k += 1) o[c * 4 + r] += x[k * 4 + r] * y[c * 4 + k]; return o; };
const apply = (m, v, w) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + w * m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + w * m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + w * m[14]];
const readAttr = (A) => { const n = A.getCount(), s = A.getElementSize(), out = new Float32Array(n * s), v = []; for (let i = 0; i < n; i += 1) { A.getElement(i, v); for (let c = 0; c < s; c += 1) out[i * s + c] = v[c]; } return out; };
const percentile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/**
 * Her body and the fitted brief in rest metres (+y up, +z her front, +x her left): the file's units carried by her
 * skeleton's root (its world matrix times its inverse bind matrix, scale 0.89975 on this body).
 */
async function load(file) {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(file);
  const skin = doc.getRoot().listSkins()[0];
  const T = mul(skin.listJoints()[0].getWorldMatrix(), Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16)));
  const [body, brief] = doc.getRoot().listMeshes()[0].listPrimitives();
  if (body?.getMaterial()?.getName() !== 'Material_0' || brief?.getMaterial()?.getName() !== 'bikini') {
    throw new Error(`${file}: expected her body ('Material_0') then the fitted brief ('bikini') as the first two primitives`);
  }
  const metres = (prim) => {
    const raw = readAttr(prim.getAttribute('POSITION')), out = new Float64Array(raw.length);
    for (let i = 0; i < raw.length; i += 3) out.set(apply(T, [raw[i], raw[i + 1], raw[i + 2]], 1), i);
    return out;
  };
  return {
    scale: Math.hypot(T[0], T[1], T[2]),
    body: { pos: metres(body), idx: body.getIndices().getArray() },
    brief: { pos: metres(brief), idx: brief.getIndices().getArray() },
  };
}

/** Step 3's points: the copies of a vertex split along a texture seam are one point (`WELD_M`). */
function weld(pos) {
  const n = pos.length / 3, pointOf = new Int32Array(n), byKey = new Map(), first = [];
  for (let v = 0; v < n; v += 1) {
    const key = `${Math.round(pos[v * 3] / WELD_M)},${Math.round(pos[v * 3 + 1] / WELD_M)},${Math.round(pos[v * 3 + 2] / WELD_M)}`;
    let p = byKey.get(key);
    if (p === undefined) { p = first.length; byKey.set(key, p); first.push(v); }
    pointOf[v] = p;
  }
  const at = new Float64Array(first.length * 3);
  first.forEach((v, p) => { at[p * 3] = pos[v * 3]; at[p * 3 + 1] = pos[v * 3 + 1]; at[p * 3 + 2] = pos[v * 3 + 2]; });
  return { pointOf, at, count: first.length };
}

/** Step 1: each point's normal, the sum of its triangles' (area-weighted) normals all round it, every copy's together. */
function pointNormals(at, count, tris) {
  const nrm = new Float64Array(count * 3);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
    const ux = at[b] - at[a], uy = at[b + 1] - at[a + 1], uz = at[b + 2] - at[a + 2];
    const vx = at[c] - at[a], vy = at[c + 1] - at[a + 1], vz = at[c + 2] - at[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { nrm[k] += nx; nrm[k + 1] += ny; nrm[k + 2] += nz; }
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
    nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
  }
  return nrm;
}

/** A cell's key: 1024 cells a side round the origin, 10 m at 1 cm, far more than her. */
const cellKey = (x, y, z) => ((Math.floor(x / CELL_M) + 512) * 1024 + (Math.floor(y / CELL_M) + 512)) * 1024 + (Math.floor(z / CELL_M) + 512);

/**
 * The brief's triangles (the halter's left out), each marked fabric or tie, filed by cell. Each is filed under every
 * cell its box reaches, the box grown by half a march step: any point a ray meets it at is then within half a step of
 * a place the ray looks, so the search finds every hit a test of all the triangles would.
 */
function briefTriangles(pos, idx) {
  const kept = [];
  let halter = 0;
  for (let t = 0; t < idx.length; t += 3) {
    if (Math.max(pos[idx[t] * 3 + 1], pos[idx[t + 1] * 3 + 1], pos[idx[t + 2] * 3 + 1]) > HALTER_ABOVE_Y) { halter += 1; continue; }
    kept.push(t);
  }
  const count = kept.length, tri = new Float64Array(count * 9), fabric = new Uint8Array(count), cells = new Map();
  const grow = MARCH_M / 2;
  kept.forEach((t, k) => {
    for (let j = 0; j < 3; j += 1) for (let c = 0; c < 3; c += 1) tri[k * 9 + j * 3 + c] = pos[idx[t + j] * 3 + c];
    fabric[k] = Math.abs((tri[k * 9] + tri[k * 9 + 3] + tri[k * 9 + 6]) / 3) <= TIE_X ? 1 : 0;
    const lo = [0, 1, 2].map((c) => Math.floor((Math.min(tri[k * 9 + c], tri[k * 9 + 3 + c], tri[k * 9 + 6 + c]) - grow) / CELL_M));
    const hi = [0, 1, 2].map((c) => Math.floor((Math.max(tri[k * 9 + c], tri[k * 9 + 3 + c], tri[k * 9 + 6 + c]) + grow) / CELL_M));
    for (let x = lo[0]; x <= hi[0]; x += 1) for (let y = lo[1]; y <= hi[1]; y += 1) for (let z = lo[2]; z <= hi[2]; z += 1) {
      const key = ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
      const list = cells.get(key);
      if (list) list.push(k); else cells.set(key, [k]);
    }
  });
  let ties = 0;
  for (let k = 0; k < count; k += 1) ties += 1 - fabric[k];
  return { tri, fabric, cells, count, ties, halter };
}

/** Moller-Trumbore, either face: how far along the ray (o + t d) it meets triangle k, or -1. */
function meet(ox, oy, oz, dx, dy, dz, tri, k) {
  const i = k * 9, ax = tri[i], ay = tri[i + 1], az = tri[i + 2];
  const e1x = tri[i + 3] - ax, e1y = tri[i + 4] - ay, e1z = tri[i + 5] - az;
  const e2x = tri[i + 6] - ax, e2y = tri[i + 7] - ay, e2z = tri[i + 8] - az;
  const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-20) return -1;
  const inv = 1 / det, sx = ox - ax, sy = oy - ay, sz = oz - az;
  const u = (sx * px + sy * py + sz * pz) * inv;
  if (u < 0 || u > 1) return -1;
  const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
  const v = (dx * qx + dy * qy + dz * qz) * inv;
  if (v < 0 || u + v > 1) return -1;
  return (e2x * qx + e2y * qy + e2z * qz) * inv;
}

/**
 * Step 2: which points the brief's fabric covers. Returns the cover per point (1 covered), and for the report how far
 * off her skin each ray met the brief (`met`, metres, negative where it is pressed into her; NaN where it met nothing
 * or was not asked) and which triangle it met (`metTri`, -1 for none).
 */
function cover(at, nrm, count, brief) {
  const covered = new Uint8Array(count), stamp = new Int32Array(brief.count).fill(-1), offsets = [];
  const met = new Float32Array(count).fill(NaN), metTri = new Int32Array(count).fill(-1);
  let asked = 0, metTie = 0, metNothing = 0;
  const steps = Math.ceil(RAY_M / MARCH_M);
  for (let p = 0; p < count; p += 1) {
    const x = at[p * 3], y = at[p * 3 + 1], z = at[p * 3 + 2];
    if (y < BAND.y0 || y > BAND.y1 || Math.abs(x) >= BAND.x) continue;
    asked += 1;
    const dx = nrm[p * 3], dy = nrm[p * 3 + 1], dz = nrm[p * 3 + 2];
    const ox = x - RAY_INSIDE_M * dx, oy = y - RAY_INSIDE_M * dy, oz = z - RAY_INSIDE_M * dz;
    let best = Infinity, bestTri = -1;
    for (let s = 0; s <= steps; s += 1) {
      const t = Math.min(s * MARCH_M, RAY_M);
      const list = brief.cells.get(cellKey(ox + dx * t, oy + dy * t, oz + dz * t));
      if (!list) continue;
      for (const k of list) {
        if (stamp[k] === p) continue;
        stamp[k] = p;
        const h = meet(ox, oy, oz, dx, dy, dz, brief.tri, k);
        if (h >= 0 && h <= RAY_M && h < best) { best = h; bestTri = k; }
      }
    }
    if (bestTri < 0) { metNothing += 1; continue; }
    met[p] = best - RAY_INSIDE_M; metTri[p] = bestTri;
    if (!brief.fabric[bestTri]) metTie += 1;
    else { covered[p] = 1; offsets.push(best - RAY_INSIDE_M); }
  }
  return { covered, offsets, met, metTri, asked, metTie, metNothing };
}

/** Step 3: her skin as a graph of points, edges in compressed rows (`start`, `to`, `len`) and as a list (`ea`, `eb`, `el`). */
function pointGraph(at, count, tris) {
  const seen = new Set(), ea = [], eb = [], el = [];
  for (let t = 0; t < tris.length; t += 3) {
    for (const [a, b] of [[tris[t], tris[t + 1]], [tris[t + 1], tris[t + 2]], [tris[t + 2], tris[t]]]) {
      if (a === b) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * count + hi;
      if (seen.has(key)) continue;
      seen.add(key); ea.push(lo); eb.push(hi);
      el.push(Math.hypot(at[lo * 3] - at[hi * 3], at[lo * 3 + 1] - at[hi * 3 + 1], at[lo * 3 + 2] - at[hi * 3 + 2]));
    }
  }
  const start = new Int32Array(count + 1);
  for (let e = 0; e < ea.length; e += 1) { start[ea[e] + 1] += 1; start[eb[e] + 1] += 1; }
  for (let p = 0; p < count; p += 1) start[p + 1] += start[p];
  const fill = start.slice(0, count), to = new Int32Array(ea.length * 2), len = new Float64Array(ea.length * 2);
  for (let e = 0; e < ea.length; e += 1) {
    to[fill[ea[e]]] = eb[e]; len[fill[ea[e]]++] = el[e];
    to[fill[eb[e]]] = ea[e]; len[fill[eb[e]]++] = el[e];
  }
  return { start, to, len, ea, eb, el };
}

/** A binary min-heap of (distance, point). */
class Heap {
  constructor() { this.key = new Float64Array(1024); this.val = new Int32Array(1024); this.size = 0; }
  push(k, v) {
    if (this.size === this.key.length) {
      const key = new Float64Array(this.size * 2), val = new Int32Array(this.size * 2);
      key.set(this.key); val.set(this.val); this.key = key; this.val = val;
    }
    let i = this.size++;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (this.key[up] <= k) break;
      this.key[i] = this.key[up]; this.val[i] = this.val[up]; i = up;
    }
    this.key[i] = k; this.val[i] = v;
  }
  /** Takes the least: its point, with its distance left in `this.top`. */
  pop() {
    const v = this.val[0], k = this.key[this.size - 1], last = this.val[this.size - 1];
    this.top = this.key[0];
    const n = --this.size;
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= n) break;
      if (c + 1 < n && this.key[c + 1] < this.key[c]) c += 1;
      if (this.key[c] >= k) break;
      this.key[i] = this.key[c]; this.val[i] = this.val[c]; i = c;
    }
    if (n > 0) { this.key[i] = k; this.val[i] = last; }
    return v;
  }
}

/**
 * Step 4: each point's distance from the outline over her skin, signed: + covered, - bare, NaN for bare skin further
 * than `FAR_M` (not stored); covered skin further than that reads +FAR_M.
 */
function signedDistance(graph, covered, count) {
  const dist = new Float64Array(count).fill(Infinity), heap = new Heap();
  const { ea, eb, el, start, to, len } = graph;
  for (let e = 0; e < ea.length; e += 1) {
    if (covered[ea[e]] === covered[eb[e]] || el[e] / 2 > FAR_M) continue;
    dist[ea[e]] = Math.min(dist[ea[e]], el[e] / 2);
    dist[eb[e]] = Math.min(dist[eb[e]], el[e] / 2);
  }
  for (let p = 0; p < count; p += 1) if (dist[p] < Infinity) heap.push(dist[p], p);
  while (heap.size > 0) {
    const p = heap.pop(), d = heap.top;
    if (d > dist[p]) continue;
    for (let j = start[p]; j < start[p + 1]; j += 1) {
      const q = to[j];
      if (covered[q] !== covered[p]) continue;
      const nd = d + len[j];
      if (nd <= FAR_M && nd < dist[q]) { dist[q] = nd; heap.push(nd, q); }
    }
  }
  const field = new Float64Array(count);
  for (let p = 0; p < count; p += 1) {
    if (covered[p]) field[p] = dist[p] < Infinity ? dist[p] : FAR_M;
    else field[p] = dist[p] < Infinity ? -dist[p] : NaN;
  }
  return field;
}

/** Step 5: `SMOOTH.rounds` Jacobi rounds over the stored points near the line, each taking `SMOOTH.blend` of its stored neighbours' mean. */
function smoothEdge(field, graph, count) {
  let from = field.slice(), into = new Float64Array(count);
  for (let r = 0; r < SMOOTH.rounds; r += 1) {
    for (let p = 0; p < count; p += 1) {
      const f = from[p];
      into[p] = f;
      if (Number.isNaN(f) || Math.abs(f) >= SMOOTH.within) continue;
      let sum = 0, n = 0;
      for (let j = graph.start[p]; j < graph.start[p + 1]; j += 1) {
        const g = from[graph.to[j]];
        if (!Number.isNaN(g)) { sum += g; n += 1; }
      }
      if (n > 0) into[p] = (1 - SMOOTH.blend) * f + SMOOTH.blend * (sum / n);
    }
    [from, into] = [into, from];
  }
  return from;
}

/** Step 5b: across the cleft of her seat, each slice's skin between the fabric either side taken in (+ one step). */
function fillCleft(field, at, count, zMid) {
  const slices = new Map();
  for (let p = 0; p < count; p += 1) {
    const x = at[p * 3], z = at[p * 3 + 2];
    if (Math.abs(x) >= CLEFT.x || z >= zMid) continue;
    const k = Math.floor(at[p * 3 + 1] / CLEFT.dy), l = slices.get(k);
    if (l) l.push(p); else slices.set(k, [p]);
  }
  let filled = 0;
  for (const list of slices.values()) {
    // the fabric either side nearest her middle (on the slice), and every point between taken in
    let left = -Infinity, right = Infinity;
    for (const p of list) { if (!(field[p] > 0)) continue; const x = at[p * 3]; if (x < 0) left = Math.max(left, x); else right = Math.min(right, x); }
    if (!(left > -Infinity && right < Infinity)) continue;
    for (const p of list) { const x = at[p * 3]; if (x > left && x < right && !(field[p] > 0)) { field[p] = STEP_M; filled += 1; } }
  }
  return filled;
}

/**
 * Step 5c: the side strings, each a band `STRINGS.half` either side of its line, laid into the field (the larger of the
 * band's value and the field's). Returns each string's line, for the report.
 */
function addStrings(field, at, covered, count) {
  const lines = [];
  for (const side of [1, -1]) {
    // where the strings meet at her side: the middle (front to back) of what the rays met just short of the ties
    const near = [];
    for (let p = 0; p < count; p += 1) if (covered[p] && side * at[p * 3] > TIE_X - 0.02 && side * at[p * 3] < TIE_X) near.push(at[p * 3 + 2]);
    if (!near.length) continue;
    near.sort((a, b) => a - b);
    const zSide = near[Math.floor(near.length / 2)];
    for (const front of [true, false]) {
      // the line: the middle of what the rays met in each bin out from `from` to the ties
      const bins = Math.ceil((TIE_X - STRINGS.from) / STRINGS.bin), sum = new Float64Array(bins * 3), n = new Int32Array(bins);
      for (let p = 0; p < count; p += 1) {
        if (!covered[p]) continue;
        const u = side * at[p * 3];
        if (u < STRINGS.from || u >= TIE_X || (at[p * 3 + 2] > zSide) !== front) continue;
        const b = Math.floor((u - STRINGS.from) / STRINGS.bin);
        sum[b * 3] += at[p * 3]; sum[b * 3 + 1] += at[p * 3 + 1]; sum[b * 3 + 2] += at[p * 3 + 2]; n[b] += 1;
      }
      let line = [];
      for (let b = 0; b < bins; b += 1) if (n[b]) line.push([sum[b * 3] / n[b], sum[b * 3 + 1] / n[b], sum[b * 3 + 2] / n[b]]);
      if (line.length < 3) continue;
      for (let r = 0; r < STRINGS.smooth; r += 1) line = line.map((q, i) => (i === 0 || i === line.length - 1 ? q : [0, 1, 2].map((c) => (line[i - 1][c] + 2 * q[c] + line[i + 1][c]) / 4)));
      // on past the ties' start, under the knot, the way it was going
      const a = line[line.length - 2], b = line[line.length - 1], d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dl = Math.hypot(...d) || 1;
      line.push(b.map((c, k) => c + (d[k] / dl) * STRINGS.past));
      lines.push({ side, front, line });
      // its band: within `half` of the line
      for (let p = 0; p < count; p += 1) {
        const u = side * at[p * 3];
        if (u < STRINGS.from - 0.02 || u > TIE_X + STRINGS.past + 0.02) continue;
        let best = Infinity;
        for (let i = 0; i + 1 < line.length; i += 1) {
          const q0 = line[i], q1 = line[i + 1], ex = q1[0] - q0[0], ey = q1[1] - q0[1], ez = q1[2] - q0[2], l2 = ex * ex + ey * ey + ez * ez || 1;
          const t = Math.max(0, Math.min(1, ((at[p * 3] - q0[0]) * ex + (at[p * 3 + 1] - q0[1]) * ey + (at[p * 3 + 2] - q0[2]) * ez) / l2));
          best = Math.min(best, Math.hypot(at[p * 3] - q0[0] - t * ex, at[p * 3 + 1] - q0[1] - t * ey, at[p * 3 + 2] - q0[2] - t * ez));
        }
        // past `only` the modelled brief's own string is drawn: her skin is bare there; short of it, whichever of the
        // band and the panel reaches further
        const f = STRINGS.half - best;
        if (u >= STRINGS.only) { if (!Number.isNaN(field[p]) && field[p] > -STEP_M) field[p] = -Math.max(STEP_M, Math.min(FAR_M, u - STRINGS.only + STEP_M)); }
        else if (f > -FAR_M && (Number.isNaN(field[p]) || f > field[p])) field[p] = f;
      }
    }
  }
  return lines;
}

/** Step 5d: bare pieces closed in by the fabric taken in (+ one step); returns how many points. */
function fillHoles(field, graph, count) {
  const seen = new Uint8Array(count), stack = [];
  let filled = 0;
  for (let p = 0; p < count; p += 1) {
    if (seen[p] || Number.isNaN(field[p]) || field[p] > 0) continue;
    const piece = []; let open = false;
    seen[p] = 1; stack.push(p);
    while (stack.length) {
      const q = stack.pop(); piece.push(q);
      for (let j = graph.start[q]; j < graph.start[q + 1]; j += 1) {
        const w = graph.to[j];
        if (Number.isNaN(field[w])) { open = true; continue; }
        if (field[w] > 0 || seen[w]) continue;
        seen[w] = 1; stack.push(w);
      }
    }
    if (!open && piece.length < HOLES.most) { for (const q of piece) field[q] = STEP_M; filled += piece.length; }
  }
  return filled;
}

/**
 * For the report: the sizes of the connected pieces of the points `keep` marks that border the rest (a piece of bare
 * skin that does not touch the covered skin is another part of her mesh, an eye, not a hole), largest first.
 */
function pieces(graph, keep, count) {
  const seen = new Uint8Array(count), sizes = [], stack = [];
  for (let p = 0; p < count; p += 1) {
    if (!keep[p] || seen[p]) continue;
    let size = 0, borders = false;
    seen[p] = 1; stack.push(p);
    while (stack.length) {
      const q = stack.pop();
      size += 1;
      for (let j = graph.start[q]; j < graph.start[q + 1]; j += 1) {
        const w = graph.to[j];
        if (!keep[w]) borders = true;
        else if (!seen[w]) { seen[w] = 1; stack.push(w); }
      }
    }
    if (borders) sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}

/** A value in steps: rounded, but never to 0, which would say neither inside nor outside; within +-MAX_Q. */
const quantize = (f) => {
  const q = Math.round(f / STEP_M);
  return Math.max(-MAX_Q, Math.min(MAX_Q, q !== 0 ? q : f > 0 ? 1 : -1));
};

/**
 * Step 6: per vertex in index order, each taking its point's value; a vertex is stored when it has a value that
 * does not read the same as not being stored (a bare vertex at the full -FAR_M is left out).
 */
function encode(values) {
  const bytes = [];
  let prev = -1, entries = 0, nudged = 0;
  for (let v = 0; v < values.length; v += 1) {
    if (Number.isNaN(values[v])) continue;
    const q = quantize(values[v]);
    if (q === -MAX_Q) continue;
    let gap = v - prev;
    prev = v;
    while (gap >= 0x80) { bytes.push((gap & 0x7f) | 0x80); gap >>>= 7; }
    bytes.push(gap, ZERO_BYTE + q);
    entries += 1;
    if (Math.round(values[v] / STEP_M) === 0) nudged += 1;
  }
  return { data: Buffer.from(bytes).toString('base64'), bytes: bytes.length, entries, nudged };
}

/** The generated module's decoder, run here on what was written, to check the round trip. */
function decode(data, vertices) {
  const bin = globalThis.atob(data), field = new Float32Array(vertices).fill(-FAR_M);
  let at = 0, v = -1;
  while (at < bin.length) {
    let gap = 0, shift = 0, byte = 0;
    do { byte = bin.charCodeAt(at++); gap |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
    v += gap;
    field[v] = (bin.charCodeAt(at++) - ZERO_BYTE) * STEP_M;
  }
  return field;
}

function moduleSource({ vertices, entries, data, reach }) {
  const lines = [];
  for (let i = 0; i < data.length; i += LINE_CHARS) lines.push(`  '${data.slice(i, i + LINE_CHARS)}'`);
  // what the field holds at her sides, as measured on this run (the strings are named only while they are missing)
  const strings = Math.max(reach.front, reach.back) < TIE_X - 0.01
    ? ` The narrow fabric strings between the panels and the ties are about one vertex wide on her skin and do
 * not survive the smoothing, so they are not in this field.`
    : '';
  return `/**
 * GENERATED by \`scripts/traceBikiniBottom.mjs\` -- do not edit by hand. To regenerate, from the repo root:
 *   node scripts/traceBikiniBottom.mjs ${BODY_GLB} ${OUT_TS}
 *
 * THE BIKINI BOTTOM'S OUTLINE, TRACED ONTO HER SKIN (Joshua, 2026-11-11: her bottom rebuilt by "duplicating the body's
 * skin... with an offset like 5mm, and we just match the same outline/shape").
 *
 * The outline is the tie-side brief Joshua had MeshyAI make (2026-10-14), as \`scripts/fitMeshyBikini.mjs\` fitted it
 * onto her through \`scripts/sarahV2Bikini.mjs\` (PLACE_V2) and kept it in her body file. A vertex of her approved body
 * (sarah-v2-body.glb, ${vertices} vertices) is under it when a ray out along her normal meets the brief's fabric first
 * (not a side tie, not nothing). The value is how far the vertex stands inside (+, metres) or outside (-) that outline,
 * walked over her skin, and smoothed near the line so the line runs between vertices: a shell copied from her skin is
 * cut where the value crosses zero. It belongs to the vertex, so it stays on the same skin at every belly size and in
 * every pose.
 *
 * Measured when generated: inside reaches |x| ${reach.front.toFixed(3)} m on her front and ${reach.back.toFixed(3)} m on her back, and the side ties begin
 * at ${TIE_X} m.${strings}
 *
 * Encoding: for each stored vertex in index order, the gap from the previous stored index (the first counts from -1,
 * so its gap is its index + 1) as a 7-bit varint (low 7 bits first; the high bit set when another byte follows), then
 * one byte: value = (byte - ${ZERO_BYTE}) * step, within +-far. A value nearer zero than half a step is stored one step
 * out on its own side, so a stored value is never 0. A vertex not stored reads -far: bare, and at least that far from
 * the outline. Covered skin further in than far would read +far.
 */
export const BIKINI_BOTTOM_STENCIL = Object.freeze({
  vertices: ${vertices},
  entries: ${entries},
  step: ${STEP_M},
  far: ${FAR_M},
  data:
${lines.join(' +\n')},
});

let decoded: Float32Array | null = null;

/**
 * Her signed distance from the bikini bottom's outline, one value per vertex of the body it was traced on, in metres
 * (+ inside the bottom, - outside; -far where nothing is stored). Null when \`vertexCount\` is given and is not that
 * body's count (another body). Decoded once and cached: every call returns the SAME array, so treat it as read-only
 * and copy it (\`.slice()\`) to change it.
 */
export function bikiniBottomField(vertexCount?: number): Float32Array | null {
  const s = BIKINI_BOTTOM_STENCIL;
  if (vertexCount !== undefined && vertexCount !== s.vertices) return null;
  if (decoded) return decoded;
  const bin = globalThis.atob(s.data), field = new Float32Array(s.vertices).fill(-s.far);
  let at = 0, v = -1;
  while (at < bin.length) {
    let gap = 0, shift = 0, byte = 0;
    do { byte = bin.charCodeAt(at++); gap |= (byte & 0x7f) << shift; shift += 7; } while (byte & 0x80);
    v += gap;
    field[v] = (bin.charCodeAt(at++) - ${ZERO_BYTE}) * s.step;
  }
  return (decoded = field);
}
`;
}

export async function traceBikiniBottom(bodyFile = BODY_GLB, outFile = OUT_TS, { log = console.log } = {}) {
  const { scale, body, brief: briefMesh } = await load(bodyFile);
  const vertices = body.pos.length / 3;
  const { pointOf, at, count } = weld(body.pos);
  const tris = Int32Array.from(body.idx, (v) => pointOf[v]);
  const nrm = pointNormals(at, count, tris);
  const brief = briefTriangles(briefMesh.pos, briefMesh.idx);
  log(`body: ${vertices} vertices, ${count} points (rest frame scale ${scale.toFixed(5)}); brief: ${brief.count - brief.ties} fabric + ${brief.ties} tie triangles kept, ${brief.halter} halter triangles left out`);

  const { covered, offsets, met, metTri, asked, metTie, metNothing } = cover(at, nrm, count, brief);
  offsets.sort((a, b) => a - b);
  const mm = (m) => (m * 1000).toFixed(1);
  log(`cover: ${asked} points asked; fabric ${offsets.length}, tie ${metTie}, nothing ${metNothing}; fabric met ${mm(offsets[0])}..${mm(offsets[offsets.length - 1])} mm off her skin (median ${mm(percentile(offsets, 0.5))}, ${offsets.filter((o) => o < 0).length} points with it pressed into her)`);

  const graph = pointGraph(at, count, tris);
  const raw = signedDistance(graph, covered, count);
  const field = smoothEdge(raw, graph, count);
  // her middle, front to back, where the brief is: the cleft of her seat lies behind it
  let zLo = Infinity, zHi = -Infinity;
  for (let p = 0; p < count; p += 1) if (covered[p]) { zLo = Math.min(zLo, at[p * 3 + 2]); zHi = Math.max(zHi, at[p * 3 + 2]); }
  const filled = fillCleft(field, at, count, (zLo + zHi) / 2);
  const strings = addStrings(field, at, covered, count);
  const holesFilled = fillHoles(field, graph, count);
  log(`cleft: ${filled} points between the fabric either side taken in; holes: ${holesFilled} points taken in; strings: ${strings.map((s) => `${s.side > 0 ? 'left' : 'right'} ${s.front ? 'front' : 'back'} ${s.line.length} points from |x| ${Math.abs(s.line[0][0]).toFixed(3)} to ${Math.abs(s.line[s.line.length - 1][0]).toFixed(3)} m`).join('; ')}`);

  // ── the report: what the rays found (covered), and what the smoothed field says (inside) ──
  /** Of the points `keep` marks: their vertices, on her left (+x) and right, and how far out (|x|) they reach on her front and back. */
  const tally = (keep) => {
    const t = { verts: 0, left: 0, right: 0, front: 0, back: 0 };
    for (let v = 0; v < vertices; v += 1) {
      const p = pointOf[v];
      if (!keep[p]) continue;
      t.verts += 1;
      if (at[p * 3] > 0) t.left += 1; else if (at[p * 3] < 0) t.right += 1;
    }
    for (let p = 0; p < count; p += 1) {
      if (!keep[p]) continue;
      if (nrm[p * 3 + 2] >= 0) t.front = Math.max(t.front, Math.abs(at[p * 3])); else t.back = Math.max(t.back, Math.abs(at[p * 3]));
    }
    return t;
  };
  const inside = Uint8Array.from(field, (f) => (f > 0 ? 1 : 0));
  const was = tally(covered), now = tally(inside);
  const wasPieces = pieces(graph, covered, count), nowPieces = pieces(graph, inside, count);
  const holes = pieces(graph, Uint8Array.from(covered, (c) => 1 - c), count).slice(1);
  const says = (t) => `${t.verts} vertices, her left ${t.left} / right ${t.right} (${(t.left / t.right).toFixed(3)}), reaching |x| ${t.front.toFixed(3)} m in front and ${t.back.toFixed(3)} m behind`;
  const listed = (s) => `${s.length} [${s.slice(0, 6).join(', ')}${s.length > 6 ? ', ...' : ''}]`;
  let flippedIn = 0, flippedOut = 0, flippedVerts = 0, stored = 0, lo = Infinity, hi = -Infinity;
  for (let p = 0; p < count; p += 1) {
    if (Number.isNaN(field[p])) continue;
    lo = Math.min(lo, field[p]); hi = Math.max(hi, field[p]);
    if (raw[p] > 0 && !(field[p] > 0)) flippedOut += 1;
    if (!(raw[p] > 0) && field[p] > 0) flippedIn += 1;
  }
  for (let v = 0; v < vertices; v += 1) {
    const p = pointOf[v];
    if (Number.isNaN(field[p])) continue;
    stored += 1;
    if ((field[p] > 0) !== (raw[p] > 0)) flippedVerts += 1;
  }
  log(`covered: ${says(was)}; in pieces ${listed(wasPieces)} points, with holes ${listed(holes)} points`);
  log(`inside after smoothing: ${says(now)}; in pieces ${listed(nowPieces)} points`);
  log(`smoothing changed sign at ${flippedOut + flippedIn} points (${flippedOut} covered -> outside, ${flippedIn} bare -> inside), ${flippedVerts} vertices`);

  const { data, bytes, entries, nudged } = encode(Float64Array.from(pointOf, (p) => field[p]));
  log(`field: ${mm(lo)}..${mm(hi)} mm; ${stored} vertices with a value, ${entries} stored (${stored - entries} bare at the full -${mm(FAR_M)} mm left out); ${nudged} within half a step of the line stored one step out on their own side`);

  // ── the round trip, through the generated module's own decoder: every vertex within a step, on its own side ──
  const back = decode(data, vertices);
  let worst = 0, sideLost = 0;
  for (let v = 0; v < vertices; v += 1) {
    const f = field[pointOf[v]], want = Number.isNaN(f) ? -FAR_M : Math.max(-FAR_M, Math.min(FAR_M, f));
    worst = Math.max(worst, Math.abs(back[v] - want));
    if ((back[v] > 0) !== (f > 0)) sideLost += 1;
  }
  if (worst > STEP_M + 1e-6 || sideLost > 0) throw new Error(`round trip off by ${mm(worst)} mm, ${sideLost} vertices on the wrong side`);

  const source = moduleSource({ vertices, entries, data, reach: { front: now.front, back: now.back } });
  writeFileSync(outFile, source);
  log(`wrote ${outFile}: ${entries} entries, ${bytes} bytes -> ${data.length} base64 chars, ${source.length} chars in all (round trip within ${mm(worst)} mm, every vertex on its own side)`);
  return {
    vertices, points: count, covered: was, inside: now, entries, stored, lo, hi, flippedPoints: flippedOut + flippedIn, flippedVerts, nudged,
    // what was found on the way, for a probe that wants to look closer
    pointOf, at, nrm, tris, cover: covered, met, metTri, brief, graph, raw, field,
  };
}

if (process.argv[1]?.endsWith('traceBikiniBottom.mjs')) await traceBikiniBottom(process.argv[2] ?? BODY_GLB, process.argv[3] ?? OUT_TS);
