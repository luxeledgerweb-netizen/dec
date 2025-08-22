import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  IconButton,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import { motion } from 'framer-motion';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { FileItem, ViewMode } from '../../types';
import { formatFileSize } from '../../utils/fileUtils';
import { format } from 'date-fns';

interface FileListProps {
  files: FileItem[];
  viewMode: ViewMode['type'];
  selectedFiles: string[];
  onFileSelect: (fileId: string) => void;
  onFileDoubleClick: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onFileDoubleClick,
}) => {
  const getFileIcon = (file: FileItem) => {
    if (file.type === 'image') return '🖼️';
    if (file.type === 'video') return '🎥';
    if (file.type === 'document') return '📄';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'archive') return '📦';
    return '📁';
  };

  return (
    <List sx={{ p: 1 }}>
      {files.map((file, index) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03, duration: 0.3 }}
        >
          <ListItem
            sx={{
              borderRadius: 1,
              mb: 0.5,
              border: selectedFiles.includes(file.id) ? 1 : 0,
              borderColor: 'primary.main',
              backgroundColor: selectedFiles.includes(file.id) 
                ? 'action.selected' 
                : 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              cursor: 'pointer',
            }}
            onClick={() => onFileSelect(file.id)}
            onDoubleClick={() => onFileDoubleClick(file.id)}
          >
            <ListItemIcon>
              <Checkbox
                checked={selectedFiles.includes(file.id)}
                onChange={() => onFileSelect(file.id)}
                edge="start"
              />
            </ListItemIcon>

            <ListItemIcon>
              {file.thumbnailPath ? (
                <Avatar
                  src={file.thumbnailPath}
                  alt={file.name}
                  variant="rounded"
                  sx={{ width: 40, height: 40 }}
                />
              ) : (
                <Avatar
                  variant="rounded"
                  sx={{ 
                    width: 40, 
                    height: 40,
                    backgroundColor: 'transparent',
                    fontSize: 24,
                  }}
                >
                  {getFileIcon(file)}
                </Avatar>
              )}
            </ListItemIcon>

            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: selectedFiles.includes(file.id) ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                    }}
                  >
                    {file.name}
                  </Typography>
                  {file.isEncrypted && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'primary.main',
                        fontWeight: 'medium',
                        px: 1,
                        py: 0.25,
                        backgroundColor: 'primary.light',
                        borderRadius: 0.5,
                      }}
                    >
                      🔒
                    </Typography>
                  )}
                  {file.isFavorite && (
                    <FavoriteIcon sx={{ color: 'error.main', fontSize: 16 }} />
                  )}
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {file.type}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(file.modifiedAt, 'MMM dd, yyyy')}
                  </Typography>
                  {file.tags.length > 0 && (
                    <Typography variant="caption" color="primary.main">
                      {file.tags.slice(0, 2).join(', ')}
                      {file.tags.length > 2 && ` +${file.tags.length - 2}`}
                    </Typography>
                  )}
                </Box>
              }
            />

            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle context menu
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        </motion.div>
      ))}
    </List>
  );
};

export default FileList;