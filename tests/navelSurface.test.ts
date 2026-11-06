/**
 * HER NAVEL UNDER A SHIRT, the one measure every cloth shirt uses (navelSurface.ts; Joshua, 2026-11-06): posed from
 * her own vertices round her navel (`follow`, as the cloth tee and the fitted tee use it), outie or innie from her
 * navel's centre, NAVEL DETAIL stretching it and never lowering it, and handed to a shader as its profile.
 *
 * The body: her navel's centre `h` proud of a flat belly (z = 0), an inner ring of radius 1 and an outer of radius 2 on
 * it -- a cone 1 across for an outie, a pit for an innie.
 */
import { describe, expect, it } from 'vitest';
import { NAVEL_SURFACE, NavelSurface, aroundOf, type RestBody } from '../src/sarahlab/garment/navelSurface';
import type { DetailPoints, Poser, Posed } from '../src/sarahlab/detailSpots';

function body(h: number) {
  const rest: number[][] = [[0, 0, h]];
  const ring = (r: number) => Array.from({ length: 16 }, (_, j) => { const a = (2 * Math.PI * j) / 16; rest.push([r * Math.cos(a), r * Math.sin(a), 0]); return rest.length - 1; });
  const rings = [ring(1), ring(2)];
  rest.push([40, 0, 0]); // far off: not hers
  const points: DetailPoints = { navel: 0, navelRings: rings, nipples: [], nippleRings: [] };
  const restBody: RestBody = { count: rest.length, at: (v, o) => { o[0] = rest[v][0]; o[1] = rest[v][1]; o[2] = rest[v][2]; } };
  const poser: Poser = { posedVertex: (v, out, o = 0) => { out[o] = rest[v][0]; out[o + 1] = rest[v][1]; out[o + 2] = rest[v][2]; } };
  // her navel as posed: flat belly through the origin, facing +z, its centre where it is
  const posed: Posed = { c: [0, 0, h], n: [0, 0, 1], base: [0, 0, 0], rho: 1, curve: 0, reach2: 4, h };
  return { points, restBody, poser, posed, far: rest.length - 1 };
}

describe('NavelSurface', () => {
  it('finds her navel\'s own vertices within its outer ring at rest, and nothing past it', () => {
    const b = body(0.3), around = Array.from(aroundOf(b.restBody, 0, b.points.navelRings[1]));
    expect(around).not.toContain(0);
    expect(around).not.toContain(b.far);
    for (const v of b.points.navelRings[0]) expect(around).toContain(v);
    expect(new NavelSurface(b.points).around).toBeNull();
    expect(new NavelSurface(b.points, b.restBody).around).not.toBeNull();
  });

  it('follow: an outie measured from her own vertices -- its crown, its axis, its height, NAVEL DETAIL\'s stretch', () => {
    const b = body(0.3), s = new NavelSurface(b.points, b.restBody);
    s.follow(b.poser, b.posed, 1);
    expect(s.surfaceOn).toBe(true);
    expect(s.crown).toEqual([0, 0, 0.3]);
    expect(s.axis).toEqual([0, 0, 1]);
    expect(s.raise(0, 0, 0)).toBeCloseTo(0.3 + NAVEL_SURFACE.over, 6);
    expect(s.raise(0.5, 0, 0)).toBeCloseTo(0.15 + NAVEL_SURFACE.over / 2, 6);
    const full = s.reach;
    s.follow(b.poser, b.posed, 0);
    expect(s.raise(0, 0, 0)).toBeCloseTo(0.3 + NAVEL_SURFACE.over, 6);
    expect(s.raise(1, 0, 0)).toBeCloseTo(0.15 + NAVEL_SURFACE.over / 2, 6);
    expect(s.reach).toBeCloseTo(NAVEL_SURFACE.widest * full, 6);
  });

  it('follow: an innie, or a navel standing less than NAVEL_SURFACE.outie out, draws nothing at any NAVEL DETAIL', () => {
    for (const h of [-0.4, 0, NAVEL_SURFACE.outie * 0.8]) {
      const b = body(h), s = new NavelSurface(b.points, b.restBody);
      for (const keep of [0, 0.5, 1]) {
        s.follow(b.poser, b.posed, keep);
        expect(s.surfaceOn).toBe(true);
        for (const r of [0, 0.3, 0.9, 1.5]) expect(s.raise(r, 0, 0)).toBe(0);
        expect(s.profileFor()!.values.every((v) => v === 0)).toBe(true);
      }
    }
  });

  it('profileFor: her profile as a shader takes it, its step stretched by NAVEL DETAIL; null with nothing measured', () => {
    const b = body(0.3), s = new NavelSurface(b.points, b.restBody);
    expect(s.profileFor()).toBeNull();
    s.follow(b.poser, b.posed, 0);
    const p = s.profileFor()!;
    expect(p.step).toBeCloseTo(NAVEL_SURFACE.bin * NAVEL_SURFACE.widest, 9);
    expect(p.values[0]).toBeCloseTo(0.3, 6);
    expect(p.top).toBeCloseTo(0.3, 6);
    expect(p.crown).toEqual([0, 0, 0.3]);
    expect(p.over).toBe(NAVEL_SURFACE.over);
    // without a rest body: nothing to pose, nothing measured
    const none = new NavelSurface(b.points);
    none.follow(b.poser, b.posed, 1);
    expect(none.surfaceOn).toBe(false);
    expect(none.profileFor()).toBeNull();
  });
});
