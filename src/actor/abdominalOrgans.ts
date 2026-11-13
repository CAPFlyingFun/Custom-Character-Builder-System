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
 *
 * LAID IN HER OWN RIB CAGE, ORGAN AGAINST ORGAN (2026-11-13; Joshua, of her spleen pressing into her kidney and her
 * pancreas laid low: "is it an easy fix?" -- "Yes."). These were first placed from her landmarks alone, before her
 * diaphragm, her liver and her spleen were laid; measured against them in v2, at the end of a quiet breath out: her
 * stomach's fundus stood 2.7 cm up through her diaphragm, 17% of it in her left lung; 43% of her right kidney was inside
 * her liver, 2.7 cm deep; 18% of her spleen was inside her left kidney, 1.6 cm deep; her left kidney's upper pole stood
 * 7 mm through her diaphragm's back; 11% of her stomach was in her colon. So:
 *  - her stomach's line is drawn under her diaphragm's left dome, her colon's top lower -- its bends under her liver and
 *    her spleen, its middle sagging under her stomach's greater curve -- and her kidneys a little lower, nearer her spine
 *    and further back (`ABDOMEN_PLACE`);
 *  - given what lies over them (`UpperBelly`: her liver's and her diaphragm's underside, her spleen, her pancreas), her
 *    stomach and her colon are kept under and off it, whatever they hold and whatever her womb does (`layAbdomen`);
 *  - as she breathes in, her stomach, her kidneys and her colon's top ride her diaphragm's domes down with the organs over
 *    them (`BREATH_RIDE`), so they keep their places against one another at every breath.
 * MEASURED after (tests/upperOrgans.test.ts holds it): none of her liver, gallbladder, spleen, pancreas, kidneys, stomach
 * or colon lies in another, in her lungs or heart, up through her diaphragm, out through her ribs or in her spine, at a
 * quiet breath out, a quiet breath in and her deepest breath (her gallbladder in its hollow in her liver excepted).
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
  /** the stomach's line, fundus to pylorus (x from her midline, y above (-below) her xiphoid, z ahead of her spine's
   * front there): from its `fundus`'s middle a quarter turn -- down, then toward her right -- and from the turn's end its
   * `antrum` on to its pylorus [toward her right, up, forward]; `forward`, how much further ahead of her spine it is at
   * the turn's end. The turn's radius is `turn` at the least and `turnPerWide` times its widest half-size (`layStomach`):
   * a skin swept round a line folds on the inside of a bend tighter than its own half-size, and a fuller stomach's
   * greater curve swings down and out, its pylorus -- its mobile end -- going down and to her right (BIOLOGICAL SHAPE).
   * GAME TUNING within BIOLOGICAL SHAPE: its fundus under her diaphragm's left dome, beside the tip of her liver's left
   * lobe and in front of her spleen; its body down in front of her spleen and her left kidney; its lower limb across her
   * middle over her transverse colon to its pylorus just right of her midline, at her L1/L2 disc (the transpyloric plane)
   * as it is between meals. At first its fundus began 3 cm above her xiphoid and 2 cm further out, which in her own rib
   * cage is in her left lung; and written as six fixed stations its corner was tighter than its own half-size from a
   * quarter of a litre up (MEASURED 2026-11-13: 11 of its skin's edges folded back at 250 mL, 29 at a litre). */
  stomach: { fundus: [0.068, -0.03, 0.058] as const, leanDeg: 8, hookDeg: 40, turn: 0.05, turnPerWide: 1.25, forward: 0.04 },
  /** the most her stomach is DRAWN holding where it is laid in her own rib cage (`layAbdomen` with what is over it).
   * MEASURED 2026-11-13 in her own body: to 450 mL it is in none of her other organs; at half a litre 7 of its points
   * stand in her gallbladder; from 600 mL its front reaches her belly's skin (7 cm ahead of her spine's front there) and
   * at a litre it stands 2 cm out through it, and down into her bowel -- her belly is 7.4 cm deep inside there, and a
   * litre is a ball 12 cm across. A woman's belly rounds out for a full stomach (BIOLOGICAL SHAPE); until her belly's
   * skin gives for hers, it is drawn no fuller than the room she has, and its number goes on counting (actor/gut.ts).
   * GAME TUNING. */
  stomachRoomMl: 450,
  /** the intestines' middle [x, y, z ahead of the spine] and half-sizes, not pregnant */
  intestines: { centre: [0, 0.995, 0.045] as const, radii: [0.078, 0.062, 0.042] as const },
  /** the colon's line, caecum to the left iliac fossa: [x, y, z ahead of the spine's front at that height]. Its top (GAME
   * TUNING within BIOLOGICAL SHAPE, 2026-11-13): its right bend under her liver's right lobe, its left bend under her
   * spleen's foot and beside her stomach, its middle sagging under her stomach's greater curve and in front of the top of
   * her bowel (at first 3-5 cm higher, where her liver, her stomach and her spleen lie in her own rib cage) */
  colon: [[-0.062, 0.945, 0.055], [-0.078, 1.0, 0.03], [-0.078, 1.04, 0.03], [-0.068, 1.066, 0.045], [-0.03, 1.063, 0.068], [0.03, 1.065, 0.068], [0.082, 1.077, 0.02], [0.086, 1.05, 0.015], [0.083, 1.0, 0.015], [0.07, 0.945, 0.04]] as readonly (readonly [number, number, number])[],
  /** the sigmoid and rectum, from the colon's end: [x, y, z] in her rest frame relative to her promontory's x and her
   * coccyx/opening (the rectum lies in the sacral hollow; the anus this far behind her opening) */
  sigmoid: [[0.075, 0.945, -0.015], [0.045, 0.925, -0.03], [0.015, 0.915, -0.07]] as readonly (readonly [number, number, number])[],
  rectum: { s3: [0, 0.895, -0.092] as const, ampulla: [0, 0.86, -0.108] as const, bend: [0, 0.825, -0.095] as const },
  /** THE HEIGHTS THESE PLACES WERE WRITTEN AT: her skeleton's own promontory and xiphoid, rest metres (MEASURED:
   * src/data/pelvis/skeleton.json, src/data/torso/skeleton.json). A place's height above is carried to the body it is
   * laid in by `heightIn`: below her promontory with her pelvis, whole; between her promontory and her xiphoid in
   * proportion -- v2's pelvis stands 3.7 cm higher on her longer legs and her trunk is that much shorter (sarahlab/
   * skeletonInV2.ts LimbFit.trunk), and written heights left as they were put her colon's ends below her pelvis's brim. */
  written: { promontory: 0.93666, xiphoid: 1.18642 },
  anusBehindOpening: 0.033,
  /** where the rectum and her birth canal share a height, its line this far behind the canal's, metres: the canal's back
   * wall, the rectum's front wall and the tissue between them. BIOLOGICAL SHAPE (the rectovaginal septum is thin). */
  behindCanal: 0.02,
  anusBelowOpening: 0.0,
  /** the kidneys' middles: this far from her midline, `kidneyBelow` under her L1/L2 disc (the left) and this far behind
   * her spine's front */
  kidneyOut: 0.058,
  kidneyBehind: 0.034,
  /** each kidney's upper pole tipped back this much (degrees: BIOLOGICAL SHAPE) */
  kidneyBackDeg: 12,
  /** GAME TUNING within BIOLOGICAL SHAPE, with `kidneyOut` and `kidneyBehind` (2026-11-13: at first at the disc itself,
   * 6 mm further out and 6 mm further forward). Her rib cage, measured on her bones, puts her diaphragm's back lower
   * against her spine than a textbook's (the bottom of her breastbone is level with her T11/T12 disc), and she is
   * standing: a kidney lies lower standing than lying -- up to two vertebral bodies, 5 cm, before it is called dropped
   * (https://taylorandfrancis.com/knowledge/Medicine_and_healthcare/Endocrinology/Nephroptosis). At the disc itself her
   * left kidney's upper pole stood 7 mm up through her diaphragm's back, her right kidney was 43% inside her liver and
   * her spleen 18% inside her left kidney (MEASURED 2026-11-13). Here her left kidney's middle is at the middle of her
   * second lumbar vertebra, its upper pole at her T12/L1 disc: her spleen above and in front of its outer edge, her liver
   * resting on her right one, her pancreas's tail in front of it (actor/upperOrgans.ts `OFF_KIDNEYS`). */
  kidneyBelow: 0.02,
  /** her stomach and her colon kept this far under what lies over them -- her liver, her diaphragm (`layAbdomen`'s
   * `upper`) */
  underDiaphragm: 0.004,
  /** her colon kept this far from her stomach where they cross and from her pancreas behind it, and both this far from
   * her spleen */
  offStomach: 0.003,
});

