import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { baseShapeFields, applyShapeFields } from '../src/view/bodyShapeView';
import { GarmentShapeTransfer } from '../src/sarahlab/garmentShapeTransfer';
import { FOLLOWS_HER_SHAPES, GARMENTS, RECOVERED_SHIRTS, followsHerShapes } from '../src/sarahlab/sarahLabTool';

function setup() {
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));g.setIndex([0,1,2]);
  const body=new THREE.SkinnedMesh(g), fields=baseShapeFields(body);
  const cloth=new THREE.Mesh(new THREE.BufferGeometry());cloth.geometry.setAttribute('position',new THREE.Float32BufferAttribute([.25,.25,.01],3));
  const garment=baseShapeFields(cloth);
  return {body,fields,cloth,garment};
}
const field=(z:number)=>({index:new Uint32Array([0,1,2]),pos:new Float32Array([0,0,z,0,0,2*z,0,0,3*z]),nrm:null});

describe('missing body fields on existing fitted clothing',()=>{
  it('transfers sparse deltas barycentrically without removing fitted clearance',()=>{
    const {body,fields,cloth,garment}=setup();
    (fields.fields as Map<string,ReturnType<typeof field>>).set('shape:milk:1:100',field(.1));
    const transfer=new GarmentShapeTransfer(body,fields);
    const result=transfer.sync(cloth,garment,fields); expect(result.added).toBe(1); Object.assign(garment,result.fields);
    applyShapeFields(cloth,garment,{'shape:milk:1:100':1});
    expect(cloth.geometry.getAttribute('position').getZ(0)).toBeCloseTo(.185,6);
    expect(transfer.sync(cloth,garment,fields).added).toBe(0);
  });
  it('keeps authored garment fields and ignores body anatomy fields',()=>{
    const {body,fields,cloth,garment}=setup();
    const native=field(.2), source=field(.1);
    (garment.fields as Map<string,typeof native>).set('shape:milk:1:100',native);
    (fields.fields as Map<string,typeof source>).set('shape:milk:1:100',source);
    (fields.fields as Map<string,typeof source>).set('shape:birthRoom',source);
    const transfer=new GarmentShapeTransfer(body,fields);
    expect(transfer.sync(cloth,garment,fields).added).toBe(0);
    expect(garment.fields.get('shape:milk:1:100')).toBe(native);
    expect(garment.fields.has('shape:birthRoom')).toBe(false);
  });
  it('accepts asynchronously replaced source fields and invalidates the applied cache',()=>{
    const {body,fields,cloth,garment}=setup();
    const map=new Map([['shape:baby:1:100',field(.1)]]), source={...fields,fields:map};
    const transfer=new GarmentShapeTransfer(body,fields);
    Object.assign(garment,transfer.sync(cloth,garment,source).fields); applyShapeFields(cloth,garment,{'shape:baby:1:100':1});
    map.set('shape:baby:1:100',field(.2));
    const result=transfer.sync(cloth,garment,source); expect(result.added).toBe(1); Object.assign(garment,result.fields);
    applyShapeFields(cloth,garment,{'shape:baby:1:100':1});
    expect(cloth.geometry.getAttribute('position').getZ(0)).toBeCloseTo(.36,6);
  });
});

it('prepares only requested nonzero fields so untouched presets do not allocate every field',()=>{
 const {body,fields,cloth,garment}=setup();
 const map=new Map([['shape:milk:1:100',field(.1)],['shape:baby:1:100',field(.2)]]), source={...fields,fields:map};
 const transfer=new GarmentShapeTransfer(body,fields);
 const inactive=transfer.sync(cloth,garment,source,()=>false);
 expect(inactive.added).toBe(0);expect(inactive.fields).toBe(garment);
 const active=transfer.sync(cloth,garment,source,n=>n.startsWith('shape:milk:'));
 expect(active.added).toBe(1);expect(active.fields.fields.has('shape:baby:1:100')).toBe(false);
});

/**
 * WHICH OF HER BODY FILE'S OWN GARMENTS ARE GIVEN THEM (Joshua, 2026-11-14, of her bikini: "when I add more Milk size, it
 * doesn't follow the skin but everything else [does]"). Her milk's and her baby's weight's shapes are laid on her body
 * from files of their own, so a garment in her body file has none of them: her bikini top stayed where it was while MILK
 * filled her breasts out through its cups (MEASURED in the room at MILK 100, on v0.9.23 and v0.9.24 alike).
 */
