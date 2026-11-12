/**
 * A GARMENT MADE FROM HER OWN SKIN (Joshua, 2026-11-11: "what about just duplicating the body's skin that adjusts as it
 * duplicates the same body sizes in real time with an offset like 5mm, and we just match the same outline/shape"; then
 * "set up a system similar to how Sims4 works").
 *
 * The Sims 4 never simulates its clothes. Every garment point is tied to a place on the body's surface (its second UV
 * set looks up the body's own shape maps there), takes the body's bone weights from under it, and moves exactly as the
 * skin under it moves; a looser "robe" set of moves is blended in where cloth spans a hollow instead of following it
 * (EA's patent US9626808 and the modding tools' own readers -- the research of 2026-11-11). This is that, exactly:
 * a point of the garment IS a point of her skin -- three of her vertices and how much of each -- raised off it.
 *
 * This file is the plain part (numbers in, numbers out); `skinShellMesh.ts` lays it on her in the room.
 *
 *   - THE CUT. Her triangles, welded across her texture seams into one surface, are cut where a FIELD over her skin
 *     crosses 0 (+ inside the garment): a triangle wholly inside is kept, one the edge crosses is cut along it -- each
 *     edge's crossing found by the field's own values at its two ends -- so the garment's edge is the outline's smooth
 *     line, not her triangles' zig-zag. The field is whatever draws the outline: a traced stencil (the bikini bottom's,
 *     `bikiniBottomStencil.ts`) or a coverage template's line (`paintTemplates.ts`).
 *   - THE FACE. Every point of the cut stands OFFSET off her skin along her skin's direction there.
 *   - THE ROBE (`bridgeLift`). Where her skin folds in under the garment (between her buttocks, at her crotch), a copy
 *     of her skin raised along her own directions would cross itself; cloth spans the fold instead. So the face is
 *     smoothed outward only -- a point moves to the middle of its neighbours only when that is OUT from her -- until it
 *     spans the hollow; what each point moved is kept (laid again with her shape) and carried with her.
 *   - THE HEM. Round every edge of the cut, a rolled edge: rings from the face's edge rounding out a little and down to
 *     just off her skin, so from the side the garment has a real edge and no gap under it.
 *
 * Units are whatever the caller's positions are in (her geometry units in the room); every length passed in is in them.
 */

/** GAME TUNING, every number (lengths in metres; the caller turns them into its own units). */
export const SKIN_SHELL = Object.freeze({
  /** how far the fabric's outer face stands off her skin (Joshua: "an offset like 5mm") */
  offset: 0.005,
  /** the hem: rings from the face's edge down to her skin, how far it rounds out past the cut (a share of the offset),
   *  and how far off her skin its foot stands (just clear of her, never in her) */
  hemRings: 4, hemBulge: 0.35, hemFoot: 0.0004,
  /** the robe: rounds of rising, how far toward its neighbours' height a point rises each round, rounds of smoothing
   *  her directions it rises along (20: on a fold 3 cm deep and 1.2 cm across, 8 left 130 of its triangles turned over
   *  and 20 left 10), and rounds of sliding raised points across the span to untangle it (on her: 1,028 of the bikini
   *  bottom's 8,598 triangles turned over raised straight up, 29 untangled -- tests/bikiniBottomShell.test.ts) */
  bridgeRounds: 200, bridgeStep: 0.5, bridgeSmooth: 20, bridgeUntangle: 60,
  /** its bone weights smoothed over it, its edges held to her skin's: rounds, and how far toward its neighbours' mean
   *  each round goes (skinShellMesh.ts: so it spans the lines where her skin's weights part, as fabric does) */
  weightRounds: 24, weightStep: 0.5,
  /** a field this close to 0 counts as just outside (no sliver triangles along the edge), metres */
  snap: 0.0002,
  /** pieces of the cut with fewer points than this are specks, dropped (a scrap of 54 a string left behind was kept at
   *  40 and drawn as a patch floating on her seat: 2026-11-11 review) */
  minPiece: 100,
  /** her seams' copies of one point are within this of each other, metres (far below her spacing, far above noise) */
  weld: 0.00002,
});

