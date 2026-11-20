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

import { HAIR_DEPTH_KEY, HAIR_TBN_LINE, setHairDepth } from '../src/sarahlab/hairMaterial';
describe('her strands depth', () => {
  it('wears the normal map, keys its program, and gives the frame her hair\'s own normal', () => {
    const m = new THREE.MeshStandardMaterial(), n = new THREE.Texture(), h = new THREE.Texture();
    setHairDepth(m, n, h, 1, 0.12);
    expect(m.normalMap).toBe(n);
    expect(m.customProgramCacheKey()).toContain(HAIR_DEPTH_KEY);
    const shader = { uniforms: {}, vertexShader: '', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <normal_fragment_maps>' } as unknown as THREE.WebGLProgramParametersWithUniforms;
    m.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader.indexOf(HAIR_TBN_LINE)).toBeLessThan(shader.fragmentShader.indexOf('#include <normal_fragment_maps>'));
    setHairDepth(m, n, h, 0);
    expect(m.normalMap).toBeNull();
  });
});

describe('her even roughness (skinChoices.ts SKIN_EVEN_ROUGHNESS)', () => {
  it('is one roughness over her skin: no bikini baked in', async () => {
    const sharp = (await import('sharp')).default;
    const { SKIN_EVEN_ROUGHNESS } = await import('../src/sarahlab/skinChoices');
    const { data, info } = await sharp(`public/${SKIN_EVEN_ROUGHNESS}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const g: number[] = []; for (let i = 0; i < info.width * info.height; i += 97) g.push(data[i * 3 + 1]);
    g.sort((a, b) => a - b); const at = (f: number) => g[Math.floor(f * (g.length - 1))];
    // (her file's own: 93 to 125 from 5% to 95% of it; evened, her details alone stand off her skin's 106)
    expect(at(0.95) - at(0.05)).toBeLessThanOrEqual(4);
    expect(Math.abs(at(0.5) - 106)).toBeLessThanOrEqual(2);
  });
});
