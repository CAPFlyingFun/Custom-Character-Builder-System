/**
 * HER SKELETON'S OPENING AGAINST THE SAME DOORS IN v2, LIKE FOR LIKE (Joshua, 2026-11-10: "That pink wasn't on the
 * skeleton's opening, so, render both at the same % and compare"). Each model undressed, in POSES, BIRTH OPENING at
 * OPENS, looked at from outside her along her canal (the hook `doorsAim`: the same view of both) and from a quarter
 * round. Into shots/opening-compare/, with report.json.
 *
 *     node scripts/probe-opening-compare.mjs      (NO_BUILD=1; POSES=recline,apart; OPENS=30,60,100; MODELS=v2,skeleton;
 *                                                  SEATS='[{"out":0.02,"restScale":1}]')
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'opening-compare');
const log = (...a) => console.log('[compare]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4331, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = {};
// (GAME TUNING, a probe's own: how far the view stands off her opening, room units, and the quarter turn)
const DIST = Number(process.env.DIST ?? 52), QUARTER = 0.7;
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const status = () => page.evaluate(() => document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '');
  const shot = (name, clip = { x: 200, y: 150, width: 600, height: 600 }) => page.screenshot({ path: path.join(SHOTS, name), clip, timeout: 300_000 }).then(() => log('shot', name));
  const POSES = (process.env.POSES ?? 'recline,apart').split(',').filter(Boolean), OPENS = (process.env.OPENS ?? '30,60,100').split(',').filter(Boolean);
  const set = async (model) => {
    for (const p of POSES) {
      await press(`sarahlab:${p}`); await run(2.5);
      for (const o of OPENS) {
        await slide('sarahlab-birth-open', Number(o)); await run(1.6);
        const g = await hook('organs');
        report[`${model}-${p}-${o}`] = { opening: g?.opening, doorSwing: g?.doorSwing, doorOpenCm: g?.doorOpenCm, doorAngles: g?.doorAngles, aim: await hook('doorsAim', DIST, 0, 0) };
        await run(0.15); await shot(`${model}-${p}-${o}-front.png`);
        await hook('doorsAim', DIST, QUARTER, 0.25); await run(0.15); await shot(`${model}-${p}-${o}-quarter.png`);
        // (and from her side, further off: her opening against her whole pelvis)
        if (process.env.SIDE) { await hook('doorsAim', DIST * 1.7, Math.PI / 2, 0); await run(0.15); await shot(`${model}-${p}-${o}-side.png`); }
      }
      await slide('sarahlab-birth-open', 0); await run(1);
      await press('sarahlab:stand'); await run(1.5);
    }
  };
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  const MODELS = (process.env.MODELS ?? 'v2,skeleton').split(',');
  if (MODELS.includes('v2')) {
    // (her clothes off: OUTFIT pressed until it says none)
    for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
    await page.waitForTimeout(6000);
    report.v2 = await hook('opening', true, Number(process.env.LOOK ?? 1));
    await run(0.6);
    // (SEATS: her doors' seat in v2 tried other ways, a JSON list for the hook `doorsSeat` -- each rendered as `v2-s<k>`)
    const seats = process.env.SEATS ? JSON.parse(process.env.SEATS) : null;
    if (!seats) await set('v2');
    else for (const [k, seat] of seats.entries()) { report[`seat${k}`] = await hook('doorsSeat', seat); await run(0.8); await set(`v2-s${k}`); }
  }
  if (MODELS.includes('skeleton')) {
    // (her bare skeleton: off the MODEL button's round in the room, on it for a probe)
    for (let k = 0; k < 8 && !(await status()).startsWith('model skeleton'); k++) { await press('sarahlab:model'); await page.waitForFunction(() => /^model /.test(document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? ''), null, { timeout: 300_000 }); await page.waitForTimeout(5000); }
    log('status', (await status()).slice(0, 60));
    report.skeleton = { status: (await status()).slice(0, 80), organs: await hook('organs').then((g) => g && { opening: g.opening, doorSwing: g.doorSwing, womb: !!g.passage }) };
    await run(0.6); await set('skeleton');
  }
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
