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
 *    its sharp lower front edge.
 *  - HER GALLBLADDER: a pear in the hollow under her liver's right lobe, its rounded base (the fundus) forward and down
 *    toward her front wall, its neck back and up toward the middle of her liver's underside.
 *  - HER SPLEEN: a fist-sized bean high at the back of her left side under her ninth to eleventh ribs, under her
 *    diaphragm's left dome, its long axis along those ribs (down and forward), its dented face toward her stomach.
 *  - HER PANCREAS: a long, flat leaf across her back wall behind her stomach, its head in the bend of her duodenum right of
 *    her spine, its body across the front of her spine, its tail rising to her spleen.
 *  - HER WINDPIPE: from the bottom of her larynx down the front of her spine behind her breastbone to where it parts, and
 *    her two main bronchi into her lungs -- the right shorter, wider and steeper than the left.
 *
 * Simple shapes, not medical detail (as her other organs). Every size is MEASURED (its source in its comment) or
 * BIOLOGICAL SHAPE (where it sits and what shape, from anatomy's description of it); what only shapes the mesh is GAME
 * TUNING. Pure: plain arrays, no three.
 */
import type { P3 } from './pelvisMeasure';
import type { OrganMesh } from './pelvicOrgans';
import { bean, smoothLine, sweepAny, type Bean } from './abdominalOrgans';
import { diaphragmAt, layThorax, sectionAt, thoraxSpineAt, type ThoraxLandmarks, type ThoraxLayout } from './thoracicOrgans';

/** Her liver. MEASURED (https://en.wikipedia.org/wiki/Liver): "normally weighs approximately 1.5 kilograms", for women
 * 600-1,770 g (1.3 kg here, a woman's middle), about 1.06 g a mL (liver tissue's density); "a width of about 15
 * centimetres"; "resting just below the diaphragm, to the right of the stomach", "mostly shielded by the lower right rib
 * cage". GAME TUNING: `gap` kept from her diaphragm and her ribs; `leftTip`, how far left of her midline its left lobe
 * reaches; `backThick`/`frontThin`, how its thickness runs from her back to its sharp front edge; `leftThin`, the share of
 * its thickness its left lobe's tip keeps; `edge`, how roundly it closes at its rim; `level`, the height (below the
 * bottom of her breastbone) whose rib cage it is fitted into. */
export const LIVER = Object.freeze({ grams: 1300, density: 1.06, width: 0.15, gap: 0.004, leftTip: 0.06, backThick: 1, frontThin: 0.35, leftThin: 0.12, edge: 0.35, level: 0.04 });
/** Her gallbladder. MEASURED (https://en.wikipedia.org/wiki/Gallbladder): "approximately 7 to 10 centimetres in length",
 * "4 centimetres in diameter when fully distended", "a capacity of about 50 millilitres", "shaped like a pear", "in a
 * shallow depression below the right lobe of the liver", its fundus "angled so that it faces the abdominal wall". Here 8
 * cm, 3 cm across at its fundus (not distended). GAME TUNING: `out` from her midline and `forward` share of her liver's
 * depth for its fundus; `gap` below her liver's underside (negative: set up into it, as it lies in its hollow there) -- the
 * three chosen as the place where it touches the fewest of her other organs (MEASURED 2026-11-13: none at a quiet breath
 * out or in; at her deepest breath in, her liver brings it down onto her colon, which her breath does not move). */
export const GALLBLADDER = Object.freeze({ length: 0.08, fundusR: 0.015, neckR: 0.006, out: 0.045, forward: 0.9, gap: -0.008 });
/** Her spleen. MEASURED (https://en.wikipedia.org/wiki/Spleen): "approximately 7 to 14 centimetres in length", "between
 * 30 and 230 grams", "in the left upper quadrant", "underneath the left part of the thoracic diaphragm", "underneath the
 * ninth, tenth, and eleventh ribs", "in contact with the posterior wall of the stomach", "in relation with the upper part
 * of the anterior surface of the left kidney". 11 x 5 x 3 cm, 150 g here. BIOLOGICAL SHAPE: its long axis along her
 * back ribs, down and a little forward (`axis`). GAME TUNING: how far in from her ribs (`inset`) and forward of her back
 * wall (`forward`) its middle lies, and its gap below her diaphragm -- chosen as the place where it touches none of her
 * other organs at any breath (MEASURED 2026-11-13, against her lungs, heart, stomach, colon, kidneys and liver). */
export const SPLEEN = Object.freeze({ length: 0.11, width: 0.05, thickness: 0.025, grams: 150, axis: [0.3, -0.85, 0.43] as const, inset: 0.004, forward: 0.03, gap: 0.006 });
/** Her pancreas. MEASURED (https://en.wikipedia.org/wiki/Pancreas): "about 12-15 centimetres long", "leaf-shaped, divided
 * into a head, neck, body, and tail", "stretching from behind the stomach to the left upper abdomen near the spleen",
 * "The head of the pancreas sits within the curvature of the duodenum", narrowing "towards the tail ... which sits near
 * the spleen"; about 80 g (BIOLOGICAL SHAPE: 70-100 g). BIOLOGICAL SHAPE: across her upper lumbar vertebrae (L1-L2,
 * lower when standing); here 12.5 cm below the bottom of her breastbone (`below`), at her second, where her colon as laid
 * leaves it room behind it, its tail stopping short of her spleen (MEASURED 2026-11-13: 3 of its 608 points in her colon
 * and none in her liver, spleen or kidneys; at L1 a tenth of it was in her transverse colon, which is laid high). GAME TUNING: its line ([x from her midline, y above `below`,
 * z ahead of her spine's front]) and half-sizes [up and down, front to back] along it; `follow`, the share of her diaphragm's
 * drop it rides down with (it lies on her back wall, which her breath moves less than what hangs under her diaphragm). */
export const PANCREAS = Object.freeze({
  below: 0.125, grams: 80, follow: 0.5,
  line: [[-0.05, -0.012, 0.01], [-0.03, -0.004, 0.022], [-0.005, 0.004, 0.025], [0.03, -0.008, 0.015], [0.058, 0.0, -0.008], [0.074, 0.008, -0.018]] as readonly (readonly [number, number, number])[],
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
export function layLiver(L: ThoraxLayout, rows = 18, cols = 40): UpperLayout['liver'] {
  const t = L.thorax, B = liverBox(t, L.mid), cx = (B.right + B.left) / 2, cz = (B.back + B.front) / 2, hx = (B.left - B.right) / 2, hz = (B.front - B.back) / 2;
  // (its footprint a rounded rectangle: a superellipse, n = 4)
  const at = (s: number, th: number): [number, number] => {
    const c = Math.cos(th), sn = Math.sin(th), r = 1 / Math.pow(Math.abs(c) ** 4 + Math.abs(sn) ** 4, 0.25);
    return [cx + hx * s * r * c, cz + hz * s * r * sn];
  };
  const top = (x: number, z: number) => diaphragmAt(L, x, z) - LIVER.gap;
  const shape = (x: number, z: number, s: number) => {
    const u = clamp((x - B.right) / (B.left - B.right), 0, 1), v = clamp((z - B.back) / (B.front - B.back), 0, 1);
    const across = 1 - (1 - LIVER.leftThin) * Math.pow(u, 1.3), deep = LIVER.backThick - (LIVER.backThick - LIVER.frontThin) * Math.pow(v, 1.4);
    return across * deep * Math.sqrt(Math.max(0, 1 - Math.pow(s, 1 / LIVER.edge * 1.2)));
  };
  // its thickness's scale, for her liver's volume: the lens's volume is linear in it
  const want = LIVER.grams / LIVER.density / 1e6;
  let unit = 0;
  { const N = 60; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = B.right + ((i + 0.5) / N) * (B.left - B.right), z = B.back + ((j + 0.5) / N) * (B.front - B.back);
    const ux = (x - cx) / hx, uz = (z - cz) / hz, s = Math.pow(ux ** 4 + uz ** 4, 0.25);
    if (s <= 1) unit += shape(x, z, s) * ((B.left - B.right) / N) * ((B.front - B.back) / N);
  } }
  const T = unit > 0 ? want / unit : 0.1;
  const thick = (x: number, z: number, s: number) => T * shape(x, z, s);
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
  const bottomAt = (x: number, z: number) => { const ux = (x - cx) / hx, uz = (z - cz) / hz, s = Math.pow(ux ** 4 + uz ** 4, 0.25); return s >= 1 ? top(x, z) : top(x, z) - thick(x, z, s); };
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris), bottomAt, ml: want * 1e6 };
}

