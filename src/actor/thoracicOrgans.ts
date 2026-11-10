/**
 * HER LUNGS, HER HEART AND HER DIAPHRAGM, LAID OUT IN HER RIB CAGE (the skeleton-outward plan, Phase 2: "Lungs and
 * diaphragm: two blended shapes filling the ribcage; the diaphragm a dome under them. Breathing: the diaphragm drops and
 * the lungs fill on each breath. Heart: a blended teardrop between the lungs, tilted left"). Her belly's organs are in
 * actor/abdominalOrgans.ts, her pelvic ones in actor/pelvicOrgans.ts.
 *
 * Built in code from measured sizes, placed from the INSIDE OF HER OWN RIB CAGE as her bones give it (`measureThorax`:
 * slice by slice, its inner walls left, right, front and back, the front of her spine, the two ends of her breastbone),
 * in her rest frame (metres, +y up, +z her front, +x her left):
 *
 *  - HER DIAPHRAGM: a sheet of muscle across the bottom of her rib cage, its rim on her lower ribs -- highest in front,
 *    at the bottom of her breastbone, lowest at her back -- rising steeply inside them to two domes, the right higher than
 *    the left (her liver lies under it), with the flatter central part between them that her heart rests on. On a breath
 *    in it pulls down and flattens (`layThorax`'s `breath`).
 *  - HER LUNGS: each fills its half of her rib cage, whatever its shape, from the dome of the diaphragm under it up to its
 *    rounded top at her first rib; a thin gap from her ribs (the pleura), its inner face flat against the middle of her
 *    chest, off her spine, and hollowed where her heart lies against it -- the left one deeply (its cardiac notch). They
 *    grow on a breath in mostly downward, after the diaphragm, and a little outward.
 *  - HER HEART: a blunt teardrop behind her breastbone between her lungs, resting on the diaphragm's central part, two
 *    thirds of it left of her midline, its point (the apex) down, forward and to her left. It squeezes once a beat.
 *
 * Simple shapes, not medical detail. Every size is MEASURED (a source in its comment) or BIOLOGICAL SHAPE (where it sits
 * and what shape, from anatomy's description of it); what only shapes the mesh or the motion is GAME TUNING. Pure: plain
 * arrays, no three.
 */
import type { P3 } from './pelvisMeasure';
import type { OrganMesh } from './pelvicOrgans';

/** Her lungs. MEASURED (https://en.wikipedia.org/wiki/Lung_volumes_and_capacities, the women's column, litres: "Total
 * lung capacity 4.2", "Functional residual capacity 1.8" -- the air left in them at the end of a quiet breath out --
 * "Tidal volume 0.5", "Residual volume 1.1"); "The lungs together weigh approximately 1.3 kilograms, and the right is
 * heavier", "The right lung is bigger than the left, and the left lung shares space in the chest with the heart", its
 * "cardiac notch", each apex "reaching shortly above the level of the sternal end of the first rib" (MEASURED and
 * BIOLOGICAL SHAPE, https://en.wikipedia.org/wiki/Lung). Metres, GAME TUNING within that shape: the `pleura` gap kept
 * between a lung and her ribs, her diaphragm and her heart; `ribSwing`, the further gap left between a lung and her ribs
 * at the end of a breath out, which the lung takes up by the end of a quiet breath in (her bones are not moved by her
 * breath here, so this stands for her ribs' swing out: set so that a quiet breath draws about the tidal volume in her
 * own rib cage -- 510 mL as her bones are laid in v2, about 200 mL of it her diaphragm's); `faceLeft`/`faceRight`, how far each lung's inner face stands off her midline
 * beside her heart (the middle of her chest, fuller on her left), easing to `faceTop` at its top above her heart;
 * `spineHalf`, half the width her spine's bodies take at her back (thoracic bodies are 2.5-4 cm wide: BIOLOGICAL SHAPE);
 * `capShare`, the top share of a lung's height over which it rounds in to its apex; `corner`, how sharply its inner
 * face turns into her ribs' curve (higher: sharper); `leastRoom`, the least room a lung needs to reach a height. */
export const LUNGS = Object.freeze({ totalMl: 4200, restMl: 1800, tidalMl: 500, residualMl: 1100, grams: 1300, pleura: 0.003, ribSwing: 0.004, faceLeft: 0.034, faceRight: 0.024, faceTop: 0.02, spineHalf: 0.02, capShare: 0.24, corner: 4, leastRoom: 0.012 });

/** Her heart: "12 cm in length, 8 cm wide, and 6 cm in thickness", "a mass of 250-350 grams" (MEASURED,
 * https://en.wikipedia.org/wiki/Heart; a woman's at the lighter end). "Approximately a third of the heart is to the right
 * of the midline of the sternum, the remainder is to the left"; "the cardiac apex ... in the fifth intercostal space in
 * the mid-clavicular line"; "the cardiac long axis ... lies in a line drawn from the left hypochondrium towards the right
 * shoulder" (BIOLOGICAL SHAPE, https://med.libretexts.org/Bookshelves/Medicine/Textbook_of_Cardiology/01%3A_Anatomy/1.02%3A_Position_of_the_Heart):
 * so its long axis points `downDeg` below level and `leftDeg` to her left of straight ahead (about 40-45 degrees each),
 * and its middle stands `leftShift` of its own half-breadth left of her midline -- where the plane of her midline leaves
 * two thirds of an ellipsoid on her left (the share of a ball beyond a plane h of its radius from its middle is
 * (2 + 3h - h^3) / 4: two thirds at h = 0.226). GAME TUNING: `sac`, the gap kept round it (its pericardium); `taper`, how
 * much its apex half narrows from an ellipsoid to a teardrop; `squeeze`, the share its breadth draws in at the height of
 * a beat (its length by `squeezeLong` of that); `beatShare`, the share of a beat it spends squeezing (systole is about a
 * third of a beat at rest: BIOLOGICAL SHAPE). */
