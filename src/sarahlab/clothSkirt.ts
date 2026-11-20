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
import { SKIRT_CUT, SKIRT_FIT, draftSkirt, heldSpans, hemOf, type SkirtDraft, type SkirtSettings } from './skirt/skirtDraft';
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
/**
 * HER SKIN UNDER THE SHEET AS IT IS DRAWN BETWEEN HER AND THE CLOTH (`sheetOutOfSkin`). GAME TUNING: a drawn point is
 * IN her when it is behind the nearest of her skin by no more than `deep` (metres: further, that skin is not its
 * floor -- the other side of a leg, or the walk has lost it) and squarely behind it, the way to it within about 60
 * degrees of straight in (`behind`: the least of that way's share along her skin's own facing; less squarely, the
 * point hangs off an edge of her, `FLOOR`).
 */
export const SHEET_FLOOR = Object.freeze({ deep: 0.06, behind: 0.5 });
/**
 * POINTS OF A SHEET PUT OUT OF HER SKIN (`ClothSkirt.outOfHer`): `x` (three a point), points `from` up to `to`, each
 * against the nearest of her skin found under it -- `point` and `normal` (her skin's own facing there, unit; none: no
 * skin was found), three a point, point p's at `first + p` -- to `off` from her. Squarely behind that skin and no
 * deeper than `deep` (`SHEET_FLOOR`), a point is in her: it is put straight out through her skin there. Before it, or
 * off an edge of it, and nearer than `off`: out to `off` the way it lies. How many were moved, and the furthest.
 */
export function sheetOutOfSkin(x: Float32Array, from: number, to: number, point: ArrayLike<number>, normal: ArrayLike<number>, first: number, off: number, deep: number, behind: number = SHEET_FLOOR.behind): { put: number; most: number } {
  let put = 0, most = 0;
  for (let p = from, p3 = p * 3, q3 = (first + p) * 3; p < to; p++, p3 += 3, q3 += 3) {
    const nx = normal[q3], ny = normal[q3 + 1], nz = normal[q3 + 2];
    if (nx === 0 && ny === 0 && nz === 0) continue;
    const dx = x[p3] - point[q3], dy = x[p3 + 1] - point[q3 + 1], dz = x[p3 + 2] - point[q3 + 2], along = dx * nx + dy * ny + dz * nz, far = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let moved = 0;
    if (along < -behind * far) {
      if (far > deep) continue;
      moved = off - along;
      x[p3] += nx * moved; x[p3 + 1] += ny * moved; x[p3 + 2] += nz * moved;
    } else {
      if (far >= off || far < 1e-9) continue;
      moved = off - far;
      const k = moved / far;
      x[p3] += dx * k; x[p3 + 1] += dy * k; x[p3 + 2] += dz * k;
    }
    put++; if (moved > most) most = moved;
  }
  return { put, most };
}
/**
 * THE SHEET IS TAUT ACROSS HER CREASES (`tautColumns`; Joshua, 2026-11-17, of the paint taken out from under the
 * skirts: "basically create a shell around the body as the skirt"). A point of the sheet that is ON her goes where her
 * skin goes, and where her skin folds -- under her seat as a leg goes back, at the back of a bent knee, in her lap --
 * the sheet went into the fold with it, into the pocket of air between the fold's two sides: out of her skin (no point
 * of it under her), and BEHIND the lip of skin that hangs over the pocket. With paint under a skirt that lip was in the
 * skirt's colour; without it, MEASURED 2026-11-17 in the room, the pencil on her (FIT 0) walking, from her back: a
 * crescent of her skin 6 to 8 cm long under the seat of her rear leg, in two strides of four. Cloth does not go into a
 * crease: it lies across it. So down each column, a point that stands INSIDE the straight run between the points
 * `m` rows over it and `m` under it -- by the way her skin faces at those two, which are out of the fold -- is
 * brought out to that run: for m from `reach` down to 1, never further than `most` (metres), never for less than
 * `slack`, never its ring, never a point over the gap between her legs or beside one (`skip`: a span is straight
 * already, and her skin does not face it). GAME TUNING: a crease as tall as six rows is lain across; her back's hollow
 * over her seat, which is no crease, by a few millimetres.
 */
export const SHEET_TAUT = Object.freeze({ reach: 3, slack: 0.001, most: 0.03 });
/**
 * `x`: a sheet's points (three a point, `columns` a row, `rows` rows from its ring down), moved in place; `normal`: her
 * skin's own facing under each (unit, three a point; none: no skin was found); `reach`, `slack` and `most` in `x`'s
 * own units and rows (`SHEET_TAUT`); `skip`: 1 for a point that is neither moved nor measured from. How many points
 * were brought out, and the furthest.
 */
