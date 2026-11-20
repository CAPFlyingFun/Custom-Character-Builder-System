/**
 * THE CLEAVAGE BRIDGE (Joshua, 2026-10-22: "keep everything painted, but between the breasts, add a simple shape
 * connector between the breasts to make it look like a shirt... depending on the type of shirt, will determine the
 * shape and dip like if it's a U-neck and V-neck").
 *
 * Paint lies on her skin, so a painted top follows her into her cleavage and reads as body paint. A real top spans the
 * gap: from the front of one breast straight across to the other. The bridge is that span and nothing more -- a thin
 * sheet between the two breasts, in the top's own fabric, drawn in front of the cleavage.
 *
 * How it is made:
 * - Her chest is cut into level slices. In each slice the bridge runs along the line that touches both breasts from
 *   the front (the top edge of the slice's convex outline where it crosses her midline); its two ends are the
 *   vertices where it touches. A slice where that line sits on her skin anyway (below and above her cleavage) gets no
 *   bridge, so it starts and ends where the gap does.
 * - The ends are vertices of her body, so every frame the bridge is re-laid between where they are now: it follows
 *   every belly and breast shape, every pose and every bounce. The ends are chosen again whenever her shape changes.
 * - Its top is cut level just under the lowest point of the top's neckline (`necklineTop`, `cutAt`): a crew neck
 *   bridges the whole cleavage; a scoop, a U or a V stops it at the dip, the paint's own edge drawing the rest of the
 *   neckline. Rows whose ends the top's paint does not cover (a bandeau's top edge) are left off too.
 * - UNDER A DRAWN TOP (`topCut.ts`, 2026-11-14) the sheet is not cut level: it spans all of her cleavage and each of its
 *   pixels looks itself up in the top's front drawing at its own rest place, as her skin's do (`fabricMaterial.ts`), so
 *   the neck opening's rim runs on across the sheet as the curve it is on her skin either side -- a V keeps its point
 *   between her breasts, where the level cut gave it a flat bottom as wide as her cleavage -- and its collar's band
 *   with it. Like her skin, each of its points has a rest place (where its weave is looked up) and a slip (added to it
 *   for the drawing's look-up: its own `fabricSlip`): its ends' are her own vertices', and between them, where it
 *   stands clear of her, they are spread evenly -- which is what carries the fabric across the gap.
 *   WHERE THE RIM LEAVES THE SHEET it has to be on the sheet where it is on her skin, or the two edges show as a
 *   step. So WHEREVER THE SHEET LIES ON HER SKIN IT SAYS WHAT HER SKIN SAYS: under each column of each slice, the
 *   point of her skin that is seen there from her front (`skinSeen`: one of her triangles and the point's shares of
 *   its corners; `spots`), and how far the span stands in front of it.
 *   - At its TOP, where it goes back onto her (`EMERGE_TOP`), and at its BOTTOM, where it grows out of her cleavage
 *     (`EMERGE`), it lies on those points themselves, posed with her every frame, with their own rest places, slip
 *     and the way her skin faces there -- and from them it rises straight forward to the span, so it is never behind
 *     the skin that is seen. A level-cut sheet lies on the two straight runs from its ends to her middle skin
 *     instead, with their rest places: under a large bust those runs pass through her breasts' inner slopes and are
 *     not her skin's (MEASURED 2026-11-14 with her bust's SIZE at +100: at its top the V's band jogged about half its
 *     width and the sheet's corner stood off her as a flap; at its bottom the sheet came out through the undersides
 *     of her breasts within 3 mm of her skin, in front of it in patches and behind it between them, lit by its ends'
 *     directions and not her skin's -- the dark patch under each breast, which the live site's sheet shows too).
 *   - Beside its ENDS, where the span runs along the front of each breast before it leaves it -- and all of a
 *     small bust's sheet, which nowhere stands far off her -- its rest places and slip are her skin's own while it
 *     is within `OWN_NEAR` of her and ease into the even spread by `OWN_FAR`: once
 *     her bust is not the one she has at rest, her skin's places there are not evenly spread (MEASURED in the room,
 *     the same day, a column in from the sheet's ends, where it lies on her and is solid: 3.4 mm across her at her
 *     smallest bust, 3.1 at SIZE +100 and 6.0 at her largest, 11.9 two columns in -- and 0.3 at the bust she has at
 *     rest).
 * - ONLY THE OUTSIDE LAYER IS THE SHIRT (Joshua, 2026-10-23, drawn as the shirt standing off her with the paint still on
 *   the skin under it: "I want the part directly under that bridge to not be painted"). The skin behind the sheet loses
 *   the top's paint (`under`, laid on her by `fabricMaterial.setUnder`), so looking down a neckline shows her skin inside
 *   the shirt, not a second shirt. Which skin is behind it is measured against the sheet itself, at the skin's own
 *   height as she stands: bare where the sheet stands clear in front of it, painted where the two meet (at its ends on
 *   her breasts, its bottom, a crew's top) -- what is seen there is the shirt. Each measure is a straight ramp over more
 *   than her triangles, so the edge the shader draws at its half-way line is a smooth line, not the triangles'
 *   sawtooth. The sheet is solid to within FEATHER_SIDE of its ends and only fades where it lies on her (it used to fade
 *   over a fifth of its width, and bare skin showed through the fade). Under a neckline cut low, her cleavage is bare
 *   up past the cut (`UNDER_TOP_MARGIN`).
 */
import * as THREE from 'three';
import { SkinPose } from './skinPose';
import { BODY_REGIONS, type BodyMap } from './bodyRegions';
import { necklineTop, type CoverageParams } from './paintTemplates';

/** The slices, on her trunk (0 hip joints, 1 base of her neck): from below her bust to above it, this far apart. */
const T_LOW = 0.5, T_HIGH = 0.96, ROW_STEP = 0.008, SLAB = 0.006;
/** The ends are smoothed over this many slices either side. */
const SMOOTH = 2;
/** Columns across the gap. */
const COLUMNS = 12;
/** A slice bridges only where its span stands this far off her skin at the midline, as a share of her trunk. */
const MIN_GAP = 0.004;
/**
 * Over this much of her trunk at the bottom of the bridge (about 3 cm on her), the sheet grows out of her cleavage
 * instead of starting in mid-air: at its lowest row it lies on her skin (breast, midline, breast) and straightens into
 * the span as it rises. Under her breasts the gap opens from nothing to more than a centimetre in one slice.
 */
