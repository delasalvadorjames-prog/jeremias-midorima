import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowUpRight, CheckCircle2, PackageCheck, RefreshCw, Tag, TrendingUp, Zap, Flame } from 'lucide-react';
import { Medicine, ProductSaleEntry, CustomPromo } from '../types';
import { loadCustomPromos, saveCustomPromo } from '../lib/promoStorage';
import ForecastChart from './reports/ForecastChart';
import { fetchForecast } from './reports/api';
import { ForecastData } from './reports/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';

type Props = {
  medicines: Medicine[];
  salesTrend: ProductSaleEntry[];
  formatPeso: (value: number) => string;
  onBulkRestock?: (items: { id: number; name: string; quantity: number }[]) => Promise<void>;
  onOpenInventoryPromo?: (medicineId: number) => void;
};

const COLORS = {
  emerald: '#059669',
  teal: '#0f766e',
  indigo: '#4f46e5',
  sky: '#0284c7',
  amber: '#d97706',
  rose: '#e11d48',
  violet: '#7c3aed',
} as const;

// ─── 3D Button & Box classes ────────────────────────────────────────────────
const BTN_3D_BASE = `
  relative inline-flex items-center justify-center gap-2
  transition-all duration-150 ease-out
  active:translate-y-[2px] active:shadow-none
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0
`;

