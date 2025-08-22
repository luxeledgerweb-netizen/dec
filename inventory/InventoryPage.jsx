// src/inventory/InventoryPage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Folder as FolderIcon,
  ChevronLeft,
  Edit as EditIcon,
  Trash2,
  Image as ImageIcon,
  FolderPlus,
  Upload,
  Download,
  ArrowLeft,
  MoreHorizontal
} from 'lucide-react';
import { invDb } from './db';
import { makeInventoryItem } from './types';
import AddInventoryItemModal from './components/AddInventoryItemModal';
import AddFolderModal from './components/AddFolderModal';
import MoveDialog from './components/MoveDialog';
import ImportExportPanel from './components/ImportExportPanel';
import { useNavigate } from 'react-router-dom';
import ItemPreviewModal from './components/ItemPreviewModal';

export default function InventoryPage() {
  const navigate = useNavigate();

  // ---------- state ----------
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderSizes, setFolderSizes] = useState({}); // { [folderId: totalBytes }
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // edit item state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingItemFiles, setEditingItemFiles] = useState([]);

  // folders modal state
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState(null); // folder object if renaming

  // move dialog state
  const [movingItem, setMovingItem] = useState(null);

  // import/export drawer
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // preview item state
  const [previewItem, setPreviewItem] = useState(null);

  // ---------- data load ----------
  const refresh = async () => {
       // For view
   const [list, folderList] = await Promise.all([
     invDb.listItems(currentFolderId),
     invDb.listFolders(currentFolderId)
   ]);
   setItems(list);
   setFolders(folderList);

   // For breadcrumb
   const crumbs = await invDb.getFolderPath(currentFolderId);
   setBreadcrumbs(crumbs || []);

   // ---- Size calculation (recursive) ----
   // Get ALL folders/items/files once to build a totals map quickly
   const [allFolders, allItems, allFiles] = await Promise.all([
     invDb.listAllFoldersTree(),     // every folder record
     invDb.listItems(),              // every item (any folder)
     invDb.listAllFileMeta(),       // every file meta (has .size)
   ]);

   // size per item (sum of its files)
   const sizeByItem = {};
   for (const f of allFiles) {
     sizeByItem[f.itemId] = (sizeByItem[f.itemId] || 0) + (f.size ?? f.blob?.size ?? 0);
   }

   // items grouped by folderId (null = root)
   const itemsByFolder = new Map(); // folderId -> number[]
   for (const it of allItems) {
     const fid = it.folderId ?? null;
     if (!itemsByFolder.has(fid)) itemsByFolder.set(fid, []);
     itemsByFolder.get(fid).push(it.id);
   }

   // children folders grouped by parentId
   const childrenByParent = new Map(); // parentId -> folderId[]
   for (const f of allFolders) {
     const pid = f.parentId ?? null;
     if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
     childrenByParent.get(pid).push(f.id);
   }

   // recursive DFS with memo
   const memo = new Map(); // folderId -> bytes
   const totalForFolder = (folderId) => {
     if (memo.has(folderId)) return memo.get(folderId);
     let sum = 0;
     const itemIds = itemsByFolder.get(folderId ?? null) || [];
     for (const id of itemIds) sum += (sizeByItem[id] || 0);
     const kids = childrenByParent.get(folderId ?? null) || [];
     for (const k of kids) sum += totalForFolder(k);
     memo.set(folderId, sum);
     return sum;
   };

   // Precompute totals for the folders we’re displaying now
   const sized = {};
   for (const f of folderList) {
     sized[f.id] = totalForFolder(f.id);
   }
   setFolderSizes(sized);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [currentFolderId]);

  // ---------- search ----------
  const searchLower = search.trim().toLowerCase();
  const filteredFolders = useMemo(() => {
    if (!searchLower) return folders;
    return folders.filter(f => (f.name || '').toLowerCase().includes(searchLower));
  }, [folders, searchLower]);

  const filteredItems = useMemo(() => {
    if (!searchLower) return items;
    return items.filter(i =>
      (i.title || '').toLowerCase().includes(searchLower) ||
      (i.notes || '').toLowerCase().includes(searchLower) ||
      (i.tags || []).some(t => t.toLowerCase().includes(searchLower))
    );
  }, [items, searchLower]);

  // ---------- helpers (thumbnails) ----------
  const firstThumb = (item) => {
    const imgs = item.images || [];
    return imgs[0]?.thumbDataUrl || null;
  };
  const imageThumbCount = (item) => (item.images || []).length;

  // ---------- item handlers ----------
  const handleAddSave = async (partial) => {
    const savedItem = await invDb.saveItem(
      makeInventoryItem({
        ...partial,
        folderId: currentFolderId ?? null,
        images: partial.images || [],
      })
    );

    if (partial.newFiles?.length) {
      for (const f of partial.newFiles) {
        await invDb.saveFileBlob(savedItem.id, f);
      }
    }
    await refresh();
    setIsAddOpen(false);
    return savedItem;
  };

  const handleEditOpen = async (item) => {
    setEditingItem(item);
    setIsEditOpen(true);
    const files = await invDb.listFiles(item.id);
    setEditingItemFiles(files.map(f => ({ id: f.id, name: f.name, size: f.size, mime: f.mime })));
  };

  const handleEditSave = async (updatedPartial) => {
    const updatedItem = {
      ...editingItem,
      ...updatedPartial,
      images: updatedPartial.images || (editingItem.images || []),
      updated_at: new Date().toISOString(),
    };
    await invDb.saveItem(updatedItem);

    if (updatedPartial.removedFileIds?.length) {
      for (const id of updatedPartial.removedFileIds) {
        await invDb.deleteFile(id);
      }
    }
    if (updatedPartial.newFiles?.length) {
      for (const f of updatedPartial.newFiles) {
        await invDb.saveFileBlob(updatedItem.id, f);
      }
    }
    setIsEditOpen(false);
    setEditingItem(null);
    setEditingItemFiles([]);
    await refresh();
  };

  const handleDelete = async (item) => {
    if (!item) return;
    if (confirm(`Delete "${item.title || 'Untitled Item'}"? This cannot be undone.`)) {
      await invDb.deleteItem(item.id);
      await refresh();
    }
  };

  const handleMove = async (item, targetFolderId) => {
    await invDb.moveItem(item.id, targetFolderId ?? null);
    setMovingItem(null);
    await refresh();
  };

  // ---------- formatter for file size in folders ---------
  const fmtBytes = (n=0) => {
  if (!n) return '0 B';
  const k = 1024, u = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(n)/Math.log(k));
  return `${(n/Math.pow(k,i)).toFixed(i ? 1 : 0)} ${u[i]}`;
};

  // ---------- folder handlers ----------
  const openFolder = (folderId) => setCurrentFolderId(folderId ?? null);

  const handleAddFolder = async (name) => {
    await invDb.createFolder({ name, parentId: currentFolderId ?? null });
    setIsAddFolderOpen(false);
    await refresh();
  };

  const handleRenameFolder = async (folderId, name) => {
    await invDb.renameFolder(folderId, name);
    setRenamingFolder(null);
    await refresh();
  };

  const handleDeleteFolder = async (folder) => {
    if (!folder) return;
    const msg = `Delete folder "${folder.name}" and everything inside it? This cannot be undone.`;
    if (confirm(msg)) {
      await invDb.deleteFolder(folder.id); // server-side should cascade
      // if we deleted the folder we were in, go up
      if (currentFolderId === folder.id) {
        openFolder(folder.parentId ?? null);
      } else {
        await refresh();
      }
    }
  };

  // ---------- UI ----------
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-2 md:pt-4 pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 md:pt-4 mb-6">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="outline" onClick={() => navigate('/PasswordVault')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Vault
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Inventory</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-stretch sm:justify-end">
          <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Import/Export
          </Button>
          <Button variant="outline" onClick={() => setIsAddFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> Add Folder
          </Button>
          <Button onClick={() => setIsAddOpen(true)}
             className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg flex-shrink-0"> 
              <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <Button variant="ghost" size="sm" onClick={() => openFolder(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Root
        </Button>
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={b.id ?? 'root'}>
            <span className="text-muted-foreground">/</span>
            <Button
              variant={idx === breadcrumbs.length - 1 ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => openFolder(b.id ?? null)}
            >
              {b.name || 'Root'}
            </Button>
          </React.Fragment>
        ))}
      </div>

      {/* Search */}
      <Card className="mb-6" style={{ backgroundColor: 'var(--tile-color)' }}>
        <CardHeader><CardTitle>Search</CardTitle></CardHeader>
        <CardContent>
          <Input
            placeholder="Search folders, items, tags, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3"
          />
        </CardContent>
      </Card>

      {/* Empty state */}
      {filteredFolders.length === 0 && filteredItems.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p>No folders or items here yet.</p>
          <p className="text-sm mt-2">Use “Add Folder” or “Add Item” to get started.</p>
        </div>
      ) : (
        <>
          {/* Folders grid */}
          {filteredFolders.length > 0 && (
            <>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredFolders.map(folder => (
                  <Card
                    key={folder.id}
                    className="hover:shadow-md transition group relative cursor-pointer"
                    style={{ backgroundColor: 'var(--tile-color)' }}
                    onClick={() => openFolder(folder.id)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderIcon className="h-5 w-5" />
                        <div className="min-w-0">
                          <CardTitle className="truncate">{folder.name || 'Untitled Folder'}</CardTitle>
                          <div className="text-xs text-muted-foreground">
                            {fmtBytes(folderSizes[folder.id] || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setRenamingFolder(folder); }}
                          title="Rename"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Items grid */}
          {filteredItems.length > 0 && (
            <>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Items</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => (
                  <Card
                    key={item.id}
                    className="hover:shadow-md transition group relative"
                    style={{ backgroundColor: 'var(--tile-color)' }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="truncate">{item.title || 'Untitled Item'}</CardTitle>
                      <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setMovingItem(item)} title="Move">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleEditOpen(item)} title="Edit">
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDelete(item)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      {firstThumb(item) ? (
                        <div className="relative">
                          <img
                            src={firstThumb(item)}
                            alt="thumbnail"
                            className="w-full h-36 object-contain bg-muted rounded-md border border-border/40"
			    onClick={() => setPreviewItem(item)}
                          />
                          {imageThumbCount(item) > 1 && (
                            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {imageThumbCount(item)}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {item.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 5).map(tag => (
                            <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-muted">{tag}</span>
                          ))}
                        </div>
                      ) : <div className="text-muted-foreground">No tags</div>}

                      {item.notes ? <div className="line-clamp-3">{item.notes}</div> : null}

                      <div className="pt-1">
                        <Button variant="outline" className="w-full" onClick={() => handleEditOpen(item)}>
                          Edit Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Item Modal */}
      {isAddOpen && (
        <AddInventoryItemModal
          isOpen={isAddOpen}
          currentFolderId={currentFolderId ?? null}
          onClose={() => setIsAddOpen(false)}
          onSave={handleAddSave}
        />
      )}

      {/* Edit Item Modal */}
      {isEditOpen && editingItem && (
        <AddInventoryItemModal
          isOpen={isEditOpen}
          mode="edit"
          initialItem={editingItem}
          existingFiles={editingItemFiles}
          onClose={() => { setIsEditOpen(false); setEditingItem(null); setEditingItemFiles([]); }}
          onSave={handleEditSave}
          onDelete={() => {
            handleDelete(editingItem);
            setIsEditOpen(false);
            setEditingItem(null);
            setEditingItemFiles([]);
          }}
        />
      )}

      {/* Add/Rename Folder Modal */}
      {isAddFolderOpen && (
        <AddFolderModal
          isOpen={isAddFolderOpen}
          title="Add Folder"
          initialName=""
          onClose={() => setIsAddFolderOpen(false)}
          onSave={(name) => handleAddFolder(name)}
        />
      )}
      {renamingFolder && (
        <AddFolderModal
          isOpen={true}
          title="Rename Folder"
          initialName={renamingFolder.name || ''}
          onClose={() => setRenamingFolder(null)}
          onSave={(name) => handleRenameFolder(renamingFolder.id, name)}
        />
      )}

      {/* Move Item Dialog */}
      {movingItem && (
        <MoveDialog
          isOpen={!!movingItem}
          title={`Move "${movingItem.title || 'Item'}"`}
          currentFolderId={movingItem.folderId ?? null}
          onClose={() => setMovingItem(null)}
          onConfirm={(targetFolderId) => handleMove(movingItem, targetFolderId)}
        />
      )}

      {/* Import/Export Drawer */}
      {isImportExportOpen && (
        <ImportExportPanel
          isOpen={isImportExportOpen}
          onClose={() => setIsImportExportOpen(false)}
          currentFolderId={currentFolderId ?? null}
          onAfterImport={async () => { await refresh(); }}
        />
      )}
	{/* Full-size preview modal */}
	<ItemPreviewModal
	  isOpen={!!previewItem}
	  item={previewItem}
	  onClose={() => setPreviewItem(null)}
	/>
    </div>
  );
}