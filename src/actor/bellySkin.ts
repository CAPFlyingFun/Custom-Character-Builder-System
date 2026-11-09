/**
 * HER BELLY'S SKIN, THE TEST BAND (the skeleton-outward plan, the belly skin proof; Joshua, 2026-11-08, on v3 only: "a
 * full ring band round her lower torso, from under her breastbone to her pubic bone, front and back"; moving "hybrid like
 * v2"; after the birth "soft, then firms up").
 *
 * ONE CONTINUOUS SURFACE: rows of points round her, each row a level ring from the top of her pubic bone (row 0) to the
 * tip of her xiphoid (the last), every row's points at the same angles round its middle (0 her front, toward +x her left).
 *
 *  - ITS REST SHAPE is laid over her bone as measured (src/data/belly/, `scripts/measureBelly.ts`): as wide as her ribs,
 *    her iliac crests and her hips reach plus the tissue over them, drawn in at her waist where only her spine is; behind
 *    her spine by the muscle and fat there; in front, her belly's wall from her pubic bone (over the fat of the mons) out
 *    to her navel and up to her xiphoid and ribs (`layBand`). Not pregnant, that is her belly.
 *  - EACH ROW IS CARRIED BY HER SPINE: rigidly, by its bones' blended matrices (`rowMatrices`), so a row never folds into
 *    itself, and the rows blend from her pelvis up to her chest as her spine bends.
 *  - WHAT FILLS HER PUSHES IT OUT (`shapeBand`): every point of her womb, intestines and stomach as their soft bodies have
 *    them now is found in the band's own rows (how high, which way round, how far out) and the skin is kept at least its
 *    WALL outside it there, draped over it as a ball of `drape` radius would be -- so a growing womb rounds it out from
 *    inside, never through it. Each point only ever moves straight out from its row's middle, so a row stays a closed,
 *    non-crossing ring: the skin cannot pass through itself.
 *  - IT SWAYS (`spring`: v2's belly spring, FIRMNESS and BOUNCE): a damped mass whose lag moves the bump, its edges held.
 *  - AFTER A BIRTH IT IS SOFT, THEN FIRMS UP (`hold`): where what pushed it out is gone, the skin stays out and comes back
 *    in over `soften.seconds`, looser while it does.
 *
 * Units: rest metres for the layout; `shapeBand` works in whatever the row matrices take rest metres to (the room's world
 * units), `units` per metre. Every number is MEASURED, BIOLOGICAL SHAPE or GAME TUNING. Pure: plain arrays, no three.
 */

/** How the band is measured off her skeleton (GAME TUNING of the measuring, not of her): a row every 1.25 cm, each slice
 * 1 cm thick, bone within 20 cm of her midline, a row's bones blended over 3 cm up and down. */
export const BELLY_MEASURE = Object.freeze({ rowEvery: 0.0125, slab: 0.005, reach: 0.2, weightSmooth: 0.03 });

export interface SavedBelly {
  readonly rig: string;
  readonly model: string;
  readonly frame: string;
  readonly midlineX: number;
  /** her spine's bones, her pelvis's first */
  readonly spine: readonly string[];
  /** each level slice: its height; how far her bone reaches across (each side), forward and back; which bones carry it */
  readonly rows: readonly { readonly y: number; readonly halfWidth: number; readonly boneFront: number; readonly boneBack: number; readonly weights: Readonly<Record<string, number>> }[];
}

/** The tissue over her bone. BIOLOGICAL SHAPE (a slim woman: subcutaneous fat 1-2.5 cm over the iliac crest and the
 * lower belly, thinner over the ribs and the spine) and GAME TUNING within it. Metres. */
export const BELLY_TISSUE = Object.freeze({
  /** over her ribs at the sides and front */
  ribs: 0.014,
  /** over her iliac crests and hips at the sides */
  crest: 0.021,
  /** behind her spine: the muscle beside it and the fat over it, from the tips of its spines */
  back: 0.012,
  /** at her waist, drawn in this much more than a straight line between her ribs and her crests */
  waistPinch: 0.012,
  /** a row with bone narrower than this across is her waist (only her spine there) */
  waistBone: 0.08,
  /** over her pubic bone: the fat of the mons */
  mons: 0.024,
  /** in front of her xiphoid */
  xiphoid: 0.014,
  /** her belly front to back at her navel, skin to skin: about 18.5 cm (BIOLOGICAL SHAPE: a slim woman's waist depth) */
  navelDepth: 0.185,
  /** how square each quarter of a row is (2 an ellipse): her front rounder, her back flatter */
  frontRound: 2.2,
  backRound: 2.8,
});

