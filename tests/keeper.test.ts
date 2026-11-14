/**
 * WHAT THE SERVICE WORKER KEEPS AND WHAT IT ANSWERS WITH (pwa/keeper.ts; Joshua, 2026-11-13: "load everything at one
 * time and hold it locally especially if I have it saved as a PWA"). The worker's whole mind, tried against a cache
 * store and a network made of plain objects: that the page is always asked of the server first and still opens with no
 * network; that a file which can not change is fetched once; that what is kept is never a page beside the wrong
 * bundles; and that another site's cache is never touched (every capflyingfun.github.io site shares one store).
 */
import { describe, expect, it } from 'vitest';
import { KEPT_CACHE, NOT_AHEAD, fetchedAhead, inShell, stamped, unchanging, type KeepList } from '../src/pwa/keepList';
import { SARAH_LAB_MODELS, SARAH_LAB_MODELS_OFF_MENU } from '../src/sarahlab/sarahLabTool';
import { createKeeper, kindOf, type Asked, type KeptCaches } from '../src/pwa/keeper';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCOPE = 'https://capflyingfun.github.io/Custom-Character-Builder-System/';
const at = (path: string) => SCOPE + path;
const LIST: KeepList = {
  build: '0.9.21+abc1234',
  shell: ['', 'assets/index-NEW11111.js', 'assets/creaseWorker-NEW22222.js'],
  files: ['models/body.glb?r=aaaaaaaa', 'models/skins/even.webp?r=bbbbbbbb', 'manifest.webmanifest?r=cccccccc'],
};
const PAGE_HTML = '<html><script type="module" src="./assets/index-NEW11111.js"></script></html>';

