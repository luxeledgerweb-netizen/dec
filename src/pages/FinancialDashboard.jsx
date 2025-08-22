
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import AccountGrid from '@/components/dashboard/AccountGrid';
import CreditCardGrid from '@/components/dashboard/CreditCardGrid';
import { localDb } from '@/components/utils/LocalDb';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import AccountSummary from '@/components/dashboard/AccountSummary';
import GrowthChart from '../components/dashboard/GrowthChart';
import CreditScoreModule from '../components/dashboard/CreditScoreModule';
import  WhatIfCalculator  from '@/components/dashboard/WhatIfCalculator';
import  CreditBureauModules  from '../components/dashboard/CreditBureauModules';
import { RemindersModule } from '@/components/dashboard/reminders/RemindersModule';
import AddAccountModal from '@/components/dashboard/AddAccountModal';
import AddCreditCardModal from '@/components/dashboard/AddCreditCardModal';
import AddCreditScoreModal from '../components/dashboard/AddCreditScoreModal';
import BulkAccountUpdateModal from '@/components/dashboard/BulkAccountUpdateModal';
import MonthlyRecapModal from '../components/dashboard/MonthlyRecapModal';
import { useCountUp } from '../components/utils/useCountUp';
import { useTileStyle } from '@/components/utils/useTileStyle';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Landmark, CreditCard, AlertTriangle, X, CheckCircle, Eye, EyeOff, Settings, ChevronRight, TrendingUp, PiggyBank, Car, ShieldCheck, DollarSign, Zap, Bell, FileUp, Trash2, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, addMonths, subDays, addDays } from 'date-fns';

import  EditAccountModal  from '@/components/dashboard/EditAccountModal';
import  EditCreditCardModal  from '@/components/dashboard/EditCreditCardModal';
import  AddEditAutoLoanModal  from '@/components/dashboard/AddEditAutoLoanModal';
import { useSettings } from '@/components/utils/useSettings';
import  AlertsOverviewModal  from '@/components/dashboard/AlertsOverviewModal';
import { PWAManager } from '@/components/utils/PWAManager';
import { Link } from 'react-router-dom';
import { AutoSnapshotManager } from '@/components/utils/AutoSnapshotManager';
import { cn } from "@/lib/utils"; // Assuming a utility file for class concatenation
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