/** How the skin lies over what fills her. GAME TUNING (BIOLOGICAL SHAPE: the wall over a pregnant womb thins to about
 * 1-1.5 cm of muscle and fat). Metres, seconds. */
export const BELLY_SKIN = Object.freeze({
  /** points round each row */
  cols: 64,
  /** the skin at least this far outside whatever fills her */
  wall: 0.012,
  /** draped over it as a ball this big would be (smaller: it follows every bump; bigger: rounder) */
  drape: 0.11,
  /** passes of smoothing over the push, so it reads as one belly and not each thing under it */
  smooth: 4,
  /** how softly the pushed shape blends into her rest shape */
  blend: 0.004,
  /** her first and last rows stay where her bone holds them; the next few follow more and more */
  pinRows: 1,
  /** after a birth: how long the skin takes to come back in (a time constant), and how much looser it moves meanwhile;
   * otherwise (a slider moved, a pose changed) it follows within a moment */
  soften: { seconds: 25, looser: 0.7, followSeconds: 0.15, growSeconds: 0.25 },
  /** the most the spring moves the bump, metres */
  swayMost: 0.02,
});

export interface Band {
  readonly rows: number;
  readonly cols: number;
  /** each row's height, its middle across and front-to-back (rest metres) */
  readonly y: Float32Array;
  readonly cx: Float32Array;
  readonly cz: Float32Array;
  /** each point's angle round its row (0 her front, +x her left) and its rest distance from its row's middle */
  readonly angle: Float32Array;
  readonly rest: Float32Array;
  /** rest points (rest metres), row by row */
  readonly points: Float32Array;
  readonly triangles: Uint32Array;
  /** each row's bones and their weights */
  readonly weights: readonly Readonly<Record<string, number>>[];
  /** the spine's bones, by name */
  readonly spine: readonly string[];
}

const smoothRow = (v: Float32Array, span: number) => {
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) { let s = 0, w = 0; for (let d = -span; d <= span; d++) { const j = Math.min(v.length - 1, Math.max(0, i + d)), f = 1 - Math.abs(d) / (span + 1); s += v[j] * f; w += f; } out[i] = s / w; }
  return out;
};
/** A row's distance from its middle at `angle` (0 front): a quarter superellipse each way, as wide as `half`, as deep as
 * `front` ahead and `back` behind its middle. */
export function rowRadius(angle: number, half: number, front: number, back: number): number {
  const s = Math.abs(Math.sin(angle)), c = Math.cos(angle), d = c >= 0 ? front : back, n = c >= 0 ? BELLY_TISSUE.frontRound : BELLY_TISSUE.backRound;
  return 1 / Math.pow((s / half) ** n + (Math.abs(c) / d) ** n, 1 / n);
}

