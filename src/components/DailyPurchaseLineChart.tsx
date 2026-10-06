import React, { useMemo } from 'react';

type Point = {
  label: string;
  value: number;
};

type Props = {
  data: Point[];
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const H_PADDING = 28;
const V_PADDING = 20;

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const buildAxisLines = (minValue: number, maxValue: number) => {
  const range = Math.max(maxValue - minValue, 1);
  return [0, 0.5, 1].map((ratio) => ({
    ratio,
    value: minValue + ratio * range,
    y: CHART_HEIGHT - V_PADDING - ratio * (CHART_HEIGHT - 2 * V_PADDING),
  }));
};

export default function DailyPurchaseLineChart({ data }: Props) {
  const points = useMemo(() => {
    if (!data.length) return [];
    const min = Math.min(...data.map((point) => point.value), 0);
    const max = Math.max(...data.map((point) => point.value), min + 1);
    const range = max - min;
    const step = Math.max(data.length - 1, 1);

    return data.map((point, index) => {
      const ratio = range === 0 ? 0 : (point.value - min) / range;
      const x = H_PADDING + ((CHART_WIDTH - 2 * H_PADDING) * index) / step;
      const y = CHART_HEIGHT - V_PADDING - ratio * (CHART_HEIGHT - 2 * V_PADDING);
      return { ...point, x, y };
    });
  }, [data]);

  const axisLines = useMemo(() => {
    const min = Math.min(...data.map((point) => point.value), 0);
    const max = Math.max(...data.map((point) => point.value), min + 1);
    return buildAxisLines(min, max);
  }, [data]);

  if (!points.length) return null;

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1].x} ${CHART_HEIGHT - V_PADDING} L ${points[0].x} ${CHART_HEIGHT - V_PADDING} Z`;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Purchase Trend</p>
          <h3 className="text-lg font-semibold text-slate-900">Today vs Yesterday</h3>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Units</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80 p-2">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full">
          <defs>
            <linearGradient id="purchase-line-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </linearGradient>
          </defs>

          {axisLines.map((line) => (
            <g key={line.ratio}>
              <line
                x1={H_PADDING}
                x2={CHART_WIDTH - H_PADDING}
                y1={line.y}
                y2={line.y}
                stroke="#e2e8f0"
                strokeDasharray="4 5"
              />
              <text x={0} y={line.y + 4} fill="#94a3b8" fontSize="10">
                {formatter.format(Math.round(line.value))}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#purchase-line-fill)" />
          <path d={path} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point) => (
            <circle key={point.label} cx={point.x} cy={point.y} r={4.5} fill="#ffffff" stroke="#059669" strokeWidth={3} />
          ))}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        {data.map((point) => (
          <div key={point.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{point.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatter.format(point.value)}</p>
            <p className="text-xs text-slate-500">units sold</p>
          </div>
        ))}
      </div>
    </article>
  );
}
