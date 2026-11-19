import { describe, expect, it } from 'vitest';
import { Document } from '@gltf-transform/core';
import sharp from 'sharp';
import { Vector3 } from 'three';
// Bake modules are JavaScript, also used by the command-line rebuild.
// @ts-ignore
import { recoverSarahBody, fairSarahChest, softenSarahChestRelief } from '../scripts/rebakeSarah.mjs';
// @ts-ignore
import { growClothes, GARMENTS } from '../scripts/growClothes.mjs';

// @ts-ignore
import { fitClothToSkin } from '../scripts/fitClothToSkin.mjs';

// @ts-ignore
import { shirtFrontDepthGuide } from '../scripts/refineEarlyShirt.mjs';

it('interpolates sparse front rows without pulling the shirt toward back-panel samples', () => {
  const guide = shirtFrontDepthGuide(new Float32Array([
    0, .912, .10,
    0, .928, -.18, // this row contains back cloth only
    0, .944, .12,
    .20, .928, .30, // the side is not the centre profile
  ]));
  expect(guide(.928)).toBeCloseTo(.11, 6);
  expect(guide(.924)).toBeCloseTo(.1075, 6);
  expect(guide(.932)).toBeCloseTo(.1125, 6);
});


describe('Sarah clothing rebuild', () => {
  it('updates fabric lighting to match the fitted triangle', () => {
    const doc=new Document(), buffer=doc.createBuffer();
    const attr=(v:number[])=>doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(v));
    const ids=()=>doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint16Array([0,1,2]));
    const body=doc.createPrimitive().setMaterial(doc.createMaterial('Material_0'))
      .setAttribute('POSITION',attr([-1,-1,0,1,-1,0,0,1,0]))
      .setAttribute('NORMAL',attr([0,0,1,0,0,1,0,0,1])).setIndices(ids());
    const shirt=doc.createPrimitive().setMaterial(doc.createMaterial('shirt'))
      .setAttribute('POSITION',attr([0,0,-.004,.1,0,.002,0,.1,.05]))
      .setAttribute('NORMAL',attr([0,0,1,0,0,1,0,0,1])).setIndices(ids());
    doc.createMesh().addPrimitive(body).addPrimitive(shirt);
    fitClothToSkin(doc);
    const p=shirt.getAttribute('POSITION')!.getArray()!, n=shirt.getAttribute('NORMAL')!.getArray()!;
    const a=new Vector3().fromArray(p,0), b=new Vector3().fromArray(p,3), c=new Vector3().fromArray(p,6);
    const expected=b.sub(a).cross(c.sub(a)).normalize();
    expect(new Vector3().fromArray(n,0).dot(expected)).toBeGreaterThan(.9999);
  });

  it('fits inward fabric outside retained skin without flattening a distant drape', () => {
    const doc = new Document(), buffer = doc.createBuffer();
    const attr = (values: number[]) => doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(values));
    const skin = doc.createPrimitive().setMaterial(doc.createMaterial('Material_0'))
      .setAttribute('POSITION', attr([-1,-1,0,1,-1,0,0,1,0]))
      .setAttribute('NORMAL', attr([0,0,1,0,0,1,0,0,1]))
      .setIndices(doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint16Array([0,1,2])));
    const fabric = doc.createPrimitive().setMaterial(doc.createMaterial('shirt'))
      .setAttribute('POSITION', attr([0,0,-.004,.1,0,.002,0,.1,.05]));
    doc.createMesh().addPrimitive(skin).addPrimitive(fabric);
    fitClothToSkin(doc);
    const positions = fabric.getAttribute('POSITION')!.getArray()!;
    expect(positions[2]).toBeCloseTo(.006,6);
    expect(positions[5]).toBeCloseTo(.006,6);
    expect(positions[8]).toBeCloseTo(.05,6);
  });

  it('smooths per-vertex skin weights across the shirt surface', () => {
    const doc = new Document(), buffer = doc.createBuffer();
    const attr = (type: 'VEC3' | 'VEC4', values: number[], integer = false) => {
      const accessor = doc.createAccessor().setBuffer(buffer).setType(type).setArray(integer ? new Uint16Array(values) : new Float32Array(values));
      return accessor;
    };
    const indices = (values: number[]) => doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint16Array(values));
    const body = doc.createPrimitive().setMaterial(doc.createMaterial('Material_0'))
      .setAttribute('POSITION', attr('VEC3',[-1,-1,0,1,-1,0,-1,1,0,1,1,0]))
      .setAttribute('NORMAL', attr('VEC3',[0,0,1,0,0,1,0,0,1,0,0,1]))
      .setAttribute('JOINTS_0', attr('VEC4',[0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0],true))
      .setAttribute('WEIGHTS_0', attr('VEC4',[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]))
      .setIndices(indices([0,1,2,1,3,2]));
    const shirt = doc.createPrimitive().setMaterial(doc.createMaterial('shirt'))
      .setAttribute('POSITION', attr('VEC3',[-1,-1,-.002,1,-1,-.002,-1,1,-.002,1,1,-.002]))
      .setAttribute('JOINTS_0', attr('VEC4',[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],true))
      .setAttribute('WEIGHTS_0', attr('VEC4',[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]))
      .setIndices(indices([0,1,2,1,3,2]));
    doc.createMesh().addPrimitive(body).addPrimitive(shirt);
    fitClothToSkin(doc,{sliderSamples:[{percent:100,weights:{}}]});
    const weights = shirt.getAttribute('WEIGHTS_0')!.getArray()!;
    expect(weights[0]).toBeGreaterThan(0.1);
    expect(weights[8]).toBeGreaterThan(0.1);
    expect(Math.abs(weights[0]-weights[8])).toBeLessThan(.5);
    for(let i=0;i<4;i++)expect(weights[i*4]+weights[i*4+1]+weights[i*4+2]+weights[i*4+3]).toBeCloseTo(1,6);
  });

  it('softens drawn chest creases only inside the UV mask and only once', async () => {
    const doc = new Document(), buffer = doc.createBuffer();
    const attr = (type: 'VEC3' | 'VEC2', values: number[]) => doc.createAccessor().setType(type).setBuffer(buffer).setArray(new Float32Array(values));
    const colour = Buffer.alloc(16*16*3, 200), crease = (6*16+6)*3;
    colour.fill(50, crease, crease+3);
    const normal = Buffer.alloc(16*16*3);
    for(let i=0;i<256;i++) normal.set([128,128,255],i*3);
    const png = (data: Buffer) => sharp(data,{raw:{width:16,height:16,channels:3}}).png().toBuffer();
    const texture = doc.createTexture().setImage(await png(colour));
    const material = doc.createMaterial().setBaseColorTexture(texture)
      .setNormalTexture(doc.createTexture().setImage(await png(normal)));
    const body = doc.createPrimitive().setMaterial(material)
      .setAttribute('POSITION',attr('VEC3',[-.02,1.2,.04,.02,1.2,.04,0,1.25,.04]))
      .setAttribute('TEXCOORD_0',attr('VEC2',[.25,.25,.75,.25,.25,.75]))
      .setIndices(doc.createAccessor().setType('SCALAR').setBuffer(buffer).setArray(new Uint16Array([0,1,2])));
    await softenSarahChestRelief(body);
    const out = await sharp(texture.getImage()!).raw().toBuffer();
    expect(out[crease]).toBeGreaterThan(100);
    expect(Array.from(out.subarray(0,3))).toEqual([200,200,200]);
    const saved = new Uint8Array(texture.getImage()!);
    await softenSarahChestRelief(body);
    expect(new Uint8Array(texture.getImage()!)).toEqual(saved);
  });


});
