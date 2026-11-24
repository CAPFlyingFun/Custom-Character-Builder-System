/**
 * Her womb's wall field (`baby.ts` `wallField`): the last few wombs' grids are kept and a new womb takes over the oldest
 * one's numbers, so a belly being changed does not make a grid of a megabyte and more for every shape her womb passes
 * through (MEASURED 2026-11-24 in the room: 68 MB over ten 1% steps of her belly). What a packing is told is the same
 * whichever grid it was worked out in.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { NP, NT, wallCostAt, wallFieldsKept, type WombShape } from '../src/sarahlab/baby';

const sphere = (radius: number, x = 0): WombShape => ({
  centre: new THREE.Vector3(x, 1, 0.1), r: new Float32Array(NT * NP).fill(radius), axis: new THREE.Vector3(0, 1, 0),
  skin: new Float32Array(NT * NP).fill(Infinity),
});
const probes = (w: WombShape, radius: number) => [0.5, 0.9, 1.02, 1.1, 1.3].flatMap((k) => [[k * radius, 0, 0], [0, k * radius * 0.7, k * radius * 0.7], [0.01, -k * radius, 0.02]].map(([x, y, z]) => wallCostAt(w, w.centre.x + x, w.centre.y + y, w.centre.z + z)));

describe('her womb\'s wall field', () => {
  it('a womb asked again after its grid went to newer wombs says the same, and only a few grids are kept', () => {
    const a = sphere(0.15), first = probes(a, 0.15);
    for (let k = 0; k < 7; k++) { const w = sphere(0.12 + 0.01 * k, 0.001 * k); probes(w, 0.12 + 0.01 * k); }
    expect(wallFieldsKept()).toBeLessThanOrEqual(4);
    expect(probes(a, 0.15)).toEqual(first);
    // and nothing standing inside it costs anything; past it, more the further
    expect(first[0]).toBe(0);
    expect(first[9]).toBeGreaterThan(first[6]);
  });
});
