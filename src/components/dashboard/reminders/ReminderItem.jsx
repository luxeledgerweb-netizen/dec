import React, { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Pencil, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

function ReminderItem({ item, onHandle, onEdit }) {
  const now = new Date();
  const dueDate = new Date(item.next_due_date);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let alertDays;
  if (item.type === 'subscription') {
      alertDays = 5;
  } else {
      switch (item.recurrence) {
          case 'monthly': alertDays = 7; break;
          case 'semi_annually': alertDays = 14; break;
          case 'yearly': alertDays = 30; break;
          default: alertDays = 999;
      }
  }

  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= alertDays;
  
  return (
    <div className={`p-3 rounded-lg transition-all border border-gray-200 dark:border-gray-700 relative ${
        isDueSoon ? 'bg-slate-100 dark:bg-slate-800' : ''
    }`}>
      {isDueSoon && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10 shadow-md">
            <AlertTriangle className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-[var(--text-primary)]">{item.name}</h4>
          <p className="text-xs text-[var(--text-secondary)]">
            Due: <span className={isDueSoon ? "font-bold text-red-600" : ""}>{format(dueDate, 'MMM d, yyyy')}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(item)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Checkbox
            id={`handled-${item.id}`}
            checked={false}
            onCheckedChange={() => onHandle(item)}
            className="w-4 h-4"
            aria-label={`Mark ${item.name} as handled`}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ReminderItem);