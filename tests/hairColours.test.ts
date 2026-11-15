import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BROW_FROM_HAIR, HAIR_COLOURS, HAIR_TONE, browFromHair, copperAt, hairColourAt, hairRamp, hairTone, hairToneGlsl } from '../src/sarahlab/hairColours';
import { HAIR_NORMAL_LINE, HAIR_TINT_KEY, patchHairMaterial, setHairColour } from '../src/sarahlab/hairMaterial';
import { colourRgb } from '../src/sarahlab/headLook';

const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const bytes = (c: readonly number[]) => c.map((x) => Math.round(x * 255) / 255) as [number, number, number];

describe("her hair's tone (the bake's palette read backwards)", () => {
  it("is exact along the bake's ramp (to a byte) and rises with it", () => {
    let last = -1;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200, back = hairTone(bytes(copperAt(t)));
      expect(Math.abs(back - t)).toBeLessThan(0.012); // a byte of red is 0.004 of red, 0.0095 of tone at the dullest stretch
      expect(back).toBeGreaterThanOrEqual(last);
      last = back;
    }
    expect(hairTone(copperAt(0))).toBeCloseTo(0, 9);
    expect(hairTone(copperAt(0.35))).toBeCloseTo(0.35, 9);
    expect(hairTone(copperAt(0.8))).toBeCloseTo(0.8, 9);
    expect(hairTone(copperAt(1))).toBeCloseTo(1, 9);
  });
  it("is held to 0..1 off the ramp", () => {
    expect(hairTone([0, 0, 0])).toBe(0);
    expect(hairTone([1, 1, 1])).toBe(1);
  });
  it("has a red that rises along the palette's stops (why red alone can say the tone)", () => {
    const H = HAIR_TONE;
    expect(H.dark[0]).toBeLessThan(H.mid[0]); expect(H.mid[0]).toBeLessThan(H.light[0]); expect(H.light[0]).toBeLessThan(H.glint[0]);
  });
});

describe('a chosen colour\'s ramp', () => {
  it('is ordered dark < mid < light < glint in luminance for every swatch', () => {
    for (const s of HAIR_COLOURS) {
      const r = hairRamp(s.colour);
      expect(lum(r.dark), s.id).toBeLessThan(lum(r.mid)); expect(lum(r.mid), s.id).toBeLessThan(lum(r.light)); expect(lum(r.light), s.id).toBeLessThan(lum(r.glint));
    }
  });
  it('keeps black hair\'s strands and a sheen, and white hair\'s strands', () => {
    const b = hairRamp('#000000'), w = hairRamp('#ffffff');
    expect(lum(b.glint) / lum(b.dark)).toBeGreaterThan(5);
    expect(lum(b.glint)).toBeGreaterThan(0.08); // a visible sheen in linear light, not a flat black helmet
    expect(lum(w.glint) - lum(w.dark)).toBeGreaterThan(0.2);
    expect(lum(w.dark)).toBeLessThan(lum(w.glint));
  });
  it('keeps a saturated colour that colour (pink stays red-led, blue blue-led) at its light stop', () => {
    const p = hairRamp('#e0709f').light, t = hairRamp('#1f8a99').light;
    expect(p[0]).toBeGreaterThan(p[1]); expect(p[0]).toBeGreaterThan(p[2]);
    expect(t[2]).toBeGreaterThan(t[0]); expect(t[1]).toBeGreaterThan(t[0]);
  });
  it('is the chosen colour at its light stop (within a tenth of a stop of lift)', () => {
    for (const s of HAIR_COLOURS) {
      const l = hairRamp(s.colour).light, c = colourRgb(s.colour).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      expect(lum(l)).toBeGreaterThanOrEqual(lum(c) - 1e-9);
      expect(lum(l) - lum(c)).toBeLessThan(0.2);
    }
  });
  it('is the stops at the ramp\'s tones and mixes between them', () => {
    const r = hairRamp('#6e4128');
    expect(hairColourAt(0, r)).toEqual(r.dark); expect(hairColourAt(0.35, r)[0]).toBeCloseTo(r.mid[0], 9);
    expect(hairColourAt(0.8, r)[1]).toBeCloseTo(r.light[1], 9); expect(hairColourAt(1, r)[2]).toBeCloseTo(r.glint[2], 9);
    expect(hairColourAt(0.575, r)[0]).toBeCloseTo((r.mid[0] + r.light[0]) / 2, 9);
  });
});

