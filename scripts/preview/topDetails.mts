/**
 * THE FIVE DETAILED TOPS OF HIS SHEET ON HER, PICTURED WITHOUT A BROWSER (`raster.mjs`): raglan, henley, polo, wrap and
 * button-up, each from her front, her side and her back, each pixel of her skin asking the cut (`topCut.cutEdgeAt`) and
 * the details (`topDetails.topDetailAt`) as the room's shader does. The cloth one colour, its edging another (his
 * sheet's: the raglan's grey and maroon, the polo's green...). A sketch: her rest shape, one light, no weave, no drape.
 *
 *   npx tsx scripts/preview/topDetails.mts [--style raglan|henley|polo|wrap|buttonUp] [--out preview-out/topDetails.png] [--size 360]
 */
import { beside, draw, savePng, stacked } from './raster.mjs';
import { loadBody, skinMesh, within } from './body.mjs';
import { cutEdgeAt, neckDefault, topCut, topCutSpec, topFrame, type TopCut } from '../../src/sarahlab/topCut';
import { TOP_DETAIL_STYLES, topDetailAt, topDetailSpec, DETAIL_LOOK, type TopDetailSpec } from '../../src/sarahlab/topDetails';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
type Rgb = readonly [number, number, number];
const LEGGINGS: Rgb = [0.27, 0.28, 0.31];
/** His sheet's colours (as seen): cloth, edging. */
const COLOURS: Record<keyof typeof TOP_DETAIL_STYLES, readonly [Rgb, Rgb | null]> = {
  raglan: [[0.62, 0.62, 0.63], [0.5, 0.08, 0.14]],
  henley: [[0.78, 0.74, 0.66], null],
  polo: [[0.13, 0.36, 0.2], null],
  wrap: [[0.6, 0.23, 0.13], null],
  buttonUp: [[0.42, 0.53, 0.78], null],
};

export function detailedMesh(body: Awaited<ReturnType<typeof loadBody>>, cut: TopCut, detail: TopDetailSpec, cloth: Rgb, edgingColour: Rgb | null, index = within(body, { yFrom: 0.7 })) {
  const B = cut.spec.bands, widths = [B.neck, B.sleeve, B.hem];
  return skinMesh(body, {
    index,
    paint: (f) => {
      const arm = f.at(body.armShare) as number, e = cutEdgeAt(cut, f.x, f.y, f.z, arm);
      if (!(e.distance > 0)) return arm < 0.5 && f.y < Math.max(cut.spec.hemY, cut.frame.hipY + 0.16) && f.y < cut.frame.neckY - 0.2 ? LEGGINGS : null;
      // as the shader: the bands (darker, or the edging's), then the details' edging, button and shade
      const w = widths[e.edge], band = w > 0 && e.distance < w, seam = w > 0 && Math.abs(e.distance - w) < 0.0006;
      const edge: Rgb = edgingColour ?? [cloth[0] * DETAIL_LOOK.fallback, cloth[1] * DETAIL_LOOK.fallback, cloth[2] * DETAIL_LOOK.fallback];
      let c: number[] = band ? (edgingColour ? [...edgingColour] : cloth.map((x) => x * 0.9)) : [...cloth];
      if (seam) c = c.map((x) => x * 0.7);
      const d = topDetailAt(detail, cut, f.x, f.y, f.z, arm, f.nz);
      c = c.map((x, k) => x + (edge[k] - x) * d.edging);
      const tone = 0.75;
      c = c.map((x) => x + (tone - x) * d.button);
      return c.map((x) => x * d.shade);
    },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = await loadBody(), frame = topFrame({ rest: body.rest, index: body.index, unitsPerMetre: 1, joints: body.frameJoints });
  const size = Number(option('size', '360')), only = option('style', '');
  const rows = [];
  for (const [name, s] of Object.entries(TOP_DETAIL_STYLES) as [keyof typeof TOP_DETAIL_STYLES, (typeof TOP_DETAIL_STYLES)[keyof typeof TOP_DETAIL_STYLES]][]) {
    if (only && only !== name) continue;
    const spec = topCutSpec({ neckFront: s.neckFront ?? neckDefault(s.neckStyle, frame), neckStyle: s.neckStyle, sleeve: s.sleeve, band: s.band }, frame, -0.1);
    const cut = topCut(spec, frame), detail = topDetailSpec(s.detail, spec, frame);
    const mesh = detailedMesh(body, cut, detail, COLOURS[name][0], COLOURS[name][1]);
    rows.push(beside([0, 90, 180].map((yaw) => draw({ width: size, height: Math.round(size * 1.3), yaw, centre: [0, 1.17, 0], span: 0.62, meshes: [mesh] }))));
    console.log(name);
  }
  const out = option('out', 'preview-out/topDetails.png');
  await savePng(out, stacked(rows));
  console.log(out);
}
