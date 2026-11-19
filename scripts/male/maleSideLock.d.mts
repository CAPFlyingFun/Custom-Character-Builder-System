export const MALE_SOURCE: string;
export const MALE_ROOM_FILE: string;
export const MALE_SIDE_LOCK_NOTE: string;
export function maleSideLock(src?: string, dst?: string): Promise<{ file: string; armpits: number[]; vertices: number; changed: number }>;
