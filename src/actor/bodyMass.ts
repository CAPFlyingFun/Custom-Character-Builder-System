/**
 * HER BALANCE, MEASURED (Trello #273, step 3b; Joshua, 2026-11-08: "keep going step 3"). Where her weight is -- her
 * centre of mass, from her bones -- and what holds it up: the outline of the ground her feet touch, seen from above, and
 * how far inside it her centre of mass falls. A body balances while it falls inside; the margin is how far it could lean
 * before it would have to step.
 *
 * Her weight by body part is de Leva's (1996) for women, each part's share of her mass and where along it its own centre
 * lies; her pregnancy adds the womb and what it holds, by week (Hytten), which is what moves her balance forward. Until
 * the womb itself is built (the skeleton-outward plan's Phase 1), its weight is placed where a womb of that size sits:
 * in front of her spine above her pelvis, higher and further forward as it grows.
 *
 * Pure: no three, no DOM. Points are [x, y, z] with y up; the outline is in x and z, the ground seen from above.
 */

export type P3 = readonly [number, number, number];
export type P2 = readonly [number, number];

/**
 * De Leva (1996), adjusted Zatsiorsky-Seluyanov parameters, WOMEN: each part's share of body mass, and its centre of
 * mass along it from its first end (the top of the head and trunk, the joint nearer the body on a limb), a share of its
 * length. MEASURED (https://wiki.has-motion.com/Adjusted_Zatsiorsky-Seluyanov%27s_segment_inertia_parameters).
 */
export const SEGMENTS_FEMALE = Object.freeze({
  head: Object.freeze({ mass: 0.0668, at: 0.4841 }),
  trunk: Object.freeze({ mass: 0.4257, at: 0.4964 }),
  upperArm: Object.freeze({ mass: 0.0255, at: 0.5754 }),
  forearm: Object.freeze({ mass: 0.0138, at: 0.4559 }),
  hand: Object.freeze({ mass: 0.0056, at: 0.7474 }),
  thigh: Object.freeze({ mass: 0.1478, at: 0.3612 }),
  shank: Object.freeze({ mass: 0.0481, at: 0.4352 }),
  foot: Object.freeze({ mass: 0.0129, at: 0.4014 }),
});

/** Her body's own mass, kg: the ICRP reference woman (163 cm, 60 kg), as the plan's Phase 2 sizes her. MEASURED. */
export const BODY_KG = 60;

/**
 * The womb and what it holds, kg, by week: the fetus, placenta, amniotic fluid and the womb's own growth (Hytten's
 * components of weight gain in pregnancy, as the Institute of Medicine's 2009 report tabulates them: 0.2, 1.1, 3.3 and
 * 5.8 kg at 10, 20, 30 and 40 weeks). MEASURED; between the weeks a straight line, past 40 the same.
 */
export const WOMB_KG_BY_WEEK: readonly (readonly [number, number])[] = Object.freeze([
  [0, 0], [10, 0.195], [20, 1.14], [30, 3.28], [40, 5.82],
].map((r) => Object.freeze(r as [number, number])));

