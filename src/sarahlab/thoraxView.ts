/**
 * HER LUNGS, HER HEART AND HER DIAPHRAGM IN THE ROOM (the skeleton-outward plan, Phase 2: "Breathing: the diaphragm
 * drops and the lungs fill on each breath. Heart: a blended teardrop between the lungs, tilted left" --
 * actor/thoracicOrgans.ts). They are laid in the inside of her own rib cage as her bones give it and carried by her chest
 * bone: her rib cage holds them, so they are not soft bodies as her belly's organs are (sarahlab/abdomenView.ts) -- they
 * move with her chest, and by themselves only as she breathes and her heart beats.
 *
 * Her breath and her pulse run here (`breathsPerMinute`, `beatsPerMinute`, `depth`): the room leaves them at rest, the
 * game sets them later (running, sleeping, holding her breath).
 */
import * as THREE from 'three';
import { BREATH, HEART, PULSE, diaphragmMesh, diaphragmPoints, heartMesh, heartPoints, layThorax, lungMesh, lungPoints, meshVolume, type ThoraxLandmarks, type ThoraxLayout } from '../actor/thoracicOrgans';

type Name = 'lungL' | 'lungR' | 'heart' | 'diaphragm';
const NAMES: readonly Name[] = ['lungL', 'lungR', 'heart', 'diaphragm'];
/** Lungs pink, her heart dark red, her diaphragm the red-brown of muscle. GAME TUNING. */
const COLOURS: Record<Name, number> = { lungL: 0xe8a6a0, lungR: 0xe8a6a0, heart: 0x9c2f33, diaphragm: 0xa4523c };

/** How they are drawn. GAME TUNING: her lungs and diaphragm are laid again only when her breath has moved `breathStep`
 * (of a quiet breath: about 22 times a breath in, each under a millimetre of her diaphragm; about a millisecond's work
 * each), her heart when its beat has moved `beatStep`; only their points are written (their triangles never change),
 * and their shading is worked out again every `shadeEvery`th time, and once more when they have lain still `restAfter`
 * seconds; her diaphragm a little see-through, so her lungs' bases and her heart show on it; `depthMost`, the deepest
 * `depth` taken. */
export const THORAX_DRAW = Object.freeze({ breathStep: 0.04, beatStep: 0.1, shadeEvery: 2, restAfter: 1, diaphragmOpacity: 0.82, depthMost: 2 });

/** Her breath through one cycle (`at` 0..1 of it): 0 the end of a breath out .. 1 the end of a breath in. Breathing in
 * takes `BREATH.inShare` of it and breathing out the rest, each eased at both ends. */
export function breathCurve(at: number): number {
  const c = at - Math.floor(at), inn = BREATH.inShare;
  return c < inn ? (1 - Math.cos((Math.PI * c) / inn)) / 2 : (1 + Math.cos((Math.PI * (c - inn)) / (1 - inn))) / 2;
}
/** Her heart's squeeze through one beat (`at` 0..1 of it): up to 1 and back over the first `HEART.beatShare` of it, slack after. */
export function beatCurve(at: number): number {
  const c = at - Math.floor(at);
  return c < HEART.beatShare ? Math.sin((Math.PI * c) / HEART.beatShare) : 0;
}

export class ThoraxView {
  /** Her organs as drawn: at the scene's root and carried there with her chest bone (their points are in her rest
   * frame, metres; the group holds that frame as her chest bone has it now). */
  readonly group = new THREE.Group();
  /** How fast she breathes and her heart beats (at rest; the game sets them later). */
  breathsPerMinute: number = BREATH.perMinute;
  beatsPerMinute: number = PULSE.perMinute;
  /** How deep she breathes: 0 not at all .. 1 quietly .. 2 twice as deep. */
  depth = 1;
  private readonly holder = new THREE.Object3D();
  private readonly meshes = new Map<Name, THREE.Mesh>();
  private readonly materials = new Map<Name, THREE.MeshStandardMaterial>();
  private readonly toWorld = new THREE.Matrix4();
  private layout: ThoraxLayout;
  /** how far through a breath and through a beat she is, 0..1 */
  private cycle = 0;
  private pulse = 0;
  /** the breath and the beat they are drawn at */
  private drawnBreath = NaN;
  private drawnBeat = NaN;
  /** how many times her lungs and diaphragm, and her heart, have been laid since their shading was worked out, and how
   * many seconds each has lain still */
  private unshaded = { breath: 0, heart: 0 };
  private still = { breath: 0, heart: 0 };

  /**
   * @param thorax the inside of her rib cage, measured on her bones (actor/thoracicOrgans.ts `measureThorax`)
   * @param chest her chest bone, with her rest frame (metres) as that bone carries it, read at her bind
   * @param units world units per metre
   */
  constructor(private readonly thorax: ThoraxLandmarks, chest: { bone: THREE.Bone; matrix: THREE.Matrix4 }, private readonly units: number) {
    this.holder.matrixAutoUpdate = false; this.holder.matrix.copy(chest.matrix); this.holder.name = 'thoraxOrgans';
    this.group.name = 'thoraxOrgans'; this.group.matrixAutoUpdate = false;
    // (laid before anything is hung on her: if her rib cage cannot be laid in, nothing of this is left on her bone)
    this.layout = layThorax(thorax, 0);
    try {
      const L = this.layout, shapes = { lungL: lungMesh(L, 1), lungR: lungMesh(L, -1), heart: heartMesh(L, 0), diaphragm: diaphragmMesh(L) };
      for (const name of NAMES) {
        const sheet = name === 'diaphragm';
        const material = new THREE.MeshStandardMaterial({ color: COLOURS[name], roughness: 0.55, metalness: 0, side: sheet ? THREE.DoubleSide : THREE.FrontSide, transparent: sheet, opacity: sheet ? THORAX_DRAW.diaphragmOpacity : 1 });
        this.materials.set(name, material);
        const g = new THREE.BufferGeometry(), m = new THREE.Mesh(g, material);
        this.meshes.set(name, m);
        // (its triangles once, here; its points written again as she breathes)
        g.setAttribute('position', new THREE.BufferAttribute(shapes[name].points, 3)); g.setIndex(new THREE.BufferAttribute(shapes[name].triangles, 1));
        m.name = `organ:${name}`; m.frustumCulled = false; this.group.add(m);
      }
      chest.bone.add(this.holder);
      this.follow(); this.draw(); this.shade(NAMES); this.unshaded = { breath: 0, heart: 0 };
    } catch (error) { this.dispose(); throw error; }
  }

