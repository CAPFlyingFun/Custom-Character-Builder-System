/**
 * WHERE A BODY TOUCHES THINGS (P4, touch & grip; Joshua, 2026-11-03: "measure the distance of each bone to the edge of the
 * skin for like each fingers, palms, feet, etc… and save the skin offset as contact points so like if Sarah is picking up
 * the tablet, we can program the fingers to naturally get in the grab position… it can actually accurately find and hold
 * on to the points").
 *
 * Each CONTACT POINT is a place on the skin a body touches with -- a finger's pad and its tip, the thumb's, the middle of
 * the palm and the heel of the hand, the heel, ball and toes of a foot, the front of a knee, the point of an elbow -- found
 * on the body's REST mesh by casting from inside the bone that carries it out to the skin, and kept as a SURFACE ANCHOR
 * (one triangle and three barycentric weights: sarahlab/bodySurface.ts), so it is read back on the LIVE mesh in any pose,
 * belly and build -- not a fixed offset from a bone, which her morphs and soft body would leave behind. With it: the bone it
 * rides, how deep the skin is over that bone there (MEASURED off the mesh), and the skin's outward way at rest.
 *
 * Where each is cast from, and which way (the body's rest frame: +y up, +z her front, +x her left; metres):
 * - a finger's PAD: from 55% of the way down its last bone, toward her palm (the way the finger closes); its TIP: from the
 *   end joint, on along the finger. The thumb's pad faces across the palm toward her little finger, as it folds.
 * - the PALM: from 55% of the way from the hand joint to the knuckles' middle, toward her palm; its HEEL: from 20% of the
 *   way from the wrist to the knuckles, toward her palm.
 * - a foot's HEEL: from 2 cm behind the ankle, straight down; its BALL: from its toes' base joint, straight down; its TOES:
 *   from the end of its toes' bone, on along the foot.
 * - a KNEE: from the knee joint, straight ahead; an ELBOW: from the elbow joint, straight back.
 * A cast that finds no skin within CAST_MOST is reported missing rather than guessed.
 *
 * The hands are read as `findFingers` reads them in the room: under each wrist, the first joint that branches four ways or
 * more is the hand and each branch a finger; the thumb is the branch whose base is furthest from the others; the rest are
 * named index to little by distance from it; the palm's normal is (along × across) × the side's sign.
 *
 * Pure: no three, no DOM. Deterministic in its input.
 */

export type Side = 'L' | 'R';
export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'little';
export const FINGER_NAMES: readonly FingerName[] = Object.freeze(['thumb', 'index', 'middle', 'ring', 'little']);
export type ContactSite =
  | `${FingerName}Pad` | `${FingerName}Tip`
  | 'palm' | 'palmHeel'
  | 'heel' | 'ball' | 'toes'
  | 'knee' | 'elbow';

export interface ContactPoint {
  readonly site: ContactSite;
  readonly side: Side;
  /** the bone it rides (an index into the input's joints) */
  readonly bone: number;
  /** a triangle of the input's triangle list and where on it */
  readonly tri: number;
  readonly bary: readonly [number, number, number];
  /** how far the skin is from where it was cast from, on the bone (metres, MEASURED) */
  readonly depth: number;
  /** the point and its skin's outward normal at rest (rest frame, metres) */
  readonly point: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
}

export interface ContactInput {
  /** the rest mesh's vertex positions, xyz (rest frame, metres) */
  readonly pos: ArrayLike<number>;
  /** its triangles, three vertex indices each */
  readonly tris: ArrayLike<number>;
  /** each bone's joint, xyz (rest frame, metres), and its parent (-1 for a root) */
  readonly joints: ArrayLike<number>;
  readonly parents: ArrayLike<number>;
  /** the joints a body's contacts are found from */
  readonly named: Readonly<Record<'wristL' | 'wristR' | 'elbowL' | 'elbowR' | 'kneeL' | 'kneeR' | 'ankleL' | 'ankleR', number>>;
  /** how big the body is against a grown woman (1, unless given): how far behind the ankle the heel is looked for is that
   * much of a grown woman's (a newborn's heel is a centimetre behind its ankle, not two), and how far each cast looks too,
   * though never under half of hers (a newborn is plump for its size: its elbow's skin two centimetres from the joint) */
  readonly size?: number;
}

