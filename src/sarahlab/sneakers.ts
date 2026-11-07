/**
 * HER SNEAKERS (Joshua, 2026-11-07: "can you create custom sneakers that will work for the female base model and adjust
 * to the sliders? The thing that needs the TMB-Story to look better is shoes"; then, of the style and colours, "exactly
 * like the reference image" -- low-top knit runners in a dusty navy, a chunky white midsole with a little lavender in it,
 * navy laces, a padded collar and heel tab, a white label at the top of the tongue -- and "a TMB on the tongue").
 *
 * Not a model from a file fitted to her: a pair built round HER OWN FOOT, as a shoemaker builds on a last. Her foot's
 * skin (the vertices her ankle and toe bones carry) is measured in her rest frame, along it (heel to toe), across it and
 * up it; the upper is laid round it a few millimetres off (a Minkowski outline: room all round, more for her toes), the
 * midsole under it, the collar cut below her ankle bones, the throat open over her instep with a tongue under it and
 * laces across it. Every point of the shoe then takes its bone weights from her skin nearest it, so it is carried by her
 * skeleton exactly as her foot is: her FEET size (her ankle bone's scale), her leg lengths and HEIGHT (her bones'
 * offsets) and every pose move it with her, with nothing more to do. The sole puts her up off the floor by its height
 * under the ball of her foot (`liftOf`), as real shoes do.
 *
 * Pure geometry and arithmetic down to `buildSneaker`; `Sneakers` dresses it in its materials (a knit, drawn on a
 * canvas, needs a browser) and binds it to her.
 */
import * as THREE from 'three';
import type { BuildAmounts } from '../actor/bodyBuild';
import { applyBuildToMesh, buildMeshFields, type BuildMeshFields, type BuildRig } from '../view/bodyBuild';

/**
 * The shoe's own measures, in metres on her as approved (her FEET slider scales them with her foot). GAME TUNING, read
 * off the reference's proportions against her foot (27.0 cm heel to toe, 9.6 cm across the ball, MEASURED on
 * sarah-v2-body-slim.glb): room round her foot (sides, over it, before her toes), the sole's height under the ball of her
 * foot (under her heel it is a centimetre more: her heel stands that much higher at rest), how far its toe and heel turn
 * up, how far the midsole comes up her sides and flares out past the upper, the collar's height at the back and at its
 * lowest (below her ankle bones), where along the shoe (0 heel, 1 toe) the collar dips and the throat runs, how wide the
 * throat is open, how many pairs of eyelets, and the section's squareness (2 an ellipse, higher boxier).
 */
export const SNEAKER = Object.freeze({
  sideRoom: 0.005, topRoom: 0.006, toeRoom: 0.014,
  stack: 0.016, spring: 0.012, springFrom: 0.78, heelBevel: 0.005, bevelTo: 0.07,
  wrapHeel: 0.01, wrapToe: 0.006, flareHeel: 0.008, flareToe: 0.0035,
  collarBack: 0.088, collarSide: 0.068, collarFront: 0.078, dipAt: 0.22, throatBack: 0.4, throatFront: 0.71, gapBack: 0.012, gapFront: 0.006,
  eyelets: 6, squareness: 2.7,
  laceRadius: 0.0017, padRadius: 0.0048, tongueRise: 0.024, tongueBack: 0.05, label: [0.024, 0.013] as const,
});

/** How many rows down the shoe, and points across each half of its upper. */
const ROWS = 120, ACROSS = 24;
/** Below this height (metres over the floor) her foot's skin sets the shoe's width: above it her ankle bones bulge. */
const WIDTH_CAP = 0.065;
/** How high up her leg (metres over the floor) her skin is measured with her foot: past any collar. */
const ANKLE_REACH = 0.14;

export type V3 = [number, number, number];

/** Her foot measured: its frame in her rest frame, and each of its points along (u), out (a) and up (h) in it, metres. */
export interface FootMeasure {
  /** The floor under her foot (u = a = h = 0 is under the back of her heel, on the line down the middle of her foot). */
  readonly origin: V3;
  /** Toward her toes, outward (away from her other foot), and up: unit vectors in her rest frame. */
  readonly along: V3;
  readonly out: V3;
  readonly up: V3;
  /** Heel to toe, metres. */
  readonly length: number;
  readonly u: Float64Array;
  readonly a: Float64Array;
  readonly h: Float64Array;
}

