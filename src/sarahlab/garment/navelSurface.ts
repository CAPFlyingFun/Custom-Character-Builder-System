/**
 * HER NAVEL UNDER A SHIRT, for every cloth shirt (Joshua, 2026-11-06, with a drawing of it from the side):
 *   "All shirts follow the exact side profile of the bellybutton but just scaled slightly bigger for offsets."
 *   "The shape can alter, but, only based on the slider through clothes, it doesn't affect the main bellybutton shape."
 *   "Innie to flat (between innie/outie) = what's draw stays flat regardless of slider. Outie only = closest to shape to
 *   wider smooth curve arc up and down."
 *   (and of the shirt standing a few millimetres off her: "that's fine about the slightly further offset as it would be
 *   more like that and realistic")
 *
 * One measure, used by the procedural garment (`GarmentDetail`) and the light tee's cloth copy (`ClothShirt`):
 * - MEASURED from her: her navel's own vertices as posed now, round its tip (the tallest of them along its axis), each as
 *   high as it stands above her belly round her navel -- her navel's radial PROFILE from its crown out (`measure`).
 * - OUTIE OR INNIE from her navel's centre: an outie's profile is drawn; an innie's, or a navel standing less than
 *   NAVEL_SURFACE.outie out, is nothing at every NAVEL DETAIL.
 * - NAVEL DETAIL stretches the profile across her belly and never lowers it: at 100% her navel's own shape, at 0% as high
 *   and NAVEL_SURFACE.widest as wide, a smooth arc.
 * - The cloth over her navel lies on her SMOOTH belly at its own stand-off, as though her navel were not there
 *   (`smoothOver`), and the shirt is DRAWN with her navel's profile added to it (`raise`; the fine drawing,
 *   `navelPatch.ts`): her navel's shape at the shirt's own offset, meeting the rest of the shirt where her profile has
 *   come down to nothing.
 * Her navel itself is never changed by any of it.
 *
 * Every position is WORLD (the room's, 100 to the metre). Pure: no three, no DOM.
 */
import type { SkinContacts } from '../clothTypes';
import type { DetailPoints, Poser, Posed } from '../detailSpots';

/**
 * World units (the room's centimetres). GAME TUNING, but `widest` and `over` are read off Joshua's drawing of 2026-11-06:
 * at NAVEL DETAIL 0 the shirt over her navel is about twice as wide as her navel, as high; at 100% it is her navel's own
 * shape at the shirt's offset, "about 0.5 mm" more.
 * - bin: how finely her navel's profile is measured from its crown out; bins: how far (bin × bins)
 * - widest: how far NAVEL DETAIL 0 stretches it across her belly
 * - over: how much farther out than the shirt's own offset off her it is, at her navel's crown
 * - band: how far along her navel's axis a point may be from her belly and still be hers (not the back of her)
 * - outie: how far her navel's centre must stand out of her belly to be an outie the shirt shows (0.5 mm)
 */
export const NAVEL_SURFACE = Object.freeze({ bin: 0.05, bins: 80, widest: 2, over: 0.05, band: 3, outie: 0.05 });

/** Her body at rest, for finding her navel's vertices once: her vertex count and a vertex's rest position. */
export interface RestBody { readonly count: number; at(v: number, out: number[]): void }

