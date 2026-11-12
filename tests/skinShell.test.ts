import { describe, expect, it } from 'vitest';
import { SKIN_SHELL, bakeSkinShell, bridgeLift, heightsOf, layShell, normalizeEach, sampleSkin } from '../src/sarahlab/skinShell';

// A GARMENT CUT FROM HER SKIN (Joshua, 2026-11-11: "duplicating the body's skin ... with an offset like 5mm, and we just
// match the same outline/shape"): the cut, the face, the robe and the hem, on skins simple enough to know the answer.

/** A square of skin, `n` x `n` cells `h` apart, lying in z = height(x, y), facing +z (counter-clockwise from above).
 *  With `seamAt`, the vertices on x = seamAt are doubled, the triangles either side using their own copy (a texture seam). */
function grid(n: number, h: number, height: (x: number, y: number) => number = () => 0, seamAt?: number) {
  const pos: number[] = [], id: number[][] = [], twin = new Map<number, number>();
  const at = (i: number, j: number) => { const x = (i - n / 2) * h, y = (j - n / 2) * h; pos.push(x, y, height(x, y)); return pos.length / 3 - 1; };
  for (let i = 0; i <= n; i++) { id.push([]); for (let j = 0; j <= n; j++) id[i].push(at(i, j)); }
  const seamI = seamAt === undefined ? -1 : Math.round(seamAt / h + n / 2);
  if (seamI >= 0) for (let j = 0; j <= n; j++) { const v = id[seamI][j]; twin.set(v, pos.length / 3); pos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); }
  const idx: number[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    // (cells right of the seam use the seam's copies)
    const right = seamI >= 0 && i >= seamI;
    const v = (a: number, b: number) => { const w = id[a][b]; return right && a === seamI ? twin.get(w)! : w; };
    idx.push(v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j), v(i + 1, j + 1), v(i, j + 1));
  }
  return { pos: Float32Array.from(pos), idx: Uint32Array.from(idx) };
}
const radius = (p: ArrayLike<number>, v: number) => Math.hypot(p[v * 3], p[v * 3 + 1]);
const shellOn = (pos: Float32Array, idx: Uint32Array, field: Float32Array, extra: { minPiece?: number } = {}) =>
  bakeSkinShell({ positions: pos, indices: idx, field, weld: 1e-6, snap: 1e-5, ...extra });
/** Lay it flat on the grid: her skin under each vertex and her direction (+z everywhere on a flat grid). */
function layFlat(bake: ReturnType<typeof bakeSkinShell>, pos: Float32Array, nrm?: Float32Array, lift: Float32Array | null = null, offset = 0.005) {
  const skin = new Float32Array(bake.count * 3), dir = new Float32Array(bake.count * 3);
  sampleSkin(skin, pos, 3, bake.src, bake.bary, bake.count);
  if (nrm) { sampleSkin(dir, nrm, 3, bake.src, bake.bary, bake.count); normalizeEach(dir); } else for (let v = 0; v < bake.count; v++) dir[v * 3 + 2] = 1;
  const out = new Float32Array(bake.count * 3), outN = new Float32Array(bake.count * 3);
  const lay = { offset, hemBulge: SKIN_SHELL.hemBulge, hemFoot: 0.0004 };
  layShell(bake, skin, dir, lift, lay, out, outN);
  return { skin, dir, out, outN, lay };
}

