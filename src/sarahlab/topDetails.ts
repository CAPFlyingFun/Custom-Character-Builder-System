/**
 * THE DETAILS DRAWN ON A PAINTED TOP: collars, plackets, buttons, a raglan's sleeves in a second colour, a wrap's
 * crossing edge and its knot, a shirt's chest pocket (Joshua, 2026-11-14, of his sheet of sixteen women's tops:
 * "Hopefully these will help to get started and have more than our list"; `docs/reference/tops/16-womens-tops.jpg`,
 * his 08 raglan, 09 henley, 10 fitted polo, 15 wrap top and 16 button-up).
 *
 * WHY ARITHMETIC OVER A PIXEL'S PLACE. A top is paint on her skin whose edges the shader draws for each pixel
 * (`topCut.ts`): a line laid per vertex is as jagged as her triangles are big (centimetres over her chest). So a detail
 * is the same kind of thing: for a place on her rest skin (the place the cut is looked up at: `vFabricPos` with her
 * slip), how far it is from each of the detail's lines, each line drawn anti-aliased by that distance. Every line is
 * a straight line, a circle, a box or a smooth curve in that place's (x, y): seen from her front for what is on her
 * front (a placket, its buttons, a collar's points, a wrap's crossing, a pocket), and across her front and back alike
 * for what goes round her (a collar along the rim, a raglan's seam: the same curve front and back, so the two agree
 * over her shoulder exactly).
 *
 * ONE TABLE, TWO READERS. A detail is packed into eight vec4s (`packTopDetail`), and the CPU (`detailOf`, for the tests
 * and the preview) and the shader (`topDetailGlsl`, put into `fabricMaterial.ts`) read those same numbers by the same
 * formulas, with the look's constants (`DETAIL_LOOK`) written into the GLSL from this file.
 *
 * NOT DRAWN: the wrap's hanging ribbons (a ribbon hangs off her; paint on her skin can not), and a collar standing off
 * her neck (it lies on her as paint does).
 *
 * Pure: no three.js, no DOM.
 */
import { TOP_CUT, cutAt, cutEdgeAt, midDepthAt, ridgeAt, type NeckStyle, type TopBands, type TopCut, type TopCutSpec, type TopFrame } from './topCut';

/**
 * GAME TUNING (metres, and shares of the cloth's colour), his sheet's look:
 * - `seam`: half a stitched seam's width; `seamDark`: how much darker it is.
 * - `edgeLine`: half the dark line where a raised edge (a collar's, a placket's, a pocket's, a wrap's) lies on the cloth;
 *   `edgeDark`, its darkness; `shadow` and `shadowReach`: the soft shadow that edge casts beside it.
 * - `raised`: a layer laid on top (a collar's leaf, a placket, a binding) a touch lighter.
 * - `stitchIn`: a topstitch this far inside a placket's, a collar's and a pocket's edge.
 * - `fallback`: a second-colour region with no EDGING chosen is the fabric this much darker (Joshua's raglan is two
 *   colours; until one is picked it reads as two shades of one).
 * - `face`: what is drawn as seen from her front fades in as her rest skin turns to face her front (its normal's share
 *   along her facing, from the first to the second).
 * - `hole`: a button's two holes, out from its middle and their radius, as shares of its radius.
 */
export const DETAIL_LOOK = Object.freeze({
  seam: 0.0006, seamDark: 0.3, edgeLine: 0.0008, edgeDark: 0.45, shadow: 0.18, shadowReach: 0.008,
  face: Object.freeze([0.15, 0.45] as const), raised: 1.05, stitchIn: 0.003, fallback: 0.72, hole: Object.freeze({ out: 0.32, r: 0.16 }),
});

