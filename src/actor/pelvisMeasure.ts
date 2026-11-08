/**
 * HER PELVIS, MEASURED (the skeleton-outward plan, Phase 1: "Measure the pelvis properly: the inlet ring and the curved
 * path of the birth canal, saved as data"; Joshua, 2026-11-08: "Go ahead and start it").
 *
 * The bony birth canal, measured off her skeleton's own mesh the way an obstetrician's pelvimetry describes it, so the
 * womb, the birth canal and the baby's way out are built against her real bone:
 *
 *  - THE SYMPHYSIS: where the pubic bones meet at her front, on her midline. Its back face is the canal's front wall.
 *  - THE PROMONTORY and THE OBSTETRIC CONJUGATE: the shortest way from the back of the symphysis to the sacrum's front
 *    on her midline -- the narrowest the inlet is from front to back (normal 10-12 cm). The sacrum's point it reaches is
 *    the promontory.
 *  - THE PLANES: the canal's cross-sections. The classic planes of the pelvis all pass through the symphysis, turning
 *    about it from the inlet's down through the midpelvis to the outlet, and the canal's centre line -- the curve of
 *    Carus -- is very nearly a circle about it. So each plane here contains her left-right axis and a direction from
 *    the symphysis, turned down and back by PLANES.stepDeg from the conjugate's, and is cut exactly through the mesh's
 *    triangles. Rays from the canal's centre in each cut find its ring: the bone the baby's head would meet.
 *  - THE INLET: the pelvic brim. The planes whose ring is closed all round are the true pelvis's (above them the cut
 *    runs out between the iliac wings of the false pelvis; below, the sciatic notches open its back), and of them the
 *    brim is the narrowest: its widest side-to-side span is the inlet's transverse diameter (normal 13-14.5 cm).
 *  - THE MIDPELVIS: among the planes that still reach the sacrum, the narrowest side to side across the canal's centre
 *    -- the ischial spines' plane, the interspinous diameter (normal 9.5-11.5 cm), where the baby's head is "station 0".
 *  - THE OUTLET: the ischial tuberosities, her pelvis's lowest points either side behind the symphysis (what she sits
 *    on). The gap between their inner faces, side to side at their own depth just above their lowest (PELVIS_MEASURE
 *    .tuberAbove), is the intertuberous diameter (normal 10-12 cm); the outlet's plane is the one through their middle.
 *  - THE AXIS: the canal's own curved path from the inlet to the outlet: the arc about the symphysis its measured
 *    centres lie on.
 *
 * Her bind frame (as `scripts/measureContacts.ts`'s rest frame): metres, +y up, +z her front, +x across her. Pure: plain
 * arrays in and out, no three, so the room, the measuring script and the tests all run the same code.
 */

export type P3 = readonly [number, number, number];
export type P2 = readonly [number, number];

/** The tuning of the measure. GAME TUNING: sizes against a pelvis, chosen so each landmark is found with room to spare. */
export const PELVIS_MEASURE = Object.freeze({
  /** Her midline: points within this of it, across, metres. */
  midline: 0.008,
  /** The symphysis: the front of her midline, within this of its foremost point, metres. */
  symphysisDepth: 0.04,
  /** Its back face and the sacrum's front are read in slices this tall, metres. */
  slice: 0.0025,
  /** The sacrum lies at least this far behind the symphysis's back face, metres. */
  behind: 0.02,
  /** The planes: every this many degrees, turning down and back from the conjugate's, to `lastDeg`. */
  stepDeg: 2,
  lastDeg: 120,
  /** Rays round each cut, every this many degrees; a ray reaching no bone within `reach` metres has found no ring. */
  rayDeg: 2,
  reach: 0.12,
  /** A ring is closed when every ray reaches bone and no two neighbouring hits are further apart than this, metres. */
  closedGap: 0.02,
  /** Where the front-to-back rays start, this far behind the symphysis, metres (past the back face, short of the sacrum). */
  probe: 0.03,
  /** Side-to-side spans are read across the canal's centre within this of it, front to back, metres. */
  centreBand: 0.03,
  /** The tuberosities: her pelvis's lowest points at least this far to either side of her midline, metres... */
  tuberSide: 0.03,
  /** ...whose inner faces are read this high above their lowest, at their depth, metres (the tuberosity is a long ridge:
   * higher up and further forward its faces come together as the ischial rami run to the symphysis). */
  tuberAbove: 0.003,
});

