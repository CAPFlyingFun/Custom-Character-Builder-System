/**
 * THE HAIRSTYLES' FILES KEEP THEIR CONTRACT (`src/sarahlab/hairStyles.ts`, `scripts/hair/glb.mjs`): ids a save can keep,
 * files that exist, one skinned mesh on her own skeleton with one material `sarahHair`, every point's weights summing to
 * one, a `shorter` morph with the same points where a length is declared, triangles within their budgets, and no drawn
 * point under her skin.
 *
 * UNDER HER SKIN: MEASURED 2026-11-14 on her rest surface (`scripts/hair/fit.mjs`), each file at its longest and its
 * shortest, the points whose vertex alpha passes the cutoff: none of any file is under her skin at all (deepest 0.0 mm;
 * the light ponytail's wider curtain was 4.5 mm into her temple before its cards were held off her). The tolerance,
 * 0.5 mm, is for a float's rounding in the file's quantized points.
 *
 * HIS (`MALE_HAIR_STYLES`, 2026-11-21: his six cuts and her six as he wears them) are held to the same contract on HIS
 * head and HIS skeleton (`--body male`).
 */
import { existsSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { HAIR_STYLES, HAIR_STYLE_NONE, MALE_HAIR_STYLES, hairStyle, type HairStyle } from '../src/sarahlab/hairStyles';
import { BODIES, hairIo, loadHead, type HairHead } from '../scripts/hair/head.mjs';
import { hairPoints, pointAlpha, underSkin } from '../scripts/hair/fit.mjs';

const UNDER_SKIN_MM = 0.5;
/** Today's hairstyle has 28,020 triangles; a style is held under 30,000 and its light twin under a quarter of its own. */
const BUDGET = 30000, LIGHT_SHARE = 0.25;
const pub = (f: string) => `public/${f}`;
/** Every file to hold: each style's, its light twin's, and the toolkit's bake of the first style with its length. */
const FILES = [...new Set([...HAIR_STYLES.flatMap((s) => [s.file, s.lightFile]), 'models/hair/ponytail.glb'])];
/** His: each of his styles' files, built on his head and his skeleton (`--body male`). */
const MALE_FILES = MALE_HAIR_STYLES.flatMap((s) => [s.file, s.lightFile]);

describe('the hairstyles', () => {
  it('have ids a save can keep, each once, none of them "none"', () => {
    const ids = HAIR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
    expect(ids).not.toContain(HAIR_STYLE_NONE);
    expect(hairStyle('wavy-ponytail')?.name).toBe('Wavy low ponytail');
    expect(hairStyle(HAIR_STYLE_NONE)).toBeUndefined();
    for (const s of HAIR_STYLES) expect(s.name).not.toMatch(/sarah/i);
  });
  it('have their files', () => { for (const f of [...FILES, ...MALE_FILES]) expect(existsSync(pub(f)), f).toBe(true); });
  it('his are their own files, under models/hair/male/, with ids a save can keep', () => {
    const ids = MALE_HAIR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of MALE_HAIR_STYLES) {
      expect(s.id).toMatch(/^[a-z][a-z0-9-]{0,31}$/);
      expect(s.file).toBe(`models/hair/male/${s.id}.glb`);
      expect(s.lightFile).toBe(`models/hair/male/${s.id}-light.glb`);
      expect(s.name).not.toMatch(/sarah/i);
    }
  });
});

function eachFile(title: string, files: readonly string[], styles: readonly HairStyle[], body: 'female' | 'male', extra: readonly string[] = []) {
  describe(title, () => {
    let head: HairHead;
    beforeAll(async () => { head = await loadHead(BODIES[body].file, body); }, 60000);

    for (const file of files) {
      it(`${file}: one skinned mesh on the skeleton, sarahHair, weights summing to one, its length as declared`, async () => {
        const io = await hairIo(), doc = await io.read(pub(file)), root = doc.getRoot();
        expect(root.listMeshes()).toHaveLength(1);
        const mesh = root.listMeshes()[0], prims = mesh.listPrimitives();
        expect(prims).toHaveLength(1);
        expect(prims[0].getMaterial()?.getName()).toBe('sarahHair');
        expect(root.listTextures()).toHaveLength(1);
        expect(root.listSkins()[0].listJoints().map((j) => j.getName())).toEqual(head.joints);
        const W = prims[0].getAttribute('WEIGHTS_0')!, e: number[] = [];
        let worst = 0;
        for (let i = 0; i < W.getCount(); i++) { W.getElement(i, e); worst = Math.max(worst, Math.abs(e[0] + e[1] + e[2] + e[3] - 1)); }
        expect(worst).toBeLessThan(1e-3);
        const style = styles.find((s) => s.file === file);
        const targets = prims[0].listTargets(), extras = mesh.getExtras() as { targetNames?: string[]; sarahHair?: { length?: boolean } };
        if (style?.hasLength || extra.includes(file) || file.endsWith('-light.glb')) {
          expect(targets).toHaveLength(1);
          expect(extras.targetNames).toEqual(['shorter']);
          expect(extras.sarahHair?.length).toBe(true);
          expect(targets[0].getAttribute('POSITION')!.getCount()).toBe(prims[0].getAttribute('POSITION')!.getCount());
        }
        if (style && !style.hasLength) expect(targets).toHaveLength(0);
      });

      it(`${file}: within its triangle budget, and no drawn point under the skin`, async () => {
        const { points, prim } = await hairPoints(pub(file), 0, body);
        const triangles = prim.getIndices()!.getCount() / 3;
        const light = file.endsWith('-light.glb');
        if (light) {
          const full = styles.find((s) => s.lightFile === file)!;
          const own = (await hairPoints(pub(full.file), 0, body)).prim.getIndices()!.getCount() / 3;
          expect(triangles).toBeLessThan(own * LIGHT_SHARE);
        } else expect(triangles).toBeLessThan(BUDGET);
        const alpha = pointAlpha(prim);
        expect(underSkin(head, points, alpha).deepestMm).toBeLessThanOrEqual(UNDER_SKIN_MM);
        if (prim.listTargets().length) expect(underSkin(head, (await hairPoints(pub(file), 1, body)).points, alpha).deepestMm).toBeLessThanOrEqual(UNDER_SKIN_MM);
      }, 60000);
    }
  });
}

eachFile('each hair file', FILES, HAIR_STYLES, 'female', ['models/hair/ponytail.glb']);
eachFile('each of his hair files, on his head', MALE_FILES, MALE_HAIR_STYLES, 'male');