export const HEART = Object.freeze({ length: 0.12, width: 0.08, thickness: 0.06, grams: 250, leftShare: 2 / 3, leftShift: 0.226, downDeg: 40, leftDeg: 45, sac: 0.003, taper: 0.45, squeeze: 0.07, squeezeLong: 0.4, beatShare: 0.3 });

/** Her diaphragm. Its domes drop `quietDrop` in a quiet breath and `deepDrop` in the deepest: MEASURED (Boussuges,
 * Gole and Blanc, "Diaphragmatic motion studied by M-mode ultrasonography", Chest 2009,
 * https://pubmed.ncbi.nlm.nih.gov/19017880/: in women 1.6 +- 0.3 cm in quiet breathing and 5.7 +- 1.0 cm in deep
 * breathing; https://en.wikipedia.org/wiki/Diaphragmatic_excursion: "Normal diaphragmatic excursion should be 3-5 cm, but
 * can be increased in well-conditioned persons to 7-8 cm"). "Its right half is higher up to the left half, since the
 * large liver rests beneath the right half"; it rises from "L1-L3, the xiphoid process, 6-12th rib and their costal
 * cartilages" (BIOLOGICAL SHAPE, https://en.wikipedia.org/wiki/Thoracic_diaphragm): `rightHigher`, by about a rib-space;
 * at the end of a quiet breath out the right dome stands a little above where her xiphoid joins her breastbone's body
 * (about her sixth rib in front), `domeUp` of her breastbone's whole length above its bottom tip (GAME TUNING within
 * that: 5 cm above the tip of her 19 cm breastbone as laid in v2, level with her T9/T10 disc); the central part `centralBelow` under the left dome, and, held by her heart's sac, dropping only
 * `centralShare` as far as the domes; its rim at the tip of her breastbone in front and `backBelow` lower at her back
 * (her twelfth rib). GAME TUNING (the sheet's shape): `rimPower`, how soon the rim falls from front to back round her
 * sides; `steep`, how steeply it rises inside her ribs before it flattens to the domes; each dome's middle `domeOut` of
 * her chest's half-width off her midline, `domeWide` and `domeDeep` of its half-width and half-depth across; `leastDome`,
 * the least it stays above its rim at her back however deep the breath; `rimInset`, its rim just inside her ribs. */
export const DIAPHRAGM = Object.freeze({ quietDrop: 0.016, deepDrop: 0.057, rightHigher: 0.015, domeUp: 0.27, centralBelow: 0.012, centralShare: 0.7, backBelow: 0.03, rimPower: 2, steep: 7, domeOut: 0.52, domeWide: 0.34, domeDeep: 0.6, leastDome: 0.015, rimInset: 0.001 });

/** Her breathing at rest: "the typical respiratory rate for a healthy adult at rest is 12-15 breaths per minute", "around
 * two seconds for an inhalation and three seconds exhalation" (MEASURED, https://en.wikipedia.org/wiki/Respiratory_rate):
 * so breathing in takes `inShare` of a breath. `most`: the deepest `breath` laid, in quiet breaths' drops of the
 * diaphragm (`DIAPHRAGM.deepDrop / quietDrop`, MEASURED above). */
export const BREATH = Object.freeze({ restPerMinute: [12, 15] as const, perMinute: 14, inShare: 0.4, most: 3.5 });
/** Her pulse at rest: "The adult resting heart rate ranges from 60 to 100 bpm", "close to 72 beats per minute"
 * (MEASURED, https://en.wikipedia.org/wiki/Heart); 70 here. */
export const PULSE = Object.freeze({ restPerMinute: [60, 100] as const, perMinute: 70 });

/** One level slice of the INSIDE of her rib cage (rest metres): at height `y`, the x of its inner wall on her left and
 * on her right, the z of its inner front (her breastbone, her ribs) and of its inner back (her ribs beside her spine). */
export interface ThoraxSection { readonly y: number; readonly left: number; readonly right: number; readonly front: number; readonly back: number }
/** What the layout needs of her rib cage, measured from her bones (`measureThorax`). */
export interface ThoraxLandmarks {
  /** the inside of her rib cage, slice by slice from its bottom to its top */
  readonly sections: readonly ThoraxSection[];
  /** [height, forward] of the front of her spine's bodies (rest metres), as `TorsoLandmarks.spineFront` */
  readonly spineFront: readonly (readonly [number, number])[];
  /** the bottom tip of her breastbone */
  readonly xiphoid: P3;
  /** the top of her breastbone (its jugular notch) */
  readonly sternumTop: P3;
  /** the height of the top of her lungs: about her first rib */
  readonly apex: number;
}

/** How her bones are read. GAME TUNING (of the measuring, not of her), metres: the height of one `slice`; a `rib`'s
 * thickness, taken off the bones' outer extent to give the inner wall; within `midline` of her middle is her spine (and,
 * ahead of it, her breastbone, within `strip` and in the front `frontShare` of the slice's depth), parted from each other
 * by a `gap` at least this deep with no bone in it; `trim`, the share of a slice's points left out at each end of an
 * extent (a stray point is not a wall); a slice needs `least` points, and is the inside of her rib cage only while it is
 * `leastWidth` across and `leastDepth` deep inside. Her breastbone is followed up from its tip slice by slice while its
 * front steps back no more than `jump` a slice and stays `sternumAhead` in front of her spine's front in the slice
 * below; it is at least `sternumLeast` and at most `sternumMost` long (an adult's breastbone, manubrium to xiphoid, is
 * about 17 cm: bounds well either side of that). A slice whose front wall is not `frontAhead` in front of her spine's
 * front is no slice of her rib cage; a wall standing more than `leak` outside the middle one of the five slices round
 * it is a stray bone's (a collarbone, a shoulder blade) and is brought back in line with the slices below and above. */
