/**
 * THE PAGE'S SIDE OF KEEPING THE ROOM ON THE DEVICE (pwa/onDevice.ts; Joshua, 2026-11-13: "It's about holding and
 * loading the model, clothing, etc at once or in stages"): which files are fetched ahead and in what order, that none
 * already kept is fetched again, that a file that can not be had stops the run without losing what was kept, what the
 * Library's line says at each stage, and the count of the page being loaded again without being asked to.
 */
import { describe, expect, it } from 'vitest';
import { ASKED_KEY, LOADS_KEY, NO_DEVICE, RELOADS_KEY, aheadFiles, countLoad, deviceLine, deviceNote, reloadAsked, saveAhead, type AheadFile, type DeviceState, type TabStore } from '../src/pwa/onDevice';

const tab = (): TabStore & { map: Map<string, string> } => { const map = new Map<string, string>(); return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } }; };

describe('the page loaded again', () => {
  it('a first load is none; each load after it that the room did not ask for is one more', () => {
    const t = tab();
    expect(countLoad(t)).toBe(0);
    expect(countLoad(t)).toBe(1);
    expect(countLoad(t)).toBe(2);
    expect(t.map.get(LOADS_KEY)).toBe('3'); expect(t.map.get(RELOADS_KEY)).toBe('2');
  });
  it('the room\'s own reload (BACK) is not counted, once', () => {
    const t = tab();
    countLoad(t); reloadAsked(t);
    expect(t.map.get(ASKED_KEY)).toBe('1');
    expect(countLoad(t)).toBe(0);
    expect(t.map.has(ASKED_KEY)).toBe(false);
    expect(countLoad(t)).toBe(1);
  });
  it('storage that is missing or throws counts none and never throws', () => {
    expect(countLoad(null)).toBe(0);
    const broken: TabStore = { getItem: () => { throw new Error('private window'); }, setItem: () => { throw new Error('private window'); }, removeItem: () => {} };
    expect(countLoad(broken)).toBe(0);
    expect(() => reloadAsked(broken)).not.toThrow();
    expect(() => reloadAsked(null)).not.toThrow();
  });
});

describe('what is fetched ahead', () => {
  const revisions = { 'models/body.glb': 'aaaaaaaa', 'models/skins/even.webp': 'bbbbbbbb', 'fabrics/knit.jpg': 'cccccccc', 'models/sarah-v2-body-slim-ktx2.glb': 'dddddddd', 'libs/basis/basis_transcoder.wasm': 'eeeeeeee', 'icons/icon-192.png': 'ffffffff', 'manifest.webmanifest': '11111111', 'models/sarah-v2-story.glb': '22222222' };
  const sizes = { 'models/body.glb': 15_000_000, 'models/skins/even.webp': 250_000, 'fabrics/knit.jpg': 1_000_000, 'models/sarah-v2-body-slim-ktx2.glb': 13_000_000 };
  it('the files the room can ask for by itself, at the room\'s own addresses, the small ones first', () => {
    const files = aheadFiles(revisions, sizes, (path) => `https://site/${path}?r=${revisions[path as keyof typeof revisions]}`);
    expect(files).toEqual([
      { url: 'https://site/models/skins/even.webp?r=bbbbbbbb', bytes: 250_000 },
      { url: 'https://site/fabrics/knit.jpg?r=cccccccc', bytes: 1_000_000 },
      { url: 'https://site/models/body.glb?r=aaaaaaaa', bytes: 15_000_000 },
    ]);
  });
  it('no table is no files', () => { expect(aheadFiles({}, {}, (p) => p)).toEqual([]); });
});

