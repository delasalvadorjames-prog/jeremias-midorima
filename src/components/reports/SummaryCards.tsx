import React from 'react';
import { DashboardStats } from './types';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
const cnt = (n: number) => new Intl.NumberFormat('en-US').format(n);

interface CardDef {
  key:    keyof DashboardStats;
  label:  string;
  format: (n: number) => string;
  icon:   React.ReactNode;
  color:  string;   // Tailwind border + icon color class
  badge?: string;
}

const CARD_DEFS: CardDef[] = [
  {
    key: 'total_revenue', label: 'Total Revenue', format: fmt, color: 'emerald',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  },
  {
    key: 'total_transactions', label: 'Total Transactions', format: cnt, color: 'blue',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  },
  {
    key: 'total_products_sold', label: 'Products Sold', format: cnt, color: 'violet',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  },
  {
    key: 'low_stock', label: 'Low Stock Items', format: cnt, color: 'amber',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
  },
  {
    key: 'out_of_stock', label: 'Out of Stock', format: cnt, color: 'rose',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  },
  {
    key: 'expiring_medicines', label: 'Expiring (60 days)', format: cnt, color: 'orange',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       icon: 'text-blue-600',    border: 'border-blue-200 dark:border-blue-700',    text: 'text-blue-700' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',   icon: 'text-violet-600',  border: 'border-violet-200 dark:border-violet-700',  text: 'text-violet-700' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     icon: 'text-amber-600',   border: 'border-amber-200 dark:border-amber-700',   text: 'text-amber-700' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',       icon: 'text-rose-600',    border: 'border-rose-200 dark:border-rose-700',    text: 'text-rose-700' },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',   icon: 'text-orange-600',  border: 'border-orange-200 dark:border-orange-700',  text: 'text-orange-700' },
};

interface Props {
  stats:  DashboardStats | null;
  loading: boolean;
  isDark:  boolean;
}

function Skeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`animate-pulse h-28 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
  );
}

export default function SummaryCards({ stats, loading, isDark }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {CARD_DEFS.map(card => {
        if (loading || !stats) return <Skeleton key={card.key} isDark={isDark} />;
        const c  = COLOR_MAP[card.color];
        const val = stats[card.key] as number;

        return (
          <div
            key={card.key}
            className={`relative flex flex-col gap-2 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              isDark ? 'border-slate-700 bg-slate-900' : `border-slate-200 bg-white`
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}>
              <svg className={`h-5 w-5 ${c.icon}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {card.icon}
              </svg>
            </div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {card.label}
            </p>
            <p className={`text-2xl font-extrabold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {card.format(val)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
