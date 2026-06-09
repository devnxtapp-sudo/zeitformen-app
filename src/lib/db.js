import { openDB } from "idb";

const DB_NAME = "training-app";
const STORE = "kv";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE);
  },
});

export async function kvGet(key) {
  return (await dbPromise).get(STORE, key);
}

export async function kvSet(key, value) {
  return (await dbPromise).put(STORE, value, key);
}
