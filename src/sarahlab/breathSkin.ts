/**
 * HER SKIN BREATHES (Joshua, 2026-11-13: "link up the outer skin to the lungs during breathing so the chest and belly
 * would naturally move in and out per breath"): her chest and her belly move out as she breathes in, by the air her
 * breath takes (actor/vitals.ts), shared between them as research measures it (vitals.ts `chestShare`).
 *
 * A move laid over her skin by where each point is in her rest frame (metres; +y up, +z her front, +x her left) -- so it
 * needs nothing stored on her points (her body carries all the attributes a vertex may), and moves her skin, her
 * opening's area and whatever she wears fitted to her alike, in the vertex shader (`BREATH_GLSL`, in softBody.ts
 * `patchJiggle`) and on the CPU for her cloth and her paint (`breathAt`, the same sums):
 *
 *  - HER CHEST (her rib cage, from the bottom of her breastbone to its top -- and at her sides from the bottom of her
 *    rib cage there, her lower ribs reaching further down her sides than her breastbone does at her front): its front moves forward and a little up --
 *    most at the top (her upper ribs swing up and forward like a pump handle) -- and its sides out -- most at the bottom
 *    (her lower ribs swing out like a bucket handle; wider still in late pregnancy, `breathFlare`). Its back stays: her
 *    ribs turn about her spine.
 *  - HER BELLY (from above her pubic bone to the bottom of her breastbone): its front moves forward, as her diaphragm
 *    drops and pushes what is under it out. Its back and her flanks hardly move.
 *  - HER FULL BELLY, apart from her breath: what her belly gives for a stomach holding more than she has room for
 *    (actor/abdominalOrgans.ts `stomachGiveMl`). Its top stays and it stands out low and round, as a small bump of her
 *    own does (`BREATH_SHAPE`'s `full*`), where her breath's belly move is even from her pubic bone to her breastbone.
 *  - Only her trunk: what lies out beyond the sides of her trunk at that height (her arms, hanging beside her) does not
 *    move. Her trunk's width at each height (`BreathTable`) is measured from her own skin when she is shaped
 *    (`layBreathTable`), her arms' skin left out by their bones.
 *
 * How far it moves is the breath's air itself: the volume her skin sweeps moving out, over all of her trunk, is her
 * chest's or her belly's share of the air breathed in (`breathVolumes`: the sweep of each move at 1 m, from her own
 * triangles); her full belly's sweep is what her stomach holds beyond its room, the same way (`full`). Every shape number
 * below is GAME TUNING within that, but where it says MEASURED.
 */
import * as THREE from 'three';

/** Her trunk's width table: `BREATH_SLICES` heights from `BREATH_SPAN.from`, `BREATH_SPAN.step` apart. */
export const BREATH_SPAN = Object.freeze({ from: 0.78, step: 0.02 });
export const BREATH_SLICES = 34;

/**
 * The moves' shapes. GAME TUNING:
 *  - `spineDepth`: how far in front of her back's skin her spine's front is (the back of her trunk's moving part):
 *    measured on her chest, her back's skin at -0.19 m and the front of her spine at -0.08 (src/data/thorax/v2.json).
 *  - `armEdge`: past her trunk's side by this share of its half-width, nothing moves.
 *  - chest: `chestBelow`/`chestAbove` how far its move reaches below the bottom of her breastbone and fades in, and
 *    below the top of it fades out; `chestFront` its front's move at its bottom and top; `chestSide` its sides' at its
 *    bottom and top; `chestUp` how far up its front goes at its top, against forward.
 *  - belly: `bellyFrom` above the top of her pubic bone it starts, fading in over `bellyIn`; it fades out from `bellyOut[0]`
 *    below the bottom of her breastbone to `bellyOut[1]` above it; `bellySide`, its sides' share.
 *  - a full belly (Joshua, 2026-11-13: "leave the top fixed, but make the bottom part curve rounded... it tends to be
 *    down lower near her pelvis... like a smaller belly shape of around 40% on the belly slider with that side
 *    profile"): her own small bump's shape. MEASURED 2026-11-13 off her skin, her 40% bump over her 0% belly: forward
 *    62.4 mm at the most, at 0.27 of the way up from the top of her pubic bone to the bottom of her breastbone; over
 *    that most, going up, 0.84 at 0.45 of the way, 0.65 at 0.63, 0.50 at 0.75, 0.23 at 0.87 and 0.06 at 0.99; across
 *    her at its height 0.82 at 0.24 of her half-width, 0.51 at 0.47 and 0.13 at 0.71; and her skin beside her midline
 *    goes sideways by about half its forward move times how far across her it is. `fullPeak` is where it stands out
 *    most; `fullOver` shapes its fall above that, to nothing at the bottom of her breastbone (within 0.04 of her bump's,
 *    rms); `fullAcross` is how far across her it reaches (within 0.06); `fullSide` its sideways share. GAME TUNING:
 *    `fullUnder`, its round underside in to nothing at the top of her pubic bone -- her bump carries her pubic area
 *    forward 2 to 4 cm, which a full belly does not.
 */