const EMERGE = 0.05;
/**
 * Where her cleavage closes at the top (a crew neck, which spans all of it), the sheet goes back onto her skin over this
 * much of her trunk the same way, so it closes over the cleavage instead of ending in the air in front of it: from
 * above, the opening it left showed into her cleavage. A neckline's cut is a hem and stays in front.
 */
const EMERGE_TOP = 0.03;
/**
 * GAME TUNING (trunk heights, about 2.5 cm on her): how far over a DRAWN top's neckline's lowest point its sheet still
 * spans her cleavage, so a V keeps its point between her breasts and a low one's rim is all on her skin above it.
 */
export const DRAWN_OVER_DIP = 0.05;
/** GAME TUNING (trunk heights, about 1 cm): over how much the sheet fades out above that. */
export const DRAWN_FADE = 0.02;
/** How straight the sheet runs at trunk height `t` (0 lying on her skin, 1 the span), between its bottom and top. */
function straightAt(t: number, bottom: number, top: number, hemmed: boolean): number {
  const w = Math.max(0, Math.min(1, Math.min((t - bottom) / EMERGE, hemmed ? 1 : (top - t) / EMERGE_TOP)));
  return w * w * (3 - 2 * w);
}

/** How far in front of the span the sheet sits, as a share of her trunk: enough not to flicker against her skin. */
const LIFT = 0.0015;
/** Only her chest from the front, within this many neck radii of her midline, can be in a span. */
const REACH = 4;
/** The normals are smoothed over this many slices either side (about 2.5 cm on her). */
const SMOOTH_NORMAL = 5;
/**
 * The sheet fades into her over this much of her trunk at each end (about 2.5 mm on her: where it meets her breast it
 * lies on it, so the fade only softens the line), this much at a crew's top and this much at its bottom: only where it
 * lies on her skin or nearly. A fade further out showed, through it, the bare skin deeper in her cleavage.
 */
const FEATHER_SIDE = 0.004, FEATHER_TOP = 0.006, FEATHER_BOTTOM = 0.025;
/**
 * The skin behind the sheet is bare only between its ends (the ramp to bare runs over UNDER_RAMP across each end, a
 * share of her trunk; inside, how far the sheet stands off her decides, below), and over UNDER_RAMP_T of her trunk at
 * the sheet's bottom (where it grows out of her cleavage) and its top.
 */
const UNDER_RAMP = 0.006, UNDER_RAMP_T = 0.02;
/**
 * And only where the sheet stands clear in front of her skin: bare from UNDER_DEPTH behind it (a share of her trunk,
 * about 5 mm on her; none where it is level with her skin, where the two would fight for the same pixels), the ramp
 * running over UNDER_DEPTH_RAMP (about 1 cm) so that across the rim of her cleavage, where the depth grows fast, the
 * bare edge is still a smooth line. Near its ends the sheet meets her breasts and runs into them (its ends are smoothed
 * from slice to slice, which on a round breast puts them a little inside it); skin there, level with the sheet or in
 * front of it, is what is seen, so it keeps the paint and is the shirt.
 */
const UNDER_DEPTH = 0.008, UNDER_DEPTH_RAMP = 0.016;
/**
 * Under a drawn top, a point of the sheet that stands within `OWN_NEAR` of her skin has her skin's own rest place and
 * slip there; one that stands `OWN_FAR` off (about 1 cm on her) or more has them spread evenly between the sheet's
 * ends; between, the two blended. `OWN_NEAR` is `UNDER_DEPTH`: as far as her skin behind the sheet keeps its top's
 * paint. Through the opening a top's rim cuts in the sheet that paint is seen, with the rim where her skin has it --
 * so the sheet has to have it there too, or the opening shows two edges (MEASURED 2026-11-14 at her smallest bust,
 * where the sheet stands 3 to 5 mm off her all the way up: with the sheet's own places eased in from 1.5 mm off her,
 * a line showed across the bottom of a U's opening, and a scoop's rim bent where it met the sheet).
 */
const OWN_NEAR = UNDER_DEPTH, OWN_FAR = 0.02;
/**
 * Under a crew, whose sheet closes over the top of her cleavage, the skin in the top of her cleavage keeps its paint for
 * this much of her trunk below where the sheet starts going back onto her (about 7 mm on her): from above, the top of
 * a cleavage is seen over the sheet's top edge, and bare skin there read as a hole in the shirt. Under a neckline cut
 * lower (a scoop, a U, a V), the skin of her cleavage is bare all the way up past the cut, as far as the top's paint
 * covers the sheet's ends: looking down the neckline shows her skin inside the shirt, and the neckline's edge runs
 * across her cleavage on the sheet's hem instead of diving into it.
 */
const UNDER_TOP_MARGIN = 0.012;
/** Every set of `under` values ever laid, numbered, so a new bridge never repeats an old one's number. */
let underNumber = 0;
/** The sheet stops this far (a share of her trunk, about 2 mm on her) under the neckline the paint is cut to. */
const CUT_UNDER = 0.004;

const smooth01 = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };

/**
 * Average each row's pair of ends (or directions) with the `reach` rows either side: x and z only for points (a row's
 * height is its slice), every component for directions.
 */
function smoothEnds(ends: readonly (readonly [THREE.Vector3, THREE.Vector3])[], reach: number, direction: boolean): void {
  for (const side of [0, 1] as const) {
    const was = ends.map((e) => e[side].clone());
    ends.forEach((e, j) => {
      const sum = new THREE.Vector3();
      let n = 0;
      for (let d = -reach; d <= reach; d++) { const q = j + d; if (q < 0 || q >= ends.length) continue; sum.add(was[q]); n++; }
      sum.divideScalar(n);
      if (direction) e[side].copy(sum.normalize()); else { e[side].x = sum.x; e[side].z = sum.z; }
    });
  }
}

