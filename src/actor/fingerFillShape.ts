/**
 * HER FINGERS' CUT SIDES CLOSED ROUND (P4; Joshua, 2026-11-05, of her own fingers apart: "about 80% there", circling the
 * slivers between her curled fingers and a dark stripe down a lifted one).
 *
 * fingerSplit.ts closes each hole a finger's side is left with, where it was cut from the next, with triangles of the
 * hole's own rim: straight across it. Once her fingers are given their shape (ownFingers.ts `formFingers`) the rim lies on
 * the finger's round surface, a third of the way round it or more, and those straight triangles are a flat panel two to
 * five millimetres inside it, as long as the finger: a flat side down a lifted finger, and a ledge between two curled ones.
 *
 * So each closing triangle's long edges, across the hole, are cut into steps about `step` long (at most `most`), and each
 * point that adds is put where the finger's shape says a point there lies (its distance along, its angle round), as her
 * own points of it are -- a point between two fingers (the web at the foot of a cut) stays where it is. An edge a closing
 * triangle shares with her own skin is left whole, so her skin and the closing meet exactly; a triangle with one is closed
 * as a ladder from that edge to the corner across, rung by rung, one with two as a fan. Each new point is a
 * blend of three of her points and a move away from them, so it is drawn with them in every pose: the blend of their bones.
 *
 * Pure: no three, no DOM.
 */
import type { V3 } from './fingerSplit';

/** GAME TUNING (metres): how long a step the closing triangles' edges are cut into, and at most how many; points this close
 * are one point (her texture's seams split a point into several). */
export const FILL_SHAPE = Object.freeze({ step: 0.0015, most: 10, weld: 2e-5 });

export interface RoundFills {
  /** the points added, each three of her points (`parents`) blended (`bary`) and moved by `offset` (rest metres; three a
   * point each) */
  readonly count: number;
  readonly parents: Uint32Array;
  readonly bary: Float32Array;
  readonly offset: Float32Array;
  /** the closing triangles cut finer: a corner below `base` is her point, from `base` up the point added `base + k` */
  readonly tris: Uint32Array;
  readonly base: number;
}

/**
 * `pos` her points at rest as they are shaped (metres), `fills` the closing triangles (her points), `drawn` the rest of her
 * triangles, `owner` the finger each of her points lies on (fingerSplit.ts), `place` where a point at rest lies round
 * finger f's shape (null: it is not moved).
 */
