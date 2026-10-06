import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DashboardStats, InventoryItem, PaymentMethodItem, PurchasePeriod,
  ReportFiltersState, ReportType, SalesData, TopProduct, BIRReport, StockMovementItem,
} from './reports/types';
import {
  fetchDashboard, fetchInventory, fetchInventoryAdjustments, fetchPaymentMethods,
  fetchPurchases, fetchSales, fetchTopProducts, fetchBIRReport, fetchStockMovements,
} from './reports/api';
import RevenueChart from './reports/RevenueChart';
import CategoryDonut from './reports/CategoryDonut';
import TopSellingChart from './reports/TopSellingChart';
import InventoryChart from './reports/InventoryChart';
import PurchaseChart from './reports/PurchaseChart';
import PaymentDonut from './reports/PaymentDonut';
import InventoryMovementChart from './reports/InventoryMovementChart';
import ReportTable from './reports/ReportTable';
import ExportButtons from './reports/ExportButtons';
import { Medicine } from '../types';
import CustomerRecordsPage from './CustomerRecordsPage';

// ─── Icons ──────────────────────────────────────────────────────────────────
const IconChart = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconAlert = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);
const IconClock = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconDoc = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-7 5h8a2 2 0 002-2V7.828a2 2 0 00-.586-1.414l-3.828-3.828A2 2 0 0011.172 2H6a2 2 0 00-2 2v15a2 2 0 002 2z" />
  </svg>
);
const IconFilter = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>
);

interface Props {
  medicines?: Medicine[];
  inventoryThresholds?: {
    criticalStockAlertUnits?: number;
    lowStockAlertUnits?: number;
    expiryAlertDays?: number;
    nonMedicineCriticalStockAlertUnits?: number;
    nonMedicineLowStockAlertUnits?: number;
    nonMedicineExpiryAlertDays?: number;
  };
  onModalOpenChange?: (open: boolean) => void;
  isDark?: boolean;
}

const REPORT_LABELS: Record<string, string> = {
  sales: 'Sales', inventory: 'Inventory', transactions: 'Transactions',
  low_stock: 'Low Stock',
  purchases: 'Purchases', top_selling: 'Top Selling Products', expiring: 'Expiring Medicines',
  damages: 'Damaged Stock', expired: 'Expired Stock', count_correction: 'Count Corrections',
  inventory_movement: 'Inventory Movement', bir: 'BIR',
  customer_records: 'Customer Records',
};

const REPORT_DESCRIPTIONS: Record<string, string> = {
  sales: 'Revenue, transactions, and sales performance over time',
  inventory: 'Current stock levels, values, and product status',
  low_stock: 'Medicines at or below the configured low-stock threshold',
  transactions: 'Individual transaction records and payment details',
  purchases: 'Supplier purchases and procurement history',
  top_selling: 'Best performing products by units and revenue',
  expiring: 'Medicines nearing their expiration date',
  damages: 'Damaged stock records and adjustments',
  expired: 'Expired medicines requiring disposal',
  count_correction: 'Inventory count adjustments and corrections',
  inventory_movement: 'Stock in/out movements and adjustments',
  bir: 'BIR-compliant sales summary and VAT breakdown',
  customer_records: 'Registered Senior Citizen and PWD customer records',
};

const ADJUSTMENT_TYPES = ['damages', 'count_correction'] as const;

const REPORT_NAV: { value: ReportType; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'top_selling', label: 'Top Selling' },
  { value: 'bir', label: 'BIR' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'inventory_movement', label: 'Movement' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'damages', label: 'Damaged' },
  { value: 'count_correction', label: 'Corrections' },
  { value: 'customer_records', label: 'Customer Records' },
];

const INVENTORY_STATUS_PRIORITY: Record<string, number> = {
  'Out of Stock': 5,
  'Expired': 4,
  'Critical Stock': 3,
  'Low Stock': 2,
  'Expiring Soon': 1,
  'Healthy': 0,
};

