/**
 * EACH FINGER'S SKIN ITS OWN (P4, touch & grip; Joshua, 2026-11-05: pressing a button with her index finger).
 *
 * Pointing -- her index finger straight, the others curled back -- her index finger was drawn curled into her fist with
 * a spike of skin out of it to the button. Her bones were right: the index finger's bones lay straight to the button. Her
 * skin was not, for two reasons. Her mesh joins her fingers' sides where they touched as she was modelled -- cut apart now,
 * actor/fingerSplit.ts. And her weights: read against her bind (the room's `touchTest` probe), the tip of her index finger
 * is carried 35-43% by its own bones and 50-58% by her MIDDLE finger's (Meshy's auto-rig blends each finger with the ones
 * beside it). Closed all together, as a fist or round a cup, the blend hardly shows; one finger moved apart from the
 * others, half its skin stays with them.
 *
 * So, once her fingers are cut apart, each finger's skin (the finger fingerSplit says it lies on) is given to that finger
 * alone, in two steps along it:
 * - ACROSS: whatever another finger of her hand carries of a point goes to this finger's bone at the same place along it
 *   (knuckle for knuckle; a tip's last bone, which rides the joint before it, to that joint). None of it before `across[0]`
 *   past the knuckle -- where the cut begins: over her webbing her fingers' skin is one, and shared as a hand's is, and
 *   handed over there it tore the skin between them -- all of it from `across[1]`.
 * - ALONG: her own weights along a finger are as uneven as across one (a fingertip a third with the joint behind it), so
 *   from `along[0]` to `along[1]` they are eased into an even bend -- all with the bone a point lies over, and over each
 *   joint eased from the bone before to the bone after across `bend` either side.
 * Each step keeps a point to the bones it had or its own finger's, four at most, so neighbouring points are never given
 * different bones by which ones happen to be heaviest. The thumb is left as it is. Her body file is untouched: only the
 * weights she is drawn with change, and back again.
 */
import * as THREE from 'three';
import { FINGER_SPLIT } from '../actor/fingerSplit';

/** GAME TUNING (metres past a finger's knuckle, along its bones): where the other fingers' share is handed over; where her
 * own weights are eased into an even bend; how far either side of a joint the bend is eased. */
export const FINGER_WEIGHTS = Object.freeze({ across: [FINGER_SPLIT.web, FINGER_SPLIT.web + 0.012] as const, along: [FINGER_SPLIT.web + 0.012, FINGER_SPLIT.web + 0.032] as const, bend: 0.006 });

export interface FingerWeights {
  /** hand `share` (0 none .. 1 all) of each finger's skin to its finger; true when anything changed */
  apply(share: number): boolean;
  /** how many of her points it touches at all */
  readonly touched: number;
  /** the points it touches */
  readonly points: readonly number[];
}

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** How far p is along the bent line through `pts` (from its first point), on its nearest piece. */
function along(p: THREE.Vector3, pts: readonly THREE.Vector3[], S: readonly number[]): number {
  let least = Infinity, s = 0; const ab = new THREE.Vector3(), ap = new THREE.Vector3();
  for (let k = 0; k + 1 < pts.length; k++) {
    ab.subVectors(pts[k + 1], pts[k]); ap.subVectors(p, pts[k]);
    const L2 = Math.max(1e-12, ab.lengthSq()), t = Math.min(1, Math.max(0, ap.dot(ab) / L2));
    const d = ap.clone().addScaledVector(ab, -t).length();
    if (d < least) { least = d; s = S[k] + t * Math.sqrt(L2); }
  }
  return s;
}

/**
 * For `mesh` (her body): `hands` each hand's fingers but its thumb, each finger the bones (indices in its skeleton) from
 * its knuckle out to its end; `split` (fingerSplit.ts, its fingers numbered across both hands as `hands` lists them) the
 * finger each of her points lies on and how far along it; `toRest` takes her geometry to her rest frame (metres). Null
 * when she has no skin weights.
 */
