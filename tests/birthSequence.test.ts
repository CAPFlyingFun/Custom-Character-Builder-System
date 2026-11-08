import { describe, expect, it } from 'vitest';
import { BIRTH_TIMING, birthAt, birthLength, birthLine, birthPlan, cervixLine, REALISTIC_STRETCH, SHOULDER_TILT, TURN_DEG } from '../src/sarahlab/birthSequence';

describe('birth timeline', () => {
  const P = birthPlan();
  it('runs labour, pushing, crowning, birth, after in order', () => {
    expect(birthAt(1).stage).toBe('labour');
    expect(birthAt(P.pushing + 1).stage).toBe('pushing');
    expect(birthAt(P.crowning + 1).stage).toBe('crowning');
    expect(birthAt(P.birth + 0.5).stage).toBe('birth');
    expect(birthAt(P.after + 1).stage).toBe('after');
    expect(birthAt(P.placenta + 0.1).stage).toBe('afterbirth');
    expect(birthAt(P.total + 1).stage).toBe('afterbirth');
  });
  it('opens her cervix to ten centimetres through labour, and only then does the head come down', () => {
    expect(birthAt(0).cervix).toBeCloseTo(BIRTH_TIMING.cervixFrom, 5);
    expect(birthAt(P.pushing - 0.01).cervix).toBeGreaterThan(0.98);
    for (let t = 0; t < P.pushing; t += 0.5) expect(birthAt(t).down).toBe(0);
  });
  it('the head comes down with each push and slips back a little between, never past its last step', () => {
    let peak = 0, slipped = false;
    for (let t = P.pushing; t < P.crowning; t += 0.1) {
      const d = birthAt(t).down;
      if (d < peak - 1e-4) slipped = true;
      peak = Math.max(peak, d);
    }
    expect(slipped).toBe(true);
    expect(peak).toBeLessThanOrEqual(BIRTH_TIMING.pushReach + 1e-6);
    expect(birthAt(P.birth - 0.01).down).toBeGreaterThan(0.99);
  });
  it('turns the head round to her side coming down, all of it before her opening, and not at all once out', () => {
    expect(birthAt(P.pushing).turnDeg).toBeCloseTo(45, 3);
    for (let t = P.pushing; t <= P.total; t += 0.05) {
      const m = birthAt(t);
      // (inside her, still short of her opening -- its middle three quarters of the way -- the turn is done)
      if (m.down >= 0.75) expect(Math.abs(m.turnDeg - TURN_DEG.born)).toBeLessThan(1e-6);
    }
  });
  it('REALISTIC is the same birth, slower', () => {
    expect(birthLength('realistic')).toBeCloseTo(birthLength('fast') * REALISTIC_STRETCH, 6);
    expect(birthAt(P.crowning * REALISTIC_STRETCH + 1, 'realistic').stage).toBe('crowning');
  });
  it('cuts its cord on its own a while after it is settled on her, and the placenta follows a while after the cut', () => {
    const onHer = P.after + 0.5 + BIRTH_TIMING.toHer;
    expect(P.cut).toBeCloseTo(onHer + BIRTH_TIMING.cutAfter, 6);
    expect(birthAt(P.cut - 0.01).cut).toBe(false);
    expect(birthAt(P.cut + 0.01).cut).toBe(true);
    expect(birthAt(P.cut + 0.01).cutAt).toBeCloseTo(P.cut, 6);
    expect(P.placenta).toBeCloseTo(P.cut + BIRTH_TIMING.placentaAfterCut, 6);
    expect(birthAt(P.placenta - 0.01).placentaFor).toBeLessThan(0);
    expect(birthAt(P.placenta - 0.01).separate).toBe(0);
    // the whole timeline reaches past the placenta into its bowl and her womb settled after it
    expect(P.total).toBeGreaterThan(P.placentaOut + BIRTH_TIMING.placentaBowl);
    expect(birthAt(P.total).bowl).toBe(1);
    expect(birthAt(P.total).afterbirth).toBeCloseTo(1, 6);
  });
  it('CUT CORD and DELIVER PLACENTA are moments on the clock: sooner, never before they can be', () => {
    const navel = P.navelOut;
    // (a cut asked for before its navel is out waits for it; one asked for later than its own time is its own time)
    expect(birthPlan({ cutAt: navel - 5 }).cut).toBeCloseTo(navel, 6);
    expect(birthPlan({ cutAt: P.cut + 30 }).cut).toBeCloseTo(P.cut, 6);
    const at = navel + 2, Q = birthPlan({ cutAt: at });
    expect(Q.cut).toBeCloseTo(at, 6);
    expect(birthAt(at - 0.01, 'fast', { cutAt: at }).cut).toBe(false);
    expect(birthAt(at + 0.01, 'fast', { cutAt: at }).cut).toBe(true);
    // (the placenta follows its own time after the sooner cut; asked for sooner still, it starts then -- never before the cut)
    expect(Q.placenta).toBeCloseTo(at + BIRTH_TIMING.placentaAfterCut, 6);
    expect(birthPlan({ cutAt: at, placentaAt: at + 1 }).placenta).toBeCloseTo(at + 1, 6);
    expect(birthPlan({ cutAt: at, placentaAt: at - 3 }).placenta).toBeCloseTo(at, 6);
    // (REALISTIC: the same moments, five times the seconds)
    expect(birthAt((at + 0.01) * REALISTIC_STRETCH, 'realistic', { cutAt: at }).cut).toBe(true);
  });
  it('the placenta peels off, comes down her canal and out, into the bowl -- each only forward -- with mild contractions', () => {
    let was = { separate: 0, down: 0, bowl: 0, after: 0 }, squeezed = 0;
    for (let t = P.placenta; t <= P.total; t += 0.05) {
      const m = birthAt(t);
      expect(m.separate).toBeGreaterThanOrEqual(was.separate - 1e-9);
      expect(m.placentaDown).toBeGreaterThanOrEqual(was.down - 1e-9);
      expect(m.bowl).toBeGreaterThanOrEqual(was.bowl - 1e-9);
      expect(m.afterbirth).toBeGreaterThanOrEqual(was.after - 1e-9);
      // (it starts down her canal only once it has peeled off, and into the bowl only once it is out of her)
      if (m.placentaDown > 0) expect(m.separate).toBeCloseTo(1, 6);
      if (m.bowl > 0) expect(m.placentaDown).toBeCloseTo(2, 6);
      squeezed = Math.max(squeezed, m.contraction);
      was = { separate: m.separate, down: m.placentaDown, bowl: m.bowl, after: m.afterbirth };
    }
    expect(squeezed).toBeGreaterThan(0.3);
    expect(squeezed).toBeLessThanOrEqual(BIRTH_TIMING.placentaSqueeze + 1e-9);
    expect(was.down).toBe(2);
  });
  it('says where she is', () => {
    expect(birthLine(null)).toBe('BIRTH · not started');
    expect(birthLine(birthAt(0))).toBe('BIRTH · labour · Cervix 1.0 cm · not yet');
    expect(birthLine(birthAt(birthPlan().pushing + 0.01), 2.7)).toBe('BIRTH · pushing · Cervix 10.0 cm · ready to push · Opening 2.7 cm');
    expect(cervixLine(0.27)).toBe('Cervix 2.7 cm · not yet');
  });
});

