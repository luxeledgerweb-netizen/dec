// src/Inventory/InventoryPageEnhanced.jsx
// Enhanced MaxVault-style Inventory page

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ChevronLeft,
  Edit as EditIcon,
  Trash2,
  Image as ImageIcon,
  FolderPlus,
  Upload,
  Download,
  ArrowLeft,
  MoreHorizontal,
  Star,
  Heart
} from 'lucide-react';
import { invDb } from './db';
import { makeInventoryItem } from './types';
import AddInventoryItemModal from './components/AddInventoryItemModal';
import AddFolderModal from './components/AddFolderModal';
import MoveDialog from './components/MoveDialog';
import ImportExportPanel from './components/ImportExportPanel';
import { useNavigate } from 'react-router-dom';
import ItemPreviewModal from './components/ItemPreviewModal';

// New enhanced UI components
import { SearchBar } from './ui/SearchBar';
import { FilterChipsContainer, createFilter, FILTER_TYPES } from './ui/FilterChips';
import { ViewToggle, SortingControls, VIEW_MODES } from './ui/ViewToggle';
import { FileTypeIcon, FileTypeBadge, FolderIcon } from './ui/FileTypeIcon';
import { SkeletonGrid, SkeletonList } from './ui/SkeletonLoader';
import { ToastContainer } from './ui/Toast';

// Enhanced utilities
import { searchItems, searchFolders } from './utils/search';
import { sortItems, sortFolders, sortMixed, SORT_FIELDS, SORT_DIRECTIONS, SORT_FIELD_LABELS } from './utils/sorting';
import { getItemFileTypes, FILE_TYPES, FILE_TYPE_LABELS } from './utils/fileTypes';
import { useFavorites } from './hooks/useFavorites';
import { useToast } from './hooks/useToast';

