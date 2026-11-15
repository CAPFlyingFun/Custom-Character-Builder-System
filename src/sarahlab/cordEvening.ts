/**
 * A MODELLED GARMENT'S STRINGS, EVENED (Joshua, 2026-11-14, of her bikini top with MILK: "it doesn't follow the skin").
 *
 * A part of a modelled garment that has none of one of her shape fields takes it from her skin
 * (`garmentShapeTransfer.ts`): each of its points moves as the place of her skin nearest it at rest does. That is right
 * for a panel of cloth lying on her -- her cups cover her breasts however full they are, because they and her skin
 * under them are moved by the same numbers. But one of her fields does two things to her skin: it moves her SHAPE, and
 * it SLIDES her skin's points along her skin, each triangle of her by its own amount (her slip, `skinSlip.ts`). Nobody
 * sees the slide on her skin, nor on a panel that rides it. A STRING shows it: it is a line across her, and where it
 * crosses from one of her triangles to the next it turns a corner. And a string that SPANS THE AIR (from a cup up to
 * her neck, between her cups) has no one place of her under it: the nearest changes sides from one of its rings to the
 * next, and the string steps.
 *
 * MEASURED 2026-11-14 on her bikini top at MILK 100 (the room's body file and her milk file, her belly at 0%): her
 * skin's points 3.5 mm apart on her chest are moved up to 21 mm apart, and a string's rings, 1.5 mm apart, were stepped
 * up to 2.1 mm from one to the next -- a string zigzagged above each cup.
 *
 * So a STRING'S move is EVENED ALONG IT: at each of its points, the mean of the cords' moves round it, weighed by a bell
 * that is most at the point and nothing `reachM` away. Then, by how far off her skin the point lies at rest:
 * - a point that LIES ON HER (within `onHerM`) keeps its own share OUT FROM HER SKIN, takes the evened move's share
 *   ALONG her skin, and is LIFTED off her by up to `lift` of how far that slides it: what else shapes her (her bust's
 *   SIZE, her belly) turns her skin under it, and a slide along her skin as she rests would run it into her as she is;
 * - a point that SPANS THE AIR (`freeM` off her or more) takes all of the evened move.
 *
 * WHAT IS NOT EVENED, AND WHY. A panel, and the cord sewn round it (a cord point within `joinNearM` of a panel), move
 * exactly as her skin alone has them: a cup lies half a millimetre off her, and whatever is slid along her skin by
 * numbers that are not her skin's own is under her skin as soon as another of her shapes turns it (MEASURED in the
 * room 2026-11-14, a first build that evened each cup's edge with its cord: chips of her skin through a cup's edge at
 * SIZE +100 with MILK 100, and more with her belly at 200% as well). A string eases from the one to the other over its
 * first `joinFarM` from a panel, so its end stays on the cord it is tied to.
 *
 * Pure: arrays in, arrays out. Lengths are metres here and her mesh's units in the arrays (`unitsPerMetre`).
 */
import { UNITS_PER_METRE } from './softBody';

/** GAME TUNING, by eye and by measure on her bikini top at MILK 100 (`tests/cordEvening.test.ts`, CLAUDE.md). */
export const CORD_EVENING = Object.freeze({
  /** (metres) how far along a string a point's evening reaches: the bell is nothing here, and a third of this wide */
  reachM: 0.018,
  /** (metres) the cords' points are evened in lumps this big (its speed, not its look: well under `reachM`) */
  lumpM: 0.004,
  /** (metres) a string's point within this of her skin at rest lies on her: it keeps its own share out from her skin */
  onHerM: 0.0015,
  /** (metres) one this far off her skin at rest, or further, spans the air: it takes all of the evened move */
  freeM: 0.004,
  /** a point lying on her is lifted off her by this share of how far the evening slides it along her (a slide of 0.4 covers her skin turned 24 degrees under it) */
  lift: 0.4,
  /** (metres) ...eased in for a small slide, so the lift has no corner where the slide changes sides: at this slide it is half its share */
  liftEaseM: 0.001,
  /** (metres) a cord point within this of a panel is the panel's own cord: it moves as her skin alone has it */
  joinNearM: 0.002,
  /** (metres) a cord point this far from every panel, or further, is all string: it is evened whole */
  joinFarM: 0.006,
});