export interface PelvisPlane {
  /** How far it is turned down and back from the conjugate's plane, degrees. */
  readonly angleDeg: number;
  /** Its direction from the symphysis (unit, in the plane) and its normal (unit). */
  readonly along: P3;
  readonly normal: P3;
  /** The canal's centre in it (bind metres), and how it was found: between the symphysis and the sacrum, or on the arc. */
  readonly centre: P3;
  readonly centred: 'walls' | 'arc';
  /** Front to back through the centre: the symphysis's back face to the sacrum's front, metres; null below the sacrum. */
  readonly ap: number | null;
  /** Side to side: the widest span of its ring, and the narrowest across its centre, metres; 0 where none. */
  readonly widest: number;
  readonly narrowest: number;
  /** Its ring (bind metres, the rays' hits in order round it), and whether it is closed all round. */
  readonly ring: readonly P3[];
  readonly closed: boolean;
}

export interface PelvisMeasure {
  readonly symphysis: { readonly top: P3; readonly bottom: P3; readonly centre: P3; readonly back: P3 };
  readonly promontory: P3;
  readonly obstetricConjugate: number;
  readonly planes: readonly PelvisPlane[];
  readonly inlet: { readonly plane: number; readonly transverse: number; readonly ap: number };
  readonly midpelvis: { readonly plane: number; readonly interspinous: number };
  readonly outlet: { readonly plane: number; readonly intertuberous: number; readonly tuberosities: readonly [P3, P3] };
  /** The canal's curved centre line, inlet to outlet (bind metres): the arc of `arcRadius` about the symphysis's centre. */
  readonly axis: readonly P3[];
  /** Its radius about the symphysis's centre (the curve of Carus as the arc it nearly is): the mean of the planes' centres
   * found between the symphysis and the sacrum, metres. */
  readonly arcRadius: number;
}

export class PelvisMeasureError extends Error {}

const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: P3, b: P3, k = 1): P3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Where a plane cuts the triangles: segments in the plane's own coordinates (u across, v along `along` from `origin`). */
export function cutPelvis(points: ArrayLike<number>, triangles: ArrayLike<number>, origin: P3, along: P3, normal: P3, across: P3 = [1, 0, 0]): Float64Array {
  const h = (i: number) => (points[3 * i] - origin[0]) * normal[0] + (points[3 * i + 1] - origin[1]) * normal[1] + (points[3 * i + 2] - origin[2]) * normal[2];
  const out: number[] = [];
  const uv = (a: number, b: number, ha: number, hb: number) => {
    const s = ha / (ha - hb);
    const p: P3 = [points[3 * a] + (points[3 * b] - points[3 * a]) * s, points[3 * a + 1] + (points[3 * b + 1] - points[3 * a + 1]) * s, points[3 * a + 2] + (points[3 * b + 2] - points[3 * a + 2]) * s];
    const r = sub(p, origin);
    out.push(dot(r, across), dot(r, along));
  };
  for (let t = 0; t + 2 < triangles.length; t += 3) {
    const a = triangles[t], b = triangles[t + 1], c = triangles[t + 2], ha = h(a), hb = h(b), hc = h(c);
    const before = out.length;
    if ((ha < 0) !== (hb < 0)) uv(a, b, ha, hb);
    if ((hb < 0) !== (hc < 0)) uv(b, c, hb, hc);
    if ((hc < 0) !== (ha < 0)) uv(c, a, hc, ha);
    if (out.length - before !== 4) out.length = before;
  }
  return Float64Array.from(out);
}

/** How far a ray from (ox, oy) along (dx, dy) goes before it meets a segment of the cut; Infinity if it meets none. */
export function rayToCut(cut: Float64Array, ox: number, oy: number, dx: number, dy: number): number {
  let best = Infinity;
  for (let k = 0; k + 3 < cut.length; k += 4) {
    const px = cut[k], py = cut[k + 1], ex = cut[k + 2] - px, ey = cut[k + 3] - py;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-14) continue;
    const wx = px - ox, wy = py - oy, t = (wx * ey - wy * ex) / den, s = (wx * dy - wy * dx) / den;
    if (t > 1e-7 && s >= 0 && s <= 1 && t < best) best = t;
  }
  return best;
}

/** Points near her midline (x within `PELVIS_MEASURE.midline` of `centreX`). */
function midlinePoints(points: ArrayLike<number>, centreX: number): P3[] {
  const out: P3[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) if (Math.abs(points[i] - centreX) < PELVIS_MEASURE.midline) out.push([points[i], points[i + 1], points[i + 2]]);
  return out;
}