export const THORAX_MEASURE = Object.freeze({ slice: 0.01, rib: 0.006, midline: 0.025, strip: 0.02, frontShare: 0.25, gap: 0.02, trim: 0.01, least: 8, leastWidth: 0.05, leastDepth: 0.03, jump: 0.02, sternumAhead: 0.03, sternumLeast: 0.08, sternumMost: 0.24, frontAhead: 0.01, leak: 0.005 });
export type ThoraxMeasureTune = { readonly [K in keyof typeof THORAX_MEASURE]: number };
export class ThoraxMeasureError extends Error {}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, Number.isFinite(x) ? x : a));
/** A line of [height, value] at a height: its lowest or highest beyond its ends; -Infinity with none. */
function lineAt(s: readonly (readonly number[])[], y: number): number {
  if (!s.length) return -Infinity;
  if (y <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) if (y <= s[i][0]) { const a = s[i - 1], b = s[i], k = (y - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; }
  return s[s.length - 1][1];
}

/**
 * HER RIB CAGE'S SLICES MADE SOUND (what `measureThorax` does to them last; a saved set can be put through it again):
 * a slice whose front wall is at or behind the front of her spine is dropped (above her first ribs a slice is her neck,
 * not her chest), and a wall that stands out past the slices round it -- a point of her collarbone or her shoulder
 * blade taken with her ribs -- is brought back in between the sound walls next below and above it.
 */
export function soundSections(sections: readonly ThoraxSection[], spineFront: readonly (readonly number[])[], opts: Partial<ThoraxMeasureTune> = {}): ThoraxSection[] {
  const M: ThoraxMeasureTune = { ...THORAX_MEASURE, ...opts }, kept = sections.filter((s) => s.front - lineAt(spineFront, s.y) >= M.frontAhead && s.front - s.back >= M.leastDepth && s.left - s.right >= M.leastWidth);
  /** one wall up her (`out` +1 if further out is more, -1 if less): each that stands more than `leak` outside the middle
   * one of the five round it set on the line between the nearest that do not, below and above */
  const wall = (of: (s: ThoraxSection) => number, out: 1 | -1): number[] => {
    const own = kept.map((s) => out * of(s)), stray = own.map((v, k) => { const round = own.slice(Math.max(0, k - 2), k + 3).sort((a, b) => a - b); return v - round[(round.length - 1) >> 1] > M.leak; });
    return own.map((v, k) => {
      if (!stray[k]) return out * v;
      let lo = k - 1, hi = k + 1;
      while (lo >= 0 && stray[lo]) lo--;
      while (hi < own.length && stray[hi]) hi++;
      if (lo < 0 && hi >= own.length) return out * v;
      if (lo < 0 || hi >= own.length) return out * own[lo < 0 ? hi : lo];
      return out * (own[lo] + ((own[hi] - own[lo]) * (kept[k].y - kept[lo].y)) / (kept[hi].y - kept[lo].y));
    });
  };
  const left = wall((q) => q.left, 1), right = wall((q) => q.right, -1), front = wall((q) => q.front, 1), back = wall((q) => q.back, -1);
  return kept.map((s, k) => ({ y: s.y, left: left[k], right: right[k], front: front[k], back: back[k] }));
}

/**
 * THE INSIDE OF HER RIB CAGE, MEASURED ON HER BONES: from the points of her ribs, her breastbone and her thoracic spine
 * (x, y, z triples, rest metres -- the bones' surfaces; her neck's bones above them, or a stray point of her collarbones
 * or shoulder blades, may be among them), slice by slice up her:
 *  - its inner walls: the bones' extent left, right and front, and the back of her ribs beside her spine, each less a
 *    rib's thickness (`soundSections`);
 *  - her breastbone: the bone on her midline at her front, parted from her spine by the hollow of her chest, followed up
 *    slice by slice from its tip for as long as it runs on unbroken in front of her spine (a vertebra of her neck, cut
 *    in two by its own hollow, is not it) -- its lowest point her xiphoid, its highest her jugular notch;
 *  - the front of her spine: the most forward point of the bone on her midline that is not her breastbone (a slice at a
 *    disc, where no body is cut, takes it from the bodies either side);
 *  - the top of her lungs: the highest sound slice of her rib cage.
 * Her midline is the points' mean x.
 */
export function measureThorax(points: ArrayLike<number>, opts: Partial<ThoraxMeasureTune> = {}): ThoraxLandmarks {
  const M: ThoraxMeasureTune = { ...THORAX_MEASURE, ...opts }, all: number[] = [];
  let mid = 0, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; 3 * i + 2 < points.length; i++) {
    if (!Number.isFinite(points[3 * i] + points[3 * i + 1] + points[3 * i + 2])) continue;
    all.push(i); mid += points[3 * i]; y0 = Math.min(y0, points[3 * i + 1]); y1 = Math.max(y1, points[3 * i + 1]);
  }
  if (all.length < M.least) throw new ThoraxMeasureError('no rib cage to measure');
  mid /= all.length;
  const count = Math.max(1, Math.ceil((y1 - y0) / M.slice)), slices: number[][] = Array.from({ length: count }, () => []);
  for (const i of all) slices[Math.min(count - 1, Math.floor((points[3 * i + 1] - y0) / M.slice))].push(i);
  /** the value `share` of the way up a sorted list */
  const at = (v: number[], share: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(share * (v.length - 1))))];
  const up = (a: number, b: number) => a - b;
  // each slice: its walls; and her midline's bone in it, back to front -- behind its widest hollow (if it has one) the
  // `spine`, in front of it `fore` (her breastbone, or the body of a vertebra hollow behind), and of that what could be
  // her breastbone (`chest`: its front, its lowest point and its highest)
  const walls: ThoraxSection[] = [], spine: number[] = new Array(count).fill(NaN), fore: number[] = new Array(count).fill(NaN);
  const chest: ({ z: number; low: P3; high: P3 } | null)[] = new Array(count).fill(null);
  for (let k = 0; k < count; k++) {
    const ids = slices[k];
    if (ids.length < M.least) continue;
    const xs: number[] = [], zs: number[] = [], beside: number[] = [], middle: number[] = [];
    let onLeft = 0, onRight = 0;
    for (const i of ids) {
      const x = points[3 * i], z = points[3 * i + 2];
      xs.push(x); zs.push(z);
      if (Math.abs(x - mid) > M.midline) { beside.push(z); if (x > mid) onLeft++; else onRight++; } else middle.push(i);
    }
    xs.sort(up); zs.sort(up); beside.sort(up);
    middle.sort((a, b) => points[3 * a + 2] - points[3 * b + 2]);
    let cut = middle.length, widest: number = M.gap;
    for (let j = 1; j < middle.length; j++) { const g = points[3 * middle[j] + 2] - points[3 * middle[j - 1] + 2]; if (g > widest) { widest = g; cut = j; } }
    if (cut > 0) spine[k] = points[3 * middle[cut - 1] + 2];
    if (cut < middle.length) fore[k] = points[3 * middle[middle.length - 1] + 2];
    const ahead = zs[zs.length - 1] - M.frontShare * (zs[zs.length - 1] - zs[0]);
    let low: P3 | null = null, high: P3 | null = null, most = -Infinity;
    for (let j = cut; j < middle.length; j++) {
      const i = middle[j], x = points[3 * i], y = points[3 * i + 1], z = points[3 * i + 2];
      if (Math.abs(x - mid) > M.strip || z < ahead) continue;
      most = Math.max(most, z);
      if (!low || y < low[1]) low = [mid, y, z];
      if (!high || y > high[1]) high = [mid, y, z];
    }
    if (low && high) chest[k] = { z: most, low, high };
    // the inside of her rib cage here, while there are ribs on both her sides
    if (onLeft && onRight) walls.push({ y: y0 + (k + 0.5) * M.slice, left: at(xs, 1 - M.trim) - M.rib, right: at(xs, M.trim) + M.rib, front: at(zs, 1 - M.trim) - M.rib, back: at(beside, M.trim) + M.rib });
  }
  // her breastbone: the longest run of slices one above the next in which it goes on up unbroken -- its front never
  // stepping back more than `jump`, and well in front of her spine's front in the slice below
  let run: [number, number] | null = null;
  for (let k = 0; k < count; k++) {
    if (!chest[k]) continue;
    let j = k, behind = spine[k];
    while (j + 1 < count && (j + 2 - k) * M.slice <= M.sternumMost) {
      const next = chest[j + 1];
      if (!next || next.z < chest[j]!.z - M.jump || next.z - behind < M.sternumAhead) break;
      j++; if (Number.isFinite(spine[j])) behind = spine[j];
    }
    if (!run || j - k > run[1] - run[0]) run = [k, j];
    k = j;
  }
  if (!run || (run[1] - run[0] + 1) * M.slice < M.sternumLeast) throw new ThoraxMeasureError('no breastbone on her midline');
  const xiphoid = chest[run[0]]!.low, top = chest[run[1]]!.high;
  // the front of her spine: above and below her breastbone, what stands in front of a hollow on her midline and is not
  // well in front of her spine in the slice before it is a vertebra's body (going on from her breastbone's ends); then
  // each slice the most forward of its own and its neighbours' (it bridges the discs)
  for (const step of [1, -1]) {
    let behind = NaN;
    for (let k = step > 0 ? run[0] : run[1]; k >= 0 && k < count; k += step) {
      if ((k < run[0] || k > run[1]) && Number.isFinite(fore[k]) && !(fore[k] - behind >= M.sternumAhead)) spine[k] = fore[k];
      if (Number.isFinite(spine[k])) behind = spine[k];
    }
  }
  const spineFront: [number, number][] = [];
  for (let k = 0; k < count; k++) {
    let z = -Infinity;
    for (let j = Math.max(0, k - 1); j <= Math.min(count - 1, k + 1); j++) if (Number.isFinite(spine[j])) z = Math.max(z, spine[j]);
    if (Number.isFinite(z) && Number.isFinite(spine[k])) spineFront.push([y0 + (k + 0.5) * M.slice, z]);
  }
  const sections = soundSections(walls, spineFront, M);
  if (sections.length < 4) throw new ThoraxMeasureError(`found ${sections.length} slices of a rib cage, not enough to lay her chest in`);
  return { sections, spineFront, xiphoid, sternumTop: top, apex: sections[sections.length - 1].y };
}

