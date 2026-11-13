/**
 * A LEVEL LINE UNDER THE BRUSH (Joshua, 2026-11-12, after the underarm paint test's level strap: "can we have an option
 * when painting to draw straight lines probably both either room level or body level?").
 *
 * A finger does not draw a straight line round a body, and a brush that dabs at the vertex under it draws a ragged one.
 * With LINE on, a stroke keeps the height it starts at: wherever the finger goes after, each dab lands on THE LEVEL -- the
 * curve round her where her skin is at that height -- at its point nearest the finger on screen. Two heights:
 *
 *   - BODY LEVEL: her own height as she stands -- on her STANDING SHAPE (`standingShape`): her points as she is built,
 *     before her bones pose her. The line runs straight round her as she stands, whatever pose she is painted in -- her
 *     arms up, leaning, reclined.
 *   - ROOM LEVEL: her height in the room as she is posed now. The line is level with the floor.
 *
 * THE SPACE A HELD STROKE IS LAID IN. Each of the two is a surface with her triangles (`LevelView.rest`): her standing
 * shape, or her points in the room. The level is found on THAT surface, and the brush chooses what a dab covers by
 * where it is on that surface too -- not on her body file's rest shape, where the brushes otherwise work. The first
 * build held BODY LEVEL to her body file's height and dabbed there (2026-11-13), and in the room the line was neither
 * level nor clean: the room does not draw her body file, it adds her shapes to it, and they carry her points by
 * different amounts from one to the next (`skinSlip.ts` tells the same of a garment's outline). MEASURED on her skin's
 * points read out of the room, standing: the points of her trunk within 2 mm of one height in her body file stand over
 * 14.7 mm of height in the room at her under-bust (1.228 m), 15.0 mm at 1.10 m and 25.7 mm across her belly at 0.95 m.
 *
 * The level crosses a triangle where its corners stand on both sides of the height: a straight piece from one edge to
 * another, the same on that surface and on screen (her corners are known in both), so a dab's centre is a point ON the
 * surface and exactly on the level, not a vertex near it. Of the pieces near the finger, the one nearest it on
 * screen is taken, among those that face the way her skin under the finger does (the far side of an arm is not hers to
 * paint from here) and that the caller can see (`visible`: nothing of her nearer the eye at that spot). And the pieces
 * looked at are those on the skin JOINED to her skin under the finger (`LevelMesh.joined`): her hip behind her hanging
 * hand is near it at rest and on screen, and no part of the same stretch of skin.
 *
 * A stroke that starts on the last line -- within `LINE_CARRY_PX` of it on screen, a finger's width -- carries that line on
 * at exactly its height, so a strap can be painted from several sides and meet itself; one that starts anywhere else
 * starts a line of its own. Plain arrays, nothing of three or the DOM: `skinPaint.ts` and `bodyPaint.ts` call it.
 */

/** Whether the brushes offer LINE at all. Off, its buttons are not shown and every stroke goes as the finger goes, as before there was one. */
export const LEVEL_LINE_OFFERED = true;
/** How a stroke runs: as the finger goes, or held to a level. */
export type LineMode = 'free' | 'body' | 'room';
/** The order the LINE button steps through. */
export const LINE_MODES: readonly LineMode[] = Object.freeze(['free', 'body', 'room'] as const);
export function nextLineMode(mode: LineMode): LineMode {
  return LINE_MODES[(Math.max(0, LINE_MODES.indexOf(mode)) + 1) % LINE_MODES.length];
}
export function lineModeLine(mode: LineMode): string {
  return `LINE · ${mode === 'body' ? 'BODY LEVEL' : mode === 'room' ? 'ROOM LEVEL' : 'FREE'}`;
}
/** What the LINE button says under itself. */
export function lineModeNote(mode: LineMode): string {
  if (mode === 'body') return 'a stroke stays level on her own body, whatever her pose · start on a line to carry it on';
  if (mode === 'room') return 'a stroke stays level with the floor as she is posed now · start on a line to carry it on';
  return 'a stroke goes where the finger goes';
}

