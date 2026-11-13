import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  attachJiggle, bellyTune, blendLegs, bounceShare, breastTune, createJiggleUniforms, jiggleAt, jiggleOf, kickAt, KICKS, jiggleWeights, legWeight, packLegs, patchJiggle, restingMass, setPush, setPushExtra, shareLegs, stepMass,
  JIGGLE_SOURCES, LEG_RIGHT_OFFSET, PUSH_ATTRIBUTE, UNITS_PER_METRE, type Mass, type MassTune,
} from '../src/sarahlab/softBody';
import { walkSwayAccel, WALK_SWAY_M } from '../src/sarahlab/sarahLabTool';

/** Kick a resting mass and run it for `seconds` at 60 fps; returns every frame's y. */
function ring(tune: MassTune, vy: number, seconds = 1.5): number[] {
  const m: Mass = restingMass(); m.vy = vy;
  const ys: number[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) { stepMass(m, 1 / 60, 0, 0, 0, tune); ys.push(m.y); }
  return ys;
}
const peak = (ys: number[]) => Math.max(...ys.map(Math.abs));
/** Seconds until the swing stays under 10% of its peak. */
function settle(ys: number[]): number {
  const p = peak(ys);
  let last = 0;
  ys.forEach((y, i) => { if (Math.abs(y) > 0.1 * p) last = i; });
  return (last + 1) / 60;
}

describe('soft body: the masses', () => {
  it('a kicked mass comes back to rest, and quickly -- not jelly', () => {
    const ys = ring(bellyTune(100), -0.3);
    expect(Math.abs(ys[ys.length - 1])).toBeLessThan(1e-4);
    expect(settle(ys)).toBeLessThan(0.6);
  });

  it('never leaves its cage, however hard it is thrown', () => {
    const t = bellyTune(100), m = restingMass();
    for (let i = 0; i < 120; i += 1) stepMass(m, 1 / 60, 1e6, -1e6, 1e6, t);
    expect(Math.hypot(m.x, m.y, m.z)).toBeLessThanOrEqual(t.maxM + 1e-9);
  });

  it('ignores a bad frame rather than exploding', () => {
    const m = restingMass();
    stepMass(m, NaN, NaN, Infinity, -Infinity, bellyTune(100));
    expect([m.x, m.y, m.z, m.vx, m.vy, m.vz].every(Number.isFinite)).toBe(true);
  });

  it('no bump, no belly motion', () => {
    expect(bellyTune(0).gain).toBe(0);
  });

  it('a bigger belly is tighter: past full term it swings less and settles sooner', () => {
    const at100 = bellyTune(100), at200 = bellyTune(200);
    expect(at200.hz).toBeGreaterThan(at100.hz);
    expect(peak(ring(at200, -0.3)) * at200.gain).toBeLessThan(peak(ring(at100, -0.3)) * at100.gain);
    expect(settle(ring(at200, -0.3))).toBeLessThanOrEqual(settle(ring(at100, -0.3)));
  });

  it('Firmness: firmer moves less on the skin, for the belly and for the breasts', () => {
    for (const tune of [(f: number) => bellyTune(100, f), (f: number) => breastTune(1.3, 0, f)]) {
      const soft = tune(0), firm = tune(100);
      expect(firm.hz).toBeGreaterThan(soft.hz);
      expect(peak(ring(firm, -0.3)) * firm.gain).toBeLessThan(peak(ring(soft, -0.3)) * soft.gain);
    }
  });

  it('Bounce: scales what shows, never the timing -- 0 still, 100 as tuned, 200 twice', () => {
    for (const tune of [(b: number) => bellyTune(100, 50, 0, b), (b: number) => breastTune(1.3, 0, 50, 'left', b)]) {
      expect(tune(0).gain).toBe(0);
      expect(tune(200).gain).toBeCloseTo(2 * tune(100).gain, 12);
      expect(tune(200).hz).toBe(tune(100).hz);
      expect(tune(200).damping).toBe(tune(100).damping);
    }
    expect(bellyTune(100).gain).toBe(bellyTune(100, 50, 0, 100).gain);
    expect(bounceShare(500)).toBe(2); expect(bounceShare(-5)).toBe(0); expect(bounceShare(NaN)).toBe(1);
  });

  it('more to carry (twins, triplets and their fluid) is slower and more damped; one is as approved', () => {
    expect(bellyTune(100, 50, 0, 100, 1)).toEqual(bellyTune(100));
    const heavy = bellyTune(100, 50, 0, 100, 1.6);
    expect(heavy.hz).toBeLessThan(bellyTune(100).hz); expect(heavy.damping).toBeGreaterThan(bellyTune(100).damping);
    expect(settle(ring(heavy, -0.3))).toBeLessThanOrEqual(settle(ring(bellyTune(100), -0.3)) + 0.1);
  });

  it('milk fills the breast out and firms it', () => {
    const empty = breastTune(1.3, 0), full = breastTune(1.3, 100);
    expect(full.hz).toBeGreaterThan(empty.hz);
    expect(full.gain).toBeLessThan(empty.gain);
  });

  it('the two sides are not quite twins', () => {
    expect(breastTune(1.3, 0, 50, 'right').hz).not.toBe(breastTune(1.3, 0, 50, 'left').hz);
  });
});

