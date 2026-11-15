/**
 * WHERE A PAINTED SHIRT'S PAINT ENDS UNDER ITS HEM BAND (tunicDrape.ts, `HEM_PAINT_ROWS`; a fault found, Joshua's
 * standing rule of 2026-11-13: "if you see any future issues, please plan to automatically fix them and let me know").
 *
 * A painted shirt's bottom edge is its drape's hem band's, level and smooth; her skin's paint is taken off below that
 * edge by a value a vertex of her skin (`hang`) that the shader cuts where it crosses one half. The value ran from 0 to
 * 1 over two rows -- about a centimetre on her -- round a line one row above the edge, and was held there. Her hips'
 * triangles reach 37 mm: across one of them a vertex well above the line said 0 and one well below it 1, and the
 * half-way line fell wherever the triangle's shape put it, up past where the band (0.4 mm off her) is in front of her
 * skin. MEASURED 2026-11-14 in the room, on v0.9.23 and on v0.9.24 alike: two chips of what is under the shirt (her
 * leggings, or her skin), each about 35 mm by 11, just above the hem at her side. Now the value runs straight for
 * `HEM_PAINT_ROWS` rows either side of the band's own bottom edge, further than her triangles reach, so the half-way
 * line across any of them is that edge's level -- where the band lies under her skin, her paint ends on the same line.
 *
 * The body: a trunk, a cylinder of radius 0.18 round the upright axis (trunk length 1, her hip joints at y = 0), in rings
 * a hundredth of her trunk apart, and two thighs hanging from her hip joints.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { HEM_PAINT_ROWS, TunicDrape } from '../src/sarahlab/tunicDrape';
import { BODY_REGIONS, type BodyMap } from '../src/sarahlab/bodyRegions';

const regionOf = (id: string) => BODY_REGIONS.findIndex((r) => r.id === id) + 1;
const RING = 48, STEP = 0.01, LOWEST = -0.2;

function standing(): { body: THREE.SkinnedMesh; map: BodyMap } {
  const pos: number[] = [], nor: number[] = [], region: number[] = [], trunk: number[] = [], around: number[] = [];
  for (let j = 0; j <= 80; j++) for (let a = 0; a < RING; a++) {
    const t = LOWEST + j * STEP, c = Math.cos((2 * Math.PI * a) / RING), s = Math.sin((2 * Math.PI * a) / RING);
    pos.push(0.18 * c, t, 0.18 * s); nor.push(c, 0, s); region.push(regionOf(t < 0 ? 'hips' : 'belly')); trunk.push(t); around.push((s + 1) / 2);
  }
  for (const side of [-1, 1]) for (let j = 0; j <= 45; j++) for (let a = 0; a < 24; a++) {
    const c = Math.cos((2 * Math.PI * a) / 24), s = Math.sin((2 * Math.PI * a) / 24);
    pos.push(side * 0.09 + 0.07 * c, -j * STEP, 0.07 * s); nor.push(c, 0, s);
    region.push(regionOf(side < 0 ? 'thighR' : 'thighL')); trunk.push(-j * STEP); around.push(0.5);
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

/** The band alone, its hem at `hem` on her trunk: what her trunk's skin says at each ring's height (her side, x the most). */
function saidAt(hem: number): (t: number) => number {
  const { body, map } = standing(), drape = new TunicDrape(body, map, -0.3);
  drape.wear(hem, undefined, null, true);
  drape.update(0);
  return (t) => drape.hang[Math.round((t - LOWEST) / STEP) * RING];
}

describe('a painted shirt\'s paint under its hem band', () => {
  const HEM = -0.1, LINE = HEM, said = saidAt(HEM);

  it('ends at the band\'s own bottom edge: one half there, more below, less above', () => {
    expect(said(LINE)).toBeCloseTo(0.5, 3);
    expect(said(LINE - STEP)).toBeGreaterThan(0.5);
    expect(said(LINE + STEP)).toBeLessThan(0.5);
    // all of it off below the band's reach, none of it off well above
    expect(said(LINE - (HEM_PAINT_ROWS + 1) * STEP)).toBe(1);
    expect(said(LINE + (HEM_PAINT_ROWS + 1) * STEP)).toBe(0);
  });

  it('runs straight for as far as her hips\' triangles reach either side of that line (37 mm of her 524: 7 rows)', () => {
    expect(HEM_PAINT_ROWS * STEP).toBeGreaterThanOrEqual(37 / 524);
    for (let k = -HEM_PAINT_ROWS + 1; k < HEM_PAINT_ROWS; k++) expect(said(LINE + k * STEP), `row ${k}`).toBeCloseTo(0.5 - k / (2 * HEM_PAINT_ROWS), 3);
  });

  it('so the half-way line across a triangle as tall as her hips\' is the line itself, wherever the triangle lies', () => {
    // a vertex `up` above the line and one `down` below it (each on one of her rings), and where a straight blend between
    // the two crosses one half
    const crossing = (up: number, down: number) => { const a = said(LINE + up), b = said(LINE - down); return LINE + up - ((0.5 - a) / (b - a)) * (up + down); };
    for (const [up, down] of [[0.05, 0.02], [0.02, 0.05], [0.06, 0.01], [0.01, 0.06], [0.04, 0.03]]) expect(Math.abs(crossing(up, down) - LINE), `${up} above, ${down} below`).toBeLessThan(2e-4);
    // (held to two rows it said 0 at the upper one and 1 at the lower, and the crossing was half way between the two
    // wherever they were: 1.5% of her trunk above the line for the first of these, 8 mm on her; 2.5% for the third)
  });
});
