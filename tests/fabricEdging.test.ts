/**
 * A DRAWN TOP'S EDGING (Joshua, 2026-11-14: "for the collars and sleeve bands, are those colors also adjustable? So
 * for example can pick a solid pink shirt with solid red color edging if I wanted (if I don't pick a texture)?").
 *
 * A drawn top (`topCut.ts`) is one paint layer; its bands -- its collar and its sleeve bands or cuffs -- are
 * drawn inside its cut's line by the shader (`fabricMaterial.ts`). They are the top's own fabric a touch darker while
 * its fabric's trim MATCHES (as every look saved before this has it), or ONE COLOUR OF THEIR OWN: the trim's, laid on
 * the top's own knit, or flat when the trim is picked from the FLAT family (`fabricLibrary.edgingOf`).
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_CHOICE, SWATCH_HEX, edgingOf, pickHex, type FabricChoice } from '../src/sarahlab/fabricLibrary';
import { hexToLinear } from '../src/sarahlab/fabricTint';
import { setFabricLayer } from '../src/sarahlab/fabricMaterial';
import { OUTFITS, SHEET_TOPS } from '../src/sarahlab/sarahLabTool';
import { COVERAGE_TEMPLATES } from '../src/sarahlab/paintTemplates';
import { isCutTop } from '../src/sarahlab/topCut';

const light = (rgb: readonly number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

describe('a drawn top\'s edging, from its fabric\'s trim', () => {
  const pink = { family: 'jersey' as const, colour: 0, tint: '#f06a9a' }, red = { family: 'jersey' as const, colour: 8 };

  it('is none while the trim matches: a look saved before edgings wears its bands as it did', () => {
    expect(edgingOf({ ...DEFAULT_CHOICE, fabric: pink })).toBeNull();
    // (a trim kept from before MATCH was switched back on is not worn)
    expect(edgingOf({ ...DEFAULT_CHOICE, fabric: pink, trim: red, match: true })).toBeNull();
    // and with no fabric there is nothing to edge
    expect(edgingOf({ ...DEFAULT_CHOICE, fabric: null, trim: red, match: false })).toBeNull();
  });

  it('is the trim\'s colour in linear light, laid on the top\'s own knit: a pink shirt with a red edging', () => {
    const e = edgingOf({ ...DEFAULT_CHOICE, fabric: pink, trim: red, match: false })!;
    expect(e.colour).toEqual(hexToLinear(SWATCH_HEX.jersey[8]));
    // one over the shirt's own average light: a pixel of its knit as light as that average is drawn the edging's
    // colour exactly, a lighter or darker thread of it that much lighter or darker
    expect(e.knit).toBeCloseTo(1 / light(hexToLinear('#f06a9a')), 9);
    // a custom colour is the colour picked
    expect(edgingOf({ ...DEFAULT_CHOICE, fabric: pink, trim: { family: 'jersey', colour: 0, tint: '#12ab56' }, match: false })!.colour).toEqual(hexToLinear('#12ab56'));
    expect(pickHex({ family: 'athletic', colour: 13 })).toBe(SWATCH_HEX.athletic[13]);
    expect(pickHex({ family: 'athletic', colour: 0, tint: '#abcdef' })).toBe('#abcdef');
  });

  it('is a flat colour from the FLAT family, whatever the top is knitted in', () => {
    const e = edgingOf({ ...DEFAULT_CHOICE, fabric: pink, trim: { family: 'flat', colour: 8 }, match: false })!;
    expect(e.knit).toBe(0);
    expect(e.colour).toEqual(hexToLinear(SWATCH_HEX.flat[8]));
  });

  it('keeps a knit to lay it on even in the pack\'s black', () => {
    const e = edgingOf({ ...DEFAULT_CHOICE, fabric: { family: 'jersey', colour: 4 }, trim: red, match: false })!;
    expect(Number.isFinite(e.knit)).toBe(true);
    expect(e.knit).toBeGreaterThan(1);
    expect(e.knit).toBeLessThanOrEqual(500);
  });
});

/** The shader as three compiles it for a painted body, from a stub of its standard chunks. */
function compiled(material: THREE.Material): { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string } {
  const shader = {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>',
    fragmentShader: '#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>\n#include <map_fragment>',
  };
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return shader;
}
function skin(): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  const material = new THREE.MeshStandardMaterial();
  return { mesh: new THREE.Mesh(g, material), material };
}