export const BREATH_SHAPE = Object.freeze({
  spineDepth: 0.11, armEdge: 0.15,
  chestBelow: 0.04, chestOver: 0.02, chestTopFade: 0.08, chestFront: [0.75, 1] as const, chestSide: [1, 0.3] as const, chestUp: 0.25,
  bellyFrom: 0.02, bellyIn: 0.06, bellyOut: [0.03, 0.05] as const, bellySide: 0.15,
  fullPeak: 0.26, fullUnder: 0.7, fullOver: 0.6, fullAcross: 0.9, fullSide: 0.5,
});

/** What the shaders and `breathAt` read: the moves now, her landmarks and her trunk's width. */
export interface BreathUniforms {
  /** x her chest's move now, y her belly's (metres at full weight), z her lower ribs' flare (1 before pregnancy), w the
   * height of the bottom of her rib cage at her sides (rest metres) */
  readonly breath: { value: THREE.Vector4 };
  /** her full belly's move now: metres where it stands out most (0 with room in her stomach) */
  readonly breathFull: { value: number };
  /** x the top of her pubic bone, y the bottom of her breastbone, z its top (heights, rest metres), w her midline (x) */
  readonly breathMarks: { value: THREE.Vector4 };
  /** each height's x half-widths of her trunk to her left and right of her midline, her spine's front z, her front z */
  readonly breathSlices: { value: THREE.Vector4[] };
}
export const createBreathUniforms = (): BreathUniforms => ({
  breath: { value: new THREE.Vector4(0, 0, 1, 1.09) },
  breathFull: { value: 0 },
  breathMarks: { value: new THREE.Vector4(0.87, 1.2, 1.37, 0) },
  breathSlices: { value: Array.from({ length: BREATH_SLICES }, () => new THREE.Vector4(0.15, 0.15, -0.05, 0.15)) },
});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The moves' shapes at a point (rest metres), at 1 m each: `chest` and `belly` written (xyz), and her full belly's
 * into `full` when given. Zero off her trunk. */
