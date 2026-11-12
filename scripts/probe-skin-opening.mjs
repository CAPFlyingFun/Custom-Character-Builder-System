/**
 * HER SKIN-MADE OPENING, MEASURED (Joshua, 2026-11-11: her opening made from her own skin, "shape it into the same ring
 * and let it open the same way" -- 0.1 cm shut, 0.15 at 1%, 0.2 at 2%, then 0.1 cm a percent; a ring at 100%; a 2 cm
 * dome). v2 undressed, in POSES, BIRTH OPENING at OPENS: how wide across and long down her slit it is drawn, how round
 * (its least and most radius), how far its rim stands out of one plane (a level rim: none), its dome, how far her
 * thighs let it open, and where its middle stands against a place fixed on her body (the hook `bodyAim`: her skin's
 * opening at rest, carried by her pelvis bone) -- out along her canal's line and across it. VIEWS: looks at it from
 * that fixed place, name:yaw:pitch:dist (radians off looking straight in; room units), at SHOTOPENS. Into
 * shots/<OUT>/, with report.json.
 *
 *     node scripts/probe-skin-opening.mjs      (NO_BUILD=1; POSES=recline,squat,apart; OPENS=0,1,2,5,10,25,50,75,100;
 *                                               VIEWS=under:0:-1.2:60; VIEWS_<pose>=...; SHOTOPENS=0,25,50,75,100;
 *                                               STYLE=skin|doors; HOOKS=[[name,...]]; VARIANTS=[{name,hooks}];
 *                                               PICK_AT=[[x,y]])
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'skin-opening-measure');
const log = (...a) => console.log('[skin]', ...a);
mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4333, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
const report = { rows: [] };
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), len = (a) => Math.hypot(...a);
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  // (PICK_AT='[[x,y],...]': after each picture, what is drawn at those places in it -- pixels of the picture -- nearest first)
  const picks = JSON.parse(process.env.PICK_AT ?? '[]');
  const shot = async (name) => {
    await page.screenshot({ path: path.join(SHOTS, name), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 }); log('shot', name);
    if (!picks.length) return;
    const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left, y: r.top }; });
    for (const [x, y] of picks) log('pick', name, x, y, JSON.stringify(await hook('pickAny', 200 + x - box.x, 150 + y - box.y, 5)));
  };
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  await page.waitForTimeout(6000);
  await hook('opening', true);
  if (process.env.STYLE) await hook('skinOpening', process.env.STYLE !== 'doors');
  // (HOOKS='[["legsHold",false]]': the room's switches thrown first -- a hook's name and what it is given)
  for (const [name, ...given] of JSON.parse(process.env.HOOKS ?? '[]')) log('hook', name, JSON.stringify(await hook(name, ...given)));
  await run(0.6);
  const POSES = (process.env.POSES ?? 'recline,squat,apart').split(',').filter(Boolean), OPENS = (process.env.OPENS ?? '0,1,2,5,10,25,50,75,100').split(',').filter(Boolean).map(Number);
  const VIEWS = (process.env.VIEWS ?? '').split(',').filter(Boolean), SHOTOPENS = (process.env.SHOTOPENS ?? '0,25,50,75,100').split(',').map(Number);
  // (VARIANTS='[{"name":"a1","hooks":[["vulvaArea",{"band":0,"under":false}]]},...]': the whole set again for each, its
  // switches thrown first -- its pictures and rows named for it)
  const VARIANTS = JSON.parse(process.env.VARIANTS ?? '[{"name":"","hooks":[]}]');
  for (const variant of VARIANTS) {
  for (const [name, ...given] of variant.hooks ?? []) log('hook', variant.name, name, JSON.stringify(await hook(name, ...given)));
  const tag = variant.name ? `${variant.name}-` : '';
  for (const p of POSES) {
    await press(`sarahlab:${p}`); await run(2.5);
    for (const o of OPENS) {
      await slide('sarahlab-birth-open', o); await run(1.6);
      const body = await hook('bodyAim', 52, 0, 0), v = await hook('vulvaAim', 52), d = v?.dbg?.rimSize;
      const row = { variant: variant.name || undefined, pose: p, open: o, drawnOpen: v?.dbg?.open, aim: body && { out: body.out, yaw: body.yaw, pitch: body.pitch } };
      if (d) {
        // (in HER OWN centimetres: the room draws her `worldPerLocal * perMetre / 100` times her own size -- 1.11 -- so a
        // length in the room is divided by that; her opening is laid in her own metres)
        const her = d.worldPerLocal && d.perMetre ? 100 / (d.worldPerLocal * d.perMetre) : 1, h = (x) => (Number.isFinite(x) ? +(x * her).toFixed(2) : x);
        const r = d.roundness, c = r.centre, at = body.at.map((x) => x * 100), out = body.out, off = sub(c, at), up = dot(off, out) * her;
        // (and what of her legs holds it narrower, when they do: across, along, out of her skin -- cm -- and which vertex)
        Object.assign(row, { herScale: +(1 / her).toFixed(4), acrossCm: h(d.posedAcross), alongCm: h(d.posedAlong), rMinCm: h(r.rMin), rMaxCm: h(r.rMax), outOfPlaneCm: h(r.outOfPlane), jump: r.jump, bulgeM: d.bulge, domeDbg: d.domeDbg, profile: d.profile, rimAlongOut: d.rimAlongOut, heldToM: d.heldTo, blocker: d.heldTo ? d.blocker : undefined, legNear: d.legNear, sideReachCm: d.sideReachCm, roundLast: d.roundDbg?.slice(-2), gaps: r.gaps, rimPoints: r.points, uScale: d.uScale, localAcrossCm: d.localAcrossCm, worldPerLocal: d.worldPerLocal, perMetre: d.perMetre,
          outCm: +up.toFixed(2), sideCm: +(len(off.map((x, i) => x - out[i] * dot(off, out))) * her).toFixed(2), tiltDeg: +(Math.acos(Math.min(1, Math.abs(dot(r.normal, out)))) * 180 / Math.PI).toFixed(1), centreCm: c });
      }
      report.rows.push(row);
      log(JSON.stringify(row));
      // (VIEWS_<pose>: that pose's own looks, in place of VIEWS -- a SQUAT's opening faces her floor, and a look from under
      // it is from under the floor)
      const views = process.env[`VIEWS_${p}`] ? process.env[`VIEWS_${p}`].split(',').filter(Boolean) : VIEWS;
      if (views.length && SHOTOPENS.includes(o)) for (const vw of views) { const [name, yaw, pitch, dist] = vw.split(':'); await hook('bodyAim', Number(dist ?? 52), Number(yaw), Number(pitch)); await run(0.15); await shot(`${tag}${p}-${o}-${name}.png`); }
    }
    await slide('sarahlab-birth-open', 0); await run(1);
    await press('sarahlab:stand'); await run(1.5);
  }
  }
  report.errors = errors;
  writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', errors.length ? errors.join('\n') : 'none');
} finally { await browser.close(); server.httpServer.close(); }
