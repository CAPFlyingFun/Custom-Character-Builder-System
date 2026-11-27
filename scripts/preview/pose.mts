/**
 * A POSE FROM THE LIBRARY, PICTURED AND CHECKED WITHOUT A BROWSER (2026-11-26: the pose library, `actor/poseLibrary.ts`).
 * The room is one browser and the lead's; whoever writes poses at a desk of their own looks at them here: the room's
 * body file read off disk, its belly laid on (her belly's own shapes by `bellyWeights`, his belly's field), the pose's
 * turns from `posePose` skinned on the CPU (each point carried by its four bones, as the room's skinning does), her body
 * turned as a whole and set on what holds her, drawn from four sides; and a REPORT: where she is lowest, each pair of
 * her parts through one another (`selfContact.ts`), and where her named contacts are against what holds her.
 *
 * A SKETCH TO WORK BY: no shape fields of the room's (her seat's, her bump's carry in a pose), no soft body, no clothes.
 * What a pose is judged by is the room's own pictures (`CLAUDE.md`, "Verification").
 *
 *   npx tsx scripts/preview/pose.mts --pose core-01-neutral [--body female|male] [--bump 0,100,200] [--out /tmp/pose.png] [--size 300]
 *   npx tsx scripts/preview/pose.mts --sheet core [--bump 0,200] [--out-dir /tmp/poses]   (every pose of a sheet, a picture each)
 *   npx tsx scripts/preview/pose.mts --sheet core --check-only        (the report alone, every pose, at 0, 100 and 200%)
 *
 * The report's lines: `lowest` (metres, the floor is 0), `through` (each pair of parts with points through the other:
 * how many, the deepest in mm), `contacts` (each named contact's height over what holds her, mm).
 */
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { beside, draw, savePng, stacked } from './raster.mjs';
import { measureHuman } from '../../src/actor/humanSkeleton';
import type { BindJoint } from '../../src/actor/humanRig';
import { poseChain, qRotate } from '../../src/actor/bodyAngles';
import { CHECK_PARTS, PART, PART_NAMES, partsOf, posePose, type PoseSpec } from '../../src/actor/poseLibrary';
import { throughEachOther } from '../../src/actor/selfContact';
import { bellyWeights } from '../../src/sarahlab/sarahLabTool';
import { maleBellyField, vertexNormals } from '../../src/sarahlab/maleBelly';
import { JointLimits } from '../../src/actor/jointLimits';
import { rangeDeg } from '../../src/data/jointRange';
import { POSES } from '../../src/data/poses';

