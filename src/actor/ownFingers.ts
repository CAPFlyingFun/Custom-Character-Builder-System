/**
 * HER OWN FINGERS (P4, touch & grip; Joshua, 2026-11-05: "maybe the simplest way is hide the MeshyAI fingers, and instead
 * create your own cylinder fingers with some skin between the joints and still use the same bones"; asked how: four
 * fingers, her own thumb kept; shaped, with nails).
 *
 * Her file's fingers were modelled touching, and its texture is baked dark where they touched: cut apart (fingerSplit.ts)
 * and given their own weights (fingerWeights.ts) they bend, but a finger lifted from the others is thin and lumpy, with a
 * dark line down its side. So past her webbing her index, middle, ring and little fingers are no longer drawn from her
 * file. Each is made here instead, on HER OWN BONES, from her own measurements:
 *
 * - WHERE IT STARTS: her finger's skin is taken off just past her webbing (`cutFingers`): every triangle of one finger's
 *   skin with a corner past `cut` from its knuckle. That leaves one ring of her points round each finger -- at her
 *   webbing at its sides and under it, a little further out over its back -- and the new finger begins ON that ring:
 *   its first points are copies of hers, exactly, so in every pose and every shape of her the two meet with no seam.
 * - ITS SHAPE: round its line of bones (which in her file run nearer the palm than the middle of each finger), as thick
 *   as her own finger is there (`measureFingers`: how far her skin stands above and below its bones, slice by slice,
 *   smoothed), a little wider than thick, flatter under the pads than over the back; a little fuller over each knuckle,
 *   a crease under each joint, a pad under the last bone; tapering to a rounded tip, its apex nearer the nail than the
 *   pad. From her ring the first few rings ease from her skin's shape into that one.
 * - A NAIL on the back of the last bone: flatter there, the plate standing a little proud of the skin round it, its root
 *   curved, ending at its free edge on the curve of the tip. Its triangles are listed apart, to be drawn as a nail.
 * - ITS SKIN WEIGHTS: each part of it with the bone it lies over, eased across each joint (further over the back, where
 *   the skin wraps a bent knuckle, than under it, where it creases); at her ring exactly hers, eased into its own over
 *   `blend`. Weights as plain fractions, adding to one exactly.
 *
 * Nothing about her own skin changes but which of her triangles are drawn. Everything is measured in metres in her REST
 * frame and depends on her bones and her mesh only, so any body with fingers (Jack, the newborn) can have them made.
 *
 * Pure: no three, no DOM.
 */
import { alongLine, type V3 } from './fingerSplit';

type M3 = [number, number, number];

/** GAME TUNING (metres, unless said): where her own finger ends, past its knuckle; how many points round each ring and
 * how far apart its rings; how many rings ease from her ring into the new finger's shape, and over how far past her ring
 * her weights give way to its own; how far either side of a joint its skin bends with the next bone, over the back and
 * under it; how far either side of a joint its line is rounded; the slices her finger is measured in, and how much of its tip is left out of the measure (it is rounded); how far round her ring (radians) and how far at most (metres) its points are smoothed (smoothRings). */
export const OWN_FINGERS = Object.freeze({ cut: 0.025, around: 24, step: 0.0015, ease: 3, blend: 0.008, bendBack: 0.007, bendPalm: 0.0035, round: 0.006, slice: 0.002, tipClear: 0.008, weld: 2e-5, seamSpread: 0.3, seamMove: 0.006 });

/** BIOLOGICAL SHAPE (shares of the finger's own size where they are; Joshua's photos of his hand and an adult hand's
 * proportions): a finger is a little wider than thick (wider still at its last bone); flatter under the pads (`flatPalm`
 * squares the section a little); fuller over the middle and last knuckles (`knuckle`, over `knuckleSpread`); a crease
 * under each joint (`crease`, over `creaseSpread`); the last bone's pad (`pad`, at `padAt` of the way from the last
 * joint to the tip, over `padSpread`); its tip rounded over `tipLength` of its thickness there, its apex `apex` of the way
 * toward the nail; the nail from `nailRoot` of the way from the last joint to the tip, `nailHalf` (radians) either side of
 * the back, its root curved `cuticle` toward the tip at its corners (the rings within about `cuticleSpread` of it bent
 * with it), its free edge where the tip has turned `nailEnd`
 * (radians), standing `nailLift` proud (metres), the back flatter over it (`nailFlat`). */
export const FINGER_SHAPE = Object.freeze({
  wide: 1.04, wideTip: 1.16, flatPalm: 2.4, round: 2.0,
  knuckle: 0.05, knuckleSpread: 0.004, crease: 0.06, creaseSpread: 0.0016,
  pad: 0.08, padAt: 0.45, padSpread: 0.006,
  tipLength: 0.95, tipRings: 6, apex: 0.3,
  nailRoot: 0.4, nailHalf: (52.5 * Math.PI) / 180, cuticle: 0.0025, cuticleSpread: 0.002, nailEnd: Math.PI / 4, nailLift: 0.0004, nailFlat: 2.7,
});

