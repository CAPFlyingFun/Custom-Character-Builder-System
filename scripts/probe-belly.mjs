/**
 * HER BELLY ON v3, SHOT FOR REVIEW (the skeleton-outward plan, the belly skin proof; Joshua, 2026-11-08: render v3 only).
 *
 *     node scripts/probe-belly.mjs [set ...]
 *
 * Builds, serves dist/, opens the room with ?probe=cloth, steps MODEL to her skeleton and shoots each SET into
 * shots/belly/: `weeks` (front, side and 3/4 at belly 0, 30, 50, 75, 100%), `xray` (0, 25, 50, 75, 100%), `organs`
 * (X-RAY 50 at full term and not pregnant, close), `poses` (walk, sit, squat, recline at full term), `birth` (its stages
 * and after), `fill` (stomach and bowel full). Prints her belly's report (`belly()` probe hook) for each.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', 'belly');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'];
const sets = process.argv.slice(2).length ? process.argv.slice(2) : ['weeks', 'xray', 'organs', 'poses', 'birth', 'fill'];
const log = (...a) => console.log('[belly]', ...a);

mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) { log('building'); await build({ root: ROOT, logLevel: 'error' }); }
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4319, strictPort: false, open: false }, logLevel: 'error' });
const url = server.resolvedUrls.local[0] + '?probe=cloth';
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p) && !p.endsWith('chromium')) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ARGS, executablePath: exe });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const click = async (sel) => {
    await page.evaluate((s) => { const node = document.querySelector(s), section = node?.closest('[data-section]'); if (section && !section.hasAttribute('data-open')) document.querySelector(`[data-action="sarahlab:section:${section.dataset.section}"]`)?.click(); }, sel).catch(() => {});
    await page.click(sel, { timeout: 60_000 });
  };
  const slide = async (field, v) => { await page.locator(`[data-field="${field}"] + input`).evaluate((input, x) => { input.value = String(x); input.dispatchEvent(new Event('input', { bubbles: true })); }, v); };
  const hook = (name, ...args) => page.evaluate(([n, a]) => { const h = globalThis.__sarahLabCloth[n]; const r = h(...a); return typeof r === 'function' ? null : JSON.parse(JSON.stringify(r ?? null)); }, [name, args]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const status = '[data-field="sarahlab-status"]';
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('[data-role="sarah-lab-hud"]', { timeout: 240_000 });
  await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? '').startsWith('model v2-body'), status, { timeout: 240_000 });
  // (v2 first, as the room opens on it: the same BUMP %s and views as v3's in 'compare')
  let dist0 = 2.9;
  if (sets.includes('compare') || sets.includes('wire')) {
    const wireBumps = sets.includes('wire') ? [100, 150] : [25, 50, 75, 100, 150];
    const slide0 = async (field, v) => { await page.locator(`[data-field="${field}"] + input`).evaluate((input, x) => { input.value = String(x); input.dispatchEvent(new Event('input', { bubbles: true })); }, v); };
    await page.waitForTimeout(3000);
    // (her clothes off, as v3 has none: OUTFIT three times is none)
    for (let k = 0; k < 3; k++) { await click('[data-action="sarahlab:outfit"]'); await page.waitForTimeout(8000); }
    if (sets.includes('wire')) await page.evaluate(() => globalThis.__sarahLabCloth.wireAll(true));
    for (const b of wireBumps) {
      await slide0('sarahlab-bump', b); await page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), 1.2);
      for (const [v, view] of (sets.includes('wire') ? [['side', 'side'], ['front', 'front']] : [['side', 'side'], ['q34', 'three-quarter']])) {
        await page.evaluate((v) => document.querySelector(`[data-action="sarahlab:view:${v}"]`)?.click(), view);
        if (Math.abs(dist0 - 1.5) > 1e-3) { await page.mouse.move(400, 420); await page.mouse.wheel(0, Math.log(1.5 / dist0) / 0.001); dist0 = 1.5; }
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SHOTS, `${sets.includes('wire') ? 'wire' : 'cmp'}-v2-${b}-${v}.png`), clip: { x: 150, y: 40, width: 540, height: 780 }, timeout: 300_000 }); log('shot', `v2-${b}-${v}`);
      }
    }
    if (sets.includes('wire')) await page.evaluate(() => globalThis.__sarahLabCloth.wireAll(false));
  }
  await click('[data-action="sarahlab:model"]');
  await page.waitForFunction((sel) => (document.querySelector(sel)?.textContent ?? '').startsWith('model skeleton'), status, { timeout: 240_000 });
  await page.waitForTimeout(1500);
  // (pregnant, for the weeks)
  // (her arms a little out from her sides, so the side views see her belly)
  await slide('sarahlab-arms', 35);
  const organs = await hook('organs');
  if (!organs?.womb) { await click('[data-action="sarahlab:pregnant"]'); await page.waitForTimeout(500); }
  const M = 1 / 0.89974678;
  // (the camera through the room's own controls: its FRONT / SIDE / 3/4 / BACK buttons and the wheel's zoom)
  let dist = dist0;
  const zoomTo = async (d) => { if (Math.abs(d - dist) < 1e-3) return; await page.mouse.move(400, 420); await page.mouse.wheel(0, Math.log(d / dist) / 0.001); dist = d; await page.waitForTimeout(200); };
  const look = async (view, d = 1.4) => { await page.evaluate((v) => document.querySelector(`[data-action="sarahlab:view:${v}"]`)?.click(), view); await zoomTo(d); await page.waitForTimeout(300); };
  const shot = async (name) => { await page.screenshot({ timeout: 300_000, path: path.join(SHOTS, name), clip: { x: 150, y: 40, width: 540, height: 780 } }); log('shot', name); };
  const views = [['front', 'front'], ['side', 'side'], ['q34', 'three-quarter']];
  const at = async (bump) => { await slide('sarahlab-bump', bump); await run(1.2); };
  const note = async (key) => { const b = await hook('belly'); const o = await hook('organs'); report[key] = { week: o?.womb?.week ?? null, skin: b?.skin, sway: b?.sway, needs: b?.needs }; log(key, JSON.stringify(report[key])); };

  if (sets.includes('weeks')) {
    // (not pregnant first: PREGNANT off)
    await click('[data-action="sarahlab:pregnant"]'); await run(1.2); await note('weeks-not');
    for (const [v, yaw] of views) { await look(yaw); await shot(`weeks-not-${v}.png`); }
    await click('[data-action="sarahlab:pregnant"]'); await run(0.5);
  }
  if (sets.includes('weeks')) for (const bump of [30, 73, 100]) {
    await at(bump); await note(`weeks-${bump}`);
    for (const [v, yaw] of views) { await look(yaw); await shot(`weeks-${bump}-${v}.png`); }
  }
  if (sets.includes('xray')) { await at(100); for (const x of [0, 30, 50, 75]) { await slide('sarahlab-xray', x); await run(0.2); await look('three-quarter'); await shot(`xray-${x}.png`); } await slide('sarahlab-xray', 0); }
  if (sets.includes('organs')) {
    await slide('sarahlab-xray', 50);
    for (const bump of [0, 100]) { await at(bump); for (const [v, yaw] of views) { await look(yaw, 0.95); await shot(`organs-${bump}-${v}.png`); } await note(`organs-${bump}`); }
    await slide('sarahlab-xray', 0);
  }
  if (sets.includes('fill')) {
    await slide('sarahlab-xray', 50); await at(0);
    await hook('belly', { stomachFoodMl: 900, stomachWaterMl: 300, rectumMl: 200, bladderMl: 420 }); await run(1.0); await note('fill-full');
    for (const [v, yaw] of views) { await look(yaw, 0.95); await shot(`fill-full-${v}.png`); }
    await hook('belly', { stomachFoodMl: 30, stomachWaterMl: 20, rectumMl: 0, bladderMl: 20 }); await run(1.0); await note('fill-empty');
    await look('front', 0.95); await shot('fill-empty-front.png');
    await slide('sarahlab-xray', 0);
  }
  if (sets.includes('poses')) {
    await at(100);
    for (const p of ['walk', 'sit', 'squat', 'recline']) {
      await click(`[data-action="sarahlab:${p}"]`); await run(p === 'walk' ? 1.3 : 2.0); await note(`pose-${p}`);
      for (const [v, yaw] of views) { await look(yaw, p === 'walk' ? 1.8 : 2.3); await shot(`pose-${p}-${v}.png`); }
    }
    await click('[data-action="sarahlab:stand"]'); await run(1.5);
  }
  if (sets.includes('birth')) {
    await at(100); await click('[data-action="sarahlab:recline"]'); await run(1.5);
    await hook('birth', { reset: true }); await hook('birth', { pace: 'fast', run: true });
    for (let k = 0; k < 40; k++) {
      await run(4);
      const o = await hook('organs');
      const line = await page.textContent('[data-field="sarahlab-birth-line"]');
      log('birth', k, line);
      if (k % 3 === 0 || /born/.test(line)) { await note(`birth-${k}`); await look('side', 2.3); await shot(`birth-${String(k).padStart(2, '0')}-side.png`); }
      if (/held at born/.test(line)) break;
      void o;
    }
    for (const sec of [3, 10, 30, 60]) { await run(sec === 3 ? 3 : sec - [3, 10, 30, 60][[3, 10, 30, 60].indexOf(sec) - 1]); await note(`after-${sec}s`); await look('side', 2.3); await shot(`after-${sec}s-side.png`); await look('three-quarter', 2.3); await shot(`after-${sec}s-q34.png`); }
  }
  if (sets.includes('compare')) {
    // v3 and v2 at the same BUMP %s, the same views (Joshua, 2026-11-09: v2's approved belly on v3)
    const bumps = [25, 50, 75, 100, 150];
    for (const b of bumps) {
      await at(b); await note(`v3-${b}`);
      for (const [v, yaw] of [['side', 'side'], ['q34', 'three-quarter']]) { await look(yaw, 1.5); await shot(`cmp-v3-${b}-${v}.png`); }
      await slide('sarahlab-xray', 30); await run(0.2); await look('side', 1.5); await shot(`cmp-v3-${b}-xray.png`); await slide('sarahlab-xray', 0);
    }
  }
  if (sets.includes('options')) {
    // Joshua, 2026-11-09: each option -- 1 real womb + v2's skin (WOMB FILL 0), 2 the womb grown to v2's belly (100), the
    // hybrid (50) -- for one, two and three babies at several belly %s
    const counts = { 1: [50, 75, 100], 2: [100, 150, 175], 3: [100, 150, 180] };
    let babies = 1;
    for (const n of [1, 2, 3]) {
      while (babies !== n) { await click('[data-action="sarahlab:babies"]'); babies = babies % 3 + 1; await run(0.5); }
      for (const b of counts[n]) for (const [opt, fill] of [['1', 0], ['3', 50], ['2', 100]]) {
        await slide('sarahlab-womb-fill', fill); await at(b); await note(`opt${opt}-${n}x-${b}`);
        const key = `opt${opt}-${n}x-${b}`;
        report[key].womb = await page.textContent('[data-field="sarahlab-womb-fill"]');
        await look('side', 1.5); await shot(`${key}-side.png`);
        await slide('sarahlab-xray', 30); await run(0.2); await shot(`${key}-xray.png`); await slide('sarahlab-xray', 0);
      }
    }
    while (babies !== 1) { await click('[data-action="sarahlab:babies"]'); babies = babies % 3 + 1; }
    await slide('sarahlab-womb-fill', 50);
  }
  if (sets.includes('wire')) {
    await page.evaluate(() => globalThis.__sarahLabCloth.wireAll(true));
    for (const b of [100, 150]) { await at(b); await note(`wire-v3-${b}`); for (const [v, view] of [['side', 'side'], ['front', 'front']]) { await look(view, 1.5); await shot(`wire-v3-${b}-${v}.png`); } }
    await page.evaluate(() => globalThis.__sarahLabCloth.wireAll(false));
  }
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
