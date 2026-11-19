/**
 * PICTURES OF HIS OWN, KEPT ON THE DEVICE (Joshua, 2026-11-19: "can you figure out why I can't upload my own textures to
 * replace the default textures/solid color? … it should be for that top/bottom, etc… and what's selected"; of keeping
 * one: "Kept with you save a character (held locally in the PWA)"). A picture uploaded for a piece of clothing is made
 * smaller (`PICTURE_MAX` a side), given an id from its own bytes (`pictureId`: the same picture is always the same id,
 * so it is kept once however many pieces and characters wear it) and kept in the browser's own database on this device
 * (IndexedDB, `PICTURE_DATABASE`). A fabric choice and a character's save hold only the id (`FabricPick.image`); the
 * picture itself goes into an exported file beside the book (`characterExport.ts`).
 *
 * Where the database can not be opened (a private window), a picture still works for the visit: it is kept in memory.
 */

/** GAME TUNING: the longest side a picture is kept at. A fabric's print tiles; 1024 is sharp on a phone and small. */
export const PICTURE_MAX = 1024;
export const PICTURE_DATABASE = 'character-builder-pictures';
const STORE = 'pictures';
/** An id: the first 16 hex characters of the SHA-256 of the kept file's bytes. */
export const PICTURE_ID = /^[0-9a-f]{16}$/;

export interface KeptPicture { readonly id: string; readonly name: string; readonly type: string; readonly bytes: Uint8Array }

/** An id from a picture's bytes. */
export async function pictureId(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
  return Array.from(hash.subarray(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

const memory = new Map<string, KeptPicture>();
const decoded = new Map<string, Promise<ImageBitmap | HTMLImageElement | null>>();
let opened: Promise<IDBDatabase | null> | null = null;

function database(): Promise<IDBDatabase | null> {
  opened ??= new Promise((resolve) => {
    try {
      const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
      if (!idb) { resolve(null); return; }
      const req = idb.open(PICTURE_DATABASE, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return opened;
}

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

/** Keeps a picture's bytes as they are (already made small: an import, or `keepUpload`). Its id. */
export async function keepPicture(name: string, type: string, bytes: Uint8Array): Promise<string> {
  const id = await pictureId(bytes);
  if (memory.has(id)) return id;
  const kept: KeptPicture = { id, name: name.slice(0, 120), type, bytes };
  memory.set(id, kept);
  const db = await database();
  if (db) {
    try { await request(db.transaction(STORE, 'readwrite').objectStore(STORE).put(kept)); } catch { /* full, or refused: it stays for this visit */ }
  }
  return id;
}

/** A picture by its id: from memory, or from the database; null when this device has not got it. */
export async function readPicture(id: string): Promise<KeptPicture | null> {
  if (!PICTURE_ID.test(id)) return null;
  const have = memory.get(id);
  if (have) return have;
  const db = await database();
  if (!db) return null;
  try {
    const got = await request(db.transaction(STORE, 'readonly').objectStore(STORE).get(id)) as KeptPicture | undefined;
    if (!got || !(got.bytes instanceof Uint8Array)) return null;
    memory.set(id, got);
    return got;
  } catch { return null; }
}

/** A picture by its id, decoded once for drawing; null when this device has not got it or it can not be read. */
export function pictureImage(id: string): Promise<ImageBitmap | HTMLImageElement | null> {
  let p = decoded.get(id);
  if (!p) {
    p = readPicture(id).then(async (kept) => {
      if (!kept) return null;
      const blob = new Blob([kept.bytes as BlobPart], { type: kept.type });
      try { return await createImageBitmap(blob); } catch { /* an older browser */ }
      const url = URL.createObjectURL(blob);
      try { const img = new Image(); img.src = url; await img.decode(); return img; } catch { return null; } finally { URL.revokeObjectURL(url); }
    });
    p.then((img) => { if (!img) decoded.delete(id); }, () => decoded.delete(id));
    decoded.set(id, p);
  }
  return p;
}

/**
 * A picture from the phone made small and kept: a PNG stays a PNG (it may be see-through), anything else becomes a
 * JPEG. Its id and its name; throws with words for the screen when the file is not a picture this browser can read.
 */
export async function keepUpload(file: File): Promise<{ id: string; name: string }> {
  const url = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try { image = new Image(); image.src = url; await image.decode(); } catch { throw new Error('Could not read that picture. Try a PNG, JPEG or WebP.'); } finally { URL.revokeObjectURL(url); }
  const k = Math.min(1, PICTURE_MAX / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * k)); canvas.height = Math.max(1, Math.round(image.naturalHeight * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser can not draw the picture.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
  if (!blob) throw new Error('This browser can not keep the picture.');
  const name = file.name.replace(/\.[a-z0-9]+$/i, '') || 'picture';
  const id = await keepPicture(name, type, new Uint8Array(await blob.arrayBuffer()));
  return { id, name };
}

/** The name a kept picture was uploaded with ('' when this device has not got it in memory yet). */
export const pictureName = (id: string): string => memory.get(id)?.name ?? '';

/** File extension for a kept picture's type. */
export const pictureExtension = (type: string): string => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');
