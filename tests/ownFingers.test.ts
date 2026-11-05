/**
 * HER OWN FINGERS (`actor/ownFingers.ts`, Joshua 2026-11-05: "hide the MeshyAI fingers, and instead create your own
 * cylinder fingers... and still use the same bones"). On a small hand of two fingers -- a palm block with two round
 * fingers on it, each of its own skin, along a bent line of bones -- the fingers' skin is taken off past `cut` leaving one
 * clean ring of hers round each, and each finger is made again from its ring: the ring's points copied exactly, the new
 * skin and her drawn skin one closed surface facing out, its weights hers at the ring and its own bones' along it, adding
 * to one; a nail on the back of its last bone; its tip at its tip.
 */
import { describe, expect, it } from 'vitest';
import { OWN_FINGERS, alongFinger, buildFinger, cutFingers, handBack, measureFingers, smoothRings } from '../src/actor/ownFingers';
import type { V3 } from '../src/actor/fingerSplit';

const R = 0.008, AROUND = 20, STEP = 0.002;
/** two fingers, x = ±APART, out along -y from y = 0 (the knuckles) to the tip, the back of the hand toward -z */
const APART = 0.012, LONG = 0.08;
const BACK: V3 = [0, 0, -1];
const LINES: V3[][] = [-APART, APART].map((x) => [[x, 0, 0], [x, -0.04, 0], [x, -0.065, 0.004], [x, -0.08, 0.006]] as V3[]);

/** The hand: each finger a capped tube round its line from y = 0.01 (into the palm) to its tip; a palm block above. */
function hand() {
  const pos: number[] = [], tris: number[] = [], owner: number[] = [], past: number[] = [], bones: number[][] = [], weights: number[][] = [];
  LINES.forEach((line, f) => {
    const start = pos.length / 3, rings = Math.round((LONG + 0.01) / STEP) + 1;
    for (let k = 0; k < rings; k++) {
      const s = -0.01 + k * STEP, c: V3 = s >= 0 ? alongFinger([line[0][0], -s, 0], line).q : [line[0][0], -s, 0];
      for (let j = 0; j < AROUND; j++) {
        const th = (j / AROUND) * Math.PI * 2;
        pos.push(c[0] + R * Math.cos(th), c[1], c[2] + R * Math.sin(th));
        owner.push(f); past.push(Math.max(0, s));
        // (her bones: the finger's first bone near the knuckle, partly the other finger's, as her file's are)
        bones.push([f * 3, (1 - f) * 3, 6, 0]); weights.push([0.6, 0.25, 0.15, 0]);
      }
    }
    for (let k = 0; k + 1 < rings; k++) for (let j = 0; j < AROUND; j++) {
      const a = start + k * AROUND + j, b = start + k * AROUND + ((j + 1) % AROUND), c = a + AROUND, d = b + AROUND;
      tris.push(a, b, c, b, d, c);
    }
    // (capped at both ends)
    const base = pos.length / 3; pos.push(line[0][0], 0.01, 0); owner.push(f); past.push(0); bones.push([6, 0, 0, 0]); weights.push([1, 0, 0, 0]);
    const tipP = pos.length / 3, last = start + (rings - 1) * AROUND, end = alongFinger([line[0][0], -LONG, 0], line).q;
    pos.push(end[0], end[1] - 0.004, end[2]); owner.push(f); past.push(LONG); bones.push([f * 3 + 2, 0, 0, 0]); weights.push([1, 0, 0, 0]);
    for (let j = 0; j < AROUND; j++) { tris.push(base, start + ((j + 1) % AROUND), start + j); tris.push(tipP, last + j, last + ((j + 1) % AROUND)); }
  });
  return { pos: Float32Array.from(pos), tris, owner: Int8Array.from(owner), past: Float32Array.from(past), bones, weights };
}

