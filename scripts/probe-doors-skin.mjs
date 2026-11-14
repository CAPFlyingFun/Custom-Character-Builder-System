/**
 * v2: THE SKIN ROUND HER DOORS AS DRAWN, DUMPED (a diagnosis: which of its points stand inside her canal). RECLINE, BIRTH
 * OPENING at OPEN (100): the hook `doorsDrawn` written to shots/doors-skin/drawn.json.
 *
 *     node scripts/probe-doors-skin.mjs      (NO_BUILD=1; OPEN=100)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', 'doors-skin');
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4332, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  await page.waitForTimeout(6000);
  await hook('opening', true, 1); await press('sarahlab:recline'); await run(2.5);
  await slide('sarahlab-birth-open', Number(process.env.OPEN ?? 100)); await run(1.8);
  writeFileSync(path.join(SHOTS, 'drawn.json'), JSON.stringify(await hook('doorsDrawn')));
  console.log('[doors-skin] written');
} finally { await browser.close(); server.httpServer.close(); }
