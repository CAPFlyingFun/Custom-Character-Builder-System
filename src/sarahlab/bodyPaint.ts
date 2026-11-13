/**
 * BODY PAINT (Joshua, 2026-10-20): fabric painted straight onto her skin, as layers of its own -- "a separate, editable
 * paint layer... do not permanently overwrite the original skin texture... a brush and eraser, so painted areas can
 * be added, adjusted, or removed individually".
 *
 * Each layer is a WEIGHT AT EVERY BODY VERTEX (0 bare skin, 1 fully painted), held in the `fabricPaint` attribute the
 * fabric shader reads (`fabricMaterial.ts`). Being per vertex it is attached to the surface itself: it rides every
 * morph, every shape field and every bone, at any belly size and from any angle, because it moves exactly as the
 * vertices do. Nothing of the model changes -- the attribute is added beside her approved data and the skin texture is
 * untouched; clearing every layer is the body exactly as approved.
 *
 * - FILL lays a whole garment's footprint at once, from the body's own `_cloth_cover` bits, then softens its edge a
 *   few rings across the mesh so it does not follow the triangles' sawtooth.
 * - The BRUSH and ERASER work in REST space (the approved surface, `fabricRest`): a stroke picks the vertex under the
 *   finger on her POSED body -- the nearest to the camera of those under it, so an arm in front of her belly is what
 *   gets painted -- and then changes every vertex within the brush's radius of it on the surface at rest, with a soft
 *   falloff. A radius in centimetres therefore means the same on her at 0% and at 200%.
 *
 * - A stroke may be HELD TO A LEVEL (`levelLine.ts`; Joshua, 2026-11-12: "an option when painting to draw straight lines
 *   probably both either room level or body level"): its dabs then land along the curve round her at the height the
 *   stroke started at -- her own rest height, or her height in the room as she is posed -- and not at the vertex under the
 *   finger.
 *
 * Core arithmetic is plain arrays (tested without a GPU); `pick` reads three's posed vertex positions.
 */
import * as THREE from 'three';
import { SkinPose } from './skinPose';
import { bodyDetail } from './bodyDetail';
import type { BodyMap } from './bodyRegions';
import { TriangleGrid, standingSourceOf, type PosedShapes } from './skinPaint';
import { LINE_REACH_M, LevelMesh, LevelStroke, standingShape, type LevelHost, type LevelView, type LineMode } from './levelLine';

export const PAINT_ATTRIBUTE = 'fabricPaint';
/** Layers held per vertex (one vec3 attribute). */
export const PAINT_LAYER_COUNT = 3;
export const BRUSH_RANGE_CM = Object.freeze({ min: 1, max: 20, step: 0.5, initial: 5 });
/** A point of a level line this much further from the eye than her skin drawn at that place is behind something of her, metres (as `skinPaint.ts`). */
const HIDDEN_BEHIND_M = 0.06;

/**
 * Neighbours of every vertex, from the triangles: what softening walks. With `position` (xyz per vertex), vertices that
 * stand in the same place -- her mesh is split along its texture seams, one copy for each side -- share one
 * neighbourhood, the whole ring round the point, each other included. Otherwise each copy sees only its own side of the
 * seam: a copy whose side is a few long triangles averaged with points three centimetres off, and a sleeve's end had a
 * bare notch in it where the other copy, a millimetre away on screen, stayed painted (Joshua, 2026-10-22: "the sleeve
 * has a small tear in it").
 */
export function vertexNeighbours(index: ArrayLike<number>, count: number, position?: ArrayLike<number>): Uint32Array[] {
  const sets: Set<number>[] = Array.from({ length: count }, () => new Set());
  for (let i = 0; i + 2 < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b);
  }
  if (position && position.length >= count * 3) {
    const groups = new Map<string, number[]>();
    for (let v = 0; v < count; v++) {
      const key = `${Math.round(position[v * 3] * 1e5)},${Math.round(position[v * 3 + 1] * 1e5)},${Math.round(position[v * 3 + 2] * 1e5)}`;
      const g = groups.get(key);
      if (g) g.push(v); else groups.set(key, [v]);
    }
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const all = new Set<number>();
      for (const v of g) { all.add(v); for (const u of sets[v]) all.add(u); }
      for (const v of g) { const own = new Set(all); own.delete(v); sets[v] = own; }
    }
  }
  return sets.map((s) => Uint32Array.from(s));
}