const BTN_3D_PRIMARY = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-emerald-500 to-emerald-600
  text-white font-bold
  shadow-[0_4px_0_0_#047857,0_6px_12px_-2px_rgba(4,120,87,0.4)]
  hover:from-emerald-400 hover:to-emerald-500
  hover:shadow-[0_4px_0_0_#047857,0_8px_16px_-2px_rgba(4,120,87,0.5)]
  focus-visible:ring-emerald-500
`;

const BTN_3D_SECONDARY = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-white to-slate-50
  text-slate-700 font-bold
  border border-slate-200
  shadow-[0_4px_0_0_#cbd5e1,0_6px_12px_-2px_rgba(15,23,42,0.15)]
  hover:from-slate-50 hover:to-slate-100
  hover:shadow-[0_4px_0_0_#94a3b8,0_8px_16px_-2px_rgba(15,23,42,0.2)]
  focus-visible:ring-slate-400
`;

const BTN_3D_GHOST = `
  ${BTN_3D_BASE}
  rounded-full p-2
  text-slate-400
  hover:bg-slate-100 hover:text-slate-600
  focus-visible:ring-slate-400
`;

// 3D raised box/card effect
const BOX_3D = `
  rounded-2xl
  border border-slate-200/90
  bg-gradient-to-b from-white to-slate-50/40
  shadow-[0_6px_0_0_rgba(15,23,42,0.06),0_12px_24px_-12px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]
`;

const BOX_3D_SUBTLE = `
  rounded-xl
  border border-slate-200
  bg-gradient-to-b from-white to-slate-50/40
  shadow-[0_3px_0_0_rgba(15,23,42,0.05),0_6px_14px_-8px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)]
`;

// ─── Date & Number Utilities ────────────────────────────────────────────────

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const unitsOf = (sale: ProductSaleEntry): number =>
  sale.units || (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);

const expiryDaysFor = (medicine: Medicine): number | null => {
  const date = parseDate(medicine.expiry);
  if (!date) return null;
  return Math.ceil(
    (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000
  );
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-PH').format(value);

const buildLocalForecast = (sales: ProductSaleEntry[]): ForecastData | null => {
  const monthly = new Map<string, number>();
  sales.forEach((sale) => {
    const date = parseDate(sale.timestamp);
    if (!date) return;
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthly.set(period, (monthly.get(period) || 0) + (Number(sale.total) || 0));
  });

  const actuals = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([period, revenue]) => ({ period, revenue, type: 'actual' as const }));
  if (!actuals.length) return null;

  const recent = actuals.slice(-3).map((point) => point.revenue);
  const average = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const lastDate = new Date(`${actuals[actuals.length - 1].period}-01T00:00:00`);
  const forecast = Array.from({ length: 3 }, (_, index) => {
    const next = new Date(lastDate.getFullYear(), lastDate.getMonth() + index + 1, 1);
    return {
      period: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`,
      revenue: Math.round(average * (1.05 ** (index + 1)) * 100) / 100,
      type: 'forecast' as const,
    };
  });

  return { actuals, forecast };
};

const formatUnit = (unit: string): string => {
  const normalized = unit.trim().toLowerCase();
  if (!normalized || normalized === 'unit' || normalized === 'units' || normalized === 'pc' || normalized === 'pcs') {
    return 'pcs';
  }
  return normalized;
};

const formatUnitQuantity = (quantity: number, unit: string): string => {
  const normalized = formatUnit(unit);
  if (quantity === 1) return normalized;
  if (normalized === 'box' || normalized === 'boxes') return 'boxes';
  if (normalized.endsWith('s')) return normalized;
  return `${normalized}s`;
};

const INVENTORY_UNIT_FACTORS: Record<string, number> = {
  pcs: 1,
  box: 100,
  strip: 10,
  bottle: 100,
  vial: 1,
  tube: 1,
  sachet: 1,
};

const INVENTORY_UNITS = new Set(Object.keys(INVENTORY_UNIT_FACTORS));

const getSuggestedPurchaseUnit = (medicine: Medicine): string => {
  const savedUnit = formatUnit(medicine.purchaseUnit || medicine.unitType || '');
  const savedBaseUnit = formatUnit(medicine.baseUnit || '');

  if (savedUnit !== 'pcs' && INVENTORY_UNITS.has(savedUnit)) return savedUnit;
  if (savedBaseUnit !== 'pcs' && INVENTORY_UNITS.has(savedBaseUnit)) return savedBaseUnit;

  const medicineText = [medicine.name, medicine.medicine_name, medicine.dosage_form, medicine.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\b(tab|tablet|capsule)s?\b/.test(medicineText)) return 'strip';
  if (/\b(syrup|suspension|drops?|liquid)\b/.test(medicineText)) return 'bottle';
  if (/\b(injectable|injection|ampoule|amp|vial)\b/.test(medicineText)) return 'vial';
  if (/\b(cream|ointment|gel)\b/.test(medicineText)) return 'tube';
  if (/\b(sachet|powder)\b/.test(medicineText)) return 'sachet';
  return 'pcs';
};

const purchaseQuantityFor = (medicine: Medicine, baseQuantity: number): number => {
  const purchaseUnit = getSuggestedPurchaseUnit(medicine);
  const savedFactor = Number(medicine.conversionFactor) || 0;
  const conversionFactor = Math.max(1, savedFactor || INVENTORY_UNIT_FACTORS[purchaseUnit] || 1);
  return Math.ceil(Math.max(0, baseQuantity) / conversionFactor);
};

// ─── Lightweight ML Helpers ─────────────────────────────────────────────────

function linearRegression(data: number[]) {
  const n = data.length;
  if (n === 0) {
    return { slope: 0, intercept: 0, predict: () => 0 };
  }

  const indices = Array.from({ length: n }, (_, i) => i);
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * data[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
  };
}

function predictDemand(historicalSales: number[], daysToPredict: number): number {
  if (historicalSales.length === 0) return 0;

  const regression = linearRegression(historicalSales);
  const basePrediction = regression.predict(historicalSales.length);
  const recentWindow = historicalSales.slice(-7);
  const recentAvg =
    recentWindow.reduce((a, b) => a + b, 0) / Math.max(1, recentWindow.length);

  const predicted = basePrediction * 0.6 + recentAvg * 0.4;
  return Math.max(0, Math.ceil(predicted * daysToPredict));
}

type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

function calculateExpiryRisk(
  expiryDays: number,
  stockLevel: number,
  dailySales: number
): { score: number; level: RiskLevel } {
  let score = 0;

  if (expiryDays <= 0) score += 40;
  else if (expiryDays <= 30) score += 30;
  else if (expiryDays <= 60) score += 20;
  else if (expiryDays <= 90) score += 10;

  if (dailySales > 0) {
    const daysToSell = stockLevel / dailySales;
    if (daysToSell > expiryDays) score += 30;
    else if (daysToSell > expiryDays * 0.5) score += 15;
  }

  if (stockLevel > 50 && expiryDays <= 60) score += 20;

  score = Math.min(100, score);

  let level: RiskLevel = 'LOW';
  if (score >= 70) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 30) level = 'MEDIUM';

  return { score, level };
}

function findBundles(
  transactions: number[][]
): { pair: [number, number]; frequency: number; confidence: number }[] {
  const pairCount = new Map<string, number>();
  const itemCount = new Map<number, number>();

  transactions.forEach((transaction) => {
    transaction.forEach((item) => {
      itemCount.set(item, (itemCount.get(item) || 0) + 1);
    });

    for (let i = 0; i < transaction.length; i++) {
      for (let j = i + 1; j < transaction.length; j++) {
        const a = transaction[i];
        const b = transaction[j];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  });

  const bundles: { pair: [number, number]; frequency: number; confidence: number }[] = [];

  pairCount.forEach((count, key) => {
    const [id1, id2] = key.split('-').map(Number);
    const item1Count = itemCount.get(id1) || 1;
    const confidence = count / item1Count;

    if (count > 1 && confidence > 0.3) {
      bundles.push({
        pair: [id1, id2],
        frequency: count,
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  });

  return bundles.sort(
    (a, b) => b.confidence - a.confidence || b.frequency - a.frequency
  );
}

// ─── Burn Rate Classification ───────────────────────────────────────────────

type BurnRateLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'NORMAL' | 'NO_CONSUMPTION';

function classifyBurnRate(dailySales: number, stockLevel: number): {
  level: BurnRateLevel;
  label: string;
  tone: 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';
} {
  const currentStock = Math.max(0, Number(stockLevel) || 0);

  // Burn rate measures velocity; risk is determined by how long the current
  // stock can support that velocity. Keep zero stock critical even when there
  // is no recent sale, while stocked items with no consumption stay neutral.
  if (currentStock <= 0) return { level: 'CRITICAL', label: 'Critical', tone: 'rose' };
  if (dailySales <= 0) return { level: 'NO_CONSUMPTION', label: 'No consumption', tone: 'slate' };

  const estimatedDaysUntilStockout = currentStock / dailySales;
  if (estimatedDaysUntilStockout <= 7) return { level: 'CRITICAL', label: 'Critical', tone: 'rose' };
  if (estimatedDaysUntilStockout <= 14) return { level: 'HIGH', label: 'High', tone: 'amber' };
  if (estimatedDaysUntilStockout <= 30) return { level: 'MODERATE', label: 'Moderate', tone: 'emerald' };
  return { level: 'NORMAL', label: 'Normal', tone: 'sky' };
}

// ─── UI Primitives ──────────────────────────────────────────────────────────

function Badge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border border-violet-200',
    slate: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide shadow-[0_1px_0_0_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${BOX_3D} flex h-full flex-col p-5 transition-all hover:shadow-[0_8px_0_0_rgba(15,23,42,0.07),0_16px_32px_-12px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-6`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white text-xl shadow-[0_3px_0_0_rgba(5,150,105,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <span aria-hidden="true">{icon}</span>
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex-1">{children}</div>
    </section>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PharmacyInsights({
  medicines,
  salesTrend,
  formatPeso,
  onBulkRestock,
  onOpenInventoryPromo,
}: Props) {
  const [promoMedicine, setPromoMedicine] = useState<Medicine | null>(null);
  const [promoDiscount, setPromoDiscount] = useState('10');
  const [promoSaved, setPromoSaved] = useState(false);
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastRefreshKey, setForecastRefreshKey] = useState(0);
  const [selectedDemandMedicine, setSelectedDemandMedicine] = useState<string | null>(null);

  const promos = useMemo(() => loadCustomPromos(), [promoSaved]);

  useEffect(() => {
    let cancelled = false;
    setForecastLoading(true);
    setForecastError(null);

    fetchForecast({ months_ahead: 3 })
      .then((data) => {
        if (!cancelled) {
          setForecast(data);
          setForecastError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = buildLocalForecast(salesTrend);
          setForecast(fallback);
          setForecastError(fallback ? 'Live forecast unavailable. Showing a local estimate.' : 'Forecast data could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled) setForecastLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [forecastRefreshKey, salesTrend]);

  // ─── Analysis ─────────────────────────────────────────────────────────────

  const analysis = useMemo(() => {
    const now = new Date();
    const rolling30Start = startOfDay(new Date(now));
    rolling30Start.setDate(rolling30Start.getDate() - 29);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthSales = salesTrend.filter((sale) => {
      const date = parseDate(sale.timestamp);
      return date && date >= thisMonth && date < nextMonth;
    });

    const lastMonthSales = salesTrend.filter((sale) => {
      const date = parseDate(sale.timestamp);
      return date && date >= lastMonth && date < thisMonth;
    });

    const allSales = salesTrend.filter((sale) => parseDate(sale.timestamp));
    const rolling30Sales = allSales.filter((sale) => {
      const date = parseDate(sale.timestamp);
      return date && date >= rolling30Start && date <= now;
    });
    const rolling30UnitsByProduct = new Map<number, number>();
    rolling30Sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        rolling30UnitsByProduct.set(
          item.medicineId,
          (rolling30UnitsByProduct.get(item.medicineId) || 0) + Math.max(0, Number(item.quantity) || 0),
        );
      });
    });

    const byProduct = new Map<
      number,
      { units: number; revenue: number; lastMonthUnits: number }
    >();

    thisMonthSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const row = byProduct.get(item.medicineId) || {
          units: 0,
          revenue: 0,
          lastMonthUnits: 0,
        };
        row.units += item.quantity;
        row.revenue += item.quantity * item.unitPrice;
        byProduct.set(item.medicineId, row);
      });
    });

    lastMonthSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const row = byProduct.get(item.medicineId) || {
          units: 0,
          revenue: 0,
          lastMonthUnits: 0,
        };
        row.lastMonthUnits += item.quantity;
        byProduct.set(item.medicineId, row);
      });
    });

    const dailySalesMap = new Map<number, number[]>();

    rolling30Sales.forEach((sale) => {
      const date = parseDate(sale.timestamp);
      if (!date) return;

      (sale.items || []).forEach((item) => {
        if (!dailySalesMap.has(item.medicineId)) {
          dailySalesMap.set(item.medicineId, []);
        }
        const history = dailySalesMap.get(item.medicineId)!;
        const dayIndex = Math.floor(
          (startOfDay(date).getTime() - rolling30Start.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayIndex >= 0 && dayIndex < 30) {
          history[dayIndex] = (history[dayIndex] || 0) + item.quantity;
        }
      });
    });

    const products = medicines.map((medicine) => {
      const sale = byProduct.get(medicine.id) || {
        units: 0,
        revenue: 0,
        lastMonthUnits: 0,
      };
      const dailySalesHistory = dailySalesMap.get(medicine.id) || [];
      const filledHistory = Array.from(
        { length: 30 },
        (_, i) => dailySalesHistory[i] || 0
      );

      const soldLast30Days = rolling30UnitsByProduct.get(medicine.id) || 0;
      const dailySales = soldLast30Days / 30;
      const expiryDays = expiryDaysFor(medicine);
      const stockValue = Math.max(0, medicine.stock || 0) * (medicine.unitPrice || 0);

      const projectedNextMonth = dailySales > 0
        ? predictDemand(filledHistory, 30)
        : 0;
      const mlTrend = linearRegression(filledHistory).slope;
      const expiryRisk =
        expiryDays !== null
          ? calculateExpiryRisk(expiryDays, medicine.stock || 0, dailySales)
          : { score: 0, level: 'NONE' as RiskLevel };
      const reorderBuffer = Math.max(0, Number(medicine.reorderLevel) || 0);
      const suggestedRestock = Math.max(0, projectedNextMonth + reorderBuffer - Math.max(0, medicine.stock || 0));

      const movement =
        dailySales >= 1
          ? 'fast'
          : dailySales >= 0.25
            ? 'normal'
            : sale.units > 0
              ? 'slow'
              : 'none';

      const currentStock = Math.max(0, Number(medicine.stock) || 0);
      const burnRate = classifyBurnRate(dailySales, currentStock);
      const daysToDeplete =
        dailySales > 0
          ? currentStock / dailySales
          : null;

      return {
        medicine,
        units: sale.units,
        revenue: sale.revenue,
        lastMonthUnits: sale.lastMonthUnits,
        soldLast30Days,
        dailySales,
        dailySalesHistory: filledHistory,
        expiryDays,
        stockValue,
        projectedNextMonth,
        suggestedRestock,
        movement,
        hasPromo: !!promos[medicine.id]?.isActive,
        promo: promos[medicine.id],
        growthRate:
          sale.lastMonthUnits > 0
            ? ((sale.units - sale.lastMonthUnits) / sale.lastMonthUnits) * 100
            : null,
        stockoutRisk:
          dailySales > 0
            ? currentStock / dailySales
            : null,
        mlTrend,
        expiryRiskScore: expiryRisk.score,
        expiryRiskLevel: expiryRisk.level,
        burnRate,
        daysToDeplete,
      };
    });

    const totalRevenue = thisMonthSales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    const totalUnits = thisMonthSales.reduce((sum, sale) => sum + unitsOf(sale), 0);
    const totalTransactions = thisMonthSales.length;
    const lastMonthRevenue = lastMonthSales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : null;

    const transactions = thisMonthSales
      .map((sale) => (sale.items || []).map((item) => item.medicineId))
      .filter((items) => items.length >= 2);

    const mlBundles = findBundles(transactions);

    const bundleSuggestions = mlBundles
      .slice(0, 5)
      .map((bundle) => {
        const med1 = medicines.find((m) => m.id === bundle.pair[0]);
        const med2 = medicines.find((m) => m.id === bundle.pair[1]);
        return {
          med1,
          med2,
          count: bundle.frequency,
          confidence: bundle.confidence,
        };
      })
      .filter((bundle) => bundle.med1 && bundle.med2);

    const fastMoving = products
      .filter((p) => p.movement === 'fast')
      .sort((a, b) => b.units - a.units);

    const slowMoving = products
      .filter(
        (p) =>
          (p.medicine.stock || 0) > 0 &&
          (p.movement === 'slow' || p.movement === 'none')
      )
      .sort((a, b) => b.stockValue - a.stockValue);

    const needsRestock = products
      .filter((p) => p.suggestedRestock > 0)
      .sort((a, b) => b.suggestedRestock - a.suggestedRestock);

    const expiringSoon = products
      .filter(
        (p) => p.expiryDays !== null && p.expiryDays > 0 && p.expiryDays <= 60
      )
      .sort((a, b) => (a.expiryDays || 999) - (b.expiryDays || 999));

    const highRiskExpiry = products
      .filter(
        (p) => p.expiryRiskLevel === 'CRITICAL' || p.expiryRiskLevel === 'HIGH'
      )
      .sort((a, b) => b.expiryRiskScore - a.expiryRiskScore);

    const demandForecast = products
      .filter((p) => (p.medicine.stock || 0) > 0 || p.soldLast30Days > 0 || p.suggestedRestock > 0)
      .sort((a, b) => b.suggestedRestock - a.suggestedRestock || b.projectedNextMonth - a.projectedNextMonth)
      .slice(0, 10);

    return {
      totalRevenue,
      totalUnits,
      totalTransactions,
      revenueGrowth,
      fastMoving,
      slowMoving,
      needsRestock,
      expiringSoon,
      highRiskExpiry,
      demandForecast,
      totalInventoryValue: products.reduce((sum, p) => sum + p.stockValue, 0),
      bundleSuggestions,
      top10Products: products
        .filter((p) => p.units > 0)
        .sort((a, b) => b.units - a.units)
        .slice(0, 10),
      trendProducts: products
        .filter((p) => p.mlTrend > 0.05)
        .sort((a, b) => b.mlTrend - a.mlTrend)
        .slice(0, 5),
      burnRateRanking: products
        .filter((p) => p.soldLast30Days > 0 || (p.medicine.stock || 0) > 0)
        .sort((a, b) => b.dailySales - a.dailySales)
        .slice(0, 10),
    };
  }, [medicines, salesTrend, promos]);

  // ─── ML restock chart data ────────────────────────────────────────────────
  const demandChartData = useMemo(
    () => analysis.needsRestock.slice(0, 8).map((product) => ({
      medicine: product.medicine.name.length > 16 ? `${product.medicine.name.slice(0, 14)}…` : product.medicine.name,
      medicineName: product.medicine.name,
      currentStock: Math.max(0, product.medicine.stock || 0),
      demand30Days: product.projectedNextMonth,
      suggestedRestock: product.suggestedRestock,
      suggestedRestockPurchaseUnits: purchaseQuantityFor(product.medicine, product.suggestedRestock),
      suggestedRestockUnit: getSuggestedPurchaseUnit(product.medicine),
    })),
    [analysis.needsRestock],
  );

  const demandChartConfig = {
    currentStock: { label: 'Current Stock', color: '#94a3b8' },
    demand30Days: { label: '30-Day Demand', color: '#4f46e5' },
    suggestedRestockPurchaseUnits: { label: 'ML Suggested Restock', color: '#059669' },
  } satisfies ChartConfig;

  const selectedDemandProduct = demandChartData.find(
    (product) => product.medicine === selectedDemandMedicine,
  );
  const fastMovingChartData = useMemo(
    () => analysis.fastMoving.slice(0, 6).map((product) => ({
      medicine: product.medicine.name.length > 18
        ? `${product.medicine.name.slice(0, 16)}…`
        : product.medicine.name,
      units: product.soldLast30Days,
    })),
    [analysis.fastMoving],
  );

  const fastMovingChartConfig = {
    units: { label: 'POS units (30d)', color: COLORS.emerald },
  } satisfies ChartConfig;

  // ─── Burn Rate chart data ─────────────────────────────────────────────────
  const burnRateChartData = useMemo(
    () => analysis.burnRateRanking.slice(0, 8).map((product) => ({
      medicine: product.medicine.name.length > 18
        ? `${product.medicine.name.slice(0, 16)}…`
        : product.medicine.name,
      fullName: product.medicine.name,
      dailySales: Number(product.dailySales.toFixed(2)),
      daysToDeplete: product.daysToDeplete ?? 0,
      burnLevel: product.burnRate.label,
      burnTone: product.burnRate.tone,
      stock: product.medicine.stock || 0,
      soldLast30Days: product.soldLast30Days,
    })),
    [analysis.burnRateRanking],
  );

  const burnRateChartConfig = {
    dailySales: { label: 'Burn Rate (units/day)', color: '#e11d48' },
  } satisfies ChartConfig;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const openPromo = (medicine: Medicine) => {
    if (!medicine || typeof medicine.id !== 'number') return;

    if (onOpenInventoryPromo) {
      onOpenInventoryPromo(medicine.id);
      return;
    }

    setPromoMedicine(medicine);
    setPromoDiscount('10');
    setPromoSaved(false);

    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const expiryDays = expiryDaysFor(medicine);
    const endDate = new Date(today);

    if (expiryDays !== null && expiryDays > 0 && expiryDays < 30) {
      endDate.setDate(endDate.getDate() + expiryDays);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    setPromoStart(startDate);
    setPromoEnd(endDate.toISOString().slice(0, 10));
  };

  const createPromo = () => {
    if (!promoMedicine) return;

    if (!promoStart || !promoEnd) {
      alert('Please set both start and end dates for the promotion.');
      return;
    }

    if (new Date(promoEnd) < new Date(promoStart)) {
      alert('End date cannot be earlier than the start date.');
      return;
    }

    const discountPercent = Math.max(1, Math.min(50, Number(promoDiscount) || 10));

    const promo: CustomPromo = {
      medicineId: promoMedicine.id,
      medicineName: promoMedicine.name,
      discountPercent,
      promoPrice: (promoMedicine.unitPrice || 0) * (1 - discountPercent / 100),
      promoLabel: `${discountPercent}% off`,
      badgeText: 'Insights promo',
      isActive: true,
      createdAt: new Date().toISOString(),
      startDate: promoStart,
      endDate: promoEnd,
    };

    saveCustomPromo(promo);
    setPromoSaved(true);

    setTimeout(() => {
      setPromoMedicine(null);
      setPromoSaved(false);
    }, 1500);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 pb-8">

      {/* Burn Rate */}
      {analysis.burnRateRanking.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon={<Flame className="h-5 w-5 text-rose-600" aria-hidden="true" />}
            title="Burn Rate"
            subtitle="Daily consumption velocity — how fast each medicine is being consumed"
          >
          <div className={`${BOX_3D_SUBTLE} mb-4 flex flex-wrap items-center justify-between gap-2 border-rose-100 bg-gradient-to-b from-rose-50/60 to-white px-4 py-3`}>
            <div>
              <p className="text-xs font-bold text-slate-800">Consumption velocity</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Average POS units sold per day over the last 30 days</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 shadow-[0_2px_0_0_rgba(225,29,72,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-rose-100">
              {analysis.burnRateRanking.length} tracked items
            </span>
          </div>

            <Card className="border border-slate-100 bg-gradient-to-b from-slate-50/60 to-white py-0 shadow-[0_3px_0_0_rgba(15,23,42,0.05),0_8px_18px_-10px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] ring-0">
              <CardContent className="px-4 pb-4 pt-4 sm:px-5">
                <ChartContainer config={burnRateChartConfig} className="h-[260px] w-full aspect-auto">
                  <BarChart
                    accessibilityLayer
                    data={burnRateChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 36, left: 0, bottom: 4 }}
                    barCategoryGap="22%"
                  >
                    <CartesianGrid horizontal={false} stroke="#fecdd3" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }}
                      tickFormatter={(value) => `${value}/d`}
                    />
                    <YAxis
                      dataKey="medicine"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={102}
                      tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(225, 29, 72, 0.05)' }}
                      content={
                        <ChartTooltipContent
                          className="!min-w-0 !max-w-[240px] !rounded-xl !border-slate-200 !bg-white !px-3.5 !py-2.5 !text-[11px] !leading-tight !shadow-[0_20px_40px_-20px_rgba(0,0,0,0.3)] [&_*]:!text-[11px]"
                          formatter={(value, _name, item) => {
                            const payload = item?.payload as typeof burnRateChartData[number] | undefined;
                            const rate = typeof value === 'number' ? value : 0;
                            const days = payload?.daysToDeplete ?? 0;
                            const stock = payload?.stock ?? 0;
                            return (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  {payload?.fullName ?? ''}
                                </p>
                                <p className="font-mono text-sm font-bold text-rose-700">
                                  {rate.toFixed(2)} <span className="text-[10px] font-medium text-slate-500">units/day</span>
                                </p>
                                {stock <= 0 ? (
                                  <p className="text-[10px] font-bold text-rose-700">Stockout now</p>
                                ) : days > 0 ? (
                                  <p className="text-[10px] font-medium text-slate-500">
                                    Stock depletes in <span className="font-bold text-slate-700">~{Math.floor(days)} days</span>
                                  </p>
                                ) : null}
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {payload?.burnLevel ?? ''}
                                </p>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                    <Bar dataKey="dailySales" fill="#e11d48" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      <LabelList
                        dataKey="dailySales"
                        position="right"
                        offset={8}
                        className="fill-rose-700"
                        fontSize={10}
                        fontWeight={700}
                        formatter={(value: unknown) =>
                          typeof value === 'number' ? `${value.toFixed(2)}/d` : ''
                        }
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </SectionCard>

          <SectionCard
            icon={<TrendingUp className="h-5 w-5 text-rose-600" aria-hidden="true" />}
            title="Top Burn Rate"
            subtitle="Products with the highest daily consumption velocity"
          >
            <div className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Top Burn Rate
                </p>
                <span className="text-[10px] font-semibold text-slate-400">
                  {analysis.burnRateRanking.length} items
                </span>
              </div>
              <div className="space-y-2">
                {analysis.burnRateRanking.slice(0, 6).map((product, index) => {
                  const burn = product.burnRate;
                  return (
                    <div
                      key={product.medicine.id}
                      className={`${BOX_3D_SUBTLE} group flex items-center justify-between gap-3 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_5px_0_0_rgba(225,29,72,0.12),0_10px_20px_-10px_rgba(225,29,72,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-[0_2px_0_0_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] ${
                          index === 0
                            ? 'bg-gradient-to-b from-rose-100 to-rose-50 text-rose-700'
                            : index === 1
                              ? 'bg-gradient-to-b from-amber-100 to-amber-50 text-amber-700'
                              : index === 2
                                ? 'bg-gradient-to-b from-emerald-100 to-emerald-50 text-emerald-700'
                                : 'bg-gradient-to-b from-slate-100 to-slate-50 text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {product.medicine.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {product.soldLast30Days} units / 30d
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={burn.tone}>{burn.label}</Badge>
                        <span className="font-mono text-[11px] font-bold tabular-nums text-rose-700">
                          {product.dailySales.toFixed(2)}/d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={`${BOX_3D_SUBTLE} mt-3 px-3 py-2 text-[10px] leading-relaxed text-slate-500`}>
                <span className="font-bold text-slate-600">Burn rate</span> = average daily POS units sold over the last 30 days. Higher values indicate faster consumption.
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Restock + Fast Movers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {demandChartData.length > 0 && (
        <SectionCard
          icon={<PackageCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />}
          title="Suggested Restock"
          subtitle="recommended reorder quantities for next month based on historical POS sales and demand forecasts"
        >
          {demandChartData.length === 0 ? (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div>
                <p className="text-sm font-bold text-slate-600">No inventory or POS data yet.</p>
                <p className="mt-1 text-xs text-slate-400">The chart will populate after medicines or sales are recorded.</p>
              </div>
            </div>
          ) : (
            <Card className="border-0 bg-transparent py-0 shadow-none ring-0">
              <CardContent className="px-0">
  <ChartContainer config={demandChartConfig} className="mt-2 h-[230px] w-full aspect-auto">
    <BarChart
      accessibilityLayer
      data={demandChartData}
      margin={{ top: 18, right: 16, left: 4, bottom: 8 }}
      barGap={4}
      barCategoryGap="20%"
      onClick={(state: any) => {
        const medicine = state?.activePayload?.[0]?.payload?.medicine;
        if (typeof medicine === 'string') setSelectedDemandMedicine(medicine);
      }}
      className="cursor-pointer"
    >
      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
      <XAxis dataKey="medicine" tickLine={false} axisLine={false} tickMargin={6} interval={0} tickFormatter={(value) => `${String(value).slice(0, 8)}…`} tick={{ fontSize: 8, fontWeight: 600, fill: '#64748b' }} />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={38} tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} />
      <ChartTooltip
        cursor={{
          fill: 'rgba(16, 185, 129, 0.06)',
          stroke: '#10b981',
          strokeOpacity: 0.2,
        }}
        content={
          <ChartTooltipContent
            className="
              !min-w-0 !max-w-[280px] 
              !rounded-xl !px-4 !py-3 
              !bg-white !border !border-slate-200 
              !shadow-lg !shadow-slate-200/50
              !text-[12px] !leading-relaxed
              [&_*]:!text-[12px]
              [&_*]:!leading-relaxed
            "
            labelClassName="
              !text-[11px] !font-semibold !text-slate-500 
              !uppercase !tracking-wider !mb-2
            "
            formatter={(value, _name, item) => {
              const payload = item?.payload as typeof demandChartData[number] | undefined;
              const quantity = typeof value === 'number' ? value : 0;
              const unit = payload?.suggestedRestockUnit || 'pcs';
              return (
                <span className="font-mono font-medium text-foreground tabular-nums">
                  +{formatNumber(quantity)} {formatUnitQuantity(quantity, unit)}
                </span>
              );
            }}
          />
        }
      />
      <Bar dataKey="suggestedRestockPurchaseUnits" fill="var(--color-suggestedRestockPurchaseUnits)" stroke="#047857" strokeWidth={1} radius={[6, 6, 0, 0]} maxBarSize={34}>
        <LabelList dataKey="suggestedRestockPurchaseUnits" position="top" offset={8} className="fill-emerald-700" fontSize={11} fontWeight={700} formatter={(value: unknown) => typeof value === 'number' && value > 0 ? `+${value}` : ''} />
      </Bar>
    </BarChart>
  </ChartContainer>
              </CardContent>
              <div className={`mt-3 rounded-xl border px-4 py-3 transition-colors ${
                selectedDemandProduct
                  ? 'border-emerald-200 bg-emerald-50/70 shadow-[0_3px_0_0_rgba(5,150,105,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]'
                  : 'border-dashed border-slate-200 bg-slate-50'
              }`}>
                  <p className="text-center text-xs font-medium text-slate-500">Click any medicine bar to view its full name and demand details.</p>
            
              </div>
              <div className={`${BOX_3D_SUBTLE} mt-3 flex items-start gap-2 border-amber-200 bg-gradient-to-b from-amber-50/70 to-white px-3 py-2.5 text-[11px] leading-relaxed text-amber-800`}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <p><span className="font-bold">Prediction notice:</span> ML suggestions are estimates and may be inaccurate. Verify current stock, sales trends, and reorder levels before placing an order.</p>
              </div>
              <CardFooter className="border-t border-slate-100 bg-transparent px-0 pb-0 pt-4 text-[11px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-700"><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> ML forecast + reorder level buffer</span>
              </CardFooter>
            </Card>
          )}
        </SectionCard>
        )}

        <SectionCard
          icon={<Zap className="h-5 w-5 text-emerald-700" aria-hidden="true" />}
          title="Fast-Moving Products"
          subtitle="Highest velocity items in the last 30 days"
        >
          {analysis.fastMoving.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-400">
              No fast-moving products identified.
            </p>
          ) : (
            <Card className="border-0 bg-transparent py-0 shadow-none ring-0">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-black text-slate-900">Top sellers by POS units</CardTitle>
                <CardDescription className="mt-1">The six products with the highest recorded movement in the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <ChartContainer config={fastMovingChartConfig} className="mt-2 h-[235px] w-full aspect-auto">
                  <BarChart accessibilityLayer data={fastMovingChartData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 8 }} barCategoryGap="20%">
                    <CartesianGrid horizontal={false} stroke="#d1fae5" strokeDasharray="4 4" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b' }} />
                    <YAxis
                      dataKey="medicine"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={96}
                      tick={{ fontSize: 9, fontWeight: 600, fill: '#475569' }}
                    />
                    <ChartTooltip
                      cursor={{
                        fill: 'rgba(16, 185, 129, 0.06)',
                        stroke: '#10b981',
                        strokeOpacity: 0.2,
                      }}
                      content={(
                        <ChartTooltipContent
                          hideLabel
                          className="!min-w-0 !max-w-[220px] !rounded-xl !border-slate-200 !bg-white !px-3 !py-2 !text-[11px] !leading-tight !shadow-[0_20px_40px_-20px_rgba(0,0,0,0.3)] [&_*]:!text-[11px]"
                        />
                      )}
                    />
                    <Bar dataKey="units" fill="var(--color-units)" radius={[0, 8, 8, 0]} maxBarSize={30}>
                      <LabelList dataKey="units" position="right" offset={8} className="fill-emerald-700" fontSize={11} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 border-t border-emerald-100 bg-transparent px-0 pb-0 pt-4 text-[11px] font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {analysis.fastMoving[0].medicine.name} leads at {formatNumber(analysis.fastMoving[0].soldLast30Days)} units
                </span>
                <span>{formatNumber(analysis.fastMoving.slice(0, 6).reduce((total, product) => total + product.soldLast30Days, 0))} total units / 30d</span>
              </CardFooter>
            </Card>
          )}
        </SectionCard>
      </div>

      {/* Slow Movers */}
      <SectionCard
        icon={<Tag className="h-5 w-5 text-emerald-700" aria-hidden="true" />}
        title="Slow-Moving Products"
        subtitle="Low velocity items — consider promotions to improve turnover"
      >
        {analysis.slowMoving.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">
              No slow-moving products
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.slowMoving.slice(0, 8).map((product) => (
              <div
                key={product.medicine.id}
                className={`${BOX_3D_SUBTLE} flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_5px_0_0_rgba(5,150,105,0.12),0_10px_20px_-10px_rgba(5,150,105,0.25),inset_0_1px_0_rgba(255,255,255,0.9)]`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {product.medicine.name}
                    </p>
                    {product.hasPromo && (
                      <Badge tone="emerald">Promo Active</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Stock: {product.medicine.stock} · Sold: {product.units} · Value:{' '}
                    {formatPeso(product.stockValue)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openPromo(product.medicine)}
                  className={`${product.hasPromo ? BTN_3D_SECONDARY : BTN_3D_PRIMARY} shrink-0 px-4 py-2 text-xs`}
                >
                  {product.hasPromo ? 'Edit' : 'Create Promo'}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Sales Forecast */}
      <ForecastChart
        data={forecast}
        loading={forecastLoading}
        error={forecastError}
        onRetry={() => setForecastRefreshKey((value) => value + 1)}
        isDark={false}
      />

      {/* Promo Modal */}
      {promoMedicine && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${BOX_3D} w-full max-w-md p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">
                  Promo Setup
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {promoMedicine.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPromoMedicine(null)}
                className={BTN_3D_GHOST}
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5">
              <label className="text-xs font-semibold text-slate-600">
                Discount Percentage
              </label>
              <select
                value={promoDiscount}
                onChange={(e) => setPromoDiscount(e.target.value)}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-[0_2px_0_0_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                {[5, 10, 15, 20, 25, 30, 50].map((value) => (
                  <option key={value} value={value}>
                    {value}% OFF
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Start Date
                </label>
                <input
                  type="date"
                  value={promoStart}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPromoStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_2px_0_0_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  End Date
                </label>
                <input
                  type="date"
                  value={promoEnd}
                  min={promoStart || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPromoEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-[0_2px_0_0_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className={`${BOX_3D_SUBTLE} mt-4 border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-4`}>
              <p className="text-xs font-semibold text-emerald-700">
                Pricing Preview
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatPeso(Number(promoMedicine.unitPrice) || 0)}{' '}
                <span className="text-emerald-700">
                  →{' '}
                  {formatPeso(
                    (Number(promoMedicine.unitPrice) || 0) *
                      (1 - (Number(promoDiscount) || 0) / 100)
                  )}
                </span>
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromoMedicine(null)}
                className={`${BTN_3D_SECONDARY} px-5 py-2.5 text-sm`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createPromo}
                disabled={!promoStart || !promoEnd}
                className={`${BTN_3D_PRIMARY} px-5 py-2.5 text-sm`}
              >
                {promoSaved ? 'Saved' : 'Create Promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