export interface SkinShellInput {
  /** her points as she is shaped now (three numbers a vertex) -- to weld her seams and to measure the cut */
  readonly positions: ArrayLike<number>;
  /** her triangles: every one of her skin's (duplicates are taken once) */
  readonly indices: ArrayLike<number>;
  /** per vertex: the outline's field, positive inside the garment (the positions' units; only its sign and its
   *  value along an edge that crosses 0 are used) */
  readonly field: ArrayLike<number>;
  /** her seams' weld distance and the near-0 snap, in the positions' units (SKIN_SHELL's, turned into them) */
  readonly weld: number;
  readonly snap: number;
  readonly hemRings?: number;
  readonly minPiece?: number;
}

export interface SkinShellBake {
  /** all its vertices: the face's first (`faceCount` of them), then the hem's rings */
  readonly count: number;
  readonly faceCount: number;
  /** each vertex: where on her skin it is -- three of her vertices and how much of each (summing to 1) */
  readonly src: Uint32Array;
  readonly bary: Float32Array;
  /** each vertex: 0 the face; k the hem's k-th ring out from the face's edge (`hemRings` the ring at her skin) */
  readonly ring: Uint8Array;
  /** each hem vertex: the face vertex at the edge it rolls down from (-1 for the face) */
  readonly hemOf: Int32Array;
  /** the face's edges, each a closed loop of face vertices, the face on its left seen from outside */
  readonly loops: readonly Uint32Array[];
  /** the face's vertices each loop vertex's hem rings are, ring by ring: hem[l][k-1][j] the k-th ring at loop l's j-th */
  readonly hem: readonly (readonly Uint32Array[])[];
  /** triangles, wound counter-clockwise seen from outside: the face's first (`faceTriangles` of them), then the hem's */
  readonly index: Uint32Array;
  readonly faceTriangles: number;
  /** each face vertex's neighbours over the face (start offsets, `count`+1 for the face only, and the list) */
  readonly nbrStart: Uint32Array;
  readonly nbr: Uint32Array;
  /** each face vertex on an edge of the face (held still by the robe) */
  readonly edge: Uint8Array;
  /** her triangles wholly inside the garment, and those its edge cuts (three of her vertex indices each) */
  readonly inside: Uint32Array;
  readonly cut: Uint32Array;
  /** for checking: pieces dropped as specks, and her triangles taken twice (duplicates in what she was given) */
  readonly dropped: number;
  readonly duplicates: number;
}

/** One point per place: her seams' copies welded (a sweep over a grid with its neighbours, so no copy is rounded apart). */
function weldPoints(positions: ArrayLike<number>, used: Uint8Array, tol: number): Int32Array {
  const n = used.length, point = new Int32Array(n).fill(-1), cell = tol * 4, grid = new Map<string, number[]>(), px: number[] = [];
  let points = 0;
  for (let i = 0; i < n; i++) {
    if (!used[i]) continue;
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let found = -1;
    for (let a = -1; a <= 1 && found < 0; a++) for (let b = -1; b <= 1 && found < 0; b++) for (let c = -1; c <= 1 && found < 0; c++) {
      for (const v of grid.get(`${cx + a},${cy + b},${cz + c}`) ?? []) {
        if (Math.abs(positions[v * 3] - x) <= tol && Math.abs(positions[v * 3 + 1] - y) <= tol && Math.abs(positions[v * 3 + 2] - z) <= tol) { found = point[v]; break; }
      }
    }
    if (found < 0) { found = points++; px.push(i); }
    point[i] = found;
    const k = `${cx},${cy},${cz}`; const l = grid.get(k); if (l) l.push(i); else grid.set(k, [i]);
  }
  return point;
}

/**
 * Cut the garment out of her skin. Only her triangles with a corner inside the garment are looked at, so the cost is the
 * garment's size, not hers.
 */
