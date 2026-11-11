/**
 * HER SKELETON'S OPENING AGAINST THE SAME DOORS IN v2, LIKE FOR LIKE (Joshua, 2026-11-10: "That pink wasn't on the
 * skeleton's opening, so, render both at the same % and compare"). Each model undressed, in POSES, BIRTH OPENING at
 * OPENS, looked at from outside her along her canal (the hook `doorsAim`: the same view of both) and from a quarter
 * round. Into shots/opening-compare/, with report.json.
 *
 *     node scripts/probe-opening-compare.mjs      (NO_BUILD=1; POSES=recline,apart; OPENS=30,60,100; MODELS=v2,skeleton;
 *                                                  SEATS='[{"out":0.02,"restScale":1}]'; VIEWS=name:yaw:pitch:dist,...;
 *                                                  TEXES=plain,checker)
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
        if (model.startsWith('v2')) {
          const laid = (await hook('doorsSeat'))?.skinLaid ?? null; report[`${model}-${p}-${o}`].skinLaid = laid; log(model, p, o, 'her skin laid over the seat', JSON.stringify(laid && { ...laid, angles: undefined, columns: undefined, spokes: undefined, tube: undefined, beyond: laid.beyond && { ...laid.beyond, midline: undefined, round: undefined } }));
          // (her body's own skin still standing inside the tube round her canal: how many of her vertices, the deepest, cm)
          const strays = (await hook('seatStrays', 0.001)) ?? []; report[`${model}-${p}-${o}`].strays = { count: strays.length, legs: strays.filter((q) => q[4]).length, deepestCm: +(Math.max(0, ...strays.map((q) => q[3])) * 100).toFixed(2) }; log(model, p, o, 'her own skin inside the tube', JSON.stringify(report[`${model}-${p}-${o}`].strays));
        }
        // (PICK=step: which mesh is drawn at each place of that picture, every `step` pixels -- for a colour nobody can name)
        if (process.env.PICK) {
          const step = Number(process.env.PICK) || 30, box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top }; });
          const names = [], rows = [], hits = {};
          for (let y = 150 + step / 2; y < 750; y += step) {
            let row = '';
            for (let x = 200 + step / 2; x < 800; x += step) {
              const h = (await hook('pickAny', x - box.x, y - box.y, 3)) ?? [], top = h[0] ? `${h[0].parent}/${h[0].mesh}#${h[0].group}${h[0].facing < 0 ? ' (back)' : ''}` : '-';
              if (top !== '-' && !names.includes(top)) names.push(top);
              row += top === '-' ? '.' : String.fromCharCode(65 + names.indexOf(top));
              hits[`${x - 200},${y - 150}`] = h;
            }
            rows.push(row);
          }
          log(`pick ${model}-${p}-${o}\n` + rows.join('\n') + '\n' + names.map((n, k) => `${String.fromCharCode(65 + k)} = ${n}`).join('\n'));
          writeFileSync(path.join(SHOTS, `${model}-${p}-${o}-pick.json`), JSON.stringify(hits));
        }
        await hook('doorsAim', DIST, QUARTER, 0.25); await run(0.15); await shot(`${model}-${p}-${o}-quarter.png`);
        // (VIEWS=name:yaw:pitch:distance,...: more looks at it, each turned from straight at her opening, radians)
        // (TEXES=plain,checker: each of those looks again with her skin's texture swapped -- the room's `skinTexture`: one
        // plain colour, a board of squares -- to tell her texture from her shape)
        for (const v of (process.env.VIEWS ?? '').split(',').filter(Boolean)) {
          const [name, yaw, pitch, dist] = v.split(':'); await hook('doorsAim', Number(dist ?? DIST), Number(yaw), Number(pitch)); await run(0.15); await shot(`${model}-${p}-${o}-${name}.png`);
          if (model.startsWith('v2')) { for (const tex of (process.env.TEXES ?? '').split(',').filter(Boolean)) { await hook('skinTexture', tex); await run(0.15); await shot(`${model}-${p}-${o}-${name}-${tex}.png`); } if (process.env.TEXES) { await hook('skinTexture', 'own'); await run(0.15); } }
        }
        // (SOLO=1: her skin's own patch round her opening alone, her body hidden -- from the quarter, the front and her side)
        if (process.env.SOLO && model.startsWith('v2')) {
          await hook('vulvaSolo', true);
          // (SOLO=2: and her doors and organs hidden too -- her skin's patch with nothing in it)
          if (process.env.SOLO === '2') await hook('organsHidden', true);
          for (const [name, yaw, pitch, dist] of [['quarter', QUARTER, 0.25, DIST], ['front', 0, 0, DIST], ['side', Math.PI / 2, 0, DIST * 1.5], ['below', 0, -1.2, DIST * 1.3], ['behind', Math.PI, 0.3, DIST * 1.3]]) { await hook('doorsAim', dist, yaw, pitch); await run(0.15); await shot(`${model}-${p}-${o}-solo-${name}.png`); }
          if (process.env.SOLO === '2') await hook('organsHidden', false);
          await hook('vulvaSolo', false);
        }
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
    report.v2 = await hook('opening', true, ...(process.env.LOOK !== undefined ? [Number(process.env.LOOK)] : []));
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