/** The inside of her rib cage at a height: between the slices either side of it (the lowest or highest beyond them). */
export function sectionAt(t: ThoraxLandmarks, y: number): ThoraxSection {
  const s = t.sections, n = s.length;
  if (y <= s[0].y) return s[0];
  if (y >= s[n - 1].y) return s[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m].y <= y) lo = m; else hi = m; }
  const a = s[lo], b = s[hi], k = (y - a.y) / (b.y - a.y);
  return { y, left: a.left + (b.left - a.left) * k, right: a.right + (b.right - a.right) * k, front: a.front + (b.front - a.front) * k, back: a.back + (b.back - a.back) * k };
}
/** The front of her spine at a height (rest metres): the lowest or highest measured beyond them; -Infinity with none. */
export function thoraxSpineAt(t: ThoraxLandmarks, y: number): number { return lineAt(t.spineFront, y); }

// HER RIB CAGE'S WALL AT A HEIGHT is drawn as the ellipse inside its slice's four walls, `inset` in from them: the least
// a chest is (a real one is fuller at its corners), so what is kept inside it is inside her bones. BIOLOGICAL SHAPE.
/** How far from (x, z) along (cos, sin) to that wall; next to nothing from outside it. */
function reach(s: ThoraxSection, inset: number, x: number, z: number, cos: number, sin: number): number {
  const A = Math.max(1e-4, (s.left - s.right) / 2 - inset), B = Math.max(1e-4, (s.front - s.back) / 2 - inset);
  const px = (x - (s.left + s.right) / 2) / A, pz = (z - (s.front + s.back) / 2) / B, dx = cos / A, dz = sin / B;
  const a = dx * dx + dz * dz, b = px * dx + pz * dz, c = px * px + pz * pz - 1;
  return c >= 0 ? 1e-4 : (-b + Math.sqrt(b * b - a * c)) / a;
}
/** (x, z) brought inside that wall: drawn in toward its middle if it is beyond it. */
function withinWalls(s: ThoraxSection, inset: number, x: number, z: number): [number, number] {
  const A = Math.max(1e-4, (s.left - s.right) / 2 - inset), B = Math.max(1e-4, (s.front - s.back) / 2 - inset), cx = (s.left + s.right) / 2, cz = (s.front + s.back) / 2;
  const e = ((x - cx) / A) ** 2 + ((z - cz) / B) ** 2;
  if (e <= 1) return [x, z];
  const k = 1 / Math.sqrt(e);
  return [cx + (x - cx) * k, cz + (z - cz) * k];
}
/** That wall's front (its z) at x. */
function frontWallAt(s: ThoraxSection, inset: number, x: number): number {
  const A = Math.max(1e-4, (s.left - s.right) / 2 - inset), B = Math.max(1e-4, (s.front - s.back) / 2 - inset), u = (x - (s.left + s.right) / 2) / A;
  return (s.front + s.back) / 2 + B * Math.sqrt(Math.max(0, 1 - u * u));
}

