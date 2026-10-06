import React, { useMemo, useState } from 'react';
import { ReportFiltersState, ReportType } from './types';

type FilterKey = 'category' | 'supplier' | 'customerType' | 'vatType';
const RELEVANT: Record<FilterKey, ReportType[] | 'all'> = {
  category: 'all',
  supplier: ['purchases', 'inventory', 'low_stock', 'inventory_movement', 'expiring', 'expired', 'damages', 'count_correction'],
  customerType: ['bir'], vatType: ['bir'],
};
const isRelevant = (key: FilterKey, type: ReportType) => RELEVANT[key] === 'all' || RELEVANT[key].includes(type);
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const PRESETS = [
  { id: 'today', label: 'Today', range: () => { const t = new Date(); return [t, t] as const; } },
  { id: '7d', label: '7 days', range: () => { const t = new Date(); const s = new Date(t); s.setDate(t.getDate() - 6); return [s, t] as const; } },
  { id: 'month', label: 'This month', range: () => { const t = new Date(); return [new Date(t.getFullYear(), t.getMonth(), 1), t] as const; } },
  { id: 'lastmonth', label: 'Last month', range: () => { const t = new Date(); return [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)] as const; } },
  { id: 'year', label: 'This year', range: () => { const t = new Date(); return [new Date(t.getFullYear(), 0, 1), t] as const; } },
];

interface Props { filters: ReportFiltersState; onChange: (filters: ReportFiltersState) => void; onGenerate: (filters?: ReportFiltersState) => void; categories: string[]; suppliers: string[]; loading: boolean; isDark: boolean; }

