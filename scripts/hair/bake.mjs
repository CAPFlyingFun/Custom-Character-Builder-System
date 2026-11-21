/**
 * BAKE A HAIRSTYLE (the toolkit, `scripts/hair/`): a style's file, built from `scripts/hair/styles/<id>.mjs`.
 *
 *   node scripts/hair/bake.mjs --style <id> [--out public/models/hair/<id>.glb] [--light] [--texture 1024]
 *                              [--no-length] [--as-today] [--body male]
 *
 * `--body male` builds it on HIS head (`head.mjs` `BODIES.male`) into `public/models/hair/male/<id>[-light].glb`.
 * The style is built at its longest and, unless it says it has one length (`length: false`) or `--no-length` is given,
 * again at its shortest: the two must make the same points, and the difference is written as the `shorter` morph.
 * `--light` builds it with `kit.light` (a fifth of the triangles) to `<id>-light.glb`. `--as-today` writes the first
 * hairstyle's script's extras and no morph, for a byte-for-byte comparison with `public/models/sarah-v2-hair.glb`.
 * Deterministic: a style's seeds, no clock.
 */
import { BODIES, loadHead } from './head.mjs';
import { makeKit } from './kit.mjs';
import { paintAtlas } from './texture.mjs';
import { writeHair } from './glb.mjs';

const option = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const flag = (name) => process.argv.includes(`--${name}`);

/** A style module by id. */
export async function loadStyle(id) {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(id)) throw new Error(`hair: bad style id ${id}`);
  return (await import(`./styles/${id}.mjs`)).default;
}

/** Build a style: { long: kit at length 1, short: kit at length 0 or null, report }. */
export async function buildStyle(style, { head, light = false, withLength = true }) {
  const long = makeKit(head, { light, length: 1 }), built = style.build(long) ?? {};
  let short = null;
  if (withLength && style.length !== false) {
    short = makeKit(head, { light, length: 0 }); style.build(short);
    if (short.out.pos.length !== long.out.pos.length || short.out.index.length !== long.out.index.length) throw new Error(`hair: ${style.id}'s shortest makes other points than its longest`);
    let moved = 0; for (let i = 0; i < long.out.pos.length; i++) moved = Math.max(moved, Math.abs(short.out.pos[i] - long.out.pos[i]));
    if (moved === 0) short = null;
  }
  return { long, short, report: built.report ?? '' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = option('style', 'ponytail'), light = flag('light'), asToday = flag('as-today'), TEX = Number(option('texture', 1024));
  const body = BODIES[option('body', 'female')];
  if (!body) throw new Error(`hair: no body ${option('body', '')} (${Object.keys(BODIES).join(', ')})`);
  const target = option('out', `public/models/hair/${body === BODIES.male ? 'male/' : ''}${id}${light ? '-light' : ''}.glb`), bodyFile = body.file;
  const style = await loadStyle(id), head = await loadHead(bodyFile, body.id);
  const { long, short, report } = await buildStyle(style, { head, light, withLength: !asToday && !flag('no-length') });
  const { png, webp } = await paintAtlas(TEX);
  const r = await writeHair({ bodyFile, target, built: long.out, parts: long.parts, shorter: short?.out ?? null, webp, texSize: TEX, style: id, asToday, body: body.id });
  console.log(`${target}: ${r.kb.toFixed(0)} KB · ${r.vertices} vertices · ${r.triangles} triangles · texture ${TEX}² (WebP ${(webp.length / 1024).toFixed(0)} KB; PNG would be ${(png.length / 1024).toFixed(0)} KB)${short ? ' · morph shorter' : ''}`);
  for (const [name, p] of Object.entries(long.parts)) console.log(`  ${name}: ${p.vertices} vertices, ${p.triangles} triangles`);
  if (report) console.log(`  ${report}`);
}
