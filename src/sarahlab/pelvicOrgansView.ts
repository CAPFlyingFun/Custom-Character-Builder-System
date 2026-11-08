/**
 * HER PELVIC ORGANS IN THE ROOM (the skeleton-outward plan, Phase 1; v3, on her skeleton). The womb with its cervix, the
 * birth canal and the bladder, laid out against her measured pelvis (actor/pelvicOrgans.ts, src/data/pelvis/), each a
 * simple soft body (actor/organCage.ts) hung from her pelvis bone: tied by its ligaments where anatomy ties it -- the
 * cervix and the canal hard, the womb's body and the bladder's dome loosely -- so they sway, lag and settle as she moves
 * and come back to rest when she stops. Standing still they are exactly where they were laid: what they feel of gravity
 * is only its change as she leans away from upright (at rest her tissue already carries her organs' weight).
 *
 * PREGNANT, her womb is grown for HER WEEKS from what it holds (actor/pregnantWomb.ts) and seen through; her bladder is
 * pressed by it; its sac is where the room's baby code packs her babies (`sac`), and where they need more room than it
 * grew its wall gives it (`fitSac`); what its soft body does carries them (`wombMove`).
 */
import * as THREE from 'three';
import { BLADDER, layOrgans, organMeshes, subPath, wombAxis, wombHalf, along, lengthOf, type OrganLayout, type OrganMesh, type PelvisLandmarks } from '../actor/pelvicOrgans';
import { WOMB_SHAPE, growWomb, pregnantLayout, wombSac, type PregnantWomb, type TorsoLandmarks } from '../actor/pregnantWomb';
import { BIRTH_OPENING, openCanal, type CanalBones } from '../actor/birthCanal';
import { DOORS, doorFrame, doorMeshes, outerSkin, swingDoors, swingFor, type DoorFrame } from '../actor/birthDoors';
import { NP, NT, sacRadius, type WombShape } from './baby';
import { followCage, makeCage, placeCage, restGaps, separate, skinToCage, stepCage, type Cage, type CageSkin, type CageTune } from '../actor/organCage';
import type { P3 } from '../actor/pelvisMeasure';

/** How each organ's soft body is tuned. GAME TUNING: firm enough to keep its shape, damped so a sway settles in about a
 * second ("not like jelly"), its ties looser where anatomy leaves it free. */
export const ORGAN_TUNE = Object.freeze({
  uterus: { shape: 0.35, keep: 0.08, tieFrom: 0.06, tieTo: 0.012 },
  vagina: { shape: 0.4, keep: 0.05, tieFrom: 0.09, tieTo: 0.05 },
  bladder: { shape: 0.25, keep: 0.1, tieFrom: 0.06, tieTo: 0.01 },
});
/** How much of her pregnant womb's wall is drawn (the rest seen through, to what it holds). GAME TUNING. */
const WOMB_SEEN = 0.45;
/** Their colours: muscle for the womb, mucosa for the canal, a bladder's wall over what it holds. */
const COLOURS = Object.freeze({ uterus: 0xb04a52, vagina: 0xd88895, bladder: 0xd8c25a });
/** Her opening's doors: the canal's lining inside, her outer skin outside (the test piece). */
const DOOR_COLOURS = Object.freeze({ lining: 0xd88895, skin: 0xe9c3aa });
const G = 9.81;
/** Faster than her body changes its motion, m/s²: a pose put on in one frame, not a movement. GAME TUNING (about 5 g;
 * walking's hardest heel strike shakes her pelvis by 1-2 g). */
export const JUMP_ACCEL = 50;

type Name = 'uterus' | 'vagina' | 'bladder';
interface Organ { readonly name: Name; readonly cage: Cage; readonly skin: CageSkin; readonly mesh: THREE.Mesh; readonly tune: CageTune; readonly out: Float32Array }

/** Cage points for one organ: along a centre line, each station its middle and points round it; tied from `tieFrom` at
 * its start to `tieTo` at its end. */
