/**
 * WHERE A DRAWN TOP'S RIM LEAVES THE CLEAVAGE BRIDGE (`src/sarahlab/cleavageBridge.ts` `skinSeen`, `tops`, `junction`).
 *
 * Under a DRAWN top (`topCut.ts`) the sheet between her breasts is cut by the top's rim at each pixel's rest place and
 * slip, as her skin is. Where the rim passes from her skin onto the sheet the two have to say the same place, or the
 * rim steps (Joshua, 2026-11-14: "the bridge skin between the breasts need to be able to work from the smallest to
 * maximum size the sliders allow"). At the sheet's top, where it goes back onto her, it lies on HER SKIN'S OWN POINTS:
 * under each of its columns the point of her skin seen there from her front, with that point's rest place and slip.
 *
 * Two tries before this one stepped, and both are what the last tests here hold off:
 * - the two straight runs from the sheet's ends to her middle skin, with their rest places spread along them (what a
 *   level-cut sheet's top lies on): MEASURED 2026-11-14 with her bust's SIZE at +100, the V's band jogged about half
 *   its width at the sheet's top;
 * - her skin's rest places read off its level line at each slice's height, with the sheet's rest heights set to the
 *   slice's level: a step of 2 to 3 mm at the V's point at her default bust, because a slice's ends stand up to 3 mm
 *   off its level and the sheet was laid from them.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CleavageBridge, skinSeen } from '../src/sarahlab/cleavageBridge';
import { BODY_REGIONS, type BodyMap } from '../src/sarahlab/bodyRegions';

/**
 * A strip of skin from x = -4 to +4 at rest, in columns one apart, its bottom at y = 0 and its top at y = 1 (two
 * triangles a column). Drawn, a column's x is `draw(x)`; its depth `deep(x)`.
 */
