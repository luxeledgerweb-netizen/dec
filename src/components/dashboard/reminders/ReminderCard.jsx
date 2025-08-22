import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function ReminderCard({ reminder, onEdit, onMarkComplete, showLogo = false }) {
  const formatDueDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getFrequencyLabel = (frequency) => {
    switch (frequency) {
      case 'monthly': return 'Monthly';
      case 'bi_annually':
      case 'semi_annually': return 'Bi-Annual';
      case 'yearly':
      case 'annually': return 'Annual';
      default: return 'One-time';
    }
  };

  const getDueDateStyle = () => {
    if (reminder.isOverdue) {
      return 'text-red-600 font-bold';
    }
    if (reminder.isInAlertWindow) {
      return 'text-orange-600 font-semibold';
    }
    return 'text-[var(--text-secondary)]';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card className={`h-full transition-all duration-200 hover:shadow-md ${
        reminder.isOverdue ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10' : 
        reminder.isInAlertWindow ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-900/10' : 
        'hover:border-blue-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showLogo && reminder.website && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${reminder.website}&sz=32`}
                  alt=""
                  className="w-8 h-8 rounded flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = `https://avatar.vercel.sh/${reminder.name}.png?size=32`;
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[var(--heading-color)] truncate" title={reminder.name}>
                  {reminder.name}
                </h4>
                {reminder.amount && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    ${reminder.amount}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(reminder)}
                title="Edit"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => onMarkComplete(reminder)}
                title="Mark Complete"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Due:</span>
              <span className={getDueDateStyle()}>
                {formatDueDate(reminder.next_due_date)}
                {reminder.isOverdue && (
                  <AlertTriangle className="w-3 h-3 inline ml-1 text-red-600" />
                )}
              </span>
            </div>
            
            {reminder.frequency && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Frequency:</span>
                <Badge variant="outline" className="text-xs">
                  {getFrequencyLabel(reminder.frequency)}
                </Badge>
              </div>
            )}
            
            {reminder.notes && (
              <div className="text-xs text-[var(--text-secondary)] truncate" title={reminder.notes}>
                {reminder.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}