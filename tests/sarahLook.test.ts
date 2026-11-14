import { describe, expect, it } from 'vitest';
import { parseShape } from '../src/actor/bodyShape';
import { SARAH_LOOK, lookOpenedOn } from '../src/sarahlab/sarahLook';
import { OUTFITS, OUTFIT_FORMER_NAMES, SARAH_LEGGINGS, SIM_TEE_OUTFIT, outfitNamed } from '../src/sarahlab/sarahLabTool';

describe('Sarah as Joshua set her (2026-10-24: "Here is Sarah and the minor tweaks I did")', () => {
  it('reads back through the saves\' own door, exactly as his phone saved her', () => {
    expect(SARAH_LOOK).not.toBeNull();
    const look = SARAH_LOOK!;
    expect(look.body.model).toBe('v2-body');
    expect(look.body.bump).toBe(73);
    expect(parseShape(look.body.shape).navel).toBe(20);
    // (saved under the name its outfit had then, "Sarah · ...": it still finds the outfit, which has lost that word)
    expect(look.clothes.outfit).toBe('Sarah · red spandex tee + charcoal leggings');
    expect(outfitNamed(look.clothes.outfit)).toBe(SIM_TEE_OUTFIT);
  });

  // (Joshua, 2026-11-13: "let's remove the word Sarah and keep everything generic")
  it('no built-in outfit is named for her now, and each name one had still finds it', () => {
    for (const o of OUTFITS) expect(o.name).not.toMatch(/sarah/i);
    for (const [was, now] of Object.entries(OUTFIT_FORMER_NAMES)) { expect(was).toBe(`Sarah · ${now}`); expect(OUTFITS[outfitNamed(was)].name).toBe(now); expect(outfitNamed(now)).toBe(outfitNamed(was)); }
    expect(outfitNamed('an outfit of his own')).toBe(-1); expect(outfitNamed(null)).toBe(-1); expect(outfitNamed('')).toBe(-1);
  });

  // ("probably should set at 0% by default": the room itself opens on the generic model; what measures her, and the
  // story's bake of her, still open on her)
  it('the room opens on her only for a probe, the story\'s bake, or when asked for by name', () => {
    expect(lookOpenedOn('')).toBeNull();
    expect(lookOpenedOn('?skin=ktx2')).toBeNull();
    expect(lookOpenedOn('?bake=outfits')).toBeNull();
    expect(lookOpenedOn('?probe=cloth')).toBe(SARAH_LOOK);
    expect(lookOpenedOn('?bake=story')).toBe(SARAH_LOOK);
    expect(lookOpenedOn('?look=sarah')).toBe(SARAH_LOOK);
  });

  it('wears his tee dye and the charcoal leggings, their detail held as he set it', () => {
    const c = SARAH_LOOK!.clothes;
    expect(c.garments.shirtSpandexLite?.fabric).toEqual({ family: 'athletic', colour: 8 });
    const legs = c.layers[0]!;
    expect(legs.template?.id).toBe('leggingsFull');
    expect(legs.choice.fabric?.tint).toBe(SARAH_LEGGINGS);
    expect(legs.detail?.override).toEqual({ nipple: 0.45, navel: 0.8 });
  });
});
