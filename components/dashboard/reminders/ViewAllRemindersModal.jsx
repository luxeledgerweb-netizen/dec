
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, X, Pencil, CheckCircle } from "lucide-react"; // Added CheckCircle
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // New Imports
import { localDb } from '@/components/utils/LocalDb'; // Keep localDb, though not directly used in this refactor

// Define ReminderList component as it's used in the outline but not present in the original code
const ReminderList = ({ title, items, onHandle, onEdit, getStatusBadge, formatDate, getFrequencyLabel }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No {title.toLowerCase()} reminders found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(reminder => (
        <div key={reminder.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {reminder.type === 'subscription' ?
                  <Calendar className="w-4 h-4 text-green-600" /> :
                  <Bell className="w-4 h-4 text-blue-600" />
                }
                <h3 className="font-semibold">{reminder.name}</h3>
                {getStatusBadge(reminder)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="block text-xs text-gray-500 uppercase tracking-wide">Type</span>
                  <span className="capitalize">{reminder.type}</span>
                </div>

                {reminder.amount && (
                  <div>
                    <span className="block text-xs text-gray-500 uppercase tracking-wide">Amount</span>
                    <span>${reminder.amount}</span>
                  </div>
                )}

                <div>
                  <span className="block text-xs text-gray-500 uppercase tracking-wide">Frequency</span>
                  <span>{getFrequencyLabel(reminder.frequency)}</span>
                </div>

                <div>
                  <span className="block text-xs text-gray-500 uppercase tracking-wide">Due Date</span>
                  <span>{formatDate(reminder.next_due_date)}</span>
                </div>
              </div>

              {reminder.notes && (
                <div className="mt-2">
                  <span className="block text-xs text-gray-500 uppercase tracking-wide">Notes</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{reminder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* onHandle button for actions like "Mark Complete" */}
              {onHandle && !reminder.is_completed && (
                <Button variant="ghost" size="icon" onClick={() => onHandle(reminder)} title="Mark Complete">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onEdit(reminder)} title="Edit">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


export default function ViewAllRemindersModal({ isOpen, onClose, reminders, onEdit }) {
  // `filter` state and `filteredReminders` memo are removed as the new tabbed UI replaces this functionality.
  // const [filter, setFilter] = useState('all'); // all, subscriptions, reminders

  const handleDialogClose = (open) => {
    if (!open) {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString();
  };

  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'monthly':
        return 'Monthly';
      case 'bi_annually':
      case 'semi_annually':
        return 'Bi-Annually';
      case 'yearly':
      case 'annually':
        return 'Annually';
      default:
        return 'One-time'; // Handles null, undefined, and other cases
    }
  };

  const getStatusBadge = (reminder) => {
    if (reminder.is_completed) {
      return <Badge variant="secondary" className="text-xs">Completed</Badge>;
    }
    
    if (!reminder.next_due_date) {
      return <Badge variant="outline" className="text-xs">No Due Date</Badge>;
    }

    const dueDate = new Date(reminder.next_due_date);
    const now = new Date();
    const isOverdue = dueDate < now;
    const isDueSoon = dueDate <= new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

    if (isOverdue) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    } else if (isDueSoon) {
      return <Badge variant="default" className="text-xs bg-orange-500">Due Soon</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
    }
  };

  // NEW: Categorize reminders for tabs
  const { upcoming, overdue, future, completed } = useMemo(() => {
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const upcomingList = [];
    const overdueList = [];
    const futureList = [];
    const completedList = [];

    if (!reminders) {
      return { upcoming: [], overdue: [], future: [], completed: [] };
    }

    reminders.forEach(reminder => {
      if (reminder.is_completed) {
        completedList.push(reminder);
      } else if (!reminder.next_due_date) {
        // Reminders with no due date and not completed are considered future or uncategorized
        // Placing them in future for now as per the given tabs
        futureList.push(reminder);
      } else {
        const dueDate = new Date(reminder.next_due_date);
        if (dueDate < now) {
          overdueList.push(reminder);
        } else if (dueDate <= fiveDaysFromNow) {
          upcomingList.push(reminder);
        } else {
          futureList.push(reminder);
        }
      }
    });

    return { upcoming: upcomingList, overdue: overdueList, future: futureList, completed: completedList };
  }, [reminders]);

  const handleEdit = (reminder) => {
    onEdit(reminder);
  };

  const onHandleItem = (reminder) => {
    // This function can be expanded to handle actions like marking a reminder complete.
    // For now, it logs the action. In a real app, it would update the reminder's status.
    console.log("Handling item (e.g., Mark Complete):", reminder.id, reminder.name);
    // Example: Trigger an update if this modal could manage state changes:
    // localDb.reminders.update(reminder.id, { is_completed: true }).then(() => {
    //   // Potentially trigger a refresh of reminders from parent component
    // });
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Reminders & Subscriptions
          </DialogTitle>
        </DialogHeader>

        {/* Replaced old filter buttons and list with Tabs component */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
            <TabsTrigger value="future">Future ({future.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <div className="mt-4 max-h-[60vh] overflow-y-auto px-1">
            <TabsContent value="upcoming">
              <ReminderList
                title="Upcoming"
                items={upcoming}
                onHandle={onHandleItem}
                onEdit={handleEdit}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                getFrequencyLabel={getFrequencyLabel}
              />
            </TabsContent>
            <TabsContent value="overdue">
              <ReminderList
                title="Overdue"
                items={overdue}
                onHandle={onHandleItem}
                onEdit={handleEdit}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                getFrequencyLabel={getFrequencyLabel}
              />
            </TabsContent>
            <TabsContent value="future">
              <ReminderList
                title="Future"
                items={future}
                onHandle={onHandleItem}
                onEdit={handleEdit}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                getFrequencyLabel={getFrequencyLabel}
              />
            </TabsContent>
            <TabsContent value="completed">
              <ReminderList
                title="Completed"
                items={completed}
                onHandle={onHandleItem}
                onEdit={handleEdit}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                getFrequencyLabel={getFrequencyLabel}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* DialogFooter added as per outline */}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