function lineCage(path: readonly P3[], half: (t: number) => readonly [number, number], every: number, tieFrom: number, tieTo: number, grams: number, axis?: (t: number) => P3) {
  const total = lengthOf(path), stations = Math.max(3, Math.round(total / every) + 1);
  const rest: number[] = [], mass: number[] = [], tie: number[] = [], radius: number[] = [];
  for (let s = 0; s < stations; s++) {
    const t = s / (stations - 1), at = along(path, t * total), next = along(path, Math.min(total, t * total + 0.002)), prev = along(path, Math.max(0, t * total - 0.002));
    const own = axis?.(t), tx = own ? own[0] : next[0] - prev[0], ty = own ? own[1] : next[1] - prev[1], tz = own ? own[2] : next[2] - prev[2], tl = Math.hypot(tx, ty, tz) || 1;
    // across her (+x), and the other way round the line in her midline's plane
    const ny = -tz / tl, nz = ty / tl, [a, b] = half(t), w = a * b, tieAt = tieFrom + (tieTo - tieFrom) * t;
    const put = (x: number, y: number, z: number, r: number, m: number) => { rest.push(x, y, z); mass.push(m); tie.push(tieAt); radius.push(r); };
    put(at[0], at[1], at[2], 0.6 * Math.min(a, b), w);
    for (const [ca, cb] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]] as const) put(at[0] + a * ca, at[1] + ny * b * cb, at[2] + nz * b * cb, 0.35 * Math.min(a, b), w * 0.5);
  }
  const sum = mass.reduce((x, y) => x + y, 0);
  return { rest, mass: mass.map((m) => (m / sum) * grams), tie, radius };
}

/** Cage points for the bladder: its middle and points over it, its base tied hard and its dome loosely. */
function bladderCage(l: OrganLayout['bladder'], tieFrom: number, tieTo: number) {
  const [cx, cy, cz] = l.centre, [rx, ry, rz] = l.radii, rest: number[] = [], mass: number[] = [], tie: number[] = [], radius: number[] = [];
  const grams = l.ml + 40;
  const put = (ux: number, uy: number, uz: number, m: number) => {
    rest.push(cx + rx * ux, cy + ry * uy, cz + rz * uz); mass.push(m);
    tie.push(tieFrom + (tieTo - tieFrom) * ((uy + 1) / 2)); radius.push(0.55 * Math.min(rx, ry, rz));
  };
  put(0, 0, 0, 3);
  for (const [ux, uy, uz] of [[0.7, 0, 0], [-0.7, 0, 0], [0, 0.7, 0], [0, -0.7, 0], [0, 0, 0.7], [0, 0, -0.7]]) put(ux, uy, uz, 1);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) put(0.45 * sx, 0.45 * sy, 0.45 * sz, 0.7);
  const sum = mass.reduce((x, y) => x + y, 0);
  return { rest, mass: mass.map((m) => (m / sum) * grams), tie, radius };
}

/** Her womb's drawn points (rest metres) pushed out, above its cervix, to stand at least its wall's thickness outside `room`. */
function makeRoom(points: Float32Array, womb: PregnantWomb, room: WombShape): void {
  const foot = womb.path[womb.path.length - WOMB_SHAPE.stations - 1], lean = (womb.leanDeg * Math.PI) / 180, ay = Math.cos(lean), az = Math.sin(lean);
  const c = room.centre;
  for (let i = 0; i < points.length; i += 3) {
    if ((points[i + 1] - foot[1]) * ay + (points[i + 2] - foot[2]) * az <= 0) continue;
    const dx = points[i] - c.x, dy = points[i + 1] - c.y, dz = points[i + 2] - c.z, r = Math.hypot(dx, dy, dz);
    if (r < 1e-6) continue;
    const need = sacRadius(room, dx / r, dy / r, dz / r) + womb.wallM;
    if (need > r) { const k = need / r; points[i] = c.x + dx * k; points[i + 1] = c.y + dy * k; points[i + 2] = c.z + dz * k; }
  }
}

