/**
 * HER LIVER, GALLBLADDER, SPLEEN AND PANCREAS, AND HER WINDPIPE (Joshua, 2026-11-13: "finishing up adding the remaining
 * organs"), laid out from the inside of her own rib cage as her bones give it (actor/thoracicOrgans.ts
 * `ThoraxLandmarks`), in her rest frame (metres, +y up, +z her front, +x her left). The organs of her upper belly lie
 * under her diaphragm, against it: as it drops on a breath in they go down with it (`layUpper` takes her chest as laid
 * at that breath). Her stomach, bowel and kidneys are in actor/abdominalOrgans.ts; her lungs and heart in
 * thoracicOrgans.ts; her ovaries and tubes in actor/adnexa.ts.
 *
 *  - HER LIVER: a wedge filling the right of her upper belly under her diaphragm's right dome, its top the dome's own
 *    shape, thickest at her right and back, thinning to its left lobe's tip across her midline over her stomach and to
 *    its sharp lower front edge; in front of her spine, its underside resting on her right kidney and on her pancreas.
 *  - HER GALLBLADDER: a pear in the hollow under her liver's right lobe, its rounded base (the fundus) forward and down
 *    toward her front wall, its neck back and up toward the middle of her liver's underside.
 *  - HER SPLEEN: a fist-sized bean high at the back of her left side under her ninth to eleventh ribs, under her
 *    diaphragm's left dome, its long axis along those ribs (down and forward), its dented face toward her stomach, which
 *    lies in front of it; out and forward of her left kidney's upper pole.
 *  - HER PANCREAS: a long, flat leaf across her back wall behind her stomach, its head in the bend of her duodenum right of
 *    her spine, its body across the front of her spine, its tail in front of her left kidney up to her spleen.
 *  - HER WINDPIPE: from the bottom of her larynx down the front of her spine behind her breastbone to where it parts, and
 *    her two main bronchi into her lungs -- the right shorter, wider and steeper than the left.
 *
 * Simple shapes, not medical detail (as her other organs). Every size is MEASURED (its source in its comment) or
 * BIOLOGICAL SHAPE (where it sits and what shape, from anatomy's description of it); what only shapes the mesh is GAME
 * TUNING. Pure: plain arrays, no three.
 *
 * ORGAN AGAINST ORGAN (2026-11-13; Joshua, of her spleen pressing into her kidney and her pancreas laid low: "is it an
 * easy fix?" -- "Yes."). They are laid on her kidneys as her belly's organs have them (`layUpper`'s `kidneys`,
 * `OFF_KIDNEYS`), and her stomach and her colon are laid under and off them (`upperBelly`; actor/abdominalOrgans.ts
 * `layAbdomen`). What lies under her diaphragm rides its domes down all of a piece as she breathes in (`domeDrop`):
 * each keeps its place against the others at every breath. tests/upperOrgans.test.ts holds that none of them lies in
 * another.
 */
import type { P3 } from './pelvisMeasure';
import type { OrganMesh } from './pelvicOrgans';
import { BREATH_RIDE, bean, beanFrame, inBean, smoothLine, sweepAny, type Bean, type Tube, type UpperBelly } from './abdominalOrgans';
import { diaphragmAt, layThorax, sectionAt, thoraxSpineAt, type ThoraxLandmarks, type ThoraxLayout } from './thoracicOrgans';

/** Her liver. MEASURED (https://en.wikipedia.org/wiki/Liver): "normally weighs approximately 1.5 kilograms", for women
 * 600-1,770 g (1.3 kg here, a woman's middle), about 1.06 g a mL (liver tissue's density); "a width of about 15
 * centimetres"; "resting just below the diaphragm, to the right of the stomach", "mostly shielded by the lower right rib
 * cage". GAME TUNING: `gap` kept from her diaphragm and her ribs; `leftTip`, how far left of her midline its left lobe
 * reaches; `backThick`/`frontThin`, how its thickness runs from her back to its sharp front edge; `leftThin`, the share of
 * its thickness its left lobe's tip keeps; `edge`, how roundly it closes at its rim; `level`, the height (below the
 * bottom of her breastbone) whose rib cage it is fitted into. BIOLOGICAL SHAPE: its right lobe reaches back beside her
 * spine into the hollow of her back, and the rest of it lies in front of her spine, her great vessels between them --
 * `spineOff` in front of her spine's front, from `spineRight[0]` right of her midline leftward, all the way back from
 * `spineRight[1]` right of it (at first its footprint ran straight across: MEASURED 2026-11-13, it stood up to 3.2 cm
 * into her spine). Its underside rests on her right kidney and on her pancreas (`OFF_KIDNEYS`: at first 43% of her right
 * kidney was inside it); with what it gives up to them its right lobe comes down to her lowest ribs at her side, where
 * a liver's lower edge lies. */
