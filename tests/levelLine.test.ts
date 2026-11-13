/**
 * A LEVEL LINE UNDER THE BRUSH (`src/sarahlab/levelLine.ts`; Joshua, 2026-11-12: "can we have an option when painting to
 * draw straight lines probably both either room level or body level?").
 *
 * - The level on one triangle: the piece between two edges, a corner on it, an edge along it; the far side and what is
 *   hidden are left out; the point is ON her rest surface and exactly at the height.
 * - A stroke on a body (a ring of skin, seen from in front): the finger wanders and every dab stays at the height the
 *   stroke started at -- her own rest height (BODY LEVEL) or her height in the room as she leans (ROOM LEVEL); a fast drag
 *   is followed in steps; off her, or out of reach, nothing is dabbed.
 * - A stroke that starts on the last line carries it on at exactly its height; one that starts elsewhere starts its own.
 */
import { describe, expect, it } from 'vitest';
import {
  LINE_CARRY_PX, LINE_MODES, LINE_STEP_PX, LevelMesh, LevelStroke, levelPoint, lineModeLine, lineModeNote, nextLineMode, type LevelHost, type LevelView, type LineMode,
} from '../src/sarahlab/levelLine';

describe('level line: the button', () => {
  it('steps FREE, BODY LEVEL, ROOM LEVEL and round again, and says which', () => {
    expect(LINE_MODES).toEqual(['free', 'body', 'room']);
    expect(nextLineMode('free')).toBe('body');
    expect(nextLineMode('body')).toBe('room');
    expect(nextLineMode('room')).toBe('free');
    expect(LINE_MODES.map(lineModeLine)).toEqual(['LINE · FREE', 'LINE · BODY LEVEL', 'LINE · ROOM LEVEL']);
    expect(lineModeNote('body')).toMatch(/her own body/);
    expect(lineModeNote('room')).toMatch(/floor/);
  });
});

describe('level line: the level on a triangle', () => {
  /** One triangle facing the eye (+z): corners at (0,0), (2,0), (0,2) in x and y; a unit of her is 100 pixels, y up the screen. */
  const view = (heights: [number, number, number], rest = [0, 0, 0, 2, 0, 0, 0, 2, 0]): LevelView => ({
    rest, index: [0, 1, 2], height: heights,
    x: [rest[0] * 100, rest[3] * 100, rest[6] * 100], y: [-rest[1] * 100, -rest[4] * 100, -rest[7] * 100], eye: [5, 5, 5],
    normal: [0, 0, 1, 0, 0, 1, 0, 0, 1],
  });

  it('is the piece from one edge to another, and the point of it nearest the finger', () => {
    // heights are her y: the level at 1 runs from (0,1) to (1,1)
    const v = view([0, 0, 2]);
    const p = levelPoint(v, [0], 1, 50, -130)!;
    expect(p.centre.x).toBeCloseTo(0.5, 12); expect(p.centre.y).toBeCloseTo(1, 12); expect(p.centre.z).toBe(0);
    expect(p.px).toBeCloseTo(50, 9); expect(p.py).toBeCloseTo(-100, 9); expect(p.off).toBeCloseTo(30, 9);
    expect(p.normal).toEqual([0, 0, 1]);
    expect(p.triangle).toBe(0);
    // past the piece's end the finger takes the end
    const q = levelPoint(v, [0], 1, 400, -100)!;
    expect(q.centre.x).toBeCloseTo(1, 12); expect(q.centre.y).toBeCloseTo(1, 12);
    // a level the triangle does not reach
    expect(levelPoint(v, [0], 2.5, 50, -100)).toBeNull();
    expect(levelPoint(v, [0], -0.1, 50, -100)).toBeNull();
    expect(levelPoint(v, [], 1, 50, -100)).toBeNull();
  });

  it('takes a corner on the level once, and an edge along it whole', () => {
    // corner 0 is on the level 0; the piece runs from it to the far edge's crossing... which is the whole edge 0-1 here
    const along = levelPoint(view([0, 0, 2]), [0], 0, 150, 40)!;
    expect(along.centre.x).toBeCloseTo(1.5, 12); expect(along.centre.y).toBeCloseTo(0, 12);
    // heights 1, 0, 2: the level 1 goes from corner 0 to the middle of the edge opposite
    const v = view([1, 0, 2]), p = levelPoint(v, [0], 1, 50, -50)!;
    expect(p.centre.x).toBeCloseTo(0.5, 12); expect(p.centre.y).toBeCloseTo(0.5, 12);
    // only a corner touches the level: no piece to paint along
    expect(levelPoint(view([1, 2, 3]), [0], 1, 0, 0)).toBeNull();
  });

  it('leaves out the far side of her, a corner behind the eye, and what cannot be seen', () => {
    const v = view([0, 0, 2]);
    expect(levelPoint(v, [0], 1, 50, -100, [0, 0, 1])).not.toBeNull();
    expect(levelPoint(v, [0], 1, 50, -100, [0, 0, -1])).toBeNull();        // facing away from her skin under the finger
    expect(levelPoint(v, [0], 1, 50, -100, [1, 0, 0])).not.toBeNull();      // side on is still hers
    expect(levelPoint({ ...v, eye: [5, -1, 5] }, [0], 1, 50, -100)).toBeNull();
    expect(levelPoint(v, [0], 1, 50, -100, null, () => false)).toBeNull();
    // two triangles at the level: the nearer on screen is hidden, so the other is taken
    const two: LevelView = {
      rest: [0, 0, 0, 2, 0, 0, 0, 2, 0, 5, 0, 0, 7, 0, 0, 5, 2, 0], index: [0, 1, 2, 3, 4, 5], height: [0, 0, 2, 0, 0, 2],
      x: [0, 200, 0, 500, 700, 500], y: [0, 0, -200, 0, 0, -200], eye: [5, 5, 5, 9, 9, 9], normal: null,
    };
    expect(levelPoint(two, [0, 1], 1, 60, -100)!.triangle).toBe(0);
    const seen = levelPoint(two, [0, 1], 1, 60, -100, null, (_x, _y, eye) => eye > 6)!;
    expect(seen.triangle).toBe(1);
    expect(seen.centre.x).toBeCloseTo(5, 12);
    expect(seen.normal).toEqual([0, 0, 1]); // (no normals of her own: the triangle's face)
  });

});

