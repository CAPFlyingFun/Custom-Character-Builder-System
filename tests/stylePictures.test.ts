/**
 * THE OUTFIT EDITOR'S STYLE PICTURES (`stylePictures.ts`) and THE REST OF HIS SIXTEEN TOPS AS OUTFITS (`sarahLabTool.ts`
 * `OUTFITS`; Joshua, 2026-11-14: "are the new shirts available now in the clothing tab with updated images of their
 * style?… or modify the UI to work better"; 2026-11-15: "finish... the remaining clothes").
 *
 * What a style's picture is OF, where it is kept, and that every picture the room asks for is in `public/`: a style's
 * (`scripts/bakeStyleThumbs.mjs`) and an outfit card's (`scripts/bakeOutfitThumbs.mjs`).
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAINT_LAYER_COUNT } from '../src/sarahlab/bodyPaint';
import { COVERAGE_TEMPLATES, GARMENT_SETS, pieceKind, templateCut } from '../src/sarahlab/paintTemplates';
import { OUTFITS, RECOVERED_GARMENTS, RECOVERED_SHIRTS, SHEET_TOPS, offeredOutfits, outfitNamed, outfitThumbPath, type Garment } from '../src/sarahlab/sarahLabTool';
import { STYLE_FRAME, isHelperStyle, picturedAs, picturedStyles, stylePictureLayers, styleThumbPath } from '../src/sarahlab/stylePictures';
import { TOP_DETAIL_STYLES } from '../src/sarahlab/topDetails';
import { TOP_OUTLINES } from '../src/sarahlab/topCut';

const PUBLIC = join(__dirname, '..', 'public');
/** What the room has to dress her approved body in (her slim file's bikini, and the recovered parts): what its cards are made from. */
const v2: Garment[] = [...new Set<Garment>(['bikini', ...RECOVERED_GARMENTS, ...RECOVERED_SHIRTS])];

describe('a style\'s picture', () => {
  it('is kept under a stable, URL-safe name made from its template\'s id', () => {
    expect(styleThumbPath('teeV')).toBe('sarahlab/styles/tee-v.jpg');
    expect(styleThumbPath('sportsBra')).toBe('sarahlab/styles/sports-bra.jpg');
    expect(styleThumbPath('leggingsFull')).toBe('sarahlab/styles/leggings-full.jpg');
    const paths = picturedStyles().map((s) => styleThumbPath(s.id));
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p).toMatch(/^sarahlab\/styles\/[a-z0-9-]+\.jpg$/);
  });

  it('is made for every style the editor offers, and for none that is only another\'s other half', () => {
    const pictured = picturedStyles();
    expect(pictured.map((s) => s.id)).toEqual(COVERAGE_TEMPLATES.filter((t) => pieceKind(t.id) && !isHelperStyle(t.id)).map((t) => t.id));
    for (const set of Object.values(GARMENT_SETS)) { expect(isHelperStyle(set.edging)).toBe(true); expect(isHelperStyle(set.fabric)).toBe(false); expect(pictured.some((s) => s.id === set.edging)).toBe(false); }
    // each is pictured as the kind of piece it is -- but the tied bikini bottom, which the editor keeps with the
    // one-pieces and which has no top of its own: as a bottom, under a tee (as a one-piece it was her bare to the waist)
    for (const s of pictured) expect(s.kind, s.id).toBe(s.id === 'bikiniBottom' ? 'bottom' : pieceKind(s.id));
    expect(picturedAs('bikiniBottom')).toBe('bottom');
    expect(stylePictureLayers('bikiniBottom', 'bottom').map((l) => l.template)).toEqual(['bikiniBottom', 'teeShort']);
    for (const id of ['swimsuit', 'bodysuit', 'bodysuitFull']) expect(picturedAs(id), id).toBe('onePiece');
    // each kind of piece has a frame, and it is a part of her that is some of her
    for (const kind of new Set(pictured.map((s) => s.kind))) { const f = STYLE_FRAME[kind]; expect(f.to).toBeGreaterThan(f.from); expect(f.from).toBeGreaterThanOrEqual(0); expect(f.to).toBeLessThanOrEqual(1); }
  });

  it('is of the style itself over what a person would wear with it: templates the room has, in the room\'s three layers', () => {
    const known = new Set(COVERAGE_TEMPLATES.map((t) => t.id));
    for (const { id, kind } of picturedStyles()) {
      const layers = stylePictureLayers(id, kind);
      expect(layers.length, id).toBeGreaterThan(0);
      expect(layers.length, id).toBeLessThanOrEqual(PAINT_LAYER_COUNT);
      for (const l of layers) expect(known.has(l.template), `${id}: ${l.template}`).toBe(true);
      expect(layers.filter((l) => l.template === id).length, id).toBe(1);
      // a top lies over leggings, a one-piece on her alone, a bottom under a tee
      if (kind === 'top') expect(layers.map((l) => l.template)).toEqual(['leggingsFull', id]);
      if (kind === 'onePiece') expect(layers.map((l) => l.template)).toEqual([id]);
      if (kind === 'bottom') expect(layers[layers.length - 1].template).toBe('teeShort');
    }
    // a style whose edging is what it is keeps it: the ringer's navy bands, the raglan's maroon sleeves
    expect(stylePictureLayers('teeRinger', 'top')[1].edging).toBeDefined();
    expect(stylePictureLayers('teeRaglan', 'top')[1].edging?.tint).toBe(SHEET_TOPS.maroon);
    // and a set's bottom wears its edging under it
    expect(stylePictureLayers('athleticBottom', 'bottom').map((l) => l.template)).toEqual(['athleticBottomEdge', 'athleticBottom', 'teeShort']);
  });

  it('is in public/ for every style (scripts/bakeStyleThumbs.mjs): a small picture', () => {
    for (const { id } of picturedStyles()) {
      const file = join(PUBLIC, styleThumbPath(id));
      expect(existsSync(file), `${id}: ${styleThumbPath(id)} (node scripts/bakeStyleThumbs.mjs)`).toBe(true);
      expect(statSync(file).size, id).toBeGreaterThan(1500);
      expect(statSync(file).size, id).toBeLessThan(40_000);
    }
  });
});

