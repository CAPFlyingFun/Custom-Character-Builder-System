/**
 * Her body as the room maps it for painting, for the tests that need her real skin with her regions and her joints:
 * the room's body file (`garmentSarahBody.loadSarahMesh`), her bind joints read off her skeleton (`readBindJoints`,
 * `measureHuman`) and `bodyRegions.mapBody` over them -- as `SarahLabScene` hands her map to the fabric editor
 * (`hooks.regions`). Her places are in her MESH'S OWN UNITS (1.11142 of them a metre), her feet at y about -0.89.
 * Load it once a file, in a `beforeAll`.
 */
import type * as THREE from 'three';
import { measureHuman } from '../src/actor/humanSkeleton';
import { mapBody, type BodyMap } from '../src/sarahlab/bodyRegions';
import { FACE_REST_SCALE } from '../src/sarahlab/faceRig';
import { readBindJoints } from '../src/view/HumanRig';
import { loadSarahMesh } from './garmentSarahBody';

export interface HerBody {
  readonly mesh: THREE.SkinnedMesh;
  readonly map: BodyMap;
  /** her vertices at rest, three numbers each, and her triangles */
  readonly rest: Float32Array; readonly index: Uint32Array;
  /** how many of her mesh's units make a metre on her */
  readonly unitsPerMetre: number;
}

export async function loadHerBody(): Promise<HerBody> {
  const mesh = await loadSarahMesh(), g = mesh.geometry, n = g.getAttribute('position').count;
  const bind = readBindJoints(mesh), measure = measureHuman(bind);
  const floats = (name: string, size: number) => { const a = g.getAttribute(name); return Float32Array.from({ length: n * size }, (_, i) => a.getComponent(Math.floor(i / size), i % size)); };
  const rest = floats('position', 3);
  const jointAt = Object.fromEntries(Object.entries(measure.joints).map(([k, j]) => [k, [bind[j].x, bind[j].y, bind[j].z]])) as unknown as Parameters<typeof mapBody>[0]['jointAt'];
  const map = mapBody({ skinIndex: floats('skinIndex', 4), skinWeight: floats('skinWeight', 4), parents: bind.map((j) => j.parent), joints: measure.joints, restNormal: floats('normal', 3), restPosition: rest, jointAt });
  return { mesh, map, rest, index: Uint32Array.from(g.index!.array as ArrayLike<number>), unitsPerMetre: 1 / FACE_REST_SCALE };
}