export interface EveningPart {
  /** its points at rest, xyz a point (her mesh's units) */
  readonly pos: Float32Array;
  /** a closed tube (a string, the cord round a cup) rather than a panel of cloth */
  readonly cord: boolean;
  /** her skin's way out at the place of her each point follows, xyz a point, unit; zero where a point follows nothing */
  readonly normal: Float32Array;
  /** how far off that place each point lies at rest (her mesh's units) */
  readonly off: Float32Array;
}

const ease = (t: number): number => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

/** Points in cells `cell` wide, to find the ones within `cell` of a place. */
class Cells {
  private readonly cells = new Map<number, number[]>();
  private readonly ox: number; private readonly oy: number; private readonly oz: number;
  private readonly nx: number; private readonly ny: number; private readonly nz: number;

  constructor(private readonly at: ArrayLike<number>, private readonly count: number, private readonly cell: number) {
    let ox = Infinity, oy = Infinity, oz = Infinity, hx = -Infinity, hy = -Infinity, hz = -Infinity;
    for (let c = 0; c < count; c++) {
      ox = Math.min(ox, at[c * 3]); oy = Math.min(oy, at[c * 3 + 1]); oz = Math.min(oz, at[c * 3 + 2]);
      hx = Math.max(hx, at[c * 3]); hy = Math.max(hy, at[c * 3 + 1]); hz = Math.max(hz, at[c * 3 + 2]);
    }
    this.ox = ox; this.oy = oy; this.oz = oz;
    // (a cell either side of them, so a question from just outside them is still a cell of the grid)
    this.nx = count ? Math.floor((hx - ox) / cell) + 3 : 0; this.ny = count ? Math.floor((hy - oy) / cell) + 3 : 0; this.nz = count ? Math.floor((hz - oz) / cell) + 3 : 0;
    for (let c = 0; c < count; c++) {
      const k = (this.of(at[c * 3 + 2], oz) * this.ny + this.of(at[c * 3 + 1], oy)) * this.nx + this.of(at[c * 3], ox);
      const list = this.cells.get(k); if (list) list.push(c); else this.cells.set(k, [c]);
    }
  }

  private of(x: number, o: number): number { return Math.floor((x - o) / this.cell) + 1; }

  /** Every point in the cells round (x, y, z) -- all of those within `cell` of it, and some further -- with its distance squared. */
  near(x: number, y: number, z: number, visit: (c: number, d2: number) => void): void {
    if (!this.count) return;
    const { at, nx, ny, nz } = this, ci = this.of(x, this.ox), cj = this.of(y, this.oy), ck = this.of(z, this.oz);
    for (let k = Math.max(0, ck - 1); k <= Math.min(nz - 1, ck + 1); k++) for (let j = Math.max(0, cj - 1); j <= Math.min(ny - 1, cj + 1); j++) for (let i = Math.max(0, ci - 1); i <= Math.min(nx - 1, ci + 1); i++) {
      const list = this.cells.get((k * ny + j) * nx + i); if (!list) continue;
      for (const c of list) { const dx = at[c * 3] - x, dy = at[c * 3 + 1] - y, dz = at[c * 3 + 2] - z; visit(c, dx * dx + dy * dy + dz * dz); }
    }
  }

