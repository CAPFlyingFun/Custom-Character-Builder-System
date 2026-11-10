/**
 * HER BELLY'S ORGANS IN THE ROOM (v3, on her skeleton; Joshua, 2026-11-08: the stomach, the intestines as one soft mass,
 * the colon, the sigmoid and rectum, and the kidneys with their ureters -- actor/abdominalOrgans.ts). Each is a simple
 * soft body (actor/organCage.ts) hung from the bone of her spine it lies against -- her stomach from her chest, her
 * kidneys from her upper lumbar spine, her intestines and colon from her lower lumbar spine, her rectum from her pelvis --
 * so they sway, lag and settle as she moves. They are pushed out of her womb as it grows (laid round it, and kept off its
 * soft body as both move), and lie against her bladder and her canal as her pelvic organs do (sarahlab/pelvicOrgansView.ts).
 *
 * How full each is comes from her gut's numbers (actor/gut.ts): the room sets them by hand (STOMACH, BOWEL), the NPC brain
 * later by time.
 */
import * as THREE from 'three';
import { ABDOMEN_DEFAULT_FILL, bean, coiledMass, layAbdomen, outOfBlob, outOfWomb, sweepAny, KIDNEY, type AbdomenFill, type AbdomenLayout, type Blob, type Bean, type Tube } from '../actor/abdominalOrgans';
import type { PelvisLandmarks } from '../actor/pelvicOrgans';
import type { TorsoLandmarks, WombRoom } from '../actor/pregnantWomb';
import { followCage, makeCage, placeCage, restGaps, separate, skinToCage, stepCage, type Cage, type CageSkin, type CageTune } from '../actor/organCage';
import type { P3 } from '../actor/pelvisMeasure';
import { JUMP_ACCEL, type PelvicOrgansView } from './pelvicOrgansView';

/** Which of her bones each hangs from: her pelvis, her lumbar spine below and above L3, her chest. */
export type SpineBone = 'pelvis' | 'lumbar' | 'upper' | 'chest';
type Name = 'stomach' | 'intestines' | 'colon' | 'rectum' | 'kidneyL' | 'kidneyR';
const HUNG: Record<Name, SpineBone> = { stomach: 'chest', intestines: 'lumbar', colon: 'lumbar', rectum: 'pelvis', kidneyL: 'upper', kidneyR: 'upper' };

/** How each soft body is tuned. GAME TUNING: the stomach and bowel loose and soft, the kidneys held firmly by their
 * fascia (they move 2-3 cm with breathing but little with her steps), the rectum held by the pelvic floor. */
export const ABDOMEN_TUNE = Object.freeze({
  stomach: { shape: 0.3, keep: 0.08, tie: 0.03 },
  intestines: { shape: 0.18, keep: 0.1, tie: 0.016 },
  colon: { shape: 0.3, keep: 0.08, tie: 0.04 },
  rectum: { shape: 0.35, keep: 0.06, tie: 0.07 },
  kidneyL: { shape: 0.6, keep: 0.05, tie: 0.12 },
  kidneyR: { shape: 0.6, keep: 0.05, tie: 0.12 },
});
const COLOURS: Record<Name | 'ureter', number> = { stomach: 0xd8968a, intestines: 0xe2aaa0, colon: 0xc89c74, rectum: 0xc28f6c, kidneyL: 0x8a3436, kidneyR: 0x8a3436, ureter: 0xe6d29c };
const MASS: Record<Name, number> = { stomach: 150, intestines: 1000, colon: 450, rectum: 120, kidneyL: KIDNEY.grams, kidneyR: KIDNEY.grams };
const G = 9.81;

interface Organ { readonly name: Name; readonly cage: Cage; readonly skin: CageSkin; readonly mesh: THREE.Mesh; readonly tune: CageTune; readonly out: Float32Array; readonly hold: SpineBone }
interface Holder { readonly bone: SpineBone; readonly node: THREE.Object3D; readonly restQuat: THREE.Quaternion; readonly toWorld: THREE.Matrix4; last: number[] | null; speed: number[] | null; jumped: boolean }