describe("level line: her skin's joins", () => {
  it('gives the stretch of skin a vertex is on: across a seam, and not a sheet that only lies near', () => {
    // a strip of four triangles (0..3) with a seam down its middle (vertices 2 and 6 stand in one place, 3 and 7 in another),
    // and a sheet of two (4, 5) lying 1 mm over it, joined to nothing
    const rest = [
      0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,         // 0..3: the left quad
      2, 0, 0, 2, 1, 0, 1, 1, 0, 1, 0, 0,         // 4, 5 its right neighbour's far corners; 6 = 2 and 7 = 1 again, the seam's other side
      0, 0, 0.001, 1, 0, 0.001, 1, 1, 0.001, 0, 1, 0.001, // 8..11: the sheet over the left quad
    ];
    const index = [0, 1, 2, 0, 2, 3, 7, 4, 5, 7, 5, 6, 8, 9, 10, 8, 10, 11];
    const mesh = new LevelMesh(rest, index), all = [0, 1, 2, 3, 4, 5];
    expect(mesh.joined(all, 0).sort()).toEqual([0, 1, 2, 3]);   // across the seam
    expect(mesh.joined(all, 4).sort()).toEqual([0, 1, 2, 3]);
    expect(mesh.joined(all, 8).sort()).toEqual([4, 5]);         // the sheet is its own
    expect(mesh.joined([1, 4, 5], 3)).toEqual([1]);             // only among the triangles given, and never the sheet
    expect(mesh.joined([0, 2, 3], 3)).toEqual([]);              // ...so with none of the vertex's own given, nothing is reached
    expect(mesh.joined([], 0)).toEqual([]);
    expect(mesh.joined(all, 99)).toEqual([]);
    // asked twice, it answers the same (its marks are its own)
    expect(mesh.joined(all, 0).sort()).toEqual([0, 1, 2, 3]);
  });

  it("so a level behind her skin under the finger is not painted through it: her hip behind her hanging hand", () => {
    // her hand (triangle 0) hangs in front of her hip (triangle 1): the same place on screen, the hip a pixel nearer the finger
    const view: LevelView = {
      rest: [0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, -0.5, 2, 0, -0.5, 0, 2, -0.5], index: [0, 1, 2, 3, 4, 5], height: [0, 0, 2, 0, 0, 2],
      x: [0, 200, 0, 0, 200, 0], y: [0, 0, -200, 1, 1, -199], eye: [4, 4, 4, 4.5, 4.5, 4.5], normal: null,
    };
    expect(levelPoint(view, [0, 1], 1, 60, -98)!.triangle).toBe(1); // every piece looked at: the hip's, a pixel nearer
    const mesh = new LevelMesh(view.rest, view.index);
    expect(levelPoint(view, mesh.joined([0, 1], 0), 1, 60, -98)!.triangle).toBe(0); // her hand is under the finger: her hand's
    expect(levelPoint(view, mesh.joined([0, 1], 3), 1, 60, -98)!.triangle).toBe(1);
  });
});

