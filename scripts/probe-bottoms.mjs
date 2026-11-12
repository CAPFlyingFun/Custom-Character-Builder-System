/**
 * HER BOTTOMS ON THE NEW BODY (Joshua, 2026-11-11: "start on the bikini bottom as well as all painted bottoms" -- the
 * bikini bottom "was hidden in the pubic bone"): each outfit in OUTFITS (names, matched in the OUTFIT button), in each of
 * POSES, from a few looks at her hips (VIEWS name:yaw:pitch:distance:height, the hook `look`). Into shots/<OUT>/.
 *
 *     node scripts/probe-bottoms.mjs   (NO_BUILD=1; OUTFITS='bikini|painted swimsuit|...'; POSES=stand,recline;
 *                                       VIEWS=front:0:0.05:70:95,side:1.57:0.05:70:95,low:0:-0.6:70:90; OUT=bottoms)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'bottoms');
const log = (...a) => console.log('[bottoms]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4335, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const outfitText = () => page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? '');
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, name), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 }).then(() => log('shot', name));
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  const OUTFITS = (process.env.OUTFITS ?? 'bikini|Sarah · red tee + charcoal leggings|painted tee + low leggings|painted swimsuit|painted leotard').split('|');
  const POSES = (process.env.POSES ?? 'stand,recline').split(',');
  const VIEWS = (process.env.VIEWS ?? 'front:0:0.05:70:95,side:1.57:0.05:70:95,low:0:-0.6:70:90').split(',');
  for (const [k, want] of OUTFITS.entries()) {
    // (OUTFIT pressed until it names this one, the dressing settled)
    let t = '';
    for (let n = 0; n < 24; n++) { t = await outfitText(); if (t.includes(want) && !t.includes('…')) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
    log('outfit', JSON.stringify(t));
    await page.waitForTimeout(5000);
    // (LOG_HOOKS='skinShell,...': each hook's answer, once the outfit is on)
    for (const h of (process.env.LOG_HOOKS ?? '').split(',').filter(Boolean)) log('hook', h, JSON.stringify(await hook(h)));
    // (STATES='[{"name":"b0","press":["sarahlab:size:0"],"hooks":[["birthArea",false]]},...]': each look again with the
    // room changed first -- its pictures named for it)
    const STATES = JSON.parse(process.env.STATES ?? '[{"name":""}]');
    for (const st of STATES) {
    for (const a of st.press ?? []) { await press(a); await run(1); }
    for (const [h, ...g] of st.hooks ?? []) { const r = await hook(h, ...g); if (process.env.LOG_STATE_HOOKS) log('state hook', h, JSON.stringify(r)); }
    await run(1);
    const tag = st.name ? `-${st.name}` : '';
    for (const p of POSES) {
      await press(`sarahlab:${p}`); await run(2.5);
      // (DEPTH=name: how far that worn mesh stands off her skin -- the hook `garmentDepth`)
      // (DEPTH_MATERIAL=bikini, DEPTH_EXCLUDE=SarahV2Recovered: every drawn mesh of that material but those)
      if (process.env.DEPTH) { const dd = await hook('garmentDepth', process.env.DEPTH, 2, process.env.DEPTH_MATERIAL ? { material: process.env.DEPTH_MATERIAL, exclude: process.env.DEPTH_EXCLUDE } : {}); log('depth', want, st.name ?? '', p, JSON.stringify(dd)); report[`${want}|${st.name ?? ''}|${p}`] = dd; }
      for (const v of VIEWS) {
        // (height 'chest' or 'hips': held on her chest bone or between her hip joints, whatever her pose -- else a height)
        const [name, yaw, pitch, dist, height] = v.split(':').map((x, i) => (i && i < 4 ? Number(x) : x));
        if (height === 'chest') await hook('chestAim', yaw, pitch, dist); else if (height === 'hips') await hook('aim', yaw, pitch, dist); else await hook('look', yaw, pitch, dist, Number(height), 0);
        await run(0.3);
        await shot(`o${k}${tag}-${p}-${name}.png`);
      }
    }
    }
    await press('sarahlab:stand'); await run(1.5);
    report[want] = t;
  }
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
