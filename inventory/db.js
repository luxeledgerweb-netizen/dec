// src/inventory/db.js
// IndexedDB helper for Inventory items, folders, and image blobs
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const DB_NAME = 'inventory-v1';
const DB_VERSION = 2; // bump: add FOLDERS store + indexes
const ITEMS = 'items';
const FILES = 'files';
const FOLDERS = 'folders';

import { blobStore } from './storage/blobStore';

let _db;
const _urlCache = new Map();

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // ITEMS
      if (!db.objectStoreNames.contains(ITEMS)) {
        const store = db.createObjectStore(ITEMS, { keyPath: 'id' });
        store.createIndex('by_folder', 'folderId', { unique: false });
      } else {
        // ensure index exists if upgrading from v1
        const st = req.transaction.objectStore(ITEMS);
        if (!st.indexNames.contains('by_folder')) {
          st.createIndex('by_folder', 'folderId', { unique: false });
        }
      }

      // FILES
      if (!db.objectStoreNames.contains(FILES)) {
        const store = db.createObjectStore(FILES, { keyPath: 'id' });
        store.createIndex('by_item', 'itemId', { unique: false });
      } else {
        const st = req.transaction.objectStore(FILES);
        if (!st.indexNames.contains('by_item')) {
          st.createIndex('by_item', 'itemId', { unique: false });
        }
      }

      // FOLDERS (new in v2)
      if (!db.objectStoreNames.contains(FOLDERS)) {
        const store = db.createObjectStore(FOLDERS, { keyPath: 'id' });
        store.createIndex('by_parent', 'parentId', { unique: false });
      } else {
        const st = req.transaction.objectStore(FOLDERS);
        if (!st.indexNames.contains('by_parent')) {
          st.createIndex('by_parent', 'parentId', { unique: false });
        }
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return openDB().then(db => db.transaction(store, mode));
}
function multiTx(stores, mode = 'readonly') {
  return openDB().then(db => db.transaction(stores, mode));
}

