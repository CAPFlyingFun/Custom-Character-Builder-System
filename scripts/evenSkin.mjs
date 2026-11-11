/**
 * HER SKIN MADE EVEN: ONE SKIN COLOUR, HER OWN DETAILS KEPT (Joshua, 2026-11-11: "maybe better anyway to do no image
 * texture, but then allow a solid color for the outside skin and then we could add skin color... but you can still body
 * paint over the solid color and save"; asked whether her face and the rest should go: "I would keep the details I have").
 *
 * Her skin's colour map is an atlas of hundreds of small islands, and light was baked into it when she was made: a
 * highlight down a thigh, a shadow under a breast, each island lit its own way. That light is wrong the moment she is
 * posed, lit by the room, or her skin is moved -- and nothing drawn in one flat colour (her opening's doors) can match
 * a skin that is a different tone every few centimetres.
 *
 * So each texel is told apart into TONE and DETAIL. Her tone at a place is what her skin's colour is over the few
 * centimetres round it ON HER (not in the image, where the island next door may be her knee): every vertex takes her
 * image's colour, and those are evened over her surface at rest with a bell `SIGMA` wide. What stands far off its own
 * neighbourhood's tone -- an areola, her lips, a brow, an eye, a nail, the dark of her navel -- is a DETAIL and is left
 * out of the evening (it is taken again without them, `PASSES` times), so her tone is the skin round a detail and never
 * the detail itself; else her nipples would fade and a pale ring stand round each. Then
 *
 *     new texel = SKIN x (old texel / her tone there) ^ KEEP
 *
 * in linear light, each colour on its own: where her skin was only lit or shaded the quotient is 1 and the texel is
 * SKIN; a detail keeps the same step from the skin round it that it had. SKIN is her image's own mean (MEASURED: sRGB
 * 216, 169, 152), so she is the same colour she was, taken as a whole.
 *
 * Same atlas, same UVs: it is laid on her as any of her skins is (skinChoices.ts), and PAINT SKIN paints on it.
 *
 *     node scripts/evenSkin.mjs [--sigma 0.03] [--keep 1] [--skin d8a998] [--out public/models/skins/sarah-v2-skin-even-2048.webp]
 *                               [--tone <png>: her tone alone, to look at] [--marks <png>: what was taken as detail]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
/** GAME TUNING: how wide a neighbourhood her tone is taken over (metres on her at rest); how far its colour turns from
 * its neighbourhood's (`DETAIL`, the log of red or blue against green), or how dark against it (`DARK`, of its
 * lightness), a vertex is a detail and left out of it; how many times her tone is taken again without them; how much of
 * a detail's step is kept (1 all of it). */
const SIGMA = Number(arg('sigma', 0.03)), DETAIL = Number(arg('detail', 0.12)), DARK = Number(arg('dark', 0.6)), PASSES = 3, KEEP = Number(arg('keep', 1));
const BODY = path.resolve(ROOT, arg('body', 'public/models/sarah-v2-body-slim.glb'));
const OUT = path.resolve(ROOT, arg('out', 'public/models/skins/sarah-v2-skin-even-2048.webp'));

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const LIN = Float32Array.from({ length: 256 }, (_, i) => toLinear(i / 255));

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(BODY);
// her skin: the primitive that carries her colour map
const prim = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).find((p) => p.getMaterial()?.getBaseColorTexture() && p.getAttribute('TEXCOORD_0'));
if (!prim) throw new Error('no primitive of hers carries a colour map');
const read = (A) => { const n = A.getCount(), s = A.getElementSize(), out = new Float32Array(n * s), v = []; for (let i = 0; i < n; i += 1) { A.getElement(i, v); for (let c = 0; c < s; c += 1) out[i * s + c] = v[c]; } return out; };
const P = read(prim.getAttribute('POSITION')), UV = read(prim.getAttribute('TEXCOORD_0')), I = prim.getIndices().getArray(), N = P.length / 3;
// (her vertices are stored small and whole-numbered; her rig's bind says how many metres one of their units is -- the
// same number the room reads, softBody.ts UNITS_PER_METRE)
{ const skin = doc.getRoot().listSkins()[0], m = []; skin?.getInverseBindMatrices()?.getElement(0, m);
  const metres = m.length === 16 ? Math.hypot(m[0], m[1], m[2]) : 0.89974678;
  console.log(`[even] one of her mesh's units is ${metres.toFixed(6)} m`);
  for (let i = 0; i < P.length; i += 1) P[i] *= metres; }
