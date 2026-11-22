/**
 * MAN BUN: shoulder-length hair pulled straight back from his hairline and his sides -- no fringe, no curtain -- and
 * gathered into a bun at the back of his crown (higher than a knot at the nape, lower than a top-knot), a dark tie at
 * its base. The sides lie smooth along his scalp to the bun; the cap is the pulled-back hair, its rows running to it.
 *
 * LENGTH is the bun's size: about 8 cm across at the longest, about 4.6 cm at the shortest (the cap is the same at both).
 * Built on HIS head (`--body male`): his head is about 2 cm shallower at the back than hers (the brief, MEASURED).
 * The bun is built here as high-bun.mjs builds hers (the kit has no bun builder).
 */
import { add, cross, mul, smoothstep, sub, unit } from '../vec.mjs';
import { MALE_CRANIUM, MALE_HAIRLINE } from './curly-top.mjs';

/** From his cranium's middle up and back to the back of his crown, where the bun sits (GAME TUNING; on his scalp by a ray). */
const GATHER = [0, 0.55, -0.83];
/** The bun's radius, metres: longest, shortest (GAME TUNING). */
const RADIUS = [0.040, 0.023];
/** How far up its radius the bun's middle stands over the scalp point it grows from (GAME TUNING, as hers). */
const SEAT = 0.82;

