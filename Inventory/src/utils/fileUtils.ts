import { FileItem, FileType, FileMetadata } from '../types';

// File type detection
export const getFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/rtf',
    'application/rtf'
  ];
  
  if (documentTypes.includes(mimeType)) return 'document';
  
  const archiveTypes = [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip'
  ];
  
  if (archiveTypes.includes(mimeType)) return 'archive';
  
  return 'other';
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

// Generate unique file ID
export const generateFileId = (): string => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate unique folder ID
export const generateFolderId = (): string => {
  return `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate file checksum (simple hash)
export const calculateChecksum = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Extract metadata from files
export const extractMetadata = async (file: File): Promise<FileMetadata> => {
  const metadata: FileMetadata = {};
  
  if (file.type.startsWith('image/')) {
    return extractImageMetadata(file);
  } else if (file.type.startsWith('video/')) {
    return extractVideoMetadata(file);
  } else if (file.type === 'application/pdf') {
    return extractPDFMetadata(file);
  }
  
  return metadata;
};

// Extract image metadata
const extractImageMetadata = async (file: File): Promise<FileMetadata> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const metadata: FileMetadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type.split('/')[1].toUpperCase()
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    
    img.src = url;
  });
};

// Extract video metadata
const extractVideoMetadata = async (file: File): Promise<FileMetadata> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      const metadata: FileMetadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        format: file.type.split('/')[1].toUpperCase()
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    
    video.src = url;
  });
};

// Extract PDF metadata (basic)
const extractPDFMetadata = async (file: File): Promise<FileMetadata> => {
  // This is a simplified version - in a real app you might use PDF.js
  const metadata: FileMetadata = {
    format: 'PDF'
  };
  
  try {
    const text = await file.text();
    // Try to extract basic PDF info from headers
    const creator = text.match(/\/Creator\s*\((.*?)\)/)?.[1];
    const title = text.match(/\/Title\s*\((.*?)\)/)?.[1];
    const author = text.match(/\/Author\s*\((.*?)\)/)?.[1];
    
    if (creator) metadata.creator = creator;
    if (title) metadata.title = title;
    if (author) metadata.author = author;
  } catch (error) {
    console.warn('Failed to extract PDF metadata:', error);
  }
  
  return metadata;
};

// Generate thumbnail for supported file types
export const generateThumbnail = async (file: File, maxSize: number = 300): Promise<string | null> => {
  if (file.type.startsWith('image/')) {
    return generateImageThumbnail(file, maxSize);
  } else if (file.type.startsWith('video/')) {
    return generateVideoThumbnail(file, maxSize);
  }
  return null;
};

// Generate image thumbnail
const generateImageThumbnail = async (file: File, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      const { width, height } = img;
      const ratio = Math.min(maxSize / width, maxSize / height);
      
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Generate video thumbnail (first frame)
const generateVideoThumbnail = async (file: File, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    video.onloadeddata = () => {
      const { videoWidth, videoHeight } = video;
      const ratio = Math.min(maxSize / videoWidth, maxSize / videoHeight);
      
      canvas.width = videoWidth * ratio;
      canvas.height = videoHeight * ratio;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    video.currentTime = 1; // Seek to 1 second
    video.src = URL.createObjectURL(file);
  });
};

// File validation
export const validateFile = (file: File, maxSize?: number, allowedTypes?: string[]): { valid: boolean; error?: string } => {
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
    };
  }
  
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  return { valid: true };
};

// Create FileItem from File
export const createFileItem = async (file: File, folderId?: string): Promise<FileItem> => {
  const id = generateFileId();
  const metadata = await extractMetadata(file);
  const checksum = await calculateChecksum(file);
  const thumbnailPath = await generateThumbnail(file);
  
  return {
    id,
    name: file.name,
    originalName: file.name,
    type: getFileType(file.type),
    mimeType: file.type,
    size: file.size,
    createdAt: new Date(),
    modifiedAt: new Date(),
    thumbnailPath: thumbnailPath || undefined,
    tags: [],
    isFavorite: false,
    isEncrypted: false,
    folderId,
    metadata,
    checksum
  };
};

// File search and filtering
export const searchFiles = (files: FileItem[], query: string, options: { 
  includeMetadata?: boolean;
  caseSensitive?: boolean;
}): FileItem[] => {
  if (!query.trim()) return files;
  
  const searchTerm = options.caseSensitive ? query : query.toLowerCase();
  
  return files.filter(file => {
    const fileName = options.caseSensitive ? file.name : file.name.toLowerCase();
    const tags = file.tags.map(tag => options.caseSensitive ? tag : tag.toLowerCase());
    
    // Search in file name
    if (fileName.includes(searchTerm)) return true;
    
    // Search in tags
    if (tags.some(tag => tag.includes(searchTerm))) return true;
    
    // Search in metadata if enabled
    if (options.includeMetadata && file.metadata) {
      const metadataString = JSON.stringify(file.metadata).toLowerCase();
      if (metadataString.includes(searchTerm)) return true;
    }
    
    return false;
  });
};

// Sort files
export const sortFiles = (files: FileItem[], sortBy: string, sortOrder: 'asc' | 'desc'): FileItem[] => {
  const sorted = [...files].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
};

// Group files
export const groupFiles = (files: FileItem[], groupBy: string): Record<string, FileItem[]> => {
  const groups: Record<string, FileItem[]> = {};
  
  files.forEach(file => {
    let key = 'Other';
    
    switch (groupBy) {
      case 'type':
        key = file.type.charAt(0).toUpperCase() + file.type.slice(1);
        break;
      case 'date':
        key = file.modifiedAt.toDateString();
        break;
      case 'folder':
        key = file.folderId || 'Root';
        break;
      case 'tag':
        key = file.tags.length > 0 ? file.tags[0] : 'Untagged';
        break;
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(file);
  });
  
  return groups;
};

// Duplicate detection
export const findDuplicates = (files: FileItem[]): FileItem[][] => {
  const checksumMap = new Map<string, FileItem[]>();
  
  files.forEach(file => {
    if (file.checksum) {
      if (!checksumMap.has(file.checksum)) {
        checksumMap.set(file.checksum, []);
      }
      checksumMap.get(file.checksum)!.push(file);
    }
  });
  
  return Array.from(checksumMap.values()).filter(group => group.length > 1);
};

// File operations utility
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Convert File to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Convert base64 to File
export const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
  const arr = base64.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mimeType });
};