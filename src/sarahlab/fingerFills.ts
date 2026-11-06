/**
 * WHERE HER FINGERS WERE CUT APART, DRAWN ROUND AND IN HER FINGER'S OWN COLOUR (P4; Joshua, 2026-11-05: a dark line down a
 * lifted finger, then "try again the default fingers and fix the weights and stuff", then, "about 80% there", circling the
 * slivers between her curled fingers and the dark stripe down a lifted one).
 *
 * fingerSplit.ts closes each finger's side, where her mesh joined it to the next, with triangles of the points round the
 * hole. Those points come from different pieces of her texture (her file joined the fingers' skin, not their texture), so
 * a closing triangle drawn with her texture runs across her texture's atlas from one piece to another: a streak, light or
 * dark, down the side of a finger.
 *
 * So the closing triangles are drawn here instead, on a mesh of their own bound to her skeleton under her body with no
 * transform of its own: their corners copied from her points exactly -- the same place, the same normal, the same bones and
 * weights, as she is drawn with them, so they move with her in every pose and shape -- and, given `round`
 * (actor/fingerFillShape.ts), cut finer with the points that adds laid round the finger's shape, each the blend of three of
 * her points (their places, their bones) moved out to it. Each point is coloured with HER FINGER'S COLOUR THERE: her
 * texture read over that finger's skin a few millimetres along it at a time, its lighter half (where her fingers touched
 * her file baked her skin dark: a finger's side coloured from there was a dark stripe down it). When her shape or her
 * weights change (`follow`), the copies are made again; when her skin changes, they are coloured again.
 */
import * as THREE from 'three';
import type { RoundFills } from '../actor/fingerFillShape';

/** MEASURED (her texture, `sarah-v2-body-slim.glb` Material_0): how rough her hand's skin is (the roughness map's mean over
 * her hand, 99-106 of 255), and her hand's skin colour (215, 167, 149) -- where her texture cannot be read (a compressed
 * skin). GAME TUNING: how far along a finger each colour is read over (metres), and which of her texture's colours there,
 * by how light they are, make it (the lighter half, not the lightest, which are its shine); with no finger to read, how
 * far each point's own colour is drawn toward her hand's; how far from her skin's edge her own colour there gives way to
 * her finger's (metres). */
export const FILL_LOOK = Object.freeze({ roughness: 0.4, fallback: [215 / 255, 167 / 255, 149 / 255] as const, band: 0.004, light: [0.5, 0.9] as const, toHand: 0.6, ease: 0.0025 });

export interface FingerFills {
  readonly mesh: THREE.SkinnedMesh;
  /** her triangles still drawn with her (the closing ones taken out) */
  readonly herTris: Uint32Array;
  /** how many closing triangles are drawn here */
  readonly count: number;
  /** her shape, weights or skin changed: copied and coloured again; true when anything did */
  follow(): boolean;
  dispose(): void;
}

/** Her skin's image read back as pixels (null when it cannot be: a compressed texture, no canvas). */
function pixelsOf(map: THREE.Texture | null | undefined): { data: Uint8ClampedArray; width: number; height: number; flipY: boolean } | null {
  const image = map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!image || !(image.width > 0) || typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const c = canvas.getContext('2d', { willReadFrequently: true }); if (!c) return null;
    c.drawImage(image, 0, 0);
    return { data: c.getImageData(0, 0, image.width, image.height).data, width: image.width, height: image.height, flipY: !!map!.flipY };
  } catch { return null; }
}

/**
 * `tris` the triangles she is drawn with, the last `closing` of them fingerSplit's closing ones. `fingers` which finger each
 * of her points lies on and how far along it (fingerSplit.ts), to colour by; `round` the closing triangles cut finer and
 * laid round (its triangles then drawn instead), with `toGeom` taking its moves from her rest frame into her geometry.
 * Null with none.
 */