const sub = (a: V3, b: V3): M3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): M3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): M3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): M3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): M3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a: V3, b: V3, t: number): M3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (s: number, at: number, spread: number) => Math.exp(-((s - at) * (s - at)) / (2 * spread * spread));
const TAU = Math.PI * 2;

/**
 * The way the back of a hand faces at rest, as contactPoints.ts and the room find its palm: along it from the wrist to the
 * middle of its knuckles, across it from its little finger's knuckle to its index finger's (the nearest to the thumb), and
 * a mirror image's cross product put right by which side of the body it is on (+x her left).
 */
export function handBack(wrist: V3, knuckles: readonly V3[], thumbBase: V3): M3 {
  const centre = mul(knuckles.reduce<M3>((a, k) => add(a, k), [0, 0, 0]), 1 / Math.max(1, knuckles.length));
  const byThumb = [...knuckles].sort((a, b) => Math.hypot(...sub(a, thumbBase)) - Math.hypot(...sub(b, thumbBase)));
  const along = norm(sub(centre, wrist)), across = norm(sub(byThumb[0], byThumb[byThumb.length - 1])), side = Math.sign(wrist[0]) || 1;
  return mul(norm(cross(along, across)), -side);
}

/* ─────────────────────────────── her finger's skin taken off past her webbing ─────────────────────────────── */

export interface FingerCut {
  /** the triangles she is still drawn with (corners as indices of her points) */
  readonly tris: Uint32Array;
  /** how many of hers were taken off */
  readonly hidden: number;
  /** for each finger, the ring of her points round it where her skin now ends: indices of her points, in order, each step
   * along it an edge of one of her drawn triangles (so the new finger's skin runs the other way along it); empty when a
   * finger's skin was not found */
  readonly rings: readonly (readonly number[])[];
  /** rings other than one round each finger -- 0 when her skin was cut cleanly */
  readonly stray: number;
  /** of the last `closing` triangles, those still drawn (three of her points each): no longer drawn with her, to be drawn
   * with the fingers instead, on their plain skin (fingerSplit chose their corners without her texture: across the web
   * between two fingers they span her texture's pieces, a streak) -- her surface is the same, only where its colour is
   * read changes */
  readonly moved: Uint32Array;
}

/**
 * Take each finger's skin off past `cut` from its knuckle: every triangle whose corners are all one finger's and one of
 * them past it. Of the last `closing` (fingerSplit's, closing each finger's side where it was cut from the next), those
 * left are `moved`. `owner` and `past` say which finger each of her points lies on and how far along it (fingerSplit.ts);
 * `fingers` how many fingers they number; `pos` her points, to find the ones her texture's seams split (`weld`).
 */
export function cutFingers(pos: ArrayLike<number>, tris: ArrayLike<number>, owner: ArrayLike<number>, past: ArrayLike<number>, fingers: number, o: { readonly cut: number; readonly weld: number } = OWN_FINGERS, closing = 0): FingerCut {
  const T = Math.floor(tris.length / 3), off = new Uint8Array(T);
  let hidden = 0;
  for (let t = 0; t < T; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2], f = owner[a];
    if (f < 0 || owner[b] !== f || owner[c] !== f) continue;
    if (Math.max(past[a], past[b], past[c]) > o.cut) { off[t] = 1; hidden++; }
  }
  // one point a place (her texture's seams split them), for the points round what was taken off
  const near = new Map<number, number>(), keyOf = new Map<string, number>(), weldOf = (i: number) => {
    let w = near.get(i);
    if (w !== undefined) return w;
    const k = `${Math.round(pos[i * 3] / o.weld)},${Math.round(pos[i * 3 + 1] / o.weld)},${Math.round(pos[i * 3 + 2] / o.weld)}`;
    w = keyOf.get(k); if (w === undefined) { w = keyOf.size; keyOf.set(k, w); }
    near.set(i, w); return w;
  };
  const onFinger = (i: number) => owner[i] >= 0;
  // her drawn edges round the hole: each drawn triangle's edge (as welded points) whose other side is not drawn
  const drawn = new Map<string, number>();
  const kept: number[] = [], moved: number[] = [];
  for (let t = 0; t < T; t++) {
    if (off[t]) continue;
    (t >= T - closing ? moved : kept).push(tris[t * 3], tris[t * 3 + 1], tris[t * 3 + 2]);
    if (!onFinger(tris[t * 3]) && !onFinger(tris[t * 3 + 1]) && !onFinger(tris[t * 3 + 2])) continue;
    for (let k = 0; k < 3; k++) { const a = tris[t * 3 + k], b = tris[t * 3 + ((k + 1) % 3)]; drawn.set(`${weldOf(a)}>${weldOf(b)}`, a); }
  }
  const opened = new Set<string>();
  for (let t = 0; t < T; t++) if (off[t]) for (let k = 0; k < 3; k++) { const a = tris[t * 3 + k], b = tris[t * 3 + ((k + 1) % 3)]; opened.add(`${weldOf(b)}>${weldOf(a)}`); }
  // (an edge of hers drawn on one side and taken off on the other)
  const next = new Map<number, { to: number; at: number }[]>();
  for (const [key, at] of drawn) {
    if (!opened.has(key)) continue;
    const [a, b] = key.split('>').map(Number);
    if (drawn.has(`${b}>${a}`)) continue;
    (next.get(a) ?? next.set(a, []).get(a)!).push({ to: b, at });
  }
  const used = new Set<string>(), loops: number[][] = [];
  for (const [a0, outs] of next) for (const e0 of outs) {
    if (used.has(`${a0}>${e0.to}`)) continue;
    const loop: number[] = [e0.at]; used.add(`${a0}>${e0.to}`);
    let b = e0.to;
    for (let guard = 0; b !== a0 && guard < 100000; guard++) {
      const e = (next.get(b) ?? []).find((x) => !used.has(`${b}>${x.to}`));
      if (!e) break;
      used.add(`${b}>${e.to}`); loop.push(e.at); b = e.to;
    }
    if (b === a0) loops.push(loop);
  }
  // each finger's ring: the longest loop round its points
  const rings: number[][] = Array.from({ length: fingers }, () => []);
  let stray = 0;
  for (const loop of loops) {
    const votes = new Map<number, number>();
    for (const i of loop) votes.set(owner[i], (votes.get(owner[i]) ?? 0) + 1);
    const f = [...votes.entries()].sort((p, q) => q[1] - p[1])[0][0];
    if (f < 0 || f >= fingers) { stray++; continue; }
    if (loop.length > rings[f].length) { if (rings[f].length) stray++; rings[f] = loop; } else stray++;
  }
  return { tris: Uint32Array.from(kept), hidden, rings, stray, moved: Uint32Array.from(moved) };
}

