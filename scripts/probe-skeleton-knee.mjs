/**
 * HER KNEES, CLOSE (Joshua, 2026-11-09: "render a close up of the knee with half skin transparency to still see the bone
 * and skin confirm for sure"): v2 undressed, X-RAY 50, her knees from the front, the side and 3/4 -- standing, walking
 * and seated -- with where the skeleton's knee (the gap between its thigh bone and shin bone) and v2's knee joint stand.
 *
 *     NO_BUILD=1 node scripts/probe-skeleton-knee.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', 'skeleton-knee');
const M = 100;
const log = (...a) => console.log('[knee]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4322, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const shot = async (name) => { await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 }); log('shot', name); };
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.__sarahLabCloth?.skeletonDepths?.(50) != null, null, { timeout: 300_000, polling: 2000 });
  for (let k = 0; k < 3; k++) { await press('sarahlab:outfit'); await page.waitForTimeout(8000); }
  await slide('sarahlab-xray', 50); await run(1);
  for (const p of ['stand', 'walk', 'sit']) {
    if (p !== 'stand') { await press(`sarahlab:${p}`); await run(p === 'walk' ? 1.3 : 2.5); }
    report[p] = await hook('jointHeights');
    // (her knees: about 43 cm under her hips; seated, forward of them)
    const dy = p === 'sit' ? -0.05 : -0.43, dz = p === 'sit' ? 0.4 : 0;
    for (const [v, yaw] of [['front', 0.0001], ['side', Math.PI / 2], ['q34', Math.PI / 4]]) {
      await hook('aim', yaw, 0.05, 0.75 * M, 0, dy, dz); await run(0.1); await shot(`${p}-${v}.png`);
    }
  }
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
} finally { await browser.close(); server.httpServer.close(); }