export class PelvicOrgansView {
  /** Her organs as drawn (world units, at the scene's root: their points are where their soft bodies have them). */
  readonly group = new THREE.Group();
  private readonly holder = new THREE.Object3D();
  private organs: Organ[] = [];
  /** Where three of their rest places were last step, and how fast they were going (world metres, m/s). */
  private last: number[] | null = null;
  private speed: number[] | null = null;
  /** The pairs that push on each other, and how close each pair's points may come. */
  private touching: { a: Cage; b: Cage; gaps: Float32Array }[] = [];
  private layout: OrganLayout | null = null;
  private bladderMl: number = BLADDER.defaultMl;
  private open = 0;
  /** Her opening's doors (actor/birthDoors.ts): hung in her rest frame from her pelvis, how far they stand open now (0..1). */
  private readonly doors: { frame: DoorFrame; mesh: THREE.Mesh; skin: THREE.Mesh; material: THREE.MeshStandardMaterial; skinMaterial: THREE.MeshStandardMaterial };
  private swing = 0;
  private drawnSwing = -1;
  /** Her week (null: not pregnant) and each baby's weight, g; and her womb grown for them. */
  private week: number | null = null;
  private babyGrams: readonly number[] = [];
  private grown: PregnantWomb | null = null;
  private sacOf: { womb: PregnantWomb; shape: WombShape } | null = null;
  /** The sac as her babies need it (grown round them where they stand past it), which her womb's wall makes room for. */
  private room: WombShape | null = null;
  private readonly toRest = new THREE.Matrix4();
  private readonly restAt = new THREE.Vector3();
  private readonly restQuat = new THREE.Quaternion();
  private readonly toWorld = new THREE.Matrix4();
  private readonly materials = new Map<Name, THREE.MeshStandardMaterial>();

  /**
   * @param pelvis her measured pelvis (rest metres)
   * @param bone her pelvis bone, and `holderMatrix` her rest frame (metres) as that bone carries it, read at her bind
   * @param units world units per metre
   */
  constructor(private readonly pelvis: PelvisLandmarks & CanalBones, private readonly torso: TorsoLandmarks, bone: THREE.Bone, holderMatrix: THREE.Matrix4, private readonly units: number) {
    this.holder.matrixAutoUpdate = false; this.holder.matrix.copy(holderMatrix); this.holder.name = 'pelvicOrgans';
    bone.add(this.holder);
    this.holder.updateMatrixWorld(true);
    this.holder.getWorldQuaternion(this.restQuat);
    // her opening's doors and the outer skin round them: rigid, carried by her pelvis bone in her rest frame (metres)
    { const frame = doorFrame(layOrgans(pelvis).vagina.path);
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
      const skinMaterial = new THREE.MeshStandardMaterial({ color: DOOR_COLOURS.skin, roughness: 0.65, metalness: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material), s = outerSkin(frame), sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(s.points, 3)); sg.setIndex(new THREE.BufferAttribute(s.triangles, 1)); sg.computeVertexNormals();
      const skin = new THREE.Mesh(sg, skinMaterial);
      mesh.name = 'organ:doors'; skin.name = 'organ:outerSkin'; mesh.frustumCulled = false; skin.frustumCulled = false;
      this.holder.add(mesh, skin);
      this.doors = { frame, mesh, skin, material, skinMaterial }; }
    this.drawDoors();
    this.group.name = 'pelvicOrgans';
    for (const name of ['uterus', 'vagina', 'bladder'] as const) this.materials.set(name, new THREE.MeshStandardMaterial({ color: COLOURS[name], roughness: 0.55, metalness: 0, transparent: name === 'bladder', opacity: name === 'bladder' ? 0.85 : 1 }));
    this.build();
  }

