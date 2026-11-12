/**
 * A PAINTED GARMENT'S EDGE AS A STRIP (Joshua, 2026-11-12: "Do the painted main bottoms, but keep the cords and you
 * could add an offset by making it thicker like Under Build as a Strip").
 *
 * Paint lies flat on her: its edge is a line of colour with no thickness. Along that line this lays the clothing
 * builder's STRIP (`strapMesh.ts`: a flat band with real thickness, as BUILD makes) on her skin, so the edge stands off
 * her as a hemmed, elastic edge does, and rides her as a built strap does: the line found once at her rest, every point
 * of it a SURFACE ANCHOR on her (`bodySurface.ts`), read off her posed body every frame -- by the reader that poses her
 * skin for cloth (`clothSkin.ts`), in the world: it takes in her soft body's motion and rest sag (her seat's), which the
 * builder's own reader does not, and laid by that one the strip ran 2 cm inside the paint's edge across her seat
 * (2026-11-12), the paint being drawn where her skin is drawn.
 *
 * The line is where the garment's outline field crosses zero on her skin (the same cut `skinShell.ts` makes), each of
 * its closed loops broken where the garment's modelled cords take over (past `cutFrom` either side of her middle), so
 * no strip runs where a cord already is.
 */
import * as THREE from 'three';
import { bakeSkinShell, SKIN_SHELL } from './skinShell';
import { BodySurface, type SurfaceAnchor } from './bodySurface';
import { StrapMesh, type StrapShape } from './strapMesh';

export const PAINTED_EDGE = Object.freeze({
  /** GAME TUNING (metres): the strip across, and how thick -- the modelled brief's fabric is about 2 mm (MEASURED,
   *  2026-11-11) -- standing off her skin by `clearance`. */
  width: 0.007, thickness: 0.002, clearance: 0.0003,
  /** GAME TUNING (metres): the strip's samples along it (the builder's 3 mm), and the shortest run of edge drawn. */
  spacing: 0.003, shortest: 0.02,
});

/**
 * The edge's runs, each a list of points on her rest skin (her units, three numbers a point): the outline's loops,
 * broken where |x - middle| passes `cutFrom` (her units), runs shorter than `shortest` dropped. `closed` per run: a loop
 * nowhere broken.
 */
export function outlineRuns(rest: ArrayLike<number>, triangles: ArrayLike<number>, fieldMetres: ArrayLike<number>, unitsPerMetre: number, cutFrom: number, middle = 0): { points: Float32Array; closed: boolean }[] {
  const U = unitsPerMetre, field = new Float32Array(fieldMetres.length);
  for (let i = 0; i < field.length; i++) { const x = fieldMetres[i]; field[i] = Number.isFinite(x) ? x * U : -1; }
  const bake = bakeSkinShell({ positions: rest, indices: triangles, field, weld: SKIN_SHELL.weld * U, snap: SKIN_SHELL.snap * U, hemRings: 1 });
  const runs: { points: Float32Array; closed: boolean }[] = [];
  const at = (v: number, out: number[]) => { for (let k = 0; k < 3; k++) out[k] = bake.bary[v * 3] * rest[bake.src[v * 3] * 3 + k] + bake.bary[v * 3 + 1] * rest[bake.src[v * 3 + 1] * 3 + k] + bake.bary[v * 3 + 2] * rest[bake.src[v * 3 + 2] * 3 + k]; return out; };
  const shortest = PAINTED_EDGE.shortest * U;
  for (const loop of bake.loops) {
    const pts = Array.from(loop, (v) => at(v, [0, 0, 0])), n = pts.length, keep = pts.map((p) => Math.abs(p[0] - middle) <= cutFrom);
    const start = keep.indexOf(false);
    const push = (list: number[][], closed: boolean) => {
      let len = 0; for (let i = 1; i < list.length; i++) len += Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1], list[i][2] - list[i - 1][2]);
      if (list.length >= 3 && len >= shortest) runs.push({ points: Float32Array.from(list.flat()), closed });
    };
    if (start < 0) { push(pts, true); continue; }
    let run: number[][] = [];
    for (let k = 1; k <= n; k++) {
      const i = (start + k) % n;
      if (keep[i]) run.push(pts[i]);
      else { if (run.length) push(run, false); run = []; }
    }
    if (run.length) push(run, false);
  }
  return runs;
}

/** The strip along a painted garment's edge, on her (a child of her body, in its local space). */
/** Body vertex v as she is posed now, in the world (ClothSkin.posedVertex: valid once her skin was read this frame). */
export type PoseVertex = (v: number, out: Float32Array) => void;

