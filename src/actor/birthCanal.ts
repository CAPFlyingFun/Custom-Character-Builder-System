/**
 * HER BIRTH OPENING AND HER BABY'S WAY OUT (the skeleton-outward plan, Phase 1: "Open the cervix and canal with the
 * room's BIRTH OPENING slider, and check the baby's path against the pelvic diameters").
 *
 * THE CERVIX, as BIRTH OPENING goes from closed to full: it thins first and then opens -- in a first labour it is
 * drawn up into the womb (effaced) before it dilates much -- to 10 cm across, when it is gone into the womb's lower
 * segment and womb and canal are one tube.
 *
 * THE BABY'S WAY OUT, checked against her measured pelvis plane by plane, as a head comes through in the usual way
 * (occiput anterior: the cardinal movements): it ENGAGES across her inlet, its long front-to-back diameter (occipito-
 * frontal) lying in the inlet's widest, side to side, and its width (biparietal) in the inlet's narrowest, front to back
 * (the obstetric conjugate); it FLEXES, so what leads is the smaller suboccipitobregmatic, and TURNS to face her back
 * by her ischial spines, its width now across them; and comes out under her pubic arch the same way, its width between
 * her ischial tuberosities. Each passage is its room less the head: positive, it has room.
 *
 * Rest metres. Pure: plain arrays.
 */
import type { P3 } from './pelvisMeasure';

/** How her birth opens. */
export const BIRTH_OPENING = Object.freeze({
  /** Fully dilated, the cervix is this wide inside, metres. MEASURED (10 cm: https://en.wikipedia.org/wiki/Cervical_dilation). */
  dilationM: 0.1,
  /** The share of BIRTH OPENING by which it has thinned completely: a first labour's cervix effaces before it dilates
   * far (BIOLOGICAL SHAPE), here by 4 cm. GAME TUNING (where). */
  effacedBy: 0.4,
  /** The rim left of it when it is thinned, metres: a few millimetres of tissue round the opening. BIOLOGICAL SHAPE. */
  rimM: 0.005,
});

/** A baby's head at term, metres: across (biparietal), its smallest front-to-back when flexed (suboccipitobregmatic),
 * and front to back unflexed (occipitofrontal). MEASURED (obstetric texts: 9.5, 9.5 and 11.5 cm). The room draws a term
 * head 9.5 cm across on a 51 cm baby (SarahLabScene's BIRTH_HEAD); a baby of another size is that in proportion. */
export const TERM_HEAD = Object.freeze({ biparietal: 0.095, suboccipitobregmatic: 0.095, occipitofrontal: 0.115, babyLengthM: 0.51 });

export interface Cervix {
  /** how long it still is (closed, CERVIX.length; thinned, its rim), metres */
  readonly lengthM: number;
  /** how wide it is open inside, and its outer radius, metres */
  readonly openM: number;
  readonly outerM: number;
  /** how far it has thinned, 0..1 */
  readonly effaced: number;
}

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Her cervix at BIRTH OPENING `open` (0 closed .. 1 full), from its length and radius closed. */
export function cervixAt(open: number, closedLengthM: number, closedRadiusM: number): Cervix {
  const o = Math.min(1, Math.max(0, Number.isFinite(open) ? open : 0)), B = BIRTH_OPENING;
  const effaced = smooth(o / B.effacedBy), openM = B.dilationM * o;
  return { lengthM: closedLengthM + (B.rimM - closedLengthM) * effaced, openM, outerM: Math.max(closedRadiusM, openM / 2 + B.rimM), effaced };
}

/** What the check needs of her measured pelvis and torso (src/data/pelvis/, src/data/torso/). */
export interface PassageBones {
  readonly cm: { readonly obstetricConjugate: number; readonly inletTransverse: number; readonly interspinous: number; readonly intertuberous: number };
  readonly landmarks: { readonly symphysisBottom: readonly number[] };
  readonly midpelvis: { readonly ring: readonly (readonly number[])[] };
}

/** One plane of her pelvis as the head passes it: its room either way and the head's, metres. */
export interface Passage {
  readonly plane: 'inlet' | 'midpelvis' | 'outlet';
  /** across her (side to side) and front to back: the room, the head's diameter lying that way, and what is left */
  readonly across: { readonly room: number; readonly head: number; readonly left: number; readonly headIs: string };
  readonly along: { readonly room: number; readonly head: number; readonly left: number; readonly headIs: string };
}

