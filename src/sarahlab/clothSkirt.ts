/**
 * A SKIRT AS CLOTH, IN THE ROOM (`skirt/skirtDraft.ts` says what it is and whose words it is built to). Each frame, as
 * her cloth bikini bottom (`clothBrief.ts`): her skin under every point of it (`clothSkin.ts`), the cloth moved
 * (`clothSim.ts`), and the sheet drawn where the cloth is, in WORLD space.
 *
 * - DRAFTED from her rest shape as she is built now (the room drafts it again when her shape changes), BOUND there to the nearest of her that is not her arm
 *   (`garment/bind.ts`): its ring's points are held to those places of her skin, so the ring rides her hips, her
 *   belly and her build as her skin does.
 * - LAID on her, when it is put on and when she jumps from one pose to another, as it was cut, carried whole by her
 *   pelvis -- a cone round her hips whichever way she lies -- and let fall from there.
 * - HER LEGS are capsules as well as skin (her thighs and shins, a little inside them): the walk over her skin is local
 *   and a leg swung fast could pass a point of cloth before it was found.
 */
import * as THREE from 'three';
import { CLOTH_DEFAULTS, ClothSim, type Capsules, type ClothSettings } from './clothSim';
import { ClothSkin } from './clothSkin';
import { copyContacts, createContacts, type SkinContacts } from './clothTypes';
import { clothNormals } from './briefCloth';
import { BIND_TRUNK, bindParticles } from './garment/bind';
import { SARAH_V2_ARM_BONES, SARAH_V2_JOINTS } from './garment/bodyInput';
import type { BodyInput } from './garment/types';
import { draftSkirt, type SkirtDraft, type SkirtSettings } from './skirt/skirtDraft';
import { CLOTH_LAYERS, ClothUnder, raiseOver } from './clothLayers';

/**
 * GAME TUNING: a woven skirt -- worn at the size it is cut (restScale 1), folding more easily than a tee's knit, slipping
 * over her more easily than spandex grips, and damped a little more so a long hem swings and comes to rest.
 */
export const SKIRT_CLOTH_SETTINGS: Readonly<ClothSettings> = Object.freeze({
  ...CLOTH_DEFAULTS, restScale: 1, maxStretch: 1.08, friction: 0.08, frictionAcross: 0.03,
  // (Joshua, 2026-11-16, of the first pictures of it walking: "Try setting gravity about 1.5x, and maybe keep it more
  // stiff to help with a lot of the flapping around")
  // HOW STIFF IT CAN BE (MEASURED 2026-11-16 off the room, a cone of 72 columns hung from its ring with nothing under
  // it, six seconds): thirty rows fold at 2e-4 and come to rest (0.6 m/s at the most, under the ring); at 4e-5 they
  // never do (69 m/s); and fifty-four rows 2 cm apart never do at any of them short of 1e-2 -- so a long skirt's rows
  // are further apart, never more than thirty-odd (`skirtDraft.SKIRT_CUT.mostRows`).
  gravity: [0, -981 * 1.5, 0] as [number, number, number], bendCompliance: 2e-4, damping: 6,
});
/**
 * GAME TUNING (metres): the cloth keeps this far off her skin; her thighs' (their upper and lower halves) and her shins'
 * capsules are this thick -- about her own, since her skin's walk is local and it is the capsules a swung leg meets it with.
 */
export const SKIRT_BODY = Object.freeze({ clearance: 0.004, thighTop: 0.088, thigh: 0.07, shin: 0.052 });
/** how far over the room's floor (world y = 0) a point of it lies at the least, metres */
const GROUND_CLEAR = 0.004;
/**
 * GAME TUNING (metres a second): no point of it moves faster than this from one frame to the next. A leg that meets the
 * cloth hands it the leg's own speed, and nothing here is air: thrown by a stride, a hem flew up over her hips and
 * hung there (MEASURED 2026-11-16, walking, at one and a half gravities). A stride's knee moves about 2 m/s.
 */
export const SKIRT_FASTEST = 1.6;
/** After it is laid on her, this long (seconds) at no less than this damping (per second): it settles, not whips. */
const WARM_SECONDS = 0.5, WARM_DAMPING = 20;
/** Metres: her ring's places moving further than this in one frame is a jump (a pose put on, a saved body), not motion. */
const JUMP_M = 0.06;
/**
 * ...or, in a long frame, further than this speed would take them (metres a second). A FAULT FOUND 2026-11-17 in the
 * pictures of the skirts moved under her belly: walking, a low skirt crumpled up round her thighs and was thrown about.
 * Its ring is on her hips, which sway and step; a slow frame (a tenth of a second on the build machine, and on a
 * phone under two cloths) carries them more than 6 cm, which was read as a jump and the skirt laid afresh -- MEASURED:
 * 2 restarts in 4.5 s of walking in the A-line, 5 in the mini. A walk is about 1.3 m/s, a pose put on is instant.
 */