export function bakeSkinShell(input: SkinShellInput): SkinShellBake {
  const { positions, indices, field } = input;
  const R = Math.max(1, Math.round(input.hemRings ?? SKIN_SHELL.hemRings)), minPiece = input.minPiece ?? SKIN_SHELL.minPiece;
  const n = Math.floor(positions.length / 3), T = Math.floor(indices.length / 3);
  // (a field this close to 0 is just outside: an edge then never crosses within a hair of a corner)
  const f = (v: number) => { const x = field[v]; return Number.isFinite(x) && x > input.snap ? x : Math.min(Number.isFinite(x) ? x : -1, -input.snap); };
  // her triangles that reach into the garment, and the vertices they use
  const near: number[] = [], used = new Uint8Array(n);
  for (let t = 0; t < T; t++) {
    const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2];
    if (f(a) > 0 || f(b) > 0 || f(c) > 0) { near.push(t); used[a] = used[b] = used[c] = 1; }
  }
  const point = weldPoints(positions, used, input.weld);
  // a vertex of hers for each point, and each point's field (her copies agree; the largest is taken)
  const rep = new Map<number, number>(), pf = new Map<number, number>();
  for (let i = 0; i < n; i++) if (used[i]) { const p = point[i]; if (!rep.has(p)) rep.set(p, i); pf.set(p, Math.max(pf.get(p) ?? -Infinity, f(i))); }
  const fieldOf = (p: number) => pf.get(p)!;

  // THE CUT: her triangles inside, and those the edge crosses cut along it (each crossing one vertex, shared by the two
  // triangles either side of its edge)
  const vertexOf = new Map<string, number>();
  const src: number[] = [], bary: number[] = [];
  const pointVertex = (p: number): number => {
    const k = `p${p}`; let v = vertexOf.get(k);
    if (v === undefined) { const i = rep.get(p)!; v = src.length / 3; src.push(i, i, i); bary.push(1, 0, 0); vertexOf.set(k, v); }
    return v;
  };
  /** the edge's crossing, from `pin` (inside) toward `pout` (outside) */
  const crossing = (pin: number, pout: number): number => {
    const k = pin < pout ? `e${pin},${pout}` : `e${pout},${pin}`; let v = vertexOf.get(k);
    if (v === undefined) {
      const fi = fieldOf(pin), fo = fieldOf(pout), t = Math.min(1, Math.max(0, fi / (fi - fo)));
      v = src.length / 3; src.push(rep.get(pin)!, rep.get(pout)!, rep.get(pout)!); bary.push(1 - t, t, 0); vertexOf.set(k, v);
    }
    return v;
  };
  const face: number[] = [], inside: number[] = [], cut: number[] = [], seen = new Set<string>();
  let duplicates = 0;
  for (const t of near) {
    const v3 = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]], p3 = v3.map((v) => point[v]);
    if (p3[0] === p3[1] || p3[1] === p3[2] || p3[2] === p3[0]) continue;
    const key = [...p3].sort((x, y) => x - y).join(',');
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    const ins = p3.map((p) => fieldOf(p) > 0), nIn = ins.filter(Boolean).length;
    if (nIn === 3) { face.push(pointVertex(p3[0]), pointVertex(p3[1]), pointVertex(p3[2])); inside.push(...v3); continue; }
    cut.push(...v3);
    if (nIn === 1) {
      // the corner inside: (it, its edge's crossing ahead, the crossing on the edge behind) -- her winding kept
      const k = ins.indexOf(true), q0 = p3[k], q1 = p3[(k + 1) % 3], q2 = p3[(k + 2) % 3];
      face.push(pointVertex(q0), crossing(q0, q1), crossing(q0, q2));
    } else {
      // the corner outside cut off: the four-sided rest, as two triangles
      const k = ins.indexOf(false), q0 = p3[k], q1 = p3[(k + 1) % 3], q2 = p3[(k + 2) % 3];
      const a = pointVertex(q1), b = pointVertex(q2), c = crossing(q2, q0), d = crossing(q1, q0);
      face.push(a, b, c, a, c, d);
    }
  }

  // SPECKS: pieces of the face with fewer than `minPiece` points are dropped
  const V0 = src.length / 3, up = Int32Array.from({ length: V0 }, (_, i) => i);
  const find = (x: number): number => { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
  for (let i = 0; i < face.length; i += 3) { const r = find(face[i]); up[find(face[i + 1])] = r; up[find(face[i + 2])] = r; }
  const size = new Map<number, number>();
  for (let v = 0; v < V0; v++) { const r = find(v); size.set(r, (size.get(r) ?? 0) + 1); }
  const keepTri: number[] = []; let dropped = 0;
  const droppedRoots = new Set<number>();
  for (let i = 0; i < face.length; i += 3) {
    const r = find(face[i]);
    if ((size.get(r) ?? 0) < minPiece) { if (!droppedRoots.has(r)) { droppedRoots.add(r); dropped++; } continue; }
    keepTri.push(face[i], face[i + 1], face[i + 2]);
  }
  // renumbered: only the face's vertices that a kept triangle uses
  const renum = new Int32Array(V0).fill(-1); let F = 0;
  for (const v of keepTri) if (renum[v] < 0) renum[v] = F++;
  const fsrc = new Uint32Array(F * 3), fbary = new Float32Array(F * 3);
  for (let v = 0; v < V0; v++) { const w = renum[v]; if (w < 0) continue; for (let c = 0; c < 3; c++) { fsrc[w * 3 + c] = src[v * 3 + c]; fbary[w * 3 + c] = bary[v * 3 + c]; } }
  const faceIdx = Uint32Array.from(keepTri, (v) => renum[v]);

  // ITS EDGES: edges only one face triangle has, as they run in it (the face on their left), chained into loops
  const edgeCount = new Map<number, number>();
  const ek = (a: number, b: number) => (a < b ? a * F + b : b * F + a);
  for (let i = 0; i < faceIdx.length; i += 3) for (let c = 0; c < 3; c++) { const k = ek(faceIdx[i + c], faceIdx[i + ((c + 1) % 3)]); edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1); }
  const out = new Map<number, number[]>();
  const edge = new Uint8Array(F);
  for (let i = 0; i < faceIdx.length; i += 3) for (let c = 0; c < 3; c++) {
    const a = faceIdx[i + c], b = faceIdx[i + ((c + 1) % 3)];
    if (edgeCount.get(ek(a, b)) !== 1) continue;
    const l = out.get(a); if (l) l.push(b); else out.set(a, [b]);
    edge[a] = edge[b] = 1;
  }
  const loops: Uint32Array[] = [];
  for (const [start, nexts] of out) {
    while (nexts.length) {
      const loop: number[] = [start];
      let p = nexts.shift()!;
      for (let guard = 0; guard < F + 1 && p !== start; guard++) {
        loop.push(p);
        const l = out.get(p); if (!l || !l.length) break;
        p = l.shift()!;
      }
      if (p === start && loop.length >= 3) loops.push(Uint32Array.from(loop));
    }
  }

  // THE HEM: for each loop, `R` rings of vertices, each at the same place on her skin as the face's edge vertex it rolls
  // down from; strips between rings wound to face outward
  const allSrc = Array.from(fsrc), allBary = Array.from(fbary), ring: number[] = new Array(F).fill(0), hemOf: number[] = new Array(F).fill(-1);
  const index = Array.from(faceIdx);
  const hem: Uint32Array[][] = [];
  let count = F;
  for (const loop of loops) {
    const m = loop.length, rings: Uint32Array[] = [];
    for (let k = 1; k <= R; k++) {
      const r = new Uint32Array(m);
      for (let j = 0; j < m; j++) {
        const fv = loop[j];
        r[j] = count++;
        for (let c = 0; c < 3; c++) { allSrc.push(fsrc[fv * 3 + c]); allBary.push(fbary[fv * 3 + c]); }
        ring.push(k); hemOf.push(fv);
      }
      rings.push(r);
    }
    hem.push(rings);
    for (let k = 0; k < R; k++) {
      const A = k === 0 ? loop : rings[k - 1], B = rings[k];
      for (let j = 0; j < m; j++) {
        const j2 = (j + 1) % m, a = A[j], b = A[j2], c = B[j], d = B[j2];
        index.push(a, c, b, b, c, d);
      }
    }
  }

  // each face vertex's neighbours over the face (for the robe)
  const nb = Array.from({ length: F }, () => new Set<number>());
  for (let i = 0; i < faceIdx.length; i += 3) for (let c = 0; c < 3; c++) { const a = faceIdx[i + c], b = faceIdx[i + ((c + 1) % 3)]; nb[a].add(b); nb[b].add(a); }
  const nbrStart = new Uint32Array(F + 1); let total = 0;
  for (let v = 0; v < F; v++) { nbrStart[v] = total; total += nb[v].size; }
  nbrStart[F] = total;
  const nbr = new Uint32Array(total);
  for (let v = 0; v < F; v++) { let k = nbrStart[v]; for (const w of nb[v]) nbr[k++] = w; }

  return {
    count, faceCount: F, src: Uint32Array.from(allSrc), bary: Float32Array.from(allBary), ring: Uint8Array.from(ring), hemOf: Int32Array.from(hemOf),
    loops, hem, index: Uint32Array.from(index), faceTriangles: faceIdx.length / 3, nbrStart, nbr, edge,
    inside: Uint32Array.from(inside), cut: Uint32Array.from(cut), dropped, duplicates,
  };
}