/** GAME TUNING (pixels): a stroke starting this near the last line carries it on (a fingertip is about this wide on a phone). */
export const LINE_CARRY_PX = 22;
/** GAME TUNING (pixels): a drag is followed along the level in steps this long, so a fast one leaves no gap. */
export const LINE_STEP_PX = 6;
/** A dab is laid only where the line has moved on this far on screen (pixels): a finger going up and down beside the line does not pile paint on one spot of it. */
export const LINE_MOVE_PX = 1;
/** GAME TUNING (metres on her at rest): the finger may stray this far from the level and still paint it. */
export const LINE_REACH_M = 0.15;
/**
 * GAME TUNING (metres on her at rest): two places of one held stroke up to this far apart are joined by dabs between,
 * whatever the brush's size (a hairline's own reach is too short to join the level's steps); further apart, the line has
 * crossed to another part of her and nothing is laid between.
 */
export const LINE_JOIN_M = 0.03;
/** A piece of the level on a triangle facing this far from her skin under the finger is the far side of her (as the brushes' own). */
const BACK_FACING = -0.1;


/**
 * WHAT HER STANDING SHAPE IS MADE OF, as the room holds it: her points as her shape fields leave them (her geometry's
 * own positions), her morphs at their weights now, what is laid on her beside them point by point (her belly's push for
 * her baby, `softBody.ts`), and what of her shape is her pose's (the birth poses' shape fields), which is taken back off.
 */
export interface StandingSource {
  /** xyz per vertex. */
  readonly shaped: ArrayLike<number>;
  /** Each morph's name, its weight now, and a vertex's move at full weight (written into `out`). */
  readonly morphs: readonly { readonly name: string; readonly weight: number; move(vertex: number, out: number[]): void }[];
  /** xyz per vertex, or null. */
  readonly push: ArrayLike<number> | null;
  /** Sparse fields laid in `shaped` now: `index` its vertices, `pos` xyz for each, at `weight`. */
  readonly posed: readonly { readonly index: ArrayLike<number>; readonly pos: ArrayLike<number>; readonly weight: number }[];
}
/**
 * Her morphs that are her pose's or her motion's and not her build's (her raised arms, her belly's and breasts' bob and
 * sway as she walks, her belly seated): no part of how she stands, so left out of her standing shape.
 */
export const MOTION_SHAPES: ReadonlySet<string> = new Set(['armRaiseL', 'armRaiseR', 'bellyBob', 'bellySway', 'breastBob', 'bellySeatV2']);

/**
 * HER STANDING SHAPE: where each of her points is as she is built, standing, before her bones pose her (xyz per vertex,
 * her mesh's own units; written into `out` when it is the right length). What a BODY LEVEL line is level on.
 */
export function standingShape(source: StandingSource, out?: Float32Array): Float32Array {
  const { shaped, push } = source, n = Math.floor(shaped.length / 3);
  const S = out && out.length === n * 3 ? out : new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) S[i] = shaped[i] + (push && i < push.length ? push[i] : 0);
  for (const f of source.posed) {
    if (!f.weight) continue;
    for (let k = 0; k < f.index.length; k++) {
      const i = f.index[k] * 3;
      if (!(i >= 0 && i + 2 < S.length)) continue;
      S[i] -= f.weight * f.pos[k * 3]; S[i + 1] -= f.weight * f.pos[k * 3 + 1]; S[i + 2] -= f.weight * f.pos[k * 3 + 2];
    }
  }
  const d = [0, 0, 0];
  for (const m of source.morphs) {
    if (!m.weight || !Number.isFinite(m.weight) || MOTION_SHAPES.has(m.name)) continue;
    for (let v = 0; v < n; v++) { m.move(v, d); S[v * 3] += m.weight * d[0]; S[v * 3 + 1] += m.weight * d[1]; S[v * 3 + 2] += m.weight * d[2]; }
  }
  return S;
}

