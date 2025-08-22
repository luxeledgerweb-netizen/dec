// Core file and media types
export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  type: FileType;
  mimeType: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  encryptedPath?: string;
  thumbnailPath?: string;
  tags: string[];
  isFavorite: boolean;
  isEncrypted: boolean;
  folderId?: string;
  metadata?: FileMetadata;
  checksum?: string;
}

export type FileType = 'image' | 'video' | 'document' | 'audio' | 'archive' | 'other';

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  colorSpace?: string;
  bitrate?: number;
  frameRate?: number;
  pages?: number;
  author?: string;
  title?: string;
  subject?: string;
  creator?: string;
  location?: GeolocationCoordinates;
  cameraMake?: string;
  cameraModel?: string;
  iso?: number;
  exposureTime?: string;
  focalLength?: string;
}

// Folder and organization types
export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  modifiedAt: Date;
  isEncrypted: boolean;
  passwordHash?: string;
  children: string[];
  fileCount: number;
  color?: string;
  icon?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: Date;
}

// Security and encryption types
export interface VaultConfig {
  id: string;
  name: string;
  isLocked: boolean;
  hasPassword: boolean;
  passwordHash?: string;
  encryptionKey?: string;
  lockTimeout: number;
  allowBiometric: boolean;
  showInRecents: boolean;
  created: Date;
  lastAccessed: Date;
}

export interface EncryptionOptions {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyLength: 128 | 192 | 256;
  iterations: number;
}

// UI and display types
export interface ViewMode {
  type: 'grid' | 'list' | 'masonry';
  itemSize: 'small' | 'medium' | 'large';
  showThumbnails: boolean;
  showMetadata: boolean;
  groupBy?: 'date' | 'type' | 'folder' | 'tag';
  sortBy: 'name' | 'date' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  customColors?: Record<string, string>;
}

// Search and filter types
export interface SearchOptions {
  query: string;
  fileTypes: FileType[];
  tags: string[];
  folders: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  includeMetadata: boolean;
  caseSensitive: boolean;
}

export interface FilterOptions {
  favorites: boolean;
  encrypted: boolean;
  recent: boolean;
  shared: boolean;
}

// Import/Export types
export interface ImportOptions {
  preserveStructure: boolean;
  encryptFiles: boolean;
  generateThumbnails: boolean;
  extractMetadata: boolean;
  duplicateHandling: 'skip' | 'rename' | 'replace';
  compressionLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export interface ExportOptions {
  includeMetadata: boolean;
  preserveEncryption: boolean;
  format: 'zip' | 'tar' | 'folder';
  compressionLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  password?: string;
}

// Application state types
export interface AppState {
  vault: VaultConfig | null;
  files: FileItem[];
  folders: Folder[];
  tags: Tag[];
  selectedFiles: string[];
  selectedFolders: string[];
  currentFolder: string | null;
  viewMode: ViewMode;
  theme: Theme;
  searchOptions: SearchOptions;
  filterOptions: FilterOptions;
  isLoading: boolean;
  error: string | null;
}

// Event types
export interface FileUploadEvent {
  files: File[];
  targetFolderId?: string;
  options: ImportOptions;
}

export interface FileOperationEvent {
  type: 'copy' | 'move' | 'delete' | 'encrypt' | 'decrypt';
  fileIds: string[];
  targetFolderId?: string;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'lockTimeout' | 'failedAttempt';
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Component prop types
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface FileItemComponentProps extends BaseComponentProps {
  file: FileItem;
  isSelected: boolean;
  viewMode: ViewMode['type'];
  onSelect: (fileId: string) => void;
  onDoubleClick: (fileId: string) => void;
  onContextMenu: (event: React.MouseEvent, fileId: string) => void;
}

export interface FolderComponentProps extends BaseComponentProps {
  folder: Folder;
  isSelected: boolean;
  onSelect: (folderId: string) => void;
  onDoubleClick: (folderId: string) => void;
  onContextMenu: (event: React.MouseEvent, folderId: string) => void;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export interface ProgressInfo {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: string;
}

// Plugin and extension types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  hooks: PluginHook[];
}

export interface PluginHook {
  event: string;
  handler: (...args: any[]) => any;
}