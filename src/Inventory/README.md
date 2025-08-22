# Inventory UI - MaxVault Style Refresh

A modern, accessible inventory management interface inspired by MaxVault iOS design patterns.

## Overview

This refresh transforms the inventory system with a clean, intuitive interface featuring:

- **Smart Filtering**: Favorites, recent items, file types, and tag-based filters
- **Flexible Views**: Large tiles, compact grid, and detailed list layouts
- **Enhanced Search**: Fuzzy matching with highlighting and auto-suggestions
- **Rich File Types**: Visual badges and icons for different content types
- **Accessibility**: Full keyboard navigation and screen reader support
- **Toast Notifications**: Contextual feedback for all operations

## Components Added/Updated

### Core UI Components (`src/Inventory/ui/`)

- **`SearchBar.jsx`** - Enhanced search with fuzzy matching and suggestions
- **`FilterChips.jsx`** - Smart filter system with file type and tag filtering
- **`ViewToggle.jsx`** - Toggle between list, grid, and large tile views
- **`FileTypeIcon.jsx`** - File type detection with visual badges and icons
- **`SkeletonLoader.jsx`** - Loading states with smooth animations
- **`Toast.jsx`** - Notification system for user feedback

### Utility Functions (`src/Inventory/utils/`)

- **`fileTypes.js`** - File type detection and categorization
- **`search.js`** - Fuzzy search and text highlighting utilities
- **`sorting.js`** - Multi-criteria sorting (name, date, size, type)

### Custom Hooks (`src/Inventory/hooks/`)

- **`useFavorites.js`** - Persistent favorites management
- **`useToast.js`** - Toast notification system

### Enhanced Main Component

- **`InventoryPage.jsx`** - Completely refreshed with MaxVault-style interface
- **`InventoryPageEnhanced.jsx`** - Development version (can be removed after testing)

### Styling & Tests

- **`styles/inventory.css`** - Local CSS with animations and responsive design
- **`__tests__/`** - Lightweight unit tests for core utilities

## Features

### 🔍 Smart Search & Filtering

```javascript
// Search across titles, notes, and tags with fuzzy matching
const results = searchItems(items, 'js tutorial', {
  searchFields: ['title', 'notes', 'tags'],
  threshold: 0.1
});

// Filter by file type, favorites, recent items
const filters = [
  createFilter.favorites(),
  createFilter.fileType(FILE_TYPES.IMAGE),
  createFilter.recent(7) // last 7 days
];
```

### 📁 File Type Detection

```javascript
// Automatically detect file types from names or MIME types
const fileType = getFileType('document.pdf', 'application/pdf');
// Returns: FILE_TYPES.PDF

// Get all file types in an item
const types = getItemFileTypes(item, attachedFiles);
// Returns: [FILE_TYPES.IMAGE, FILE_TYPES.PDF]
```

### 🎨 Flexible View Modes

- **Large Tiles**: Prominent previews with spacious layout
- **Grid View**: Compact cards for dense information
- **List View**: Detailed rows with metadata

### ⭐ Favorites System

Items can be marked as favorites with persistent localStorage storage:

```javascript
const { toggleFavorite, isFavorite } = useFavorites();

// Toggle favorite status
toggleFavorite(itemId);

// Check if item is favorited
const favorited = isFavorite(itemId);
```

### 🔔 Toast Notifications

Contextual feedback for all operations:

```javascript
const { success, error, warning, info } = useToast();

success('Item created successfully');
error('Failed to delete item');
```

## Demo States & Testing

### Development Commands

```bash
# Run tests
npm test src/Inventory/__tests__/

# Test specific utilities
npm test fileTypes.test.js
npm test search.test.js
```

### Demo Data States

To test different UI states, you can use these scenarios:

1. **Empty State**: Clear all items and folders
2. **Loading State**: Implemented with skeleton loaders
3. **Search Results**: Search for partial terms like "js" or "doc"
4. **Filtered View**: Use file type chips to filter by images/PDFs
5. **Favorites**: Mark several items as favorites and use favorites filter
6. **Mixed Content**: Create items with different file types and view modes

### Testing File Types

Create test items with these file attachments to see type detection:

- Images: `.jpg`, `.png`, `.svg`, `.webp`
- Documents: `.pdf`, `.doc`, `.txt`
- Media: `.mp4`, `.mp3`, `.wav`
- Archives: `.zip`, `.tar`, `.7z`
- Code: `.js`, `.jsx`, `.css`, `.json`

## Accessibility Features

### Keyboard Navigation

- **Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons and toggle filters
- **Escape**: Close modals and dropdowns
- **Arrow Keys**: Navigate within filter chips and suggestions

### Screen Reader Support

- ARIA labels for all interactive elements
- Role attributes for complex widgets
- Live regions for dynamic content updates
- Semantic HTML structure

### Visual Accessibility

- High contrast mode support
- Reduced motion preferences
- Focus indicators
- Color-blind friendly file type colors

## Browser Compatibility

- Modern browsers with ES2020+ support
- Responsive design for mobile/tablet/desktop
- Touch-friendly tap targets
- Graceful degradation for older browsers

## File Structure

```
src/Inventory/
├── README.md                    # This documentation
├── InventoryPage.jsx           # Enhanced main component
├── InventoryHome.tsx           # Original simple component
├── components/                 # Original modal components
│   ├── AddInventoryItemModal.jsx
│   ├── AddFolderModal.jsx
│   ├── ImportExportPanel.jsx
│   ├── ItemPreviewModal.jsx
│   └── MoveDialog.jsx
├── ui/                        # New MaxVault-style components
│   ├── SearchBar.jsx
│   ├── FilterChips.jsx
│   ├── ViewToggle.jsx
│   ├── FileTypeIcon.jsx
│   ├── SkeletonLoader.jsx
│   └── Toast.jsx
├── utils/                     # Enhanced utilities
│   ├── fileTypes.js
│   ├── search.js
│   ├── sorting.js
│   └── images.js              # Original utility
├── hooks/                     # Custom React hooks
│   ├── useFavorites.js
│   └── useToast.js
├── styles/                    # Local styling
│   └── inventory.css
├── __tests__/                 # Unit tests
│   ├── fileTypes.test.js
│   └── search.test.js
├── storage/                   # Original storage
│   └── blobStore.js
├── db.js                      # Original database layer
├── inventory.store.ts         # Original store (alternative)
├── inventory.types.ts         # Original types (alternative)
└── types.js                   # Original type utilities
```

## Local Utility Wrappers

Several utility functions were created locally to avoid modifying external dependencies:

- **File Type Detection**: Local implementation instead of using external mime-type libraries
- **Fuzzy Search**: Custom algorithm instead of fuse.js or similar
- **Sorting**: Multi-criteria sorting specific to inventory needs
- **Toast System**: Lightweight alternative to external notification libraries

## Performance Notes

- **Lazy Loading**: Components render progressively
- **Memoization**: Search and filter results are cached
- **Debounced Search**: Search queries are debounced to reduce computation
- **Virtual Scrolling**: Not implemented but recommended for large datasets
- **File Caching**: Item files are cached during session for better performance

## Future Enhancements

- Drag & drop for file uploads and item organization
- Bulk operations (select multiple items)
- Advanced search with date ranges and size filters
- Export filtered results
- Keyboard shortcuts for power users
- Dark mode theme support
- Offline support with service worker