const dot = (p: V3, q: V3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const smooth01 = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Her foot from its skin: `rest` is her points in her rest frame (metres, +y up), `onFoot` each point's weight on her
 * ankle and toe bones; a point is her foot where that is over a half. Which way is along it is its sole's longest
 * direction, toward the end away from her ankle.
 */
export function measureFoot(rest: ArrayLike<number>, onFoot: ArrayLike<number>): FootMeasure {
  const idx: number[] = [];
  let y0 = Infinity;
  for (let i = 0; i < onFoot.length; i++) if (onFoot[i] > 0.5) { idx.push(i); y0 = Math.min(y0, rest[3 * i + 1]); }
  if (idx.length < 20) throw new Error('sneakers: no foot to measure');
  // its sole's spread in the floor's plane
  let mx = 0, mz = 0, n = 0;
  for (const i of idx) if (rest[3 * i + 1] < y0 + 0.04) { mx += rest[3 * i]; mz += rest[3 * i + 2]; n++; }
  mx /= n; mz /= n;
  let sxx = 0, sxz = 0, szz = 0;
  for (const i of idx) if (rest[3 * i + 1] < y0 + 0.04) { const dx = rest[3 * i] - mx, dz = rest[3 * i + 2] - mz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
  const theta = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  let along: V3 = [Math.cos(theta), 0, Math.sin(theta)];
  // toward her toes: away from her ankle (the highest of her foot)
  let hx = 0, hz = 0, hn = 0;
  for (const i of idx) if (rest[3 * i + 1] > y0 + 0.06) { hx += rest[3 * i]; hz += rest[3 * i + 2]; hn++; }
  if (hn && (hx / hn - mx) * along[0] + (hz / hn - mz) * along[2] > 0) along = [-along[0], 0, -along[2]];
  // outward: away from her middle (x = 0)
  let out: V3 = [along[2], 0, -along[0]];
  if (out[0] * mx < 0) out = [-out[0], 0, -out[2]];
  const up: V3 = [0, 1, 0];
  // her foot along, out and up, from the back of her heel and the middle of her sole
  let uMin = Infinity, uMax = -Infinity, aMin = Infinity, aMax = -Infinity;
  for (const i of idx) {
    const p: V3 = [rest[3 * i] - mx, rest[3 * i + 1] - y0, rest[3 * i + 2] - mz], u = dot(p, along), a = dot(p, out);
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    if (p[1] < 0.04) { aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); }
  }
  const a0 = (aMin + aMax) / 2;
  // ...and all her skin over it up to her ankle, whatever bone carries it: the back of her heel up to the collar is
  // her shin's as much as her foot's (weighted to her foot, her heel stopped 5 cm up, and the heel cup with it)
  const U: number[] = [], A: number[] = [], Hh: number[] = [];
  for (let i = 0; i < rest.length / 3; i++) {
    const p: V3 = [rest[3 * i] - mx, rest[3 * i + 1] - y0, rest[3 * i + 2] - mz];
    if (p[1] > ANKLE_REACH) continue;
    const u = dot(p, along) - uMin, a = dot(p, out) - a0;
    if (u < -0.02 || u > uMax - uMin + 0.02 || Math.abs(a) > (aMax - aMin) / 2 + 0.03) continue;
    if (onFoot[i] <= 0.5 && u > (uMax - uMin) * 0.55) continue;
    U.push(u); A.push(a); Hh.push(p[1]);
  }
  const origin: V3 = [mx + along[0] * uMin + out[0] * a0, y0, mz + along[2] * uMin + out[2] * a0];
  return { origin, along, out, up, length: uMax - uMin, u: Float64Array.from(U), a: Float64Array.from(A), h: Float64Array.from(Hh) };
}

/** One shoe as built: points in her rest frame (metres), their texture places, triangles, and material groups. */
export interface SneakerBuild {
  readonly position: Float32Array;
  readonly uv: Float32Array;
  /** 0..1 per point: how dark an overlay its knit is (heel counter, eyelet stays), for its colour. */
  readonly shade: Float32Array;
  readonly index: Uint32Array;
  readonly groups: readonly { start: number; count: number; material: SneakerPart }[];
  /** The sole's height under the ball of her foot (what she is lifted by), metres. */
  readonly lift: number;
  /** Points of the upper whose places are the same as another's (the seam down the top of the toe): pairs. */
  readonly seams: Uint32Array;
}

export const SNEAKER_PARTS = ['upper', 'midsole', 'outsole', 'laces', 'collar', 'tongue', 'label'] as const;
export type SneakerPart = typeof SNEAKER_PARTS[number];

/** The shoe's profile down its length: each row's place along it and its sections' measures (metres, in the foot's frame). */
interface Profile {
  readonly u: number; readonly t: number;
  /**
   * The upper's middle (out from the line down her foot: her big toe and her heel are not on one straight line) and half
   * its width at the bite line; the bite line's height (where upper meets midsole); its top.
   */
  readonly c: number; readonly w: number; readonly yb: number; readonly ht: number;
  /** The midsole's middle and half its width, and its bottom's height. */
  readonly mc: number; readonly mw: number; readonly bottom: number;
}

/** Her foot binned along its length (1 mm): the most out, the most in, the highest and the lowest of it in each bin. */
function bins(foot: FootMeasure, stretch: (u: number) => number, cap: (u: number) => number) {
  const size = 0.001, n = Math.ceil((foot.length + 0.05) / size) + 1;
  const lat = new Float64Array(n).fill(-Infinity), med = new Float64Array(n).fill(-Infinity), top = new Float64Array(n).fill(-Infinity), bot = new Float64Array(n).fill(Infinity);
  for (let k = 0; k < foot.u.length; k++) {
    const b = Math.round(stretch(foot.u[k]) / size);
    if (b < 0 || b >= n) continue;
    if (foot.h[k] <= cap(b * size)) top[b] = Math.max(top[b], foot.h[k]);
    bot[b] = Math.min(bot[b], foot.h[k]);
    if (foot.h[k] < WIDTH_CAP) { lat[b] = Math.max(lat[b], foot.a[k]); med[b] = Math.max(med[b], -foot.a[k]); }
  }
  return { size, lat, med, top, bot };
}

/** The most of `v[b] + sqrt(r² − (u − b·size)²)` over the bins within r of u: a disc's room round each point, as an outline. */
function minkowski(v: Float64Array, size: number, u: number, r: number): number {
  let best = -Infinity;
  const lo = Math.max(0, Math.floor((u - r) / size)), hi = Math.min(v.length - 1, Math.ceil((u + r) / size));
  for (let b = lo; b <= hi; b++) {
    if (v[b] === -Infinity) continue;
    const d = u - b * size, q = r * r - d * d;
    if (q >= 0) best = Math.max(best, v[b] + Math.sqrt(q));
  }
  return best;
}

/** The collar's height over the floor at `t` (0 heel, 1 toe): high at the back, down under her ankle bones, up again to the throat. */
function collarAt(t: number): number {
  const S = SNEAKER;
  if (t <= S.dipAt) return S.collarSide + (S.collarBack - S.collarSide) * (1 - smooth01(t / S.dipAt));
  return S.collarSide + (S.collarFront - S.collarSide) * smooth01((t - S.dipAt) / (S.throatBack - S.dipAt));
}

/**
 * How high her foot is the shoe's business at `t`: up to the collar, and past the throat a line rising up her instep.
 * Above it is her leg, going out through the opening -- measured with her foot, the front of her ankle stood 11 cm
 * high where the throat begins, and the throat's edges went up it.
 */
function legFrom(t: number): number {
  const S = SNEAKER;
  return t <= S.throatBack ? collarAt(t) : S.collarFront + 0.3 * (t - S.throatBack);
}

/** How far open the throat is either side of its middle at `t` (metres): wide behind, narrowing, closed at its front. */
function gapAt(t: number): number {
  const S = SNEAKER, close = 0.035;
  if (t >= S.throatFront) return 0;
  if (t <= S.throatBack) return S.gapBack;
  const tn = S.throatFront - close;
  if (t <= tn) return lerp(S.gapBack, S.gapFront, (t - S.throatBack) / (tn - S.throatBack));
  const x = (t - tn) / close;
  return S.gapFront * Math.sqrt(Math.max(0, 1 - x * x));
}

function profiles(foot: FootMeasure): { rows: Profile[]; stretch: (u: number) => number } {
  const S = SNEAKER, L = foot.length, toeFrom = L - 0.07;
  // her toes given their room: the last 7 cm of her foot drawn out, so the toe box runs on past them
  const stretch = (u: number) => u + (S.toeRoom - S.sideRoom) * smooth01((u - toeFrom) / (L - toeFrom));
  const Ls = stretch(L), tOf = (u: number) => Math.max(0, Math.min(1, (u + S.sideRoom) / (Ls + 2 * S.sideRoom)));
  const B = bins(foot, stretch, (u) => legFrom(tOf(u)));
  // the sole of her foot down its length, held level past its ends and smoothed
  const sole = (u: number) => {
    let m = Infinity;
    const b0 = Math.round(Math.max(0, Math.min(Ls, u)) / B.size);
    for (let b = b0 - 6; b <= b0 + 6; b++) if (b >= 0 && b < B.bot.length && B.bot[b] < Infinity) m = Math.min(m, B.bot[b]);
    return m === Infinity ? 0 : m;
  };
  const uBack = -S.sideRoom, uFront = Ls + S.sideRoom, maxFlare = Math.max(S.flareHeel, S.flareToe);
  const out: Profile[] = [];
  for (let i = 0; i < ROWS; i++) {
    // denser at the heel and the toe, where the shoe turns round
    const s = i / (ROWS - 1), t = (1 - Math.cos(Math.PI * s)) / 2;
    const u = lerp(uBack - maxFlare, uFront + maxFlare, t);
    const tu = Math.max(0, Math.min(1, (u - uBack) / (uFront - uBack)));
    const flare = lerp(S.flareHeel, S.flareToe, smooth01(tu * 1.4));
    // (each side's reach, as a middle and a half width; past its ends, nothing)
    const span = (r: number): [number, number] => {
      const l = minkowski(B.lat, B.size, u, r), m = minkowski(B.med, B.size, u, r);
      return l === -Infinity || m === -Infinity || l + m <= 0 ? [NaN, 0] : [(l - m) / 2, (l + m) / 2];
    };
    const [c, w] = span(S.sideRoom), [mc, mw] = span(S.sideRoom + flare);
    const bed = sole(u), yb = bed + lerp(S.wrapHeel, S.wrapToe, smooth01(tu * 1.6));
    const ht = Math.max(yb + 0.004, minkowski(B.top, B.size, u, S.topRoom));
    let bottom = -S.stack + S.spring * Math.pow(smooth01((tu - S.springFrom) / (1 - S.springFrom)), 1.6) + S.heelBevel * Math.pow(Math.max(0, 1 - tu / S.bevelTo), 2);
    bottom = Math.min(bottom, bed - 0.004);
    out.push({ u, t: tu, c, w, yb, ht, mc, mw, bottom });
  }
  // a rounder toe: from the ball of her foot (the widest across her front half) at least an ellipse's quarter to the tip,
  // squared off a little (TOE_SQUARE) -- her toes' own outline came to a point at her big toe
  for (const [wKey, cKey] of [['w', 'c'], ['mw', 'mc']] as const) {
    let ball = -1;
    for (let i = 0; i < out.length; i++) if (out[i].t > 0.55 && out[i].t < 0.85 && (ball < 0 || out[i][wKey] > out[ball][wKey])) ball = i;
    const tip = out.length - 1 - [...out].reverse().findIndex((r) => r[wKey] > 0);
    if (ball < 0 || tip <= ball) continue;
    const u0 = out[ball].u, u1 = out[tip].u, w0 = out[ball][wKey], c0 = out[ball][cKey], c1 = out[tip][cKey];
    for (let i = ball + 1; i <= tip; i++) {
      const x = (out[i].u - u0) / (u1 - u0), round = w0 * Math.pow(Math.max(0, 1 - Math.pow(x, TOE_SQUARE)), 1 / TOE_SQUARE);
      if (round > out[i][wKey]) {
        const r = out[i] as { w: number; c: number; mw: number; mc: number };
        // (its middle eased from the ball's toward the tip's, where the toe box is widened)
        const cNow = Number.isNaN(r[cKey]) ? c1 : r[cKey];
        r[cKey] = lerp(cNow, lerp(c0, Number.isNaN(c1) ? c0 : c1, x), smooth01((round - r[wKey]) / Math.max(1e-6, 0.3 * w0)));
        r[wKey] = round;
      }
    }
  }
  // a middle where there is no width (past its ends): the nearest one's
  for (const key of ['c', 'mc'] as const) {
    const firstAt = out.findIndex((r) => !Number.isNaN(r[key])), lastAt = out.length - 1 - [...out].reverse().findIndex((r) => !Number.isNaN(r[key]));
    for (let i = 0; i < out.length; i++) if (Number.isNaN(out[i][key])) (out[i] as { c: number; mc: number })[key] = out[i < firstAt ? firstAt : lastAt][key];
  }
  // smoothed down its length, never in from her foot: her toes and the ball of her foot drew a scalloped outline. The
  // most within SMOOTH of each row, then the mean of that (in from either end no further than the end is)
  const smoothed = (key: 'w' | 'mw' | 'ht') => {
    const v = out.map((r) => r[key]), most = v.map((_, i) => windowOf(out, i, key === 'ht' ? 0 : key).reduce((m, j) => Math.max(m, v[j]), -Infinity));
    return most.map((_, i) => { const w = windowOf(out, i, key === 'ht' ? 0 : key); return w.reduce((s2, j) => s2 + most[j], 0) / w.length; });
  };
  const centre = (key: 'c' | 'mc') => out.map((_, i) => { const w = windowOf(out, i, key === 'c' ? 'w' : 'mw'); return w.reduce((s2, j) => s2 + out[j][key], 0) / w.length; });
  const [w2, mw2, ht2, c2, mc2] = [smoothed('w'), smoothed('mw'), smoothed('ht'), centre('c'), centre('mc')];
  return { rows: out.map((r, i) => ({ ...r, w: r.w > 0 ? w2[i] : 0, mw: r.mw > 0 ? mw2[i] : 0, ht: ht2[i], c: c2[i], mc: mc2[i] })), stretch };
}

/** How square the toe's rounding is (2 an ellipse). GAME TUNING. */
const TOE_SQUARE = 2.4;
/** How far down the shoe its outline is smoothed, either way (metres). GAME TUNING. */
const SMOOTH = 0.008;
/**
 * The rows within SMOOTH of row i, but (for a width, `of`) only those with some of it, and no further from i than i is
 * from the nearest end of it: so an end stays where it is, rounded as her foot's room rounds it.
 */
function windowOf(rows: readonly Profile[], i: number, of: 'w' | 'mw' | 0): number[] {
  const u = rows[i].u;
  let reach = SMOOTH;
  if (of) {
    if (!(rows[i][of] > 0)) return [i];
    const first = rows.findIndex((r) => r[of] > 0), last = rows.length - 1 - [...rows].reverse().findIndex((r) => r[of] > 0);
    reach = Math.min(reach, u - rows[first].u, rows[last].u - u);
  }
  const out: number[] = [];
  for (let j = 0; j < rows.length; j++) if (Math.abs(rows[j].u - u) <= reach && (!of || rows[j][of] > 0)) out.push(j);
  return out.length ? out : [i];
}

/** The superellipse a section of the upper is: at φ (0 its bite line, π/2 its top) out and up from its bite line's middle. */
function section(w: number, height: number, phi: number): [number, number] {
  const e = 2 / SNEAKER.squareness, c = Math.cos(phi), s = Math.sin(phi);
  return [w * Math.sign(c) * Math.pow(Math.abs(c), e), height * Math.pow(Math.abs(s), e)];
}

/** Where on a section its height is `h` above its bite line (0..π/2), or π/2 if it never reaches it. */
function phiAtHeight(height: number, h: number): number {
  if (h >= height) return Math.PI / 2;
  if (h <= 0) return 0;
  return Math.asin(Math.pow(h / height, SNEAKER.squareness / 2));
}

/** Where on a section it is `g` out from its middle (0..π/2). */
function phiAtOut(w: number, g: number): number {
  if (g <= 0) return Math.PI / 2;
  if (g >= w) return 0;
  return Math.acos(Math.pow(g / w, SNEAKER.squareness / 2));
}

/** One shoe round her foot. */
export function buildSneaker(foot: FootMeasure): SneakerBuild {
  const S = SNEAKER, { rows, stretch } = profiles(foot);
  // the upper's rows are those over the foot (its ends where its width comes to nothing)
  const P: number[] = [], UV: number[] = [], SH: number[] = [], I: number[] = [], groups: { start: number; count: number; material: SneakerPart }[] = [];
  const toRest = (u: number, a: number, h: number): V3 => [
    foot.origin[0] + foot.along[0] * u + foot.out[0] * a,
    foot.origin[1] + h,
    foot.origin[2] + foot.along[2] * u + foot.out[2] * a,
  ];
  const point = (q: V3, uv: [number, number], shade = 0) => { P.push(q[0], q[1], q[2]); UV.push(uv[0], uv[1]); SH.push(shade); return P.length / 3 - 1; };
  const group = (material: SneakerPart, from: number) => { if (I.length > from) groups.push({ start: from, count: I.length - from, material }); };

  // ---- the upper: grow each section until her foot is inside it, then each half, bite line to its edge
  // (and a row of none at each end, so its heel and its toe close to a line)
  const firstW = rows.findIndex((r) => r.w > 0), lastW = rows.length - 1 - [...rows].reverse().findIndex((r) => r.w > 0);
  const upper = rows.slice(Math.max(0, firstW - 1), Math.min(rows.length, lastW + 2)).map((r) => (r.w > 0 ? r : { ...r, w: 1e-5 }));
  const k = upper.map(() => 1);
  for (let n = 0; n < foot.u.length; n++) {
    // the row nearest each point of her foot
    const un = stretch(foot.u[n]);
    let lo = 0, hi = upper.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (upper[mid].u < un) lo = mid; else hi = mid; }
    for (const ri of [lo, hi]) {
      const r = upper[ri], cap = legFrom(r.t);
      // (not the closing rows at its ends, which are a line)
      if (foot.h[n] > cap || r.w < 1e-4) continue;
      const height = r.ht - r.yb, dy = Math.max(0, foot.h[n] - r.yb);
      const rho = Math.pow(Math.pow(Math.abs(foot.a[n] - r.c) / r.w, S.squareness) + Math.pow(dy / height, S.squareness), 1 / S.squareness);
      k[ri] = Math.max(k[ri], rho / 0.96);
    }
  }
  // (the growth, spread smoothly along the shoe: the most within three rows, then averaged)
  const kk = k.map((_, i) => Math.max(...k.slice(Math.max(0, i - 3), i + 4)));
  const ks = kk.map((_, i) => { const w = kk.slice(Math.max(0, i - 3), i + 4); return w.reduce((s, x) => s + x, 0) / w.length; });
  const sec = upper.map((r, i) => ({ ...r, w: r.w * ks[i], ht: r.yb + (r.ht - r.yb) * ks[i] }));
  // each row's edge, as far round as its half goes: the collar's height, the throat's opening, or the top's middle
  const edge = (r: Profile) => {
    const height = r.ht - r.yb;
    const throat = phiAtOut(r.w, gapAt(r.t));
    const collar = r.t < S.throatBack ? phiAtHeight(height, collarAt(r.t) - r.yb) : Math.PI / 2;
    return Math.min(throat, collar);
  };
  const at = (r: Profile, side: 1 | -1, phi: number): V3 => {
    const [x, y] = section(r.w, r.ht - r.yb, phi);
    return toRest(r.u, r.c + side * x, r.yb + y);
  };
  const seams: number[] = [];
  const halfStart: number[] = [];
  let from = I.length;
  for (const side of [1, -1] as const) {
    const base = P.length / 3;
    halfStart.push(base);
    // texture places: along the shoe and round its section, both in metres, a knit repeat every 1.5 cm -- round it from
    // the top of the toe down each side, so the knit runs on unbroken over the seam where the two halves meet
    for (let i = 0; i < sec.length; i++) {
      const r = sec[i], top = edge(r), pts: V3[] = [];
      for (let j = 0; j <= ACROSS; j++) pts.push(at(r, side, (j / ACROSS) * top));
      const arcs = [0];
      for (let j = 1; j <= ACROSS; j++) arcs.push(arcs[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1], pts[j][2] - pts[j - 1][2]));
      for (let j = 0; j <= ACROSS; j++) {
        // darker overlays: the heel counter, and the eyelet stays along the throat
        const heel = r.t < 0.16 ? 1 - smooth01((r.t - 0.1) / 0.06) : 0;
        const stay = r.t > S.throatBack - 0.02 && r.t < S.throatFront ? smooth01((j / ACROSS - 0.72) / 0.12) : 0;
        point(pts[j], [r.u / 0.015, side * (arcs[ACROSS] - arcs[j]) / 0.015], Math.max(heel * 0.55, stay * 0.8));
      }
    }
    for (let i = 0; i + 1 < sec.length; i++) for (let j = 0; j < ACROSS; j++) {
      const a = base + i * (ACROSS + 1) + j, b = a + ACROSS + 1;
      // (wound so both halves face outward)
      if (side > 0) I.push(a, a + 1, b, a + 1, b + 1, b); else I.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // where the halves meet down the top of the vamp, the same point twice
  for (let i = 0; i < sec.length; i++) if (sec[i].t >= S.throatFront) seams.push(halfStart[0] + i * (ACROSS + 1) + ACROSS, halfStart[1] + i * (ACROSS + 1) + ACROSS);
  group('upper', from);

  // ---- the midsole: its side wall round the shoe, bite line to bottom, rounded at the bottom edge; its bottom; the
  // ledge from its top edge in to the upper
  from = I.length;
  // (round the rows it has any width at: past its tips, its two sides were one point many times over, and down its toe
  // and its heel the same point twice, a seam its light showed)
  const mids = rows.filter((r) => r.mw > 0);
  const ring: { r: Profile; side: 1 | -1 }[] = [...mids.map((r) => ({ r, side: 1 as const })), ...mids.slice().reverse().map((r) => ({ r, side: -1 as const }))];
  const LEVELS = 7, ringBase = P.length / 3;
  const upperAt = (r: Profile, side: 1 | -1) => { const s = sec.find((x) => x.u === r.u); return s ? s.c + side * s.w : r.mc; };
  const wallAt = (r: Profile, side: 1 | -1, level: number): V3 => {
    const x = level / LEVELS;
    // up from its bottom: a rounded bottom edge (in 2.5 mm), a little fullness at mid-height, a crisp top
    const inset = 0.0025 * (1 - Math.sin((Math.min(1, x / 0.3) * Math.PI) / 2)) - 0.0012 * Math.sin(Math.PI * x);
    const y = r.bottom + (r.yb - r.bottom) * x;
    return toRest(r.u, r.mc + side * Math.max(0, r.mw - inset), y);
  };
  for (let li = 0; li <= LEVELS; li++) {
    let arc = 0;
    for (let e = 0; e < ring.length; e++) {
      const { r, side } = ring[e], q = wallAt(r, side, li);
      if (e) { const p = ring[e - 1], pq = wallAt(p.r, p.side, li); arc += Math.hypot(q[0] - pq[0], q[2] - pq[2]); }
      point(q, [arc / 0.02, li / LEVELS], 0);
    }
  }
  const RN = ring.length;
  for (let li = 0; li < LEVELS; li++) for (let e = 0; e < RN; e++) {
    const a = ringBase + li * RN + e, b = ringBase + li * RN + ((e + 1) % RN), c = a + RN, d = b + RN;
    I.push(a, b, c, b, d, c);
  }
  // the ledge: from its top edge in to where the upper stands on it
  const ledgeBase = P.length / 3;
  for (let e = 0; e < RN; e++) { const { r, side } = ring[e]; point(toRest(r.u, upperAt(r, side), r.yb), [0, 0], 0); }
  for (let e = 0; e < RN; e++) {
    const a = ringBase + LEVELS * RN + e, b = ringBase + LEVELS * RN + ((e + 1) % RN), c = ledgeBase + e, d = ledgeBase + ((e + 1) % RN);
    I.push(a, b, c, b, d, c);
  }
  group('midsole', from);
  // its bottom, the outsole: across from one side to the other, row by row
  from = I.length;
  const bottomBase = P.length / 3;
  for (const r of mids) for (const side of [1, -1] as const) point(wallAt(r, side, 0), [r.u / 0.02, (r.mc + side * r.mw) / 0.02], 0);
  for (let i = 0; i + 1 < mids.length; i++) {
    const a = bottomBase + 2 * i, b = a + 1, c = a + 2, d = a + 3;
    I.push(a, c, b, b, c, d);
  }
  group('outsole', from);

  // ---- the tongue: under the throat, on her instep, rising past the collar at its top
  from = I.length;
  // (from under the vamp back up her instep to a little behind the throat, where it stands up over the collar)
  const tongue = sec.filter((r) => r.t <= S.throatFront + 0.02 && r.t >= S.throatBack - S.tongueBack);
  const TA = 10, tongueBase = P.length / 3;
  const tongueAt = (r: Profile, x: number, lift = 0): V3 => {
    // across its section's top, out to past the throat's edges (under them), 2.5 mm in from the upper
    const half = Math.min(gapAt(Math.max(r.t, S.throatBack)) + 0.009, 0.8 * r.w);
    const a = x * half, height = r.ht - r.yb;
    const y = r.yb + height * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(a) / r.w, S.squareness)), 1 / S.squareness);
    // (deeper under the vamp, where the upper closes over it; standing up off her instep behind the throat)
    const under = 0.0025 + 0.002 * smooth01((r.t - (S.throatFront - 0.05)) / 0.05);
    const up = S.tongueRise * smooth01((S.throatBack - r.t) / S.tongueBack);
    const h = y - under + lift + up;
    return toRest(r.u, r.c + a * 0.985, h);
  };
  for (const r of tongue) for (let j = 0; j <= TA; j++) point(tongueAt(r, -1 + (2 * j) / TA), [r.u / 0.015, j / TA], 0.6);
  for (let i = 0; i + 1 < tongue.length; i++) for (let j = 0; j < TA; j++) {
    const a = tongueBase + i * (TA + 1) + j, b = a + TA + 1;
    I.push(a, b, a + 1, a + 1, b, b + 1);
  }
  group('tongue', from);
  // its label, TMB, just in front of it near its top
  from = I.length;
  {
    const [lw, lh] = S.label, labelBase = P.length / 3;
    // (the row its top is in, and a row its height further down)
    const topRow = tongue[0];
    const down = tongue.find((r) => r.u - topRow.u >= lh * 1.1) ?? tongue[tongue.length - 1];
    const top = tongueAt(topRow, 0), bottom = tongueAt(down, 0);
    const dir: V3 = [bottom[0] - top[0], bottom[1] - top[1], bottom[2] - top[2]];
    const dl = Math.hypot(...dir), dn: V3 = [dir[0] / dl, dir[1] / dl, dir[2] / dl];
    const right: V3 = [foot.out[0], 0, foot.out[2]];
    // its face: out of the tongue (across × down)
    const nx = right[1] * dn[2] - right[2] * dn[1], ny = right[2] * dn[0] - right[0] * dn[2], nz = right[0] * dn[1] - right[1] * dn[0];
    const nl = Math.hypot(nx, ny, nz) || 1, face: V3 = [nx / nl, ny / nl, nz / nl];
    const sgn = face[1] < 0 ? -1 : 1;
    const c0: V3 = [top[0] + dn[0] * 0.004 + face[0] * sgn * 0.0012, top[1] + dn[1] * 0.004 + face[1] * sgn * 0.0012, top[2] + dn[2] * 0.004 + face[2] * sgn * 0.0012];
    // (read from in front of her: the text runs toward her left, +x, on both shoes)
    const across: V3 = foot.out[0] >= 0 ? right : [-right[0], 0, -right[2]];
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const ox = (x - 0.5) * lw, oy = y * lh;
      point([c0[0] + across[0] * ox + dn[0] * oy, c0[1] + dn[1] * oy, c0[2] + across[2] * ox + dn[2] * oy], [x, 1 - y], 0);
    }
    I.push(labelBase, labelBase + 2, labelBase + 1, labelBase + 1, labelBase + 2, labelBase + 3);
  }
  group('label', from);

  // ---- the laces: criss-crossed between eyelets on either edge of the throat, over the tongue, a bar across the front
  from = I.length;
  const eyeRow = (k: number) => {
    const t = lerp(S.throatBack + 0.03, S.throatFront - 0.038, k / (S.eyelets - 1));
    return sec.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b), sec[0]);
  };
  const eyelet = (k: number, side: 1 | -1): V3 => { const r = eyeRow(k); return at(r, side, edge(r) * 0.86); };
  const tube = (path: V3[], radius: number) => {
    const SIDES = 7, base = P.length / 3;
    for (let i = 0; i < path.length; i++) {
      const p = path[i], q = path[Math.min(path.length - 1, i + 1)], o = path[Math.max(0, i - 1)];
      const tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2], tl = Math.hypot(tx, ty, tz) || 1;
      const T: V3 = [tx / tl, ty / tl, tz / tl];
      // a frame round it: any direction square to it, and the third
      const ref: V3 = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let n1: V3 = [T[1] * ref[2] - T[2] * ref[1], T[2] * ref[0] - T[0] * ref[2], T[0] * ref[1] - T[1] * ref[0]];
      const l1 = Math.hypot(...n1); n1 = [n1[0] / l1, n1[1] / l1, n1[2] / l1];
      const n2: V3 = [T[1] * n1[2] - T[2] * n1[1], T[2] * n1[0] - T[0] * n1[2], T[0] * n1[1] - T[1] * n1[0]];
      for (let s = 0; s < SIDES; s++) {
        const ang = (2 * Math.PI * s) / SIDES, c = Math.cos(ang) * radius, sn = Math.sin(ang) * radius;
        point([p[0] + n1[0] * c + n2[0] * sn, p[1] + n1[1] * c + n2[1] * sn, p[2] + n1[2] * c + n2[2] * sn], [i / path.length, s / SIDES], 0);
      }
    }
    for (let i = 0; i + 1 < path.length; i++) for (let s = 0; s < SIDES; s++) {
      const a = base + i * SIDES + s, b = base + i * SIDES + ((s + 1) % SIDES), c = a + SIDES, d = b + SIDES;
      I.push(a, c, b, b, c, d);
    }
  };
  // a lace from one eyelet to another, bowed up over the tongue between them
  const lace = (p: V3, q: V3, rise: number) => {
    const mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + rise, (p[2] + q[2]) / 2];
    const path: V3[] = [];
    for (let i = 0; i <= 10; i++) {
      const s = i / 10, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
      path.push([a * p[0] + b * mid[0] + c * q[0], a * p[1] + b * mid[1] + c * q[1], a * p[2] + b * mid[2] + c * q[2]]);
    }
    tube(path, S.laceRadius);
  };
  const E = S.eyelets;
  lace(eyelet(E - 1, 1), eyelet(E - 1, -1), 0.0035);
  for (let k = E - 1; k >= 1; k--) {
    lace(eyelet(k, -1), eyelet(k - 1, 1), 0.005);
    lace(eyelet(k, 1), eyelet(k - 1, -1), 0.0058);
  }
  // the bow at the top: two loops and two ends
  {
    const l = eyelet(0, 1), m = eyelet(0, -1), knot: V3 = [(l[0] + m[0]) / 2, (l[1] + m[1]) / 2 + 0.006, (l[2] + m[2]) / 2];
    const outL: V3 = [foot.out[0], 0, foot.out[2]], fw: V3 = foot.along;
    for (const side of [1, -1]) {
      const loop: V3[] = [];
      for (let i = 0; i <= 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        // a flat loop lying out to the side over the instep, tipped down toward the toe
        const x = side * (0.012 + 0.012 * (1 - Math.cos(ang)) / 2), y = 0.003 * Math.sin(ang) - 0.004 * (1 - Math.cos(ang)) / 2, z = 0.008 * Math.sin(ang);
        loop.push([knot[0] + outL[0] * x + fw[0] * z, knot[1] + y, knot[2] + outL[2] * x + fw[2] * z]);
      }
      tube(loop, S.laceRadius);
      const end: V3[] = [];
      for (let i = 0; i <= 8; i++) {
        const s = i / 8, x = side * 0.008 * s, z = 0.004 + 0.022 * s, y = -0.016 * s * s;
        end.push([knot[0] + outL[0] * x + fw[0] * z, knot[1] + y, knot[2] + outL[2] * x + fw[2] * z]);
      }
      tube(end, S.laceRadius);
    }
  }
  group('laces', from);

  // ---- the collar's padding round its edge, and the heel tab
  from = I.length;
  {
    const behind = sec.filter((r) => r.t < S.throatBack + 0.005);
    const path: V3[] = [];
    // (from the throat on her outside, round her heel, to the throat on her inside)
    for (let i = behind.length - 1; i >= 0; i--) path.push(at(behind[i], 1, edge(behind[i])));
    for (let i = 0; i < behind.length; i++) path.push(at(behind[i], -1, edge(behind[i])));
    // in a little and down, so it rolls over the edge
    const centre = foot.origin;
    const padded = path.map((p): V3 => {
      const dx = p[0] - centre[0], dz = p[2] - centre[2];
      const u = dx * foot.along[0] + dz * foot.along[2], a = dx * foot.out[0] + dz * foot.out[2];
      const mid = foot.length * 0.32, du = u - mid, dl = Math.hypot(du, a) || 1;
      return [p[0] - (foot.along[0] * du + foot.out[0] * a) / dl * S.padRadius * 0.45, p[1] - S.padRadius * 0.25, p[2] - (foot.along[2] * du + foot.out[2] * a) / dl * S.padRadius * 0.45];
    });
    tube(padded, S.padRadius);
    // the heel tab: a padded loop up off the back of the collar
    // (an upturned U, 1.4 cm across and as high, standing off the back of the collar and leaning back a little)
    const back = sec[0], tab: V3[] = [];
    for (let i = 0; i <= 16; i++) {
      const ang = Math.PI * (i / 16), x = -0.007 * Math.cos(ang), up = 0.006 + 0.008 * Math.sin(ang);
      tab.push(toRest(back.u - 0.002 - 0.25 * up, back.c + x, S.collarBack - 0.008 + up));
    }
    tab.unshift(toRest(back.u - 0.0005, back.c - 0.007, S.collarBack - 0.012));
    tab.push(toRest(back.u - 0.0005, back.c + 0.007, S.collarBack - 0.012));
    tube(tab, 0.0026);
  }
  group('collar', from);

  return {
    position: Float32Array.from(P), uv: Float32Array.from(UV), shade: Float32Array.from(SH), index: Uint32Array.from(I),
    groups, lift: S.stack, seams: Uint32Array.from(seams),
  };
}

