/**
 * HER OWN FINGERS, DRAWN (actor/ownFingers.ts makes them; this lays them on her). Joshua, 2026-11-05: "hide the MeshyAI
 * fingers, and instead create your own cylinder fingers with some skin between the joints and still use the same bones".
 *
 * One skinned mesh for all eight fingers, bound to HER skeleton with her bind matrix and hung under her body with no
 * transform of its own, so it is posed by exactly what poses her: every bone of a grip, a press or a pose, her build, her
 * wrists' size. Its first points are copies of the points of hers where her finger's skin now ends -- the same place, the
 * same normal, the same bones and weights, as she is drawn with them -- so the two meet with no seam.
 *
 * - SKIN: her own material (her skin, whichever is chosen, and everything laid on it), on a plain patch of her texture the
 *   colour of her fingers where they begin. The rest of her custom attributes are given to it as zeros, so nothing written
 *   for her body (her soft body, her face) moves it.
 * - NAILS: a material of their own, glossier, a little paler at the root and at the free edge.
 *
 * Her body's file is untouched: of hers, only which triangles are drawn changes. When her shape or her weights change
 * (`follow`), the fingers are made again on her ring as it now is.
 */
import * as THREE from 'three';
import type { V3 } from '../actor/fingerSplit';
import { buildFinger, cutFingers, measureFingers, smoothRings, OWN_FINGERS, type OwnFinger } from '../actor/ownFingers';

/** MEASURED (her texture, `sarah-v2-body-slim.glb` Material_0, 2048 px): a plain patch of her skin, inside one piece of
 * her texture, its normal map flat and as rough as her hand's, whose colour (215, 167, 149) is her hand's beside her
 * knuckles (219, 171, 154 over the back, 210, 161, 144 under the palm). u and v, from..to. */
export const FINGER_SKIN_PATCH = Object.freeze({ u: [588 / 2048, 612 / 2048] as const, v: [928 / 2048, 1008 / 2048] as const });

/** GAME TUNING: a nail's colour at its root (the pale half-moon), across its plate and at its free edge (sRGB), how far
 * each runs (shares of its length from the root, to the edge), and how glossy it is. */
export const NAIL_LOOK = Object.freeze({ root: 0xe9c3b8, plate: 0xd99c90, edge: 0xeedcd2, rootTo: 0.25, edgeFrom: 0.88, roughness: 0.42 });

export interface OwnFingersHand {
  /** its fingers but its thumb: each the bones from its knuckle out to its end */
  readonly fingers: readonly (readonly number[])[];
  /** the way the back of the hand faces, at rest */
  readonly back: V3;
}

export interface OwnFingersInput {
  readonly body: THREE.SkinnedMesh;
  /** her geometry to her rest frame (metres) */
  readonly toRest: THREE.Matrix4;
  readonly hands: readonly OwnFingersHand[];
  /** which finger each of her points lies on (numbered through the hands' fingers in order) and how far along it
   * (fingerSplit.ts), and the triangles she is drawn with */
  readonly owner: Int8Array;
  readonly past: Float32Array;
  readonly tris: ArrayLike<number>;
  /** how many of `tris`, at its end, are fingerSplit's closing triangles */
  readonly closing?: number;
  /** her points as her file has them (geometry, three a point), for her fingers' thickness: measured on what she is drawn
   * with, a finger her split has rounded and smoothed is a finger made thinner (fingerSplit.ts) */
  readonly measureFrom?: ArrayLike<number>;
}

export interface OwnFingers {
  readonly mesh: THREE.SkinnedMesh;
  /** her triangles still drawn: hers less her fingers past her webbing */
  readonly herTris: Uint32Array;
  /** how many fingers were made, how many of her triangles are no longer drawn, and rings not round a finger */
  readonly made: number;
  readonly hidden: number;
  readonly stray: number;
  /** her ring smoothed (smoothRings): which of her points move and how far (her rest frame, metres), to be laid on her as a
   * shape field while the fingers are drawn */
  readonly seam: { readonly index: Uint32Array; readonly delta: Float32Array };
  /** goes up each time the fingers are made again (anything kept by their triangles must be found again) */
  readonly version: number;
  /** for a probe: each finger's measure -- where it begins and ends along it, and how thick and how far off its bones
   * her finger is at each end (metres) */
  readonly measured: readonly { readonly from: number; readonly tip: number; readonly thick: readonly [number, number]; readonly off: readonly [number, number] }[];
  /** her ring, her shape or her weights moved: the fingers made again on them; true when they were */
  follow(): boolean;
  /** the fingers at rest (her rest frame, metres) and every triangle of them: where their contact points are found */
  rest(): { pos: Float32Array; tris: Uint32Array; base: Float32Array };
  dispose(): void;
}

const STANDARD = new Set(['position', 'normal', 'uv', 'skinIndex', 'skinWeight', 'color']);

