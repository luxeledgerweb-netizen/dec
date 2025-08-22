
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { localDb } from '@/components/utils/LocalDb';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Palette, CheckCircle, Shield, Image as ImageIcon, LogIn, Database, AlertTriangle, Trash2, Upload, Download, ArrowLeft, Save } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ThemeBuilderModal from '../components/admin/ThemeBuilderModal';
import LoginScreenCustomizerModal from '../components/admin/LoginScreenCustomizerModal';
import { useTileStyle } from '@/components/utils/useTileStyle';
import { SessionManager } from '@/components/utils/SessionManager';
import { EncryptionHelper } from '../components/utils/EncryptionHelper';
import AdminPanel from '@/components/admin/AdminPanel';
import StorageHealthTile from '../components/admin/StorageHealthTile';
import { motion } from 'framer-motion';
import { transformAegisToLuxeLedger, isAegisWalletBackup } from '../components/utils/DataTransformer';
import { refreshAfterImport } from '@/components/utils/hardRefresh';
import { exportJson } from '@/components/utils/nativeExport';
import { invDb } from '../inventory/db';

export default function SettingsPage() {
  const [adminSettings, setAdminSettings] = useState({
    appName: 'decysp',
    appSubtitle: 'Personal Wealth Dashboard',
    masterPassword: '',
    customLogo: null,
    sessionTimeout: 0
  });
  // New state for general app settings, assuming these might be distinct from adminSettings
  const [appSettings, setAppSettings] = useState({});

  const [successMessage, setSuccessMessage] = useState('');
  const [isThemeBuilderOpen, setIsThemeBuilderOpen] = useState(false);
  const [isLoginCustomizerOpen, setIsLoginCustomizerOpen] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showClearVaultConfirm, setShowClearVaultConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // States for encrypted import
  const [isEncryptedImport, setIsEncryptedImport] = useState(false);
  const [fileToImport, setFileToImport] = useState(null);
  const [decryptionPassword, setDecryptionPassword] = useState('');

  const tileStyle = useTileStyle();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const settings = localDb.list('AdminSettings')[0] || {};
    setAdminSettings(settings);

    // Load AppSettings
    // Assuming AppSettings is a singleton managed by localDb with a fixed key 'settings'
    const appGlobalSettings = localDb.list('AppSettings')[0] || {}; 
    setAppSettings(appGlobalSettings);
  }, []);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 4000);
  };
  
  const handleSettingsChange = (key, value) => {
    const currentSettings = { ...adminSettings, [key]: value };
    // Directly update localDb and then state.
    // Assuming 'AdminSettings' has a single record with a specific ID 'admin' for direct updates.
    // Note: If localDb primarily uses auto-incrementing numeric IDs, this might need adjustment to
    // fetch the actual ID first (e.g., localDb.list('AdminSettings')[0]?.id)
    localDb.update('AdminSettings', 'admin', { [key]: value });
    setAdminSettings(currentSettings);
    // Dispatch a global event to notify other components of the change
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { updatedSettings: currentSettings } }));
  };

  const handleAppSettingChange = (key, value) => {
    const currentAppSettings = { ...appSettings, [key]: value };
    // Directly update localDb and then state.
    // Assuming 'AppSettings' has a single record with a specific ID 'settings' for direct updates.
    // Note: Similar ID assumption as with AdminSettings applies here.
    localDb.update('AppSettings', 'settings', { [key]: value });
    setAppSettings(currentAppSettings);
    // Dispatch a global event for app settings as well
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { updatedSettings: currentAppSettings } }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (readEvent) => {
            handleSettingsChange('customLogo', readEvent.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please upload a valid image file.');
    }
  };

  const handleRemoveLogo = () => {
    if (confirm('Are you sure you want to remove the custom logo?')) {
      const updatedSettings = { ...adminSettings, customLogo: null };
      setAdminSettings(updatedSettings);
      
      const settings = localDb.list('AdminSettings')[0];
      if (settings) {
          // Update the specific record found in localDb
          localDb.update('AdminSettings', settings.id, { customLogo: null });
      }
      
      // Clear the file input
      const fileInput = document.getElementById('customLogo');
      if (fileInput) {
        fileInput.value = '';
      }
      
      showSuccess('Custom logo removed.');
    }
  };

  const saveAdminSettings = () => {
    const settings = localDb.list('AdminSettings')[0];
    const oldSessionTimeout = settings?.sessionTimeout;
    
    if (settings) {
        localDb.update('AdminSettings', settings.id, adminSettings);
        if (oldSessionTimeout !== adminSettings.sessionTimeout) {
            SessionManager.updateTimeout(adminSettings.sessionTimeout);
        }
    } else {
        // If no AdminSettings record exists, create one.
        // Assuming 'admin' as a default ID for a singleton if localDb supports it,
        // otherwise localDb will assign an auto-incrementing ID.
        localDb.create('AdminSettings', adminSettings); 
    }
    
    // Also save appSettings. If it's a singleton, it should have a fixed ID.
    const appSettingsRecord = localDb.list('AppSettings')[0];
    if (appSettingsRecord) {
        localDb.update('AppSettings', appSettingsRecord.id, appSettings);
    } else {
        localDb.create('AppSettings', appSettings); // Creates a new record for AppSettings
    }

    showSuccess('Settings saved successfully!');
    
    // Only reload if session timeout changed (requires full refresh for session management)
    if (oldSessionTimeout !== adminSettings.sessionTimeout) {
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleThemeSaved = () => {
    showSuccess('Custom theme saved! Activate it from the theme switcher in the header.');
  };

  const handleExportAll = async (isEncrypted = false) => {
    let password = '';
    if (isEncrypted) {
      password = prompt('Please enter a password for the encrypted backup (min 8 characters):');
      if (!password || password.length < 8) {
        alert('Password is required and must be at least 8 characters long.');
        return;
      }
    }

    // This function retrieves the entire data object from localDb, ensuring all entities are included.
    const allData = localDb.getData();
    
    // Manually add the active theme from localStorage, as it's not part of the standard DB schema.
    const activeTheme = localStorage.getItem('activeAppThemeColors');
    if (activeTheme) {
        try {
            allData.activeAppThemeColors = JSON.parse(activeTheme);
        } catch (e) {
            console.warn("Could not parse active theme colors for export.");
        }
    }
    
    // Update the backup timestamp before exporting.
    allData.lastBackupTimestamp = new Date().toISOString();

    let plainText = JSON.stringify(allData, null, 2);
let fileName = `decysp-BACKUP-${new Date().toISOString().split('T')[0]}.json`;

if (isEncrypted && password) {
  try {
    const encryptedData = await EncryptionHelper.encrypt(plainText, password);
    plainText = JSON.stringify({ isEncrypted: true, data: encryptedData });
    fileName += '.enc'; // <-- only once
  } catch (error) {
    console.error("Encryption failed:", error);
    alert("Failed to encrypt the backup. Please try again.");
    return;
  }
}

await exportJson(fileName, plainText);
showSuccess('Full backup exported successfully!');
  };

const handleImportAll = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      // Read raw buffer
      const buf = e.target.result;
      let raw = buf;

      // Optional gzip support for .gz
      try {
        if (file.name.endsWith('.gz') && typeof DecompressionStream !== 'undefined') {
          const blob = new Blob([buf]);
          const gunzip = new DecompressionStream('gzip');
          const stream = blob.stream().pipeThrough(gunzip);
          raw = await new Response(stream).arrayBuffer();
        }
      } catch (decompErr) {
        console.warn('[settings import] gzip decompression failed, falling back to raw buffer:', decompErr);
        raw = buf;
      }

      // Decode to text and parse JSON
      const text = new TextDecoder().decode(raw);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.error('[settings import] JSON.parse failed:', err);
        alert('Failed to parse backup file. Select a full backup (.json / .json.gz / .json.enc).');
        event.target.value = null;
        return;
      }

      // If encrypted, open decrypt modal instead of blocking
      if (parsed && parsed.isEncrypted && typeof parsed.data === 'string') {
        setFileToImport(parsed);
        setIsEncryptedImport(true);
        event.target.value = null;
        return;
      }

      // Optional Aegis transform
      let dataToProcess = parsed;
      if (typeof isAegisWalletBackup === 'function' && isAegisWalletBackup(parsed)) {
        console.log('Aegis Wallet backup detected. Transforming…');
        alert('Aegis Wallet backup detected! Data will be transformed and imported. Please review for accuracy.');
        dataToProcess = transformAegisToLuxeLedger(parsed);
      }

      if (confirm('Are you sure you want to import this backup? This will overwrite ALL current data.')) {
        localDb.importData(dataToProcess);
        alert('Import successful! The application will now reload.');
        refreshAfterImport('/settings', true);
      }
    } catch (err) {
      console.error('[settings import] Post-parse error:', err);
      alert('Failed to import backup. Check the console for details.');
    } finally {
      event.target.value = null; // allow re-selecting the same file
    }
  };

  reader.onerror = (e) => {
    console.error('[settings import] FileReader error:', e);
    alert('Could not read the file.');
    event.target.value = null;
  };

  // Read as ArrayBuffer to support optional gzip path
  reader.readAsArrayBuffer(file);
};

  const handleEncryptedImport = async () => {
    if (!decryptionPassword || !fileToImport) {
        alert('Password is required to decrypt the backup.');
        return;
    }
    try {
        const decryptedDataStr = await EncryptionHelper.decryptData(fileToImport, decryptionPassword);
        let decryptedData = JSON.parse(decryptedDataStr);

        // Apply transformation AFTER decryption
        if (isAegisWalletBackup(decryptedData)) {
            console.log("Encrypted Aegis Wallet backup detected. Transforming data...");
            alert("Aegis Wallet backup detected! Data will be transformed and imported. Please review all imported items for accuracy.");
            decryptedData = transformAegisToLuxeLedger(decryptedData);
        }

        if (confirm('Decryption successful. Are you sure you want to import this backup? This will overwrite ALL current data.')) {
            localDb.importData(decryptedData);
            alert('Encrypted backup imported successfully! The application will now reload.');
            refreshAfterImport();
        }
    } catch (error) {
        alert(`Import failed: ${error.message}. Please check your password or file format.`);
        console.error('Encrypted import error:', error);
    } finally {
        setIsEncryptedImport(false);
        setDecryptionPassword('');
        setFileToImport(null);
    }
  };
  
    const handleClearAllData = async () => {
   if (deleteConfirmation !== 'DELETE ALL') return;
   try {
     // clear everything in parallel (LocalDb + Inventory IndexedDB)
     await Promise.all([
       (async () => { localDb.clearAllData(); })(),
       invDb.clearAll(),               // ← wipes inventory items, folders, and blobs
     ]);
     setShowClearAllConfirm(false);
     setDeleteConfirmation('');
     alert('All app data (including Inventory and images) has been cleared. The app will now reload.');
     await refreshAfterImport('/settings', true);
   } catch (e) {
     console.error('Clear All failed:', e);
     alert('Failed to clear all data. Check console for details.');
   }
 };

  const handleClearVaultData = () => {
    if (deleteConfirmation !== 'DELETE VAULT') return;
    const VAULT_ENTITIES = ['PasswordCredential', 'SecureNote', 'CardCredential', 'BankCredential', 'VaultSettings'];
    VAULT_ENTITIES.forEach(entity => localDb.setItem(entity, []));
    showSuccess('Vault data has been cleared!');
    setShowClearVaultConfirm(false);
    setDeleteConfirmation('');
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <Link to={createPageUrl('Dashboard')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Hub
      </Link>
      
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--heading-color)]">Global Settings</h1>
          <p className="text-[var(--text-secondary)]">Manage app-wide settings, data, and appearance.</p>
        </header>

        {/* Sticky Save Button */}
        <div className="sticky top-4 z-10 flex justify-center mb-6">
          <Button 
            onClick={saveAdminSettings} 
            className="bg-green-600 hover:bg-green-700 shadow-lg"
            title="Saves all settings on this page"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>

        {successMessage && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StorageHealthTile />

          {/* App Identity & Branding */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={tileStyle}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-blue-500" /> App Identity & Branding</CardTitle>
                    <CardDescription>Customize the look and feel of your application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="appName">Application Name</Label>
                        <Input id="appName" value={adminSettings.appName} onChange={(e) => handleSettingsChange('appName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="appSubtitle">Application Subtitle</Label>
                        <Input id="appSubtitle" value={adminSettings.appSubtitle} onChange={(e) => handleSettingsChange('appSubtitle', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customLogo">Custom Logo</Label>
                        <div className="flex items-center gap-4">
                          <Input id="customLogo" type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs"/>
                          {adminSettings.customLogo && <img src={adminSettings.customLogo} alt="Logo Preview" className="h-12 w-12 rounded-md object-cover"/>}
                          {adminSettings.customLogo && <Button variant="destructive" size="sm" onClick={handleRemoveLogo}>Remove</Button>}
                        </div>
                    </div>
                </CardContent>
            </Card>
          </motion.div>

          {/* Security Settings */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={tileStyle}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-500" /> Security Settings</CardTitle>
                    <CardDescription>Manage your master password and session timeout settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="masterPassword">Master Password</Label>
                        <Input id="masterPassword" type="password" value={adminSettings.masterPassword} onChange={(e) => handleSettingsChange('masterPassword', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input id="sessionTimeout" type="number" min="0" value={adminSettings.sessionTimeout} onChange={(e) => handleSettingsChange('sessionTimeout', parseInt(e.target.value, 10))} />
                        <p className="text-xs text-[var(--text-secondary)]">Set to 0 to disable automatic logout.</p>
                    </div>
                </CardContent>
            </Card>
          </motion.div>
          
          {/* Login Screen Customization */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={tileStyle}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LogIn className="w-5 h-5 text-purple-500" /> Login Screen</CardTitle>
                    <CardDescription>Customize the login screen appearance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsLoginCustomizerOpen(true)} className="w-full" variant="outline">Customize Login Screen</Button>
                </CardContent>
            </Card>
          </motion.div>

          {/* Theme Customization */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={tileStyle}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-rose-500" /> 
                      Theme Customization
                    </CardTitle>
                    <CardDescription>Create personalized color schemes for the app.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsThemeBuilderOpen(true)} className="w-full" variant="outline">Open Theme Studio</Button>
                </CardContent>
            </Card>
          </motion.div>

          {/* Backup & Restore */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card style={tileStyle}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-slate-500" /> Backup & Restore</CardTitle>
                    <CardDescription>Export or import all your application data (excluding Inventory).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button onClick={() => handleExportAll(false)} variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Regular Backup
                        </Button>
                        <Button onClick={() => handleExportAll(true)} variant="outline">
                            <Shield className="w-4 h-4 mr-2" />
                            Encrypted Backup
                        </Button>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <label htmlFor="import-all-input" className="cursor-pointer flex items-center justify-center h-full w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Import Backup
                          <input id="import-all-input" type="file" accept=".json,.gz,.enc,application/json,application/gzip,application/octet-stream" onChange={handleImportAll} className="hidden" />
                      </label>
                    </Button>
                </CardContent>
            </Card>
          </motion.div>
          
          {/* Danger Zone */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-destructive/50" style={tileStyle}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 border border-destructive/30 rounded-lg">
                      <h4 className="font-semibold text-destructive">Emergency Vault Reset</h4>
                      <p className="text-sm text-[var(--text-secondary)] my-2">Permanently delete all VAULT data (passwords, notes, cards). This action cannot be undone and is intended for emergency situations where you need to clear sensitive data quickly.</p>
                      <Button variant="destructive" onClick={() => setShowClearVaultConfirm(true)}>
                        <Shield className="w-4 h-4 mr-2" />
                        Clear Vault Data
                      </Button>
                  </div>
                  <div className="p-4 border border-destructive/30 rounded-lg">
                      <h4 className="font-semibold text-destructive">Clear All Data</h4>
                      <p className="text-sm text-[var(--text-secondary)] my-2">Permanently delete ALL application data, including financial records, settings, vault items, and Inventory (folders, items, images). This is irreversible.</p>
                      <Button variant="destructive" onClick={() => setShowClearAllConfirm(true)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All App Data
                      </Button>
                  </div>
                </CardContent>
            </Card>
          </motion.div>
        </div> {/* End of grid for tiles */}
      </div> {/* End of max-w-7xl mx-auto */}
      
      {/* Modals */}
      <ThemeBuilderModal 
        isOpen={isThemeBuilderOpen} 
        onClose={() => setIsThemeBuilderOpen(false)}
        onSaveTheme={handleThemeSaved} 
      />
      <LoginScreenCustomizerModal
        isOpen={isLoginCustomizerOpen}
        onClose={() => setIsLoginCustomizerOpen(false)}
        onSave={() => showSuccess('Login screen settings saved!')}
      />
      
      {/* Confirmation Dialogs */}
      <Dialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <DialogContent>
            <DialogHeader><DialogTitle>Are you absolutely sure?</DialogTitle><DialogDescription>This will permanently delete ALL data. This action cannot be undone.</DialogDescription></DialogHeader>
            <Label htmlFor="confirm-delete-all">Type "DELETE ALL" to confirm.</Label>
            <Input id="confirm-delete-all" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowClearAllConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleClearAllData} disabled={deleteConfirmation !== 'DELETE ALL'}>Delete All Data</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showClearVaultConfirm} onOpenChange={setShowClearVaultConfirm}>
        <DialogContent>
            <DialogHeader><DialogTitle>Are you sure?</DialogTitle><DialogDescription>This will permanently delete all VAULT data (passwords, notes, cards). This action cannot be undone.</DialogDescription></DialogHeader>
            <Label htmlFor="confirm-delete-vault">Type "DELETE VAULT" to confirm.</Label>
            <Input id="confirm-delete-vault" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowClearVaultConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleClearVaultData} disabled={deleteConfirmation !== 'DELETE VAULT'}>Delete Vault Data</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encrypted Import Dialog */}
      <Dialog open={isEncryptedImport} onOpenChange={() => setIsEncryptedImport(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encrypted Backup Detected</DialogTitle>
            <DialogDescription>
              Enter the password to decrypt and import this backup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decryption-password">Password</Label>
            <Input
              id="decryption-password"
              type="password"
              value={decryptionPassword}
              onChange={(e) => setDecryptionPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEncryptedImport()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEncryptedImport(false)}>Cancel</Button>
            <Button onClick={handleEncryptedImport} disabled={!decryptionPassword}>Decrypt & Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
