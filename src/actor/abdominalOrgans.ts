/**
 * HER BELLY'S ORGANS, LAID OUT AGAINST HER BONE (Joshua, 2026-11-08, building the belly skin: "The food stomach should be
 * built with this task as a minimum... I don't [want] everything recreated just certain organs that can tie into later
 * the NPC/AI, and human stats like for food, hygiene, water", choosing the intestines as one soft mass, the bowel and
 * rectum, and the kidneys). Lungs and heart stay in the plan's Phase 2; ovaries and tubes are left out.
 *
 * Built in code from measured sizes, placed from her measured landmarks (src/data/torso/, src/data/pelvis/), in her rest
 * frame (metres, +y up, +z her front, +x her left):
 *
 *  - THE STOMACH: a J under her left ribs -- its fundus up under the left dome of her diaphragm, its body down her left
 *    side, its lowest bend (the greater curvature) about level with L1/L2, its antrum across her middle and its pylorus
 *    just right of it. As big as what it holds (`STOMACH`): flat and narrow empty, round full.
 *  - THE INTESTINES: the small bowel as ONE soft mass (Joshua's choice), filling her belly below the stomach and inside
 *    the frame of the colon, down to the brim of her pelvis. A growing womb pushes it up and back (`layAbdomen`).
 *  - THE COLON: from the caecum low on her right, up her right side, across under the stomach (the transverse colon,
 *    sagging a little), up to the splenic bend high on her left and down her left side to her left iliac fossa.
 *  - THE SIGMOID AND RECTUM: from there into her pelvis, down the hollow of her sacrum behind her birth canal, to the
 *    anorectal bend in front of her tailbone and down the anal canal to her anus, behind her opening (the perineum
 *    between them). The rectum widens as it fills (`RECTUM`).
 *  - THE KIDNEYS: two beans at her back either side of her spine, T12 to L3, the right a little lower than the left
 *    (under the liver), their upper poles nearer her midline; each URETER from its hilum down along her back wall,
 *    over her pelvis's brim to the back of her bladder.
 *
 * Every size is MEASURED (a source in its comment) or BIOLOGICAL SHAPE (where it sits, from anatomy's description of it);
 * what only shapes the mesh is GAME TUNING. Pure: plain arrays, no three.
 */
import type { P3 } from './pelvisMeasure';
import { insideWomb, spineFrontAt, WOMB_SHAPE, type TorsoLandmarks, type WombRoom } from './pregnantWomb';
import type { OrganMesh, PelvisLandmarks } from './pelvicOrgans';

/** The stomach: about 75 mL empty at rest; comfortably full about 1 L, up to about 1.5 L (stretched to 4 L at most).
 * MEASURED (https://en.wikipedia.org/wiki/Stomach: "about 75 mL" empty, distending to about 1 L, up to 4 L). Its length
 * along its greater curvature about 25 cm (MEASURED, the same); flattened front to back when empty (BIOLOGICAL SHAPE). */
export const STOMACH = Object.freeze({ emptyMl: 75, fullMl: 1000, mostMl: 1500, flatEmpty: 0.5, grams: 150 });
/** The small intestine: its contents and wall as one mass of about 1 L at rest (GAME TUNING within MEASURED: the small
 * bowel holds 100-200 mL of gas and fluid between meals and is about 6 m of tube 2.5 cm across, about 1-1.5 L of bowel
 * and contents; https://en.wikipedia.org/wiki/Small_intestine), up to half again after a meal. About 1 kg. */
export const INTESTINES = Object.freeze({ restMl: 1000, mostMl: 1500, grams: 1000 });
/** The colon: about 1.5 m, its caecum about 6 cm across, the rest 2.5-5 cm (MEASURED,
 * https://en.wikipedia.org/wiki/Large_intestine); radii as laid (metres), and how much wider full than empty (GAME TUNING). */