describe('her body file\'s garments that take her milk from her skin', () => {
  it('her bikini top does: its cups, and its edging\'s parts with them (the cord round each cup, its strings)', () => {
    expect(followsHerShapes('bikini')).toBe(true);
    expect(followsHerShapes('bikiniTrim')).toBe(true);
  });
  it('nothing else is named: not her skin, her hair, a recovered shirt (those are told by their own mark) or a name like it', () => {
    for (const name of ['', 'skin', 'hair', 'bikiniBottom', 'Trim', 'bikiniTrimTrim', ...RECOVERED_SHIRTS, ...GARMENTS.filter((g) => !FOLLOWS_HER_SHAPES.includes(g))]) expect(followsHerShapes(name), name).toBe(false);
    expect(FOLLOWS_HER_SHAPES).toEqual(['bikini']);
    for (const g of FOLLOWS_HER_SHAPES) expect(GARMENTS as readonly string[]).toContain(g);
  });
});

/**
 * ITS PARTS AS ONE GARMENT, ITS STRINGS EVENED (`syncSet`, cordEvening.ts). Her skin here is a flat sheet in columns 8 mm
 * apart, a metre a unit, and its field slides each column sideways by its own amount and lifts all of it 4 mm. The
 * garment is a panel, the cord sewn along its edge, and a string a centimetre from it: a string laid across the columns
 * turns a corner at each by `sync`, and runs smooth by `syncSet`; the panel and its own cord are the same by both.
 */
