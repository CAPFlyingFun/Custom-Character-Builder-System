/**
 * HER PELVIS SAVED AS DATA (the skeleton-outward plan, Phase 1: "Measure the pelvis properly: the inlet ring and the
 * curved path of the birth canal, saved as data"). Run by hand: `npx vite-node scripts/measurePelvis.ts` (writes
 * `src/data/pelvis/`).
 *
 * Her skeleton's file is read under node and put in her rest frame exactly as `scripts/measureContacts.ts` does (metres,
 * +y up, +z her front, +x across her), her pelvis bone is found by `measureHuman`, its own part of her mesh (the points
 * it carries most and the triangles all of whose corners it carries) is measured by `measurePelvis`
 * (actor/pelvisMeasure.ts) -- the room runs the same code -- and the landmarks, the diameters, the rings and the canal's
 * curved path are written twice: in her rest frame, and in her pelvis bone's own frame, which is what the womb and the
 * birth canal hang from (they move with it as she moves).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measurePelvis, type P3, type PelvisMeasure } from '../src/actor/pelvisMeasure';
import { restOfRig } from './measureContacts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The rigs measured. Only her skeleton for now: v3 is built on it (Joshua, 2026-11-08). */
export const PELVIS_RIGS = Object.freeze([{ name: 'skeleton', model: 'models/sarah-skeleton.glb', metresPerUnit: 1 }]);

export interface SavedPelvis {
  readonly rig: string;
  readonly model: string;
  readonly frame: string;
  /** Her pelvis bone, by name, and its joint (rest metres): the bone frame below is the rest frame moved to it. */
  readonly bone: string;
  readonly joint: number[];
  /** The diameters, centimetres. MEASURED on her skeleton. */
  readonly cm: { readonly obstetricConjugate: number; readonly inletTransverse: number; readonly inletAP: number; readonly interspinous: number; readonly intertuberous: number; readonly arcRadius: number };
  /** The landmarks, rest metres. */
  readonly landmarks: { readonly symphysisTop: number[]; readonly symphysisBottom: number[]; readonly symphysisCentre: number[]; readonly symphysisBack: number[]; readonly promontory: number[]; readonly tuberosityLeft: number[]; readonly tuberosityRight: number[] };
  /** The planes measured: inlet, midpelvis and outlet, each its turn about the symphysis, centre and ring (rest metres). */
  readonly inlet: { readonly angleDeg: number; readonly centre: number[]; readonly ring: number[][] };
  readonly midpelvis: { readonly angleDeg: number; readonly centre: number[]; readonly ring: number[][] };
  readonly outlet: { readonly angleDeg: number; readonly centre: number[]; readonly ring: number[][] };
  /** The canal's curved centre line, inlet to outlet: rest metres, and the same from her pelvis joint. */
  readonly axis: number[][];
  readonly axisFromJoint: number[][];
}

const r = (x: number, k = 1e5) => Math.round(x * k) / k;
const pt = (p: P3) => p.map((x) => r(x));

/** Her pelvis measured from her file, as the room measures it. */
export async function measurePelvisRig(rig: { name: string; model: string; metresPerUnit: number }): Promise<{ saved: SavedPelvis; measure: PelvisMeasure }> {
  const { pos, tris, joints, names, measure: human, heaviest } = await restOfRig(rig);
  const pelvis = human.joints.pelvis, keep = new Int32Array(heaviest.length).fill(-1), points: number[] = [];
  for (let i = 0; i < heaviest.length; i++) if (heaviest[i] === pelvis) { keep[i] = points.length / 3; points.push(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]); }
  const triangles: number[] = [];
  for (let t = 0; t + 2 < tris.length; t += 3) { const a = keep[tris[t]], b = keep[tris[t + 1]], c = keep[tris[t + 2]]; if (a >= 0 && b >= 0 && c >= 0) triangles.push(a, b, c); }
  const j = human.joints, centreX = (joints[3 * j.hipL] + joints[3 * j.hipR]) / 2;
  const m = measurePelvis(points, triangles, centreX);
  const joint: P3 = [joints[3 * pelvis], joints[3 * pelvis + 1], joints[3 * pelvis + 2]];
  const plane = (k: number) => ({ angleDeg: m.planes[k].angleDeg, centre: pt(m.planes[k].centre), ring: m.planes[k].ring.map(pt) });
  const saved: SavedPelvis = {
    rig: rig.name, model: rig.model,
    frame: 'her rest frame: +y up, +z her front, +x across her, metres (the file\'s scene at her bind pose); axisFromJoint is from her pelvis joint, the same axes',
    bone: names[pelvis], joint: pt(joint),
    cm: {
      obstetricConjugate: r(m.obstetricConjugate * 100, 10), inletTransverse: r(m.inlet.transverse * 100, 10), inletAP: r(m.inlet.ap * 100, 10),
      interspinous: r(m.midpelvis.interspinous * 100, 10), intertuberous: r(m.outlet.intertuberous * 100, 10), arcRadius: r(m.arcRadius * 100, 10),
    },
    landmarks: { symphysisTop: pt(m.symphysis.top), symphysisBottom: pt(m.symphysis.bottom), symphysisCentre: pt(m.symphysis.centre), symphysisBack: pt(m.symphysis.back), promontory: pt(m.promontory), tuberosityLeft: pt(m.outlet.tuberosities[0]), tuberosityRight: pt(m.outlet.tuberosities[1]) },
    inlet: plane(m.inlet.plane), midpelvis: plane(m.midpelvis.plane), outlet: plane(m.outlet.plane),
    axis: m.axis.map(pt), axisFromJoint: m.axis.map((p) => pt([p[0] - joint[0], p[1] - joint[1], p[2] - joint[2]])),
  };
  return { saved, measure: m };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const dir = join(ROOT, 'src', 'data', 'pelvis'); mkdirSync(dir, { recursive: true });
  for (const rig of PELVIS_RIGS) {
    const { saved } = await measurePelvisRig(rig);
    writeFileSync(join(dir, `${rig.name}.json`), JSON.stringify(saved, null, 1) + '\n');
    console.log(rig.name, JSON.stringify(saved.cm), 'inlet', saved.inlet.angleDeg, 'mid', saved.midpelvis.angleDeg, 'outlet', saved.outlet.angleDeg, 'axis', saved.axis.length);
  }
}
