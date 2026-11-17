/**
 * ONE CLOTH OVER ANOTHER (Joshua, 2026-11-16, of a cloth tee worn with a cloth skirt, each of which knew only her skin:
 * "I would add collisions if we don't get from skin to skirt, skin to shirt, and shirt to skirt with it to know which
 * way to offset by maybe 3mm spacing between cloths").
 *
 * Which of the two is outside is KNOWN (a skirt over a tucked shirt, or a shirt over a skirt: `skirtDraft.ts` `tucked`),
 * so nothing is searched both ways: the OUTER cloth keeps its skin's floor and that floor is RAISED where the inner
 * cloth lies between it and her skin -- to the inner cloth's height off her skin there, and `gap` more. The inner cloth
 * is not told of the outer one.
 *
 * For each of the outer cloth's points: its floor is a place on her skin and a way out from it (`SkinContacts.point`,
 * `.normal`). The inner cloth's points near that line out of her (within `beside` of it, from a little under her skin
 * to `reach` out) say how far out the inner cloth is; the furthest of them is its height, and the point's stand-off is
 * no less than that and the gap (a skirt over a tucked shirt: no further than `tuckedMost`, and never its held ring,
 * which is cut to stand clear of the shirt already). The inner cloth's points are kept in a hashed grid, built once a frame.
 *
 * Pure: typed arrays in, typed arrays changed; no three, no DOM. World units throughout.
 */
import type { SkinContacts } from './clothTypes';

/** GAME TUNING (metres; his 3 mm between cloths): the gap, how far out of her an inner cloth is looked for, and how near the line. */
export const CLOTH_LAYERS = Object.freeze({ tuckedMost: 0.012, gap: 0.003, reach: 0.14, beside: 0.022, under: 0.006, cell: 0.03,
  /** a tucked shirt under a skirt's top (`cinchUnder`): the skirt's rows that press it to her, how far off her floor it may stand there, and how far out a skirt's point is looked for */
  cinchRows: 8, cinchSlack: 0.002, cinchReach: 0.05 });

const TABLE = 1 << 13;

export class ClothUnder {
  private head = new Int32Array(TABLE);
  private next = new Int32Array(0);
  private x: ArrayLike<number> = new Float32Array(0);
  private inv = 1;
  /** the inner cloth's heights: outside these (and `reach` more) no point of an outer cloth is over it */
  low = Infinity; high = -Infinity;
  count = 0;

  /** The inner cloth's points now (`n` of them, 3 numbers each; one that is not a number is not worn), in cells `cell` across. */
  build(x: ArrayLike<number>, n: number, cell: number): void {
    if (this.next.length < n) this.next = new Int32Array(n);
    this.head.fill(-1); this.x = x; this.inv = 1 / cell; this.low = Infinity; this.high = -Infinity; this.count = 0;
    const inv = this.inv;
    for (let i = 0; i < n; i++) {
      const px = x[i * 3], py = x[i * 3 + 1], pz = x[i * 3 + 2];
      if (!(px === px && py === py && pz === pz)) { this.next[i] = -2; continue; }
      const h = hash(Math.floor(px * inv), Math.floor(py * inv), Math.floor(pz * inv));
      this.next[i] = this.head[h]; this.head[h] = i; this.count++;
      if (py < this.low) this.low = py; if (py > this.high) this.high = py;
    }
  }

  /**
   * How far out along (nx, ny, nz) from (px, py, pz) the inner cloth lies: the furthest of its points within `beside`
   * of that line, from `under` behind the place to `reach` out. Less than `-under`: none there.
   */
  heightAt(px: number, py: number, pz: number, nx: number, ny: number, nz: number, reach: number, beside: number, under: number): number {
    const inv = this.inv, step = 1 / inv, x = this.x, b2 = beside * beside;
    let best = -Infinity;
    // (cells round places along the line, a cell apart: every point within `beside` of the line is in one of them)
    let lastX = NaN, lastY = NaN, lastZ = NaN;
    for (let t = 0; t <= reach + step; t += step) {
      const cx = Math.floor((px + nx * t) * inv), cy = Math.floor((py + ny * t) * inv), cz = Math.floor((pz + nz * t) * inv);
      if (cx === lastX && cy === lastY && cz === lastZ) continue;
      lastX = cx; lastY = cy; lastZ = cz;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (let oz = -1; oz <= 1; oz++) {
        for (let j = this.head[hash(cx + ox, cy + oy, cz + oz)]; j >= 0; j = this.next[j]) {
          const dx = x[j * 3] - px, dy = x[j * 3 + 1] - py, dz = x[j * 3 + 2] - pz;
          const along = dx * nx + dy * ny + dz * nz;
          if (along < -under || along > reach || along <= best) continue;
          if (dx * dx + dy * dy + dz * dz - along * along > b2) continue;
          best = along;
        }
      }
    }
    return best;
  }
}

