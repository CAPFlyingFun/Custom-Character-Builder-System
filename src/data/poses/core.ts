/**
 * THE CORE SIXTEEN (his "Pose Reference -- 4x4 Core Set", shared 2026-11-26; not kept in the repo). Each pose is drawn
 * off its picture by eye -- the sheet's own table of angles is a rough start ("Angles are approximate starting values")
 * and where the two disagree the picture wins: 11 "Kneeling (Upright)" is pictured sitting back on her heels and is
 * written so. Every angle is GAME TUNING; the format is `actor/poseLibrary.ts`'s and its signs `actor/bodyAngles.ts`'.
 */
import type { PoseSpec } from '../../actor/poseLibrary';

const REF = 'core 4x4 sheet';

export const CORE_POSES: readonly PoseSpec[] = Object.freeze([
  {
    id: 'core-01-neutral', name: 'Neutral (relaxed stand)', sheet: 'core', ref: `${REF} 01`, tags: ['idle', 'baseline', 'clothing'], support: 'feet',
    angles: {
      armL: { raise: 15, toward: -12, elbow: 12 }, armR: { raise: 15, toward: -12, elbow: 12 },
      legL: { abduct: 2, twist: -6 }, legR: { abduct: 2, twist: -6 },
    },
    contacts: ['soleL', 'soleR'],
  },
  {
    id: 'core-02-hands-on-hips', name: 'Hands on hips', sheet: 'core', ref: `${REF} 02`, tags: ['idle', 'confident', 'clothing'], support: 'feet',
    angles: {
      armL: { reach: { at: 'hip', off: [0.08, 0.13, 0.0], elbow: [1, -0.1, -0.25] }, pronate: 40, wristFlex: -15 },
      armR: { reach: { at: 'hip', off: [0.08, 0.13, 0.0], elbow: [1, -0.1, -0.25] }, pronate: 40, wristFlex: -15 },
      legL: { abduct: 3, twist: -5 }, legR: { abduct: 3, twist: -5 },
    },
    contacts: ['soleL', 'soleR', 'palmL', 'palmR'],
  },
  {
    id: 'core-03-hand-behind-head', name: 'Hand behind head', sheet: 'core', ref: `${REF} 03`, tags: ['idle', 'relaxed', 'stretch'], support: 'feet',
    angles: {
      back: { side: 3 }, neck: { side: -7, flex: -3 },
      armL: { reach: { at: 'head', off: [0.02, 0.07, -0.11], elbow: [1, 0.9, 0.1] }, pronate: 20 },
      armR: { raise: 14, toward: 0, elbow: 18 },
      legL: { flex: 14, abduct: -6, twist: 12, knee: 32, ankle: -30 }, legR: { abduct: 2, twist: -4 },
    },
    contacts: ['soleR', 'toesL'],
  },
  {
    id: 'core-04-arms-crossed', name: 'Arms crossed', sheet: 'core', ref: `${REF} 04`, tags: ['idle', 'defensive', 'thinking'], support: 'feet',
    angles: {
      armL: { reach: { at: 'shoulderOther', off: [-0.02, -0.21, 0.17], elbow: [1, -1, 0.1] }, pronate: 20 },
      armR: { reach: { at: 'shoulderOther', off: [-0.02, -0.26, 0.11], elbow: [1, -1, 0.1] }, pronate: 20 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    bump: {
      armL: { reach: { at: 'shoulderOther', off: [-0.02, -0.17, 0.27], elbow: [1, -1, 0.1] }, pronate: 20 },
      armR: { reach: { at: 'shoulderOther', off: [-0.02, -0.22, 0.22], elbow: [1, -1, 0.1] }, pronate: 20 },
    },
    contacts: ['soleL', 'soleR'],
  },
  {
    id: 'core-05-thinking', name: 'Thinking (hand on chin)', sheet: 'core', ref: `${REF} 05`, tags: ['idle', 'thinking', 'talk'], support: 'feet',
    angles: {
      neck: { side: 5, flex: 3 },
      armR: { reach: { at: 'head', off: [0.02, -0.15, 0.1], elbow: [0.2, -1, 0.15] }, pronate: -40, wristFlex: -10 },
      armL: { reach: { at: 'elbowOther', off: [0.02, -0.05, 0.03], elbow: [1, -0.7, -0.2] }, pronate: 30 },
      legL: { abduct: 2, twist: -5 }, legR: { flex: 6, knee: 10, abduct: 0, twist: 4 },
    },
    contacts: ['soleL', 'soleR'],
  },
  {
    id: 'core-06-phone-at-ear', name: 'Phone (at ear)', sheet: 'core', ref: `${REF} 06`, tags: ['phone', 'talk'], support: 'feet',
    angles: {
      neck: { side: -6 },
      armR: { reach: { at: 'head', off: [0.09, -0.09, 0.02], elbow: [0.5, -1, 0.35] }, pronate: -20 },
      armL: { raise: 8, toward: 5, elbow: 12 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    contacts: ['soleL', 'soleR'], props: [{ kind: 'phone', hand: 'R' }],
  },
  {
    id: 'core-07-texting', name: 'Texting (both hands)', sheet: 'core', ref: `${REF} 07`, tags: ['phone', 'ui'], support: 'feet',
    angles: {
      back: { flex: 4 }, neck: { flex: 28 },
      armL: { reach: { at: 'chest', off: [0.05, -0.1, 0.3], elbow: [0.3, -1, -0.3] }, pronate: -50, wristFlex: -10 },
      armR: { reach: { at: 'chest', off: [0.05, -0.1, 0.3], elbow: [0.3, -1, -0.3] }, pronate: -50, wristFlex: -10 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    bump: {
      armL: { reach: { at: 'chest', off: [0.05, -0.06, 0.36], elbow: [0.3, -1, -0.3] }, pronate: -50, wristFlex: -10 },
      armR: { reach: { at: 'chest', off: [0.05, -0.06, 0.36], elbow: [0.3, -1, -0.3] }, pronate: -50, wristFlex: -10 },
    },
    contacts: ['soleL', 'soleR'], props: [{ kind: 'phone', hand: 'R' }],
  },
  {
    id: 'core-08-tablet-held', name: 'Tablet (held)', sheet: 'core', ref: `${REF} 08`, tags: ['tablet', 'work'], support: 'feet',
    angles: {
      neck: { side: 4 },
      armL: { raise: 18, toward: 45, elbow: 95, pronate: -30 },
      armR: { reach: { at: 'hipOther', off: [0.08, 0.16, 0.16], elbow: [1, -0.8, -0.2] }, pronate: 20 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    contacts: ['soleL', 'soleR'], props: [{ kind: 'tablet', hand: 'L' }],
  },
  {
    id: 'core-09-stool-legs-crossed', name: 'Sitting (legs crossed, stool)', sheet: 'core', ref: `${REF} 09`, tags: ['sit', 'talk'], support: 'seat', seat: 0.66,
    angles: {
      back: { flex: 6 },
      armR: { reach: { at: 'knee', off: [-0.02, 0.07, 0.02], elbow: [1, -1, -0.2] }, pronate: 70 },
      armL: { reach: { at: 'kneeOther', off: [0.05, 0.07, 0.0], elbow: [1, -1, -0.2] }, pronate: 70 },
      legR: { flex: 95, abduct: -16, twist: 6, knee: 95, ankle: -25 },
      legL: { flex: 80, abduct: 6, twist: -6, knee: 60, ankle: -5 },
    },
    bump: { legR: { flex: 85, abduct: -6, twist: 2, knee: 90, ankle: -25 } },
    contacts: ['seat', 'soleL'], props: [{ kind: 'stool' }],
  },
  {
    id: 'core-10-cross-legged', name: 'Sitting (cross-legged)', sheet: 'core', ref: `${REF} 10`, tags: ['sit', 'floor', 'rest'], support: 'floor',
    angles: {
      back: { flex: 6 }, neck: { flex: 4 },
      armL: { reach: { at: 'pelvis', off: [0.07, -0.04, 0.24], elbow: [1, -0.8, -0.3] }, pronate: 60 },
      armR: { reach: { at: 'pelvis', off: [0.07, -0.04, 0.24], elbow: [1, -0.8, -0.3] }, pronate: 60 },
      legL: { flex: 72, abduct: 40, twist: -45, knee: 135, ankle: -10 }, legR: { flex: 72, abduct: 40, twist: -45, knee: 135, ankle: -10 },
    },
    bump: { legL: { abduct: 46 }, legR: { abduct: 46 } },
    contacts: ['seat', 'kneeL', 'kneeR'],
  },
  {
    id: 'core-11-kneeling-on-heels', name: 'Kneeling (sitting on heels)', sheet: 'core', ref: `${REF} 11`, tags: ['kneel', 'floor', 'pregnancy'], support: 'floor',
    angles: {
      back: { flex: 2 },
      armL: { reach: { at: 'hip', off: [0.0, 0.03, 0.24], elbow: [0.3, -1, -0.4] }, pronate: 70 },
      armR: { reach: { at: 'hip', off: [0.0, 0.03, 0.24], elbow: [0.3, -1, -0.4] }, pronate: 70 },
      legL: { flex: 92, abduct: 3, knee: 155, ankle: -45 }, legR: { flex: 92, abduct: 3, knee: 155, ankle: -45 },
    },
    bump: { legL: { abduct: 20, twist: -10 }, legR: { abduct: 20, twist: -10 } },
    contacts: ['kneeL', 'kneeR', 'toesL', 'toesR'],
  },
  {
    id: 'core-12-all-fours', name: 'All fours (hands and knees)', sheet: 'core', ref: `${REF} 12`, tags: ['floor', 'crawl', 'exercise', 'pregnancy'], support: 'floor',
    body: { pitch: 90 },
    angles: {
      neck: { flex: -30 },
      armL: { raise: 90, toward: 90, elbow: 4, pronate: 90, wristFlex: -82 }, armR: { raise: 90, toward: 90, elbow: 4, pronate: 90, wristFlex: -82 },
      legL: { flex: 90, abduct: 3, knee: 90, ankle: -40 }, legR: { flex: 90, abduct: 3, knee: 90, ankle: -40 },
    },
    contacts: ['palmL', 'palmR', 'kneeL', 'kneeR', 'toesL', 'toesR'],
  },
  {
    id: 'core-13-childs-pose', name: "Child's pose (rest)", sheet: 'core', ref: `${REF} 13`, tags: ['floor', 'rest', 'yoga'], support: 'floor',
    body: { pitch: 70 },
    angles: {
      back: { flex: 35 }, neck: { flex: 20 },
      armL: { raise: 160, toward: 90, elbow: 8, pronate: 90 }, armR: { raise: 160, toward: 90, elbow: 8, pronate: 90 },
      legL: { flex: 140, abduct: 4, knee: 155, ankle: -45 }, legR: { flex: 140, abduct: 4, knee: 155, ankle: -45 },
    },
    bump: { legL: { flex: 125, abduct: 32, twist: -15 }, legR: { flex: 125, abduct: 32, twist: -15 } },
    contacts: ['kneeL', 'kneeR', 'toesL', 'toesR', 'forehead', 'palmL', 'palmR'],
  },
  {
    id: 'core-14-cobra', name: 'Cobra (stretch)', sheet: 'core', ref: `${REF} 14`, tags: ['floor', 'yoga', 'stretch'], support: 'floor',
    body: { pitch: 90 },
    angles: {
      back: { flex: -35 }, neck: { flex: -25 },
      armL: { raise: 52, toward: 90, elbow: 15, pronate: 90, wristFlex: -80 }, armR: { raise: 52, toward: 90, elbow: 15, pronate: 90, wristFlex: -80 },
      legL: { abduct: 4, ankle: -45 }, legR: { abduct: 4, ankle: -45 },
    },
    contacts: ['palmL', 'palmR', 'hips', 'toesL', 'toesR'],
    note: 'she lies on her front: not for late pregnancy (her bump would take her weight)',
  },
  {
    id: 'core-15-lunge', name: 'Lunge (forward)', sheet: 'core', ref: `${REF} 15`, tags: ['exercise', 'kneel', 'ready'], support: 'floor',
    angles: {
      back: { flex: 10 },
      armL: { reach: { at: 'knee', off: [0.0, 0.08, 0.02], elbow: [1, -1, -0.2] }, pronate: 70 },
      armR: { reach: { at: 'kneeOther', off: [0.04, 0.08, -0.02], elbow: [1, -1, -0.2] }, pronate: 70 },
      legL: { flex: 85, abduct: 6, knee: 92, ankle: 2 }, legR: { flex: -18, abduct: 4, knee: 100, ankle: -45 },
    },
    contacts: ['soleL', 'kneeR', 'toesR'],
  },
  {
    id: 'core-16-walking-key', name: 'Walking (key frame)', sheet: 'core', ref: `${REF} 16`, tags: ['walk', 'move'], support: 'feet',
    angles: {
      back: { twist: -4 },
      armR: { raise: 18, toward: 90, elbow: 25 }, armL: { raise: 16, toward: -90, elbow: 12 },
      legL: { flex: 22, knee: 6, ankle: 6 }, legR: { flex: -16, knee: 22, ankle: -24 },
    },
    contacts: ['heelL', 'toesR'],
  },
] satisfies readonly PoseSpec[]);
