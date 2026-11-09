/**
 * HER LOWER TORSO MEASURED FOR HER BELLY'S SKIN (the skeleton-outward plan, the belly skin proof, step 1: "Measure her
 * lower ribs, waist and hip crests off the skeleton, saved as data"). Run by hand: `npx tsx scripts/measureBelly.ts`
 * (writes `src/data/belly/`).
 *
 * Her skeleton's file is read under node and put in her rest frame exactly as `scripts/measurePelvis.ts` reads it, then cut
 * into level slices from the top of her pubic bone to the tip of her xiphoid (src/data/pelvis/, src/data/torso/). In each
 * slice, of the bone within 20 cm of her midline (her arms are out at her shoulders in her bind): how wide it reaches
 * (her ribs, her iliac crests, her hips; at her waist only her lumbar spine), how far forward and back, and which bones
 * of her spine carry it -- each point's heaviest bone, those of her legs counted as her pelvis's, smoothed up and down.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restOfRig } from './measureContacts';
import { PELVIS_RIGS, type SavedPelvis } from './measurePelvis';
import type { SavedTorso } from './measureTorso';
import { BELLY_MEASURE, type SavedBelly } from '../src/actor/bellySkin';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const r = (x: number, k = 1e5) => Math.round(x * k) / k;

export async function measureBellyRig(rig: { name: string; model: string; metresPerUnit: number }): Promise<SavedBelly> {
  const { pos, names, parents, heaviest } = await restOfRig(rig);
  const pelvis = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'pelvis', `${rig.name}.json`), 'utf8')) as SavedPelvis;
  const torso = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'torso', `${rig.name}.json`), 'utf8')) as SavedTorso;
  const M = BELLY_MEASURE, bottom = pelvis.landmarks.symphysisTop[1], top = torso.landmarks.xiphoid[1], x0 = pelvis.landmarks.symphysisTop[0];
  // her spine's bones: from her pelvis bone up, each the child nearest her midline that goes up
  const pelvisBone = names.indexOf(pelvis.bone);
  if (pelvisBone < 0) throw new Error(`${rig.model}: no pelvis bone ${pelvis.bone}`);
  const chain = [pelvisBone];
  for (let k = 0; k < 3; k++) {
    const kids = names.map((_, i) => i).filter((i) => parents[i] === chain[chain.length - 1]);
    // (the one whose points lie highest on her midline: her next vertebra, not a hip or a shoulder)
    let best = -1, bestY = -Infinity;
    for (const kid of kids) { let y = 0, n = 0; for (let i = 0; i < heaviest.length; i++) if (heaviest[i] === kid && Math.abs(pos[3 * i] - x0) < 0.03) { y += pos[3 * i + 1]; n++; } if (n > 20 && y / n > bestY) { bestY = y / n; best = kid; } }
    if (best < 0) break;
    chain.push(best);
  }
  // each bone counted as the nearest of the chain it hangs from (her legs and hips as her pelvis)
  const ofChain = (b: number): number => { for (let q = b; q >= 0; q = parents[q]) { const k = chain.indexOf(q); if (k >= 0) return k; } return 0; };
  const rows = Math.round((top - bottom) / M.rowEvery) + 1, out: { y: number; halfWidth: number; boneFront: number; boneBack: number; weights: Record<string, number> }[] = [];
  const raw: number[][] = [];
  for (let k = 0; k < rows; k++) {
    const y = bottom + ((top - bottom) * k) / (rows - 1);
    let half = 0, front = -Infinity, back = Infinity, n = 0;
    const counts = new Array(chain.length).fill(0);
    for (let i = 0; i < heaviest.length; i++) {
      const px = pos[3 * i] - x0, py = pos[3 * i + 1], pz = pos[3 * i + 2];
      if (Math.abs(py - y) > M.slab || Math.abs(px) > M.reach) continue;
      half = Math.max(half, Math.abs(px)); front = Math.max(front, pz); back = Math.min(back, pz); n++;
      counts[ofChain(heaviest[i])]++;
    }
    raw.push(counts.map((c) => c / Math.max(1, n)));
    out.push({ y: r(y), halfWidth: r(half), boneFront: r(front), boneBack: r(back), weights: {} });
  }
  // (smoothed up and down, so a row's bones blend into the next)
  const span = Math.max(1, Math.round(M.weightSmooth / M.rowEvery));
  out.forEach((row, k) => {
    const w = new Array(chain.length).fill(0);
    for (let d = -span; d <= span; d++) { const j = Math.min(rows - 1, Math.max(0, k + d)), f = 1 - Math.abs(d) / (span + 1); raw[j].forEach((v, b) => (w[b] += v * f)); }
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    chain.forEach((b, i) => { if (w[i] / sum > 0.005) row.weights[names[b]] = r(w[i] / sum, 1e3); });
  });
  return { rig: rig.name, model: rig.model, frame: 'her rest frame: +y up, +z her front, +x her left, metres (the file\'s scene at her bind pose)', midlineX: r(x0), spine: chain.map((b) => names[b]), rows: out };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const dir = join(ROOT, 'src', 'data', 'belly'); mkdirSync(dir, { recursive: true });
  for (const rig of PELVIS_RIGS) {
    const saved = await measureBellyRig(rig);
    writeFileSync(join(dir, `${rig.name}.json`), JSON.stringify(saved, null, 1) + '\n');
    console.log(rig.name, 'spine', saved.spine.join(' '), 'rows', saved.rows.length);
    for (const row of saved.rows) console.log(row.y.toFixed(3), 'half', row.halfWidth.toFixed(3), 'front', row.boneFront.toFixed(3), 'back', row.boneBack.toFixed(3), JSON.stringify(row.weights));
  }
}