export const LIVER = Object.freeze({ grams: 1300, density: 1.06, width: 0.15, gap: 0.004, leftTip: 0.06, backThick: 1, frontThin: 0.35, leftThin: 0.12, edge: 0.35, level: 0.04, spineOff: 0.012, spineRight: [0.028, 0.055] as const });
/** Her gallbladder. MEASURED (https://en.wikipedia.org/wiki/Gallbladder): "approximately 7 to 10 centimetres in length",
 * "4 centimetres in diameter when fully distended", "a capacity of about 50 millilitres", "shaped like a pear", "in a
 * shallow depression below the right lobe of the liver", its fundus "angled so that it faces the abdominal wall". Here 7
 * cm, 3 cm across at its fundus (not distended). GAME TUNING: `out` from her midline and `forward` share of her liver's
 * depth for its fundus; `gap` below her liver's underside (negative: set up into it, as it lies in its hollow there). Its
 * neck, which ends over her pancreas's neck, is kept off it (`layGallbladder`'s `floor`). MEASURED 2026-11-13: none of it
 * in her stomach, colon or pancreas at any breath (at first 8 cm; at her deepest breath in, her liver brought it 1.9 cm
 * down into her colon, which her breath did not move then). */
export const GALLBLADDER = Object.freeze({ length: 0.07, fundusR: 0.015, neckR: 0.006, out: 0.045, forward: 0.9, gap: -0.008 });
/** Her spleen. MEASURED (https://en.wikipedia.org/wiki/Spleen): "approximately 7 to 14 centimetres in length", "between
 * 30 and 230 grams", "in the left upper quadrant", "underneath the left part of the thoracic diaphragm", "underneath the
 * ninth, tenth, and eleventh ribs", "in contact with the posterior wall of the stomach", "in relation with the upper part
 * of the anterior surface of the left kidney". 10 x 5 x 2.5 cm, 150 g here. BIOLOGICAL SHAPE: its long axis along her
 * back ribs, down and a little forward (`axis`). GAME TUNING: how far in from her ribs (`inset`) and forward of her back
 * wall (`forward`) its middle lies -- under the slope of her diaphragm's left dome, in front of her left kidney's outer
 * edge -- its gap below her diaphragm, and the way it is moved off her left kidney should it be laid in it (`offKidney`:
 * forward, as little as will do; in her as she is, not at all). MEASURED 2026-11-13: all of it within her ribs, its foot
 * 3.5 cm above her lowest ribs and its top 3 cm above her left kidney's, at her T11 to L2 by her own discs; none of it in
 * another organ at any breath. (At first 11 cm, 6 mm nearer her ribs and 2.5 cm nearer her back wall: under her
 * diaphragm's rim there its top was 6 cm below her dome's and its foot below her lowest ribs, at her navel's height, and
 * 18% of it was inside her left kidney, 1.6 cm deep.) */
export const SPLEEN = Object.freeze({ length: 0.1, width: 0.05, thickness: 0.025, grams: 150, axis: [0.3, -0.85, 0.43] as const, inset: 0.01, forward: 0.055, gap: 0.006, offKidney: [0, 0, 1] as const });
/** Her pancreas. MEASURED (https://en.wikipedia.org/wiki/Pancreas): "about 12-15 centimetres long", "leaf-shaped, divided
 * into a head, neck, body, and tail", "stretching from behind the stomach to the left upper abdomen near the spleen",
 * "The head of the pancreas sits within the curvature of the duodenum", narrowing "towards the tail ... which sits near
 * the spleen"; about 80 g (BIOLOGICAL SHAPE: 70-100 g). BIOLOGICAL SHAPE: across her upper lumbar vertebrae -- its neck
 * at the transpyloric plane, the lower edge of her first -- in front of her kidneys and her spine, behind her stomach.
 * Here 6 cm below the bottom of her breastbone (`below`): its neck at her L1/L2 disc, level with her stomach's pylorus;
 * its head right of her spine over her second lumbar vertebra; its tail up in front of her left kidney (`OFF_KIDNEYS`) to
 * her spleen's inner face. Her liver's underside rests on it (`layLiver`) and her colon lies off it (`upperBelly`).
 * MEASURED 2026-11-13: none of it in another organ at any breath. (At first 12.5 cm below it: at her L3/L4 disc, her
 * navel's height, two vertebrae low -- it had been set down under her kidneys, where it found room, not in front of
 * them, and 16% of it lay in her bowel. And its half-sizes were handed to its sweep the wrong way round: it lay as a flat
 * tongue, 4 cm front to back.) GAME TUNING: its line ([x from her midline, y above `below`, z ahead of her spine's
 * front]) and half-sizes [up and down, front to back] along it, its tail ending at her spleen; `follow`, the share of her
 * diaphragm's domes' drop it rides down with (all of it, as what lies round it does: `domeDrop`). */