export interface ContactSet {
  readonly points: readonly ContactPoint[];
  /** sites that found no skin, or whose bones were not there (a mitten hand has no fingers) */
  readonly missing: readonly string[];
}

/** GAME TUNING: how far a cast looks for her skin (metres; under a foot, from the ankle down to the sole, further); where
 * along a bone each is cast from. */
export const CONTACT_CAST = Object.freeze({ most: 0.06, footMost: 0.16, padAt: 0.55, palmAt: 0.55, heelOfHandAt: 0.2, heelBack: 0.02 });

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V): V => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const r3 = (a: V): [number, number, number] => [+a[0].toFixed(5), +a[1].toFixed(5), +a[2].toFixed(5)];

/** A ray against the mesh: the nearest triangle it meets within `most`, where on it, and how far. Möller–Trumbore. */
export function castToSkin(pos: ArrayLike<number>, tris: ArrayLike<number>, o: V, d: V, most: number): { tri: number; bary: [number, number, number]; t: number } | null {
  let best: { tri: number; bary: [number, number, number]; t: number } | null = null;
  const reach = most + 1e-9;
  for (let t3 = 0; t3 + 2 < tris.length; t3 += 3) {
    const ia = tris[t3] * 3, ib = tris[t3 + 1] * 3, ic = tris[t3 + 2] * 3;
    const ax = pos[ia], ay = pos[ia + 1], az = pos[ia + 2];
    // (a cheap reject: a triangle whose first corner is far from the ray's whole length cannot be met)
    const qx = ax - o[0], qy = ay - o[1], qz = az - o[2];
    if (qx * qx + qy * qy + qz * qz > (reach + 0.05) * (reach + 0.05)) continue;
    const e1x = pos[ib] - ax, e1y = pos[ib + 1] - ay, e1z = pos[ib + 2] - az, e2x = pos[ic] - ax, e2y = pos[ic + 1] - ay, e2z = pos[ic + 2] - az;
    const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det, sx = o[0] - ax, sy = o[1] - ay, sz = o[2] - az;
    const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
    const kx = sy * e1z - sz * e1y, ky = sz * e1x - sx * e1z, kz = sx * e1y - sy * e1x;
    const v = (d[0] * kx + d[1] * ky + d[2] * kz) * inv; if (v < 0 || u + v > 1) continue;
    const t = (e2x * kx + e2y * ky + e2z * kz) * inv;
    if (t <= 1e-6 || t > reach || (best && t >= best.t)) continue;
    best = { tri: t3 / 3, bary: [1 - u - v, u, v], t };
  }
  return best;
}

