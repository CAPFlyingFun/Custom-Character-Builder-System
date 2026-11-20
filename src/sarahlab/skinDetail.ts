/**
 * SKIN DETAIL: his skin's fine relief -- pores, fine creases, a soft unevenness -- drawn over his EVEN skin's own normal
 * map (Joshua, 2026-11-19, of his Local Texture Lab: "improve using this to add better depth and detail"; of a skin made
 * with it for Galaxy Defender: "use the HTML directly to redo it if it's at a lower resolution, and also test on the male
 * model"). The height map is `scripts/skinDetail.mjs`'s (the lab's own procedural maths, seamless, 1024 px).
 *
 * His skin's picture is an ATLAS (Meshy's: islands of every size), so a tile laid by its UVs would be a different size on
 * each island and seamed at every island's edge. It is laid TRIPLANAR on his REST place instead -- three looks at the
 * tile, square to his rest shape's three axes, blended by how his rest skin faces -- one size all over him, no seams, and
 * carried by his bones and his shapes as his skin is (rest place in, posed surface out). Its height is turned into a
 * bend of his drawn normal by its slope across the screen (Mikkelsen's bump mapping, three's own `perturbNormalArb`, with
 * the screen's step in his posed surface left at its length so a height in metres is a height in metres), and its pits
 * are a little darker (a cavity).
 *
 * A fragment and vertex patch on his skin's material; it chains on whatever `onBeforeCompile` it has.
 */
import * as THREE from 'three';

/** The tile's file. */
export const SKIN_DETAIL_MAP = 'models/skins/skin-detail-1024.png';

/** GAME TUNING (by eye on him in the room): how wide one tile is, how deep its relief, how much darker its pits. */
export const SKIN_DETAIL = Object.freeze({
  /** metres one tile spans (its 40 x 40 pores 1.5 mm apart) */
  tileM: 0.06,
  /** metres from its highest to its lowest */
  depthM: 0.0004,
  /** how much darker its pits are (0 none) */
  cavity: 0.18,
});

export interface SkinDetailUniforms {
  skinDetailMap: { value: THREE.Texture | null };
  /** rest units a tile spans */
  skinDetailTile: { value: number };
  /** posed units of height from its lowest to its highest (0: off) */
  skinDetailDepth: { value: number };
  skinDetailCavity: { value: number };
}

/** `unitsPerMetre`: his rest place's units in a metre (his mesh's own); `posedUnitsPerMetre`: what his drawn surface is in. */
export function skinDetailUniforms(map: THREE.Texture, unitsPerMetre: number, posedUnitsPerMetre: number, d = SKIN_DETAIL): SkinDetailUniforms {
  return {
    skinDetailMap: { value: map },
    skinDetailTile: { value: d.tileM * unitsPerMetre },
    skinDetailDepth: { value: d.depthM * posedUnitsPerMetre },
    skinDetailCavity: { value: d.cavity },
  };
}

/** The tile itself: repeated, mipmapped, read as numbers (not a colour). */
export function prepareSkinDetailMap(t: THREE.Texture): THREE.Texture {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

export const SKIN_DETAIL_VERTEX = /* glsl */ `
varying vec3 vSkinRest;
varying vec3 vSkinRestN;`;

export const SKIN_DETAIL_FRAGMENT = /* glsl */ `
varying vec3 vSkinRest;
varying vec3 vSkinRestN;
uniform sampler2D skinDetailMap;
uniform float skinDetailTile, skinDetailDepth, skinDetailCavity;
float skinDetailHeight() {
  vec3 w = pow( abs( normalize( vSkinRestN ) ), vec3( 4.0 ) );
  w /= max( 1e-5, w.x + w.y + w.z );
  vec3 p = vSkinRest / skinDetailTile;
  return texture2D( skinDetailMap, p.zy ).r * w.x + texture2D( skinDetailMap, p.xz ).r * w.y + texture2D( skinDetailMap, p.xy ).r * w.z;
}
vec3 skinDetailBend( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir ) {
  vec3 vSigmaX = dFdx( surf_pos ), vSigmaY = dFdy( surf_pos );
  vec3 R1 = cross( vSigmaY, surf_norm ), R2 = cross( surf_norm, vSigmaX );
  float fDet = dot( vSigmaX, R1 ) * faceDir;
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
  return normalize( abs( fDet ) * surf_norm - vGrad );
}`;

export const SKIN_DETAIL_APPLY = /* glsl */ `
if ( skinDetailDepth > 0.0 ) {
  float skinH = skinDetailHeight();
  vec2 skinDH = vec2( dFdx( skinH ), dFdy( skinH ) ) * skinDetailDepth;
  normal = skinDetailBend( - vViewPosition, normal, skinDH, faceDirection );
  diffuseColor.rgb *= 1.0 - skinDetailCavity * clamp( ( 0.42 - skinH ) * 3.0, 0.0, 1.0 ); // (its pits alone: the mean of it stays his own colour)
}`;

/** His skin's material given the detail. */
export function patchSkinDetail(material: THREE.MeshStandardMaterial, u: SkinDetailUniforms): void {
  const before = material.onBeforeCompile, key = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    before?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>${SKIN_DETAIL_VERTEX}`)
      .replace(/void main\(\)\s*\{/, (m) => `${m}\n  vSkinRest = position; vSkinRestN = normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>${SKIN_DETAIL_FRAGMENT}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>${SKIN_DETAIL_APPLY}`);
  };
  material.customProgramCacheKey = () => `${key ? key() : ''}|skinDetail`;
  material.userData.skinDetail = u;
  material.needsUpdate = true;
}