export const PANCREAS = Object.freeze({
  below: 0.06, grams: 80, follow: 1,
  line: [[-0.05, -0.012, 0.01], [-0.03, -0.004, 0.022], [-0.005, 0.004, 0.025], [0.03, -0.008, 0.015], [0.05, 0.0, -0.008], [0.064, 0.008, -0.018]] as readonly (readonly [number, number, number])[],
  halves: [[0.02, 0.013], [0.016, 0.011], [0.012, 0.008], [0.012, 0.008], [0.01, 0.007], [0.008, 0.006]] as readonly (readonly [number, number])[],
});
/** Her windpipe. MEASURED (https://en.wikipedia.org/wiki/Trachea): "a length of about 10 to 11 cm", "an inner diameter of
 * about 1.5 to 2 centimetres" (narrower in women: 1.6 here, its wall 1.5 mm more), from "the lower edge of the cricoid
 * cartilage of the larynx" at her sixth cervical vertebra to "the carina" at her fourth thoracic. BIOLOGICAL SHAPE: its
 * parting behind her sternal angle, about 5 cm below the top of her breastbone (`carinaBelow`); in front of her
 * oesophagus, which lies on her spine (`ahead` of her spine's front); her right main bronchus about 2.5 cm, 25 degrees
 * off straight down, her left about 5 cm, 45 degrees, the right a little wider (`bronchi`: length, degrees, radius). */
export const WINDPIPE = Object.freeze({ length: 0.105, radius: 0.0095, carinaBelow: 0.05, ahead: 0.028, bronchi: { right: [0.025, 25, 0.0068], left: [0.05, 45, 0.006] } as const });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };

/** What the organs of her upper belly need of her: her rib cage, and her chest as laid at this breath. */
export interface UpperLayout {
  readonly liver: OrganMesh & { readonly bottomAt: (x: number, z: number) => number; readonly ml: number };
  readonly gallbladder: OrganMesh;
  readonly spleen: OrganMesh & { readonly bean: Bean };
  readonly pancreas: OrganMesh;
  readonly windpipe: OrganMesh;
}

/**
 * HER KIDNEYS UNDER THEM (actor/abdominalOrgans.ts `layKidneys`, laid at the end of a quiet breath out): her liver's
 * underside rests on her right kidney's upper pole (the renal impression on a liver's back, BIOLOGICAL SHAPE) and on her
 * pancreas; her spleen lies out and forward of her left kidney's upper pole ("in relation with the upper part of the
 * anterior surface of the left kidney": SPLEEN's source); her pancreas runs in front of both -- each kept `gap` off
 * them. They ride down with her diaphragm's domes as she breathes in, as these do (`domeDrop`, `BREATH_RIDE.kidneys`).
 * MEASURED 2026-11-13, before: 43% of her right kidney inside her liver (2.7 cm deep), 18% of her spleen inside her left
 * kidney (1.6 cm). `liver`: her liver's own gap over her kidney -- her chest carries her liver and her upper lumbar spine
 * her kidneys, and they shift a few millimetres against one another as she stands and bends (GAME TUNING; MEASURED in the
 * room, her STAND pose: at 3 mm, 3 of her right kidney's 270 points stood in her liver). `skirt`: beside her kidney and
 * her pancreas her liver's underside comes down at this slope, not straight down at their outlines (GAME TUNING: cut
 * square there it drew as a saw's edge and its skin folded -- MEASURED 2026-11-13, 67 of its edges folded back).
 */
export const OFF_KIDNEYS = Object.freeze({ gap: 0.003, liver: 0.007, skirt: 1.5 });

/** Her kidneys as they are at this breath: ridden down with her diaphragm's domes (`domeDrop`). */
export function kidneysAt(L: ThoraxLayout, kidneys: readonly Bean[]): Bean[] {
  return kidneys.map((k) => ({ ...k, centre: [k.centre[0], k.centre[1] - BREATH_RIDE.kidneys * domeDrop(L, k.centre[0]), k.centre[2]] as P3 }));
}

/** The top of a kidney grown by `gap` over (x, z), or -Infinity where it is not under that point -- or, given a `skirt`
 * (a slope), a skirt falling away from its outline at that slope: what rests on it then comes down beside it in a slope
 * and not a cliff (her liver's underside, cut square at her kidney's outline, drew as a saw's edge). */
