/**
 * HER OPENING AS CLOTH, ON THE TEE'S OWN SETTINGS (Joshua, 2026-11-08, the real baby having torn the doors pushed section
 * by section: "Go back to the full sim and also try the v2 clothing settings for this opening to see if those settings
 * happen to help this out", sending his Sarah's dials -- WEIGHT 25, CALM 100, FIT 100, CLOSE 100, STRETCH 50, GRIP 100,
 * STEPS 43).
 *
 * Her doors' mesh run as cloth the way the tee is (clothSim.ts: XPBD, small steps, one pass a substep): every particle
 * follows the full sim -- each section pushed by its own slice of the baby (birthDoors `pressDoorLine`) -- `follow` of
 * the way each frame, while every edge holds to its length in the doors as the BIRTH OPENING slider lays them at that
 * opening (smooth: no tears), times FIT's pattern, giving by STRETCH up to its most; every pair across an edge bends as
 * that does; CALM damps, WEIGHT pulls down; nothing goes into the baby nearer than CLOSE, and touching it, GRIP holds it
 * from sliding along it. Its roots, where her doors meet her skin and her canal, are held where they are.
 *
 * Units: centimetres and seconds (the tee's own: its compliances are per unit mass in world units, 100 to the metre),
 * in her opening's frame -- x across her, t up her canal, n along her opening. Core: nothing from three or the DOM.
 */
import { DOORS, insideOf, type DoorFrame, type Ends, type PassingOutlines } from './birthDoors';

/** The tee's settings as its dials make them (sarahLabTool `clothTuning`), the cloth's thickness off the baby (cm). */
export interface DoorClothTuning {
  readonly substeps: number; readonly stretchCompliance: number; readonly bendCompliance: number; readonly restScale: number;
  readonly maxStretch: number; readonly damping: number; readonly friction: number; readonly standOff: number;
}

/** How much of the way to the full sim's doors each particle goes a frame (0..1). GAME TUNING. */
export const DOOR_CLOTH = Object.freeze({ follow: 0.35 });

export class DoorCloth {
  private readonly n: number;
  private readonly x: Float64Array; private readonly v: Float64Array; private readonly prev: Float64Array;
  private readonly edges: Uint32Array; private readonly bends: Uint32Array;
  private readonly root: Uint8Array;
  private primed = false;

  /** `triangles` the doors' mesh's; `perSection` points a section, its first and last its roots (birthDoors `section`). */
  constructor(count: number, triangles: Uint32Array, perSection: number) {
    this.n = count; this.x = new Float64Array(count * 3); this.v = new Float64Array(count * 3); this.prev = new Float64Array(count * 3);
    this.root = new Uint8Array(count);
    for (let i = 0; i < count; i++) { const k = i % perSection; if (k === 0 || k === perSection - 1) this.root[i] = 1; }
    // (each edge once; each pair of points facing each other across an edge two triangles share)
    const edge = new Map<string, number>(), e: number[] = [], b: number[] = [];
    for (let f = 0; f < triangles.length; f += 3) for (let s = 0; s < 3; s++) {
      const a = triangles[f + s], c = triangles[f + ((s + 1) % 3)], o = triangles[f + ((s + 2) % 3)], key = a < c ? `${a},${c}` : `${c},${a}`;
      const was = edge.get(key);
      if (was === undefined) { edge.set(key, o); e.push(a, c); } else if (was >= 0) { b.push(was, o); edge.set(key, -1); }
    }
    this.edges = Uint32Array.from(e); this.bends = Uint32Array.from(b);
  }

