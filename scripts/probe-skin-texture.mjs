/**
 * HER SKIN'S IMAGE OR HER SHAPE AND LIGHT? (Joshua, 2026-11-11: "we have modified the mesh so much the original texture
 * doesn't match anymore, or is it another issue?... maybe better anyway to do no image texture, but then allow a solid
 * color for the outside skin"). v2 undressed; each of SHOTS -- pose:open:name:yaw:pitch:distance, the look turned from
 * straight at her opening along her canal (the hook `doorsAim`), or with `:aim:dx:dy:dz` after it a look at the middle
 * of her hips moved that far (metres: her face, her chest) -- taken with her own skin image and again with each of
 * TEXES in its place (the room's `skinTexture`: `plain` one solid colour, `checker` a board of squares that shows where
 * her image is stretched; `plainflat` the solid colour with her bumps' map off too). Into shots/skin-texture/ (or OUT).
 *
 *     node scripts/probe-skin-texture.mjs      (NO_BUILD=1; COLOUR='#d8a998'; SKIN=even: the skin she wears throughout;
 *                                               SHOTS=stand:0:body:0:1.2:420,recline:100:in:0:0:52,recline:100:under:0:-1.2:60;
 *                                               TEXES=plain,checker)
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots', process.env.OUT ?? 'skin-texture');
const log = (...a) => console.log('[skin]', ...a);
mkdirSync(OUT, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4339, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('pageerror', e.message));
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const slide = (f, v) => page.evaluate(([k, x]) => { const i = document.querySelector(`[data-field="${k}"] + input`); if (!i) return false; i.value = String(x); i.dispatchEvent(new Event('input', { bubbles: true })); return true; }, [f, v]);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  const shot = (name) => page.screenshot({ path: path.join(OUT, name), clip: { x: 200, y: 150, width: 600, height: 600 }, timeout: 300_000 }).then(() => log('shot', name));
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  for (let k = 0; k < 12; k++) { const t = await page.evaluate(() => document.querySelector('[data-action="sarahlab:outfit"]')?.textContent ?? ''); if (/none/i.test(t)) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  await page.waitForTimeout(6000);
  await hook('opening', true, ...(process.env.LOOK !== undefined ? [Number(process.env.LOOK)] : [])); await run(0.6);
  // (SKIN=even: the skin she wears for all of it -- the room's SKIN choices -- waited for until it is on her)
  if (process.env.SKIN) { await hook('skinChoice', process.env.SKIN); for (let k = 0; k < 60; k++) { const s = await hook('skinChoice'); if (s?.worn === process.env.SKIN && s?.state === 'ready') break; await page.waitForTimeout(500); } log('skin', JSON.stringify(await hook('skinChoice'))); await run(0.3); }
  const SHOTS = (process.env.SHOTS ?? 'stand:0:body:0:1.2:420,recline:100:in:0:0:52,recline:100:under:0:-1.2:60').split(',').filter(Boolean).map((s) => s.split(':'));
  const TEXES = (process.env.TEXES ?? 'plain,checker').split(',').filter(Boolean), COLOUR = process.env.COLOUR ?? '#d8a998';
  let pose = '', open = -1;
  for (const [p, o, name, yaw, pitch, dist, how, dx, dy, dz] of SHOTS) {
    // (a shot ending `:aim:dx:dy:dz` looks at the middle of her hips moved that far, metres -- her face, her chest --
    // from yaw and pitch as they are; else straight at her opening along her canal, turned by them)
    const lookAt = () => (how === 'aim' ? hook('aim', Number(yaw), Number(pitch), Number(dist), Number(dx ?? 0), Number(dy ?? 0), Number(dz ?? 0)) : hook('doorsAim', Number(dist), Number(yaw), Number(pitch)));
    if (p !== pose) { await slide('sarahlab-birth-open', 0); await run(0.8); await press(`sarahlab:${p}`); await run(2.5); pose = p; open = 0; }
    if (Number(o) !== open) { await slide('sarahlab-birth-open', Number(o)); await run(1.6); open = Number(o); }
    await lookAt(); await run(0.15);
    await shot(`${p}-${o}-${name}-own.png`);
    for (const tex of TEXES) {
      await hook('skinTexture', tex === 'plainflat' ? 'plain' : tex, COLOUR, tex !== 'plainflat'); await run(0.15);
      await shot(`${p}-${o}-${name}-${tex}.png`);
    }
    await hook('skinTexture', 'own'); await run(0.1);
    // (ALSO='["birthNormals",false]': the same looks again with one of the room's switches thrown -- a hook's name and what
    // it is given -- and thrown back after: its pictures end `-also`)
    if (process.env.ALSO) {
      const [name2, ...given] = JSON.parse(process.env.ALSO);
      log('also', name2, JSON.stringify(await hook(name2, ...given))); await run(0.6);
      await lookAt(); await run(0.15);
      await shot(`${p}-${o}-${name}-own-also.png`);
      for (const tex of TEXES) { await hook('skinTexture', tex === 'plainflat' ? 'plain' : tex, COLOUR, tex !== 'plainflat'); await run(0.15); await shot(`${p}-${o}-${name}-${tex}-also.png`); }
      await hook('skinTexture', 'own');
      // (NORMALS=1: and her body drawn by the normals it is shaded with, the switch thrown and not)
      if (process.env.NORMALS) { await hook('normalSkin', true); await run(0.15); await shot(`${p}-${o}-${name}-normals-also.png`); await hook('normalSkin', false); }
      await hook(name2, ...given.map((g) => (typeof g === 'boolean' ? !g : g))); await run(0.6);
      await lookAt(); await run(0.15);
    }
    if (process.env.NORMALS) { await hook('normalSkin', true); await run(0.15); await shot(`${p}-${o}-${name}-normals.png`); await hook('normalSkin', false); await run(0.1); }
  }
  log('facts', JSON.stringify(await hook('skinFacts')));
  // (THEN='[["opening",false],["birthNormals",false],["birthNormals",true]]': the room's switches thrown one after another
  // -- each a hook's name and what it is given -- and how her skin is drawn read after each)
  for (const [name2, ...given] of JSON.parse(process.env.THEN ?? '[]')) { const r = name2 === 'press' ? await press(given[0]) : name2 === 'slide' ? await slide(given[0], given[1]) : await hook(name2, ...given); await run(1.2); log('then', name2, JSON.stringify(given), '->', JSON.stringify(r)?.slice(0, 200), '\n   facts', JSON.stringify(await hook('skinFacts'))); }
} finally { await browser.close(); server.httpServer.close(); }
