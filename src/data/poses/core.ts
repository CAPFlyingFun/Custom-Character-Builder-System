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
      armL: { reach: { at: 'hip', off: [0.077, 0.17, 0.0], hand: [0, -0.25, 1], palm: [-1, 0, 0], elbow: [1, 0, -0.4] }, fingers: 0.15 },
      armR: { reach: { at: 'hip', off: [0.077, 0.17, 0.0], hand: [0, -0.25, 1], palm: [-1, 0, 0], elbow: [1, 0, -0.4] }, fingers: 0.15 },
      legL: { abduct: 3, twist: -5 }, legR: { abduct: 3, twist: -5 },
    },
    bump: {
      armL: { reach: { at: 'hip', off: [0.093, 0.17, -0.01], hand: [0, -0.25, 1], palm: [-1, 0, 0], elbow: [1, 0, -0.4] } },
      armR: { reach: { at: 'hip', off: [0.093, 0.17, -0.01], hand: [0, -0.25, 1], palm: [-1, 0, 0], elbow: [1, 0, -0.4] } },
    },
    contacts: ['soleL', 'soleR', 'palmL', 'palmR'],
  },
  {
    id: 'core-03-hand-behind-head', name: 'Hand behind head', sheet: 'core', ref: `${REF} 03`, tags: ['idle', 'relaxed', 'stretch'], support: 'feet',
    angles: {
      back: { side: 3 }, neck: { side: -7, flex: -3 },
      armL: { reach: { at: 'head', off: [0.0, 0.07, -0.16], hand: [-1, 0.3, 0], palm: [0, 0, 1], elbow: [1, 0.7, 0] }, fingers: 0.3 },
      armR: { raise: 16, toward: -10, elbow: 18, fingers: 0.2 },
      legL: { flex: 14, abduct: -6, twist: 12, knee: 32, ankle: 5 }, legR: { abduct: 2, twist: -4 },
    },
    contacts: ['soleR', 'toesL'],
  },
  {
    id: 'core-04-arms-crossed', name: 'Arms crossed', sheet: 'core', ref: `${REF} 04`, tags: ['idle', 'defensive', 'thinking'], support: 'feet',
    angles: {
      armL: { reach: { at: 'shoulderOther', off: [0.04, -0.24, 0.27], hand: [-0.8, 0.1, -0.5], palm: [0, 0, -1], elbow: [1, -1, 0.4] }, fingers: 0.35 },
      armR: { reach: { at: 'shoulderOther', off: [0.04, -0.31, 0.21], hand: [-0.8, 0, -0.5], palm: [0, 0, -1], elbow: [1, -1, 0.4] }, fingers: 0.35 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    bump: {
      armL: { reach: { at: 'shoulderOther', off: [0.04, -0.22, 0.35], hand: [-0.8, 0.1, -0.5], palm: [0, 0, -1], elbow: [1, -1, 0.4] } },
      armR: { reach: { at: 'shoulderOther', off: [0.04, -0.29, 0.30], hand: [-0.8, 0, -0.5], palm: [0, 0, -1], elbow: [1, -1, 0.4] } },
    },
    contacts: ['soleL', 'soleR'],
  },
  {
    id: 'core-05-thinking', name: 'Thinking (hand on chin)', sheet: 'core', ref: `${REF} 05`, tags: ['idle', 'thinking', 'talk'], support: 'feet',
    angles: {
      neck: { side: 5, flex: 3 },
      armR: { reach: { at: 'head', off: [0.01, -0.16, 0.08], hand: [0, 1, 0.3], palm: [-0.3, 0, -1], elbow: [0.4, -1, 1] }, fingers: 0.6 },
      armL: { reach: { at: 'chest', off: [-0.08, -0.17, 0.2], hand: [-1, 0, 0.1], palm: [0, 1, 0], elbow: [0.6, -0.8, 0.6] }, fingers: 0.4 },
      legL: { abduct: 2, twist: -5 }, legR: { flex: 6, knee: 10, abduct: 0, twist: 4 },
    },
    bump: {
      armR: { reach: { at: 'head', off: [0.01, -0.16, 0.1], hand: [0, 1, 0.3], palm: [-0.3, 0, -1], elbow: [0.5, -1, 1.1] } },
      armL: { reach: { at: 'chest', off: [-0.08, -0.15, 0.28], hand: [-1, 0, 0.1], palm: [0, 1, 0], elbow: [0.7, -0.6, 0.8] } },
    },
    contacts: ['soleL', 'soleR'],
  },
  {
    id: 'core-06-phone-at-ear', name: 'Phone (at ear)', sheet: 'core', ref: `${REF} 06`, tags: ['phone', 'talk'], support: 'feet',
    angles: {
      neck: { side: -6 },
      armR: { reach: { at: 'head', off: [0.125, -0.01, 0.0], hand: [0, 1, 0.15], palm: [-1, 0, 0], elbow: [0.4, -1, 0.5] }, fingers: 0.4 },
      armL: { raise: 15, toward: -12, elbow: 14, fingers: 0.2 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    contacts: ['soleL', 'soleR'], props: [{ kind: 'phone', hand: 'R' }],
  },
  {
    id: 'core-07-texting', name: 'Texting (both hands)', sheet: 'core', ref: `${REF} 07`, tags: ['phone', 'ui'], support: 'feet',
    angles: {
      back: { flex: 4 }, neck: { flex: 28 },
      armL: { reach: { at: 'chest', off: [0.04, -0.1, 0.3], hand: [-0.3, 0.3, 1], palm: [-0.5, 1, 0], elbow: [0.3, -1, -0.3] }, fingers: 0.3 },
      armR: { reach: { at: 'chest', off: [0.04, -0.1, 0.3], hand: [-0.3, 0.3, 1], palm: [-0.5, 1, 0], elbow: [0.3, -1, -0.3] }, fingers: 0.3 },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    bump: {
      armL: { reach: { at: 'chest', off: [0.05, -0.05, 0.38], hand: [-0.3, 0.3, 1], palm: [-0.5, 1, 0], elbow: [0.5, -1, -0.2] } },
      armR: { reach: { at: 'chest', off: [0.05, -0.05, 0.38], hand: [-0.3, 0.3, 1], palm: [-0.5, 1, 0], elbow: [0.5, -1, -0.2] } },
    },
    contacts: ['soleL', 'soleR'], props: [{ kind: 'phone', hand: 'R' }],
  },
  {
    id: 'core-08-tablet-held', name: 'Tablet (held)', sheet: 'core', ref: `${REF} 08`, tags: ['tablet', 'work'], support: 'feet',
    angles: {
      neck: { side: 4 },
      armL: { reach: { at: 'hip', off: [0.085, 0.1, 0.11], hand: [0, 0.3, 1], palm: [-1, 0, 0], elbow: [1, -1, -0.3] } },
      armR: { reach: { at: 'hipOther', off: [0.04, 0.18, 0.24], hand: [-1, 0.2, 0.2], palm: [0, 0, -1], elbow: [0.7, -0.7, 0.7] } },
      legL: { abduct: 2, twist: -5 }, legR: { abduct: 2, twist: -5 },
    },
    bump: {
      armL: { reach: { at: 'hip', off: [0.11, 0.1, 0.17], hand: [0, 0.3, 1], palm: [-1, 0, 0], elbow: [1, -1, -0.3] } },
      armR: { reach: { at: 'hipOther', off: [0.04, 0.22, 0.42], hand: [-1, 0.2, 0.2], palm: [0, 0, -1], elbow: [0.7, -0.7, 0.9] } },
    },
    contacts: ['soleL', 'soleR'], props: [{ kind: 'tablet', hand: 'L' }],
  },
  {
    id: 'core-09-stool-legs-crossed', name: 'Sitting (legs crossed, stool)', sheet: 'core', ref: `${REF} 09`, tags: ['sit', 'talk'], support: 'seat', seat: 0.56,
    angles: {
      back: { flex: 6 },
      armR: { reach: { at: 'knee', off: [0.0, 0.08, -0.02], hand: [-0.3, -0.3, 1], palm: [0, -1, 0], elbow: [1.4, -1, 0.2] } },
      armL: { reach: { at: 'kneeOther', off: [0.03, 0.15, -0.05], hand: [-1, -0.2, 0.5], palm: [0, -1, 0], elbow: [1.4, -1, 0.2] } },
      legR: { flex: 95, abduct: -16, twist: 6, knee: 95, ankle: -25 },
      legL: { flex: 55, abduct: 6, twist: -6, knee: 60, ankle: -25 },
    },
    // at her 200% bump her legs are not crossed over it: knees apart, a hand on each
    bump: {
      armL: { reach: { at: 'knee', off: [0.0, 0.08, -0.02], hand: [0.3, -0.3, 1], palm: [0, -1, 0], elbow: [1.6, -1, 0.3] } },
      armR: { reach: { at: 'knee', off: [0.0, 0.08, -0.02], hand: [0.3, -0.3, 1], palm: [0, -1, 0], elbow: [1.6, -1, 0.3] } },
      legL: { flex: 75, abduct: 20, twist: -5, knee: 85, ankle: -15 }, legR: { flex: 75, abduct: 30, twist: -5, knee: 85, ankle: -15 },
    },
    contacts: ['seat', 'soleL'], props: [{ kind: 'stool' }],
  },
  {
    id: 'core-10-cross-legged', name: 'Sitting (cross-legged)', sheet: 'core', ref: `${REF} 10`, tags: ['sit', 'floor', 'rest'], support: 'floor',
    angles: {
      back: { flex: 6 }, neck: { flex: 4 },
      armL: { reach: { at: 'knee', off: [-0.02, 0.07, 0.0], hand: [0.3, -0.3, 1], palm: [0, -1, 0], elbow: [1, -0.8, -0.3] } },
      armR: { reach: { at: 'knee', off: [-0.02, 0.07, 0.0], hand: [0.3, -0.3, 1], palm: [0, -1, 0], elbow: [1, -0.8, -0.3] } },
      legL: { flex: 50, abduct: 32, twist: -55, knee: 142, ankle: -10 }, legR: { flex: 50, abduct: 32, twist: -55, knee: 142, ankle: -10 },
    },
    bump: { legL: { abduct: 42 }, legR: { abduct: 42 } },
    contacts: ['seat', 'kneeL', 'kneeR'],
  },
  {
    id: 'core-11-kneeling-on-heels', name: 'Kneeling (sitting on heels)', sheet: 'core', ref: `${REF} 11`, tags: ['kneel', 'floor', 'pregnancy'], support: 'floor',
    angles: {
      back: { flex: 2 },
      armL: { reach: { at: 'hip', off: [0.03, -0.03, 0.31], hand: [0, -0.5, 1], palm: [0, -1, 0], elbow: [1.2, -1, 0] }, fingers: 0.2 },
      armR: { reach: { at: 'hip', off: [0.03, -0.03, 0.31], hand: [0, -0.5, 1], palm: [0, -1, 0], elbow: [1.2, -1, 0] }, fingers: 0.2 },
      legL: { flex: 52, abduct: 3, knee: 142, ankle: -53 }, legR: { flex: 52, abduct: 3, knee: 142, ankle: -53 },
    },
    bump: {
      armL: { reach: { at: 'hip', off: [0.07, -0.03, 0.34], hand: [0, -0.5, 1], palm: [0, -1, 0], elbow: [1.2, -1, 0] } },
      armR: { reach: { at: 'hip', off: [0.07, -0.03, 0.34], hand: [0, -0.5, 1], palm: [0, -1, 0], elbow: [1.2, -1, 0] } },
      legL: { abduct: 20, twist: 5 }, legR: { abduct: 20, twist: 5 },
    },
    contacts: ['kneeL', 'kneeR', 'toesL', 'toesR'],
  },
  {
    id: 'core-12-all-fours', name: 'All fours (hands and knees)', sheet: 'core', ref: `${REF} 12`, tags: ['floor', 'crawl', 'exercise', 'pregnancy'], support: 'floor',
    body: { pitch: 80 },
    angles: {
      neck: { flex: -40 },
      armL: { raise: 80, toward: 90, elbow: 4, pronate: 90, wristFlex: -80, fingers: 0.1 }, armR: { raise: 80, toward: 90, elbow: 4, pronate: 90, wristFlex: -80, fingers: 0.1 },
      legL: { flex: 80, abduct: 3, knee: 90, ankle: -55 }, legR: { flex: 80, abduct: 3, knee: 90, ankle: -55 },
    },
    bump: { legL: { abduct: 18 }, legR: { abduct: 18 } },
    contacts: ['palmL', 'palmR', 'kneeL', 'kneeR', 'toesL', 'toesR'],
  },
  {
    id: 'core-13-childs-pose', name: "Child's pose (rest)", sheet: 'core', ref: `${REF} 13`, tags: ['floor', 'rest', 'yoga'], support: 'floor',
    body: { pitch: 69 },
    angles: {
      back: { flex: 55 }, neck: { flex: 25 },
      armL: { raise: 174, toward: 90, elbow: 8, pronate: 90, fingers: 0.1 }, armR: { raise: 174, toward: 90, elbow: 8, pronate: 90, fingers: 0.1 },
      legL: { flex: 122, abduct: 4, knee: 142, ankle: -55 }, legR: { flex: 122, abduct: 4, knee: 142, ankle: -55 },
    },
    // at her 200% bump her bump on the floor would hold her knees 14 cm off it (MEASURED, the preview): she kneels wide and
    // leans forward onto her knees -- fitted with her knees and toes on the floor (`--fit`; her palms can not reach it there)
    bump: {
      back: { flex: 12 }, neck: { flex: 5 },
      armL: { reach: { at: 'knee', off: [0.0, 0.08, 0.02], hand: [0, -0.3, 1], palm: [0, -1, 0], elbow: [1, -1, -0.2] }, fingers: 0.2 },
      armR: { reach: { at: 'knee', off: [0.0, 0.08, 0.02], hand: [0, -0.3, 1], palm: [0, -1, 0], elbow: [1, -1, -0.2] }, fingers: 0.2 },
      legL: { flex: 89, abduct: 35, twist: -38 }, legR: { flex: 89, abduct: 35, twist: -38 },
    },
    bumpBody: { pitch: 48 },
    contacts: ['kneeL', 'kneeR', 'toesL', 'toesR', 'forehead', 'palmL', 'palmR'],
    note: 'from her 100% bump she kneels wide and leans forward onto her knees (her bump would hold her off the floor)',
  },
  {
    id: 'core-14-cobra', name: 'Cobra (stretch)', sheet: 'core', ref: `${REF} 14`, tags: ['floor', 'yoga', 'stretch'], support: 'floor',
    body: { pitch: 72 },
    angles: {
      back: { flex: -25 }, neck: { flex: -30 },
      armL: { raise: 30, toward: 70, elbow: 66, pronate: 90, wristFlex: -70, fingers: 0.1 }, armR: { raise: 30, toward: 70, elbow: 66, pronate: 90, wristFlex: -70, fingers: 0.1 },
      legL: { flex: -9, abduct: 4, ankle: -55 }, legR: { flex: -9, abduct: 4, ankle: -55 },
    },
    contacts: ['palmL', 'palmR', 'hips', 'toesL', 'toesR'],
    note: 'she lies on her front: not for late pregnancy (her bump would take her weight)',
  },
  {
    id: 'core-15-lunge', name: 'Lunge (forward)', sheet: 'core', ref: `${REF} 15`, tags: ['exercise', 'kneel', 'ready'], support: 'floor',
    angles: {
      back: { flex: 10 },
      armL: { reach: { at: 'knee', off: [0.0, 0.085, -0.01], hand: [0.2, -0.3, 1], palm: [0, -1, 0], elbow: [1, -1, -0.2] }, fingers: 0.4 },
      armR: { reach: { at: 'kneeOther', off: [0.03, 0.13, -0.05], hand: [-1, -0.2, 0.6], palm: [0, -1, 0], elbow: [1.5, -1, 0.3] }, fingers: 0.4 },
      legL: { flex: 105, abduct: 10, knee: 77, ankle: 2 }, legR: { flex: -18, abduct: 4, knee: 63, ankle: -62 },
    },
    bump: {
      // fitted at her 200% bump (`--fit`): her front foot, back knee and toes on the floor
      legL: { flex: 115, abduct: 42, knee: 89 }, legR: { flex: -24, knee: 67 },
      // her right hand on her own hip: across her 200% bump it went 6 cm into it
      armR: { reach: { at: 'hip', off: [0.09, 0.02, 0.1], hand: [0, -0.6, 0.8], palm: [-1, 0, 0], elbow: [1, -1, -0.2] }, fingers: 0.4 },
    },
    contacts: ['soleL', 'kneeR', 'toesR'],
  },
  {
    id: 'core-16-walking-key', name: 'Walking (key frame)', sheet: 'core', ref: `${REF} 16`, tags: ['walk', 'move'], support: 'feet',
    angles: {
      back: { twist: -4 },
      armR: { raise: 20, toward: 55, elbow: 25 }, armL: { raise: 20, toward: -40, elbow: 12 },
      legL: { flex: 22, knee: 6, ankle: 6 }, legR: { flex: -16, knee: 22, ankle: -24 },
    },
    contacts: ['heelL', 'toesR'],
  },
] satisfies readonly PoseSpec[]);
