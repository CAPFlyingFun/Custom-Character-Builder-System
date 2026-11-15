/**
 * THE OUTFIT EDITOR'S STYLE PICTURES (Joshua, 2026-11-14, of the drawn shirts: "are the new shirts available now in the
 * clothing tab with updated images of their style?… or modify the UI to work better").
 *
 *     node scripts/bakeStyleThumbs.mjs
 *
 * Builds, serves dist/, opens the character room with `?bake=styles` and asks the room itself to paint each style the
 * outfit editor offers on her -- in one colour, over what a person would wear with it (`src/sarahlab/stylePictures.ts`)
 * -- and picture the part of her that kind of piece is on (`bakeStylePictures` in SarahLabScene.ts), then writes them
 * to public/sarahlab/styles/<style>.jpg, where the editor's STYLE row reads them. She is pictured as the room opens
 * her: the Female Base Model at 0%, not pregnant. Run it again when a style is added or its cut changes; then build.
 * ONLY=<template ids, comma separated> pictures just those (ONLY=tank,camisole), and leaves the other pictures as they
 * are. NO_BUILD=1 serves dist/ as it is.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'public');
const log = (m) => console.log(`[bake:styles] ${m}`);

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
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4198, strictPort: false, open: false }, logLevel: 'error' });
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'] });
let failed = false;
try {
  // (a card is 168 x 224: an upright page at 1x has the pixels for it three times over, and a software renderer draws by the pixel)
  const page = await browser.newPage({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { failed = true; log(`page error: ${e.message}`); });
  await page.goto(`${server.resolvedUrls.local[0]}?open=CharacterRoom&bake=styles`);
  await page.waitForFunction(() => typeof globalThis.__sarahLabBakeStyles === 'function' && document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  log('the room is up: picturing each style (some twenty seconds each on a software renderer)');
  const only = process.env.ONLY ? process.env.ONLY.split(',').map((n) => n.trim()).filter(Boolean) : null;
  const pictures = await page.evaluate((names) => globalThis.__sarahLabBakeStyles(names ?? undefined), only, { timeout: 0 });
  if (only && pictures.length !== only.length) { failed = true; log(`FAIL: asked for ${only.join(', ')}, the room pictured ${pictures.map((p) => p.id).join(', ') || 'none'}`); }
  for (const { id: name, path: file, picture } of pictures) {
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
