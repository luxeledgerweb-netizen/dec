import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Switch,
  Slider,
  Alert,
  Chip,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { FileItem, ImportOptions } from '../../types';
import { createFileItem, formatFileSize, validateFile } from '../../utils/fileUtils';
import { useAppDispatch } from '../../contexts/AppContext';

interface FileDropzoneProps {
  open: boolean;
  onClose: () => void;
  onFilesUploaded: (files: FileItem[]) => void;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  fileItem?: FileItem;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  open,
  onClose,
  onFilesUploaded,
}) => {
  const dispatch = useAppDispatch();
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [progress, setProgress] = useState(0);
  
  const [options, setOptions] = useState<ImportOptions>({
    preserveStructure: true,
    encryptFiles: false,
    generateThumbnails: true,
    extractMetadata: true,
    duplicateHandling: 'rename',
    compressionLevel: 5,
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: FileUploadState[] = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB max per file
  });

  const processFiles = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    const processedFiles: FileItem[] = [];
    const totalFiles = uploadedFiles.length;
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const fileState = uploadedFiles[i];
      setCurrentFile(fileState.file.name);
      
      try {
        // Validate file
        const validation = validateFile(fileState.file, 100 * 1024 * 1024); // 100MB max
        if (!validation.valid) {
          setUploadedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error', error: validation.error } : f
          ));
          continue;
        }
        
        // Update status
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'processing' } : f
        ));
        
        // Create file item with metadata extraction
        const fileItem = await createFileItem(fileState.file);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update success status
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success', fileItem } : f
        ));
        
        processedFiles.push(fileItem);
        
      } catch (error) {
        setUploadedFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Processing failed'
          } : f
        ));
      }
      
      setProgress(((i + 1) / totalFiles) * 100);
    }
    
    setIsProcessing(false);
    setCurrentFile('');
    
    if (processedFiles.length > 0) {
      // Add files to app state
      dispatch({ type: 'ADD_FILES', payload: processedFiles });
      onFilesUploaded(processedFiles);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setProgress(0);
    setCurrentFile('');
  };

  const handleClose = () => {
    if (!isProcessing) {
      clearAll();
      onClose();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type === 'application/pdf') return '📄';
    return '📁';
  };

  const getStatusColor = (status: FileUploadState['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'processing': return 'info';
      default: return 'default';
    }
  };

  const canProcess = uploadedFiles.length > 0 && !isProcessing;
  const successCount = uploadedFiles.filter(f => f.status === 'success').length;
  const errorCount = uploadedFiles.filter(f => f.status === 'error').length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600 }
      }}
    >
      <DialogTitle>
        Upload Files
        {uploadedFiles.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {uploadedFiles.length} files selected
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {/* Dropzone */}
        <Box
          {...getRootProps()}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: isDragActive ? 'primary.main' : 
                        isDragReject ? 'error.main' : 'divider',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? 'action.hover' : 'transparent',
            transition: 'all 0.3s ease',
            mb: 3,
          }}
          className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''}`}
        >
          <input {...getInputProps()} />
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: isDragActive ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <CloudUploadIcon
              sx={{
                fontSize: 48,
                color: isDragReject ? 'error.main' : 'primary.main',
                mb: 2,
              }}
            />
            <Typography variant="h6" gutterBottom>
              {isDragActive
                ? 'Drop files here...'
                : 'Drag & drop files here, or click to select'
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports images, videos, documents, and more (max 100MB per file)
            </Typography>
          </motion.div>
        </Box>

        {/* Upload Options */}
        {uploadedFiles.length > 0 && (
          <Box sx={{ mb: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Import Options
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={options.generateThumbnails}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      generateThumbnails: e.target.checked
                    }))}
                  />
                }
                label="Generate thumbnails"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={options.extractMetadata}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      extractMetadata: e.target.checked
                    }))}
                  />
                }
                label="Extract metadata"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={options.encryptFiles}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      encryptFiles: e.target.checked
                    }))}
                  />
                }
                label="Encrypt files"
              />
              <Box>
                <Typography variant="body2" gutterBottom>
                  Compression Level: {options.compressionLevel}
                </Typography>
                <Slider
                  value={options.compressionLevel}
                  onChange={(_, value) => setOptions(prev => ({
                    ...prev,
                    compressionLevel: value as number
                  }))}
                  min={0}
                  max={9}
                  marks
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Files to Upload
              </Typography>
              <Button onClick={clearAll} disabled={isProcessing}>
                Clear All
              </Button>
            </Box>

            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              <AnimatePresence>
                {uploadedFiles.map((fileState, index) => (
                  <motion.div
                    key={`${fileState.file.name}-${index}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ListItem
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                      secondaryAction={
                        !isProcessing && (
                          <Button
                            size="small"
                            onClick={() => removeFile(index)}
                            color="error"
                          >
                            Remove
                          </Button>
                        )
                      }
                    >
                      <ListItemIcon>
                        <Typography sx={{ fontSize: 24 }}>
                          {getFileIcon(fileState.file)}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={fileState.file.name}
                        secondary={formatFileSize(fileState.file.size)}
                      />
                      <Chip
                        label={fileState.status}
                        color={getStatusColor(fileState.status)}
                        size="small"
                        icon={
                          fileState.status === 'success' ? <CheckCircleIcon /> :
                          fileState.status === 'error' ? <ErrorIcon /> : undefined
                        }
                      />
                    </ListItem>
                    {fileState.error && (
                      <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                        {fileState.error}
                      </Alert>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>

            {/* Progress */}
            {isProcessing && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Processing: {currentFile}
                  </Typography>
                  <Typography variant="body2">
                    {Math.round(progress)}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            )}

            {/* Summary */}
            {!isProcessing && (successCount > 0 || errorCount > 0) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                {successCount > 0 && (
                  <Chip
                    label={`${successCount} successful`}
                    color="success"
                    size="small"
                  />
                )}
                {errorCount > 0 && (
                  <Chip
                    label={`${errorCount} failed`}
                    color="error"
                    size="small"
                  />
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isProcessing}>
          {successCount > 0 ? 'Done' : 'Cancel'}
        </Button>
        {uploadedFiles.length > 0 && successCount === 0 && (
          <Button
            variant="contained"
            onClick={processFiles}
            disabled={!canProcess}
            startIcon={<CloudUploadIcon />}
          >
            {isProcessing ? 'Uploading...' : 'Upload Files'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FileDropzone;