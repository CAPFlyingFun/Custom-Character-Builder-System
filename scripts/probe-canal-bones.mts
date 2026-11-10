/**
 * HER OPEN CANAL AGAINST HER BONES THEMSELVES (Joshua, 2026-11-10: "the bones shouldn't be visible... if you see bones,
 * you know something is still off"). Her skeleton's file read under node in her rest frame (as scripts/measurePelvis.ts
 * reads it); her organs laid on her measured pelvis; and every point of her bones set against her canal open to a
 * head's width and her doors: how many stand inside the canal's wall, the deepest, and where.
 *
 *     npx tsx scripts/probe-canal-bones.mts            (OUT=<file.json> also writes the points near her canal)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openCanal } from '../src/actor/birthCanal';
import { DOORS, doorFrame, doorMeshes } from '../src/actor/birthDoors';
import { layOrgans, narrowAt } from '../src/actor/pelvicOrgans';
import { restOfRig } from './measureContacts';
import { PELVIS_RIGS } from './measurePelvis';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const rig = PELVIS_RIGS.find((r) => r.name === 'skeleton')!;
const { pos } = await restOfRig(rig);
const pelvis = read('src/data/pelvis/skeleton.json'), torso = read('src/data/torso/skeleton.json');
const bones = { ...pelvis, tail: torso.landmarks.coccyx };
const laid = layOrgans(bones), open = openCanal(laid.vagina, bones, 1, DOORS.hingeUp), path: number[][] = open.path.map((p) => [...p]);
/** her canal's half-sizes (across her, front to back) `t` of the way up it: narrower front to back where her bones pinch it */
const half = (t: number): [number, number] => [(open.width / 2) * narrowAt(open.narrowAcross, t), (open.depth / 2) * narrowAt(open.narrow, t)];
/** how far a point is outside her canal's wall (under 0: inside it), and how far along it (0 its opening .. 1 its top):
 * its wall an ellipse round its line, as wide as it is across her and as deep as it is there front to back */
const off = (q: number[]) => {
  let best = Infinity, at = 0, s = 0, total = 0;
  for (let i = 0; i + 1 < path.length; i++) total += Math.hypot(path[i + 1][1] - path[i][1], path[i + 1][2] - path[i][2]);
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, l = Math.sqrt(l2);
    const k = Math.min(1, Math.max(0, ((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1] + (q[2] - a[2]) * ab[2]) / l2));
    // (past its ends a point is not in it)
    if ((i === 0 && k <= 0) || (i + 2 >= path.length && k >= 1)) { s += l; continue; }
    const t = (s + l * k) / total, [hw, hd] = half(t);
    const lat = q[0] - a[0] - ab[0] * k, dy = q[1] - a[1] - ab[1] * k, dz = q[2] - a[2] - ab[2] * k, ap = Math.hypot(dy, dz), rad = Math.hypot(lat, ap) || 1e-9;
    // (the ellipse's radius the way the point lies from its line)
    const wall = (hw * hd) / Math.hypot((hd * lat) / rad, (hw * ap) / rad), d = rad - wall;
    if (d < best) { best = d; at = t; }
    s += l;
  }
  return { d: best, at };
};
let inside = 0, deepest = { d: Infinity, at: 0, q: [0, 0, 0] };
const near: number[][] = [];
for (let i = 0; i < pos.length; i += 3) {
  const q = [pos[i], pos[i + 1], pos[i + 2]];
  if (Math.abs(q[1] - 0.8) > 0.2 || Math.abs(q[0]) > 0.15) continue;
  const o = off(q);
  if (o.d < 0.03) near.push([...q.map((x) => +x.toFixed(4)), +o.d.toFixed(4)]);
  if (o.d < 0) { inside++; if (o.d < deepest.d) deepest = { d: o.d, at: o.at, q }; }
}
const cm = (x: number) => +(x * 100).toFixed(2);
console.log('her canal open:', path.length, 'points,', cm(path.reduce((s2, p, i) => (i ? s2 + Math.hypot(p[1] - path[i - 1][1], p[2] - path[i - 1][2]) : 0), 0)), 'cm; its opening', path[0].map(cm), 'cm; narrowest front to back', cm(open.depth * Math.min(...(open.narrow ?? [1]))), 'cm, across', cm(open.width * Math.min(...(open.narrowAcross ?? [1]))), 'cm');
console.log('bone points inside its wall:', inside, inside ? `deepest ${cm(-deepest.d)} cm in, ${Math.round(deepest.at * 100)}% of the way up it, at ${deepest.q.map(cm)} cm` : '');
// (by height band: the least room between a bone point and her canal's wall)
for (let y = 0.70; y < 0.90; y += 0.02) {
  const band = near.filter((q) => q[1] >= y && q[1] < y + 0.02);
  if (!band.length) continue;
  const least = band.reduce((m, q) => (q[3] < m[3] ? q : m));
  console.log(`  y ${cm(y)}..${cm(y + 0.02)}: ${band.length} points near, least ${cm(least[3])} cm clear, at x ${cm(least[0])} z ${cm(least[2])}`);
}
// (and her doors, shut and wide open: the least room between any point of them and any point of her bones)
{ const frame = doorFrame(laid.vagina.path);
  for (const swing of [0, 1]) {
    const d = doorMeshes(frame, swing).points; let least = Infinity, where = [0, 0, 0];
    for (let i = 0; i < d.length; i += 3) for (let k = 0; k < pos.length; k += 3) {
      if (Math.abs(pos[k + 1] - d[i + 1]) > 0.03) continue;
      const l = Math.hypot(pos[k] - d[i], pos[k + 1] - d[i + 1], pos[k + 2] - d[i + 2]);
      if (l < least) { least = l; where = [pos[k], pos[k + 1], pos[k + 2]]; }
    }
    console.log(`her doors ${swing ? 'wide open' : 'shut'}: least ${cm(least)} cm from bone, at ${where.map(cm)} cm`);
    // (and the skin round them: her skeleton's test piece, v2's own skin's stand-in)
    const sk = doorMeshes(frame, swing).skin.points; let ring = Infinity, at = [0, 0, 0];
    for (let i = 0; i < sk.length; i += 3) for (let k = 0; k < pos.length; k += 3) {
      if (Math.abs(pos[k + 1] - sk[i + 1]) > 0.03) continue;
      const l = Math.hypot(pos[k] - sk[i], pos[k + 1] - sk[i + 1], pos[k + 2] - sk[i + 2]);
      if (l < ring) { ring = l; at = [pos[k], pos[k + 1], pos[k + 2]]; }
    }
    console.log(`  the skin round them: least ${cm(ring)} cm from bone, at ${at.map(cm)} cm`);
  } }
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ path, near }));