const option = (name: string, fallback: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const flag = (name: string) => process.argv.includes(`--${name}`);
const FILES = { female: 'public/models/sarah-v2-body-slim.glb', male: 'public/models/male-base.glb' } as const;

type V = [number, number, number];
type Body = Awaited<ReturnType<typeof loadPosable>>;

/** A body file as a pose needs it: rest points (metres, its world), triangles, four bones a point, bind joints, belly. */
export async function loadPosable(which: 'female' | 'male') {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(FILES[which]), root = doc.getRoot();
  // the skinned mesh with the most points: the body
  let best: { node: ReturnType<typeof root.listNodes>[number]; prim: ReturnType<ReturnType<typeof root.listMeshes>[number]['listPrimitives']>[number]; n: number } | null = null;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh || !node.getSkin()) continue;
    for (const prim of mesh.listPrimitives()) { const n = prim.getAttribute('POSITION')?.getCount() ?? 0; if (!best || n > best.n) best = { node, prim, n }; }
  }
  if (!best) throw new Error('no skinned body');
  const skin = best.node.getSkin()!, list = skin.listJoints(), mesh = best.node.getMesh()!;
  const ibm = Array.from(skin.getInverseBindMatrices()!.getArray()!.slice(0, 16)), jw = list[0].getWorldMatrix();
  // mesh space to world: joint 0's world times its inverse bind
  const T = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) T[c * 4 + r] += jw[k * 4 + r] * ibm[c * 4 + k];
  const P = best.prim.getAttribute('POSITION')!, J = best.prim.getAttribute('JOINTS_0')!, W = best.prim.getAttribute('WEIGHTS_0')!, n = P.getCount();
  const rest = new Float32Array(n * 3), e: number[] = [];
  for (let i = 0; i < n; i++) { P.getElement(i, e); for (let c = 0; c < 3; c++) rest[i * 3 + c] = T[c] * e[0] + T[4 + c] * e[1] + T[8 + c] * e[2] + T[12 + c]; }
  const joints = new Uint16Array(n * 4), weights = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    J.getElement(i, e); for (let k = 0; k < 4; k++) joints[i * 4 + k] = e[k];
    W.getElement(i, e); const s = e[0] + e[1] + e[2] + e[3] || 1; for (let k = 0; k < 4; k++) weights[i * 4 + k] = e[k] / s;
  }
  const index = Uint32Array.from(best.prim.getIndices()!.getArray()!);
  const bind: BindJoint[] = list.map((j) => { const t = j.getWorldTranslation(), p = j.getParentNode(); return { name: j.getName(), x: t[0], y: t[1], z: t[2], parent: p ? list.indexOf(p as never) : -1 }; });
  const measure = measureHuman(bind);
  // her joints held to how far they go placed (the room's `limitedTurns`, 'passive': a pose held by what she rests on)
  const sex = which === 'male' ? 'male' : 'female';
  const limits = new JointLimits(measure, bind, (j, m) => rangeDeg(j as never, m as never, sex, 'passive'));
  // her belly's shapes, by name, in world
  const names = (mesh.getExtras() as { targetNames?: string[] })?.targetNames ?? [];
  const shapes = new Map<string, Float32Array>();
  best.prim.listTargets().forEach((t, k) => {
    const a = t.getAttribute('POSITION'); if (!a || !names[k]) return;
    const d = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a.getElement(i, e); for (let c = 0; c < 3; c++) d[i * 3 + c] = T[c] * e[0] + T[4 + c] * e[1] + T[8 + c] * e[2]; }
    shapes.set(names[k], d);
  });
  // his belly: a field on his trunk's skin (what his arms' and legs' bones carry is left)
  let hisBelly: Float32Array | null = null;
  if (which === 'male') {
    const parts = partsOf(measure, bind, joints, weights, (j) => [bind[j].x, bind[j].y, bind[j].z], rest, 1, { most: 0, nearArm: 0, nearLeg: 0 });
    const trunk = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // how much of it the bones of his trunk carry
      let t = 0; for (let k = 0; k < 4; k++) { const b = joints[i * 4 + k]; let x = b, limb = false; for (; x >= 0; x = bind[x].parent) if (x === measure.joints.hipL || x === measure.joints.hipR || x === measure.joints.shoulderL || x === measure.joints.shoulderR) { limb = true; break; } if (!limb) t += weights[i * 4 + k]; }
      trunk[i] = parts[i] === PART.trunk || t > 0 ? t : 0;
    }
    hisBelly = maleBellyField(rest, trunk);
  }
  return { which, rest, index, joints, weights, bind, measure, shapes, hisBelly, n, limits };
}

/** The body's points at a belly (0 .. 200 %), before any pose. */
export function shaped(body: Body, bumpPct: number): Float32Array {
  const out = Float32Array.from(body.rest);
  if (body.which === 'female') {
    for (const [name, w] of Object.entries(bellyWeights(bumpPct))) {
      const d = body.shapes.get(name); if (!d || !w) continue;
      for (let i = 0; i < out.length; i++) out[i] += d[i] * w;
    }
  } else if (body.hisBelly) {
    const k = bumpPct / 100;
    for (let i = 0; i < out.length; i++) out[i] += body.hisBelly[i] * k;
  }
  return out;
}

