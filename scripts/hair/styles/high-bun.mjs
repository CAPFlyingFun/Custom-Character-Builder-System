/**
 * HIGH BUN (Joshua, 2026-11-14: "more hairstyles and colors... create different hairstyles, hair length and color").
 * Her hair pulled up smooth from her hairline all round -- forehead, temples, nape -- into a round knot high on the
 * back of her crown, up and back from the top of her head where a high ponytail's tie would sit. The knot is strands
 * wound round it (cards spiralling over a sphere, over an opaque core, so it reads as coiled hair and not a ball),
 * with a dark elastic at its base that shows only as a hint where the knot leaves her hair. Her ears are bare (the hair
 * is above them). A few fine loose wisps: one in front of each ear and three at her nape.
 *
 * LENGTH is the bun's size: at 1 a big full bun about 9 cm across, at 0 a small neat one about 5 cm. The pulled-up cap
 * is the same at both. Everything follows her head (a bun on her crown does not reach her neck).
 *
 * The kit has no bun builder: `bun` below is local to this style (it could move into the kit as `kit.bun`).
 */
import { add, cross, mul, smoothstep, sub, unit } from '../vec.mjs';
import { CRANIUM, HAIRLINE, HIS_CRANIUM, HIS_HAIRLINE, onHim } from './ponytail.mjs';

/** Up and back from her cranium's middle: where a high ponytail's tie would sit (GAME TUNING; the scalp is found by a ray). */
const GATHER = [0, 0.80, -0.60];
/** The bun's radius, metres: 4.5 cm longest (9 cm across), 2.5 cm shortest (5 cm) (GAME TUNING, Joshua's brief). */
const RADIUS = [0.045, 0.025];
/** How far up its radius the bun's middle stands over the scalp point it grows from: the knot sits ON her, not above her. */
const SEAT = 0.82;

export default {
  id: 'high-bun',
  name: 'High bun',
  build(kit) {
    const rnd = kit.random(20261115);
    const his = kit.head.body.id === 'male', P = his ? onHim : (p) => p;
    const f = kit.frame({ centre: his ? HIS_CRANIUM : CRANIUM, gather: GATHER, hairline: his ? HIS_HAIRLINE : HAIRLINE });
    // the cap's rows run up toward the bun from the nape, the temples and the forehead; phiMax well past the nape
    const capped = kit.cap(f, {
      phiMax: 3.0, thick: { base: 0.0075, crown: 0.0085, sides: 0.0095, gather: 0.011 }, clear: 0.003,
      ...kit.pick({}, { around: 60, along: 28, shells: [0.005] }),
    });

    // ---------------------------------------------------------------------------------------------------------------
    // THE BUN
    const R = kit.long(RADIUS[0], RADIUS[1]), A = f.TIE, B = f.B, X = f.X;
    const base = f.gatherOnScalp, middle = add(base, mul(A, R * SEAT));
    const bunWeights = kit.head.weightsNear(base);
    /** A point on the knot: polar angle th from its outward axis, azimuth ph round it, radius r. */
    const onBun = (th, ph, r) => add(middle, mul(add(mul(A, Math.cos(th)), mul(add(mul(B, Math.cos(ph)), mul(X, Math.sin(ph))), Math.sin(th))), r));
    const outward = (p) => unit(sub(p, middle));

    // its opaque core: a sphere at 0.86 of its radius, so no gap between strands shows her scalp or the sky
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

    // its strands: each winds over the knot from low on it to its top, turning about its axis, half one way and half the
    // other, so the strands cross as coiled hair does; the radius swells and dips along each one so it reads as a coil
    kit.part('bun-coils', () => {
      const N = kit.pick(28, 8), SEG = kit.pick(44, 16);
      for (let c = 0; c < N; c++) {
        const q = c / N, dir = c % 2 === 0 ? 1 : -1;
        const ph0 = q * 2 * Math.PI * 2 + 0.3 * rnd(), turns = (1.15 + 0.5 * rnd()) * dir, th0 = 2.35 + 0.15 * rnd(), th1 = 0.03 + 0.18 * rnd();
        const lift = 1 + 0.012 * (c % 3), w = kit.pick(0.0175, 0.036) * (0.85 + 0.3 * rnd()) * (R / RADIUS[0]) ** 0.5, bulge = 0.05 + 0.03 * rnd(), bph = rnd() * 6.28;
        const pts = [], nrm = [], across = [], widths = [];
        for (let k = 0; k <= SEG; k++) {
          const s = k / SEG, th = th0 + (th1 - th0) * s, ph = ph0 + turns * 2 * Math.PI * s;
          const r = R * lift * (1 + bulge * Math.sin(2 * Math.PI * 2.5 * s + bph) * Math.sin(Math.PI * s));
          // held out of her scalp (the underside sits in her hair)
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

    // THE ELASTIC: a dark ring where the knot leaves her hair, mostly under the strands (a hint of black at the base)
    kit.tie({ axis: [add(base, mul(A, R * 0.2)), add(base, mul(A, R * 0.22)), add(base, mul(A, R * 0.24))] }, bunWeights,
      { R: R * 0.5, r: 0.0042, ...kit.pick({ U: 24, V: 8 }, { U: 12, V: 5 }) });

    // ---------------------------------------------------------------------------------------------------------------
    // THE WISPS: one in front of each ear, three at her nape
    const hold = (p) => kit.head.keepOff(p, 0.004, 0.025);
    const wisp = (raw, { lift = 0.004, off = 0.006, w = 0.011, seg = 12, v = 0 }) => kit.lock({
      lines: raw.map(P), seg: kit.pick(seg * 2, seg), centre: f.C,
      place: (raw, s) => capped.overHair(raw, 0.0015 + lift * smoothstep(0, 0.3, s), off + 0.004 * smoothstep(0.2, 0.6, s)),
      width: (s) => kit.pick(w, w * 2.2) * (0.6 + 0.4 * smoothstep(0, 0.15, s)) * (1 - 0.75 * smoothstep(0.55, 1, s)),
      variant: v % 4, crossVariant: (v + 2) % 4, crossFrom: 0.2, crossTo: 0.8, hold,
      weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
    });
    kit.part('wisps', () => {
      for (const side of [-1, 1]) {
        const j = () => 0.002 * (rnd() - 0.5);
        wisp([[side * 0.067, 1.612, -0.046], [side * 0.069 + j(), 1.585, -0.043], [side * 0.067 + j(), 1.553, -0.040], [side * 0.065 + j(), kit.long(1.520, 1.524), -0.040]], { v: side > 0 ? 1 : 3 });
      }
      for (const [i, x] of [-0.024, 0.004, 0.026].entries()) {
        const j = () => 0.003 * (rnd() - 0.5), y0 = 1.508 - 0.003 * (i % 2);
        wisp([[x, y0 + 0.004, -0.136], [x + j(), y0 - 0.014, -0.141], [x + j(), y0 - 0.034, -0.146], [x + 0.004 * (1 - i), y0 - 0.050 - 0.006 * i, -0.150]], { v: i, w: 0.010, lift: 0.003, off: 0.005 });
      }
    });
    return { report: `bun on her scalp at ${base.map((x) => x.toFixed(3)).join(', ')}; radius ${R.toFixed(3)} m` };
  },
};
