/**
 * THE PAINTED SHIRT'S DRAPE, SEATED (tunicDrape.ts, LAP_TILT; Joshua, 2026-11-06: "the shirt is flaring out too much and
 * looks weird... did it get taken half way?"). Her thighs laid forward are her lap: left out of the slices the drape is
 * measured in, so it hangs from her and does not stand out over her lap to her knees. Standing, her legs hang, none of
 * her is lap, and the drape is exactly what it was.
 *
 * The body: a trunk, a cylinder of radius 0.18 round the upright axis (trunk length 1, her hip joints at y = 0), and two
 * thighs of radius 0.07 and 0.45 long from her hip joints, hanging down (standing; `stance` < 1 as a bent stance holds
 * them, her legs' skin higher than at rest) or laid forward along +z (seated).
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CUT_ATTRIBUTE, DRAPE_PROBE, TunicDrape } from '../src/sarahlab/tunicDrape';
import { BODY_REGIONS, type BodyMap } from '../src/sarahlab/bodyRegions';

const regionOf = (id: string) => BODY_REGIONS.findIndex((r) => r.id === id) + 1;

function sitting(seated: boolean, stance = 1): { body: THREE.SkinnedMesh; map: BodyMap } {
  const pos: number[] = [], nor: number[] = [], region: number[] = [], trunk: number[] = [], around: number[] = [];
  for (let j = 0; j <= 80; j++) for (let a = 0; a < 48; a++) {
    const t = -0.2 + j * 0.01, c = Math.cos((2 * Math.PI * a) / 48), s = Math.sin((2 * Math.PI * a) / 48);
    pos.push(0.18 * c, t, 0.18 * s); nor.push(c, 0, s); region.push(regionOf(t < 0 ? 'hips' : 'belly')); trunk.push(t); around.push((s + 1) / 2);
  }
  for (const side of [-1, 1]) for (let j = 0; j <= 45; j++) for (let a = 0; a < 24; a++) {
    const along = j * 0.01, c = Math.cos((2 * Math.PI * a) / 24), s = Math.sin((2 * Math.PI * a) / 24);
    // round the thigh: across (x) and, standing, front to back (z) -- seated, up and down (y)
    if (seated) { pos.push(side * 0.09 + 0.07 * c, 0.07 * s, along); nor.push(c, s, 0); }
    else { pos.push(side * 0.09 + 0.07 * c, -along * stance, 0.07 * s); nor.push(c, 0, s); }
    region.push(regionOf(side < 0 ? 'thighR' : 'thighL')); trunk.push(-along); around.push(0.5);
  }
  const g = new THREE.BufferGeometry(), n = pos.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
  const sw = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) sw[v * 4] = 1;
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const body = new THREE.SkinnedMesh(g), bone = new THREE.Bone();
  body.add(bone); body.updateMatrixWorld(true); body.bind(new THREE.Skeleton([bone]));
  const map = { region: Uint8Array.from(region), trunk: Float32Array.from(trunk), around: Float32Array.from(around), arm: new Float32Array(n).fill(NaN), trunkLength: 1 } as BodyMap;
  return { body, map };
}

/** The drape as built: each point that shows (its place, as laid on her), and how many of her vertices were her lap. */
function drapeOf(seated: boolean, stance = 1): { shown: THREE.Vector3[]; lap: number; all: Float32Array } {
  const { body, map } = sitting(seated, stance), drape = new TunicDrape(body, map, -0.3);
  drape.wear(-0.15);
  drape.update(0);
  const P = drape.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, C = drape.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
  const shown: THREE.Vector3[] = [];
  for (let i = 0; i < P.count; i++) if (C.getW(i) > 0.01) shown.push(new THREE.Vector3().fromBufferAttribute(P, i));
  return { shown, lap: drape.inside.lap, all: Float32Array.from(P.array as Float32Array) };
}

describe('TunicDrape seated', () => {
  afterEach(() => { DRAPE_PROBE.lap = true; });

  it('seated, her thighs laid forward are her lap: the drape hangs from her, not out over her lap to her knees', () => {
    const on = drapeOf(true);
    expect(on.lap).toBeGreaterThan(0);
    expect(on.shown.length).toBeGreaterThan(0);
    // its front stays near her trunk (radius 0.18), where her thighs reach 0.45 out
    expect(Math.max(...on.shown.map((p) => p.z))).toBeLessThan(0.25);
    // ...and it is her lap that did it: measured with her lap, the outline reached out over her thighs to her knees
    DRAPE_PROBE.lap = false;
    const off = drapeOf(true);
    expect(off.lap).toBe(0);
    expect(Math.max(...off.shown.map((p) => p.z))).toBeGreaterThan(0.4);
  });

  it('standing, her legs hang: none of her is lap, and the drape is built exactly as without the rule', () => {
    // (straight; as a big bump's stance holds them, her legs' skin a fifth higher than at rest -- measured on her at 150%;
    // and with every slider at its least, her legs 40% shorter than her map's rest heights)
    for (const stance of [1, 0.8, 0.6]) {
      DRAPE_PROBE.lap = true;
      const on = drapeOf(false, stance);
      expect(on.lap).toBe(0);
      DRAPE_PROBE.lap = false;
      expect(drapeOf(false, stance).all).toEqual(on.all);
    }
  });
});

