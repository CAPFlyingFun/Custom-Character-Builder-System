/**
 * HER WOMB BY HER WEEKS (the skeleton-outward plan, Phase 1: "Drive the womb from HER WEEKS, the room's existing
 * pregnancy setting, and check its top against the landmarks": its top at the pubic bone at 12 weeks, the navel at 20
 * and the bottom of the breastbone at 36; between 16 and 36 weeks about a centimetre above the pubic bone a week).
 *
 * Built from what it holds, not drawn to a size: its body is as big as its wall and everything in it --
 *  - its wall, 60 g not pregnant to about 1100 g at term,
 *  - each baby at the chart's weight for the week (the room's chart, at BABY WEIGHT),
 *  - each baby's amniotic fluid and placenta, by week --
 * shaped as a womb is by week (a pear not pregnant, almost a sphere by 12 weeks, then longer faster than it is wide),
 * standing on its cervix in the top of her birth canal where her organs were laid (actor/pelvicOrgans.ts) and leaning
 * forward from there, its back kept in front of her spine (src/data/torso/). Its cervix does not grow: it stays 3 cm,
 * closed, until labour opens it.
 *
 * Then measured as a midwife measures it: how high its top stands, and its FUNDAL HEIGHT -- the tape from the top of her
 * pubic bone up over the front of her belly to the womb's top (the womb's front, and the tissue over it).
 *
 * Rest metres (+y up, +z her front, +x across her). Pure: plain arrays.
 */
import { cervixAt, type Cervix } from './birthCanal';
import { CERVIX, UTERUS, intoEllipsoid, lengthOf, subPath, wombHalf, type OrganLayout } from './pelvicOrgans';
import type { P3 } from './pelvisMeasure';

/** What the womb is checked against and leans on: her measured torso (src/data/torso/<rig>.json). */
export interface TorsoLandmarks {
  readonly landmarks: { readonly symphysisTop: readonly number[]; readonly navel: number; readonly xiphoid: readonly number[] };
  /** [height, forward] of the front of her spine, from her promontory up (rest metres) */
  readonly spineFront: readonly (readonly number[])[];
}

/** What a womb holds and weighs by week. */
export const WOMB_GROWTH = Object.freeze({
  /** Its wall: from UTERUS.grams not pregnant to about 1100 g at term, nearly fifteen times as heavy (MEASURED: Williams
   * Obstetrics, "Maternal Physiology"), growing steadily (GAME TUNING: a straight line between them). Its cervix's share
   * of the 60 g stays the cervix's. */
  wallTermG: 1100,
  /** Each baby's placenta: about 500 g at term (MEASURED: https://en.wikipedia.org/wiki/Placenta); before term as the baby's
   * weight to this power -- about half the baby's weight at 20 weeks, a sixth at term (BIOLOGICAL SHAPE). */
  placentaTermG: 500,
  placentaTermBabyG: 3460,
  placentaPower: 0.48,
  /** Each baby's amniotic fluid by week, [week, mL]: 25 at 10, 400 at 20, a plateau of 800 from 28, about 400 by 42.
   * MEASURED (https://en.wikipedia.org/wiki/Amniotic_fluid). */
  fluid: [[4, 0], [10, 25], [20, 400], [28, 800], [38, 800], [42, 400]] as readonly (readonly [number, number])[],
  /** Soft tissue and a baby, g per mL (water 1.0, muscle about 1.06). BIOLOGICAL SHAPE. */
  density: 1.05,
});