/** Every contact the body's rest mesh and bones give. */
export function measureContacts(input: ContactInput): ContactSet {
  const { pos, tris, joints, parents, named } = input, n = parents.length, size = input.size ?? 1;
  const J = (i: number): V => [joints[i * 3], joints[i * 3 + 1], joints[i * 3 + 2]];
  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) if (parents[i] >= 0) kids[parents[i]].push(i);
  const points: ContactPoint[] = [], missing: string[] = [];
  const cast = (site: ContactSite, side: Side, bone: number, o: V, d: V, most: number = CONTACT_CAST.most) => {
    const dir = norm(d), hit = castToSkin(pos, tris, o, dir, most * Math.max(0.5, size));
    if (!hit) { missing.push(`${side}.${site}`); return; }
    const [a, b, c] = [tris[hit.tri * 3], tris[hit.tri * 3 + 1], tris[hit.tri * 3 + 2]].map((k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]] as V);
    let nrm = norm(cross(sub(b, a), sub(c, a)));
    // (outward: the way the cast left the bone)
    if (dot(nrm, dir) < 0) nrm = mul(nrm, -1);
    points.push({ site, side, bone, tri: hit.tri, bary: [+hit.bary[0].toFixed(6), +hit.bary[1].toFixed(6), +hit.bary[2].toFixed(6)], depth: +hit.t.toFixed(5), point: r3(add(o, mul(dir, hit.t))), normal: r3(nrm) });
  };
  // ---- the hands
  for (const side of ['L', 'R'] as const) {
    const wrist = side === 'L' ? named.wristL : named.wristR;
    let hand = -1; const queue = [wrist];
    while (queue.length) { const j = queue.shift()!; if (kids[j].length >= 4) { hand = j; break; } queue.push(...kids[j]); }
    if (hand < 0) { missing.push(`${side}.hand`); continue; }
    const chains = kids[hand].map((root) => { const c = [root]; let j = root; while (kids[j].length > 0) { j = kids[j][0]; c.push(j); } return c; });
    const bases = chains.map((c) => J(c[0])), centre = mul(bases.reduce((a, b) => add(a, b), [0, 0, 0] as V), 1 / bases.length);
    const thumbI = bases.reduce((best, b, i) => (len(sub(b, centre)) > len(sub(bases[best], centre)) ? i : best), 0);
    const others = chains.map((c, i) => ({ c, i })).filter((x) => x.i !== thumbI).sort((a, b) => len(sub(J(a.c[0]), bases[thumbI])) - len(sub(J(b.c[0]), bases[thumbI])));
    if (others.length < 2) { missing.push(`${side}.fingers`); continue; }
    const along = norm(sub(centre, J(wrist))), across = norm(sub(J(others[0].c[0]), J(others[others.length - 1].c[0])));
    const sgn = Math.sign(J(wrist)[0]) || 1, palm = norm(mul(cross(along, across), sgn));
    const named5: [FingerName, number[]][] = [['thumb', chains[thumbI]], ...others.slice(0, 4).map((x, k) => [FINGER_NAMES[k + 1], x.c] as [FingerName, number[]])];
    for (const [name, c] of named5) {
      if (c.length < 2) { missing.push(`${side}.${name}`); continue; }
      // its last bone: the joint before its tip, to its tip
      const a = J(c[c.length - 2]), b = J(c[c.length - 1]), dir = norm(sub(b, a));
      const toward = name === 'thumb' ? norm(sub(mul(palm, 0.6), across)) : palm;
      // (the pad faces the way it closes, square to the bone)
      const padWay = norm(sub(toward, mul(dir, dot(toward, dir))));
      cast(`${name}Pad`, side, c[c.length - 2], lerp(a, b, CONTACT_CAST.padAt), padWay);
      cast(`${name}Tip`, side, c[c.length - 2], lerp(a, b, 0.7), dir);
    }
    const knuckles = mul(others.slice(0, 4).map((x) => J(x.c[0])).reduce((p, q) => add(p, q), [0, 0, 0] as V), 1 / Math.min(4, others.length));
    cast('palm', side, hand, lerp(J(hand), knuckles, CONTACT_CAST.palmAt), palm);
    cast('palmHeel', side, hand, lerp(J(wrist), knuckles, CONTACT_CAST.heelOfHandAt), palm);
    // ---- the elbow: straight back
    const elbow = side === 'L' ? named.elbowL : named.elbowR;
    cast('elbow', side, elbow, J(elbow), [0, 0, -1]);
  }
  // ---- the feet and knees
  for (const side of ['L', 'R'] as const) {
    const ankle = side === 'L' ? named.ankleL : named.ankleR, knee = side === 'L' ? named.kneeL : named.kneeR;
    cast('knee', side, knee, J(knee), [0, 0, 1]);
    const toe = kids[ankle][0], toeEnd = toe !== undefined ? (kids[toe][0] ?? toe) : undefined;
    if (toe === undefined || toeEnd === undefined) { missing.push(`${side}.toes`); continue; }
    const A = J(ankle), fwd = norm([J(toeEnd)[0] - A[0], 0, J(toeEnd)[2] - A[2]]);
    cast('heel', side, ankle, sub(A, mul(fwd, CONTACT_CAST.heelBack * size)), [0, -1, 0], CONTACT_CAST.footMost);
    cast('ball', side, toe, J(toe), [0, -1, 0], CONTACT_CAST.footMost);
    cast('toes', side, toe, J(toeEnd), fwd);
  }
  return { points, missing };
}
