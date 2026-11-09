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
import { BIRTH_OPENING, CANAL_OPENING, canalMouth, cervixAt, headPassage, openCanal, tightest } from '../src/actor/birthCanal';
import { BIRTH_HEAD, DOORS, ENDS_SHUT, birthAngles, birthHead, doorFrame, doorMeshes, doorOpening, doorSection, foldAngles, followDoor, followEnds, passingOutlines, pressDoorLine, rimOf, swingDoors, type Angles, type Ends } from '../src/actor/birthDoors';
import { CERVIX, layOrgans, lengthOf } from '../src/actor/pelvicOrgans';
import { growWomb } from '../src/actor/pregnantWomb';

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T;
const pelvis = read<Parameters<typeof layOrgans>[0] & Parameters<typeof headPassage>[0] & Parameters<typeof openCanal>[1]>('../src/data/pelvis/skeleton.json');
const torso = read<Parameters<typeof growWomb>[1] & { landmarks: { coccyx: number[] } }>('../src/data/torso/skeleton.json');
const laid = layOrgans(pelvis);

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
    const closed = openCanal(laid.vagina, pelvis, 0), open = openCanal(laid.vagina, pelvis, 1);
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
  });
});
