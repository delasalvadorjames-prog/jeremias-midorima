import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import { Medicine } from '../types';

type Props = {
  assignedCategory?: string | null;
  medicines: Medicine[];
  healthyMeds: Medicine[];
  lowStockMeds: Medicine[];
  criticalStockMeds: Medicine[];
  expiringSoonMeds: Medicine[];
  expiredMeds: Medicine[];
  onOpenInventory: () => void;
};

const statusCardClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

// Color palette
const COLORS = {
  healthy: '#10b981',
  lowStock: '#f59e0b',
  critical: '#e11d48',
  expiringSoon: '#f97316',
  expired: '#dc2626',
};

export default function StaffDashboardPanel({
  assignedCategory,
  medicines,
  healthyMeds,
  lowStockMeds,
  criticalStockMeds,
  expiringSoonMeds,
  expiredMeds,
  onOpenInventory,
}: Props) {
  const assignment = (assignedCategory || '').trim();
  const watchList = [...expiredMeds, ...criticalStockMeds, ...expiringSoonMeds, ...lowStockMeds]
    .filter((medicine, index, list) => list.findIndex((item) => item.id === medicine.id) === index)
    .slice(0, 8);

  // ===== Chart Data =====
  const inventoryBreakdown = [
    { name: 'Healthy', value: healthyMeds.length, color: COLORS.healthy },
    { name: 'Low Stock', value: lowStockMeds.length, color: COLORS.lowStock },
    { name: 'Critical', value: criticalStockMeds.length, color: COLORS.critical },
    { name: 'Expiring Soon', value: expiringSoonMeds.length, color: COLORS.expiringSoon },
    { name: 'Expired', value: expiredMeds.length, color: COLORS.expired },
  ].filter((item) => item.value > 0);

  // Top 5 medicines by stock for bar chart
  const topStockData = [...medicines]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)
    .map((med) => ({
      name: med.name.length > 12 ? med.name.slice(0, 12) + '…' : med.name,
      stock: med.stock,
      reorderLevel: med.reorderLevel,
    }));

  // Category distribution
  const categoryMap = new Map<string, number>();
  medicines.forEach((med) => {
    const cat = med.category || 'Uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Stock health trend (simulated from current data) — replace with real trend if available
  const trendData = [
    { day: 'Mon', healthy: Math.max(healthyMeds.length - 2, 0), risk: lowStockMeds.length + 2 },
    { day: 'Tue', healthy: Math.max(healthyMeds.length - 1, 0), risk: lowStockMeds.length + 1 },
    { day: 'Wed', healthy: healthyMeds.length, risk: lowStockMeds.length },
    { day: 'Thu', healthy: healthyMeds.length, risk: Math.max(lowStockMeds.length - 1, 0) },
    { day: 'Fri', healthy: healthyMeds.length + 1, risk: Math.max(lowStockMeds.length - 2, 0) },
    { day: 'Sat', healthy: healthyMeds.length + 1, risk: lowStockMeds.length },
    { day: 'Sun', healthy: healthyMeds.length, risk: lowStockMeds.length },
  ];

  const totalMeds = medicines.length;
  const healthyPct = totalMeds > 0 ? Math.round((healthyMeds.length / totalMeds) * 100) : 0;

  return (
    <section className="space-y-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-5">
      {/* ===== Header ===== */}
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">Staff Dashboard</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {assignment ? `${assignment} responsibility` : 'Waiting for assignment'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor healthy medicines, low stock, and medicines near expiry in your assigned area.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenInventory}
            className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Open Inventory
          </button>
        </div>
      </header>

      {!assignment && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Admin has not assigned your medicine category yet.
        </div>
      )}

      {/* ===== Status Cards ===== */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className={statusCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Items</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{medicines.length}</p>
          <p className="text-sm text-slate-500">Medicines under your account</p>
        </article>
        <article className={statusCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Healthy</p>
          <p className="mt-4 text-3xl font-semibold text-emerald-700">{healthyMeds.length}</p>
          <p className="text-sm text-slate-500">Stable stock and expiry</p>
        </article>
        <article className={statusCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Low Stock</p>
          <p className="mt-4 text-3xl font-semibold text-amber-700">{lowStockMeds.length}</p>
          <p className="text-sm text-slate-500">Needs stock review</p>
        </article>
        <article className={statusCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Expiring Soon</p>
          <p className="mt-4 text-3xl font-semibold text-rose-700">{expiringSoonMeds.length}</p>
          <p className="text-sm text-slate-500">Within the expiry window</p>
        </article>
        <article className={statusCardClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Expired</p>
          <p className="mt-4 text-3xl font-semibold text-red-700">{expiredMeds.length}</p>
          <p className="text-sm text-slate-500">Needs immediate review</p>
        </article>
      </div>

      {/* ===== CHARTS SECTION ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Donut Chart — Inventory Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Overview</p>
            <h3 className="text-base font-semibold text-slate-900">Inventory Breakdown</h3>
          </div>
          {inventoryBreakdown.length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={inventoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {inventoryBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900">{healthyPct}%</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Healthy</span>
              </div>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              No data available
            </div>
          )}
          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {inventoryBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-slate-600">{item.name}</span>
                <span className="ml-auto font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart — Top Stock */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Stock Levels</p>
            <h3 className="text-base font-semibold text-slate-900">Top 5 Medicines by Stock</h3>
          </div>
          {topStockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topStockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                />
                <Bar dataKey="stock" name="Current Stock" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="reorderLevel" name="Reorder Level" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
              No medicine data available
            </div>
          )}
        </div>
      </div>

      {/* ===== Second Row: Category Distribution + Trend ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Horizontal Bar — Category Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Distribution</p>
            <h3 className="text-base font-semibold text-slate-900">Medicines by Category</h3>
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 45, 180)}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#334155' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                />
                <Bar dataKey="count" name="Medicines" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-sm text-slate-400">
              No categories available
            </div>
          )}
        </div>

        {/* Line Chart — Stock Health Trend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Weekly Trend</p>
            <h3 className="text-base font-semibold text-slate-900">Stock Health Overview</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="healthy"
                name="Healthy"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="risk"
                name="At Risk"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Watch List ===== */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Watch List</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Medicines that need attention</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {watchList.length > 0 ? (
            watchList.map((medicine) => (
              <div key={medicine.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1.5fr_1fr_1fr_1fr] md:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{medicine.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{medicine.category}</p>
                </div>
                <p className="font-semibold text-slate-700">{medicine.stock} units</p>
                <p className="text-slate-600">Reorder {medicine.reorderLevel}</p>
                <p className="text-slate-600">Expiry {medicine.expiry}</p>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">
              No low stock or expiring medicines in your assigned inventory.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}