/** A slice's span: its ends `a` and `b`, her midline skin `m` under it, and how far the span stands off that skin (a share of her trunk). */
interface Row { readonly t: number; readonly a: number; readonly b: number; readonly m: number; readonly gap: number }

/** The upper outline of points (x, z), z forward, left to right (Andrew's monotone chain). */
function upperHull(pts: readonly { x: number; z: number; i: number }[]): { x: number; z: number; i: number }[] {
  const s = [...pts].sort((p, q) => p.x - q.x), h: typeof s = [];
  for (const p of s) {
    while (h.length >= 2) {
      const o = h[h.length - 2], q = h[h.length - 1];
      if ((q.x - o.x) * (p.z - o.z) - (q.z - o.z) * (p.x - o.x) >= 0) h.pop(); else break;
    }
    h.push(p);
  }
  return h;
}

/** A point of her skin: one of her triangles (its three vertices), the point's shares of them, and how deep it is drawn. */
export interface SkinSpot { readonly v: readonly [number, number, number]; readonly w: readonly [number, number, number]; readonly z: number }

/**
 * Her skin as it is SEEN FROM HER FRONT at the place (`x` across her, `y` up her): of `tris` (three vertex numbers
 * each; `px`, `py`, `pz`: where a vertex is drawn) the one that covers the place and stands front-most there
 * (`facing`: +1 when her front is +z), with the place's shares of its three corners -- so whatever her vertices carry
 * (where they are posed now, their rest places, their slip) can be read at that very point of her. Null where none of
 * them covers the place.
 */
export function skinSeen(x: number, y: number, facing: number, tris: ArrayLike<number>, px: (v: number) => number, py: (v: number) => number, pz: (v: number) => number): SkinSpot | null {
  let best: SkinSpot | null = null, depth = -Infinity;
  for (let t = 0; t + 2 < tris.length; t += 3) {
    const v0 = tris[t], v1 = tris[t + 1], v2 = tris[t + 2];
    const x0 = px(v0), x1 = px(v1), x2 = px(v2);
    if ((x < x0 && x < x1 && x < x2) || (x > x0 && x > x1 && x > x2)) continue;
    const y0 = py(v0), y1 = py(v1), y2 = py(v2);
    if ((y < y0 && y < y1 && y < y2) || (y > y0 && y > y1 && y > y2)) continue;
    // (a triangle seen edge-on covers nothing)
    const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (!(Math.abs(d) > 1e-18)) continue;
    const w0 = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d, w1 = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d, w2 = 1 - w0 - w1;
    if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
    const z = w0 * pz(v0) + w1 * pz(v1) + w2 * pz(v2);
    if (z * facing > depth) { depth = z * facing; best = { v: [v0, v1, v2], w: [w0, w1, w2], z }; }
  }
  return best;
}

