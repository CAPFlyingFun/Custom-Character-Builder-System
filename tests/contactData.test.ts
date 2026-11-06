/**
 * CONTACT POINTS SAVED AS DATA (`scripts/measureContacts.ts`, `src/data/contacts/`, P4 2026-11-05). Each saved rig has
 * every contact site on both sides (finger pads and tips, palm and its heel, elbow, knee, heel, ball and toes), each on a
 * bone of its file and a triangle of its file's body mesh, at a depth that is a skin's (more than nothing, less than a
 * hand's breadth); and the saved file is what measuring its model again gives -- so a changed model or a changed measure
 * cannot leave the data the other games read behind.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTACT_RIGS, measureRig, type RigContacts } from '../scripts/measureContacts';
import { FINGER_NAMES } from '../src/actor/contactPoints';

const SITES = [...FINGER_NAMES.flatMap((f) => [`${f}Pad`, `${f}Tip`]), 'palm', 'palmHeel', 'elbow', 'knee', 'heel', 'ball', 'toes'];
const saved = (name: string) => JSON.parse(readFileSync(new URL(`../src/data/contacts/${name}.json`, import.meta.url), 'utf8')) as RigContacts;

describe('contact points saved as data', () => {
  for (const rig of CONTACT_RIGS) {
    it(`${rig.name}: every site on both sides, on its own bones and triangles, at a skin's depth -- and as measuring its model again gives`, async () => {
      const data = saved(rig.name);
      expect(data.missing).toEqual([]);
      for (const side of ['L', 'R']) for (const site of SITES) expect(data.points.some((p) => p.side === side && p.site === site), `${side}.${site}`).toBe(true);
      for (const p of data.points) {
        expect(p.tri, `${p.side}.${p.site} on a triangle of the file`).toBeLessThan(data.triangles);
        expect(p.depthMm, `${p.side}.${p.site} depth`).toBeGreaterThanOrEqual(0);
        expect(p.depthMm, `${p.side}.${p.site} depth`).toBeLessThan(160);
        expect(Math.abs(p.bary[0] + p.bary[1] + p.bary[2] - 1)).toBeLessThan(1e-4);
      }
      const again = await measureRig(rig);
      expect(again).toEqual(data);
    }, 120_000);
  }
});
