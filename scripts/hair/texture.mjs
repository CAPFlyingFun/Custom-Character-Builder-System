/**
 * THE STRAND ATLAS every hairstyle wears (first painted by `scripts/sarahV2Recovery/hair-bake.mjs`; taken out as it was,
 * so every style's file carries the same picture). Always in the REFERENCE COPPER PALETTE (`PAL`): hair COLOUR is the
 * material's, laid on the texture's tone (`hairMaterial.ts`); a style never bakes a colour of its own.
 *
 * Its layout is the kit's (`kit.mjs` `CAP_V`, `SHELL_V`, `CARD_V`): the cap's opaque strands tiling across; the shells'
 * loose strands with alpha; four card variants side by side, root at the top of each cell, tips tapering below.
 * Deterministic: one seed.
 */
import sharp from 'sharp';
import { clamp, mulberry32, smoothstep } from './vec.mjs';
import { CAP_V, CARD_V, SHELL_V } from './kit.mjs';

/** The reference copper (BIOLOGICAL SHAPE of her sheet's hair; linear-ish 0..1). */
export const PAL = { dark: [0.24, 0.10, 0.05], mid: [0.45, 0.20, 0.10], light: [0.63, 0.31, 0.16], glint: [0.80, 0.50, 0.30] };

/** Paint the atlas at `TEX` pixels square: { png, webp } (WebP as the file stores it, alpha kept exact for the alpha test). */
export async function paintAtlas(TEX = 1024) {
  const W = TEX, H = TEX, img = new Uint8ClampedArray(W * H * 4);
  const trnd = mulberry32(7);
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function strandColour(k) {
    const t = k;
    return t < 0.35 ? mixc(PAL.dark, PAL.mid, t / 0.35) : t < 0.8 ? mixc(PAL.mid, PAL.light, (t - 0.35) / 0.45) : mixc(PAL.light, PAL.glint, (t - 0.8) / 0.2);
  }
  // the cap: opaque, tiling across; columns of strands of their own brightness, each wandering a little
  {
    const top = Math.round(CAP_V[0] * H) - 2, bottom = Math.round(CAP_V[1] * H) + 2, cols = new Float32Array(W);
    // a 1D noise across: a few octaves of random values, wrapped so it tiles
    for (const [period, amp] of [[256, 0.32], [64, 0.24], [16, 0.22], [4, 0.14], [2, 0.08]]) {
      const n = W / period, vals = Array.from({ length: n }, () => trnd());
      for (let x = 0; x < W; x++) { const f = x / period, i = Math.floor(f) % n, t = f - Math.floor(f), s = t * t * (3 - 2 * t); cols[x] += amp * (vals[i] + (vals[(i + 1) % n] - vals[i]) * s); }
    }
    for (let y = Math.max(0, top); y < Math.min(H, bottom); y++) {
      const along = (y - top) / (bottom - top);
      for (let x = 0; x < W; x++) {
        const wob = Math.round(2 * Math.sin(y / 37 + cols[(x * 7) % W] * 9));
        const k = clamp(cols[(x + wob + W) % W] * 0.95 + 0.05 * Math.sin(along * 40 + x), 0, 1);
        const c = strandColour(clamp(0.15 + 0.85 * k, 0, 1));
        const o = (y * W + x) * 4; img[o] = c[0] * 255; img[o + 1] = c[1] * 255; img[o + 2] = c[2] * 255; img[o + 3] = 255;
      }
    }
  }
  // the shells: loose strands with alpha, tiling across (they wrap at the image's edge) and running the full length, in
  // pieces of their own lengths, so the alpha test leaves a scatter of strands and no stripes
  {
    const top = Math.round(SHELL_V[0] * H) - 2, bottom = Math.round(SHELL_V[1] * H) + 2, hgt = bottom - top;
    const alpha = new Float32Array(W * hgt), colour = new Float32Array(W * hgt * 3);
    for (let s = 0; s < 2600; s++) {
      const xs = trnd() * W, y0 = trnd() * hgt, length = hgt * (0.12 + 0.4 * trnd()), widthPx = 0.9 + 1.2 * trnd(), bright = trnd(), phase = trnd() * 6.28, amp = 0.5 + 2 * trnd();
      for (let yy = 0; yy < length; yy++) {
        const y = Math.floor(y0 + yy) % hgt, t = yy / length, x = xs + amp * Math.sin(t * 4 + phase);
        const ends = smoothstep(0, 0.15, t) * (1 - smoothstep(0.8, 1, t));
        for (let xx = Math.floor(x - widthPx - 1); xx <= Math.ceil(x + widthPx + 1); xx++) {
          const cover = clamp(widthPx + 0.5 - Math.abs(xx + 0.5 - x), 0, 1) * ends;
          if (cover <= 0) continue;
          const xw = ((xx % W) + W) % W, i = y * W + xw, a = alpha[i], na = a + cover * (1 - a);
          const c = strandColour(clamp(0.25 + 0.75 * bright, 0, 1));
          for (let k = 0; k < 3; k++) colour[i * 3 + k] = (colour[i * 3 + k] * a + c[k] * cover * (1 - a)) / Math.max(na, 1e-6);
          alpha[i] = na;
        }
      }
    }
    for (let y = 0; y < hgt; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = ((top + y) * W + x) * 4, a = alpha[i], c = a > 0.01 ? [colour[i * 3], colour[i * 3 + 1], colour[i * 3 + 2]] : PAL.mid;
      if (top + y < 0 || top + y >= H) continue;
      img[o] = c[0] * 255; img[o + 1] = c[1] * 255; img[o + 2] = c[2] * 255; img[o + 3] = clamp(a * 1.15, 0, 1) * 255;
    }
  }
  // the cards: strands with alpha, root at the top of each card's cell, tips tapering toward the bottom
  {
    const top = Math.round(CARD_V[0] * H), bottom = Math.round(CARD_V[1] * H), cellW = W / 4;
    const alpha = new Float32Array(W * H), colour = new Float32Array(W * H * 3);
    for (let v = 0; v < 4; v++) {
      const x0 = v * cellW, x1 = x0 + cellW, STRANDS = 150 + 30 * v;
      for (let s = 0; s < STRANDS; s++) {
        // denser in the middle of the card, sparser at its edges
        const r = trnd(), xr = 0.5 + (r - 0.5) * (0.35 + 0.65 * trnd()), xs = x0 + 4 + xr * (cellW - 8);
        const length = 0.62 + 0.38 * trnd(), widthPx = 1.1 + 1.6 * trnd(), bright = trnd(), phase = trnd() * 6.28, amp = 1 + 3 * trnd();
        const ys = top + 2, ye = top + (bottom - top - 4) * length;
        for (let y = Math.floor(ys); y < ye; y++) {
          const t = (y - ys) / (ye - ys), x = xs + amp * Math.sin(t * 5 + phase) + (xr - 0.5) * 6 * t;
          const tipFade = 1 - smoothstep(0.7, 1, t), w = widthPx * (1 - 0.6 * t);
          for (let xx = Math.floor(x - w - 1); xx <= Math.ceil(x + w + 1); xx++) {
            if (xx < x0 || xx >= x1) continue;
            const cover = clamp(w + 0.5 - Math.abs(xx + 0.5 - x), 0, 1) * tipFade;
            if (cover <= 0) continue;
            const i = y * W + xx, a = alpha[i], na = a + cover * (1 - a);
            const c = strandColour(clamp(0.32 + 0.66 * bright + 0.08 * Math.sin(t * 9 + phase), 0, 1));
            for (let k = 0; k < 3; k++) colour[i * 3 + k] = (colour[i * 3 + k] * a + c[k] * cover * (1 - a)) / Math.max(na, 1e-6);
            alpha[i] = na;
          }
        }
      }
    }
    for (let y = top; y < bottom; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4, a = alpha[i];
      // under a strand's alpha the colour is the strand's; elsewhere the cell's average, so mipmaps never fringe dark
      const c = a > 0.01 ? [colour[i * 3], colour[i * 3 + 1], colour[i * 3 + 2]] : PAL.mid;
      img[o] = c[0] * 255; img[o + 1] = c[1] * 255; img[o + 2] = c[2] * 255; img[o + 3] = clamp(a * 1.25, 0, 1) * 255;
    }
  }
  const png = await sharp(Buffer.from(img.buffer), { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toBuffer();
  // stored as WebP (EXT_texture_webp: three reads it, every phone the game runs on decodes it), alpha kept exact enough for
  // the alpha test: a quarter of the PNG's bytes
  const webp = await sharp(Buffer.from(img.buffer), { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();

  return { png, webp };
}