/** Weights for layer `layer` (stride `PAINT_LAYER_COUNT`) set to 1 wherever `cover & bits`, then softened `rings` times. */
export function fillLayer(weights: Float32Array, layer: number, cover: ArrayLike<number>, bits: number, neighbours: readonly Uint32Array[] | null, rings = 2): void {
  const n = cover.length;
  const own = new Float32Array(n);
  for (let v = 0; v < n; v++) own[v] = cover[v] & bits ? 1 : 0;
  if (neighbours) softenInPlace(own, neighbours, rings);
  for (let v = 0; v < n; v++) weights[v * PAINT_LAYER_COUNT + layer] = Math.max(weights[v * PAINT_LAYER_COUNT + layer], own[v]);
}

function softenInPlace(values: Float32Array, neighbours: readonly Uint32Array[], rings: number): void {
  let from = values, to = new Float32Array(values.length);
  for (let r = 0; r < rings; r++) {
    for (let v = 0; v < from.length; v++) {
      const nb = neighbours[v];
      let sum = from[v];
      for (let k = 0; k < nb.length; k++) sum += from[nb[k]];
      to[v] = sum / (nb.length + 1);
    }
    [from, to] = [to, from];
  }
  if (from !== values) values.set(from);
}

/**
 * Lone vertices that disagree with nearly all their neighbours take their neighbours' mean: where her skin weights
 * interleave arm and torso along a shoulder, a template's edge would otherwise be a fringe of single painted or bare
 * vertices. A clean edge, where about half the neighbours agree, is left exactly as it is.
 */
export function despeckle(values: Float32Array, neighbours: readonly Uint32Array[], passes = 2, threshold = 0.6): void {
  const next = new Float32Array(values.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let v = 0; v < values.length; v++) {
      const nb = neighbours[v];
      if (!nb.length) { next[v] = values[v]; continue; }
      let sum = 0;
      for (let k = 0; k < nb.length; k++) sum += values[nb[k]];
      const mean = sum / nb.length;
      next[v] = Math.abs(values[v] - mean) > threshold ? mean : values[v];
    }
    values.set(next);
  }
}

export function clearLayer(weights: Float32Array, layer: number): void {
  for (let v = layer; v < weights.length; v += PAINT_LAYER_COUNT) weights[v] = 0;
}

/**
 * One dab: every vertex whose REST position is within `radius` of `centre` moves toward 1 (paint) or 0 (erase) by
 * `strength` times a smooth falloff. Returns how many vertices changed.
 */
export function dab(weights: Float32Array, layer: number, rest: ArrayLike<number>, centre: { x: number; y: number; z: number }, radius: number, strength: number, erase: boolean, normals?: { readonly rest: ArrayLike<number>; readonly at: readonly [number, number, number] }): number {
  const r2 = radius * radius;
  let changed = 0;
  for (let v = 0, n = rest.length / 3; v < n; v++) {
    const dx = rest[v * 3] - centre.x, dy = rest[v * 3 + 1] - centre.y, dz = rest[v * 3 + 2] - centre.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r2) continue;
    // never through her: skin facing away from the surface under the brush is the other side of an arm or a leg
    if (normals && normals.rest[v * 3] * normals.at[0] + normals.rest[v * 3 + 1] * normals.at[1] + normals.rest[v * 3 + 2] * normals.at[2] < -0.1) continue;
    const t = 1 - Math.sqrt(d2) / radius, fall = t * t * (3 - 2 * t), at = v * PAINT_LAYER_COUNT + layer;
    const was = weights[at];
    const next = erase ? Math.max(0, was - strength * fall) : Math.min(1, was + strength * fall);
    if (next !== was) { weights[at] = next; changed++; }
  }
  return changed;
}

/** Layer weights as bytes, for an outfit file (the shape `outfitConfig` stores). */
export function packLayer(weights: Float32Array, layer: number): Uint8Array {
  const out = new Uint8Array(weights.length / PAINT_LAYER_COUNT);
  for (let v = 0; v < out.length; v++) out[v] = Math.round(Math.min(1, Math.max(0, weights[v * PAINT_LAYER_COUNT + layer])) * 255);
  return out;
}
export function unpackLayer(weights: Float32Array, layer: number, bytes: Uint8Array): void {
  for (let v = 0; v < bytes.length && v * PAINT_LAYER_COUNT < weights.length; v++) weights[v * PAINT_LAYER_COUNT + layer] = bytes[v] / 255;
}