function beanTop(b: Bean, gap: number, x: number, z: number, skirt = 0): number {
  // (on the line straight up through (x, z): the ellipsoid's measure is a quadratic in y)
  const [a, u, w] = beanFrame(b), R = [b.radii[0] + gap, b.radii[1] + gap, b.radii[2] + gap], dx = x - b.centre[0], dz = z - b.centre[2];
  let A = 0, B = 0, C = -1;
  for (const [ax, r] of [[a, R[0]], [u, R[1]], [w, R[2]]] as const) { const k = ax[1] / r, c = (dx * ax[0] + dz * ax[2]) / r; A += k * k; B += 2 * k * c; C += c * c; }
  if (A <= 0) return -Infinity;
  const disc = B * B - 4 * A * C;
  if (disc >= 0) return b.centre[1] + (-B + Math.sqrt(disc)) / (2 * A);
  if (!(skirt > 0)) return -Infinity;
  // (outside its outline: `f` times as far from its middle as the outline is on that ray, where its top is at -B / 2A / f)
  const f = Math.sqrt(Math.max(1, C + 1 - (B * B) / (4 * A)));
  return b.centre[1] - B / (2 * A) / f - skirt * (f - 1) * Math.hypot(dx, dz) / f;
}
/** The top of a tube grown by `gap` over (x, z), or -Infinity where it is not under that point: the highest of its
 * stations' rounds there (each station's ring turned about the upright through it: its up-and-down half-size high, its
 * wider half-size -- or the way to the next station -- out; near enough, its stations a few millimetres apart). Given a
 * `skirt` (a slope), each round falls away past its outline at that slope (`beanTop`). */
function tubeTop(t: Tube, gap: number, x: number, z: number, skirt = 0): number {
  let best = -Infinity;
  for (let k = 0; k < t.path.length; k++) {
    const p = t.path[k], n = t.path[Math.min(t.path.length - 1, k + 1)], step = Math.hypot(n[0] - p[0], n[2] - p[2]);
    // (its two ends are rounded off past their stations: `sweepAny`'s caps)
    const end = k === 0 || k === t.path.length - 1 ? Math.min(t.halves[k][0], t.halves[k][1]) : 0;
    const out = Math.max(t.halves[k][0], step) + end + gap, up = t.halves[k][1] + gap, d2 = ((x - p[0]) ** 2 + (z - p[2]) ** 2) / (out * out);
    if (d2 < 1) best = Math.max(best, p[1] + up * Math.sqrt(1 - d2));
    else if (skirt > 0) best = Math.max(best, p[1] - skirt * (Math.sqrt(d2) - 1) * out);
  }
  return best;
}
/** A mesh moved along `way` (a unit vector) just far enough that none of its points is within `gap` of a kidney; how far. */
function offBeans(m: OrganMesh, beds: readonly Bean[], way: P3, gap: number): OrganMesh & { readonly moved: number } {
  const clear = (t: number) => { for (let i = 0; i < m.points.length; i += 3) for (const b of beds) if (inBean(b, gap, m.points[i] + way[0] * t, m.points[i + 1] + way[1] * t, m.points[i + 2] + way[2] * t) < 1) return false; return true; };
  if (!beds.length || clear(0)) return { ...m, moved: 0 };
  let lo = 0, hi = 0.01;
  while (!clear(hi) && hi < 0.16) { lo = hi; hi *= 2; }
  for (let k = 0; k < 24; k++) { const t = (lo + hi) / 2; if (clear(t)) hi = t; else lo = t; }
  const points = Float32Array.from(m.points);
  for (let i = 0; i < points.length; i += 3) { points[i] += way[0] * hi; points[i + 1] += way[1] * hi; points[i + 2] += way[2] * hi; }
  return { points, triangles: m.triangles, moved: hi };
}

/** Her liver's footprint at `level`: right wall to left tip (x), back to front (z) -- inside her ribs, before her spine. */
function liverBox(t: ThoraxLandmarks, mid: number) {
  const y = t.xiphoid[1] - LIVER.level, s = sectionAt(t, y), spine = thoraxSpineAt(t, y);
  const right = s.right + LIVER.gap, left = mid + LIVER.leftTip, back = Math.max(s.back + LIVER.gap, spine - 0.04), front = s.front - LIVER.gap;
  return { right, left, back, front, y, spine };
}

/**
 * Her liver as laid under her diaphragm at this breath: a closed lens over its footprint, its top the underside of her
 * diaphragm, its thickness running as `LIVER` says and scaled so it holds her liver's volume (grams / density). Its rim
 * closes roundly. `bottomAt(x, z)` its underside (for her gallbladder).
 */