/** Her value at each garment vertex: Σ weight × hers (three a vertex), `size` numbers a vertex. */
export function sampleSkin(out: Float32Array, from: ArrayLike<number>, size: number, src: Uint32Array, bary: Float32Array, count: number): void {
  for (let p = 0; p < count; p++) {
    const a = src[p * 3] * size, b = src[p * 3 + 1] * size, c = src[p * 3 + 2] * size, wa = bary[p * 3], wb = bary[p * 3 + 1], wc = bary[p * 3 + 2];
    for (let k = 0; k < size; k++) out[p * size + k] = wa * from[a + k] + wb * from[b + k] + wc * from[c + k];
  }
}

/** Unit length, in place, three numbers a vertex (a zero one is left pointing up her front: +z). */
export function normalizeEach(v: Float32Array): void {
  for (let i = 0; i < v.length; i += 3) {
    const l = Math.hypot(v[i], v[i + 1], v[i + 2]);
    if (l > 1e-12) { v[i] /= l; v[i + 1] /= l; v[i + 2] /= l; } else { v[i] = 0; v[i + 1] = 0; v[i + 2] = 1; }
  }
}

/**
 * THE ROBE: how far each face vertex moves off its plain place (her skin `skin` raised `offset` along her direction
 * `dir`, three numbers a vertex, the face's `faceCount` first) to span the hollows her skin folds into.
 *
 * Raised along her own directions, the two walls of a fold narrower than twice the offset cross each other (each wall's
 * direction points at the other), and nothing smoothed from there comes untangled. So the span is raised along her
 * directions SMOOTHED over the garment (`smooth` rounds of each vertex's and its neighbours' average): across a fold they
 * cancel to point out of it, and on her open skin they are hers. Each vertex then only RISES along that direction, never
 * sideways (moved toward its neighbours' middle, the walls of a fold slid past each other and folded the garment over --
 * it showed as a torn line down her crotch with her legs apart, 2026-11-11): a round raises it `step` of the way to the
 * height of its neighbours' middle, measured along its direction from her skin, whenever that is higher -- until no
 * point lies below its neighbours, a span across the fold. The garment's edge stays where the cut put it. Returns the
 * moves from the plain places, three numbers a face vertex.
 */
