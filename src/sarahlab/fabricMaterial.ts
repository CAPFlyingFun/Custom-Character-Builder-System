/**
 * A FABRIC ON A MATERIAL, without touching the model (`fabricLibrary.ts` for what the fabrics are).
 *
 * The swatch is laid on by TRIPLANAR projection from the surface's REST shape -- the approved positions before any
 * belly or fit field moves them (`ShapeFields.basePos`), copied once into `fabricRest`. So it needs no UVs (the
 * bikini has none, the body's are a skin atlas with seams), it has no seam anywhere, it rides with her through every
 * pose because skinning moves the surface and not the pattern, and as her belly grows the knit stretches with it the
 * way real fabric does instead of sliding across it.
 *
 * A material takes `layers` fabrics. A garment has one, over all of it. The body has one per paint layer, each
 * MASKED by its weight in the `fabricPaint` attribute (`bodyPaint.ts`, painted per vertex), and blended over the skin
 * rather than made see-through: hosiery painted on is a tint of the skin, never a hole in it. A garment in hosiery is
 * made see-through instead, `opacity` below 1 on a transparent material that still writes depth, so the far side of
 * the same leg never draws over the near one.
 *
 * The patch chains onto whatever `onBeforeCompile` the material already has (the leggings' hem cut, for one) and is
 * applied once per material; every later change is a uniform.
 */
import * as THREE from 'three';
import type { ShapeFields } from '../view/bodyShapeView';
import { DETAIL_LOOK, DETAIL_PACK, topDetailGlsl } from './topDetails';
import { LOW_CUT, lowGlsl } from './bottomCut';

export interface FabricLayer {
  /** The swatch, tiled (MirroredRepeatWrapping). Null switches the layer off. */
  readonly texture: THREE.Texture | null;
  /** One repeat of the swatch, in the mesh's own units. */
  readonly tile: number;
  /** A garment: 1 opaque, lower see-through. Painted on: how strongly the fabric covers the skin. */
  readonly opacity: number;
  /**
   * How matte the fabric is, 0 to 1 (Joshua, 2026-10-20: the painted red "can appear very glossy... jersey and athletic
   * fabrics look like fabric rather than shiny plastic"). Painted on, it replaces her SKIN's roughness where the paint
   * is, and the paint is never metallic. Missing: the material's own.
   */
  readonly roughness?: number;
  /**
   * Painted on: where the layer ends drawn from a designed garment's FIELD (`paintTemplates.designedField`) instead of
   * from its per-vertex paint. Her skin over her hips is in triangles up to 37 mm across, and a line blended across them
   * per vertex cannot carry a 5 mm edging cleanly; and anything that rides her points (a value per vertex, her UVs) rides
   * the slides her room shapes give them along her skin (`skinSlip.ts`), which bend a line at every big triangle. So the
   * garment is a block of cells in space round her (`texture`: one value a cell, linear data), and each pixel of her
   * skin looks itself up in it at its own place on her skin with her points' slip taken off: `scale` and `offset` turn
   * that place (her mesh's own units, `fabricRest` and `fabricSlip` together) into the block's 0..1. A garment designed
   * in a POSE (`designPose.ts`: her bikini bottom, with her legs apart) is looked up at her skin's place in that pose:
   * each vertex's carry to it is laid in `fabricSlip` with its slip. The layer shows where the field is above `level`
   * (0..1). One field at a time: every such layer on a material reads the same one.
   */
  readonly field?: { readonly texture: THREE.Data3DTexture; readonly level: number; readonly scale: readonly [number, number, number]; readonly offset: readonly [number, number, number] } | null;
  /**
   * Painted on (or a sheet in a top's fabric: her cleavage bridge): where the layer ends drawn from a TOP'S CUT
   * (`topCut.ts`: its neck opening's rim drawn from her front and from her back, its sleeves' ends and its hem flat cuts
   * through her), looked up for each pixel at its own place -- `setFabricCut` lays the cut itself on the material,
   * one at a time. `band`: a band along each edge this wide inside the cut's line (her mesh's units: along its neck
   * opening's rim, its sleeves' ends, its hem), with a seam along its inner side -- a collar, a cuff, a turned hem. It
   * is drawn in the layer's own fabric, `shade` darker (0..1); or, with an `edging`, in a COLOUR OF ITS OWN (Joshua,
   * 2026-11-14: "for the collars and sleeve bands, are those colors also adjustable? So for example can pick a solid
   * pink shirt with solid red color edging"): `colour` in linear light, laid on the layer's own knit -- each pixel's
   * light over the fabric's average, whose inverse is `knit` -- or flat, with `knit` 0.
   * `detail`: what is drawn on the cloth inside the cut (`topDetails.ts`: a collar, a placket and its buttons, a raglan's
   * sleeves in the edging colour, a wrap's crossing, a pocket), its pack (`TopDetailSpec.pack`). A second-colour region
   * and a button of the edging's tone take the edging colour as a band does; with no edging chosen, the fabric
   * `DETAIL_LOOK.fallback` as dark. A material is given the detail's code the first time one of its layers has a detail
   * (it is compiled again once); until then its program is exactly as it was.
   */
  readonly cut?: { readonly band: readonly [number, number, number]; readonly shade: number; readonly edging?: { readonly colour: readonly [number, number, number]; readonly knit: number } | null; readonly detail?: { readonly pack: ArrayLike<number> } | null } | null;
  /**
   * Painted on: where the layer ends drawn from a BOTTOM'S CUT (`bottomCut.ts`), for each pixel at its own place -- its
   * `waist`, the waistband's line round her (its height at the middle of her front, at her sides and at the middle of
   * her back, and how far round her the front's holds; null: none, a stocking), looked up where the pixel lies on her
   * rest skin with her skin's slip taken off (`LOW_SLIP_ATTRIBUTE`); its legs' `end` and `start`, flat rings round her
   * leg carried by her leg's bones (her units along her leg from her hip joint; null: none -- `setFabricLowLegs`),
   * which cut her leg's skin alone. `band`: a band along each edge this wide inside it (its waistband, its legs' ends,
   * its legs' tops), `shade` darker in the layer's own fabric or in its `edging` colour, with a seam -- as a top's.
   * `setFabricLow` lays her own measures for it on the material. A material is given this code the first time one of
   * its layers is a drawn bottom (it is compiled again once); until then its program is exactly as it was.
   */
  readonly low?: { readonly waist: readonly [number, number, number, number] | null; readonly end: number | null; readonly start: number | null; readonly band: readonly [number, number, number]; readonly shade: number; readonly edging?: { readonly colour: readonly [number, number, number]; readonly knit: number } | null } | null;
}

type V4 = readonly [number, number, number, number];
/**
 * Her own measures for a drawn bottom (`bottomCut.LowFrame`; her mesh's own units), as a material reads them: `axis`,
 * her middle (x), which way she faces along z, how far in front of her spine her side seam runs, and the scale an
 * edge's distance is put on; `spineA`, `spineB`, her spine's four joints (height, depth, height, depth each);
 * `legL`, `legR`, each leg's measure at rest -- its thigh's cut, its shin's (`bottomCut.legPlanes`: laid again each
 * frame as her bones carry them, `setFabricLowLegs`) and which of the two her skin takes by where it lies at rest
 * (`bottomCut.legBlend`); `seam`, how dark a band's seam is drawn and half how wide.
 */
export interface FabricLow {
  readonly axis: V4; readonly spineA: V4; readonly spineB: V4;
  /** the height a waistband's BAND reaches no lower than (`bottomCut.LowFrame.floor`) */
  readonly floor: number;
  readonly legL: readonly [V4, V4, V4]; readonly legR: readonly [V4, V4, V4];
  readonly seam: readonly [number, number];
}
/**
 * HER SKIN'S SLIP ABOUT HER HIPS, for a drawn bottom's waistband (`pulledSlip.ts`): three numbers a vertex, her mesh's
 * own units, what the shader adds to a pixel's rest place to look the waistband up. IT RIDES IN THE SHOW REGIONS
 * OVERLAY'S ATTRIBUTE: her skin's vertex shader has no attribute left (sixteen, on many phones: `AUX_ATTRIBUTE`), and
 * the overlay's tints are read only while SHOW REGIONS is on -- so while it is off the same four numbers a vertex are
 * her slip (x, y, z) and, the fourth, how much longer her skin is ACROSS her there than at rest (`bottomCut.waistAt`'s
 * `across`); and while it is on a waistband is looked up at her rest place itself (its line a little torn under the
 * tints, as it was before). Whoever writes the attribute writes all of it: `bodyPaint.showRegions` the tints,
 * `fabricPanel.ts` her slip when the overlay comes off.
 */