/** One dome of her diaphragm: its middle (x, z), its top's height, how far it rises over the sheet between the domes,
 * and its half-sizes across and front to back. */
export interface Dome { readonly x: number; readonly z: number; readonly top: number; readonly rise: number; readonly wide: number; readonly deep: number }
export interface DiaphragmLay {
  /** the upright line it is laid round: her midline, at the middle of her chest's depth at her xiphoid [x, z] */
  readonly centre: readonly [number, number];
  /** its rim's height at her front (her xiphoid) and at her back */
  readonly rimFront: number;
  readonly rimBack: number;
  /** the sheet's height at its middle before the domes are raised on it, and with them (what her heart rests on) */
  readonly floor: number;
  readonly central: number;
  /** her left dome, her right dome */
  readonly domes: readonly [Dome, Dome];
  /** how far the domes have dropped from the end of a quiet breath out, metres */
  readonly drop: number;
}
export interface HeartLay {
  readonly centre: P3;
  /** half its length, its width and its thickness */
  readonly radii: P3;
  /** its long axis (base to apex: down, forward and to her left), its width's and its thickness's */
  readonly axes: readonly [P3, P3, P3];
  /** how far it reaches from its middle across her, up and down, and front to back */
  readonly reach: P3;
  /** its point, and the middle of its base */
  readonly apex: P3;
  readonly base: P3;
}
export interface LungLay {
  /** +1 her left lung, -1 her right */
  readonly side: -1 | 1;
  /** how far its inner face stands off her midline beside her heart */
  readonly face: number;
  /** the height of its top */
  readonly top: number;
}
export interface ThoraxLayout {
  readonly thorax: ThoraxLandmarks;
  /** 0 the end of a quiet breath out .. 1 the end of a quiet breath in .. `BREATH.most` the deepest */
  readonly breath: number;
  /** her midline's x */
  readonly mid: number;
  /** the gap between her lungs and her ribs now */
  readonly gap: number;
  readonly diaphragm: DiaphragmLay;
  readonly heart: HeartLay;
  /** her left lung, her right lung */
  readonly lungs: readonly [LungLay, LungLay];
}

/** Her diaphragm's rim toward (cos, sin) from its middle: its height there, and how far out it is (on her ribs). */
function rimAt(t: ThoraxLandmarks, d: DiaphragmLay, cos: number, sin: number): [number, number] {
  const y = d.rimBack + (d.rimFront - d.rimBack) * ((1 + sin) / 2) ** DIAPHRAGM.rimPower;
  return [y, reach(sectionAt(t, y), DIAPHRAGM.rimInset, d.centre[0], d.centre[1], cos, sin)];
}
/** The sheet between the domes at (x, z): its height, and how much of a dome's rise shows there (1 at its middle, 0 at its rim). */
function between(t: ThoraxLandmarks, d: DiaphragmLay, x: number, z: number): [number, number] {
  const dx = x - d.centre[0], dz = z - d.centre[1], r = Math.hypot(dx, dz);
  if (r < 1e-9) return [d.floor, 1];
  const [rim, out] = rimAt(t, d, dx / r, dz / r), k = 1 - Math.min(1, r / out) ** DIAPHRAGM.steep;
  return [rim + (d.floor - rim) * k, k];
}
function sheet(t: ThoraxLandmarks, d: DiaphragmLay, x: number, z: number): number {
  const [base, k] = between(t, d, x, z);
  let y = base;
  for (const m of d.domes) y += m.rise * k * Math.exp(-(((x - m.x) / m.wide) ** 2) - ((z - m.z) / m.deep) ** 2);
  return y;
}
/** HER DIAPHRAGM'S HEIGHT at (x, z) (rest metres): its rim's beyond its rim. */
export function diaphragmAt(L: ThoraxLayout, x: number, z: number): number { return sheet(L.thorax, L.diaphragm, x, z); }

