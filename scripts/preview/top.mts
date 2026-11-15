/**
 * A DRAWN TOP'S CUT ON HER, PICTURED WITHOUT A BROWSER (`raster.mjs`): her front, her side and her back, her rest shape
 * (her arms beside her), each pixel of her skin asking the cut whether it is cloth exactly as the room's shader does
 * (`topCut.cutEdgeAt`: its neck opening's drawings by its depth, its sleeve's end on her arm's skin, its hem on the rest
 * of her) and a band along each edge shown darker. A sketch to shape a cut by: no fabric's weave, no drape at its hem,
 * no cleavage bridge, and her rest pose only -- the room's own pictures are what a cut is judged by.
 *
 *   npx tsx scripts/preview/top.mts --template tank|sportsBra|camisole|mockNeck|cropTee|teeV|... [--no-arms] [--out /tmp/top.png]
 * (a template as the room cuts it; a shirt's LENGTH, which needs her body map, is pictured at a tee's hem, 0.04)
 *   npx tsx scripts/preview/top.mts [--style crew|u|v|scoop|square] [--neck 0..1] [--sleeve -1..1] [--hem trunk] [--out /tmp/top.png]
 * (`--hem`: her hem on her trunk, 0 her hip joints and 1 the base of her neck; a tee's is about 0.04)
 */
import { beside, draw, savePng } from './raster.mjs';
import { loadBody, skinMesh, within } from './body.mjs';
import { COVERAGE_TEMPLATES } from '../../src/sarahlab/paintTemplates';
import { NECK_STYLES, cutEdgeAt, neckDefault, topCut, topCutSpec, topFrame, type NeckStyle, type TopCut } from '../../src/sarahlab/topCut';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };

const LEGGINGS: readonly [number, number, number] = [0.27, 0.28, 0.31];
/** Her skin with a cut on it, as a mesh for `raster.draw`: `cloth` its colour, each band a little darker with a line at its inner edge. */
export function wornMesh(body: Awaited<ReturnType<typeof loadBody>>, cut: TopCut, cloth: readonly [number, number, number] = [0.36, 0.5, 0.66], index = within(body, { yFrom: 0.7 })) {
  const B = cut.spec.bands, widths = [B.neck, B.sleeve, B.hem];
  return skinMesh(body, {
    index,
    paint: (f) => {
      const arm = f.at(body.armShare) as number, e = cutEdgeAt(cut, f.x, f.y, f.z, arm);
      // (under her hem she wears charcoal leggings, as his sheet's figures do: a top is looked at over them)
      if (!(e.distance > 0)) return arm < 0.5 && f.y < Math.max(cut.spec.hemY, cut.frame.hipY + 0.16) && f.y < cut.frame.neckY - 0.2 ? LEGGINGS : null;
      const w = widths[e.edge], band = w > 0 && e.distance < w, seam = w > 0 && Math.abs(e.distance - w) < 0.0012;
      const k = seam ? 0.7 : band ? 0.86 : 1;
      return [cloth[0] * k, cloth[1] * k, cloth[2] * k];
    },
  });
}

/** Her front, her left side and her back in the cut. */
export function topViews(body: Awaited<ReturnType<typeof loadBody>>, cut: TopCut, size = 420) {
  const mesh = wornMesh(body, cut);
  return beside([0, 90, 180].map((yaw) => draw({ width: size, height: Math.round(size * 1.3), yaw, centre: [0, 1.17, 0], span: 0.62, meshes: [mesh] })));
}
/**
 * `--no-arms`: her front, three-quarter front (yaw 40), her left side and her back, her arms' skin left out (`armShare`
 * over a half at any corner of a triangle), closer on her chest: so her side under her arm is seen.
 */
export function topViewsNoArms(body: Awaited<ReturnType<typeof loadBody>>, cut: TopCut, size = 420) {
  const all = within(body, { yFrom: 0.85 }), keep: number[] = [];
  for (let k = 0; k + 2 < all.length; k += 3) if (body.armShare[all[k]] <= 0.5 && body.armShare[all[k + 1]] <= 0.5 && body.armShare[all[k + 2]] <= 0.5) keep.push(all[k], all[k + 1], all[k + 2]);
  const mesh = wornMesh(body, cut, undefined, Uint32Array.from(keep));
  return beside([0, 40, 90, 180].map((yaw) => draw({ width: size, height: size, yaw, centre: [0, 1.25, 0], span: 0.42, meshes: [mesh] })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = await loadBody(), frame = topFrame({ rest: body.rest, index: body.index, unitsPerMetre: 1, joints: body.frameJoints });
  const id = option('template', '');
  if (id) {
    const t = COVERAGE_TEMPLATES.find((x) => x.id === id);
    if (!t) throw new Error(`no template ${id}`);
    const p = t.params, hem = p.length === null && p.hemFront !== null ? p.hemFront : 0.04;
    const cut = topCut(topCutSpec(p, frame, hem), frame), out = option('out', '/tmp/top.png');
    await savePng(out, process.argv.includes('--no-arms') ? topViewsNoArms(body, cut) : topViews(body, cut));
    console.log(out);
    process.exit(0);
  }
  const style = option('style', 'crew') as NeckStyle;
  if (!(style in NECK_STYLES)) throw new Error(`no neck style ${style}`);
  const neck = Number(option('neck', String(neckDefault(style, frame)))), sleeve = Number(option('sleeve', '0.32')), hem = Number(option('hem', '0.04'));
  const cut = topCut(topCutSpec({ neckFront: neck, neckStyle: style, sleeve }, frame, hem), frame), out = option('out', '/tmp/top.png');
  await savePng(out, topViews(body, cut));
  console.log(out);
}