/** A cache store made of maps, that takes a body in as the browser's does (read to its end, or refused). */
function fakeCaches(seed: Record<string, Record<string, string>> = {}) {
  const stores = new Map<string, Map<string, { body: ArrayBuffer; status: number }>>();
  for (const [name, entries] of Object.entries(seed)) stores.set(name, new Map(Object.entries(entries).map(([url, text]) => [url, { body: new TextEncoder().encode(text).buffer as ArrayBuffer, status: 200 }])));
  const caches: KeptCaches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async match(url) { const hit = store.get(url); return hit ? new Response(hit.body.slice(0), { status: hit.status }) : undefined; },
        async put(url, response) { store.set(url, { body: await response.arrayBuffer(), status: response.status }); },
        async delete(url) { return store.delete(url); },
        async keys() { return [...store.keys()].map((url) => ({ url })); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const text = (name: string, url: string) => { const hit = stores.get(name)?.get(url); return hit ? new TextDecoder().decode(hit.body) : null; };
  return { caches, stores, text, urls: (name = KEPT_CACHE) => [...(stores.get(name)?.keys() ?? [])].sort() };
}

/** A network that answers from a table (a string is a 200; a number is that status; 'down' throws), and remembers what it was asked. */
function fakeNetwork(table: Record<string, string | number | 'down'>) {
  const asked: { url: string; cache?: string }[] = [];
  const fetch = async (input: string | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.url;
    asked.push({ url, cache: init?.cache });
    const answer = table[url];
    if (answer === undefined) return new Response('not found', { status: 404 });
    if (answer === 'down') throw new TypeError('Failed to fetch');
    return typeof answer === 'number' ? new Response('error', { status: answer }) : new Response(answer, { status: 200 });
  };
  return { fetch, asked, table };
}
const LIVE = { [SCOPE]: PAGE_HTML, [at('assets/index-NEW11111.js')]: 'new code', [at('assets/creaseWorker-NEW22222.js')]: 'new worker' };
const get = (url: string, more: Partial<Asked> = {}): [Request, Asked] => [new Request(url), { url, method: 'GET', ...more }];

describe('what kind of request it is', () => {
  it('opening the room is the page; a file named by its content is kept; the rest of the site is asked for fresh', () => {
    const kind = (url: string, more: Partial<Asked> = {}) => kindOf({ url, method: 'GET', ...more }, SCOPE);
    expect(kind(SCOPE, { mode: 'navigate' })).toBe('page');
    expect(kind(at('index.html'), { mode: 'navigate' })).toBe('page');
    expect(kind(at('?skin=ktx2'), { mode: 'navigate' })).toBe('page');
    expect(kind(at('assets/index-NEW11111.js'))).toBe('kept');
    expect(kind(at('models/body.glb?r=aaaaaaaa'))).toBe('kept');
    expect(kind(at('models/body.glb'))).toBe('fresh');
    expect(kind(at('version.json'))).toBe('fresh');
    // a file of the site's opened in the address bar is that file, not the room
    expect(kind(at('models/body.glb?r=aaaaaaaa'), { mode: 'navigate' })).toBe('kept');
    expect(kind(at('version.json'), { mode: 'navigate' })).toBe('fresh');
  });
  it('what is not a plain request for this site is left to the browser', () => {
    const kind = (asked: Asked) => kindOf(asked, SCOPE);
    expect(kind({ url: at('models/body.glb?r=aaaaaaaa'), method: 'POST' })).toBe('pass');
    expect(kind({ url: at('models/body.glb?r=aaaaaaaa'), method: 'GET', range: true })).toBe('pass');
    // TRADDOMIUM is on the same server: it is not this worker's
    expect(kind({ url: 'https://capflyingfun.github.io/TRADDOMIUM-Micro-Battle/assets/index-abc.js', method: 'GET' })).toBe('pass');
    expect(kind({ url: 'https://example.com/x.js', method: 'GET' })).toBe('pass');
    expect(kind({ url: 'not a url', method: 'GET' })).toBe('pass');
    expect(kind({ url: at('assets/index-NEW11111.js'), method: 'GET', cache: 'only-if-cached', mode: 'no-cors' })).toBe('pass');
    // the page fetching a file to keep it itself: the worker does not keep it a second time
    expect(kind({ url: at('models/body.glb?r=aaaaaaaa'), method: 'GET', ahead: true })).toBe('pass');
  });
  it('a revision is eight hex digits, and a bundle is under assets/', () => {
    expect(unchanging(new URL(at('a.glb?r=0123abcd')), SCOPE)).toBe(true);
    expect(unchanging(new URL(at('a.glb?r=latest')), SCOPE)).toBe(false);
    expect(unchanging(new URL(at('a.glb?v=0123abcd')), SCOPE)).toBe(false);
    expect(unchanging(new URL('https://capflyingfun.github.io/Other/assets/x.js'), SCOPE)).toBe(false);
    expect(stamped('models/a.glb', '0123abcd')).toBe('models/a.glb?r=0123abcd');
    expect(stamped('models/a.glb', undefined)).toBe('models/a.glb');
  });
});

describe('the worker installed', () => {
  it('keeps the page and the bundles it names, the page asked of the server past the browser\'s own copy', async () => {
    const store = fakeCaches(), net = fakeNetwork(LIVE);
    await createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: net.fetch }).install();
    expect(store.urls()).toEqual([SCOPE, at('assets/creaseWorker-NEW22222.js'), at('assets/index-NEW11111.js')].sort());
    expect(net.asked.find((a) => a.url === SCOPE)?.cache).toBe('no-cache');
    expect(store.text(KEPT_CACHE, SCOPE)).toBe(PAGE_HTML);
  });
  it('does not fetch a bundle it already keeps', async () => {
    const store = fakeCaches({ [KEPT_CACHE]: { [at('assets/index-NEW11111.js')]: 'new code' } }), net = fakeNetwork(LIVE);
    await createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: net.fetch }).install();
    expect(net.asked.map((a) => a.url)).not.toContain(at('assets/index-NEW11111.js'));
    expect(store.urls()).toHaveLength(3);
  });
  it('fails whole, and keeps the page it had, when a bundle can not be had', async () => {
    const before = { [SCOPE]: 'the page before', [at('assets/index-OLD.js')]: 'old code' };
    const store = fakeCaches({ [KEPT_CACHE]: before }), net = fakeNetwork({ ...LIVE, [at('assets/creaseWorker-NEW22222.js')]: 404 });
    await expect(createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: net.fetch }).install()).rejects.toThrow(/404/);
    expect(store.text(KEPT_CACHE, SCOPE)).toBe('the page before');
    expect(store.text(KEPT_CACHE, at('assets/index-OLD.js'))).toBe('old code');
  });
  it('refuses a page that is another build\'s (a build gone live between the worker\'s download and its install)', async () => {
    const store = fakeCaches({ [KEPT_CACHE]: { [SCOPE]: 'the page before' } });
    const net = fakeNetwork({ ...LIVE, [SCOPE]: '<html><script src="./assets/index-NEWER999.js"></script></html>' });
    await expect(createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: net.fetch }).install()).rejects.toThrow(/another build/);
    expect(store.text(KEPT_CACHE, SCOPE)).toBe('the page before');
  });
  it('taking over, removes this site\'s caches of an older layout and no other site\'s', async () => {
    const store = fakeCaches({ 'character-builder-kept-v0': { [SCOPE]: 'x' }, [KEPT_CACHE]: { [SCOPE]: 'y' }, 'traddomium-kept-v1': { 'https://capflyingfun.github.io/TRADDOMIUM-Micro-Battle/': 'z' } });
    await createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: fakeNetwork({}).fetch }).activate();
    expect([...store.stores.keys()].sort()).toEqual([KEPT_CACHE, 'traddomium-kept-v1'].sort());
  });
});

