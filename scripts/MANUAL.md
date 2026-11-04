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

Moved here from TRADDOMIUM when it stopped hosting the room (2026-11-04), with their tests (`sarahClothes`, `sarahLightTee`, `sarahV2RecoveredBikini`).
