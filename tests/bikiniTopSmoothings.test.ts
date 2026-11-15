/**
 * HER BIKINI TOP OVER HER SKIN'S SMOOTHINGS (a fault found 2026-11-14 in the pictures of her top with MILK, and fixed as
 * Joshua asks of one: "if you see any future issues, please plan to automatically fix them and let me know"; of this
 * one among those found, "Okay. Sounds good. Push when fixed:)").
 *
 * Her skin's smoothings -- her cleavage's, her sides', her 0% shape refined -- are laid on her BODY from a file of their
 * own, as her milk is, and her top has none of them. MEASURED in the room at her 200% belly, with no milk and SIZE at 0:
 * slivers of her skin at three of her top's corners, and her neck strings' feet sunk into her. They are relaxations of
 * her skin: they slide her skin's points along her as well as moving her shape, so her top can not take them as it
 * takes her milk (`sync`: its strings ride the slide into zigzags). It is LIFTED where one brings her skin out under
 * it, and never slid (`GarmentShapeTransfer.syncSet`'s `lifts`, `zeroRefine.smoothsHerSkin`).
 *
 * The room's own body file and smoothing file, bound as the room binds them. What is held is MEASURED on them.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GarmentShapeTransfer, type GarmentPart } from '../src/sarahlab/garmentShapeTransfer';
import { UNITS_PER_METRE } from '../src/sarahlab/softBody';
import { CHEST_FIELD_PREFIX, SIDES_FIELD_PREFIX, ZERO_FIELD, anchorWeights, parseZeroRefine, smoothsHerSkin, zeroRefineWeight } from '../src/sarahlab/zeroRefine';
import type { ShapeFields } from '../src/view/bodyShapeView';

const MM = 1000 / UNITS_PER_METRE;
interface Top { part: GarmentPart; index: Uint32Array; rings: number }
let body: THREE.SkinnedMesh, source: ShapeFields, top: Top[], sides: number[], chest: number[];

function isCord(count: number, index: Uint32Array): boolean {
  const edges = new Map<number, number>();
  for (let t = 0; t + 2 < index.length; t += 3) for (let e = 0; e < 3; e++) { const a = index[t + e], b = index[t + (e + 1) % 3]; if (a === b) continue; const k = Math.min(a, b) * count + Math.max(a, b); edges.set(k, (edges.get(k) ?? 0) + 1); }
  for (const n of edges.values()) if (n === 1) return false;
  return edges.size > 0;
}
/** Her smoothings' weights at a belly size, as the room lays them on her (HYBRID). */
function weightsAt(bump: number): Record<string, number> {
  const out: Record<string, number> = {}, zero = zeroRefineWeight(bump);
  if (zero) out[ZERO_FIELD] = zero;
  for (const [s, w] of anchorWeights(bump, sides)) out[SIDES_FIELD_PREFIX + s] = w;
  for (const [s, w] of anchorWeights(bump, chest, false)) out[CHEST_FIELD_PREFIX + s] = w;
  return out;
}
function moveOf(fields: ShapeFields, weights: Record<string, number>): Float32Array {
  const out = new Float32Array(fields.basePos.length);
  for (const [name, w] of Object.entries(weights)) { const f = fields.fields.get(name); if (f) for (let k = 0; k < f.index.length; k++) for (let c = 0; c < 3; c++) out[f.index[k] * 3 + c] += w * f.pos[k * 3 + c]; }
  return out;
}
const most = (m: Float32Array): number => { let d = 0; for (let v = 0; v < m.length; v += 3) d = Math.max(d, Math.hypot(m[v], m[v + 1], m[v + 2])); return d * MM; };
/** A cord's middle line (rings of twelve points), and how much more sharply than at rest it turns (degrees over 9 mm of it). */
function sharper(t: Top, move: Float32Array): number {
  const line = (m: Float32Array | null) => { const out: number[][] = []; for (let r = 0; r < t.rings; r++) { const c = [0, 0, 0]; for (let k = 0; k < 12; k++) for (let a = 0; a < 3; a++) c[a] += (t.part.fields.basePos[(r * 12 + k) * 3 + a] + (m ? m[(r * 12 + k) * 3 + a] : 0)) / 12; out.push(c); } return out; };
  const turns = (l: number[][]) => { const out: number[] = []; for (let i = 3; i + 3 < l.length; i++) { const a = l[i].map((x, c) => x - l[i - 3][c]), b = l[i + 3].map((x, c) => x - l[i][c]); out.push((Math.acos(Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI); } return out; };
  const rest = turns(line(null)), now = turns(line(move));
  return Math.max(...now.map((x, i) => x - rest[i]));
}
/** Her top as her smoothings leave it at a belly size: lifted (the room's way), and ridden (as her milk is taken: not the room's). */
interface Laid { weights: Record<string, number>; lifted: Float32Array[]; ridden: Float32Array[] }
const laid = new Map<number, Laid>();
function at(bump: number): Laid {
  const had = laid.get(bump); if (had) return had;
  const weights = weightsAt(bump), wanted = (name: string) => !!weights[name];
  const lifted = new GarmentShapeTransfer(body, source).syncSet(top.map((t) => t.part), source, wanted, smoothsHerSkin).fields.map((f) => moveOf(f, weights));
  const one = new GarmentShapeTransfer(body, source), ridden = top.map((t) => moveOf(one.sync(t.part.mesh, t.part.fields, source, wanted).fields, weights));
  const out = { weights, lifted, ridden };
  laid.set(bump, out);
  return out;
}

beforeAll(async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const prims = (await io.read('public/models/sarah-v2-body-slim.glb')).getRoot().listMeshes()[0].listPrimitives();
  const floats = (p: Primitive, name: string): Float32Array => { const a = p.getAttribute(name)!, out = new Float32Array(a.getCount() * 3), e = [0, 0, 0]; for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); out.set(e, i * 3); } return out; };
  const indexOf = (p: Primitive) => Uint32Array.from(p.getIndices()!.getArray()!);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(floats(prims[0], 'POSITION'), 3)); g.setIndex(new THREE.BufferAttribute(indexOf(prims[0]), 1));
  body = new THREE.SkinnedMesh(g);
  const zero = parseZeroRefine(new Uint8Array(readFileSync('public/models/sarah-v2-body-zero.bin')).buffer);
  sides = zero.sides.map((p) => p.slider).sort((a, b) => a - b); chest = zero.chest.map((p) => p.slider).sort((a, b) => a - b);
  const fields = new Map<string, { index: Uint32Array; pos: Float32Array; nrm: Float32Array | null }>([[ZERO_FIELD, zero.body]]);
  for (const p of zero.sides) fields.set(SIDES_FIELD_PREFIX + p.slider, p);
  for (const p of zero.chest) fields.set(CHEST_FIELD_PREFIX + p.slider, p);
  source = { fields, basePos: floats(prims[0], 'POSITION'), baseNrm: floats(prims[0], 'NORMAL'), last: '' };
  top = [];
  for (const p of prims.slice(1)) {
    if (p.getMaterial()?.getName() !== 'bikini') continue;
    const pos = floats(p, 'POSITION'), index = indexOf(p);
    let high = -Infinity; for (const i of index) high = Math.max(high, pos[i * 3 + 1]);
    if (high < 0.3) continue;
    top.push({ part: { mesh: new THREE.Mesh(new THREE.BufferGeometry()), fields: { fields: new Map(), basePos: pos, baseNrm: null, last: '' }, cord: isCord(pos.length / 3, index) }, index, rings: Math.floor(pos.length / 36) });
  }
}, 60_000);

