/**
 * HER PELVIC ORGANS, LAID OUT AGAINST HER BONE (the skeleton-outward plan, Phase 1: "Build the womb, cervix, birth canal
 * and bladder as soft bodies hung from her pelvis bone, not pregnant first").
 *
 * Built in code from measured sizes, placed from the landmarks her own pelvis was measured with (actor/pelvisMeasure.ts,
 * src/data/pelvis/), on her midline, in her rest frame (metres, +y up, +z her front, +x across her):
 *
 *  - THE BIRTH CANAL (vagina): from its opening, under and behind the lower edge of the symphysis, up and back to its
 *    top at the ischial spines' plane (the midpelvis, where the cervix comes in); its front wall about 7.5 cm, its back
 *    wall about 9 cm. Collapsed it is a flattened tube, an H across: as wide as VAGINA.width, as deep as VAGINA.depth.
 *  - THE WOMB (uterus) WITH ITS CERVIX: 7.6 x 4.5 x 3.0 cm and about 60 g, not pregnant. Its vaginal part, the cervix,
 *    never below the interspinal line, so its outer opening (external os) sits just below the canal's top, in the canal.
 *    From there it rises tipped forward from the canal's line (anteverted; the vagina meets the womb at about 45 degrees
 *    standing), the cervix straight for 3 cm and the body bending a little further forward over the bladder
 *    (anteflexed). On her skeleton, whose pelvic inlet tilts about 60 degrees as a woman's does standing, its top (the
 *    fundus) rises to about the inlet's plane (0.5 cm past it).
 *  - THE BLADDER: on the pelvic floor behind the symphysis, below the womb and in front of the canal; it holds 300-500
 *    mL before the urge, and as it fills it rises behind the pubic bone and over it, and tips the womb back toward
 *    upright (30 degrees forward of the canal empty, about 17 at 400 mL) -- the womb lies on it and never in it.
 *    An upright ellipsoid, so full it stands a little taller than a real one, whose dome leans forward over the bone
 *    onto her belly's wall (at 400 mL its top 12 cm above the symphysis's).
 *
 * Every size here is MEASURED (a source in its comment) or BIOLOGICAL SHAPE (where it sits, from anatomy's description of
 * it); a shape that only makes the mesh is GAME TUNING. Pure: plain arrays.
 */
import { seatedCanal } from './birthCanal';
import type { P3 } from './pelvisMeasure';

/** What the layout needs of her measured pelvis (src/data/pelvis/<rig>.json). */
export interface PelvisLandmarks {
  /** `opening`: where her opening is in her own skin, when she has skin (v2: MEASURED on it, the middle of her opening's
   * line at rest) -- her canal runs up from there; without it, from below her pubic bone (ORGAN_PLACE). */
  readonly landmarks: { readonly symphysisTop: readonly number[]; readonly symphysisBottom: readonly number[]; readonly symphysisBack: readonly number[]; readonly promontory: readonly number[]; readonly opening?: readonly number[]; readonly tuberosityLeft?: readonly number[]; readonly tuberosityRight?: readonly number[] };
  /** her bony canal's measured centre line and how far apart her sit bones are: with them and her sit bones, her canal's
   * opening stands under her pubic arch, below her bones (actor/birthCanal.ts `seatedCanal`) */
  readonly axis?: readonly (readonly number[])[];
  readonly cm?: { readonly intertuberous?: number };
  readonly outlet?: { readonly ring: readonly (readonly number[])[] };
  /** her tailbone's tip (src/data/torso/ `landmarks.coccyx`), which her canal's wall keeps off */
  readonly tail?: readonly number[];
  /** the hollow of her sacrum (the pelvis file's `sacrum.front`): open, her canal's back wall goes back to it */
  readonly sacrum?: { readonly front: readonly (readonly number[])[] };
  readonly midpelvis: { readonly centre: readonly number[] };
  readonly inlet: { readonly centre: readonly number[] };
}

/** The womb, not pregnant: 7.6 cm long, 4.5 cm wide, 3.0 cm thick, about 60 g. MEASURED (https://en.wikipedia.org/wiki/Uterus). */
export const UTERUS = Object.freeze({ length: 0.076, width: 0.045, thickness: 0.03, grams: 60 });
/** Its cervix: about 3 cm long and 2.5 cm across, its vaginal part (portio) in the top of the canal. MEASURED
 * (https://en.wikipedia.org/wiki/Cervix: 2-4 cm long; the portio about 3 cm long and 2.5 cm wide). */