describe('stage 3: the rest of the room fetched and kept', () => {
  const FILES: AheadFile[] = [{ url: 'a', bytes: 10 }, { url: 'b', bytes: 20 }, { url: 'c', bytes: 30 }];
  const world = (keptAlready: string[], network: Record<string, string | number | 'down'>) => {
    const kept = new Map<string, string>(keptAlready.map((u) => [u, 'kept before'])), asked: string[] = [], progress: [number, number][] = [];
    const env = {
      cache: { keys: async () => [...kept.keys()].map((url) => ({ url })), put: async (url: string, r: Response) => { kept.set(url, await r.text()); } },
      fetch: async (url: string) => {
        asked.push(url);
        const answer = network[url];
        if (answer === 'down' || answer === undefined) throw new TypeError('Failed to fetch');
        if (typeof answer === 'number') return new Response('error', { status: answer });
        return new Response(answer);
      },
      clear: async () => {}, progress: (have: number, bytes: number) => { progress.push([have, bytes]); },
    };
    return { kept, asked, progress, env };
  };
  it('fetches only what is not kept yet, one after another, and says how far it is', async () => {
    const w = world(['b'], { a: 'A', c: 'C' });
    expect(await saveAhead(FILES, w.env)).toBe('saved');
    expect(w.asked).toEqual(['a', 'c']);
    expect(w.progress).toEqual([[1, 20], [2, 30], [3, 60]]);
    expect([...w.kept.keys()].sort()).toEqual(['a', 'b', 'c']);
  });
  it('with everything kept already asks the network for nothing', async () => {
    const w = world(['a', 'b', 'c'], {});
    expect(await saveAhead(FILES, w.env)).toBe('saved');
    expect(w.asked).toEqual([]);
    expect(w.progress).toEqual([[3, 60]]);
  });
  it('the page keeps each file itself, whole', async () => {
    const w = world([], { a: 'A', b: 'B', c: 'C' });
    expect(await saveAhead(FILES, w.env)).toBe('saved');
    expect([w.kept.get('a'), w.kept.get('b'), w.kept.get('c')]).toEqual(['A', 'B', 'C']);
  });
  it('a file the cache refuses (cut short, or no room left) stops the run', async () => {
    const w = world([], { a: 'A', b: 'B', c: 'C' });
    const cache = { ...w.env.cache, put: async (url: string, r: Response) => { if (url === 'b') throw new TypeError('the body ended in an error'); await w.env.cache.put(url, r); } };
    expect(await saveAhead(FILES, { ...w.env, cache })).toBe('paused');
    expect([...w.kept.keys()]).toEqual(['a']);
  });
  it('a file that can not be had stops the run; what was kept stays, and the next run takes up from there', async () => {
    const w = world([], { a: 'A', b: 'down', c: 'C' });
    expect(await saveAhead(FILES, w.env)).toBe('paused');
    expect(w.asked).toEqual(['a', 'b']);
    expect([...w.kept.keys()]).toEqual(['a']);
    const again = world(['a'], { b: 'B', c: 'C' });
    expect(await saveAhead(FILES, again.env)).toBe('saved');
    expect(again.asked).toEqual(['b', 'c']);
  });
  it('an answer with something wrong with it is not kept and stops the run', async () => {
    const w = world([], { a: 503 });
    expect(await saveAhead(FILES, w.env)).toBe('paused');
    expect(w.kept.size).toBe(0);
  });
  it('waits to be let through before each file', async () => {
    const w = world([], { a: 'A', b: 'B', c: 'C' });
    let let_through = 0;
    expect(await saveAhead(FILES, { ...w.env, clear: async () => { let_through++; } })).toBe('saved');
    expect(let_through).toBe(3);
  });
});

describe('what the room says of it', () => {
  const s = (change: Partial<DeviceState>): DeviceState => ({ ...NO_DEVICE, of: 38, ofBytes: 77 * 1048576, ...change });
  it('the Library\'s line at each stage', () => {
    expect(deviceLine(s({ phase: 'off' }))).toBe('');
    expect(deviceLine(s({ phase: 'unsupported' }))).toMatch(/does not keep the room/);
    expect(deviceLine(s({ phase: 'starting' }))).toMatch(/getting ready/);
    expect(deviceLine(s({ phase: 'saving', have: 12, haveBytes: 31 * 1048576 }))).toBe('THIS DEVICE · saving the room here: 12 of 38 files (31 MB of 77 MB)');
    expect(deviceLine(s({ phase: 'paused', have: 12 }))).toMatch(/12 of 38 files are saved here; the rest follow/);
    expect(deviceLine(s({ phase: 'saved', have: 38, haveBytes: 77 * 1048576 }))).toBe('THIS DEVICE · the whole room is saved here (38 files, 77 MB): it opens with no internet');
    expect(deviceLine(s({ phase: 'saved', newer: true }))).toMatch(/a newer version is ready: close the room and open it again$/);
  });
  it('the notice over the stage is empty unless something should be noticed', () => {
    expect(deviceNote(s({ phase: 'saved' }))).toBe('');
    expect(deviceNote(s({ reloads: 2 }))).toBe('page loaded again ×2 · ');
    expect(deviceNote(s({ newer: true }))).toBe('update ready: reopen · ');
    expect(deviceNote(s({ reloads: 1, newer: true }))).toBe('page loaded again ×1 · update ready: reopen · ');
  });
});
