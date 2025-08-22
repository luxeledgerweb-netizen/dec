// src/inventory/components/MoveDialog.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, FolderPlus, Folder as FolderIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { invDb } from '../db';

function TreeNode({ node, level, expanded, toggle, selectedId, setSelectedId, onConfirm }) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer border hover:bg-accent/40 ${
          isSelected ? 'border-[var(--ring)]' : 'border-transparent'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => setSelectedId(node.id)}
        onDoubleClick={() => onConfirm?.(node.id)}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-4 w-4" onClick={(e) => { e.stopPropagation(); toggle(node.id); }} />
          ) : (
            <ChevronRight className="h-4 w-4" onClick={(e) => { e.stopPropagation(); toggle(node.id); }} />
          )
        ) : (
          <span className="w-4" />
        )}
        <FolderIcon className="h-4 w-4" />
        <span className="truncate">{node.name || 'Untitled folder'}</span>
      </div>

      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expanded={expanded}
              toggle={toggle}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onConfirm={onConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(folders) {
  const map = new Map();
  folders.forEach(f => map.set(f.id, { ...f, children: [] }));
  const roots = [];
  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export default function MoveDialog({
  isOpen,
  currentFolderId = null,
  onClose,
  onConfirm,               // (destFolderId|null) => void
}) {
  const [folders, setFolders] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState(null); // parent to create under
  const [selectedId, setSelectedId] = useState(currentFolderId ?? null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(currentFolderId ?? null);
  }, [isOpen, currentFolderId]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const list = await invDb.listFolders();
      setFolders(list);
    })();
  }, [isOpen]);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const toggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const created = await invDb.saveFolder({ name, parentId: newFolderParent || null });
    setNewFolderName('');
    setNewFolderParent(null);
    const list = await invDb.listFolders();
    setFolders(list);
    // expand into the new folder’s parent
    if (created.parentId) {
      setExpanded(prev => new Set(prev).add(created.parentId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-2 sm:p-4">
      <Card className="w-full max-w-[min(720px,calc(100vw-2rem))] max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--tile-color)' }}>
        <CardHeader className="sticky top-0 z-10 bg-[var(--tile-color)]/95 backdrop-blur border-b">
          <CardTitle>Move to…</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Root (no folder) destination */}
          <div className="space-y-2">
  {/* Root (no folder) destination */}
  <div
    onClick={() => setSelectedId(null)}
    onDoubleClick={() => onConfirm?.(null)}
    className={`py-1 px-2 rounded cursor-pointer border hover:bg-accent/40 ${
      selectedId === null ? 'border-[var(--ring)]' : 'border-transparent'
    }`}
  >
    <span className="ml-6">— Put in root (no folder)</span>
  </div>

  {/* Folder tree */}
  {tree.length === 0 ? (
    <div className="text-sm text-muted-foreground px-2">No folders yet.</div>
  ) : (
    tree.map(root => (
      <TreeNode
        key={root.id}
        node={root}
        level={0}
        expanded={expanded}
        toggle={toggle}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onConfirm={onConfirm}
      />
    ))
  )}
</div>

          {/* Create folder inline */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Create a new folder</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <select
                className="border rounded px-3 py-2 text-sm"
                value={newFolderParent || ''}
                onChange={(e) => setNewFolderParent(e.target.value || null)}
              >
                <option value="">Parent: (root)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name || 'Untitled folder'}</option>
                ))}
              </select>
              <Button onClick={handleCreate}>
                <FolderPlus className="h-4 w-4 mr-2" /> Create
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
  <Button variant="outline" onClick={onClose}>Close</Button>
  <Button onClick={() => onConfirm?.(selectedId ?? null)}>
    Move Here
  </Button>
</div>
        </CardContent>
      </Card>
    </div>
  );
}