export function bridgeLift(bake: SkinShellBake, skin: Float32Array, dir: Float32Array, offset: number, rounds: number = SKIN_SHELL.bridgeRounds, step: number = SKIN_SHELL.bridgeStep, smooth: number = SKIN_SHELL.bridgeSmooth, untangle: number = SKIN_SHELL.bridgeUntangle): Float32Array {
  const F = bake.faceCount, D = smoothDirections(bake, dir, smooth);
  // each vertex's height off her skin along its smoothed direction, raised only
  let h = new Float32Array(F).fill(offset), g = new Float32Array(F);
  for (let r = 0; r < rounds; r++) {
    for (let v = 0; v < F; v++) {
      const s = bake.nbrStart[v], e = bake.nbrStart[v + 1];
      g[v] = h[v];
      if (bake.edge[v] || e === s) continue;
      let mx = 0, my = 0, mz = 0;
      for (let k = s; k < e; k++) { const w = bake.nbr[k]; mx += skin[w * 3] + D[w * 3] * h[w]; my += skin[w * 3 + 1] + D[w * 3 + 1] * h[w]; mz += skin[w * 3 + 2] + D[w * 3 + 2] * h[w]; }
      const inv = 1 / (e - s), want = (mx * inv - skin[v * 3]) * D[v * 3] + (my * inv - skin[v * 3 + 1]) * D[v * 3 + 1] + (mz * inv - skin[v * 3 + 2]) * D[v * 3 + 2];
      if (want > h[v]) g[v] = h[v] + step * (want - h[v]);
    }
    [h, g] = [g, h];
  }
  const X = new Float32Array(F * 3), Y = new Float32Array(F * 3);
  for (let v = 0; v < F; v++) for (let c = 0; c < 3; c++) X[v * 3 + c] = skin[v * 3 + c] + D[v * 3 + c] * h[v];
  // UNTANGLED across the span: raised straight up off a fold whose walls lean over it, a wall's triangles land on the span
  // turned over (2026-11-11: dark specks down the middle of her gusset, with the material drawing both sides). Where it
  // was raised, each vertex slides across the span (square to its direction, never up or down it) toward its neighbours'
  // middle, so the walls' triangles spread out over it the right way up; where it was not, it stays.
  const raised = (v: number) => h[v] > offset + 0.05 * offset;
  for (let r = 0; r < untangle; r++) {
    Y.set(X);
    for (let v = 0; v < F; v++) {
      const s = bake.nbrStart[v], e = bake.nbrStart[v + 1];
      if (bake.edge[v] || e === s || !raised(v)) continue;
      let mx = 0, my = 0, mz = 0;
      for (let k = s; k < e; k++) { const w = bake.nbr[k]; mx += X[w * 3]; my += X[w * 3 + 1]; mz += X[w * 3 + 2]; }
      const inv = 1 / (e - s);
      let dx = mx * inv - X[v * 3], dy = my * inv - X[v * 3 + 1], dz = mz * inv - X[v * 3 + 2];
      const up = dx * D[v * 3] + dy * D[v * 3 + 1] + dz * D[v * 3 + 2];
      dx -= up * D[v * 3]; dy -= up * D[v * 3 + 1]; dz -= up * D[v * 3 + 2];
      Y[v * 3] += step * dx; Y[v * 3 + 1] += step * dy; Y[v * 3 + 2] += step * dz;
    }
    X.set(Y);
  }
  // the moves from the plain places (her skin raised `offset` along her own direction)
  for (let v = 0; v < F; v++) for (let c = 0; c < 3; c++) X[v * 3 + c] -= skin[v * 3 + c] + dir[v * 3 + c] * offset;
  return X;
}

