import React, { useEffect, useMemo, useState } from 'react';
import { AlertFilter, Medicine, PharmacySettings, UserRole } from '../types';
import {
  evaluateMedicineStatus,
  getCriticalStockThreshold,
  getMedicineExpiryDays,
  getExpiryAlertStock,
  InventoryStatusCounts,
} from '../lib/inventory';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Props = {
  statusCounts: InventoryStatusCounts;
  lowStockMeds: Medicine[];
  criticalStockMeds: Medicine[];
  expiringSoonMeds: Medicine[];
  expiredMeds: Medicine[];
  healthyMeds: Medicine[];
  medicines: Medicine[];
  notForSaleMeds?: Medicine[];
  userRole?: UserRole;
  selectedAlertFilter?: AlertFilter;
  inventoryThresholds?: Pick<
    PharmacySettings,
    'criticalStockAlertUnits' | 'lowStockAlertUnits' | 'expiryAlertDays' |
    'nonMedicineCriticalStockAlertUnits' | 'nonMedicineLowStockAlertUnits' |
    'nonMedicineExpiryAlertDays' | 'nonMedicineExpiryNotifications'
  >;
};

type Tone = 'danger' | 'caution' | 'alert' | 'good' | 'neutral';

/* -------------------------------------------------------------------------- */
/* TONE STYLES — status colors retained for meaning                           */
/* -------------------------------------------------------------------------- */

const TONE_STYLES: Record<
  Tone,
  {
    text: string;
    bg: string;
    border: string;
    dot: string;
    ring: string;
    shadow: string;
    glow: string;
  }
> = {
  danger: {
    text: 'text-rose-700',
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/60',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    ring: 'ring-rose-200',
    shadow: 'shadow-[0_4px_12px_-2px_rgba(244,63,94,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    glow: 'shadow-[0_0_16px_-2px_rgba(244,63,94,0.35)]',
  },
  caution: {
    text: 'text-amber-700',
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
    shadow: 'shadow-[0_4px_12px_-2px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    glow: 'shadow-[0_0_16px_-2px_rgba(245,158,11,0.35)]',
  },
  alert: {
    text: 'text-orange-700',
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/60',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
    shadow: 'shadow-[0_4px_12px_-2px_rgba(249,115,22,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    glow: 'shadow-[0_0_16px_-2px_rgba(249,115,22,0.35)]',
  },
  good: {
    text: 'text-emerald-700',
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-200',
    shadow: 'shadow-[0_4px_12px_-2px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.8)]',
    glow: 'shadow-[0_0_16px_-2px_rgba(16,185,129,0.35)]',
  },
  neutral: {
    text: 'text-slate-700',
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100/60',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    ring: 'ring-slate-200',
    shadow: 'shadow-[0_4px_12px_-2px_rgba(100,116,139,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]',
    glow: 'shadow-[0_0_16px_-2px_rgba(100,116,139,0.3)]',
  },
};

/* -------------------------------------------------------------------------- */
/* Icon system                                                                */
/* -------------------------------------------------------------------------- */