  /** How much her bladder holds, mL (it rises as it fills); rebuilds the bladder's soft body. */
  setBladder(ml: number): void {
    const v = Math.max(5, Math.min(BLADDER.mostMl, Math.round(ml)));
    if (v === this.bladderMl) return;
    this.bladderMl = v; this.build();
  }
  get bladder(): number { return this.bladderMl; }
  /**
   * HER WEEKS (the room's pregnancy, actor/pregnantWomb.ts): her womb grown for `week` (null: not pregnant), each baby
   * weighing what `babyGrams` says. Laid again only when it changes enough to see (a fiftieth of a week, a gram in a
   * hundred).
   */
  setPregnancy(week: number | null, babyGrams: readonly number[]): void {
    const same = week === null ? this.week === null
      : this.week !== null && Math.abs(week - this.week) < 0.02 && babyGrams.length === this.babyGrams.length && babyGrams.every((g, i) => Math.abs(g - this.babyGrams[i]) <= 0.01 * Math.max(1, g));
    if (same) return;
    this.week = week === null ? null : Math.max(0, week); this.babyGrams = [...babyGrams];
    // (the room her babies needed was for the womb she had: they are packed again into this one)
    this.room = null; this.build();
  }
  /**
   * THE WOMB FORMS TO THE SAC (Joshua, 2026-10-29: "Sac forms to baby > womb forms to sac > belly skin forms to womb"):
   * where her babies, packed at the chart's size, need the sac to stand further out than her womb grew, its wall gives
   * them that room. `room` is that sac (rest metres), as the room's baby code grows it; null gives the room back.
   */
  fitSac(room: WombShape | null): void {
    if (room === this.room || !this.grown) return;
    this.room = room; this.build();
  }
  /** Her womb as grown for her week (null: not pregnant). */
  get womb(): PregnantWomb | null { return this.grown; }
  /**
   * BIRTH OPENING (0 closed .. 1 full, actor/birthCanal.ts): her cervix thinned and opened to 10 cm and her canal opened
   * round to a head's width. Only while she is pregnant; laid again only when it moves a hundredth.
   */
  setOpening(open: number): void {
    const o = Math.min(1, Math.max(0, Number.isFinite(open) ? open : 0));
    if (Math.abs(o - this.open) < 0.01 && !(o === 0 && this.open !== 0)) return;
    this.open = o; this.room = null;
    if (this.grown) this.build();
  }
  get opening(): number { return this.open; }
  /**
   * The sac inside her grown womb, in her rest frame (metres), as the room's baby code holds one (baby.ts WombShape):
   * where her babies are packed, float and kick. Null when she is not pregnant. Worked out once a womb.
   */
  sac(): WombShape | null {
    if (!this.grown) return null;
    if (!this.sacOf || this.sacOf.womb !== this.grown) {
      const s = wombSac(this.grown, NT, NP);
      this.sacOf = { womb: this.grown, shape: { centre: new THREE.Vector3(...s.centre), r: s.r, axis: new THREE.Vector3(...s.axis), skin: new Float32Array(NT * NP).fill(Infinity), give: new Float32Array(NT * NP) } };
    }
    return this.sacOf.shape;
  }
  /** How far her womb's soft body has carried what is in it from where it was laid, in her rest frame (metres), into `out`. */
  wombMove(out: THREE.Vector3): THREE.Vector3 {
    const o = this.organs.find((g) => g.name === 'uterus');
    if (!o || !o.cage.primed) return out.set(0, 0, 0);
    this.toRest.copy(this.boneToWorld()).invert();
    return out.set(o.cage.centre[0], o.cage.centre[1], o.cage.centre[2]).applyMatrix4(this.toRest).sub(this.restAt.set(...o.cage.restCentre));
  }
  /** The layout as laid (rest metres): for probes and the readout. */
  get laid(): OrganLayout | null { return this.layout; }

