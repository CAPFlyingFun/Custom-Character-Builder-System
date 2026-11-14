/**
 * HER OWN SKELETON (src/view/HumanRig.ts `findSkinnedMesh`; SarahLabScene.ts `herSkinned`). The room's mother carries her
 * baby from one of her bones, and its skeleton has more bones than hers (71 to 68): "the skinned mesh with the most bones"
 * was her baby's once it was loaded, and her joints were read off its bones -- the angle between her thighs said 169
 * degrees in every pose (MEASURED 2026-11-14). What hangs under the baby's holder is not hers.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { findSkinnedMesh } from '../src/view/HumanRig';

function skinned(name: string, bones: number, under?: THREE.Object3D): THREE.SkinnedMesh {
  const list = Array.from({ length: bones }, (_, i) => { const b = new THREE.Bone(); b.name = `${name}-${i}`; return b; });
  for (let i = 1; i < list.length; i++) list[i - 1].add(list[i]);
  const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  mesh.name = name; mesh.add(list[0]); mesh.bind(new THREE.Skeleton(list));
  under?.add(mesh);
  return mesh;
}

describe('her own skinned mesh', () => {
  it('is the one with the most bones in her', () => {
    const her = new THREE.Group(), body = skinned('body', 68, her);
    skinned('badge', 3, her);
    expect(findSkinnedMesh(her)).toBe(body);
  });
  it('is not her baby\'s, though it hangs from her spine and has more bones than she has', () => {
    const her = new THREE.Group(), body = skinned('body', 68, her);
    const holder = new THREE.Object3D(); body.skeleton.bones[5].add(holder);
    const baby = skinned('baby', 71, holder);
    // (as it was: the most bones in her model are her baby's)
    expect(findSkinnedMesh(her)).toBe(baby);
    expect(findSkinnedMesh(her, holder)).toBe(body);
    // (twins and triplets hang in the same holder)
    skinned('twin', 71, holder);
    expect(findSkinnedMesh(her, holder)).toBe(body);
  });
  it('takes the first of two with as many bones, as it always did', () => {
    const her = new THREE.Group(), body = skinned('body', 68, her);
    skinned('tee', 68, her);
    expect(findSkinnedMesh(her)).toBe(body);
    expect(findSkinnedMesh(her, null)).toBe(body);
  });
  it('finds none where there is none, or where all of it is skipped', () => {
    const her = new THREE.Group();
    expect(findSkinnedMesh(her)).toBeNull();
    skinned('body', 4, her);
    expect(findSkinnedMesh(her, her)).toBeNull();
  });
});