export const COLON = Object.freeze({ caecumR: 0.028, ascendingR: 0.023, transverseR: 0.021, descendingR: 0.017, emptyScale: 0.8, fullScale: 1.15, grams: 450 });
/** The rectum: about 12 cm, its ampulla widening as it fills; a first feeling of it at about 50 mL, the urge to go at
 * about 150 mL, the most held about 300 mL (MEASURED, rectal sensory thresholds: e.g. https://en.wikipedia.org/wiki/Rectum
 * and anorectal manometry norms). The anal canal 3-4 cm (MEASURED, https://en.wikipedia.org/wiki/Anal_canal). */
export const RECTUM = Object.freeze({ feelMl: 50, urgeMl: 150, mostMl: 300, emptyR: 0.011, canalR: 0.007, grams: 120 });
/** Each kidney about 11-12 cm long, 6 cm wide, 3 cm thick, about 135 g in a woman (MEASURED,
 * https://en.wikipedia.org/wiki/Kidney); from T12 to L3, the right 1-2 cm lower (BIOLOGICAL SHAPE); its long axis leaning
 * about 15 degrees toward her midline at the top (BIOLOGICAL SHAPE). Each ureter 25-30 cm, 3-4 mm across (MEASURED,
 * https://en.wikipedia.org/wiki/Ureter). */
export const KIDNEY = Object.freeze({ length: 0.115, width: 0.06, thickness: 0.032, grams: 135, rightLower: 0.015, leanDeg: 15, ureterR: 0.002 });

/** Where they sit, against her landmarks. BIOLOGICAL SHAPE (from anatomy's description of each), GAME TUNING within it so
 * each lies in the room the others leave. Metres: x from her midline (+ her left), y as named, z ahead of her spine's front. */
export const ABDOMEN_PLACE = Object.freeze({
  /** the stomach's line, fundus to pylorus: [x, y above (-below) her xiphoid, z ahead of her spine's front there] */
  stomach: [[0.07, 0.03, 0.035], [0.085, -0.005, 0.05], [0.075, -0.05, 0.068], [0.045, -0.078, 0.08], [0.008, -0.075, 0.088], [-0.025, -0.06, 0.075]] as readonly (readonly [number, number, number])[],
  /** the intestines' middle [x, y, z ahead of the spine] and half-sizes, not pregnant */
  intestines: { centre: [0, 0.995, 0.045] as const, radii: [0.078, 0.062, 0.042] as const },
  /** the colon's line, caecum to the left iliac fossa: [x, y, z ahead of the spine's front at that height] */
  colon: [[-0.062, 0.945, 0.055], [-0.078, 1.0, 0.03], [-0.078, 1.07, 0.03], [-0.068, 1.105, 0.045], [-0.03, 1.09, 0.062], [0.03, 1.095, 0.062], [0.074, 1.13, 0.035], [0.085, 1.09, 0.015], [0.083, 1.0, 0.015], [0.07, 0.945, 0.04]] as readonly (readonly [number, number, number])[],
  /** the sigmoid and rectum, from the colon's end: [x, y, z] in her rest frame relative to her promontory's x and her
   * coccyx/opening (the rectum lies in the sacral hollow; the anus this far behind her opening) */
  sigmoid: [[0.075, 0.945, -0.015], [0.045, 0.925, -0.03], [0.015, 0.915, -0.07]] as readonly (readonly [number, number, number])[],
  rectum: { s3: [0, 0.895, -0.092] as const, ampulla: [0, 0.86, -0.108] as const, bend: [0, 0.825, -0.095] as const },
  anusBehindOpening: 0.033,
  anusBelowOpening: 0.0,
  /** the kidneys' middles: this far from her midline, at her L1/L2 disc (the left) and this far behind her spine's front */
  kidneyOut: 0.064,
  kidneyBehind: 0.028,
  /** each kidney's upper pole tipped back this much (degrees: BIOLOGICAL SHAPE) */
  kidneyBackDeg: 12,
});

export interface Tube { readonly path: readonly P3[]; readonly halves: readonly (readonly [number, number])[] }
export interface Blob { readonly centre: P3; readonly radii: P3 }
export interface Bean { readonly centre: P3; readonly radii: P3; readonly up: P3; readonly side: -1 | 1 }