/** A pose on a body at a belly: its points as posed and placed (metres, the floor at y 0), its parts, its report. */
export function posed(body: Body, spec: PoseSpec, bumpPct: number) {
  const { bind, measure, joints, weights, n } = body;
  const p = posePose(measure, bind, spec, { bump: bumpPct / 100, unitsPerMetre: 1 });
  const walls = body.limits.pastWalls(p.turns);
  const turns = body.limits.limit(p.turns, []);
  const { acc, pos } = poseChain(bind, turns);
  const src = shaped(body, bumpPct), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < 4; k++) {
      const w = weights[i * 4 + k]; if (!w) continue;
      const b = joints[i * 4 + k], r = qRotate(acc[b] as never, [src[i * 3] - bind[b].x, src[i * 3 + 1] - bind[b].y, src[i * 3 + 2] - bind[b].z]);
      x += w * (pos[b][0] + r[0]); y += w * (pos[b][1] + r[1]); z += w * (pos[b][2] + r[2]);
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
  }
  // turned as a whole about her hips' middle
  const j = measure.joints, mid: V = [(pos[j.hipL][0] + pos[j.hipR][0]) / 2, (pos[j.hipL][1] + pos[j.hipR][1]) / 2, (pos[j.hipL][2] + pos[j.hipR][2]) / 2];
  const turn = (v: V): V => { const r = qRotate(p.root as never, [v[0] - mid[0], v[1] - mid[1], v[2] - mid[2]]); return [r[0] + mid[0], r[1] + mid[1], r[2] + mid[2]]; };
  for (let i = 0; i < n; i++) { const v = turn([out[i * 3], out[i * 3 + 1], out[i * 3 + 2]]); out[i * 3] = v[0]; out[i * 3 + 1] = v[1]; out[i * 3 + 2] = v[2]; }
  const jointAt = (b: number): V => turn(pos[b] as V);
  // set on what holds her: her lowest point on the floor, or her seat (what her pelvis and thighs carry) on the seat
  const seatBone = new Set([j.pelvis, j.hipL, j.hipR]);
  let low = Infinity, seatLow = Infinity;
  for (let i = 0; i < n; i++) {
    const y = out[i * 3 + 1]; if (y < low) low = y;
    if (p.support === 'seat') { let bestK = 0; for (let k = 1; k < 4; k++) if (weights[i * 4 + k] > weights[i * 4 + bestK]) bestK = k; if (seatBone.has(joints[i * 4 + bestK]) && y < seatLow) seatLow = y; }
  }
  const lift = p.support === 'seat' ? p.seat - seatLow : -low;
  for (let i = 0; i < n; i++) out[i * 3 + 1] += lift;
  // centred over the floor's middle
  const hips = jointAt(j.hipL).map((v, c) => (v + jointAt(j.hipR)[c]) / 2) as V;
  for (let i = 0; i < n; i++) { out[i * 3] -= hips[0]; out[i * 3 + 2] -= hips[2]; }
  const placedJoint = (b: number): V => { const v = jointAt(b); return [v[0] - hips[0], v[1] + lift, v[2] - hips[2]]; };
  const part = partsOf(measure, bind, joints, weights, (b) => placedJoint(b), out, 1);
  return { points: out, part, root: p.root, support: p.support, seat: p.seat, lowest: low + lift, hips: placedJoint(j.pelvis), placedJoint, walls };
}

/** Her named contact points (`data/contacts/female-v2.json`: a triangle of her skin and a place in it), female only. */
const CONTACTS = JSON.parse(readFileSync('src/data/contacts/female-v2.json', 'utf8')) as { points: { site: string; side: string; tri: number; bary: number[] }[] };
/** A pose's contact names to the sites they are on her (the lowest of them). */
const SITES: Record<string, string[]> = { sole: ['heel', 'ball'], heel: ['heel'], toes: ['toes'], ball: ['ball'], knee: ['knee'], palm: ['palm', 'palmHeel'], forearm: ['elbow'], elbow: ['elbow'] };
export function contactHeights(body: Body, x: ReturnType<typeof posed>, spec: PoseSpec): string {
  if (body.which !== 'female') return '';
  const floor = x.support === 'seat' ? 0 : 0, out: string[] = [];
  for (const c of spec.contacts) {
    const m = /^([a-z]+)([LR])$/.exec(c); if (!m || !SITES[m[1]]) continue;
    let low = Infinity;
    for (const p of CONTACTS.points) {
      if (p.side !== m[2] || !SITES[m[1]].includes(p.site)) continue;
      const t = p.tri * 3, i = [body.index[t], body.index[t + 1], body.index[t + 2]];
      const y = p.bary[0] * x.points[i[0] * 3 + 1] + p.bary[1] * x.points[i[1] * 3 + 1] + p.bary[2] * x.points[i[2] * 3 + 1];
      low = Math.min(low, y);
    }
    if (Number.isFinite(low)) out.push(`${c} ${((low - floor) * 1000).toFixed(0)}`);
  }
  return out.join(', ');
}

