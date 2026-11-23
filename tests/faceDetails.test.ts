/**
 * THE FACE'S DETAILS (2026-11-22, for GDM's Mary and John Fisher): freckles, a two-tone iris, a brow's shape, an eyelid
 * crease, deep-set eyes, smile lines, a philtrum, and a picture over the skin.
 * - a look keeps each only where it is not as before: a save of an older look, and of her own head, is the text it was;
 * - the face layer is told them (`faceRigLook`), deep-set eyes' shade by the face slider's own number;
 * - her program and his are the text they were until a look asks for a detail; then once, and only once, the program
 *   with the details goes on (its key says so), its freckles told where her paint covers her;
 * - the CPU mirrors of the iris and the brow agree with the shader's numbers, and are her own at her own settings;
 * - an exported character takes the picture over her skin with it.
 */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  FACE_BROWS, FACE_BROW_SHAPE, FACE_DEFAULTS, FACE_IRIS_SPLIT, HER_FACE, faceBrowLine, faceHasDetails, faceIrisColour, faceNeedsDetails, irisSplitAt, patchFaceRig, setFaceRig, type FaceRigState,
} from '../src/sarahlab/faceRig';
import { MALE_FACE } from '../src/sarahlab/maleFace';
import { DETAIL_NONE, HEAD_DEFAULT, HEAD_DEFAULT_MALE, MARKS_NONE, colourLinear, isDefaultHead, normaliseHead, type HeadLook } from '../src/sarahlab/headLook';
import { MARK_COLOUR, faceRigLook, irisPalette } from '../src/sarahlab/faceLook';
import { headOf, savedHead } from '../src/sarahlab/characterSaves';
import { picturesUsed } from '../src/sarahlab/characterExport';

const STILL: FaceRigState = { jaw: 0, gazeRight: [0, 0, 1], gazeLeft: [0, 0, 1], blink: 0 };
function compiled(m: THREE.Material) {
  const sh = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} as Record<string, THREE.IUniform> };
  m.onBeforeCompile(sh as unknown as THREE.WebGLProgramParametersWithUniforms, null as unknown as THREE.WebGLRenderer);
  return sh;
}

describe('a look\'s details', () => {
  it('are kept only where they are not as before', () => {
    const plain = normaliseHead({ eyes: { colour: '#4f6f94' } });
    expect(plain.eyes).toEqual({ colour: '#4f6f94' });
    expect(plain.brows).toEqual({ colour: null, amount: 1 });
    expect('marks' in plain || 'detail' in plain || 'overlay' in plain).toBe(false);
    // her own settings given are her own
    const own = normaliseHead({ eyes: { inner: null, innerSize: 0.5 }, brows: { arch: 0, straight: 0 }, marks: { ...MARKS_NONE }, detail: { ...DETAIL_NONE } });
    expect(own).toEqual(HEAD_DEFAULT);
    expect(isDefaultHead(own)).toBe(true);
    const mary = normaliseHead({
      eyes: { colour: '#6c7a42', inner: '#BF8F45', innerSize: 0.6 }, brows: { amount: 0.9, arch: 0.4, tilt: -2 },
      marks: { amount: 0.7, size: 0.4, nose: true, cheeks: true, shoulders: true }, detail: { crease: 0.6, smile: 0.3 }, overlay: { image: '0123456789abcdef', amount: 0.8 },
    });
    expect(mary.eyes).toEqual({ colour: '#6c7a42', inner: '#bf8f45', innerSize: 0.6 });
    expect(mary.brows).toEqual({ colour: null, amount: 0.9, arch: 0.4, tilt: -1 });
    expect(mary.marks).toEqual({ amount: 0.7, size: 0.4, colour: null, nose: true, cheeks: true, forehead: false, shoulders: true });
    expect(mary.detail).toEqual({ crease: 0.6, smile: 0.3, philtrum: 0 });
    expect(mary.overlay).toEqual({ image: '0123456789abcdef', amount: 0.8 });
    expect(isDefaultHead(mary)).toBe(false);
    for (const part of [{ eyes: { inner: '#bf8f45' } }, { eyes: { innerSize: 0.3 } }, { brows: { straight: 0.5 } }, { brows: { thick: 0.5 } }, { marks: { amount: 0.2 } }, { detail: { philtrum: 0.5 } }, { overlay: { image: 'fedcba9876543210' } }]) {
      expect(isDefaultHead(normaliseHead(part)), JSON.stringify(part)).toBe(false);
    }
  });
  it('take no picture id but the store\'s own', () => {
    for (const image of ['../x', '0123456789ABCDEF', '0123', 42, null]) expect(normaliseHead({ overlay: { image } }).overlay).toBeUndefined();
  });
  it('go into a save and come back out of it, for her and for him', () => {
    const look: HeadLook = { ...HEAD_DEFAULT, marks: { ...MARKS_NONE, amount: 0.5 }, detail: { crease: 0.5, smile: 0, philtrum: 0.2 } };
    const back = headOf({ ...savedHead(look) } as Parameters<typeof headOf>[0]);
    expect(back).toEqual(look);
    const his: HeadLook = { ...HEAD_DEFAULT_MALE, brows: { ...HEAD_DEFAULT_MALE.brows, straight: 1, thick: 0.6 }, face: { eyeDepth: 0.7 } };
    expect(headOf({ ...savedHead(his, true) } as Parameters<typeof headOf>[0], true)).toEqual(his);
    expect(savedHead(HEAD_DEFAULT)).toEqual({});
  });
});

