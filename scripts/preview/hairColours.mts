/**
 * HER HAIR IN EVERY COLOUR, PICTURED WITHOUT A BROWSER (`raster.mjs`): today's hair file drawn in HER OWN and each of the
 * swatches (`hairColours.ts`), every pixel's texel through the CPU functions (`hairTone`, `hairRamp`, `hairColourAt`) as
 * the material does it. A sketch to tune the ramps by: one light, her skin's own picture, none of the room's shading.
 *
 *   npx tsx scripts/preview/hairColours.mts [--out preview-out/hair-colours.png] [--yaw 25] [--size 300]
 */
import { beside, draw, savePng, stacked } from './raster.mjs';
import { loadBody, skinMesh, within } from './body.mjs';
import { HAIR_COLOURS, hairColourAt, hairRamp, hairTone } from '../../src/sarahlab/hairColours';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const OUT = option('out', 'preview-out/hair-colours.png'), YAW = Number(option('yaw', '25')), SIZE = Number(option('size', '300')), COLS = 6;
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

// head.mjs has no declaration file and is not this script's to add one to: its hair is typed by what is used of it here
interface Hair { pos: Float32Array; index: Uint32Array; twoSided: boolean; keep(f: any): boolean; shade(f: any): number[]; picture: { texel(u: number, v: number): number[] } | null; uv: Float32Array; colour: Float32Array | null }
const { loadHair } = (await import('./head.mjs' as string)) as { loadHair(file: string): Promise<Hair> };
const body = await loadBody(), hair = await loadHair('public/models/sarah-v2-hair.glb');
const skin = skinMesh(body, { index: within(body, { yFrom: 1.3 }) });
const cell = (colour: string | null) => {
  const ramp = colour ? hairRamp(colour) : null;
  const mesh = { ...hair, shade: (f: any) => {
    if (!ramp) return hair.shade(f);
    const t = hair.picture!.texel(...(f.at(hair.uv, 2) as [number, number])), k = hair.colour ? (f.at(hair.colour, 4) as number[]) : [1, 1, 1];
    const c = hairColourAt(hairTone([t[0], t[1], t[2]]), ramp).map(toSrgb);
    return [c[0] * k[0] * f.light, c[1] * k[1] * f.light, c[2] * k[2] * f.light];
  } };
  return draw({ width: SIZE, height: Math.round(SIZE * 1.2), yaw: YAW, pitch: 4, centre: [0, 1.555, -0.03], span: 0.36, meshes: [skin, mesh] });
};
const all: (string | null)[] = [null, ...HAIR_COLOURS.map((h) => h.colour)];
const pics = all.map(cell), rows = [];
for (let i = 0; i < pics.length; i += COLS) rows.push(beside(pics.slice(i, i + COLS)));
await savePng(OUT, stacked(rows));
console.log(`${OUT}: HER OWN + ${HAIR_COLOURS.map((h) => h.id).join(', ')}`);