export function createFingerFills(body: THREE.SkinnedMesh, tris: ArrayLike<number>, closing: number, opts: { fingers?: { readonly owner: ArrayLike<number>; readonly past: ArrayLike<number> }; round?: RoundFills | null; toGeom?: THREE.Matrix3 } = {}): FingerFills | null {
  const g = body.geometry as THREE.BufferGeometry;
  const pa = g.getAttribute('position') as THREE.BufferAttribute, na = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined, ua = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const T = Math.floor(tris.length / 3), first = T - Math.max(0, Math.min(T, closing));
  if (!pa || !na || !si || !sw || first >= T) return null;
  const herTris = Uint32Array.from(Array.prototype.slice.call(tris, 0, first * 3) as number[]);
  const round = opts.round && opts.round.tris.length ? opts.round : null;
  const fills = round ? Array.from(round.tris) : (Array.prototype.slice.call(tris, first * 3) as number[]);
  const base = round ? round.base : Infinity;
  // (her points the closing uses, then the points it adds)
  const hers = [...new Set(fills.filter((i) => i < base))], at = new Map(hers.map((i, k) => [i, k]));
  const extra = round ? round.count : 0, hn = hers.length, n = hn + extra, slotOf = (i: number) => (i < base ? at.get(i)! : hn + (i - base));
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), color = new Float32Array(n * 3), skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4)); // (its own array, not a copy: copy() writes into it)
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(fills.map(slotOf));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const skin = (Array.isArray(body.material) ? body.material[0] : body.material) as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({ name: 'finger-fills', vertexColors: true, roughness: FILL_LOOK.roughness, metalness: 0, side: skin.side });
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = 'finger-fills'; mesh.frustumCulled = false; mesh.castShadow = body.castShadow; mesh.receiveShadow = body.receiveShadow;
  body.add(mesh);
  mesh.bind(body.skeleton, body.bindMatrix);
  // (each added point's move, in her geometry)
  const moves = new Float32Array(extra * 3);
  if (round) { const v = new THREE.Vector3(); for (let k = 0; k < extra; k++) { v.fromArray(round.offset, k * 3); if (opts.toGeom) v.applyMatrix3(opts.toGeom); v.toArray(moves, k * 3); } }
  const copy = () => {
    hers.forEach((h, k) => {
      for (let c = 0; c < 3; c++) { position[k * 3 + c] = pa.getComponent(h, c); normal[k * 3 + c] = na.getComponent(h, c); }
      for (let c = 0; c < 4; c++) { skinIndex[k * 4 + c] = si.getComponent(h, c); skinWeight[k * 4 + c] = sw.getComponent(h, c); }
    });
    if (round) {
      const sum = new Map<number, number>();
      for (let k = 0; k < extra; k++) {
        const s = hn + k; sum.clear();
        for (let c = 0; c < 3; c++) position[s * 3 + c] = moves[k * 3 + c];
        for (let j = 0; j < 3; j++) {
          const q = round.parents[k * 3 + j], b = round.bary[k * 3 + j]; if (!(b > 0)) continue;
          for (let c = 0; c < 3; c++) position[s * 3 + c] += b * pa.getComponent(q, c);
          for (let c = 0; c < 4; c++) { const w = sw.getComponent(q, c); if (w > 0) { const bone = si.getComponent(q, c); sum.set(bone, (sum.get(bone) ?? 0) + b * w); } }
        }
        // (four bones at most, adding to one)
        const kept = [...sum].sort((x, y) => y[1] - x[1]).slice(0, 4), total = kept.reduce((a, e) => a + e[1], 0) || 1;
        for (let c = 0; c < 4; c++) { skinIndex[s * 4 + c] = kept[c]?.[0] ?? 0; skinWeight[s * 4 + c] = (kept[c]?.[1] ?? 0) / total; }
      }
      // (the added points facing as the closing now lies: from its triangles round each)
      const acc = new Float32Array(extra * 3), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
      for (let t = 0; t + 2 < fills.length; t += 3) {
        const a = slotOf(fills[t]), b = slotOf(fills[t + 1]), c = slotOf(fills[t + 2]);
        if (a < hn && b < hn && c < hn) continue;
        A.fromArray(position, a * 3); B.fromArray(position, b * 3); C.fromArray(position, c * 3);
        const f = B.sub(A).cross(C.sub(A));
        for (const s of [a, b, c]) if (s >= hn) { acc[(s - hn) * 3] += f.x; acc[(s - hn) * 3 + 1] += f.y; acc[(s - hn) * 3 + 2] += f.z; }
      }
      for (let k = 0; k < extra; k++) { A.fromArray(acc, k * 3).normalize(); A.toArray(normal, (hn + k) * 3); }
    }
    for (const name of ['position', 'normal', 'skinIndex', 'skinWeight']) (geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  };
  let mapSeen: THREE.Texture | null | undefined = undefined;
  const colour = () => {
    const px = pixelsOf(skin.map), c = new THREE.Color(), f = FILL_LOOK.fallback, fw = opts.fingers;
    const texel = (h: number): [number, number, number] | null => {
      if (!px || !ua) return null;
      const u = ua.getX(h) - Math.floor(ua.getX(h)), v = ua.getY(h) - Math.floor(ua.getY(h));
      const x = Math.min(px.width - 1, Math.floor(u * px.width)), y = Math.min(px.height - 1, Math.floor((px.flipY ? 1 - v : v) * px.height)), o = (y * px.width + x) * 4;
      return [px.data[o] / 255, px.data[o + 1] / 255, px.data[o + 2] / 255];
    };
    // HER FINGER'S COLOUR, a band at a time along it: the lighter half of her texture's colours over its skin there
    const bands = new Map<string, [number, number, number][]>(), whole = new Map<number, [number, number, number][]>();
    const bandOf = (h: number) => `${fw!.owner[h]}:${Math.floor(fw!.past[h] / FILL_LOOK.band)}`;
    if (fw && px && ua) for (let h = 0; h < pa.count; h++) {
      if (!(fw.owner[h] >= 0)) continue;
      const t = texel(h); if (!t) continue;
      const k = bandOf(h); (bands.get(k) ?? bands.set(k, []).get(k)!).push(t); (whole.get(fw.owner[h]) ?? whole.set(fw.owner[h], []).get(fw.owner[h])!).push(t);
    }
    const lighter = (list: [number, number, number][]) => {
      const s = [...list].sort((a, b) => (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11) - (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11));
      const lo = Math.floor(s.length * FILL_LOOK.light[0]), hi = Math.max(lo + 1, Math.ceil(s.length * FILL_LOOK.light[1])), m = [0, 0, 0];
      for (let k = lo; k < hi && k < s.length; k++) for (let j = 0; j < 3; j++) m[j] += s[k][j];
      const cnt = Math.max(1, Math.min(hi, s.length) - lo); return [m[0] / cnt, m[1] / cnt, m[2] / cnt] as [number, number, number];
    };
    const made = new Map<string, [number, number, number]>();
    const colourOf = (h: number): [number, number, number] => {
      if (fw && fw.owner[h] >= 0) {
        const k = bandOf(h); let m = made.get(k);
        if (!m) { const list = bands.get(k), all = whole.get(fw.owner[h]); m = list && list.length >= 8 ? lighter(list) : all && all.length ? lighter(all) : [f[0], f[1], f[2]]; made.set(k, m); }
        return m;
      }
      const t = texel(h), q = FILL_LOOK.toHand;
      return t ? [t[0] * (1 - q) + f[0] * q, t[1] * (1 - q) + f[1] * q, t[2] * (1 - q) + f[2] * q] : [f[0], f[1], f[2]];
    };
    // (cut finer: at her skin's edge her own colour there, so the two meet with no line between, eased into her finger's
    // colour over `ease` from it)
    const edgeOf = (h: number): [number, number, number] => (round ? texel(h) ?? colourOf(h) : colourOf(h));
    hers.forEach((h, k) => { const m = edgeOf(h); c.setRGB(m[0], m[1], m[2], THREE.SRGBColorSpace); c.toArray(color, k * 3); });
    if (round) for (let k = 0; k < extra; k++) {
      const edge = [0, 0, 0], inside = [0, 0, 0]; let near = Infinity;
      for (let j = 0; j < 3; j++) {
        const q = round.parents[k * 3 + j], b = round.bary[k * 3 + j]; if (!(b > 0)) continue;
        const e = edgeOf(q), m = colourOf(q); for (let i = 0; i < 3; i++) { edge[i] += b * e[i]; inside[i] += b * m[i]; }
        // (how far it is from that corner of her skin's edge)
        let d2 = 0; for (let i = 0; i < 3; i++) { let x = round.offset[k * 3 + i]; for (let jj = 0; jj < 3; jj++) x += round.bary[k * 3 + jj] * pa.getComponent(round.parents[k * 3 + jj], i); x -= pa.getComponent(q, i); d2 += x * x; }
        near = Math.min(near, Math.sqrt(d2));
      }
      const t = Math.min(1, near / FILL_LOOK.ease), u = t * t * (3 - 2 * t);
      c.setRGB(edge[0] + (inside[0] - edge[0]) * u, edge[1] + (inside[1] - edge[1]) * u, edge[2] + (inside[2] - edge[2]) * u, THREE.SRGBColorSpace); c.toArray(color, (hn + k) * 3);
    }
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    mapSeen = skin.map;
  };
  const stamp = () => `${pa.version}:${na.version}:${sw.version}:${si.version}`;
  copy(); colour();
  let seen = stamp();
  return {
    mesh, herTris, count: fills.length / 3,
    follow() {
      let changed = false;
      const now = stamp(); if (now !== seen) { seen = now; copy(); changed = true; }
      if (skin.map !== mapSeen) { colour(); changed = true; }
      return changed;
    },
    dispose() { mesh.removeFromParent(); geo.dispose(); material.dispose(); },
  };
}