describe('TunicDrape seated: the axis', () => {
  // seated, her seat spreads back on what she sits on: at her hip joints' height, without her thighs, the slice is
  // mostly seat, and an axis measured there came to within a centimetre of her lower back above it -- skin a
  // centimetre out in any direction round it, and shards of drape at her sides (2026-11-06, at 100%)
  function spread(): { body: THREE.SkinnedMesh; map: BodyMap } {
    const { body, map } = sitting(true), g = body.geometry, P = g.getAttribute('position'), N = g.getAttribute('normal');
    const pos = Array.from(P.array as Float32Array), nor = Array.from(N.array as Float32Array);
    const region = Array.from(map.region), trunk = Array.from(map.trunk), around = Array.from(map.around);
    for (let j = 0; j <= 30; j++) for (let k = 0; k <= 30; k++) for (const y of [-0.015, 0, 0.015]) {
      pos.push(-0.15 + j * 0.01, y, -0.18 - k * 0.008); nor.push(0, 0, -1);
      region.push(regionOf('seat')); trunk.push(y); around.push(0);
    }
    const h = new THREE.BufferGeometry(), n = pos.length / 3;
    h.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    h.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    h.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
    const sw = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) sw[v * 4] = 1;
    h.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const b = new THREE.SkinnedMesh(h), bone = new THREE.Bone();
    b.add(bone); b.updateMatrixWorld(true); b.bind(new THREE.Skeleton([bone]));
    return { body: b, map: { region: Uint8Array.from(region), trunk: Float32Array.from(trunk), around: Float32Array.from(around), arm: new Float32Array(n).fill(NaN), trunkLength: 1 } as BodyMap };
  }

  it('runs through the middle of her trunk above her hips, not her seat\'s slice: nothing stands out past her sides', () => {
    const { body, map } = spread(), drape = new TunicDrape(body, map, -0.3);
    drape.wear(-0.01);
    drape.update(0);
    expect(drape.inside.lap).toBeGreaterThan(0);
    // her seat pulled the hips' slice 9 cm back of her trunk's middle (0.15 of her trunk: 90 mm); the axis is her trunk's
    expect(drape.inside.axisMm).toBeGreaterThan(60);
    const P = drape.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, C = drape.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    let widest = 0;
    for (let i = 0; i < P.count; i++) if (C.getW(i) > 0.01 && P.getY(i) > 0.05) widest = Math.max(widest, Math.abs(P.getX(i)));
    // above her seat, her sides are 0.18 out; the drape a centimetre past them at most
    expect(widest).toBeLessThan(0.19);
  });

  it('standing, the axis is her hip joints\' slice, as it was', () => {
    const { body, map } = sitting(false), drape = new TunicDrape(body, map, -0.3);
    drape.wear(-0.15);
    drape.update(0);
    expect(drape.inside.axisMm).toBe(0);
  });
});

describe('TunicDrape: its hem band alone (a painted shirt\'s smooth bottom edge)', () => {
  // A trunk of radius 0.18 with a bump in front between 0.05 and 0.35 above her hips, 0.12 proud of it at its fullest.
  // Joshua, 2026-11-06: the painted shirt's drape taken off ("Remove that bottom flap skin"), then its smooth bottom edge
  // back ("Hem band only", "Also, do along the backside")
  function bumped(): { body: THREE.SkinnedMesh; map: BodyMap } {
    const pos: number[] = [], nor: number[] = [], region: number[] = [], trunk: number[] = [], around: number[] = [];
    for (let j = 0; j <= 80; j++) for (let a = 0; a < 64; a++) {
      const t = -0.2 + j * 0.01, c = Math.cos((2 * Math.PI * a) / 64), s = Math.sin((2 * Math.PI * a) / 64);
      const bump = t > 0.05 && t < 0.35 && s > 0 ? 0.12 * Math.sin(Math.PI * (t - 0.05) / 0.3) * s * s : 0, r = 0.18 + bump;
      pos.push(r * c, t, r * s); nor.push(c, 0, s); region.push(regionOf(t < 0 ? 'hips' : 'belly')); trunk.push(t); around.push((s + 1) / 2);
    }
    const g = new THREE.BufferGeometry(), n = pos.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4), 4));
    const sw = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) sw[v * 4] = 1;
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const body = new THREE.SkinnedMesh(g), bone = new THREE.Bone();
    body.add(bone); body.updateMatrixWorld(true); body.bind(new THREE.Skeleton([bone]));
    return { body, map: { region: Uint8Array.from(region), trunk: Float32Array.from(trunk), around: Float32Array.from(around), arm: new Float32Array(n).fill(NaN), trunkLength: 1 } as BodyMap };
  }
  const shownOf = (drape: TunicDrape) => {
    const P = drape.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, C = drape.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < P.count; i++) if (C.getW(i) > 0.01) out.push(new THREE.Vector3().fromBufferAttribute(P, i));
    return out;
  };

  it('shows only a band at the hem, all the way round her, front and back, lying on her: no flap hanging from her bump', () => {
    const { body, map } = bumped(), hem = -0.1;
    const whole = new TunicDrape(body, map, -0.3);
    whole.wear(hem);
    whole.update(0);
    const band = new TunicDrape(body, map, -0.3);
    band.wear(hem, undefined, null, true);
    band.update(0);
    const w = shownOf(whole), b = shownOf(band);
    // the whole drape hangs from her bump in front, down to its hem
    expect(Math.max(...w.filter((p) => p.y < 0).map((p) => p.z))).toBeGreaterThan(0.24);
    // the band: nothing higher than its own band and fade (two HEM_BANDs over the hem, a little more for the rows' step)
    expect(Math.max(...b.map((p) => p.y))).toBeLessThan(hem + 0.08);
    // all round her: in front, behind and at both sides
    for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) expect(b.some((p) => (p.x * x + p.z * z) / Math.hypot(p.x, p.z) > 0.95), `${x},${z}`).toBe(true);
    // lying on her: no further out than a few millimetres past her skin (0.18), in front too
    expect(Math.max(...b.map((p) => Math.hypot(p.x, p.z)))).toBeLessThan(0.19);
  });
});

