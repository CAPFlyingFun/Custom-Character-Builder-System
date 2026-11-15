/**
 * THE SKIN BEHIND THE CLEAVAGE BRIDGE loses its top's paint (Joshua, 2026-10-23, drawn: "I want the part directly
 * under that bridge to not be painted"). `setUnder` lays one value a vertex on her skin and names the paint layer it
 * takes off; the shader draws that layer's paint only where the value is under one half.
 *
 * Her skin's shader has sixteen attributes on many phones and used them all, so the bridge's values share ONE attribute
 * with her shirt's drape's and with which of her skin is her arm's (`AUX_ATTRIBUTE`: x the drape's, y the bridge's, z
 * her arm's -- 2026-11-14, when a drawn top's cut needed the third).
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { AUX_ATTRIBUTE, setArmSkin, setHang, setUnder } from '../src/sarahlab/fabricMaterial';

function skin(): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  const material = new THREE.MeshStandardMaterial();
  return { mesh: new THREE.Mesh(g, material), material };
}

function compiled(material: THREE.Material): { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string } {
  const shader = {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>',
    fragmentShader: '#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>\n#include <map_fragment>',
  };
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return shader;
}

describe('the skin behind the cleavage bridge', () => {
  it('lays its values on her skin and takes that layer\'s paint off where they pass one half', () => {
    const { mesh, material } = skin();
    setUnder(mesh, material, 1, Float32Array.from([0, 1, 0.5]), { layers: 3, rest: null });
    const aux = mesh.geometry.getAttribute(AUX_ATTRIBUTE);
    expect([0, 1, 2].map((v) => aux.getY(v))).toEqual([0, 1, 0.5]);
    const shader = compiled(material);
    expect(shader.uniforms.fabricUnderLayer.value).toBe(1);
    expect(shader.vertexShader).toContain(`vFabricAux = ${AUX_ATTRIBUTE};`);
    // only the bridge's own layer, drawn crisp at the half-way line like the paint's own edge
    expect(shader.fragmentShader).toContain('(1.0 - fabricEdge(vFabricAux.y) * step(abs(fabricUnderLayer - 1.0), 0.5))');
    expect(shader.fragmentShader).toContain('(1.0 - fabricEdge(vFabricAux.y) * step(abs(fabricUnderLayer - 0.0), 0.5))');
  });

  it("shares one attribute with her shirt's drape and her arm's skin, none writing over another", () => {
    const { mesh, material } = skin();
    setUnder(mesh, material, 1, Float32Array.from([0, 1, 0.5]), { layers: 3, rest: null });
    setHang(mesh, material, 0, Float32Array.from([0.25, 0, 1]), { layers: 3, rest: null });
    setArmSkin(mesh, [1, 0, 1], null);
    const aux = mesh.geometry.getAttribute(AUX_ATTRIBUTE);
    expect(aux.itemSize).toBe(3);
    expect(Array.from(aux.array as Float32Array)).toEqual([0.25, 0, 1, 0, 1, 0, 1, 0.5, 1]);
    // her skin's shader: eight attributes of the fabric's, with her five and her soft body's it stays inside sixteen
    const declared = compiled(material).vertexShader.match(/^attribute /gm) ?? [];
    expect(declared).toHaveLength(8);
    expect(mesh.geometry.getAttribute('fabricUnder')).toBeUndefined();
    expect(mesh.geometry.getAttribute('fabricHang')).toBeUndefined();
  });

  it('puts the paint back when the bridge comes off', () => {
    const { mesh, material } = skin();
    setUnder(mesh, material, 2, Float32Array.from([1, 1, 1]), { layers: 3, rest: null });
    setUnder(mesh, material, -1, null, { layers: 3, rest: null });
    expect(compiled(material).uniforms.fabricUnderLayer.value).toBe(-1);
  });

  it('leaves a material it never dressed alone', () => {
    const { mesh, material } = skin();
    setUnder(mesh, material, -1, null, { layers: 3, rest: null });
    expect(mesh.geometry.getAttribute(AUX_ATTRIBUTE)).toBeUndefined();
  });
});