/** Her directions (`dir`, the face's first) averaged with their neighbours' `rounds` times over the garment, unit length:
 *  what the robe rises along, its edge too (laid along her own there, its edge in a crease turned over the face beside
 *  it: 290 of the 295 triangles left turned over, 2026-11-11). */
export function smoothDirections(bake: SkinShellBake, dir: Float32Array, rounds: number): Float32Array {
  const F = bake.faceCount, D = dir.slice(0, F * 3), E = new Float32Array(F * 3);
  for (let r = 0; r < rounds; r++) {
    for (let v = 0; v < F; v++) {
      let x = D[v * 3], y = D[v * 3 + 1], z = D[v * 3 + 2];
      for (let k = bake.nbrStart[v]; k < bake.nbrStart[v + 1]; k++) { const w = bake.nbr[k]; x += D[w * 3]; y += D[w * 3 + 1]; z += D[w * 3 + 2]; }
      const l = Math.hypot(x, y, z) || 1; E[v * 3] = x / l; E[v * 3 + 1] = y / l; E[v * 3 + 2] = z / l;
    }
    D.set(E);
  }
  return D;
}

export interface ShellLay {
  /** how far the face stands off her skin, the hem's bulge (a share of it) and its foot (her skin's units) */
  readonly offset: number;
  readonly hemBulge: number;
  readonly hemFoot: number;
}

