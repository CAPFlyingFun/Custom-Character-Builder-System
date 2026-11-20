#!/usr/bin/env node
/**
 * HER OWN SKIN'S DEPTH: a height map made from her skin picture itself, by his Local Texture Lab's Convert mode with its
 * own default settings (`tools/local-texture-lab.html` `generateFromImage`: luminance, a broad blur of it, LARGE FORM 62,
 * IMAGE DETAIL 35, HEIGHT CONTRAST 125, levels 4 to 96) -- as Galaxy Defender's agent made hers (Joshua, 2026-11-19).
 * Its SEAMLESS edge blend is left off: her picture is a layout of separate pieces of her body, and blended at its edges
 * it is torn into patches (his IMG_6313.png). Read at the same place as her colour (her UVs), so every shade of her skin
 * picture has its depth just there.
 *   node scripts/skinHeight.mjs [--in models/skins/sarah-v2-skin-even-2048.webp] [--out models/skins/sarah-v2-skin-height-2048.png]
 */
import sharp from 'sharp';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const IN = `public/${arg('in', 'models/skins/sarah-v2-skin-even-2048.webp')}`, OUT = `public/${arg('out', 'models/skins/sarah-v2-skin-height-2048.png')}`;
/** the lab's defaults, as its sliders open */
export const LAB_CONVERT = Object.freeze({ largeForm: 62, imageDetail: 35, heightContrast: 125, heightLow: 4, heightHigh: 96 });

const clamp = (v) => Math.min(1, Math.max(0, v)), lerp = (a, b, t) => a + (b - a) * t;
function boxBlurGray(gray, w, h, radius) { // the lab's, wrapping as it does
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), r = Math.max(1, Math.floor(radius));
  for (let y = 0; y < h; y++) { let sum = 0; for (let k = -r; k <= r; k++) sum += gray[y * w + ((k + w) % w)];
    for (let x = 0; x < w; x++) { tmp[y * w + x] = sum / (r * 2 + 1); sum -= gray[y * w + ((x - r + w) % w)]; sum += gray[y * w + ((x + r + 1) % w)]; } }
  for (let x = 0; x < w; x++) { let sum = 0; for (let k = -r; k <= r; k++) sum += tmp[((k + h) % h) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = sum / (r * 2 + 1); sum -= tmp[((y - r + h) % h) * w + x]; sum += tmp[((y + r + 1) % h) * w + x]; } }
  return out;
}
const { data, info } = await sharp(IN).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, lum = new Float32Array(w * h);
for (let i = 0, j = 0; j < lum.length; i += 3, j++) lum[j] = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
const broad = boxBlurGray(lum, w, h, Math.max(2, Math.round(w / 128))), L = LAB_CONVERT, out = Buffer.alloc(w * h);
const lo = L.heightLow / 100, hi = Math.max(lo + 0.001, L.heightHigh / 100);
for (let i = 0; i < lum.length; i++) {
  let v = lerp(lum[i], broad[i], (L.largeForm / 100) * 0.72) + (lum[i] - broad[i]) * (L.imageDetail / 100) * 1.3;
  v = (v - 0.5) * (L.heightContrast / 100) + 0.5;
  out[i] = Math.round(clamp((clamp(v) - lo) / (hi - lo)) * 255);
}
await sharp(out, { raw: { width: w, height: h, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9 }).toFile(OUT);
console.log(`${OUT}: ${w} x ${h}`);