describe('what the worker answers with', () => {
  const made = (seed: Record<string, string>, table: Record<string, string | number | 'down'>, more: { wait?: (ms: number) => Promise<void> } = {}) => {
    const store = fakeCaches({ [KEPT_CACHE]: seed }), net = fakeNetwork(table), later: Promise<unknown>[] = [];
    const keeper = createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: net.fetch, ...more });
    const ask = async (url: string, asked: Partial<Asked> = {}) => { const a = keeper.answer(...get(url, asked), (work) => later.push(work)); return a ? a : null; };
    return { store, net, later, keeper, ask, done: () => Promise.all(later) };
  };

  it('a file that can not change is fetched once, kept, and never asked for again', async () => {
    const body = at('models/body.glb?r=aaaaaaaa'), m = made({}, { [body]: 'her body' });
    expect(await (await m.ask(body))!.text()).toBe('her body');
    await m.done();
    expect(m.store.text(KEPT_CACHE, body)).toBe('her body');
    expect(await (await m.ask(body))!.text()).toBe('her body');
    expect(m.net.asked).toHaveLength(1);
  });
  it('a file that can not change is answered with no network at all once kept', async () => {
    const body = at('models/body.glb?r=aaaaaaaa'), m = made({ [body]: 'her body' }, { [body]: 'down' });
    expect(await (await m.ask(body))!.text()).toBe('her body');
    expect(m.net.asked).toHaveLength(0);
  });
  it('an answer with something wrong with it is passed on and not kept', async () => {
    const body = at('models/body.glb?r=aaaaaaaa'), m = made({}, { [body]: 503 });
    expect((await m.ask(body))!.status).toBe(503);
    await m.done();
    expect(m.store.urls()).toEqual([]);
  });
  it('a file cut short is not kept, and the worker does not fall over it', async () => {
    const body = at('models/body.glb?r=aaaaaaaa'), store = fakeCaches(), net = fakeNetwork({ [body]: 'her body' }), later: Promise<unknown>[] = [];
    const caches: KeptCaches = { ...store.caches, open: async (name) => ({ ...(await store.caches.open(name)), put: async () => { throw new TypeError('the body ended in an error'); } }) };
    const keeper = createKeeper({ scope: SCOPE, list: LIST, caches, fetch: net.fetch });
    expect(await (await keeper.answer(...get(body), (work) => later.push(work)))!.text()).toBe('her body');
    await expect(Promise.all(later)).resolves.toBeDefined();
    expect(store.urls()).toEqual([]);
  });

  it('opening the room asks the server first, past the browser\'s own copy, and shows what it sends', async () => {
    const m = made({ [SCOPE]: 'the page kept' }, { [SCOPE]: 'the page live' });
    expect(await (await m.ask(SCOPE, { mode: 'navigate' }))!.text()).toBe('the page live');
    expect(m.net.asked[0]).toEqual({ url: SCOPE, cache: 'no-cache' });
    // the page kept is the one installed with its bundles: opening the room does not replace it
    await m.done();
    expect(m.store.text(KEPT_CACHE, SCOPE)).toBe('the page kept');
  });
  it('opening the room with no network, or a server in trouble, shows the page kept here', async () => {
    for (const trouble of ['down', 500, 404] as const) {
      const m = made({ [SCOPE]: 'the page kept' }, { [SCOPE]: trouble });
      expect(await (await m.ask(SCOPE, { mode: 'navigate' }))!.text()).toBe('the page kept');
    }
  });
  it('opening the room on a connection in name only shows the page kept here after the wait', async () => {
    let waited = 0;
    const store = fakeCaches({ [KEPT_CACHE]: { [SCOPE]: 'the page kept' } });
    const never = () => new Promise<Response>(() => {});
    const keeper = createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: never, wait: async (ms) => { waited = ms; } });
    expect(await (await keeper.answer(...get(SCOPE, { mode: 'navigate' }), () => {}))!.text()).toBe('the page kept');
    expect(waited).toBeGreaterThanOrEqual(1000);
  });
  it('opening the room with nothing kept yet gets the network\'s own answer, an address with a setting too', async () => {
    const m = made({}, { [at('?skin=ktx2')]: 'the page live' });
    expect(await (await m.ask(at('?skin=ktx2'), { mode: 'navigate' }))!.text()).toBe('the page live');
    const none = made({}, {});
    expect((await none.ask(SCOPE, { mode: 'navigate' }))!.status).toBe(404);
  });
  it('an address with a setting opens from the one page kept', async () => {
    const m = made({ [SCOPE]: 'the page kept' }, { [at('?skin=ktx2')]: 'down' });
    expect(await (await m.ask(at('?skin=ktx2'), { mode: 'navigate' }))!.text()).toBe('the page kept');
  });

  it('anything else of the site\'s is asked of the network first and kept for when there is none', async () => {
    const stamp = at('version.json'), m = made({}, { [stamp]: '{"commit":"abc1234"}' });
    expect(await (await m.ask(stamp))!.text()).toBe('{"commit":"abc1234"}');
    await m.done();
    m.net.table[stamp] = '{"commit":"def5678"}';
    expect(await (await m.ask(stamp))!.text()).toBe('{"commit":"def5678"}');
    await m.done();
    m.net.table[stamp] = 'down';
    expect(await (await m.ask(stamp))!.text()).toBe('{"commit":"def5678"}');
    const none = made({}, { [stamp]: 'down' });
    await expect(none.ask(stamp)).rejects.toThrow(/Failed to fetch/);
  });
  it('a cache store that fails -- cleared, or refused by the browser -- costs nothing but the keeping: every request still goes to the network', async () => {
    const body = at('models/body.glb?r=aaaaaaaa'), stamp = at('version.json'), later: Promise<unknown>[] = [];
    const broken: KeptCaches = { open: async () => { throw new Error('The operation is insecure.'); }, keys: async () => [], delete: async () => false };
    const net = fakeNetwork({ [body]: 'her body', [stamp]: '{}', [SCOPE]: 'the page live' });
    const keeper = createKeeper({ scope: SCOPE, list: LIST, caches: broken, fetch: net.fetch });
    expect(await (await keeper.answer(...get(body), (work) => later.push(work)))!.text()).toBe('her body');
    expect(await (await keeper.answer(...get(stamp), (work) => later.push(work)))!.text()).toBe('{}');
    expect(await (await keeper.answer(...get(SCOPE, { mode: 'navigate' }), (work) => later.push(work)))!.text()).toBe('the page live');
    await expect(Promise.all(later)).resolves.toBeDefined();
    await expect(keeper.install()).rejects.toThrow();
  });
  it('a request that is not the worker\'s gets no answer from it', async () => {
    const m = made({}, {});
    expect(await m.ask('https://example.com/x.js')).toBeNull();
    expect(await m.ask(at('models/body.glb?r=aaaaaaaa'), { method: 'POST' })).toBeNull();
    expect(m.net.asked).toHaveLength(0);
  });
});