const Icon = {
  Alert: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Check: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Info: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
    </svg>
  ),
  Package: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Clock: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Shield: ({ className = 'h-4 w-4' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getStatusInfo = (
  medicine: Medicine,
  inventoryThresholds?: Props['inventoryThresholds']
): { label: string; tone: Tone } => {
  const {
    isLowStock,
    isCriticalStock,
    isExpiringSoon,
    isNotForSale,
    isExpired,
  } = evaluateMedicineStatus(medicine, inventoryThresholds);

  if (isExpired) return { label: 'Expired', tone: 'danger' };
  if (isNotForSale) return { label: 'Not for sale', tone: 'danger' };
  if (isCriticalStock) return { label: 'Critical stock', tone: 'danger' };
  if (isExpiringSoon) return { label: 'Expiring soon', tone: 'alert' };
  if (isLowStock) return { label: 'Low stock', tone: 'caution' };
  return { label: 'Good', tone: 'good' };
};

const formatCurrency = (value?: number) =>
  `₱${(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AlertsPanel({
  statusCounts,
  lowStockMeds,
  criticalStockMeds,
  expiringSoonMeds,
  expiredMeds,
  healthyMeds,
  medicines,
  notForSaleMeds,
  userRole = 'admin',
  selectedAlertFilter,
  inventoryThresholds,
}: Props) {
  const criticalStockThreshold = getCriticalStockThreshold(inventoryThresholds);
  const expiryAlertDays = Math.max(
    1,
    inventoryThresholds?.expiryAlertDays ?? 60
  );

  const notForSaleList = useMemo(() => notForSaleMeds || [], [notForSaleMeds]);
  // Expired and not-for-sale can describe the same medicine. Keep one row
  // per medicine so the tab count matches the list (and the archive count).
  const expiredAlertMeds = useMemo(() => {
    const byId = new Map<number, Medicine>();
    [...expiredMeds, ...notForSaleList].forEach((medicine) => byId.set(medicine.id, medicine));
    return Array.from(byId.values());
  }, [expiredMeds, notForSaleList]);
  const expiredOrNfs = expiredAlertMeds.length;

  const totalAlerts = useMemo(() => {
    const ids = new Set<number>();
    [
      ...lowStockMeds,
      ...criticalStockMeds,
      ...expiringSoonMeds,
      ...expiredMeds,
      ...notForSaleList,
    ].forEach((m) => ids.add(m.id));
    return ids.size;
  }, [criticalStockMeds, expiringSoonMeds, expiredMeds, lowStockMeds, notForSaleList]);

  const filterTabs = useMemo(
    () => [
      { id: 'all' as AlertFilter, label: 'All', count: statusCounts.all, tone: 'neutral' as Tone, icon: Icon.Package },
      { id: 'critical_stock' as AlertFilter, label: 'Critical', count: statusCounts.critical_stock, tone: 'danger' as Tone, icon: Icon.Alert },
      { id: 'low_stock' as AlertFilter, label: 'Low stock', count: statusCounts.low_stock, tone: 'caution' as Tone, icon: Icon.Info },
      { id: 'expiring_soon' as AlertFilter, label: 'Expiring', count: statusCounts.expiring_soon, tone: 'alert' as Tone, icon: Icon.Clock },
      { id: 'expired' as AlertFilter, label: 'Expired', count: expiredOrNfs, tone: 'danger' as Tone, icon: Icon.Alert },
      { id: 'healthy' as AlertFilter, label: 'Good', count: statusCounts.healthy, tone: 'good' as Tone, icon: Icon.Shield },
    ],
    [statusCounts, expiredOrNfs]
  );

  const [activeFilter, setActiveFilter] = useState<AlertFilter>('all');
  const activeTab = filterTabs.find((t) => t.id === activeFilter) ?? filterTabs[0];

  useEffect(() => {
    if (!selectedAlertFilter) return;
    setActiveFilter(selectedAlertFilter);
  }, [selectedAlertFilter]);

  const filteredMedicines = useMemo(() => {
    let list: Medicine[];
    switch (activeFilter) {
      case 'critical_stock':
        list = criticalStockMeds;
        break;
      case 'low_stock':
        list = lowStockMeds;
        break;
      case 'expiring_soon':
        list = expiringSoonMeds;
        break;
      case 'expired':
        list = expiredAlertMeds;
        break;
      case 'healthy':
        list = healthyMeds;
        break;
      case 'all':
      default:
        list = medicines;
    }

    return [...list]
      .sort((a, b) => {
        const aStatus = getStatusInfo(a, inventoryThresholds).tone;
        const bStatus = getStatusInfo(b, inventoryThresholds).tone;
        const priority: Record<Tone, number> = { danger: 0, alert: 1, caution: 2, neutral: 3, good: 4 };
        return priority[aStatus] - priority[bStatus] || a.name.localeCompare(b.name);
      });
  }, [activeFilter, criticalStockMeds, lowStockMeds, expiringSoonMeds, expiredAlertMeds, healthyMeds, medicines, inventoryThresholds]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <section className="space-y-6 font-sans text-slate-900">

      {/* ============ HEADER — 3D EMBOSSED CARD ============ */}
      <header className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.12),0_2px_4px_-1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        {/* Soft glow orbs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-rose-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-orange-100/30 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-[0_8px_20px_-4px_rgba(244,63,94,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] border border-rose-400/30">
            <Icon.Alert className="h-6 w-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.32em] text-rose-600">Inventory Control</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">Alerts Center</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">Monitor stock risks, expiry dates, and medicines that need action.</p>
          </div>
        </div>
      </header>

      {/* ============ MAIN TABLE CARD — 3D ============ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18),0_4px_8px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="overflow-x-auto">
          {filteredMedicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_10px_24px_-4px_rgba(16,185,129,0.5),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-8 ring-emerald-50">
                <Icon.Check className="h-7 w-7 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
              </span>
              <p className="text-[18px] font-bold text-slate-900">Nothing here</p>
              <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-slate-500">
                No {activeTab.label.toLowerCase()} items right now. Everything in this category looks good.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              {/* Table header — emerald gradient with 3D depth */}
              <thead>
                <tr className="bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]">
                  {[
                    { key: 'name', label: 'Medicine', align: 'left' },
                    { key: 'status', label: 'Status', align: 'left' },
                    { key: 'category', label: 'Category', align: 'left' },
                    { key: 'stock', label: 'Stock', align: 'right' },
                    { key: 'expiry', label: 'Expiry', align: 'left' },
                    { key: 'days', label: 'Days left', align: 'left' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredMedicines.map((medicine) => {
                  const daysLeft = getMedicineExpiryDays(medicine);
                  const { label: rowStatus, tone } = getStatusInfo(medicine, inventoryThresholds);
                  const alertStock = getExpiryAlertStock(medicine, inventoryThresholds);
                  const style = TONE_STYLES[tone];

                  const maxDays = Math.max(expiryAlertDays, 90);
                  const urgencyPct =
                    daysLeft === null ? 0 : Math.max(0, Math.min(100, (daysLeft / maxDays) * 100));

                  const daysTone: Tone =
                    daysLeft === null
                      ? 'neutral'
                      : daysLeft < 0
                        ? 'danger'
                        : daysLeft < 30
                          ? 'danger'
                          : daysLeft < 60
                            ? 'caution'
                            : 'good';
                  const daysStyle = TONE_STYLES[daysTone];

                  return (
                    <tr
                      key={medicine.id}
                      className="group transition-all duration-200 hover:bg-emerald-50/40 hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]"
                    >
                      {/* Medicine name — colored bar removed */}
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-slate-900">{medicine.name}</p>
                          <p className="mt-0.5 text-[13px] tabular-nums text-slate-500">
                            {formatCurrency(medicine.unitPrice)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} px-3 py-1 text-[12px] font-bold ${style.text} ring-1 ring-inset ${style.ring} ${style.shadow} transition-transform duration-200 group-hover:scale-[1.03]`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shadow-[0_0_6px_currentColor]`} />
                          {rowStatus}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md bg-gradient-to-b from-white to-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] border border-slate-200/70">
                          {medicine.category || 'Uncategorized'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className={`inline-block text-[16px] font-bold tabular-nums ${style.text} drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]`}>
                          {alertStock.toLocaleString()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-[14px] tabular-nums text-slate-600">
                          {medicine.expiry || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {daysLeft !== null ? (
                          <div className="flex items-center gap-3">
                            <span className={`w-20 shrink-0 text-[14px] font-bold tabular-nums ${daysStyle.text}`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
                            </span>
                            <span className="h-2.5 w-full min-w-[44px] max-w-[88px] overflow-hidden rounded-full bg-slate-100 shadow-[inset_0_1px_2px_rgba(15,23,42,0.15)]">
                              <span
                                className={`block h-full rounded-full ${daysStyle.dot} shadow-[0_0_8px_-1px_currentColor,inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-500`}
                                style={{ width: `${urgencyPct}%` }}
                              />
                            </span>
                          </div>
                        ) : (
                          <span className="text-[14px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ============ FOOTER — 3D INSET ============ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/70 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_2px_4px_-2px_rgba(15,23,42,0.06)]">
          <span className="text-[13px] font-medium tabular-nums text-slate-600">
            Showing <span className="font-bold text-slate-900">{filteredMedicines.length}</span> of{' '}
            <span className="font-bold text-slate-900">{medicines.length}</span>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { tone: 'danger' as Tone, label: 'Critical', count: statusCounts.critical_stock },
              { tone: 'caution' as Tone, label: 'Low', count: statusCounts.low_stock },
              { tone: 'alert' as Tone, label: 'Expiring', count: statusCounts.expiring_soon },
              { tone: 'good' as Tone, label: 'Good', count: statusCounts.healthy },
            ].map((item) => {
              const s = TONE_STYLES[item.tone];
              return (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1.5 rounded-full ${s.bg} px-3 py-1.5 text-[12px] font-bold tabular-nums ${s.text} ring-1 ring-inset ${s.ring} ${s.shadow} transition-all duration-200 hover:-translate-y-0.5 hover:${s.glow}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot} shadow-[0_0_6px_currentColor]`} />
                  {item.label}: {item.count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

    </section>
  );
}
