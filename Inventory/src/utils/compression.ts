import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileItem, ImportOptions, ExportOptions } from '../types';

// Compression levels mapping
const COMPRESSION_LEVELS: Record<number, number> = {
  0: 0, // No compression
  1: 1, // Minimal compression
  2: 2,
  3: 3,
  4: 4,
  5: 5, // Default compression
  6: 6, // Good compression
  7: 7,
  8: 8,
  9: 9  // Maximum compression
};

// Supported file types for compression
const COMPRESSIBLE_TYPES = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/css',
  'application/html'
];

// Check if file type is compressible
export const isCompressible = (mimeType: string): boolean => {
  return COMPRESSIBLE_TYPES.some(type => mimeType.startsWith(type));
};

// Compress individual file
export const compressFile = async (
  file: File,
  compressionLevel: number = 5
): Promise<{ compressed: Blob; originalSize: number; compressedSize: number; ratio: number }> => {
  const zip = new JSZip();
  const level = COMPRESSION_LEVELS[compressionLevel] || 5;
  
  // Add file to zip with compression
  zip.file(file.name, file, {
    compression: 'DEFLATE',
    compressionOptions: { level }
  });
  
  // Generate compressed blob
  const compressed = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level }
  });
  
  const originalSize = file.size;
  const compressedSize = compressed.size;
  const ratio = compressedSize / originalSize;
  
  return {
    compressed,
    originalSize,
    compressedSize,
    ratio
  };
};

// Decompress file from zip
export const decompressFile = async (zipBlob: Blob): Promise<File[]> => {
  const zip = new JSZip();
  const zipData = await zip.loadAsync(zipBlob);
  const files: File[] = [];
  
  for (const [filename, zipEntry] of Object.entries(zipData.files)) {
    if (!zipEntry.dir) {
      const blob = await zipEntry.async('blob');
      const file = new File([blob], filename, {
        type: inferMimeType(filename),
        lastModified: zipEntry.date?.getTime() || Date.now()
      });
      files.push(file);
    }
  }
  
  return files;
};

// Compress multiple files into a single archive
export const compressFiles = async (
  files: File[],
  options: {
    archiveName?: string;
    compressionLevel?: number;
    preserveStructure?: boolean;
    password?: string;
  } = {}
): Promise<Blob> => {
  const {
    archiveName = 'archive.zip',
    compressionLevel = 5,
    preserveStructure = true,
    password
  } = options;
  
  const zip = new JSZip();
  const level = COMPRESSION_LEVELS[compressionLevel] || 5;
  
  // Add files to zip
  for (const file of files) {
    const path = preserveStructure ? file.name : file.name.split('/').pop() || file.name;
    
    zip.file(path, file, {
      compression: 'DEFLATE',
      compressionOptions: { level }
    });
  }
  
  // Generate zip with optional password protection
  const generateOptions: any = {
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level }
  };
  
  if (password) {
    // Note: JSZip doesn't support password protection by default
    // This would require additional libraries like jszip-password
    console.warn('Password protection not fully implemented');
  }
  
  return await zip.generateAsync(generateOptions);
};

// Export files with compression and optional encryption
export const exportFiles = async (
  files: FileItem[],
  fileDataMap: Map<string, File>,
  options: ExportOptions
): Promise<void> => {
  const {
    includeMetadata = true,
    preserveEncryption = false,
    format = 'zip',
    compressionLevel = 5,
    password
  } = options;
  
  const zip = new JSZip();
  const level = COMPRESSION_LEVELS[compressionLevel] || 5;
  
  // Create metadata file if requested
  if (includeMetadata) {
    const metadata = {
      exportDate: new Date().toISOString(),
      totalFiles: files.length,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        type: file.type,
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdAt,
        modifiedAt: file.modifiedAt,
        tags: file.tags,
        isFavorite: file.isFavorite,
        isEncrypted: file.isEncrypted,
        metadata: file.metadata,
        checksum: file.checksum
      }))
    };
    
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  }
  
  // Add files to archive
  for (const fileItem of files) {
    const fileData = fileDataMap.get(fileItem.id);
    if (fileData) {
      const filename = fileItem.originalName || fileItem.name;
      
      zip.file(filename, fileData, {
        compression: 'DEFLATE',
        compressionOptions: { level }
      });
    }
  }
  
  // Generate and download archive
  const archiveBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level }
  });
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `inventory-export-${timestamp}.${format}`;
  
  saveAs(archiveBlob, filename);
};

