/**
 * A SKIRT'S FIT (`skirt/skirtDraft.ts` `SKIRT_FIT`; Joshua, 2026-11-17, two red lines down a figure's side: "How tightly
 * it curves with the body from legs to legs… for tighter ones, it's actually a simple bridge… that span the front and
 * back gap between the legs… not cloth and if you do a looser one, it fades somehow to cloth sim"):
 * - the cloth is the cloth it always was at every FIT: its cut, its ring's grip;
 * - under 1 it has a second cut, ON HER (her own outline in and out), which the sheet is drawn toward: each point of
 *   it the nearest of her to that point of the cloth, so no share of the way between the two is in her;
 * - a point of that cut over the gap between her legs is spanned between the points either side (`heldSpans`);
 * - drawn between her and the cloth, a point found in her skin is put out through it (`sheetOutOfSkin`);
 * - a save keeps it (`readSkirtRecord`), and saying nothing is 1.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { COVERAGE_TEMPLATES } from '../src/sarahlab/paintTemplates';
import { hoopInside, limbSkin, lowFrame, lowSpec, type LowFrame } from '../src/sarahlab/bottomCut';
import { FACE_REST_OFFSET, FACE_REST_SCALE } from '../src/sarahlab/faceRig';
import { bodyInputOf } from '../src/sarahlab/garment/bodyInput';
import { dressForm } from '../src/sarahlab/garment/measure';
import type { BodyInput } from '../src/sarahlab/garment/types';
import {
  SKIRT_CUT, SKIRT_FIT, SKIRT_LINE, SKIRT_RECORD_VERSION, clampSkirt, draftSkirt, fitOf, heldSpans, nearestOn, readSkirtRecord, sameSkirt, underLine,
  type SkirtDraft, type SkirtSettings,
} from '../src/sarahlab/skirt/skirtDraft';
import { SKIRT_UNDER_BAND } from '../src/sarahlab/sarahLabTool';
import { SHEET_TAUT, sheetOutOfSkin, tautColumns } from '../src/sarahlab/clothSkirt';
import { loadHerBody, type HerBody } from './herBodyMap';

/** An upright post, `radius(y)` round, from the floor to 1.5 m (as `tests/skirtLine.test.ts`'s). */
function post(radius: (y: number) => number, around = 72, step = 0.01): BodyInput {
  const rings = Math.round(1.5 / step) + 1, positions = new Float32Array(rings * around * 3), tris: number[] = [];
  for (let r = 0; r < rings; r++) for (let k = 0; k < around; k++) {
    const a = (k / around) * Math.PI * 2, y = r * step, R = radius(y), i = (r * around + k) * 3;
    positions[i] = Math.sin(a) * R; positions[i + 1] = y; positions[i + 2] = Math.cos(a) * R;
    if (r + 1 < rings) { const l = (k + 1) % around, p = r * around + k, q = r * around + l, u = p + around, v = q + around; tris.push(p, q, u, q, v, u); }
  }
  const at = (y: number): [number, number, number] => [0, y, 0], pair = (y: number) => [[0.08, y, 0], [-0.08, y, 0]] as const;
  return {
    positions, triangles: Uint32Array.from(tris), arm: new Float32Array(rings * around),
    joints: { pelvis: at(0.95), chest: at(1.25), neck: at(1.45), head: at(1.5), shoulder: pair(1.4), elbow: pair(1.15), wrist: pair(0.9), hip: pair(0.9), knee: pair(0.5), ankle: pair(0.08) } as unknown as BodyInput['joints'],
  };
}
/**
 * A figure whose legs stand BEHIND its hips, as hers do: round (18 cm) from 0.7 m up; from 0.5 m down an oval 14 cm
 * across by 6.5 deep (half of each), its middle 8 cm behind the axis; the one eased into the other between. `rim(y)`
 * says the oval's half-sizes and its middle at a height.
 */
