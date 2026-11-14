/**
 * THE SERVICE WORKER'S WHOLE MIND (Joshua, 2026-11-13: "load everything at one time and hold it locally"), kept apart
 * from the worker itself (`sw.ts`) so it can be tried with a cache and a network made of plain objects
 * (tests/keeper.test.ts). What it does with a request depends on what may change behind the address:
 *
 *   THE PAGE (opening the room): asked of the server first -- so a new build is seen the moment it is live, never ten
 *     minutes later -- and answered from the copy kept here when there is no network, or none within a few seconds.
 *   A FILE THAT CAN NOT CHANGE behind its address (keepList.ts `unchanging`: Vite's bundles, and the public files the
 *     room asks for with their content revision): answered from the copy kept here; the network is asked the first
 *     time only, and what it sends is kept.
 *   ANYTHING ELSE of the site's: the network first, and the kept copy when there is none.
 *   Not a GET, not this site's, part of a file, or fetched by the page to keep it itself: left to the browser, untouched.
 *
 * WHAT IS KEPT STAYS CONSISTENT. The page kept here is the one the worker fetched when it was installed, with every
 * bundle that page names fetched in the same go: a page is never kept beside bundles it does not name. Files of an
 * older build are removed only when a page of this worker's own build asks (`tidy`), so a page still open from the
 * build before keeps every file it may yet ask for.
 */
import { KEPT_CACHE, KEPT_PREFIX, keepable, unchanging, type KeepList } from './keepList';

export type Kind = 'page' | 'kept' | 'fresh' | 'pass';

/** What the worker is told of a request. */
export interface Asked {
  readonly url: string;
  readonly method: string;
  /** 'navigate' when the browser is opening a page */
  readonly mode?: string;
  /** it asks for part of a file */
  readonly range?: boolean;
  readonly cache?: string;
  /** the page is fetching it to keep it itself (keepList.ts `AHEAD_HEADER`) */
  readonly ahead?: boolean;
}

