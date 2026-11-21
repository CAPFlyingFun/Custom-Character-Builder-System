/**
 * A HAIRSTYLE'S FILE (the contract every hair file keeps; the room and other agents rely on it): one skinned mesh on her
 * skeleton -- her body file's own joints, in their order, so the room binds it to her as it binds every recovered garment
 * -- one material named `sarahHair` (alpha-tested at 0.42, double-sided), one texture (the copper atlas, WebP), vertex
 * colour multiplying it, meshopt-compressed, and `extras.sarahHair` saying what it is:
 * `{ version, style, parts, vertices, triangles, texture, length }`.
 *
 * A style with a range of lengths carries ONE morph target, `shorter` (weight 1 its shortest; the room sets it to
 * 1 - length): positions, and normals.
 *
 * Written into a copy of her body file (its skeleton and nodes kept, her mesh and pictures taken out), as the first
 * hairstyle's script did; `asToday` writes that script's extras exactly (and no morph), so its file can be compared
 * byte for byte.
 *
 * For HIM (`body` 'male', `head.mjs` `BODIES.male`): written into a copy of HIS body file, on his skeleton, its points
 * and normals taken from the frame the style was drawn in back into his geometry.
 */
import { statSync } from 'node:fs';
import { EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { BODIES, REST_OFFSET, REST_SCALE, bodyOf, dirFromRest, fromRest, hairIo } from './head.mjs';

/** Only the vertices a triangle uses (a cap's grid runs past her hairline, and those past it are left out). */
export function compact(out, extra = []) {
  const used = new Int32Array(out.pos.length / 3).fill(-1); let n = 0;
  for (const v of out.index) if (used[v] < 0) used[v] = n++;
  const pick = (arr, size) => { const r = new Array(n * size); for (let v = 0; v < used.length; v++) if (used[v] >= 0) for (let k = 0; k < size; k++) r[used[v] * size + k] = arr[v * size + k]; return r; };
  const res = { pos: pick(out.pos, 3), nrm: pick(out.nrm, 3), uv: pick(out.uv, 2), col: pick(out.col, 4), joints: pick(out.joints, 4), weights: pick(out.weights, 4), index: out.index.map((v) => used[v]) };
  return { ...res, extra: extra.map((e) => ({ pos: pick(e.pos, 3), nrm: pick(e.nrm, 3) })) };
}

/**
 * Write the file. built: a kit's `out` (long form) and `parts`; shorter: the short form's `out` (same points) or null;
 * webp: the atlas; style: its id.
 */
export async function writeHair({ bodyFile, target, built, parts, shorter = null, webp, texSize, style, asToday = false, body = null }) {
  const io = await hairIo(), doc = await io.read(bodyFile), b = bodyOf(body ?? bodyFile), own = b === BODIES.female;
  const c = compact(built, shorter ? [shorter] : []);
  const geomPos = new Float32Array(c.pos.length);
  // (hers exactly as it always was; another body's back through its frame, its normals turned with it)
  if (own) for (let i = 0; i < c.pos.length; i += 3) for (let k = 0; k < 3; k++) geomPos[i + k] = (c.pos[i + k] - REST_OFFSET[k]) / REST_SCALE;
  else for (let i = 0; i < c.pos.length; i += 3) {
    geomPos.set(fromRest(b, [c.pos[i], c.pos[i + 1], c.pos[i + 2]]), i);
    c.nrm.splice(i, 3, ...dirFromRest(b, [c.nrm[i], c.nrm[i + 1], c.nrm[i + 2]]));
    for (const e of c.extra) e.nrm.splice(i, 3, ...dirFromRest(b, [e.nrm[i], e.nrm[i + 1], e.nrm[i + 2]]));
  }
  for (const m of doc.getRoot().listMeshes()) m.dispose();
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const m of doc.getRoot().listMaterials()) m.dispose();
  const buffer = doc.getRoot().listBuffers()[0];
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const texture = doc.createTexture('sarah-hair').setImage(new Uint8Array(webp)).setMimeType('image/webp');
  doc.createExtension(EXTTextureWebP).setRequired(true);
  const material = doc.createMaterial('sarahHair').setBaseColorTexture(texture).setRoughnessFactor(0.62).setMetallicFactor(0)
    .setAlphaMode('MASK').setAlphaCutoff(0.42).setDoubleSided(true);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', geomPos))
    .setAttribute('NORMAL', acc('VEC3', Float32Array.from(c.nrm)))
    .setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(c.uv)))
    .setAttribute('COLOR_0', acc('VEC4', Float32Array.from(c.col)))
    .setAttribute('JOINTS_0', acc('VEC4', Uint16Array.from(c.joints)))
    .setAttribute('WEIGHTS_0', acc('VEC4', Float32Array.from(c.weights)))
    .setIndices(acc('SCALAR', c.pos.length / 3 <= 65535 ? Uint16Array.from(c.index) : Uint32Array.from(c.index)))
    .setMaterial(material);
  const hairMesh = doc.createMesh('sarahHair').addPrimitive(prim);
  if (c.extra.length) {
    const s = c.extra[0], dp = new Float32Array(c.pos.length), dn = new Float32Array(c.pos.length);
    // the morph in her geometry units: the short form's place less the long form's, through the same scale
    if (own) for (let i = 0; i < c.pos.length; i++) { dp[i] = (s.pos[i] - c.pos[i]) / REST_SCALE; dn[i] = s.nrm[i] - c.nrm[i]; }
    else for (let i = 0; i < c.pos.length; i += 3) {
      const q = fromRest(b, [s.pos[i], s.pos[i + 1], s.pos[i + 2]]);
      for (let k = 0; k < 3; k++) { dp[i + k] = q[k] - geomPos[i + k]; dn[i + k] = s.nrm[i + k] - c.nrm[i + k]; }
    }
    prim.addTarget(doc.createPrimitiveTarget('shorter').setAttribute('POSITION', acc('VEC3', dp)).setAttribute('NORMAL', acc('VEC3', dn)));
    hairMesh.setWeights([0]);
  }
  const vertices = c.pos.length / 3, triangles = c.index.length / 3;
  hairMesh.setExtras(asToday
    ? { sarahHair: { version: 1, parts, vertices, triangles, texture: texSize } }
    : { sarahHair: { version: 2, style, parts, vertices, triangles, texture: texSize, length: !!shorter }, ...(shorter ? { targetNames: ['shorter'] } : {}) });
  const node = doc.getRoot().listNodes().find((n) => n.getSkin());
  node.setMesh(hairMesh).setName('sarahHair');
  await doc.transform(prune({ keepAttributes: false, keepLeaves: true }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(target, doc);
  return { kb: statSync(target).size / 1024, vertices, triangles };
}