/**
 * HER BREATH CARRIES THEM: the share of her diaphragm's domes' drop (as she breathes in, from the end of a quiet breath
 * out: actor/upperOrgans.ts `domeDrop`) each rides down with. MEASURED: her upper belly's organs go down with her
 * diaphragm as she breathes in -- her liver 2.5 cm in normal breathing and 5.5 cm at the most (Suramo et al. 1984,
 * https://www.scilit.net/publications/06bbddd9677701e90c9974b189eb72ea); her diaphragm 12 +- 7 mm and her liver 10 +- 8 mm
 * in quiet breathing (Davies et al. 1994, https://scilit.com/publications/5de0dd688d316dbd43a020fdf4546d5e); and her
 * liver's, spleen's and kidneys' motion follows the top of her right diaphragm's (R > 0.98, in held breaths) with a median
 * slope not significantly different from 1 (ESTRO 2022,
 * https://estro.org/Congresses/ESTRO-2022/615/05-intra-fraction-real-timeadaptation/11423/3dabdominalorganmotioncorrelatesstronglywiththedia).
 * So her stomach (under her diaphragm's left dome) and her kidneys ride all of it, as her liver, spleen and pancreas do
 * (upperOrgans.ts), and her colon's top -- its two bends and what runs between them, under her liver, stomach and spleen
 * -- rides it with them, less and less down its sides to none `from` under her xiphoid; and the top of her bowel gives
 * way under them the same, `bowelUnder` lower -- her colon lies ON her bowel, so her bowel's top has to go down as far as
 * her colon over it does (GAME TUNING: what of her colon and her bowel lies low in her belly rides none of it; her
 * bowel is pressed down from above and is not made to bulge elsewhere -- her belly's skin moves out with her breath by
 * itself, sarahlab/breathSkin.ts). Before, only her liver, gallbladder, spleen and pancreas moved with her breath: at her
 * deepest breath her liver went 3.7 cm down into her colon and her left lung's foot came down over her left kidney
 * (MEASURED 2026-11-13).
 */
