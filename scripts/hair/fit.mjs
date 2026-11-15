/**
 * HOW A HAIR FILE SITS ON HER: each of its points' distance off her skin (negative: under it), read on her rest surface
 * (`head.mjs` `signedOff`), and how many of its points stand within reach of her at all. A style's points must not lie
 * under her skin by more than `tests/hairStyles.test.ts`'s tolerance; a tail meant to lie on her should be near her.
 *
 *   node scripts/hair/fit.mjs public/models/hair/<id>.glb [--shorter 1]
 */
import { loadHead, REST_OFFSET, REST_SCALE, hairIo } from './head.mjs';

/** A hair file's points in her rest metres (its morph at `shorter`), and its parts' extras. */
export async function hairPoints(file, shorter = 0) {
  const io = await hairIo(), doc = await io.read(file), mesh = doc.getRoot().listMeshes()[0], prim = mesh.listPrimitives()[0];
  const P = prim.getAttribute('POSITION'), n = P.getCount(), out = new Float64Array(n * 3), e = [], d = [];
  const T = prim.listTargets()[0]?.getAttribute('POSITION');
  for (let i = 0; i < n; i++) { P.getElement(i, e); if (T && shorter) T.getElement(i, d); for (let k = 0; k < 3; k++) out[i * 3 + k] = (e[k] + (T && shorter ? d[k] * shorter : 0)) * REST_SCALE + REST_OFFSET[k]; }
  return { points: out, extras: mesh.getExtras(), prim };
}

/** Each point's vertex alpha (1 where it has none): a cap's points past her hairline are cut away by the alpha test. */
export function pointAlpha(prim) {
  const c = prim.getAttribute('COLOR_0'), n = prim.getAttribute('POSITION').getCount(), a = new Float32Array(n).fill(1), e = [];
  if (c && c.getElementSize() === 4) for (let i = 0; i < n; i++) { c.getElement(i, e); a[i] = e[3]; }
  return a;
}

/**
 * Of the points that are drawn (vertex alpha at the cutoff or over): { deepestMm, under1mm (more than 1 mm under her),
 * within (her surface within 5 cm of them), worst ([x, y, z] of the deepest) }.
 */
export function underSkin(head, points, alpha = null) {
  let deepest = 0, under = 0, within = 0, worst = null;
  for (let i = 0; i < points.length; i += 3) {
    if (alpha && alpha[i / 3] < 0.42) continue;
    const s = head.signedOff([points[i], points[i + 1], points[i + 2]], 0.05);
    if (s === null) continue; within++;
    if (s < deepest) { deepest = s; worst = [points[i], points[i + 1], points[i + 2]].map((x) => +x.toFixed(3)); }
    if (s < -0.001) under++;
  }
  return { deepestMm: -deepest * 1000, under1mm: under, within, worst };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--shorter'), shorter = i > 0 ? Number(process.argv[i + 1]) : 0;
  const head = await loadHead(), { points, prim } = await hairPoints(process.argv[2], shorter);
  console.log(process.argv[2], `shorter ${shorter}`, underSkin(head, points, pointAlpha(prim)));
}
