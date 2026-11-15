/**
 * A MODELLED GARMENT'S STRINGS, EVENED (cordEvening.ts; Joshua, 2026-11-14, of her bikini top with MILK: "it doesn't
 * follow the skin").
 *
 * Her skin's fields slide her skin's points along her skin, each of her triangles by its own amount. A panel of cloth
 * rides that unseen; a string shows it as corners. Here a cord is a lace of rings on a flat piece of her (her skin's way
 * out +z), a metre a unit, and "her skin's field" is whatever each test lays on its points.
 */
import { describe, expect, it } from 'vitest';
import { CORD_EVENING, CordEvening, type EveningPart } from '../src/sarahlab/cordEvening';

const RING = 0.0015, WIDE = 0.002, THICK = 0.0003;
/** A lace from `from` along x (or y): `rings` rings 1.5 mm apart, each four points (2 mm wide, 0.3 mm thick), `off` above her skin (z = 0), its middle line at `across`. */
function lace(rings: number, off = 0.001, across = 0, from = 0, along: 'x' | 'y' = 'x'): EveningPart & { rings: number } {
  const pos: number[] = [], normal: number[] = [], offs: number[] = [];
  for (let r = 0; r < rings; r++) for (const [side, up] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
    const s = from + r * RING, t = across + side * WIDE / 2;
    pos.push(along === 'x' ? s : t, along === 'x' ? t : s, off + up * THICK); normal.push(0, 0, 1); offs.push(off + up * THICK);
  }
  return { pos: Float32Array.from(pos), cord: true, normal: Float32Array.from(normal), off: Float32Array.from(offs), rings };
}
/** A panel: points half a millimetre apart over x0..x1, y0..y1, 0.3 mm off her. */
function panel(x0: number, x1: number, y0: number, y1: number, step = 0.0005): EveningPart {
  const pos: number[] = [], normal: number[] = [], offs: number[] = [];
  for (let x = x0; x <= x1 + 1e-9; x += step) for (let y = y0; y <= y1 + 1e-9; y += step) { pos.push(x, y, 0.0003); normal.push(0, 0, 1); offs.push(0.0003); }
  return { pos: Float32Array.from(pos), cord: false, normal: Float32Array.from(normal), off: Float32Array.from(offs) };
}
/** A lace's middle line as moved: one place a ring. */
function middle(part: EveningPart, move: Float32Array): number[][] {
  const out: number[][] = [];
  for (let r = 0; r * 4 < part.pos.length / 3; r++) { const c = [0, 0, 0]; for (let k = 0; k < 4; k++) for (let a = 0; a < 3; a++) c[a] += (part.pos[(r * 4 + k) * 3 + a] + move[(r * 4 + k) * 3 + a]) / 4; out.push(c); }
  return out;
}
/** How sharply a line turns at each of its places, in degrees, over three rings either side. */
function turns(line: number[][], k = 3): number[] {
  const out: number[] = [];
  for (let i = k; i + k < line.length; i++) {
    const a = line[i].map((x, c) => x - line[i - k][c]), b = line[i + k].map((x, c) => x - line[i][c]);
    const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b));
    out.push((Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI);
  }
  return out;
}
/** Her skin's field as the transfer hands it over: a move a point, from where the point is. */
function moved(part: EveningPart, field: (x: number, y: number, z: number) => [number, number, number]): Float32Array {
  const out = new Float32Array(part.pos.length);
  for (let v = 0; v < out.length; v += 3) out.set(field(part.pos[v], part.pos[v + 1], part.pos[v + 2]), v);
  return out;
}
/** A slide that changes from one of her triangles to the next: 8 mm pieces, each with its own slide sideways, up to 2 mm. */
const zigzag = (x: number): number => [0.0016, -0.0012, 0.002, -0.0004, 0.0013, -0.0019, 0.0008, -0.0015, 0.0017, -0.0006][Math.floor(x / 0.008) % 10];

describe('a string lying on her', () => {
  const cord = lace(60), evening = new CordEvening([cord], 1);
  const field = (x: number): [number, number, number] => [0, zigzag(x), 0.004 + 0.02 * x];
  const raw = moved(cord, field), even = raw.slice();
  it('is evened: the corners her skin\'s slide gave it are gone', () => {
    expect(evening.even([even])).toBe(true);
    expect(evening.strings).toBe(60 * 4);
    // (her skin alone: a step of up to 3.6 mm sideways from one ring to the next, a corner of some 60 degrees)
    expect(Math.max(...turns(middle(cord, raw)))).toBeGreaterThan(40);
    expect(Math.max(...turns(middle(cord, even)))).toBeLessThan(6);
  });
  it('is never lowered into her: it keeps its share out from her skin, and is lifted by up to `lift` of how far it is slid', () => {
    let most = 0;
    for (let v = 0; v < raw.length; v += 3) {
      const slid = Math.hypot(even[v] - raw[v], even[v + 1] - raw[v + 1]), up = even[v + 2] - raw[v + 2];
      expect(up).toBeGreaterThanOrEqual(0);
      // (eased in: half its share at a slide of `liftEaseM`, nearly all of it at a long one)
      expect(up).toBeCloseTo((CORD_EVENING.lift * slid * slid) / (slid + CORD_EVENING.liftEaseM), 6);
      most = Math.max(most, slid);
    }
    expect(most).toBeGreaterThan(0.001);
  });
  it('and keeps its width: both edges of the lace take the same slide', () => {
    for (let r = 0; r < cord.rings; r++) expect(Math.abs(even[(r * 4) * 3 + 1] - even[(r * 4 + 1) * 3 + 1])).toBeLessThan(0.00005);
  });
});