function hash(cx: number, cy: number, cz: number): number { return (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663) ^ Math.imul(cz, 83492791)) & (TABLE - 1); }

/**
 * Raise the outer cloth's floors over the inner cloth: `contacts` are the outer cloth's (its first `n` slots), `inner`
 * the inner cloth as built this frame, `unitsPerMetre` the world's. Returns how many floors were raised.
 */
export function raiseOver(inner: ClothUnder, contacts: SkinContacts, n: number, unitsPerMetre: number, options: { readonly most?: number; readonly held?: ArrayLike<number>; readonly lift?: number } = {}): number {
  if (!inner.count) return 0;
  const L = CLOTH_LAYERS, M = unitsPerMetre, reach = L.reach * M, beside = L.beside * M, under = L.under * M;
  // `lift` (metres): how far out of where it is simulated the inner cloth is DRAWN (the tee: 3 mm, `roomGarment.DRAW_LIFT`).
  // Without it the tee was drawn exactly at the skirt's floor, and over a bump showed through it in bands (MEASURED 2026-11-17, 100%)
  const gap = (L.gap + (options.lift ?? 0)) * M;
  const P = contacts.point, N = contacts.normal, S = contacts.standOff, lo = inner.low - reach, hi = inner.high + reach;
  // `most` (metres): no floor is raised further than this -- a tucked shirt's loose hem, flapping under a skirt, is not
  // the skirt's floor; `held`: a point held whole to her (its pin 1: the ring itself) keeps the floor it has -- the rows
  // under it, held in part, are raised: left out, the tee showed in slivers just under the band over a bump (MEASURED 2026-11-17)
  const most = (options.most ?? Infinity) * M, held = options.held;
  let raised = 0;
  for (let i = 0, i3 = 0; i < n; i++, i3 += 3) {
    if (held && held[i] >= 1) continue;
    const py = P[i3 + 1];
    if (py < lo || py > hi) continue;
    const nx = N[i3], ny = N[i3 + 1], nz = N[i3 + 2];
    if (nx * nx + ny * ny + nz * nz < 0.5) continue;
    const h = inner.heightAt(P[i3], py, P[i3 + 2], nx, ny, nz, reach, beside, under);
    const want = Math.min(h, most) + gap;
    if (want > S[i]) { S[i] = want; raised++; }
  }
  return raised;
}

/**
 * A TUCKED SHIRT IS HELD IN BY THE SKIRT OVER IT (Joshua, 2026-11-17, of the skirt's anchors: they pin the skirt at its
 * height and cinch a shirt tucked under its band). A loose tee hangs from her bust in front of the crease a high skirt
 * sits in: tucked, its hem showed ragged over the skirt's top, and cut longer it came through the skirt in bands
 * (MEASURED in the room, 0 and 100%). So where the top of the skirt (`band`: its first rows, as built this frame) lies
 * over a point of the shirt's floor on her skin, the shirt's point stands no further off that floor than its stand-off
 * and `cinchSlack`, and keeps none of its speed out from her. After the shirt's step; returns how many were held in.
 */
export function cinchUnder(band: ClothUnder, contacts: SkinContacts, x: Float32Array, v: Float32Array, n: number, unitsPerMetre: number): number {
  if (!band.count) return 0;
  const L = CLOTH_LAYERS, M = unitsPerMetre, reach = L.cinchReach * M, beside = L.beside * M, under = L.under * M, slack = L.cinchSlack * M;
  const P = contacts.point, N = contacts.normal, S = contacts.standOff, lo = band.low - reach, hi = band.high + reach;
  let held = 0;
  for (let i = 0, i3 = 0; i < n; i++, i3 += 3) {
    const py = P[i3 + 1];
    if (py < lo || py > hi) continue;
    const nx = N[i3], ny = N[i3 + 1], nz = N[i3 + 2];
    if (nx * nx + ny * ny + nz * nz < 0.5) continue;
    const along = (x[i3] - P[i3]) * nx + (x[i3 + 1] - py) * ny + (x[i3 + 2] - P[i3 + 2]) * nz, most = S[i] + slack;
    if (!(along > most)) continue;
    if (band.heightAt(P[i3], py, P[i3 + 2], nx, ny, nz, reach, beside, under) < -under) continue;
    const back = along - most;
    x[i3] -= nx * back; x[i3 + 1] -= ny * back; x[i3 + 2] -= nz * back;
    const out = v[i3] * nx + v[i3 + 1] * ny + v[i3 + 2] * nz;
    if (out > 0) { v[i3] -= nx * out; v[i3 + 1] -= ny * out; v[i3 + 2] -= nz * out; }
    held++;
  }
  return held;
}