const JUMP_SPEED = 3;
/**
 * Metres. HER SKIN UNDER A POINT THAT HANGS OFF HER. The cloth's floor is a half-space: the nearest of her skin and the
 * way its TRIANGLE faces (`clothSim.ts` step 6), which is right for cloth that lies on her. A skirt hangs a hand and more
 * off her, and the nearest of her to such a point is as often an edge of her -- her toes, her heel, the turn of her
 * knee -- whose triangle faces another way: told to be "behind" it, the point was thrown across her (MEASURED in the
 * room, the first maxi: its hem heaped at her shin on one side). So, for each point: outside her, its floor faces the
 * point itself (from the nearest of her skin toward it); behind its triangle and nearer than `inside`, it is in her and
 * is put out as before; behind it and further, that triangle is not its floor (her legs' capsules still are).
 */
const FLOOR = Object.freeze({ inside: 0.012 });
const SMOOTHING = 20;

export interface ClothSkirtOptions {
  readonly body: THREE.SkinnedMesh;
  /** her rest shape as she is built now (`bodyInputOf` with the morphs she wears) */
  readonly input: BodyInput;
  readonly settings: SkirtSettings;
  /** for a skirt under her belly: how far inside the under-belly waistband each of `input`'s points is (`skirtDraft.SKIRT_LINE`; metres) */
  readonly line?: ArrayLike<number> | null;
  /**
   * ALL of her skin's triangles, where her own drawn list leaves some out (her opening's area is drawn by a patch of its
   * own, `vulvaMesh.ts`): what the skirt is drafted on, bound to and walks over, in place of `input`'s -- as her cloth
   * bikini bottom is (`clothBrief.ts`, `ClothSkin`'s `triangles`). At a big belly the under-belly waistband's line
   * runs across that area, a centimetre over her opening: on her drawn list alone it was not found in front of her
   * at all (MEASURED in the room at 200%: 15 of the ring's 72 directions uncrossed), and a ring laid there would be
   * held to the rim of the hole.
   */
  readonly skin?: Uint32Array | null;
  readonly material: THREE.Material;
  /** the room's units to her metre */
  readonly unitsPerMetre: number;
  /** her rest metres to her geometry's units: geom = (rest - offset) / scale */
  readonly scale: number;
  readonly offset: readonly [number, number, number];
  readonly cloth?: Partial<ClothSettings>;
}

/** What she sits on, world units: its middle, its radius and its top's height. */
export interface SkirtStool { readonly x: number; readonly z: number; readonly radius: number; readonly top: number }

export interface ClothSkirtStats { readonly worldPerMetre: number; readonly skinMs: number; readonly simMs: number; readonly particles: number; readonly contacts: number; readonly jumps: number; readonly rows: number; readonly columns: number }

export class ClothSkirt {
  readonly mesh: THREE.Mesh;
  readonly draft: SkirtDraft;
  readonly settings: SkirtSettings;
  cloth: ClothSettings;
  private readonly options: ClothSkirtOptions;
  private readonly skin: ClothSkin;
  private sim: ClothSim | null = null;
  private before: SkinContacts;
  private after: SkinContacts;
  private readonly scratch: Float32Array;
  private readonly position: THREE.BufferAttribute;
  private readonly normal: THREE.BufferAttribute;
  private capsNow: Capsules;
  private capsWas: Capsules;
  /**
   * A SHIRT OF CLOTH UNDER IT (tucked in: `clothLayers.ts`): its worn points, world, and how many. The skirt's floors are
   * raised over it each frame. Null: none, or the shirt hangs over the skirt (which is then the shirt's to clear).
   */
  under: { readonly x: Float32Array; readonly n: number; readonly lift?: number } | null = null;
  private readonly layer = new ClothUnder();
  private raised = 0;
  /** (a probe's) her legs' capsules and her skin's floor, each switched off to tell which does what */
  readonly probe = { capsules: true, skin: true };
  private restScaleWorld = 0;
  private primed = false;
  private warm = 0;
  private jumps = 0;
  private readonly shown = { skinMs: 0, simMs: 0, contacts: 0 };
  private readonly m = new THREE.Matrix4();
  private readonly v = new THREE.Vector3();
  private readonly w = new THREE.Vector3();