/** A plane ring's front-to-back diameter: between its points nearest her midline, front and back (metres). */
export function ringFrontToBack(ring: readonly (readonly number[])[], centreX: number): number {
  const near = ring.filter((p) => Math.abs(p[0] - centreX) < 0.004);
  if (near.length < 2) return NaN;
  let best = 0;
  for (const a of near) for (const b of near) best = Math.max(best, Math.hypot(a[1] - b[1], a[2] - b[2]));
  return best;
}

/**
 * Her baby's head through her pelvis, plane by plane (see the top): `babyLengthM` the baby's crown-heel length as drawn
 * (its head in proportion to a term head on a 51 cm baby); `coccyx` her tailbone's tip, the back of her outlet.
 */
export function headPassage(bones: PassageBones, coccyx: readonly number[], babyLengthM: number): Passage[] {
  const k = babyLengthM / TERM_HEAD.babyLengthM, H = { bpd: TERM_HEAD.biparietal * k, sob: TERM_HEAD.suboccipitobregmatic * k, ofd: TERM_HEAD.occipitofrontal * k };
  const cm = bones.cm, s = bones.landmarks.symphysisBottom, x = s[0];
  const pass = (room: number, head: number, headIs: string) => ({ room, head, left: room - head, headIs });
  return [
    { plane: 'inlet', across: pass(cm.inletTransverse / 100, H.ofd, 'occipitofrontal (it engages sideways)'), along: pass(cm.obstetricConjugate / 100, H.bpd, 'biparietal') },
    { plane: 'midpelvis', across: pass(cm.interspinous / 100, H.bpd, 'biparietal (turned to face her back)'), along: pass(ringFrontToBack(bones.midpelvis.ring, x), H.sob, 'suboccipitobregmatic (flexed)') },
    { plane: 'outlet', across: pass(cm.intertuberous / 100, H.bpd, 'biparietal'), along: pass(Math.hypot(coccyx[1] - s[1], coccyx[2] - s[2]), H.sob, 'suboccipitobregmatic (under her pubic arch)') },
  ];
}

/** The tightest passage, metres left (negative: the head is bigger than the room there). */
export const tightest = (p: readonly Passage[]): number => Math.min(...p.flatMap((q) => [q.across.left, q.along.left]));

/** The canal's way when it is open, from her pelvis: the bony canal's curved centre line (the curve of Carus), and how
 * far forward it turns under her pubic arch to its opening. */
export interface CanalBones {
  readonly axis: readonly (readonly number[])[];
  /** her pubic arch (the lower edge of her symphysis and her two sit bones) and how far apart her sit bones are inside:
   * with them, her opening stands below her bones, under where her arch lets a head by (`seatedCanal`) */
  readonly landmarks?: { readonly symphysisBottom: readonly number[]; readonly tuberosityLeft?: readonly number[]; readonly tuberosityRight?: readonly number[] };
  readonly cm?: { readonly intertuberous?: number };
  /** the inner edge of her pubic arch as measured, point by point (the pelvis file's outlet ring): what her canal's wall is
   * kept off; without it, straight lines from her symphysis to her sit bones */
  readonly outlet?: { readonly ring: readonly (readonly number[])[] };
  /** her tailbone's tip (src/data/torso/ `landmarks.coccyx`): her canal's wall keeps off it too */
  readonly tail?: readonly number[];
  /** the hollow of her sacrum: the front of her sacrum and tailbone on her midline, her tailbone's tip first (the pelvis
   * file's `sacrum.front`): open, her canal's back wall goes back to it (`backOf`) */
  readonly sacrum?: { readonly front: readonly (readonly number[])[] };
}

/** How the canal opens. */
export const CANAL_OPENING = Object.freeze({
  /** Fully open it is as wide as a term head, round, metres. BIOLOGICAL SHAPE (it stretches to the head: 10 cm). */
  diameterM: 0.1,
  /** Points along it. GAME TUNING (the mesh). */
  points: 24,
});