// ---- Helpers
function uuid() {
  try { return crypto.randomUUID(); } catch { return String(Date.now()) + Math.random(); }
}
function put(st, value) {
  return new Promise((resolve, reject) => {
    const req = st.put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}
function del(st, key) {
  return new Promise((resolve, reject) => {
    const req = st.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
function getAll(idxOrStore, query) {
  return new Promise((resolve, reject) => {
    const req = query !== undefined ? idxOrStore.getAll(query) : idxOrStore.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function getOne(st, key) {
  return new Promise((resolve, reject) => {
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Public API ----------
export const invDb = {
  // ---- Items ----
  /**
   * listItems can be called as:
   *   listItems()                      -> all items
   *   listItems(folderId)              -> items in that folder
   *   listItems({ folderId })          -> same as above
   */
  async listItems(arg = undefined) {
    // Normalize arguments
    let folderId;
    if (typeof arg === 'object' && arg !== null) {
      folderId = arg.folderId;
    } else {
      folderId = arg; // may be undefined or a value
    }

    const t = await tx(ITEMS);
    const st = t.objectStore(ITEMS);

    try {
      if (folderId !== undefined) {
        const idx = st.index('by_folder');
        return await getAll(idx, IDBKeyRange.only(folderId));
      }
    } catch {
      // index might not exist on very old DBs; fall back to full scan
    }

    const all = await getAll(st);
    if (folderId === undefined) return all;
    return all.filter(i => (i?.folderId ?? null) === folderId);
  },

  async saveItem(item) {
    const now = new Date().toISOString();
    const record = {
      ...item,
      id: item.id || uuid(),
      created_at: item.created_at || now,
      updated_at: now,
      // expected optional fields: title, notes, tags[], images[] (thumbs), folderId
    };
    const t = await tx(ITEMS, 'readwrite');
    const st = t.objectStore(ITEMS);
    await put(st, record);
    return record;
  },

  async deleteItem(id) {
    // remove files for this item first
    await invDb.deleteFilesByItemId(id);
    const t = await tx(ITEMS, 'readwrite');
    const st = t.objectStore(ITEMS);
    await del(st, id);
  },

  async moveItem(itemId, targetFolderId = null) {
    const t = await tx(ITEMS, 'readwrite');
    const st = t.objectStore(ITEMS);
    const rec = await getOne(st, itemId);
    if (!rec) return null;
    rec.folderId = targetFolderId ?? null;
    rec.updated_at = new Date().toISOString();
    await put(st, rec);
    return rec;
  },

  // ---- Files (blobs) ----
  async saveFileBlob(itemId, file) {
  const id = uuid();
  const now = new Date().toISOString();
  const mime = file.type || 'application/octet-stream';

  let rec;
  if (blobStore.isNative) {
    // native: write to app filesystem and store only a URI in IDB
    const body = await blobStore.write({
      itemId,
      fileId: id,
      name: file.name,
      mime,
      blob: file
    });
    rec = {
      id,
      itemId,
      name: file.name,
      mime,
      size: (body?.size ?? file.size ?? 0),
      created_at: now,
      uri: body.uri,
    };
  } else {
    // web/PWA: keep storing the Blob in IDB
    rec = {
      id,
      itemId,
      name: file.name,
      mime,
      size: file.size || 0,
      created_at: now,
      blob: file,
    };
  }

  const t = await tx(FILES, 'readwrite');
  const st = t.objectStore(FILES);
  await put(st, rec);
  return rec;
},

  async saveFileRecord(rec) {
  const t = await tx(FILES, 'readwrite');
  const st = t.objectStore(FILES);

  let toPut = { ...rec };

  if (blobStore.isNative && rec.blob) {
    // write into filesystem; store uri instead of blob
    const body = await blobStore.write({
      itemId: rec.itemId,
      fileId: rec.id,
      name: rec.name,
      mime: rec.mime,
      blob: rec.blob
    });
    delete toPut.blob;
    toPut.uri = body.uri;
    toPut.size = (toPut.size ?? body?.size ?? rec?.blob?.size ?? 0);
  }

  await new Promise((resolve, reject) => {
    const req = st.put(toPut);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  return toPut;
},

  async listFiles(itemId) {
    const t = await tx(FILES);
    const st = t.objectStore(FILES);
    const idx = st.index('by_item');
    return await getAll(idx, IDBKeyRange.only(itemId));
  },

  async getFile(fileId) {
    const t = await tx(FILES);
    const st = t.objectStore(FILES);
    return await getOne(st, fileId);
  },

async getFileURL(fileId) {
  const file = await invDb.getFile(fileId);
  if (!file) return null;
  if (_urlCache.has(fileId)) return _urlCache.get(fileId);

  // 1) Try our normal path: read Blob and create a blob: URL
  try {
    let blob;
    if (blobStore.isNative && file.uri) {
      blob = await blobStore.read({ uri: file.uri, mime: file.mime });
    } else if (file.blob) {
      blob = file.blob;
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      _urlCache.set(fileId, url);
      return url;
    }
  } catch (e) {
    // swallow, we'll try a native URL fallback next
    console.warn('[getFileURL] blob fallback failed:', e);
  }

  // 2) iOS native URL fallback: ask Capacitor for a file:// uri and convert it
  try {
    if (blobStore.isNative && file?.uri) {
      const res = await Filesystem.getUri({ path: file.uri, directory: Directory.Data });
      // convert to capacitor://… form that WKWebView can load
      const src = Capacitor.convertFileSrc(res.uri);
      _urlCache.set(fileId, src);
      return src;
    }
  } catch (e) {
    console.warn('[getFileURL] native URL fallback failed:', e);
  }

  return null;
},

  async deleteFile(fileId) {
  const t = await tx(FILES, 'readwrite');
  const st = t.objectStore(FILES);

  // read record first so we know what to delete on native
  let rec = null;
  try { rec = await getOne(st, fileId); } catch {}

  await del(st, fileId);

  if (blobStore.isNative && rec?.uri) {
    await blobStore.remove({ uri: rec.uri });
  }

  const url = _urlCache.get(fileId);
  if (url) URL.revokeObjectURL(url);
  _urlCache.delete(fileId);
},

  async deleteFilesByItemId(itemId) {
    const files = await invDb.listFiles(itemId);
    for (const f of files) {
      await invDb.deleteFile(f.id);
    }
  },
    // Get ALL file records (meta + blob)- used for fast size totals
    async listAllFileMeta() {
      const t = await tx(FILES);
      const st = t.objectStore(FILES);
      // returns [{id,itemId,name,mime,size,created_at,blob})
      return await getAll(st);
    },

// Sum bytes of files grouped by the item's folderId.
// Returns a Map<folderId|null, totalBytes>
async folderSizes() {
  const [items, allFiles] = await Promise.all([
    invDb.listItems(),        // all items (id, folderId)
    invDb.listAllFileMeta(),  // [{id,itemId,name,mime,size,created_at,blob?}]
  ]);

  const itemToFolder = new Map(items.map(i => [i.id, i.folderId ?? null]));
  const totals = new Map();

  for (const f of (allFiles || [])) {
    const folderId = itemToFolder.get(f.itemId) ?? null;
    const add = (f.size || (f.blob?.size || 0) || 0);
    totals.set(folderId, (totals.get(folderId) || 0) + add);
  }
  return totals;
},

  // ---- Folders ----
  async listFolders(parentId = null) {
    // parentId: null for root-level
    const t = await tx(FOLDERS);
    const st = t.objectStore(FOLDERS);
    try {
      const idx = st.index('by_parent');
      return await getAll(idx, IDBKeyRange.only(parentId));
    } catch {
      // fallback: full scan
      const all = await getAll(st);
      return all.filter(f => (f?.parentId ?? null) === parentId);
    }
  },

  async getFolder(id) {
    if (id == null) return null;
    const t = await tx(FOLDERS);
    const st = t.objectStore(FOLDERS);
    return await getOne(st, id);
  },

  async saveFolder(folder) {
    // folder: { id?, name, parentId (nullable) }
    const now = new Date().toISOString();
    const record = {
      id: folder.id || uuid(),
      name: String(folder.name || '').trim(),
      parentId: folder.parentId ?? null,
      created_at: folder.created_at || now,
      updated_at: now,
    };
    const t = await tx(FOLDERS, 'readwrite');
    const st = t.objectStore(FOLDERS);
    await put(st, record);
    return record;
  },

  async createFolder({ name, parentId = null }) {
    return await this.saveFolder({ name, parentId });
  },

  async renameFolder(id, newName) {
    const t = await tx(FOLDERS, 'readwrite');
    const st = t.objectStore(FOLDERS);
    const rec = await getOne(st, id);
    if (!rec) return null;
    rec.name = String(newName || '').trim();
    rec.updated_at = new Date().toISOString();
    await put(st, rec);
    return rec;
  },

  async moveFolder(id, newParentId = null) {
    const t = await tx(FOLDERS, 'readwrite');
    const st = t.objectStore(FOLDERS);
    const rec = await getOne(st, id);
    if (!rec) return null;
    rec.parentId = newParentId ?? null;
    rec.updated_at = new Date().toISOString();
    await put(st, rec);
    return rec;
  },

  async deleteFolder(id, { cascade = true } = {}) {
    if (!cascade) {
      const children = await invDb.listFolders(id);
      const itemsHere = await invDb.listItems(id); // accepts raw id
      if (children.length || itemsHere.length) {
        throw new Error('Folder is not empty');
      }
    } else {
      // delete subfolders recursively
      const children = await invDb.listFolders(id);
      for (const child of children) {
        await invDb.deleteFolder(child.id, { cascade: true });
      }
      // delete items in this folder
      const itemsHere = await invDb.listItems(id);
      for (const it of itemsHere) {
        await invDb.deleteItem(it.id);
      }
    }
    const t = await tx(FOLDERS, 'readwrite');
    const st = t.objectStore(FOLDERS);
    await del(st, id);
  },

  async getFolderPath(folderId) {
    // returns array from root -> current (each {id, name, parentId})
    const path = [];
    let cur = await this.getFolder(folderId);
    while (cur) {
      path.unshift({ id: cur.id, name: cur.name, parentId: cur.parentId ?? null });
      cur = await this.getFolder(cur.parentId ?? null);
    }
    return path;
  },

  // ---- Export / Import (JSON metadata only; blobs excluded) ----
  async exportJson() {
    const [items, folders] = await Promise.all([
      invDb.listItems(),
      invDb.listAllFoldersTree(),
    ]);

    // gather simple file metadata
    const filesMeta = [];
    const t = await tx(FILES);
    const st = t.objectStore(FILES);
    const all = await getAll(st);
    for (const f of all) {
      filesMeta.push({
        id: f.id,
        itemId: f.itemId,
        name: f.name,
        mime: f.mime,
        size: f.size,
        created_at: f.created_at,
      });
    }

    return { version: 1, items, folders, filesMeta };
  },

  async importJson(data, { replace = false } = {}) {
    if (!data || typeof data !== 'object') throw new Error('Invalid import data');
    const items = Array.isArray(data.items) ? data.items : [];
    const folders = Array.isArray(data.folders) ? data.folders : [];

    if (replace) await invDb.clearAll();

    const trx = await multiTx([ITEMS, FOLDERS], 'readwrite');
    const ist = trx.objectStore(ITEMS);
    const fst = trx.objectStore(FOLDERS);

    await Promise.all(folders.map(f => put(fst, {
      ...f,
      id: f.id || uuid(),
      name: String(f.name || '').trim(),
      parentId: f.parentId ?? null,
      created_at: f.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));

    await Promise.all(items.map(it => put(ist, {
      ...it,
      id: it.id || uuid(),
      created_at: it.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })));

    // blobs are imported via ZIP in a later phase
    return { importedItems: items.length, importedFolders: folders.length };
  },

  async listAllFoldersTree() {
    const t = await tx(FOLDERS);
    const st = t.objectStore(FOLDERS);
    return await getAll(st);
  },

  // ---- Maintenance ----
  async clearAll() {
    const trx = await multiTx([ITEMS, FILES, FOLDERS], 'readwrite');
    await Promise.all([
      new Promise((res, rej) => { const r = trx.objectStore(ITEMS).clear(); r.onsuccess = res; r.onerror = () => rej(r.error); }),
      new Promise((res, rej) => { const r = trx.objectStore(FILES).clear(); r.onsuccess = res; r.onerror = () => rej(r.error); }),
      new Promise((res, rej) => { const r = trx.objectStore(FOLDERS).clear(); r.onsuccess = res; r.onerror = () => rej(r.error); }),
    ]);
    for (const url of _urlCache.values()) { try { URL.revokeObjectURL(url); } catch {} }
    _urlCache.clear();
  },
};