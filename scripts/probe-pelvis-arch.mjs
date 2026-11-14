/**
 * HER PUBIC ARCH, LOOKED AT (Joshua, 2026-11-10, of a birth drawn from the side: "you can even see the bone points";
 * asked to give her skeleton a woman's arch: "Yeah! Go ahead"). Her bare skeleton in the room, her organs not drawn, her
 * pelvis from her front, from below and from a quarter -- to set one build of public/models/sarah-skeleton.glb beside
 * another (scripts/rigSkeleton.mjs).
 *
 *     node scripts/probe-pelvis-arch.mjs      (NO_BUILD=1; OUT=<folder under shots/>)
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'pelvis-arch');
const log = (...a) => console.log('[arch]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4333, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const status = () => page.evaluate(() => document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '');
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  for (let k = 0; k < 8 && !(await status()).startsWith('model skeleton'); k++) { await press('sarahlab:model'); await page.waitForFunction(() => /^model /.test(document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? ''), null, { timeout: 300_000 }); await page.waitForTimeout(5000); }
  log('status', (await status()).slice(0, 60));
  await hook('organsHidden', true); await run(0.5);
  // (each look: yaw, pitch, distance, and where from the middle of her hips -- across, up, forward, metres)
  const looks = { front: [0.0001, -0.1, 42, 0, -0.07, 0], below: [0.0001, -1.25, 42, 0, -0.07, -0.03], quarter: [0.65, -0.35, 44, 0, -0.07, 0], behind: [Math.PI, -0.45, 46, 0, -0.07, -0.03] };
  for (const [name, a] of Object.entries(looks)) {
    await hook('aim', ...a); await run(0.2);
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 });
    log('shot', name);
  }
  if (errors.length) log('errors', errors.slice(0, 3).join(' | '));
} finally { await browser.close(); await new Promise((r) => server.httpServer.close(r)); }
