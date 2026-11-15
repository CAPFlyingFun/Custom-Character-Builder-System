/**
 * HER BODY FILE, READ FOR A PICTURE WITHOUT A BROWSER (`raster.mjs`): her rest skin in her rest METRES -- her feet at
 * y = 0, facing +z, +y up, +x HER LEFT, the frame `faceRig.ts`, `topCut.ts`'s tests and the hair bake all work in --
 * with what a sketch of her needs beside it: her normals, her picture's place on her (UVs) and her skin's picture, which
 * of her skin is her arm's, where her joints are, and each point's bones.
 *
 * The room's file is `public/models/sarah-v2-body-slim.glb`; her mesh's own units are 1.11142 of them a metre
 * (`softBody.ts` `UNITS_PER_METRE`), and `rest = 0.89974678 * position + (0, 0.8002533, -0.0340415)` (`faceRig.ts`).
 * What the room lays on her afterwards (her shapes, her face's layer, her pose) is not here: this is her as her file has her.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readBody } from '../sarahV2SideLock.mjs';
import { readPicture } from './raster.mjs';

export const BODY_FILE = 'public/models/sarah-v2-body-slim.glb';
/** The skin she wears unless another is chosen (`skinChoices.ts`: EVEN). */
export const SKIN_PICTURE = 'public/models/skins/sarah-v2-skin-even-2048.webp';
/** Her joints by what they are (the names `tests/topCut.test.ts` gives `topFrame`), and her head's and neck's bones. */
export const JOINTS = Object.freeze({
  neck: 'Bone_017', head: 'Bone_016', chest: 'Bone_002', hipL: 'Bone_014', hipR: 'Bone_009',
  shoulderL: 'Bone_026', elbowL: 'Bone_025', wristL: 'Bone_024', shoulderR: 'Bone_021', elbowR: 'Bone_020', wristR: 'Bone_019',
  // (what a bottom's frame asks besides: `bottomCut.lowFrame`)
  pelvis: 'Bone_001', spine: 'Bone_004', kneeL: 'Bone_013', ankleL: 'Bone_012', kneeR: 'Bone_008', ankleR: 'Bone_007',
});

export async function gltfIo() {
  await MeshoptDecoder.ready;
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
}

/**
 * Her body: {
 *   rest      Float32Array, xyz a point, her rest METRES
 *   normal    Float32Array, xyz a point, unit (her file's own)
 *   uv        Float32Array, uv a point (v as her file has it: 0 at the picture's TOP row)
 *   index     Uint32Array, three a triangle
 *   armShare  Float32Array, a point: 1 her arm's skin, 0 the rest of her (the bone that weighs most on it says)
 *   limb      Float32Array, a point: 1 her arm's skin, -1 her leg's (her seat and her hips' sides among it: they hang
 *             from her thigh bones), 0 the rest of her -- `bottomCut.limbSkin`, as the room lays it on her
 *   lowJoints the ten `bottomCut.lowFrame` asks for, ready to hand it (with `unitsPerMetre: 1`)
 *   bones     { joints: Uint8/16Array (four a point), weights: Uint8Array (four a point, of 255), names: string[] }
 *   joint(name)  a bone's place at rest, metres ([x, y, z]); `JOINTS` names the ones a top's frame and her head use
 *   frameJoints  the nine `topCut.topFrame` asks for, ready to hand it (with `unitsPerMetre: 1`)
 *   skin      her skin's picture (`readPicture`), or null when `picture` is false
 * }
 */