/** A tube's cage: every few stations its middle and four points round it. */
function tubeCage(frames: ReturnType<typeof sweepAny>['frames'], every: number, tie: number, grams: number) {
  const rest: number[] = [], mass: number[] = [], ties: number[] = [], radius: number[] = [];
  for (let k = 0; k < frames.length; k += every) {
    const f = frames[k], r = Math.min(f.a, f.b);
    rest.push(...f.at); mass.push(2); ties.push(tie); radius.push(0.6 * r);
    for (const [u, v] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]] as const) {
      rest.push(f.at[0] + f.n1[0] * f.a * u + f.n2[0] * f.b * v, f.at[1] + f.n1[1] * f.a * u + f.n2[1] * f.b * v, f.at[2] + f.n1[2] * f.a * u + f.n2[2] * f.b * v);
      mass.push(1); ties.push(tie); radius.push(0.35 * r);
    }
  }
  const sum = mass.reduce((a, b) => a + b, 0);
  return { rest, mass: mass.map((m) => (m / sum) * grams), tie: ties, radius };
}
/** A rounded organ's cage: its middle, six points along its axes and eight between them. */
function blobCage(centre: P3, axes: [P3, P3, P3], radii: P3, tie: number, grams: number) {
  const rest: number[] = [], mass: number[] = [], ties: number[] = [], radius: number[] = [];
  const put = (u: number, v: number, w: number, m: number) => {
    rest.push(centre[0] + axes[0][0] * radii[0] * u + axes[1][0] * radii[1] * v + axes[2][0] * radii[2] * w, centre[1] + axes[0][1] * radii[0] * u + axes[1][1] * radii[1] * v + axes[2][1] * radii[2] * w, centre[2] + axes[0][2] * radii[0] * u + axes[1][2] * radii[1] * v + axes[2][2] * radii[2] * w);
    mass.push(m); ties.push(tie); radius.push(0.5 * Math.min(...radii));
  };
  put(0, 0, 0, 3);
  for (const [u, v, w] of [[0.7, 0, 0], [-0.7, 0, 0], [0, 0.7, 0], [0, -0.7, 0], [0, 0, 0.7], [0, 0, -0.7]]) put(u, v, w, 1);
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) put(0.45 * a, 0.45 * b, 0.45 * c, 0.7);
  const sum = mass.reduce((x, y) => x + y, 0);
  return { rest, mass: mass.map((m) => (m / sum) * grams), tie: ties, radius };
}
const AXES: [P3, P3, P3] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function beanAxes(b: Bean): [P3, P3, P3] {
  const up = b.up, d = up[0];
  let ax: P3 = [1 - d * up[0], -d * up[1], -d * up[2]];
  const l = Math.hypot(...ax) || 1; ax = [ax[0] / l, ax[1] / l, ax[2] / l];
  return [ax, up, [ax[1] * up[2] - ax[2] * up[1], ax[2] * up[0] - ax[0] * up[2], ax[0] * up[1] - ax[1] * up[0]]];
}

export class AbdomenView {
  readonly group = new THREE.Group();
  private readonly holders = new Map<SpineBone, Holder>();
  private organs: Organ[] = [];
  private layout: AbdomenLayout | null = null;
  private fillNow: AbdomenFill = { ...ABDOMEN_DEFAULT_FILL };
  private wombLaid: WombRoom | null | undefined = undefined;
  private bladderLaid: unknown = null;
  private touching: { a: Cage; b: Cage; gaps: Float32Array }[] = [];
  private touchingWith: unknown[] = [];
  private readonly materials = new Map<Name | 'ureter', THREE.MeshStandardMaterial>();
  /** each ureter: its rest points, their ties to the kidney and the bladder, and its mesh */
  private ureters: { rest: Float32Array; kidney: CageSkin; kidneyOf: Name; bladder: CageSkin | null; bladderCage: Cage | null; mesh: THREE.Mesh; out: Float32Array }[] = [];