/**
 * WHERE HER OPENING STANDS (Joshua, 2026-11-10: "I don't remember the opening cutting into the bone... how could the baby
 * make that tight of a turn"; "the bones shouldn't be visible... if you see bones, you know something is still off").
 *
 * Her pubic arch was a narrow V: its point the lower edge of her symphysis, its sides the bones running down and back to
 * her sit bones (on her skeleton as it came 8.2 cm long and 10.2 cm apart at their ends: 64 degrees between them, where a
 * woman's is 90 or over). As it first was, her opening stood in that V, 2 cm behind her symphysis, and her doors and her
 * canal cut through its bones.
 *
 * Then it was taken round her arch: back behind her sit bones, where the V is a head wide, and from there forward on a
 * tight curve to face ahead of her. No bone showed -- but her canal turned 139 degrees in all, and its end hung some
 * 11 cm below her skin, in v2 a spout under her. Joshua, 2026-11-10: "does the real vagina and pubic bone actually bend
 * out like that in real life? I think it does but not as much as you are pushing it outwards", and of his diagrams of a
 * birth from the side: "it's pretty much straight out and not a sharp 90 degree bend... I believe less than 45".
 *
 * So it was laid STRAIGHT DOWN THROUGH HER ARCH, with one lean forward at its end. That was gentler, but with an arch of
 * 64 degrees a head cannot use the room under her symphysis: it passed 7.8 cm back along the arch's plane and was born
 * further back and lower than under an arch of 90 (obstetrics' own rule: the narrower the arch, the more the perineum has
 * to give) -- her bones' cost, and Joshua's call.
 *
 * HER ARCH, A WOMAN'S, AND HER CANAL ROUND HER PUBIC BONE (Joshua, 2026-11-10, of the drawing he chose -- a birth's stages
 * from the side -- "this one is probably the best reference... it does have a bend and you can even see the bone
 * points"; of her arch widened to 94 degrees: "Yeah, looks good... go ahead with it"). In that drawing a head comes down
 * and a little back along her sacrum, swings forward ROUND THE LOWER EDGE OF HER PUBIC BONE on one curve of about 60
 * degrees, and is born facing down and about 40 degrees forward, the front of her opening right under the bone.
 *
 * So `seatedCanal`: ONE CURVE ROUND HER PUBIC BONE'S LOWER EDGE, at the distance from it where a MOULDED head passes
 * between her arch's two sides (`mould`, Joshua's "squeeze up to 22%"; her canal is narrower there, as a head is --
 * `pinchOf`). It comes down to that curve from her fornix on the straight line that meets it without a kink, leaves it
 * facing `faceDeg` forward of straight down, and goes straight on through her doors. On her bones nothing but `faceDeg`
 * is chosen: a moulded head passes 6.7 cm from the bone's edge, the line down to that curve leans 17 degrees back, and
 * the curve turns 57 -- the drawing's own, near enough. Her doors, which are wider than her canal, hang below her bones
 * (`footClear`): their front foot 1.1 cm under the bone's edge, their back one 7 cm lower, as far as a head's width
 * facing that way puts it (her perineum, pushed down and back before a head).
 */
export const OPEN_SEAT = Object.freeze({
  /** how far clear of her arch's bones her canal's wall passes where it is not pinched, open, metres. GAME TUNING. */
  archClear: 0.003,
  /** which way her opening faces as she stands: this far forward of straight down, degrees. BIOLOGICAL SHAPE (standing, a
   * vagina runs down and forward and a head is born under the pubic bone facing down and forward: about 40 degrees in the
   * drawing Joshua chose; "less than 45"). */
  faceDeg: 40,
  /** how far below her arch her doors' feet stand at the least, measured up her canal from them: half a door's thickness
   * and the flesh over the bone, metres. GAME TUNING (checked against her skeleton's own bone mesh,
   * scripts/probe-canal-bones.mts: her doors stand 1.1 cm off it shut and 1.6 wide open; at 1 cm here, 0.8 shut). */
  footClear: 0.0125,
  /** how far clear of her tailbone's tip her canal's wall passes, open, metres. GAME TUNING (see `archClear`; its tip is a
   * knob round the measured point: at 3 mm it stood through the canal's back wall). */
  tailClear: 0.008,
  /** WHERE HER BONES PINCH IT: between her arch and her tailbone a head's width of round canal has a millimetre to spare
   * on her skeleton's own bones, and they stood through its wall. So there it is narrower front to back -- what passes
   * is moulded by her bones, as a head is -- by as much as keeps its wall `pinchArch` off her arch's edge and `pinchTail`
   * off her tailbone's tip (metres), and never under `mould` of its width (Joshua, 2026-11-08: "squeeze up to 22%...
   * like moulding"). GAME TUNING. */
  pinchArch: 0.006,
  pinchTail: 0.008,
  mould: 0.78,
  /** MORE ROOM BEHIND, TO HER SPINE (Joshua, 2026-11-10, drawing her canal's back wall on a cut through her middle --
   * down the hollow of her sacrum, straight down past her tailbone, then forward to the back edge of her opening: "keep
   * the front and middle alone, it's just there is a little bit more room to go back to the spine to give more space like
   * the diagram I shared"). Open, her canal's back wall stands this far off the front of her sacrum and her tailbone,
   * metres -- what is left of her rectum, pressed flat between them (GAME TUNING; her tailbone's `tailClear`) -- and
   * below her tailbone goes on from the foremost of its lowest `spineKnob` metres (its tip is a knob that curves back
   * under itself). */
  spineClear: 0.008,
  spineKnob: 0.02,
});