export interface AbdomenLayout {
  readonly stomach: Tube & { readonly ml: number };
  readonly intestines: Blob & { readonly ml: number };
  readonly colon: Tube & { readonly fill: number };
  readonly rectum: Tube & { readonly ml: number };
  readonly kidneys: readonly [Bean, Bean];
  /** each ureter's line, kidney (hilum) to bladder (rest metres) */
  readonly ureters: readonly [readonly P3[], readonly P3[]];
}

/** How full each is: the stomach and intestines in mL, the colon 0..1 (empty..full), the rectum in mL. */
export interface AbdomenFill { readonly stomachMl: number; readonly intestineMl: number; readonly colonFill: number; readonly rectumMl: number }
export const ABDOMEN_DEFAULT_FILL: AbdomenFill = Object.freeze({ stomachMl: 250, intestineMl: INTESTINES.restMl, colonFill: 0.4, rectumMl: 20 });

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(x) ? x : a));
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A smooth line through `pts` (Catmull-Rom), `n` points. */
export function smoothLine(pts: readonly (readonly number[])[], n: number): P3[] {
  const out: P3[] = [], m = pts.length - 1;
  for (let k = 0; k < n; k++) {
    const u = (k / (n - 1)) * m, i = Math.min(m - 1, Math.floor(u)), t = u - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(m, i + 2)];
    const t2 = t * t, t3 = t2 * t, c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), c(p0[2], p1[2], p2[2], p3[2])]);
  }
  return out;
}
const lineLength = (p: readonly P3[]) => { let s = 0; for (let k = 1; k < p.length; k++) s += dist(p[k - 1], p[k]); return s; };

/** The stomach's half-sizes along it (t 0 fundus .. 1 pylorus), as shares of its widest: BIOLOGICAL SHAPE (a wide fundus
 * and body narrowing through the antrum to the pylorus). */
export function stomachProfile(t: number): number {
  const k = [[0, 0.82], [0.12, 1], [0.4, 1], [0.65, 0.78], [0.85, 0.5], [1, 0.26]];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * u; }
  return k[k.length - 1][1];
}

/** A tube's volume, metres³ (its rings' ellipses along its line, its ends rounded off as half-ellipsoids). */
export function tubeVolume(t: Tube): number {
  let v = 0;
  for (let k = 1; k < t.path.length; k++) { const a = t.halves[k - 1], b = t.halves[k]; v += Math.PI * ((a[0] * a[1] + b[0] * b[1]) / 2) * dist(t.path[k - 1], t.path[k]); }
  const e = (h: readonly [number, number]) => (2 / 3) * Math.PI * h[0] * h[1] * Math.min(h[0], h[1]);
  return v + e(t.halves[0]) + e(t.halves[t.halves.length - 1]);
}

/** The stomach holding `ml`: its line and half-sizes. */
export function layStomach(torso: TorsoLandmarks, ml: number, x0: number): AbdomenLayout['stomach'] {
  const X = torso.landmarks.xiphoid, v = clamp(ml, STOMACH.emptyMl * 0.4, STOMACH.mostMl);
  const pts = ABDOMEN_PLACE.stomach.map(([x, dy, dz]) => [x0 + x, X[1] + dy, spineFrontAt(torso, X[1] + dy) + dz]);
  const path = smoothLine(pts, 26);
  // (empty it lies flat front to back; full it rounds out)
  const fill = clamp((v - STOMACH.emptyMl) / (STOMACH.fullMl - STOMACH.emptyMl), 0, 1), flat = STOMACH.flatEmpty + (1 - STOMACH.flatEmpty) * Math.sqrt(fill);
  const total = lineLength(path), s: number[] = [0];
  for (let k = 1; k < path.length; k++) s.push(s[k - 1] + dist(path[k - 1], path[k]));
  const unit: Tube = { path, halves: s.map((d) => { const p = stomachProfile(d / total); return [p, p * flat] as const; }) };
  // (its widest half-size so it holds `v`, found by halving: its rounded ends grow faster than its length)
  let lo = 0, hi = 0.2;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (tubeVolume({ path, halves: unit.halves.map(([a, b]) => [a * m, b * m] as const) }) < v * 1e-6) lo = m; else hi = m; }
  const scale = (lo + hi) / 2;
  return { path, halves: unit.halves.map(([a, b]) => [a * scale, b * scale] as const), ml: v };
}

