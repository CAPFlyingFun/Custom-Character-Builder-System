/**
 * WAVY LOW PONYTAIL: Lena's hair (Joshua, 2026-11-14: "more hairstyles and colors so we can do Lena"; her picture,
 * `docs/reference/lena/lena-look-2026-11-14.png`). Full and wavy, parted off-centre on her LEFT and swept back loosely
 * with volume on top into a LOW ponytail at her nape, a little to her left, tied with a dark elastic; the tail of loose
 * waves comes round her left side and falls forward over her LEFT shoulder (+x) onto her collarbone and upper chest. A
 * long wavy strand is left loose by each side of her face, the one on her right longer, to her jaw.
 *
 * Her colour (black) is the material's: the file carries the copper atlas like every style.
 * Its SHORTEST (`shorter` at 1): the tail ends on top of her shoulder, and the face strands are a little shorter.
 */
import { add, cross, lerp3, mul, smoothstep, sub, unit } from '../vec.mjs';
import { CRANIUM, HAIRLINE, HIS_CRANIUM, HIS_HAIRLINE, onHim } from './ponytail.mjs';

/** Where her part runs, metres to her left of her middle (GAME TUNING, read off her picture). */
const PART_X = 0.028;

export default {
  id: 'wavy-ponytail',
  name: 'Wavy low ponytail',
  build(kit) {
    const rnd = kit.random(20261114);
    // gathered low at her nape, a little to her left (where the tail leaves for her shoulder)
    const his = kit.head.body.id === 'male', P = his ? onHim : (p) => p;
    const f = kit.frame({ centre: his ? HIS_CRANIUM : CRANIUM, gather: [0.30, -0.62, -1], hairline: his ? HIS_HAIRLINE : HAIRLINE });
    // fuller than the ponytail on top and at her sides: loose hair, not pulled tight; the part a darker line where the
    // hair turns away from it
    const partLine = (c) => {
      const s = c.s, onTop = smoothstep(1.62, 1.66, s[1]) * smoothstep(-0.12, -0.04, s[2]);
      return 1 - 0.45 * onTop * Math.exp(-Math.pow((s[0] - PART_X) / 0.0035, 2));
    };
    const capped = kit.cap(f, {
      phiMax: 3.0, crown: [0.12, 0.9, 0.55], crownWidth: 0.75, thick: { base: 0.0085, crown: 0.02, sides: 0.012, gather: 0.008 }, tint: partLine, clear: 0.003,
      ...kit.pick({}, { around: 60, along: 28, shells: [0.005] }),
    });

    // THE SWEEP: loose wavy locks laid over the cap from her part, back and down round her head to the tie, so the top
    // reads as hair swept back loosely and not as a smooth shell
    const hold = (p) => kit.head.keepOff(p, 0.004, 0.025);
    kit.part('sweep', () => {
      const N = kit.pick(26, 8);
      for (let c = 0; c < N; c++) {
        const q = c / (N - 1), side = q < 0.42 ? 1 : -1, a = side > 0 ? q / 0.42 : (q - 0.42) / 0.58;
        // roots along the part (front to crown), falling to her side and round the back to the tie
        const root = [PART_X + side * 0.004, 1.672 - 0.004 * a, 0.0 - 0.07 * a * a];
        const sideX = side > 0 ? 0.074 : -0.078;
        const mid = [sideX * (0.75 + 0.2 * a), 1.635 - 0.02 * a, -0.05 - 0.04 * a];
        const low = [sideX * (0.8 - 0.1 * a), 1.565 - 0.02 * a, -0.115 - 0.02 * a];
        const tieNear = add(f.gatherOnScalp, [0.012 * side, 0.02, 0.01]);
        const lines = kit.waveLine([P(root), P(mid), P(low), tieNear], { samples: 14, amp: (s) => 0.003 * smoothstep(0.1, 0.4, s), turns: 2.2, across: [0, 1, 0], phase: rnd() });
        const seg = kit.pick(22, 9), w = kit.pick(0.026, 0.05) * (0.85 + 0.3 * rnd());
        kit.lock({
          lines, seg, centre: f.C,
          // a soft rise over her forehead from the part, swept back: most lift just behind the part's front
          place: (raw, s) => capped.overHair(raw, 0.0018 + 0.0022 * Math.sin(Math.PI * s) + 0.006 * Math.exp(-Math.pow((s - 0.22) / 0.16, 2)) + 0.0009 * (c % 3), 0.006),
          width: (s) => w * (0.6 + 0.4 * smoothstep(0, 0.15, s)) * (1 - 0.5 * smoothstep(0.75, 1, s)),
          variant: c % 4, crossVariant: (c + 2) % 4, crossFrom: 1, crossTo: 0, hold,
          shade: (s) => 0.98 + 0.1 * Math.sin(Math.PI * s), weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
        });
      }
    });

    // THE TAIL: out of the elastic, round her left side and forward over her left shoulder onto her collarbone and chest.
    // Her picture's tail is WAVES, not a rope (the lead, round 2): about two and a half big soft S-waves down it, each
    // swinging 2 to 2.5 cm side to side, the last curling in at the tip, four to six locks to be told apart in it.
    // on him the elastic is set 3 mm further out: at 1.6 cm two of its points were 1.4 to 1.7 mm under his nape's skin
    // (MEASURED, parts.mjs --body male)
    const TIE_OUT = add(f.gatherOnScalp, mul(f.TIE, his ? 0.019 : 0.016));
    // ON HIM IT FALLS DOWN HIS BACK: carried over his shoulder her way, his wider, higher shoulder stood it off him in a
    // flat slab with its locks apart, and from behind it stuck out sideways (pictured in the room, 2026-11-21). GAME
    // TUNING: his upper back about 2.4 cm further back than hers at 1.40 m (`onHim`'s table), the axis 2.5 cm off it.
    const path = his
      ? [TIE_OUT, add(TIE_OUT, [0.004, -0.030, -0.018]), [0.022, 1.43, -0.245], [0.016, 1.36, -0.250], [0.010, 1.30, -0.245]]
      : [TIE_OUT, ...[[0.078, 1.465, -0.135], [0.124, 1.40, -0.040], [0.112, 1.355, -0.004], [0.100, 1.30, 0.060], [0.092, 1.245, 0.070]].map(P)];
    // fuller in its middle (GAME TUNING to her picture)
    const radiusAt = (s) => (s < 0.15 ? 0.013 + (0.03 - 0.013) * smoothstep(0, 0.15, s) : s < 0.6 ? 0.03 + 0.006 * Math.sin(Math.PI * (s - 0.15) / 0.45) : 0.03 * (1 - 0.65 * smoothstep(0.6, 1.0, s)));
    const tl = kit.tailAxis({
      path, samples: kit.pick(48, 18), radiusAt, upTo: kit.long(1, 0.5), side: his ? [1, 0, 0] : [0, 1, 0], transport: !his, margin: 0.002, reach: 0.09,
      sway: his ? (s) => [0.004 * Math.sin(2 * Math.PI * 1.6 * s) * smoothstep(0.3, 0.7, s), 0, 0] : (s) => [0, 0, 0.004 * Math.sin(2 * Math.PI * 1.6 * s) * smoothstep(0.3, 0.7, s)],
    });
    const headTail = kit.tailWeights(f.gatherOnScalp, 0.05, 0.4, 0.75, 0.25);
    const tailAt = (p, s) => ridesSkin(kit.head, p, headTail(s), s);
    // the core rides what its axis lies on
    kit.tailCore(tl, (s) => tailAt(axisAt(tl, s), s), { radial: kit.pick(12, 8), coreScale: 0.6, tipIn: 0.8, hold: 0.002 });
    wavyLocks(kit, tl, tailAt, rnd, {
      ...kit.pick({ count: 40, locks: 6, seg: 44 }, { count: 10, locks: 3, seg: 16, width: [0.036, 0.02] }),
      wave: kit.long(0.0125, 0.006), waves: kit.long(2.5, 1.4),
    });
    kit.tie(tl, kit.head.weightsNear(f.gatherOnScalp), { R: 0.0125, ...kit.pick({}, { U: 10, V: 5 }) });

    // THE FACE STRANDS: a long wavy strand loose by each side of her face, from her temple's hairline in front of her ear;
    // the one on her right longer, to her jaw
    kit.part('face-strands', () => {
      for (const side of [-1, 1]) {
        const longer = side < 0, n = kit.pick(5, 2);
        for (let c = 0; c < n; c++) {
          const q = c / (n - 1), x = side * (0.060 + 0.006 * q);
          const end = longer ? kit.long(1.445, 1.49) : kit.long(1.49, 1.525);
          const lines = kit.waveLine([
            [side * (PART_X * (side > 0 ? 1.2 : -0.6) + 0.02), 1.664, 0.002 - 0.01 * q], [side * 0.058, 1.642, -0.004 - 0.008 * q],
            [x + side * 0.010, 1.595, -0.004 - 0.01 * q], [x + side * 0.012, 1.55, -0.008 - 0.008 * q], [x + side * 0.006, end, -0.012 - 0.006 * q],
          ].map(P), { samples: 40, amp: (s) => (longer ? 0.011 : 0.009) * smoothstep(0.42, 0.58, s), turns: longer ? 3.8 : 3.4, across: [side, 0, 0.55], phase: rnd() * 0.25 });
          const seg = kit.pick(48, 16), w = kit.pick(0.03, 0.05) * (0.85 + 0.3 * rnd());
          kit.lock({
            lines, seg, centre: f.C,
            place: (raw, s) => capped.overHair(raw, 0.002 + (0.008 + 0.001 * c) * smoothstep(0, 0.3, s), 0.008 + 0.006 * smoothstep(0.2, 0.5, s) + 0.002 * q),
            width: (s) => w * (0.55 + 0.45 * smoothstep(0, 0.12, s)) * (1 - 0.6 * smoothstep(0.65, 1, s)),
            variant: (c + (side > 0 ? 1 : 3)) % 4, crossVariant: (c + 2) % 4, crossFrom: 0.3, crossTo: 0.9, hold,
            weightsAt: (p) => kit.head.weightsNear(capped.capPoint(p)),
          });
        }
      }
    });
    return { report: `tie on her scalp at ${f.gatherOnScalp.map((x) => x.toFixed(3)).join(', ')}; tail ends at ${tl.axis[tl.samples].map((x) => x.toFixed(3)).join(', ')}` };
  },
};