export function layLiver(L: ThoraxLayout, beds: readonly Bean[] = [], under: readonly Tube[] = [], rows = 18, cols = 40): UpperLayout['liver'] {
  const t = L.thorax, B = liverBox(t, L.mid), cx = (B.right + B.left) / 2, cz = (B.back + B.front) / 2, hx = (B.left - B.right) / 2, hz = (B.front - B.back) / 2;
  // ITS BACK EDGE: beside her spine at her right, where her right lobe fills the hollow of her back, and in front of her
  // spine from just right of it leftward (`LIVER.spineRight`, `spineOff`). Its footprint is a rounded rectangle (a
  // superellipse, n = 4): forward of its middle as it is, behind its middle drawn in to that edge.
  const SR = LIVER.spineRight, inFront = Math.min(cz - 0.01, B.spine + LIVER.spineOff);
  const backAt = (x: number) => B.back + (Math.max(B.back, inFront) - B.back) * smooth((x - (L.mid - SR[1])) / (SR[1] - SR[0]));
  const drawn = (x: number) => (cz - backAt(x)) / (cz - B.back);
  const laid = (x: number, zu: number) => (zu >= cz ? zu : cz + (zu - cz) * drawn(x));
  const at = (s: number, th: number): [number, number] => {
    const c = Math.cos(th), sn = Math.sin(th), r = 1 / Math.pow(Math.abs(c) ** 4 + Math.abs(sn) ** 4, 0.25), x = cx + hx * s * r * c;
    return [x, laid(x, cz + hz * s * r * sn)];
  };
  /** how far out of its footprint's middle a point is: 1 on its rim */
  const out = (x: number, z: number) => { const ux = (x - cx) / hx, uz = ((z >= cz ? z : cz + (z - cz) / drawn(x)) - cz) / hz; return Math.pow(ux ** 4 + uz ** 4, 0.25); };
  const top = (x: number, z: number) => diaphragmAt(L, x, z) - LIVER.gap;
  const shape = (x: number, z: number, s: number) => {
    const u = clamp((x - B.right) / (B.left - B.right), 0, 1), v = clamp((z - B.back) / (B.front - B.back), 0, 1);
    const across = 1 - (1 - LIVER.leftThin) * Math.pow(u, 1.3), deep = LIVER.backThick - (LIVER.backThick - LIVER.frontThin) * Math.pow(v, 1.4);
    return across * deep * Math.sqrt(Math.max(0, 1 - Math.pow(s, 1 / LIVER.edge * 1.2)));
  };
  // (its underside rests on her kidneys, and on her pancreas, where they are under it: it is no thicker there than the
  // room over them)
  const rests = beds.length + under.length > 0;
  const room = (x: number, z: number) => {
    let r = Infinity;
    for (const b of beds) { const t = beanTop(b, OFF_KIDNEYS.liver, x, z, OFF_KIDNEYS.skirt); if (t > -Infinity) r = Math.min(r, top(x, z) - t); }
    for (const u of under) { const t = tubeTop(u, OFF_KIDNEYS.gap, x, z, OFF_KIDNEYS.skirt); if (t > -Infinity) r = Math.min(r, top(x, z) - t); }
    return Math.max(0, r);
  };
  // its thickness's scale, for her liver's volume: linear in it over her kidneys' room, found by halving where they cut it
  const want = LIVER.grams / LIVER.density / 1e6, N = 60, cells: { k: number; room: number; area: number }[] = [], area = ((B.left - B.right) / N) * ((B.front - B.back) / N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = B.right + ((i + 0.5) / N) * (B.left - B.right), zu = B.back + ((j + 0.5) / N) * (B.front - B.back);
    const ux = (x - cx) / hx, uz = (zu - cz) / hz, s = Math.pow(ux ** 4 + uz ** 4, 0.25), z = laid(x, zu);
    if (s <= 1) cells.push({ k: shape(x, z, s), room: rests ? room(x, z) : Infinity, area: area * (zu < cz ? drawn(x) : 1) });
  }
  const held = (T: number) => cells.reduce((v, c) => v + Math.min(T * c.k, c.room) * c.area, 0);
  let lo = 0, hi = 0.05;
  while (held(hi) < want && hi < 2) { lo = hi; hi *= 2; }
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (held(m) < want) lo = m; else hi = m; }
  const T = (lo + hi) / 2;
  const thick = (x: number, z: number, s: number) => { const t = T * shape(x, z, s); return rests ? Math.min(t, room(x, z)) : t; };
  const pts: number[] = [], tris: number[] = [];
  // top: its middle, then rings out to the rim; bottom: the same back in (the rim shared)
  const ring = (s: number, under: boolean) => { for (let j = 0; j < cols; j++) { const [x, z] = at(s, (2 * Math.PI * j) / cols), y = top(x, z); pts.push(x, under ? y - thick(x, z, s) : y, z); } };
  pts.push(cx, top(cx, cz), cz);
  for (let i = 1; i <= rows; i++) ring(i / rows, false);
  for (let i = rows - 1; i >= 1; i--) ring(i / rows, true);
  pts.push(cx, top(cx, cz) - thick(cx, cz, 0), cz);
  const R = 2 * rows - 1, last = 1 + R * cols;
  for (let j = 0; j < cols; j++) tris.push(0, 1 + ((j + 1) % cols), 1 + j);
  for (let r = 0; r + 1 < R; r++) for (let j = 0; j < cols; j++) {
    const a = 1 + r * cols + j, b = 1 + r * cols + ((j + 1) % cols), c = a + cols, d = b + cols;
    tris.push(a, b, c, b, d, c);
  }
  const lastRing = 1 + (R - 1) * cols;
  for (let j = 0; j < cols; j++) tris.push(last, lastRing + j, lastRing + ((j + 1) % cols));
  const bottomAt = (x: number, z: number) => { const s = out(x, z); return s >= 1 ? top(x, z) : top(x, z) - thick(x, z, s); };
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), bottomAt, ml: want * 1e6 };
}

