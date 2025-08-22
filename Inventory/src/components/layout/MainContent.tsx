import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Toolbar,
  Button,
  Menu,
  MenuItem,
  Chip,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ClearIcon from '@mui/icons-material/Clear';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import { useAppState, useAppDispatch } from '../../contexts/AppContext';
import { sortFiles, searchFiles, groupFiles } from '../../utils/fileUtils';
import { FileItem, ViewMode } from '../../types';
import FileGrid from '../files/FileGrid';
import FileList from '../files/FileList';
import EmptyState from '../common/EmptyState';
import FileDropzone from '../files/FileDropzone';

const MainContent: React.FC = () => {
  const location = useLocation();
  const { 
    files, 
    folders, 
    currentFolder, 
    selectedFiles, 
    viewMode, 
    searchOptions, 
    filterOptions 
  } = useAppState();
  const dispatch = useAppDispatch();

  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [showDropzone, setShowDropzone] = useState(false);

  // Filter and search files
  const filteredFiles = useMemo(() => {
    let result = files;

    // Filter by current folder
    if (currentFolder) {
      result = result.filter(file => file.folderId === currentFolder);
    } else {
      result = result.filter(file => !file.folderId);
    }

    // Apply search filter
    if (searchOptions.query) {
      result = searchFiles(result, searchOptions.query, {
        includeMetadata: searchOptions.includeMetadata,
        caseSensitive: searchOptions.caseSensitive,
      });
    }

    // Apply type filters
    if (searchOptions.fileTypes.length > 0) {
      result = result.filter(file => searchOptions.fileTypes.includes(file.type));
    }

    // Apply quick filters
    if (filterOptions.favorites) {
      result = result.filter(file => file.isFavorite);
    }

    if (filterOptions.recent) {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      result = result.filter(file => file.modifiedAt > dayAgo);
    }

    if (filterOptions.encrypted) {
      result = result.filter(file => file.isEncrypted);
    }

    // Apply date range filter
    if (searchOptions.dateRange) {
      const { start, end } = searchOptions.dateRange;
      result = result.filter(file => 
        file.modifiedAt >= start && file.modifiedAt <= end
      );
    }

    // Apply size filter
    if (searchOptions.sizeRange) {
      const { min, max } = searchOptions.sizeRange;
      result = result.filter(file => 
        file.size >= min && file.size <= max
      );
    }

    // Sort files
    result = sortFiles(result, viewMode.sortBy, viewMode.sortOrder);

    return result;
  }, [files, currentFolder, searchOptions, filterOptions, viewMode.sortBy, viewMode.sortOrder]);

  // Group files if needed
  const groupedFiles = useMemo(() => {
    if (viewMode.groupBy) {
      return groupFiles(filteredFiles, viewMode.groupBy);
    }
    return { 'All Files': filteredFiles };
  }, [filteredFiles, viewMode.groupBy]);

  // Get current folder info
  const currentFolderInfo = currentFolder 
    ? folders.find(f => f.id === currentFolder)
    : null;

  const handleViewModeChange = (mode: ViewMode['type']) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: { type: mode } });
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortChange = (sortBy: string) => {
    const newOrder = viewMode.sortBy === sortBy && viewMode.sortOrder === 'asc' 
      ? 'desc' : 'asc';
    dispatch({
      type: 'SET_VIEW_MODE',
      payload: { sortBy, sortOrder: newOrder }
    });
    handleSortClose();
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      dispatch({ type: 'CLEAR_SELECTED_FILES' });
    } else {
      dispatch({ 
        type: 'SET_SELECTED_FILES', 
        payload: filteredFiles.map(f => f.id) 
      });
    }
  };

  const handleClearFilters = () => {
    dispatch({ type: 'CLEAR_SEARCH' });
    dispatch({ 
      type: 'SET_FILTER_OPTIONS', 
      payload: { favorites: false, recent: false, encrypted: false, shared: false } 
    });
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/search':
        return 'Search Results';
      case '/favorites':
        return 'Favorites';
      case '/recent':
        return 'Recent Files';
      case '/settings':
        return 'Settings';
      default:
        return currentFolderInfo?.name || 'All Files';
    }
  };

  const hasActiveFilters = searchOptions.query || 
    searchOptions.fileTypes.length > 0 || 
    filterOptions.favorites || 
    filterOptions.recent || 
    filterOptions.encrypted;

  const renderFileView = (files: FileItem[], groupName?: string) => {
    const commonProps = {
      files,
      viewMode: viewMode.type,
      selectedFiles,
      onFileSelect: (fileId: string) => 
        dispatch({ type: 'TOGGLE_SELECTED_FILE', payload: fileId }),
      onFileDoubleClick: (fileId: string) => {
        // Handle file preview/open
        console.log('Open file:', fileId);
      },
    };

    switch (viewMode.type) {
      case 'list':
        return <FileList {...commonProps} />;
      case 'grid':
      case 'masonry':
      default:
        return <FileGrid {...commonProps} />;
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header Toolbar */}
      <Toolbar
        variant="dense"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          minHeight: 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* Page Title */}
          <Typography variant="h6" sx={{ mr: 2, fontWeight: 600 }}>
            {getPageTitle()}
          </Typography>

          {/* File Count */}
          <Chip
            label={`${filteredFiles.length} ${filteredFiles.length === 1 ? 'file' : 'files'}`}
            size="small"
            variant="outlined"
            sx={{ mr: 2 }}
          />

          {/* Active Filters */}
          {hasActiveFilters && (
            <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
              {searchOptions.query && (
                <Chip
                  label={`Search: ${searchOptions.query}`}
                  size="small"
                  onDelete={() => dispatch({ 
                    type: 'SET_SEARCH_OPTIONS', 
                    payload: { query: '' } 
                  })}
                />
              )}
              {filterOptions.favorites && (
                <Chip
                  label="Favorites"
                  size="small"
                  color="primary"
                  onDelete={() => dispatch({ 
                    type: 'SET_FILTER_OPTIONS', 
                    payload: { favorites: false } 
                  })}
                />
              )}
              {filterOptions.recent && (
                <Chip
                  label="Recent"
                  size="small"
                  color="secondary"
                  onDelete={() => dispatch({ 
                    type: 'SET_FILTER_OPTIONS', 
                    payload: { recent: false } 
                  })}
                />
              )}
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Select All */}
            {filteredFiles.length > 0 && (
              <IconButton onClick={handleSelectAll} size="small">
                <SelectAllIcon />
              </IconButton>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                size="small"
              >
                Clear Filters
              </Button>
            )}

            {/* Upload Files */}
            <Button
              startIcon={<CloudUploadIcon />}
              variant="contained"
              onClick={() => setShowDropzone(true)}
              size="small"
            >
              Upload
            </Button>

            {/* Create Folder */}
            <Button
              startIcon={<FolderIcon />}
              variant="outlined"
              size="small"
            >
              New Folder
            </Button>

            {/* Sort Menu */}
            <IconButton onClick={handleSortClick} size="small">
              <SortIcon />
            </IconButton>

            {/* View Mode Toggles */}
            <Box sx={{ display: 'flex', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleViewModeChange('list')}
                sx={{
                  borderRadius: 0,
                  backgroundColor: viewMode.type === 'list' ? 'action.selected' : 'transparent',
                }}
              >
                <ViewListIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleViewModeChange('grid')}
                sx={{
                  borderRadius: 0,
                  backgroundColor: viewMode.type === 'grid' ? 'action.selected' : 'transparent',
                }}
              >
                <ViewModuleIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleViewModeChange('masonry')}
                sx={{
                  borderRadius: 0,
                  backgroundColor: viewMode.type === 'masonry' ? 'action.selected' : 'transparent',
                }}
              >
                <ViewComfyIcon />
              </IconButton>
            </Box>
          </Stack>
        </Box>
      </Toolbar>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleSortClose}
      >
        {[
          { key: 'name', label: 'Name' },
          { key: 'date', label: 'Date Modified' },
          { key: 'size', label: 'Size' },
          { key: 'type', label: 'Type' },
        ].map(option => (
          <MenuItem
            key={option.key}
            onClick={() => handleSortChange(option.key)}
            selected={viewMode.sortBy === option.key}
          >
            {option.label}
            {viewMode.sortBy === option.key && (
              <Typography variant="caption" sx={{ ml: 1 }}>
                ({viewMode.sortOrder === 'asc' ? '↑' : '↓'})
              </Typography>
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {filteredFiles.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState
                title={hasActiveFilters ? "No files match your filters" : "No files yet"}
                description={
                  hasActiveFilters 
                    ? "Try adjusting your search or filter criteria"
                    : "Upload some files to get started"
                }
                action={
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setShowDropzone(true)}
                  >
                    Upload Files
                  </Button>
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {Object.entries(groupedFiles).map(([groupName, groupFiles]) => (
                <Box key={groupName}>
                  {viewMode.groupBy && Object.keys(groupedFiles).length > 1 && (
                    <Typography
                      variant="h6"
                      sx={{
                        px: 3,
                        py: 2,
                        backgroundColor: 'background.default',
                        borderBottom: 1,
                        borderColor: 'divider',
                        fontWeight: 600,
                      }}
                    >
                      {groupName}
                    </Typography>
                  )}
                  {renderFileView(groupFiles, groupName)}
                </Box>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* File Upload Dropzone */}
      <FileDropzone
        open={showDropzone}
        onClose={() => setShowDropzone(false)}
        onFilesUploaded={(files) => {
          // Handle file upload
          console.log('Files uploaded:', files);
          setShowDropzone(false);
        }}
      />
    </Box>
  );
};

export default MainContent;