export const LOW_SLIP_ATTRIBUTE = 'fabricRegionTint';

/**
 * A top's cut as a material reads it (`topCut.ts`; her mesh's own units): `texture`, its two drawings and her middle
 * depth (red her front's distance, green her back's, blue her depth: `topCut.cutPicture`); `rect`, the picture's corner
 * and one over its width and its height; `depth`, her middle depth's lowest value and its span, half the depth the two
 * drawings are blended over, and the distance a full byte stands for; `armL`, `armR`, each sleeve's end at rest
 * (`topCut.sleevePlane`: a direction and what, added to a place's reach along it, measures along her arm -- laid again
 * each frame as her arm's bone carries it: `setFabricCutArms`); `limb`, her middle (x), where a sleeve ends along her
 * arm (negative: no sleeve), her hem's height, and which way she faces along z; `seam`, how dark a band's seam is drawn
 * and half how wide. `side`, for an OUTLINE (a tank, a camisole...: `topCut.ARMSCYES`), its armhole's side profile, the
 * picture's alpha: her shoulder joints' depth as she faces (the drawing's origin along z), how far out from her middle
 * the drawing comes in and over how much either side of that, and how much a corner between it and her front's or her
 * back's drawing is rounded over (`topCut.smoothMax`); `start`, a camisole's line besides (nothing of the armscye over a
 * height out to a distance from her middle, lower by a slope for each unit further out); absent or null, a top with
 * no armscye.
 */
export interface FabricCut {
  readonly texture: THREE.DataTexture;
  readonly rect: readonly [number, number, number, number];
  readonly depth: readonly [number, number, number, number];
  readonly armL: readonly [number, number, number, number];
  readonly armR: readonly [number, number, number, number];
  readonly limb: readonly [number, number, number, number];
  readonly seam: readonly [number, number];
  readonly side?: readonly [number, number, number, number] | null;
  readonly start?: readonly [number, number, number] | null;
  /**
   * ITS HEM IS THE TOP'S OWN EDGE (a sports bra's, a boxy crop tee's: above a shirt's LENGTH, with no drape's band over
   * it): the hem is then a level line on her AS SHE IS SHAPED -- at the height the pixel stands about her frame, its
   * rest place and its slip, as her neck opening is looked up -- and not at its rest height. Her rest shape is her
   * file's, with its 100% belly; her shapes slide her skin's points along her, each triangle by its own amount, so a
   * line level on her rest skin is a torn one on her at any other size (MEASURED 2026-11-15 in the room at 0%, the
   * sports bra: its under-band's edge ragged across her upper belly, in teeth of 3 to 5 mm). A shirt's hem is under
   * its drape's band and stays at its rest height, as approved.
   */
  readonly ownHem?: boolean;
}

interface Patched { readonly uniforms: Record<string, THREE.IUniform>; readonly layers: number; readonly masked: boolean; readonly cut: boolean; details: boolean; low: boolean }
const patched = new WeakMap<THREE.Material, Patched>();
/**
 * What her skin carries beside its paint, one attribute for the three (a vertex shader has sixteen attributes on many
 * phones, and her skin's uses them all): x, how far a shirt's drape hangs clear of her (`setHang`); y, how far she is
 * behind her top's cleavage bridge (`setUnder`); z, whether the skin is a limb's (`setArmSkin`: 1 her arm's, -1 her
 * leg's, 0 the rest of her -- `bottomCut.limbSkin`).
 */
export const AUX_ATTRIBUTE = 'fabricAux';

/**
 * Said in the vertex shader of every material the fabric's program is on: `fabricRest`, a point's place on the mesh's
 * rest surface, is declared there. Her face's layer reads it when it is (`faceRig.ts` `FACE_REST_DEFINE`: the same name).
 */
export const FABRIC_REST_DEFINE = 'FABRIC_REST_ATTRIBUTE';

