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
}

interface Patched { readonly uniforms: Record<string, THREE.IUniform>; readonly layers: number; readonly masked: boolean }
const patched = new WeakMap<THREE.Material, Patched>();

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

function patch(material: THREE.Material, layers: number, masked: boolean): Patched {
  const known = patched.get(material);
  if (known) return known;
  const uniforms: Record<string, THREE.IUniform> = {
    fabricShowRegions: { value: 0 }, fabricHangLayer: { value: -1 }, fabricUnderLayer: { value: -1 },
    fabricFieldMap: { value: null }, fabricFieldScale: { value: new THREE.Vector3(1, 1, 1) }, fabricFieldOffset: { value: new THREE.Vector3() },
  };
  for (let i = 0; i < layers; i++) {
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
      'attribute vec3 fabricRest;', 'attribute vec3 fabricRestNormal;', 'varying vec3 vFabricPos;', 'varying vec3 vFabricNrm;',
      ...(masked ? ['attribute vec3 fabricPaint;', 'attribute vec4 fabricRegionTint;', 'varying vec3 vFabricMask;', 'varying vec4 vFabricTint;',
        // where a shirt's drape hangs clear of her (tunicDrape.ts), that shirt's paint comes off the skin under it
        'attribute float fabricHang;', 'varying float vFabricHang;',
        // and where her top's cleavage bridge spans her (cleavageBridge.ts), that top's paint comes off the skin behind it
        'attribute float fabricUnder;', 'varying float vFabricUnder;',
        // detail through paint (bodyDetail.ts): her nipples' and navel's surface detail, taken back under paint only
        'attribute vec4 fabricDetail;', 'attribute vec4 fabricDetailN;', 'varying float vFabricDetailKeep;',
        // how far this point's rest place is from where a designed garment's field is looked up for it: its slip
        // (skinSlip.ts), and its carry to the pose the garment was designed in (designPose.ts). Zero until a designed
        // garment is worn
        'attribute vec3 fabricSlip;', 'varying vec3 vFabricSlip;',
        ...idx.flatMap((i) => [`uniform float fabricOn${i};`, `uniform float fabricNippleKeep${i};`, `uniform float fabricNavelKeep${i};`])] : []),
      shader.vertexShader,
    ].join('\n');
    const mask = masked ? '\nvFabricMask = fabricPaint;\nvFabricTint = fabricRegionTint;\nvFabricHang = fabricHang;\nvFabricUnder = fabricUnder;\nvFabricSlip = fabricSlip;' : '';
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
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvFabricPos = fabricRest;\nvFabricNrm = fabricRestNormal;${mask}${masked ? '\ntransformed -= fabricDetail.xyz * fabricSoften;\nvFabricDetailKeep = clamp(fabricDetail.w * (1.0 - fabricHideNipple / max(fabricCovered, 1e-3)) + fabricDetailN.w * (1.0 - fabricHideNavel / max(fabricCovered, 1e-3)), 0.0, 1.0);' : ''}`);
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
          ? `float fm${i} = fabricFieldOn${i} > 0.5 ? fabricFieldValue + 0.5 - fabricFieldLevel${i} : vFabricMask[${i}];
        float fk = fabricEdge(fm${i}) * (1.0 - pow(1.0 - fabricOpacity${i}, 2.2)) * (1.0 - fabricEdge(vFabricHang) * step(abs(fabricHangLayer - ${i}.0), 0.5)) * (1.0 - fabricEdge(vFabricUnder) * step(abs(fabricUnderLayer - ${i}.0), 0.5));\n        diffuseColor.rgb = mix(diffuseColor.rgb, fc, fk);`
          : `float fk = 1.0;\n        diffuseColor.rgb = fc;\n        diffuseColor.a *= fabricOpacity${i};`}
        if (fabricRough${i} >= 0.0) { fabricMatte = max(fabricMatte, fk); fabricRoughness = fabricRough${i}; }
      }`;
    shader.fragmentShader = [
      'varying vec3 vFabricPos;', 'varying vec3 vFabricNrm;', ...(masked ? ['varying vec3 vFabricMask;', 'varying vec4 vFabricTint;', 'uniform float fabricShowRegions;', 'varying float vFabricDetailKeep;', 'varying float vFabricHang;', 'uniform float fabricHangLayer;', 'varying float vFabricUnder;', 'uniform float fabricUnderLayer;',
        'varying vec3 vFabricSlip;', 'uniform highp sampler3D fabricFieldMap;', 'uniform vec3 fabricFieldScale;', 'uniform vec3 fabricFieldOffset;', ...idx.flatMap((i) => [`uniform float fabricFieldOn${i};`, `uniform float fabricFieldLevel${i};`]),
        // a designed garment's field at this pixel's own place on her skin (where the garment was designed: her rest
        // place, her points' slip taken off and their carry to the garment's pose added); nothing outside its block
        `float fabricFieldAt() {
          vec3 c = (vFabricPos + vFabricSlip) * fabricFieldScale + fabricFieldOffset;
          if (!(all(greaterThan(c, vec3(0.0))) && all(lessThan(c, vec3(1.0))))) return 0.0;
          return textureLod(fabricFieldMap, c, 0.0).r;
        }`,
        // where the paint's ramp crosses one half, antialiased over about a pixel
        'float fabricEdge(float m) { float w = max(fwidth(m) * 0.75, 0.002); return smoothstep(0.5 - w, 0.5 + w, m); }'] : []),
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
      ${idx.map(sample).join('\n')}
      ${masked ? 'if (fabricShowRegions > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vFabricTint.rgb, 0.78 * vFabricTint.a);' : ''}
    }`);
  };
  material.customProgramCacheKey = function () { return `${cacheKey.call(this)}|fabric-${layers}${masked ? '-painted' : ''}-v15`; };
  material.needsUpdate = true;
  const entry = { uniforms, layers, masked };
  patched.set(material, entry);
  return entry;
}

/**
 * Put `layer` (or nothing) into layer `index` of `material` on `mesh`. `masked` is the body's painting; `layers` how
 * many the material holds (fixed by its first call).
 */
export function setFabricLayer(mesh: THREE.Mesh, material: THREE.Material, index: number, layer: FabricLayer | null, opts: { readonly layers: number; readonly masked: boolean; readonly rest: ShapeFields | null }): void {
  if (!layer?.texture && !patched.has(material)) return; // nothing to take off a material never dressed
  ensureRest(mesh.geometry as THREE.BufferGeometry, opts.rest);
  const { uniforms, masked } = patch(material, opts.layers, opts.masked);
  if (masked) ensureHang(mesh.geometry as THREE.BufferGeometry);
  const on = !!layer?.texture;
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
  const a = g.getAttribute('fabricHang') as THREE.BufferAttribute;
  if (hang && hang.length === a.count) { (a.array as Float32Array).set(hang); a.needsUpdate = true; }
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
  const a = g.getAttribute('fabricUnder') as THREE.BufferAttribute;
  if (under && under.length === a.count) { (a.array as Float32Array).set(under); a.needsUpdate = true; }
  patch(material, opts.layers, true).uniforms.fabricUnderLayer.value = under ? layer : -1;
}
function ensureHang(g: THREE.BufferGeometry): void {
  for (const name of ['fabricHang', 'fabricUnder']) if (!g.getAttribute(name)) g.setAttribute(name, new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count), 1));
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
