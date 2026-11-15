/** Add body-only CPU shape fields to an existing fitted garment. Native garment
 * morphs, authored clearance, wrinkles and skin weights remain authoritative.
 * Bind once on the shared approved geometry frame, never on a posed body.
 */
import * as THREE from 'three';
import type { ShapeFields } from '../view/bodyShapeView';
import { BodySurface } from './bodySurface';
import { CordEvening } from './cordEvening';

type Field = ShapeFields['fields'] extends ReadonlyMap<string, infer F> ? F : never;
interface BoundGarment {
  tri: Uint32Array; bary: Float32Array; valid: Uint8Array;
  sources: Map<string, Field>; outputs: Map<string, Field>;
}
/** One part of a garment whose parts are bound as one, its strings evened (`syncSet`). */
export interface GarmentPart {
  readonly mesh: THREE.Mesh;
  readonly fields: ShapeFields;
  /** a closed tube (a string, the cord round a cup) rather than a panel of cloth */
  readonly cord: boolean;
}
interface BoundSet { key: string; evening: CordEvening; moves: Float32Array[]; turns: Float32Array[] }

export class GarmentShapeTransfer {
  private readonly surface: BodySurface;
  private readonly triangles: Uint32Array;
  private readonly garments = new WeakMap<THREE.Mesh, BoundGarment>();
  private readonly sets = new WeakMap<THREE.Mesh, BoundSet>();
  private readonly dense: Float32Array;
  private readonly denseNormal: Float32Array;
  private readonly p = new THREE.Vector3();
  private readonly rest: Float32Array;
  private restNormal: Float32Array | null;

  constructor(body: THREE.SkinnedMesh, rest: ShapeFields, private readonly maxDistance = 0.08) {
    // allIndices survives the room's optional index filtering. Skin is never hidden here.
    const indices = body.userData.allIndices as ArrayLike<number> | undefined;
    this.triangles = Uint32Array.from(indices ?? body.geometry.index?.array ?? []);
    this.surface = new BodySurface(body, this.triangles, rest.basePos);
    this.dense = new Float32Array(rest.basePos.length);
    this.denseNormal = new Float32Array(rest.basePos.length);
    this.rest = rest.basePos;
    this.restNormal = rest.baseNrm;
  }

  /** Each point of a garment on the place of her rest skin nearest it, found once. */
  private bind(mesh: THREE.Mesh, target: ShapeFields): BoundGarment {
    let binding = this.garments.get(mesh);
    if (binding) return binding;
    const n = target.basePos.length / 3;
    binding = { tri: new Uint32Array(n * 3), bary: new Float32Array(n * 3), valid: new Uint8Array(n), sources: new Map(), outputs: new Map() };
    for (let v = 0; v < n; v++) {
      this.p.fromArray(target.basePos, v * 3);
      const a = this.surface.closestRest(this.p, this.maxDistance);
      if (!a) continue;
      binding.valid[v] = 1;
      binding.tri.set(this.triangles.subarray(a.tri * 3, a.tri * 3 + 3), v * 3);
      binding.bary.set(a.bary, v * 3);
    }
    this.garments.set(mesh, binding);
    return binding;
  }

  /** One of her skin's fields laid out a value a point of her (`dense`, `denseNormal`), to be read at a garment's points. */
  private spread(field: Field): void {
    this.dense.fill(0); this.denseNormal.fill(0);
    for (let k = 0; k < field.index.length; k++) {
      const v = field.index[k] * 3;
      this.dense.set(field.pos.subarray(k * 3, k * 3 + 3), v);
      if (field.nrm) this.denseNormal.set(field.nrm.subarray(k * 3, k * 3 + 3), v);
    }
  }

