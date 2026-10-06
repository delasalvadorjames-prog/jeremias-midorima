import React, { useMemo } from 'react';

type Props = {
  actualValues: number[];
  projectedSales: number;
  forecastDays: number;
};

const WIDTH = 720;
const HEIGHT = 230;
const PAD = { top: 20, right: 20, bottom: 34, left: 38 };

export default function SalesForecastChart({ actualValues, projectedSales, forecastDays }: Props) {
  const points = useMemo(() => {
    const actual = actualValues.slice(-14).map((value, index) => ({
      label: `D-${actualValues.slice(-14).length - index}`,
      value: Math.max(0, value),
      type: 'actual' as const,
    }));
    const lastActual = actual[actual.length - 1]?.value || 0;
    return [...actual, {
      label: `+${forecastDays}d`,
      value: lastActual + Math.max(0, projectedSales / Math.max(forecastDays, 1)),
      type: 'forecast' as const,
    }];
  }, [actualValues, forecastDays, projectedSales]);

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const xStep = plotWidth / Math.max(points.length - 1, 1);
  const toPoint = (value: number, index: number) => ({
    x: PAD.left + index * xStep,
    y: PAD.top + plotHeight - (value / maxValue) * plotHeight,
  });
  const coordinates = points.map((point, index) => ({ ...point, ...toPoint(point.value, index) }));
  const actualCoordinates = coordinates.filter((point) => point.type === 'actual');
  const actualPath = actualCoordinates.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const forecastStart = actualCoordinates[actualCoordinates.length - 1];
  const forecastEnd = coordinates[coordinates.length - 1];
  const forecastPath = forecastStart && forecastEnd
    ? `M ${forecastStart.x} ${forecastStart.y} L ${forecastEnd.x} ${forecastEnd.y}`
    : '';

  if (!actualValues.length) {
    return <div className="flex h-56 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white/70 text-sm text-slate-500">Add sales transactions to generate a forecast graph.</div>;
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Recent demand</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-500" />Actual <i className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Forecast</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Sales forecast graph">
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.top + plotHeight - ratio * plotHeight;
          return <line key={ratio} x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />;
        })}
        <path d={actualPath} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={forecastPath} fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="7 6" strokeLinecap="round" />
        {coordinates.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="4" fill={point.type === 'forecast' ? '#f59e0b' : '#ffffff'} stroke={point.type === 'forecast' ? '#f59e0b' : '#4f46e5'} strokeWidth="3" />)}
        {coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || index === Math.floor(coordinates.length / 2)).map((point) => <text key={`label-${point.label}`} x={point.x} y={HEIGHT - 10} textAnchor="middle" fill={point.type === 'forecast' ? '#d97706' : '#94a3b8'} fontSize="11" fontWeight="700">{point.label}</text>)}
      </svg>
    </div>
  );
}
