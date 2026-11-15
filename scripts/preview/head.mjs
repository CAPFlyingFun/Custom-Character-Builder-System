/**
 * HER HEAD AND HER HAIR, PICTURED WITHOUT A BROWSER (`raster.mjs`): her front, three-quarter, side and back in one PNG.
 * A sketch to shape a hairstyle or a face by -- her file's own skin, one light, her face's layer (eyes, brows, lips:
 * `faceRig.ts`, a shader's) not drawn -- and not what the room is judged by.
 *
 *   node scripts/preview/head.mjs [--hair public/models/sarah-v2-hair.glb] [--out /tmp/head.png] [--size 420] [--no-hair]
 */
import { beside, draw, readPicture, savePng } from './raster.mjs';
import { gltfIo, loadBody, skinMesh, within } from './body.mjs';

const option = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const HAIR = process.argv.includes('--no-hair') ? '' : option('hair', 'public/models/sarah-v2-hair.glb');
const OUT = option('out', '/tmp/head.png'), SIZE = Number(option('size', 420));

/**
 * A skinned part made for her body (her hair: `scripts/sarahV2Recovery/hair-bake.mjs`), as a mesh for `raster.draw` in
 * her rest metres: its points through its own first bone's world and inverse bind (as her body's are), its picture's
 * alpha tested as the room tests it, its colour its picture's times its points' own.
 */
export async function loadHair(file) {
  const io = await gltfIo(), doc = await io.read(file), root = doc.getRoot(), mesh = root.listMeshes()[0], prim = mesh.listPrimitives()[0];
  const skin = root.listSkins()[0], j0 = skin.listJoints()[0].getWorldMatrix(), ib = Array.from(skin.getInverseBindMatrices().getArray().slice(0, 16));
  const T = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) T[c * 4 + r] += j0[k * 4 + r] * ib[c * 4 + k];
  const floats = (a, size) => { const out = new Float32Array(a.getCount() * size), e = []; for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); for (let c = 0; c < size; c++) out[i * size + c] = e[c]; } return out; };
  const P = floats(prim.getAttribute('POSITION'), 3), N = floats(prim.getAttribute('NORMAL'), 3), n = P.length / 3, pos = new Float32Array(P.length), nrm = new Float32Array(P.length);
  for (let v = 0; v < n; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    for (let c = 0; c < 3; c++) pos[v * 3 + c] = T[c] * x + T[4 + c] * y + T[8 + c] * z + T[12 + c];
    const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; for (let c = 0; c < 3; c++) nrm[v * 3 + c] = N[v * 3 + c] / l;
  }
  const uv = floats(prim.getAttribute('TEXCOORD_0'), 2), colourAt = prim.getAttribute('COLOR_0'), colour = colourAt ? floats(colourAt, colourAt.getElementSize()) : null, cs = colourAt ? colourAt.getElementSize() : 0;
  const image = prim.getMaterial()?.getBaseColorTexture()?.getImage(), picture = image ? await readPicture(Buffer.from(image)) : null;
  const texel = (f) => { const [u, v] = f.at(uv, 2); return picture ? picture.texel(u, v) : [0.5, 0.3, 0.2, 1]; };
  return {
    pos, nrm, index: Uint32Array.from(prim.getIndices().getArray()), twoSided: true, uv, colour, picture,
    keep: (f) => texel(f)[3] >= 0.5,
    shade: (f) => { const t = texel(f), k = colour ? f.at(colour, cs) : [1, 1, 1]; return [t[0] * k[0] * f.light, t[1] * k[1] * f.light, t[2] * k[2] * f.light]; },
  };
}

/** Her head from four sides, with what is given to wear on it. */
export function headViews(body, extra = [], size = SIZE) {
  const skin = skinMesh(body, { index: within(body, { yFrom: 1.3 }) });
  return beside([0, 40, 90, 180].map((yaw) => draw({ width: size, height: Math.round(size * 1.25), yaw, pitch: 4, centre: [0, 1.555, -0.03], span: 0.36, meshes: [skin, ...extra] })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = await loadBody(), hair = HAIR ? await loadHair(HAIR) : null, t0 = Date.now();
  await savePng(OUT, headViews(body, hair ? [hair] : []));
  console.log(`${OUT} (${Date.now() - t0} ms${hair ? `; hair ${hair.pos.length / 3} points, ${hair.index.length / 3} triangles` : ''})`);
}