export default {
  id: 'man-bun',
  name: 'Man bun',
  build(kit) {
    const rnd = kit.random(20261122);
    const f = kit.frame({ centre: MALE_CRANIUM, gather: GATHER, hairline: MALE_HAIRLINE });
    // the pulled-back cap: smooth and close at his sides (a pulled-back cut lies flat), a little fuller toward the bun
    const capped = kit.cap(f, {
      phiMax: 3.0, thick: { base: 0.006, crown: 0.004, sides: 0.002, gather: 0.010 }, clear: 0.003,
      ...kit.pick({}, { around: 60, along: 28, shells: [0.004] }),
    });

    const R = kit.long(RADIUS[0], RADIUS[1]), A = f.TIE, B = f.B, X = f.X;
    const base = f.gatherOnScalp, middle = add(base, mul(A, R * SEAT));
    const bunWeights = kit.head.weightsNear(base);
    const onBun = (th, ph, r) => add(middle, mul(add(mul(A, Math.cos(th)), mul(add(mul(B, Math.cos(ph)), mul(X, Math.sin(ph))), Math.sin(th))), r));
    const outward = (p) => unit(sub(p, middle));

    // its opaque core, under the strands
    kit.part('bun-core', () => {
      const RINGS = kit.pick(14, 8), AROUND = kit.pick(20, 10), rows = [];
      for (let k = 0; k <= RINGS; k++) {
        const th = Math.PI * (k / RINGS), row = [];
        for (let a = 0; a <= AROUND; a++) {
          const p = kit.head.keepOff(onBun(th, (a / AROUND) * 2 * Math.PI, R * 0.86), 0.002, 0.03);
          row.push(kit.vertex(p, outward(p), (a / AROUND) * 2, 0.003 + 0.327 * (0.1 + 0.9 * (k / RINGS)), [0.9, 0.9, 0.9], bunWeights));
        }
        rows.push(row);
      }
      for (let k = 0; k < RINGS; k++) for (let a = 0; a < AROUND; a++) kit.tri(rows[k][a], rows[k][a + 1], rows[k + 1][a]), kit.tri(rows[k][a + 1], rows[k + 1][a + 1], rows[k + 1][a]);
    });

    // its strands, wound over the knot both ways so they cross as coiled hair does (a man's bun is a looser knot:
    // fewer, wider turns than hers)
    kit.part('bun-coils', () => {
      // SEG 40: at 44 the file was 30,512 triangles, over the 30,000 a style is held to (`tests/hairStyles.test.ts`)
      const N = kit.pick(60, 16), SEG = kit.pick(40, 16);
      for (let c = 0; c < N; c++) {
        const q = c / N, dir = c % 2 === 0 ? 1 : -1;
        const ph0 = q * 2 * Math.PI * 2 + 0.3 * rnd(), turns = (1.2 + 0.5 * rnd()) * dir, th0 = 2.55 + 0.2 * rnd(), th1 = 0.02 + 0.15 * rnd();
        const lift = 1 + 0.02 * (c % 4), w = kit.pick(0.027, 0.05) * (0.85 + 0.3 * rnd()) * (R / RADIUS[0]) ** 0.5, bulge = 0.06 + 0.04 * rnd(), bph = rnd() * 6.28;
        const pts = [], nrm = [], across = [], widths = [];
        for (let k = 0; k <= SEG; k++) {
          const s = k / SEG, th = th0 + (th1 - th0) * s, ph = ph0 + turns * 2 * Math.PI * s;
          const r = R * lift * (1 + bulge * Math.sin(2 * Math.PI * 2 * s + bph) * Math.sin(Math.PI * s));
          pts.push(kit.head.keepOff(onBun(th, ph, r), 0.004, 0.03)); nrm.push(outward(pts[k]));
        }
        for (let k = 0; k <= SEG; k++) {
          const t = unit(sub(pts[Math.min(SEG, k + 1)], pts[Math.max(0, k - 1)]));
          across.push(unit(cross(nrm[k], t)));
          widths.push(w * (0.4 + 0.6 * smoothstep(0, 0.12, k / SEG)) * (1 - 0.7 * smoothstep(0.85, 1, k / SEG)));
        }
        kit.card(pts, across, widths, nrm, c % 4, (s) => 0.92 + 0.1 * Math.sin(Math.PI * s), () => bunWeights, 0, 1, (p) => kit.head.keepOff(p, 0.003, 0.03));
      }
    });

    // ITS OUTER FACE: strands coiled round the bun's axis from its middle outward, so the face seen from behind is
    // wound hair and not the core's plain sphere (GAME TUNING)
    kit.part('bun-wrap', () => {
      const N = kit.pick(18, 6), SEG = kit.pick(40, 14);
      for (let c = 0; c < N; c++) {
        const ph0 = (c / N) * 2 * Math.PI, dir = c % 2 === 0 ? 1 : -1, th1 = 1.45 + 0.25 * rnd();
        const w = kit.pick(0.022, 0.045) * (R / RADIUS[0]) ** 0.5, lift = 1.04 + 0.02 * (c % 3);
        const pts = [], nrm = [], across = [], widths = [];
        for (let k = 0; k <= SEG; k++) {
          const t = k / SEG, th = 0.04 + (th1 - 0.04) * t, ph = ph0 + dir * 2 * Math.PI * 1.4 * t;
          pts.push(kit.head.keepOff(onBun(th, ph, R * lift * (1 + 0.04 * Math.sin(6 * t + c))), 0.004, 0.03)); nrm.push(outward(pts[k]));
        }
        for (let k = 0; k <= SEG; k++) {
          const tg = unit(sub(pts[Math.min(SEG, k + 1)], pts[Math.max(0, k - 1)]));
          across.push(unit(cross(nrm[k], tg)));
          widths.push(w * (0.3 + 0.7 * smoothstep(0, 0.15, k / SEG)) * (1 - 0.6 * smoothstep(0.85, 1, k / SEG)));
        }
        kit.card(pts, across, widths, nrm, (c + 1) % 4, (t) => 0.95 + 0.08 * t, () => bunWeights, 0, 1, (p) => kit.head.keepOff(p, 0.003, 0.03));
      }
    });

    // THE COMBED-BACK LOCKS: long flat locks over the cap from his hairline (forehead, temples, over and behind his
    // ears, nape) back to the bun's base, so the surface reads as hair pulled back into the bun
    const along = (q) => {
      const L = MALE_HAIRLINE, t = q * (L.length - 1), i = Math.min(L.length - 2, Math.floor(t)), u = t - i;
      return L[i].map((x, k) => x + (L[i + 1][k] - x) * u);
    };
    kit.part('combed', () => {
      const PER = kit.pick(30, 9);
      for (const side of [-1, 1]) for (let c = 0; c < PER; c++) {
        const q = (c + 0.5) / PER, h = along(q), root = [side * h[0], h[1], h[2]];
        const toBun = sub(base, root), mid1 = add(root, mul(toBun, 0.35)), mid2 = add(root, mul(toBun, 0.7));
        const end = add(base, mul(unit(sub(root, base)), R * 0.35));
        kit.lock({
          lines: [add(root, mul(unit(toBun), 0.004)), mid1, mid2, end], seg: kit.pick(22, 10), centre: f.C,
          place: (raw, s) => capped.overHair(raw, 0.0015 + 0.002 * smoothstep(0, 0.3, s) + 0.0006 * (c % 3), 0.003),
          width: (s) => kit.pick(0.016, 0.04) * (0.85 + 0.3 * rnd()) * (0.6 + 0.4 * smoothstep(0, 0.12, s)) * (1 - 0.5 * smoothstep(0.8, 1, s)),
          variant: (c + (side > 0 ? 1 : 3)) % 4, crossVariant: (c + 2) % 4, crossFrom: 0.1, crossTo: 0.85,
          weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
          hold: (p) => kit.head.keepOff(p, 0.002, 0.02),
        });
      }
    });

    // the tie: a dark ring where the bun leaves his hair
    kit.tie({ axis: [add(base, mul(A, R * 0.2)), add(base, mul(A, R * 0.22)), add(base, mul(A, R * 0.24))] }, bunWeights,
      { R: R * 0.52, r: 0.0042, ...kit.pick({ U: 24, V: 8 }, { U: 12, V: 5 }) });
    return { report: `bun on his scalp at ${base.map((x) => x.toFixed(3)).join(', ')}; radius ${R.toFixed(3)} m` };
  },
};
