/**
 * HER HIPS TURNED, NOT AVERAGED (Joshua, 2026-11-03, of RECLINE as a bed birth: "the same issue I see near the top of
 * the thighs and belly... it looks like the thighs are twisted"; with her texture off the ridge is still there -- her
 * shape, not her skin's picture).
 *
 * The skin across the front of her hip -- from her groin up to her hip bone -- is carried by her thigh and by her body
 * TOGETHER: two or three of her torso's bones at once (Bone_000, Bone_001 and Bone_004, about a third each, measured)
 * and her thigh a fifth to a third. Her skinning moves each point to the AVERAGE of where those bones put it; with her
 * thigh drawn up 90 degrees and let fall open, the average falls short of both and twists between them -- a diagonal
 * ridge down the top of each thigh. The hips' half-turn (birthNormals.ts) cures that only where one torso bone and her
 * thigh share a point, near her groin: most of this skin is never reached.
 *
 * So, as her knees (kneeTurn.ts): each such point is carried by her torso's bones as ONE turn (their own blend, as her
 * skinning has them) and then turned round her hip joint by its thigh's share of the hip's turn -- where her body
 * carries it, then that much of the way round to where her thigh would -- and the move from where her skinning puts it,
 * taken back to her rest shape through its own bones, laid as a shape field with its normal turned the same. Faded in
 * with the hip's bend, so a gentle bend is as it was.
 */
import * as THREE from 'three';
/** Her geometry's units to the metre (her file keeps 1 / 0.89974678). */
const PER_METRE_HERS = 1 / 0.89974678;

export const HIP_TURN_FIELD = 'shape:hipTurn';

/** GAME TUNING: a point is turned when her thigh and her body carry at least `carried` of it and her thigh `least` to
 * `1 - least` of that; faded in from `from` to `full` degrees of the hip's bend */
export const HIP_TURN = Object.freeze({ carried: 0.6, least: 0.02, from: 40, full: 75,
  /** the front of her hip only: none of it `behind` her hip joint, all of it `front` in front of it (metres, her rest
   * frame -- her buttocks behind it keep their own fixes: turned too, they hung under her fuller and rounder) */
  behind: 0.0, front: 0.04 });

/**
 * HER BELLY IS HER BODY'S, NOT HER THIGHS' (Joshua, 2026-11-16, RECLINE and SQUAT at 200%, on the full skin and the
 * light one: "the lower belly shape looks flattened and it appears the womb skin pokes out just a little bit. The
 * underbelly also looks flat squatting"; "maybe because of the leg positions it ends up accidentally pulling the
 * underside of the belly, altering the shape"). It does. MEASURED in the room at 200% in RECLINE (this field's own
 * points, the pairs of neighbours moved most differently): the skin low on the front of her belly -- 13 cm in front
 * of her hip joints at their height on her body file, 36 at 200% -- is carried 0.09 by a THIGH, and at her middle by
 * her left thigh on one point and her right on the next: 35 mm apart once her thighs are drawn up 104 degrees and let
 * fall open. A twentieth of a thigh's turn is nothing a hand from her hip and centimetres at the front of her biggest
 * belly: its underside drawn down and flat, and a line down each side of it.
 *
 * So skin that stands far from a hip joint AS SHE IS SHAPED is carried by her body's bones alone: none of it within
 * `BELLY_HOLD.near` of the joint (her groin and the top of her thigh are her thigh's to move), all of it from `far`
 * (metres), and only skin that is mostly her body's already (`bodyFrom` to `bodyFull` of what the two carry) -- times
 * `hold`: none to her body file's belly, all from `BELLY_HOLD.full` (the room's `bellyHold`). That share of it takes
 * none of the hip's turn either. By where it stands and not by a painted weight: a first build read her belly follow
 * weight, and in SQUAT tore a line along her flank where the paint falls away (MEASURED in the room). GAME TUNING.
 */
export const BELLY_HOLD = Object.freeze({ from: 100, full: 150, near: 0.1, far: 0.22, most: 0.12, mostNone: 0.22, even: 40 });
/** How much of her belly is held to her body at a size of belly (the belly slider's %): 0 to 1. */
export function bellyHold(bumpPercent: number): number { return smoothstep(BELLY_HOLD.from, BELLY_HOLD.full, bumpPercent); }
const BELLY_HOLD_HERS = BELLY_HOLD;

