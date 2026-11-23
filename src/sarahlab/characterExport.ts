/**
 * EXPORTING CHARACTERS, ONE, SOME OR ALL, WITH THEIR PICTURES (Joshua, 2026-11-19: "I also wanted to add the option when
 * exporting, you can select 1, multiple, or all"; "If we do save the custom texture, then maybe modify the output to a
 * zip with JSON + image if a custom image was used"). Pure but for the zip itself:
 * - `bookFor`: the characters chosen, and the shared outfits they need (one a character's clothes are based on), or
 *   every shared outfit;
 * - `picturesUsed`: the ids of his own pictures a book's fabrics wear (`FabricPick.image`, `pictureStore.ts`);
 * - `packExport` / `unpackImport`: a book alone is the JSON file it always was; with pictures, a ZIP holding that JSON as
 *   `characters.json` and each picture as `pictures/<id>.<ext>`. An import takes either.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { exportBook, type CharacterBook } from './characterSaves';
import { PICTURE_ID, pictureExtension } from './pictureStore';

export const EXPORT_JSON_NAME = 'characters.json';
/** The most pictures, and bytes of one, an import takes (an untrusted file). */
export const IMPORT_LIMITS = Object.freeze({ pictures: 200, bytes: 16 * 1024 * 1024 });

/** The chosen characters (by name, as saved) and the outfits they need; `allOutfits`: every shared outfit as well. */
export function bookFor(book: CharacterBook, names: readonly string[], allOutfits: boolean): CharacterBook {
  const want = new Set(names.map((n) => n.toLowerCase()));
  const characters = book.characters.filter((c) => want.has(c.name.toLowerCase()));
  const needed = new Set(characters.flatMap((c) => (c.clothes && 'basedOn' in c.clothes ? [c.clothes.basedOn.toLowerCase()] : [])));
  const outfits = book.outfits.filter((o) => allOutfits || needed.has(o.name.toLowerCase()));
  return { version: 1, characters, outfits };
}

/** The ids of the pictures a book's fabrics wear, each once. */
export function picturesUsed(book: CharacterBook): string[] {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (k === 'image' && typeof x === 'string' && PICTURE_ID.test(x)) out.add(x);
      else if (k !== 'thumb' && k !== 'mask') walk(x);
    }
  };
  walk(book.characters); walk(book.outfits);
  return [...out];
}

export interface PackedPicture { readonly id: string; readonly type: string; readonly bytes: Uint8Array }

/** What to hand the user: the JSON alone when no picture goes with it, else a zip. */
export function packExport(book: CharacterBook, pictures: readonly PackedPicture[], stem: string): { name: string; type: string; data: Uint8Array | string } {
  const json = exportBook(book);
  if (!pictures.length) return { name: `${stem}.json`, type: 'application/json', data: json };
  const files: Record<string, Uint8Array> = { [EXPORT_JSON_NAME]: strToU8(json) };
  // (a JPEG or PNG is already packed: stored, not squeezed again)
  for (const p of pictures) files[`pictures/${p.id}.${pictureExtension(p.type)}`] = p.bytes;
  const data = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: k.endsWith('.json') ? 6 : 0 }]])) as Parameters<typeof zipSync>[0]);
  return { name: `${stem}.zip`, type: 'application/zip', data };
}

const TYPE_OF: Readonly<Record<string, string>> = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' });

/** A file read back: its JSON text and the pictures in it (none for a JSON file); null when it is neither. */
export function unpackImport(bytes: Uint8Array): { text: string; pictures: { id: string; type: string; bytes: Uint8Array }[] } | null {
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (!isZip) {
    try { return { text: strFromU8(bytes), pictures: [] }; } catch { return null; }
  }
  let files: Record<string, Uint8Array>;
  try {
    let count = 0;
    files = unzipSync(bytes, { filter: (f) => (f.name === EXPORT_JSON_NAME || /^pictures\/[0-9a-f]{16}\.(png|jpe?g|webp)$/.test(f.name)) && f.originalSize <= IMPORT_LIMITS.bytes && count++ <= IMPORT_LIMITS.pictures });
  } catch { return null; }
  const json = files[EXPORT_JSON_NAME];
  if (!json) return null;
  const pictures = Object.entries(files).filter(([k]) => k !== EXPORT_JSON_NAME).map(([k, v]) => {
    const m = /^pictures\/([0-9a-f]{16})\.([a-z]+)$/.exec(k)!;
    return { id: m[1], type: TYPE_OF[m[2]] ?? 'image/jpeg', bytes: v };
  });
  return { text: strFromU8(json), pictures };
}
