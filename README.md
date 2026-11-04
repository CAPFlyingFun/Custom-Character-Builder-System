# Custom Character Builder System

The character system behind TRADDOMIUM: Micro Battle!, TMB-Story, Beyond
Extinction and the games after them -- bodies, shapes, skin, clothes, poses,
joint ranges (female and male, researched), birth and holding a newborn --
built and tried in the **Character Room**.

**Open it:** https://capflyingfun.github.io/Custom-Character-Builder-System/

```
npm install
npm run dev        # the Character Room locally
npm run typecheck && npm test && npm run build
```

- `src/sarahlab/` -- the Character Room
- `src/actor/` -- the human body without three.js: skeleton, poses, birth, sitting, reach, aim, feet, joint limits
- `src/view/` -- where a pose meets a mesh
- `src/data/jointRange.ts` -- the master table of how far each joint goes
- `public/` -- her models, skins, fabrics and decoders; `assets-archive/` -- the masters they are baked from
- `scripts/` -- the bake pipeline (see `scripts/MANUAL.md`)
