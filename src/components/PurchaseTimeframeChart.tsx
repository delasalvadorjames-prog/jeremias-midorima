import React, { useMemo } from 'react';

type Metric = {
  label: string;
  value: number;
};

type Props = {
  metrics: Metric[];
};

export default function PurchaseTimeframeChart({ metrics }: Props) {
  const maxValue = useMemo(() => Math.max(...metrics.map((metric) => metric.value), 1), [metrics]);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Sales Snapshot</p>
          <h3 className="text-lg font-semibold text-slate-900">Current Timeframes</h3>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Units</span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
        {metrics.map((metric) => {
          const percentage = maxValue === 0 ? 0 : (metric.value / maxValue) * 100;
          const height = `${Math.max(8, Math.min(percentage, 100))}%`;
          return (
            <div key={metric.label} className="flex flex-col items-center gap-2 text-center">
              <div className="relative flex h-32 w-10 items-end justify-center">
                <div className="absolute inset-0 rounded-lg bg-slate-100 ring-1 ring-slate-200" />
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t from-emerald-700 to-emerald-400 shadow-sm"
                  style={{ height }}
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{metric.label}</p>
              <p className="text-sm font-semibold text-slate-900">{metric.value}</p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
