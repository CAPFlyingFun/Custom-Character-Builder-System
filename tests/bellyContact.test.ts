import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BELLY_CONTACT, createBellyContact } from '../src/sarahlab/bellyContact';

/**
 * HER THIGHS GIVE WAY TO HER BUMP, NEVER HER BUMP TO HER THIGHS (bellyContact.ts). A stand-in: her bump's underside a
 * level sheet facing down (her body's bone, all of her bump's footprint), and under it the top of her thigh, a level
 * sheet facing up (her thigh's bone, none of the footprint), `depth` metres up into her bump.
 */
function standIn(depth: number) {
  const body = new THREE.Bone(), thigh = new THREE.Bone();
  body.add(thigh);
  const side = 9, step = 0.01, pts: number[] = [], nrm: number[] = [], si: number[] = [], sw: number[] = [], foot: number[] = [], tris: number[] = [];
  const sheet = (y: number, up: boolean, bone: number, f: number) => {
    const base = pts.length / 3;
    for (let a = 0; a < side; a++) for (let b = 0; b < side; b++) {
      pts.push((a - 4) * step, y, (b - 4) * step); nrm.push(0, up ? 1 : -1, 0); si.push(bone, 0, 0, 0); sw.push(1, 0, 0, 0); foot.push(f);
    }
    for (let a = 0; a < side - 1; a++) for (let b = 0; b < side - 1; b++) {
      const p = base + a * side + b, q = p + side;
      // (wound so its own facing is `up`'s: (x, z) cross is -y, so the other way round faces up)
      if (up) tris.push(p, p + 1, q, q, p + 1, q + 1); else tris.push(p, q, p + 1, q, q + 1, p + 1);
    }
  };
  sheet(0, false, 0, 1);
  sheet(depth, true, 1, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nrm), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(sw), 4));
  g.setIndex(tris);
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  mesh.add(body);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([body, thigh]));
  mesh.skeleton.update();
  const contact = createBellyContact(mesh, tris, [1], 1);
  return { contact, pos: g.getAttribute('position').array as Float32Array, nrm: g.getAttribute('normal').array as Float32Array, foot: Float32Array.from(foot), half: side * side };
}

describe('her thighs give way to her bump (bellyContact.ts)', () => {
  it('a thigh 4 mm up into her bump is put back to `gap` under it, and her bump is not moved', () => {
    const { contact, pos, nrm, foot, half } = standIn(0.004);
    const f = contact.compute(pos, nrm, foot);
    expect(contact.stats.inside).toBe(half);
    expect(contact.stats.deepestMm).toBeCloseTo(4, 1);
    // none of her bump's points
    for (const i of f.index) expect(i).toBeGreaterThanOrEqual(half);
    // every point of her thigh `gap` under her bump
    expect(f.index.length).toBe(half);
    for (let k = 0; k < f.index.length; k++) {
      const i = f.index[k];
      expect(pos[i * 3 + 1] + f.pos[k * 3 + 1]).toBeCloseTo(-BELLY_CONTACT.gap, 5);
      expect(Math.abs(f.pos[k * 3])).toBeLessThan(1e-6);
      expect(Math.abs(f.pos[k * 3 + 2])).toBeLessThan(1e-6);
    }
  });
  it('a thigh clear of her bump is left as it is', () => {
    const { contact, pos, nrm, foot } = standIn(-0.01);
    expect(contact.compute(pos, nrm, foot).index.length).toBe(0);
    expect(contact.stats.inside).toBe(0);
  });
  it('nothing without a bump', () => {
    const { contact, pos, nrm, foot } = standIn(0.004);
    expect(contact.compute(pos, nrm, foot.map(() => 0)).index.length).toBe(0);
  });
});