/** How many steps UNDO keeps (each is one layer, a byte a vertex). */
export const UNDO_STEPS = 30;

/** The body's paint, as live data on its geometry. */
export class BodyPaint {
  private readonly pose: SkinPose;
  private readonly posedPoint = new Float32Array(3);
  readonly weights: Float32Array;
  private readonly attribute: THREE.BufferAttribute;
  private readonly undoStack: { layer: number; bytes: Uint8Array }[] = [];
  private readonly redoStack: { layer: number; bytes: Uint8Array }[] = [];
  private neighbours: Uint32Array[] | null = null;
  /** Her navel, once `prepareDetail` has found it; -1 before. */
  navelVertex = -1;
  /** Her nipples (`bodyDetail.ts`), -1 where one was not found; empty before `prepareDetail`. */
  nippleVertices: readonly number[] = [];
  /** How much paint covers vertex `v`, on the layers listed (0 to 1). */
  coverAt(v: number, layers: readonly number[]): number {
    let c = 0;
    for (const l of layers) c = Math.max(c, this.weights[v * PAINT_LAYER_COUNT + l] ?? 0);
    return c;
  }
  /**
   * Where each vertex of her posed body is on screen: pixels, depth in view (-1..1), how far from the eye (the room's
   * units, `scale` of them to one of her mesh's), and where it is in the room in her mesh's own units (xyz, `room`).
   * `stamp` counts the strokes: what was worked out for one stroke's pose is not kept for the next.
   */
  private screen: { x: Float32Array; y: Float32Array; depth: Float32Array; eye: Float32Array; room: Float32Array; scale: number; stamp: number } | null = null;
  private strokes = 0;
  /** A stroke held to a level, and the last line's height between strokes (`levelLine.ts`). */
  private readonly level = new LevelStroke();
  /** Her skin's joins, for a held stroke: made at the first one. */
  private joins: LevelMesh | null = null;
  /**
   * THE SURFACE A HELD STROKE IS LAID ON (`levelLine.ts` says why it is not her body file's rest shape): her points where
   * that surface has them -- her standing shape (BODY LEVEL) or where she is in the room (ROOM LEVEL), both in her mesh's
   * own units -- her triangles gridded over them, each point's height and the way the surface faces there. Kept while it
   * is still hers (`key`).
   */
  private space: { readonly key: string; readonly points: ArrayLike<number>; readonly index: ArrayLike<number>; readonly grid: TriangleGrid; readonly height: Float32Array; readonly normal: Float32Array } | null = null;
  /** What of her shape is her pose's now, for her standing shape: the editor's to tell (none, left unset). */
  posed: (() => PosedShapes) | null = null;

  constructor(readonly mesh: THREE.SkinnedMesh) {
    this.pose = new SkinPose(mesh);
    const g = mesh.geometry as THREE.BufferGeometry;
    const have = g.getAttribute(PAINT_ATTRIBUTE) as THREE.BufferAttribute | undefined;
    if (have) { this.attribute = have; this.weights = have.array as Float32Array; return; }
    this.weights = new Float32Array(g.getAttribute('position').count * PAINT_LAYER_COUNT);
    this.attribute = new THREE.BufferAttribute(this.weights, PAINT_LAYER_COUNT);
    g.setAttribute(PAINT_ATTRIBUTE, this.attribute);
  }

