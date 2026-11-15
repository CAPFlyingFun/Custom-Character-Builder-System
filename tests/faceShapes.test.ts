/**
 * Her face's shapes (`faceShapes.ts`) on her real skin (`scripts/preview/body.mjs`): linear and additive, mirrored, nothing
 * outside its box or below her neck's line, each slider's biggest move within the bound its comment states, and no
 * triangle of her head turned inside out or squashed flat, at each slider's ±1, each face type and every slider at ±1
 * together -- MEASURED 2026-11-14 (the worst: every slider at -1, a triangle's normal turned 48 degrees, 0.21 of its area).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadBody, within, type PreviewBody } from '../scripts/preview/body.mjs';
import { FACE_SHAPE_BOX, FACE_SLIDERS, FACE_TYPES, NECK, faceShapeField, faceShapeMove } from '../src/sarahlab/faceShapes';
import { FACE_EYES, FACE_MOUTH } from '../src/sarahlab/faceRig';
import type { FaceShapeLook } from '../src/sarahlab/headLook';

/** Each slider's biggest move at ±1, millimetres, as its comment states (MEASURED, rounded up to the tenth). */
const BOUND_MM: Record<string, number> = {
  faceWidth: 4.2, faceLength: 8.6, forehead: 6.9, jawWidth: 9.4, jawCorner: 4.5, chinLength: 7.6, chinWidth: 4.8, chinForward: 7.5,
  cheekFullness: 7.9, cheekbones: 5.3, noseWidth: 3.7, noseLength: 4.3, noseBridge: 3.7, noseTip: 3.8, lipFullness: 2.3, mouthWidth: 4.5,
  eyeSize: 1.6, eyeSpacing: 3.8, eyeTilt: 1.4, browHeight: 4.0, earSize: 3.2,
};
/** No triangle's normal turns further than this (cosine), nor keeps less than this share of its area: none folds. */
const MIN_COS = 0.5, MIN_AREA = 0.15;

let body: PreviewBody, head: number[], tris: Uint32Array;
const P = (v: number): [number, number, number] => [body.rest[v * 3], body.rest[v * 3 + 1], body.rest[v * 3 + 2]];
beforeAll(async () => {
  body = await loadBody({ picture: false });
  head = [];
  for (let v = 0; v < body.rest.length / 3; v++) if (body.rest[v * 3 + 1] > 1.38) head.push(v);
  tris = within(body, { yFrom: 1.4 });
}, 60_000);

