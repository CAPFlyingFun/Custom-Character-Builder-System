/**
 * HER SKELETON (public/models/sarah-skeleton.glb; scripts/rigSkeleton.mjs; Joshua, 2026-11-07): his Meshy skeleton
 * rigged with Sarah's own bones, so the room's poses find it as they find her.
 */
import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { measureHuman } from '../src/actor/humanSkeleton';
import { fleshlessModel, levelArmsModel, nextModel, SARAH_LAB_MODELS, SARAH_LAB_MODELS_OFF_MENU, SARAH_SKELETON_MODEL, SARAH_V2_BODY_MODEL } from '../src/sarahlab/sarahLabTool';

async function bindOf(file: string) {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(file);
  const joints = doc.getRoot().listSkins()[0].listJoints();
  return joints.map((j) => { const m = j.getWorldMatrix(), p = j.getParentNode(); return { name: j.getName(), x: m[12], y: m[13], z: m[14], parent: p ? joints.indexOf(p as never) : -1 }; });
}

describe("her skeleton, rigged with her own bones", () => {
  it('is no longer on the MODEL button now that it lives inside v2, but still in the list (a probe steps to it)', () => {
    const ids = SARAH_LAB_MODELS.map((m) => m.id), body = ids.indexOf('v2-body'), bare = ids.indexOf('skeleton');
    expect(SARAH_LAB_MODELS_OFF_MENU.has('skeleton')).toBe(true);
    // (MODEL from v2-body goes past it, round to the first; and every step from any model lands on the menu)
    expect(nextModel(body)).not.toBe(bare);
    for (let i = 0; i < ids.length; i++) expect(SARAH_LAB_MODELS_OFF_MENU.has(ids[nextModel(i)])).toBe(false);
    expect(nextModel(body, true)).toBe(bare);
  });
  it('is a model in the room, after v2-body, rigged level-armed and fleshless', () => {
    const ids = SARAH_LAB_MODELS.map((m) => m.id);
    expect(ids.indexOf('skeleton')).toBe(ids.indexOf('v2-body') + 1);
    expect(SARAH_LAB_MODELS.find((m) => m.id === 'skeleton')?.path).toBe(SARAH_SKELETON_MODEL);
    expect(levelArmsModel('skeleton') && levelArmsModel('v1') && !levelArmsModel('v2-body')).toBe(true);
    expect(fleshlessModel('skeleton') && !fleshlessModel('v2-body')).toBe(true);
  });

  it("carries her 68 bones in her order (names and parents), and a jaw under her head", async () => {
    const [bones, hers] = await Promise.all([bindOf(`public/${SARAH_SKELETON_MODEL}`), bindOf(`public/${SARAH_V2_BODY_MODEL}`)]);
    expect(hers.length).toBe(68);
    expect(bones.length).toBe(69);
    for (let i = 0; i < 68; i++) expect([bones[i].name, bones[i].parent]).toEqual([hers[i].name, hers[i].parent]);
    expect(bones[68].name).toBe('Jaw');
    expect(bones[68].parent).toBe(6);
  }, 60000);

  it("is lighter than her body (Joshua: \"The walking was lagging\"): fewer vertices to pose and draw than her 115,710", async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const prim = (await io.read(`public/${SARAH_SKELETON_MODEL}`)).getRoot().listMeshes()[0].listPrimitives()[0];
    expect(prim.getAttribute('POSITION')!.getCount()).toBeLessThan(80000);
    expect(prim.getAttribute('TEXCOORD_0')).toBeNull();
  }, 60000);

  it("is measured by the room as she is: the same joint for every name, the left arm toward +x", async () => {
    const [bones, hers] = await Promise.all([bindOf(`public/${SARAH_SKELETON_MODEL}`), bindOf(`public/${SARAH_V2_BODY_MODEL}`)]);
    const a = measureHuman(bones as never), b = measureHuman(hers as never);
    expect(a.joints).toEqual(b.joints);
    expect(a.leftSign).toBe(b.leftSign);
    // the skull's top 1.69 m up and the soles on the floor, in her metres (the bones' crown joint sits inside the skull)
    expect(a.height).toBeGreaterThan(1.55);
    expect(a.height).toBeLessThan(1.7);
  }, 60000);
});
