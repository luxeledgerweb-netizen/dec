import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Building2, CreditCard, Car, TrendingUp, Award, DollarSign } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const iconMap = {
  'account': <Building2 className="w-4 h-4 text-white" />,
  'credit_card': <CreditCard className="w-4 h-4 text-white" />,
  'loan': <Car className="w-4 h-4 text-white" />,
  'score': <TrendingUp className="w-4 h-4 text-white" />,
  'milestone': <Award className="w-4 h-4 text-white" />,
};

const colorMap = {
  'account': 'bg-blue-500',
  'credit_card': 'bg-purple-500',
  'loan': 'bg-indigo-500',
  'score': 'bg-green-500',
  'milestone': 'bg-yellow-500',
};

export default function FinancialJourneyTimeline({ accounts, creditCards, autoLoans, creditScores, portfolioSnapshots }) {
  const timelineEvents = useMemo(() => {
    const events = [];

    accounts.forEach(acc => events.push({
      date: new Date(acc.created_date),
      type: 'account',
      title: `Opened ${acc.name}`,
      description: `Initial balance: $${acc.initial_balance?.toLocaleString() || '0'}`
    }));

    creditCards.forEach(card => events.push({
      date: new Date(card.created_date),
      type: 'credit_card',
      title: `Got the ${card.name} card`,
      description: `Credit Limit: $${card.credit_limit?.toLocaleString() || '0'}`
    }));

    autoLoans.forEach(loan => events.push({
      date: new Date(loan.created_date),
      type: 'loan',
      title: `Started ${loan.name} loan`,
      description: `Original amount: $${loan.original_amount?.toLocaleString() || '0'}`
    }));

    creditScores.forEach(score => events.push({
      date: new Date(score.date_recorded),
      type: 'score',
      title: `Credit score update: ${score.score}`,
      description: score.notes || 'Routine check'
    }));

    // Add net worth milestones
    if (portfolioSnapshots.length > 0) {
      let lastMilestone = 0;
      const sortedSnapshots = [...portfolioSnapshots].sort((a,b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
      sortedSnapshots.forEach(snapshot => {
        const currentBalance = snapshot.total_balance;
        const currentMilestone = Math.floor(currentBalance / 50000) * 50000; // $50k milestones for timeline clarity
        if (currentMilestone > lastMilestone && currentMilestone > 0) {
          events.push({
            date: new Date(snapshot.snapshot_date),
            type: 'milestone',
            title: `Reached $${currentMilestone.toLocaleString()} Net Worth`,
            description: 'A new milestone!'
          });
          lastMilestone = currentMilestone;
        }
      });
    }

    return events.sort((a, b) => b.date - a.date);
  }, [accounts, creditCards, autoLoans, creditScores, portfolioSnapshots]);

  if (timelineEvents.length === 0) {
    return <div className="text-center text-[var(--text-secondary)] p-8">Your financial journey will appear here as you add accounts and data.</div>;
  }

  return (
    <div className="p-4 space-y-8 overflow-y-auto h-full">
      <AnimatePresence>
        {timelineEvents.map((event, index) => (
          <motion.div
            key={`${event.date}-${event.title}`}
            className="flex gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorMap[event.type]}`}>
                {iconMap[event.type]}
              </div>
              {index < timelineEvents.length - 1 && (
                <div className="absolute top-10 left-1/2 w-0.5 h-full bg-[var(--border-subtle)] -translate-x-1/2"></div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-[var(--text-secondary)]">{format(event.date, 'MMMM d, yyyy')}</p>
              <h4 className="font-semibold text-[var(--text-primary)]">{event.title}</h4>
              <p className="text-sm text-[var(--text-secondary)]">{event.description}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}