import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// tiny keyword → emoji “category” detector
const detectIcon = (text = '') => {
  const t = String(text).toLowerCase();
  if (/(travel|airport|tsa|global entry|lounge|airline|hotel|miles)/.test(t)) return '✈️';
  if (/(cash|cashback|statement credit|rebate)/.test(t)) return '💵';
  if (/(dining|restaurant|food|ubereats|doordash|grubhub|coffee)/.test(t)) return '🍽️';
  if (/(gas|fuel)/.test(t)) return '⛽';
  if (/(grocery|supermarket)/.test(t)) return '🛒';
  if (/(stream|netflix|hulu|disney|spotify|apple music)/.test(t)) return '🎬';
  if (/(phone|cell|wireless)/.test(t)) return '📱';
  if (/(warranty|purchase protection|extended|return protection)/.test(t)) return '🛡️';
  if (/(rideshare|uber|lyft|transit)/.test(t)) return '🚗';
  return '🎁';
};

// highlight search matches (simple, safe)
const highlight = (text, q) => {
  if (!q) return text;
  const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/40 rounded px-0.5">{p}</mark>
      : <span key={i}>{p}</span>
  );
};

export default function CreditCardBenefitsModal({ isOpen, onClose, creditCards }) {
  const [query, setQuery] = useState('');
  const [issuer, setIssuer] = useState('all');

  const cardsWithBenefits = useMemo(
    () => (creditCards || []).filter(c => c?.benefits && String(c.benefits).trim().length > 0),
    [creditCards]
  );

  // Build issuer list
  const issuers = useMemo(() => {
    const set = new Set();
    cardsWithBenefits.forEach(c => c.institution && set.add(c.institution));
    return ['all', ...Array.from(set)];
  }, [cardsWithBenefits]);

  // Filter + search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cardsWithBenefits.filter(card => {
      if (issuer !== 'all' && card.institution !== issuer) return false;
      if (!q) return true;
      const hay = [
        card.name || '',
        card.institution || '',
        card.benefits || ''
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [cardsWithBenefits, issuer, query]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 pt-5 pb-4">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gift className="w-5 h-5 text-purple-600" />
              Credit Card Benefits
            </DialogTitle>
          </DialogHeader>

          {/* Controls */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search card name, issuer, or any benefit…"
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div>
              <Label className="sr-only" htmlFor="issuer">Issuer</Label>
              <select
                id="issuer"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                {issuers.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === 'all' ? 'All issuers' : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto px-6 pb-6 pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">No matching benefits</h3>
              <p className="text-sm text-muted-foreground">
                Try a different search or issuer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence initial={false}>
                {filtered.map((card, idx) => {
                  const icon = detectIcon(card.benefits);
                  return (
                    <motion.div
                      key={card.id || `${card.name}-${idx}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base sm:text-lg flex items-center gap-3">
                            <span className="text-lg">{icon}</span>
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                              {highlight(card.name, query)}
                            </span>
                            {card.institution && (
                              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                                • {highlight(card.institution, query)}
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-purple-50/60 dark:bg-purple-900/20 p-3 rounded-md">
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-[0.95rem] text-foreground/90">
                                {highlight(card.benefits, query)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-5">
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}