/**
 * THE DETAILS DRAWN ON A PAINTED TOP (`topDetails.ts`; Joshua's sheet of sixteen tops, 2026-11-14: his 08 raglan, 09
 * henley, 10 polo, 15 wrap, 16 button-up): on her own rest skin (the room's body file), each detail is the measure it
 * is given, round where it is round, even where it repeats, mirrored where the garment is, and nowhere outside the
 * garment; and the shader is given the same table, with not a character of its program changed for a layer without.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { cutAt, neckDefault, topCut, topCutSpec, topFrame, type TopCut, type TopFrame } from '../src/sarahlab/topCut';
import { DETAIL_LOOK, TOP_DETAIL_STYLES, detailOf, topDetailAt, topDetailGlsl, topDetailSpec, type TopDetailParams, type TopDetailSpec } from '../src/sarahlab/topDetails';
import { setFabricLayer } from '../src/sarahlab/fabricMaterial';
import { readBody } from '../scripts/sarahV2SideLock.mjs';

const MM = 0.001;

describe('a top\'s details on her own rest skin (the room\'s body file)', () => {
  let rest: Float64Array, arm: Float32Array, frame: TopFrame;
  beforeAll(async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read('public/models/sarah-v2-body-slim.glb'), body = readBody(doc);
    rest = body.skin.rest;
    const skin = doc.getRoot().listSkins()[0], at = (name: string) => { const j = skin.listJoints().find((x) => x.getName() === name); if (!j) throw new Error(`no joint ${name}`); return j.getWorldTranslation() as [number, number, number]; };
    const n = rest.length / 3;
    arm = new Float32Array(n);
    for (let v = 0; v < n; v++) { let best = 0; for (let k = 1; k < 4; k++) if (body.skin.weights[v * 4 + k] > body.skin.weights[v * 4 + best]) best = k; arm[v] = body.isArm[body.skin.joints[v * 4 + best]]; }
    frame = topFrame({ rest, index: body.skin.index, unitsPerMetre: 1, joints: { neck: at('Bone_017'), hipL: at('Bone_014'), hipR: at('Bone_009'), shoulderL: at('Bone_026'), elbowL: at('Bone_025'), wristL: at('Bone_024'), shoulderR: at('Bone_021'), elbowR: at('Bone_020'), wristR: at('Bone_019') } });
  }, 60_000);

  const dressed = (name: keyof typeof TOP_DETAIL_STYLES, over: Partial<TopDetailParams> = {}): { cut: TopCut; detail: TopDetailSpec } => {
    const s = TOP_DETAIL_STYLES[name];
    const spec = topCutSpec({ neckFront: s.neckFront ?? neckDefault(s.neckStyle, frame), neckStyle: s.neckStyle, sleeve: s.sleeve, band: s.band }, frame, -0.1);
    return { cut: topCut(spec, frame), detail: topDetailSpec({ ...s.detail, ...over }, spec, frame) };
  };
  /** Her skin's front (or back) depth near a place seen from her front: the outermost of her points within 2 cm. */
  const skinZ = (x: number, y: number, front: boolean) => {
    let z = front ? -Infinity : Infinity;
    for (let v = 0; v < rest.length / 3; v++) {
      if (Math.hypot(rest[v * 3] - x, rest[v * 3 + 1] - y) > 0.02) continue;
      z = front ? Math.max(z, rest[v * 3 + 2]) : Math.min(z, rest[v * 3 + 2]);
    }
    return z;
  };
  /** Where along a row (x from a to b, 0.1 mm a step) a value crosses one half, both ways. */
  const crossings = (f: (x: number) => number, a: number, b: number) => {
    const out: number[] = [];
    let last = f(a);
    for (let x = a + 0.0001; x <= b; x += 0.0001) { const v = f(x); if ((v - 0.5) * (last - 0.5) < 0) out.push(x - 0.00005); last = v; }
    return out;
  };

  it('a placket is its width all the way down, on her middle (the henley\'s, 26 mm)', () => {
    // (laid in the edging colour, which is the placket's whole width and nothing else)
    const { cut, detail } = dressed('henley', { placket: { length: 0.09, width: 0.026, edging: true }, buttons: null });
    const top = detail.pack[1], bottom = detail.pack[2];
    expect((top - bottom) / MM).toBeCloseTo(100, 0); // (it starts 1 cm up under the rim: its top is in the opening)
    for (let y = bottom + 0.004; y < cut.spec.dipY - 0.003; y += 0.005) {
      const z = skinZ(frame.mid, y, true), xs = crossings((x) => topDetailAt(detail, cut, x, y, z, 0).edging, frame.mid - 0.03, frame.mid + 0.03);
      expect(xs.length, `at ${y}`).toBe(2);
      expect(Math.abs(xs[1] - xs[0] - 0.026) / MM, `width at ${y}`).toBeLessThan(0.3);
      expect(Math.abs((xs[0] + xs[1]) / 2 - frame.mid) / MM, `middle at ${y}`).toBeLessThan(0.3);
    }
  });

  it('a button-up\'s placket runs from its collar to its hem', () => {
    const { cut, detail } = dressed('buttonUp');
    expect(detail.pack[1]).toBeGreaterThan(cut.spec.dipY);
    expect((detail.pack[2] - cut.spec.hemY) / MM).toBeCloseTo(4, 3);
  });

  it('buttons are round and evenly spaced (the henley\'s three, the button-up\'s down to its hem)', () => {
    for (const name of ['henley', 'polo', 'buttonUp'] as const) {
      const { cut, detail } = dressed(name), P = detail.pack, n = P[4], r = P[7];
      const centres: number[] = [];
      // down her middle: each button's run of disc
      const zs = new Map<number, number>(), zAt = (y: number) => { const k = Math.round(y / 0.004); if (!zs.has(k)) zs.set(k, skinZ(frame.mid, k * 0.004, true)); return zs.get(k)!; };
      const along = crossings((y) => topDetailAt(detail, cut, frame.mid + r * 0.6, y, zAt(y), 0).button > 0.5 ? 1 : 0, P[6] - 2 * r, P[5] + 2 * r);
      expect(along.length, name).toBe(2 * n);
      for (let k = 0; k < n; k++) {
        const lo = along[2 * k], hi = along[2 * k + 1], cy = (lo + hi) / 2;
        centres.push(cy);
        const z = skinZ(frame.mid, cy, true);
        // across it and along it through its middle (its holes left out: the disc's own edge)
        const across = crossings((x) => { const d = topDetailAt(detail, cut, x, cy + r * 0.6, z, 0); return d.button > 0.5 || (Math.hypot(x - frame.mid, r * 0.6) < r * 0.9) ? 1 : 0; }, frame.mid - 2 * r, frame.mid + 2 * r);
        const vert = crossings((y) => { const d = topDetailAt(detail, cut, frame.mid, y, z, 0); return d.button > 0.5 || Math.abs(y - cy) < r * 0.9 ? 1 : 0; }, cy - 2 * r, cy + 2 * r);
        expect(across.length, `${name} ${k}`).toBe(2);
        expect(vert.length, `${name} ${k}`).toBe(2);
        // a chord 0.6 r off its middle is 2 r sqrt(1 - 0.36) across, and its middle line 2 r
        expect(Math.abs(across[1] - across[0] - 2 * r * 0.8) / MM, `${name} ${k} across`).toBeLessThan(0.3);
        expect(Math.abs(vert[1] - vert[0] - 2 * r) / MM, `${name} ${k} along`).toBeLessThan(0.3);
      }
      for (let k = 2; k < n; k++) expect(Math.abs(centres[k] - centres[k - 1] - (centres[1] - centres[0])) / MM, `${name} spacing ${k}`).toBeLessThan(0.3);
    }
  });

  it('a raglan\'s seam runs from the rim to her underarm, and her front\'s and her back\'s agree over her shoulder', () => {
    const { cut, detail } = dressed('raglan'), P = detail.pack, xa = P[12], ya = P[13], xb = P[14], yb = P[15];
    // its top on her ridge 15 mm out of the rim's side point, inside the garment
    expect((xa - cut.spec.half) / MM).toBeCloseTo(15, 3);
    expect(cutAt(cut, frame.mid + xa, ya - 0.005, skinZ(frame.mid + xa, ya - 0.005, true), 0)).toBeGreaterThan(0);
    // its foot at her underarm, where her arm's skin meets her side (MEASURED: her arm's skin 2 mm from it, seen from her front)
    let armNear = Infinity;
    for (let v = 0; v < rest.length / 3; v++) if (arm[v] > 0.5 && rest[v * 3] > frame.mid) armNear = Math.min(armNear, Math.hypot(rest[v * 3] - (frame.mid + xb), rest[v * 3 + 1] - yb));
    expect(armNear / MM).toBeLessThan(5);
    // front and back: where the second colour begins, row by row, on her left and her right
    let worst = 0, rows = 0;
    for (let y = ya - 0.01; y > yb + 0.005; y -= 0.01) for (const side of [1, -1]) {
      const at = (front: boolean) => {
        const xs = crossings((u) => { const x = frame.mid + side * u; return detailOf(P, x - frame.mid, y, front ? 1 : 0, 1, 1, 0, 0.0005).edging; }, 0.02, 0.25);
        void skinZ; return xs[0];
      };
      const f = at(true), b = at(false);
      expect(f, `${y}`).toBeDefined();
      worst = Math.max(worst, Math.abs(f - b)); rows++;
    }
    expect(rows).toBeGreaterThan(5);
    expect(worst / MM).toBeLessThan(0.15);
  });

  it('a raglan\'s second colour covers her sleeves whole', () => {
    const { cut, detail } = dressed('raglan');
    let n = 0;
    for (let v = 0; v < rest.length / 3; v++) {
      if (arm[v] < 0.6) continue;
      const x = rest[v * 3], y = rest[v * 3 + 1], z = rest[v * 3 + 2];
      if (!(cutAt(cut, x, y, z, arm[v]) > 0.001)) continue;
      expect(topDetailAt(detail, cut, x, y, z, arm[v]).edging, `point ${v}`).toBeGreaterThan(0.999);
      n++;
    }
    expect(n).toBeGreaterThan(500);
  });

  it('a collar\'s two leaves mirror each other', () => {
    for (const name of ['polo', 'buttonUp'] as const) {
      const { detail } = dressed(name), P = detail.pack;
      for (let u = 0; u < 0.12; u += 0.0037) for (let y = frame.neckY - 0.12; y < frame.neckY + 0.06; y += 0.0041) for (const neck of [0.004, 0.02, 0.05]) {
        const a = detailOf(P, u, y, 1, 1, neck, 0.016, 0.0005), b = detailOf(P, -u, y, 1, 1, neck, 0.016, 0.0005);
        expect(a.shade).toBe(b.shade);
      }
      // and its point is where it is told: 4 cm (the polo) out from her middle, under the rim's lowest point
      expect(P[28]).toBeCloseTo(TOP_DETAIL_STYLES[name].detail.collar!.pointOut, 6);
    }
  });

  it('nothing is drawn outside the garment', () => {
    for (const name of Object.keys(TOP_DETAIL_STYLES) as (keyof typeof TOP_DETAIL_STYLES)[]) {
      const { cut, detail } = dressed(name);
      let outside = 0;
      for (let v = 0; v < rest.length / 3; v += 3) {
        const x = rest[v * 3], y = rest[v * 3 + 1], z = rest[v * 3 + 2];
        if (y < 0.7 || cutAt(cut, x, y, z, arm[v]) > 0) continue;
        outside++;
        expect(topDetailAt(detail, cut, x, y, z, arm[v]), `${name} ${v}`).toEqual({ shade: 1, edging: 0, button: 0 });
      }
      expect(outside, name).toBeGreaterThan(1000);
    }
  });

  it('a wrap is not mirrored: its crossing and its knot are on her left', () => {
    const { detail } = dressed('wrap'), P = detail.pack;
    expect(P[18]).toBeGreaterThan(0.1);
    // (the dark line round the knot, on its outer side, past the crossing's end)
    const knot = (u: number) => detailOf(P, u, P[19], 1, 1, 1, 0.012, 0.0005).shade;
    expect(knot(P[18] + P[26])).toBeLessThan(0.7);
    expect(knot(-P[18] - P[26])).toBe(1);
  });
});

