/**
 * Types for the side lock's bake (`sarahV2SideLock.mjs`), so `tests/sarahV2SideLock.test.ts` can import it. The module
 * is plain JS, as everything under `scripts/` is: it is run by `node`, not by vite.
 */
import type { Accessor, Document, Mesh, Primitive } from '@gltf-transform/core';

export interface SideLock { readonly fromM: number; readonly toM: number; readonly evenPasses: number; readonly evenWithinM: number; readonly wornPasses: number }
export declare const SIDE_LOCK: SideLock;
export declare const SIDE_LOCK_NOTE: string;
export declare const SIDE_LOCK_FILES: readonly string[];
export declare const SIDE_LOCK_SHAPES: readonly string[];
export declare const MIDLINE_X_M: number;

export declare function smoothstep(a: number, b: number, x: number): number;
export declare function roundEven(x: number): number;
export declare function weld(rest: ArrayLike<number>, grid?: number): { pointOf: Int32Array; rep: Int32Array; count: number };

export interface SideRegions {
  /** +1 her +x arm below its armpit, -1 the other, 0 the rest of her */
  arm: Int8Array;
  /** 1 where she is joined to her belly below both armpits and lies below her own side's */
  trunkBelow: Uint8Array;
  /** metres below her side's armpit, evened over her mesh */
  drop: Float64Array;
  /** her armpits' heights: +x, -x */
  cut: [number, number];
}
export declare function sideRegions(input: { rest: ArrayLike<number>; index: ArrayLike<number>; midX?: number; elbows: readonly ArrayLike<number>[] }, lock?: SideLock): SideRegions;
export declare function fadeOf(region: Pick<SideRegions, 'trunkBelow' | 'drop'>, lock?: SideLock): Float64Array;
export declare function lockWeights(bytes: ArrayLike<number>, joints: ArrayLike<number>, isArm: ArrayLike<number>, fade: ArrayLike<number>): { bytes: Uint8Array; changed: number };
export declare function lockShape(deltas: Int16Array, fade: ArrayLike<number>): { deltas: Int16Array; changed: number };
export declare function evenOver(values: ArrayLike<number>, rest: ArrayLike<number>, index: ArrayLike<number>, passes: number): Float64Array;
export declare function fadeOfPart(part: ArrayLike<number>, skin: ArrayLike<number>, arm: ArrayLike<number>, fade: ArrayLike<number>, cell?: number): { fade: Float64Array; off: Float64Array };

export interface BodyPart {
  at: number; prim: Primitive; material: string; n: number;
  rest: Float64Array; index: Uint16Array | Uint32Array; joints: Uint8Array | Uint16Array; weights: Uint8Array; shapes: Int16Array[];
  accessors: { weights: Accessor; shapes: Accessor[] };
}
export interface Body {
  mesh: Mesh; names: string[]; joints: string[]; upperArms: number[]; isArm: Uint8Array; midX: number; elbows: number[][];
  skin: BodyPart; worn: BodyPart[];
}
export declare function readBody(doc: Document, skip?: ReadonlySet<string>): Body;

export interface LaidPart {
  at: number; material: string; n: number;
  weights: Uint8Array; weightsChanged: number; shapes: Int16Array[]; shapesChanged: number[];
  /** a worn part's: how far each point lies off her skin (metres), and the fade it took from it */
  off?: Float64Array; fade?: Float64Array;
}
export interface LockFrom { weights?: Uint8Array; shapes?: Int16Array[] }
export declare function planSideLock(body: Body, from?: { skin?: LockFrom; worn?: (LockFrom | undefined)[] } | null, lock?: SideLock): { region: SideRegions; fade: Float64Array; skin: LaidPart; worn: LaidPart[] };
export declare function sideLock(src: string, dst?: string, options?: { log?: (line: string) => void }): Promise<{ file: string; armpits: number[]; parts: Record<string, unknown>[]; held: number; bytes: number[] }>;
