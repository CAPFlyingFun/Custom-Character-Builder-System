/**
 * ONE PREVIEW, ONE PAGE, kept open across commands: serves dist/, opens the room once and takes commands over HTTP.
 *   node room.mjs            (PORT=4391 QUERY='?probe=cloth' W=900 H=900 DSF=1)
 *   curl -s -X POST --data-binary @cmd.js http://127.0.0.1:4391/run     -> JSON of what the command returned
 *   curl -s http://127.0.0.1:4391/quit
 * A command is the body of an async function with: page, hook(name, ...args), press(action), text(action),
 * shot(path, clip?), wait(ms), run(seconds), settle(), errors (page errors so far), reopen({ query, w, h, dsf }).
 */
import http from 'node:http';
import path from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = '/home/claude/custom-character-builder-system';
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright');
const { preview } = await import(path.join(ROOT, 'node_modules/vite/dist/node/index.js'));

const PORT = Number(process.env.PORT ?? 4391);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4390, strictPort: false, open: false }, logLevel: 'error' });
const base = server.resolvedUrls.local[0];
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium']) { const p = path.join(b, n); if (existsSync(p)) return p; } return undefined; })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'], executablePath: exe });
let page = null;
const errors = [];
async function open({ query = process.env.QUERY ?? '?probe=cloth', w = Number(process.env.W ?? 900), h = Number(process.env.H ?? 900), dsf = Number(process.env.DSF ?? 1), touch = process.env.TOUCH === '1' } = {}) {
  if (page) await page.context().close();
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, serviceWorkers: 'block', ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  page = await context.newPage();
  page.on('pageerror', (e) => { errors.push(e.message); log('PAGE ERROR', e.message); });
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /THREE\.WebGLProgram|shader|GL_INVALID|WebGL:/i.test(t)) { errors.push(`[console ${m.type()}] ${t.slice(0, 1500)}`); log('CONSOLE', m.type(), t.slice(0, 1500)); } });
  await page.goto(base + query, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 600_000 });
  log('room up', query, `${w}x${h}@${dsf}`);
  return true;
}
const api = {
  get page() { return page; },
  errors,
  reopen: open,
  hook: (n, ...a) => page.evaluate(async ([k, b]) => { const r = await globalThis.__sarahLabCloth[k](...b); return r === undefined ? null : JSON.parse(JSON.stringify(r, (_, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v))); }, [n, a]),
  /** The room's own picture of what its camera sees (one frame), written to a file; `frames` frames first so an aim has landed. */
  pic: async (file, frames = 2, w, h) => {
    await page.evaluate((n) => globalThis.__sarahLabCloth.frames(n), frames);
    const url = await page.evaluate(([a, b]) => globalThis.__sarahLabCloth.picture(a, b, 0.92), [w ?? null, h ?? null]);
    if (!url) throw new Error('no picture');
    writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    return file;
  },
  press: (a) => page.evaluate((x) => { const e = document.querySelector(`[data-action="${x}"]`); if (!e) return false; e.click(); return true; }, a),
  text: (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.textContent ?? null, a),
  field: (f) => page.evaluate((x) => document.querySelector(`[data-field="${x}"]`)?.textContent ?? null, f),
  wait: (ms) => page.waitForTimeout(ms),
  /** a reading kept on disk as it is made: JSON, or a string as it is */
  save: (file, data) => { writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data)); return file; },
  run: (s) => page.evaluate((x) => { globalThis.__sarahLabCloth.animate(x); return true; }, s),
  shot: async (file, clip) => { await page.screenshot({ path: file, ...(clip ? { clip } : {}) }); return file; },
  /** Her skin's folds repaired and nothing stepped since: wait for the crease to land, then a second and a half more. */
  settle: async () => { for (let k = 0; k < 120; k++) { const c = await page.evaluate(() => globalThis.__sarahLabCloth.crease()); if (!c.pending) break; await page.waitForTimeout(250); } await page.waitForTimeout(1500); return true; },
};
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
let busy = Promise.resolve();
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    if (req.url === '/quit') { res.end('bye\n'); setTimeout(async () => { try { await browser.close(); await server.httpServer.close(); } finally { process.exit(0); } }, 50); return; }
    busy = busy.then(async () => {
      const t0 = Date.now();
      try {
        const out = await new AsyncFunction(...Object.keys(api), body)(...Object.keys(api).map((k) => api[k]));
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true, ms: Date.now() - t0, out: out === undefined ? null : out }) + '\n');
      } catch (e) {
        res.end(JSON.stringify({ ok: false, ms: Date.now() - t0, error: String(e?.stack ?? e).slice(0, 3000) }) + '\n');
      }
    });
  });
}).listen(PORT, '127.0.0.1');
await open();
log('listening', PORT);
