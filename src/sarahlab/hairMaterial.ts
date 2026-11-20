/**
 * HER HAIR'S MATERIAL (Joshua, 2026-10-24: one hairstyle for Sarah v2, `scripts/sarahV2Recovery/hair-bake.mjs`).
 *
 * Her hair is cards: strips of strands with alpha, drawn from both sides. three lights a double-sided triangle seen
 * from behind with its normal turned round, which is right for a sheet of paper and wrong for a lock of hair: the bake
 * gives every card the normal of the VOLUME it belongs to (out from her ponytail's axis, out from her head), so a lock
 * shades as one round thing, and seen from its far side it went dark against the strands beside it. This keeps the
 * baked normal on both sides of every card. Nothing else of the material changes.
 *
 * Follows the room's patch pattern (`clothNeckline.ts`): chained `onBeforeCompile` and cache key, the hooked
 * `#include` kept, applied once per material.
 */
import * as THREE from 'three';
import { hairRamp, hairToneGlsl } from './hairColours';

const patched = new WeakSet<THREE.Material>();
/** The fragment line added after three's `normal_fragment_begin`: the interpolated normal, never turned for the back face. */
export const HAIR_NORMAL_LINE = '\n#ifndef FLAT_SHADED\n\tnormal = normalize( vNormal );\n#endif';

export function patchHairMaterial(material: THREE.Material): void {
  if (patched.has(material)) return;
  patched.add(material);
  const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    previous.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', () => `#include <normal_fragment_begin>${HAIR_NORMAL_LINE}`);
  };
  material.customProgramCacheKey = function () { return `${cacheKey.call(this)}|sarah-hair-v1`; };
  material.needsUpdate = true;
}

// ------------------------------------------------------------------------------------------------------------------
// THE COLOUR (Joshua, 2026-11-14: "more hairstyles and colors so we can do Lena")

/** The cache key's tail once the colour is compiled in. */
export const HAIR_TINT_KEY = 'sarah-hair-tint-v1';
/**
 * The line added after three's `map_fragment`: the texel's tone (three hands the shader the texel in LINEAR light;
 * `hairToneOf` goes back to sRGB for it) drawn in the chosen colour's ramp. It sits BEFORE `color_fragment`, so the
 * vertex colour (the elastic is dark through it) still multiplies after, and the material's own colour as before.
 */
export const HAIR_TINT_LINE = '\n#ifdef USE_MAP\n\tif ( hairTintOn > 0.5 ) diffuseColor.rgb = diffuse * hairRampAt( hairToneOf( sampledDiffuseColor.r ) );\n#endif';

interface TintUniforms {
  readonly hairTintOn: THREE.IUniform<number>;
  readonly hairDark: THREE.IUniform<THREE.Vector3>;
  readonly hairMid: THREE.IUniform<THREE.Vector3>;
  readonly hairLight: THREE.IUniform<THREE.Vector3>;
  readonly hairGlint: THREE.IUniform<THREE.Vector3>;
}
const tinted = new WeakMap<THREE.Material, TintUniforms>();

/**
 * Hair in a colour: '#rrggbb' draws every strand's tone in that colour's own ramp (`hairColours.ts`), `null` is HER OWN,
 * the baked copper untouched. The recolouring is NOT COMPILED IN until a colour is first chosen: a material that has only
 * been patched by `patchHairMaterial` keeps exactly its program (same shader text, same cache key), so `null` before any
 * colour changes nothing at all. The first colour chains the patch on and compiles once (`needsUpdate`); afterwards a
 * colour, and `null` again (the uniform switch off: the branch is skipped and the texel is used as it was), are uniform
 * values and never a recompile.
 */
export function setHairColour(material: THREE.Material, colour: string | null): void {
  let u = tinted.get(material);
  if (!u) {
    if (colour === null) return;
    const made: TintUniforms = {
      hairTintOn: { value: 0 }, hairDark: { value: new THREE.Vector3() }, hairMid: { value: new THREE.Vector3() },
      hairLight: { value: new THREE.Vector3() }, hairGlint: { value: new THREE.Vector3() },
    };
    u = made;
    tinted.set(material, made);
    const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
    material.onBeforeCompile = function (shader, renderer) {
      previous.call(this, shader, renderer);
      Object.assign(shader.uniforms, made);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', () => `#include <common>\n${hairToneGlsl()}`)
        .replace('#include <map_fragment>', () => `#include <map_fragment>${HAIR_TINT_LINE}`);
    };
    material.customProgramCacheKey = function () { return `${cacheKey.call(this)}|${HAIR_TINT_KEY}`; };
    material.needsUpdate = true;
  }
  if (colour === null) { u.hairTintOn.value = 0; return; }
  const r = hairRamp(colour);
  u.hairDark.value.set(...r.dark); u.hairMid.value.set(...r.mid); u.hairLight.value.set(...r.light); u.hairGlint.value.set(...r.glint);
  u.hairTintOn.value = 1;
}