const leaning = (y: number): { readonly a: number; readonly b: number; readonly z: number } => { const t = Math.min(1, Math.max(0, (0.7 - y) / 0.2)); return { a: 0.18 + (0.14 - 0.18) * t, b: 0.18 + (0.065 - 0.18) * t, z: -0.08 * t }; };
function leaningPost(around = 144, step = 0.01): BodyInput {
  const base = post(() => 0.1, around, step), P = base.positions as Float32Array;
  for (let i = 0; i < P.length; i += 3) { const a = Math.atan2(P[i], P[i + 2]), o = leaning(P[i + 1]); P[i] = Math.sin(a) * o.a; P[i + 2] = o.z + Math.cos(a) * o.b; }
  return base;
}
/** Wide at her hips (18 cm at 0.85 m), in to 10 cm at her knees (0.5 m), out again to 14 cm at 0.2 m: an outline a skirt can follow in and out. */
const hourglass = (y: number): number => (y >= 0.85 ? 0.18 : y >= 0.5 ? 0.10 + 0.08 * ((y - 0.5) / 0.35) : y >= 0.2 ? 0.14 - 0.04 * ((y - 0.2) / 0.3) : 0.14);
const skirt = (over: Partial<SkirtSettings>): SkirtSettings => clampSkirt({ top: 'under', length: 0.7, flare: 0, tucked: false, ...over });
/** How far out of the upright axis point `p` of a draft is. */
const out = (d: SkirtDraft, p: number): number => Math.hypot(d.rest[p * 3] - d.axis[0], d.rest[p * 3 + 2] - d.axis[1]);

describe('FIT as a number', () => {
  it('is 1 where a skirt says nothing, is said only where it is not, and is held to 0..1', () => {
    expect(fitOf({})).toBe(1); expect(fitOf({ fit: NaN })).toBe(1); expect(fitOf({ fit: 7 })).toBe(1); expect(fitOf({ fit: -1 })).toBe(0); expect(fitOf({ fit: 0.4 })).toBe(0.4);
    expect('fit' in skirt({})).toBe(false); expect('fit' in skirt({ fit: 1 })).toBe(false);
    expect(skirt({ fit: 0.25 }).fit).toBe(0.25); expect(skirt({ fit: -3 }).fit).toBe(0);
  });
  it('tells two skirts cut the same from two that are not', () => {
    expect(sameSkirt(skirt({}), skirt({ fit: 1 }))).toBe(true);
    expect(sameSkirt(skirt({}), { ...skirt({}), anchors: { front: true, back: true, left: true, right: true } })).toBe(true);
    expect(sameSkirt(skirt({}), skirt({ fit: 0.5 }))).toBe(false);
    expect(sameSkirt(skirt({}), skirt({ length: 0.71 }))).toBe(false);
    expect(sameSkirt(skirt({}), skirt({ flare: 0.2 }))).toBe(false);
    expect(sameSkirt(skirt({}), skirt({ anchors: { front: true, back: true, left: false, right: true } }))).toBe(false);
  });
  it('is read from a file that may hold anything', () => {
    expect(readSkirtRecord(null)).toBeNull(); expect(readSkirtRecord('skirt')).toBeNull(); expect(readSkirtRecord({ version: 2, settings: {} })).toBeNull(); expect(readSkirtRecord({ version: 1 })).toBeNull();
    const r = readSkirtRecord({ version: 1, settings: { top: 'under', length: 4, flare: 'wide', fit: 0.3, tucked: true, anchors: { left: false, up: true }, colour: 'red' }, more: 1 })!;
    expect(r).toEqual({ version: SKIRT_RECORD_VERSION, settings: { top: 'under', tucked: false, length: 1, flare: 0.5, fit: 0.3, anchors: { front: true, back: true, left: false, right: true } } });
    // (what a save writes reads back the same)
    const s = skirt({ fit: 0.5, length: 0.4 });
    expect(readSkirtRecord(JSON.parse(JSON.stringify({ version: SKIRT_RECORD_VERSION, settings: s })))!.settings).toEqual(s);
  });
});