export const BREATH_RIDE = Object.freeze({ stomach: 1, kidneys: 1, colon: 1, bowel: 1, from: 0.2, full: 0.11, bowelUnder: 0.025 });

/** The share of her diaphragm's drop a point of one of her belly's organs rides (its rest height `y`; her xiphoid's
 * `xiphoidY`): `BREATH_RIDE`. */
export function breathRide(organ: 'stomach' | 'intestines' | 'colon' | 'rectum' | 'kidneyL' | 'kidneyR', y: number, xiphoidY: number): number {
  const R = BREATH_RIDE;
  if (organ === 'stomach') return R.stomach;
  if (organ === 'kidneyL' || organ === 'kidneyR') return R.kidneys;
  if (organ !== 'colon' && organ !== 'intestines') return 0;
  const t = clamp((y + (organ === 'colon' ? 0 : R.bowelUnder) - (xiphoidY - R.from)) / (R.from - R.full), 0, 1);
  return (organ === 'colon' ? R.colon : R.bowel) * t * t * (3 - 2 * t);
}

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

/** Her stomach's line for a widest half-size `wide` (`ABDOMEN_PLACE.stomach`): its turn no tighter than its skin allows. */
export function stomachLine(torso: TorsoLandmarks, wide: number, x0: number, n = 26): P3[] {
  const S = ABDOMEN_PLACE.stomach, X = torso.landmarks.xiphoid, R = Math.max(S.turn, S.turnPerWide * wide), steps = 6, pts: P3[] = [];
  const th0 = (S.leanDeg * Math.PI) / 180, th1 = Math.PI / 2 + (S.hookDeg * Math.PI) / 180, z0 = spineFrontAt(torso, X[1] + S.fundus[1]) + S.fundus[2];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, th = th0 + (th1 - th0) * t;
    pts.push([x0 + S.fundus[0] + R * (Math.cos(th) - Math.cos(th0)), X[1] + S.fundus[1] - R * (Math.sin(th) - Math.sin(th0)), z0 + S.forward * (1 - (1 - t) ** 2)]);
  }
  return smoothLine(pts, n);
}

/** The stomach holding `ml`: its line and half-sizes. */
export function layStomach(torso: TorsoLandmarks, ml: number, x0: number): AbdomenLayout['stomach'] {
  const v = clamp(ml, STOMACH.emptyMl * 0.4, STOMACH.mostMl);
  // (empty it lies flat front to back; full it rounds out)
  const fill = clamp((v - STOMACH.emptyMl) / (STOMACH.fullMl - STOMACH.emptyMl), 0, 1), flat = STOMACH.flatEmpty + (1 - STOMACH.flatEmpty) * Math.sqrt(fill);
  const tube = (wide: number): Tube => {
    const path = stomachLine(torso, wide, x0), total = lineLength(path); let d = 0;
    // (a ring's first half-size lies front to back along a line that runs in her frontal plane, as this one does
    // (`sweepAny`'s frame), its second in that plane: flat front to back. They were the other way round: an empty stomach
    // was drawn thin from the front and deep front to back)
    return { path, halves: path.map((q, k) => { if (k) d += dist(path[k - 1], q); const p = stomachProfile(d / total) * wide; return [p * flat, p] as const; }) };
  };
  // (its widest half-size so it holds `v`, found by halving: its rounded ends grow faster than its length, and its line
  // lengthens as its turn widens)
  let lo = 0, hi = 0.2;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (tubeVolume(tube(m)) < v * 1e-6) lo = m; else hi = m; }
  return { ...tube((lo + hi) / 2), ml: v };
}