/** The vertices within `ring`'s mean radius of `centre`, at rest. */
export function aroundOf(rest: RestBody, centre: number, ring: readonly number[]): Int32Array {
  const c = [0, 0, 0], q = [0, 0, 0];
  rest.at(centre, c);
  let r = 0;
  for (const v of ring) { rest.at(v, q); r += Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]); }
  r /= ring.length || 1;
  const out: number[] = [];
  for (let v = 0; v < rest.count; v++) { if (v === centre) continue; rest.at(v, q); if ((q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2 < r * r) out.push(v); }
  return Int32Array.from(out);
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

export class NavelSurface {
  /** Her navel's vertices within its OUTER ring at rest (null without a rest body): what `follow` poses. */
  readonly around: Int32Array | null;
  /** Her navel's crown now (world) and across its axis from the outer ring's centre. */
  readonly crown: [number, number, number] = [0, 0, 0];
  private readonly k: [number, number, number] = [0, 0, 0];
  /** Her navel's axis now (world, unit). */
  readonly axis: [number, number, number] = [0, 0, 1];
  private d: Posed | null = null;
  private relief = new Float32Array(0);
  /** Her navel's profile: height above her belly round it, bin b at b × NAVEL_SURFACE.bin from its crown. */
  private readonly profile = new Float32Array(NAVEL_SURFACE.bins);
  private bins = 0;
  private stretch = 1;
  private on = false;
  /** Her belly round her navel above the smooth surface, and how far her navel's centre stands out of it. */
  private floor = 0;
  private outie = 0;
  private readonly q = [0, 0, 0];

  constructor(points: DetailPoints, rest?: RestBody) {
    const rings = points.navelRings;
    this.around = rest && points.navel >= 0 && rings?.length ? aroundOf(rest, points.navel, rings[rings.length - 1]) : null;
  }

  /** Measured and shown: an outie's or an innie's (flat) surface within her navel's reach; false without her navel. */
  get surfaceOn(): boolean { return this.on; }
  /** How far out from her crown the shirt over her navel is drawn (world units), stretched by NAVEL DETAIL. */
  get reach(): number { return this.on ? this.bins * NAVEL_SURFACE.bin * this.stretch : 0; }

  /** Stop: nothing measured, nothing drawn, no contact moved (a probe lifting her navel's cloth the old way). */
  off(): void { this.on = false; }

  /**
   * Pose her navel's vertices (`around`) and measure (the cloth tee, which finds no tip of its own): her navel's tip is
   * the tallest of them, and of her navel's centre, along its axis.
   */
  follow(poser: Poser, d: Posed, keep: number): void {
    const list = this.around;
    if (!list) { this.on = false; return; }
    const [bx, by, bz] = d.base, [nx, ny, nz] = d.n, q = this.q;
    if (this.relief.length < list.length * 4) this.relief = new Float32Array(list.length * 4);
    const R = this.relief, at = [0, 0, 0], k = [0, 0, 0];
    let best = -Infinity;
    const take = (x: number, y: number, z: number, j: number): void => {
      const ex = x - bx, ey = y - by, ez = z - bz, al = ex * nx + ey * ny + ez * nz, tx = ex - al * nx, ty = ey - al * ny, tz = ez - al * nz;
      if (al > best) { best = al; at[0] = x; at[1] = y; at[2] = z; k[0] = tx; k[1] = ty; k[2] = tz; }
      if (j >= 0) { R[j * 4] = tx; R[j * 4 + 1] = ty; R[j * 4 + 2] = tz; R[j * 4 + 3] = al - d.curve * (d.reach2 - (tx * tx + ty * ty + tz * tz)); }
    };
    take(d.c[0], d.c[1], d.c[2], -1);
    for (let j = 0; j < list.length; j++) { poser.posedVertex(list[j], q); take(q[0], q[1], q[2], j); }
    this.measure(d, k, at, R, list.length, keep);
  }

  /**
   * HER NAVEL MEASURED for the shirt over it, from her vertices round its tip as posed now (`relief`, 4 a vertex: across
   * the axis from the outer ring's centre, and above her smooth surface; `m` of them), her tip across the axis (`k`) and
   * where it is (`at`): the tallest of them at each distance from its crown, never rising outward, above her belly round
   * her navel; outie or innie; and how far NAVEL DETAIL (`keep`) stretches it (1 at all of it, NAVEL_SURFACE.widest at
   * none).
   */
  measure(d: Posed, k: readonly number[], at: readonly number[], relief: Float32Array, m: number, keep: number): void {
    const P = this.profile, B = NAVEL_SURFACE.bins, bin = NAVEL_SURFACE.bin, [kx, ky, kz] = k;
    this.d = d;
    for (let c = 0; c < 3; c++) { this.k[c] = k[c]; this.crown[c] = at[c]; this.axis[c] = d.n[c]; }
    P.fill(-Infinity);
    // (her navel's centre vertex, which is not among the vertices round it, as one of them)
    const [bx, by, bz] = d.base, [nx, ny, nz] = d.n, ex = d.c[0] - bx, ey = d.c[1] - by, ez = d.c[2] - bz, al = ex * nx + ey * ny + ez * nz;
    const cx = ex - al * nx, cy = ey - al * ny, cz = ez - al * nz, centre = al - d.curve * (d.reach2 - (cx * cx + cy * cy + cz * cz));
    let last = 0;
    for (let j = -1; j < m; j++) {
      const h = j < 0 ? centre : relief[j * 4 + 3];
      if (!Number.isFinite(h)) continue;
      const r = j < 0 ? Math.hypot(cx - kx, cy - ky, cz - kz) : Math.hypot(relief[j * 4] - kx, relief[j * 4 + 1] - ky, relief[j * 4 + 2] - kz), b = Math.min(B - 1, Math.round(r / bin));
      if (h > P[b]) P[b] = h;
      last = Math.max(last, b + 1);
    }
    // (an empty bin on the line between the filled ones either side of it; never rising outward: whatever stands farther
    // out holds the nearer up)
    for (let b = 0, lo = -1; b < last; b++) {
      if (P[b] === -Infinity) continue;
      if (lo < 0) for (let e = 0; e < b; e++) P[e] = P[b];
      else for (let e = lo + 1; e < b; e++) P[e] = P[lo] + ((P[b] - P[lo]) * (e - lo)) / (b - lo);
      lo = b;
    }
    for (let b = last - 2; b >= 0; b--) if (P[b + 1] > P[b]) P[b] = P[b + 1];
    // her belly round her navel, where the profile has come down to it (the middle of its outer quarter; the last ring
    // can hold only a vertex or two): the smooth surface's own misfit there (about 0.8 mm at 73%), which the shirt
    // round her navel already lies on, so the profile is taken from it and comes down to nothing at its edge
    const floor = last > 0 ? P[Math.min(last - 1, Math.floor(last * 0.875))] : 0;
    this.floor = Number.isFinite(floor) ? floor : 0;
    for (let b = 0; b < last; b++) P[b] = Math.max(0, P[b] - this.floor);
    // OUTIE OR INNIE: her navel's own centre stands out of her belly, or it does not. An outie's profile is drawn,
    // stretched by NAVEL DETAIL; an innie's or a flat one's is nothing, at any NAVEL DETAIL -- the shirt laid flat across
    // it at her belly's height round it, never into it.
    this.outie = centre - this.floor;
    const outie = this.outie > NAVEL_SURFACE.outie;
    if (!outie) { P.fill(0, 0, last); last = Math.min(last, Math.ceil(d.rho / bin)); }
    this.bins = last;
    this.stretch = outie ? 1 + (NAVEL_SURFACE.widest - 1) * (1 - clamp01(keep)) : 1;
    this.on = last > 0 && m > 0;
  }

  /** Her navel's profile at `r` from its crown, stretched, between bins; -1 past its end. */
  private profileAt(r: number): number {
    const u = r / (this.stretch * NAVEL_SURFACE.bin), b = Math.floor(u);
    if (b >= this.bins) return -1;
    const f = u - b, a = this.profile[b], c = b + 1 < this.bins ? this.profile[b + 1] : 0;
    return a + (c - a) * f;
  }

  /**
   * How far out along her navel's axis the shirt over her smooth belly at `x, y, z` (`smoothOver`) is drawn: her navel's
   * own profile there (stretched by NAVEL DETAIL; nothing for an innie), and NAVEL_SURFACE.over more in proportion to how
   * tall it stands there. 0 away from her navel, and through her at her back.
   */
  raise(x: number, y: number, z: number): number {
    const d = this.d;
    if (!this.on || !d) return 0;
    const [bx, by, bz] = d.base, [nx, ny, nz] = d.n, [kx, ky, kz] = this.k;
    const dx = x - bx, dy = y - by, dz = z - bz, along = dx * nx + dy * ny + dz * nz;
    const tx = dx - along * nx, ty = dy - along * ny, tz = dz - along * nz, h = this.profileAt(Math.hypot(tx - kx, ty - ky, tz - kz));
    if (!(h > 0)) return 0;
    if (Math.abs(along - d.curve * (d.reach2 - (tx * tx + ty * ty + tz * tz)) - this.floor) > NAVEL_SURFACE.band) return 0;
    const top = this.profile[0];
    return h + (top > 0 ? NAVEL_SURFACE.over * Math.min(1, h / top) : 0);
  }

  /**
   * The cloth over her navel on her SMOOTH belly: every one of the `n` contacts in `A` on her skin within her navel's own
   * reach (unstretched) is moved along her navel's axis onto her smooth surface there (`floor` over the smooth quadric,
   * as the belly round her navel stands), with that surface's own normal. An outie no longer holds the cloth up and an
   * innie no longer lets it in: the cloth lies there at its own stand-off as it does over the rest of her belly. Returns
   * how many contacts it moved.
   */
  smoothOver(A: SkinContacts, n: number): number {
    const d = this.d;
    if (!this.on || !d) return 0;
    const [bx, by, bz] = d.base, [nx, ny, nz] = d.n, [kx, ky, kz] = this.k, q = A.point, qn = A.normal;
    const reach = this.bins * NAVEL_SURFACE.bin, c2 = 2 * d.curve;
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3, ex = q[i3] - bx, ey = q[i3 + 1] - by, ez = q[i3 + 2] - bz, al = ex * nx + ey * ny + ez * nz;
      const tx = ex - al * nx, ty = ey - al * ny, tz = ez - al * nz;
      if ((tx - kx) ** 2 + (ty - ky) ** 2 + (tz - kz) ** 2 > reach * reach) continue;
      const smooth = d.curve * (d.reach2 - (tx * tx + ty * ty + tz * tz)) + this.floor, move = smooth - al;
      if (Math.abs(move) > NAVEL_SURFACE.band) continue;
      q[i3] += nx * move; q[i3 + 1] += ny * move; q[i3 + 2] += nz * move;
      // (the smooth surface's normal: along its axis, leaning out with its slope)
      let mx = nx + c2 * tx, my = ny + c2 * ty, mz = nz + c2 * tz;
      const l = Math.hypot(mx, my, mz) || 1; mx /= l; my /= l; mz /= l;
      qn[i3] = mx; qn[i3 + 1] = my; qn[i3 + 2] = mz;
      moved++;
    }
    return moved;
  }

  /**
   * Her navel's profile as a shader takes it (the fitted tee's, `clothDetail.ts` ClothDetailSettle.profile): its heights
   * bin by bin, how far apart they are drawn (stretched by NAVEL DETAIL), her crown and her navel's axis, its top and
   * NAVEL_SURFACE.over. Null while nothing is measured.
   */
  profileFor(): { values: Float32Array; step: number; crown: [number, number, number]; axis: [number, number, number]; top: number; over: number } | null {
    if (!this.on) return null;
    return { values: this.profile.slice(0, this.bins), step: NAVEL_SURFACE.bin * this.stretch, crown: [...this.crown], axis: [...this.axis], top: this.profile[0], over: NAVEL_SURFACE.over };
  }

  /** As measured now, for a probe. */
  state(): { on: boolean; outie: number; floor: number; profile: number[]; stretch: number; reach: number } {
    return { on: this.on, outie: this.outie, floor: this.floor, profile: Array.from(this.profile.subarray(0, this.bins), (v) => +v.toFixed(4)), stretch: this.stretch, reach: this.reach };
  }
}