export async function loadBody({ file = BODY_FILE, picture = true } = {}) {
  const io = await gltfIo(), doc = await io.read(file), body = readBody(doc), part = body.skin, n = part.n;
  const floats = (a, size) => { const out = new Float32Array(a.getCount() * size), e = []; for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); for (let c = 0; c < size; c++) out[i * size + c] = e[c]; } return out; };
  const normal = floats(part.prim.getAttribute('NORMAL'), 3);
  for (let v = 0; v < n; v++) { const l = Math.hypot(normal[v * 3], normal[v * 3 + 1], normal[v * 3 + 2]) || 1; normal[v * 3] /= l; normal[v * 3 + 1] /= l; normal[v * 3 + 2] /= l; }
  const uvAt = part.prim.getAttribute('TEXCOORD_0'), uv = uvAt ? floats(uvAt, 2) : new Float32Array(n * 2);
  const armShare = new Float32Array(n);
  for (let v = 0; v < n; v++) { let best = 0; for (let k = 1; k < 4; k++) if (part.weights[v * 4 + k] > part.weights[v * 4 + best]) best = k; armShare[v] = body.isArm[part.joints[v * 4 + best]]; }
  const skin = doc.getRoot().listSkins()[0], list = skin.listJoints();
  const joint = (name) => { const j = list.find((x) => x.getName() === name); if (!j) throw new Error(`no joint ${name}`); return j.getWorldTranslation(); };
  const frameJoints = Object.fromEntries(['neck', 'hipL', 'hipR', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR'].map((k) => [k, joint(JOINTS[k])]));
  const lowJoints = Object.fromEntries(['pelvis', 'spine', 'chest', 'neck', 'hipL', 'kneeL', 'ankleL', 'hipR', 'kneeR', 'ankleR'].map((k) => [k, joint(JOINTS[k])]));
  // her leg's bones: each hip joint's bone and every bone under it
  const hips = [JOINTS.hipL, JOINTS.hipR].map((name) => list.find((x) => x.getName() === name));
  const underHip = (j) => { for (let x = j; x; x = x.getParentNode?.()) { if (hips.includes(x)) return true; if (!list.includes(x)) return false; } return false; };
  const isLeg = Uint8Array.from(list, (j) => (underHip(j) ? 1 : 0));
  const limb = new Float32Array(n);
  for (let v = 0; v < n; v++) { let best = 0; for (let k = 1; k < 4; k++) if (part.weights[v * 4 + k] > part.weights[v * 4 + best]) best = k; limb[v] = armShare[v] ? 1 : isLeg[part.joints[v * 4 + best]] ? -1 : 0; }
  return {
    rest: Float32Array.from(part.rest), normal, uv, index: Uint32Array.from(part.index), armShare, limb,
    bones: { joints: part.joints, weights: part.weights, names: body.joints },
    joint, frameJoints, lowJoints, skin: picture ? await readPicture(SKIN_PICTURE) : null,
  };
}

/** Only the triangles with every corner inside a box of her (metres): `{ index }` for `raster.draw`, her points left as they are. */
export function within(body, { yFrom = -Infinity, yTo = Infinity, xFrom = -Infinity, xTo = Infinity } = {}) {
  const P = body.rest, out = [];
  for (let t = 0; t + 2 < body.index.length; t += 3) {
    let ok = true;
    for (let c = 0; c < 3 && ok; c++) { const v = body.index[t + c], x = P[v * 3], y = P[v * 3 + 1]; ok = y >= yFrom && y <= yTo && x >= xFrom && x <= xTo; }
    if (ok) out.push(body.index[t], body.index[t + 1], body.index[t + 2]);
  }
  return Uint32Array.from(out);
}

/** Her skin as a mesh for `raster.draw`: her own picture's colour under the one light (or `colour`, [r, g, b] 0..1, where `paint(f)` gives none). */
export function skinMesh(body, { index = body.index, colour = [0.86, 0.68, 0.6], paint = null } = {}) {
  return {
    pos: body.rest, index, nrm: body.normal,
    shade: (f) => {
      const own = paint ? paint(f) : null;
      let c = own;
      if (!c) { if (body.skin) { const [u, v] = f.at(body.uv, 2), t = body.skin.texel(u, v); c = [t[0], t[1], t[2]]; } else c = colour; }
      return [c[0] * f.light, c[1] * f.light, c[2] * f.light];
    },
  };
}
