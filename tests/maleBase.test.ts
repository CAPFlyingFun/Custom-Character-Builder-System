/**
 * The MALE BASE MODEL's room file (Joshua, 2026-11-19: "Can we work on the male character now?"): his archive with his
 * armpits weighted as hers were and his sides locked under his arms (`scripts/male/maleSideLock.mjs`), and nothing else.
 */
import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { MALE_ROOM_FILE, MALE_SOURCE, MALE_SIDE_LOCK_NOTE } from '../scripts/male/maleSideLock.mjs';

describe('the male base model as the room loads it', () => {
  it('is his archive with his armpits and sides locked: the same points, triangles and bones, two raised-arm tucks', async () => {
    const io = new NodeIO(), [a, b] = await Promise.all([io.read(MALE_SOURCE), io.read(MALE_ROOM_FILE)]);
    const ma = a.getRoot().listMeshes()[0], mb = b.getRoot().listMeshes()[0], pa = ma.listPrimitives()[0], pb = mb.listPrimitives()[0];
    expect(mb.getExtras()?.sideLock).toBe(MALE_SIDE_LOCK_NOTE);
    expect(mb.getExtras()?.targetNames).toEqual(['armRaiseL', 'armRaiseR']);
    expect(Array.from(pb.getAttribute('POSITION')!.getArray()!)).toEqual(Array.from(pa.getAttribute('POSITION')!.getArray()!));
    expect(Array.from(pb.getIndices()!.getArray()!)).toEqual(Array.from(pa.getIndices()!.getArray()!));
    expect(b.getRoot().listSkins()[0].listJoints().map((j) => j.getName())).toEqual(a.getRoot().listSkins()[0].listJoints().map((j) => j.getName()));
    // every point's weights still sum to one
    const W = pb.getAttribute('WEIGHTS_0')!.getArray()!;
    for (let i = 0; i < W.length; i += 4) expect(Math.abs(W[i] + W[i + 1] + W[i + 2] + W[i + 3] - 1)).toBeLessThan(1e-4);
  }, 120_000);
});