describe('a skirt drafted at a FIT', () => {
  const body = post(hourglass);
  /** How far out of the post's own axis point `p` of a cut is (a post is round its axis at every height). */
  const round = (cut: ArrayLike<number>, p: number): number => Math.hypot(cut[p * 3], cut[p * 3 + 2]);
  it('at 1 is one cut, held at its ring alone, and never comes back in going down', () => {
    const d = draftSkirt(body, skirt({})), cols = d.columns;
    expect([d.fit, d.hug, d.heldRows]).toEqual([1, null, 1]);
    expect(Array.from({ length: 5 }, (_, r) => +d.pin[r * cols].toFixed(3))).toEqual([1, 0.7, 0.3, 0, 0]);
    for (let c = 0; c < cols; c += 9) for (let r = 2; r < d.rows; r++) expect(out(d, r * cols + c), `row ${r}`).toBeGreaterThanOrEqual(out(d, (r - 1) * cols + c) - 1e-6);
    // (her knees are 8 cm in from her hips: it stands that far off her there)
    const last = (d.rows - 1) * cols;
    expect(out(d, last)).toBeGreaterThan(hourglass(d.rest[last * 3 + 1]) + 0.03);
  });
  it('under 1 its cloth is the cloth it has at 1, to the last bit: its cut and its ring\'s grip', () => {
    const loose = draftSkirt(body, skirt({}));
    for (const fit of [0, 0.3, 0.75]) {
      const d = draftSkirt(body, skirt({ fit }));
      expect(d.fit).toBe(fit); expect(d.heldRows).toBe(d.rows);
      expect(Array.from(d.rest)).toEqual(Array.from(loose.rest));
      expect(Array.from(d.pin)).toEqual(Array.from(loose.pin));
      expect(Array.from(d.triangles)).toEqual(Array.from(loose.triangles));
    }
  });
  it('...and it has a second cut, on her: her own outline, in and out, from the ring it always had', () => {
    const d = draftSkirt(body, skirt({ fit: 0 })), cols = d.columns, hug = d.hug!;
    let in_ = 0, out_ = 0;
    for (let r = 1; r < d.rows; r++) for (let c = 0; c < cols; c += 6) {
      const p = r * cols + c, y = hug[p * 3 + 1];
      expect(y).toBe(d.rest[p * 3 + 1]);
      // (a post of 72 flat sides: its outline is within a tenth of a millimetre of its radius; a slice is a centimetre)
      expect(round(hug, p), `row ${r}`).toBeGreaterThan(hourglass(y) + SKIRT_CUT.ease - 0.004);
      expect(round(hug, p), `row ${r}`).toBeLessThan(hourglass(y) + SKIRT_CUT.ease + 0.004);
      if (r > 1) { const was = round(hug, p - cols); if (round(hug, p) < was - 1e-4) in_++; if (round(hug, p) > was + 1e-4) out_++; }
    }
    expect(in_).toBeGreaterThan(10); expect(out_).toBeGreaterThan(5);
    for (let i = 0; i < cols * 3; i++) expect(hug[i]).toBe(d.rest[i]);
    // (the same on-her cut whatever the FIT under 1: FIT says how far from it the sheet is drawn, not where it is)
    expect(Array.from(draftSkirt(body, skirt({ fit: 0.6 })).hug!)).toEqual(Array.from(hug));
    // ...and no FLARE in it: on her is on her (each point the nearest of her to the cloth's own; round a post that
    // is the same place however far out the cloth is cut)
    const flared = draftSkirt(body, skirt({ fit: 0, flare: 1 })).hug!;
    for (let i = cols * 3; i < hug.length; i++) expect(Math.abs(flared[i] - hug[i])).toBeLessThan(1e-6);
  });
});

describe('the nearest of an outline to a point', () => {
  const square = [1, 1, -1, 1, -1, -1, 1, -1], out = [0, 0, 0];
  it('is on its rim: on a side, or at a corner', () => {
    expect(nearestOn(square, 3, 0.25, out)).toBe(true); expect(out).toEqual([1, 0.25, 0]);
    nearestOn(square, 4, 5, out); expect(out).toEqual([1, 1, 0]);
    nearestOn(square, -0.5, -7, out); expect(out).toEqual([-0.5, -1, 0]);
  });
  it('says where the outline holds the point (its nearest is the nearest of the rim all the same), whichever way round it is told', () => {
    nearestOn(square, 0.25, 0.9, out); expect(out[0]).toBeCloseTo(0.25, 12); expect(out[1]).toBeCloseTo(1, 12); expect(out[2]).toBe(1);
    const other = [1, -1, -1, -1, -1, 1, 1, 1];
    nearestOn(other, 0.25, 0.9, out); expect(out[2]).toBe(1);
    nearestOn(other, 1.5, 0, out); expect(out).toEqual([1, 0, 0]);
  });
  it('is none where there is no outline', () => {
    expect(nearestOn([], 0, 0, out)).toBe(false); expect(nearestOn([0, 0, 1, 1], 0, 0, out)).toBe(false);
  });
});