/** The shader as three compiles it, from a stub of its standard chunks. */
function compiled(masked: boolean, layers: number, detail: { pack: ArrayLike<number> } | null) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  const m = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(g, m);
  setFabricLayer(mesh, m, 0, { texture: new THREE.Texture(), tile: 1, opacity: 1, cut: { band: [0.01, 0.01, 0], shade: 0.1, detail } }, { layers, masked, rest: null, cut: true });
  const s = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>', fragmentShader: '#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n#include <normal_fragment_maps>\n#include <map_fragment>' };
  m.onBeforeCompile(s as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
  return { ...s, key: m.customProgramCacheKey(), hash: createHash('sha256').update(`${s.vertexShader}\n---\n${s.fragmentShader}`).digest('hex') };
}

describe('a top\'s details in the shader', () => {
  it('a layer with no detail compiles to exactly the program it did before details (MEASURED: its text\'s hash, 2026-11-14)', () => {
    expect(compiled(true, 3, null).hash).toBe('a5541172c7f44d31f6a38dc9d2f5e54ee2555ce8a0d95ab26bcf78a0c2dff792');
    expect(compiled(false, 1, null).hash).toBe('b570892d6865830fb12b944a99ff813d35261e96ad91cd700354e15eeef7ec65');
    expect(compiled(true, 3, null).key).not.toContain('-detail');
  });

  it('a layer with one is given the detail\'s code, its uniforms and the table\'s own numbers', () => {
    const pack = Float32Array.from({ length: 32 }, (_, k) => k + 0.5);
    for (const [masked, layers] of [[true, 3], [false, 1]] as const) {
      const s = compiled(masked, layers, { pack });
      expect(s.fragmentShader).toContain(topDetailGlsl());
      expect(s.key).toContain('-detail');
      for (let i = 0; i < layers; i++) expect(s.fragmentShader).toContain(`uniform vec4 fabricTopDet${i}[8];`);
      expect((s.uniforms.fabricTopDet0.value as THREE.Vector4[])[3].toArray()).toEqual([12.5, 13.5, 14.5, 15.5]);
      expect(s.uniforms.fabricTopDetOn0.value).toBe(1);
      expect(s.fragmentShader).toContain(`fc * ${DETAIL_LOOK.fallback}`);
    }
    const glsl = topDetailGlsl();
    for (const v of [DETAIL_LOOK.seam, DETAIL_LOOK.seamDark, DETAIL_LOOK.edgeLine, DETAIL_LOOK.edgeDark, DETAIL_LOOK.shadow, DETAIL_LOOK.shadowReach, DETAIL_LOOK.stitchIn, DETAIL_LOOK.hole.out, DETAIL_LOOK.hole.r, DETAIL_LOOK.face[0], DETAIL_LOOK.face[1]]) expect(glsl).toContain(`${v}`);
  });
});