const image = prim.getMaterial().getBaseColorTexture().getImage();
const { data: px, info } = await sharp(Buffer.from(image)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
console.log(`[even] her skin: ${N} vertices, ${I.length / 3} triangles, image ${W}x${H}`);

// her image's own mean (linear light): the skin colour she is made, unless another is asked for
const mean = [0, 0, 0];
for (let i = 0; i < W * H; i += 1) for (let c = 0; c < 3; c += 1) mean[c] += LIN[px[i * 3 + c]];
for (let c = 0; c < 3; c += 1) mean[c] /= W * H;
const asked = arg('skin', null);
const SKIN = asked ? [0, 2, 4].map((k) => toLinear(parseInt(asked.replace('#', '').slice(k, k + 2), 16) / 255)) : mean;
console.log('[even] her image\'s mean, sRGB', mean.map((v) => Math.round(toSrgb(v) * 255)), '-> her skin colour, sRGB', SKIN.map((v) => Math.round(toSrgb(v) * 255)));

// the image at a place (bilinear, linear light)
const sample = (u, v, out) => {
  const x = Math.min(W - 1.001, Math.max(0, u * W - 0.5)), y = Math.min(H - 1.001, Math.max(0, v * H - 0.5)), x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  for (let c = 0; c < 3; c += 1) {
    const a = LIN[px[(y0 * W + x0) * 3 + c]], b = LIN[px[(y0 * W + x0 + 1) * 3 + c]], d = LIN[px[((y0 + 1) * W + x0) * 3 + c]], e = LIN[px[((y0 + 1) * W + x0 + 1) * 3 + c]];
    out[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
  }
};
// each vertex's colour: her image a fifth of the way in from it toward the middle of each of its triangles (inside the
// island, not on its edge), weighed by the triangle's size on her
const col = new Float32Array(N * 3), wsum = new Float32Array(N), s3 = [0, 0, 0];
for (let t = 0; t < I.length; t += 3) {
  const a = I[t], b = I[t + 1], c = I[t + 2];
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2 + 1e-12;
  const mu = (UV[a * 2] + UV[b * 2] + UV[c * 2]) / 3, mv = (UV[a * 2 + 1] + UV[b * 2 + 1] + UV[c * 2 + 1]) / 3;
  for (const i of [a, b, c]) { sample(UV[i * 2] * 0.8 + mu * 0.2, UV[i * 2 + 1] * 0.8 + mv * 0.2, s3); for (let k = 0; k < 3; k += 1) col[i * 3 + k] += s3[k] * area; wsum[i] += area; }
}
for (let i = 0; i < N; i += 1) if (wsum[i] > 0) for (let k = 0; k < 3; k += 1) col[i * 3 + k] /= wsum[i];
// (her colour over her SURFACE -- the image's own mean weighs each island by its texels, and her hidden places as much
// as her seen ones: by her skin's area, its mean, and the colour half of her skin is lighter than, by band of her height)
{ const report = (name, pick) => {
    const m = [0, 0, 0]; let w = 0; const lum = [];
    for (let i = 0; i < N; i += 1) { if (!(wsum[i] > 0) || !pick(i)) continue; for (let k = 0; k < 3; k += 1) m[k] += col[i * 3 + k] * wsum[i]; w += wsum[i]; lum.push([0.2126 * col[i * 3] + 0.7152 * col[i * 3 + 1] + 0.0722 * col[i * 3 + 2], i]); }
    if (!w) return;
    lum.sort((x, y) => x[0] - y[0]); const at = (f) => { const i = lum[Math.floor(f * (lum.length - 1))][1]; return [0, 1, 2].map((k) => Math.round(toSrgb(col[i * 3 + k]) * 255)); };
    console.log(`[even] ${name}: mean sRGB`, m.map((v) => Math.round(toSrgb(v / w) * 255)), 'a quarter / half / three quarters of the way up its lightness', at(0.25), at(0.5), at(0.75));
  };
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < N; i += 1) { lo = Math.min(lo, P[i * 3 + 1]); hi = Math.max(hi, P[i * 3 + 1]); }
  report('all of her', () => true);
  report('her head', (i) => P[i * 3 + 1] > hi - 0.24);
  report('her trunk, front', (i) => P[i * 3 + 1] > lo + 0.85 && P[i * 3 + 1] < hi - 0.3 && Math.abs(P[i * 3]) < 0.16 && P[i * 3 + 2] > 0);
  report('her legs', (i) => P[i * 3 + 1] < lo + 0.75 && P[i * 3 + 1] > lo + 0.12);
  // (and where she is looked at most: her skin that faces forward, knees to collarbones)
  const nz = new Float32Array(N), nl = new Float32Array(N);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2], ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const i of [a, b, c]) { nz[i] += z; nl[i] += Math.hypot(x, y, z); }
  }
  report('her front (her skin facing forward, knees to collarbones)', (i) => nl[i] > 0 && nz[i] / nl[i] > 0.6 && P[i * 3 + 1] > lo + 0.5 && P[i * 3 + 1] < hi - 0.3); }