/** The colon at `fill` (0 empty .. 1 full). */
export function layColon(torso: TorsoLandmarks, fill: number, x0: number): AbdomenLayout['colon'] {
  const f = clamp(fill, 0, 1), k = COLON.emptyScale + (COLON.fullScale - COLON.emptyScale) * f;
  const path = smoothLine(ABDOMEN_PLACE.colon.map(([x, y, z]) => { const h = heightIn(torso, y); return [x0 + x, h, spineFrontAt(torso, h) + z]; }), 40);
  const total = lineLength(path), C = COLON;
  // (wide at the caecum, narrowing up the ascending colon, across, and down the descending)
  const at = (t: number) => (t < 0.08 ? C.caecumR + (C.ascendingR - C.caecumR) * (t / 0.08) : t < 0.38 ? C.ascendingR + (C.transverseR - C.ascendingR) * ((t - 0.08) / 0.3) : t < 0.7 ? C.transverseR + (C.descendingR - C.transverseR) * ((t - 0.38) / 0.32) : C.descendingR);
  let s = 0;
  const halves = path.map((p, i) => { if (i) s += dist(path[i - 1], p); const r = at(s / total) * k; return [r, r] as const; });
  return { path, halves, fill: f };
}

/** A height written on her skeleton (ABDOMEN_PLACE.written) as it stands in this body: with her pelvis below her
 * promontory, in proportion between her promontory and her xiphoid, with her xiphoid above it. */
export function heightIn(torso: TorsoLandmarks, y: number): number {
  const W = ABDOMEN_PLACE.written, p = torso.spineFront[0]?.[0] ?? W.promontory, x = torso.landmarks.xiphoid[1];
  if (y <= W.promontory) return y + (p - W.promontory);
  if (y >= W.xiphoid) return y + (x - W.xiphoid);
  return p + ((y - W.promontory) / (W.xiphoid - W.promontory)) * (x - p);
}

/** The sigmoid, rectum and anal canal holding `ml`, from the colon's end down to her anus behind her opening. */
export function layRectum(pelvis: PelvisLandmarks, colonEnd: P3, ml: number, x0: number, opening: P3, canal: readonly P3[] | null = null): AbdomenLayout['rectum'] {
  const A = ABDOMEN_PLACE, v = clamp(ml, 0, RECTUM.mostMl), R = A.rectum;
  const anus: P3 = [x0, opening[1] - A.anusBelowOpening, opening[2] - A.anusBehindOpening];
  // (these lie in her pelvis, below her promontory: carried with it, whole -- ABDOMEN_PLACE.written)
  const up = pelvis.landmarks.promontory[1] - A.written.promontory;
  const pts: P3[] = [colonEnd, ...A.sigmoid.slice(1).map(([x, y, z]) => [x0 + x, y + up, z] as P3), [x0, R.s3[1] + up, R.s3[2]], [x0, R.ampulla[1] + up, R.ampulla[2]], [x0, R.bend[1] + up, R.bend[2]], anus];
  const path = smoothLine(pts, 36).map((q): [number, number, number] => [q[0], q[1], q[2]]);
  // (never in front of her birth canal: where they share a height it is `behindCanal` behind the canal's line -- her canal
  // runs up behind her pubic arch, actor/birthCanal.ts `seatedCanal`, where these places alone had it cross)
  if (canal && canal.length > 1) {
    const lo = Math.min(canal[0][1], canal[canal.length - 1][1]), hi = Math.max(canal[0][1], canal[canal.length - 1][1]);
    for (const q of path) {
      if (q[1] < lo - 1e-9 || q[1] > hi + 1e-9) continue;
      const v = canal.reduce((best, c) => (Math.abs(c[1] - q[1]) < Math.abs(best[1] - q[1]) ? c : best));
      q[2] = Math.min(q[2], v[2] - A.behindCanal);
    }
  }
  const total = lineLength(path);
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
  return { path, halves, ml: v };
}

/** Her kidneys: the left a little under her L1/L2 disc (`ABDOMEN_PLACE.kidneyBelow`), the right lower, each beside her
 * spine at her back. */