export function tautColumns(x: Float32Array, columns: number, rows: number, normal: ArrayLike<number>, reach: number, slack: number, most: number, skip: ArrayLike<number> | null = null): { put: number; most: number } {
  let put = 0, furthest = 0;
  for (let m = Math.floor(reach); m >= 1; m--) {
    for (let r = m; r + m < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const i = r * columns + c, ia = i - m * columns, ib = i + m * columns;
        if (skip && (skip[i] || skip[ia] || skip[ib])) continue;
        const p = i * 3, a = ia * 3, b = ib * 3;
        let nx = normal[a] + normal[b], ny = normal[a + 1] + normal[b + 1], nz = normal[a + 2] + normal[b + 2];
        const la = normal[a] * normal[a] + normal[a + 1] * normal[a + 1] + normal[a + 2] * normal[a + 2], lb = normal[b] * normal[b] + normal[b + 1] * normal[b + 1] + normal[b + 2] * normal[b + 2], l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        // (no skin found under one of the two, or the two facing more than a third of a turn apart: no saying which way is out)
        if (la < 0.25 || lb < 0.25 || l < 1) continue;
        nx /= l; ny /= l; nz /= l;
        const d = ((x[a] + x[b]) / 2 - x[p]) * nx + ((x[a + 1] + x[b + 1]) / 2 - x[p + 1]) * ny + ((x[a + 2] + x[b + 2]) / 2 - x[p + 2]) * nz;
        if (!(d > slack)) continue;
        const up = Math.min(d, most);
        x[p] += nx * up; x[p + 1] += ny * up; x[p + 2] += nz * up;
        put++; if (up > furthest) furthest = up;
      }
    }
  }
  return { put, most: furthest };
}
/** The name of its points' mark, 1 where a point is under a tee and not drawn (`ClothSkirt.hide`). */
const HIDDEN_ATTRIBUTE = 'skirtHidden';
/** GAME TUNING: a pixel of it further than this share of the way from a point that is drawn toward one that is not, is not drawn. */
const HIDDEN_EDGE = 0.15;
/** Its material told to leave out what is marked (`ClothSkirt.hide`), a pixel at a time; chained onto whatever it already does. */
function hiddenEdge(material: THREE.Material): void {
  const was = material.onBeforeCompile, key = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    was.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float ${HIDDEN_ATTRIBUTE};\nvarying float vSkirtHidden;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n  vSkirtHidden = ${HIDDEN_ATTRIBUTE};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSkirtHidden;')
      .replace('#include <clipping_planes_fragment>', `if (vSkirtHidden > ${HIDDEN_EDGE.toFixed(3)}) discard;\n#include <clipping_planes_fragment>`);
  };
  material.customProgramCacheKey = function () { return `${key.call(this)}|skirt-hidden-v1`; };
}
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

