/**
 * BRAID: one thick three-strand plait down the middle of her back (Joshua, 2026-11-14: "create different hairstyles,
 * hair length and color"). Her hair parted in the middle and drawn back smooth from her hairline, a little volume on
 * top, gathered low at the back of her head into ONE braid that hangs down the middle of her back, tied near its tip with
 * a small dark elastic and a short brush of loose hair below the tie. A fine wisp or two is left by each temple. Her ears
 * are BARE: the hair is drawn back above and behind them.
 *
 * The kit has no braid builder, so it is written here (`plait`, it could move into the kit): three ropes whose centre
 * lines weave round the braid's axis -- across her (`SIDE` metres) at one cycle and front to back (`DEPTH`) at two, each
 * strand a third of a cycle after the last -- the figure-of-eight a plait's strands make, so each crosses over the
 * middle in turn. Each rope swells in the middle of each lobe and pinches where it passes under, as a plait's do.
 *
 * LENGTH: 1 its longest, the tip about y 1.20 (mid back); 0 its shortest, ending at the top of her back (about y 1.40).
 * The same points both times: the axis is cut short (`kit.long`) and the same number of crossings is laid closer together.
 */
import { add, cross, mul, smoothstep, sub, unit } from '../vec.mjs';
import { CAP_V } from '../kit.mjs';
import { CRANIUM, HAIRLINE, HIS_CRANIUM, HIS_HAIRLINE, onHim } from './ponytail.mjs';

/** How much of its path the shortest braid keeps (GAME TUNING; MEASURED tip at about y 1.40). */
const SHORTEST = 0.36;
/** Half the braid's width given to the weave across her, and its weave front to back, at its top (GAME TUNING: about 4.4 cm across). */
const SIDE = 0.0115, DEPTH = 0.0060;
/** One rope's radius at the braid's top (GAME TUNING). */
const ROPE = 0.0105;
/** Full cycles of the weave down the braid (GAME TUNING: a crossing about every 2 cm at its longest). */
const CYCLES = 6.5;

