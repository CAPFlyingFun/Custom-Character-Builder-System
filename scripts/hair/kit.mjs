/**
 * THE HAIR TOOLKIT (Joshua, 2026-11-14: "more hairstyles and colors so we can do Lena and add more of a customizable
 * character, as it's kind of limited hair and face wise to one look... create different hairstyles, hair length and
 * color"). Her first hairstyle was one script (`scripts/sarahV2Recovery/hair-bake.mjs`); these are its parts, made to
 * build any style with:
 *
 *   - THE MESH being built: `vertex`, `part(name, fn)`, and the TEXTURE ATLAS's thirds (`CAP_V`, `SHELL_V`, `CARD_V`,
 *     `cardU`): the cap's opaque strands, the shells' loose strands, four card variants (`texture.mjs` paints them);
 *   - HER HEAD'S FRAME (`frame`): a middle C of her cranium and a direction to GATHER toward (a tie, a bun, the nape);
 *     a hairline as points round her head; the cap's rows run from the gathered end out past the hairline;
 *   - THE CAP AND ITS SHELLS (`cap`): a shell over her scalp, alpha-cut along the hairline, thicker at the crown;
 *   - A TAIL (`tail`): a path held off her, an opaque core and clumps of strand cards round it, waving as they fall;
 *   - A LOCK (`lock`): a strand of cards from a root on her head along guide points, laid over the cap where the cap is
 *     and held off her skin below it, with a second card across the first so it has width from every side;
 *   - A TIE (`tie`): a small dark torus.
 *
 * Skin weights: what lies on her head takes her scalp's (`head.weightsNear`); a tail gives way to her neck and chest
 * down its length (`tailWeights`).
 *
 * LENGTH: a style is built twice by the bake, at `kit.length` 1 (its longest) and 0 (its shortest), and must make the
 * same points in the same order both times; the difference is the `shorter` morph. `kit.long(a, b)` is a when longest,
 * b when shortest. LIGHT: `kit.light` is true for the light file (a fifth of the triangles); `kit.pick(full, light)`.
 *
 * Every builder keeps the first script's arithmetic in the first script's order, so `ponytail` comes out as its file.
 */
import { add, cross, catmull, clamp, dot, len, lerp3, mul, mulberry32, smoothstep, sub, unit } from './vec.mjs';

// THE TEXTURE'S LAYOUT (v down the image, glTF), in thirds: the cap's opaque strands, tiling across; the shells' loose
// strands with alpha, tiling across; four card variants side by side, strands with alpha, root at the top, tips below
export const CAP_V = [0.003, 0.330], SHELL_V = [0.337, 0.663], CARD_V = [0.670, 0.997];
export const cardU = (variant, u) => (variant + 0.04 + 0.92 * clamp(u, 0, 1)) / 4;

