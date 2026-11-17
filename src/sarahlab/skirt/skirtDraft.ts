/**
 * A SKIRT, DRAFTED ROUND HER (Joshua, 2026-11-16: "a combination of paint and cloth for like skirts, etc… that are loose
 * and flowing"; "We could create a high and a low skirt meaning above or below the belly. Like the above and below
 * leggings… have the top of the skirt above or below the belly, with adjustable length all the way down to the ground
 * and you can select how tight/close it is to the body"; "the top is either one or the other, but both can reach the
 * floor length").
 *
 * The pilot of paint and cloth together: its FITTED part is paint on her skin (a short in its own colour, whose
 * waistband is the skirt's: `sarahLabTool.ts`), its LOOSE part is this -- one sheet of cloth hung from a ring round
 * her just under that waistband, laid here in her REST space (metres; `garment/types.ts` BodyInput) and simulated by
 * the room's cloth (`clothSkirt.ts`).
 *
 * Three numbers, his three:
 * - TOP: 'over' her belly or 'under' it -- the ring's heights at her front, her sides and her back, as shares of her
 *   trunk (0 her hip joints, 1 the base of her neck), a little under the painted waistband's own (`SKIRT_TOPS`); and
 *   UNDER HER BELLY THE RING IS THE UNDER-BELLY LEGGINGS' OWN LINE as it lies on her (`underLine`, `SKIRT_LINE`);
 * - LENGTH: 0 a mini, 1 to the floor, from either top (the hem is level: one height all round, counted from
 *   `SKIRT_TOPS`' heights whatever her belly does to the ring);
 * - FLARE: 0 a tube that lies on her hips and falls straight from the widest of her, 1 a full skirt.
 *
 * Its rest shape IS its cut: a ring that stands just off her, and under it a surface that never comes back in toward
 * her going down (the convex outline of her hips and both legs at each height, `garment/measure.ts` dressForm -- a
 * skirt spans her legs) and opens by FLARE's angle. The cloth's edges rest at their lengths here, so a wider cut has
 * the cloth for its folds.
 *
 * Pure: no three, no DOM.
 */
import { dressForm, hullAt } from '../garment/measure';
import type { BodyInput } from '../garment/types';

export type SkirtTop = 'over' | 'under';
export interface SkirtSettings {
  readonly top: SkirtTop;
  /** 0 a mini .. 1 to the floor */
  readonly length: number;
  /** 0 a tube on her hips .. 1 a full skirt */
  readonly flare: number;
  /**
   * Worn with a shirt of cloth: true, the skirt is OVER it (the shirt tucked in); false, the shirt hangs over the skirt.
   * Only an over-belly skirt may be either (Joshua, 2026-11-16: "an option for a high waisted skirt to be above or
   * under the shirt, while under the belly is always under the shirt"): under her belly it is always false.
   */
  readonly tucked: boolean;
  /** Which of its four anchors hold it (`SkirtAnchors`); absent: all four. */
  readonly anchors?: SkirtAnchors;
}
/**
 * ITS FOUR ANCHORS (Joshua, 2026-11-17: "I would add 4 anchor points for skirts either high or low sitting:
 * front/back/both sides"; "releasing all of them should make it fall down"): where its top is held to her -- her front,
 * her back, her left side and her right. Each holds the quarter of the ring round it and eases to nothing at the next
 * (`anchorShare`): all four on, the whole ring is held as it always was; one off, that quarter hangs from its
 * neighbours; all off, nothing holds it and it falls until her body stops it.
 */