describe('the face layer told them', () => {
  it('lays a two-tone iris: the inner ring as chosen, the outer colour itself; one colour alone, the palette as before', () => {
    const two = faceRigLook({ ...HEAD_DEFAULT, eyes: { colour: '#6c7a42', inner: '#bf8f45' } }, null);
    expect(two.irisInner).toEqual(colourLinear('#bf8f45'));
    expect(two.iris).toEqual(colourLinear('#6c7a42'));
    expect(two.irisAmber).toBeUndefined();
    const one = faceRigLook({ ...HEAD_DEFAULT, eyes: { colour: '#6c7a42' } }, null);
    expect(one).toMatchObject(irisPalette('#6c7a42'));
    expect(one.irisInner).toBeUndefined();
    // her own outer colour with an inner ring: the base is hers
    const own = faceRigLook({ ...HEAD_DEFAULT, eyes: { colour: null, inner: '#bf8f45' } }, null);
    expect(own.iris).toBeUndefined();
    const mid = faceIrisColour(0.7, own), base = FACE_DEFAULTS.iris;
    expect(mid[1]).toBeCloseTo(base[1], 2);
    expect(faceIrisColour(0.1, own)).toEqual(colourLinear('#bf8f45').map((c) => expect.closeTo(c, 9)));
  });
  it('lays freckles, a brow\'s shape and the details; deep-set eyes\' shade is the face slider\'s number from 0 up', () => {
    const l = faceRigLook({ ...HEAD_DEFAULT, marks: { ...MARKS_NONE, amount: 0.6, shoulders: true }, brows: { colour: null, amount: 1, arch: 0.5 }, detail: { crease: 0.4, smile: 0, philtrum: 0 }, face: { eyeDepth: 0.8 } }, null);
    expect(l.marks).toEqual({ amount: 0.6, size: 0.5, colour: colourLinear(MARK_COLOUR), areas: [1, 1, 0, 1] });
    expect(l.browShape).toEqual({ arch: 0.5, straight: 0, tilt: 0, thick: 0 });
    expect(l.detail).toEqual({ crease: 0.4, socket: 0.8, smile: 0, philtrum: 0 });
    expect(faceRigLook({ ...HEAD_DEFAULT, face: { eyeDepth: -0.5 } }, null).detail).toBeUndefined();
    // none of it for her own head
    const own = faceRigLook(HEAD_DEFAULT, null);
    for (const k of ['marks', 'browShape', 'detail', 'irisInner', 'irisSplit'] as const) expect(own[k]).toBeUndefined();
    expect(faceNeedsDetails(own)).toBe(false);
    expect(faceNeedsDetails(l)).toBe(true);
    // freckles with no area, or none at all, ask for nothing
    expect(faceNeedsDetails(faceRigLook({ ...HEAD_DEFAULT, marks: { ...MARKS_NONE, amount: 0.5, nose: false, cheeks: false } }, null))).toBe(false);
    expect(faceNeedsDetails({ ...STILL, irisSplit: 0.5 })).toBe(false);
    expect(faceNeedsDetails({ ...STILL, irisSplit: 0.7 })).toBe(true);
  });
});

