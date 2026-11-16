/**
 * THE CHARACTER BUILDER'S OWN PAGE: the Character Room, alone, on a canvas -- the same room TRADDOMIUM opens with
 * `?open=CharacterRoom`, hosted with nothing of the game around it (Joshua, 2026-11-04: one character system, its own
 * site, its work shared by TRADDOMIUM, Beyond Extinction, TMB-Story and the games after them).
 *
 * The frame loop is the game's in small: raw wall-clock seconds for measurement, a clamped step for the simulation,
 * paused while the page is hidden. Saved characters and the outfit library are kept in this browser under the same key
 * the game used -- and every capflyingfun.github.io site shares one browser store, so what was saved in the game's room
 * is here.
 */
import { Renderer } from './app/Renderer';
import type { AppScene, FrameInfo } from './app/Scene';
import { createSarahLabScene } from './sarahlab';
import { CHARACTER_BOOK_KEY, CHARACTER_BOOK_VERSION, EMPTY_BOOK, sanitizeBook, type CharacterBook } from './sarahlab/characterSaves';
import { createStorageRoot } from './persistence/StorageRoot';
import { localStorageKeyValueStore } from './persistence/localStorageStore';
import { assetUrl, publicTable } from './assets/assets';
import { aheadFiles, deviceLine, deviceNote, startOnDevice } from './pwa/onDevice';
import { BUILD_INFO } from './ui/buildInfo';
import type { SkinDevice } from './sarahlab/skinChoice';
import { graphicsInForce, readGraphics, storeGraphics, type GraphicsSettings } from './sarahlab/graphicsSettings';

const MAX_STEP = 1 / 20;

async function start(): Promise<void> {
  const host = document.getElementById('app');
  const ui = document.getElementById('ui');
  if (!host || !ui) throw new Error('the page has no #app or #ui');
  const storage = createStorageRoot(localStorageKeyValueStore());
  const skin = new URLSearchParams(location.search).get('skin') === 'ktx2' ? 'ktx2' : null;
  // THE ROOM KEPT ON THIS DEVICE (Joshua, 2026-11-13: "load everything at one time and hold it locally especially if I
  // have it saved as a PWA"): the service worker and what it keeps (src/pwa). Nothing on a development server.
  const table = publicTable();
  // (and nothing for a probe or a bake, which open the room by address to measure it: a download in the background is
  // one more thing moving while they do)
  const asked = new URLSearchParams(location.search);
  // HOW THE ROOM IS DRAWN HERE (graphicsSettings.ts; the room's SETTINGS): her light skin for a phone, a tablet and a
  // small screen unless it is set (skinChoice.ts; `?body=light` / `?body=full` says which), the screen's sharpness and
  // the edges' smoothing. Read once: the graphics are made with them.
  const media = (q: string): boolean => { try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch { return false; } };
  const skinDevice: SkinDevice = {
    asked: asked.get('body'), measuring: asked.has('probe') || asked.has('bake'),
    coarse: media('(pointer: coarse)'), fine: media('(any-pointer: fine)'),
    width: typeof screen !== 'undefined' ? screen.width : 0, height: typeof screen !== 'undefined' ? screen.height : 0, ratio: globalThis.devicePixelRatio ?? 1,
  };
  const local = (): Storage | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
  let graphicsKept: GraphicsSettings = readGraphics(local());
  const drawn = graphicsInForce(graphicsKept, skinDevice);
  const lightBody = drawn.lightSkin;
  const renderer = new Renderer(host, { antialias: drawn.smoothing, maxPixelRatio: drawn.sharpness });
  const device = startOnDevice({
    build: `${BUILD_INFO.version}+${BUILD_INFO.commit}`,
    enabled: import.meta.env.PROD && !asked.has('probe') && !asked.has('bake'),
    files: aheadFiles(table.revisions, table.sizes, (path) => new URL(assetUrl(path), document.baseURI).href),
    workerUrl: new URL('sw.js', document.baseURI).href,
  });
  const make = createSarahLabScene(() => ({
    // (there is nowhere to go back to: the room is the whole page)
    onBack: () => { device.reloadAsked(); location.reload(); },
    skin,
    lightBody,
    graphics: {
      settings: () => graphicsKept, inForce: () => drawn, wouldBe: (g) => graphicsInForce(g, skinDevice),
      change: (g) => { graphicsKept = g; storeGraphics(local(), g); },
      apply: () => { device.reloadAsked(); location.reload(); },
    },
    device: { line: () => deviceLine(device.state()), note: () => deviceNote(device.state()), watch: (changed) => device.watch(changed), check: () => device.check(), update: () => device.update(), newer: () => device.state().newer },
    // on a device's first visit her files wait a moment for the worker, so they are kept as they land
    beforeLoad: device.ready,
    onReady: () => device.roomReady(),
    characters: (() => {
      const store = storage.open<CharacterBook>({ key: CHARACTER_BOOK_KEY, version: CHARACTER_BOOK_VERSION, defaults: EMPTY_BOOK, sanitize: (raw) => sanitizeBook(raw) });
      return { read: () => store.read(), write: (book: CharacterBook) => store.write(book) };
    })(),
  }));
  const scene: AppScene = make({ renderer, uiLayer: ui });
  const fit = () => { const { width, height } = renderer.size(); scene.resize(width, height); };
  renderer.onResize(fit);
  fit();
  await scene.enter();
  let last = performance.now(), elapsed = 0;
  const frame = (now: number) => {
    const rawDt = Math.max(0, (now - last) / 1000);
    last = now;
    const simDt = document.hidden ? 0 : Math.min(MAX_STEP, rawDt);
    elapsed += simDt;
    const info: FrameInfo = { rawDt, simDt, elapsed };
    scene.update(info);
    renderer.render(scene.three, scene.camera);
    scene.renderOverlays?.();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start().catch((e) => {
  const p = document.createElement('pre');
  p.textContent = `The Character Builder did not start: ${String((e as Error)?.stack ?? e)}`;
  p.style.cssText = 'color:#fff;padding:16px;white-space:pre-wrap';
  document.body.appendChild(p);
});
