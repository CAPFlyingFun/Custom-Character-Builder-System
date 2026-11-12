/**
 * HER DRAWING SHEETS (Joshua, 2026-11-12: "can you send me at some point the v2's plain body at 4 angles
 * (front/side/45/back) at 0/80/140/200% belly size so that way I can draw directly on her model so the proportions
 * match exactly?"; and, for a bottom: "send me at 100% belly Squat, Reclined, and Spread from underneath at about
 * 45... I think we need to design the bottom with the legs apart and when they close, should hopefully look right").
 * Her plain body -- OUTFIT none, her hair and sneakers off -- drawn FLAT by the room's hook `sheet` (no perspective:
 * one scale all over her), a view wider or taller than the room's picture shot in tiles and joined. Two sets (SET):
 *
 *   turn   her whole body in each of POSES at each of SIZES (her bump, percent) from the front, 45 degrees, her side and
 *          her back, the four side by side at one height, so a line drawn level across them is level on her; 1 mm a pixel.
 *   under  her hips in each of UNDER_POSES at each of UNDER_SIZES from underneath at 45 degrees, the view turned with
 *          her pelvis as her pose carries it (so it looks at her the same way lying back as standing); 0.5 mm a pixel.
 *
 * WHAT A MARK ON A SHEET IS ON HER: `sheets.json` keeps, for each view of each sheet, where its panel is on the sheet
 * and what carries a pixel of it to a line through her -- `centre` (the room's metres: the panel's middle), `right` and
 * `up` (the directions of the panel's x and y), `toward` (the direction the view looks) and `mm` (millimetres a pixel);
 * beside it `posed-<pose>-<size>.f32` is every vertex of her body as it was drawn (the room's metres), to meet that
 * line. Each panel has a small magenta square outside each of its corners: a copy of the sheet that comes back another
 * size is put back by them.
 *
 * The numbers under the views are GAME TUNING (what of her each shows); the rest is MEASURED by the room.
 *
 *     node scripts/probe-body-sheets.mjs   (NO_BUILD=1; SET=turn|under|both; SIZES=0,80,140,200; POSES=tpose,stand;
 *                                           UNDER_SIZES=100; UNDER_POSES=apart,squat,recline; OUT=body-sheets)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots', process.env.OUT ?? 'body-sheets');
const log = (...a) => console.log('[sheets]', ...a);
const SET = process.env.SET ?? 'turn';
const SIZES = (process.env.SIZES ?? '0,80,140,200').split(',').map(Number);
const POSES = (process.env.POSES ?? 'tpose,stand').split(',');
const UNDER_SIZES = (process.env.UNDER_SIZES ?? '100').split(',').map(Number);
const UNDER_POSES = (process.env.UNDER_POSES ?? 'apart,squat,recline').split(',');
/** GAME TUNING (metres, the room's): each view of the `turn` set from under her soles to over her head. */
const BOTTOM = -0.04, TOP = 1.80;
/**
 * GAME TUNING, the `turn` set (1 mm a pixel): `yaw` as the room's `look` turns (0 her front; -PI/2 her right side,
 * facing the sheet's right, as his mannequin's side view does); `across` the middle of the view along its own right
 * (metres: her belly at 200% stands well forward of her feet); `half` how far either side of that is shown (T-pose: her
 * arms run off the sheet at mid forearm, so her body is drawn large).
 */
const TURN_MM = 1;
const TURN = [
  { name: 'front', label: 'FRONT', yaw: 0, across: 0, half: { tpose: 0.55, stand: 0.45 } },
  { name: 'quarter', label: '45°', yaw: -Math.PI / 4, across: 0.03, half: { tpose: 0.5, stand: 0.45 } },
  { name: 'side', label: 'SIDE', yaw: -Math.PI / 2, across: 0.08, half: { tpose: 0.44, stand: 0.44 } },
  { name: 'back', label: 'BACK', yaw: Math.PI, across: 0, half: { tpose: 0.55, stand: 0.45 } },
];
/**
 * GAME TUNING, the `under` set: from her front and 45 degrees beneath, about her pelvis; its middle `centre` metres from
 * the middle of her hip joints in her pelvis's own axes (down to her crotch); `wide` by `tall` metres of her shown.
 */