describe('a garment cut from her skin', () => {
  // a disc 3 cm across the middle of a 10 cm square, its field the distance in from its edge
  const R = 0.03, { pos, idx } = grid(40, 0.0025);
  const field = Float32Array.from({ length: pos.length / 3 }, (_, v) => R - radius(pos, v));

  it('is cut along its outline, not along her triangles: its edge is one loop on the circle', () => {
    const bake = shellOn(pos, idx, field);
    expect(bake.loops.length).toBe(1);
    expect(bake.dropped).toBe(0);
    const skin = new Float32Array(bake.count * 3); sampleSkin(skin, pos, 3, bake.src, bake.bary, bake.count);
    let worst = 0;
    for (const v of bake.loops[0]) worst = Math.max(worst, Math.abs(radius(skin, v) - R));
    // (a straight line across each triangle the circle crosses: off it by a sliver of a 2.5 mm triangle at most)
    expect(worst).toBeLessThan(0.0003);
    // and every point of the face is on or inside it
    for (let v = 0; v < bake.faceCount; v++) expect(radius(skin, v)).toBeLessThan(R + 0.0003);
  });

  it('stands its offset off her skin, faces out, and rolls its hem out past the cut and down to just off her', () => {
    const bake = shellOn(pos, idx, field), { out, outN, lay } = layFlat(bake, pos);
    for (let v = 0; v < bake.faceCount; v++) expect(out[v * 3 + 2]).toBeCloseTo(lay.offset, 9);
    // the face's triangles all face +z (wound counter-clockwise from outside, as hers are)
    for (let t = 0; t < bake.faceTriangles; t++) {
      const [a, b, c] = [bake.index[t * 3], bake.index[t * 3 + 1], bake.index[t * 3 + 2]];
      const ux = out[b * 3] - out[a * 3], uy = out[b * 3 + 1] - out[a * 3 + 1], vx = out[c * 3] - out[a * 3], vy = out[c * 3 + 1] - out[a * 3 + 1];
      expect(ux * vy - uy * vx).toBeGreaterThan(0);
    }
    for (let v = 0; v < bake.faceCount; v++) if (!bake.edge[v]) expect(outN[v * 3 + 2]).toBeGreaterThan(0.999);
    const rings = bake.hem[0], last = rings[rings.length - 1], mid = rings[Math.floor(rings.length / 2) - 1];
    for (let j = 0; j < bake.loops[0].length; j++) {
      const e = bake.loops[0][j];
      // its foot just off her skin, under the edge
      expect(out[last[j] * 3 + 2]).toBeCloseTo(lay.hemFoot, 9);
      expect(Math.abs(radius(out, last[j]) - radius(out, e))).toBeLessThan(1e-6);
      // halfway down, rounded out past the edge (away from the face), half as high
      expect(radius(out, mid[j])).toBeGreaterThan(radius(out, e) + 0.5 * lay.hemBulge * lay.offset);
      expect(out[mid[j] * 3 + 2]).toBeCloseTo((lay.offset + lay.hemFoot) / 2, 6);
    }
    // the hem's strips face out too: at the middle ring, its direction leans away from the face's middle
    for (const w of mid) { const r = radius(out, w); expect((outN[w * 3] * out[w * 3] + outN[w * 3 + 1] * out[w * 3 + 1]) / r).toBeGreaterThan(0.5); }
  });

  it('is one surface across her texture seams', () => {
    const seamed = grid(40, 0.0025, () => 0, 0.005);
    const f2 = Float32Array.from({ length: seamed.pos.length / 3 }, (_, v) => R - radius(seamed.pos, v));
    const bake = shellOn(seamed.pos, seamed.idx, f2), plain = shellOn(pos, idx, field);
    // the same face, point for point, and one edge -- no slit along the seam
    expect(bake.loops.length).toBe(1);
    expect(bake.faceCount).toBe(plain.faceCount);
    expect(bake.faceTriangles).toBe(plain.faceTriangles);
  });

  it('takes a triangle given twice once, and drops specks', () => {
    // (a hundred of her triangles over the disc, given again)
    const over: number[] = [];
    for (let t = 0; t < idx.length / 3 && over.length < 300; t++) if (radius(pos, idx[t * 3]) < R / 2) over.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
    const twice = Uint32Array.from([...idx, ...over]);
    const bake = shellOn(pos, twice, field);
    expect(bake.duplicates).toBe(over.length / 3);
    expect(bake.faceTriangles).toBe(shellOn(pos, idx, field).faceTriangles);
    // a speck: one point well away from the disc a hair inside the outline
    const speck = field.slice(); let far = -1;
    for (let v = 0; v < speck.length; v++) if (Math.abs(pos[v * 3] - 0.045) < 1e-6 && Math.abs(pos[v * 3 + 1] - 0.045) < 1e-6) far = v;
    expect(far).toBeGreaterThanOrEqual(0);
    speck[far] = 0.001;
    const b2 = shellOn(pos, idx, speck);
    expect(b2.dropped).toBe(1);
    expect(b2.loops.length).toBe(1);
  });

  it('heights: the face at its offset, the hem coming down to its foot', () => {
    const bake = shellOn(pos, idx, field), { dir, lay } = layFlat(bake, pos), h = new Float32Array(bake.count);
    heightsOf(bake, dir, null, lay, h);
    for (let v = 0; v < bake.faceCount; v++) expect(h[v]).toBeCloseTo(lay.offset, 9);
    const R2 = bake.hem[0].length;
    for (let v = bake.faceCount; v < bake.count; v++) {
      const s = (1 + Math.cos((Math.PI * bake.ring[v]) / R2)) / 2;
      expect(h[v]).toBeCloseTo(lay.hemFoot + (lay.offset - lay.hemFoot) * s, 9);
    }
  });
});