/** Her gallbladder under her liver: fundus forward and down, its neck back and up under her liver's middle; `floor`, the
 * top of what lies under her liver there (her pancreas: its height at x, z, -Infinity where there is none), which it is
 * kept off -- set further up into its hollow in her liver. */
export function layGallbladder(L: ThoraxLayout, liver: UpperLayout['liver'], G: typeof GALLBLADDER = GALLBLADDER, floor: ((x: number, z: number) => number) | null = null): OrganMesh {
  const B = liverBox(L.thorax, L.mid), x = L.mid - G.out, zf = B.back + (B.front - B.back) * G.forward;
  // its line runs up and back from its fundus, along her liver's underside
  const zn = zf - G.length * 0.75, xn = x + 0.02, fundus: P3 = [x, liver.bottomAt(x, zf) - G.gap - G.fundusR, zf], neck: P3 = [xn, liver.bottomAt(xn, zn) - G.gap - G.neckR, zn];
  const midP: P3 = [(fundus[0] + neck[0]) / 2, Math.min(liver.bottomAt((fundus[0] + neck[0]) / 2, (fundus[2] + neck[2]) / 2) - G.gap - (G.fundusR + G.neckR) / 2, (fundus[1] + neck[1]) / 2), (fundus[2] + neck[2]) / 2];
  const line = smoothLine([fundus, midP, neck], 14);
  const halves = line.map((_, k) => { const f = k / (line.length - 1), r = G.fundusR + (G.neckR - G.fundusR) * smooth(f * 1.15); return [r, r] as const; });
  // (its rounded ends reach a radius past its line's: the floor is looked for under them too)
  const path = floor ? line.map((p, k): P3 => { const r = halves[k][0], f = Math.max(floor(p[0], p[2]), floor(p[0], p[2] - r), floor(p[0], p[2] + r)); return f > -Infinity && p[1] - r < f ? [p[0], f + r, p[2]] : p; }) : line;
  return sweepAny(path, halves, 16, 4);
}

/** Her spleen under her left ribs, under her diaphragm's left dome, out and forward of her left kidney (`kidneys`: as laid
 * at the end of a quiet breath out) -- laid there at the end of a quiet breath out, and ridden down at this breath with
 * her diaphragm's left dome, as her stomach beside it and her kidney behind it ride (`domeDrop`). */
export function laySpleen(L: ThoraxLayout, S: typeof SPLEEN = SPLEEN, kidneys: readonly Bean[] = []): UpperLayout['spleen'] {
  const L0 = quietOf(L.thorax), t = L.thorax, y0 = t.xiphoid[1], s = sectionAt(t, y0), x = s.left - S.inset - S.thickness / 2, z = s.back + S.forward + S.width / 2;
  const a = S.axis, l = Math.hypot(a[0], a[1], a[2]), up: P3 = [-a[0] / l, -a[1] / l, -a[2] / l];
  const b: Bean = { centre: [x, diaphragmAt(L0, x, z), z], radii: [S.thickness / 2, S.length / 2, S.width / 2], up, side: 1 };
  // (all of it under her diaphragm: brought down until its highest point against the sheet over it is `gap` below; then
  // forward off her kidney, as little as will do, and under her diaphragm again where it has come to -- twice: brought down
  // again it may meet her kidney lower down)
  let mesh: OrganMesh = underDiaphragm(L0, bean(b, 0.3, 16, 20), S.gap), lowered = (mesh as OrganMesh & { lowered: number }).lowered, moved = 0;
  for (let k = 0; k < 2 && kidneys.length; k++) {
    const off = offBeans(mesh, kidneys, S.offKidney as unknown as P3, OFF_KIDNEYS.gap); moved += off.moved;
    const again = underDiaphragm(L0, off, S.gap); lowered += again.lowered; mesh = again;
    if (!off.moved && !again.lowered) break;
  }
  const w = S.offKidney, c: P3 = [x + w[0] * moved, b.centre[1] + w[1] * moved - lowered, z + w[2] * moved], drop = domeDrop(L, c[0]);
  const points = Float32Array.from(mesh.points);
  for (let i = 1; i < points.length; i += 3) points[i] -= drop;
  return { points, triangles: mesh.triangles, bean: { ...b, centre: [c[0], c[1] - drop, c[2]] } };
}

