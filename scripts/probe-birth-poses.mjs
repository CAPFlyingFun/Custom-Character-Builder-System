/**
 * HER BIRTH POSES, DRESSED AND BARE (Joshua, 2026-11-09: "the skin and even the clothes have weird textures and like the
 * opening is not looking right... mainly on Leg Apart, Squat, and Recline"): v2 in LEGS APART, SQUAT and RECLINE, dressed
 * and undressed, whole and close at her pelvis, into shots/birth-poses/.
 *
 *     NO_BUILD=1 node scripts/probe-birth-poses.mjs
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'birth-poses');
const log = (...a) => console.log('[birth]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4324, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const shot = (name, clip = { x: 150, y: 40, width: 700, height: 800 }) => page.screenshot({ path: path.join(SHOTS, name), clip, timeout: 300_000 }).then(() => log('shot', name));
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(8000);
  for (const dress of (process.env.DRESS ?? 'dressed,bare').split(',')) {
    if (dress === 'bare') { for (let k = 0; k < 3; k++) await press('sarahlab:outfit'); await page.waitForTimeout(8000); }
    for (const p of (process.env.POSES ?? 'apart,squat,recline').split(',')) {
      await press(`sarahlab:${p}`); await run(2.5);
      await hook('aim', 0.0001, 0.1, 230, 0, 0, 0); await run(0.2); await shot(`${dress}-${p}-whole.png`);
      // (close at her pelvis, low and from the front, so her opening shows)
      await hook('aim', 0.0001, -0.35, 70, 0, -0.06, 0.02); await run(0.2); await shot(`${dress}-${p}-close.png`, { x: 200, y: 150, width: 600, height: 600 });
    }
    await press('sarahlab:stand'); await run(1.5);
  }
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
