import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SKIN_DETAIL, patchSkinDetail, skinDetailUniforms } from '../src/sarahlab/skinDetail';

describe('his skin detail', () => {
  it('lays its tile and its depth in his own units', () => {
    const u = skinDetailUniforms(new THREE.Texture(), 100, 1);
    expect(u.skinDetailTile.value).toBeCloseTo(SKIN_DETAIL.tileM * 100);
    expect(u.skinDetailDepth.value).toBeCloseTo(SKIN_DETAIL.depthM);
  });
  it('patches his material on top of what it had, and keys its program', () => {
    const m = new THREE.MeshStandardMaterial();
    let before = 0; m.onBeforeCompile = () => { before++; };
    patchSkinDetail(m, skinDetailUniforms(new THREE.Texture(), 1, 1));
    const shader = { uniforms: {}, vertexShader: '#include <common>\nvoid main() {\n}', fragmentShader: '#include <common>\n#include <normal_fragment_maps>' } as unknown as THREE.WebGLProgramParametersWithUniforms;
    m.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(before).toBe(1);
    expect(shader.vertexShader).toContain('vSkinRest = position');
    expect(shader.fragmentShader).toContain('skinDetailBend');
    expect(m.customProgramCacheKey()).toContain('skinDetail');
  });
});
