/**
 * HIS BELLY (Joshua, 2026-11-19, of the male base model's sliders: "yes to belly"; of how big, "maybe a max 100%, some
 * men can have big bellies"; of his navel, "probably not [an outie] but maybe in some rare occasions… like +10%").
 *
 * His file has no belly shapes (hers were baked from her own growth: `belly25` … `belly200`). So his is one SMOOTH FIELD
 * IN SPACE laid on his rest shape: each point of his trunk moved straight out from his body's middle at its own height,
 * by his own side profile from the bottom of his pubic bone to his breastbone's tip (`MALE_BELLY_PROFILE`), all round his
 * front and onto his sides, none at his back. A field smooth in space carries his navel's hollow out whole
 * (moved along each point's own normal, the walls of the hollow would be pushed apart and it would open up).
 *
 * It moves only what his trunk carries: a point his arm's or his thigh's bones carry is moved by what his trunk carries
 * of it (his hands hang beside his belly and his thighs meet it at his groin).
 *
 * THE NAVEL, OPTIONAL (`outie`, 0..1): an innie by default. Pushed out, the floor of his navel's hollow rises to his
 * belly's skin and a little past it -- the most a rare adult outie is (an outie in a grown man is mostly a small
 * umbilical hernia: Cleveland Clinic, "Umbilical hernia").
 *
 * Everything here is in his REST METRES (+y up, +x his left, +z forward), as his rest frame has him.
 */

export const MALE_BELLY = Object.freeze({
  /** MEASURED on `male-base-touched.glb` (2026-11-19, his midline's front): his navel's hollow, its floor 8 mm in. */
  navelY: 1.047,
  /** MEASURED: the middle of his trunk front to back at his navel's height (his front 0.129, his back -0.079). */
  middleZ: 0.025,
  /** MEASURED: his midline (his spine's root bone). */
  midX: 0.00996,
  /**
   * MEASURED on the skeleton as it is laid in him (2026-11-19, `skeletonLandmarks`): the BOTTOM of his pubic symphysis (its
   * top 0.850 less her symphysis's own 2.5 cm) and the tip of his breastbone (xiphoid). His belly lies between them (his:
   * "my belly starts (blends) at the bottom of my pubic bone"): under his ribs, down into his pelvis (Joshua, 2026-11-19:
   * "it should sit below the ribs, you have his in his chest basically"). A first try with a guess at his ribs (1.2, and
   * eased off 20 cm over them) sat his belly up in his chest and flat.
   */
  pubisY: 0.825,
  ribsY: 1.194,
  /** GAME TUNING: how far his belly stands forward at 100%, metres (MEASURED off his own side profile, below: 6.9 cm past the line from under his chest to his pubic bone; 200% is twice it -- Joshua: "200% will be just doubled the size"). */
  most: 0.069,
  /** GAME TUNING: how much his sides fill with it (0 front only, 1 as much as his front), and his back (none). */
  sides: 0.45,
  /** GAME TUNING: how far his navel's floor comes out at OUTIE 1, metres past where it would sit flush (a few mm). */
  outiePast: 0.004,
  /** MEASURED: his navel's hollow is 8 mm deep and about 2 cm across. */
  navelDepth: 0.008,
  navelRadius: 0.012,
});

/**
 * HIS BELLY'S SIDE PROFILE: how far forward it stands at 21 heights from the bottom of his pubic bone (0) to his
 * breastbone's tip (1), its most 1. MEASURED off Joshua's own side photograph (2026-11-19: "my belly starts (blends) at the
 * bottom of my pubic bone… below belly button, has more of that pregnancy belly look, above the bellybutton, extends about
 * the same"; the photograph is not kept): his skin's edge traced against the wall, less a straight line from under his chest
 * to his pubic bone, evened twice over three samples. Fullest at 0.40 to 0.50 -- a little under his navel; it rises
 * steeply from his pubic bone (the round, low curve) and eases off slowly to his ribs. Set beside hers (the female base
 * model's front, measured in the room standing, between the same two bones): its shape is nearest her belly at 40%
 * (0.116 apart, root mean square of the two curves each at its most 1; 0.129 at 60%, 0.199 at 20%), and its size her 45%
 * (her 40% stands 6.3 cm out, his 6.9 cm).
 */
export const MALE_BELLY_PROFILE: readonly number[] = Object.freeze([0, 0.231, 0.397, 0.545, 0.681, 0.808, 0.909, 0.973, 0.999, 1, 0.99, 0.956, 0.883, 0.794, 0.712, 0.623, 0.511, 0.376, 0.235, 0.113, 0]);

