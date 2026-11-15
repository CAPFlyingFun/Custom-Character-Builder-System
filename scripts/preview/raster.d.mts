/** Types for `raster.mjs` (a picture without a browser). */
export interface Fragment {
  readonly tri: number; readonly i0: number; readonly i1: number; readonly i2: number; readonly b0: number; readonly b1: number; readonly b2: number;
  readonly x: number; readonly y: number; readonly z: number; readonly nx: number; readonly ny: number; readonly nz: number;
  /** 0..1: the one light on its normal. */
  readonly light: number;
  /** seen from behind */
  readonly back: boolean;
  /** any other value a point has, blended as the pixel's place is: a number for `size` 1, else an array of `size` */
  at(array: ArrayLike<number>, size?: number): number | number[];
}
export type Rgb = readonly [number, number, number];
export interface DrawnMesh {
  readonly pos: Float32Array; readonly index: ArrayLike<number>; readonly nrm?: Float32Array; readonly twoSided?: boolean;
  keep?(f: Fragment): boolean;
  shade(f: Fragment): Rgb | number[];
}
export interface Picture { readonly width: number; readonly height: number; readonly rgb: Uint8ClampedArray; readonly depth?: Float32Array }
export interface Eye { readonly right: number[]; readonly up: number[]; readonly toEye: number[] }
export function eye(yaw?: number, pitch?: number): Eye;
export function draw(options: { width: number; height: number; yaw?: number; pitch?: number; centre?: readonly [number, number, number]; span?: number; background?: Rgb; meshes: readonly DrawnMesh[] }): Picture & { depth: Float32Array };
export function beside(pictures: readonly Picture[], gap?: number): Picture;
export function stacked(rows: readonly Picture[], gap?: number): Picture;
export function savePng(path: string, picture: Picture): Promise<string>;
export interface ReadPicture { readonly width: number; readonly height: number; readonly channels: 4; readonly data: Uint8Array; texel(u: number, v: number, flipV?: boolean): [number, number, number, number] }
export function readPicture(pathOrBytes: string | Uint8Array): Promise<ReadPicture>;