/**
 * Lay the garment where her skin is: `skin` and `dir` her skin's point and unit direction under every vertex (all
 * `count`, three numbers each: `sampleSkin`, then `normalizeEach` for the direction), `lift` the robe's moves (the
 * face's; null for none). Positions into `pos`, and each vertex's surface direction into `nrm` (from the garment's own
 * triangles, so a span over a hollow is lit as the span it is).
 */
export function layShell(bake: SkinShellBake, skin: Float32Array, dir: Float32Array, lift: Float32Array | null, lay: ShellLay, pos: Float32Array, nrm: Float32Array): void {
  const F = bake.faceCount, R = bake.hem[0]?.length ?? 0;
  for (let v = 0; v < F; v++) for (let c = 0; c < 3; c++) pos[v * 3 + c] = skin[v * 3 + c] + dir[v * 3 + c] * lay.offset + (lift ? lift[v * 3 + c] : 0);
  // the hem: round each loop, the way out across her skin from the face (along it, crossed with her direction), then
  // each ring between the face's edge and its foot just off her skin, rolled out by the bulge on the way
  for (let l = 0; l < bake.loops.length; l++) {
    const loop = bake.loops[l], rings = bake.hem[l], m = loop.length;
    for (let j = 0; j < m; j++) {
      const fv = loop[j], a = loop[(j + m - 1) % m], b = loop[(j + 1) % m];
      const tx = pos[b * 3] - pos[a * 3], ty = pos[b * 3 + 1] - pos[a * 3 + 1], tz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const nx = dir[fv * 3], ny = dir[fv * 3 + 1], nz = dir[fv * 3 + 2];
      let ox = ty * nz - tz * ny, oy = tz * nx - tx * nz, oz = tx * ny - ty * nx;
      const ol = Math.hypot(ox, oy, oz) || 1; ox /= ol; oy /= ol; oz /= ol;
      const fx = skin[fv * 3] + nx * lay.hemFoot, fy = skin[fv * 3 + 1] + ny * lay.hemFoot, fz = skin[fv * 3 + 2] + nz * lay.hemFoot;
      for (let k = 1; k <= R; k++) {
        const th = (Math.PI * k) / R, s = (1 + Math.cos(th)) / 2, bulge = lay.hemBulge * lay.offset * Math.sin(th), w = rings[k - 1][j];
        pos[w * 3] = fx + (pos[fv * 3] - fx) * s + ox * bulge;
        pos[w * 3 + 1] = fy + (pos[fv * 3 + 1] - fy) * s + oy * bulge;
        pos[w * 3 + 2] = fz + (pos[fv * 3 + 2] - fz) * s + oz * bulge;
      }
    }
  }
  // its own directions: each triangle's, summed by area at its corners
  nrm.fill(0);
  const I = bake.index;
  for (let i = 0; i < I.length; i += 3) {
    const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    nrm[a] += x; nrm[a + 1] += y; nrm[a + 2] += z; nrm[b] += x; nrm[b + 1] += y; nrm[b + 2] += z; nrm[c] += x; nrm[c + 1] += y; nrm[c + 2] += z;
  }
  normalizeEach(nrm);
}

/** How high off her skin each vertex stands as laid (along her direction), for carrying a shape's turn of her skin: the
 *  face `offset` (its robe's move along her direction too), the hem by its ring. */
export function heightsOf(bake: SkinShellBake, dir: Float32Array, lift: Float32Array | null, lay: ShellLay, out: Float32Array): void {
  const F = bake.faceCount, R = bake.hem[0]?.length ?? 1;
  for (let v = 0; v < F; v++) out[v] = lay.offset + (lift ? lift[v * 3] * dir[v * 3] + lift[v * 3 + 1] * dir[v * 3 + 1] + lift[v * 3 + 2] * dir[v * 3 + 2] : 0);
  for (let v = F; v < bake.count; v++) { const s = (1 + Math.cos((Math.PI * bake.ring[v]) / R)) / 2; out[v] = lay.hemFoot + (out[bake.hemOf[v]] - lay.hemFoot) * s; }
}