export const CERVIX = Object.freeze({ length: 0.03, width: 0.025 });
/** The canal: front wall about 7.5 cm, back wall about 9 cm (MEASURED, https://en.wikipedia.org/wiki/Vagina); collapsed, an
 * H about 2.6 cm across and 0.8 cm through its two walls (BIOLOGICAL SHAPE: walls of 3-4 mm each, touching). */
export const VAGINA = Object.freeze({ front: 0.075, back: 0.09, width: 0.026, depth: 0.008 });
/** The bladder: 300-500 mL before the urge (MEASURED, https://en.wikipedia.org/wiki/Urinary_bladder); her default, a bladder
 * emptied a while ago (GAME TUNING); its wall 3-5 mm, under 3 mm full (MEASURED, the same). */
export const BLADDER = Object.freeze({ urgeMl: [300, 500] as const, defaultMl: 60, mostMl: 600, wall: 0.004 });

/** Where they sit. BIOLOGICAL SHAPE: from anatomy's description of each, against her own landmarks. */
export const ORGAN_PLACE = Object.freeze({
  /** The canal's opening: this far below the symphysis's lower edge and this far behind it, metres. */
  introitusBelow: 0.025,
  introitusBehind: 0.02,
  /** Where her opening is measured on her own skin (`landmarks.opening`, v2), the canal's opening stands this far up into
   * her from it, metres: her doors' lips hang below the canal's opening (actor/birthDoors.ts DOORS.lip, 12 mm), and her
   * skin there is not flat, so the canal's opening stands further in than that: closed, her doors lie wholly under her
   * skin and nothing stands out of it. GAME TUNING. */
  openingInset: 0.02,
  /** The external os: this far down the canal from its top (the posterior fornix runs deeper behind the cervix), metres. */
  osBelowTop: 0.012,
  /** The womb tipped forward from the canal's line (anteversion; the vagina meets the womb at about 45 degrees standing:
   * https://en.wikipedia.org/wiki/Vagina; GAME TUNING within it, so the fundus stays near the inlet's plane over the bladder)
   * and its body bent further forward on the cervix (anteflexion), degrees. */
  anteversionDeg: 30,
  anteflexionDeg: 15,
  /** The bladder's front lies this far behind the symphysis's back face, its middle this far below the symphysis's top
   * (its base rests on the canal's upper front wall, below the womb), metres. */
  bladderGap: 0.003,
  bladderBelowTop: 0.015,
});

export interface OrganLayout {
  /** The canal, its opening to its top, along its centre line (rest metres). */
  /** `narrow`, `narrowAcross`: the share of its depth, and of its width, it keeps at even steps along its path, where her
   * bones pinch it open (actor/birthCanal.ts OPEN_SEAT); without them, all of it all along. `back`: how much deeper its
   * back half is than its front, at the same steps, where it goes back to her spine as it opens (`backOf`); without it,
   * no deeper */
  readonly vagina: { readonly path: readonly P3[]; readonly width: number; readonly depth: number; readonly narrow?: readonly number[]; readonly narrowAcross?: readonly number[]; readonly back?: readonly number[] };
  /** The womb's centre line, external os to fundus, and how far along it the cervix ends (the internal os), metres. */
  readonly uterus: {
    readonly path: readonly P3[]; readonly cervixEnds: number; readonly length: number; readonly anteversionDeg: number;
    /** The way each point of its path faces (unit), when it is grown: its rings square to these, not to the path. */
    readonly axes?: readonly P3[];
    /** Its half-sizes [across, front to back] at each point of its path, when it is grown (pregnant: actor/pregnantWomb.ts);
     * not pregnant they are `uterusHalf`'s. */
    readonly halves?: readonly (readonly [number, number])[];
  };
  /** The bladder: its centre, its half-sizes (across, up, front to back) and how much it holds. */
  readonly bladder: { readonly centre: P3; readonly radii: P3; readonly ml: number };
}

const P = (a: readonly number[]): P3 => [a[0], a[1], a[2]];
const lerp = (a: P3, b: P3, t: number): P3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dist = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A quadratic curve from a through c to b, `n` points. */
export function bend(a: P3, c: P3, b: P3, n = 24): P3[] {
  const out: P3[] = [];
  for (let k = 0; k < n; k++) { const t = k / (n - 1); out.push(lerp(lerp(a, c, t), lerp(c, b, t), t)); }
  return out;
}
/** A line's length along its points. */
export function lengthOf(path: readonly P3[]): number { let s = 0; for (let k = 1; k < path.length; k++) s += dist(path[k - 1], path[k]); return s; }
/** The point `s` metres along a line. */
export function along(path: readonly P3[], s: number): P3 {
  let left = Math.max(0, s);
  for (let k = 1; k < path.length; k++) { const d = dist(path[k - 1], path[k]); if (left <= d) return lerp(path[k - 1], path[k], d > 0 ? left / d : 0); left -= d; }
  return path[path.length - 1];
}

