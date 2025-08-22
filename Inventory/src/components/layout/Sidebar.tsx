import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Badge,
  Tooltip,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import ArchiveIcon from '@mui/icons-material/Archive';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useAppState, useAppDispatch } from '../../contexts/AppContext';
import { FileType } from '../../types';

const DRAWER_WIDTH = 280;

const fileTypeIcons: Record<FileType, React.ReactElement> = {
  image: <ImageIcon />,
  video: <VideoLibraryIcon />,
  document: <PictureAsPdfIcon />,
  audio: <AudioFileIcon />,
  archive: <ArchiveIcon />,
  other: <InsertDriveFileIcon />,
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { files, folders, currentFolder, filterOptions } = useAppState();
  const dispatch = useAppDispatch();
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [typesExpanded, setTypesExpanded] = useState(true);

  // Calculate file counts by type
  const fileTypeCounts = files.reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {} as Record<FileType, number>);

  const favoritesCount = files.filter(file => file.isFavorite).length;
  const recentCount = files.filter(file => {
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return file.modifiedAt > dayAgo;
  }).length;

  const handleFolderClick = (folderId: string | null) => {
    dispatch({ type: 'SET_CURRENT_FOLDER', payload: folderId });
    navigate('/vault');
  };

  const handleQuickFilterClick = (path: string, filterType?: keyof typeof filterOptions) => {
    if (filterType) {
      dispatch({
        type: 'SET_FILTER_OPTIONS',
        payload: {
          ...filterOptions,
          [filterType]: !filterOptions[filterType]
        }
      });
    }
    navigate(path);
  };

  const handleFileTypeFilter = (fileType: FileType) => {
    const currentTypes = new Set(filterOptions.fileTypes || []);
    if (currentTypes.has(fileType)) {
      currentTypes.delete(fileType);
    } else {
      currentTypes.add(fileType);
    }
    
    dispatch({
      type: 'SET_SEARCH_OPTIONS',
      payload: { fileTypes: Array.from(currentTypes) }
    });
    navigate('/vault');
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    {
      text: 'All Files',
      icon: <FolderIcon />,
      path: '/vault',
      onClick: () => handleFolderClick(null),
      count: files.length,
    },
    {
      text: 'Search',
      icon: <SearchIcon />,
      path: '/search',
      onClick: () => navigate('/search'),
    },
    {
      text: 'Favorites',
      icon: <FavoriteIcon />,
      path: '/favorites',
      onClick: () => handleQuickFilterClick('/favorites', 'favorites'),
      count: favoritesCount,
    },
    {
      text: 'Recent',
      icon: <HistoryIcon />,
      path: '/recent',
      onClick: () => handleQuickFilterClick('/recent', 'recent'),
      count: recentCount,
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          position: 'static',
          height: '100%',
          borderRight: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', height: '100%' }}>
        {/* Quick Actions */}
        <Box sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary" fontWeight="bold">
            Quick Actions
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Tooltip title="Import Files">
              <IconButton
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <CloudUploadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Files">
              <IconButton
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <CloudDownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Create Folder">
              <IconButton
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider />

        {/* Main Navigation */}
        <List sx={{ px: 1, py: 2 }}>
          {menuItems.map((item, index) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive(item.path)}
                  onClick={item.onClick}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive(item.path) ? 600 : 400,
                    }}
                  />
                  {item.count !== undefined && item.count > 0 && (
                    <Chip
                      label={item.count}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        backgroundColor: isActive(item.path)
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'action.hover',
                        color: isActive(item.path) ? 'inherit' : 'text.secondary',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </motion.div>
          ))}
        </List>

        <Divider />

        {/* Folders Section */}
        <Box sx={{ px: 2, py: 1 }}>
          <ListItemButton
            onClick={() => setFoldersExpanded(!foldersExpanded)}
            sx={{ borderRadius: 1, px: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <FolderIcon />
            </ListItemIcon>
            <ListItemText
              primary="Folders"
              primaryTypographyProps={{
                variant: 'overline',
                fontWeight: 'bold',
                color: 'text.secondary',
              }}
            />
            {foldersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={foldersExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <AnimatePresence>
                {folders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ListItemButton
                      selected={currentFolder === folder.id}
                      onClick={() => handleFolderClick(folder.id)}
                      sx={{
                        pl: 4,
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {currentFolder === folder.id ? (
                          <FolderOpenIcon color="primary" />
                        ) : (
                          <FolderIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={folder.name}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: currentFolder === folder.id ? 600 : 400,
                        }}
                      />
                      {folder.fileCount > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          {folder.fileCount}
                        </Typography>
                      )}
                    </ListItemButton>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {folders.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ pl: 4, py: 1, fontStyle: 'italic' }}
                >
                  No folders yet
                </Typography>
              )}
            </List>
          </Collapse>
        </Box>

        <Divider />

        {/* File Types Section */}
        <Box sx={{ px: 2, py: 1 }}>
          <ListItemButton
            onClick={() => setTypesExpanded(!typesExpanded)}
            sx={{ borderRadius: 1, px: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <InsertDriveFileIcon />
            </ListItemIcon>
            <ListItemText
              primary="File Types"
              primaryTypographyProps={{
                variant: 'overline',
                fontWeight: 'bold',
                color: 'text.secondary',
              }}
            />
            {typesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={typesExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {Object.entries(fileTypeIcons).map(([type, icon]) => {
                const count = fileTypeCounts[type as FileType] || 0;
                if (count === 0) return null;

                return (
                  <ListItemButton
                    key={type}
                    onClick={() => handleFileTypeFilter(type as FileType)}
                    sx={{
                      pl: 4,
                      borderRadius: 1,
                      mx: 1,
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={type.charAt(0).toUpperCase() + type.slice(1)}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                      }}
                    />
                    <Badge
                      badgeContent={count}
                      color="primary"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '0.625rem',
                          height: 16,
                          minWidth: 16,
                        },
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;