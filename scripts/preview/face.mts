/**
 * HER FACE'S COLOURS, PICTURED WITHOUT A BROWSER (`raster.mjs`): her face close up, front and three-quarter, with her
 * face's layer PAINTED BY THE SHADER'S CPU MIRRORS (`faceRig.ts` `faceEyeLayer`, `faceLipLayer`, `faceBrowAlpha`) over
 * her skin's picture, in linear light as the shader works. Sheets: every eye colour, every lip colour, Lena's look
 * (`docs/reference/lena/`: dark brown eyes, thick dark brows, a natural rose), and her own. A sketch: her brows' hairs
 * are a hash the GPU draws and are shown here as their band's tone only; one light; the room is what it is judged by.
 *
 *   npx tsx scripts/preview/face.mts [--out preview-out] [--size 360]
 * It also prints the mean linear luminance of her skin's picture over her lips' shape (`FACE_LIPS.skinLuminance`).
 */
import { mkdirSync } from 'node:fs';
import { beside, draw, savePng, stacked, type Picture } from './raster.mjs';
import { loadBody, within } from './body.mjs';
import { FACE_BROWS, FACE_DEFAULTS, faceBrowAlpha, faceEyeLayer, faceLipAlpha, faceLipLayer, type FaceRigState } from '../../src/sarahlab/faceRig';
import { EYE_COLOURS, LIP_COLOURS, faceRigLook, irisMean } from '../../src/sarahlab/faceLook';
import { HEAD_DEFAULT, colourLinear, type HeadLook } from '../../src/sarahlab/headLook';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const OUT = option('out', 'preview-out'), SIZE = Number(option('size', '360'));
type Rgb = [number, number, number];
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const srgb = (c: number) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055; };

const body = await loadBody();
const index = within(body, { yFrom: 1.46 });
const skinAt = (f: { at(a: ArrayLike<number>, s?: number): number | number[] }): Rgb => {
  const [u, v] = f.at(body.uv, 2) as number[], t = body.skin!.texel(u, v);
  return [lin(t[0]), lin(t[1]), lin(t[2])];
};

/** Her face's layer over her skin at a pixel, as the shader lays it: lips, eyes, then brows (their band's tone). */
function faceMesh(state: FaceRigState) {
  return {
    pos: body.rest, index, nrm: body.normal,
    shade: (f: Parameters<typeof skinAt>[0] & { x: number; y: number; z: number; light: number }) => {
      const rest: Rgb = [f.x, f.y, f.z];
      let c = faceLipLayer(skinAt(f), rest, state);
      const eye = faceEyeLayer(c, rest, state);
      c = eye.colour;
      const a = faceBrowAlpha(rest, state.brow ?? FACE_DEFAULTS.brow) * 0.8, bc = state.browColour ?? FACE_BROWS.colour;
      c = c.map((x, i) => x * (1 - a) + bc[i] * a) as Rgb;
      const light = eye.wet > 0.5 ? 0.85 + 0.15 * f.light : f.light;
      return c.map((x) => srgb(x * light));
    },
  };
}
const look = (eyes: string | null, lips: string | null, brows: string | null = null): HeadLook => ({ ...HEAD_DEFAULT, eyes: { colour: eyes }, lips: { ...HEAD_DEFAULT.lips, colour: lips }, brows: { ...HEAD_DEFAULT.brows, colour: brows } });
const stateOf = (h: HeadLook): FaceRigState => ({ jaw: 0, blink: 0, gazeRight: [0, 0, 1], gazeLeft: [0, 0, 1], ...faceRigLook(h, null) });
const eyesView = (s: FaceRigState) => draw({ width: SIZE, height: Math.round(SIZE * 0.45), centre: [0, 1.583, 0], span: 0.11, meshes: [faceMesh(s)] });
const lipsView = (s: FaceRigState) => draw({ width: SIZE, height: Math.round(SIZE * 0.6), centre: [0, 1.519, 0], span: 0.07, meshes: [faceMesh(s)] });
const faceViews = (s: FaceRigState) => beside([0, 35].map((yaw) => draw({ width: SIZE, height: Math.round(SIZE * 1.2), yaw, centre: [0, 1.56, 0], span: 0.17, meshes: [faceMesh(s)] })));
const grid = (pics: Picture[], across: number) => { const rows: Picture[] = []; for (let i = 0; i < pics.length; i += across) rows.push(beside(pics.slice(i, i + across))); return stacked(rows); };

mkdirSync(OUT, { recursive: true });
// her lips' skin, measured: the mean linear luminance of her skin's picture under her lips' shape, weighted by it
{
  let sum = 0, w = 0;
  for (let v = 0; v < body.rest.length / 3; v++) {
    const a = faceLipAlpha([body.rest[v * 3], body.rest[v * 3 + 1], body.rest[v * 3 + 2]]);
    if (!(a > 0)) continue;
    const t = body.skin!.texel(body.uv[v * 2], body.uv[v * 2 + 1]);
    sum += a * (0.2126 * lin(t[0]) + 0.7152 * lin(t[1]) + 0.0722 * lin(t[2])); w += a;
  }
  console.log(`lips' skin luminance (linear, mean over her lips' shape): ${(sum / w).toFixed(3)} over ${w.toFixed(1)} weight`);
}
for (const s of EYE_COLOURS) {
  const m = irisMean(faceRigLook(look(s.colour, null), null)), want = colourLinear(s.colour);
  console.log(`${s.id.padEnd(12)} want ${want.map((x) => x.toFixed(3)).join(' ')}  shown ${m.map((x) => x.toFixed(3)).join(' ')}`);
}
console.log(await savePng(`${OUT}/face-eyes.png`, grid([eyesView(stateOf(HEAD_DEFAULT)), ...EYE_COLOURS.map((s) => eyesView(stateOf(look(s.colour, null))))], 4)));
console.log(await savePng(`${OUT}/face-lips.png`, grid([lipsView(stateOf(HEAD_DEFAULT)), ...LIP_COLOURS.map((s) => lipsView(stateOf(look(null, s.colour))))], 4)));
console.log(await savePng(`${OUT}/face-lena.png`, faceViews({ ...stateOf(look('#3d2516', '#b46d6a', '#2a1a12')) })));
console.log(await savePng(`${OUT}/face-own.png`, faceViews(stateOf(HEAD_DEFAULT))));
