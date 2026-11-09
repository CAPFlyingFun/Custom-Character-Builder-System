/**
 * HER BABY GIVES A LITTLE WHERE IT CROSSES HER OPENING (Joshua, 2026-11-03, of a hybrid soft body for the baby): a real
 * newborn's shoulders and chest are soft -- its collarbones flex, its sides squeeze -- so where its body passes through
 * her opening it is drawn in toward the middle of it, no further out than the oval her opening is held to
 * (vulvaMesh `passMostAlong` x `passMostAcross`, less her skin's thickness), its head never (a head does not squeeze).
 *
 * A vertex pass after its skinning, in the world: a point within `slab` of her opening's plane, further out than `knee`
 * of the way to the oval's edge, is eased in toward it -- never past the edge, and never by more than `most` of its
 * distance from the middle -- fading out to nothing over the slab, so the squeeze has no edge of its own.
 */
import * as THREE from 'three';

/** GAME TUNING: how near her opening's plane it gives (world metres either side), from how far out toward the oval's
 * edge (a share of the way), and by how much of its distance at the most */
export const BABY_SQUEEZE = Object.freeze({ slab: 0.03, knee: 0.85, most: 0.22 });

export interface SqueezeUniforms {
  sqOn: { value: number };
  sqC: { value: THREE.Vector3 };
  sqN: { value: THREE.Vector3 };
  sqUp: { value: THREE.Vector3 };
  sqAcross: { value: THREE.Vector3 };
  sqRa: { value: number };
  sqRb: { value: number };
  sqSlab: { value: number };
  sqHead: { value: THREE.Vector4 };
  sqKnee: { value: number };
  sqMost: { value: number };
}

export function createSqueezeUniforms(): SqueezeUniforms {
  return {
    sqOn: { value: 0 }, sqC: { value: new THREE.Vector3() }, sqN: { value: new THREE.Vector3(0, 0, 1) }, sqUp: { value: new THREE.Vector3(0, 1, 0) }, sqAcross: { value: new THREE.Vector3(1, 0, 0) },
    sqRa: { value: 1 }, sqRb: { value: 1 }, sqSlab: { value: 1 }, sqHead: { value: new THREE.Vector4(0, 0, 0, 0) }, sqKnee: { value: BABY_SQUEEZE.knee }, sqMost: { value: BABY_SQUEEZE.most },
  };
}

/** Where it gives, from her opening as it is now (vulvaMesh `passFrame`), or not at all (null); `perMetre` world units. */
/** Her opening as the squeeze reads it (vulvaMesh `passFrame`, or v3's doors': PelvicOrgansView `passFrame`), world
 * units; `slab` (metres) how near its plane her baby gives, when not `BABY_SQUEEZE.slab`. */
export interface SqueezeFrame {
  centre: THREE.Vector3; axis: THREE.Vector3; up: THREE.Vector3; across: THREE.Vector3; ra: number; rb: number; head: THREE.Vector3 | null; headR: number; slab?: number;
  /** how far out of her, along `axis`, the middle of the slab stands from `centre` (world units; none: at it) */
  out?: number;
}

export function setSqueeze(u: SqueezeUniforms, f: SqueezeFrame | null, perMetre: number): void {
  if (!f || !(f.ra > 0) || !(f.rb > 0)) { u.sqOn.value = 0; return; }
  u.sqOn.value = 1;
  u.sqN.value.copy(f.axis).normalize(); u.sqC.value.copy(f.centre).addScaledVector(u.sqN.value, f.out ?? 0); u.sqUp.value.copy(f.up).normalize(); u.sqAcross.value.copy(f.across).normalize();
  u.sqRa.value = f.ra; u.sqRb.value = f.rb; u.sqSlab.value = (f.slab ?? BABY_SQUEEZE.slab) * perMetre;
  if (f.head && f.headR > 0) u.sqHead.value.set(f.head.x, f.head.y, f.head.z, f.headR); else u.sqHead.value.set(0, 0, 0, 0);
}

