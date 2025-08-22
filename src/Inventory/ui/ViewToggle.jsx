// src/Inventory/ui/ViewToggle.jsx
// View toggle for list/grid modes

import React from 'react';
import { Grid3X3, List, LayoutGrid } from 'lucide-react';

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
  TILES: 'tiles'
};

const VIEW_CONFIG = {
  [VIEW_MODES.GRID]: {
    icon: Grid3X3,
    label: 'Grid View',
    description: 'Compact grid layout'
  },
  [VIEW_MODES.LIST]: {
    icon: List,
    label: 'List View',
    description: 'Detailed list layout'
  },
  [VIEW_MODES.TILES]: {
    icon: LayoutGrid,
    label: 'Large Tiles',
    description: 'Large tappable tiles'
  }
};

export function ViewToggle({ 
  currentView = VIEW_MODES.GRID, 
  onViewChange, 
  availableViews = Object.values(VIEW_MODES),
  className = '' 
}) {
  return (
    <div 
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 ${className}`}
      role="tablist"
      aria-label="View options"
    >
      {availableViews.map((view) => {
        const config = VIEW_CONFIG[view];
        const Icon = config.icon;
        const isActive = currentView === view;

        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200
              ${isActive
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
            role="tab"
            aria-selected={isActive}
            aria-label={config.description}
            title={config.description}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SortingControls({
  sortField,
  sortDirection,
  onSortChange,
  availableFields = [],
  className = ''
}) {
  const handleFieldChange = (field) => {
    if (field === sortField) {
      // Toggle direction if same field
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(field, newDirection);
    } else {
      // New field, default to ascending
      onSortChange(field, 'asc');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 hidden sm:inline">Sort by:</span>
      <div className="flex gap-1">
        {availableFields.map((field) => {
          const isActive = sortField === field.value;
          const isAscending = sortDirection === 'asc';

          return (
            <button
              key={field.value}
              onClick={() => handleFieldChange(field.value)}
              className={`
                px-3 py-1 text-sm rounded-md transition-colors
                ${isActive
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
              aria-pressed={isActive}
              title={`Sort by ${field.label} ${isActive ? (isAscending ? '(ascending)' : '(descending)') : ''}`}
            >
              {field.label}
              {isActive && (
                <span className="ml-1 text-xs">
                  {isAscending ? '↑' : '↓'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}