/**
 * A HAIRSTYLE PICTURED WITHOUT A BROWSER (the toolkit's preview, on `scripts/preview/`): her head and shoulders with a
 * style from her front, three-quarter, side, back and her other three-quarter, in one PNG. Wide enough to see hair that
 * falls over a shoulder; the texture read smoothly (bilinear) and its alpha tested at the material's cutoff, 0.42, as
 * the room tests it; vertex colour multiplying it.
 *
 *   node scripts/hair/preview.mjs --style <id> [--light] --out preview-out/<id>.png
 *   node scripts/hair/preview.mjs --file public/models/hair/<id>.glb --out x.png
 *        [--colour '#rrggbb'] [--shorter 0..1] [--size 360] [--span 0.5] [--centre-y 1.47] [--yaws 0,40,90,180,-40]
 *
 * (`--span` metres across a view and `--centre-y` its middle's height: `--span 0.26 --centre-y 1.58` is her head close.)
 * `--body male`: on HIS head (`head.mjs` `BODIES.male`), in his own skin's grey (his picture is not read).
 *
 * `--style` bakes the style first (to `preview-out/<id>[-light].glb`). `--colour` re-tints the texture's tone to SEE a
 * style in another colour (the real colour is the material's, `hairMaterial.ts`). `--shorter` sets the length morph.
 * A SKETCH TO WORK BY: her body file's own shape, one light, none of the room's shaders.
 */
import { mkdirSync } from 'node:fs';
import { beside, draw, savePng } from '../preview/raster.mjs';
import { gltfIo, loadBody, skinMesh, within } from '../preview/body.mjs';
import sharp from 'sharp';

const option = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
/** The material's alpha cutoff (`glb.mjs`). */
const CUTOFF = 0.42;
/** The copper atlas's mean tone (PAL.mid's luminance, `texture.mjs`): a re-tint maps it to the colour asked for. */
const MID_LUMA = 0.3 * 0.45 + 0.59 * 0.20 + 0.11 * 0.10;

/** A picture with a smooth look-up: texel(u, v) -> [r, g, b, a], bilinear, wrapping (v as glTF has it, 0 at the top). */
async function smoothPicture(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const at = (x, y, c) => data[(((y % H) + H) % H * W + ((x % W) + W) % W) * 4 + c] / 255;
  return (u, v) => {
    const x = (u - Math.floor(u)) * W - 0.5, y = (v - Math.floor(v)) * H - 0.5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const out = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) out[c] = (at(x0, y0, c) * (1 - fx) + at(x0 + 1, y0, c) * fx) * (1 - fy) + (at(x0, y0 + 1, c) * (1 - fx) + at(x0 + 1, y0 + 1, c) * fx) * fy;
    return out;
  };
}

/** A hair file as a mesh for `raster.draw`, in her rest metres, its `shorter` morph at `shorter`, re-tinted to `colour`. */
export async function loadHairFile(file, { shorter = 0, colour = null } = {}) {
  const io = await gltfIo(), doc = await io.read(file), root = doc.getRoot(), prim = root.listMeshes()[0].listPrimitives()[0];
  const skin = root.listSkins()[0], j0 = skin.listJoints()[0].getWorldMatrix(), ib = Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16));
  const T = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) T[c * 4 + r] += j0[k * 4 + r] * ib[c * 4 + k];
  const floats = (a, size) => { const o = new Float32Array(a.getCount() * size), e = []; for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); for (let c = 0; c < size; c++) o[i * size + c] = e[c]; } return o; };
  const P = floats(prim.getAttribute('POSITION'), 3), N = floats(prim.getAttribute('NORMAL'), 3), n = P.length / 3;
  const target = prim.listTargets()[0];
  if (target && shorter) {
    const dp = floats(target.getAttribute('POSITION'), 3), dn = target.getAttribute('NORMAL') ? floats(target.getAttribute('NORMAL'), 3) : null;
    for (let i = 0; i < P.length; i++) { P[i] += dp[i] * shorter; if (dn) N[i] += dn[i] * shorter; }
  }
  const pos = new Float32Array(P.length), nrm = new Float32Array(P.length);
  for (let v = 0; v < n; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    for (let c = 0; c < 3; c++) pos[v * 3 + c] = T[c] * x + T[4 + c] * y + T[8 + c] * z + T[12 + c];
    const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; for (let c = 0; c < 3; c++) nrm[v * 3 + c] = N[v * 3 + c] / l;
  }
  const uv = floats(prim.getAttribute('TEXCOORD_0'), 2), ca = prim.getAttribute('COLOR_0'), cs = ca.getElementSize(), col = floats(ca, cs);
  const texel = await smoothPicture(Buffer.from(prim.getMaterial().getBaseColorTexture().getImage()));
  const tint = colour ? [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16) / 255) : null;
  const look = (f) => { const [u, v] = f.at(uv, 2); return texel(u, v); };
  return {
    pos, nrm, index: Uint32Array.from(prim.getIndices().getArray()), twoSided: true, hasLength: !!target,
    keep: (f) => look(f)[3] * (cs === 4 ? f.at(col, 4)[3] : 1) >= CUTOFF,
    shade: (f) => {
      let t = look(f); const k = f.at(col, cs);
      if (tint) { const l = (0.3 * t[0] + 0.59 * t[1] + 0.11 * t[2]) / MID_LUMA; t = [tint[0] * l, tint[1] * l, tint[2] * l]; }
      // a glint where the light lies along the hair, as the room's sheen gives it (a sketch's)
      const g = 0.12 * Math.pow(f.light, 6);
      return [Math.min(1, t[0] * k[0] * f.light + g), Math.min(1, t[1] * k[1] * f.light + g), Math.min(1, t[2] * k[2] * f.light + g)];
    },
  };
}