/** The way a head comes where her canal is not seated under her arch (laid from her own skin: v2 for now): from her
 * opening `mouth` up into her, `straight` metres the way her canal leaves her opening (`t`: where her doors hang), then
 * onto her bony canal's measured centre line and up it to `top`; eased so it bends rather than kinks. */
function headWay(mouth: P3, t: P3, bones: CanalBones, top: P3, straight: number): P3[] {
  const n = CANAL_OPENING.points;
  const foot: P3 = [mouth[0], mouth[1] + t[1] * straight, mouth[2] + t[2] * straight], on: P3 = [mouth[0], foot[1] + t[1] * 0.02, foot[2] + t[2] * 0.02];
  const axis = bones.axis.map((p): P3 => [mouth[0], p[1], p[2]]).filter((p) => p[1] > on[1] + 0.01 && p[1] < top[1] - 1e-6).sort((a, b) => a[1] - b[1]);
  let way = resample([mouth, foot, on, ...axis, top], n);
  const keep = Math.ceil((straight / Math.max(1e-9, lengthAlong(way))) * (n - 1)) + 1;
  for (let pass = 0; pass < 6; pass++) way = way.map((p, i) => (i <= keep || i === n - 1 ? p : [p[0], (way[i - 1][1] + 2 * p[1] + way[i + 1][1]) / 4, (way[i - 1][2] + 2 * p[2] + way[i + 1][2]) / 4]));
  return way;
}

/** How much of its depth (front to back: `deep`) and of its width (across her: `wide`) her open canal keeps at each point
 * of `way`, 1 all of it (OPEN_SEAT `pinchArch`): each of her arch's points and her tailbone's tip level with a point of
 * it must be outside its wall there -- an ellipse -- by its clearance; a bone more to its side than before or behind it
 * narrows it across, another front to back. Eased along it so it narrows and widens gently. */
function pinchOf(way: readonly P3[], bones: CanalBones): { deep: number[]; wide: number[] } {
  const arch = archOf(bones, way[0][0]), r = CANAL_OPENING.diameterM / 2, n = way.length;
  if (!arch) return { deep: way.map(() => 1), wide: way.map(() => 1) };
  const stops: { q: P3; c: number }[] = arch.pts.map((q) => ({ q, c: OPEN_SEAT.pinchArch }));
  if (bones.tail) stops.push({ q: [0, bones.tail[1], bones.tail[2]], c: OPEN_SEAT.pinchTail });
  const deep: number[] = [], wide: number[] = [];
  way.forEach((p, i) => {
    const a = way[Math.max(0, i - 1)], b = way[Math.min(n - 1, i + 1)], l = Math.hypot(b[1] - a[1], b[2] - a[2]) || 1, ty = (b[1] - a[1]) / l, tz = (b[2] - a[2]) / l;
    let kd = 1, kw = 1;
    for (const { q, c } of stops) {
      const dy = q[1] - p[1], dz = q[2] - p[2], along = dy * ty + dz * tz;
      if (Math.abs(along) > 0.012) continue;
      const ap = Math.abs(-dy * tz + dz * ty), lat = q[0];
      if (lat > ap) { if (ap < r + c) kw = Math.min(kw, (lat / Math.sqrt(1 - (ap / (r + c)) ** 2) - c) / r); }
      else if (lat < r + c) kd = Math.min(kd, (ap / Math.sqrt(1 - (lat / (r + c)) ** 2) - c) / r);
    }
    deep.push(Math.max(OPEN_SEAT.mould, kd)); wide.push(Math.max(OPEN_SEAT.mould, kw));
  });
  // (as narrow as its neighbours need, then eased)
  const ease = (k0: number[]) => {
    let k = k0.map((_, i) => Math.min(k0[Math.max(0, i - 1)], k0[i], k0[Math.min(n - 1, i + 1)]));
    for (let pass = 0; pass < 2; pass++) k = k.map((v, i) => Math.min(v, (k[Math.max(0, i - 1)] + 2 * v + k[Math.min(n - 1, i + 1)]) / 4));
    return k;
  };
  return { deep: ease(deep), wide: ease(wide) };
}

