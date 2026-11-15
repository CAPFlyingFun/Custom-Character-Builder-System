/**
 * HER FACE'S SHAPES, PICTURED WITHOUT A BROWSER (`raster.mjs`): her head with a look of `faceShapes.ts` laid on it -- her
 * skin's points moved by `faceShapeMove` of their rest places, her face's layer (eyes, brows, lips) painted roughly AT
 * THEIR REST PLACES by `faceRig.ts`'s CPU mirrors, so the eyes, brows and lips are seen to ride her skin as the room's
 * shader has them. A sketch to sculpt the sliders by: her file's own shape, one light, no hair.
 *
 *   npx tsx scripts/preview/faceShapes.mts [--out preview-out] [--size 200]
 * writes `face-sliders-1..3.png` (each slider: -1, 0, +1 from her front, the same from her side, then where it moves her, red at 5 mm),
 * `face-types.png` (her own, then each face type, front / three-quarter / side) and `face-lena.png` (ROUND, the first
 * character's try, beside her own).
 */
import { beside, draw, savePng, stacked, type DrawnMesh, type Picture } from './raster.mjs';
import { loadBody, skinMesh, within, type PreviewBody } from './body.mjs';
import { FACE_SLIDERS, FACE_TYPES, faceShapeMove } from '../../src/sarahlab/faceShapes';
import { faceBrowAlpha, faceEyeRegion, faceLipAlpha, type FaceRigState } from '../../src/sarahlab/faceRig';
import type { FaceShapeLook } from '../../src/sarahlab/headLook';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const OUT = option('out', 'preview-out'), SIZE = Number(option('size', '200'));

const STATE: FaceRigState = { jaw: 0, gazeRight: [0, 0, 1], gazeLeft: [0, 0, 1], blink: 0 };
const EYE_RGB: Record<string, readonly [number, number, number] | null> = {
  none: null, lid: null, sclera: [0.92, 0.88, 0.85], iris: [0.4, 0.43, 0.24], pupil: [0.04, 0.03, 0.03], caruncle: [0.78, 0.54, 0.52],
};

/** Her head's skin with a look laid on it: moved points, normals worked again (welded across her texture's seams). */
export function lookedMesh(body: PreviewBody, look: FaceShapeLook, index = within(body, { yFrom: 1.35 })) {
  const R = body.rest, n = R.length / 3, pos = new Float32Array(R), d: [number, number, number] = [0, 0, 0];
  for (let v = 0; v < n; v++) {
    if (R[v * 3 + 1] < 1.38) continue;
    faceShapeMove([R[v * 3], R[v * 3 + 1], R[v * 3 + 2]], look, d);
    pos[v * 3] += d[0]; pos[v * 3 + 1] += d[1]; pos[v * 3 + 2] += d[2];
  }
  const weld = new Map<string, number>(), id = new Int32Array(n);
  for (let v = 0; v < n; v++) { const k = `${R[v * 3].toFixed(5)},${R[v * 3 + 1].toFixed(5)},${R[v * 3 + 2].toFixed(5)}`; let w = weld.get(k); if (w === undefined) { w = v; weld.set(k, v); } id[v] = w; }
  const acc = new Float32Array(n * 3), nrm = new Float32Array(body.normal);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const wx = pos[c * 3] - pos[a * 3], wy = pos[c * 3 + 1] - pos[a * 3 + 1], wz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    for (const q of [a, b, c]) { const w = id[q]; acc[w * 3] += nx; acc[w * 3 + 1] += ny; acc[w * 3 + 2] += nz; }
  }
  for (let t = 0; t < index.length; t++) {
    const v = index[t], w = id[v], l = Math.hypot(acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]);
    if (l > 0) for (let c = 0; c < 3; c++) nrm[v * 3 + c] = acc[w * 3 + c] / l;
  }
  const skin = skinMesh(body, {
    index,
    paint: (f) => {
      const r = f.at(body.rest, 3) as number[], p: [number, number, number] = [r[0], r[1], r[2]];
      const eye = EYE_RGB[faceEyeRegion(p, STATE)];
      if (eye) return [eye[0] * f.light, eye[1] * f.light, eye[2] * f.light];
      const brow = faceBrowAlpha(p), lip = faceLipAlpha(p) * 0.55;
      if (brow <= 0 && lip <= 0) return null;
      const base = body.skin ? body.skin.texel(...(f.at(body.uv, 2) as [number, number])) : [0.86, 0.68, 0.6];
      let c = [base[0], base[1], base[2]];
      c = c.map((x, i) => x + ([0.66, 0.36, 0.36][i] - x) * lip);
      c = c.map((x, i) => x + ([0.24, 0.12, 0.07][i] - x) * brow);
      return [c[0] * f.light, c[1] * f.light, c[2] * f.light];
    },
  });
  return { ...skin, pos, nrm };
}

/** Her rest skin coloured by how far one slider at +1 moves each place: grey nothing, to red at 5 mm and more. */
export function heatMesh(body: PreviewBody, id: string, index = within(body, { yFrom: 1.35 })) {
  return skinMesh(body, {
    index,
    paint: (f) => {
      const r = f.at(body.rest, 3) as number[], d = faceShapeMove([r[0], r[1], r[2]], { [id]: 1 }), m = Math.min(1, Math.hypot(d[0], d[1], d[2]) / 0.005);
      return [(0.6 + 0.4 * m) * f.light, 0.6 * (1 - m) * f.light, 0.6 * (1 - m) * f.light];
    },
  });
}

const view = (mesh: DrawnMesh, yaw: number, size = SIZE): Picture =>
  draw({ width: size, height: Math.round(size * 1.15), yaw, pitch: 3, centre: [0, 1.56, -0.035], span: 0.2, meshes: [mesh] });

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = await loadBody(), t0 = Date.now(), own = lookedMesh(body, {});
  const ownFront = view(own, 0), own3 = view(own, 35), ownSide = view(own, 90);
  for (let sheet = 0; sheet < 3; sheet++) {
    const rows = FACE_SLIDERS.slice(sheet * 7, sheet * 7 + 7).map((s) => {
      const lo = lookedMesh(body, { [s.id]: -1 }), hi = lookedMesh(body, { [s.id]: 1 });
      return beside([view(lo, 0), ownFront, view(hi, 0), view(lo, 90), ownSide, view(hi, 90), view(heatMesh(body, s.id), 0), view(heatMesh(body, s.id), 90)]);
    });
    console.log(await savePng(`${OUT}/face-sliders-${sheet + 1}.png`, stacked(rows)), FACE_SLIDERS.slice(sheet * 7, sheet * 7 + 7).map((s) => s.id).join(' '));
  }
  const typeRows = [beside([ownFront, own3, ownSide]), ...FACE_TYPES.map((t) => { const m = lookedMesh(body, t.look); return beside([view(m, 0), view(m, 35), view(m, 90)]); })];
  console.log(await savePng(`${OUT}/face-types.png`, stacked([beside(typeRows.slice(0, 4)), beside(typeRows.slice(4))])), 'own', FACE_TYPES.map((t) => t.id).join(' '));
  const lena = lookedMesh(body, FACE_TYPES.find((t) => t.id === 'round')!.look);
  console.log(await savePng(`${OUT}/face-lena.png`, stacked([beside([view(own, 0, 320), view(own, 35, 320), view(own, 90, 320)]), beside([view(lena, 0, 320), view(lena, 35, 320), view(lena, 90, 320)])])));
  console.log(`${Date.now() - t0} ms`);
}
