/** Types for `body.mjs` (her body file read for a picture without a browser). */
import type { NodeIO } from '@gltf-transform/core';
import type { DrawnMesh, Fragment, ReadPicture, Rgb } from './raster.mjs';
export const BODY_FILE: string;
export const SKIN_PICTURE: string;
export const JOINTS: Readonly<Record<'neck' | 'head' | 'chest' | 'hipL' | 'hipR' | 'shoulderL' | 'elbowL' | 'wristL' | 'shoulderR' | 'elbowR' | 'wristR', string>>;
export type V3 = [number, number, number];
export interface PreviewBody {
  /** xyz a point, her rest METRES (feet at y = 0, facing +z, +x her left) */
  readonly rest: Float32Array; readonly normal: Float32Array; readonly uv: Float32Array; readonly index: Uint32Array;
  /** a point: 1 her arm's skin, 0 the rest of her */
  readonly armShare: Float32Array;
  readonly bones: { readonly joints: ArrayLike<number>; readonly weights: Uint8Array; readonly names: string[] };
  joint(name: string): V3;
  readonly frameJoints: { neck: V3; hipL: V3; hipR: V3; shoulderL: V3; elbowL: V3; wristL: V3; shoulderR: V3; elbowR: V3; wristR: V3 };
  readonly skin: ReadPicture | null;
}
export function gltfIo(): Promise<NodeIO>;
export function loadBody(options?: { file?: string; picture?: boolean }): Promise<PreviewBody>;
export function within(body: PreviewBody, box?: { yFrom?: number; yTo?: number; xFrom?: number; xTo?: number }): Uint32Array;
export function skinMesh(body: PreviewBody, options?: { index?: ArrayLike<number>; colour?: Rgb; paint?: ((f: Fragment) => Rgb | number[] | null) | null }): DrawnMesh;