describe('the rest of his sixteen tops, as outfits', () => {
  const NEW: readonly (readonly [string, string])[] = [
    ['painted tank top + leggings', 'tank'], ['painted sports bra + leggings', 'sportsBra'], ['painted raglan tee + leggings', 'teeRaglan'],
    ['painted henley + leggings', 'henley'], ['painted polo shirt + leggings', 'polo'], ['painted mock-neck top + leggings', 'mockNeck'],
    ['painted square-neck tee + leggings', 'teeSquare'], ['painted camisole + leggings', 'camisole'], ['painted crop tee + leggings', 'cropTee'],
    ['painted wrap top + leggings', 'wrap'], ['painted button-up shirt + leggings', 'buttonUp'],
  ];

  it('each is a drawn top of its own style over painted leggings, in his sheet\'s colour, and is offered on her', () => {
    const offered = offeredOutfits(v2).map((i) => OUTFITS[i].name);
    const tints = new Set<string>();
    for (const [name, template] of NEW) {
      const o = OUTFITS[outfitNamed(name)];
      expect(o, name).toBeDefined();
      expect(o.garments).toEqual([]);
      expect(o.paint?.map((l) => l.template)).toEqual(['leggingsFull', template]);
      const top = o.paint![1], t = COVERAGE_TEMPLATES.find((x) => x.id === template)!;
      expect(t, template).toBeDefined();
      // a DRAWN top: an outline of its own, a detail drawn on it, the boxy crop's own hem, or a neck style
      expect(!!t.params.top || !!t.params.detail || !!t.params.neckStyle, template).toBe(true);
      if (t.params.top && t.params.top in TOP_OUTLINES) expect(TOP_OUTLINES[t.params.top as keyof typeof TOP_OUTLINES]).toBeDefined();
      if (t.params.detail) expect(TOP_DETAIL_STYLES[t.params.detail]).toBeDefined();
      expect(top.fabric.family).toBe('jersey');
      expect(top.fabric.tint).toMatch(/^#[0-9a-f]{6}$/);
      expect(Object.values(SHEET_TOPS)).toContain(top.fabric.tint);
      tints.add(top.fabric.tint!);
      expect(offered).toContain(name);
    }
    // eleven tops, eleven colours; and the raglan's sleeves are its EDGING, his maroon on his heather grey
    expect(tints.size).toBe(NEW.length);
    const raglan = OUTFITS[outfitNamed('painted raglan tee + leggings')].paint![1];
    expect(raglan.fabric.tint).toBe(SHEET_TOPS.heather);
    expect(raglan.edging?.tint).toBe(SHEET_TOPS.maroon);
    for (const [name] of NEW) if (name !== 'painted raglan tee + leggings') expect(OUTFITS[outfitNamed(name)].paint![1].edging, name).toBeUndefined();
    // every one of his sixteen is an outfit now: the first five were (the crew is the painted tee)
    for (const template of ['teeShort', 'teeRinger', 'teeV', 'teeScoop', 'teeLong', ...NEW.map(([, t]) => t)]) expect(OUTFITS.some((o) => o.paint?.some((l) => l.template === template)), template).toBe(true);
    void templateCut;
  });

  it('every outfit the room offers on her has its card\'s picture in public/ (scripts/bakeOutfitThumbs.mjs)', () => {
    for (const i of offeredOutfits(v2)) {
      const file = join(PUBLIC, outfitThumbPath(OUTFITS[i].name));
      expect(existsSync(file), `${OUTFITS[i].name}: ${outfitThumbPath(OUTFITS[i].name)}`).toBe(true);
      expect(statSync(file).size, OUTFITS[i].name).toBeGreaterThan(1500);
    }
  });

  it('are put after the tops there were, so no outfit before them has moved', () => {
    const first = outfitNamed(NEW[0][0]);
    expect(OUTFITS[first - 1].name).toBe('painted long-sleeve tee + leggings');
    NEW.forEach(([name], k) => expect(outfitNamed(name)).toBe(first + k));
    expect(OUTFITS[first + NEW.length].name).toBe('painted swimsuit');
    expect(OUTFITS[OUTFITS.length - 1].name).toBe('painted leotard');
  });
});
