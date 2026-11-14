/**
 * WHEN A BIRTH CAN BE PLAYED, AND WHERE IT BEGINS (src/sarahlab/birthSequence.ts; Joshua, 2026-11-14: "It should be only
 * when pregnancy is on and the belly size is greater than 90%"; and of a birth played with BIRTH OPENING set by hand
 * first, "the opening didn't sync up as when I tried it, I set the start at 40% opening before I pressed it").
 */
import { describe, expect, it } from 'vitest';
import { BIRTH_NEEDS, BIRTH_TIMING, REALISTIC_STRETCH, birthAt, birthBeginsAt, birthLine, birthNeeds, birthPlan, canBirth } from '../src/sarahlab/birthSequence';

describe('when a birth can be played', () => {
  it('only while she is pregnant and her belly is over 90%', () => {
    expect(BIRTH_NEEDS.bellyOver).toBe(90);
    expect(canBirth(true, 150)).toBe(true);
    expect(canBirth(true, 91)).toBe(true);
    // (greater than 90: at 90 itself, not yet)
    expect(canBirth(true, 90)).toBe(false);
    expect(canBirth(true, 73)).toBe(false);
    expect(canBirth(false, 150)).toBe(false);
    expect(canBirth(true, NaN)).toBe(false);
    // (past the slider, her Depth's share of her size counts: pregnancy.ts `bellySize` runs to 215)
    expect(canBirth(true, 215)).toBe(true);
  });
  it('says what it needs first, one thing at a time: PREGNANT on, her belly, her position', () => {
    expect(birthNeeds(false, 150, 'recline')).toBe('BIRTH · not pregnant (PREGNANT · ON)');
    expect(birthNeeds(false, 20, 'stand')).toBe('BIRTH · not pregnant (PREGNANT · ON)');
    expect(birthNeeds(true, 73, 'recline')).toBe('BIRTH · her belly over 90% first (now 73%)');
    expect(birthNeeds(true, 90, 'stand')).toBe('BIRTH · her belly over 90% first (now 90%)');
    expect(birthNeeds(true, 150, 'stand')).toBe('BIRTH · from RECLINE or SQUAT');
    expect(birthNeeds(true, 150, 'apart')).toBe('BIRTH · from RECLINE or SQUAT');
  });
  it('can begin from RECLINE or SQUAT once she is', () => {
    expect(birthNeeds(true, 150, 'recline')).toBeNull();
    expect(birthNeeds(true, 91, 'squat')).toBeNull();
    expect(BIRTH_NEEDS.poses).toEqual(['recline', 'squat']);
  });
});

