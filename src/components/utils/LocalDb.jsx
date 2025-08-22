
// --- imports (keep any other imports you already have above/below)
import { extractDomain } from './faviconUtils';
import { idbLoad, idbSave } from '@/components/utils/storageShim';

// Guarded mirror for localStorage "startup cache"
function tryMirrorToLocalStorage(json, enable = true) {
  if (!enable) {
    try { localStorage.removeItem(DB_KEY); } catch {}
    return;
  }
  try {
    const bytes = new Blob([json]).size;
    const LIMIT = 4.8 * 1024 * 1024; // ~4.8 MB soft cap
    if (bytes < LIMIT) {
      localStorage.setItem(DB_KEY, json);
    } else {
      // keep cache empty if too large; boot will fall back to IndexedDB
      localStorage.removeItem(DB_KEY);
      console.info('Startup cache skipped (too large); will boot from IndexedDB.');
    }
  } catch (err) {
    console.info('Startup cache write failed; will boot from IndexedDB.', err?.message || err);
  }
}

// --- constants
const DB_KEY = 'luxeLedgerData'; // keep your existing key

// --- full default schema (YOUR source of truth) ---
const getDefaultSchema = () => ({
  // Financial (use your real entity names)
  Account: [],
  BalanceHistory: [],
  CreditCard: [],
  CreditScore: [],
  AutoLoan: [],
  CreditBureauStatus: [],
  PortfolioSnapshot: [],
  Reminder: [],
  dashboardOrder: [],
  CustomThemes: [],          // custom themes
  MonthlyReport: [],         // included in backups

  // Vault Entities
  PasswordCredential: [],
  SecureNote: [],
  CardCredential: [],
  BankCredential: [],
  VaultSettings: [],

  // App / Admin
  AppSettings: [{
    id: 'settings',
    showAccountProgressBar: true,
    compactCardView: false,
    showAccountFavicons: true,
    animationSpeed: 'normal', // slow, normal, fast
    showDashboardGreeting: true,
    roundNumbers: false,
    hideZeroBalances: false,
    creditCardSorting: 'recent', // recent, limit, expiration, institution
    accountSort: 'default',      // default, institution, account_type
    showAllReminders: false,     // show all vs alert-only
    showSubscriptionLogos: true, // subscription favicons
    enableStartupCache: true,    // toggle to allow mirroring to localStorage (fast boot) when under ~4.8MB.
    unusedCardThresholdMonths: 6,
    // Bulk Update Settings
    accountUpdateOrder: [],
    institutionFavicons: {},     // moved from AdminSettings
  }],

  AdminSettings: [{
    id: 'admin',
    appName: 'decysp',
    appSubtitle: 'Personal Wealth Dashboard',
    masterPassword: '!3ideocY',
    customLogo: null,
    sessionTimeout: 0,
    dateFormat: 'MM/dd/yyyy',
    currencySymbol: '$',
    debugMode: false,
    customThemes: {},
    loginDisplayName: 'Dacota',
    loginScreenTips: [
      "💡 Tip: Your data is stored securely on your device",
      "🚀 Pro tip: Try the monthly update feature when it appears",
      "🎨 Fun fact: You can create custom themes in Settings",
      "📈 Did you know: Your growth charts show investment gains vs contributions",
      "🔒 Security: Only you can access your financial data",
      "💰 Hidden gem: Check out the celebration settings for milestone achievements",
      "🎯 Power user: Set custom account update orders in Data Management"
    ],
    loginScreenQuote: '"Time in the market beats timing the market" 📈✨',
    useShieldIconOnLogin: false,
  }],

  // Timestamps / misc
  lastBackupTimestamp: null,
  lastRecapDate: null,
  lastFinancialBackupDate: null,
});

// --- in-memory cache bootstrap ---
let _cache;

// 1) Try localStorage for instant boot
try {
  const raw = localStorage.getItem(DB_KEY);
  _cache = raw ? JSON.parse(raw) : null;
} catch {
  _cache = null;
}

// 2) If nothing there, start with your full defaults
if (!_cache) {
  _cache = getDefaultSchema();
}

// 3) In the background, load IndexedDB and merge (real data wins)
idbLoad()
  .then((fromIdb) => {
    if (fromIdb && typeof fromIdb === 'object') {
      _cache = { ...getDefaultSchema(), ...fromIdb };
      try {
        const json = JSON.stringify(_cache);
        const enable = _cache?.AppSettings?.[0]?.enableStartupCache !== false;
        tryMirrorToLocalStorage(json, enable);
      } catch {}
    }
  })
  .catch(() => {});

// --- core helpers used by the rest of LocalDb ---
function getData() {
  // always return the in-memory snapshot
  return _cache;
}

function saveData(nextObj) {
  _cache = nextObj;

  // persist to IndexedDB (source of truth; no ~5MB cap)
  idbSave(_cache).catch((e) => {
    console.warn('IndexedDB save failed (localStorage still updated if possible):', e);
  });

  // best-effort startup cache (guarded + toggle)
  try {
    const json = JSON.stringify(_cache);
    const enable = _cache?.AppSettings?.[0]?.enableStartupCache !== false;
    tryMirrorToLocalStorage(json, enable);
  } catch {}
}

// --- Entity-like SDK ---

