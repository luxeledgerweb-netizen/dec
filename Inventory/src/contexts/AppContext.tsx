import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, FileItem, Folder, Tag, ViewMode, Theme, SearchOptions, FilterOptions, VaultConfig } from '../types';

// Initial state
const initialState: AppState = {
  vault: null,
  files: [],
  folders: [],
  tags: [],
  selectedFiles: [],
  selectedFolders: [],
  currentFolder: null,
  viewMode: {
    type: 'grid',
    itemSize: 'medium',
    showThumbnails: true,
    showMetadata: true,
    sortBy: 'date',
    sortOrder: 'desc'
  },
  theme: {
    mode: 'system',
    primaryColor: '#1976d2',
    accentColor: '#ff9800'
  },
  searchOptions: {
    query: '',
    fileTypes: [],
    tags: [],
    folders: [],
    includeMetadata: true,
    caseSensitive: false
  },
  filterOptions: {
    favorites: false,
    encrypted: false,
    recent: false,
    shared: false
  },
  isLoading: false,
  error: null
};

// Action types
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VAULT'; payload: VaultConfig | null }
  | { type: 'SET_FILES'; payload: FileItem[] }
  | { type: 'ADD_FILES'; payload: FileItem[] }
  | { type: 'UPDATE_FILE'; payload: { id: string; updates: Partial<FileItem> } }
  | { type: 'DELETE_FILES'; payload: string[] }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: { id: string; updates: Partial<Folder> } }
  | { type: 'DELETE_FOLDERS'; payload: string[] }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'UPDATE_TAG'; payload: { id: string; updates: Partial<Tag> } }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'SET_SELECTED_FILES'; payload: string[] }
  | { type: 'ADD_SELECTED_FILE'; payload: string }
  | { type: 'REMOVE_SELECTED_FILE'; payload: string }
  | { type: 'TOGGLE_SELECTED_FILE'; payload: string }
  | { type: 'CLEAR_SELECTED_FILES' }
  | { type: 'SET_SELECTED_FOLDERS'; payload: string[] }
  | { type: 'ADD_SELECTED_FOLDER'; payload: string }
  | { type: 'REMOVE_SELECTED_FOLDER'; payload: string }
  | { type: 'TOGGLE_SELECTED_FOLDER'; payload: string }
  | { type: 'CLEAR_SELECTED_FOLDERS' }
  | { type: 'SET_CURRENT_FOLDER'; payload: string | null }
  | { type: 'SET_VIEW_MODE'; payload: Partial<ViewMode> }
  | { type: 'SET_THEME'; payload: Partial<Theme> }
  | { type: 'SET_SEARCH_OPTIONS'; payload: Partial<SearchOptions> }
  | { type: 'SET_FILTER_OPTIONS'; payload: Partial<FilterOptions> }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'RESET_STATE' };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_VAULT':
      return { ...state, vault: action.payload };

    case 'SET_FILES':
      return { ...state, files: action.payload };

    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.payload] };

    case 'UPDATE_FILE': {
      const { id, updates } = action.payload;
      return {
        ...state,
        files: state.files.map(file =>
          file.id === id ? { ...file, ...updates, modifiedAt: new Date() } : file
        )
      };
    }

    case 'DELETE_FILES':
      return {
        ...state,
        files: state.files.filter(file => !action.payload.includes(file.id)),
        selectedFiles: state.selectedFiles.filter(id => !action.payload.includes(id))
      };

    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };

    case 'ADD_FOLDER':
      return { ...state, folders: [...state.folders, action.payload] };

    case 'UPDATE_FOLDER': {
      const { id, updates } = action.payload;
      return {
        ...state,
        folders: state.folders.map(folder =>
          folder.id === id ? { ...folder, ...updates, modifiedAt: new Date() } : folder
        )
      };
    }

    case 'DELETE_FOLDERS':
      return {
        ...state,
        folders: state.folders.filter(folder => !action.payload.includes(folder.id)),
        selectedFolders: state.selectedFolders.filter(id => !action.payload.includes(id))
      };

    case 'SET_TAGS':
      return { ...state, tags: action.payload };

    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };

    case 'UPDATE_TAG': {
      const { id, updates } = action.payload;
      return {
        ...state,
        tags: state.tags.map(tag =>
          tag.id === id ? { ...tag, ...updates } : tag
        )
      };
    }

    case 'DELETE_TAG':
      return {
        ...state,
        tags: state.tags.filter(tag => tag.id !== action.payload),
        files: state.files.map(file => ({
          ...file,
          tags: file.tags.filter(tagName => 
            state.tags.find(tag => tag.id === action.payload)?.name !== tagName
          )
        }))
      };

    case 'SET_SELECTED_FILES':
      return { ...state, selectedFiles: action.payload };

    case 'ADD_SELECTED_FILE':
      return {
        ...state,
        selectedFiles: state.selectedFiles.includes(action.payload)
          ? state.selectedFiles
          : [...state.selectedFiles, action.payload]
      };

    case 'REMOVE_SELECTED_FILE':
      return {
        ...state,
        selectedFiles: state.selectedFiles.filter(id => id !== action.payload)
      };

    case 'TOGGLE_SELECTED_FILE': {
      const isSelected = state.selectedFiles.includes(action.payload);
      return {
        ...state,
        selectedFiles: isSelected
          ? state.selectedFiles.filter(id => id !== action.payload)
          : [...state.selectedFiles, action.payload]
      };
    }

    case 'CLEAR_SELECTED_FILES':
      return { ...state, selectedFiles: [] };

    case 'SET_SELECTED_FOLDERS':
      return { ...state, selectedFolders: action.payload };

    case 'ADD_SELECTED_FOLDER':
      return {
        ...state,
        selectedFolders: state.selectedFolders.includes(action.payload)
          ? state.selectedFolders
          : [...state.selectedFolders, action.payload]
      };

    case 'REMOVE_SELECTED_FOLDER':
      return {
        ...state,
        selectedFolders: state.selectedFolders.filter(id => id !== action.payload)
      };

    case 'TOGGLE_SELECTED_FOLDER': {
      const isSelected = state.selectedFolders.includes(action.payload);
      return {
        ...state,
        selectedFolders: isSelected
          ? state.selectedFolders.filter(id => id !== action.payload)
          : [...state.selectedFolders, action.payload]
      };
    }

    case 'CLEAR_SELECTED_FOLDERS':
      return { ...state, selectedFolders: [] };

    case 'SET_CURRENT_FOLDER':
      return { ...state, currentFolder: action.payload };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: { ...state.viewMode, ...action.payload } };

    case 'SET_THEME':
      return { ...state, theme: { ...state.theme, ...action.payload } };

    case 'SET_SEARCH_OPTIONS':
      return { ...state, searchOptions: { ...state.searchOptions, ...action.payload } };

    case 'SET_FILTER_OPTIONS':
      return { ...state, filterOptions: { ...state.filterOptions, ...action.payload } };

    case 'CLEAR_SEARCH':
      return {
        ...state,
        searchOptions: {
          ...state.searchOptions,
          query: '',
          fileTypes: [],
          tags: [],
          folders: [],
          dateRange: undefined,
          sizeRange: undefined
        }
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Persist state to localStorage
  useEffect(() => {
    const persistedState = localStorage.getItem('inventoryVaultState');
    if (persistedState) {
      try {
        const parsed = JSON.parse(persistedState);
        // Only restore certain parts of the state, not everything
        dispatch({ type: 'SET_VIEW_MODE', payload: parsed.viewMode || initialState.viewMode });
        dispatch({ type: 'SET_THEME', payload: parsed.theme || initialState.theme });
        dispatch({ type: 'SET_FILTER_OPTIONS', payload: parsed.filterOptions || initialState.filterOptions });
      } catch (error) {
        console.warn('Failed to restore persisted state:', error);
      }
    }
  }, []);

  // Save certain state changes to localStorage
  useEffect(() => {
    const stateToSave = {
      viewMode: state.viewMode,
      theme: state.theme,
      filterOptions: state.filterOptions
    };
    localStorage.setItem('inventoryVaultState', JSON.stringify(stateToSave));
  }, [state.viewMode, state.theme, state.filterOptions]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Selector hooks for better performance
export const useAppState = () => useAppContext().state;
export const useAppDispatch = () => useAppContext().dispatch;

// Specific selector hooks
export const useFiles = () => useAppState().files;
export const useFolders = () => useAppState().folders;
export const useTags = () => useAppState().tags;
export const useSelectedFiles = () => useAppState().selectedFiles;
export const useSelectedFolders = () => useAppState().selectedFolders;
export const useCurrentFolder = () => useAppState().currentFolder;
export const useViewMode = () => useAppState().viewMode;
export const useTheme = () => useAppState().theme;
export const useSearchOptions = () => useAppState().searchOptions;
export const useFilterOptions = () => useAppState().filterOptions;
export const useVault = () => useAppState().vault;
export const useIsLoading = () => useAppState().isLoading;
export const useError = () => useAppState().error;