/** Per slice of height, the point furthest back (`'back'`: least z) or furthest forward (`'front'`). */
function surface(pts: readonly P3[], which: 'back' | 'front'): P3[] {
  if (!pts.length) return [];
  const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1])), h = PELVIS_MEASURE.slice, out: P3[] = [];
  for (let y = lo; y <= hi + 1e-9; y += h) {
    let best: P3 | null = null;
    for (const p of pts) if (p[1] >= y && p[1] < y + h && (!best || (which === 'back' ? p[2] < best[2] : p[2] > best[2]))) best = p;
    if (best) out.push(best);
  }
  return out;
}

/**
 * Her pelvis measured: `points` (x, y, z, bind metres) and `triangles` (indices into them) are her pelvis bone's own;
 * `centreX` is her midline across (the middle of her hip joints).
 */
export function measurePelvis(points: ArrayLike<number>, triangles: ArrayLike<number>, centreX: number): PelvisMeasure {
  const T = PELVIS_MEASURE, mid = midlinePoints(points, centreX);
  if (mid.length < 20) throw new PelvisMeasureError('too few points on her midline to find the symphysis');
  // the symphysis: her midline's front
  const foremost = Math.max(...mid.map((p) => p[2]));
  const front = mid.filter((p) => p[2] > foremost - T.symphysisDepth);
  const symBack = surface(front, 'back');
  const topY = Math.max(...front.map((p) => p[1])), bottomY = Math.min(...front.map((p) => p[1]));
  const meanZ = front.reduce((s, p) => s + p[2], 0) / front.length;
  const centre: P3 = [centreX, (topY + bottomY) / 2, meanZ];
  const backZ = Math.min(...symBack.map((p) => p[2]));
  // the sacrum's front on her midline, above the symphysis and well behind it
  const wall = surface(mid.filter((p) => p[2] < backZ - T.behind && p[1] > topY), 'front');
  if (!wall.length || !symBack.length) throw new PelvisMeasureError('no sacrum found behind the symphysis');
  // the obstetric conjugate: the shortest way between them (front to back and up and down: on the midline)
  let conj = Infinity, prom: P3 = wall[0], symP: P3 = symBack[0];
  for (const w of wall) for (const s of symBack) { const d = Math.hypot(w[1] - s[1], w[2] - s[2]); if (d < conj) { conj = d; prom = w; symP = s; } }
  // the planes, turning about the symphysis's centre from the conjugate's direction down and back
  const len = Math.hypot(prom[1] - symP[1], prom[2] - symP[2]), d0y = (prom[1] - symP[1]) / len, d0z = (prom[2] - symP[2]) / len;
  const planes: PelvisPlane[] = [];
  const found: number[] = [];
  for (let deg = 0; deg <= T.lastDeg + 1e-9; deg += T.stepDeg) {
    const a = (-deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const along: P3 = [0, d0y * c - d0z * s, d0y * s + d0z * c];
    // normal = across x along (her left-right axis is +x)
    const normal: P3 = [0, -along[2], along[1]];
    const cut = cutPelvis(points, triangles, centre, along, normal);
    if (!cut.length) continue;
    // where her midline meets bone in front of the probe and behind it: the symphysis's back face and the sacrum's front
    const ox = centreX - centre[0];
    const toBack = rayToCut(cut, ox, T.probe, 0, 1), toFront = rayToCut(cut, ox, T.probe, 0, -1);
    const vf = Number.isFinite(toFront) ? T.probe - toFront : 0;
    const walls = Number.isFinite(toBack) && toBack < T.reach;
    const vb = walls ? T.probe + toBack : NaN;
    let cv: number, centred: 'walls' | 'arc';
    if (walls) { cv = (vf + vb) / 2; centred = 'walls'; found.push(cv); }
    else if (found.length) { cv = found.reduce((x, y) => x + y, 0) / found.length; centred = 'arc'; }
    else continue;
    const ring: P3[] = [], uvs: P2[] = [];
    let closed = true;
    for (let r = 0; r < 360; r += T.rayDeg) {
      const ra = (r * Math.PI) / 180, dx = Math.cos(ra), dy = Math.sin(ra), t = rayToCut(cut, ox, cv, dx, dy);
      if (!(t < T.reach)) { closed = false; continue; }
      const u = ox + dx * t, v = cv + dy * t;
      uvs.push([u, v]);
      ring.push(add(add(centre, [1, 0, 0], u), along, v));
    }
    for (let k = 0; closed && k < uvs.length; k++) { const p = uvs[k], q = uvs[(k + 1) % uvs.length]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > T.closedGap) closed = false; }
    // side to side: the widest span of the ring (points level with each other, front to back), and the narrowest
    // across the centre (both side walls met by a level ray within the centre's band)
    let widest = 0;
    for (const p of uvs) for (const q of uvs) if (Math.abs(p[1] - q[1]) < 0.005) widest = Math.max(widest, Math.abs(p[0] - q[0]));
    let narrowest = Infinity;
    for (let v = cv - T.centreBand; v <= cv + T.centreBand + 1e-9; v += 0.0025) {
      const l = rayToCut(cut, ox, v, -1, 0), r = rayToCut(cut, ox, v, 1, 0);
      if (l < T.reach && r < T.reach) narrowest = Math.min(narrowest, l + r);
    }
    planes.push({
      angleDeg: deg, along, normal, centre: add(add(centre, [1, 0, 0], ox), along, cv), centred,
      ap: walls ? vb - vf : null, widest, narrowest: Number.isFinite(narrowest) ? narrowest : 0, ring, closed,
    });
  }
  // the inlet: of the planes closed all round, the narrowest
  let inletAt = -1;
  planes.forEach((p, k) => { if (p.closed && p.ap !== null && (inletAt < 0 || p.widest < planes[inletAt].widest)) inletAt = k; });
  if (inletAt < 0) throw new PelvisMeasureError('no closed ring: the pelvic brim was not found');
  // the midpelvis: below the inlet and still reaching the sacrum, the narrowest across the centre
  let midAt = -1;
  for (let k = inletAt + 1; k < planes.length; k++) if (planes[k].ap !== null && planes[k].narrowest > 0 && (midAt < 0 || planes[k].narrowest < planes[midAt].narrowest)) midAt = k;
  // the outlet: the tuberosities, her lowest points either side behind the symphysis, and the gap between their inner
  // faces at their own depth just above their lowest (a level cut, rays out from her midline)
  const lowest = (side: 1 | -1): P3 | null => {
    let best: P3 | null = null;
    for (let i = 0; i + 2 < points.length; i += 3) {
      const x = points[i], y = points[i + 1], z = points[i + 2];
      if (side * (x - centreX) > T.tuberSide && z < backZ - T.behind && (!best || y < best[1])) best = [x, y, z];
    }
    return best;
  };
  const tl = lowest(1), tr = lowest(-1);
  if (midAt < 0 || !tl || !tr) throw new PelvisMeasureError('the midpelvis or the ischial tuberosities were not found');
  const tz = (tl[2] + tr[2]) / 2, ty = Math.min(tl[1], tr[1]);
  const level = cutPelvis(points, triangles, [centreX, ty + T.tuberAbove, 0], [0, 0, 1], [0, 1, 0]);
  const intertuberous = rayToCut(level, 0, tz, -1, 0) + rayToCut(level, 0, tz, 1, 0);
  if (!(intertuberous < 2 * T.reach)) throw new PelvisMeasureError('the tuberosities\' inner faces were not found');
  // the outlet's plane: the one turned nearest to the middle between them
  const toTuber = Math.atan2(ty - centre[1], tz - centre[2]);
  let outAt = -1, outMiss = Infinity;
  planes.forEach((p, k) => { const miss = Math.abs(Math.atan2(p.along[1], p.along[2]) - toTuber); if (k > midAt && miss < outMiss) { outMiss = miss; outAt = k; } });
  if (outAt < 0) throw new PelvisMeasureError('no plane reaches the outlet');
  // the canal's centre line: the arc its measured centres lie on about the symphysis (their mean distance from it), so
  // it runs smoothly from the planes centred between the bone to those below the sacrum, centred on the arc
  const arcRadius = found.reduce((x, y) => x + y, 0) / found.length;
  const axis = planes.slice(inletAt, outAt + 1).map((p) => add(add(centre, [1, 0, 0], centreX - centre[0]), p.along, arcRadius));
  return {
    symphysis: { top: [centreX, topY, front.find((p) => p[1] === topY)![2]], bottom: [centreX, bottomY, front.find((p) => p[1] === bottomY)![2]], centre, back: symP },
    promontory: prom, obstetricConjugate: conj, planes,
    inlet: { plane: inletAt, transverse: planes[inletAt].widest, ap: planes[inletAt].ap! },
    midpelvis: { plane: midAt, interspinous: planes[midAt].narrowest },
    outlet: { plane: outAt, intertuberous, tuberosities: [tl, tr] },
    axis, arcRadius,
  };
}