describe('her own fingers (ownFingers)', () => {
  it('her finger past the cut is taken off, leaving one clean ring round each finger', () => {
    const h = hand(), cut = cutFingers(h.pos, h.tris, h.owner, h.past, 2);
    expect(cut.hidden).toBeGreaterThan(0);
    expect(cut.stray).toBe(0);
    expect(cut.rings.map((r) => r.length)).toEqual([AROUND, AROUND]);
    for (const [f, ring] of cut.rings.entries()) for (const i of ring) { expect(h.owner[i]).toBe(f); expect(h.past[i]).toBeLessThanOrEqual(OWN_FINGERS.cut + 1e-9); }
    // (nothing drawn of hers past the cut)
    for (let t = 0; t < cut.tris.length; t += 3) expect(Math.max(h.past[cut.tris[t]], h.past[cut.tris[t + 1]], h.past[cut.tris[t + 2]])).toBeLessThanOrEqual(OWN_FINGERS.cut + 1e-9);
  });

  it('each finger is made on her ring: her points copied exactly, one closed surface with hers facing out, weights hers at the ring and its own bones out along it', () => {
    const h = hand(), cut = cutFingers(h.pos, h.tris, h.owner, h.past, 2);
    const P = (i: number): V3 => [h.pos[i * 3], h.pos[i * 3 + 1], h.pos[i * 3 + 2]];
    const profiles = measureFingers(h.pos, h.owner, LINES, [BACK, BACK], 0.01);
    for (const [f, ring] of cut.rings.entries()) {
      // (her finger's thickness measured: a round finger, R over and under its bones, give or take a sample)
      expect(profiles[f].top[5]).toBeCloseTo(R, 3); expect(profiles[f].bottom[5]).toBeCloseTo(R, 3);
      const fin = buildFinger({ joints: LINES[f], bones: [f * 3, f * 3 + 1, f * 3 + 2], back: BACK, profile: profiles[f], ring: { pos: ring.map(P), nrm: ring.map(() => [1, 0, 0] as V3), bones: ring.map((i) => h.bones[i]), weights: ring.map((i) => h.weights[i]) } });
      // her ring's points copied exactly, with her weights exactly
      for (let i = 0; i < fin.count; i++) if (fin.copyOf[i] >= 0) {
        const r = ring[fin.copyOf[i]];
        expect([fin.pos[i * 3], fin.pos[i * 3 + 1], fin.pos[i * 3 + 2]]).toEqual(Array.from(P(r)));
        expect(Array.from(fin.weights.subarray(i * 4, i * 4 + 4))).toEqual(h.weights[r].map(Math.fround));
      }
      // every other point's weights add to one; well out along it only its own finger's bones carry it, the bone it lies over
      for (let i = 0; i < fin.count; i++) {
        if (fin.copyOf[i] >= 0) continue;
        const w = Array.from(fin.weights.subarray(i * 4, i * 4 + 4)), b = Array.from(fin.bones.subarray(i * 4, i * 4 + 4));
        expect(w.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 6);
        const s = alongFinger([fin.pos[i * 3], fin.pos[i * 3 + 1], fin.pos[i * 3 + 2]], LINES[f]).s;
        if (s > OWN_FINGERS.cut + OWN_FINGERS.blend + 0.002 && s < 0.04 - OWN_FINGERS.bendBack - 0.001) expect(b.filter((_, c) => w[c] > 1e-6)).toEqual([f * 3]);
        if (s > 0.065 + OWN_FINGERS.bendBack + 0.001) expect(b.filter((_, c) => w[c] > 1e-6)).toEqual([f * 3 + 2]);
      }
      // ONE CLOSED SURFACE: her drawn triangles round the ring and the finger's, each edge once each way round
      const id = (i: number) => (fin.copyOf[i] >= 0 ? ring[fin.copyOf[i]] : 100000 + i), edges = new Map<string, number>();
      const add = (a: number, b: number, c: number) => { for (const [x, y] of [[a, b], [b, c], [c, a]]) edges.set(`${x}>${y}`, (edges.get(`${x}>${y}`) ?? 0) + 1); };
      for (let t = 0; t < cut.tris.length; t += 3) if (h.owner[cut.tris[t]] === f) add(cut.tris[t], cut.tris[t + 1], cut.tris[t + 2]);
      const all = [...fin.skin, ...fin.nail];
      for (let t = 0; t < all.length; t += 3) add(id(all[t]), id(all[t + 1]), id(all[t + 2]));
      for (const [k, n] of edges) { expect(n, k).toBe(1); const [a, b] = k.split('>'); expect(edges.get(`${b}>${a}`), `${k} has its other side`).toBe(1); }
      // facing out: each of the finger's own triangles' normal points away from the line of its bones
      let out = 0, total = 0;
      for (let t = 0; t < all.length; t += 3) {
        const A = all[t], B = all[t + 1], C = all[t + 2], p = (i: number) => [fin.pos[i * 3], fin.pos[i * 3 + 1], fin.pos[i * 3 + 2]] as V3;
        const ab = [0, 1, 2].map((k) => p(B)[k] - p(A)[k]), ac = [0, 1, 2].map((k) => p(C)[k] - p(A)[k]);
        const nn = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        const c: V3 = [0, 1, 2].map((k) => (p(A)[k] + p(B)[k] + p(C)[k]) / 3) as unknown as V3, q = alongFinger(c, LINES[f]).q;
        const away = [0, 1, 2].map((k) => c[k] - q[k]), d = nn[0] * away[0] + nn[1] * away[1] + nn[2] * away[2];
        total++; if (d > 0) out++;
      }
      expect(out / total).toBeGreaterThan(0.97);
      // its nail on the back of its last bone, and its apex at its tip
      expect(fin.nail.length).toBeGreaterThan(0);
      for (const i of fin.nail) { const p: V3 = [fin.pos[i * 3], fin.pos[i * 3 + 1], fin.pos[i * 3 + 2]], a = alongFinger(p, LINES[f]); expect(a.s).toBeGreaterThan(0.065); expect(p[2] - a.q[2]).toBeLessThan(0.002); }
      const apex = fin.count - 1, a = alongFinger([fin.pos[apex * 3], fin.pos[apex * 3 + 1], fin.pos[apex * 3 + 2]], LINES[f]);
      expect(a.s).toBeCloseTo(profiles[f].tip, 3);
      // and nothing not a number
      for (const x of fin.pos) expect(Number.isFinite(x)).toBe(true);
      for (let i = 0; i < fin.count; i++) expect(Math.hypot(fin.nrm[i * 3], fin.nrm[i * 3 + 1], fin.nrm[i * 3 + 2])).toBeCloseTo(1, 5);
    }
  });

  it('her ring is smoothed without turning a triangle of hers over', () => {
    const h = hand();
    // (a saw edge: every other point of each ring pushed back along its finger)
    const cut = cutFingers(h.pos, h.tris, h.owner, h.past, 2), pos = Float32Array.from(h.pos);
    for (const ring of cut.rings) ring.forEach((i, k) => { if (k % 2) pos[i * 3 + 1] += 0.0015; });
    const sm = smoothRings(pos, cut.tris, cut.rings, LINES, [BACK, BACK]);
    expect(sm.index.length).toBeGreaterThan(0);
    const moved = Float32Array.from(pos); for (let k = 0; k < sm.index.length; k++) for (let c = 0; c < 3; c++) moved[sm.index[k] * 3 + c] += sm.delta[k * 3 + c];
    // the saw is flatter: the ring's spread along its finger smaller
    for (const [f, ring] of cut.rings.entries()) {
      const spread = (p: Float32Array) => { const s = ring.map((i) => alongFinger([p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], LINES[f]).s); return Math.max(...s) - Math.min(...s); };
      expect(spread(moved)).toBeLessThan(spread(pos) * 0.5);
    }
    // and no triangle of hers turned over
    for (let t = 0; t < cut.tris.length; t += 3) {
      const n = (p: Float32Array) => { const [a, b, c] = [cut.tris[t], cut.tris[t + 1], cut.tris[t + 2]].map((i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]); const ab = [0, 1, 2].map((k) => b[k] - a[k]), ac = [0, 1, 2].map((k) => c[k] - a[k]); return [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]; };
      const x = n(pos), y = n(moved); expect(x[0] * y[0] + x[1] * y[1] + x[2] * y[2]).toBeGreaterThan(0);
    }
  });

  it('the back of a hand faces away from its palm, on either side of her', () => {
    // her right hand at -x, palm toward her (+x), thumb forward (+z), fingers down: its back faces -x
    const right = handBack([-0.3, 0.1, 0], [[-0.31, 0.03, 0.03], [-0.32, 0.03, 0.01], [-0.32, 0.03, -0.01], [-0.31, 0.03, -0.03]], [-0.29, 0.09, 0.04]);
    expect(right[0]).toBeLessThan(-0.9);
    // and her left, mirrored: +x
    const left = handBack([0.3, 0.1, 0], [[0.31, 0.03, 0.03], [0.32, 0.03, 0.01], [0.32, 0.03, -0.01], [0.31, 0.03, -0.03]], [0.29, 0.09, 0.04]);
    expect(left[0]).toBeGreaterThan(0.9);
  });
});
