// src/Inventory/ui/SkeletonLoader.jsx
// Skeleton loading components

import React from 'react';

export function SkeletonBox({ width, height, className = '' }) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 animate-pulse rounded ${
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4" aria-hidden="true">
      {/* Header with icon and title */}
      <div className="flex items-center gap-3">
        <SkeletonBox width="24px" height="24px" />
        <SkeletonText lines={1} className="flex-1" />
      </div>

      {/* Thumbnail area */}
      <SkeletonBox width="100%" height="144px" />

      {/* Tags area */}
      <div className="flex gap-2">
        <SkeletonBox width="60px" height="20px" className="rounded-full" />
        <SkeletonBox width="80px" height="20px" className="rounded-full" />
        <SkeletonBox width="40px" height="20px" className="rounded-full" />
      </div>

      {/* Notes area */}
      <SkeletonText lines={2} />

      {/* Action button */}
      <SkeletonBox width="100%" height="36px" />
    </div>
  );
}

export function SkeletonFolderCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <SkeletonBox width="24px" height="24px" />
          <div className="flex-1 space-y-1">
            <SkeletonText lines={1} />
            <SkeletonBox width="60px" height="16px" />
          </div>
        </div>
        <div className="flex gap-1">
          <SkeletonBox width="32px" height="32px" />
          <SkeletonBox width="32px" height="32px" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, type = 'item' }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {type === 'folder' ? <SkeletonFolderCard /> : <SkeletonCard />}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 8 }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
          <SkeletonBox width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <SkeletonText lines={1} />
            <SkeletonBox width="120px" height="16px" />
          </div>
          <div className="flex gap-2">
            <SkeletonBox width="32px" height="32px" />
            <SkeletonBox width="32px" height="32px" />
            <SkeletonBox width="32px" height="32px" />
          </div>
        </div>
      ))}
    </div>
  );
}