/**
 * HER RING MADE SMOOTH: where her skin now ends is wherever her triangles happened to end, a saw edge round each finger.
 * Each point of her ring is moved, along the finger and in or out from it, toward the ring's own average about it (over
 * `seamSpread` radians either way round), never more than `seamMove` -- and less wherever that would turn one of her
 * triangles over. Every copy of a point (her texture's seams split them) moves with it. Rest metres; `back` as handBack.
 */
export function smoothRings(pos: ArrayLike<number>, tris: ArrayLike<number>, rings: readonly (readonly number[])[], lines: readonly (readonly V3[])[], backs: readonly V3[], o: { readonly seamSpread: number; readonly seamMove: number; readonly weld: number } = OWN_FINGERS): { index: Uint32Array; delta: Float32Array } {
  const P = (i: number): M3 => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const moveOf = new Map<number, M3>();
  rings.forEach((ring, f) => {
    if (ring.length < 6 || !lines[f] || lines[f].length < 2) return;
    const at = ring.map((i) => { const p = P(i), a = alongFinger(p, lines[f]), D = norm(sub(backs[f], mul(a.t, dot(backs[f], a.t)))), S = cross(a.t, D), d = sub(p, a.q); const out = sub(d, mul(a.t, dot(d, a.t))); return { s: a.s, th: Math.atan2(dot(d, S), dot(d, D)), r: Math.hypot(...out), t: a.t, out: norm(out) }; });
    at.forEach((x, k) => {
      let ws = 0, ss = 0, rs = 0;
      for (const y of at) { let d = Math.abs(y.th - x.th) % TAU; if (d > Math.PI) d = TAU - d; const w = Math.exp(-(d * d) / (2 * o.seamSpread * o.seamSpread)); ws += w; ss += w * y.s; rs += w * y.r; }
      const ds = Math.max(-o.seamMove, Math.min(o.seamMove, ss / ws - x.s)), dr = Math.max(-o.seamMove, Math.min(o.seamMove, rs / ws - x.r));
      moveOf.set(ring[k], add(mul(x.t, ds), mul(x.out, dr)));
    });
  });
  // (never a triangle of hers turned over: a point whose move would is moved less)
  const T = Math.floor(tris.length / 3), touching: number[] = [];
  for (let t = 0; t < T; t++) if (moveOf.has(tris[t * 3]) || moveOf.has(tris[t * 3 + 1]) || moveOf.has(tris[t * 3 + 2])) touching.push(t);
  const scale = new Map<number, number>([...moveOf.keys()].map((i) => [i, 1]));
  const moved = (i: number): M3 => { const m = moveOf.get(i); return m ? add(P(i), mul(m, scale.get(i)!)) : P(i); };
  for (let round = 0; round < 6; round++) {
    let bad = 0;
    for (const t of touching) {
      const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
      const before = cross(sub(P(b), P(a)), sub(P(c), P(a))), after = cross(sub(moved(b), moved(a)), sub(moved(c), moved(a)));
      if (dot(before, after) > 0.25 * dot(before, before)) continue;
      bad++; for (const i of [a, b, c]) if (scale.has(i)) scale.set(i, scale.get(i)! * 0.5);
    }
    if (!bad) break;
  }
  // every copy of a moved point moved with it
  const keyOf = (i: number) => `${Math.round(pos[i * 3] / o.weld)},${Math.round(pos[i * 3 + 1] / o.weld)},${Math.round(pos[i * 3 + 2] / o.weld)}`;
  const byKey = new Map<string, M3>(); for (const [i, m] of moveOf) byKey.set(keyOf(i), mul(m, scale.get(i)!));
  const index: number[] = [], delta: number[] = [];
  const n = Math.floor(pos.length / 3), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const i of moveOf.keys()) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i * 3 + k] - o.weld); hi[k] = Math.max(hi[k], pos[i * 3 + k] + o.weld); }
  for (let i = 0; i < n; i++) {
    if (pos[i * 3] < lo[0] || pos[i * 3] > hi[0] || pos[i * 3 + 1] < lo[1] || pos[i * 3 + 1] > hi[1] || pos[i * 3 + 2] < lo[2] || pos[i * 3 + 2] > hi[2]) continue;
    const m = byKey.get(keyOf(i)); if (m && Math.hypot(...m) > 1e-9) { index.push(i); delta.push(...m); }
  }
  return { index: Uint32Array.from(index), delta: Float32Array.from(delta) };
}