export function layKidneys(torso: TorsoLandmarks & { readonly discs?: readonly number[] }, x0: number): [Bean, Bean] {
  const A = ABDOMEN_PLACE, K = KIDNEY, discs = torso.discs ?? [], l1l2 = (discs[4] ?? torso.landmarks.navel + 0.07) - A.kidneyBelow;
  const lean = (K.leanDeg * Math.PI) / 180, back = (A.kidneyBackDeg * Math.PI) / 180;
  const bean = (side: -1 | 1): Bean => {
    const y = l1l2 - (side < 0 ? K.rightLower : 0);
    // (its upper pole toward her midline and tipped back)
    const up: P3 = [-side * Math.sin(lean), Math.cos(lean) * Math.cos(back), -Math.cos(lean) * Math.sin(back)];
    return { centre: [x0 + side * A.kidneyOut, y, spineFrontAt(torso, y) - A.kidneyBehind], radii: [K.width / 2, K.length / 2, K.thickness / 2], up, side };
  };
  return [bean(1), bean(-1)];
}

/** A kidney's (a bean's) frame: its across, up and front-to-back axes (as `bean` turns it). */
export function beanFrame(b: Bean): [P3, P3, P3] {
  const up = b.up, d = up[0];
  let ax: P3 = [1 - d * up[0], -d * up[1], -d * up[2]];
  const l = Math.hypot(...ax) || 1; ax = [ax[0] / l, ax[1] / l, ax[2] / l];
  return [ax, up, [ax[1] * up[2] - ax[2] * up[1], ax[2] * up[0] - ax[0] * up[2], ax[0] * up[1] - ax[1] * up[0]]];
}
/** How deep a point is in a bean grown by `gap` (its ellipsoid's measure: under 1 inside). */
export function inBean(b: Bean, gap: number, x: number, y: number, z: number): number {
  const [a, u, w] = beanFrame(b), dx = x - b.centre[0], dy = y - b.centre[1], dz = z - b.centre[2];
  const p = dx * a[0] + dy * a[1] + dz * a[2], q = dx * u[0] + dy * u[1] + dz * u[2], r = dx * w[0] + dy * w[1] + dz * w[2];
  return (p / (b.radii[0] + gap)) ** 2 + (q / (b.radii[1] + gap)) ** 2 + (r / (b.radii[2] + gap)) ** 2;
}
/** A tube moved off beans (her stomach and colon off her spleen): each station out of each bean grown by its own size and
 * `gap`, straight out from the bean's long axis (they lie beside her spleen, not over or under it -- over it is her
 * diaphragm), as little as will do; the moves smoothed. */
export function tubeOffBeans<T extends Tube>(t: T, beans: readonly Bean[], gap: number): T {
  const n = t.path.length, d = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) {
    const p = t.path[k], r = Math.max(t.halves[k][0], t.halves[k][1]);
    for (const b of beans) {
      if (inBean(b, gap + r, p[0], p[1], p[2]) >= 1) continue;
      const up = b.up, v: P3 = [p[0] - b.centre[0], p[1] - b.centre[1], p[2] - b.centre[2]], along = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
      let u: P3 = [v[0] - along * up[0], v[1] - along * up[1], v[2] - along * up[2]];
      const l = Math.hypot(u[0], u[1], u[2]);
      // (on its long axis: toward her middle and forward, where her stomach lies of her spleen)
      u = l > 1e-4 ? [u[0] / l, u[1] / l, u[2] / l] : [-b.side * Math.SQRT1_2, 0, Math.SQRT1_2];
      let lo = 0, hi = 0.01;
      while (inBean(b, gap + r, p[0] + u[0] * hi, p[1] + u[1] * hi, p[2] + u[2] * hi) < 1 && hi < 0.2) { lo = hi; hi *= 2; }
      for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (inBean(b, gap + r, p[0] + u[0] * m, p[1] + u[1] * m, p[2] + u[2] * m) < 1) lo = m; else hi = m; }
      d[3 * k] += u[0] * hi; d[3 * k + 1] += u[1] * hi; d[3 * k + 2] += u[2] * hi;
    }
  }
  return smoothedMove(t, d);
}

