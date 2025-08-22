import React, { useMemo } from 'react';
import { localDb } from '@/components/utils/LocalDb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, StickyNote, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StatsTab() {
  const stats = useMemo(() => {
    const passwords = localDb.list('PasswordCredential');
    const notes = localDb.list('SecureNote');
    const cards = localDb.list('CardCredential');
    
    const allTags = new Set();
    [...passwords, ...notes, ...cards].forEach(item => {
        if(item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => allTags.add(tag));
        }
    });

    const strengthCounts = { weak: 0, fair: 0, good: 0, strong: 0 };
    passwords.forEach(p => {
        if(p.password_strength && strengthCounts.hasOwnProperty(p.password_strength)) {
            strengthCounts[p.password_strength]++;
        }
    });

    const strengthData = Object.entries(strengthCounts).map(([name, value]) => ({ name, value }));
    
    return {
      passwords: passwords.length,
      notes: notes.length,
      cards: cards.length,
      total: passwords.length + notes.length + cards.length,
      tags: Array.from(allTags),
      strengthData: strengthData
    };
  }, []);

  const strengthColors = { weak: '#ef4444', fair: '#f97316', good: '#84cc16', strong: '#22c55e' };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={KeyRound} title="Passwords" value={stats.passwords} />
        <StatCard icon={StickyNote} title="Secure Notes" value={stats.notes} />
        <StatCard icon={CreditCard} title="Cards" value={stats.cards} />
        <StatCard title="Total Items" value={stats.total} />
      </div>

      <Card>
        <CardHeader><CardTitle>Password Strength</CardTitle></CardHeader>
        <CardContent>
          {stats.passwords > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.strengthData}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip wrapperClassName="!bg-background !border-border" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.strengthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={strengthColors[entry.name.toLowerCase()]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground">No passwords to analyze.</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Tag Usage</CardTitle></CardHeader>
        <CardContent>
            {stats.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {stats.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-sm">{tag}</span>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground">No tags used yet.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

const StatCard = ({ icon: Icon, title, value }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);