/** How a womb is shaped and carried by week. */
export const WOMB_SHAPE = Object.freeze({
  /** Its body's width and depth against its length, [week, across, front to back]: not pregnant UTERUS's body (4.5 and
   * 3.0 cm on its 4.6 cm above the cervix), a pear; "almost spherical by 12 weeks"; then longer faster than wider -- an
   * egg by 20 weeks -- to about 35 x 25 x 22 cm at term. BIOLOGICAL SHAPE (Williams Obstetrics; the term size from
   * obstetric texts), GAME TUNING (how soon after 12 weeks it is an egg: checked against her fundal height). */
  aspect: [[0, 0.98, 0.65], [12, 0.95, 0.88], [20, 0.75, 0.66], [40, 0.71, 0.63]] as readonly (readonly [number, number, number])[],
  /** Where along its body it is widest (0 at the cervix, 1 at its top), [week, share]: high in a pear, a little above
   * the middle in an egg whose top is the wider end. BIOLOGICAL SHAPE. */
  widest: [[0, 0.66], [12, 0.6], [40, 0.58]] as readonly (readonly [number, number])[],
  /** How far forward of upright its long axis leans standing, [week, degrees]: from where her womb was laid not pregnant
   * to the first by its week, once it has risen out of her pelvis against her belly's wall; then a little more upright
   * as it fills her belly up to her ribs. GAME TUNING (until her belly's wall holds it: the belly skin proof), within
   * what a womb does standing (about 20-40 degrees), fitted to her fundal height (a centimetre a week, 20 to 36). */
  lean: [[16, 38], [36, 28]] as readonly (readonly [number, number])[],
  /** Its back this far in front of her spine (the aorta and the vena cava lie there). BIOLOGICAL SHAPE. */
  spineGap: 0.015,
  /** The tissue over its front (skin, fat and muscle) that the fundal height's tape runs over, metres. GAME TUNING (v2's
   * WOMB_TISSUE_M). */
  tissue: 0.01,
  /** Where the tape starts: on her skin over the top of her pubic bone, this far in front of the bone's top (the bone's
   * own front and the fat over it), metres. GAME TUNING (her skeleton has no skin yet). */
  pubisFront: 0.03,
  /** Stations along its body, and over how many of them its rings turn from the cervix's way to its own. GAME TUNING (the mesh). */
  stations: 36,
  turnRings: 4,
  /** How steeply her spine's push on its back eases along it: so much forward per length along. GAME TUNING (a smooth back). */
  bendSlope: 0.5,
});

const lerpTable = <T extends readonly number[]>(t: readonly T[], x: number, col: number): number => {
  if (!(x > t[0][0])) return t[0][col];
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) { const a = t[i - 1], b = t[i], k = (x - a[0]) / (b[0] - a[0]); return a[col] + (b[col] - a[col]) * k; }
  return t[t.length - 1][col];
};

export interface WombContents {
  readonly wallG: number;
  readonly babiesG: number;
  readonly fluidMl: number;
  readonly placentaG: number;
  /** its body's volume, wall and all, mL */
  readonly volumeMl: number;
  /** everything it weighs, cervix too, g */
  readonly totalG: number;
}

/** The cervix's share of the womb's wall, g (it does not grow). */
const CERVIX_G = UTERUS.grams * (CERVIX.length / UTERUS.length);

/** What her womb holds at `week`, each baby weighing what `babyGrams` says (the chart's, at BABY WEIGHT). */
export function wombContents(week: number, babyGrams: readonly number[]): WombContents {
  const G = WOMB_GROWTH, w = Math.max(0, Number.isFinite(week) ? week : 0);
  const wallG = UTERUS.grams + (G.wallTermG - UTERUS.grams) * Math.min(1, w / 40);
  const babiesG = babyGrams.reduce((s, g) => s + Math.max(0, g), 0);
  const fluidMl = babyGrams.length * lerpTable(G.fluid, w, 1);
  const placentaG = babyGrams.reduce((s, g) => s + G.placentaTermG * Math.pow(Math.max(0, g) / G.placentaTermBabyG, G.placentaPower), 0);
  const volumeMl = (wallG - CERVIX_G) / G.density + babiesG / G.density + fluidMl + placentaG / G.density;
  return { wallG, babiesG, fluidMl, placentaG, volumeMl, totalG: wallG + babiesG + fluidMl + placentaG };
}

export interface PregnantWomb {
  /** Its centre line, external os to top, each point's half-sizes [across, front to back] and the way it faces (rest metres). */
  readonly path: readonly P3[];
  readonly halves: readonly (readonly [number, number])[];
  readonly axes: readonly P3[];
  /** its cervix, as BIRTH OPENING has thinned and opened it */
  readonly cervix: Cervix;
  readonly cervixEnds: number;
  readonly length: number;
  readonly week: number;
  readonly contents: WombContents;
  /** its body's length, width and depth as grown, metres */
  readonly size: readonly [number, number, number];
  /** how far forward of upright it leans, degrees */
  readonly leanDeg: number;
  /** its wall's thickness, metres: its volume over its surface */
  readonly wallM: number;
  /** the height of its top, and its fundal height (the tape from her pubic bone's top over its front to its top), metres */
  readonly top: number;
  readonly fundalHeight: number;
}

