# scripts/

Character asset pipeline, carried over from TRADDOMIUM (2026-11-04) with the
Character Room. Each is run by hand with `node scripts/<name>.mjs`; none is
part of the site's build.

- `authorSarah.mjs`, `packSarah.mjs`, `paintSarah.mjs`, `rebakeSarah.mjs` -- her body files, from the masters in `assets-archive/`
- `bakeHumans.mjs`, `humanSurface.mjs` (`.d.mts`) -- the human bind measurements and surface tables
- `fitClothToSkin.mjs`, `growClothes.mjs`, `paintGarment.mjs`, `shirtFabric.mjs`, `swapSarahGarment.mjs`, `fitMeshyBikini.mjs` -- clothing bakes
- `sarahV2*.mjs`, `sarahV2Outfit/`, `sarahV2ProcBikini/`, `sarahV2Recovery/` -- the v2 body's shapes, weights, correctives and recovered clothes (tests read `sarahV2Recovery/bikini/collider.mjs`)
- `probe-humans.mjs`, `probe-sarahlab.mjs` -- render probes (local only, Playwright)
