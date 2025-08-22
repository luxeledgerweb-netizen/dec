// src/components/utils/storageShim.js
import localforage from 'localforage';

const DB_NAME = 'luxe-ledger';
const STORE = 'kv';
const KEY = 'luxeLedgerData'; // <-- SAME key you already use

const lf = localforage.createInstance({ name: DB_NAME, storeName: STORE });

// Load JSON object from IndexedDB. If empty, migrate once from localStorage.
export async function idbLoad() {
  const val = await lf.getItem(KEY);
  if (val && typeof val === 'object') return val;

  // One-time migration from localStorage (keeps your existing data)
  const ls = localStorage.getItem(KEY);
  if (ls) {
    try {
      const parsed = JSON.parse(ls);
      await lf.setItem(KEY, parsed);
      return parsed;
    } catch {
      // ignore
    }
  }
  return null; // caller will initialize defaults
}

export async function idbSave(obj) {
  // obj should already be a plain object
  await lf.setItem(KEY, obj);
}

export async function idbClear() {
  await lf.removeItem(KEY);
}