export function breathShapeAt(u: BreathUniforms, x: number, y: number, z: number, chest: { x: number; y: number; z: number }, belly: { x: number; y: number; z: number }, full?: { x: number; y: number; z: number }): void {
  chest.x = chest.y = chest.z = 0; belly.x = belly.y = belly.z = 0;
  if (full) full.x = full.y = full.z = 0;
  const S = BREATH_SHAPE, m = u.breathMarks.value, flare = u.breath.value.z, T = u.breathSlices.value;
  if (y < m.x || y > m.z + S.chestOver) return;
  const t = clamp((y - BREATH_SPAN.from) / BREATH_SPAN.step, 0, BREATH_SLICES - 1.001), k = Math.floor(t), f = t - k, a = T[k], b = T[k + 1];
  const halfL = mix(a.x, b.x, f), halfR = mix(a.y, b.y, f), spine = mix(a.z, b.z, f), front = mix(a.w, b.w, f);
  const side = x - m.w, l = side / Math.max(0.02, side >= 0 ? halfL : halfR), al = Math.abs(l);
  const trunk = 1 - smooth(1, 1 + S.armEdge, al);
  if (!(trunk > 0)) return;
  const fr = clamp((z - spine) / Math.max(0.02, front - spine), 0, 1), sl = Math.sign(l) * smooth(0.35, 1, al);
  // her chest: its front forward (more at the top) and up a little at the top; its sides out (more at the bottom)
  // (its bottom: her breastbone's at her front, her rib cage's lowest at her sides)
  const low = mix(m.y, Math.min(m.y, u.breath.value.w), smooth(0.25, 1, al));
  const c = smooth(low - S.chestBelow, low + S.chestOver, y) * (1 - smooth(m.z - S.chestTopFade, m.z + S.chestOver, y)) * trunk;
  if (c > 0) {
    const h = clamp((y - low) / Math.max(0.05, m.z - low), 0, 1), fz = smooth(0.15, 0.85, fr);
    chest.x = c * sl * mix(S.chestSide[0] * flare, S.chestSide[1], h);
    chest.y = c * S.chestUp * h * fz;
    chest.z = c * fz * mix(S.chestFront[0], S.chestFront[1], h);
  }
  // her belly: its front forward
  const bb = smooth(m.x + S.bellyFrom, m.x + S.bellyFrom + S.bellyIn, y) * (1 - smooth(m.y - S.bellyOut[0], m.y + S.bellyOut[1], y)) * trunk;
  if (bb > 0) { const fz = smooth(0.3, 0.9, fr); belly.x = bb * S.bellySide * l * fz; belly.z = bb * fz; }
  // her full belly: its front forward and a little apart, most low down, nothing at its top
  if (full) {
    const s = (y - m.x) / Math.max(0.05, m.y - m.x);
    if (s > 0 && s < 1) {
      const g = s < S.fullPeak ? Math.pow(smooth(0, S.fullPeak, s), S.fullUnder) : Math.pow(1 - smooth(S.fullPeak, 1, s), S.fullOver);
      const w = g * (1 - smooth(0, S.fullAcross, al)) * smooth(0.3, 0.9, fr);
      full.x = w * S.fullSide * l; full.z = w;
    }
  }
}

const sc = { x: 0, y: 0, z: 0 }, sb = { x: 0, y: 0, z: 0 }, sf = { x: 0, y: 0, z: 0 };
/** Her breath's move and her full belly's at a point (rest metres) into `out` (rest metres): what the shader adds. */
export function breathAt(u: BreathUniforms, x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const A = u.breath.value, F = u.breathFull.value;
  if (!(A.x !== 0 || A.y !== 0 || F !== 0)) return out.set(0, 0, 0);
  breathShapeAt(u, x, y, z, sc, sb, sf);
  return out.set(A.x * sc.x + A.y * sb.x + F * sf.x, A.x * sc.y + A.y * sb.y + F * sf.y, A.x * sc.z + A.y * sb.z + F * sf.z);
}