describe('the program with the details', () => {
  for (const spec of [HER_FACE, MALE_FACE]) {
    it(`${spec.frame.id}: is the program it was until a look asks for one, then goes on once`, () => {
      const m = new THREE.MeshStandardMaterial();
      patchFaceRig(m, spec);
      const before = compiled(m), key = m.customProgramCacheKey(), version = m.version;
      setFaceRig(m, { ...STILL, iris: [0.2, 0.3, 0.4], irisInner: [0.5, 0.4, 0.1] });
      expect(faceHasDetails(m)).toBe(false);
      expect(m.version).toBe(version);
      expect(compiled(m).fragmentShader).toBe(before.fragmentShader);
      expect(before.fragmentShader).not.toContain('faceMarksLay');
      setFaceRig(m, { ...STILL, marks: { amount: 0.5, size: 0.5, colour: [0.4, 0.2, 0.1], areas: [1, 1, 0, 0] } });
      expect(faceHasDetails(m)).toBe(true);
      expect(m.version).toBe(version + 1);
      // (three's own key is the hook's text, which the last step changes: the face's part of it ends with the details)
      expect(m.customProgramCacheKey()).toMatch(/\|face-rig-v3(-male)?-details$/);
      expect(m.customProgramCacheKey()).not.toBe(key);
      const after = compiled(m);
      expect(after.vertexShader).toBe(before.vertexShader);
      for (const t of ['vec3 faceMarksLay(', 'vec3 faceDetailLay(', 'float faceBrowShaped(', 'uniform vec4 faceMarks;', 'faceIrisSplit.x - faceIrisSplit.y']) expect(after.fragmentShader, t).toContain(t);
      // with no fabric program on the material, nothing covers her; the placeholder is never left in the text
      expect(after.fragmentShader).not.toContain('FACE_PAINT_COVER');
      expect(after.fragmentShader).toContain('faceMarksLay(vFaceF, facePx, 0.0, diffuseColor.rgb)');
      // later asks change uniforms only
      setFaceRig(m, { ...STILL, detail: { crease: 1, socket: 0, smile: 0.5, philtrum: 0 } });
      setFaceRig(m, null);
      expect(m.version).toBe(version + 1);
    });
  }
  it('tells the freckles where her paint covers her when the fabric\'s program is on the material', () => {
    const m = new THREE.MeshStandardMaterial();
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n    float fabricMatte = 0.0, fabricRoughness = 1.0;'); };
    patchFaceRig(m);
    setFaceRig(m, { ...STILL, marks: { amount: 0.5, size: 0.5, colour: [0.4, 0.2, 0.1], areas: [0, 0, 0, 1] } });
    expect(compiled(m).fragmentShader).toContain('faceMarksLay(vFaceF, facePx, fabricMatte, diffuseColor.rgb)');
  });
  it('sets its uniforms from the setting', () => {
    const m = new THREE.MeshStandardMaterial();
    patchFaceRig(m);
    const u = compiled(m).uniforms;
    setFaceRig(m, { ...STILL, browShape: { arch: 1, straight: 0.5, tilt: -1, thick: 1 }, irisSplit: 1, detail: { crease: 0.2, socket: 0.3, smile: 0.4, philtrum: 0.5 } });
    expect((u.faceBrowShape.value as THREE.Vector4).toArray()).toEqual([FACE_BROW_SHAPE.arch, 0.5, -FACE_BROW_SHAPE.tilt, 1 + FACE_BROW_SHAPE.thick].map((x) => expect.closeTo(x, 9)));
    expect((u.faceIrisSplit.value as THREE.Vector2).toArray()).toEqual([FACE_IRIS_SPLIT.to, FACE_IRIS_SPLIT.soft]);
    expect((u.faceDetail.value as THREE.Vector4).toArray()).toEqual([0.2, 0.3, 0.4, 0.5]);
    expect((u.faceMarks.value as THREE.Vector4).x).toBe(0);
  });
});