/** The colon at `fill` (0 empty .. 1 full). */
export function layColon(torso: TorsoLandmarks, fill: number, x0: number): AbdomenLayout['colon'] {
  const f = clamp(fill, 0, 1), k = COLON.emptyScale + (COLON.fullScale - COLON.emptyScale) * f;
  const path = smoothLine(ABDOMEN_PLACE.colon.map(([x, y, z]) => [x0 + x, y, spineFrontAt(torso, y) + z]), 40);
  const total = lineLength(path), C = COLON;
  // (wide at the caecum, narrowing up the ascending colon, across, and down the descending)
  const at = (t: number) => (t < 0.08 ? C.caecumR + (C.ascendingR - C.caecumR) * (t / 0.08) : t < 0.38 ? C.ascendingR + (C.transverseR - C.ascendingR) * ((t - 0.08) / 0.3) : t < 0.7 ? C.transverseR + (C.descendingR - C.transverseR) * ((t - 0.38) / 0.32) : C.descendingR);
  let s = 0;
  const halves = path.map((p, i) => { if (i) s += dist(path[i - 1], p); const r = at(s / total) * k; return [r, r] as const; });
  return { path, halves, fill: f };
}

/** The sigmoid, rectum and anal canal holding `ml`, from the colon's end down to her anus behind her opening. */
export function layRectum(pelvis: PelvisLandmarks, colonEnd: P3, ml: number, x0: number, opening: P3): AbdomenLayout['rectum'] {
  const A = ABDOMEN_PLACE, v = clamp(ml, 0, RECTUM.mostMl), R = A.rectum;
  const anus: P3 = [x0, opening[1] - A.anusBelowOpening, opening[2] - A.anusBehindOpening];
  const pts: P3[] = [colonEnd, ...A.sigmoid.slice(1).map(([x, y, z]) => [x0 + x, y, z] as P3), [x0, R.s3[1], R.s3[2]], [x0, R.ampulla[1], R.ampulla[2]], [x0, R.bend[1], R.bend[2]], anus];
  const path = smoothLine(pts, 36), total = lineLength(path);
  // the ampulla (between S3 and the anorectal bend) widens as it fills: its volume there is what it holds
  let s = 0;
  const along = path.map((p, i) => { if (i) s += dist(path[i - 1], p); return s / total; });
  const at = (k: number) => along[Math.round((k / (pts.length - 1)) * (path.length - 1))];
  // (pts: the colon's end, two of the sigmoid, S3, the ampulla, the anorectal bend, the anus)
  const s3 = at(3), bend = Math.min(0.97, at(5));
  const ampLen = Math.max(0.02, (bend - s3) * total);
  // (a cylinder of the ampulla's length holding v, its ends rounding into the sigmoid and the canal)
  const ampR = Math.max(RECTUM.emptyR, Math.sqrt((v * 1e-6) / (Math.PI * ampLen * 0.7)));
  const halves = along.map((t) => {
    let r: number;
    if (t < s3) r = COLON.descendingR * 0.9 + (RECTUM.emptyR - COLON.descendingR * 0.9) * (t / s3);
    else if (t < bend) { const u = (t - s3) / (bend - s3); r = RECTUM.emptyR + (ampR - RECTUM.emptyR) * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7; }
    else r = RECTUM.emptyR + (RECTUM.canalR - RECTUM.emptyR) * ((t - bend) / (1 - bend));
    return [r, r] as const;
  });
  void pelvis;
  return { path, halves, ml: v };
}

/** Her kidneys: the left at her L1/L2 disc, the right lower, each beside her spine at her back. */
export function layKidneys(torso: TorsoLandmarks & { readonly discs?: readonly number[] }, x0: number): [Bean, Bean] {
  const A = ABDOMEN_PLACE, K = KIDNEY, discs = torso.discs ?? [], l1l2 = discs[4] ?? torso.landmarks.navel + 0.07;
  const lean = (K.leanDeg * Math.PI) / 180, back = (A.kidneyBackDeg * Math.PI) / 180;
  const bean = (side: -1 | 1): Bean => {
    const y = l1l2 - (side < 0 ? K.rightLower : 0);
    // (its upper pole toward her midline and tipped back)
    const up: P3 = [-side * Math.sin(lean), Math.cos(lean) * Math.cos(back), -Math.cos(lean) * Math.sin(back)];
    return { centre: [x0 + side * A.kidneyOut, y, spineFrontAt(torso, y) - A.kidneyBehind], radii: [K.width / 2, K.length / 2, K.thickness / 2], up, side };
  };
  return [bean(1), bean(-1)];
}

