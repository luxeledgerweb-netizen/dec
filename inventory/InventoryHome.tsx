import React, { useEffect, useState } from 'react';
import { ensureInventoryReady, getChildren, createFolder, createItem, isFolder } from './inventory.store';

export default function InventoryHome() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [rootId, setRootId] = useState<string>('root');

  useEffect(() => {
    (async () => {
      const state = await ensureInventoryReady();
      setRootId(state.rootId);
      const ch = await getChildren(state.rootId);
      setChildren(ch);
      setLoading(false);
    })();
  }, []);

  async function addFolder() {
    const name = prompt('Folder name?');
    if (!name) return;
    await createFolder(rootId, name);
    setChildren(await getChildren(rootId));
  }

  async function addItem() {
    const name = prompt('Item name?');
    if (!name) return;
    await createItem(rootId, name);
    setChildren(await getChildren(rootId));
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Inventory</h1>
        <p className="text-sm text-gray-500">Root folder (“All Items”)</p>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-purple-600 text-white" onClick={addFolder}>New Folder</button>
        <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={addItem}>New Item</button>
      </div>

      <div className="border rounded">
        {children.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Empty — add a folder or an item.</div>
        ) : (
          <ul>
            {children.map(n => (
              <li key={n.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                <div>
                  <span className="font-medium">{n.name}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100">{isFolder(n) ? 'Folder' : 'Item'}</span>
                </div>
                <div className="text-xs text-gray-500">{new Date(n.updatedAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}