export class CleavageBridge {
  readonly mesh: THREE.Mesh;
  private readonly pose: SkinPose;
  private readonly localFromWorld = new THREE.Matrix4();
  private readonly point = new Float32Array(3);
  private refreshPose(): void {
    this.localFromWorld.copy(this.body.matrixWorld).invert();
    this.pose.refresh();
  }
  private vertex(v: number, out: THREE.Vector3): THREE.Vector3 {
    this.pose.posedVertex(v, this.point);
    return out.fromArray(this.point).applyMatrix4(this.localFromWorld);
  }
  private readonly chest: number[] = [];
  /** Her skin that can be behind the sheet: in front of her neck's axis, at the bridge's heights, near her midline. */
  private readonly cleft: number[] = [];
  /** Where her chest and cleft were (her own space, x and z) when the spans were last chosen. */
  private readonly shaped = new Map<number, THREE.Vector3>();
  private rows: Row[] = [];
  /**
   * Per vertex of her body, 0 to 1: how far it is behind the sheet's solid part. The top's paint comes off it
   * (`fabricMaterial.setUnder`). `underVersion` changes whenever the values do.
   */
  readonly under: Float32Array;
  underVersion = ++underNumber;
  private underKey = '';
  private readonly at = new THREE.Vector3();
  private readonly run = new THREE.Vector3();
  private readonly own = new THREE.Vector3();
  private readonly tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] as const;
  private midX = 0;
  private params: (Pick<CoverageParams, 'neckFront' | 'neckStyle'> & { readonly strap?: number }) | null = null;
  private covered: ((v: number) => number) | null = null;
  /** The top is a drawn one (`topCut.ts`): the sheet spans all of her cleavage and its material cuts it by the top's rim. */
  private drawn = false;
  /** Her triangles that can lie behind the sheet (all three corners of `cleft`), three vertex numbers each. */
  private readonly cleftTris: Uint32Array;
  /**
   * Her skin under the sheet: for each column of each slice (by its place in `rows`), the point of her skin seen there
   * from her front when the spans were chosen (`skinSeen`) -- its triangle's three vertices (`v`, three a column; -1
   * where her skin is not seen there), the point's shares of them (`w`), and how far the span stood in front of it
   * (`gap`, her own units; negative where her skin stood in front of the span). `on`: the slices where the sheet lies
   * on her or near her -- within `EMERGE` of its first, where it grows out of her cleavage, and within `EMERGE_TOP`
   * of its last, where it goes back onto her. A drawn top's sheet is laid by them (`update`). Made again whenever the
   * spans are chosen (`reshape`).
   */
  private spots = { v: new Int32Array(0), w: new Float32Array(0), gap: new Float32Array(0), on: new Uint8Array(0) };
  /** Where each vertex of her cleft is drawn (her own space; three numbers a vertex of her body), as `skinSeen` reads it. */
  private seen = new Float32Array(0);

  constructor(private readonly body: THREE.SkinnedMesh, private readonly map: BodyMap) {
    this.pose = new SkinPose(body);
    const chestId = BODY_REGIONS.findIndex((r) => r.id === 'chest') + 1;
    for (let v = 0; v < map.region.length; v++) {
      if (map.region[v] === chestId && map.front[v] > 0 && map.trunk[v] >= T_LOW - SLAB && map.trunk[v] <= T_HIGH + SLAB && map.lateral[v] < REACH) this.chest.push(v);
      // the cleft: whichever way its skin faces (her breasts' inner faces turn sideways and down), by where it is
      const forward = map.forward ? map.forward[v] > 0 : map.front[v] > 0;
      if (forward && !Number.isFinite(map.arm[v]) && map.trunk[v] >= T_LOW - SLAB && map.trunk[v] <= T_HIGH + SLAB && map.lateral[v] < REACH) this.cleft.push(v);
    }
    this.under = new Float32Array(map.region.length);
    {
      const inCleft = new Uint8Array(map.region.length), all = (body.userData.allIndices as ArrayLike<number> | undefined) ?? body.geometry.index?.array ?? [], kept: number[] = [];
      for (const v of this.cleft) inCleft[v] = 1;
      for (let t = 0; t + 2 < all.length; t += 3) if (inCleft[all[t]] && inCleft[all[t + 1]] && inCleft[all[t + 2]]) kept.push(all[t], all[t + 1], all[t + 2]);
      this.cleftTris = Uint32Array.from(kept);
    }
    const geometry = new THREE.BufferGeometry();
    const n = this.rowCount() * (COLUMNS + 1);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('fabricRest', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('fabricRestNormal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    // (a drawn top's rim is looked up at each point's rest place and its slip, as on her skin: `fabricMaterial.ts`)
    geometry.setAttribute('fabricSlip', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    // white, with the feather in its alpha
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4).fill(1), 4));
    // wound to face out of her front: columns run along +x, rows up +y, so facing +z is (a, b, d); a figure facing -z
    // is the other way round. (Drawn double-sided, a sheet wound the wrong way has every normal turned into her and is
    // lit from behind.)
    const index: number[] = [];
    for (let r = 0; r + 1 < this.rowCount(); r++) for (let c = 0; c < COLUMNS; c++) {
      const a = r * (COLUMNS + 1) + c, b = a + 1, d = a + COLUMNS + 1, e = d + 1;
      if (map.facing > 0) index.push(a, b, d, b, e, d); else index.push(a, d, b, b, d, e);
    }
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, vertexColors: true }));
    this.mesh.name = 'cleavageBridge';
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // laid in her own (skinned, local) space: a child of her body draws where she is
    body.add(this.mesh);
  }

  /**
   * Its material blends (the feathered edges), drawn after her and still writing depth. Call after anything that
   * dresses the material, which may set it opaque.
   */
  feathered(): void {
    const m = this.mesh.material as THREE.MeshStandardMaterial;
    if (!m.transparent) { m.transparent = true; m.depthWrite = true; m.needsUpdate = true; }
  }

  private rowCount(): number { return Math.round((T_HIGH - T_LOW) / ROW_STEP) + 1; }

  /**
   * Choose the spans from her shape as it is now (call when her belly or breast shape changes, not every frame): in
   * each slice, the line touching both breasts from the front, kept where it stands off her skin.
   */
  reshape(): void {
    this.body.skeleton.update();
    this.refreshPose();
    const facing = this.map.facing, pos = this.shaped;
    pos.clear();
    let sum = 0;
    for (const v of this.chest) { const p = this.vertex(v, new THREE.Vector3()); pos.set(v, p); sum += p.x; }
    for (const v of this.cleft) if (!pos.has(v)) pos.set(v, this.vertex(v, new THREE.Vector3()));
    this.midX = this.chest.length ? sum / this.chest.length : 0;
    const trunk = this.map.trunkLength, rows: Row[] = [];
    for (let r = 0; r < this.rowCount(); r++) {
      const t = T_LOW + r * ROW_STEP, slice: { x: number; z: number; i: number }[] = [];
      for (const v of this.chest) if (Math.abs(this.map.trunk[v] - t) < SLAB) { const p = pos.get(v)!; slice.push({ x: p.x, z: p.z * facing, i: v }); }
      if (slice.length < 6) continue;
      const hull = upperHull(slice);
      const k = hull.findIndex((p, j) => j + 1 < hull.length && p.x <= this.midX && hull[j + 1].x >= this.midX);
      if (k < 0) continue;
      const a = hull[k], b = hull[k + 1];
      if (b.x - a.x < 1e-6) continue;
      const lineZ = a.z + (b.z - a.z) * ((this.midX - a.x) / (b.x - a.x));
      let skinZ = -Infinity, m = -1;
      for (const p of slice) if (Math.abs(p.x - this.midX) < 0.25 * this.map.neckRadius && p.z > skinZ) { skinZ = p.z; m = p.i; }
      if (m < 0 || lineZ - skinZ < MIN_GAP * trunk) continue;
      rows.push({ t, a: a.i, b: b.i, m, gap: (lineZ - skinZ) / trunk });
    }
    // one contiguous run: the cleavage itself
    let best: Row[] = [], run: Row[] = [];
    for (const row of rows) {
      if (run.length && row.t - run[run.length - 1].t > ROW_STEP * 1.5) run = [];
      run.push(row);
      if (run.length > best.length) best = [...run];
    }
    this.rows = best;
    // the skin behind it is measured again on the next frame
    this.underKey = '';
    this.laySpots();
  }

  /**
   * Her skin under the sheet (`spots`), from the spans as they were chosen: the point of it seen under each column of
   * each slice, from where the column is across her and up her on the span, and how far the span stands in front of
   * it. Only a drawn top's sheet is laid by them (`update`): under any other top there are none.
   */
  private laySpots(): void {
    const best = this.rows, pos = this.shaped, facing = this.map.facing, n = COLUMNS + 1;
    this.spots = { v: new Int32Array(best.length * n * 3).fill(-1), w: new Float32Array(best.length * n * 3), gap: new Float32Array(best.length * n), on: new Uint8Array(best.length) };
    if (!this.drawn || best.length < 2) return;
    const at = (v: number) => pos.get(v) ?? this.vertex(v, new THREE.Vector3());
    const ends = best.map((row) => [at(row.a).clone(), at(row.b).clone()] as const);
    smoothEnds(ends, SMOOTH, false);
    if (this.seen.length !== this.under.length * 3) this.seen = new Float32Array(this.under.length * 3);
    const S = this.seen, T = this.cleftTris, tEnd = best[best.length - 1].t, { v, w, gap, on } = this.spots;
    for (const q of this.cleft) { const p = at(q); S[q * 3] = p.x; S[q * 3 + 1] = p.y; S[q * 3 + 2] = p.z; }
    const x = (q: number) => S[q * 3], y = (q: number) => S[q * 3 + 1], z = (q: number) => S[q * 3 + 2];
    // (each of her triangles' heights once: a slice looks only among those at its own height)
    const low = new Float32Array(T.length / 3), high = new Float32Array(T.length / 3);
    for (let t = 0; t < low.length; t++) { const a = S[T[t * 3] * 3 + 1], b = S[T[t * 3 + 1] * 3 + 1], c = S[T[t * 3 + 2] * 3 + 1]; low[t] = Math.min(a, b, c); high[t] = Math.max(a, b, c); }
    best.forEach((row, j) => {
      on[j] = straightAt(row.t, best[0].t, tEnd, false) < 1 ? 1 : 0;
      const A = ends[j][0], B = ends[j][1], y0 = Math.min(A.y, B.y), y1 = Math.max(A.y, B.y), near: number[] = [];
      for (let t = 0; t < low.length; t++) if (high[t] >= y0 && low[t] <= y1) near.push(T[t * 3], T[t * 3 + 1], T[t * 3 + 2]);
      for (let c = 0; c <= COLUMNS; c++) {
        const u = c / COLUMNS, s = skinSeen(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u, facing, near, x, y, z), i = j * n + c;
        if (s) { v.set(s.v, i * 3); w.set(s.w, i * 3); gap[i] = (A.z + (B.z - A.z) * u - s.z) * facing; }
      }
    });
  }

  /**
   * Her skin's point under column `c` of slice `j` of a drawn top's sheet (`spots`), as `read` has her vertices (where
   * they are posed, their rest places, their slip), into `out`: false where there is none.
   */
  private spot(j: number, c: number, read: (v: number, out: THREE.Vector3) => THREE.Vector3, out: THREE.Vector3): boolean {
    const { v, w } = this.spots, i = (j * (COLUMNS + 1) + c) * 3;
    if (!this.drawn || !(v[i] >= 0)) return false;
    out.set(0, 0, 0);
    for (let k = i; k < i + 3; k++) out.addScaledVector(read(v[k], this.run), w[k]);
    return true;
  }

  /**
   * Which way her skin faces at its point under column `c` of slice `j` of a drawn top's sheet, as she is posed now (the
   * way that point's triangle faces, out of her), into `out`: false where there is none.
   */
  private facingAt(j: number, c: number, out: THREE.Vector3): boolean {
    const { v } = this.spots, i = (j * (COLUMNS + 1) + c) * 3;
    if (!this.drawn || !(v[i] >= 0)) return false;
    const a = this.vertex(v[i], this.tri[0]), b = this.vertex(v[i + 1], this.tri[1]), d = this.vertex(v[i + 2], this.tri[2]);
    out.subVectors(b, a).cross(this.run.subVectors(d, a));
    if (!(out.lengthSq() > 0)) return false;
    // (seen from her front, it faces her front)
    if (out.z * this.map.facing < 0) out.negate();
    out.normalize();
    return true;
  }

  /**
   * The skin behind the sheet's solid part, from the spans as they were chosen (`shaped`): between its two ends, more
   * than UNDER_DEPTH behind it, and between its emerging bottom and its top
   * (`topT`). Laid again only when the spans, the rows drawn or the top change.
   *
   * Each vertex is measured against the sheet at the vertex's own height and across-position as she stands, not at its
   * height on her trunk: on the slope of her upper breasts the two differ by millimetres, and so did the sheet's depth,
   * which bared skin the sheet actually lay on (white specks through it).
   */
  private layUnder(rows: readonly Row[], topT: number, hemmed = true): void {
    const key = rows.length < 2 || !Number.isFinite(topT) ? '' : `${rows.length}:${rows[0].t}:${topT.toFixed(5)}:${hemmed}`;
    if (key === this.underKey) return;
    this.underKey = key;
    this.under.fill(0);
    this.underVersion = ++underNumber;
    if (!key) return;
    const T = this.map.trunkLength, facing = this.map.facing;
    const at = (v: number) => this.shaped.get(v) ?? this.vertex(v, new THREE.Vector3());
    const ends = rows.map((row) => [at(row.a).clone(), at(row.b).clone()] as const);
    smoothEnds(ends, SMOOTH, false);
    const mids = rows.map((row) => at(row.m));
    const lastT = rows[rows.length - 1].t, bottomT = rows[0].t + FEATHER_BOTTOM + UNDER_RAMP_T / 2;
    const straight = rows.map((row) => straightAt(row.t, rows[0].t, lastT, hemmed));
    const ramp = (x: number, w: number) => Math.max(0, Math.min(1, 0.5 + x / w));
    // the sheet in slice k at across-position x: its height, its depth, and how far in from its nearer end x is
    const sheet = { y: 0, z: 0, inward: 0 };
    const sheetAt = (k: number, x: number) => {
      const a = ends[k][0], b = ends[k][1], m = mids[k];
      const s = Math.max(0, Math.min(1, (x - a.x) / ((b.x - a.x) || 1e-9)));
      const spanY = a.y + (b.y - a.y) * s, spanZ = a.z + (b.z - a.z) * s;
      // her cleavage under it, end - midline - end, on whichever side of her midline x is
      const [p, q] = (x - m.x) * (a.x - m.x) > 0 ? [a, m] : [m, b];
      const r = Math.max(0, Math.min(1, (x - p.x) / ((q.x - p.x) || 1e-9)));
      const skinY = p.y + (q.y - p.y) * r, skinZ = p.z + (q.z - p.z) * r, w = straight[k];
      sheet.y = skinY + (spanY - skinY) * w;
      sheet.z = skinZ + (spanZ - skinZ) * w;
      sheet.inward = Math.min(x - Math.min(a.x, b.x), Math.max(a.x, b.x) - x) / T;
      return sheet;
    };
    for (const v of this.cleft) {
      const p = at(v);
      // the two slices of the sheet either side of this skin's height
      let k = -1, yBelow = sheetAt(0, p.x).y;
      if (p.y < yBelow) continue;
      for (let j = 0; j + 1 < rows.length; j++) {
        const yAbove = sheetAt(j + 1, p.x).y;
        if (p.y <= yAbove) { k = j; break; }
        yBelow = yAbove;
      }
      if (k < 0) continue;
      const below = { ...sheetAt(k, p.x) }, above = sheetAt(k + 1, p.x);
      const f = Math.max(0, Math.min(1, (p.y - below.y) / ((above.y - below.y) || 1e-9)));
      const z = below.z + (above.z - below.z) * f, inward = below.inward + (above.inward - below.inward) * f;
      const t = rows[k].t + (rows[k + 1].t - rows[k].t) * f;
      const depth = ((z - p.z) * facing) / T + LIFT;
      this.under[v] = ramp(inward, UNDER_RAMP) * ramp(depth - UNDER_DEPTH, UNDER_DEPTH_RAMP) * ramp(t - bottomT, UNDER_RAMP_T) * ramp(topT - t, UNDER_RAMP_T);
    }
  }

  /**
   * Where the sheet's top is cut, as a trunk height: level, a hair under the lowest point of the top's neckline (at her
   * midline: a crew's depth, the dip of a scoop, a U or a V -- `necklineTop`). The sheet only spans her cleavage, and
   * above a neckline's lowest point the middle of her cleavage is the opening, so there is nothing for it to span; on
   * the neckline's rising sides the paint is the shirt, and its edge the neckline. Cut to the curve instead, its top on
   * her breasts stood above the paint's edge in a notch and in teeth (Joshua, 2026-10-23: "there are some remaining
   * color on her breasts").
   */
  private cutAt(): number {
    const cut = necklineTop(this.params!, 0);
    return Number.isFinite(cut) ? cut - CUT_UNDER : cut;
  }

  /**
   * Dress the bridge for a top (its neckline, and how much of each vertex its paint covers), or take it off (null).
   * `drawn`: the top's cut is drawn (`topCut.ts`), and the sheet's material cuts it by the top's rim (the caller lays
   * the cut on it: `setFabricCut`). Who dresses its material: the caller, with the top's fabric (`setFabricLayer`).
   */
  wear(top: { readonly params: Pick<CoverageParams, 'neckFront' | 'neckStyle'> & { readonly strap?: number }; readonly covered: (v: number) => number; readonly drawn?: boolean } | null): void {
    const was = this.drawn;
    this.params = top?.params ?? null;
    this.covered = top?.covered ?? null;
    this.drawn = !!top?.drawn;
    if (top && !this.rows.length) this.reshape();
    // (her skin under the sheet is found for a drawn top alone: one put on over the spans as they are finds it now)
    else if (this.drawn !== was) this.laySpots();
    this.mesh.visible = !!top && this.rows.length >= 2;
    if (!this.mesh.visible) this.layUnder([], NaN);
  }

  /**
   * (a probe's) Whether the sheet is drawn, whether it is a drawn top's, and its slices: how many, the heights on her
   * trunk they run from and to, how far the first and the last stand off her middle skin (shares of her trunk), and
   * how many of them, at its bottom and its top, lie on her skin's own points (`spots.on`; a drawn top's sheet's).
   */
  state(): { readonly visible: boolean; readonly drawn: boolean; readonly slices: number; readonly from: number | null; readonly to: number | null; readonly gaps: readonly number[]; readonly own: number } {
    const r = this.rows;
    return { visible: this.mesh.visible, drawn: this.drawn, slices: r.length, from: r.length ? r[0].t : null, to: r.length ? r[r.length - 1].t : null, gaps: r.length ? [r[0].gap, r[r.length - 1].gap] : [], own: this.spots.on.reduce((n, t) => n + t, 0) };
  }

  /**
   * (a probe's) HOW THE SHEET MEETS HER SKIN, as it is laid now. At each of the sheet's points: her skin as it is seen
   * from her front at that place (`skinSeen`), how far the sheet stands in front of it, and how far the place the
   * sheet's point looks a drawn top's rim up at (its rest place and its slip) is from the place her skin's own point
   * does -- across her and up her. A rim that crosses where the sheet lies on her skin steps by that much. One entry a
   * row of the sheet, from its bottom up: its height on her trunk, how solid the sheet is at each column (0..1), and a
   * column's [off across, off up, in front] in millimetres (`unitsPerMetre`: her mesh's units a metre); null where
   * her skin is not seen behind the point.
   */
  junction(unitsPerMetre: number): { readonly t: number; readonly solid: readonly number[]; readonly cols: readonly (readonly [number, number, number] | null)[] }[] | null {
    const rest = this.body.geometry.getAttribute('fabricRest') as THREE.BufferAttribute | undefined;
    if (!this.mesh.visible || this.rows.length < 2 || !rest) return null;
    const slip = this.body.geometry.getAttribute('fabricSlip') as THREE.BufferAttribute | undefined;
    this.body.skeleton.update();
    this.refreshPose();
    if (this.seen.length !== this.under.length * 3) this.seen = new Float32Array(this.under.length * 3);
    const S = this.seen, p = new THREE.Vector3(), facing = this.map.facing;
    for (const v of this.cleft) { this.vertex(v, p); S[v * 3] = p.x; S[v * 3 + 1] = p.y; S[v * 3 + 2] = p.z; }
    const x = (v: number) => S[v * 3], y = (v: number) => S[v * 3 + 1], z = (v: number) => S[v * 3 + 2];
    const g = this.mesh.geometry, P = g.getAttribute('position'), R = g.getAttribute('fabricRest'), L = g.getAttribute('fabricSlip'), C = g.getAttribute('color');
    const total = this.rowCount(), lift = LIFT * this.map.trunkLength, mm = (n: number) => Math.round((n / unitsPerMetre) * 10000) / 10;
    const from = this.rows[0].t, to = this.rows[this.rows.length - 1].t, out: { t: number; solid: number[]; cols: (readonly [number, number, number] | null)[] }[] = [];
    for (let r = 0; r < total; r++) {
      const solid: number[] = [], cols: (readonly [number, number, number] | null)[] = [];
      for (let c = 0; c <= COLUMNS; c++) {
        const i = r * (COLUMNS + 1) + c, s = skinSeen(P.getX(i), P.getY(i), facing, this.cleftTris, x, y, z);
        solid.push(Math.round(C.getW(i) * 100) / 100);
        if (!s) { cols.push(null); continue; }
        let sx = 0, sy = 0;
        for (let k = 0; k < 3; k++) { sx += s.w[k] * (rest.getX(s.v[k]) + (slip ? slip.getX(s.v[k]) : 0)); sy += s.w[k] * (rest.getY(s.v[k]) + (slip ? slip.getY(s.v[k]) : 0)); }
        cols.push([mm(R.getX(i) + L.getX(i) - sx), mm(R.getY(i) + L.getY(i) - sy), mm((P.getZ(i) - s.z) * facing - lift)]);
      }
      out.push({ t: Math.round((from + (r / (total - 1)) * (to - from)) * 10000) / 10000, solid, cols });
    }
    return out;
  }

  /** Re-lay the sheet between where its ends are now. Call once a frame, after her skeleton has moved. */
  update(): void {
    if (!this.mesh.visible || !this.params || this.rows.length < 2) return;
    this.body.skeleton.update();
    this.refreshPose();
    const g = this.mesh.geometry, P = g.getAttribute('position') as THREE.BufferAttribute, R = g.getAttribute('fabricRest') as THREE.BufferAttribute;
    const RN = g.getAttribute('fabricRestNormal') as THREE.BufferAttribute;
    const rest = this.body.geometry.getAttribute('fabricRest') as THREE.BufferAttribute | undefined;
    const lift = LIFT * this.map.trunkLength * this.map.facing;
    // the rows the top's paint covers at both ends, from the bottom up (a drawn top's: all of them -- its rim cuts the sheet)
    let top = 0;
    while (top < this.rows.length && (this.drawn || !this.covered || (this.covered(this.rows[top].a) > 0.5 && this.covered(this.rows[top].b) > 0.5))) top++;
    const rows = this.rows.slice(0, Math.max(2, top));
    const ends = rows.map((row) => [this.vertex(row.a, new THREE.Vector3()), this.vertex(row.b, new THREE.Vector3())] as const);
    const mids = rows.map((row) => this.vertex(row.m, new THREE.Vector3()));
    // the ends hop a little sideways from slice to slice (each is the vertex the line touches): smoothed over the
    // slices either side, so the sheet's sides run in a smooth line over her breasts
    smoothEnds(ends, SMOOTH, false);
    // lit as part of the breasts it joins: each end takes her own surface direction there, rounding forward through
    // the middle
    const fwd = new THREE.Vector3(0, 0, this.map.facing), BN = this.body.geometry.getAttribute('normal');
    // her bind-pose normal, turned by the bones that move the vertex (the skinning is affine, so the difference of two
    // transformed points is the turned direction)
    const origin = new THREE.Vector3();
    const normalOf = (v: number) => {
      const n = this.body.applyBoneTransform(v, new THREE.Vector3(BN.getX(v), BN.getY(v), BN.getZ(v)));
      return n.sub(this.body.applyBoneTransform(v, origin.set(0, 0, 0))).normalize();
    };
    // smoothed further up and down than the ends are: at her nipples' height the ends are her nipples, and their own
    // surface turns sharply
    const normals = rows.map((row) => [normalOf(row.a), normalOf(row.b)] as const);
    smoothEnds(normals, SMOOTH_NORMAL, true);
    const N = g.getAttribute('normal') as THREE.BufferAttribute, C = g.getAttribute('color') as THREE.BufferAttribute;
    // LIKE HER SKIN, each of the sheet's points has a rest place, where its weave is looked up, and under a drawn top a
    // slip, added to it where the top's rim is looked up (`fabricMaterial.ts`). At the sheet's ends both are her own
    // vertices', so its weave and the rim run on from her skin onto it without a step
    const slip = this.drawn && rest ? (this.body.geometry.getAttribute('fabricSlip') as THREE.BufferAttribute | undefined) : undefined;
    const posedAt = (v: number, o: THREE.Vector3) => this.vertex(v, o);
    const restAt = rest ? (v: number, o: THREE.Vector3) => o.set(rest.getX(v), rest.getY(v), rest.getZ(v)) : posedAt;
    const slipAt = (v: number, o: THREE.Vector3) => (slip ? o.set(slip.getX(v), slip.getY(v), slip.getZ(v)) : o.set(0, 0, 0));
    // the pattern is laid from the same smoothed ends, or the knit zigzags from row to row
    const restEnds = rows.map((row) => [restAt(row.a, new THREE.Vector3()), restAt(row.b, new THREE.Vector3())] as const);
    smoothEnds(restEnds, SMOOTH, false);
    const restMids = rows.map((row) => restAt(row.m, new THREE.Vector3()));
    const slipEnds = rows.map((row) => [slipAt(row.a, new THREE.Vector3()), slipAt(row.b, new THREE.Vector3())] as const);
    smoothEnds(slipEnds, SMOOTH, false);
    const slipMids = rows.map((row) => slipAt(row.m, new THREE.Vector3()));
    const L = g.getAttribute('fabricSlip') as THREE.BufferAttribute;
    const total = this.rowCount(), tEnd = rows[rows.length - 1].t;
    let k = 0, f = 0, u = 0;
    const place = (t: number) => {
      k = 0;
      while (k + 2 < rows.length && rows[k + 1].t < t) k++;
      f = Math.max(0, Math.min(1, (t - rows[k].t) / Math.max(1e-6, rows[k + 1].t - rows[k].t)));
    };
    // (a drawn top's sheet is whole: its material cuts it)
    const cut = this.drawn ? Infinity : this.cutAt();
    // (and SEEN only up to DRAWN_OVER_DIP over its neckline's lowest point, faded out over DRAWN_FADE above it. Above
    // that a low neckline's opening is wider than her cleavage: there is nothing for the sheet to span, and where it
    // stood off her across the gap a top's rim on it and on her skin behind did not meet -- MEASURED 2026-11-20 in the
    // room, a low V and a low U (0.7 of her trunk) from her three-quarter at her 10% and 73% bellies: a notch in the far
    // side of the rim at the sheet's top, gone with the sheet left off. Folded down onto that height instead, as a level
    // neckline's sheet is, its top rows were the garment by the rim and stood across the opening)
    const seenTo = this.drawn && this.params.neckFront !== null && this.params.neckFront !== undefined ? this.params.neckFront + DRAWN_OVER_DIP : Infinity;
    // a neckline that dips below where her cleavage opens leaves no gap under it to span: nothing is drawn (laid flat
    // at its lowest slice instead, the sheet showed as a strip across the opening, above the paint's neckline)
    if (cut <= rows[0].t + ROW_STEP) {
      for (let i = 0; i < C.count; i++) C.setW(i, 0);
      C.needsUpdate = true;
      this.layUnder([], NaN);
      return;
    }
    const hemmed = cut < tEnd;
    this.layUnder(rows, hemmed ? tEnd : tEnd - EMERGE_TOP - UNDER_TOP_MARGIN, hemmed);
    const widths = ends.map((e) => e[0].distanceTo(e[1]) / this.map.trunkLength);
    for (let c = 0; c <= COLUMNS; c++) {
      u = c / COLUMNS;
      for (let r = 0; r < total; r++) {
        // rows past the last one (or above the neckline's lowest point) fold onto its cut
        const want = rows[0].t + (r / (total - 1)) * (tEnd - rows[0].t);
        const t = Math.min(want, cut);
        place(t);
        // the span (straight from end to end), and her cleavage under it (end, midline, end), blended by how far up
        // the bridge this is: at its bottom it lies on her and straightens into the span within EMERGE (and a crew's goes
        // back onto her at its top within EMERGE_TOP)
        const straight = straightAt(t, rows[0].t, tEnd, hemmed);
        // (her skin under a slice: the two straight runs from its ends to her middle skin -- or, where a drawn top's
        // sheet lies on her at its bottom and its top, her skin's own point under the column, as `read` has her
        // vertices. `laid`: this is the sheet's rest place or its slip, not where it stands: wherever it stands
        // within OWN_NEAR of her skin it has her skin's own, easing into what the span carries by OWN_FAR)
        const at = (pair: readonly (readonly [THREE.Vector3, THREE.Vector3])[], mid: readonly THREE.Vector3[], j: number, out: THREE.Vector3, read: (v: number, out: THREE.Vector3) => THREE.Vector3, laid: boolean) => {
          const span = this.at.copy(pair[j][0]).lerp(pair[j][1], u), on = this.spots.on[j] === 1;
          const has = (on || laid) && this.spot(j, c, read, this.own);
          const skin = has && on ? out.copy(this.own) : u < 0.5 ? out.copy(pair[j][0]).lerp(mid[j], u * 2) : out.copy(mid[j]).lerp(pair[j][1], (u - 0.5) * 2);
          skin.lerp(span, straight);
          if (has && laid) skin.lerp(this.own, 1 - smooth01(((this.spots.gap[j * (COLUMNS + 1) + c] * straight) / this.map.trunkLength - OWN_NEAR) / (OWN_FAR - OWN_NEAR)));
          return skin;
        };
        const lay = (pair: readonly (readonly [THREE.Vector3, THREE.Vector3])[], mid: readonly THREE.Vector3[], out: THREE.Vector3, read: (v: number, out: THREE.Vector3) => THREE.Vector3, laid = true) => {
          const p0 = at(pair, mid, k, new THREE.Vector3(), read, laid), p1 = at(pair, mid, k + 1, out, read, laid);
          return p1.set(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f, p0.z + (p1.z - p0.z) * f);
        };
        const i = r * (COLUMNS + 1) + c, p = lay(ends, mids, new THREE.Vector3(), posedAt, false);
        P.setXYZ(i, p.x, p.y, p.z + lift);
        // lit like the breasts it joins: each end's surface direction, rounding forward through the middle
        // (and where a drawn top's sheet lies on her skin's own point, as her skin faces there: the way that point's
        // triangle faces as she is posed now -- her shapes turn her skin under her breasts far from where her ends face)
        const nk = (j: number) => {
          const n = normals[j][0].clone().lerp(normals[j][1], u).addScaledVector(fwd, 0.6 * Math.sin(Math.PI * u)).normalize();
          return straight < 1 && this.spots.on[j] === 1 && this.facingAt(j, c, this.own) ? this.own.clone().lerp(n, straight).normalize() : n;
        };
        const n = nk(k).lerp(nk(k + 1), f).normalize();
        N.setXYZ(i, n.x, n.y, n.z);
        // its rest place and its slip: laid as its place is, from her vertices' own
        const q = lay(restEnds, restMids, p, restAt);
        R.setXYZ(i, q.x, q.y, q.z);
        const s = lay(slipEnds, slipMids, p, slipAt);
        L.setXYZ(i, s.x, s.y, s.z);
        RN.setXYZ(i, 0, 0, this.map.facing);
        // feathered into her where it meets her (its ends on her breasts, its bottom in her cleavage, its top where her
        // cleavage closes); a neckline's cut is a hem and stays sharp
        const width = widths[k] + (widths[k + 1] - widths[k]) * f;
        const alpha = smooth01((Math.min(u, 1 - u) * width) / FEATHER_SIDE) * smooth01((t - rows[0].t) / FEATHER_BOTTOM) * (hemmed ? 1 : smooth01((tEnd - t) / FEATHER_TOP)) * smooth01((seenTo - want) / DRAWN_FADE);
        C.setXYZW(i, 1, 1, 1, alpha);
      }
    }
    P.needsUpdate = true; R.needsUpdate = true; L.needsUpdate = true; RN.needsUpdate = true; C.needsUpdate = true;
    (g.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    g.computeBoundingSphere();
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
