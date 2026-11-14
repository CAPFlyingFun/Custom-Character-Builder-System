/**
 * HER LEGS APART, MEASURED FROM THE ROOM (2026-11-12): where the room draws every vertex of her hips with her legs
 * apart, for a garment designed in that pose (Joshua: "I think we need to design the bottom with the legs apart and
 * when they close, should hopefully look right. We are doing it backwards"; src/sarahlab/designPose.ts says why).
 *
 * The room is opened with her athletic bikini on (her points' slip is only kept while a designed garment is worn), at
 * 100 %, and LEGS APART pressed -- the pose his drawing sheet of her legs apart shows (scripts/probe-body-sheets.mjs).
 * It is then asked for each vertex's CARRY: from its rest place to where it is drawn, seen from her pelvis bone as it
 * stood at rest, settled against her slip as laid (`designPose.settleCarry`: the carry which the room's own look-up
 * turns back into exactly where it drew her). What is written is `POSE_BIN`, which scripts/designAthleticBottom.mjs
 * designs her bikini bottom on: little-endian, Uint32 version (1), Uint32 her vertex count, Uint32 entries, Float32
 * step (metres); then each entry's vertex (Uint32); then each entry's carry in steps (three Int16), her rest frame.
 * Only vertices round her hips are kept (`BOX`), and only those carried at all.
 *
 * HER ARMS AND HANDS ARE LEFT OUT (her body file says which vertices they are: `bodyFrame().onArm`). They hang inside
 * the box, and a measurement of them does not repeat. MEASURED 2026-11-12, the same room measured twice: every vertex
 * looked up inside her bikini bottom's block came back the same to a step of the store (0.05 mm), and every other
 * vertex off her arms within 0.16 mm; her arms' 22,166 vertices came back up to 17.7 mm apart (a fingertip; 3 to 9 mm
 * along her forearms), nearly all of it front to back. A vertex left out is looked up at its rest place.
 *
 * It measures the room AS BUILT, with the bikini bottom it already has: run it again after anything changes how the
 * room draws LEGS APART, then the design script, and build. (The first table was made from the same measurements read
 * out of the room by hand.) Every number is MEASURED by the room but `BOX`, GAME TUNING.
 *
 *     node scripts/probe-legs-apart.mjs      (NO_BUILD=1; OUT=another file to write instead)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';
import { POSE_BIN, POSE_STEP_M, bodyFrame } from './designAthleticBottom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.OUT ?? POSE_BIN);
const log = (...a) => console.log('[legs apart]', ...a);
/** GAME TUNING (metres, her rest frame): her hips, from the middle of her thighs to over her navel -- a vertex is kept when its place, at rest or as drawn, is in it. */
const BOX = { lo: [-0.32, 0.64, -0.32], hi: [0.32, 1.12, 0.24] };
/** Her pelvis bone (the first of her skin's joints), her outfit and pose by the room's own names, and her size. */
const PELVIS = 'Bone_000', OUTFIT = 'bikini', POSE = 'apart', SIZE = 100;