/** The bladder's half-sizes (across, up, front to back) holding `ml`. BIOLOGICAL SHAPE: nearly empty it lies flat behind
 * the symphysis, 6.8 x 4.0 x 2.8 cm at 40 mL; it fills mostly UPWARD, rising behind the pubic bone (13 x 12 x 5 cm at
 * 400 mL), as the room it has is above it -- each size grows as the cube root of how much it holds raised to 0.8, 1.4 and
 * 0.8, which multiply to the volume. */
export function bladderRadii(ml: number): P3 {
  const s = Math.cbrt(Math.max(5, Math.min(BLADDER.mostMl, ml)) / 40);
  return [0.034 * s ** 0.8, 0.02 * s ** 1.4, 0.014 * s ** 0.8];
}

/** Her pelvic organs laid out against her pelvis, not pregnant, her bladder holding `bladderMl`. */
export function layOrgans(p: PelvisLandmarks, bladderMl: number = BLADDER.defaultMl, at: typeof ORGAN_PLACE = ORGAN_PLACE): OrganLayout {
  const O = at, L = p.landmarks;
  const top = P(L.symphysisTop), bottom = P(L.symphysisBottom), back = P(L.symphysisBack);
  const x = top[0];
  // the canal: from its opening up and back to its top at the midpelvis, bowed a little back (its back wall the longer)
  const fornix = P(p.midpelvis.centre);
  const skinAt = L.opening ? Math.hypot(fornix[1] - L.opening[1], fornix[2] - L.opening[2]) || 1 : 1;
  const introitus: P3 = L.opening ? [x, L.opening[1] + ((fornix[1] - L.opening[1]) / skinAt) * O.openingInset, L.opening[2] + ((fornix[2] - L.opening[2]) / skinAt) * O.openingInset] : [x, bottom[1] - O.introitusBelow, bottom[2] - O.introitusBehind];
  const mid = lerp(introitus, fornix, 0.5), run = dist(introitus, fornix);
  const backward: P3 = [0, (fornix[2] - introitus[2]) / run, -(fornix[1] - introitus[1]) / run];
  // (so its front wall and back wall lie either side of a centre line as long as their mean. Laid from her skin's own
  // opening it is as long as her body gives it and straight, as her skeleton's lies: v2's skin is 5.9 cm from her
  // canal's top, and bowed out to its full length there it left her skin going straight back -- her doors, which hang
  // from its first centimetres (actor/birthDoors.ts `doorFrame`), faced her front, 66 degrees off her skeleton's)
  const want = L.opening ? 0 : (VAGINA.front + VAGINA.back) / 2;
  let bow = 0, rest = bend(introitus, mid, fornix);
  for (let k = 0; k < 40 && lengthOf(rest) < want; k++) { bow += 0.001; rest = bend(introitus, [mid[0], mid[1] + backward[1] * bow, mid[2] + backward[2] * bow], fornix); }
  // HER CANAL AS IT IS DRAWN, AND HER BABY'S WAY: on her skeleton its opening stands under her pubic arch, below her bones,
  // where the arch lets a head by, and it runs up from there onto her bony canal's measured line (actor/birthCanal.ts
  // `seatedCanal`: laid from under the symphysis its doors and its open width cut through the arch's bones). Her womb, cervix
  // and bladder stay placed from the line above, where her canal lies at rest. In v2 it still runs from her own skin.
  const vpath = (!L.opening && p.axis ? seatedCanal({ axis: p.axis, landmarks: L, cm: p.cm, outlet: p.outlet, tail: p.tail }, x, fornix)?.path : null) ?? rest;
  // the bladder: behind the symphysis, its base on the canal's upper front wall, under the womb; it rises as it fills,
  // and once its middle is above the symphysis it bulges forward over the bone's top, against her belly's wall. Between
  // the bone in front and the cervix behind (held where it is by its ligaments) it has only so much room front to back:
  // where it would reach the cervix it is narrower front to back and taller, holding the same.
  const os = along([...rest].reverse(), O.osBelowTop);
  const radii: [number, number, number] = [...bladderRadii(bladderMl)];
  const place = (): P3 => {
    const cy = top[1] - O.bladderBelowTop + radii[1];
    let cz = Infinity;
    for (let y = cy - radii[1]; y <= Math.max(back[1], top[1]); y += 0.001) {
      const k = (y - cy) / radii[1];
      if (Math.abs(k) < 1) cz = Math.min(cz, back[2] - O.bladderGap - radii[2] * Math.sqrt(1 - k * k));
    }
    return [x, cy, Number.isFinite(cz) ? cz : back[2] - O.bladderGap - radii[2]];
  };
  let centre = place();
  const cervixHalf = (): readonly [number, number] => [CERVIX.width / 2, CERVIX.width / 2];
  for (let k = 0; k < 60 && intoEllipsoid(centre, radii, [os], cervixHalf) < 1; k++) { radii[2] *= 0.97; radii[1] /= 0.97; centre = place(); }
  // the womb: from the external os, just down the canal from its top, tipped forward from the canal's line (anteverted);
  // the cervix straight, the body bending further forward (anteflexed) to the fundus. It lies on the bladder: a fuller
  // bladder tips it back toward upright, as far as it has to so the two do not overlap.
  const canal = Math.atan2(fornix[1] - introitus[1], fornix[2] - introitus[2]);
  const dir = (a: number): P3 => [0, Math.sin(a), Math.cos(a)];
  const womb = (anteversionDeg: number): P3[] => {
    const tip = canal - (anteversionDeg * Math.PI) / 180, flex = (O.anteflexionDeg * Math.PI) / 180;
    const cd = dir(tip), inner: P3 = [x, os[1] + cd[1] * CERVIX.length, os[2] + cd[2] * CERVIX.length];
    const body = UTERUS.length - CERVIX.length, upath: P3[] = [];
    for (let k = 0; k <= 8; k++) upath.push(lerp(os, inner, k / 8));
    // (the body's line turning steadily through its anteflexion: an arc)
    let at = inner;
    for (let k = 1; k <= 24; k++) { const d = dir(tip - (flex * k) / 24); at = [x, at[1] + (d[1] * body) / 24, at[2] + (d[2] * body) / 24]; upath.push(at); }
    return upath;
  };
  let anteversion = O.anteversionDeg, upath = womb(anteversion);
  const half = (t: number) => uterusHalf(t, CERVIX.length / UTERUS.length);
  while (anteversion > O.anteversionDeg - 90 && intoEllipsoid(centre, radii, upath, half) < 1) upath = womb(--anteversion);
  return {
    vagina: { path: vpath, width: VAGINA.width, depth: VAGINA.depth },
    uterus: { path: upath, cervixEnds: CERVIX.length, length: lengthOf(upath), anteversionDeg: anteversion },
    bladder: { centre, radii, ml: bladderMl },
  };
}