export interface SkirtAnchors { readonly front: boolean; readonly back: boolean; readonly left: boolean; readonly right: boolean }
export const ALL_ANCHORS: SkirtAnchors = Object.freeze({ front: true, back: true, left: true, right: true });
export const anchorsOf = (s: { readonly anchors?: Partial<SkirtAnchors> | undefined }): SkirtAnchors => ({
  front: s.anchors?.front !== false, back: s.anchors?.back !== false, left: s.anchors?.left !== false, right: s.anchors?.right !== false,
});
/** How much of the ring's hold there is at angle `a` round her (0 her front, pi/2 her +x side, her LEFT): 0..1; 1 all round with all four. */
export function anchorShare(anchors: SkirtAnchors, a: number): number {
  const c = Math.cos(a), s = Math.sin(a);
  return c * c * ((c >= 0 ? anchors.front : anchors.back) ? 1 : 0) + s * s * ((s >= 0 ? anchors.left : anchors.right) ? 1 : 0);
}
export const SKIRT_DEFAULTS: SkirtSettings = Object.freeze({ top: 'over', length: 0.45, flare: 0.5, tucked: true });
export const clampSkirt = (s: Partial<SkirtSettings>): SkirtSettings => ({
  top: s.top === 'under' ? 'under' : s.top === 'over' ? 'over' : SKIRT_DEFAULTS.top,
  tucked: s.top === 'under' ? false : s.tucked !== false,
  length: Math.min(1, Math.max(0, Number.isFinite(s.length) ? s.length! : SKIRT_DEFAULTS.length)),
  flare: Math.min(1, Math.max(0, Number.isFinite(s.flare) ? s.flare! : SKIRT_DEFAULTS.flare)),
  // (all four is said by saying nothing: an outfit written before there were anchors is as it was)
  ...((() => { const k = anchorsOf(s); return k.front && k.back && k.left && k.right ? {} : { anchors: k }; })()),
});

/**
 * GAME TUNING: the ring's heights on her trunk. OVER is between her bust and the top of her belly (Joshua, 2026-11-16, of
 * the first ones, hung 3 cm under the high rise's waistband: "I want the top of the skirts for the high ones right
 * between the breasts and top belly… yours appears mid belly which would fall off in real life"): her underbust is 0.56
 * (`paintTemplates` LINES), and its painted band was taken up to 0.55. THEN, 2026-11-17, of that: "the high skirt point
 * is too low, it should basically sit at the base of the breasts at that crease" -- MEASURED on her body file, the
 * crease under each breast is 0.61 to 0.64 of her trunk (the least of her front's reach, 8 and 11 cm out from her
 * middle), so the band's top is 0.63 (`sarahLabTool.SKIRT_OVER_BAND`; at 0.61 it was pictured a centimetre under the
 * crease) and the ring a centimetre under it. UNDER is 1 to
 * 2 cm under the low rise's (0.125, 0.175, 0.2): where an under-belly skirt's ring was until 2026-11-17, and what its
 * HEM is still counted from -- its ring is the under-belly leggings' own line now (`SKIRT_LINE`), and these three only
 * where the room has no such line to hand it. The painted band shows above the cloth as the skirt's own waistband.
 */
export const SKIRT_TOPS: Readonly<Record<SkirtTop, { readonly front: number; readonly side: number; readonly back: number }>> = Object.freeze({
  over: Object.freeze({ front: 0.61, side: 0.595, back: 0.585 }),
  under: Object.freeze({ front: 0.095, side: 0.145, back: 0.17 }),
});

export const SKIRT_CUT = Object.freeze({
  /** points round her (GAME TUNING: 1.3 cm apart at her hips) */
  columns: 72,
  /** metres between rows down it, and the most rows there are: a longer skirt's are further apart (`clothSkirt.ts`, how stiff it can be) */
  rowStep: 0.02, mostRows: 30,
  /** the ring, and a tube under it, stand this far off her (metres); over a tucked shirt, this far (the shirt lies
   *  1.5 mm off her, is held in to 2 mm more under the band, is drawn 3 mm out of that, and the two keep 3 mm apart:
   *  `clothLayers.ts`) */
  ease: 0.006, easeTucked: 0.01,
  /** a mini's hem is this far under the lowest of the ring (metres); a floor-length one's this far over the floor
   *  as cut (worn, it hangs about a twentieth longer) */
  miniDrop: 0.3, floorClear: 0.06,
  /** FLARE at 1 opens by this angle from straight down (degrees) */
  fullAngle: 38,
  /** rows held to her from the top: all of the first, less of each after (the waistband's grip) */
  hold: Object.freeze([1, 0.7, 0.3]),
  /** the outline's slices (metres) */
  formStep: 0.01,
});

