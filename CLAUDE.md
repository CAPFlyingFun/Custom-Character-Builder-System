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
- **The Character Builder holds what carries over to any game: stats and numbers, not game logic** (Joshua, 2026-11-13:
  "avoid adding a lot of technical game stuff in CCBS, keep it mainly stats and numbers. When we get to the actual game
  Repo (TRADDOMIUM Micro Battle), then we can take it further. For now, in CCBS, keep to starting and ending stats, the
  average real time drain of stuff like food, digestion, etc"; "CCBS is a Character builder not a real game... it should
  have stuff that can carry over easily"). The NPC brain's part here (P6) is where each need starts, where it ends and
  how fast it moves in real time, by age, sex, pregnancy and newborn, each number with its unit, kind and source. Who
  controls a character, a story director, objects that offer things and scenes are the game's, in the game's own repo.
- **One model on the menu, called what it is, and nothing on screen says "Sarah"** (Joshua, 2026-11-13: "disable all
  other models and call it like it's supposed to "Female Base Model", once we add in the Male model, can just add two
  buttons (Male/Female) model"; "let's remove the word Sarah and keep everything generic"; of where her belly starts:
  "probably should set at 0% by default"). The room opens on the FEMALE BASE MODEL: her approved body at 0%, not
  pregnant, in the room's first outfit, with no character named (`sarahLook.ts` `lookOpenedOn`, `PREGNANCY_OPENING`).
  MODEL is not shown while there is one model to choose (`sarahLabTool.ts` `SARAH_LAB_MODELS_OFF_MENU`, `modelsOnMenu`;
  `MODEL_NAMES` is what a model is called on screen): the bodies hers was built from stay in the list for a saved look
  made on one and for a probe (`?probe=cloth` steps to them), and are not fetched ahead (`NOT_AHEAD`). Names in the code
  and of files stay as they are (`sarahlab/`, `sarah-v2-body.glb`): it is what the room SHOWS that is generic.
  - A probe (`?probe=`), the story's bake (`?bake=story`) and `?look=sarah` still open on Sarah as he set her
    (`SARAH_LOOK`: 73%, pregnant, her red spandex tee): what was measured in the room was measured on her, and the
    story player's Sarah is baked from her.
  - A script waits for her by the status line's `data-model` (`[data-field="sarahlab-status"]`, `v2-body` once she is
    shown), never by its words: the words are for the screen and change.
  - A save that holds an outfit's old name ("Sarah · red raglan tee + charcoal leggings") still opens in that outfit
    (`outfitNamed`, `OUTFIT_FORMER_NAMES`). An outfit's card picture is of the base model as the room opens her
    (`scripts/bakeOutfitThumbs.mjs`): bake them again when what the room opens on changes.