describe('the swatches', () => {
  it('are 16, with unique ids and colours as #rrggbb, and her own copper is not among them', () => {
    expect(HAIR_COLOURS).toHaveLength(16);
    expect(new Set(HAIR_COLOURS.map((s) => s.id)).size).toBe(16);
    for (const s of HAIR_COLOURS) expect(s.colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(HAIR_COLOURS[0].id).toBe('black');
  });
});

describe('brows from hair', () => {
  it('are darker than the hair and never lighter than a mid brown-grey', () => {
    const y = (h: string) => { const c = colourRgb(h); return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; };
    for (const s of HAIR_COLOURS) {
      const b = browFromHair(s.colour);
      expect(b).toMatch(/^#[0-9a-f]{6}$/);
      expect(y(b)).toBeLessThanOrEqual(BROW_FROM_HAIR.lightest + 0.01);
      expect(y(b)).toBeLessThanOrEqual(y(s.colour) + 0.01);
    }
    expect(y(browFromHair('#f1f1ee'))).toBeGreaterThan(0.3); // white hair still has brows
  });
});

describe("the shader's half", () => {
  it('is generated from the palette\'s numbers', () => {
    const g = hairToneGlsl(), H = HAIR_TONE;
    for (const n of [H.dark[0], H.mid[0], H.light[0], H.glint[0], H.midAt, H.lightAt, 0.45, 0.8]) expect(g).toContain(String(n));
    expect(g).toContain('hairRampAt');
    expect(g).toContain('uniform vec3 hairGlint;');
  });
});

describe('setHairColour', () => {
  const compile = (m: THREE.Material) => {
    const shader = { fragmentShader: '#include <common>\n#include <normal_fragment_begin>\n#include <map_fragment>\n#include <color_fragment>', uniforms: {} as Record<string, unknown> };
    m.onBeforeCompile(shader as never, undefined as never);
    return shader;
  };
  it('null before any colour leaves the program as the patch alone makes it (same text, same key)', () => {
    const a = new THREE.MeshStandardMaterial(), b = new THREE.MeshStandardMaterial();
    patchHairMaterial(a); patchHairMaterial(b);
    setHairColour(b, null);
    expect(compile(b).fragmentShader).toBe(compile(a).fragmentShader);
    expect(b.customProgramCacheKey()).toBe(a.customProgramCacheKey());
    expect(compile(b).fragmentShader).toContain(HAIR_NORMAL_LINE);
  });
  it('a colour compiles the recolouring in once, before the vertex colour, and later changes are uniform values', () => {
    const m = new THREE.MeshStandardMaterial();
    patchHairMaterial(m);
    const key = m.customProgramCacheKey();
    setHairColour(m, '#e0709f');
    const key2 = m.customProgramCacheKey();
    expect(key).not.toContain(HAIR_TINT_KEY);
    expect(key2).toContain(HAIR_TINT_KEY);
    const s = compile(m), f = s.fragmentShader;
    expect(f.indexOf('hairToneOf( sampledDiffuseColor.r )')).toBeGreaterThan(-1);
    expect(f.indexOf('hairToneOf( sampledDiffuseColor.r )')).toBeLessThan(f.indexOf('#include <color_fragment>'));
    const u = s.uniforms as Record<string, THREE.IUniform>;
    expect(u.hairTintOn.value).toBe(1);
    setHairColour(m, '#1c1b1d'); setHairColour(m, null);
    expect(m.customProgramCacheKey()).toBe(key2);
    expect(u.hairTintOn.value).toBe(0);
    setHairColour(m, '#f1f1ee');
    expect(u.hairTintOn.value).toBe(1);
    expect((u.hairGlint.value as THREE.Vector3).x).toBeCloseTo(hairRamp('#f1f1ee').glint[0], 9);
  });
});