export interface SkirtDraft {
  readonly count: number;
  readonly columns: number;
  readonly rows: number;
  /** rest places, metres (count x 3): x her side to side, y up from the floor, z out of her front */
  readonly rest: Float32Array;
  readonly triangles: Uint32Array;
  /** 0 free .. 1 held to her (count) */
  readonly pin: Float32Array;
  /** the ring's own height at each column, and the hem's (metres) */
  readonly ringY: Float32Array;
  readonly hemY: number;
  /** the upright axis it is laid round: (x, z), metres */
  readonly axis: readonly [number, number];
  /** the share of its columns the under-belly waistband's line crossed (`SKIRT_LINE`): 1 all round her; 0 with no line handed in, or a skirt over her belly; under `SKIRT_LINE.least`, the line was not used */
  readonly lineFound: number;
}

/**
 * AN UNDER-BELLY SKIRT SITS WHERE THE UNDER-BELLY LEGGINGS DO (Joshua, 2026-11-17, of the skirts moved under her belly,
 * their rings at three heights on her trunk: "how the skirt should sit is like how we did the lower rider leggings, just
 * above her pelvis, below her belly following that same curved lines…"). Those leggings' waistband is a hoop
 * (`bottomCut.ts` `planeAt`): one tilted plane on her as she stands, its front under her belly and its back over her
 * seat, swung down as her belly grows until its front lies in the crease her belly hangs over. A ring at fixed heights
 * on her trunk is on the FRONT OF HER BUMP by 100% (MEASURED in the room, 2026-11-17: the skirt's top stood off her
 * under a tee's hem, and at 200% the skirt hung from the front of her belly).
 *
 * So the room hands the draft that waistband itself: how far INSIDE it each point of her skin is, as she is shaped
 * (`inside`: metres, + inside the garment; `fabricPanel.hoopOn`). The ring is where that is `SKIRT_LINE.inside` -- in
 * the painted band, which shows over the cloth as the skirt's waistband -- found on her triangles; and what the cloth
 * goes round, under the ring, is HER SKIN UNDER THAT LINE alone: her hips, her seat and her legs, never the belly that
 * hangs in front of it. GAME TUNING (metres): `inside`; `smooth`, how many times the ring's heights and reaches are
 * evened with their neighbours' (her triangles are 1 to 4 cm there, and the line bends at each); `least`, the share
 * of its columns the line must cross for it to be used at all -- a waistband goes all the way round her (MEASURED on
 * the room's points at 0, 50, 73, 100, 150 and 200%: every one of the 72), and half a line is no line.
 */
export const SKIRT_LINE = Object.freeze({ inside: 0.008, smooth: 2, least: 0.9 });

/**
 * HER SKIN UNDER A WAISTBAND'S LINE, AND THE LINE (`SKIRT_LINE`): her triangles cut where `inside` is `level` -- what
 * is inside kept (a body for `dressForm`: her own points and the cuts' new ones), and each cut's two ends a piece of
 * the line (x, y, z twice a piece). A triangle two of whose corners are her arm's is left out, as a dress form
 * leaves it out.
 */
export function underLine(body: BodyInput, inside: ArrayLike<number>, level: number): { readonly covered: BodyInput; readonly line: Float64Array } {
  const P = body.positions, T = body.triangles, A = body.arm, n = P.length / 3;
  // (a body of its own, of the points it keeps alone: a dress form welds and sorts every point it is handed)
  const at = new Int32Array(n).fill(-1), pos: number[] = [], armOf: number[] = [], tris: number[] = [], line: number[] = [];
  const own = (v: number): number => { if (at[v] < 0) { at[v] = armOf.length; pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); armOf.push(A[v]); } return at[v]; };
  // (the point where the line crosses the edge from `a`, inside, to `b`, outside)
  const cut = (a: number, b: number, fa: number, fb: number): number => {
    const t = fa / (fa - fb), x = P[a * 3] + (P[b * 3] - P[a * 3]) * t, y = P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * t, z = P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t;
    pos.push(x, y, z); armOf.push(A[a] + (A[b] - A[a]) * t); line.push(x, y, z);
    return armOf.length - 1;
  };
  for (let k = 0; k + 2 < T.length; k += 3) {
    const a = T[k], b = T[k + 1], c = T[k + 2];
    if ((A[a] >= 0.5 ? 1 : 0) + (A[b] >= 0.5 ? 1 : 0) + (A[c] >= 0.5 ? 1 : 0) > 1) continue;
    const fa = inside[a] - level, fb = inside[b] - level, fc = inside[c] - level, ia = fa >= 0, ib = fb >= 0, ic = fc >= 0, count = (ia ? 1 : 0) + (ib ? 1 : 0) + (ic ? 1 : 0);
    if (!(fa === fa && fb === fb && fc === fc) || count === 0) continue;
    if (count === 3) { tris.push(own(a), own(b), own(c)); continue; }
    // (turned so that the odd corner out is first: the one inside of one, or the one outside of two)
    const odd = count === 1 ? (ia ? 0 : ib ? 1 : 2) : (!ia ? 0 : !ib ? 1 : 2);
    const [p, q, r, fp, fq, fr] = odd === 0 ? [a, b, c, fa, fb, fc] : odd === 1 ? [b, c, a, fb, fc, fa] : [c, a, b, fc, fa, fb];
    if (count === 1) { const u = cut(p, q, fp, fq), v = cut(p, r, fp, fr); tris.push(own(p), u, v); }
    else { const u = cut(q, p, fq, fp), v = cut(r, p, fr, fp), Q = own(q), R = own(r); tris.push(Q, R, u, R, v, u); }
  }
  return { covered: { positions: Float32Array.from(pos), triangles: Uint32Array.from(tris), arm: Float32Array.from(armOf), joints: body.joints }, line: Float64Array.from(line) };
}

