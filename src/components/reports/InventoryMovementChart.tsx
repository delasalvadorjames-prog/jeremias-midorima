import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StockMovementItem } from './types';

interface Props {
  data: StockMovementItem[];
  loading: boolean;
  isDark: boolean;
}

const numberFormat = new Intl.NumberFormat('en-US');

export default function InventoryMovementChart({ data, loading, isDark }: Props) {
  const chartData = data
    .map((movement) => ({
      name: movement.medicine_name,
      deducted: movement.deducted_quantity,
      remaining: movement.remaining_quantity,
    }))
    .sort((a, b) => (b.deducted + b.remaining) - (a.deducted + a.remaining));

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const cardClass = `rounded-2xl border p-5 shadow-sm ${
    isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
  }`;

  return (
    <div className={cardClass}>
      <div className="mb-5">
        <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Inventory Movement by Medicine
        </h3>
        <p className={`mt-1 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Compare deducted units with the remaining stock for each medicine.
        </p>
      </div>

      {loading ? (
        <div className={`flex h-[360px] items-center justify-center text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Loading chart…
        </div>
      ) : chartData.length === 0 ? (
        <div className={`flex h-[360px] items-center justify-center rounded-xl border border-dashed text-sm font-semibold ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>
          No inventory deductions found for the selected filters.
        </div>
      ) : (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
              barCategoryGap="24%"
            >
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  border: `1px solid ${gridColor}`,
                  borderRadius: 12,
                  color: isDark ? '#f8fafc' : '#0f172a',
                }}
                formatter={(value, name) => [
                  `${numberFormat.format(Number(value))} units`,
                  name === 'remaining' ? 'Remaining' : 'Deducted',
                ]}
              />
              <Legend
                wrapperStyle={{ color: axisColor, fontSize: 12, fontWeight: 600 }}
                formatter={(value) => value === 'Remaining' ? 'Remaining' : 'Deducted'}
              />
              <Bar dataKey="deducted" name="Deducted" fill="#f43f5e" radius={[0, 6, 6, 0]} />
              <Bar dataKey="remaining" name="Remaining" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