function strip(draw: (x: number) => number, deep: (x: number) => number = () => 0) {
  const rest: number[] = [], drawn: number[] = [], tris: number[] = [];
  for (let i = 0; i <= 8; i++) { const x = i - 4; rest.push(x, 0, 0, x, 1, 0); drawn.push(draw(x), 0, deep(x), draw(x), 1, deep(x)); }
  for (let i = 0; i < 8; i++) { const a = i * 2; tris.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  return { tris, restX: (v: number) => rest[v * 3], px: (v: number) => drawn[v * 3], py: (v: number) => drawn[v * 3 + 1], pz: (v: number) => drawn[v * 3 + 2] };
}
/** Stretched at its ends: a column at rest x is drawn at x + x|x| / 4 (so 1 -> 1.25, 2 -> 3, 4 -> 8). */
const stretch = (x: number) => x + (x * Math.abs(x)) / 4;
/** What her vertices carry (`value`), read at a point of her skin. */
const read = (s: { v: readonly number[]; w: readonly number[] }, value: (v: number) => number) => s.w[0] * value(s.v[0]) + s.w[1] * value(s.v[1]) + s.w[2] * value(s.v[2]);

describe('her skin as it is seen from her front', () => {
  it('finds the triangle that covers a place, and the place\'s shares of its corners', () => {
    const s = strip(stretch);
    for (const [x, y] of [[0.3, 0.2], [-5.1, 0.9], [7.4, 0.5], [2.99, 0.01], [-1.2, 0.66]] as const) {
      const spot = skinSeen(x, y, 1, s.tris, s.px, s.py, s.pz)!;
      expect(spot, `at ${x}, ${y}`).not.toBeNull();
      // its shares are of the triangle (none negative, one in all) and put the point back where it was asked for
      expect(spot.w[0] + spot.w[1] + spot.w[2]).toBeCloseTo(1, 12);
      for (const w of spot.w) expect(w).toBeGreaterThanOrEqual(-1e-6);
      expect(read(spot, s.px)).toBeCloseTo(x, 9);
      expect(read(spot, s.py)).toBeCloseTo(y, 9);
    }
    // off her skin: nothing
    expect(skinSeen(8.5, 0.5, 1, s.tris, s.px, s.py, s.pz)).toBeNull();
    expect(skinSeen(0, 1.2, 1, s.tris, s.px, s.py, s.pz)).toBeNull();
  });

  it('reads her skin\'s own rest place there: not evenly between its ends once she is stretched', () => {
    const s = strip(stretch);
    // at her drawn columns: their own rest places
    for (const x of [-3, -2, -1, 0, 1, 2, 3]) expect(read(skinSeen(stretch(x), 0.5, 1, s.tris, s.px, s.py, s.pz)!, s.restX), `at ${x}`).toBeCloseTo(x, 9);
    // the strip is drawn from -8 to 8: a quarter of the way across (drawn x = -4) is NOT a quarter of the way at rest
    // (-2), which is what spreading her rest places evenly between the ends would say -- her skin there is at -2.47
    const said = read(skinSeen(-4, 0.5, 1, s.tris, s.px, s.py, s.pz)!, s.restX);
    expect(said).toBeLessThan(-2.4); expect(said).toBeGreaterThan(-2.6);
    expect(Math.abs(said - -2)).toBeGreaterThan(0.4);
  });

  it('takes the skin that stands front-most where she folds over herself, whichever way she faces', () => {
    // a fold: her skin drawn doubled back, the half at rest x > 0 lying over the half at x < 0, in front of it
    const s = strip((x) => Math.abs(x), (x) => (x > 0 ? 1 : 0));
    const front = skinSeen(2.5, 0.5, 1, s.tris, s.px, s.py, s.pz)!, back = skinSeen(2.5, 0.5, -1, s.tris, s.px, s.py, s.pz)!;
    expect(read(front, s.restX)).toBeCloseTo(2.5, 9); expect(front.z).toBeCloseTo(1, 9);
    expect(read(back, s.restX)).toBeCloseTo(-2.5, 9); expect(back.z).toBeCloseTo(0, 9);
  });

  it('is not misled by skin seen edge-on', () => {
    // one column of the strip turned edge-on to her front (its two sides drawn at the same place across her)
    const s = strip((x) => (x === 1 ? 0 : x));
    const spot = skinSeen(0, 0.5, 1, s.tris, s.px, s.py, s.pz);
    // (the columns either side still cover the place; the edge-on one says nothing and breaks nothing)
    if (spot) for (const w of spot.w) expect(Number.isFinite(w)).toBe(true);
    expect(skinSeen(-0.5, 0.5, 1, s.tris, s.px, s.py, s.pz)).not.toBeNull();
  });
});

/**
 * A CHEST TO LAY THE SHEET ON: a sheet of skin 32 cm across from her hips' height to above her collarbones, two
 * breasts on it. `grow` is her bust's size: at rest (`fabricRest`) she has her default bust; drawn (her `position`,
 * which her shape sliders write) each breast stands `grow` further out and her skin over it has slid outward and down
 * with it, as a bust slider's shapes slide hers -- so where a point of her skin is drawn is not where it is at rest.
 * `slip` is what her skin's look-up adds for that (`fabricSlip`), laid when asked. One bone carries all of her; a morph
 * (`breath`) lifts her chest's front.
 */
function chest(grow: number, withSlip: boolean): { body: THREE.SkinnedMesh; map: BodyMap } {
  const NX = 64, NY = 110, W = 0.32, Y0 = 0.95, H = 0.55, TRUNK = 0.5;
  const n = (NX + 1) * (NY + 1), rest = new Float32Array(n * 3), drawn = new Float32Array(n * 3), slip = new Float32Array(n * 3), breath = new Float32Array(n * 3);
  // a breast: a round rise about (cx, 1.27), 5.5 cm in radius
  const bump = (x: number, y: number, cx: number) => Math.exp(-((x - cx) ** 2 + (y - 1.27) ** 2) / (2 * 0.045 ** 2));
  for (let k = 0; k <= NY; k++) for (let i = 0; i <= NX; i++) {
    const v = k * (NX + 1) + i, x = -W / 2 + (W * i) / NX, y = Y0 + (H * k) / NY;
    const l = bump(x, y, -0.07), r = bump(x, y, 0.07), b = l + r;
    rest.set([x, y, 0.1 + 0.045 * b], v * 3);
    // grown: further out, and her skin slid away from her middle and down with it
    const out = (Math.sign(x) || 0) * 0.35 * grow * b, down = -0.25 * grow * b;
    drawn.set([x + out, y + down, 0.1 + (0.045 + grow) * b], v * 3);
    if (withSlip) slip.set([0.6 * out, 0.6 * down, 0], v * 3);
    breath.set([0, 0, 0.012 * Math.exp(-((y - 1.33) ** 2) / (2 * 0.08 ** 2))], v * 3);
  }
  const index: number[] = [];
  for (let k = 0; k < NY; k++) for (let i = 0; i < NX; i++) { const a = k * (NX + 1) + i, b = a + 1, d = a + NX + 1, e = d + 1; index.push(a, b, d, b, e, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(drawn, 3));
  g.setAttribute('fabricRest', new THREE.BufferAttribute(rest, 3));
  g.setAttribute('fabricSlip', new THREE.BufferAttribute(slip, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from({ length: n * 4 }, (_, q) => (q % 4 === 0 ? 1 : 0)), 4));
  g.setIndex(index);
  g.computeVertexNormals();
  g.morphAttributes.position = [new THREE.BufferAttribute(breath, 3)];
  g.morphTargetsRelative = true;
  const body = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial()), bone = new THREE.Bone();
  body.add(bone);
  body.bind(new THREE.Skeleton([bone]));
  body.morphTargetInfluences = [0];
  body.updateMatrixWorld(true);
  // (her chest's region ends above her bust, where her cleavage has not yet closed -- as hers does: the sheet's last
  // slice still stands 5 to 13 mm off her middle skin there, and from it the sheet goes back onto her -- and begins
  // part of the way up her bust, with her skin running on below it)
  const chestId = BODY_REGIONS.findIndex((r) => r.id === 'chest') + 1, neckId = BODY_REGIONS.findIndex((r) => r.id === 'neck') + 1;
  const trunk = Float32Array.from({ length: n }, (_, v) => (rest[v * 3 + 1] - Y0) / TRUNK);
  const map = {
    region: Uint8Array.from(trunk, (t) => (t >= 0.56 && t <= 0.78 ? chestId : neckId)), front: new Int8Array(n).fill(1), arm: new Float32Array(n).fill(NaN),
    trunk, lateral: Float32Array.from({ length: n }, (_, v) => Math.abs(rest[v * 3]) / 0.05),
    trunkLength: TRUNK, neckRadius: 0.05, facing: 1,
  } as unknown as BodyMap;
  return { body, map };
}

/** The sheet laid on a chest under a top, and how it meets her skin (`junction`, in mm). */
function laid(grow: number, opts: { drawn: boolean; slip?: boolean }) {
  const { body, map } = chest(grow, !!opts.slip), bridge = new CleavageBridge(body, map);
  bridge.wear({ params: { neckFront: 0.94, neckStyle: 'crew' }, covered: () => 1, drawn: opts.drawn });
  bridge.reshape();
  bridge.update();
  return { body, bridge, meets: () => bridge.junction(1)! };
}
/** The furthest any column of a row is off her skin's own place (mm, across her and up her together), and the furthest it stands off her. */
const worst = (row: { cols: readonly (readonly [number, number, number] | null)[] }) => {
  let off = 0, apart = 0, n = 0;
  for (const c of row.cols) if (c) { off = Math.max(off, Math.hypot(c[0], c[1])); apart = Math.max(apart, Math.abs(c[2])); n++; }
  return { off, apart, n };
};

describe('a drawn top\'s sheet where it goes back onto her', () => {
  for (const [name, grow] of [['her smallest bust', -0.02], ['the bust she has at rest', 0], ['a large bust', 0.03], ['her largest', 0.06]] as const) {
    it(`lies on her skin's own points at its top, with their rest places and their slip: ${name}`, () => {
      const { bridge, meets } = laid(grow, { drawn: true, slip: true }), s = bridge.state(), rows = meets();
      expect(s.slices).toBeGreaterThan(8);
      expect(s.own).toBeGreaterThanOrEqual(3);
      const top = worst(rows[rows.length - 1]);
      // her skin is seen under every column of its top row; the sheet is on it, and says the place her skin says
      expect(top.n).toBe(13);
      expect(top.apart).toBeLessThan(0.05);
      expect(top.off).toBeLessThan(0.05);
      // and it comes off her evenly below that: over the 3 mm at its top where it fades into her (two rows of it), it
      // is still within a quarter of a millimetre of her skin's own place
      for (const row of rows.slice(-2)) expect(worst(row).off, `at ${row.t}`).toBeLessThan(0.25);
      // AT ITS BOTTOM, where it grows out of her cleavage, the same: its lowest row is on her skin, and no point of
      // the sheet anywhere is behind the skin that is seen there (it rises from her skin straight forward to the span)
      const bottom = worst(rows[0]);
      expect(bottom.n).toBe(13);
      expect(bottom.apart).toBeLessThan(0.05);
      expect(bottom.off).toBeLessThan(0.05);
      // (but for the two millimetres or so by which its ends, evened from slice to slice, sit inside her breasts' fronts)
      for (const row of rows) for (const q of row.cols) if (q) expect(q[2], `at ${row.t}`).toBeGreaterThan(-2.5);
      // BESIDE ITS ENDS, where the span runs along each breast before it leaves it, and wherever else the sheet is
      // seen within four millimetres of her skin -- as far as her skin behind it keeps its paint: it says the place
      // her skin says
      let lying = 0;
      for (const row of rows) row.cols.forEach((q, c) => {
        if (!q || !(row.solid[c] > 0.05) || Math.abs(q[2]) >= 4) return;
        lying++;
        expect(Math.hypot(q[0], q[1]), `at ${row.t}, column ${c}`).toBeLessThan(0.3);
      });
      expect(lying).toBeGreaterThan(20);
    });
  }

  it('is carried by her skin as she moves, without the spans being chosen again', () => {
    const { body, bridge, meets } = laid(0.03, { drawn: true, slip: true });
    body.morphTargetInfluences![0] = 1;
    bridge.update();
    const rows = meets(), top = worst(rows[rows.length - 1]);
    expect(top.n).toBe(13);
    expect(top.apart).toBeLessThan(0.05);
    expect(top.off).toBeLessThan(0.05);
  });

  it('is what the two straight runs to her middle skin were not, once her bust has grown', () => {
    // (a level-cut sheet's top: the same chest, the same measure. No slip is laid: a level-cut sheet has none.)
    const flat = worst(laid(0, { drawn: false }).meets().slice(-1)[0]), grown = worst(laid(0.06, { drawn: false }).meets().slice(-1)[0]);
    const own = worst(laid(0.06, { drawn: true }).meets().slice(-1)[0]);
    expect(grown.off).toBeGreaterThan(1);
    expect(grown.off).toBeGreaterThan(flat.off);
    expect(own.off).toBeLessThan(0.05);
    // and beside its ends, lying on her: the even spread between them is off her skin's own places by millimetres
    const beside = (drawn: boolean) => {
      const { bridge, meets } = laid(0.06, { drawn }), from = bridge.state().from!;
      let off = 0;
      for (const row of meets()) if (row.t >= from + 0.05) row.cols.forEach((q, c) => { if (q && row.solid[c] > 0.05 && Math.abs(q[2]) < 1.5) off = Math.max(off, Math.hypot(q[0], q[1])); });
      return off;
    };
    expect(beside(false)).toBeGreaterThan(1);
    expect(beside(true)).toBeLessThan(0.3);
  });

  it('keeps her weave where her skin has it: its rest place is her skin\'s without the slip, the slip beside it', () => {
    const { body, bridge } = laid(0.03, { drawn: true, slip: true });
    const g = bridge.mesh.geometry, R = g.getAttribute('fabricRest'), L = g.getAttribute('fabricSlip'), P = g.getAttribute('position');
    const rest = body.geometry.getAttribute('fabricRest'), slip = body.geometry.getAttribute('fabricSlip'), pos = body.geometry.getAttribute('position'), tris = body.geometry.index!.array;
    // the sheet's top row, each column against her skin seen at that place
    let slid = 0;
    for (let c = 0; c <= 12; c++) {
      const i = R.count - 13 + c, spot = skinSeen(P.getX(i), P.getY(i), 1, tris, (v) => pos.getX(v), (v) => pos.getY(v), (v) => pos.getZ(v))!;
      expect(R.getX(i)).toBeCloseTo(read(spot, (v) => rest.getX(v)), 4);
      expect(R.getY(i)).toBeCloseTo(read(spot, (v) => rest.getY(v)), 4);
      expect(L.getX(i)).toBeCloseTo(read(spot, (v) => slip.getX(v)), 5);
      expect(L.getY(i)).toBeCloseTo(read(spot, (v) => slip.getY(v)), 5);
      slid = Math.max(slid, Math.hypot(L.getX(i), L.getY(i)));
    }
    // (and her skin has slid there: the test would pass on a chest with no slip otherwise)
    expect(slid).toBeGreaterThan(0.0005);
  });

  it('finds her skin under the sheet when a drawn top is put on over a level-cut one, with no change of her shape between', () => {
    const { body, map } = chest(0.06, true), bridge = new CleavageBridge(body, map), top = { params: { neckFront: 0.94, neckStyle: 'crew' as const }, covered: () => 1 };
    bridge.wear({ ...top, drawn: false });
    bridge.update();
    expect(worst(bridge.junction(1)!.slice(-1)[0]).apart).toBeGreaterThan(1);
    bridge.wear({ ...top, drawn: true });
    bridge.update();
    const rows = bridge.junction(1)!;
    expect(worst(rows[rows.length - 1]).apart).toBeLessThan(0.05);
    expect(worst(rows[0]).apart).toBeLessThan(0.05);
    // ...and back: the level-cut sheet's own again
    bridge.wear({ ...top, drawn: false });
    bridge.update();
    expect(worst(bridge.junction(1)!.slice(-1)[0]).apart).toBeGreaterThan(1);
  });

  it('leaves a level-cut top\'s sheet as it was: no slip, its top on the two straight runs', () => {
    const { bridge } = laid(0.03, { drawn: false, slip: true }), L = bridge.mesh.geometry.getAttribute('fabricSlip');
    expect(Array.from(L.array as Float32Array).every((x) => x === 0)).toBe(true);
  });
});