describe('a place on her for each point of the cloth', () => {
  // HER LEGS STAND BEHIND HER HIPS: the cloth falls straight from her hips round one upright axis, and her legs' outline
  // does not hold that axis at all (the oval's front is 1.5 cm behind it from 0.5 m down)
  const body = leaningPost(), s = skirt({ length: 0.6, fit: 0.5 }), d = draftSkirt(body, s), cols = d.columns, hug = d.hug!, rest = d.rest;
  /** How far inside the figure's own outline (x, z) is at a height: over 0 inside (metres, about). */
  const within = (x: number, y: number, z: number): number => { const o = leaning(y), q = Math.hypot(x / o.a, (z - o.z) / o.b); return (1 - q) * Math.min(o.a, o.b); };
  it('is on her: `ease` off her outline at its own height, wherever round her that is', () => {
    expect(d.hemY).toBeLessThan(0.45);
    expect(leaning(d.hemY).z + leaning(d.hemY).b).toBeLessThan(d.axis[1]);
    for (let p = cols; p < d.count; p++) {
      const x = hug[p * 3], y = hug[p * 3 + 1], z = hug[p * 3 + 2], o = leaning(y);
      expect(y).toBe(rest[p * 3 + 1]);
      // (outside the oval, and no further off it than its ease and what a 144-sided post and a centimetre's slices leave)
      expect(within(x, y, z), `point ${p}`).toBeLessThan(0.0005);
      const a = Math.atan2(x / o.a, (z - o.z) / o.b), off = Math.hypot(x - Math.sin(a) * o.a, z - o.z - Math.cos(a) * o.b);
      expect(off, `point ${p}`).toBeLessThan(SKIRT_CUT.ease + 0.006);
    }
  });
  it('is the nearest of her to that point of the cloth: the way from the one to the other is straight out of her', () => {
    let read = 0;
    for (let p = cols; p < d.count; p++) {
      const x = hug[p * 3], y = hug[p * 3 + 1], z = hug[p * 3 + 2], o = leaning(y), wx = rest[p * 3] - x, wz = rest[p * 3 + 2] - z, far = Math.hypot(wx, wz);
      if (far < 0.02) continue;
      // (the oval's own way out at the place: the gradient of (x/a)^2 + (z/b)^2)
      const nx = x / (o.a * o.a), nz = (z - o.z) / (o.b * o.b), nl = Math.hypot(nx, nz);
      expect((wx * nx + wz * nz) / (far * nl), `point ${p}`).toBeGreaterThan(0.97);
      read++;
    }
    expect(read).toBeGreaterThan(500);
  });
  it('...so no share of the way from her to the cloth is in her', () => {
    for (const f of [0.1, 0.25, 0.5, 0.75, 0.9]) for (let p = cols; p < d.count; p++) {
      const x = hug[p * 3] + (rest[p * 3] - hug[p * 3]) * f, z = hug[p * 3 + 2] + (rest[p * 3 + 2] - hug[p * 3 + 2]) * f;
      expect(within(x, rest[p * 3 + 1], z), `point ${p} at ${f}`).toBeLessThan(0.0005);
    }
  });
});

describe('the sheet as drawn, put out of her skin', () => {
  // her skin under each point: the point of her, and the way her skin faces there (up, +y), three a point -- the
  // third set of a skirt's contacts, so point p's are at `first + p`
  const first = 2, off = 0.006, deep = 0.04;
  const lay = (at: readonly (readonly [number, number, number])[], normal: readonly [number, number, number] = [0, 1, 0]) => {
    const x = new Float32Array(at.length * 3), point = new Float32Array((first + at.length) * 3), n = new Float32Array((first + at.length) * 3);
    at.forEach((p, i) => { x.set(p, i * 3); n.set(normal, (first + i) * 3); });
    return { x, point, n };
  };
  it('a point squarely behind her skin is in her: out through her skin there, to the ease', () => {
    const s = lay([[0, -0.005, 0], [0.001, -0.015, 0.002]]), moved = sheetOutOfSkin(s.x, 0, 2, s.point, s.n, first, off, deep);
    expect(moved.put).toBe(2); expect(moved.most).toBeCloseTo(0.021, 6);
    expect(s.x[1]).toBeCloseTo(off, 7); expect(s.x[0]).toBe(0);
    expect(s.x[4]).toBeCloseTo(off, 7); expect(s.x[3]).toBeCloseTo(0.001, 7); expect(s.x[5]).toBeCloseTo(0.002, 7);
  });
  it('a point before her skin and nearer than the ease is put out to it the way it lies; one at the ease or past it is left', () => {
    const s = lay([[0, 0.003, 0], [0.003, 0.004, 0], [0, 0.006, 0], [0.02, 0.001, 0]]), was = Array.from(s.x), moved = sheetOutOfSkin(s.x, 0, 4, s.point, s.n, first, off, deep);
    expect(moved.put).toBe(2);
    expect(s.x[1]).toBeCloseTo(off, 7);
    expect(Math.hypot(s.x[3], s.x[4])).toBeCloseTo(off, 7); expect(s.x[3] / s.x[4]).toBeCloseTo(0.75, 5);
    expect(Array.from(s.x.subarray(6))).toEqual(was.slice(6));
  });
  it('behind her skin but deeper than a leg is not its floor, and off an edge of her is not in her', () => {
    // 5 cm behind (the far side of a leg); and 1 cm to the side of the nearest of her and 3 mm under its plane (it hangs off an edge)
    const s = lay([[0, -0.05, 0], [0.01, -0.003, 0]]), was = Array.from(s.x), moved = sheetOutOfSkin(s.x, 0, 2, s.point, s.n, first, off, deep);
    expect(moved.put).toBe(0); expect(Array.from(s.x)).toEqual(was);
    // ...off an edge and nearer than the ease: out to it the way it lies, not through the edge's triangle
    const e = lay([[0.004, -0.001, 0]]); sheetOutOfSkin(e.x, 0, 1, e.point, e.n, first, off, deep);
    expect(Math.hypot(e.x[0], e.x[1])).toBeCloseTo(off, 7); expect(e.x[1]).toBeLessThan(0);
  });
  it('a point with no skin found under it is left, and so is every point before the first asked for (its ring)', () => {
    const s = lay([[0, -0.005, 0], [0, -0.005, 0], [0, -0.005, 0]]);
    s.n.fill(0, (first + 1) * 3, (first + 2) * 3);
    const moved = sheetOutOfSkin(s.x, 1, 3, s.point, s.n, first, off, deep);
    expect(moved.put).toBe(1); expect(s.x[1]).toBeCloseTo(-0.005, 7); expect(s.x[4]).toBeCloseTo(-0.005, 7); expect(s.x[7]).toBeCloseTo(off, 7);
  });
  it('whichever way her skin faces', () => {
    const k = Math.SQRT1_2, s = lay([[-0.004 * k, 0, -0.004 * k]], [k, 0, k]), moved = sheetOutOfSkin(s.x, 0, 1, s.point, s.n, first, off, deep);
    expect(moved.put).toBe(1); expect(s.x[0]).toBeCloseTo(off * k, 7); expect(s.x[2]).toBeCloseTo(off * k, 7);
  });
});

