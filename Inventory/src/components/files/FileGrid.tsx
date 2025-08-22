import React from 'react';
import { Box, Grid, Card, CardMedia, CardContent, Typography, Checkbox, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { FileItem, ViewMode } from '../../types';
import { formatFileSize } from '../../utils/fileUtils';

interface FileGridProps {
  files: FileItem[];
  viewMode: ViewMode['type'];
  selectedFiles: string[];
  onFileSelect: (fileId: string) => void;
  onFileDoubleClick: (fileId: string) => void;
}

const FileGrid: React.FC<FileGridProps> = ({
  files,
  viewMode,
  selectedFiles,
  onFileSelect,
  onFileDoubleClick,
}) => {
  const getGridColumns = () => {
    switch (viewMode) {
      case 'masonry':
        return 'repeat(auto-fill, minmax(200px, 1fr))';
      default:
        return 'repeat(auto-fill, minmax(180px, 1fr))';
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'image') return '🖼️';
    if (file.type === 'video') return '🎥';
    if (file.type === 'document') return '📄';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'archive') return '📦';
    return '📁';
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'grid',
        gridTemplateColumns: getGridColumns(),
        gap: 2,
      }}
    >
      {files.map((file, index) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: selectedFiles.includes(file.id) ? 2 : 1,
              borderColor: selectedFiles.includes(file.id) ? 'primary.main' : 'divider',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
            onClick={() => onFileSelect(file.id)}
            onDoubleClick={() => onFileDoubleClick(file.id)}
          >
            {/* Thumbnail or Icon */}
            <Box
              sx={{
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.100',
                position: 'relative',
              }}
            >
              {file.thumbnailPath ? (
                <CardMedia
                  component="img"
                  image={file.thumbnailPath}
                  alt={file.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Typography sx={{ fontSize: 48 }}>
                  {getFileIcon(file)}
                </Typography>
              )}

              {/* Selection Checkbox */}
              <Checkbox
                checked={selectedFiles.includes(file.id)}
                onChange={() => onFileSelect(file.id)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
              />

              {/* Favorite Icon */}
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
              >
                {file.isFavorite ? (
                  <FavoriteIcon sx={{ color: 'error.main' }} />
                ) : (
                  <FavoriteBorderIcon />
                )}
              </IconButton>
            </Box>

            <CardContent sx={{ p: 2 }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  mb: 0.5,
                }}
                title={file.name}
              >
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(file.size)}
              </Typography>
              {file.isEncrypted && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: 'primary.main',
                    fontWeight: 'medium',
                  }}
                >
                  🔒 Encrypted
                </Typography>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </Box>
  );
};

export default FileGrid;