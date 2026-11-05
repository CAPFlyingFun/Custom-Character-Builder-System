/**
 * HER FINGERS APART (P4, touch & grip; Joshua, 2026-11-05, choosing it: "Separate in code").
 *
 * Sarah v2's index, middle and ring fingers are ONE skin in her mesh: where they touched as she was modelled, triangles join
 * one finger's side to the next -- past four centimetres from the knuckles her welded skin is still one piece, and the tips
 * of her index and middle fingers interleave within a millimetre or two (the room's `fingerBridges` probe). Bent alike, as a
 * fist or round a cup, nothing shows. One finger apart from the others -- pointing, a phone, a key -- and the skin between
 * them is dragged out into a spike, or torn into shards if each finger's skin is given to its own bones.
 *
 * So the joins are cut, and each finger's side is closed. Past `web` along a finger from its knuckle (her own webbing
 * between her fingers is left as it is), every triangle whose corners lie on two different fingers is taken out, and each
 * hole that leaves in a finger's side is closed with triangles of its own rim. Which finger a point lies on: the nearest
 * finger's middle line -- not its bones, which run nearer one side of a finger than the other, but the middle of the skin
 * round them, found slice by slice from the points that are plainly that finger's. Her file is untouched: only the list of
 * triangles she is drawn with changes; no point is added, moved or taken away.
 *
 * Pure: no three, no DOM.
 */

export type V3 = readonly [number, number, number];

/** GAME TUNING (metres): how far from a finger's middle line a point can be and still be that finger's; how far past the
 * knuckle her own webbing reaches (nothing nearer the knuckle is cut); how much nearer one finger a point must be than the
 * next to be plainly that finger's, and the slices its middle line is found in; points this close are one point (her
 * texture's seams split a point into several); at most how many times a point's finger is put to its neighbours' vote;
 * how far out from a finger's middle line its skin may stand, as a share of its girth there, and over how much of its
 * length past the webbing that is eased in; how many rounds each finger's skin is smoothed, and how much of that a point
 * plainly the finger's own takes. */
export const FINGER_SPLIT = Object.freeze({ reach: 0.02, web: 0.022, clear: 0.004, slice: 0.005, weld: 2e-5, rounds: 12, round: 1.05, ease: 0.008, smooth: 14, keep: 0.5 });

export interface FingerSplit {
  /** every triangle she is to be drawn with: hers, less the joins, and the closing ones (corners as indices of her points) */
  readonly tris: Uint32Array;
  /** for each of her points, the finger (an index into the lines given) it lies on, or -1 */
  readonly owner: Int8Array;
  /** for each of her points on a finger, how far along that finger from its knuckle (metres, along its bones) */
  readonly past: Float32Array;
  /** how many triangles were taken out, and how many put in to close the holes they left; how many holes */
  readonly cut: number;
  readonly filled: number;
  readonly holes: number;
  /** edges left open that were not before (0 when every hole was closed) */
  readonly open: number;
  /** her points brought in round their fingers and smoothed (indices of her points), how far each moves and the way it
   * then faces (metres and unit lengths, at rest, three a point) */
  readonly round: { readonly index: Uint32Array; readonly delta: Float32Array; readonly normal: Float32Array };
}

const sub = (a: V3, b: V3): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** How far p is from the bent line through `pts`, how far along it (from its first point) the nearest place is, and that place. */
export function alongLine(p: V3, pts: readonly V3[]): { d: number; s: number; q: V3 } {
  let best = Infinity, at = 0, run = 0, q: V3 = pts[0] ?? p;
  for (let k = 0; k + 1 < pts.length; k++) {
    const ab = sub(pts[k + 1], pts[k]), ap = sub(p, pts[k]), L2 = dot(ab, ab), len = Math.sqrt(L2);
    const t = L2 > 0 ? Math.min(1, Math.max(0, dot(ap, ab) / L2)) : 0;
    const d = Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
    if (d < best) { best = d; at = run + t * len; q = [pts[k][0] + ab[0] * t, pts[k][1] + ab[1] * t, pts[k][2] + ab[2] * t]; }
    run += len;
  }
  return { d: best, s: at, q };
}

const smoothstep = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * `pos` her points at rest (metres, x y z each), `tris` her triangles, `lines` each finger's line at rest from its knuckle
 * out along its bones (every finger but the thumbs); `nrm` her normals at rest, if she has them.
 */