describe('the CPU mirrors', () => {
  it('draw her own iris at her own split, and push the ring out with a larger one', () => {
    expect(irisSplitAt(0.5)).toBe(0.5);
    const state = { iris: [0.3, 0.4, 0.2] as const, irisInner: [0.6, 0.4, 0.1] as const };
    // her own split is the shader's old 0.38..0.62
    expect(faceIrisColour(0.38, state)).toEqual([0.6, 0.4, 0.1].map((c) => expect.closeTo(c, 9)));
    expect(faceIrisColour(0.62, state)).toEqual([0.3, 0.4, 0.2].map((c) => expect.closeTo(c, 9)));
    expect(faceIrisColour(0.62, { ...state, irisSplit: 1 })).toEqual([0.6, 0.4, 0.1].map((c) => expect.closeTo(c, 9)));
  });
  it('lift a brow\'s arch, straighten it and tilt it as the shader does; her own shape at 0', () => {
    const arch = FACE_BROWS.arch[0], tail = FACE_BROWS.tail[0], head = FACE_BROWS.head[0];
    const zero = { arch: 0, straight: 0, tilt: 0, thick: 0 };
    for (const x of [head, arch, tail]) expect(faceBrowLine(x, zero).y).toBeCloseTo(faceBrowLine(x).y, 12);
    expect(faceBrowLine(arch, { ...zero, arch: 1 }).y - faceBrowLine(arch).y).toBeCloseTo(FACE_BROW_SHAPE.arch, 9);
    expect(faceBrowLine(head, { ...zero, arch: 1 }).y).toBeCloseTo(faceBrowLine(head).y, 9);
    // straight: on the line from her head to her tail
    const s = faceBrowLine(arch, { ...zero, straight: 1 }).y, line = FACE_BROWS.head[1] + (FACE_BROWS.tail[1] - FACE_BROWS.head[1]) * (arch - head) / (tail - head);
    expect(s).toBeCloseTo(line, 6);
    expect(faceBrowLine(tail, { ...zero, tilt: 1 }).y - faceBrowLine(tail).y).toBeCloseTo(FACE_BROW_SHAPE.tilt, 9);
    expect(faceBrowLine(arch, { ...zero, thick: 1 }).thickness).toBeCloseTo(faceBrowLine(arch).thickness * (1 + FACE_BROW_SHAPE.thick), 9);
  });
});

describe('exporting a character', () => {
  it('takes the picture over her skin with it', () => {
    const book = { version: 1 as const, characters: [{ name: 'Mary', savedAt: '2026-11-22', body: { model: 'v2-body', bump: 0, shape: '', refine: false, random: null, head: { ...HEAD_DEFAULT, overlay: { image: 'aaaaaaaaaaaaaaaa', amount: 1 } } } }], outfits: [] };
    expect(picturesUsed(book as unknown as Parameters<typeof picturesUsed>[0])).toEqual(['aaaaaaaaaaaaaaaa']);
  });
});