export interface LevelView {
  /** xyz per vertex: the surface the stroke is laid on -- her standing shape, or her points in the room (one unit for all three). */
  readonly rest: ArrayLike<number>;
  /** Three vertices a triangle. */
  readonly index: ArrayLike<number>;
  /** Each vertex's height on that surface: the level is where this is the stroke's. */
  readonly height: ArrayLike<number>;
  /** Where each vertex is on screen now (pixels) and how far from the eye. */
  readonly x: ArrayLike<number>;
  readonly y: ArrayLike<number>;
  readonly eye: ArrayLike<number>;
  /** xyz per vertex: the way that surface faces (unit), where it is known (`LevelMesh.normals`). */
  readonly normal?: ArrayLike<number> | null;
}
export interface LevelPoint {
  /** On the stroke's surface (its units), exactly on the level. */
  readonly centre: { readonly x: number; readonly y: number; readonly z: number };
  /** The way the surface faces there (unit): its vertices' own blended, or the triangle's face. */
  readonly normal: [number, number, number];
  /** Where it is on screen, how far that is from the finger (pixels), and how far from the eye. */
  readonly px: number;
  readonly py: number;
  readonly off: number;
  readonly eye: number;
  readonly triangle: number;
}

/**
 * The point of the level at `height` nearest a finger at (px, py), over `triangles` (indices into `view.index`, each
 * once). `facing` is her rest normal under the finger: a triangle turned from it is left out. `visible` says whether a
 * point at a screen place and a distance from the eye can be seen. Null when the level crosses none of them.
 */
export function levelPoint(
  view: LevelView, triangles: Iterable<number>, height: number, px: number, py: number,
  facing: readonly [number, number, number] | null = null, visible: ((px: number, py: number, eye: number) => boolean) | null = null,
): LevelPoint | null {
  const { rest, index, height: H, x: X, y: Y, eye: E, normal: N } = view;
  // every piece of the level: how far from the finger, its triangle, the point's share of each corner, where it is on screen and how far from the eye
  const found: { d: number; t: number; w: [number, number, number]; px: number; py: number; eye: number }[] = [];
  const ends: [number, number, number][] = [];
  for (const t of triangles) {
    const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
    if (a === undefined || b === undefined || c === undefined) continue;
    const da = H[a] - height, db = H[b] - height, dc = H[c] - height;
    if ((da > 0 && db > 0 && dc > 0) || (da < 0 && db < 0 && dc < 0)) continue;
    if (!(Number.isFinite(da) && Number.isFinite(db) && Number.isFinite(dc))) continue;
    if (!(E[a] > 0 && E[b] > 0 && E[c] > 0)) continue; // a corner behind the eye
    // where the level meets each edge (a corner on it counts once)
    ends.length = 0;
    const edge = (du: number, dv: number, u: 0 | 1 | 2, v: 0 | 1 | 2) => {
      if (du === 0 && dv === 0) { push(ends, u, 1, v, 0); push(ends, u, 0, v, 1); return; }
      if (du * dv > 0) return;
      const s = du / (du - dv);
      push(ends, u, 1 - s, v, s);
    };
    edge(da, db, 0, 1); edge(db, dc, 1, 2); edge(dc, da, 2, 0);
    if (ends.length < 2) continue;
    // the two ends furthest apart on screen are the piece
    const sx = (w: readonly number[]) => w[0] * X[a] + w[1] * X[b] + w[2] * X[c], sy = (w: readonly number[]) => w[0] * Y[a] + w[1] * Y[b] + w[2] * Y[c];
    let p = ends[0], q = ends[1];
    if (ends.length > 2) { let far = -1; for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) { const d = (sx(ends[i]) - sx(ends[j])) ** 2 + (sy(ends[i]) - sy(ends[j])) ** 2; if (d > far) { far = d; p = ends[i]; q = ends[j]; } } }
    if (facing) {
      // the triangle's own face on the stroke's surface, as the brushes' own test takes it
      const ux = rest[b * 3] - rest[a * 3], uy = rest[b * 3 + 1] - rest[a * 3 + 1], uz = rest[b * 3 + 2] - rest[a * 3 + 2];
      const vx = rest[c * 3] - rest[a * 3], vy = rest[c * 3 + 1] - rest[a * 3 + 1], vz = rest[c * 3 + 2] - rest[a * 3 + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
      if (!(l > 0) || (nx * facing[0] + ny * facing[1] + nz * facing[2]) / l < BACK_FACING) continue;
    }
    const x0 = sx(p), y0 = sy(p), x1 = sx(q), y1 = sy(q), ex = x1 - x0, ey = y1 - y0, l2 = ex * ex + ey * ey;
    const s = l2 > 0 ? Math.min(1, Math.max(0, ((px - x0) * ex + (py - y0) * ey) / l2)) : 0;
    const w: [number, number, number] = [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, p[2] + (q[2] - p[2]) * s];
    const cx = x0 + ex * s, cy = y0 + ey * s;
    found.push({ d: Math.hypot(cx - px, cy - py), t, w, px: cx, py: cy, eye: w[0] * E[a] + w[1] * E[b] + w[2] * E[c] });
  }
  // nearest the finger first
  found.sort((m, n) => m.d - n.d || m.t - n.t);
  for (const f of found) {
    const a = index[f.t * 3], b = index[f.t * 3 + 1], c = index[f.t * 3 + 2], w = f.w, eye = f.eye;
    if (visible && !visible(f.px, f.py, eye)) continue;
    const at = (k: number) => w[0] * rest[a * 3 + k] + w[1] * rest[b * 3 + k] + w[2] * rest[c * 3 + k];
    let nx = 0, ny = 0, nz = 0;
    if (N) { nx = w[0] * N[a * 3] + w[1] * N[b * 3] + w[2] * N[c * 3]; ny = w[0] * N[a * 3 + 1] + w[1] * N[b * 3 + 1] + w[2] * N[c * 3 + 1]; nz = w[0] * N[a * 3 + 2] + w[1] * N[b * 3 + 2] + w[2] * N[c * 3 + 2]; }
    let l = Math.hypot(nx, ny, nz);
    if (!(l > 1e-6)) {
      const ux = rest[b * 3] - rest[a * 3], uy = rest[b * 3 + 1] - rest[a * 3 + 1], uz = rest[b * 3 + 2] - rest[a * 3 + 2];
      const vx = rest[c * 3] - rest[a * 3], vy = rest[c * 3 + 1] - rest[a * 3 + 1], vz = rest[c * 3 + 2] - rest[a * 3 + 2];
      nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx; l = Math.hypot(nx, ny, nz) || 1;
    }
    return { centre: { x: at(0), y: at(1), z: at(2) }, normal: [nx / l, ny / l, nz / l], px: f.px, py: f.py, off: f.d, eye, triangle: f.t };
  }
  return null;
}

