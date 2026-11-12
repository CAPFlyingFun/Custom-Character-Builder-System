import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { BRIEF_CLOTH, bakeBriefCloth, clothNormals, layBrief, type BriefClothBake } from '../src/sarahlab/briefCloth';
import { briefClothTriangles } from '../src/sarahlab/briefClothProxy';
import { bikiniBottomField } from '../src/sarahlab/bikiniBottomStencil';

// HER MESHY BIKINI BOTTOM AS CLOTH (Joshua, 2026-11-11: "MESHY model bottom with stretchy as a cloth sim, but not alter
// the shape or design of it…"; "a 3mm clearance from body mesh to bottom"), baked on her body file in metres
let bake: BriefClothBake;
beforeAll(async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read('assets-archive/models/sarah-v2-body.glb');
  const skin = doc.getRoot().listSkins()[0], J = skin.listJoints()[0].getWorldMatrix(), B = Array.from(skin.getInverseBindMatrices()!.getArray()!.slice(0, 16));
  const T = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) T[c * 4 + r] += J[k * 4 + r] * B[c * 4 + k];
  const read = (prim: ReturnType<typeof prims.at>, name: string, w: number) => {
    const A = prim!.getAttribute(name)!, n = A.getCount(), v: number[] = [], out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { A.getElement(i, v); for (let r = 0; r < 3; r++) out[i * 3 + r] = T[r] * v[0] + T[4 + r] * v[1] + T[8 + r] * v[2] + w * T[12 + r]; }
    return out;
  };
  const prims = doc.getRoot().listMeshes()[0].listPrimitives(), body = prims[0], brief = prims[1];
  bake = bakeBriefCloth({
    brief: { positions: read(brief, 'POSITION', 1), index: Uint32Array.from(brief.getIndices()!.getArray()!), normals: read(brief, 'NORMAL', 0) },
    cloth: briefClothTriangles(brief.getAttribute('POSITION')!.getCount())!,
    skin: { positions: read(body, 'POSITION', 1), index: Uint32Array.from(body.getIndices()!.getArray()!), normals: read(body, 'NORMAL', 0) },
    unitsPerMetre: 1, field: bikiniBottomField(body.getAttribute('POSITION')!.getCount()),
  });
}, 60000);

describe('her Meshy bikini bottom as cloth', () => {
  it('is the whole modelled brief, moved by a cloth of about a thousand of its own points', () => {
    expect(bake.vertices).toBe(9973);
    expect(bake.index.length / 3).toBe(20000);
    expect(bake.particles).toBeGreaterThan(900);
    expect(bake.particles).toBeLessThan(1200);
  });

  it('at rest, laid on its cloth, is exactly the brief as modelled', () => {
    const n = clothNormals(bake.particleRest, bake.triangles, bake.particles, new Float32Array(bake.particles * 3));
    const pos = new Float32Array(bake.vertices * 3), nrm = new Float32Array(bake.vertices * 3);
    layBrief(bake, bake.particleRest, n, 1, pos, nrm);
    let worst = 0, turned = 0;
    for (let i = 0; i < bake.vertices; i++) {
      worst = Math.max(worst, Math.hypot(pos[i * 3] - bake.rest[i * 3], pos[i * 3 + 1] - bake.rest[i * 3 + 1], pos[i * 3 + 2] - bake.rest[i * 3 + 2]));
      if (nrm[i * 3] * bake.restNormal[i * 3] + nrm[i * 3 + 1] * bake.restNormal[i * 3 + 1] + nrm[i * 3 + 2] * bake.restNormal[i * 3 + 2] < 0.999) turned++;
    }
    expect(worst).toBeLessThan(1e-5);
    expect(turned).toBe(0);
  });

  it('keeps every cloth point at least 3 mm off her, its strings and knots held and its panels\' middles freer', () => {
    for (const o of bake.binding.offset) expect(o).toBeGreaterThanOrEqual(BRIEF_CLOTH.clearance - 1e-9);
    // (the brief as fitted already stands 3 mm off her almost everywhere: little is lifted, and not far)
    expect(bake.liftMost).toBeLessThan(0.0015);
    const held = Array.from(bake.pin).filter((p) => p >= 1).length, light = Array.from(bake.pin).filter((p) => p < 0.2).length;
    expect(held).toBeGreaterThan(bake.particles * 0.4);
    expect(light).toBeGreaterThan(20);
    // its knots and bows ride their knots whole
    const ties = Array.from(bake.tie).filter(Boolean).length;
    expect(ties).toBeGreaterThan(4000);
  });
});
