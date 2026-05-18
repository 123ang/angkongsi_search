import type { AppSettings } from '../types';

const DB_NAME = 'ancestor-tablet-search';
const DB_VERSION = 1;
const META_STORE = 'meta';
const PHOTO_STORE = 'photos';

const META_KEY_DB = 'db';
const META_KEY_SETTINGS = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openIdb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
      if (!database.objectStoreNames.contains(PHOTO_STORE)) database.createObjectStore(PHOTO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked. Close other tabs and try again.'));
  });
  return dbPromise;
}

async function runStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | T
): Promise<T> {
  const database = await openIdb();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let value: T;
    let resolved = false;

    const result = fn(store);
    if (result instanceof IDBRequest) {
      result.onsuccess = () => {
        value = result.result as T;
        resolved = true;
      };
      result.onerror = () => reject(result.error ?? new Error('IndexedDB request failed.'));
    } else {
      value = result;
      resolved = true;
    }

    tx.oncomplete = () => {
      if (resolved) resolve(value);
      else reject(new Error('IndexedDB transaction completed without result.'));
    };
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

export async function getDbBytes(): Promise<Uint8Array | null> {
  const value = await runStore<Uint8Array | undefined>(META_STORE, 'readonly', (store) =>
    store.get(META_KEY_DB) as IDBRequest<Uint8Array | undefined>
  );
  return value ?? null;
}

export async function setDbBytes(bytes: Uint8Array): Promise<void> {
  await runStore<IDBValidKey>(META_STORE, 'readwrite', (store) =>
    store.put(bytes, META_KEY_DB) as IDBRequest<IDBValidKey>
  );
}

export async function getSettings(): Promise<AppSettings | null> {
  const value = await runStore<AppSettings | undefined>(META_STORE, 'readonly', (store) =>
    store.get(META_KEY_SETTINGS) as IDBRequest<AppSettings | undefined>
  );
  return value ?? null;
}

export async function setSettings(settings: AppSettings): Promise<void> {
  await runStore<IDBValidKey>(META_STORE, 'readwrite', (store) =>
    store.put(settings, META_KEY_SETTINGS) as IDBRequest<IDBValidKey>
  );
}

export async function putPhoto(filename: string, blob: Blob): Promise<void> {
  await runStore<IDBValidKey>(PHOTO_STORE, 'readwrite', (store) =>
    store.put(blob, filename) as IDBRequest<IDBValidKey>
  );
}

export async function getPhoto(filename: string): Promise<Blob | null> {
  const value = await runStore<Blob | undefined>(PHOTO_STORE, 'readonly', (store) =>
    store.get(filename) as IDBRequest<Blob | undefined>
  );
  return value ?? null;
}

export async function deletePhotoBlob(filename: string): Promise<boolean> {
  const existing = await getPhoto(filename);
  if (!existing) return false;
  await runStore<undefined>(PHOTO_STORE, 'readwrite', (store) =>
    store.delete(filename) as IDBRequest<undefined>
  );
  return true;
}

export async function listPhotoEntries(): Promise<Array<{ filename: string; blob: Blob }>> {
  const database = await openIdb();
  return new Promise<Array<{ filename: string; blob: Blob }>>((resolve, reject) => {
    const tx = database.transaction(PHOTO_STORE, 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const results: Array<{ filename: string; blob: Blob }> = [];
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        results.push({ filename: String(cursor.key), blob: cursor.value as Blob });
        cursor.continue();
      }
    };
    cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error('Cursor failed.'));
    tx.oncomplete = () => resolve(results);
    tx.onerror = () => reject(tx.error ?? new Error('Photo list transaction failed.'));
  });
}

export async function clearPhotos(): Promise<void> {
  await runStore<undefined>(PHOTO_STORE, 'readwrite', (store) =>
    store.clear() as IDBRequest<undefined>
  );
}
