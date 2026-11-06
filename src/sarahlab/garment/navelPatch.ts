/**
 * THE SHIRT DRAWN FINELY ROUND HER NAVEL (Joshua, 2026-11-06, drawing her navel from the side under a shirt: "All
 * shirts follow the exact side profile of the bellybutton but just scaled slightly bigger for offsets").
 *
 * The cloth's own points are about 1.2 cm apart, and her navel is about 3 cm across: however they are laid, its
 * triangles cannot carry her navel's shape -- laid on it they cut under its crown, lifted over it they stood off it in a
 * box (2026-11-05 and 11-06, measured from the side). So the cloth lies over her navel on her smooth belly
 * (`GarmentDetail.smoothOver`), and her navel is DRAWN onto it: the cloth's triangles over her navel are cut into
 * FINE × FINE smaller ones, each new point where the cloth's triangle puts it and then raised along her navel's axis by
 * her navel's own profile there (`GarmentDetail.navelRaise`); the cloth draws everything else, and those of its
 * triangles are left out of its own drawing meanwhile (`GarmentCloth`).
 *
 * Points on an edge two triangles share are one point, so the fine cloth has no seams of its own; its normals are its
 * own where it is raised, and the cloth's (as the cloth draws them) where it is not, so it meets the rest of the cloth
 * without a line. Every other attribute the cloth draws with (its pattern's place, its cut edge, its rest shape) is
 * carried across as the cloth's triangle has it.
 */
import * as THREE from 'three';

/** Each of the cloth's triangles over her navel cut into FINE × FINE (about 2 mm at 1.2 cm). GAME TUNING. */
export const NAVEL_FINE = 6;
/** The raise (world units) at which a fine point's normal is all its own: below it the cloth's normal eases in. */
export const NAVEL_FINE_EASE = 0.03;

export class NavelPatch {
  readonly mesh: THREE.Mesh;
  private readonly geometry = new THREE.BufferGeometry();
  /** each fine point: the source's three drawn points and their weights */
  private from = new Uint32Array(0);
  private weight = new Float32Array(0);
  private count = 0;
  private key = '';

  constructor(private readonly source: THREE.Mesh, private readonly fine = NAVEL_FINE) {
    this.mesh = new THREE.Mesh(this.geometry, source.material);
    this.mesh.name = `${source.name}-navel`;
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = source.castShadow; this.mesh.receiveShadow = source.receiveShadow;
    this.mesh.visible = false;
  }

  /** The source's drawn triangles to draw finely (its points' indices, 3 each); laid out again only when they change. */
  setTriangles(tris: ArrayLike<number>): void {
    const key = Array.prototype.join.call(tris, ',');
    if (key === this.key) return;
    this.key = key;
    const F = this.fine, T = Math.floor(tris.length / 3), at = new Map<string, number>(), from: number[] = [], weight: number[] = [], index: number[] = [];
    // (one fine point per place: a corner by its source point, a point on an edge by the edge's two points and its share)
    const pointOf = (a: number, b: number, c: number, i: number, j: number, k: number): number => {
      const parts: [number, number][] = [];
      if (i) parts.push([a, i]); if (j) parts.push([b, j]); if (k) parts.push([c, k]);
      parts.sort((x, y) => x[0] - y[0]);
      const name = parts.length === 3 ? `${a},${b},${c}:${i},${j},${k}` : parts.map(([v, w]) => `${v}:${w}`).join('|');
      let p = at.get(name);
      if (p === undefined) { p = from.length / 3; at.set(name, p); from.push(a, b, c); weight.push(i / F, j / F, k / F); }
      return p;
    };
    for (let t = 0; t < T; t++) {
      const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
      const id = (r: number, s: number) => pointOf(a, b, c, F - r - s, r, s);
      for (let r = 0; r < F; r++) for (let s = 0; s < F - r; s++) {
        // (the source's winding kept: a, b, c is r = s = 0, r = F, s = F)
        index.push(id(r, s), id(r + 1, s), id(r, s + 1));
        if (r + s + 1 < F) index.push(id(r + 1, s), id(r + 1, s + 1), id(r, s + 1));
      }
    }
    this.from = Uint32Array.from(from); this.weight = Float32Array.from(weight); this.count = from.length / 3;
    const g = this.geometry, src = this.source.geometry;
    for (const name of Object.keys(g.attributes)) g.deleteAttribute(name);
    for (const [name, attr] of Object.entries(src.attributes)) g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(this.count * attr.itemSize), attr.itemSize).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(index);
    this.mesh.visible = T > 0;
  }

  /**
   * Every fine point where the source's triangle puts it now, then raised by `raise(x, y, z)` along `axis`; its normal
   * its own where raised, eased to the source's where not.
   */
  update(raise: (x: number, y: number, z: number) => number, axis: readonly [number, number, number]): void {
    if (!this.count) return;
    const g = this.geometry, src = this.source.geometry, F = this.from, W = this.weight, n = this.count;
    for (const [name, attr] of Object.entries(src.attributes)) {
      const out = g.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (!out) continue;
      const S = attr.array as ArrayLike<number>, O = out.array as Float32Array, k = attr.itemSize;
      for (let p = 0; p < n; p++) for (let c = 0; c < k; c++) O[p * k + c] = W[p * 3] * S[F[p * 3] * k + c] + W[p * 3 + 1] * S[F[p * 3 + 1] * k + c] + W[p * 3 + 2] * S[F[p * 3 + 2] * k + c];
      out.needsUpdate = true;
    }
    const pos = g.getAttribute('position') as THREE.BufferAttribute, P = pos.array as Float32Array, up = new Float32Array(n);
    for (let p = 0; p < n; p++) {
      const u = raise(P[p * 3], P[p * 3 + 1], P[p * 3 + 2]);
      if (u > 0) { up[p] = u; P[p * 3] += axis[0] * u; P[p * 3 + 1] += axis[1] * u; P[p * 3 + 2] += axis[2] * u; }
    }
    const nrm = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
    if (nrm) {
      const N = nrm.array as Float32Array, carried = Float32Array.from(N);
      g.computeVertexNormals();
      const own = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
      for (let p = 0; p < n; p++) {
        const w = Math.min(1, up[p] / NAVEL_FINE_EASE), o = p * 3;
        let x = carried[o] + (own[o] - carried[o]) * w, y = carried[o + 1] + (own[o + 1] - carried[o + 1]) * w, z = carried[o + 2] + (own[o + 2] - carried[o + 2]) * w;
        const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
        own[o] = x; own[o + 1] = y; own[o + 2] = z;
      }
      (g.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    }
    pos.needsUpdate = true;
  }

  dispose(): void { this.mesh.removeFromParent(); this.geometry.dispose(); }
}
