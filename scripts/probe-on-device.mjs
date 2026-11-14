/**
 * WHAT A VISIT COSTS, AND WHAT IS KEPT ON THE DEVICE (2026-11-13; Joshua: "what it should do, is load everything at one
 * time and hold it locally especially if I have it saved as a PWA... It's about holding and loading the model, clothing,
 * etc at once or in stages"). The built site is served through a STAND-IN FOR GITHUB PAGES -- under the project's path,
 * with Pages' own cache headers (a file may be kept ten minutes; an ETag; 304 when it has not changed; text gzipped),
 * a speed limit shared by every download and a delay on each request -- and opened on a phone-sized screen:
 *
 *   1. a first visit: what is fetched for the room, and then what is fetched ahead and kept (src/pwa/onDevice.ts);
 *   2. the screen turned on its side and back, and LIGHT / DARK: what they ask the network for;
 *   3. a visit again, and the page loaded again in the same tab (as a phone does it when it has dropped the page);
 *   4. a new build gone live: the same site with new code and one changed public file (made here from the built site);
 *   5. a visit with no internet.
 *
 * Every request the server sees is logged, so "fetched" is the server's word, not the page's. The seconds are the
 * build machine's, drawing with a software renderer: for comparing one build with another, not a phone's seconds.
 *
 * MEASURED 2026-11-13 at 20 Mbit/s and 60 ms a request. The build then live (v0.9.20, which kept nothing): a first
 * visit 34.3 MB in 16 files; a visit again fetched her 15.45 MB body in full a second time (the browser's own cache
 * kept every small file and not the big one); with no internet she never appeared. With what is kept on the device:
 * the numbers are in CLAUDE.md ("Kept on the device").
 *
 *     node scripts/probe-on-device.mjs      (NO_BUILD=1; RATE=bytes a second; LATENCY=ms; STEPS=first,turn,again,next,offline;
 *                                            OUT=a folder for its pictures, shots/on-device by default)
 */
import { cpSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { chromium } from 'playwright';
import { build } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist'), NEXT = path.join(ROOT, '.scratch', 'on-device', 'next');
const OUT = path.resolve(ROOT, process.env.OUT ?? 'shots/on-device');
const PREFIX = '/Custom-Character-Builder-System/';
const STEPS = (process.env.STEPS ?? 'first,turn,again,next,offline').split(',');
const log = (...a) => console.log('[on device]', ...a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))));

