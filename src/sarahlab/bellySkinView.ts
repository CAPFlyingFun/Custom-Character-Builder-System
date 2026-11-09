/**
 * HER BELLY'S SKIN IN THE ROOM (v3, on her skeleton; the skeleton-outward plan, the belly skin proof): the test band
 * (actor/bellySkin.ts) carried by her spine's bones, pushed out by her womb, intestines and stomach as their soft bodies
 * have them each frame, swaying on v2's belly spring (softBody.ts `bellyTune`: FIRMNESS, BOUNCE, BABY WEIGHT), and after a
 * birth soft, then firming up. Drawn in the world at the scene's root as her organs are, see-through under X-RAY's first
 * half (`setSeen`).
 */
import * as THREE from 'three';
import { BELLY_SKIN, bandFolds, bandRoom, bandState, layBand, rowMatrices, shapeBand, v2Push, type Band, type BandState, type SavedBelly, type V2Shapes } from '../actor/bellySkin';
import { bellyTune, feltAcceleration, restingMass, restingSoftBelly, softBellyWant, stepMass, stepSoftBelly, type Mass } from './softBody';
import { JUMP_ACCEL } from './pelvicOrgansView';

/** Her skin's colour on the test band (the doors' outer skin's). */
const SKIN_COLOUR = 0xe9c3aa;

export interface BellySkinTune {
  readonly bump: number; readonly firmness: number; readonly babyWeight: number; readonly bounce: number;
  /** v2's soft settle (softBody.ts `softBellyWant`): her womb against a full-term one, whether she stands (her upright is
   * learnt then), and how fed she is (0..1: her stomach against a full one -- it firms her belly a little) */
  readonly fullness?: number; readonly standing?: boolean; readonly fed?: number;
  /** v2's approved belly now (actor/bellySkin.ts `v2Outline`): her BUMP % as shown and her Body panel's belly controls;
   * null not pregnant */
  readonly v2Look?: { readonly bump: number; readonly controls: Readonly<Partial<Record<string, number>>> } | null;
}

export class BellySkinView {
  readonly mesh: THREE.Mesh;
  readonly band: Band;
  private readonly state: BandState;
  private readonly bones: { bone: THREE.Bone; fromRest: THREE.Matrix4 }[];
  private readonly boneNow: Float32Array[];
  private rows: Float32Array;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly mass: Mass = restingMass();
  private anchor: { p: THREE.Vector3; v: THREE.Vector3; primed: number } = { p: new THREE.Vector3(), v: new THREE.Vector3(), primed: 0 };
  private readonly anchorRow: number;
  private mostM = 0;
  private sway: [number, number, number] = [0, 0, 0];
  /** v2's soft settle: her belly hanging with her torso's angle -- to a side, sagging, deeper or flatter -- and her
   * upright as learnt standing (both in the band's own frame) */
  private readonly soft = restingSoftBelly();
  private readonly upright = new THREE.Vector3(0, -1, 0);
  private readonly down = new THREE.Vector3();

