/**
 * EACH FINGER'S SKIN ITS OWN (`fingerWeights.ts`, P4 2026-11-05). On a small hand of two fingers whose skin is carried
 * half by its own finger and partly by the other (as Meshy's rig carries Sarah v2's), stored as whole numbers out of 255:
 * past the webbing each finger's skin is its own finger's alone, further out it bends evenly with the bone under it, every
 * point's weights add to exactly 255 (skinning does not divide by the total, so 254 draws a point nearer her rig's middle),
 * and her own weights come back exactly.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FINGER_WEIGHTS, createFingerWeights } from '../src/sarahlab/fingerWeights';

const LEVELS = [0, 0.04, 0.07, 0.085];

function hand() {
  // bones: the hand, then each finger's knuckle, middle joint, last joint and end
  const root = new THREE.Bone(); root.position.set(0, 1, 0);
  const bones: THREE.Bone[] = [root], chains: number[][] = [];
  for (const x of [-0.01, 0.01]) {
    const chain: number[] = []; let parent = root, at = 0;
    LEVELS.forEach((y, k) => { const b = new THREE.Bone(); b.position.set(k === 0 ? x : 0, y - at, 0); at = y; parent.add(b); parent = b; chain.push(bones.length); bones.push(b); });
    chains.push(chain);
  }
  // points down each finger, either side of it
  const pts: number[] = [], idx: number[] = [], w: number[] = [], owner: number[] = [], past: number[] = [];
  for (let f = 0; f < 2; f++) for (const side of [-0.006, 0.006]) for (let y = -0.004; y <= 0.088; y += 0.002) {
    const x = (f === 0 ? -0.01 : 0.01) + side;
    pts.push(x, 1 + y, 0);
    const level = y < 0.04 ? 0 : y < 0.07 ? 1 : 2, mine = chains[f][level], theirs = chains[1 - f][level];
    idx.push(mine, theirs, 0, chains[f][3]); w.push(0.45, 0.3, 0.15, 0.1);
    owner.push(f); past.push(y);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Uint8BufferAttribute(w.map((x) => Math.round(x * 255)), 4, true));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  mesh.add(root); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  return { mesh, chains, split: { owner: Int8Array.from(owner), past: Float32Array.from(past) } };
}

describe('each finger\'s skin its own (fingerWeights)', () => {
  it('past the webbing no point is carried by the other finger, further out each bends evenly, and every point adds to 255', () => {
    const { mesh, chains, split } = hand(), fw = createFingerWeights(mesh, new THREE.Matrix4().makeTranslation(0, -1, 0), [chains], split)!;
    expect(fw).not.toBeNull();
    expect(fw.apply(1)).toBe(true);
    const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight'), raw = sw.array as Uint8Array;
    for (let i = 0; i < si.count; i++) {
      const f = split.owner[i], y = split.past[i], bones = [0, 1, 2, 3].filter((c) => raw[i * 4 + c] > 0).map((c) => si.getComponent(i, c));
      if (fw.points.includes(i)) expect(raw[i * 4] + raw[i * 4 + 1] + raw[i * 4 + 2] + raw[i * 4 + 3], `point ${i} adds to the whole`).toBe(255);
      if (y >= FINGER_WEIGHTS.across[1]) for (const b of bones) expect(chains[1 - f], `point ${i} (${y.toFixed(3)} out) none of the other finger's`).not.toContain(b);
      // (well out along its middle bone, away from either joint: all its finger's share with that bone)
      if (y >= FINGER_WEIGHTS.along[1] && y > 0.04 + 0.007 && y < 0.07 - 0.007) {
        const fingerBones = bones.filter((b) => b !== 0);
        expect(fingerBones, `point ${i} (${y.toFixed(3)} out)`).toEqual([chains[f][1]]);
      }
    }
  });

  it('none of it before the webbing, and her own weights come back exactly', () => {
    const { mesh, chains, split } = hand(), sw = mesh.geometry.getAttribute('skinWeight'), si = mesh.geometry.getAttribute('skinIndex');
    const ownW = Array.from(sw.array as Uint8Array), ownI = Array.from(si.array as Uint16Array);
    const fw = createFingerWeights(mesh, new THREE.Matrix4().makeTranslation(0, -1, 0), [chains], split)!;
    expect(fw.points.every((i) => split.past[i] > FINGER_WEIGHTS.across[0])).toBe(true);
    expect(fw.apply(1)).toBe(true);
    expect(fw.apply(1)).toBe(false);
    expect(Array.from(sw.array as Uint8Array)).not.toEqual(ownW);
    expect(fw.apply(0)).toBe(true);
    expect(Array.from(sw.array as Uint8Array)).toEqual(ownW);
    expect(Array.from(si.array as Uint16Array)).toEqual(ownI);
  });
});