/** Whether (x, y, z) lies in her heart (its ellipsoid, `grow` metres bigger all round). */
export function insideHeart(L: ThoraxLayout, x: number, y: number, z: number, grow = 0): boolean {
  const h = L.heart, d = [x - h.centre[0], y - h.centre[1], z - h.centre[2]];
  let e = 0;
  for (let k = 0; k < 3; k++) e += ((d[0] * h.axes[k][0] + d[1] * h.axes[k][1] + d[2] * h.axes[k][2]) / (h.radii[k] + grow)) ** 2;
  return e < 1;
}
/** x moved sideways (her `side`'s way) out of her heart grown by `grow`: where it leaves it at that height and depth. */
function besideHeart(h: HeartLay, x: number, y: number, z: number, side: -1 | 1, grow: number): number {
  let qq = 0, qd = 0, dd = 0;
  for (let k = 0; k < 3; k++) {
    const r = h.radii[k] + grow, q = ((x - h.centre[0]) * h.axes[k][0] + (y - h.centre[1]) * h.axes[k][1] + (z - h.centre[2]) * h.axes[k][2]) / r, d = (side * h.axes[k][0]) / r;
    qq += q * q; qd += q * d; dd += d * d;
  }
  return qq >= 1 ? x : x + side * ((-qd + Math.sqrt(qd * qd - dd * (qq - 1))) / dd);
}
/** Her lung's inner face (its x) at a height: off her midline by its `face` beside her heart, easing in to
 * `LUNGS.faceTop` at its top above her heart (her lungs' upper parts come nearer each other). */
export function lungFaceAt(L: ThoraxLayout, side: -1 | 1, y: number): number {
  const lung = L.lungs[side > 0 ? 0 : 1], over = L.heart.centre[1] + L.heart.reach[1], u = clamp((y - over) / Math.max(1e-3, lung.top - over), 0, 1);
  return L.mid + side * (lung.face + (LUNGS.faceTop - lung.face) * u * u * (3 - 2 * u));
}

/**
 * HER CHEST LAID OUT at `breath`: 0 the end of a quiet breath out, 1 the end of a quiet breath in, and on to
 * `BREATH.most` for the deepest breath (beyond it, and below 0, held there). Her diaphragm's domes drop
 * `DIAPHRAGM.quietDrop` a quiet breath and its central part less; her heart rides down on it; her lungs follow it down
 * and take up the gap left for her ribs' swing (`lungMesh`).
 */
export function layThorax(t: ThoraxLandmarks, breath = 0): ThoraxLayout {
  const D = DIAPHRAGM, H = HEART, b = clamp(breath, 0, BREATH.most), mid = t.xiphoid[0];
  // her diaphragm: its rim, and its domes this share of her breastbone's length above its tip, dropped by her breath
  const rimFront = t.xiphoid[1], rimBack = Math.max(t.sections[0].y, rimFront - D.backBelow), least = rimBack + D.leastDome;
  const at = sectionAt(t, rimFront), cz = (at.front + at.back) / 2, halfW = (at.left - at.right) / 2, halfD = (at.front - at.back) / 2;
  const drop = D.quietDrop * b, high = rimFront + D.domeUp * Math.max(0.05, t.sternumTop[1] - rimFront);
  const floor = Math.max(least, high - D.rightHigher - D.centralBelow - drop * D.centralShare);
  const bare: DiaphragmLay = { centre: [mid, cz], rimFront, rimBack, floor, central: floor, domes: [{ x: 0, z: 0, top: 0, rise: 0, wide: 1, deep: 1 }, { x: 0, z: 0, top: 0, rise: 0, wide: 1, deep: 1 }], drop };
  const dome = (side: -1 | 1, top: number): Dome => {
    const x = mid + side * D.domeOut * halfW, [base, k] = between(t, bare, x, cz), rise = Math.max(0, (Math.max(floor, top) - base) / Math.max(0.05, k));
    return { x, z: cz, top: base + rise * k, rise, wide: D.domeWide * halfW, deep: D.domeDeep * halfD };
  };
  const domed: DiaphragmLay = { ...bare, domes: [dome(1, high - D.rightHigher - drop), dome(-1, high - drop)] };
  const diaphragm: DiaphragmLay = { ...domed, central: sheet(t, domed, mid, cz) };
  // her heart: its long axis down, forward and to her left; its width across it in the plane of her chest's front
  const rad = Math.PI / 180, cd = Math.cos(H.downDeg * rad), a: P3 = [cd * Math.sin(H.leftDeg * rad), -Math.sin(H.downDeg * rad), cd * Math.cos(H.leftDeg * rad)];
  const wl = Math.hypot(a[0], a[1]) || 1, w: P3 = [a[1] / wl, -a[0] / wl, 0], th: P3 = [a[1] * w[2] - a[2] * w[1], a[2] * w[0] - a[0] * w[2], a[0] * w[1] - a[1] * w[0]];
  const axes: [P3, P3, P3] = [a, w, th], radii: P3 = [H.length / 2, H.width / 2, H.thickness / 2];
  const span = (i: number) => Math.hypot(radii[0] * axes[0][i], radii[1] * axes[1][i], radii[2] * axes[2][i]), far: P3 = [span(0), span(1), span(2)];
  const hx = mid + H.leftShift * far[0];
  // (points over it, from its middle: it is set back behind her breastbone and ribs, then down on her diaphragm, a `sac` off each)
  const over: P3[] = [];
  for (let i = 0; i <= 8; i++) for (let j = 0; j < (i % 8 ? 12 : 1); j++) {
    const p = (Math.PI * i) / 8, q = (2 * Math.PI * j) / 12, u = [Math.cos(p), Math.sin(p) * Math.cos(q), Math.sin(p) * Math.sin(q)];
    over.push([0, 1, 2].map((c) => axes[0][c] * radii[0] * u[0] + axes[1][c] * radii[1] * u[1] + axes[2][c] * radii[2] * u[2]) as unknown as P3);
  }
  let hy = diaphragm.central + far[1], hz = cz;
  for (let pass = 0; pass < 2; pass++) {
    hz = Infinity; for (const o of over) hz = Math.min(hz, frontWallAt(sectionAt(t, hy + o[1]), H.sac, hx + o[0]) - o[2]);
    hy = -Infinity; for (const o of over) hy = Math.max(hy, sheet(t, diaphragm, hx + o[0], hz + o[2]) + H.sac - o[1]);
  }
  const centre: P3 = [hx, hy, hz], end = (k: number): P3 => [hx + a[0] * radii[0] * k, hy + a[1] * radii[0] * k, hz + a[2] * radii[0] * k];
  const heart: HeartLay = { centre, radii, axes, reach: far, apex: end(1), base: end(-1) };
  // her lungs: each up to the highest slice with room for it beside the middle of her chest
  const gap = LUNGS.pleura + LUNGS.ribSwing * (1 - Math.min(1, b));
  const lung = (side: -1 | 1): LungLay => {
    let top = t.sections[0].y;
    for (let k = t.sections.length - 1; k >= 0; k--) {
      const s = t.sections[k];
      if (side * (side > 0 ? s.left - mid : s.right - mid) - gap - LUNGS.faceTop >= LUNGS.leastRoom && (s.front - s.back) / 2 - gap >= LUNGS.leastRoom) { top = s.y; break; }
    }
    return { side, face: side > 0 ? LUNGS.faceLeft : LUNGS.faceRight, top: Math.min(t.apex, top) };
  };
  return { thorax: t, breath: b, mid, gap, diaphragm, heart, lungs: [lung(1), lung(-1)] };
}

