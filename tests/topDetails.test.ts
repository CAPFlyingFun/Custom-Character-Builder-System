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
import { setFabricCut, setFabricLayer } from '../src/sarahlab/fabricMaterial';
import { COVERAGE_TEMPLATES, pieceKind, templateDetail } from '../src/sarahlab/paintTemplates';
import { isCutTop, isOnePiece } from '../src/sarahlab/topCut';
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
      // (the button-up's pocket is on her left alone, and since 2026-11-14 it lies up beside her collar's leaf: left out here)
      const { detail } = dressed(name), P = Float32Array.from(detail.pack);
      P[22] = 0;
      for (let u = 0; u < 0.12; u += 0.0037) for (let y = frame.neckY - 0.12; y < frame.neckY + 0.06; y += 0.0041) for (const neck of [0.004, 0.02, 0.05]) {
        const a = detailOf(P, u, y, 1, 1, neck, 0.016, 0.0005), b = detailOf(P, -u, y, 1, 1, neck, 0.016, 0.0005);
        expect(a.shade).toBe(b.shade);
      }
      // and its point is where it is told: 4 cm (the polo) out from her middle, under the rim's lowest point
      expect(P[28]).toBeCloseTo(TOP_DETAIL_STYLES[name].detail.collar!.pointOut, 6);
    }
  });

  it('a button-up\'s pocket is on her left alone, on her bust\'s upper slope', () => {
    const { detail } = dressed('buttonUp'), P = detail.pack, k = TOP_DETAIL_STYLES.buttonUp.detail.pocket!;
    const cx = k.out, top = frame.neckY - k.down, bottom = top - k.height, far = 0.05;
    // its edge is drawn (darker) at the middle of its lower edge and of each side, and not at those places mirrored
    for (const [u, y] of [[cx, bottom], [cx - k.width / 2, top - k.height / 2], [cx + k.width / 2, top - k.height / 2]] as const) {
      expect(detailOf(P, u, y, 1, 1, far, 0.016, 0.0005).shade, `${u}, ${y}`).toBeLessThan(0.75);
      expect(detailOf(P, -u, y, 1, 1, far, 0.016, 0.0005).shade, `mirrored ${u}, ${y}`).toBe(1);
    }
    // inside it, away from its edge, its stitch and its hem: the cloth as it is
    expect(detailOf(P, cx, top - k.height / 2, 1, 1, far, 0.016, 0.0005).shade).toBe(1);
    // MEASURED 2026-11-14 on her rest skin: her bust runs from 8 to 18 cm under her neck joint, its most forward point
    // 14 cm under. Its lower edge stays over the fold under her breast (it was first 26 cm under: on her belly's top)
    expect(k.down + k.height).toBeLessThan(0.17);
    expect(k.down).toBeGreaterThan(0.05);
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

  it('each of the five is a template: a drawn top of its style\'s own cut, with its details laid on that cut', () => {
    const ids = { raglan: 'teeRaglan', henley: 'henley', polo: 'polo', wrap: 'wrap', buttonUp: 'buttonUp' } as const;
    for (const name of Object.keys(ids) as (keyof typeof ids)[]) {
      const t = COVERAGE_TEMPLATES.find((x) => x.id === ids[name])!, s = TOP_DETAIL_STYLES[name];
      expect(t, name).toBeDefined();
      expect(isCutTop(t.params), name).toBe(true);
      expect(pieceKind(t.id), name).toBe('top');
      expect(t.params.detail).toBe(name);
      expect(t.params.neckStyle).toBe(s.neckStyle);
      expect(t.params.sleeve).toBe(s.sleeve);
      // on her: the template's cut is the one its style was pictured on (a NECKLINE is kept to three places: under a millimetre)
      const cut = topCut(topCutSpec(t.params, frame, -0.1), frame), own = dressed(name);
      expect(Math.abs(cut.spec.dipY - own.cut.spec.dipY), name).toBeLessThan(1 * MM);
      expect(cut.spec.sleeve).toBe(own.cut.spec.sleeve);
      expect(cut.spec.bands).toEqual(own.cut.spec.bands);
      // and what is drawn on it is its style's, laid on that cut
      const d = templateDetail(t.params, cut)!;
      expect(Array.from(d.pack), name).toEqual(Array.from(topDetailSpec(s.detail, cut.spec, frame).pack));
      expect(d.pack.some((x) => x !== 0)).toBe(true);
    }
    // no other template has anything drawn on it
    expect(COVERAGE_TEMPLATES.filter((t) => t.params.detail).map((t) => t.id)).toEqual(Object.values(ids));
    const tee = COVERAGE_TEMPLATES.find((x) => x.id === 'teeShort')!;
    expect(templateDetail(tee.params, topCut(topCutSpec(tee.params, frame, -0.1), frame))).toBeNull();
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
  it('a layer with no detail compiles to exactly the program it does without details (MEASURED: its text\'s hash, 2026-11-15, an outline\'s armscye in it)', () => {
    // (2026-11-14, before an outline's armscye was read from the cut's picture: a5541172… her skin's, b570892d… a sheet's;
    // with the armscye and before the program said `fabricRest` is there to read, for her face's layer: 7cdec1ff… and 57ffa7a5…)
    // (and before each of a cut's edges was antialiased by its own slope: 4dcfa78a… her skin's; a sheet has one edge)
    // (...and before a top's own hem was level on her as she is shaped: d27c39a7… and 23dfa6e1…)
    // (...and before which of her skin a pixel is was read inside the triangle the pixel is drawn for: 04c1d084… her
    // skin's; a sheet does not ask)
    expect(compiled(true, 3, null).hash).toBe('276feab9d4c182c65e6d3bfe8747f76d252597b577cc696a636aaeefbe64cb62');
    expect(compiled(false, 1, null).hash).toBe('3fac908ee59b894ad4cb7ae0f0ab5d217cc4f17ad16bccba7bce24f571e8b005');
    expect(compiled(true, 3, null).key).not.toContain('-detail');
    // her skin reads an outline's armscye -- her side's drawing, the picture's alpha, at the place's depth ahead of her
    // shoulder joints -- and rounds the corner between it and her front's and back's (topCut.ts `armscyeAt`, `smoothMax`);
    // a sheet across her front (her cleavage bridge) reads her front's drawing alone, as before
    const skin = compiled(true, 3, null), sheet = compiled(false, 1, null);
    // EACH OF A CUT'S EDGES IS ANTIALIASED BY ITS OWN SLOPE on her skin, and the layer is there where both have it: the
    // edge function draws its line a pixel wide by the slope of what it is given, and the nearer of the two distances
    // has a slope of some twenty ranges a pixel where a sleeveless top's bare arm comes in across the row of triangles
    // that joins her arm to her trunk (MEASURED 2026-11-15 in the room, the tank: a dotted hairline down each shoulder)
    for (const i of [0, 1, 2]) {
      expect(skin.fragmentShader).toContain(`fe${i} = min(fabricEdge(0.5 + fn / (2.0 * fabricCutDepth.w)), fabricEdge(0.5 + fl / (2.0 * fabricCutDepth.w)));`);
      expect(skin.fragmentShader).toContain(`float fk = (fe${i} < 0.0 ? fabricEdge(fm${i}) : fe${i}) * `);
    }
    expect(skin.fragmentShader).not.toMatch(/float fk = fabricEdge\(fm\d\) \* /);
    expect(sheet.fragmentShader).not.toContain('fe0');
    // WHICH OF HER SKIN A PIXEL IS -- her arm's, cut by a sleeve's end; the rest of her, by the hem -- IS READ INSIDE
    // THE TRIANGLE THE PIXEL IS DRAWN FOR (`vFabricLimb`, `centroid`). A pixel a triangle only partly covers is told
    // the triangle's numbers at the pixel's middle, outside the triangle, where they run on past its corners': on the
    // row that joins her LEG's skin to her trunk's the flag ran on from -1 past 0 to "her arm's", and a short-sleeved
    // tee to her hips was cut there by its sleeve's end (MEASURED 2026-11-15 in the room, a phone's 2x, her front
    // square on: pairs of pixels a quarter her skin down her hips' outlines -- v0.9.27's)
    expect(skin.fragmentShader).toContain('float a = smoothstep(0.4, 0.6, vFabricLimb);');
    expect(skin.fragmentShader).toContain('centroid varying float vFabricLimb;');
    expect(skin.vertexShader).toContain('centroid varying float vFabricLimb;');
    expect(skin.vertexShader).toContain('vFabricLimb = fabricAux.z;');
    // (the flag as it is told at the pixel's middle is read by nothing; a paint's two ramps, cut where they cross a
    // half, are)
    expect(skin.fragmentShader).not.toContain('vFabricAux.z');
    expect(skin.fragmentShader).toContain('fabricEdge(vFabricAux.x)');
    expect(skin.fragmentShader).toContain('fabricEdge(vFabricAux.y)');
    // (a sheet across her front has no limb to ask of)
    expect(sheet.fragmentShader).not.toContain('vFabricLimb');
    expect(sheet.vertexShader).not.toContain('vFabricLimb');
    // A TOP'S OWN HEM (a sports bra's, a boxy crop tee's: no drape's band over it) is level on her AS SHE IS SHAPED: at
    // the height the pixel stands about her frame -- its rest place and its slip -- while `fabricCutHem` is 1; a
    // shirt's, under its drape's band, at its rest height as before (0, the uniform's own value)
    expect(skin.fragmentShader).toContain('float hd = vFabricPos.y + vFabricSlip.y * fabricCutHem - fabricCutLimb.z, sd = fabricCutLimb.y - vFabricAlong;');
    expect(skin.fragmentShader).toContain('return vec3(neck, mix(hd, sd, a), a);');
    expect((skin.uniforms.fabricCutHem as { value: number }).value).toBe(0);
    // ...and a cut says which it is when it is laid on her skin's material (`FabricCut.ownHem`; left out: a shirt's)
    {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
      const m = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(g, m);
      setFabricLayer(mesh, m, 0, { texture: new THREE.Texture(), tile: 1, opacity: 1, cut: { band: [0.01, 0.01, 0], shade: 0.1, detail: null } }, { layers: 3, masked: true, rest: null, cut: true });
      const s = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: '', fragmentShader: '' };
      m.onBeforeCompile(s as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
      const cut = { texture: new THREE.DataTexture(new Uint8Array(4), 1, 1), rect: [0, 0, 1, 1], depth: [0, 1, 0.01, 0.03], armL: [0, -1, 0, 0], armR: [0, -1, 0, 0], limb: [0, -1, 0.3, 1], seam: [0.2, 0.001] } as const;
      setFabricCut(m, { ...cut, ownHem: true });
      expect(s.uniforms.fabricCutHem.value).toBe(1);
      setFabricCut(m, cut);
      expect(s.uniforms.fabricCutHem.value).toBe(0);
      setFabricCut(m, { ...cut, ownHem: false });
      expect(s.uniforms.fabricCutHem.value).toBe(0);
    }
    // the tops whose hem is their own are the ones cut above a shirt's LENGTH: the sports bra and the boxy crop tee
    expect(COVERAGE_TEMPLATES.filter((t) => isCutTop(t.params) && !isOnePiece(t.params) && t.params.length === null && t.params.hemFront !== null).map((t) => t.id).sort()).toEqual(['cropTee', 'sportsBra']);
    expect(skin.fragmentShader).toContain('vec2(fabricCutLimb.x + place.z * fabricCutLimb.w - fabricCutSide.x, place.y)');
    expect(skin.fragmentShader).toContain('neck = max(neck, arm) + sh * sh * fabricCutSide.w * 0.25;');
    expect(sheet.fragmentShader).not.toContain('fabricCutSide.x');
    // off until a cut with an armscye is laid: its rounding is 0, and a camisole's line is nowhere
    expect((skin.uniforms.fabricCutSide.value as THREE.Vector4).toArray()).toEqual([0, 0, 1, 0]);
    expect((skin.uniforms.fabricCutStart.value as THREE.Vector3).toArray()).toEqual([0, 1e9, 0]);
    expect(skin.key).toContain('-v19');
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