/** A mesh brought straight down until every point of it is at least `gap` under her diaphragm (as laid); how far it went. */
export function underDiaphragm(L: ThoraxLayout, m: OrganMesh, gap: number): OrganMesh & { readonly lowered: number } {
  let over = -Infinity;
  for (let i = 0; i < m.points.length; i += 3) over = Math.max(over, m.points[i + 1] - (diaphragmAt(L, m.points[i], m.points[i + 2]) - gap));
  // (the sheet under a point moves as the point does not: twice more, from where it now stands)
  let lowered = 0;
  for (let k = 0; k < 3 && over > 0; k++) {
    lowered += over;
    over = -Infinity;
    for (let i = 0; i < m.points.length; i += 3) over = Math.max(over, m.points[i + 1] - lowered - (diaphragmAt(L, m.points[i], m.points[i + 2]) - gap));
  }
  if (!(lowered > 0)) return { ...m, lowered: 0 };
  const points = Float32Array.from(m.points);
  for (let i = 1; i < points.length; i += 3) points[i] -= lowered;
  return { points, triangles: m.triangles, lowered };
}

/** Her pancreas across her back wall, its head right of her spine, its tail up to her spleen. */
export function layPancreas(L: ThoraxLayout, P: typeof PANCREAS = PANCREAS, beds: readonly Bean[] = []): OrganMesh {
  const { path, halves } = pancreasLine(L, P, beds);
  return sweepAny(path, halves, 16, 4);
}
/** Her pancreas's line and its half-sizes along it (`layPancreas`), at this breath, off her kidneys (`beds`) as they are then. */
export function pancreasLine(L: ThoraxLayout, P: typeof PANCREAS = PANCREAS, beds: readonly Bean[] = []): Tube {
  // (it rides down with her diaphragm's domes, by `follow` of their drop since her quiet breath out: `domeDrop`)
  const t = L.thorax, y0 = t.xiphoid[1] - P.below - P.follow * diaphragmDrop(L);
  const pts = P.line.map(([x, y, z]) => [L.mid + x, y0 + y, thoraxSpineAt(t, y0 + y) + z]);
  const line = smoothLine(pts, 30), H = P.halves, n = H.length;
  // (a swept tube's rings are laid front to back first, then up and down -- `sweepAny`, its line running across her: at
  // first these were given it the other way round, and her pancreas lay as a flat tongue, 4 cm front to back)
  const halves = line.map((_, k) => { const f = (k / (line.length - 1)) * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i; return [H[i][1] + (H[i + 1][1] - H[i][1]) * u, H[i][0] + (H[i + 1][0] - H[i][0]) * u] as const; });
  // (in front of her kidneys: each point of its line brought forward off them by its own size and the gap, the moves
  // smoothed along it -- never less than a point needs)
  const ahead = line.map(([x, y, z], k) => {
    const r = Math.max(halves[k][0], halves[k][1]), clear = (dz: number) => beds.every((b) => inBean(b, OFF_KIDNEYS.gap + r, x, y, z + dz) >= 1);
    if (clear(0)) return 0;
    let lo = 0, hi = 0.01; while (!clear(hi) && hi < 0.16) { lo = hi; hi *= 2; }
    for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (clear(m)) hi = m; else lo = m; }
    return hi;
  });
  const span = 3, path = line.map(([x, y, z], k) => {
    let sum = 0, w = 0;
    for (let j = -span; j <= span; j++) { const i = Math.min(line.length - 1, Math.max(0, k + j)), f = 1 - Math.abs(j) / (span + 1); sum += ahead[i] * f; w += f; }
    return [x, y, z + Math.max(ahead[k], sum / w)] as P3;
  });
  return { path, halves };
}

