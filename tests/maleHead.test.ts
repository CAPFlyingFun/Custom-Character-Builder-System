// @vitest-environment jsdom
/**
 * HIS HEAD (the male base model; Joshua, 2026-11-21: "Let's work on hair, face, and eye options for the male model now";
 * of men's cuts, hers on him and facial hair: "All sounds good… keep the variety"):
 * - his face is her face's design through a frame fitted to his face (`maleFace.ts`), and the hair toolkit builds on his
 *   head through the same numbers (`scripts/hair/head.mjs` `BODIES.male`);
 * - his face's program is his own; hers has no facial hair in it, and its text is as it was;
 * - his head is a look of its own: a crew cut in a dark brown, clean-shaven; facial hair is kept only when there is some;
 *   a save of his untouched head writes nothing, and reads back as his;
 * - FACIAL HAIR is offered where the face has a design for it, and its chips and lines say what they set.
 */
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FACE_HEAD, HER_FACE, faceGeometryMove, faceRestOf, faceSpecOf, patchFaceRig, setFaceRig } from '../src/sarahlab/faceRig';
import { MALE_FACE, MALE_FACE_FIT } from '../src/sarahlab/maleFace';
import { BODIES, fromRest, toRest } from '../scripts/hair/head.mjs';
import { BEARD_NONE, HEAD_DEFAULT, HEAD_DEFAULT_MALE, headDefault, isDefaultHead, normaliseHead, type HeadLook } from '../src/sarahlab/headLook';
import { faceRigLook } from '../src/sarahlab/faceLook';
import { HAIR_STYLES, MALE_HAIR_STYLES, hairStyle, hairStylesFor } from '../src/sarahlab/hairStyles';
import { HEAD_PANEL_ACTION as A, HEAD_PANEL_FIELD as F, HeadPanel } from '../src/sarahlab/headPanel';

/** A material patched with a face, and the program text it compiles to. */
function program(spec = HER_FACE) {
  const m = new THREE.MeshStandardMaterial();
  patchFaceRig(m, spec);
  const sh = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} as Record<string, THREE.IUniform> };
  m.onBeforeCompile(sh as unknown as THREE.WebGLProgramParametersWithUniforms, null as unknown as THREE.WebGLRenderer);
  return { m, sh, key: m.customProgramCacheKey() };
}

describe('his face\'s frame', () => {
  it('takes his nose\'s tip (MEASURED on his file, not fitted to) to within 2.5 mm of hers', () => {
    const nose = faceRestOf(MALE_FACE.frame, [0.0092, 1.5606, 0.1083]);
    expect(Math.hypot(nose[0] - FACE_HEAD.noseTip[0], nose[1] - FACE_HEAD.noseTip[1], nose[2] - FACE_HEAD.noseTip[2])).toBeLessThan(0.0025);
  });
  it('is the fit taken the other way: her point carried onto him and back is itself', () => {
    const her: [number, number, number] = [0.03, 1.5835, -0.0115], { scale: s, pitch: a, carry: t } = MALE_FACE_FIT;
    const his = [her[0] * s + t[0], s * (Math.cos(a) * her[1] - Math.sin(a) * her[2]) + t[1], s * (Math.sin(a) * her[1] + Math.cos(a) * her[2]) + t[2]];
    const back = faceRestOf(MALE_FACE.frame, his);
    for (let k = 0; k < 3; k++) expect(back[k]).toBeCloseTo(her[k], 9);
    // a move taken into his geometry and back through the frame is the move
    const d = faceGeometryMove(MALE_FACE.frame, [0.001, 0.002, -0.003]), o = faceRestOf(MALE_FACE.frame, [0, 0, 0]), q = faceRestOf(MALE_FACE.frame, d);
    expect(q.map((x, k) => x - o[k])).toEqual([expect.closeTo(0.001, 9), expect.closeTo(0.002, 9), expect.closeTo(-0.003, 9)]);
  });
  it('the hair toolkit reads his head through the same numbers', () => {
    const p = [0.0092, 1.5606, 0.1083];
    const a = toRest(BODIES.male, p), b = faceRestOf(MALE_FACE.frame, p);
    for (let k = 0; k < 3; k++) expect(a[k]).toBeCloseTo(b[k], 9);
    const back = fromRest(BODIES.male, a);
    for (let k = 0; k < 3; k++) expect(back[k]).toBeCloseTo(p[k], 9);
    expect(BODIES.male.bones.head).toBe(MALE_FACE.frame.headBone);
  });
});

