import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomerRecord, CustomerType } from '../types';
import { searchCustomers, updateCustomer } from '../services/CustomerService';

const label = (type: CustomerType) => type === 'pwd' ? 'PWD' : 'Senior Citizens';

export default function CustomerRecordsPage({ canEdit = false }: { canEdit?: boolean }) {
  const [type, setType] = useState<CustomerType>('senior_citizen');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRows(await searchCustomers(type, search)); }
    catch (err: any) { setError(err.message || 'Unable to load customer records.'); }
    finally { setLoading(false); }
  }, [search, type]);

  useEffect(() => { void load(); }, [load]);

  const toggleStatus = async (row: CustomerRecord) => {
    try {
      const updated = await updateCustomer(row.id, { status: row.status === 'active' ? 'inactive' : 'active' });
      setRows(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (err: any) { setError(err.message || 'Unable to update customer record.'); }
  };

  const activeCount = useMemo(() => rows.filter((row) => row.status === 'active').length, [rows]);
  const inactiveCount = rows.length - activeCount;

  return <section className="space-y-5">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Customer records report</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Senior Citizens and PWD Register</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Verified customer records available for pharmacy discount validation.</p>
          </div>
          <p className="text-xs font-semibold text-slate-400">Generated {new Date().toLocaleDateString('en-PH')}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Displayed records</p><p className="mt-1 text-xl font-black text-slate-900">{rows.length}</p></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active</p><p className="mt-1 text-xl font-black text-emerald-700">{activeCount}</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inactive</p><p className="mt-1 text-xl font-black text-slate-600">{inactiveCount}</p></div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(['senior_citizen', 'pwd'] as CustomerType[]).map(value => <button key={value} type="button" onClick={() => setType(value)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${type === value ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label(value)}</button>)}
          </div>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${label(type)} by name or ID`} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
          <button type="button" onClick={() => void load()} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">Search report</button>
        </div>
      </div>
    </div>
    {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-sm font-black text-slate-900">Customer records register</p><p className="mt-0.5 text-xs font-medium text-slate-400">{rows.length} record{rows.length === 1 ? '' : 's'} · {label(type)}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Report data</span></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Customer name</th><th className="px-5 py-4">ID number</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date registered</th>{canEdit && <th className="px-5 py-4">Action</th>}</tr></thead><tbody>
        {loading ? <tr><td colSpan={canEdit ? 5 : 4} className="px-5 py-10 text-center font-bold text-slate-400">Loading records...</td></tr> : rows.length === 0 ? <tr><td colSpan={canEdit ? 5 : 4} className="px-5 py-10 text-center font-bold text-slate-400">No {label(type)} records found.</td></tr> : rows.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="px-5 py-4 font-bold text-slate-900">{row.full_name}</td><td className="px-5 py-4 font-mono text-slate-600">{row.id_number}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.status}</span></td><td className="px-5 py-4 text-slate-500">{new Date(row.date_registered).toLocaleDateString('en-PH')}</td>{canEdit && <td className="px-5 py-4"><button type="button" onClick={() => void toggleStatus(row)} className="font-bold text-emerald-700 hover:underline">{row.status === 'active' ? 'Deactivate' : 'Activate'}</button></td>}</tr>)}
      </tbody></table></div>
    </div>
  </section>;
}