  /** Only missing baby-weight / milk fields by default. Widen explicitly for a
   * future public body field after reviewing its interaction with authored fits.
   * Returning a changed source object replaces a previously transferred field.
   * Body and garment must use the same approved local frame (recovered garments do).
   */
  sync(mesh: THREE.Mesh, target: ShapeFields, source: ShapeFields,
    accept = (name: string) => name.startsWith('shape:baby:') || name.startsWith('shape:milk:')): { fields: ShapeFields; added: number } {
    const wanted = [...source.fields].filter(([name]) => accept(name));
    if (!wanted.length) return { fields: target, added: 0 };
    const binding = this.bind(mesh, target);
    const fields = new Map(target.fields);
    let changed = 0;
    for (const [name, field] of wanted) {
      const previous = binding.outputs.get(name), native = fields.get(name);
      if (native && native !== previous) continue;
      if (binding.sources.get(name) === field && native === previous) continue;
      this.spread(field);
      const index: number[] = [], positions: number[] = [], normals: number[] = [];
      for (let v = 0; v < binding.valid.length; v++) {
        if (!binding.valid[v]) continue;
        const o = v * 3;
        let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
        for (let c = 0; c < 3; c++) {
          const at = binding.tri[o + c] * 3, w = binding.bary[o + c];
          x += w * this.dense[at]; y += w * this.dense[at + 1]; z += w * this.dense[at + 2];
          nx += w * this.denseNormal[at]; ny += w * this.denseNormal[at + 1]; nz += w * this.denseNormal[at + 2];
        }
        if (x || y || z || nx || ny || nz) { index.push(v); positions.push(x, y, z); normals.push(nx, ny, nz); }
      }
      const transferred: Field = { index: Uint32Array.from(index), pos: Float32Array.from(positions), nrm: field.nrm ? Float32Array.from(normals) : null };
      fields.set(name, transferred); binding.sources.set(name, field); binding.outputs.set(name, transferred); changed++;
    }
    return { fields: changed ? { ...target, fields, last: '' } : target, added: changed };
  }

  /** Her rest skin's way out at each of her points: her file's own normals, or her triangles' summed when it has none. */
  private skinNormal(): Float32Array {
    if (this.restNormal) return this.restNormal;
    const R = this.rest, T = this.triangles, out = new Float32Array(R.length);
    for (let t = 0; t + 2 < T.length; t += 3) {
      const a = T[t] * 3, b = T[t + 1] * 3, c = T[t + 2] * 3;
      const ux = R[b] - R[a], uy = R[b + 1] - R[a + 1], uz = R[b + 2] - R[a + 2], vx = R[c] - R[a], vy = R[c + 1] - R[a + 1], vz = R[c + 2] - R[a + 2];
      const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
      for (const i of [a, b, c]) { out[i] += x; out[i + 1] += y; out[i + 2] += z; }
    }
    return (this.restNormal = out);
  }