export default {
  id: 'braid',
  name: 'Braid',
  build(kit) {
    const rnd = kit.random(20261115);
    // gathered low at the back of her head, in her middle
    const his = kit.head.body.id === 'male', P = his ? onHim : (p) => p;
    // on him the tie sits about 2 cm further forward (his head is shallower behind): the fall is brought in with it so
    // it lies on his nape and upper back (GAME TUNING, by eye on his preview from the side)
    const HIS_TAIL_IN = [0, 0, 0.022];
    const f = kit.frame({ centre: his ? HIS_CRANIUM : CRANIUM, gather: [0, -0.42, -1], hairline: his ? HIS_HAIRLINE : HAIRLINE });
    // smooth and drawn back; a darker line down her middle part
    const partLine = (c) => {
      const s = c.s, onTop = smoothstep(1.62, 1.66, s[1]) * smoothstep(-0.12, -0.04, s[2]);
      return 1 - 0.4 * onTop * Math.exp(-Math.pow(s[0] / 0.003, 2));
    };
    const capped = kit.cap(f, {
      phiMax: 2.85, crown: [0, 1, 0.2], crownWidth: 0.7, thick: { base: 0.0065, crown: 0.0095, sides: 0.006, gather: 0.010 }, tint: partLine, clear: 0.003,
      // a smooth drawn-back top needs less of a grid than loose hair (GAME TUNING: under 30,000 triangles with the plait)
      ...kit.pick({ around: 100, along: 46 }, { around: 60, along: 28, shells: [0.005] }),
    });

    // THE BRAID'S AXIS: out of the gather, down over her nape, along the middle of her back
    const TOP = add(f.gatherOnScalp, mul(f.TIE, 0.012));
    const path = [TOP, add(TOP, [0, -0.04, -0.022]), ...[[0, 1.45, -0.175], [0, 1.37, -0.19], [0, 1.29, -0.19], [0, 1.20, -0.185]].map(his ? (p) => add(onHim(p), HIS_TAIL_IN) : P)];
    const taper = (s) => 1 - 0.42 * smoothstep(0.15, 1, s);
    const grow = (s) => 0.35 + 0.65 * smoothstep(0, 0.07, s);
    const radiusAt = (s) => (SIDE + ROPE) * taper(s) * grow(s);
    const tl = kit.tailAxis({ path, samples: kit.pick(60, 24), radiusAt, upTo: kit.long(1, SHORTEST), margin: 0.004, reach: 0.08, holdFrom: 0.04 });
    const weightsAt = kit.tailWeights(f.gatherOnScalp, 0.08, 0.55);
    const L = tl.samples;
    const at = (s) => {
      const fk = Math.min(L - 1e-9, s * L), k0 = Math.floor(fk), t = fk - k0;
      const a = tl.axis[k0], b = tl.axis[k0 + 1], fa = tl.frames[k0], fb = tl.frames[k0 + 1];
      const lerp = (x, y) => add(mul(x, 1 - t), mul(y, t));
      return { p: lerp(a, b), side: unit(lerp(fa.side, fb.side)), back: unit(lerp(fa.back, fb.back)), t: unit(lerp(fa.t, fb.t)) };
    };

    // THE PLAIT: three ropes round the axis
    const hold = (p) => kit.head.keepOff(p, 0.0025, 0.03);
    kit.part('braid', () => {
      const N = kit.pick(156, 52), R = kit.pick(8, 5), s0 = 0.0, s1 = 0.97;
      for (let k = 0; k < 3; k++) {
        const ph = k / 3, rows = [];
        const centre = [], frames = [];
        for (let i = 0; i <= N; i++) {
          const s = s0 + (s1 - s0) * (i / N), fr = at(s), w = 2 * Math.PI * (CYCLES * s + ph), sc = taper(s) * grow(s);
          const c = add(fr.p, add(mul(fr.side, SIDE * sc * Math.sin(w)), mul(fr.back, DEPTH * sc * Math.sin(2 * w))));
          centre.push(c); frames.push({ fr, w, sc, s });
        }
        for (let i = 0; i <= N; i++) {
          const { fr, w, sc, s } = frames[i];
          const t = unit(sub(centre[Math.min(N, i + 1)], centre[Math.max(0, i - 1)]));
          const u = unit(sub(fr.back, mul(t, fr.back[0] * t[0] + fr.back[1] * t[1] + fr.back[2] * t[2]))), v = cross(t, u);
          // a lobe swells where the rope crosses over the middle and pinches where it passes under
          const r = ROPE * sc * (0.78 + 0.22 * Math.abs(Math.cos(w)));
          const shade = (0.72 + 0.28 * smoothstep(0, 0.08, s)) * (0.86 + 0.14 * (0.5 + 0.5 * Math.cos(2 * w)));
          // the strands' grain runs along the rope, back and forth over each lobe of the cap's strand texture
          const lobe = Math.abs(((CYCLES * 2 * s + ph * 2) % 2) - 1);
          const row = [];
          for (let a = 0; a <= R; a++) {
            const ang = (a / R) * 2 * Math.PI, n = add(mul(u, Math.cos(ang)), mul(v, Math.sin(ang)));
            row.push(kit.vertex(hold(add(centre[i], mul(n, r))), n, (a / R) * 1.5 + 0.31 * k, CAP_V[0] + (CAP_V[1] - CAP_V[0]) * (0.1 + 0.8 * lobe), [shade, shade, shade], weightsAt(s)));
          }
          rows.push(row);
        }
        for (let i = 0; i < N; i++) for (let a = 0; a < R; a++) kit.tri(rows[i][a], rows[i][a + 1], rows[i + 1][a]), kit.tri(rows[i][a + 1], rows[i + 1][a + 1], rows[i + 1][a]);
      }
    });

    // THE TIE AND THE BRUSH BELOW IT: a short tail of loose hair out of a small elastic near the braid's end
    const end = at(0.965);
    const brushPath = [end.p, add(end.p, add(mul(end.t, 0.02), [0, 0, -0.002])), add(end.p, add(mul(end.t, 0.045), [0, 0, -0.004]))];
    const brushR = (s) => (0.010 + 0.004 * smoothstep(0, 0.4, s)) * (1 - 0.6 * smoothstep(0.5, 1, s));
    const bt = kit.tailAxis({ path: brushPath, samples: kit.pick(10, 5), radiusAt: brushR, margin: 0.004, reach: 0.06, holdFrom: 0 });
    const endWeights = weightsAt(1);
    kit.tailCore(bt, () => endWeights, { radial: kit.pick(10, 6), coreScale: 0.6, tipIn: 0.7, hold: 0.002, name: 'brush-core' });
    kit.tailClumps(bt, () => endWeights, rnd, {
      ...kit.pick({ count: 18, seg: 8 }, { count: 6, seg: 4, width: [0.016, 0.008] }),
      width: kit.pick([0.009, 0.006], [0.016, 0.008]), wave: [0.002, 0.002], waves: 0.6, out01: [0.5, 0.4], flare: 0.6, clear: 0.004, holdEdges: true, name: 'brush',
    });
    kit.tie(bt, endWeights, { R: 0.0105, r: 0.0028, ...kit.pick({}, { U: 10, V: 5 }) });

    // THE WISPS: a fine strand or two loose by each temple, in front of her ear
    kit.part('wisps', () => {
      for (const side of [-1, 1]) {
        const n = kit.pick(2, 1);
        for (let c = 0; c < n; c++) {
          const q = n > 1 ? c / (n - 1) : 0.5;
          const lines = kit.waveLine([
            [side * 0.050, 1.648, -0.008 - 0.008 * q], [side * 0.064, 1.615, -0.014 - 0.006 * q], [side * 0.068, 1.575, -0.016 - 0.006 * q],
            [side * 0.066, kit.long(1.535, 1.545) - 0.012 * q, -0.014 - 0.006 * q],
          ].map(P), { samples: 14, amp: (s) => 0.003 * smoothstep(0.3, 0.7, s), turns: 1.8, across: [side, 0, 0.5], phase: rnd() });
          const w = kit.pick(0.008, 0.014) * (0.85 + 0.3 * rnd());
          kit.lock({
            lines, seg: kit.pick(18, 8), centre: f.C,
            place: (raw, s) => capped.overHair(raw, 0.0015 + 0.003 * smoothstep(0, 0.3, s), 0.004 + 0.003 * smoothstep(0.2, 0.6, s)),
            width: (s) => w * (0.6 + 0.4 * smoothstep(0, 0.15, s)) * (1 - 0.7 * smoothstep(0.6, 1, s)),
            variant: (c + (side > 0 ? 1 : 3)) % 4, crossVariant: (c + 2) % 4, crossFrom: 1, crossTo: 0,
            hold: (p) => kit.head.keepOff(p, 0.003, 0.025), weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
          });
        }
      }
    });
    return { report: `gathered on her scalp at ${f.gatherOnScalp.map((x) => x.toFixed(3)).join(', ')}; braid ends at ${tl.axis[L].map((x) => x.toFixed(3)).join(', ')}; brush ends at ${bt.axis[bt.samples].map((x) => x.toFixed(3)).join(', ')}` };
  },
};