export function splitFingers(pos: ArrayLike<number>, tris: ArrayLike<number>, lines: readonly (readonly V3[])[], o: { readonly reach: number; readonly web: number; readonly clear: number; readonly slice: number; readonly weld: number; readonly rounds: number; readonly round: number; readonly ease: number; readonly smooth: number; readonly keep: number } = FINGER_SPLIT, nrm?: ArrayLike<number>): FingerSplit {
  const n = Math.floor(pos.length / 3), P = (i: number): V3 => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  // (only her hands are looked at: the points within reach of a finger's line and a little more -- the rest of her body,
  // nine points in ten, is left alone and costs nothing)
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], pad = o.reach + 0.015;
  for (const l of lines) for (const q of l) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q[k] - pad); hi[k] = Math.max(hi[k], q[k] + pad); }
  // ONE POINT A PLACE (her seams split them); -1 a point away from her hands
  const keyOf = new Map<string, number>(), weld = new Int32Array(n).fill(-1), first: number[] = [];
  for (let i = 0; i < n; i++) {
    if (pos[i * 3] < lo[0] || pos[i * 3] > hi[0] || pos[i * 3 + 1] < lo[1] || pos[i * 3 + 1] > hi[1] || pos[i * 3 + 2] < lo[2] || pos[i * 3 + 2] > hi[2]) continue;
    const k = `${Math.round(pos[i * 3] / o.weld)},${Math.round(pos[i * 3 + 1] / o.weld)},${Math.round(pos[i * 3 + 2] / o.weld)}`;
    let w = keyOf.get(k); if (w === undefined) { w = first.length; keyOf.set(k, w); first.push(i); }
    weld[i] = w;
  }
  const W = first.length;
  // WHICH FINGER EACH POINT LIES ON: first the nearest line of bones; then each finger's middle line, slice by slice, from
  // the points plainly its own; then the nearest middle line
  const nearestOf = (ls: readonly (readonly V3[])[], p: V3) => {
    let a = -1, da = Infinity, db = Infinity;
    ls.forEach((l, f) => { if (l.length < 2) return; const d = alongLine(p, l).d; if (d < da) { db = da; da = d; a = f; } else if (d < db) db = d; });
    return { f: da <= o.reach ? a : -1, da, db };
  };
  const firstOwner = new Int16Array(W).fill(-1), clearOf = new Uint8Array(W);
  for (let w = 0; w < W; w++) { const r = nearestOf(lines, P(first[w])); firstOwner[w] = r.f; clearOf[w] = r.f >= 0 && r.db - r.da > o.clear ? 1 : 0; }
  const middles = lines.map((l, f) => {
    if (l.length < 2) return l;
    const sums = new Map<number, [number, number, number, number]>();
    for (let w = 0; w < W; w++) {
      if (firstOwner[w] !== f || !clearOf[w]) continue;
      const p = P(first[w]), k = Math.floor(alongLine(p, l).s / o.slice), e = sums.get(k) ?? [0, 0, 0, 0];
      e[0] += p[0]; e[1] += p[1]; e[2] += p[2]; e[3]++; sums.set(k, e);
    }
    const mid = [...sums.entries()].filter(([, e]) => e[3] >= 6).sort((a, b) => a[0] - b[0]).map(([, e]): V3 => [e[0] / e[3], e[1] / e[3], e[2] / e[3]]);
    return mid.length >= 2 ? mid : l;
  });
  const ownerW = new Int16Array(W).fill(-1), pastW = new Float32Array(W), plain = new Uint8Array(W);
  for (let w = 0; w < W; w++) {
    const p = P(first[w]), r = nearestOf(middles, p);
    // (the middle lines say whose it is; the line of bones how far along it is)
    if (r.f >= 0 && firstOwner[w] >= 0) { ownerW[w] = r.f; pastW[w] = alongLine(p, lines[r.f]).s; plain[w] = r.db - r.da > o.clear ? 1 : 0; }
  }
  // (and a point not plainly one finger's that its neighbours mostly say is another finger's is that finger's: a lone point
  // given to the next finger, a little nearer its middle line than its own, is a hole cut in its own finger's side and a
  // spike once its weights follow that finger -- each such point takes the finger most of the points it shares a triangle
  // with lie on, until none changes)
  const T = Math.floor(tris.length / 3), near = new Uint8Array(T);
  for (let t = 0; t < T; t++) near[t] = weld[tris[t * 3]] >= 0 && weld[tris[t * 3 + 1]] >= 0 && weld[tris[t * 3 + 2]] >= 0 ? 1 : 0;
  {
    const nbr: number[][] = Array.from({ length: W }, () => []);
    for (let t = 0; t < T; t++) {
      if (!near[t]) continue;
      const v = [weld[tris[t * 3]], weld[tris[t * 3 + 1]], weld[tris[t * 3 + 2]]];
      if (v.some((w) => ownerW[w] < 0)) continue;
      for (let k = 0; k < 3; k++) { nbr[v[k]].push(v[(k + 1) % 3]); nbr[v[k]].push(v[(k + 2) % 3]); }
    }
    for (let round = 0; round < o.rounds; round++) {
      let changed = 0;
      const was = ownerW.slice();
      for (let w = 0; w < W; w++) {
        if (was[w] < 0 || plain[w] || nbr[w].length === 0) continue;
        const votes = new Map<number, number>();
        for (const x of nbr[w]) votes.set(was[x], (votes.get(was[x]) ?? 0) + 1);
        let top = was[w], most = votes.get(was[w]) ?? 0;
        for (const [f, c] of votes) if (c > most) { most = c; top = f; }
        if (top !== was[w] && top >= 0 && most > nbr[w].length / 2) { ownerW[w] = top; pastW[w] = alongLine(P(first[w]), lines[top]).s; changed++; }
      }
      if (!changed) break;
    }
  }
  // THE JOINS: a triangle whose corners lie on two fingers, past her webbing
  const cutAt = new Uint8Array(T);
  let cut = 0;
  for (let t = 0; t < T; t++) {
    if (!near[t]) continue;
    const a = weld[tris[t * 3]], b = weld[tris[t * 3 + 1]], c = weld[tris[t * 3 + 2]];
    const oa = ownerW[a], ob = ownerW[b], oc = ownerW[c];
    if (oa < 0 || ob < 0 || oc < 0 || (oa === ob && ob === oc)) continue;
    // (any corner past it: a join that reaches past the webbing, where each finger's skin is handed to it alone)
    if (Math.max(pastW[a], pastW[b], pastW[c]) <= o.web) continue;
    cutAt[t] = 1; cut++;
  }
  // THE HOLES THEY LEAVE: each edge of a kept triangle with no kept triangle the other way round, that had one before
  const edgeKey = (a: number, b: number) => a * W + b;
  const before = new Set<number>(), kept = new Set<number>();
  for (let t = 0; t < T; t++) {
    if (!near[t]) continue;
    const v = [weld[tris[t * 3]], weld[tris[t * 3 + 1]], weld[tris[t * 3 + 2]]];
    for (let k = 0; k < 3; k++) { const e = edgeKey(v[k], v[(k + 1) % 3]); before.add(e); if (!cutAt[t]) kept.add(e); }
  }
  // (each rim edge the way round a closing triangle takes it: reversed; and which of her points stands for each place)
  const next = new Map<number, number[]>(), repOf = new Map<number, number>();
  for (let t = 0; t < T; t++) {
    if (cutAt[t] || !near[t]) continue;
    for (let k = 0; k < 3; k++) {
      const ia = tris[t * 3 + k], ib = tris[t * 3 + (k + 1) % 3], a = weld[ia], b = weld[ib];
      if (kept.has(edgeKey(b, a)) || !before.has(edgeKey(b, a))) continue;
      const list = next.get(b) ?? []; list.push(a); next.set(b, list);
      if (!repOf.has(a)) repOf.set(a, ia);
      if (!repOf.has(b)) repOf.set(b, ib);
    }
  }
  // each hole's rim, followed round
  const loops: number[][] = [];
  for (const start of [...next.keys()]) {
    while ((next.get(start)?.length ?? 0) > 0) {
      const loop = [start]; let at = next.get(start)!.pop()!, guard = 0;
      while (at !== start && guard++ < 10000) {
        loop.push(at);
        const outs = next.get(at); if (!outs || outs.length === 0) break;
        at = outs.pop()!;
      }
      if (at === start && loop.length >= 3) loops.push(loop);
    }
  }
  // CLOSED, EACH FINGER ON ITS OWN: a hole's rim runs along one finger's side and back along the next's (the joins between
  // them were one strip) -- closed whole, it would join them again. So the rim is cut where it passes from one finger to
  // the next, and each finger's run of it closed by itself, from its last point straight back to its first
  const fill: number[] = [];
  const polygons: number[][] = [];
  for (const loop of loops) {
    const own = loop.map((w) => ownerW[w]), k0 = own.findIndex((x, k) => x !== own[(k + own.length - 1) % own.length]);
    if (k0 < 0) { polygons.push(loop); continue; }
    const turned = [...loop.slice(k0), ...loop.slice(0, k0)], runs: number[][] = [];
    let run: number[] = [];
    for (let k = 0; k <= turned.length; k++) {
      if (k < turned.length && (run.length === 0 || ownerW[turned[k]] === ownerW[run[0]])) { run.push(turned[k]); continue; }
      runs.push(run);
      run = k < turned.length ? [turned[k]] : [];
    }
    for (const r of runs) if (r.length >= 3) polygons.push(r);
    // (two fingers' runs: both turn from one finger to the other where the cut met her webbing, so between the ends of the
    // two runs is a little gap at the foot of the cut -- closed too, as the web between them)
    if (runs.length === 2) { const [A, B] = runs; polygons.push([A[A.length - 1], B[0], B[B.length - 1], A[0]]); }
  }
  // A FINGER'S RUN CLOSED ALONG IT, a zip: its rim runs out along the finger from the webbing to the furthest point and back
  // along its other edge; the two edges are joined step by step, each step taken on whichever edge is less far along the
  // finger -- short triangles across the finger's side, each between two places along it, that bend with it at each joint
  // (cut across its own plane, ear by ear, a long rim was closed with triangles the length of the finger, and a finger bent
  // drew them as straight strands through its joints)
  const zipped = new Set<number[]>();
  // (every edge drawn so far, each way it is drawn: a step that would draw one again is the other edge's step instead)
  const drawn = new Set<number>(kept);
  const free = (x: number, y: number, z: number) => !drawn.has(edgeKey(x, y)) && !drawn.has(edgeKey(y, z)) && !drawn.has(edgeKey(z, x));
  const put3 = (x: number, y: number, z: number) => { if (x === y || y === z || z === x) return; fill.push(repOf.get(x)!, repOf.get(y)!, repOf.get(z)!); drawn.add(edgeKey(x, y)); drawn.add(edgeKey(y, z)); drawn.add(edgeKey(z, x)); };
  for (const loop of polygons) {
    const m = loop.length, own = ownerW[loop[0]];
    if (m < 5 || own < 0 || !loop.every((w) => ownerW[w] === own)) continue;
    let lo = 0, hi = 0;
    for (let k = 1; k < m; k++) { if (pastW[loop[k]] < pastW[loop[lo]]) lo = k; if (pastW[loop[k]] > pastW[loop[hi]]) hi = k; }
    if (lo === hi) continue;
    const F: number[] = [], G: number[] = [];
    for (let k = lo; ; k = (k + 1) % m) { F.push(loop[k]); if (k === hi) break; }
    for (let k = lo; ; k = (k + m - 1) % m) { G.push(loop[k]); if (k === hi) break; }
    let a = 0, b = 0;
    while (a < F.length - 1 || b < G.length - 1) {
      const canF = a < F.length - 1, canG = b < G.length - 1;
      let onF = canF && (!canG || pastW[F[a + 1]] <= pastW[G[b + 1]]);
      // (a step that would draw an edge already there -- her own, or one just closed -- is taken on the other edge)
      if (onF && canG && !free(F[a], F[a + 1], G[b]) && free(G[b + 1], G[b], F[a])) onF = false;
      else if (!onF && canF && !free(G[b + 1], G[b], F[a]) && free(F[a], F[a + 1], G[b])) onF = true;
      // (the last step on each edge meets the other at the furthest point: no triangle there)
      if (onF) { put3(F[a], F[a + 1], G[b]); a++; } else { put3(G[b + 1], G[b], F[a]); b++; }
    }
    zipped.add(loop);
  }
  // the rest each cut into triangles across its own plane (ear by ear)
  for (const loop of polygons) {
    if (zipped.has(loop)) continue;
    const pts = loop.map((w) => P(first[w]));
    // (the way the rim turns: Newell's normal)
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
    const N: V3 = [nx, ny, nz];
    const idx = loop.map((_, k) => k);
    const convex = (i0: number, i1: number, i2: number) => dot(cross(sub(pts[i1], pts[i0]), sub(pts[i2], pts[i1])), N) > 0;
    const inside = (p: V3, a: V3, b: V3, c: V3) => { const s1 = dot(cross(sub(b, a), sub(p, a)), N), s2 = dot(cross(sub(c, b), sub(p, b)), N), s3 = dot(cross(sub(a, c), sub(p, c)), N); return s1 > 0 && s2 > 0 && s3 > 0; };
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
      let clipped = false;
      for (let k = 0; k < idx.length; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
        if (!convex(i0, i1, i2)) continue;
        if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && inside(pts[j], pts[i0], pts[i1], pts[i2]))) continue;
        fill.push(repOf.get(loop[i0])!, repOf.get(loop[i1])!, repOf.get(loop[i2])!);
        idx.splice(k, 1); clipped = true; break;
      }
      // (a rim no ear can be cut from, bent through itself: a fan from its first point)
      if (!clipped) { for (let k = 1; k + 1 < idx.length; k++) fill.push(repOf.get(loop[idx[0]])!, repOf.get(loop[idx[k]])!, repOf.get(loop[idx[k + 1]])!); idx.length = 0; }
    }
    if (idx.length === 3) fill.push(repOf.get(loop[idx[0]])!, repOf.get(loop[idx[1]])!, repOf.get(loop[idx[2]])!);
  }
  const out = new Uint32Array((T - cut) * 3 + fill.length);
  let m = 0;
  for (let t = 0; t < T; t++) if (!cutAt[t]) { out[m++] = tris[t * 3]; out[m++] = tris[t * 3 + 1]; out[m++] = tris[t * 3 + 2]; }
  for (const x of fill) out[m++] = x;
  // (edges still open that were not)
  const after = new Set<number>(); let open = 0;
  for (let t = 0; t < out.length / 3; t++) { const v = [weld[out[t * 3]], weld[out[t * 3 + 1]], weld[out[t * 3 + 2]]]; if (v.some((w) => w < 0)) continue; for (let k = 0; k < 3; k++) after.add(edgeKey(v[k], v[(k + 1) % 3])); }
  for (const e of after) { const a = Math.floor(e / W), b = e % W; if (!after.has(edgeKey(b, a)) && before.has(edgeKey(b, a))) open++; }
  const owner = new Int8Array(n), past = new Float32Array(n);
  for (let i = 0; i < n; i++) { owner[i] = weld[i] >= 0 ? ownerW[weld[i]] : -1; past[i] = weld[i] >= 0 ? pastW[weld[i]] : 0; }
  // ROUNDED: where two fingers were one skin, each keeps its half of what joined them -- a fin along its side whose edge is
  // the cut. So past the webbing each point of a finger standing further from its middle line than `round` times the
  // finger's girth there (the middle of its plain points' distances, slice by slice) is brought in to that, eased in over
  // `ease` past the webbing: the finger round, as a finger is
  const girth = middles.map((l, f) => {
    const by = new Map<number, number[]>(), all: number[] = [];
    if (l.length >= 2) for (let w = 0; w < W; w++) { if (ownerW[w] !== f || !plain[w]) continue; const r = alongLine(P(first[w]), l), k = Math.floor(r.s / o.slice); const a = by.get(k) ?? []; a.push(r.d); by.set(k, a); all.push(r.d); }
    const mid = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] ?? 0; };
    const whole = mid(all), at = new Map<number, number>();
    for (const [k, a] of by) at.set(k, a.length >= 4 ? mid(a) : whole);
    return (s: number) => at.get(Math.floor(s / o.slice)) ?? whole;
  });
  // (her points as they will stand: first each brought in round its finger)
  const Q = new Float32Array(W * 3);
  for (let w = 0; w < W; w++) { const p = P(first[w]); Q[w * 3] = p[0]; Q[w * 3 + 1] = p[1]; Q[w * 3 + 2] = p[2]; }
  for (let w = 0; w < W; w++) {
    const f = ownerW[w];
    if (f < 0 || pastW[w] <= o.web || middles[f].length < 2) continue;
    const p = P(first[w]), r = alongLine(p, middles[f]), most = girth[f](r.s) * o.round;
    if (!(most > 0) || r.d <= most) continue;
    const k = smoothstep(o.web, o.web + o.ease, pastW[w]) * (most - r.d) / r.d;
    for (let c = 0; c < 3; c++) Q[w * 3 + c] += (p[c] - r.q[c]) * k;
  }
  // SMOOTHED: then each finger's skin past the webbing eased toward the middle of the points beside it on that finger, a
  // step in and a step back out each round so the finger does not thin (Taubin's way) -- the edge the cut left gone, and a
  // point plainly the finger's own (its knuckles' creases, its nail) moved `keep` as much, so they stay
  const ease = (w: number) => smoothstep(o.web - o.ease / 2, o.web + o.ease, pastW[w]);
  const nb: number[][] = Array.from({ length: W }, () => []);
  for (let t = 0; t < out.length / 3; t++) {
    const v = [weld[out[t * 3]], weld[out[t * 3 + 1]], weld[out[t * 3 + 2]]];
    if (v.some((w) => w < 0 || ownerW[w] < 0) || !(ownerW[v[0]] === ownerW[v[1]] && ownerW[v[1]] === ownerW[v[2]])) continue;
    for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3]; if (!nb[a].includes(b)) nb[a].push(b); if (!nb[b].includes(a)) nb[b].push(a); }
  }
  const smoothOf = (w: number) => (ownerW[w] >= 0 && nb[w].length >= 2 ? ease(w) * (plain[w] ? o.keep : 1) : 0);
  const S = new Float32Array(W);
  for (let w = 0; w < W; w++) S[w] = smoothOf(w);
  const step = (amount: number) => {
    const was = Q.slice();
    for (let w = 0; w < W; w++) {
      if (!(S[w] > 0)) continue;
      let x = 0, y = 0, z = 0; for (const u of nb[w]) { x += was[u * 3]; y += was[u * 3 + 1]; z += was[u * 3 + 2]; }
      const m = nb[w].length, k = amount * S[w];
      Q[w * 3] += k * (x / m - was[w * 3]); Q[w * 3 + 1] += k * (y / m - was[w * 3 + 1]); Q[w * 3 + 2] += k * (z / m - was[w * 3 + 2]);
    }
  };
  for (let r = 0; r < o.smooth; r++) { step(0.5); step(-0.53); }
  // FACING as the skin now lies: each point's normal from the triangles round it (an even mix with its own, eased in past
  // the webbing as the smoothing is)
  const NQ = new Float32Array(W * 3);
  for (let t = 0; t < out.length / 3; t++) {
    const v = [weld[out[t * 3]], weld[out[t * 3 + 1]], weld[out[t * 3 + 2]]];
    if (v.some((w) => w < 0) || !v.some((w) => S[w] > 0)) continue;
    const a: V3 = [Q[v[0] * 3], Q[v[0] * 3 + 1], Q[v[0] * 3 + 2]], b: V3 = [Q[v[1] * 3], Q[v[1] * 3 + 1], Q[v[1] * 3 + 2]], c: V3 = [Q[v[2] * 3], Q[v[2] * 3 + 1], Q[v[2] * 3 + 2]];
    const nn = cross(sub(b, a), sub(c, a));
    for (const w of v) { NQ[w * 3] += nn[0]; NQ[w * 3 + 1] += nn[1]; NQ[w * 3 + 2] += nn[2]; }
  }
  const ri: number[] = [], rd: number[] = [], rn: number[] = [];
  for (let i = 0; i < n; i++) {
    const w = weld[i];
    if (w < 0 || ownerW[w] < 0 || pastW[w] <= o.web - o.ease / 2) continue;
    const p = P(i), d0 = Q[w * 3] - p[0], d1 = Q[w * 3 + 1] - p[1], d2 = Q[w * 3 + 2] - p[2], l = Math.hypot(NQ[w * 3], NQ[w * 3 + 1], NQ[w * 3 + 2]);
    if (!(l > 0) && Math.hypot(d0, d1, d2) < 1e-7) continue;
    ri.push(i); rd.push(d0, d1, d2);
    // (no normal of her own given: the triangles' alone; else hers eased into theirs)
    const tn: V3 = l > 0 ? [NQ[w * 3] / l, NQ[w * 3 + 1] / l, NQ[w * 3 + 2] / l] : [0, 0, 0], e = ease(w);
    if (nrm) { const own: V3 = [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]], mix: V3 = [own[0] + (tn[0] - own[0]) * e, own[1] + (tn[1] - own[1]) * e, own[2] + (tn[2] - own[2]) * e], ml = Math.hypot(...mix) || 1; rn.push(mix[0] / ml, mix[1] / ml, mix[2] / ml); }
    else rn.push(...tn);
  }
  return { tris: out, owner, past, cut, filled: fill.length / 3, holes: polygons.length, open, round: { index: Uint32Array.from(ri), delta: Float32Array.from(rd), normal: Float32Array.from(rn) } };
}