// ---------------------------------------------------------------- P3: twins and triplets, born one at a time
import { MULTIPLE_TIMING } from '../src/sarahlab/birthSequence';

describe('twins and triplets: the same birth, once a baby in turn', () => {
  const T = BIRTH_TIMING, M = MULTIPLE_TIMING;
  it('one baby is exactly the birth it always was', () => {
    const one = birthPlan(), two = birthPlan({}, 1);
    expect(two.total).toBe(one.total);
    for (const t of [3, 50, 90, 100, 130, 160]) expect(birthAt(t, 'fast', {}, 1)).toEqual(birthAt(t));
    expect(birthAt(10).count).toBe(1);
  });
  it('counts its babies: no fewer than one, no more than three', () => {
    expect(birthPlan({}, 0).babies).toHaveLength(1);
    expect(birthPlan({}, 2).babies).toHaveLength(2);
    expect(birthPlan({}, 7).babies).toHaveLength(3);
  });
  it('twins: one labour, then A born, a rest while B turns head down and settles, then B born with fewer pushes', () => {
    const P = birthPlan({}, 2), [A, B] = P.babies;
    expect(A.pushing).toBe(birthPlan().pushing);
    expect(B.pushing).toBeCloseTo(A.after + M.between, 9);
    expect(B.crowning - B.pushing).toBeCloseTo(M.pushCount * T.pushEvery, 9);
    expect(B.birth - B.crowning).toBeCloseTo(M.crowning, 9);
    // B waits curled until A is out; turns, then settles
    expect(birthAt(A.birth, 'fast', {}, 2).babies[1].lieTurn).toBe(0);
    expect(birthAt(B.turnFrom - 0.01, 'fast', {}, 2).babies[1].lieTurn).toBe(0);
    expect(birthAt(B.engageFrom, 'fast', {}, 2).babies[1].lieTurn).toBeCloseTo(1, 6);
    expect(birthAt(B.engageFrom, 'fast', {}, 2).babies[1].engage).toBe(0);
    expect(birthAt(B.pushing, 'fast', {}, 2).babies[1].engage).toBeCloseTo(1, 6);
    // whose turn: A until it is born, then B (the top of the moment follows B: her opening is about B)
    expect(birthAt(A.birth + 1, 'fast', {}, 2).active).toBe(0);
    const rest = birthAt(A.after + 5, 'fast', {}, 2);
    expect(rest.active).toBe(1); expect(rest.stage).toBe('after'); expect(rest.down).toBe(0);
    expect(rest.babies[0].born).toBe(true); expect(rest.babies[1].born).toBe(false);
    const coming = birthAt(B.crowning - 1, 'fast', {}, 2);
    expect(coming.stage).toBe('pushing'); expect(coming.down).toBe(coming.babies[1].down); expect(coming.down).toBeGreaterThan(0.3);
    expect(coming.babies[0].onHer).toBe(1);
    expect(birthAt(B.after + 1, 'fast', {}, 2).babies[1].born).toBe(true);
  });
  it("her opening has eased back after A before B's pushing starts", () => {
    const [A, B] = birthPlan({}, 2).babies;
    expect(B.pushing - A.after).toBeGreaterThanOrEqual(T.close);
    expect(birthAt(B.pushing - 0.01, 'fast', {}, 2).closing).toBeGreaterThan(0.99);
  });
  it('each turns to the other side from the one before', () => {
    const P = birthPlan({}, 3);
    const born = birthAt(P.babies[2].after + 1, 'fast', {}, 3).babies.map((b) => b.turnDeg);
    expect(born).toEqual([TURN_DEG.born, -TURN_DEG.born, TURN_DEG.born]);
  });
  it('each cord is its own: a press cuts what is out, a later baby keeps its own time', () => {
    const P = birthPlan({}, 2), [A, B] = P.babies;
    const at = A.navelOut + 2, Q = birthPlan({ cuts: [at] }, 2);
    expect(Q.babies[0].cut).toBeCloseTo(at, 9);
    expect(Q.babies[1].cut).toBeCloseTo(B.cut, 9);
    const at2 = B.navelOut + 1, R = birthPlan({ cuts: [at, at2] }, 2);
    expect(R.babies[1].cut).toBeCloseTo(at2, 9);
    expect(R.babies[0].cut).toBeCloseTo(at, 9);
  });
  it('the placentas come after the last baby, one a baby, one after another, into the bowl', () => {
    const P = birthPlan({}, 2), lastCut = Math.max(...P.babies.map((b) => b.cut));
    expect(P.placenta).toBeCloseTo(lastCut + T.placentaAfterCut, 9);
    expect(P.placentas).toHaveLength(2);
    expect(P.placentas[1] - P.placentas[0]).toBeCloseTo(M.placentaGap, 9);
    const mid = birthAt(P.placentas[1] - 0.5, 'fast', {}, 2);
    expect(mid.placentas[0].separate).toBeGreaterThan(0); expect(mid.placentas[1].separate).toBe(0);
    const end = birthAt(P.total, 'fast', {}, 2);
    expect(end.placentas.map((p) => p.bowl)).toEqual([1, 1]);
    expect(end.afterbirth).toBeCloseTo(1, 6);
    // DELIVER PLACENTA never before the last baby's cut
    expect(birthPlan({ placentaAt: P.babies[0].cut + 1 }, 2).placenta).toBeCloseTo(lastCut, 9);
  });
  it('her belly settles by what is out: half after one twin, all after both', () => {
    const P = birthPlan({}, 2), [A, B] = P.babies;
    expect(birthAt(A.after + T.close + 0.5, 'fast', {}, 2).delivered).toBeCloseTo(0.5, 6);
    expect(birthAt(B.after + T.close + 0.5, 'fast', {}, 2).delivered).toBeCloseTo(1, 6);
  });
  it('triplets take longer, and the line says whose turn it is', () => {
    expect(birthLength('fast', 3)).toBeGreaterThan(birthLength('fast', 2));
    expect(birthLength('fast', 2)).toBeGreaterThan(birthLength('fast', 1));
    const P = birthPlan({}, 3), [A, B] = P.babies;
    expect(birthLine(birthAt(A.crowning + 1, 'fast', {}, 3))).toContain('baby A · crowning');
    expect(birthLine(birthAt(A.after + 3, 'fast', {}, 3))).toContain('baby A born · B next');
    expect(birthLine(birthAt(B.birth + 1, 'fast', {}, 3))).toContain('baby B · birth');
    expect(birthLine(birthAt(P.total, 'fast', {}, 3))).toContain('3 of 3');
  });
});