  /**
   * @param bones her spine's bones (her pelvis bone and those above it), each with her rest frame (metres) as that bone
   * carries it, read at her bind
   * @param pelvic her pelvic organs (her womb, bladder and canal, which these lie round)
   */
  constructor(private readonly pelvis: PelvisLandmarks, private readonly torso: TorsoLandmarks & { readonly discs?: readonly number[] }, bones: Record<SpineBone, { bone: THREE.Bone; matrix: THREE.Matrix4 }>, private readonly units: number, private readonly pelvic: PelvicOrgansView) {
    for (const key of Object.keys(bones) as SpineBone[]) {
      const node = new THREE.Object3D(); node.matrixAutoUpdate = false; node.matrix.copy(bones[key].matrix); node.name = 'abdomenOrgans';
      bones[key].bone.add(node); node.updateMatrixWorld(true);
      this.holders.set(key, { bone: key, node, restQuat: node.getWorldQuaternion(new THREE.Quaternion()), toWorld: new THREE.Matrix4(), last: null, speed: null, jumped: false });
    }
    this.group.name = 'abdomenOrgans';
    for (const n of Object.keys(COLOURS) as (Name | 'ureter')[]) this.materials.set(n, new THREE.MeshStandardMaterial({ color: COLOURS[n], roughness: 0.55, metalness: 0 }));
    this.build();
  }

  /** How full each is (actor/gut.ts `drawnFill`); laid again when it changes enough to see. */
  setFill(fill: Partial<AbdomenFill>): void {
    const f = { ...this.fillNow, ...fill }, o = this.fillNow;
    if (Math.abs(f.stomachMl - o.stomachMl) < 5 && Math.abs(f.intestineMl - o.intestineMl) < 10 && Math.abs(f.colonFill - o.colonFill) < 0.02 && Math.abs(f.rectumMl - o.rectumMl) < 3) return;
    this.fillNow = f; this.build();
  }
  get fill(): AbdomenFill { return { ...this.fillNow }; }
  get laid(): AbdomenLayout | null { return this.layout; }

  private holderToWorld(h: Holder): THREE.Matrix4 {
    h.node.updateMatrixWorld(true);
    return h.toWorld.makeScale(1 / this.units, 1 / this.units, 1 / this.units).multiply(h.node.matrixWorld);
  }