export function makeKit(head, { light = false, length = 1 } = {}) {
  const out = { pos: [], nrm: [], uv: [], col: [], joints: [], weights: [], index: [] };
  const parts = {};
  function vertex(p, n, u, v, c, w) {
    const top = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((s, [, x]) => s + x, 0) || 1;
    out.pos.push(...p); out.nrm.push(...unit(n)); out.uv.push(u, v); out.col.push(c[0], c[1], c[2], c[3] ?? 1);
    for (let k = 0; k < 4; k++) { out.joints.push(top[k]?.[0] ?? 0); out.weights.push(top[k] ? top[k][1] / sum : 0); }
    return out.pos.length / 3 - 1;
  }
  function begin(name) { parts[name] = { from: out.index.length / 3, verts: out.pos.length / 3 }; }
  function end(name) { parts[name] = { triangles: out.index.length / 3 - parts[name].from, vertices: out.pos.length / 3 - parts[name].verts }; }
  /** Build a named part (its counts go in the file's extras). */
  function part(name, fn) { begin(name); const r = fn(); end(name); return r; }
  const tri = (a, b, c) => out.index.push(a, b, c);

  /**
   * A card along a path: `points` the centre line, `across` the direction it spreads, `normals` how it is lit; u across,
   * v along. `hold(p)`, if given, moves each edge point (to keep a wide card lying on her out of her).
   */
  function card(points, across, widths, normals, variant, shade, weightsAt, vFrom = 0, vTo = 1, hold = null) {
    const at = hold ?? ((p) => p);
    const n = points.length - 1, left = [], right = [];
    for (let k = 0; k <= n; k++) {
      const s = k / n, v = CARD_V[0] + (CARD_V[1] - CARD_V[0]) * (vFrom + (vTo - vFrom) * s), w = widths[k] / 2, c = shade(s), wt = weightsAt(s);
      left.push(vertex(at(add(points[k], mul(across[k], -w))), normals[k], cardU(variant, 0), v, [c, c, c], wt));
      right.push(vertex(at(add(points[k], mul(across[k], w))), normals[k], cardU(variant, 1), v, [c, c, c], wt));
    }
    for (let k = 0; k < n; k++) out.index.push(left[k], right[k], left[k + 1], right[k], right[k + 1], left[k + 1]);
  }

  // ------------------------------------------------------------------------------------------------------------------
  // HER HEAD'S FRAME

  /**
   * centre: the middle of her cranium; gather: the direction from it toward where the hair is gathered (it is laid on
   * her scalp by a ray); hairline: points near her scalp from her forehead (x 0) round her LEFT side (+x) to her nape
   * (x 0), mirrored for her right -- or `hairlineRight` given for an uneven one.
   */
  function frame({ centre, gather, hairline, hairlineRight = null }) {
    const C = centre;
    const gatherOnScalp = (() => { const d = unit(gather); return add(C, mul(d, head.raycast(C, d))); })();
    const TIE = unit(sub(gatherOnScalp, C));
    const B = unit(sub([0, 1, 0], mul(TIE, TIE[1])));
    const X = cross(B, TIE);
    const dirOf = (theta, phi) => unit(add(mul(TIE, Math.cos(phi)), mul(add(mul(B, Math.cos(theta)), mul(X, Math.sin(theta))), Math.sin(phi))));
    const azEl = (p) => { const q = sub(p, C); return [Math.atan2(q[0], q[2]), Math.asin(clamp(q[1] / len(q), -1, 1))]; };
    // the hairline held as an elevation for each azimuth round her head's upright axis through C (round the gather's
    // axis the line above her ear would run almost along it); between the points a periodic spline
    const hairAz = [];
    for (const p of hairline) { hairAz.push(azEl(p)); if (p[0] !== 0 && !hairlineRight) hairAz.push(azEl([-p[0], p[1], p[2]])); }
    if (hairlineRight) for (const p of hairlineRight) if (p[0] !== 0) hairAz.push(azEl(p));
    hairAz.sort((a, b) => a[0] - b[0]);
    const loop = hairAz.filter((p, i, all) => i === 0 || Math.abs(p[0] - all[i - 1][0]) > 1e-6);
    function hairlineEl(az) {
      const n = loop.length, a = ((az + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      let i = loop.findIndex((p) => p[0] > a); if (i < 0) i = n;
      const at = (k) => { const m = ((k % n) + n) % n, wraps = Math.floor(k / n); return [loop[m][0] + wraps * 2 * Math.PI, loop[m][1]]; };
      const p0 = at(i - 2), p1 = at(i - 1), p2 = at(i), p3 = at(i + 1);
      const t = clamp((a - p1[0]) / (p2[0] - p1[0] || 1), 0, 1), t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    }
    /** How far inside the hairline a point of her scalp is, metres along her scalp (negative outside). */
    const hairMask = (p) => { const [az, el] = azEl(p); return (el - hairlineEl(az)) * len(sub(p, C)); };
    return { C, gatherOnScalp, TIE, B, X, dirOf, hairMask, hairlineEl };
  }

  // ------------------------------------------------------------------------------------------------------------------
  // THE CAP: a grid round the gather, from the gathered end out past the hairline everywhere; what lies outside the
  // hairline fades out through the vertex alpha, so the alpha test cuts the hairline along a smooth curve through the
  // triangles rather than along their edges, and triangles wholly outside it are left out

  /**
   * f: a `frame`. around, along: the grid (GAME TUNING); phi0, phiMax: radians from the gather's axis, the gathered end
   * and well past her forehead's hairline; crown: where the hair stands fullest; thick: { base, crown, sides, gather }
   * metres; clear: hold its drawn points that far off her (0: not looked at); shells: lifts of the loose-strand layers over it (none for a light file); shade(c, base): an extra tint
   * (a parting); hub: close the gathered end.
   */
  function cap(f, {
    around = 120, along = 52, phi0 = 0.21, phiMax = 2.72, crown = unit([0, 1, 0.15]), crownWidth = 0.6,
    thick = { base: 0.0070, crown: 0.0095, sides: 0.0095, gather: 0.011 }, shells = [0.0026, 0.0052], uRepeat = 6, hub = true, tint = null, clear = 0,
  } = {}) {
    const { C } = f, NT = around, NS = along;
    const scalp = [];
    for (let i = 0; i < NT; i++) {
      const theta = (i / NT) * 2 * Math.PI, col = [];
      for (let j = 0; j <= NS; j++) {
        const t = j / NS, phi = phi0 + (phiMax - phi0) * t, d = f.dirOf(theta, phi), r = head.raycast(C, d);
        col.push({ d, r: Number.isFinite(r) ? r : null, t, theta });
      }
      scalp.push(col);
    }
    // a ray that missed takes its neighbours'; one that caught an ear's rim (much further than its neighbours) too
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NT; i++) for (let j = 0; j <= NS; j++) {
      const near = [scalp[(i + NT - 1) % NT][j], scalp[(i + 1) % NT][j], scalp[i][Math.max(0, j - 1)], scalp[i][Math.min(NS, j + 1)]].map((c) => c.r).filter((r) => r !== null).sort((a, b) => a - b);
      const median = near.length ? near[Math.floor(near.length / 2)] : 0.09;
      if (scalp[i][j].r === null || scalp[i][j].r > median + 0.006) scalp[i][j].r = median;
    }
    for (const col of scalp) for (const c of col) { c.s = add(C, mul(c.d, c.r)); c.m = f.hairMask(c.s); }
    function capThickness(c) {
      const crownK = Math.exp(-Math.pow(Math.acos(clamp(dot(c.d, crown), -1, 1)) / crownWidth, 2));
      const sides = Math.exp(-Math.pow((Math.abs(c.d[0]) - 0.85) / 0.25, 2)) * smoothstep(-0.25, 0.15, c.d[1]);
      const gather = 1 - smoothstep(0, 0.16, c.t);
      const taper = smoothstep(-0.002, 0.016, c.m);
      return (thick.base + thick.crown * crownK + thick.sides * sides + thick.gather * gather) * taper + 0.0013;
    }
    const capAlpha = (m) => (m >= 0 ? clamp(0.42 + 0.58 * m / 0.0022, 0, 1) : clamp(0.42 + 0.42 * m / 0.003, 0, 1));
    const tinted = (c, k) => (tint ? k * tint(c) : k);
    // `clear`: a drawn point held that far off her (over an ear its ray passed inside) -- and a shell as far over that
    const held = (p, c, lift = 0) => (clear && c.m > -0.004 ? head.keepOff(p, clear + lift, 0.02) : p);
    part('cap', () => {
      const capIdx = [];
      const capVertex = (c, u) => {
        const p = held(add(C, mul(c.d, c.r + capThickness(c))), c);
        // the roots darker in the gather and at the hairline, as hair is where less light reaches
        const shade = tinted(c, (0.8 + 0.2 * smoothstep(0, 0.2, c.t)) * (1 - 0.25 * (1 - smoothstep(0, 0.012, c.m))));
        return vertex(p, c.d, u, CAP_V[0] + (CAP_V[1] - CAP_V[0]) * c.t, [shade, shade, shade, capAlpha(c.m)], head.weightsNear(c.s));
      };
      for (let i = 0; i <= NT; i++) capIdx.push(scalp[i % NT].map((c) => capVertex(c, (i / NT) * uRepeat)));
      for (let i = 0; i < NT; i++) for (let j = 0; j < NS; j++) {
        const quad = [scalp[i][j], scalp[(i + 1) % NT][j], scalp[i][j + 1], scalp[(i + 1) % NT][j + 1]];
        if (Math.max(...quad.map((c) => c.m)) < -0.004) continue;
        const a = capIdx[i], b = capIdx[i + 1];
        out.index.push(a[j], b[j], a[j + 1], b[j], b[j + 1], a[j + 1]);
      }
      // THE SHELLS: layers over the cap of loose strands with alpha, a few millimetres out, so the surface of her hair
      // has depth and the light catches strands rather than a smooth shell (the way fur is drawn)
      for (const [k, lift] of shells.entries()) {
        const rows = [];
        for (let i = 0; i <= NT; i++) rows.push(scalp[i % NT].map((c) => {
          const p = held(add(C, mul(c.d, c.r + capThickness(c) + lift * smoothstep(-0.002, 0.01, c.m))), c, lift);
          const shade = tinted(c, (0.86 + 0.14 * smoothstep(0, 0.2, c.t)) * (1.0 + 0.06 * k));
          return vertex(p, c.d, (i / NT) * uRepeat + 0.37 * k, SHELL_V[0] + (SHELL_V[1] - SHELL_V[0]) * c.t, [shade, shade, shade, capAlpha(c.m - 0.0015)], head.weightsNear(c.s));
        }));
        for (let i = 0; i < NT; i++) for (let j = 0; j < NS; j++) {
          const quad = [scalp[i][j], scalp[(i + 1) % NT][j], scalp[i][j + 1], scalp[(i + 1) % NT][j + 1]];
          if (Math.max(...quad.map((c) => c.m)) < -0.002 || j < 2) continue;
          out.index.push(rows[i][j], rows[i + 1][j], rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
        }
      }
      if (hub) {
        const ring = capIdx.slice(0, NT).map((r) => r[0]);
        const h = vertex(add(C, mul(f.TIE, scalp[0][0].r + 0.02)), f.TIE, 0.5, CAP_V[0], [0.7, 0.7, 0.7, 1], head.weightsNear(f.gatherOnScalp));
        for (let i = 0; i < NT; i++) out.index.push(h, ring[(i + 1) % NT], ring[i]);
      }
    });
    /** A point laid on her hair where the cap is (just over its surface), held `offSkin` off her skin below the hairline. */
    function overHair(p, lift, offSkin) {
      const d = unit(sub(p, C)), r = head.raycast(C, d);
      if (Number.isFinite(r)) {
        const s0 = add(C, mul(d, r)), m = f.hairMask(s0);
        if (m > -0.004) {
          const t = clamp((Math.acos(clamp(dot(d, f.TIE), -1, 1)) - phi0) / (phiMax - phi0), 0, 1);
          const q = add(C, mul(d, r + capThickness({ d, t, m }) + lift));
          return clear ? head.keepOff(q, clear + lift + 0.002, 0.02) : q;
        }
      }
      return head.keepOff(p, offSkin, 0.06);
    }
    /** The point of her scalp under p (along the ray from C). */
    const capPoint = (p) => { const d = unit(sub(p, C)), r = head.raycast(C, d); return Number.isFinite(r) ? add(C, mul(d, r)) : p; };
    return { scalp, capThickness, overHair, capPoint };
  }

  // ------------------------------------------------------------------------------------------------------------------
  // A TAIL: a path, an opaque core and clumps of cards round it

  /**
   * Its centre line: `path` (Catmull-Rom points, metres) sampled `samples` times, swayed by `sway(s)` ([x, y, z] metres
   * added), each point past `holdFrom` held off her by its radius and `margin`, then smoothed twice. `upTo` cuts the
   * path short (1 its whole; for a shorter length); `side`, `transport`: how its frame is kept. Returns { axis, frames, radiusAt, samples }.
   */
  function tailAxis({ path, samples = 40, radiusAt, sway = () => [0, 0, 0], holdFrom = 0.08, margin = 0.009, reach = 0.08, upTo = 1, side = [1, 0, 0], transport = false }) {
    const axis = [];
    for (let k = 0; k <= samples; k++) {
      const s = k / samples; let p = catmull(path, s * upTo);
      p = add(p, sway(s));
      if (s > holdFrom) p = head.keepOff(p, radiusAt(s) + margin, reach);
      axis.push(p);
    }
    for (let pass = 0; pass < 2; pass++) for (let k = 1; k < axis.length - 1; k++) axis[k] = lerp3(axis[k], lerp3(axis[k - 1], axis[k + 1], 0.5), 0.5);
    const tangentAt = (k) => unit(sub(axis[Math.min(samples, k + 1)], axis[Math.max(0, k - 1)]));
    // a frame along it that does not twist: the side stays her side -- or, for a tail that turns through her side
    // (over a shoulder), `transport`: each frame's side carried on from the last, square to the new tangent
    let frames;
    if (!transport) frames = axis.map((_, k) => { const t = tangentAt(k), sd = unit(sub(side, mul(t, dot(side, t)))), back = cross(t, sd); return { t, side: sd, back }; });
    else {
      frames = []; let sd = side;
      for (let k = 0; k <= samples; k++) { const t = tangentAt(k); sd = unit(sub(sd, mul(t, dot(sd, t)))); frames.push({ t, side: sd, back: cross(t, sd) }); }
    }
    return { axis, frames, radiusAt, samples };
  }
  /** What a tail rides: her scalp's weights at `root`, given way to her neck and chest from `from` to `to` along it. */
  function tailWeights(root, from = 0.1, to = 0.62, chest = 0.55, neck = 0.45) {
    const atRoot = head.weightsNear(root), below = new Map([[head.CHEST, chest], [head.NECK, neck]]);
    return (s) => head.blendWeights(atRoot, below, smoothstep(from, to, s));
  }
  /** The tail's opaque core: a tube at `coreScale` of its radius (drawn in by `tipIn` toward its end, under the clumps), its tip closed. */
  function tailCore(tl, weightsAt, { radial = 12, coreScale = 0.66, tipIn = 0, hold = 0, name = 'ponytail-core' } = {}) {
    part(name, () => {
      const L = tl.samples, rows = [];
      for (let k = 0; k <= L; k++) {
        const s = k / L, f = tl.frames[k], r = tl.radiusAt(s) * coreScale * (tipIn ? 1 - tipIn * smoothstep(0.6, 1, s) : 1), row = [];
        for (let a = 0; a <= radial; a++) {
          const ang = (a / radial) * 2 * Math.PI, n = add(mul(f.side, Math.cos(ang)), mul(f.back, Math.sin(ang)));
          const shade = 0.72 + 0.28 * smoothstep(0, 0.15, s);
          row.push(vertex(hold ? head.keepOff(add(tl.axis[k], mul(n, r)), hold, 0.03) : add(tl.axis[k], mul(n, r)), n, (a / radial) * 2, CAP_V[0] + (CAP_V[1] - CAP_V[0]) * (0.1 + 0.9 * s), [shade, shade, shade], weightsAt(s)));
        }
        rows.push(row);
      }
      for (let k = 0; k < L; k++) for (let a = 0; a < radial; a++) out.index.push(rows[k][a], rows[k][a + 1], rows[k + 1][a], rows[k][a + 1], rows[k + 1][a + 1], rows[k + 1][a]);
      const tip = vertex(add(tl.axis[L], mul(tl.frames[L].t, 0.004)), tl.frames[L].t, 0.5, CAP_V[1], [1, 1, 1], weightsAt(1));
      for (let a = 0; a < radial; a++) out.index.push(rows[L][a], rows[L][a + 1], tip);
    });
  }
  /**
   * The tail's clumps: `count` cards round its core, each at its own angle, waving across its own side (`wave` metres,
   * `waves` turns along the tail), its ends flared. rnd: the style's random, drawn in a fixed order.
   */
  function tailClumps(tl, weightsAt, rnd, {
    count = 44, seg = 26, width = [0.016, 0.014], wave = [0.009, 0.009], waves = 1.45, out01 = [0.55, 0.5], flare = 0.35,
    clear = 0.008, holdEdges = false, name = 'ponytail-clumps',
  } = {}) {
    part(name, () => {
      const L = tl.samples;
      for (let c = 0; c < count; c++) {
        const ang0 = (c / count) * 2 * Math.PI + rnd() * 0.4, o = out01[0] + out01[1] * rnd(), w = width[0] + width[1] * rnd();
        const s0 = 0.02 + 0.06 * rnd(), s1 = 0.84 + 0.16 * rnd(), phase = rnd(), wv = wave[0] + wave[1] * rnd(), twist = (rnd() - 0.5) * 0.9, variant = c % 4;
        const pts = [], across = [], nrm = [], widths = [];
        for (let k = 0; k <= seg; k++) {
          const s = s0 + (s1 - s0) * (k / seg), fk = s * L, k0 = Math.min(L - 1, Math.floor(fk)), ft = fk - k0;
          const centre = lerp3(tl.axis[k0], tl.axis[k0 + 1], ft), f = tl.frames[Math.round(fk)];
          const ang = ang0 + twist * s, radial = add(mul(f.side, Math.cos(ang)), mul(f.back, Math.sin(ang)));
          const tangentialDir = cross(f.t, radial);
          // the loose S of her waves: each clump swings across its own side, more toward the ends
          const swing = wv * Math.sin(2 * Math.PI * (waves * s + phase)) * smoothstep(0.12, 0.55, s);
          // the ends flare a little, as loose waves do
          const p = add(centre, add(mul(radial, tl.radiusAt(s) * o * (1 + flare * smoothstep(0.6, 1, s))), mul(tangentialDir, swing)));
          pts.push(p); across.push(unit(tangentialDir)); nrm.push(radial);
          widths.push(w * (s > 0.75 ? 1 - 0.55 * smoothstep(0.75, 1, s) : 1) * (0.75 + 0.25 * smoothstep(0, 0.12, s)));
        }
        // a clump lying against her is held off her too
        for (let k = 0; k < pts.length; k++) pts[k] = head.keepOff(pts[k], clear, 0.04);
        card(pts, across, widths, nrm, variant, (s) => 0.8 + 0.2 * smoothstep(0, 0.2, s), weightsAt, 0, 1, holdEdges ? (p) => head.keepOff(p, clear * 0.5, 0.03) : null);
      }
    });
  }

  /** A TIE: a small dark torus round the tail's start, dark through its vertex colour. */
  function tie(tl, weights, { R = 0.0135, r = 0.0038, U = 18, V = 8, name = 'elastic' } = {}) {
    part(name, () => {
      const axis = tl.axis, t0 = unit(sub(axis[2], axis[0])), side = unit(sub([1, 0, 0], mul(t0, t0[0]))), back = cross(t0, side);
      const centre = add(axis[0], mul(t0, 0.004)), rows = [];
      for (let a = 0; a <= U; a++) {
        const A = (a / U) * 2 * Math.PI, ring = add(mul(side, Math.cos(A)), mul(back, Math.sin(A))), row = [];
        for (let b = 0; b <= V; b++) {
          const Bv = (b / V) * 2 * Math.PI, n = add(mul(ring, Math.cos(Bv)), mul(t0, Math.sin(Bv)));
          row.push(vertex(add(centre, add(mul(ring, R), mul(n, r))), n, 0.5, CAP_V[0] + 0.3 * (CAP_V[1] - CAP_V[0]), [0.07, 0.07, 0.075], weights));
        }
        rows.push(row);
      }
      for (let a = 0; a < U; a++) for (let b = 0; b < V; b++) out.index.push(rows[a][b], rows[a + 1][b], rows[a][b + 1], rows[a + 1][b], rows[a + 1][b + 1], rows[a][b + 1]);
    });
  }

  /**
   * A LOCK: one strand of hair as cards. `lines` its root and guide points (metres); `seg` its samples; each sample is
   * `place(raw, s)` (usually `capped.overHair` with a lift and a stand-off), lit by her surface under it; smoothed
   * twice; `width(s)` across; a second card across the first from `crossFrom` to `crossTo` of its length (none if
   * crossFrom >= crossTo), `crossWidth` of the first's. `hold(p)`: each point moved after it is smoothed (keep it off her). weightsAt(p): what the point rides (her scalp under it).
   */
  function lock({ lines, seg, place, width, variant, crossVariant, shade = (s) => 1.02 + 0.08 * smoothstep(0, 0.25, s), crossShade = (s) => 1.04 + 0.06 * s,
    crossFrom = 0.22, crossTo = 0.86, crossWidth = 0.62, weightsAt, smooth = 0.4, centre, hold = null }) {
    const pts = [], across = [], nrm = [], widths = [];
    for (let k = 0; k <= seg; k++) {
      const s = k / seg, p = place(catmull(lines, s), s);
      const near = head.nearest(p, 0.06);
      pts.push(p); nrm.push(near ? near.n : unit(sub(p, centre)));
    }
    for (let pass = 0; pass < 2; pass++) for (let k = 1; k < seg; k++) pts[k] = lerp3(pts[k], lerp3(pts[k - 1], pts[k + 1], 0.5), smooth);
    if (hold) for (let k = 0; k <= seg; k++) pts[k] = hold(pts[k]);
    for (let k = 0; k <= seg; k++) {
      const t = unit(sub(pts[Math.min(seg, k + 1)], pts[Math.max(0, k - 1)]));
      across.push(unit(cross(nrm[k], t)));
      widths.push(width(k / seg));
    }
    const wts = (s) => weightsAt(pts[Math.round(s * seg)]);
    card(pts, across, widths, nrm, variant, shade, wts, 0, 1, hold);
    const k0 = Math.round(seg * crossFrom), k1 = Math.round(seg * crossTo), sub2 = (a) => a.slice(k0, k1 + 1);
    if (k1 > k0) {
      const outward = across.map((a, k) => { const t = unit(sub(pts[Math.min(seg, k + 1)], pts[Math.max(0, k - 1)])); return unit(cross(t, a)); });
      card(sub2(pts), sub2(outward), sub2(widths).map((w, k) => w * crossWidth * smoothstep(0, 4, k)), sub2(nrm), crossVariant, crossShade, (s) => wts((k0 + s * (k1 - k0)) / seg), k0 / seg, k1 / seg, hold);
    }
    return pts;
  }

  /**
   * A guide line made wavy: `points` (Catmull-Rom) sampled `samples` times, each moved `amp(s)` metres along `across`
   * by a sine of `turns` waves -- loose waves in a strand of hair. Hand the result to `lock` as its lines.
   */
  function waveLine(points, { samples = 16, amp = () => 0.008, turns = 2, across = [1, 0, 0], phase = 0 } = {}) {
    const res = [];
    for (let k = 0; k <= samples; k++) { const s = k / samples; res.push(add(catmull(points, s), mul(across, amp(s) * Math.sin(2 * Math.PI * (turns * s + phase))))); }
    return res;
  }

  return {
    head, light, waveLine, length, out, parts, vertex, tri, part, card, frame, cap, tailAxis, tailWeights, tailCore, tailClumps, tie, lock,
    random: (seed) => mulberry32(seed),
    pick: (full, lite) => (light ? lite : full),
    long: (a, b) => (length >= 1 ? a : length <= 0 ? b : typeof a === 'number' ? b + (a - b) * length : a.map((x, i) => b[i] + (x - b[i]) * length)),
  };
}