// HER TONE: each vertex's colour evened over her surface at rest -- a bell SIGMA wide over the vertices within 2.5 of
// it, found in boxes -- the details left out (none the first time)
const cell = SIGMA * 2.5, boxes = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
for (let i = 0; i < N; i += 1) { if (!(wsum[i] > 0)) continue; const k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); (boxes.get(k) ?? boxes.set(k, []).get(k)).push(i); }
const tone = new Float32Array(N * 3), detail = new Uint8Array(N), far2 = cell * cell, inv = 1 / (2 * SIGMA * SIGMA);
const even = () => {
  for (let i = 0; i < N; i += 1) {
    if (!(wsum[i] > 0)) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    let r = 0, g = 0, b = 0, w = 0, r2 = 0, g2 = 0, b2 = 0, w2 = 0;
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const list = boxes.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!list) continue;
      for (const j of list) {
        const d2 = (P[j * 3] - x) ** 2 + (P[j * 3 + 1] - y) ** 2 + (P[j * 3 + 2] - z) ** 2; if (d2 > far2) continue;
        const q = Math.exp(-d2 * inv) * wsum[j];
        r2 += col[j * 3] * q; g2 += col[j * 3 + 1] * q; b2 += col[j * 3 + 2] * q; w2 += q;
        if (!detail[j]) { r += col[j * 3] * q; g += col[j * 3 + 1] * q; b += col[j * 3 + 2] * q; w += q; }
      }
    }
    // (a place that is all detail -- the middle of an eye -- takes its neighbourhood's as it is)
    if (w > w2 * 0.15) { tone[i * 3] = r / w; tone[i * 3 + 1] = g / w; tone[i * 3 + 2] = b / w; } else { tone[i * 3] = r2 / w2; tone[i * 3 + 1] = g2 / w2; tone[i * 3 + 2] = b2 / w2; }
  }
};
// WHAT IS A DETAIL: not how much lighter or darker than its neighbourhood a vertex is -- the light baked into her image
// is that, over a third of her -- but its COLOUR's own turn from the skin round it: an areola, her lips, the red of an
// eye's corner are redder than skin however they are lit (red against green, blue against green, as logs: light and
// shade leave both nearly alone); and what is very much darker than the skin round it -- a brow, her lashes, a pupil,
// a nostril -- which no baked shade on open skin reaches.
const hue = (r, g, b) => [Math.log((r + 1e-4) / (g + 1e-4)), Math.log((b + 1e-4) / (g + 1e-4))];
const lumOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (let pass = 0; pass < PASSES; pass += 1) {
  even();
  let n = 0; const turns = [], darks = [];
  for (let i = 0; i < N; i += 1) {
    if (!(wsum[i] > 0)) continue;
    const h = hue(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]), t = hue(tone[i * 3], tone[i * 3 + 1], tone[i * 3 + 2]);
    const turn = Math.max(Math.abs(h[0] - t[0]), Math.abs(h[1] - t[1])), dark = lumOf(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]) / (lumOf(tone[i * 3], tone[i * 3 + 1], tone[i * 3 + 2]) || 1);
    detail[i] = turn > DETAIL || dark < DARK ? 1 : 0; n += detail[i];
    if (pass === 0) { turns.push(turn); darks.push(dark); }
  }
  if (pass === 0) { turns.sort((x, y) => x - y); darks.sort((x, y) => x - y); const q = (L, f) => L[Math.floor(f * (L.length - 1))].toFixed(3);
    console.log('[even] how far her colour turns from the skin round it (log): half', q(turns, 0.5), '90%', q(turns, 0.9), '97%', q(turns, 0.97), '99%', q(turns, 0.99), '99.7%', q(turns, 0.997));
    console.log('[even] how light it is against the skin round it: 0.3%', q(darks, 0.003), '1%', q(darks, 0.01), '3%', q(darks, 0.03), '10%', q(darks, 0.1), 'half', q(darks, 0.5), '90%', q(darks, 0.9), '99%', q(darks, 0.99)); }
  console.log(`[even] pass ${pass + 1}: ${n} vertices taken as detail (${((n / N) * 100).toFixed(1)}%)`);
}
even();