describe("a triplet's third: cut first, then into the bassinet", () => {
  it('has its cord cut soon after it is born, and is lifted away only after the cut', () => {
    const P = birthPlan({}, 3), C = P.babies[2], M = MULTIPLE_TIMING;
    expect(C.cut).toBeCloseTo(C.after + 0.5 + M.cutFirst, 9);
    expect(birthAt(C.cut - 0.01, 'fast', {}, 3).babies[2].onHer).toBe(0);
    expect(birthAt(C.cut + 1 + BIRTH_TIMING.toHer + 0.01, 'fast', {}, 3).babies[2].onHer).toBe(1);
    // (the twins before it still lie on her the way one baby does)
    expect(P.babies[0].cut).toBeCloseTo(birthPlan().cut, 9);
  });
});

describe('the accurate turn (v3, Joshua 2026-11-08: "Accurate on v3")', () => {
  const P = birthPlan(), T = BIRTH_TIMING, out = P.birth + T.headOut, body = out + T.restitution;
  it('born facing down, then turning out of her to face her thigh, its shoulders one above the other', () => {
    expect(birthAt(P.pushing, 'fast', {}, 1, 'accurate').turnDeg).toBeCloseTo(TURN_DEG.inWomb, 6);
    // (round to her front coming down her pelvis: crowning and born facing down)
    for (let t = P.crowning; t <= out; t += 0.25) expect(Math.abs(birthAt(t, 'fast', {}, 1, 'accurate').turnDeg)).toBeLessThan(1e-6);
    // (the quarter turn in the pause, only out of her)
    let last = 0;
    for (let t = out; t <= body; t += 0.1) { const d = birthAt(t, 'fast', {}, 1, 'accurate').turnDeg; expect(d).toBeGreaterThanOrEqual(last - 1e-9); last = d; }
    expect(birthAt(body, 'fast', {}, 1, 'accurate').turnDeg).toBeCloseTo(TURN_DEG.born, 6);
    expect(birthAt(P.after + 1, 'fast', {}, 1, 'accurate').turnDeg).toBeCloseTo(TURN_DEG.born, 6);
    // (a twin to her other side)
    expect(birthAt(P.after + 1, 'fast', {}, 2, 'accurate').babies.map((b) => Math.sign(b.turnDeg))).toEqual([1, -1]);
  });

  it('its top shoulder out first, its body dipped toward her tailbone, then its bottom one, lifted; none for v2', () => {
    const tilt = (v: number) => birthAt(body + v * T.bodyOut, 'fast', {}, 1, 'accurate').shoulderTiltDeg;
    expect(tilt(-0.1)).toBe(0);
    expect(tilt(SHOULDER_TILT.downAt)).toBeCloseTo(-SHOULDER_TILT.down, 6);
    expect(tilt(SHOULDER_TILT.upAt)).toBeCloseTo(SHOULDER_TILT.up, 6);
    expect(tilt(1.01)).toBe(0);
    for (let t = 0; t < P.total; t += 0.5) expect(birthAt(t).shoulderTiltDeg).toBe(0);
    // (v2's turn as it was: all of it inside her)
    expect(birthAt(P.birth + 0.5).turnDeg).toBeCloseTo(TURN_DEG.born, 6);
    // (its head out only to its chin while it turns, its shoulders still in her; v2's a third of it out)
    expect(birthAt(out, 'fast', {}, 1, 'accurate').down).toBeCloseTo(1 + SHOULDER_TILT.headOut, 6);
    expect(birthAt(out).down).toBeCloseTo(1.35, 6);
    expect(birthAt(P.after, 'fast', {}, 1, 'accurate').down).toBe(2);
  });
});
