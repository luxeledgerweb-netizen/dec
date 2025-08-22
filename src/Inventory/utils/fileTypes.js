// src/Inventory/utils/fileTypes.js
// File type detection and icon utilities

export const FILE_TYPES = {
  IMAGE: 'image',
  PDF: 'pdf',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  ARCHIVE: 'archive',
  CODE: 'code',
  OTHER: 'other'
};

export const FILE_TYPE_EXTENSIONS = {
  [FILE_TYPES.IMAGE]: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'],
  [FILE_TYPES.PDF]: ['pdf'],
  [FILE_TYPES.VIDEO]: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'],
  [FILE_TYPES.AUDIO]: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'],
  [FILE_TYPES.DOCUMENT]: ['doc', 'docx', 'txt', 'rtf', 'odt', 'pages'],
  [FILE_TYPES.ARCHIVE]: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  [FILE_TYPES.CODE]: ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'h']
};

export const FILE_TYPE_LABELS = {
  [FILE_TYPES.IMAGE]: 'Image',
  [FILE_TYPES.PDF]: 'PDF',
  [FILE_TYPES.VIDEO]: 'Video', 
  [FILE_TYPES.AUDIO]: 'Audio',
  [FILE_TYPES.DOCUMENT]: 'Document',
  [FILE_TYPES.ARCHIVE]: 'Archive',
  [FILE_TYPES.CODE]: 'Code',
  [FILE_TYPES.OTHER]: 'Other'
};

export const FILE_TYPE_COLORS = {
  [FILE_TYPES.IMAGE]: 'bg-green-100 text-green-800 border-green-200',
  [FILE_TYPES.PDF]: 'bg-red-100 text-red-800 border-red-200',
  [FILE_TYPES.VIDEO]: 'bg-purple-100 text-purple-800 border-purple-200',
  [FILE_TYPES.AUDIO]: 'bg-blue-100 text-blue-800 border-blue-200',
  [FILE_TYPES.DOCUMENT]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [FILE_TYPES.ARCHIVE]: 'bg-gray-100 text-gray-800 border-gray-200',
  [FILE_TYPES.CODE]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [FILE_TYPES.OTHER]: 'bg-slate-100 text-slate-800 border-slate-200'
};

/**
 * Determine file type from filename or mime type
 */
export function getFileType(filename, mimeType = '') {
  if (!filename && !mimeType) return FILE_TYPES.OTHER;

  const ext = filename ? filename.split('.').pop()?.toLowerCase() || '' : '';
  const mime = mimeType.toLowerCase();

  // Check by extension first
  for (const [type, extensions] of Object.entries(FILE_TYPE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }

  // Check by mime type as fallback
  if (mime.startsWith('image/')) return FILE_TYPES.IMAGE;
  if (mime === 'application/pdf') return FILE_TYPES.PDF;
  if (mime.startsWith('video/')) return FILE_TYPES.VIDEO;
  if (mime.startsWith('audio/')) return FILE_TYPES.AUDIO;
  if (mime.startsWith('text/') || mime.includes('document') || mime.includes('word')) return FILE_TYPES.DOCUMENT;
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('compressed')) return FILE_TYPES.ARCHIVE;

  return FILE_TYPES.OTHER;
}

/**
 * Get file types present in an item (from its file attachments)
 */
export function getItemFileTypes(item, files = []) {
  const types = new Set();
  
  // Check thumbnail images
  if (item.images && item.images.length > 0) {
    types.add(FILE_TYPES.IMAGE);
  }

  // Check actual file attachments
  files.forEach(file => {
    const type = getFileType(file.name, file.mime);
    types.add(type);
  });

  return Array.from(types);
}

/**
 * Check if item has files of specific type
 */
export function itemHasFileType(item, files = [], targetType) {
  const types = getItemFileTypes(item, files);
  return types.includes(targetType);
}