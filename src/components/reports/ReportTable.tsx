import React, { useEffect, useMemo, useState } from 'react';
import {
  BIRReport, InventoryItem, MonthlySalesPoint, PurchasePeriod,
  ReportType, StockMovementItem, TopProduct,
} from './types';

const serif = { fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' };
const mono  = { fontFamily: 'ui-monospace, "SF Mono", "Roboto Mono", Menlo, Consolas, monospace' };

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
const cnt = (n: number) => new Intl.NumberFormat('en-US').format(n);

type Tone = 'teal' | 'rose' | 'amber' | 'ink';

interface Column {
  key: string; label: string;
  align?: 'left' | 'right';
  value: (row: any) => string | number;
  render?: (row: any) => React.ReactNode;
  csv?: (row: any) => string | number;
  sortable?: boolean;
}
interface Stat { label: string; value: string; tone?: Tone }
interface Config {
  title: string; columns: Column[]; data: any[]; stats: Stat[];
  rowKey?: (row: any, i: number) => string | number;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
}
interface Props {
  reportType: ReportType;
  sales: MonthlySalesPoint[];
  inventory: InventoryItem[];
  topProducts: TopProduct[];
  purchases: PurchasePeriod[];
  stockMovements: StockMovementItem[];
  birReport: BIRReport | null;
  loading: boolean;
  isDark: boolean;
}

const sum = <T,>(arr: T[], f: (x: T) => number) =>
  arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);

const money = (key: string, label: string): Column => ({
  key, label, align: 'right',
  value: r => Number(r[key]) || 0,
  render: r => fmt(Number(r[key]) || 0),
});
const count = (key: string, label: string, suffix = ''): Column => ({
  key, label, align: 'right',
  value: r => Number(r[key]) || 0,
  render: r => `${cnt(Number(r[key]) || 0)}${suffix}`,
});
const text = (key: string, label: string): Column => ({
  key, label, value: r => r[key] ?? '',
});

const STATUS_DOT: Record<string, string> = {
  'Healthy': '#0D7A73', 'Low Stock': '#9A5B0A',
  'Critical Stock': '#B3261E',
  'Out of Stock': '#B3261E', 'Expiring Soon': '#C2660F',
};