  /**
   * A frame: `laid` the doors as the slider lays them now (their lengths and bends), `pushed` as the full sim has them
   * (where each particle is drawn), both rest-frame metres as birthDoors `doorMeshes` gives them; `o` what passes, by
   * station; `gravity` in her opening's frame (cm/s²). Returns the cloth (rest-frame metres).
   */
  step(dt: number, f: DoorFrame, laid: Float32Array, pushed: Float32Array, o: PassingOutlines | null, ends: Ends, gravity: readonly number[], s: DoorClothTuning): Float32Array {
    const N = this.n, X = this.x, V = this.v, P = this.prev, toF = (q: Float32Array) => {
      const out = new Float64Array(N * 3);
      for (let i = 0; i < N; i++) {
        const d = [q[3 * i] - f.mouth[0], q[3 * i + 1] - f.mouth[1], q[3 * i + 2] - f.mouth[2]];
        out[3 * i] = 100 * (d[0] * f.x[0] + d[1] * f.x[1] + d[2] * f.x[2]); out[3 * i + 1] = 100 * (d[0] * f.t[0] + d[1] * f.t[1] + d[2] * f.t[2]); out[3 * i + 2] = 100 * (d[0] * f.n[0] + d[1] * f.n[1] + d[2] * f.n[2]);
      }
      return out;
    };
    const L = toF(laid), T = toF(pushed);
    if (!this.primed) { X.set(T); V.fill(0); this.primed = true; }
    const h = Math.min(dt, 1 / 20) / Math.max(1, s.substeps), damp = Math.exp(-s.damping * h);
    // (each particle's share toward the full sim a substep, so that a frame comes `follow` of the way)
    const pull = 1 - (1 - DOOR_CLOTH.follow) ** (1 / Math.max(1, s.substeps));
    // (what passes, by station: its slices along her opening)
    const J = DOORS.stations, alongOf = (j: number) => { const u = -1 + (2 * j) / (J - 1); return 100 * u * (u >= 0 ? ends.front : ends.back); };
    const inside = o ? { right: o.right.map((q) => (q ? insideOf(q) : null)), left: o.left.map((q) => (q ? insideOf(q) : null)) } : null;
    const stationAt = (n: number) => { let best = 0, bd = Infinity; for (let j = 0; j < J; j++) { const d = Math.abs(alongOf(j) - n); if (d < bd) { bd = d; best = j; } } return best; };
    const len = (q: Float64Array, a: number, b: number) => Math.hypot(q[3 * a] - q[3 * b], q[3 * a + 1] - q[3 * b + 1], q[3 * a + 2] - q[3 * b + 2]);
    const solve = (pairs: Uint32Array, compliance: number, limit: boolean) => {
      const at = compliance / (h * h);
      for (let k = 0; k < pairs.length; k += 2) {
        const a = pairs[k], b = pairs[k + 1], wa = this.root[a] ? 0 : 1, wb = this.root[b] ? 0 : 1;
        if (wa + wb === 0) continue;
        const rest = len(L, a, b) * s.restScale, dx = X[3 * a] - X[3 * b], dy = X[3 * a + 1] - X[3 * b + 1], dz = X[3 * a + 2] - X[3 * b + 2], l = Math.hypot(dx, dy, dz);
        if (l < 1e-9) continue;
        let c = l - rest;
        if (limit) { const most = len(L, a, b) * s.maxStretch; c = l > most ? l - most : 0; if (c === 0) continue; }
        const g = limit ? c / (wa + wb) : c / (wa + wb + at), ux = dx / l, uy = dy / l, uz = dz / l;
        X[3 * a] -= wa * g * ux; X[3 * a + 1] -= wa * g * uy; X[3 * a + 2] -= wa * g * uz;
        X[3 * b] += wb * g * ux; X[3 * b + 1] += wb * g * uy; X[3 * b + 2] += wb * g * uz;
      }
    };
    for (let sub = 0; sub < s.substeps; sub++) {
      for (let i = 0; i < N; i++) {
        if (this.root[i]) { for (let c = 0; c < 3; c++) { X[3 * i + c] = P[3 * i + c] = T[3 * i + c]; V[3 * i + c] = 0; } continue; }
        for (let c = 0; c < 3; c++) { V[3 * i + c] = V[3 * i + c] * damp + gravity[c] * h; P[3 * i + c] = X[3 * i + c]; X[3 * i + c] += V[3 * i + c] * h; X[3 * i + c] += (T[3 * i + c] - X[3 * i + c]) * pull; }
      }
      solve(this.edges, s.stretchCompliance, false);
      solve(this.bends, s.bendCompliance, false);
      solve(this.edges, 0, true);
      // (off the baby by CLOSE, and touching it, held by GRIP from sliding along it)
      if (inside) for (let i = 0; i < N; i++) {
        if (this.root[i]) continue;
        const x = X[3 * i], t = X[3 * i + 1] / 100, j = stationAt(X[3 * i + 2]), q = x >= 0 ? inside.right[j] : inside.left[j];
        if (!q) continue;
        const d = q(Math.abs(x) / 100, t) * 100 + s.standOff;
        if (d > 0) {
          X[3 * i] += (x >= 0 ? 1 : -1) * d;
          for (const c of [1, 2]) X[3 * i + c] -= (X[3 * i + c] - P[3 * i + c]) * s.friction;
        }
      }
      for (let i = 0; i < 3 * N; i++) V[i] = (X[i] - P[i]) / h;
    }
    // (back to her rest frame, metres)
    const out = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = X[3 * i] / 100, t = X[3 * i + 1] / 100, n = X[3 * i + 2] / 100;
      for (let c = 0; c < 3; c++) out[3 * i + c] = f.mouth[c] + f.x[c] * a + f.t[c] * t + f.n[c] * n;
    }
    return out;
  }
}
