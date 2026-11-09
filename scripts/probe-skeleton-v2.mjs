/**
 * HER SKELETON INSIDE v2, TESTED (the plan's new direction, step 1; Joshua, 2026-11-09: "doing random poses to make sure
 * the skeleton doesn't come through the skin").
 *
 *     node scripts/probe-skeleton-v2.mjs [randomCount]
 *
 * Builds (unless NO_BUILD), serves dist/, opens the room with ?probe=cloth on v2, undresses her, and shoots into
 * shots/skeleton-v2/: standing (X-RAY 0 and 70, front, side, 3/4), her poses (walk, sit, squat, recline) and random
 * poses, each with how deep every piece of bone sits under her skin (`skeletonDepths`), written to report.json.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', 'skeleton-v2');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'];
const RANDOM = Number(process.argv[2] ?? 10);
const log = (...a) => console.log('[skel]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) { log('building'); await build({ root: ROOT, logLevel: 'error' }); }
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4320, strictPort: false, open: false }, logLevel: 'error' });
const url = server.resolvedUrls.local[0] + '?probe=cloth';
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ARGS, executablePath: exe });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (action) => page.evaluate((a) => document.querySelector(`[data-action="${a}"]`)?.click(), action);
  const slide = (field, v) => page.locator(`[data-field="${field}"] + input`).evaluate((input, x) => { input.value = String(x); input.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const hook = (name, ...args) => page.evaluate(([n, a]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[n](...a) ?? null)), [name, args]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  let dist = 2.9;
  const look = async (view, d = 1.6) => { await press(`sarahlab:view:${view}`); if (Math.abs(d - dist) > 1e-3) { await page.mouse.move(400, 420); await page.mouse.wheel(0, Math.log(d / dist) / 0.001); dist = d; } await page.waitForTimeout(400); };
  const shot = async (name) => { await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 150, y: 40, width: 540, height: 780 }, timeout: 300_000 }); log('shot', name); };
  const depths = async (key) => {
    const d = await hook('skeletonDepths', 2);
    const worst = (d ?? []).slice(0, 8), through = (d ?? []).reduce((s, b) => s + b.throughCount, 0), close = (d ?? []).reduce((s, b) => s + b.closeCount, 0);
    report[key] = { through, close, worst, all: d };
    log(key, `through ${through}, within 5 mm ${close};`, worst.map((b) => `${b.bone} ${b.leastMm}`).join(', '));
  };
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('[data-role="sarah-lab-hud"]', { timeout: 240_000 });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 240_000 });
  await page.waitForFunction(() => globalThis.__sarahLabCloth?.skeletonDepths?.(50) !== null, null, { timeout: 240_000, polling: 2000 });
  // (her clothes off: OUTFIT three times is none)
  for (let k = 0; k < 3; k++) { await press('sarahlab:outfit'); await page.waitForTimeout(8000); }
  await run(1);
  // STANDING
  await depths('stand');
  for (const x of [0, 70]) { await slide('sarahlab-xray', x); await run(0.2); for (const [v, view] of [['front', 'front'], ['side', 'side'], ['q34', 'three-quarter']]) { await look(view); await shot(`stand-x${x}-${v}.png`); } }
  // HER POSES
  for (const p of ['walk', 'sit', 'squat', 'recline']) {
    await press(`sarahlab:${p}`); await run(p === 'walk' ? 1.3 : 2.5); await depths(`pose-${p}`);
    for (const [v, view] of [['front', 'front'], ['side', 'side']]) { await look(view, p === 'walk' ? 1.8 : 2.4); await shot(`pose-${p}-${v}.png`); }
  }
  await press('sarahlab:stand'); await run(1.5);
  // RANDOM POSES
  for (let s = 1; s <= RANDOM; s++) {
    const n = await hook('randomPose', s); await run(0.4); await depths(`random-${s}`);
    if (s <= 6) { await look(s % 2 ? 'front' : 'side', 2.2); await shot(`random-${String(s).padStart(2, '0')}.png`); }
    void n;
  }
  await hook('randomPose', null);
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