/** Her windpipe down the front of her spine to where it parts, and her two main bronchi out of it. */
export function layWindpipe(t: ThoraxLandmarks, mid: number): OrganMesh {
  const W = WINDPIPE, carinaY = t.sternumTop[1] - W.carinaBelow, topY = carinaY + W.length;
  const at = (y: number): P3 => [mid, y, thoraxSpineAt(t, y) + W.ahead];
  const trunk = smoothLine([at(topY), at((topY + carinaY) / 2), at(carinaY)], 16);
  const carina = trunk[trunk.length - 1];
  const parts: OrganMesh[] = [sweepAny(trunk, trunk.map(() => [W.radius, W.radius] as const), 14, 3)];
  for (const [side, b] of [[-1, W.bronchi.right], [1, W.bronchi.left]] as const) {
    const [len, deg, r] = b, a = (deg * Math.PI) / 180, end: P3 = [carina[0] + side * Math.sin(a) * len, carina[1] - Math.cos(a) * len, carina[2] - 0.004];
    const start: P3 = [carina[0] + side * r * 0.5, carina[1] + r * 0.5, carina[2]];
    const path = smoothLine([start, [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2], end], 8);
    parts.push(sweepAny(path, path.map(() => [r, r] as const), 12, 3));
  }
  return joinMeshes(parts);
}

const quiet = new WeakMap<ThoraxLandmarks, ThoraxLayout>();
/** Her chest as laid at the end of a quiet breath out (kept for each rib cage). */
function quietOf(t: ThoraxLandmarks): ThoraxLayout {
  let L0 = quiet.get(t);
  if (!L0) { L0 = layThorax(t, 0); quiet.set(t, L0); }
  return L0;
}
/**
 * WHAT LIES UNDER HER DIAPHRAGM RIDES ITS DOMES DOWN, ALL OF A PIECE: how far the dome on that side of her (`x`, her rest
 * frame) has come down since the end of a quiet breath out (metres), eased across her middle between her two domes. Her
 * diaphragm works as a piston -- its domes go down, its rim stays on her ribs -- and what hangs under it goes down with
 * its domes together (actor/abdominalOrgans.ts `BREATH_RIDE`'s sources): so her spleen, her pancreas, her kidneys, her
 * stomach and her colon's top keep their places against one another at every breath (each riding the sheet's own drop
 * over it, they slid into one another: the sheet's rim does not move, its domes do).
 */
export function domeDrop(L: ThoraxLayout, x: number): number {
  const [l0, r0] = quietOf(L.thorax).diaphragm.domes, [l, r] = L.diaphragm.domes;
  const dl = Math.max(0, l0.top - l.top), dr = Math.max(0, r0.top - r.top);
  return dr + (dl - dr) * smooth((x - r.x) / Math.max(1e-6, l.x - r.x));
}
/** How far her diaphragm's domes have come down since the end of a quiet breath out (metres; at her middle, between her
 * two domes' drops). */
export function diaphragmDrop(L: ThoraxLayout): number { return domeDrop(L, L.mid); }

/** Several meshes as one. */
export function joinMeshes(parts: readonly OrganMesh[]): OrganMesh {
  let np = 0, nt = 0;
  for (const p of parts) { np += p.points.length; nt += p.triangles.length; }
  const points = new Float32Array(np), triangles = new Uint32Array(nt);
  let op = 0, ot = 0;
  for (const p of parts) { points.set(p.points, op); const base = op / 3; for (let k = 0; k < p.triangles.length; k++) triangles[ot + k] = p.triangles[k] + base; op += p.points.length; ot += p.triangles.length; }
  return { points, triangles };
}

/**
 * WHAT LIES OVER HER BELLY'S ORGANS (actor/abdominalOrgans.ts `layAbdomen`'s `upper`), at the end of a quiet breath out:
 * her liver's underside -- her diaphragm's where her liver is not -- her spleen and her pancreas's line, on her kidneys as
 * they are laid. Her stomach and her colon are laid under and off them.
 */
export function upperBelly(t: ThoraxLandmarks, kidneys: readonly Bean[]): UpperBelly {
  const L0 = quietOf(t), pancreas = pancreasLine(L0, PANCREAS, kidneys), liver = layLiver(L0, kidneys, [pancreas]);
  return { under: (x, z) => liver.bottomAt(x, z), organs: [laySpleen(L0, SPLEEN, kidneys).bean], tubes: [pancreas] };
}

/** Her upper belly's organs and her windpipe as laid at this breath (her chest as laid, `layThorax`), on her kidneys
 * (`kidneys`, as laid at the end of a quiet breath out: actor/abdominalOrgans.ts `layKidneys`; none, they are laid as if
 * she had none -- `OFF_KIDNEYS`). */
export function layUpper(L: ThoraxLayout, kidneys: readonly Bean[] = []): UpperLayout {
  const beds = kidneysAt(L, kidneys), line = pancreasLine(L, PANCREAS, beds), liver = layLiver(L, beds, [line]);
  return { liver, gallbladder: layGallbladder(L, liver, GALLBLADDER, (x, z) => tubeTop(line, OFF_KIDNEYS.gap, x, z)), spleen: laySpleen(L, SPLEEN, kidneys), pancreas: sweepAny(line.path, line.halves, 16, 4), windpipe: layWindpipe(L.thorax, L.mid) };
}