describe('what the evening leaves as it is', () => {
  it('a field that moves no cord: nothing is changed, and it says so', () => {
    const cord = lace(20), cloth = panel(0, 0.03, -0.012, 0.012), evening = new CordEvening([cord, cloth], 1);
    const a = new Float32Array(cord.pos.length), b = moved(cloth, () => [0.001, 0.002, 0.003]), was = b.slice();
    expect(evening.even([a, b])).toBe(false);
    expect(Array.from(b)).toEqual(Array.from(was));
  });
  it('one move for every point (a carry): the string is carried, to a hundredth of a millimetre, and not lifted', () => {
    const cord = lace(40), evening = new CordEvening([cord], 1), a = moved(cord, () => [0.003, -0.002, 0.005]);
    evening.even([a]);
    for (let v = 0; v < a.length; v += 3) { expect(a[v]).toBeCloseTo(0.003, 5); expect(a[v + 1]).toBeCloseTo(-0.002, 5); expect(a[v + 2]).toBeCloseTo(0.005, 5); }
  });
  it('an even stretch along the string: away from its ends it is the same stretch', () => {
    const cord = lace(80), evening = new CordEvening([cord], 1);
    const a = moved(cord, (x) => [0.1 * x, 0.05 * x, 0]), raw = a.slice();
    evening.even([a]);
    // (a bell's mean of a straight line is the line, where the bell has the string on both sides of it)
    const edge = Math.ceil(CORD_EVENING.reachM / RING) + 1;
    for (let r = edge; r < cord.rings - edge; r++) for (let k = 0; k < 4; k++) for (let c = 0; c < 3; c++) expect(Math.abs(a[(r * 4 + k) * 3 + c] - raw[(r * 4 + k) * 3 + c])).toBeLessThan(0.00002);
  });
  it('a point that follows nothing (no place of her within reach): it is not moved, and is no part of the evening', () => {
    const cord = lace(30);
    for (let v = 10 * 4; v < 12 * 4; v++) cord.normal.fill(0, v * 3, v * 3 + 3);
    const evening = new CordEvening([cord], 1), a = moved(cord, (x) => [0, zigzag(x), 0]);
    for (let v = 10 * 4; v < 12 * 4; v++) a.fill(0, v * 3, v * 3 + 3);
    evening.even([a]);
    for (let v = 10 * 4; v < 12 * 4; v++) expect([a[v * 3], a[v * 3 + 1], a[v * 3 + 2]]).toEqual([0, 0, 0]);
    expect(evening.cords).toBe(30 * 4 - 8);
  });
});

describe('a string that spans the air', () => {
  // (5 mm off her: further than `freeM`)
  const cord = lace(60, 0.005), evening = new CordEvening([cord], 1);
  // the nearest place of her changes sides half way along: a step of 3 mm, out from her skin and along it
  const raw = moved(cord, (x) => (x < 0.045 ? [0, 0, 0] : [0, 0.002, 0.003])), even = raw.slice();
  it('takes all of the evened move: a step out from her skin is eased over its reach as well', () => {
    evening.even([even]);
    const before = middle(cord, raw), after = middle(cord, even);
    const step = (line: number[][]) => Math.max(...line.slice(1).map((p, i) => Math.hypot(p[1] - line[i][1], p[2] - line[i][2])));
    expect(step(before)).toBeCloseTo(Math.hypot(0.002, 0.003), 6);
    expect(step(after)).toBeLessThan(0.0005);
    // and well away from the step it is where her skin put it
    expect(even[2]).toBeCloseTo(0, 6); expect(even[even.length - 1]).toBeCloseTo(0.003, 6);
  });
  it('where a string lying on her would keep the step out from her skin (it is hers), and ease only the slide', () => {
    const lying = lace(60, 0.001), e = new CordEvening([lying], 1);
    const m = moved(lying, (x) => (x < 0.045 ? [0, 0, 0] : [0, 0.002, 0.003])), was = m.slice();
    e.even([m]);
    // (out from her: her skin's own step, and the lift of the slide on top of it -- never less than her skin's)
    for (let v = 0; v < m.length; v += 3) { expect(m[v + 2]).toBeGreaterThanOrEqual(was[v + 2]); expect(m[v + 2] - was[v + 2]).toBeLessThanOrEqual(CORD_EVENING.lift * 0.002 + 1e-9); }
    const after = middle(lying, m);
    expect(Math.max(...after.slice(1).map((p, i) => Math.abs(p[1] - after[i][1])))).toBeLessThan(0.0004);
  });
  it('and between the two (`onHerM` to `freeM` off her) by how far off her it is', () => {
    const at = (off: number) => { const c = lace(60, off), e = new CordEvening([c], 1), m = moved(c, (x) => (x < 0.045 ? [0, 0, 0] : [0, 0, 0.003])); e.even([m]); return m[(30 * 4) * 3 + 2]; };
    // (ring 30 is the first past the step: her skin alone gives it all 3 mm; evened whole, about half of it)
    expect(at(CORD_EVENING.onHerM - 0.0006)).toBeCloseTo(0.003, 6);
    const free = at(CORD_EVENING.freeM + 0.0001), between = at((CORD_EVENING.onHerM + CORD_EVENING.freeM) / 2 - 0.00025);
    expect(free).toBeGreaterThan(0.001); expect(free).toBeLessThan(0.002);
    expect(between).toBeGreaterThan(free + 0.0002); expect(between).toBeLessThan(0.003 - 0.0002);
  });
});

