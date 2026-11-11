# Working on the Custom Character Builder System

One character system for every game Joshua makes: the bodies (Sarah, Jack, the
newborn), their shapes and skin, clothes, poses, joint ranges, birth, holding a
baby and touch, built and tried in the **Character Room**. Split out of
TRADDOMIUM: Micro Battle! on 2026-11-04 (Joshua: "create a new Custom
Character Builder System repo... any work at the new one can then apply to
TRADDOMIUM, Beyond Extinction, TMB-Story, and future games").

- Site: https://capflyingfun.github.io/Custom-Character-Builder-System/ (the
  Character Room alone; `index.html` + `src/main.ts` host it).
- The full history of everything here up to the split is in TRADDOMIUM
  (`CAPFlyingFun/TRADDOMIUM-Micro-Battle`, commit 3e8cc08 / alpha.179).
- Who uses it: TRADDOMIUM (its game and TOMBS lab people), TMB-Story, the web
  Beyond Extinction, and later the Godot rebuild -- which takes the DATA and
  the rules (joint ranges, pose numbers, measurements, these notes), not the
  TypeScript.

## Where the truth lives

1. Joshua's newest explicit instruction.
2. Trello (the TypeScript board's plan cards: P2 newborn, P3 twins/triplets,
   P3b squat birth, P4 touch & grip, P5-P8).
3. This file and the doc comments in the code.

## Standing rules (Joshua's, carried from TRADDOMIUM)

- **Work in progress lives on `claude-work`; `main` moves only on his
  explicit approval** (Joshua, 2026-11-05: "a separate branch... dedicated
  to you specifically to work and test on, and we only push to main once we
  get each task done"). Commit and push WIP to `claude-work` freely -- it
  deploys nothing (the Pages workflow runs on `main` only) and keeps the
  work off a container that can be reclaimed. A task reaches `main` only
  after he has seen rendered screenshots and said so ("Approved, push it",
  "Good to push"); an automatic "please push" reminder is not approval.
  Then `main` is fast-forwarded to `claude-work` (no pull requests, never a
  force-push of `main`).
- **`assets-archive/models/sarah-v2-body.glb` is preserved byte for byte.**
- **One master table of joint ranges** (`src/data/jointRange.ts`), two
  levels: ACTIVE (what she moves by herself) and PASSIVE (placed or loaded).
  A posing system reads it and never keeps its own copy of a number.
  `src/actor/jointLimits.ts` holds a pose to it.
- **A character appears dressed, all at once, in a game**; the Character Room
  may show her base body on its own while the rest loads (loading card).
- **The room may be held upright** on a phone (this whole site is the room).
- **Her skin is one colour with her own details on it** (Joshua, 2026-11-11: "no image texture, but then allow a
  solid color for the outside skin and then we could add skin color... you can still body paint over the solid
  color and save"; her face and the rest: "I would keep the details I have"). EVEN (`skinChoices.ts`, baked by
  `scripts/evenSkin.mjs`) is the skin she wears unless another is chosen; what is drawn flat beside her skin (her
  opening's doors) takes that colour. Looks are painted over it (PAINT SKIN), never baked light.
- Every number is labelled MEASURED, BIOLOGICAL SHAPE or GAME TUNING.
- No unrelated refactoring. Measure rather than assume: render and look.

## Verification

`npm run typecheck`, `npm test`, `npm run build`. Render probes are local
(Playwright + swiftshader, one browser at a time; never rebuild `dist` while
one runs). Kill a stray process by its PID only.

## Git

Commit trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