  private build(): void {
    for (const o of this.organs) { o.mesh.removeFromParent(); o.mesh.geometry.dispose(); }
    for (const u of this.ureters) { u.mesh.removeFromParent(); u.mesh.geometry.dispose(); }
    this.organs = []; this.ureters = []; this.touching = []; this.touchingWith = [];
    const pl = this.pelvic.laid;
    if (!pl) return;
    const womb = this.pelvic.wombRoom;
    this.wombLaid = womb; this.bladderLaid = pl.bladder;
    const bladder: Blob = { centre: pl.bladder.centre, radii: pl.bladder.radii };
    const opening = pl.vagina.path[0];
    const L = layAbdomen(this.torso, this.pelvis, opening, bladder, this.fillNow, womb);
    this.layout = L;
    const T = ABDOMEN_TUNE;
    const make = (name: Name, mesh: { points: Float32Array; triangles: Uint32Array }, cage: { rest: number[]; mass: number[]; tie: number[]; radius: number[] }) => {
      const c = makeCage(cage.rest, cage.mass, cage.tie, cage.radius), skin = skinToCage(c, mesh.points, 4);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mesh.points.length), 3)); g.setIndex(new THREE.BufferAttribute(mesh.triangles, 1));
      const m = new THREE.Mesh(g, this.materials.get(name)!); m.name = `organ:${name}`; m.frustumCulled = false;
      this.group.add(m);
      this.organs.push({ name, cage: c, skin, mesh: m, tune: { shape: T[name].shape, keep: T[name].keep }, out: new Float32Array(mesh.points.length), hold: HUNG[name] });
    };
    // (each drawn round her womb and her bladder: what would lie in them pushed out)
    const keepOut = (points: Float32Array, blobs: Blob[] = []) => { if (womb) outOfWomb(points, womb); for (const b of blobs) outOfBlob(points, b, 0.003); return points; };
    const tube = (name: Name, t: Tube, ring: number, every: number, blobs: Blob[] = []) => {
      const s = sweepAny(t.path, t.halves, ring, 4);
      make(name, { points: keepOut(s.points, blobs), triangles: s.triangles }, tubeCage(s.frames, every, T[name].tie, MASS[name]));
    };
    const intestines: Blob = { centre: L.intestines.centre, radii: L.intestines.radii };
    tube('stomach', L.stomach, 18, 3, [intestines]);
    { const m = coiledMass(intestines); make('intestines', { points: keepOut(m.points, [bladder]), triangles: m.triangles }, blobCage(intestines.centre, AXES, intestines.radii, T.intestines.tie, MASS.intestines)); }
    tube('colon', L.colon, 12, 3, [intestines]);
    tube('rectum', L.rectum, 12, 3, [bladder]);
    for (const k of L.kidneys) { const name: Name = k.side > 0 ? 'kidneyL' : 'kidneyR'; make(name, bean(k), blobCage(k.centre, beanAxes(k), k.radii, T[name].tie, MASS[name])); }
    // each ureter: its top tied to its kidney, its foot to the bladder, carried by her lumbar spine between
    L.ureters.forEach((path, i) => {
      const rest = Float32Array.from(path.flat()), kn: Name = i === 0 ? 'kidneyL' : 'kidneyR', kidney = this.organs.find((o) => o.name === kn)!.cage;
      const g = new THREE.BufferGeometry(); const mesh = new THREE.Mesh(g, this.materials.get('ureter')!); mesh.name = 'organ:ureter'; mesh.frustumCulled = false; this.group.add(mesh);
      this.ureters.push({ rest, kidney: skinToCage(kidney, rest, 3), kidneyOf: kn, bladder: null, bladderCage: null, mesh, out: new Float32Array(rest.length) });
    });
    for (const h of this.holders.values()) { h.last = null; }
    this.draw();
  }

  /** The pairs that push on one another (kept again whenever her pelvic organs are laid again). */
  private touch(): void {
    const by = (n: Name) => this.organs.find((o) => o.name === n)?.cage;
    const womb = this.pelvic.cage('uterus'), bladder = this.pelvic.cage('bladder'), canal = this.pelvic.cage('vagina');
    const key = [womb, bladder, canal];
    if (this.touching.length && key.every((k, i) => k === this.touchingWith[i])) return;
    this.touchingWith = key; this.touching = [];
    const pair = (a: Cage | undefined | null, b: Cage | undefined | null) => { if (a && b) this.touching.push({ a, b, gaps: restGaps(a, b) }); };
    pair(by('intestines'), womb); pair(by('intestines'), bladder); pair(by('intestines'), by('stomach')); pair(by('intestines'), by('colon'));
    pair(by('colon'), womb); pair(by('stomach'), womb); pair(by('rectum'), canal); pair(by('rectum'), womb); pair(by('rectum'), bladder);
  }

  /** One step of `dt` seconds: each follows the bone it hangs from as a soft body, feeling only gravity's change as she
   * leans; a pose put on in one frame simply carries them (as her pelvic organs, `JUMP_ACCEL`). */
  update(dt: number): void {
    const pl = this.pelvic.laid;
    if (pl && (this.pelvic.wombRoom !== this.wombLaid || pl.bladder !== this.bladderLaid)) this.build();
    if (!this.organs.length) return;
    this.touch();
    for (const h of this.holders.values()) {
      const e = this.holderToWorld(h).elements, now = [e[12], e[13], e[14], e[12] + e[4] * 0.1, e[13] + e[5] * 0.1, e[14] + e[6] * 0.1];
      h.jumped = false;
      if (h.last && h.speed && dt > 0) { let off = 0; for (let i = 0; i < 6; i++) off = Math.max(off, Math.abs(now[i] - (h.last[i] + h.speed[i] * dt))); if (off > JUMP_ACCEL * dt * dt) h.jumped = true; }
      if (h.last && dt > 0 && !h.jumped) h.speed = now.map((v, i) => (v - h.last![i]) / dt);
      h.last = now;
    }
    for (const o of this.organs) {
      const h = this.holders.get(o.hold)!, toWorld = h.toWorld.elements;
      if (h.jumped) { placeCage(o.cage, toWorld); continue; }
      const q = h.node.getWorldQuaternion(new THREE.Quaternion()), held = new THREE.Vector3(0, -G, 0).applyQuaternion(h.restQuat.clone().invert()).applyQuaternion(q);
      stepCage(o.cage, dt, toWorld, [-held.x, -G - held.y, -held.z], o.tune);
    }
    for (const t of this.touching) separate(t.a, t.b, t.gaps);
    this.draw();
  }

  private draw(): void {
    if (this.organs.some((o) => !o.cage.primed)) for (const o of this.organs) { const h = this.holders.get(o.hold)!; stepCage(o.cage, 0, this.holderToWorld(h).elements, [0, 0, 0], o.tune); }
    for (const o of this.organs) {
      followCage(o.cage, o.skin, o.out);
      const pos = o.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i++) arr[i] = o.out[i] * this.units;
      pos.needsUpdate = true; o.mesh.geometry.computeVertexNormals();
    }
    this.drawUreters();
  }

  /** Each ureter: its top third with its kidney, its foot with her bladder, between carried by her lumbar spine. */
  private drawUreters(): void {
    const bladder = this.pelvic.cage('bladder'), lumbar = this.holders.get('lumbar');
    if (!lumbar) return;
    const L = this.holderToWorld(lumbar).elements;
    for (const u of this.ureters) {
      const kc = this.organs.find((o) => o.name === u.kidneyOf)?.cage;
      if (!kc) continue;
      if (bladder && u.bladderCage !== bladder) { u.bladderCage = bladder; u.bladder = skinToCage(bladder, u.rest, 3); }
      const n = u.rest.length / 3, a = new Float32Array(u.rest.length), b = new Float32Array(u.rest.length);
      followCage(kc, u.kidney, a);
      if (u.bladder && bladder) followCage(bladder, u.bladder, b);
      const path: P3[] = [], halves: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), x = u.rest[3 * i], y = u.rest[3 * i + 1], z = u.rest[3 * i + 2];
        const c: P3 = [L[0] * x + L[4] * y + L[8] * z + L[12], L[1] * x + L[5] * y + L[9] * z + L[13], L[2] * x + L[6] * y + L[10] * z + L[14]];
        const wk = Math.max(0, 1 - t / 0.35) ** 2, wb = u.bladder ? Math.max(0, (t - 0.7) / 0.3) ** 2 : 0, wc = 1 - wk - wb;
        path.push([(a[3 * i] * wk + b[3 * i] * wb + c[0] * wc) * this.units, (a[3 * i + 1] * wk + b[3 * i + 1] * wb + c[1] * wc) * this.units, (a[3 * i + 2] * wk + b[3 * i + 2] * wb + c[2] * wc) * this.units]);
        halves.push([KIDNEY.ureterR * this.units, KIDNEY.ureterR * this.units]);
      }
      const s = sweepAny(path, halves, 8, 2), g = u.mesh.geometry;
      g.setAttribute('position', new THREE.BufferAttribute(s.points, 3)); g.setIndex(new THREE.BufferAttribute(s.triangles, 1)); g.computeVertexNormals();
    }
  }

  /** Their drawn points now (world units), for her belly's skin to lie over: the stomach, intestines and colon (what fills
   * her belly; her kidneys and rectum lie behind and below it). */
  fillingPoints(): Float32Array[] {
    return this.organs.filter((o) => o.name === 'stomach' || o.name === 'intestines' || o.name === 'colon').map((o) => (o.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array);
  }
  /** Each organ's drawn points now (world metres): for probes. */
  drawn(name: Name): Float32Array | null { return this.organs.find((o) => o.name === name)?.out ?? null; }
  /** How far each soft body is from where its bone holds it now, metres. */
  sway(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const o of this.organs) {
      const e = this.holderToWorld(this.holders.get(o.hold)!).elements, r = o.cage.rest;
      let most = 0;
      for (let i = 0; i < o.cage.n; i++) {
        const x = r[3 * i], y = r[3 * i + 1], z = r[3 * i + 2];
        most = Math.max(most, Math.hypot(o.cage.x[3 * i] - (e[0] * x + e[4] * y + e[8] * z + e[12]), o.cage.x[3 * i + 1] - (e[1] * x + e[5] * y + e[9] * z + e[13]), o.cage.x[3 * i + 2] - (e[2] * x + e[6] * y + e[10] * z + e[14])));
      }
      out[o.name] = most;
    }
    return out;
  }
  set visible(on: boolean) { this.group.visible = on; }
  dispose(): void {
    for (const o of this.organs) { o.mesh.removeFromParent(); o.mesh.geometry.dispose(); }
    for (const u of this.ureters) { u.mesh.removeFromParent(); u.mesh.geometry.dispose(); }
    for (const m of this.materials.values()) m.dispose();
    for (const h of this.holders.values()) h.node.removeFromParent();
    this.group.removeFromParent(); this.organs = []; this.ureters = []; this.touching = [];
  }
}
