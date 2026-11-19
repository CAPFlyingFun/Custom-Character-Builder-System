/**
 * HIS BONES BY HERS (the male base model's rig: Meshy's, as hers is). MEASURED on the two files (2026-11-19): his spine has
 * one bone more than hers -- hers runs Bone_001, Bone_004, Bone_003, Bone_002 from her pelvis to her chest, his Bone_001,
 * Bone_005, Bone_004, Bone_003, Bone_002 -- and every bone after it is named one further on (her neck Bone_017 is his
 * Bone_018, her left upper arm Bone_026 his Bone_027, her left hip Bone_014 his Bone_015). The one skeleton (her
 * `sarah-skeleton.glb`, named as her rig is) is laid in him through this.
 *
 *   her Bone_000, Bone_001, Bone_002   his the same
 *   her Bone_004 (her first lumbar)    his Bone_005
 *   her Bone_003 (her upper lumbar)    his Bone_004 (his Bone_003, between it and his chest, is his own)
 *   her Bone_005 … Bone_067            his one on (Bone_006 … Bone_068)
 */
const num = (name: string): number | null => { const m = /^Bone_(\d{3})$/.exec(name); return m ? Number(m[1]) : null; };
const bone = (k: number): string => `Bone_${String(k).padStart(3, '0')}`;

/** His bone for one of hers (a name that is not one of the rig's numbered bones is the same). */
export function hisBone(her: string): string {
  const k = num(her);
  if (k === null || k <= 2) return her;
  if (k === 4) return bone(5);
  if (k === 3) return bone(4);
  return bone(k + 1);
}

/** Her bone for one of his (his own spine bone, Bone_003, is her upper lumbar's: the nearest she has). */
export function herBone(his: string): string {
  const k = num(his);
  if (k === null || k <= 2) return his;
  if (k === 5) return bone(4);
  if (k === 4 || k === 3) return bone(3);
  return bone(k - 1);
}
