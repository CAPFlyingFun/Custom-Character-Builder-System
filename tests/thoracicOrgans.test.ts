/**
 * HER LUNGS, HER HEART AND HER DIAPHRAGM (the skeleton-outward plan, Phase 2: "two blended shapes filling the ribcage;
 * the diaphragm a dome under them... the diaphragm drops and the lungs fill on each breath. Heart: a blended teardrop
 * between the lungs, tilted left"), laid in a rib cage built here: an egg of bone about as big as her skeleton's own
 * (28 cm wide, 20 cm deep, 30 cm tall outside), narrowing to its top, open in front below the breastbone as her costal
 * margin is, with her spine up its back and her breastbone down its front.
 */
import { describe, expect, it } from 'vitest';
import { BREATH, DIAPHRAGM, HEART, LUNGS, THORAX_MEASURE, diaphragmAt, diaphragmMesh, heartMesh, insideHeart, layThorax, lungMesh, lungVolume, measureThorax, meshVolume, sectionAt, thoraxSpineAt } from '../src/actor/thoracicOrgans';
import type { OrganMesh } from '../src/actor/pelvicOrgans';

/** The egg: its middle line [x0, zc], its bottom y0, and half its width and depth at its widest. */
const CAGE = { x0: 0.004, y0: 1.1, zc: -0.04, height: 0.3, halfW: 0.14, halfD: 0.1, sternum: [0.3, 0.92] as const, spineDeep: 0.035 };
/** how wide it is at `v` of its height (0 bottom .. 1 top), as a share of its widest: widest a third of the way up */
const girth = (v0: number, v = Math.min(1, Math.max(0, v0))) => (v < 0.35 ? 0.9 + 0.1 * Math.sin((Math.PI / 2) * (v / 0.35)) : 0.42 + 0.58 * Math.cos((Math.PI / 2) * ((v - 0.35) / 0.65)) ** 0.8);
function ribCage(): Float32Array {
  const C = CAGE, p: number[] = [];
  for (let y = C.y0; y <= C.y0 + C.height + 1e-9; y += 0.004) {
    const v = (y - C.y0) / C.height, k = girth(v), open = v < C.sternum[0] ? 0.55 + 0.45 * (v / C.sternum[0]) : 1;
    // her ribs: round the egg, but not across her front's middle, nor in front below her breastbone
    for (let d = 0; d < 360; d += 3) {
      const c = Math.cos((d * Math.PI) / 180), s = Math.sin((d * Math.PI) / 180), x = C.halfW * k * c;
      if ((s > 0 && Math.abs(x) < 0.03) || s > open) continue;
      p.push(C.x0 + x, y, C.zc + C.halfD * k * s);
    }
    // her spine up its back, its bodies standing into her chest; her breastbone down its front
    for (let x = -0.018; x <= 0.0181; x += 0.009) for (let z = -0.01; z <= C.spineDeep + 1e-4; z += 0.005) p.push(C.x0 + x, y, C.zc - C.halfD * k + z);
    if (v >= C.sternum[0] && v <= C.sternum[1]) for (let x = -0.015; x <= 0.0151; x += 0.005) p.push(C.x0 + x, y, C.zc + C.halfD * k + 0.002);
  }
  return Float32Array.from(p);
}
/** whether (x, y, z) is inside the egg's own bone */
const inEgg = (x: number, y: number, z: number) => { const k = girth((y - CAGE.y0) / CAGE.height); return ((x - CAGE.x0) / (CAGE.halfW * k)) ** 2 + ((z - CAGE.zc) / (CAGE.halfD * k)) ** 2 < 1; };
const each = (m: OrganMesh, f: (x: number, y: number, z: number) => void) => { for (let i = 0; i < m.points.length; i += 3) f(m.points[i], m.points[i + 1], m.points[i + 2]); };
const sound = (m: OrganMesh) => {
  expect(m.points.length % 3).toBe(0); expect(m.triangles.length % 3).toBe(0);
  for (const v of m.points) expect(Number.isFinite(v)).toBe(true);
  const n = m.points.length / 3; for (const i of m.triangles) expect(i).toBeLessThan(n);
};

const T = measureThorax(ribCage());

