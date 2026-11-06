/**
 * THE DRAPE DRAWN A HAIR TOWARD THE EYE (tunicDrape.ts `leadToward`; Joshua, 2026-11-06: "the back end of that shirt on a
 * wrong z-layer or it's not offsetting correctly"): over her seat her skin came through the painted shirt's drape by up
 * to a millimetre. The drape's material is patched once to draw it DRAPE_LEAD (2 mm) toward the eye off her surface, more
 * at a slant up to DRAPE_LEAD_SLANT times, its place on screen unchanged -- chained onto whatever else dresses it.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DRAPE_LEAD, DRAPE_LEAD_SLANT, leadToward } from '../src/sarahlab/tunicDrape';

const compile = (m: THREE.Material) => {
  const shader = { vertexShader: 'void main() {\n#include <project_vertex>\n}', fragmentShader: '', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
  m.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader.vertexShader;
};

describe('the drape leads toward the eye', () => {
  it('moves each drawn point along its line of sight after projection, once, and redraws it there', () => {
    const m = new THREE.MeshStandardMaterial();
    leadToward(m); leadToward(m);
    const vert = compile(m);
    expect(vert.split('drapeEye * ').length - 1).toBe(1);
    expect(vert).toContain(`drapeLead / max(drapeFacing, ${(1 / DRAPE_LEAD_SLANT).toFixed(4)})`);
    expect(vert).toContain('uniform float drapeLead;');
    expect(vert.indexOf('#include <project_vertex>')).toBeLessThan(vert.indexOf('drapeEye'));
    expect(vert).toContain('gl_Position = projectionMatrix * mvPosition;');
    expect(m.customProgramCacheKey()).toContain('|drape-lead-3');
  });
  it('chains onto what the material already does', () => {
    const m = new THREE.MeshStandardMaterial();
    let ran = 0;
    m.onBeforeCompile = () => { ran++; };
    m.customProgramCacheKey = () => 'mine';
    leadToward(m);
    compile(m);
    expect(ran).toBe(1);
    expect(m.customProgramCacheKey()).toBe('mine|drape-lead-3');
  });
  it('is 2 mm, at most 6 at a slant (world units, 100 to the metre)', () => {
    expect(DRAPE_LEAD).toBe(0.2);
    expect(DRAPE_LEAD * DRAPE_LEAD_SLANT).toBeCloseTo(0.6, 9);
  });
});
