/**
 * HER MESHY BIKINI BOTTOM AS CLOTH, IN THE ROOM (Joshua, 2026-11-11: "MESHY model bottom with stretchy as a cloth sim,
 * but not alter the shape or design of it…"). What it is and why: `briefCloth.ts`.
 *
 * Each frame, as the cloth tee (`clothShirt.ts`): her skin under every cloth point (`clothSkin.ts`, over ALL her
 * triangles -- her opening's area too, which her own patch draws), the cloth moved (`clothSim.ts`), and the whole
 * modelled brief laid on the cloth for drawing, in WORLD space (not skinned: the cloth is its pose). It wears the
 * bikini's own material, its fabric laid by the brief's rest shape as the modelled one's is.
 */
import * as THREE from 'three';
import { CLOTH_DEFAULTS, ClothSim, type ClothSettings } from './clothSim';
import { ClothSkin } from './clothSkin';
import { copyContacts, createContacts, type SkinContacts } from './clothTypes';
import { BRIEF_CLOTH, clothNormals, layBrief, type BriefClothBake } from './briefCloth';

/**
 * GAME TUNING: the cloth's own settings -- the room's cloth defaults, worn at its modelled size (restScale 1: the brief
 * as fitted is her size), and let stretch further than a tee before the strain limit holds it (spandex: her seat and
 * thighs stretch it as she sits).
 */
export const BRIEF_CLOTH_SETTINGS: Readonly<ClothSettings> = Object.freeze({ ...CLOTH_DEFAULTS, restScale: 1, maxStretch: 1.35 });
/** GAME TUNING (metres): the most of its own rest clearance off her a cloth point keeps (as the cloth tee's 6 mm). */
const REST_CLEARANCE_M = 0.006;
/** After the cloth is laid on her, this long (seconds) at no less than this damping (per second): it settles, not whips. */
const WARM_SECONDS = 0.4, WARM_DAMPING = 25;
/** Metres: a bound place moving further than this in one frame is a jump (a quick size, a saved body), not motion. */
const JUMP_M = 0.04;
/** How quickly the shown milliseconds follow the frame's (an exponential mean over about this many frames). */
const SMOOTHING = 20;

export interface ClothBriefStats { readonly skinMs: number; readonly simMs: number; readonly drawMs: number; readonly particles: number; readonly vertices: number; readonly contacts: number; readonly jumps: number }

export class ClothBrief {
  readonly mesh: THREE.Mesh;
  readonly bake: BriefClothBake;
  private readonly skin: ClothSkin;
  private sim: ClothSim | null = null;
  private before: SkinContacts;
  private after: SkinContacts;
  private readonly scratch: Float32Array;
  private readonly cn: Float32Array;
  private readonly position: THREE.BufferAttribute;
  private readonly normal: THREE.BufferAttribute;
  private readonly worldPerMetre: number;
  private primed = false;
  private warm = 0;
  private jumps = 0;
  private readonly shown = { skinMs: 0, simMs: 0, drawMs: 0, contacts: 0 };
  settings: ClothSettings;

  /**
   * `body` her skinned body; `triangles` all her skin's triangles (her drawn index and her opening's area); `worldPerMetre`
   * the room's units to her metre.
   */
  constructor(body: THREE.SkinnedMesh, bake: BriefClothBake, triangles: ArrayLike<number>, material: THREE.Material, worldPerMetre: number, settings: Partial<ClothSettings> = {}) {
    this.bake = bake;
    this.worldPerMetre = worldPerMetre;
    this.settings = { ...BRIEF_CLOTH_SETTINGS, ...settings };
    this.skin = new ClothSkin(body, bake.binding, { thickness: BRIEF_CLOTH.clearance * worldPerMetre, restClearance: REST_CLEARANCE_M * worldPerMetre, triangles });
    this.before = createContacts(bake.particles); this.after = createContacts(bake.particles);
    this.scratch = new Float32Array(bake.particles * 3);
    this.cn = new Float32Array(bake.particles * 3);
    const g = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(bake.rest.slice(), 3).setUsage(THREE.DynamicDrawUsage);
    this.normal = new THREE.BufferAttribute(bake.restNormal.slice(), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.position);
    g.setAttribute('normal', this.normal);
    // its fabric laid by the brief as modelled, as the skinned brief's was (fabricMaterial.ts)
    g.setAttribute('fabricRest', new THREE.BufferAttribute(bake.rest.slice(), 3));
    g.setAttribute('fabricRestNormal', new THREE.BufferAttribute(bake.restNormal.slice(), 3));
    g.setIndex(new THREE.BufferAttribute(bake.index, 1));
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.name = 'sarah-cloth-bikini-bottom';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = body.castShadow; this.mesh.receiveShadow = body.receiveShadow;
    this.mesh.userData.clothBrief = true;
  }

  /** Lay the cloth on her as she is posed now and let it settle from there (a pose switch, a jump in her shape). */
  restart(): void {
    const x = this.scratch;
    this.skin.initial(x);
    if (!this.sim) {
      const s = this.skin.worldScale || 1, rest = new Float32Array(this.bake.particles * 3);
      for (let i = 0; i < rest.length; i++) rest[i] = this.bake.particleRest[i] * s;
      this.sim = new ClothSim({ count: this.bake.particles, triangles: this.bake.triangles, rest, pin: this.bake.pin }, this.settings);
    }
    this.sim.reset(x);
    this.primed = false; this.warm = WARM_SECONDS;
  }