describe('the inside of her rib cage, measured on her bones', () => {
  it('finds its walls slice by slice, a rib\'s thickness inside the bone', () => {
    expect(T.sections.length).toBeGreaterThan(24);
    for (let k = 1; k < T.sections.length; k++) expect(T.sections[k].y).toBeGreaterThan(T.sections[k - 1].y);
    const widest = T.sections.reduce((a, b) => (b.left - b.right > a.left - a.right ? b : a)), top = T.sections[T.sections.length - 1];
    expect(widest.left - widest.right).toBeCloseTo(2 * (CAGE.halfW - THORAX_MEASURE.rib), 2);
    expect(widest.front - widest.back).toBeGreaterThan(2 * CAGE.halfD - 0.03); expect(widest.front - widest.back).toBeLessThan(2 * CAGE.halfD);
    expect((widest.left + widest.right) / 2).toBeCloseTo(CAGE.x0, 2);
    // narrowing to its top
    expect(top.left - top.right).toBeLessThan(0.6 * (widest.left - widest.right));
    expect(T.apex).toBeCloseTo(top.y, 6); expect(T.apex).toBeGreaterThan(CAGE.y0 + CAGE.height - 0.02);
    // every slice's walls inside the bone they were measured from
    for (const s of T.sections) { const k = girth((s.y - CAGE.y0) / CAGE.height); expect(s.left).toBeLessThan(CAGE.x0 + CAGE.halfW * k); expect(s.right).toBeGreaterThan(CAGE.x0 - CAGE.halfW * k); expect(s.front).toBeLessThan(CAGE.zc + CAGE.halfD * k + 0.002); expect(s.back).toBeGreaterThan(CAGE.zc - CAGE.halfD * k); }
  });
  it('finds her breastbone\'s two ends and the front of her spine', () => {
    expect(T.xiphoid[1]).toBeCloseTo(CAGE.y0 + CAGE.sternum[0] * CAGE.height, 2);
    expect(T.sternumTop[1]).toBeCloseTo(CAGE.y0 + CAGE.sternum[1] * CAGE.height, 2);
    expect(T.xiphoid[0]).toBeCloseTo(CAGE.x0, 2);
    expect(T.xiphoid[2]).toBeGreaterThan(CAGE.zc + 0.05);
    expect(T.spineFront.length).toBeGreaterThan(24);
    for (const [y, z] of T.spineFront) { const back = CAGE.zc - CAGE.halfD * girth((y - CAGE.y0) / CAGE.height); expect(z).toBeGreaterThan(back + CAGE.spineDeep - 0.02); expect(z).toBeLessThan(back + CAGE.spineDeep + 0.02); }
  });
  it('takes no stray point for a wall, and says so when there is no rib cage', () => {
    const p = Array.from(ribCage()); p.push(0.5, 1.25, 0, NaN, 1.25, 0);
    const s = sectionAt(measureThorax(p), 1.25), was = sectionAt(T, 1.25);
    expect(s.left).toBeCloseTo(was.left, 2); expect(s.right).toBeCloseTo(was.right, 2);
    expect(() => measureThorax([0, 1, 0, 0.01, 1, 0])).toThrow();
  });
});

