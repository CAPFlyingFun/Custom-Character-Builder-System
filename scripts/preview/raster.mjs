/**
 * A PICTURE WITHOUT A BROWSER (Joshua, 2026-11-14: "run multiple agents to maybe code each remaining top, hair, face"):
 * the room draws with a GPU in one browser, and one browser is all the build machine runs at a time, so whoever shapes a
 * hairstyle, a top's cut or a face at a desk of their own needs another way to LOOK at it. This is that way: triangles
 * drawn straight on, in software, into a PNG. It is a sketch to work by -- no skinning, no shader of the room's, one
 * light -- and never what the room is judged by: the room's own pictures are (`CLAUDE.md`, "Verification").
 *
 * The view is square on (orthographic), so a millimetre is the same number of pixels everywhere in the picture.
 * She faces +z at rest, +y is up and +x is HER LEFT: at `yaw` 0 the picture is of her front, her left on its right;
 * `yaw` 90 looks at her left side, 180 at her back, -90 at her right side; `pitch` lifts the eye (degrees, + from above).
 *
 * Plain arrays in, bytes out. Units are whatever the meshes are in (her rest METRES from `body.mjs`).
 */
import sharp from 'sharp';

const RAD = Math.PI / 180;
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The eye's three directions for a view: `right` and `up` across the picture, `toEye` out of it toward the eye. */
export function eye(yaw = 0, pitch = 0) {
  const y = yaw * RAD, p = pitch * RAD;
  const toEye = [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)];
  const right = norm(cross([0, 1, 0], toEye)), up = cross(toEye, right);
  return { right, up, toEye };
}

/**
 * Draw meshes into a picture.
 *
 *   width, height   the picture, pixels
 *   yaw, pitch      the view (degrees; above)
 *   centre          the place at the picture's middle, [x, y, z]
 *   span            how much of the world the picture's WIDTH shows (the meshes' units)
 *   background      [r, g, b], 0..1
 *   meshes          each { pos, index, nrm?, twoSided?, keep?, shade }
 *     pos           Float32Array, xyz a point
 *     index         three a triangle
 *     nrm           Float32Array, xyz a point (unit); without it a triangle's own flat normal is used
 *     twoSided      true: its triangles are drawn from behind as well (hair cards), lit as if turned to the eye
 *     keep(f)       optional: false drops the pixel BEFORE it hides what is behind it (a card's alpha test)
 *     shade(f)      the pixel's colour [r, g, b] 0..1 (it may use `f.light`, 0..1, the one light on its normal)
 *
 * `f`, what a pixel is handed: { tri, i0, i1, i2, b0, b1, b2 } (its triangle's number, its three points and the pixel's
 * share of each), `x, y, z` (its place, blended), `nx, ny, nz` (its normal, blended, unit, turned to the eye when the mesh
 * is two-sided), `light`, `back` (seen from behind), and `at(array, size)`: any other value a point has, blended the same.
 *
 * Returns { width, height, rgb (Uint8ClampedArray, three a pixel), depth (Float32Array: how far toward the eye each
 * pixel's surface is from `centre`, -Infinity where nothing was drawn) }.
 */