/**
 * HER CANAL'S BACK WALL, TO HER SPINE (OPEN_SEAT.spineClear): how much deeper than its front half her open canal's back
 * half is at each point of `way` -- 1 no deeper -- where its front half keeps `deep` of a head's half width there
 * (`pinchOf`). Its back wall, in her midline: `spineClear` off the hollow of her sacrum and her tailbone's front, all the
 * way down them; from her tailbone STRAIGHT DOWN as she stands; then forward on one curve that comes in to her canal's own
 * wall where her doors hang (`straight` metres from her opening), running the way her canal runs there -- her pelvic
 * floor, stretched from her tailbone to her opening round what passes. Each point's back half reaches to that wall,
 * square to her canal's line there; never less deep than its front. All ones without her sacrum's hollow.
 */
export function backOf(way: readonly P3[], bones: CanalBones, deep: readonly number[], straight: number): number[] {
  const front = bones.sacrum?.front, n = way.length, r = CANAL_OPENING.diameterM / 2, O = OPEN_SEAT, ones = way.map(() => 1);
  if (!front || front.length < 4 || n < 3) return ones;
  // where her doors hang: her canal's own back wall there, and the way out of her
  const at = (s: number): { p: [number, number]; t: [number, number] } => {
    let left = s;
    for (let i = 0; i + 1 < n; i++) {
      const l = Math.hypot(way[i + 1][1] - way[i][1], way[i + 1][2] - way[i][2]);
      if (left <= l || i === n - 2) { const f = l > 0 ? left / l : 0; return { p: [way[i][1] + (way[i + 1][1] - way[i][1]) * f, way[i][2] + (way[i + 1][2] - way[i][2]) * f], t: [(way[i + 1][1] - way[i][1]) / (l || 1), (way[i + 1][2] - way[i][2]) / (l || 1)] }; }
      left -= l;
    }
    return { p: [way[0][1], way[0][2]], t: [0, 1] };
  };
  // (square to a way up her canal `t`, toward her back)
  const backward = (t: readonly [number, number]): [number, number] => (t[0] >= 0 ? [t[1], -t[0]] : [-t[1], t[0]]);
  const foot = at(straight), fb = backward(foot.t), E: [number, number] = [foot.p[0] + fb[0] * r, foot.p[1] + fb[1] * r];
  // the hollow, `spineClear` in front of the bone (square to it), from her promontory down to the foremost of her
  // tailbone's lowest `spineKnob`
  const H = front.map((q): [number, number] => [q[1], q[2]]);
  let knob = 0;
  for (let i = 1; i < H.length && H[i][0] <= H[0][0] + O.spineKnob; i++) if (H[i][1] > H[knob][1]) knob = i;
  const wall: [number, number][] = [];
  for (let i = H.length - 1; i >= knob; i--) {
    const a = H[Math.min(H.length - 1, i + 1)], b = H[Math.max(knob, i - 1)], ty = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(ty, tz) || 1;
    // (down the bone is -y: its front, into her canal, is square to that toward her front)
    const ny = tz / tl, nz = -ty / tl, sgn = nz >= 0 ? 1 : -1;
    wall.push([H[i][0] + ny * sgn * O.spineClear, H[i][1] + nz * sgn * O.spineClear]);
  }
  const K = wall[wall.length - 1], g: [number, number] = [-foot.t[0], -foot.t[1]];
  // straight down from there, then the curve in to `E` running the way out of her `g`: a circle that leaves the plumb
  // line turning forward and comes in to E along g (its radius what E's distance in front of that line gives)
  const lean = Math.atan2(g[1], -g[0]), ahead = E[1] - K[1];
  if (lean > 0.02 && ahead > 1e-4) {
    const R = ahead / (1 - Math.cos(lean)), ya = E[0] + R * Math.sin(lean);
    if (ya < K[0]) { wall.push([ya, K[1]]); for (let k = 1; k <= 16; k++) { const f = (lean * k) / 16; wall.push([ya - R * Math.sin(f), K[1] + R * (1 - Math.cos(f))]); } }
    else for (let k = 1; k <= 16; k++) { const f = k / 16; wall.push([K[0] + (E[0] - K[0]) * f, K[1] + (E[1] - K[1]) * f]); }
  } else wall.push(E);
  // each point of her canal's line: square to it toward her back, as far as that wall
  const out: number[] = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i) s += Math.hypot(way[i][1] - way[i - 1][1], way[i][2] - way[i - 1][2]);
    const a = way[Math.max(0, i - 1)], b = way[Math.min(n - 1, i + 1)], l = Math.hypot(b[1] - a[1], b[2] - a[2]) || 1, nb = backward([(b[1] - a[1]) / l, (b[2] - a[2]) / l]);
    const half = r * (deep[i] ?? 1);
    let reach = Infinity;
    if (s > straight - 1e-9) for (let k = 0; k + 1 < wall.length; k++) {
      const p = wall[k], q = wall[k + 1], ey = q[0] - p[0], ez = q[1] - p[1], den = nb[0] * ez - nb[1] * ey;
      if (Math.abs(den) < 1e-12) continue;
      const wy = p[0] - way[i][1], wz = p[1] - way[i][2], t = (wy * ez - wz * ey) / den, u = (wy * nb[1] - wz * nb[0]) / den;
      if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && t < reach) reach = t;
    }
    out.push(Number.isFinite(reach) ? Math.max(half, reach) : half);
  }
  // (its depth behind eased along it, in metres, so its back wall runs smoothly where its front is pinched; never less
  // deep than its front)
  let h = out;
  for (let pass = 0; pass < 2; pass++) h = h.map((v, i) => (i === 0 || i === n - 1 ? v : (h[i - 1] + 2 * v + h[i + 1]) / 4));
  return h.map((v, i) => Math.max(1, v / (r * (deep[i] ?? 1))));
}