describe('the robe: a garment spans the hollows her skin folds into', () => {
  // a groove 1 cm deep and 1 cm wide down the middle of the square, covered by the whole garment
  const depth = 0.01, half = 0.005;
  const groove = (x: number) => (Math.abs(x) < half ? -depth * Math.cos((Math.PI * x) / (2 * half)) ** 2 : 0);
  const { pos, idx } = grid(40, 0.0025, (x) => groove(x));
  const field = Float32Array.from({ length: pos.length / 3 }, (_, v) => 0.04 - Math.max(Math.abs(pos[v * 3]), Math.abs(pos[v * 3 + 1])));
  // her directions, from her triangles
  const nrm = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const k of [a, b, c]) { nrm[k] += x; nrm[k + 1] += y; nrm[k + 2] += z; }
  }
  normalizeEach(nrm);

  it('spans the groove at the height of the face either side, and leaves the flat alone', () => {
    const bake = shellOn(pos, idx, field);
    const skin = new Float32Array(bake.count * 3), dir = new Float32Array(bake.count * 3);
    sampleSkin(skin, pos, 3, bake.src, bake.bary, bake.count); sampleSkin(dir, nrm, 3, bake.src, bake.bary, bake.count); normalizeEach(dir);
    const offset = 0.005, lift = bridgeLift(bake, skin, dir, offset);
    let bottom = Infinity, flat = 0, lowest = Infinity;
    for (let v = 0; v < bake.faceCount; v++) {
      const x = skin[v * 3], y = skin[v * 3 + 1];
      if (Math.abs(x) < 1e-6 && Math.abs(y) < 0.02) bottom = Math.min(bottom, lift[v * 3 + 2]);
      // (the face over the groove, as laid: never below the face either side of it by more than a millimetre)
      if (Math.abs(x) < half && Math.abs(y) < 0.02) lowest = Math.min(lowest, skin[v * 3 + 2] + dir[v * 3 + 2] * offset + lift[v * 3 + 2]);
      if (Math.abs(x) > 0.015 && Math.abs(x) < 0.03 && Math.abs(y) < 0.02) flat = Math.max(flat, Math.hypot(lift[v * 3], lift[v * 3 + 1], lift[v * 3 + 2]));
    }
    // the groove's bottom comes up more than half its depth; the flat skin either side hardly moves
    expect(bottom).toBeGreaterThan(0.9 * depth);
    expect(lowest).toBeGreaterThan(offset - 0.001);
    expect(flat).toBeLessThan(0.001);
    // and the edge of the garment stays where it was cut, at its height (it only turns with the smoothed directions)
    for (let v = 0; v < bake.faceCount; v++) if (bake.edge[v]) expect(Math.hypot(...[0, 1, 2].map((c) => dir[v * 3 + c] * offset + lift[v * 3 + c]))).toBeCloseTo(offset, 6);
  });
});