  private changed(): void { this.attribute.needsUpdate = true; }
  /** Her vertices' places, for finding the copies split along a texture seam (any one shape of her will do). */
  private restPositions(): ArrayLike<number> | undefined {
    const g = this.mesh.geometry as THREE.BufferGeometry, p = g.getAttribute('position');
    return p && !(p as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute ? (p.array as ArrayLike<number>) : undefined;
  }

  /** Remember layer `layer` as it is, before a change, so UNDO can bring it back. */
  checkpoint(layer: number): void {
    this.undoStack.push({ layer, bytes: packLayer(this.weights, layer) });
    if (this.undoStack.length > UNDO_STEPS) this.undoStack.shift();
    this.redoStack.length = 0;
  }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  /** Step back (or forward); returns the layer that changed, or -1. */
  undo(): number { return this.swap(this.undoStack, this.redoStack); }
  redo(): number { return this.swap(this.redoStack, this.undoStack); }
  private swap(from: { layer: number; bytes: Uint8Array }[], to: { layer: number; bytes: Uint8Array }[]): number {
    const step = from.pop();
    if (!step) return -1;
    to.push({ layer: step.layer, bytes: packLayer(this.weights, step.layer) });
    unpackLayer(this.weights, step.layer, step.bytes);
    this.changed();
    return step.layer;
  }

  /** The layer becomes `coverage` (a template), with any lone stray vertices along its edges cleaned up. */
  setLayer(layer: number, coverage: Float32Array): void {
    const g = this.mesh.geometry as THREE.BufferGeometry;
    this.neighbours ??= g.index ? vertexNeighbours(g.index.array, coverage.length, this.restPositions()) : null;
    const clean = Float32Array.from(coverage);
    if (this.neighbours) despeckle(clean, this.neighbours);
    for (let v = 0; v < clean.length; v++) this.weights[v * PAINT_LAYER_COUNT + layer] = clean[v];
    this.changed();
  }

  /** Whatever is painted on one side is painted on the other too (`mirror` pairs each vertex with its reflection). */
  mirror(layer: number, mirror: Int32Array): void {
    const before = packLayer(this.weights, layer);
    for (let v = 0; v < mirror.length; v++) {
      const m = mirror[v];
      if (m >= 0) this.weights[v * PAINT_LAYER_COUNT + layer] = Math.max(before[v], before[m]) / 255;
    }
    this.changed();
  }

  fill(layer: number, bits: number): void {
    const g = this.mesh.geometry as THREE.BufferGeometry, cover = g.getAttribute('_cloth_cover');
    if (!cover) return;
    this.fillMask(layer, Uint8Array.from({ length: cover.count }, (_, i) => (cover.getX(i) & bits ? 1 : 0)), false);
  }

  /** Paint (or with `erase`, clear) every vertex where `mask` is set, its edge softened a few rings. */
  fillMask(layer: number, mask: Uint8Array, erase: boolean): void {
    const g = this.mesh.geometry as THREE.BufferGeometry;
    this.neighbours ??= g.index ? vertexNeighbours(g.index.array, mask.length, this.restPositions()) : null;
    if (!erase) fillLayer(this.weights, layer, mask, 1, this.neighbours, 6);
    else {
      const keep = new Float32Array(mask.length);
      fillLayer(keep, 0, mask, 1, this.neighbours, 3);
      for (let v = 0; v < mask.length; v++) {
        const at = v * PAINT_LAYER_COUNT + layer, k = keep[v * PAINT_LAYER_COUNT];
        this.weights[at] = Math.min(this.weights[at], 1 - k);
      }
    }
    this.changed();
  }

  /** Paint or clear whole regions of her (`bodyRegions.ts`): `regions` is the map, `numbers` the regions chosen. */
  fillRegions(layer: number, regions: Uint8Array, numbers: readonly number[], erase: boolean): void {
    const want = new Set(numbers);
    this.fillMask(layer, Uint8Array.from(regions, (r) => (want.has(r) ? 1 : 0)), erase);
  }

  /** Store her nipple and navel detail for DETAIL THROUGH PAINT (`bodyDetail.ts`), once per body. */
  prepareDetail(map: BodyMap, navelHint?: number): void {
    const g = this.mesh.geometry as THREE.BufferGeometry;
    if (g.getAttribute('fabricDetail')) return;
    const rest = g.getAttribute('fabricRest'), nrm = g.getAttribute('fabricRestNormal');
    if (!rest || !nrm) return;
    const index = (this.mesh.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array;
    if (!index) return;
    this.neighbours ??= vertexNeighbours(index, rest.count, this.restPositions());
    const d = bodyDetail({ map, restPosition: rest.array as ArrayLike<number>, restNormal: nrm.array as ArrayLike<number>, neighbours: this.neighbours, trunkLength: map.trunkLength, navelHint });
    this.navelVertex = d.navel;
    this.nippleVertices = d.nipples;
    g.setAttribute('fabricDetail', new THREE.BufferAttribute(d.offset, 4));
    g.setAttribute('fabricDetailN', new THREE.BufferAttribute(d.normal, 4));
  }

  /** Tint every vertex by its region's colour, or take the tint away (null): the SHOW REGIONS overlay. */
  showRegions(regions: Uint8Array | null, tints: readonly (readonly [number, number, number])[]): void {
    const g = this.mesh.geometry as THREE.BufferGeometry;
    let tint = g.getAttribute('fabricRegionTint') as THREE.BufferAttribute | undefined;
    if (!tint) { tint = new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 4), 4); g.setAttribute('fabricRegionTint', tint); }
    const a = tint.array as Float32Array;
    for (let v = 0; v < a.length / 4; v++) {
      const r = regions ? regions[v] : 0, c = r ? tints[r - 1] : null;
      a[v * 4] = c?.[0] ?? 0; a[v * 4 + 1] = c?.[1] ?? 0; a[v * 4 + 2] = c?.[2] ?? 0; a[v * 4 + 3] = c ? 1 : 0;
    }
    tint.needsUpdate = true;
  }