const frame = await bodyFrame();
if (!process.env.NO_BUILD) await build({ root: ROOT, logLevel: 'error' });
const server = await preview({ root: ROOT, preview: { host: '127.0.0.1', port: 4343, strictPort: false, open: false }, logLevel: 'error' });
const exe = (() => { if (existsSync(chromium.executablePath())) return undefined; const b = '/opt/pw-browsers'; for (const n of ['chromium/chrome-linux/chrome', 'chromium-1243/chrome-linux/chrome']) { const p = path.join(b, n); if (existsSync(p)) return p; } return path.join(b, 'chromium'); })();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'], executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const press = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.click(), a);
  const text = (a) => page.evaluate((x) => document.querySelector(`[data-action="${x}"]`)?.textContent ?? '', a);
  const hook = (n, ...a) => page.evaluate(([k, b]) => JSON.parse(JSON.stringify(globalThis.__sarahLabCloth[k](...b) ?? null)), [n, a]);
  const run = (s) => page.evaluate((x) => globalThis.__sarahLabCloth.animate(x), s);
  await page.goto(server.resolvedUrls.local[0] + '?probe=cloth', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-field="sarahlab-status"]')?.dataset.model === 'v2-body', null, { timeout: 300_000 });
  await page.waitForTimeout(6000);
  let outfit = '';
  for (let n = 0; n < 24; n++) { outfit = await text('sarahlab:outfit'); if (outfit.includes(OUTFIT) && !outfit.includes('…')) break; await press('sarahlab:outfit'); await page.waitForTimeout(2500); }
  if (!outfit.includes(OUTFIT)) throw new Error(`the room has no outfit ${OUTFIT}`);
  await page.waitForTimeout(4000);
  await hook('hold', true);
  await press(`sarahlab:${POSE}`); await run(1);
  await hook('bump', SIZE); await run(3);
  // her bikini bottom's field in, and her slip worked out for her as she stands now
  let state = null;
  for (let n = 0; n < 40; n++) { state = await hook('paintFieldState'); if (state?.field?.on?.some((v) => v > 0.5) && state.slip?.solved > 0) break; await run(0.5); await page.waitForTimeout(500); }
  if (!(state?.slip?.solved > 0)) throw new Error('her bikini bottom\'s field never came in: her slip is not kept');
  await run(1);
  log('outfit', JSON.stringify(outfit), 'pose', POSE, 'bump', await hook('bump'), 'her slip', JSON.stringify(state.slip));

  const units = (p) => p.map((v, k) => (v - frame.offset[k]) / frame.scale);
  const got = await page.evaluate(([pelvis, lo, hi, step]) => globalThis.__sarahLabCloth.poseCarry(pelvis, lo, hi, step), [PELVIS, units(BOX.lo), units(BOX.hi), POSE_STEP_M / frame.scale]);
  if (!got) throw new Error('the room gave no carry');
  const bytes = Buffer.from(got.data, 'base64'), carry = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  if (carry.length !== frame.vertices * 3) throw new Error(`the room's body has ${carry.length / 3} vertices, her body file ${frame.vertices}`);
  const index = [], steps = [];
  let longest = 0, arms = 0;
  for (let v = 0; v < frame.vertices; v++) {
    const q = [0, 1, 2].map((k) => Math.round((carry[v * 3 + k] * frame.scale) / POSE_STEP_M));
    if (!q[0] && !q[1] && !q[2]) continue;
    if (frame.onArm[v]) { arms++; continue; }
    if (q.some((x) => Math.abs(x) > 32767)) throw new Error(`vertex ${v} is carried ${(Math.max(...q.map(Math.abs)) * POSE_STEP_M).toFixed(3)} m: too far for its store`);
    index.push(v); steps.push(...q); longest = Math.max(longest, Math.hypot(...q) * POSE_STEP_M);
  }
  const out = Buffer.alloc(16 + index.length * 10);
  out.writeUInt32LE(1, 0); out.writeUInt32LE(frame.vertices, 4); out.writeUInt32LE(index.length, 8); out.writeFloatLE(POSE_STEP_M, 12);
  index.forEach((v, e) => out.writeUInt32LE(v, 16 + e * 4));
  steps.forEach((q, e) => out.writeInt16LE(q, 16 + index.length * 4 + e * 2));
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, out);
  log(`wrote ${path.relative(ROOT, OUT)}: ${index.length} of her ${frame.vertices} vertices carried, the farthest ${(longest * 100).toFixed(1)} cm (${out.length} bytes); ${arms} more, her arms' and hands', left out`);
  const mm = (v) => (v * frame.scale * 1000).toFixed(3);
  log(`looked up with it, her vertices are back where the room drew them: of the ${got.offNear.vertices} inside the bottom's block 99 in 100 within ${mm(got.offNear.most)} mm, the worst ${mm(got.offNear.worst)} mm; of them all, ${mm(got.off.most)} and ${mm(got.off.worst)} mm`);
  if (errors.length) log('page errors', errors.slice(-5).join(' | '));
} finally { await browser.close(); server.httpServer.close(); }
