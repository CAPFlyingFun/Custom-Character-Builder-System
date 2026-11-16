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
  - its HEM is level, at its LENGTH (the drape's band is the edge there).
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
  NONE AT A HEM YET. A shirt's hem is its drape's hem band (`tunicDrape.ts`): a sheet in the shirt's own fabric, solid
  over the last 18 mm above the hem, which covers her skin's paint there. A band drawn on her skin at her hem (20 mm,
  his sheet's stitched hem) showed only where that sheet dips under her skin -- MEASURED 2026-11-14 in the room: a grey
  patch at her side in the top's own fabric, and, a pink tee with a red edging, chips of red at her side and hairlines
  of it round her. To draw a stitched hem the drape's band has to draw it as well (a template may still ask for one:
  `band.hem`).
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
- **A PAINTED SHIRT'S HEM: her paint ends at the hem band's own bottom edge, on a line that is straight across her
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
  only narrows it, until that is found. `tests/bandDial.test.ts`.
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
- After anything changes the hoop: `tests/bottomCut.test.ts`; then the room at 0, 100, 150 and 200% from her front, the
  side view he marked and behind-below.

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
- MEASURED in the room, both poses at 200 and 150% on the light skin and 200% on the full one: round, no line down her
  belly's sides, no patch. LEFT, AND NAMED: faint ripples low on her belly's front in SQUAT at 200%.
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
  (`SarahLabScene.ts` `lightBodyOn`, `LIGHT_BODY_TRIANGLES`); the status line says LIGHT SKIN (N triangles). Not fetched
  ahead by a device that does not wear it (`NOT_AHEAD`).
- **Left whole** (his, the same morning: "keep the (opening, belly/bellybutton, breasts/nipples, and head) at full
  quality, everywhere else can be less"; then "we forgot to add the hands in"): her head and neck, the front of her
  trunk from under her opening to over her bust, her opening's area, her hands. Her legs, hips and feet are the denser
  part of the rest (thinned as her arms and back are they stood in facets in SQUAT). 127,704 triangles of her 208,592:
  her hands alone are some 33,000 -- the first saving to take if he allows them less.
- A re-meshed body (Meshy, 6,737 points) was looked at and not used: another shape and pose, its points in other
  places, her face lost.
- WORK ON THE LIGHT SKIN FIRST (`?probe=cloth&body=light`, 1x): what he approves there is applied to the full one.
- After the list is made again: the room on it -- her bust at 0%, SQUAT and RECLINE at 200%, a hand.

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