/** What a style asks for, in metres on her (built into a `TopDetailSpec` on her frame by `topDetailSpec`). */
export interface TopDetailParams {
  /** A placket down her middle in front from the rim's lowest point: its length (or 'hem'), its width. */
  readonly placket?: { readonly length: number | 'hem'; readonly width: number; readonly edging?: boolean } | null;
  /** Buttons on it: how many (or, for a placket to the hem, how far apart), their diameter, their colour. */
  readonly buttons?: { readonly count?: number; readonly spacing?: number; readonly size: number; readonly tone: 'edging' | number; readonly first: number } | null;
  /** A fold-down collar: its width along the rim, and its points in front -- out from her middle and down from the rim's lowest point. */
  readonly collar?: { readonly width: number; readonly pointOut: number; readonly pointDrop: number } | null;
  /** A raglan: its seam from the rim (this far out from the side point) to her underarm (this far under her shoulder joint, this far in from it); the curve's power. */
  readonly raglan?: { readonly fromRim: number; readonly under: number; readonly inFrom: number; readonly power: number } | null;
  /** A wrap: its crossing edge from the V's point to her side (out from her middle) at this height over her hip joints; its binding's width; its knot's radius. */
  readonly wrap?: { readonly sideOut: number; readonly waistUp: number; readonly binding: number; readonly knot: number } | null;
  /** A chest pocket on her LEFT (+x): its middle out from hers, its top under the base of her neck, its width and height. */
  readonly pocket?: { readonly out: number; readonly down: number; readonly width: number; readonly height: number } | null;
}

/** A detail on one body, her units: eight vec4s (`packTopDetail`). */
export interface TopDetailSpec { readonly pack: Float32Array; readonly unitsPerMetre: number }

/**
 * THE PACK, eight vec4s (her units; x as `u`, out from her middle, + her left):
 * 0 placket: half its width (0: none), its top, its bottom, its edging share
 * 1 buttons: count (0: none), the first's height, the last's, radius
 * 2 collar: width along the rim (0: none), its outer corner's u and y on her front, the rim's lowest y
 * 3 raglan: its seam's top (u, y) and its underarm end (u, y)
 * 4 wrap: its crossing's top (u, y) and its side end (u, y)
 * 5 pocket: its middle's u (0 with no width: none), its top, half its width, its bottom
 * 6 raglan's power (0: none), wrap's binding (0: none), knot radius, the buttons' tone (-1 the edging, else a grey)
 * 7 collar's point (u, y), metres to her units (U), 0
 */
export const DETAIL_PACK = 32;

export function topDetailSpec(params: TopDetailParams, spec: TopCutSpec, frame: TopFrame): TopDetailSpec {
  const U = frame.unitsPerMetre, P = new Float32Array(DETAIL_PACK), top = spec.dipY;
  const pk = params.placket;
  if (pk) {
    const bottom = pk.length === 'hem' ? spec.hemY + 0.004 * U : top - pk.length * U;
    P.set([pk.width * U / 2, top + 0.01 * U, bottom, pk.edging ? 1 : 0], 0);
    const b = params.buttons;
    if (b) {
      const first = top - b.first * U, last = bottom + (pk.length === 'hem' ? 0.05 : 0.012) * U + b.size * U / 2;
      const count = b.count ?? Math.max(1, Math.round((first - last) / ((b.spacing ?? 0.08) * U)) + 1);
      P.set([count, first, count > 1 ? last : first, b.size * U / 2], 4);
      P[27] = b.tone === 'edging' ? -1 : b.tone;
    }
  }
  const c = params.collar;
  if (c) {
    const ox = spec.half + 0.006 * U;
    P.set([c.width * U, ox, ridgeAt(frame, ox) - c.width * U, top], 8);
    P.set([c.pointOut * U, top - c.pointDrop * U], 28);
  }
  const r = params.raglan;
  if (r) {
    const arm = frame.arms[0], xa = spec.half + r.fromRim * U, xb = Math.abs(arm.from[0] - frame.mid) - r.inFrom * U;
    P.set([xa, ridgeAt(frame, xa), xb, arm.from[1] - r.under * U], 12);
    P[24] = r.power;
  }
  const w = params.wrap;
  if (w) {
    P.set([0, top, w.sideOut * U, frame.hipY + w.waistUp * U], 16);
    P[25] = w.binding * U; P[26] = w.knot * U;
  }
  const p = params.pocket;
  if (p) P.set([p.out * U, frame.neckY - p.down * U, p.width * U / 2, frame.neckY - (p.down + p.height) * U], 20);
  P[30] = U;
  return { pack: P, unitsPerMetre: U };
}