/** The intestines' mass holding `ml`, not yet pushed by a womb. */
export function layIntestines(torso: TorsoLandmarks, ml: number, x0: number): AbdomenLayout['intestines'] {
  const A = ABDOMEN_PLACE.intestines, v = clamp(ml, INTESTINES.restMl * 0.6, INTESTINES.mostMl), k = Math.cbrt(v / INTESTINES.restMl);
  const y = A.centre[1];
  return { centre: [x0 + A.centre[0], y, spineFrontAt(torso, y) + A.centre[2]], radii: [A.radii[0] * k, A.radii[1] * k, A.radii[2] * k], ml: v };
}

/**
 * A GROWING WOMB MOVES THEM (the plan: "the growing womb pushes the soft intestines up and back as a real one does"):
 * the intestines' middle risen above the womb's top and back toward her spine as far as the room under her stomach
 * allows, flattened as they go; whatever of any organ still lies in the womb is pushed out of it (`outOfWomb`).
 * BIOLOGICAL SHAPE; GAME TUNING how far.
 */
export const WOMB_PUSH = Object.freeze({ gap: 0.006, riseShare: 0.75, backShare: 0.45, flattenMost: 0.45, ceilingBelowXiphoid: 0.035 });

export function pushedIntestines(i: AbdomenLayout['intestines'], womb: WombRoom | null, torso: TorsoLandmarks): AbdomenLayout['intestines'] {
  if (!womb) return i;
  const W = WOMB_PUSH, over = womb.top - (i.centre[1] - i.radii[1]);
  if (over <= 0) return i;
  const ceiling = torso.landmarks.xiphoid[1] - W.ceilingBelowXiphoid, room = Math.max(0, ceiling - i.centre[1] - i.radii[1] * 0.4);
  const rise = Math.min(room, over * W.riseShare), flat = 1 - W.flattenMost * Math.min(1, over / 0.2);
  const y = i.centre[1] + rise, back = Math.min(i.centre[2] - (spineFrontAt(torso, y) + 0.025), over * W.backShare * 0.25);
  // (flattened top to bottom and front to back, spread across her: about the same volume)
  const ry = i.radii[1] * flat, rz = i.radii[2] * Math.sqrt(flat), rx = i.radii[0] / Math.sqrt(flat * Math.sqrt(flat)) ;
  return { centre: [i.centre[0], y, i.centre[2] - Math.max(0, back)], radii: [Math.min(rx, i.radii[0] * 1.3), ry, rz], ml: i.ml };
}

/**
 * Points (rest metres, in place) pushed out of the womb by at least `gap` past its wall: each one inside it (its slices
 * grown by `gap`) moved out in its slice's plane to the slice's ellipse, or over its top. Returns how many moved.
 */