/* ─────────────────────────────── how thick her finger is, along it ─────────────────────────────── */

export interface FingerProfile {
  /** along the finger from its knuckle (metres): every `slice` from where her ring is */
  readonly s: Float32Array;
  /** how far her skin stands over the back of the finger, and under it, from its line of bones (metres, smoothed) */
  readonly top: Float32Array;
  readonly bottom: Float32Array;
  /** where her skin ends along it (past its end bone, on along its last bone) */
  readonly tip: number;
}

/** Where along `line` (a finger's joints, on along its last bone past its end) p is: how far, and the place. */
export function alongFinger(p: V3, line: readonly V3[]): { s: number; q: M3; t: M3 } {
  const n = line.length, last = norm(sub(line[n - 1], line[n - 2])), r = alongLine(p, line);
  let total = 0; for (let k = 1; k < n; k++) total += Math.hypot(...sub(line[k], line[k - 1]));
  const beyond = dot(sub(p, line[n - 1]), last);
  if (r.s >= total - 1e-9 && beyond > 0) return { s: total + beyond, q: add(line[n - 1], mul(last, beyond)), t: last };
  // (the piece it is on)
  let run = 0, t: M3 = last;
  for (let k = 0; k + 1 < n; k++) { const L = Math.hypot(...sub(line[k + 1], line[k])); if (r.s <= run + L + 1e-12) { t = norm(sub(line[k + 1], line[k])); break; } run += L; }
  return { s: r.s, q: [r.q[0], r.q[1], r.q[2]], t };
}

/**
 * How far her skin stands over and under each finger's bones along it (her points `owner` says are that finger's), from
 * `from` along it to its tip. `backs`: for each finger, the way the back of its hand faces.
 */
export function measureFingers(pos: ArrayLike<number>, owner: ArrayLike<number>, lines: readonly (readonly V3[])[], backs: readonly V3[], from: number, o: { readonly slice: number; readonly tipClear: number } = OWN_FINGERS): FingerProfile[] {
  const n = Math.floor(pos.length / 3);
  return lines.map((line, f) => {
    const up = new Map<number, number[]>(), down = new Map<number, number[]>();
    let tip = 0;
    for (let i = 0; i < n; i++) {
      if (owner[i] !== f) continue;
      const p: V3 = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], a = alongFinger(p, line);
      tip = Math.max(tip, a.s);
      if (a.s < from) continue;
      const D = norm(sub(backs[f], mul(a.t, dot(backs[f], a.t)))), h = dot(sub(p, a.q), D), k = Math.floor((a.s - from) / o.slice);
      if (h >= 0) (up.get(k) ?? up.set(k, []).get(k)!).push(h); else (down.get(k) ?? down.set(k, []).get(k)!).push(-h);
    }
    const slices = Math.max(1, Math.ceil((tip - from) / o.slice)), mid = (k: number) => from + (k + 0.5) * o.slice;
    // (each slice's furthest but one: a stray point of the next finger's does not make it thicker)
    const most = (m: Map<number, number[]>, k: number) => { const v = m.get(k); if (!v || !v.length) return NaN; v.sort((a, b) => b - a); return v[Math.min(1, v.length - 1)]; };
    // her finger's thickness and where its middle is, slice by slice -- her rounded tip left out -- each laid on a straight
    // line along it: her file's fingers are lumpy, and a finger is not
    const xs: number[] = [], hs: number[] = [], offs: number[] = [];
    for (let k = 0; k < slices; k++) { const u = most(up, k), d = most(down, k); if (Number.isFinite(u) && Number.isFinite(d) && mid(k) <= tip - o.tipClear) { xs.push(mid(k)); hs.push(0.5 * (u + d)); offs.push(0.5 * (u - d)); } }
    const h = fitLine(xs, hs, 0.008), off = fitLine(xs, offs, 0);
    const top = new Float32Array(slices), bottom = new Float32Array(slices);
    for (let k = 0; k < slices; k++) { const x = mid(k), hh = Math.max(0.003, h(x)), oo = off(x); top[k] = hh + oo; bottom[k] = hh - oo; }
    return { s: Float32Array.from({ length: slices }, (_, k) => mid(k)), top, bottom, tip };
  });
}