  clear(layer: number): void { clearLayer(this.weights, layer); this.changed(); }

  has(layer: number): boolean {
    for (let v = layer; v < this.weights.length; v += PAINT_LAYER_COUNT) if (this.weights[v] > 0.002) return true;
    return false;
  }

  /** Where every vertex of her POSED body lands on screen now; call as a stroke starts (she may have moved since). */
  beginStroke(camera: THREE.Camera, width: number, height: number): void {
    const g = this.mesh.geometry as THREE.BufferGeometry, n = g.getAttribute('position').count;
    const x = new Float32Array(n), y = new Float32Array(n), depth = new Float32Array(n), room = new Float32Array(n * 3), eye = new Float32Array(n), v = new THREE.Vector3();
    this.mesh.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const pose = this.pose, point = this.posedPoint, e = camera.matrixWorldInverse.elements, scale = this.mesh.getWorldScale(v).x || 1;
    pose.refresh();
    for (let i = 0; i < n; i++) {
      pose.posedVertex(i, point);
      room[i * 3] = point[0] / scale; room[i * 3 + 1] = point[1] / scale; room[i * 3 + 2] = point[2] / scale;
      // (how far a point is from the eye: along the way the camera looks)
      eye[i] = -(e[2] * point[0] + e[6] * point[1] + e[10] * point[2] + e[14]);
      v.fromArray(point).project(camera);
      x[i] = (v.x * 0.5 + 0.5) * width; y[i] = (0.5 - v.y * 0.5) * height; depth[i] = v.z;
    }
    this.screen = { x, y, depth, eye, room, scale, stamp: ++this.strokes };
    this.level.begin();
  }

  /** The vertex under a screen point: of those within `slop` pixels, the one nearest the camera; -1 off her. */
  pick(px: number, py: number, slop = 8): number {
    const s = this.screen;
    if (!s) return -1;
    let best = -1, bestDepth = Infinity;
    const s2 = slop * slop;
    for (let i = 0; i < s.x.length; i++) {
      const dx = s.x[i] - px, dy = s.y[i] - py;
      if (dx * dx + dy * dy > s2 || s.depth[i] < -1 || s.depth[i] > 1) continue;
      if (s.depth[i] < bestDepth) { bestDepth = s.depth[i]; best = i; }
    }
    return best;
  }

  /**
   * Paint or erase around the vertex under the finger; `radius` in the mesh's own (rest) units. With `line`, the stroke is
   * held to a level (`levelLine.ts`) and its dabs land along that level under the finger instead; `unitsPerCm` is how many
   * of the mesh's units make a centimetre on her.
   */
  stroke(px: number, py: number, layer: number, radius: number, erase: boolean, strength = 0.6, line: { readonly mode: LineMode; readonly unitsPerCm: number } | null = null): boolean {
    const rest = (this.mesh.geometry as THREE.BufferGeometry).getAttribute('fabricRest');
    if (!rest) return false;
    const r = rest.array as ArrayLike<number>;
    const nrm = (this.mesh.geometry as THREE.BufferGeometry).getAttribute('fabricRestNormal');
    let changed = 0;
    if (line && line.mode !== 'free') {
      // (a held stroke is laid on its own surface -- her standing shape, or her points in the room -- and its dabs choose
      // her vertices by where they are there)
      const space = this.levelSpace(line.mode, line.unitsPerCm, r);
      if (!space) return false;
      for (const p of this.levelPlaces(px, py, line.mode, radius, line.unitsPerCm, space)) {
        changed += dab(this.weights, layer, space.points, p.centre, radius, strength, erase, { rest: space.normal, at: p.normal });
      }
    } else {
      const hit = this.pick(px, py);
      if (hit < 0) return false;
      const normals = nrm ? { rest: nrm.array as ArrayLike<number>, at: [nrm.getX(hit), nrm.getY(hit), nrm.getZ(hit)] as [number, number, number] } : undefined;
      changed = dab(this.weights, layer, r, { x: r[hit * 3], y: r[hit * 3 + 1], z: r[hit * 3 + 2] }, radius, strength, erase, normals);
    }
    if (changed) this.changed();
    return changed > 0;
  }