export function outOfWomb(points: Float32Array, womb: WombRoom, gap: number = WOMB_PUSH.gap): number {
  if (womb.pushOut) return womb.pushOut(points, gap);
  const n = womb.halves.length, body0 = womb.path.length - WOMB_SHAPE.stations - 1;
  const lean = (womb.leanDeg * Math.PI) / 180, ay = Math.cos(lean), az = Math.sin(lean), fy = -az, fz = ay;
  const top = womb.path[n - 1];
  let moved = 0;
  for (let p = 0; p < points.length; p += 3) {
    const x = points[p], y = points[p + 1], z = points[p + 2];
    const past = (k: number) => (y - womb.path[k][1]) * ay + (z - womb.path[k][2]) * az;
    // over its top: within a gap of the fundus, kept a gap above it
    if (past(n - 1) > -gap && past(n - 1) < gap) {
      const h = womb.halves[Math.max(body0, n - 4)], across = x - top[0], front = (y - top[1]) * fy + (z - top[2]) * fz;
      if ((across / (h[0] + gap)) ** 2 + (front / (h[1] + gap)) ** 2 <= 0.25) { const lift = gap - past(n - 1); points[p + 1] += lift * ay; points[p + 2] += lift * az; moved++; }
      continue;
    }
    if (past(body0) < 0 || past(n - 1) >= 0) continue;
    let lo = body0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (past(m) >= 0) lo = m; else hi = m; }
    const dl = past(lo), dh = past(hi), u = dl - dh > 0 ? dl / (dl - dh) : 0;
    const a = womb.path[lo], b = womb.path[hi], ha = womb.halves[lo], hb = womb.halves[hi];
    const cy = a[1] + (b[1] - a[1]) * u, cz = a[2] + (b[2] - a[2]) * u, ca = ha[0] + (hb[0] - ha[0]) * u + gap, cb = ha[1] + (hb[1] - ha[1]) * u + gap;
    const across = x - (a[0] + (b[0] - a[0]) * u), front = (y - cy) * fy + (z - cz) * fz, e = (across / ca) ** 2 + (front / cb) ** 2;
    if (!(ca > 0 && cb > 0) || e >= 1) continue;
    // (out along its own way from the slice's middle, to the ellipse)
    const k = 1 / Math.sqrt(Math.max(1e-9, e)), da = across * (k - 1), df = front * (k - 1);
    points[p] += da; points[p + 1] += df * fy; points[p + 2] += df * fz;
    moved++;
  }
  return moved;
}
/**
 * A tube moved out of the womb as a tube (a colon, a stomach): each station's middle pushed out of the womb grown by its
 * own radius and the gap, the pushes smoothed along it so it bends round the womb rather than being squashed flat
 * against it. Returns the tube moved (its halves as they were).
 */
export function tubeOutOfWomb<T extends Tube>(t: T, womb: WombRoom | null, gap: number = WOMB_PUSH.gap): T {
  if (!womb) return t;
  const n = t.path.length, d = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) {
    const p = Float32Array.from(t.path[k]);
    outOfWomb(p, womb, gap + Math.max(t.halves[k][0], t.halves[k][1]));
    d[3 * k] = p[0] - t.path[k][0]; d[3 * k + 1] = p[1] - t.path[k][1]; d[3 * k + 2] = p[2] - t.path[k][2];
  }
  // (smoothed along it a few stations each way, never below what each station itself needed: max then a soft average)
  const span = Math.max(2, Math.round(n / 12)), out = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) for (let a = 0; a < 3; a++) {
    let sum = 0, w = 0;
    for (let j = -span; j <= span; j++) { const i = Math.min(n - 1, Math.max(0, k + j)), f = 1 - Math.abs(j) / (span + 1); sum += d[3 * i + a] * f; w += f; }
    const own = d[3 * k + a], avg = sum / w;
    out[3 * k + a] = Math.abs(own) > Math.abs(avg) ? own : avg;
  }
  return { ...t, path: t.path.map((p, k) => [p[0] + out[3 * k], p[1] + out[3 * k + 1], p[2] + out[3 * k + 2]] as P3) };
}

/** How many of `points` lie in the womb (for tests). */
export function inWomb(points: ArrayLike<number>, womb: WombRoom): number {
  let k = 0; for (let p = 0; p + 2 < points.length; p += 3) if (insideWomb(womb, points[p], points[p + 1], points[p + 2])) k++; return k;
}

/** Points (in place) pushed out of an ellipsoid grown by `gap` (a full bladder, the intestines), radially from its middle. */
export function outOfBlob(points: Float32Array, b: Blob, gap: number): number {
  let moved = 0;
  const [cx, cy, cz] = b.centre, rx = b.radii[0] + gap, ry = b.radii[1] + gap, rz = b.radii[2] + gap;
  for (let p = 0; p < points.length; p += 3) {
    const dx = points[p] - cx, dy = points[p + 1] - cy, dz = points[p + 2] - cz, e = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2;
    if (e >= 1 || e < 1e-12) continue;
    const k = 1 / Math.sqrt(e);
    points[p] = cx + dx * k; points[p + 1] = cy + dy * k; points[p + 2] = cz + dz * k; moved++;
  }
  return moved;
}

