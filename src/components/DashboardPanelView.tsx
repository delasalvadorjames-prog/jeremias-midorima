'use client';

import React, { useMemo, useState } from 'react';
import { formatPeso as formatAmount, formatCount, formatPeso } from '../lib/format';
import {
  ResponsiveContainer,
  BarChart,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  LineChart,
  Line,
  LabelList,
  Label,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sector,
  ComposedChart,
} from 'recharts';
import { PredictiveRow, SalesPoint, ProductSaleEntry, AdminAlert, UserRole, AdminDashboardStats } from '../types';
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { CardDescription, CardTitle } from '@/components/ui/card';

type Props = {
  lowStockCount: number;
  expiringSoonCount: number;
  todaySales: number;
  salesSeries: SalesPoint[];
  predictiveRows: PredictiveRow[];
  monthOverMonth: number;
  salesTrend?: ProductSaleEntry[];
  adminStats?: AdminDashboardStats | null;
  adminAlerts?: AdminAlert[];
  onMarkAlertRead?: (alertId: number) => Promise<void>;
  userRole?: UserRole;
  onRefreshAdminStats?: () => Promise<void>;
  onViewInsights?: () => void;
  onViewStaff?: () => void;
  onViewInventory?: (filter?: string) => void;
  onViewReports?: () => void;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || fallback;
  return fallback;
};