// EACH TEXEL: her tone there (its triangle's corners' tones in the proportions it stands between them; a texel within
// a pixel and a half of a triangle takes the nearest point on it -- the island's padding, which the sampler blends in)
const out = Buffer.alloc(W * H * 3), toneOut = Buffer.alloc(W * H * 3), markOut = Buffer.alloc(W * H * 3), best = new Float32Array(W * H).fill(Infinity);
for (let i = 0; i < W * H; i += 1) for (let c = 0; c < 3; c += 1) { out[i * 3 + c] = Math.round(toSrgb(SKIN[c]) * 255); toneOut[i * 3 + c] = px[i * 3 + c]; }
const PAD = 1.5;
for (let t = 0; t < I.length; t += 3) {
  const a = I[t], b = I[t + 1], c = I[t + 2];
  const ax = UV[a * 2] * W - 0.5, ay = UV[a * 2 + 1] * H - 0.5, bx = UV[b * 2] * W - 0.5, by = UV[b * 2 + 1] * H - 0.5, cx = UV[c * 2] * W - 0.5, cy = UV[c * 2 + 1] * H - 0.5;
  const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(den) < 1e-9) continue;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - PAD)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx) + PAD)), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - PAD)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy) + PAD));
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
    let l0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, l1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, l2 = 1 - l0 - l1;
    // how far outside the triangle (pixels, roughly: its most negative proportion times its size)
    const outside = Math.max(0, -Math.min(l0, l1, l2)) * Math.sqrt(Math.abs(den));
    if (outside > PAD || outside >= best[y * W + x]) continue;
    best[y * W + x] = outside;
    if (outside > 0) { l0 = Math.max(0, l0); l1 = Math.max(0, l1); l2 = Math.max(0, l2); const s = l0 + l1 + l2; l0 /= s; l1 /= s; l2 /= s; }
    const o = (y * W + x) * 3;
    for (let k = 0; k < 3; k += 1) {
      const tn = tone[a * 3 + k] * l0 + tone[b * 3 + k] * l1 + tone[c * 3 + k] * l2, old = LIN[px[o + k]];
      out[o + k] = Math.round(Math.min(1, Math.max(0, toSrgb(SKIN[k] * (tn > 1e-4 ? old / tn : 1) ** KEEP))) * 255);
      toneOut[o + k] = Math.round(toSrgb(Math.min(1, tn)) * 255);
    }
    const mk = detail[a] * l0 + detail[b] * l1 + detail[c] * l2;
    markOut[o] = Math.round(255 * mk); markOut[o + 1] = px[o + 1]; markOut[o + 2] = px[o + 2];
  }
}
let covered = 0; for (let i = 0; i < W * H; i += 1) if (best[i] < Infinity) covered += 1;
console.log(`[even] ${((covered / (W * H)) * 100).toFixed(1)}% of her image is her skin's; the rest is the plain skin colour`);
const save = (buf, file) => { const s = sharp(buf, { raw: { width: W, height: H, channels: 3 } }); return (file.endsWith('.webp') ? s.webp({ quality: 92 }) : s.png()).toFile(file); };
await save(out, OUT); console.log('[even] wrote', path.relative(ROOT, OUT));
if (arg('tone', null)) await save(toneOut, path.resolve(arg('tone', '')));
if (arg('marks', null)) await save(markOut, path.resolve(arg('marks', '')));
