import { openDB } from "idb";

const DB_NAME = "training-app";
const STORE = "kv";

// iOS Safari / standalone-PWA can occasionally leave indexedDB.open() pending
// forever on launch (WebKit bug). Without a guard, loadState() never resolves
// and the app hangs on "Lädt …". So we race the open against a timeout and, on
// any failure, fall back to an in-memory store — the app still boots (data just
// won't persist locally for that session).
const mem = new Map();

const dbPromise = (async () => {
  try {
    const open = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE);
      },
    });
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("idb-open-timeout")), 3000),
    );
    return await Promise.race([open, timeout]);
  } catch {
    return null; // use in-memory fallback
  }
})();

export async function kvGet(key) {
  const db = await dbPromise;
  if (!db) return mem.get(key);
  try {
    return await db.get(STORE, key);
  } catch {
    return mem.get(key);
  }
}

export async function kvSet(key, value) {
  const db = await dbPromise;
  if (!db) {
    mem.set(key, value);
    return;
  }
  try {
    return await db.put(STORE, value, key);
  } catch {
    mem.set(key, value);
  }
}

export async function kvDel(key) {
  const db = await dbPromise;
  if (!db) {
    mem.delete(key);
    return;
  }
  try {
    return await db.delete(STORE, key);
  } catch {
    mem.delete(key);
  }
}
