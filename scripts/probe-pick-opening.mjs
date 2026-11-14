/**
 * WHAT IS DRAWN AT A PLACE IN HER OPENING (a colour nobody can name): v2 undressed, POSE, BIRTH OPENING at OPEN, looked at
 * along her canal from outside (the hook `doorsAim`), and at each of AT's places in that picture (x:y, pixels of the 600
 * square the other probes cut out) the meshes a line through it meets, nearest first. Into shots/pick-opening/.
 *
 *     node scripts/probe-pick-opening.mjs      (NO_BUILD=1; POSE=apart; OPEN=100; AT=305:250,150:190; VIEW=yaw:pitch:dist)
 *
 * NORMALS=1 also takes the look with her body drawn by the normals it is shaded with (view-normals.png).
 * STRAYS=1 also saves her body's own skin that stands inside the tube round her canal (the room's `seatStrays`) as
 * strays-<pose>-<open>.json.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'pick-opening');
const log = (...a) => console.log('[pick]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4337, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('pageerror', e.message));
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  await page.waitForTimeout(6000);
  await hook('opening', true, ...(process.env.LOOK !== undefined ? [Number(process.env.LOOK)] : [])); await run(0.6);
  if (process.env.SEAT) { await hook('doorsSeat', JSON.parse(process.env.SEAT)); await run(0.8); }
  await press(`sarahlab:${process.env.POSE ?? 'apart'}`); await run(2.5);
  await slide('sarahlab-birth-open', Number(process.env.OPEN ?? 100)); await run(1.6);
  const [yaw, pitch, dist] = (process.env.VIEW ?? '0:0:52').split(':').map(Number);
  await hook('doorsAim', dist, yaw, pitch); await run(0.15);
  await page.screenshot({ path: path.join(SHOTS, 'view.png'), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 });
  const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top }; });
  for (const at of (process.env.AT ?? '300:300').split(',')) {
    const [x, y] = at.split(':').map(Number), h = (await hook('pickAny', 200 + x - box.x, 150 + y - box.y, 5)) ?? [];
    log(at, h.map((q) => `${q.parent}/${q.mesh}#${q.group}${q.facing < 0 ? '(back)' : ''}@${q.cm}cm`).join('  >  ') || 'nothing');
  }
  // (NORMALS=1: the same look with her body drawn by the normals it is shaded with -- toward the view is blue, away dark)
  if (process.env.NORMALS) { await hook('normalSkin', true); await run(0.15); await page.screenshot({ path: path.join(SHOTS, 'view-normals.png'), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 }); await hook('normalSkin', false); }
  if (process.env.STRAYS) {
    const s = (await hook('seatStrays', 0.001)) ?? [], leg = s.filter((q) => q[4]).length, piece = s.filter((q) => q[5]).length;
    writeFileSync(path.join(SHOTS, `strays-${process.env.POSE ?? 'apart'}-${process.env.OPEN ?? 100}.json`), JSON.stringify(s));
    log('strays', s.length, 'of them her legs\' skin', leg, 'of the piece behind the area', piece, 'deepest cm', +(Math.max(0, ...s.map((q) => q[3])) * 100).toFixed(2));
  }
} finally { await browser.close(); server.httpServer.close(); }