describe('his face\'s program', () => {
  it('is his own, with his facial hair in it; hers has none, keeps its key, and is the text it was to the letter', () => {
    const her = program(HER_FACE), his = program(MALE_FACE);
    // (MEASURED 2026-11-21: her program's text before a body's face could be other than hers, and after)
    expect(createHash('sha256').update(`${her.sh.vertexShader}\n----\n${her.sh.fragmentShader}`).digest('hex').slice(0, 16)).toBe('8f3dec1e9183677c');
    expect(her.key.endsWith('|face-rig-v3')).toBe(true);
    expect(his.key.endsWith('|face-rig-v3-male')).toBe(true);
    expect(her.sh.fragmentShader).not.toContain('faceBeard');
    expect(his.sh.fragmentShader).toContain('faceBeardWhere');
    expect(Object.keys(her.sh.uniforms).some((k) => k.startsWith('faceBeard'))).toBe(false);
    expect(faceSpecOf(his.m)).toBe(MALE_FACE);
    // his program turns his points through his frame's pitch
    expect(his.sh.vertexShader).toContain('dot(vec2(');
  });
  it('lays a style\'s numbers on his uniforms, and nothing for none or a face without a design', () => {
    const { m, sh } = program(MALE_FACE), u = sh.uniforms;
    const base = { jaw: 0, gazeRight: [0, 0, 1] as const, gazeLeft: [0, 0, 1] as const, blink: 0 };
    setFaceRig(m, { ...base, beard: { style: 'full', amount: 0.5 } });
    const full = MALE_FACE.beard!.styles.full;
    expect((u.faceBeardArea.value as THREE.Vector4).toArray()).toEqual([full.full, full.mustache, full.chin, full.grow]);
    expect((u.faceBeardHair.value as THREE.Vector4).w).toBeCloseTo(full.density * 0.5, 9);
    expect((u.faceBeardColour.value as THREE.Vector4).w).toBe(0.5);
    setFaceRig(m, { ...base, beard: { style: 'none' } });
    expect((u.faceBeardColour.value as THREE.Vector4).w).toBe(0);
  });
});

describe('his head\'s look', () => {
  it('is a crew cut in a dark brown, clean-shaven, and a save of it writes nothing', async () => {
    expect(HEAD_DEFAULT_MALE.hair).toEqual({ style: 'crew', length: 1, colour: '#3b2a20' });
    expect(HEAD_DEFAULT_MALE.beard).toBeUndefined();
    expect(headDefault(true)).toBe(HEAD_DEFAULT_MALE); expect(headDefault(false)).toBe(HEAD_DEFAULT);
    expect(normaliseHead({}, HEAD_DEFAULT_MALE)).toEqual(HEAD_DEFAULT_MALE);
    expect(isDefaultHead(HEAD_DEFAULT_MALE, HEAD_DEFAULT_MALE)).toBe(true);
    expect(isDefaultHead(HEAD_DEFAULT_MALE)).toBe(false);
    const { headOf, savedHead } = await import('../src/sarahlab/characterSaves');
    expect(savedHead(HEAD_DEFAULT_MALE, true)).toEqual({});
    const body = { model: 'male-base', bump: 0, shape: '', refine: false, random: {} as never };
    expect(headOf(body, true)).toEqual(HEAD_DEFAULT_MALE);
    // his own hair colour picked (null, the toolkit's copper) is kept as chosen, not read back as his brown
    const own = normaliseHead({ ...HEAD_DEFAULT_MALE, hair: { ...HEAD_DEFAULT_MALE.hair, colour: null } }, HEAD_DEFAULT_MALE);
    expect(own.hair.colour).toBeNull();
    expect(headOf({ ...body, ...savedHead(own, true) }, true).hair.colour).toBeNull();
    // her head is as it always was
    expect(normaliseHead({})).toEqual(HEAD_DEFAULT);
  });
  it('keeps facial hair only when there is some, and holds it to what it may be', () => {
    expect('beard' in normaliseHead({ beard: { style: 'none', amount: 1, colour: null } })).toBe(false);
    expect(normaliseHead({ beard: { style: 'goatee', amount: 3, colour: '#AA0000' } }).beard).toEqual({ style: 'goatee', amount: 1, colour: '#aa0000' });
    expect(normaliseHead({ beard: { style: 'NOT ONE!' } }).beard).toBeUndefined();
    const bearded: HeadLook = { ...HEAD_DEFAULT_MALE, beard: { style: 'stubble', colour: null, amount: 0.6 } };
    expect(isDefaultHead(bearded, HEAD_DEFAULT_MALE)).toBe(false);
    expect(BEARD_NONE.style).toBe('none');
  });
  it('his facial hair is drawn in its own colour, else his brows\', else the design\'s own', () => {
    const look: HeadLook = { ...HEAD_DEFAULT_MALE, beard: { style: 'short', colour: null, amount: 0.8 } };
    expect(faceRigLook(look, null).beard).toEqual({ style: 'short', amount: 0.8 });
    expect(faceRigLook(look, '#402010').beard?.colour).toBeDefined();
    expect(faceRigLook({ ...look, beard: { ...look.beard!, colour: '#808080' } }, '#402010').beard?.colour?.[0]).toBeCloseTo(0.2159, 3);
    expect(faceRigLook({ ...look, beard: { ...look.beard!, style: 'none' } }, null).beard).toBeUndefined();
  });
});

