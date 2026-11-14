/**
 * THE PAGE'S SIDE OF KEEPING THE ROOM ON THE DEVICE (Joshua, 2026-11-13: "It's about holding and loading the model,
 * clothing, etc at once or in stages"). Three stages, each kept as it lands and none fetched twice:
 *
 *   1. THE PAGE ITSELF and its code, by the service worker as it is installed (keeper.ts).
 *   2. WHAT SHE IS WEARING, as the room loads it: every request of the room's passes through the worker, which keeps it.
 *   3. EVERYTHING ELSE she can wear or be (`saveAhead`): once she is in and drawn, the files not yet kept are fetched
 *      one at a time, the small ones first, and kept. After that the room opens with no internet, and nothing she
 *      can be changed to has to be downloaded. The page does this itself and hands each answer straight to the cache
 *      (the browser pours it in: no script touches the bytes, which on the first build did -- 12 MB read a piece at a
 *      time between the room's frames), marked so that the worker leaves it alone (`AHEAD_HEADER`) and it is written
 *      once.
 *
 * It also counts how often this tab has loaded the page again without being asked to (`countLoad`). A phone that runs
 * short of memory drops a page and loads it again by itself -- a turn of the screen is when it tends to -- and until
 * now nothing on the screen said so (Joshua, the same day, of a turn costing "3-15s per reload").
 *
 * Pure but for `startOnDevice`, which joins it to the browser.
 */
import { AHEAD_HEADER, KEPT_CACHE, fetchedAhead, keepable } from './keepList';
import type { KeptCache } from './keeper';

export type DevicePhase =
  /** not built to keep anything (a development server) */
  | 'off'
  /** this browser has no service workers (a private window, an old browser) */
  | 'unsupported'
  /** the worker is being installed, or she is not in yet */
  | 'starting'
  /** stage 3 is running */
  | 'saving'
  /** stage 3 stopped short (no connection, or the phone asked for less data): it carries on at the next chance */
  | 'paused'
  /** every file the room can ask for is kept */
  | 'saved';

export interface DeviceState {
  readonly phase: DevicePhase;
  /** Files kept, of the files the room can ask for by itself; and what they weigh, in bytes. */
  readonly have: number;
  readonly of: number;
  readonly haveBytes: number;
  readonly ofBytes: number;
  /** A build other than this page's is the one kept now: the room shows it when it is opened again. */
  readonly newer: boolean;
  /** Times this tab loaded the page again without the room asking for it (`countLoad`). */
  readonly reloads: number;
}

export const NO_DEVICE: DeviceState = Object.freeze({ phase: 'off', have: 0, of: 0, haveBytes: 0, ofBytes: 0, newer: false, reloads: 0 });

const megabytes = (bytes: number): string => `${(bytes / 1048576).toFixed(bytes < 10 * 1048576 ? 1 : 0)} MB`;

/** The Library's line: what of the room is kept on this device. '' when there is nothing to say (a development server). */
export function deviceLine(s: DeviceState): string {
  const newer = s.newer ? ' · a newer version is ready: close the room and open it again' : '';
  switch (s.phase) {
    case 'off': return '';
    case 'unsupported': return 'THIS DEVICE · this browser does not keep the room (a private window, or an older browser): she is downloaded each visit';
    case 'starting': return `THIS DEVICE · getting ready to keep the room here…${newer}`;
    case 'saving': return `THIS DEVICE · saving the room here: ${s.have} of ${s.of} files (${megabytes(s.haveBytes)} of ${megabytes(s.ofBytes)})${newer}`;
    case 'paused': return `THIS DEVICE · ${s.have} of ${s.of} files are saved here; the rest follow when there is a connection${newer}`;
    case 'saved': return `THIS DEVICE · the whole room is saved here (${s.of} files, ${megabytes(s.ofBytes)}): it opens with no internet${newer}`;
  }
}

/** What goes in front of the room's status line, where a phone shows it: only what should be noticed. */
export function deviceNote(s: DeviceState): string {
  return `${s.reloads > 0 ? `page loaded again ×${s.reloads} · ` : ''}${s.newer ? 'update ready: reopen · ' : ''}`;
}