export function roundFills(pos: ArrayLike<number>, fills: ArrayLike<number>, drawn: ArrayLike<number>, owner: ArrayLike<number>, place: (f: number, p: V3) => V3 | null, o: { readonly step: number; readonly most: number; readonly weld: number } = FILL_SHAPE): RoundFills {
  const n = Math.floor(pos.length / 3);
  // (one id a place)
  const ids = new Map<string, number>(), weldOf = new Map<number, number>();
  const wid = (i: number) => { let w = weldOf.get(i); if (w !== undefined) return w; const k = `${Math.round(pos[i * 3] / o.weld)},${Math.round(pos[i * 3 + 1] / o.weld)},${Math.round(pos[i * 3 + 2] / o.weld)}`; w = ids.get(k); if (w === undefined) { w = ids.size; ids.set(k, w); } weldOf.set(i, w); return w; };
  const F = Math.floor(fills.length / 3);
  const inFills = new Set<number>(); for (let k = 0; k < F * 3; k++) inFills.add(wid(fills[k]));
  // HER EDGES: those of her own triangles between two places the closing triangles use
  const ek = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`), hers = new Set<string>();
  for (let t = 0; t + 2 < drawn.length; t += 3) {
    const v = [drawn[t], drawn[t + 1], drawn[t + 2]];
    if (!v.every((i) => i < n)) continue;
    const w = v.map((i) => { const x = wid(i); return inFills.has(x) ? x : -1; });
    for (let k = 0; k < 3; k++) { const a = w[k], b = w[(k + 1) % 3]; if (a >= 0 && b >= 0) hers.add(ek(a, b)); }
  }
  const parents: number[] = [], bary: number[] = [], offset: number[] = [], out: number[] = [];
  // (a point added: blended from her points, then placed round its finger when all of them lie on one)
  const add = (ps: readonly number[], bs: readonly number[]) => {
    const flat: [number, number, number] = [0, 0, 0];
    ps.forEach((i, k) => { for (let c = 0; c < 3; c++) flat[c] += bs[k] * pos[i * 3 + c]; });
    const f = owner[ps[0]], one = f >= 0 && ps.every((i, k) => bs[k] <= 0 || owner[i] === f);
    const to = one ? place(f, flat) : null;
    parents.push(ps[0], ps[1] ?? ps[0], ps[2] ?? ps[0]); bary.push(bs[0], bs[1] ?? 0, bs[2] ?? 0);
    offset.push(to ? to[0] - flat[0] : 0, to ? to[1] - flat[1] : 0, to ? to[2] - flat[2] : 0);
    return n + parents.length / 3 - 1;
  };
  // EACH EDGE CUT ONCE: how many steps (her own edges none), and its points, shared by the two triangles either side
  const stepsOf = (a: number, b: number) => (hers.has(ek(wid(a), wid(b))) ? 1 : Math.max(1, Math.min(o.most, Math.ceil(Math.hypot(...([0, 1, 2].map((c) => pos[a * 3 + c] - pos[b * 3 + c]) as [number, number, number])) / o.step))));
  const edgePts = new Map<string, number[]>();
  const edgeAt = (a: number, b: number, m: number, steps: number) => {
    if (m <= 0) return a;
    if (m >= steps) return b;
    const wa = wid(a), wb = wid(b), flip = wa > wb, key = ek(wa, wb);
    let list = edgePts.get(key);
    if (!list) {
      const lo = flip ? b : a, hi = flip ? a : b; list = [];
      for (let k = 1; k < steps; k++) list.push(add([lo, hi], [1 - k / steps, k / steps]));
      edgePts.set(key, list);
    }
    return list[(flip ? steps - m : m) - 1];
  };
  // (an edge's points, from one end to the other)
  const pointsAlong = (a: number, b: number) => { const m = stepsOf(a, b), list = [a]; for (let k = 1; k < m; k++) list.push(edgeAt(a, b, k, m)); list.push(b); return list; };
  const put = (a: number, b: number, c: number) => { if (a !== b && b !== c && c !== a) out.push(a, b, c); };
  for (let t = 0; t < F; t++) {
    const tri = [fills[t * 3], fills[t * 3 + 1], fills[t * 3 + 2]];
    const rim = [0, 1, 2].map((k) => stepsOf(tri[k], tri[(k + 1) % 3]) === 1);
    const r = rim.filter(Boolean).length;
    if (r === 3) { out.push(...tri); continue; }
    if (r === 2) {
      // ONE EDGE CUT: a fan to its points from the corner across from it
      const k = rim.findIndex((x) => !x), X = tri[k], Y = tri[(k + 1) % 3], Z = tri[(k + 2) % 3], line = pointsAlong(X, Y);
      for (let j = 0; j + 1 < line.length; j++) put(line[j], line[j + 1], Z);
      continue;
    }
    if (r === 1) {
      // TWO EDGES CUT, from either end of her skin's edge to the corner across from it: the two joined step by step, each
      // step on whichever is less far along
      const k = rim.findIndex(Boolean), X = tri[k], Y = tri[(k + 1) % 3], Z = tri[(k + 2) % 3];
      const L = pointsAlong(X, Z), M = pointsAlong(Y, Z);
      let i = 0, j = 0;
      while (i < L.length - 1 || j < M.length - 1) {
        const onL = j >= M.length - 1 || (i < L.length - 1 && (i + 1) / (L.length - 1) <= (j + 1) / (M.length - 1));
        if (onL) { put(L[i], M[j], L[i + 1]); i++; } else { put(L[i], M[j], M[j + 1]); j++; }
      }
      continue;
    }
    // NONE OF HER SKIN'S: a grid over it, K a side, its points on an edge put on that edge's own steps
    const A = tri[0], Bv = tri[1], C = tri[2], nAB = stepsOf(A, Bv), nBC = stepsOf(Bv, C), nCA = stepsOf(C, A), K = Math.max(nAB, nBC, nCA);
    const grid = new Map<number, number>(), key = (i: number, j: number) => i * (K + 1) + j;
    const at = (i: number, j: number): number => {
      const k = key(i, j); let v = grid.get(k); if (v !== undefined) return v;
      if (i === 0 && j === 0) v = A; else if (i === K && j === 0) v = Bv; else if (i === 0 && j === K) v = C;
      else if (j === 0) v = edgeAt(A, Bv, Math.round((i / K) * nAB), nAB);
      else if (i === 0) v = edgeAt(C, A, Math.round(((K - j) / K) * nCA), nCA);
      else if (i + j === K) v = edgeAt(Bv, C, Math.round((j / K) * nBC), nBC);
      else v = add([A, Bv, C], [1 - (i + j) / K, i / K, j / K]);
      grid.set(k, v); return v;
    };
    for (let i = 0; i < K; i++) for (let j = 0; i + j < K; j++) {
      put(at(i, j), at(i + 1, j), at(i, j + 1));
      if (i + j + 2 <= K) put(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
  return { count: parents.length / 3, parents: Uint32Array.from(parents), bary: Float32Array.from(bary), offset: Float32Array.from(offset), tris: Uint32Array.from(out), base: n };
}
