/**
 * HER OVARIES AND HER TUBES (Joshua, 2026-11-13: "finishing up adding the remaining organs"), laid beside her womb --
 * whatever womb she has: small in her pelvis, grown in a pregnancy, or v2's own (each a centre line from her cervix to
 * her fundus and its half-sizes along it) -- in her rest frame (metres, +y up, +z her front, +x her left). Pure: plain
 * arrays, no three.
 *
 *  - Each TUBE leaves her womb at its upper corner (the cornu, where her fundus rounds into her womb's side), runs out
 *    sideways narrow (its isthmus), widens and arches over her ovary (its ampulla), and opens in a fringed funnel (its
 *    infundibulum) hanging over her ovary's outer end.
 *  - Each OVARY lies below and behind that corner, beside her womb, on her pelvis's side wall when she is not pregnant
 *    and carried up out of her pelvis on her womb's sides as it grows.
 *
 * MEASURED: "Each ovary measures around 3 cm in length by 1.5 cm wide and is 1 cm thick", "located one on either side of
 * the uterus", "in a depression in the lateral wall of the pelvic cavity" (https://en.wikipedia.org/wiki/Ovary); each
 * tube "on average between 10 and 14 cm in length, with an external diameter of 1 cm", in "four described parts: the
 * intramural part, isthmus, ampulla, and infundibulum with associated fimbriae" (https://en.wikipedia.org/wiki/Fallopian_tube).
 * GAME TUNING: `cornu`, how far up her womb's centre line its corners are (a share of its length); `out`, `down` and
 * `back`, where her ovary's middle lies from that corner (out from her womb's side); the tube's radii along it (narrow
 * isthmus, wider ampulla, the funnel's mouth) and its arch over her ovary (`arch`).
 */
import type { P3 } from './pelvisMeasure';
import { ellipsoid, uterusHalf, type OrganMesh } from './pelvicOrgans';
import { smoothLine, sweepAny } from './abdominalOrgans';
import { joinMeshes } from './upperOrgans';

export const OVARY = Object.freeze({ length: 0.03, width: 0.015, thickness: 0.01 });
export const TUBE = Object.freeze({ length: 0.11, isthmusR: 0.0025, ampullaR: 0.0045, mouthR: 0.007 });
export const ADNEXA_PLACE = Object.freeze({ cornu: 0.86, out: 0.028, down: 0.028, back: 0.014, arch: 0.016 });

/** A womb as her ovaries and tubes need it: its centre line from her cervix to her fundus, and its half-sizes along it
 * ([across, front to back] at each point; without them, a womb not pregnant: `uterusHalf`'s). */
export interface WombLine { readonly path: readonly P3[]; readonly halves?: readonly (readonly [number, number])[] }

const dist = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The point `t` (0..1 of its length) along her womb's centre line, and its half-sizes there. */
export function wombAt(w: WombLine, t: number): { at: P3; half: readonly [number, number] } {
  const p = w.path, at: number[] = [0];
  for (let k = 1; k < p.length; k++) at.push(at[k - 1] + dist(p[k - 1], p[k]));
  const s = Math.min(1, Math.max(0, t)) * at[at.length - 1];
  let k = 1; while (k < p.length - 1 && at[k] < s) k++;
  const u = at[k] > at[k - 1] ? (s - at[k - 1]) / (at[k] - at[k - 1]) : 0, a = p[k - 1], b = p[k];
  const point: P3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  if (!w.halves) return { at: point, half: uterusHalf(t) };
  const h0 = w.halves[k - 1], h1 = w.halves[k];
  return { at: point, half: [h0[0] + (h1[0] - h0[0]) * u, h0[1] + (h1[1] - h0[1]) * u] };
}

/** Her two ovaries and two tubes beside her womb: each side's corner, ovary middle, and the meshes (rest metres). */
export function layAdnexa(w: WombLine): { corners: [P3, P3]; ovaryCentres: [P3, P3]; ovaries: OrganMesh; tubes: OrganMesh } {
  const A = ADNEXA_PLACE, T = TUBE, O = OVARY, { at, half } = wombAt(w, A.cornu);
  const corners: P3[] = [], centres: P3[] = [], ovaries: OrganMesh[] = [], tubes: OrganMesh[] = [];
  for (const side of [1, -1] as const) {
    const corner: P3 = [at[0] + side * half[0] * 0.92, at[1], at[2]];
    const ovary: P3 = [corner[0] + side * (A.out + O.width / 2), corner[1] - A.down, corner[2] - A.back];
    // its tube: out from the corner (isthmus), up and over her ovary (ampulla), down to a funnel at its outer end
    const isthmusEnd: P3 = [corner[0] + side * 0.03, corner[1] + 0.004, corner[2] - 0.004];
    const over: P3 = [ovary[0] + side * 0.004, ovary[1] + O.length / 2 + A.arch, ovary[2] - 0.004];
    const outer: P3 = [ovary[0] + side * (O.width / 2 + 0.012), ovary[1] + 0.008, ovary[2] - 0.006];
    const mouth: P3 = [ovary[0] + side * (O.width / 2 + 0.006), ovary[1] - O.length * 0.2, ovary[2] - 0.002];
    const path = smoothLine([corner, isthmusEnd, over, outer, mouth], 26);
    const n = path.length;
    const halves = path.map((_, k) => {
      const f = k / (n - 1), r = f < 0.35 ? T.isthmusR + (T.ampullaR - T.isthmusR) * (f / 0.35) * 0.4 : f < 0.85 ? T.isthmusR + (T.ampullaR - T.isthmusR) * (0.4 + 0.6 * ((f - 0.35) / 0.5)) : T.ampullaR + (T.mouthR - T.ampullaR) * ((f - 0.85) / 0.15);
      return [r, r] as const;
    });
    corners.push(corner); centres.push(ovary);
    ovaries.push(ellipsoid(ovary, [O.thickness / 2, O.length / 2, O.width / 2], 12, 16));
    tubes.push(sweepAny(path, halves, 10, 3));
  }
  return { corners: [corners[0], corners[1]], ovaryCentres: [centres[0], centres[1]], ovaries: joinMeshes(ovaries), tubes: joinMeshes(tubes) };
}
