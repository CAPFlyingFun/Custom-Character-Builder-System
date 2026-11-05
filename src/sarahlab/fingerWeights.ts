/**
 * EACH FINGER'S SKIN WITH ITS OWN BONES (P4, touch & grip; Joshua, 2026-11-05: pressing a button with her index finger;
 * then, of her fingers drawn our own way and still not meeting her hand: "try again the default fingers and fix the
 * weights and stuff. You have experience now").
 *
 * Her file's fingers are rigged by Meshy's auto-rig, which blends every finger with the ones beside it. Read against her
 * bind (the room's probes): at her knuckles a finger's skin is carried only half by its own bones -- her ring finger's a
 * quarter -- the rest by the fingers either side and, at her index finger, by her thumb; and her index fingertip 35-43% by
 * its own bones, 50-58% by her middle finger's. Closed all together the blend hardly shows. One finger moved apart from the
 * others, half its skin stays with them: a pointing finger drawn curled with a spike of skin out of it; a curled finger's
 * first inches dragged off its bones toward its neighbours, so the finger met her hand at an angle; her index knuckle
 * folded when her thumb moved.
 *
 * So the share her fingers (and her thumb) carry of each point of a finger is SHARED OUT AGAIN BY NEARNESS, the way a
 * hand's skin is: each finger, and the thumb, takes as much as it is near, `nearness` power of the inverse distance from
 * the point to its middle line (the split's: actor/fingerSplit.ts), so a point over the middle of a finger is all that
 * finger's, a point in the valley between two knuckles or in the web between two fingers half each, and every point
 * between is between -- smoothly, so no two neighbouring points are torn apart. Each finger's share goes to its bone at
 * the same place along it (knuckle for knuckle; a tip's last bone, which rides the joint before it, to that joint); the
 * thumb's to its own bones as her file had them, or its first. What her hand, wrist and arm carry is left as it is.
 *
 * Past her webbing her fingers are cut apart (fingerSplit.ts): from `across[0]` to `across[1]` the sharing gives way to
 * each finger's skin all its own. And from `along[0]` to `along[1]` its weights along it are eased into an EVEN BEND -- all
 * with the bone a point lies over, over each joint eased from the bone before to the bone after across `bend` either side
 * (her own are as uneven along a finger as across one: a fingertip a third with the joint behind it). From `region` behind
 * the knuckle (on the back of her hand) it is eased in, not begun at once.
 *
 * Each point keeps four bones at most, adding to exactly one. Her body file is untouched: only the weights she is drawn
 * with change, and back again (`apply(0)`).
 */
import * as THREE from 'three';
import { FINGER_SPLIT } from '../actor/fingerSplit';

/** GAME TUNING (metres past a finger's knuckle, along its bones, unless said): where the sharing by nearness gives way to
 * each finger's own; where her weights are eased into an even bend; how far either side of a joint the bend is eased; how
 * sharply nearness decides (a power of the inverse distance); and over where behind the knuckle all this is eased in. */
export const FINGER_WEIGHTS = Object.freeze({ across: [FINGER_SPLIT.web, FINGER_SPLIT.web + 0.012] as const, along: [FINGER_SPLIT.web + 0.012, FINGER_SPLIT.web + 0.032] as const, bend: 0.006, nearness: 4, region: [-0.02, -0.006] as const });

export interface FingerWeights {
  /** hand `share` (0 none .. 1 all) of each finger's skin to its finger; true when anything changed */
  apply(share: number): boolean;
  /** how many of her points it touches at all */
  readonly touched: number;
  /** the points it touches */
  readonly points: readonly number[];
}

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** How far p is along the bent line through `pts` (from its first point), on its nearest piece, and how far from it. */
function along(p: THREE.Vector3, pts: readonly THREE.Vector3[], S: readonly number[]): { s: number; d: number } {
  let least = Infinity, s = 0; const ab = new THREE.Vector3(), ap = new THREE.Vector3();
  for (let k = 0; k + 1 < pts.length; k++) {
    ab.subVectors(pts[k + 1], pts[k]); ap.subVectors(p, pts[k]);
    const L2 = Math.max(1e-12, ab.lengthSq()), t = Math.min(1, Math.max(0, ap.dot(ab) / L2));
    const d = ap.clone().addScaledVector(ab, -t).length();
    if (d < least) { least = d; s = S[k] + t * Math.sqrt(L2); }
  }
  return { s, d: least };
}
const lengthsOf = (pts: readonly THREE.Vector3[]) => { const S = [0]; for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + pts[k].distanceTo(pts[k - 1])); return S; };