describe('TunicDrape seated: the hem band\'s edge over her thighs (LAP_CLEAR)', () => {
  // Joshua, 2026-11-06, seated: "why when sitting, is the side of the shirt not smooth... Is it not following the updated
  // thighs?" -- seated, the band (a painted shirt's bottom edge) ends just over the tops of her thighs where they leave
  // her, cut crisp (`drapeCut`); standing, nothing of it is cut
  const cutOf = (seated: boolean, stretch = 0) => {
    const { body, map } = sitting(seated), drape = new TunicDrape(body, map, -0.3);
    drape.wear(-0.01, undefined, null, true, stretch);
    drape.update(0);
    const P = drape.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, C = drape.mesh.geometry.getAttribute(CUT_ATTRIBUTE) as THREE.BufferAttribute;
    // (the rows drawn: the rest are folded onto the hem, drawn nowhere)
    const drawn = Math.min(P.count, (drape.mesh.geometry.drawRange.count / (6 * 80) + 1) * 80);
    const kept: THREE.Vector3[] = [], cut: THREE.Vector3[] = [];
    for (let i = 0; i < drawn; i++) (C.getX(i) >= 0.5 ? kept : cut).push(new THREE.Vector3().fromBufferAttribute(P, i));
    return { kept, cut };
  };

  it('standing: nothing cut', () => {
    expect(cutOf(false).cut.length).toBe(0);
  });

  it('seated: over her thighs and round her sides to them, cut up to just over their tops (0.07 over her hips); behind her, not', () => {
    const { kept, cut } = cutOf(true);
    expect(cut.length).toBeGreaterThan(0);
    // what is cut is over her thighs and round her sides to them (not behind her), and below their tops plus LAP_CLEAR
    expect(cut.every((p) => p.z > -0.1 && p.y < 0.07 + 0.012)).toBe(true);
    // in front, what is kept is above her thighs' tops
    expect(kept.filter((p) => p.z > 0.12 && Math.abs(p.x) > 0.05).every((p) => p.y > 0.06)).toBe(true);
  });

  // Joshua, 2026-11-06, of the front ending at the bottom of her bump: "Depends on the fabric selected... more stretchy,
  // will stay, more firm, ride up more... even if painted" (RIDE_FROM)
  const between = (p: THREE.Vector3) => Math.abs(p.x) < 0.03 && p.z > 0.1;
  it('between her thighs, a stretch knit stays further down the more it stretches; a firm one rides up', () => {
    const at = (stretch: number) => { const b = cutOf(true, stretch).kept.filter(between); return { n: b.length, lowest: Math.min(...b.map((p) => p.y)) }; };
    const firm = at(0), half = at(0.5), knit = at(1);
    expect(half.lowest).toBeLessThan(firm.lowest - 0.005);
    expect(knit.lowest).toBeLessThan(half.lowest - 0.005);
    expect(knit.n).toBeGreaterThan(firm.n);
  });

  it('at her sides and behind her, a stretch knit ends exactly where a firm one does', () => {
    const side = (pts: THREE.Vector3[]) => pts.filter((p) => p.z < 0.05).map((p) => p.toArray().map((v) => v.toFixed(5)).join()).sort();
    const firm = cutOf(true, 0), knit = cutOf(true, 1);
    expect(side(knit.cut).length).toBeGreaterThan(0);
    expect(side(knit.cut)).toEqual(side(firm.cut));
    expect(side(knit.kept)).toEqual(side(firm.kept));
  });

  it('standing, its fabric changes nothing', () => {
    expect(cutOf(false, 1).cut.length).toBe(0);
  });
});
