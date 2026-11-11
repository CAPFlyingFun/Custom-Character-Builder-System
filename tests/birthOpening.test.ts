/**
 * HER BIRTH OPENING (src/actor/birthCanal.ts, src/actor/birthDoors.ts; the skeleton-outward plan's Phase 1, step 4). The
 * cervix thins before it opens and opens to 10 cm; a term baby's head has room plane by plane through her measured
 * pelvis, least at her ischial spines and tuberosities; her canal opens round to a head's width without moving its
 * opening; and the opening's two doors (Joshua's drawing) meet closed, are laid round Joshua's 10 cm circle as it comes
 * down -- touching it, never inside it, a half sphere round it with the lips together before they part round its widest
 * -- and close as a pneumatic door does: quickly at first, slowing as they come to, never past shut.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIRTH_OPENING, CANAL_OPENING, OPEN_SEAT, canalMouth, cervixAt, headPassage, openCanal, seatedCanal, tightest } from '../src/actor/birthCanal';
import { BIRTH_HEAD, DOORS, ENDS_SHUT, passingLips, sliderLips, birthAngles, birthHead, doorFrame, doorMeshes, doorOpening, doorSection, foldAngles, followDoor, followEnds, passingOutlines, pressDoorLine, rimOf, swingDoors, type Angles, type Ends } from '../src/actor/birthDoors';
import { CERVIX, layOrgans, lengthOf } from '../src/actor/pelvicOrgans';
import { growWomb } from '../src/actor/pregnantWomb';

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
const pelvis = read<Parameters<typeof layOrgans>[0] & Parameters<typeof headPassage>[0] & Parameters<typeof openCanal>[1]>('../src/data/pelvis/skeleton.json');
const torso = read<Parameters<typeof growWomb>[1] & { landmarks: { coccyx: number[] } }>('../src/data/torso/skeleton.json');
// (her pelvis with her tailbone's tip, as the room lays her organs: sarahlab/pelvicOrgansView.ts)
const bones = { ...pelvis, tail: torso.landmarks.coccyx };
const laid = layOrgans(bones);

describe('her cervix', () => {
  it('thins first, then opens to 10 cm', () => {
    const closed = cervixAt(0, CERVIX.length, 0.0115), early = cervixAt(0.2, CERVIX.length, 0.0115), thin = cervixAt(BIRTH_OPENING.effacedBy, CERVIX.length, 0.0115), full = cervixAt(1, CERVIX.length, 0.0115);
    expect(closed.lengthM).toBeCloseTo(CERVIX.length, 9);
    expect(closed.openM).toBe(0);
    // (by 2 cm open it is half thinned)
    expect(early.effaced).toBeGreaterThanOrEqual(0.5);
    expect(thin.lengthM).toBeCloseTo(BIRTH_OPENING.rimM, 9);
    expect(full.openM).toBeCloseTo(0.1, 9);
    expect(full.outerM).toBeCloseTo(0.05 + BIRTH_OPENING.rimM, 9);
  });

  it('in her grown womb: drawn up into it from below, its os rising, the womb\'s foot as wide as it opens', () => {
    const closed = growWomb(laid, torso, 40, [3460], 0), open = growWomb(laid, torso, 40, [3460], 1);
    expect(open.path[0][1]).toBeGreaterThan(closed.path[0][1] + 0.02);
    expect(open.halves[0][0]).toBeCloseTo(open.cervix.outerM, 9);
    expect(open.contents.volumeMl).toBe(closed.contents.volumeMl);
  });
});

describe('her baby\'s head through her pelvis', () => {
  it('a term head (51 cm baby) has room at every plane, least at her ischial spines and tuberosities', () => {
    const p = headPassage(pelvis, torso.landmarks.coccyx, 0.51);
    expect(p.map((q) => q.plane)).toEqual(['inlet', 'midpelvis', 'outlet']);
    expect(tightest(p)).toBeGreaterThan(0.005);
    const least = p.flatMap((q) => [q.across, q.along]).reduce((a, b) => (b.left < a.left ? b : a));
    expect(least.room).toBeCloseTo(0.102, 3);
    // (it engages sideways: its longest way across the inlet's widest)
    expect(p[0].across.head).toBeGreaterThan(p[0].along.head);
  });

  it('a bigger baby has less room, and a much bigger one none', () => {
    expect(tightest(headPassage(pelvis, torso.landmarks.coccyx, 0.53))).toBeLessThan(tightest(headPassage(pelvis, torso.landmarks.coccyx, 0.51)));
    expect(tightest(headPassage(pelvis, torso.landmarks.coccyx, 0.58))).toBeLessThan(0);
  });
});

describe('her canal opening', () => {
  it('opens round to a head\'s width, its opening and top where they were, its first centimetres going the way they went', () => {
    const closed = openCanal(laid.vagina, bones, 0), open = openCanal(laid.vagina, bones, 1);
    expect(closed.width).toBeCloseTo(laid.vagina.width, 9);
    expect(open.width).toBeCloseTo(CANAL_OPENING.diameterM, 9);
    expect(open.depth).toBeCloseTo(CANAL_OPENING.diameterM, 9);
    for (const c of [closed, open]) {
      c.path[0].forEach((v, i) => expect(v).toBeCloseTo(laid.vagina.path[0][i], 6));
      c.path[c.path.length - 1].forEach((v, i) => expect(v).toBeCloseTo(laid.vagina.path[laid.vagina.path.length - 1][i], 6));
    }
    const a = canalMouth(laid.vagina.path, DOORS.hingeUp).t, b = canalMouth(open.path, DOORS.hingeUp).t;
    expect(a[1] * b[1] + a[2] * b[2]).toBeGreaterThan(0.98);
    expect(lengthOf(open.path)).toBeGreaterThan(lengthOf(closed.path) * 0.95);
  });
});

describe("her opening's seat under her pubic arch (Joshua, 2026-11-10: \"if you see bones, you know something is still off\")", () => {
  const rings = pelvis as unknown as { outlet: { ring: number[][] }; midpelvis: { ring: number[][] }; landmarks: { symphysisBottom: number[]; tuberosityLeft: number[]; tuberosityRight: number[] } };
  const seat = seatedCanal(bones, laid.vagina.path[0][0], laid.vagina.path[laid.vagina.path.length - 1], DOORS.hingeUp)!, open = openCanal(laid.vagina, bones, 1, DOORS.hingeUp);
  /** how far a point is from a line of points, metres */
  const off = (q: readonly number[], path: readonly (readonly number[])[]) => {
    let best = Infinity;
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i], b = path[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const k = Math.min(1, Math.max(0, ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1] + (q[2] - a[2]) * ab[2]) / l2));
      best = Math.min(best, Math.hypot(q[0] - a[0] - ab[0] * k, q[1] - a[1] - ab[1] * k, q[2] - a[2] - ab[2] * k));
    }
    return best;
  };

  it('her canal is laid from it; her pubic bone holds the front of her opening and its back is pushed out, under her sit bones (Joshua: "keep the front part locked and just push the bottom out like how it real would be because of the pubic bone stopping the top from moving")', () => {
    const { mouth, t } = canalMouth(laid.vagina.path, DOORS.hingeUp), L = rings.landmarks, S = L.symphysisBottom;
    mouth.forEach((v, i) => expect(v).toBeCloseTo(seat.mouth[i], 9));
    expect(t[1] * seat.t[1] + t[2] * seat.t[2]).toBeGreaterThan(0.995);
    // (her doors' sizes as this file's OPEN_SEAT says them again are her doors' own)
    expect(OPEN_SEAT.rimHalf).toBeCloseTo(CANAL_OPENING.diameterM / 2 + DOORS.hingeOut, 9); expect(OPEN_SEAT.rimUp).toBeCloseTo(DOORS.hingeUp - DOORS.thick, 9);
    // (THE FRONT EDGE OF HER DOORS' RIM IS HELD: `frontUnder` under the lower edge of her pubic bone and `frontBehind` behind
    // it -- within 3 cm of the bone; it hung 3.6 cm under it on the level seat, and 4 on the first)
    const c = [mouth[1] + seat.t[1] * OPEN_SEAT.rimUp, mouth[2] + seat.t[2] * OPEN_SEAT.rimUp];
    const front = [c[0] - seat.t[2] * OPEN_SEAT.rimHalf, c[1] + seat.t[1] * OPEN_SEAT.rimHalf], back = [c[0] + seat.t[2] * OPEN_SEAT.rimHalf, c[1] - seat.t[1] * OPEN_SEAT.rimHalf];
    expect(front[0]).toBeCloseTo(S[1] - OPEN_SEAT.frontUnder, 5); expect(front[1]).toBeCloseTo(S[2] - OPEN_SEAT.frontBehind, 5);
    expect(Math.hypot(front[0] - S[1], front[1] - S[2])).toBeLessThan(0.03);
    // (ITS BACK IS WHAT GIVES: tipped forward about that edge, 15 to 30 degrees -- it faced 40, at the end of a curve
    // round the bone; Joshua's "less than 45" -- so its back edge is 3 to 5 cm lower than its front, in front of her tailbone)
    const face = Math.atan2(-seat.t[2], seat.t[1]) * 180 / Math.PI;
    expect(face).toBeGreaterThan(15); expect(face).toBeLessThan(30); expect(face).toBeLessThan(OPEN_SEAT.faceMost);
    expect(front[0] - back[0]).toBeGreaterThan(0.03); expect(front[0] - back[0]).toBeLessThan(0.05);
    expect(back[1]).toBeGreaterThan(torso.landmarks.coccyx[2] + 0.01);
    // (and by no more than her sit bones ask: her doors' hinges stand `footClear` under the lowest of her arch, measured
    // up her canal from them -- to the quarter of a degree it is tipped by, under a millimetre)
    const foot = [mouth[1] + seat.t[1] * DOORS.hingeUp, mouth[2] + seat.t[2] * DOORS.hingeUp];
    const least = Math.min(...[...rings.outlet.ring, L.tuberosityLeft, L.tuberosityRight].map((q) => (q[1] - foot[0]) * seat.t[1] + (q[2] - foot[1]) * seat.t[2]));
    expect(least).toBeGreaterThanOrEqual(OPEN_SEAT.footClear - 1e-9); expect(least).toBeLessThan(OPEN_SEAT.footClear + 0.001);
    // (her opening itself is below her symphysis's lower edge and her sit bones, and under her outlet: within 3 cm, front
    // to back, of where the line measured down her bony canal ends)
    expect(mouth[1]).toBeLessThan(Math.min(S[1], L.tuberosityLeft[1], L.tuberosityRight[1]) - 0.03);
    const low = pelvis.axis.reduce((m, q) => (q[1] < m[1] ? q : m), pelvis.axis[0]);
    expect(Math.abs(mouth[2] - low[2])).toBeLessThan(0.03);
  });

  it('her doors, shut and wide open, keep off her arch\'s edge and her sit bones: over 7 mm shut, a centimetre wide open', () => {
    const frame = doorFrame(laid.vagina.path), L = rings.landmarks;
    const stops = [...rings.outlet.ring, L.tuberosityLeft, L.tuberosityRight, L.symphysisBottom];
    for (const swing of [0, 1]) {
      const d = doorMeshes(frame, swing);
      let least = Infinity;
      for (let i = 0; i < d.points.length; i += 3) for (const q of stops) least = Math.min(least, Math.hypot(d.points[i] - q[0], d.points[i + 1] - q[1], d.points[i + 2] - q[2]));
      // (her doors' front ends lie close under her arch where her pubic bone holds her opening: off its measured edge 8 mm
      // shut and 12 open -- off her bone mesh itself 6 and 9, scripts/probe-canal-bones.mts)
      expect(least).toBeGreaterThan(swing ? 0.01 : 0.007);
    }
  });

  it('open, a head\'s width of canal passes no bone: off her arch, her midpelvis and her tailbone all the way up', () => {
    const r = CANAL_OPENING.diameterM / 2;
    // (between the two sides of her arch it is narrower than a head's width, as a head moulds -- never under `mould` of
    // it: her arch's edge is off that. Round her pubic bone it was at `mould` itself; coming down further back it keeps 82%)
    expect(Math.min(...(open.narrowAcross ?? [1]))).toBeGreaterThanOrEqual(OPEN_SEAT.mould - 1e-9);
    expect(Math.min(...(open.narrowAcross ?? [1]))).toBeLessThan(0.9);
    for (const q of rings.outlet.ring) expect(off(q, open.path)).toBeGreaterThan(r * OPEN_SEAT.mould + 0.002);
    // (and every measured point of her arch and of her midpelvis -- its front the back of her pubic bone, which her canal
    // comes straight down behind -- stands outside its own wall there: an ellipse round its line, as wide and as deep as it
    // is at that height, deeper behind. Coming straight down, its front wall stood a hair inside the bone)
    const clear = (q: readonly number[]) => {
      const p = open.path, n = p.length;
      let best = Infinity, at = -1;
      for (let i = 0; i < n; i++) {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], l = Math.hypot(b[1] - a[1], b[2] - a[2]), along = Math.abs(((q[1] - p[i][1]) * (b[1] - a[1]) + (q[2] - p[i][2]) * (b[2] - a[2])) / l);
        if (along < best) { best = along; at = i; }
      }
      // (level with none of it: above its top or below her opening)
      if (best > 0.004) return Infinity;
      const a = p[Math.max(0, at - 1)], b = p[Math.min(n - 1, at + 1)], l = Math.hypot(b[1] - a[1], b[2] - a[2]), ty = (b[1] - a[1]) / l, tz = (b[2] - a[2]) / l;
      const dy = q[1] - p[at][1], dz = q[2] - p[at][2], behind = dy * tz - dz * ty, lat = q[0] - p[at][0], rad = Math.hypot(lat, behind) || 1e-9;
      const hw = r * open.narrowAcross![at], hd = r * open.narrow![at] * (behind > 0 ? open.back![at] : 1);
      return rad - (hw * hd) / Math.hypot((hd * lat) / rad, (hw * behind) / rad);
    };
    let level = 0;
    for (const q of [...rings.outlet.ring, ...rings.midpelvis.ring]) { const d = clear(q); if (Number.isFinite(d)) level++; expect(d).toBeGreaterThan(0.002); }
    expect(level).toBeGreaterThan(40);
    // (and where her doors hang it is as wide as they are -- their lining is its own -- however her arch narrows it above)
    { let s = 0; open.path.forEach((q, i) => { if (i) s += Math.hypot(q[1] - open.path[i - 1][1], q[2] - open.path[i - 1][2]); if (s <= DOORS.hingeUp + 1e-9) { expect(open.narrow![i]).toBe(1); expect(open.narrowAcross![i]).toBe(1); } }); }
    // (her tailbone's tip is a knob round its measured point: at 3 mm it stood through the canal's back wall)
    expect(off(torso.landmarks.coccyx, open.path)).toBeGreaterThan(r + 0.005);
    expect(OPEN_SEAT.archClear + OPEN_SEAT.tailClear).toBeLessThan(0.0115);
  });

  it('and her baby\'s way is straight down and a little back, then ONE turn forward out under her pubic bone, some 35 degrees (it turned 139; then 57 round the bone)', () => {
    const p = open.path, n = p.length;
    let total = 0, along = 0;
    for (let i = 1; i + 1 < n; i++) {
      const a = [p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]], b = [p[i + 1][1] - p[i][1], p[i + 1][2] - p[i][2]], la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
      const turn = Math.asin(Math.max(-1, Math.min(1, (a[0] * b[1] - a[1] * b[0]) / (la * lb))));
      along += la;
      // (a wide turn: its line's radius no tighter than 5 cm anywhere, and never bending back the other way -- no S, no jog)
      expect(Math.abs(turn)).toBeLessThan((la + lb) / 2 / 0.05);
      expect(turn * 180 / Math.PI).toBeGreaterThan(-0.1);
      // (where her doors hang it is straight: they are square to it)
      if (along + lb < DOORS.hingeUp) expect(Math.abs(turn) * 180 / Math.PI).toBeLessThan(0.1);
      total += turn;
    }
    // (in all it turns forward by 25 to 45 degrees)
    expect(total * 180 / Math.PI).toBeGreaterThan(25); expect(total * 180 / Math.PI).toBeLessThan(45);
    // (from her fornix it comes down on a straight line, a little BACK: 5 to 20 degrees off plumb, its top third without a bend)
    const lead = Math.atan2(-(p[n - 2][2] - p[n - 1][2]), -(p[n - 2][1] - p[n - 1][1])) * 180 / Math.PI;
    expect(lead).toBeGreaterThan(5); expect(lead).toBeLessThan(20);
    for (let i = Math.ceil((n * 2) / 3); i + 1 < n; i++) { const a = [p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]], b = [p[i + 1][1] - p[i][1], p[i + 1][2] - p[i][2]]; expect(Math.abs(a[0] * b[1] - a[1] * b[0]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]))).toBeLessThan(1e-6); }
    // (it passes her arch's plane -- from her pubic bone's lower edge to her sit bones -- further from the bone than a
    // moulded head needs, 6.7 cm: the room it has there)
    const S = rings.landmarks.symphysisBottom;
    expect(off(seat.pass, open.path)).toBeLessThan(1e-4);
    expect(Math.hypot(seat.pass[1] - S[1], seat.pass[2] - S[2])).toBeGreaterThan(0.067);
    // (and it is short: under 14 cm from her fornix to her opening -- it was 20.5 round her arch)
    let long = 0; for (let i = 1; i < n; i++) long += Math.hypot(p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]);
    expect(long).toBeLessThan(0.14);
    expect(Math.abs(p[0][0] - p[n - 1][0])).toBeLessThan(1e-6);
  });

  it('open, its back wall goes back to her spine: off the hollow of her sacrum and her tailbone, straight down below it, then forward in to her doors; its line and its front as they are without it (Joshua: "a little bit more room to go back to the spine"; then his yellow line down her spine)', () => {
    const back = open.back!, p = open.path, n = p.length, r = CANAL_OPENING.diameterM / 2, hollow = (pelvis as unknown as { sacrum: { front: number[][] } }).sacrum.front;
    expect(back).toBeDefined(); expect(back.length).toBe(n);
    // (its line and its front half are what they are without her sacrum's hollow)
    const { sacrum: _none, ...bare } = bones as typeof bones & { sacrum?: unknown }, plain = openCanal(laid.vagina, bare as typeof bones, 1, DOORS.hingeUp);
    void _none;
    expect(plain.back).toBeUndefined();
    plain.path.forEach((q, i) => q.forEach((v, c) => expect(v).toBeCloseTo(p[i][c], 12)));
    plain.narrow!.forEach((v, i) => expect(v).toBeCloseTo(open.narrow![i], 12));
    // (never less deep behind than in front; no deeper where her doors hang; over a centimetre deeper at its deepest)
    let along = 0;
    const wall: number[][] = [];
    p.forEach((q, i) => {
      if (i) along += Math.hypot(q[1] - p[i - 1][1], q[2] - p[i - 1][2]);
      expect(back[i]).toBeGreaterThanOrEqual(1);
      if (along < DOORS.hingeUp - 0.007) expect(back[i]).toBeCloseTo(1, 6);
      const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], l = Math.hypot(b[1] - a[1], b[2] - a[2]), ty = (b[1] - a[1]) / l, tz = (b[2] - a[2]) / l, nb = ty >= 0 ? [tz, -ty] : [-tz, ty], h = r * open.narrow![i] * back[i];
      wall.push([q[1] + nb[0] * h, q[2] + nb[1] * h, h]);
    });
    expect(Math.max(...wall.map((w) => w[2]))).toBeGreaterThan(r + 0.01);
    // (off her bone all the way: no point of it nearer the hollow's line than 5 mm -- spineClear is 8 -- and level with
    // her tailbone and her sacrum it lies along them, within 4 mm of spineClear off them)
    const off = (w: number[]) => { let best = Infinity; for (let k = 0; k + 1 < hollow.length; k++) { const a = hollow[k], b = hollow[k + 1], ey = b[1] - a[1], ez = b[2] - a[2], f = Math.min(1, Math.max(0, ((w[0] - a[1]) * ey + (w[1] - a[2]) * ez) / (ey * ey + ez * ez))); best = Math.min(best, Math.hypot(w[0] - a[1] - ey * f, w[1] - a[2] - ez * f)); } return best; };
    const tip = hollow[0];
    let beside = 0;
    for (const w of wall) {
      expect(off(w)).toBeGreaterThan(0.005);
      if (w[0] > tip[1] + 0.005) { beside++; expect(Math.abs(off(w) - OPEN_SEAT.spineClear)).toBeLessThan(0.004); }
    }
    expect(beside).toBeGreaterThan(3);
    // (below her tailbone it comes STRAIGHT DOWN as she stands before it turns forward: for 2 cm below her tailbone's tip
    // its wall keeps within 3 mm of plumb, and nowhere further back than there)
    const plumb = wall.filter((w) => w[0] < tip[1] && w[0] > tip[1] - 0.02), rear = Math.min(...wall.map((w) => w[1]));
    expect(plumb.length).toBeGreaterThan(1);
    for (const w of plumb) expect(w[1] - rear).toBeLessThan(0.003);
    // (and comes in to her canal's own wall where her doors hang, running forward all the way down from there -- to the
    // half millimetre its easing leaves where it leaves the plumb line)
    const below = wall.filter((w) => w[0] < tip[1] - 0.02);
    expect(below.length).toBeGreaterThan(4);
    for (let k = 1; k < below.length; k++) expect(below[k - 1][1]).toBeGreaterThan(below[k][1] - 0.0005);
    expect(below[0][1]).toBeGreaterThan(below[below.length - 1][1] + 0.01);
  });

  it('under a narrow arch -- a man\'s V -- the same way out; what passes is moulded as far as it may be, and her doors still hang under her sit bones', () => {
    // (her own bones, her arch's two sides and her sit bones drawn in to 70% of their width)
    const mid = rings.landmarks.symphysisBottom[0], pinchX = (q: readonly number[]) => [mid + (q[0] - mid) * 0.7, q[1], q[2]];
    const narrow = { ...bones, cm: { ...pelvis.cm, intertuberous: pelvis.cm.intertuberous * 0.7 }, outlet: { ...pelvis.outlet, ring: rings.outlet.ring.map(pinchX) }, landmarks: { ...pelvis.landmarks, tuberosityLeft: pinchX(rings.landmarks.tuberosityLeft), tuberosityRight: pinchX(rings.landmarks.tuberosityRight) } } as unknown as typeof bones;
    const top = laid.vagina.path[laid.vagina.path.length - 1], s = seatedCanal(narrow, mid, top, DOORS.hingeUp)!;
    expect(s).not.toBeNull();
    // (her sit bones are where they were front to back and as low: the line is the same line)
    s.path.forEach((q, i) => q.forEach((v, c) => expect(v).toBeCloseTo(seat.path[i][c], 9)));
    // (and between her arch's sides her canal is as narrow as a head may mould, which under her own arch it is not)
    const o = openCanal({ ...laid.vagina, path: s.path }, narrow, 1, DOORS.hingeUp), tight = (k: readonly number[]) => k.filter((v) => v < OPEN_SEAT.mould + 0.01).length;
    expect(Math.min(...o.narrowAcross!)).toBeCloseTo(OPEN_SEAT.mould, 6);
    expect(tight(o.narrowAcross!)).toBeGreaterThan(tight(open.narrowAcross!));
    expect(tight(open.narrowAcross!)).toBe(0);
  });
});

