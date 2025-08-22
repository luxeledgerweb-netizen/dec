
import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge'; // Added Badge
import { TrendingUp } from 'lucide-react';
import { useTileStyle } from '@/components/utils/useTileStyle';
import { SessionManager } from '@/components/utils/SessionManager';

export default function GrowthChart({ accounts, autoLoans, snapshots, history, liveNetWorth, liveAssetBalance }) {
  const tileStyle = useTileStyle();
  // Renamed selectedFilter to viewType based on the provided outline
  const [viewType, setViewType] = useState('net_worth'); // default
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const currencySymbol = SessionManager.getCurrencySymbol();

  // Helper for formatting currency, used for the Live Net Worth badge
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '';
    return `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Safe data handling
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeAutoLoans = Array.isArray(autoLoans) ? autoLoans : [];
  const safeSnapshots = Array.isArray(snapshots) ? snapshots : [];
  const safeHistory = Array.isArray(history) ? history : [];

// Normalize "YYYY-MM" from row.month or row.date
const ymOf = (row) => String(row?.month ?? row?.date ?? '').slice(0, 7);


// tiny safe string helper
const s = (v) => String(v || '').toLowerCase();

// Net Worth from history (no fill-forward)
// - Subtract ONLY loan_type-auto and loan_type-personal
// - Ignore everything else (mortgage, student, credit, etc.)
// - Everything else (assets) is added as-is
const buildNetWorthFromHistory = (history = [], accounts = []) => {
  const latestByAccMonth = new Map();

  // group by account + month, keep the latest balance
  for (const h of history || []) {
    const accId = h.account_id ?? h.accountId;
    if (!accId) continue;

    const ym = String(h?.month ?? h?.date ?? '').slice(0, 7);
    if (ym.length !== 7) continue;

    const key = `${accId}|${ym}`;
    const ts = new Date(h.updated_date || h.date || (h.month ? `${h.month}-01` : '')).getTime();
    const prev = latestByAccMonth.get(key);
    const prevTs = prev
      ? new Date(prev.updated_date || prev.date || (prev.month ? `${prev.month}-01` : '')).getTime()
      : -Infinity;
    if (!prev || ts > prevTs) {
      latestByAccMonth.set(key, h);
    }
  }

  const sumByMonth = new Map();

  for (const [, h] of latestByAccMonth) {
    const ym = String(h?.month ?? h?.date ?? '').slice(0, 7);
    const accId = h.account_id ?? h.accountId;

    let value = Number(h.balance ?? 0);

    if (accId === 'loan_type-auto' || accId === 'loan_type-personal') {
      // force subtract
      value = value > 0 ? -value : value;
    } else {
      // ignore any other loan_type-* (mortgage/student/etc.)
      if (String(accId).startsWith('loan_type-')) continue;
      // otherwise treat as asset
    }

    sumByMonth.set(ym, (sumByMonth.get(ym) ?? 0) + value);
  }

  return Array.from(sumByMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([ym, total]) => {
      const [y, m] = ym.split('-').map(Number);
      return { date: new Date(y, m - 1, 1), balance: total, isLive: false };
    });
};

// Assets Only from history (no loans; no fill-forward)
// - Include every history row EXCEPT the synthetic loan_type-* rows
// - Sum the latest balance per (account, month)
// - No dependency on accounts[] so it can't crash if empty
const buildAssetsFromHistory = (history = []) => {
  const latestByAccMonth = new Map(); // key: `${accId}|${YYYY-MM}`

  for (const h of history || []) {
    const accId = h.account_id ?? h.accountId;
    if (!accId) continue;

    // Drop ALL synthetic loan buckets (auto/personal/mortgage/student/etc.)
    if (String(accId).startsWith('loan_type-')) continue;

    const ym = String(h.month ?? h.date ?? '').slice(0, 7);
    if (ym.length !== 7) continue;

    const key = `${accId}|${ym}`;
    const ts = new Date(
      h.updated_date || h.date || (h.month ? `${h.month}-01` : '')
    ).getTime();

    const prev = latestByAccMonth.get(key);
    const prevTs = prev
      ? new Date(
          prev.updated_date || prev.date || (prev.month ? `${prev.month}-01` : '')
        ).getTime()
      : -Infinity;

    if (!prev || ts > prevTs) latestByAccMonth.set(key, h);
  }

  const sumByMonth = new Map();
  for (const [, h] of latestByAccMonth) {
    const ym = String(h.month ?? h.date ?? '').slice(0, 7);
    const val = Number(h.balance ?? 0);
    if (!Number.isFinite(val)) continue;
    sumByMonth.set(ym, (sumByMonth.get(ym) ?? 0) + val);
  }

  return Array.from(sumByMonth.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([ym, total]) => {
      const [y, m] = ym.split('-').map(Number);
      return { date: new Date(y, m - 1, 1), balance: total, isLive: false };
    });
};

  // dropdownOptions memo is preserved as it might be used internally or for future features,
  // but its content is no longer directly used to populate the Select dropdowns in the UI,
  // as the outline specified new fixed options for the main filter.
  const dropdownOptions = useMemo(() => {
    // Get accounts with non-zero balance
      const softDeletedAccounts = safeAccounts.filter(acc =>
        !acc.is_archived &&
        acc.is_deleted
      );

      const activeAccounts = safeAccounts.filter(acc =>
        !acc.is_archived &&
        !acc.is_deleted &&
        acc.current_balance > 0
      );

      const zeroBalanceAccounts = safeAccounts.filter(acc =>
        !acc.is_archived &&
        !acc.is_deleted &&
        acc.current_balance === 0
      );

      // Combine: active first, then zero balance, then soft-deleted
      const sortByInstitutionThenName = (a, b) => {
        const instA = a.institution?.toLowerCase() || '';
        const instB = b.institution?.toLowerCase() || '';
        if (instA !== instB) return instA.localeCompare(instB);
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      };

      const allAccounts = [
        ...activeAccounts.sort(sortByInstitutionThenName).map(acc => ({ ...acc, showZero: false, wasDeleted: false })),
        ...zeroBalanceAccounts.sort(sortByInstitutionThenName).map(acc => ({ ...acc, showZero: true, wasDeleted: false })),
        ...softDeletedAccounts.sort(sortByInstitutionThenName).map(acc => ({ ...acc, showZero: true, wasDeleted: true }))
      ];

    // Get loan types that have historical data or current balances
    const loanTypeSet = new Set();

    // Add from current loans
    safeAutoLoans.forEach(loan => {
      if (loan.loan_type !== 'mortgage' && loan.current_balance > 0) {
        loanTypeSet.add(loan.loan_type);
      }
    });

    // Add from historical data to ensure all past types are included
    safeHistory.forEach(h => {
      if (h.account_id && h.account_id.startsWith('loan_type-')) {
        loanTypeSet.add(h.account_id.replace('loan_type-', ''));
      }
    });

    const loanTypes = Array.from(loanTypeSet).map(type => ({
      type,
      displayName: type === 'auto' ? 'Auto Loans' :
                   type === 'student' ? 'Student Loans' :
                   type === 'personal' ? 'Personal Loans' :
                   `${type.charAt(0).toUpperCase() + type.slice(1)} Loans`
    }));

    return { accounts: allAccounts, loanTypes };
  }, [safeAccounts, safeAutoLoans, safeHistory]);

  const availableYears = useMemo(() => {
  // default to snapshots for portfolio views
  if (viewType === 'net_worth' || viewType === 'assets') {
    const years = new Set(
      safeSnapshots.map(s =>
        String(s.year ?? new Date(s.snapshot_date ?? s.created_date).getFullYear())
      )
    );
    const list = Array.from(years).sort((a,b)=>+b-+a);
    return list.length > 1 ? ['all-time', ...list] : (list.length ? list : [String(new Date().getFullYear())]);
  }

  // account view: look at history AND snapshots.account_breakdown
  if (viewType.startsWith('account-')) {
    const accountId = viewType.replace('account-', '');
    const years = new Set();

    // history years
    for (const h of safeHistory) {
      if (h.account_id !== accountId) continue;
      const d = h.date ? new Date(h.date) : (h.month ? new Date(`${h.month}-01`) : null);
      if (d && !Number.isNaN(+d)) years.add(String(d.getFullYear()));
    }

    // snapshot years where that account appears in account_breakdown
    for (const s of safeSnapshots) {
      if (!s.account_breakdown || s.account_breakdown[accountId] == null) continue;
      const d = s.snapshot_date ? new Date(s.snapshot_date) : new Date(s.year, (s.month ?? 1) - 1, 1);
      if (d && !Number.isNaN(+d)) years.add(String(d.getFullYear()));
    }

    // ensure current year so live point shows
    years.add(String(new Date().getFullYear()));

    const list = Array.from(years).sort((a,b)=>+b-+a);
    return list.length > 1 ? ['all-time', ...list] : (list.length ? list : [String(new Date().getFullYear())]);
  }

  // loan type view: gather years from BalanceHistory entries like account_id = loan_type-XYZ
  if (viewType.startsWith('loan_type-')) {
    const loanType = viewType.replace('loan_type-', '');
    const years = new Set();

    for (const h of safeHistory) {
      if (h.account_id !== `loan_type-${loanType}`) continue;
      const d = h.date ? new Date(h.date) : (h.month ? new Date(`${h.month}-01`) : null);
      if (d && !Number.isNaN(+d)) years.add(String(d.getFullYear()));
    }

    const list = Array.from(years).sort((a,b)=>+b-+a);
    return list.length > 1 ? ['all-time', ...list] : (list.length ? list : [String(new Date().getFullYear())]);
  }

  // default fallback (guarantee a value)
  return [String(new Date().getFullYear())];
}, [viewType, safeSnapshots, safeHistory]);

  // Reset year if invalid
  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || new Date().getFullYear().toString());
    }
  }, [availableYears, selectedYear]);

  const { chartData, xAxisFormatter } = useMemo(() => {
    let dataPoints = [];
    const currentDate = new Date();

    // Logic updated to reflect new `viewType` values
    if (viewType === 'net_worth') {
  // Prefer monthly totals from BalanceHistory (no fill-forward). Fallback to snapshots if none exist.
  const fromHistory = buildNetWorthFromHistory(safeHistory, safeAccounts, safeAutoLoans);

  if (fromHistory.length > 0) {
    dataPoints = fromHistory;
  } else {
    const snapshotsByMonth = {};
    safeSnapshots.forEach(s => {
      const key = `${s.year}-${s.month}`;
      if (!snapshotsByMonth[key] || new Date(s.created_date) > new Date(snapshotsByMonth[key].created_date)) {
        snapshotsByMonth[key] = s;
      }
    });
    dataPoints = Object.values(snapshotsByMonth).map(s => ({
      date: new Date(s.year, s.month - 1),
      balance: s.total_balance,
      assetBalance: s.asset_balance,
      loanBalance: s.loan_balance,
      isLive: false
    }));
  }

  // keep your live point
  if (liveNetWorth !== undefined) {
    dataPoints.push({
      date: currentDate,
      balance: liveNetWorth,
      assetBalance: liveAssetBalance,
      loanBalance: (liveAssetBalance || 0) - (liveNetWorth || 0),
      isLive: true
    });
      }
    } else if (viewType === 'assets') {
  const fromHistory = buildAssetsFromHistory(safeHistory);
  if (fromHistory.length > 0) {
    dataPoints = fromHistory;
  } else {
    // fallback to snapshots
    const snapshotsByMonth = {};
    safeSnapshots.forEach(s => {
      const key = `${s.year}-${s.month}`;
      if (!snapshotsByMonth[key] || new Date(s.created_date) > new Date(snapshotsByMonth[key].created_date)) {
        snapshotsByMonth[key] = s;
      }
    });
    dataPoints = Object.values(snapshotsByMonth).map(s => ({
      date: new Date(s.year, s.month - 1),
      balance: s.asset_balance,
      isLive: false
    }));
  }
  if (liveAssetBalance !== undefined) {
    dataPoints.push({ date: new Date(), balance: liveAssetBalance, isLive: true });
    }

  } else if (viewType.startsWith('account-')) {
  const accountId = viewType.replace('account-', '');

  // 1) Build from BalanceHistory (date/month accepted)
  const byMonth = {};
  for (const h of safeHistory) {
    if (h.account_id !== accountId) continue;
    const d = h.date
      ? new Date(h.date)
      : (h.month ? new Date(`${h.month}-01`) : null);
    if (!d || Number.isNaN(+d)) continue;
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const existing = byMonth[key];
    if (!existing || new Date(h.updated_date || h.date || `${h.month}-01`) > new Date(existing.updated_date || existing.date)) {
      byMonth[key] = { date: new Date(d.getFullYear(), d.getMonth(), 1), balance: h.balance };
    }
  }

  // 2) If a month is missing, try PortfolioSnapshot.account_breakdown
  //    (assumes snapshots have year/month or snapshot_date and an object mapping id -> balance)
  const snapMonths = {};
  for (const s of safeSnapshots) {
    const snapDate = s.snapshot_date
      ? new Date(s.snapshot_date)
      : new Date(s.year, (s.month ?? 1) - 1, 1);
    if (!snapDate || Number.isNaN(+snapDate)) continue;

    const key = `${snapDate.getFullYear()}-${snapDate.getMonth() + 1}`;
    // only fill if we don't already have history for that month
    if (!byMonth[key] && s.account_breakdown && s.account_breakdown[accountId] != null) {
      snapMonths[key] = {
        date: new Date(snapDate.getFullYear(), snapDate.getMonth(), 1),
        balance: s.account_breakdown[accountId],
      };
    }
  }

  const rows = [...Object.values(byMonth), ...Object.values(snapMonths)];

  // Optional live point for the current month (keeps current behavior)
  const acc = safeAccounts.find(a => a.id === accountId);
  if (acc && typeof acc.current_balance === 'number') {
    rows.push({
      date: new Date(),
      balance: acc.current_balance,
      isLive: true,
    });
  }

  dataPoints = rows;
}
      else if (viewType.startsWith('loan_type-')) {
        const loanType = viewType.replace('loan_type-', '');
        const historyByMonth = {};

        safeHistory.forEach(h => {
          // Look for synthetic "loan type" entries with account_id like loan_type-auto
          if (h.account_id === `loan_type-${loanType}`) {
            const dateObj = new Date(h.date);
            const key = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}`;
            const existing = historyByMonth[key];
            if (!existing || new Date(h.updated_date || h.date) > new Date(existing.updated_date || existing.date)) {
              historyByMonth[key] = h;
            }
          }
        });

  dataPoints = Object.values(historyByMonth).map(h => ({
    date: new Date(h.date),
    balance: -Math.abs(h.balance), // Show as negative bar on the graph
    isLive: false
  }));
}

    let finalData = dataPoints;
    if (selectedYear !== 'all-time') {
      finalData = dataPoints.filter(dp => dp.date.getFullYear() === parseInt(selectedYear, 10));
    }

    finalData.sort((a, b) => a.date - b.date);

    const formatter = (dateStr) => {
      const date = new Date(dateStr);
      
      // For single year views, show months
      if (selectedYear !== 'all-time') {
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
      
      // All Time view - Adaptive labeling based on time span
      if (finalData.length === 0) return date.getFullYear().toString(); // Ensure string return
      
      const startDate = new Date(finalData[0].date);
      const endDate = new Date(finalData[finalData.length - 1].date);
      
      // Calculate time span in months
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - startDate.getMonth());
      
      const year = date.getFullYear();
      const month = date.getMonth();
      
      if (monthsDiff <= 12) {
        // ≤ 12 months: Show every month
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (monthsDiff <= 48) {
        // 2-4 years: Show every 2-3 months (Jan, Apr, Jul, Oct)
        if (month % 3 === 0) {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return '';
      } else if (monthsDiff <= 108) {
        // 5-9 years: Show only years
        if (month === 0) { // Show only January of each year
          return year.toString();
        }
        return '';
      } else {
        // 10+ years: Show every 2nd year
        if (month === 0 && year % 2 === 0) {
          return year.toString();
        }
        return '';
      }
    };

    return { chartData: finalData, xAxisFormatter: formatter };
  }, [viewType, selectedYear, safeSnapshots, safeHistory, safeAccounts, liveNetWorth, liveAssetBalance]); // Dependencies updated for new viewType

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0 || payload[0].value === null) return null;

    const data = payload[0].payload;
    const balance = payload[0].value;
    let filterLabel = "Balance";

    // Logic updated to reflect new `viewType` values
    if (viewType === 'net_worth') {
      filterLabel = 'Net Worth';
    } else if (viewType === 'assets') {
      filterLabel = 'Assets';
    } else if (viewType.startsWith('account-')) {
      filterLabel = 'Account Balance';
    } else if (viewType.startsWith('loan_type-')) {
        filterLabel = 'Loan Balance';
    }

    const displayDate = new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="p-3 rounded-lg shadow-lg bg-[var(--popover)] border border-[var(--border)]">
        <p className="font-bold text-lg text-[var(--popover-foreground)]">{displayDate}</p>
        {data.isLive && viewType === 'net_worth' ? ( // Show detailed breakdown only for live Net Worth
          <div className="space-y-1 mt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-500">Assets:</span>
              <span className="font-medium text-[var(--popover-foreground)]">{currencySymbol}{(data.assetBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-red-500">Loans:</span>
              <span className="font-medium text-[var(--popover-foreground)]">-{currencySymbol}{(data.loanBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-[var(--border)] my-1"></div>
            <div className="flex justify-between items-center text-base">
              <span className="font-semibold text-blue-500">Net Worth (Live):</span>
              <span className="font-bold text-[var(--popover-foreground)]">{currencySymbol}{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        ) : (
          <p className="text-base" style={{ color: "hsl(var(--primary))" }}>
            {filterLabel}: {balance < 0 ? '-' : ''}{currencySymbol}{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {data.isLive && <span className="text-blue-500 ml-2">(Live)</span>}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="group relative">
      <Card style={tileStyle} className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-30 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 pb-4"> {/* Adjusted classes for mobile responsiveness */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div> {/* Added a div to group CardTitle and CardDescription */}
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Portfolio Growth
                  {liveNetWorth !== null && (
                    <Badge variant="outline" className="text-xs">
                      Live: {formatCurrency(liveNetWorth)}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">Track your wealth over time</CardDescription> {/* Added CardDescription */}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 min-w-0"> {/* Adjusted classes for mobile responsiveness */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-32"> {/* Adjusted width for mobile */}
                  <SelectValue /> {/* Placeholder removed as per outline */}
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year === 'all-time' ? 'All Time' : year} {/* Preserved 'All Time' display logic */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Replaced the original selectedFilter Select with the new viewType Select */}
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger className="w-full sm:w-40"> {/* Adjusted width for mobile */}
                  <SelectValue /> {/* Placeholder removed as per outline */}
                </SelectTrigger>
                <SelectContent>
        <SelectGroup>
         <SelectLabel>Portfolio Views</SelectLabel>
          <SelectItem value="net_worth">Net Worth</SelectItem>
          <SelectItem value="assets">Assets Only</SelectItem>
        </SelectGroup>
        {dropdownOptions.accounts.length > 0 && (
          <SelectGroup>
            <SelectLabel>Accounts</SelectLabel>
            {dropdownOptions.accounts.map(account => (
              <SelectItem key={account.id} value={`account-${account.id}`}>
                {account.name} ({account.institution})
                {account.showZero ? ' ($0)' : ''}
                {account.wasDeleted ? ' [Deleted]' : ''}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      {dropdownOptions.loanTypes.length > 0 && (
        <SelectGroup>
          <SelectLabel>Loan Types</SelectLabel>
          {dropdownOptions.loanTypes.map(loan => (
            <SelectItem key={loan.type} value={`loan_type-${loan.type}`}>
              {loan.displayName}
            </SelectItem>
          ))}
        </SelectGroup>
      )}
      </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--text-secondary))"
                    fontSize={12}
                    tick={{ dy: 5 }}
                    tickFormatter={xAxisFormatter}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="hsl(var(--text-secondary))"
                    fontSize={12}
                    tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
                    domain={['dataMin - 1000', 'dataMax + 1000']}
                    allowDataOverflow={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={chartData.length > 1 ? 1 : 0}
                    fill="url(#colorUv)"
                    dot={selectedYear === 'all-time' ? false : { r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">No data available</p>
                  <p className="text-sm">
                    {viewType === 'net_worth' // Changed from selectedFilter
                      ? 'No portfolio snapshots found for the selected time period.'
                      : 'No historical data found for this selection.'
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