export function report(body: Body, spec: PoseSpec, bumpPct: number) {
  const x = posed(body, spec, bumpPct);
  const through = throughEachOther(x.points, body.index, x.part, CHECK_PARTS, { every: flag('quick') ? 4 : 1 }).filter((t) => t.count > 0);
  let floorUnder = 0; for (let i = 0; i < body.n; i++) if (x.points[i * 3 + 1] < -0.001) floorUnder++;
  return { x, through, floorUnder };
}

function views(body: Body, x: ReturnType<typeof posed>, size: number, label: string) {
  const nrm = vertexNormals(x.points, body.index);
  const colour = [[0.86, 0.68, 0.6], [0.55, 0.7, 0.86], [0.86, 0.55, 0.55], [0.6, 0.8, 0.6], [0.85, 0.8, 0.5]];
  const mesh = { pos: x.points, index: body.index, nrm, shade: (f: { at: (a: Uint8Array) => number; light: number; i0: number }) => { const p = x.part[f.i0], c = colour[p] ?? [0.75, 0.75, 0.75]; return [c[0] * f.light, c[1] * f.light, c[2] * f.light]; } };
  // the floor, and a seat under a seated pose
  const floor = { pos: Float32Array.from([-1.2, 0, -1.2, 1.2, 0, -1.2, 1.2, 0, 1.2, -1.2, 0, 1.2]), index: Uint32Array.from([0, 2, 1, 0, 3, 2]), shade: () => [0.42, 0.42, 0.45] };
  const meshes: object[] = [mesh, floor];
  if (x.support === 'seat') {
    const s = 0.17, h = x.seat, cx = x.hips[0], cz = x.hips[2] - 0.03;
    const box = Float32Array.from([cx - s, h, cz - s, cx + s, h, cz - s, cx + s, h, cz + s, cx - s, h, cz + s, cx - s, 0, cz - s, cx + s, 0, cz - s, cx + s, 0, cz + s, cx - s, 0, cz + s]);
    meshes.push({ pos: box, index: Uint32Array.from([0, 2, 1, 0, 3, 2, 3, 6, 2, 3, 7, 6, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 0, 1, 5, 0, 5, 4]), shade: () => [0.35, 0.27, 0.2] });
  }
  let top = 0; for (let i = 0; i < body.n; i++) top = Math.max(top, x.points[i * 3 + 1]);
  const span = Math.max(1.0, top + 0.15), centre: V = [0, span / 2 - 0.05, 0];
  const pics = [0, 45, 90, 180].map((yaw) => draw({ width: size, height: size, yaw, pitch: 8, centre, span, meshes: meshes as never }));
  void label;
  return beside(pics);
}

/**
 * FITTING A FLOOR POSE TO THE FLOOR (`--fit body.pitch=60:95,legs.flex=60:100`): the named numbers moved, each in its
 * range, until the pose's named contacts are as near the floor as they can be (the sum of their heights' squares): a
 * search a number at a time, its steps halved. `legs.` and `arms.` move both sides together. Prints what it found; the
 * pose's file is the author's to change. Female only (her contacts are measured on her). At --bump 200 it fits the
 * pose's 200% numbers (`bump`, `bumpBody`), which are all of the pose there.
 */