type CategoryRevenueDatum = {
  category: string;
  revenue: number;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

const CategoryRevenueChart = ({ data }: { data: CategoryRevenueDatum[] }) => {
  const id = 'category-revenue-pie';
  const [activeCategory, setActiveCategory] = React.useState(data[0]?.category || '');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (data.length > 0 && !data.some((item) => item.category === activeCategory)) {
      setActiveCategory(data[0].category);
    }
  }, [data, activeCategory]);

  const activeIndex = Math.max(0, data.findIndex((item) => item.category === activeCategory));
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const activeColor = COLORS[activeIndex % COLORS.length];
  const chartConfig: ChartConfig = {
    revenue: { label: 'Revenue' },
    ...Object.fromEntries(
      data.map((item, index) => [
        item.category,
        {
          label: item.category,
          color: COLORS[index % COLORS.length],
        },
      ])
    ),
  };

  const renderPieShape = ({ index, outerRadius = 0, ...props }: any) => {
    if (index === activeIndex) {
      return (
        <g>
          <Sector {...props} outerRadius={outerRadius + 8} />
          <Sector {...props} outerRadius={outerRadius + 18} innerRadius={outerRadius + 10} />
        </g>
      );
    }
    return <Sector {...props} outerRadius={outerRadius} />;
  };

  return (
    <div className="w-full">
      <ChartStyle id={id} config={chartConfig} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="text-lg font-extrabold text-slate-900">Revenue by Category</CardTitle>
          <CardDescription className="text-sm text-slate-500">Sales distribution across categories</CardDescription>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isCategoryMenuOpen}
            aria-label="Select a category"
            onClick={() => setIsCategoryMenuOpen((open) => !open)}
            className="flex h-8 w-[145px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-left text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: activeColor }} />
            <span className="min-w-0 flex-1 truncate">{data[activeIndex]?.category || 'Category'}</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>
          {isCategoryMenuOpen && (
            <div
              role="listbox"
              aria-label="Revenue categories"
              className="absolute right-0 z-20 mt-1 max-h-52 w-[185px] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            >
              {data.map((item, index) => {
                const color = COLORS[index % COLORS.length];
                const isActive = item.category === activeCategory;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    key={item.category}
                    onClick={() => {
                      setActiveCategory(item.category);
                      setIsCategoryMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                      isActive ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">{item.category}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ChartContainer id={id} config={chartConfig} className="mx-auto aspect-square w-full max-w-[330px]">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel formatter={(value) => formatPeso(Number(value) || 0)} />}
          />
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="category"
            innerRadius={70}
            outerRadius={105}
            strokeWidth={5}
            stroke="#fff"
            activeIndex={activeIndex}
            shape={renderPieShape}
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-slate-900 text-xl font-bold">
                      {formatPeso(data[activeIndex]?.revenue || totalRevenue)}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-slate-500 text-xs">
                      {data[activeIndex]?.category || 'Total Revenue'}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
};

const MetricIcon = ({ tone, small }: { tone: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo'; small?: boolean }) => {
  const classes = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  const sz = small ? 'h-9 w-9' : 'h-12 w-12';
  const iconSz = small ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <span className={`flex ${sz} shrink-0 items-center justify-center rounded-xl ${classes[tone]}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className={iconSz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {tone === 'emerald' && <path d="M12 6v12M6 12h12M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />}
        {tone === 'amber' && <path d="M12 9v4m0 4h.01M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />}
        {tone === 'rose' && <path d="M12 8v5m0 4h.01M7 3h10l2 4-7 14L5 7l2-4Z" />}
        {tone === 'blue' && <path d="M4 7h16M6 7v12h12V7M9 11h6m-6 4h4M8 7V5h8v2" />}
        {tone === 'indigo' && (
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        )}
      </svg>
    </span>
  );
};

export default function DashboardPanelView({
  lowStockCount,
  expiringSoonCount,
  todaySales,
  salesSeries,
  predictiveRows,
  monthOverMonth,
  salesTrend = [],
  adminStats,
  adminAlerts,
  onMarkAlertRead,
  userRole,
  onRefreshAdminStats,
  onViewInsights,
  onViewStaff,
  onViewInventory,
  onViewReports,
}: Props) {
  const currentYear = new Date().getFullYear();
  const [salesYear, setSalesYear] = useState(currentYear);
  const [revenueTimeframe, setRevenueTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const safeSales = useMemo(() => (Array.isArray(salesSeries) ? salesSeries : []), [salesSeries]);

  const processedPredictive = useMemo(() => {
    if (!Array.isArray(predictiveRows)) return [];
    return predictiveRows
      .map((row) => ({
        ...row,
        name: row?.name || 'Medicine',
        avgDailySales: toNumber(row?.avgDailySales),
        stock: toNumber(row?.stock),
        suggestedRestock: toNumber(row?.suggestedRestock),
      }))
      .sort((a, b) => b.avgDailySales - a.avgDailySales);
  }, [predictiveRows]);

  const safePredictive = processedPredictive;
  const hasSalesData = safeSales.length > 0;

  const monthChangeLabel = useMemo(() => {
    if (monthOverMonth > 0) return `+${monthOverMonth.toFixed(1)}%`;
    if (monthOverMonth < 0) return `${monthOverMonth.toFixed(1)}%`;
    return '0%';
  }, [monthOverMonth]);

  const totalStock = useMemo(() => safePredictive.reduce((sum, row) => sum + toNumber(row.stock), 0), [safePredictive]);
  const totalMedicines = adminStats?.total_medicines ?? safePredictive.length;
  const expiredCount = adminStats?.expired_count ?? safePredictive.filter((row) => toNumber(row.daysLeft, 9999) < 0).length;
  const inventoryLowStockCount = lowStockCount;
  const nearingExpiryCount = adminStats?.nearing_expiry_count ?? expiringSoonCount;
  const goodInventoryCount = Math.max(totalMedicines - inventoryLowStockCount - expiredCount, 0);
  const todayTransactionCount = useMemo(() => {
    const today = new Date();
    return salesTrend.filter((sale) => {
      const date = new Date(sale.timestamp);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString();
    }).length;
  }, [salesTrend]);
  const inventoryValue = useMemo(
    () => safePredictive.reduce((sum, row) => sum + toNumber(row.stock) * toNumber(row.unitPrice), 0),
    [safePredictive],
  );
  const averageOrderValue = todayTransactionCount > 0 ? todaySales / todayTransactionCount : 0;

  const monthlyProgressData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const selectedYearLabel = salesYear.toString().slice(-2);

    return months.map((month) => {
      const labelToMatch = `${month} ${selectedYearLabel}`;
      const dataPoint = safeSales.find((s) => s.label === labelToMatch);
      const actual = dataPoint ? dataPoint.value : 0;
      return { name: month, actual };
    });
  }, [safeSales, salesYear]);

  const totalActualSales = useMemo(
    () => monthlyProgressData.reduce((sum, point) => sum + point.actual, 0),
    [monthlyProgressData]
  );

  const hasSelectedSalesData = monthlyProgressData.some((point) => point.actual > 0);

  const salesYearOptions = useMemo(() => {
    const years = new Set<number>([currentYear - 1, currentYear]);
    safeSales.forEach((point) => {
      const match = point.label.match(/(\d{2}|\d{4})$/);
      if (!match) return;
      const yearValue = Number(match[1]);
      years.add(yearValue < 100 ? 2000 + yearValue : yearValue);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [currentYear, safeSales]);

  const topProductsData = useMemo(() => {
    const productRevenueMap = new Map<number, number>();
    const productQuantityMap = new Map<number, number>();

    if (Array.isArray(salesTrend)) {
      salesTrend.forEach((sale) => {
        if (Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const rev = (item.quantity || 0) * (item.unitPrice || 0);
            productRevenueMap.set(item.medicineId, (productRevenueMap.get(item.medicineId) || 0) + rev);
            productQuantityMap.set(item.medicineId, (productQuantityMap.get(item.medicineId) || 0) + (item.quantity || 0));
          });
        }
      });
    }

    const list = Array.from(productRevenueMap.entries()).map(([medicineId, revenue]) => {
      const med = predictiveRows?.find((m) => m.id === medicineId);
      return {
        id: medicineId,
        name: med?.name || med?.medicine_name || `Medicine #${medicineId}`,
        revenue,
        quantity: productQuantityMap.get(medicineId) || 0,
        category: med?.category || 'Other',
      };
    });

    list.sort((a, b) => b.revenue - a.revenue);

    return list.slice(0, 5);
  }, [salesTrend, predictiveRows]);

  const categoryRevenueData = useMemo(() => {
    const categoryRevenueMap = new Map<string, number>();

    if (Array.isArray(salesTrend)) {
      salesTrend.forEach((sale) => {
        if (Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const med = predictiveRows?.find((m) => m.id === item.medicineId);
            const category = med?.category || 'Other';
            const rev = (item.quantity || 0) * (item.unitPrice || 0);
            categoryRevenueMap.set(category, (categoryRevenueMap.get(category) || 0) + rev);
          });
        }
      });
    }

    const list = Array.from(categoryRevenueMap.entries()).map(([category, revenue]) => ({
      category,
      revenue,
    }));

    return list.sort((a, b) => b.revenue - a.revenue);
  }, [salesTrend, predictiveRows]);

  const revenuePerformanceData = useMemo(() => {
    const now = new Date();

    if (revenueTimeframe === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekStart = new Date(now);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(now.getDate() - now.getDay());
      const totals = days.map((day) => ({ name: day, target: 0, actual: 0 }));

      salesTrend.forEach((sale) => {
        const date = new Date(sale.timestamp);
        if (Number.isNaN(date.getTime())) return;
        if (date < weekStart) return;
        totals[date.getDay()].actual += sale.total;
      });

      const recordedDays = totals.filter((point) => point.actual > 0);
      const target = recordedDays.length > 0 ? recordedDays.reduce((sum, point) => sum + point.actual, 0) / recordedDays.length : 0;
      return totals.map((point) => ({ ...point, target }));
    }

    if (revenueTimeframe === 'monthly') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const buckets = [
        { name: 'Week 1', start: 1, end: 7 },
        { name: 'Week 2', start: 8, end: 14 },
        { name: 'Week 3', start: 15, end: 21 },
        { name: 'Week 4', start: 22, end: daysInMonth },
      ];

      const totals = buckets.map((bucket) => {
        const actual = salesTrend.reduce((sum, sale) => {
          const date = new Date(sale.timestamp);
          if (Number.isNaN(date.getTime())) return sum;
          const sameMonth = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
          const inBucket = date.getDate() >= bucket.start && date.getDate() <= bucket.end;
          return sameMonth && inBucket ? sum + sale.total : sum;
        }, 0);

        return { name: bucket.name, target: 0, actual };
      });
      const recordedWeeks = totals.filter((point) => point.actual > 0);
      const target = recordedWeeks.length > 0 ? recordedWeeks.reduce((sum, point) => sum + point.actual, 0) / recordedWeeks.length : 0;
      return totals.map((point) => ({ ...point, target }));
    }

    const quarters = [
      { name: 'Q1', months: [0, 1, 2] },
      { name: 'Q2', months: [3, 4, 5] },
      { name: 'Q3', months: [6, 7, 8] },
      { name: 'Q4', months: [9, 10, 11] },
    ];

    const totals = quarters.map((quarter) => {
      const actual = salesTrend.reduce((sum, sale) => {
        const date = new Date(sale.timestamp);
        if (Number.isNaN(date.getTime())) return sum;
        const sameYear = date.getFullYear() === now.getFullYear();
        return sameYear && quarter.months.includes(date.getMonth()) ? sum + sale.total : sum;
      }, 0);

      return { name: quarter.name, target: 0, actual };
    });
    const recordedQuarters = totals.filter((point) => point.actual > 0);
    const target = recordedQuarters.length > 0 ? recordedQuarters.reduce((sum, point) => sum + point.actual, 0) / recordedQuarters.length : 0;
    return totals.map((point) => ({ ...point, target }));
  }, [revenueTimeframe, salesTrend]);

  const hasRevenueData = revenuePerformanceData.some((point) => point.actual > 0);

  // ─── NEW: Hourly Customer Surge ──────────────────────────────────────────
  const hourlyCustomerData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      customerIds: new Set<string>(),
    }));

    if (Array.isArray(salesTrend) && salesTrend.length > 0) {
      salesTrend.forEach((sale) => {
        const date = new Date(sale.timestamp);
        if (Number.isNaN(date.getTime())) return;
        const h = date.getHours();
        // Each POS sale entry represents one customer transaction. Use its
        // stable id so repeated item rows cannot inflate the hourly count.
        hours[h].customerIds.add(String(sale.id || sale.timestamp));
      });
    }

    return hours.map(({ customerIds, ...hour }) => ({ ...hour, customers: customerIds.size }));
  }, [salesTrend]);

  const peakHour = useMemo(() => {
    if (!hourlyCustomerData.length) return null;
    return hourlyCustomerData.reduce((max, cur) => (cur.customers > max.customers ? cur : max), hourlyCustomerData[0]);
  }, [hourlyCustomerData]);

  // ─── NEW: Stock Movement Analytics ───────────────────────────────────────
  const stockMovementData = useMemo(() => {
    // Prefer real movement if your backend ever supplies it.
    // For now we derive a reasonable view from predictive + sales.
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday start

    const buckets = days.map((name, index) => {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(startOfWeek.getDate() + index);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      let stockOut = 0;
      if (Array.isArray(salesTrend)) {
        salesTrend.forEach((sale) => {
          const d = new Date(sale.timestamp);
          if (d >= dayStart && d < dayEnd) {
            stockOut += sale.units || 0;
          }
        });
      }

      // Stock-in is intentionally zero until the backend provides actual
      // stock movement records. Showing estimates here makes the chart look
      // complete but can mislead inventory decisions.
      const stockIn = 0;

      return {
        name,
        stockIn,
        stockOut,
        net: 0,
      };
    });

    return buckets.map((b) => ({ ...b, net: b.stockIn - b.stockOut }));
  }, [salesTrend, safePredictive]);

  const metricCards = [
    {
      title: 'Total Medicines',
      value: formatCount(totalMedicines),
      detail: `${formatCount(totalStock)} units in stock`,
      tone: 'emerald' as const,
      action: () => onViewInventory?.(),
    },
    {
      title: 'Low Stock Alerts',
      value: formatCount(inventoryLowStockCount),
      detail: 'Items need reorder',
      tone: 'amber' as const,
      action: () => onViewInventory?.('lowstock'),
    },
    {
      title: 'Expiry Watch',
      value: formatCount(nearingExpiryCount),
      detail: `${expiredCount} expired items`,
      tone: 'rose' as const,
      action: () => onViewInventory?.('expired'),
    },
    {
      title: "Today's Revenue",
      value: formatAmount(todaySales),
      detail: `${monthChangeLabel} vs last month · ${todayTransactionCount} orders`,
      tone: 'indigo' as const,
      action: () => onViewReports?.(),
    },
   
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 pb-5 pt-2 md:px-6 md:pb-6 md:pt-3">
      {/* Metrics Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-1 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.title}
            onClick={card.action}
            className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.title}</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">{card.value}</p>
                <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Sales Revenue Chart */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Monthly Revenue</h2>
              <p className="text-sm text-slate-500">Sales performance by month</p>
            </div>
            <div className="flex gap-1">
              {salesYearOptions.map((year) => (
                <button
                  key={year}
                  onClick={() => setSalesYear(year)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    salesYear === year
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          {hasSalesData && hasSelectedSalesData ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyProgressData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                    tickFormatter={(v) => `₱${v}`}
                  />
                  <Tooltip
                    formatter={(value: any) => formatPeso(Number(value) || 0)}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)',
                    }}
                  />
                  <Bar dataKey="actual" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2 font-semibold">No sales data for {salesYear}</p>
              </div>
            </div>
          )}
        </section>

        {/* Top Products */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">Top Selling Products</h2>
            <p className="text-sm text-slate-500">Best performers by units sold</p>
          </div>
          <div className="h-[300px]">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="topBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                    width={120}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: any) => `${Number(value) || 0} units`}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)',
                    }}
                  />
                  <Bar dataKey="quantity" fill="url(#topBarGradient)" radius={[0, 6, 6, 0]} barSize={28}>
                    <LabelList
                      dataKey="quantity"
                      position="right"
                      offset={4}
                      style={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                      formatter={(value: any) => `${value} units`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <p className="mt-2 font-semibold">No product data available</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Charts Row 2 */}
      <div className="mb-8 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Revenue by Category */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
          {categoryRevenueData.length > 0 ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <CategoryRevenueChart data={categoryRevenueData} />
            </div>
          ) : (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
              <p className="text-3xl">&nbsp;</p>
              <p className="mt-2 font-semibold text-slate-600">No category sales yet</p>
              <p className="mt-1 text-xs text-slate-400">Category distribution will appear after the first sale.</p>
            </div>
          )}
        </section>

        {/* Revenue Performance */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Revenue Performance</h2>
              <p className="text-sm text-slate-500">Actual revenue vs recorded-period average</p>
            </div>
            <select
              value={revenueTimeframe}
              onChange={(event) => setRevenueTimeframe(event.target.value as 'weekly' | 'monthly' | 'yearly')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenuePerformanceData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#e2e8f0" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  tickFormatter={(v) => `₱${v}`}
                />
                <Tooltip
                  formatter={(value: any) => formatPeso(Number(value) || 0)}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)',
                  }}
                />
                <Bar dataKey="target" fill="url(#targetGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="actual" fill="url(#actualGradient)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          NEW ROW: Hourly Customer Surge + Daily Units Sold
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        {/* Hourly Customer Surge */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Hourly Customer Surge</h2>
              <p className="text-sm text-slate-500">Customer traffic by hour of day</p>
            </div>
            {peakHour && (
              <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Peak Hour</p>
                <p className="text-sm font-extrabold text-indigo-700">
                  {peakHour.hour} · {peakHour.customers} cust.
                </p>
              </div>
            )}
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourlyCustomerData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="customerArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  interval={2}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: any) => [value, 'Customers']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="customers"
                  stroke="none"
                  fill="url(#customerArea)"
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daily Units Sold */}
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/50">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Units Sold This Week</h2>
              <p className="text-sm text-slate-500">Recorded POS sales by day</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Units sold
              </span>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockMovementData} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="stockOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value} units`,
                    name === 'stockOut' ? 'Units sold' : 'Net',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)',
                  }}
                />
                <Bar dataKey="stockOut" name="Units sold" fill="url(#stockOutGrad)" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
