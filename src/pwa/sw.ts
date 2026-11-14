/**
 * THE SERVICE WORKER (Joshua, 2026-11-13: "load everything at one time and hold it locally especially if I have it
 * saved as a PWA"): the part of the site the browser keeps running beside the page, through which every request of
 * the room's passes. All it decides is in keeper.ts; this file only joins that to the browser's events.
 *
 * Built by itself into `sw.js` at the site's root (vite.config.ts `keepOnDevice`), with this build's list of files
 * written into it -- so every build's worker differs, and the browser, which asks the server for `sw.js` each time the
 * room is opened, installs the new one. A new worker takes over at once (`skipWaiting`, `clients.claim`): nothing it
 * does can hand a page a file of another build (keeper.ts).
 */
import { createKeeper } from './keeper';
import { AHEAD_HEADER, type KeepList } from './keepList';

declare const __KEEP_LIST__: KeepList;

/** As much of a service worker's world as is used here (the page's `lib` has no types for it). */
interface WaitEvent { waitUntil(work: Promise<unknown>): void }
interface FetchEvent extends WaitEvent { readonly request: Request; respondWith(answer: Promise<Response>): void }
interface MessageEvent extends WaitEvent { readonly data: unknown; readonly source: { postMessage(message: unknown): void } | null }
interface Worker {
  readonly registration: { readonly scope: string };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: WaitEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

const worker = self as unknown as Worker;
const keeper = createKeeper({ scope: worker.registration.scope, list: __KEEP_LIST__, caches, fetch: (input, init) => fetch(input, init) });

worker.addEventListener('install', (event) => { event.waitUntil(keeper.install().then(() => worker.skipWaiting())); });
worker.addEventListener('activate', (event) => { event.waitUntil(keeper.activate().then(() => worker.clients.claim())); });
worker.addEventListener('fetch', (event) => {
  const r = event.request;
  const answer = keeper.answer(r, { url: r.url, method: r.method, mode: r.mode, range: r.headers.has('range'), cache: r.cache, ahead: r.headers.has(AHEAD_HEADER) }, (work) => event.waitUntil(work));
  if (answer) event.respondWith(answer);
});
// the page says which build it is: the worker says which it is, and tidies the cache if they are the same
worker.addEventListener('message', (event) => {
  const data = event.data as { type?: string; build?: string } | null;
  if (data?.type !== 'hello') return;
  event.waitUntil(keeper.tidy(String(data.build ?? '')).then((gone) => event.source?.postMessage({ type: 'hello', build: keeper.build, tidied: gone })));
});
