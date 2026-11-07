/**
 * THE PAINTED SHIRT'S DRAPE, SEATED (tunicDrape.ts, LAP_LIFT; Joshua, 2026-11-06: "the shirt is flaring out too much and
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
import { DRAPE_PROBE, TunicDrape } from '../src/sarahlab/tunicDrape';
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
    // (straight, and as a big bump's stance holds them: her legs' skin a fifth higher than at rest, which at her knees is
    // far up her knees -- measured on her at 150%)
    for (const stance of [1, 0.8]) {
      DRAPE_PROBE.lap = true;
      const on = drapeOf(false, stance);
      expect(on.lap).toBe(0);
      DRAPE_PROBE.lap = false;
      expect(drapeOf(false, stance).all).toEqual(on.all);
    }
  });
});
