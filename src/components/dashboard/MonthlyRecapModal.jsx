
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, CreditCard, Car, AlertTriangle, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, differenceInCalendarMonths } from 'date-fns';

export default function MonthlyRecapModal({
  isVisible,
  onDismiss,
  portfolioSnapshots,
  creditScores,
  autoLoans,
  creditCards,
  balanceHistory,
  bureauStatuses, // New prop
  reminders, // New prop
  accounts // New prop - added as per outline's usage
}) {

// ---- SAFETY GUARDS: make sure these are arrays even if props are undefined ----
const safeSnapshots      = Array.isArray(portfolioSnapshots) ? portfolioSnapshots : [];
const safeCreditScores   = Array.isArray(creditScores) ? creditScores : [];
const safeAutoLoans      = Array.isArray(autoLoans) ? autoLoans : [];
const safeCreditCards    = Array.isArray(creditCards) ? creditCards : [];
const safeBalanceHistory = Array.isArray(balanceHistory) ? balanceHistory : [];
const safeBureauStatuses = Array.isArray(bureauStatuses) ? bureauStatuses : [];
const safeReminders      = Array.isArray(reminders) ? reminders : [];
const safeAccounts       = Array.isArray(accounts) ? accounts : [];

const getMonthString = (row) => {
  // supports "2025-06-15..." strings in either row.month or row.date
  const raw = String(row?.month ?? row?.date ?? '');
  return raw;
};

  const currentMonth = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1, // 1-indexed for comparison
      monthName: format(now, 'MMMM yyyy')
    };
  }, []);

  const previousMonth = useMemo(() => {
    const prevDate = subMonths(new Date(), 1);
    return {
      year: prevDate.getFullYear(),
      month: prevDate.getMonth() + 1,
      monthName: format(prevDate, 'MMMM yyyy')
    };
  }, []);