export interface ClothSkirtStats { readonly worldPerMetre: number; readonly skinMs: number; readonly simMs: number; readonly particles: number; readonly contacts: number; readonly jumps: number; readonly rows: number; readonly columns: number; /** rows held to her whole, and held points that are over a gap (`SKIRT_FIT`) */ readonly heldRows: number; readonly spanned: number; /** points of the sheet put out of her skin this frame, and the furthest one was moved, metres (`outOfHer`: under FIT 1) */ readonly skinPut: number; readonly skinPutMost: number; /** ...and brought out across a crease of her (`tautColumns`), and the furthest, metres */ readonly tautPut: number; readonly tautMost: number }

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
  private readonly hidden: THREE.BufferAttribute;
  private capsNow: Capsules;
  private capsWas: Capsules;
  /**
   * A SHIRT OF CLOTH UNDER IT (tucked in: `clothLayers.ts`): its worn points, world, and how many. The skirt's floors are
   * raised over it each frame. Null: none, or the shirt hangs over the skirt (which is then the shirt's to clear).
   */
  under: { readonly x: Float32Array; readonly n: number; readonly lift?: number } | null = null;
  private readonly layer = new ClothUnder();
  private raised = 0;
  /**
   * UNDER FIT 1 IT IS DRAWN BETWEEN HER AND THE CLOTH (`skirtDraft.SKIRT_FIT`; Joshua, 2026-11-17: "How tightly it
   * curves with the body from legs to legs. Maybe for tighter ones, it's actually a simple bridge like between the
   * breasts that span the front and back gap between the legs… not cloth and if you do a looser one, it fades somehow
   * to cloth sim"). The cloth is the cloth it always was. Each point also has ITS PLACE ON HER (`place`, each
   * frame): where its on-her cut (`draft.hug`) is bound to her skin, carried by that skin, or, for a point over the
   * gap between her legs (`spanA`, `spanB`: the points either side of the gap in its row, -1 for a point with skin of
   * its own; `spanU` of the way from the one to the other), the straight span between them, kept out of a leg that
   * stands in the span's way (a thigh swung forward: the span runs from its front to the other's). The sheet is drawn
   * FIT of the way from that place to the cloth (`shown`).
   *
   * THOSE PLACES ARE POINTS OF THE CLOTH'S OWN, HELD OUTRIGHT: a second set after the cloth's (`fitted`: particle
   * count + p is point p's place on her), with no cloth between them. So her skin is walked under each, and each is
   * put out of her as a held point of cloth is (`clothSim.ts`, step 6): a span, and a run across a crease
   * (`bridgeTo`), are straight and she is not -- the run from its ring to a thigh drawn back passes through the front
   * of her hips.
   */
  private readonly spanA: Int32Array;
  private readonly spanB: Int32Array;
  private readonly spanU: Float32Array;
  private spanned = 0;
  private readonly fitted: boolean;
  /**
   * AT FIT 0 IT IS ON HER AND NOTHING ELSE: no cloth is made, her places are all the particles there are (`base` 0;
   * under FIT 1 otherwise they follow the cloth's: `base` its count), and her skin is walked under those alone.
   */
  private readonly only: boolean;
  private readonly base: number;
  /**
   * How near each of her legs' six capsules' lines a point over the gap may come (world units; six a point): as near
   * as it was CUT, and never nearer than the capsule itself and `SKIRT_FIT.clear`. A span is straight from the front
   * of one leg to the other's, and a leg swung forward stands in it; put out to where the cut had it, it lies round
   * that leg as it was cut to. By the capsule's size alone -- tried first, MEASURED in the room at FIT 0, standing:
   * her leg over her knee is thinner than its capsule, every span beside it was put a centimetre out, and the skirt
   * stood in pleats from her knees to its hem.
   */
  private spanKeep: Float32Array | null = null;
  /**
   * BETWEEN HER AND THE CLOTH THE SHEET HAS HER SKIN FOR A FLOOR OF ITS OWN (`between`: FIT over 0, under 1). A point
   * is drawn on the straight way from its place on her to its point of cloth, and at rest that way is straight out of
   * her (`skirtDraft.SKIRT_FIT`). She does not stay at rest. Her places turn with her legs -- a calf lifted in a
   * stride carries its places up and back with it -- and the cloth does not: it hangs, and slides round her. MEASURED
   * 2026-11-17 in the room, the pencil at FIT 0.5, three moments of a stride, the sheet's own points against her skin
   * as the skirt poses it (the probe's `skirtPoints`, `skirtSkin`): 17, 60 and 53 of its 2,160 points under her skin,
   * 8.1, 17.7 and 12.5 mm at the deepest -- across the tops of her thighs and at her calves, her skin bare through the
   * sheet at its hem. (Kept out of her legs' capsules as well, as a span is: 12, 48 and 44, to 15.7 mm -- the capsules
   * are a little inside her; taken out again.)
   *
   * So the sheet's points AS DRAWN are a third set of her skin's (after the cloth's and her places': bound where they
   * are cut to be drawn, `sheetOrder`), and once the cloth has been stepped and the sheet laid between, her skin is
   * walked under them WHERE THEY NOW ARE (`ClothSkin.update`'s `again`: the same frame, her pose read once), and a
   * point found in her is put out of her (`outOfHer`, `sheetOutOfSkin`): the sheet lies ON her where the straight
   * way would have gone through her. MEASURED after, the same three moments and standing: none under
   * her skin, none within 2 mm of it but one; 314 to 397 points a frame put out, 10.7 to 18.1 mm at the most (280
   * standing, 2 mm). Under where it was drawn the frame BEFORE -- tried first, one walk for all three sets -- a
   * stride carries her leg centimetres a frame, the skin found was no longer the skin under it, and two to five
   * points a frame were left 1 to 2 mm under her (a point in her read as hanging off an edge). WHAT IT COSTS: her
   * skin's walk is about 7.5 ms a frame in a stride on the build machine where the cloth alone is about 5.
   */
  private readonly between: boolean;
  private readonly sheet: SkinContacts | null;
  private readonly simOrder: Uint32Array | null;
  private readonly sheetOrder: Uint32Array | null;
  /** points of the sheet put out of her skin this frame, and the deepest one was, world units (a probe's) */
  private skinPut = 0;
  private skinPutMost = 0;
  /** ...and brought out across a crease (`tautColumns`), and the furthest, world units (a probe's) */
  private tautPut = 0;
  private tautMost = 0;
  /** 1 for a point over the gap between her legs (a span's: `spanA`), which is straight already and is not drawn taut */
  private overGap: Uint8Array | null = null;
  /**
   * ACROSS THE CREASE AT THE TOP OF HER THIGHS IT IS TAUT FROM ITS RING TO HER THIGHS (`bridge`). A place bound to her
   * skin goes where that skin goes, and where her thigh meets her trunk her skin FOLDS: in a stride the top of her
   * forward thigh comes up toward her belly. MEASURED 2026-11-17 in the room on the sheet's own points (the probe's
   * `skirtPoints`), FIT 0, mid-stride, her front's middle column: its rows ran down her front to 83 cm, then stood
   * 2 cm HIGHER and 1.5 cm further forward, and on down -- the part her thighs carry ridden up over the part her
   * trunk carries, a ledge round a V of her front from hip to hip. Cloth does not fold into that crease; it is drawn
   * taut over it. So in front of her, each column's places from under its ring down to `SKIRT_FIT.bridge` under where
   * her legs part lie on the straight run from its ring's place to its place there (`bridgeTo`: that row, -1 for a
   * column that has none; `bridgeAt`: how far along each place was cut), by `bridgeShare` (all of it across her
   * front, none from her sides round her back). Her skin's floor keeps them off her belly (they are held points).
   */
  private bridgeTo: Int32Array | null = null;
  private bridgeShare: Float32Array | null = null;
  private bridgeAt: Float32Array | null = null;
  /** (a probe's) her legs' capsules, her skin's floor, the drawn sheet put out of her skin (`outOfHer`) and drawn taut across her creases (`tautColumns`), each switched off to tell which does what */
  readonly probe = { capsules: true, skin: true, floor: true, taut: true };
  private restScaleWorld = 0;
  private primed = false;
  private warm = 0;
  private jumps = 0;
  private readonly shown_ = { skinMs: 0, simMs: 0, contacts: 0 };
  private readonly m = new THREE.Matrix4();
  private readonly v = new THREE.Vector3();
  private readonly w = new THREE.Vector3();

  constructor(options: ClothSkirtOptions) {
    this.options = options;
    this.settings = options.settings;
    this.cloth = { ...SKIRT_CLOTH_SETTINGS, ...(options.cloth ?? {}) };
    const input = options.skin ? { ...options.input, triangles: options.skin } : options.input;
    const d = this.draft = draftSkirt(input, options.settings, options.line ?? null), M = options.unitsPerMetre;
    const region = new Uint8Array(d.count).fill(BIND_TRUNK), bind = { scale: options.scale, offset: options.offset, minOffset: SKIRT_BODY.clearance, maxOffset: 3 };
    const cloth = bindParticles(input, d.rest, region, bind);
    // UNDER FIT 1 ITS ON-HER CUT IS BOUND TO HER SKIN AS WELL, as a second set of particles after the cloth's own (`fitted`)
    const on = d.hug ? bindParticles(input, d.hug, region, bind) : null, n = d.count;
    this.fitted = !!on; this.only = !!on && d.fit <= 0; this.base = this.only ? 0 : n;
    // ...and, between her and the cloth, the sheet's own points as they are drawn at rest, a third (`between`)
    let drawn: typeof cloth | null = null;
    if (d.hug && !this.only) { const mid = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) mid[i] = d.hug[i] + (d.rest[i] - d.hug[i]) * d.fit; drawn = bindParticles(input, mid, region, bind); }
    this.between = !!drawn;
    const join = <A extends Float32Array | Uint32Array>(...parts: A[]): A => { const out = new (parts[0].constructor as new (length: number) => A)(parts.reduce((sum, a) => sum + a.length, 0)); let at = 0; for (const a of parts) { out.set(a, at); at += a.length; } return out; };
    const sets = on ? (this.only ? [on] : drawn ? [cloth, on, drawn] : [cloth, on]) : [cloth];
    const binding = sets.length === 1 ? sets[0] : { count: n * sets.length, tri: join(...sets.map((b) => b.tri)), bary: join(...sets.map((b) => b.bary)), offset: join(...sets.map((b) => b.offset)) };
    this.skin = new ClothSkin(options.body, binding, { thickness: SKIRT_BODY.clearance * M, armBones: SARAH_V2_ARM_BONES, trunkOnly: new Uint8Array(binding.count).fill(1), ...(options.skin ? { triangles: options.skin } : {}) });
    // (her skin is walked under the cloth's points and her places' as the cloth's own particles; under the sheet's, by themselves)
    this.simOrder = drawn ? Uint32Array.from({ length: n * 2 }, (_, i) => i) : null; this.sheetOrder = drawn ? Uint32Array.from({ length: n }, (_, i) => n * 2 + i) : null;
    // (ON HER, FIT 0, the sheet drawn IS her places: her skin is walked under them a second time, where they are)
    this.sheet = drawn || this.only ? createContacts(n) : null;
    if (this.simOrder) this.skin.setOrder(this.simOrder);
    const slots = this.skin.slots;
    this.before = createContacts(slots); this.after = createContacts(slots);
    this.scratch = new Float32Array(slots * 3);
    // the points of its on-her cut that are over the gap between her legs, each between the two points either side of it (`skirtDraft.heldSpans`)
    { const spans = heldSpans(d, on ? on.offset : cloth.offset, SKIRT_FIT.span / options.scale, hemOf(input.joints, 0)); this.spanA = spans.a; this.spanB = spans.b; this.spanU = spans.u; this.spanned = spans.count; }
    if (this.spanned) { const gap = this.overGap = new Uint8Array(n); for (let p = 0; p < n; p++) if (this.spanA[p] >= 0) gap[p] = 1; }
    if (d.hug && this.spanned) {
      // (her legs' capsules as `legs` lays them, at rest, metres: how far from each one's line each such point was cut)
      const J = input.joints, H = d.hug, keep = this.spanKeep = new Float32Array(n * 6), clear = SKIRT_FIT.clear;
      for (let side = 0, k = 0; side < 2; side++) for (const [a, b, f0, f1, r] of [[J.hip[side], J.knee[side], 0.12, 0.5, SKIRT_BODY.thighTop], [J.hip[side], J.knee[side], 0.5, 1, SKIRT_BODY.thigh], [J.knee[side], J.ankle[side], 0, 0.9, SKIRT_BODY.shin]] as const) {
        const ax = a[0] + (b[0] - a[0]) * f0, ay = a[1] + (b[1] - a[1]) * f0, az = a[2] + (b[2] - a[2]) * f0, sx = (b[0] - a[0]) * (f1 - f0), sy = (b[1] - a[1]) * (f1 - f0), sz = (b[2] - a[2]) * (f1 - f0), ss = sx * sx + sy * sy + sz * sz;
        for (let p = 0; p < n; p++) {
          if (this.spanA[p] < 0) continue;
          const x = H[p * 3], y = H[p * 3 + 1], z = H[p * 3 + 2];
          let w = ss > 1e-12 ? ((x - ax) * sx + (y - ay) * sy + (z - az) * sz) / ss : 0;
          w = w < 0 ? 0 : w > 1 ? 1 : w;
          keep[p * 6 + k] = Math.min(Math.hypot(x - ax - sx * w, y - ay - sy * w, z - az - sz * w), r + clear) * M;
        }
        k++;
      }
    }
    if (d.hug) {
      // the crease at the top of her thighs, bridged in front of her (`bridgeTo`)
      const H = d.hug, cols = d.columns, under = hemOf(input.joints, 0) - SKIRT_FIT.bridge, to = this.bridgeTo = new Int32Array(cols).fill(-1), share = this.bridgeShare = new Float32Array(cols), along = this.bridgeAt = new Float32Array(n);
      for (let c = 0; c < cols; c++) {
        const deg = Math.abs(((c / cols) * 360 + 180) % 360 - 180), t = Math.min(1, Math.max(0, (deg - SKIRT_FIT.bridgeFront[0]) / (SKIRT_FIT.bridgeFront[1] - SKIRT_FIT.bridgeFront[0])));
        share[c] = 1 - t * t * (3 - 2 * t);
        let last = d.rows - 1;
        for (let r = 1; r < d.rows; r++) if (H[(r * cols + c) * 3 + 1] < under) { last = r; break; }
        if (!(share[c] > 0) || last < 2) continue;
        to[c] = last;
        let run = 0;
        const len = new Float32Array(last + 1);
        for (let r = 1; r <= last; r++) { const p = (r * cols + c) * 3, q = p - cols * 3; run += Math.hypot(H[p] - H[q], H[p + 1] - H[q + 1], H[p + 2] - H[q + 2]); len[r] = run; }
        for (let r = 1; r < last; r++) along[r * cols + c] = run > 1e-9 ? len[r] / run : r / last;
      }
    }
    const caps = (): Capsules => ({ count: 7, a: new Float32Array(21), b: new Float32Array(21), radius: new Float32Array(7) });
    this.capsNow = caps(); this.capsWas = caps();
    const g = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(new Float32Array(d.count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.normal = new THREE.BufferAttribute(new Float32Array(d.count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.position);
    g.setAttribute('normal', this.normal);
    g.setAttribute(HIDDEN_ATTRIBUTE, this.hidden = new THREE.BufferAttribute(new Float32Array(d.count), 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(d.triangles, 1));
    // ITS FABRIC'S REST PLACE (Joshua, 2026-11-20: "make the skirts as a layer to remove, different textures + custom
    // import texture like the other ones"): where each point is as it is CUT, in the room's units, and its way out from
    // the skirt's axis -- the weave and a picture of his own are laid there (`fabricMaterial.ts`, triplanar), so they
    // stay on the cloth as it moves
    { const R = new Float32Array(d.count * 3), N = new Float32Array(d.count * 3);
      for (let p = 0; p < d.count; p++) {
        for (let c = 0; c < 3; c++) R[p * 3 + c] = d.rest[p * 3 + c] * M;
        const x = d.rest[p * 3] - d.axis[0], z = d.rest[p * 3 + 2] - d.axis[1], l = Math.hypot(x, z) || 1;
        N[p * 3] = x / l; N[p * 3 + 2] = z / l;
      }
      g.setAttribute('fabricRest', new THREE.BufferAttribute(R, 3)); g.setAttribute('fabricRestNormal', new THREE.BufferAttribute(N, 3)); }
    hiddenEdge(options.material);
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
    for (let c = 0; c < (this.only ? 0 : cols); c++) {
      at(c);
      const sx = x[c * 3] - v.x, sy = x[c * 3 + 1] - v.y, sz = x[c * 3 + 2] - v.z;
      for (let r = 1; r < d.rows; r++) { const p = r * cols + c; at(p); x[p * 3] = v.x + sx; x[p * 3 + 1] = v.y + sy; x[p * 3 + 2] = v.z + sz; }
    }
    // (under FIT 1, her places: where her skin has them, the gaps spanned)
    if (this.fitted) { this.legs(this.capsNow, null); this.place(x, false); }
    if (!this.sim) {
      // its rest lengths at her skinning's own size: her rest metres through her geometry's units to the world as her
      // bones lay them (MEASURED 2026-11-16: 100.0000 to the metre, the room's own)
      const k = (this.skin.worldScale || 1) / o.scale, n = d.count, base = this.base, all = this.fitted ? base + n : n, rest = new Float32Array(all * 3);
      this.restScaleWorld = k;
      // (her places: held outright, no cloth between them and none to the cloth, and her legs' capsules not theirs)
      const pin = new Float32Array(all).fill(1), mask = new Uint8Array(all);
      if (!this.only) { for (let i = 0; i < n * 3; i++) rest[i] = d.rest[i] * k; pin.set(d.pin); mask.fill(1, 0, n); }
      if (d.hug) for (let i = 0; i < n * 3; i++) rest[base * 3 + i] = d.hug[i] * k;
      this.sim = new ClothSim({ count: all, triangles: d.triangles, rest, pin, capsuleMask: mask }, this.cloth);
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
    this.legs(this.capsNow, stool);
    // (under FIT 1, her places: where her skin has them now, the gaps spanned)
    if (this.fitted) this.place(this.after.pinTarget);
    this.floors(sim.positions, this.after);
    this.raised = 0;
    if (this.under) { this.layer.build(this.under.x, this.under.n, CLOTH_LAYERS.cell * this.options.unitsPerMetre); this.raised = raiseOver(this.layer, this.after, n, this.options.unitsPerMetre, { most: CLOTH_LAYERS.tuckedMost, held: this.draft.pin, lift: this.under.lift ?? 0 }); }
    if (this.primed) {
      const a = this.after.pinTarget, b = this.before.pinTarget, jump = Math.max(JUMP_M, JUMP_SPEED * span) * this.options.unitsPerMetre, pin = this.draft.pin;
      let most = 0;
      // (its RING's places: on her hips. A skirt held further down her has held points on her knees and her shins,
      // which a walk swings faster than any jump's measure)
      for (let p = 0; p < this.draft.columns; p++) { if (pin[p] < 1) continue; const i = p * 3, q = (a[i] - b[i]) ** 2 + (a[i + 1] - b[i + 1]) ** 2 + (a[i + 2] - b[i + 2]) ** 2; if (q > most) most = q; }
      if (most > jump * jump) { this.jumps++; this.restart(); skinMs += this.skin.update(sim.positions, this.after); if (this.fitted) this.place(this.after.pinTarget); this.floors(sim.positions, this.after); }
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
    const shown = this.position.array as Float32Array;
    if (this.fitted) {
      // DRAWN FIT OF THE WAY FROM HER TO THE CLOTH (`SKIRT_FIT`): from each point's place on her, n further on
      const X = sim.positions, f = this.draft.fit, o = this.base * 3;
      for (let i = 0; i < n * 3; i++) shown[i] = X[o + i] + (X[i] - X[o + i]) * f;
      // ...and out of her skin, which the straight way cuts the corner of as she moves (`between`)
      this.skinPut = 0; this.skinPutMost = 0; this.tautPut = 0; this.tautMost = 0;
      if ((this.between || this.only) && this.probe.floor) skinMs += this.outOfHer(shown);
    } else shown.set(sim.positions.subarray(0, n * 3));
    clothNormals(shown, this.draft.triangles, n, this.normal.array as Float32Array);
    this.position.needsUpdate = true; this.normal.needsUpdate = true;
    const k = 1 / SMOOTHING, s = this.shown_;
    s.skinMs += (skinMs - s.skinMs) * k; s.simMs += (stats.ms - s.simMs) * k; s.contacts = stats.contacts;
  }

  /**
   * THE SHEET AS DRAWN, PUT OUT OF HER SKIN (`between`, `sheetOutOfSkin`): `x`, its points (world). Her skin is walked
   * under them where they are (the third set: `sheetOrder`, in this frame's pose), and each is set against the nearest
   * of her found there -- the point of her, and her skin's own facing -- to a stand-off between her places' (the
   * cut's ease, at FIT 0) and the cloth's own (at 1). Never its ring, which is the cloth's. The milliseconds her skin took.
   */
  private outOfHer(x: Float32Array): number {
    const c = this.sheet, d = this.draft, M = this.options.unitsPerMetre;
    if (!c) return 0;
    // (between her and the cloth: the third set's slots; on her, FIT 0: her places' own, the only ones there are)
    if (this.sheetOrder) this.skin.setOrder(this.sheetOrder);
    const ms = this.skin.update(x, c, true);
    if (this.sheetOrder) this.skin.setOrder(this.simOrder);
    const ease = this.settings.tucked ? SKIRT_CUT.easeTucked : SKIRT_CUT.ease, off = (ease + (SKIRT_BODY.clearance - ease) * d.fit) * M;
    const moved = sheetOutOfSkin(x, d.columns, d.count, c.point, c.normal, 0, off, SHEET_FLOOR.deep * M);
    this.skinPut = moved.put; this.skinPutMost = moved.most;
    // ...and taut across her creases, which it would otherwise go into behind her skin's own lip (`SHEET_TAUT`)
    this.tautPut = 0; this.tautMost = 0;
    if (this.probe.taut) { const t = tautColumns(x, d.columns, d.rows, c.normal, SHEET_TAUT.reach, SHEET_TAUT.slack * M, SHEET_TAUT.most * M, this.overGap); this.tautPut = t.put; this.tautMost = t.most; }
    return ms;
  }

  /** Each point's floor turned to face the point (`FLOOR`). */
  private floors(x: Float32Array, c: SkinContacts): void {
    const n = c.standOff.length, P = c.point, N = c.normal, inside = FLOOR.inside * this.options.unitsPerMetre;
    for (let i = 0, i3 = 0; i < n; i++, i3 += 3) {
      const dx = x[i3] - P[i3], dy = x[i3 + 1] - P[i3 + 1], dz = x[i3 + 2] - P[i3 + 2];
      const along = dx * N[i3] + dy * N[i3 + 1] + dz * N[i3 + 2], far = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (along > 0 && far > 1e-6) { N[i3] = dx / far; N[i3 + 1] = dy / far; N[i3 + 2] = dz / far; }
      else if (far > inside) { N[i3] = 0; N[i3 + 1] = 0; N[i3 + 2] = 0; }
    }
  }

  /**
   * HER PLACES, THE GAPS SPANNED (the fields' note above): in `t` (three a particle, world: every particle's own place
   * on her skin, the cloth's first and then her places', from `base`), each place that is over the gap between her legs is put onto
   * the span between the places either side of it, out of a leg that stands in the span's way (`spanKeep`). Her legs'
   * capsules (`capsNow`) must be current.
   */
  private place(t: Float32Array, bridge = true): void {
    const keep = this.spanKeep;
    if (!this.fitted) return;
    const A = this.spanA, B = this.spanB, U = this.spanU, n = this.draft.count, cols = this.draft.columns, base = this.base, ca = this.capsNow.a, cb = this.capsNow.b;
    if (this.spanned && keep) for (let p = cols; p < n; p++) {
      const a = A[p];
      if (a < 0) continue;
      const p3 = (base + p) * 3, a3 = (base + a) * 3, b3 = (base + B[p]) * 3, u = U[p];
      let x = t[a3] + (t[b3] - t[a3]) * u, y = t[a3 + 1] + (t[b3 + 1] - t[a3 + 1]) * u, z = t[a3 + 2] + (t[b3 + 2] - t[a3 + 2]) * u;
      // (out of the leg it is deepest in -- nearer that leg's line than it was cut -- straight out from that line)
      let most = 0, qx = 0, qy = 0, qz = 0;
      for (let k = 0, k3 = 0; k < 6; k++, k3 += 3) {
        const ax = ca[k3], ay = ca[k3 + 1], az = ca[k3 + 2], sx = cb[k3] - ax, sy = cb[k3 + 1] - ay, sz = cb[k3 + 2] - az, ss = sx * sx + sy * sy + sz * sz;
        let w = ss > 1e-9 ? ((x - ax) * sx + (y - ay) * sy + (z - az) * sz) / ss : 0;
        w = w < 0 ? 0 : w > 1 ? 1 : w;
        const cx = ax + sx * w, cy = ay + sy * w, cz = az + sz * w, in_ = keep[p * 6 + k] - Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2);
        if (in_ > most) { most = in_; qx = cx; qy = cy; qz = cz; }
      }
      if (most > 0) { const dx = x - qx, dy = y - qy, dz = z - qz, l = Math.sqrt(dx * dx + dy * dy + dz * dz); if (l > 1e-6) { const k = most / l; x += dx * k; y += dy * k; z += dz * k; } }
      t[p3] = x; t[p3 + 1] = y; t[p3 + 2] = z;
    }
    // across the crease at the top of her thighs: taut from its ring to her thighs (`bridgeTo`). Not as it is laid
    // on her afresh: a place put into her has no floor to come out by (`FLOOR.inside`), and from her skin it has.
    const to = this.bridgeTo, share = this.bridgeShare, along = this.bridgeAt;
    if (!bridge || !to || !share || !along) return;
    for (let c = 0; c < cols; c++) {
      const last = to[c], w = share[c];
      if (last < 0) continue;
      const a3 = (base + c) * 3, b3 = (base + last * cols + c) * 3, ax = t[a3], ay = t[a3 + 1], az = t[a3 + 2], ex = t[b3] - ax, ey = t[b3 + 1] - ay, ez = t[b3 + 2] - az;
      for (let r = 1; r < last; r++) {
        const p = r * cols + c, p3 = (base + p) * 3, u = along[p];
        t[p3] += (ax + ex * u - t[p3]) * w; t[p3 + 1] += (ay + ey * u - t[p3 + 1]) * w; t[p3 + 2] += (az + ez * u - t[p3 + 2]) * w;
      }
    }
  }

  private copyCaps(from: Capsules, to: Capsules): void { to.a.set(from.a); to.b.set(from.b); to.radius.set(from.radius); }

  /** The cloth's points now, world (count x 3). */
  get positions(): Float32Array | null { return this.sim?.positions ?? null; }
  /** The sheet's points as it is drawn, world (count x 3): the cloth's at FIT 1, FIT of the way from her to them under it. */
  get shown(): Float32Array | null { return this.sim ? (this.position.array as Float32Array) : null; }
  get velocities(): Float32Array | null { return this.sim?.velocities ?? null; }
  /** Its skin contacts as laid this frame (after `frame`). */
  get contacts(): SkinContacts { return this.before; }
  /**
   * WHAT OF IT IS UNDER A TEE WORN OVER IT AND NOT DRAWN (`clothLayers.ts` `besideCloth`): a mark a point, or null for all
   * of it. Its own cloth alone is left out, never her skin. A skirt hangs outside a tee, and with only the triangles
   * wholly under it left out, the rest stood up over the tee's hem in teeth a row tall (MEASURED 2026-11-17): so it is
   * cut close under its last points that are NOT marked (`HIDDEN_EDGE`), where its painted short is seen in its colour.
   * THE EDGE IS DRAWN A PIXEL AT A TIME (`hiddenEdge`): the marks ride each triangle as a number, and a pixel past
   * `HIDDEN_EDGE` of the way to a marked point is not drawn -- a line that crosses a triangle. Until 2026-11-17 a
   * triangle with any point marked was left out whole, and the edge under a tee's hem ran in steps a row of triangles
   * tall.
   */
  hide(marks: Uint8Array | null): void {
    const h = this.hidden.array as Float32Array, n = this.draft.count;
    let any = false, changed = false;
    for (let p = 0; p < n; p++) { const v = marks && marks[p] ? 1 : 0; if (v) any = true; if (h[p] !== v) { h[p] = v; changed = true; } }
    if (changed) this.hidden.needsUpdate = true;
    this.hiddenAny = any;
  }
  private hiddenAny = false;
  /** (a probe's) whether any of it is left out under a tee now */
  get hiding(): boolean { return this.hiddenAny; }
  /** (a probe's) her skin's points as it is posed under the skirt this frame, her soft body's moves among them: world, three a vertex. After `frame`. */
  skinPosed(): Float32Array {
    const n = this.options.body.geometry.getAttribute('position').count, out = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) this.skin.posedVertex(v, out, v * 3);
    return out;
  }
  /** Floors raised over a shirt under it this frame (a probe's). */
  get floorsRaised(): number { return this.raised; }

  stats(): ClothSkirtStats { return { ...this.shown_, worldPerMetre: this.restScaleWorld, particles: this.draft.count, jumps: this.jumps, rows: this.draft.rows, columns: this.draft.columns, heldRows: this.draft.heldRows, spanned: this.spanned, skinPut: this.skinPut, skinPutMost: this.skinPutMost / this.options.unitsPerMetre, tautPut: this.tautPut, tautMost: this.tautMost / this.options.unitsPerMetre }; }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
  }
}
