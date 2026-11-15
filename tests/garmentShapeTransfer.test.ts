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
