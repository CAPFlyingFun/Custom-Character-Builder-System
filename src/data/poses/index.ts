/**
 * EVERY POSE OF THE LIBRARY (`actor/poseLibrary.ts`), sheet by sheet: one file a sheet, each its own author's.
 */
import type { PoseSpec } from '../../actor/poseLibrary';
import { CORE_POSES } from './core';

export const POSES: readonly PoseSpec[] = Object.freeze([...CORE_POSES]);
export const poseById = (id: string): PoseSpec | undefined => POSES.find((p) => p.id === id);
