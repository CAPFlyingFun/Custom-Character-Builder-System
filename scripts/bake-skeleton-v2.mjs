/**
 * HER SKELETON'S LANDMARKS AS THEY STAND IN v2, WRITTEN DOWN (the new direction's step 2; the port's rule 2). Opens the
 * room on v2, has her skeleton laid in her (skeletonInV2.ts), and writes the pelvis's and the torso's measured landmark
 * files carried into her -- src/data/pelvis/v2.json and src/data/torso/v2.json (MEASURED: the skeleton's own files,
 * moved with the bone round each point), the inside of her rib cage measured on her chest's bones as laid
 * (src/data/thorax/v2.json, actor/thoracicOrgans.ts measureThorax) -- and, given CLOUD=name,name, those pieces' points to shots/skeleton-bake/.
 *
 *     node scripts/bake-skeleton-v2.mjs            (builds first; NO_BUILD=1 to use dist/ as it is)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'shots', 'skeleton-bake');
const log = (...a) => console.log('[bake]', ...a);
mkdirSync(OUT, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4326, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => log('pageerror', e.message));
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForFunction(() => globalThis.__sarahLabCloth?.skeletonLandmarks?.() != null, null, { timeout: 300_000, polling: 2000 });
  const cloud = (process.env.CLOUD ?? '').split(',').filter(Boolean);
  const res = await page.evaluate(([c]) => globalThis.__sarahLabCloth.skeletonLandmarks(c.length ? c : undefined, 1), [cloud]);
  log('each landmark went, mm', JSON.stringify(res.went));
  log('pieces', JSON.stringify(res.pieces));
  log('most each piece moved in the fit, mm', JSON.stringify(res.fitMoves));
  // (and where her opening is in her own skin: the middle of its line on v2 at rest, MEASURED on her skin -- her canal
  // runs up from there, actor/pelvicOrgans.ts)
  const opening = await page.evaluate(() => globalThis.__sarahLabCloth.openingRest?.() ?? null);
  if (opening) { res.pelvis.landmarks.opening = opening; log('her opening in her skin', JSON.stringify(opening)); } else log('her opening could not be read: landmarks.opening is not written');
  if (!process.env.DRY) {
    writeFileSync(path.join(ROOT, 'src/data/pelvis/v2.json'), JSON.stringify(res.pelvis, null, 2) + '\n');
    writeFileSync(path.join(ROOT, 'src/data/torso/v2.json'), JSON.stringify(res.torso) + '\n');
    if (res.thorax && !res.thorax.error) { mkdirSync(path.join(ROOT, 'src/data/thorax'), { recursive: true }); writeFileSync(path.join(ROOT, 'src/data/thorax/v2.json'), JSON.stringify(res.thorax) + '\n'); } else log('her rib cage could not be measured', res.thorax?.error);
    log('wrote src/data/pelvis/v2.json, src/data/torso/v2.json, src/data/thorax/v2.json');
  }
  if (res.cloud) { writeFileSync(path.join(OUT, 'cloud.json'), JSON.stringify(res.cloud)); log('cloud points', res.cloud.length / 3); }
} finally { await browser.close(); server.httpServer.close(); }