  /** How far the nearest point within `cell` of (x, y, z) is, squared (Infinity: none); as soon as one within `enough2` is found, that one's. */
  nearest2(x: number, y: number, z: number, enough2: number): number {
    if (!this.count) return Infinity;
    const { at, nx, ny, nz } = this, ci = this.of(x, this.ox), cj = this.of(y, this.oy), ck = this.of(z, this.oz), reach2 = this.cell * this.cell;
    let best = Infinity;
    for (let k = Math.max(0, ck - 1); k <= Math.min(nz - 1, ck + 1); k++) for (let j = Math.max(0, cj - 1); j <= Math.min(ny - 1, cj + 1); j++) for (let i = Math.max(0, ci - 1); i <= Math.min(nx - 1, ci + 1); i++) {
      const list = this.cells.get((k * ny + j) * nx + i); if (!list) continue;
      for (const c of list) { const dx = at[c * 3] - x, dy = at[c * 3 + 1] - y, dz = at[c * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz; if (d2 < best) { best = d2; if (d2 <= enough2) return d2; } }
    }
    return best <= reach2 ? best : Infinity;
  }
}

/** One cord part's points that are evened: which, how much of the evened move each takes, and the lumps each reads. */
interface Evened {
  /** the part's points that take any of it */
  readonly points: Uint32Array;
  /** how much of the evened share ALONG her skin each takes: how much of a string it is (none by a panel, all `joinFarM` from one) */
  readonly along: Float32Array;
  /** how much of the evened share OUT FROM her skin each takes (as much of a string as it is, and as it spans the air) */
  readonly out: Float32Array;
  /** how far off her each is lifted, a unit of slide along her (as much of a string as it is, and as it lies on her) */
  readonly lift: Float32Array;
  /** each point's lumps, one after another: `lump[start[k] .. start[k + 1]]`, each with its weight (a point's sum to 1) */
  readonly start: Uint32Array;
  readonly lump: Uint32Array;
  readonly weight: Float32Array;
}

export class CordEvening {
  /** how many of the cords' points follow her skin at all, in how many lumps; and how many of them are evened */
  readonly cords: number;
  readonly lumps: number;
  readonly strings: number;
  /** per cord part: each point's lump (-1: it follows nothing) */
  private readonly lumpOf: (Int32Array | null)[];
  private readonly lumpSize: Float32Array;
  private readonly sum: Float32Array;
  private readonly evened: (Evened | null)[];
  private readonly normals: Float32Array[];
  private readonly liftEase: number;

  constructor(parts: readonly EveningPart[], unitsPerMetre = UNITS_PER_METRE, tuning: typeof CORD_EVENING = CORD_EVENING) {
    const U = unitsPerMetre, reach = Math.max(1e-9, tuning.reachM * U), lump = Math.max(1e-9, tuning.lumpM * U);
    const onHer = tuning.onHerM * U, free = tuning.freeM * U, joinNear = tuning.joinNearM * U, joinFar = Math.max(1e-9, tuning.joinFarM * U);
    this.liftEase = Math.max(1e-12, tuning.liftEaseM * U);
    this.normals = parts.map((p) => p.normal);
    const follows = (p: EveningPart, v: number) => !!(p.normal[v * 3] || p.normal[v * 3 + 1] || p.normal[v * 3 + 2]);

    // THE LUMPS: the cords' points that follow her, gathered by the cell of a grid `lumpM` wide each is in -- a lump's
    // place is the mean of its points', its move the mean of theirs
    const cellOfLump = new Map<string, number>(), middle: number[] = [], size: number[] = [];
    let cords = 0;
    this.lumpOf = parts.map((p) => {
      if (!p.cord) return null;
      const n = p.pos.length / 3, of = new Int32Array(n).fill(-1);
      for (let v = 0; v < n; v++) {
        if (!follows(p, v)) continue;
        const x = p.pos[v * 3], y = p.pos[v * 3 + 1], z = p.pos[v * 3 + 2], key = `${Math.floor(x / lump)},${Math.floor(y / lump)},${Math.floor(z / lump)}`;
        let l = cellOfLump.get(key);
        if (l === undefined) { l = size.length; cellOfLump.set(key, l); size.push(0); middle.push(0, 0, 0); }
        of[v] = l; size[l]++; middle[l * 3] += x; middle[l * 3 + 1] += y; middle[l * 3 + 2] += z; cords++;
      }
      return of;
    });
    this.cords = cords; this.lumps = size.length;
    this.lumpSize = Float32Array.from(size);
    const at = new Float32Array(middle.length);
    for (let l = 0; l < size.length; l++) for (let c = 0; c < 3; c++) at[l * 3 + c] = middle[l * 3 + c] / size[l];
    this.sum = new Float32Array(at.length);
    const lumps = new Cells(at, size.length, reach);

    // every point of every panel, to tell a panel's own cord from a string
    let panelPoints = 0;
    for (const p of parts) if (!p.cord) panelPoints += p.pos.length / 3;
    const panelAt = new Float32Array(panelPoints * 3);
    let g = 0;
    for (const p of parts) if (!p.cord) { panelAt.set(p.pos, g); g += p.pos.length; }
    const panels = new Cells(panelAt, panelPoints, joinFar);

    // WHAT EACH CORD POINT TAKES: none of the evening by a panel, all of it `joinFarM` from one; of the share out from
    // her as it spans the air, and a lift off her as it lies on her
    const reach2 = reach * reach, near2 = joinNear * joinNear;
    let strings = 0;
    this.evened = parts.map((p) => {
      if (!p.cord) return null;
      const n = p.pos.length / 3, points: number[] = [], along: number[] = [], out: number[] = [], lift: number[] = [], start: number[] = [0], lumpIds: number[] = [], weights: number[] = [];
      for (let v = 0; v < n; v++) {
        if (!follows(p, v)) continue;
        const x = p.pos[v * 3], y = p.pos[v * 3 + 1], z = p.pos[v * 3 + 2];
        const d2 = panels.nearest2(x, y, z, near2), string = d2 === Infinity ? 1 : ease((Math.sqrt(d2) - joinNear) / Math.max(1e-12, joinFar - joinNear));
        if (!string) continue;
        // the lumps within reach, by the bell: (1 - (d / reach)^2)^3, times how many points each lump is
        const from = lumpIds.length;
        let total = 0;
        lumps.near(x, y, z, (l, q) => { if (q >= reach2) return; const b = 1 - q / reach2, w = b * b * b * size[l]; lumpIds.push(l); weights.push(w); total += w; });
        if (!(total > 0)) { lumpIds.length = from; weights.length = from; continue; }
        for (let k = from; k < weights.length; k++) weights[k] /= total;
        const spans = ease((p.off[v] - onHer) / Math.max(1e-12, free - onHer));
        points.push(v); along.push(string); out.push(string * spans); lift.push(string * (1 - spans) * tuning.lift); start.push(lumpIds.length);
      }
      strings += points.length;
      return { points: Uint32Array.from(points), along: Float32Array.from(along), out: Float32Array.from(out), lift: Float32Array.from(lift), start: Uint32Array.from(start), lump: Uint32Array.from(lumpIds), weight: Float32Array.from(weights) };
    });
    this.strings = strings;
  }

