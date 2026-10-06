import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { ForecastData } from './types';
import { ChartCard } from './RevenueChart';

const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

interface Props {
  data:    ForecastData | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  isDark:  boolean;
}

export default function ForecastChart({ data, loading, error, onRetry, isDark }: Props) {
  const combined = useMemo(() => {
    if (!data) return [];
    return [...data.actuals, ...data.forecast];
  }, [data]);

  const opts = useMemo<ApexOptions>(() => ({
    chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
    colors: ['#10b981', '#f59e0b'],
    stroke: { curve: 'smooth', width: 3, dashArray: [0, 5] },
    markers: { size: 4, strokeWidth: 2, strokeColors: isDark ? '#1e293b' : '#fff' },
    grid: {
      borderColor: isDark ? '#334155' : '#e2e8f0',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: combined.map(d => d.period),
      labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px', fontWeight: '700' } },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => `₱${(v / 1000).toFixed(0)}k`,
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '700' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (v: number) => fmt(v) },
    },
    legend: {
      labels: { colors: isDark ? '#94a3b8' : '#475569' },
      fontSize: '12px',
      fontWeight: '700',
    },
  }), [combined, isDark]);

  const series = useMemo(() => {
    if (!data) return [];
    const actualData = combined.map(d => d.type === 'actual' ? d.revenue : null);
    const forecastData = combined.map((d, i) => {
      // Connect last actual point to first forecast point
      if (d.type === 'forecast') return d.revenue;
      if (i < combined.length - 1 && combined[i + 1].type === 'forecast') return d.revenue;
      return null;
    });

    return [
      { name: 'Actual Sales',    data: actualData as (number | null)[] },
      { name: 'Sales Forecast',  data: forecastData as (number | null)[] },
    ];
  }, [combined, data]);

  return (
    <ChartCard title="Sales Forecast" subtitle="Actual revenue versus the next 3 months projected trend" isDark={isDark} loading={loading} empty={combined.length === 0 && !error}>
      {error && !data ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-5 text-center">
          <TrendingUp className="mb-2 h-7 w-7 text-rose-400" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-700">Forecast unavailable</p>
          <p className="mt-1 text-xs text-slate-500">{error} Check the API connection and try again.</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <span>{error}</span>
              {onRetry && <button type="button" onClick={onRetry} className="shrink-0 font-bold underline underline-offset-2">Refresh</button>}
            </div>
          )}
          <ReactApexChart options={opts} series={series} type="line" height={280} />
        </>
      )}
    </ChartCard>
  );
}
