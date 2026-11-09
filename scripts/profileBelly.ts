/**
 * v2'S AND v3'S BELLY SIDE PROFILES (Joshua, 2026-11-09: "do the side view profile in a graph"): at her midline, v2's
 * approved belly as the room composes it (its measured outline, src/data/belly/v2-shapes.json) and v3's band as the room
 * shapes it (v2's outline over v3's rest and bone, its womb at WOMB FILL inside it), both about v3's rows, at every size
 * asked and with any of her Body panel's belly controls. Run by hand:
 * `npx tsx scripts/profileBelly.ts [out.json] [control=value ...]` (default shots/belly/profiles.json).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import belly from '../src/data/belly/skeleton.json';
import v2data from '../src/data/belly/v2-shapes.json';
import torso from '../src/data/torso/skeleton.json';
import pelvis from '../src/data/pelvis/skeleton.json';
import { bandRoom, bandState, layBand, rowMatrices, shapeBand, v2Outline, v2Push, wombDrawnMl, type SavedBelly, type V2Shapes } from '../src/actor/bellySkin';
import { layOrgans, organMeshes, type PelvisLandmarks } from '../src/actor/pelvicOrgans';
import { growWomb, wombContents, type TorsoLandmarks } from '../src/actor/pregnantWomb';
import { babySize, weekForBump } from '../src/sarahlab/baby';

const out = process.argv[2] && !process.argv[2].includes('=') ? process.argv[2] : 'shots/belly/profiles.json';
const controls = Object.fromEntries(process.argv.slice(2).filter((a) => a.includes('=')).map((a) => { const [k, v] = a.split('='); return [k, Number(v)]; }));
const FILL = Number(process.env.FILL ?? 0.5), SIZES = (process.env.SIZES ?? '0,50,100,150,200').split(',').map(Number);
const v2 = v2data as unknown as V2Shapes;
const band = layBand(belly as unknown as SavedBelly, torso.landmarks.navel, torso.landmarks.xiphoid, torso.landmarks.symphysisTop, undefined, v2);
const id = new Float32Array(16); id[0] = id[5] = id[10] = id[15] = 1;
const rows = rowMatrices(band, band.spine.map(() => id)), laid = layOrgans(pelvis as unknown as PelvisLandmarks);
const cell = (k: number, c: number) => Math.min(v2.rows - 1, Math.round((k / (band.rows - 1)) * (v2.rows - 1))) * v2.cols + (Math.round((c / band.cols) * v2.cols) % v2.cols);
const result: Record<string, unknown> = { landmarks: { pubis: torso.landmarks.symphysisTop[1], navel: torso.landmarks.navel, xiphoid: torso.landmarks.xiphoid[1] }, controls, fill: FILL, v2: {}, v3: {} };
for (const bump of SIZES) {
  const o = v2Outline(v2, bump, controls), back = band.cols / 2;
  (result.v2 as Record<number, number[][]>)[bump] = Array.from({ length: band.rows }, (_, k) => [band.y[k], band.cz[k] + o[cell(k, 0)], band.cz[k] - o[cell(k, back)]]);
  const shape = v2Push(band, v2, bump, controls), src: Float32Array[] = [];
  if (bump > 0) {
    const wk = weekForBump(bump, 1), grams = [babySize(wk, 0, 1).g];
    const womb = growWomb(laid, torso as unknown as TorsoLandmarks, wk, grams, 0, undefined, wombDrawnMl(wombContents(wk, grams).volumeMl, bump, FILL), bandRoom(band, shape));
    src.push(organMeshes({ ...laid, uterus: { path: womb.path, cervixEnds: womb.cervixEnds, length: womb.length, anteversionDeg: womb.leanDeg, halves: womb.halves, axes: womb.axes } }).uterus.points);
  }
  const st = bandState(band), drawn = new Float32Array(band.points.length);
  shapeBand(band, rows, src, st, drawn, 1, 0, [0, 0, 0], [0, 0, 0], shape);
  (result.v3 as Record<number, number[][]>)[bump] = Array.from({ length: band.rows }, (_, k) => [drawn[3 * (k * band.cols) + 1], drawn[3 * (k * band.cols) + 2], drawn[3 * (k * band.cols + back) + 2]]);
}
mkdirSync('shots/belly', { recursive: true }); writeFileSync(out, JSON.stringify(result));
console.log('wrote', out, SIZES.join(','), JSON.stringify(controls));
