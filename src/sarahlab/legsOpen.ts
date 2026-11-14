/**
 * HER LEGS OPEN HER (Joshua, 2026-11-14: "how far the 🦵 legs are spread apart does naturally open the opening to a max
 * of 20% in recline and squat, legs apart would be 12%"; first, 2026-11-02: "the vagina naturally opens about 15% in a
 * squat and 30% in a Recline, because the skin pulls it open a little bit from standing to those poses, and closes
 * naturally when the leg angles get closer together").
 *
 * Two things, both pure (no three, no DOM):
 *
 *   `legSpreadDeg`  how far her legs are spread: the angle between her thighs ACROSS her, in degrees -- each thigh's lean
 *                   out to its own side from her hips' line, the two added. Not the angle between her thighs in space: a
 *                   walk's stride puts one thigh in front of her and one behind, as far apart as LEGS APART has them
 *                   (MEASURED below), and a stride is not a spread. Across her a stride adds next to nothing, and for
 *                   her birth positions (each thigh the same way out) it is the angle between her thighs itself.
 *   `legsOpen`      how open that has her (0..1 of ten centimetres), through `LEGS_OPEN.table`.
 *
 * MEASURED 2026-11-14 on her own bones in the room (her hips' and knees' joints, read a centimetre fine), across her,
 * with her belly at 0, 100, 150 and 200%: standing 0, 8, 11 and 14 degrees; LEGS APART 36, 47, 54 and 60; SQUAT 103, 111,
 * 113 and 116; RECLINE 93, 101, 104 and 108 (her thighs open wider round a bigger belly: humanBirth.ts
 * `spreadPerBump`). Walking, 11 to 14 through a stride at 150% and up to 17 at 200%, while the angle between her thighs
 * in space ran from 13 to 37. Seated, 22 at 150% and 31 at 200%. So the table holds his numbers at every size of belly:
 * closed standing and walking, 12% in LEGS APART, 20% -- the most -- in SQUAT and in RECLINE; seated she is closed up to
 * 150%, and at 200%, her knees nearly as far apart as LEGS APART has them, 5% open.
 */

/** A point or a direction in the room: x, y, z. */
export type Vec3 = readonly [number, number, number];

/**
 * GAME TUNING (Joshua's numbers, 2026-11-14): how open her legs' spread has her -- `[degrees across her, share of ten
 * centimetres]`, straight lines between, flat outside. Nothing up to 28 degrees (she stands 14 apart at 200%, walks 17
 * apart, and sits 22 apart at 150%); 12% from 36 degrees to 62 (LEGS APART at any size of belly); 20%, the most, from
 * 90 degrees (RECLINE and SQUAT at any size). `perSecond`: how fast it is eased to (shares a second), so a change of pose opens and closes
 * her over a moment.
 */
export const LEGS_OPEN = Object.freeze({ table: [[28, 0], [36, 0.12], [62, 0.12], [90, 0.2]] as const, perSecond: 0.5 });

/** The most her legs open her (a share of ten centimetres). */
export const LEGS_OPEN_MOST: number = LEGS_OPEN.table[LEGS_OPEN.table.length - 1][1];

/**
 * How far her legs are spread, across her (degrees, 0 with her thighs side by side): from her hips' joints and her
 * knees', in any one frame. Each thigh's lean OUT to its own side of her hips' line (in, it counts against); 0 where a
 * joint is missing or two lie on each other.
 */
export function legSpreadDeg(hipL: Vec3, kneeL: Vec3, hipR: Vec3, kneeR: Vec3): number {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const across = sub(hipL, hipR), wide = Math.hypot(across[0], across[1], across[2]);
  const l = sub(kneeL, hipL), r = sub(kneeR, hipR), ll = Math.hypot(l[0], l[1], l[2]), rl = Math.hypot(r[0], r[1], r[2]);
  if (!(wide > 1e-9) || !(ll > 1e-9) || !(rl > 1e-9)) return 0;
  const out = (v: number): number => Math.asin(Math.max(-1, Math.min(1, v)));
  const deg = ((out(dot(l, across) / (ll * wide)) + out(-dot(r, across) / (rl * wide))) * 180) / Math.PI;
  return Number.isFinite(deg) ? deg : 0;
}

/** How open her legs' spread has her (0..1 of ten centimetres), `spreadDeg` across her. */
export function legsOpen(spreadDeg: number): number {
  const t = LEGS_OPEN.table, a = Number.isFinite(spreadDeg) ? spreadDeg : 0;
  if (a <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (a <= t[i][0]) { const [a0, v0] = t[i - 1], [a1, v1] = t[i]; return v0 + ((v1 - v0) * (a - a0)) / (a1 - a0); }
  }
  return t[t.length - 1][1];
}

/** `now` eased toward how open `spreadDeg` has her, over `dt` seconds (never past it). */
export function easeLegsOpen(now: number, spreadDeg: number, dt: number): number {
  const want = legsOpen(spreadDeg), step = LEGS_OPEN.perSecond * Math.max(0, Number.isFinite(dt) ? dt : 0);
  return Math.max(0, Math.min(1, now + Math.max(-step, Math.min(step, want - now))));
}