/** One end of a piece: all of corner `u` weighted `wu`, of corner `v` weighted `wv` -- unless that end is there already. */
function push(ends: [number, number, number][], u: 0 | 1 | 2, wu: number, v: 0 | 1 | 2, wv: number): void {
  const w: [number, number, number] = [0, 0, 0];
  w[u] += wu; w[v] += wv;
  for (const e of ends) if (Math.abs(e[0] - w[0]) < 1e-9 && Math.abs(e[1] - w[1]) < 1e-9 && Math.abs(e[2] - w[2]) < 1e-9) return;
  ends.push(w);
}

/**
 * HER SKIN'S JOINS, for telling the skin under the finger from skin that only lies near it. Her mesh is split along its
 * texture seams (one point of her is two or three vertices), so vertices are welded by their rest place first; a triangle
 * is joined to another when they share a welded point.
 */
export class LevelMesh {
  /** Each vertex's welded point. */
  private readonly point: Uint32Array;
  /** The triangles round welded point p: `around[start[p]]` to `around[start[p + 1]]` (exclusive). */
  private readonly start: Uint32Array;
  private readonly around: Uint32Array;
  /** Which search last took each triangle in, and last reached it. */
  private readonly given: Uint32Array;
  private readonly reached: Uint32Array;
  private stamp = 0;