export default function ReportFilters({ filters, onChange, onGenerate, categories, suppliers, loading, isDark }: Props) {
  const [submitted, setSubmitted] = useState(JSON.stringify(filters));
  const type = filters.reportType;
  const dirty = JSON.stringify(filters) !== submitted;
  const invalid = Boolean(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo);
  const activePreset = useMemo(() => PRESETS.find((p) => { const [from, to] = p.range(); return filters.dateFrom === iso(from) && filters.dateTo === iso(to); })?.id, [filters.dateFrom, filters.dateTo]);
  const update = (key: keyof ReportFiltersState, value: string) => onChange({ ...filters, [key]: value });
  const submit = () => { if (loading || invalid) return; setSubmitted(JSON.stringify(filters)); onGenerate(filters); };
  const clear = () => { const next = { ...filters, dateFrom: '', dateTo: '', category: '', paymentMethod: '', supplier: '', search: '', customerType: '', vatType: '' }; onChange(next); setSubmitted(JSON.stringify(next)); onGenerate(next); };
  const pickReport = (reportType: ReportType) => { const next = { ...filters, reportType, paymentMethod: '' }; (Object.keys(RELEVANT) as FilterKey[]).forEach((key) => { if (!isRelevant(key, reportType)) next[key] = ''; }); onChange(next); setSubmitted(JSON.stringify(next)); onGenerate(next); };
  const applyPreset = (id: string) => { const p = PRESETS.find((item) => item.id === id); if (!p) return; const [from, to] = p.range(); const next = activePreset === id ? { ...filters, dateFrom: '', dateTo: '' } : { ...filters, dateFrom: iso(from), dateTo: iso(to) }; onChange(next); setSubmitted(JSON.stringify(next)); onGenerate(next); };

  const ink = isDark ? '#EDEFF3' : '#14181F';
  const muted = isDark ? '#8A93A6' : '#6B6F76';
  const line = isDark ? '#334155' : '#D9DEE7';
  const teal = isDark ? '#2FBFB2' : '#0D7A73';
  const soft = isDark ? 'rgba(47,191,178,0.14)' : '#E6F3F1';
  const rose = isDark ? '#F0645C' : '#B3261E';
  const mono = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };
  const labelStyle: React.CSSProperties = { ...mono, color: muted, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' };
  const field = (borderColor = line): React.CSSProperties => ({ ...mono, width: '100%', minHeight: '3.45rem', marginTop: 6, padding: '0.72rem 0.9rem', border: `1px solid ${borderColor}`, borderRadius: '0.85rem', outline: 'none', background: isDark ? '#111927' : '#FFFFFF', color: ink, fontSize: '0.9rem', fontWeight: 650, boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.22)' : '0 1px 3px rgba(15,23,42,0.06)' });

  return (
    <div className="overflow-hidden border-b" style={{ borderColor: line, background: isDark ? '#111827' : '#FFFFFF' }}>
      <div className="px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p style={labelStyle}>Report workspace</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight" style={{ color: ink }}>Report generation panel</h2>
            <p className="mt-1 text-xs" style={{ color: muted }}>Refine the current report using the available date and data filters.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Quick report date ranges">
            {PRESETS.map((p) => { const active = activePreset === p.id; return <button key={p.id} type="button" onClick={() => applyPreset(p.id)} aria-pressed={active} className="rounded-full border px-3 py-2 text-xs font-bold transition hover:-translate-y-px" style={{ ...mono, color: active ? teal : muted, background: active ? soft : 'transparent', borderColor: active ? teal : line }}>{p.label}</button>; })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border p-4 sm:p-5" style={{ borderColor: line, background: isDark ? '#101722' : '#F8FAFC' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p style={labelStyle}>Refine results</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>Use any combination of filters.</p>
            </div>
            {dirty && <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: teal, background: soft }}>Unsaved changes</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label style={labelStyle}>From<input aria-label="Date from" type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => update('dateFrom', e.target.value)} style={field(invalid ? rose : line)} /></label>
            <label style={labelStyle}>To<input aria-label="Date to" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => update('dateTo', e.target.value)} style={field(invalid ? rose : line)} /></label>
            <label style={labelStyle}>Medicine<input className="placeholder:text-slate-400 placeholder:font-bold" aria-label="Medicine search" type="search" placeholder="Search by name…" value={filters.search} onChange={(e) => update('search', e.target.value)} style={field()} /></label>
            <label style={labelStyle}>Category<select value={filters.category} onChange={(e) => update('category', e.target.value)} style={field()}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            {isRelevant('supplier', type) && <label style={labelStyle}>Supplier<input type="text" placeholder="Search supplier" value={filters.supplier} onChange={(e) => update('supplier', e.target.value)} list="supplier-list" style={field()} /><datalist id="supplier-list">{suppliers.map((item) => <option key={item} value={item} />)}</datalist></label>}
            {isRelevant('customerType', type) && <label style={labelStyle}>Customer type<select value={filters.customerType} onChange={(e) => update('customerType', e.target.value)} style={field()}><option value="">All customers</option><option value="regular">Regular</option><option value="senior_citizen">Senior citizen</option><option value="pwd">PWD</option></select></label>}
            {isRelevant('vatType', type) && <label style={labelStyle}>VAT type<select value={filters.vatType} onChange={(e) => update('vatType', e.target.value)} style={field()}><option value="">All VAT types</option><option value="vatable">VATable</option><option value="vat_exempt">VAT-exempt</option></select></label>}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: line }}>
            <span className="text-xs font-semibold" style={{ ...mono, color: invalid ? rose : muted }}>{invalid ? 'From date must be earlier than To date.' : dirty ? 'Apply changes to update results.' : 'Results are up to date.'}</span>
            <div className="flex items-center gap-3">{(filters.dateFrom || filters.dateTo || filters.search || filters.category || filters.paymentMethod || filters.supplier) && <button type="button" onClick={clear} className="rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-white/60" style={{ ...mono, color: muted }}>Clear</button>}<button type="button" onClick={submit} disabled={loading || invalid} className="rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-px disabled:opacity-50" style={{ ...mono, background: teal }}>{loading ? 'Loading…' : dirty ? 'Apply filters' : 'Refresh report'}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
