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
- **A character appears dressed, all at once** -- in a game, and in the Character Room as it opens (Joshua,
  2026-11-16: "make sure it doesn't show until the clothes load. Right now it shows when the body loads but clothes
  are half loaded"): the room draws her behind a cover until she is dressed ("Settings", below).

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
  A reference picture he shares may be kept in the repo WHILE WHAT IT SHOWS IS BEING BUILT, and is taken out once it
  is (`docs/reference/`; Joshua, 2026-11-14: "I don't mind if reference images are on the Repo while building it
  especially on your branch, but anything I share with visible watermarks, I would pass on them" -- until then they
  never went in). Never one with a visible watermark, and never his marked-up sheets of her bare body.
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
  `MODEL_NAMES` is what a model is called on screen). THE BODIES HERS WAS BUILT FROM ARE GONE (Joshua, 2026-11-19:
  "delete all the other female models we aren't using so in the end should be x1 (skeleton, male, female) model with the
  skeleton being used in both"): v1, v2, v2-arms, the first `sarah.glb`, the non-pregnant Meshy female and Meshy's male
  original are out of the site and the archive (git has them); a save made on one opens on her body. What stays: her
  approved archive `sarah-v2-body.glb` (byte for byte, below), the room's body made from it with its parts (its shape
  files, its light skin, its KTX2 pilot for a phone), her bare skeleton (`sarah-skeleton.glb`, the ONE skeleton, from
  `meshy-female-skeleton.glb`), the story's bake, and THE MALE BASE MODEL's file, `male-base-touched.glb` (his touched
  one, "2", chosen over Meshy's original). Names in the code
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

## A picture of his own on a piece, and exporting characters

- **UPLOAD IMAGE is in the fabric section of the piece selected** (Joshua, 2026-11-19: "why I can't upload my own textures
  to replace the default textures/solid color? It asks where the texture goes, but it should be for that top/bottom,
  etc… and what's selected"; "I tried loading and nothing happens"). The old TEXTURE · custom image panel
  (`garmentTexturePanel.ts`, taken out) chose among the old modelled garments by name: nothing she wears now is one, so
  an upload found nothing, and choosing in it could put an old modelled outfit on her. Now a picture is a FABRIC CHOICE
  of the selected piece (`FabricPick.image`, its family FLAT): painted tops and bottoms and the cloth tee wear it, tiled
  `IMAGE_TILE_CM` (25 cm, GAME TUNING) at STITCH 1; a family, a swatch or a colour picked after puts it back. Skirts are
  one flat colour still and do not wear it ("The skirts": NOT DONE).
- **It is kept on the device** (Joshua: "Kept with you save a character (held locally in the PWA)"): `pictureStore.ts`,
  the browser's own database, by an id made from the picture's bytes (made no larger than 1024 a side first). A save
  holds the id alone.
- **EXPORT… chooses one, several or all characters** (Joshua: "you can select 1, multiple, or all"; "modify the output to
  a zip with JSON + image if a custom image was used"): `characterExport.ts`. The shared outfits a chosen character's
  clothes are based on go with her, or every shared outfit; with no picture of his own it is the .json it always was,
  with one a .zip of `characters.json` and `pictures/<id>.<ext>`. IMPORT takes either.
- MEASURED in the room 2026-11-19 (light skin, a phone 430 x 932 at 2x, touch): a picture put on the cloth tee and on the
  painted leggings by UPLOAD IMAGE; the character saved, the page loaded again and she loaded back in it; exported as a
  .zip (the .json and the picture); imported into a fresh browser and loaded in it. No error on the page.
- After anything changes it: `tests/characterExport.test.ts`, `tests/characterSaves.test.ts`, `tests/sarahLabFabric.test.ts`.

## Six paint layers, and their order

- **SIX LAYERS** (Joshua, 2026-11-19: "we have a 3 layers, and can we actually raise that amount up to 6 layers? Will be
  better in games to have more layer to make more complex outfits"; `bodyPaint.PAINT_LAYER_COUNT`). Her skin's vertex
  shader has every attribute a phone gives it (16 of 16, MEASURED in the room), so the six weights ride the one vec3
  `fabricPaint` the three had, TWO TO A NUMBER in 255ths (`packPaint`; layer c and c + 3), unpacked at each vertex
  before they are spread over her triangles (`fabricMaterial.ts`). The weights themselves are kept six a vertex on her
  geometry (`BodyPaint.weights`, `userData.paintWeights`). WHATEVER ELSE READS THE ATTRIBUTE READS IT THROUGH
  `paintAt` (her opening's area, `vulvaMesh.ts` `samplePaintInto`; the story bake's `paintSplit`; a probe). Her
  skin's program's texture units, its fragment stage: 10 of a phone's 16 with three layers, 13 with six (MEASURED: its
  samplers listed at link); a layer not worn is skipped on its uniform. Saves held up to 8 layers already.
- **THEIR ORDER IS HIS TO SET** (Joshua, 2026-11-19: "make each layer adjustable so you can like place above or below
  another layer and maybe set layer 1 as way top and 6 as bottom, and then you can drag or press an arrow to move
  them"). On screen LAYER 1 is the top -- drawn over all the others -- and 6 the bottom (layer index 5 is L1); the
  pieces are listed top first (`TOP · L3 …`), and a paint piece selected shows `LAYER n of 6 · 1 is on top` with ▲ UP and
  ▼ DOWN (`fabricPanel` `moveLayer`; `BodyPaint.swapLayers` swaps the two layers' weights and UNDO's steps for them;
  its template, fabric and detail go with it, and a drawn bottom's band is worked out again). A piece moves into an
  empty layer as well. Arrows, not dragging: a drag in that row scrolls it on a phone.
- MEASURED in the room 2026-11-19 (light skin): the pencil skirt's outfit with knee socks, a sports bra and a tank added
  as layers 4 to 6, each drawn; the tank moved under the crop tee and back by the arrows, drawn so each time.
- `tests/paintLayers.test.ts`.

## A painted top, drawn

- **A shirt's cut is DRAWN, not painted per vertex** (Joshua, 2026-11-14: "fix the painted clothes and add smooth edges,
  shirt collars/sleeves like how you did the bikini bottom"; of his sheet of sixteen tops: "Hopefully these will help to
  get started and have more than our list"). A top with a neck opening, a level hem and no straps (`topCut.ts`
  `isCutTop`: the sleeveless shirt, the crew, U, V, scoop and square tees, the ringer, the 3/4 and the long sleeve) is
  one paint layer whose edge the shader draws for each pixel (`fabricMaterial.ts` `FabricLayer.cut`):
  - its NECK OPENING's rim is two drawings, from her front and from her back, on her rest shape: a picture about the
    base of her neck, 1.25 mm a cell, holding how far inside the rim each place is (to 30 mm). A pixel reads her front's
    or her back's by its depth against her middle depth, the two blended across 6 mm; on top of her shoulders they
    agree to a few millimetres (MEASURED, `tests/topCut.test.ts`). `NECK_STYLES` are his sheet's, and a style's
    NECKLINE until it is moved is his sheet's depth on her (`DRAWN_NECK`: crew 0.966 of her trunk, U 0.809, V 0.819,
    scoop 0.838, square 0.847 -- the crew was 0.94, the U 0.76 and the V 0.72 before; GAME TUNING);
  - its SLEEVES end at a plane square to the bone the sleeve ends on (`sleevePlane`), CARRIED BY THAT BONE each frame and
    measured on her posed skin (`setFabricCutArms`): a flat ring round her arm in any pose. Looked up on her rest
    skin, the end ran ragged toward her armpit, where her arm's skin and her trunk's share points (MEASURED in her
    T-pose, a ringer's band);
  - its HEM is at its LENGTH: painted since 2026-11-24, a stitched band inside it ("A painted shirt's hem, painted");
    until then the drape's band was the edge there.
- **A SAVED LOOK KEEPS ITS NUMBERS** (`paintTemplates.wornParams`): a tee saved with NECKLINE 94% opens at 94% (his
  three characters of 2026-11-14 do), and a field a template has gained since (a long sleeve's cuff) is the
  template's. Only a style picked afresh starts at his sheet's depth.
- **Her mesh's units**: her rest places are 1.11142 units a metre (`rig.bindScale`, the panel's `unitsPerMetre` hook);
  the cut is laid in them. FOUND 2026-11-14 AND LEFT: the panel's older `unitsPerCm` reads her mesh's node and says 100
  a metre, so a fabric's weave and a brush's size are a tenth under their numbers -- they were approved by eye as
  they are; changing it changes every fabric on her.
- **BANDS** (`TEE_BANDS`: collar 16 mm, sleeve hem 18; a ringer 16 and 16; a long sleeve's cuff 5 cm; GAME TUNING to
  his sheet): inside the cut's line, the top's own fabric a tenth darker with a seam. Each edge's band is shaded by ITS
  OWN distance: taken from the nearer of the neck's and the sleeve's, the shade's edge was drawn where the nearer one
  changed -- a dashed line 3 cm from the rim all round her collar (MEASURED, the ringer).
  A HEM'S BAND SINCE 2026-11-24, when a painted shirt's drape was taken off ("A painted shirt's hem, painted", below:
  20 mm, `SHIRT_HEM_BAND`, in the shirt's own shade whatever its EDGING). Until then none: a shirt's hem was its drape's
  hem band (`tunicDrape.ts`), a sheet in its own fabric over the last 18 mm above the hem, and a band drawn on her skin
  there (20 mm) showed only where that sheet dipped under her skin -- MEASURED 2026-11-14 in the room: a grey patch at
  her side in the top's own fabric, and, a pink tee with a red edging, chips of red at her side and hairlines of it.
- **EDGING: one colour of its own for a top's bands, or MATCH** (Joshua, 2026-11-14: "for the collars and sleeve bands,
  are those colors also adjustable? So for example can pick a solid pink shirt with solid red color edging"). A drawn
  top's layer shows the editor's trim controls as EDGING: MATCH (the default: every look saved before wears its bands
  as it did) or a colour -- any swatch or the picker -- for its collar and its sleeve bands or cuffs together
  (`fabricLibrary.edgingOf`, kept as the layer's `match` / `trim`). The shader lays that colour on the top's
  own knit (each pixel's light over the fabric's average), or flat when the trim is FLAT's. The room's ringer is a tee
  with his navy for its edging: one layer (it was two for an afternoon, bands under fill).
- **FLAT, a sixth fabric family with no weave** (Joshua, 2026-11-14, of the custom colour picker, which dyes a knit: "we
  do have a solid custom color picker option set up under all the textures, or does it just alter the texture color?"
  -- it alters the texture's; of a flat one: "go ahead and add that in since I thought it was"). Its two atlases are
  small pictures of its sixteen colours (`SWATCH_HEX.flat`, drawn by `scripts/makeFlatFabric.mjs`: run it again after
  changing one); a custom colour dyes its White to exactly the colour picked.
- **ITS NECK OPENING HANGS FROM HER FRAME, NOT FROM HER BUST'S SKIN** (`skinSlip.makeFrameSlip`, `CUT_FRAME_M`). What the
  shader adds to a pixel's rest place for the drawings' look-up is her points' movement OFF HER FRAME: all that her
  shapes and morphs move a point, less the one stretch, turn and carry that best fits what they do to her frame -- her
  back down to 22 cm under the base of her neck, and the base of her neck all round. So the rim stays where it was
  drawn about her neck and shoulders: it follows her build, and not her bust or her belly under it. (Her pose's and
  her motion's shapes, `MOTION_SHAPES`, are left out: it rides them as it rides her bones.) MEASURED 2026-11-14 with
  it riding her skin instead (her slip alone taken off, as a designed garment's is): a change of her bust moves her
  breasts' skin a centimetre and more against her chest's beside it, and the scoop's lower corners stepped about a
  centimetre at her smallest bust and at her largest -- on her skin itself, her cleavage bridge left off -- and the U
  was squeezed to a funnel at her largest.
- **HER CLEAVAGE BRIDGE UNDER A DRAWN TOP** (Joshua, 2026-11-14: "need to just make sure the bridge skin between the
  breasts need to be able to work from the smallest to maximum size the sliders allow"; `cleavageBridge.ts`). The
  sheet spans all of her cleavage and is cut by the top's rim pixel by pixel, as her skin is: a V keeps its point
  between her breasts (the level-cut sheet gave it a flat bar as wide as her cleavage). Each of its points has a rest
  place (its weave's) and a slip of its own (the rim's look-up), and WHEREVER IT LIES ON HER SKIN IT SAYS WHAT HER SKIN
  SAYS: under each column of each slice the point of her skin seen there from her front (`skinSeen`, `spots`).
  - At its top, where it goes back onto her, and at its bottom, where it grows out of her cleavage, it lies on those
    points themselves -- posed with her each frame, lit as her skin faces there -- and rises from them straight forward
    to the span, so it is never behind the skin that is seen.
  - Beside its ends, and all of a small bust's sheet, its rest place and slip are her skin's own while it is within
    `OWN_NEAR` of her (4 mm: as far as her skin behind it keeps its paint, which shows through the opening the rim
    cuts in the sheet) and ease into the even spread between its ends by `OWN_FAR`.
  - A top whose cut is not drawn (the tank, the crop, the sports bra...) keeps the level-cut sheet as it was.
  MEASURED in the room 2026-11-14 (`paintCutState(true)`'s junction: at each of the sheet's points, how far the place
  it looks the rim up at is from her skin's own there, as seen from her front), her bust at its smallest (SIZE -100),
  as the room opens her, at SIZE +100, and at her largest (her belly at 200%, SIZE +100, MILK 100):
  - its top row and its bottom row lie on her skin at all four (0.0 mm apart, 0.0 off; her largest's bottom 0.1 and
    0.4), and its ends say what her skin says to 0.1 mm;
  - wherever it is seen within 4.4 mm of her skin: within 0.3, 0.4, 0.2 and 0.3 mm of her skin's own place;
  - anywhere it is seen at all, however far it stands off her (up to 29 mm): within 0.4, 0.4, 0.2 and 0.9 mm -- the
    rim is looked up where a point stands about her frame, which a point of the sheet and the skin behind it share;
  - of its 605 to 616 points that are seen, 5, 1, 17 and 15 are behind her skin by more than 0.3 mm (3.0 mm at the
    most: its ends, evened from slice to slice, sit a little inside her breasts' fronts).
  A READING MOVES A FEW TENTHS OF A MILLIMETRE WITH HER BREATH AND HER SOFT BODY (the spans are chosen when her shape
  changes; she goes on breathing). Read again on the code as committed, straight after each change of bust: within 4.4 mm
  of her 0.6, 0.7, 0.5 and 0.6 mm, anywhere 0.7, 0.7, 0.5 and 0.9; and at the bust the room opens her with, three
  readings 2 and 3 seconds of her clock apart: 0.2, 0.2 and 0.1 mm, anywhere 0.4, 0.2 and 0.3.
  BEFORE, the same day, measured the same way as each part went in: with its rest places spread evenly between its ends
  and her slip alone taken off, where it lay on her beside its ends (within 1.5 mm, solid) it was 3.8 mm off her
  skin's own place at her smallest bust, 0.3 as the room opens her, 5.9 at SIZE +100 and 11.9 at her largest, and 10.1,
  1.6, 11.0 and 16.4 mm anywhere; a first try at its top (her skin's rest places read off a level line at each
  slice's height) stepped the V's point 2 to 3 mm at the bust the room opens her with; and at its bottom, on the two
  straight runs, it came out through the undersides of a large bust from 2.8 mm behind her skin to 9.8 in front in
  one row -- the dark patch under each breast, gone from a drawn top now (pictured at SIZE +100 and at her largest).
- After anything changes the cut, its look-up, the bridge or her frame: `tests/topCut.test.ts`,
  `tests/cleavageBridge.test.ts`, `tests/skinSlip.test.ts`, `tests/fabricEdging.test.ts`,
  `tests/sarahLabFabric.test.ts`; then the room: the junction at those four busts, and the V, the scoop and the U
  pictured over each (`paintBridgeOff` leaves the bridge off, to tell what is the sheet's and what her skin's).
- **PICTURE A NECK OPENING WITH HER ARMS DOWN AS WELL** (STAND, then the ARMS slider at 0: T-POSE sets it to 90 and
  STAND leaves it there). In her T-pose its corners by her shoulders ride her raised arms' skin, as paint does.
  MEASURED 2026-11-14, the scoop: in her T-pose its corners kinked 1 to 2 mm at the bust the room opens her with, and
  stepped 6 mm by 2 where they cross the crease between a large bust and her shoulder (SIZE +100, and her largest);
  with her arms down it is round and smooth at all three.
- A PIECE ADDED BY HAND STAYS ON under the next outfit put on (`wearOutfit` clears only what the last outfit laid): a
  probe that adds one pictures it last.
- NOT DONE (the other ten of his sixteen are drawn since 2026-11-15: "The rest of his sixteen tops", below): the
  level-cut tops' sheet, which still shows the patch under a large bust; a band at a hem
  (above); and, seen from her side at her largest bust, a hairline and a sliver of her skin 3 cm long where the
  scoop's rim passes from the sheet onto her near breast (the sheet stands up to 44 mm off her there; from her front
  the two rims agree to 0.9 mm).
- (UNTIL 2026-11-24, WHILE A PAINTED SHIRT WORE ITS DRAPE'S BAND: "A painted shirt's hem, painted", below.) **A PAINTED
  SHIRT'S HEM: her paint ends at the hem band's own bottom edge, on a line that is straight across her
  biggest triangles** (a fault found and fixed; Joshua, 2026-11-14: "Go ahead and push then fix the issues you see";
  `tunicDrape.ts` `HEM_PAINT_ROWS`, `paintTemplates.templateCut`). MEASURED 2026-11-14 on v0.9.23 and on v0.9.24 alike:
  at her side, just above a painted shirt's hem, two chips of what is under the shirt (her leggings, or her skin), each
  about 35 mm by 11 and straight-sided. Her skin's paint was taken off below a line one row above the band's edge by a
  value a vertex of her skin that ran from 0 to 1 over a centimetre: across her hips' triangles (37 mm) the half-way
  line fell where each triangle's shape put it, up to 11 mm above the hem, and the band lies 0.4 mm off her -- under
  her skin there. Now the value runs straight for 42 mm either side of the band's own edge, the line is AT that edge,
  and a DRAWN top's paint runs to the hem itself (it stopped 5.5 mm short, as a top painted per vertex still does).
  `tests/tunicDrapeHemPaint.test.ts`; then the room: her hem from her side, her back and her front.
- MEASURED 2026-11-14, NOT A FAULT (it stood here as one for an afternoon): the line where her breasts meet her chest,
  pictured frayed under a bust at SIZE +100. It is her skin's own fold there BEFORE THE ROOM'S REPAIR OF IT LANDS
  (`bodyCrease.ts`: a worker, `CREASE_SETTLE_MS` after her controls rest -- at SIZE +100 it finds 716 folded edges and
  161 crossings and leaves 26 and none, 128 to 493 ms later on the build machine). A probe that steps the room and
  pictures her at once catches the repair lifted: with it switched off (`creaseOff`) the line is frayed; with it laid it
  is smooth, in her T-pose and with her arms down. PICTURE HER AFTER A CHANGE OF SHAPE ONCE `crease().pending` IS CLEAR
  (or a second and a half after), AND STEP NOTHING IN BETWEEN: a probe's `animate` before the picture lifts the repair
  again until it lands once more (MEASURED the same evening: dark dashes under a breast at her 200% belly with SIZE
  +100, pictured a step after the repair and gone when pictured with none).

## The rest of his sixteen tops

- **Every one of his sixteen is a style and an outfit** (Joshua, 2026-11-14: "finish all 10 remaining shirt tops";
  2026-11-15: "Looks great to push, but finish the head (face, hair, eyes, etc) part, the remaining clothes, then push it
  all at once"). In his sheet's order and colours (`sarahLabTool.ts` `SHEET_TOPS`, GAME TUNING by eye off it): 06 the
  tank, 07 the sports bra, 08 the raglan, 09 the henley, 10 the polo, 11 the mock neck, 12 the square neck, 13 the
  camisole, 14 the boxy crop tee, 15 the wrap, 16 the button-up -- each `painted <top> + leggings` in `OUTFITS`, put
  after the tops there were (no outfit before them has moved), each with its card's picture
  (`scripts/bakeOutfitThumbs.mjs`).
- **AN OUTLINE** (`topCut.ts` `TOP_OUTLINES`: the tank, the sports bra with its racerback and the wide band under her
  bust, the camisole, the mock neck) is a drawn top of a kind of its own: straps, armholes, a straight top edge or a
  collar, no sleeves; the boxy crop tee is a crew tee with a hem of its own (`CutTopKind`). Its front and its back are
  drawings as a tee's are (`outlinePath`).
- **AN ARMHOLE'S SIDE PROFILE IS HIS DRAWING** (Joshua, 2026-11-14, of the tanks: "make the side a smoother curve… it
  looks like it changes shape in the curve… round the sides of the breasts"; his green line over each, from her side
  and her three-quarter: "Update to the side profile… make it smoother…"; "basically, the side cutout profile matches
  the side profile of the breasts"). Each outline has an ARMSCYE of its own (`ARMSCYES`): one C seen from her side --
  [how far ahead of her shoulder joints, how far under the base of her neck] -- from the strap round the side of her
  bust to level under her arm. It is a THIRD drawing, of her side, kept in the cut picture's alpha; skin further out
  from her middle than `gate` is covered where it lies in front of or under the C (`armscyeAt`), and the corner
  between it and her front's and her back's is rounded (`smoothMax`, `ARMSCYE.join` 5 mm). Her front keeps only a LIMIT
  line down from the strap (`FRONT_ARM`, each top's `armLimit`); a camisole's begins at its peak (`CAMI_FALL`).
  MEASURED on her rest skin (`tests/topOutline.test.ts`), the edge's turn in 4 mm at the most, from her front, her
  three-quarter and her side: the tank 12.8, 15.3 and 14.0 degrees; the sports bra 14.4, 15.8, 13.8; the camisole 21.6,
  24.7, 17.7 (its peak); the mock neck 9.1, 8.0, 7.5. Her areolas are 14 mm and more inside every one.
- **WHAT IS DRAWN ON A TOP** (`topDetails.ts` `TOP_DETAIL_STYLES`, his sheet's 08, 09, 10, 15, 16): the raglan's sleeves,
  shoulders and neckband in its EDGING colour (his maroon on his heather grey); the henley's placket and three buttons;
  the polo's collar, placket and two buttons; the wrap's crossing edge to a knot at her left waist; the button-up's
  collar, its placket to its hem and its chest pocket. One table (`DETAIL_LOOK`) read by the CPU and written into the
  shader formula for formula; a program has the details' code only when a layer wears one (its key ends `-detail`).
- **ALL OF IT MET A GRAPHICS CARD FOR THE FIRST TIME ON 2026-11-15** (the build machine's software renderer; until then
  it was judged on `scripts/preview/`'s sketches). MEASURED in the room, the base model at 0%: each of the eleven new
  ones put on from its card and pictured from her front, her three-quarter and her side, ten of them from her back as
  well; the tank at SIZE +100 and at -100; no error on the page. Two faults were found, fixed and told:
  - A DOTTED HAIRLINE DOWN THE FRONT OF EACH SHOULDER of a sleeveless top, in the top's shade, stepped as her triangles
    are. A sleeveless top has her arm's skin bare by a distance of a metre and more, which comes in across the one row
    of triangles that joins her arm to her trunk; the layer's edge was antialiased on the NEARER of its two distances
    (its neck opening's, and its sleeve's or its hem's), whose slope there is some twenty ranges a pixel, and the edge
    function, which draws a line a pixel wide by that slope, put a third of the cloth on the first pixel of it. Now
    EACH EDGE IS ANTIALIASED BY ITS OWN SLOPE and the layer is there where both have it (`fabricMaterial.ts` `fe`). It
    was in v0.9.26 on the sleeveless shirt too. The CPU can not show it (it has no pixels' slopes):
    `tests/topDetails.test.ts` holds the shader's lines.
  - A SPORTS BRA'S AND A CROP TEE'S HEM WAS TORN, in teeth of 3 to 5 mm. A shirt's hem is under its drape's band; these
    two have none, and their hem was a level line on her REST skin -- her file's shape, with its 100% belly -- which
    her shapes slide along her, each triangle by its own amount. Their hem is the top's OWN edge now
    (`FabricCut.ownHem`): level on her AS SHE IS SHAPED, at the height each pixel stands about her frame, as its neck
    opening is looked up; her points' movement off her frame is worked out down past it (`CUT_SLIP_HEM_M`). A shirt's
    hem is as it was.
- **STYLE IS A ROW OF PICTURES** in the outfit editor (Joshua, 2026-11-14: "are the new shirts available now in the
  clothing tab with updated images of their style?… or modify the UI to work better"): the four kinds of piece above a
  row that scrolls sideways, each style its cut on her in one colour over what a person would wear with it
  (`stylePictures.ts`; `fabricPanel.ts` `fillStyleStrip`), the list under it as before. Baked by
  `node scripts/bakeStyleThumbs.mjs` into `public/sarahlab/styles/`: run it again when a style is added or its cut
  changes (ONLY=<ids> for just those), then build. A style with no picture shows its initials. A piece with no top of
  its own (the tied bikini bottom, which the editor keeps with the one-pieces) is pictured as a bottom, under a tee
  (`picturedAs`): as a one-piece it was a picture of her bare to the waist. (A bottom's tee is a crop tee since
  2026-11-15, so its waist is in its picture: "A painted bottom, drawn", below.)
- (The painted LEGGINGS' WAISTBAND, torn wherever a top left her middle bare -- under the sports bra, seen in its card
  -- is drawn since 2026-11-15: "A painted bottom, drawn", below.)
- NOT DONE, AND NAMED: the RAGLAN's second colour is ragged
  where its seam runs out under her arm and over the top of her shoulder (there its edge is her arm's skin's own, a
  value a vertex); the polo's and the button-up's collars lie on a closed crew (no opening between the leaves); the
  mock neck's collar is its bound edge alone; a camisole whose top edge is taken lower has no band from its peak to
  its armscye past its limit; the tank's neck opening is the scoop's, with the scoop's chip at its corner at her
  smallest bust.
- After anything changes an outline, an armscye, a detail or the edge's lines: `tests/topOutline.test.ts`,
  `tests/topDetails.test.ts`, `tests/topCut.test.ts`, `tests/stylePictures.test.ts`; then the room: the four outlines
  from her front, three-quarter, side and back, and the sports bra's and the crop tee's hems at 0%.

## The crop top, the maternity tee and the bandeau, drawn; two tees' hems follow her belly

- **THEIR EDGES ARE DRAWN** (Joshua, 2026-11-23, his pictures on his phone of their painted edges: "For the cropped top,
  it's jagged for some reason. (Fix)"; the maternity tee "had bad edges as well"; "Fix the Bandeau… only fix the ragged
  edges… make it look better", with a picture of a bandeau). Until then all three were paint a value a vertex.
  - THE CROP TOP AND THE MATERNITY TEE are tees whose hem is their own (`top: 'cropTee'`, as the boxy crop tee: level on
    her as she is shaped, no drape under it), in the neck each was painted with: the crop top's a scoop at 0.86 (a crew
    under 0.94 was painted as a scoop, `isScoop`), the maternity tee's a SQUARE at 0.94 (painted, a crew's line level
    across her chest: wide and shallow). A look saved before keeps its numbers and wears that neck (`wornParams`).
  - THE BANDEAU IS A TUBE (`topCut.BANDEAU`, `bandeauArms`, `top: 'bandeau'`; Joshua, 2026-11-24, with his picture of a
    ribbed tube, its arms down over it: "the Bandeau should look the same on top as bottom… it's not even looking… like my
    reference photo"; of an armhole cut under each arm, the hour after: "check the arms?… Think like a mini skirt wrap with
    a top and bottom hem… yours only has a bottom and the side top has like a top cutout…"; 2026-11-23: "Make sure you do
    with arms raise… let it ignore the arm weights and follow body level lines"): strapless, its hem its own. ITS TOP EDGE
    IS LEVEL ALL ROUND HER, under her arms too, at its NECKLINE / TOP EDGE (`topFront` 0.82: 9.4 cm under her neck joint),
    a stitched band inside its top edge and its hem alike (`BANDEAU.band`, 1.5 cm).
    - IN THE ROOM ITS TOP EDGE IS TOLD WHERE HER BONES CARRY EACH POINT AS HER SHAPES AND MORPHS HAVE PUT IT (her raised
      arms' shapes among them: `fabricMorphed`, laid straight after her morphs and before her breath and her soft body,
      whose patch is laid on her first), taken back about her chest's bone (the vertex stage's `vFabricAlong` while
      `fabricCutSide.w` is under 0; `setFabricCutChest`, laid each frame by `layCutArms` with `boneCarry('chest')`). So
      the skin of her armpits, which her arms' bones carry, is in the tube while it is under its level and leaves it as her
      arms lift it over: the edge stays a level line round her body. On the CPU (her paint a value a vertex, the tests) it
      is her rest height. TRIED in her T-pose: her rest place and slip carried by her bones (a tab rose up the front of her
      arm: her raised arms' shapes were left out); and her arm's skin carried out past her trunk's reach (read in the
      vertex stage) put over it too (a notch into her armpit, toothed a triangle at a time).
    - ITS ARMS ARE HERS: nothing of it further out from her middle than HER TRUNK REACHES there (`TopFrame.reach`, laid the
      first time a bandeau asks -- a third of a second on the build machine -- from her trunk's vertices and the places of
      the row of triangles joining her arm's skin to her trunk's that keep any of her trunk's share, spread, taken across
      between the creases of her armpit, evened and 5 mm more: `SIDE_REACH`), read in a picture of her side at her rest
      place, her left's in the cut picture's alpha and her right's in its green. So the tube goes into the creases of her
      armpits and no further: her arm's front and back are bare. Told as a sleeve's end, with no band (`cutEdgeAt`).
    Its sliders as they were (HEM / BELLY 0.56; NECKLINE / TOP EDGE moving front and back together); `topSide` and
    `topBack` are not read by its drawn cut. MEASURED on her (`tests/topOutline.test.ts`): her areolas 18.9 mm under its top
    edge; her trunk 4.8 mm and more inside its edge at her arms; the row's places with any of her trunk's share 2.6 mm and
    more inside it, full list and light (so no edge is drawn along her triangles); her arm's skin 3 cm under her armpit
    all bare. PICTURED in the room 2026-11-24 (light skin, 1x): at 0, 100 and 200% with her arms down from
    her front, three-quarter, side and back, and in her T-pose from the four -- one level line round her, into the creases of
    her armpits, and level through her armpit with her arms raised.
    BEFORE: (2026-11-23) its top edge a line round her body by where a pixel stands round her (her map's `around`, her
    side seam's depth as its picture's middle depth, `fabricCutRound`): his 0.82 over her front, eased from 0.7 round her
    to 19 cm under her neck joint at her side seam and level there all round her back -- the band 13.7 cm deep in front
    and 4 at her sides and back; (2026-11-24) level front and back with an ARMHOLE under each arm 7 mm clear of that row --
    a notch down into each armpit from her three-quarter and her back, "a top cutout"; then her arm's skin in it out to a
    fixed 14.5 cm from her middle -- tabs of it on the backs of her arms (most of that skin faces her front or her back,
    MEASURED by its normals).
- **THE BOXY CROP TEE'S AND THE MATERNITY TEE'S HEM FOLLOW HER BELLY, as the under-belly leggings' waistband does**
  (Joshua, 2026-11-23, his five settings of each on Blaze, pictured; of the maternity tee: "I changed my mind… Yes,
  follow the belly"). `paintTemplates.ts` `BELLY_FOLLOW` (a table of his settings for each following dial, by template:
  `followDials`, `followedValues`), `followedAt(id, …)`, `withDialAt(id, …)`, `withFollow(id, …)`, and FOLLOWS BELLY on
  each. HEM / BELLY: the boxy crop tee 0.29, 0.33, 0.42, 0.53, 0.59; the maternity tee 0.19, 0.12, 0.02, 0.02, 0.02 at
  0, 50, 100, 150 and 200% (GAME TUNING, his). Their NECKLINE and SLEEVE stay where they are set. A follow keeps what a
  slider moved each dial by under the dial's own id (`{ hem: … }`; v0.9.74's waistband's `front` / `back` still read).
  AN OUTFIT THAT SETS ONE OF THOSE DIALS ITSELF -- the grey crop tee's hem (0.42) over his sheet's leggings and under the
  skirts -- keeps the outfit's number at every size, as before; FOLLOWS BELLY puts it on his settings. MEASURED in the
  room (light skin, 1x): the crop tee's HEM / BELLY read 0.29, 0.31, 0.33, 0.38, 0.42, 0.47, 0.53, 0.56, 0.59 at 0 to
  200% by 25s, the maternity tee's 0.19, 0.15, 0.12, 0.07, 0.02 and 0.02 on; one laying (a hem's new cut drawn, her
  paint laid) 64 to 77 ms on the build machine, at most every 250 ms while her belly is dragged.
- After anything changes them: `tests/underBellyFollow.test.ts`, `tests/topOutline.test.ts`, `tests/topCut.test.ts`;
  then the room: the bandeau at 0, 100 and 200% from her front, three-quarter, side and back; the two tees at 0 to 200%.

## A painted shirt's hem, painted

- **A PAINTED SHIRT HAS NO DRAPE: ITS HEM IS PAINTED, A STITCHED BAND INSIDE IT** (Joshua, 2026-11-24, of the henley's
  hem band standing off her bump at 150 to 200%: "instead of trying to make it fit if yours having issues, can we
  instead, add painted edges instead like we did with leggings and shirts sleeves?"; asked whether all of them or the
  henley first: "let's do all for now… we can come back to it later if I want… but we do have the cloth simulation which
  we could freeze as well"). `paintTemplates.PAINTED_SHIRT_DRAPE` is 'off': every drawn top with a LENGTH -- the tees, the
  henley, the polo, the raglan, the wrap, the button-up, the tank, the camisole, the mock neck -- wears no drape's hem
  band (`tunicDrape.ts`, kept for 'band' and 'full'), and its hem is its cut's own edge, drawn for each pixel
  (`FabricCut.skinHem`, the shader's `fabricCutHem` 2).
- **ITS LINE IS THE HIGHER OF TWO, ROUNDED WHERE THEY CROSS** (`fabricMaterial.SKIN_HEM_ROUND`, 2 cm; GAME TUNING):
  level on her as she is shaped (a top's own hem's: her points' movement off her frame, `ownHem`, worked out down past
  it), and ON HER SKIN, at its rest height on the skin it was put on, looked up through her skin's slip PULLED BACK
  through her skin's own stretch (`pulledSlip.ts`), as a drawn bottom's waistband is -- laid while a painted shirt is
  worn whether or not a drawn bottom is (`layLowSlip`). About her hips and her back the two are one; under a big bump
  her skin's goes down with her bump to its underside. MEASURED 2026-11-24 in the room, the henley (light skin):
  - level alone (the boxy crop tee's way): at 150% and 200% a level line across the lower third of her bump, under it
    her leggings' grey;
  - on her skin alone: the skin under her body file's bump goes back up her as her bump goes, and at 0% the hem rose
    over her mound in a U some 5 cm high, her leggings' grey in it;
  - the higher of the two: PICTURED (light skin; the henley at 0, 100, 150 and 200% from her front, three-quarter, side
    and back, and seated at 0 and 200%; a plain tee at 0 and 200%): at 0% level round her, a stitched band inside it; from
    100% her bump covered to its underside, the hem going under it and down round its sides, level round her hips and
    back. Seated, it lies on her lap as paint does.
- **A STITCHED BAND** (`topCut.SHIRT_HEM_BAND`, 20 mm, his sheet's stitched hem; GAME TUNING) inside its hem, in the
  shirt's own fabric a shade darker ALWAYS: a top's EDGING colours its collar and its sleeves' bands, never its hem (a
  raglan's or a ringer's hem is the body's colour; the shader's `fbe`). A template may say its own (`band.hem`): the
  ringer's is none. The tops cut above a LENGTH's reach keep their own: the crop tees none, the sports bra its wide band.
- WHAT WENT WITH THE DRAPE: a painted top to her hips worn over a skirt stood through it in chips at her hips (its
  drape's band, which no skirt was told of: "The skirts", (d)); a painted shirt's paint taken off below the band's edge
  (`HEM_PAINT_ROWS`: "A painted top, drawn"); seated, the drape's front rode up by its fabric's stretch.
- NOT DONE, OFFERED: the maternity tee and the boxy crop tee keep their level hem (his settings on Blaze were set on it):
  at 100% and over, the maternity tee's leaves a strip of what is under it below her bump.
- After anything changes it: `tests/topOutline.test.ts` ("a painted shirt's hem is painted"), `tests/topDetails.test.ts`,
  `tests/bottomCut.test.ts`, `tests/topCut.test.ts`; then the room: the henley and a tee at 0, 100, 150 and 200% from her
  front, three-quarter, side and back, and seated.

## The cloth tops

- **Ten of the painted tops as the cloth tee, ADDED beside them** (Joshua, 2026-11-16: "Can we instead convert all the
  painted tops to the cloth sim ones? We have a few sliders already to help with that"; "Just add, don't replace. Just
  the 10 is fine"). `sarahLabTool.ts` `CLOTH_TOPS`: the procedural tee (`garment/`) at ten settings of the sliders it
  has -- crew, U, V and scoop necks, sleeveless, cap, three-quarter and long sleeves, a crop and a tunic -- each
  `cloth <top> + leggings` in `OUTFITS`, put after everything there was (no outfit has moved), each in its painted
  twin's colour with its card's picture. An outfit sets its tee's own settings by `BuiltInOutfit.cut`
  (`adoptGarment`); TEE DEFAULTS still gives the approved tee. Nothing new is cut or sewn.
- The sleeveless and the cap sleeve are SET-IN: MEASURED in the room on the base model, a raglan cut off at her
  shoulder leaves its armhole open down her side; a set-in's lies round her arm, and is still deep seen from her side.
- MEASURED in the room 2026-11-16 (the light skin, the base model at 0%): each of the ten put on from its card and
  pictured from her front three-quarter and her back; no error on the page.
- NOT DONE, AND WHY THEY STAY PAINTED ALONE: a square neck (the tee's neckline runs from a U to a V); a second colour
  for bands (the ringer, the raglan's sleeves); plackets, buttons, pockets and collars; a mock neck; a wrap; and the
  sports bra and the camisole, which are skin-tight. Every cloth top is simulated each frame; a painted one is free.
- The card bake waits for a cloth tee to be tailored, eased on and let hang (`bakeOutfitPictures`).
- NEXT, NOT BEGUN (he is to say when): skirts as paint and cloth together -- `docs/reference/README.md` has what he
  asked of them.

## The skirts (paint and cloth together): the pilot

- **NO PAINT UNDER A SKIRT BUT HER UNDERWEAR -- THE SHEET IS THE SKIRT, A SHELL ROUND HER** (Joshua, 2026-11-17: "I would do
  0% fit for the pencil skirt. Did you remove all the paint under the skirts? That would allow more flexibility for
  undergarments or none for birth, etc…"; "basically create a shell around the body as the skirt"; 2026-11-19: "maybe for
  all skirts add the Athletic Bikini 👙 Bottom… so she has underwear but can be removed if wanted later"). WHAT IS
  WRITTEN BELOW OF A SKIRT'S PAINTED PART ("a short painted on her", "ITS PAINTED PART IS THE UNDER-BELLY LEGGINGS CUT
  SHORT", "ITS PAINTED PART'S LEGS", `paintedLegs`, `SKIRT_PAINT`, `setDial`, `laySkirtPaint`, `skirtPaint`,
  `SKIRT_UNDER_LEGS`) IS v0.9.44's AND TAKEN OUT; the pencil's FIT is answered: 0.
  - THE SEVEN OUTFITS (`sarahLabTool.ts` `SKIRTS`, `TEE_SKIRTS`) wear HER ATHLETIC BIKINI BOTTOM under the skirt
    (`skirtUnderwear`: its edging and its fill, two paint layers a piece in the Outfit tab takes off) IN THE SKIRT'S OWN
    COLOUR (his, the same day: "match by default the color of the panties to the skirt, but like with top and bottom or the
    edgings, you can change if you want"): the skirt's tint of the ATHLETIC knit, each piece's fabric his to change -- the four skirts with the grey crop tee over it, the three with the cloth tee nothing else painted -- and
    say the skirt's colour themselves (`BuiltInOutfit.skirtTint`, a tint of the ATHLETIC knit; `syncSkirt`). THE PENCIL IS
    `fit: 0`. `SKIRT_UNDER_BAND` stays as the STYLE whose waistband line a low ring is laid on (`fabricPanel.hoopOn`), worn
    or not. A look saved in a skirt before keeps the short it was saved with.
  - HER BIKINI BOTTOM'S BACK SQUATTING (his: "the ABB shape changes and has rough edges when sitting or like squatting…
    Mainly it's the back end that changes and gets jagged edges… front is sides seem to be okay"). A designed bottom is
    looked up through her slip; in SQUAT and RECLINE her birth poses' smoothing of her skin (`BIRTH_NORMALS_FIELD`) slides
    her skin's points along her as well, and behind her a garment rode that slide into teeth. Now a garment rides that
    smoothing IN FRONT of her and takes its slide off BEHIND her (`SarahLabScene.ts` `GROIN_RIDE`: from 3 cm behind the
    middle of her opening, all of it by 8 cm; the panel's `poseRide` hook) -- taken off everywhere, black spikes stood
    beside its front panel. MEASURED in the room: SQUAT from her front, back and three-quarter and RECLINE from her front and
    side, one smooth line round each leg.
  - IN SQUAT AND RECLINE A SKIRT RIDES UP (his: "recline and squat would naturally make them sit about mid pelvis to just
    below the belly line because it would ride up the thighs in real life"): it is cut at LENGTH 0, where her legs part
    (`SKIRT_RIDES_UP`), and cut again as she goes into those poses and out of them (a change of pose that does not cross
    that line lays it afresh as before). Its settings are not moved: STAND gives back its length. MEASURED in the room
    (light skin, 1x, 0%): the pencil, the A-line and the maxi a band round her hips in both (hem 80.6 cm from the floor
    standing up out of it), their lengths again standing. Points under her skin, SQUAT: the pencil 77 (11.2 mm at the
    most), the A-line 70 (26.4), the maxi 37 (26) -- where her thighs fold up against her belly; RECLINE 0, 1 and 10.
    Pictured: no patch of her skin through it from her front, back or side.
  - ON HER (FIT 0) HER SKIN IS THE SHEET'S FLOOR AS WELL (`clothSkirt.ts` `outOfHer`, for `only` too: her places' own slots,
    walked again in the same frame). With no paint and no floor, MEASURED in the room in a stride: 157 to 163 of the pencil's
    2,160 points under her skin, 8.8 to 9.3 mm, her thigh through the skirt.
  - AND IT IS TAUT ACROSS HER CREASES (`tautColumns`, `SHEET_TAUT`: its comment has the why). Without it, a crescent of her
    skin 6 to 8 cm long under the seat of her rear leg, from her back, in two strides of four: the sheet went into the fold,
    behind the lip of skin over it -- no point of it under her skin. `skirtParts(capsules, skin, floor, taut)` switches each.
  - MEASURED in the room (light skin, 1x, her belly at 0%, the pencil at FIT 0, no paint; walking with the clock held at a
    thirtieth, six moments 0.2 s apart): points under her skin standing none; striding none, one (a point of a span between
    her thighs, row 12 column 70, 35.9 mm), none, none, none, none; seated one, 1.1 mm. NO PATCH OF HER SKIN ENCLOSED BY THE
    SKIRT in any of eighteen pictures (standing from three sides, the six moments from her back and her front, seated from
    three: `scripts/room/holes.py`). Her skin 3.4 to 7.6 ms a frame, the "cloth" 0.6 to 1.6 (none is stepped). The pencil at
    FIT 0 standing at six LENGTHs from 0 to 1, its hem 80.6 to 6.0 cm from the floor: clean. 2026-11-19, with her bikini
    bottom under them: the four skirts standing, the three with the cloth tee from her three-quarter and her back, the
    pencil and the A-line at 100 and 200% from her side and her back: clean.
  - TWO WRONG READINGS OF MINE, EACH CAUGHT BEFORE A CURE WAS BUILT (the lesson a third and fourth time: READ THE POINTS):
    (1) "a band of her skin over the stool, seated, from her back" is the sheet's OWN underside, lit warm by the room's
    `under` light, seen through the gap between the back of her seat and the stool -- drawn flat with the stool hidden (the
    `sheet` probe hides it: from her back, from 10 degrees above and from below) there is no skin, and a z-buffer of the
    sheet's points and her skin's has none either (`scripts/room/seen.py`, `seen2.py`); (2) the "crescent still there" under
    her seat in one stride is the sheet's fold, a dark grey (30, 30, 30), not skin.
  - FOUND, NOT FIXED: (a) ONE POINT THROWN OUT OF THE SHEET in one moment of six: row 25 column 36, between her calves at her
    back, put 51.8 mm out by `sheetOutOfSkin` (a point of a span: her skin's walk had lost its place -- the far side of a
    calf), a dent by its hem from her back; and in strides the points at the backs of her knees (row 25, columns 31, 32 and
    40) stand 12 to 22 mm off their four neighbours' mean, where standing none is over 8.4 (`scripts/room/rough.py`).
    PLANNED, NOT WRITTEN: at the end of `outOfHer`, a point further than 12 mm from its neighbours' mean brought back (to
    12 squared over its distance; the hem by its two side neighbours). (b) THE RING'S TOP EDGE WAVERS SEATED, 1 to 8 mm, at
    the small of her back (its heights there 78.4, 77.9, 78.6, 77.8 cm; standing it is smooth; on her full skin as well, and
    with each of her pose's fields switched off in turn). PLANNED: the drawn ring evened along itself, shrink-free (two
    rounds of 0.5 and -0.53). (c) `SHEET_TAUT.most` (3 cm) is reached in two strides of six and seated. (d) (GONE 2026-11-24 with a painted shirt's drape: "A painted shirt's hem, painted") A PAINTED TOP TO
    HER HIPS worn over a skirt: its hem band stands through the skirt in chips at her hips (a painted top's hem is its
    drape's band, which no skirt is told of). (e) Her shoes through the maxi's hem (below). (f) The points under her skin
    squatting (above).
  - NOT LOOKED AT YET WITHOUT PAINT: the pencil half-way (FIT 0.5) walking; the A-line, the mini and the maxi walking.
  - THE LEAD'S ROOM DRIVER AND ITS READERS ARE KEPT IN `scripts/room/` (they were a session's scratch files, and their paths
    are that session's: set `S` and the repo's path): `room.mjs` opens the built room once and runs posted scripts against
    that one page ("One preview, one page"), `pre.js` its helpers, `n3.js` a batch as an example; `inside*.py` a sheet's
    points against her skin, `seen.py` / `seen2.py` what is seen from a side (flat, or by a camera with the stool),
    `holes.py` not-skirt patches inside a skirt in a picture, `rough.py` where a sheet is rough, `grid.py` / `sheet.py`
    pictures side by side.
- **A skirt is a short painted on her and one sheet of cloth hung from just under its waistband** (Joshua, 2026-11-16:
  "a combination of paint and cloth for like skirts, etc… that are loose and flowing"; "have the top of the skirt above
  or below the belly, with adjustable length all the way down to the ground and you can select how tight/close it is
  to the body"; "the top is either one or the other, but both can reach the floor length"). `skirt/skirtDraft.ts`
  (pure) drafts it round her rest shape as she is built (below: cut for her as she is) from his three numbers (and FIT, his fourth: below) -- TOP (`over` / `under`: the ring's
  heights -- OVER in the crease at the base of her breasts, his, 2026-11-17: "the high skirt point is too low, it should
  basically sit at the base of the breasts at that crease" (MEASURED on her body file: the crease is 0.61 to 0.64 of her
  trunk; the painted band's top is 0.63, `SKIRT_OVER_BAND`, the ring 0.61 in front, and the crop tee ends 0.03 under the
  band's top, under it -- ended at it, a sliver of her skin showed); UNDER on the under-belly leggings' own line: below), LENGTH (0 where her
  legs part, 1 the floor, a level hem: his drawing, below) and FLARE (0 a tube that falls from the widest of her, 1 a full skirt): a ring just off her and
  under it a surface that never comes back in toward her (her dress form, which spans her legs) and opens by FLARE's
  angle. `clothSkirt.ts` wears it: bound to her skin (`garment/bind.ts`), her skin its floor (`clothSkin.ts`), moved by
  the room's cloth (`clothSim.ts`). Four outfits wear one (`sarahLabTool.ts` `SKIRTS`, `BuiltInOutfit.skirt`), put
  after everything there was: an A-line and a maxi over her belly, a mini and a pencil under it, each over
  `shortsAthletic` in its colour and the grey crop tee (all four under her belly since 2026-11-17, over the under-belly
  leggings cut short: below). The probe's `skirt({ top, length, flare })` puts any on.
- WHAT WAS LEARNED MAKING IT STAND (all MEASURED 2026-11-16, in the room and off it):
  - A COLUMN HANGS FROM ITS OWN RING POINT AS HER SKIN HAS IT. Laid whole by her pelvis, the row under the ring began
    centimetres from the ring (her spine carries her waist too); the strain limit closed that in one substep and the
    whip threw a floor-length hem up round her waist in a quarter of a second.
  - HOW STIFF AND HOW LONG: a cone of 72 columns hung from its ring with nothing under it comes to rest at 30 rows with
    `bendCompliance` 2e-4 and never does at 4e-5, nor at 54 rows 2 cm apart short of 1e-2. So no skirt has more than
    `SKIRT_CUT.mostRows` (30): a long one's rows are further apart.
  - HER SKIN UNDER A POINT THAT HANGS OFF HER FACES THE POINT (`ClothSkirt.floors`): the sim's floor is a half-space by
    the nearest triangle's own facing, right for cloth lying on her and wrong a hand off her, where the nearest of
    her is an edge of her.
  - HER LEGS ARE CAPSULES ABOUT THEIR OWN SIZE (`SKIRT_BODY`), since her skin's walk is local; and what she sits on is one.
  - NO POINT FASTER THAN `SKIRT_FASTEST` (1.6 m/s), gravity one and a half times, damped 6 a second (his: "Try setting
    gravity about 1.5x, and maybe keep it more stiff to help with a lot of the flapping around"): a stride threw the hem
    over her hips.
- MEASURED in the room (the light skin, 1x, no error on the page): the four standing from her three-quarter and her
  back at 0%; the A-line walking and seated; the A-line, the mini and the maxi at 100%. About 5 ms of her skin and 4 ms
  of cloth a frame on the build machine (2,160 to 2,304 points).
- **WORN WITH THE CLOTH TEE: ONE CLOTH OVER THE OTHER, 3 MM APART** (Joshua, 2026-11-16: "an option for a high waisted
  skirt to be above or under the shirt, while under the belly is always under the shirt"; "I would add collisions…
  shirt to skirt with it to know which way to offset by maybe 3mm spacing between cloths"). `SkirtSettings.tucked`
  (an under-belly skirt: always false) says which is outside, so nothing is searched both ways (`clothLayers.ts`): the
  OUTER cloth's floors on her skin are raised to the inner cloth's height off her there and 3 mm more; the inner cloth
  is not told. Tucked, the skirt is outer: its ring is cut 8 mm off her and keeps its floor, and no floor is raised over
  1.2 cm (the tee's loose hem flapping under it threw the skirt about until then -- MEASURED); the tee is the cropped
  one. Untucked, the tee is outer (`GarmentCloth.over`). Skin to shirt was 1.5 mm and skin to skirt 4 mm already.
  Three outfits (`TEE_SKIRTS`): the tee tucked into a high A-line, over a high one, over a low mini. MEASURED in the
  room (light skin, 1x), standing from three sides and walking: tucked, clean; over the mini, clean; over the high
  skirt, no tee through the skirt, and the tee lies in ridges across her back where it rides the skirt's band. Two
  cloths at once: about 9 ms of skirt and 12 to 24 ms of tee a frame on the build machine -- NOT MEASURED on a phone.
- **CUT FOR HER AS SHE IS** (Joshua, 2026-11-17: "Yes, do the recut…"). Cut once for her 0% belly, a high skirt at 200%
  was not wide enough to go round her bump and was pushed up into a ring on top of it, her legs bare (MEASURED, the
  three with the tee). A skirt is drafted from her shape as it stands -- her rest places with her shape fields as laid
  and every morph she wears but her pose's and her motion's (`MOTION_SHAPES`) -- and drafted again
  `SKIRT_RECUT_AFTER` (0.6 s) after her shape last changed (`syncSkirt`, `skirtRecut`). MEASURED after, the same three
  and the maxi at 100 and 200%, standing from three sides and walking: each hangs over her bump to its hem. A re-cut
  is 1.3 to 2.6 s on the build machine beside a render (her dress form and the binding): a pause as a slider is let
  go -- NOT MEASURED on a phone.
- **ITS FOUR ANCHORS** (Joshua, 2026-11-17: "I would add 4 anchor points for skirts either high or low sitting:
  front/back/both sides"; "releasing all of them should make it fall down for the skirts"). `SkirtSettings.anchors`
  (`skirtDraft.ts` `SkirtAnchors`, `anchorShare`; absent: all four): her front, her back, her left and her right each
  hold the quarter of the ring round them, eased to nothing at the next -- all four, the whole ring as it always was.
  MEASURED in the room: her sides let go, it hangs from front and back as before to the eye; all four let go, a high
  one and a low one fall to the floor round her feet (the room's floor is its floor now, `GROUND_CLEAR`: without one it
  went on through and out of sight). HELD AT in its panel sets them ("Its controls", below), and the probe's `skirt({ ..., anchors })`.
- **A TUCKED TEE IS HELD IN BY THE SKIRT'S TOP** (`clothLayers.ts` `cinchUnder`, `GarmentCloth.belt`). At the crease the
  cloth tee hangs from her bust in front of the skirt's top: tucked, its hem showed ragged over it. Where the skirt's
  first 8 rows lie over a point of the tee's floor, the tee's point stands no more than 2 mm past its stand-off, after
  its step. And the tee is DRAWN 3 mm out of where it is simulated (`DRAW_LIFT`) -- exactly the skirt's floor over it:
  over a bump it showed through in bands, so a tucked skirt's floors are raised by that and 2 mm more, the rows held
  in part among them (only the ring itself keeps its floor), and its ring is cut 10 mm off her. The tucked tee's
  LENGTH is 6 (at 14 its hem drew a line across her bump). MEASURED in the room (light skin, 1x): 0% from four sides
  and walking, 100 and 200% standing from her three-quarter and side: the tee bloused over the band, none of it
  through the skirt. Walking at 100% it still came through under the band, so:
- **WHAT OF THE TEE IS UNDER THE SKIRT IS NOT DRAWN** (Joshua, 2026-11-17: "hide it under the skirt, but if the skirt
  moves, it will automatically show… Definitely don't hide skin, but can hide clothing or do a simple collision that
  hides touching vertices on collision"). `clothLayers.ts` `coveredBy`, `GarmentCloth.hidden`: each frame a point of
  the tucked tee is marked while the skirt (under its top two rows, whose edge covers where the hiding ends) lies over
  its floor on her, no nearer her than the point itself; the tee leaves out the triangles whose three points are all
  marked. HER SKIN IS NEVER HIDDEN, and where the skirt lifts away the tee is drawn again. That left three flecks by
  the band (his three circles on v0.9.41's pictures: 100% from two sides, 200% walking): in the crease the tee's
  nearest skin is the underside of her breast, which faces down, so no skirt was found over the point. So a point
  BELOW THE SKIRT'S TOP EDGE where it stands round her (`underTop`: 1.5 cm under it -- at 0.5 her skin showed in the
  gap between the ring and her) is marked as well, while it is within the edge's own reach and 1.5 cm, or lies within
  2.5 cm of the skirt's top rows (the shelf over a bump). MEASURED in the room (light skin, 1x): 0, 100 and 200%
  standing from three and four sides and walking: no fleck, her sleeves whole.
  (The seven cards were baked again, 2026-11-17.)
- **A TEE OVER A SKIRT DOES NOT RIDE IT** (2026-11-17; `clothLayers.ts` `holdInside`, `besideCloth`, `ClothSkirt.hide`;
  Joshua, of the tries shown on the way: "Right now, only OVA.jpg looks good enough to push… keep working" -- OVA the
  tee riding the skirt as v0.9.42 has it). Riding a skirt that sits in the crease under her bust, the tee stood in
  darts from her armpits, in a ridge right across her back, and at 100% bunched on top of her bump. Each MEASURED in
  the room at 0, 100 and 200%, standing from four sides and walking:
  - riding, read evenly and not where a floor faces down: no darts, the ridge and the bunching still; the skirt held
    within 2.5 cm of her under it as well: the same;
  - the skirt brought to her skin at once under the tee: a hand's jump in a frame, the skirt in pieces;
  - not riding, the skirt undrawn only where the tee is outside it: it hangs wider than a tee, and showed through it
    in blocks; undrawn wherever the tee is over its floor: holes to her legs under a bump (the nearest of her to the
    skirt there is the bump's underside, and the tee lies on that).
  NOW: the tee hangs as it does with no skirt (smooth, and over her bump at every size; it is laid again a second
  after a skirt's re-cut). A point of the skirt is brought in toward the tee's height over its floor, 3 mm a frame at
  the most; and it is not drawn while the tee stands LEVEL WITH IT on its own side of her -- looked for 3.2 cm under
  its own height (so the skirt's edge is at the tee's hem, not 2 cm under it with her skin between), no further out
  than 3 cm past it, no further in than 10 cm (the tee on a bump's underside) -- with every triangle that has ANY
  such point left out (with only the wholly hidden ones, teeth a row tall over the hem). MEASURED: clean standing at
  0, 100 and 200% from every side. NOT RIGHT: at 100 and 200% the skirt's top edge is seen from her three-quarter
  and side, standing off her under the tee's hem (it hangs from the front of her bump); walking, the skirt gathers
  between her legs in some strides. The tee over the LOW mini goes the same way: not pictured since.
- **EVERY SKIRT ON THE MENU SITS LOW, UNDER HER BELLY** (Joshua, 2026-11-17: "Leave it sit low, most don't actually ride
  high, although there are some clothing styles that do… but the better way is keep the shirt, make it longer like a
  dress and add the flair under the belly and created basically a two tone piece look from one piece doing a hybrid if
  over the belly skirt over shirt. For now, only do under the belly since that's how most skirts sit, lol, we can come
  back to the look over later"). The A-line and the maxi, and the two with the cloth tee that were high (tucked, and
  over), are under her belly; a name one had still finds its outfit (`OUTFIT_FORMER_NAMES`). An over-belly skirt, the
  tuck and the crease are as built, the probe's to put on. THE LOOK OVER HER BELLY, WHEN HE COMES BACK TO IT, IS ONE
  PIECE: the shirt made long like a dress, its flare beginning under her belly, in two tones -- not a skirt over a shirt.
  MEASURED in the room (light skin, 1x): the A-line and the maxi at 0 and 100%, standing: clean; with the tee at 0%:
  clean; at 100 and 200% the skirt's top edge is seen under the tee's hem and, at 200%, gaps beside it (its ring was
  then at three heights on her trunk, on her bump by 100%: the next is what was done about it).
- **UNDER HER BELLY ITS TOP IS THE UNDER-BELLY LEGGINGS' OWN LINE** (Joshua, 2026-11-17, of those pictures: "how the
  skirt should sit is like how we did the lower rider leggings, just above her pelvis, below her belly following that
  same curved lines…"). A low skirt's ring was at `SKIRT_TOPS.under`'s three heights (5.0, 7.6 and 8.9 cm over her hip
  joints) over a short of its own whose waistband is ON her belly -- which rides her skin as it stretches, up the
  front of her bump. Now:
  - ITS PAINTED PART IS THE UNDER-BELLY LEGGINGS CUT SHORT (`sarahLabTool.ts` `SKIRT_UNDER_BAND`, `SKIRT_UNDER_LEGS`,
    `skirtPaint`): that style's waistband -- his line, the hoop ("The under-belly waistband (a hoop)") -- its bowl and
    its 1.5 cm band, with LEG LENGTH 0.12, the short shorts' own. An over-belly skirt's is the short it was.
  - ITS RING IS LAID ON THAT LINE AS IT LIES ON HER. `bottomCut.hoopInside` (`fabricPanel.hoopOn`) tells how far
    inside that waistband each point of her skin is as she is shaped -- `planeAt`, its hoop swung (`swingOf`) and its
    front told (`planeFront`) off the very points the skirt is cut from; `skirtDraft.ts` finds where that is 8 mm, in
    the painted band, on her triangles (`underLine`), reads its height and how far out it is in each of the ring's 72
    directions (`ringOn`: the furthest where a direction crosses it twice), and evens the two round her
    (`SKIRT_LINE`). UNDER THE RING THE CLOTH GOES ROUND HER SKIN UNDER THE LINE ALONE -- her hips, her seat, her legs:
    a dress form of what that waistband covers -- never the belly that hangs in front of it. Its hem is still counted
    from `SKIRT_TOPS`' heights: a ring that follows her belly down does not take the hem with it. A line not found all
    the way round her (`SKIRT_LINE.least`) is not used, and the ring is at the three heights.
  - HER OPENING'S AREA IS HER SKIN TOO. It is drawn by a patch of its own (`vulvaMesh.ts`) and her drawn list of
    triangles has a hole there; at a big belly the line runs across it, a centimetre over her opening. MEASURED in the
    room at 200%: on her drawn list 15 of the 72 directions were uncrossed, all in front of her (the ring's front was
    eased between its neighbours, 2 cm high). So a skirt is drafted on, bound to and walks over ALL of her skin's
    triangles (`SarahLabScene.ts` `skinTrianglesOf`, the list her fabric is laid by; `ClothSkirtOptions.skin`,
    `ClothSkin`'s `triangles`), as her cloth bikini bottom is. (Bound to her drawn list alone, and to all of her
    skin, the A-line at 200% pictured the same standing and walking.)
  - MEASURED in the room (light skin, 1x; the probe's `skirt()`: `ring`, `lineFound`), centimetres over her hip joints
    at her front, her side and her back: 0%: 4.3, 10.4, 16.4; 50%: 2.0, 9.2, 16.4; 100%: -1.9, 9.8, 16.4; 150%: -6.0,
    8.6, 16.6; 200%: -7.5, 6.8, 16.7 -- the line found in all 72 directions at each. Off the room, on her points read
    out of it (her full list of triangles and the light one: the same ring to a millimetre), the same fronts.
    PICTURED (light skin, 1x, no error on the page): the A-line at 0, 50, 100, 150 and 200%, from four sides at 0, 100
    and 200% and from below at 200%; the mini, the maxi and the pencil at 0, 100 and 200%; the cloth tee over the
    A-line at 0, 100 and 200% from four sides and over the mini at 0, 100, 150 and 200%: its top under her belly at
    every size, as the leggings' is, and the tee's hem over it with no edge standing off and no gap beside it.
  - TWO THINGS FOUND IN THE DRAFT ON THE WAY, fixed and told. (1) A ROW IS READ AT ITS OWN HEIGHT: read only on the
    slices' steps from the row above, a row between two slices was cut for the slice OVER it, and where she widens fast
    going down -- the top of her seat, under a ring at the small of her back -- the cloth as cut was 3 mm inside her
    (MEASURED at 0%; her skin put it out as it was worn). (2) HER OUTLINE'S REACH TOWARD EACH COLUMN IS READ ONCE A
    SLICE (a height between two slices: between their two reaches): asked of `hullAt` for every row and every slice
    between rows, each asking made two outlines again. A cut was 1.3 to 2.6 s in the room beside a render and is 0.33
    to 0.61 s (0.9 to 2.6 s off it, now 0.06 to 0.24); the shapes cut differ by under 0.6 mm but for the rows (1)
    moves out, up to 7 mm over a big belly under an over-belly ring.
- **LENGTH IS HIS DRAWING, AND HE HAS DRAWN A SECOND NUMBER** (Joshua, 2026-11-17, a figure from its front with a green
  line "Top" under its belly, three yellow lines across its legs -- "0%", "50%", "100%" -- and two red lines down its
  side, "0%" and "100%": "Here is the drawing with two variables. 1) Length 2) How tightly it curves with the body from
  legs to legs. Maybe for tighter ones, it's actually a simple bridge like between the breasts that span the front and
  back gap between the legs… not cloth and if you do a looser one, it fades somehow to cloth sim"). His marked-up
  figure is not kept in the repo.
  - LENGTH, DONE (`skirtDraft.ts` `SKIRT_CUT.shortest`, `floorClear`, `hemOf`): 0 where her legs part, 1 the floor,
    straight between -- half-way is a hand under her knee, as his 50% line is. MEASURED off his drawing: his 0% line
    545 px down a figure whose legs part at 548 (give or take 8) and whose feet stand at 992; his 50% line at 746, 46%
    of the way from his 0% to his 100% and 46 px under its knees. MEASURED on her (the room's points at 0%): the gap
    between her thighs opens 8.0 cm under her hip joints, 0.22 of the 36.5 cm to her knees; 50% is 43.3 cm from the
    floor, 8.8 under her knee joints. Counted on her legs whatever its top (it was 30 cm under the ring at 0: 11 cm
    over her knee, longer than a mini), and never nearer the lowest of its ring than 8 cm (`leastDrop`: a ring gone
    down under a big belly would meet a short hem). THE OUTFITS ON IT: the A-line 0.36, the pencil 0.54 and the maxi
    1 end where they did (within 3 mm); THE MINI IS 0.15, at her mid-thigh, 17 cm over her knee -- it was 8. GAME
    TUNING, his to set. MEASURED in the room (light skin, 1x, her belly at 0%; `skirt()`'s `hem`): 80.6, 69.4, 53.8,
    43.3 and 6.0 cm from the floor at 0, 0.15, 0.36, 0.5 and 1, each pictured from her front and her side; the mini
    from four sides, seated, walking with the clock held, at 100 and 200%, and under the cloth tee at 0, 100 and
    200%. Its two cards baked again.
  - HIS SECOND NUMBER IS FIT: "FIT, between her and the cloth", below.
- **FIT, BETWEEN HER AND THE CLOTH** (his second number; Joshua, 2026-11-17, the same drawing's two red lines, "0%" along
  the figure's leg from hip to ankle and "100%" straight down from its hip: "How tightly it curves with the body from
  legs to legs. Maybe for tighter ones, it's actually a simple bridge like between the breasts that span the front and
  back gap between the legs… not cloth and if you do a loser one, it fades somehow to cloth sim"). READ AS a number of
  its own beside FLARE, which stays the number it was (asked of him before it was built; he had not said, and was told
  which reading was taken). `SkirtSettings.fit`, `skirtDraft.SKIRT_FIT`: 0 on her all the way to its hem, 1 straight
  from her hips -- every skirt until now, and what a skirt that says nothing is (`fitOf`).
  - THE CLOTH IS THE CLOTH AT EVERY FIT: its cut and its ring's grip are FIT 1's to the last bit
    (`tests/skirtFit.test.ts`). Under 1 it has a SECOND CUT, ON HER (`SkirtDraft.hug`): her own outline at each height,
    her hips and under them the convex outline of both her legs, `ease` off her, in and out as she goes -- EACH POINT
    THE NEAREST OF HER OUTLINE TO THAT POINT OF THE CLOTH AS CUT (`nearestOn`), so the straight way from the one to the
    other is straight out of her and no share of it is in her.
  - EACH POINT HAS A PLACE ON HER, AND THE SHEET IS DRAWN FIT OF THE WAY FROM THAT PLACE TO THE CLOTH
    (`clothSkirt.ts`, `shown`): at 0 on her and no cloth made at all (`only`), at 1 the cloth and nothing else, between
    them his two lines' in-between -- his "fades somehow to cloth sim". Her places are particles of the cloth's own,
    held outright, with no cloth between them (`fitted`, `base`): her skin is walked under each, and each is put out
    of her as a held point of cloth is.
    - A place is where its on-her cut is bound to her skin, carried by that skin;
    - or, UNDER WHERE HER LEGS PART, for a point cut over the gap between them (`heldSpans`: further than 1.6 cm off
      her skin, `below` `hemOf(joints, 0)`), on the straight span between the places either side of it in its row --
      his "simple bridge… not cloth" -- put out of a leg that stands in the span's way to as far from that leg's line
      as it was CUT (`spanKeep`). By her legs' capsules' size alone, her leg over her knee being thinner than its
      capsule, every span beside it was put a centimetre out and the skirt stood in pleats from her knees to its hem;
    - and ACROSS THE CREASE AT THE TOP OF HER THIGHS, IN FRONT OF HER, taut from its ring to her thighs (`bridgeTo`: each
      front column's places from under its ring down to 4 cm under where her legs part, on the straight run from the
      one to the other; all of it within 50 degrees of her front, none past 85). A place bound to her skin goes where
      that skin goes, and there her skin FOLDS. MEASURED on the sheet's own points (the probe's `skirtPoints`), FIT 0,
      mid-stride, her front's middle column: its rows ran down her front to 83 cm, then stood 2 cm HIGHER and 1.5 cm
      further forward, and on down -- the part her thighs carry ridden up over the part her trunk carries: a ledge
      round a V of her front from hip to hip, in every stride. (A WRONG READING OF MINE FIRST: taken from the pictures
      for the sheet gone INTO her there, its paint showing, and two cures for that built and taken out -- every hollow
      of her spanned across, a place put out of her by her skin's own facing -- before the sheet's points were read.
      READ THE POINTS BEFORE A THIRD CURE.)
  - BETWEEN HER AND THE CLOTH HER SKIN IS THE SHEET'S OWN FLOOR (`between`, `ClothSkirt.outOfHer`,
    `sheetOutOfSkin`, `SHEET_FLOOR`). At rest the straight way from a place to its cloth is straight out of her; she
    does not stay at rest -- her places turn with her legs, and the cloth hangs and slides round her. So the sheet's
    points AS DRAWN are a third set of her skin's (after the cloth's and her places'), and once the cloth has been
    stepped her skin is walked under them WHERE THEY ARE (`ClothSkin.update`'s `again`: other slots served in the
    same frame, her pose read once). A point squarely behind the nearest of her skin, and no deeper than 6 cm, is IN
    her and is put straight out through that skin; one before it, or off an edge of it, and nearer than its
    stand-off: out to the stand-off the way it lies. The stand-off is between her places' and the cloth's.
  - ITS PAINTED PART'S LEGS (`skirtDraft.paintedLegs`, `fabricPanel.setDial`, the room's `laySkirtPaint`): to its hem
    under a skirt that lies ON her (FIT 0: what of her stands through a sheet 6 mm off her is in its colour); between
    her and the cloth less far, by how far its hem rides up her leg in a stride (`SKIRT_PAINT.rise`, 15 cm at FIT 1
    and that share of it: her paint goes where her leg goes and the sheet only part of the way); from FIT 0.6 to 1 less
    far again, to the short every skirt has (LEG LENGTH 0.12); and NEVER TO ITS HEM ITSELF (1.2 cm short of it), which
    is also what a skirt shorter than its short needed -- at LENGTH 0 the short's legs ended 9.3 cm under her hip
    joints and the hem was 8.0.
  - FAULTS FOUND IN ITS OWN PICTURES ON THE WAY, each fixed and told (all MEASURED 2026-11-17):
    - HER CALVES THROUGH IT FROM HER BACK, at every FIT from a quarter to three quarters, standing. Each row of the
      on-her cut was laid round its outline's own middle, a point in each column's direction from there; the
      cloth's is laid round the one upright axis at its ring, and her calves stand BEHIND that axis (her outline
      under her knees does not hold it at all). A point's place and its cloth were up to 8.6 cm apart round her leg,
      and the straight way between them cut the corner through the back of her calf: on her body file, half-way, 32
      of the pencil's 2,088 points under its ring inside her outline, 11.7 mm, all in its last four rows. At the
      nearest of her: none, in the pencil, the A-line, the mini and the maxi.
    - HER SKIN THROUGH IT IN A STRIDE: the pencil at FIT 0.5, three moments of a stride, the sheet's own points against
      her skin as the skirt poses it (the probes' `skirtPoints`, `skirtSkin`; `inside.py` beside the work): 17, 60
      and 53 of 2,160 under her skin, 8.1, 17.7 and 12.5 mm -- across the tops of her thighs and at her calves. (Kept
      out of her legs' capsules, as a span is: 12, 48 and 44, to 15.7 mm; taken out again. Her skin walked under where
      the sheet was drawn a frame BEFORE: two to five a frame left 1 to 2 mm under.) With her skin its floor where it
      is drawn: none.
    - HER PAINTED CALF UNDER ITS HEM: painted to its hem at FIT 0.5, about 6 cm of her painted calf under the sheet's
      hem at the back of her rear leg in a stride, like the leg of a short worn under it (`SKIRT_PAINT.rise`).
  - A WRONG READING OF MINE, THE SAME LESSON A SECOND TIME: THE MAXI'S SHELF ACROSS HER SEAT in a stride at FIT 0.5,
    taken from its pictures for the sheet torn by being put out of her skin (a row put up through the back of her
    seat, the next down through its underside). Three cures were built and taken out -- a point slid along its own
    way to her skin's plane (6 points left 43 mm under); the way halved until it was out (her skin's walk is local,
    and over centimetres it loses its place); the way first and then straight out (the shelf still there) -- before
    its rows were read down her back: it is the CLOTH's own fold, at FIT 1 as v0.9.43 has it ("The maxi walking",
    below), drawn half-way to her. READ THE POINTS.
  - TWO BUILDS OF IT BEFORE THIS ONE, the same day, each MEASURED in the room on the pencil skirt walking with the clock
    held (`SKIRT_FIT`'s comment has both): ON HER DOWN TO SOME HEIGHT AND CLOTH FROM THERE -- cloth let go on her legs
    is a tube as big round as her two thighs, 74 cm at her knees, and her stride wants 108 there and 131 at her calf:
    it rode up and stood in a crumpled roll at her knees; and CUT FIT OF THE WAY FROM ON-HER TO STRAIGHT, EVERY POINT
    TOLD WHERE TO BE (that share of the way to the straight cut as her pelvis carries it) -- that cut knows nothing of
    her legs: her knee came out through it, and as cloth drawn toward such places it was pulled through her legs. The
    cloth as it always was already goes round her legs; half-way between it and her is round them too.
  - MEASURED in the room (light skin, 1x, her belly at 0% but where said, no error on the page; walking with the clock
    held at a thirtieth; the sheet's points read against her skin, not judged by the pictures alone): the pencil at FIT
    0.25, 0.5 and 0.75 standing from her back, her side and her three-quarter, and at three moments of a stride each:
    none of its 2,160 points under her skin (standing at 73% as well); half-way and laid afresh as her walk begins,
    three moments: none; half-way on her 100 and 200% bellies, standing from her side and her back: none, its top under
    her belly; seated half-way it sits whole -- 12 points under her skin at the crease of her lap, 9.4 mm, in her
    paint's colour there (FIT 0: 5, 3.0 mm) -- where as cloth (FIT 1) it passes through the stool's edge as it did; the
    A-line half-way, standing and in two strides: none; the maxi half-way standing: none, and in four moments of a
    stride none, none, one (33.8 mm, at her seat) and two (16 mm, at its hem by her foot); the mini at LENGTH 0 from her
    front and her back: nothing of its painted part under its hem (its legs end at 0.076 of her leg). Her painted legs
    end at 0.526 of her leg under the pencil at FIT 0, 0.484 at a quarter, 0.442 half-way, 0.307 at three quarters and
    the short's own at 1; under the A-line at 0.376 and 0.292 (FIT 0, and half-way), under the maxi at 0.867 and 0.825.
    PICTURED FOR HIM at a phone's 2x: the pencil at FIT 0, 0.5 and 1 standing, walking and seated; the A-line and the
    maxi at 0 and 0.5; the mini at LENGTH 0.
  - WHAT IT COSTS (the build machine): cut again in 0.38 to 1.1 s at a FIT between (three sets bound to her skin
    where a skirt has one); striding at a FIT between, her skin 6.5 to 8.8 ms a frame and the cloth 2.3 to 5 (FIT
    1: about 5 and 4; FIT 0: 2.4 to 3.6 and 1.2 -- no cloth is stepped); 219 to 461 of the pencil's 2,160 points put
    out of her a frame, 18.1 mm at the most (standing 242 to 326, 2.1 mm). NOT MEASURED on a phone.
  - NOT RIGHT, AND NAMED: a narrow skirt as her walk begins ("As her walk begins", below); seated at a FIT under 1, the
    dozen points at the crease of her lap; a point or two of the maxi's under her skin in a stride half-way; HER SHOES
    stand through a maxi's hem, standing at a FIT under 1 and walking at any (her skin is the sheet's floor and the
    cloth's; her shoes are neither's); from BELOW, the mini at LENGTH 0 shows the ends of its painted part's legs
    between her legs (a leg's end under 0.08 of her leg: "A painted bottom, drawn" names it); HELD AT lets go of the
    cloth alone (at FIT 0 nothing falls); nothing of it has been measured on a phone.
- **AS HER WALK BEGINS A SKIRT IS LAID AFRESH, AS v0.9.43 HAS IT: LEFT HANGING WAS TRIED AND PUT BACK** (2026-11-17;
  the room's pose switch, `ClothSkirt.restart`). Her legs go from standing to mid-stride in ONE frame. The pencil's
  first pictures walking showed it rolled up to her knees half a second into a walk: laid afresh there it is cut
  through her legs, and for the half second it settles it keeps a quarter of its speed a frame -- it can not fall,
  and her striding legs walk it up them. For an afternoon a skirt was left hanging from standing to walking and back
  instead. MEASURED in the room with the clock held, at FIT 1, its hem's height from the floor all round and at the
  most:
  - the pencil (37.8 cm standing): laid afresh, 53.9 and 61.2 half a second in; left hanging 45.4 then -- but 73.8
    and 76.3 a fifth of a second in, at her thighs. Half-way to her (FIT 0.5; 39.9): laid afresh 55.5 and 59.1 half a
    second in and 46.4 by a second; left hanging 46.3. (The settling kept and nothing laid afresh: 63.6 and 74.4.)
  - the maxi (1.3 standing: it lies on the floor), a fifth of a second in: left hanging 56 and 92 -- its hem at her
    thighs --, laid afresh 7 and 9; the A-line (49.8) 70 and 85, and 54 and 56; the mini (66.1) laid afresh 69 and 72.
  Left hanging is worse for three of the four and no better for the pencil: it is as v0.9.43 has it. NOT FIXED: A
  NARROW SKIRT BEGINS A WALK BADLY, for half a second, at any FIT but 0. WHAT WOULD MEND IT, NOT TRIED: her legs' jump
  taken over several of the cloth's own steps on that frame (its contacts and her legs' capsules eased from where they
  were to where they are), or her pose itself eased from standing into the walk, as SIT is (`poseBlend.ts`).
  - Cut again WHILE she walks (a slider let go, her belly changed) it is laid afresh in mid-stride the same way, and a
    narrow one rides up for that half second (the pencil 69 cm at 0.3 s).
  - THE PENCIL AS CLOTH (FIT 1) CAN NOT TAKE HER STRIDE, AND IS HIS TO SAY: a straight skirt to her calf is 100 cm
    round at her hips, 108 stretched, and her stride wants 108 at her knees and 131 at her calf. It rides up in every
    stride -- its hem 44 to 53 cm from the floor all round, 60 at the most, where it hangs at 37.8 -- and its top
    stands off her hips in an ear. At FIT 0.5 it walks whole (41 to 46 cm), at FIT 0 clean. ASKED OF HIM: whether the
    pencil outfit should come at a FIT under 1.
  - THE MAXI WALKING, FOUND THE SAME EVENING AND NOT FIXED: IT IS v0.9.43's (the maxi had been pictured standing, at
    three sizes of belly, and never walking). In some strides its back folds into a roll across her seat and its hem
    is at her mid-calf: MEASURED down her back's middle column at FIT 1, 1.6 s into a walk at a thirtieth (that walk
    begun left hanging; pictured the same begun laid afresh, at a thirtieth and at a sixtieth), its rows at 104, 99,
    95, 92, 90, 91, 95, 97, 98 and 95 cm from the floor (standing: 107, 103, 100, 95, 92, 89, 85, 82, 78, 75) -- rows
    from under her seat stood ON it; gone 0.8 s later and back in a later stride. Walking, its hem is 10 to 29 cm
    from the floor all round (1.3 standing: it lies on the floor), and her shoes come through it. And begun left
    hanging, at a thirtieth, her calf stood through its back in two pictures of eight. ITS CAUSE IS NOT KNOWN;
    nothing was tried.
- **ITS CONTROLS** (Joshua, 2026-11-17: "is the length adjustable yet or not yet? Setting preset lengths first then will
  add customization like the painted bottoms?"). `skirtPanel.ts`, in the OUTFIT tab while the outfit has a skirt, plain
  DOM as the new tee's (`garmentPanel.ts`): LENGTH (chips MINI 15%, KNEE 40%, MIDI 66%, MAXI 100%: GAME TUNING), FIT
  (TIGHT, HALF, STRAIGHT), FLARE, HELD AT (its four anchors, each on or off) and SKIRT DEFAULTS (the outfit's own
  again). A line says where its hem is on her own joints ("LENGTH · 36% · 2 cm over her knee").
  - A SKIRT IS CUT AGAIN FOR EVERY ONE OF THEM, a third of a second and more: a slider shows as it is dragged (its line
    ends "let go to cut") and the skirt is cut when the finger lets go (`skirtShown`, `skirtWorn`, `skirtChanged`).
  - A SAVE KEEPS THEM (`skirtDraft.SkirtRecord`, `SavedClothes.skirt`): only where they are not the outfit's own -- a
    save from before, and a skirt nobody moved, hold none and are that outfit's skirt. They are part of how an outfit
    is MADE, as a painted bottom's sliders are (`characterSaves.sameMake`): a character who moves one wears an outfit
    of her own. Its top and whether a tee is tucked into it are the outfit's always (`adoptSkirt`).
  - The probe's `skirtSettings(patch)` moves them as the panel does and says what a save would keep; `skirt()` is as it
    was, a skirt of the probe's own over whatever she wears; `skirtPoints(of)` is the sheet's points as drawn (or its
    cloth's, or her places'), `skirtSkin()` her skin as the skirt poses it, `skirtParts(capsules, skin, floor)`
    switches a part of it off, `skirtRestart()` lays it afresh.
  - MEASURED in the built room opened as a phone (430 x 932 at 2x, a touch screen; light skin, no error on the page):
    the panel in the Outfits tab; HALF and MIDI by real touches, each landing on its own button -- "FIT · 50% ·
    half-way", "LENGTH · 66% · 20 cm over her ankle", the skirt cut again each time (shown and worn the same) and a save
    holding them; FLARE's own input moved to 60%: shown and not worn until it is let go, then cut; LEFT let go (its
    anchors front, back and right) and held again; SKIRT DEFAULTS: "LENGTH · 54% · 12 cm under her knee", "FIT · 100% ·
    straight from her hips", and a save holds nothing again. Its chips are 30 px tall and 49 to 121 wide, as the new
    tee's are (one style: `CHIP_CSS`) -- under the 32 px he asked of the face's swatches: TOLD TO HIM. NOT TRIED: a
    slider dragged by a real finger; a character saved and loaded through the Library on a phone
    (`tests/characterSaves.test.ts` holds the record).
- **ITS EDGE UNDER A TEE'S HEM IS DRAWN A PIXEL AT A TIME** (`clothSkirt.ts` `hiddenEdge`, `HIDDEN_EDGE`): the marks of
  what is under the tee ride each triangle as a number and a pixel past 0.15 of the way to a marked point is not drawn.
  Until then a triangle with any point marked was left out whole, and the edge ran in steps a row of triangles tall.
  Under FIT 1 what is left out is told by where the sheet is DRAWN (`ClothSkirt.shown`). MEASURED in the room 2026-11-17
  (light skin, 1x, 0%), the cloth tee over the mini and over the A-line, close from her three-quarter and her back: no
  triangle's teeth, and IT STILL STEPS A ROW AT A TIME in places -- two each side of her back over the mini, one by her
  hand over the A-line, three small ones over the A-line half-way to her (FIT 0.5). NOT RIGHT YET: a mark is one number
  a point (under the tee, or not), and where the marked row changes from one column to the next the line jumps a row.
  What it wants is HOW FAR over the tee's hem each point stands, as a length, so that the line drawn is the hem's own:
  not begun.
- **A WALK IS NOT A JUMP** (a fault found in those pictures, fixed and told; `clothSkirt.ts` `JUMP_SPEED`). A low skirt's
  ring is on her hips; in a long frame (a tenth of a second on the build machine) a stride carried it over 6 cm, which
  was read as a pose put on, and the skirt was laid afresh in mid-stride: crumpled round her thighs. MEASURED: 2
  restarts in 4.5 s of walking in the A-line and 5 in the mini; now none in either or with the tee, a jump being
  further than 6 cm AND than 3 m/s over the frame.
- **HOW SHE WALKS IN IT IS READ WITH THE ROOM'S CLOCK HELD** (a wrong reading of mine, found and told). The probe's
  `animate(seconds)` steps her at a sixtieth of a second; between two of a script's calls the room's own frames go on
  moving her, a tenth of a second and more at a time on the build machine, and a picture taken after one shows the
  cloth as that frame threw it. The skirts pictured walking on 2026-11-17 -- crumpled, gathered between her legs, a
  hole under a tee's hem -- were that, and were told to him as the skirt's own. `hold(true)` first, then
  `animate(seconds, 1 / 60)` (or `1 / 30`) and the picture. MEASURED so (light skin, 1x): the A-line at 0% at a
  sixtieth and at a thirtieth, the mini at 0 and 100%, the A-line at 100%, and the A-line under the cloth tee at 0 and
  100%: it swings with her stride and hangs, no restart, nothing gathered between her legs, no hole. At 200% the
  A-line GATHERS IN FOLDS BETWEEN HER THIGHS under her belly in some strides (its front is in the crease her thighs
  move in): named below. A phone's frames; a device that draws ten a second throws it about as the build machine does.
- HIS TWO SHEETS OF SKIRTS (`docs/reference/skirts/`): 31 pictures, 24 styles. As outfits: 4 (A-line, mini, maxi,
  pencil). By the numbers there are, not yet outfits: tube, skater, circle. Wanting something a skirt has not got:
  pleats (pleated, accordion, box, knife); tiers and layers (ruffled, layered, tulle, gypsy); an uneven or wrapped hem
  (asymmetrical, wrap, tulip, draped); shaped panels (godet, mermaid, paneled, bubble); a deep waistband in a second
  colour (yoke-waist).
- **HER NAVEL THROUGH A SKIRT OVER HER BELLY** (his, the same day: the side profile showed it, "but didn't show from the
  front… probably need to add the same thing for the skirt like the shirt"): drawn through the fabric as through the
  cloth tee (`clothDetail.ts`, `DetailSpots.cloth`), at the tee's NAVEL DETAIL. MEASURED at 100%, front and three-quarter.
- **A SKIRT IS A PIECE, AND A GARMENT CAN BE TAKEN OFF** (Joshua, 2026-11-20: "make the skirts as a layer to remove,
  different textures + custom import texture like the other ones… I can't remove as a bottom"; "check the cloth shirts as
  well"). The skirt is the outfit editor's BOTTOM piece `garment:skirt` (`fabricPanel` `garmentKind`): its material is
  named 'skirt' and its mesh is among the panel's (`meshes`), its points carry a REST PLACE for the weave (`clothSkirt.ts`:
  each point where it is cut, in the room's units, and its way out from the skirt's axis -- the weave triplanar there,
  so it stays on the cloth as it moves), so every fabric family, swatch, custom colour and a picture of his own are
  offered as for the cloth tee; an outfit's skirt opens in the ATHLETIC knit in its own colour. REMOVE PIECE on a
  garment's piece takes it off her (`FabricHooks.takeOff`, the room's `takenOff`: the skirt, the cloth tee, any modelled
  garment) until another outfit is put on; a save keeps the list (`SavedClothes.off`, `sameMake`). MEASURED in the room
  (light skin, 1x, 10%): the A-line in SWEATER and in FLAT, then removed (her bikini bottom under it); the cloth crew
  tee removed; no error on the page. NOT TRIED in the room: a picture of his own on the skirt (the same path as the tee's).
- NOT DONE, AND NAMED: seated, the CLOTH passes through the
  stool's edge and shows a hole at her side (pictured again at 0 and 100% on the new line: as it was; on her, FIT 0,
  and half-way it sits whole); her hands pass through it; it does not collide with itself; walking at 200% it gathers
  between her thighs; the maxi walking and a narrow skirt as her walk begins ("As her walk begins", above); a look saved in a low skirt on v0.9.41
  or v0.9.42 keeps the short it was saved with, its waistband on her belly, under a ring on the new line; at a big
  belly an over-belly ring is stretched round her and the cloth bunches in front; RECLINE and SQUAT not looked at;
  HELD AT lets go of the cloth alone (at FIT 0 nothing falls); the looser trousers and the jackets wait on it.
- After anything changes it: `tests/skirtDraft.test.ts`, `tests/skirtLine.test.ts`, `tests/skirtFit.test.ts`,
  `tests/clothSkirt.test.ts` (a skirt worn on a stand-in for her), `tests/skirtPanel.test.ts`,
  `tests/characterSaves.test.ts`, `tests/clothLayers.test.ts`, `tests/clothSkin.test.ts`; then the room: the four
  standing at 0, 100 and 200% (the probe's `skirt()` says `lineFound` 1), the A-line seated, and ALL FOUR walking WITH
  THE CLOCK HELD, from her back as well, their hems read as her walk begins (`skirtPoints`) -- and the pencil at FIT 0
  and 0.5 (`skirtSettings({ fit })`) standing, walking and seated, FROM HER BACK AND HER SIDE as well as her front,
  with the sheet's points read against her skin (`skirtPoints`, `skirtSkin`) and not judged by the pictures alone.

## A painted bottom, drawn

- **A bottom's edges are DRAWN, as a top's are** (Joshua, 2026-11-15: "Looks good!!! Let's work on all the bottoms…"; of
  his sheet of sixteen, the same morning: "Here is 16 bottoms ChatGPT did (you can save to your branch), but let's still
  fix the ragged edges for the painted bottoms to still work like pantyhose or tighter bottoms… this has a few looser
  ones which would need extra "fabric" to do, but not impossible"; "the length of the legs and top are still adjustable
  like how the painted bottoms work, just in a straight line on the body that also matches her (body) curves"). A
  template with a waistband or a leg's top, legs, and no top, leg cut or outline of its own (`bottomCut.ts`
  `isDrawnBottom`: the leggings, the shorts, the stockings and the socks; not the one-pieces, not her bikini's designed
  bottoms) is one paint layer whose edges the shader draws for each pixel (`fabricMaterial.ts` `FabricLayer.low`; a
  program has the code only while a layer wears one, its key ends `-low`, and her skin's program without one is the
  text it was, to the letter):
  - its WAISTBAND is the line it always was -- a height at her front's middle, at her sides and at her back's middle,
    eased round her (`waistLine`) -- now looked up at each pixel's own place on her REST skin with her skin's slip
    PULLED BACK through her skin's own stretch (`pulledSlip.ts`), so it lies on the skin it was put on and is a line at
    every size of belly;
  - its LEGS' ENDS, and a stocking's or a sock's top, are FLAT RINGS square to the bone they are on, CARRIED BY THAT
    BONE each frame (`legPlanes`, `setFabricLowLegs`; her thigh's, her shin's and her foot's bones: `boneCarry`), as a
    drawn top's sleeves are: how far along her leg a place is, is counted in her own rest lengths down her thigh's bone
    and on down her shin's (a leg her build has made longer keeps its hem at the same share of it), the two blended
    round her knee by where the skin lies at rest (`LOW_CUT.kneeBlend`, 4 cm). A leg's end cuts her LEG's skin (her
    bones say which, `limbSkin`: her seat and her hips' sides hang from her thigh bones and are among it); the rest of
    her under a waistband is covered whatever her legs do; her ARM's skin, which hangs beside her hips under any
    waistband, never (`fabricNotArm`: a first build painted her hands as gloves);
  - BANDS (`LOW_BANDS`: a waistband 3 cm deep, a hem 1.2 cm at each leg's end, a welt 3 cm at a stocking's top; a
    template's own in `CoverageParams.lowBand`; GAME TUNING): the bottom's own fabric a tenth darker with a seam, or its
    EDGING colour -- the editor's EDGING is offered for a drawn bottom as for a drawn top.
- **THE SLIDERS ARE AS THEY WERE**: WAISTBAND (FRONT), HIPS & BACK RISE, LEG LENGTH, LEG TOP move the same numbers
  (`withDial`), her paint per vertex (`paintTemplates.coverage`) is laid exactly as before for what reads it (a save,
  a brush, her navel's flattening, AUTO's detail), and A SAVED LOOK KEEPS ITS NUMBERS. MEASURED in the room by the
  editor's own inputs: a bike short's LEG LENGTH from 0.23 to 0.40 moved its legs' ends from 17.9 to 31.2 cm down her
  leg, its WAISTBAND from 0.39 to 0.20 and its HIPS & BACK RISE to 0.24 its line to those heights; a stocking's LEG TOP
  from 0.22 to 0.36.
- **WHY HER SLIP, AND WHY PULLED BACK** (`pulledSlip.ts`; MEASURED 2026-11-15 on her skin's points read out of the room
  at 0, 73, 100, 150 and 200% of her belly: a waistband's line found on her triangles, its turns from one triangle to
  the next counted, pieces under 1.5 mm left out). A value a vertex rides her points, and her shapes slide her points
  along her skin, each triangle by its own amount: the over-belly leggings' waistband, a line on her body file (3.4
  degrees at its turns' 90th percentile, 8.7 at the most), turned 29 and 49 degrees as the room draws her at 100%, 34
  and 67 at 0%, 29 and 75 at 200%. Her slip as `skinSlip.ts` tells it mends that at the sizes near her body file's and
  not at 200% (22 and 53): a slip is told where her points STAND and laid on her REST skin, and her belly's skin at
  200% is half as long again. Pulled back through the smooth movement's own stretch and turn at each point: 3.9 and
  6.5 at 200%, 4.0 and 6.3 at 150%, 4.3 and 5.7 at 100%, 4.8 and 6.7 at 73%, 6.1 and 11.4 at 0% -- no turn over 15
  degrees at any size. (`tests/bottomCut.test.ts` holds it on her body file's own `belly200` and `belly` morphs: 16.7
  and 61 torn, 4.0 and 7.9 pulled back; 31.0 and 68, and 5.7 and 20.6.)
  - IT STAYS ON HER SKIN, and is not held level in the room: the skin under an under-belly waistband stands 8.6 cm
    lower at 200% than on her body file (4.8 at 150%), and a line held level would cut across her bump. From her body
    file's 100% belly to none her skin keeps its heights (within 8 mm, from under her hips to under her bust) and comes
    in up to 13.8 cm: a level waistband is level at 0%.
  - IT IS WORKED OUT A LITTLE AT A TIME: her middle is 23,527 points (from 8 cm under her hip joints to 40 over them),
    a movement's smoothing costs a tenth of a second on the build machine, so it is a job stepped within a share of
    each frame (`fabricPanel.ts` `LOW_SLIP_BUDGET_MS`), kept a part for her shapes and a part for each morph and summed
    by their weights; the pull itself is 7 to 24 ms. A slider dragged leaves the line a few tenths of a second behind
    her shape, never the frame. MEASURED in the room: standing at 73% for three seconds, and walking for three, nothing
    is smoothed again (one movement more as her pose changes).
  - IT RIDES IN THE SHOW REGIONS OVERLAY'S ATTRIBUTE (`fabricMaterial.LOW_SLIP_ATTRIBUTE`): her skin's vertex shader
    has no attribute left, and her opening's area is drawn by a mesh of its own that reads her skin's attributes
    (`vulvaMesh.ts`, which reads this one where each of its points lies in her triangle, as it does her rest place).
    While SHOW REGIONS is on a waistband is looked up at her rest place itself.
- **A BAND IS SQUARE TO ITS LINE AS THE LINE LIES ON HER** (`waistAt`'s `across`; the attribute's fourth number,
  `PULLED_SLIP.across`): how much longer her skin is ACROSS her there than at rest, by the same stretch. MEASURED: at 0%
  her belly's skin is 0.55 to 0.6 as long across her in front, and 0.32 to 0.37 where an under-belly line climbs her
  hips; at 200% up to twice as long.
- **A WAISTBAND'S BAND STOPS AT A LEVEL LINE ABOVE HER CLEFT** (`LOW_CUT.bandFloor`: 2.6 cm under her hip joints; the
  top of her cleft is 3.45 under them), and an edge's distance is held to the edge's own range before its slope is
  taken. Between her legs WHERE A PLACE STANDS ROUND HER HAS NO MEANING: her axis comes out of her there. MEASURED in
  the room in a black edging, the under-belly cut at 0%: a band run to her crotch had its lower edge dotted and two
  dark ovals under its point; held to a depth by its line's height alone, black streaks from its corners down to her
  cleft; cut at the floor by a distance, a dashed seam along where its old edge ran. Drawn as two edges, each
  antialiased by its own slope -- inside the line by less than its depth, and over the floor -- none of them.
- **A PLACE IS NEVER NEARER A WAISTBAND'S LINE THAN IT IS UNDER THE LOWEST OF IT, OR OVER THE HIGHEST** (`waistAt`, the
  shader's `fabricLowInside`: the distance to a straight line, held to those two). The same place between her legs, in
  the garment's own edge: where a place's distance from her axis goes to nothing the line's climb round her goes to no
  end and the distance "square to the line" to nothing, a hand under any waistband -- drawn part cloth, part her skin.
  MEASURED 2026-11-15 on her rest skin (twenty-eight places a triangle, from 12 cm under her hip joints up to 2 cm
  under the lowest of the line): told to be within 1.5 cm of the line, 2,291 of 339,444 places under an under-belly
  line (the nearest a quarter of a millimetre, 2.8 cm under the lowest of it), 54 under a low rise, 22 under an
  over-belly one (24.8 cm under it), none under the high rise; the nearest within a millimetre of her axis, 3.8 cm
  under her hip joints. IN THE ROOM it was a pale hairline V under the point of an under-belly front, seen from below
  at 100% (its two strokes the two directions round her in which the line climbs), and one speck under an over-belly
  one. With the bound none of the places (`tests/bottomCut.test.ts`); between the lowest and the highest of a line it
  changes nothing, and a band's depth as it lies on her (below) reads the same to a tenth of a millimetre. Found in the
  pictures for him, fixed and told.
- **WHICH OF HER SKIN A PIXEL IS, IS READ INSIDE THE TRIANGLE THE PIXEL IS DRAWN FOR** (`fabricMaterial.ts` `vFabricLimb`,
  a `centroid` varying: 1 her arm's skin, -1 her leg's, 0 the rest of her). The flag steps from -1 to 0 across the one
  row of her triangles that joins her leg's skin to her trunk's -- up her hips' sides and along the folds of her groin
  -- and a pixel a triangle only partly covers is told the triangle's numbers AT THE PIXEL'S MIDDLE, outside the
  triangle, where they run on past its corners': on a triangle of that row seen thin, the flag ran on past 0 to a
  half, "her arm's skin", which no bottom covers -- and that part of the pixel was bare. MEASURED 2026-11-15 in the
  room at a phone's 2x, her legs whole in the picture, her front square on: three pairs of pixels a quarter her skin
  down each of her hips' outlines, and a few at her groin's folds -- at the same places of her from 170, 180 and 190
  cm, gone when she was turned 3 degrees, on a light stage and a dark one alike. WHAT IT WAS NOT, each tried first:
  the pixel's slope on a sliver of a triangle (held to a third of the edge's range, they stayed; there is no sliver
  there: the least of 596 triangles by her outline is 3 mm long); a hole through her (they do not take the stage's
  colour); what her points are told (the copies of a point at her texture's seams agree, at 10,780 places, in flag,
  slip and stretch). The cover's three parts shown as colours (a view put in the shader for an hour and taken out)
  were each all of it at the pixel's middle; the cover itself was 0.9 there. Read inside the triangle the flag stays
  between its corners': none of them, at the same pixels, the high rise in black and the capri in charcoal. Found in
  the pictures for him, fixed and told.
  - A PROBE THAT STAYED: `bodyAttribute(name)` hands back one of her skin's attributes as it is laid (base64 Float32),
    beside `bodyPoints`.
  - THE SAME IN A DRAWN TOP, v0.9.27's (a fault found, fixed and told): `fabricCutAt` read the flag at the pixel's
    middle too, and on that row a part of a pixel was told "her arm's skin" -- cut by the sleeve's END and not the
    hem, which at her hips is bare unless the sleeve reaches that far down her arm. MEASURED the same hour, a
    short-sleeved tee to her hips in charcoal, the same view: the same pairs of pixels at the same places, a fifth
    lighter (102, 99 and 94 where the cloth is 78); a long-sleeved one had none. So the flag is read inside the
    triangle by EVERY program of her painted skin (`vFabricLimb` beside `vFabricAux`; the fabric program's key is
    `-v18`; `tests/topDetails.test.ts` holds its text's hash, and `tests/bottomCut.test.ts` the same). After: 91, 77
    and 77 there.
  - LEFT IN THE TEE, AND NAMED: a line a tenth lighter, a pixel wide, along that row at her hips' outlines (83 to 91
    on 78; with its drape hidden as well: 80 to 90), where the capri has none. ITS CAUSE AS THE CODE READS, NOT
    MEASURED: a top's cut MIXES ITS TWO DISTANCES -- to its hem, to its sleeve's end -- by the flag and draws one
    edge from the mix, a pixel wide by the mix's slope; a pixel's slope is told from its neighbours, the neighbours
    of a partly covered pixel are still told the flag past the triangle's corners, and the edge can take up to 7% of
    the cloth off. A bottom keeps each edge its own and mixes the two COVERS by the flag (`lowLine`), and has no such
    line. Not changed in a top: its armhole at the row that joins her arm to her trunk is drawn by that same mix.
- **HIS SHEET OF BOTTOMS' TIGHT ONES ARE STYLES AND OUTFITS** (`docs/reference/bottoms/`; GAME TUNING to it, on her at
  0%: her navel is 12.2 cm over her hip joints, 0.232 of her trunk -- MEASURED): 01 HIGH-RISE LEGGINGS (`leggingsHigh`:
  `RISES.high`, 0.39 in front and 0.38 round her, level a hand over her navel; its band 10.5 cm deep, its seam 2.3 cm
  under her navel -- at 7.5 it ran through her navel's hollow), 02 LOW-RISE LEGGINGS (`leggingsLow`: `RISES.low`, 0.125
  in front, 0.175 over her hips, 0.2 behind; its band 4.5 cm), 03 OVER-BELLY and 04 UNDER-BELLY (the two there were,
  as they were), 05 CAPRI (`leggingsCapri`: the high rise to 0.72 of her leg -- it was the over-belly rise to 0.78) and
  06 BIKE SHORTS (`shortsBike`: the high rise to 0.23 -- it was the under-belly rise to 0.36). A look saved before
  keeps the rise and length it was saved with, and on a rise that is not its style's now it wears the plain band
  (`wornParams`: a hand-deep band is its style's own rise's). Each is an outfit in his sheet's colour
  (`sarahLabTool.ts` `SHEET_BOTTOMS`) under the grey crop tee his figures wear, its hem at 0.42 (`PaintedLayer.dials`:
  a built-in outfit may set a template's sliders), put after everything there was: `painted high-rise leggings`,
  `painted low-rise leggings`, `painted over-belly leggings`, `painted under-belly leggings`, `painted capri leggings`,
  `painted bike shorts`.
- **A BOTTOM'S STYLE PICTURE SHOWS ITS WAIST** (`stylePictures.ts`): his sheet tells a high rise from a low one by its
  waistband, each figure in a crop tee, and under a tee to her hips the four full-length leggings were one picture four
  times. A bottom is pictured under the pale CROP tee, its hem where his sheet's outfits have it (0.42), from the floor
  to just over that hem (`STYLE_FRAME.bottom.to` 0.82; it was 0.74 under a tee to her hips). Legwear is as it was, under
  shorts and a tee. GAME TUNING.
- **THE PICTURES BAKED AGAIN** (2026-11-15): the twenty-seven outfit cards that wear a drawn bottom, his six among them,
  and the eighteen style pictures that show one's edge or a bottom's new frame -- the twelve bottoms', the three
  legwear's, and the sports bra's, the crop top's and the bandeau's, whose leggings' waistband is seen. The other
  twenty-two styles' are as they were (a top to her hips covers its leggings' waistband, and its picture ends under her
  hips, over her leggings' ends). BOTH BAKES WAIT FOR HER SLIP (`SarahLabScene.ts` `lowSlipSettled`): a picture taken
  before it lands is of a line on her rest skin, torn.
- MEASURED in the room 2026-11-15 (the build machine's software renderer, the base model at 0% unless said, no error
  on the page): each of his six from her front; the high rise from her three-quarter, her side and her back, squatting
  (front and side), seated and with her legs apart; the low rise from her three-quarter and her back; the capri and the
  bike shorts from her three-quarter (and the bike shorts put on by its card: the tee's hem where the outfit sets it);
  the over-belly leggings' waistband under the sports bra, the one that was torn; the under-belly band in a black
  edging at 0% from her front and her three-quarter (and the short shorts', which is the same line, from below), and
  at 100 and 200% from her three-quarter and from below; every short and legging length and the stockings, knee socks
  and crew socks standing, squatting and seated, their hems close. And for him, at a phone's 2x on the build as
  committed: his six from her front, the over-belly and the under-belly at 100% from her front and her side as his
  sheet has them; the over-belly waistband under the sports bra, the high rise's band and her ankles close; the bike
  shorts with LEG LENGTH and WAISTBAND moved in the editor.
- A BAND'S DEPTH AS IT LIES ON HER (MEASURED on her skin's points from the room: from the band's inner edge straight
  to its line): the high rise's 10.5 cm is 11.3 at 0%, 11.6 at 100%, 12.1 at 200% (a band is counted by height, and
  her belly's skin leans); the low rise's 4.5 is 4.8, 5.0, 5.1; an under-belly band's 3 cm is 3.1 to 3.2 where its
  line runs level at every size, and BESIDE WHERE IT CLIMBS HER HIPS 1.7 at 0%, 2.4 at 73%, 2.9 at 100%, 3.2 at 150%,
  3.4 at 200% (by her rest skin alone: 1.3 at 0%, 5.2 at 200%).
- NOT DONE, AND NAMED:
  - THE LOOSER TEN of his sheet (07 running shorts, 08 denim shorts, 09 jeans, 10 wide-leg trousers, 11 cargo pants,
    12 joggers, 13 flared yoga pants, 14 and 15 the skirts, 16 the skort): they hang off her and want fabric of their
    own over the paint. He is shown the first before the rest.
  - (SUPERSEDED 2026-11-16 by the hoop's plane, "The under-belly waistband (a hoop)" below: its band is one depth.)
  - BEFORE: AN UNDER-BELLY BAND WAS NARROW BESIDE WHERE ITS LINE CLIMBS HER HIPS, half its depth at 0% (above). Its cause is
    known: a place's distance is told by the line's slope AT THAT PLACE ROUND HER, which is the distance to a straight
    line, and at 0% the whole climb, from her front to her side, is 3 cm of her skin across her (11 on her body file)
    -- past her side the line "there" runs level 10 cm above. TRIED offline (`bottomCut.waistAt`'s comment): the
    distance to the line itself, its heights eight steps either side of a place: 3.1 cm at 73%, 3.4 at 100%, 3.3 at
    150%, 3.4 at 200%, and 2.0 at 0% (her skin's length across her changes threefold within the climb, and a place
    has one number for it) -- nine looks at the line a pixel, for a band nobody would tell apart: not taken.
  - THE OTHER SHORTS AND THE KNEE-LENGTH LEGGINGS KEEP THEIR MATERNITY RISES (short and mid-thigh shorts the
    under-belly's, knee shorts and knee leggings the over-belly's): on the base model at 0% an under-belly front is a V
    down to her pubic bone, cut for a bump. ASKED OF HIM, with a picture.
  - the under-belly line's corners (where its level front turns up her hips, and where it levels at her sides) are the
    line's own easing, a centimetre and a half round, and are seen as corners now its edge is crisp; it keeps a
    handful of sharp turns where it crosses the creases at the tops of her thighs, as it does on her body file.
  - his sheet's deep bands have a seam that dips at her front's middle; ours is level with the band's top.
  - a leg's end between her legs (LEG LENGTH under about 0.08) and a waistband dragged under the floor: not looked at.
  - FOUND, NOT ACTED ON (the room's `vulvaCopies` probe: her opening's area has 752 places where pieces of her texture
    meet, a copy of the point for each piece, 779 copies): the copies are laid at one place (0 mm apart), with one
    rest place, one slip and the same weights -- but they are told her rest NORMAL, her limbs' and her drapes' flags
    and her paint through her texture's own copy of a triangle, and disagree (her normal by up to 1.3 at 768 of them,
    a flag by 1 at 25, her paint by 0.04 at 155). Nothing drawn was traced to it.
- A SKETCH WITHOUT A BROWSER: `npx tsx scripts/preview/bottom.mts --template shortsBike` (`--all`: every drawn bottom, a
  row each), her rest shape from four sides, each pixel asking the cut as the shader does.
- After anything changes a bottom's cut, its bands, her slip about her hips or the edge's lines:
  `tests/bottomCut.test.ts`, `tests/pulledSlip.test.ts`, `tests/topDetails.test.ts` (her skin's program without a
  bottom), `tests/stylePictures.test.ts`, `tests/sarahLabFabric.test.ts`; then the room: the high rise, the low rise
  and the under-belly leggings from her front, three-quarter and back at 0%, the under-belly at 100 and 200% and from
  below in an EDGING that is not its fabric's, short shorts' hems standing and squatting, her slip's state
  (`paintLowState`: not `pending`, nothing smoothed again while nothing changes) -- and, at a phone's 2x with her legs
  whole in the picture and her front square on, her hips' outlines and the point of an under-belly front from below
  READ PIXEL BY PIXEL for single lighter ones (both faults above were a pixel or two wide).

## A painted one-piece, drawn

- **The swimsuit and the leotard are a drawn top with no hem and her bikini bottom's two leg openings** (Joshua,
  2026-11-16: "finish the swimsuit and leotard as those two still have jagged edges all over it including between the
  legs and underneath"; "use the bikini bottom work to set the size between the legs and when you do it, do it both
  standing and reclined to make sure it covers every and down to that approximately 3cm width"). `topCut.ts`
  `isOnePiece` (a leg cut, a neck opening, no top edge of its own: `bodysuit`, `swimsuit`; the full bodysuit has no
  leg openings and is as it was). One paint layer with BOTH:
  - a top's `cut` (the leotard a crew tee's neck and long sleeves; the swimsuit the tank's outline, `top: 'tank'`), its
    hem told far under the floor (`paintTemplates.ONE_PIECE_HEM`);
  - a designed `field` (`public/models/paint/sarah-v2-one-piece-field.png`, written by
    `scripts/designAthleticBottom.mjs` beside the bottom's own: the bottom's two leg curves WITHOUT its waistband, in
    the bottom's block, looked up on her legs-apart skin by the same numbers), `open`: outside the block her trunk is
    the garment and her leg's skin is not. The layer is there where the cut and the field both have it
    (`fabricMaterial.ts`: `fe = min(cut's edges, field's edge)`, her arm's skin left to the cut alone). Between her
    legs it is the bottom's own strip: 4.2 cm at the front of her crotch, 3.3 under it, 2.8 between her cheeks.
  - The cut is laid only once the field is in (`fabricPanel.ts`): until then it is the per-vertex paint it was.
- **LEG CUT HEIGHT is not offered for a one-piece** (`dialsFor`): its leg openings are the drawn line, one height.
  NECKLINE and the leotard's SLEEVE are as they were. TOLD TO HIM; a higher or lower leg wants a second line drawn.
- Two faults met and fixed on the way: with the hem told as -Infinity her arms were half covered (a NaN in the mix of
  the hem's and the sleeve's distances); and with it metres under her a dotted hairline ran down the front of each of
  the leotard's shoulders (the trunk's distance from that hem against the sleeve's, across the one row that joins her
  arm to her trunk: many ranges a pixel) -- a one-piece's two distances are held to 12 cm before they are mixed.
- MEASURED in the room 2026-11-16 (the light skin, the base model at 0%, no error on the page): both from her front,
  three-quarter, side, back, from below in front and behind; LEGS APART from her front and below; SQUAT; RECLINE from
  her front, low and three-quarter: one smooth line round each leg, covered between her legs in each.
- NOT DONE: no band or edging at the leg openings; not pictured on a bump (the field is the bottom's, which is).
- After anything changes it: `tests/topCut.test.ts`, `tests/topDetails.test.ts`, `tests/bottomCut.test.ts`; after the
  bottom's curves change, run the design script (it writes both fields); then the room, standing, apart and reclined.

## The catsuit, and a one-piece's neckline to a turtleneck

- **THE CATSUIT IS DRAWN** (Joshua, 2026-11-20, sharing two of his characters in it: "look at the catsuit's edges (neck,
  arms, feet) and neckline"). The full bodysuit (`bodysuitFull`, `top: 'catsuit'`, `topCut.isCatsuit`) is a drawn top
  with NO HEM (`hasNoHem`: its hem told far under the floor, as a one-piece's) -- its neck opening and its sleeves drawn
  as a tee's -- and its legs end in a DRAWN BOTTOM'S RINGS (`fabricPanel` `catsuitLegs`: `lowSpec` with no waistband), a
  cuff at each, at its LEG LENGTH (offered: a catsuit to a capri). In the shader a layer with a cut and a `low` beside it
  is there where the cut has it and, on her leg's skin, inside its rings (`fabricMaterial.ts`, the low line's
  `fe = min(fe, mix(1, flg, fabricLegShare))`). Its paint a value a vertex is laid as it always was (what reads it).
  As a one-piece's, its cut is the ONE cut worn at a time (the topmost).
- **NECKLINE · LOW → TURTLENECK, NECK WIDTH, NECK SHAPE** (Joshua, the same morning: "Can we make the neckline adjustable
  from a low V-U, to up a mid-neck turtleneck?"; "do the same for the swimsuit and leotard… Make the length adjustable,
  but also the width of the neckline and shape like some of our other outfits"). On the catsuit, the leotard and the
  swimsuit (`takesTurtleneck`), in place of NECKLINE: `topCut.NECK_RANGE` -- the neckline from 0.6 of her trunk up past
  the base of her neck (1) to 1.1, where from 1 its rim is a COLLAR level round her neck (`collarAt`, `TopCutSpec.collarY`)
  up to 5 cm over her neck joint (MEASURED on her body file down her front's middle: her neck's front 6 to 7.5 cm ahead
  of her neck joint from 3 cm under it to 6 over it, the underside of her chin from 6.5 cm over it -- so the collar is
  on her neck, never her chin); NECK WIDTH 0.6 to 1.6 of the shape's own width (`neckWide`; a swimsuit's straps' inner
  edges, never past 1.2 cm inside their outer); NECK SHAPE chips CREW · U · V · SCOOP · SQUARE (each at its tee's own
  depth, `DRAWN_NECK`) and TURTLENECK (`neckShape`, over the template's style or the outline's own). A swimsuit taken
  past the base of her neck wears the mock neck's collar front and back: a sleeveless turtleneck. All GAME TUNING.
  A look saved before keeps its numbers (`neckShape`, `neckWide` absent: the style it had, its own width).
- **A NECKLINE UNDER A CREW'S HAS NO CLEAVAGE BRIDGE** (`fabricPanel.ts` `LOW_NECK_NO_BRIDGE`, 0.9 of her trunk: the V,
  U, scoop and square tees and every low one have none; a crew, 0.966, keeps its). MEASURED 2026-11-20 in the room, a
  low V and a low U (0.7) at her 10% and 73% bellies: from her three-quarter a notch in the far side of the rim at the
  sheet's top, gone with the sheet left off; then (Joshua, of the V and U tees at 0.78: "from the side view… I see a
  spike in the paint") the same spike at the V's point and the U's foot. Pictured without it: the V, U, scoop and square
  tees at 10, 73, 150 and 200% from her front and three-quarter, clean.
  TRIED AND TAKEN OUT the same morning: the sheet folded down to a little over the neckline's lowest point (its top rows
  stood across the opening as the garment), and seen only up to there (her skin behind it was cut in steps).
  Pictured after: the low V and U from her front and three-quarter, clean; the V and U tees as they were.
- **A CHEST CUTOUT** (Joshua, 2026-11-20, of another game's bronze catsuit cut out over her chest: "can add as a new style
  with a cutout which is adjustable"). `topCut.CHEST_CUTOUT`: a hole in her FRONT's drawing alone (`cutOut`, after the
  neck opening or the collar is drawn), so its edge is drawn and banded as the neck opening's is; OVAL, DIAMOND or
  KEYHOLE (a round hole with a slit up through the neckline), CUTOUT WIDTH, HEIGHT and DROP under her neck joint in cm
  (`CoverageParams.cutout`, `heldCutout`'s stops); its chips CHEST CUTOUT · NONE OVAL DIAMOND KEYHOLE beside NECK SHAPE on
  the catsuit, the leotard and the swimsuit; a piece with one has no cleavage bridge. A new style, `catsuitCutout`
  ("Catsuit, chest cutout": a diamond 9 by 8 cm, 13 cm under her neck joint, at the top of her cleavage -- her breasts'
  tops 11 cm under it, MEASURED on her body file). GAME TUNING. PICTURED in the room (light skin, 1x, his copper) at her
  10% and 73% bellies from her front and three-quarter: each shape, a keyhole under the turtleneck, a big diamond, an oval
  on the swimsuit -- clean, each with its band. Its per-vertex paint has no hole (what reads it: a save, a brush).
- `tests/topCut.test.ts` (its last describe); after anything changes them, the room: the catsuit at each shape, low and
  wide, at the collar's top from her front, side and back; the swimsuit and the leotard at a shape and a collar.

## The under-belly waistband (a hoop)

- **One plane on her as she stands** (Joshua, 2026-11-15, of the edging still uneven after a day on her rest skin: "Try
  doing body line but set the front just below the belly with the high at just above the hips at that approximate 35°…
  in a straight line all around… then we can work on tweaking the sides to be more rounded"). An under-belly waistband
  (`leggingsUnder`: a hoop, `spec.hinge`) is drawn by `bottomCut.ts` `planeAt` at every size of belly (`planeShare`): the
  hoop's own swung surface told ON HER SHAPED SKIN and nothing of her rest skin's, so nothing of how far her skin is
  drawn out under her belly. Its band is the same distance over its own slope (`fabricLowNearTo`), 1.5 cm
  (`UNDER_BELLY_BANDS`; he asked for half the 3 cm, "or better yet, make it adjustable").
- **EDGING WIDTH (CM)** is a slider of every drawn bottom's waistband (`paintTemplates.ts` the `band` dial, `BAND_DIAL`:
  0.5 to 12 cm; it moves `lowBand.waist`, and a saved look keeps it). A HOOP's is held to 1.5 cm (`hoopMax`): MEASURED
  in the room at 0, 100, 150 and 200%, to 1.5 its band is whole; at 2 a tooth at her front's middle at 0% and specks
  under her belly at 150%; from 2.5 its inner edge breaks up in the fold. So for the under-belly leggings the slider
  only narrows it. `tests/bandDial.test.ts`. PICTURED on other waistbands (the low rise at 2, 4.5 and 8 cm, the bike
  shorts at 1 and 6): whole at each.
  WHY A HOOP'S WIDER BAND BREAKS (Joshua, of the pictures at 3 and 6 cm: "why does the black line look like it is cut
  off on the last 2 images? I would fix before pushing"): its band is "how far inside the edge" told as the surface's
  number over its own slope -- right beside the edge, and less and less a distance further in, where her skin turns
  (the slope is one number a triangle: a ragged inner edge); and under her belly her LEG's skin is measured from the
  lifted surface, which stands clear of the crease, so it has no band at all within 1.5 cm and patches of one within
  3. TRIED 2026-11-16 and taken out: her leg's skin there told how far it is from the fold's own edge -- the band ran
  on across her thighs' tops at 3 cm, with holes in it at 150% and a ragged inner edge at 100%. A wider band on a
  hoop wants a distance worked out on her skin itself, not a number over its slope: its own piece of work.
  The older machinery there (the line on her rest skin, her crease, the moon, `FOLD_LINE`, the band's stations) is still
  worked out and is not drawn for a hoop: to be taken out once he is done with the shape.
- **The fold under her belly** (`LOW_CUT.foldDepth` 4.6 cm in front of her axis at her middle, `foldCurve` less further
  out): in front of it the surface runs level and her TRUNK's skin is bare (her belly's underside), out to 13 cm from her
  middle and eased off by 16 (`foldDeepIn`, `foldOut`; ended sooner, cloth climbed her belly's flank -- MEASURED).
- **Its front comes down with her belly** (`planeFront`; his orange line level across her hips at 0%: "it can be slightly
  flat, but would like a slight downward curve"): 3 cm under her side's height while the middle of her front stands 8.5 cm
  ahead of her axis and less (0%), the waistband's own front from her body file's 100%, straight between.
- **Its front rises to the crease her belly hangs from once it has swung** (his yellow line over v0.9.30 at 200%: "how
  much higher to go up, basically, 1cm above the opening"; `planeRise` 4.5 cm). MEASURED on the room's points at 200%: the
  swung surface's front is level with the BOTTOM of her belly (9.9 cm under her hip joints) and the skin from her
  opening forward to that crease runs nearly level 6.4 to 7.5 cm under them -- lifted just onto it (2 and 3 cm tried) the
  two lay along one another, a smeared band and a bare patch. So it is lifted well clear and the edge in front is the
  fold's. Eased to `planeRiseSide` (0.55) of itself from 7 to 16 cm out and HELD round her hip, run out toward her back
  by `planeRiseAhead` at her middle and the longer `planeRiseAheadSide` at her side.
- **From her side it is one smooth curve from the top of her hip to under her belly** (his orange arc, and in words: "a
  smooth curve downward from top of hip cheeks to the pelvis… at about 45° view, the look should be downward to level…
  front/back view straight line with a max of 30° between up and down slopes"; a drawing of it made for him was
  passed, "You got it right").
- **A WAISTBAND'S LINE CLIMBS THE SAME EITHER SIDE OF HER SIDE** (`waistLine`, the shader's `fabricLowLine`; a fault
  found for his "black edging with pokes in it and not like one smooth line"). The line is two runs that meet at her
  side; a front BOWL (`UNDER_BELLY_BOWL` 0.7, his "not so V shaped but like a U") read the run from her side
  (1 + bowl) times as steep as the run from her back ends: a corner in the edge at her side and a spike in its band,
  where her leg's skin meets her trunk's (MEASURED in a sketch at five times the size, at every setting of the lift).
  The run's first slope is told 1 / (1 + bowl) of the sweep's. Not the lift, not the fold's guard, not her leg's skin.
- MEASURED in the room (the light skin, 1x): 0, 100, 120, 150 and 200% from her front and the side view he marked, 200%
  square from her side and from behind-below: one line, its band one depth.
- A SKETCH WITHOUT A BROWSER reads the room's own points (her shaped skin read out at each size): keep one beside the
  work -- the room's pictures cost minutes, a sketch three seconds -- AND JUDGE BY THE ROOM: a sketch draws the band by
  the raw number, the room by the number over its slope.
- A CLOTH SKIRT UNDER HER BELLY HANGS FROM THIS LINE (`bottomCut.hoopInside`: how far inside the hoop each point of her
  skin is, as `planeAt` tells a pixel; "The skirts": its ring is laid where that is 8 mm).
- **ITS HEIGHT FOLLOWS HER BELLY SLIDER** (Joshua, 2026-11-23: "Is there a way when doing under the belly leggings for it
  to automatically adjust the height so instead of programming each % in, it does it automatically with the slider?";
  `paintTemplates.ts` `UNDER_BELLY_FOLLOW`, `followedAt`, `CoverageParams.follow`). His five settings, set by eye on his
  character Blaze: WAISTBAND (FRONT) 0.13, -0.03, -0.06, -0.04, -0.05 and HIPS & BACK RISE 0.37, 0.33, 0.30, 0.27, 0.24 at
  her belly slider's 0, 50, 100, 150 and 200% (GAME TUNING, his), read on the straight line between two, held at the
  ends. The two sliders move it ON TOP of his settings, and what they moved it by is kept at every size
  (`withDialAt`); FOLLOWS BELLY (a chip over them, `FABRIC_ACTION.follow`) off leaves it where it is (`withFollow`).
  The panel lays it again as her belly changes, at most every 250 ms while the slider is dragged (a laying is 37
  to 52 ms on the build machine) and at the size it rests on (`fabricPanel.ts` `layFollow`, the room's `bellyPct` hook): not a change by hand. A LOOK SAVED BEFORE keeps
  its numbers: untouched it follows; with its rises set by hand it keeps them, FOLLOWS BELLY off, until it is pressed
  (`wornParams`). Her outfit is the same make at any size of her belly (`characterSaves` `make` leaves a following
  waistband's rises out). The skirt's ring (`hoopOn`) is laid on the style's own line as before. MEASURED in the room
  (light skin, 1x, no error on the page): its two sliders read 0.13 / 0.37, 0.05 / 0.35, -0.03 / 0.33, -0.04 / 0.32,
  -0.06 / 0.30, -0.05 / 0.29, -0.04 / 0.27, -0.04 / 0.26 and -0.05 / 0.24 at 0, 25, 50, 75, 100, 125, 150, 175 and 200%; WAISTBAND (FRONT) moved 0.05 up at
  100% read 0.18 at 0% and 0.01 at 150%; FOLLOWS BELLY off at 150% stayed 0.01 / 0.27 at 50%, and on again was his 50%'s.
  Pictured from her side and three-quarter at 0 to 200% by 25s: just under her belly at each, one smooth line.
  `tests/underBellyFollow.test.ts`.
- After anything changes the hoop: `tests/bottomCut.test.ts`, `tests/skirtLine.test.ts`; then the room at 0, 100, 150
  and 200% from her front, the side view he marked and behind-below -- and a low skirt at 100 and 200%.

## A modelled garment and the shapes laid on her afterwards

- **Her bikini top takes her milk's and her baby's weight's shapes from her skin** (a fault Joshua found, 2026-11-14:
  "There is a bug for the breasts when wearing a bikini 👙 where when I add more "Milk" size, it doesn't follow the skin
  but everything else doesn't. I set everything at max (size) and it covered but milk for some reason didn't… should
  fix soon…"). Those two are laid on her BODY from files of their own (`zeroRefine.ts`: `shape:milk:`, `shape:baby:`),
  made after her body file was: a garment modelled in that file has her bust's SIZE and her belly, and none of these.
  The room gave them to the recovered shirts and leggings (`SarahLabScene.followMissingGarmentFields`,
  `garmentShapeTransfer.ts`: each of a garment's points moves as the place of her rest skin nearest it does) and never
  to her top. MEASURED in the room on v0.9.23 and v0.9.24 alike: at MILK 50 and at 100 her breasts were out through
  both cups, a sliver of each cup left under them. Now `FOLLOWS_HER_SHAPES` (`sarahLabTool.ts`: her bikini, its
  edging's parts with it, by the name of a part's material) names the garments of her body file that are given them the
  same way. MEASURED after, in the room, her belly at 0%: her cups cover her at MILK 50, at MILK 100, and at MILK 100
  with SIZE +100; as the room opens her and at SIZE +100 alone she is as she was.
- Her body file's tee and swimsuit, off the menu, are not named there: they have not been read in the room with it.
- **Her top's strings are evened along themselves** (`cordEvening.ts`; `GarmentShapeTransfer.syncSet`, her top's twelve
  parts bound as ONE garment; a fault found in the pictures of the one above). One of her shapes moves her skin's SHAPE
  and SLIDES her skin's points along her skin, each of her triangles by its own amount (her slip, `skinSlip.ts`);
  nobody sees the slide on her skin or on a cup lying on it, and a string, a line across her, turns a corner where it
  passes from one of her triangles to the next -- and a string that spans the air (her neck strings stand up to 15 mm
  off her, the string between her cups 7) has no one place of her under it: the nearest changes sides from one of its
  rings to the next. MEASURED on the room's files at MILK 100, her belly at 0% (the roughest of her milk's shapes): a
  neck string turned 50 degrees more sharply than at rest over 9 mm of it, the string between her cups 20; a string's
  rings, 1.5 mm apart, stepped up to 2.1 mm from one to the next. So, for a STRING (a cord point 6 mm or more from every
  panel):
  - its move is the mean of the cords' moves round each point, weighed by a bell that is nothing `reachM` (18 mm) away;
  - a point lying on her (within 1.5 mm at rest) keeps its own share OUT FROM her skin, takes the evened share ALONG
    it, and is lifted off her by up to 0.4 of how far that slides it (what else shapes her turns her skin under it); a
    point that spans the air (4 mm off her or more) takes all of the evened move;
  - it eases to her skin's own numbers over its last 6 mm to a panel, so its end stays on the cord it is tied to.
  MEASURED after, the same files: no string turns more than 12.7 degrees more sharply than at rest (a neck string,
  where the top of her breast rises under it) or steps its rings more than 1.2 mm; none is moved more than 2.7 mm from
  where her skin alone put it; of its points lying on her none is under her skin, and none is nearer her than it was
  by more than 0.04 mm (lifted 0.42 at the most). At her 100% and 200% bellies' milk: 7.8 and 5.1 degrees (her skin
  alone: 17.8 and 16.3). In the room: her neck strings run as lines at MILK 100, and with SIZE +100 as well. The
  evening is built once (under 0.1 s on the build machine) and costs about 10 ms a shape after.
  `CORD_EVENING` is GAME TUNING: `reachM` is the one to turn (MEASURED, the same files: at 9 mm a neck string is left
  23 degrees sharper than at rest, at 12 mm 18, at 18 mm 12.7, at 27 mm 11.6 -- and moved 3.4 mm from her skin's
  place).
- **A PANEL, AND THE CORD SEWN ROUND IT, ARE NEVER SLID ALONG HER APART FROM HER SKIN.** A cup lies half a millimetre off
  her, and it covers her because it and her skin under it are moved BY THE SAME NUMBERS. A first build evened each
  cord and each cup's edge with it: edges and strings ran smooth, and at SIZE +100 with MILK 100 a chip of her skin
  stood through a cup's edge (MEASURED in the room, 2026-11-14) -- a slide along her skin as she rests is under her
  skin as soon as another of her shapes turns it. So her cups and the cord round each (a cord point within 2 mm of a
  panel: all of those two cords' points are within 1.63) are exactly as her skin alone has them, and
  `tests/bikiniTopMilk.test.ts` holds them to it.
- NOT FIXED, AND WHY: at MILK 100 each cup's EDGE by her arm runs in small waves, and its top corner in a notch (the
  cord round a cup turned 44 degrees more sharply than at rest, its rings stepped 2.6 mm). It is her milk's own
  slide, and by the rule above it can not be taken off her top alone. The cure is at its source: her milk's shapes
  baked again with an even slide (the same shapes; her skin's points sliding along her evenly), which is a change to
  a shape he approved -- TO BE ASKED OF HIM, with before and after. Tried offline on her skin's points (each taking
  the mean of its neighbours' slides, eight times over): the cord round a cup 9 degrees, a neck string 8, with nothing
  evened on the garment at all; but some of her skin's points then slide a centimetre from where they do now, and a
  slide along her skin AT REST is not along it once her milk has turned it -- it has to be laid along her FILLED
  skin, which is a bake.
- **Her skin's SMOOTHINGS lift her top, and never slide it** (a fault found in the same pictures: at her 200% belly,
  SIZE and MILK at 0, slivers of her skin at the inner lower corner and the lower edge of her right cup and at the top
  corner of her left, and her neck strings' feet sunk into her; of the three things found, Joshua, 2026-11-14: "Okay.
  Sounds good. Push when fixed:)"). THE CAUSE, MEASURED on the room's files: her skin's smoothings are laid on her
  body from a file of their own as well (`zeroRefine.ts` `smoothsHerSkin`: her cleavage's `shape:chest:`, her sides',
  her 0% shape refined, her upper belly's, her groin's), and her top has none of them. Under her top's points at 200%
  her cleavage's moves her skin up to 9.0 mm: 2.4 mm out from her at her left cup's top corner, 2.8 under a neck
  string's foot; her sides' 2.0 mm out under her cups' lower edges and 4.4 under the string round her back (at 100%:
  2.2 and 4.5; at 0% her cleavage's 0.3 under her cups).
  - THEY CAN NOT BE GIVEN TO HER TOP AS HER MILK IS. They are relaxations of her skin: they slide her skin's points up
    to 9.5 mm along her, each triangle its own way. Taken as her milk is, her top's strings rode that into zigzags
    (offline, at 200%: the string round her back turned 65 degrees more sharply than at rest over 9 mm of it; at 0%,
    as the room opens her, 93).
  - SO EACH POINT OF HER TOP IS LIFTED, straight out from her skin as she rests, by as far as a smoothing brings her
    skin out under it, and left where it is where her skin goes in (`GarmentShapeTransfer.syncSet`'s `lifts`; the
    room, `followMissingGarmentFields`, for a garment of `FOLLOWS_HER_SHAPES` WHILE IT IS WORN: nothing is bound for a
    top she does not have on). A STRING's point is lifted less by the room it had over her beyond `LIFT_KEEP_M` (a
    millimetre: a string that spans the air is lifted only once her skin has come that near it).
  - A PANEL, AND THE CORD SEWN ROUND IT, ARE LIFTED WHOLE however far off her they lie (`CordEvening.stringShare`: what
    is not a string is one layer of cloth on another). Her cups lie up to 2.2 mm off her at their edges and the cord
    round each up to 2.5. MEASURED 2026-11-14 with that room taken off EVERY point alike, at 200%: 1,456 of her cups'
    points and some 420 of each cup cord's were laid at ONE height, a millimetre over her skin as it then is -- 60 of
    a cord's points level with the cup under them and 3 beneath it, a cord's point lifted up to 0.82 mm less than its
    cup's -- and in the room her right cup showed through its own cord along 8 mm of its lower edge. Lifted whole, a
    cord's point and the cup's nearest it are lifted within 0.30 mm of one another.
  MEASURED after, the same files: at 200% her cups are lifted up to 2.4 mm, her neck strings' feet 2.6 and 2.8, the
  string round her back 1.0 (it stands off her at her side); at 100% her cups 2.2; as the room opens her, at 0%,
  her cups 0.33 and nothing 0.8; no cord turns 12 degrees more sharply than at rest (11.6: the cord round her left cup
  at its top corner, where her skin itself comes out in a bump). IN THE ROOM, HER SKIN'S FOLDS REPAIRED BEFORE EACH
  PICTURE (the `followed` probe says what each part was given: nothing before her top is on; her cleavage's 0% shape
  lifting 516 and 564 of the two cup cords' points, 0.35 and 0.27 mm): v0.9.23 has the slivers and the sunk feet as
  found; now, at 100% and at 200%, no sliver at any corner, each cup's cord whole round it and her neck strings on her
  to their feet -- from her front, from her right, and close on her strings and on her right cup's lower edge -- and
  the same at 200% with SIZE +100.
- NOT FIXED, WITH MILK AT HER BIGGEST BELLY: at 200% with MILK 100 a chip of her skin 4 mm across is left at her right
  cup's top corner, a speck at her left cup's and one at her right cup's inner lower corner; with SIZE +100 as well a
  chip at each top corner (before the lift: both top corners, her right cup's inner lower corner and lower edge, and
  her neck strings' feet sunk). ITS CAUSE IS NOT KNOWN. MEASURED, what it is not: the room's repair of her skin's
  folds (the chips are there with it laid and with it off, `creaseOff`); and her milk being taken from her REST skin,
  which her cleavage's smoothing has slid 9 mm under that corner (offline, by the shapes laid on her from files
  alone, her cups clear her skin there -- 14 points under it, 0.08 mm at the deepest -- and worse if her milk is taken
  from her smoothed skin instead: 290 points, 0.66 mm). Not yet looked at: her belly's and her bust's own morphs,
  which her top carries in its file and offline leaves out.
- FOUND IN THE SAME PICTURES, HER SKIN'S AND NOT HER TOP'S, NOT LOOKED INTO: at her largest of everything (200%, SIZE
  +100, MILK 100) a few hairlines low in her cleavage, a fifth of a millimetre wide and up to 6 mm long, with her
  skin's folds repaired and with the repair off, with the lift and without it.
- PICTURE HER TOP WITH HER SKIN'S FOLDS REPAIRED, AND STEP NOTHING BEFORE THE PICTURE ("A painted top, drawn": the
  repair lands `CREASE_SETTLE_MS` after her controls rest, and a probe's `animate` lifts it again). MEASURED
  2026-11-14: dark dashes under her right breast at 200% with SIZE +100, written here for an hour as a fault of her
  skin's, were her skin's folds pictured a step of the clock after the repair -- wait for `crease().pending` to
  clear, a second and a half more, and picture her with no step between.
- After anything changes which garments are given her shapes, how, the evening or the lift:
  `tests/garmentShapeTransfer.test.ts`, `tests/cordEvening.test.ts`, `tests/bikiniTopMilk.test.ts`,
  `tests/bikiniTopSmoothings.test.ts`; then the room: her top as the room opens her, at MILK 50 and 100, at SIZE +100,
  and with both, from her front and her side and close on her strings; and at her 100% and 200% bellies.

## Her head

- **One record, and `null` is HER OWN** (Joshua, 2026-11-14: "making the eye color adjustable and more hairstyles and
  colors so we can do Lena and add more of a customizable character, as it's kind of limited hair and face wise to one
  look"; "create different hairstyles, hair length and color, different face types, eye and lip colors").
  `headLook.ts` `HeadLook`: her hair (style, length, colour), her eyes, her brows, her lips, her lashes and the shape
  of her face. A colour is '#rrggbb' or `null`, what the part drew before it could be chosen, by the part's own
  numbers: `HEAD_DEFAULT` draws exactly as the room did before. Stats and numbers: a character's save keeps it with
  her body (`characterSaves.ts` `headOf`, `savedHead`: nothing at all for the head she always had), and a game is
  handed it.
- **HER HAIR IS A STYLE, A LENGTH AND A COLOUR.** `hairStyles.ts` `HAIR_STYLES`: the ponytail she has had, Lena's wavy
  low ponytail, long loose hair, a braid, a high bun and a bob. Each is one small file of its own on the hair toolkit
  (`scripts/hair/styles/<id>.mjs`, `node scripts/hair/bake.mjs --style <id>`; its contract is `scripts/hair/glb.mjs`:
  one skinned mesh on her skeleton, one material `sarahHair`, one morph `shorter`, a LIGHT twin for a game with many
  characters). The room wears the style of her head's look: another style's file is fetched, the one before stays on
  her until it is in, and its memory is let go (`loadHair`, `dropHair`); LENGTH is its `shorter` morph at 1 - length;
  its COLOUR is worked out in its material from its texture's tone (`hairColours.ts`, `hairMaterial.setHairColour`:
  not compiled in until a colour is first chosen). Her brows follow her hair's colour unless they have one of their
  own (`browFromHair`). The light twins and the file her first style was baked from (which the story's bake still
  reads: `?bake=story`) are not fetched ahead (`keepList.ts` `NOT_AHEAD`).
- **HER FACE'S COLOURS** (`faceLook.ts`): thirteen eye colours, twelve lip shades, any colour a picker gives; a picked
  eye colour is given a collar and a ring of its own so that the iris, over its area, IS that colour (`irisPalette`).
- **THE SHAPE OF HER FACE IS TWENTY-ONE SLIDERS AND SEVEN FACE TYPES** (`faceShapes.ts`): each slider a smooth, mirrored
  field in space, eased to nothing down her neck; a type is a set of sliders (ROUND is Lena's). The room lays a
  slider's field on her skin and on her hair the first time the look moves it (`faceShapeFields.ts`: the field read at
  each of a mesh's points, its normals turned as the surface it moves turns) and weighs it with her other shape fields
  (`face:<slider>`, `fieldWeightsAt`): her hairline stays on her forehead.
- **HER FACE'S PAINTED LAYER RIDES HER SKIN.** Her eyes, brows and lips are drawn by where a point is ON HER SCULPT
  (`faceRig.ts`). That was the point's `position`, which nothing of hers moved on her head; a shaped face moves it. The
  layer reads `fabricRest` instead -- her skin's place before any shape -- which her skin's material carries once the
  fabric's program is on it (`FACE_REST_DEFINE`, said by `fabricMaterial.ts`; the room puts that program on with the
  first shape: `ensureSkinFabric`; no attribute is added, her skin has none left). A bigger eye is the eye drawn there,
  bigger; a lifted brow carries its brow. Her mouth's inside is told from the SCULPT's point turned with her jaw, so a
  longer chin is not read as an open mouth.
- **THE FACE TAB'S PANEL** (`headPanel.ts`, written by an agent, wired by the lead): HAIR (style chips and None, LENGTH,
  colour swatches: her own, the list, custom), EYES, BROWS (match her hair or custom; amount), LASHES, LIPS, FACE SHAPE
  (type chips, the sliders in groups that say how many are moved, RESET FACE), RESET HEAD. The room owns the look
  (`setHead`); the panel keeps no copy. Swatches are 32 px with 8 px between (Joshua: "it's hard to press certain
  buttons").
- MEASURED in the room 2026-11-15 (the build machine's software renderer): each of the six styles from her front, her
  side and her back, in her own copper and in six other colours, three at a short LENGTH; Lena's look whole -- black
  wavy ponytail, dark brown eyes, a rose lip, the ROUND face -- from her front and her three-quarter: her eyes and her
  lips lie where her shaped face has them, her hair on her head; and on a phone's upright screen (430 px) the panel
  used by real touches: a style, a hair colour, an eye colour, a lip shade, a face type and a slider, each landing on
  her. No error on the page. Her skin's program then: the fabric's, with `|face-rig-v3`.
- NOT DONE, AND NAMED: the BOB reads a little like a wig (a straight front cut, lumpy over her ear); LONG LOOSE HAIR's
  side falls bunch seen from her front, and under about 40% of its LENGTH its hem is a row of thin strands; a few
  wisps stand off her shoulder on the wavy ponytail and the long hair; no fringe or parting of its own to choose yet;
  RANDOMIZE leaves her head as it is; a head's look is not in the story's bake.
- **HER STRANDS' DEPTH** (Joshua, 2026-11-19, of his Local Texture Lab: "add better depth and detail on like the hair so it
  doesn't look so flat"): `node scripts/hair/height.mjs` takes the strand atlas through the lab's Convert mode (`--large 15
  --detail 100 --contrast 160`: its fine detail, not its broad form), evens it DOWN each strand (24 px: along a strand it drew
  rungs across her hair), and draws its normal map by the lab's `normalCanvas` (`hair-height-1024.png`,
  `hair-normal-1024.png`, every style's). The room wears it as her hair's NORMAL MAP (`hairMaterial.setHairDepth`,
  `HAIR_DEPTH`: strength 1, grooves 12% darker; the probe's `hairDepth({ strength, groove })`). TRIED FIRST, AND WHY NOT: the
  height's slope across the screen (as her skin's tile): strands thinner than a pixel drew a woven checker. And a FAULT FOUND
  AND FIXED on the way: three builds a normal map's frame with a back face's normal turned round, and her hair gives the
  normal back (`HAIR_NORMAL_LINE`) but not the frame -- a lock by her face went brown (`HAIR_TBN_LINE`). MEASURED in the room:
  the ponytail from her three-quarter and her back at 0, 1 and 2. Run the script again after `texture.mjs` paints the atlas.
- After anything changes her head: `tests/headLook.test.ts`, `tests/headPanel.test.ts`, `tests/faceShapes.test.ts`,
  `tests/faceShapeFields.test.ts`, `tests/faceLook.test.ts`, `tests/faceRig.test.ts`, `tests/hairStyles.test.ts`,
  `tests/hairColours.test.ts`, `tests/characterSaves.test.ts`; then the room: her head from her front and her side in
  a style and a colour that is not her own, with a face type on.

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

## A character's own lungs and heart

- **Each character breathes and beats by numbers of her own** (Galaxy Defender, for its Mary and John, 2026-11-25: "John,
  on the male base body, breathes and beats exactly like Mary"; "Per-character lung settings, saved with the character
  and in its JSON export, as customizable defaults (not fixed by sex)"; "Nothing about stamina or endurance changes").
  `actor/vitals.ts` `Lungs` (total and vital capacity, a breath at rest, breaths a minute at rest, the biggest working
  breath as a share of the vital capacity, the most air a minute, the most breaths a minute) and `Heart` (at rest, and
  the peak's formula: its value at age 0 and its drop a year), taken by `vitalsFor` and `stepVitals` through
  `VitalsBody.lungs` / `.heart` -- left out, the female body's. A pregnancy's changes are laid on top of them.
  `vitalsFor` and `VitalsNow` say the air moved a minute (`airLPerMin`): over `mostLPerMin`, how hard breathing works.
- **THE TWO BODIES' OWN** (exported for a game: `FEMALE_LUNGS`, `FEMALE_HEART`, `MALE_LUNGS`, `MALE_HEART`, `lungsDefault`,
  `heartDefault`, `readLungs`, `readHeart`): the female body's are `BREATHING` and `HEARTBEAT`, number for number, and
  her total 4.2 L; the male base body's are GDM's (GAME TUNING within physiology's: total 6.0 L, vital 4.7, a breath 0.5,
  14 a minute, the biggest 55% of his vital capacity, 120 L a minute, 50 a minute; his heart 65 at rest, 208 - 0.7 x his
  age, Tanaka 2001). Ranges in `LUNG_RANGE`, `HEART_RANGE`.
- MEASURED: Mary to the last bit as before, with her numbers passed or left out (every felt effort and energy, weeks 0,
  20 and 40, three ages; ten minutes of each activity stepped, two resting after): at rest 14 a minute, 0.5 L, 70; at her
  hardest 46.9, 1.705 L, 80 L a minute, 181.4. John: at rest 14, 0.5 L, 65; at his hardest 46.4 a minute, 2.585 L, 120 L
  a minute, 188.4 at 28 years; held there until spent, up to 124.5 L a minute as he empties (the quicker, shallower
  breathing of spent energy, hers too: up to 82.4), 109.9 once spent. His effort and energy go exactly as hers at every
  activity.
- **KEPT WITH HER BODY** (`characterSaves` `SavedBody.lungs`, `.heart`, every number, written with each save, in its
  export; `lungsOf`, `heartOf`: a save from before is its model's own). In the room, the Body tab's LUNGS & HEART:
  each box blank until typed, her body's own in grey, a ↺ each and BODY'S OWN for all, and what they come to at her
  hardest. What is typed is kept for each body, as her head is (`typedVitals`).
- **HIS SKIN BREATHES ON HIS OWN LANDMARKS** (`SarahLabScene.ts` `MALE_BREATH_MARKS`, `breathMarksNow`): her breath's moves
  are anchored on her bones' landmarks (src/data); his were hers until 2026-11-25. MEASURED on the skeleton laid in him
  (the probe's `breathMarks`): the top of his pubic bone 2.0 cm lower than hers, the bottom of his breastbone 1.0 cm
  lower and its top 1.8 cm higher, the bottom of his rib cage at his sides 1.6 cm lower. Kept as numbers, as hers are,
  so his breath lays no skeleton. MEASURED in the room on him at his hardest: his skin sweeps 2,518 mL for 2,518 mL
  breathed, 24 mm at the most (at the bottom of his breastbone; 4.9 mm at rest). PICTURED at his 0% from his side and
  three-quarter, all out and all in.
- **HIS DRAWN CHEST BREATHES BY HIS OWN SHARE** (`breathDepth`): a breath's share of the body's vital capacity, as that
  share of hers; hers is the litres over 0.5 as before.
- **NEVER CARRYING ON THE MALE BASE BODY** (a fault found 2026-11-25, `pregnancy.ts` `carryingFor`): her PREGNANT left on
  and the body switched to his, he breathed with a pregnancy's numbers (16 a minute, 0.70 L, his heart 77 at rest), and
  his navel and his balance took her weeks. MEASURED after, her PREGNANT still on: 14, 0.50 L, 65.
- After anything changes them: `tests/lungsAndHeart.test.ts`, `tests/vitals.test.ts`, `tests/pregnantToggle.test.ts`,
  `tests/characterSaves.test.ts`, `tests/characterExport.test.ts`; then the room: her vitals line at rest and her
  hardest, MALE and his, and `breathCheck` on him.

## Her skeleton and her bare feet, laid a slice at a time

- **SNEAKERS · OFF LAYS HER SKELETON AND FITS HER BARE FEET OVER IT, AND THE ROOM GOES ON DRAWING** (a fault Joshua found,
  2026-11-24: "pressing to turn off the sneakers causes the app to lock up for about 60s, then crash/restart afterwards").
  Barefoot, her feet are fitted over her foot bones (`footCover.ts`), so her skeleton is laid (`skeletonInV2.ts`) if it is
  not yet -- all of it, in one piece of work. MEASURED in the room as a phone (430 x 932, touch; the build machine):
  140.6 s of the page doing nothing else, one task of 137 s.
- WHAT IT COST, by the profile: her skin's depth at each of her bones' 45,112 points (six rays each and the nearest of
  her triangles, `insideSkin.ts` `depthsInSkin`) every pass and every step of the fit; the distance to a triangle made a
  function of its own at every call; Math.hypot (a dozen times a plain root: MEASURED, 2e7 of each); sorting thousands of
  her points within 10 cm of each bone point for the four nearest; her feet's rounding hunting her points across a Map
  of string keys.
- NOW, WHAT IS LAID IS THE SAME: the rays' answer is kept for a point while it has moved less than it stood from her
  skin (`RaysKept`); a cell, or a triangle's box, no nearer than the nearest found is passed over; the four nearest are
  kept as they are found, the first found first among equals, as the sort had them; cells are numbers (`cellKey`); her
  feet's points are read straight through memory, in the order they were summed; a plain root where Math.hypot was.
  MEASURED against the old laying, number for number (the probe's `skeletonLaid`): her bare feet's field the same to the
  last bit; her skeleton's 45,112 points 4,909 of them moved, by 0.055 mm at the most (a root's last bit tips a point at
  its margin from one pass to the next), and so 4,275 of its weights by up to 0.027.
- AND IT IS DONE A SLICE AT A TIME (`insideSkin.ts` `Steps`, `runSteps`; `SkeletonInV2.stepped`, `footCoverSteps`;
  SarahLabScene's `inSlices`, `SLICE_MS`): each slice as long as the room took since the last, 12 to 100 ms (GAME
  TUNING), so the room draws at about half its rate while her feet are fitted and never stops. MEASURED as above: its
  work 18.8 s in 163 slices, the longest 347 ms (140.6 s in one before); on a phone, NOT MEASURED -- by the old laying's
  minute there, some 8 s of work over twice that. Left off if another
  laying, or another body, comes first. `new SkeletonInV2(...)` and `footCover(...)` still lay it at once (a probe's
  relaying, the tests).
- The probe's `skeletonLaid()`: her skeleton's points and weights and her feet's field as laid, how long it took, and
  its slices' work.
- After anything changes how her skeleton or her feet are laid: `tests/insideSkin.test.ts`, `tests/footCover.test.ts`,
  `tests/herOwnSkeleton.test.ts`, `tests/sarahSkeleton.test.ts`; then the room as a phone: SNEAKERS · OFF, its time, its
  longest slice, and `skeletonLaid()` against the laying before.
- **HER BREATH'S ARRAYS ARE MADE ONCE AND REFILLED** (Joshua, 2026-11-24: "make them once, refill them so belly changes
  don't churn memory on iPhone"). Her breath is laid again when her shape changes, at most twice a second (`layBreath`):
  her standing shape and her rest places (`breathWork`, 1.4 MB each) and each move's shape at her points
  (`breathSkin.ts` `volumeWork`, 4.2 MB) were new at every laying; so were a held stroke's surface's in the painters
  (`levelWork`: her standing shape, its heights and its normals; `LevelMesh.normals`' sums). `tests/vitals.test.ts`
  holds that a refilled laying says what a fresh one does. MEASURED 2026-11-24 in the room (every typed array of a
  megabyte and more made, counted by where it is made, over ten 1% steps of her belly): none of her breath's or a held
  stroke's after. FOUND THE SAME WAY, AND MADE ONCE SINCE: her opening's area's copies of her attributes
  (`vulvaMesh.ts` `readExtras`: her attribute copied whole, and the area's own made new, at every change -- 29.6 MB in the
  ten steps; now read where it is and the area's refilled) and her womb's wall field (`baby.ts` `wallField`, a 1.1 MB
  grid for each new shape of her womb: 68 MB in the ten steps; now the last four wombs' grids are kept and a new womb
  takes over the oldest's, `WALL_FIELDS_KEPT`, `tests/wallField.test.ts`) -- NEITHER COUNTED AGAIN. FOUND AND LEFT: her
  rest shape's shift (4.6 MB) and her pulled slip's working (about 12 MB).

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
- **HER BELLY GROWS ON A CURVE, NOT A STRAIGHT LINE** (Joshua, 2026-11-19, of a character typed START 10%, BIGGEST 150%
  at week 42, whose belly went from 80% to 150% in her last two weeks: "70% size difference over 2 weeks is quite large…
  does pregnancy belly size kind of look like a power curve starting small at first, but accelerating in the 3rd
  trimester?"; of an even line and the curve, "Maybe a hybrid"; "Yes, so hybrid"). `baby.ts` `BELLY_CURVE` (0.5),
  `bellyGrown`: from week 12 to her delivery week the share of her growth is half an even line and half a square of the
  share of those weeks gone. HER OWN CHART IS HOW FAR ALONG SHE IS (`HerChart.anchors`: her belly %, 0 at her START, 1 at
  her BIGGEST), her week read through the curve from 12 to HER delivery week -- so a delivery week past 40 is no longer
  squeezed into the chart's oversized top. The chart itself (`BUMP_WEEKS`, nothing typed) is on the curve from 0% at
  week 12 to its delivery belly (one baby 100% at 40, twins 175% at 37, triplets 180% at 34; twins were 100% at week 32
  and triplets at 29, straight), then on straight to 200% (42, 38, 35). PAST HER BIGGEST it is as before, a % of the
  chart for each % of her belly: her baby is never bigger for her belly than on the chart (`tests/pregnancyRule.test.ts`).
  His character: 10% week 12, 49% week 24, 77% week 30, 111% week 36, 136% week 40, 150% week 42 -- 2.6% a week at first,
  7.2 at the end. The room opens her on a first baby by the rule (120% at 40): 60% is week 29.3 (26 on the straight line),
  100% week 36.8. WHAT IS WRITTEN BELOW OF WEEKS AT A BELLY % WAS MEASURED ON THE STRAIGHT LINE. `tests/kickWeeks.test.ts`.
- **AT HER START SHE IS WEEKS 1 TO 12** (Joshua, 2026-11-19: "I want one character to have a 10% starting belly, be at
  150% at 42 weeks, and end up with a belly size of 30%… But it kept saying she was 12 weeks at 10%"). Her belly does not
  show before week 12 (`EARLY_WEEK`), so her START belly is every week to 12: the panel says `1–12` there, not 12
  (`atHerStart`). A week to 12 typed at that belly is kept as her week (`herWeek`), and with no START typed that belly IS
  her START; one typed over a START typed under it is not used, and says so. Her chart past it is as it was.
  `tests/earlyWeek.test.ts`.
- **EXACT: HER BELLY TYPED, OR PICKED FROM A LIST THAT NARROWS AS IT IS TYPED** (Joshua, 2026-11-19: "the option to type a
  specific amount like max belly and stuff… like exactly 30%, or 76%… a scrollable list with a smart look up so if you
  start typing 5… it will only show things starting at 5 like 50-59"). `valueLookup.ts`: `valuesStartingWith` (pure)
  and `attachLookup`, a list fixed to the screen under its box, rows 32 px. Under the belly slider (`bumpExact`; Enter
  or a row tapped) and on each of HER PREGNANCY's boxes, each in its own range. MEASURED in the built room as a phone
  (430 x 932 at 2x, real touches): 5 typed listed 5% and 50-59%, 56% tapped set her belly to 56; 76 and Enter, 76; in
  BIGGEST, 1 listed 1, 10-19 and 100-199 (111), 150 tapped set 150. `tests/valueLookup.test.ts`.
- After anything changes the rule, her chart or the panel: `tests/pregnancyRule.test.ts`, `tests/pregnantToggle.test.ts`, `tests/earlyWeek.test.ts`.

## Her baby's kicks by her week

- **They follow her week, as a real pregnancy's do** (Joshua, 2026-11-19: "Baby kicks should follow her pregnancy week…
  Right now the baby moves and kicks show on her belly at any week"). `baby.ts` `kickStage(week, deliveryWeek)`,
  `KICK_WEEKS`; the room works it out each step from her chart (`herWeek`, `herChart().deliveryWeek`: a typed week, her
  START, BIGGEST and delivery week) and scales how often her babies move (`often`, times BABY KICKS) and how big a kick
  shows on her belly (`seen`): none before week 16; felt, rare, and nothing on her belly to week 22, `firstFelt` (19, HIS
  TUNING NUMBER: a first pregnancy's average) the week they reach `felt` of their most; from 22 they show, a quarter size
  at first, both growing to their most by 28; their most to 36, or to 4 weeks before her delivery week (twins 37,
  triplets 34) if sooner, then down to 0.8 at it. Twins and triplets the same weeks. BABY KICKS still scales how often,
  0 none. The KICK button still starts a kick at any week; her belly shows it as her week does.
- Its sources are in `KICK_WEEKS`' comment: MKUH NHS "Fetal movements in pregnancy" (18 to 20 weeks most; 16 for a woman
  who has been pregnant before; after 20 for a first; rising to 32 weeks, then level -- NOT less toward the end, so his
  "a little less" is kept to 0.8), Cleveland Clinic "Quickening", the American Pregnancy Association. Week 22 for a kick
  seen from outside is his (GAME TUNING): none of them says.
- `tests/kickWeeks.test.ts`.

## Her baby's birth

- **While she is pregnant, from RECLINE or SQUAT; no size of belly is asked** (Joshua, 2026-11-02, the two positions;
  2026-11-14, of the belly: he set one that morning -- "only when pregnancy is on and the belly size is greater than 90%"
  -- and took it back the same day: "let's remove the minimum pregnancy limit as that's automatically set from the max",
  read as: her belly at a birth is her BIGGEST BELLY's to say, not a second number's). `birthSequence.ts` `BIRTH_NEEDS`,
  `birthNeeds`; the room's `beginBirth`. The birth's buttons and its TIMELINE are dimmed while she is not pregnant, and
  the birth's line says what is needed next ("BIRTH · not pregnant (PREGNANT · ON)", "BIRTH · from RECLINE or SQUAT").
  MEASURED in the room: BIRTH on at 73% and at 20% of her belly; and a birth played through at 20% and at 0% (on the
  chart her weeks 17.6 and 12: a baby of 21.5 cm, and one with a head 1.5 cm across), RECLINE and SQUAT -- its body within
  2.3 cm of its way from 0:62 to 0:98, its feet at 61 degrees from 0:91, born at 1:40 as at any size, no error on the page.
- **Her pregnancy ends with the birth** (Joshua, 2026-11-14: "just keep it simple and automatically turn off the
  pregnancy state after birth"). Once her last baby is out of her (`pregnantAt`: its 'after', what the birth's line calls
  born; with twins and triplets the last of them) her state is off: PREGNANT · OFF, as it is kept with her, and HER
  PREGNANCY's line says "not pregnant". The birth on the clock is drawn to its end all the same -- her newborn on her,
  its cord, her placenta: what draws her asks `carrying()` (her state, or a birth on the clock), what she IS asks
  `pregnant()`. It is the clock's, as all of the birth is: dragged back before then she is pregnant again, and RESET puts
  her back as she was before it, pregnant. Her state switched by hand with a birth on the clock, or another body put on,
  puts the birth back first (`setPregnancy`). Nothing else of hers is moved: her belly slider and her baby counter are as
  they were (her END BELLY and one more on her counter are a game's to write). MEASURED in the room, one baby, RECLINE at
  150%: PREGNANT · ON at 1:39.9, OFF at 1:40.1 with "BIRTH · born"; her newborn on her at 1:45 and her afterbirth at 2:05
  drawn as before; dragged back to 1:00, ON; RESET, ON and "BIRTH · not started"; PREGNANT pressed once it is born, the
  birth put back and ON; pressed in labour, the birth put back and OFF, BIRTH dimmed. Twins: ON once the first is born
  ("baby A born · B next", 1:40 of 3:18) and at 2:32; OFF at 2:33 with "born · 2 of 2"; RESET, ON. Triplets: ON once
  the first is born (1:40 of 4:01), once the second is ("baby B born · C next", 2:33) and at 3:25; OFF at 3:26 with
  "born · 3 of 3"; dragged back to 2:48, ON; RESET, ON.
- **It begins where she is** (of a birth played from BIRTH OPENING at 40%, her belly at 150%: "the opening didn't sync up
  as when I tried it, I set the start at 40% opening before I pressed it"). By hand BIRTH OPENING opens her opening and
  her cervix together. A birth then took what was set as a floor under all of it: MEASURED on v0.9.22, four seconds in
  the line said "Cervix 2.7 cm" beside an opening drawn 4.0 cm (labour began from 1 cm whatever was set), and once her
  baby was born she stood at 40% for good. Now (`birthBeginsAt`, `BirthEvents.openFrom`, `BirthMoment.held`): her cervix
  is never less than she began; its clock starts at the contraction that takes her further (40%: the second, 0:08 FAST,
  0:40 REALISTIC), never later than the one her baby's head begins to settle in; her opening is held that open until her
  first baby's head is born, and from there it is the birth's -- as wide as what passes, easing back after to what her
  legs have her (`vulvaMesh.ts`: while a birth holds her, what was set by hand is left out). BIRTH OPENING's slider is
  off while a birth has her and says where it began; RESET gives it back as it was set. MEASURED in the room, RECLINE at
  150% from 40%: "BIRTH · labour · Cervix 4.0 cm · not yet · Opening 4.0 cm" as it begins; her cervix 4.6 cm at 0:13, 6.3
  at 0:20, 10.0 by 0:38; her opening 4.0 cm until its head, then 8.5, 10.0, 9.3 as its body passes, 3.5 as it is born,
  2.5, 2.0; after RESET 40% again. From 0%: the clock at 0:00, "Cervix 1.0 cm", her opening her legs' 2.0 cm until its
  head, then the same.
- **Her legs open her** (Joshua, 2026-11-14: "how far the 🦵 legs are spread apart does naturally open the opening to a
  max of 20% in recline and squat, legs apart would be 12%"; first, 2026-11-02, 15% and 30%). `legsOpen.ts`, pure: how
  far her thighs are spread ACROSS her (`legSpreadDeg`: each thigh's lean out from her hips' line -- a walk's stride,
  37 degrees between her thighs in space, is not a spread) through `LEGS_OPEN.table`: closed to 28 degrees, 12% from 36
  to 62, 20% from 90. In every pose, a birth or not: her skin-made opening had been held shut out of a birth since
  2026-11-11. Nothing is drawn under what she wears; her cervix opens by hand and with a birth, not with her legs; with
  her skeleton's doors in her opening's place (a probe's) it is as it was. BIRTH OPENING's line says what her legs add
  ("BIRTH OPENING 0% · her legs open her 12% · 1.2 cm across"). MEASURED on her own bones, across her, at 0, 100, 150 and
  200% of her belly: standing 0, 8, 11 and 14 degrees; LEGS APART 36, 47, 54 and 60; SQUAT 103, 111, 113 and 116; RECLINE
  93, 101, 104 and 108; walking up to 14 at 150% and 17 at 200%; seated 22 at 150% and 31 at 200% (5% open there). And
  with nothing worn, at 150%: closed standing, 12% drawn in LEGS APART, 20% in SQUAT and in RECLINE.
- **Her bones are read off HER skeleton** (the fault found that day, fixed and told as he asks). Her model carries her
  baby once it is loaded -- its holder hangs from her spine -- and its skeleton has 71 bones to her 68, so "the skinned
  mesh with the most bones in her model" (`HumanRig.ts` `findSkinnedMesh`) was her baby's from then on. MEASURED with her
  baby loaded, at 150%: the room's angle between her thighs read 169, 169, 171 and 169 degrees standing, in LEGS APART,
  in SQUAT and in RECLINE (11, 54, 112 and 104 on her own bones), so her pose's opening stood at its most through every
  birth; and seated she was set 23 cm too low, her ankles 10 cm under the floor (now 13 cm over it, as standing). The
  room reads her through `herSkinned()`, which leaves out what hangs in her baby's holder -- her legs' spread, her
  torso's lean, her place seated, her legs' springs, what a garment's file is bound to, and the probes' aim. A model
  with as many bones as her baby (`sarah-base.glb`: 71) does not show it.
- **Its body lies along her canal** (Joshua, 2026-11-14: "the baby wasn't bending down the tube"). `birthAlong` lays what
  of it is in her along her canal, and on up the way her canal comes from; it was switched on only for her skeleton's
  doors. Her skin-made opening (the room's own since 2026-11-11) holds v2's canal's top at the middle of her pelvis --
  15 cm of canal that turns up into her womb -- and her baby was still one stiff length down it. Now wherever her canal
  is held (`canalHeld`, `alongCanal`). MEASURED, RECLINE at 150%, the joints of its back and legs against her canal's
  middle line carried on (the probe's `bodyOnWay`), at eight moments from 0:62 to 0:98: stiff, up to 19.9 cm off in her
  canal and 30.1 cm above it -- as it crowned its legs lay straight on back from her opening, not up into her womb; laid
  along, never more than 5.9 cm in her canal, 4.8 above it and 6.6 out of her (its neck's joint lies 5 cm off the line
  its head's middle rides, and its hips and knees stand off its own middle). SQUAT at 150% within 6.4; RECLINE at 100%
  and 120% within 4.9; twins' first within 4.5.
- **Its feet as its straight body has them** ("the feet was flat"). Made long, only its thighs and shins were turned:
  each foot kept the angle it has curled in her womb -- MEASURED on the model's bones, 112 and 119 degrees off its shin's
  line, its toes drawn up past a right angle -- while its straight body was baked with its feet at 61. `baby.ts`
  `pointFoot`, `DESCENT.footOff` (61: the straight body's own, MEASURED on `sarah-baby-straight.glb`): turned at its ankle
  as its legs straighten. MEASURED in the room: 105 and 111 at 0:62, 68 by crowning, 61 from 0:88 until it is born.
  NOT TOUCHED: lifted onto her its feet go back to its curl's and past (122 to 147 degrees with its stretch).
- **ITS HEAD COMES OUT OF THE MIDDLE OF HER OPENING, AS HER OPENING IS** (Joshua, 2026-11-19: "the opening, opened a little
  late and the baby's head appeared to be off centered at first… The head poked through the skin at a few spots"; then, of
  her opening drawn wide and off its middle round the head: "Don't move the opening to proportions that is unrealistic to
  fit the baby's head, that doesn't happen and looks weird…. Just shift the head in the right place"). `SarahLabScene.ts`
  `BIRTH_STRAIGHT`: over the last 10 cm of her canal its head's way (and its body's, `birthAlong`) is brought onto the
  straight line out of her opening's OWN middle, square to it (`vulvaMesh.ts` `mouthRest`: as her bones carry it, before it
  is drawn round anything), all of it from 4.5 cm before her opening, and on out along that line; and her opening widens to
  its own round shape as a sphere 1.25 times its head's meets it (the head as drawn reaches further forward than its 4.3 cm
  sphere). MEASURED in the room, RECLINE at her 73%, before: from 1:10 to 1:17 its hair stood through her skin under and
  beside her opening, shut at 2 cm, and from 1:20 it sat high in her opening with a crescent of her open beside it. After:
  nothing through her skin at 1:10, 1:14 and 1:16; her opening widening from 1:16; the head in its middle from 1:17; born
  with its cord at 1:40 as before; SQUAT the same from her front. TRIED AND TAKEN OUT the same night: her rim following the
  head sooner (0.5 of its way down) and her perineum bulging sooner -- the head stood out further.
  THEN (2026-11-20, his marks on those pictures: "the first 4 frames, I see the head poking through the skin at the bottom,
  the next 6 frames, the center of the head is slightly off center to the top and there is a gap at the bottom"): it comes
  to her opening 4 degrees in from her front (`tiltDeg`) and is let down 1.2 cm toward her perineum (`drop`) from 7.5 to
  4.5 cm before her opening (`dropFrom`, `dropFull`) AND ONLY AS HER OPENING OPENS round it (`openFrom` 0.3 to `openFull`
  0.8: let down while she is nearly shut between pushes, it stood through her skin under her opening at 1:14). And her
  opening's middle (`mouthRest`) is read on her rim BEFORE the round that draws it round the head (`iter === 0`): read
  after, it was the middle of a rim already drawn round the head, which the head was then steered to -- MEASURED, the
  head 2.4 cm across her one moment and 2.1 the other way the next; now 0.0 at every moment. MEASURED in the room,
  RECLINE at 73%, the head's middle in her opening's frame (the `birth` probe's `headInMouth`): across 0.0 from 1:06 to
  1:22; toward her perineum 0.8 to 1.0 cm from 1:17 on. Pictured at 1:12, 1:14, 1:16, 1:17 to 1:20: nothing through her
  skin, the head filling her opening (the pink seen past it from her side is her opening's inner wall).
- After anything changes the birth, her canal, her legs' poses or its poses: `tests/birthBegins.test.ts`,
  `tests/legsOpen.test.ts`, `tests/babyFeet.test.ts`, `tests/babyAlong.test.ts`, `tests/herOwnSkeleton.test.ts`,
  `tests/birthSequence.test.ts`; then the birth read in the room (the `birth` and `legSpread` probes).

## Her belly in RECLINE and SQUAT

- **Her belly is her body's, not her thighs'** (Joshua, 2026-11-16, RECLINE and SQUAT at 200%, on the full skin and the
  light one: "the lower belly shape looks flattened and it appears the womb skin pokes out just a little bit. The
  underbelly also looks flat squatting"; "maybe because of the leg positions it ends up accidentally pulling the
  underside of the belly, altering the shape"). It does. MEASURED in the room at 200% in RECLINE: the skin low on the
  front of her belly is carried 0.09 by a THIGH, and at her middle by her left thigh on one point and her right on the
  next -- 35 mm apart once her thighs are drawn up 104 degrees. `hipTurn.ts` `BELLY_HOLD`, `bellyHold()`: skin that
  stands far from a hip joint AS SHE IS SHAPED (none within 10 cm, all from 22) and that a thigh carries less than a
  fifth of is carried by her body's bones alone and takes none of the hip's turn -- by her belly's size, none to 100%
  (everything measured there is as it was), all from 150%. Laid with the hip turn's field (`HIP_TURN_FIELD`) in RECLINE
  and SQUAT (`bellyHeldHere`; the `bellyHold` probe switches it, and SQUAT alone).
  - Its body carry is evened from the skin round it (`evenBody`): her file keeps four bones a point, and where a thigh
    has a share one of her body's bones has lost its own.
  - By where it stands, not by her belly follow weight: that tore a line along her flank where the paint falls away.
- **Her soft belly's moves reach her flanks** (`softBody.ts` `softShare`, `BELLY_SOFT_HOLD` 4). Leaning back her belly
  is told shallower (his rule 1: 16% at 200% in RECLINE), each point by how far it stands out TIMES its belly follow
  weight -- painted for her bounce, 1 on her front and falling away over her flanks. At 200% most of her belly is
  flank: her front came back whole, a flat face with a ledge round it. A point takes 1 - (1 - weight)^4 of the soft
  moves; her womb's sac the same. Standing at 100 and 200% pictured after: round, as it was.
- **Her navel is laid on her without the hips' field, which is put back over it** (`layNavel`). The piece
  (`navelPiece.ts`) lays the skin inside its ring on one smooth surface fitted to the ring IN HER REST SHAPE; the hips'
  field is not smooth there (each point's own way back from where a thigh's share would take it), so the piece smoothed
  it away inside its ring and left it outside: a raised patch with a ragged edge round her navel, 6 to 14 mm. HOW IT
  WAS FOUND, after soft belly, the poses' smoothing, her seat, her knees, the crease repair, her baby, the field's
  normals and its body carry were each ruled out by a picture: her points as her bones alone carry them (the
  `bodyPoints('posed')` probe), the hold on against off -- SMOOTHER held (0.36 mm from its neighbours' mean across the
  394 edges where a thigh's share begins, 0.91 not held). No step in her skinning: so it was laid after her fields.
  MEASURE HER POINTS BEFORE A SIXTH PICTURE.
- **Her knees are not turned round in RECLINE either** (Joshua, 2026-11-16, of her calf behind and just under her knee:
  "needs to match the look of squat regardless of outfit… recline looks off and pitches too small, squat is better and
  more natural looking"). `kneeTurn.ts`'s turn (on in RECLINE since 2026-11-02, off in SQUAT since 2026-11-04) is off
  by default (`SarahLabScene.ts` `kneeTurnOn`; the `kneeTurn` probe switches it on). MEASURED in the room at 0%, the
  light skin and the full one alike: turned (3,827 and 3,969 points, 33 mm at the most) the top of her calf was drawn
  in thin with a hook behind her knee; not turned it is full, and the front of her knee is round at RECLINE's bend, at
  0 and 150%. Her knees' smoothing (`BIRTH_KNEES_FIELD`) stays: without it the back of her knee is torn.
- **SEATED, HER BODY IS ONE PIECE AND EACH LEG ANOTHER, AS IN RECLINE AND SQUAT** (Joshua, 2026-11-20, from under the
  stool at 0 to 200%: "at 0% belly size there is no pelvis, lol, it's all hidden"; "it's okay if the legs alter shape to
  fit the belly a little"; 2026-11-21, of a room between her thighs laid alone: "The belly looks like a flat piece of skin
  in front… it is not blended yet from standing to sitting… don't push until correctly fixed"; and "you can render
  standing to sitting and see… what angle and when it messes up"). `SarahLabScene.ts` `sitWay`, `sitWeightsShare`,
  `sitTenths`, `sitRoomHere`, `keepBirthRoom`.
  - WHERE IT WENT WRONG, MEASURED in the room going from standing to seated at 0% (the probe's `sitReading`: each hip's
    bend, her legs' spread, how far her inner thighs near her crotch have come inside where they stand standing): fine to
    about 55 degrees of her hips' bend; by 75 the tops of her thighs rise over her groin and cover her mound and her vulva,
    her lower belly ending in a flat ledge (seated: 84 degrees). Her inner thighs come NO nearer her middle than standing
    (1 mm at the most): it is her skinning -- the skin of her groin is half her thighs' -- not her thighs closing.
  - SO SEATED SHE WEARS WHAT RECLINE AND SQUAT WEAR: "the leotard" (`birthWeights.ts`: her belly, mound and vulva her
    pelvis's, each leg its thigh's, across a soft band at each leg opening); her hips turned round in that band, not
    averaged (`hipTurn.ts`; eased in by her thigh's share of a point, `SIT_HIP_EASE` 0.15 -- turned from a fiftieth at
    once, a dashed hairline across her belly's flank at 100%, MEASURED; `tests/hipTurnEase.test.ts`); and her groin
    smoothed (`birthNormals.ts`, with no half-turn, her hips being turned).
  - HER BELLY IS NOT HELD SEATED, AS RECLINE'S IS (`sitHoldOn` false; Joshua, 2026-11-21, of v0.9.66 at 150 and 200% from
    his phone, low in front: "100% and below is good, after 100%, you can see it changed the front profile and the sides
    of the belly is like sucked in… the side profile is good, it's the front profile"). v0.9.66 held it (`BELLY_HOLD`:
    none to 100%, all from 150%): her bump's far skin carried by her body's bones evened, which lean with her spine
    seated, while the leotard keeps what is under it with her pelvis -- a crescent tucked in along the lower sides of her
    bump. MEASURED in the room: the hold moves 3,750 to 3,850 points of her belly at 150 and 200%, up to 47 mm; at 100%
    none over 1.2 mm; her side profile the same either way. Pictured from his view at 100, 150 and 200%, v0.9.65,
    v0.9.66 and without the hold: no crescent; the lower belly runs down into her groin as it does at 100%.
  - HER BUMP KEEPS ITS STANDING SHAPE, CARRIED AS ONE PIECE, A LITTLE LOWER IN ITS MIDDLE (Joshua, 2026-11-21: "before
    looked better as it kept the rounder belly and also sat lower… below the belly into the pelvis/opening, keep your
    fix"; then, of v0.9.67: "lower the belly more and maybe right in the middle of the belly a slight sag/downwards dip";
    "make sure the belly shape from the side and front doesn't change, 73% is changing from the front view like 200%
    did"; "fix the hips, the skin is not closing leaving some gaps"). `sitBelly.ts`, field `shape:sitBelly`: each point
    of her bump where it stands STANDING (her own weights, her standing bones read for a moment, her seated correctives
    left out), moved by the one turn and carry that best take the top of her bump from standing to seated (`rigidFit`:
    her own weights, which give her thighs none of it there; MEASURED 1.1 to 2.3 degrees), let down under its middle
    (`SIT_BELLY.sag` 1 cm at 200%, a bell 8 cm either side of her middle, all of it at its lowest and none half-way up
    it), taken back through the leotard's weights. Laid by her bump's FOOTPRINT -- how far her 200% bump moves each
    point from her 0% belly over the most it moves any, 0.15 to 0.5 (her mound is 0.12, MEASURED down her middle) --
    times her bump's size (none at 0%, all from 50%, `grow`). Her hips' turn and her groin's smoothing are kept off it by
    the same share (`SitBelly.under`). GAME TUNING all.
    - v0.9.67 HAD laid her OWN weights' place by how far over the under-belly line a point stands (`hoopInside`): her
      thighs' share of her bump's lower sides pulled them, and the line ran across her lower back and her hips, where her
      own weights and the leotard's differ and its value steps between her leg's skin and her trunk's -- a ragged tear
      across the top of her seat (pictured at 200% from behind with the field on and off). The footprint touches nothing
      behind her (MEASURED: none of its points behind her rest middle).
    - 2 cm of sag let her bump over her mound at 200% from in front and low (past his red line, just over it); her flat
      belly carried so at 0% stood forward of her mound in a fold (44 mm at the most): hence 1 cm, and `grow`.
    - MEASURED in the room (light skin, 1x; her points against her standing points): her bump's shape, any two of its
      points' distance apart against standing, p50 / p95 0.4 / 1.7 mm at 50%, 0.8 / 2.7 at 73%, 1.0 / 4.1 at 100%,
      2.1 / 11.4 at 150%, 2.4 / 18.2 at 200% (the sag); v0.9.65 1.2 / 4.0 to 8.7 / 26, v0.9.66 4.0 / 21 to 13.8 / 60. The
      lowest of her bump 58.1, 58.0, 57.8, 57.8 and 57.8 cm off the floor at 50, 73, 100, 150 and 200% (v0.9.65 57.7 to
      60.1, v0.9.66 59.1 to 62.8). Her bump's points under the top of a thigh (a 1 cm grid of her thighs' tops): 12 (7 mm
      at the most) at 73%, 25 (10 mm) at 100%, none at 50, 150 and 200% (v0.9.65 more at each). PICTURED at 0, 50, 73,
      100, 150 and 200% from his view, in front low, close under her bump, her side and behind; and going from standing
      to seated and back at 200%: no tear behind her, her mound and vulva under her bump at every size.
    - The probe's `sitBelly(on, { from, to, sag, sagHigh, sagWide, grow, normals })`, `sitBellyMask()` (her footprint
      as laid). `tests/sitBelly.test.ts`.
  - SEATED, THE SIDE AND THE BACK OF HER HIPS KEEP HER OWN WEIGHTS (Joshua, 2026-11-21, of her seated side profile at 0
    and 100%, the leotard's beside her own weights: the leotard's crossed out, her own ticked -- "keep the fix on… looks
    better"; `birthWeights.ts` `SIT_KEEP`, `apply`'s `keep`, `keepOf`). The leotard's leg opening runs up the side of her
    hip, and seated the skin on its leg side swung up with her thigh: a hollow diagonally across the side of her hip, and
    her seat an upright wall, its fullest point 24 cm over the stool and its foot 7 cm further forward (MEASURED, sections
    of her posed skin at 100%). Now behind her hip joints (from 2 cm in front, all by 3 cm behind) and out at her sides
    (from 10 cm out, all by 14, no more than 8 cm in front of her hip joints) her skin keeps her own weights; her front --
    belly, mound, vulva, the creases of her groin -- and the strip behind her vulva (within 3 to 5 cm of her middle, near
    her crotch) stay the leotard's. SQUAT and RECLINE are as they were (no `keep`). GAME TUNING. MEASURED in the room
    (light skin, 1x, nothing worn): her seat's points where her own weights put them (its lowest 47.8 cm off the floor,
    46.4 with the leotard's); her bump's points under the top of a thigh 11 (7.6 mm) at 73% and 14 (7.6) at 100% (10 and
    11 before). PICTURED at 0, 50, 100, 150 and 200% from her side, her three-quarter behind, his view and close under
    her bump: the side profile of her own weights, her mound and vulva in view as before; going from standing to seated
    and back at 100%: smooth. The probe's `sitKeep(on, tune)`. `tests/sitKeep.test.ts`.
  - FROM STANDING TO SEATED AND BACK: the leotard's weights all at once as she sets off (standing, weights move nothing),
    and its fields worked out ONCE on her SEATED pose as she sets off (`sitAsSeated`; kept as she stands again) and laid
    as far as she has sat, in `SIT_LAY_STEPS` (10) steps -- each her fields laid again (MEASURED: 25 ms a step on the build
    machine; working them out 1.1 to 1.7 s, once, as she sets off -- as RECLINE's are as it is pressed). The weights
    eased in by tenths instead tore a ragged line along each groin crease on the way (her weights blended past four bones
    a point and the smallest dropped, point by point): MEASURED, and not done.
  - TRIED FIRST AND TAKEN OUT: the birth poses' room between her thighs laid in SIT (`birthRoom.ts`; no change he could
    see), then a room of its own twice as wide (`SIT_ROOM`, 7.5 cm off her middle) -- pushed every point of her inner
    thighs to one plane and stretched her mound between: his "flat piece of skin". The probe can still lay one
    (`sitRoom(true, normals, tune)`; `sitRoomOn` false).
  - MEASURED in the room 2026-11-21 (light skin, 1x, nothing worn): seated at 0, 50, 100, 150 and 200% from her front,
    his low view, her three-quarter and her side: her lower belly runs into her mound and her vulva, her thighs beside
    them, at every size; going from standing to seated and back at 0%, pictured at each second: smooth throughout; with
    her seated correctives (`bellySeat`, `bellySeatV2`) on and off at 100 and 200%: as good either way, left on.
- MEASURED in the room, both poses at 200 and 150% on the light skin and 200% on the full one: round, no line down her
  belly's sides, no patch. LEFT, AND NAMED: faint ripples low on her belly's front in SQUAT at 200%.
- **IN SQUAT AND RECLINE TOO, HER BUMP IS CARRIED AS SHE STANDS, AND HER THIGHS GIVE WAY TO IT** (Joshua, 2026-11-21: "fix
  the pinch issues… while preserving her belly shape regardless of pose. If anything, the thighs adjust its shape a
  little, but never the belly"; of the pictures, "Recline and now your last Squat pose looked great"). Seated's carry
  (`sitBelly.ts`, above: her standing bump, one turn and carry, the 1 cm sag at 200%) is laid in both birth poses as well
  (`birthBellyOn`; worked out on her pose as it is, not her seated one), and the hip turn, her groin's and knees' smoothing
  and her room are kept off it by its footprint, as seated. Before, a crease pinched across the lower front of her bump
  in SQUAT at 80% and its underside sank into her thighs at 165 and 200%; it keeps its egg shape now. RECLINE was turned
  0.08 to 0.23 degrees (MEASURED): it looks as it did.
  - HER THIGHS GIVE WAY (`bellyContact.ts`, field `shape:bellyContact`, laid wherever her bump is carried, last of her
    pose's fields): a point of her thigh (its leg bones carry half of it or more, none of her bump's footprint) that stands
    behind the nearest point of her bump's skin, or within `gap` (2 mm), where the two face each other, is put out along
    her bump's facing to `gap` off it, the move spread over her thigh round it (never less where it was asked for) and
    taken back to her rest shape through each point's own blended bones. Her bump is never moved. GAME TUNING:
    `BELLY_CONTACT`.
  - MEASURED in the room (light skin, 1x, nothing worn): in SQUAT at 80 and 200% and RECLINE at 80, 165 and 200% with
    the carry, no point of her thigh in her bump -- it moves nothing there. SEATED it does: at 73% 144 to 182 points of
    her thighs, 2.4 mm at the most; at 100% 309 to 330, 12 mm. Her bump's points under the top of a thigh (the 1 cm grid
    above): 15 (7.7 mm) and 24 (10.2 mm) without, 10 (6.2) and 11 (5.1) with -- halved, not gone (what is left is points
    of her thigh it does not take: under half a leg's, or in her bump's footprint). Pictured seated at 73 and 100% from
    his view, close under her bump and her side, with and without: no edge on her thigh, no change to the eye.
  - A BIRTH: RECLINE at 150%, at 0:30, 1:00 and 1:17 from her front, her side and below, with the carry and without:
    the same, nothing through her belly, her baby's head in her opening's middle (`headInMouth` across 0.0 and -0.15 cm).
  - The probe's `bellyContact(on, tune, birth)` (`birth`: the carry in SQUAT and RECLINE). `tests/bellyContact.test.ts`.
- After anything changes the hold, her soft belly's share or her navel's lay: `tests/bellyHold.test.ts`,
  `tests/softBelly.test.ts`, `tests/softBody.test.ts`; then RECLINE and SQUAT at 100, 150 and 200% from her
  three-quarter and her front, close on her navel, and standing at 200%.

## Her light skin

- **A second list of triangles over her own points** (Joshua, 2026-11-16: "set up this lower version for web when it
  detects a mobile device vs computer… PC would use the higher quality and if it starts to lag, would automatically fade
  into the lower one especially if multiple characters on screen"; "once it's setup always do the lower count first, if
  I approve, than you can apply to the larger one"). `public/models/sarah-v2-body-light.bin` (Uint32 triples), made by
  `node scripts/lightBody.mjs` (meshoptimizer, fitted to her rest shape and her `belly` and `belly200` morphs, her
  texture's seams kept): the same vertices, morphs, weights and attributes, fewer triangles between them. Laid at load
  (`SarahLabScene.ts` `lightBodyOn`, `LIGHT_BODY_TRIANGLES`); SETTINGS says which skin is drawn, and a script reads
  the status line's `data-skin` (`light` / `full`). Not fetched
  ahead by a device that does not wear it (`NOT_AHEAD`).
- **Which device wears it** (`skinChoice.ts` `wearsLightSkin`; it is what AUTO picks, and SETTINGS may set it by hand:
  `graphicsSettings.ts`, read once by `main.ts`): a phone or a tablet (its first
  pointer a finger and no mouse, trackpad or pen beside it), and a screen with fewer pixels of its own than 1920 x 1080
  (CSS pixels times its pixel ratio); `?body=light` / `?body=full` says which whatever the device. A PROBE OR A BAKE
  (`?probe=`, `?bake=`) WEARS HER FULL SKIN unless its address says light: what is measured is measured on her, and a
  card's picture is baked from her, in a window of whatever size the script opened. `tests/skinChoice.test.ts`.
  NOT DONE: a computer that is drawing slowly falling back to it (his "if it starts to lag…") -- her triangles are
  read by much of the room as her file is read, and the list is put on her before any of it, once.
- **Left whole** (his, the same morning: "keep the (opening, belly/bellybutton, breasts/nipples, and head) at full
  quality, everywhere else can be less"; then "we forgot to add the hands in"): her head and neck, the front of her
  trunk from under her opening to over her bust, her opening's area, her hands. Her legs, hips and feet are the denser
  part of the rest (thinned as her arms and back are they stood in facets in SQUAT). And HER SHOULDERS, HER ARMPITS AND
  THE TOPS OF HER ARMS (a fault he found on his phone, 2026-11-16, his Sarah seated in her red tee: "look at the hole in
  her shirt on her left side only"): the tee is cloth that rests on her triangles (`clothSkin.ts`), a triangle two of
  whose corners hang from her arm is her ARM's and the tee's body never rests on it, and thinned the triangles over
  the top of her shoulder were big and counted as her arm's well onto her trunk -- her skin stood through the cloth in
  six-sided holes. MEASURED in the room with his tee's own settings (ease 0, neck 0.24), seated: holes on the light
  skin, none on the full one, none with her shoulders whole (`SHOULDER`: from 1.24 to 1.42 m, her arm's skin and what
  is over 9 cm out from her middle). AND DOWN TO 1.18 M SINCE 2026-11-24 (a fault found in the bandeau's pictures, fixed
  and told): thinned under 1.24, the row of triangles that joins her arm's skin to her trunk's at the back of her armpit
  came 15 mm down into the bandeau's band, and in her T-pose its top edge was ragged along them; kept whole from 1.18 the
  row is her full skin's, triangle for triangle (863). 146,172 triangles of her 208,592 (143,640 before, 127,704 at
  first): her hands alone are some 33,000 -- the first saving to take if he allows them less.
- A re-meshed body (Meshy, 6,737 points) was looked at and not used: another shape and pose, its points in other
  places, her face lost.
- WORK ON THE LIGHT SKIN FIRST (`?probe=cloth&body=light`, 1x): what he approves there is applied to the full one.
- After the list is made again: the room on it -- her bust at 0%, SQUAT and RECLINE at 200%, a hand.

## Settings

- **A ⚙ at the stage's top right, where LIGHT / DARK was, opens SETTINGS** (Joshua, 2026-11-16: "add a toggle max
  performance/max visuals in settings"; "Manual on/off + auto"; "move the Light/Dark theme in settings"; "Move the
  Settings ⚙️ at the top right and have it replace the UI theme"; "Yes to all"). A section of the layout with no
  button on the rail (`studioLayout.ts` `STUDIO_OFF_RAIL`: the rail held upright has no room for an eighth); pressed
  again it folds away. `settingsPanel.ts`, plain DOM, keeps no copy:
  - PERFORMANCE: AUTO · MAX PERFORMANCE · MAX VISUALS, then three rows a mode sets and a hand may set over it ("Make
    these with manual overrides from the default for mix and match… Her Skin, Screen Sharpness, Edge Smoothing"):
    HER SKIN (light / full), SCREEN SHARPNESS (1× / up to 2×), EDGE SMOOTHING (off / on). Each row's first chip is
    BY MODE and says what the mode picks; a mode picked gives all three back to it.
  - THEME (LIGHT / DARK, at once; its button keeps `sarahlab:theme`), THIS DEVICE (what is kept here -- the Library's
    last line until now, still `[data-field="sarahlab-device"]` -- and what the phone did; the notice under her name
    stays as well), ABOUT (the version and commit, and what is drawn now).
- **`graphicsSettings.ts`, pure**: AUTO is the room as it was (her skin by the device, up to 2×, smoothed); MAX
  PERFORMANCE the light skin at 1× unsmoothed; MAX VISUALS her full skin at up to 2×, smoothed (GAME TUNING). By hand
  wins over the mode, `?body=` over both, and A PROBE OR A BAKE IS NEVER MOVED BY A SETTING. Kept on the device
  (`character-builder-graphics` in localStorage), not with a character.
- **A change is kept and takes hold when the room is loaded again**: the graphics are made with all three
  (`Renderer`'s `antialias` and `maxPixelRatio`, her skin's triangles as her file is read). The panel shows LOAD THE
  ROOM AGAIN only while what is kept is not what the page was started with, and says to save her first: a reload at
  each tap would lose her and cost three loads to mix three rows.
- **SHE IS NOT SHOWN UNTIL SHE IS DRESSED** (`SarahLabScene.ts` `holdOpen`, `dressedWaits`, `OPENING_HOLD_MS` 12 s:
  GAME TUNING). Her body and her outfit's files were always in before she was shown; what could come in after, in
  front of him, was her skin's picture, her hair, her painted clothes' fabrics and fields (`fabricPanel.busy`) and a
  drawn bottom's waistband. While the room opens she is drawn behind a cover in the stage's colour
  (`[data-role="sarahlab-opening-cover"]`, its `data-waits` what it waits for), the loading card over it, until those
  are in and, if any came late, compiled and drawn twice -- or 12 s after her first compile, so a file that never
  lands does not keep the room shut. A probe and a bake wait as they did (the status line's `data-model`).
  MEASURED 2026-11-16 on the build machine as a phone (software renderer): her body and outfit in at 18 s, her first
  compile done at 29 s (1x) and 36 s (2x) with nothing waited for by then (that time is the compile, which the card
  covered before as well; the cover's own going was read on the build before it stopped compiling a second time
  for nothing: 31 and 45 s);
  pictured as the cover went and 4 s later: the same dressed figure, hair and shoes on, only her breath between them.
  After LOAD AGAIN on MAX PERFORMANCE with HER SKIN full by hand: the canvas 430 x 739 where it was 860 x 1478, no
  antialiasing, `data-skin="full"`. No error on the page.
- After anything changes them: `tests/graphicsSettings.test.ts`, `tests/settingsPanel.test.ts`,
  `tests/studioLayout.test.ts`, `tests/skinChoice.test.ts`; then the built site opened as a phone: the ⚙ by a real
  touch, a mode, a row by hand, LOAD AGAIN.
- **CHECK FOR UPDATE**, under ABOUT (Joshua, 2026-11-16: "a check for a newest update… if you press on it if there is
  one, it will automatically restart the app"). `onDevice.ts` `checkForUpdate`: the server's page asked for afresh --
  past the worker (`AHEAD_HEADER`) and the browser's copy -- and the bundle it names set beside this page's own
  (`pageEntry`): another name is another build. Newer: the new build's worker is installed if there is one
  (`OnDevice.update`, `UPDATE_WAIT_MS`) and the page loaded again, by itself; the same: "This is the newest version";
  no answer is "no connection", never "newest"; one already known to be kept reads UPDATE NOW. MEASURED in the built
  room as a phone, its worker in charge: both answers, the second by a server made to answer with another build's
  page -- one question, the page loaded again, she in again. NOT TRIED: a real second build behind the worker.
  `tests/onDevice.test.ts`, `tests/settingsPanel.test.ts`.
- NOT DONE: a computer that draws slowly falling back by itself; the hairstyles' light twins on MAX PERFORMANCE.
- **Asking him to push is a normal message, never a popup** (Joshua, 2026-11-16: "don't do a popup asking to push or
  not and just a normal message with the question so I can see the images").

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
  never appeared. Now (MEASURED again the same evening, on the build that opens on the Female Base Model and no longer
  fetches ahead the bodies hers was built from): a first visit fetches 32.5 MB for the room in 15 files, then 12.5 MB
  more ahead of need in 25, and 45 MB is kept (41 files; "the whole room is saved here (37 files, 44 MB)" -- it was
  42.7 MB more and 77 MB kept with the old bodies among them); a visit again, and the page loaded again in the same
  tab, fetch 0 MB (one question to the server: has the page changed); a turn of the screen and LIGHT / DARK ask for
  nothing, then as before; a new build (new code, one changed skin) fetches 1.2 MB, shows itself at once, and the old
  code and the old skin are gone from the device; with no internet she stands dressed. Her seconds to dressed there:
  22.2 on the first visit, 12.3 to 13.9 after.
- NOT MEASURED AGAIN since her head and the rest of his tops went in (2026-11-15), only added up from the files: the
  room's own first visit wears `models/hair/ponytail.glb` (0.87 MB) where it wore `models/sarah-v2-hair.glb` (0.81 MB);
  fetched ahead as well are the five other hairstyles (4.57 MB), thirty-eight STYLE pictures and eleven more outfit
  cards (some 4 KB each). The hairstyles' light twins (2.2 MB, a game's) and the old hair file (the story's bake's) are
  on the site and are not fetched ahead (`NOT_AHEAD`). With the drawn bottoms (the same day): two more STYLE pictures
  (forty) and six more outfit cards.
- NOT MEASURED AGAIN since a phone wears her light skin (2026-11-16): a phone's first visit fetches its triangles as
  well (`models/sarah-v2-body-light.bin`, 1.5 MB), kept as they land; a computer never asks for them. The probe
  (`scripts/probe-on-device.mjs`) opens the room as a phone, so its megabytes are a phone's now.
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

## The male base model

- **On the menu beside her, FEMALE and MALE** (Joshua, 2026-11-19: "Can we work on the male character now?... load the same
  skeleton, redraw the organs for a male, size the skeleton to fit the male model, get the sliders to work… minus the
  breasts"; of the two male files, "go with 2"). `public/models/male-base.glb`, made from `assets-archive/models/male-base-touched.glb`
  by `node scripts/male/maleSideLock.mjs` (the archive is not changed). `sarahLabTool.ts` `MALE_BASE_MODEL`, `isMaleModel`;
  the Body tab's FEMALE / MALE (`SARAH_LAB_ACTION.baseModel`); MODEL stays, hidden, for a probe. On screen: "Male Base Model".
- **HIS BONES ARE NAMED ONE ON FROM HERS** (MEASURED: his spine has one bone more -- Bone_001, Bone_005, Bone_004, Bone_003,
  Bone_002 to hers Bone_001, Bone_004, Bone_003, Bone_002 -- and every bone after it is one further on). The room finds his
  bones BY ROLE (`measureHuman`); what knew her bones by name is mapped (`maleRig.ts` `hisBone`, `herBone`; her arms' bones
  for her breath, `armShareOf`, by role now).
- **HIS ARMPITS AND SIDES** (a fault of his file: in T-POSE his back and sides stood in flaps up to his arms; Meshy gave his arm
  bones up to 0.79 of his side down to 14 cm under his armpit). `scripts/male/maleArmWeights.mjs` (her armpit script with his
  own arm numbers: thicker upper arm, `ARM_RADIUS_M` 0.075) and her side lock (`SIDE_LOCK`), his weights as 32-bit numbers.
  `tests/maleBase.test.ts`.
- **HIS BELLY** (`maleBelly.ts`; his: "maybe a max 100%", then "200% will be just doubled the size"): one smooth field in
  space on his rest shape, between the BOTTOM of his pubic bone and his breastbone's tip as the skeleton laid in him has them
  (his: "it should sit below the ribs"). An EGG (his: "more of an egg / oval shape, bottom a little bigger then the top";
  "blend all around the belly into the surrounding skin"): from his side fullest at 0.42 of the way up, soft at both ends
  (`bellyEgg`); from his front an oval a third narrower at his ribs than at his pubic bone, eased into his sides; its bottom
  edge a U along his groin. 6.75 cm forward at 100% (his drawn curve's 13.5 at 200%), the belly slider's %, to 200.
  Moves none of what his arms carry, and all of the skin low on his belly that his file half gives his thighs ("It's still
  squished at the bottom"). Taken off his own side photograph and then his drawing over the chart of it (neither kept): his
  profile is nearest her belly at 40% in shape and 45% in size. GAME TUNING: `MALE_BELLY`.
- **HIS NAVEL**: an innie as modelled; NAVEL · INNIE / HALF OUT / OUTIE (`maleOutie`) pushes its floor out to his skin and 4 mm
  past (an adult outie is mostly a small umbilical hernia: Cleveland Clinic). NOT YET KEPT IN A SAVE.
- **THE ONE SKELETON IN HIM** (her `sarah-skeleton.glb`, laid by `skeletonInV2.ts` through `bodyName`), HIS RIB CAGE SIZED TO
  HIM (`trunkShape`, `MALE_TRUNK_SHAPE_OF`): MEASURED with hers as laid, his breastbone 5 to 8 cm behind his skin and her ribs
  2.5 to 4.5 cm inside his sides; deepened 1.35 from the back of the ribs and widened 1.07 over his chest, his breastbone is 1 to
  3 cm under his skin. Her pelvis stays (NOT YET a male pelvis).
- A fault found switching models, fixed: three's `compileAsync` threw in a timer when a body was let go under it
  (`compileSafely`).
- **HIS SKIN'S FINE RELIEF** (Joshua, 2026-11-19, of his Local Texture Lab, `tools/`: "add better depth and detail"; of
  Galaxy Defender's skin made with it: "use the HTML directly to redo it… and also test on the male model"). That skin's
  maps (512 px) were made from a body's whole skin picture cut up by the lab's seamless blend -- pieces of a face, nipples, a
  navel -- and its height is those pieces' edges: not used. `scripts/skinDetail.mjs` makes a 1024 px seamless height map by
  the lab's own procedural maths and a pore layer (`public/models/skins/skin-detail-1024.png`); `skinDetail.ts` lays it
  TRIPLANAR on his rest place (his atlas's islands are every size), 6 cm a tile, 0.4 mm deep, as a bump over his normal map,
  its pits a little darker (`SKIN_DETAIL`: GAME TUNING; the probe's `skinDetail({ depthM, tileM, cavity })`). MEASURED in the
  room: front, close and back, on and off. HERS TOO (Joshua, 2026-11-19: "How does it look on the female model?"): laid on her
  rest place as her skin's program carries it (`vFabricPos`, `vFabricNrm`: nothing added to her vertex stage, which has
  every attribute a phone gives it), her skin's program put on her for it (`ensureSkinFabric`), and NONE OF IT UNDER HER
  PAINT (`fabricMatte`). MEASURED in the room: the painted bike shorts and crop tee at 100%, her side and her belly, on and off.
- **THE HYBRID, AS IT IS NOW** (Joshua, 2026-11-19: "Can you do a hybrid of yours and theirs, push, and then I can have it
  grab the latest update and grab your work to apply" -- "theirs" Galaxy Defender's agent's): two depths on bare skin, as
  one bump of the drawn normal (`skinDetail.ts`), none under paint:
  1. EACH BODY'S OWN SKIN PICTURE'S DEPTH, 0.5 mm (`SKIN_DETAIL.ownDepthM`): `node scripts/skinHeight.mjs --in <its EVEN
     skin> --out <height png>` -- the lab's Convert mode at its own defaults (`LAB_CONVERT`), its SEAMLESS blend OFF (it
     tears an atlas into patches), read at the body's UVs where its colour is (`sarah-v2-skin-height-2048.png`,
     `male-base-skin-height-2048.png`). Make it again whenever a body's skin picture changes;
  2. THE TILE, 0.3 mm (`depthM`; 0.4 alone): `scripts/skinDetail.mjs`'s seamless pores and creases, triplanar on the rest
     place, 6 cm a tile, its pits 18% darker (`cavity`).
  FOR ANOTHER GAME (TRADDOMIUM, Galaxy Defender, the Godot rebuild): take the two scripts, the tile, and these numbers; a
  body's own height map is made from ITS OWN skin picture (its own UV layout), never borrowed from another body's.
  PICTURED in the room: plain, its own picture alone, the tile alone, both -- her bare belly and her face.
  HALF OF IT ON A FACE (`SKIN_DETAIL.face` 0.5, eased in between 0.83 and 0.87 of the body's height in its rest place --
  BIOLOGICAL SHAPE: the base of the neck to the chin): close on her face both depths read as orange peel (pictured
  2026-11-19, Joshua: "Haha, yeah…"). MEASURED in the room after: her face and his close, her belly as it was.
- **HER ROUGHNESS EVEN, AND HER OPENING'S AREA GIVEN THE RELIEF** (Joshua, 2026-11-19: "the pelvis wasn't the same texture
  and looks weird like wearing a bikini seeing different textures around that area"). Her file's roughness map was baked
  with a bikini on her: MEASURED at her vertices, from her navel to her crotch 127.5 of 255, her thighs 97.7 (her colour
  map has the same tan line, which EVEN took out; her normal map is flat there as everywhere). `node scripts/evenSkin.mjs
  --rough public/models/skins/sarah-v2-skin-rough-2048.webp` evens it as her colour is (her skin 106.5, her details'
  steps kept), worn with every skin but ORIGINAL (`skinChoices.ts` `SKIN_EVEN_ROUGHNESS`, `applyRoughness`; the probe's
  `evenRough(on)`). And her opening's area and her skin drawn behind it (`vulvaMesh.ts`), which are her material without
  her skin's program, take the relief too (`setSkinDetail`). PICTURED in the room: before, her belly glossy over a matte
  groin; after, one sheen. `tests/skinDetail.test.ts`.
- His organs (a prostate, no womb or ovaries), the pregnancy controls hidden for him, and his EVEN skin are done.
- **HIS BODY WEARS HIS OWN SKIN, AND NOTHING OF HERS** (a fault Joshua found, 2026-11-21: "John shows pieces of her skin
  scattered over him: a brown speck under his left eye, a strip down his forehead, patches on his jaw and neck"). FACE's
  SKIN choices are pictures of HER body on her UVs; `applySkin` put the chosen one on him as he loaded while the room
  fetched his own even skin beside it, and whichever landed last was worn -- hers, at once, when she had been shown first
  (her fetched skin is kept for a body loaded again). Now `applySkin` gives a male body his own (`wearHisSkin`,
  `MALE_EVEN_SKIN`, fetched once and kept as `hisEven`; his file's own map until it lands, never one of hers), SKIN and
  UPLOAD SKIN are not offered on him, and her choice waits for her. MEASURED in the room (light skin, 1x; the probe's
  `skinChoice().src`, the picture's file): she opened in `sarah-v2-skin-even-2048.webp`; switched to him,
  `male-base-skin-even-2048.webp` at once and every second for 16 s; back to her, hers; to him again, his for 8 s.
  Pictured: his face and three-quarter, no piece of her skin.
- **HIS BUILD** (Joshua, 2026-11-19: "get the sliders to work… minus the breasts"): HEIGHT & PROPORTIONS work on him as on her
  (`prepareBuildRig` on his rest, his bones by role, his geometry's units told by his rest frame: `metresPerUnitOf` --
  taken as his geometry's height over 1.70 m first, his height read 1.56 m; now 1.70). WALK is his too. BELLY SHAPE and
  BREAST SHAPE are not shown for him (`shapeBoxes`: her bump's and her breasts' controls, which move nothing on him).
  MEASURED in the room: his height at 0, +20 and -20 cm with shoulders, waist, hips, upper arms and head moved with it;
  walking and squatting with a build on.
- HIS SQUAT, TRIED AND NOT TAKEN (2026-11-19): his groin's skin is his thighs' -- MEASURED on his file, in the band from 44
  to 54% of his height within 20 cm of his middle his two thighs carry 7,728 of its weight and his body's bones 968, and
  down his midline one point is his left thigh's and the next his right's. Each thigh's share solved smooth along his skin
  round each hip joint (a harmonic solve, held at his region's edge, down each thigh, and on his midline at nothing and
  then at half of what the two carry): standing and walking as before, and in SQUAT the seam down his crotch from his
  front, three-quarter and below the same as without it (held at nothing, a web between his thighs). The seam is the
  fold of his skin between thighs spread past 100 degrees, a SHAPE his weights can not undo: it wants a pose's own field
  as hers has (`hipTurn.ts`, her groin's normals), laid for him.
- **HIS GROIN SMOOTHED IN SQUAT** (`SarahLabScene.ts` `MALE_GROIN`, `keepMaleSquat`; the probe's `maleGroin(on)`): as her knees
  are (`birthNormals.ts` with a band: it needs no birth area of hers now), his posed skin round the point 7 cm under the middle
  of his hip joints is smoothed where it stands -- 150 passes, 0.7 of the way, all within 8 cm, none past 17 -- and laid as a
  shape field while he squats (worked out again when his shape changes). PICTURED in the room from his front, three-quarter
  and below, off and on (60 passes within 7 cm tried first: the pinch gone, a line left down his middle): one surface from
  thigh to thigh. LEFT: a soft line of shade down his middle; a white streak along his lower belly's left side from below,
  there without it too.
- **HIS BELLY IS HIS BODY'S IN SQUAT, AS HERS IS** (Joshua, 2026-11-20: "at max belly for the male squatting, his lower belly
  was squished"; `SarahLabScene.ts` `MALE_HOLD`, `maleHeld`, field `shape:maleHold`, laid by `keepMaleSquat` before his groin's
  smoothing; `hipTurn.ts` `createHipTurn`'s `opts`: his units and his numbers). His lower belly is up to half his thighs'
  in his file, so the hold takes points his thigh carries up to half of (`most` 0.5, none past 0.85 -- hers 0.12/0.22: at
  hers it held 2,000 points a side and left a torn edge across his belly), and by his belly's size from 0 to 50% (his
  file has none; at 100% unheld his belly was squashed flat). MEASURED in the room, SQUAT: 0% as before; 100% and 200%
  round over his thighs from his side and three-quarter, about 4,700 points held a side, 82 mm moved at the most at 200%.
  The probe's `maleHold(on, numbers)`. LEFT: a firm fold where the underside of a 200% belly meets his thighs.
- **HIS BELLY IS CARRIED BY HIS PELVIS, AND KEEPS ITS SIDE PROFILE IN SQUAT** (Joshua, 2026-11-20: "Is it possible for the
  male model to keep the same side profile of the belly from 0-200% while squatting? It still appears to be off and
  flatten the bottom"; `SarahLabScene.ts` `MALE_BELLY_CARRY`, `carryMaleBelly`). SUPERSEDES THE HOLD ABOVE, which is off
  (`maleHoldOn` false; the probe's `maleHold(true)` puts it back). Where his belly's own shape is (`maleBellyFoot`: what it
  moves him at 100%, none under 2 mm, all from 15 mm) his thighs' share of his skin is handed to his PELVIS bone, by his
  belly's size: none at 0% -- his file's weights exactly, as he has always been -- all from 50%; the skinWeight attribute
  is written again from his file's own copy whenever that share changes, in every pose. His groin's smoothing (MALE_GROIN)
  is kept off the same points by the same share: it smoothed the bulge's underside away. GAME TUNING.
  - WHAT WAS TRIED FIRST, MEASURED in the room (light skin, 1x), each taken out: the hold given the belly's footprint (his
    body's bones evened in from round it: a boxy belly with seams where one bone's share gave way to the next); the
    bulge alone carried by ONE turn, his belly's own (as good as none: the squash is where his skinning carries the skin
    UNDER the bulge, not how it turns the bulge); all of it by one rigid carry (his groin's skin pulled up into a sheet).
  - A FAULT FOUND ON THE WAY, in v0.9.64 as live: in SQUAT his hands rest on his hips, and at 100 and 200% the hold carried
    a piece of his flank up with them in a flap (his file gives his arm bones a share of his flank, and the hold evened
    it inward). Gone with the hold.
  - MEASURED in the room (light skin, 1x, his boxer briefs): SQUAT at 0, 50, 100 and 200% from his side and three-quarter
    -- round over his thighs, its underside curved as standing; standing and walking at 200%. `maleCarry(on)` switches it.
- **HIS CLOTHES: HIS OWN OUTFITS, PAINTED** (Joshua, 2026-11-20: "start on some clothing options for the male model"; the
  order he passed: his underwear first, so he never loads bare, then the painted basics, then the cloth tee, then cuts of
  his own). The outfit editor's paint is laid on him as on her (`SarahLabScene.ts`: his skin given an all-nothing
  `_cloth_cover`, the attribute the editor finds its body by; `wearPaint`'s `dressable`). SIX OUTFITS OF HIS
  (`sarahLabTool.ts` `BuiltInOutfit.his`, put after everything there was; `offeredOutfits(available, his)`: his on him
  and hers on her, and her OUTFIT never steps onto his): his boxer briefs (`HIS_DEFAULT_OUTFIT`: what he opens in), his
  trunks, a tee, a V-neck tee, a sleeveless shirt over athletic shorts, a long-sleeve shirt over compression tights, in
  `MALE_COLOURS`. Four templates of his (`paintTemplates.ts`): `trunks` (0.105 of his leg), `boxerBriefs` (0.17),
  `shortsMale` (0.32), `tightsMale`, all on `MALE_RISE` (0.1 / 0.14 / 0.18 of his trunk: under his navel in front,
  over his seat behind) with a 3.5 cm waistband; his tops are her drawn tops as they are. All GAME TUNING.
  - THREE FAULTS FOUND PUTTING THEM ON HIM, each fixed: (1) HER OPENING'S AREA WAS REBUILT ON HIM (`remakeVulva`; her birth
    shade and her cleft's and lips' fields too) and drawn over his own skin -- a patch on the inside of his right thigh and
    under his seat that no paint reached; it is hers alone now. (2) HE WAS READ FACING BACKWARD: `bodyRegions.mapBody` tells
    which way a body faces by its torso (a pregnant torso reaches further forward than back), and his seat and back reach
    further back: every drawn top's neck opening was laid on his back (a V-neck a crew in front) and a waistband's front
    and back were swapped. His facing is told by his feet now (`mapBody`'s `facing`: his toes reach further from his
    ankles than his heels). (3) HIS FILE GIVES HIS ARM BONES THE SIDE OF HIS CHEST under his armpit: a sleeveless shirt's
    armhole was bare there in a ragged patch. His arm's skin is what lies within `MALE_ARM_REACH` (8.5 cm) of his arm's
    bones (`mapBody`'s `armReach`); further, it is his torso's. Hers is told as it always was.
  - TRUE BRIEFS ARE NOT A RING ROUND HIS LEG: tried at 0.04 of his leg, the lower half of his seat was bare. They want a
    drawn leg opening, as her bikini bottom has: NOT DONE. MEASURED in the room (light skin, 1x): the six from his
    three-quarter and his back, his underwear from his front, side, back and below, the sleeveless from both sides.
  - Their cards: `MALE=1 node scripts/bakeOutfitThumbs.mjs` (ONLY= his); his styles' pictures: `MALE=1
    ONLY=trunks,boxerBriefs,shortsMale,tightsMale node scripts/bakeStyleThumbs.mjs`.
- **HIS CLOTH TEE** (Joshua, 2026-11-20: "we should focus on his cloth tee now"). The procedural tee (`garment/`) DRAFTED ON
  HIM: `bodyInput.ts` `rigOf` (his joints by role, his arm bones every bone from a shoulder down, his geometry's metres as
  they are: `bindScale` 1, no offset) in place of her `SARAH_V2_RIG`; `RoomGarment`'s `rig`, `detailPoints: null` (her
  navel and nipples' detail points are hers) and `fabricScale` (his weave laid in metres, as hers is: `1 / M`, or the
  jersey drew in blotches). Its material is `shirtSpandexLite`, so the outfit editor's fabrics, colours and a picture of
  his own reach it. Three outfits of his, put after his six (`sarahLabTool.ts`): `his cloth tee`, `his cloth V-neck tee`
  and `his cloth long-sleeve tee + athletic shorts`, each at LENGTH 17 (the drafted hem, her hip's, is at his mid-thigh:
  his widest girth is low -- at 12 a gap of skin over his shorts' waistband), fetching nothing. GAME TUNING.
  - TWO WRONG STEPS OF MINE ON THE WAY: `unitsPerMetre` must be the room's (M, world cm): at 1 the tee closed to a ring;
    and a HALF TURN I gave his body on the way in, thinking her rest frame faces -z -- `measure.ts` reads her front as
    the LARGEST z, as his faces: turned, the V-neck was on his back. Taken out.
  - MEASURED in the room (light skin, 1x): the three from his three-quarter and his back, the crew from his side; hem
    86 to 87 cm from the floor, over his shorts' waistband; no error on the page.
  - NOT DONE: his tee in his poses (squat, seated, walking) looked at; its sleeves stand a little off his arms (the
    draft's ease is hers); a cuff's edge at the long sleeve's wrist.
- NOT DONE: his own pelvis bone; true briefs; loose shorts and trousers;
  RECLINE floats (her bed is not drawn either); his NAVEL setting kept in a save.
- After anything changes him: `tests/maleBase.test.ts`, `tests/maleBelly.test.ts`, `tests/sarahBase.test.ts`; then the room:
  MALE, his belly at 0, 100 and 200% from his side and front, T-POSE from his back, X-RAY from his side.

## His head: face, eyes, facial hair and hair

- **HIS FACE IS HERS DRAWN THROUGH A FRAME FITTED TO HIS** (Joshua, 2026-11-21: "Let's work on hair, face, and eye options for
  the male model now"). The face layer (`faceRig.ts`) is numbers measured on her sculpt in her rest metres; a body's face is a
  `FaceSpec`: a FRAME taking its geometry into her rest metres (`rest = scale · turnX(pitch) · position + offset`, a turn about
  x alone, the jaw's own axis, so the jaw turns the same in both) and brows, lashes, lips and defaults of its own. HER
  PROGRAM'S TEXT IS AS IT WAS TO THE LETTER (`HER_FACE`; the lines are built by `shaderFor(spec)`, its key `|face-rig-v3`);
  his is another program (`|face-rig-v3-male`).
  - HIS FRAME, MEASURED 2026-11-21 (`maleFace.ts` `MALE_FACE_FIT`): her face, brow to chin, nose to ears, fitted onto his by
    an iterative closest-point fit allowing a scale, a turn about x and a carry: `his = 1.0234 · turnX(-4.35°) · hers +
    (0.0096, -0.0225, 0.1978)`, half her points within 1.41 mm of his skin; his nose's tip, not fitted to, falls 2.0 mm from
    hers. Her eyes' centres fall in his sockets, her lips' seam on his. His head bone is `Bone_017`.
  - HIS BROWS, LASHES AND LIPS (GAME TUNING by eye): brows lower and flatter, fuller, a squarer head, dark brown; lashes
    shorter, no flick; lips their own colour nearer his skin's, his upper lip a little thinner. Eyes, their colours, blinking,
    looking, the mouth's inside and the jaw are hers as they are.
  - HIS FACE'S SHAPES: the same sliders and face types, laid through his frame (`faceShapeFields.ts` `headPoints`, `faceFieldOn`'s
    `frame`: a move and a normal's turn taken back out by the frame's turn).
- **HIS FACIAL HAIR** (his answer to stubble, a short beard, a full beard, a mustache and a goatee: "All sounds good"):
  `FaceSpec.beard` (`BeardDesign`, `maleFace.ts` `BEARD`), PAINTED IN THE FACE LAYER as the brows are, so it rides his jaw, his
  face's shapes and his skin. Its AREA is lines MEASURED on his face in her rest metres (the underside of his chin at y 1.478,
  his jaw's angle (0.060, 1.526, -0.066), the front of his ear z -0.087 to -0.099) -- a cheek line, a back edge in front of his
  ear, a neckline plane, the upper lip and the chin -- its edges wavered by a smooth noise; its HAIRS short strokes in a chart of
  his lower face (a sphere's angles about a point inside his jaw), growing down it, a mustache's leaning out from his philtrum,
  over a fill broken into grain (stubble's most). Six kinds (`BEARD_STYLE_IDS`: none, stubble, short, full, mustache, goatee),
  a THICKNESS and a COLOUR (null: his brows', which follow his hair's). A face with no design (hers) has none of it in its
  program. GAME TUNING but where MEASURED. NOT DONE: no volume (a full beard is painted, not a shell: from his side his jaw's
  outline is his skin's).
- **HIS HEAD IS HIS OWN LOOK**: `headLook.ts` `HEAD_DEFAULT_MALE` (a crew cut in a dark brown '#3b2a20', clean-shaven); the
  room keeps a head for each body (`headForBody`): switching body shows that body's head. A look's `beard` is kept only when
  there is some; a save of his untouched head writes nothing (`savedHead(head, male)`, `headOf(body, male)`), and a colour a
  save names -- even null, the toolkit's copper -- is what was chosen. The FACE tab (`headPanel.ts`) shows FACIAL HAIR where the
  face has a design for it (`hooks.beard`), his hairstyles (`hooks.styles`), RESET HEAD to his own head (`hooks.own`), and its
  lines say "his" (`hooks.male`).
- **HIS MUSTACHE IS A CRESCENT, HIS GOATEE'S CHIN TAPERS** (`BeardDesign.mustache.corner`, `chin.topHalfWidth`): square,
  each read as a block stuck on his face (pictured in the room 2026-11-21). The mustache's top comes down from 2.5 cm
  under his nose to 6 mm over its bottom at its ends, from 0.3 of its half-width out; the chin patch is 3.2 cm wide under
  his lower lip and 5.4 cm at its foot, over 2.2 cm of height. GAME TUNING.
- **HIS HAIRSTYLES** (his: "keep the variety"): built by the hair toolkit ON HIS HEAD (`--body male`: `scripts/hair/head.mjs`
  `BODIES.male`, his head read into her rest metres by his face's frame, so a style is drawn in one frame for either head; the
  file written back into his geometry and onto his skeleton). `hairStyles.ts` `MALE_HAIR_STYLES`: six men's cuts (crew, buzz,
  side part, slicked back, curly top, man bun) and her six as he wears them, each `models/hair/male/<id>.glb` and its light
  twin. Her six's files are byte for byte as they were (a style chooses his numbers by `kit.head.body.id`).
  - A MAN'S HAIRLINE COVERS HIS TEMPLE AND COMES DOWN AS A SIDEBURN (the first cuts ran in one diagonal from his forehead to
    behind his ear: a bare temple, read as receded). Each cut's hairline goes back about 1.2 cm from his forehead's corner,
    straight down in front of his ear to a sideburn about 1.2 cm wide to mid-ear (y 1.565), AHEAD of his ear's front (z
    -0.087 to -0.099; up it at z -0.088 to -0.090 -- further back, the cap lay up to 0.86 mm under the root of his ear,
    MEASURED by `fit.mjs --body male`), over the ear and down behind it to his nape. `buzz.mjs` `MALE_HAIRLINE` (the crew's
    too), `side-part.mjs` `HIS_HAIRLINE` (the slicked back's), `curly-top.mjs` `CURLY_HAIRLINE`, `man-bun.mjs`
    `MALE_HAIRLINE`, `ponytail.mjs` `HIS_HAIRLINE` (her five others' on him). GAME TUNING on his MEASURED landmarks.
  - THE CAP MUST REACH WHAT THE HAIRLINE KEEPS: the hairline is a mask on the cap, and the cap is a grid round its gather out
    to `phiMax`; at 2.75 the curly top's grid stopped above his temples and its new hairline kept nothing there (3.13 now,
    as the side part's).
  - A HAIRLINE CUT ALONG A CURVE, NOT A STAIRCASE: the kit's alpha fades over about 5 mm of hairline distance, one cell of
    the cap, so the alpha test cut along the cells. His cuts scale the frame's `hairMask` (buzz and crew `softEdge` 0.5 and
    0.25 light; the side part and slicked back 0.4 and 0.2, divided by the line's slope where it runs upright): about 2.5
    cells, the line where it was. The kit is as it was, so hers are.
  - HER SIX ON HIM (`ponytail.mjs` `onHim`): each of her fixed points moved out or in from the head's upright axis by how
    much further out his surface is than hers, a table MEASURED on both bodies' files every 30 degrees and 3 cm of height
    (his back of head about 2 cm shallower, his neck thicker, his upper back further back). The ponytail's and the braid's
    fall come 2.2 cm in at his nape (none from 1.40 m down: brought in there, the tail lay up to 5.8 mm under his upper
    back); the long loose hair's falls lie on his shoulders (at her reach they stood off them like wings); the bob's crown
    rounded over his head (it peaked). THE WAVY PONYTAIL FALLS DOWN HIS BACK (her way, over his shoulder, his wider and
    higher shoulder stood it off him in a slab, its locks apart, and from behind it stuck out sideways: pictured in the
    room) -- its tail's own path for him, side [1, 0, 0], no transport.
  - MEASURED off the room 2026-11-21 (`fit.mjs --body male`, each of the 24 files at its longest and shortest): none of it
    under his skin but one point of the side part's cap at his right ear's front, 0.50 mm, at the alpha cutoff. Triangles:
    the man bun 29,312 (its coils' and combed locks' segments cut to stay under 30,000), the curly top 18,720 in curls.
  - His twelve full files are fetched ahead (12.3 MB), his light twins not (`keepList.ts` `NOT_AHEAD`, `male/` in the rule).
  - MEASURED in the room 2026-11-21 (light skin, 1x, no error on the page): each of the twelve on him from his
    three-quarter and his back, the crew from four sides, each style pictured only once the room says it is worn
    (`face` probe: `hair.worn` its id, not `loading` -- a picture taken a few seconds after a style is asked for shows
    the one before it); the five kinds of facial hair; the SQUARE face with a short beard and the side part from his
    front, three-quarter and side.
  - NOT DONE, AND NAMED: the man bun's bun is a smooth ball from behind and its sides' combed locks barely show; the side
    part's fringe stands in a few spikes from his side; a few dark pixels at his ear's outer edge in the buzz and crew from
    his front; the light files' hairlines step more than the full ones'; the bob on him is a little lumpy at its front.
- After anything changes his head: `tests/maleHead.test.ts`, `tests/faceRig.test.ts`, `tests/faceShapeFields.test.ts`,
  `tests/headLook.test.ts`, `tests/headPanel.test.ts`, `tests/hairStyles.test.ts`; then the room: MALE, his face from his front,
  three-quarter and side, each kind of facial hair, a face type, a hairstyle of each kind.

## A face's details, and a picture over the skin

- **FIVE THINGS FOR GDM'S MARY AND JOHN FISHER** (Joshua, 2026-11-22: "1. Freckles / skin marks in the face layer: amount,
  colour, size, area (nose, cheeks, forehead, shoulders). 2. Two-tone iris (inner ring colour + outer colour) for hazel eyes.
  3. Brow shape per character (arch height, straightness), not only colour and thickness. 4. Deeper face realism: eyelid
  crease, deep-set eyes, smile lines, philtrum; or per-character head morphs. 5. A per-character skin overlay picture (UV
  decal) saved with the character, for face detail"; his reference pictures, AI-made, are on the `claude-reference` branch,
  `faces/`: "Keep in your branch, main doesn't need it"). For her and for him, each kept with the character (`headLook.ts`:
  `eyes.inner`, `eyes.innerSize`, `brows.arch / straight / tilt / thick`, `marks`, `detail`, `overlay`; each kept only where
  it is not as before, so a save of an older look is the text it was).
- **THE FACE LAYER DRAWS THEM ONLY IN A PROGRAM THAT HAS THEM** (`faceRig.ts` `faceNeedsDetails`, `shaderFor(spec, x)`): her
  program and his are the text they were (`tests/maleHead.test.ts` holds hers to the letter) until a look asks for a detail;
  then the material's program with the details goes on, once (its key ends `-details`), and later changes are uniforms.
  - FRECKLES (`FACE_MARKS`): spots in her rest metres, a jittered point in a 3D grid of cells a disc where her skin passes
    near it (the depth it is crossed at sizes it: no two alike), two layers, clustered by a noise; their AREAS soft
    ellipsoids MEASURED on her skin (nose, both cheeks, forehead) and a band over her shoulders. Far off, a pixel wider than
    a freckle lays the tone they average to. NEVER OVER HER PAINT: the fabric's program's `fabricMatte` says where paint
    covers her; it goes in by its own patch, so the face's lines say `FACE_PAINT_COVER` and a last step on the material
    (`finishDetails`) puts the name in -- the room lays the fabric's program on her before it asks for the details (`faceFrame`).
  - TWO-TONE IRIS: the inner ring's colour (`irisInner`) laid round the pupil as it is, the base then the OUTER colour itself
    (not the palette's solved base); INNER RING SIZE moves where it gives way (`FACE_IRIS_SPLIT`, 0.5 her own).
  - BROW SHAPE (`FACE_BROW_SHAPE`): ARCH lifts its arch (head kept, tail keeping 0.3), STRAIGHT draws it to the line from its
    head to its tail, TILT lifts its tail, THICKNESS. The CPU mirrors (`faceBrowLine`, `faceIrisColour`) agree.
  - FACE DETAIL (`FACE_DETAIL`), painted as a warm shade: EYELID CREASE over each upper lid; SMILE LINES from the nose's wing
    past the mouth's corner (MEASURED: the wing |x| 0.018 at 1.546); PHILTRUM, two ridges under the nose (MEASURED: her
    philtrum is short, 1.534 to 1.528); DEEP-SET EYES is a FACE SHAPE slider (`faceShapes.ts` `eyeDepth`, max 3.4 mm: her
    eyes back, her brow ridge forward) whose number lays the socket's shade too; the FACE tab shows it in FACE DETAIL.
- **SKIN PICTURE** (`SarahLabScene.ts` `layOverlay`, `drawOverlay`): a picture of his own laid over the skin worn, in its
  layout, AMOUNT of it, on a copy of that skin drawn on a canvas -- her skin's program reads no further picture (a phone has
  13 of its 16 at her skin's fragment stage). Kept on the device at up to 2048 a side (`pictureStore.ts` `OVERLAY_MAX`) by its
  id; an exported character takes it in the zip (`picturesUsed`; an import takes up to 16 MB a picture). TEMPLATE saves the
  skin worn with its layout's triangles drawn on it, to paint over. His is laid on his skin, in his layout.
- MEASURED in the room 2026-11-22 (light skin; 1x, the pictures for Joshua at 2x; no error on the page): a Mary look on her
  (green eyes with a gold inner ring, arched brows, freckles on her nose, cheeks and shoulders, crease, smile lines,
  philtrum) from her front, three-quarter and close on an eye and on her cheek; a John look on him (blue-grey eyes with a
  grey inner ring, straight heavy brows, DEEP-SET 60%, crease, smile lines, philtrum, stubble) the same. Her freckled
  shoulders under the painted scoop-neck tee: none on the paint, to its edge. A test picture (blue dots) uploaded through
  the panel's own file input: laid over her skin in its layout, under her painted top, at 30% fainter; TEMPLATE saved
  `skin-template-female-2048.png` (100 s on the build machine's software renderer: NOT MEASURED on a phone).
  FOUND: HER SKIN'S LAYOUT IS CUT INTO HUNDREDS OF SMALL ISLANDS (Meshy's unwrap; her face in several), so a SKIN PICTURE
  is for a picture made by a tool that paints onto the model or bakes into its layout -- painted by hand on the template it
  is hard to line up. A picture of a face laid on from the front (projected) would be the hand-painted way: NOT BUILT, told.
  First builds, pictured and changed the same evening: freckles in a 3D grid (too few, too alike); the details' shades a
  tenth of what they are now (not to be seen); the smile line a hairline 0.7 mm wide running past the mouth to the jaw.
- After anything changes them: `tests/faceDetails.test.ts`, `tests/headPanelDetails.test.ts`, `tests/faceRig.test.ts`,
  `tests/maleHead.test.ts`, `tests/faceShapes.test.ts`, `tests/headLook.test.ts`; then the room: a Mary look on her and a John
  look on him from the front, three-quarter and close on an eye, her shoulders under a top.

## Verification

`npm run typecheck`, `npm test`, `npm run build`. Render probes are local
(Playwright + swiftshader, one browser at a time; never rebuild `dist` while
one runs). Kill a stray process by its PID only.

**One preview, one page** (Joshua, 2026-11-13: "When you check how things look,
keep one local preview running while you work and reuse the same browser page
for all your screenshots instead of reloading or restarting for each one. Only
screenshot the parts that changed. Shut the preview down when you're done").
Open the room once and drive that page for every reading and picture of a piece
of work (the probe's `picture` hands back what the room's own camera sees in one
frame; a screenshot through the page costs some ten, two seconds each on the
build machine); load it again only when `dist` has been built again; picture the panel
or the part of her that changed, not the whole screen each time; and close the
browser and the preview when the work is done. A software renderer's frame
costs by the pixel and the page answers between frames: read and measure at 1x,
and draw at a phone's 2x only for the pictures a person will see. (A preview
left running in the background is stopped by the session after two hours: past
that, open it for a bounded batch of readings and close it.)

## Several agents, one lead

- **Agents write, the lead reads, checks and puts together** (Joshua, 2026-11-14: "Can you run multiple agents to maybe
  code each remaining top, hair, face, etc?... they would code, you review, implement, test, and adjust as needed… You
  can also set the models less to maybe Opus on Low, or Sonnet on medium depending on how complex it is"; and
  TRADDOMIUM's rule of 2026-09-08, carried: agents only write code, one file or folder each, 8 at most, no separate
  review or test agent, `SarahLabScene.ts` touched by one hand). Each agent works in a worktree of its own
  (`/home/claude/wt/<name>`, branch `agent/<name>`) on files that are its alone; `SarahLabScene.ts`, `fabricPanel.ts`,
  `characterSaves.ts` and anything two pieces of work meet in are the lead's. THE ROOM IS THE LEAD'S: one browser, and
  an agent never starts one, never builds `dist`, never pushes.
- **What the parts of her head agree on is `headLook.ts`**: one record a character (her hair's style, length and
  colour, her eyes', brows' and lips' colours and amounts, her lashes, her face's sliders). A colour is `null` -- her
  own, drawn by the part's own numbers exactly as before it could be chosen -- or '#rrggbb'.
- **A picture without a browser** (`scripts/preview/`): `raster.mjs` draws triangles square on, in software, into a PNG
  in about a second; `body.mjs` reads her body file into her rest METRES with her skin's picture, her joints and her
  arm's skin; `head.mjs` pictures her head and a hair file from four sides (`node scripts/preview/head.mjs`), `top.mts`
  a drawn top's cut on her, each pixel asking the cut as the shader does (`npx tsx scripts/preview/top.mts --style v`).
  A SKETCH TO WORK BY: her file's own shape, one light, none of the room's shaders. Work is judged by the room's own
  pictures ("Verification").

## Git

Commit trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