/** How her lungs', heart's and diaphragm's meshes are cut: points round and rows up. GAME TUNING (a few hundred points
 * each, the same count and the same triangles whatever her breath, so a view rewrites their places and nothing else:
 * `lungPoints`, `heartPoints`, `diaphragmPoints` into its own arrays). */
export const THORAX_MESH = Object.freeze({ lungRing: 24, lungRows: 15, lungBase: 5, heartRows: 14, heartCols: 20, diaphragmSpokes: 32, diaphragmRings: 12 });
/** The triangles of `rows` rings of `cols` points, each ring joined to the next (`turned`: wound the other way). */
function ringsTriangles(rows: number, cols: number, turned = false): Uint32Array {
  const tris = new Uint32Array(6 * (rows - 1) * cols);
  let n = 0;
  for (let i = 0; i + 1 < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * cols + j, b = i * cols + ((j + 1) % cols), c = a + cols, d = b + cols;
    if (turned) { tris[n++] = a; tris[n++] = c; tris[n++] = b; tris[n++] = b; tris[n++] = c; tris[n++] = d; } else { tris[n++] = a; tris[n++] = b; tris[n++] = c; tris[n++] = b; tris[n++] = d; tris[n++] = c; }
  }
  return tris;
}

/**
 * ONE OF HER LUNGS (`side` +1 her left, -1 her right): a shape swept up her rib cage. At each height its outline is
 * what her ribs leave it there -- out to her rib cage's wall less the gap, in to its flat inner face, the corner between
 * them rounded -- drawn in over its top `LUNGS.capShare` to a rounded apex. Its base is hollow: it lies on the dome of
 * the diaphragm under it. Then each point is moved sideways out of her heart (the left lung's cardiac notch), kept off
 * her spine, within her ribs at its own height, and on or above her diaphragm. Its points, into `out` if given.
 */
export function lungPoints(L: ThoraxLayout, side: -1 | 1, out?: Float32Array): Float32Array {
  const t = L.thorax, lung = L.lungs[side > 0 ? 0 : 1], gap = L.gap, G = THORAX_MESH, ring = G.lungRing, rows = G.lungRows, base = G.lungBase;
  const pts = out && out.length === 3 * ring * (base + rows) ? out : new Float32Array(3 * ring * (base + rows)), offSpine = LUNGS.spineHalf + LUNGS.pleura;
  let n = 0;
  /** its outline at height y toward (cos, sin) from its own middle there, `k` of the way out: [x, z] */
  const outline = (y: number, cos: number, sin: number, k: number): [number, number] => {
    const s = sectionAt(t, y), wall = (s.left + s.right) / 2 + side * ((s.left - s.right) / 2 - gap), face = lungFaceAt(L, side, y);
    const half = Math.max(1e-4, (side * (wall - face)) / 2), x = face + side * half, z = (s.front + s.back) / 2;
    const toRibs = reach(s, gap, x, z, cos, sin), inward = -side * cos, toFace = inward > 1e-6 ? half / inward : Infinity;
    const r = (toRibs ** -LUNGS.corner + toFace ** -LUNGS.corner) ** (-1 / LUNGS.corner) * k;
    return [x + cos * r, z + sin * r];
  };
  // (nothing of her diaphragm is higher than this: a point above it is not asked where her diaphragm is)
  const d = L.diaphragm, off = LUNGS.pleura, ceiling = Math.max(d.floor, d.rimFront) + d.domes[0].rise + d.domes[1].rise + off;
  const put = (x: number, y: number, z: number, onBase: boolean): void => {
    // (twice, if the first time moved it: one move can undo another a little)
    for (let pass = 0; pass < 2; pass++) {
      const x0 = x, y0 = y, z0 = z;
      x = besideHeart(L.heart, x, y, z, side, off);
      if (side * (x - L.mid) < offSpine && z < thoraxSpineAt(t, y) + off) x = L.mid + side * offSpine;
      if (onBase || y < ceiling) { const under = diaphragmAt(L, x, z) + off; if (onBase || y < under) y = under; }
      [x, z] = withinWalls(sectionAt(t, y), gap, x, z);
      if (x === x0 && y === y0 && z === z0) break;
    }
    pts[n++] = x; pts[n++] = y; pts[n++] = z;
  };
  // where its base's edge lies, round it: on the diaphragm under its own outline (found by going round twice)
  const cosines: number[] = [], sines: number[] = [], foot: number[] = [];
  for (let j = 0; j < ring; j++) {
    const c = Math.cos((2 * Math.PI * j) / ring), s = Math.sin((2 * Math.PI * j) / ring);
    let y = L.diaphragm.rimFront;
    for (let pass = 0; pass < 3; pass++) { const [x, z] = outline(y, c, s, 1); y = Math.min(lung.top - 0.01, diaphragmAt(L, x, z) + LUNGS.pleura); }
    cosines.push(c); sines.push(s); foot.push(y);
  }
  // its hollow base, from its middle out to its edge
  for (let i = 0; i < base; i++) for (let j = 0; j < ring; j++) { const [x, z] = outline(foot[j], cosines[j], sines[j], Math.max(1e-3, i / base)); put(x, foot[j], z, true); }
  // its sides, from its base's edge up to its apex (rows closer together toward the top, where it rounds in)
  for (let i = 0; i < rows; i++) {
    const u = i / (rows - 1), up = 1 - (1 - u) ** 1.5, over = Math.max(0, (up - (1 - LUNGS.capShare)) / LUNGS.capShare), k = Math.max(1e-3, Math.sqrt(Math.max(0, 1 - over * over)));
    for (let j = 0; j < ring; j++) { const y = foot[j] + (lung.top - gap - foot[j]) * up, [x, z] = outline(y, cosines[j], sines[j], k); put(x, y, z, i === 0); }
  }
  return pts;
}
/** One of her lungs as a mesh (its triangles wound to face outward, as her other organs' are: its base's rings run from
 * its middle out). */