/** The front of her spine at a height (rest metres): -Infinity below her promontory, where the sacrum falls away behind. */
export function spineFrontAt(torso: TorsoLandmarks, y: number): number {
  const s = torso.spineFront;
  if (!s.length || y < s[0][0]) return -Infinity;
  for (let i = 1; i < s.length; i++) if (y <= s[i][0]) { const a = s[i - 1], b = s[i], k = (y - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; }
  return s[s.length - 1][1];
}

/**
 * Her womb at `week` (a fraction is fine), each of her babies weighing what `babyGrams` says, on her organs as `laid`
 * not pregnant, in front of her spine as `torso` measures it.
 */
export function growWomb(laid: OrganLayout, torso: TorsoLandmarks, week: number, babyGrams: readonly number[], open = 0, shape: typeof WOMB_SHAPE = WOMB_SHAPE): PregnantWomb {
  const S = shape, w = Math.max(0, Number.isFinite(week) ? week : 0), u = laid.uterus;
  const contents = wombContents(w, babyGrams);
  // the cervix as laid: the external os up to the internal os, its last point the body's foot; thinned and opened by
  // BIRTH OPENING (actor/birthCanal.ts): drawn up into the womb from below, and as wide as it is open
  const laidCervix: P3[] = [];
  for (const p of u.path) { laidCervix.push(p); if (lengthOf(laidCervix) >= u.cervixEnds - 1e-9) break; }
  const cervixLength = lengthOf(laidCervix), cw = CERVIX.width / 2, neck = cervixAt(open, cervixLength, cw * 0.92);
  const cervix = subPath(laidCervix, cervixLength - neck.lengthM, cervixLength);
  const os = cervix[cervix.length - 1], fundus = u.path[u.path.length - 1], x = os[0];
  // its body: its proportions and size for the week, from what it holds
  const aw = lerpTable(S.aspect, w, 1), ad = lerpTable(S.aspect, w, 2), c = lerpTable(S.widest, w, 1);
  const L = Math.cbrt((contents.volumeMl * 1e-6 * 6) / (Math.PI * aw * ad)), W = aw * L, D = ad * L;
  // leaning from as it was laid to WOMB_SHAPE.leanDeg
  const laidLean = Math.atan2(fundus[2] - os[2], fundus[1] - os[1]), by = S.lean[0][0];
  const lean = w < by ? laidLean + ((S.lean[0][1] * Math.PI) / 180 - laidLean) * (w / by) : (lerpTable(S.lean, w, 1) * Math.PI) / 180;
  const ay = Math.cos(lean), az = Math.sin(lean), fy = -Math.sin(lean), fz = Math.cos(lean);
  const foot = Math.max(cw, neck.outerM);
  const profile = (t: number) => { const s = (t - c) / (t < c ? c : 1 - c); return Math.sqrt(Math.max(0, 1 - s * s)); };
  const n = S.stations, step = (L / n) * S.bendSlope;
  /** its body's slices at `k` times the width and depth: their middles, moved off her spine, and their half-sizes */
  const lay = (k: number): { moved: P3[]; halves: [number, number][] } => {
    const body: P3[] = [], halves: [number, number][] = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n, p = profile(t), h: [number, number] = [((W * k) / 2) * p, ((D * k) / 2) * p];
      if (t < c) { h[0] = Math.max(h[0], foot); h[1] = Math.max(h[1], foot); }
      body.push([x, os[1] + ay * L * t, os[2] + az * L * t]); halves.push(h);
    }
    // her spine: each slice moved straight forward until its back is clear of it, then the moves eased into one another
    // so the womb bends round her spine rather than kinking (its slices stay square to its long axis)
    const shift = body.map((b, i) => {
      // (the back of a slice, square to the axis: as high as its middle less the lean's share of its depth)
      const by = b[1] - fy * halves[i][1], bz = b[2] - fz * halves[i][1];
      return Math.max(0, spineFrontAt(torso, by) + S.spineGap - bz);
    });
    for (let i = 1; i < n; i++) shift[i] = Math.max(shift[i], shift[i - 1] - step);
    for (let i = n - 2; i >= 0; i--) shift[i] = Math.max(shift[i], shift[i + 1] - step);
    return { moved: body.map((b, i): P3 => [b[0], b[1], b[2] + shift[i]]), halves };
  };
  /** the volume of its body laid so (its slices' areas over how far apart they stand along its axis), m³ */
  const held = (l: { moved: P3[]; halves: [number, number][] }): number => {
    let v = 0, a0 = Math.PI * foot * foot, y0 = os[1], z0 = os[2];
    for (let i = 0; i < n; i++) {
      const [px, py, pz] = l.moved[i], a1 = Math.PI * l.halves[i][0] * l.halves[i][1];
      v += ((a0 + a1) / 2) * Math.abs((py - y0) * ay + (pz - z0) * az); a0 = a1; y0 = py; z0 = pz; void px;
    }
    return v;
  };
  // (moved forward its slices stand closer along its axis where her spine pushes it less above: it is made that much
  // wider and deeper to hold what it holds)
  let scale = 1, laidOut = lay(1);
  for (let pass = 0; pass < 4; pass++) { scale *= Math.sqrt((contents.volumeMl * 1e-6) / Math.max(1e-12, held(laidOut))); laidOut = lay(scale); }
  const { moved, halves } = laidOut;
  const path = [...cervix, ...moved];
  // which way each ring faces: the cervix its own way, the body its long axis (turning to it over its first few rings),
  // kept so however her spine moves it
  const unit = (v: P3): P3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cd = unit([0, os[1] - cervix[0][1], os[2] - cervix[0][2]]), bd: P3 = [0, ay, az];
  const axes: P3[] = [...cervix.map(() => cd), ...moved.map((_, k) => { const f = Math.min(1, (k + 1) / S.turnRings); return unit([0, cd[1] + (bd[1] - cd[1]) * f, cd[2] + (bd[2] - cd[2]) * f]); })];
  const cervixHalves = cervix.map((): [number, number] => [neck.outerM, neck.outerM]);
  const all = [...cervixHalves, ...halves];
  // its wall: what it weighs over the area of its body
  const area = moved.reduce((s, b, k) => {
    if (!k) return s;
    const [a0, b0] = halves[k - 1], [a1, b1] = halves[k], seg = Math.hypot(b[1] - moved[k - 1][1], b[2] - moved[k - 1][2]);
    const ring = (a: number, d: number) => Math.PI * (3 * (a + d) - Math.sqrt((3 * a + d) * (a + 3 * d)));
    return s + ((ring(a0, b0) + ring(a1, b1)) / 2) * Math.hypot(seg, (a1 + b1 - a0 - b0) / 2);
  }, 0);
  const wallM = area > 0 ? ((contents.wallG - CERVIX_G) / WOMB_GROWTH.density) * 1e-6 / area : 0;
  // measured: its top, and the tape from her pubic bone's top up over its front (and the tissue on it) to its top
  const front = moved.map((b, k): [number, number] => [b[1] + fy * (halves[k][1] + S.tissue), b[2] + fz * (halves[k][1] + S.tissue)]);
  const top = Math.max(...moved.map((b, k) => b[1] + Math.abs(fy) * halves[k][1]));
  const fundalHeight = tape([torso.landmarks.symphysisTop[1], torso.landmarks.symphysisTop[2] + S.pubisFront], front);
  return { path, halves: all, axes, cervix: neck, cervixEnds: lengthOf(cervix), length: lengthOf(path), week: w, contents, size: [L, W * scale, D * scale], leanDeg: (lean * 180) / Math.PI, wallM, top, fundalHeight };
}

