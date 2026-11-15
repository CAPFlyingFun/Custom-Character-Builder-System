/**
 * HER BIKINI TOP WITH MILK IN HER BREASTS (Joshua, 2026-11-14: "There is a bug for the breasts when wearing a bikini
 * where when I add more "Milk" size, it doesn't follow the skin but everything else [does]. I set everything at max
 * (size) and it covered but milk for some reason didn't").
 *
 * The room's own body file and her milk file, bound as the room binds them (`SarahLabScene.followMissingGarmentFields`:
 * her top's twelve parts as one garment, `GarmentShapeTransfer.syncSet`), her belly at 0% and MILK at 100 -- the
 * roughest of her milk's fields. What is held here is MEASURED on these files, 2026-11-14:
 * - her cups take her milk (they are moved up to 16 mm with her breasts), and the bow behind her neck none;
 * - her cups, and the cord sewn round each, are EXACTLY as her skin alone has them (`sync`, a part at a time): a cup
 *   covers her because it and her skin under it are moved by the same numbers;
 * - her skin alone turned her strings in corners: a neck string 50 degrees more sharply than at rest over 9 mm of it,
 *   the string between her cups 20, and stepped a string's rings (1.5 mm apart) up to 2.1 mm from one to the next;
 * - evened (`cordEvening.ts`), no string turns 15 degrees more sharply than at rest (12.7 at the most: a neck string
 *   where the top of her breast rises under it) or steps its rings 1.4 mm (1.2), and none is moved 3 mm from where
 *   her skin alone put it (2.7).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CORD_EVENING } from '../src/sarahlab/cordEvening';
import { GarmentShapeTransfer, type GarmentPart } from '../src/sarahlab/garmentShapeTransfer';
import { UNITS_PER_METRE } from '../src/sarahlab/softBody';
import { MILK_FIELD_PREFIX, milkFieldWeights, parseMilkFile } from '../src/sarahlab/zeroRefine';
import type { ShapeFields } from '../src/view/bodyShapeView';

const MM = 1000 / UNITS_PER_METRE;
interface Top { part: GarmentPart; index: Uint32Array; rings: number }
let source: ShapeFields, weights: Record<string, number>, top: Top[], alone: Float32Array[], evened: Float32Array[];

/** A closed tube: every edge of it shared by two of its triangles (the room's `isCord`). */
function isCord(count: number, index: Uint32Array): boolean {
  const edges = new Map<number, number>();
  for (let t = 0; t + 2 < index.length; t += 3) for (let e = 0; e < 3; e++) { const a = index[t + e], b = index[t + (e + 1) % 3]; if (a === b) continue; const k = Math.min(a, b) * count + Math.max(a, b); edges.set(k, (edges.get(k) ?? 0) + 1); }
  for (const n of edges.values()) if (n === 1) return false;
  return edges.size > 0;
}
/** A part's move with her milk's fields laid at their weights: xyz a point. */
function moveOf(fields: ShapeFields): Float32Array {
  const out = new Float32Array(fields.basePos.length);
  for (const [name, w] of Object.entries(weights)) { const f = fields.fields.get(name); if (f) for (let k = 0; k < f.index.length; k++) for (let c = 0; c < 3; c++) out[f.index[k] * 3 + c] += w * f.pos[k * 3 + c]; }
  return out;
}
/** A cord's middle line: one place a ring (her top's cords are rings of twelve points, one after another in the file). */
function middle(pos: Float32Array, move: Float32Array | null, rings: number): number[][] {
  const line: number[][] = [];
  for (let r = 0; r < rings; r++) { const c = [0, 0, 0]; for (let k = 0; k < 12; k++) for (let a = 0; a < 3; a++) c[a] += (pos[(r * 12 + k) * 3 + a] + (move ? move[(r * 12 + k) * 3 + a] : 0)) / 12; line.push(c); }
  return line;
}
/** How sharply a line turns at each of its places (degrees), over three rings either side: 9 mm of cord. */
function turns(line: number[][]): number[] {
  const out: number[] = [];
  for (let i = 3; i + 3 < line.length; i++) {
    const a = line[i].map((x, c) => x - line[i - 3][c]), b = line[i + 3].map((x, c) => x - line[i][c]);
    out.push((Math.acos(Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI);
  }
  return out;
}
const sharper = (t: Top, move: Float32Array): number => { const rest = turns(middle(t.part.fields.basePos, null, t.rings)), now = turns(middle(t.part.fields.basePos, move, t.rings)); return Math.max(...now.map((x, i) => x - rest[i])); };
/** The furthest two of a cord's points that share an edge are moved apart (mm). */
function step(t: Top, move: Float32Array): number {
  let most = 0;
  for (let k = 0; k + 2 < t.index.length; k += 3) for (let e = 0; e < 3; e++) { const a = t.index[k + e] * 3, b = t.index[k + (e + 1) % 3] * 3; most = Math.max(most, Math.hypot(move[a] - move[b], move[a + 1] - move[b + 1], move[a + 2] - move[b + 2])); }
  return most * MM;
}

beforeAll(async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const prims = (await io.read('public/models/sarah-v2-body-slim.glb')).getRoot().listMeshes()[0].listPrimitives();
  const floats = (p: Primitive, name: string): Float32Array => { const a = p.getAttribute(name)!, out = new Float32Array(a.getCount() * 3), e = [0, 0, 0]; for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); out.set(e, i * 3); } return out; };
  const indexOf = (p: Primitive) => Uint32Array.from(p.getIndices()!.getArray()!);
  // her skin, and her milk's fields on it
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(floats(prims[0], 'POSITION'), 3)); g.setIndex(new THREE.BufferAttribute(indexOf(prims[0]), 1));
  const body = new THREE.SkinnedMesh(g), milk = parseMilkFile(new Uint8Array(readFileSync('public/models/sarah-v2-body-milk.bin')).buffer);
  source = { fields: new Map(milk.parts.map((p) => [`${MILK_FIELD_PREFIX}${p.kind}:${p.slider}`, { index: p.index, pos: p.pos, nrm: p.nrm }])), basePos: floats(prims[0], 'POSITION'), baseNrm: floats(prims[0], 'NORMAL'), last: '' };
  weights = milkFieldWeights(0, 100, 0, [...new Set(milk.parts.map((p) => p.slider))].sort((a, b) => a - b), 'hybrid');
  // her top: the `bikini` parts of her file that reach above her waist (the other is the brief, which the room takes out)
  top = [];
  for (const p of prims.slice(1)) {
    if (p.getMaterial()?.getName() !== 'bikini') continue;
    const pos = floats(p, 'POSITION'), index = indexOf(p);
    let high = -Infinity; for (const i of index) high = Math.max(high, pos[i * 3 + 1]);
    if (high < 0.3) continue;
    const cord = isCord(pos.length / 3, index);
    top.push({ part: { mesh: new THREE.Mesh(new THREE.BufferGeometry()), fields: { fields: new Map(), basePos: pos, baseNrm: null, last: '' }, cord }, index, rings: Math.floor(pos.length / 36) });
  }
  const wanted = (name: string) => !!weights[name];
  const one = new GarmentShapeTransfer(body, source);
  alone = top.map((t) => moveOf(one.sync(t.part.mesh, t.part.fields, source, wanted).fields));
  evened = new GarmentShapeTransfer(body, source).syncSet(top.map((t) => t.part), source, wanted).fields.map(moveOf);
}, 60_000);