  /**
   * Even `moves` in place: one array a part, xyz a point, what her skin's field alone gives each point. Only strings'
   * points are changed. Returns false (and changes nothing) when the field moves none of the cords.
   */
  even(moves: readonly Float32Array[]): boolean {
    const sum = this.sum, size = this.lumpSize;
    // each lump's move: the mean of its points'
    sum.fill(0);
    let any = false;
    moves.forEach((m, i) => {
      const of = this.lumpOf[i]; if (!of) return;
      for (let v = 0; v < of.length; v++) {
        const l = of[v]; if (l < 0) continue;
        const x = m[v * 3], y = m[v * 3 + 1], z = m[v * 3 + 2];
        if (x || y || z) { sum[l * 3] += x; sum[l * 3 + 1] += y; sum[l * 3 + 2] += z; any = true; }
      }
    });
    if (!any) return false;
    for (let l = 0; l < size.length; l++) { const w = 1 / size[l]; sum[l * 3] *= w; sum[l * 3 + 1] *= w; sum[l * 3 + 2] *= w; }
    moves.forEach((m, i) => {
      const e = this.evened[i], n = this.normals[i];
      if (!e) return;
      for (let k = 0; k < e.points.length; k++) {
        // the evened move here: the bell's mean of the lumps round it
        let ex = 0, ey = 0, ez = 0;
        for (let j = e.start[k]; j < e.start[k + 1]; j++) { const l = e.lump[j] * 3, w = e.weight[j]; ex += w * sum[l]; ey += w * sum[l + 1]; ez += w * sum[l + 2]; }
        const o = e.points[k] * 3, nx = n[o], ny = n[o + 1], nz = n[o + 2];
        // what it changes of the point's own move, split by her skin's way out here: along her, and out from her
        const cx = ex - m[o], cy = ey - m[o + 1], cz = ez - m[o + 2], out = cx * nx + cy * ny + cz * nz;
        const sx = cx - out * nx, sy = cy - out * ny, sz = cz - out * nz, a = e.along[k], slide = Math.hypot(sx, sy, sz);
        const up = e.out[k] * out + e.lift[k] * ((slide * slide) / (slide + this.liftEase));
        m[o] += a * sx + up * nx; m[o + 1] += a * sy + up * ny; m[o + 2] += a * sz + up * nz;
      }
    });
    return true;
  }
}