/** What a pixel of the garment is told: the cloth's colour times `shade`; `edging` 0..1 of the edging colour; `button` 0..1 of the button's. */
export interface TopDetailValue { readonly shade: number; readonly edging: number; readonly button: number }

const sat = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * The detail at a place, from its pack (formula for formula `topDetailGlsl`): `u`, `y` its place (u out from her middle);
 * `front` 0..1 how much it is on her front (the cut's own blend of its two drawings); `trunk` 0..1 her trunk's skin
 * (1 - her arm's); `neck` how far inside the neck opening's rim (her units; large when far); `neckBand` the collar
 * band's width; `aa` half a pixel's width.
 */
export function detailOf(P: ArrayLike<number>, u: number, y: number, front: number, trunk: number, neck: number, neckBand: number, aa: number, facing = 1): TopDetailValue {
  const U = P[30], L = DETAIL_LOOK, ua = Math.abs(u);
  const fill = (d: number) => smooth(-aa, aa, d);
  const stroke = (d: number, half: number) => 1 - smooth(half - aa, half + aa, Math.abs(d));
  let shade = 1, edging = 0, button = 0;
  // (what is drawn as seen from her front is drawn on skin that faces her front: under a big bust or over a big belly
  // two skins share a place seen from her front, and the one facing up or down would take the other's lines)
  const fr = front * trunk * smooth(DETAIL_LOOK.face[0], DETAIL_LOOK.face[1], facing);
  // a placket: a strip down her middle, raised, its edges dark lines with a topstitch inside them
  if (P[0] > 0) {
    const hw = P[0], below = fill(y - P[2]), above = fill(P[1] - y), inside = fill(hw - ua) * below * above * fr;
    const edge = Math.max(stroke(ua - hw, L.edgeLine * U) * below, stroke(y - P[2], L.edgeLine * U) * fill(hw - ua + aa)) * above * fr;
    const stitch = Math.max(stroke(ua - hw + L.stitchIn * U, L.seam * U), stroke(y - P[2] - L.stitchIn * U, L.seam * U) * fill(hw - L.stitchIn * U - ua)) * inside;
    shade *= 1 + (L.raised - 1) * inside;
    shade *= 1 - L.edgeDark * edge;
    shade *= 1 - L.seamDark * stitch;
    edging = Math.max(edging, P[3] * inside);
  }
  // buttons along it: the nearest one's disc, its rim's shadow and its two holes
  if (P[4] > 0) {
    const n = P[4], gap = n > 1 ? (P[6] - P[5]) / (n - 1) : 1, k = n > 1 ? Math.max(0, Math.min(n - 1, Math.floor((y - P[5]) / gap + 0.5))) : 0;
    const cy = P[5] + k * gap, r = P[7], d = Math.hypot(u, y - cy), disc = fill(r - d) * fr;
    const hole = Math.max(fill(r * L.hole.r - Math.hypot(ua - r * L.hole.out, y - cy)), 0) * disc;
    button = disc * (1 - hole);
    shade *= 1 - 0.5 * stroke(d - r, L.edgeLine * U) * fr;
    shade *= 1 - 0.6 * hole;
  }
  // a collar: a leaf along the rim all round her (`width`), and in front from its outer corner (on her shoulder, by
  // the side point) down to its point and back up to the rim's lowest point at her middle: the two leaves meet there
  if (P[8] > 0) {
    const ox = P[9], oy = P[10], qy = P[11], px = P[28], py = P[29];
    // signed distances to the lines outer corner -> point (+ toward her neck) and middle -> point (+ outward)
    const lo = Math.hypot(px - ox, py - oy), sOuter = ((px - ox) * (y - oy) - (py - oy) * (ua - ox)) / lo;
    const lq = Math.hypot(px, py - qy), sInner = ((py - qy) * ua - px * (y - qy)) / lq;
    const leaf = Math.min(Math.min(-sOuter, -sInner), ox - ua);
    const c = Math.max(P[8] - neck, leaf - (1 - fr) * 0.05 * U);
    const on = fill(c);
    shade *= 1 + (L.raised - 1) * on;
    shade *= 1 - L.edgeDark * stroke(c, L.edgeLine * U);
    shade *= 1 - L.seamDark * stroke(c - L.stitchIn * U, L.seam * U) * on;
    shade *= 1 - L.shadow * (1 - smooth(0, L.shadowReach * U, -c)) * fill(-c);
  }
  // a raglan: her sleeves, and her shoulder outward of the seam from the rim to her underarm, in the second colour --
  // its neckband with them; the seam the same curve in (|u|, y) on her front and her back
  if (P[24] > 0) {
    const xa = P[12], ya = P[13], xb = P[14], yb = P[15], p = P[24];
    const s = sat((ya - y) / (ya - yb)), X = xa + (xb - xa) * Math.pow(s, p), dX = s > 0 && s < 1 ? ((xb - xa) * p * Math.pow(s, p - 1)) / (ya - yb) : 0;
    const d = (ua - X) / Math.sqrt(1 + dX * dX), below = fill(y - yb);
    const region = Math.max(1 - trunk, fill(d) * below, fill(neckBand - neck));
    edging = Math.max(edging, region);
    shade *= 1 - L.seamDark * Math.max(stroke(d, L.seam * U), stroke(d + 2 * L.stitchIn * U, L.seam * U)) * below * trunk;
  }
  // a wrap: its upper layer's edge from the V's point down to her side, with a binding on the upper layer (below the
  // line), the shadow it casts on the layer under it, and the knot at her side
  if (P[25] > 0) {
    const tx = P[16], ty = P[17], sx = P[18], sy = P[19], l = Math.hypot(sx - tx, sy - ty);
    const sd = ((sx - tx) * (y - ty) - (sy - ty) * (u - tx)) / l, along = ((u - tx) * (sx - tx) + (y - ty) * (sy - ty)) / (l * l);
    const on = fill(along) * fill(1 - along) * fr, bw = P[25];
    // (her upper layer is below the line: `sd` is + above it)
    const bind = fill(-sd) * fill(bw + sd) * on;
    shade *= 1 + (L.raised - 1) * bind;
    shade *= 1 - L.edgeDark * stroke(sd, L.edgeLine * U) * on;
    shade *= 1 - L.seamDark * stroke(sd + bw, L.seam * U) * on;
    shade *= 1 - 2 * L.shadow * (1 - smooth(0, L.shadowReach * U * 1.5, sd)) * fill(sd) * on;
    const kr = P[26], kd = Math.hypot(u - sx, y - sy), knot = fill(kr - kd) * fr;
    shade *= 1 + (L.raised - 1) * 1.5 * knot;
    shade *= 1 - L.edgeDark * stroke(kd - kr, L.edgeLine * U * 1.5) * fr;
    shade *= 1 - L.seamDark * stroke(u - sx + 0.4 * (y - sy), L.seam * U * 1.5) * knot;
  }
  // a chest pocket on her left: a box, rounded below, its edge dark, a topstitch round it and its hem across its top
  if (P[22] > 0) {
    const cx = P[20], topY = P[21], hw = P[22], botY = P[23], rc = 0.012 * U;
    const qx = Math.abs(u - cx) - (hw - rc), qy = Math.max(y - topY, botY + rc - y);
    const box = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
    const b = Math.max(box, y - topY);
    shade *= 1 - L.edgeDark * stroke(b, L.edgeLine * U) * fr;
    shade *= 1 - L.seamDark * Math.max(stroke(b + L.stitchIn * U, L.seam * U), stroke(y - topY + 0.012 * U, L.seam * U) * fill(-b)) * fr;
  }
  return { shade, edging, button };
}

/**
 * A detail at a place on her rest skin INSIDE the garment (her units; the place the cut is looked up at; `normalZ` her
 * rest normal's z there), as the shader draws it; outside the garment, nothing (shade 1). `aa`: half a pixel, her units.
 */
export function topDetailAt(detail: TopDetailSpec, cut: TopCut, x: number, y: number, z: number, armShare: number, normalZ = 1, aa = 0.0005 * cut.frame.unitsPerMetre): TopDetailValue {
  if (!(cutAt(cut, x, y, z, armShare) > 0)) return { shade: 1, edging: 0, button: 0 };
  const { frame } = cut, U = frame.unitsPerMetre;
  const front = smooth(-TOP_CUT.sideBlend * U, TOP_CUT.sideBlend * U, z * frame.facing - midDepthAt(frame, x, y));
  // the neck opening's own distance: on her trunk her hem is far below anything a detail reads it for
  const e = cutEdgeAt({ ...cut, spec: { ...cut.spec, hemY: -Infinity } }, x, y, z, 0);
  const neck = e.edge === 0 && e.distance < 0.98 * TOP_CUT.range * U ? e.distance : TOP_CUT.range * U;
  const a = smooth(0.4, 0.6, armShare);
  return detailOf(detail.pack, x - frame.mid, y, front, 1 - a, neck, cut.spec.bands.neck, aa, normalZ * frame.facing);
}

const g = (x: number) => (Number.isInteger(x) ? `${x}.0` : `${x}`);
/**
 * The same in GLSL: `vec3 fabricTopDetail(vec4 D[8], float u, float y, float front, float trunk, float neck, float
 * neckBand, float aa)` -> (shade, edging, button). Written from `DETAIL_LOOK` (one table, not two).
 */
export function topDetailGlsl(): string {
  const L = DETAIL_LOOK;
  return `
float fabricTdFill(float d, float aa) { return smoothstep(-aa, aa, d); }
float fabricTdStroke(float d, float h, float aa) { return 1.0 - smoothstep(h - aa, h + aa, abs(d)); }
vec3 fabricTopDetail(vec4 D[8], float u, float y, float front, float trunk, float neck, float neckBand, float aa, float facing) {
  float U = D[7].z, ua = abs(u), shade = 1.0, edging = 0.0, button = 0.0, fr = front * trunk * smoothstep(${g(L.face[0])}, ${g(L.face[1])}, facing);
  if (D[0].x > 0.0) {
    float hw = D[0].x, below = fabricTdFill(y - D[0].z, aa), above = fabricTdFill(D[0].y - y, aa), inside = fabricTdFill(hw - ua, aa) * below * above * fr;
    float edge = max(fabricTdStroke(ua - hw, ${g(L.edgeLine)} * U, aa) * below, fabricTdStroke(y - D[0].z, ${g(L.edgeLine)} * U, aa) * fabricTdFill(hw - ua + aa, aa)) * above * fr;
    float stitch = max(fabricTdStroke(ua - hw + ${g(L.stitchIn)} * U, ${g(L.seam)} * U, aa), fabricTdStroke(y - D[0].z - ${g(L.stitchIn)} * U, ${g(L.seam)} * U, aa) * fabricTdFill(hw - ${g(L.stitchIn)} * U - ua, aa)) * inside;
    shade *= 1.0 + ${g(L.raised - 1)} * inside;
    shade *= 1.0 - ${g(L.edgeDark)} * edge;
    shade *= 1.0 - ${g(L.seamDark)} * stitch;
    edging = max(edging, D[0].w * inside);
  }
  if (D[1].x > 0.0) {
    float n = D[1].x, gap = n > 1.0 ? (D[1].z - D[1].y) / (n - 1.0) : 1.0, k = n > 1.0 ? clamp(floor((y - D[1].y) / gap + 0.5), 0.0, n - 1.0) : 0.0;
    float cy = D[1].y + k * gap, r = D[1].w, d = length(vec2(u, y - cy)), disc = fabricTdFill(r - d, aa) * fr;
    float hole = max(fabricTdFill(r * ${g(L.hole.r)} - length(vec2(ua - r * ${g(L.hole.out)}, y - cy)), aa), 0.0) * disc;
    button = disc * (1.0 - hole);
    shade *= 1.0 - 0.5 * fabricTdStroke(d - r, ${g(L.edgeLine)} * U, aa) * fr;
    shade *= 1.0 - 0.6 * hole;
  }
  if (D[2].x > 0.0) {
    float ox = D[2].y, oy = D[2].z, qy = D[2].w, px = D[7].x, py = D[7].y;
    float lo = length(vec2(px - ox, py - oy)), sOuter = ((px - ox) * (y - oy) - (py - oy) * (ua - ox)) / lo;
    float lq = length(vec2(px, py - qy)), sInner = ((py - qy) * ua - px * (y - qy)) / lq;
    float leaf = min(min(-sOuter, -sInner), ox - ua);
    float c = max(D[2].x - neck, leaf - (1.0 - fr) * 0.05 * U), on = fabricTdFill(c, aa);
    shade *= 1.0 + ${g(L.raised - 1)} * on;
    shade *= 1.0 - ${g(L.edgeDark)} * fabricTdStroke(c, ${g(L.edgeLine)} * U, aa);
    shade *= 1.0 - ${g(L.seamDark)} * fabricTdStroke(c - ${g(L.stitchIn)} * U, ${g(L.seam)} * U, aa) * on;
    shade *= 1.0 - ${g(L.shadow)} * (1.0 - smoothstep(0.0, ${g(L.shadowReach)} * U, -c)) * fabricTdFill(-c, aa);
  }
  if (D[6].x > 0.0) {
    float xa = D[3].x, ya = D[3].y, xb = D[3].z, yb = D[3].w, p = D[6].x;
    float s = clamp((ya - y) / (ya - yb), 0.0, 1.0), X = xa + (xb - xa) * pow(s, p), dX = s > 0.0 && s < 1.0 ? (xb - xa) * p * pow(s, p - 1.0) / (ya - yb) : 0.0;
    float d = (ua - X) / sqrt(1.0 + dX * dX), below = fabricTdFill(y - yb, aa);
    float region = max(max(1.0 - trunk, fabricTdFill(d, aa) * below), fabricTdFill(neckBand - neck, aa));
    edging = max(edging, region);
    shade *= 1.0 - ${g(L.seamDark)} * max(fabricTdStroke(d, ${g(L.seam)} * U, aa), fabricTdStroke(d + ${g(2 * L.stitchIn)} * U, ${g(L.seam)} * U, aa)) * below * trunk;
  }
  if (D[6].y > 0.0) {
    float tx = D[4].x, ty = D[4].y, sx = D[4].z, sy = D[4].w, l = length(vec2(sx - tx, sy - ty));
    float sd = ((sx - tx) * (y - ty) - (sy - ty) * (u - tx)) / l, along = ((u - tx) * (sx - tx) + (y - ty) * (sy - ty)) / (l * l);
    float on = fabricTdFill(along, aa) * fabricTdFill(1.0 - along, aa) * fr, bw = D[6].y;
    float bind = fabricTdFill(-sd, aa) * fabricTdFill(bw + sd, aa) * on;
    shade *= 1.0 + ${g(L.raised - 1)} * bind;
    shade *= 1.0 - ${g(L.edgeDark)} * fabricTdStroke(sd, ${g(L.edgeLine)} * U, aa) * on;
    shade *= 1.0 - ${g(L.seamDark)} * fabricTdStroke(sd + bw, ${g(L.seam)} * U, aa) * on;
    shade *= 1.0 - ${g(2 * L.shadow)} * (1.0 - smoothstep(0.0, ${g(L.shadowReach * 1.5)} * U, sd)) * fabricTdFill(sd, aa) * on;
    float kr = D[6].z, kd = length(vec2(u - sx, y - sy)), knot = fabricTdFill(kr - kd, aa) * fr;
    shade *= 1.0 + ${g((L.raised - 1) * 1.5)} * knot;
    shade *= 1.0 - ${g(L.edgeDark)} * fabricTdStroke(kd - kr, ${g(L.edgeLine * 1.5)} * U, aa) * fr;
    shade *= 1.0 - ${g(L.seamDark)} * fabricTdStroke(u - sx + 0.4 * (y - sy), ${g(L.seam * 1.5)} * U, aa) * knot;
  }
  if (D[5].z > 0.0) {
    float cx = D[5].x, topY = D[5].y, hw = D[5].z, botY = D[5].w, rc = 0.012 * U;
    float qx = abs(u - cx) - (hw - rc), qy = max(y - topY, botY + rc - y);
    float box = length(vec2(max(qx, 0.0), max(qy, 0.0))) + min(max(qx, qy), 0.0) - rc;
    float b = max(box, y - topY);
    shade *= 1.0 - ${g(L.edgeDark)} * fabricTdStroke(b, ${g(L.edgeLine)} * U, aa) * fr;
    shade *= 1.0 - ${g(L.seamDark)} * max(fabricTdStroke(b + ${g(L.stitchIn)} * U, ${g(L.seam)} * U, aa), fabricTdStroke(y - topY + 0.012 * U, ${g(L.seam)} * U, aa) * fabricTdFill(-b, aa)) * fr;
  }
  return vec3(shade, edging, button);
}`;
}

/** A style of his sheet: its cut (neck style and depth below the base of her neck, sleeve, bands) and its details. */
export interface TopDetailStyle {
  readonly sheet: string;
  readonly neckStyle: NeckStyle;
  /** NECKLINE: its lowest point on her trunk (0 her hip joints, 1 the base of her neck); null: the style's own drawn depth. */
  readonly neckFront: number | null;
  readonly sleeve: number;
  readonly band: Partial<TopBands>;
  readonly detail: TopDetailParams;
}

/**
 * GAME TUNING (metres on her) to his sheet, 2026-11-14. Sleeves as the templates' (a tee 0.32, 3/4 0.72, long 1.0);
 * bands as `TEE_BANDS` unless said.
 * - raglan (08): a crew, 3/4 sleeves; sleeves and neckband in the edging colour, its seam from 1.5 cm out of the rim's
 *   side point down to 7.5 cm under her shoulder joint, straight under it.
 * - henley (09): a crew; a 9 cm placket 2.6 cm wide, three buttons 1 cm across.
 * - polo (10): a crew under a fold-down collar 3 cm wide whose points are 4 cm out and 7 cm down; a 7 cm placket, two
 *   buttons; ribbed sleeve bands 2 cm.
 * - wrap (15): a deep V (15 cm), its crossing from the V's point to 12 cm out on her left, 12 cm over her hip joints, a 12 mm
 *   binding and a knot 2.2 cm across... its ribbons not drawn.
 * - buttonUp (16): a crew under a shirt collar, a placket to the hem 3 cm wide with a button every 8.5 cm, long sleeves
 *   with a 5 cm cuff, a pocket on her left chest 9 cm square, its top 7 cm under the base of her neck: over her bust's
 *   upper slope, as his sheet's. (MEASURED 2026-11-14 on her rest skin: her bust runs from 8 to 18 cm under her neck
 *   joint, its most forward point 14 cm under. The pocket was first 10 by 11 with its top 15 cm under: below her
 *   nipple line, its lower edge across the fold under her breast and onto the top of her belly.)
 */
export type TopDetailName = 'raglan' | 'henley' | 'polo' | 'wrap' | 'buttonUp';
export const TOP_DETAIL_STYLES: Readonly<Record<TopDetailName, TopDetailStyle>> = Object.freeze({
  raglan: { sheet: '08 Raglan Tee', neckStyle: 'crew', neckFront: null, sleeve: 0.72, band: {}, detail: { raglan: { fromRim: 0.015, under: 0.075, inFrom: 0, power: 1.4 } } },
  henley: { sheet: '09 Henley', neckStyle: 'crew', neckFront: null, sleeve: 0.32, band: {}, detail: { placket: { length: 0.09, width: 0.026 }, buttons: { count: 3, size: 0.01, tone: 0.75, first: 0.018 } } },
  polo: { sheet: '10 Fitted Polo', neckStyle: 'crew', neckFront: null, sleeve: 0.3, band: { sleeve: 0.02 }, detail: { collar: { width: 0.028, pointOut: 0.04, pointDrop: 0.07 }, placket: { length: 0.075, width: 0.026 }, buttons: { count: 2, size: 0.01, tone: 0.8, first: 0.028 } } },
  wrap: { sheet: '15 Wrap Top', neckStyle: 'v', neckFront: 1 - 0.15 / 0.5246, sleeve: 0.28, band: { neck: 0.012 }, detail: { wrap: { sideOut: 0.12, waistUp: 0.12, binding: 0.012, knot: 0.022 } } },
  buttonUp: { sheet: '16 Button-Up', neckStyle: 'crew', neckFront: null, sleeve: 1.0, band: { sleeve: 0.05 }, detail: { collar: { width: 0.028, pointOut: 0.035, pointDrop: 0.075 }, placket: { length: 'hem', width: 0.03 }, buttons: { spacing: 0.085, size: 0.011, tone: 0.85, first: 0.02 }, pocket: { out: 0.085, down: 0.07, width: 0.09, height: 0.09 } } },
});
