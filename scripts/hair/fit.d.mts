/** Types for `fit.mjs` (how a hair file sits on her), so `tests/hairStyles.test.ts` can import it. */
import type { Primitive } from '@gltf-transform/core';
import type { HairHead } from './head.mjs';
export declare function hairPoints(file: string, shorter?: number): Promise<{ points: Float64Array; extras: Record<string, unknown>; prim: Primitive }>;
export declare function pointAlpha(prim: Primitive): Float32Array;
export declare function underSkin(head: HairHead, points: Float64Array, alpha?: Float32Array | null): { deepestMm: number; under1mm: number; within: number; worst: number[] | null };