const smoothstep = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** How much of the bell a point at height `y` takes (his side profile: 1 at its fullest, none past his pubic bone's bottom or his breastbone's tip). */
export function bellyBell(y: number, m = MALE_BELLY): number {
  const t = (y - m.pubisY) / (m.ribsY - m.pubisY);
  if (!(t > 0 && t < 1)) return 0;
  const k = t * (MALE_BELLY_PROFILE.length - 1), i = Math.min(MALE_BELLY_PROFILE.length - 2, Math.floor(k)), f = k - i;
  return MALE_BELLY_PROFILE[i] * (1 - f) + MALE_BELLY_PROFILE[i + 1] * f;
}

/** How much of it a point takes round him: 1 straight ahead, `sides` at his sides, none behind his middle. */
export function bellyRound(x: number, z: number, m = MALE_BELLY): number {
  const dx = x - m.midX, dz = z - m.middleZ, r = Math.hypot(dx, dz);
  if (r < 1e-6) return 0;
  const c = dz / r; // 1 ahead, 0 at his side, -1 behind
  return c >= 0 ? m.sides + (1 - m.sides) * smoothstep(0, 1, c) ** 1.2 : m.sides * smoothstep(-0.35, 0, c);
}

/**
 * HIS BELLY'S FIELD at 100%: for each point (rest metres, three a point) its move, three a point. `trunk` is how much of
 * each point his trunk's bones carry (0..1).
 */
export function maleBellyField(rest: Float32Array | Float64Array, trunk: Float32Array | Float64Array, m = MALE_BELLY): Float32Array {
  const n = rest.length / 3, out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = trunk[i]; if (!(t > 0)) continue;
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    const w = bellyBell(y, m) * bellyRound(x, z, m) * t;
    if (!(w > 0)) continue;
    // straight out from his middle at this height: forward ahead, out at his sides
    const dx = x - m.midX, dz = z - m.middleZ, r = Math.hypot(dx, dz), a = m.most * w;
    // (forward more than out: a belly stands ahead of a man, his sides round into it)
    out[i * 3] = (dx / r) * a * 0.55; out[i * 3 + 2] = (dz / r) * a;
  }
  return out;
}

/**
 * HIS NAVEL PUSHED OUT (OUTIE 1): the floor of the hollow forward to his belly's skin and `outiePast` beyond, eased to
 * nothing at the hollow's rim. `front` is his skin's front at the navel's height (where its floor would sit flush).
 */
export function maleOutieField(rest: Float32Array | Float64Array, front: number, m = MALE_BELLY): Float32Array {
  const n = rest.length / 3, out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
    const d = Math.hypot(x - m.midX, y - m.navelY);
    if (d > m.navelRadius * 1.4 || z < m.middleZ) continue;
    const ease = 1 - smoothstep(m.navelRadius * 0.3, m.navelRadius * 1.4, d), want = front + m.outiePast * ease;
    if (z < want) out[i * 3 + 2] = (want - z) * ease;
  }
  return out;
}

/** Vertex normals of a mesh (positions three a point, triangles), unit length; copies of a point at the same place in `weld` (its rest shape) share one. */
export function vertexNormals(pos: Float32Array, index: ArrayLike<number>, weld: Float32Array | null = null): Float32Array {
  const nrm = new Float32Array(pos.length);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { nrm[k] += nx; nrm[k + 1] += ny; nrm[k + 2] += nz; }
  }
  // (a point his mesh splits along its picture's seams is one point: its copies share one normal, or each seam draws a line)
  if (weld) {
    const sum = new Map<string, [number, number, number]>(), key = (i: number) => `${Math.round(weld[i] * 1e5)},${Math.round(weld[i + 1] * 1e5)},${Math.round(weld[i + 2] * 1e5)}`;
    for (let i = 0; i < nrm.length; i += 3) { const k = key(i), s = sum.get(k); if (s) { s[0] += nrm[i]; s[1] += nrm[i + 1]; s[2] += nrm[i + 2]; } else sum.set(k, [nrm[i], nrm[i + 1], nrm[i + 2]]); }
    for (let i = 0; i < nrm.length; i += 3) { const s = sum.get(key(i))!; nrm[i] = s[0]; nrm[i + 1] = s[1]; nrm[i + 2] = s[2]; }
  }
  for (let i = 0; i < nrm.length; i += 3) { const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1; nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l; }
  return nrm;
}