/** Her belly's band at rest, over her bone as measured, her navel at `navelY`. */
export function layBand(saved: SavedBelly, navelY: number, xiphoid: readonly number[], symphysisTop: readonly number[], cols: number = BELLY_SKIN.cols): Band {
  const T = BELLY_TISSUE, R = saved.rows, n = R.length, x0 = saved.midlineX;
  // ACROSS: her bone plus its tissue, drawn in at her waist
  const half = new Float32Array(n);
  for (let k = 0; k < n; k++) half[k] = R[k].halfWidth >= T.waistBone ? R[k].halfWidth + (R[k].y > navelY ? T.ribs : T.crest) : NaN;
  for (let k = 0; k < n; k++) if (Number.isNaN(half[k])) {
    let a = k, b = k; while (a > 0 && Number.isNaN(half[a])) a--; while (b < n - 1 && Number.isNaN(half[b])) b++;
    const ha = Number.isNaN(half[a]) ? half[b] : half[a], hb = Number.isNaN(half[b]) ? ha : half[b], u = b > a ? (k - a) / (b - a) : 0.5;
    half[k] = ha + (hb - ha) * u - T.waistPinch * Math.sin(Math.PI * u);
  }
  const W = smoothRow(smoothRow(half, 3), 3);
  // BEHIND: the tips of her spine's processes plus the tissue there
  const back = smoothRow(Float32Array.from(R.map((r) => r.boneBack - T.back)), 3);
  // IN FRONT: her belly's wall -- the mons over her pubic bone, out to her navel, up to her xiphoid; over her ribs no less
  // than her ribs and their tissue
  const navelRow = R.reduce((best, r, k) => (Math.abs(r.y - navelY) < Math.abs(R[best].y - navelY) ? k : best), 0);
  const zP = symphysisTop[2] + T.mons, zN = back[navelRow] + T.navelDepth, zX = xiphoid[2] + T.xiphoid, yP = symphysisTop[1], yN = navelY, yX = xiphoid[1];
  const curve = (y: number) => {
    // (rising quickly off her pubic bone and rounding to her navel, then nearly level to her xiphoid)
    if (y <= yN) { const u = Math.max(0, (y - yP) / (yN - yP)); return zP + (zN - zP) * Math.sin((Math.PI / 2) * u) ** 0.7; }
    const u = Math.min(1, (y - yN) / (yX - yN)); return zN + (zX - zN) * u * u;
  };
  const front = smoothRow(Float32Array.from(R.map((r) => Math.max(curve(r.y), r.y > navelY ? r.boneFront + T.ribs : -Infinity))), 1);
  const y = Float32Array.from(R.map((r) => r.y)), cx = new Float32Array(n).fill(x0), cz = new Float32Array(n);
  const angle = new Float32Array(n * cols), rest = new Float32Array(n * cols), points = new Float32Array(n * cols * 3);
  for (let k = 0; k < n; k++) {
    cz[k] = (front[k] + back[k]) / 2;
    const f = front[k] - cz[k], b = cz[k] - back[k];
    for (let c = 0; c < cols; c++) {
      const a = (2 * Math.PI * c) / cols, i = k * cols + c, rr = rowRadius(a, W[k], f, b);
      angle[i] = a; rest[i] = rr;
      points[3 * i] = cx[k] + rr * Math.sin(a); points[3 * i + 1] = y[k]; points[3 * i + 2] = cz[k] + rr * Math.cos(a);
    }
  }
  // (the rows joined into one skin, facing out)
  const tris: number[] = [];
  for (let k = 0; k + 1 < n; k++) for (let c = 0; c < cols; c++) {
    const a = k * cols + c, b = k * cols + ((c + 1) % cols), d = a + cols, e = b + cols;
    tris.push(a, d, b, b, d, e);
  }
  return { rows: n, cols, y, cx, cz, angle, rest, points, triangles: Uint32Array.from(tris), weights: R.map((r) => r.weights), spine: saved.spine };
}

/**
 * Each row's matrix (rest metres to the world, column-major 4x4 a row) from her spine's bones' matrices now (`bones`:
 * each bone's own rest-to-world, in the order of `band.spine`), blended by the row's weights.
 */
export function rowMatrices(band: Band, bones: readonly ArrayLike<number>[], out: Float32Array = new Float32Array(band.rows * 16)): Float32Array {
  for (let k = 0; k < band.rows; k++) {
    out.fill(0, 16 * k, 16 * k + 16);
    const w = band.weights[k];
    let sum = 0;
    band.spine.forEach((name, b) => { const wb = w[name] ?? 0; if (wb <= 0) return; sum += wb; const m = bones[b]; for (let e = 0; e < 16; e++) out[16 * k + e] += wb * m[e]; });
    if (sum <= 0) { const m = bones[0]; for (let e = 0; e < 16; e++) out[16 * k + e] = m[e]; }
    else for (let e = 0; e < 16; e++) out[16 * k + e] /= sum;
  }
  return out;
}

