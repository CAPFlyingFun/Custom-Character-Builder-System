/**
 * HER TORSO'S LANDMARKS SAVED AS DATA (the skeleton-outward plan, Phase 1: her womb's top checked against her pubic bone,
 * her navel and the bottom of her breastbone; the back of her pelvic outlet, her tailbone). Run by hand: `npx tsx scripts/measureTorso.ts` (writes
 * `src/data/torso/`).
 *
 * Her skeleton's file is read under node and put in her rest frame exactly as `scripts/measurePelvis.ts` reads it, cut
 * down her midline by `measureTorso` (actor/torsoMeasure.ts), and the front of her spine, her discs, her navel's height
 * and her xiphoid are written, with her pubic bone's top from her measured pelvis (src/data/pelvis/) beside them.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { P3 } from '../src/actor/pelvisMeasure';
import { measureTorso, type TorsoMeasure } from '../src/actor/torsoMeasure';
import { restOfRig } from './measureContacts';
import { PELVIS_RIGS, type SavedPelvis } from './measurePelvis';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export interface SavedTorso {
  readonly rig: string;
  readonly model: string;
  readonly frame: string;
  /** Her stature on her skeleton, metres: the top of her skull above the bottom of her feet's bones. MEASURED. */
  readonly stature: number;
  /** The heights her womb's top is checked against, rest metres: her pubic bone's top, her navel (the L3/L4 disc), the xiphoid's tip. */
  readonly landmarks: { readonly symphysisTop: number[]; readonly navel: number; readonly xiphoid: number[]; readonly coccyx: number[] };
  /** The discs above her promontory, rest metres: L5/S1, L4/L5, L3/L4, ... */
  readonly discs: number[];
  /** The front of her spine: [height, forward], rest metres. */
  readonly spineFront: number[][];
}

const r = (x: number, k = 1e5) => Math.round(x * k) / k;

/** Her torso measured from her file. */
export async function measureTorsoRig(rig: { name: string; model: string; metresPerUnit: number }): Promise<{ saved: SavedTorso; measure: TorsoMeasure }> {
  const { pos, tris, joints, measure: human } = await restOfRig(rig);
  const pelvis = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'pelvis', `${rig.name}.json`), 'utf8')) as SavedPelvis;
  const j = human.joints, centreX = (joints[3 * j.hipL] + joints[3 * j.hipR]) / 2;
  const m = measureTorso(pos, tris, centreX, pelvis.landmarks.promontory as unknown as P3);
  let top = -Infinity, bottom = Infinity;
  for (let i = 1; i < pos.length; i += 3) { top = Math.max(top, pos[i]); bottom = Math.min(bottom, pos[i]); }
  const saved: SavedTorso = {
    rig: rig.name, model: rig.model,
    frame: 'her rest frame: +y up, +z her front, +x across her, metres (the file\'s scene at her bind pose)',
    stature: r(top - bottom, 1e4),
    landmarks: { symphysisTop: pelvis.landmarks.symphysisTop, navel: r(m.navel), xiphoid: m.xiphoid.map((x) => r(x)), coccyx: m.coccyx.map((x) => r(x)) },
    discs: m.discs.map((x) => r(x)),
    spineFront: m.spineFront.map(([y, z]) => [r(y), r(z)]),
  };
  return { saved, measure: m };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const dir = join(ROOT, 'src', 'data', 'torso'); mkdirSync(dir, { recursive: true });
  for (const rig of PELVIS_RIGS) {
    const { saved } = await measureTorsoRig(rig);
    writeFileSync(join(dir, `${rig.name}.json`), JSON.stringify(saved) + '\n');
    console.log(rig.name, 'stature', saved.stature, 'navel', saved.landmarks.navel, 'xiphoid', saved.landmarks.xiphoid, 'coccyx', saved.landmarks.coccyx, 'discs', saved.discs.join(' '), 'spine samples', saved.spineFront.length);
  }
}