describe('the sheet as drawn, taut across her creases', () => {
  // a strip of sheet down her back: `columns` points a row, a row every 2 cm going down (-y), her skin facing back (+z)
  // under every point of it; `z(r)`: how far out each row stands
  const columns = 3, step = 0.02;
  const strip = (z: readonly number[], facing: (r: number) => readonly [number, number, number] = () => [0, 0, 1]) => {
    const rows = z.length, x = new Float32Array(rows * columns * 3), n = new Float32Array(rows * columns * 3);
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) { const i = (r * columns + c) * 3; x.set([c * 0.015, -r * step, z[r]], i); n.set(facing(r), i); }
    return { x, n, rows, z: (r: number, c = 1) => x[(r * columns + c) * 3 + 2] };
  };
  it('a row gone into a fold is brought out to the straight run between the rows either side of it', () => {
    const s = strip([0, 0, -0.012, 0, 0]), t = tautColumns(s.x, columns, s.rows, s.n, 1, 0.001, 0.03);
    expect(t.put).toBe(columns); expect(t.most).toBeCloseTo(0.012, 6);
    for (let r = 0; r < s.rows; r++) expect(s.z(r), `row ${r}`).toBeCloseTo(0, 6);
    // ...straight out, by the way her skin faces: not along the sheet
    expect(s.x[(2 * columns + 1) * 3 + 1]).toBeCloseTo(-2 * step, 7);
  });
  it('a fold as tall as its reach is lain across; one row of reach only rounds its corners', () => {
    const fold = [0, 0, -0.01, -0.016, -0.01, 0, 0, 0];
    const wide = strip(fold); tautColumns(wide.x, columns, wide.rows, wide.n, 3, 0.001, 0.03);
    for (let r = 0; r < wide.rows; r++) expect(wide.z(r), `row ${r}`).toBeGreaterThan(-0.0012);
    const narrow = strip(fold); tautColumns(narrow.x, columns, narrow.rows, narrow.n, 1, 0.001, 0.03);
    expect(narrow.z(3)).toBeLessThan(-0.005); expect(narrow.z(3)).toBeGreaterThan(-0.016 - 1e-9);
  });
  it('a slope and a round are left as they are: only what is inside the run between its neighbours moves', () => {
    for (const z of [[0, 0.01, 0.02, 0.03, 0.04], [0, 0.004, 0.006, 0.006, 0.004, 0]]) {
      const s = strip(z), was = Array.from(s.x), t = tautColumns(s.x, columns, s.rows, s.n, 3, 0.001, 0.03);
      expect(t.put, String(z)).toBe(0); expect(Array.from(s.x)).toEqual(was);
    }
  });
  it('over a point of her that stands out it is a tent: that point stays, the rows beside it come out to the run', () => {
    const s = strip([0, 0, 0, 0.012, 0, 0, 0]); tautColumns(s.x, columns, s.rows, s.n, 1, 0.001, 0.03);
    expect(s.z(3)).toBeCloseTo(0.012, 6); expect(s.z(2)).toBeCloseTo(0.006, 6); expect(s.z(4)).toBeGreaterThan(0.005); expect(s.z(0)).toBe(0);
  });
  it('never its ring, never further than its most, never for less than its slack', () => {
    // (the ring is its first row: nothing is over it to run from)
    const ring = strip([-0.02, 0, 0, 0]), was = ring.z(0); tautColumns(ring.x, columns, ring.rows, ring.n, 3, 0.001, 0.03);
    expect(ring.z(0)).toBe(was);
    const deep = strip([0, 0, -0.05, 0, 0]), t = tautColumns(deep.x, columns, deep.rows, deep.n, 1, 0.001, 0.03);
    expect(t.most).toBeCloseTo(0.03, 6); expect(deep.z(2)).toBeCloseTo(-0.02, 6);
    const slight = strip([0, 0, -0.0008, 0, 0]), same = Array.from(slight.x);
    expect(tautColumns(slight.x, columns, slight.rows, slight.n, 3, 0.001, 0.03).put).toBe(0); expect(Array.from(slight.x)).toEqual(same);
  });
  it('by the way her skin faces at the two it runs between: none found under one, or the two facing apart, and it is left', () => {
    const none = strip([0, 0, -0.012, 0, 0], (r) => (r === 1 ? [0, 0, 0] : [0, 0, 1])), a = Array.from(none.x);
    expect(tautColumns(none.x, columns, none.rows, none.n, 1, 0.001, 0.03).put).toBe(0); expect(Array.from(none.x)).toEqual(a);
    const apart = strip([0, 0, -0.012, 0, 0], (r) => (r === 1 ? [0, 0, 1] : r === 3 ? [0, 0.3, -0.954] : [0, 0, 1])), b = Array.from(apart.x);
    expect(tautColumns(apart.x, columns, apart.rows, apart.n, 1, 0.001, 0.03).put).toBe(0); expect(Array.from(apart.x)).toEqual(b);
    // ...and where her skin faces back and DOWN over the fold and back under it, out is between the two
    const lip = strip([0, 0, -0.012, 0, 0], (r) => (r <= 1 ? [0, -0.6, 0.8] : [0, 0, 1]));
    expect(tautColumns(lip.x, columns, lip.rows, lip.n, 1, 0.001, 0.03).put).toBe(columns);
    expect(lip.z(2)).toBeGreaterThan(-0.002); expect(lip.x[(2 * columns + 1) * 3 + 1]).toBeLessThan(-2 * step);
  });
  it('a point over the gap between her legs, and one beside it, are not moved or measured from', () => {
    const s = strip([0, 0, -0.012, 0, 0]), skip = new Uint8Array(s.rows * columns);
    skip[2 * columns + 0] = 1; skip[1 * columns + 2] = 1;
    const t = tautColumns(s.x, columns, s.rows, s.n, 1, 0.001, 0.03, skip);
    expect(t.put).toBe(1); expect(s.z(2, 0)).toBeCloseTo(-0.012, 6); expect(s.z(2, 2)).toBeCloseTo(-0.012, 6); expect(s.z(2, 1)).toBeCloseTo(0, 6);
  });
  it('lies across a crease six rows tall and no more: GAME TUNING', () => {
    expect(SHEET_TAUT.reach).toBe(3); expect(SHEET_TAUT.most).toBeLessThanOrEqual(0.03); expect(SHEET_TAUT.slack).toBeGreaterThan(0);
  });
});