/**
 * Where a line round her (`underLine`'s pieces) crosses each of `cols` directions from the upright axis (cx, cz): its
 * height there and how far out it is -- the furthest, where it crosses one more than once; a direction it does not
 * cross takes its neighbours', eased between them. `found`: the share of the directions it did cross.
 */
export function ringOn(line: ArrayLike<number>, cx: number, cz: number, cols: number): { readonly y: Float64Array; readonly r: Float64Array; readonly found: number } {
  const y = new Float64Array(cols).fill(NaN), r = new Float64Array(cols).fill(0), step = (Math.PI * 2) / cols;
  for (let k = 0; k + 5 < line.length; k += 6) {
    const px = line[k] - cx, pz = line[k + 2] - cz, qx = line[k + 3] - cx, qz = line[k + 5] - cz, ex = qx - px, ez = qz - pz;
    let a0 = Math.atan2(px, pz), a1 = Math.atan2(qx, qz);
    if (a1 < a0) { const t = a0; a0 = a1; a1 = t; }
    // (the short way round; a piece that spans more than a quarter turn passes by the axis itself: not a place on her)
    if (a1 - a0 > Math.PI) { const t = a0 + Math.PI * 2; a0 = a1; a1 = t; }
    if (a1 - a0 > Math.PI / 2) continue;
    for (let i = Math.ceil(a0 / step - 1e-9); i * step <= a1 + 1e-9; i++) {
      const a = i * step, dx = Math.sin(a), dz = Math.cos(a), den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (px * ez - pz * ex) / den, u = (px * dz - pz * dx) / den, c = ((i % cols) + cols) % cols;
      if (t > r[c] && u >= -1e-6 && u <= 1 + 1e-6) { r[c] = t; y[c] = line[k + 1] + (line[k + 4] - line[k + 1]) * Math.min(1, Math.max(0, u)); }
    }
  }
  let found = 0;
  for (let c = 0; c < cols; c++) if (y[c] === y[c]) found++;
  if (found > 0 && found < cols) {
    const had = Array.from(y, (v) => v === v);
    for (let c = 0; c < cols; c++) {
      if (had[c]) continue;
      let b = 1, f = 1;
      while (!had[(c - b + cols * 2) % cols]) b++;
      while (!had[(c + f) % cols]) f++;
      const i = (c - b + cols * 2) % cols, j = (c + f) % cols, w = b / (b + f);
      y[c] = y[i] + (y[j] - y[i]) * w; r[c] = r[i] + (r[j] - r[i]) * w;
    }
  }
  return { y, r, found: found / cols };
}
/** A ring of numbers evened with its neighbours', `times` over (a quarter of each neighbour, half of its own). */
function evened(v: Float64Array, times: number): Float64Array {
  let a = v;
  for (let k = 0; k < times; k++) { const b = new Float64Array(a.length), n = a.length; for (let c = 0; c < n; c++) b[c] = 0.5 * a[c] + 0.25 * (a[(c + 1) % n] + a[(c + n - 1) % n]); a = b; }
  return a;
}

