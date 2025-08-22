import React, { useState, useMemo } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { toast } from 'sonner';
import { AutoSnapshotManager } from '@/components/utils/AutoSnapshotManager';

export default function HistoricalDataImport({ onImportComplete }) {
    const [accountId, setAccountId] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [monthlyBalances, setMonthlyBalances] = useState(Array(12).fill(''));

    const accounts = useMemo(() => {
        return localDb.list('Account').filter(acc => !acc.is_archived && !acc.is_deleted);
    }, []);

    const loanTypes = useMemo(() => {
        const activeLoans = localDb.list('AutoLoan').filter(loan => !loan.is_archived && !loan.is_deleted && loan.loan_type !== 'mortgage');
        const types = new Set(activeLoans.map(loan => loan.loan_type));
        return Array.from(types).map(type => ({
            value: `loan_type-${type}`,
            label: `${type.charAt(0).toUpperCase() + type.slice(1)} Loans`
        }));
    }, []);

    const handleBalanceChange = (index, value) => {
        const newBalances = [...monthlyBalances];
        newBalances[index] = value;
        setMonthlyBalances(newBalances);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!accountId) {
            toast.error('Please select an account or loan type.');
            return;
        }

        const historyEntries = [];
        monthlyBalances.forEach((balanceStr, index) => {
            if (balanceStr) {
                const balance = parseFloat(balanceStr);
                const month = index + 1;
                const date = new Date(year, index, 15); // Use mid-month to avoid timezone issues

                // Check for existing entry for this account/month/year
                const existingEntry = localDb.list('BalanceHistory').find(entry =>
                    entry.account_id === accountId &&
                    new Date(entry.date).getFullYear() === parseInt(year) &&
                    new Date(entry.date).getMonth() === index
                );

                if(existingEntry) {
                    localDb.update('BalanceHistory', existingEntry.id, { balance });
                } else {
                    historyEntries.push({
                        account_id: accountId,
                        date: date.toISOString(),
                        balance: balance,
                    });
                }
            }
        });

        if (historyEntries.length > 0) {
            localDb.bulkCreate('BalanceHistory', historyEntries);

            // Trigger auto-generation of missing portfolio snapshots
            AutoSnapshotManager.checkAndCreateMissingSnapshots();
        }
        
        toast.success(`Historical data for ${year} has been successfully imported/updated!`);
        // Reset form
        setAccountId('');
        setYear(new Date().getFullYear().toString());
        setMonthlyBalances(Array(12).fill(''));
        if(onImportComplete) onImportComplete();
    };
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="account-select">Account / Loan Type</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger id="account-select">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Asset Accounts</SelectLabel>
                                {accounts.map(account => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.name} ({account.institution})
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                            {loanTypes.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Loan Types</SelectLabel>
                                    {loanTypes.map(loanType => (
                                        <SelectItem key={loanType.value} value={loanType.value}>
                                            {loanType.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="year-select">Year</Label>
                    <Input
                        id="year-select"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="e.g., 2024"
                    />
                </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
                Enter the balance for each month as of the end of that month. Leave blank for months with no data.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map((month, index) => (
                    <div key={month} className="space-y-1">
                        <Label htmlFor={`month-${index}`} className="text-xs">{month}</Label>
                        <Input
                            id={`month-${index}`}
                            type="number"
                            step="0.01"
                            value={monthlyBalances[index]}
                            onChange={(e) => handleBalanceChange(index, e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit">Import Historical Data</Button>
            </div>
        </form>
    );
}