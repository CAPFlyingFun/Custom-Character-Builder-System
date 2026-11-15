/**
 * HER FACE'S COLOURS AS CHOICES (`faceLook.ts`, and what it sets on `faceRig.ts`). A head with every colour her own sets
 * nothing, so the rig draws exactly as before; a chosen colour arrives as linear numbers; a picked eye colour is what
 * its iris shows on average (MEASURED through the rig's own mirror), and a dark brown keeps a collar lighter than its
 * pupil; a chosen lip colour is laid as itself while her own tint is laid exactly as it was; the GLSL with nothing
 * chosen is today's expression with the constant tint read from a uniform whose default is that constant.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EYE_COLOURS, LIP_COLOURS, faceRigLook, irisMean, irisPalette } from '../src/sarahlab/faceLook';
import { FACE_LIPS, FACE_LOOK, faceIrisColour, faceLipLayer, patchFaceRig, setFaceRig, type FaceRigState } from '../src/sarahlab/faceRig';
import { HEAD_DEFAULT, colourLinear, type HeadLook } from '../src/sarahlab/headLook';

const LIPS_MID: [number, number, number] = [0, 1.522, 0.012];
const still: FaceRigState = { jaw: 0, blink: 0, gazeRight: [0, 0, 1], gazeLeft: [0, 0, 1] };
const head = (o: Partial<{ eyes: string | null; lips: string | null; brows: string | null }>): HeadLook => ({
  ...HEAD_DEFAULT, eyes: { colour: o.eyes ?? null }, lips: { ...HEAD_DEFAULT.lips, colour: o.lips ?? null }, brows: { ...HEAD_DEFAULT.brows, colour: o.brows ?? null },
});

describe('the swatches', () => {
  it('are unique, lower-case #rrggbb, and about a dozen each', () => {
    for (const list of [EYE_COLOURS, LIP_COLOURS]) {
      expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
      expect(new Set(list.map((s) => s.colour)).size).toBe(list.length);
      for (const s of list) expect(s.colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(list.length).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('faceRigLook', () => {
  it('sets nothing for a head that is her own', () => {
    expect(faceRigLook(HEAD_DEFAULT, null)).toEqual({});
  });
  it('gives a chosen lip colour and brow colour as linear numbers', () => {
    const s = faceRigLook(head({ lips: '#b46d6a', brows: '#2a1a12' }), null);
    expect(s.lipTint).toEqual(colourLinear('#b46d6a'));
    expect(s.browColour).toEqual(colourLinear('#2a1a12'));
    expect(s.iris).toBeUndefined();
  });
  it('takes her brows from her hair only when the look\'s own brow colour is null', () => {
    expect(faceRigLook(HEAD_DEFAULT, '#402010').browColour).toEqual(colourLinear('#402010'));
    expect(faceRigLook(head({ brows: '#101010' }), '#402010').browColour).toEqual(colourLinear('#101010'));
  });
  it('gives amounts only where they differ from her own', () => {
    const s = faceRigLook({ ...HEAD_DEFAULT, lips: { colour: null, amount: 0.2 }, lashes: 0.5, brows: { colour: null, amount: 0 } }, null);
    expect([s.lips, s.lashes, s.brow]).toEqual([0.2, 0.5, 0]);
  });
});

describe('a picked eye colour', () => {
  it('is what the iris shows on average (MEASURED through the mirror), for every swatch but the darkest', () => {
    for (const s of EYE_COLOURS.slice(1)) {
      const m = irisMean(irisPalette(s.colour)), want = colourLinear(s.colour);
      for (let i = 0; i < 3; i++) expect(Math.abs(m[i] - want[i])).toBeLessThan(0.002);
    }
  });
  it('keeps a dark brown\'s collar well lighter than its pupil, and its base brown, not black', () => {
    const p = irisPalette('#3d2516'), collar = faceIrisColour(0.2, p);
    const luma = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    expect(luma(collar)).toBeGreaterThan(1.4 * luma(FACE_LOOK.pupil)); // MEASURED 1.47x: on the sheet its collar reads round the pupil
    expect(p.iris[0]).toBeGreaterThan(p.iris[2]);
  });
});

describe('the lips', () => {
  it('lay her own tint exactly as before when nothing is chosen', () => {
    const under: [number, number, number] = [0.5, 0.3, 0.25];
    const c = faceLipLayer(under, LIPS_MID, still);
    for (let i = 0; i < 3; i++) expect(c[i]).toBeCloseTo(under[i] * (1 - 0.55 + 0.55 * FACE_LIPS.tint[i]), 12);
  });
  it('lay a chosen colour as itself at the default amount, on her lips\' own skin', () => {
    const red = colourLinear('#b81c28'), under: [number, number, number] = [0.5, 0.33, 0.28];
    const c = faceLipLayer(under, LIPS_MID, { ...still, lipTint: red });
    expect(c[0] / c[1]).toBeCloseTo(red[0] / red[1], 6);
  });
});

describe('the shader, nothing chosen', () => {
  it('is today\'s expression with the tint as a uniform whose default is FACE_LIPS.tint, the picks off', () => {
    const m = new THREE.MeshStandardMaterial();
    patchFaceRig(m);
    const shader = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    m.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= mix(vec3(1.0), faceLipTint.rgb, faceLipMask * faceLips * (1.0 - faceLipTint.w));');
    setFaceRig(m, still);
    const u = shader.uniforms;
    expect((u.faceLipTint.value as THREE.Vector4).toArray()).toEqual([...FACE_LIPS.tint, 0]);
    expect((u.faceIrisAmber.value as THREE.Vector4).w).toBe(0);
    setFaceRig(m, { ...still, ...faceRigLook(head({ eyes: '#3d2516', lips: '#b46d6a' }), null) });
    expect((u.faceLipTint.value as THREE.Vector4).w).toBe(1);
    expect((u.faceIrisAmber.value as THREE.Vector4).w).toBe(1);
    setFaceRig(m, still);
    expect((u.faceLipTint.value as THREE.Vector4).toArray()).toEqual([...FACE_LIPS.tint, 0]);
  });
});
