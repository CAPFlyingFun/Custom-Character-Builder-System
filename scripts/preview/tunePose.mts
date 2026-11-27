/**
 * A pose's numbers tried several ways at once, her body read once (`scripts/preview/pose.mts`'s functions): for each
 * try, where parts are through one another (part against part only -- a blend zone's skin at a joint, 255, is left out:
 * in her rest pose it reads 2 to 3 cm "through" at her groin and armpits, MEASURED 2026-11-26) and her named contacts'
 * heights. A tool to tune by, not a test.
 *
 *   npx tsx scripts/preview/tunePose.mts tries.json [--bump 0,200] [--png dir]
 *   tries.json: [{ "label": "...", "pose": "core-05-thinking", "patch": { "angles": { "armL": { ... } } } }, ...]
 *   (a patch's parts replace the pose's own, part by part; `bump` likewise)
 */
import { readFileSync } from 'node:fs';
import { throughEachOther } from '../../src/actor/selfContact';
import { CHECK_PARTS, PART_NAMES, type PoseSpec } from '../../src/actor/poseLibrary';
import { poseById } from '../../src/data/poses';
import { loadPosable, posed, contactHeights } from './pose.mjs';

const opt = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const tries = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { label: string; pose: string; patch?: Partial<PoseSpec> }[];
const bumps = opt('bump', '0').split(',').map(Number);
const body = await loadPosable((opt('body', 'female')) as 'female' | 'male');
const roleOf = new Map<number, string>(Object.entries(body.measure.joints as Record<string, number>).filter(([, v]) => typeof v === 'number').map(([k, v]) => [v, k]));
for (const t of tries) {
  const base = poseById(t.pose); if (!base) { console.log(`${t.label}: no pose ${t.pose}`); continue; }
  const p = t.patch ?? {};
  const spec: PoseSpec = { ...base, ...p, angles: { ...base.angles, ...(p.angles ?? {}) }, bump: p.bump === undefined ? base.bump : { ...(base.bump ?? {}), ...p.bump }, body: { ...(base.body ?? {}), ...(p.body ?? {}) } };
  for (const b of bumps) {
    const x = posed(body, spec, b);
    const th = throughEachOther(x.points, body.index, x.part, CHECK_PARTS, { every: 2 }).filter((r) => r.count > 0 && r.b !== 255);
    const bone = (i: number) => { let k = 0; for (let j = 1; j < 4; j++) if (body.weights[i * 4 + j] > body.weights[i * 4 + k]) k = j; const b = body.joints[i * 4 + k]; return roleOf.get(b) ?? body.bind[b].name; };
    const s = th.map((r) => `${PART_NAMES[r.a]}>${PART_NAMES[r.b]} ${r.count} (${(r.deepest * 1000).toFixed(0)}mm${process.argv.includes('--where') ? ` ${bone(r.at)} @${[0, 1, 2].map((c) => x.points[r.at * 3 + c].toFixed(2)).join(' ')}` : ''})`).join(', ');
    console.log(`${t.label} @${b}%: ${s || 'clear'} | ${contactHeights(body, x, spec)}`);
  }
}
