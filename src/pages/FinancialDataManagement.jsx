
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { localDb } from '@/components/utils/LocalDb';
import { useTileStyle } from '@/components/utils/useTileStyle';
import InstitutionIconManager from '@/components/admin/InstitutionIconManager';
import AccountUpdateOrder from '@/components/admin/AccountUpdateOrder';
import DeletedAccountManager from '@/components/admin/DeletedAccountManager';
import DashboardCustomizer from '@/components/admin/DashboardCustomizer';
import HistoricalDataImport from '@/components/admin/HistoricalDataImport';
import { createPageUrl } from '@/utils';
import { toast } from '@/components/ui/use-toast';
import { AlertTriangle, CheckCircle, Download, Shield, Upload, Trash2, ArrowLeft, Settings } from 'lucide-react';
import { exportJson } from '@/components/utils/nativeExport';

export default function FinancialDataManagement() {
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const fileInputRef = useRef(null);
  const tileStyle = useTileStyle();

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
  };

  const handleExportFinancialData = async () => {
    try {
      const FINANCIAL_ENTITY_NAMES = [
        'Account', 'BalanceHistory', 'CreditCard', 'CreditScore', 'AutoLoan',
        'CreditBureauStatus', 'PortfolioSnapshot', 'Reminder', 'MonthlyReport',
        'dashboardOrder', 'AppSettings'
      ];
      
      const data = localDb.getData();
      const financialData = {};
      
      FINANCIAL_ENTITY_NAMES.forEach(entityName => {
        if (data[entityName]) {
          financialData[entityName] = data[entityName];
        }
      });
      
      if (data.lastFinancialBackupDate) {
        financialData.lastFinancialBackupDate = data.lastFinancialBackupDate;
      }
      
      const activeThemeColors = localStorage.getItem('activeAppThemeColors');
      if (activeThemeColors) {
        financialData.activeAppThemeColors = JSON.parse(activeThemeColors);
      }
      
      financialData.lastFinancialBackupDate = new Date().toISOString();
      localDb.setItem('lastFinancialBackupDate', financialData.lastFinancialBackupDate);

      // 🔧 Fix created_date/updated_date for accounts based on BalanceHistory
      if (financialData.Account && financialData.BalanceHistory) {
        financialData.Account = financialData.Account.map(account => {
          const historyForAccount = financialData.BalanceHistory.filter(
            h => h.account_id === account.id
          );

          if (historyForAccount.length > 0) {
            const earliestDate = new Date(
              historyForAccount.reduce((min, h) =>
                new Date(h.date) < new Date(min) ? h.date : min,
                historyForAccount[0].date
              )
            ).toISOString();

            return {
              ...account,
              created_date: earliestDate,
              updated_date: earliestDate,
            };
          }

          return account;
        });
      }
      
      await exportJson(
        `decysp-BACKUP(financial)-${new Date().toISOString().split('T')[0]}.json`,
        financialData
      );
      showSuccess('Financial backup exported successfully!');

    } catch (error) {
      console.error('Export error:', error);
      showFeedback('error', 'Failed to create backup');
    }
  };

  const handleExportEncryptedFinancialData = async () => {
    try {
      const password = prompt('Enter a password to encrypt your backup:');
      if (!password) return;
      
      const FINANCIAL_ENTITY_NAMES = [
        'Account', 'BalanceHistory', 'CreditCard', 'CreditScore', 'AutoLoan',
        'CreditBureauStatus', 'PortfolioSnapshot', 'Reminder', 'MonthlyReport',
        'dashboardOrder', 'AppSettings'
      ];
      
      const data = localDb.getData();
      const financialData = {};
      
      FINANCIAL_ENTITY_NAMES.forEach(entityName => {
        if (data[entityName]) {
          financialData[entityName] = data[entityName];
        }
      });
      
      const activeThemeColors = localStorage.getItem('activeAppThemeColors');
      if (activeThemeColors) {
        financialData.activeAppThemeColors = JSON.parse(activeThemeColors);
      }
      
      financialData.lastFinancialBackupDate = new Date().toISOString();
      
      const encryptDataStr = JSON.stringify(financialData);
      const encoder = new TextEncoder();
      const data_bytes = encoder.encode(encryptDataStr);
      const password_bytes = encoder.encode(password);
      
      const key = await crypto.subtle.importKey(
        'raw',
        password_bytes,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        key,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        data_bytes
      );
      
      const encryptedData = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      };
      
      const encryptedDataStr = JSON.stringify(encryptedData, null, 2);
      const dataBlob = new Blob([encryptedDataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `luxe-ledger-financial-encrypted-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      showFeedback('success', 'Encrypted financial backup downloaded successfully!');
    } catch (error) {
      console.error('Encrypted export error:', error);
      showFeedback('error', 'Failed to create encrypted backup');
    }
  };

  const handleImportFinancialData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (importedData.salt && importedData.iv && importedData.data) {
          const password = prompt('Enter the password to decrypt this backup:');
          if (!password) return;
          
          try {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            const password_bytes = encoder.encode(password);
            
            const key = await crypto.subtle.importKey(
              'raw',
              password_bytes,
              { name: 'PBKDF2' },
              false,
              ['deriveKey']
            );
            
            const salt = new Uint8Array(importedData.salt);
            const derivedKey = await crypto.subtle.deriveKey(
              {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
              },
              key,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt']
            );
            
            const iv = new Uint8Array(importedData.iv);
            const encryptedData = new Uint8Array(importedData.data);
            
            const decrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: iv },
              derivedKey,
              encryptedData
            );
            
            const decryptedStr = decoder.decode(decrypted);
            const decryptedData = JSON.parse(decryptedStr);
            
            if (confirm('This will replace all your current financial data with the backup data. Are you sure?')) {
              localDb.importFinancialData(decryptedData);
              showFeedback('success', 'Encrypted financial backup imported successfully! Please refresh the page.');
            }
          } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            showFeedback('error', 'Failed to decrypt backup. Please check your password.');
          }
        } else {
          if (confirm('This will replace all your current financial data with the backup data. Are you sure?')) {
            localDb.importFinancialData(importedData);
            showFeedback('success', 'Financial backup imported successfully! Please refresh the page.');
          }
        }
      } catch (error) {
        console.error('Import error:', error);
        showFeedback('error', 'Failed to import backup. Please check the file format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearFinancialData = () => {
    const confirmText = 'DELETE ALL FINANCIAL DATA';
    const userInput = prompt(
      `This will permanently delete ALL financial data including accounts, cards, loans, history, and dashboard settings. This action cannot be undone and will not affect your password vault.\n\nTo confirm, type: ${confirmText}`
    );
    
    if (userInput === confirmText) {
      const FINANCIAL_ENTITY_NAMES = [
        'Account', 'BalanceHistory', 'CreditCard', 'CreditScore', 'AutoLoan',
        'CreditBureauStatus', 'PortfolioSnapshot', 'Reminder', 'MonthlyReport',
        'dashboardOrder', 'AppSettings'
      ];
      
      const data = localDb.getData();
      FINANCIAL_ENTITY_NAMES.forEach(entityName => {
        data[entityName] = [];
      });
      
      // Reset AppSettings to defaults
      data.AppSettings = [{
        id: 'settings',
        showAccountProgressBar: true,
        compactCardView: false,
        showAccountFavicons: true,
        animationSpeed: 'normal',
        showDashboardGreeting: true,
        roundNumbers: false,
        hideZeroBalances: false,
        creditCardSorting: 'recent',
        accountSort: 'default',
        showAllReminders: false,
        showSubscriptionLogos: true,
        unusedCardThresholdMonths: 6,
        accountUpdateOrder: [],
        institutionFavicons: {},
      }];
      
      // Clear dashboard order
      data.dashboardOrder = null;
      data.lastFinancialBackupDate = null;
      
      // Save the cleared data
      localStorage.setItem('luxeLedgerData', JSON.stringify(data));
      
      // Clear theme colors
      localStorage.removeItem('activeAppThemeColors');
      
      showFeedback('success', 'All financial data cleared successfully! Please refresh the page.');
    } else if (userInput !== null) {
      showFeedback('error', 'Confirmation text did not match. Data was not cleared.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
        <div className="flex items-center gap-3 min-w-0">
          <Settings className="w-8 h-8 text-primary flex-shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold truncate">Financial Data Management</h1>
        </div>
        <Link to={createPageUrl('FinancialDashboard')} className="flex-shrink-0">
          <Button variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Feedback */}
      {feedback.message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 
          'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {feedback.message}
        </div>
      )}

      {/* Dashboard Display and Behavior */}
      <Card style={tileStyle} className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Dashboard Display and Behavior
          </CardTitle>
          <CardDescription>
            Customize your dashboard layout and visual preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardCustomizer onUpdate={() => showFeedback('success', 'Dashboard settings updated!')} />
        </CardContent>
      </Card>

      {/* Bulk Update Order */}
      <Card style={tileStyle} className="glass-card">
        <CardHeader>
          <CardTitle>Bulk Update Order</CardTitle>
          <CardDescription>
            Set the order in which accounts appear during bulk updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountUpdateOrder onUpdate={() => showFeedback('success', 'Update order saved!')} />
        </CardContent>
      </Card>

      {/* Add Historical Account Data */}
      <Card style={tileStyle} className="glass-card">
        <CardHeader>
          <CardTitle>Add Historical Account Data</CardTitle>
          <CardDescription>
            Import historical balance data to populate your growth charts
          </CardDescription>
        </CardHeader>
        <CardContent>

        <HistoricalDataImport
        onImportComplete={() => 
          toast({
            title: 'Historical data imported!',
              descriptions: 'Growth chart will update on next dashboard view.',
          })
        }
      />
        </CardContent>
      </Card>

      {/* Manage Account Icons */}
      <Card style={tileStyle} className="glass-card">
        <CardHeader>
          <CardTitle>Manage Account Icons</CardTitle>
          <CardDescription>
            Upload and assign custom icons to your accounts and credit cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstitutionIconManager onUpdate={() => showFeedback('success', 'Icons updated!')} />
        </CardContent>
      </Card>

      {/* Deleted Account Manager */}
      <Card style={tileStyle} className="glass-card">
        <CardHeader>
          <CardTitle>Deleted Accounts</CardTitle>
          <CardDescription>
            These accounts have been deleted but are still retained in historical reports and portfolio snapshots. You may choose to permanently remove them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeletedAccountManager onUpdate={() => showFeedback('success', 'Deleted accounts updated!')} />
        </CardContent>
      </Card>

      {/* Backup & Restore Financials */}
      <Card style={tileStyle} className="glass-card">
        <CardHeader>
          <CardTitle>Backup & Restore Financials</CardTitle>
          <CardDescription>
            Backup or restore only your financial dashboard data. This will not affect your password vault.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleExportFinancialData} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Backup
            </Button>
            <Button onClick={handleExportEncryptedFinancialData} variant="outline" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Download Encrypted Backup
            </Button>
          </div>
          <div className="w-full">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFinancialData}
              accept=".json"
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              className="w-full flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500 bg-red-50 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            Permanently delete all financial data including accounts, cards, loans, history, and dashboard settings. This action cannot be undone and will not affect your password vault.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleClearFinancialData} variant="destructive" className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Clear Financial Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