  /** `rest` xyz per vertex, `index` three vertices a triangle; two vertices within `weld` of the same place are one point. */
  constructor(rest: ArrayLike<number>, private readonly index: ArrayLike<number>, weld = 1e-5) {
    const n = Math.floor(rest.length / 3), ids = new Map<string, number>(), point = new Uint32Array(n);
    for (let v = 0; v < n; v++) {
      const key = `${Math.round(rest[v * 3] / weld)},${Math.round(rest[v * 3 + 1] / weld)},${Math.round(rest[v * 3 + 2] / weld)}`;
      let p = ids.get(key);
      if (p === undefined) { p = ids.size; ids.set(key, p); }
      point[v] = p;
    }
    const triangles = Math.floor(index.length / 3), start = new Uint32Array(ids.size + 1);
    const corner = (t: number, k: number) => { const v = index[t * 3 + k]; return v >= 0 && v < n ? point[v] : -1; };
    for (let t = 0; t < triangles; t++) for (let k = 0; k < 3; k++) { const p = corner(t, k); if (p >= 0) start[p + 1]++; }
    for (let p = 0; p < ids.size; p++) start[p + 1] += start[p];
    const around = new Uint32Array(start[ids.size]), fill = start.slice(0, ids.size);
    for (let t = 0; t < triangles; t++) for (let k = 0; k < 3; k++) { const p = corner(t, k); if (p >= 0) around[fill[p]++] = t; }
    this.point = point; this.start = start; this.around = around;
    this.given = new Uint32Array(triangles); this.reached = new Uint32Array(triangles);
  }

  /**
   * The way a surface with her triangles faces at each vertex (`space` xyz per vertex; unit normals, xyz per vertex):
   * her triangles' own, summed over each welded point, so the copies of a point along a texture seam face one way.
   */
  normals(space: ArrayLike<number>): Float32Array {
    const { point, index } = this, n = point.length, sum = new Float64Array((this.start.length - 1) * 3), out = new Float32Array(n * 3);
    for (let t = 0; t * 3 + 2 < index.length; t++) {
      const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
      if (!(a >= 0 && a < n && b >= 0 && b < n && c >= 0 && c < n)) continue;
      const ux = space[b * 3] - space[a * 3], uy = space[b * 3 + 1] - space[a * 3 + 1], uz = space[b * 3 + 2] - space[a * 3 + 2];
      const vx = space[c * 3] - space[a * 3], vy = space[c * 3 + 1] - space[a * 3 + 1], vz = space[c * 3 + 2] - space[a * 3 + 2];
      // (the cross product is twice the triangle's area long: a big triangle counts for more)
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (!Number.isFinite(nx + ny + nz)) continue;
      for (const v of [a, b, c]) { const p = point[v] * 3; sum[p] += nx; sum[p + 1] += ny; sum[p + 2] += nz; }
    }
    for (let v = 0; v < n; v++) {
      const p = point[v] * 3, l = Math.hypot(sum[p], sum[p + 1], sum[p + 2]);
      if (l > 0) { out[v * 3] = sum[p] / l; out[v * 3 + 1] = sum[p + 1] / l; out[v * 3 + 2] = sum[p + 2] / l; }
    }
    return out;
  }

  /** Of `triangles`, those joined to `vertex` through one another (each once): the stretch of her skin the vertex is on. */
  joined(triangles: Iterable<number>, vertex: number): number[] {
    const out: number[] = [];
    if (!(vertex >= 0 && vertex < this.point.length)) return out;
    if (++this.stamp >= 0xffffffff) { this.given.fill(0); this.reached.fill(0); this.stamp = 1; }
    const stamp = this.stamp, { point, start, around, given, reached, index } = this;
    for (const t of triangles) if (t >= 0 && t < given.length) given[t] = stamp;
    const take = (p: number) => { for (let i = start[p]; i < start[p + 1]; i++) { const t = around[i]; if (given[t] === stamp && reached[t] !== stamp) { reached[t] = stamp; out.push(t); } } };
    take(point[vertex]);
    for (let i = 0; i < out.length; i++) { const t = out[i]; for (let k = 0; k < 3; k++) take(point[index[t * 3 + k]]); }
    return out;
  }
}