  /**
   * A GARMENT OF SEVERAL PARTS WITH CORDS AMONG THEM (her bikini top: its cups, the cord round each, its strings). Each
   * part takes her skin's fields as `sync` gives them, and then the garment's STRINGS are evened along themselves
   * (`cordEvening.ts`): her skin's fields slide her skin's points along her skin, which a panel rides unseen and a
   * string shows as corners. Its panels, and the cord sewn round each, are exactly as `sync` has them. The same rules as
   * `sync` for which fields, a part's own (native) field and a source replaced since. Hand the same parts in, in the
   * same order, every time: they are bound as one.
   */
  syncSet(parts: readonly GarmentPart[], source: ShapeFields,
    accept = (name: string) => name.startsWith('shape:baby:') || name.startsWith('shape:milk:')): { fields: ShapeFields[]; added: number } {
    const unchanged = { fields: parts.map((p) => p.fields), added: 0 };
    const wanted = [...source.fields].filter(([name]) => accept(name));
    if (!wanted.length || !parts.length) return unchanged;
    const bindings = parts.map((p) => this.bind(p.mesh, p.fields));
    // which parts take each field: not one that has its own, and the field is laid again when any of them lacks it as it is now
    const due = wanted.map(([name, field]) => {
      const takes = parts.map((p, i) => { const native = p.fields.fields.get(name); return !native || native === bindings[i].outputs.get(name); });
      const stale = parts.some((p, i) => takes[i] && !(bindings[i].sources.get(name) === field && p.fields.fields.get(name) === bindings[i].outputs.get(name)));
      return { name, field, takes, stale };
    }).filter((d) => d.stale);
    if (!due.length) return unchanged;

    const set = this.boundSet(parts, bindings);
    const maps = parts.map((p) => new Map(p.fields.fields)), touched = parts.map(() => false);
    let added = 0;
    for (const { name, field, takes } of due) {
      this.spread(field);
      // what her skin alone gives each point of each part: its move, and its normal's turn
      parts.forEach((_p, i) => {
        const b = bindings[i], move = set.moves[i], turn = set.turns[i];
        for (let v = 0; v < b.valid.length; v++) {
          const o = v * 3;
          let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
          if (b.valid[v]) for (let c = 0; c < 3; c++) {
            const at = b.tri[o + c] * 3, w = b.bary[o + c];
            x += w * this.dense[at]; y += w * this.dense[at + 1]; z += w * this.dense[at + 2];
            nx += w * this.denseNormal[at]; ny += w * this.denseNormal[at + 1]; nz += w * this.denseNormal[at + 2];
          }
          move[o] = x; move[o + 1] = y; move[o + 2] = z; turn[o] = nx; turn[o + 1] = ny; turn[o + 2] = nz;
        }
      });
      set.evening.even(set.moves);
      parts.forEach((_p, i) => {
        if (!takes[i]) return;
        const b = bindings[i], move = set.moves[i], turn = set.turns[i];
        const index: number[] = [], positions: number[] = [], normals: number[] = [];
        for (let v = 0; v < b.valid.length; v++) {
          const o = v * 3;
          if (move[o] || move[o + 1] || move[o + 2] || turn[o] || turn[o + 1] || turn[o + 2]) { index.push(v); positions.push(move[o], move[o + 1], move[o + 2]); normals.push(turn[o], turn[o + 1], turn[o + 2]); }
        }
        const transferred: Field = { index: Uint32Array.from(index), pos: Float32Array.from(positions), nrm: field.nrm ? Float32Array.from(normals) : null };
        maps[i].set(name, transferred); b.sources.set(name, field); b.outputs.set(name, transferred); touched[i] = true; added++;
      });
    }
    return { fields: parts.map((p, i) => (touched[i] ? { ...p.fields, fields: maps[i], last: '' } : p.fields)), added };
  }

  /** The parts bound as one garment: where each point lies on her (her skin's way out there, how far off her), for the evening. */
  private boundSet(parts: readonly GarmentPart[], bindings: readonly BoundGarment[]): BoundSet {
    const key = parts.map((p) => `${p.mesh.uuid}${p.cord ? 'c' : 'p'}`).join(' ');
    let set = this.sets.get(parts[0].mesh);
    if (set && set.key === key) return set;
    const N = this.skinNormal(), R = this.rest;
    const evening = new CordEvening(parts.map((p, i) => {
      const b = bindings[i], pos = p.fields.basePos, n = b.valid.length, normal = new Float32Array(n * 3), off = new Float32Array(n);
      for (let v = 0; v < n; v++) {
        if (!b.valid[v]) continue;
        const o = v * 3;
        let x = 0, y = 0, z = 0, px = 0, py = 0, pz = 0;
        for (let c = 0; c < 3; c++) {
          const at = b.tri[o + c] * 3, w = b.bary[o + c];
          x += w * N[at]; y += w * N[at + 1]; z += w * N[at + 2];
          px += w * R[at]; py += w * R[at + 1]; pz += w * R[at + 2];
        }
        const l = Math.hypot(x, y, z);
        if (!(l > 1e-20)) continue;
        normal[o] = x / l; normal[o + 1] = y / l; normal[o + 2] = z / l;
        off[v] = Math.hypot(pos[o] - px, pos[o + 1] - py, pos[o + 2] - pz);
      }
      return { pos, cord: p.cord, normal, off };
    }));
    set = { key, evening, moves: parts.map((p) => new Float32Array(p.fields.basePos.length)), turns: parts.map((p) => new Float32Array(p.fields.basePos.length)) };
    this.sets.set(parts[0].mesh, set);
    return set;
  }
}