/** The cache store, as much of it as is used (the browser's `caches` fits). */
export interface KeptCache {
  match(url: string, options?: { ignoreVary?: boolean }): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
  delete(url: string): Promise<boolean>;
  keys(): Promise<readonly { readonly url: string }[]>;
}
export interface KeptCaches {
  open(name: string): Promise<KeptCache>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

export interface KeeperEnv {
  /** The site's address, with its closing slash (the worker's scope). */
  readonly scope: string;
  readonly list: KeepList;
  readonly caches: KeptCaches;
  readonly fetch: (input: string | Request, init?: RequestInit) => Promise<Response>;
  /** How long opening the room waits on the network before the kept page answers, ms. */
  readonly pageWaitMs?: number;
  readonly wait?: (ms: number) => Promise<void>;
}

/**
 * Opening the room waits this long on the network before the page kept here answers. Long enough that a working phone
 * connection wins (the page is 1.2 kB: a second or two even on a weak signal), short enough that a connection in name
 * only is not stared at.
 */
export const PAGE_WAIT_MS = 3000;

export function kindOf(asked: Asked, scope: string): Kind {
  if (asked.method !== 'GET' || asked.range || asked.ahead) return 'pass';
  let url: URL;
  try { url = new URL(asked.url); } catch { return 'pass'; }
  if (!url.href.startsWith(scope)) return 'pass';
  // (a request that may only be answered from the browser's cache is the browser's own business)
  if (asked.cache === 'only-if-cached' && asked.mode !== 'same-origin') return 'pass';
  const rel = url.pathname.slice(new URL(scope).pathname.length);
  if (asked.mode === 'navigate' && (rel === '' || rel === 'index.html')) return 'page';
  return unchanging(url, scope) ? 'kept' : 'fresh';
}

export interface Keeper {
  /** Fetch and keep the page and its bundles; rejects (and keeps what was kept before) if any of them can not be had. */
  install(): Promise<void>;
  /** Remove this site's caches of an older layout. */
  activate(): Promise<void>;
  /** The answer to a request, or null for one left to the browser. `later` is handed work that outlives the answer. */
  answer(request: Request, asked: Asked, later: (work: Promise<unknown>) => void): Promise<Response> | null;
  /** A page of build `build` asks for the cache to be tidied: files no longer used go, if the build is this worker's own. */
  tidy(build: string): Promise<number>;
  readonly build: string;
}

export function createKeeper(env: KeeperEnv): Keeper {
  const { scope, list } = env;
  const pageKey = scope;
  const open = () => env.caches.open(KEPT_CACHE);
  const wait = env.wait ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const address = (path: string) => new URL(path, scope).href;
  /** A response that followed a redirect can not answer the opening of a page: the same file, without that history. */
  const plain = (r: Response): Response => (r.redirected ? new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers }) : r);

  async function install(): Promise<void> {
    const cache = await open(), bundles = list.shell.filter((path) => path !== '' && address(path) !== pageKey);
    const got: (readonly [string, Response])[] = [];
    await Promise.all(list.shell.map(async (path) => {
      const url = address(path);
      // a bundle already kept is the same bundle: its address names its content
      if (url !== pageKey && await cache.match(url, { ignoreVary: true })) return;
      // (the page itself is asked of the server, not of the browser's ten-minute copy of it)
      const r = await env.fetch(url, url === pageKey ? { cache: 'no-cache' } : undefined);
      if (!keepable(r)) throw new Error(`${url}: HTTP ${r.status}`);
      // the page must be this build's own -- it names this build's bundles -- or a build that went live between the
      // worker's download and this one would be kept beside the wrong bundles
      if (url === pageKey && bundles.length > 0) { const text = await r.clone().text(); if (!bundles.some((b) => text.includes(b))) throw new Error(`${url}: the page is another build's`); }
      got.push([url, plain(r)]);
    }));
    // the bundles first and the page last: if the store fills part-way, the page kept is still the one before, beside
    // the bundles it names
    for (const [url, r] of got) if (url !== pageKey) await cache.put(url, r);
    for (const [url, r] of got) if (url === pageKey) await cache.put(url, r);
  }

  async function activate(): Promise<void> {
    for (const name of await env.caches.keys()) if (name.startsWith(KEPT_PREFIX) && name !== KEPT_CACHE) await env.caches.delete(name);
  }

  /** What is kept for `url`, or nothing -- and nothing too when the store itself fails (a browser that has cleared it, or refuses it): the request then simply goes to the network, as it would with no worker. */
  const heldFor = async (url: string): Promise<Response | undefined> => { try { return await (await open()).match(url, { ignoreVary: true }); } catch { return undefined; } };
  /** Keep `r` for `url`, never failing for it. */
  const keep = (url: string, r: Response): Promise<void> => open().then((cache) => cache.put(url, r)).catch(() => {});

  async function page(asked: Asked): Promise<Response> {
    const held = await heldFor(pageKey);
    const live = env.fetch(asked.url, { cache: 'no-cache' });
    // nothing kept yet: the network's own answer, whatever it is
    if (!held) return live;
    const good = live.then((r) => (keepable(r) ? r : null), () => null);
    const first = await Promise.race([good, wait(env.pageWaitMs ?? PAGE_WAIT_MS).then(() => null)]);
    return first ?? held;
  }

  async function kept(request: Request, later: (work: Promise<unknown>) => void): Promise<Response> {
    const held = await heldFor(request.url);
    if (held) return held;
    const r = await env.fetch(request);
    // (a file cut short is not kept: the store refuses a body that ends in an error)
    if (keepable(r)) later(keep(request.url, r.clone()));
    return r;
  }

  async function fresh(request: Request, later: (work: Promise<unknown>) => void): Promise<Response> {
    try {
      const r = await env.fetch(request);
      if (keepable(r)) later(keep(request.url, r.clone()));
      return r;
    } catch (error) {
      const held = await heldFor(request.url);
      if (held) return held;
      throw error;
    }
  }

  async function tidy(build: string): Promise<number> {
    if (build !== list.build) return 0;
    const cache = await open(), wanted = new Set([...list.shell, ...list.files].map(address));
    let gone = 0;
    for (const entry of await cache.keys()) {
      // (what can change behind its address is replaced in place, and is never left over)
      if (wanted.has(entry.url) || !unchanging(new URL(entry.url), scope)) continue;
      if (await cache.delete(entry.url)) gone++;
    }
    return gone;
  }

  return {
    install, activate, tidy, build: list.build,
    answer(request, asked, later) {
      const kind = kindOf(asked, scope);
      return kind === 'pass' ? null : kind === 'page' ? page(asked) : kind === 'kept' ? kept(request, later) : fresh(request, later);
    },
  };
}