export function createOwnFingers(input: OwnFingersInput): OwnFingers | null {
  const { body, toRest } = input, g = body.geometry as THREE.BufferGeometry;
  const pa = g.getAttribute('position') as THREE.BufferAttribute, na = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined;
  if (!pa || !na || !si || !sw) return null;
  const n = pa.count, toGeom = new THREE.Matrix4().copy(toRest).invert(), nRest = new THREE.Matrix3().getNormalMatrix(toRest), nGeom = new THREE.Matrix3().getNormalMatrix(toGeom);
  const bindInv = new THREE.Matrix4().copy(body.bindMatrix).invert(), v = new THREE.Vector3();
  const jointAt = (b: number): V3 => v.setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(body.skeleton.boneInverses[b]).invert())).applyMatrix4(toRest).toArray() as [number, number, number];
  const fingers = input.hands.flatMap((h) => h.fingers.map((chain) => ({ chain, back: h.back })));
  const lines = fingers.map((f) => f.chain.map(jointAt));
  // her finger's skin past her webbing taken off (by the points' places at rest)
  const restOfHer = () => { const out = new Float32Array(n * 3); for (let i = 0; i < n; i++) v.fromBufferAttribute(pa, i).applyMatrix4(toRest).toArray(out, i * 3); return out; };
  let herRest = restOfHer();
  const cut = cutFingers(herRest, input.tris, input.owner, input.past, fingers.length, OWN_FINGERS, input.closing ?? 0);
  // (her triangles drawn on the fingers' plain skin instead of hers: their own points, copies of hers)
  const movedPoints = [...new Set(cut.moved)], movedAt = new Map(movedPoints.map((i, k) => [i, k]));
  const nailMaterial = new THREE.MeshStandardMaterial({ name: 'own-nails', vertexColors: true, roughness: NAIL_LOOK.roughness, metalness: 0 });
  const skinMaterial = Array.isArray(body.material) ? body.material[0] : body.material;
  const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), [skinMaterial, nailMaterial]);
  mesh.name = 'own-fingers'; mesh.frustumCulled = false; mesh.castShadow = body.castShadow; mesh.receiveShadow = body.receiveShadow;
  body.add(mesh);
  mesh.bind(body.skeleton, body.bindMatrix);
  let measured: { from: number; tip: number; thick: [number, number]; off: [number, number] }[] = [];
  let version = 0, made = 0, restPos = new Float32Array(0), allTris = new Uint32Array(0), seen = '';
  const ringOf = (f: number) => cut.rings[f] ?? [];
  // what the fingers are made from: her rings' places, normals and weights, and her finger points' places (a sample)
  const fingerPoints: number[] = []; for (let i = 0; i < n; i++) if (input.owner[i] >= 0) fingerPoints.push(i);
  // HOW THICK each of her fingers is, once: on her points as her file has them
  const asFiled = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) (input.measureFrom ? v.fromArray(input.measureFrom, i * 3) : v.fromBufferAttribute(pa, i)).applyMatrix4(toRest).toArray(asFiled, i * 3);
  const seam = smoothRings(asFiled, cut.tris, cut.rings, lines, fingers.map((f) => f.back));
  const profiles = fingers.map((f, k) => {
    const ring = ringOf(k);
    if (ring.length < 6 || f.chain.length < 4) return null;
    const from = Math.min(...ring.map((i) => input.past[i])) - 0.004;
    const ownerOf = new Int8Array(n).fill(-1); for (const i of fingerPoints) if (input.owner[i] === k) ownerOf[i] = 0;
    const [profile] = measureFingers(asFiled, ownerOf, [lines[k]], [f.back], from);
    return { from, profile };
  });
  const stamp = () => {
    const parts: number[] = [];
    const copied = [...cut.rings.flat(), ...movedPoints];
    for (const i of copied) for (let c = 0; c < 3; c++) parts.push(pa.getComponent(i, c), na.getComponent(i, c));
    for (const i of copied) for (let c = 0; c < 4; c++) parts.push(si.getComponent(i, c), sw.getComponent(i, c));
    for (let k = 0; k < fingerPoints.length; k += 16) for (let c = 0; c < 3; c++) parts.push(pa.getComponent(fingerPoints[k], c));
    let h = 0; for (const x of parts) { h = (Math.imul(h, 31) + Math.round(x * 1e6)) | 0; }
    return `${parts.length}:${h}`;
  };
  const make = () => {
    herRest = restOfHer();
    const parts: { fin: OwnFinger; ring: readonly number[] }[] = [];
    measured = [];
    fingers.forEach((f, k) => {
      const ring = ringOf(k), m = profiles[k];
      if (!m) return;
      const { from, profile } = m;
      { const e = profile.s.length - 1; measured.push({ from, tip: profile.tip, thick: [profile.top[0] + profile.bottom[0], profile.top[e] + profile.bottom[e]], off: [0.5 * (profile.top[0] - profile.bottom[0]), 0.5 * (profile.top[e] - profile.bottom[e])] }); }
      const P = (i: number): V3 => [herRest[i * 3], herRest[i * 3 + 1], herRest[i * 3 + 2]];
      const N = (i: number): V3 => v.fromBufferAttribute(na, i).applyMatrix3(nRest).normalize().toArray() as [number, number, number];
      const fin = buildFinger({
        joints: lines[k].slice(0, 4), bones: f.chain.slice(0, 3), back: f.back, profile,
        ring: { pos: ring.map(P), nrm: ring.map(N), bones: ring.map((i) => [0, 1, 2, 3].map((c) => si.getComponent(i, c))), weights: ring.map((i) => [0, 1, 2, 3].map((c) => sw.getComponent(i, c))) },
      }, OWN_FINGERS);
      parts.push({ fin, ring });
    });
    const count = parts.reduce((a, p) => a + p.fin.count, 0) + movedPoints.length;
    const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2), color = new Float32Array(count * 3);
    const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
    restPos = new Float32Array(count * 3);
    const skin: number[] = [], nail: number[] = [];
    const U = FINGER_SKIN_PATCH.u, V = FINGER_SKIN_PATCH.v, col = (hex: number) => new THREE.Color().setHex(hex);
    const root = col(NAIL_LOOK.root), plate = col(NAIL_LOOK.plate), edge = col(NAIL_LOOK.edge), white = new THREE.Color(1, 1, 1), c = new THREE.Color();
    let at = 0;
    for (const { fin, ring } of parts) {
      for (let i = 0; i < fin.count; i++) {
        const o = at + i, from = fin.copyOf[i];
        restPos.set(fin.pos.subarray(i * 3, i * 3 + 3), o * 3);
        if (from >= 0) {
          // a copy of hers: exactly as she is drawn
          const h = ring[from];
          for (let k = 0; k < 3; k++) { position[o * 3 + k] = pa.getComponent(h, k); normal[o * 3 + k] = na.getComponent(h, k); }
        } else {
          v.fromArray(fin.pos, i * 3).applyMatrix4(toGeom).toArray(position, o * 3);
          v.fromArray(fin.nrm, i * 3).applyMatrix3(nGeom).normalize().toArray(normal, o * 3);
        }
        uv[o * 2] = U[0] + (U[1] - U[0]) * fin.uv[i * 2]; uv[o * 2 + 1] = V[0] + (V[1] - V[0]) * fin.uv[i * 2 + 1];
        for (let k = 0; k < 4; k++) { skinIndex[o * 4 + k] = fin.bones[i * 4 + k]; skinWeight[o * 4 + k] = fin.weights[i * 4 + k]; }
        const t = fin.tone[i];
        if (t < 0) c.copy(white);
        else { c.copy(root).lerp(plate, Math.min(1, t / NAIL_LOOK.rootTo)); if (t > NAIL_LOOK.edgeFrom) c.lerp(edge, (t - NAIL_LOOK.edgeFrom) / (1 - NAIL_LOOK.edgeFrom)); }
        c.toArray(color, o * 3);
      }
      for (const x of fin.skin) skin.push(x + at);
      for (const x of fin.nail) nail.push(x + at);
      at += fin.count;
    }
    // her triangles moved onto them: her points copied exactly, on the patch's plain skin where the fingers begin
    movedPoints.forEach((h, k) => {
      const o = at + k;
      for (let c = 0; c < 3; c++) { position[o * 3 + c] = pa.getComponent(h, c); normal[o * 3 + c] = na.getComponent(h, c); }
      v.fromBufferAttribute(pa, h).applyMatrix4(toRest).toArray(restPos, o * 3);
      for (let c = 0; c < 4; c++) { skinIndex[o * 4 + c] = si.getComponent(h, c); skinWeight[o * 4 + c] = sw.getComponent(h, c); }
      uv[o * 2] = (U[0] + U[1]) / 2; uv[o * 2 + 1] = V[0] + 0.05 * (V[1] - V[0]);
      white.toArray(color, o * 3);
    });
    for (const h of cut.moved) skin.push(at + movedAt.get(h)!);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    // (whatever else her shader reads of her, nothing: her soft body, her face's rig)
    for (const [name, attr] of Object.entries(g.attributes)) if (!STANDARD.has(name) && !name.startsWith('_')) geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count * attr.itemSize), attr.itemSize));
    allTris = Uint32Array.from([...skin, ...nail]);
    geo.setIndex(new THREE.BufferAttribute(allTris, 1));
    geo.addGroup(0, skin.length, 0); geo.addGroup(skin.length, nail.length, 1);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    mesh.geometry.dispose(); mesh.geometry = geo;
    made = parts.length; version++;
  };
  make(); seen = stamp();
  return {
    mesh, herTris: cut.tris, seam, get made() { return made; }, get measured() { return measured; }, hidden: cut.hidden, stray: cut.stray, get version() { return version; },
    follow() { const now = stamp(); if (now === seen) return false; seen = now; make(); return true; },
    rest() { return { pos: restPos, tris: allTris, base: Float32Array.from((mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array) }; },
    dispose() { mesh.removeFromParent(); mesh.geometry.dispose(); nailMaterial.dispose(); },
  };
}