// ------------------------------------------------------------------------------------------------------------------
// THE DEPTH OF HER STRANDS (Joshua, 2026-11-19, of his Local Texture Lab: "add better depth and detail on like the hair
// so it doesn't look so flat"). The strand atlas through the lab's Convert mode (`scripts/hair/height.mjs`: its fine
// detail full and its broad form low, evened down each strand) and the lab's own normal map of that height: each strand a
// ridge, the gaps between them grooves, so light runs along her hair in lines and not over it as one smooth shell. Worn as
// the material's NORMAL MAP, filtered as a picture is at every distance: drawn from the height's slope across the screen,
// strands thinner than a pixel came out as a woven checker (MEASURED in the room). Its grooves are a little darker, read
// from the height map.

/** The two files (every style wears the one atlas, so the one pair). */
export const HAIR_HEIGHT_MAP = 'models/hair/hair-height-1024.png';
export const HAIR_NORMAL_MAP = 'models/hair/hair-normal-1024.png';
/** GAME TUNING (by eye in the room): how strongly the strands bend the light (the normal map's scale), how much darker a groove is. */
export const HAIR_DEPTH = Object.freeze({ strength: 1, groove: 0.12 });
export const HAIR_DEPTH_KEY = 'sarah-hair-depth-v3';

export interface HairDepthUniforms {
  readonly hairHeightMap: THREE.IUniform<THREE.Texture | null>;
  readonly hairGroove: THREE.IUniform<number>;
}
const deepened = new WeakMap<THREE.Material, HairDepthUniforms>();

/** The line added after three's `map_fragment`: its grooves a little darker. */
export const HAIR_GROOVE_LINE = '\n#ifdef USE_MAP\n\tif ( hairGroove > 0.0 ) diffuseColor.rgb *= 1.0 - hairGroove * ( 1.0 - smoothstep( 0.1, 0.6, texture2D( hairHeightMap, vMapUv ).r ) );\n#endif';

/**
 * Its normal map's frame takes the normal her hair keeps (`HAIR_NORMAL_LINE`): three builds the frame in
 * `normal_fragment_begin` with the normal turned round for a back face, and the line after it gives the normal back but
 * not the frame -- seen from behind, a card's strands were lit as if they faced away, a lock by her face gone brown
 * (MEASURED in the room). Its two tangents are already the front face's (turned twice).
 */
export const HAIR_TBN_LINE = '#ifdef USE_NORMALMAP_TANGENTSPACE\n\ttbn[2] = normal;\n#endif';

/** Her hair's material given its strands' depth (`normal` its normal map, `height` its height map; `strength` 0 is off). */
export function setHairDepth(material: THREE.Material, normal: THREE.Texture, height: THREE.Texture, strength: number = HAIR_DEPTH.strength, groove: number = HAIR_DEPTH.groove): HairDepthUniforms {
  const m = material as THREE.MeshStandardMaterial;
  let u = deepened.get(material);
  if (!u) {
    const made: HairDepthUniforms = { hairHeightMap: { value: height }, hairGroove: { value: groove } };
    u = made;
    deepened.set(material, made);
    const previous = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
    material.onBeforeCompile = function (shader, renderer) {
      previous.call(this, shader, renderer);
      Object.assign(shader.uniforms, made);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', () => '#include <common>\nuniform sampler2D hairHeightMap;\nuniform float hairGroove;')
        .replace('#include <map_fragment>', () => `#include <map_fragment>${HAIR_GROOVE_LINE}`)
        .replace('#include <normal_fragment_maps>', () => `${HAIR_TBN_LINE}\n#include <normal_fragment_maps>`);
    };
    material.customProgramCacheKey = function () { return `${cacheKey.call(this)}|${HAIR_DEPTH_KEY}`; };
  }
  const was = !!m.normalMap;
  m.normalMap = strength > 0 ? normal : null;
  m.normalScale.set(strength, strength);
  if (was !== !!m.normalMap) m.needsUpdate = true;
  u.hairHeightMap.value = height; u.hairGroove.value = groove;
  if (!was) material.needsUpdate = true;
  return u;
}

/** A map laid as the atlas is (`like`): numbers, not a colour. */
export function prepareHairMap(t: THREE.Texture, like: THREE.Texture | null): THREE.Texture {
  t.colorSpace = THREE.NoColorSpace;
  if (like) { t.flipY = like.flipY; t.channel = like.channel; t.wrapS = like.wrapS; t.wrapT = like.wrapT; }
  t.needsUpdate = true;
  return t;
}
