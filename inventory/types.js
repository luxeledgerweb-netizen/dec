// src/inventory/types.js

export const INVENTORY_COLLECTION = 'InventoryItem';
export const INVENTORY_FOLDER_COLLECTION = 'InventoryFolder';

// Safe UUID helper (works in older browsers too)
function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }
}

// Normalize an array of strings (tags, etc.)
function normalizeStringArray(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((t) => (t ?? '').toString().trim())
    .filter(Boolean);
}

// Optional: normalize thumbnails to the shape we expect
function normalizeThumbs(arr) {
  return (Array.isArray(arr) ? arr : []).map((t) => ({
    thumbDataUrl: t?.thumbDataUrl ?? '',
    name: t?.name ?? '',
  })).filter(t => t.thumbDataUrl);
}

/**
 * Minimal item model for Inventory
 * Thumbnails (small previews) live on the item (for fast UI + JSON backups).
 * Full-res image blobs are stored in IndexedDB FILES store.
 */
export function makeInventoryItem(partial = {}) {
  const now = new Date().toISOString();

  const base = {
    id: partial.id || uid(),
    title: (partial.title ?? '').toString(),
    folderId: partial.folderId ?? null,   // nullable; supports nested folders
    tags: normalizeStringArray(partial.tags),
    notes: (partial.notes ?? '').toString(),
    images: normalizeThumbs(partial.images), // [{ thumbDataUrl, name? }]
    created_at: partial.created_at || now,
    updated_at: now,
  };

  return { ...base, ...partial, id: base.id, tags: base.tags, images: base.images, created_at: base.created_at, updated_at: base.updated_at };
}

/**
 * Folder model (for nested folders)
 */
export function makeInventoryFolder(partial = {}) {
  const now = new Date().toISOString();

  const base = {
    id: partial.id || uid(),
    name: (partial.name ?? '').toString().trim(),
    parentId: partial.parentId ?? null, // null = root
    created_at: partial.created_at || now,
    updated_at: now,
  };

  return { ...base, ...partial, id: base.id, name: base.name, parentId: base.parentId, created_at: base.created_at, updated_at: base.updated_at };
}