export function fitPose(body: Body, spec: PoseSpec, bumpPct: number, params: { path: string; lo: number; hi: number }[]): { values: Record<string, number>; cost: number; touch: string } {
  const big = bumpPct >= 200;
  const get = (sp: PoseSpec, path: string): number => {
    const [head, key] = path.split('.');
    if (head === 'body') return ((big ? sp.bumpBody?.[key as 'pitch'] : undefined) ?? (sp.body as Record<string, number> | undefined)?.[key]) ?? 0;
    const part = head === 'legs' ? 'legL' : head === 'arms' ? 'armL' : head;
    const at = (a?: PoseSpec['angles']) => (a as Record<string, Record<string, number> | undefined> | undefined)?.[part]?.[key];
    return (big ? at(sp.bump) : undefined) ?? at(sp.angles) ?? 0;
  };
  const set = (sp: PoseSpec, path: string, v: number): PoseSpec => {
    const [head, key] = path.split('.');
    if (head === 'body') return big ? { ...sp, bumpBody: { ...(sp.bumpBody ?? sp.body), [key]: v } } : { ...sp, body: { ...sp.body, [key]: v } };
    const parts = head === 'legs' ? ['legL', 'legR'] : head === 'arms' ? ['armL', 'armR'] : [head];
    const angles = { ...(big ? sp.bump : sp.angles) } as Record<string, unknown>;
    for (const part of parts) angles[part] = { ...(angles[part] as object | undefined), [key]: v };
    return big ? { ...sp, bump: angles as PoseSpec['angles'] } : { ...sp, angles: angles as PoseSpec['angles'] };
  };
  const cost = (sp: PoseSpec): number => {
    const x = posed(body, sp, bumpPct), t = contactHeights(body, x, sp);
    return t.split(', ').filter(Boolean).reduce((c, e) => { const mm = Number(e.split(' ')[1]); return c + (mm / 1000) ** 2; }, 0);
  };
  // (a number given one value, lo = hi, is set to it and not searched)
  for (const p of params) if (p.lo === p.hi) spec = set(spec, p.path, p.lo);
  let best = spec, bestCost = cost(spec);
  const steps = params.map((p) => (p.hi - p.lo) / 4);
  for (let round = 0; round < 8; round += 1) {
    for (let k = 0; k < params.length; k += 1) {
      if (params[k].lo === params[k].hi) continue;
      for (const dir of [1, -1]) {
        for (;;) {
          const v = Math.min(params[k].hi, Math.max(params[k].lo, get(best, params[k].path) + dir * steps[k]));
          const next = set(best, params[k].path, v), c = cost(next);
          if (c < bestCost - 1e-9) { best = next; bestCost = c; } else break;
        }
      }
      steps[k] /= 2;
    }
  }
  const values = Object.fromEntries(params.map((p) => [p.path, +get(best, p.path).toFixed(1)]));
  return { values, cost: bestCost, touch: contactHeights(body, posed(body, best, bumpPct), best) };
}

async function main() {
  const which = option('body', 'female') as 'female' | 'male', bumps = option('bump', '0').split(',').map(Number), size = Number(option('size', '300'));
  const sheet = option('sheet', ''), one = option('pose', '');
  const list = POSES.filter((p) => (one ? p.id === one : sheet ? p.sheet === sheet : false));
  if (!list.length) { console.log(`no pose: give --pose <id> or --sheet <sheet> (${[...new Set(POSES.map((p) => p.sheet))].join(', ')})`); process.exit(1); }
  const body = await loadPosable(which);
  const checkOnly = flag('check-only'), outDir = option('out-dir', '/tmp/poses');
  if (option('fit', '')) {
    const params = option('fit', '').split(',').map((x) => { const [path, r] = x.split('='); const [lo, hi] = r.split(':').map(Number); return { path, lo, hi }; });
    for (const spec of list) for (const bump of bumps) { const f = fitPose(body, spec, bump, params); console.log(`${spec.id} @${bump}%: ${JSON.stringify(f.values)}; contacts mm over the floor: ${f.touch}`); }
    return;
  }
  for (const spec of list) {
    const rows = [];
    for (const bump of checkOnly && option('bump', '') === '' ? [0, 100, 200] : bumps) {
      const r = report(body, spec, bump);
      const at = (i: number) => [0, 1, 2].map((c) => r.x.points[i * 3 + c].toFixed(2)).join(' ');
      const through = r.through.map((t) => `${PART_NAMES[t.a]}>${PART_NAMES[t.b]} ${t.count} (${(t.deepest * 1000).toFixed(0)} mm at ${at(t.at)})`).join(', ') || 'none';
      const walls = r.x.walls.map((w) => `${w.where} ${w.motion} ${w.angle.toFixed(0)}>${w.wall.toFixed(0)}`).join(', ');
      const touch = contactHeights(body, r.x, spec);
      console.log(`${which} ${spec.id} @${bump}%: through ${through}; below the floor ${r.floorUnder}${walls ? `; held at its wall: ${walls}` : ''}${touch ? `; contacts mm over the floor: ${touch}` : ''}`);
      if (!checkOnly) rows.push(views(body, r.x, size, `${spec.id} ${bump}%`));
    }
    if (!checkOnly) {
      const file = one ? option('out', `/tmp/pose-${spec.id}-${which}.png`) : `${outDir}/${spec.id}-${which}.png`;
      if (!one) await import('node:fs').then((fs) => fs.mkdirSync(outDir, { recursive: true }));
      await savePng(file, stacked(rows));
      console.log(`  -> ${file}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('pose.mts')) main().catch((e) => { console.error(e); process.exit(1); });
