#!/usr/bin/env node
/**
 * SKIN DETAIL: a seamless height map of skin's fine relief -- pores, fine creases and a soft unevenness -- made by his
 * Local Texture Lab's own procedural maths (`tools/local-texture-lab.html`: `periodicValueNoise`, `fbm`, `ridged`,
 * `normalizeLevels`; Joshua, 2026-11-19: "use the HTML directly to redo it if it's at a lower resolution"), with one layer
 * the lab has not got: PORES, a periodic cell noise (each cell one pore, a small soft pit).
 *
 * Why not his IMG_6313 maps (Galaxy Defender's, from the lab's Convert mode, 512 px): their picture is a body's whole
 * skin texture -- its atlas, with pieces of a face, an eye, nipples and a navel in it -- cut up by the lab's seamless
 * blend. Tiled over a body every piece would repeat, and the height made from its colour is the pieces' edges: shards, the
 * "polygon" look. A procedural map is seamless by design (the lab says so) and holds nothing of anyone's body.
 *
 * Writes `public/models/skins/skin-detail-1024.png` (grey, 0.5 the mean: what the room's detail reads as a height).
 *   node scripts/skinDetail.mjs [--size 1024] [--seed 7] [--out path]
 */
import sharp from 'sharp';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const SIZE = +arg('size', 1024), SEED = +arg('seed', 7), OUT = arg('out', 'public/models/skins/skin-detail-1024.png');

/** GAME TUNING (by eye on him in the room): how many of each in one tile, and how strong. A tile is laid 6 cm (the room's `SKIN_DETAIL.tileM`). */
export const SKIN_RELIEF = Object.freeze({
  soft: { scale: 3, strength: 0.25 },     // a soft unevenness, a couple of cm across
  creases: { scale: 12, strength: 0.4 },  // fine lines (the lab's ridged noise, as thin lines), and finer ones at twice as many
  fine: { scale: 26, strength: 0.25 },
  grain: { scale: 64, strength: 0.18 },   // the finest grain
  pores: { cells: 40, radius: 0.24, depth: 0.3 }, // 40 x 40 pores a tile: 1.5 mm apart over 6 cm
});

// ---- the lab's maths, as written there ----
const lerp = (a, b, t) => a + (b - a) * t, smooth = (t) => t * t * (3 - 2 * t), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function hash2(x, y, seed) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69069)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function periodicValueNoise(x, y, period, seed) {
  const p = Math.max(2, Math.floor(period)), x0 = Math.floor(x), y0 = Math.floor(y), sx = smooth(x - x0), sy = smooth(y - y0);
  const wrap = (v) => ((v % p) + p) % p;
  const a = hash2(wrap(x0), wrap(y0), seed), b = hash2(wrap(x0 + 1), wrap(y0), seed), c = hash2(wrap(x0), wrap(y0 + 1), seed), d = hash2(wrap(x0 + 1), wrap(y0 + 1), seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
function fbm(u, v, scale, seed, octaves = 5) {
  let value = 0, amp = 0.55, sum = 0;
  for (let o = 0; o < octaves; o++) { const period = Math.max(2, Math.round(scale * 2 ** o)); value += periodicValueNoise(u * period, v * period, period, seed + o * 131) * amp; sum += amp; amp *= 0.5; }
  return value / sum;
}
const ridged = (u, v, scale, seed) => 1 - Math.abs(fbm(u, v, scale, seed, 4) * 2 - 1);

// ---- pores: one a cell, somewhere in it, a soft pit ----
function pores(u, v, { cells, radius }, seed) {
  const x = u * cells, y = v * cells, cx = Math.floor(x), cy = Math.floor(y);
  let best = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = ((cx + i) % cells + cells) % cells, gy = ((cy + j) % cells + cells) % cells;
    const px = cx + i + 0.15 + 0.7 * hash2(gx, gy, seed), py = cy + j + 0.15 + 0.7 * hash2(gx, gy, seed + 1);
    const size = 0.6 + 0.8 * hash2(gx, gy, seed + 2); // pores are not all one size
    best = Math.min(best, Math.hypot(x - px, y - py) / size);
  }
  return best < radius ? smooth(1 - best / radius) : 0; // 1 at a pore's middle
}

const R = SKIN_RELIEF, h = new Float32Array(SIZE * SIZE);
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const u = x / SIZE, v = y / SIZE;
  const soft = fbm(u, v, R.soft.scale, SEED, 4), crease = ridged(u, v, R.creases.scale, SEED + 500) ** 6, grain = fbm(u, v, R.grain.scale, SEED + 1200, 2), fine = ridged(u, v, R.fine.scale, SEED + 700) ** 8;
  h[y * SIZE + x] = 0.5 + (soft - 0.5) * R.soft.strength - crease * R.creases.strength * 0.5 - fine * R.fine.strength * 0.5 + (grain - 0.5) * R.grain.strength - pores(u, v, R.pores, SEED + 900) * R.pores.depth * 0.5;
}
// the lab's levels, then centred on 0.5
let lo = Infinity, hi = -Infinity, mean = 0;
for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); mean += v; }
mean /= h.length;
const span = Math.max(hi - mean, mean - lo), out = Buffer.alloc(SIZE * SIZE);
for (let i = 0; i < h.length; i++) out[i] = Math.round(clamp(0.5 + (h[i] - mean) / span * 0.5) * 255);
await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 1 } }).toColourspace('b-w').png({ compressionLevel: 9 }).toFile(OUT);
console.log(`${OUT}: ${SIZE} x ${SIZE}, seamless`);
