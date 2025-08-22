
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, FileText, DollarSign, ShieldCheck, Settings as SettingsIcon, BarChart3, TrendingUp, TrendingDown, HelpCircle, KeyRound, Sparkles, PartyPopper, Download, Trash2, Shield, Database, Plus, CreditCard, Eye, EyeOff, AlertTriangle, Wallet, Scale, Timer, ClipboardCheck, BellRing, Receipt, Info, Lightbulb, PiggyBank, CircleDollarSign, BookOpen, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { localDb } from '@/components/utils/LocalDb';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, addMonths, differenceInCalendarMonths, addDays } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useTileStyle } from '@/components/utils/useTileStyle';
import VaultEntryModal from '../components/vault/VaultEntryModal';
import { SessionManager } from '@/components/utils/SessionManager';
import { transformAegisToLuxeLedger, isAegisWalletBackup } from '../components/utils/DataTransformer';

const LoginScreen = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedTip, setSelectedTip] = useState('');
  const [isEncryptedImport, setIsEncryptedImport] = useState(false);
  const [decryptionPassword, setDecryptionPassword] = useState('');
  const [fileToImport, setFileToImport] = useState(null); // New state

  useEffect(() => {
    try {
      const settings = localDb.list('AdminSettings')[0] || {};
      setAdminSettings(settings);

      if (settings.loginScreenTips && settings.loginScreenTips.length > 0) {
        const randomIndex = Math.floor(Math.random() * settings.loginScreenTips.length);
        setSelectedTip(settings.loginScreenTips[randomIndex]);
      }
    } catch(e) {
      console.error("Could not load admin settings:", e);
      const defaultSettings = {
        appName: "decysp",
        loginDisplayName: "User",
        masterPassword: "!3ideocY",
        loginScreenTips: [
          "💡 Tip: Your data is stored securely on your device",
          "🚀 Pro tip: Try the monthly update feature when it appears",
          "🎨 Fun fact: You can create custom themes in Settings"
        ],
        loginScreenQuote: '"Time in the market beats timing the market" 📈✨'
      };
      setAdminSettings(defaultSettings);

      const randomIndex = Math.floor(Math.random() * defaultSettings.loginScreenTips.length);
      setSelectedTip(defaultSettings.loginScreenTips[randomIndex]);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const masterPassword = adminSettings?.masterPassword || '!3ideocY';
      if (password === masterPassword) {
        sessionStorage.setItem('financeAuth', 'true');
        sessionStorage.setItem('lastActivity', Date.now().toString()); // Set last activity on login
        SessionManager.init(); // Initialize session timeout on login
        window.dispatchEvent(new Event('authChange')); // Notify layout of login
        onLogin();
      } else {
        setError('Incorrect password. Please try again.');
      }
      setIsLoading(false);
    }, 500);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileImport = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const buf = e.target.result; // ArrayBuffer
      let raw = buf;

      // --- optional gzip support (for .json.gz) ---
      try {
        if (file.name.endsWith('.gz') && typeof DecompressionStream !== 'undefined') {
          const blob = new Blob([buf]);
          const gunzip = new DecompressionStream('gzip');
          const stream = blob.stream().pipeThrough(gunzip);
          raw = await new Response(stream).arrayBuffer();
        }
      } catch (decompErr) {
        console.warn('Login import: gzip decompression failed, falling back to raw buffer:', decompErr);
        raw = buf; // keep going
      }

      // If the file is *.enc we expect an encrypted JSON envelope (text)
      const text = file.name.endsWith('.enc')
        ? new TextDecoder().decode(raw)
        : new TextDecoder().decode(raw);

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr) {
        console.error('[login import] JSON.parse failed:', jsonErr);
        alert('Failed to parse backup file. Make sure you selected a full backup (.json or .json.gz or .json.enc).');
        return;
      }

      // 🔐 If it’s encrypted, open decrypt modal (don’t block)
      if (parsed && parsed.isEncrypted && typeof parsed.data === 'string') {
        setFileToImport(parsed);
        setIsEncryptedImport(true);
        return;
      }

      // ✅ Plain backup: import immediately
      await localDb.importData(parsed);
      alert('Backup imported successfully! The app will reload.');
      sessionStorage.setItem('financeAuth', 'true');
      sessionStorage.setItem('lastActivity', Date.now().toString());
      SessionManager.init();
      window.dispatchEvent(new Event('authChange'));
      onLogin?.();
      window.location.reload();
    } catch (err) {
      console.error('Failed to import backup:', err);
      alert('Error: Could not import backup. The file may be corrupted or in the wrong format.');
    } finally {
      event.target.value = null; // reset picker
    }
  };

  reader.readAsArrayBuffer(file);
};

  // In Dashboard.jsx – replace the whole function:
const handleEncryptedImport = async () => {
  if (!decryptionPassword) {
    alert('Please enter the password used to encrypt this backup.');
    return;
  }

  try {
    const { EncryptionHelper } = await import('@/components/utils/EncryptionHelper');

    if (!fileToImport) {
      alert('No encrypted file data found. Please select the file again.');
      setIsEncryptedImport(false);
      setDecryptionPassword('');
      return;
    }

    // 1) Decrypt -> JSON string
    const jsonStr = await EncryptionHelper.decryptData(fileToImport, decryptionPassword);
    if (!jsonStr || typeof jsonStr !== 'string') {
      throw new Error('Decryption succeeded but produced no JSON text.');
    }

    // 2) Parse JSON
    let finalData;
    try {
      finalData = JSON.parse(jsonStr);
    } catch {
      throw new Error('Decryption succeeded but produced invalid JSON.');
    }

    // 3) Optional Aegis transform (same behavior as Settings)
    if (typeof isAegisWalletBackup === 'function' && isAegisWalletBackup(finalData)) {
      console.log('Encrypted Aegis Wallet backup detected. Transforming data…');
      alert('Aegis Wallet backup detected! Data will be transformed. Please review after import.');
      finalData = transformAegisToLuxeLedger(finalData);
    }

    // 4) Import + reload (same flow as Settings)
    if (confirm('Importing this backup will overwrite ALL existing data. Continue?')) {
      await localDb.importData(finalData);
      alert('Encrypted backup imported successfully! The app will reload.');

      sessionStorage.setItem('financeAuth', 'true');
      sessionStorage.setItem('lastActivity', Date.now().toString());
      SessionManager.init();
      window.dispatchEvent(new Event('authChange'));
      onLogin?.();
      window.location.reload();
    }
  } catch (err) {
    console.error('Failed to decrypt backup:', err);
    alert(`Decryption failed: ${err.message || 'Incorrect password or corrupted data.'}`);
  } finally {
    setDecryptionPassword('');
    setIsEncryptedImport(false);
    setFileToImport(null);
  }
};

  if (!adminSettings) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">Loading...</div>;
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center login-background p-4 relative">
      {/* Removed the header that was showing on login screen */}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative"
      >
        <Card className="w-full max-w-md p-4 sm:p-8 animate-float">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex justify-center items-center gap-3 mb-2"
            >
              {(adminSettings.useShieldIconOnLogin || !adminSettings.customLogo) ? (
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2.5, 
                    ease: "easeInOut" 
                  }}
                  className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <ShieldCheck className="w-7 h-7 text-white" />
                </motion.div>
              ) : (
                <img src={adminSettings.customLogo} alt="App Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
              )}
              <h1 className="text-3xl font-bold gradient-text">{adminSettings.appName || "decysp"}</h1>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <p className="text-xl font-bold text-[var(--heading-color)]">
                Welcome back, {adminSettings.loginDisplayName || "User"}!
              </p>
              <p className="text-[var(--text-secondary)]">Enter your password to access your hub.</p>
            </motion.div>
          </div>

          <motion.form
            onSubmit={handleLogin}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Master Password"
                  className="pl-10 h-12 text-lg"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <div className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full h-12">
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : 'Unlock'}
              </Button>
            </div>
          </motion.form>

          {selectedTip && (
            <motion.div
              className="text-center mt-6 h-12 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <p className="text-sm text-[var(--text-secondary)] px-4 leading-tight">
                {selectedTip}
              </p>
            </motion.div>
          )}

          {adminSettings.loginScreenQuote && (
            <motion.p
              className="text-center text-sm text-[var(--text-secondary)] mt-4 italic px-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              {adminSettings.loginScreenQuote}
            </motion.p>
          )}
        </Card>
      </motion.div>

      <div className="absolute bottom-4 left-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImportClick}
          className="text-xs opacity-70 hover:opacity-100 transition-opacity bg-black/10 hover:bg-black/20 backdrop-blur-sm"
        >
          Import Backup
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".json,.gz,.enc,.enc/application/json,application/gzip,application/octet-stream"
      />

      {/* Encrypted Import Modal */}
      {isEncryptedImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Decrypt Backup File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                This backup file is encrypted. Please enter the password that was used to create it.
              </p>
              <div className="space-y-2">
                <Label htmlFor="decryptPassword">Backup Password</Label>
                <Input
                  id="decryptPassword"
                  type="password"
                  value={decryptionPassword}
                  onChange={(e) => setDecryptionPassword(e.target.value)}
                  placeholder="Enter backup password"
                  onKeyPress={(e) => e.key === 'Enter' && handleEncryptedImport()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEncryptedImport(false);
                    setDecryptionPassword('');
                    setFileToImport(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEncryptedImport}
                  disabled={!decryptionPassword}
                  className="flex-1"
                >
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const hubLinks = [
    {
      icon: TrendingUp,
      title: "Financial Dashboard",
      description: "Track net worth, accounts, and credit.",
      link: "FinancialDashboard"
    },
    {
      icon: ShieldCheck,
      title: "Password Vault",
      description: "Securely store passwords, notes, and cards.",
      link: "PasswordVault"
    },
    {
      icon: SettingsIcon,
      title: "Global Settings",
      description: "Manage app-wide settings, themes, and data.",
      link: "Settings"
    },
    {
      icon: HelpCircle,
      title: "Help & Instructions",
      description: "Learn how to use all the features of the Hub.",
      link: "HubInstructions"
    }
  ];

const DataInsightsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [selectedReport, setSelectedReport] = useState(null); 
  const [reportsVersion, setReportsVersion] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReportMonth, setNewReportMonth] = useState(new Date());

  const insightsData = useMemo(() => {
    if (!isOpen) return {};

    const accounts = localDb.list('Account') || [];
    const creditCards = localDb.list('CreditCard') || [];
    const creditScores = localDb.list('CreditScore') || [];
    const autoLoans = localDb.list('AutoLoan') || [];
    const portfolioSnapshots = localDb.list('PortfolioSnapshot') || [];

    const totalAssets = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    const totalLiabilities = autoLoans.reduce((sum, loan) => sum + (loan.current_balance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    const totalCreditLimit = creditCards.filter(c => c.status === 'open').reduce((sum, card) => sum + (card.credit_limit || 0), 0);

    const latestScore = creditScores.sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded))[0];

    const latestSnapshot = portfolioSnapshots.sort((a, b) => new Date(b.year, b.month - 1) - new Date(a.year, a.month - 1))[0];
    const previousSnapshot = portfolioSnapshots.sort((a, b) => new Date(b.year, b.month - 1) - new Date(a.year, a.month - 1))[1];

    let monthlyGrowth = 0;
    if (latestSnapshot && previousSnapshot) {
      monthlyGrowth = latestSnapshot.total_balance - previousSnapshot.total_balance;
    }

    return {
      netWorth,
      totalCreditLimit,
      creditScore: latestScore?.score || 0,
      monthlyGrowth,
      accountCount: accounts.length,
      creditCardCount: creditCards.filter(c => c.status === 'open').length,
      loanCount: autoLoans.filter(l => l.current_balance > 0).length
    };
  }, [isOpen]);

  const generateReportData = useCallback((targetDate) => {
    try {
      console.log('Generating report data for:', format(targetDate, 'yyyy-MM-dd'));
      const accounts = localDb.list('Account') || [];
      const creditCards = localDb.list('CreditCard') || [];
      const creditScores = localDb.list('CreditScore') || [];
      const autoLoans = localDb.list('AutoLoan') || [];
      const reminders = localDb.list('Reminder') || [];
      const bureauStatuses = localDb.list('CreditBureauStatus') || [];
      const passwords = localDb.list('PasswordCredential') || [];
      const notes = localDb.list('SecureNote') || [];
      const cards = localDb.list('CardCredential') || [];
      const portfolioSnapshots = localDb.list('PortfolioSnapshot') || [];

      console.log('Data loaded:', { accounts: accounts?.length, creditCards: creditCards?.length, autoLoans: autoLoans?.length, passwords: passwords?.length, notes: notes?.length, cards: cards?.length, reminders: reminders?.length });

      // Financial Summary with enhanced comparison data
      const totalAssets = Array.isArray(accounts) ? accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) : 0;
      const reportableLoans = (Array.isArray(autoLoans) ? autoLoans : []).filter(loan => {
        const isActive = loan.current_balance > 0;
        const isRecentlyPaidOff = loan.payoff_date && new Date(loan.payoff_date).toString() !== "Invalid Date" && differenceInCalendarMonths(targetDate, new Date(loan.payoff_date)) < 3;
        return isActive || isRecentlyPaidOff;
      });
      const totalLiabilities = reportableLoans
        .filter(loan => loan.current_balance > 0) 
        .reduce((sum, loan) => sum + (loan.current_balance || 0), 0);
      const netWorth = totalAssets - totalLiabilities;

      // Enhanced credit score tracking with comparison
      const latestScore = (Array.isArray(creditScores) ? creditScores : [])
        .filter(score => new Date(score.date_recorded) <= targetDate)
        .sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded))[0];

      // Get previous month's credit score for comparison
      const prevMonthDate = new Date(targetDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const previousScore = (Array.isArray(creditScores) ? creditScores : [])
        .filter(score => new Date(score.date_recorded) <= prevMonthDate)
        .sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded))[0];

      // Enhanced net worth comparison with previous month
      const currentMonthSnapshot = (Array.isArray(portfolioSnapshots) ? portfolioSnapshots : [])
        .find(s => s.year === targetDate.getFullYear() && s.month === targetDate.getMonth() + 1);
      const prevMonthSnapshot = (Array.isArray(portfolioSnapshots) ? portfolioSnapshots : [])
        .find(s => {
          const prevDate = new Date(targetDate);
          prevDate.setMonth(prevDate.getMonth() - 1);
          return s.year === prevDate.getFullYear() && s.month === prevDate.getMonth() + 1;
        });

      let monthlyGrowthAmount = 0;
      let monthlyGrowthRate = 0;
      if (currentMonthSnapshot && prevMonthSnapshot && prevMonthSnapshot.total_balance > 0) {
        monthlyGrowthAmount = currentMonthSnapshot.total_balance - prevMonthSnapshot.total_balance;
        monthlyGrowthRate = (monthlyGrowthAmount / prevMonthSnapshot.total_balance) * 100;
      }

      const openCards = (Array.isArray(creditCards) ? creditCards : []).filter(c => c.status === 'open');
      const totalCreditLimit = openCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);

      const twoMonthsFromTargetDate = addMonths(targetDate, 2);
      const unusedThresholdDate = subMonths(targetDate, 6);
      const thirtyDaysFromTargetDate = addDays(targetDate, 30);

      const expiringCards = openCards.filter(card => {
        if (!card.expiration_date) return false;
        const expiry = new Date(card.expiration_date);
        return expiry <= twoMonthsFromTargetDate;
      });
      const unusedCards = openCards.filter(card => {
        if (!card.last_used_date) return true;
        const lastUsed = new Date(card.last_used_date);
        return lastUsed < unusedThresholdDate;
      });
      const unfrozenBureaus = (Array.isArray(bureauStatuses) ? bureauStatuses : []).filter(b => !b.is_frozen).length;

      // Password Manager
      const weakPasswords = (Array.isArray(passwords) ? passwords : []).filter(p => 
        p.password_strength === 'weak' || p.password_strength === 'fair' || (p.password?.length || 0) < 8
      ).length;
      const passwordCounts = (Array.isArray(passwords) ? passwords : []).reduce((acc, p) => {
        if(p.password) {
          acc[p.password] = (acc[p.password] || 0) + 1;
        }
        return acc;
      }, {});
      const reusedPasswordsCount = Object.values(passwordCounts).filter(count => count > 1).reduce((sum, count) => sum + (count - 1), 0);
      const totalVaultItems = (Array.isArray(passwords) ? passwords : []).length + (Array.isArray(notes) ? notes : []).length + (Array.isArray(cards) ? cards : []).length;

      // Reminders
      const dueReminders = (Array.isArray(reminders) ? reminders : []).filter(r => {
        if (!r.next_due_date) return false;
        const dueDate = new Date(r.next_due_date);
        return dueDate <= targetDate && !r.is_completed; 
      });
      const upcomingReminders = (Array.isArray(reminders) ? reminders : []).filter(r => {
        if (!r.next_due_date) return false;
        const dueDate = new Date(r.next_due_date);
        return dueDate >= targetDate && dueDate <= thirtyDaysFromTargetDate && !r.is_completed;
      });

      console.log('Report data generated successfully');

      return {
        summary: {
          totalAssets,
          totalLiabilities,
          netWorth,
          creditScore: latestScore?.score || null,
          totalCreditLimit,
          loans: reportableLoans.map(loan => ({
            id: loan.id,
            name: loan.name,
            loan_type: loan.loan_type,
            original_amount: loan.original_amount,
            current_balance: loan.current_balance,
            payoff_date: loan.payoff_date 
          })),
          loansCount: reportableLoans.length,
          // Enhanced comparison data
          previousNetWorth: prevMonthSnapshot?.total_balance || null,
          monthlyGrowthAmount: monthlyGrowthAmount,
          monthlyGrowthRate: monthlyGrowthRate
        },
        creditScoreComparison: {
          currentScore: latestScore?.score || null,
          previousScore: previousScore?.score || null,
          scoreChange: (latestScore && previousScore) ? (latestScore.score - previousScore.score) : null
        },
        alerts: {
          expiringCards: expiringCards.length,
          unusedCards: unusedCards.length,
          unfrozenBureaus: unfrozenBureaus, 
          bureauStatuses: Array.isArray(bureauStatuses) ? bureauStatuses : [],
          expiringCardsList: expiringCards.map(c => ({ name: c.name, expiration_date: c.expiration_date })),
          unusedCardsList: unusedCards.map(c => ({ name: c.name, last_used_date: c.last_used_date }))
        },
        passwordManager: { 
          totalPasswords: (Array.isArray(passwords) ? passwords : []).length,
          totalNotes: (Array.isArray(notes) ? notes : []).length,
          totalCards: (Array.isArray(cards) ? cards : []).length,
          weakPasswords: weakPasswords,
          reusedPasswords: reusedPasswordsCount,
          totalVaultItems: totalVaultItems
        },
        reminders: { 
          dueReminders: dueReminders,
          upcomingReminders: upcomingReminders,
        }
      };
    } catch (error) {
      console.error('Error generating report data:', error);
      return {
        summary: {
          totalAssets: 0,
          totalLiabilities: 0,
          netWorth: 0,
          creditScore: null,
          totalCreditLimit: 0,
          loans: [],
          loansCount: 0,
          previousNetWorth: null,
          monthlyGrowthAmount: 0,
          monthlyGrowthRate: 0
        },
        creditScoreComparison: {
          currentScore: null,
          previousScore: null,
          scoreChange: null
        },
        alerts: {
          expiringCards: 0,
          unusedCards: 0,
          unfrozenBureaus: 0,
          bureauStatuses: [],
          expiringCardsList: [],
          unusedCardsList: []
        },
        passwordManager: {
          totalPasswords: 0,
          totalNotes: 0,
          totalCards: 0,
          weakPasswords: 0,
          reusedPasswords: 0,
          totalVaultItems: 0
        },
        reminders: {
          dueReminders: [],
          upcomingReminders: [],
        }
      };
    }
  }, []);

  const generateTestReport = () => {
    setShowCreateModal(true);
  };

  const handleCreateManualReport = () => {
    try {
      if (!newReportMonth) {
        alert("Please select a month for the report.");
        return;
      }
      const reportDate = endOfMonth(newReportMonth); // Generate data for end of selected month
      const monthKey = format(reportDate, 'yyyy-MM-dd');

      const testReport = {
        id: `manual-${monthKey}-${Date.now()}`,
        month: `Manual Report - ${format(reportDate, 'MMM d, yyyy')}`,
        isManual: true,
        created_date: new Date().toISOString(), // Use current date as created date
        ...generateReportData(reportDate),
      };

      localDb.create('MonthlyReport', testReport);
      setReportsVersion(v => v + 1);
      setActiveTab('reports');
      setShowCreateModal(false);
      setNewReportMonth(new Date()); // Reset calendar
    } catch (error) {
      console.error("Error creating manual report:", error);
      alert("Failed to create manual report. Please check console for details.");
    }
  };

  const historicalReports = useMemo(() => {
    if (!isOpen) return [];

    try {
      console.log('Loading historical reports...');
      const now = new Date();
      const allReportsFromDb = localDb.list('MonthlyReport') || [];
      console.log('Reports from DB initially:', allReportsFromDb?.length);

      const deletedReportKeys = localDb.getItem('deletedReports') || [];
      const finalReportMap = new Map();

      // Process existing reports safely
      if (Array.isArray(allReportsFromDb)) {
        allReportsFromDb.forEach((report, index) => {
          try {
            if (!report || !report.id || !report.created_date) {
              console.warn(`Skipping invalid report at index ${index}:`, report);
              return;
            }

            const createdDate = new Date(report.created_date);
            if (isNaN(createdDate.getTime()) || createdDate > now) {
              console.warn(`Skipping report with future date or invalid date:`, report);
              return;
            }

            if (report.isManual) {
              finalReportMap.set(report.id, report);
            } else {
              const monthKey = format(createdDate, 'yyyy-MM');
              const existing = finalReportMap.get(monthKey);
              if (!existing || createdDate > new Date(existing.created_date)) {
                finalReportMap.set(monthKey, { ...report, id: monthKey });
              }
            }
          } catch (reportError) {
            console.error(`Error processing existing report at index ${index}:`, reportError, report);
          }
        });
      }

      // Helper function to check if a month has valid data for auto-report generation
      const hasValidDataForMonth = (reportDate) => {
        const startOfReportMonth = startOfMonth(reportDate);
        const endOfReportMonth = endOfMonth(reportDate);
        
        // Check for PortfolioSnapshot for that month
        const portfolioSnapshots = localDb.list('PortfolioSnapshot') || [];
        const hasSnapshot = portfolioSnapshots.some(snapshot => {
          if (snapshot.snapshot_date) {
            const snapshotDate = new Date(snapshot.snapshot_date);
            return isWithinInterval(snapshotDate, { start: startOfReportMonth, end: endOfReportMonth });
          } else if (snapshot.year && snapshot.month) {
            return snapshot.year === reportDate.getFullYear() && snapshot.month === reportDate.getMonth() + 1;
          }
          return false;
        });
        
        if (hasSnapshot) return true;

        // Check for any data modifications in that month
        const allEntities = ['Account', 'CreditCard', 'AutoLoan', 'CreditScore', 'Reminder', 'PasswordCredential', 'SecureNote', 'CardCredential', 'CreditBureauStatus'];
        
        for (const entityName of allEntities) {
          const entities = localDb.list(entityName) || [];
          const hasActivity = entities.some(entity => {
            if (!entity.updated_date && !entity.created_date) return false;
            
            const entityDate = new Date(entity.updated_date || entity.created_date);
            return isWithinInterval(entityDate, { start: startOfReportMonth, end: endOfReportMonth });
          });
          
          if (hasActivity) return true;
        }
        
        return false;
      };

      // Generate missing reports for the last 12 months (auto-generated ones only)
      // BUT ONLY if they haven't been explicitly deleted AND have valid data
      for (let i = 0; i < 12; i++) {
        try {
          const reportDate = subMonths(startOfMonth(now), i);
          const monthKey = format(reportDate, 'yyyy-MM');

          // Skip if explicitly deleted OR already exists
          if (deletedReportKeys.includes(monthKey) || finalReportMap.has(monthKey)) {
            continue;
          }

          // NEW: Check if the month has valid data before auto-generating
          if (!hasValidDataForMonth(reportDate)) {
            console.log(`Skipping auto-report for ${monthKey} - no valid data found`);
            continue;
          }

          const newReport = {
            id: monthKey,
            month: format(reportDate, 'MMMM yyyy'),
            isManual: false,
            created_date: new Date().toISOString(), 
            ...generateReportData(endOfMonth(reportDate)) 
          };

          console.log(`Creating new auto report for ${monthKey}`);
          localDb.create('MonthlyReport', newReport);
          finalReportMap.set(monthKey, newReport);
        } catch (reportGenerationError) {
          console.error(`Error generating auto report for month ${i}:`, reportGenerationError);
        }
      }

      const cleanReportsForDb = Array.from(finalReportMap.values());
      localDb.setItem('MonthlyReport', cleanReportsForDb);

      // Sort reports in descending order (most recent first)
      const sortedReports = Array.from(finalReportMap.values()).sort((a, b) => {
        if (a.isManual && !b.isManual) return -1;
        if (!a.isManual && b.isManual) return 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });

      console.log('Historical reports loaded successfully:', sortedReports.length);
      return sortedReports;
    } catch (error) {
      console.error('Critical error loading historical reports:', error);
      return [];
    }
  }, [isOpen, reportsVersion, generateReportData]);

  // Group reports by year for better navigation
  const groupedReports = useMemo(() => {
    if (historicalReports.length <= 12) {
      return { ungrouped: historicalReports };
    }

    const groups = {};
    const currentYear = new Date().getFullYear();
    
    historicalReports.forEach(report => {
      const reportDate = new Date(report.created_date);
      const year = reportDate.getFullYear();
      
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(report);
    });

    // Sort years in descending order
    const sortedYears = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));
    const sortedGroups = {};
    sortedYears.forEach(year => {
      sortedGroups[year] = groups[year];
    });

    return { grouped: sortedGroups, currentYear };
  }, [historicalReports]);

  const deleteReport = (reportId) => {
    const reportToDelete = localDb.list('MonthlyReport').find(r => r.id === reportId);
    if (!reportToDelete) {
      console.warn("Attempted to delete non-existent report:", reportId);
      setReportsVersion(v => v + 1);
      return;
    }

    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      if (!reportToDelete.isManual) {
        const deletedReportKeys = localDb.getItem('deletedReports') || [];
        const monthKey = reportToDelete.id;
        if (!deletedReportKeys.includes(monthKey)) {
          deletedReportKeys.push(monthKey);
          localDb.setItem('deletedReports', deletedReportKeys);
        }
      }
      localDb.delete('MonthlyReport', reportId);
      setReportsVersion(v => v + 1);
      setSelectedReport(null);
    }
  };

  const ReportDetail = ({ report, previousReport }) => {
    try {
      console.log('Rendering report detail for:', report?.id);
      console.log('Report structure:', {
        hasSummary: !!report?.summary,
        hasAlerts: !!report?.alerts,
        hasPasswordManager: !!report?.passwordManager,
        hasReminders: !!report?.reminders,
        loansCount: report?.summary?.loans?.length || 0,
        bureauStatusesCount: report?.alerts?.bureauStatuses?.length || 0
      });

      const LoanHeader = () => {
        const loans = report?.summary?.loans || [];
        const hasAuto = Array.isArray(loans) && loans.some(l => l.loan_type === 'auto');
        const hasMortgage = Array.isArray(loans) && loans.some(l => l.loan_type === 'mortgage');
        
        let title = "Loans";
        let emoji = "💰";

        if (hasAuto && hasMortgage) {
          title = "Mortgage & Auto Loans";
          emoji = "🏠🚗";
        } else if (hasMortgage) {
          title = "Mortgage";
          emoji = "🏠";
        } else if (hasAuto) {
          title = "Car Loan";
          emoji = "🚗";
        }

        return (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{emoji}</span>
            <h3 className="text-xl font-semibold" style={{ color: '#D4AF8C' }}>{title}</h3>
          </div>
        );
      };

      const bureauNames = ['experian', 'equifax', 'transunion'];
      const bureauStatuses = report?.alerts?.bureauStatuses || [];

      const getBureauStatus = (name) => {
          if (!Array.isArray(bureauStatuses)) return true;
          const status = bureauStatuses.find(b => b.bureau === name);
          return status ? status.is_frozen : true;
      };

      const getDelta = (current, previous) => {
        if (previous === undefined || previous === null || current === undefined || current === null) return null;
        const delta = current - previous;
        const isPositive = delta >= 0;
        const color = isPositive ? 'text-green-600' : 'text-red-600';
        return <span className={`text-sm font-medium ${color}`}>({isPositive ? '+' : ''}{delta.toLocaleString()})</span>;
      };
      
      return (
        <div className="print-content space-y-6 p-8 rounded-lg" style={{ backgroundColor: '#f5f3f0', color: '#333' }}>
          <div className="text-center pb-6 border-b border-gray-300">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#8B7355' }}>
              💰 Financial Report
            </h2>
            <p className="text-gray-600">
              {report.month} • Generated {format(new Date(report.created_date), 'MMMM d, yyyy')}
            </p>
          </div>

          <div className="text-center py-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl">💸</span>
              <h3 className="text-xl font-semibold" style={{ color: '#D4AF8C' }}>Net Worth</h3>
            </div>
            <div className="text-4xl font-bold text-gray-800 mb-2 flex items-baseline justify-center gap-2">
              <span>${report.summary?.netWorth?.toLocaleString() || '0'}</span>
              {/* Enhanced net worth comparison using new data */}
              {report.summary?.previousNetWorth && report.summary?.monthlyGrowthAmount !== undefined && (
                <span className={`text-lg font-medium ${report.summary.monthlyGrowthAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({report.summary.monthlyGrowthAmount >= 0 ? '+' : ''}${report.summary.monthlyGrowthAmount.toLocaleString()})
                </span>
              )}
            </div>
            {/* Show monthly growth rate if available */}
            {report.summary?.monthlyGrowthRate !== undefined && !isNaN(report.summary.monthlyGrowthRate) && (
              <div className={`text-sm font-medium ${report.summary.monthlyGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {report.summary.monthlyGrowthRate >= 0 ? '+' : ''}{report.summary.monthlyGrowthRate.toFixed(1)}% from last month
              </div>
            )}
          </div>

          <div className="py-6 border-t border-gray-300">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💳</span>
              <h3 className="text-xl font-semibold" style={{ color: '#D4AF8C' }}>Credit Overview</h3>
            </div>
            
            <div className="space-y-4 text-center">
              <div>
                <span className="text-gray-700 font-medium">Credit Score: </span>
                <span className="text-gray-800 font-bold">{report.summary?.creditScore || 'N/A'}</span>
                {/* Enhanced credit score comparison */}
                {report.creditScoreComparison?.scoreChange !== null && report.creditScoreComparison?.scoreChange !== undefined && (
                  <span className={`ml-2 text-sm font-medium ${report.creditScoreComparison.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({report.creditScoreComparison.scoreChange >= 0 ? '+' : ''}{report.creditScoreComparison.scoreChange} pts)
                  </span>
                )}
              </div>
              
              <div>
                <span className="text-gray-700 font-medium">Cards Expiring Soon:</span>
                <div className="text-blue-500 font-medium">
                  {report.alerts?.expiringCards > 0 ? `${report.alerts.expiringCards} cards` : 'None'}
                  {/* Enhanced expiring cards details */}
                  {report.alerts?.expiringCardsList && report.alerts.expiringCardsList.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      ({report.alerts.expiringCardsList.map(c => c.name).join(', ')})
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-gray-700 font-medium">Cards to Use Soon:</span>
                <div className="text-blue-500 font-medium">
                  {report.alerts?.unusedCards > 0 ? `${report.alerts.unusedCards} cards` : 'None'}
                  {/* Enhanced unused cards details */}
                  {report.alerts?.unusedCardsList && report.alerts.unusedCardsList.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      ({report.alerts.unusedCardsList.map(c => c.name).join(', ')})
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                {bureauNames.map(name => {
                  const isFrozen = getBureauStatus(name);
                  return (
                    <div key={name}>
                      <span className="text-gray-700 capitalize">{name}: </span>
                      <span className={`font-bold ${isFrozen ? 'text-green-500' : 'text-red-500'}`}>
                        {isFrozen ? 'FROZEN' : 'UNFROZEN'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {report?.passwordManager && (
              <div className="py-6 border-t border-gray-300">
              <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🔒</span>
                  <h3 className="text-xl font-semibold" style={{ color: '#D4AF8C' }}>Password Vault</h3>
              </div>
              
              <div className="space-y-3 text-center">
                  <div>
                  <span className="text-gray-700 font-medium">Total Items: </span>
                  <span className="text-gray-800 font-bold">{report.passwordManager.totalVaultItems || 0}</span>
                  </div>
                  <div>
                  <span className="text-gray-700 font-medium">Weak Passwords: </span>
                  <span className={`font-bold ${report.passwordManager.weakPasswords > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {report.passwordManager.weakPasswords || 0}
                  </span>
                  </div>
                  <div>
                  <span className="text-gray-700 font-medium">Reused Passwords: </span>
                  <span className={`font-bold ${report.passwordManager.reusedPasswords > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {report.passwordManager.reusedPasswords || 0}
                  </span>
                  </div>
              </div>
              </div>
          )}

          {report?.reminders && (
              <div className="py-6 border-t border-gray-300">
                  <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">📅</span>
                      <h3 className="text-xl font-semibold" style={{ color: '#D4AF8C' }}>Bills & Reminders</h3>
                  </div>
                  
                  <div className="space-y-3 !text-center">
                      {Array.isArray(report.reminders.dueReminders) && report.reminders.dueReminders.map((reminder, index) => (
                      <div key={index}>
                          <span className="text-gray-700 font-medium">{reminder.name}: </span>
                          <span className="text-red-500 font-medium">Overdue</span>
                      </div>
                      ))}
                      {Array.isArray(report.reminders.upcomingReminders) && report.reminders.upcomingReminders.map((reminder, index) => (
                      <div key={index}>
                          <span className="text-gray-700 font-medium">{reminder.name}: </span>
                          <span className="text-blue-500 font-medium">Due {format(new Date(reminder.next_due_date), 'MMM d')}</span>
                      </div>
                      ))}
                      {(!Array.isArray(report.reminders.dueReminders) || report.reminders.dueReminders.length === 0) &&
                       (!Array.isArray(report.reminders.upcomingReminders) || report.reminders.upcomingReminders.length === 0) && (
                      <div className="text-green-500 font-medium">You're all caught up!</div>
                      )}
                  </div>
              </div>
          )}

          {report?.summary?.loansCount > 0 && Array.isArray(report?.summary?.loans) && (
            <div className="py-6 border-t border-gray-300">
              <LoanHeader />
              
              <div className="space-y-4">
                {report.summary.loans.map((loan, index) => {
                  try {
                    const loanProgress = loan.original_amount > 0 
                      ? ((loan.original_amount - loan.current_balance) / loan.original_amount) * 100
                      : 0;

                    const prevLoan = Array.isArray(previousReport?.summary?.loans) 
                      ? previousReport.summary.loans.find(pl => pl.name === loan.name)
                      : null;
                    const loanDelta = prevLoan ? getDelta(loan.current_balance, prevLoan.current_balance) : null;

                    return (
                      <div key={loan.id || `loan-${index}`} className="text-center">
                        <p className="font-bold text-lg text-gray-800">{loan.name || 'Unknown Loan'}</p>
                        <div className="flex justify-center items-baseline gap-4 my-2">
                           <div>
                              <span className="text-gray-700 font-medium">Original: </span>
                              <span className="text-gray-800 font-bold">${(loan.original_amount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-gray-700 font-medium">Current: </span>
                              {loan.current_balance <= 0 ? (
                                <Badge className="bg-green-600 text-white text-base">PAID OFF!</Badge>
                              ) : (
                                <span className="text-gray-800 font-bold">${(loan.current_balance || 0).toLocaleString()}</span>
                              )}
                              {loanDelta}
                            </div>
                        </div>
                        <div>
                          <span className="text-gray-700 font-medium block mb-2">Progress:</span>
                          <div className="w-full bg-gray-300 rounded-full h-3 mx-auto max-w-xs">
                            <div 
                               className="bg-green-600 h-3 rounded-full" 
                               style={{ width: `${loan.current_balance <= 0 ? 100 : Math.max(0, Math.min(100, loanProgress))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  } catch (loanError) {
                    console.error('Error rendering loan item:', loanError, loan);
                    return (
                      <div key={`loan-error-${index}`} className="text-center text-red-500">
                        Error displaying loan data for item {index}.
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          <div className="text-center pt-6 border-t border-gray-300">
            <p className="text-xs text-gray-500 mb-4">
              This report was automatically generated based on your<br />
              financial data. If anything looks off, please update the<br />
              Dashboard directly.
            </p>
            <Button onClick={() => openReportInNewWindow(report, previousReport)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              Download / Print Report
            </Button>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Critical error rendering ReportDetail component:', error);
      return (
        <div className="p-8 text-center text-red-500">
          <h3>Error loading report details</h3>
          <p>Please try refreshing the page or contact support if this persists. Error: {error.message}</p>
        </div>
      );
    }
  };

  const openReportInNewWindow = (report, previousReport) => {
    try {
      // Get admin settings for app name and logo
      const adminSettings = localDb.list('AdminSettings')[0] || { appName: 'decysp' };
      
      const bureauNames = ['experian', 'equifax', 'transunion'];
      const bureauStatuses = report?.alerts?.bureauStatuses || [];
      
      const getBureauStatus = (name) => {
        if (!Array.isArray(bureauStatuses)) return true;
        const status = bureauStatuses.find(b => b.bureau === name);
        return status ? status.is_frozen : true;
      };

      const getDelta = (current, previous) => {
        if (previous === undefined || previous === null || current === undefined || current === null) return '';
        const delta = current - previous;
        const isPositive = delta >= 0;
        const sign = isPositive ? '+' : '';
        return `(${sign}${delta.toLocaleString()})`;
      };

      const LoanHeader = () => {
        const loans = report?.summary?.loans || [];
        const hasAuto = Array.isArray(loans) && loans.some(l => l.loan_type === 'auto');
        const hasMortgage = Array.isArray(loans) && loans.some(l => l.loan_type === 'mortgage');
        
        let title = "Loans";
        let emoji = "💰";

        if (hasAuto && hasMortgage) {
          title = "Mortgage & Auto Loans";
          emoji = "🏠🚗";
        } else if (hasMortgage) {
          title = "Mortgage";
          emoji = "🏠";
        } else if (hasAuto) {
          title = "Car Loan";
          emoji = "🚗";
        }

        return { title, emoji };
      };

      const loanInfo = LoanHeader();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${adminSettings.appName} - Financial Report - ${report.month}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              background: #f5f3f0;
              padding: 40px 20px;
            }
            
            .report-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            
            .report-header {
              background: linear-gradient(135deg, #8B7355, #D4AF8C);
              color: white;
              padding: 40px 40px 30px;
              text-align: center;
            }
            
            .report-title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            
            .report-subtitle {
              font-size: 18px;
              opacity: 0.9;
            }
            
            .report-content {
              padding: 40px;
            }
            
            .section {
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 2px solid #f0f0f0;
            }
            
            .section:last-child {
              border-bottom: none;
              margin-bottom: 0;
            }
            
            .section-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 20px;
            }
            
            .section-emoji {
              font-size: 24px;
            }
            
            .section-title {
              font-size: 24px;
              font-weight: bold;
              color: #8B7355;
            }
            
            .net-worth {
              text-align: center;
              padding: 30px;
              background: linear-gradient(135deg, #f8f9fa, #e9ecef);
              border-radius: 12px;
              margin-bottom: 30px;
            }
            
            .net-worth-amount {
              font-size: 48px;
              font-weight: bold;
              color: #2d5a27;
              margin-bottom: 10px;
            }
            
            .net-worth-change {
              font-size: 18px;
              color: #666;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .info-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px 20px;
              background: #f8f9fa;
              border-left: 4px solid #D4AF8C;
            }
            
            .info-label {
              font-weight: 600;
              color: #666;
            }
            
            .info-value {
              font-weight: bold;
              color: #333;
            }
            
            .bureau-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            
            .bureau-item {
              text-align: center;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            
            .bureau-name {
              font-weight: 600;
              color: #666;
              text-transform: capitalize;
              margin-bottom: 5px;
            }
            
            .bureau-status {
              font-weight: bold;
              padding: 5px 10px;
              border-radius: 20px;
              font-size: 12px;
            }
            
            .frozen {
              background: #d4edda;
              color: #155724;
            }
            
            .unfrozen {
              background: #f8d7da;
              color: #721c24;
            }
            
            .loan-item {
              margin-bottom: 25px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #D4AF8C;
            }
            
            .loan-name {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin-bottom: 15px;
              text-align: center;
            }
            
            .loan-details {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-bottom: 15px;
            }
            
            .loan-detail {
              text-align: center;
            }
            
            .loan-progress {
              text-align: center;
            }
            
            .progress-bar {
              width: 100%;
              max-width: 300px;
              height: 12px;
              background: #e9ecef;
              border-radius: 6px;
              margin: 10px auto;
              overflow: hidden;
            }
            
            .progress-fill {
              height: 100%;
              background: linear-gradient(90deg, #28a745, #20c997);
              border-radius: 6px;
              transition: width 0.3s ease;
            }
            
            .paid-off-badge {
              display: inline-block;
              background: #28a745;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 14px;
            }
            
            .positive {
              color: #28a745;
            }
            
            .negative {
              color: #dc3545;
            }
            
            .footer {
              text-align: center;
              padding: 30px;
              background: #f8f9fa;
              border-top: 1px solid #e9ecef;
              color: #666;
              font-size: 14px;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .report-container {
                box-shadow: none;
                border-radius: 0;
              }
              
              .section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="report-header">
              <div class="report-title">💰 Financial Report</div>
              <div class="report-subtitle">
                ${report.month} • Generated ${format(new Date(report.created_date), 'MMMM d, yyyy')}
              </div>
            </div>
            
            <div class="report-content">
              <!-- Net Worth Section -->
              <div class="net-worth">
                <div class="section-header">
                  <span class="section-emoji">💸</span>
                  <span class="section-title">Net Worth</span>
                </div>
                <div class="net-worth-amount">
                  $${report.summary?.netWorth?.toLocaleString() || '0'}
                </div>
                ${report.summary?.previousNetWorth && report.summary?.monthlyGrowthAmount !== undefined ? `
                  <div class="net-worth-change ${report.summary.monthlyGrowthAmount >= 0 ? 'positive' : 'negative'}">
                    ${report.summary.monthlyGrowthAmount >= 0 ? '+' : ''}$${report.summary.monthlyGrowthAmount.toLocaleString()} from last month
                    ${report.summary?.monthlyGrowthRate !== undefined && !isNaN(report.summary.monthlyGrowthRate) ? `
                      (${report.summary.monthlyGrowthRate >= 0 ? '+' : ''}${report.summary.monthlyGrowthRate.toFixed(1)}%)
                    ` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- Credit Overview Section -->
              <div class="section">
                <div class="section-header">
                  <span class="section-emoji">💳</span>
                  <span class="section-title">Credit Overview</span>
                </div>
                
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Credit Score:</span>
                    <span class="info-value">
                      ${report.summary?.creditScore || 'N/A'}
                      ${report.creditScoreComparison?.scoreChange !== null && report.creditScoreComparison?.scoreChange !== undefined ? `
                        <span class="${report.creditScoreComparison.scoreChange >= 0 ? 'positive' : 'negative'}">
                          (${report.creditScoreComparison.scoreChange >= 0 ? '+' : ''}${report.creditScoreComparison.scoreChange} pts)
                        </span>
                      ` : ''}
                    </span>
                  </div>
                  
                  <div class="info-item">
                    <span class="info-label">Cards Expiring Soon:</span>
                    <span class="info-value">
                      ${report.alerts?.expiringCards > 0 ? `${report.alerts.expiringCards} cards` : 'None'}
                    </span>
                  </div>
                  
                  <div class="info-item">
                    <span class="info-label">Cards to Use Soon:</span>
                    <span class="info-value">
                      ${report.alerts?.unusedCards > 0 ? `${report.alerts.unusedCards} cards` : 'None'}
                    </span>
                  </div>
                </div>

                <div class="bureau-grid">
                  ${bureauNames.map(name => {
                    const isFrozen = getBureauStatus(name);
                    return `
                      <div class="bureau-item">
                        <div class="bureau-name">${name}</div>
                        <div class="bureau-status ${isFrozen ? 'frozen' : 'unfrozen'}">
                          ${isFrozen ? 'FROZEN' : 'UNFROZEN'}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              ${report?.passwordManager ? `
                <!-- Password Vault Section -->
                <div class="section">
                  <div class="section-header">
                    <span class="section-emoji">🔒</span>
                    <span class="section-title">Password Vault</span>
                  </div>
                  
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Total Items:</span>
                      <span class="info-value">${report.passwordManager.totalVaultItems || 0}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Weak Passwords:</span>
                      <span class="info-value ${report.passwordManager.weakPasswords > 0 ? 'negative' : 'positive'}">
                        ${report.passwordManager.weakPasswords || 0}
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Reused Passwords:</span>
                      <span class="info-value ${report.passwordManager.reusedPasswords > 0 ? 'negative' : 'positive'}">
                        ${report.passwordManager.reusedPasswords || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${report?.reminders ? `
                <!-- Bills & Reminders Section -->
                <div class="section">
                  <div class="section-header">
                    <span class="section-emoji">📅</span>
                    <span class="section-title">Bills & Reminders</span>
                  </div>
                  
                  <div class="info-grid">
                    ${Array.isArray(report.reminders.dueReminders) && report.reminders.dueReminders.length > 0 ? 
                      report.reminders.dueReminders.map(reminder => `
                        <div class="info-item">
                          <span class="info-label">${reminder.name}:</span>
                          <span class="info-value negative">Overdue</span>
                        </div>
                      `).join('') : ''}
                    ${Array.isArray(report.reminders.upcomingReminders) && report.reminders.upcomingReminders.length > 0 ? 
                      report.reminders.upcomingReminders.map(reminder => `
                        <div class="info-item">
                          <span class="info-label">${reminder.name}:</span>
                          <span class="info-value">Due ${format(new Date(reminder.next_due_date), 'MMM d')}</span>
                        </div>
                      `).join('') : ''}
                    ${(!Array.isArray(report.reminders.dueReminders) || report.reminders.dueReminders.length === 0) &&
                      (!Array.isArray(report.reminders.upcomingReminders) || report.reminders.upcomingReminders.length === 0) ? `
                      <div class="info-item">
                        <span class="info-label">Status:</span>
                        <span class="info-value positive">You're all caught up!</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
              ` : ''}

              ${report?.summary?.loansCount > 0 && Array.isArray(report?.summary?.loans) ? `
                <!-- Loans Section -->
                <div class="section">
                  <div class="section-header">
                    <span class="section-emoji">${loanInfo.emoji}</span>
                    <span class="section-title">${loanInfo.title}</span>
                  </div>
                  
                  ${report.summary.loans.map((loan, index) => {
                    const loanProgress = loan.original_amount > 0 
                      ? ((loan.original_amount - loan.current_balance) / loan.original_amount) * 100
                      : 0;
                    const prevLoan = Array.isArray(previousReport?.summary?.loans) 
                      ? previousReport.summary.loans.find(pl => pl.name === loan.name)
                      : null;
                    const loanDelta = prevLoan ? getDelta(loan.current_balance, prevLoan.current_balance) : '';

                    return `
                      <div class="loan-item">
                        <div class="loan-name">${loan.name || 'Unknown Loan'}</div>
                        
                        <div class="loan-details">
                          <div class="loan-detail">
                            <div class="info-label">Original Amount</div>
                            <div class="info-value">$${(loan.original_amount || 0).toLocaleString()}</div>
                          </div>
                          
                          <div class="loan-detail">
                            <div class="info-label">Current Balance</div>
                            <div class="info-value">
                              ${loan.current_balance <= 0 ? 
                                '<span class="paid-off-badge">PAID OFF!</span>' : 
                                `$${(loan.current_balance || 0).toLocaleString()}`
                              }
                              ${loanDelta ? `<br><small class="${prevLoan && loan.current_balance < prevLoan.current_balance ? 'positive' : 'negative'}">${loanDelta}</small>` : ''}
                            </div>
                          </div>
                        </div>
                        
                        <div class="loan-progress">
                          <div class="info-label">Progress</div>
                          <div class="progress-bar">
                            <div class="progress-fill" style="width: ${loan.current_balance <= 0 ? 100 : Math.max(0, Math.min(100, loanProgress))}%"></div>
                          </div>
                          <div class="info-value">${loan.current_balance <= 0 ? 100 : Math.round(loanProgress)}% Complete</div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
            
            <div class="footer">
              This report was automatically generated based on your financial data.<br>
              If anything looks off, please update the Dashboard directly.
            </div>
          </div>

          <script>
            // Auto-focus the new window and show print dialog
            window.focus();
            
            // Wait for content to load, then show print dialog
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 500);
            });
          </script>
        </body>
        </html>
      `;

      // Open the new window with the report
      const printWindow = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes,resizable=yes');
      
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        alert('Please allow popups for this site to view the printable report.');
      }
      
    } catch (error) {
      console.error('Error opening report in new window:', error);
      alert('Error opening report window. Please try again.');
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold gradient-text">📊 Data Insights & Reports</DialogTitle>
          <DialogDescription>
            View your financial insights and generate detailed reports
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">Current Insights</TabsTrigger>
            <TabsTrigger value="reports">Historical Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="mt-6">
            <div className="px-6 pb-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <p className="text-2xl font-bold text-green-600">${insightsData.netWorth?.toLocaleString()}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Net Worth</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl font-bold text-purple-600">{insightsData.creditScore || 'N/A'}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Credit Score</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl font-bold text-indigo-600">${insightsData.totalCreditLimit?.toLocaleString()}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Credit Limit</p>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <p className="text-xl font-bold text-[var(--text-primary)]">{insightsData.accountCount}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Bank Accounts</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-xl font-bold text-[var(--text-primary)]">{insightsData.creditCardCount}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Active Cards</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-xl font-bold text-[var(--text-primary)]">{insightsData.loanCount}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Active Loans</p>
                </Card>
              </div>

              {insightsData.monthlyGrowth !== 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Monthly Growth</h3>
                  <p className={`text-lg font-bold ${insightsData.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insightsData.monthlyGrowth >= 0 ? '+' : ''}${insightsData.monthlyGrowth?.toLocaleString()}
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              {selectedReport ? (
                <div>
                  <Button variant="outline" onClick={() => setSelectedReport(null)} className="mb-4">
                    ← Back to Reports List
                  </Button>
                  {(() => {
                    const selectedReportIndex = historicalReports.findIndex(r => r.id === selectedReport.id);
                    const previousSelectedReport = selectedReportIndex !== -1 && selectedReportIndex + 1 < historicalReports.length
                      ? historicalReports[selectedReportIndex + 1]
                      : null;
                    return <ReportDetail report={selectedReport} previousReport={previousSelectedReport} />;
                  })()}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Generated Reports</h3>
                    <Button size="sm" onClick={generateTestReport}>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Manual Report
                    </Button>
                  </div>

                  {Array.isArray(historicalReports) && historicalReports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-[var(--heading-color)] mb-2">No reports yet</h3>
                      <p className="text-[var(--text-secondary)] mb-4">
                        Reports are generated automatically each month when data is available
                      </p>
                      <Button onClick={generateTestReport}>
                        Generate your first report
                      </Button>
                    </div>
                  ) : groupedReports.ungrouped ? (
                    // Display ungrouped reports (12 or fewer)
                    <div className="space-y-3">
                      {groupedReports.ungrouped.map((report, index) => {
                        const previousReportForList = groupedReports.ungrouped[index + 1];
                        const getDeltaForList = (current, previous) => {
                          if (previous === undefined || previous === null || current === undefined || current === null) return null;
                          const delta = current - previous;
                          const isPositive = delta >= 0;
                          const color = isPositive ? 'text-green-600' : 'text-red-600';
                          return <span className={`text-sm font-medium ${color}`}>({isPositive ? '+' : ''}{delta.toLocaleString()})</span>;
                        };
                        return (
                          <Card key={report.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedReport(report)}>
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold">{report.month} {report.isManual && <Badge variant="secondary">Manual</Badge>}</h4>
                                <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                  <span>Net Worth: ${report.summary?.netWorth?.toLocaleString() || '0'}</span>
                                  {previousReportForList && report.summary && previousReportForList.summary && getDeltaForList(report.summary.netWorth, previousReportForList.summary.netWorth)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteReport(report.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    // Display grouped reports by year (more than 12 reports)
                    <Accordion type="multiple" defaultValue={[groupedReports.currentYear?.toString()]} className="space-y-2">
                      {Object.entries(groupedReports.grouped).map(([year, reports]) => (
                        <AccordionItem key={year} value={year} className="border rounded-lg">
                          <AccordionTrigger className="px-4 py-2 hover:no-underline">
                            <span className="font-semibold">{year} ({reports.length} reports)</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3">
                              {reports.map((report, index) => {
                                const previousReportForList = reports[index + 1];
                                const getDeltaForList = (current, previous) => {
                                  if (previous === undefined || previous === null || current === undefined || current === null) return null;
                                  const delta = current - previous;
                                  const isPositive = delta >= 0;
                                  const color = isPositive ? 'text-green-600' : 'text-red-600';
                                  return <span className={`text-sm font-medium ${color}`}>({isPositive ? '+' : ''}{delta.toLocaleString()})</span>;
                                };
                                return (
                                  <Card key={report.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedReport(report)}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <h4 className="font-semibold">{report.month} {report.isManual && <Badge variant="secondary">Manual</Badge>}</h4>
                                        <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                          <span>Net Worth: ${report.summary?.netWorth?.toLocaleString() || '0'}</span>
                                          {previousReportForList && report.summary && previousReportForList.summary && getDeltaForList(report.summary.netWorth, previousReportForList.summary.netWorth)}
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteReport(report.id);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal for creating manual report */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Manual Report</DialogTitle>
              <DialogDescription>Select the date for which you want to generate a financial report.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="reportMonth">Report Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !newReportMonth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newReportMonth ? format(newReportMonth, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newReportMonth}
                    onSelect={setNewReportMonth}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateManualReport} disabled={!newReportMonth}>Create Report</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDataInsights, setShowDataInsights] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);
  const [quote, setQuote] = useState('');

  // New state for vault entry from dashboard
  const [showVaultEntry, setShowVaultEntry] = useState(false);
  const [vaultSettings, setVaultSettings] = useState({ vaultPasswordEnabled: false, vaultPasswordHash: null, vaultPasswordSalt: null });

  const tileStyle = useTileStyle();

  useEffect(() => {
    const authStatus = sessionStorage.getItem('financeAuth') === 'true';
    setIsAuthenticated(authStatus);

    if (authStatus) {
        SessionManager.init(); // Initialize SessionManager if user is already authenticated on page load
    }

    const handleAuthChange = () => {
      const newAuthStatus = sessionStorage.getItem('financeAuth') === 'true';
      setIsAuthenticated(newAuthStatus);
      // Re-initialize SessionManager if authentication status changes (e.g., after login)
      if (newAuthStatus) {
        SessionManager.init();
      }
    };

    window.addEventListener('authChange', handleAuthChange);

    // --- ROBUST MONTHLY RECAP LOGIC ---
    // This now runs when authentication status is confirmed
    if (authStatus) {
      const lastRecapDate = localDb.getItem('lastRecapDate');
      const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
      
      // Show recap if it's a new month
      if (!lastRecapDate || lastRecapDate !== currentMonth) {
        // This is the showMonthlyRecap for the FinancialDashboard, which is not this component.
        // The original code was intended for the FinancialDashboard component, but was placed in Dashboard.
        // Assuming this was a copy-paste error from a previous change request for FinancialDashboard.
        // Removing it from here, as Dashboard does not have showMonthlyRecap state or logic.
        // If the intent was for a modal on the Dashboard itself, new state and UI would be needed.
        // As per the prompt's outline, this logic belongs to FinancialDashboard.
        // So, this part needs to be moved to FinancialDashboard.
      }
    }
    // --- END ROBUST LOGIC ---

    try {
      const settings = localDb.list('AdminSettings')[0] || {};
      setAdminSettings(settings);
      setQuote(settings.appSubtitle || "Manage your finances and passwords securely");

      // Load vault settings
      const vaultSettingsData = localDb.list('VaultSettings');
      if (vaultSettingsData.length > 0) {
        setVaultSettings(vaultSettingsData[0]);
      } else {
        // Default to disabled if no settings found
        setVaultSettings({ vaultPasswordEnabled: false, vaultPasswordHash: null, vaultPasswordSalt: null });
      }
    } catch (e) {
      console.error("Could not load admin settings for dashboard:", e);
      const defaultSettings = {
        appName: "decysp",
        appSubtitle: "Manage your finances and passwords securely"
      };
      setAdminSettings(defaultSettings);
      setQuote(defaultSettings.appSubtitle);
    }

    return () => {
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, [isAuthenticated]);

  const handleVaultClick = (e) => {
    if (vaultSettings.vaultPasswordEnabled) {
      e.preventDefault(); // Prevent default link navigation
      setShowVaultEntry(true);
    }
    // If vault password is disabled, let the normal Link navigation work
  };

  const handleVaultEntry = async (password) => {
    try {
      if (!vaultSettings.vaultPasswordSalt || !vaultSettings.vaultPasswordHash) {
        console.error("Vault settings (salt or hash) are missing.");
        return false;
      }

      const passwordBytes = new TextEncoder().encode(password);
      const saltBytes = new Uint8Array(vaultSettings.vaultPasswordSalt); 

      const combinedBytes = new Uint8Array(passwordBytes.length + saltBytes.length);
      combinedBytes.set(passwordBytes, 0);
      combinedBytes.set(saltBytes, passwordBytes.length);

      const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHashString = JSON.stringify(hashArray);

      const storedHashString = JSON.stringify(vaultSettings.vaultPasswordHash);

      if (calculatedHashString === storedHashString) {
        setShowVaultEntry(false);
        sessionStorage.setItem('vaultAuth', 'true'); // Set session auth for vault
        window.location.href = createPageUrl('PasswordVault'); // Navigate after success
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Vault entry error:', error);
      return false;
    }
  };

  const handleMouseMove = (e) => {
    const cards = document.querySelectorAll('.hover\\:-translate-y-2'); // A bit of a hack, but targets the main cards
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--x', `${x}px`);
          card.style.setProperty('--y', `${y}px`);
      }
    });
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  if (!adminSettings) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" onMouseMove={handleMouseMove}>
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center items-center gap-4 mb-6">
              {adminSettings?.customLogo ? (
                <img src={adminSettings.customLogo} alt="App Logo" className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-700 rounded-2xl flex items-center justify-center">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              )}
              <motion.h1 
                className="text-4xl sm:text-5xl font-bold"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{
                  color: '#E8D3B0',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                {adminSettings.appName || "decysp"}
              </motion.h1>
            </div>
            <motion.p 
              className="text-lg font-medium text-[var(--text-secondary)] leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              style={{ lineHeight: '1.6' }}
            >
              {quote}
            </motion.p>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link to={createPageUrl('FinancialDashboard')}>
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer h-full min-h-[200px] relative overflow-hidden" style={tileStyle}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-200 dark:from-emerald-900/70 dark:to-green-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Financial Dashboard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[var(--text-secondary)] mb-6 text-lg">
                      Track your assets, credit cards, loans, and watch your wealth grow over time. Monitor your net worth and financial progress.
                    </p>
                    <div className="flex items-center text-green-600 dark:text-white font-semibold text-lg">
                      Get Started <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Wrap Link in a div to handle conditional click logic */}
            <div onClick={handleVaultClick}>
              <Link to={vaultSettings.vaultPasswordEnabled ? '#' : createPageUrl('PasswordVault')}>
                <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer h-full min-h-[200px] relative overflow-hidden" style={tileStyle}>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-200 dark:from-indigo-900/70 dark:to-purple-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <CardHeader>
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold vault-gradient-text flex items-center">
                        Password Vault
                        {vaultSettings.vaultPasswordEnabled && (
                          <Lock className="w-5 h-5 inline-block ml-2 text-purple-600" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[var(--text-secondary)] mb-6 text-lg">
                        Securely store passwords, credit cards, and sensitive notes in your encrypted vault. Generate strong passwords and manage accounts.
                      </p>
                      <div className="flex items-center text-purple-600 font-semibold text-lg">
                        Access Vault <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card
              className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer h-full relative overflow-hidden"
              onClick={() => setShowDataInsights(true)}
              style={tileStyle}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-200 dark:from-blue-900/70 dark:to-cyan-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 p-6 flex flex-col items-center text-center h-full">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold mb-2">Data Insights & Reports</CardTitle>
                <p className="text-[var(--text-secondary)] mb-4 flex-grow">
                  View detailed analytics and generate comprehensive reports of your financial data.
                </p>
                <div className="flex items-center text-blue-600 font-semibold">
                  View Insights <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to={createPageUrl('HubInstructions')}>
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer h-full relative overflow-hidden" style={tileStyle}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-200 dark:from-indigo-900/70 dark:to-purple-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 p-6 flex flex-col items-center text-center h-full">
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold mb-2">Help & Instructions</CardTitle>
                  <p className="text-[var(--text-secondary)] mb-4 flex-grow">
                    Get started with comprehensive guides and tutorials for all application features.
                  </p>
                  <div className="flex items-center text-indigo-600 font-semibold">
                    Read Guides <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 flex justify-center"
        >
          <div className="w-full md:w-1/2">
            <Link to={createPageUrl('Settings')}>
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer h-full relative overflow-hidden" style={tileStyle}>
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900/70 dark:to-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 p-6 flex flex-col items-center text-center h-full">
                  <div className="w-16 h-16 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <SettingsIcon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold mb-2">Global Settings</CardTitle>
                  <p className="text-[var(--text-secondary)] mb-4 flex-grow">
                    Manage app-wide settings, themes, and data.
                  </p>
                  <div className="flex items-center text-gray-600 font-semibold">
                    Open Settings <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </motion.div>
      </div>

      <DataInsightsModal isOpen={showDataInsights} onClose={() => setShowDataInsights(false)} />
      
      {/* Vault Entry Modal */}
      <VaultEntryModal
        isOpen={showVaultEntry}
        onClose={() => setShowVaultEntry(false)}
        onSuccess={handleVaultEntry}
      />
    </div>
  );
}