export function draw({ width, height, yaw = 0, pitch = 0, centre = [0, 1, 0], span = 1, background = [0.55, 0.56, 0.58], meshes }) {
  const { right, up, toEye } = eye(yaw, pitch), scale = width / span, n = width * height;
  const depth = new Float32Array(n).fill(-Infinity), who = new Int32Array(n).fill(-1), tri = new Int32Array(n), B0 = new Float32Array(n), B1 = new Float32Array(n);
  // the one light: from the eye's side, a little above it and to its left
  const L = norm([toEye[0] + 0.45 * up[0] - 0.35 * right[0], toEye[1] + 0.45 * up[1] - 0.35 * right[1], toEye[2] + 0.45 * up[2] - 0.35 * right[2]]);
  const frag = (m, t, b0, b1) => {
    const P = m.pos, I = m.index, i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2], b2 = 1 - b0 - b1;
    const mix = (A, s, c) => b0 * A[i0 * s + c] + b1 * A[i1 * s + c] + b2 * A[i2 * s + c];
    const f = { tri: t, i0, i1, i2, b0, b1, b2, x: mix(P, 3, 0), y: mix(P, 3, 1), z: mix(P, 3, 2), nx: 0, ny: 0, nz: 0, light: 1, back: false,
      at: (A, size = 1) => (size === 1 ? mix(A, 1, 0) : Array.from({ length: size }, (_x, c) => mix(A, size, c))) };
    let nv;
    if (m.nrm) nv = norm([mix(m.nrm, 3, 0), mix(m.nrm, 3, 1), mix(m.nrm, 3, 2)]);
    else nv = norm(cross([P[i1 * 3] - P[i0 * 3], P[i1 * 3 + 1] - P[i0 * 3 + 1], P[i1 * 3 + 2] - P[i0 * 3 + 2]], [P[i2 * 3] - P[i0 * 3], P[i2 * 3 + 1] - P[i0 * 3 + 1], P[i2 * 3 + 2] - P[i0 * 3 + 2]]));
    f.back = nv[0] * toEye[0] + nv[1] * toEye[1] + nv[2] * toEye[2] < 0;
    if (f.back && m.twoSided) nv = [-nv[0], -nv[1], -nv[2]];
    f.nx = nv[0]; f.ny = nv[1]; f.nz = nv[2];
    f.light = 0.4 + 0.6 * Math.max(0, nv[0] * L[0] + nv[1] * L[1] + nv[2] * L[2]);
    return f;
  };
  meshes.forEach((m, mi) => {
    const P = m.pos, I = m.index, count = P.length / 3, sx = new Float32Array(count), sy = new Float32Array(count), sz = new Float32Array(count);
    for (let v = 0; v < count; v++) {
      const x = P[v * 3] - centre[0], y = P[v * 3 + 1] - centre[1], z = P[v * 3 + 2] - centre[2];
      sx[v] = width / 2 + (x * right[0] + y * right[1] + z * right[2]) * scale;
      sy[v] = height / 2 - (x * up[0] + y * up[1] + z * up[2]) * scale;
      sz[v] = x * toEye[0] + y * toEye[1] + z * toEye[2];
    }
    for (let t = 0; t * 3 + 2 < I.length; t++) {
      const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
      const ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cx = sx[c], cy = sy[c];
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      // (the picture's y runs down: a triangle that faces the eye has its points going round the other way here)
      if (area === 0 || (!m.twoSided && area > 0)) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
      if (x0 > x1 || y0 > y1) continue;
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const qx = px + 0.5, qy = py + 0.5;
        const w0 = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / area, w1 = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / area, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const d = w0 * sz[a] + w1 * sz[b] + w2 * sz[c], k = py * width + px;
        if (d <= depth[k]) continue;
        if (m.keep && !m.keep(frag(m, t, w0, w1))) continue;
        depth[k] = d; who[k] = mi; tri[k] = t; B0[k] = w0; B1[k] = w1;
      }
    }
  });
  const rgb = new Uint8ClampedArray(n * 3), bg = background.map((x) => x * 255);
  for (let k = 0; k < n; k++) {
    const m = who[k] < 0 ? null : meshes[who[k]], c = m ? m.shade(frag(m, tri[k], B0[k], B1[k])) : null;
    rgb[k * 3] = c ? c[0] * 255 : bg[0]; rgb[k * 3 + 1] = c ? c[1] * 255 : bg[1]; rgb[k * 3 + 2] = c ? c[2] * 255 : bg[2];
  }
  return { width, height, rgb, depth };
}

/** Pictures side by side (the same height), `gap` pixels of white between: one file to look at for several views. */
export function beside(pictures, gap = 6) {
  const height = Math.max(...pictures.map((p) => p.height)), width = pictures.reduce((w, p) => w + p.width, 0) + gap * (pictures.length - 1);
  const rgb = new Uint8ClampedArray(width * height * 3).fill(255);
  let x0 = 0;
  for (const p of pictures) {
    for (let y = 0; y < p.height; y++) rgb.set(p.rgb.subarray(y * p.width * 3, (y + 1) * p.width * 3), (y * width + x0) * 3);
    x0 += p.width + gap;
  }
  return { width, height, rgb };
}
/** ...and rows of them, one above the other. */
export function stacked(rows, gap = 6) {
  const width = Math.max(...rows.map((p) => p.width)), height = rows.reduce((h, p) => h + p.height, 0) + gap * (rows.length - 1);
  const rgb = new Uint8ClampedArray(width * height * 3).fill(255);
  let y0 = 0;
  for (const p of rows) {
    for (let y = 0; y < p.height; y++) rgb.set(p.rgb.subarray(y * p.width * 3, (y + 1) * p.width * 3), ((y0 + y) * width) * 3);
    y0 += p.height + gap;
  }
  return { width, height, rgb };
}

/** Write a picture as a PNG. */
export async function savePng(path, picture) {
  await sharp(Buffer.from(picture.rgb.buffer, picture.rgb.byteOffset, picture.rgb.byteLength), { raw: { width: picture.width, height: picture.height, channels: 3 } }).png().toFile(path);
  return path;
}

/** A picture file (PNG, JPEG, WebP) as numbers to read a colour from: { width, height, channels: 4, data }, and `texel(u, v)` -> [r, g, b, a] 0..1 (v up, as a model's UVs; nearest). */
export async function readPicture(pathOrBytes) {
  const { data, info } = await sharp(pathOrBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const texel = (u, v, flipV = false) => {
    const x = Math.min(width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * width))), vv = v - Math.floor(v), y = Math.min(height - 1, Math.max(0, Math.floor((flipV ? 1 - vv : vv) * height))), k = (y * width + x) * 4;
    return [data[k] / 255, data[k + 1] / 255, data[k + 2] / 255, data[k + 3] / 255];
  };
  return { width, height, channels: 4, data, texel };
}