const calculateMonthlyChanges = useCallback(() => {
  const now = new Date();
  const curM = now.getMonth() + 1;
  const curY = now.getFullYear();

  const prevM = curM === 1 ? 12 : curM - 1;
  const prevY = curM === 1 ? curY - 1 : curY;

  // month keys for safeBalanceHistory (support 'YYYY-MM-01' and 'YYYY-MM*')
  const mk = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
  const curKeyExact = `${mk(curY, curM)}-01`;
  const curKeyPrefix = mk(curY, curM);
  const prevKeyExact = `${mk(prevY, prevM)}-01`;
  const prevKeyPrefix = mk(prevY, prevM);

  // Helper: does a history row belong to the target month?
const isMonth = (row, exact, prefix) => {
  const s = getMonthString(row);
  return s === exact || (s.startsWith(prefix) && (s.length === prefix.length || s[prefix.length] === '-'));
};

  // Prefer safeBalanceHistory: sum balances across *current* non-archived accounts for each month.
  const accountIdsInScope = new Set(
    (safeAccounts ?? [])
      .filter(a => !a.is_archived)
      .map(a => a.id)
  );

  let curFromHistory = null;
  let prevFromHistory = null;

  if (Array.isArray(safeBalanceHistory) && accountIdsInScope.size > 0) {
    let curSum = 0, prevSum = 0, curHit = false, prevHit = false;

    for (const h of safeBalanceHistory) {
      const accId = h.account_id ?? h.accountId ?? null;
      if (accId == null || !accountIdsInScope.has(accId)) continue;

      if (isMonth(h, curKeyExact, curKeyPrefix)) {
        curSum += Number(h.balance ?? 0);
        curHit = true;
      } else if (isMonth(h, prevKeyExact, prevKeyPrefix)) {
        prevSum += Number(h.balance ?? 0);
        prevHit = true;
      }
    }

    if (curHit && prevHit) {
      curFromHistory = curSum;
      prevFromHistory = prevSum;
    }
  }

  // Fallback to PortfolioSnapshot if history wasn’t sufficient
  let endingBalance = curFromHistory;
  let startingBalance = prevFromHistory;

  if (endingBalance == null || startingBalance == null) {
    const curSnap = safeSnapshots.find(s => {
      if (s.snapshot_date) {
        const d = new Date(s.snapshot_date);
        return d.getFullYear() === curY && d.getMonth() + 1 === curM;
      }
      return s.year === curY && s.month === curM;
    });
    const prevSnap = safeSnapshots.find(s => {
      if (s.snapshot_date) {
        const d = new Date(s.snapshot_date);
        return d.getFullYear() === prevY && d.getMonth() + 1 === prevM;
      }
      return s.year === prevY && s.month === prevM;
    });

    // only use snapshots if both months exist
    if (curSnap && prevSnap) {
      endingBalance = curFromHistory ?? (curSnap.total_balance ?? 0);
      startingBalance = prevFromHistory ?? (prevSnap.total_balance ?? 0);
    } else {
      // nothing reliable → zeros (the UI hides the section when both are 0)
      endingBalance = endingBalance ?? 0;
      startingBalance = startingBalance ?? 0;
    }
  }

  const monthlyChange = endingBalance - startingBalance;
  const monthlyChangePercent = startingBalance > 0 ? (monthlyChange / startingBalance) * 100 : 0;

  // Credit score MoM (same as you had)
  const curKey = mk(curY, curM);
  const prevKey = mk(prevY, prevM);
  const curScores = (safeCreditScores ?? []).filter(s => String(s.date_recorded || '').startsWith(curKey));
  const prevScores = (safeCreditScores ?? []).filter(s => String(s.date_recorded || '').startsWith(prevKey));
  const curAvg = curScores.length ? curScores.reduce((a, s) => a + s.score, 0) / curScores.length : 0;
  const prevAvg = prevScores.length ? prevScores.reduce((a, s) => a + s.score, 0) / prevScores.length : 0;
  const creditScoreChange = curAvg - prevAvg;

  // New accounts / loans paid off (unchanged)
  const newAccounts = (safeAccounts ?? []).filter(a => {
    const d = new Date(a.created_date);
    return d.getFullYear() === curY && d.getMonth() + 1 === curM;
  }).length;

  const paidOffLoans = (safeAutoLoans ?? []).filter(l => {
    if (!l.payoff_date) return false;
    const d = new Date(l.payoff_date);
    return d.getFullYear() === curY && d.getMonth() + 1 === curM;
  }).length;

  return {
    startingBalance,
    endingBalance,
    monthlyChange,
    monthlyChangePercent,
    creditScoreChange,
    currentCreditScore: curAvg,
    previousCreditScore: prevAvg,
    newAccounts,
    paidOffLoans,
  };
}, [safeSnapshots, safeCreditScores, safeAccounts, safeAutoLoans, safeBalanceHistory]);

  const monthlyChanges = useMemo(() => {
    return calculateMonthlyChanges();
  }, [calculateMonthlyChanges]);