describe('a string\'s end on another string', () => {
  // a string along x, and one that leaves its middle along y: a T
  const round = lace(60, 0.001, 0), string = lace(40, 0.001, 0.045, 0.001, 'y');
  const evening = new CordEvening([round, string], 1);
  // her skin's slide differs under each: the join is where the two disagree
  const a = moved(round, (x) => [zigzag(x), 0, 0]), b = moved(string, (_x, y) => [zigzag(y + 0.02), 0, 0]);
  it('stays a join: the two are evened as one where they meet', () => {
    const rawGap = Math.abs(a[(30 * 4) * 3] - b[0]);
    evening.even([a, b]);
    // the string's first ring and the ring of the other it sits on (ring 30, x = 45 mm)
    expect(rawGap).toBeGreaterThan(0.001);
    expect(Math.abs(a[(30 * 4) * 3] - b[0])).toBeLessThan(0.00015);
  });
});

describe('a panel, the cord round it, and a string tied to that cord', () => {
  // a panel below y = 0, the cord along its edge (y = 0), and a string leaving the cord's middle (x = 45 mm) up along y
  const cloth = panel(0, 0.0885, -0.012, 0), round = lace(60, 0.001, 0), string = lace(40, 0.001, 0.045, 0.001, 'y');
  const evening = new CordEvening([cloth, round, string], 1);
  const field = (x: number, y: number): [number, number, number] => [zigzag(y + 0.02) * (y > 0 ? 1 : 0), zigzag(x), 0.004];
  const c = moved(cloth, field), a = moved(round, field), b = moved(string, field);
  const rawC = c.slice(), rawA = a.slice(), rawB = b.slice();
  evening.even([c, a, b]);
  it('the panel is not touched: it and her skin under it are moved by the same numbers', () => {
    expect(Array.from(c)).toEqual(Array.from(rawC));
  });
  it('nor is its own cord: a cup\'s edge and the cord round it stay as her skin alone has them, together', () => {
    expect(Array.from(a)).toEqual(Array.from(rawA));
    // (so of this garment's cords only the string is evened: its points more than `joinNearM` from the panel)
    expect(evening.strings).toBeGreaterThan(36 * 4);
    expect(evening.strings).toBeLessThanOrEqual(40 * 4);
  });
  it('the string\'s end stays on the cord it is tied to, and it is all string `joinFarM` from the panel', () => {
    // its first ring is 1 mm from the panel's edge: as her skin alone has it
    for (let k = 0; k < 4; k++) for (let x = 0; x < 3; x++) expect(b[k * 3 + x]).toBe(rawB[k * 3 + x]);
    // ring by ring it takes more of the evening, and past `joinFarM` all of it: what a string with no panel near takes
    const alone = lace(40, 0.001, 0.045, 0.001, 'y'), free = moved(alone, field);
    new CordEvening([round, alone], 1).even([rawA.slice(), free]);
    const first = Math.ceil((CORD_EVENING.joinFarM - 0.001) / RING) + 1;
    for (let r = first; r < string.rings; r++) for (let k = 0; k < 4; k++) for (let x = 0; x < 3; x++) expect(b[(r * 4 + k) * 3 + x]).toBeCloseTo(free[(r * 4 + k) * 3 + x], 7);
    // and it eases from the one to the other where it leaves the cord: its sharpest turn under half what her skin alone
    // gave it (MEASURED here: 12.8 degrees, where its foot, still her skin's, meets the evened string above it)
    expect(Math.max(...turns(middle(string, rawB)))).toBeGreaterThan(30);
    expect(Math.max(...turns(middle(string, b)))).toBeLessThan(15);
  });
});
