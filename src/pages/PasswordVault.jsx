
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  StickyNote,
  CreditCard,
  Search,
  Plus,
  Zap,
  Lock,
  X,
  Trash2,
  Edit,
  Star,
  Menu,
  Circle,
  CheckCircle2,
  ArrowUpCircle,
  Pencil,
  Package,
  Calendar as CalendarIcon,
  Settings // Added Settings icon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localDb } from '@/components/utils/LocalDb';
import { getIconForItem } from '@/components/utils/iconHelper';
import AddPasswordModal from '@/components/vault/AddPasswordModal';
import AddNoteModal from '@/components/vault/AddNoteModal';
import AddCardModal from '@/components/vault/AddCardModal';
import PasswordGeneratorModal from '@/components/vault/PasswordGeneratorModal';
import VaultEntryModal from '@/components/vault/VaultEntryModal';
import VaultLockAnimation from '@/components/vault/VaultLockAnimation';
import { EncryptionHelper } from '@/components/utils/EncryptionHelper';

// Create a simple useIconSettings hook since it's missing
const useIconSettings = () => {
  return {
    iconSettings: {
      showIcons: true
    }
  };
};

// Helper function for page URLs (assuming a basic routing structure)
// This is a placeholder; in a real app, this would likely come from a routing utility.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case 'PasswordVaultSettings':
      return '/vault-settings'; // Example path for vault settings
    default:
      return `/${pageName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`;
  }
};

// Helper constants for icons and colors
const iconComponents = {
  password: KeyRound,
  note: StickyNote,
  card: CreditCard
};

const itemIconBgColors = {
  password: 'from-blue-500 to-blue-600',
  note: 'from-green-500 to-green-600',
  card: 'from-purple-500 to-purple-600'
};

const getCardNetworkIcon = (cardNetwork) => {
  const networkStyles = {
    visa: { bg: 'from-blue-600 to-blue-700', color: 'text-white' },
    mastercard: { bg: 'from-red-500 to-orange-500', color: 'text-white' },
    american_express: { bg: 'from-green-600 to-blue-600', color: 'text-white' },
    discover: { bg: 'from-orange-500 to-orange-600', color: 'text-white' },
    other: { bg: 'from-gray-500 to-gray-600', color: 'text-white' }
  };

  const style = networkStyles[cardNetwork] || networkStyles.other;
  const displayName = cardNetwork === 'american_express' ? 'AMEX' :
                     cardNetwork === 'mastercard' ? 'MC' :
                     cardNetwork === 'discover' ? 'DISC' :
                     cardNetwork === 'visa' ? 'VISA' : 'CARD';

  return (
    <div className={`w-8 h-8 bg-gradient-to-r ${style.bg} rounded-lg flex items-center justify-center`}>
      <span className={`text-xs font-bold ${style.color}`}>
        {displayName.slice(0, 2)}
      </span>
    </div>
  );
};

