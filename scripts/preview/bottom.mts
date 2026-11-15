/**
 * A DRAWN BOTTOM'S CUT ON HER, PICTURED WITHOUT A BROWSER (`raster.mjs`): her front, her three-quarter, her side and
 * her back, her rest shape (her body file's, with its 100% belly), each pixel of her skin asking the cut whether it is
 * cloth exactly as the room's shader does (`bottomCut.lowAt`: its waistband's line round her, its legs' ends on her
 * leg's skin) and a band along each edge shown darker with its seam. A sketch to shape a cut by: no fabric's weave, her
 * rest pose only, and none of her shapes' slides -- the room's own pictures are what a cut is judged by.
 *
 *   npx tsx scripts/preview/bottom.mts --template leggingsFull|leggingsUnder|shortsBike|stockings|... [--out /tmp/bottom.png]
 *   npx tsx scripts/preview/bottom.mts --all [--out /tmp/bottoms.png]      (every drawn bottom, a row each)
 */
import { beside, draw, savePng, stacked } from './raster.mjs';
import { loadBody, skinMesh, within } from './body.mjs';
import { COVERAGE_TEMPLATES } from '../../src/sarahlab/paintTemplates';
import { isDrawnBottom, legBlend, legMeasure, legOf, legPlanes, legShareOf, lowAt, lowFrame, lowSpec, type LowFrame, type LowSpec } from '../../src/sarahlab/bottomCut';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
type Body = Awaited<ReturnType<typeof loadBody>>;

/** Her skin with a bottom on it, as a mesh for `raster.draw`: `cloth` its colour, each band a little darker with a line at its inner edge. */
export function wornMesh(body: Body, frame: LowFrame, spec: LowSpec, cloth: readonly [number, number, number] = [0.27, 0.28, 0.31], index = within(body, { yTo: 1.3 })) {
  const cuts = frame.legs.map((leg) => ({ planes: legPlanes(leg), blend: legBlend(leg, frame.unitsPerMetre) }));
  return skinMesh(body, {
    index,
    paint: (f) => {
      const limb = f.at(body.limb) as number;
      if (limb > 0.5) return null;
      const c = cuts[legOf(frame, f.x) === frame.legs[0] ? 0 : 1], along = legMeasure(c.planes, c.blend, [f.x, f.y, f.z]);
      const e = lowAt(spec, frame, [f.x, f.y, f.z], along, limb);
      if (!(e.inside > 0)) return null;
      const B = spec.bands, leg = legShareOf(limb) > 0.5;
      const edges: [number, number][] = [[e.banded, B.waist], ...(leg ? [[e.end, B.leg], [e.top, B.top]] as [number, number][] : [])];
      let k = 1;
      for (const [d, w] of edges) { if (!(w > 0)) continue; if (Math.abs(d - w) < 0.0012) k = Math.min(k, 0.7); else if (d < w) k = Math.min(k, 0.86); }
      return [cloth[0] * k, cloth[1] * k, cloth[2] * k];
    },
  });
}

/** Her front, her three-quarter, her left side and her back in the bottom, from her bust down. */
export function bottomViews(body: Body, frame: LowFrame, spec: LowSpec, size = 380, cloth?: readonly [number, number, number]) {
  const mesh = wornMesh(body, frame, spec, cloth);
  return beside([0, 40, 90, 180].map((yaw) => draw({ width: size, height: Math.round(size * 1.75), yaw, centre: [0, 0.62, 0], span: 1.32, meshes: [mesh] })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = await loadBody(), frame = lowFrame({ unitsPerMetre: 1, joints: body.lowJoints });
  const all = process.argv.includes('--all'), out = option('out', all ? '/tmp/bottoms.png' : '/tmp/bottom.png');
  const ids = all ? COVERAGE_TEMPLATES.filter((t) => isDrawnBottom(t.params)).map((t) => t.id) : [option('template', 'leggingsFull')];
  const rows = ids.map((id) => {
    const t = COVERAGE_TEMPLATES.find((x) => x.id === id);
    if (!t) throw new Error(`no template ${id}`);
    if (!isDrawnBottom(t.params)) throw new Error(`${id} is not a drawn bottom`);
    const spec = lowSpec(t.params, frame);
    console.log(`${id}: waist ${spec.waist ? spec.waist.slice(0, 3).map((y) => (y * 100).toFixed(1)).join(' / ') + ' cm up' : 'none'}, legs ${spec.start === null ? 'from her hips' : `from ${(spec.start * 100).toFixed(1)} cm`} ${spec.end === null ? 'over her feet' : `to ${(spec.end * 100).toFixed(1)} cm`} along her leg; bands ${[spec.bands.waist, spec.bands.leg, spec.bands.top].map((b) => (b * 1000).toFixed(0)).join(' / ')} mm`);
    return bottomViews(body, frame, spec, all ? 260 : 380, t.params.feet ? [0.2, 0.2, 0.24] : undefined);
  });
  await savePng(out, rows.length === 1 ? rows[0] : stacked(rows));
  console.log(out);
}