const mergeInventoryVariants = (items: InventoryItem[]): InventoryItem[] => {
  const grouped = new Map<string, InventoryItem>();
  items.forEach((item) => {
    const key = [
      item.medicine_name.trim().toLowerCase(),
      (item.volume || '').trim().toLowerCase(),
      (item.strength || '').trim().toLowerCase(),
      (item.dosage_form || '').trim().toLowerCase(),
      item.category.trim().toLowerCase(),
    ].join('|');
    const existing = grouped.get(key);
    if (!existing) { grouped.set(key, { ...item }); return; }
    existing.stock += item.stock;
    existing.stock_value += item.stock_value;
    existing.reorder_level = Math.max(existing.reorder_level, item.reorder_level);
    if (item.days_left !== null && (existing.days_left === null || item.days_left < existing.days_left)) {
      existing.days_left = item.days_left;
      existing.expiry = item.expiry;
    }
    if ((INVENTORY_STATUS_PRIORITY[item.status] ?? 0) > (INVENTORY_STATUS_PRIORITY[existing.status] ?? 0)) {
      existing.status = item.status;
    }
  });
  return Array.from(grouped.values());
};

export default function ReportsPanel({
  medicines = [],
  inventoryThresholds,
  onModalOpenChange,
  isDark: externalIsDark,
}: Props) {
  const isDark =
    externalIsDark ??
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        localStorage.getItem('five_l_theme') === 'dark'));

  const now = useMemo(() => new Date(), []);
  const initialFilters: ReportFiltersState = useMemo(
    () => ({
      reportType: 'sales', dateFrom: '', dateTo: '',
      month: String(now.getMonth() + 1), year: String(now.getFullYear()),
      category: '', customerType: '', vatType: '', supplier: '', search: '',
    }),
    [now],
  );

  const [filters, setFilters] = useState<ReportFiltersState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFiltersState>(initialFilters);
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'today' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [showChart, setShowChart] = useState(false);
  const [activeChart, setActiveChart] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesData>({ monthly: [], by_category: [] });
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [adjustmentData, setAdjustmentData] = useState<InventoryItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [purchases, setPurchases] = useState<PurchasePeriod[]>([]);
  const [birReport, setBirReport] = useState<BIRReport | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovementItem[]>([]);

  const isAdjustmentReport = ADJUSTMENT_TYPES.includes(
    appliedFilters.reportType as (typeof ADJUSTMENT_TYPES)[number],
  );

  const reportInventoryData = useMemo(() => {
    if (isAdjustmentReport) return adjustmentData;
    const merged = mergeInventoryVariants(inventoryData);
    if (appliedFilters.reportType === 'low_stock') return merged.filter((item) => item.status === 'Low Stock');
    if (appliedFilters.reportType === 'expiring') return merged.filter((item) => item.status === 'Expiring Soon');
    if (appliedFilters.reportType === 'expired') return merged.filter((item) => item.status === 'Expired');
    return merged;
  }, [appliedFilters.reportType, adjustmentData, inventoryData, isAdjustmentReport]);

  const reportTypeLabel = REPORT_LABELS[appliedFilters.reportType] ?? 'Report';
  const reportTypeDescription = REPORT_DESCRIPTIONS[appliedFilters.reportType] ?? '';

  const visibleRecordCount = useMemo(() => {
    if (isAdjustmentReport || appliedFilters.reportType === 'expiring' || appliedFilters.reportType === 'expired')
      return reportInventoryData.length;
    if (['sales', 'transactions'].includes(appliedFilters.reportType)) return salesData.monthly.length;
    if (appliedFilters.reportType === 'top_selling') return topProducts.length;
    if (appliedFilters.reportType === 'purchases') return purchases.length;
    if (appliedFilters.reportType === 'inventory_movement') return stockMovements.length;
    if (appliedFilters.reportType === 'bir') return birReport?.transactions.length ?? 0;
    return inventoryData.length;
  }, [appliedFilters.reportType, birReport, inventoryData.length, isAdjustmentReport, purchases.length, reportInventoryData.length, salesData.monthly.length, stockMovements.length, topProducts.length]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => m.category && set.add(m.category));
    return Array.from(set).sort();
  }, [medicines]);

  const suppliers = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => m.supplier && set.add(m.supplier));
    return Array.from(set).sort();
  }, [medicines]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  }, []);

  const handleGenerateReport = useCallback(async (overrideFilters?: ReportFiltersState) => {
    const f = overrideFilters ?? appliedFilters;
    setLoading(true);
    setError(null);
    const apiParams = {
      date_from: f.dateFrom || undefined,
      date_to: f.dateTo || undefined,
      month: f.month || undefined,
      year: f.year || undefined,
      category: f.category || undefined,
      supplier: f.supplier || undefined,
      search: f.search || undefined,
      customer_type: f.customerType || undefined,
      vat_type: f.vatType || undefined,
      group_by: f.dateFrom ? 'day' : 'month',
    };
    const adjustmentType = ADJUSTMENT_TYPES.includes(
      f.reportType as (typeof ADJUSTMENT_TYPES)[number],
    ) ? (f.reportType as (typeof ADJUSTMENT_TYPES)[number]) : null;

    try {
      const results = await Promise.allSettled([
        fetchDashboard(apiParams), fetchSales(apiParams),
        fetchInventory({
          category: f.category,
          supplier: f.supplier,
          search: f.search,
          critical_stock_threshold: inventoryThresholds?.criticalStockAlertUnits ?? 5,
          low_stock_threshold: inventoryThresholds?.lowStockAlertUnits ?? 20,
          expiry_alert_days: inventoryThresholds?.expiryAlertDays ?? 30,
          non_medicine_critical_stock_threshold: inventoryThresholds?.nonMedicineCriticalStockAlertUnits ?? 5,
          non_medicine_low_stock_threshold: inventoryThresholds?.nonMedicineLowStockAlertUnits ?? 10,
          non_medicine_expiry_alert_days: inventoryThresholds?.nonMedicineExpiryAlertDays ?? 30,
          include_expired: f.reportType === 'expired',
        }),
        fetchTopProducts(apiParams), fetchPaymentMethods(apiParams),
        fetchPurchases(apiParams), fetchBIRReport(apiParams),
        adjustmentType ? fetchInventoryAdjustments(adjustmentType, apiParams) : Promise.resolve([] as InventoryItem[]),
        fetchStockMovements(apiParams),
      ]);
      const [dashboardRes, salesRes, inventoryRes, topRes, paymentRes, purchasesRes, birRes, adjustmentRes, stockMovementRes] = results;
      if (dashboardRes.status === 'fulfilled') setStats(dashboardRes.value);
      if (salesRes.status === 'fulfilled') setSalesData(salesRes.value);
      if (inventoryRes.status === 'fulfilled') setInventoryData(inventoryRes.value);
      if (adjustmentRes.status === 'fulfilled') setAdjustmentData(adjustmentRes.value);
      if (topRes.status === 'fulfilled') setTopProducts(topRes.value);
      if (paymentRes.status === 'fulfilled') setPaymentMethods(paymentRes.value);
      if (purchasesRes.status === 'fulfilled') setPurchases(purchasesRes.value);
      if (birRes.status === 'fulfilled') setBirReport(birRes.value);
      if (stockMovementRes.status === 'fulfilled') setStockMovements(stockMovementRes.value);
      const allFailed = results.slice(0, 7).every((r) => r.status === 'rejected');
      if (allFailed) setError('Failed to reach API server. Verify backend connection.');
      else setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating reports.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, inventoryThresholds]);

  useEffect(() => { handleGenerateReport(); }, [handleGenerateReport]);

  const handleReportNavigation = (reportType: ReportType) => {
    const nextFilters = { ...filters, reportType, paymentMethod: '' };
    if (!['purchases', 'inventory', 'low_stock', 'inventory_movement', 'expiring', 'expired', 'damages', 'count_correction'].includes(reportType)) nextFilters.supplier = '';
    if (reportType !== 'bir') {
      nextFilters.customerType = '';
      nextFilters.vatType = '';
    }
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    handleGenerateReport(nextFilters);
  };

  const handleDatePreset = (preset: string) => {
    const today = new Date();
    const start = new Date(today);
    if (preset === '7d') start.setDate(today.getDate() - 6);
    if (preset === 'month') start.setDate(1);
    if (preset === 'lastmonth') {
      start.setMonth(today.getMonth() - 1, 1);
      today.setDate(0);
    }
    if (preset === 'year') start.setMonth(0, 1);
    const toInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const nextFilters = { ...filters, dateFrom: toInput(start), dateTo: toInput(today) };
    setActiveDatePreset(preset);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    handleGenerateReport(nextFilters);
  };

  const handleSelectPreset = (preset: 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom') => {
    setActivePreset(preset);
  };

  const isBirReport = appliedFilters.reportType === 'bir';

  useEffect(() => {
    onModalOpenChange?.(Boolean(activeChart));
    return () => onModalOpenChange?.(false);
  }, [activeChart, onModalOpenChange]);

  useEffect(() => {
    if (isBirReport) {
      setShowChart(false);
      setActiveChart(null);
    }
  }, [isBirReport]);

  // ─── Design tokens ─────────────────────────────────────────────────────
  const isDk = isDark;

  const pageBg = isDk ? 'bg-[#0A0F1A]' : 'bg-gradient-to-br from-[#F0F4F8] via-[#F7FAFC] to-[#EEF2F6]';

  // 🎨 3D card
  const card3d = isDk
    ? 'bg-gradient-to-br from-[#1A2230] to-[#131A26] border border-[#2A3345] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]'
    : 'bg-gradient-to-br from-white via-white to-[#F8FAFC] border border-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,1)]';

  const unifiedCard = card3d;

  const txtPrimary = isDk ? 'text-slate-100' : 'text-[#0F172A]';
  const txtSecondary = isDk ? 'text-slate-400' : 'text-[#475569]';
  const txtMuted = isDk ? 'text-slate-500' : 'text-[#94A3B8]';
  const divider = isDk ? 'border-[#232B3A]' : 'border-[#E5E8EF]';
  const accent = isDk ? 'text-emerald-300' : 'text-emerald-700';
  const accentBg = isDk ? 'bg-emerald-600' : 'bg-emerald-600';
  const accentSoftBg = isDk ? 'bg-emerald-500/15' : 'bg-emerald-50';

  // ── 🎨 3D Button Classes ──
  const BTN_3D_PRIMARY = isDk
    ? `relative inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold text-white
       bg-gradient-to-b from-emerald-500 to-emerald-600
       ring-1 ring-emerald-400/40
       shadow-[0_4px_0_0_#047857,
               0_6px_14px_-3px_rgba(5,150,105,0.55),
               inset_0_2px_0_rgba(255,255,255,0.35),
               inset_0_-2px_4px_rgba(0,0,0,0.15)]
       transition-all duration-150
       hover:from-emerald-400 hover:to-emerald-500
       hover:shadow-[0_4px_0_0_#047857,
                     0_8px_18px_-3px_rgba(5,150,105,0.65),
                     inset_0_2px_0_rgba(255,255,255,0.4),
                     inset_0_-2px_4px_rgba(0,0,0,0.15)]
       active:translate-y-[3px]
       active:shadow-[0_1px_0_0_#047857,inset_0_2px_0_rgba(255,255,255,0.2)]
       disabled:cursor-not-allowed disabled:opacity-40`
    : `relative inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold text-white
       bg-gradient-to-b from-emerald-500 to-emerald-600
       ring-1 ring-emerald-400/40
       shadow-[0_4px_0_0_#047857,
               0_6px_14px_-3px_rgba(5,150,105,0.5),
               inset_0_2px_0_rgba(255,255,255,0.35),
               inset_0_-2px_4px_rgba(0,0,0,0.15)]
       transition-all duration-150
       hover:from-emerald-400 hover:to-emerald-500
       hover:shadow-[0_4px_0_0_#047857,
                     0_8px_18px_-3px_rgba(5,150,105,0.6),
                     inset_0_2px_0_rgba(255,255,255,0.4),
                     inset_0_-2px_4px_rgba(0,0,0,0.15)]
       active:translate-y-[3px]
       active:shadow-[0_1px_0_0_#047857,inset_0_2px_0_rgba(255,255,255,0.2)]
       disabled:cursor-not-allowed disabled:opacity-40`;

  const BTN_3D_SECONDARY = isDk
    ? `relative inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-200
       bg-gradient-to-b from-slate-800 to-slate-900
       ring-1 ring-slate-700
       shadow-[0_4px_0_0_#0f172a,
               0_6px_12px_-3px_rgba(0,0,0,0.4),
               inset_0_1px_0_rgba(255,255,255,0.08),
               inset_0_-2px_4px_rgba(0,0,0,0.3)]
       transition-all duration-150
       hover:from-slate-700 hover:to-slate-800
       hover:border-emerald-500/50
       hover:shadow-[0_4px_0_0_#0f172a,
                     0_8px_16px_-3px_rgba(0,0,0,0.5),
                     inset_0_1px_0_rgba(255,255,255,0.1),
                     inset_0_-2px_4px_rgba(0,0,0,0.3)]
       active:translate-y-[3px]
       active:shadow-[0_1px_0_0_#0f172a,inset_0_1px_0_rgba(255,255,255,0.05)]
       disabled:cursor-not-allowed disabled:opacity-40`
    : `relative inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-700
       bg-gradient-to-b from-white to-slate-100
       ring-1 ring-slate-200
       shadow-[0_4px_0_0_#cbd5e1,
               0_6px_12px_-3px_rgba(15,23,42,0.15),
               inset_0_1px_0_rgba(255,255,255,0.9),
               inset_0_-2px_4px_rgba(0,0,0,0.05)]
       transition-all duration-150
       hover:from-slate-50 hover:to-slate-100
       hover:border-emerald-300
       hover:text-emerald-700
       hover:shadow-[0_4px_0_0_#94a3b8,
                     0_8px_16px_-3px_rgba(15,23,42,0.2),
                     inset_0_1px_0_rgba(255,255,255,1),
                     inset_0_-2px_4px_rgba(0,0,0,0.05)]
       active:translate-y-[3px]
       active:shadow-[0_1px_0_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.5)]
       disabled:cursor-not-allowed disabled:opacity-40`;

  const formatPeso = (value: number) => new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

  const chartProps = { loading, isDark };
  const renderChart = (chartId: string, expanded = false) => {
    const chartClass = expanded ? 'min-h-[420px]' : '';
    switch (chartId) {
      case 'revenue':
        return <div className={chartClass}><RevenueChart data={salesData.monthly} {...chartProps} activePreset={activePreset === 'custom' ? 'monthly' : activePreset} onSelectPreset={handleSelectPreset} /></div>;
      case 'category':
        return <div className={chartClass}><CategoryDonut data={salesData.by_category} {...chartProps} /></div>;
      case 'top-selling':
        return <div className={chartClass}><TopSellingChart data={topProducts} {...chartProps} /></div>;
      case 'inventory':
        return <div className={chartClass}><InventoryChart data={reportInventoryData} {...chartProps} /></div>;
      case 'purchases':
        return <div className={chartClass}><PurchaseChart data={purchases} {...chartProps} /></div>;
      case 'movement':
        return <div className={chartClass}><InventoryMovementChart data={stockMovements} {...chartProps} /></div>;
      case 'payment':
        return <div className={chartClass}><PaymentDonut data={paymentMethods} {...chartProps} /></div>;
      default:
        return null;
    }
  };

  const chartTitle: Record<string, string> = {
    revenue: 'Sales Revenue', category: 'Revenue by Category', 'top-selling': 'Top Selling Products',
    inventory: 'Inventory Status', purchases: 'Purchases Overview', movement: 'Inventory Movement', payment: 'Payment Method Distribution',
  };

  const quickChartId = appliedFilters.reportType === 'sales'
    ? 'revenue'
    : appliedFilters.reportType === 'transactions'
      ? 'payment'
      : appliedFilters.reportType === 'top_selling'
        ? 'top-selling'
        : ['inventory', 'low_stock', 'expiring', 'expired', 'damages', 'count_correction'].includes(appliedFilters.reportType)
          ? 'inventory'
          : appliedFilters.reportType === 'purchases'
            ? 'purchases'
            : appliedFilters.reportType === 'inventory_movement'
              ? 'movement'
              : null;

  const chartTrigger = (chartId: string, content: React.ReactNode) => (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${chartTitle[chartId] || 'chart'} details`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button, select, input')) return;
        setActiveChart(chartId);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActiveChart(chartId);
        }
      }}
      className="group relative cursor-zoom-in rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      {content}
      <span className="pointer-events-none absolute right-4 top-4 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 opacity-0 transition group-hover:opacity-100">Open details</span>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
      {/* Radial highlight for 3D depth */}
      <div className="pointer-events-none fixed inset-0" style={{
        background: isDk
          ? 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.08), transparent 50%)'
          : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.9), transparent 60%)'
      }} />

      {/* Custom keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerLine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .anim-fadeup {
          animation: fadeUp 0.6s cubic-bezier(0.2, 0.9, 0.25, 1) both;
        }
        .anim-delay-1 { animation-delay: 0.05s; }
        .anim-delay-2 { animation-delay: 0.1s; }
        .anim-delay-3 { animation-delay: 0.15s; }
        .shimmer-bar {
          background-size: 200% 100%;
          animation: shimmerLine 6s linear infinite;
        }
      `}</style>

      <div className="relative mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        {/* ═══ Letterhead ═══ */}
        <div className={`mb-6 overflow-hidden rounded-2xl anim-fadeup ${unifiedCard}`}>
          {/* Top shimmer bar */}
          <div
            className="h-1 w-full shimmer-bar"
            style={{
              background: isDk
                ? 'linear-gradient(90deg, #059669, #10B981, #14B8A6, #10B981, #059669)'
                : 'linear-gradient(90deg, #10B981, #14B8A6, #06B6D4, #14B8A6, #10B981)',
            }}
          />
          <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-[0_4px_12px_rgba(5,150,105,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]">
                <IconDoc className="h-5 w-5" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent" />
              </div>
              <div>
                <p className={`text-xs font-medium uppercase tracking-[0.16em] ${txtMuted}`}>Reports Center</p>
                <h1 className={`mt-1 text-2xl font-bold tracking-tight ${txtPrimary}`}>
                  {reportTypeLabel} Report
                </h1>
                <p className={`mt-1 max-w-2xl text-sm ${txtSecondary}`}>{reportTypeDescription}</p>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
                    loading
                      ? (isDk ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700')
                      : (isDk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                  }`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    {loading ? 'Loading data…' : `${visibleRecordCount.toLocaleString()} record${visibleRecordCount === 1 ? '' : 's'}`}
                  </span>
                  {lastUpdated && !loading && (
                    <span className={`flex items-center gap-1 ${txtMuted}`}>
                      <IconClock className="h-3 w-3" />
                      Updated {formatTime(lastUpdated)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-start" />
          </div>
        </div>

        {/* ═══ Error ═══ */}
        {error && (
          <div role="alert" className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm anim-fadeup ${
            isDk ? 'border-rose-900/50 bg-rose-950/30' : 'border-rose-200 bg-rose-50'
          }`}>
            <div className="flex items-center gap-2.5">
              <IconAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="font-medium text-rose-700 dark:text-rose-300">{error}</p>
            </div>
            {/* ✅ 3D Retry Button */}
            <button
              onClick={() => handleGenerateReport()}
              className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-700
                bg-gradient-to-b from-white to-rose-50
                ring-1 ring-rose-300
                shadow-[0_3px_0_0_#fda4af,
                        0_5px_10px_-3px_rgba(244,63,94,0.25),
                        inset_0_1px_0_rgba(255,255,255,0.9),
                        inset_0_-1px_2px_rgba(0,0,0,0.05)]
                transition-all duration-150
                hover:from-rose-50 hover:to-rose-100 hover:text-rose-800
                hover:shadow-[0_3px_0_0_#fb7185,0_7px_14px_-3px_rgba(244,63,94,0.35),inset_0_1px_0_rgba(255,255,255,1)]
                active:translate-y-[2px]
                active:shadow-[0_1px_0_0_#fda4af,inset_0_1px_0_rgba(255,255,255,0.5)]`}
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══ Report Workspace — reference-inspired center panel ═══ */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_245px]">
        <section
          id="report-workspace"
          aria-labelledby="report-workspace-title"
          className={`report-print-area overflow-hidden rounded-2xl anim-fadeup anim-delay-1 ${unifiedCard}`}
        >
          <div className="report-print-only hidden">
            <h1>Five-L Pharmacy</h1>
            <h2>{reportTypeLabel} Report</h2>
          </div>
          <div className={`report-print-hide flex flex-wrap items-center gap-2 border-b px-5 py-3 sm:px-6 ${divider} ${isDk ? 'bg-[#111621]/70' : 'bg-slate-50/70'}`}>
            <span className={`mr-1 text-[11px] font-bold uppercase tracking-[0.14em] ${txtMuted}`}>Date range</span>
            {[
              ['today', 'Today'], ['7d', '7 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'],
            ].map(([value, label]) => {
              const active = activeDatePreset === value;
              return (
                /* ✅ 3D Date Preset Buttons */
                <button
                  key={value}
                  type="button"
                  onClick={() => handleDatePreset(value)}
                  className={
                    active
                      ? `relative inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold text-white
                         bg-gradient-to-b from-emerald-500 to-emerald-600
                         ring-1 ring-emerald-400/40
                         shadow-[0_3px_0_0_#047857,
                                 0_4px_10px_-2px_rgba(5,150,105,0.5),
                                 inset_0_1px_0_rgba(255,255,255,0.35)]
                         transition-all duration-150
                         hover:from-emerald-400 hover:to-emerald-500
                         active:translate-y-[2px]
                         active:shadow-[0_1px_0_0_#047857,inset_0_1px_0_rgba(255,255,255,0.2)]`
                      : isDk
                        ? `relative inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold text-slate-300
                           bg-gradient-to-b from-slate-800 to-slate-900
                           ring-1 ring-slate-700
                           shadow-[0_3px_0_0_#0f172a,
                                   0_4px_8px_-2px_rgba(0,0,0,0.4),
                                   inset_0_1px_0_rgba(255,255,255,0.08)]
                           transition-all duration-150
                           hover:from-slate-700 hover:to-slate-800
                           hover:text-emerald-300
                           hover:shadow-[0_3px_0_0_#0f172a,0_6px_12px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]
                           active:translate-y-[2px]
                           active:shadow-[0_1px_0_0_#0f172a]`
                        : `relative inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600
                           bg-gradient-to-b from-white to-slate-100
                           ring-1 ring-slate-200
                           shadow-[0_3px_0_0_#cbd5e1,
                                   0_4px_8px_-2px_rgba(15,23,42,0.12),
                                   inset_0_1px_0_rgba(255,255,255,0.9)]
                           transition-all duration-150
                           hover:from-slate-50 hover:to-white
                           hover:text-emerald-700
                           hover:border-emerald-300
                           hover:shadow-[0_3px_0_0_#94a3b8,0_6px_12px_-2px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)]
                           active:translate-y-[2px]
                           active:shadow-[0_1px_0_0_#94a3b8]`
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 sm:px-6 ${divider} ${isDk ? 'bg-[#111621]/70' : 'bg-slate-50/70'}`}>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${accent}`}>{reportTypeLabel} report</p>
              <p className={`mt-0.5 text-xs ${txtMuted}`}>
                {appliedFilters.dateFrom || appliedFilters.dateTo
                  ? `${appliedFilters.dateFrom || 'Start'} — ${appliedFilters.dateTo || 'Present'}`
                  : 'All available dates'}
              </p>
            </div>
          </div>

          {/* Charts section */}
          {showChart && <div className={`report-print-hide border-t p-5 sm:p-6 anim-fadeup anim-delay-2 ${divider}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentSoftBg} ${accent}`}>
                  <IconChart className="h-3.5 w-3.5" />
                </div>
                <h2 id="report-workspace-title" className={`text-sm font-bold uppercase tracking-wide ${txtPrimary}`}>
                  Visualizations
                </h2>
              </div>
              <p className={`text-xs ${txtMuted}`}>Updates automatically with filters</p>
            </div>

            <div className="grid gap-5">
              {appliedFilters.reportType === 'sales' && (
                <div className="grid gap-5 lg:grid-cols-2">
                  {chartTrigger('revenue', renderChart('revenue'))}
                  {chartTrigger('category', renderChart('category'))}
                </div>
              )}
              {appliedFilters.reportType === 'top_selling' && chartTrigger('top-selling', renderChart('top-selling'))}
              {['inventory', 'low_stock', 'expiring', 'expired', 'damages', 'count_correction'].includes(appliedFilters.reportType) && chartTrigger('inventory', renderChart('inventory'))}
              {appliedFilters.reportType === 'purchases' && chartTrigger('purchases', renderChart('purchases'))}
              {appliedFilters.reportType === 'inventory_movement' && chartTrigger('movement', renderChart('movement'))}
              {appliedFilters.reportType === 'transactions' && chartTrigger('payment', renderChart('payment'))}
            </div>
          </div>}

          {/* Table section */}
          {appliedFilters.reportType === 'customer_records' ? <div className={`border-t p-5 anim-fadeup anim-delay-3 ${divider}`}><CustomerRecordsPage canEdit={true} /></div> : <div className={`border-t anim-fadeup anim-delay-3 ${divider}`}><ReportTable
              reportType={appliedFilters.reportType}
              sales={salesData.monthly}
              inventory={reportInventoryData}
              topProducts={topProducts}
              purchases={purchases}
              stockMovements={stockMovements}
              birReport={birReport}
              loading={loading}
              isDark={isDark}
            /></div>}

          {/* Export section */}
          <div className={`report-print-hide flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4 sm:px-6 ${divider} ${isDk ? 'bg-[#0F141E]/70' : 'bg-slate-50/80'}`}>
            <ExportButtons
              reportType={appliedFilters.reportType}
              sales={salesData.monthly}
              inventory={reportInventoryData}
              topProducts={topProducts}
              purchases={purchases}
              birReport={birReport}
              onRefresh={() => handleGenerateReport()}
              loading={loading}
              isDark={isDark}
            />
          </div>
        </section>

        {/* ── Sidebar with 3D buttons ── */}
        <aside className={`hidden overflow-hidden rounded-2xl border p-4 lg:block ${isDk ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-white'}`}>
          <p className={`mb-3 text-[11px] font-bold uppercase tracking-[0.16em] ${txtMuted}`}>Report Sections</p>
          <div className="space-y-2">
            {REPORT_NAV.map((report) => {
              const active = appliedFilters.reportType === report.value;
              return (
                /* ✅ 3D Report Nav Buttons */
                <button
                  key={report.value}
                  type="button"
                  onClick={() => handleReportNavigation(report.value)}
                  className={
                    active
                      ? `flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-white
                         bg-gradient-to-b from-emerald-500 to-emerald-600
                         ring-1 ring-emerald-400/40
                         shadow-[0_3px_0_0_#047857,
                                 0_5px_12px_-3px_rgba(5,150,105,0.5),
                                 inset_0_1px_0_rgba(255,255,255,0.35)]
                         transition-all duration-150
                         hover:from-emerald-400 hover:to-emerald-500
                         active:translate-y-[2px]
                         active:shadow-[0_1px_0_0_#047857,inset_0_1px_0_rgba(255,255,255,0.2)]`
                      : isDk
                        ? `flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-400
                           bg-gradient-to-b from-slate-900 to-slate-950
                           ring-1 ring-slate-800
                           shadow-[0_3px_0_0_#020617,
                                   0_4px_8px_-2px_rgba(0,0,0,0.5),
                                   inset_0_1px_0_rgba(255,255,255,0.05)]
                           transition-all duration-150
                           hover:from-slate-800 hover:to-slate-900
                           hover:text-emerald-300
                           hover:ring-emerald-500/40
                           hover:shadow-[0_3px_0_0_#020617,0_6px_12px_-2px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]
                           active:translate-y-[2px]
                           active:shadow-[0_1px_0_0_#020617]`
                        : `flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600
                           bg-gradient-to-b from-white to-slate-50
                           ring-1 ring-slate-200
                           shadow-[0_3px_0_0_#cbd5e1,
                                   0_4px_8px_-2px_rgba(15,23,42,0.12),
                                   inset_0_1px_0_rgba(255,255,255,0.9)]
                           transition-all duration-150
                           hover:from-slate-50 hover:to-white
                           hover:text-emerald-700
                           hover:ring-emerald-300
                           hover:shadow-[0_3px_0_0_#94a3b8,0_6px_12px_-2px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)]
                           active:translate-y-[2px]
                           active:shadow-[0_1px_0_0_#94a3b8]`
                  }
                >
                  <span>{report.label}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : 'bg-slate-400/60'}`} />
                </button>
              );
            })}
          </div>
          <div className={`mt-6 border-t pt-5 ${divider}`}>
            <p className={`mb-3 text-[11px] font-bold uppercase tracking-[0.16em] ${txtMuted}`}>Quick Actions</p>
            <div className="space-y-2.5">
              {/* ✅ 3D Refresh Button */}
              <button
                type="button"
                onClick={() => handleGenerateReport()}
                className={`${BTN_3D_PRIMARY} w-full`}
              >
                Refresh Report
              </button>
              {/* ✅ 3D View Charts Button */}
              {!isBirReport && quickChartId && (
                <button
                  type="button"
                  onClick={() => setActiveChart(quickChartId)}
                  className={`${BTN_3D_SECONDARY} w-full`}
                >
                  View Charts
                </button>
              )}
              {/* ✅ 3D Open Workspace Button */}
              <button
                type="button"
                onClick={() => document.getElementById('report-workspace')?.scrollIntoView({ behavior: 'smooth' })}
                className={`${BTN_3D_SECONDARY} w-full`}
              >
                Open Workspace
              </button>
            </div>
          </div>
        </aside>
        </div>
      </div>

      {activeChart && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveChart(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chart-detail-title"
            className={`max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border p-5 shadow-2xl sm:p-7 ${isDk ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${accent}`}>Chart details</p>
                <h2 id="chart-detail-title" className={`mt-1 text-xl font-black ${txtPrimary}`}>{chartTitle[activeChart]}</h2>
                <p className={`mt-1 text-sm ${txtSecondary}`}>Expanded view based on the selected report filters.</p>
              </div>
              {/* ✅ 3D Close Button */}
              <button
                type="button"
                onClick={() => setActiveChart(null)}
                className={BTN_3D_SECONDARY}
                aria-label="Close chart details"
              >
                Close
              </button>
            </div>
            {renderChart(activeChart, true)}
          </div>
        </div>
      )}
    </div>
  );
}