/** Copy a mesh's rest surface into the attributes the fabric reads, once (a brush measures on it too). */
export function ensureRest(geometry: THREE.BufferGeometry, rest: ShapeFields | null): void {
  if (geometry.getAttribute('fabricRest')) return;
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const count = position.count;
  const pos = rest?.basePos && rest.basePos.length === count * 3 ? rest.basePos.slice() : Float32Array.from({ length: count * 3 }, (_, i) => position.getComponent(Math.floor(i / 3), i % 3));
  const nrm = rest?.baseNrm && rest.baseNrm.length === count * 3 ? rest.baseNrm.slice()
    : normal ? Float32Array.from({ length: count * 3 }, (_, i) => normal.getComponent(Math.floor(i / 3), i % 3)) : new Float32Array(count * 3).fill(0.577);
  geometry.setAttribute('fabricRest', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('fabricRestNormal', new THREE.BufferAttribute(nrm, 3));
}

function patch(material: THREE.Material, layers: number, masked: boolean, withCut = false): Patched {
  const known = patched.get(material);
  if (known) return known;
  // (her skin always reads a top's cut; a sheet in a top's fabric -- her cleavage bridge -- when it asks to)
  const cut = masked || withCut;
  const uniforms: Record<string, THREE.IUniform> = {
    fabricShowRegions: { value: 0 }, fabricHangLayer: { value: -1 }, fabricUnderLayer: { value: -1 },
    fabricFieldMap: { value: null }, fabricFieldScale: { value: new THREE.Vector3(1, 1, 1) }, fabricFieldOffset: { value: new THREE.Vector3() },
  };
  if (cut) Object.assign(uniforms, {
    fabricCutMap: { value: null }, fabricCutRect: { value: new THREE.Vector4(0, 0, 1, 1) }, fabricCutDepth: { value: new THREE.Vector4(0, 1, 1, 1) },
    fabricCutArmL: { value: new THREE.Vector4(0, -1, 0, 0) }, fabricCutArmR: { value: new THREE.Vector4(0, -1, 0, 0) }, fabricCutLimb: { value: new THREE.Vector4(0, -1, -1e9, 1) },
    fabricCutSeam: { value: new THREE.Vector2(0, 1) },
    // (an outline's armscye: off while its rounding, w, is 0)
    fabricCutSide: { value: new THREE.Vector4(0, 0, 1, 0) }, fabricCutStart: { value: new THREE.Vector3(0, 1e9, 0) },
    // (1: the hem is the top's own edge, level on her as she is shaped -- `FabricCut.ownHem`)
    fabricCutHem: { value: 0 },
  });
  for (let i = 0; i < layers; i++) {
    if (cut) {
      uniforms[`fabricCutOn${i}`] = { value: 0 };
      uniforms[`fabricCutBand${i}`] = { value: new THREE.Vector4() };
      // (its bands' own colour and the knit's share in it; w under 0: none, the bands are the fabric's, shaded)
      uniforms[`fabricCutEdge${i}`] = { value: new THREE.Vector4(0, 0, 0, -1) };
    }
    uniforms[`fabricFieldOn${i}`] = { value: 0 };
    uniforms[`fabricFieldLevel${i}`] = { value: 0.5 };
    uniforms[`fabricOn${i}`] = { value: 0 };
    uniforms[`fabricMap${i}`] = { value: null };
    uniforms[`fabricTile${i}`] = { value: 1 };
    uniforms[`fabricOpacity${i}`] = { value: 1 };
    uniforms[`fabricRough${i}`] = { value: -1 };
    uniforms[`fabricNippleKeep${i}`] = { value: 1 };
    uniforms[`fabricNavelKeep${i}`] = { value: 1 };
  }
  const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    previous.call(this, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    const idx = Array.from({ length: layers }, (_, i) => i);
    shader.vertexShader = [
      // (`FABRIC_REST_DEFINE`: whatever else is laid on this material can tell that `fabricRest` is here to read)
      `#define ${FABRIC_REST_DEFINE} 1`,
      'attribute vec3 fabricRest;', 'attribute vec3 fabricRestNormal;', 'varying vec3 vFabricPos;', 'varying vec3 vFabricNrm;',
      ...(masked ? ['attribute vec3 fabricPaint;', 'attribute vec4 fabricRegionTint;', 'varying vec3 vFabricMask;', 'varying vec4 vFabricTint;',
        // where a shirt's drape hangs clear of her (tunicDrape.ts), that shirt's paint comes off the skin under it (x);
        // where her top's cleavage bridge spans her (cleavageBridge.ts), that top's paint comes off the skin behind it
        // (y); and whether the skin is her arm's, for a top's cut (z): one attribute (AUX_ATTRIBUTE says why)
        // WHICH OF HER SKIN A PIXEL IS (z: 1 her arm's, -1 her leg's, 0 the rest of her -- `bottomCut.limbSkin`) GOES
        // TO THE PIXEL A SECOND TIME, READ INSIDE THE TRIANGLE THE PIXEL IS DRAWN FOR (`vFabricLimb`, `centroid`). The
        // flag steps across the one row of her triangles that joins a limb's skin to her trunk's, and a pixel that a
        // triangle only partly covers is told the triangle's numbers AT THE PIXEL'S MIDDLE, outside the triangle,
        // where they run on past its corners': on a triangle of the row that joins her LEG's skin to her trunk's, seen
        // thin, the flag ran on from -1 past 0 to a half -- "her arm's skin". A bottom left that part of the pixel
        // bare (no bottom is on her arm); a top cut it by its SLEEVE's end and not its hem, which at her hips is bare
        // too unless its sleeves reach that far down her arm. MEASURED 2026-11-15 in the room at a phone's 2x, her
        // legs whole in the picture, her front square on: three pairs of pixels a quarter her skin, one over another
        // down each of her hips' outlines and a few at the folds of her groin (the row runs there) -- the same places
        // of her from 170, 180 and 190 cm, gone when she was turned 3 degrees; in a drawn bottom, and in a
        // short-sleeved tee to her hips as v0.9.27 drew it (not in a long-sleeved one). Read inside the triangle the
        // flag stays between its corners'. (The other two numbers are a paint's ramp, cut where it crosses a half:
        // running on past a corner moves that line a part of a pixel, and they are read as they were.)
        `attribute vec3 ${AUX_ATTRIBUTE};`, 'varying vec3 vFabricAux;', 'centroid varying float vFabricLimb;',
        // detail through paint (bodyDetail.ts): her nipples' and navel's surface detail, taken back under paint only
        'attribute vec4 fabricDetail;', 'attribute vec4 fabricDetailN;', 'varying float vFabricDetailKeep;',
        // how far this point's rest place is from where a designed garment's field is looked up for it: its slip
        // (skinSlip.ts), and its carry to the pose the garment was designed in (designPose.ts). Zero until a designed
        // garment is worn
        'attribute vec3 fabricSlip;', 'varying vec3 vFabricSlip;',
        // a drawn top's sleeve: how far along her arm this point is, measured where her arm's bone has carried the
        // sleeve's end to (`setFabricCutArms`) -- on her posed place, so the end is a flat ring round her arm however
        // her skin under it is stretched
        'uniform vec4 fabricCutArmL;', 'uniform vec4 fabricCutArmR;', 'uniform vec4 fabricCutLimb;', 'varying float vFabricAlong;',
        ...idx.flatMap((i) => [`uniform float fabricOn${i};`, `uniform float fabricNippleKeep${i};`, `uniform float fabricNavelKeep${i};`])]
        // (a sheet in a top's fabric that reads the top's cut -- her cleavage bridge -- has a slip of its own, laid from
        // her skin's at its ends: its rim is looked up as her skin's is, at its rest place and its slip)
        : cut ? ['attribute vec3 fabricSlip;', 'varying vec3 vFabricSlip;'] : []),
      // a drawn bottom's legs (bottomCut.ts): how far along her leg this point is, measured where her leg's bones are
      // now -- by her thigh's bone and by her shin's, blended round her knee by where the point lies at rest
      ...(masked && entry.low ? ['uniform vec4 fabricLowLegL[3];', 'uniform vec4 fabricLowLegR[3];', 'uniform vec4 fabricLowAxis;', 'varying float vFabricLeg;'] : []),
      shader.vertexShader,
    ].join('\n');
    const mask = masked ? `\nvFabricMask = fabricPaint;\nvFabricTint = fabricRegionTint;\nvFabricAux = ${AUX_ATTRIBUTE};\nvFabricLimb = ${AUX_ATTRIBUTE}.z;\nvFabricSlip = fabricSlip;` : '';
    // each layer keeps its own share of her detail (detailMaterials.ts): where layers overlap, the one that hides most
    // decides, and every share is scaled by how much of that layer covers the vertex
    const fmax = (xs: string[]) => xs.reduce((a, b) => `max(${a}, ${b})`);
    const soften = masked ? `
      ${idx.map((i) => `float fabricC${i} = clamp(fabricPaint[${i}] * fabricOn${i} * 1.4, 0.0, 1.0);`).join('\n      ')}
      float fabricCovered = ${fmax(idx.map((i) => `fabricC${i}`))};
      float fabricHideNipple = ${fmax(idx.map((i) => `fabricC${i} * (1.0 - fabricNippleKeep${i})`))};
      float fabricHideNavel = ${fmax(idx.map((i) => `fabricC${i} * (1.0 - fabricNavelKeep${i})`))};
      // the nipples are softened here; the navel by her own navelFlat morph (SarahLabScene), its relief map below
      float fabricSoften = fabricDetail.w * fabricHideNipple;
      // only where a nipple is softened: elsewhere her normal goes on exactly as given, so a normal written to be summed
      // with her morphs' (bodyCrease.ts, under her breasts) is not made unit before they are added
      if (fabricSoften > 0.0) objectNormal = normalize(objectNormal - fabricDetailN.xyz * fabricSoften);` : '';
    if (masked) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>${soften}`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvFabricPos = fabricRest;\nvFabricNrm = fabricRestNormal;${mask}${cut && !masked ? '\nvFabricSlip = fabricSlip;' : ''}${masked ? '\ntransformed -= fabricDetail.xyz * fabricSoften;\nvFabricDetailKeep = clamp(fabricDetail.w * (1.0 - fabricHideNipple / max(fabricCovered, 1e-3)) + fabricDetailN.w * (1.0 - fabricHideNavel / max(fabricCovered, 1e-3)), 0.0, 1.0);' : ''}`);
    // (after her bones: `transformed` is her posed place, in her mesh's own space)
    if (masked) shader.vertexShader = shader.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>\nvFabricAlong = dot(fabricRest.x >= fabricCutLimb.x ? fabricCutArmL : fabricCutArmR, vec4(transformed, 1.0));${entry.low ? `
{
  bool fabricLegLeft = fabricRest.x >= fabricLowAxis.x;
  vec4 fabricPosed = vec4(transformed, 1.0);
  float fabricByThigh = dot(fabricLegLeft ? fabricLowLegL[0] : fabricLowLegR[0], fabricPosed), fabricByShin = dot(fabricLegLeft ? fabricLowLegL[1] : fabricLowLegR[1], fabricPosed);
  vFabricLeg = mix(fabricByThigh, fabricByShin, smoothstep(-1.0, 1.0, dot(fabricLegLeft ? fabricLowLegL[2] : fabricLowLegR[2], vec4(fabricRest, 1.0))));
}` : ''}`);
    // a top's cut for layer i: its line, and its bands -- a touch darker (or in the layer's edging colour), a seam
    // along their inner side. `fd`, how far inside the line this pixel is; `fm`, the same on the paint's scale.
    // EACH EDGE'S BAND IS ITS OWN: a collar's by how far the pixel is inside the neck opening's rim (`fn`, which the
    // drawings hold at their range: a collar's band is never wider), a cuff's or a hem's by how far it is inside that
    // edge (`fl`, as far as it is: a cuff may be wider than the drawings' range). Each is shaded by its own distance,
    // which runs on evenly across her: taken from the nearer of the two, the shade's edge was drawn where the nearer
    // one changed -- 3 cm from the rim, where the drawings' range ends -- as a dashed line all round her collar
    // (MEASURED 2026-11-14 in the room, the ringer).
    // A BAND IN A COLOUR OF ITS OWN (the layer's edging, `fabricCutEdge`): that colour in place of the fabric's, with
    // the fabric's own knit kept in it -- the pixel's light over the fabric's average light (w), held between about a
    // half and one and three quarters so a dark fabric's grain is not blown up under a light edging; with w 0, flat.
    const band = (d: string, b: string, i: number) => `
          if (${b} > 0.0) {
            float fa = max(fwidth(${d}) * 0.75, 1e-7), fi = 1.0 - smoothstep(${b} - fa, ${b} + fa, ${d});
            if (fabricCutEdge${i}.w >= 0.0) fc = mix(fc, fabricCutEdge${i}.rgb * (fabricCutEdge${i}.w > 0.0 ? clamp(dot(fc, vec3(0.2126, 0.7152, 0.0722)) * fabricCutEdge${i}.w, 0.45, 1.75) : 1.0), fi);
            else fc *= 1.0 - fabricCutBand${i}.w * fi;
            fc *= 1.0 - fabricCutSeam.x * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fa, abs(${d} - ${b})));
          }`;
    // a top's DETAILS for layer i (topDetails.ts `detailOf`, formula for formula): drawn on its cloth after its bands --
    // the edging's colour (or the fabric darker) where it says, a button's tone, then its shade. Only in a program
    // compiled with details (`Patched.details`): without, not a character of the program changes
    const edgeColour = (i: number) => `(fabricCutEdge${i}.w >= 0.0 ? fabricCutEdge${i}.rgb * (fabricCutEdge${i}.w > 0.0 ? clamp(dot(fc, vec3(0.2126, 0.7152, 0.0722)) * fabricCutEdge${i}.w, 0.45, 1.75) : 1.0) : fc * ${DETAIL_LOOK.fallback})`;
    const detailLine = (i: number) => entry.details ? `
          if (fabricTopDetOn${i} > 0.5) {
            vec3 ft = fabricTopDetail(fabricTopDet${i}, fabricDetPlace.x, fabricDetPlace.y, fabricDetPlace.z, 1.0 - fabricCutValue.z, fn, fabricCutBand${i}.x, fabricDetPlace.w, fabricDetFacing);
            vec3 fe = ${edgeColour(i)};
            fc = mix(fc, fe, ft.y);
            fc = mix(fc, fabricTopDet${i}[6].w < 0.0 ? fe : vec3(fabricTopDet${i}[6].w), ft.z);
            fc *= ft.x;
          }` : '';
    // a BOTTOM's cut for layer i (bottomCut.ts `lowAt`, formula for formula): its waistband's line at this pixel's own
    // place (`fabricLowPlace`: its rest place and her skin's slip there), its legs' ends and tops by how far along her
    // leg the pixel is (`vFabricLeg`). EACH EDGE IS ANTIALIASED BY ITS OWN SLOPE, as a top's: her leg's edges cut her
    // leg's skin alone (`fabricLegShare`), and the rest of her under a waistband is the garment whatever her legs do
    // (a stocking, which has no waistband, is on her leg's skin alone) -- but her ARM's skin, which hangs beside her
    // hips under any waistband and is never a bottom's (`fabricNotArm`). A band along each edge, as wide as its number
    // (`lowBand`); a waistband's stops at a level line above her cleft (`lowWaistBand`, `bottomCut.waistBanded`).
    // An edge's distance is held to the edge's own range before its slope is taken: far inside a garment the distance
    // is of no account, and between her legs -- where her axis comes out of her, and a waistband's line "at that place
    // round her" swings from pixel to pixel -- its slope is no pixel's width.
    // Which of her skin a pixel is, is read inside the triangle the pixel is drawn for (`vFabricLimb`: the vertex
    // shader's note says why).
    const lowBand = (d: string, b: string, weight: string, i: number) => `
          if (${b} > 0.0) {
            float fa = max(fwidth(${d}) * 0.75, 1e-7), fi = (1.0 - smoothstep(${b} - fa, ${b} + fa, ${d})) * ${weight};
            if (fabricCutEdge${i}.w >= 0.0) fc = mix(fc, fabricCutEdge${i}.rgb * (fabricCutEdge${i}.w > 0.0 ? clamp(dot(fc, vec3(0.2126, 0.7152, 0.0722)) * fabricCutEdge${i}.w, 0.45, 1.75) : 1.0), fi);
            else fc *= 1.0 - fabricLowBand${i}.w * fi;
            fc *= 1.0 - fabricCutSeam.x * ${weight} * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fa, abs(${d} - ${b})));
          }`;
    // A WAISTBAND'S BAND (bottomCut.ts `waistBanded`: the same places): inside its line by less than its depth, AND OVER
    // THE FLOOR -- a level line above her cleft, antialiased by its own slope as each edge is. Under the floor nothing of
    // it is drawn, whatever the distance inside its line says there (between her legs it says anything). Its seam runs
    // along its inner edge over the floor, and along the floor where that cuts it.
    const lowWaistBand = (i: number) => `
          if (fabricLowBand${i}.x > 0.0) {
            float fa = max(fwidth(fwd) * 0.75, 1e-7), fh = fabricLowPlace.y - fabricLowFloor, fg = max(fwidth(fh) * 0.75, 1e-7);
            float fin = 1.0 - smoothstep(fabricLowBand${i}.x - fa, fabricLowBand${i}.x + fa, fwd), fup = smoothstep(-fg, fg, fh), fi = fin * fup;
            if (fabricCutEdge${i}.w >= 0.0) fc = mix(fc, fabricCutEdge${i}.rgb * (fabricCutEdge${i}.w > 0.0 ? clamp(dot(fc, vec3(0.2126, 0.7152, 0.0722)) * fabricCutEdge${i}.w, 0.45, 1.75) : 1.0), fi);
            else fc *= 1.0 - fabricLowBand${i}.w * fi;
            fc *= 1.0 - fabricCutSeam.x * max(fup * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fa, abs(fwd - fabricLowBand${i}.x))), fin * (1.0 - smoothstep(fabricCutSeam.y, fabricCutSeam.y + fg, abs(fh))));
          }`;
    const lowLine = (i: number) => `
        if (fabricLowOn${i} > 0.5) {
          float fwd = ${LOW_CUT.far.toFixed(1)}, fcw = 1.0;
          if (fabricLowLeg${i}.z > 0.5) { fwd = fabricLowInside(fabricLowWaist${i}, fabricLowPlace, fabricLowR, fabricLowAcross); fcw = fabricEdge(clamp(0.5 + fwd / (2.0 * fabricLowAxis.w), 0.0, 1.0)); }
          float fle = fabricLowLeg${i}.x - vFabricLeg, fls = vFabricLeg - fabricLowLeg${i}.y;
          fe${i} = fcw * mix(fabricLowLeg${i}.z, fabricEdge(clamp(0.5 + fle / (2.0 * fabricLowAxis.w), 0.0, 1.0)) * fabricEdge(clamp(0.5 + fls / (2.0 * fabricLowAxis.w), 0.0, 1.0)), fabricLegShare) * fabricNotArm;${lowWaistBand(i)}${lowBand('fle', `fabricLowBand${i}.y`, 'fabricLegShare', i)}${lowBand('fls', `fabricLowBand${i}.z`, 'fabricLegShare', i)}
        }`;
    const cutLine = (i: number, neckOnly: boolean) => `
          float fn = fabricCutValue.x;${band('fn', `fabricCutBand${i}.x`, i)}
          ${neckOnly ? 'float fd = fn;' : `float fl = fabricCutValue.y;
          float fbl = mix(fabricCutBand${i}.z, fabricCutBand${i}.y, fabricCutValue.z);${band('fl', 'fbl', i)}
          float fd = min(fn, fl);`}${detailLine(i)}`;
    const sample = (i: number) => `
      if (fabricOn${i} > 0.5) {
        vec3 fq = ${masked ? `(vFabricPos + vFabricSlip * fabricFieldOn${i})` : 'vFabricPos'} / fabricTile${i};
        vec3 fc = texture2D(fabricMap${i}, fq.zy).rgb * fw.x + texture2D(fabricMap${i}, fq.xz).rgb * fw.y + texture2D(fabricMap${i}, fq.xy).rgb * fw.z;
        ${masked
          // a CRISP edge (Joshua, 2026-10-22: "need to add defined cloth edges... not like a solid line boundary of the
          // clothing, but something fussy and has streaks at the ends"): the paint is stored per vertex, and blending
          // across its soft ramp drew a fuzzy band with streaks along long triangles. The edge is now the line where the
          // ramp crosses one half, drawn one pixel wide whatever the distance (fwidth), so a neckline, a sleeve end and a
          // hem read as a seam. Painted hosiery's cover is a perceived amount: 50% reads as half-covered skin, not the
          // faint tint a linear mix gives
          // (a designed garment's layer ends where its field crosses the layer's level instead, and its weave is laid
          // by the same slip-free place: `FabricLayer.field`)
          // (a top's cut: the layer ends where its drawings, its sleeves' ends and its hem say, at this pixel's own
          // rest place: `FabricLayer.cut`)
          // (EACH OF A CUT'S EDGES IS ANTIALIASED BY ITS OWN SLOPE, and the layer is there where both have it. A
          // sleeveless top has her arm's skin bare by a distance of a metre and more, which comes in across the one row
          // of her triangles that joins her arm to her trunk: taken as one distance, the nearer of the two, its slope
          // there was some twenty ranges a pixel, and the edge function -- which draws a line a pixel wide by that
          // slope -- put a third of the cloth on the first pixel of it, on skin both edges have bare. MEASURED
          // 2026-11-15 in the room, the tank: a dotted hairline in the top's shade down the front of each shoulder,
          // stepped as her triangles are)
          ? `float fm${i} = fabricFieldOn${i} > 0.5 ? fabricFieldValue + 0.5 - fabricFieldLevel${i} : vFabricMask[${i}];
        float fe${i} = -1.0;
        if (fabricCutOn${i} > 0.5) {${cutLine(i, false)}
          fm${i} = 0.5 + fd / (2.0 * fabricCutDepth.w);
          fe${i} = min(fabricEdge(0.5 + fn / (2.0 * fabricCutDepth.w)), fabricEdge(0.5 + fl / (2.0 * fabricCutDepth.w)));
        }${entry.low ? lowLine(i) : ''}
        float fk = (fe${i} < 0.0 ? fabricEdge(fm${i}) : fe${i}) * (1.0 - pow(1.0 - fabricOpacity${i}, 2.2)) * (1.0 - fabricEdge(vFabricAux.x) * step(abs(fabricHangLayer - ${i}.0), 0.5)) * (1.0 - fabricEdge(vFabricAux.y) * step(abs(fabricUnderLayer - ${i}.0), 0.5));\n        diffuseColor.rgb = mix(diffuseColor.rgb, fc, fk);`
          : cut
            // a sheet in a top's fabric (her cleavage bridge): it ends at the cut's rim as her skin's paint does, and
            // is there only inside it
            ? `float fk = 1.0;
        if (fabricCutOn${i} > 0.5) {${cutLine(i, true)}
          fk = fabricEdge(0.5 + fd / (2.0 * fabricCutDepth.w));
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, fc, ${i === 0 ? '1.0' : 'fk'});\n        fabricCover = max(fabricCover, fk);\n        diffuseColor.a *= fabricOpacity${i};`
            : `float fk = 1.0;\n        diffuseColor.rgb = fc;\n        diffuseColor.a *= fabricOpacity${i};`}
        if (fabricRough${i} >= 0.0) { fabricMatte = max(fabricMatte, fk); fabricRoughness = fabricRough${i}; }
      }`;
    shader.fragmentShader = [
      'varying vec3 vFabricPos;', 'varying vec3 vFabricNrm;', ...(masked ? ['varying vec3 vFabricMask;', 'varying vec4 vFabricTint;', 'uniform float fabricShowRegions;', 'varying float vFabricDetailKeep;', 'varying vec3 vFabricAux;', 'centroid varying float vFabricLimb;', 'varying float vFabricAlong;', 'uniform float fabricHangLayer;', 'uniform float fabricUnderLayer;',
        'varying vec3 vFabricSlip;', 'uniform highp sampler3D fabricFieldMap;', 'uniform vec3 fabricFieldScale;', 'uniform vec3 fabricFieldOffset;', ...idx.flatMap((i) => [`uniform float fabricFieldOn${i};`, `uniform float fabricFieldLevel${i};`]),
        // a designed garment's field at this pixel's own place on her skin (where the garment was designed: her rest
        // place, her points' slip taken off and their carry to the garment's pose added); nothing outside its block
        `float fabricFieldAt() {
          vec3 c = (vFabricPos + vFabricSlip) * fabricFieldScale + fabricFieldOffset;
          if (!(all(greaterThan(c, vec3(0.0))) && all(lessThan(c, vec3(1.0))))) return 0.0;
          return textureLod(fabricFieldMap, c, 0.0).r;
        }`,
        ] : cut ? ['varying vec3 vFabricSlip;'] : []),
      // where the paint's ramp crosses one half, antialiased over about a pixel
      ...(cut ? ['float fabricEdge(float m) { float w = max(fwidth(m) * 0.75, 0.002); return smoothstep(0.5 - w, 0.5 + w, m); }',
        'uniform sampler2D fabricCutMap;', 'uniform vec4 fabricCutRect;', 'uniform vec4 fabricCutDepth;', 'uniform vec4 fabricCutLimb;', 'uniform vec2 fabricCutSeam;',
        'uniform vec4 fabricCutSide;', 'uniform vec3 fabricCutStart;', 'uniform float fabricCutHem;',
        ...idx.flatMap((i) => [`uniform float fabricCutOn${i};`, `uniform vec4 fabricCutBand${i};`, `uniform vec4 fabricCutEdge${i};`]),
        // a top's cut at this pixel's own place (topCut.ts `cutAt`): x, how far inside its neck opening's rim -- looked
        // up where the pixel stands about her frame (its rest place and its movement off her frame, `fabricSlip`), in her
        // front's drawing or her back's by whether that place is in front of her middle depth; y, how far inside its
        // sleeve's end (her arm's skin: `vFabricAlong`, her arm's bone's measure) or its hem (the rest of her); z, which
        // of those two (1 her arm's). AN OUTLINE'S ARMSCYE (topCut.ts `armscyeAt`, `smoothMax`): what her side's drawing
        // covers -- the picture's alpha, read at the place's depth ahead of her shoulder joints and its height -- is
        // covered as well, on skin further out from her middle than the drawing comes in at (and, a camisole's, under
        // the line its bodice falls away by), the corner between the two rounded
        masked ? `vec3 fabricCutAt() {
          vec3 place = vFabricPos + vFabricSlip;
          vec4 c = texture2D(fabricCutMap, (place.xy - fabricCutRect.xy) * fabricCutRect.zw);
          float side = smoothstep(-fabricCutDepth.z, fabricCutDepth.z, place.z * fabricCutLimb.w - (fabricCutDepth.x + c.b * fabricCutDepth.y));
          float neck = (mix(c.g, c.r, side) * 255.0 - 127.5) / 127.5 * fabricCutDepth.w;
          if (fabricCutSide.w > 0.0) {
            float so = abs(place.x - fabricCutLimb.x), ss = fabricCutStart.y - fabricCutStart.z * max(0.0, so - fabricCutStart.x);
            float sw = smoothstep(fabricCutSide.y - fabricCutSide.z, fabricCutSide.y + fabricCutSide.z, so) * (1.0 - smoothstep(ss - fabricCutSide.z, ss + fabricCutSide.z, place.y));
            float sa = texture2D(fabricCutMap, (vec2(fabricCutLimb.x + place.z * fabricCutLimb.w - fabricCutSide.x, place.y) - fabricCutRect.xy) * fabricCutRect.zw).a;
            float arm = mix(-fabricCutDepth.w, (sa * 255.0 - 127.5) / 127.5 * fabricCutDepth.w, sw);
            float sh = max(fabricCutSide.w - abs(neck - arm), 0.0) / fabricCutSide.w;
            neck = max(neck, arm) + sh * sh * fabricCutSide.w * 0.25;
          }
          float a = smoothstep(0.4, 0.6, vFabricLimb);
          return vec3(neck, mix(vFabricPos.y + vFabricSlip.y * fabricCutHem - fabricCutLimb.z, fabricCutLimb.y - vFabricAlong, a), a);
        }`
          // (a sheet across her front: her front's drawing alone)
          : `vec3 fabricCutAt() {
          vec4 c = texture2D(fabricCutMap, (vFabricPos.xy + vFabricSlip.xy - fabricCutRect.xy) * fabricCutRect.zw);
          return vec3((c.r * 255.0 - 127.5) / 127.5 * fabricCutDepth.w, 0.0, 0.0);
        }`] : []),
      // a top's details: their code, and where a pixel is for them -- out from her middle, its height, how much it is
      // on her front (as fabricCutAt blends her two drawings; a sheet across her front: all), half a pixel
      ...(cut && entry.details ? [topDetailGlsl(), ...idx.flatMap((i) => [`uniform float fabricTopDetOn${i};`, `uniform vec4 fabricTopDet${i}[${DETAIL_PACK / 4}];`]),
        masked ? `vec4 fabricDetailPlace() {
          vec3 place = vFabricPos + vFabricSlip;
          vec4 c = texture2D(fabricCutMap, (place.xy - fabricCutRect.xy) * fabricCutRect.zw);
          float front = smoothstep(-fabricCutDepth.z, fabricCutDepth.z, place.z * fabricCutLimb.w - (fabricCutDepth.x + c.b * fabricCutDepth.y));
          return vec4(place.x - fabricCutLimb.x, place.y, front, max(length(fwidth(place.xy)), 1e-7) * 0.75);
        }` : `vec4 fabricDetailPlace() {
          vec2 place = vFabricPos.xy + vFabricSlip.xy;
          return vec4(place.x - fabricCutLimb.x, place.y, 1.0, max(length(fwidth(place)), 1e-7) * 0.75);
        }`] : []),
      // a drawn bottom: her measures, each layer's own cut, and the functions (bottomCut.ts `lowGlsl`)
      ...(masked && entry.low ? ['varying float vFabricLeg;', 'uniform vec4 fabricLowAxis;', 'uniform vec4 fabricLowSpineA;', 'uniform vec4 fabricLowSpineB;', 'uniform float fabricLowFloor;',
        ...idx.flatMap((i) => [`uniform float fabricLowOn${i};`, `uniform vec4 fabricLowWaist${i};`, `uniform vec4 fabricLowLeg${i};`, `uniform vec4 fabricLowBand${i};`]), lowGlsl()] : []),
      ...idx.flatMap((i) => [`uniform float fabricOn${i};`, `uniform sampler2D fabricMap${i};`, `uniform float fabricTile${i};`, `uniform float fabricOpacity${i};`, `uniform float fabricRough${i};`]),
      shader.fragmentShader,
    ].join('\n').replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, fabricRoughness, fabricMatte);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, fabricMatte);')
      // fabric covers her skin's own texture: under paint the skin's normal map (pores, and the relief of her nipples
      // and navel) gives way to the smooth surface, except near those details, where DETAIL THROUGH PAINT says how much
      .replace('#include <normal_fragment_maps>', masked ? '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, fabricMatte * (1.0 - vFabricDetailKeep)));' : '#include <normal_fragment_maps>')
      .replace('#include <map_fragment>', `#include <map_fragment>
    float fabricMatte = 0.0, fabricRoughness = 1.0;
    {
      vec3 fw = pow(abs(normalize(vFabricNrm)), vec3(8.0));
      fw /= max(fw.x + fw.y + fw.z, 1e-5);
      ${masked ? `float fabricFieldValue = ${idx.map((i) => `fabricFieldOn${i}`).join(' + ')} > 0.5 ? fabricFieldAt() : 0.0;` : ''}
      ${cut ? `bool fabricCutWorn = ${idx.map((i) => `fabricCutOn${i}`).join(' + ')} > 0.5;
      vec3 fabricCutValue = fabricCutWorn ? fabricCutAt() : vec3(0.0);${masked ? '' : '\n      float fabricCover = 0.0;'}${entry.details ? `
      vec4 fabricDetPlace = fabricCutWorn ? fabricDetailPlace() : vec4(0.0);
      float fabricDetFacing = normalize(vFabricNrm).z * fabricCutLimb.w;` : ''}` : ''}${masked && entry.low ? `
      vec3 fabricLowPlace = vFabricPos + vFabricTint.xyz * (1.0 - fabricShowRegions);
      vec3 fabricLowR = fabricLowRound(fabricLowPlace);
      float fabricLowAcross = vFabricTint.w * (1.0 - fabricShowRegions);
      float fabricLegShare = smoothstep(0.4, 0.6, -vFabricLimb), fabricNotArm = 1.0 - smoothstep(0.4, 0.6, vFabricLimb);` : ''}
      ${idx.map(sample).join('\n')}
      ${cut && !masked ? 'if (fabricCutWorn) { if (fabricCover < 0.004) discard; diffuseColor.a *= fabricCover; }' : ''}
      ${masked ? 'if (fabricShowRegions > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vFabricTint.rgb, 0.78 * vFabricTint.a);' : ''}
    }`);
  };
  material.customProgramCacheKey = function () { return `${cacheKey.call(this)}|fabric-${layers}${masked ? '-painted' : cut ? '-cut' : ''}-v18${entry.details ? '-detail' : ''}${entry.low ? '-low' : ''}`; };
  material.needsUpdate = true;
  const entry: Patched = { uniforms, layers, masked, cut, details: false, low: false };
  patched.set(material, entry);
  return entry;
}

/**
 * Her skin's material in the fabric's program with nothing painted on her yet -- as her first painted layer would leave
 * it, the layer aside. For what reads her rest place in her own shader and can not wait for paint: her face's layer
 * under a shaped face (`faceRig.ts`). Nothing where the program is already on.
 */
export function ensureSkinFabric(mesh: THREE.Mesh, material: THREE.Material, opts: { readonly layers: number; readonly rest: ShapeFields | null }): void {
  ensureRest(mesh.geometry as THREE.BufferGeometry, opts.rest);
  patch(material, opts.layers, true);
  ensureHang(mesh.geometry as THREE.BufferGeometry);
}

/**
 * Put `layer` (or nothing) into layer `index` of `material` on `mesh`. `masked` is the body's painting; `layers` how
 * many the material holds (fixed by its first call).
 */
export function setFabricLayer(mesh: THREE.Mesh, material: THREE.Material, index: number, layer: FabricLayer | null, opts: { readonly layers: number; readonly masked: boolean; readonly rest: ShapeFields | null; readonly cut?: boolean }): void {
  if (!layer?.texture && !patched.has(material)) return; // nothing to take off a material never dressed
  ensureRest(mesh.geometry as THREE.BufferGeometry, opts.rest);
  const { uniforms, masked, cut } = patch(material, opts.layers, opts.masked, opts.cut);
  if (masked) ensureHang(mesh.geometry as THREE.BufferGeometry);
  const on = !!layer?.texture;
  // a top's cut: this layer's own line and its bands
  if (cut) {
    const c = on ? layer?.cut ?? null : null;
    uniforms[`fabricCutOn${index}`].value = c ? 1 : 0;
    if (c) {
      (uniforms[`fabricCutBand${index}`].value as THREE.Vector4).set(c.band[0], c.band[1], c.band[2], c.shade);
      const e = c.edging ?? null;
      (uniforms[`fabricCutEdge${index}`].value as THREE.Vector4).set(e ? e.colour[0] : 0, e ? e.colour[1] : 0, e ? e.colour[2] : 0, e ? Math.max(0, e.knit) : -1);
    }
    const d = c?.detail ?? null;
    if (d) withDetails(material);
    if (patched.get(material)?.details) {
      uniforms[`fabricTopDetOn${index}`].value = d ? 1 : 0;
      if (d) (uniforms[`fabricTopDet${index}`].value as THREE.Vector4[]).forEach((v, k) => v.set(d.pack[k * 4], d.pack[k * 4 + 1], d.pack[k * 4 + 2], d.pack[k * 4 + 3]));
    }
  }
  // a bottom's cut: this layer's own waistband, legs and bands
  if (masked) {
    const w = on ? layer?.low ?? null : null;
    if (w) withLow(material);
    if (patched.get(material)?.low) {
      uniforms[`fabricLowOn${index}`].value = w ? 1 : 0;
      if (w) {
        (uniforms[`fabricLowWaist${index}`].value as THREE.Vector4).fromArray(w.waist ?? [0, 0, 0, 1]);
        (uniforms[`fabricLowLeg${index}`].value as THREE.Vector4).set(w.end ?? LOW_CUT.far, w.start ?? -LOW_CUT.far, w.waist ? 1 : 0, 0);
        (uniforms[`fabricLowBand${index}`].value as THREE.Vector4).set(w.band[0], w.band[1], w.band[2], w.shade);
        const e = w.edging ?? null;
        (uniforms[`fabricCutEdge${index}`].value as THREE.Vector4).set(e ? e.colour[0] : 0, e ? e.colour[1] : 0, e ? e.colour[2] : 0, e ? Math.max(0, e.knit) : -1);
      }
    }
  }
  // a designed garment's field
  const field = masked && on ? layer?.field ?? null : null;
  uniforms[`fabricFieldOn${index}`].value = field ? 1 : 0;
  uniforms[`fabricFieldLevel${index}`].value = field?.level ?? 0.5;
  if (field) {
    uniforms.fabricFieldMap.value = field.texture;
    (uniforms.fabricFieldScale.value as THREE.Vector3).fromArray(field.scale);
    (uniforms.fabricFieldOffset.value as THREE.Vector3).fromArray(field.offset);
  }
  uniforms[`fabricOn${index}`].value = on ? 1 : 0;
  uniforms[`fabricMap${index}`].value = layer?.texture ?? null;
  uniforms[`fabricTile${index}`].value = Math.max(1e-4, layer?.tile ?? 1);
  uniforms[`fabricOpacity${index}`].value = layer?.opacity ?? 1;
  uniforms[`fabricRough${index}`].value = layer?.roughness ?? -1;
  if (!masked) {
    const seeThrough = on && (layer?.opacity ?? 1) < 0.999;
    const m = material as THREE.MeshStandardMaterial;
    if (m.transparent !== seeThrough) { m.transparent = seeThrough; m.depthWrite = true; m.needsUpdate = true; }
  }
}

/** A material that reads a top's cut given its details' code and uniforms, once: it compiles again. */
function withDetails(material: THREE.Material): void {
  const p = patched.get(material);
  if (!p?.cut || p.details) return;
  p.details = true;
  for (let i = 0; i < p.layers; i++) {
    p.uniforms[`fabricTopDetOn${i}`] = { value: 0 };
    p.uniforms[`fabricTopDet${i}`] = { value: Array.from({ length: DETAIL_PACK / 4 }, () => new THREE.Vector4()) };
  }
  material.needsUpdate = true;
}

/**
 * Her skin's material given a bottom's code and uniforms, once: it compiles again. (Its cache key is handed on through
 * a new function, so a material that follows hers by her functions' identity -- her opening's area's, `vulvaMesh.ts`
 * `keepMat` -- sees the change and compiles again with it.)
 */
function withLow(material: THREE.Material): void {
  const p = patched.get(material);
  if (!p?.masked || p.low) return;
  p.low = true;
  const v4 = () => new THREE.Vector4();
  Object.assign(p.uniforms, {
    fabricLowAxis: { value: new THREE.Vector4(0, 1, 0, 1) }, fabricLowSpineA: { value: v4() }, fabricLowSpineB: { value: v4() }, fabricLowFloor: { value: -LOW_CUT.far },
    fabricLowLegL: { value: [v4(), v4(), v4()] }, fabricLowLegR: { value: [v4(), v4(), v4()] },
  });
  for (let i = 0; i < p.layers; i++) {
    p.uniforms[`fabricLowOn${i}`] = { value: 0 };
    p.uniforms[`fabricLowWaist${i}`] = { value: v4() };
    p.uniforms[`fabricLowLeg${i}`] = { value: new THREE.Vector4(LOW_CUT.far, -LOW_CUT.far, 0, 0) };
    p.uniforms[`fabricLowBand${i}`] = { value: v4() };
  }
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = function () { return key.call(this); };
  material.needsUpdate = true;
}
/**
 * Her own measures for a drawn bottom laid on her skin's material (`FabricLow`), her legs' cuts as they are at rest; or
 * every layer's bottom taken off (null). Nothing on a material no layer of which has been a drawn bottom.
 */
export function setFabricLow(material: THREE.Material, low: FabricLow | null): void {
  const p = patched.get(material);
  if (!p?.low) return;
  const u = p.uniforms;
  if (!low) { for (let i = 0; i < p.layers; i++) u[`fabricLowOn${i}`].value = 0; return; }
  (u.fabricLowAxis.value as THREE.Vector4).fromArray(low.axis);
  (u.fabricLowSpineA.value as THREE.Vector4).fromArray(low.spineA);
  (u.fabricLowSpineB.value as THREE.Vector4).fromArray(low.spineB);
  u.fabricLowFloor.value = low.floor;
  // (which of her two bones' measures her skin takes is told at rest: it is laid here and not again)
  (u.fabricLowLegL.value as THREE.Vector4[])[2].fromArray(low.legL[2]);
  (u.fabricLowLegR.value as THREE.Vector4[])[2].fromArray(low.legR[2]);
  (u.fabricCutSeam.value as THREE.Vector2).fromArray(low.seam);
}
/**
 * Each leg's two cuts as her bones carry them now (her leg on the side of x over her middle, then her other): her
 * thigh's and her shin's, four numbers each as `FabricLow.legL` -- how far along her leg a POSED place p of her mesh's
 * own space is, is `p . (the first three) + the fourth`. Laid once a frame while a drawn bottom is worn: a leg's end is
 * then a flat ring square to the bone it is on in any pose.
 */
export function setFabricLowLegs(material: THREE.Material, legL: readonly [V4, V4], legR: readonly [V4, V4]): void {
  const p = patched.get(material);
  if (!p?.low) return;
  const L = p.uniforms.fabricLowLegL.value as THREE.Vector4[], R = p.uniforms.fabricLowLegR.value as THREE.Vector4[];
  L[0].fromArray(legL[0]); L[1].fromArray(legL[1]); R[0].fromArray(legR[0]); R[1].fromArray(legR[1]);
}
/** Whether any paint layer of a material is drawn from a bottom's cut now. */
export function fabricLowWorn(material: THREE.Material): boolean {
  const p = patched.get(material);
  if (!p?.low) return false;
  for (let i = 0; i < p.layers; i++) if ((p.uniforms[`fabricLowOn${i}`]?.value ?? 0) > 0.5) return true;
  return false;
}

/**
 * A top's cut laid on a material that reads one (her skin; a sheet dressed with `cut`: her cleavage bridge), or taken
 * off (null: its layers' own `cut` go with their fabric). One at a time: every layer drawn from a cut reads this one.
 */
export function setFabricCut(material: THREE.Material, cut: FabricCut | null): void {
  const p = patched.get(material);
  if (!p?.cut) return;
  const u = p.uniforms;
  u.fabricCutMap.value = cut?.texture ?? null;
  if (!cut) { for (let i = 0; i < p.layers; i++) u[`fabricCutOn${i}`].value = 0; return; }
  (u.fabricCutRect.value as THREE.Vector4).fromArray(cut.rect);
  (u.fabricCutDepth.value as THREE.Vector4).fromArray(cut.depth);
  (u.fabricCutArmL.value as THREE.Vector4).fromArray(cut.armL);
  (u.fabricCutArmR.value as THREE.Vector4).fromArray(cut.armR);
  (u.fabricCutLimb.value as THREE.Vector4).fromArray(cut.limb);
  (u.fabricCutSeam.value as THREE.Vector2).fromArray(cut.seam);
  (u.fabricCutSide.value as THREE.Vector4).fromArray(cut.side ?? [0, 0, 1, 0]);
  (u.fabricCutStart.value as THREE.Vector3).fromArray(cut.start ?? [0, 1e9, 0]);
  u.fabricCutHem.value = cut.ownHem ? 1 : 0;
}
/**
 * Each sleeve's end as her arm's bone carries it now (her left arm's, her right's): four numbers each, as
 * `FabricCut.armL` -- how far along her arm a POSED place p of her mesh's own space is, is `p . (the first three) + the
 * fourth`. Laid once a frame while a drawn top is worn: the sleeve's end is then a flat ring square to her arm in any
 * pose. (At rest the two are the cut's own, which `setFabricCut` lays.)
 */
export function setFabricCutArms(material: THREE.Material, armL: readonly [number, number, number, number], armR: readonly [number, number, number, number]): void {
  const p = patched.get(material);
  if (!p?.cut) return;
  (p.uniforms.fabricCutArmL.value as THREE.Vector4).fromArray(armL);
  (p.uniforms.fabricCutArmR.value as THREE.Vector4).fromArray(armR);
}
/** Whether any layer of a material is drawn from a top's cut now. */
export function fabricCutWorn(material: THREE.Material): boolean {
  const p = patched.get(material);
  if (!p?.cut || !p.uniforms.fabricCutMap.value) return false;
  for (let i = 0; i < p.layers; i++) if ((p.uniforms[`fabricCutOn${i}`]?.value ?? 0) > 0.5) return true;
  return false;
}
/**
 * Which of her skin is a LIMB's (one value a vertex: 1 her arm's, -1 her leg's, 0 the rest of her: `bottomCut.limbSkin`):
 * a top's sleeve's end cuts her arm's skin and its hem the rest of her; a bottom's legs' ends cut her leg's skin. Laid
 * once a body.
 */
export function setArmSkin(mesh: THREE.Mesh, arm: ArrayLike<number>, rest: ShapeFields | null): void {
  const g = mesh.geometry as THREE.BufferGeometry;
  ensureRest(g, rest);
  ensureHang(g);
  const a = g.getAttribute(AUX_ATTRIBUTE) as THREE.BufferAttribute;
  if (arm.length !== a.count) return;
  for (let v = 0; v < a.count; v++) a.setZ(v, arm[v]);
  a.needsUpdate = true;
}

/**
 * The body's SHOW REGIONS overlay on or off (`bodyPaint.showRegions` fills the tints). Patches the material if it has
 * not been yet, so the overlay works before anything is painted.
 */
export function setRegionOverlay(mesh: THREE.Mesh, material: THREE.Material, on: boolean, opts: { readonly layers: number; readonly rest: ShapeFields | null }): void {
  if (!on && !patched.has(material)) return;
  ensureRest(mesh.geometry as THREE.BufferGeometry, opts.rest);
  ensureHang(mesh.geometry as THREE.BufferGeometry);
  patch(material, opts.layers, true).uniforms.fabricShowRegions.value = on ? 1 : 0;
}

/**
 * Where a shirt's drape hangs clear of her skin (`TunicDrape.hang`, one value a vertex), and which paint layer that
 * shirt is: that layer's paint comes off the skin there. `layer` -1 (or no values) puts every layer's paint back.
 */
export function setHang(mesh: THREE.Mesh, material: THREE.Material, layer: number, hang: Float32Array | null, opts: { readonly layers: number; readonly rest: ShapeFields | null }): void {
  if (layer < 0 && !patched.has(material)) return;
  const g = mesh.geometry as THREE.BufferGeometry;
  ensureRest(g, opts.rest);
  ensureHang(g);
  const a = g.getAttribute(AUX_ATTRIBUTE) as THREE.BufferAttribute;
  if (hang && hang.length === a.count) { for (let v = 0; v < a.count; v++) a.setX(v, hang[v]); a.needsUpdate = true; }
  patch(material, opts.layers, true).uniforms.fabricHangLayer.value = hang ? layer : -1;
}
/**
 * Where her top's cleavage bridge spans her (`CleavageBridge.under`, one value a vertex), and which paint layer that top
 * is: that layer's paint comes off the skin behind the bridge, so only the outside layer is the shirt (Joshua,
 * 2026-10-23, drawn: "I want the part directly under that bridge to not be painted"). `layer` -1 puts it back.
 */
export function setUnder(mesh: THREE.Mesh, material: THREE.Material, layer: number, under: Float32Array | null, opts: { readonly layers: number; readonly rest: ShapeFields | null }): void {
  if (layer < 0 && !patched.has(material)) return;
  const g = mesh.geometry as THREE.BufferGeometry;
  ensureRest(g, opts.rest);
  ensureHang(g);
  const a = g.getAttribute(AUX_ATTRIBUTE) as THREE.BufferAttribute;
  if (under && under.length === a.count) { for (let v = 0; v < a.count; v++) a.setY(v, under[v]); a.needsUpdate = true; }
  patch(material, opts.layers, true).uniforms.fabricUnderLayer.value = under ? layer : -1;
}
function ensureHang(g: THREE.BufferGeometry): void {
  if (!g.getAttribute(AUX_ATTRIBUTE)) g.setAttribute(AUX_ATTRIBUTE, new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3), 3));
  // her points' slip, for a designed garment's field: zeros until one is worn (`fabricSlip`)
  if (!g.getAttribute('fabricSlip')) g.setAttribute('fabricSlip', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3), 3));
}
/**
 * Her points' slip as the shader reads it (three numbers a vertex, her mesh's own units, zeros at first), for
 * `skinSlip.ts`'s driver to write: set `needsUpdate` after a change.
 */
export function fabricSlip(mesh: THREE.Mesh, rest: ShapeFields | null): THREE.BufferAttribute {
  const g = mesh.geometry as THREE.BufferGeometry;
  ensureRest(g, rest);
  ensureHang(g);
  return g.getAttribute('fabricSlip') as THREE.BufferAttribute;
}
/**
 * A designed garment's field out of its picture: the picture's pixels (RGBA, a grey value in each), `width` by `height`,
 * hold the block's slices (one for each z, `dims[0]` by `dims[1]`) side by side, `cols` to a row. One byte a cell, x
 * fastest, then y, then z. Null when the picture is not that block's.
 */
export function fieldCells(pixels: ArrayLike<number>, width: number, height: number, dims: readonly [number, number, number], cols: number): Uint8Array | null {
  const [nx, ny, nz] = dims;
  if (width !== cols * nx || height !== Math.ceil(nz / cols) * ny || pixels.length < width * height * 4) return null;
  const cells = new Uint8Array(nx * ny * nz);
  for (let z = 0; z < nz; z++) {
    const ox = (z % cols) * nx, oy = Math.floor(z / cols) * ny;
    for (let y = 0; y < ny; y++) { const row = ((oy + y) * width + ox) * 4, to = (z * ny + y) * nx; for (let x = 0; x < nx; x++) cells[to + x] = pixels[row + x * 4]; }
  }
  return cells;
}
/** Whether any paint layer of a material is drawn from a designed garment's field now. */
export function fabricFieldWorn(material: THREE.Material): boolean {
  const p = patched.get(material);
  if (!p) return false;
  for (let i = 0; i < p.layers; i++) if ((p.uniforms[`fabricFieldOn${i}`]?.value ?? 0) > 0.5) return true;
  return false;
}

/** How much nipple and navel detail stays visible under each paint layer (`bodyDetail.ts`): 1 all, 0 none. */
export function setDetailKeep(mesh: THREE.Mesh, material: THREE.Material, keep: readonly { readonly nipple: number; readonly navel: number }[], opts: { readonly layers: number; readonly rest: ShapeFields | null }): void {
  ensureRest(mesh.geometry as THREE.BufferGeometry, opts.rest);
  ensureHang(mesh.geometry as THREE.BufferGeometry);
  const u = patch(material, opts.layers, true).uniforms;
  for (let i = 0; i < opts.layers; i++) {
    u[`fabricNippleKeep${i}`].value = keep[i]?.nipple ?? 1;
    u[`fabricNavelKeep${i}`].value = keep[i]?.navel ?? 1;
  }
}

/** (a probe's) Set the field levels of a material's paint layers by hand (a debugging look; the next sync puts them back). */
export function setFabricFieldLevels(material: THREE.Material, levels: readonly number[]): void {
  const p = patched.get(material);
  if (!p) return;
  levels.forEach((l, i) => { const u = p.uniforms[`fabricFieldLevel${i}`]; if (u) u.value = l; });
}
/** (a probe's) Which paint layers of a material are drawn from a designed garment's field, at what level, and its cells. */
export function fabricFieldState(material: THREE.Material): { readonly on: number[]; readonly level: number[]; readonly cells: number[] | null; readonly scale: number[]; readonly offset: number[] } | null {
  const p = patched.get(material);
  if (!p) return null;
  const tex = p.uniforms.fabricFieldMap?.value as THREE.Data3DTexture | null, img = tex?.image as { width?: number; height?: number; depth?: number } | undefined;
  return {
    on: Array.from({ length: p.layers }, (_, i) => p.uniforms[`fabricFieldOn${i}`]?.value ?? -1),
    level: Array.from({ length: p.layers }, (_, i) => p.uniforms[`fabricFieldLevel${i}`]?.value ?? -1),
    cells: img ? [img.width ?? 0, img.height ?? 0, img.depth ?? 0] : null,
    scale: (p.uniforms.fabricFieldScale.value as THREE.Vector3).toArray(), offset: (p.uniforms.fabricFieldOffset.value as THREE.Vector3).toArray(),
  };
}

/** Whether a material carries a fabric in any layer (for a probe or the editor's status line). */
export function fabricOn(material: THREE.Material): boolean {
  const p = patched.get(material);
  if (!p) return false;
  for (let i = 0; i < p.layers; i++) if (p.uniforms[`fabricOn${i}`].value > 0.5) return true;
  return false;
}