/** The stand-in for GitHub Pages. `state.root` is the folder served; `offline(true)` takes the internet away. */
async function startPages({ root, rate, latency, maxAge = 600, port = 4390 }) {
  const MIME = { html: 'text/html; charset=utf-8', js: 'application/javascript; charset=utf-8', json: 'application/json; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', glb: 'model/gltf-binary', bin: 'application/octet-stream', wasm: 'application/wasm', webmanifest: 'application/manifest+json' };
  const TEXT = new Set(['html', 'js', 'json', 'css', 'svg', 'webmanifest']);
  const requests = [], sockets = new Set(), zipped = new Map(), state = { rate, latency, offline: false, maxAge, root };
  // one allowance for every response: a phone's connection is shared by all its downloads
  let allowance = 0, last = Date.now();
  const take = (want) => new Promise((done) => {
    if (!state.rate) return done(want);
    const tick = () => { const now = Date.now(); allowance = Math.min(state.rate / 10, allowance + ((now - last) / 1000) * state.rate); last = now;
      if (allowance >= 1) { const n = Math.min(want, Math.floor(allowance)); allowance -= n; done(n); } else setTimeout(tick, 5); };
    tick();
  });
  const server = http.createServer(async (req, res) => {
    const started = Date.now(), url = new URL(req.url, 'http://x'), entry = { path: url.pathname.slice(PREFIX.length) + url.search, status: 0, sent: 0, ms: 0 };
    requests.push(entry);
    const end = (status, headers = {}, body) => { entry.status = status; res.writeHead(status, headers); res.end(body); entry.sent = body ? body.length : 0; entry.ms = Date.now() - started; };
    if (state.offline) { req.socket.destroy(); entry.status = -1; return; }
    if (state.latency) await new Promise((r) => setTimeout(r, state.latency));
    let rel = url.pathname.startsWith(PREFIX) ? decodeURIComponent(url.pathname.slice(PREFIX.length)) || 'index.html' : null;
    if (rel?.endsWith('/')) rel += 'index.html';
    const file = rel === null ? null : path.join(state.root, rel);
    if (!file || !file.startsWith(state.root) || !existsSync(file) || !statSync(file).isFile()) return end(404, { 'content-type': 'text/plain', 'cache-control': `max-age=${state.maxAge}` }, Buffer.from('not found'));
    const st = statSync(file), ext = path.extname(file).slice(1).toLowerCase(), etag = `W/"${st.size.toString(16)}-${Math.round(st.mtimeMs).toString(16)}"`;
    const base = { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': `max-age=${state.maxAge}`, etag, 'last-modified': st.mtime.toUTCString(), vary: 'Accept-Encoding' };
    if (req.headers['if-none-match'] === etag) return end(304, base);
    entry.status = 200;
    if (TEXT.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      const key = file + etag; if (!zipped.has(key)) zipped.set(key, zlib.gzipSync(readFileSync(file)));
      const body = zipped.get(key); res.writeHead(200, { ...base, 'content-encoding': 'gzip', 'content-length': body.length });
      for (let at = 0; at < body.length && !res.destroyed;) { const n = await take(Math.min(16384, body.length - at)); res.write(body.subarray(at, at + n)); at += n; entry.sent = at; }
    } else {
      res.writeHead(200, { ...base, 'content-length': st.size });
      const stream = createReadStream(file, { highWaterMark: 16384 });
      try { for await (const chunk of stream) { for (let at = 0; at < chunk.length && !res.destroyed;) { const n = await take(chunk.length - at); res.write(chunk.subarray(at, at + n)); at += n; entry.sent += n; } if (res.destroyed) { stream.destroy(); break; } } } catch { /* the browser went away */ }
    }
    res.end(); entry.ms = Date.now() - started;
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}${PREFIX}`, requests, state,
    offline(on) { state.offline = on; if (on) for (const s of sockets) s.destroy(); },
    close: () => new Promise((r) => { for (const s of sockets) s.destroy(); server.close(r); }) };
}
/** What a stretch of the server's log came to. */
const tally = (entries) => { const ok = entries.filter((e) => e.status === 200); return { requests: entries.length, files: ok.length, mb: +(ok.reduce((a, e) => a + e.sent, 0) / 1048576).toFixed(2), notChanged: entries.filter((e) => e.status === 304).length, missing: entries.filter((e) => e.status === 404).map((e) => e.path), refused: entries.filter((e) => e.status === -1).length }; };

/**
 * THE BUILD AFTER THIS ONE, made from the built site: its code under a new name and saying it is a later build, its
 * worker listing that code, and one public file (a skin) at a new revision -- what a release that changed the code
 * and one picture looks like to a device that holds this build.
 */
function makeNext() {
  rmSync(NEXT, { recursive: true, force: true }); mkdirSync(path.dirname(NEXT), { recursive: true }); cpSync(DIST, NEXT, { recursive: true });
  const code = readdirSync(path.join(NEXT, 'assets')).find((f) => /^index-.*\.js$/.test(f)), renamed = 'index-NEXTNEXT.js';
  renameSync(path.join(NEXT, 'assets', code), path.join(NEXT, 'assets', renamed));
  const worker = readFileSync(path.join(NEXT, 'sw.js'), 'utf8'), was = /build:"([^"+]+)\+([^"]+)"/.exec(worker);
  const skin = /(models\/skins\/[^"?]+)\?r=([0-9a-f]{8})/.exec(worker);
  if (!was || !skin) throw new Error('the built worker does not list what this probe changes');
  const [, version, commit] = was, rev = skin[2], revNext = rev.slice(0, 7) + (rev[7] === '0' ? '1' : '0');
  const patch = (file, pairs) => { let s = readFileSync(file, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(`${path.basename(file)} has no ${a}`); s = s.split(a).join(b); } writeFileSync(file, s); };
  patch(path.join(NEXT, 'index.html'), [[code, renamed]]);
  patch(path.join(NEXT, 'sw.js'), [[code, renamed], [`${version}+${commit}`, `${version}-next+nextone`], [`${skin[1]}?r=${rev}`, `${skin[1]}?r=${revNext}`]]);
  patch(path.join(NEXT, 'assets', renamed), [[`"${commit}"`, '"nextone"'], [`"${version}"`, `"${version}-next"`], [rev, revNext]]);
  return { code: `assets/${code}`, codeNext: `assets/${renamed}`, skin: `${skin[1]}?r=${rev}`, skinNext: `${skin[1]}?r=${revNext}`, version: `${version}-next` };
}

if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
mkdirSync(OUT, { recursive: true });
const srv = await startPages({ root: DIST, rate: Number(process.env.RATE ?? 2_500_000), latency: Number(process.env.LATENCY ?? 60) });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const W = 430, H = 932;
try {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => log('pageerror:', e.message));
  const read = () => page.evaluate(() => ({ status: document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '', outfit: document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? '' })).catch(() => ({ status: '', outfit: '' }));
  const press = (a) => page.evaluate((x) => { const b = document.querySelector(`[data-action="${x}"]`); b?.click(); return b ? (b.textContent ?? '').trim() : null; }, a);
  const quiet = async (ms = 4000, most = 300_000) => { const t0 = Date.now(); for (;;) { const n = srv.requests.length; await page.waitForTimeout(ms); if ((srv.requests.length === n && srv.requests.every((e) => e.status !== 0)) || Date.now() - t0 > most) return; } };
  /** What the page says is kept, and what the cache store holds. */
  const device = () => page.evaluate(async () => {
    const line = document.querySelector('[data-field="sarahlab-device"]')?.textContent ?? '', notice = document.querySelector('[data-field="sarahlab-notice"]')?.textContent ?? '';
    const kept = {};
    for (const name of await caches.keys()) { const c = await caches.open(name); let bytes = 0; const keys = await c.keys(); for (const k of keys) bytes += Number((await c.match(k))?.headers.get('content-length') ?? 0); kept[name] = { files: keys.length, mb: +(bytes / 1048576).toFixed(1), has: keys.map((k) => k.url.replace(/^.*Custom-Character-Builder-System\//, '')) }; }
    return { line, notice, worker: navigator.serviceWorker?.controller?.scriptURL?.split('/').pop() ?? null, kept };
  });
  const short = (d) => ({ line: d.line, notice: d.notice, worker: d.worker, kept: Object.fromEntries(Object.entries(d.kept).map(([k, v]) => [k, { files: v.files, mb: v.mb }])) });
  const saved = async (most = 400_000) => { const t0 = Date.now(); for (;;) { const d = await device(); if (/whole room is saved|does not keep/.test(d.line) || Date.now() - t0 > most) return d; await page.waitForTimeout(1500); } };
  const dressed = async (most = 300_000) => { const t0 = Date.now(); for (;;) { const s = await read(); if (s.status.startsWith('model v2-body') && s.outfit && !s.outfit.includes('…')) return (Date.now() - t0) / 1000; if (Date.now() - t0 > most) return 0; await page.waitForTimeout(700); } };
  const visit = async (name) => {
    const mark = srv.requests.length; await page.goto('about:blank');
    const t0 = Date.now(), going = page.goto(srv.url, { waitUntil: 'commit', timeout: 60_000 }).catch((e) => log(name, 'navigation:', String(e.message).split('\n')[0]));
    const after = await dressed(); await going;
    const forRoom = srv.requests.slice(mark);
    log(`${name}: ${after ? `she is dressed after ${((Date.now() - t0) / 1000).toFixed(1)} s` : 'she never appears'};`, 'fetched for the room', tally(forRoom));
    // (her hair comes on after her clothes -- a moment on a phone, up to half a minute behind this machine's software
    // renderer, MEASURED 2026-11-13 with and without internet: the picture waits for it)
    await page.waitForTimeout(Number(process.env.SETTLE ?? 30000));
    await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 120_000 }).catch(() => {});
    return mark;
  };
  const during = async (what, act) => { const mark = srv.requests.length; const r = await act(); await page.waitForTimeout(2500); await quiet(2500, 60_000); log(`${what}${r ? ` (${r})` : ''}:`, tally(srv.requests.slice(mark))); };

  if (STEPS.includes('first')) {
    await visit('1-first-visit');
    const mark = srv.requests.length, d = await saved(); await quiet();
    log('   then fetched ahead and kept', tally(srv.requests.slice(mark)), short(d));
  }
  if (STEPS.includes('turn')) {
    await during('the screen turned on its side', () => page.setViewportSize({ width: H, height: W }));
    await during('and upright again', () => page.setViewportSize({ width: W, height: H }));
    await during('LIGHT / DARK', () => press('sarahlab:theme'));
    await during('LIGHT / DARK back', () => press('sarahlab:theme'));
  }
  if (STEPS.includes('again')) {
    await visit('2-visit-again'); log('  ', short(await saved(120_000)));
    const mark = srv.requests.length; await page.reload({ waitUntil: 'commit' }); await dressed(); await quiet();
    log('3-the page loaded again in the same tab:', tally(srv.requests.slice(mark)), short(await device()));
  }
  if (STEPS.includes('next')) {
    const next = makeNext(); srv.state.root = NEXT;
    const mark = await visit('4-a-new-build-is-live'); const d = await saved(); await quiet();
    log('   in all', tally(srv.requests.slice(mark)), short(d));
    const has = Object.values(d.kept).flatMap((k) => k.has), title = await page.evaluate(() => document.querySelector('[data-field="sarahlab-title"]')?.textContent ?? '');
    log('   the page says it is:', title, '| the new code kept:', has.includes(next.codeNext), '| the old code gone:', !has.includes(next.code), '| the new skin kept:', has.includes(next.skinNext), '| the old skin gone:', !has.includes(next.skin));
    await visit('5-the-new-build-again');
  }
  if (STEPS.includes('offline')) {
    srv.offline(true);
    await visit('6-no-internet'); log('  ', short(await device()));
    srv.offline(false);
  }
} catch (error) { log('FAILED', String(error?.stack ?? error)); process.exitCode = 1; }
finally { await browser.close(); await srv.close(); }