export interface HipTurn {
  /**
   * `turn`: whether her hips are turned (RECLINE); `hold`: how much of her belly is held to her body (0 to 1: `bellyHold`)
   * -- with no turn and no hold there is nothing to lay. `ease` (0: none, as RECLINE has it): the turn eased in from
   * `HIP_TURN.least` of a thigh's share of a point to `ease`, and out the same at the thigh's own end.
   */
  compute(pos: ArrayLike<number>, nrm: ArrayLike<number>, turn?: boolean, hold?: number, ease?: number): { index: Uint32Array; pos: Float32Array; nrm: Float32Array };
  /** what the last compute did: points turned each leg, the hip's bend each leg (degrees), and the furthest any moved (mm) */
  readonly stats: { turned: number[]; bendDeg: number[]; mostMm: number; held?: number[] };
}

/** `hips`: each leg's thigh bone; `legBones`: every bone of her legs (none of them her body's) */
/** `toRest`: her geometry to her rest frame (metres, +z her front) */
/** `opts`: another body's units to the metre (his: `perMetre`) and its own numbers for the hold (`hold`) */
export function createHipTurn(mesh: THREE.SkinnedMesh, hips: readonly number[], legBones: readonly number[], toRest: THREE.Matrix4, opts: { perMetre?: number; hold?: Partial<Record<keyof typeof BELLY_HOLD, number>> } = {}): HipTurn {
  const PER_METRE = opts.perMetre ?? PER_METRE_HERS, BELLY_HOLD = { ...BELLY_HOLD_HERS, ...opts.hold };
  const g = mesh.geometry, pa = g.getAttribute('position'), n = pa.count;
  const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  const bindInv = new THREE.Matrix4().copy(mesh.bindMatrix).invert();
  // (each joint's place in her geometry, through her BIND matrix: see birthContact.ts)
  const jointAt = (b: number) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bindInv, new THREE.Matrix4().copy(mesh.skeleton.boneInverses[b]).invert()));
  const isLeg = new Set(legBones);
  // each hip's points: its thigh carries some, her body some (read again each time: her birth poses reskin her hips)
  const pointsOf = (thigh: number): Int32Array => {
    const pts: number[] = [];
    for (let i = 0; i < n; i++) {
      let wt = 0, wb = 0;
      for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (w <= 0) continue; if (b === thigh) wt += w; else if (!isLeg.has(b)) wb += w; }
      if (wt > 0 && wb > 0) pts.push(i);
    }
    return Int32Array.from(pts);
  };
  const S: THREE.Matrix4[] = mesh.skeleton.bones.map(() => new THREE.Matrix4());
  const Sv = new THREE.Matrix4(), Sb = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const blend = (i: number) => { const el = Sv.elements; el.fill(0); for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w <= 0) continue; const se = S[si.getComponent(i, k)].elements; for (let e = 0; e < 16; e++) el[e] += w * se[e]; } return Sv; };
  /** her body's own bones' blend for a point (normalised to them), into `Sb` */
  const bodyBlend = (i: number) => { const el = Sb.elements; el.fill(0); let sum = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (w <= 0 || isLeg.has(b)) continue; sum += w; const se = S[b].elements; for (let e = 0; e < 16; e++) el[e] += w * se[e]; } if (sum > 0) for (let e = 0; e < 16; e++) el[e] /= sum; return Sb; };
  /**
   * HER BODY'S OWN CARRY OF A POINT A THIGH HAS A SHARE OF, EVENED FROM THE SKIN ROUND IT (for `hold`). Her file keeps
   * four bones a point: where a thigh has a share, one of her body's bones has lost its own, and the point beside it,
   * with no thigh, still has it. Carried by "its body's bones, made up to one", a held point and its neighbour were
   * carried differently once her back curls -- a raised patch with a ragged edge round her navel and a cut along her
   * flank in SQUAT at 200% (MEASURED in the room, a first build). So each such point's body shares are the mean of its
   * neighbours', over and over from the skin no leg carries inward (`BELLY_HOLD.even` times): the same carry either
   * side of where a thigh's share begins. Worked out once, the first time her belly is held.
   */
  let evened: Map<number, Float32Array> | null = null;
  const evenBody = (): Map<number, Float32Array> => {
    if (evened) return evened;
    const ix = g.index!, nb = mesh.skeleton.bones.length, place = new Int32Array(n), byKey = new Map<string, number>();
    for (let i = 0; i < n; i++) { const k = `${pa.getX(i).toFixed(5)},${pa.getY(i).toFixed(5)},${pa.getZ(i).toFixed(5)}`; let p = byKey.get(k); if (p === undefined) { p = byKey.size; byKey.set(k, p); } place[i] = p; }
    const np = byKey.size, first = new Int32Array(np).fill(-1), legged = new Uint8Array(np);
    for (let i = 0; i < n; i++) { const p = place[i]; if (first[p] < 0) first[p] = i; for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > 0 && isLeg.has(si.getComponent(i, k))) legged[p] = 1; }
    const near: Set<number>[] = [];
    for (let t = 0; t < ix.count; t += 3) { const a = place[ix.getX(t)], b = place[ix.getX(t + 1)], c = place[ix.getX(t + 2)]; for (const [u, w] of [[a, b], [b, c], [c, a]]) { if (legged[u]) (near[u] ??= new Set()).add(w); if (legged[w]) (near[w] ??= new Set()).add(u); } }
    const own = (p: number): Float32Array => { const v = new Float32Array(nb), i = first[p]; let sum = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (w > 0 && !isLeg.has(b)) { v[b] += w; sum += w; } } if (sum > 0) for (let b = 0; b < nb; b++) v[b] /= sum; return v; };
    const fixed = new Map<number, Float32Array>(), now = new Map<number, Float32Array>();
    const of = (p: number) => now.get(p) ?? fixed.get(p) ?? (() => { const v = own(p); fixed.set(p, v); return v; })();
    for (let p = 0; p < np; p++) if (legged[p]) now.set(p, own(p));
    for (let round = 0; round < BELLY_HOLD.even; round++) {
      const next = new Map<number, Float32Array>();
      for (const [p] of now) { const ns = near[p]; const v = new Float32Array(nb); let sum = 0; if (ns) for (const q of ns) { const w = of(q); for (let b = 0; b < nb; b++) { v[b] += w[b]; sum += w[b]; } } if (sum > 0) { for (let b = 0; b < nb; b++) v[b] /= sum; next.set(p, v); } else next.set(p, now.get(p)!); }
      for (const [p, v] of next) now.set(p, v);
    }
    evened = new Map(); for (let i = 0; i < n; i++) { const v = now.get(place[i]); if (v) evened.set(i, v); }
    return evened;
  };
  /** that carry for a point, into `Se` (false: it has none, and its own is used) */
  const Se = new THREE.Matrix4();
  const evenBlend = (i: number): boolean => { const v = evenBody().get(i); if (!v) return false; const el = Se.elements; el.fill(0); let sum = 0; for (let b = 0; b < v.length; b++) { const w = v[b]; if (w <= 0) continue; sum += w; const se = S[b].elements; for (let e = 0; e < 16; e++) el[e] += w * se[e]; } return sum > 0; };
  const stats = { turned: [] as number[], bendDeg: [] as number[], mostMm: 0, held: [] as number[] };
  return {
    stats,
    compute(pos, nrm, turn = true, hold = 0, ease = 0) {
      const sk = mesh.skeleton;
      for (let q = 0; q < sk.bones.length; q++) S[q].multiplyMatrices(mesh.bindMatrixInverse, tmp.multiplyMatrices(sk.bones[q].matrixWorld, sk.boneInverses[q])).multiply(mesh.bindMatrix);
      const mInf = mesh.morphTargetInfluences, mPos = g.morphAttributes.position, rel = g.morphTargetsRelative;
      const idx: number[] = [], dp: number[] = [], dn: number[] = [];
      const slot = new Map<number, number>();
      const v = new THREE.Vector3(), pt = new THREE.Vector3(), pl = new THREE.Vector3(), nv = new THREE.Vector3(), q0 = new THREE.Quaternion(), qb = new THREE.Quaternion(), qt = new THREE.Quaternion(), qrel = new THREE.Quaternion();
      const Li = new THREE.Matrix3(), Ni = new THREE.Matrix3(), sc = new THREE.Vector3(), tr = new THREE.Vector3();
      stats.turned = []; stats.bendDeg = []; stats.held = []; let most = 0;
      for (const thigh of hips) {
        const T = S[thigh], pts = pointsOf(thigh), joint = jointAt(thigh), jointP = joint.clone().applyMatrix4(T), jointZ = joint.clone().applyMatrix4(toRest).z, vr = new THREE.Vector3();
        T.decompose(tr, qt, sc);
        let turned = 0, bendSum = 0, bendN = 0, heldN = 0;
        for (let q = 0; q < pts.length; q++) {
          const i = pts[q];
          let wt = 0, wb = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (b === thigh) wt += w; else if (!isLeg.has(b)) wb += w; }
          const c = wt + wb; if (c <= 0) continue;
          const s = wt / c;
          // (how much of this point is her belly's, held to her body: `BELLY_HOLD`)
          v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          if (mInf && mPos) for (let m = 0; m < mPos.length; m++) { const w = mInf[m] ?? 0; if (!w) continue; const ma = mPos[m]; if (rel) v.set(v.x + w * ma.getX(i), v.y + w * ma.getY(i), v.z + w * ma.getZ(i)); else v.set(v.x + w * (ma.getX(i) - pos[i * 3]), v.y + w * (ma.getY(i) - pos[i * 3 + 1]), v.z + w * (ma.getZ(i) - pos[i * 3 + 2])); }
          const held = hold > 0 ? hold * smoothstep(BELLY_HOLD.near * PER_METRE, BELLY_HOLD.far * PER_METRE, v.distanceTo(joint)) * (1 - smoothstep(BELLY_HOLD.most, BELLY_HOLD.mostNone, s)) : 0;
          const turns = turn && c >= HIP_TURN.carried && s >= HIP_TURN.least && s <= 1 - HIP_TURN.least;
          if (held > 0.5) heldN++;
          if (!turns && held <= 0) continue;
          const Bd = bodyBlend(i);
          // (where her skinning puts the part her thigh and body carry: their own average -- by her body's OWN carry)
          pl.copy(v).applyMatrix4(Bd).multiplyScalar(wb / c).add(nv.copy(v).applyMatrix4(T).multiplyScalar(wt / c));
          // (the held share of it carried as the skin round it is: `evenBody`)
          if (held > 0 && evenBlend(i)) { const be = Bd.elements, ee = Se.elements; for (let e = 0; e < 16; e++) be[e] += (ee[e] - be[e]) * held; }
          Bd.decompose(tr, qb, sc); qb.normalize();
          // the hip's own turn as this point's body sees it: from where her body carries it to where her thigh would
          qrel.copy(qt).multiply(qb.clone().invert());
          const bend = (2 * Math.acos(Math.min(1, Math.abs(qrel.w))) * 180) / Math.PI; bendSum += bend; bendN++;
          const turned0 = turns ? smoothstep(HIP_TURN.from, HIP_TURN.full, bend) * smoothstep(jointZ + HIP_TURN.behind, jointZ + HIP_TURN.front, vr.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(toRest).z) * (ease > HIP_TURN.least ? smoothstep(HIP_TURN.least, ease, s) * smoothstep(1 - HIP_TURN.least, 1 - ease, s) : 1) : 0;
          const fade = turned0 + (1 - turned0) * held;
          if (fade <= 0) continue;
          // turned: where her body carries it, then its share of the hip's turn round her hip joint
          q0.identity().slerp(qrel, s * (1 - held));
          pt.copy(v).applyMatrix4(Bd).sub(jointP).applyQuaternion(q0).add(jointP);
          // (only the share they carry is theirs to turn; faded in with the bend)
          pt.sub(pl).multiplyScalar(c * fade);
          const d = pt.length();
          if (d < 1e-6) continue;
          const B = blend(i);
          Li.setFromMatrix4(B).invert();
          pt.applyMatrix3(Li);
          nv.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]).normalize();
          const own = nv.clone();
          nv.applyQuaternion(qb).applyQuaternion(q0);
          Ni.getNormalMatrix(B).invert(); nv.applyMatrix3(Ni).normalize();
          nv.sub(own).multiplyScalar(c * fade);
          const at = slot.get(i);
          if (at === undefined) { slot.set(i, idx.length); idx.push(i); dp.push(pt.x, pt.y, pt.z); dn.push(nv.x, nv.y, nv.z); }
          else { dp[at * 3] += pt.x; dp[at * 3 + 1] += pt.y; dp[at * 3 + 2] += pt.z; dn[at * 3] += nv.x; dn[at * 3 + 1] += nv.y; dn[at * 3 + 2] += nv.z; }
          turned++;
          if (d > most) most = d;
        }
        stats.turned.push(turned); stats.held.push(heldN); stats.bendDeg.push(bendN ? +(bendSum / bendN).toFixed(1) : 0);
      }
      // (mm: her geometry's units are 1/0.89974678 to the metre)
      stats.mostMm = +(most * 0.89974678 * 1000).toFixed(1);
      return { index: Uint32Array.from(idx), pos: Float32Array.from(dp), nrm: Float32Array.from(dn) };
    },
  };
}

function smoothstep(a: number, b: number, v: number): number { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