/** What a brush lends a level stroke: its own pick, the triangles near a vertex, her facing there, and what can be seen. */
export interface LevelHost {
  /** The vertex under a screen place, -1 off her (the brush's own pick). */
  pick(px: number, py: number): number;
  /** The triangles within `reach` (the surface's units) of a vertex's place on the stroke's surface that are joined to it (`LevelMesh.joined`), each once. */
  near(vertex: number, reach: number): Iterable<number>;
  /** The way the stroke's surface faces at a vertex, where it is known. */
  facing(vertex: number): readonly [number, number, number] | null;
  /** Whether a point at a screen place this far from the eye can be seen. */
  visible(px: number, py: number, eye: number): boolean;
  /** A search for the level reaches at least this far (height units), and the finger may stray this far from it. */
  readonly least: number;
  readonly most: number;
}

/**
 * A STROKE HELD TO A LEVEL: what a brush keeps between dabs. `begin` as a stroke starts; `at` for each place the finger
 * is, which gives the level's points from the last place to this one (none while the finger is off her or out of reach);
 * `end` as it lifts. The last line's height is kept between strokes, for the next one to carry on.
 */
export class LevelStroke {
  /** The line being drawn: its mode and height; null between strokes. */
  private line: { mode: LineMode; height: number } | null = null;
  /** The last line drawn, for the next stroke to carry on. */
  private kept: { mode: LineMode; height: number } | null = null;
  /** Where the finger last was on screen, and where the last dab landed (NaN: nowhere yet, or she was lost under it). */
  private lastPx = NaN;
  private lastPy = NaN;
  private dabPx = NaN;
  private dabPy = NaN;

  begin(): void { this.line = null; this.lastPx = NaN; this.lastPy = NaN; this.dabPx = NaN; this.dabPy = NaN; }
  end(): void { if (this.line) this.kept = this.line; this.line = null; }
  /** Forget the last line (she is another body now, or she has moved under a ROOM LEVEL one). */
  reset(): void { this.line = null; this.kept = null; }
  /** The line being drawn, or the last one: its mode and its height in that mode's own units. */
  get held(): { readonly mode: LineMode; readonly height: number } | null { return this.line ?? this.kept; }

  /** The finger is at (px, py): the level's points to dab, in order, from where it last was. */
  at(mode: LineMode, view: LevelView, host: LevelHost, px: number, py: number): LevelPoint[] {
    if (mode === 'free') return [];
    const hit = host.pick(px, py);
    if (hit < 0) { this.lastPx = NaN; this.lastPy = NaN; this.dabPx = NaN; this.dabPy = NaN; return []; }
    if (!this.line) {
      // a stroke that starts on the last line carries it on at its height; any other starts its own, where the finger is
      const h = view.height[hit];
      let height = h;
      if (this.kept && this.kept.mode === mode && Math.abs(h - this.kept.height) <= host.most) {
        const on = levelPoint(view, host.near(hit, Math.max(host.least, Math.abs(h - this.kept.height) * 2)), this.kept.height, px, py, host.facing(hit), host.visible);
        if (on && on.off <= LINE_CARRY_PX) height = this.kept.height;
      }
      this.line = { mode, height };
    }
    const height = this.line.height, out: LevelPoint[] = [];
    // from the last place to this one in short steps along the screen: a long drag crosses a lot of her
    const fx = Number.isFinite(this.lastPx) ? this.lastPx : px, fy = Number.isFinite(this.lastPy) ? this.lastPy : py;
    const steps = Math.max(1, Math.ceil(Math.hypot(px - fx, py - fy) / LINE_STEP_PX));
    for (let k = 1; k <= steps; k++) {
      const s = k / steps, x = fx + (px - fx) * s, y = fy + (py - fy) * s;
      const under = k === steps ? hit : host.pick(x, y);
      if (under < 0) continue;
      const gap = Math.abs(view.height[under] - height);
      if (gap > host.most) continue;
      const p = levelPoint(view, host.near(under, Math.max(host.least, gap * 2)), height, x, y, host.facing(under), host.visible);
      // (only where the line has moved on: the finger's way up and down beside it adds nothing)
      if (!p || Math.hypot(p.px - this.dabPx, p.py - this.dabPy) < LINE_MOVE_PX) continue;
      out.push(p); this.dabPx = p.px; this.dabPy = p.py;
    }
    this.lastPx = px; this.lastPy = py;
    return out;
  }
}