// ------------------------------------------------------------------------------------------------------------------
// dressed and bound to her

/** The colours, read off the reference (Joshua, 2026-11-07). GAME TUNING. */
export const SNEAKER_COLOURS = Object.freeze({
  upper: 0x56609e, overlay: 0x3c447f, laces: 0x2c3265, collar: 0x39417f, midsole: 0xf1e9f7, outsole: 0xcbc3e0, label: 0xf6f4fa, ink: 0x2c3265,
});

/** A knit drawn on a canvas: rows of small open stitches, light, for the upper's colour to show through. */
function knitTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 128, 128);
  // an engineered mesh: staggered rows of little open cells, each with a soft shade under it
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const cx = x * 16 + (y % 2 ? 8 : 0) + 8, cy = y * 16 + 8;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(cx, cy + 1, 4.2, 3.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(cx, cy, 2.6, 1.9, 0, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** The tongue's label: TMB in navy on white, a navy line round it (Joshua, 2026-11-07: "a TMB on the tongue"). */
function labelTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 140;
  const g = c.getContext('2d');
  if (!g) return null;
  const ink = `#${SNEAKER_COLOURS.ink.toString(16).padStart(6, '0')}`;
  g.fillStyle = '#f6f4fa'; g.fillRect(0, 0, 256, 140);
  g.strokeStyle = ink; g.lineWidth = 10; g.strokeRect(12, 12, 232, 116);
  g.fillStyle = ink; g.font = 'bold 76px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('TMB', 128, 74);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Her skin nearest a point (her rest frame), its weights: a few nearest, by the inverse of their distance squared. */
class SkinNear {
  private readonly cells = new Map<string, number[]>();
  constructor(private readonly rest: Float32Array, candidates: number[], private readonly cell = 0.01) {
    for (const i of candidates) {
      const k = this.key(rest[3 * i], rest[3 * i + 1], rest[3 * i + 2]);
      const list = this.cells.get(k);
      if (list) list.push(i); else this.cells.set(k, [i]);
    }
  }
  private key(x: number, y: number, z: number) { return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)},${Math.floor(z / this.cell)}`; }
  nearest(x: number, y: number, z: number, count: number): { i: number; d: number }[] {
    const cx = Math.floor(x / this.cell), cy = Math.floor(y / this.cell), cz = Math.floor(z / this.cell);
    for (let reach = 1; reach <= 8; reach++) {
      const found: { i: number; d: number }[] = [];
      for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) for (let c = -reach; c <= reach; c++) {
        for (const i of this.cells.get(`${cx + a},${cy + b},${cz + c}`) ?? []) found.push({ i, d: Math.hypot(this.rest[3 * i] - x, this.rest[3 * i + 1] - y, this.rest[3 * i + 2] - z) });
      }
      if (found.length >= count) return found.sort((p, q) => p.d - q.d).slice(0, count);
    }
    return [];
  }
}

/**
 * The pair, on her: built from her approved rest shape (`basePos`, her body's own units; `toRest` takes them to her rest
 * frame in metres), each shoe a skinned mesh on her skeleton that takes its weights from her skin nearest it.
 */
export class Sneakers {
  readonly group = new THREE.Group();
  readonly meshes: THREE.SkinnedMesh[] = [];
  /** How far they lift her off the floor at her approved foot size, metres. */
  readonly lift: number;
  private readonly materials: THREE.Material[];
  /** Each shoe's points and normals as built (her approved build), and her build's fields over them once asked for. */
  private readonly base: { readonly position: Float32Array; readonly normal: Float32Array }[] = [];
  private readonly fields: (BuildMeshFields | null)[] = [];
  private fitted = '';
  /** Each shoe's heel, its lowest point under her heel, where her ankle bone carries it (for her steps: footsteps.ts). */
  private readonly heelsAt: { readonly bone: THREE.Bone; readonly local: THREE.Vector3 }[] = [];

  constructor(body: THREE.SkinnedMesh, basePos: Float32Array, toRest: THREE.Matrix4, ankles: readonly number[]) {
    const n = basePos.length / 3, rest = new Float32Array(basePos.length), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) v.fromArray(basePos, 3 * i).applyMatrix4(toRest).toArray(rest, 3 * i);
    const g = body.geometry, si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
    const bones = body.skeleton.bones, kids = (b: THREE.Bone): THREE.Bone[] => [b, ...b.children.filter((c) => (c as THREE.Bone).isBone).flatMap((c) => kids(c as THREE.Bone))];
    const knit = knitTexture(), label = labelTexture();
    const std = (colour: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.78, metalness: 0, side: THREE.DoubleSide, ...extra });
    const byPart: Record<SneakerPart, THREE.Material> = {
      upper: std(0xffffff, { vertexColors: true, map: knit, bumpMap: knit, bumpScale: 0.6, roughness: 0.85 }),
      tongue: std(0xffffff, { vertexColors: true, map: knit, bumpMap: knit, bumpScale: 0.4, roughness: 0.85 }),
      midsole: std(SNEAKER_COLOURS.midsole, { roughness: 0.55 }),
      outsole: std(SNEAKER_COLOURS.outsole, { roughness: 0.7 }),
      laces: std(SNEAKER_COLOURS.laces, { roughness: 0.7 }),
      collar: std(SNEAKER_COLOURS.collar, { roughness: 0.8 }),
      label: std(SNEAKER_COLOURS.label, { map: label, roughness: 0.6 }),
    };
    this.materials = SNEAKER_PARTS.map((p) => byPart[p]);
    const toGeometry = toRest.clone().invert();
    const upper = new THREE.Color(SNEAKER_COLOURS.upper), overlay = new THREE.Color(SNEAKER_COLOURS.overlay);
    let lift = 0;
    for (const ankle of ankles) {
      const foot = new Set(kids(bones[ankle]).map((b) => bones.indexOf(b)));
      const onFoot = new Float32Array(n);
      for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) if (foot.has(si.getComponent(i, c))) onFoot[i] += sw.getComponent(i, c);
      const measured = measureFoot(rest, onFoot), built = buildSneaker(measured);
      lift = built.lift;
      // her skin round her foot and ankle, on its side, for the weights
      const ox = measured.origin[0], near: number[] = [];
      for (let i = 0; i < n; i++) if (rest[3 * i + 1] < measured.origin[1] + 0.17 && Math.abs(rest[3 * i] - ox) < 0.12) near.push(i);
      const skin = new SkinNear(rest, near);
      const count = built.position.length / 3, position = new Float32Array(count * 3), colour = new Float32Array(count * 3);
      const index = new Uint16Array(count * 4), weight = new Float32Array(count * 4);
      for (let p = 0; p < count; p++) {
        const x = built.position[3 * p], y = built.position[3 * p + 1], z = built.position[3 * p + 2];
        v.set(x, y, z).applyMatrix4(toGeometry).toArray(position, 3 * p);
        const tint = upper.clone().lerp(overlay, built.shade[p]);
        colour[3 * p] = tint.r; colour[3 * p + 1] = tint.g; colour[3 * p + 2] = tint.b;
        const acc = new Map<number, number>();
        for (const { i, d } of skin.nearest(x, y, z, 6)) {
          const w = 1 / (d * d + 1e-6);
          for (let c = 0; c < 4; c++) { const wb = sw.getComponent(i, c); if (wb > 0) { const b = si.getComponent(i, c); acc.set(b, (acc.get(b) ?? 0) + w * wb); } }
        }
        const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, [, w]) => s + w, 0) || 1;
        top.forEach(([b, w], c) => { index[4 * p + c] = b; weight[4 * p + c] = w / sum; });
        if (!top.length) { index[4 * p] = ankle; weight[4 * p] = 1; }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(built.uv, 2));
      geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
      geometry.setIndex(new THREE.BufferAttribute(built.index, 1));
      for (const gr of built.groups) geometry.addGroup(gr.start, gr.count, SNEAKER_PARTS.indexOf(gr.material));
      geometry.computeVertexNormals();
      // the seam down the top of the toe: one normal for both of its sides
      const nrm = geometry.getAttribute('normal') as THREE.BufferAttribute;
      for (let s = 0; s < built.seams.length; s += 2) {
        const a = built.seams[s], b = built.seams[s + 1];
        const x = nrm.getX(a) + nrm.getX(b), y = nrm.getY(a) + nrm.getY(b), z = nrm.getZ(a) + nrm.getZ(b), l = Math.hypot(x, y, z) || 1;
        nrm.setXYZ(a, x / l, y / l, z / l); nrm.setXYZ(b, x / l, y / l, z / l);
      }
      const mesh = new THREE.SkinnedMesh(geometry, this.materials);
      mesh.name = `sneaker${ankles.indexOf(ankle) === 0 ? 'L' : 'R'}`;
      mesh.frustumCulled = false;
      body.add(mesh);
      mesh.bindMode = body.bindMode;
      mesh.bind(body.skeleton, body.bindMatrix);
      this.meshes.push(mesh);
      this.base.push({ position: position.slice(), normal: (nrm.array as Float32Array).slice() });
      this.fields.push(null);
      // its heel: the lowest of its outsole in its back 6 cm, held in her ankle bone's frame as she was bound
      {
        const sole = built.groups.find((x) => x.material === 'outsole')!;
        let low = -1;
        for (let k = sole.start; k < sole.start + sole.count; k++) {
          const p = built.index[k], dx = built.position[3 * p] - measured.origin[0], dz = built.position[3 * p + 2] - measured.origin[2];
          if (dx * measured.along[0] + dz * measured.along[2] > 0.06) continue;
          if (low < 0 || built.position[3 * p + 1] < built.position[3 * low + 1]) low = p;
        }
        const at = new THREE.Vector3().fromArray(position, 3 * Math.max(0, low)).applyMatrix4(body.bindMatrix).applyMatrix4(body.skeleton.boneInverses[ankle]);
        this.heelsAt.push({ bone: bones[ankle], local: at });
      }
    }
    this.lift = lift;
  }

  /**
   * Her BUILD on them as on her skin: her bones carry them already (lengths, her feet's size), and this lays the same
   * fields her skin takes -- above all her feet's size ramp up her shin (bodyBuild.ts), without which, with small feet,
   * her ankle stood out of the back of them. `key` says when it changed; null amounts put them back as built.
   */
  fit(rig: BuildRig | null, amounts: BuildAmounts | null, key: string): void {
    if (key === this.fitted) return;
    this.fitted = key;
    this.meshes.forEach((mesh, k) => {
      const P = mesh.geometry.getAttribute('position') as THREE.BufferAttribute, N = mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
      const position = P.array as Float32Array, normal = N.array as Float32Array;
      position.set(this.base[k].position); normal.set(this.base[k].normal);
      if (rig && amounts && key) {
        this.fields[k] ??= buildMeshFields(rig, mesh, this.base[k].position);
        applyBuildToMesh(this.fields[k]!, amounts, position, normal, true);
      }
      P.needsUpdate = true; N.needsUpdate = true;
    });
  }

  /** Each heel's height now, in her world's units (her pose as last laid on her bones). */
  heels(): number[] {
    const at = new THREE.Vector3();
    return this.heelsAt.map(({ bone, local }) => { bone.updateWorldMatrix(true, false); return at.copy(local).applyMatrix4(bone.matrixWorld).y; });
  }

  set visible(on: boolean) { for (const m of this.meshes) m.visible = on; }
  get visible(): boolean { return this.meshes.some((m) => m.visible); }

  dispose(): void {
    for (const m of this.meshes) { m.removeFromParent(); m.geometry.dispose(); }
    for (const m of this.materials) { const s = m as THREE.MeshStandardMaterial; s.map?.dispose(); s.dispose(); }
  }
}
