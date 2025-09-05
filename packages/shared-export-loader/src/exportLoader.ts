// Persistent File System Access handle storage (Chromium only)
const DB_NAME = 'meander-store';
const STORE = 'kv';
const KEY_LAST_SHOW = 'lastShowHandle';

async function openKV(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle: FileSystemFileHandle) {
  const db = await openKV();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(handle, KEY_LAST_SHOW);
  return new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function loadHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openKV();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).get(KEY_LAST_SHOW);
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

// augment ExportLoader
