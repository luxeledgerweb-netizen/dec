
import React, { useState, useEffect, useCallback } from "react";
import { localDb } from '@/components/utils/LocalDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, Zap, PiggyBank, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function BulkAccountUpdateModal({ isOpen, onClose, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState([]);
  const [newBalance, setNewBalance] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Ensure AppSettings record exists and retrieve it.
      // This record will store the preferred order of accounts/loans.
      let appSettings = localDb.list('AppSettings')[0];
      if (!appSettings) {
        // If no AppSettings record exists, create a default one.
        // Using a fixed ID for a singleton settings record is a common pattern.
        appSettings = { id: 'app_settings_singleton', accountUpdateOrder: [] };
        localDb.add('AppSettings', appSettings);
      }

      const accounts = localDb.list('Account').filter(account =>
        !account.is_archived &&
        (account.account_type === 'savings' ||
         account.account_type === 'investment' ||
         account.account_type === 'retirement' ||
         account.account_type === 'checking')
      );

      const activeLoans = (localDb.list('AutoLoan') || []).filter(loan => loan.current_balance > 0);

      const mappedAccounts = accounts.map(acc => ({ ...acc, itemType: 'account' }));
      const mappedLoans = activeLoans.map(loan => ({ ...loan, itemType: 'loan' }));

      const allItems = [...mappedAccounts, ...mappedLoans];
      const savedOrder = appSettings.accountUpdateOrder || []; // Now 'appSettings' is guaranteed to exist

      // Sort items based on the saved order, putting new items at the end
      const sortedItems = [...allItems].sort((a, b) => {
        const indexA = savedOrder.indexOf(a.id);
        const indexB = savedOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0; // Both not in order, keep original relative order
        if (indexA === -1) return 1; // A not in order, B is. B comes first.
        if (indexB === -1) return -1; // B not in order, A is. A comes first.
        return indexA - indexB; // Both in order, sort by order.
      });

      setQueue(sortedItems);
      setCurrentIndex(0);
      setNewBalance('');
    }
  }, [isOpen]);

  const currentItem = queue[currentIndex];
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;
  const isComplete = currentIndex >= queue.length;

  const handleNext = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setNewBalance(''); // Clear input for next item
    } else {
      setCurrentIndex(queue.length); // Mark as complete
    }
  }, [currentIndex, queue.length]);

  const handleSave = () => {
    if (!currentItem || newBalance === '') return;

    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue)) {
      console.error("Invalid balance entered.");
      return;
    }

    let updates = { current_balance: balanceValue };

    try {
      if (currentItem.itemType === 'loan') {
        // If loan is being paid off, set the payoff date
        if (currentItem.current_balance > 0 && balanceValue <= 0) {
          updates.payoff_date = new Date().toISOString();
        }
        localDb.update('AutoLoan', currentItem.id, updates);
      } else { // It's an account
        localDb.update('Account', currentItem.id, updates);
      }
      
      handleNext();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = () => {
    // Before clearing the queue, save the current order of item IDs.
    // This ensures that the next time the modal opens, it remembers the user's preferred order.
    const currentOrderIds = queue.map(item => item.id);
    let appSettingsRecord = localDb.list('AppSettings')[0]; // Re-fetch to ensure we have the latest record and its ID

    // This block should always find the record due to the ensure-existence logic in useEffect.
    // However, including a fallback for robustness.
    if (appSettingsRecord) {
      localDb.update('AppSettings', appSettingsRecord.id, {
        accountUpdateOrder: currentOrderIds
      });
    } else {
      // Fallback: if somehow the record was deleted or not created, create it now.
      localDb.add('AppSettings', { id: 'app_settings_singleton', accountUpdateOrder: currentOrderIds });
    }

    // Set the flag indicating the bulk update for this month is complete.
    const currentMonthYear = format(new Date(), 'yyyy-MM');
    localDb.setItem('lastBulkUpdateMonthYear', currentMonthYear);

    onComplete();
    onClose();
    // Reset for next time
    setTimeout(() => {
      setCurrentIndex(0);
      setQueue([]); // Clear queue
      setNewBalance(''); // Clear input
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Bulk Account Update
          </DialogTitle>
          <DialogDescription>
            Quickly update all your account and loan balances.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                {isComplete ? 'Complete!' : `Updating (${currentIndex + 1} of ${queue.length})`}
              </span>
              <span className="text-[var(--text-secondary)]">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[var(--heading-color)] mb-2">
                  All Done! 🎉
                </h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  All items processed successfully.
                </p>
                <Button onClick={handleComplete} className="w-full">
                  Finish
                </Button>
              </motion.div>
            ) : currentItem ? (
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    {currentItem.itemType === 'loan' ? 
                      <Car className="w-5 h-5 text-blue-600"/> : 
                      <PiggyBank className="w-5 h-5 text-blue-600"/>
                    }
                    <h3 className="text-lg font-semibold text-[var(--heading-color)]">
                      {currentItem.name}
                      {currentItem.itemType === 'loan' && <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">(Loan)</span>}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] pl-8">
                    {currentItem.institution || currentItem.loan_type} • {currentItem.itemType}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 pl-8">
                    Current Balance: ${currentItem.current_balance?.toLocaleString() || '0'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="balance">New Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder="0.00"
                      className="text-lg"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex justify-between space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleSkip} className="flex-1">
                    Skip
                  </Button>
                  <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Save & Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