/**
 * The fundal height's tape: from (height, forward) `from` up over the front of `front` (points [height, forward], her
 * belly's front as the womb holds it out) to its highest point, always over the outside -- what a tape held over her
 * belly would touch (the upper-front hull).
 */
export function tape(from: readonly [number, number], front: readonly (readonly [number, number])[]): number {
  let cur = from, total = 0;
  const highest = front.reduce((m, p) => (p[0] > m[0] ? p : m), front[0]);
  for (let guard = 0; guard < front.length + 1; guard++) {
    if (cur === highest) break;
    // the next point the tape touches: of those higher up, the one it turns to least from straight ahead (most forward)
    let best: readonly [number, number] | null = null, bestAngle = Infinity;
    for (const p of front) {
      if (p[0] <= cur[0] + 1e-9) continue;
      const a = Math.atan2(p[0] - cur[0], p[1] - cur[1]);
      if (a < bestAngle) { bestAngle = a; best = p; }
    }
    if (!best) break;
    total += Math.hypot(best[0] - cur[0], best[1] - cur[1]); cur = best;
  }
  return total;
}

/**
 * Her bladder as her growing womb presses it: lower and flatter, holding the same (wider and deeper as it is pressed
 * flatter), its floor where it was -- as little as keeps the two apart, and no flatter than half itself. BIOLOGICAL SHAPE ("pressed by the growing womb"). An opened
 * birth canal (`canal`) pushes it up and forward out of its way first, as a head coming down does.
 */