// CreditCardBenefitsModal (inline, upgraded)
function CreditCardBenefitsModal({ isOpen, onClose, creditCards }) {
  const [q, setQ] = React.useState('');
  const [issuer, setIssuer] = React.useState('all');

  const issuers = React.useMemo(() => {
    const set = new Set(
      (creditCards || [])
        .map(c => (c.institution || '').trim())
        .filter(Boolean)
    );
    return ['all', ...Array.from(set).sort()];
  }, [creditCards]);

  const filtered = React.useMemo(() => {
    const base = (creditCards || []).filter(
      c => c.benefits && c.benefits.trim().length > 0
    );
    const byIssuer = issuer === 'all'
      ? base
      : base.filter(c => (c.institution || '').trim() === issuer);
    const qn = q.trim().toLowerCase();
    if (!qn) return byIssuer;
    return byIssuer.filter(c => {
      const hay = `${c.name || ''} ${c.institution || ''} ${c.benefits || ''}`.toLowerCase();
      return hay.includes(qn);
    });
  }, [creditCards, issuer, q]);

  // group by institution
  const groups = React.useMemo(() => {
    const map = new Map();
    filtered
      .sort((a, b) =>
        (a.institution || '').localeCompare(b.institution || '') ||
        (a.name || '').localeCompare(b.name || '')
      )
      .forEach(card => {
        const key = (card.institution || 'Other').trim() || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(card);
      });
    return Array.from(map.entries()); // [ [issuer, cards[]], ... ]
  }, [filtered]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-600" />
            Credit Card Benefits
          </DialogTitle>
        </DialogHeader>

        {/* controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1">
          <input
            className="col-span-2 border rounded-md px-3 py-2 text-sm outline-none focus:ring"
            placeholder="Search benefits, card names, issuers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          >
            {issuers.map(opt => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All issuers' : opt}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground px-1 mt-1">
          Showing {filtered.length} card{filtered.length === 1 ? '' : 's'}
          {issuer !== 'all' ? ` • ${issuer}` : ''}{q.trim() ? ` • “${q.trim()}”` : ''}
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-14 h-14 text-gray-400 mx-auto mb-3" />
              <div className="text-sm font-medium">No matching cards</div>
              <div className="text-sm text-muted-foreground">Try a different search or issuer.</div>
            </div>
          ) : (
            groups.map(([iss, cards]) => (
              <div key={iss} className="space-y-3">
                <div className="sticky top-0 bg-background/80 backdrop-blur border-b px-1 py-2 font-semibold">
                  {iss}
                </div>
                {cards.map(card => (
                  <Card key={card.id} className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{card.name}</CardTitle>
                      {card.institution && (
                        <p className="text-xs text-muted-foreground">{card.institution}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
                        {card.benefits}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function FinancialDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModal] = useState(false);
  const [isAddScoreModalOpen, setIsAddScoreModal] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [showMonthlyRecap, setShowMonthlyRecap] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [appSettings, setAppSettings] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [autoLoans, setAutoLoans] = useState([]);
  const [creditScores, setCreditScores] = useState([]);
  const [portfolioSnapshots, setPortfolioSnapshots] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [bureauStatuses, setBureauStatuses] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set()); // Fixed: Changed from `new Set()` to `useState(new Set())`
  const [successMessage, setSuccessMessage] = useState('');
  const [showAssetBalances, setShowAssetBalances] = useState(true);
  const [showCardDetails, setShowCardDetails] = useState(true);

  // New state variables from outline
  const [isEditAccountModalOpen, setEditAccountModalOpen] = useState(false);
  const [isEditCardModalOpen, setEditCardModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [isAddLoanModalOpen, setAddLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [isAlertsModalOpen, setAlertsModalOpen] = useState(false);
  const [adminSettings, setAdminSettings] = useState({}); // Add state for admin settings
  // New state for credit card benefits modal
  const [isCreditCardBenefitsModalOpen, setCreditCardBenefitsModalOpen] = useState(false);
  const [selectedCardForBenefits, setSelectedCardForBenefits] = useState(null);

  const showBulkUpdateButton = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastDayOfMonth = endOfMonth.getDate();

    // Condition 1: Is it the last 7 days of the month?
    const isLastWeek = currentDay >= (lastDayOfMonth - 6);

    // Condition 2: Has the update for this month already been done?
    const currentMonthYear = format(today, 'yyyy-MM');
    const lastUpdateMonth = localDb.getItem('lastBulkUpdateMonthYear');
    const hasBeenUpdatedThisMonth = lastUpdateMonth === currentMonthYear;

    // The button should show if it's the last week AND it hasn't been updated this month.
    const shouldShow = isLastWeek && !hasBeenUpdatedThisMonth;
    
    // Debug logging to help troubleshoot
    console.log('Bulk Update Debug:', {
      currentDay,
      lastDayOfMonth,
      isLastWeek,
      currentMonthYear,
      lastUpdateMonth,
      hasBeenUpdatedThisMonth,
      shouldShow,
      accountsLength: accounts.filter(a => !a.is_archived).length
    });
    
    return shouldShow && accounts.filter(a => !a.is_archived).length > 0;
  }, [accounts, refreshKey]); // Added refreshKey to ensure this re-evaluates after an update

  // Layout management
  const [componentOrder, setComponentOrder] = useState(() => {
    const savedOrder = localDb.getItem('dashboardOrder');
    
    // Migration: Convert old layout to new granular layout
    if (savedOrder) {
      const migratedOrder = savedOrder.map(componentId => {
        switch (componentId) {
          case 'accounts-and-cards':
            return ['accounts', 'credit-cards'];
          case 'growth-and-reminders':
            return ['growth-chart', 'reminders'];
          case 'credit-and-bureaus':
            return ['credit-score', 'growth-calculator', 'credit-bureaus'];
          default:
            return componentId;
        }
      }).flat();
      
      // Save the migrated order
      localDb.setItem('dashboardOrder', migratedOrder);
      return migratedOrder;
    }
    
    return [
      'summary',
      'accounts',
      'credit-cards',
      'growth-chart',
      'reminders',
      'credit-score',
      'growth-calculator',
      'credit-bureaus'
    ];
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // Use the new useSettings hook
  const { settings } = useSettings();
  // Pass settings to useTileStyle as per outline
  const tileStyle = useTileStyle(settings);

  // Function to load all data from localDb
  const loadDashboardData = useCallback(() => {
    // Run auto snapshot check on dashboard load
    AutoSnapshotManager.checkAndCreateMissingSnapshots();
    console.log('[Snapshot Manager] Auto snapshot check triggered.');

    setIsLoading(true);
  
    
    const appSettingsData = localDb.list('AppSettings')[0] || {};
    setAppSettings(appSettingsData);
    setAdminSettings(localDb.list('AdminSettings')[0] || {}); // Load admin settings
    
    setAccounts(localDb.list('Account').filter(a => !a.is_archived).sort((a,b) => new Date(b.updated_date) - new Date(a.updated_date)));
    
    // AUDIT: Log the raw credit cards from database
    const rawCreditCards = localDb.list('CreditCard');
    console.log('[AUDIT] Raw credit cards from database:', rawCreditCards);
    if (rawCreditCards.length > 0) {
      console.log('[AUDIT] First credit card object:', rawCreditCards[0]);
      console.log('[AUDIT] institution_website field exists:', 'institution_website' in rawCreditCards[0]);
      console.log('[AUDIT] institution_website value:', rawCreditCards[0].institution_website);
    }
    
    setCreditCards(rawCreditCards);
    setAutoLoans(localDb.list('AutoLoan'));
    setCreditScores(localDb.list('CreditScore').sort((a, b) => new Date(b.date_recorded) - new Date(a.date_recorded)));
    setPortfolioSnapshots(localDb.list('PortfolioSnapshot'));
    setBalanceHistory(localDb.list('BalanceHistory'));
    setBureauStatuses(localDb.list('CreditBureauStatus'));
    setReminders(localDb.list('Reminder'));
    setIsLoading(false);
  }, []);

  // This is the function that triggers a re-fetch of all data and handles post-update logic.
  const handleDataUpdate = useCallback(async (updatedItemType) => {
    // Capture old loan state from the *database* before any potential updates caused by upstream components (modals)
    const oldLoansDbState = localDb.list('AutoLoan');
    
    // Trigger the actual data refresh in state
    setRefreshKey(prev => prev + 1);

    // Add a small delay to allow `useEffect` that depends on `refreshKey` to potentially process
    // and for `localDb.list` to return the absolute latest state if it was just written to.
    await new Promise(resolve => setTimeout(resolve, 50));

    const newLoansDbState = localDb.list('AutoLoan');

    const paidOffLoan = newLoansDbState.find(newLoan => {
        const oldLoan = oldLoansDbState.find(ol => ol.id === newLoan.id);
        return oldLoan && oldLoan.current_balance > 0 && newLoan.current_balance <= 0;
    });
    
    if(updatedItemType === 'Bulk Account Update') {
        const today = new Date();
        const currentMonthYear = format(today, 'yyyy-MM');
        localDb.setItem('lastBulkUpdateMonthYear', currentMonthYear);
        setSuccessMessage('Account balances updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
    } else if(updatedItemType) {
        setSuccessMessage(`${updatedItemType} updated successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
    }
  }, []);

  // FIX: Harmonize all data update handlers to use the reliable refresh mechanism
  const handleCardAdded = () => {
    handleDataUpdate('Credit Card');
  };

  const handleCardUpdated = () => {
    handleDataUpdate('Credit Card');
  };
  
  const handleAccountUpdated = () => {
      handleDataUpdate('Account');
  };

  const handleAccountAdded = () => {
      handleDataUpdate('Account');
  };

  // Function to restore default layout
  const handleRestoreDefaultLayout = useCallback(() => {
    localDb.removeItem('dashboardOrder'); // Clear saved order
    // Reset to the default order
    setComponentOrder([
        'summary',
        'accounts',
        'credit-cards',
        'growth-chart',
        'reminders',
        'credit-score',
        'growth-calculator',
        'credit-bureaus'
    ]);
    setIsEditMode(false); // Exit edit mode
    setSuccessMessage('Dashboard layout reset to default!');
    setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  // This useEffect actually loads data when refreshKey or loadDashboardData (due to currentMilestone change)
  useEffect(() => {
    // Auth Check
    if (sessionStorage.getItem('financeAuth') !== 'true') {
      window.location.href = createPageUrl('Dashboard');
      return;
    }
    
    // Only scroll to top on initial page load, not on data updates
    if (refreshKey === 0) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    
    loadDashboardData();
    
    // Add listener for settings changes to reload data
    window.addEventListener('settingsChanged', loadDashboardData);
    
    return () => {
        window.removeEventListener('settingsChanged', loadDashboardData);
    };
  }, [refreshKey, loadDashboardData]);

  // Layout editing functions
  const saveLayout = useCallback(() => {
    localDb.setItem('dashboardOrder', componentOrder);
    setIsEditMode(false);
  }, [componentOrder]);

  const cancelLayoutEdit = useCallback(() => {
    const savedOrder = localDb.getItem('dashboardOrder');
    if (savedOrder) {
      setComponentOrder(savedOrder);
    }
    setIsEditMode(false);
  }, []);

  // Event listeners for layout controls from Layout component
  useEffect(() => {
    const handleToggle = () => setIsEditMode(prev => !prev);
    const handleSave = () => saveLayout();
    const handleCancel = () => cancelLayoutEdit();

    window.addEventListener('toggleLayoutEdit', handleToggle);
    window.addEventListener('saveLayoutEdit', handleSave);
    window.addEventListener('cancelLayoutEdit', handleCancel);

    return () => {
      window.removeEventListener('toggleLayoutEdit', handleToggle);
      window.removeEventListener('saveLayoutEdit', handleSave);
      window.removeEventListener('cancelLayoutEdit', handleCancel);
    };
  }, [saveLayout, cancelLayoutEdit]);

  // Notify layout component of edit mode changes
  useEffect(() => {
    const event = new CustomEvent('layoutEditStateChanged', { detail: { isEditMode } });
    window.dispatchEvent(event);
  }, [isEditMode]);

  useEffect(() => {
    const lastRecapDate = localDb.getItem('lastRecapDate');
    const today = new Date();
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // Format: "2024-01"
    
    if (lastRecapDate !== currentMonthYear) {
        setShowMonthlyRecap(true);
        localDb.setItem('lastRecapDate', currentMonthYear);
    }
  }, []);

  const { totalBalance, totalCreditLimit, accountsCount, creditCardsCount, monthlyGrowthRate, monthlyGrowthAmount, totalAssetBalance } = useMemo(() => {
    const totalAssetBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    // Exclude mortgages from loan balance calculation for net worth
    const totalLoanBalance = autoLoans
      .filter(loan => loan.loan_type !== 'mortgage')
      .reduce((sum, loan) => sum + (loan.current_balance || 0), 0);
    const totalBalance = totalAssetBalance - totalLoanBalance;
    
    // Restore correct logic: Only count 'open' credit cards for limit and count
    const openCreditCards = creditCards.filter(c => c.status === 'open');
    const totalCreditLimit = openCreditCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);

    const currentMonthSnapshot = portfolioSnapshots.find(s => s.year === new Date().getFullYear() && s.month === new Date().getMonth() + 1);
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthSnapshot = portfolioSnapshots.find(s => s.year === prevMonthDate.getFullYear() && s.month === prevMonthDate.getMonth() + 1);

    let monthlyGrowthRate = 0;
    let monthlyGrowthAmount = 0;
    if (currentMonthSnapshot && prevMonthSnapshot && prevMonthSnapshot.total_balance > 0) {
        monthlyGrowthAmount = currentMonthSnapshot.total_balance - prevMonthSnapshot.total_balance;
        monthlyGrowthRate = (monthlyGrowthAmount / prevMonthSnapshot.total_balance) * 100;
    }

    return {
      totalBalance,
      totalCreditLimit,
      accountsCount: accounts.filter(a => !a.is_archived).length,
      creditCardsCount: openCreditCards.length, // Count only open cards
      monthlyGrowthRate,
      monthlyGrowthAmount,
      totalAssetBalance
    };
  }, [accounts, creditCards, autoLoans, portfolioSnapshots]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    const today = new Date();
    // Use adminSettings from state now for reactivity
    const displayName = adminSettings.loginDisplayName || 'there';
    
    let greeting;
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    // Check if it's March 27th (birthday)
    if (today.getMonth() === 2 && today.getDate() === 27) {
      return `${greeting}, ${displayName}! 🎉 Happy Birthday! 🎂`;
    }
    
    return `${greeting}, ${displayName}! 👋`;
  };

  // Get alerts for the dashboard
  const { alerts, cardAlertsCount, reminderAlertsCount } = useMemo(() => {
    const allAlerts = [];
    let currentCardAlertsCount = 0;
    let currentReminderAlertsCount = 0;

    const openCards = creditCards.filter(c => c.status === 'open');
    const now = new Date();
    const isDebugMode = adminSettings?.debugMode === true; // Added from outline

    // Check for unfrozen credit bureaus
    const unfrozenBureaus = bureauStatuses.filter(status => !status.is_frozen);
    const bureauAlertId = 'unfrozen-bureaus';
    
    if (unfrozenBureaus.length > 0 && !dismissedAlerts.has(bureauAlertId)) {
      allAlerts.push({
        id: bureauAlertId,
        type: 'warning',
        title: 'Credit Bureau Alert',
        message: `${unfrozenBureaus.length} credit bureau${unfrozenBureaus.length > 1 ? 's' : ' is'} unfrozen: ${unfrozenBureaus.map(b => b.bureau.charAt(0).toUpperCase() + b.bureau.slice(1)).join(', ')}`
      });
    }

    // Credit Card Alerts
    const unusedThresholdMonths = appSettings?.unusedCardThresholdMonths || 6; // From outline
    
    openCards.forEach(card => {
      // Unused card alerts
      if (card.last_used_date) {
        const lastUsed = new Date(card.last_used_date);
        
        // New, precise calculation for fractional months as per outline
        const thresholdMonthsInt = Math.floor(unusedThresholdMonths);
        const thresholdDaysDecimal = (unusedThresholdMonths % 1) * 30.4375; // Avg days in a month
        const thresholdDate = subDays(subMonths(now, thresholdMonthsInt), thresholdDaysDecimal);

        if (isDebugMode) {
          console.log(
            `[Debug] Unused Card Check for ${card.name}:
            - Last Used: ${lastUsed.toLocaleDateString()}
            - Threshold: ${unusedThresholdMonths} months
            - Calculated Alert Date: ${thresholdDate.toLocaleDateString()}
            - Alert Triggered: ${lastUsed <= thresholdDate}`
          );
        }
        
        if (lastUsed <= thresholdDate) {
          allAlerts.push({
            id: `unused-${card.id}`,
            type: 'warning',
            message: `${card.name} hasn't been used in over ${unusedThresholdMonths} months. Use it soon to keep it active.`,
            source: 'credit-card',
            sourceId: card.id,
          });
          currentCardAlertsCount++;
        }
      } else {
        // If no last used date, assume it's unused for a long time
        allAlerts.push({
          id: `unused-${card.id}`,
          type: 'warning',
          message: `${card.name} has no recorded usage date. Consider using it or updating its last used date.`,
          source: 'credit-card',
          sourceId: card.id,
        });
        currentCardAlertsCount++;
      }

      // Expiring card alerts - Changed from 2 months to 1 month for global banner
      if (card.expiration_date) {
        const oneMonthFromNow = addMonths(now, 1); // Changed from addMonths(now, 2)
        const expirationDate = new Date(card.expiration_date);
        
        if (expirationDate <= oneMonthFromNow) {
          allAlerts.push({
            id: `expiring-${card.id}`, // Unique ID for each expiring card
            type: 'warning',
            message: `${card.name} expires on ${expirationDate.toLocaleDateString()}.`,
            source: 'credit-card',
            sourceId: card.id,
          });
          currentCardAlertsCount++;
        }
      }
    });

    // Check for due subscriptions/bills with improved logic (existing logic)
    reminders.forEach(reminder => {
      if (!reminder.next_due_date || reminder.is_completed) return;
      
      const dueDate = new Date(reminder.next_due_date);
      // Adjust for timezone consistency
      dueDate.setMinutes(dueDate.getMinutes() + dueDate.getTimezoneOffset());
      
      // Calculate alert window based on frequency
      let alertDays = 5; // Default fallback
      switch (reminder.frequency) {
        case 'monthly':
          alertDays = 7;
          break;
        case 'bi_annually':
        case 'semi_annually':
          alertDays = 14;
          break;
        case 'yearly':
        case 'annually':
          alertDays = 30;
          break;
      }
      
      const alertDate = addDays(now, alertDays); // Use date-fns addDays for consistency
      
      // Item is alertable if due date is within alert window OR overdue
      if (dueDate <= alertDate) {
        currentReminderAlertsCount++;
      }
    });
    
    // Add reminder alert to main alerts if there are any
    if (currentReminderAlertsCount > 0) {
      const dueReminders = reminders.filter(reminder => {
        if (!reminder.next_due_date || reminder.is_completed) return false;
        
        const dueDate = new Date(reminder.next_due_date);
        dueDate.setMinutes(dueDate.getMinutes() + dueDate.getTimezoneOffset());
        
        let alertDays = 5;
        switch (reminder.frequency) {
          case 'monthly': alertDays = 7; break;
          case 'bi_annually':
          case 'semi_annually': alertDays = 14; break;
          case 'yearly':
          case 'annually': alertDays = 30; break;
        }
        
        const alertDate = addDays(now, alertDays); // Use date-fns addDays
        
        return dueDate <= alertDate;
      });
      
      allAlerts.push({
        id: 'due-reminders',
        type: 'info',
        title: 'Bills & Subscriptions Due Soon',
        message: `${currentReminderAlertsCount} item${currentReminderAlertsCount > 1 ? 's' : ''} due within alert window: ${dueReminders.map(r => r.name).join(', ')}`
      });
    }

    return { alerts: allAlerts.filter(alert => !dismissedAlerts.has(alert.id)), cardAlertsCount: currentCardAlertsCount, reminderAlertsCount: currentReminderAlertsCount };
  }, [creditCards, bureauStatuses, reminders, dismissedAlerts, appSettings.unusedCardThresholdMonths, adminSettings]); // Added adminSettings to dependencies

  const handleDismissAlerts = () => {
    const alertIds = alerts.map(a => a.id);
    setDismissedAlerts(new Set(alertIds));
  };

  const handleDismissSingleAlert = (alertId) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.add(alertId);
      return newSet;
    });
  };

  // Reset dismissed alerts when leaving/returning to page
  useEffect(() => {
    return () => {
      setDismissedAlerts(new Set());
    };
  }, []);

  const handleDragEnd = (result) => {
    if (!result.destination || !isEditMode) return;

    const newOrder = Array.from(componentOrder);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    setComponentOrder(newOrder);
  };

  const renderComponent = (componentId) => {
    switch (componentId) {
      case 'summary':
        return (
            <AccountSummary
              totalBalance={totalBalance}
              totalCreditLimit={totalCreditLimit}
              accountsCount={accountsCount}
              creditCardsCount={creditCardsCount}
              monthlyGrowthRate={monthlyGrowthRate}
              monthlyGrowthAmount={monthlyGrowthAmount}
              autoLoans={autoLoans}
              onDataUpdate={() => handleDataUpdate()}
              portfolioSnapshots={portfolioSnapshots}
              balanceHistory={balanceHistory}
              accounts={accounts}
              creditCards={creditCards}
            />
        );

      case 'accounts':
        return (
            <div className="group relative">
              <Card style={tileStyle} className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-green-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <Landmark className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className="text-xl font-bold">Assets</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowAssetBalances(prev => !prev)}
                            title={showAssetBalances ? 'Hide Balances' : 'Show Balances'}
                        >
                            {showAssetBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                            onClick={() => setIsAddAccountModalOpen(true)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Account
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* AUDIT: Log what's being passed to AccountGrid */}
                    {console.log('[AUDIT] Accounts being passed to AccountGrid:', accounts)}
                    <AccountGrid
                        accounts={accounts}
                        onAccountUpdate={handleAccountUpdated}
                        accountSort={appSettings.accountSort}
                        compactView={appSettings.compactCardView}
                        showBalances={showAssetBalances}
                        onEdit={(account) => {
                          setEditingAccount(account);
                          setEditAccountModalOpen(true);
                        }}
                    />
                  </CardContent>
                </div>
              </Card>
            </div>
        );

      case 'credit-cards':
        return (
            <div className="group relative">
              <Card style={tileStyle} className={cn("h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-500 overflow-hidden")}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Credit Cards
                          {cardAlertsCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {cardAlertsCount}
                            </Badge>
                          )}
                        </CardTitle>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCardDetails(!showCardDetails)}
                          className="flex items-center gap-1"
                          title={showCardDetails ? 'Hide Card Details' : 'Show Card Details'}
                        >
                          {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreditCardBenefitsModalOpen(true)}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                          title="View Benefits"
                        >
                          <Gift className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddCardModal(true)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Card
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* AUDIT: Log what's being passed to CreditCardGrid */}
                    {console.log('[AUDIT] Credit cards being passed to CreditCardGrid:', creditCards)}
                    {creditCards.length > 0 && console.log('[AUDIT] First card being passed to grid:', creditCards[0])}
                    <CreditCardGrid
                      creditCards={creditCards}
                      onCreditCardUpdate={handleCardUpdated}
                      compactView={appSettings.compactCardView}
                      showDetails={showCardDetails}
                      alerts={alerts}
                      onEdit={(card) => {
                        setEditingCard(card);
                        setEditCardModalOpen(true);
                        if (isCreditCardBenefitsModalOpen && selectedCardForBenefits && selectedCardForBenefits.id === card.id) {
                            setCreditCardBenefitsModalOpen(false);
                            setSelectedCardForBenefits(null);
                        }
                      }}
                    />
                  </CardContent>
                </div>
              </Card>
            </div>
        );

      case 'growth-chart':
        return (
            <GrowthChart
                accounts={accounts}
                autoLoans={autoLoans}
                snapshots={portfolioSnapshots}
                history={balanceHistory}
                liveNetWorth={totalBalance}
                liveAssetBalance={totalAssetBalance}
            />
        );

      case 'reminders':
        return (
            <RemindersModule
                reminders={reminders}
                onDataUpdate={() => handleDataUpdate()}
                alertsCount={reminderAlertsCount}
            />
        );

      case 'credit-score':
        return (
            <CreditScoreModule creditScores={creditScores} onScoreAdded={() => handleDataUpdate('Credit Score')} />
        );

      case 'growth-calculator':
        return (
            <WhatIfCalculator />
        );

      case 'credit-bureaus':
        return (
            <CreditBureauModules bureauStatuses={bureauStatuses} onUpdate={() => handleDataUpdate('Credit Bureau Status')} />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Add this mouse move handler to the main dashboard container
  const handleMouseMove = (e) => {
    const cards = document.querySelectorAll('.hover\\:-translate-y-1, .hover\\:-translate-y-2');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });
  };

  return (
    <div
      className="w-full"
      onMouseMove={handleMouseMove}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors p-0 shadow-lg" onClick={() => setAlertsModalOpen(true)}>
                <div className="flex w-full items-center p-4">
                  <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                  <div className="flex-1 cursor-pointer px-4">
                    <AlertDescription className="text-orange-800 dark:text-orange-300">
                      <strong>You have {alerts.length} alert{alerts.length > 1 ? 's' : ''}</strong> - Click to view details
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-orange-600 hover:text-orange-800 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDismissAlerts(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Greeting and Update Section */}
        <div className="space-y-4">
          {/* Greeting */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[var(--heading-color)]">
              {getGreeting()}
            </h1>
          </div>

          {/* Bulk Update Prompt - Show based on showBulkUpdateButton useMemo */}
          {showBulkUpdateButton && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">End of Month Update</h3>
                  <p className="text-sm opacity-90">Update all your account balances for accurate monthly tracking</p>
                </div>
                <Button
                  onClick={() => setIsBulkUpdateModalOpen(true)}
                  className="bg-white text-blue-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Bulk Update Accounts
                </Button>
              </div>
            </motion.div>
          )}

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg bg-green-500 text-white flex items-center space-x-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </div>

        {/* Alerts Modal - Replaced inline logic with new component */}
        <AlertsOverviewModal
          isOpen={isAlertsModalOpen}
          onClose={() => setAlertsModalOpen(false)}
          alerts={alerts}
          onDismissAlert={handleDismissSingleAlert}
        />

        {/* Main Grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-components" direction="vertical">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {componentOrder.map((id, index) => {
                  const componentSpan = {
                    summary: 'lg:col-span-3',
                    accounts: 'lg:col-span-3',
                    'credit-cards': 'lg:col-span-3',
                    'growth-chart': 'lg:col-span-3',
                    reminders: 'lg:col-span-3',
                    'credit-bureaus': 'lg:col-span-3',
                    'credit-score': 'lg:col-span-3',
                    'growth-calculator': 'lg:col-span-3',
                  }[id] || 'lg:col-span-1';

                  return (
                    <Draggable key={id} draggableId={id} index={index} isDragDisabled={!isEditMode}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative transition-all duration-200 ${componentSpan} ${
                            isEditMode ? 'cursor-move border-2 border-dashed border-blue-400 rounded-lg p-2 bg-blue-50/50 dark:bg-blue-900/20' : ''
                          } ${snapshot.isDragging ? 'z-50 rotate-1 scale-[1.02] shadow-2xl' : ''}`}
                          style={{
                            ...provided.draggableProps.style,
                            ...(snapshot.isDragging && {
                              transform: provided.draggableProps.style?.transform,
                            }),
                          }}
                        >
                          {isEditMode && (
                            <div
                              {...provided.dragHandleProps}
                              className="absolute top-4 right-4 z-20 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg cursor-grab active:cursor-grabbing shadow-lg transition-colors"
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                          )}
                          
                          <motion.div
                            variants={!isEditMode ? cardVariants : {}}
                            initial={!isEditMode ? "hidden" : false}
                            animate={!isEditMode ? "visible" : false}
                            className="h-full"
                          >
                            {renderComponent(id)}
                          </motion.div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <AddAccountModal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} onAccountAdded={handleAccountAdded} />
        <AddCreditCardModal isOpen={isAddCardModalOpen} onClose={() => setIsAddCardModal(false)} onCreditCardAdded={handleCardAdded} />
        <AddCreditScoreModal isOpen={isAddScoreModalOpen} onClose={() => setIsAddScoreModal(false)} onScoreAdded={() => handleDataUpdate('Credit Score')} />
        <BulkAccountUpdateModal
          isOpen={isBulkUpdateModalOpen}
          onClose={() => setIsBulkUpdateModalOpen(false)}
          onComplete={() => handleDataUpdate('Bulk Account Update')}
        />
        <MonthlyRecapModal
          isVisible={showMonthlyRecap}
          onDismiss={() => setShowMonthlyRecap(false)}
          portfolioSnapshots={portfolioSnapshots}
          creditScores={creditScores}
          autoLoans={autoLoans}
          creditCards={creditCards}
          balanceHistory={balanceHistory}
          bureauStatuses={bureauStatuses}
          reminders={reminders}
        />

        {/* New Modals from Outline */}
        {isEditAccountModalOpen && (
          <EditAccountModal
            isOpen={isEditAccountModalOpen}
            onClose={() => setEditAccountModalOpen(false)}
            account={editingAccount}
            onAccountUpdated={handleAccountUpdated}
          />
        )}
        {isEditCardModalOpen && (
          <EditCreditCardModal
            isOpen={isEditCardModalOpen}
            onClose={() => setEditCardModalOpen(false)}
            card={editingCard}
            onCardUpdated={handleCardUpdated}
          />
        )}
        {isAddLoanModalOpen && (
          <AddEditAutoLoanModal
            isOpen={isAddLoanModalOpen}
            onClose={() => setAddLoanModalOpen(false)}
            loan={editingLoan}
            onSave={() => handleDataUpdate('Auto Loan')}
          />
        )}
        {isCreditCardBenefitsModalOpen && (
            <CreditCardBenefitsModal
                isOpen={isCreditCardBenefitsModalOpen}
                onClose={() => setCreditCardBenefitsModalOpen(false)}
                creditCards={creditCards}
            />
        )}

        {/* The Danger Zone tile has been removed as per the request. */}
      </div>
    </div>
  );
}
