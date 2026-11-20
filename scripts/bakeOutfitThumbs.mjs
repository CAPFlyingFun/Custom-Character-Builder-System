/**
 * THE BUILT-IN OUTFITS' CARD PICTURES (Joshua, 2026-10-23, on the Character Studio preview: "we could have little
 * screenshots for the outfit").
 *
 *     npm run bake:outfits
 *
 * Builds, serves dist/, opens the character room with `?bake=outfits` and asks the room itself to put each outfit it
 * offers on her and picture her (`bakeOutfitPictures` in SarahLabScene.ts: the same camera and size a saved outfit's
 * picture is taken with), then writes them to public/sarahlab/outfits/<outfit>.jpg, where the OUTFIT cards read them.
 * She is pictured as the room opens her: the Female Base Model at 0%, not pregnant (Joshua, 2026-11-13: "remove the
 * word Sarah and keep everything generic"; the cards before were of Sarah at 73%). Run it again when an outfit is
 * added, its look changes, or what the room opens on does; then build. A fresh browser, so the LIGHT theme.
 * ONLY=<outfit names, comma separated> pictures just those (ONLY=bikini), and leaves the other cards as they are.
 * NO_BUILD=1 serves dist/ as it is. MALE=1 pictures the male base model's own outfits on him.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'public');
const log = (m) => console.log(`[bake:outfits] ${m}`);

function chromiumPath() {
  const override = process.env.PLAYWRIGHT_CHROMIUM;
  if (override && existsSync(override)) return override;
  if (existsSync(chromium.executablePath())) return undefined;
  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const linked = browsers ? path.join(browsers, 'chromium') : null;
  if (linked && existsSync(linked)) return linked;
  throw new Error('no Chromium found; this script never runs `playwright install`');
}

if (!process.env.NO_BUILD) { log('building'); await build({ root: ROOT, logLevel: 'error' }); }
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4199, strictPort: false, open: false }, logLevel: 'error' });
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
let failed = false;
try {
  // (VIEWPORT=600x800 DSF=1: fewer pixels for a software renderer to draw; a card is 168 x 224 either way)
  const [vw, vh] = (process.env.VIEWPORT ?? '932x430').split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: Number(process.env.DSF ?? 2) });
  page.on('pageerror', (e) => { failed = true; log(`page error: ${e.message}`); });
  await page.goto(`${server.resolvedUrls.local[0]}?open=CharacterRoom&bake=outfits`);
  await page.waitForFunction(() => typeof globalThis.__sarahLabBakeOutfits === 'function' && document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  // (MALE=1: the male base model's own outfits, pictured on him)
  if (process.env.MALE) {
    await page.evaluate(() => document.querySelector('[data-action="sarahlab:base:male"]')?.click());
    await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'male-base', null, { timeout: 300_000 });
    await page.waitForTimeout(8000);
  }
  log('the room is up: picturing each outfit (a minute or more each on a software renderer)');
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((n) => n.trim()).filter(Boolean) : null;
  const pictures = await page.evaluate((names) => globalThis.__sarahLabBakeOutfits(names ?? undefined), only, { timeout: 0 });
  if (only && pictures.length !== only.length) { failed = true; log(`FAIL: asked for ${only.join(', ')}, the room pictured ${pictures.map((p) => p.name).join(', ') || 'none'}`); }
  for (const { name, path: file, picture } of pictures) {
    const m = /^data:image\/jpeg;base64,(.+)$/.exec(picture ?? '');
    if (!m) { failed = true; log(`FAIL ${name}: no picture`); continue; }
    const target = path.join(OUT, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(m[1], 'base64'));
    log(`${name} -> public/${file} (${Math.round(m[1].length * 0.75 / 1024)} KB)`);
  }
} finally {
  await browser.close();
  await server.httpServer.close();
}
if (failed) process.exit(1);
