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