describe('her opening\'s doors', () => {
  const frame = doorFrame(laid.vagina.path);

  it('closed, the lips meet; pushed open, the opening is as wide as the open tube', () => {
    expect(doorOpening(0)).toBeLessThan(0.005);
    // (round the circle's widest: its 10 cm, the open tube's, to a fraction of a millimetre)
    expect(doorOpening(1)).toBeGreaterThan(CANAL_OPENING.diameterM - 0.0005);
    expect(doorMeshes(frame, 0).openM).toBeCloseTo(doorOpening(0), 9);
    const m = doorMeshes(frame, 1);
    expect(m.points.every(Number.isFinite)).toBe(true);
    expect(Math.max(...m.triangles)).toBeLessThan(m.points.length / 3);
  });

  it('a birth only ever opens them wider, from closed to the final push', () => {
    let last = 0;
    for (let b = 0; b <= 1.0001; b += 0.025) { const w = doorOpening(b); expect(w).toBeGreaterThanOrEqual(last - 1e-4); last = w; }
    expect(doorOpening(1)).toBeGreaterThan(CANAL_OPENING.diameterM - 0.0005);
  });

  it('let go, they close as a pneumatic door does: fast at first, slowing as they come to, never past shut', () => {
    let s = 1, last = 1, lastStep = Infinity;
    const steps: number[] = [];
    for (let k = 0; k < 120; k++) { s = swingDoors(s, 0, 1 / 60); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(last); steps.push(last - s); last = s; }
    for (let k = 1; k < 60; k++) { expect(steps[k]).toBeLessThanOrEqual(steps[k - 1] + 1e-12); lastStep = steps[k]; }
    expect(lastStep).toBeLessThan(steps[0] / 4);
    expect(s).toBeLessThan(0.01);
    // (pushed open they go where they are pushed, quickly)
    expect(swingDoors(0, 1, 0.2)).toBeGreaterThan(0.9);
    // (slow frames do not throw them)
    expect(swingDoors(0.5, 0, Number.NaN)).toBe(0.5);
  });

  it('folded back by hand: the lip\'s third first, then the middle, then the inner, then the main hinge, 30° each', () => {
    expect(foldAngles(0)).toEqual({ outer: 0, mid: 0, inner: 0, hinge: 0 });
    expect(foldAngles(0.25)).toEqual({ outer: DOORS.foldDeg, mid: 0, inner: 0, hinge: 0 });
    expect(foldAngles(0.5)).toEqual({ outer: DOORS.foldDeg, mid: DOORS.foldDeg, inner: 0, hinge: 0 });
    expect(foldAngles(1)).toEqual({ outer: DOORS.foldDeg, mid: DOORS.foldDeg, inner: DOORS.foldDeg, hinge: DOORS.foldDeg });
    // (each fold opens it further or, the lip's short last piece turning out past where it is narrowest, no less)
    const first = doorMeshes(frame, 0, 0).openM;
    let last = first;
    for (const f of [0.25, 0.5, 0.75, 1]) { const m = doorMeshes(frame, 0, f); expect(m.openM).toBeGreaterThanOrEqual(last - 1e-9); last = m.openM; }
    expect(last).toBeGreaterThan(first + 0.01);
    // (every station of every door as many points as the next: the mesh holds together however it folds)
    for (const [sw, f] of [[0, 1], [1, 1], [0.5, 0.6]]) {
      const m = doorMeshes(frame, sw, f);
      expect(m.points.every(Number.isFinite)).toBe(true);
      expect(Math.max(...m.triangles)).toBeLessThan(m.points.length / 3);
      // (the hand's fold on top of what the birth has laid)
      expect(m.angles.hinge).toBeLessThanOrEqual(birthAngles(sw).hinge + DOORS.foldDeg + 1e-9);
    }
  });

  it('a birth lays them round Joshua\'s 10 cm circle as it comes down: touching it, never inside it, the lips never past each other', () => {
    expect(BIRTH_HEAD.diameterM).toBe(0.1);
    expect(birthAngles(0)).toEqual({ hinge: 0, inner: 0, mid: 0, outer: 0 });
    let last = Infinity;
    for (let b = 0; b <= 1.0001; b += 0.05) {
      const h = birthHead(b), d = doorSection(birthAngles(b)), r = h.radiusM;
      // (it comes on down; what has come through stays as wide behind it)
      expect(h.centreT).toBeLessThan(last); last = h.centreT;
      const into = Math.max(...d.points.map(([x, t]) => (t >= h.centreT ? r - Math.abs(x) : r - Math.hypot(x, t - h.centreT))));
      expect(into).toBeLessThan(0.0002);
      expect(Math.min(...d.points.map((p) => p[0]))).toBeGreaterThan(DOORS.gap - 0.0002);
      // (pressed against it: its lining touching it)
      expect(Math.min(...d.points.slice(0, d.lining).map(([x, t]) => Math.hypot(x, t - h.centreT) - r))).toBeLessThan(0.0005);
    }
  });

  it('pushed by the circle the main hinge turns out and the folds in: a half sphere round it, the lips together, before they part', () => {
    const dome = [0.2, 0.3].map((b) => ({ a: birthAngles(b), open: doorOpening(b) }));
    for (const { a, open } of dome) {
      expect(a.hinge).toBeGreaterThan(20);
      // (its folds at its own corners: Joshua, 2026-11-08, "It should only bend at 4 points")
      expect(a.mid).toBeLessThan(-15);
      expect(a.outer).toBeLessThan(-10);
      expect(open).toBeLessThan(0.01);
    }
    // (by hand the lip goes first, out)
    expect(foldAngles(0.2).outer).toBeGreaterThan(0);
    expect(foldAngles(0.2).inner).toBe(0);
    expect(doorMeshes(frame, 0, 1).angles.hinge).toBeCloseTo(DOORS.foldDeg, 6);
  });

  it('her skin round them is one piece, its inner edge where the doors meet it however they stand', () => {
    for (const [b, f] of [[0, 0], [0.5, 0], [1, 0], [0, 1]]) {
      const m = doorMeshes(frame, b, f), rows = 9, C = m.skin.points.length / 3 / rows;
      expect(Number.isInteger(C)).toBe(true);
      // (round and closed: its last point joined to its first)
      expect(Math.max(...m.skin.triangles)).toBe(m.skin.points.length / 3 - 1);
      for (let c = 0; c < C; c++) {
        let best = Infinity;
        for (let i = 0; i < m.points.length; i += 3) best = Math.min(best, Math.hypot(m.points[i] - m.skin.points[3 * c], m.points[i + 1] - m.skin.points[3 * c + 1], m.points[i + 2] - m.skin.points[3 * c + 2]));
        expect(best).toBeLessThan(1e-6);
      }
    }
  });

  it('pushed by the whole baby as it comes through (a stand-in): never inside it, the lips never past each other, at most 12.5 by 10 cm, held round its neck and body until its feet are through, then closed', () => {
    // (head first: its head 9.5 cm across her and 10.5 front to back, born facing down; its shoulders turned front to back,
    // 12 cm, 8.5 across; on up 42 cm to its feet)
    const head = { x: 0.0475, t: 0.05, n: 0.0525 };
    const bodyHalf = (along: number) => (along < 0.12 ? 0.03 + ((along - 0.06) / 0.06) * 0.03 : 0.06 - Math.max(0, along - 0.3) * 0.25);
    const into = (x: number, t: number, n: number, c: number) => {
      const e = Math.hypot(x / head.x, (t - c) / head.t, n / head.n);
      let d = e < 1 ? (1 - e) * head.x : -1;
      const along = t - c;
      if (along >= 0.06 && along <= 0.42) { const w = bodyHalf(along), r = Math.hypot(x / (0.0425 * (w / 0.06)), n / w); if (r < 1) d = Math.max(d, Math.min((1 - r) * 0.0425 * (w / 0.06), 0.42 - along)); }
      return d;
    };
    const standIn = (c: number) => {
      const pts: number[] = [], put = (x: number, t: number, n: number) => pts.push(...[0, 1, 2].map((k) => frame.mouth[k] + frame.x[k] * x + frame.t[k] * t + frame.n[k] * n));
      for (let i = 0; i < 900; i++) { const u = Math.acos(1 - (2 * (i + 0.5)) / 900), v = i * 2.39996; put(head.x * Math.sin(u) * Math.cos(v), c + head.t * Math.cos(u), head.n * Math.sin(u) * Math.sin(v)); }
      for (let i = 0; i < 1200; i++) { const along = 0.06 + (0.36 * i) / 1200, w = bodyHalf(along), a = i * 2.39996; put(0.0425 * (w / 0.06) * Math.cos(a), c + along, w * Math.sin(a)); }
      // (its feet: the end of it closed)
      for (let i = 0; i < 200; i++) { const w = bodyHalf(0.42), r = Math.sqrt((i + 0.5) / 200), a = i * 2.39996; put(0.0425 * (w / 0.06) * r * Math.cos(a), c + 0.42, w * r * Math.sin(a)); }
      return Float32Array.from(pts);
    };
    const J = DOORS.stations, shut: Angles = { hinge: 0, inner: 0, mid: 0, outer: 0 };
    let want = { right: Array(J).fill(shut) as Angles[], left: Array(J).fill(shut) as Angles[], ends: ENDS_SHUT as Ends }, now = { ...want };
    let mostOpen = 0, mostLong = 0, bodyOpen = Infinity;
    for (let c = 0.12; c > -0.6; c -= 0.008) {
      const o = passingOutlines(frame, standIn(c), now.ends, Math.min(rimOf(want.right).t, rimOf(want.left).t));
      want = { right: pressDoorLine(o.right, want.right), left: pressDoorLine(o.left, want.left), ends: o.ends };
      // (where they are held, at the places they were cut: what is drawn there is checked against the baby)
      const m = doorMeshes(frame, 0, 0, { ...want, ends: now.ends });
      for (let i = 0; i < m.points.length; i += 3) {
        const d = [0, 1, 2].map((k) => m.points[i + k] - frame.mouth[k]), dot = (v: readonly number[]) => d[0] * v[0] + d[1] * v[1] + d[2] * v[2];
        expect(into(dot(frame.x), dot(frame.t), dot(frame.n), c)).toBeLessThan(0.002);
        // (the right door on its side of her middle, the left on its own -- the bands round her opening's ends, which join
        // them, aside: round the loop the right door's sections come first, then the front band, the left door, the back band)
        const C = 2 * J + 2 * (DOORS.bandSteps - 1), per = m.points.length / 3 / C, sec = Math.floor(i / 3 / per);
        if (sec < J) expect(dot(frame.x)).toBeGreaterThan(DOORS.gap - 0.0005);
        else if (sec >= J + DOORS.bandSteps - 1 && sec < 2 * J + DOORS.bandSteps - 1) expect(-dot(frame.x)).toBeGreaterThan(DOORS.gap - 0.0005);
      }
      mostOpen = Math.max(mostOpen, m.openM); mostLong = Math.max(mostLong, want.ends.front + want.ends.back);
      // (its body -- shoulders to hips -- in her opening)
      if (c < -0.1 && c > -0.3) bodyOpen = Math.min(bodyOpen, m.openM);
      now = { right: now.right.map((a, j) => followDoor(a, want.right[j], 1 / 60)), left: now.left.map((a, j) => followDoor(a, want.left[j], 1 / 60)), ends: followEnds(now.ends, o.ends, 1 / 60) };
    }
    expect(mostOpen).toBeLessThan(DOORS.acrossMost + 0.001);
    expect(mostLong).toBeLessThanOrEqual(DOORS.lengthMost + 1e-9);
    expect(mostLong).toBeGreaterThan(0.12);
    // (its head born, her opening tightens round what follows -- its neck and the top of its chest, outside her: Joshua,
    // 2026-11-08, choosing "the ring tightens round the neck after the head" -- but never closes on it)
    expect(bodyOpen).toBeGreaterThan(0.04);
    expect(bodyOpen).toBeLessThan(mostOpen - 0.02);
    // (through and let go: closed)
    expect(doorMeshes(frame, 0, 0, want).openM).toBeLessThan(0.005);
    for (let k = 0; k < 180; k++) now = { right: now.right.map((a, j) => followDoor(a, want.right[j], 1 / 60)), left: now.left.map((a, j) => followDoor(a, want.left[j], 1 / 60)), ends: followEnds(now.ends, ENDS_SHUT, 1 / 60) };
    expect(doorMeshes(frame, 0, 0, now).openM).toBeLessThan(0.005);
    expect(now.ends.front + now.ends.back).toBeCloseTo(DOORS.length, 3);
  }, 30_000); // (GAME TUNING: a long sweep, ~3 s here, past the 5 s default on the GitHub runner)
});