const UNDER_MM = 0.5;
const UNDER = { name: 'under', label: 'FROM UNDERNEATH, 45°', yaw: 0, pitch: -Math.PI / 4, about: 'pelvis', centre: [0, -0.07, -0.02], wide: 0.9, tall: 0.76 };
/** GAME TUNING (pixels): the sheet's margin, the gap between views, the title's strip, the captions' strip, a corner mark's side. */
const MARGIN = 56, GAP = 44, HEAD = 84, FOOT = 56, MARK = 14;
/** GAME TUNING: the ground her body is drawn on (a mid grey, as his mannequin's), and the corner marks' colour. */
const GROUND = 0x8d8e92, MARK_COLOUR = '#ff00ff';
const POSE_LABEL = { tpose: 'T-pose', stand: 'standing', apart: 'legs apart', squat: 'squat', recline: 'reclined' };
/** Her arms in each pose (degrees up from her sides, the room's ARMS slider): a pose pressed after T-POSE keeps its arms. */
const POSE_ARMS = { tpose: 90 };

mkdirSync(SHOTS, { recursive: true });
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4341, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
// (sheets made before, by another run into the same folder, stay in its list)
const listed = path.join(SHOTS, 'sheets.json');
const manifest = { ground: GROUND, mark: { colour: MARK_COLOUR, side: MARK }, sheets: existsSync(listed) ? JSON.parse(readFileSync(listed, 'utf8')).sheets ?? [] : [] };
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const text = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.textContent ?? '', a);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => (document.querySelector('[data-field="sarahlab-status"]')?.textContent ?? '').startsWith('model v2-body'), null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  // her plain body: OUTFIT pressed until it reads none (the dressing settled), her hair and her sneakers off
  let outfit = '';
  for (let n = 0; n < 24; n++) { outfit = await text('sarahlab:outfit'); if (outfit.includes('none') && !outfit.includes('…')) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  for (const a of ['sarahlab:hair', 'sarahlab:sneakers']) if ((await text(a)).includes('ON')) { await press(a); await page.waitForTimeout(1500); }
  log('outfit', JSON.stringify(outfit), JSON.stringify(await text('sarahlab:hair')), JSON.stringify(await text('sarahlab:sneakers')));
  await page.waitForTimeout(4000);
  // (the room's own clock held: she moves only as `animate` runs her, so a view's tiles are of one moment)
  await hook('hold', true);
  // (the room's picture is as large as its window: one shot says how large)
  const picture = await hook('sheet', 0, [0, 1, 0], 1, GROUND);
  if (!picture?.picture) throw new Error('the room drew no sheet');
  log('the room\'s picture', `${picture.width} x ${picture.height}`);

  /** One view of her as she is now, `wide` by `tall` pixels at `mm` a pixel about `centre`: its tiles shot and joined. */
  async function panel({ yaw, pitch = 0, about = 'room', centre, wide, tall, mm }) {
    const w = picture.width, h = picture.height, parts = [];
    const starts = (whole, part) => { const n = Math.ceil(whole / part); return n === 1 ? [Math.round((whole - part) / 2)] : Array.from({ length: n }, (_, i) => Math.round((i * (whole - part)) / (n - 1))); };
    let basis = null;
    for (const oy of starts(tall, h)) for (const ox of starts(wide, w)) {
      // (this tile's middle from the panel's, along the view's own right and up, metres)
      const shift = [((ox + w / 2 - wide / 2) * mm) / 1000, ((tall / 2 - oy - h / 2) * mm) / 1000];
      const shot = await hook('sheet', yaw, centre, mm, GROUND, pitch, about, shift);
      if (!shot?.picture) throw new Error('the room drew no picture of her');
      basis ??= { right: shot.right, up: shot.up, toward: shot.toward, centre: shot.centre.map((v, k) => v - shot.right[k] * shift[0] - shot.up[k] * shift[1]) };
      // (the part of this tile that is on the panel)
      const left = Math.max(0, -ox), top = Math.max(0, -oy), pw = Math.min(w - left, wide - Math.max(0, ox)), ph = Math.min(h - top, tall - Math.max(0, oy));
      parts.push({ input: await sharp(Buffer.from(shot.picture.split(',')[1], 'base64')).extract({ left, top, width: pw, height: ph }).png().toBuffer(), left: Math.max(0, ox), top: Math.max(0, oy) });
    }
    const png = await sharp({ create: { width: wide, height: tall, channels: 3, background: `#${GROUND.toString(16).padStart(6, '0')}` } }).composite(parts).png().toBuffer();
    return { png, wide, tall, mm, ...basis };
  }

  /** A sheet: its panels side by side under a title, each with its caption and its four corner marks. */
  async function sheet(name, title, pose, size, views) {
    const panels = [], layers = [], marks = [], captions = [];
    let x = MARGIN, tall = 0;
    for (const [v, p] of views) {
      tall = Math.max(tall, p.tall);
      layers.push({ input: p.png, left: x, top: HEAD });
      for (const [mx, my] of [[x - MARK - 4, HEAD - MARK - 4], [x + p.wide + 4, HEAD - MARK - 4], [x - MARK - 4, HEAD + p.tall + 4], [x + p.wide + 4, HEAD + p.tall + 4]]) marks.push(`<rect x="${mx}" y="${my}" width="${MARK}" height="${MARK}" fill="${MARK_COLOUR}"/>`);
      captions.push(`<text x="${x + p.wide / 2}" y="${HEAD + p.tall + 40}" text-anchor="middle" font-size="26" font-family="DejaVu Sans, sans-serif" fill="#1d1d20">${v.label}</text>`);
      panels.push({ view: v.name, left: x, top: HEAD, width: p.wide, height: p.tall, mm: p.mm, centre: p.centre, right: p.right, up: p.up, toward: p.toward });
      x += p.wide + GAP;
    }
    const width = x - GAP + MARGIN, height = HEAD + tall + FOOT;
    const over = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${MARGIN}" y="52" font-size="30" font-family="DejaVu Sans, sans-serif" fill="#1d1d20">${title}</text>${marks.join('')}${captions.join('')}</svg>`;
    await sharp({ create: { width, height, channels: 3, background: '#a3a4a8' } }).composite([...layers, { input: Buffer.from(over), left: 0, top: 0 }]).removeAlpha().png({ compressionLevel: 9 }).toFile(path.join(SHOTS, `${name}.png`));
    manifest.sheets = manifest.sheets.filter((s) => s.file !== `${name}.png`);
    manifest.sheets.push({ file: `${name}.png`, pose, size, width, height, panels });
    writeFileSync(listed, JSON.stringify(manifest, null, 1));
    log('sheet', `${name}.png`, `${width} x ${height}`);
  }

  /** Her in a pose at a size, settled; every vertex of her body as drawn kept beside the sheets. */
  async function stand(pose, size) {
    await press(`sarahlab:${pose}`); await run(1);
    // (her arms set as the ARMS slider sets them)
    const arms = await page.evaluate((deg) => { const input = document.querySelector('[data-field="sarahlab-arms"]')?.nextElementSibling; if (!(input instanceof HTMLInputElement)) return null; input.value = String(deg); input.dispatchEvent(new Event('input', { bubbles: true })); return Number(input.value); }, POSE_ARMS[pose] ?? 0);
    await hook('bump', size); await run(3);
    log('pose', pose, 'arms', arms, 'bump', await hook('bump'));
    const posed = await page.evaluate(() => globalThis.__sarahLabCloth.bodyPoints('posed'));
    if (posed) writeFileSync(path.join(SHOTS, `posed-${pose}-${size}.f32`), Buffer.from(posed, 'base64'));
  }

  if (SET === 'under' || SET === 'both') for (const pose of UNDER_POSES) for (const size of UNDER_SIZES) {
    await stand(pose, size);
    const p = await panel({ ...UNDER, wide: Math.round((UNDER.wide * 1000) / UNDER_MM), tall: Math.round((UNDER.tall * 1000) / UNDER_MM), mm: UNDER_MM });
    await sheet(`sarah-v2-plain-${pose}-belly-${String(size).padStart(3, '0')}-under45`, `Sarah v2 · plain body · belly ${size}% · ${POSE_LABEL[pose] ?? pose} · from underneath at 45° · 1 pixel = ${UNDER_MM} mm`, pose, size, [[UNDER, p]]);
  }
  if (SET === 'turn' || SET === 'both') for (const pose of POSES) for (const size of SIZES) {
    await stand(pose, size);
    const views = [];
    for (const v of TURN) {
      const right = [Math.cos(v.yaw), 0, -Math.sin(v.yaw)], half = v.half[pose] ?? v.half.stand;
      views.push([v, await panel({ yaw: v.yaw, centre: [right[0] * v.across, (TOP + BOTTOM) / 2, right[2] * v.across], wide: Math.round((2 * half * 1000) / TURN_MM), tall: Math.round(((TOP - BOTTOM) * 1000) / TURN_MM), mm: TURN_MM })]);
    }
    await sheet(`sarah-v2-plain-${pose}-belly-${String(size).padStart(3, '0')}`, `Sarah v2 · plain body · belly ${size}% · ${POSE_LABEL[pose] ?? pose} · 1 pixel = ${TURN_MM} mm`, pose, size, views);
  }
  if (errors.length) log('page errors', errors.slice(-5).join(' | '));
} finally { await browser.close(); server.httpServer.close(); }
