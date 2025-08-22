// src/Inventory/utils/sorting.js
// Multi-criteria sorting utilities

export const SORT_FIELDS = {
  NAME: 'name',
  DATE_CREATED: 'dateCreated',
  DATE_MODIFIED: 'dateModified',
  SIZE: 'size',
  TYPE: 'type'
};

export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc'
};

export const SORT_FIELD_LABELS = {
  [SORT_FIELDS.NAME]: 'Name',
  [SORT_FIELDS.DATE_CREATED]: 'Date Created',
  [SORT_FIELDS.DATE_MODIFIED]: 'Date Modified', 
  [SORT_FIELDS.SIZE]: 'Size',
  [SORT_FIELDS.TYPE]: 'Type'
};

/**
 * Get sortable value for an item based on field
 */
function getSortValue(item, field, itemFiles = []) {
  switch (field) {
    case SORT_FIELDS.NAME:
      return (item.title || item.name || '').toLowerCase();
    
    case SORT_FIELDS.DATE_CREATED:
      return new Date(item.created_at || 0).getTime();
    
    case SORT_FIELDS.DATE_MODIFIED:
      return new Date(item.updated_at || 0).getTime();
    
    case SORT_FIELDS.SIZE:
      // Calculate total size of item including files
      let totalSize = 0;
      if (itemFiles.length > 0) {
        totalSize = itemFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      }
      // Also count thumbnail sizes as estimate
      if (item.images && item.images.length > 0) {
        totalSize += item.images.length * 50000; // Rough estimate for thumbnails
      }
      return totalSize;
    
    case SORT_FIELDS.TYPE:
      // Sort by primary file type, then by name
      const fileTypes = itemFiles.map(f => f.mime || '').sort();
      const primaryType = fileTypes[0] || 'z-other'; // 'z-' to sort unknown types last
      return primaryType + '|' + (item.title || item.name || '').toLowerCase();
    
    default:
      return '';
  }
}

/**
 * Get sortable value for a folder
 */
function getFolderSortValue(folder, field, folderSize = 0) {
  switch (field) {
    case SORT_FIELDS.NAME:
      return (folder.name || '').toLowerCase();
    
    case SORT_FIELDS.DATE_CREATED:
      return new Date(folder.created_at || 0).getTime();
    
    case SORT_FIELDS.DATE_MODIFIED:
      return new Date(folder.updated_at || 0).getTime();
    
    case SORT_FIELDS.SIZE:
      return folderSize || 0;
    
    case SORT_FIELDS.TYPE:
      return 'a-folder'; // Sort folders before items when sorting by type
    
    default:
      return '';
  }
}

/**
 * Sort items array
 */
export function sortItems(items, itemFilesMap = {}, sortField = SORT_FIELDS.NAME, sortDirection = SORT_DIRECTIONS.ASC) {
  const sorted = [...items].sort((a, b) => {
    const aFiles = itemFilesMap[a.id] || [];
    const bFiles = itemFilesMap[b.id] || [];
    
    const aValue = getSortValue(a, sortField, aFiles);
    const bValue = getSortValue(b, sortField, bFiles);
    
    let comparison = 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortDirection === SORT_DIRECTIONS.DESC ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Sort folders array
 */
export function sortFolders(folders, folderSizesMap = {}, sortField = SORT_FIELDS.NAME, sortDirection = SORT_DIRECTIONS.ASC) {
  const sorted = [...folders].sort((a, b) => {
    const aSize = folderSizesMap[a.id] || 0;
    const bSize = folderSizesMap[b.id] || 0;
    
    const aValue = getFolderSortValue(a, sortField, aSize);
    const bValue = getFolderSortValue(b, sortField, bSize);
    
    let comparison = 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortDirection === SORT_DIRECTIONS.DESC ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Sort combined folders and items (for mixed views)
 */
export function sortMixed(folders, items, folderSizesMap = {}, itemFilesMap = {}, sortField = SORT_FIELDS.NAME, sortDirection = SORT_DIRECTIONS.ASC) {
  // Always show folders first, then items, unless sorting by type
  if (sortField === SORT_FIELDS.TYPE) {
    // When sorting by type, mix folders and items
    const allEntries = [
      ...folders.map(f => ({ type: 'folder', data: f })),
      ...items.map(i => ({ type: 'item', data: i }))
    ];
    
    const sorted = allEntries.sort((a, b) => {
      let aValue, bValue;
      
      if (a.type === 'folder') {
        const aSize = folderSizesMap[a.data.id] || 0;
        aValue = getFolderSortValue(a.data, sortField, aSize);
      } else {
        const aFiles = itemFilesMap[a.data.id] || [];
        aValue = getSortValue(a.data, sortField, aFiles);
      }
      
      if (b.type === 'folder') {
        const bSize = folderSizesMap[b.data.id] || 0;
        bValue = getFolderSortValue(b.data, sortField, bSize);
      } else {
        const bFiles = itemFilesMap[b.data.id] || [];
        bValue = getSortValue(b.data, sortField, bFiles);
      }
      
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === SORT_DIRECTIONS.DESC ? -comparison : comparison;
    });
    
    return {
      folders: sorted.filter(e => e.type === 'folder').map(e => e.data),
      items: sorted.filter(e => e.type === 'item').map(e => e.data)
    };
  } else {
    // For other sort fields, keep folders first
    return {
      folders: sortFolders(folders, folderSizesMap, sortField, sortDirection),
      items: sortItems(items, itemFilesMap, sortField, sortDirection)
    };
  }
}