/**
 * How far a tube along `path` (its half-depth in her midline's plane `half(t)[1]`) comes into an ellipsoid: the least,
 * over its points, of the point's distance from the centre in radii grown by that half-depth -- under 1 is inside.
 */
export function intoEllipsoid(centre: P3, radii: P3, path: readonly P3[], half: (t: number) => readonly [number, number]): number {
  const total = lengthOf(path);
  let s = 0, least = Infinity;
  for (let k = 0; k < path.length; k++) {
    if (k) s += dist(path[k - 1], path[k]);
    const b = half(total > 0 ? s / total : 0)[1], q = path[k];
    least = Math.min(least, Math.hypot((q[0] - centre[0]) / radii[0], (q[1] - centre[1]) / (radii[1] + b), (q[2] - centre[2]) / (radii[2] + b)));
  }
  return least;
}

/** A mesh: points (x, y, z) and triangles. */
export interface OrganMesh { readonly points: Float32Array; readonly triangles: Uint32Array }

/**
 * A tube swept along `path` and closed round at both ends: across it an ellipse, `half(t)` = [its half-width across her,
 * its half-depth in her midline's plane] at `t` 0..1 along. `ring` points round, `caps` rings closing each end. Each
 * ring stands square to the line there, or to `axis(t)` if given (rings kept parallel down a line that is moved
 * sideways -- a womb leaning on her spine -- cannot cross one another).
 */
