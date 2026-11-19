import { describe, expect, it } from 'vitest';
import { PAINT_LAYER_COUNT, PAINT_PACKED, packPaint, paintAt } from '../src/sarahlab/bodyPaint';

// Joshua, 2026-11-19: "we have a 3 layers, and can we actually raise that amount up to 6 layers?"
describe('six paint layers, two to a number', () => {
  it('are six, in the three numbers a vertex her skin had room for', () => {
    expect(PAINT_LAYER_COUNT).toBe(6);
    expect(PAINT_PACKED).toBe(3);
  });
  it('each layer comes back as it went in, to a 255th, whatever the others are', () => {
    const n = 50, w = new Float32Array(n * 6), out = new Float32Array(n * 3);
    for (let i = 0; i < w.length; i++) w[i] = ((i * 37) % 101) / 100;
    packPaint(w, out);
    for (let v = 0; v < n; v++) for (let l = 0; l < 6; l++) expect(Math.abs(paintAt(out, v, l) - w[v * 6 + l])).toBeLessThanOrEqual(0.5 / 255 + 1e-6);
  });
  it('is a whole number a float holds exactly, and the first three layers alone read as they always did in 255ths', () => {
    const w = new Float32Array([1, 1, 1, 1, 1, 1, 0.5, 0, 0, 0, 0, 0]), out = new Float32Array(6);
    packPaint(w, out);
    expect(out[0]).toBe(255 + 256 * 255);
    expect(Number.isInteger(out[0])).toBe(true);
    expect(out[3]).toBe(128);
  });
});

import * as THREE from 'three';
import { BodyPaint, packLayer, PAINT_ATTRIBUTE } from '../src/sarahlab/bodyPaint';

// Joshua, 2026-11-19: "make each layer adjustable so you can like place above or below another layer"
describe('two layers change places', () => {
  it('their weights swap, the packed attribute follows, and UNDO brings each back in its new place', () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 3), 3));
    g.setIndex([0, 1, 2]);
    const paint = new BodyPaint(new THREE.Mesh(g) as unknown as THREE.SkinnedMesh);
    paint.weights.set([1, 0, 0, 0, 0, 0.5, /**/ 1, 0, 0, 0, 0, 0, /**/ 0, 0, 0, 0, 0, 0]);
    paint.checkpoint(0);
    paint.weights[0] = 0.2;
    paint.swapLayers(0, 5);
    expect(Array.from(packLayer(paint.weights, 5))).toEqual([51, 255, 0]);
    expect(Array.from(packLayer(paint.weights, 0))).toEqual([128, 0, 0]);
    const a = g.getAttribute(PAINT_ATTRIBUTE).array as Float32Array;
    expect(paintAt(a, 0, 5)).toBeCloseTo(0.2, 2);
    expect(paintAt(a, 0, 0)).toBeCloseTo(0.5, 2);
    // the step kept for layer 0 is layer 5's now
    expect(paint.undo()).toBe(5);
    expect(Array.from(packLayer(paint.weights, 5))).toEqual([255, 255, 0]);
  });
});
