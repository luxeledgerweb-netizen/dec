
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Not directly used in the final JSX, but might be used within imported tabs. Keep for safety.
import { Label } from '@/components/ui/label'; // Not directly used in the final JSX, but might be used within imported tabs. Keep for safety.
import { Switch } from '@/components/ui/switch'; // Not directly used in the final JSX, but might be used within imported tabs. Keep for safety.
import { Alert, AlertDescription } from '@/components/ui/alert';
import { localDb } from '@/components/utils/LocalDb';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, // New import
  Shield,
  Wrench,
  Settings2,
  AlertTriangle,
  BarChart2,
  Download,
  Upload,
} from 'lucide-react';

import SecuritySettingsTab from '@/components/vault/settings/SecuritySettingsTab';
import GeneratorSettingsTab from '@/components/vault/settings/GeneratorSettingsTab';
import DisplaySettingsTab from '@/components/vault/settings/DisplaySettingsTab';
import DangerZoneTab from '@/components/vault/settings/DangerZoneTab';
import StatsTab from '@/components/vault/settings/StatsTab';

// VAULT_ENTITY_NAMES and EncryptionHelper are no longer used as backup/restore functionality is removed from this component's UI
// const VAULT_ENTITY_NAMES = ['PasswordCredential', 'SecureNote', 'CardCredential', 'VaultSettings'];

