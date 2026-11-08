/**
 * HER BABY GIVES A LITTLE WHERE IT CROSSES HER OPENING (src/sarahlab/babySqueeze.ts): the squeeze worked on points as the
 * shader works it on her baby's vertices -- what is wider than her opening stretches drawn in to within it, never past
 * its edge, never by more than its share; its head never; nothing far from her opening's plane.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BABY_SQUEEZE, squeezePoints } from '../src/sarahlab/babySqueeze';

describe('her baby squeezed where it crosses her opening (worked on points)', () => {
  // (her opening in the world: its middle at the origin, the way through down y, 12.5 cm along z and 10 across x; 100 units a metre)
  const M = 100, f = { centre: new THREE.Vector3(0, 0, 0), axis: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), across: new THREE.Vector3(1, 0, 0), ra: 6.25, rb: 5, head: null, headR: 0, slab: 0.06 };

  it('draws in what is wider than her opening, to within its edge, by no more than its share', () => {
    const p = Float32Array.from([6, 0, 0, 0, 0, 6, 3, 0, 0]);
    squeezePoints(p, f, M);
    // (a shoulder 6 cm across her, past the 5 cm her doors open to each side: drawn within it)
    expect(p[0]).toBeLessThanOrEqual(5);
    expect(p[0]).toBeGreaterThanOrEqual(6 * (1 - BABY_SQUEEZE.most) - 1e-9);
    // (along her opening, 6 of its 6.25: eased in a little; well inside: untouched)
    expect(p[5]).toBeLessThan(6);
    expect(p[5]).toBeGreaterThan(5.5);
    expect(p[6]).toBe(3);
  });

  it('only near her opening, and never its head', () => {
    const far = Float32Array.from([6, -7, 0]);
    squeezePoints(far, f, M);
    expect(far[0]).toBe(6);
    const near = Float32Array.from([6, 0, 0]);
    squeezePoints(near, { ...f, head: new THREE.Vector3(1, 0, 0), headR: 6 }, M);
    expect(near[0]).toBe(6);
  });
});