/** The straight line through (x, y) that most of them lie nearest (least squares, then again without the few far off it); `none` when there are none. */
function fitLine(xs: readonly number[], ys: readonly number[], none: number): (x: number) => number {
  const solve = (keep: readonly number[]) => {
    const n = keep.length; if (!n) return { a: none, b: 0 };
    let sx = 0, sy = 0; for (const k of keep) { sx += xs[k]; sy += ys[k]; }
    const mx = sx / n, my = sy / n; let sxx = 0, sxy = 0; for (const k of keep) { sxx += (xs[k] - mx) ** 2; sxy += (xs[k] - mx) * (ys[k] - my); }
    const b = sxx > 1e-12 ? sxy / sxx : 0; return { a: my - b * mx, b };
  };
  const all = xs.map((_, k) => k);
  let L = solve(all);
  const res = all.map((k) => Math.abs(ys[k] - (L.a + L.b * xs[k]))), mad = [...res].sort((p, q) => p - q)[res.length >> 1] ?? 0;
  if (mad > 0) { const keep = all.filter((k) => res[k] <= 2.5 * mad); if (keep.length >= 2) L = solve(keep); }
  return (x: number) => L.a + L.b * x;
}

/* ─────────────────────────────── one finger made ─────────────────────────────── */

export interface OwnFingerInput {
  /** its joints at rest (metres): knuckle, middle joint, last joint, end */
  readonly joints: readonly V3[];
  /** the bones of its knuckle, middle joint and last joint (its end rides the last) */
  readonly bones: readonly number[];
  /** the way the back of its hand faces */
  readonly back: V3;
  readonly profile: FingerProfile;
  /** her ring round it, in her order (cutFingers): each point's place and normal at rest, and its bones and weights
   * exactly as she is drawn with them */
  readonly ring: { readonly pos: readonly V3[]; readonly nrm: readonly V3[]; readonly bones: readonly (readonly number[])[]; readonly weights: readonly (readonly number[])[] };
}

export interface OwnFinger {
  readonly count: number;
  /** each point's place and normal at rest (metres), xyz */
  readonly pos: Float32Array;
  readonly nrm: Float32Array;
  /** where on a plain patch of skin (0..1 round it -- 0 under it, 1 over its back, mirrored -- and 0..1 along it) */
  readonly uv: Float32Array;
  /** four bones and weights a point; at her ring exactly hers */
  readonly bones: Uint16Array;
  readonly weights: Float32Array;
  /** on the nail: 0 at its root .. 1 at its free edge; -1 off it */
  readonly tone: Float32Array;
  /** the point of her ring a point is a copy of, or -1 */
  readonly copyOf: Int32Array;
  /** its skin's triangles and its nail's, three points each, facing out */
  readonly skin: Uint32Array;
  readonly nail: Uint32Array;
}

interface Section { c: M3; t: M3; D: M3; S: M3; w: number; hD: number; hP: number; nD: number; nP: number }