describe('her chest, laid out', () => {
  const breaths = [0, 0.5, 1, 2, BREATH.most];
  it('her diaphragm is a double dome on her lower ribs, the right higher than the left, dropping as she breathes in', () => {
    const L = layThorax(T), d = L.diaphragm, [left, right] = d.domes;
    expect(left.x).toBeGreaterThan(L.mid); expect(right.x).toBeLessThan(L.mid);
    expect(right.top - left.top).toBeCloseTo(DIAPHRAGM.rightHigher, 3);
    expect(diaphragmAt(L, right.x, right.z)).toBeCloseTo(right.top, 4);
    // its central part between them a little lower, its rim lower still: at her breastbone's tip in front, lowest behind
    expect(d.central).toBeLessThan(left.top); expect(d.central).toBeGreaterThan(d.rimFront);
    expect(d.rimFront).toBeCloseTo(T.xiphoid[1], 6); expect(d.rimBack).toBeLessThan(d.rimFront);
    const m = diaphragmMesh(L); sound(m);
    let low = Infinity, high = -Infinity;
    each(m, (x, y, z) => { low = Math.min(low, y); high = Math.max(high, y); expect(inEgg(x, y, z)).toBe(true); expect(y).toBeCloseTo(diaphragmAt(L, x, z), 5); });
    expect(low).toBeCloseTo(d.rimBack, 3); expect(high).toBeCloseTo(right.top, 2);
    // a quiet breath in: the domes down by the measured 1.6 cm, the central part less; a deep one further, never inside out
    const inn = layThorax(T, 1).diaphragm, deep = layThorax(T, 99).diaphragm;
    expect(right.top - inn.domes[1].top).toBeCloseTo(DIAPHRAGM.quietDrop, 3);
    expect(d.central - inn.central).toBeGreaterThan(0.005); expect(d.central - inn.central).toBeLessThan(DIAPHRAGM.quietDrop);
    expect(layThorax(T, 99).breath).toBe(BREATH.most); expect(layThorax(T, -3).breath).toBe(0);
    expect(right.top - deep.domes[1].top).toBeGreaterThan(0.04); expect(deep.domes[1].top).toBeGreaterThan(deep.rimBack + 0.01);
  });
  it('her heart rests on it between her lungs, two thirds of it on her left, its apex down, forward and left', () => {
    const L = layThorax(T), h = L.heart;
    expect(2 * h.radii[0]).toBeCloseTo(HEART.length, 6); expect(2 * h.radii[1]).toBeCloseTo(HEART.width, 6); expect(2 * h.radii[2]).toBeCloseTo(HEART.thickness, 6);
    expect(h.apex[0]).toBeGreaterThan(h.base[0] + 0.04); expect(h.apex[1]).toBeLessThan(h.base[1] - 0.05); expect(h.apex[2]).toBeGreaterThan(h.base[2] + 0.04);
    const tilt = (Math.asin((h.base[1] - h.apex[1]) / HEART.length) * 180) / Math.PI;
    expect(tilt).toBeGreaterThan(39.9); expect(tilt).toBeLessThan(45.1);
    // (how much of it lies left of her midline: counted over a grid of points through it)
    let all = 0, left = 0;
    for (let a = -0.07; a <= 0.07; a += 0.002) for (let b = -0.07; b <= 0.07; b += 0.002) for (let c = -0.07; c <= 0.07; c += 0.002) if (insideHeart(L, h.centre[0] + a, h.centre[1] + b, h.centre[2] + c)) { all++; if (h.centre[0] + a > L.mid) left++; }
    expect(left / all).toBeCloseTo(HEART.leftShare, 1);
    for (const b of breaths) {
      const B = layThorax(T, b), m = heartMesh(B); sound(m);
      let lift = Infinity;
      each(m, (x, y, z) => { lift = Math.min(lift, y - diaphragmAt(B, x, z)); expect(inEgg(x, y, z)).toBe(true); expect(z).toBeLessThan(sectionAt(T, y).front); expect(z).toBeGreaterThan(thoraxSpineAt(T, y) + 0.01); expect(insideHeart(B, x, y, z, 1e-4)).toBe(true); });
      expect(lift).toBeGreaterThan(0); expect(lift).toBeLessThan(0.012);
    }
    // it rides down on her diaphragm as she breathes in; a beat draws it in a few percent
    expect(layThorax(T, 1).heart.centre[1]).toBeLessThan(h.centre[1] - 0.005);
    const slack = meshVolume(heartMesh(L)), tight = meshVolume(heartMesh(L, 1));
    expect(slack * 1e6).toBeGreaterThan(200); expect(slack * 1e6).toBeLessThan(310);
    expect(tight / slack).toBeGreaterThan(0.8); expect(tight / slack).toBeLessThan(0.95);
    expect(heartMesh(L, 1).points.length).toBe(heartMesh(L).points.length);
  });
  it('her lungs fill her rib cage inside its walls, off her heart, her diaphragm, her spine and each other', () => {
    for (const b of breaths) {
      const L = layThorax(T, b);
      for (const side of [1, -1] as const) {
        const m = lungMesh(L, side); sound(m);
        let low = Infinity, high = -Infinity;
        each(m, (x, y, z) => {
          const s = sectionAt(T, y);
          low = Math.min(low, y); high = Math.max(high, y);
          // inside her ribs at its own height (the slice's walls, and the bone itself), a pleura's gap off them
          expect(x).toBeLessThan(s.left - 0.5 * LUNGS.pleura); expect(x).toBeGreaterThan(s.right + 0.5 * LUNGS.pleura); expect(z).toBeLessThan(s.front); expect(z).toBeGreaterThan(s.back);
          expect(inEgg(x, y, z)).toBe(true);
          // on her own side of her midline; not in her heart, under her diaphragm, or in her spine
          expect(side * (x - L.mid)).toBeGreaterThan(0.015);
          expect(insideHeart(L, x, y, z)).toBe(false);
          expect(y).toBeGreaterThan(diaphragmAt(L, x, z) + 0.5 * LUNGS.pleura);
          expect(Math.abs(x - L.mid) < LUNGS.spineHalf && z < thoraxSpineAt(T, y)).toBe(false);
        });
        // from the diaphragm's dome up to her first rib
        expect(high).toBeGreaterThan(T.apex - 0.012); expect(high).toBeLessThanOrEqual(T.apex);
        expect(low).toBeLessThan(L.diaphragm.domes[side > 0 ? 0 : 1].top);
      }
    }
  });
  it('the left lung is hollowed for her heart, and the right lung is the bigger', () => {
    const L = layThorax(T), v = lungVolume(L), h = L.heart;
    expect(v.right).toBeGreaterThan(v.left); expect(v.right / v.both).toBeLessThan(0.6);
    expect(v.both).toBeCloseTo(v.left + v.right, 6);
    // (the cardiac notch: beside her heart's middle the left lung's inner face stands further off her midline than above it)
    const inner = (side: -1 | 1, y0: number, y1: number) => { let x = Infinity; each(lungMesh(L, side), (px, py, pz) => { if (py > y0 && py < y1 && Math.abs(pz - h.centre[2]) < 0.02) x = Math.min(x, side * (px - L.mid)); }); return x; };
    expect(inner(1, h.centre[1] - 0.015, h.centre[1] + 0.015)).toBeGreaterThan(inner(1, T.apex - 0.06, T.apex - 0.03) + 0.015);
    expect(inner(1, h.centre[1] - 0.015, h.centre[1] + 0.015)).toBeGreaterThan(inner(-1, h.centre[1] - 0.015, h.centre[1] + 0.015) + 0.01);
  });
  it('they hold what a woman\'s lungs hold, and a quiet breath draws about the tidal volume', () => {
    const out = lungVolume(layThorax(T, 0)).both, inn = lungVolume(layThorax(T, 1)).both, deep = lungVolume(layThorax(T, BREATH.most)).both;
    // at the end of a quiet breath out: more than the air alone then (1.8 L: they are tissue and blood as well), less than her lungs brim-full (4.2 L)
    expect(out).toBeGreaterThan(LUNGS.restMl); expect(out).toBeLessThan(LUNGS.totalMl);
    // a quiet breath in: about half a litre more (a wide allowance: the egg is not her)
    expect(inn - out).toBeGreaterThan(0.5 * LUNGS.tidalMl); expect(inn - out).toBeLessThan(1.6 * LUNGS.tidalMl);
    // deeper, more; never past brim-full and their own tissue
    expect(deep).toBeGreaterThan(inn + LUNGS.tidalMl); expect(deep).toBeLessThan(LUNGS.totalMl + LUNGS.grams);
    let was = out;
    for (const b of [0.25, 0.5, 0.75, 1, 1.5, 2, 3]) { const v = lungVolume(layThorax(T, b)).both; expect(v).toBeGreaterThan(was); was = v; }
  });
  it('every mesh keeps its points and triangles whatever her breath, so a view only moves them', () => {
    const a = layThorax(T, 0), b = layThorax(T, 1);
    for (const [m, n] of [[lungMesh(a, 1), lungMesh(b, 1)], [lungMesh(a, -1), lungMesh(b, -1)], [heartMesh(a), heartMesh(b, 0.7)], [diaphragmMesh(a), diaphragmMesh(b)]] as const) {
      sound(m); sound(n);
      expect(n.points.length).toBe(m.points.length); expect(Array.from(n.triangles)).toEqual(Array.from(m.triangles));
      expect(m.points.length / 3).toBeGreaterThanOrEqual(300); expect(m.points.length / 3).toBeLessThanOrEqual(600);
      let moved = 0; for (let i = 0; i < m.points.length; i++) moved = Math.max(moved, Math.abs(m.points[i] - n.points[i]));
      expect(moved).toBeGreaterThan(0.002); expect(moved).toBeLessThan(0.03);
    }
  });
});