function buildConfig(p: Omit<Props, 'loading'>): Config {
  const { reportType, sales, inventory, topProducts, purchases, stockMovements, birReport } = p;

  if (reportType === 'bir') {
    const rows = birReport?.transactions ?? [];
    return {
      title: 'BIR transaction register', data: rows,
      rowKey: (r, i) => `${r.receipt_invoice_no}-${r.date}-${i}`,
      columns: [
        text('receipt_invoice_no', 'Receipt / Invoice'), text('date', 'Date'),
        text('customer_type', 'Customer type'),
        money('gross_amount', 'Gross'), money('vatable_sales', 'VATable'),
        money('vat_amount', 'VAT'), money('vat_exempt_sales', 'VAT-exempt'),
        money('discount', 'Discount'), money('net_sales', 'Net sales'),
        text('payment_method', 'Payment'),
      ],
      stats: [
        { label: 'Net sales', value: fmt(sum(rows, r => r.net_sales)), tone: 'teal' },
        { label: 'VATable sales', value: fmt(sum(rows, r => r.vatable_sales)) },
        { label: 'VAT amount', value: fmt(sum(rows, r => r.vat_amount)) },
        { label: 'Discounts given', value: fmt(sum(rows, r => r.discount)), tone: 'amber' },
      ],
    };
  }

  if (reportType === 'sales' || reportType === 'transactions') {
    const revenue = sum(sales, s => s.revenue);
    const txns = sum(sales, s => s.transactions);
    return {
      title: 'Sales & revenue', data: sales, rowKey: (r, i) => r.period || i,
      columns: [
        text('period', 'Period'),
        count('transactions', 'Transactions', ' txns'),
        count('units', 'Units sold', ' units'),
        money('revenue', 'Revenue'),
      ],
      stats: [
        { label: 'Total revenue', value: fmt(revenue), tone: 'teal' },
        { label: 'Transactions', value: cnt(txns) },
        { label: 'Units sold', value: cnt(sum(sales, s => s.units)) },
        { label: 'Average sale', value: txns ? fmt(revenue / txns) : '—' },
      ],
    };
  }

  if (['inventory', 'low_stock', 'expiring', 'damages', 'expired', 'count_correction'].includes(reportType)) {
    const titles: Record<string, string> = {
      expiring: 'Expiring medicines', damages: 'Damaged stock register',
      expired: 'Expired stock register',
      count_correction: 'Count correction register',
      inventory: 'Inventory master register',
      low_stock: 'Low stock register',
    };
    const isAdjustment = reportType === 'damages' || reportType === 'count_correction';
    const data =
      reportType === 'low_stock' ? inventory.filter(i => i.status === 'Low Stock') :
      reportType === 'expiring' ? inventory.filter(i => i.status === 'Expiring Soon') :
      reportType === 'expired'  ? inventory.filter(i => i.status === 'Expired') :
      inventory;

    const columns: Column[] = isAdjustment
      ? [
          text('medicine_name', 'Medicine'), text('category', 'Category'),
          { key: 'adjusted_by', label: 'Adjusted by', value: r => r.adjusted_by || '', render: r => r.adjusted_by || '—' },
          { key: 'adjusted_at', label: 'Adjusted at', value: r => r.adjusted_at || '', render: r => r.adjusted_at || '—' },
          { key: 'details', label: 'Details', value: r => r.details || '', render: r => r.details || '—', sortable: false },
        ]
      : [
          text('medicine_name', 'Medicine'),
          {
            key: 'volume',
            label: 'Volume',
            value: r => r.volume || String(r.medicine_name || '').match(/\b\d+(?:\.\d+)?\s*(?:ml|mL|L|mg|g)\b/i)?.[0] || '—',
            render: r => r.volume || String(r.medicine_name || '').match(/\b\d+(?:\.\d+)?\s*(?:ml|mL|L|mg|g)\b/i)?.[0] || '—',
          },
          text('category', 'Category'),
          {
            key: 'stock', label: 'Stock', align: 'right',
            value: r => Number(r.stock) || 0,
            render: r => (
              <span style={{
                color: r.status === 'Out of Stock' || r.status === 'Critical Stock' ? '#B3261E' : r.status === 'Low Stock' ? '#9A5B0A' : 'inherit',
                fontWeight: r.status === 'Out of Stock' || r.status === 'Critical Stock' || r.status === 'Low Stock' ? 700 : 600,
              }}>
                {cnt(Number(r.stock) || 0)}
              </span>
            ),
          },
          count('reorder_level', 'Reorder lvl'),
          money('unit_price', 'Unit price'),
          money('stock_value', 'Stock value'),
          {
            key: 'expiry', label: 'Expiry',
            value: r => (r.days_left === null || r.days_left === undefined ? 999999 : r.days_left),
            render: r => {
              const has = r.days_left !== null && r.days_left !== undefined;
              const color = !has ? 'inherit' : r.days_left <= 0 ? '#B3261E' : r.days_left <= 30 ? '#9A5B0A' : 'inherit';
              return (
                <span style={{ color, fontWeight: has && r.days_left <= 30 ? 700 : 600 }}>
                  {r.expiry || 'N/A'}{has ? ` (${r.days_left <= 0 ? 'expired' : `${r.days_left}d`})` : ''}
                </span>
              );
            },
            csv: r => r.expiry || 'N/A',
          },
          {
            key: 'status', label: 'Status', value: r => r.status,
            render: r => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span style={{
                  width: 6, height: 6, borderRadius: 9999,
                  background: STATUS_DOT[r.status] ?? '#B3261E',
                  display: 'inline-block',
                }} />
                {r.status}
              </span>
            ),
          },
        ];

    const stats: Stat[] = isAdjustment
      ? [{ label: 'Records', value: cnt(data.length) }]
      : reportType === 'inventory'
        ? [
            { label: 'Total items', value: cnt(data.length) },
            { label: 'Stock value', value: fmt(sum(data, i => i.stock_value)), tone: 'teal' },
            { label: 'Needs restock', value: cnt(data.filter(i => i.status === 'Critical Stock' || i.status === 'Low Stock' || i.status === 'Out of Stock').length), tone: 'amber' },
            { label: 'Expiring / expired', value: cnt(data.filter(i => i.status === 'Expiring Soon' || i.status === 'Expired').length), tone: 'rose' },
          ]
        : [
            { label: 'Items', value: cnt(data.length), tone: reportType === 'expired' ? 'rose' : 'amber' },
            { label: 'Stock value at risk', value: fmt(sum(data, i => i.stock_value)), tone: 'rose' },
          ];

    return {
      title: titles[reportType], data, columns, stats, rowKey: r => r.id,
      defaultSort: reportType === 'expiring' ? { key: 'expiry', dir: 'asc' } : undefined,
    };
  }

  if (reportType === 'top_selling') {
    const data = topProducts.map((t, i) => ({ ...t, _rank: i + 1 }));
    return {
      title: 'Top selling medicines', data, rowKey: (r, i) => r.medicine_id || i,
      columns: [
        { key: '_rank', label: 'Rank', value: r => r._rank, render: r => `#${r._rank}` },
        text('medicine_name', 'Medicine'), text('category', 'Category'),
        count('total_units', 'Units sold', ' pcs'),
        money('avg_price', 'Avg price'),
        money('total_revenue', 'Total revenue'),
      ],
      stats: [
        { label: 'Total revenue', value: fmt(sum(topProducts, t => t.total_revenue)), tone: 'teal' },
        { label: 'Units sold', value: cnt(sum(topProducts, t => t.total_units)) },
        { label: 'Best seller', value: topProducts[0]?.medicine_name ?? '—' },
      ],
    };
  }

  if (reportType === 'inventory_movement') {
    return {
      title: 'Inventory movement', data: stockMovements, rowKey: r => r.id,
      columns: [
        text('medicine_name', 'Medicine'), text('category', 'Category'),
        count('deducted_quantity', 'Deducted', ' units'),
        count('remaining_quantity', 'Remaining', ' units'),
        { key: 'last_deducted_at', label: 'Last deduction', value: r => r.last_deducted_at || '', render: r => r.last_deducted_at || '—' },
        count('movement_count', 'Deductions'),
      ],
      stats: [
        { label: 'Total deducted', value: `${cnt(sum(stockMovements, m => m.deducted_quantity))} units`, tone: 'rose' },
        { label: 'Deductions', value: cnt(sum(stockMovements, m => m.movement_count)) },
        { label: 'Medicines moved', value: cnt(stockMovements.length) },
      ],
    };
  }

  if (reportType === 'purchases') {
    return {
      title: 'Purchases & procurement', data: purchases, rowKey: (r, i) => r.period || i,
      columns: [
        text('period', 'Period'),
        count('batch_count', 'Batches', ' batches'),
        count('total_units', 'Units procured', ' units'),
        money('total_cost', 'Total cost'),
      ],
      stats: [
        { label: 'Total cost', value: fmt(sum(purchases, x => x.total_cost)), tone: 'teal' },
        { label: 'Units procured', value: cnt(sum(purchases, x => x.total_units)) },
        { label: 'Batches received', value: cnt(sum(purchases, x => x.batch_count)) },
      ],
    };
  }

  return { title: 'Report', data: [], columns: [], stats: [] };
}