describe('her bikini top over her skin\'s smoothings', () => {
  const cords = (m: Float32Array[]) => top.map((t, i) => ({ t, i })).filter(({ t, i }) => t.part.cord && t.rings > 12 && m[i].some((x) => x !== 0));
  const cups = () => top.findIndex((t) => !t.part.cord);

  it('taken as her milk is, they would slide her top up to 9 mm and turn its strings in corners (so they are not)', () => {
    expect(top.length).toBe(12);
    const { weights, ridden } = at(200);
    expect(Object.keys(weights).sort()).toEqual(['shape:chest:200', 'shape:sides:200']);
    // MEASURED: the string round her back slid 9.5 mm and turned 65 degrees more sharply than at rest over 9 mm of it
    expect(Math.max(...ridden.map(most))).toBeGreaterThan(9);
    expect(Math.max(...cords(ridden).map(({ t, i }) => sharper(t, ridden[i])))).toBeGreaterThan(60);
  });

  it('at her 200% belly her top is lifted where they bring her skin out under it: her cups up to 2.4 mm, a neck string\'s foot 2.8', () => {
    const { lifted } = at(200);
    expect(most(lifted[cups()])).toBeGreaterThan(2.2); expect(most(lifted[cups()])).toBeLessThan(2.7);
    // (the two cords longer than the cups' own that are lifted most: her neck strings, at their feet on her breasts)
    const neck = top.map((t, i) => ({ t, i })).filter(({ t }) => { let high = -Infinity, low = Infinity; for (let v = 1; v < t.part.fields.basePos.length; v += 3) { high = Math.max(high, t.part.fields.basePos[v]); low = Math.min(low, t.part.fields.basePos[v]); } return t.part.cord && high > 0.7 && low < 0.61; });
    expect(neck.length).toBe(2);
    for (const { i } of neck) { expect(most(lifted[i])).toBeGreaterThan(2.3); expect(most(lifted[i])).toBeLessThan(3); }
    // nothing of it more than 3 mm, and its lines stay as they were cut: no cord 13 degrees sharper than at rest (11.6)
    for (const m of lifted) expect(most(m)).toBeLessThan(3);
    for (const { t, i } of cords(lifted)) expect(sharper(t, lifted[i]), `part ${i}`).toBeLessThan(13);
  });

  it('at 100% her cups up to 2.2 mm; and as the room opens her, at 0%, next to nothing', () => {
    const hundred = at(100).lifted, opened = at(0);
    expect(most(hundred[cups()])).toBeGreaterThan(1.9); expect(most(hundred[cups()])).toBeLessThan(2.4);
    for (const m of hundred) expect(most(m)).toBeLessThan(2.6);
    for (const { t, i } of cords(hundred)) expect(sharper(t, hundred[i]), `part ${i}`).toBeLessThan(12);
    // (her 0% shape's refining is whole at 0%, and slides her skin 8.4 mm under the string round her back: it is lifted 0.7)
    expect(Object.keys(opened.weights).sort()).toEqual(['shape:chest:0', 'shape:zeroRefine']);
    expect(most(opened.lifted[cups()])).toBeLessThan(0.4);
    for (const m of opened.lifted) expect(most(m)).toBeLessThan(0.8);
    expect(Math.max(...opened.ridden.map(most))).toBeGreaterThan(8);
  });

  it('her cups and the cord round each are lifted as one layer on the other: the cord stands over the cup as it did', () => {
    // each point of a cup's cord against the cup's point nearest it at rest (within 1.2 mm): how far apart the two are lifted
    const cup = top[cups()].part.fields.basePos, CELL = 0.002 * UNITS_PER_METRE, grid = new Map<string, number[]>();
    for (let v = 0; v < cup.length; v += 3) { const k = `${Math.floor(cup[v] / CELL)},${Math.floor(cup[v + 1] / CELL)},${Math.floor(cup[v + 2] / CELL)}`; const l = grid.get(k); if (l) l.push(v); else grid.set(k, [v]); }
    const nearest = (x: number, y: number, z: number): [number, number] => {
      let best = -1, bd = Infinity; const ci = Math.floor(x / CELL), cj = Math.floor(y / CELL), ck = Math.floor(z / CELL);
      for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (let k = ck - 1; k <= ck + 1; k++) for (const v of grid.get(`${i},${j},${k}`) ?? []) { const d = Math.hypot(cup[v] - x, cup[v + 1] - y, cup[v + 2] - z); if (d < bd) { bd = d; best = v; } }
      return [best, bd * MM];
    };
    // the cord round a cup: a cord all of whose points have a point of the cups within 1.7 mm (MEASURED: 1.63)
    const round = top.map((t, i) => ({ t, i })).filter(({ t }) => { if (!t.part.cord) return false; const p = t.part.fields.basePos; for (let v = 0; v < p.length; v += 3) if (nearest(p[v], p[v + 1], p[v + 2])[1] > 1.7) return false; return true; });
    expect(round.length).toBe(2);
    for (const bump of [0, 100, 200]) {
      const { lifted } = at(bump), cups_ = lifted[cups()];
      let pairs = 0, apart = 0;
      for (const { t, i } of round) {
        const p = t.part.fields.basePos, m = lifted[i];
        for (let v = 0; v < p.length; v += 3) {
          const [u, d] = nearest(p[v], p[v + 1], p[v + 2]); if (u < 0 || d > 1.2) continue;
          pairs++; apart = Math.max(apart, Math.hypot(m[v] - cups_[u], m[v + 1] - cups_[u + 1], m[v + 2] - cups_[u + 2]) * MM);
        }
      }
      expect(pairs).toBeGreaterThan(5000);
      // MEASURED: 0.05 mm at the most at 0%, 0.30 at 100% and 0.26 at 200% (her skin's way out differs that much
      // between the two places of her they follow). With the room each had over her beyond `LIFT_KEEP_M` taken off
      // every point alike it was 0.82 mm at 100% and at 200%, where the cord stood 0.77 over the cup: at 200%, 60 of a
      // cord's points level with the cup under them and 3 beneath it, and in the room the cup showed through its cord
      // along 8 mm of its lower edge
      expect(apart, `at ${bump}%`).toBeLessThan(0.45);
    }
  });

  it('the bow behind her neck is never touched', () => {
    for (const bump of [0, 200]) {
      const { lifted } = at(bump);
      top.forEach((t, i) => { let low = Infinity; for (let v = 1; v < t.part.fields.basePos.length; v += 3) low = Math.min(low, t.part.fields.basePos[v]); if (t.part.cord && low > 0.64) expect(most(lifted[i])).toBe(0); });
    }
  });
});
