/**
 * HER FACE'S SHAPES LAID ON A MESH (`faceShapeFields.ts`): a slider's field on a mesh's own points is the field in space
 * read at each of them, in her body file's units; its normals turn as the surface it moves does; nothing outside the
 * face's box is named; and a look's weights name only the sliders the shapes have.
 */
import { describe, expect, it } from 'vitest';
import { FACE_REST_OFFSET, FACE_REST_SCALE } from '../src/sarahlab/faceRig';
import { FACE_SHAPE_BOX, FACE_SLIDERS, FACE_TYPES, faceShapeField } from '../src/sarahlab/faceShapes';
import { FACE_FIELD_PREFIX, faceFieldOn, faceFieldWeights, faceSlidersMoved, headPoints } from '../src/sarahlab/faceShapeFields';

const S = FACE_REST_SCALE, O = FACE_REST_OFFSET;
/** A place in her rest metres as a point of a mesh (her body file's units). */
const unit = (m: readonly number[]): number[] => m.map((x, k) => (x - O[k]) / S);
/** A repeatable spread of numbers in 0..1. */
function spread(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
/** Points all over the face's box (a little inside it), each with a unit normal. */
function cloud(n: number, seed = 7): { pos: Float32Array; nrm: Float32Array; metres: number[][] } {
  const r = spread(seed), B = FACE_SHAPE_BOX, pos: number[] = [], nrm: number[] = [], metres: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const m = [B.xFrom + (B.xTo - B.xFrom) * r(), B.yFrom + (B.yTo - B.yFrom) * r(), B.zFrom + (B.zTo - B.zFrom) * r()];
    const v = [r() - 0.5, r() - 0.5, r() - 0.5], l = Math.hypot(v[0], v[1], v[2]) || 1;
    metres.push(m); pos.push(...unit(m)); nrm.push(v[0] / l, v[1] / l, v[2] / l);
  }
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), metres };
}
const cross = (a: number[], b: number[]): number[] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: number[]): number[] => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

describe('a face slider laid on a mesh', () => {
  const C = cloud(4000);

  it('moves each point as the field in space says, in the mesh\'s own units', () => {
    for (const { id } of FACE_SLIDERS) {
      const f = faceFieldOn(id, C.pos, C.nrm), field = faceShapeField(id);
      expect(f.index.length, id).toBeGreaterThan(0);
      let worst = 0;
      for (let k = 0; k < f.index.length; k += 1) {
        // (the mesh's points are 32-bit: the field is read where the mesh says the point is)
        const v = f.index[k], at = [C.pos[v * 3] * S + O[0], C.pos[v * 3 + 1] * S + O[1], C.pos[v * 3 + 2] * S + O[2]] as const, d = field(at);
        for (let c = 0; c < 3; c += 1) worst = Math.max(worst, Math.abs(f.pos[k * 3 + c] * S - d[c]));
      }
      expect(worst, id).toBeLessThan(1e-7);
      // and every point the field moves is named
      const named = new Set(f.index);
      for (let v = 0; v < C.metres.length; v += 1) {
        const at = [C.pos[v * 3] * S + O[0], C.pos[v * 3 + 1] * S + O[1], C.pos[v * 3 + 2] * S + O[2]] as const, d = field(at);
        if (Math.hypot(d[0], d[1], d[2]) > 1e-9) expect(named.has(v), `${id} point ${v}`).toBe(true);
      }
    }
  });

  it('turns each normal as the surface it moves turns', () => {
    // a small triangle square to each point's normal, carried by the field at a quarter of its weight: its own normal
    // after the move against the rest normal with a quarter of the field's change, made unit (as the room lays it)
    const W = 0.25, EDGE = 0.0002;
    let worstAll = 0;
    for (const { id } of FACE_SLIDERS) {
      const f = faceFieldOn(id, C.pos, C.nrm), field = faceShapeField(id);
      let worst = 0;
      for (let k = 0; k < f.index.length; k += 1) {
        const v = f.index[k], n = [C.nrm[v * 3], C.nrm[v * 3 + 1], C.nrm[v * 3 + 2]];
        const p = [C.pos[v * 3] * S + O[0], C.pos[v * 3 + 1] * S + O[1], C.pos[v * 3 + 2] * S + O[2]];
        const t1 = norm(cross(n, Math.abs(n[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0])), t2 = cross(n, t1);
        const corner = (a: number, b: number): number[] => {
          const q = [p[0] + EDGE * (a * t1[0] + b * t2[0]), p[1] + EDGE * (a * t1[1] + b * t2[1]), p[2] + EDGE * (a * t1[2] + b * t2[2])] as const, d = field(q);
          return [q[0] + W * d[0], q[1] + W * d[1], q[2] + W * d[2]];
        };
        const A = corner(1, 0), B = corner(-0.5, 0.866), D = corner(-0.5, -0.866);
        const moved = norm(cross([B[0] - A[0], B[1] - A[1], B[2] - A[2]], [D[0] - A[0], D[1] - A[1], D[2] - A[2]]));
        const laid = norm([n[0] + W * f.nrm![k * 3], n[1] + W * f.nrm![k * 3 + 1], n[2] + W * f.nrm![k * 3 + 2]]);
        const dot = Math.min(1, moved[0] * laid[0] + moved[1] * laid[1] + moved[2] * laid[2]);
        worst = Math.max(worst, Math.acos(dot) * 180 / Math.PI);
      }
      expect(worst, id).toBeLessThan(0.5);
      worstAll = Math.max(worstAll, worst);
    }
    expect(worstAll).toBeGreaterThan(0); // (it is a first-order turn: not exact, and not nothing)
  });

  it('names nothing outside the face\'s box, and nothing at all for a slider the shapes do not have', () => {
    const B = FACE_SHAPE_BOX, outside = [[0, B.yFrom - 0.05, 0], [B.xTo + 0.02, 1.55, 0], [0, 1.2, 0.05], [0, B.yTo + 0.01, -0.05]];
    const pos = Float32Array.from([...outside.flatMap(unit), ...unit([0.02, 1.55, 0.0])]);
    const head = headPoints(pos);
    expect([...head.index]).toEqual([outside.length]);
    for (const { id } of FACE_SLIDERS) for (const v of faceFieldOn(id, pos, null).index) expect(v).toBe(outside.length);
    expect(faceFieldOn('noSuchSlider', C.pos, C.nrm).index.length).toBe(0);
    expect(faceFieldOn('faceWidth', C.pos, null).nrm).toBeNull();
  });

  it('a look\'s weights name the sliders it moves, by field name', () => {
    expect(faceFieldWeights({})).toEqual({});
    expect(faceFieldWeights({ faceWidth: 0.4, jawWidth: 0, noSuchSlider: 1, noseLength: -1 })).toEqual({ [`${FACE_FIELD_PREFIX}faceWidth`]: 0.4, [`${FACE_FIELD_PREFIX}noseLength`]: -1 });
    expect(faceSlidersMoved({ faceWidth: 0.4, jawWidth: 0, noSuchSlider: 1 })).toEqual(['faceWidth']);
    for (const t of FACE_TYPES) expect(Object.keys(faceFieldWeights(t.look)).length, t.id).toBe(Object.keys(t.look).length);
  });
});
