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
 *   trunk (0 her hip joints, 1 the base of her neck), a little under the painted waistband's own (`SKIRT_TOPS`);
 * - LENGTH: 0 a mini, 1 to the floor, from either top (the hem is level: one height all round);
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
}
export const SKIRT_DEFAULTS: SkirtSettings = Object.freeze({ top: 'over', length: 0.45, flare: 0.5, tucked: true });
export const clampSkirt = (s: Partial<SkirtSettings>): SkirtSettings => ({
  top: s.top === 'under' ? 'under' : s.top === 'over' ? 'over' : SKIRT_DEFAULTS.top,
  tucked: s.top === 'under' ? false : s.tucked !== false,
  length: Math.min(1, Math.max(0, Number.isFinite(s.length) ? s.length! : SKIRT_DEFAULTS.length)),
  flare: Math.min(1, Math.max(0, Number.isFinite(s.flare) ? s.flare! : SKIRT_DEFAULTS.flare)),
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
 * 2 cm under the low rise's (0.125, 0.175, 0.2). The painted band shows above the cloth as the skirt's own waistband.
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
   *  1.5 mm off her and the two keep 3 mm apart: `clothLayers.ts`) */
  ease: 0.006, easeTucked: 0.008,
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

export function draftSkirt(body: BodyInput, settings: SkirtSettings): SkirtDraft {
  const C = SKIRT_CUT, s = clampSkirt(settings), J = body.joints;
  const hipY = (J.hip[0][1] + J.hip[1][1]) / 2, trunk = J.neck[1] - hipY;
  if (!(trunk > 0.2)) throw new RangeError(`draftSkirt: her trunk reads ${trunk} m`);
  const cols = C.columns, ringY = new Float32Array(cols);
  let lowest = Infinity, highest = -Infinity;
  for (let c = 0; c < cols; c++) { const y = hipY + ringShare(s.top, (c / cols) * Math.PI * 2) * trunk; ringY[c] = y; if (y < lowest) lowest = y; if (y > highest) highest = y; }
  const hemY = (lowest - C.miniDrop) + (C.floorClear - (lowest - C.miniDrop)) * s.length;
  const rows = Math.min(C.mostRows, Math.max(4, Math.ceil((highest - hemY) / C.rowStep) + 1));
  const form = dressForm(body, Math.max(0.01, hemY - 0.02), highest + 0.02, C.formStep);
  // the axis: her middle, half-way between her front and her back at the ring
  const ring = hullAt(form, (lowest + highest) / 2);
  let zMin = Infinity, zMax = -Infinity;
  for (let k = 1; k < ring.length; k += 2) { if (ring[k] < zMin) zMin = ring[k]; if (ring[k] > zMax) zMax = ring[k]; }
  const cx = 0, cz = Number.isFinite(zMin) ? (zMin + zMax) / 2 : 0;
  const tan = Math.tan((C.fullAngle * s.flare * Math.PI) / 180), ease = s.tucked ? C.easeTucked : C.ease;
  const count = cols * rows, rest = new Float32Array(count * 3), pin = new Float32Array(count);
  for (let c = 0; c < cols; c++) {
    const a = (c / cols) * Math.PI * 2, y0 = ringY[c];
    const r0 = reachOf(hullAt(form, y0), cx, cz, a) + ease;
    let widest = r0;
    for (let r = 0; r < rows; r++) {
      const y = y0 + (hemY - y0) * (r / (rows - 1)), drop = y0 - y;
      // never back in toward her going down: the widest of her from the ring to here, read every slice of the way
      const yPrev = r > 0 ? y0 + (hemY - y0) * ((r - 1) / (rows - 1)) : y0;
      for (let yy = yPrev; yy >= y - 1e-9; yy -= C.formStep) { const q = reachOf(hullAt(form, Math.max(yy, y)), cx, cz, a) + ease; if (q > widest) widest = q; }
      const R = Math.max(widest, r0 + tan * drop), i = (r * cols + c) * 3;
      rest[i] = cx + Math.sin(a) * R; rest[i + 1] = y; rest[i + 2] = cz + Math.cos(a) * R;
      pin[r * cols + c] = C.hold[r] ?? 0;
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
  return { count, columns: cols, rows, rest, triangles, pin, ringY, hemY, axis: [cx, cz] };
}
