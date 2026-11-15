// THE FLAT FAMILY'S TWO ATLASES (Joshua, 2026-11-14: a colour with no weave beside the pack's knits -- "go ahead and add
// that in"). Its sixteen colours are `SWATCH_HEX.flat` in `src/sarahlab/fabricLibrary.ts`, read from there so the room's
// colour buttons and what is drawn on her are one list. Laid out as the pack's atlases are: the plain one a 4 x 4 grid,
// the trim one sixteen strips top to bottom, in the pack's colour order. PNG: every pixel is exactly its colour.
//   node scripts/makeFlatFabric.mjs
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const SIZE = 256;
const source = readFileSync('src/sarahlab/fabricLibrary.ts', 'utf8');
const line = /^\s*flat: Object\.freeze\(\[(.*)\]\),\s*$/m.exec(source);
if (!line) throw new Error('fabricLibrary.ts: SWATCH_HEX.flat is not where this script looks for it');
const colours = [...line[1].matchAll(/'#([0-9a-f]{6})'/g)].map((m) => [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16)));
if (colours.length !== 16) throw new Error(`fabricLibrary.ts: SWATCH_HEX.flat has ${colours.length} colours, not sixteen`);

const picture = (colourAt) => {
  const px = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px.set(colours[colourAt(x, y)], (y * SIZE + x) * 3);
  return sharp(px, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png({ compressionLevel: 9 });
};
const cell = SIZE / 4, strip = SIZE / 16;
await picture((x, y) => Math.floor(y / cell) * 4 + Math.floor(x / cell)).toFile('public/fabrics/flat-plain.png');
await picture((_x, y) => Math.floor(y / strip)).toFile('public/fabrics/flat-trim.png');
console.log('public/fabrics/flat-plain.png, public/fabrics/flat-trim.png:', SIZE, 'px,', colours.length, 'colours');