- **A fault found is fixed, and he is told at once** (Joshua, 2026-11-13, of her thirst coming on twice too early: "if
  you see any future issues, please plan to automatically fix them and let me know so if I want to hold off, I can"): on
  `claude-work`, as a small change of its own with its test, and reported with what it changes so he can hold it.
  Measure before calling something a fault (her bowel looked slow over three days from her resting start and was right
  over two weeks: left as it was). `main` still moves only on his approval.
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

## Her sides under her arms

- Her sides hold still under her arms (Joshua, 2026-11-12: "make sure we can lock the skin from stretching especially if
  trying to paint"; of the ways the test showed him, "I'd do A", locked for good, the soft one): on her TRUNK below her
  armpits her arm's bones keep their share at her armpit's own height and lose it over the 2 cm under it, none from there
  down, and her raised-arm shapes (armRaiseL/R) fade the same (`scripts/sarahV2SideLock.mjs`, `SIDE_LOCK`: GAME TUNING). It
  is IN the room's body file and its KTX2 twin -- her skin, and the bikini top's lower strap, which takes the fade of her
  skin under it. The approved archive is as it was, and `tests/sarahV2SideLock.test.ts` holds the room's file to "the
  archive's numbers with the rule laid on them, and nothing else".
- MEASURED in the room (a line painted level at the strap's height, 1.244 m, with ARMS at 90, then her arms brought down):
  the line within 2.6 mm at every arm position (66.7 before); her skin under the strap 3.1 mm up with her arms level (46.3
  before). The bikini top's strap under her arms rose 50.5 mm with them (78.7 at the most) and now 0.8 (3.4): a level line.
- What it costs: a crease in the 2 cm under her armpit while her arms are raised, and the same under her BUILD -- a longer
  or shorter upper arm is taken up by the few edges at her armpit's apex (`tests/bodyBuildView.test.ts` pins it: the worst
  edge at +26 cm 6.36x before and 9.25x now, at -13 cm 2.96x and 5.90x; inside his 3.5x bar from -7 cm to +9 cm).
- Whatever is worn on her side has to move as her skin does there. Paint, cloth laid on her and parts made from her skin
  do; a part with weights of its own must take the lock (the script gives every part in her file the fade of the nearest
  point of her trunk's skin, evened along the part). The light tee's own file is left as it is: it stands off her side
  and rides up with her arms as a tee does (MEASURED in the script's header).
- A file that carries the lock is refused a second one. After anything writes her file again from the archive
  (`scripts/sarahV2Recovery/body-slim.mjs`) or rewrites her armpits' weights, lay it again; to lay it with other numbers,
  start from the file as it was before (git: 5b07495).

## A stroke held to a level

- The brushes can hold a stroke to a level (Joshua, 2026-11-12: "an option when painting to draw straight lines probably
  both either room level or body level"): LINE steps FREE, BODY LEVEL, ROOM LEVEL, in PAINT SKIN's brush and in the outfit
  editor's BODY PAINT (`levelLine.ts`, called by `skinPaint.ts` and `bodyPaint.ts`). BODY LEVEL is her own height as she
  stands -- on her STANDING SHAPE (`standingShape`: her points as she is built, before her bones pose her: her shape
  fields, her build's morphs and her belly's push, without her pose's shape fields and her motion's morphs,
  `MOTION_SHAPES`) -- so the line runs straight round her whatever pose she is painted in; ROOM LEVEL is her height in the
  room as she is posed, level with the floor. A dab lands ON the level -- where it crosses her triangles -- at its point
  nearest the finger on screen, not at the vertex under the finger.
- A held stroke is LAID ON THE SURFACE IT IS LEVEL ON (her standing shape, or her points in the room), not on her body
  file's rest shape (`fabricRest`) where the brushes otherwise work: the level is found there, and each dab chooses its
  texels (PAINT SKIN) or her vertices (BODY PAINT) by where they are there. The room does not draw her body file: her
  shapes carry her points by different amounts from one to the next (`skinSlip.ts`). MEASURED 2026-11-13 on her points
  read out of the room in her T-pose: her trunk's points within 2 mm of one height in her body file stand over 14.7 mm of
  the room's height at her under-bust and 25.7 mm across her belly; within 1 mm of one height on her standing shape, over
  1.9 mm at 0.95 m and at 0.80 m (the band itself is 2 mm), and over 4.4 to 6.1 mm in her STAND pose, which poses her
  trunk itself: the line is level on HER. The first build held BODY LEVEL to her body file's height: in the room's
  picture the line's middle ran over 38 pixels of height and its edges were torn; laid on her standing shape, 6 pixels in
  the same view, its band even.
- A stroke that starts within a finger's width of the last line carries it on at exactly its height (so a strap can be
  painted from several sides and meet itself); one that starts anywhere else starts a line of its own.
- After anything changes how the room shapes her before her bones (a new kind of shape field, a morph that is her pose's
  or her motion's), look at `standingSourceOf` and `MOTION_SHAPES`: her standing shape has to stay what she is standing.

## Her breath and her heartbeat

- Her skin breathes and her breath and heart follow what she does and the energy she has left (Joshua, 2026-11-13:
  "link up the outer skin to the lungs during breathing so the chest and belly would naturally move in and out per
  breath and synced to like stamina"). `actor/vitals.ts` (pure): ACTIVITY (rest, walk, jog, run, sprint) sets her effort,
  which lags it; above her threshold her ENERGY drains (a hard run empties her in about 14 minutes, her hardest in about
  5), easing off refills it; spent energy keeps her winded. Her breath grows first in size (to about half her vital
  capacity) then in rate; her heart from 70 to 206 - 0.88 x her age (Gulati 2010). Pregnant at term: a breath 40% bigger,
  2 more a minute, her heart 12 higher. Every number's source is in its comment.
- Her chest's share of each breath is MEASURED by how she lies (Bai et al. 2024: standing 59.5%, sitting 54.5%, on her
  back 43.2%, on her front 47.8%), constant with work (Aliverti 1997). Pregnancy moves it no one way in the research
  (Gilroy 1988: her rib cage takes the extra; LoMauro 2019: her diaphragm's share grows), so it is kept, and her lower
  ribs' widening in pregnancy is drawn instead (`breathFlare`). The room's CHEST button can fix it (50-80%).
- `sarahlab/breathSkin.ts`: her chest's front forward, its sides out (down to her lowest ribs at her sides), her belly's
  front forward; her back and her arms stay. Laid by where each point is in her rest frame (no attribute: her body has
  none left), in the vertex shader with her other soft moves (`patchJiggle`) and on the CPU the same (`breathAt` in
  `jiggleAt`), so what she wears and her paint ride it. Her trunk's width is measured from her own skin when her shape
  changes (`layBreathTable`, her arms' skin left out by their bones), and each move sweeps exactly its share of the air
  (`breathVolumes`; MEASURED in the room 2026-11-13: 690.9 mL breathed, 690.9 swept; a quiet breath at term moves her
  skin 6 mm at the most, a running breath 15 mm).
- Her lungs, heart and the organs under her diaphragm are drawn from her vitals (`ThoraxView.drive`).

## Her organs

- Her lungs, heart and diaphragm (`actor/thoracicOrgans.ts`); under her diaphragm her liver, gallbladder, spleen and
  pancreas, and her windpipe (`actor/upperOrgans.ts`, laid again with her diaphragm as she breathes; drawn by
  `thoraxView.ts`); her stomach, bowel, rectum and kidneys (`actor/abdominalOrgans.ts`); her womb, canal and bladder
  (`actor/pelvicOrgans.ts`), and her ovaries and tubes beside whichever womb she has (`actor/adnexa.ts`, drawn by
  `pelvicOrgansView.ts`).
- **Only under X-RAY** (Joshua, 2026-11-13: "all the organs and even skeleton doesn't have to actually render underneath
  the skin and be transparent... only with X-Ray mode will it all show up to help with performance"): her skeleton and
  her organs are not built until X-RAY is first used; with X-RAY at 0 none of them is drawn and none of them is stepped
  (her pelvic organs only while her skeleton's doors are in use).
- **Organ against organ** (Joshua, 2026-11-13, of her spleen pressing into her kidney and her pancreas laid low: "is it
  an easy fix?" -- "Yes."). Her own rib cage, measured on her bones, puts her diaphragm about a vertebra lower against
  her spine than a textbook's (the bottom of her breastbone is level with her T11/T12 disc), and the organs first laid
  from her landmarks alone did not fit under it. MEASURED 2026-11-13 at the end of a quiet breath out, before: her
  stomach's fundus 2.7 cm up through her diaphragm, 17% of it in her left lung; 43% of her right kidney inside her liver;
  18% of her spleen inside her left kidney, its foot below her lowest ribs; her liver up to 3.2 cm into her spine; her
  pancreas at her navel's height, two vertebrae low; 11% of her stomach in her colon. Now:
  - her liver lies in front of her spine and rests on her right kidney and her pancreas, its underside coming down beside
    them in a slope (`OFF_KIDNEYS.skirt`); her spleen is seated under her left dome's slope, in front of her left kidney's
    outer edge, within her ribs; her pancreas's neck is at her L1/L2 disc, level with her stomach's pylorus, in front of
    her kidneys; her kidneys are 2 cm lower, 6 mm nearer her spine and 6 mm further back; her colon's top is lower, its
    middle under her stomach (`ABDOMEN_PLACE`, `LIVER`, `SPLEEN`, `PANCREAS`: each number's reason is in its comment);
  - her stomach is one even turn from its fundus to its pylorus (a J: `ABDOMEN_PLACE.stomach`, `stomachLine`), flat front
    to back, its turn never tighter than its own half-size, and it is SET in place all of a piece (`tubeSetOff`,
    `tubeSetOffTube`, `tubeSetUnder`): pushed into place station by station its skin crumpled (79 of its edges folded
    back) and it held 5 to 16% less than its number. Now it holds its number to the millilitre and its skin has no fold;
  - what lies under her diaphragm is laid on what is already there -- her upper belly's organs on her kidneys (`layUpper`'s
    `kidneys`, `OFF_KIDNEYS`), her stomach and colon under and off them (`upperBelly`, `layAbdomen`'s `upper`) -- so
    another body is kept clear by the same rules;
  - what lies under her diaphragm rides its domes down all of a piece as she breathes in (`domeDrop`, `BREATH_RIDE`: her
    stomach, kidneys and the tops of her colon and her bowel with her liver, spleen and pancreas -- `abdomenView.ts`
    `ride`), so they keep their places against one another at every breath.
  `tests/upperOrgans.test.ts` holds it: none of her liver, gallbladder, spleen, pancreas, kidneys, stomach or colon lies in
  another, in her lungs or heart, up through her diaphragm, out through her ribs or in her spine, at a quiet breath out, a
  quiet breath in and her deepest breath (her gallbladder in its hollow in her liver excepted). After anything moves one
  of them, or her diaphragm, run it. MEASURED in the room 2026-11-13, her organs as drawn in her STAND pose (the
  `organsDrawn` probe), with no bump: none of them in another at a breath out and a breath in, but for her colon's
  bumps in her bowel (11 and 10 of its 576 points; 30 with her stomach full, which presses her colon down) -- her bowel
  is pressed down from above and does not yet bulge forward as her belly's skin does.
- **In a pregnancy** (Joshua, 2026-11-13: "go ahead and fix and do the last two things you mentioned"). v2's womb is a sac
  drawn rounder than a woman's womb -- its back stands through the front of her spine at every height -- so FOR HER ORGANS
  her womb's room is the sac IN FRONT OF A BACK WALL that leans forward off her spine from her promontory
  (`actor/pregnantWomb.ts` `WombWall`, `WOMB_WALL_SLOPE`; `sarahlab/wombRoom.ts`). Nothing of her womb, her baby or her
  belly is changed; the sac's see-through back, and her placenta on it, still overlap what lies behind the wall. Then:
  - her diaphragm is pushed up with her weeks, 4 cm at term (`DIAPHRAGM_RISE`, `vitals.ts` `diaphragmRise`): her lungs are
    shorter, and her heart, her liver, her spleen, her stomach and her colon's top go up with it;
  - her liver rests on her womb's top (`wombFloor`), her gallbladder on it further back, where there is room under her
    diaphragm (`bladderBack`), and her liver on her gallbladder (`liverOver`: ONE laying for what is drawn and for what her
    stomach and colon are set under; while her womb is low, exactly as with no womb). As she breathes in that seat gives
    with her diaphragm's drop, so what is under her diaphragm still rides it all of a piece (`layUpper`'s `seat`);
  - her colon has two ways round her womb (`layAbdomen`): over its top while it is low; once that would press it into her
    liver and her stomach, across her BEHIND the wall and under her stomach (`tubeBehindWall`) -- whichever leaves less
    of it in what is round it (`colonTrouble`). It changes way at one size of womb, between 50% and 73% of her bump: a
    jump, seen once as the slider passes it. Her caecum goes round her womb as before, up and to her side;
  - her bowel is packed behind the wall, and under her colon once that lies there (`packedIntestines`): by term a band
    about 4.5 cm tall and 2 cm deep -- flat, its loops kept on its face (`coiledMass`'s `relief`). A woman's goes up and to
    her sides as well; behind v2's womb there is no more room than that.
  `tests/upperOrgans.test.ts` ("her insides in a pregnancy") holds it. After anything changes her womb's shape, its wall,
  her diaphragm's rise or what lies under her diaphragm, run it and measure in the room again (her organs as drawn: the
  `organsDrawn` probe). MEASURED in the room 2026-11-13 at 25, 50, 73, 100, 150 and 200% of her bump at a breath out, at
  73 and 100% at a breath in, and at 100% at her hardest breath held in: none of them in another at 73% and at 100%
  breathed in; elsewhere a point or two -- from 100% up, at a breath out, one of her liver's 1,402 points in her left
  lung; at 100% one of her colon's 576 in her liver; at her hardest 6 of her left kidney's 270 in her colon, 3 mm --
  and at 25 and 50%, before her colon goes behind the wall, her bowel's bumps against it (2 and 18 points).
- **A full stomach** (the same instruction; then, of her whole belly moving out, Joshua, 2026-11-13: "leave the top
  fixed, but make the bottom part curve rounded... it tends to be down lower near her pelvis... like a smaller belly shape
  of around 40% on the belly slider with that side profile"): what her stomach holds beyond the room she has for it
  (`ABDOMEN_PLACE.stomachRoomMl`, 450 mL) her belly's skin gives for (`stomachGiveMl`, `bellyGive`), by a move of its own
  beside her breath's (`breathSkin.ts` `BREATH_SHAPE.full*`, `uBreathFull`; the room's `stepBreath` sizes it by its sweep,
  so what she wears and her paint ride it): low and round, its top held -- her own small bump's shape. MEASURED 2026-11-13
  off her skin, her 40% bump over her 0% belly: 62.4 mm forward at the most, 0.27 of the way up from the top of her pubic
  bone to the bottom of her breastbone, next to nothing by her breastbone (its numbers by height and across her are in
  `BREATH_SHAPE`'s comment; her 20% bump adds about 0.4 L to her belly and stands out 24 mm, her 40% 1.8 L and 63 mm).
  The move is within 0.04 of that shape above its most; below, it comes in to nothing at the top of her pubic bone (her
  bump carries her pubic area forward, a full belly does not). MEASURED in the room: 600 mL in her stomach, 150 mL swept
  and 5.1 mm at the most; a litre, 550 mL and 18.6 mm; a litre and a half, 1,050 mL and 35.5 mm -- at 0.96 m on her
  midline (the even move it replaced: 7.8 and 14.9 mm); with her bump at 40, 100 and 200% that litre and a half stands
  her belly out 36.1, 33.3 and 32.6 mm. So a full stomach is about her 20% bump and the most it holds about her 30%
  (Joshua, by eye, the same day: "about 20-30% belly size difference look right to me"). The sweep is the move's first
  order: her mesh really gains 3% more at a litre and 4% more at a litre and a half, her skin spreading as it stands
  out. `bellyGive` is the one number to turn down if it shows too much. NOT DONE: her stomach is still DRAWN no fuller
  than 450 mL. A litre in her own rib cage is a long J down to her navel that takes her colon down with it (tried
  2026-11-13 with its pylorus held and its depth kept to her belly's: set down all of a piece under her liver it sank
  8 cm and stood 2 cm out through her belly's skin) -- it wants a stem to its line, its fundus kept narrow in the notch
  between her liver's left tip and her ribs, and her colon laid under it.
- **What a breath step and a womb change cost** (X-RAY only): her liver is laid again about 22 times a breath in; its room
  over her kidneys, her pancreas and her womb is looked up some 5,000 times a laying, so those look-ups allocate nothing
  and work their reaches out once (`beanTop`'s `frame`, `tubeTopOf`). MEASURED 2026-11-13 on the build machine with a
  render running beside it: a laying 22 ms before, 8 ms now, over a womb as without; her belly's organs laid round a term
  womb 80 ms a change of womb (her stomach's fit behind the wall tries none of its forward run first).

## Her pregnancy as numbers

- **Three simple numbers and a baby counter, each one optional** (Joshua, 2026-11-13: "keep the numbers simple and easier
  to understand. The gameplay depending on the game, can then work with those numbers and adjust between them"; "Keep it
  optional, but still there like my example which can save stats per character... like now... just rename the beginning
  and end of it basically... and maybe a baby counter"). HER PREGNANCY, in the Body section (`pregnancy.ts`, kept with
  her body in her save): her BABY COUNTER (the pregnancies she has had before this one, by what each was: three small
  boxes, single / twins / triplets), her START BELLY (what WEEK 1 BELLY was), her BIGGEST BELLY and its week (DELIVERY
  BELLY, DELIVERY WEEK), her END BELLY after the birth (new: a number for a game -- nothing in the room is drawn from
  it), and under them the exact week for the belly she has now. A save's own names for them are the ones it always had
  (`firstWeekBump`, `deliveryBump`, `deliveryWeek`), with `afterBump` and `births` added. Stats and numbers: the room
  never picks her a week and never moves her between them.
- **THE RULE for a box left blank: every pregnancy adds its own amount to her belly for good** (`PREGNANCY_RULE`; his,
  as he corrected it the same evening: "I meant if a woman has triplets for example, she gains +20% to her starting
  number vs +10% for only one baby. Single: start 5%, birth 120%, end 15, 2nd birth 130%, end 25%, 3rd birth 140%, end
  35%. Twins: start 10%, birth 175%, end 25%, 2nd birth (single this time) 185%, end 35%. Triplets: start 20%, birth
  180%, end 40%, 2nd birth (single this time) 190%, end 50%... Single always adds +10% to belly size for pregnancy and
  after, twins +15%, and triplets +20%").
  - her START is what the pregnancies she has had added (from 0; a woman who began with more has it typed, and it is
    then where she last ended); her END is her START and what this one adds;
  - her BIGGEST in a first pregnancy is what its babies need -- one baby 120%, twins and triplets the chart's own 175%
    at week 37 and 180% at week 34 ("My rules on top") -- and each pregnancy after adds its own amount to her last
    (`baby.ts` `ruleBiggest`). It does NOT move with her START ("start 5%, birth 120%"). One baby after twins is 185%;
    twins after one baby are 185% too (their 175% and the 10% she had kept): his examples do not reach that one, and
    he passed it ("Looks good to me") -- it is the reading that gives the same number whichever came first;
  - what is typed wins (his Sarah: 15% -> 130% at week 41 -> 25%, her END the rule's from her typed START);
  - a week not typed is a game's to pick, a whole week from 38 to 42 for one baby (`pickDeliveryWeek`; 36-38 twins,
    33-35 triplets); the room draws her chart at the middle one;
  - after a birth a game puts one more of its kind on her counter (`bornTo`) and writes her START where she ended.
  All GAME TUNING; what was looked up behind it is in `PREGNANCY_RULE`'s comment.
- **Past the belly slider** (Joshua, 2026-11-13: "I guess anything past the 200% default slider will carry over into
  the extra depth slider which can go an additional +15%"). Her belly's SIZE is her belly slider's %, and once that is
  at its top what her Depth control adds (`bellySize`; `bellySetting` the other way, for a game): a size runs to 215%.
  Her BIGGEST is a size -- the rule's and a typed one run to 215% -- and the room reads her week at her size (`sized`).
  Below the slider's top her Depth is her shape, as it was, and not her size. GAME TUNING: his reckoning, a point of
  Depth for a point of size.
- **Her chart follows it** (`baby.ts` `herChart`): her belly reaches the chart's delivery week at her BIGGEST, so a
  first baby's 120% belly is week 40 and her 100% is week 35.3. The belly slider's "past full term" is past HER biggest
  (`bumpLine`).
- **No count is the chart, as it always was.** A save from before the counter has none (`births` null: the three boxes
  are blank and the line says "no baby count: the chart's own"), and keeps 0% -> 100% at week 40 for one baby. Sarah's
  look is one, so a probe, the story's bake, and everything MEASURED in the room before 2026-11-13 are on the chart.
  The room itself opens with her counter at none, on the rule; her counter's ↺ is no count again.
- MEASURED in the room 2026-11-13 (one page, a 430 x 932 screen). His three women read off the panel as he wrote them:
  one baby from a START of 5%, 120% and 15%, then 130% and 25%, then 140% and 35%; twins from 10%, 175% and 25%, then
  one baby 185% and 35%; triplets from 20%, 180% and 40%, then one baby 190% and 50%; and twins after one baby 185%.
  A first baby by the rule: her week 12 at 0%, 26 at 60%, 35.3 at 100%, 40 at 120%, 40.6 at 150%, 41.6 at 200%; his
  Sarah's numbers typed, 41 at 130%, and 32 typed for her 73% held; twins 37 at 175% and triplets 34 at 180%. Past
  the slider, with 210% her BIGGEST (two singles and triplets had): week 38.4 at the slider's 200%, and with her Depth
  at +10 "WEEK AT 210%" and week 40; at 190% her Depth at +15 changes nothing; a BIGGEST typed 400 is 215.
- MEASURED the same day, a first baby by the rule, her organs as drawn (the `organsDrawn` probe) at 60, 100, 120, 150
  and 200% at a breath out, and at 120% breathed in and at her hardest breath, with the same bellies measured with no
  count beside them: none in another at 100%, at 150% and at 120% breathed in; one of her liver's 1,402 points in her
  left lung at 120% and at 200% (the same one with no count); at her hardest breath at 120% a point or two of her
  colon, her bowel and her kidneys in one another and 9 of her left kidney's 270 in her colon, 3 mm (10 with no count);
  and at 60%, her week 26, her bowel's bumps against her colon (23 of its 736 points, 6 of her colon's 576) -- the
  contact the chart has at ITS week 26, her 50% (21 and 7), where her womb's top is at the same height to 0.1 mm
  (1.0887 and 1.0886 m): before her colon goes behind the wall, it is her week that says where her womb stands, and the
  rule reaches a week at a bigger belly. With no count her 60% is week 28.8, and clear. Her baby is never bigger for
  her belly by the rule than on the chart (the chart's % is at most her own: tested), and at full term it is drawn the
  same either way -- 51.0 cm, 3.46 kg, 1% smaller to fit -- on the chart at her 100% and by the rule at her 120%.
- After anything changes the rule, her chart or the panel: `tests/pregnancyRule.test.ts`, `tests/pregnantToggle.test.ts`.

## Kept on the device (the room as an app)

- **The site keeps its own files on the device, in stages** (Joshua, 2026-11-13: "what it should do, is load everything at
  one time and hold it locally especially if I have it saved as a PWA... It's about holding and loading the model, clothing,
  etc at once or in stages"). A service worker (`src/pwa/sw.ts`; all it decides is in `keeper.ts`) built into `sw.js` with
  the build's own list of files (`vite.config.ts` `keepOnDevice`), and a manifest and icons (`public/manifest.webmanifest`,
  `public/icons/`, drawn by `scripts/makeIcons.mjs`), so the room can be saved to a Home Screen as an app. The stages
  (`onDevice.ts`): the page and its code as the worker is installed; what she wears as the room loads it (on a device's
  first visit her files wait up to 2.5 s for the worker, so they are kept as they land and none is fetched twice); then
  everything else she can wear or be, fetched ahead once she is in and drawn, the small files first. The Library's last
  line says how far it is.
- MEASURED 2026-11-13 behind a stand-in for GitHub Pages (`scripts/probe-on-device.mjs`: Pages' cache headers, 20 Mbit/s,
  60 ms a request; the build machine draws with a software renderer, so its seconds compare builds and are not a
  phone's). v0.9.20, which kept nothing: a first visit 34.3 MB in 16 files; a visit again fetched her 15.45 MB body in
  full a second time (the browser's own cache had kept every small file and not the big one); with no internet she
  never appeared. Now: a first visit fetches 34.0 MB for the room, then 42.7 MB more ahead of need, and 77 MB is kept
  (46 files; "the whole room is saved here (42 files, 76 MB)"); a visit again, and the page loaded again in the same
  tab, fetch 0 MB (one question to the server: has the page changed); a turn of the screen and LIGHT / DARK ask for
  nothing, then as before; a new build (new code, one changed skin) fetches 1.2 MB, shows itself at once, and the old
  code and the old skin are gone from the device; with no internet she stands dressed. Her seconds to dressed there:
  24.7 on the first visit, 13.7 to 16.0 after.
- **What the worker answers with depends on what may change behind an address** (`keeper.ts` `kindOf`). The page is asked
  of the server first, past the browser's ten-minute copy, so a new build shows the moment it is live; the page kept
  here answers with no network, or none in 3 s. A file that can not change behind its address -- Vite's bundles, and a
  public file asked for with `?r=` its revision (`assetUrl`) -- is answered from the device and fetched once. Anything
  else of the site's is network first. So a public file has to be asked for through `assetUrl` to be kept for good.
- **What is kept is one build's.** The page kept is the one fetched when the worker was installed, with the bundles it
  names (a page naming other bundles is refused); files of an older build go only when a page of the worker's own build
  says hello (`tidy`), so a page still open from the build before keeps what it may yet ask for. Every
  capflyingfun.github.io site shares one cache store: this site's is `character-builder-kept-*`, and no other is read or
  removed. A cache store that fails costs only the keeping: every request still goes to the network.
- A public file the room does not ask for by itself is named in `NOT_AHEAD` (`keepList.ts`: the KTX2 pilot, the story
  bake, the Home Screen's own) and is not fetched ahead; a file not named there is. After adding a public file, think
  which it is.
- **The room says what a phone did to it** (the notice under her name, there only when it has something to say): "page
  loaded again ×N" (`countLoad`: the phone dropped the page and loaded it afresh, or it was loaded again by hand),
  "graphics restarted ×N" (below), "update ready: reopen". Nothing of what Joshua's phone does on a turn of the screen
  could be tried on the build machine: these lines are how his phone says which it was.
- After anything changes what is kept or how: `tests/keeper.test.ts`, `tests/onDevice.test.ts`, then the probe.

## On a phone

- **Her pictures and the phone's graphics memory** (Joshua, 2026-11-13, of her skin gone black when the screen was turned
  and turned back: "like it wasn't refreshing the skin texture on rotation... not sure if it could be a phone memory
  thing as well"). Not reproduced on the build machine by turning the screen. Reproduced by what a phone short of memory
  does: its graphics taken away and given back WITH HER DECODED PICTURES DROPPED (`lostPictures.ts`: a model file's
  pictures are handed to the 3D library already decoded, and a phone keeps a decoded picture with its graphics) -- her
  normal map and roughness gone, her skin drew dark and mottled. Now, a moment after the graphics are back
  (`reviveGraphics`), every picture in the room is looked at (`pictureLost`), each one dropped is decoded again from the
  model file it came in (`assets.ts` `redecodePictures`: the file comes off the device; the picture's place in graphics
  memory is let go first, or a fresh picture can not be poured into it), and the skin she wears, when it is one fetched
  for her, is fetched and laid afresh. MEASURED in the room: her skin right again, nothing asked of the network, the
  notice "graphics restarted ×1 (2 of her pictures decoded again)". A picture with no file here to come from (one of his
  own laid on her, a painting not saved) can not be brought back: the notice says so.
- **The file's own skin is not left in graphics memory when another is put on** (`applySkin` `wear`). MEASURED 2026-11-13
  in the room, counted where the graphics make and let go of each picture (a JS-side count of what her materials name
  had said 87 MB with the file's own skin among it: wrong both ways): opened in EVEN she holds 172 MB of textures in 18,
  and the file's own skin is not among them (a picture is taken into graphics memory the first time it is drawn); once
  ORIGINAL had been worn and EVEN put back, its 21.3 MB stayed -- 193 MB in 19. Now 172 MB whichever she has worn.
- **A FINDING, NOT YET ACTED ON**: more than half of those 172 MB is not pictures. The 3D library keeps a mesh's morphs
  as one table of 32-bit numbers: the room's largest is 8192 x 29 x 20, 72.5 MB, and a second is 15 MB -- against 43 MB
  for her skin and her normal map together.
- **The finger's target on the stage's small buttons is bigger than the button looks** (Joshua, 2026-11-13: "it's hard to
  press certain buttons like (LIGHT/DARK) like it's glitching or lagging"; `studioLayout.ts` `PILL_REACH`). MEASURED: the
  press itself costs 3 to 8 ms and fetches nothing; the button was 34 px tall in 3 px of glass, and a touch on that
  glass or just past it turned her instead. Each button now answers 9 px above and below its box (52 px), and the stage
  leaves a touch on a pill's glass alone. MEASURED in the room: every button's own box is its own at all 25 points
  tried, and a real touch 2 px above LIGHT/DARK and 6 px below it both change the theme.

## Verification

`npm run typecheck`, `npm test`, `npm run build`. Render probes are local
(Playwright + swiftshader, one browser at a time; never rebuild `dist` while
one runs). Kill a stray process by its PID only.

**One preview, one page** (Joshua, 2026-11-13: "When you check how things look,
keep one local preview running while you work and reuse the same browser page
for all your screenshots instead of reloading or restarting for each one. Only
screenshot the parts that changed. Shut the preview down when you're done").
Open the room once and drive that page for every reading and picture of a piece
of work; load it again only when `dist` has been built again; picture the panel
or the part of her that changed, not the whole screen each time; and close the
browser and the preview when the work is done. A software renderer's frame
costs by the pixel and the page answers between frames: read and measure at 1x,
and draw at a phone's 2x only for the pictures a person will see.

## Git

Commit trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