export class PaintedEdge {
  /** In the world (add it to the scene, not to her). */
  readonly group = new THREE.Group();
  private readonly straps: { strap: StrapMesh; anchors: SurfaceAnchor[]; closed: boolean }[] = [];
  private readonly pos: THREE.Vector3[] = [];
  private readonly nrm: THREE.Vector3[] = [];
  private readonly tris: Uint32Array;
  private readonly corner = new Float32Array(9);

  /** `worldPerMetre`: the room's units to her metre. */
  constructor(private readonly surface: BodySurface, runs: readonly { points: Float32Array; closed: boolean }[], material: THREE.Material, private readonly worldPerMetre: number) {
    this.group.name = 'sarah-painted-edge';
    this.group.matrixAutoUpdate = false;
    this.tris = (surface as unknown as { tris: Uint32Array }).tris;
    const p = new THREE.Vector3();
    for (const r of runs) {
      const anchors: SurfaceAnchor[] = [];
      for (let i = 0; i < r.points.length; i += 3) { const a = surface.closestRest(p.set(r.points[i], r.points[i + 1], r.points[i + 2])); if (a) anchors.push(a); }
      if (anchors.length < 3) continue;
      const strap = new StrapMesh(material);
      strap.mesh.name = 'sarah-painted-edge-strip';
      this.group.add(strap.mesh);
      this.straps.push({ strap, anchors, closed: r.closed });
    }
  }

  get runs(): number { return this.straps.length; }
  /** Her triangles' winding against her outward direction (her rest normals voted, as ClothSkin does): 1 or -1. */
  sign = 1;

  /** (a probe's) its first anchors read off her by `surface` against three.js's own posing of the same skin (her mesh's
   *  local units): the median and most apart. */
  check(body: THREE.SkinnedMesh, field?: ArrayLike<number> | null): { median: number; most: number; anchors: number; fieldMedian?: number; fieldMost?: number } {
    const tris = (this.surface as unknown as { tris: Uint32Array }).tris, a = new THREE.Vector3(), b = new THREE.Vector3(), v = new THREE.Vector3(), d: number[] = [];
    for (const s of this.straps) for (let i = 0; i < s.anchors.length; i += 5) {
      const an = s.anchors[i]; this.surface.evaluate(an, a); b.set(0, 0, 0);
      for (let c = 0; c < 3; c++) { body.getVertexPosition(tris[an.tri * 3 + c], v); b.addScaledVector(v, an.bary[c]); }
      d.push(a.distanceTo(b));
    }
    d.sort((x, y) => x - y);
    const f: number[] = [];
    if (field) for (const s of this.straps) for (const an of s.anchors) { let x = 0; for (let c = 0; c < 3; c++) x += an.bary[c] * field[tris[an.tri * 3 + c]]; f.push(Math.abs(x)); }
    f.sort((x, y) => x - y);
    return { median: d[d.length >> 1] ?? -1, most: d[d.length - 1] ?? -1, anchors: d.length, fieldMedian: f[f.length >> 1], fieldMost: f[f.length - 1] };
  }

  /** Lay every strip on her as she is posed now (`pose`: her skin's vertices, posed this frame, in the world). */
  frame(pose: PoseVertex): void {
    const u = this.worldPerMetre, E = PAINTED_EDGE, c = this.corner, T = this.tris;
    for (const s of this.straps) {
      const n = s.anchors.length;
      while (this.pos.length < n) { this.pos.push(new THREE.Vector3()); this.nrm.push(new THREE.Vector3()); }
      for (let i = 0; i < n; i++) {
        const a = s.anchors[i];
        for (let k = 0; k < 3; k++) pose(T[a.tri * 3 + k], c.subarray(k * 3, k * 3 + 3));
        this.pos[i].set(
          a.bary[0] * c[0] + a.bary[1] * c[3] + a.bary[2] * c[6],
          a.bary[0] * c[1] + a.bary[1] * c[4] + a.bary[2] * c[7],
          a.bary[0] * c[2] + a.bary[1] * c[5] + a.bary[2] * c[8]);
        // her surface's direction there: the posed triangle's face, wound as her mesh is (outward)
        const ux = c[3] - c[0], uy = c[4] - c[1], uz = c[5] - c[2], vx = c[6] - c[0], vy = c[7] - c[1], vz = c[8] - c[2];
        this.nrm[i].set(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx).normalize().multiplyScalar(this.sign);
      }
      const shape: StrapShape = { kind: 'strip', width: E.width * u, thickness: E.thickness * u, clearance: E.clearance * u, closed: s.closed, spacing: E.spacing * u, uvLength: 0.02 * u };
      s.strap.update(this.pos.slice(0, n), this.nrm.slice(0, n), new Array(n).fill(0), shape);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const s of this.straps) s.strap.dispose();
  }
}
