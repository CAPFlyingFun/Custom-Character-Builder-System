/**
 * HER FACE'S SHAPES LAID ON A MESH (Joshua, 2026-11-14: "different face types"; `faceShapes.ts` holds each slider as a
 * field in space, a place in her rest metres in and its move out).
 *
 * The room shapes her on the CPU: a mesh's rest shape is its file's plus Σ weight × field, each field kept sparse
 * (`view/bodyShapeView.ts`). This makes one slider's field, at +1, for a mesh's own points -- her skin's, and her hair's,
 * which lies on it: the same numbers move both, so her hairline stays on her forehead and her fringe on her brow. A
 * field made here is named `face:<slider>` and weighed by the look's own number (`faceFieldWeights`).
 *
 * ITS NORMALS. A field moves points, and a point's normal turns with what the field does round it: for the move D, the
 * surface's normal goes with the inverse transpose of I + ∇D. To the first order in D that is n - (∇D)ᵀ·n, made unit
 * again -- and `applyShapeFields` makes a touched normal unit after the fields are summed -- so what is kept is
 * -(∇D)ᵀ·n at +1, ∇D read off the field itself by central differences `STEP` apart (a field's smallest bump is 16 mm
 * across: half a millimetre is well inside it). Without it a wider jaw was lit as the narrow one.
 *
 * A mesh's points are in HER BODY FILE'S UNITS (`FACE_REST_SCALE` metres a unit, `FACE_REST_OFFSET`: her hair's files
 * are written in them, `scripts/hair/glb.mjs`), so a field's move is divided by that scale; its turn of a normal is a
 * ratio and is the same in either.
 *
 * Pure: no three.js, no DOM.
 */
import { FACE_REST_OFFSET, FACE_REST_SCALE } from './faceRig';
import { FACE_SHAPE_BOX, FACE_SLIDERS, faceShapeField } from './faceShapes';
import type { FaceShapeLook } from './headLook';

/** A face slider's field's name among a mesh's shape fields: `face:<slider id>`. */
export const FACE_FIELD_PREFIX = 'face:';
/** A sparse field as `view/bodyShapeView.ts` keeps one: the points it moves, each one's move and its normal's change. */
export interface FaceMeshField { readonly index: Uint32Array; readonly pos: Float32Array; readonly nrm: Float32Array | null }

/** How far apart the field is read for its gradient, metres (MEASURED against the fields' sizes: the smallest bump's half-size is 8 mm). */
const STEP = 0.00025;
const KNOWN: ReadonlySet<string> = new Set(FACE_SLIDERS.map((s) => s.id));

/** The sliders of a look that move anything: the ones `FACE_SLIDERS` has, at other than 0. */
export function faceSlidersMoved(look: FaceShapeLook): string[] {
  return Object.keys(look).filter((id) => KNOWN.has(id) && Number.isFinite(look[id]) && look[id] !== 0);
}
/** A look's weights by field name, for `applyShapeFields` (a slider the shapes do not have is left out). */
export function faceFieldWeights(look: FaceShapeLook): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of faceSlidersMoved(look)) out[`${FACE_FIELD_PREFIX}${id}`] = look[id];
  return out;
}

/** A mesh's points that a face field can move at all -- inside `FACE_SHAPE_BOX` -- and where each is, in her rest metres. */
export interface HeadPoints { readonly index: Uint32Array; readonly metres: Float64Array }
export function headPoints(basePos: ArrayLike<number>): HeadPoints {
  const B = FACE_SHAPE_BOX, S = FACE_REST_SCALE, O = FACE_REST_OFFSET, index: number[] = [], metres: number[] = [];
  for (let v = 0; v * 3 + 2 < basePos.length; v += 1) {
    const x = basePos[v * 3] * S + O[0], y = basePos[v * 3 + 1] * S + O[1], z = basePos[v * 3 + 2] * S + O[2];
    if (x > B.xFrom && x < B.xTo && y > B.yFrom && y < B.yTo && z > B.zFrom && z < B.zTo) { index.push(v); metres.push(x, y, z); }
  }
  return { index: Uint32Array.from(index), metres: Float64Array.from(metres) };
}

/**
 * One slider's field at +1 on a mesh: `basePos` its rest points and `baseNrm` their normals (three numbers a point, her
 * body file's units; no normals, no normal changes). `points` is `headPoints(basePos)`, handed in when it is already
 * known. A slider the shapes do not have is a field that moves nothing.
 */
export function faceFieldOn(id: string, basePos: ArrayLike<number>, baseNrm: ArrayLike<number> | null, points: HeadPoints = headPoints(basePos)): FaceMeshField {
  const field = faceShapeField(id), S = FACE_REST_SCALE;
  const index: number[] = [], pos: number[] = [], nrm: number[] = [];
  const d: [number, number, number] = [0, 0, 0], a: [number, number, number] = [0, 0, 0], b: [number, number, number] = [0, 0, 0], p: [number, number, number] = [0, 0, 0];
  // ∇D's three columns: how the move changes along x, along y, along z
  const col = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < points.index.length; k += 1) {
    const v = points.index[k], x = points.metres[k * 3], y = points.metres[k * 3 + 1], z = points.metres[k * 3 + 2];
    p[0] = x; p[1] = y; p[2] = z;
    field(p, d);
    let turned = false;
    if (baseNrm) {
      for (let axis = 0; axis < 3; axis += 1) {
        p[0] = x; p[1] = y; p[2] = z; p[axis] += STEP; field(p, a);
        p[0] = x; p[1] = y; p[2] = z; p[axis] -= STEP; field(p, b);
        for (let c = 0; c < 3; c += 1) { col[axis][c] = (a[c] - b[c]) / (2 * STEP); if (col[axis][c] !== 0) turned = true; }
      }
    }
    if (d[0] === 0 && d[1] === 0 && d[2] === 0 && !turned) continue;
    index.push(v);
    pos.push(d[0] / S, d[1] / S, d[2] / S);
    if (baseNrm) {
      const nx = baseNrm[v * 3], ny = baseNrm[v * 3 + 1], nz = baseNrm[v * 3 + 2];
      // -(∇D)ᵀ·n: its b-th number is -(the move's change along b) · n
      nrm.push(-(col[0][0] * nx + col[0][1] * ny + col[0][2] * nz), -(col[1][0] * nx + col[1][1] * ny + col[1][2] * nz), -(col[2][0] * nx + col[2][1] * ny + col[2][2] * nz));
    }
  }
  return { index: Uint32Array.from(index), pos: Float32Array.from(pos), nrm: baseNrm ? Float32Array.from(nrm) : null };
}