describe('the held points that are over a gap', () => {
  // twelve points a row round a circle, four rows, three of them held whole
  const cols = 12, rows = 4, count = cols * rows, rest = new Float32Array(count * 3);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = (c / cols) * Math.PI * 2, i = (r * cols + c) * 3; rest[i] = Math.sin(a); rest[i + 1] = -r; rest[i + 2] = Math.cos(a); }
  const d = { count, columns: cols, heldRows: 3, hug: rest };
  const offsets = (far: readonly (readonly [number, number])[]): Float32Array => { const o = new Float32Array(count).fill(0.5); for (const [r, c] of far) o[r * cols + c] = 5; return o; };
  it('are each laid between the two held points either side of the gap, as they were cut', () => {
    const s = heldSpans(d, offsets([[1, 3], [1, 4], [1, 5], [2, 10], [2, 11]]), 1);
    expect(s.count).toBe(5);
    for (const c of [3, 4, 5]) { expect(s.a[cols + c]).toBe(cols + 2); expect(s.b[cols + c]).toBe(cols + 6); }
    expect(s.u[cols + 4]).toBeCloseTo(0.5, 6);
    expect(s.u[cols + 3]).toBeGreaterThan(0.05); expect(s.u[cols + 3]).toBeLessThan(0.5); expect(s.u[cols + 5]).toBeCloseTo(1 - s.u[cols + 3], 6);
    // (a gap that runs round past the row's last column to its first)
    for (const c of [10, 11]) { expect(s.a[2 * cols + c]).toBe(2 * cols + 9); expect(s.b[2 * cols + c]).toBe(2 * cols); }
    // (every other point has skin of its own)
    expect(Array.from(s.a).filter((v) => v >= 0).length).toBe(5);
  });
  it('only under where her legs part: a hollow of her trunk is one thing, and a point over it goes with the skin under it', () => {
    // (rows at heights 0, -1, -2, -3: with her legs parting at -1.5, row 1's far points are over a hollow, row 2's over a gap)
    const s = heldSpans(d, offsets([[1, 3], [1, 4], [2, 3], [2, 4]]), 1, -1.5);
    expect(s.count).toBe(2); expect(s.a[cols + 3]).toBe(-1); expect(s.a[2 * cols + 3]).toBe(2 * cols + 2); expect(s.b[2 * cols + 4]).toBe(2 * cols + 5);
  });
  it('never its ring, never a row past those that have a place on her, never a row with no skin at all', () => {
    expect(heldSpans(d, offsets([[0, 3], [3, 3]]), 1).count).toBe(0);
    expect(heldSpans(d, new Float32Array(count).fill(5), 1).count).toBe(0);
    // (at FIT 1 there is no on-her cut: nothing is spanned, as nothing ever was)
    expect(heldSpans({ ...d, heldRows: 1 }, offsets([[1, 3], [2, 3]]), 1).count).toBe(0);
    expect(heldSpans({ ...d, hug: null }, offsets([[1, 3], [2, 3]]), 1).count).toBe(0);
  });
});