/** How far the outline `h` ((x, z) pairs) reaches from (cx, cz) toward (sin a, cos a): 0 when it does not hold the point. */
export function reachOf(h: ArrayLike<number>, cx: number, cz: number, a: number): number {
  const n = h.length >> 1, dx = Math.sin(a), dz = Math.cos(a);
  let best = 0;
  for (let k = 0; k < n; k++) {
    const l = (k + 1) % n, ax = h[2 * k] - cx, az = h[2 * k + 1] - cz, ex = h[2 * l] - h[2 * k], ez = h[2 * l + 1] - h[2 * k + 1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ez - az * ex) / den, u = (ax * dz - az * dx) / den;
    if (t > best && u >= -1e-9 && u <= 1 + 1e-9) best = t;
  }
  return best;
}

/** The ring's height at angle `a` round her (0 her front, pi/2 her +x side), a share of her trunk. */
export function ringShare(top: SkirtTop, a: number): number {
  const t = SKIRT_TOPS[top], f = (1 + Math.cos(a)) / 2, s = Math.sin(a) ** 2;
  return (1 - s) * (t.back + (t.front - t.back) * f) + s * t.side;
}

/**
 * `inside`: for a skirt UNDER her belly, how far inside the under-belly waistband each point of her skin is as she is
 * shaped (`SKIRT_LINE`; one a point of `body.positions`). Without it, or where that line is not found round her, the
 * ring is at `SKIRT_TOPS`' heights.
 */
