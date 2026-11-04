/**
 * Letting go of a loaded body's GPU memory (from TRADDOMIUM's tombs/LabPeople.ts, where the game's lab people use it
 * too; the Character Room needs only this, so it carries its own copy).
 */
import type * as THREE from 'three';

/**
 * Release every geometry, material, texture and skeleton under a root.
 * A model that came back from `loadModel` is ours, and these are the
 * allocations nothing else will ever free.
 *
 * Written here rather than imported from `fauna/rig.ts`'s `disposeRig`,
 * which does the same walk: `src/tombs/` reads `world/tombs`, `assets`
 * and `perf`, and a renderer reaching sideways into another renderer for
 * a fifteen-line utility is how those directions stop meaning anything.
 *
 * THE TEXTURE SCAN IS GENERIC — every own property that is a texture —
 * rather than a list of named map slots. The humans are baked by
 * `scripts/bakeHumans.mjs` and the maps they carry are the BAKER's
 * decision; a slot list written here would silently leak the day it adds
 * one, and a leak that only ever shows up as memory is the kind nobody
 * finds.
 */
export function release(root: THREE.Object3D): void {
  const done = new Set<object>();
  root.traverse((node) => {
    const skinned = node as THREE.SkinnedMesh;
    // The bone texture is the renderer's allocation for a skeleton — not a
    // geometry and not a material, so nothing else in this walk reaches it.
    if (skinned.isSkinnedMesh === true && skinned.skeleton && !done.has(skinned.skeleton)) {
      done.add(skinned.skeleton);
      skinned.skeleton.dispose();
    }
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh !== true) return;
    if (mesh.geometry && !done.has(mesh.geometry)) {
      done.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || done.has(material)) continue;
      done.add(material);
      for (const value of Object.values(material as unknown as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue;
        const texture = value as THREE.Texture;
        if (texture.isTexture !== true || done.has(texture)) continue;
        done.add(texture);
        texture.dispose();
      }
      material.dispose();
    }
  });
}
