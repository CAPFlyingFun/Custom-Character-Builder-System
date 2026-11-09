/**
 * HER HEAD SIZE AND HER BARE FEET, FOR JOSHUA'S CHOICE (2026-11-09: "render the feet without shoes"; the skull at real
 * size against a bigger head, "Show me first"). One page: v2 undressed and barefoot, X-RAY 50 --
 *   her feet, front and side, with the depth of her foot bones;
 *   her head at HEAD +0% (skull fitted, 82%), +0% (skull real size), +10% and +20% (skull real size), front and side,
 *   with how deep the skull sits under her skin at each.
 *
 *     NO_BUILD=1 node scripts/probe-head-feet.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', 'head-feet');
const log = (...a) => console.log('[head-feet]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4324, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join('/opt/pw-browsers', n); if (existsSync(p)) return p; } return '/opt/pw-browsers/chromium'; })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const bodySlide = (key, v) => page.evaluate(([k, x]) => { const l = document.querySelector(`[data-field="sarahlab-body-${k}"]`)?.closest('div'), i = l?.nextElementSibling; if (!(i instanceof HTMLInputElement)) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [key, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const shot = async (name) => { await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 250, y: 150, width: 500, height: 600 }, timeout: 300_000 }); log('shot', name); };
  const aimAt = async (joint, yaw, dist = 55) => { const j = await hook('jointHeights'), mid = [0, 1, 2].map((a) => (j.hipL[a] + j.hipR[a]) / 2), at = j[joint]; await hook('aim', yaw, 0.05, dist, (at[0] - mid[0]) / 100, (at[1] - mid[1]) / 100, (at[2] - mid[2]) / 100); await run(0.1); };
  const depth = async (key, bones) => { const r = await hook('skeletonDepths', 2); const b = (r?.bones ?? []).filter((x) => bones.includes(x.joint) || bones.includes(x.bone)); report[key] = b.map((x) => ({ joint: x.joint, leastMm: x.leastMm, through: x.throughCount, points: x.points })); log(key, JSON.stringify(report[key])); };
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => globalThis.__sarahLabCloth?.skeletonDepths?.(50) != null, null, { timeout: 300_000, polling: 2000 });
  for (let k = 0; k < 3; k++) await press('sarahlab:outfit');
  await press('sarahlab:sneakers');
  await page.waitForTimeout(8000);
  await slide('sarahlab-xray', 50); await run(1);
  // BAREFOOT
  for (const [v, yaw] of [['front', 0.0001], ['side', Math.PI / 2]]) { await aimAt('ankleL', yaw, 45); await shot(`feet-${v}.png`); }
  await slide('sarahlab-xray', 0); await run(0.2); await aimAt('ankleL', Math.PI / 4, 45); await shot('feet-skin-q34.png'); await slide('sarahlab-xray', 50); await run(0.2);
  // (her bare feet's skin alone, front and side)
  report.footCoverMm = await hook('skeletonDepths', 2).then((r) => r?.footCoverMm ?? null);
  await slide('sarahlab-xray', 0); await run(0.2);
  for (const [v, yaw] of [['front', 0.0001], ['side', Math.PI / 2]]) { await aimAt('ankleL', yaw, 45); await shot(`feet-skin-${v}.png`); }
  await slide('sarahlab-xray', 50); await run(0.2);
  // HEAD SIZES
  if (process.env.ONLY !== 'feet') for (const [key, head, skull] of [['h0-fitted', 0, null], ['h0-real', 0, 1], ['h10-real', 10, 1], ['h20-real', 20, 1]]) {
    await bodySlide('head', head); await run(0.5);
    report[`${key}-fit`] = await hook('skeletonRelay', [skull]); await run(0.3);
    await depth(key, ['head', 'Bone_016', 'Jaw']);
    for (const [v, yaw] of [['front', 0.0001], ['side', Math.PI / 2]]) { await aimAt('head', yaw, 50); await shot(`${key}-${v}.png`); }
  }
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
} finally { await browser.close(); server.httpServer.close(); }