// Loan Progress Data (uses BalanceHistory for any loan type)
const loanProgressData = useMemo(() => {
  if (!safeAutoLoans || safeAutoLoans.length === 0) return [];

  // figure out last month key
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKeyExact = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
  const prevKeyPrefix = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

  // quick index of last-month balances by account id
  const prevByAccount = new Map();
  if (Array.isArray(safeBalanceHistory)) {
    for (const h of safeBalanceHistory) {
      const monthStr = getMonthString(h);
        const isPrev =
        monthStr === prevKeyExact ||
	  (monthStr.startsWith(prevKeyPrefix) &&
	    (monthStr.length === prevKeyPrefix.length || monthStr[prevKeyPrefix.length] === '-'));
	      if (!isPrev) continue;

      // normalize id keys (support account_id or accountId)
      const accId = h.account_id ?? h.accountId ?? null;
      if (accId != null) prevByAccount.set(accId, h);
    }
  }

  return safeAutoLoans
    // treat anything that’s actually a loan; if you pass mixed accounts, you can also filter by loan_type here
    .filter(l => (l.current_balance ?? null) != null && (l.current_balance ?? 0) > 0)
    .map(l => {
      // normalize the lookup key: some models use id, some use account_id on the loan row
      const lookupId = l.account_id ?? l.accountId ?? l.id;
      const prevRec = prevByAccount.get(lookupId);
      const prevBal = prevRec?.balance ?? null;

      // % change vs last month; positive means balance went DOWN
      let monthlyProgress = 0;
      if (prevBal != null && prevBal > 0) {
        const delta = prevBal - (l.current_balance || 0);
        monthlyProgress = (delta / prevBal) * 100;
      }

      const paidOffPercent =
        (l.original_amount ?? 0) > 0
          ? (((l.original_amount ?? 0) - (l.current_balance ?? 0)) / (l.original_amount ?? 0)) * 100
          : 0;

      return {
        ...l,
        paidOffPercent,
        monthlyProgress,                 // real value; can be negative if balance grew
        remainingBalance: l.current_balance || 0,
      };
    });
}, [safeAutoLoans, safeBalanceHistory]);

  // Paid Off Loan Celebration (unchanged - this is for last quarter, not current month from new calc)
  const paidOffLoansThisQuarter = useMemo(() => {
    if (!safeAutoLoans) return [];
    return safeAutoLoans.filter(loan => {
      if (!loan.payoff_date) return false;
      const monthsSincePayoff = differenceInCalendarMonths(new Date(), new Date(loan.payoff_date));
      return monthsSincePayoff >= 0 && monthsSincePayoff < 3;
    });
  }, [safeAutoLoans]);

  // Enhanced Credit Card & General Alerts (unchanged)
  const monthlyAlerts = useMemo(() => {
    const now = new Date();
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 165); // ~5.5 months

    const expiring = safeCreditCards.filter(card =>
      card.expiration_date && new Date(card.expiration_date) <= twoMonthsFromNow
    );

    const needUsage = safeCreditCards.filter(card =>
      card.last_used_date && new Date(card.last_used_date) < threshold
    );

    // Check for unfrozen credit bureaus
    const unfrozenBureaus = safeBureauStatuses ? safeBureauStatuses.filter(status => !status.is_frozen) : [];

    // Check for due subscriptions/bills in next 5 days
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const dueReminders = safeReminders ? safeReminders.filter(reminder => {
      const dueDate = new Date(reminder.next_due_date);
      return dueDate <= fiveDaysFromNow && dueDate >= now;
    }) : [];

    // Check for overdue loan payments
    const overdueLoans = safeAutoLoans ? safeAutoLoans.filter(loan => {
      if (!loan.next_payment_due) return false;
      return new Date(loan.next_payment_due) < now;
    }) : [];

    return { expiring, needUsage, unfrozenBureaus, dueReminders, overdueLoans };
  }, [safeCreditCards, safeBureauStatuses, safeReminders, safeAutoLoans]);

  if (!isVisible) return null;

  const hasAlerts = monthlyAlerts.expiring.length > 0 ||
                   monthlyAlerts.needUsage.length > 0 ||
                   monthlyAlerts.unfrozenBureaus.length > 0 ||
                   monthlyAlerts.dueReminders.length > 0 ||
                   monthlyAlerts.overdueLoans.length > 0;

  // Check for presence of starting balance to determine if net worth section should be displayed
  const showNetWorthSection = monthlyChanges.startingBalance !== 0 || monthlyChanges.endingBalance !== 0;

  return (
    <AnimatePresence>
      {/* Backdrop */}
	<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />

	{/* Modal container */}
	<motion.div
	  initial={{ opacity: 0, y: -24 }}
	  animate={{ opacity: 1, y: 0 }}
	  exit={{ opacity: 0, y: -24 }}
	  className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4"
	>
        <Card
	  className="w-full max-w-[100%] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto glass-card shadow-2xl border-2 border-blue-200"
	  role="dialog"
	  aria-modal="true"
	>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-2xl font-bold text-[var(--heading-color)] flex items-center gap-2">
                📊 Monthly Financial Recap
              </CardTitle>
              <p className="text-[var(--text-secondary)]">
                {previousMonth.monthName} → {currentMonth.monthName}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 overflow-x-hideen break-words">
            {/* Paid Off Loan Celebration */}
            {paidOffLoansThisQuarter.length > 0 && (
              <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <PartyPopper className="w-5 h-5" /> Loan Payoff Celebration!
                </h3>
                <div className="space-y-1">
                  {paidOffLoansThisQuarter.map(loan => (
                    <p key={loan.id} className="text-green-700 dark:text-green-400">
                      Congrats! Your <strong>{loan.name}</strong> is paid off!
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* Net Worth Section */}
            {showNetWorthSection && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-secondary)]">Starting Net Worth</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    ${monthlyChanges.startingBalance.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-secondary)]">Ending Net Worth</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    ${monthlyChanges.endingBalance.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-secondary)]">Monthly Change</p>
                  <div className={`text-2xl font-bold flex items-center justify-center gap-2 ${
                    monthlyChanges.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {monthlyChanges.monthlyChange >= 0 ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : (
                      <TrendingDown className="w-6 h-6" />
                    )}
                    {monthlyChanges.monthlyChange >= 0 ? '+' : ''}${monthlyChanges.monthlyChange.toLocaleString()}
                  </div>
                  <p className={`text-sm ${monthlyChanges.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({monthlyChanges.monthlyChangePercent >= 0 ? '+' : ''}{monthlyChanges.monthlyChangePercent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Credit Score Section */}
              {(monthlyChanges.currentCreditScore !== 0 || monthlyChanges.previousCreditScore !== 0) && (
                <Card className="p-4">
                  <h3 className="font-semibold text-[var(--heading-color)] mb-3 flex items-center gap-2">
                    📈 Credit Score
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Previous: {monthlyChanges.previousCreditScore}</p>
                      <p className="text-sm text-[var(--text-secondary)]">Current: {monthlyChanges.currentCreditScore}</p>
                    </div>
                    <div className={`text-xl font-bold ${
                      monthlyChanges.creditScoreChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthlyChanges.creditScoreChange >= 0 ? '+' : ''}{monthlyChanges.creditScoreChange}
                    </div>
                  </div>
                </Card>
              )}

              {/* Loan Progress Section */}
              {loanProgressData.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-[var(--heading-color)] mb-3 flex items-center gap-2">
                    <Car className="w-4 h-4" /> Loan Progress
                  </h3>
                  <div className="space-y-3">
                    {loanProgressData.map(loan => (
                      <div key={loan.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{loan.name}</span>
                          <span className="text-sm text-green-600">+{loan.monthlyProgress.toFixed(1)}%</span>
                        </div>
                        <Progress value={loan.paidOffPercent} className="h-2" />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          ${loan.remainingBalance.toLocaleString()} remaining
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Enhanced Alerts Section */}
            {hasAlerts && (
              <Card className="p-4 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Important Alerts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {monthlyAlerts.expiring.map(card => (
                    <Badge key={card.id} variant="destructive" className="mr-2 mb-2">
                      {card.name} expires {format(new Date(card.expiration_date), 'MM/yyyy')}
                    </Badge>
                  ))}
                  {monthlyAlerts.needUsage.map(card => (
                    <Badge key={card.id} variant="secondary" className="mr-2 mb-2">
                      {card.name} needs usage soon
                    </Badge>
                  ))}
                  {monthlyAlerts.unfrozenBureaus.map(bureau => (
                    <Badge key={bureau.bureau} variant="outline" className="mr-2 mb-2 border-orange-400 text-orange-700">
                      {bureau.bureau.charAt(0).toUpperCase() + bureau.bureau.slice(1)} credit is unfrozen
                    </Badge>
                  ))}
                  {monthlyAlerts.dueReminders.map(reminder => (
                    <Badge key={reminder.id} variant="default" className="mr-2 mb-2 bg-blue-100 text-blue-800">
                      {reminder.name} due {format(new Date(reminder.next_due_date), 'MMM d')}
                    </Badge>
                  ))}
                  {monthlyAlerts.overdueLoans.map(loan => (
                    <Badge key={loan.id} variant="destructive" className="mr-2 mb-2">
                      {loan.name} payment overdue
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <div className="text-center pt-4">
              <Button onClick={onDismiss} className="bg-blue-600 hover:bg-blue-700">
                Got it, thanks! 👍
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