describe('her bikini top with MILK at 100', () => {
  it('is her file\'s twelve parts: her two cups in one panel, and eleven cords', () => {
    expect(top.length).toBe(12);
    expect(top.filter((t) => !t.part.cord).length).toBe(1);
    expect(Object.keys(weights).sort()).toEqual(['shape:milk:5:0', 'shape:milk:6:0', 'shape:milk:7:0']);
  });

  it('her cups take her milk, and the bow behind her neck none', () => {
    const most = (m: Float32Array) => { let d = 0; for (let v = 0; v < m.length; v += 3) d = Math.max(d, Math.hypot(m[v], m[v + 1], m[v + 2])); return d * MM; };
    const cups = top.findIndex((t) => !t.part.cord);
    expect(most(evened[cups])).toBeGreaterThan(14);
    expect(most(evened[cups])).toBeLessThan(18);
    // (the bow's five parts are behind her neck: none of them is below her collar bones)
    const bow = top.map((t, i) => ({ t, i })).filter(({ t }) => { let low = Infinity; for (let v = 1; v < t.part.fields.basePos.length; v += 3) low = Math.min(low, t.part.fields.basePos[v]); return t.part.cord && low > 0.64; });
    expect(bow.length).toBe(5);
    for (const { i } of bow) expect(most(evened[i])).toBe(0);
  });

  /** Her top's cords that are a cup's own: every point of them within `joinNearM` of the cups. The rest are its strings. */
  function cupCords(): Set<number> {
    const cups = top.find((t) => !t.part.cord)!.part.fields.basePos, near = CORD_EVENING.joinNearM * UNITS_PER_METRE;
    const cells = new Map<string, number[]>(), key = (x: number, y: number, z: number) => `${Math.floor(x / near)},${Math.floor(y / near)},${Math.floor(z / near)}`;
    for (let v = 0; v < cups.length; v += 3) { const k = key(cups[v], cups[v + 1], cups[v + 2]); const list = cells.get(k); if (list) list.push(cups[v], cups[v + 1], cups[v + 2]); else cells.set(k, [cups[v], cups[v + 1], cups[v + 2]]); }
    const byCup = (x: number, y: number, z: number): boolean => {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const list = cells.get(key(x + i * near, y + j * near, z + k * near)); if (list) for (let q = 0; q < list.length; q += 3) if (Math.hypot(list[q] - x, list[q + 1] - y, list[q + 2] - z) <= near) return true; }
      return false;
    };
    const out = new Set<number>();
    top.forEach((t, i) => { if (!t.part.cord) return; const p = t.part.fields.basePos; for (let v = 0; v < p.length; v += 3) if (!byCup(p[v], p[v + 1], p[v + 2])) return; out.add(i); });
    return out;
  }

  it('her cups and the cord sewn round each are exactly as her skin alone has them', () => {
    const own = cupCords();
    expect(own.size).toBe(2);
    for (let i = 0; i < top.length; i++) {
      if (top[i].part.cord && !own.has(i)) continue;
      expect(evened[i].some((x) => x !== 0)).toBe(true);
      let differs = 0;
      for (let k = 0; k < evened[i].length; k++) if (evened[i][k] !== alone[i][k]) differs++;
      expect(differs, `part ${i}`).toBe(0);
    }
  });

  it('her skin alone turned her strings in corners, and stepped their rings apart', () => {
    const own = cupCords(), strings = top.map((t, i) => ({ t, i })).filter(({ t, i }) => t.part.cord && !own.has(i) && alone[i].some((x) => x !== 0));
    // (the string between her cups, the two round her neck, and the one round her back)
    expect(strings.length).toBe(4);
    expect(Math.max(...strings.map(({ t, i }) => sharper(t, alone[i])))).toBeGreaterThan(40);
    expect(Math.max(...strings.map(({ t, i }) => step(t, alone[i])))).toBeGreaterThan(2);
  });

  it('evened, no string turns 15 degrees more sharply than at rest, steps its rings 1.4 mm, or is moved 3 mm from her skin\'s own place', () => {
    const own = cupCords();
    let evenedStrings = 0;
    for (let i = 0; i < top.length; i++) {
      if (!top[i].part.cord || own.has(i) || !evened[i].some((x) => x !== 0)) continue;
      evenedStrings++;
      expect(sharper(top[i], evened[i]), `part ${i}`).toBeLessThan(15);
      expect(step(top[i], evened[i]), `part ${i}`).toBeLessThan(1.4);
      let most = 0;
      for (let v = 0; v < evened[i].length; v += 3) most = Math.max(most, Math.hypot(evened[i][v] - alone[i][v], evened[i][v + 1] - alone[i][v + 1], evened[i][v + 2] - alone[i][v + 2]));
      expect(most * MM, `part ${i}`).toBeLessThan(3);
      expect(most * MM, `part ${i}`).toBeGreaterThan(0.3);
    }
    expect(evenedStrings).toBe(4);
  });
});