/** Her gallbladder under her liver: fundus forward and down, its neck back and up under her liver's middle. */
export function layGallbladder(L: ThoraxLayout, liver: UpperLayout['liver'], G: typeof GALLBLADDER = GALLBLADDER): OrganMesh {
  const B = liverBox(L.thorax, L.mid), x = L.mid - G.out, zf = B.back + (B.front - B.back) * G.forward;
  // its line runs up and back from its fundus, along her liver's underside
  const zn = zf - G.length * 0.75, xn = x + 0.02, fundus: P3 = [x, liver.bottomAt(x, zf) - G.gap - G.fundusR, zf], neck: P3 = [xn, liver.bottomAt(xn, zn) - G.gap - G.neckR, zn];
  const midP: P3 = [(fundus[0] + neck[0]) / 2, Math.min(liver.bottomAt((fundus[0] + neck[0]) / 2, (fundus[2] + neck[2]) / 2) - G.gap - (G.fundusR + G.neckR) / 2, (fundus[1] + neck[1]) / 2), (fundus[2] + neck[2]) / 2];
  const path = smoothLine([fundus, midP, neck], 14);
  const halves = path.map((_, k) => { const f = k / (path.length - 1), r = G.fundusR + (G.neckR - G.fundusR) * smooth(f * 1.15); return [r, r] as const; });
  return sweepAny(path, halves, 16, 4);
}

