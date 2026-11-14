// THE HOME SCREEN'S ICONS, drawn from `public/icons/icon.svg` (Joshua, 2026-11-13: "especially if I have it saved as a
// PWA"). A phone's Home Screen wants a picture with no see-through corners (it rounds them itself); a "maskable" icon is
// cropped to a circle or a squircle by the phone, so its mark sits inside the middle four fifths.
//   node scripts/makeIcons.mjs
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
// the same mark, smaller about the middle, for the icon a phone may crop
const MARK = '<g id="mark" transform="translate(0 -24)">';
if (!svg.includes(MARK)) throw new Error('icon.svg: its mark is not where this script looks for it');
const maskable = svg.replace(MARK, '<g id="mark" transform="translate(256 256) scale(0.74) translate(-256 -280)">');
const out = [
  ['public/icons/apple-touch-icon.png', svg, 180],
  ['public/icons/icon-192.png', svg, 192],
  ['public/icons/icon-512.png', svg, 512],
  ['public/icons/icon-maskable-512.png', maskable, 512],
];
for (const [file, source, size] of out) {
  await sharp(Buffer.from(source), { density: 72 * (size / 512) * 4 }).resize(size, size).flatten({ background: '#16201d' }).png({ compressionLevel: 9 }).toFile(file);
  console.log(file, size);
}
