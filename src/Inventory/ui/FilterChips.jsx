// src/Inventory/ui/FilterChips.jsx
// Smart filter chips component

import React from 'react';
import { Star, Clock, Shield, FileType, Tag, X } from 'lucide-react';
import { FILE_TYPES, FILE_TYPE_LABELS } from '../utils/fileTypes';
import { FileTypeBadge } from './FileTypeIcon';

const FILTER_TYPES = {
  FAVORITES: 'favorites',
  RECENT: 'recent', 
  ENCRYPTED: 'encrypted',
  FILE_TYPE: 'fileType',
  TAG: 'tag'
};

const FILTER_ICONS = {
  [FILTER_TYPES.FAVORITES]: Star,
  [FILTER_TYPES.RECENT]: Clock,
  [FILTER_TYPES.ENCRYPTED]: Shield,
  [FILTER_TYPES.FILE_TYPE]: FileType,
  [FILTER_TYPES.TAG]: Tag
};

const FILTER_LABELS = {
  [FILTER_TYPES.FAVORITES]: 'Favorites',
  [FILTER_TYPES.RECENT]: 'Recent',
  [FILTER_TYPES.ENCRYPTED]: 'Encrypted',
  [FILTER_TYPES.FILE_TYPE]: 'File Type',
  [FILTER_TYPES.TAG]: 'Tags'
};

export function FilterChip({ 
  type, 
  value = null, 
  count = null, 
  active = false, 
  onClick, 
  onRemove,
  className = '' 
}) {
  const Icon = FILTER_ICONS[type] || Tag;
  const baseLabel = FILTER_LABELS[type] || 'Filter';
  
  // Special handling for different filter types
  let label = baseLabel;
  let displayValue = value;

  if (type === FILTER_TYPES.FILE_TYPE && value) {
    label = FILE_TYPE_LABELS[value] || value;
  } else if (type === FILTER_TYPES.TAG && value) {
    label = value;
  } else if (value) {
    displayValue = String(value);
    label = `${baseLabel}: ${displayValue}`;
  }

  // Special rendering for file type chips
  if (type === FILTER_TYPES.FILE_TYPE && value && active) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <FileTypeBadge fileType={value} count={count} />
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 p-1 hover:bg-black/10 rounded-full"
            aria-label={`Remove ${label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-colors duration-200 border
        ${active
          ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
        }
        ${className}
      `}
      aria-pressed={active}
      aria-label={`${active ? 'Remove' : 'Apply'} ${label} filter`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== null && (
        <span className={`
          px-1.5 py-0.5 rounded-full text-xs
          ${active ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'}
        `}>
          {count}
        </span>
      )}
      {active && onRemove && (
        <X 
          className="h-3 w-3 ml-1" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );
}

export function FilterChipsContainer({ 
  availableFilters = [],
  activeFilters = [],
  onFilterToggle,
  onFilterRemove,
  className = ''
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Available filter buttons */}
      {availableFilters.map((filter) => (
        <FilterChip
          key={filter.id || `${filter.type}-${filter.value || 'default'}`}
          type={filter.type}
          value={filter.value}
          count={filter.count}
          active={activeFilters.some(af => 
            af.type === filter.type && 
            (filter.value === undefined || af.value === filter.value)
          )}
          onClick={() => onFilterToggle(filter)}
          className="flex-shrink-0"
        />
      ))}

      {/* Active filter chips (for complex filters) */}
      {activeFilters.map((filter) => {
        // Don't show duplicate chips for simple toggles
        if (availableFilters.some(af => 
          af.type === filter.type && 
          (af.value === undefined || af.value === filter.value)
        )) {
          return null;
        }

        return (
          <FilterChip
            key={filter.id || `active-${filter.type}-${filter.value || 'default'}`}
            type={filter.type}
            value={filter.value}
            count={filter.count}
            active={true}
            onRemove={() => onFilterRemove(filter)}
            className="flex-shrink-0"
          />
        );
      })}
    </div>
  );
}

// Helper functions to create filter objects
export const createFilter = {
  favorites: () => ({ type: FILTER_TYPES.FAVORITES }),
  recent: (days = 7) => ({ type: FILTER_TYPES.RECENT, value: days }),
  encrypted: () => ({ type: FILTER_TYPES.ENCRYPTED }),
  fileType: (fileType) => ({ type: FILTER_TYPES.FILE_TYPE, value: fileType }),
  tag: (tagName) => ({ type: FILTER_TYPES.TAG, value: tagName })
};

export { FILTER_TYPES };