function moved(look: FaceShapeLook): Float64Array {
  const out = new Float64Array(body.rest);
  for (const v of head) { const d = faceShapeMove(P(v), look); out[v * 3] += d[0]; out[v * 3 + 1] += d[1]; out[v * 3 + 2] += d[2]; }
  return out;
}
function worst(look: FaceShapeLook): { cos: number; area: number } {
  const Q = moved(look), R = body.rest;
  let cos = 1, area = Infinity;
  const cross = (X: ArrayLike<number>, a: number, b: number, c: number) => {
    const ux = X[b * 3] - X[a * 3], uy = X[b * 3 + 1] - X[a * 3 + 1], uz = X[b * 3 + 2] - X[a * 3 + 2];
    const wx = X[c * 3] - X[a * 3], wy = X[c * 3 + 1] - X[a * 3 + 1], wz = X[c * 3 + 2] - X[a * 3 + 2];
    return [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
  };
  for (let t = 0; t < tris.length; t += 3) {
    const r = cross(R, tris[t], tris[t + 1], tris[t + 2]), m = cross(Q, tris[t], tris[t + 1], tris[t + 2]);
    const lr = Math.hypot(r[0], r[1], r[2]), lm = Math.hypot(m[0], m[1], m[2]);
    if (lr < 1e-12) continue;
    cos = Math.min(cos, (r[0] * m[0] + r[1] * m[1] + r[2] * m[2]) / (lr * lm || 1));
    area = Math.min(area, lm / lr);
  }
  return { cos, area };
}

describe('her face shapes', () => {
  it('names its sliders well, and its face types use only them', () => {
    const ids = FACE_SLIDERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) { expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9]{0,31}$/); expect(BOUND_MM[id]).toBeDefined(); }
    expect(FACE_SLIDERS.length).toBeGreaterThanOrEqual(16);
    expect(FACE_TYPES.length).toBeGreaterThanOrEqual(6);
    for (const t of FACE_TYPES) for (const [k, x] of Object.entries(t.look)) { expect(ids).toContain(k); expect(Math.abs(x)).toBeLessThanOrEqual(1); }
    for (const s of FACE_SLIDERS) expect(s.name).not.toMatch(/sarah/i);
  });

  it('is linear in each slider and additive across them', () => {
    const look: Record<string, number> = {};
    FACE_SLIDERS.forEach((s, i) => { look[s.id] = ((i * 37) % 19) / 9.5 - 1; });
    for (let i = 0; i < head.length; i += 97) {
      const p = P(head[i]), sum = [0, 0, 0];
      for (const s of FACE_SLIDERS) {
        const f = faceShapeField(s.id)(p), half = faceShapeMove(p, { [s.id]: 0.5 }), neg = faceShapeMove(p, { [s.id]: -1 });
        for (let c = 0; c < 3; c++) { expect(half[c]).toBeCloseTo(0.5 * f[c], 12); expect(neg[c]).toBeCloseTo(-f[c], 12); sum[c] += look[s.id] * f[c]; }
      }
      const all = faceShapeMove(p, look);
      for (let c = 0; c < 3; c++) expect(all[c]).toBeCloseTo(sum[c], 12);
    }
  });

  it('is mirrored: at her mirrored places, the mirrored move', () => {
    for (const s of FACE_SLIDERS) {
      const f = faceShapeField(s.id);
      for (let i = 0; i < head.length; i += 53) {
        const p = P(head[i]), a = f(p), b = f([-p[0], p[1], p[2]]);
        expect(b[0]).toBeCloseTo(-a[0], 12); expect(b[1]).toBeCloseTo(a[1], 12); expect(b[2]).toBeCloseTo(a[2], 12);
      }
    }
  });

  it('moves nothing outside its box or below her neck line, and each slider within its bound', () => {
    const B = FACE_SHAPE_BOX;
    for (const s of FACE_SLIDERS) {
      const f = faceShapeField(s.id);
      let most = 0;
      for (let v = 0; v < body.rest.length / 3; v++) {
        const p = P(v), d = f(p), m = Math.hypot(d[0], d[1], d[2]);
        const outside = p[0] <= B.xFrom || p[0] >= B.xTo || p[1] <= B.yFrom || p[1] >= B.yTo || p[2] <= B.zFrom || p[2] >= B.zTo;
        if (outside || p[1] <= NECK.from) expect(m).toBe(0);
        most = Math.max(most, m);
      }
      expect(most * 1000, s.id).toBeLessThanOrEqual(BOUND_MM[s.id] + 0.05);
      expect(most * 1000, s.id).toBeGreaterThan(1); // a slider that moves her
      // and just inside each face of its box (a lattice): nothing, so the room's box test cuts no move short
      for (const x of [B.xFrom + 1e-4, B.xTo - 1e-4]) for (let y = B.yFrom; y < B.yTo; y += 0.01) for (let z = B.zFrom; z < B.zTo; z += 0.01) expect(Math.hypot(...f([x, y, z]))).toBe(0);
      for (const y of [B.yTo - 1e-4]) for (let x = B.xFrom; x < B.xTo; x += 0.01) for (let z = B.zFrom; z < B.zTo; z += 0.01) expect(Math.hypot(...f([x, y, z]))).toBe(0);
      for (const z of [B.zFrom + 1e-4, B.zTo - 1e-4]) for (let x = B.xFrom; x < B.xTo; x += 0.01) for (let y = B.yFrom; y < B.yTo; y += 0.01) expect(Math.hypot(...f([x, y, z]))).toBe(0);
    }
  }, 120_000);

  it('folds no triangle of her head at any slider\'s ±1, any face type, or every slider at ±1 together', () => {
    const looks: [string, FaceShapeLook][] = [];
    for (const s of FACE_SLIDERS) looks.push([`${s.id}+1`, { [s.id]: 1 }], [`${s.id}-1`, { [s.id]: -1 }]);
    for (const t of FACE_TYPES) looks.push([t.id, t.look]);
    looks.push(['all+1', Object.fromEntries(FACE_SLIDERS.map((s) => [s.id, 1]))], ['all-1', Object.fromEntries(FACE_SLIDERS.map((s) => [s.id, -1]))]);
    for (const [name, look] of looks) {
      const w = worst(look);
      expect(w.cos, name).toBeGreaterThan(MIN_COS);
      expect(w.area, name).toBeGreaterThan(MIN_AREA);
    }
  }, 120_000);

  it('never lets her lips or her lids pass through each other', () => {
    // MEASURED as order kept: every pair of her skin's points in front of her mouth (or an eye) within 1 mm of one
    // another across her and 0.3 to 8 mm apart in height at rest keeps which is above, at each slider's ±1, each face
    // type and every slider at ±1 -- a lip or a lid that crossed the other would swap such a pair.
    const pairs: [number, number][] = [];
    const near = (v: number) => {
      const [x, y, z] = P(v);
      const mouth = Math.abs(x) < FACE_MOUTH.cornerX + 0.004 && Math.abs(y - FACE_MOUTH.seamY) < 0.012 && z > -0.012;
      const eye = Math.abs(Math.abs(x) - 0.031) < 0.017 && Math.abs(y - FACE_EYES.left.centre[1]) < 0.01 && z > -0.012;
      return mouth || eye;
    };
    const pts = head.filter(near);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = P(pts[i]), b = P(pts[j]), dy = b[1] - a[1];
      if (Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[2] - b[2]) < 0.004 && Math.abs(dy) > 0.0003 && Math.abs(dy) < 0.008) pairs.push(dy > 0 ? [pts[i], pts[j]] : [pts[j], pts[i]]);
    }
    expect(pairs.length).toBeGreaterThan(100);
    const looks: FaceShapeLook[] = [...FACE_SLIDERS.flatMap((s) => [{ [s.id]: 1 }, { [s.id]: -1 }]), ...FACE_TYPES.map((t) => t.look),
      Object.fromEntries(FACE_SLIDERS.map((s) => [s.id, 1])), Object.fromEntries(FACE_SLIDERS.map((s) => [s.id, -1]))];
    for (const look of looks) {
      for (const [lo, hi] of pairs) {
        const a = P(lo), b = P(hi), da = faceShapeMove(a, look), db = faceShapeMove(b, look);
        expect(b[1] + db[1] - (a[1] + da[1])).toBeGreaterThan(0);
      }
    }
  }, 120_000);
});
