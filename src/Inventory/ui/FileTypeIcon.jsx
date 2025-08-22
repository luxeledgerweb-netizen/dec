// src/Inventory/ui/FileTypeIcon.jsx
// File type icons with badges

import React from 'react';
import {
  Image,
  FileText,
  Play,
  Music,
  File,
  Archive,
  Code,
  Folder
} from 'lucide-react';
import { FILE_TYPES, FILE_TYPE_LABELS, FILE_TYPE_COLORS, getFileType } from '../utils/fileTypes';

const FILE_TYPE_ICONS = {
  [FILE_TYPES.IMAGE]: Image,
  [FILE_TYPES.PDF]: FileText,
  [FILE_TYPES.VIDEO]: Play,
  [FILE_TYPES.AUDIO]: Music,
  [FILE_TYPES.DOCUMENT]: FileText,
  [FILE_TYPES.ARCHIVE]: Archive,
  [FILE_TYPES.CODE]: Code,
  [FILE_TYPES.OTHER]: File
};

export function FileTypeIcon({ 
  fileName, 
  mimeType, 
  size = 'sm', 
  showBadge = false, 
  className = '' 
}) {
  const fileType = getFileType(fileName, mimeType);
  const Icon = FILE_TYPE_ICONS[fileType] || File;
  
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  if (!showBadge) {
    return (
      <Icon 
        className={`${sizeClasses[size]} ${className}`}
        aria-label={`${FILE_TYPE_LABELS[fileType]} file`}
      />
    );
  }

  return (
    <div className="relative inline-flex">
      <Icon 
        className={`${sizeClasses[size]} ${className}`}
        aria-label={`${FILE_TYPE_LABELS[fileType]} file`}
      />
      {showBadge && (
        <span
          className={`
            absolute -top-1 -right-1 px-1 py-0.5 text-xs font-medium rounded border
            ${FILE_TYPE_COLORS[fileType]}
          `}
        >
          {FILE_TYPE_LABELS[fileType]}
        </span>
      )}
    </div>
  );
}

export function FileTypeBadge({ fileType, count = null, className = '' }) {
  const Icon = FILE_TYPE_ICONS[fileType] || File;
  const label = FILE_TYPE_LABELS[fileType] || 'Unknown';

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
        ${FILE_TYPE_COLORS[fileType]} ${className}
      `}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {count !== null && (
        <span className="ml-1 px-1 rounded-full bg-black/10 text-xs">
          {count}
        </span>
      )}
    </span>
  );
}

export function FolderIcon({ size = 'sm', className = '' }) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  return (
    <Folder 
      className={`${sizeClasses[size]} ${className}`}
      aria-label="Folder"
    />
  );
}