  private build(): void {
    for (const o of this.organs) { o.mesh.removeFromParent(); o.mesh.geometry.dispose(); }
    this.organs = [];
    const laid = layOrgans(this.pelvis, this.bladderMl);
    this.grown = this.week === null ? null : growWomb(laid, this.torso, this.week, this.babyGrams, this.open);
    const layout = this.grown ? pregnantLayout(laid, this.grown, this.open > 0 ? openCanal(laid.vagina, this.pelvis, this.open, DOORS.hingeUp) : laid.vagina) : laid;
    // (the canal drawn from where its doors hang up: below them the doors are its opening)
    const canal = layout.vagina, drawn: OrganLayout = { ...layout, vagina: { ...canal, path: subPath(canal.path, DOORS.hingeUp, lengthOf(canal.path)) } }, meshes = organMeshes(drawn);
    if (this.grown && this.room) makeRoom(meshes.uterus.points, this.grown, this.room);
    this.layout = layout; this.last = null;
    // (pregnant, her womb is seen through: what it holds is inside)
    const wm = this.materials.get('uterus')!;
    wm.transparent = !!this.grown; wm.opacity = this.grown ? WOMB_SEEN : 1; wm.depthWrite = !this.grown; wm.needsUpdate = true;
    const U = ORGAN_TUNE, u = layout.uterus;
    const cages: Record<Name, ReturnType<typeof lineCage>> = {
      uterus: lineCage(u.path, wombHalf(u), Math.max(0.011, u.length / 30), U.uterus.tieFrom, U.uterus.tieTo, this.grown ? this.grown.contents.totalG : 60, u.axes ? wombAxis(u) : undefined),
      vagina: lineCage(drawn.vagina.path, () => [drawn.vagina.width / 2, drawn.vagina.depth / 2], 0.012, U.vagina.tieFrom, U.vagina.tieTo, 40),
      bladder: bladderCage(layout.bladder, U.bladder.tieFrom, U.bladder.tieTo),
    };
    for (const name of ['uterus', 'vagina', 'bladder'] as const) {
      const m: OrganMesh = meshes[name], c = cages[name];
      const cage = makeCage(c.rest, c.mass, c.tie, c.radius), skin = skinToCage(cage, m.points, 4);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.points.length), 3));
      geometry.setIndex(new THREE.BufferAttribute(m.triangles, 1));
      const mesh = new THREE.Mesh(geometry, this.materials.get(name)!);
      mesh.name = `organ:${name}`; mesh.frustumCulled = false;
      this.group.add(mesh);
      this.organs.push({ name, cage, skin, mesh, tune: { shape: U[name].shape, keep: U[name].keep }, out: new Float32Array(m.points.length) });
    }
    const by = (n: Name) => this.organs.find((o) => o.name === n)!.cage;
    this.touching = (['uterus', 'vagina'] as const).map((n) => ({ a: by('bladder'), b: by(n), gaps: restGaps(by('bladder'), by(n)) }));
    this.draw();
  }

  /** Where her rest frame is now, in world metres. */
  private boneToWorld(): THREE.Matrix4 {
    this.holder.updateMatrixWorld(true);
    return this.toWorld.makeScale(1 / this.units, 1 / this.units, 1 / this.units).multiply(this.holder.matrixWorld);
  }

  /** Where three of their rest places (the os, the fundus, the bladder's middle) are now, world metres. */
  private marks(toWorld: ArrayLike<number>): number[] {
    const l = this.layout, out: number[] = [];
    if (!l) return out;
    for (const p of [l.uterus.path[0], l.uterus.path[l.uterus.path.length - 1], l.bladder.centre]) {
      out.push(toWorld[0] * p[0] + toWorld[4] * p[1] + toWorld[8] * p[2] + toWorld[12], toWorld[1] * p[0] + toWorld[5] * p[1] + toWorld[9] * p[2] + toWorld[13], toWorld[2] * p[0] + toWorld[6] * p[1] + toWorld[10] * p[2] + toWorld[14]);
    }
    return out;
  }

  /** One step of `dt` seconds: their soft bodies follow her pelvis, feeling only gravity's change as she leans. A pose put
   * on in one frame (her pelvis's motion changing faster than JUMP_ACCEL allows) is not a movement: they are simply
   * carried to where it holds them. */
  update(dt: number): void {
    const toWorld = this.boneToWorld().elements;
    const now = this.marks(toWorld);
    if (this.last && this.speed && now.length === this.last.length && dt > 0) {
      let off = 0;
      for (let i = 0; i < now.length; i++) off = Math.max(off, Math.abs(now[i] - (this.last[i] + this.speed[i] * dt)));
      if (off > JUMP_ACCEL * dt * dt) {
        for (const o of this.organs) placeCage(o.cage, toWorld);
        this.last = now; // (and its speed is what it was: a pose put on mid-walk keeps her walking)
        this.draw();
        return;
      }
    }
    if (this.last && now.length === this.last.length && dt > 0) this.speed = now.map((v, i) => (v - this.last![i]) / dt);
    this.last = now;
    const q = this.holder.getWorldQuaternion(new THREE.Quaternion());
    const held = new THREE.Vector3(0, -G, 0).applyQuaternion(this.restQuat.clone().invert()).applyQuaternion(q);
    const felt: [number, number, number] = [0 - held.x, -G - held.y, 0 - held.z];
    for (const o of this.organs) stepCage(o.cage, dt, toWorld, felt, o.tune);
    // (the bladder pushes on the womb and the canal; the womb's cervix sits in the canal, so those two do not push)
    for (const t of this.touching) separate(t.a, t.b, t.gaps);
    this.draw();
    // her opening's doors: toward where BIRTH OPENING holds them, closing as a pneumatic door does
    this.swing = swingDoors(this.swing, this.grown ? swingFor(this.open * BIRTH_OPENING.dilationM) : 0, dt);
    this.drawDoors();
  }

  /** How far her opening's doors stand open now (0 closed .. 1 standing open), and how wide that opens it (metres). */
  get doorSwing(): number { return this.swing; }

  private drawDoors(): void {
    if (Math.abs(this.swing - this.drawnSwing) < 1e-4) return;
    this.drawnSwing = this.swing;
    const d = doorMeshes(this.doors.frame, this.swing), g = this.doors.mesh.geometry;
    const colour = new Float32Array(d.lining.length * 3), lining = new THREE.Color(DOOR_COLOURS.lining), skin = new THREE.Color(DOOR_COLOURS.skin);
    d.lining.forEach((l, i) => (l ? lining : skin).toArray(colour, i * 3));
    g.setAttribute('position', new THREE.BufferAttribute(d.points, 3)); g.setAttribute('color', new THREE.BufferAttribute(colour, 3));
    g.setIndex(new THREE.BufferAttribute(d.triangles, 1)); g.computeVertexNormals();
  }

  private draw(): void {
    if (this.organs.some((o) => !o.cage.primed)) { const toWorld = this.boneToWorld().elements; for (const o of this.organs) stepCage(o.cage, 0, toWorld, [0, 0, 0], o.tune); }
    for (const o of this.organs) {
      followCage(o.cage, o.skin, o.out);
      const pos = o.mesh.geometry.getAttribute('position') as THREE.BufferAttribute, arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i++) arr[i] = o.out[i] * this.units;
      pos.needsUpdate = true;
      o.mesh.geometry.computeVertexNormals();
    }
  }

  /** How far each organ's soft body is from where its bone holds it now, metres (for probes: how much it sways). */
  sway(): Record<Name, number> {
    const toWorld = this.boneToWorld().elements, out = {} as Record<Name, number>, want = [0, 0, 0];
    for (const o of this.organs) {
      let most = 0;
      for (let i = 0; i < o.cage.n; i++) {
        const r = o.cage.rest;
        want[0] = toWorld[0] * r[3 * i] + toWorld[4] * r[3 * i + 1] + toWorld[8] * r[3 * i + 2] + toWorld[12];
        want[1] = toWorld[1] * r[3 * i] + toWorld[5] * r[3 * i + 1] + toWorld[9] * r[3 * i + 2] + toWorld[13];
        want[2] = toWorld[2] * r[3 * i] + toWorld[6] * r[3 * i + 1] + toWorld[10] * r[3 * i + 2] + toWorld[14];
        most = Math.max(most, Math.hypot(o.cage.x[3 * i] - want[0], o.cage.x[3 * i + 1] - want[1], o.cage.x[3 * i + 2] - want[2]));
      }
      out[o.name] = most;
    }
    return out;
  }

  set visible(on: boolean) { this.group.visible = on; this.doors.mesh.visible = on; this.doors.skin.visible = on; }

  dispose(): void {
    for (const o of this.organs) { o.mesh.removeFromParent(); o.mesh.geometry.dispose(); }
    this.organs = []; this.touching = [];
    for (const m of this.materials.values()) m.dispose();
    for (const m of [this.doors.mesh, this.doors.skin]) { m.removeFromParent(); m.geometry.dispose(); }
    this.doors.material.dispose(); this.doors.skinMaterial.dispose();
    this.holder.removeFromParent(); this.group.removeFromParent();
  }
}