/** A 4x4 (column-major, affine) inverted into `out` at `o`. */
export function invertAffine(m: ArrayLike<number>, mo: number, out: Float32Array, o: number): void {
  const a = m[mo], b = m[mo + 4], c = m[mo + 8], d = m[mo + 1], e = m[mo + 5], f = m[mo + 9], g = m[mo + 2], h = m[mo + 6], i = m[mo + 10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C, k = det !== 0 ? 1 / det : 0;
  const r00 = A * k, r01 = -(b * i - c * h) * k, r02 = (b * f - c * e) * k, r10 = B * k, r11 = (a * i - c * g) * k, r12 = -(a * f - c * d) * k, r20 = C * k, r21 = -(a * h - b * g) * k, r22 = (a * e - b * d) * k;
  const tx = m[mo + 12], ty = m[mo + 13], tz = m[mo + 14];
  out[o] = r00; out[o + 1] = r10; out[o + 2] = r20; out[o + 3] = 0;
  out[o + 4] = r01; out[o + 5] = r11; out[o + 6] = r21; out[o + 7] = 0;
  out[o + 8] = r02; out[o + 9] = r12; out[o + 10] = r22; out[o + 11] = 0;
  out[o + 12] = -(r00 * tx + r01 * ty + r02 * tz); out[o + 13] = -(r10 * tx + r11 * ty + r12 * tz); out[o + 14] = -(r20 * tx + r21 * ty + r22 * tz); out[o + 15] = 1;
}

/** v2's approved belly shapes on the band's grid (src/data/belly/v2-shapes.json, `scripts/measureV2Shapes.ts`): each key
 * target's push straight out (metres, against v2's 100% base), a row for each of the band's rows. */
export interface V2Shapes { readonly rows: number; readonly cols: number; readonly shapes: Readonly<Record<string, readonly number[]>> }
/** The 0% target's name (sarahLabTool.ts BELLY_TARGET). */
const V2_ZERO = 'belly';

/**
 * v2'S APPROVED BELLY ON v3 (Joshua, 2026-11-09: "I do approve the v2 belly look and shapes... apply it all to v3"):
 * how far her skin stands out past her 0% at each of the band's points (metres), for v2's BUMP slider's target weights
 * now (`bellyWeights(bump, curve)`): the weighted key targets less the 0% one, as v2's mesh blends them.
 */
export function v2Push(band: Band, v2: V2Shapes, weights: Readonly<Record<string, number>>, out: Float32Array = new Float32Array(band.rows * band.cols)): Float32Array {
  const zero = v2.shapes[V2_ZERO], R = band.rows, C = band.cols;
  for (let k = 0; k < R; k++) for (let c = 0; c < C; c++) {
    // (the band's row and angle on v2's grid: both run pubic bone to breastbone and round from her front)
    const gk = Math.min(v2.rows - 1, Math.round((k / Math.max(1, R - 1)) * (v2.rows - 1))), gc = Math.round((c / C) * v2.cols) % v2.cols, g = gk * v2.cols + gc;
    let x = -(zero?.[g] ?? 0);
    for (const name in weights) { const w = weights[name]; if (w && v2.shapes[name]) x += w * v2.shapes[name][g]; }
    out[k * C + c] = Math.max(0, x);
  }
  return out;
}

/** How much v2's approved belly holds past her 0%, by her BUMP %, litres: MEASURED on v2's own shapes
 * (`scripts/measureV2Belly.ts`, 2026-11-09), straight lines between them. */
export const V2_BELLY_LITRES: readonly (readonly [number, number])[] = Object.freeze([[0, 0], [25, 0.18], [30, 0.43], [50, 1.52], [60, 2.73], [75, 4.74], [100, 10.09], [150, 13.91], [200, 17.89]]);
export function v2BellyLitres(bumpPercent: number): number {
  const t = V2_BELLY_LITRES, b = Math.min(200, Math.max(0, Number.isFinite(bumpPercent) ? bumpPercent : 0));
  for (let i = 1; i < t.length; i++) if (b <= t[i][0]) { const [b0, l0] = t[i - 1], [b1, l1] = t[i]; return l0 + ((l1 - l0) * (b - b0)) / (b1 - b0); }
  return t[t.length - 1][1];
}
/**
 * WOMB FILL (Joshua, 2026-11-09, choosing the hybrid: "How about a hybrid version of 1 and 2"): how big her womb is drawn,
 * mL -- `fill` (0..1) of the way from what it really holds (`realMl`) to all of v2's belly at her BUMP % (never less than
 * it holds). What it holds and weighs stay the real numbers; her belly's soft wall fills the rest out to v2's shape.
 * GAME TUNING (WOMB_FILL_DEFAULT: halfway).
 */
export const WOMB_FILL_DEFAULT = 50;
export function wombDrawnMl(realMl: number, bumpPercent: number, fill: number): number {
  const f = Math.min(1, Math.max(0, Number.isFinite(fill) ? fill : 0.5));
  return realMl + f * Math.max(0, v2BellyLitres(bumpPercent) * 1000 - realMl);
}

/** What the band keeps frame to frame. */
export interface BandState {
  /** how far each point stands out past its rest now (rest metres), and the most it was pushed this frame */
  readonly hold: Float32Array;
  readonly need: Float32Array;
  readonly push: Float32Array;
  readonly inv: Float32Array;
  /** how loose it is now (0 firm .. 1 at its loosest after a birth) */
  loose: number;
  /** after a birth (soft, then firming up: `soften.seconds`), or not (it follows: `soften.followSeconds`) */
  afterBirth: boolean;
}
export const bandState = (b: Band): BandState => ({ hold: new Float32Array(b.rows * b.cols), need: new Float32Array(b.rows * b.cols), push: new Float32Array(b.rows * b.cols), inv: new Float32Array(b.rows * 16), loose: 0, afterBirth: false });

/**
 * THE BAND THIS FRAME, into `out` (the world's units): carried by `rows` (`rowMatrices`), pushed out by `sources` (points,
 * the world's units: what fills her as drawn now), held out after what pushed it is gone, and moved by `sway` (rest
 * metres, her belly spring's mass) where it is pushed out, and settled by `soft` (v2's soft settle, softBody.ts
 * `softBellyWant`: to her side, sagging, deeper (+) or flatter, each per metre a point stands out past its rest), its
 * shape at least `shape` (metres past its rest a point: v2's approved belly, `v2Push`) -- the soft wall of her belly
 * filling what lies between what fills her and that. `units` the world's units per metre; `dt` seconds.
 * Returns the most any point stands out past its rest (metres).
 */
export function shapeBand(band: Band, rows: Float32Array, sources: readonly ArrayLike<number>[], state: BandState, out: Float32Array, units: number, dt: number, sway: readonly [number, number, number] = [0, 0, 0], soft: readonly [number, number, number] = [0, 0, 0], shape: ArrayLike<number> | null = null): number {
  const S = BELLY_SKIN, R = band.rows, C = band.cols, u = units;
  for (let k = 0; k < R; k++) invertAffine(rows, 16 * k, state.inv, 16 * k);
  // NEED: how far out each point must stand (rest metres from its row's middle), from every source point
  const need = state.need; need.fill(-Infinity);
  const inv = state.inv, wall = S.wall, ball = S.drape, step = R > 1 ? (band.y[R - 1] - band.y[0]) / (R - 1) : 1;
  const reach = Math.sqrt(2 * ball * 0.05), rowSpan = Math.ceil(reach / step);
  const hs = new Float32Array(R), lx = new Float32Array(R), lz = new Float32Array(R);
  for (const src of sources) for (let p = 0; p + 2 < src.length; p += 3) {
    const X = src[p], Y = src[p + 1], Z = src[p + 2];
    // (its height in each row's own frame, rest metres; it lies between the two rows it changes sign between)
    let r = -1;
    for (let k = 0; k < R; k++) {
      const o = 16 * k;
      lx[k] = (inv[o] * X + inv[o + 4] * Y + inv[o + 8] * Z + inv[o + 12]);
      hs[k] = (inv[o + 1] * X + inv[o + 5] * Y + inv[o + 9] * Z + inv[o + 13]) - band.y[k];
      lz[k] = (inv[o + 2] * X + inv[o + 6] * Y + inv[o + 10] * Z + inv[o + 14]);
      if (k && r < 0 && hs[k - 1] >= 0 && hs[k] < 0) r = k - 1;
    }
    if (r < 0) { if (hs[0] < 0 && hs[0] > -step) r = 0; else if (hs[R - 1] >= 0 && hs[R - 1] < step) r = R - 1; else continue; }
    const t = r < R - 1 && hs[r] - hs[r + 1] > 0 ? r + hs[r] / (hs[r] - hs[r + 1]) : r;
    const r1 = Math.min(R - 1, r + 1), f = t - r;
    const x = lx[r] + (lx[r1] - lx[r]) * f - (band.cx[r] + (band.cx[r1] - band.cx[r]) * f);
    const z = lz[r] + (lz[r1] - lz[r]) * f - (band.cz[r] + (band.cz[r1] - band.cz[r]) * f);
    const rho = Math.hypot(x, z) + wall;
    if (rho < 0.02) continue;
    const phi = Math.atan2(x, z), cSpan = Math.ceil((reach / rho) / ((2 * Math.PI) / C));
    const c0 = Math.round((phi / (2 * Math.PI)) * C);
    for (let k = Math.max(0, Math.floor(t) - rowSpan); k <= Math.min(R - 1, Math.ceil(t) + rowSpan); k++) {
      const dy = (k - t) * step;
      for (let dc = -cSpan; dc <= cSpan; dc++) {
        const c = (((c0 + dc) % C) + C) % C, i = k * C + c;
        let da = band.angle[i] - phi; da -= 2 * Math.PI * Math.round(da / (2 * Math.PI));
        const ds = rho * da, v = rho - (dy * dy + ds * ds) / (2 * ball);
        if (v > need[i]) need[i] = v;
      }
    }
  }
  // PUSH: how far past its rest each point is pushed, blended softly into her rest shape; her first and last rows held
  const push = state.push, b = S.blend;
  let most = 0;
  for (let k = 0; k < R; k++) {
    const pin = Math.min(1, Math.min(k, R - 1 - k) / Math.max(1, S.pinRows + 1));
    for (let c = 0; c < C; c++) {
      const i = k * C + c, x = Math.max(need[i] - band.rest[i], shape ? shape[i] : -Infinity);
      push[i] = Number.isFinite(x) ? pin * b * Math.log1p(Math.exp(Math.min(40, x / b))) : 0;
    }
  }
  // (smoothed round and up and down, never below what any point needs by more than a few millimetres)
  if (S.smooth > 0) {
    const tmp = new Float32Array(R * C);
    for (let pass = 0; pass < S.smooth; pass++) {
      for (let k = 0; k < R; k++) for (let c = 0; c < C; c++) {
        const i = k * C + c, l = k * C + ((c + C - 1) % C), r = k * C + ((c + 1) % C), d = k > 0 ? i - C : i, u2 = k < R - 1 ? i + C : i;
        tmp[i] = (2 * push[i] + push[l] + push[r] + push[d] + push[u2]) / 6;
      }
      for (let i = 0; i < R * C; i++) {
        const k = Math.floor(i / C), pin = Math.min(1, Math.min(k, R - 1 - k) / Math.max(1, S.pinRows + 1)), floor = Math.max(Number.isFinite(need[i]) ? need[i] - band.rest[i] - 0.003 : 0, shape ? shape[i] - 0.003 : 0);
        push[i] = pin * Math.max(tmp[i], floor, 0);
      }
    }
  }
  // HOLD: out at once; back in slowly (after a birth: soft, then firming)
  // (and out over `soften.growSeconds`, not at once -- Joshua, 2026-11-09: "not acting dynamic and like a full sim" --
  // though never inside what fills her: that is held below, as drawn)
  const back = Math.exp(-Math.max(0, dt) / (state.afterBirth ? S.soften.seconds : S.soften.followSeconds));
  const out1 = dt > 0 ? Math.exp(-dt / S.soften.growSeconds) : 0;
  let slack = 0, peak = 0;
  for (let i = 0; i < R * C; i++) {
    const h = state.hold[i], want = push[i];
    state.hold[i] = want >= h ? want + (h - want) * out1 : want + (h - want) * back;
    slack = Math.max(slack, state.hold[i] - want); peak = Math.max(peak, state.hold[i]); most = Math.max(most, state.hold[i]);
  }
  state.loose = state.afterBirth && peak > 0.005 ? Math.min(1, slack / Math.max(0.02, peak)) : 0;
  // DRAWN: each point straight out from its row's middle, the bump moved by the spring (its edges held), never back
  // inside what fills her; then carried by its row
  const sx = sway[0], sy = sway[1], sz = sway[2];
  for (let k = 0; k < R; k++) {
    const o = 16 * k;
    for (let c = 0; c < C; c++) {
      const i = k * C + c, a = band.angle[i], r0 = band.rest[i] + state.hold[i];
      const w = peak > 0.005 ? state.hold[i] / peak : 0;
      // (v2's soft settle moves each point by how far it stands out, so the base of her belly holds and its front moves most)
      const h = state.hold[i];
      let px = band.cx[k] + r0 * Math.sin(a) + w * sx + soft[0] * h, py = band.y[k] + w * sy + soft[1] * h, pz = band.cz[k] + r0 * Math.cos(a) + w * sz + soft[2] * h;
      // (never moved by the spring back inside what it lies over)
      const dx = px - band.cx[k], dz = pz - band.cz[k], rr = Math.hypot(dx, dz), floor = Math.max(band.rest[i] * 0.98, Number.isFinite(need[i]) ? need[i] - 0.002 : 0);
      if (rr < floor && rr > 1e-6) { px = band.cx[k] + (dx * floor) / rr; pz = band.cz[k] + (dz * floor) / rr; }
      out[3 * i] = (rows[o] * px + rows[o + 4] * py + rows[o + 8] * pz) * 1 + rows[o + 12];
      out[3 * i + 1] = (rows[o + 1] * px + rows[o + 5] * py + rows[o + 9] * pz) + rows[o + 13];
      out[3 * i + 2] = (rows[o + 2] * px + rows[o + 6] * py + rows[o + 10] * pz) + rows[o + 14];
    }
  }
  // NEVER THROUGH ITSELF: where her spine bends a row toward the one below it (forward over a big belly, sitting), each
  // point is kept above the one under it in that row's own frame -- lifted along that row's up, never let through it
  const inv2 = state.inv, minGap = 0.35 * step;
  for (let k = 0; k + 1 < R; k++) {
    const o = 16 * k, ux = rows[o + 4], uy = rows[o + 5], uz = rows[o + 6], ul = Math.hypot(ux, uy, uz) || 1;
    for (let c = 0; c < C; c++) {
      const i = k * C + c, j = i + C;
      const h = (p: number) => inv2[o + 1] * out[3 * p] + inv2[o + 5] * out[3 * p + 1] + inv2[o + 9] * out[3 * p + 2] + inv2[o + 13];
      const gap = h(j) - h(i);
      if (gap >= minGap) continue;
      // (the row's up, in the world, is its matrix's second column: one rest metre up is `ul` world units)
      const lift = (minGap - gap) * ul;
      out[3 * j] += (ux / ul) * lift; out[3 * j + 1] += (uy / ul) * lift; out[3 * j + 2] += (uz / ul) * lift;
    }
  }
  void u;
  return most;
}

/** How many of a band's triangles cross one another (for tests: a skin that passes through itself), checked in the
 * band's own rows: any two points of neighbouring rows standing in the wrong order, or a row's ring folding back. */
export function bandFolds(band: Band, drawn: ArrayLike<number>, rows: Float32Array): number {
  const R = band.rows, C = band.cols, inv = new Float32Array(16 * R);
  for (let k = 0; k < R; k++) invertAffine(rows, 16 * k, inv, 16 * k);
  let folds = 0;
  // each point seen from its own row and the next: the row above must stand above it
  for (let k = 0; k + 1 < R; k++) for (let c = 0; c < C; c++) {
    const i = k * C + c, j = i + C, o = 16 * k;
    const h = (p: number) => inv[o + 1] * drawn[3 * p] + inv[o + 5] * drawn[3 * p + 1] + inv[o + 9] * drawn[3 * p + 2] + inv[o + 13];
    if (h(j) <= h(i)) folds++;
  }
  // round each row: the angle goes on round, never back
  for (let k = 0; k < R; k++) {
    const o = 16 * k;
    let last = -Infinity, turns = 0;
    for (let c = 0; c <= C; c++) {
      const p = k * C + (c % C), x = inv[o] * drawn[3 * p] + inv[o + 4] * drawn[3 * p + 1] + inv[o + 8] * drawn[3 * p + 2] + inv[o + 12] - band.cx[k], z = inv[o + 2] * drawn[3 * p] + inv[o + 6] * drawn[3 * p + 1] + inv[o + 10] * drawn[3 * p + 2] + inv[o + 14] - band.cz[k];
      let a = Math.atan2(x, z); if (c === 0) { last = a; continue; }
      while (a < last - Math.PI) a += 2 * Math.PI; while (a > last + Math.PI) a -= 2 * Math.PI;
      if (a <= last) turns++;
      last = a;
    }
    folds += turns;
  }
  return folds;
}