// Import files from archive
export const importFiles = async (
  archiveFile: File,
  options: ImportOptions
): Promise<{
  files: File[];
  metadata?: any;
  duplicates: string[];
  errors: string[];
}> => {
  const {
    preserveStructure = true,
    duplicateHandling = 'rename',
    generateThumbnails = true,
    extractMetadata = true
  } = options;
  
  const zip = new JSZip();
  const zipData = await zip.loadAsync(archiveFile);
  
  const files: File[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];
  const filenameMap = new Set<string>();
  let metadata: any = null;
  
  for (const [filename, zipEntry] of Object.entries(zipData.files)) {
    if (zipEntry.dir) continue;
    
    try {
      // Handle metadata file
      if (filename === 'metadata.json') {
        const metadataText = await zipEntry.async('text');
        metadata = JSON.parse(metadataText);
        continue;
      }
      
      // Extract file
      const blob = await zipEntry.async('blob');
      let finalFilename = preserveStructure ? filename : filename.split('/').pop() || filename;
      
      // Handle duplicates
      if (filenameMap.has(finalFilename)) {
        duplicates.push(finalFilename);
        
        switch (duplicateHandling) {
          case 'skip':
            continue;
          case 'rename':
            finalFilename = generateUniqueFilename(finalFilename, filenameMap);
            break;
          case 'replace':
            // Remove existing file with same name
            const existingIndex = files.findIndex(f => f.name === finalFilename);
            if (existingIndex !== -1) {
              files.splice(existingIndex, 1);
            }
            break;
        }
      }
      
      filenameMap.add(finalFilename);
      
      const file = new File([blob], finalFilename, {
        type: inferMimeType(finalFilename),
        lastModified: zipEntry.date?.getTime() || Date.now()
      });
      
      files.push(file);
    } catch (error) {
      errors.push(`Failed to extract ${filename}: ${error}`);
    }
  }
  
  return {
    files,
    metadata,
    duplicates,
    errors
  };
};

// Generate unique filename for duplicates
const generateUniqueFilename = (filename: string, existingNames: Set<string>): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  
  let counter = 1;
  let uniqueName = filename;
  
  while (existingNames.has(uniqueName)) {
    uniqueName = `${name} (${counter})${extension}`;
    counter++;
  }
  
  return uniqueName;
};

// Infer MIME type from filename
const inferMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    
    // Videos
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    rtf: 'application/rtf',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    
    // Web
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml'
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
};

// Calculate compression statistics
export const calculateCompressionStats = async (
  files: File[],
  compressionLevel: number = 5
): Promise<{
  totalOriginalSize: number;
  totalCompressedSize: number;
  overallRatio: number;
  fileStats: Array<{
    name: string;
    originalSize: number;
    compressedSize: number;
    ratio: number;
    savings: number;
  }>;
}> => {
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  const fileStats = [];
  
  for (const file of files) {
    const compressed = await compressFile(file, compressionLevel);
    const savings = compressed.originalSize - compressed.compressedSize;
    
    totalOriginalSize += compressed.originalSize;
    totalCompressedSize += compressed.compressedSize;
    
    fileStats.push({
      name: file.name,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      ratio: compressed.ratio,
      savings
    });
  }
  
  const overallRatio = totalCompressedSize / totalOriginalSize;
  
  return {
    totalOriginalSize,
    totalCompressedSize,
    overallRatio,
    fileStats
  };
};

// Optimize compression level based on file types
export const optimizeCompressionLevel = (files: File[]): number => {
  let compressibleCount = 0;
  let imageVideoCount = 0;
  
  files.forEach(file => {
    if (isCompressible(file.type)) {
      compressibleCount++;
    } else if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      imageVideoCount++;
    }
  });
  
  const total = files.length;
  const compressibleRatio = compressibleCount / total;
  const mediaRatio = imageVideoCount / total;
  
  // If mostly compressible files, use higher compression
  if (compressibleRatio > 0.7) return 9;
  
  // If mostly media files (already compressed), use lower compression
  if (mediaRatio > 0.7) return 3;
  
  // Mixed content, use balanced compression
  return 6;
};

// Progress tracking for compression operations
export interface CompressionProgress {
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
  stage: 'preparing' | 'compressing' | 'finalizing' | 'complete';
}

export const compressWithProgress = async (
  files: File[],
  options: {
    compressionLevel?: number;
    onProgress?: (progress: CompressionProgress) => void;
  } = {}
): Promise<Blob> => {
  const { compressionLevel = 5, onProgress } = options;
  const zip = new JSZip();
  const level = COMPRESSION_LEVELS[compressionLevel] || 5;
  
  // Preparing stage
  onProgress?.({
    current: 0,
    total: files.length,
    percentage: 0,
    stage: 'preparing'
  });
  
  // Add files with progress tracking
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    onProgress?.({
      current: i,
      total: files.length,
      percentage: (i / files.length) * 80, // 80% for adding files
      currentFile: file.name,
      stage: 'compressing'
    });
    
    zip.file(file.name, file, {
      compression: 'DEFLATE',
      compressionOptions: { level }
    });
  }
  
  // Finalizing stage
  onProgress?.({
    current: files.length,
    total: files.length,
    percentage: 90,
    stage: 'finalizing'
  });
  
  const result = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level }
  });
  
  // Complete
  onProgress?.({
    current: files.length,
    total: files.length,
    percentage: 100,
    stage: 'complete'
  });
  
  return result;
};