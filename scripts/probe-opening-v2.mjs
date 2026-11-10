/**
 * HER OPENING IN v2: THE SKELETON'S DOORS AGAINST v2's OWN (the new direction's step 3; Joshua, 2026-11-09: "the more
 * natural skin tone fading out"; "v2's old opening stays switchable"). v2 undressed, looked at straight on her opening:
 * each of OPENING_LOOKS and v2's own, standing and in LEGS APART and RECLINE; BIRTH OPENING at OPENS in RECLINE; and her
 * dressed in RECLINE (nothing of it may show through her leggings). Into shots/opening-v2/, with report.json.
 *
 *     node scripts/probe-opening-v2.mjs      (NO_BUILD=1; POSES=stand,apart,recline; OPENS=30,60,100; LOOK=1)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'opening-v2');
const log = (...a) => console.log('[opening]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4330, strictPort: false, open: false }, logLevel: 'error' });
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
  const shot = (name, clip = { x: 200, y: 150, width: 600, height: 600 }) => page.screenshot({ path: path.join(SHOTS, name), clip, timeout: 300_000 }).then(() => log('shot', name));
  // (looked at from where each pose shows it: from in front and below standing, straight on lying back; her hips' middle
  // is the aim's zero)
  const VIEW = { stand: [0.0001, -0.75, 60, 0, -0.1, 0.0], apart: [0.0001, -0.6, 60, 0, -0.1, 0.02], squat: [0.0001, -0.2, 70, 0, -0.08, 0.05], recline: [0.0001, 0.12, 62, 0, -0.03, 0.05] };
  let poseNow = 'stand';
  const close = async (name, side = 0) => { const v = VIEW[poseNow] ?? VIEW.stand; await hook('aim', v[0] + side, v[1], v[2], v[3], v[4], v[5]); await run(0.15); await shot(name); };
  const LOOK = Number(process.env.LOOK ?? 1), LOOKS = (process.env.LOOKS ?? '0,1,2,v2').split(',');
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  // DRESSED first: nothing of her opening through her leggings
  if (!process.env.SKIP_DRESSED) { await hook('opening', true, LOOK); await press('sarahlab:recline'); await run(2.5); poseNow = 'recline'; await close('dressed-recline.png'); await hook('aim', 0.0001, 0.1, 230, 0, 0, 0); await run(0.2); await shot('dressed-recline-whole.png', { x: 150, y: 40, width: 700, height: 800 }); await press('sarahlab:stand'); await run(1.5); poseNow = 'stand'; }
  // (her clothes off: OUTFIT pressed until it says none)
  for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  log('outfit', await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''));
  await page.waitForTimeout(6000);
  for (const p of (process.env.POSES ?? 'stand,apart,squat,recline').split(',').filter(Boolean)) {
    if (p !== 'stand') { await press(`sarahlab:${p}`); await run(2.5); }
    poseNow = p;
    for (const l of (p === 'stand' || p === 'squat' ? LOOKS.filter((x) => x === String(LOOK) || x === 'v2') : LOOKS)) {
      report[`${p}-${l}`] = l === 'v2' ? await hook('opening', false) : await hook('opening', true, Number(l));
      await run(0.6); await close(`${p}-look${l}.png`);
    }
    if (p === 'recline') {
      await hook('opening', true, LOOK);
      for (const o of (process.env.OPENS ?? '15,30,60,100').split(',').filter(Boolean)) { await slide('sarahlab-birth-open', Number(o)); await run(1.2); report[`open${o}`] = await hook('opening'); await close(`recline-open${o}.png`); if (o === '60') await close(`recline-open${o}-side.png`, 0.8); }
      await hook('opening', false); await run(0.8); await close('recline-open-last-v2.png');
      await slide('sarahlab-birth-open', 0); await run(1);
    }
    await press('sarahlab:stand'); await run(1.5);
  }
  // (her own canal's line with her skeleton's opening on: held by her bone)
  await hook('opening', true, LOOK); await run(0.6);
  report.organs = await hook('organs');
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
