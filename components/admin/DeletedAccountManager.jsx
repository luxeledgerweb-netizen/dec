import React, { useState, useMemo } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2, Building2 } from 'lucide-react';

export default function DeletedAccountManager({ onRestore }) {
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const deletedAccounts = useMemo(() => {
    return localDb.list('Account').filter(account => account.is_deleted);
  }, []);

  const handleRestore = (accountId) => {
    localDb.update('Account', accountId, { 
      is_deleted: false,
      deleted_date: null
    });
    
    setFeedback({ type: 'success', message: 'Account restored successfully!' });
    setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
    
    if (typeof onRestore === 'function') {
      onRestore(accountId);
    }
  };

  const handlePermanentDelete = (account) => {
    if (window.confirm(`Are you sure you want to permanently delete "${account.name}"? This will remove it from all historical data and cannot be undone.`)) {
      // Remove from balance history
      const history = localDb.list('BalanceHistory');
      const filteredHistory = history.filter(h => h.account_id !== account.id);
      localDb.setItem('BalanceHistory', filteredHistory);
      
      // Remove from portfolio snapshots (if it's tracked there)
      const snapshots = localDb.list('PortfolioSnapshot');
      const updatedSnapshots = snapshots.map(snapshot => {
        if (snapshot.account_breakdown && snapshot.account_breakdown[account.id]) {
          const newBreakdown = { ...snapshot.account_breakdown };
          delete newBreakdown[account.id];
          return { ...snapshot, account_breakdown: newBreakdown };
        }
        return snapshot;
      });
      localDb.setItem('PortfolioSnapshot', updatedSnapshots);
      
      // Delete the account itself
      localDb.delete('Account', account.id);
      
      setFeedback({ type: 'success', message: 'Account permanently deleted from all data.' });
      setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deleted Accounts</CardTitle>
        <CardDescription>
          These accounts have been deleted but are still retained in historical reports and portfolio snapshots. You may choose to permanently remove them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {feedback.message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className="text-sm">{feedback.message}</span>
          </div>
        )}

        {deletedAccounts.length > 0 ? (
          <div className="space-y-3">
            {deletedAccounts.map((account) => (
              <div key={account.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="w-8 h-8 text-gray-400" />
                  <div>
                    <h4 className="font-medium">{account.name}</h4>
                    <p className="text-sm text-gray-600">{account.institution} • {account.account_type}</p>
                    <p className="text-xs text-gray-500">
                      Deleted on {new Date(account.deleted_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(account.id)}
                    className="flex items-center gap-1 w-full sm:w-auto whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handlePermanentDelete(account)}
                    className="flex items-center gap-1 w-full sm:w-auto whitepace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    Permanent Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No deleted accounts to manage</p>
        )}
      </CardContent>
    </Card>
  );
}