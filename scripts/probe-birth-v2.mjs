/**
 * A BIRTH THROUGH HER SKELETON'S OPENING IN v2 (the new direction's step 3; Joshua, 2026-11-09: "now that we have a
 * skeleton it can go through and hold on"). RECLINE, the birth's clock set to each of TIMES (seconds, FAST pace) and held
 * there: what the birth says, how far her baby's head is past her opening and off her canal's line, how open she is, and a
 * picture from in front (and from her side at SIDES). OPENING=v2 runs it on v2's own opening instead, to compare.
 * Into shots/birth-v2/ (or OUT), with report.json.
 *
 *     node scripts/probe-birth-v2.mjs      (NO_BUILD=1; TIMES=10,20,...; OPENING=skeleton|v2; XRAY=0; BEND=0; SIDE=yaw,pitch,distance,dx,dy,dz; HIDE=1: her side pictures with her hidden -- her baby and her organs alone)
 *
 * BELLY=<percent> (100): her belly as the birth is played. A birth is played only with her pregnant and her belly over
 * 90% (Joshua, 2026-11-14; birthSequence.ts BIRTH_NEEDS), and a probe opens on her at 73%: what this measured before
 * that day was measured at 73%.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.env.OPENING ?? 'skeleton';
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? `birth-v2-${MODE}`);
const TIMES = (process.env.TIMES ?? '4,14,24,30,34,37,40,43,47,52,60,75').split(',').map(Number);
const SIDES = new Set((process.env.SIDES ?? '37,43').split(',').map(Number));
// (the side look: yaw, pitch, distance, and where from the middle of her hips -- across, up, forward, metres)
const SIDE = (process.env.SIDE ?? '1.2,0.1,150,0,0,0.1').split(',').map(Number);
const log = (...a) => console.log('[birth]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4334, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = { mode: MODE, at: {} };
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, name), clip: { x: 150, y: 100, width: 700, height: 700 }, timeout: 300_000 }).then(() => log('shot', name));
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  // (MODEL=skeleton: the same birth on her bare skeleton, looked at from outside her along her canal and from her side)
  const SKEL = process.env.MODEL === 'skeleton';
  if (SKEL) { for (let k = 0; k < 8 && !(await page.evaluate(() => document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '')).startsWith('model skeleton'); k++) { await press('sarahlab:model'); await page.waitForFunction(() => /^model /.test(document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? ''), null, { timeout: 300_000 }); await page.waitForTimeout(5000); } }
  else await hook('opening', MODE !== 'v2', ...(process.env.LOOK !== undefined ? [Number(process.env.LOOK)] : []));
  // (NAKED=1: her clothes off first -- OUTFIT pressed until it says none -- for a look at her from the side with nothing over it)
  if (process.env.NAKED) { for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); } await page.waitForTimeout(6000); }
  // (her belly over 90% first: no birth is played below it)
  await slide('sarahlab-bump', Number(process.env.BELLY ?? 100)); await page.waitForTimeout(4000); await run(1);
  await press('sarahlab:recline'); await run(2.5);
  // (BEND=0: her baby as one stiff length down her canal, as it was, to compare)
  if (process.env.BEND === '0') await hook('babyAlong', false);
  if (process.env.XRAY) { await slide('sarahlab-xray', Number(process.env.XRAY)); await page.waitForTimeout(15000); await run(1); }
  await hook('birth', { t: 0, pace: 'fast', run: false }); await run(1.5);
  for (const t of TIMES) {
    await hook('birth', { t, run: false }); await run(1.2);
    const b = await hook('birth'), o = await hook('opening');
    if (b?.needs) log('no birth is played:', b.needs);
    report.at[t] = { line: b?.line, headPastMouthCm: b?.headPastMouthCm, headFromPathCm: b?.headFromPathCm, bodyOffPathCm: b?.bodyOffPathCm, bodyInCanal: b?.bodyInCanal?.length, open: b?.open, doorsOpenCm: o?.openM != null ? +(o.openM * 100).toFixed(1) : null, doors: o?.doors, stage: b?.now?.stage ?? null, down: b?.now?.down, dressed: o?.dressed, bottomsOff: o?.bottomsOff, canalM: o?.canalM, pathM: b?.path?.length };
    log(t, JSON.stringify(report.at[t]));
    // (DETAIL=1: each joint of its back and legs in her canal, and how far off her canal's line, cm; NOSHOT=1: no pictures)
    if (process.env.DETAIL) log(t, 'in her canal', JSON.stringify(b?.bodyInCanal));
    if (process.env.DETAIL) { const sk = (await hook('doorsSeat'))?.skinLaid; log(t, 'her skin over the seat', JSON.stringify(sk ? { points: sk.points, most: sk.most, share: sk.share, ms: sk.ms, parts: sk.parts, inside: sk.inside } : null)); }
    if (process.env.NOSHOT) continue;
    if (SKEL) {
      await hook('doorsAim', 80, 0.7, 0.25); await run(0.15); await shot(`t${String(t).padStart(3, '0')}-quarter.png`);
      await hook('doorsAim', 100, Math.PI / 2, 0); await run(0.15); await shot(`t${String(t).padStart(3, '0')}-side.png`);
      continue;
    }
    await hook('aim', 0.0001, 0.12, 105, 0, -0.03, 0.05); await run(0.15); await shot(`t${String(t).padStart(3, '0')}-front.png`);
    if (SIDES.has(t)) { if (process.env.HIDE) await hook('herHidden', true); await hook('aim', ...SIDE); await run(0.15); await shot(`t${String(t).padStart(3, '0')}-side.png`); if (process.env.HIDE) await hook('herHidden', false); }
  }
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