/**
 * A body read plainly (his: `loadBody` reads hers, with her arms' and her shapes' own checks): its skin's points through
 * its first bone's world and inverse bind, as a hair file's are, its normals, its triangles.
 */
async function plainBody(file) {
  const io = await gltfIo(), doc = await io.read(file), root = doc.getRoot(), prim = root.listMeshes()[0].listPrimitives()[0];
  const skin = root.listSkins()[0], j0 = skin.listJoints()[0].getWorldMatrix(), ib = Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16));
  const T = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) T[c * 4 + r] += j0[k * 4 + r] * ib[c * 4 + k];
  const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), n = P.getCount(), rest = new Float32Array(n * 3), normal = new Float32Array(n * 3), e = [], m = [];
  for (let v = 0; v < n; v++) {
    P.getElement(v, e); N.getElement(v, m);
    for (let c = 0; c < 3; c++) rest[v * 3 + c] = T[c] * e[0] + T[4 + c] * e[1] + T[8 + c] * e[2] + T[12 + c];
    const l = Math.hypot(m[0], m[1], m[2]) || 1; for (let c = 0; c < 3; c++) normal[v * 3 + c] = m[c] / l;
  }
  return { rest, normal, index: Uint32Array.from(prim.getIndices().getArray()), skin: null, uv: null };
}

/** Her head and shoulders from five sides with what is given to wear. */
export function hairViews(body, extra = [], size = 360, { span = 0.5, centreY = 1.47, yaws = [0, 40, 90, 180, -40], centre = null } = {}) {
  const skin = skinMesh(body, { index: within(body, { yFrom: 1.12, xFrom: -0.24, xTo: 0.24 }) });
  return beside(yaws.map((yaw) => draw({ width: size, height: Math.round(size * 1.3), yaw, pitch: 4, centre: centre ?? [0, centreY, -0.06], span, meshes: [skin, ...extra] })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = option('style', ''), light = process.argv.includes('--light'), size = Number(option('size', 360));
  const { BODIES, fromRest } = await import('./head.mjs'), who = BODIES[option('body', 'female')];
  if (!who) throw new Error(`preview: no body ${option('body', '')}`);
  let file = option('file', '');
  if (id) {
    const { loadStyle, buildStyle } = await import('./bake.mjs'), { loadHead } = await import('./head.mjs');
    const { paintAtlas } = await import('./texture.mjs'), { writeHair } = await import('./glb.mjs');
    mkdirSync('preview-out', { recursive: true });
    file = `preview-out/${who === BODIES.male ? 'male-' : ''}${id}${light ? '-light' : ''}.glb`;
    const style = await loadStyle(id), head = await loadHead(who.file, who.id), built = await buildStyle(style, { head, light });
    const { webp } = await paintAtlas(1024);
    const r = await writeHair({ bodyFile: who.file, target: file, built: built.long.out, parts: built.long.parts, shorter: built.short?.out ?? null, webp, texSize: 1024, style: id, body: who.id });
    console.log(`${file}: ${r.vertices} vertices, ${r.triangles} triangles${built.report ? `; ${built.report}` : ''}`);
  }
  if (!file) throw new Error('preview: --style <id> or --file <glb>');
  const out = option('out', `preview-out/${id || 'hair'}.png`);
  const male = who === BODIES.male;
  const body = male ? await plainBody(who.file) : await loadBody(), hair = await loadHairFile(file, { shorter: Number(option('shorter', 0)), colour: option('colour', null) });
  const yaws = option('yaws', '') ? option('yaws', '').split(',').map(Number) : undefined, centreY = Number(option('centre-y', 1.47));
  // (his pictures are in his own geometry: the middle of a view is the same place of the style's frame, taken there)
  await savePng(out, hairViews(body, [hair], size, { span: Number(option('span', 0.5)), centreY, yaws, centre: male ? fromRest(who, [0, centreY, -0.06]) : null }));
  console.log(out);
}