/** The intestines' mass holding `ml`, not yet pushed by a womb. */
export function layIntestines(torso: TorsoLandmarks, ml: number, x0: number): AbdomenLayout['intestines'] {
  const A = ABDOMEN_PLACE.intestines, v = clamp(ml, INTESTINES.restMl * 0.6, INTESTINES.mostMl), k = Math.cbrt(v / INTESTINES.restMl);
  const y = heightIn(torso, A.centre[1]);
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
 * against it; then each station once more by what its ring still needs. Returns the tube moved (its halves as they were).
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
  const moved: T = { ...t, path: t.path.map((p, k) => [p[0] + out[3 * k], p[1] + out[3 * k + 1], p[2] + out[3 * k + 2]] as P3) };
  // (and its rings and rounded ends: over her womb's rounded top a station's middle may stand clear while its ring dips
  // into her womb's shoulder -- each station moved again, by the most any point of its ring still needs; up to thrice,
  // its rings turning a little as its line moves)
  const ring = 12, caps = 3, q = new Float32Array(3);
  let clear = moved;
  for (let pass = 0; pass < 3; pass++) {
    const rings = sweepAny(clear.path, clear.halves, ring, caps).points, e = new Float32Array(3 * n);
    let any = false;
    for (let i = 0; i < rings.length; i += 3) {
      q[0] = rings[i]; q[1] = rings[i + 1]; q[2] = rings[i + 2];
      if (!outOfWomb(q, womb, gap)) continue;
      // (its rings in order: `caps` of its first end, its stations, `caps` of its last end)
      const k = clamp(Math.floor(i / (3 * ring)) - caps, 0, n - 1), dx = q[0] - rings[i], dy = q[1] - rings[i + 1], dz = q[2] - rings[i + 2];
      if (dx * dx + dy * dy + dz * dz > e[3 * k] ** 2 + e[3 * k + 1] ** 2 + e[3 * k + 2] ** 2) { e[3 * k] = dx; e[3 * k + 1] = dy; e[3 * k + 2] = dz; any = true; }
    }
    if (!any) break;
    clear = smoothedMove(clear, e);
  }
  return clear;
}

/** A tube's stations moved by `d` (3 a station), the moves smoothed along it a few stations each way, never below what
 * each station itself needed (as `tubeOutOfWomb`). */
function smoothedMove<T extends Tube>(t: T, d: Float32Array): T {
  const n = t.path.length, span = Math.max(2, Math.round(n / 12)), out = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) for (let a = 0; a < 3; a++) {
    let sum = 0, w = 0;
    for (let j = -span; j <= span; j++) { const i = Math.min(n - 1, Math.max(0, k + j)), f = 1 - Math.abs(j) / (span + 1); sum += d[3 * i + a] * f; w += f; }
    const own = d[3 * k + a], avg = sum / w;
    out[3 * k + a] = Math.abs(own) > Math.abs(avg) ? own : avg;
  }
  return { ...t, path: t.path.map((p, k) => [p[0] + out[3 * k], p[1] + out[3 * k + 1], p[2] + out[3 * k + 2]] as P3) };
}

/**
 * A tube kept under a sheet over it (her diaphragm, her liver's underside: `ceiling(x, z)` its height): each station
 * brought straight down until its ring -- and, at the tube's ends, its rounded end -- is `gap` under the sheet (its points
 * as `sweepAny` lays them), the moves smoothed along it; again, up to thrice, while any of it is still over (its rings
 * turn a little as its line moves).
 */
export function tubeUnder<T extends Tube>(t: T, ceiling: (x: number, z: number) => number, gap: number, ring = 16, caps = 4): T {
  const n = t.path.length;
  for (let pass = 0; pass < 3; pass++) {
    const m = sweepAny(t.path, t.halves, ring, caps).points, d = new Float32Array(3 * n);
    let most = 0;
    for (let i = 0; i < m.length; i += 3) {
      // (its rings in order: `caps` of its first end, its stations, `caps` of its last end)
      const k = clamp(Math.floor(i / 3 / ring) - caps, 0, n - 1), over = m[i + 1] - (ceiling(m[i], m[i + 2]) - gap);
      if (over > -d[3 * k + 1]) { d[3 * k + 1] = -over; most = Math.max(most, over); }
    }
    if (most <= 1e-5) break;
    t = smoothedMove(t, d);
  }
  return t;
}

/**
 * A tube SET DOWN under a sheet over it, all of a piece: moved straight down just far enough that nothing of it (its rings
 * and its rounded ends, as `sweepAny` lays them) is higher than `gap` under the sheet. Its shape and what it holds stay as
 * they were -- her stomach: brought down station by station (`tubeUnder`) its skin crumpled and it held 5 to 16% less than
 * its number said (MEASURED 2026-11-13: 79 of its skin's edges folded back at 250 mL, 238 mL in it).
 */
