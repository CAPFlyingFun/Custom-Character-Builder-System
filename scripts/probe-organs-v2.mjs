/**
 * HER ORGANS INSIDE v2 (the new direction's step 2; Joshua, 2026-11-09: "Port all organs... lock... to real bone
 * landmarks"): v2 undressed, X-RAY up, pregnant as she opens and not pregnant, standing and in POSES -- whole, and close at
 * her belly from the front and the side -- into shots/organs-v2/, with what her organs report (report.json).
 *
 *     node scripts/probe-organs-v2.mjs        (NO_BUILD=1 uses dist/ as it is; XRAY=70; POSES=sit,squat)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'organs-v2');
const XRAY = Number(process.env.XRAY ?? 70);
const log = (...a) => console.log('[organs]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4328, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const shot = (name, clip = { x: 150, y: 40, width: 700, height: 800 }) => page.screenshot({ path: path.join(SHOTS, name), clip, timeout: 300_000 }).then(() => log('shot', name));
  const set = async (tag) => {
    for (const [v, yaw] of [['front', 0.0001], ['side', Math.PI / 2], ['q34', Math.PI / 4]]) { await hook('aim', yaw, 0.05, 230, 0, 0.1, 0); await run(0.15); await shot(`${tag}-${v}.png`); }
    for (const [v, yaw] of [['front', 0.0001], ['side', Math.PI / 2]]) { await hook('aim', yaw, 0.05, 95, 0, 0.16, 0); await run(0.15); await shot(`${tag}-close-${v}.png`, { x: 200, y: 100, width: 600, height: 700 }); }
  };
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  for (let k = 0; k < 3; k++) await press('sarahlab:outfit');
  await page.waitForTimeout(8000);
  await slide('sarahlab-xray', XRAY);
  await page.waitForFunction(() => globalThis.__sarahLabCloth?.skeletonDepths?.(50) != null, null, { timeout: 300_000, polling: 2000 });
  await run(1.5);
  report.pregnant = { belly: await hook('belly'), organs: await hook('organs') };
  if (!process.env.SKIP_PREGNANT) await set('pregnant-stand');
  for (const p of (process.env.POSES ?? '').split(',').filter(Boolean)) { await press(`sarahlab:${p}`); await run(2.5); await set(`pregnant-${p}`); report[`pose-${p}`] = (await hook('belly'))?.sway; }
  if (process.env.POSES) { await press('sarahlab:stand'); await run(1.5); }
  await press('sarahlab:pregnant'); await run(1.5);
  report.notPregnant = { belly: await hook('belly'), organs: await hook('organs') };
  await set('not-pregnant-stand');
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