export function pressBladder(bladder: OrganLayout['bladder'], uterus: OrganLayout['uterus'], canal?: OrganLayout['vagina']): OrganLayout['bladder'] {
  const half = wombHalf(uterus), path = uterus.path;
  const radii: [number, number, number] = [...bladder.radii];
  let centre: P3 = [...bladder.centre];
  if (canal) {
    const tube = () => [canal.width / 2, canal.depth / 2] as const;
    for (let k = 0; k < 80 && intoEllipsoid(centre, radii, canal.path, tube) < 1; k++) centre = [centre[0], centre[1] + 0.002, centre[2] + 0.0015];
  }
  // flattened under the womb, holding what it holds (wider and deeper as it is pressed flatter), its floor where it was:
  // to half its height at most, and past that moved forward, in front of the womb's lower segment
  const floor = centre[1] - radii[1], least = radii[1] / 2, k = Math.sqrt(0.95);
  for (let i = 0; i < 80 && intoEllipsoid(centre, radii, path, half) < 1; i++) {
    if (radii[1] * 0.95 >= least) { radii[1] *= 0.95; radii[0] /= k; radii[2] /= k; centre = [centre[0], floor + radii[1], centre[2]]; }
    else centre = [centre[0], centre[1], centre[2] + 0.003];
  }
  return { centre, radii, ml: bladder.ml };
}

/** Her organs as laid, with her womb grown (and her bladder pressed by it), and her canal as opened (`canal`). */
export function pregnantLayout(laid: OrganLayout, womb: PregnantWomb, canal: OrganLayout['vagina'] = laid.vagina): OrganLayout {
  const uterus: OrganLayout['uterus'] = { path: womb.path, halves: womb.halves, axes: womb.axes, cervixEnds: womb.cervixEnds, length: womb.length, anteversionDeg: laid.uterus.anteversionDeg };
  return { ...laid, vagina: canal, uterus, bladder: pressBladder(laid.bladder, uterus, canal === laid.vagina ? undefined : canal) };
}

/**
 * Whether a point (rest metres) is inside her grown womb's outer surface: which ring of its body it is level with (along
 * its long axis), and inside that ring's ellipse. Below its body (its cervix) is outside.
 */
export function insideWomb(womb: PregnantWomb, x: number, y: number, z: number): boolean {
  const n = womb.halves.length, body0 = womb.path.length - WOMB_SHAPE.stations - 1;
  const lean = (womb.leanDeg * Math.PI) / 180, ay = Math.cos(lean), az = Math.sin(lean), fy = -az, fz = ay;
  // which two slices it stands between: how far it is along the axis past each slice's middle (each slice is square to
  // the axis; her spine moved them forward, so their middles do not lie on one line)
  const past = (k: number) => (y - womb.path[k][1]) * ay + (z - womb.path[k][2]) * az;
  if (past(body0) < 0 || past(n - 1) > 0) return false;
  let lo = body0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (past(m) >= 0) lo = m; else hi = m; }
  const dl = past(lo), dh = past(hi), u = dl - dh > 0 ? dl / (dl - dh) : 0;
  const a = womb.path[lo], b = womb.path[hi], ha = womb.halves[lo], hb = womb.halves[hi];
  const cy = a[1] + (b[1] - a[1]) * u, cz = a[2] + (b[2] - a[2]) * u, ca = ha[0] + (hb[0] - ha[0]) * u, cb = ha[1] + (hb[1] - ha[1]) * u;
  if (!(ca > 0 && cb > 0)) return false;
  // (in the slice's own plane: across her, and toward its front)
  const across = x - a[0], front = (y - cy) * fy + (z - cz) * fz;
  return (across / ca) ** 2 + (front / cb) ** 2 <= 1;
}

/**
 * The sac inside her grown womb, as the room's baby code holds one (baby.ts WombShape): its middle (halfway up its body,
 * on its line), and how far its lining is from there each way over a grid on the sphere (`rows` polar angles from +y,
 * `cols` round from +z toward +x) -- the womb's surface less its wall.
 */
export function wombSac(womb: PregnantWomb, rows: number, cols: number): { centre: P3; r: Float32Array; axis: P3 } {
  const body0 = womb.path.length - WOMB_SHAPE.stations - 1, mid = womb.path[body0 + Math.round(WOMB_SHAPE.stations / 2)];
  const lean = (womb.leanDeg * Math.PI) / 180, axis: P3 = [0, Math.cos(lean), Math.sin(lean)];
  const r = new Float32Array(rows * cols), reach = womb.size[0];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const th = (Math.PI * i) / (rows - 1), ph = (2 * Math.PI * j) / cols;
    const dx = Math.sin(th) * Math.sin(ph), dy = Math.cos(th), dz = Math.sin(th) * Math.cos(ph);
    const inside = (s: number) => insideWomb(womb, mid[0] + dx * s, mid[1] + dy * s, mid[2] + dz * s);
    // out in small steps to the first point outside, then halved down to the surface
    let lo = 0, hi = 0.002;
    while (hi < reach && inside(hi)) { lo = hi; hi += 0.004; }
    for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; }
    r[i * cols + j] = Math.max(0.002, lo - womb.wallM);
  }
  return { centre: [mid[0], mid[1], mid[2]], r, axis };
}