describe('his hairstyles', () => {
  it('six men\'s cuts, then her six as he wears them, each a file of his own', () => {
    expect(MALE_HAIR_STYLES.slice(0, 6).map((s) => s.id)).toEqual(['crew', 'buzz', 'side-part', 'slicked-back', 'curly-top', 'man-bun']);
    expect(MALE_HAIR_STYLES.slice(6).map((s) => s.id)).toEqual(HAIR_STYLES.map((s) => s.id));
    for (const s of MALE_HAIR_STYLES) { expect(s.file).toBe(`models/hair/male/${s.id}.glb`); expect(s.lightFile).toBe(`models/hair/male/${s.id}-light.glb`); expect(s.name).not.toMatch(/sarah/i); }
    expect(hairStylesFor(false)).toBe(HAIR_STYLES);
    expect(hairStyle('ponytail')?.file).toBe('models/hair/ponytail.glb');
    expect(hairStyle('ponytail', true)?.file).toBe('models/hair/male/ponytail.glb');
    expect(hairStyle('crew')).toBeUndefined();
  });
});

describe('FACIAL HAIR in the FACE tab', () => {
  const panels: HeadPanel[] = [];
  afterEach(() => { for (const p of panels.splice(0)) p.dispose(); document.body.replaceChildren(); });
  function setup(male: boolean) {
    let look: HeadLook = headDefault(male);
    const change = vi.fn((next: HeadLook) => { look = next; });
    const panel = new HeadPanel({ look: () => look, change, styles: () => hairStylesFor(male), own: () => headDefault(male), male: () => male, beard: () => male });
    panels.push(panel); document.body.appendChild(panel.element); panel.refresh();
    return { root: panel.element, change, look: () => look, panel };
  }
  it('is offered on him and not on her, and its chips set the kind', () => {
    const her = setup(false), section = (r: HTMLElement) => r.querySelector<HTMLElement>('[data-role="sarahlab-head-section-beard"]')!;
    expect(section(her.root).style.display).toBe('none');
    const him = setup(true);
    expect(section(him.root).style.display).not.toBe('none');
    him.root.querySelector<HTMLButtonElement>(`[data-action="${A.beardStyle}goatee"]`)!.click();
    expect(him.look().beard?.style).toBe('goatee');
    expect(him.root.querySelector(`[data-field="${F.beardAmount}"]`)!.textContent).toBe('BEARD · Goatee · 100% thick');
    // his lines say "his"; RESET HEAD gives back his own head
    expect(him.root.querySelector(`[data-field="${F.hairColour}"]`)!.textContent).toContain('custom #3b2a20');
    him.root.querySelector<HTMLButtonElement>(`[data-action="${A.resetHead}"]`)!.click();
    expect(him.look()).toEqual(HEAD_DEFAULT_MALE);
    him.root.querySelector<HTMLButtonElement>(`[data-action="${A.hairColour}own"]`)!.click();
    expect(him.root.querySelector(`[data-field="${F.hairColour}"]`)!.textContent).toBe('HAIR COLOUR · his own');
  });
});