/** Her belly's organs laid out: holding `fill`, round her womb (`womb`, null not pregnant) and her bladder. */
export function layAbdomen(torso: TorsoLandmarks & { readonly discs?: readonly number[] }, pelvis: PelvisLandmarks, opening: P3, bladder: Blob, fill: AbdomenFill = ABDOMEN_DEFAULT_FILL, womb: WombRoom | null = null): AbdomenLayout {
  const x0 = pelvis.landmarks.symphysisTop[0];
  // (a growing womb moves the stomach and the colon round it, each as a whole tube)
  const stomach = tubeOutOfWomb(layStomach(torso, fill.stomachMl, x0), womb), colon = tubeOutOfWomb(layColon(torso, fill.colonFill, x0), womb);
  const rectum = layRectum(pelvis, colon.path[colon.path.length - 1], fill.rectumMl, x0, opening);
  const intestines = pushedIntestines(layIntestines(torso, fill.intestineMl, x0), womb, torso);
  const kidneys = layKidneys(torso, x0);
  const ureter = (k: Bean): P3[] => {
    const s = k.side, hilum: P3 = [k.centre[0] - s * k.radii[0] * 0.8, k.centre[1] - 0.005, k.centre[2] + 0.006];
    const brimY = pelvis.inlet.centre[1] + 0.06, bladderBack: P3 = [bladder.centre[0] + s * bladder.radii[0] * 0.45, bladder.centre[1] - bladder.radii[1] * 0.35, bladder.centre[2] - bladder.radii[2] * 0.9];
    return smoothLine([hilum, [x0 + s * 0.042, hilum[1] - 0.06, spineFrontAt(torso, hilum[1] - 0.06) - 0.006], [x0 + s * 0.045, brimY, pelvis.landmarks.promontory[2] + 0.02], [x0 + s * 0.055, brimY - 0.055, bladderBack[2] - 0.035], bladderBack], 22);
  };
  return { stomach, intestines, colon, rectum, kidneys, ureters: [ureter(kidneys[0]), ureter(kidneys[1])] };
}

/**
 * A tube swept along a line with frames carried along it (parallel transport), so it may run any way -- across her (a
 * stomach's antrum, the transverse colon) as well as up and down. Its rings' half-sizes `halves[k]` = [a, b] about the
 * frame's two normals, the first starting as near her front (+z) as the line allows. Ends rounded in `caps` rings.
 * Returns the mesh and each station's centre and normals (for cages).
 */
export function sweepAny(path: readonly P3[], halves: readonly (readonly [number, number])[], ring = 16, caps = 4): OrganMesh & { frames: { at: P3; n1: P3; n2: P3; t: P3; a: number; b: number }[] } {
  const N = path.length, tan: P3[] = [];
  for (let k = 0; k < N; k++) { const a = path[Math.max(0, k - 1)], b = path[Math.min(N - 1, k + 1)], d = dist(a, b) || 1; tan.push([(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d]); }
  const norm = (v: P3): P3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ortho = (v: P3, t: P3): P3 => { const d = v[0] * t[0] + v[1] * t[1] + v[2] * t[2]; return norm([v[0] - d * t[0], v[1] - d * t[1], v[2] - d * t[2]]); };
  let n1 = Math.abs(tan[0][2]) > 0.9 ? ortho([0, 1, 0], tan[0]) : ortho([0, 0, 1], tan[0]);
  const frames: { at: P3; n1: P3; n2: P3; t: P3; a: number; b: number }[] = [];
  for (let k = 0; k < N; k++) { if (k) n1 = ortho(n1, tan[k]); frames.push({ at: path[k], n1, n2: cross(tan[k], n1), t: tan[k], a: halves[k][0], b: halves[k][1] }); }
  const rings: { at: P3; n1: P3; n2: P3; a: number; b: number }[] = [];
  const end = (f: (typeof frames)[number], dir: 1 | -1) => {
    const out: typeof rings = [];
    for (let c = 1; c <= caps; c++) {
      const th = (c / caps) * (Math.PI / 2), k = Math.cos(th), push = Math.sin(th) * Math.min(f.a, f.b) * dir;
      out.push({ at: [f.at[0] + f.t[0] * push, f.at[1] + f.t[1] * push, f.at[2] + f.t[2] * push], n1: f.n1, n2: f.n2, a: f.a * Math.max(k, 1e-3), b: f.b * Math.max(k, 1e-3) });
    }
    return out;
  };
  rings.push(...end(frames[0], -1).reverse(), ...frames, ...end(frames[N - 1], 1));
  const pts: number[] = [], tris: number[] = [];
  for (const r of rings) for (let j = 0; j < ring; j++) {
    const th = (2 * Math.PI * j) / ring, ca = Math.cos(th) * r.a, sb = Math.sin(th) * r.b;
    pts.push(r.at[0] + r.n1[0] * ca + r.n2[0] * sb, r.at[1] + r.n1[1] * ca + r.n2[1] * sb, r.at[2] + r.n1[2] * ca + r.n2[2] * sb);
  }
  for (let i = 0; i + 1 < rings.length; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + ((j + 1) % ring), c = a + ring, d = b + ring;
    tris.push(a, b, c, b, d, c);
  }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), frames };
}