/** The womb and what it holds at `week`, kg. */
export function wombKg(week: number): number {
  const t = WOMB_KG_BY_WEEK, w = Number.isFinite(week) ? Math.max(0, week) : 0;
  for (let i = 1; i < t.length; i++) if (w <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (w - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
  return t[t.length - 1][1];
}

/**
 * Where the womb's weight sits, from the middle of her hips: up and forward, metres, at `week`. BIOLOGICAL SHAPE,
 * approximate until the womb is built: it rises out of the pelvis from about 12 weeks and at term fills the belly from
 * the pubic bone to below the breastbone, its middle about 16 cm above the hips and 13 cm in front of them.
 */
export function wombPlace(week: number): { readonly up: number; readonly forward: number } {
  const s = Math.max(0, Math.min(1, ((Number.isFinite(week) ? week : 0) - 8) / 32));
  return { up: 0.03 + 0.13 * s, forward: 0.04 + 0.09 * s };
}

/** Her body as points, wherever she stands (any units, as long as all agree). Left and right limbs each. */
export interface BodyPoints {
  readonly headTop: P3;
  readonly neck: P3;
  readonly hipL: P3;
  readonly hipR: P3;
  readonly shoulder: readonly [P3, P3];
  readonly elbow: readonly [P3, P3];
  readonly wrist: readonly [P3, P3];
  /** The middle of each hand, where de Leva's hand ends (the third knuckle). */
  readonly handEnd: readonly [P3, P3];
  readonly knee: readonly [P3, P3];
  readonly ankle: readonly [P3, P3];
  /** Each foot's heel and toe tip on the ground. */
  readonly heel: readonly [P3, P3];
  readonly toe: readonly [P3, P3];
}

/** A weight somewhere else on her: kg, and where. */
export interface ExtraMass { readonly kg: number; readonly at: P3 }

const along = (a: P3, b: P3, t: number): P3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Her centre of mass: each part's share at its own centre, and any extra weight (her pregnancy) on top of `bodyKg`. */
export function centreOfMass(b: BodyPoints, bodyKg = BODY_KG, extra: readonly ExtraMass[] = []): P3 {
  const S = SEGMENTS_FEMALE, parts: [number, P3][] = [];
  const hips = along(b.hipL, b.hipR, 0.5);
  parts.push([S.head.mass, along(b.headTop, b.neck, S.head.at)], [S.trunk.mass, along(b.neck, hips, S.trunk.at)]);
  for (const k of [0, 1] as const) {
    parts.push(
      [S.upperArm.mass, along(b.shoulder[k], b.elbow[k], S.upperArm.at)],
      [S.forearm.mass, along(b.elbow[k], b.wrist[k], S.forearm.at)],
      [S.hand.mass, along(b.wrist[k], b.handEnd[k], S.hand.at)],
      [S.thigh.mass, along(k === 0 ? b.hipL : b.hipR, b.knee[k], S.thigh.at)],
      [S.shank.mass, along(b.knee[k], b.ankle[k], S.shank.at)],
      [S.foot.mass, along(b.heel[k], b.toe[k], S.foot.at)],
    );
  }
  let m = 0, x = 0, y = 0, z = 0;
  for (const [share, p] of parts) { const kg = share * bodyKg; m += kg; x += kg * p[0]; y += kg * p[1]; z += kg * p[2]; }
  for (const e of extra) { if (!(e.kg > 0)) continue; m += e.kg; x += e.kg * e.at[0]; y += e.kg * e.at[1]; z += e.kg * e.at[2]; }
  return [x / m, y / m, z / m];
}

/** The outline round points on the ground seen from above (x, z): their convex hull, anticlockwise, no repeats. */
export function supportOutline(points: readonly P2[]): P2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [], upper: P2[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * How far inside the outline `p` falls (x, z): the distance to its nearest edge, positive inside, negative outside. An
 * outline of fewer than three points (a single line of contact) has no inside: the distance from it, negative.
 */
export function balanceMargin(outline: readonly P2[], p: P2): number {
  return balanceAt(outline, p).margin;
}

/** `balanceMargin`, and the point of the outline's edge nearest `p` (null with no outline). */
export function balanceAt(outline: readonly P2[], p: P2): { readonly margin: number; readonly nearest: P2 | null } {
  if (outline.length === 0) return { margin: -Infinity, nearest: null };
  let nearest = Infinity, at: P2 = outline[0], inside = outline.length >= 3;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / l2)) : 0;
    const d = Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ez);
    if (d < nearest) { nearest = d; at = [a[0] + t * ex, a[1] + t * ez]; }
    // anticlockwise: inside is to the left of every edge
    if (outline.length >= 3 && ex * (p[1] - a[1]) - ez * (p[0] - a[0]) < 0) inside = false;
  }
  return { margin: inside ? nearest : -nearest, nearest: at };
}

/** Gravity, m/s². MEASURED (standard gravity). */
export const GRAVITY = 9.80665;

/**
 * Where her balance is heading: her centre of mass carried on by its speed, the way an inverted pendulum of her height
 * carries it -- Hof's extrapolated centre of mass (Hof, Gazendam & Sinke 2005, "The condition for dynamic stability",
 * J Biomech 38:1-8): x + v / w0, w0 = sqrt(g / l), `l` her centre of mass's height over the floor. Standing still it is
 * where her centre of mass is; moving, it is where she must have a foot to stop. Metres and metres a second (x, z).
 */
export function extrapolatedCom(com: P2, velocity: P2, height: number, g = GRAVITY): P2 {
  const w0 = Math.sqrt(g / Math.max(1e-3, height));
  return [com[0] + velocity[0] / w0, com[1] + velocity[1] / w0];
}