describe('soft body: the walk sway', () => {
  it('is one sway a stride, and as big as it says', () => {
    const stride = 1.1, w = (2 * Math.PI) / stride;
    expect(walkSwayAccel(0.25, stride)).toBeCloseTo(-w * w * WALK_SWAY_M, 9);
    expect(walkSwayAccel(0.75, stride)).toBeCloseTo(w * w * WALK_SWAY_M, 9);
    expect(walkSwayAccel(0.3, 0)).toBe(0);
  });
});

/** A strip of four vertices: two on her left, one on the midline, one on her right; the belly morph moves the first. */
function strip(): { geometry: THREE.BufferGeometry; dictionary: Record<string, number> } {
  const g = new THREE.BufferGeometry();
  const x = [0.1, 0.05, 0, -0.1];
  g.setAttribute('position', new THREE.Float32BufferAttribute(x.flatMap((v) => [v, 1, 0]), 3));
  const cm = JIGGLE_SOURCES.metres * UNITS_PER_METRE;
  const belly = new THREE.Float32BufferAttribute([0, cm, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3);
  const breast = new THREE.Float32BufferAttribute([0, 0, 0, 0, cm, 0, 0, cm, 0, 0, cm, 0], 3);
  g.morphAttributes.position = [belly, breast];
  return { geometry: g, dictionary: { [JIGGLE_SOURCES.belly]: 0, [JIGGLE_SOURCES.breast]: 1 } };
}

describe('soft body: the skin', () => {
  it('follows each mass by how far the motion morph moves that point, breasts split at the midline', () => {
    const { geometry, dictionary } = strip();
    const w = jiggleWeights(geometry, dictionary)!;
    expect(w).not.toBeNull();
    expect(w[0]).toBeCloseTo(UNITS_PER_METRE, 4); // 1 cm of morph per 1 cm of mass, in her units
    expect(w[3]).toBe(0);
    expect(w[4]).toBeCloseTo(UNITS_PER_METRE, 4); // well left: all left breast
    expect(w[5]).toBe(0);
    expect(w[7]).toBeCloseTo(w[8], 6); // on the midline, half and half
    expect(w[10]).toBe(0); expect(w[11]).toBeCloseTo(UNITS_PER_METRE, 4);
  });

  it('a mesh with neither motion morph gets nothing', () => {
    const { geometry } = strip();
    expect(jiggleWeights(geometry, { other: 0 })).toBeNull();
  });

  it('the CPU posers read what the shader draws', () => {
    const { geometry, dictionary } = strip();
    const uniforms = createJiggleUniforms();
    uniforms.belly.value.set(0.001, -0.004, 0.002);
    uniforms.breastL.value.set(0, 0.003, 0);
    const weights = jiggleWeights(geometry, dictionary)!, push = new Float32Array(weights.length);
    const j = { weights, uniforms, push }, out = { x: 0, y: 0, z: 0 };
    jiggleAt(j, 0, out);
    expect(out.y).toBeCloseTo(-0.004 * UNITS_PER_METRE, 6);
    jiggleAt(j, 1, out);
    expect(out.y).toBeCloseTo(0.003 * UNITS_PER_METRE, 6);
    // and the belly's push for the baby, added as it is
    push[1] = 0.02; jiggleAt(j, 0, out);
    expect(out.y).toBeCloseTo(0.02 - 0.004 * UNITS_PER_METRE, 6);
  });

  it('a kick moves her belly out round its point, as far as it says, and the CPU posers read the same', () => {
    const { geometry, dictionary } = strip();
    const uniforms = createJiggleUniforms(), weights = jiggleWeights(geometry, dictionary)!, j = { weights, uniforms, push: new Float32Array(weights.length) }, out = { x: 0, y: 0, z: 0 };
    // her geometry is her rest frame here; a kick 2 cm out at the first vertex, straight forward
    uniforms.kickAt.value[0].set(0.1, 1, 0, 0.02); uniforms.kickDir.value[0].set(0, 0, 1, 0.03);
    jiggleAt(j, 0, out, 0.1, 1, 0);
    expect(out.z).toBeCloseTo(0.02 * Math.min(1, weights[0] * 0.9), 9);
    // further away, less; off her belly (no belly weight), nothing
    jiggleAt(j, 0, out, 0.13, 1, 0); expect(out.z).toBeLessThan(0.02 * 0.5);
    jiggleAt(j, 1, out, 0.05, 1, 0); expect(out.z).toBe(0);
    expect(kickAt(uniforms, 1, 0.1, 1, 0, new THREE.Vector3()).z).toBeCloseTo(0.02 * 0.9, 9);
    uniforms.kickAt.value[0].w = 0; jiggleAt(j, 0, out, 0.1, 1, 0); expect(out.z).toBe(0);
  });

  it('a second push lies over the first (her skin behind her opening, carried out with it): added to it, kept when the first is laid again, taken off exactly', () => {
    const { geometry, dictionary } = strip(), mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.morphTargetDictionary = dictionary;
    expect(attachJiggle(mesh, createJiggleUniforms())).toBe(true);
    const j = jiggleOf(mesh)!, attr = geometry.getAttribute(PUSH_ATTRIBUTE) as THREE.BufferAttribute, belly = new Float32Array(12);
    belly[0] = 0.5; belly[4] = 0.25;
    setPush(mesh, belly);
    const v0 = attr.version;
    // (vertices 1 and 3: over her belly's push at 1, where there is none at 3)
    expect(setPushExtra(mesh, [1, 3], [0, 0.1, 0, 0.2, 0, 0])).toBe(true);
    expect(attr.version).toBeGreaterThan(v0);
    expect(Array.from(j.push)).toEqual([0.5, 0, 0, 0, 0.35, 0, 0, 0, 0, 0.2, 0, 0].map((x) => Math.fround(x)));
    // (her belly's push laid again, changed: the second is still on it)
    belly[4] = 0.5; setPush(mesh, belly);
    expect(j.push[4]).toBeCloseTo(0.6, 6); expect(j.push[9]).toBeCloseTo(0.2, 6);
    // (laid again elsewhere: off where it was, on where it is)
    setPushExtra(mesh, [2], [0, 0, 0.3]);
    expect(j.push[4]).toBeCloseTo(0.5, 6); expect(j.push[9]).toBe(0); expect(j.push[8]).toBeCloseTo(0.3, 6);
    // (and taken off: her belly's push as it is, to the last bit; her belly's cleared, nothing is left)
    setPushExtra(mesh, null, null);
    expect(Array.from(j.push)).toEqual(Array.from(belly));
    setPush(mesh, null);
    expect(j.push.every((x) => x === 0)).toBe(true);
    // (a mesh with no jiggle has no push to lay it on)
    expect(setPushExtra(new THREE.Mesh(new THREE.BufferGeometry()), [0], [0, 0, 0])).toBe(false);
  });

  it('the push is its own attribute, added before skinning with the jiggle', () => {
    const material = new THREE.MeshStandardMaterial(), uniforms = createJiggleUniforms();
    patchJiggle(material, uniforms);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <common>\nvoid main(){\n#include <morphtarget_vertex>\n#include <skinning_vertex>\n}', fragmentShader: '' };
    material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain('attribute vec3 babyPush;');
    expect(shader.vertexShader).toContain('transformed += babyPush');
  });

  it('the shader adds it after the morphs and before skinning, once, with its own program key', () => {
    const material = new THREE.MeshStandardMaterial(), uniforms = createJiggleUniforms();
    patchJiggle(material, uniforms);
    patchJiggle(material, uniforms);
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: '#include <common>\nvoid main(){\n#include <morphtarget_vertex>\n#include <skinning_vertex>\n}',
      fragmentShader: '',
    };
    material.onBeforeCompile(shader as never, undefined as never);
    const v = shader.vertexShader;
    expect(v.match(/attribute vec3 jiggle/g)?.length).toBe(1);
    expect(v.indexOf('transformed += babyPush + kickMove + jiggle.x')).toBeGreaterThan(v.indexOf('#include <morphtarget_vertex>'));
    expect(v.indexOf('transformed += babyPush + kickMove + jiggle.x')).toBeLessThan(v.indexOf('#include <skinning_vertex>'));
    expect(shader.uniforms.uKickAt).toBe(uniforms.kickAt); expect(v).toContain(`uniform vec4 uKickAt[${KICKS}]`);
    expect(shader.uniforms.uJiggleBelly).toBe(uniforms.belly);
    expect(material.customProgramCacheKey()).toContain('jiggle');
  });
});

describe('soft body: her legs\' weights, packed in the breasts\' channels', () => {
  /** three of her vertices: her left leg's (thigh 0.3, calf 0.05), her right leg's (thigh 0.4), and one that is no leg's */
  const hers = () => { const w = new Float32Array(3 * 3); packLegs(w, new Float32Array([0.3, 0.05, -0.4, 0, 0, 0])); return w; };
  const springs = () => { const u = createJiggleUniforms(); u.thighL.value.set(0.004, -0.002, 0.001); u.thighR.value.set(-0.003, 0.001, 0.006); u.calfL.value.set(0, 0.002, 0); return u; };

  it('read back as they were packed: her left leg\'s above 0, her right leg\'s below, and 0 for what is no leg\'s', () => {
    const w = hers();
    expect(legWeight(w[1])).toBeCloseTo(0.3, 6); expect(legWeight(w[2])).toBeCloseTo(0.05, 6);
    expect(w[4]).toBeCloseTo(-(0.4 + LEG_RIGHT_OFFSET), 5);
    expect(legWeight(w[4])).toBeCloseTo(-0.4, 6); expect(legWeight(w[5])).toBe(0); // (her right leg's, with no calf's weight)
    expect(legWeight(w[7])).toBe(0); expect(legWeight(0.6)).toBe(0); // none, and a breast's own
  });

  it('a point lying on one of her vertices carries that vertex\'s weights exactly, and her springs move the two as one', () => {
    const w = hers(), out = new Float32Array(2 * 3);
    blendLegs(out, w, [0, 1, 2, 1, 2, 0], [1, 0, 0, 1, 0, 0], 2);
    expect(Array.from(out)).toEqual(Array.from(w.slice(0, 6)));
    const u = springs(), a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 };
    for (const v of [0, 1]) {
      jiggleAt({ weights: w, uniforms: u, push: new Float32Array(9) }, v, a); jiggleAt({ weights: out, uniforms: u, push: new Float32Array(6) }, v, b);
      expect(Math.hypot(a.x, a.y, a.z)).toBeGreaterThan(1e-4);
      expect(b).toEqual(a);
    }
  });

  it('a point inside one of her triangles moves as her skin is drawn there -- which a blend of the packed numbers does not', () => {
    // her right leg: three vertices with thigh weights 0.4, 0.2 and none
    const w = new Float32Array(3 * 3); packLegs(w, new Float32Array([-0.4, 0, -0.2, 0, 0, 0]));
    const bary = [0.5, 0.3, 0.2], out = new Float32Array(3);
    blendLegs(out, w, [0, 1, 2], bary, 1);
    expect(legWeight(out[1])).toBeCloseTo(-(0.5 * 0.4 + 0.3 * 0.2), 6);
    const u = springs(), at = { x: 0, y: 0, z: 0 }, one = { x: 0, y: 0, z: 0 }, drawn = { x: 0, y: 0, z: 0 };
    for (let k = 0; k < 3; k++) { jiggleAt({ weights: w, uniforms: u, push: new Float32Array(9) }, k, one); drawn.x += bary[k] * one.x; drawn.y += bary[k] * one.y; drawn.z += bary[k] * one.z; }
    jiggleAt({ weights: out, uniforms: u, push: new Float32Array(3) }, 0, at);
    expect(at.x).toBeCloseTo(drawn.x, 7); expect(at.y).toBeCloseTo(drawn.y, 7); expect(at.z).toBeCloseTo(drawn.z, 7);
    // (the packed numbers blended: 8.26 of her LEFT thigh's spring)
    expect(legWeight(bary[0] * w[1] + bary[1] * w[4] + bary[2] * w[7])).toBeGreaterThan(8);
  });

  it('a point carries one leg\'s: across her middle, the leg with more of it', () => {
    const w = hers(), out = new Float32Array(2 * 3);
    blendLegs(out, w, [0, 1, 2, 0, 1, 2], [0.5, 0.3, 0.2, 0.2, 0.7, 0.1], 2);
    expect(legWeight(out[1])).toBeCloseTo(0.5 * 0.3, 6); expect(legWeight(out[2])).toBeCloseTo(0.5 * 0.05, 6); // her left
    expect(legWeight(out[4])).toBeCloseTo(-0.7 * 0.4, 6); expect(legWeight(out[5])).toBe(0); // her right
  });

  it('a point with no leg\'s weight keeps what it had', () => {
    const w = hers(), out = new Float32Array(3); out[1] = 0.7; // (a breast's own weight)
    blendLegs(out, w, [2, 2, 2], [1, 0, 0], 1);
    expect(out[1]).toBeCloseTo(0.7, 6); expect(out[2]).toBe(0);
  });

  it('her legs\' weights taken a share of, a vertex at a time, and packed again: a copy, her breasts\' own left as they are', () => {
    const w = hers(); w[7] = 0.7; // (her third vertex: a breast's own weight)
    const eased = shareLegs(w, [0.25, 0.5, 0.25]);
    expect(legWeight(eased[1])).toBeCloseTo(0.25 * 0.3, 6); expect(legWeight(eased[2])).toBeCloseTo(0.25 * 0.05, 6);
    expect(legWeight(eased[4])).toBeCloseTo(-0.5 * 0.4, 6); expect(legWeight(eased[5])).toBe(0);
    expect(eased[7]).toBeCloseTo(0.7, 6);
    // all of them: hers to the number; none of them: no leg's weight left
    expect(Array.from(shareLegs(w, [1, 1, 1]))).toEqual(Array.from(w));
    const none = shareLegs(w, [0, 0, 0]);
    for (const k of [1, 2, 4, 5]) expect(none[k]).toBe(0);
    expect(none[7]).toBeCloseTo(0.7, 6);
    expect(legWeight(w[1])).toBeCloseTo(0.3, 6); expect(legWeight(w[4])).toBeCloseTo(-0.4, 6);
  });
});