/** Her pubic arch as her canal's wall must clear it: its inner edge's points, each [how far out from her midline, y, z]
 * (as measured -- the pelvis file's outlet ring -- with her sit bones' inner points; without a ring, along straight lines
 * from the symphysis's lower edge to each sit bone), and how far a point on her midline must stand from them (`need`: half
 * the open canal and OPEN_SEAT.archClear). */
interface Arch { readonly pts: readonly P3[]; readonly need: number }
function archOf(bones: CanalBones, x: number): Arch | null {
  const L = bones.landmarks, a = L?.tuberosityLeft, b = L?.tuberosityRight;
  if (!L || !a || !b) return null;
  const half = bones.cm?.intertuberous ? bones.cm.intertuberous / 200 : Math.abs(a[0] - b[0]) / 2;
  if (!(half > 0)) return null;
  const s = L.symphysisBottom, pts: P3[] = [[half, a[1], a[2]], [half, b[1], b[2]]];
  const ring = bones.outlet?.ring;
  if (ring && ring.length > 8) for (const q of ring) pts.push([Math.abs(q[0] - x), q[1], q[2]]);
  else for (let k = 0; k <= 24; k++) { const f = k / 24, ty = (a[1] + b[1]) / 2, tz = (a[2] + b[2]) / 2; pts.push([half * f, s[1] + (ty - s[1]) * f, s[2] + (tz - s[2]) * f]); }
  return { pts, need: CANAL_OPENING.diameterM / 2 + OPEN_SEAT.archClear };
}

