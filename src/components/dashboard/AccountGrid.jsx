import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import AccountCard from './AccountCard';
import { useTileStyle } from '../utils/useTileStyle';

export default function AccountGrid({ accounts, onAccountUpdate = () => {}, accountSort, compactView, showBalances, onEdit = () => {} }) {
  const tileStyle = useTileStyle();
  
  const sortedAccounts = useMemo(() => {
    // Filter out deleted accounts and sort by balance (zero balance accounts at bottom)
    const activeAccounts = accounts.filter(acc => !acc.is_deleted && !acc.is_archived);
    
    const sortedByBalance = activeAccounts.sort((a, b) => {
      // Zero balance accounts go to bottom
      if (a.current_balance === 0 && b.current_balance !== 0) return 1;
      if (b.current_balance === 0 && a.current_balance !== 0) return -1;
      
      // Then apply user's preferred sorting
      if (accountSort === 'institution') {
        return a.institution.localeCompare(b.institution);
      } else if (accountSort === 'account_type') {
        return a.account_type.localeCompare(b.account_type);
      }
      
      // Default: recently updated first (but zero balance still at bottom)
      return new Date(b.updated_date) - new Date(a.updated_date);
    });
    
    return sortedByBalance;
  }, [accounts, accountSort]);

  const handleAccountUpdate = (type) => {
    if (typeof onAccountUpdate === 'function') {
      onAccountUpdate(type);
    }
  };

  const handleEdit = (account) => {
    if (typeof onEdit === 'function') {
      onEdit(account);
    }
  };

  if (!accounts || accounts.length === 0) {
    return (
      <Card style={tileStyle}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="w-12 h-12 text-[var(--text-secondary)] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
          <p className="text-[var(--text-secondary)] text-center">
            Add your first account to start tracking your financial growth
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid gap-4 ${compactView ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {sortedAccounts.map(account => (
        <AccountCard 
          key={account.id} 
          account={account} 
          onUpdate={handleAccountUpdate} 
          compact={compactView}
          showBalance={showBalances}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );
}