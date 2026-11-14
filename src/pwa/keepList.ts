/**
 * WHAT THE ROOM KEEPS ON THE DEVICE, AND UNDER WHAT ADDRESS (Joshua, 2026-11-13: "what it should do, is load everything
 * at one time and hold it locally especially if I have it saved as a PWA... It's about holding and loading the model,
 * clothing, etc at once or in stages").
 *
 * MEASURED the same day on the build then live, behind a stand-in for GitHub Pages (its cache headers: a file may be
 * kept ten minutes, then must be asked for again): a first visit fetched 34.3 MB in 16 files; a visit again fetched her
 * 15.45 MB body in full a second time -- the browser's own cache had kept every small file and not the big one -- and
 * with no internet she never appeared. A browser's cache is the browser's to fill and to empty. What is kept here is
 * kept by the site, in a cache of its own, until the site lets it go.
 *
 * Shared by the service worker (keeper.ts), the page (onDevice.ts) and the build (vite.config.ts), so the three can
 * not disagree about a file's address. No DOM, no three.
 */

/** The cache's name. Every capflyingfun.github.io site shares one cache store: this one is the Character Builder's alone. */
export const KEPT_CACHE = 'character-builder-kept-v1';
/** This site's caches, by prefix: one of an older layout is removed when a worker takes over; another site's is never touched. */
export const KEPT_PREFIX = 'character-builder-kept-';

/** What a build keeps: handed to the worker when the site is built (`__KEEP_LIST__`). */
export interface KeepList {
  /** The build: its version and commit. The page that tidies the cache must be this build's own. */
  readonly build: string;
  /** The page's own files, relative to the site ('' is the page itself): kept before the worker counts as installed. */
  readonly shell: readonly string[];
  /** Every public file as the room asks for it, relative to the site: its path with its content revision. */
  readonly files: readonly string[];
}

/**
 * The mark on a request the PAGE makes to keep a file itself (onDevice.ts `saveAhead`): the worker leaves such a
 * request alone, so the file is written to the cache once, by the page, and not a second time on its way through.
 */
export const AHEAD_HEADER = 'x-keep-ahead';

/** A public file's address as the room asks for it (assets.ts `assetUrl`): its path, stamped with its content revision. */
export const stamped = (path: string, rev: string | undefined): string => (rev ? `${path}?r=${rev}` : path);

/**
 * Public files the room does not ask for by itself, so they are not fetched ahead of need. Each is still kept the
 * first time something does ask for it; a file not named here is fetched ahead, so a new file is held by default.
 */
export const NOT_AHEAD: readonly RegExp[] = Object.freeze([
  // the KTX2 skin pilot's body and its transcoder: only an address with ?skin=ktx2 asks for them
  /-ktx2\.glb$/, /^libs\/basis\//,
  // her bake for the story player: TMB-Story's, never the room's
  /^models\/sarah-v2-story\.glb$/,
  // the bodies her approved one was built from, off the MODEL button since 2026-11-13 ("disable all other models"):
  // only a probe steps to them now. And two files no part of the room asks for (the first Sarah, a badge)
  /^models\/sarah-base\.glb$/, /^models\/sarah-v2\.glb$/, /^models\/sarah-v2-arms\.glb$/, /^models\/sarah\.glb$/, /^models\/badge\.glb$/,
  // the Home Screen's own (the browser asks for them when it wants them, without a revision)
  /^icons\//, /^manifest\.webmanifest$/,
]);
export const fetchedAhead = (path: string): boolean => !NOT_AHEAD.some((r) => r.test(path));

/** Of the page's bundled files, the ones the room can not start without (the KTX2 pilot's transcoder is not one). */
export const inShell = (file: string): boolean => file.startsWith('assets/') && !/basis_transcoder/.test(file);

/**
 * Whether what is behind `url` can never change: a bundle Vite named by its content (`assets/index-ByLX.js`), or a
 * public file asked for with its content revision (`models/x.glb?r=1a2b3c4d`). Only this site's (`scope`, its
 * address with the closing slash).
 */
export function unchanging(url: URL, scope: string): boolean {
  if (!url.href.startsWith(scope)) return false;
  const rel = url.href.slice(scope.length);
  return rel.startsWith('assets/') || /^[0-9a-f]{8}$/.test(url.searchParams.get('r') ?? '');
}

/** A response worth keeping: the whole file, from this site, with nothing wrong with it. */
export const keepable = (r: { ok: boolean; status: number; type?: string }): boolean =>
  r.ok && r.status === 200 && (r.type === undefined || r.type === 'basic' || r.type === 'default');
