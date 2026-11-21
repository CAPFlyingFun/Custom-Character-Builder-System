/** Types for `head.mjs` (her head read for the hair toolkit), so `tests/hairStyles.test.ts` can import it. */
import type { NodeIO } from '@gltf-transform/core';
export type V3 = [number, number, number];
export declare const BODY_FILE: string;
export declare const REST_SCALE: number;
export declare const REST_OFFSET: V3;
export interface HairBody {
  readonly id: 'female' | 'male'; readonly file: string; readonly scale: number; readonly pitch: number; readonly offset: V3;
  readonly bones: { readonly head: string; readonly neck: string; readonly chest: string };
}
export declare const BODIES: { readonly female: HairBody; readonly male: HairBody };
export declare function bodyOf(idOrFile?: string): HairBody;
export declare function toRest(body: HairBody, p: readonly number[]): V3;
export declare function fromRest(body: HairBody, q: readonly number[]): V3;
export declare function dirFromRest(body: HairBody, n: readonly number[]): V3;
export interface HairHead {
  readonly file: string; readonly body: HairBody; readonly joints: string[]; readonly HEAD: number; readonly NECK: number; readonly CHEST: number;
  nearest(p: V3, r?: number): { q: V3; d: number; n: V3 } | null;
  keepOff(p: V3, clear: number, reach?: number): V3;
  signedOff(p: V3, reach?: number): number | null;
  raycast(o: V3, d: V3): number;
  weightsNear(p: V3): Map<number, number>;
}
export declare function hairIo(): Promise<NodeIO>;
export declare function loadHead(file?: string, bodyId?: 'female' | 'male' | null): Promise<HairHead>;