export function tubeSetUnder<T extends Tube>(t: T, ceiling: (x: number, z: number) => number, gap: number, ring = 16, caps = 4): T {
  const m = sweepAny(t.path, t.halves, ring, caps).points; let over = 0;
  for (let i = 0; i < m.length; i += 3) over = Math.max(over, m[i + 1] - (ceiling(m[i], m[i + 2]) - gap));
  return over > 1e-6 ? { ...t, path: t.path.map((q): P3 => [q[0], q[1] - over, q[2]]) } : t;
}
/** A tube SET OFF beans, all of a piece (her stomach off her spleen): moved level, away from each bean's middle toward its
 * own, just far enough that nothing of it is within `gap` of the bean. */
export function tubeSetOff<T extends Tube>(t: T, beans: readonly Bean[], gap: number, ring = 16, caps = 4): T {
  let path = t.path;
  for (const b of beans) {
    const m = sweepAny(path, t.halves, ring, caps).points;
    let wx = 0, wz = 0; for (const q of path) { wx += q[0]; wz += q[2]; } wx = wx / path.length - b.centre[0]; wz = wz / path.length - b.centre[2];
    const l = Math.hypot(wx, wz); if (l > 1e-4) { wx /= l; wz /= l; } else { wx = -b.side * Math.SQRT1_2; wz = Math.SQRT1_2; }
    const clear = (s: number) => { for (let i = 0; i < m.length; i += 3) if (inBean(b, gap, m[i] + wx * s, m[i + 1], m[i + 2] + wz * s) < 1) return false; return true; };
    if (clear(0)) continue;
    let lo = 0, hi = 0.005; while (!clear(hi) && hi < 0.2) { lo = hi; hi *= 2; }
    for (let k = 0; k < 20; k++) { const s = (lo + hi) / 2; if (clear(s)) hi = s; else lo = s; }
    const by = hi; path = path.map((q): P3 => [q[0] + wx * by, q[1], q[2] + wz * by]);
  }
  return path === t.path ? t : { ...t, path };
}

/** Whether a point is in a tube grown by `gap`: in one of its stations' rounds (each an ellipsoid on the station's ring,
 * as long as the way to its neighbours -- near enough, its stations a few millimetres apart). */
function inTube(frames: ReturnType<typeof sweepAny>['frames'], gap: number, x: number, y: number, z: number): boolean {
  for (let k = 0; k < frames.length; k++) {
    const f = frames[k], n = frames[Math.min(frames.length - 1, k + 1)], p = frames[Math.max(0, k - 1)], step = Math.max(dist(f.at, n.at), dist(f.at, p.at), Math.min(f.a, f.b)) + gap;
    const vx = x - f.at[0], vy = y - f.at[1], vz = z - f.at[2], u = vx * f.n1[0] + vy * f.n1[1] + vz * f.n1[2], v = vx * f.n2[0] + vy * f.n2[1] + vz * f.n2[2], w = vx * f.t[0] + vy * f.t[1] + vz * f.t[2];
    if ((u / (f.a + gap)) ** 2 + (v / (f.b + gap)) ** 2 + (w / step) ** 2 < 1) return true;
  }
  return false;
}
/** A tube SET OFF another, all of a piece (her stomach off her pancreas behind it): moved along `way` just far enough that
 * nothing of it is within `gap` of the other. */
export function tubeSetOffTube<T extends Tube>(t: T, other: Tube, gap: number, way: P3, ring = 16, caps = 4): T {
  const m = sweepAny(t.path, t.halves, ring, caps).points, F = sweepAny(other.path, other.halves, 8, 2).frames;
  const clear = (s: number) => { for (let i = 0; i < m.length; i += 3) if (inTube(F, gap, m[i] + way[0] * s, m[i + 1] + way[1] * s, m[i + 2] + way[2] * s)) return false; return true; };
  if (clear(0)) return t;
  let lo = 0, hi = 0.005; while (!clear(hi) && hi < 0.2) { lo = hi; hi *= 2; }
  for (let k = 0; k < 20; k++) { const s = (lo + hi) / 2; if (clear(s)) hi = s; else lo = s; }
  const by = hi;
  return { ...t, path: t.path.map((q): P3 => [q[0] + way[0] * by, q[1] + way[1] * by, q[2] + way[2] * by]) };
}

/** A tube moved off another (her colon off her stomach where they cross): each station out of the other's ring (its widest
 * half-size there) grown by its own and `gap`, away from the nearest point of the other's line; the moves smoothed. */
