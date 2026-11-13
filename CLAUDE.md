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
  force-push of `main`). Everything on `claude-work` goes with it: work on
  something else that he has not approved yet is switched off first, and
  said so (her opening's two unfinished changes: `OPENING_WIP`,
  `vulvaMesh.ts`, off since 2026-11-12).
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
- **A garment's cut is his drawing, and is drawn with her legs apart** (Joshua, 2026-11-12: "I draw how I want it
  to look like and your shape should be close"; "I think we need to design the bottom with the legs apart and when
  they close, should hopefully look right. We are doing it backwards"). A strap is one smooth curve in her groove
  ("the front strap isn't a smooth curve. It should naturally curve in her groove from her pelvis to her upper
  thigh/hips"): no corner where it leaves a panel. He draws on her own DRAWING SHEETS
  (`scripts/probe-body-sheets.mjs`: "so that way I can draw directly on her model so the proportions match exactly").
  His reference pictures and marked-up sheets never go in the repo.
- **Her bikini's top and bottom are one set, matched by default** (Joshua, 2026-11-12: "match up the bikini top and
  bottom together now and can use the default texture we have now in the builder under athletic fabric... just have
  them matching by default (sync)"). Both wear the pack's ATHLETIC knit in his red, their edging his black
  (`BIKINI_FABRIC`, `sarahLabTool.ts`): the bottom's edging layer, and the top's cords and the cord round each cup
  (`bikiniTrim`). The editor keeps the two in one fabric while TOP + BOTTOM MATCH is on (`fabricLibrary.matchSet`).
- Every number is labelled MEASURED, BIOLOGICAL SHAPE or GAME TUNING.
- No unrelated refactoring. Measure rather than assume: render and look.

## Garments painted on her skin

- A designed garment is an OUTLINE laid on her skin (`scripts/designAthleticBottom.mjs`) and kept as a FIELD in space
  round her (`public/models/paint/*-field.png`), looked up for each pixel at its own place on her skin
  (`fabricMaterial.ts`). Not a value per vertex and not a mask in her UV layout: both drew jagged in the room
  (MEASURED 2026-11-12 -- her shapes slide her skin's points along her skin by up to 15 mm beside an outline).
- It is laid, and looked up, on her skin IN THE POSE HE DREW IT IN: her legs apart (`designPose.ts`). At rest her
  crotch and the folds of her thighs are creases a field cannot tell the two sides of, and a line laid there drew
  kinked whenever her legs opened (MEASURED 2026-11-12). Her legs-apart places are MEASURED from the room
  (`scripts/probe-legs-apart.mjs` writes `scripts/data/sarah-v2-legs-apart.bin`; her hips and thighs only -- her arms
  hang beside them and a measurement of them does not repeat): after anything changes how the room draws LEGS APART,
  measure again, then run the design script, then build.
- Her shapes' slide is taken off before the look-up: her points' SLIP (`skinSlip.ts`), worked out over ALL of her
  skin's triangles, the area under her opening's patch among them (`fabricPanel.ts`'s `skinTriangles`), and taken
  through the pose's turn of her skin. It is her own shapes' alone: what her POSE does to her skin before her bones
  (the birth poses' shape fields, `POSE_SHAPE_FIELDS`) a garment rides, as it rides her bones.
- A drawing sheet's marks are carried back to her skin by its corner squares and `sheets.json` (the sheets' script),
  each to its pixel's own place on her legs-apart skin, as the room looks that pixel up.

## Her opening's area and her skin round it

- Her opening's rebuilt area (`vulvaMesh.ts`) is drawn in place of her own skin there, and every point of its edge is
  one of her own vertices: WHATEVER MOVES HER SKIN MOVES THAT EDGE THE SAME. Her springs move her skin in the shader
  (`softBody.ts`: her belly, her breasts, each thigh and calf), so her skin under the area keeps all of her legs'
  springs at the area's edge and less the further in, none `VULVA_OPEN.legSpringBand` in (`vulvaPatch.ts`
  `edgeShare`) -- her lips and the skin her doors stand on carry none -- and BOTH the area and her own skin drawn
  behind it take her springs through those numbers. Her legs' weights are packed into the breasts' channels and
  are read back before they are blended (`blendLegs`, `shareLegs`). Without them the edge stood still beside her
  thigh's skin and tore as she walked (Joshua, 2026-11-12: "When walking, there is taring on both thighs"; MEASURED
  8.5 mm apart): her far side seen through it under anything worn (her own skin is not drawn behind the area then),
  and bare, her own skin behind the area standing out through it in pale chips.
- After anything changes where the area's edge lies or what her springs weigh, measure her walking: the room's
  `springSeams` probe (MEASURED 2026-11-12, her thighs' springs at 9.5 and 10.0 mm: the area's edge 0.000 mm from her
  skin at all 189 of its points, the area within 0.011 mm of her skin behind it at all 6,191, and the copies along
  her own texture seams 0.008 mm apart).

## Verification

`npm run typecheck`, `npm test`, `npm run build`. Render probes are local
(Playwright + swiftshader, one browser at a time; never rebuild `dist` while
one runs). Kill a stray process by its PID only.

## Git

Commit trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