  /**
   * The surface a stroke held to `mode` is laid on, as she is now (as `SkinPainter.levelSpace`): her standing shape, worked
   * out again only when what it is made of has changed, or her points in the room, as this stroke found her. (A body
   * whose shape cannot be read keeps BODY LEVEL on her body file's rest shape, `rest`.)
   */
  private levelSpace(mode: LineMode, unitsPerCm: number, rest: ArrayLike<number>): BodyPaint['space'] {
    const s = this.screen;
    if (!s || !(unitsPerCm > 0)) return null;
    const g = this.mesh.geometry as THREE.BufferGeometry, count = Math.floor(rest.length / 3);
    let key: string, points: ArrayLike<number> | null = null, source: ReturnType<typeof standingSourceOf> = null;
    if (mode === 'room') { key = `room ${s.stamp}`; points = s.room; }
    else {
      source = standingSourceOf(this.mesh, this.posed?.() ?? []);
      key = source && source.shaped.length >= count * 3 ? `body ${source.key}` : 'rest';
    }
    if (this.space?.key === key) return this.space;
    if (mode !== 'room') points = key === 'rest' || !source ? rest : standingShape(source);
    if (!points || points.length < count * 3) return null;
    const height = new Float32Array(count);
    for (let i = 0; i < count; i++) height[i] = points[i * 3 + 1];
    // every triangle of her, not only those drawn now (the room may leave covered skin out of the draw)
    const index = (this.mesh.userData.allIndices as ArrayLike<number> | undefined) ?? g.index?.array ?? Uint32Array.from({ length: count }, (_, i) => i);
    const joins = this.joins ??= new LevelMesh(rest, index);
    this.space = { key, points, index, grid: new TriangleGrid({ rest: points, uv: [], index }, 2 * unitsPerCm), height, normal: joins.normals(points) };
    return this.space;
  }

  /** The places a stroke held to a level dabs for the finger at (px, py), each on the stroke's own surface (as `SkinPainter.levelPlaces`). */
  private levelPlaces(px: number, py: number, mode: LineMode, radius: number, unitsPerCm: number, space: NonNullable<BodyPaint['space']>): { centre: { x: number; y: number; z: number }; normal: [number, number, number] }[] {
    const s = this.screen, joins = this.joins;
    if (!s || !joins) return [];
    const at = space.points, faces = space.normal, perMetre = unitsPerCm * 100, hidden = HIDDEN_BEHIND_M * perMetre * s.scale;
    const view: LevelView = { rest: at, index: space.index, height: space.height, x: s.x, y: s.y, eye: s.eye, normal: faces };
    const host: LevelHost = {
      pick: (x, y) => this.pick(x, y),
      near: (vertex, reach) => joins.joined(space.grid.near({ x: at[vertex * 3], y: at[vertex * 3 + 1], z: at[vertex * 3 + 2] }, reach + radius), vertex),
      facing: (vertex) => [faces[vertex * 3], faces[vertex * 3 + 1], faces[vertex * 3 + 2]],
      // (seen: nothing of her drawn at that place is much nearer the eye)
      visible: (x, y, eye) => { const front = this.pick(x, y); return front < 0 || eye <= s.eye[front] + hidden; },
      least: 2 * radius,
      most: LINE_REACH_M * perMetre,
    };
    return this.level.at(mode, view, host, px, py).map((p) => ({ centre: { x: p.centre.x, y: p.centre.y, z: p.centre.z }, normal: p.normal }));
  }

  endStroke(): void { this.screen = null; this.level.end(); }
}