/** An ellipsoid turned so its second axis is `up` (its first across, in her transverse plane as near as it can), with a
 * dent `dent` deep (share of its width) on its `side`'s inner face -- a kidney's hilum. */
export function bean(b: Bean, dent = 0.28, rows = 14, cols = 18): OrganMesh {
  const up = b.up, ax0: P3 = [1, 0, 0], d = ax0[0] * up[0] + ax0[1] * up[1] + ax0[2] * up[2];
  let ax: P3 = [ax0[0] - d * up[0], ax0[1] - d * up[1], ax0[2] - d * up[2]];
  const l = Math.hypot(...ax) || 1; ax = [ax[0] / l, ax[1] / l, ax[2] / l];
  const az: P3 = [ax[1] * up[2] - ax[2] * up[1], ax[2] * up[0] - ax[0] * up[2], ax[0] * up[1] - ax[1] * up[0]];
  const pts: number[] = [], tris: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const th = (Math.PI * i) / rows, y = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < cols; j++) {
      const ph = (2 * Math.PI * j) / cols, cx = s * Math.cos(ph), cz = s * Math.sin(ph);
      // (the inner face, toward her midline, dented round its middle)
      const inner = -b.side * cx, k = inner > 0 ? 1 - dent * inner ** 2 * Math.exp(-((y / 0.45) ** 2)) : 1;
      const lx = b.radii[0] * cx * k, ly = b.radii[1] * y, lz = b.radii[2] * cz;
      pts.push(b.centre[0] + ax[0] * lx + up[0] * ly + az[0] * lz, b.centre[1] + ax[1] * lx + up[1] * ly + az[1] * lz, b.centre[2] + ax[2] * lx + up[2] * ly + az[2] * lz);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * cols + j, bb = i * cols + ((j + 1) % cols), c = a + cols, dd = bb + cols; tris.push(a, bb, c, bb, dd, c); }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris) };
}

/** The intestines' mass drawn as a coiled lump: an ellipsoid with low bumps over it, as loops of bowel packed together
 * show through the omentum. GAME TUNING (how bumpy). */
export function coiledMass(b: Blob, rows = 22, cols = 32, bumps = 0.07): OrganMesh {
  const pts: number[] = [], tris: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const th = (Math.PI * i) / rows, y = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < cols; j++) {
      const ph = (2 * Math.PI * j) / cols, k = 1 + bumps * Math.sin(5 * ph + 3 * th) * Math.sin(4 * th + 1.3) * s;
      pts.push(b.centre[0] + b.radii[0] * s * Math.cos(ph) * k, b.centre[1] + b.radii[1] * y * k, b.centre[2] + b.radii[2] * s * Math.sin(ph) * k);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * cols + j, bb = i * cols + ((j + 1) % cols), c = a + cols, dd = bb + cols; tris.push(a, bb, c, bb, dd, c); }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris) };
}