describe('a drawn top\'s edging, in the shader', () => {
  const texture = new THREE.Texture(), layer = { texture, tile: 1, opacity: 1 };
  const band = [0.0178, 0.02, 0.0222] as const;

  it('lands in the uniform its layer\'s bands read: the colour and the knit\'s share, or none', () => {
    const { mesh, material } = skin(), opts = { layers: 3, masked: true, rest: null } as const;
    setFabricLayer(mesh, material, 1, { ...layer, cut: { band, shade: 0.1, edging: { colour: [0.6, 0.02, 0.01], knit: 2.5 } } }, opts);
    setFabricLayer(mesh, material, 2, { ...layer, cut: { band, shade: 0.1 } }, opts);
    const u = compiled(material).uniforms;
    expect((u.fabricCutEdge1.value as THREE.Vector4).toArray()).toEqual([0.6, 0.02, 0.01, 2.5].map((x) => expect.closeTo(x, 6)));
    expect((u.fabricCutBand1.value as THREE.Vector4).toArray()).toEqual([...band, 0.1].map((x) => expect.closeTo(x, 6)));
    // none: w under 0, and the bands are shaded as they were
    expect((u.fabricCutEdge2.value as THREE.Vector4).w).toBe(-1);
    // a flat edging: w exactly 0
    setFabricLayer(mesh, material, 1, { ...layer, cut: { band, shade: 0.1, edging: { colour: [0.6, 0.02, 0.01], knit: 0 } } }, opts);
    expect((u.fabricCutEdge1.value as THREE.Vector4).w).toBe(0);
    // taken off again with the edging: back to none
    setFabricLayer(mesh, material, 1, { ...layer, cut: { band, shade: 0.1, edging: null } }, opts);
    expect((u.fabricCutEdge1.value as THREE.Vector4).w).toBe(-1);
  });

  it('draws a band in it in place of the darker shade, on her skin and on her cleavage bridge\'s sheet alike', () => {
    const body = skin(), sheet = skin();
    setFabricLayer(body.mesh, body.material, 0, { ...layer, cut: { band, shade: 0.1 } }, { layers: 3, masked: true, rest: null });
    setFabricLayer(sheet.mesh, sheet.material, 0, { ...layer, cut: { band, shade: 0.1 } }, { layers: 1, masked: false, rest: null, cut: true });
    for (const [name, m, layers] of [['her skin', body.material, 3], ['the sheet', sheet.material, 1]] as const) {
      const f = compiled(m).fragmentShader;
      for (let i = 0; i < layers; i++) {
        expect(f, `${name}, layer ${i}`).toContain(`uniform vec4 fabricCutEdge${i};`);
        // the edging's colour, by the pixel's light over the fabric's average (held to a range), or flat
        expect(f, `${name}, layer ${i}`).toContain(`if (fabricCutEdge${i}.w >= 0.0) fc = mix(fc, fabricCutEdge${i}.rgb * (fabricCutEdge${i}.w > 0.0 ? clamp(dot(fc, vec3(0.2126, 0.7152, 0.0722)) * fabricCutEdge${i}.w, 0.45, 1.75) : 1.0), fi);`);
        // ...else the shade it always had
        expect(f, `${name}, layer ${i}`).toContain(`else fc *= 1.0 - fabricCutBand${i}.w * fi;`);
      }
      // (a layer is cut by the drawings alone: nothing takes its line in)
      expect(f).not.toContain('fabricCutInset');
    }
  });
});

describe('the room\'s own ringer', () => {
  it('is one drawn top in his cream with his navy for its edging, and no layer of bands', () => {
    const ringer = OUTFITS.find((o) => o.name === 'painted ringer tee + leggings')!;
    expect(ringer.paint!.map((l) => l.template)).toEqual(['leggingsFull', 'teeRinger']);
    const tee = ringer.paint![1], t = COVERAGE_TEMPLATES.find((x) => x.id === 'teeRinger')!;
    expect(isCutTop(t.params)).toBe(true);
    expect(tee.edging).toEqual({ family: 'jersey', colour: 0, tint: '#1b2246' });
    const choice: FabricChoice = { ...DEFAULT_CHOICE, fabric: tee.fabric, match: false, trim: tee.edging! };
    expect(edgingOf(choice)!.colour).toEqual(hexToLinear('#1b2246'));
    expect(COVERAGE_TEMPLATES.some((x) => x.id === 'teeRingerEdge')).toBe(false);
    // no other built-in top has an edging of its own -- they wear their bands as they did -- but the raglan, whose
    // sleeves, shoulders and neckband ARE its edging (his maroon on his heather grey: `topDetails.ts`, 2026-11-15)
    const raglan = OUTFITS.find((o) => o.name === 'painted raglan tee + leggings')!;
    expect(raglan.paint![1].edging).toEqual({ family: 'jersey', colour: 0, tint: SHEET_TOPS.maroon });
    for (const o of OUTFITS) for (const l of o.paint ?? []) if (o !== ringer && o !== raglan) expect(l.edging, o.name).toBeUndefined();
  });
});
