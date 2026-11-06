/**
 * HER TRIANGLES JOINED BETTER WHERE THEY ARE THIN (P4; Joshua, 2026-11-05: a fine dotted line down the back of her hand
 * and specks on her fingers as she closed her fist).
 *
 * Meshy's mesh has long, thin triangles in places -- a sliver two centimetres long and a tenth of a millimetre wide over
 * the back of her hand -- and once her fingers are given their shape (ownFingers.ts `formFingers`), her lumps pressed onto
 * it leave little triangles squeezed flat. A sliver turns over at the smallest bend, and drawn turned over it is dark: a
 * dotted line where it lies, a speck where a squeezed one does.
 *
 * So where a triangle is that thin, the edge it shares with the next is turned to join the other two corners instead,
 * when that makes both fatter (the smallest corner of the two larger), keeps both facing the way her skin faces there,
 * bends the surface no more than a little, and keeps her texture the right way round on both. Only her triangles that
 * share an edge point for point are turned (where her texture's seams split her points, nothing is), so no point is
 * added, moved or taken away, and her texture lies where it did.
 *
 * Pure: no three, no DOM.
 */

/** GAME TUNING: a triangle whose smallest corner is under `thin` (radians) is looked at; an edge is turned only if the
 * surface across it bends under `bend` (radians) once turned; at most `rounds` passes. */
export const BETTER_TRIS = Object.freeze({ thin: (12 * Math.PI) / 180, bend: (35 * Math.PI) / 180, rounds: 8 });

type T3 = [number, number, number];
const sub = (a: T3, b: T3): T3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: T3, b: T3): T3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: T3, b: T3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: T3) => Math.hypot(a[0], a[1], a[2]);

/**
 * `pos` her points (as she is shaped), `tris` her triangles, `near` which of them may be turned (by index), `nrm` her
 * normals (the way her skin faces), `uv` her texture's place for each point. Returns her triangles with thin ones turned,
 * and how many edges were.
 */
export function betterTris(pos: ArrayLike<number>, tris: ArrayLike<number>, near: (t: number) => boolean, nrm: ArrayLike<number>, uv?: ArrayLike<number>, o: { readonly thin: number; readonly bend: number; readonly rounds: number } = BETTER_TRIS): { tris: Uint32Array; turned: number } {
  const out = Uint32Array.from(tris as ArrayLike<number>), T = Math.floor(out.length / 3);
  const P = (i: number): T3 => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], N = (i: number): T3 => [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]];
  const angleAt = (a: T3, b: T3, c: T3) => { const u = sub(b, a), v = sub(c, a), lu = len(u), lv = len(v); return lu > 0 && lv > 0 ? Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (lu * lv)))) : 0; };
  const least = (a: number, b: number, c: number) => { const A = P(a), B = P(b), C = P(c); return Math.min(angleAt(A, B, C), angleAt(B, C, A), angleAt(C, A, B)); };
  const faceN = (a: number, b: number, c: number) => cross(sub(P(b), P(a)), sub(P(c), P(a)));
  const uvArea = (a: number, b: number, c: number) => (uv ? (uv[b * 2] - uv[a * 2]) * (uv[c * 2 + 1] - uv[a * 2 + 1]) - (uv[c * 2] - uv[a * 2]) * (uv[b * 2 + 1] - uv[a * 2 + 1]) : 1);
  const may = new Uint8Array(T); for (let t = 0; t < T; t++) may[t] = near(t) ? 1 : 0;
  // (each edge, by its points, to the triangle that has it that way round)
  const key = (a: number, b: number) => `${a}>${b}`;
  const edges = new Map<string, number>();
  const index = (t: number) => { for (let k = 0; k < 3; k++) edges.set(key(out[t * 3 + k], out[t * 3 + (k + 1) % 3]), t); };
  const unindex = (t: number) => { for (let k = 0; k < 3; k++) { const e = key(out[t * 3 + k], out[t * 3 + (k + 1) % 3]); if (edges.get(e) === t) edges.delete(e); } };
  for (let t = 0; t < T; t++) if (may[t]) index(t);
  let turned = 0;
  for (let round = 0; round < o.rounds; round++) {
    let changed = 0;
    for (let t = 0; t < T; t++) {
      if (!may[t] || least(out[t * 3], out[t * 3 + 1], out[t * 3 + 2]) >= o.thin) continue;
      // (its edges, longest first: a thin triangle's long edge is the one to turn)
      const ks = [0, 1, 2].sort((x, y) => len(sub(P(out[t * 3 + (y + 1) % 3]), P(out[t * 3 + y]))) - len(sub(P(out[t * 3 + (x + 1) % 3]), P(out[t * 3 + x]))));
      for (const k of ks) {
        const a = out[t * 3 + k], b = out[t * 3 + (k + 1) % 3], c = out[t * 3 + (k + 2) % 3];
        const u = edges.get(key(b, a)); if (u === undefined || u === t || !may[u]) continue;
        let d = -1; for (let j = 0; j < 3; j++) if (out[u * 3 + j] !== a && out[u * 3 + j] !== b) d = out[u * 3 + j];
        if (d < 0 || d === c || edges.has(key(c, d)) || edges.has(key(d, c))) continue;
        // (fatter: the smallest corner of the two larger than it was)
        if (Math.min(least(a, d, c), least(d, b, c)) <= Math.min(least(a, b, c), least(b, a, d)) + 1e-6) continue;
        // (both facing the way her skin faces there, bent no more than a little, her texture the right way round)
        const ref: T3 = [0, 0, 0]; for (const i of [a, b, c, d]) { const n = N(i); ref[0] += n[0]; ref[1] += n[1]; ref[2] += n[2]; }
        const n1 = faceN(a, d, c), n2 = faceN(d, b, c);
        if (dot(n1, ref) <= 0 || dot(n2, ref) <= 0) continue;
        if (dot(n1, n2) < Math.cos(o.bend) * len(n1) * len(n2)) continue;
        const s = Math.sign(uvArea(a, b, c)) || Math.sign(uvArea(b, a, d));
        if (s === 0 || Math.sign(uvArea(a, d, c)) !== s || Math.sign(uvArea(d, b, c)) !== s) continue;
        unindex(t); unindex(u);
        out[t * 3] = a; out[t * 3 + 1] = d; out[t * 3 + 2] = c;
        out[u * 3] = d; out[u * 3 + 1] = b; out[u * 3 + 2] = c;
        index(t); index(u);
        changed++; turned++;
        break;
      }
    }
    if (!changed) break;
  }
  return { tris: out, turned };
}
