/**
 * THE CHARACTERS PANEL (Joshua, 2026-10-22): save a character under a name -- SAVE ALL, SAVE BODY or SAVE CLOTHES -- and
 * load her back; export the whole book (characters and shared outfits) to a file and import one. The shared outfits
 * themselves are made and kept in the outfit editor's SAVE workspace (`outfitPanel.ts`). The book and its rules are
 * `characterSaves.ts`; this is only its controls. The room supplies what she is now and how to put a save on her.
 *
 * Each saved character is a card with a picture of her as she was saved (Joshua, 2026-10-23, from the Character Studio
 * preview); a tap on it loads her, its ✕ deletes her after a second tap.
 */
import { outfitCards } from './outfitCards';
import {
  type CharacterBook, type OutfitRef, type SaveScope, type SavedBody, type SavedClothes,
  clothesFor, holds, importBook, mergeBooks, removeFrom, resolveClothes, saveInto,
} from './characterSaves';
import { bookFor, packExport, picturesUsed, unpackImport, type PackedPicture } from './characterExport';

export const CHARACTER_FIELD = Object.freeze({
  name: 'sarahlab-character-name',
  status: 'sarahlab-character-status',
  list: 'sarahlab-character-list',
  exportChooser: 'sarahlab-character-export',
});
export const CHARACTER_ACTION = Object.freeze({
  save: (scope: SaveScope) => `sarahlab:character:save:${scope}`,
  load: (name: string) => `sarahlab:character:load:${name}`,
  remove: (name: string) => `sarahlab:character:delete:${name}`,
  export: 'sarahlab:character:export',
  /** EXPORT's chooser: a character in or out, ALL, NONE, the shared outfits, and the file itself. */
  exportPick: (name: string) => `sarahlab:character:export-pick:${name}`,
  exportAll: 'sarahlab:character:export-all',
  exportNone: 'sarahlab:character:export-none',
  exportOutfits: 'sarahlab:character:export-outfits',
  exportGo: 'sarahlab:character:export-go',
  exportCancel: 'sarahlab:character:export-cancel',
  import: 'sarahlab:character:import',
});

export interface CharacterPanelHooks {
  read(): CharacterBook;
  write(book: CharacterBook): void;
  /** What she is and wears now. */
  body(): SavedBody;
  clothes(): SavedClothes;
  /** The library outfit she last put on, if she is still wearing it (her changes to it are kept as hers). */
  wornFrom(): string | null;
  putOnBody(body: SavedBody): void;
  /** `from`: the shared outfit these clothes come from, if any; `character`: whose clothes they are. */
  putOnClothes(clothes: SavedClothes, from: string | null, character: string): void;
  /** Hand the user a file (EXPORT): JSON text, or a zip's bytes. */
  download(name: string, type: string, data: string | Uint8Array): void;
  /** His own pictures by id, as kept on this device (those it has not got are left out). */
  pictures(ids: readonly string[]): Promise<PackedPicture[]>;
  /** Keep an imported file's pictures on this device. */
  keepPictures(pictures: readonly { type: string; bytes: Uint8Array }[]): Promise<void>;
  /** A picture of her as she is now, for her card (null when one cannot be taken). */
  thumbnail?(): string | null;
}

const BTN = 'min-height:34px;padding:4px 8px;border:1px solid var(--sl-btn-line,#ffffff30);border-radius:8px;background:var(--sl-btn,#151b23);color:var(--sl-ink,#e8e2d8);font:600 11px system-ui;cursor:pointer';
const INPUT = 'flex:1;min-width:0;height:32px;padding:0 8px;border-radius:8px;border:1px solid var(--sl-btn-line,#ffffff30);background:var(--sl-field,#0d1117);color:var(--sl-ink,#e8e2d8);font:600 12px system-ui';

export interface CharacterPanel {
  readonly element: HTMLElement;
  refresh(): void;
  /** The name typed in it (whose save SAVE ALL / BODY / CLOTHES writes). */
  name(): string;
  /** Show a name in it (after the outfit editor saves a character's clothes). */
  setName(name: string): void;
}