const SQUEEZE_GLSL = /* glsl */ `
{
  vec4 sqW = modelMatrix * vec4( transformed, 1.0 );
  vec3 sqD = sqW.xyz - sqC;
  float sqH = dot( sqD, sqN );
  vec3 sqP = sqD - sqH * sqN;
  float sqK = length( vec2( dot( sqP, sqUp ) / sqRa, dot( sqP, sqAcross ) / sqRb ) );
  float sqWt = sqOn * ( 1.0 - smoothstep( 0.5 * sqSlab, sqSlab, abs( sqH ) ) );
  if ( sqHead.w > 0.0 ) sqWt *= smoothstep( sqHead.w, sqHead.w * 1.2, distance( sqW.xyz, sqHead.xyz ) );
  if ( sqWt > 0.0 && sqK > sqKnee ) {
    float sqR = 1.0 - sqKnee;
    float sqKk = sqKnee + sqR * ( 1.0 - exp( - ( sqK - sqKnee ) / sqR ) );
    sqKk = max( sqKk, sqK * ( 1.0 - sqMost ) );
    sqP *= mix( 1.0, sqKk / sqK, sqWt );
    sqW.xyz = sqC + sqH * sqN + sqP;
    transformed = ( inverse( modelMatrix ) * sqW ).xyz;
  }
}
`;

/**
 * The squeeze worked on points in the world (x, y, z after one another, in place) as the shader works it on her baby's
 * vertices -- so what is told her opening has passed it is her baby as it is drawn (v3's doors: PelvicOrgansView
 * `setPassing`). `perMetre` world units.
 */
export function squeezePoints(points: Float32Array, f: SqueezeFrame, perMetre: number): void {
  const slab = (f.slab ?? BABY_SQUEEZE.slab) * perMetre, K = BABY_SQUEEZE.knee, R = 1 - K, most = BABY_SQUEEZE.most;
  const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const n = f.axis.clone().normalize(), up = f.up.clone().normalize(), ac = f.across.clone().normalize(), c = f.centre.clone().addScaledVector(n, f.out ?? 0);
  for (let i = 0; i + 2 < points.length; i += 3) {
    const dx = points[i] - c.x, dy = points[i + 1] - c.y, dz = points[i + 2] - c.z, h = dx * n.x + dy * n.y + dz * n.z;
    const px = dx - h * n.x, py = dy - h * n.y, pz = dz - h * n.z;
    const k = Math.hypot((px * up.x + py * up.y + pz * up.z) / f.ra, (px * ac.x + py * ac.y + pz * ac.z) / f.rb);
    let w = 1 - ss(0.5 * slab, slab, Math.abs(h));
    if (f.head && f.headR > 0) w *= ss(f.headR, f.headR * 1.2, Math.hypot(points[i] - f.head.x, points[i + 1] - f.head.y, points[i + 2] - f.head.z));
    if (!(w > 0) || !(k > K)) continue;
    const kk = Math.max(K + R * (1 - Math.exp(-(k - K) / R)), k * (1 - most)), g = 1 + (kk / k - 1) * w;
    points[i] = c.x + h * n.x + px * g; points[i + 1] = c.y + h * n.y + py * g; points[i + 2] = c.z + h * n.z + pz * g;
  }
}

/** Its material given the squeeze (after its skinning), reading `u`. */
export function patchSqueeze(material: THREE.Material, u: SqueezeUniforms): void {
  const before = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    before?.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float sqOn; uniform vec3 sqC; uniform vec3 sqN; uniform vec3 sqUp; uniform vec3 sqAcross; uniform float sqRa; uniform float sqRb; uniform float sqSlab; uniform vec4 sqHead; uniform float sqKnee; uniform float sqMost;')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>\n${SQUEEZE_GLSL}`);
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|babySqueeze`;
  material.needsUpdate = true;
}