  constructor(options: ClothSkirtOptions) {
    this.options = options;
    this.settings = options.settings;
    this.cloth = { ...SKIRT_CLOTH_SETTINGS, ...(options.cloth ?? {}) };
    const input = options.skin ? { ...options.input, triangles: options.skin } : options.input;
    const d = this.draft = draftSkirt(input, options.settings, options.line ?? null), M = options.unitsPerMetre;
    const region = new Uint8Array(d.count).fill(BIND_TRUNK);
    const binding = bindParticles(input, d.rest, region, { scale: options.scale, offset: options.offset, minOffset: SKIRT_BODY.clearance, maxOffset: 3 });
    this.skin = new ClothSkin(options.body, binding, { thickness: SKIRT_BODY.clearance * M, armBones: SARAH_V2_ARM_BONES, trunkOnly: new Uint8Array(d.count).fill(1), ...(options.skin ? { triangles: options.skin } : {}) });
    this.before = createContacts(d.count); this.after = createContacts(d.count);
    this.scratch = new Float32Array(d.count * 3);
    const caps = (): Capsules => ({ count: 7, a: new Float32Array(21), b: new Float32Array(21), radius: new Float32Array(7) });
    this.capsNow = caps(); this.capsWas = caps();
    const g = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(d.count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.normal = new THREE.BufferAttribute(new Float32Array(d.count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.position);
    g.setAttribute('normal', this.normal);
    g.setIndex(new THREE.BufferAttribute(d.triangles, 1));
    this.mesh = new THREE.Mesh(g, options.material);
    this.mesh.name = 'cloth-skirt';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = options.body.castShadow; this.mesh.receiveShadow = options.body.receiveShadow;
    this.mesh.userData.clothSkirt = true;
  }

  /** Her thighs and shins now (and what she sits on), world, into `out`. */
  private legs(out: Capsules, stool: SkirtStool | null): void {
    const B = this.options.body.skeleton.bones, J = SARAH_V2_JOINTS, M = this.options.unitsPerMetre, v = this.v;
    let k = 0;
    const w = this.w;
    // (from `f0` to `f1` of the way from joint a to joint b)
    const put = (a: number, b: number, f0: number, f1: number, r: number) => {
      B[a].getWorldPosition(v); B[b].getWorldPosition(w);
      out.a[k * 3] = v.x + (w.x - v.x) * f0; out.a[k * 3 + 1] = v.y + (w.y - v.y) * f0; out.a[k * 3 + 2] = v.z + (w.z - v.z) * f0;
      out.b[k * 3] = v.x + (w.x - v.x) * f1; out.b[k * 3 + 1] = v.y + (w.y - v.y) * f1; out.b[k * 3 + 2] = v.z + (w.z - v.z) * f1;
      out.radius[k++] = r * M;
    };
    for (let s = 0; s < 2; s++) { put(J.hip[s], J.knee[s], 0.12, 0.5, SKIRT_BODY.thighTop); put(J.hip[s], J.knee[s], 0.5, 1, SKIRT_BODY.thigh); put(J.knee[s], J.ankle[s], 0, 0.9, SKIRT_BODY.shin); }
    // what she sits on: an upright capsule to its top (none: one of no size)
    out.a[18] = stool?.x ?? 0; out.a[19] = 0; out.a[20] = stool?.z ?? 0;
    out.b[18] = out.a[18]; out.b[19] = stool ? Math.max(0, stool.top - stool.radius) : 0; out.b[20] = out.a[20];
    out.radius[6] = stool?.radius ?? 0;
  }

  /** Lay it on her as she is posed now -- as cut, carried whole by her pelvis -- and let it fall from there. */
  restart(): void {
    const d = this.draft, o = this.options, x = this.scratch, body = o.body;
    // (her skin's walk starts again from each point's bound place; the ring's points are laid on their holds)
    this.skin.initial(x);
    const pelvis = SARAH_V2_JOINTS.pelvis;
    this.m.multiplyMatrices(body.skeleton.bones[pelvis].matrixWorld, body.skeleton.boneInverses[pelvis]).multiply(body.bindMatrix);
    const v = this.v;
    // EACH COLUMN HANGS FROM ITS OWN PLACE ON THE RING AS HER SKIN HAS IT NOW: the ring is on her waist, which her spine
    // carries as well as her pelvis, and laid by her pelvis alone the row under the ring began centimetres from it --
    // the strain limit closed that in one substep, at metres a second, and the whip of it threw a floor-length hem up
    // round her waist a quarter of a second after it was put on (MEASURED 2026-11-16, with her skin's floor and her
    // legs' capsules off as well; a skirt to her calf only ruffled). So a column's points are laid as cut, carried by
    // her pelvis, and then moved all alike by how far its ring point is from where that carry put it.
    const cols = d.columns, at = (p: number) => v.set((d.rest[p * 3] - o.offset[0]) / o.scale, (d.rest[p * 3 + 1] - o.offset[1]) / o.scale, (d.rest[p * 3 + 2] - o.offset[2]) / o.scale).applyMatrix4(this.m);
    for (let c = 0; c < cols; c++) {
      at(c);
      const sx = x[c * 3] - v.x, sy = x[c * 3 + 1] - v.y, sz = x[c * 3 + 2] - v.z;
      for (let r = 1; r < d.rows; r++) { const p = r * cols + c; at(p); x[p * 3] = v.x + sx; x[p * 3 + 1] = v.y + sy; x[p * 3 + 2] = v.z + sz; }
    }
    if (!this.sim) {
      // its rest lengths at her skinning's own size: her rest metres through her geometry's units to the world as her
      // bones lay them (MEASURED 2026-11-16: 100.0000 to the metre, the room's own)
      const k = (this.skin.worldScale || 1) / o.scale, rest = new Float32Array(d.count * 3);
      this.restScaleWorld = k;
      for (let i = 0; i < rest.length; i++) rest[i] = d.rest[i] * k;
      this.sim = new ClothSim({ count: d.count, triangles: d.triangles, rest, pin: d.pin, capsuleMask: new Uint8Array(d.count).fill(1) }, this.cloth);
    }
    this.sim.reset(x);
    this.primed = false; this.warm = WARM_SECONDS;
  }

  /** One frame: her skin under the cloth, her legs, the cloth, and the sheet drawn on it. Her world matrices must be current. */
  frame(dt: number, stool: SkirtStool | null = null, span: number = dt): void {
    if (!this.sim) this.restart();
    const sim = this.sim!, n = this.draft.count;
    sim.settings = this.cloth;
    let skinMs = this.skin.update(sim.positions, this.after);
    this.floors(sim.positions, this.after);
    this.raised = 0;
    if (this.under) { this.layer.build(this.under.x, this.under.n, CLOTH_LAYERS.cell * this.options.unitsPerMetre); this.raised = raiseOver(this.layer, this.after, n, this.options.unitsPerMetre, { most: CLOTH_LAYERS.tuckedMost, held: this.draft.pin, lift: this.under.lift ?? 0 }); }
    this.legs(this.capsNow, stool);
    if (this.primed) {
      const a = this.after.pinTarget, b = this.before.pinTarget, jump = Math.max(JUMP_M, JUMP_SPEED * span) * this.options.unitsPerMetre, pin = this.draft.pin;
      let most = 0;
      for (let p = 0; p < n; p++) { if (pin[p] < 1) continue; const i = p * 3, q = (a[i] - b[i]) ** 2 + (a[i + 1] - b[i + 1]) ** 2 + (a[i + 2] - b[i + 2]) ** 2; if (q > most) most = q; }
      if (most > jump * jump) { this.jumps++; this.restart(); skinMs += this.skin.update(sim.positions, this.after); this.floors(sim.positions, this.after); }
    }
    if (!this.primed) { copyContacts(this.after, this.before); this.copyCaps(this.capsNow, this.capsWas); this.primed = true; }
    if (this.warm > 0) { this.warm -= dt; sim.settings = { ...this.cloth, damping: Math.max(this.cloth.damping, WARM_DAMPING) }; }
    if (!this.probe.skin) { this.after.normal.fill(0); this.before.normal.fill(0); }
    const stats = this.probe.capsules ? sim.step(dt, this.before, this.after, { before: this.capsWas, after: this.capsNow }) : sim.step(dt, this.before, this.after);
    sim.settings = this.cloth;
    // no faster than SKIRT_FASTEST; and while it is being laid on her, nearly still from frame to frame: what her skin
    // and her legs put out of her as it is laid is a move, not a speed to keep
    {
      const V = sim.velocities, most = SKIRT_FASTEST * this.options.unitsPerMetre, keep = this.warm > 0 ? 0.25 : 1;
      for (let i = 0; i < n * 3; i += 3) {
        const sp = Math.sqrt(V[i] * V[i] + V[i + 1] * V[i + 1] + V[i + 2] * V[i + 2]), k = keep * (sp > most ? most / sp : 1);
        if (k !== 1) { V[i] *= k; V[i + 1] *= k; V[i + 2] *= k; }
      }
    }
    // THE FLOOR: with its anchors let go it falls (Joshua, 2026-11-17: "releasing all of them should make it fall
    // down"), and nothing but her body stopped it -- it went on through the floor and out of sight (MEASURED in the room)
    {
      const X = sim.positions, V = sim.velocities, low = GROUND_CLEAR * this.options.unitsPerMetre;
      for (let i = 1; i < n * 3; i += 3) if (X[i] < low) { X[i] = low; if (V[i] < 0) V[i] = 0; V[i - 1] *= 0.5; V[i + 1] *= 0.5; }
    }
    const swap = this.before; this.before = this.after; this.after = swap;
    this.copyCaps(this.capsNow, this.capsWas);
    (this.position.array as Float32Array).set(sim.positions.subarray(0, n * 3));
    clothNormals(sim.positions, this.draft.triangles, n, this.normal.array as Float32Array);
    this.position.needsUpdate = true; this.normal.needsUpdate = true;
    const k = 1 / SMOOTHING, s = this.shown;
    s.skinMs += (skinMs - s.skinMs) * k; s.simMs += (stats.ms - s.simMs) * k; s.contacts = stats.contacts;
  }

  /** Each point's floor turned to face the point (`FLOOR`). */
  private floors(x: Float32Array, c: SkinContacts): void {
    const n = this.draft.count, P = c.point, N = c.normal, inside = FLOOR.inside * this.options.unitsPerMetre;
    for (let i = 0, i3 = 0; i < n; i++, i3 += 3) {
      const dx = x[i3] - P[i3], dy = x[i3 + 1] - P[i3 + 1], dz = x[i3 + 2] - P[i3 + 2];
      const along = dx * N[i3] + dy * N[i3 + 1] + dz * N[i3 + 2], far = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (along > 0 && far > 1e-6) { N[i3] = dx / far; N[i3 + 1] = dy / far; N[i3 + 2] = dz / far; }
      else if (far > inside) { N[i3] = 0; N[i3 + 1] = 0; N[i3 + 2] = 0; }
    }
  }

  private copyCaps(from: Capsules, to: Capsules): void { to.a.set(from.a); to.b.set(from.b); to.radius.set(from.radius); }

  /** The cloth's points now, world (count x 3). */
  get positions(): Float32Array | null { return this.sim?.positions ?? null; }
  get velocities(): Float32Array | null { return this.sim?.velocities ?? null; }
  /** Its skin contacts as laid this frame (after `frame`). */
  get contacts(): SkinContacts { return this.before; }
  /**
   * WHAT OF IT IS UNDER A TEE WORN OVER IT AND NOT DRAWN (`clothLayers.ts` `coveredBy`): a mark a point, or null for all
   * of it. Its own triangles alone are left out, never her skin -- those with ANY point marked: a skirt hangs outside a
   * tee, and with only the triangles wholly under it left out, the rest stood up over the tee's hem in teeth a row
   * tall (MEASURED 2026-11-17). Its edge is then a little under the hem, where its painted short is seen in its colour.
   */
  hide(marks: Uint8Array | null): void {
    const all = this.draft.triangles, g = this.mesh.geometry;
    if (!marks) { if (this.hiddenKey !== '') { this.hiddenKey = ''; g.setIndex(new THREE.BufferAttribute(all, 1)); } return; }
    const out: number[] = []; let key = '';
    for (let t = 0; t + 2 < all.length; t += 3) { if (marks[all[t]] || marks[all[t + 1]] || marks[all[t + 2]]) key += t + ','; else out.push(all[t], all[t + 1], all[t + 2]); }
    if (key === this.hiddenKey) return;
    this.hiddenKey = key; g.setIndex(new THREE.BufferAttribute(Uint32Array.from(out), 1));
  }
  private hiddenKey = '';
  /** Floors raised over a shirt under it this frame (a probe's). */
  get floorsRaised(): number { return this.raised; }

  stats(): ClothSkirtStats { return { ...this.shown, worldPerMetre: this.restScaleWorld, particles: this.draft.count, jumps: this.jumps, rows: this.draft.rows, columns: this.draft.columns }; }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
  }
}