export default function InventoryPageEnhanced() {
  const navigate = useNavigate();
  const { toasts, success, error, removeToast } = useToast();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  // ---------- Core state ----------
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderSizes, setFolderSizes] = useState({});
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [itemFiles, setItemFiles] = useState({}); // Cache for item files
  const [loading, setLoading] = useState(true);

  // ---------- UI state ----------
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState(VIEW_MODES.TILES);
  const [sortField, setSortField] = useState(SORT_FIELDS.DATE_MODIFIED);
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTIONS.DESC);
  const [activeFilters, setActiveFilters] = useState([]);

  // ---------- Modal state (preserved from original) ----------
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingItemFiles, setEditingItemFiles] = useState([]);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // ---------- Data loading (enhanced with file caching) ----------
  const refresh = async () => {
    setLoading(true);
    try {
      const [list, folderList] = await Promise.all([
        invDb.listItems(currentFolderId),
        invDb.listFolders(currentFolderId)
      ]);
      
      setItems(list);
      setFolders(folderList);

      // Load breadcrumbs
      const crumbs = await invDb.getFolderPath(currentFolderId);
      setBreadcrumbs(crumbs || []);

      // Load folder sizes (preserved from original)
      const [allFolders, allItems, allFiles] = await Promise.all([
        invDb.listAllFoldersTree(),
        invDb.listItems(),
        invDb.listAllFileMeta(),
      ]);

      const sizeByItem = {};
      for (const f of allFiles) {
        sizeByItem[f.itemId] = (sizeByItem[f.itemId] || 0) + (f.size ?? f.blob?.size ?? 0);
      }

      const itemsByFolder = new Map();
      for (const it of allItems) {
        const fid = it.folderId ?? null;
        if (!itemsByFolder.has(fid)) itemsByFolder.set(fid, []);
        itemsByFolder.get(fid).push(it.id);
      }

      const childrenByParent = new Map();
      for (const f of allFolders) {
        const pid = f.parentId ?? null;
        if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
        childrenByParent.get(pid).push(f.id);
      }

      const memo = new Map();
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

      const sized = {};
      for (const f of folderList) {
        sized[f.id] = totalForFolder(f.id);
      }
      setFolderSizes(sized);

      // Cache files for current items for better performance
      const filesCache = {};
      await Promise.all(list.map(async (item) => {
        const files = await invDb.listFiles(item.id);
        filesCache[item.id] = files;
      }));
      setItemFiles(filesCache);

    } catch (err) {
      console.error('Failed to refresh data:', err);
      error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [currentFolderId]);

  // ---------- Enhanced filtering and searching ----------
  const filteredAndSortedData = useMemo(() => {
    let filteredItems = [...items];
    let filteredFolders = [...folders];

    // Apply search
    if (search.trim()) {
      filteredItems = searchItems(filteredItems, search, {
        searchFields: ['title', 'notes', 'tags']
      });
      filteredFolders = searchFolders(filteredFolders, search);
    }

    // Apply filters
    activeFilters.forEach(filter => {
      switch (filter.type) {
        case FILTER_TYPES.FAVORITES:
          filteredItems = filteredItems.filter(item => isFavorite(item.id));
          break;
        
        case FILTER_TYPES.RECENT: {
          const daysAgo = filter.value || 7;
          const cutoff = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
          filteredItems = filteredItems.filter(item => 
            new Date(item.updated_at || item.created_at).getTime() > cutoff
          );
          break;
        }
        
        case FILTER_TYPES.FILE_TYPE: {
          filteredItems = filteredItems.filter(item => {
            const files = itemFiles[item.id] || [];
            const types = getItemFileTypes(item, files);
            return types.includes(filter.value);
          });
          break;
        }
        
        case FILTER_TYPES.TAG: {
          filteredItems = filteredItems.filter(item =>
            (item.tags || []).includes(filter.value)
          );
          break;
        }
      }
    });

    // Apply sorting
    const sorted = sortMixed(
      filteredFolders,
      filteredItems,
      folderSizes,
      itemFiles,
      sortField,
      sortDirection
    );

    return sorted;
  }, [items, folders, search, activeFilters, sortField, sortDirection, folderSizes, itemFiles, isFavorite]);

  // ---------- Available filters (computed from data) ----------
  const availableFilters = useMemo(() => {
    const filters = [];
    
    // Favorites filter (if any favorites exist)
    if (favorites.length > 0) {
      const favoriteCount = items.filter(item => isFavorite(item.id)).length;
      if (favoriteCount > 0) {
        filters.push({ ...createFilter.favorites(), count: favoriteCount });
      }
    }

    // Recent filter
    const recentCount = items.filter(item => {
      const daysAgo = 7;
      const cutoff = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
      return new Date(item.updated_at || item.created_at).getTime() > cutoff;
    }).length;
    if (recentCount > 0) {
      filters.push({ ...createFilter.recent(7), count: recentCount });
    }

    // File type filters
    const fileTypeCounts = {};
    items.forEach(item => {
      const files = itemFiles[item.id] || [];
      const types = getItemFileTypes(item, files);
      types.forEach(type => {
        fileTypeCounts[type] = (fileTypeCounts[type] || 0) + 1;
      });
    });

    Object.entries(fileTypeCounts).forEach(([type, count]) => {
      if (count > 0) {
        filters.push({ ...createFilter.fileType(type), count });
      }
    });

    return filters;
  }, [items, itemFiles, favorites, isFavorite]);

  // ---------- Event handlers (enhanced with toast notifications) ----------
  const handleAddSave = async (partial) => {
    try {
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
      success(`Created "${savedItem.title || 'New item'}"`);
      return savedItem;
    } catch (err) {
      console.error('Failed to create item:', err);
      error('Failed to create item');
      throw err;
    }
  };

  const handleEditOpen = async (item) => {
    setEditingItem(item);
    setIsEditOpen(true);
    const files = await invDb.listFiles(item.id);
    setEditingItemFiles(files.map(f => ({ id: f.id, name: f.name, size: f.size, mime: f.mime })));
  };

  const handleEditSave = async (updatedPartial) => {
    try {
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
      success(`Updated "${updatedItem.title || 'Item'}"`);
    } catch (err) {
      console.error('Failed to update item:', err);
      error('Failed to update item');
    }
  };

  const handleDelete = async (item) => {
    if (!item) return;
    if (confirm(`Delete "${item.title || 'Untitled Item'}"? This cannot be undone.`)) {
      try {
        await invDb.deleteItem(item.id);
        await refresh();
        success(`Deleted "${item.title || 'Item'}"`);
      } catch (err) {
        console.error('Failed to delete item:', err);
        error('Failed to delete item');
      }
    }
  };

  const handleMove = async (item, targetFolderId) => {
    try {
      await invDb.moveItem(item.id, targetFolderId ?? null);
      setMovingItem(null);
      await refresh();
      success(`Moved "${item.title || 'Item'}"`);
    } catch (err) {
      console.error('Failed to move item:', err);
      error('Failed to move item');
    }
  };

  // ---------- Folder handlers (enhanced with notifications) ----------
  const openFolder = (folderId) => setCurrentFolderId(folderId ?? null);

  const handleAddFolder = async (name) => {
    try {
      await invDb.createFolder({ name, parentId: currentFolderId ?? null });
      setIsAddFolderOpen(false);
      await refresh();
      success(`Created folder "${name}"`);
    } catch (err) {
      console.error('Failed to create folder:', err);
      error('Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId, name) => {
    try {
      await invDb.renameFolder(folderId, name);
      setRenamingFolder(null);
      await refresh();
      success(`Renamed folder to "${name}"`);
    } catch (err) {
      console.error('Failed to rename folder:', err);
      error('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!folder) return;
    const msg = `Delete folder "${folder.name}" and everything inside it? This cannot be undone.`;
    if (confirm(msg)) {
      try {
        await invDb.deleteFolder(folder.id);
        if (currentFolderId === folder.id) {
          openFolder(folder.parentId ?? null);
        } else {
          await refresh();
        }
        success(`Deleted folder "${folder.name}"`);
      } catch (err) {
        console.error('Failed to delete folder:', err);
        error('Failed to delete folder');
      }
    }
  };

  // ---------- Filter handlers ----------
  const handleFilterToggle = (filter) => {
    setActiveFilters(prev => {
      const existing = prev.find(f => f.type === filter.type && f.value === filter.value);
      if (existing) {
        return prev.filter(f => f !== existing);
      } else {
        return [...prev, filter];
      }
    });
  };

  const handleFilterRemove = (filter) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  };

  const handleSortChange = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  // ---------- Utility functions ----------
  const fmtBytes = (n = 0) => {
    if (!n) return '0 B';
    const k = 1024, u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return `${(n / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
  };

  const firstThumb = (item) => {
    const imgs = item.images || [];
    return imgs[0]?.thumbDataUrl || null;
  };

  const imageThumbCount = (item) => (item.images || []).length;

  // Get available sort fields
  const sortFields = [
    { value: SORT_FIELDS.NAME, label: SORT_FIELD_LABELS[SORT_FIELDS.NAME] },
    { value: SORT_FIELDS.DATE_MODIFIED, label: SORT_FIELD_LABELS[SORT_FIELDS.DATE_MODIFIED] },
    { value: SORT_FIELDS.DATE_CREATED, label: SORT_FIELD_LABELS[SORT_FIELDS.DATE_CREATED] },
    { value: SORT_FIELDS.SIZE, label: SORT_FIELD_LABELS[SORT_FIELDS.SIZE] },
    { value: SORT_FIELDS.TYPE, label: SORT_FIELD_LABELS[SORT_FIELDS.TYPE] }
  ];

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pt-2 md:pt-4 pb-10 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 animate-pulse rounded w-48 mb-4" />
          <div className="h-10 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="flex gap-2 mb-4">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-24" />
            <div className="h-8 bg-gray-200 animate-pulse rounded w-32" />
          </div>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-2 md:pt-4 pb-10 max-w-7xl mx-auto">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

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
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg flex-shrink-0"
          >
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

      {/* Enhanced search and filters */}
      <Card className="mb-6" style={{ backgroundColor: 'var(--tile-color)' }}>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search items, folders, tags, notes..."
            className="w-full"
          />
          
          <FilterChipsContainer
            availableFilters={availableFilters}
            activeFilters={activeFilters}
            onFilterToggle={handleFilterToggle}
            onFilterRemove={handleFilterRemove}
          />
        </CardContent>
      </Card>

      {/* View controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <ViewToggle
          currentView={viewMode}
          onViewChange={setViewMode}
          availableViews={[VIEW_MODES.TILES, VIEW_MODES.GRID, VIEW_MODES.LIST]}
        />
        
        <SortingControls
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          availableFields={sortFields}
        />
      </div>

      {/* Content */}
      {filteredAndSortedData.folders.length === 0 && filteredAndSortedData.items.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p>No folders or items here yet.</p>
          <p className="text-sm mt-2">Use "Add Folder" or "Add Item" to get started.</p>
        </div>
      ) : (
        <>
          {/* Folders */}
          {filteredAndSortedData.folders.length > 0 && (
            <>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Folders</h3>
              <div className={`gap-6 mb-8 ${
                viewMode === VIEW_MODES.LIST 
                  ? 'space-y-2' 
                  : viewMode === VIEW_MODES.TILES
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {filteredAndSortedData.folders.map(folder => (
                  <Card
                    key={folder.id}
                    className={`hover:shadow-md transition group relative cursor-pointer ${
                      viewMode === VIEW_MODES.TILES ? 'p-6' : ''
                    }`}
                    style={{ backgroundColor: 'var(--tile-color)' }}
                    onClick={() => openFolder(folder.id)}
                  >
                    <CardHeader className={`flex flex-row items-center justify-between ${
                      viewMode === VIEW_MODES.TILES ? 'pb-2' : ''
                    }`}>
                      <div className="flex items-center gap-3">
                        <FolderIcon size={viewMode === VIEW_MODES.TILES ? 'lg' : 'md'} />
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

          {/* Items */}
          {filteredAndSortedData.items.length > 0 && (
            <>
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Items</h3>
              <div className={`${
                viewMode === VIEW_MODES.LIST 
                  ? 'space-y-2' 
                  : viewMode === VIEW_MODES.TILES
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              }`}>
                {filteredAndSortedData.items.map(item => {
                  const files = itemFiles[item.id] || [];
                  const fileTypes = getItemFileTypes(item, files);
                  
                  if (viewMode === VIEW_MODES.LIST) {
                    return (
                      <Card
                        key={item.id}
                        className="hover:shadow-md transition group relative p-4"
                        style={{ backgroundColor: 'var(--tile-color)' }}
                      >
                        <div className="flex items-center gap-4">
                          {/* Thumbnail or icon */}
                          <div className="flex-shrink-0">
                            {firstThumb(item) ? (
                              <img
                                src={firstThumb(item)}
                                alt="thumbnail"
                                className="w-12 h-12 object-cover rounded border cursor-pointer"
                                onClick={() => setPreviewItem(item)}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                <FileTypeIcon fileName={item.title} size="lg" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{item.title || 'Untitled Item'}</h4>
                              {isFavorite(item.id) && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                              {files.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
                                </>
                              )}
                            </div>

                            {fileTypes.length > 0 && (
                              <div className="flex gap-1 mb-2">
                                {fileTypes.slice(0, 3).map(type => (
                                  <FileTypeBadge key={type} fileType={type} />
                                ))}
                                {fileTypes.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{fileTypes.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{item.notes}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleFavorite(item.id)}
                              title={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className={`h-4 w-4 ${isFavorite(item.id) ? 'text-yellow-500 fill-current' : ''}`} />
                            </Button>
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
                        </div>
                      </Card>
                    );
                  }

                  // Grid and Tiles view
                  return (
                    <Card
                      key={item.id}
                      className={`hover:shadow-md transition group relative ${
                        viewMode === VIEW_MODES.TILES ? 'p-6' : ''
                      }`}
                      style={{ backgroundColor: 'var(--tile-color)' }}
                    >
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CardTitle className="truncate">{item.title || 'Untitled Item'}</CardTitle>
                          {isFavorite(item.id) && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleFavorite(item.id)}
                            title={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={`h-4 w-4 ${isFavorite(item.id) ? 'text-yellow-500 fill-current' : ''}`} />
                          </Button>
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
                              className={`w-full object-contain bg-muted rounded-md border border-border/40 cursor-pointer ${
                                viewMode === VIEW_MODES.TILES ? 'h-48' : 'h-36'
                              }`}
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

                        {/* File type badges */}
                        {fileTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {fileTypes.slice(0, 4).map(type => (
                              <FileTypeBadge key={type} fileType={type} />
                            ))}
                            {fileTypes.length > 4 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{fileTypes.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        {item.tags?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 5).map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-muted">{tag}</span>
                            ))}
                          </div>
                        ) : <div className="text-muted-foreground">No tags</div>}

                        {item.notes && (
                          <div className="line-clamp-3">{item.notes}</div>
                        )}

                        <div className="pt-1">
                          <Button variant="outline" className="w-full" onClick={() => handleEditOpen(item)}>
                            Edit Item
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Modals (preserved from original) */}
      {isAddOpen && (
        <AddInventoryItemModal
          isOpen={isAddOpen}
          currentFolderId={currentFolderId ?? null}
          onClose={() => setIsAddOpen(false)}
          onSave={handleAddSave}
        />
      )}

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

      {movingItem && (
        <MoveDialog
          isOpen={!!movingItem}
          title={`Move "${movingItem.title || 'Item'}"`}
          currentFolderId={movingItem.folderId ?? null}
          onClose={() => setMovingItem(null)}
          onConfirm={(targetFolderId) => handleMove(movingItem, targetFolderId)}
        />
      )}

      {isImportExportOpen && (
        <ImportExportPanel
          isOpen={isImportExportOpen}
          onClose={() => setIsImportExportOpen(false)}
          currentFolderId={currentFolderId ?? null}
          onAfterImport={async () => { await refresh(); }}
        />
      )}

      <ItemPreviewModal
        isOpen={!!previewItem}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}