// VaultItemCard component definition
const VaultItemCard = ({ entry, onSelect, onDelete, compactView = false, getTagColor }) => {
  const { iconSettings } = useIconSettings();

  const renderIcon = (item) => {
    /// Prefer data URL, then URL fallback, then legacy base64, then a default image
  const faviconSrc =
    item.default_favicon_base64 ||
    item.stored_favicon ||
    '/icons/default-favicon.png';

    if (item.type === 'password' && item.website && faviconSrc) {
      return (
        <img
          src={faviconSrc}
          alt={`${item.name} favicon`}
          className="w-8 h-8 rounded-lg object-cover"
          // Graceful fallback if the Base64 string is broken
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }

    if (item.type === 'card' && item.card_network) {
      return getCardNetworkIcon(item.card_network);
    }

    // Default fallback icon
    const IconComponent = iconComponents[item.type];
    const bgGradient = itemIconBgColors[item.type];
    return (
      <div className={`w-8 h-8 bg-gradient-to-r ${bgGradient} rounded-lg flex items-center justify-center`}>
        <IconComponent className="w-4 h-4 text-white" />
      </div>
    );
  };
  
  return (
    <Card className={`${compactView ? 'p-3' : 'p-4'} hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[var(--ring)] group`}
          onClick={() => onSelect(entry)}
          style={{ backgroundColor: 'var(--tile-color)' }}>
      <div className={`flex items-start justify-between ${compactView ? 'mb-2' : 'mb-3'}`}>
        <div className="relative">
          {renderIcon(entry)}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {entry.isFavorite && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(entry);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <h4 className={`font-medium ${compactView ? 'mb-1 text-sm' : 'mb-2'} text-[var(--heading-color)]`}>
        {entry.name || entry.title || 'Untitled'}
      </h4>

      {/* Tags with colors */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entry.tags.slice(0, 3).map(tag => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
          {entry.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{entry.tags.length - 3}</span>
          )}
        </div>
      )}

      {entry.type === 'password' && (
        <div className={`space-y-1 ${compactView ? 'text-xs' : 'text-sm'} text-[var(--text-secondary)]`}>
          {entry.username && <p>Username: {entry.username}</p>}
          {entry.email && <p>Email: {entry.email}</p>}
          {entry.website && <p>Website: {entry.website}</p>}
        </div>
      )}

      {entry.type === 'note' && (
        <p className={`${compactView ? 'text-xs' : 'text-sm'} text-[var(--text-secondary)] line-clamp-3`}>
          {entry.content || 'No content'}
        </p>
      )}

      {entry.type === 'card' && (
        <div className={`space-y-1 ${compactView ? 'text-xs' : 'text-sm'} text-[var(--text-secondary)]`}>
          {entry.cardholder_name && <p>Name: {entry.cardholder_name}</p>}
          {entry.card_number && <p>•••• {entry.card_number.slice(-4)}</p>}
        </div>
      )}
    </Card>
  );
};

export default function PasswordVault() {
  const [allEntries, setAllEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');

  const [vaultSettings, setVaultSettings] = useState({ vaultPasswordEnabled: false, autoLogoutTimer: 0, compactView: false });
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [showVaultEntry, setShowVaultEntry] = useState(false);
  const [showLockAnimation, setShowLockAnimation] = useState(false);
  const [vaultActivityTimer, setVaultActivityTimer] = useState(null);
  const navigate = useNavigate();
  const openInventory = () => navigate('/vault/inventory');

  // Helper function to generate consistent colors for tags
  const getTagColor = (tag) => {
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
    ];
    
    // Generate consistent hash from tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = ((hash << 5) - hash) + tag.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const refreshData = async () => {
    const currentMasterPassword = localDb.getItem('masterPassword');
    setMasterPassword(currentMasterPassword);

    const decryptAsync = async (value) => {
      if (!value || !currentMasterPassword) return value;
      try {
        return await EncryptionHelper.decrypt(value, currentMasterPassword);
      } catch (e) {
        return value;
      }
    };

    const processEntries = async (type, entries) => {
      if (!entries || entries.length === 0) return [];
      
      const processed = await Promise.all(entries.map(async item => {
        const processedItem = { ...item, type };
        
        const nameOrTitle = item.name || item.title;
        if(nameOrTitle) processedItem.name = await decryptAsync(nameOrTitle);
        
        if (item.tags && Array.isArray(item.tags)) {
          processedItem.tags = await Promise.all(item.tags.map(tag => decryptAsync(tag)));
        }
        processedItem.isFavorite = item.isFavorite || false;

        if (type === 'password') {
          if (item.username) processedItem.username = await decryptAsync(item.username);
          if (item.password) processedItem.password = await decryptAsync(item.password);
          if (item.website) processedItem.website = await decryptAsync(item.website);
          if (item.email) processedItem.email = await decryptAsync(item.email);
          // Favicon data is NOT encrypted - pass through as-is
          processedItem.stored_favicon = item.stored_favicon;
	  processedItem.stored_favicon_url = item.stored_favicon_url;
          processedItem.default_favicon_base64 = item.default_favicon_base64;
        } else if (type === 'note') {
          if (item.content) processedItem.content = await decryptAsync(item.content);
        } else if (type === 'card') {
          if (item.cardholder_name) processedItem.cardholder_name = await decryptAsync(item.cardholder_name);
          if (item.card_number) processedItem.card_number = await decryptAsync(item.card_number);
          if (item.expiration_date) processedItem.expiration_date = await decryptAsync(item.expiration_date);
          if (item.cvv) processedItem.cvv = await decryptAsync(item.cvv);
        }
        return processedItem;
      }));
      return processed;
    };

    const decryptedPasswords = await processEntries('password', localDb.list('PasswordCredential'));
    const decryptedNotes = await processEntries('note', localDb.list('SecureNote'));
    const decryptedCards = await processEntries('card', localDb.list('CardCredential'));

    const combinedEntries = [...decryptedPasswords, ...decryptedNotes, ...decryptedCards]
      .sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));

    setAllEntries(combinedEntries);

    const settings = localDb.list('VaultSettings');
    if (settings.length > 0) {
      setVaultSettings(settings[0]);
    } else {
      const defaultSettings = {
        id: 'vault-settings',
        vaultPasswordEnabled: false,
        autoLogoutTimer: 0,
        compactView: false // Added compactView default
      };
      localDb.create('VaultSettings', defaultSettings);
      setVaultSettings(defaultSettings);
    }
  };

  useEffect(() => {
    const initVault = async () => {
        const settings = localDb.list('VaultSettings');
        const vaultSettingsData = settings.length > 0 ? settings[0] : { vaultPasswordEnabled: false, autoLogoutTimer: 0, compactView: false }; // Ensure compactView default is set here too

        if (vaultSettingsData.vaultPasswordEnabled) {
          setShowVaultEntry(true);
          setIsVaultUnlocked(false);
        } else {
          setIsVaultUnlocked(true);
          await refreshData();
        }
    };
    initVault();
  }, []);

  const resetActivityTimer = () => {
    if (vaultActivityTimer) {
      clearTimeout(vaultActivityTimer);
    }

    if (vaultSettings.vaultPasswordEnabled && vaultSettings.autoLogoutTimer > 0 && isVaultUnlocked) {
      const timer = setTimeout(() => {
        handleVaultLock();
      }, vaultSettings.autoLogoutTimer * 60 * 1000);

      setVaultActivityTimer(timer);
    }
  };

  useEffect(() => {
    if (isVaultUnlocked) {
      resetActivityTimer();
    }

    return () => {
      if (vaultActivityTimer) {
        clearTimeout(vaultActivityTimer);
      }
    };
  }, [isVaultUnlocked, vaultSettings.autoLogoutTimer, vaultSettings.vaultPasswordEnabled]);

  useEffect(() => {
    if (isVaultUnlocked && vaultSettings.vaultPasswordEnabled) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

      const handleUserActivity = () => resetActivityTimer();

      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
      };
    }
  }, [isVaultUnlocked, vaultSettings.vaultPasswordEnabled, vaultSettings.autoLogoutTimer]);

  const handleVaultEntry = async (password) => {
    try {
      const currentSettings = localDb.list('VaultSettings');
      const latestVaultSettings = currentSettings.length > 0 ? currentSettings[0] : null;

      if (!latestVaultSettings || !latestVaultSettings.vaultPasswordHash || !latestVaultSettings.vaultPasswordSalt) {
        console.error('Vault password settings not found or incomplete.');
        return false;
      }

      const encoder = new TextEncoder();
      const saltArray = new Uint8Array(Object.values(latestVaultSettings.vaultPasswordSalt));
      const passwordData = encoder.encode(password);

      const saltedData = new Uint8Array(passwordData.length + saltArray.length);
      saltedData.set(passwordData, 0);
      saltedData.set(saltArray, passwordData.length);

      const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
      const hash = Array.from(new Uint8Array(hashBuffer));

      const storedHash = Array.isArray(latestVaultSettings.vaultPasswordHash)
        ? latestVaultSettings.vaultPasswordHash
        : Object.values(latestVaultSettings.vaultPasswordHash);

      if (JSON.stringify(hash) === JSON.stringify(storedHash)) {
        setShowVaultEntry(false);
        setIsVaultUnlocked(true);
        localDb.setItem('masterPassword', password); // <- Critical line
        await refreshData();
        resetActivityTimer();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Vault entry error:', error);
      return false;
    }
  };

  const handleVaultLock = () => {
    if (vaultActivityTimer) {
      clearTimeout(vaultActivityTimer);
    }
    setShowLockAnimation(true);
  };

  const handleLockAnimationComplete = () => {
    if (vaultActivityTimer) {
      clearTimeout(vaultActivityTimer);
    }
    setShowLockAnimation(false);
    setIsVaultUnlocked(false);
    setShowVaultEntry(true);
    localDb.remove('masterPassword');
    setAllEntries([]);
    setSelectedEntry(null);
    setEditingEntry(null);
    setIsPasswordModalOpen(false);
    setIsNoteModalOpen(false);
    setIsCardModalOpen(false);
    setIsGeneratorModalOpen(false);
    setSearchTerm('');
    setActiveCategory('all');
  };

  const handleSelectEntry = (entry) => {
    setEditingEntry(entry);
    setSelectedEntry(entry);
    if (entry.type === 'password') setIsPasswordModalOpen(true);
    else if (entry.type === 'note') setIsNoteModalOpen(true);
    else if (entry.type === 'card') setIsCardModalOpen(true);
  };

  const handleDeleteEntry = async (entry) => {
    const itemName = entry.name || entry.title || 'this item';
    if (confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      if (entry.type === 'password') {
        localDb.delete('PasswordCredential', entry.id);
      } else if (entry.type === 'note') {
        localDb.delete('SecureNote', entry.id);
      } else if (entry.type === 'card') {
        localDb.delete('CardCredential', entry.id);
      }
      await refreshData();
      setIsPasswordModalOpen(false);
      setIsNoteModalOpen(false);
      setIsCardModalOpen(false);
      setEditingEntry(null);
      setSelectedEntry(null);
    }
  };

  const handleModalClose = async () => {
    setIsPasswordModalOpen(false);
    setIsNoteModalOpen(false);
    setIsCardModalOpen(false);
    setIsGeneratorModalOpen(false);
    setEditingEntry(null);
    setSelectedEntry(null);
    await refreshData();
  };

  const filteredEntries = useMemo(() => {
    return allEntries
      .filter(entry => {
        if (activeCategory === 'all') return true;
        // Favorites functionality removed
        // if (activeCategory === 'favorites') return entry.isFavorite; 
        if (activeCategory.startsWith('tag:')) {
          const tagName = activeCategory.replace('tag:', '');
          return entry.tags && entry.tags.includes(tagName);
        }
        return entry.type === activeCategory;
      })
      .filter(entry => {
        if (!searchTerm) return true;
        const entryDisplayName = entry.name || entry.title || '';
        return entryDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      });
  }, [allEntries, activeCategory, searchTerm]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set();
    allEntries.forEach(entry => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach(tag => {
          if (tag && tag.trim()) {
            tags.add(tag.trim());
          }
        });
      }
    });
    return Array.from(tags).sort();
  }, [allEntries]);

  const CategoryButton = ({ category, label, icon: Icon }) => (
    <Button
      variant={activeCategory === category ? 'secondary' : 'ghost'}
      onClick={() => {
        setActiveCategory(category);
        if (isSidebarOpen) setIsSidebarOpen(false);
      }}
      className="w-full justify-start"
    >
      <Icon className="w-5 h-5 mr-3" />
      <span>{label}</span>
    </Button>
  );

  const TagButton = ({ tag }) => {
    const colorClasses = getTagColor(tag);
    const isActive = activeCategory === `tag:${tag}`;

    return (
      <button
        onClick={() => {
          setActiveCategory(`tag:${tag}`);
          if (isSidebarOpen) setIsSidebarOpen(false);
        }}
        className={`inline-block text-left text-sm px-3 py-1.5 rounded-full transition-all duration-200
                   ${isActive 
                     ? `ring-2 ring-offset-1 ring-offset-[var(--background)] ring-purple-500 shadow-md ${colorClasses}` 
                     : colorClasses}
                   hover:opacity-90 hover:shadow-sm mb-1.5 mr-1.5`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
      >
        <span className="truncate font-medium">{tag}</span>
      </button>
    );
  };

  const getSmartAddButton = () => {
    if (activeCategory === 'password') {
      return (
        <Button 
          onClick={() => { setEditingEntry(null); setIsPasswordModalOpen(true); }}
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg w-full"
        >
          <Plus className="w-4 h-4 mr-2" />Add Password
        </Button>
      );
    }
    if (activeCategory === 'note') {
      return (
        <Button 
          onClick={() => { setEditingEntry(null); setIsNoteModalOpen(true); }}
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg w-full"
        >
          <Plus className="w-4 h-4 mr-2" />Add Note
        </Button>
      );
    }
    if (activeCategory === 'card') {
      return (
        <Button 
          onClick={() => { setEditingEntry(null); setIsCardModalOpen(true); }}
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg w-full"
        >
          <Plus className="w-4 h-4 mr-2" />Add Card
        </Button>
      );
    }
    
    // Default dropdown for "All Items" and other categories
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />Add Item
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => { setEditingEntry(null); setIsPasswordModalOpen(true); }}>
            <KeyRound className="mr-2 h-4 w-4" /><span>Password</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setEditingEntry(null); setIsNoteModalOpen(true); }}>
            <StickyNote className="mr-2 h-4 w-4" /><span>Secure Note</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setEditingEntry(null); setIsCardModalOpen(true); }}>
            <CreditCard className="mr-2 h-4 w-4" /><span>Credit Card</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsGeneratorModalOpen(true)}>
            <Zap className="mr-2 h-4 w-4" /><span>Password Generator</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (!isVaultUnlocked) {
    return (
      <>
        <VaultEntryModal
          isOpen={showVaultEntry}
          onClose={() => {
            if (vaultSettings.vaultPasswordEnabled) {
              window.location.href = '/dashboard';
            }
          }}
          onSuccess={handleVaultEntry}
          vaultSettings={vaultSettings}
        />
        {showLockAnimation && (
          <VaultLockAnimation onComplete={handleLockAnimationComplete} />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground overflow-hidden">
      {showLockAnimation && (
        <VaultLockAnimation onComplete={handleLockAnimationComplete} />
      )}

      {/* Sidebar for desktop, hidden/fixed for mobile */}
      <aside className={`fixed top-0 left-0 h-full w-[60%] max-w-[250px] md:w-64 bg-background border-r
                         transform transition-transform duration-300 ease-in-out z-50
                         ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
                         md:flex-shrink-0 md:border-b-0 md:bg-background/80 md:backdrop-blur-sm`}>
        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        <Card className="h-full flex flex-col rounded-none md:rounded-lg relative z-50" style={{ backgroundColor: 'var(--tile-color)' }}>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 md:p-6 md:pb-4 pt-6 md:pt-6 border-b border-border/20 md:border-b-0">
            <CardTitle>Categories</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 pt-4 md:p-6 md:pt-0 space-y-2">
            <CategoryButton category="all" label="All Items" icon={Menu} />
            <CategoryButton category="password" label="Passwords" icon={KeyRound} />
            <CategoryButton category="note" label="Secure Notes" icon={StickyNote} />
            <CategoryButton category="card" label="Cards" icon={CreditCard} />
            
            <div className="pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">Tags</h4>
              {allTags.length > 0 ? (
                <div className="flex flex-wrap">
                  {allTags.map(tag => (
                    <TagButton key={tag} tag={tag} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-2">No tags created.</p>
              )}
            </div>

{/* --- Inventory entry point --- */}
<Button
  variant="outline"
  className="w-full justify-start mt-4"
  onClick={openInventory}
>
  <Package className="w-5 h-5 mr-3" />
  <span>Inventory</span>
</Button>
            
            {vaultSettings.vaultPasswordEnabled && (
              <Button
                variant="outline"
                className="w-full justify-start text-red-500 hover:text-red-600 border-red-500 hover:border-red-600 mt-4"
                onClick={handleVaultLock}
              >
                <Lock className="w-5 h-5 mr-3" />
                <span>Lock Vault</span>
              </Button>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col bg-background text-foreground overflow-y-auto relative z-0">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 md:p-8 border-b border-border flex-shrink-0 space-y-4 sm:space-y-0">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold vault-gradient-text">Password Vault</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {getSmartAddButton()}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Card className="mb-8 glass-card" style={{ backgroundColor: 'var(--tile-color)' }}>
              <CardHeader>
                <CardTitle>Search & Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search vault..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {vaultSettings.compactView ? (
              // List View Layout
              <div className="space-y-2">
                {filteredEntries.map((entry) => {
                   const faviconSrc =
			  entry.default_favicon_base64 ||
			  entry.stored_favicon ||
			  '/icons/default-favicon.png';
                   
                   return (
                      <div
                        key={entry.id}
                        onClick={() => handleSelectEntry(entry)}
                        className="flex items-center gap-4 p-3 bg-[var(--tile-color)] rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer hover:border-[var(--ring)] group border border-transparent"
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                          {entry.type === 'password' && faviconSrc ? (
                              <img
                                src={faviconSrc}
                                alt={entry.name}
                                className="w-6 h-6 rounded object-cover"
                              />
                            ) : (
                              <div className={`w-6 h-6 rounded flex items-center justify-center bg-gradient-to-r ${
                                entry.type === 'password' ? 'from-blue-500 to-blue-600' :
                                entry.type === 'note' ? 'from-green-500 to-green-600' :
                                'from-purple-500 to-purple-600'
                              }`}>
                                {entry.type === 'password' && <KeyRound className="w-3 h-3 text-white" />}
                                {entry.type === 'note' && <StickyNote className="w-3 h-3 text-white" />}
                                {entry.type === 'card' && <CreditCard className="w-3 h-3 text-white" />}
                              </div>
                            )
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-[var(--heading-color)] truncate">
                              {entry.name || entry.title || 'Untitled'}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {entry.type === 'password' ? '🔐' : entry.type === 'note' ? '📝' : '💳'}
                            </span>
                          </div>
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {entry.tags.slice(0, 3).map(tag => (
                                <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${getTagColor(tag)}`}>
                                  {tag}
                                </span>
                              ))}
                              {entry.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{entry.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                          {entry.type === 'password' && (entry.username || entry.website) && (
                            <p className="text-sm text-[var(--text-secondary)] truncate">
                              {entry.username && entry.website ? `${entry.username} • ${entry.website}` :
                               entry.username || entry.website}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEntry(entry);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEntry(entry);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                   )
                })}
              </div>
            ) : (
              // Card Grid Layout (existing)
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEntries.map((entry) => (
                  <VaultItemCard 
                    key={entry.id} 
                    entry={entry} 
                    onSelect={handleSelectEntry} 
                    onDelete={handleDeleteEntry}
                    compactView={false}
                    getTagColor={getTagColor}
                  />
                ))}
              </div>
            )}
            
            {filteredEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-2">No items found.</p>
                <p className="text-sm">Try adjusting your search or category.</p>
                {searchTerm === '' && activeCategory === 'all' && (
                  <p className="text-sm mt-2">Click "Add Item" to get started.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Floating Add Button */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        {activeCategory === 'password' ? (
          <Button
            onClick={() => { setEditingEntry(null); setIsPasswordModalOpen(true); }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        ) : activeCategory === 'note' ? (
          <Button
            onClick={() => { setEditingEntry(null); setIsNoteModalOpen(true); }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        ) : activeCategory === 'card' ? (
          <Button
            onClick={() => { setEditingEntry(null); setIsCardModalOpen(true); }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white shadow-lg"
                size="icon"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mb-2">
              <DropdownMenuItem onClick={() => { setEditingEntry(null); setIsPasswordModalOpen(true); }}>
                <KeyRound className="mr-2 h-4 w-4" /><span>Password</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setEditingEntry(null); setIsNoteModalOpen(true); }}>
                <StickyNote className="mr-2 h-4 w-4" /><span>Secure Note</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setEditingEntry(null); setIsCardModalOpen(true); }}>
                <CreditCard className="mr-2 h-4 w-4" /><span>Credit Card</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsGeneratorModalOpen(true)}>
                <Zap className="mr-2 h-4 w-4" /><span>Password Generator</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AddPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleModalClose}
        onSave={handleModalClose}
        editingPassword={editingEntry?.type === 'password' ? editingEntry : null}
        masterPassword={masterPassword}
      />
      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={handleModalClose}
        onSave={handleModalClose}
        editingNote={editingEntry?.type === 'note' ? editingEntry : null}
        masterPassword={masterPassword}
      />
      <AddCardModal
        isOpen={isCardModalOpen}
        onClose={handleModalClose}
        onSave={handleModalClose}
        editingCard={editingEntry?.type === 'card' ? editingEntry : null}
        masterPassword={masterPassword}
      />
      <PasswordGeneratorModal
        isOpen={isGeneratorModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
