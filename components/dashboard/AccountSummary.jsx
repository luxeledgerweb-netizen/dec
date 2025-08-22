import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Car, Plus, Pencil, Home, Users, Activity, ArchiveRestore } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import AddEditAutoLoanModal from "./AddEditAutoLoanModal";
import { getIconForItem } from '../utils/iconHelper'; 
import { useTileStyle } from '../utils/useTileStyle';
import { localDb } from '@/components/utils/LocalDb';

const PrimaryCardIcon = ({ card }) => {
    const iconUrl = useMemo(() => {
        if (!card) return null;
        return getIconForItem(card, 'card');
    }, [card]);

    return (
        <div className="flex items-center gap-2">
            {iconUrl ? (
                <img src={iconUrl} alt={`${card.institution || 'Card'} logo`} className="w-6 h-6 rounded-full bg-white object-contain"/>
            ) : (
                <CreditCard className="w-5 h-5 text-gray-400" />
            )}
            <span className="font-medium text-[var(--text-secondary)]">{card?.name || 'Primary Card'}</span>
        </div>
    );
};

const AutoLoanCard = ({ loans = [], onDataUpdate = () => {} }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const tileStyle = useTileStyle();

  const handleOpenModal = (loan) => {
    setSelectedLoan(loan);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLoan(null);
  }

  const handleLoanUpdate = () => {
    handleCloseModal();
    if (typeof onDataUpdate === 'function') {
      onDataUpdate();
    }
  }

  const totalOriginalAmount = loans.reduce((sum, loan) => sum + (loan.original_amount || 0), 0);
  const totalCurrentBalance = loans.reduce((sum, loan) => sum + (loan.current_balance || 0), 0);

  const paidOffPercent = totalOriginalAmount > 0 
    ? ((totalOriginalAmount - totalCurrentBalance) / totalOriginalAmount) * 100 
    : 0;

  const getLoanIcon = () => {
    if (!loans || loans.length === 0) return <Users className="h-4 w-4 text-red-500" />;
    
    const hasAutoLoan = loans.some(loan => loan.loan_type === 'auto');
    const hasMortgage = loans.some(loan => loan.loan_type === 'mortgage');
    
    if (hasAutoLoan && hasMortgage) {
      return (
        <div className="relative">
          <Home className="h-4 w-4 text-red-500" />
          <Car className="h-3 w-3 text-red-500 absolute -bottom-1 -right-1" />
        </div>
      );
    } else if (hasMortgage) {
      return <Home className="h-4 w-4 text-red-500" />;
    } else if (hasAutoLoan) {
      return <Car className="h-4 w-4 text-red-500" />;
    } else {
      return <DollarSign className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <>
      <Card style={tileStyle} className="glass-card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:border-orange-500 h-full flex flex-col relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
        <div className="relative z-10 flex flex-col flex-grow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Loans
            </CardTitle>
            {getLoanIcon()}
          </CardHeader>
          <CardContent className="flex-grow">
            {loans && loans.length > 0 ? (
              <div className="flex flex-col h-full">
                <div>
                  <div className="text-2xl font-bold mb-1">
                    ${totalCurrentBalance.toLocaleString()}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-4">
                    Remaining Balance
                  </p>
                  <div className="space-y-2 mb-4">
                    <Progress value={paidOffPercent} className="w-full h-2 [&>div]:bg-red-500" />
                    <span className="text-xs text-emerald-600 font-medium">
                      {paidOffPercent.toFixed(1)}% Paid Off
                    </span>
                  </div>
                </div>
                <div className="border-t border-[var(--border-subtle)] my-3"></div>
                <div className="space-y-2 flex-grow">
                  {loans.map(loan => (
                    <div key={loan.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{loan.name}</span>
                      <div className="flex items-center gap-1">
                          <span className="text-[var(--text-secondary)]">${(loan.current_balance || 0).toLocaleString()}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenModal(loan)}>
                            <Pencil className="w-3 h-3 text-slate-400" />
                          </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenModal(null)} className="w-full mt-auto">
                  <Plus className="w-4 h-4 mr-1"/>
                  Add Loan
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-xs text-[var(--text-secondary)] text-center mb-3">
                  No loans added yet.
                </p>
                <Button size="sm" onClick={() => handleOpenModal(null)}>
                  <Plus className="w-4 h-4 mr-1"/>
                  Add Loan
                </Button>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
      <AddEditAutoLoanModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleLoanUpdate}
        loan={selectedLoan}
      />
    </>
  );
};

const MonthlyGrowthCard = React.memo(function MonthlyGrowthCard({
  amount, 
  rate, 
  portfolioSnapshots = [],
  balanceHistory = [],
  accounts = []
}) {
  const [growthView, setGrowthView] = useState('trend');
  const tileStyle = useTileStyle();

  const trendData = useMemo(() => {
    if (!portfolioSnapshots || portfolioSnapshots.length < 2) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trends = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prevDate = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      const currentSnapshot = portfolioSnapshots.find(s => s.year === targetDate.getFullYear() && s.month === targetDate.getMonth() + 1);
      const previousSnapshot = portfolioSnapshots.find(s => s.year === prevDate.getFullYear() && s.month === prevDate.getMonth() + 1);
      if (currentSnapshot && previousSnapshot && previousSnapshot.total_balance > 0) {
        const rate = ((currentSnapshot.total_balance - previousSnapshot.total_balance) / previousSnapshot.total_balance) * 100;
        trends.push({ month: monthNames[targetDate.getMonth()], rate });
      }
    }
    return trends.reverse(); 
  }, [portfolioSnapshots]);

  const breakdownData = useMemo(() => {
    if (!accounts || !balanceHistory || accounts.length === 0) return [];
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    return accounts
      .filter(account => !account.is_archived)
      .map(account => {
        const prevBalanceRecord = balanceHistory.find(h => h.account_id === account.id && h.month === prevMonthKey);
        if (!prevBalanceRecord) return { name: account.name, change: null };
        const currentBalance = account.current_balance || 0;
        const prevBalance = prevBalanceRecord.balance;
        const isInvestment = account.account_type === 'investment' || account.account_type === 'retirement';
        let change;
        if (isInvestment) {
          const currentContributions = account.total_contributions || 0;
          const prevContributions = prevBalanceRecord.total_contributions || 0;
          const balanceDelta = currentBalance - prevBalance;
          const contributionDelta = currentContributions - prevContributions;
          change = balanceDelta - contributionDelta;
        } else {
          change = currentBalance - prevBalance;
        }
        return { name: account.name, change };
      }).filter(b => b.change !== null).sort((a,b) => b.change - a.change);
  }, [balanceHistory, accounts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="h-full"
    >
      <Card style={tileStyle} className="glass-card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:border-blue-500 h-full flex flex-col relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Growth
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div>
              <div className="text-2xl font-bold mb-1">
                {rate ? `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%` : "N/A"}
              </div>
              <p className={`text-xs mb-2 ${amount ? (amount > 0 ? "text-emerald-600" : "text-red-600") : "text-[var(--text-secondary)]"}`}>
                {amount ? `${amount > 0 ? '+' : ''}${(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "vs last month"}
              </p>
            </div>
            <div className="border-t border-[var(--border-subtle)] my-3"></div>
            <div className="flex justify-center gap-2 mb-3">
              <Button variant={growthView === 'trend' ? 'secondary' : 'ghost'} size="sm" onClick={() => setGrowthView('trend')} className="h-7 text-xs">3-Mo Trend</Button>
              <Button variant={growthView === 'breakdown' ? 'secondary' : 'ghost'} size="sm" onClick={() => setGrowthView('breakdown')} className="h-7 text-xs">Breakdown</Button>
            </div>
            <div className="text-xs space-y-1 overflow-y-auto flex-grow" style={{maxHeight: '120px'}}>
              {growthView === 'trend' ? (
                trendData.length > 0 ? trendData.map(t => (
                  <div key={t.month} className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">{t.month}</span>
                    <span className={`font-medium ${t.rate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.rate >= 0 ? <TrendingUp className="w-3 h-3 inline-block mr-1"/> : <TrendingDown className="w-3 h-3 inline-block mr-1"/>}
                      {t.rate.toFixed(1)}%
                    </span>
                  </div>
                )) : <p className="text-center text-[var(--text-secondary)]">Not enough data for trend.</p>
              ) : (
                breakdownData.length > 0 ? breakdownData.map(b => (
                  <div key={b.name} className="flex justify-between items-center py-1">
                    <span className="text-[var(--text-secondary)] truncate pr-2 flex-1" title={b.name}>{b.name}</span>
                    <span className={`font-medium whitespace-nowrap ${b.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {b.change.toLocaleString('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' })}
                    </span>
                  </div>
                )) : <p className="text-center text-[var(--text-secondary)]">Not enough data for breakdown.</p>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
});

export default React.memo(function AccountSummary({ 
  totalBalance = 0, 
  totalCreditLimit = 0,
  accountsCount = 0, 
  creditCardsCount = 0,
  monthlyGrowthRate = 0,
  monthlyGrowthAmount = 0,
  autoLoans = [],
  onDataUpdate = () => {},
  portfolioSnapshots = [],
  balanceHistory = [],
  accounts = [],
  creditCards = []
}) {
  const activeCards = creditCards ? creditCards.filter(card => card.is_primary_active && card.status === 'open') : [];
  const tileStyle = useTileStyle();
  const [successMessage, setSuccessMessage] = useState('');

  const { totalAssetBalance, totalLoanBalance } = useMemo(() => {
    let calculatedAssetBalance = 0;
    let calculatedLoanBalance = 0;

    if (accounts && Array.isArray(accounts)) {
      accounts.forEach(account => {
        if (!account.is_archived) {
          if (account.current_balance >= 0) {
            calculatedAssetBalance += account.current_balance;
          } else {
            calculatedLoanBalance += Math.abs(account.current_balance);
          }
        }
      });
    }

    if (autoLoans && Array.isArray(autoLoans)) {
      autoLoans.forEach(loan => {
        calculatedLoanBalance += loan.current_balance || 0;
      });
    }
    
    return { totalAssetBalance: calculatedAssetBalance, totalLoanBalance: calculatedLoanBalance };
  }, [accounts, autoLoans]);

  const handleCreateSnapshot = useCallback(async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      
      const snapshotDate = new Date(currentYear, currentMonth - 1, currentDay);
      const snapshotDateString = snapshotDate.toISOString().split('T')[0];
      
      const existingSnapshot = portfolioSnapshots.find(s => 
        s.year === currentYear && s.month === currentMonth
      );
      
      if (existingSnapshot) {
        if (!confirm('A snapshot already exists for this month. Do you want to update it?')) {
          return;
        }
        await localDb.update('PortfolioSnapshot', existingSnapshot.id, {
          total_balance: totalBalance,
          asset_balance: totalAssetBalance,
          loan_balance: totalLoanBalance,
          snapshot_date: snapshotDateString,
          year: currentYear,
          month: currentMonth,
          updated_date: new Date().toISOString()
        });
      } else {
        await localDb.create('PortfolioSnapshot', {
          year: currentYear,
          month: currentMonth,
          total_balance: totalBalance,
          asset_balance: totalAssetBalance,
          loan_balance: totalLoanBalance,
          snapshot_date: snapshotDateString
        });
      }
      
      if (typeof onDataUpdate === 'function') {
          onDataUpdate();
      }
      setSuccessMessage('Portfolio snapshot created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error creating snapshot:', error);
      alert('Failed to create portfolio snapshot');
    }
  }, [totalBalance, totalAssetBalance, totalLoanBalance, portfolioSnapshots, onDataUpdate]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {successMessage && (
        <div className="col-span-full bg-green-100 text-green-700 p-2 rounded-md mb-4 text-center">
          {successMessage}
        </div>
      )}
      {/* Net Worth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
        className="h-full group relative"
      >
        <Card style={tileStyle} className="glass-card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:border-green-500 h-full flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
          <div className="relative z-10 flex flex-col flex-grow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Net Worth
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <div>
                <div className="text-2xl font-bold mb-1">
                  ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{accountsCount} accounts</p>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Total Credit Limit Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 * 0.1 }}
        className="h-full group relative"
      >
        <Card style={tileStyle} className="glass-card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:border-purple-500 h-full flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
          <div className="relative z-10 flex flex-col flex-grow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Credit Limit
              </CardTitle>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <div>
                <div className="text-2xl font-bold mb-1">
                  ${totalCreditLimit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {creditCardsCount} open {creditCardsCount === 1 ? 'card' : 'cards'}
                  </p>
                  {activeCards && activeCards.length > 0 && (
                    <div className="flex items-center gap-1">
                      {activeCards.map((activeCard) => (
                        <PrimaryCardIcon key={activeCard.id} card={activeCard} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Monthly Growth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 * 0.1 }}
        className="h-full group relative"
      >
        <MonthlyGrowthCard 
          amount={monthlyGrowthAmount}
          rate={monthlyGrowthRate}
          portfolioSnapshots={portfolioSnapshots}
          balanceHistory={balanceHistory}
          accounts={accounts}
        />
      </motion.div>

      {/* Auto Loan Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3 * 0.1 }}
        className="h-full group relative"
      >
        <AutoLoanCard loans={autoLoans} onDataUpdate={onDataUpdate} />
      </motion.div>
    </div>
  );
});