/** As much of the tab's own storage as is used (it lasts as long as the tab, through a reload). */
export interface TabStore { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const LOADS_KEY = 'character-builder.loads';
export const RELOADS_KEY = 'character-builder.reloads';
export const ASKED_KEY = 'character-builder.reload-asked';

/**
 * This load of the page, counted: how many times this tab has loaded the page again WITHOUT the room asking (the phone
 * dropped the page and loaded it again, it was reloaded by hand, or the same tab was brought to it a second time --
 * every kind is counted, because how a phone's own reload announces itself could not be tried on the build machine).
 * Storage that throws (a private window) counts none.
 */
export function countLoad(store: TabStore | null): number {
  try {
    if (!store) return 0;
    const loads = Number(store.getItem(LOADS_KEY)) || 0, asked = store.getItem(ASKED_KEY) === '1';
    let reloads = Number(store.getItem(RELOADS_KEY)) || 0;
    if (loads > 0 && !asked) reloads++;
    store.removeItem(ASKED_KEY);
    store.setItem(LOADS_KEY, String(loads + 1));
    store.setItem(RELOADS_KEY, String(reloads));
    return reloads;
  } catch { return 0; }
}
/** The room is about to reload the page itself (BACK): that one is not the phone's doing. */
export function reloadAsked(store: TabStore | null): void {
  try { store?.setItem(ASKED_KEY, '1'); } catch { /* a private window: the reload is counted, that is all */ }
}

export interface AheadFile { readonly url: string; readonly bytes: number }

/**
 * The files stage 3 fetches, from the build's own table of public files (`__PUBLIC_REV__`, `__PUBLIC_SIZE__`): the ones
 * the room can ask for by itself, each at the address the room would use, the small ones first -- a skin or a fabric
 * is wanted sooner than another whole body, and a small file gets out of the way of whatever the room asks for next.
 */
export function aheadFiles(revisions: Readonly<Record<string, string>>, sizes: Readonly<Record<string, number>>, address: (path: string) => string): AheadFile[] {
  return Object.keys(revisions).filter(fetchedAhead)
    // (a .gltf's size in the table counts its buffers too; each buffer is a file of its own here)
    .map((path) => ({ url: address(path), bytes: path.endsWith('.gltf') ? 0 : sizes[path] ?? 0, path }))
    .sort((a, b) => a.bytes - b.bytes || (a.path < b.path ? -1 : 1))
    .map(({ url, bytes }) => ({ url, bytes }));
}

export interface AheadEnv {
  readonly cache: Pick<KeptCache, 'keys' | 'put'>;
  /** The file, asked for past the worker (`AHEAD_HEADER`): the page keeps the answer itself. */
  readonly fetch: (url: string) => Promise<Response>;
  /** Resolves when the page may fetch the next file: it is shown, and there is a connection. */
  readonly clear: () => Promise<void>;
  readonly progress: (have: number, haveBytes: number) => void;
}

/**
 * STAGE 3: fetch and keep each file not yet kept. 'saved' when every file is kept; 'paused' when one could not be had
 * (what was fetched before it stays kept, and the next run starts from there).
 */
export async function saveAhead(files: readonly AheadFile[], env: AheadEnv): Promise<'saved' | 'paused'> {
  let have = 0, haveBytes = 0;
  const missing: AheadFile[] = [];
  // (what is kept is asked for once, as a list: forty questions each wait their turn behind the room's frames)
  const kept = new Set((await env.cache.keys()).map((entry) => entry.url));
  for (const f of files) {
    if (kept.has(f.url)) { have++; haveBytes += f.bytes; } else missing.push(f);
  }
  env.progress(have, haveBytes);
  for (const f of missing) {
    await env.clear();
    try {
      const r = await env.fetch(f.url);
      if (!keepable(r)) throw new Error(`HTTP ${r.status}`);
      // (kept once the whole of it is in: a file cut short is refused by the cache, and stops the run)
      await env.cache.put(f.url, r);
    } catch { return 'paused'; }
    have++; haveBytes += f.bytes;
    env.progress(have, haveBytes);
  }
  return 'saved';
}

export interface OnDevice {
  state(): DeviceState;
  /** Called whenever the state changes. */
  watch(changed: () => void): void;
  /**
   * Resolves once the worker answers this page's requests -- at once on every visit but a device's first -- or after
   * `FIRST_VISIT_WAIT_MS`. The room starts loading after it, so that on the first visit too her files pass through the
   * worker and are kept as they land, and none is downloaded a second time for the keeping.
   */
  readonly ready: Promise<void>;
  /** She is in and drawn: stage 3 may begin. */
  roomReady(): void;
  /** The room is about to reload the page itself. */
  reloadAsked(): void;
}

/** On a device's first visit the room waits this long, at the most, for the worker to be installed (see `ready`). */
export const FIRST_VISIT_WAIT_MS = 2500;
/** A build other than the page's must be the kept one for this long before the room says so: a worker being replaced as the page opens is not news. */
export const NEWER_AFTER_MS = 8000;

export interface OnDeviceEnv {
  /** This page's build, as the worker knows builds (`version+commit`). */
  readonly build: string;
  /** False on a development server: nothing is registered and nothing is kept. */
  readonly enabled: boolean;
  readonly files: readonly AheadFile[];
  /** The worker's address. */
  readonly workerUrl: string;
}

/** A state that keeps its listeners told. */
function tracked(first: DeviceState): { get(): DeviceState; set(change: Partial<DeviceState>): void; watch(changed: () => void): void } {
  let state = first;
  const listeners: (() => void)[] = [];
  return {
    get: () => state,
    set(change) { state = Object.freeze({ ...state, ...change }); for (const l of listeners) { try { l(); } catch { /* a listener's own trouble */ } } },
    watch(changed) { listeners.push(changed); },
  };
}

/** Join the page to the browser: register the worker, greet it, and keep the rest of the room when she is in. */
export function startOnDevice(env: OnDeviceEnv): OnDevice {
  const tab = (() => { try { return globalThis.sessionStorage ?? null; } catch { return null; } })();
  const reloads = countLoad(tab);
  const ofBytes = env.files.reduce((sum, f) => sum + f.bytes, 0);
  const workers = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  const supported = !!workers && typeof caches !== 'undefined';
  const state = tracked({ ...NO_DEVICE, reloads, of: env.files.length, ofBytes, phase: !env.enabled ? 'off' : supported ? 'starting' : 'unsupported' });
  const base: OnDevice = { state: state.get, watch: state.watch, ready: Promise.resolve(), roomReady: () => {}, reloadAsked: () => reloadAsked(tab) };
  if (!env.enabled || !supported || !workers) return base;

  let newerTimer: ReturnType<typeof setTimeout> | null = null;
  const greet = () => workers.controller?.postMessage({ type: 'hello', build: env.build });
  workers.addEventListener('message', (event) => {
    const data = event.data as { type?: string; build?: string } | null;
    if (data?.type !== 'hello') return;
    if (newerTimer) { clearTimeout(newerTimer); newerTimer = null; }
    if (data.build === env.build) { if (state.get().newer) state.set({ newer: false }); return; }
    newerTimer = setTimeout(() => { newerTimer = null; state.set({ newer: true }); }, NEWER_AFTER_MS);
  });
  workers.addEventListener('controllerchange', greet);

  let go: () => void = () => {};
  const ready = new Promise<void>((done) => {
    let told = false;
    go = () => { if (!told) { told = true; done(); } };
    if (workers.controller) { go(); return; }
    workers.addEventListener('controllerchange', go);
    setTimeout(go, FIRST_VISIT_WAIT_MS);
    // (a page reloaded past its worker is never answered by it in that load: there is nothing to wait for)
    void workers.getRegistration().then((r) => { if (r?.active && !workers.controller) go(); }, go);
  });
  // (a worker that can not be registered -- a browser set to refuse them -- keeps nothing: the room loads as it always did)
  void workers.register(env.workerUrl, { updateViaCache: 'none' }).then(() => greet(), () => { state.set({ phase: 'unsupported' }); go(); });
  try { workers.startMessages(); } catch { /* an older browser starts them by itself */ }
  greet();
  // installed on the Home Screen: ask the browser not to clear what is kept when the phone runs short of storage
  try {
    const installed = globalThis.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    if (installed) void navigator.storage?.persist?.().catch(() => {});
  } catch { /* no such thing here */ }

  let running = false, wanted = false;
  const visibleAndOnline = () => new Promise<void>((done) => {
    const check = () => {
      if (document.hidden || navigator.onLine === false) return;
      document.removeEventListener('visibilitychange', check); globalThis.removeEventListener('online', check); done();
    };
    document.addEventListener('visibilitychange', check); globalThis.addEventListener('online', check); check();
  });
  async function run(): Promise<void> {
    if (running || !wanted) return;
    // (the phone has been asked to use less data: what she uses is still kept, nothing is fetched ahead)
    if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) { state.set({ phase: 'paused' }); return; }
    running = true;
    try {
      // (a browser that refuses the cache store keeps nothing: the room says so, and loads as it always did)
      const cache = await caches.open(KEPT_CACHE).catch(() => null);
      if (!cache) { state.set({ phase: 'unsupported' }); running = false; return; }
      const end = await saveAhead(env.files, {
        // (past the browser's own cache as well: a file kept here is not kept there a second time)
        cache, fetch: (url) => fetch(url, { headers: { [AHEAD_HEADER]: '1' }, cache: 'no-store' }), clear: visibleAndOnline,
        // (the first word is what is kept already: only then is it 'saving', and only if something is missing)
        progress: (have, haveBytes) => state.set({ have, haveBytes, phase: have < env.files.length ? 'saving' : state.get().phase }),
      });
      state.set({ phase: end });
    } catch { state.set({ phase: 'paused' }); }
    running = false;
  }
  // a connection that comes back, or the room shown again, takes up where it stopped
  globalThis.addEventListener('online', () => { if (state.get().phase === 'paused') void run(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.get().phase === 'paused') void run(); });
  return { ...base, ready, roomReady: () => { wanted = true; void run(); } };
}
