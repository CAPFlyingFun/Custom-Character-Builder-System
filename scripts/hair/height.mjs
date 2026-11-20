#!/usr/bin/env node
/**
 * HER STRANDS' HEIGHT MAP: the strand atlas (every style's file carries the same one) through his Local Texture Lab's
 * Convert mode (`scripts/skinHeight.mjs`), its fine detail full and its broad form low, so each strand is a ridge.
 * Writes `public/models/hair/hair-height-1024.png`. Run again after `texture.mjs` paints the atlas anew.
 *   node scripts/hair/height.mjs
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** GAME TUNING: the lab's sliders for strands. */
export const HAIR_CONVERT = Object.freeze({ large: 15, detail: 100, contrast: 160 });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
try { const { MeshoptDecoder } = await import('meshoptimizer'); await MeshoptDecoder.ready; io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder }); } catch { /* not compressed */ }
const doc = await io.read('public/models/hair/ponytail.glb');
const tex = doc.getRoot().listTextures()[0];
const dir = mkdtempSync(join(tmpdir(), 'hair-')), atlas = join(dir, 'atlas.webp');
writeFileSync(atlas, tex.getImage());
const C = HAIR_CONVERT;
execFileSync('node', ['scripts/skinHeight.mjs', '--in', atlas, '--out', 'models/hair/hair-height-1024.png', '--large', `${C.large}`, '--detail', `${C.detail}`, '--contrast', `${C.contrast}`], { stdio: 'inherit' });

// ALONG A STRAND IT IS SMOOTH: the atlas's strands run down it (root at the top of each cell), and a height that changes
// along a strand drew rungs across her hair, a ladder over the top of her head (MEASURED in the room, 2026-11-19). So the
// map is evened down each column, `ALONG_PX` either side, and only its change across the strands is kept.
const { default: sharp } = await import('sharp');
export const ALONG_PX = 24;
const OUT = 'public/models/hair/hair-height-1024.png';
const { data, info } = await sharp(OUT).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, ch = info.channels, out = Buffer.alloc(w * h);
for (let x = 0; x < w; x++) {
  let sum = 0, n = 0;
  for (let y = 0; y < Math.min(h, ALONG_PX + 1); y++) { sum += data[(y * w + x) * ch]; n++; }
  for (let y = 0; y < h; y++) {
    out[y * w + x] = Math.round(sum / n);
    const add = y + ALONG_PX + 1, drop = y - ALONG_PX;
    if (add < h) { sum += data[(add * w + x) * ch]; n++; }
    if (drop >= 0) { sum -= data[(drop * w + x) * ch]; n--; }
  }
}
await sharp(out, { raw: { width: w, height: h, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9 }).toFile(OUT);
console.log(`${OUT}: evened along its strands (${ALONG_PX} px either side)`);

// AND ITS NORMAL MAP, by the lab's own `normalCanvas` (strength 125, its default; OpenGL's green): the room draws her
// strands' depth from THIS, filtered as a picture is at every distance. Drawn from the height's slope across the screen
// instead, strands thinner than a pixel came out as a woven checker over her hair (MEASURED in the room, 2026-11-19).
export const NORMAL_STRENGTH = 125;
{
  const { data: hd } = await sharp(OUT).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => hd[(((y + h) % h) * w + ((x + w) % w))] / 255, k = (NORMAL_STRENGTH / 100) * 2.2, nm = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
    let nx = -dx, ny = -dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const j = (y * w + x) * 3; nm[j] = Math.round((nx * 0.5 + 0.5) * 255); nm[j + 1] = Math.round((ny * 0.5 + 0.5) * 255); nm[j + 2] = Math.round((nz * 0.5 + 0.5) * 255);
  }
  await sharp(nm, { raw: { width: w, height: h, channels: 3 } }).png({ compressionLevel: 9 }).toFile('public/models/hair/hair-normal-1024.png');
  console.log('public/models/hair/hair-normal-1024.png: its normal map');
}
