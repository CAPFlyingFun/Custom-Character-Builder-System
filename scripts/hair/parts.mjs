/**
 * A HAIRSTYLE'S PARTS AGAINST HER SKIN (the toolkit, `scripts/hair/`): for a style built in memory -- no file written --
 * each of its parts (`kit.part`), how many of its DRAWN points lie more than a millimetre under her skin and how deep
 * the deepest is. What a person writing a style runs between looks, to find which part is in her.
 *
 *   node scripts/hair/parts.mjs <id> [--light] [--short]
 *
 * A point counts when a triangle uses it and its alpha draws (0.42 and over, the material's cut). `--short` builds the
 * style at its shortest. The aim is none under her skin: `tests/hairStyles.test.ts` holds a baked file to 0.5 mm.
 */
import { loadHead } from './head.mjs';
import { makeKit } from './kit.mjs';
import { loadStyle } from './bake.mjs';

const id = process.argv[2];
if (!id) { console.error('node scripts/hair/parts.mjs <id> [--light] [--short]'); process.exit(1); }
const head = await loadHead(), style = await loadStyle(id);
const kit = makeKit(head, { light: process.argv.includes('--light'), length: process.argv.includes('--short') ? 0 : 1 });
style.build(kit);
const used = new Uint8Array(kit.out.pos.length / 3);
for (const v of kit.out.index) used[v] = 1;
let v0 = 0, triangles = 0;
for (const [name, p] of Object.entries(kit.parts)) {
  let worst = 0, n = 0, at = null;
  for (let v = v0; v < v0 + p.vertices; v++) {
    if (!used[v] || kit.out.col[v * 4 + 3] < 0.42) continue;
    const q = kit.out.pos.slice(v * 3, v * 3 + 3), s = head.signedOff(q, 0.05);
    if (s !== null && s < -0.001) { n++; if (s < worst) { worst = s; at = q.map((x) => x.toFixed(3)); } }
  }
  console.log(`${name}: ${p.vertices} points, ${p.triangles} triangles; under her skin by over 1 mm: ${n}${n ? `, the deepest ${(-worst * 1000).toFixed(1)} mm at (${at.join(', ')})` : ''}`);
  v0 += p.vertices; triangles += p.triangles;
}
console.log(`${id}: ${kit.out.pos.length / 3} points, ${triangles} triangles in parts (${kit.out.index.length / 3} in all)`);