describe('the cache tidied', () => {
  const kept = {
    [SCOPE]: PAGE_HTML,
    [at('assets/index-NEW11111.js')]: 'new code', [at('assets/index-OLD00000.js')]: 'old code',
    [at('models/body.glb?r=aaaaaaaa')]: 'her body now', [at('models/body.glb?r=99999999')]: 'her body before',
    [at('models/gone.glb?r=12345678')]: 'a file no longer in the build',
    [at('version.json')]: '{}', [at('icons/icon-192.png')]: 'png',
  };
  it('a page of the worker\'s own build has what no longer belongs removed, and nothing else', async () => {
    const store = fakeCaches({ [KEPT_CACHE]: kept, 'traddomium-kept-v1': { 'https://capflyingfun.github.io/TRADDOMIUM-Micro-Battle/assets/index-OLD00000.js': 'theirs' } });
    const gone = await createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: fakeNetwork({}).fetch }).tidy(LIST.build);
    expect(gone).toBe(3);
    expect(store.urls()).toEqual([SCOPE, at('assets/index-NEW11111.js'), at('icons/icon-192.png'), at('models/body.glb?r=aaaaaaaa'), at('version.json')].sort());
    expect(store.urls('traddomium-kept-v1')).toHaveLength(1);
  });
  it('a page of another build -- one still open from before -- has nothing removed', async () => {
    const store = fakeCaches({ [KEPT_CACHE]: kept });
    expect(await createKeeper({ scope: SCOPE, list: LIST, caches: store.caches, fetch: fakeNetwork({}).fetch }).tidy('0.9.20+fba9667')).toBe(0);
    expect(store.urls()).toHaveLength(Object.keys(kept).length);
  });
});