export function createFingerWeights(mesh: THREE.SkinnedMesh, toRest: THREE.Matrix4, hands: readonly (readonly (readonly number[])[])[], split: { readonly owner: Int8Array; readonly past: Float32Array }, F: { readonly across: readonly [number, number]; readonly along: readonly [number, number]; readonly bend: number } = FINGER_WEIGHTS): FingerWeights | null {
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
  // each finger bone: its hand, its finger, how far along it (0 its knuckle)
  const placeOf = new Map<number, { hand: number; finger: number; level: number }>();
  const fingers = hands.flatMap((fs, h) => fs.map((chain, f) => ({ hand: h, finger: f, chain })));
  for (const x of fingers) if (x.chain.length >= 2 && x.chain.every((b) => !!bones[b])) x.chain.forEach((b, level) => placeOf.set(b, { hand: x.hand, finger: x.finger, level }));
  const lines = fingers.map((x) => x.chain.map(jointAt));
  const lengths = lines.map((pts) => { const S = [0]; for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + pts[k].distanceTo(pts[k - 1])); return S; });
  // AN EVEN BEND (her finger `x`'s bones for a point `s` along it)
  const evenly = (x: number, s: number): [number, number][] => {
    const S = lengths[x], chain = fingers[x].chain, last = chain.length - 2;
    const beta = (j: number) => smooth(S[j] - F.bend, S[j] + F.bend, s);
    const out: [number, number][] = [];
    for (let j = 0; j <= last; j++) { const w = (j === 0 ? 1 : beta(j)) - (j < last ? beta(j + 1) : 0); if (w > 1e-6) out.push([chain[j], w]); }
    return out;
  };
  // each point a finger lies on: its finger, how much of the others' share it takes (`u`) and how evenly it bends (`v`)
  type Point = { i: number; x: number; u: number; v: number; even: [number, number][] };
  const points: Point[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const x = split.owner[i];
    if (x < 0 || !fingers[x]) continue;
    const past = split.past[i], u = smooth(F.across[0], F.across[1], past), v = smooth(F.along[0], F.along[1], past);
    if (u <= 0) continue;
    let any = false;
    for (let c = 0; c < 4; c++) if (ownW[i * 4 + c] > 0 && placeOf.get(ownI[i * 4 + c])?.hand === fingers[x].hand) any = true;
    if (!any) continue;
    p.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(toRest);
    points.push({ i, x, u, v, even: v > 0 ? evenly(x, along(p, lines[x], lengths[x])) : [] });
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
  const sum = new Map<number, number>();
  const add = (b: number, w: number) => { if (w > 0) sum.set(b, (sum.get(b) ?? 0) + w); };
  return {
    touched: points.length,
    points: points.map((q) => q.i),
    apply(share: number): boolean {
      share = Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));
      if (share === shareNow) return false;
      shareNow = share;
      for (const q of points) {
        const i = q.i, me = fingers[q.x], chain = me.chain, last = chain.length - 2, u = q.u * share, v = q.v * share;
        sum.clear();
        // ACROSS: another finger's share to this finger's bone at the same place; its own last bone to the joint it rides
        let mass = 0;
        for (let c = 0; c < 4; c++) {
          const b = ownI[i * 4 + c], w = ownW[i * 4 + c];
          if (w <= 0) continue;
          const at = placeOf.get(b);
          if (!at || at.hand !== me.hand) { add(b, w); continue; }
          mass += w;
          const mine = chain[Math.min(at.level, last)];
          if (at.finger === me.finger) add(mine, w);
          else { add(b, w * (1 - u)); add(mine, w * u); }
        }
        // ALONG: her fingers' share of it eased into this finger's even bend
        if (v > 0) {
          for (const [b, w] of [...sum]) if (placeOf.get(b)?.hand === me.hand) sum.set(b, w * (1 - v));
          for (const [b, w] of q.even) add(b, w * mass * v);
        }
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