/** The same, in GLSL: `breathMove(p)` for a point in her rest frame (metres), her rest frame's move (metres). */
export const BREATH_GLSL = `
uniform vec4 uBreath;
uniform float uBreathFull;
uniform vec4 uBreathMarks;
uniform vec4 uBreathSlices[${BREATH_SLICES}];
vec3 breathMove(vec3 p) {
  if (uBreath.x == 0.0 && uBreath.y == 0.0 && uBreathFull == 0.0) return vec3(0.0);
  if (p.y < uBreathMarks.x || p.y > uBreathMarks.z + ${BREATH_SHAPE.chestOver.toFixed(4)}) return vec3(0.0);
  float t = clamp((p.y - ${BREATH_SPAN.from.toFixed(4)}) / ${BREATH_SPAN.step.toFixed(4)}, 0.0, ${(BREATH_SLICES - 1.001).toFixed(4)});
  int k = int(floor(t)); float f = t - float(k);
  vec4 s = mix(uBreathSlices[k], uBreathSlices[k + 1], f);
  float side = p.x - uBreathMarks.w;
  float l = side / max(0.02, side >= 0.0 ? s.x : s.y), al = abs(l);
  float trunk = 1.0 - smoothstep(1.0, ${(1 + BREATH_SHAPE.armEdge).toFixed(4)}, al);
  if (trunk <= 0.0) return vec3(0.0);
  float fr = clamp((p.z - s.z) / max(0.02, s.w - s.z), 0.0, 1.0), sl = sign(l) * smoothstep(0.35, 1.0, al);
  vec3 move = vec3(0.0);
  float low = mix(uBreathMarks.y, min(uBreathMarks.y, uBreath.w), smoothstep(0.25, 1.0, al));
  float c = smoothstep(low - ${BREATH_SHAPE.chestBelow.toFixed(4)}, low + ${BREATH_SHAPE.chestOver.toFixed(4)}, p.y) * (1.0 - smoothstep(uBreathMarks.z - ${BREATH_SHAPE.chestTopFade.toFixed(4)}, uBreathMarks.z + ${BREATH_SHAPE.chestOver.toFixed(4)}, p.y)) * trunk;
  if (c > 0.0) {
    float h = clamp((p.y - low) / max(0.05, uBreathMarks.z - low), 0.0, 1.0), fz = smoothstep(0.15, 0.85, fr);
    move += uBreath.x * c * vec3(sl * mix(${BREATH_SHAPE.chestSide[0].toFixed(4)} * uBreath.z, ${BREATH_SHAPE.chestSide[1].toFixed(4)}, h), ${BREATH_SHAPE.chestUp.toFixed(4)} * h * fz, fz * mix(${BREATH_SHAPE.chestFront[0].toFixed(4)}, ${BREATH_SHAPE.chestFront[1].toFixed(4)}, h));
  }
  float bb = smoothstep(uBreathMarks.x + ${BREATH_SHAPE.bellyFrom.toFixed(4)}, uBreathMarks.x + ${(BREATH_SHAPE.bellyFrom + BREATH_SHAPE.bellyIn).toFixed(4)}, p.y) * (1.0 - smoothstep(uBreathMarks.y - ${BREATH_SHAPE.bellyOut[0].toFixed(4)}, uBreathMarks.y + ${BREATH_SHAPE.bellyOut[1].toFixed(4)}, p.y)) * trunk;
  if (bb > 0.0) { float fz = smoothstep(0.3, 0.9, fr); move += uBreath.y * bb * vec3(${BREATH_SHAPE.bellySide.toFixed(4)} * l * fz, 0.0, fz); }
  float fs = (p.y - uBreathMarks.x) / max(0.05, uBreathMarks.y - uBreathMarks.x);
  if (uBreathFull != 0.0 && fs > 0.0 && fs < 1.0) {
    float fg = fs < ${BREATH_SHAPE.fullPeak.toFixed(4)} ? pow(smoothstep(0.0, ${BREATH_SHAPE.fullPeak.toFixed(4)}, fs), ${BREATH_SHAPE.fullUnder.toFixed(4)}) : pow(1.0 - smoothstep(${BREATH_SHAPE.fullPeak.toFixed(4)}, 1.0, fs), ${BREATH_SHAPE.fullOver.toFixed(4)});
    float fw = fg * (1.0 - smoothstep(0.0, ${BREATH_SHAPE.fullAcross.toFixed(4)}, al)) * smoothstep(0.3, 0.9, fr);
    move += uBreathFull * fw * vec3(${BREATH_SHAPE.fullSide.toFixed(4)} * l, 0.0, 1.0);
  }
  return move;
}
`;

/** Where her moves are anchored (rest metres): the top of her pubic bone, the bottom and top of her breastbone, her midline,
 * the bottom of her rib cage at her sides. */
export interface BreathMarks { readonly pubisTop: number; readonly xiphoid: number; readonly sternumTop: number; readonly midX: number; readonly ribsLowest: number }

/**
 * Lay her trunk's width table and her landmarks into `u`, from her skin as she is shaped: `rest` her points in her rest
 * frame (metres, xyz), `arm` each point's share on her arms' bones (0..1; a point mostly her arm's is left out). For each
 * height: how far her trunk's skin reaches to her left and right of her midline, her front's furthest point, and her
 * spine's front (`spineDepth` in front of her back's skin). A height with none of her trunk keeps its neighbour's.
 */