describe('level line: a stroke on her', () => {
  /**
   * A ring of skin: radius 0.15, from 1.0 to 1.4 up, 96 round and a row every centimetre (so a vertex is always within
   * the brush's 8 pixels of the finger, as on her). `lean` tips her about the axis toward the eye (radians), as a pose
   * would: her rest shape stays upright. Seen from in front (+z), 1000 pixels a unit.
   */
  function ring(lean = 0) {
    const around = 96, rows = 41, rest: number[] = [], normal: number[] = [], index: number[] = [];
    for (let r = 0; r < rows; r++) for (let a = 0; a < around; a++) { const t = (a / around) * Math.PI * 2; rest.push(0.15 * Math.sin(t), 1 + r * 0.01, 0.15 * Math.cos(t)); normal.push(Math.sin(t), 0, Math.cos(t)); }
    for (let r = 0; r + 1 < rows; r++) for (let a = 0; a < around; a++) { const b = (a + 1) % around, i = r * around + a, j = r * around + b, k = (r + 1) * around + a, l = (r + 1) * around + b; index.push(i, j, l, i, l, k); }
    const n = rest.length / 3, c = Math.cos(lean), s = Math.sin(lean), world: number[] = [], x: number[] = [], y: number[] = [], eye: number[] = [];
    // (leaning: turned about z through her middle at 1.2 up)
    for (let i = 0; i < n; i++) { const px = rest[i * 3], py = rest[i * 3 + 1] - 1.2; const wx = c * px - s * py, wy = s * px + c * py + 1.2; world.push(wy); x.push(500 + wx * 1000); y.push(1500 - wy * 1000); eye.push(2 - rest[i * 3 + 2]); }
    const restY = Array.from({ length: n }, (_, i) => rest[i * 3 + 1]);
    const view = (mode: LineMode): LevelView => ({ rest, index, height: mode === 'room' ? world : restY, x, y, eye, normal });
    const pick = (px: number, py: number) => { let best = -1, bd = Infinity; for (let i = 0; i < n; i++) { if ((x[i] - px) ** 2 + (y[i] - py) ** 2 > 64) continue; if (eye[i] < bd) { bd = eye[i]; best = i; } } return best; };
    const triangles = Array.from({ length: index.length / 3 }, (_, t) => t);
    const host: LevelHost = {
      pick,
      // (every triangle with a corner within reach of the vertex, at rest)
      near: (vertex, reach) => triangles.filter((t) => [0, 1, 2].some((k) => { const v = index[t * 3 + k]; return Math.hypot(rest[v * 3] - rest[vertex * 3], rest[v * 3 + 1] - rest[vertex * 3 + 1], rest[v * 3 + 2] - rest[vertex * 3 + 2]) <= reach + 0.03; })),
      facing: (v) => [normal[v * 3], normal[v * 3 + 1], normal[v * 3 + 2]],
      visible: (px, py, e) => { const front = pick(px, py); return front < 0 || e <= eye[front] + 0.06; },
      least: 0.02, most: 0.15,
    };
    /** Her height in the room at a point of her rest surface. */
    const roomHeight = (p: { x: number; y: number; z: number }) => s * p.x + c * (p.y - 1.2) + 1.2;
    return { view, host, pick, restY, world, x, y, roomHeight };
  }

  it('BODY LEVEL: the finger wanders, the dabs stay at the height the stroke started at, on the side that is seen', () => {
    const b = ring(), stroke = new LevelStroke();
    stroke.begin();
    const first = stroke.at('body', b.view('body'), b.host, 420, 300);
    expect(first).toHaveLength(1);
    const h = stroke.held!.height;
    expect(h).toBe(b.restY[b.pick(420, 300)]);
    let dabs = first.length;
    for (let px = 424; px <= 580; px += 4) {
      const py = 300 + 28 * Math.sin((px - 420) / 17); // 2.8 cm up and down
      const places = stroke.at('body', b.view('body'), b.host, px, py);
      for (const p of places) {
        dabs++;
        expect(p.centre.y).toBeCloseTo(h, 10);                                   // exactly on the level
        const radius = Math.hypot(p.centre.x, p.centre.z);
        expect(radius).toBeGreaterThan(0.15 * Math.cos(Math.PI / 96) - 1e-9); expect(radius).toBeLessThanOrEqual(0.15 + 1e-9); // on her skin
        expect(p.centre.z).toBeGreaterThan(0);                                   // the side toward the eye
        expect(p.py).toBeCloseTo(1500 - h * 1000, 6);                            // a level line across the screen
        expect(Math.hypot(p.normal[0], p.normal[1], p.normal[2])).toBeCloseTo(1, 9);
      }
      // (the last of them is under the finger, across; those before it are the way there)
      expect(places.length).toBeGreaterThan(0);
      expect(Math.abs(places[places.length - 1].px - px)).toBeLessThan(0.5);
    }
    expect(dabs).toBeGreaterThanOrEqual(41);
    stroke.end();
    expect(stroke.held).toEqual({ mode: 'body', height: h });
  });

  it('ROOM LEVEL: she leans, and the line is level with the floor, not with her', () => {
    const b = ring(0.35), stroke = new LevelStroke();
    stroke.begin();
    stroke.at('room', b.view('room'), b.host, 440, 320);
    const h = stroke.held!.height;
    const body: number[] = [];
    for (let px = 444; px <= 560; px += 4) for (const p of stroke.at('room', b.view('room'), b.host, px, 320 + 20 * Math.cos(px / 9))) {
      expect(b.roomHeight(p.centre)).toBeCloseTo(h, 9);
      expect(p.py).toBeCloseTo(1500 - h * 1000, 6);  // level across the screen
      body.push(p.centre.y);
    }
    expect(body.length).toBeGreaterThan(20);
    // ...which on her own body is a slanted line: its two ends some centimetres apart in her rest height
    expect(Math.max(...body) - Math.min(...body)).toBeGreaterThan(0.03);
    // the same stroke held to her BODY is level on her and slanted in the room
    const own = new LevelStroke();
    own.begin();
    own.at('body', b.view('body'), b.host, 440, 320);
    const room: number[] = [];
    for (let px = 444; px <= 560; px += 4) for (const p of own.at('body', b.view('body'), b.host, px, 320 + 20 * Math.cos(px / 9))) { expect(p.centre.y).toBeCloseTo(own.held!.height, 10); room.push(b.roomHeight(p.centre)); }
    expect(Math.max(...room) - Math.min(...room)).toBeGreaterThan(0.03);
  });

  it('follows a fast drag in steps, and dabs nothing off her or out of reach', () => {
    const b = ring(), stroke = new LevelStroke();
    stroke.begin();
    stroke.at('body', b.view('body'), b.host, 400, 300);
    const fast = stroke.at('body', b.view('body'), b.host, 520, 300);
    expect(fast.length).toBe(Math.ceil(120 / LINE_STEP_PX));
    for (let k = 1; k < fast.length; k++) expect(fast[k].px - fast[k - 1].px).toBeCloseTo(LINE_STEP_PX, 6);
    // off her altogether: nothing, and the next dab does not run back across the gap
    expect(stroke.at('body', b.view('body'), b.host, 900, 300)).toEqual([]);
    expect(stroke.at('body', b.view('body'), b.host, 560, 300)).toHaveLength(1);
    // straight up and down beside the line: the line has not moved on, so nothing more is laid on that spot of it
    expect(stroke.at('body', b.view('body'), b.host, 560, 330)).toEqual([]);
    expect(stroke.at('body', b.view('body'), b.host, 560, 290)).toEqual([]);
    expect(stroke.at('body', b.view('body'), b.host, 566, 290)).toHaveLength(1);
    // the finger 18 cm from the level: further than it may stray
    expect(stroke.at('body', b.view('body'), b.host, 566, 480)).toEqual([]);
    // FREE dabs nothing here: the brush does that itself
    expect(new LevelStroke().at('free', b.view('body'), b.host, 500, 300)).toEqual([]);
  });

  it('carries the last line on when a stroke starts on it, and starts another anywhere else', () => {
    const b = ring(), stroke = new LevelStroke();
    stroke.begin(); stroke.at('body', b.view('body'), b.host, 430, 303); stroke.at('body', b.view('body'), b.host, 470, 310); stroke.end();
    const h = stroke.held!.height, lineY = 1500 - h * 1000;
    // a finger's width off the line: the same line, exactly
    stroke.begin();
    const on = stroke.at('body', b.view('body'), b.host, 520, lineY + LINE_CARRY_PX - 4);
    expect(stroke.held!.height).toBe(h);
    expect(on[0].centre.y).toBeCloseTo(h, 10);
    stroke.end();
    // further off: a line of its own, at the height under the finger
    stroke.begin();
    stroke.at('body', b.view('body'), b.host, 520, lineY + 70);
    expect(stroke.held!.height).not.toBe(h);
    expect(stroke.held!.height).toBeCloseTo(h - 0.07, 1);
    stroke.end();
    // the other kind of level never carries this one on
    stroke.begin();
    stroke.at('room', b.view('room'), b.host, 520, lineY + 70);
    expect(stroke.held!.mode).toBe('room');
    stroke.end();
    // forgotten: nothing to carry
    stroke.reset();
    expect(stroke.held).toBeNull();
  });
});