type Tuning = { readonly across: readonly [number, number]; readonly along: readonly [number, number]; readonly bend: number; readonly nearness: number; readonly region: readonly [number, number] };

/**
 * For `mesh` (her body): `hands` each hand's fingers but its thumb, each finger the bones (indices in its skeleton) from
 * its knuckle out to its end; `split` (fingerSplit.ts, its fingers numbered across both hands as `hands` lists them) the
 * finger each of her points lies on, how far along it, and each finger's middle line (her rest frame, metres); `thumbs`
 * each hand's thumb, base first; `toRest` takes her geometry to her rest frame (metres). Null when she has no skin
 * weights.
 */
export function createFingerWeights(mesh: THREE.SkinnedMesh, toRest: THREE.Matrix4, hands: readonly (readonly (readonly number[])[])[], split: { readonly owner: Int8Array; readonly past: Float32Array; readonly middles?: readonly (readonly (readonly [number, number, number])[])[] }, F: Tuning = FINGER_WEIGHTS, thumbs: readonly (readonly number[])[] = []): FingerWeights | null {
  const g = mesh.geometry as THREE.BufferGeometry;
  const si = g.getAttribute('skinIndex') as THREE.BufferAttribute | undefined, sw = g.getAttribute('skinWeight') as THREE.BufferAttribute | undefined, pa = g.getAttribute('position');
  if (!si || !sw || !pa || (si as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute || (sw as unknown as { isInterleavedBufferAttribute?: boolean }).isInterleavedBufferAttribute) return null;
  const n = pa.count, bones = mesh.skeleton.bones;
  // a joint's bind place in her rest frame: through her bind matrix into her geometry, then to rest (ankleWeights.ts)
  const bindInv = new THREE.Matrix4().copy(mesh.bindMatrix).invert();
  const jointAt = (b: number) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(mesh.skeleton.boneInverses[b]).invert())).applyMatrix4(toRest);
  // her own weights, as plain numbers, kept to come back to
  const ownI = new Uint16Array(n * 4), ownW = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) { ownI[i * 4 + c] = si.getComponent(i, c); ownW[i * 4 + c] = sw.getComponent(i, c); }
  // each finger bone: its hand, its finger, how far along it (0 its knuckle); each thumb bone its hand
  const placeOf = new Map<number, { hand: number; finger: number; level: number }>(), thumbOf = new Map<number, number>();
  const fingers = hands.flatMap((fs, h) => fs.map((chain, f) => ({ hand: h, finger: f, chain })));
  for (const x of fingers) if (x.chain.length >= 2 && x.chain.every((b) => !!bones[b])) x.chain.forEach((b, level) => placeOf.set(b, { hand: x.hand, finger: x.finger, level }));
  const thumbChains = hands.map((_, h) => (thumbs[h] && thumbs[h].length >= 2 && thumbs[h].every((b) => !!bones[b]) ? thumbs[h] : null));
  thumbChains.forEach((chain, h) => chain?.forEach((b) => { if (!placeOf.has(b)) thumbOf.set(b, h); }));
  const lines = fingers.map((x) => x.chain.map(jointAt)), lengths = lines.map(lengthsOf);
  // (where a finger's middle is: the split's middle line where it found one, else its bones)
  const middles = fingers.map((_, k) => { const m = split.middles?.[k]; return m && m.length >= 2 ? m.map((q) => new THREE.Vector3(q[0], q[1], q[2])) : lines[k]; });
  const middleLengths = middles.map(lengthsOf);
  const thumbLines = thumbChains.map((chain) => (chain ? chain.map(jointAt) : null)), thumbLengths = thumbLines.map((l) => (l ? lengthsOf(l) : null));
  // AN EVEN BEND (her finger `x`'s bones for a point `s` along it)
  const evenly = (x: number, s: number): [number, number][] => {
    const S = lengths[x], chain = fingers[x].chain, last = chain.length - 2;
    const beta = (j: number) => smooth(S[j] - F.bend, S[j] + F.bend, s);
    const out: [number, number][] = [];
    for (let j = 0; j <= last; j++) { const w = (j === 0 ? 1 : beta(j)) - (j < last ? beta(j + 1) : 0); if (w > 1e-6) out.push([chain[j], w]); }
    return out;
  };
  // EACH POINT ON A FINGER: its weights shared out again (what it will be drawn with at a full share)
  type Point = { i: number; target: [number, number][] };
  const points: Point[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const x = split.owner[i];
    if (x < 0 || !fingers[x]) continue;
    const me = fingers[x], h = me.hand;
    // her fingers' and her thumb's share of this point, by how far along each finger; the rest as it is
    const level = [0, 0, 0, 0], thumb = new Map<number, number>(), rest: [number, number][] = [];
    let fingerMass = 0, thumbMass = 0;
    for (let c = 0; c < 4; c++) {
      const b = ownI[i * 4 + c], w = ownW[i * 4 + c];
      if (w <= 0) continue;
      const at = placeOf.get(b);
      if (at && at.hand === h) { level[Math.min(3, at.level)] += w; fingerMass += w; }
      else if (thumbOf.get(b) === h) { thumb.set(b, (thumb.get(b) ?? 0) + w); thumbMass += w; }
      else rest.push([b, w]);
    }
    if (fingerMass + thumbMass <= 0) continue;
    p.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(toRest);
    const L = lines[x], ahead = p.clone().sub(L[0]).dot(L[1].clone().sub(L[0]).normalize());
    const inRegion = smooth(F.region[0], F.region[1], ahead);
    if (inRegion <= 0) continue;
    const past = split.past[i], own = smooth(F.across[0], F.across[1], past), v = smooth(F.along[0], F.along[1], past);
    // HOW NEAR each finger of this hand, and its thumb: shares by inverse distance (to a power), and past the webbing its own
    const near: { k: number; w: number }[] = [];
    fingers.forEach((y, k) => { if (y.hand === h) near.push({ k, w: Math.pow(Math.max(1e-4, along(p, middles[k], middleLengths[k]).d), -F.nearness) }); });
    const tl = thumbLines[h], tLen = thumbLengths[h];
    const tw = tl && tLen ? Math.pow(Math.max(1e-4, along(p, tl, tLen).d), -F.nearness) : 0;
    const total = near.reduce((a, q) => a + q.w, 0) + tw;
    const shareOf = (k: number) => (1 - own) * (near.find((q) => q.k === k)?.w ?? 0) / total + (k === x ? own : 0);
    const thumbShare = (1 - own) * tw / total;
    const sum = new Map<number, number>(), add = (b: number, w: number) => { if (w > 1e-9) sum.set(b, (sum.get(b) ?? 0) + w); };
    for (const [b, w] of rest) add(b, w);
    const mass = fingerMass + thumbMass;
    // (her thumb's part: on its bones as her file had them, or its first)
    const thumbPart = mass * thumbShare;
    if (thumbPart > 0 && thumbChains[h]) { if (thumbMass > 0) for (const [b, w] of thumb) add(b, thumbPart * (w / thumbMass)); else add(thumbChains[h]![1] ?? thumbChains[h]![0], thumbPart); }
    // (the fingers' part: each finger's share on its bones, at the places along it her file's fingers carried this point)
    const fingerPart = mass - thumbPart, levels = fingerMass > 0 ? level.map((m) => m / fingerMass) : [1, 0, 0, 0];
    for (const q of near) {
      const s = shareOf(q.k); if (s <= 0) continue;
      const chain = fingers[q.k].chain, last = chain.length - 2;
      levels.forEach((f, l) => add(chain[Math.min(l, last)], fingerPart * s * f));
    }
    // ALONG: her fingers' share of it eased into this finger's even bend
    if (v > 0) {
      let fm = 0; for (const [b, w] of [...sum]) if (placeOf.get(b)?.hand === h) { fm += w; sum.set(b, w * (1 - v)); }
      for (const [b, w] of evenly(x, along(p, lines[x], lengths[x]).s)) add(b, w * fm * v);
    }
    // eased in from behind the knuckle: her own weights there, these past it
    const target: [number, number][] = [];
    if (inRegion < 1) { const mix = new Map<number, number>(); for (const [b, w] of sum) mix.set(b, w * inRegion); for (let c = 0; c < 4; c++) { const b = ownI[i * 4 + c], w = ownW[i * 4 + c]; if (w > 0) mix.set(b, (mix.get(b) ?? 0) + w * (1 - inRegion)); } target.push(...mix); }
    else target.push(...sum);
    points.push({ i, target });
  }
  let shareNow = 0;
  const I = si.array as ArrayLike<number> & { [k: number]: number }, W = sw.array as ArrayLike<number> & { [k: number]: number };
  const normalized = sw.normalized, scale = normalized ? (W instanceof Uint8Array ? 255 : W instanceof Uint16Array ? 65535 : 1) : 1;
  const put = (i: number, c: number, b: number, w: number) => { I[i * 4 + c] = b; W[i * 4 + c] = normalized && scale > 1 ? Math.round(w * scale) : w; };
  // A POINT'S WEIGHTS ADDING TO ONE EXACTLY: a file that keeps them as whole numbers (out of 255) and a point's rounded each
  // its own way adds to 254 or 256 -- and skinning does not divide by the total, so the point is drawn that much nearer or
  // further from her rig's middle: out at her hands, a metre from it, 4 mm a step, and neighbouring points rounded apart
  // were drawn as shards. So the steps are dealt out by the largest remainders, to add to the whole.
  const putAll = (i: number, entries: readonly (readonly [number, number])[]) => {
    if (!(normalized && scale > 1)) { for (let c = 0; c < 4; c++) { const e = entries[c]; put(i, c, e ? e[0] : 0, e ? e[1] : 0); } return; }
    const steps = entries.map(([, w]) => Math.floor(w * scale)), rest = entries.map(([, w], k) => w * scale - steps[k]);
    let left = scale - steps.reduce((a, b) => a + b, 0);
    for (const k of rest.map((_, k) => k).sort((a, b) => rest[b] - rest[a])) { if (left <= 0) break; steps[k]++; left--; }
    for (let c = 0; c < 4; c++) { const e = entries[c]; I[i * 4 + c] = e ? e[0] : 0; W[i * 4 + c] = e ? steps[c] : 0; }
  };
  return {
    touched: points.length,
    points: points.map((q) => q.i),
    apply(share: number): boolean {
      share = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));
      if (share === shareNow) return false;
      shareNow = share;
      const sum = new Map<number, number>();
      for (const q of points) {
        const i = q.i;
        sum.clear();
        for (let c = 0; c < 4; c++) { const w = ownW[i * 4 + c]; if (w > 0) sum.set(ownI[i * 4 + c], (sum.get(ownI[i * 4 + c]) ?? 0) + w * (1 - share)); }
        for (const [b, w] of q.target) sum.set(b, (sum.get(b) ?? 0) + w * share);
        // (four at most, adding to one)
        const kept = [...sum.entries()].filter(([, w]) => w > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const total = kept.reduce((a, [, w]) => a + w, 0) || 1;
        putAll(i, kept.map(([b, w]) => [b, w / total] as const));
      }
      // (share 0: exactly her own, slot for slot)
      if (share === 0) for (const q of points) for (let c = 0; c < 4; c++) put(q.i, c, ownI[q.i * 4 + c], ownW[q.i * 4 + c]);
      si.needsUpdate = true; sw.needsUpdate = true;
      return true;
    },
  };
}