export function sweep(path: readonly P3[], half: (t: number) => readonly [number, number, number?], ring = 24, caps = 6, axis?: (t: number) => P3): OrganMesh {
  const total = lengthOf(path), pts: number[] = [], tris: number[] = [];
  // the rings: along the line, then rounding each end to a point
  // (`c`: its back half's depth, where that is not its front's -- two half ovals that meet at its sides)
  const stations: { at: P3; tan: P3; a: number; b: number; c: number }[] = [];
  let s = 0;
  const tanAt = (k: number): P3 => { const a = path[Math.max(0, k - 1)], b = path[Math.min(path.length - 1, k + 1)], d = dist(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d]; };
  for (let k = 0; k < path.length; k++) {
    if (k) s += dist(path[k - 1], path[k]);
    const t = total > 0 ? s / total : 0, [a, b, c] = half(t);
    stations.push({ at: path[k], tan: axis ? axis(t) : tanAt(k), a, b, c: c ?? b });
  }
  const end = (st: (typeof stations)[number], dir: 1 | -1) => {
    const out: typeof stations = [];
    for (let c = 1; c <= caps; c++) {
      const th = (c / caps) * (Math.PI / 2), k = Math.cos(th), push = Math.sin(th) * Math.min(st.a, st.b) * dir;
      out.push({ at: [st.at[0] + st.tan[0] * push, st.at[1] + st.tan[1] * push, st.at[2] + st.tan[2] * push], tan: st.tan, a: st.a * Math.max(k, 1e-3), b: st.b * Math.max(k, 1e-3), c: st.c * Math.max(k, 1e-3) });
    }
    return out;
  };
  const all = [...end(stations[0], -1).reverse(), ...stations, ...end(stations[stations.length - 1], 1)];
  for (const st of all) {
    // across her (+x), and her midline's plane's other way: tan x across -- toward her back, for a line that runs up her
    const across: P3 = [1, 0, 0], nrm: P3 = [st.tan[1] * across[2] - st.tan[2] * across[1], st.tan[2] * across[0] - st.tan[0] * across[2], st.tan[0] * across[1] - st.tan[1] * across[0]];
    const nl = Math.hypot(...nrm) || 1, backIs = nrm[2] <= 0 ? 1 : -1;
    for (let r = 0; r < ring; r++) {
      const th = (2 * Math.PI * r) / ring, ca = Math.cos(th) * st.a, sn = Math.sin(th), sb = sn * (sn * backIs > 0 ? st.c : st.b);
      pts.push(st.at[0] + across[0] * ca + (nrm[0] / nl) * sb, st.at[1] + across[1] * ca + (nrm[1] / nl) * sb, st.at[2] + across[2] * ca + (nrm[2] / nl) * sb);
    }
  }
  for (let i = 0; i + 1 < all.length; i++) for (let r = 0; r < ring; r++) {
    const a = i * ring + r, b = i * ring + ((r + 1) % ring), c = a + ring, d = b + ring;
    tris.push(a, c, b, b, c, d);
  }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris) };
}

/** An ellipsoid: `centre`, half-sizes `radii`, `rows` x `cols`. */
export function ellipsoid(centre: P3, radii: P3, rows = 16, cols = 24): OrganMesh {
  const pts: number[] = [], tris: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const th = (Math.PI * i) / rows, y = Math.cos(th), s = Math.sin(th);
    for (let j = 0; j < cols; j++) { const ph = (2 * Math.PI * j) / cols; pts.push(centre[0] + radii[0] * s * Math.cos(ph), centre[1] + radii[1] * y, centre[2] + radii[2] * s * Math.sin(ph)); }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * cols + j, b = i * cols + ((j + 1) % cols), c = a + cols, d = b + cols;
    tris.push(a, b, c, b, d, c);
  }
  return { points: Float32Array.from(pts), triangles: Uint32Array.from(tris) };
}

/** The womb's half-sizes along its centre line (t 0 at the external os, 1 at the fundus): the cervix a round 2.5 cm, the
 * body widening to 4.5 x 3.0 cm two-thirds of the way up, rounding over the fundus. BIOLOGICAL SHAPE (an upside-down pear). */
export function uterusHalf(t: number, cervixShare = CERVIX.length / UTERUS.length): readonly [number, number] {
  const cw = CERVIX.width / 2, w = UTERUS.width / 2, d = UTERUS.thickness / 2;
  if (t <= cervixShare) return [cw * 0.92, cw * 0.92];
  const u = (t - cervixShare) / (1 - cervixShare), grow = Math.sin(Math.min(1, u / 0.66) * (Math.PI / 2));
  const round = u > 0.66 ? Math.sqrt(Math.max(0, 1 - ((u - 0.66) / 0.34) ** 2)) * 0.55 + 0.45 : 1;
  return [(cw + (w - cw) * grow) * round, (cw + (d - cw) * grow) * round];
}