export function tubeOffTube<T extends Tube>(t: T, other: Tube, gap: number): T {
  const n = t.path.length, d = new Float32Array(3 * n), O = other.path;
  for (let k = 0; k < n; k++) {
    const p = t.path[k], r = Math.max(t.halves[k][0], t.halves[k][1]);
    let best = Infinity, near: P3 = p, rr = 0;
    for (let i = 0; i + 1 < O.length; i++) {
      const a = O[i], b = O[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
      const s = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2, 0, 1), q: P3 = [a[0] + ab[0] * s, a[1] + ab[1] * s, a[2] + ab[2] * s], e = dist(p, q);
      if (e < best) { best = e; near = q; const h0 = other.halves[i], h1 = other.halves[i + 1]; rr = Math.max(h0[0], h0[1]) * (1 - s) + Math.max(h1[0], h1[1]) * s; }
    }
    const want = rr + r + gap;
    if (best >= want) continue;
    // (away from it; straight down when on its line)
    const u: P3 = best > 1e-6 ? [(p[0] - near[0]) / best, (p[1] - near[1]) / best, (p[2] - near[2]) / best] : [0, -1, 0];
    d[3 * k] = u[0] * (want - best); d[3 * k + 1] = u[1] * (want - best); d[3 * k + 2] = u[2] * (want - best);
  }
  return smoothedMove(t, d);
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

/** What lies over her belly's organs in her upper belly at the end of a quiet breath out (`layAbdomen`): the underside of
 * what is over them (`under`, its height at x, z: her liver's where her liver is, her diaphragm's elsewhere --
 * actor/upperOrgans.ts `layLiver`'s `bottomAt`), the organs laid beside them there (`organs`: her spleen) and the lines of
 * those laid behind them (`tubes`: her pancreas). */
export interface UpperBelly { readonly under: (x: number, z: number) => number; readonly organs: readonly Bean[]; readonly tubes?: readonly Tube[] }

/**
 * Her belly's organs laid out: holding `fill`, round her womb (`womb`, null not pregnant) and her bladder; `upper`, what lies
 * over them in her upper belly (`UpperBelly`): her stomach and her colon are kept under her diaphragm and her liver and off
 * her spleen, and her colon off her stomach and her pancreas. Without it they are laid by her landmarks alone (MEASURED
 * 2026-11-13: her stomach's fundus then stood 2.7 cm up through her diaphragm into her left lung).
 */
export function layAbdomen(torso: TorsoLandmarks & { readonly discs?: readonly number[] }, pelvis: PelvisLandmarks, opening: P3, bladder: Blob, fill: AbdomenFill = ABDOMEN_DEFAULT_FILL, womb: WombRoom | null = null, canal: readonly P3[] | null = null, upper: UpperBelly | null = null): AbdomenLayout {
  const x0 = pelvis.landmarks.symphysisTop[0], A = ABDOMEN_PLACE, off = upper?.organs ?? [];
  // (her stomach, no fuller than the room she has for it (`stomachRoomMl`), set off her spleen beside it, forward off her
  // pancreas behind it and down under what is over it, all of a piece -- twice, each move undoing a little of the others,
  // and under last: nothing of it through her diaphragm)
  let stomach = layStomach(torso, upper ? Math.min(fill.stomachMl, A.stomachRoomMl) : fill.stomachMl, x0);
  if (upper) for (let pass = 0; pass < 2; pass++) {
    stomach = tubeSetOff(stomach, off, A.offStomach);
    for (const t of upper.tubes ?? []) stomach = tubeSetOffTube(stomach, t, A.offStomach, [0, 0, 1]);
    stomach = tubeSetUnder(stomach, upper.under, A.underDiaphragm);
  }
  // (her colon the same, and off her stomach, where her transverse colon runs under it, and her pancreas behind it)
  let colon = layColon(torso, fill.colonFill, x0);
  if (upper) for (let pass = 0; pass < 2; pass++) {
    colon = tubeOffBeans(tubeOffTube(tubeUnder(colon, upper.under, A.underDiaphragm), stomach, A.offStomach), off, A.offStomach);
    for (const t of upper.tubes ?? []) colon = tubeOffTube(colon, t, A.offStomach);
  }
  // (a growing womb moves the stomach and the colon round it, each as a whole tube -- and what is over them does not give:
  // pushed up against her liver and her diaphragm they stay under them, and her womb's top dents them from below, their
  // points pushed out of it one by one as they are drawn: `outOfWomb`)
  stomach = tubeOutOfWomb(stomach, womb); colon = tubeOutOfWomb(colon, womb);
  if (upper && womb) { stomach = tubeUnder(stomach, upper.under, A.underDiaphragm); colon = tubeUnder(colon, upper.under, A.underDiaphragm); }
  const rectum = layRectum(pelvis, colon.path[colon.path.length - 1], fill.rectumMl, x0, opening, canal);
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
