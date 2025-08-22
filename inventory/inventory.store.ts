import type { InventoryFolder, InventoryItem, InventoryNode, InventoryStateV2, NodeID } from './inventory.types';

// If you already have a storage helper, swap these 2 funcs to call it.
const KEY = 'inventory_v2';
const getStore = () => (window as any).localforage ?? null;

async function dbGet<T>(key: string): Promise<T | null> {
  const lf = getStore();
  if (!lf) throw new Error('localForage not available');
  return lf.getItem<T>(key);
}
async function dbSet<T>(key: string, value: T): Promise<void> {
  const lf = getStore();
  if (!lf) throw new Error('localForage not available');
  await lf.setItem(key, value);
}

const now = () => Date.now();
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

// --- load / save / init ---
export async function loadInventory(): Promise<InventoryStateV2 | null> {
  const state = await dbGet<InventoryStateV2>(KEY);
  return state ?? null;
}

export async function saveInventory(state: InventoryStateV2): Promise<void> {
  // simple atomic-ish save (temp then swap) could be added later
  await dbSet(KEY, state);
}

export async function ensureInventoryReady(): Promise<InventoryStateV2> {
  const existing = await loadInventory();
  if (existing?.version === 2) return existing;

  // Create brand new state with a root folder
  const rootId = 'root';
  const root: InventoryFolder = {
    id: rootId,
    type: 'folder',
    name: 'All Items',
    parentId: null,
    childrenOrder: [],
    createdAt: now(),
    updatedAt: now(),
  };

  const fresh: InventoryStateV2 = {
    version: 2,
    nodes: { [rootId]: root },
    rootId,
  };

  await saveInventory(fresh);
  return fresh;
}

// --- helpers ---
export function isFolder(n: InventoryNode): n is InventoryFolder { return n.type === 'folder'; }
export function isItem(n: InventoryNode): n is InventoryItem { return n.type === 'item'; }

export async function getChildren(parentId: NodeID): Promise<InventoryNode[]> {
  const s = await ensureInventoryReady();
  const parent = s.nodes[parentId] as InventoryFolder | undefined;
  if (!parent || parent.type !== 'folder') return [];
  return parent.childrenOrder.map(id => s.nodes[id]).filter(Boolean) as InventoryNode[];
}

export async function createFolder(parentId: NodeID, name: string): Promise<InventoryFolder> {
  const s = await ensureInventoryReady();
  const parent = s.nodes[parentId];
  if (!parent || parent.type !== 'folder') throw new Error('Invalid parent folder');

  const f: InventoryFolder = {
    id: `fld_${uid()}`,
    type: 'folder',
    name,
    parentId,
    childrenOrder: [],
    createdAt: now(),
    updatedAt: now(),
  };
  s.nodes[f.id] = f;
  (parent as InventoryFolder).childrenOrder.push(f.id);
  parent.updatedAt = now();
  await saveInventory(s);
  return f;
}

export async function createItem(parentId: NodeID, name: string): Promise<InventoryItem> {
  const s = await ensureInventoryReady();
  const parent = s.nodes[parentId];
  if (!parent || parent.type !== 'folder') throw new Error('Invalid parent folder');

  const it: InventoryItem = {
    id: `itm_${uid()}`,
    type: 'item',
    name,
    parentId,
    createdAt: now(),
    updatedAt: now(),
  };
  s.nodes[it.id] = it;
  (parent as InventoryFolder).childrenOrder.push(it.id);
  parent.updatedAt = now();
  await saveInventory(s);
  return it;
}

export async function renameNode(id: NodeID, name: string): Promise<void> {
  const s = await ensureInventoryReady();
  const n = s.nodes[id];
  if (!n) return;
  n.name = name;
  n.updatedAt = now();
  await saveInventory(s);
}

export async function deleteNode(id: NodeID): Promise<void> {
  const s = await ensureInventoryReady();
  const n = s.nodes[id];
  if (!n) return;

  // If folder: recursively delete children
  if (n.type === 'folder') {
    for (const childId of [...n.childrenOrder]) {
      await deleteNode(childId);
    }
  }

  // Remove from parent childrenOrder
  if (n.parentId) {
    const p = s.nodes[n.parentId] as InventoryFolder;
    if (p?.childrenOrder) {
      p.childrenOrder = p.childrenOrder.filter(cid => cid !== id);
      p.updatedAt = now();
    }
  }

  delete s.nodes[id];
  await saveInventory(s);
}

export async function moveNode(id: NodeID, newParentId: NodeID, index?: number): Promise<void> {
  const s = await ensureInventoryReady();
  const n = s.nodes[id];
  const oldParent = n?.parentId ? (s.nodes[n.parentId] as InventoryFolder) : null;
  const newParent = s.nodes[newParentId] as InventoryFolder;
  if (!n || !newParent || newParent.type !== 'folder') throw new Error('Invalid move');

  // remove from old
  if (oldParent) {
    oldParent.childrenOrder = oldParent.childrenOrder.filter(cid => cid !== id);
    oldParent.updatedAt = now();
  }

  // add to new
  if (typeof index === 'number') {
    newParent.childrenOrder.splice(index, 0, id);
  } else {
    newParent.childrenOrder.push(id);
  }
  newParent.updatedAt = now();

  n.parentId = newParentId;
  n.updatedAt = now();
  await saveInventory(s);
}