describe('the site\'s own files', () => {
  const root = join(__dirname, '..', 'public');
  const walk = (dir: string, out: string[] = []): string[] => { for (const e of readdirSync(dir)) { const full = join(dir, e); if (statSync(full).isDirectory()) walk(full, out); else out.push(full.slice(root.length + 1).split('\\').join('/')); } return out; };
  const files = walk(root);
  it('what is not fetched ahead is named for a reason that still holds: each rule matches a file that exists', () => {
    for (const rule of NOT_AHEAD) expect(files.some((f) => rule.test(f)), String(rule)).toBe(true);
    // her body, her clothes, her hair, her skeleton (X-RAY), her baby, her skins and the fabrics are fetched ahead
    for (const f of ['models/sarah-v2-body-slim.glb', 'models/sarah-v2-spandex-lite.glb', 'models/sarah-v2-hair.glb', 'models/sarah-skeleton.glb', 'models/sarah-baby.glb', 'models/skins/sarah-v2-skin-even-2048.webp', 'fabrics/athletic-plain.jpg']) {
      expect(files).toContain(f); expect(fetchedAhead(f), f).toBe(true);
    }
    expect(fetchedAhead('models/sarah-v2-body-slim-ktx2.glb')).toBe(false);
    // the bodies no longer on the MODEL button (Joshua, 2026-11-13: "disable all other models") are not: 32 MB a phone need not hold
    for (const f of ['models/sarah-base.glb', 'models/sarah-v2.glb', 'models/sarah-v2-arms.glb']) { expect(files).toContain(f); expect(fetchedAhead(f), f).toBe(false); }
    // ...and every model MODEL can step to is
    for (const m of SARAH_LAB_MODELS) expect(fetchedAhead(m.path), m.id).toBe(!SARAH_LAB_MODELS_OFF_MENU.has(m.id) || m.id === 'skeleton');
    // a file nobody has thought about is held by default
    expect(fetchedAhead('models/some-new-dress.glb')).toBe(true);
  });
  it('the page\'s own bundles are in the shell; the KTX2 pilot\'s transcoder is not', () => {
    expect(inShell('assets/index-CJwNjxtm.js')).toBe(true);
    expect(inShell('assets/creaseWorker-BUjbU69e.js')).toBe(true);
    expect(inShell('assets/basis_transcoder-VXdx5NbI.wasm')).toBe(false);
    expect(inShell('index.html')).toBe(false);
    expect(inShell('version.json')).toBe(false);
  });
  it('the Home Screen is given a name and icons that exist, at addresses that work under any project path', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8')) as { name: string; short_name: string; start_url: string; scope: string; display: string; icons: { src: string; sizes: string; purpose?: string }[] };
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./'); expect(manifest.scope).toBe('./');
    // (a Home Screen cuts a long name short)
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512', '512x512']);
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) { expect(icon.src.startsWith('/')).toBe(false); expect(existsSync(join(root, icon.src)), icon.src).toBe(true); }
    const page = readFileSync(join(root, '..', 'index.html'), 'utf8');
    expect(page).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(page).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(existsSync(join(root, 'icons', 'apple-touch-icon.png'))).toBe(true);
  });
});