/* ------------------------------------------------------------------ */
/* Component — no outer card, parent provides the unified box         */
/* ------------------------------------------------------------------ */
export default function ReportTable(props: Props) {
  const { reportType, loading, isDark } = props;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const config = useMemo(
    () => buildConfig(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportType, props.sales, props.inventory, props.topProducts, props.purchases, props.stockMovements, props.birReport],
  );

  const activeSort = sort ?? config.defaultSort ?? null;

  const sorted = useMemo(() => {
    if (!activeSort) return config.data;
    const col = config.columns.find(c => c.key === activeSort.key);
    if (!col) return config.data;
    const dir = activeSort.dir === 'asc' ? 1 : -1;
    return [...config.data].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir;
    });
  }, [config, activeSort?.key, activeSort?.dir]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  useEffect(() => { setSort(null); setPage(1); }, [reportType]);
  useEffect(() => { setPage(1); }, [totalCount, pageSize]);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort(() => {
      if (!activeSort || activeSort.key !== key) return { key, dir: 'asc' };
      if (activeSort.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      config.columns.map(c => esc(c.label)).join(','),
      ...sorted.map(r => config.columns.map(c => esc((c.csv ?? c.value)(r))).join(',')),
    ];
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---- tokens ---- */
  const ink     = isDark ? '#EDEFF3' : '#14181F';
  const muted   = isDark ? '#8A93A6' : '#6B6F76';
  const line    = isDark ? '#263042' : '#E2E4DE';
  const panelBg = isDark ? '#10151F' : '#FFFFFF';
  const rowHover = isDark ? 'rgba(47,191,178,0.06)' : 'rgba(13,122,115,0.04)';
  const TONE_COLOR: Record<Tone, string> = {
    teal: isDark ? '#2FBFB2' : '#0D7A73',
    rose: isDark ? '#F0645C' : '#B3261E',
    amber: isDark ? '#E3A008' : '#9A5B0A',
    ink,
  };

  const sortIcon = (key: string) =>
    (activeSort?.key !== key ? '⟷' : activeSort.dir === 'asc' ? '↑' : '↓');

  const labelStyle: React.CSSProperties = {
    ...mono, fontSize: '0.6875rem', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: muted,
  };

  // NO outer card wrapper — parent provides it.
  // Top border to visually separate from the filter section above.
  return (
    <div
      style={{ borderTop: `1px solid ${line}` }}
      className="px-5 py-5 sm:px-6"
    >
      {/* Header row — title + record count + CSV export + rows selector */}
      <div className="report-print-hide mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 style={{ color: ink }} className="text-lg font-bold tracking-tight">
            {config.title}
          </h3>
          <p style={{ ...mono, color: muted, fontSize: '0.75rem' }} className="mt-1" aria-live="polite">
            {loading
              ? 'Loading records…'
              : totalCount > 0
                ? `${cnt(totalCount)} record${totalCount === 1 ? '' : 's'} · showing ${start + 1}–${Math.min(start + pageSize, totalCount)}`
                : '0 records'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button" onClick={exportCsv}
            disabled={loading || totalCount === 0}
            style={{
              ...mono, fontSize: '0.75rem', fontWeight: 700,
              color: loading || totalCount === 0 ? muted : ink,
              opacity: loading || totalCount === 0 ? 0.5 : 1,
            }}
            className="underline decoration-dotted underline-offset-4 transition-colors hover:opacity-70 disabled:cursor-not-allowed"
          >
            Export CSV ↓
          </button>
          <label style={{ ...mono, fontSize: '0.75rem', color: muted }} className="flex items-center gap-2">
            Rows
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              style={{
                ...mono, background: 'transparent',
                border: `1px solid ${line}`, borderRadius: '6px',
                color: ink, fontSize: '0.75rem', fontWeight: 700,
                padding: '0.25rem 0.5rem',
              }}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          border: `1px solid ${line}`,
          borderRadius: '12px',
          background: panelBg,
          boxShadow: isDark
            ? '0 2px 8px -2px rgba(0,0,0,0.5) inset'
            : '0 2px 8px -2px rgba(15,23,42,0.04) inset',
        }}
        className="report-print-table max-h-[65vh] overflow-auto"
      >
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr style={{
              background: isDark
                ? 'linear-gradient(180deg, #1A2230 0%, #141B26 100%)'
                : 'linear-gradient(180deg, #F8FAF9 0%, #EEF2F0 100%)',
            }}>
              {config.columns.map(c => {
                const sortable = c.sortable !== false;
                return (
                  <th
                    key={c.key}
                    style={{
                      borderBottom: `2px solid ${line}`,
                      padding: '0.7rem 1rem',
                      textAlign: c.align === 'right' ? 'right' : 'left',
                    }}
                  >
                    {sortable ? (
                      <button
                        type="button" onClick={() => toggleSort(c.key)}
                        style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        className="whitespace-nowrap transition-colors hover:opacity-70"
                      >
                        {c.label}
                        <span style={{
                          color: activeSort?.key === c.key ? TONE_COLOR.teal : muted,
                          opacity: activeSort?.key === c.key ? 1 : 0.5,
                        }}>
                          {sortIcon(c.key)}
                        </span>
                      </button>
                    ) : (
                      <span style={labelStyle} className="whitespace-nowrap">{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, r) => (
                <tr key={r}>
                  {config.columns.map(c => (
                    <td key={c.key} style={{ borderBottom: `1px solid ${line}`, padding: '0.85rem 1rem' }}>
                      <div
                        style={{
                          height: '0.8rem', borderRadius: '4px',
                          background: isDark ? '#1B2534' : '#EEF0EC',
                          width: c.align === 'right' ? '4rem' : '7rem',
                          marginLeft: c.align === 'right' ? 'auto' : 0,
                        }}
                        className="animate-pulse"
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length > 0 ? (
              pageRows.map((row, i) => (
                <tr
                  key={config.rowKey ? config.rowKey(row, start + i) : start + i}
                  style={{ transition: 'background-color 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = rowHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {config.columns.map((c, ci) => (
                    <td
                      key={c.key}
                      style={{
                        ...mono,
                        borderBottom: `1px solid ${line}`,
                        padding: '0.65rem 1rem',
                        fontSize: '0.8125rem',
                        fontWeight: ci === 0 ? 700 : 500,
                        color: ink,
                        textAlign: c.align === 'right' ? 'right' : 'left',
                        whiteSpace: c.key === 'details' ? 'pre-line' : 'nowrap',
                      }}
                      className="tabular-nums"
                    >
                      {c.render ? c.render(row) : c.value(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={config.columns.length || 1} className="px-4 py-16 text-center">
                  <p style={{ ...serif, color: ink }} className="text-base">No records found</p>
                  <p style={{ ...mono, color: muted, fontSize: '0.75rem' }} className="mt-1">
                    Try a wider period or clear some filters.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="report-print-hide mt-4 flex items-center justify-between">
          <button
            type="button" disabled={safePage === 1}
            onClick={() => setPage(safePage - 1)}
            style={{
              ...mono, fontSize: '0.75rem', fontWeight: 700,
              color: safePage === 1 ? muted : ink,
              opacity: safePage === 1 ? 0.4 : 1,
            }}
            className="underline decoration-dotted underline-offset-4 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span style={{ ...mono, fontSize: '0.75rem', color: muted }}>
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button" disabled={safePage === totalPages}
            onClick={() => setPage(safePage + 1)}
            style={{
              ...mono, fontSize: '0.75rem', fontWeight: 700,
              color: safePage === totalPages ? muted : ink,
              opacity: safePage === totalPages ? 0.4 : 1,
            }}
            className="underline decoration-dotted underline-offset-4 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