/** Her three organs' meshes, from the layout (rest metres). */
export function organMeshes(layout: OrganLayout): { uterus: OrganMesh; vagina: OrganMesh; bladder: OrganMesh } {
  const v = layout.vagina, u = layout.uterus, b = layout.bladder;
  // (the womb's rounded ends inside its length, so the cervix ends at the external os and the fundus at its top)
  const half = wombHalf(u);
  const from = Math.min(...half(0)), to = u.length - Math.min(...half(1)), inner = subPath(u.path, from, to), axis = wombAxis(u);
  const remap = (t: number) => (from + t * (to - from)) / u.length;
  return {
    vagina: sweep(v.path, (t) => { const b = (v.depth / 2) * narrowAt(v.narrow, t); return [(v.width / 2) * narrowAt(v.narrowAcross, t), b, b * narrowAt(v.back, t)]; }, 20, 4),
    uterus: sweep(inner, (t) => half(remap(t)), u.halves ? 36 : 28, 7, u.axes ? (t) => axis(remap(t)) : undefined),
    bladder: ellipsoid(b.centre, b.radii),
  };
}

/** The womb's half-sizes [across, front to back] by how far along it `t` (0..1) is: as grown, or `uterusHalf`'s. */
export function wombHalf(u: OrganLayout['uterus']): (t: number) => readonly [number, number] {
  if (!u.halves) { const share = u.cervixEnds / u.length; return (t) => uterusHalf(t, share); }
  const halves = u.halves, at: number[] = [0];
  for (let k = 1; k < u.path.length; k++) at.push(at[k - 1] + dist(u.path[k - 1], u.path[k]));
  const total = at[at.length - 1] || 1;
  return (t) => {
    const s = Math.min(1, Math.max(0, t)) * total;
    let k = 1; while (k < at.length - 1 && at[k] < s) k++;
    const a = at[k - 1], b = at[k], f = b > a ? (s - a) / (b - a) : 0;
    return [halves[k - 1][0] + (halves[k][0] - halves[k - 1][0]) * f, halves[k - 1][1] + (halves[k][1] - halves[k - 1][1]) * f];
  };
}

/** The way the womb faces by how far along it `t` (0..1) is: as grown (`axes`), or its path's own way. */
export function wombAxis(u: OrganLayout['uterus']): (t: number) => P3 {
  const at: number[] = [0];
  for (let k = 1; k < u.path.length; k++) at.push(at[k - 1] + dist(u.path[k - 1], u.path[k]));
  const total = at[at.length - 1] || 1, n = u.path.length;
  const own = (k: number): P3 => { const a = u.path[Math.max(0, k - 1)], b = u.path[Math.min(n - 1, k + 1)], d = dist(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d, (b[2] - a[2]) / d]; };
  const ax = u.axes ?? u.path.map((_, k) => own(k));
  return (t) => {
    const s = Math.min(1, Math.max(0, t)) * total;
    let k = 1; while (k < n - 1 && at[k] < s) k++;
    const f = at[k] > at[k - 1] ? (s - at[k - 1]) / (at[k] - at[k - 1]) : 0, a = ax[k - 1], b = ax[k];
    const v: P3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], l = Math.hypot(...v) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
}

/** The part of a line from `from` to `to` metres along it. */
/** A canal's `narrow` read `t` (0..1) of the way along it: 1 where it has none. */
export function narrowAt(narrow: readonly number[] | undefined, t: number): number {
  if (!narrow || narrow.length < 2) return 1;
  const f = Math.min(1, Math.max(0, t)) * (narrow.length - 1), k = Math.min(narrow.length - 2, Math.floor(f));
  return narrow[k] + (narrow[k + 1] - narrow[k]) * (f - k);
}
/** A canal's `narrow` for the part of it from `from` to `to` metres along a path `total` long, at as many even steps. */
export function subNarrow(narrow: readonly number[] | undefined, from: number, to: number, total: number): number[] | undefined {
  if (!narrow || !(total > 0)) return undefined;
  return narrow.map((_, i) => narrowAt(narrow, (from + ((to - from) * i) / (narrow.length - 1)) / total));
}
export function subPath(path: readonly P3[], from: number, to: number): P3[] {
  const out: P3[] = [along(path, from)];
  let s = 0;
  for (let k = 1; k < path.length; k++) { s += dist(path[k - 1], path[k]); if (s > from && s < to) out.push(path[k]); }
  out.push(along(path, to));
  return out;
}
