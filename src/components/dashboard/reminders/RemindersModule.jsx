
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, AlertTriangle, RotateCcw, Bell, Eye } from 'lucide-react';
import { localDb } from '@/components/utils/LocalDb';
import { useTileStyle } from '@/components/utils/useTileStyle';
import AddEditReminderModal from './AddEditReminderModal';
import ViewAllRemindersModal from './ViewAllRemindersModal';
import ReminderCard from './ReminderCard';

// Broadcast a lightweight "db changed" event so parent can refresh
function fireDbChanged(entity, action, payload = {}) {
  try {
    window.dispatchEvent(new CustomEvent('db:changed', {
      detail: { entity, action, ...payload }
    }));
  } catch {}
}

export function RemindersModule({ reminders, onDataUpdate, alertsCount }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const tileStyle = useTileStyle();

  const appSettings = localDb.list('AppSettings')[0] || {};
  const showAllReminders = appSettings.showAllReminders ?? false;
  const showSubscriptionLogos = appSettings.showSubscriptionLogos ?? true;

  const { subscriptions, reminderItems, totalAlertsCount } = useMemo(() => {
    const now = new Date();
    // Adjust current time to avoid timezone issues
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    
    const subscriptions = [];
    const reminderItems = [];
    let alertCount = 0;

    (reminders || []).forEach(reminder => {
      if (!reminder.next_due_date || reminder.is_completed) return;

      const dueDate = new Date(reminder.next_due_date);
      // Adjust due date to avoid timezone issues
      dueDate.setMinutes(dueDate.getMinutes() + dueDate.getTimezoneOffset());
      
      // Calculate alert window based on frequency
      let alertDays = 5; // Default fallback
      switch (reminder.frequency) {
        case 'monthly':
          alertDays = 7;
          break;
        case 'bi_annually':
        case 'semi_annually': // Support both naming conventions
          alertDays = 14;
          break;
        case 'yearly':
        case 'annually': // Support both naming conventions
          alertDays = 30;
          break;
      }
      
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + alertDays);
      
      // Item is in alert window if due date is within alert window OR overdue
      const isInAlertWindow = dueDate <= alertDate;
      const isOverdue = dueDate < now;
      
      // Count alerts (items in window or overdue)
      if (isInAlertWindow) {
        alertCount++;
      }
      
      // Show logic based on compact view setting
      const shouldShow = showAllReminders || isInAlertWindow;
      
      if (shouldShow) {
        const reminderWithStatus = {
          ...reminder,
          isOverdue,
          isInAlertWindow,
          dueDate: dueDate.toISOString().split('T')[0] // Store as YYYY-MM-DD for consistency
        };
        
        if (reminder.type === 'subscription') {
          subscriptions.push(reminderWithStatus);
        } else {
          reminderItems.push(reminderWithStatus);
        }
      }
    });

    // Sort by due date (overdue first, then by date)
    const sortByDueDate = (a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.next_due_date) - new Date(b.next_due_date);
    };

    subscriptions.sort(sortByDueDate);
    reminderItems.sort(sortByDueDate);

    return { subscriptions, reminderItems, totalAlertsCount: alertCount };
  }, [reminders, showAllReminders]);

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setIsAddModalOpen(true);
  };

  const handleMarkComplete = (reminder) => {
    const currentDue = new Date(reminder.next_due_date);
    // Adjust for timezone before calculation
    currentDue.setMinutes(currentDue.getMinutes() + currentDue.getTimezoneOffset());
    
    let nextDue = new Date(currentDue);

    // Calculate next due date based on frequency
    switch (reminder.frequency) {
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'bi_annually':
      case 'semi_annually':
        nextDue.setMonth(nextDue.getMonth() + 6);
        break;
      case 'yearly':
      case 'annually':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
      default:
        // For one-time reminders or unknown frequencies, mark as completed
        localDb.update('Reminder', reminder.id, {
        is_completed: true,
        last_completed_date: new Date().toISOString()
      });
      fireDbChanged('Reminder', 'update', { id: reminder.id });
      onDataUpdate();
      return;
    }
    
    // Update with new due date and completion timestamp
    const updates = {
      next_due_date: nextDue.toISOString().split('T')[0], // Store as YYYY-MM-DD
      last_completed_date: new Date().toISOString(),
      is_completed: false // Keep as active recurring item
    };

    localDb.update('Reminder', reminder.id, updates);
      fireDbChanged('Reminder', 'update', { id: reminder.id });
      onDataUpdate();
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingReminder(null);
  };

  const handleSaveReminder = () => {
    fireDbChanged('Reminder', 'save');
    onDataUpdate();
    setIsAddModalOpen(false);
    setEditingReminder(null);
  };

  const totalItems = subscriptions.length + reminderItems.length;

  return (
    <>
      <div className="group relative">
        <Card style={tileStyle} className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-yellow-500 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">
                  Bills & Subscriptions
                  {alertsCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {alertsCount}
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsViewAllModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  View All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Reminder
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {totalItems === 0 ? (
                <div className="text-center text-sm text-[var(--text-secondary)] py-8">
                  <Calendar className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--heading-color)] mb-2">
                    {showAllReminders ? 'No items found' : 'No upcoming items'}
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    {showAllReminders 
                      ? 'Add subscriptions and reminders to track them here'
                      : 'Your subscriptions and reminders will appear here when due'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {subscriptions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <RotateCcw className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold text-green-600">Subscriptions</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {subscriptions.map(sub => (
                            <ReminderCard 
                              key={sub.id} 
                              reminder={sub} 
                              onEdit={handleEdit} 
                              onMarkComplete={handleMarkComplete} 
                              showLogo={showSubscriptionLogos} 
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {reminderItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-600">Reminders</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {reminderItems.map(reminder => (
                            <ReminderCard 
                              key={reminder.id} 
                              reminder={reminder} 
                              onEdit={handleEdit} 
                              onMarkComplete={handleMarkComplete} 
                              showLogo={false}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      <AddEditReminderModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveReminder}
        reminder={editingReminder}
      />

      <ViewAllRemindersModal
        isOpen={isViewAllModalOpen}
        onClose={() => setIsViewAllModalOpen(false)}
        reminders={reminders}
        onEdit={handleEdit}
      />
    </>
  );
}