export function layBreathTable(u: BreathUniforms, rest: ArrayLike<number>, arm: ArrayLike<number>, marks: BreathMarks): void {
  const n = Math.floor(rest.length / 3), K = BREATH_SLICES, half = BREATH_SPAN.step / 2;
  const L = new Float64Array(K).fill(-1), R = new Float64Array(K).fill(-1), F = new Float64Array(K).fill(-Infinity), B = new Float64Array(K).fill(Infinity);
  for (let i = 0; i < n; i++) {
    if (!((arm[i] ?? 0) < 0.5)) continue;
    const y = rest[i * 3 + 1], t = (y - BREATH_SPAN.from) / BREATH_SPAN.step, k = Math.round(t);
    if (k < 0 || k >= K || Math.abs(y - (BREATH_SPAN.from + k * BREATH_SPAN.step)) > half) continue;
    const x = rest[i * 3] - marks.midX, z = rest[i * 3 + 2];
    if (x >= 0) L[k] = Math.max(L[k], x); else R[k] = Math.max(R[k], -x);
    F[k] = Math.max(F[k], z); B[k] = Math.min(B[k], z);
  }
  const T = u.breathSlices.value;
  let last: THREE.Vector4 | null = null;
  for (let k = 0; k < K; k++) {
    if (L[k] > 0 && R[k] > 0 && Number.isFinite(F[k]) && Number.isFinite(B[k])) { T[k].set(L[k], R[k], B[k] + BREATH_SHAPE.spineDepth, F[k]); last = T[k]; }
    else if (last) T[k].copy(last);
  }
  // (heights below the first measured one take it)
  const first = T.findIndex((_, k) => L[k] > 0 && R[k] > 0);
  for (let k = 0; k < first; k++) T[k].copy(T[first]);
  u.breathMarks.value.set(marks.pubisTop, marks.xiphoid, marks.sternumTop, marks.midX);
  u.breath.value.w = marks.ribsLowest;
}

/**
 * How much air each move sweeps at 1 m (m³ per metre, i.e. m²): over her skin's triangles (`rest` her points, rest
 * metres; `index` her triangles), each move's shape at a triangle's corners against the way the triangle faces, times its
 * area. Her chest's move then is her chest's share of a breath's air over `chest`, her belly's over `belly`; her full
 * belly's is what her stomach holds beyond its room over `full`.
 */
export function breathVolumes(u: BreathUniforms, rest: ArrayLike<number>, index: ArrayLike<number>): { chest: number; belly: number; full: number } {
  const n = Math.floor(rest.length / 3), C = new Float32Array(n * 3), Bm = new Float32Array(n * 3), Fm = new Float32Array(n * 3), c = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 }, f = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < n; i++) {
    breathShapeAt(u, rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2], c, b, f);
    C[i * 3] = c.x; C[i * 3 + 1] = c.y; C[i * 3 + 2] = c.z; Bm[i * 3] = b.x; Bm[i * 3 + 1] = b.y; Bm[i * 3 + 2] = b.z; Fm[i * 3] = f.x; Fm[i * 3 + 1] = f.y; Fm[i * 3 + 2] = f.z;
  }
  let chest = 0, belly = 0, full = 0;
  for (let t = 0; t + 2 < index.length; t += 3) {
    const i = index[t], j = index[t + 1], k = index[t + 2];
    if (!(i < n && j < n && k < n)) continue;
    const ax = rest[j * 3] - rest[i * 3], ay = rest[j * 3 + 1] - rest[i * 3 + 1], az = rest[j * 3 + 2] - rest[i * 3 + 2];
    const bx = rest[k * 3] - rest[i * 3], by = rest[k * 3 + 1] - rest[i * 3 + 1], bz = rest[k * 3 + 2] - rest[i * 3 + 2];
    // (half the cross product: the triangle's area along the way it faces)
    const nx = (ay * bz - az * by) / 2, ny = (az * bx - ax * bz) / 2, nz = (ax * by - ay * bx) / 2;
    let cs = 0, bs = 0, fs = 0;
    for (const v of [i, j, k]) { cs += C[v * 3] * nx + C[v * 3 + 1] * ny + C[v * 3 + 2] * nz; bs += Bm[v * 3] * nx + Bm[v * 3 + 1] * ny + Bm[v * 3 + 2] * nz; fs += Fm[v * 3] * nx + Fm[v * 3 + 1] * ny + Fm[v * 3 + 2] * nz; }
    chest += cs / 3; belly += bs / 3; full += fs / 3;
  }
  return { chest: Math.abs(chest), belly: Math.abs(belly), full: Math.abs(full) };
}