/**
 * HER CANAL'S LINE, SEATED (see OPEN_SEAT): ONE CURVE ROUND THE LOWER EDGE OF HER PUBIC BONE, a circle about it in her
 * midline, as far from it as the place in her arch's plane where a MOULDED head's width passes between her arch's two
 * sides (`mould` of a head's width, `pinchArch` and `archClear` clear: what `pinchOf` narrows her canal to there). From
 * `top` (her fornix) it comes STRAIGHT down to that circle on the line that touches it behind the bone -- no kink where
 * they meet -- follows it down and forward until it faces `faceDeg` forward of straight down, and goes straight on: as
 * far as her doors' feet need to stand `footClear` below every point of her arch, measured up her canal from them (her
 * doors and the skin round them are wholly under her bones, whichever way they swing), and its last `straight` metres,
 * where her doors hang, to her opening.
 *
 * (A fornix nearer her pubic bone than that circle -- a narrow arch, which a head passes far back -- has no such line:
 * then straight from her fornix to the place it passes her arch, and round the bone from there, the corner eased.)
 *
 * In her midline at `x`; from her opening up, CANAL_OPENING.points points. Null without her arch. `pass`: where it
 * crosses her arch's plane.
 */
export function seatedCanal(bones: CanalBones, x: number, top: P3, straight = 0.03): { path: P3[]; mouth: P3; t: P3; pass: P3 } | null {
  const arch = archOf(bones, x), L = bones.landmarks, a = L?.tuberosityLeft, b = L?.tuberosityRight;
  if (!arch || !L || !a || !b) return null;
  const O = OPEN_SEAT, sy = L.symphysisBottom[1], sz = L.symphysisBottom[2], ty = (a[1] + b[1]) / 2, tz = (a[2] + b[2]) / 2, run = Math.hypot(ty - sy, tz - sz);
  if (!(run > 1e-6)) return null;
  // her arch's plane, in her midline: back along it from her symphysis, to the first place a moulded head's width has room
  const uy = (ty - sy) / run, uz = (tz - sz) / run, need = (CANAL_OPENING.diameterM / 2) * O.mould + O.pinchArch + O.archClear;
  const room = (d: number) => { const y = sy + uy * d, z = sz + uz * d; let least = Infinity; for (const p of arch.pts) least = Math.min(least, Math.hypot(p[0], p[1] - y, p[2] - z)); return least; };
  let rho = run * 0.3;
  while (rho < run * 3 && room(rho) < need) rho += 0.0005;
  // the circle round her pubic bone's lower edge at that distance, a place on it by its angle: 0 straight behind the bone,
  // growing down and forward -- where the way along it leans that angle forward of straight down
  const on = (f: number): P3 => [x, sy - rho * Math.sin(f), sz - rho * Math.cos(f)];
  const fArch = Math.atan2(-uy, -uz), fOut = (O.faceDeg * Math.PI) / 180, pass = on(fArch);
  const hy = top[1] - sy, hz = top[2] - sz, far = Math.hypot(hy, hz);
  if (!(far > 0.01) || top[1] <= pass[1]) return null;
  // (where the straight line down from her fornix touches it; without one, from where it passes her arch)
  const touch = far > rho ? Math.atan2(-hy, -hz) + Math.acos(rho / far) : Infinity, smoothly = touch < fOut, from = smoothly ? touch : Math.min(fArch, fOut);
  // (the way out of her at her opening, and `t` into her there)
  const gy = -Math.cos(fOut), gz = Math.sin(fOut), t: P3 = [0, -gy, -gz], end = on(fOut);
  // her doors' feet under all of her arch: every point of it `footClear` and more up the canal from them
  const under = (foot: P3) => arch.pts.every((p) => (p[1] - foot[1]) * t[1] + (p[2] - foot[2]) * t[2] >= O.footClear);
  let s = 0;
  while (s < 0.3 && !under([x, end[1] + gy * s, end[2] + gz * s])) s += 0.001;
  const foot: P3 = [x, end[1] + gy * s, end[2] + gz * s], mouth: P3 = [x, foot[1] + gy * straight, foot[2] + gz * straight];
  const line: P3[] = [mouth, foot], steps = Math.max(1, Math.ceil(((fOut - from) * rho) / 0.004)), N = CANAL_OPENING.points;
  for (let k = s > 1e-6 ? steps : steps - 1; k >= 0; k--) line.push(on(from + ((fOut - from) * k) / steps));
  line.push([x, top[1], top[2]]);
  let path = resample(line, N);
  if (!smoothly) {
    const keep = Math.ceil(((straight + s) / Math.max(1e-9, lengthAlong(path))) * (N - 1)) + 1;
    for (let k = 0; k < 6; k++) path = path.map((p, i) => (i <= keep || i === N - 1 ? p : [p[0], (path[i - 1][1] + 2 * p[1] + path[i + 1][1]) / 4, (path[i - 1][2] + 2 * p[2] + path[i + 1][2]) / 4]));
  }
  return { path, mouth, t, pass };
}

