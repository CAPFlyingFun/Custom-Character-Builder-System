import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BABY_BONES, poseAlong, type AlongWay } from '../src/sarahlab/baby';

/** A baby's bones made long and straight up +y (its head up): its back's joints `step` apart, a leg down from each hip. */
function straightBaby(step = 0.04): { root: THREE.Bone; bones: Map<string, THREE.Bone> } {
  const bones = new Map<string, THREE.Bone>();
  const bone = (name: string, parent: THREE.Bone | null, x: number, y: number): THREE.Bone => {
    const b = new THREE.Bone(); b.name = name; b.position.set(x, y, 0); parent?.add(b); bones.set(name, b); return b;
  };
  const root = bone(BABY_BONES.root, null, 0, 0);
  let last = bone(BABY_BONES.back[0], root, 0, 0.2);
  const hips = last;
  for (const n of BABY_BONES.back.slice(1)) last = bone(n, last, 0, step);
  const neck = bone(BABY_BONES.neck, last, 0, step);
  bone(BABY_BONES.crown, bone(BABY_BONES.head, neck, 0, 0.03), 0, 0.05);
  for (const [side, x] of [['left', 0.02], ['right', -0.02]] as const) {
    const [a, b, c] = BABY_BONES.leg[side];
    bone(c, bone(b, bone(a, hips, x, 0), 0, -0.08), 0, -0.08);
  }
  root.updateMatrixWorld(true);
  return { root, bones };
}
const at = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3());

describe('her baby laid along her canal (poseAlong)', () => {
  // a way that turns: from its neck straight back 2 cm, then round a quarter of a circle of 6 cm toward +z
  const R = 0.06;
  const way = (neck: THREE.Vector3, share = 1): AlongWay => ({
    perMetre: 1,
    share: () => share,
    at: (s, out) => {
      if (s <= 0.02) return out.set(0, -s, 0).add(neck);
      const a = Math.min(Math.PI / 2, (s - 0.02) / R), past = Math.max(0, s - 0.02 - R * Math.PI / 2);
      return out.set(0, -0.02 - R * Math.sin(a), R * (1 - Math.cos(a)) + past).add(neck);
    },
  });

  it('lays its back and legs along the way, its neck and head where they were', () => {
    const { root, bones } = straightBaby(), neck = bones.get(BABY_BONES.neck)!, head = bones.get(BABY_BONES.head)!;
    const neck0 = at(neck), head0 = at(head), turn0 = head.getWorldQuaternion(new THREE.Quaternion()), w = way(neck0);
    const moved = poseAlong(bones, w);
    expect(moved).not.toBeNull();
    root.position.add(moved!); root.updateMatrixWorld(true);
    expect(at(neck).distanceTo(neck0)).toBeLessThan(1e-6);
    expect(at(head).distanceTo(head0)).toBeLessThan(1e-6);
    expect(head.getWorldQuaternion(new THREE.Quaternion()).angleTo(turn0)).toBeLessThan(1e-6);
    // each joint of its back on the way (as near as straight pieces lie to a curve), its pieces their own lengths
    const chain = [...BABY_BONES.back, BABY_BONES.neck].map((n) => bones.get(n)!);
    let s = 0;
    for (let k = chain.length - 2; k >= 0; k--) {
      s += 0.04;
      expect(at(chain[k]).distanceTo(at(chain[k + 1]))).toBeCloseTo(0.04, 6);
      expect(at(chain[k]).distanceTo(w.at(s, new THREE.Vector3()))).toBeLessThan(0.006);
    }
    // its hips have turned the corner: its legs trail on along the way (toward +z), not down through it
    for (const side of ['left', 'right'] as const) {
      const [a, , c] = BABY_BONES.leg[side].map((n) => bones.get(n)!);
      const leg = at(c).sub(at(a)).normalize();
      expect(leg.z).toBeGreaterThan(0.95);
    }
  });

  it('comes onto the middle of the way behind its neck, where its neck lies beside it', () => {
    // (the way 2 cm to one side of its neck: its back eases onto it over `settle`, its neck where it was)
    const { root, bones } = straightBaby(), neck = bones.get(BABY_BONES.neck)!, neck0 = at(neck), aside = new THREE.Vector3(0.02, 0, 0), w = way(neck0.clone().add(aside));
    const moved = poseAlong(bones, { ...w, settle: 0.08 });
    root.position.add(moved!); root.updateMatrixWorld(true);
    expect(at(neck).distanceTo(neck0)).toBeLessThan(1e-6);
    const chain = [...BABY_BONES.back, BABY_BONES.neck].map((n) => bones.get(n)!);
    // (its hips, 20 cm behind its neck: on the way's line, as near as straight pieces lie to a curve)
    expect(at(chain[0]).distanceTo(w.at(0.2, new THREE.Vector3()))).toBeLessThan(0.008);
    expect(Math.abs(at(chain[0]).x - (neck0.x + 0.02))).toBeLessThan(0.003);
  });

  it('leaves what is not on the way as it is posed', () => {
    const { bones } = straightBaby(), before = [...bones.values()].map((b) => at(b));
    expect(poseAlong(bones, way(at(bones.get(BABY_BONES.neck)!), 0))).toBeNull();
    [...bones.values()].forEach((b, k) => expect(at(b).distanceTo(before[k])).toBeLessThan(1e-9));
  });

  it('bends only the part of it that is on the way', () => {
    // (the half of its back nearer its head is out of her: it stays straight, as it was in the world)
    const { root, bones } = straightBaby(), neck = bones.get(BABY_BONES.neck)!, neck0 = at(neck), w = way(neck0);
    const moved = poseAlong(bones, { ...w, share: (s) => (s > 0.1 ? 1 : 0) });
    root.position.add(moved!); root.updateMatrixWorld(true);
    const chain = [...BABY_BONES.back, BABY_BONES.neck].map((n) => bones.get(n)!), n = chain.length;
    for (let k = n - 1; k >= n - 3; k--) { const p = at(chain[k]); expect(Math.abs(p.z - neck0.z)).toBeLessThan(1e-6); expect(p.y).toBeCloseTo(neck0.y - 0.04 * (n - 1 - k), 6); }
    expect(at(chain[0]).z - neck0.z).toBeGreaterThan(0.02);
  });
});
