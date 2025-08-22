
import { localDb } from './LocalDb';

export class AutoSnapshotManager {
  static async checkAndCreateMissingSnapshots() {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Get existing snapshots and balance history
      const existingSnapshots = localDb.list('PortfolioSnapshot');
      const existingHistory = localDb.list('BalanceHistory');
      const accounts = localDb.list('Account').filter(acc => !acc.is_archived && !acc.is_deleted);
      
      if (accounts.length === 0) return;
      
      // Find the earliest balance history date instead of account update
      const earliestHistoryEntry = existingHistory.reduce((earliest, h) => {
        const entryDate = new Date(h.date);
        return !earliest || entryDate < earliest ? entryDate : earliest;
      }, null);

      // Fallback to earliest account update date if no history exists
      const fallbackDate = accounts.reduce((earliest, account) => {
        const accountDate = new Date(account.updated_date);
        return !earliest || accountDate < earliest ? accountDate : earliest;
      }, null);

      const startingPoint = earliestHistoryEntry || fallbackDate;
      if (!startingPoint) return;

      const startYear = startingPoint.getFullYear();
      const startMonth = startingPoint.getMonth() + 1;
      
      // Check each month from the earliest account update to last month
      for (let year = startYear; year <= currentYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 1;
        const monthEnd = (year === currentYear) ? currentMonth - 1 : 12;
        
        for (let month = monthStart; month <= monthEnd; month++) {
          const snapshotExists = existingSnapshots.some(s => s.year === year && s.month === month);
          
          if (!snapshotExists) {
            this.createSnapshotForMonth(year, month, accounts, existingHistory);
          }
        }
      }
    } catch (error) {
      console.error('Error in auto snapshot check:', error);
    }
  }
  
  static createSnapshotForMonth(year, month, accounts, existingHistory) {
    try {
      const allLoans = localDb.list('AutoLoan');
      // Calculate the last day of the target month
      const lastDayOfMonth = new Date(year, month, 0);
      const snapshotDate = `${year}-${String(month).padStart(2, '0')}-01`;
      
      let assetBalance = 0;
      let loanBalance = 0;
      let hasDataForMonth = false;
      
      // Calculate asset balance from accounts with history in this month
      accounts.forEach(account => {
        const accountCreatedDate = new Date(account.created_date);
        // Skip accounts created after this month
        if (accountCreatedDate > lastDayOfMonth) return; 

        // Check if there's already a history entry for this account/month
        const historyEntry = existingHistory.find(h => 
          h.account_id === account.id &&
          new Date(h.date).getFullYear() === year &&
          new Date(h.date).getMonth() + 1 === month
        );

        if (historyEntry) {
          assetBalance += historyEntry.balance || 0;
          hasDataForMonth = true;
        } else {
            // Find the last known balance on or before this month
            const relevantHistory = existingHistory
                .filter(h => h.account_id === account.id && new Date(h.date) <= lastDayOfMonth)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (relevantHistory.length > 0) {
                assetBalance += relevantHistory[0].balance || 0;
                hasDataForMonth = true;
            }
        }
      });

      // Calculate loan balance for this month (excluding mortgage)
      // And prepare for historical loan type tracking
      const loanBalancesByType = {};

      allLoans.forEach(loan => {
        const loanCreatedDate = new Date(loan.created_date);
        if (loanCreatedDate <= lastDayOfMonth && loan.loan_type !== 'mortgage') {
            // This is a simplification; for true historical accuracy, we'd need loan balance history.
            // For auto-snapshots, we assume the current balance is the best estimate for past months if no other data exists.
            const balance = loan.current_balance || 0;
            loanBalance += balance;
            
            // Aggregate balances by loan type for historical tracking
            if (!loanBalancesByType[loan.loan_type]) {
                loanBalancesByType[loan.loan_type] = 0;
            }
            loanBalancesByType[loan.loan_type] += balance;
            
            hasDataForMonth = true;
        }
      });
      
      const totalBalance = assetBalance - loanBalance;

      // Only create portfolio snapshot if we had data for this month
      if (hasDataForMonth) {
        const portfolioSnapshot = {
          year: year,
          month: month,
          total_balance: totalBalance,
          asset_balance: assetBalance,
          loan_balance: loanBalance,
          snapshot_date: snapshotDate,
          is_auto_generated: true
        };
        
        localDb.create('PortfolioSnapshot', portfolioSnapshot);
        console.log(`Auto-generated snapshot for ${year}-${String(month).padStart(2, '0')}: $${totalBalance.toLocaleString()}`);

        // Create BalanceHistory for each loan type with a balance
        Object.entries(loanBalancesByType).forEach(([type, balance]) => {
          if (balance > 0) {
              const loanHistoryEntry = {
                  account_id: `loan_type-${type}`, // e.g., 'loan_type-auto'
                  date: lastDayOfMonth.toISOString(),
                  balance: balance,
                  is_auto_generated: true
              };
              localDb.create('BalanceHistory', loanHistoryEntry);
              console.log(`Auto-generated loan history for ${type}: ${balance}`);
          }
        });
      }
    } catch (error) {
      console.error(`Error creating snapshot for ${year}-${month}:`, error);
    }
  }
  
  static handleManualHistoryOverride(accountId, year, month, newBalance) {
    try {
      // Remove any auto-generated history entry for this account/month
      const autoHistory = localDb.list('BalanceHistory').filter(h => 
        h.account_id === accountId &&
        new Date(h.date).getFullYear() === year &&
        new Date(h.date).getMonth() + 1 === month &&
        h.is_auto_generated
      );
      
      autoHistory.forEach(entry => {
        localDb.delete('BalanceHistory', entry.id);
      });
      
      // Recalculate portfolio snapshot for this month
      this.recalculatePortfolioSnapshotForMonth(year, month);
      
    } catch (error) {
      console.error('Error handling manual history override:', error);
    }
  }
  
  static recalculatePortfolioSnapshotForMonth(year, month) {
    try {
      const balanceHistory = localDb.list('BalanceHistory').filter(h => 
        new Date(h.date).getFullYear() === year &&
        new Date(h.date).getMonth() + 1 === month
      );
      
      const autoLoans = localDb.list('AutoLoan');
      
      if (balanceHistory.length === 0 && autoLoans.length === 0) return;
      
      const totalAssetBalance = balanceHistory.reduce((sum, h) => sum + (h.balance || 0), 0);
      
      // Exclude mortgage loans from historical recalculations
      const totalLoanBalance = autoLoans
        .filter(loan => loan.loan_type !== 'mortgage')
        .reduce((sum, loan) => {
          const loanDate = new Date(loan.created_date);
          const targetDate = new Date(year, month, 0); // end of target month
          return loanDate <= targetDate ? sum + (loan.current_balance || 0) : sum;
        }, 0);
      
      const totalBalance = totalAssetBalance - totalLoanBalance;
      const snapshotDate = `${year}-${String(month).padStart(2, '0')}-01`;
      
      // Find existing snapshot for this month
      const existingSnapshots = localDb.list('PortfolioSnapshot');
      const existingSnapshot = existingSnapshots.find(s => s.year === year && s.month === month);
      
      if (existingSnapshot) {
        // Update existing snapshot
        localDb.update('PortfolioSnapshot', existingSnapshot.id, {
          total_balance: totalBalance,
          asset_balance: totalAssetBalance,
          loan_balance: totalLoanBalance,
          is_auto_generated: false // Mark as manually corrected
        });
      } else {
        // Create new snapshot
        const portfolioSnapshot = {
          year: year,
          month: month,
          total_balance: totalBalance,
          asset_balance: totalAssetBalance, // Fixed: Changed 'assetBalance' to 'totalAssetBalance'
          loan_balance: totalLoanBalance,
          snapshot_date: snapshotDate,
          is_auto_generated: false
        };
        
        localDb.create('PortfolioSnapshot', portfolioSnapshot);
      }
      
    } catch (error) {
      console.error('Error recalculating portfolio snapshot:', error);
    }
  }
}