describe('her opening as lips (Joshua, 2026-11-11: "two lips that touch… flush with the skin")', () => {
  const frame = doorFrame(laid.vagina.path), flat = DOORS.hingeUp - DOORS.thick;
  // (how far a mesh stands out of her skin round it, along her canal, metres)
  const out = (m: { points: Float32Array }) => { let lo = Infinity; for (let i = 0; i < m.points.length; i += 3) { const d = [0, 1, 2].map((k) => m.points[i + k] - frame.mouth[k]); lo = Math.min(lo, d[0] * frame.t[0] + d[1] * frame.t[1] + d[2] * frame.t[2]); } return flat - lo; };

  it('shut, a slit 2 mm apart, bowed out 3 cm at its middle; parting, as wide as the doors open, never more than 4 cm out of her', () => {
    const shut = doorMeshes(frame, 0, 0, undefined, true);
    // (his "0% at 0.2cm"; bowed out 3 cm at its middle, his half dome, its lip standing a little past that)
    expect(shut.openM).toBeCloseTo(0.002, 4);
    expect(out(shut)).toBeGreaterThan(DOORS.lipsArch); expect(out(shut)).toBeLessThan(0.04);
    // (MEASURED, the doors swung out on their hinges: 3.7 cm shut, 5.7 at 20%, 7.6 wide open)
    expect(out(doorMeshes(frame, 0, 0, undefined, false))).toBeGreaterThan(0.03);
    let last = 0;
    for (const b of [0.2, 0.4, 0.5, 0.6, 0.8, 1]) {
      const m = doorMeshes(frame, b, 0, undefined, true);
      expect(m.points.every(Number.isFinite)).toBe(true);
      expect(Math.max(...m.triangles)).toBeLessThan(m.points.length / 3);
      if (b >= 0.2) expect(m.openM).toBeCloseTo(doorOpening(b), 3);
      expect(m.openM).toBeGreaterThanOrEqual(last - 1e-6); last = m.openM;
      expect(out(m)).toBeLessThan(0.04);
    }
  });

  it('round what passes: each lip off it, never past its hinge; nothing there, shut', () => {
    expect(sliderLips(0).every((x) => x <= DOORS.lipsShut + 1e-9)).toBe(true);
    // (a 6 cm ball at her skin)
    const pts: number[] = [], r = 0.03;
    for (let i = 0; i < 2000; i++) { const u = Math.acos(1 - (2 * (i + 0.5)) / 2000), v = i * 2.39996, x = r * Math.sin(u) * Math.cos(v), t = flat + r * Math.cos(u), n = r * Math.sin(u) * Math.sin(v); pts.push(...[0, 1, 2].map((k) => frame.mouth[k] + frame.x[k] * x + frame.t[k] * t + frame.n[k] * n)); }
    const l = passingLips(frame, Float32Array.from(pts)), mid = (DOORS.stations - 1) / 2;
    expect(l.right[mid]).toBeGreaterThan(r); expect(l.right[mid]).toBeLessThan(r + 0.01);
    expect(l.left[mid]).toBeGreaterThan(r);
    expect(l.right.every((x) => x <= CANAL_OPENING.diameterM / 2 + 1e-9)).toBe(true);
    const none = passingLips(frame, Float32Array.from([0, -5, 0, 0, -5, 0.01, 0.01, -5, 0]));
    expect(none.right.every((x) => x === DOORS.lipsShut)).toBe(true);
  });
});