describe('a garment of several parts bound as one, its strings evened', () => {
  const SLIDE = [0.0016, -0.0012, 0.002, -0.0004, 0.0013, -0.0019, 0.0008, -0.0015, 0.0017, -0.0006, 0.0011, -0.0014, 0.0005];
  const NAME = 'shape:milk:5:0', RINGS = 56;
  function skin() {
    const pos: number[] = [], nrm: number[] = [], index: number[] = [], COLS = SLIDE.length, ROWS = 7;
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { pos.push(c * 0.008, (r - 3) * 0.008, 0); nrm.push(0, 0, 1); }
    for (let c = 0; c + 1 < COLS; c++) for (let r = 0; r + 1 < ROWS; r++) { const a = c * ROWS + r, b = a + ROWS; index.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(index);
    const body = new THREE.SkinnedMesh(g), fields = baseShapeFields(body), n = pos.length / 3;
    const milk = { index: Uint32Array.from({ length: n }, (_x, i) => i), pos: Float32Array.from({ length: n * 3 }, (_x, k) => (k % 3 === 1 ? SLIDE[Math.floor(k / 3 / ROWS)] : k % 3 === 2 ? 0.004 : 0)), nrm: null };
    return { body, fields: { ...fields, fields: new Map([[NAME, milk]]) } };
  }
  /** A lace along x (four points a ring, rings 1.5 mm apart, 1 mm off her) with its middle line at `y`. */
  const lace = (y: number): number[] => { const pos: number[] = []; for (let r = 0; r < RINGS; r++) for (const [side, up] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) pos.push(0.004 + r * 0.0015, y + side * 0.001, 0.001 + up * 0.0003); return pos; };
  function garment() {
    const panelPos: number[] = [];
    for (let r = 0; r < RINGS; r++) for (let y = -0.012; y <= 0.0001; y += 0.001) panelPos.push(0.004 + r * 0.0015, y, 0.0003);
    const part = (pos: number[], cord: boolean) => { const m = new THREE.Mesh(new THREE.BufferGeometry()); m.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return { mesh: m, fields: baseShapeFields(m), cord }; };
    // the panel (y from -12 mm to 0), the cord sewn along its edge (over its last 2 mm), and a string a centimetre off (y = +10 mm)
    return { cloth: part(panelPos, false), round: part(lace(-0.001), true), string: part(lace(0.01), true) };
  }
  const dense = (base: Float32Array, field: { index: Uint32Array; pos: Float32Array }): Float32Array => { const move = new Float32Array(base.length); field.index.forEach((v, k) => move.set(field.pos.subarray(k * 3, k * 3 + 3), v * 3)); return move; };
  /** A lace's middle line's sharpest turn (degrees over three rings either side) with the field laid at full weight; `front`: as seen from in front of her, its height off her left out. */
  function sharpest(base: Float32Array, field: { index: Uint32Array; pos: Float32Array }, front = false): number {
    const move = dense(base, field), line: number[][] = [];
    for (let r = 0; r < RINGS; r++) { const c = [0, 0, 0]; for (let k = 0; k < 4; k++) for (let a = 0; a < (front ? 2 : 3); a++) c[a] += (base[(r * 4 + k) * 3 + a] + move[(r * 4 + k) * 3 + a]) / 4; line.push(c); }
    let worst = 0;
    for (let i = 3; i + 3 < line.length; i++) {
      const a = line[i].map((x, c) => x - line[i - 3][c]), b = line[i + 3].map((x, c) => x - line[i][c]);
      worst = Math.max(worst, (Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b)))) * 180) / Math.PI);
    }
    return worst;
  }
  const aloneOf = (body: THREE.SkinnedMesh, fields: ReturnType<typeof skin>['fields'], part: { mesh: THREE.Mesh; fields: ReturnType<typeof baseShapeFields> }) => new GarmentShapeTransfer(body, fields, 0.05).sync(part.mesh, part.fields, fields).fields.fields.get(NAME)!;

  it('the string runs smooth where her skin alone gave it corners, and is not lowered into her', () => {
    const { body, fields } = skin(), { cloth, round, string } = garment();
    const alone = aloneOf(body, fields, string);
    expect(sharpest(string.fields.basePos, alone)).toBeGreaterThan(15);
    const result = new GarmentShapeTransfer(body, fields, 0.05).syncSet([cloth, round, string], fields);
    expect(result.added).toBe(3);
    const evened = result.fields[2].fields.get(NAME)!;
    // (seen from in front of her; and with its height off her, which the lift below waves by a few tenths of a millimetre)
    expect(sharpest(string.fields.basePos, alone, true)).toBeGreaterThan(15);
    expect(sharpest(string.fields.basePos, evened, true)).toBeLessThan(5);
    expect(sharpest(string.fields.basePos, evened)).toBeLessThan(12);
    // lifted with her skin (4 mm), and a little more where it is slid along her: never less
    const was = dense(string.fields.basePos, alone), now = dense(string.fields.basePos, evened);
    for (let v = 0; v < now.length; v += 3) { expect(now[v + 2]).toBeGreaterThanOrEqual(0.004 - 1e-7); expect(now[v + 2] - 0.004).toBeLessThanOrEqual(0.4 * Math.hypot(now[v] - was[v], now[v + 1] - was[v + 1]) + 1e-7); }
  });

  it('the panel and the cord sewn round it are exactly as her skin alone has them', () => {
    const { body, fields } = skin(), { cloth, round, string } = garment();
    const result = new GarmentShapeTransfer(body, fields, 0.05).syncSet([cloth, round, string], fields);
    for (const [i, part] of [[0, cloth], [1, round]] as const) {
      const set = result.fields[i].fields.get(NAME)!, alone = aloneOf(body, fields, part);
      expect(Array.from(set.index)).toEqual(Array.from(alone.index));
      expect(Array.from(set.pos)).toEqual(Array.from(alone.pos));
    }
    // (and that cord does turn corners: it rides her skin's slide with the panel's edge, which is what keeps them together)
    expect(sharpest(round.fields.basePos, result.fields[1].fields.get(NAME)!)).toBeGreaterThan(15);
  });

  it('lays a field once: asked again with nothing changed, nothing is added and the same fields come back', () => {
    const { body, fields } = skin(), { cloth, round, string } = garment(), transfer = new GarmentShapeTransfer(body, fields, 0.05);
    const first = transfer.syncSet([cloth, round, string], fields), parts = [cloth, round, string].map((p, i) => ({ ...p, fields: first.fields[i] }));
    const again = transfer.syncSet(parts, fields);
    expect(again.added).toBe(0);
    again.fields.forEach((f, i) => expect(f).toBe(first.fields[i]));
    // only the fields asked for, and none when none is
    expect(transfer.syncSet(parts, fields, () => false).added).toBe(0);
    expect(first.fields[2].fields.size).toBe(1);
  });

  it('keeps a part\'s own field, and lays a field again when her skin\'s is replaced', () => {
    const { body, fields } = skin(), { cloth, round, string } = garment(), transfer = new GarmentShapeTransfer(body, fields, 0.05);
    const own = { index: new Uint32Array([0]), pos: new Float32Array([0, 0, 0.01]), nrm: null };
    const withOwn = { ...cloth, fields: { ...cloth.fields, fields: new Map([[NAME, own]]) } };
    const first = transfer.syncSet([withOwn, round, string], fields);
    expect(first.added).toBe(2);
    expect(first.fields[0].fields.get(NAME)).toBe(own);
    const was = first.fields[2].fields.get(NAME)!;
    // her skin's field replaced by one twice as big: the string's is laid again
    const source = fields.fields.get(NAME)!, twice = { ...fields, fields: new Map([[NAME, { ...source, pos: source.pos.map((x) => 2 * x) }]]) };
    const second = transfer.syncSet([withOwn, round, string].map((p, i) => ({ ...p, fields: first.fields[i] })), twice);
    expect(second.added).toBe(2);
    const now = second.fields[2].fields.get(NAME)!;
    expect(now).not.toBe(was);
    // (lifted with her skin twice as far, 8 mm, and slid twice as far)
    const a = dense(string.fields.basePos, was), b = dense(string.fields.basePos, now);
    for (let v = 0; v < a.length; v += 3) { expect(b[v + 1]).toBeCloseTo(2 * a[v + 1], 6); expect(b[v + 2]).toBeGreaterThanOrEqual(0.008 - 1e-7); }
    expect(second.fields[0].fields.get(NAME)).toBe(own);
  });
});