/** One finger, on its bones, from her ring round it to its tip. */
export function buildFinger(input: OwnFingerInput, o: typeof OWN_FINGERS = OWN_FINGERS, F: typeof FINGER_SHAPE = FINGER_SHAPE): OwnFinger {
  const J = input.joints, nJ = J.length, last = norm(sub(J[nJ - 1], J[nJ - 2]));
  const S0 = [0]; for (let k = 1; k < nJ; k++) S0.push(S0[k - 1] + Math.hypot(...sub(J[k], J[k - 1])));
  const prof = input.profile, tip = Math.max(prof.tip, S0[nJ - 1] + 0.002);
  // ITS LINE: through its joints and on along its last bone, each joint's corner rounded (a curve from `round` before it
  // to `round` after it), so a finger bent a little at rest is a bent finger and not two straight ones
  const dirOf = (k: number) => norm(sub(J[k + 1], J[k]));
  const onLine = (s: number): { p: M3; t: M3 } => {
    for (let k = 1; k + 1 < nJ; k++) {
      const r = Math.min(o.round, 0.4 * (S0[k] - S0[k - 1]), 0.4 * (S0[k + 1] - S0[k]));
      if (s > S0[k] - r && s < S0[k] + r) {
        const d1 = dirOf(k - 1), d2 = dirOf(k), P0 = sub(J[k], mul(d1, r)), P2 = add(J[k], mul(d2, r)), u = (s - (S0[k] - r)) / (2 * r);
        const p = add(add(mul(P0, (1 - u) * (1 - u)), mul(J[k], 2 * u * (1 - u))), mul(P2, u * u));
        return { p, t: norm(add(mul(sub(J[k], P0), 1 - u), mul(sub(P2, J[k]), u))) };
      }
    }
    if (s >= S0[nJ - 1]) return { p: add(J[nJ - 1], mul(last, s - S0[nJ - 1])), t: last };
    let k = 0; while (k + 2 < nJ && s > S0[k + 1]) k++;
    const L = S0[k + 1] - S0[k], u = L > 0 ? Math.max(0, s - S0[k]) / L : 0;
    return { p: lerp3(J[k], J[k + 1], u), t: dirOf(k) };
  };
  const at = (arr: Float32Array, s: number) => {
    const x = (s - prof.s[0]) / (prof.s.length > 1 ? prof.s[1] - prof.s[0] : 1), k = Math.max(0, Math.min(arr.length - 1, Math.floor(x))), k1 = Math.min(arr.length - 1, k + 1), u = Math.max(0, Math.min(1, x - k));
    return arr[k] + (arr[k1] - arr[k]) * u;
  };
  const sPIP = S0[1], sDIP = S0[2], lastLen = tip - sDIP;
  // her ring: where along the finger each of its points is, and the furthest
  const ringS = input.ring.pos.map((p) => alongFinger(p, J).s);
  const start = Math.max(...ringS);
  // its tip: rounded over the last `tipLength` of its thickness
  const raw = (s: number) => ({ top: at(prof.top, s), bottom: at(prof.bottom, s) });
  const tipFrom = (() => { let s = tip - 0.006; for (let k = 0; k < 4; k++) { const r = raw(s); s = tip - F.tipLength * 0.5 * (r.top + r.bottom); } return Math.max(start + 0.01, s); })();
  const nailRoot = sDIP + F.nailRoot * lastLen;
  // ITS SECTION at s: centred between her skin over and under its bones, the shape's bumps laid on
  const section = (s: number, sigma = 1): Section => {
    const { p, t } = onLine(s), D = norm(sub(input.back, mul(t, dot(input.back, t)))), S = cross(t, D);
    const r = raw(Math.min(s, tipFrom)), h = 0.5 * (r.top + r.bottom), off = 0.5 * (r.top - r.bottom);
    const toTip = smooth(sDIP - 0.004, tipFrom, s);
    let w = h * (F.wide + (F.wideTip - F.wide) * toTip), hD = h, hP = h;
    for (const j of [sPIP, sDIP]) { const b = bump(s, j, F.knuckleSpread); hD *= 1 + F.knuckle * b; w *= 1 + 0.6 * F.knuckle * b; hP *= 1 - F.crease * bump(s, j, F.creaseSpread); }
    hP *= 1 + F.pad * bump(s, sDIP + F.padAt * lastLen, F.padSpread);
    const nD = F.round + (F.nailFlat - F.round) * smooth(nailRoot - 0.003, nailRoot + 0.002, s);
    const c = add(p, mul(D, off + F.apex * h * (1 - sigma)));
    return { c, t, D, S, w: w * sigma, hD: hD * sigma, hP: hP * sigma, nD, nP: F.flatPalm };
  };
  const pointOf = (x: Section, th: number): M3 => {
    const c = Math.cos(th), s = Math.sin(th), back = c >= 0, n = back ? x.nD : x.nP, h = back ? x.hD : x.hP;
    const e = 2 / n, cs = Math.sign(c) * Math.pow(Math.abs(c), e), ss = Math.sign(s) * Math.pow(Math.abs(s), e);
    return add(x.c, add(mul(x.S, x.w * ss), mul(x.D, h * cs)));
  };
  const N = o.around, cols = Float64Array.from({ length: N }, (_, j) => (j + 0.5) * (TAU / N));
  const wrap = (a: number) => { let x = a % TAU; if (x > Math.PI) x -= TAU; if (x <= -Math.PI) x += TAU; return x; };
  // HER RING, round the finger: each point's angle (from the back of the finger, toward S), made to run one way round
  const M = input.ring.pos.length;
  const ang = input.ring.pos.map((p, i) => { const x = section(Math.max(ringS[i], 0)), d = sub(p, x.c); return Math.atan2(dot(d, x.S), dot(d, x.D)); });
  let turn = 0; for (let i = 0; i < M; i++) turn += wrap(ang[(i + 1) % M] - ang[i]);
  const dirn = turn >= 0 ? 1 : -1; // her order runs the way the angle grows (1) or against it (-1, as it does facing out)
  // (in the order the angle grows, from the point nearest the first column; never going back)
  const ord = Array.from({ length: M }, (_, k) => (dirn > 0 ? k : M - k) % M);
  let i0 = 0, bestD = Infinity; ord.forEach((i, k) => { const d = Math.abs(wrap(ang[i] - cols[0])); if (d < bestD) { bestD = d; i0 = k; } });
  const seq = Array.from({ length: M + 1 }, (_, k) => ord[(i0 + k) % M]);
  const par = new Float64Array(M + 1);
  par[0] = cols[0] + wrap(ang[seq[0]] - cols[0]);
  for (let k = 1; k <= M; k++) par[k] = Math.max(par[k - 1] + 1e-6, par[k - 1] + wrap(ang[seq[k]] - ang[seq[k - 1]]));
  // (closing at a full turn: the last step is the first point again)
  const span = par[M] - par[0], fix = TAU / (span || TAU);
  for (let k = 1; k <= M; k++) par[k] = par[0] + (par[k] - par[0]) * fix;
  // her ring at a column's angle: the two of her points either side and how far between
  const ringAt = (th: number): { a: number; b: number; u: number } => {
    let x = th; while (x < par[0]) x += TAU; while (x >= par[0] + TAU) x -= TAU;
    let k = 0; while (k + 1 < M && par[k + 1] <= x) k++;
    const u = (x - par[k]) / Math.max(1e-9, par[k + 1] - par[k]);
    return { a: seq[k], b: seq[k + 1], u: Math.max(0, Math.min(1, u)) };
  };

  // THE RINGS along it: easing out of hers, then to the nail's root (one ring exactly on it), then to the tip's curve, then
  // round the tip to its apex
  type Ring = { s: number; ease: number; sigma: number; phi: number };
  const rings: Ring[] = [];
  for (let k = 1; k <= o.ease; k++) rings.push({ s: start + k * o.step, ease: smooth(0, 1, k / o.ease), sigma: 1, phi: 0 });
  const runTo = (from: number, to: number) => { const n = Math.max(1, Math.ceil((to - from) / o.step - 1e-9)); for (let k = 1; k <= n; k++) rings.push({ s: from + ((to - from) * k) / n, ease: 1, sigma: 1, phi: 0 }); };
  const bodyFrom = rings[rings.length - 1].s;
  if (nailRoot > bodyFrom + o.step) { runTo(bodyFrom, nailRoot); runTo(nailRoot, tipFrom); } else runTo(bodyFrom, tipFrom);
  const tipLen = tip - tipFrom;
  for (let k = 1; k < F.tipRings; k++) { const phi = (k * Math.PI) / 2 / F.tipRings; rings.push({ s: tipFrom + tipLen * Math.sin(phi), ease: 1, sigma: Math.cos(phi), phi }); }
  const rootRing = rings.findIndex((r) => Math.abs(r.s - nailRoot) < 1e-9);
  const endRing = rings.findIndex((r) => r.phi > 0 && Math.abs(r.phi - F.nailEnd) < 1e-6);
  const inNail = (th: number) => Math.abs(wrap(th)) <= F.nailHalf + 1e-9;
  // how far toward the tip the nail's root is at th: curved, its corners furthest, eased off beside it
  const cuticleAt = (th: number) => { const a = Math.abs(wrap(th)); return F.cuticle * (a <= F.nailHalf ? (a / F.nailHalf) ** 2 : 1 - smooth(F.nailHalf, F.nailHalf + 0.5, a)); };

  const R = rings.length, count = M + R * N + 1;
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const bones = new Uint16Array(count * 4), weights = new Float32Array(count * 4), tone = new Float32Array(count).fill(-1), copyOf = new Int32Array(count).fill(-1);
  const along = new Float32Array(count), around = new Float32Array(count);
  // her ring's points, copied
  for (let i = 0; i < M; i++) {
    pos.set(input.ring.pos[i], i * 3); nrm.set(norm(input.ring.nrm[i]), i * 3); copyOf[i] = i;
    for (let c = 0; c < 4; c++) { bones[i * 4 + c] = input.ring.bones[i][c] ?? 0; weights[i * 4 + c] = input.ring.weights[i][c] ?? 0; }
    along[i] = ringS[i]; around[i] = ang[i];
  }
  const sOf = new Float64Array(count);
  // ITS WEIGHTS at s round at th: each bone over its part, eased across each joint; near her ring, hers
  const bendAt = (th: number) => o.bendPalm + (o.bendBack - o.bendPalm) * 0.5 * (1 + Math.cos(th));
  const evenly = (s: number, th: number): [number, number][] => {
    const b = bendAt(th), beta = (j: number) => smooth(S0[j] - b, S0[j] + b, s), k = input.bones.length;
    const out: [number, number][] = [];
    for (let j = 0; j < k; j++) { const w = (j === 0 ? 1 : beta(j)) - (j + 1 < k ? beta(j + 1) : 0); if (w > 1e-6) out.push([input.bones[j], w]); }
    return out;
  };
  const putWeights = (v: number, s: number, th: number, near: { a: number; b: number; u: number } | null, ringS0: number) => {
    const sum = new Map<number, number>(), addW = (b: number, w: number) => { if (w > 0) sum.set(b, (sum.get(b) ?? 0) + w); };
    const e = near ? smooth(0, o.blend, s - ringS0) : 1;
    if (near && e < 1) for (const [p, k] of [[near.a, 1 - near.u], [near.b, near.u]] as const) for (let c = 0; c < 4; c++) addW(input.ring.bones[p][c] ?? 0, (input.ring.weights[p][c] ?? 0) * k * (1 - e));
    for (const [b, w] of evenly(s, th)) addW(b, w * e);
    const kept = [...sum.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4), total = kept.reduce((a, [, w]) => a + w, 0) || 1;
    let left = 1;
    kept.forEach(([b, w], c) => { const x = c === kept.length - 1 ? left : w / total; bones[v * 4 + c] = b; weights[v * 4 + c] = x; left -= x; });
  };
  // the rings' points
  let v = M;
  rings.forEach((r, k) => {
    const x = section(r.s, r.sigma);
    for (let j = 0; j < N; j++, v++) {
      const th = cols[j];
      let s = r.s, sx = x;
      // (the nail's root curved toward the tip at its corners: the rings round it bent with it, less further off)
      if (r.sigma === 1 && rootRing >= 0) { const bend = cuticleAt(th) * Math.exp(-((r.s - nailRoot) ** 2) / (2 * F.cuticleSpread ** 2)); if (bend > 1e-7) { s = r.s + bend; sx = section(s, r.sigma); } }
      let p = pointOf(sx, th);
      const near = r.ease < 1 ? ringAt(th) : null;
      if (near) { const q = lerp3(input.ring.pos[near.a], input.ring.pos[near.b], near.u); p = lerp3(q, p, r.ease); }
      pos.set(p, v * 3); along[v] = s; around[v] = th; sOf[v] = s;
      const br = ringAt(th);
      putWeights(v, s, th, br, ringS[br.a] + (ringS[br.b] - ringS[br.a]) * br.u);
      // the nail: between its root and its free edge, over the back
      if (rootRing >= 0 && endRing >= 0 && k >= rootRing && k <= endRing && inNail(th)) { const root = nailRoot + cuticleAt(th); tone[v] = Math.max(0, Math.min(1, (s - root) / Math.max(1e-6, rings[endRing].s - root))); }
    }
  });
  // the apex
  { const x = section(tip, 0), apex = x.c; pos.set(apex, v * 3); along[v] = tip; around[v] = 0; sOf[v] = tip; putWeights(v, tip, 0, null, start); v++; }
  const apexIndex = count - 1, idx = (k: number, j: number) => M + k * N + (((j % N) + N) % N);
  // TRIANGLES, facing out: (k,j) (k,j+1) (k+1,j) round each pair of rings; her ring zipped to the first by angle
  const skin: number[] = [], nail: number[] = [];
  const isNailQuad = (k: number, j: number) => rootRing >= 0 && endRing >= 0 && k >= rootRing && k + 1 <= endRing && inNail(cols[j]) && inNail(cols[(j + 1) % N]);
  for (let k = 0; k + 1 < R; k++) for (let j = 0; j < N; j++) {
    const a = idx(k, j), b = idx(k, j + 1), c = idx(k + 1, j), d = idx(k + 1, j + 1), out = isNailQuad(k, j) ? nail : skin;
    out.push(a, b, c, b, d, c);
  }
  for (let j = 0; j < N; j++) skin.push(idx(R - 1, j), idx(R - 1, j + 1), apexIndex);
  // her ring to the first ring: walking both round together by angle, facing out as the rest (her drawn triangles, facing
  // out too, run her ring the other way: against the angle's growth)
  {
    let a = 0, b = 0;
    const colPar = (j: number) => cols[0] + (j * TAU) / N;
    while (a < M || b < N) {
      const takeRing = b >= N || (a < M && par[a + 1] <= colPar(b + 1));
      const ra = seq[a % M], rb = seq[(a + 1) % M];
      if (takeRing) { skin.push(ra, rb, idx(0, b)); a++; }
      else { skin.push(ra, idx(0, b + 1), idx(0, b)); b++; }
    }
  }
  // the nail standing proud: its points inside its rim, out along the finger's section
  for (let k = rootRing + 1; rootRing >= 0 && k < endRing; k++) for (let j = 0; j < N; j++) {
    if (!(Math.abs(wrap(cols[j])) < F.nailHalf - 1e-6)) continue;
    const i = idx(k, j), x = section(sOf[i], rings[k].sigma), out = norm(sub([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], x.c));
    pos[i * 3] += out[0] * F.nailLift; pos[i * 3 + 1] += out[1] * F.nailLift; pos[i * 3 + 2] += out[2] * F.nailLift;
  }
  // NORMALS from its triangles (her ring keeps hers)
  const acc = new Float64Array(count * 3);
  for (const list of [skin, nail]) for (let t = 0; t < list.length; t += 3) {
    const A = list[t], B = list[t + 1], C = list[t + 2], P = (i: number): M3 => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    const n = cross(sub(P(B), P(A)), sub(P(C), P(A)));
    for (const i of [A, B, C]) { acc[i * 3] += n[0]; acc[i * 3 + 1] += n[1]; acc[i * 3 + 2] += n[2]; }
  }
  for (let i = M; i < count; i++) { const n = norm([acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]]); nrm.set(n, i * 3); }
  // WHERE ON THE SKIN PATCH: round it mirrored (0 under the finger, 1 over its back), along it from her ring to its tip
  const from = Math.min(...ringS);
  for (let i = 0; i < count; i++) { uv[i * 2] = 1 - Math.abs(wrap(around[i])) / Math.PI; uv[i * 2 + 1] = Math.max(0, Math.min(1, (along[i] - from) / Math.max(1e-6, tip - from))); }
  return { count, pos, nrm, uv, bones, weights, tone, copyOf, skin: Uint32Array.from(skin), nail: Uint32Array.from(nail) };
}