export function draftSkirt(body: BodyInput, settings: SkirtSettings, inside: ArrayLike<number> | null = null): SkirtDraft {
  const C = SKIRT_CUT, s = clampSkirt(settings), J = body.joints, anchors = anchorsOf(s);
  const hipY = (J.hip[0][1] + J.hip[1][1]) / 2, trunk = J.neck[1] - hipY;
  if (!(trunk > 0.2)) throw new RangeError(`draftSkirt: her trunk reads ${trunk} m`);
  const cols = C.columns, ringY = new Float32Array(cols);
  let lowest = Infinity, highest = -Infinity;
  for (let c = 0; c < cols; c++) { const y = hipY + ringShare(s.top, (c / cols) * Math.PI * 2) * trunk; ringY[c] = y; if (y < lowest) lowest = y; if (y > highest) highest = y; }
  // (its hem is counted from the heights a skirt has always had: a ring that follows her belly down does not take the
  // hem down with it)
  const hemY = (lowest - C.miniDrop) + (C.floorClear - (lowest - C.miniDrop)) * s.length;
  // UNDER HER BELLY, ON THE UNDER-BELLY WAISTBAND'S OWN LINE (`SKIRT_LINE`): the ring's heights and how far out it is,
  // off her skin itself; and under it only her skin under that line
  let under: { readonly form: BodyInput; readonly r: Float64Array; readonly cz: number } | null = null, lineFound = 0;
  if (s.top === 'under' && inside && inside.length * 3 === body.positions.length) {
    const cut = underLine(body, inside, SKIRT_LINE.inside);
    let zMin = Infinity, zMax = -Infinity;
    for (let k = 2; k < cut.line.length; k += 3) { if (cut.line[k] < zMin) zMin = cut.line[k]; if (cut.line[k] > zMax) zMax = cut.line[k]; }
    if (zMax > zMin) {
      const cz = (zMin + zMax) / 2, on = ringOn(cut.line, 0, cz, cols);
      lineFound = on.found;
      if (on.found >= SKIRT_LINE.least) {
        const y = evened(on.y, SKIRT_LINE.smooth), r = evened(on.r, SKIRT_LINE.smooth);
        lowest = Infinity; highest = -Infinity;
        for (let c = 0; c < cols; c++) { ringY[c] = y[c]; if (y[c] < lowest) lowest = y[c]; if (y[c] > highest) highest = y[c]; }
        under = { form: cut.covered, r, cz };
      }
    }
  }
  const rows = Math.min(C.mostRows, Math.max(4, Math.ceil((highest - hemY) / C.rowStep) + 1));
  const form = dressForm(under?.form ?? body, Math.max(0.01, hemY - 0.02), highest + 0.02, C.formStep);
  // the axis: her middle, half-way between her front and her back at the ring
  const ring = hullAt(form, (lowest + highest) / 2);
  let zMin = Infinity, zMax = -Infinity;
  for (let k = 1; k < ring.length; k += 2) { if (ring[k] < zMin) zMin = ring[k]; if (ring[k] > zMax) zMax = ring[k]; }
  const cx = 0, cz = under ? under.cz : Number.isFinite(zMin) ? (zMin + zMax) / 2 : 0;
  const tan = Math.tan((C.fullAngle * s.flare * Math.PI) / 180), ease = s.tucked ? C.easeTucked : C.ease;
  const count = cols * rows, rest = new Float32Array(count * 3), pin = new Float32Array(count);
  // HOW FAR HER OUTLINE REACHES TOWARD EACH COLUMN, READ ONCE A SLICE (a height between two slices: between their two
  // reaches, as `hullAt` blends their outlines; a slice with nothing of her takes the other's). Asked of `hullAt`
  // itself for every row and every slice between rows, each asking made the two outlines again: most of a cut's time.
  const levels = form.hulls.length, table = new Float64Array(levels * cols).fill(NaN);
  for (let i = 0; i < levels; i++) { const h = form.hulls[i]; if (h.length >= 6) for (let c = 0; c < cols; c++) table[i * cols + c] = reachOf(h, cx, cz, (c / cols) * Math.PI * 2); }
  const reachAt = (c: number, y: number): number => {
    if (levels === 0) return 0;
    const f = Math.min(levels - 1, Math.max(0, (y - form.y0) / form.step)), i = Math.min(levels - 1, Math.floor(f)), j = Math.min(levels - 1, i + 1), p = table[i * cols + c], q = table[j * cols + c];
    return p !== p ? (q !== q ? 0 : q) : q !== q ? p : p + (f - i) * (q - p);
  };
  for (let c = 0; c < cols; c++) {
    const a = (c / cols) * Math.PI * 2, y0 = ringY[c], held = anchorShare(anchors, a);
    const r0 = (under ? under.r[c] : reachAt(c, y0)) + ease;
    let widest = r0;
    for (let r = 0; r < rows; r++) {
      const y = y0 + (hemY - y0) * (r / (rows - 1)), drop = y0 - y;
      // never back in toward her going down: the widest of her from the ring to here, read every slice of the way
      const yPrev = r > 0 ? y0 + (hemY - y0) * ((r - 1) / (rows - 1)) : y0;
      // (...and at the row's own height: read only on the slices' steps from the row above, a row between two of them
      // was cut for the slice OVER it -- where she widens fast going down, the top of her seat under a ring at the
      // small of her back, the cloth as cut was 3 mm inside her: MEASURED 2026-11-17 on the room's points at 0%)
      for (let yy = yPrev; ; yy -= C.formStep) { const q = reachAt(c, Math.max(yy, y)) + ease; if (q > widest) widest = q; if (yy <= y) break; }
      const R = Math.max(widest, r0 + tan * drop), i = (r * cols + c) * 3;
      rest[i] = cx + Math.sin(a) * R; rest[i + 1] = y; rest[i + 2] = cz + Math.cos(a) * R;
      pin[r * cols + c] = (C.hold[r] ?? 0) * held;
    }
  }
  const triangles = new Uint32Array(cols * (rows - 1) * 6);
  let t = 0;
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) {
    const d = (c + 1) % cols, p00 = r * cols + c, p01 = r * cols + d, p10 = (r + 1) * cols + c, p11 = (r + 1) * cols + d;
    // (columns run from her front toward her +x side: this winding faces out of her; the diagonal alternates)
    if ((r + c) & 1) { triangles[t++] = p00; triangles[t++] = p11; triangles[t++] = p01; triangles[t++] = p00; triangles[t++] = p10; triangles[t++] = p11; }
    else { triangles[t++] = p00; triangles[t++] = p10; triangles[t++] = p01; triangles[t++] = p01; triangles[t++] = p10; triangles[t++] = p11; }
  }
  return { count, columns: cols, rows, rest, triangles, pin, ringY, hemY, axis: [cx, cz], lineFound };
}
