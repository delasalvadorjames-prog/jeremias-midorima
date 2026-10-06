import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';
import { MonthlySalesPoint } from './types';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
}).format(n);

type Preset = 'today' | 'weekly' | 'monthly' | 'yearly';
interface Props {
  data: MonthlySalesPoint[];
  loading: boolean;
  isDark: boolean;
  activePreset?: Preset;
  onSelectPreset?: (preset: Preset) => void;
}

const PERIODS: { id: Preset; label: string }[] = [
  { id: 'today', label: "Today's Report" },
  { id: 'weekly', label: 'Weekly Report' },
  { id: 'monthly', label: 'Monthly Report' },
  { id: 'yearly', label: 'Yearly Report' },
];

const chartConfig = { revenue: { label: 'Revenue', color: '#10b981' } } as const;

function formatPeriod(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return value.length > 7
    ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
}

export default function RevenueChart({ data, loading, isDark, activePreset = 'monthly', onSelectPreset }: Props) {
  const chartData = useMemo(() => data.map(point => ({ ...point, label: formatPeriod(point.period) })), [data]);
  const surface = isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${surface}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Sales Revenue</h3>
          <p className={`mt-0.5 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Revenue trend across the selected period</p>
        </div>
        {onSelectPreset && (
          <div className={`grid grid-cols-2 gap-1 rounded-xl p-1 text-xs sm:flex ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {PERIODS.map(period => (
              <button key={period.id} type="button" aria-pressed={activePreset === period.id} onClick={() => onSelectPreset(period.id)}
                className={`rounded-lg px-2.5 py-1.5 font-bold transition sm:whitespace-nowrap ${activePreset === period.id ? 'bg-emerald-600 text-white shadow-sm' : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}>
                {period.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {loading ? (
        <div className={`flex h-[240px] items-center justify-center rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}><span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>
      ) : chartData.length === 0 ? (
        <div className={`flex h-[240px] items-center justify-center rounded-xl border border-dashed text-sm font-bold ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>No sales data for this period</div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[240px] w-full aspect-auto">
          <LineChart accessibilityLayer data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} strokeDasharray="4 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={58} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }} tickFormatter={(value) => `₱${Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value}`} />
            <ChartTooltip cursor={{ stroke: isDark ? '#64748b' : '#cbd5e1', strokeDasharray: '4 4' }} content={<ChartTooltipContent formatter={(value) => <div className="flex w-full justify-between gap-4"><span>Revenue</span><span className="font-mono font-bold">{fmt(Number(value))}</span></div>} />} />
            <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-revenue)', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
}

export function ChartCard({ title, subtitle, isDark, loading, empty, children }: { title: string; subtitle: string; isDark: boolean; loading: boolean; empty: boolean; children: React.ReactNode }) {
  const surface = isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white';
  return <div className={`rounded-2xl border p-4 shadow-sm ${surface}`}><div className="mb-3"><h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3><p className={`mt-0.5 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p></div>{loading ? <div className="flex h-52 items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div> : empty ? <div className="flex h-52 items-center justify-center text-sm font-bold text-slate-400">No data for this period</div> : children}</div>;
}