describe('a birth begun with her open already', () => {
  const T = BIRTH_TIMING, P = birthPlan();
  it('begins from the start when BIRTH OPENING is closed, exactly as it always did', () => {
    expect(birthBeginsAt(0)).toBe(0);
    expect(birthBeginsAt(T.cervixFrom)).toBe(0);
    for (let t = 0; t <= P.total; t += 0.37) expect(birthAt(t, 'fast', { openFrom: 0 })).toEqual(birthAt(t));
    for (let t = 0; t <= P.total; t += 0.37) expect(birthAt(t).held).toBe(0);
  });
  it('his case, the start at 40%: labour goes on from 4 cm, not from 1', () => {
    const at = birthBeginsAt(0.4);
    // (the second contraction: labour's own cervix is short of 4 cm as it starts, and past it as it ends)
    expect(at).toBe(T.labourEvery);
    expect(birthAt(at).cervix).toBeLessThan(0.4);
    expect(birthAt(at + T.labourEvery - 0.01).cervix).toBeGreaterThan(0.4);
    const m = birthAt(at, 'fast', { openFrom: 0.4 });
    expect(m.stage).toBe('labour');
    expect(m.cervix).toBeCloseTo(0.4, 9);
    expect(m.held).toBeCloseTo(0.4, 9);
    expect(birthLine(m, 4)).toBe('BIRTH · labour · Cervix 4.0 cm · not yet · Opening 4.0 cm');
    // (as it was: the same moment said a centimetre and a bit, with her drawn 4 cm open)
    expect(birthLine(birthAt(0), 4)).toBe('BIRTH · labour · Cervix 1.0 cm · not yet · Opening 4.0 cm');
  });
  it('her cervix is never less than she began, never closes, and is ten centimetres by the end of labour', () => {
    for (const from of [0.05, 0.25, 0.4, 0.7, 1]) {
      let last = 0;
      for (let t = 0; t < P.pushing; t += 0.1) { const c = birthAt(t, 'fast', { openFrom: from }).cervix; expect(c).toBeGreaterThanOrEqual(from - 1e-12); expect(c).toBeGreaterThanOrEqual(last - 1e-12); last = c; }
      expect(birthAt(P.pushing - 0.01, 'fast', { openFrom: from }).cervix).toBeGreaterThan(0.98);
      expect(birthAt(P.pushing + 1, 'fast', { openFrom: from }).cervix).toBe(1);
    }
  });
  it('begins at the start of a contraction, the one that takes her further', () => {
    for (let from = 0; from <= 1.0001; from += 0.01) {
      const at = birthBeginsAt(from);
      expect(at / T.labourEvery).toBeCloseTo(Math.round(at / T.labourEvery), 9);
      // (labour's own cervix there is no more than she is open: nothing of hers is taken back)
      expect(birthAt(at).cervix).toBeLessThanOrEqual(Math.max(from, T.cervixFrom) + 1e-9);
      expect(at).toBeLessThan(P.pushing);
    }
    // (later for more open, never earlier)
    let last = 0;
    for (let from = 0; from <= 1.0001; from += 0.01) { const at = birthBeginsAt(from); expect(at).toBeGreaterThanOrEqual(last); last = at; }
  });
  it('never begins after her baby\'s head has started to settle onto her cervix: it has to come down first', () => {
    for (const from of [0.6, 0.8, 0.95, 1]) {
      const at = birthBeginsAt(from);
      expect(birthAt(at, 'fast', { openFrom: from }).engage).toBe(0);
      expect(birthAt(at, 'fast', { openFrom: from }).down).toBe(0);
    }
    // (fully open by hand: labour's last contractions still bring its head down, her cervix ready all the while)
    const full = birthAt(birthBeginsAt(1), 'fast', { openFrom: 1 });
    expect(full.stage).toBe('labour');
    expect(full.cervix).toBe(1);
  });
  it('REALISTIC is the same, slower', () => {
    expect(birthBeginsAt(0.4, 'realistic')).toBeCloseTo(birthBeginsAt(0.4) * REALISTIC_STRETCH, 9);
    expect(birthAt(birthBeginsAt(0.4, 'realistic'), 'realistic', { openFrom: 0.4 }).cervix).toBeCloseTo(0.4, 9);
  });
  it('holds her opening where it began until her first baby\'s head is born, and not after', () => {
    const from = 0.4, ev = { openFrom: from };
    for (let t = 0; t <= P.birth; t += 0.25) expect(birthAt(t, 'fast', ev).held).toBeCloseTo(from, 9);
    // (let go as its head comes out: the birth has her wider than that there)
    let last = from;
    for (let t = P.birth; t <= P.birth + T.headOut; t += 0.05) { const h = birthAt(t, 'fast', ev).held; expect(h).toBeLessThanOrEqual(last + 1e-12); last = h; }
    for (let t = P.birth + T.headOut; t <= P.total; t += 0.25) expect(birthAt(t, 'fast', ev).held).toBe(0);
    // (so once it is born her opening eases back with the birth, not to where a slider stood)
    expect(birthAt(P.after + T.close, 'fast', ev).held).toBe(0);
  });
  it('twins and triplets: held for the first only -- the way is open for the next', () => {
    for (const count of [2, 3]) {
      const Pn = birthPlan({}, count), ev = { openFrom: 0.5 };
      expect(birthAt(Pn.babies[0].birth - 0.1, 'fast', ev, count).held).toBeCloseTo(0.5, 9);
      for (let i = 1; i < count; i++) for (let t = Pn.babies[i].pushing; t <= Pn.babies[i].after; t += 0.5) expect(birthAt(t, 'fast', ev, count).held).toBe(0);
    }
  });
  it('changes nothing else of the birth: where its head is, its turn, its stages', () => {
    const strip = ({ cervix: _c, held: _h, ...rest }: ReturnType<typeof birthAt>) => rest;
    for (let t = 0; t <= P.total; t += 0.41) expect(strip(birthAt(t, 'fast', { openFrom: 0.7 }))).toEqual(strip(birthAt(t)));
  });
  it('takes a start that is not a number as none', () => {
    expect(birthBeginsAt(NaN)).toBe(0);
    expect(birthAt(3, 'fast', { openFrom: NaN })).toEqual(birthAt(3));
    expect(birthAt(3, 'fast', { openFrom: null })).toEqual(birthAt(3));
    expect(birthAt(3, 'fast', { openFrom: 7 }).cervix).toBe(1);
  });
});