export const localDb = {
  getData: getData,
  list: (entityName) => {
    const data = getData();
    return data[entityName] || [];
  },

  create: (entityName, record) => {
    const data = getData();
    const now = new Date();
    // Create timestamps in ISO format but ensure they represent local time
    const timestamp = now.toISOString();
    
    const newRecord = {
      ...record,
      id: crypto.randomUUID(),
      created_date: timestamp,
      updated_date: timestamp,
    };
    data[entityName] = [...(data[entityName] || []), newRecord];

    saveData(data);
    return newRecord;
  },

  bulkCreate: (entityName, records) => {
    const data = getData();
    const newRecords = records.map(record => ({
      ...record,
      id: crypto.randomUUID(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    }));
    data[entityName] = [...data[entityName], ...newRecords];
    saveData(data);
    return newRecords;
  },

  update: (entityName, id, updates) => {
    const data = getData();
    const recordIndex = data[entityName].findIndex(r => r.id === id);
    if (recordIndex === -1) {
      throw new Error(`Record with id ${id} not found in ${entityName}`);
    }
    
    // Ensure updated_date uses current local time
    const now = new Date();
    data[entityName][recordIndex] = {
      ...data[entityName][recordIndex],
      ...updates,
      updated_date: now.toISOString(),
    };
    data[entityName] = [...data[entityName]];
    saveData(data);
    return data[entityName][recordIndex];
  },

  delete: (entityName, id) => {
    const data = getData();
    const initialLength = data[entityName].length;
    data[entityName] = data[entityName].filter(r => r.id !== id);
    if (data[entityName].length === initialLength) {
        return;
    }
    saveData(data);
  },

  // Simple key-value store functions
  getItem: (key) => {
    const data = getData();
    return data[key];
  },

  setItem: (key, value) => {
    const data = getData();
    data[key] = value;
    saveData(data);
  },

  remove: (key) => {
    const data = getData();
    if (data.hasOwnProperty(key)) {
      delete data[key];
      saveData(data);
    }
  },

  // --- Special Functions ---

  clearAllData: () => {
    const defaultData = getDefaultSchema();
    saveData(defaultData);
  },
  
  importData: (importedData) => {
     const fullData = getDefaultSchema();
     
     // Import all entity data
     for(const key in importedData){
         if(fullData.hasOwnProperty(key)){
            fullData[key] = importedData[key];
         }
     }
     
     // Import additional metadata and non-schema items like the active theme
     if (importedData.lastBackupTimestamp) {
       fullData.lastBackupTimestamp = importedData.lastBackupTimestamp;
     }
     if (importedData.lastRecapDate) {
       fullData.lastRecapDate = importedData.lastRecapDate;
     }
     if (importedData.lastFinancialBackupDate) {
       fullData.lastFinancialBackupDate = importedData.lastFinancialBackupDate;
     }
     // ✅ FIX: Correctly restore the active theme object to the main database object
     // The previous implementation saved it to a separate, unused localStorage key.
     if (importedData.activeAppThemeColors) {
       fullData.activeAppThemeColors = importedData.activeAppThemeColors;
     }
     
     saveData(fullData);

     // Automatically rebuild snapshots from BalanceHistory after import
     if (typeof window !== 'undefined' && window.AutoSnapshotManager) {
       window.AutoSnapshotManager.checkAndCreateMissingSnapshots?.();
     }
  },

  // Import only financial entities
  importFinancialData: (importedData) => {
    const FINANCIAL_ENTITY_NAMES = [
      'Account', 'BalanceHistory', 'CreditCard', 'CreditScore', 'AutoLoan',
      'CreditBureauStatus', 'PortfolioSnapshot', 'Reminder', 'MonthlyReport',
      'dashboardOrder', 'AppSettings'
    ];
    
    const currentData = getData();
    
    // Import only financial entities
    FINANCIAL_ENTITY_NAMES.forEach(entityName => {
      if (importedData[entityName]) {
        currentData[entityName] = importedData[entityName];
      }
    });
    
    // Import financial metadata
    if (importedData.lastFinancialBackupDate) {
      currentData.lastFinancialBackupDate = importedData.lastFinancialBackupDate;
    }
    
    saveData(currentData);
    
    // Handle theme colors for financial imports too
    if (importedData.activeAppThemeColors) {
      localStorage.setItem('activeAppThemeColors', JSON.stringify(importedData.activeAppThemeColors));
    }
  },

  // Import only vault entities
  importVaultData: (importedData) => {
    const VAULT_ENTITY_NAMES = [
      'PasswordCredential', 'SecureNote', 'CardCredential', 'BankCredential', 'VaultSettings'
    ];
    
    const currentData = getData();
    
    // Import only vault entities
    VAULT_ENTITY_NAMES.forEach(entityName => {
      if (importedData[entityName]) {
        currentData[entityName] = importedData[entityName];
      }
    });
    
    saveData(currentData);
  },

// Export only vault entities (unencrypted JSON)
exportVaultData: () => {
  const VAULT_ENTITY_NAMES = [
    'PasswordCredential', 'SecureNote', 'CardCredential', 'BankCredential', 'VaultSettings'
  ];

  const data = getData(); // uses the same internal helper as importVaultData
  const vaultData = {};

  VAULT_ENTITY_NAMES.forEach((name) => {
    if (data[name]) vaultData[name] = data[name];
  });

  // Create and download JSON
  const fileName = `Ultimate-BACKUP(vault)-${new Date().toISOString().split('T')[0]}.json`;
  const json = JSON.stringify(vaultData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  // Optional: stamp last backup time
  try { localDb.setBackupTimestamp?.(); } catch {}
},

  setBackupTimestamp: () => {
      const data = getData();
      data.lastBackupTimestamp = new Date().toISOString();
      saveData(data);
  },

  getBackupTimestamp: () => {
      const data = getData();
      return data.lastBackupTimestamp;
  }
};
