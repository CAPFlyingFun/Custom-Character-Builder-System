/**
 * WHERE HER FINGERS WERE CUT APART, DRAWN IN HER OWN COLOUR (P4; Joshua, 2026-11-05: a dark line down a lifted finger,
 * then "try again the default fingers and fix the weights and stuff").
 *
 * fingerSplit.ts closes each finger's side, where her mesh joined it to the next, with triangles of the points round the
 * hole. Those points come from different pieces of her texture (her file joined the fingers' skin, not their texture), so
 * a closing triangle drawn with her texture runs across her texture's atlas from one piece to another: a streak, light or
 * dark, down the side of a finger.
 *
 * So the closing triangles are drawn here instead, on a mesh of their own bound to her skeleton under her body with no
 * transform of its own: their points copied from hers exactly -- the same place, the same normal, the same bones and
 * weights, as she is drawn with them, so they move with her in every pose and shape -- and each point coloured with the
 * colour of HER TEXTURE AT THAT POINT (read once, from her skin's image), so across each triangle her own colours blend
 * from one corner to the next, with no texture to streak. When her shape or her weights change (`follow`), the copies are
 * made again; when her skin changes, they are coloured again.
 */
import * as THREE from 'three';

/** MEASURED (her texture, `sarah-v2-body-slim.glb` Material_0): how rough her hand's skin is (the roughness map's mean over
 * her hand, 99-106 of 255), and her hand's skin colour (215, 167, 149) -- where her texture cannot be read (a compressed
 * skin), and, GAME TUNING, how far each point's own colour is drawn toward it: where her fingers touched her file baked
 * her skin dark, and a lifted finger's closed side read as a dark line down it. */
export const FILL_LOOK = Object.freeze({ roughness: 0.4, fallback: [215 / 255, 167 / 255, 149 / 255] as const, toHand: 0.6 });

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

/** `tris` the triangles she is drawn with, the last `closing` of them fingerSplit's closing ones. Null with none. */
export function createFingerFills(body: THREE.SkinnedMesh, tris: ArrayLike<number>, closing: number): FingerFills | null {
  const g = body.geometry as THREE.BufferGeometry;
  const pa = g.getAttribute('position') as THREE.BufferAttribute, na = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined, ua = g.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const T = Math.floor(tris.length / 3), first = T - Math.max(0, Math.min(T, closing));
  if (!pa || !na || !si || !sw || first >= T) return null;
  const herTris = Uint32Array.from(Array.prototype.slice.call(tris, 0, first * 3) as number[]);
  const fills = Array.prototype.slice.call(tris, first * 3) as number[], points = [...new Set(fills)], at = new Map(points.map((i, k) => [i, k]));
  const n = points.length;
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), color = new Float32Array(n * 3), skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geo.setIndex(fills.map((i) => at.get(i)!));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const skin = (Array.isArray(body.material) ? body.material[0] : body.material) as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({ name: 'finger-fills', vertexColors: true, roughness: FILL_LOOK.roughness, metalness: 0, side: skin.side });
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = 'finger-fills'; mesh.frustumCulled = false; mesh.castShadow = body.castShadow; mesh.receiveShadow = body.receiveShadow;
  body.add(mesh);
  mesh.bind(body.skeleton, body.bindMatrix);
  const copy = () => {
    points.forEach((h, k) => {
      for (let c = 0; c < 3; c++) { position[k * 3 + c] = pa.getComponent(h, c); normal[k * 3 + c] = na.getComponent(h, c); }
      for (let c = 0; c < 4; c++) { skinIndex[k * 4 + c] = si.getComponent(h, c); skinWeight[k * 4 + c] = sw.getComponent(h, c); }
    });
    for (const name of ['position', 'normal', 'skinIndex', 'skinWeight']) (geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  };
  let mapSeen: THREE.Texture | null | undefined = undefined;
  const colour = () => {
    const px = pixelsOf(skin.map), c = new THREE.Color();
    points.forEach((h, k) => {
      if (px && ua) {
        const u = ua.getX(h) - Math.floor(ua.getX(h)), v = ua.getY(h) - Math.floor(ua.getY(h));
        const x = Math.min(px.width - 1, Math.floor(u * px.width)), y = Math.min(px.height - 1, Math.floor((px.flipY ? 1 - v : v) * px.height)), o = (y * px.width + x) * 4;
        const t = FILL_LOOK.toHand, f = FILL_LOOK.fallback;
        c.setRGB((px.data[o] / 255) * (1 - t) + f[0] * t, (px.data[o + 1] / 255) * (1 - t) + f[1] * t, (px.data[o + 2] / 255) * (1 - t) + f[2] * t, THREE.SRGBColorSpace);
      } else c.setRGB(FILL_LOOK.fallback[0], FILL_LOOK.fallback[1], FILL_LOOK.fallback[2], THREE.SRGBColorSpace);
      c.toArray(color, k * 3);
    });
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