/** The tail's centre at s (0..1 along it). */
function axisAt(tl, s) {
  const fk = Math.min(1, Math.max(0, s)) * tl.samples, k0 = Math.min(tl.samples - 1, Math.floor(fk));
  return lerp3(tl.axis[k0], tl.axis[k0 + 1], fk - k0);
}

/**
 * Where the tail lies on her (her shoulder, collarbone, chest) it rides the skin under it (the lead, round 2: "so the
 * tail moves with the shoulder it lies on"): a point within `RIDE.near` of her takes her skin's weights there, fading
 * to none by `RIDE.far`, and never along its first `RIDE.rootTo` (its roots by the tie stay on her head). GAME TUNING.
 * (A helper the kit could take later: `tailWeights` by place, not only by length.)
 */
const RIDE = { near: 0.012, far: 0.022, share: 0.8, rootTo: 0.22 };
function ridesSkin(head, p, base, s) {
  const near = head.nearest(p, RIDE.far);
  if (!near || s < RIDE.rootTo) return base;
  const t = RIDE.share * (1 - smoothstep(RIDE.near, RIDE.far, near.d)) * smoothstep(RIDE.rootTo, RIDE.rootTo + 0.1, s);
  return t > 0 ? head.blendWeights(base, head.weightsNear(near.q), t) : base;
}

