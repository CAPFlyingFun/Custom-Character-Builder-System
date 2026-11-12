import { beforeAll, describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { SKIN_SHELL, bakeSkinShell, bridgeLift, layShell, normalizeEach, sampleSkin, smoothDirections, type SkinShellBake } from '../src/sarahlab/skinShell';
import { bikiniBottomField } from '../src/sarahlab/bikiniBottomStencil';

// HER BIKINI BOTTOM MADE FROM HER SKIN, ON HER (Joshua, 2026-11-11): the shipped outline cut from her own body file at
// rest -- one piece, one edge all round (a hole in it was hemmed into a slit down her cleft: the review), and its robe
// spanning her folds without turning the garment over.
let pos: Float32Array, idx: Uint32Array, nrm: Float32Array, bake: SkinShellBake;
beforeAll(async () => {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read('assets-archive/models/sarah-v2-body.glb');
  // her rest frame (metres): the first joint's world matrix times its inverse bind
  const skin = doc.getRoot().listSkins()[0], J = skin.listJoints()[0].getWorldMatrix(), B = Array.from(skin.getInverseBindMatrices()!.getArray()!.slice(0, 16));
  const T = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) T[c * 4 + r] += J[k * 4 + r] * B[c * 4 + k];
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0], A = prim.getAttribute('POSITION')!, n = A.getCount(), v: number[] = [];
  pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { A.getElement(i, v); for (let r = 0; r < 3; r++) pos[i * 3 + r] = T[r] * v[0] + T[4 + r] * v[1] + T[8 + r] * v[2] + T[12 + r]; }
  idx = Uint32Array.from(prim.getIndices()!.getArray()!);
  // her directions, her seams' copies summed together
  nrm = new Float32Array(n * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const k of [a, b, c]) { nrm[k] += x; nrm[k + 1] += y; nrm[k + 2] += z; }
  }
  const weld = new Map<string, number[]>();
  for (let i = 0; i < n; i++) { const k = `${Math.round(pos[i * 3] * 1e5)},${Math.round(pos[i * 3 + 1] * 1e5)},${Math.round(pos[i * 3 + 2] * 1e5)}`; const l = weld.get(k); if (l) l.push(i); else weld.set(k, [i]); }
  for (const l of weld.values()) if (l.length > 1) { const s = [0, 0, 0]; for (const i of l) for (let d = 0; d < 3; d++) s[d] += nrm[i * 3 + d]; for (const i of l) for (let d = 0; d < 3; d++) nrm[i * 3 + d] = s[d]; }
  normalizeEach(nrm);
  bake = bakeSkinShell({ positions: pos, indices: idx, field: bikiniBottomField(n)!, weld: SKIN_SHELL.weld, snap: SKIN_SHELL.snap });
}, 60000);

describe('her bikini bottom made from her skin, on her', () => {
  it('is one piece with one edge all round: no hole in it, no scrap beside it', () => {
    expect(bake.loops.length).toBe(1);
    // (her front, her gusset and her back: some four to six thousand points of her skin)
    expect(bake.faceCount).toBeGreaterThan(4000);
    expect(bake.faceCount).toBeLessThan(6000);
    expect(bake.dropped).toBeLessThanOrEqual(5);
  });

  it('stands off her, and its robe turns over almost none of it', () => {
    const S = new Float32Array(bake.count * 3), D = new Float32Array(bake.count * 3);
    sampleSkin(S, pos, 3, bake.src, bake.bary, bake.count); sampleSkin(D, nrm, 3, bake.src, bake.bary, bake.count); normalizeEach(D);
    const lift = bridgeLift(bake, S, D, SKIN_SHELL.offset), out = new Float32Array(bake.count * 3), outN = new Float32Array(bake.count * 3);
    layShell(bake, S, D, lift, { offset: SKIN_SHELL.offset, hemBulge: SKIN_SHELL.hemBulge, hemFoot: SKIN_SHELL.hemFoot }, out, outN);
    for (const x of out) expect(Number.isFinite(x)).toBe(true);
    // a face triangle turned over faces back into her: against the directions it was raised along at its corners (her
    // own, smoothed over it -- across a fold her own point at each other). 1,028 of 8,598 were, raised straight up off
    // her folds; 29 are, slid across the span and edge and all raised the same way (2026-11-11)
    const R = smoothDirections(bake, D, SKIN_SHELL.bridgeSmooth);
    let over = 0;
    for (let t = 0; t < bake.faceTriangles; t++) {
      const [a, b, c] = [bake.index[t * 3], bake.index[t * 3 + 1], bake.index[t * 3 + 2]];
      const ux = out[b * 3] - out[a * 3], uy = out[b * 3 + 1] - out[a * 3 + 1], uz = out[b * 3 + 2] - out[a * 3 + 2], vx = out[c * 3] - out[a * 3], vy = out[c * 3 + 1] - out[a * 3 + 1], vz = out[c * 3 + 2] - out[a * 3 + 2];
      const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
      if (x * (R[a * 3] + R[b * 3] + R[c * 3]) + y * (R[a * 3 + 1] + R[b * 3 + 1] + R[c * 3 + 1]) + z * (R[a * 3 + 2] + R[b * 3 + 2] + R[c * 3 + 2]) < 0) over++;
    }
    expect(over / bake.faceTriangles).toBeLessThan(0.005);
  });
});