/** Her canal's opening (its first point) and the way it goes up into her over its first `reach` metres (unit). */
export function canalMouth(canal: readonly P3[], reach: number): { mouth: P3; t: P3 } {
  const m = canal[0];
  let k = 1, s = 0;
  while (k < canal.length - 1 && s < reach) { s += Math.hypot(canal[k][0] - canal[k - 1][0], canal[k][1] - canal[k - 1][1], canal[k][2] - canal[k - 1][2]); k++; }
  const d: P3 = [0, canal[k][1] - m[1], canal[k][2] - m[2]], l = Math.hypot(...d) || 1;
  return { mouth: [m[0], m[1], m[2]], t: [0, d[1] / l, d[2] / l] };
}

/**
 * Her birth canal at BIRTH OPENING `open`: as laid (a flattened tube up and back from its opening) when closed; open, a
 * round tube as wide as a head, its centre line drawn from as laid onto the way a head comes down through her pelvis
 * (the bony canal's curved centre line, the curve of Carus). Its first `straight` metres -- where the doors hang
 * (actor/birthDoors.ts) -- keep going the way it went as laid, so the doors and the tube stay one opening.
 */
export function openCanal(laid: { readonly path: readonly P3[]; readonly width: number; readonly depth: number }, bones: CanalBones, open: number, straight = 0.03): { path: P3[]; width: number; depth: number; narrow?: number[]; narrowAcross?: number[]; back?: number[] } {
  const o = smooth(Math.min(1, Math.max(0, Number.isFinite(open) ? open : 0)));
  const n = CANAL_OPENING.points, top = laid.path[laid.path.length - 1], { mouth, t } = canalMouth(laid.path, straight);
  // the way a head comes: her canal's line seated under her arch (`seatedCanal`) wherever her bones give one. Laid from
  // that seat (her skeleton) it is the line itself; laid from her own skin (v2: closed, her canal ends at her skin's own
  // opening), it is drawn from as laid onto it as it opens -- her opening comes down from her skin to its seat below her
  // pubic bone, as her skin there is pushed out before a head. Without her sit bones: up from her doors the way it went,
  // then onto her bony canal.
  const seat = seatedCanal(bones, mouth[0], top, straight), seated = !!seat;
  const way = seat ? seat.path : headWay(mouth, t, bones, top, straight);
  const as = resample(laid.path, n);
  const path = as.map((p, i): P3 => [p[0] + (way[i][0] - p[0]) * o, p[1] + (way[i][1] - p[1]) * o, p[2] + (way[i][2] - p[2]) * o]);
  const d = CANAL_OPENING.diameterM;
  // (and where her bones pinch it, narrower as it opens: `narrow`, the share of its depth it keeps at even steps along
  // it, and `narrowAcross`, of its width)
  const pinch = seated && o > 0 ? pinchOf(way, bones) : null, eased = (k: number[]) => k.map((v) => 1 - (1 - v) * o);
  // (and behind, as it opens, it goes back to her spine: `back`, how much deeper its back half is than its front, at the
  // same steps)
  const back = pinch && bones.sacrum ? backOf(way, bones, pinch.deep, straight) : null;
  return { path, width: laid.width + (d - laid.width) * o, depth: laid.depth + (d - laid.depth) * o, ...(pinch ? { narrow: eased(pinch.deep), narrowAcross: eased(pinch.wide) } : {}), ...(back ? { back: eased(back) } : {}) };
}

const lengthAlong = (path: readonly P3[]) => path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1], p[2] - path[i - 1][2]) : 0), 0);

/** A line resampled to `n` points evenly along it. */
export function resample(path: readonly P3[], n: number): P3[] {
  const at: number[] = [0];
  for (let k = 1; k < path.length; k++) at.push(at[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1], path[k][2] - path[k - 1][2]));
  const total = at[at.length - 1], out: P3[] = [];
  for (let i = 0; i < n; i++) {
    const s = (total * i) / (n - 1);
    let k = 1; while (k < path.length - 1 && at[k] < s) k++;
    const f = at[k] > at[k - 1] ? (s - at[k - 1]) / (at[k] - at[k - 1]) : 0, a = path[k - 1], b = path[k];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return out;
}
