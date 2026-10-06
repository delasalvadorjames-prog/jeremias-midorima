import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TransactionTable from './TransactionTable';
import AddTransactionModal from './AddTransactionModal';
import { API_BASE } from '../data/constants';
import { getTransactions, createTransaction, deleteTransaction } from '../services/TransactionService';
import { Medicine, PharmacySettings, Transaction, UserRole } from '../types';
import { useFeedback } from './ui/feedback';

type Props = {
  onTransactionsChanged?: () => Promise<void> | void;
  canApproveVoids?: boolean;
  userRole?: UserRole;
  currentUserEmail?: string;
  currentUserName?: string;
  settings?: PharmacySettings;
};

const normalizeMedicine = (medicine: any): Medicine => ({
  ...medicine,
  unitPrice: medicine.unitPrice ?? medicine.unit_price ?? 0,
  reorderLevel: medicine.reorderLevel ?? medicine.reorder_level ?? 0,
  avgDailySales: medicine.avgDailySales ?? medicine.avg_daily_sales ?? 0,
});

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

const PAGE_SIZES = [10, 25, 50, 100];

export default function TransactionPage({
  onTransactionsChanged,
  canApproveVoids = true,
  userRole = 'staff',
  currentUserEmail = '',
  currentUserName = '',
  settings,
}: Props) {
  const { confirm, notify } = useFeedback();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicinesLoading, setMedicinesLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const stats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const totalUnits = transactions.reduce((sum, row) => sum + (row.quantity || 0), 0);
    const uniqueProducts = new Set(transactions.map((row) => row.medicine_id)).size;
    const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0;
    
    return { totalRevenue, totalUnits, uniqueProducts, avgTicket };
  }, [transactions]);

  const transactionScopeLabel = userRole === 'admin' ? 'All transactions' : 'Your transactions';

  const loadMedicines = useCallback(async () => {
    setMedicinesLoading(true);
    try {
      const response = await fetch(`${API_BASE}/medicines`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMedicines((data || []).map(normalizeMedicine));
    } catch (err) {
      console.error('Failed to load medicines', err);
      setMedicines([]);
    } finally {
      setMedicinesLoading(false);
    }
  }, []);

  const load = useCallback(async (isBackgroundRefresh = false) => {
    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const rows = await getTransactions(page, size, search);
      const identityKeys = [currentUserEmail, currentUserName]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      const visibleRows = userRole === 'admin'
        ? rows
        : rows.filter((row) => identityKeys.includes((row.cashier_name || '').trim().toLowerCase()));
      setTransactions(visibleRows);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(message);
      if (isBackgroundRefresh) {
        notify({ type: 'error', title: 'Refresh failed', message });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserEmail, currentUserName, page, size, search, userRole, notify]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const handleCreate = useCallback(async (payload: any) => {
    setCreating(true);
    try {
      await createTransaction(payload);
      await Promise.all([load(true), loadMedicines()]);
      await onTransactionsChanged?.();
      notify({
        type: 'success',
        title: 'Transaction recorded',
        message: 'Sales record created and inventory updated.',
      });
      setOpen(false);
    } catch (err) {
      notify({
        type: 'error',
        title: 'Transaction failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
      throw err;
    } finally {
      setCreating(false);
    }
  }, [load, loadMedicines, onTransactionsChanged, notify]);

  const handleDelete = useCallback(async (id: number) => {
    const shouldDelete = await confirm({
      title: 'Void transaction?',
      message: 'This will permanently void the sales record and restore inventory quantities.',
      confirmLabel: 'Void Transaction',
      tone: 'danger',
    });
    if (!shouldDelete) return;

    setDeletingId(id);
    try {
      await deleteTransaction(id);
      await Promise.all([load(true), loadMedicines()]);
      await onTransactionsChanged?.();
      notify({
        type: 'success',
        title: 'Transaction voided',
        message: 'Sales record voided and inventory restored.',
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Void transaction failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  }, [confirm, load, loadMedicines, onTransactionsChanged, notify]);

  const handleExport = useCallback(() => {
    try {
      const csvContent = [
        ['Transaction ID', 'Date', 'Medicine', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Method', 'Cashier', 'Status'],
        ...transactions.map(t => [
          t.id,
          new Date(t.created_at || t.timestamp || Date.now()).toLocaleString(),
          t.medicine_name || t.medicine_id,
          t.quantity,
          t.unit_price || t.unitPrice || t.price,
          t.total_amount,
          t.cashier_name || 'Unassigned',
          t.status || 'completed',
        ]),
      ]
        .map(row => row.join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      notify({
        type: 'success',
        title: 'Export complete',
        message: 'Transaction data exported to CSV.',
      });
    } catch (err) {
      notify({
        type: 'error',
        title: 'Export failed',
        message: 'Unable to export transaction data.',
      });
    }
  }, [transactions, notify]);

  const relativeLastUpdated = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [lastUpdated]);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="flex-1 text-sm font-medium text-rose-700">{error}</p>
          <button
            onClick={() => load()}
            className="rounded-md bg-white px-3 py-1 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">
          {transactionScopeLabel}
        </div>
        <TransactionTable
          transactions={transactions}
          loading={loading}
          page={page}
          size={size}
          total={transactions.length}
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
          onDelete={canApproveVoids ? handleDelete : undefined}
          settings={settings}
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
        />
      </div>

      {/* Modal */}
      <AddTransactionModal
        open={open}
        onClose={() => setOpen(false)}
        medicines={medicines}
        onCreate={handleCreate}
        isCreating={creating}
      />
    </div>
  );
}