/**
 * THE TAIL'S WAVES (in the style, as the kit's `tailClumps` is a rope's): `count` clumps round the core that wave
 * `waves` times down its length, `wave` metres each side, ALL IN PHASE -- the bundle swings as one S, as her picture's
 * does -- and `locks` wider clumps standing a little off the bundle with their own phase, so separate locks read in it.
 * Every tip curls in toward the core over its last 15%. Weights per point (`weightsAt(p, s)`). (Could move to the kit.)
 */
function wavyLocks(kit, tl, weightsAt, rnd, { count = 40, locks = 6, seg = 44, width = [0.016, 0.014], wave = 0.011, waves = 2.5 } = {}) {
  const head = kit.head;
  kit.part('ponytail-clumps', () => {
    for (let c = 0; c < count + locks; c++) {
      const lock = c >= count, ang0 = (c / (lock ? locks : count)) * 2 * Math.PI + rnd() * 0.5;
      const o = lock ? 1.05 + 0.25 * rnd() : 0.45 + 0.5 * rnd(), w = lock ? width[0] * 1.3 + width[1] * rnd() : width[0] + width[1] * rnd();
      const s0 = 0.02 + 0.06 * rnd(), s1 = lock ? 0.9 + 0.1 * rnd() : 0.82 + 0.18 * rnd();
      const phase = lock ? rnd() : 0.08 * rnd(), amp = wave * (lock ? 0.8 + 0.4 * rnd() : 0.85 + 0.3 * rnd()), twist = (rnd() - 0.5) * 0.6;
      const pts = [], across = [], nrm = [], widths = [], ss = [];
      for (let k = 0; k <= seg; k++) {
        const s = s0 + (s1 - s0) * (k / seg), f = tl.frames[Math.round(s * tl.samples)], centre = axisAt(tl, s);
        const ang = ang0 + twist * s, radial = add(mul(f.side, Math.cos(ang)), mul(f.back, Math.sin(ang)));
        // the S swings the same way for the whole bundle
        const swing = amp * Math.sin(2 * Math.PI * (waves * s + phase)) * smoothstep(0.1, 0.35, s);
        const curl = smoothstep(0.85, 1, (s - s0) / (s1 - s0));
        // across her as she is seen from her front (her x, square to the tail), so the S shows from her front
        const sway = unit(sub([1, 0, 0.3], mul(f.t, f.t[0] + 0.3 * f.t[2])));
        let p = add(centre, add(mul(radial, tl.radiusAt(s) * o * (1 - 0.6 * curl)), mul(sway, swing)));
        // the tip curls in: round toward the core and back up a little
        p = add(p, add(mul(radial, -0.008 * curl), mul(f.t, -0.006 * Math.sin(Math.PI * curl))));
        pts.push(p); nrm.push(radial); ss.push(s);
        widths.push(w * (1 - 0.55 * smoothstep(0.7, 1, (s - s0) / (s1 - s0))) * (0.75 + 0.25 * smoothstep(0, 0.12, s)));
      }
      for (let k = 0; k < pts.length; k++) pts[k] = head.keepOff(pts[k], 0.006, 0.04);
      for (let k = 0; k <= seg; k++) {
        const t = unit(sub(pts[Math.min(seg, k + 1)], pts[Math.max(0, k - 1)]));
        across.push(unit(cross(t, nrm[k])));
      }
      const wts = pts.map((p, k) => weightsAt(p, ss[k]));
      kit.card(pts, across, widths, nrm, c % 4, (s) => (lock ? 0.9 : 0.8) + 0.2 * smoothstep(0, 0.2, s), (s) => wts[Math.round(s * seg)], 0, 1, (p) => head.keepOff(p, 0.003, 0.03));
    }
  });
}