/** Her spleen under her left ribs, under her diaphragm's left dome, at this breath. */
export function laySpleen(L: ThoraxLayout, S: typeof SPLEEN = SPLEEN): UpperLayout['spleen'] {
  const t = L.thorax, y0 = t.xiphoid[1], s = sectionAt(t, y0), x = s.left - S.inset - S.thickness / 2, z = s.back + S.forward + S.width / 2;
  const a = S.axis, l = Math.hypot(a[0], a[1], a[2]), up: P3 = [-a[0] / l, -a[1] / l, -a[2] / l];
  const b: Bean = { centre: [x, diaphragmAt(L, x, z), z], radii: [S.thickness / 2, S.length / 2, S.width / 2], up, side: 1 };
  // (all of it under her diaphragm: brought down until its highest point against the sheet over it is `gap` below)
  const mesh = underDiaphragm(L, bean(b, 0.3, 16, 20), S.gap);
  return { ...mesh, bean: { ...b, centre: [x, b.centre[1] - mesh.lowered, z] } };
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
export function layPancreas(L: ThoraxLayout, P: typeof PANCREAS = PANCREAS): OrganMesh {
  // (it rides down with her diaphragm by `follow` of its drop at her midline since her quiet breath out)
  const t = L.thorax, y0 = t.xiphoid[1] - P.below - P.follow * diaphragmDrop(L);
  const pts = P.line.map(([x, y, z]) => [L.mid + x, y0 + y, thoraxSpineAt(t, y0 + y) + z]);
  const path = smoothLine(pts, 30), H = P.halves, n = H.length;
  const halves = path.map((_, k) => { const f = (k / (path.length - 1)) * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i; return [H[i][0] + (H[i + 1][0] - H[i][0]) * u, H[i][1] + (H[i + 1][1] - H[i][1]) * u] as const; });
  return sweepAny(path, halves, 16, 4);
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
/** How far her diaphragm's middle has come down since the end of a quiet breath out (metres). */
export function diaphragmDrop(L: ThoraxLayout): number {
  let L0 = quiet.get(L.thorax);
  if (!L0) { L0 = layThorax(L.thorax, 0); quiet.set(L.thorax, L0); }
  const z = (L.thorax.xiphoid[2] + thoraxSpineAt(L.thorax, L.thorax.xiphoid[1])) / 2;
  return Math.max(0, diaphragmAt(L0, L.mid, z) - diaphragmAt(L, L.mid, z));
}

/** Several meshes as one. */
export function joinMeshes(parts: readonly OrganMesh[]): OrganMesh {
  let np = 0, nt = 0;
  for (const p of parts) { np += p.points.length; nt += p.triangles.length; }
  const points = new Float32Array(np), triangles = new Uint32Array(nt);
  let op = 0, ot = 0;
  for (const p of parts) { points.set(p.points, op); const base = op / 3; for (let k = 0; k < p.triangles.length; k++) triangles[ot + k] = p.triangles[k] + base; op += p.points.length; ot += p.triangles.length; }
  return { points, triangles };
}

/** Her upper belly's organs and her windpipe as laid at this breath (her chest as laid, `layThorax`). */
export function layUpper(L: ThoraxLayout): UpperLayout {
  const liver = layLiver(L);
  return { liver, gallbladder: layGallbladder(L, liver), spleen: laySpleen(L), pancreas: layPancreas(L), windpipe: layWindpipe(L.thorax, L.mid) };
}
