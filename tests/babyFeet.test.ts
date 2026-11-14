/**
 * ITS FEET AS IT IS BORN (src/sarahlab/baby.ts `poseDescent`, `pointFoot`; Joshua, 2026-11-14: "the feet was flat"). Made
 * long, only its thighs and shins were turned: each foot kept the angle it has curled in her womb -- its toes drawn up
 * past a right angle -- and came down her canal on straight legs standing flat. Its foot is turned at its ankle toward
 * its shin's line, to where its straight body was baked.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BABY_BONES, DESCENT, footOffDeg, pointFoot, poseDescent, type MoveFrame } from '../src/sarahlab/baby';

const DEG = Math.PI / 180;
/** A curled baby's bones: its back up +y, each leg drawn up in front of it, each foot `footDeg` off its shin's line. */
function curledBaby(footDeg = 115): { root: THREE.Bone; bones: Map<string, THREE.Bone> } {
  const bones = new Map<string, THREE.Bone>();
  const bone = (name: string, parent: THREE.Bone | null, x: number, y: number, z: number): THREE.Bone => {
    const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent?.add(b); bones.set(name, b); return b;
  };
  const root = bone(BABY_BONES.root, null, 0, 0, 0);
  let last = bone(BABY_BONES.back[0], root, 0, 0.2, 0);
  const hips = last;
  for (const n of BABY_BONES.back.slice(1)) last = bone(n, last, 0, 0.04, 0.005);
  bone(BABY_BONES.neck, last, 0, 0.04, 0);
  for (const [side, x] of [['left', 0.02], ['right', -0.02]] as const) {
    const [a, b, c, d] = BABY_BONES.leg[side];
    // thigh forward and up, shin back down: knees drawn up; its foot off its shin's line (down -y) by `footDeg`, toes forward
    const knee = bone(b, bone(a, hips, x, 0, 0), 0, 0.05, 0.07), ankle = bone(c, knee, 0, -0.08, 0);
    bone(d, ankle, 0, -0.045 * Math.cos(footDeg * DEG), 0.045 * Math.sin(footDeg * DEG));
  }
  root.updateMatrixWorld(true);
  return { root, bones };
}
const frame: MoveFrame = { long: new THREE.Vector3(0, 1, 0), front: new THREE.Vector3(0, 0, 1), left: new THREE.Vector3(1, 0, 0), out: new THREE.Vector3(0, 0, -1) };
const feet = (bones: Map<string, THREE.Bone>) => (['left', 'right'] as const).map((s) => { const [, k, a, t] = BABY_BONES.leg[s].map((n) => bones.get(n)!); return footOffDeg(k, a, t)!; });

describe('its feet as it is born', () => {
  it('reads how far a foot stands off its shin\'s line', () => {
    expect(feet(curledBaby(90).bones)[0]).toBeCloseTo(90, 4);
    expect(feet(curledBaby(115).bones)[1]).toBeCloseTo(115, 4);
    expect(feet(curledBaby(0.001).bones)[0]).toBeCloseTo(0, 2);
    const b = new THREE.Bone();
    expect(footOffDeg(b, b, b)).toBeNull();
  });
  it('made long, its feet come to where its straight body was baked', () => {
    const { bones } = curledBaby(115);
    poseDescent(bones, 1, frame);
    for (const f of feet(bones)) expect(f).toBeCloseTo(DESCENT.footOff, 3);
    // (its legs straight under it: its knees and ankles below its hips)
    for (const s of ['left', 'right'] as const) {
      const [a, , c] = BABY_BONES.leg[s].map((n) => bones.get(n)!.getWorldPosition(new THREE.Vector3()));
      expect(c.y).toBeLessThan(a.y - 0.12);
    }
  });
  it('as it was: its thighs and shins turned and its feet left standing flat', () => {
    const { bones } = curledBaby(115);
    // (the same pose with its feet's own number put past where they are: nothing is turned)
    const [, k, a, t] = BABY_BONES.leg.left.map((n) => bones.get(n)!);
    pointFoot(k, a, t, 130, 1);
    expect(feet(bones)[0]).toBeCloseTo(115, 4);
  });
  it('by as much as its legs are straightened', () => {
    const half = curledBaby(115), none = curledBaby(115);
    poseDescent(half.bones, 1, frame, 0.5);
    for (const f of feet(half.bones)) { expect(f).toBeLessThan(115 - 20); expect(f).toBeGreaterThan(DESCENT.footOff + 20); }
    // (its legs not yet straightening -- high in her womb -- its feet as it lies curled)
    poseDescent(none.bones, 1, frame, 0);
    for (const f of feet(none.bones)) expect(f).toBeCloseTo(115, 4);
  });
  it('a foot pointed further than that already is left as it is', () => {
    const { bones } = curledBaby(30);
    poseDescent(bones, 1, frame);
    for (const f of feet(bones)) expect(f).toBeCloseTo(30, 3);
  });
  it('its foot is turned at its ankle only: its shin stays on its leg\'s line', () => {
    const { bones } = curledBaby(115), before = curledBaby(115);
    poseDescent(bones, 1, frame);
    // (the same pose with no foot to point: its knee and ankle are where they were laid)
    const [la, lb, lc] = BABY_BONES.leg.left;
    const bare = new Map([...before.bones].filter(([n]) => n !== BABY_BONES.leg.left[3] && n !== BABY_BONES.leg.right[3]));
    poseDescent(bare, 1, frame);
    for (const n of [la, lb, lc]) expect(bones.get(n)!.getWorldPosition(new THREE.Vector3()).distanceTo(before.bones.get(n)!.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-9);
  });
  it('the number is its straight body\'s own', () => {
    // (MEASURED on models/sarah-baby-straight.glb's bones, 2026-11-14: 61.1 degrees each foot)
    expect(DESCENT.footOff).toBe(61);
  });
});
