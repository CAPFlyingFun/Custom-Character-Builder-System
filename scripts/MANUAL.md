# scripts/

Character asset pipeline, carried over from TRADDOMIUM (2026-11-04) with the
Character Room. Each is run by hand with `node scripts/<name>.mjs`; none is
part of the site's build.

- `authorSarah.mjs`, `packSarah.mjs`, `paintSarah.mjs`, `rebakeSarah.mjs` -- her body files, from the masters in `assets-archive/`
- `bakeHumans.mjs`, `humanSurface.mjs` (`.d.mts`) -- the human bind measurements and surface tables
- `fitClothToSkin.mjs`, `growClothes.mjs`, `paintGarment.mjs`, `shirtFabric.mjs`, `swapSarahGarment.mjs`, `fitMeshyBikini.mjs` -- clothing bakes
- `sarahV2*.mjs`, `sarahV2Outfit/`, `sarahV2ProcBikini/`, `sarahV2Recovery/` -- the v2 body's shapes, weights, correctives and recovered clothes (tests read `sarahV2Recovery/bikini/collider.mjs`)
- `probe-humans.mjs`, `probe-sarahlab.mjs` -- render probes (local only, Playwright)
- `bellyMorph.mjs`, `bellyV2.mjs`, `roundBelly.mjs`, `cleanArmWeights.mjs`, `rigFingers.mjs`, `smoothArmpitWeights.mjs`, `smoothCreaseWeights.mjs`, `smoothHandWeights.mjs`, `smoothLegWeights.mjs`, `smoothSeatWeights.mjs`, `protectBumpWeights.mjs`, `bakeBadge.mjs`, `printBadge.mjs`, `clearShirtLogo.mjs` -- the passes `bakeHumans.mjs` runs over a body (TRADDOMIUM keeps its own copies for the game's people)
- `addSeatCorrective.mjs`, `clearShirtBust.mjs`, `fitAthleticTee.mjs`, `protectGrownBump.mjs`, `rebuildShirtHem.mjs`, `refineEarlyShirt.mjs`, `refineEarlyWaist.mjs`, `smoothShirtUnderbust.mjs` -- v1's `sarah-base.glb` passes (`rebakeSarah.mjs` imports most of them)
- `bakeOutfitThumbs.mjs` -- the outfit cards' pictures in `public/sarahlab/outfits/`, shot from the running room
- `baseTouchup/` -- the base-body touch-up kit (the Meshy male base and Sarah v2, region by region; `docs/reviews/base-touchups/` in TRADDOMIUM's history gives the run in order). Python 3 with numpy, scipy, Pillow and OpenCV, plus Node
- `probePng.mjs` -- the PNG reader the render probes share
- `rigSkeleton.mjs` -- her skeleton (`public/models/sarah-skeleton.glb`): Joshua's Meshy skeleton (`assets-archive/models/meshy-female-skeleton.glb`) rigged with her own 68 bones and a jaw, packed as her files are
- `measurePelvis.ts` -- her skeleton's pelvis (the obstetric conjugate, the inlet, the midpelvis and the outlet, their rings and the birth canal's curved centre line), measured from `public/models/sarah-skeleton.glb` by `actor/pelvisMeasure.ts` and saved to `src/data/pelvis/<rig>.json` for the womb and birth canal to be built against: `npx tsx scripts/measurePelvis.ts`. `tests/pelvisMeasure.test.ts` fails when the saved file and a fresh measure differ
- `measureTorso.ts` -- her skeleton's torso landmarks for her womb's weeks (the front of her spine, her lumbar discs, her navel's height at the L3/L4 disc and her xiphoid), cut down her midline by `actor/torsoMeasure.ts` and saved to `src/data/torso/<rig>.json` beside her pelvis's: `npx tsx scripts/measureTorso.ts` (after `measurePelvis.ts`). `tests/pregnantWomb.test.ts` fails when the saved file and a fresh measure differ
- `measureContacts.ts` -- each rig's contact points (finger pads and tips, palms, elbows, knees, heels, balls, toes) measured from its model and saved to `src/data/contacts/<rig>.json`, for the Godot rebuild and the other games: `npx tsx scripts/measureContacts.ts`. `tests/contactData.test.ts` fails when the saved files and a fresh measure differ

Moved here from TRADDOMIUM when it stopped hosting the room (2026-11-04), with their tests (`sarahClothes`, `sarahLightTee`, `sarahV2RecoveredBikini`).
