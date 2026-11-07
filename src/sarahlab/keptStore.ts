/**
 * WHAT THE ROOM KEEPS THAT IS TOO BIG FOR ITS LITTLE SETTINGS: a frozen tee is a few hundred kilobytes of numbers
 * (garment/frozenCloth.ts), and the browser's small store (localStorage) holds five megabytes as text for everything the
 * room keeps. These go in the browser's database instead (IndexedDB), as they are -- typed arrays and all, nothing
 * turned to text -- under a name each. A private window, or a browser without it, keeps nothing: every call answers
 * false or null and never throws.
 */
const DATABASE = 'traddomium-sarahlab';
const STORE = 'kept';

let opening: Promise<IDBDatabase | null> | null = null;

function database(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
      if (!idb) { resolve(null); return; }
      const request = idb.open(DATABASE, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return opening;
}

/** Keep `value` under `key` (null forgets it). True when it was kept (or forgotten). */
export async function keepBig(key: string, value: unknown): Promise<boolean> {
  const db = await database();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE);
      if (value === null) store.delete(key); else store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

/** What is kept under `key`, or null. */
export async function keptBig<T>(key: string): Promise<T | null> {
  const db = await database();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