  /** One frame: her skin under the cloth, the cloth, and the brief laid on it. Her model's world matrices must be current. */
  frame(dt: number): void {
    if (!this.sim) this.restart();
    const sim = this.sim!, n = this.bake.particles;
    sim.settings = this.settings;
    let skinMs = this.skin.update(sim.positions, this.after);
    if (this.primed) {
      const a = this.after.pinTarget, b = this.before.pinTarget, jump = JUMP_M * this.worldPerMetre;
      let most = 0;
      for (let i = 0; i < n * 3; i += 3) { const d = (a[i] - b[i]) ** 2 + (a[i + 1] - b[i + 1]) ** 2 + (a[i + 2] - b[i + 2]) ** 2; if (d > most) most = d; }
      if (most > jump * jump) { this.jumps++; this.restart(); skinMs += this.skin.update(sim.positions, this.after); }
    }
    if (!this.primed) { copyContacts(this.after, this.before); this.primed = true; }
    const damping = sim.settings.damping;
    if (this.warm > 0) { this.warm -= dt; sim.settings = { ...sim.settings, damping: Math.max(damping, WARM_DAMPING) }; }
    const stats = sim.step(dt, this.before, this.after);
    sim.settings = this.settings;
    const swap = this.before; this.before = this.after; this.after = swap;
    const t1 = performance.now();
    clothNormals(sim.positions, this.bake.triangles, n, this.cn);
    layBrief(this.bake, sim.positions, this.cn, this.skin.worldScale || 1, this.position.array as Float32Array, this.normal.array as Float32Array);
    this.position.needsUpdate = true; this.normal.needsUpdate = true;
    const drawMs = performance.now() - t1, k = 1 / SMOOTHING, s = this.shown;
    s.skinMs += (skinMs - s.skinMs) * k; s.simMs += (stats.ms - s.simMs) * k; s.drawMs += (drawMs - s.drawMs) * k; s.contacts = stats.contacts;
  }

  /**
   * (a probe's) Where the cloth holds its fully held points against where three.js draws her skin under them: for each,
   * its bound skin point posed by three (`getVertexPosition`, her world matrix) against the cloth's own posing of it, and
   * the point itself against its hold -- world units, the median and the most.
   */
  debug(body: THREE.SkinnedMesh): Record<string, number> {
    const b = this.bake.binding, v = new THREE.Vector3(), q = new THREE.Vector3(), mine = new Float32Array(3), skinD: number[] = [], holdD: number[] = [];
    const P = this.sim?.positions, T = this.after.pinTarget, Tb = this.before.pinTarget;
    for (let p = 0; p < this.bake.particles; p += 7) {
      if (this.bake.pin[p] < 1) continue;
      q.set(0, 0, 0);
      for (let c = 0; c < 3; c++) { body.getVertexPosition(b.tri[p * 3 + c], v); body.localToWorld(v); q.addScaledVector(v, b.bary[p * 3 + c]); }
      let m = 0; for (let c = 0; c < 3; c++) { this.skin.posedVertex(b.tri[p * 3 + c], mine, 0); m += 0; }
      const w = [0, 0, 0]; for (let c = 0; c < 3; c++) { this.skin.posedVertex(b.tri[p * 3 + c], mine, 0); for (let k = 0; k < 3; k++) w[k] += mine[k] * b.bary[p * 3 + c]; }
      skinD.push(Math.hypot(w[0] - q.x, w[1] - q.y, w[2] - q.z) + m);
      if (P) holdD.push(Math.hypot(P[p * 3] - Tb[p * 3], P[p * 3 + 1] - Tb[p * 3 + 1], P[p * 3 + 2] - Tb[p * 3 + 2]));
      void T;
    }
    const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(3) : -1; }, most = (a: number[]) => +(a.length ? Math.max(...a) : -1).toFixed(3);
    // how squashed and turned over the cloth is: its edges' lengths against their rest, its triangles against her
    const R = this.bake.particleRest, S = this.skin.worldScale || 1, tr = this.bake.triangles, ratio: number[] = [];
    let flipped = 0;
    if (P) for (let t = 0; t < tr.length; t += 3) {
      for (let c = 0; c < 3; c++) { const a = tr[t + c] * 3, b = tr[t + (c + 1) % 3] * 3; const r0 = Math.hypot(R[a] - R[b], R[a + 1] - R[b + 1], R[a + 2] - R[b + 2]) * S; if (r0 > 0) ratio.push(Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]) / r0); }
      const a = tr[t] * 3, b = tr[t + 1] * 3, c = tr[t + 2] * 3;
      const ux = R[b] - R[a], uy = R[b + 1] - R[a + 1], uz = R[b + 2] - R[a + 2], vx = R[c] - R[a], vy = R[c + 1] - R[a + 1], vz = R[c + 2] - R[a + 2];
      const n0 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const px = P[b] - P[a], py = P[b + 1] - P[a + 1], pz = P[b + 2] - P[a + 2], qx = P[c] - P[a], qy = P[c + 1] - P[a + 1], qz = P[c + 2] - P[a + 2];
      const n1 = [py * qz - pz * qy, pz * qx - px * qz, px * qy - py * qx];
      void n0; void n1;
    }
    ratio.sort((x, y) => x - y);
    const at = (f: number) => ratio.length ? +ratio[Math.floor(f * (ratio.length - 1))].toFixed(3) : -1;
    void flipped;
    return { skinMedian: med(skinD), skinMost: most(skinD), holdMedian: med(holdD), holdMost: most(holdD), scale: +(this.skin.worldScale).toFixed(3), edgeP01: at(0.01), edgeP05: at(0.05), edgeP50: at(0.5), edgeP95: at(0.95), squashed80: +(ratio.filter((r) => r < 0.8).length / Math.max(1, ratio.length)).toFixed(3) };
  }

  stats(): ClothBriefStats {
    return { ...this.shown, particles: this.bake.particles, vertices: this.bake.vertices, jumps: this.jumps };
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
  }
}