describe('on her own skin, under her belly', () => {
  let her: HerBody, frame: LowFrame, limb: Float32Array, input: BodyInput, inside: Float32Array;
  beforeAll(async () => {
    her = await loadHerBody(); limb = limbSkin(her.map);
    frame = lowFrame({ unitsPerMetre: her.unitsPerMetre, facing: her.map.facing, joints: her.map.joints!, skin: { rest: her.rest, limb, index: her.index } });
    input = bodyInputOf(her.mesh, { belly: 1 });
    const P = input.positions, places = new Float32Array(P.length);
    for (let i = 0; i < P.length; i++) places[i] = (P[i] - FACE_REST_OFFSET[i % 3]) / FACE_REST_SCALE;
    inside = hoopInside(frame, lowSpec(COVERAGE_TEMPLATES.find((t) => t.id === SKIRT_UNDER_BAND)!.params, frame), limb, places)!;
  }, 120_000);

  it('a skirt to her calf: its on-her cut comes in with her legs, where its cloth falls straight from her hips', () => {
    const s = { top: 'under', length: 0.54, flare: 0, tucked: false } as const;
    const cloth = draftSkirt(input, s, inside), d = draftSkirt(input, { ...s, fit: 0 }, inside), cols = d.columns, side = cols / 4;
    expect(d.rows).toBe(cloth.rows); expect(d.hemY).toBe(cloth.hemY);
    expect(d.heldRows).toBe(d.rows); expect(cloth.heldRows).toBe(1);
    // its cloth is the cloth, and its on-her cut starts at the same ring
    expect(Array.from(d.rest.subarray(0, 900))).toEqual(Array.from(cloth.rest.subarray(0, 900)));
    const loose = cloth, tight = { ...d, rest: d.hug! };
    for (let i = 0; i < cols * 3; i++) expect(tight.rest[i]).toBe(loose.rest[i]);
    // across her (its side columns) and front to back (its front and back columns), metres, row by row
    const wide = (d: SkirtDraft, r: number) => d.rest[(r * cols + side) * 3] - d.rest[(r * cols + 3 * side) * 3], deep = (d: SkirtDraft, r: number) => d.rest[(r * cols) * 3 + 2] - d.rest[(r * cols + cols / 2) * 3 + 2];
    // the loose one is as wide and as deep as her hips and her seat from there to its hem; the tight one comes in to
    // her knees -- MEASURED on her body file at 0%: 38.0 cm across and 26.6 deep against 29.4 and 13.3
    const rows = Array.from({ length: tight.rows }, (_, r) => r), last = tight.rows - 1;
    expect(wide(loose, last)).toBeGreaterThan(0.37); expect(deep(loose, last)).toBeGreaterThan(0.25);
    expect(Math.min(...rows.map((r) => wide(tight, r)))).toBeLessThan(wide(loose, last) - 0.07);
    expect(deep(tight, last)).toBeLessThan(deep(loose, last) - 0.1);
    // ...and is never a thread: both her legs' outline is a hand and more across and deep at every height
    for (const r of rows) { expect(wide(tight, r), `row ${r}`).toBeGreaterThan(0.25); expect(deep(tight, r), `row ${r}`).toBeGreaterThan(0.1); }
    // from a row to the next no point of it steps more than 3.5 cm across her or front to back: her outline, a row at a time
    for (let r = 1; r < tight.rows; r++) for (let c = 0; c < cols; c++) {
      const p = (r * cols + c) * 3, q = p - cols * 3;
      expect(Math.hypot(tight.rest[p] - tight.rest[q], tight.rest[p + 2] - tight.rest[q + 2]), `row ${r} column ${c}`).toBeLessThan(0.035);
    }
    // MOST OF IT IS ON HER, the rest over a gap: within `SKIRT_FIT.span` of one of her points under her waist
    const P = input.positions, low: number[] = [];
    for (let v = 0; v < P.length; v += 3) if (P[v + 1] < Math.max(...d.ringY) + 0.03 && limb[v / 3] < 0.5) low.push(v);
    let on = 0, read = 0;
    for (let p = cols; p < tight.count; p += 5) {
      const x = tight.rest[p * 3], y = tight.rest[p * 3 + 1], z = tight.rest[p * 3 + 2];
      let best = Infinity;
      for (const v of low) { const dy = P[v + 1] - y; if (dy > 0.03 || dy < -0.03) continue; const q = (P[v] - x) ** 2 + dy * dy + (P[v + 2] - z) ** 2; if (q < best) best = q; }
      read++; if (Math.sqrt(best) < SKIRT_FIT.span + 0.01) on++;
    }
    expect(on / read).toBeGreaterThan(0.6); expect(on / read).toBeLessThan(0.98);
  });

  it('no share of the way from its place on her to the cloth is in her outline: the pencil, the A-line, the mini and the maxi', () => {
    // (her calves stood through the pencil at every FIT between: MEASURED 2026-11-17 on this file, each place laid in
    // its column's direction from its outline's own middle -- half-way, 32 of 2,088 points in her, 11.7 mm at the most)
    const near = [0, 0, 0];
    for (const [length, flare] of [[0.54, 0], [0.36, 0.55], [0.15, 0.75], [1, 0.4]] as const) {
      const d = draftSkirt(input, { top: 'under', length, flare, tucked: false, fit: 0.5 }, inside), cols = d.columns, hug = d.hug!, rest = d.rest;
      expect(d.lineFound).toBe(1);
      // her outline as the draft reads it: her skin under its waistband's line, a slice a centimetre
      const form = dressForm(underLine(input, inside, SKIRT_LINE.inside).covered, Math.max(0.01, d.hemY - 0.02), Math.max(...d.ringY) + 0.02, SKIRT_CUT.formStep), levels = form.hulls.length;
      /** How far inside her outline at height y (x, z) is, metres: 0 unless both slices either side of y hold it. */
      const deep = (x: number, y: number, z: number): number => {
        const f = Math.min(levels - 1, Math.max(0, (y - form.y0) / form.step)), i = Math.min(levels - 1, Math.floor(f)), j = Math.min(levels - 1, i + 1);
        let least = Infinity;
        for (const l of [i, j]) { if (!nearestOn(form.hulls[l], x, z, near) || near[2] < 1) return 0; least = Math.min(least, Math.hypot(x - near[0], z - near[1])); }
        return least;
      };
      for (const f of [0, 0.25, 0.5, 0.75]) {
        let most = 0;
        for (let p = cols; p < d.count; p++) most = Math.max(most, deep(hug[p * 3] + (rest[p * 3] - hug[p * 3]) * f, rest[p * 3 + 1], hug[p * 3 + 2] + (rest[p * 3 + 2] - hug[p * 3 + 2]) * f));
        expect(most, `LENGTH ${length}, FLARE ${flare}, ${f} of the way`).toBeLessThan(0.0005);
      }
    }
  });
});