export function lungMesh(L: ThoraxLayout, side: -1 | 1): OrganMesh {
  return { points: lungPoints(L, side), triangles: ringsTriangles(THORAX_MESH.lungBase + THORAX_MESH.lungRows, THORAX_MESH.lungRing, true) };
}

/** HER HEART: its ellipsoid narrowed over its apex half to a blunt teardrop; at `beat` 0 slack .. 1 the height of a
 * beat it is drawn in by `HEART.squeeze` across and less along (toward its middle). Its points, into `out` if given. */
export function heartPoints(L: ThoraxLayout, beat = 0, out?: Float32Array): Float32Array {
  const h = L.heart, G = THORAX_MESH, rows = G.heartRows, cols = G.heartCols, s = clamp(beat, 0, 1) * HEART.squeeze, across = 1 - s, along = 1 - s * HEART.squeezeLong;
  const pts = out && out.length === 3 * (rows + 1) * cols ? out : new Float32Array(3 * (rows + 1) * cols);
  let n = 0;
  for (let i = 0; i <= rows; i++) {
    const p = (Math.PI * i) / rows, u = -Math.cos(p), r = Math.sin(p) * (1 - HEART.taper * Math.max(0, u) ** 2) * across;
    for (let j = 0; j < cols; j++) {
      const q = (2 * Math.PI * j) / cols, l0 = h.radii[0] * u * along, l1 = h.radii[1] * r * Math.cos(q), l2 = h.radii[2] * r * Math.sin(q);
      for (let c = 0; c < 3; c++) pts[n++] = h.centre[c] + h.axes[0][c] * l0 + h.axes[1][c] * l1 + h.axes[2][c] * l2;
    }
  }
  return pts;
}
export function heartMesh(L: ThoraxLayout, beat = 0): OrganMesh {
  return { points: heartPoints(L, beat), triangles: ringsTriangles(THORAX_MESH.heartRows + 1, THORAX_MESH.heartCols) };
}

/** HER DIAPHRAGM: a thin sheet from its middle out to its rim on her ribs (rings closer together toward the rim, where
 * it is steep). Its points, into `out` if given. */
export function diaphragmPoints(L: ThoraxLayout, out?: Float32Array): Float32Array {
  const t = L.thorax, d = L.diaphragm, G = THORAX_MESH, spokes = G.diaphragmSpokes, rings = G.diaphragmRings;
  const pts = out && out.length === 3 * (rings + 1) * spokes ? out : new Float32Array(3 * (rings + 1) * spokes);
  let n = 0;
  for (let i = 0; i <= rings; i++) {
    const k = Math.max(1e-3, 1 - (1 - i / rings) ** 1.4);
    for (let j = 0; j < spokes; j++) {
      const c = Math.cos((2 * Math.PI * j) / spokes), s = Math.sin((2 * Math.PI * j) / spokes), [, far] = rimAt(t, d, c, s), x = d.centre[0] + c * far * k, z = d.centre[1] + s * far * k;
      pts[n++] = x; pts[n++] = sheet(t, d, x, z); pts[n++] = z;
    }
  }
  return pts;
}
export function diaphragmMesh(L: ThoraxLayout): OrganMesh {
  return { points: diaphragmPoints(L), triangles: ringsTriangles(THORAX_MESH.diaphragmRings + 1, THORAX_MESH.diaphragmSpokes) };
}

/** What a closed mesh holds, metres³. */
export function meshVolume(m: OrganMesh): number {
  const p = m.points, t = m.triangles;
  let v = 0;
  for (let k = 0; k + 2 < t.length; k += 3) {
    const a = 3 * t[k], b = 3 * t[k + 1], c = 3 * t[k + 2];
    v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) + p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return Math.abs(v) / 6;
}
/** What her lungs take up as laid, mL: each, and both (the air in them and their own tissue and blood: at the end of a
 * quiet breath out the air alone is `LUNGS.restMl`). */
export function lungVolume(L: ThoraxLayout): { left: number; right: number; both: number } {
  const left = meshVolume(lungMesh(L, 1)) * 1e6, right = meshVolume(lungMesh(L, -1)) * 1e6;
  return { left, right, both: left + right };
}