  /** Her breath now: 0 the end of a breath out .. 1 the end of a breath in. */
  get breath(): number { return breathCurve(this.cycle); }
  /** Her chest as laid at the breath it is drawn at. */
  get laid(): ThoraxLayout { return this.layout; }

  /** An organ's own points (her rest frame, metres), to be written in place. */
  private points(name: Name): Float32Array {
    const pos = this.meshes.get(name)!.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.needsUpdate = true;
    return pos.array as Float32Array;
  }
  private shade(names: readonly Name[]): void { for (const n of names) this.meshes.get(n)?.geometry.computeVertexNormals(); }
  /** The group brought to where her chest bone carries her rest frame now. */
  private follow(): void {
    this.holder.updateWorldMatrix(true, false);
    this.group.matrix.copy(this.holder.matrixWorld); this.group.matrixWorldNeedsUpdate = true;
  }

  /** One step of `dt` seconds: her breath and her pulse go on, and what has moved enough to see is laid again -- her
   * diaphragm down and her lungs filled as she breathes in, her heart riding on her diaphragm and squeezing once a beat. */
  update(dt: number): void {
    if (dt > 0 && Number.isFinite(dt)) {
      this.cycle = (this.cycle + (dt * Math.max(0, this.breathsPerMinute)) / 60) % 1;
      this.pulse = (this.pulse + (dt * Math.max(0, this.beatsPerMinute)) / 60) % 1;
      this.still.breath += dt; this.still.heart += dt;
    }
    this.follow(); this.draw();
  }

  private draw(): void {
    const D = THORAX_DRAW, deep = Math.min(D.depthMost, Math.max(0, Number.isFinite(this.depth) ? this.depth : 1)), breath = this.breath * deep, beat = beatCurve(this.pulse);
    const breathed = !(Math.abs(breath - this.drawnBreath) < D.breathStep), beaten = breathed || !(Math.abs(beat - this.drawnBeat) < D.beatStep), U = this.unshaded, S = this.still;
    if (breathed) {
      const L = (this.layout = layThorax(this.thorax, breath)); this.drawnBreath = breath;
      lungPoints(L, 1, this.points('lungL')); lungPoints(L, -1, this.points('lungR')); diaphragmPoints(L, this.points('diaphragm'));
      U.breath++; S.breath = 0;
    }
    // (her heart rides on her diaphragm: laid again with her breath as well as with its own beat)
    if (beaten) { heartPoints(this.layout, beat, this.points('heart')); this.drawnBeat = beat; U.heart++; S.heart = 0; }
    // their shading: every `shadeEvery`th time they are laid, and once they have lain still a while
    if (U.breath >= D.shadeEvery || (U.breath > 0 && S.breath >= D.restAfter)) { this.shade(['lungL', 'lungR', 'diaphragm']); U.breath = 0; }
    if (U.heart >= D.shadeEvery || (U.heart > 0 && S.heart >= D.restAfter)) { this.shade(['heart']); U.heart = 0; }
  }

  /** Each organ's drawn points now (world metres): for probes. */
  drawn(name: Name): Float32Array | null {
    const m = this.meshes.get(name);
    if (!m) return null;
    this.holder.updateWorldMatrix(true, false);
    const e = this.toWorld.makeScale(1 / this.units, 1 / this.units, 1 / this.units).multiply(this.holder.matrixWorld).elements, p = (m.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, out = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2];
      out[i] = e[0] * x + e[4] * y + e[8] * z + e[12]; out[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; out[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    return out;
  }
  /** Her breath, what her lungs take up as drawn (mL: air and their own tissue; worked out here, when asked), and her
   * rates: for probes. */
  report(): { breath: number; lungMl: number; beatsPerMinute: number; breathsPerMinute: number } {
    const held = (name: Name) => { const g = this.meshes.get(name)?.geometry; return g?.index ? meshVolume({ points: g.getAttribute('position').array as Float32Array, triangles: g.index.array as Uint32Array }) * 1e6 : 0; };
    return { breath: this.breath, lungMl: held('lungL') + held('lungR'), beatsPerMinute: this.beatsPerMinute, breathsPerMinute: this.breathsPerMinute };
  }
  set visible(on: boolean) { this.group.visible = on; }
  dispose(): void {
    for (const m of this.meshes.values()) { m.removeFromParent(); m.geometry.dispose(); }
    for (const m of this.materials.values()) m.dispose();
    this.meshes.clear(); this.materials.clear();
    this.holder.removeFromParent(); this.group.removeFromParent();
  }
}