export default function PasswordVaultSettings() {
    const [activeTab, setActiveTab] = useState('security');
    const [vaultSettings, setVaultSettings] = useState({});
    // Removed isExporting, isImporting as backup/restore UI is gone
    const [isWiping, setIsWiping] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef(null);
    // adminSettings is only used for file naming in export, which is removed. Can be removed.
    // const [adminSettings, setAdminSettings] = useState({ appName: 'decysp' });

    const loadSettings = useCallback(() => {
        const settings = localDb.list('VaultSettings')[0] || { id: 'vault' };
        setVaultSettings(settings);
        // Admin settings not needed if export is removed
        // setAdminSettings(localDb.list('AdminSettings')[0] || { appName: 'decysp' });
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const showSuccess = (message) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const showError = (message) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(''), 5000);
    };

    const handleSettingChange = (key, value) => {
        const currentSettings = { ...vaultSettings, [key]: value };
        localDb.update('VaultSettings', vaultSettings.id || 'vault', { [key]: value });
        setVaultSettings(currentSettings);
        showSuccess('Vault setting updated.');
    };

const handleExportVault = () => {
  try {
    localDb.exportVaultData();
    setSuccessMessage('Vault backup downloaded.');
    setTimeout(() => setSuccessMessage(''), 4000);
  } catch (e) {
    console.error(e);
    setErrorMessage('Export failed. Check console for details.');
    setTimeout(() => setErrorMessage(''), 5000);
  }
};

const handleImportVault = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const json = JSON.parse(text);

    const hasKnownKeys = ['PasswordCredential','SecureNote','CardCredential','BankCredential','VaultSettings']
      .some(k => k in json);
    if (!hasKnownKeys) {
      setErrorMessage('This file does not look like a Vault backup.');
      setTimeout(() => setErrorMessage(''), 5000);
      event.target.value = '';
      return;
    }

    if (!confirm('Import this Vault backup? This will OVERWRITE current Vault data (passwords/notes/cards/banks/settings).')) {
      event.target.value = '';
      return;
    }

    await localDb.importVaultData(json);
    setSuccessMessage('Vault backup imported successfully.');
    setTimeout(() => setSuccessMessage(''), 4000);

    // If the list elsewhere depends on state, you can force a refresh:
    // window.location.reload();
  } catch (e) {
    console.error(e);
    setErrorMessage('Failed to parse/import this file. Make sure it is a valid Vault backup JSON.');
    setTimeout(() => setErrorMessage(''), 5000);
  } finally {
    event.target.value = ''; // allow picking the same file again
  }
};

    // Removed handleExportVault as its UI elements are removed
    // Removed handleImportVault as its UI elements are removed

    const handleWipeVault = () => {
        if (confirm('DANGER: Are you absolutely sure you want to permanently delete all vault data? This action cannot be undone.')) {
            if (confirm('FINAL WARNING: This will erase all password, notes, and card credentials. Proceed?')) {
                setIsWiping(true);
                const vaultEntities = ['PasswordCredential', 'SecureNote', 'CardCredential', 'BankCredential'];
                vaultEntities.forEach(entity => localDb.setItem(entity, []));

                setTimeout(() => {
                    setIsWiping(false);
                    showSuccess('All vault data has been permanently deleted.');
                    loadSettings();
                }, 1500);
            }
        }
    };
    
    const tabs = [
        { id: 'security', label: 'Security', icon: Shield, color: 'orange' },
        { id: 'generator', label: 'Generator', icon: Wrench, color: 'blue' },
        { id: 'display', label: 'Display', icon: Settings2, color: 'green' },
	{ id: 'backup', label: 'Backup', icon: Download, color: 'indigo'},
        { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, color: 'red' },
        { id: 'stats', label: 'Stats', icon: BarChart2, color: 'purple' },
    ];

     const tabColorClasses = {
	  orange: 'text-orange-500',
	  blue: 'text-blue-500',
	  green: 'text-green-500',
	  indigo: 'text-indigo-500',
	  red: 'text-red-500',
	  purple: 'text-purple-500',
	};
    
    // TabButton component is no longer used, its logic is directly embedded in the JSX

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('PasswordVault')}>
                            <Button variant="outline" className="w-full sm:w-auto">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Vault
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold vault-gradient-text">Vault Settings</h1>
                    </div>
                </div>
            
                {successMessage && <Alert className="mb-4 bg-green-50 border-green-200 text-green-800"><AlertDescription>{successMessage}</AlertDescription></Alert>}
                {errorMessage && <Alert variant="destructive" className="mb-4"><AlertDescription>{errorMessage}</AlertDescription></Alert>}
            
                <Card style={{ backgroundColor: 'var(--tile-color)' }}>
                    <CardHeader>
                        <CardTitle>Password Vault Configuration</CardTitle>
                        <CardDescription>
                            Manage your vault security settings, display preferences, and data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            <div className="flex overflow-x-auto md:overflow-visible border-b mb-6">
                                <div className="flex space-x-1 min-w-max md:min-w-0">
                                    {tabs.map((tab) => (
                                        <Button
                                            key={tab.id}
                                            variant={activeTab === tab.id ? 'default' : 'ghost'}
                                            onClick={() => setActiveTab(tab.id)}
                                            className="whitespace-nowrap"
                                        >
                                            <tab.icon className={`w-4 h-4 mr-2 ${tabColorClasses[tab.color] || ''}`} />
                                            {tab.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {activeTab === 'security' && <SecuritySettingsTab settings={vaultSettings} onSettingChange={handleSettingChange} showSuccess={showSuccess} />}
                            {activeTab === 'generator' && <GeneratorSettingsTab settings={vaultSettings} onSettingChange={handleSettingChange} />}
                            {activeTab === 'display' && <DisplaySettingsTab settings={vaultSettings} onSettingChange={handleSettingChange} />}
			    {activeTab === 'backup' && (
  <div className="space-y-4">
    <div className="p-4 rounded-md border">
      <h3 className="font-semibold mb-2">Backup & Restore (Vault only)</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Exports/imports only Passwords, Secure Notes, Cards, Bank Credentials, and Vault settings. Does not affect Financial Dashboard data.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleExportVault}>
          <Download className="w-4 h-4 mr-2" />
          Export Vault
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          Import Vault
        </Button>
        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportVault}
        />
      </div>
    </div>
  </div>
)}
                            {activeTab === 'danger' && <DangerZoneTab onWipeVault={handleWipeVault} isWiping={isWiping} />}
                            {activeTab === 'stats' && <StatsTab />}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