export function characterPanel(hooks: CharacterPanelHooks): CharacterPanel {
  const panel = document.createElement('details');
  panel.style.cssText = 'border-top:1px solid var(--sl-line,rgba(255,255,255,0.12));padding-top:6px';
  const summary = document.createElement('summary');
  summary.textContent = 'CHARACTERS';
  summary.style.cssText = 'cursor:pointer;font:700 12px system-ui,sans-serif;letter-spacing:.08em;padding:4px 0';
  panel.appendChild(summary);
  const button = (label: string, action: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.action = action; b.style.cssText = BTN;
    b.addEventListener('click', onClick);
    return b;
  };
  const row = (...kids: HTMLElement[]) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px'; r.append(...kids); return r; };
  const heading = (text: string) => { const h = document.createElement('div'); h.textContent = text; h.style.cssText = 'font:700 11px system-ui;letter-spacing:.08em;opacity:.8;margin-top:10px'; return h; };
  const input = (field: string, placeholder: string, value: string) => {
    const i = document.createElement('input');
    i.type = 'text'; i.placeholder = placeholder; i.value = value; i.maxLength = 40; i.dataset.field = field; i.style.cssText = INPUT;
    return i;
  };
  const status = document.createElement('div');
  status.dataset.field = CHARACTER_FIELD.status;
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'font-size:11px;line-height:1.4;opacity:.85;margin-top:6px;overflow-wrap:anywhere';
  const say = (text: string) => { status.textContent = text; };
  const now = () => new Date().toISOString();

  // ---------------------------------------------------------------- characters
  // (no name of the room's own: the model is generic -- Joshua, 2026-11-13 -- and a character's name is the one typed)
  const name = input(CHARACTER_FIELD.name, 'Character name', '');
  const save = (scope: SaveScope) => {
    const n = name.value.trim();
    if (!n) { say('Type a name first.'); return; }
    const book = hooks.read();
    // her clothes as a reference to the library outfit she put on, when they are still that outfit
    const clothes: SavedClothes | OutfitRef = clothesFor(book, hooks.clothes(), hooks.wornFrom());
    hooks.write(saveInto(book, n, scope, hooks.body(), clothes, now(), hooks.thumbnail?.() ?? null));
    say(scope === 'all' ? `Saved ${n}: body and clothes.` : scope === 'body' ? `Saved ${n}'s body. Her clothes in the save are unchanged.` : `Saved ${n}'s clothes${'basedOn' in clothes ? ` (based on "${clothes.basedOn}", only her changes)` : ''}. Her body in the save is unchanged.`);
    refresh();
  };
  const load = (c: CharacterBook['characters'][number]) => {
    if (c.body) hooks.putOnBody(c.body);
    if (c.clothes) {
      const worn = resolveClothes(hooks.read(), c.clothes);
      if (worn) hooks.putOnClothes(worn, 'basedOn' in c.clothes ? c.clothes.basedOn : null, c.name);
      else if ('basedOn' in c.clothes) { say(`${c.name}'s outfit is based on "${c.clothes.basedOn}", which is not in the outfit library any more.`); return; }
    }
    name.value = c.name;
    say(`Loaded ${c.name}: ${holds(c)}.`);
  };
  const cards = outfitCards({
    onPick: (id) => { const c = hooks.read().characters.find((k) => k.name === id); if (c) load(c); refresh(); },
    onRemove: (id) => { hooks.write(removeFrom(hooks.read(), id)); say(`Deleted ${id}.`); refresh(); },
  });
  const list = cards.element;
  list.dataset.field = CHARACTER_FIELD.list;
  const empty = placeholder('No characters saved yet.');

  function refresh(): void {
    const book = hooks.read();
    cards.set(book.characters.map((c) => ({
      id: c.name, name: c.name, note: holds(c), thumb: c.thumb ?? null,
      worn: c.name.toLowerCase() === name.value.trim().toLowerCase(),
      action: CHARACTER_ACTION.load(c.name), remove: { action: CHARACTER_ACTION.remove(c.name) },
    })));
    empty.style.display = book.characters.length ? 'none' : '';
  }
  function placeholder(text: string): HTMLElement { const d = document.createElement('div'); d.textContent = text; d.style.cssText = 'font-size:11px;opacity:.6'; return d; }

  // ---------------------------------------------------------------- the file
  const file = document.createElement('input');
  file.type = 'file'; file.accept = '.json,.zip,application/json,application/zip'; file.style.display = 'none';
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f) return;
    void f.arrayBuffer().then(async (buffer) => {
      const got = unpackImport(new Uint8Array(buffer));
      const book = got ? importBook(got.text) : null;
      if (!got || !book) { say(`${f.name} is not a character file.`); return; }
      if (got.pictures.length) await hooks.keepPictures(got.pictures);
      hooks.write(mergeBooks(hooks.read(), book));
      const pics = got.pictures.length ? ` and ${got.pictures.length} picture${got.pictures.length === 1 ? '' : 's'}` : '';
      say(`Imported ${book.characters.length} character${book.characters.length === 1 ? '' : 's'}, ${book.outfits.length} outfit${book.outfits.length === 1 ? '' : 's'}${pics} from ${f.name}. Same names were replaced.`);
      refresh();
    }).finally(() => { file.value = ''; });
  });

  // ---------------------------------------------------------------- EXPORT: one, some or all
  const chooser = document.createElement('div');
  chooser.dataset.field = CHARACTER_FIELD.exportChooser;
  chooser.style.cssText = 'display:none;flex-direction:column;gap:6px;margin-top:6px;padding:8px;border:1px solid var(--sl-btn-line,#ffffff30);border-radius:10px';
  const picked = new Set<string>();
  let withOutfits = true;
  const chips = document.createElement('div'); chips.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  const press = (b: HTMLButtonElement, on: boolean) => { b.setAttribute('aria-pressed', String(on)); b.style.background = on ? 'var(--sl-on,#806020)' : 'var(--sl-btn,#151b23)'; };
  const outfitsButton = button('+ EVERY SHARED OUTFIT', CHARACTER_ACTION.exportOutfits, () => { withOutfits = !withOutfits; drawChooser(); });
  const go = button('EXPORT', CHARACTER_ACTION.exportGo, () => { void exportChosen(); });
  const chooserNote = document.createElement('div'); chooserNote.style.cssText = 'font-size:11px;opacity:.75;line-height:1.4';
  function drawChooser(): void {
    const book = hooks.read();
    for (const n of [...picked]) if (!book.characters.some((c) => c.name === n)) picked.delete(n);
    chips.replaceChildren(...book.characters.map((c) => {
      const b = button(c.name, CHARACTER_ACTION.exportPick(c.name), () => { if (picked.has(c.name)) picked.delete(c.name); else picked.add(c.name); drawChooser(); });
      b.style.minHeight = '36px'; press(b, picked.has(c.name)); return b;
    }));
    press(outfitsButton, withOutfits);
    const chosen = bookFor(book, [...picked], withOutfits), pics = picturesUsed(chosen).length;
    const n = chosen.characters.length;
    go.textContent = n || chosen.outfits.length ? `EXPORT ${n} CHARACTER${n === 1 ? '' : 'S'}` : 'EXPORT';
    go.disabled = !n && !chosen.outfits.length; go.style.opacity = go.disabled ? '.45' : '1';
    chooserNote.textContent = `${chosen.outfits.length} shared outfit${chosen.outfits.length === 1 ? '' : 's'} go with ${n === 1 ? 'her' : 'them'}`
      + (withOutfits ? '' : ' (the ones their clothes are based on)')
      + (pics ? ` · ${pics} picture${pics === 1 ? '' : 's'} of your own: a .zip with the .json and the pictures` : ' · a .json file');
  }
  async function exportChosen(): Promise<void> {
    const chosen = bookFor(hooks.read(), [...picked], withOutfits), ids = picturesUsed(chosen);
    const pictures = ids.length ? await hooks.pictures(ids) : [];
    const stem = chosen.characters.length === 1 ? `character-${chosen.characters[0].name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'character'}` : 'characters';
    const out = packExport(chosen, pictures, stem);
    hooks.download(out.name, out.type, out.data);
    const missing = ids.length - pictures.length;
    say(`Exported ${chosen.characters.length} character${chosen.characters.length === 1 ? '' : 's'} and ${chosen.outfits.length} outfit${chosen.outfits.length === 1 ? '' : 's'} as ${out.name}.`
      + (missing ? ` ${missing} picture${missing === 1 ? ' is' : 's are'} not on this device and ${missing === 1 ? 'was' : 'were'} left out.` : ''));
    chooser.style.display = 'none';
  }
  chooser.append(
    row(button('ALL', CHARACTER_ACTION.exportAll, () => { for (const c of hooks.read().characters) picked.add(c.name); withOutfits = true; drawChooser(); }),
      button('NONE', CHARACTER_ACTION.exportNone, () => { picked.clear(); drawChooser(); }), outfitsButton),
    chips, chooserNote, row(go, button('CANCEL', CHARACTER_ACTION.exportCancel, () => { chooser.style.display = 'none'; })),
  );
  const openChooser = () => {
    if (chooser.style.display !== 'none') { chooser.style.display = 'none'; return; }
    // (it opens on every character, as EXPORT always was: tap one to leave her out, or NONE and then the ones wanted)
    picked.clear(); for (const c of hooks.read().characters) picked.add(c.name); withOutfits = true;
    chooser.style.display = 'flex'; drawChooser();
  };

  panel.append(
    heading('CHARACTER'),
    row(name),
    row(button('SAVE ALL', CHARACTER_ACTION.save('all'), () => save('all')), button('SAVE BODY', CHARACTER_ACTION.save('body'), () => save('body')), button('SAVE CLOTHES', CHARACTER_ACTION.save('clothes'), () => save('clothes'))),
    heading('SAVED CHARACTERS · tap one to load her'),
    list,
    empty,
    heading('SHARED OUTFITS are saved and worn in OUTFIT'),
    heading('FILE · characters and shared outfits (.json, or .zip with your pictures)'),
    row(button('EXPORT…', CHARACTER_ACTION.export, openChooser),
      button('IMPORT', CHARACTER_ACTION.import, () => file.click())),
    chooser,
    file,
    status,
  );
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown']) panel.addEventListener(ev, (e) => e.stopPropagation());
  refresh();
  return { element: panel, refresh, name: () => name.value, setName: (n) => { name.value = n; } };
}