  /**
   * @param bones her bones by name (her skeleton's), and `modelAtBind` her model's world matrix read at her bind (her rest
   * frame, metres, to the world)
   */
  private v2Field: Float32Array | null = null;
  constructor(saved: SavedBelly, private readonly v2: V2Shapes | null, landmarks: { navel: number; xiphoid: readonly number[]; symphysisTop: readonly number[] }, bones: (name: string) => THREE.Bone | undefined, modelAtBind: THREE.Matrix4, private readonly units: number) {
    this.band = layBand(saved, landmarks.navel, landmarks.xiphoid, landmarks.symphysisTop, undefined, v2);
    this.state = bandState(this.band);
    this.bones = this.band.spine.map((name) => {
      const bone = bones(name);
      if (!bone) throw new Error(`[bellySkin] no bone ${name}`);
      bone.updateMatrixWorld(true);
      return { bone, fromRest: new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(modelAtBind) };
    });
    this.boneNow = this.bones.map(() => new Float32Array(16));
    this.rows = new Float32Array(this.band.rows * 16);
    this.anchorRow = Math.round(this.band.rows * 0.45);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.band.points.length), 3));
    g.setIndex(new THREE.BufferAttribute(this.band.triangles, 1));
    this.material = new THREE.MeshStandardMaterial({ color: SKIN_COLOUR, roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.name = 'bellySkin'; this.mesh.frustumCulled = false;
    this.update(0, [], { bump: 0, firmness: 50, babyWeight: 0, bounce: 100 });
  }

  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly tmp = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();
  private readonly acc = new THREE.Vector3();
  private readonly felt = new THREE.Vector3();

  /** One frame of `dt` seconds: carried by her spine, pushed out by `sources` (world units: what fills her as drawn now),
   * swaying on her belly's spring tuned by `tune`. */
  update(dt: number, sources: readonly ArrayLike<number>[], tune: BellySkinTune): void {
    this.bones.forEach((b, k) => { b.bone.updateMatrixWorld(true); this.m4.multiplyMatrices(b.bone.matrixWorld, b.fromRest); this.boneNow[k].set(this.m4.elements); });
    this.rows = rowMatrices(this.band, this.boneNow, this.rows);
    // HER BELLY'S SPRING: what her body does at the middle of the band, in the band's own frame there
    const o = 16 * this.anchorRow, R = this.rows, k = this.anchorRow, cx = this.band.cx[k], cy = this.band.y[k], cz = this.band.cz[k] + 0.08;
    this.tmp.set(R[o] * cx + R[o + 4] * cy + R[o + 8] * cz + R[o + 12], R[o + 1] * cx + R[o + 5] * cy + R[o + 9] * cz + R[o + 13], R[o + 2] * cx + R[o + 6] * cy + R[o + 10] * cz + R[o + 14]).multiplyScalar(1 / this.units);
    this.acc.set(0, 0, 0);
    let jumped = false;
    if (dt > 0 && this.anchor.primed >= 1) {
      this.vel.copy(this.tmp).sub(this.anchor.p).divideScalar(dt);
      if (this.anchor.primed >= 2) { this.acc.copy(this.vel).sub(this.anchor.v).divideScalar(dt); if (this.acc.length() > JUMP_ACCEL) { jumped = true; this.acc.set(0, 0, 0); } }
      this.anchor.v.copy(this.vel); this.anchor.primed = Math.min(2, this.anchor.primed + 1);
    } else if (dt > 0) this.anchor.primed = 1;
    this.anchor.p.copy(this.tmp);
    if (dt > 0) {
      this.m4.fromArray(R, o); this.q.setFromRotationMatrix(this.m4.extractRotation(this.m4)).invert();
      feltAcceleration(this.acc, this.q, this.felt);
      const t = bellyTune(tune.bump, tune.firmness, tune.babyWeight, tune.bounce), loose = this.state.loose * BELLY_SKIN.soften.looser;
      // (after a birth her skin is looser: slower, less damped, more of its travel shown)
      const T = { hz: t.hz * (1 - 0.45 * loose), damping: t.damping * (1 - 0.4 * loose), maxM: BELLY_SKIN.swayMost, gain: Math.max(t.gain, 0.5 * loose) * (1 + loose) };
      if (jumped) { this.mass.vx = this.mass.vy = this.mass.vz = 0; }
      stepMass(this.mass, dt, this.felt.x, this.felt.y, this.felt.z, T);
      this.sway = [this.mass.x * T.gain, this.mass.y * T.gain, this.mass.z * T.gain];
      // V2'S SOFT SETTLE: the way down in the band's frame, against her upright as she stands
      this.down.set(0, -1, 0).applyQuaternion(this.q).normalize();
      if (tune.standing) this.upright.lerp(this.down, Math.min(1, dt * 2)).normalize();
      const full = tune.fullness ?? 0;
      if (full > 0.02) stepSoftBelly(this.soft, dt, softBellyWant(this.down, this.upright, null, full, tune.firmness, tune.fed ?? 0), full);
      else stepSoftBelly(this.soft, dt, { side: 0, sag: 0, depth: 0 }, 1);
    }
    const pos = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const shape = this.v2 && tune.v2Look ? (this.v2Field = v2Push(this.band, this.v2, tune.v2Look.bump, tune.v2Look.controls, this.v2Field ?? undefined)) : null;
    this.mostM = shapeBand(this.band, this.rows, sources, this.state, pos.array as Float32Array, this.units, dt, this.sway, [this.soft.side, this.soft.sag, this.soft.depth], shape);
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /** Her belly's room at v2's shape for these weights (rest metres; + outside): for her womb to be drawn inside it. */
  room(look: BellySkinTune['v2Look']): ((x: number, y: number, z: number) => number) | null {
    return this.v2 && look ? bandRoom(this.band, v2Push(this.band, this.v2, look.bump, look.controls)) : null;
  }
  /** After a birth her skin is soft, then firms up as it comes back in; otherwise it follows what fills her. */
  setAfterBirth(on: boolean): void { this.state.afterBirth = on; }
  /** X-RAY's first half: her skin from solid (1) to nearly gone (0). */
  setSeen(share: number): void {
    const s = Math.min(1, Math.max(0, share)), see = s < 0.999;
    if (this.material.transparent !== see) { this.material.transparent = see; this.material.depthWrite = !see; this.material.needsUpdate = true; }
    this.material.opacity = Math.max(0.04, s);
    this.mesh.visible = s > 0.04;
  }

  /** For probes: how far it stands out most past its rest (metres), how loose it is, the spring's sway (metres), how many
   * places it folds or passes through itself, and its drawn points (world units). */
  report(): { mostCm: number; loose: number; swayCm: number[]; soft: number[]; folds: number; points: number; rows: number; cols: number } {
    const pos = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    return { mostCm: +(this.mostM * 100).toFixed(2), loose: +this.state.loose.toFixed(3), swayCm: this.sway.map((x) => +(x * 100).toFixed(2)), soft: [this.soft.side, this.soft.sag, this.soft.depth].map((x) => +x.toFixed(3)), folds: bandFolds(this.band, pos.array as Float32Array, this.rows), points: pos.count, rows: this.band.rows, cols: this.band.cols };
  }
  drawn(): Float32Array { return (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array; }
  rowFrames(): Float32Array { return this.rows; }

  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.material.dispose(); }
}
