import React, { useMemo, useState } from 'react';
import { PharmacySettings, Transaction } from '../types';
import Receipt, { ReceiptSale } from './Receipt';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  page: number;
  size: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onSizeChange?: (size: number) => void;
  onDelete?: (id: number) => void;
  onSearch?: (term: string) => void;
  settings?: PharmacySettings;
}

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

// ─── 3D Button classes ───────────────────────────────────────────────────────
const BTN_3D_BASE = `
  relative inline-flex items-center justify-center gap-1.5
  transition-all duration-150 ease-out
  active:translate-y-[2px] active:shadow-none
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0
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
  border-2 border-slate-200
  shadow-[0_4px_0_0_#cbd5e1,0_6px_12px_-2px_rgba(15,23,42,0.15)]
  hover:from-slate-50 hover:to-slate-100
  hover:shadow-[0_4px_0_0_#94a3b8,0_8px_16px_-2px_rgba(15,23,42,0.2)]
  focus-visible:ring-slate-400
`;

const BTN_3D_SKY = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-sky-50 to-white
  text-sky-600 font-bold
  border-2 border-sky-200
  shadow-[0_4px_0_0_#bae6fd,0_6px_12px_-2px_rgba(2,132,199,0.2)]
  hover:from-sky-100 hover:to-sky-50
  hover:border-sky-300
  hover:shadow-[0_4px_0_0_#7dd3fc,0_8px_16px_-2px_rgba(2,132,199,0.3)]
  focus-visible:ring-sky-400
`;

const BTN_3D_DANGER = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-rose-50 to-white
  text-rose-600 font-bold
  border-2 border-rose-200
  shadow-[0_4px_0_0_#fecaca,0_6px_12px_-2px_rgba(225,29,72,0.2)]
  hover:from-rose-100 hover:to-rose-50
  hover:border-rose-300
  hover:shadow-[0_4px_0_0_#fca5a5,0_8px_16px_-2px_rgba(225,29,72,0.3)]
  focus-visible:ring-rose-400
`;

const BTN_3D_PAGINATION = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-white to-slate-50
  text-slate-700 font-extrabold
  border-2 border-slate-200
  shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.12)]
  hover:from-slate-50 hover:to-slate-100
  hover:shadow-[0_3px_0_0_#94a3b8,0_5px_10px_-2px_rgba(15,23,42,0.18)]
  focus-visible:ring-slate-400
`;

const BTN_3D_PAGINATION_ACTIVE = `
  ${BTN_3D_BASE}
  rounded-xl
  bg-gradient-to-b from-emerald-500 to-emerald-600
  text-white font-extrabold
  shadow-[0_3px_0_0_#047857,0_5px_10px_-2px_rgba(4,120,87,0.4)]
  hover:from-emerald-400 hover:to-emerald-500
  focus-visible:ring-emerald-500
`;

// 3D Box / Card effect
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

const getSaleGroupKey = (transaction: Transaction) => {
  if (transaction.sale_reference) return `sale:${transaction.sale_reference}`;
  if (transaction.cash_received == null || transaction.change_amount == null) {
    return `transaction:${transaction.id}`;
  }
  return [
    'legacy-sale',
    transaction.cashier_name || '',
    transaction.cash_received,
    transaction.change_amount,
    String(transaction.created_at || '').slice(0, 19),
  ].join('|');
};

export default function TransactionTable({
  transactions,
  loading,
  page,
  size,
  total = 0,
  onPageChange,
  onSizeChange,
  onDelete,
  onSearch,
  settings,
}: Props) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });

  const totalPages = Math.max(1, Math.ceil(total / size));
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const selectedSaleItems = selectedTransaction
    ? transactions.filter((transaction) => getSaleGroupKey(transaction) === getSaleGroupKey(selectedTransaction))
    : [];

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    transactions.forEach((transaction) => {
      const key = getSaleGroupKey(transaction);
      groups.set(key, [...(groups.get(key) || []), transaction]);
    });
    return Array.from(groups.values());
  }, [transactions]);

  const createReceiptSale = (transaction: Transaction): ReceiptSale => {
    const saleItems = transactions.filter(
      (item) => getSaleGroupKey(item) === getSaleGroupKey(transaction)
    );
    const normalizedCustomerType = String(transaction.customer_type || '').toLowerCase();
    const isPwd = normalizedCustomerType === 'pwd' || normalizedCustomerType.includes('pwd');
    const isSenior = normalizedCustomerType === 'senior_citizen' || normalizedCustomerType.includes('senior');
    const isProtectedSale = isPwd || isSenior;

    return {
      rows: saleItems.map((item) => ({
        name: item.medicine_name,
        // Receipts need the original VAT-inclusive unit price, not only the
        // discounted transaction price stored in `price`.
        unitPrice: item.gross_amount && item.quantity
          ? item.gross_amount / item.quantity
          : item.price || 0,
        saleUnit: item.sale_unit || 'units',
        unitFactor: item.unit_factor || 1,
        quantity: item.unit_factor ? (item.quantity || 0) / item.unit_factor : item.quantity || 0,
        category: item.category || undefined,
        classification: item.classification || undefined,
        dosageForm: item.dosage_form || undefined,
        discountAmount: item.discount_amount || 0,
        rowTotal: item.total_amount || 0,
        discountEligible: item.discount_eligible ?? (isProtectedSale ? (item.discount_amount || 0) > 0 : true),
      })),
      timestamp: new Date(transaction.created_at),
      receiptNo: transaction.transaction_number || `TX-${transaction.id}`,
      cashReceived: transaction.cash_received ?? transaction.total_amount ?? 0,
      discountType: isPwd ? 'pwd' : isSenior ? 'senior' : 'none',
      customerType: isPwd ? 'pwd' : isSenior ? 'senior_citizen' : 'regular',
      customerName: transaction.customer_name || undefined,
      customerIdNumber: transaction.customer_id_number || undefined,
      eligibleSubtotal: saleItems.reduce((sum, item) => sum + (item.eligible_subtotal ?? 0), 0) || undefined,
      nonEligibleSubtotal: saleItems.reduce((sum, item) => sum + (item.non_eligible_subtotal ?? 0), 0) || undefined,
    };
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className={`h-3 w-3 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <>
      <div className={`${BOX_3D} relative overflow-hidden`}>
        {/* Gradient Accent */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500" />

        {/* Header */}
        <div className="flex flex-col gap-4 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_3px_0_0_rgba(4,120,87,0.3),0_6px_14px_-6px_rgba(5,150,105,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-400">Transaction Register</p>
              <p className="mt-0.5 text-sm text-slate-500 font-medium">
                Sales records and cashier activity
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search transactions..."
                onChange={(event) => onSearch?.(event.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50/50 pl-10 pr-4 text-sm font-semibold text-slate-800 shadow-[0_3px_0_0_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-72"
              />
            </div>
            <select
              value={size}
              onChange={(event) => onSizeChange?.(Number(event.target.value))}
              className="h-11 rounded-xl border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50/50 px-3 text-sm font-bold text-slate-700 shadow-[0_3px_0_0_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              {[10, 25, 50, 100].map((option) => (
                <option key={option} value={option}>{option} per page</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-gradient-to-r from-slate-800 to-slate-900">
              <tr>
                {[
                  { key: 'transaction_number', label: 'Transaction' },
                  { key: 'medicine_name', label: 'Medicine' },
                  { key: 'quantity', label: 'Qty' },
                  { key: 'price', label: 'Unit Price' },
                  { key: 'total_amount', label: 'Total' },
                  { key: 'cashier_name', label: 'Cashier' },
                  { key: 'created_at', label: 'Date' },
                ].map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key)}
                    className="cursor-pointer px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/80 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {column.label}
                      <SortIcon column={column.key} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/80 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                      <p className="text-sm font-semibold text-slate-500">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-slate-100 to-slate-50 shadow-[0_4px_0_0_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-base font-extrabold text-slate-700">No transactions found</p>
                      <p className="text-sm text-slate-400 font-medium">Completed purchases will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedTransactions.map((group, index) => {
                  const transaction = group[0];
                  const totalQuantity = group.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  const totalAmount = group.reduce((sum, item) => sum + (item.total_amount || 0), 0);
                  const medicineNames = group.map((item) => item.medicine_name).join(', ');

                  return (
                  <tr
                    key={transaction.id}
                    className={`group transition-all duration-200 hover:bg-emerald-50/40 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-emerald-100 to-emerald-50 text-[10px] font-black text-emerald-700 border border-emerald-200 shadow-[0_2px_0_0_rgba(5,150,105,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]">
                          #{String(transaction.id).padStart(4, '0')}
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{transaction.transaction_number}</p>
                          <p className="text-[10px] font-bold uppercase text-emerald-600">{transaction.transaction_type || 'Sale'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="min-w-[200px] px-4 py-4">
                      <p className="max-w-[260px] truncate text-sm font-bold text-slate-900" title={medicineNames}>
                        {group.length > 1 ? `${transaction.medicine_name} + ${group.length - 1} more` : transaction.medicine_name}
                      </p>
                      <p className="max-w-[260px] truncate text-[10px] text-slate-400 font-medium" title={medicineNames}>
                        {group.length > 1 ? medicineNames : `SKU #${transaction.medicine_id}`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-1 text-sm font-extrabold text-slate-700 border border-slate-200 shadow-[0_2px_0_0_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
                        {totalQuantity}
                        <span className="text-[10px] font-normal text-slate-400">units</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-600">
                      {group.length > 1 ? 'Multiple' : formatPeso(transaction.price)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="text-sm font-extrabold text-emerald-700">
                        {formatPeso(totalAmount)}
                      </span>
                    </td>
                    <td className="min-w-[160px] px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-black text-white shadow-[0_2px_0_0_rgba(4,120,87,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                          {(transaction.cashier_name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-600">
                          {transaction.cashier_name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{formatDateShort(transaction.created_at)}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(transaction.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(transaction)}
                          className={`${BTN_3D_PRIMARY} px-3.5 py-2 text-[11px]`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptSale(createReceiptSale(transaction))}
                          className={`${BTN_3D_SKY} px-3.5 py-2 text-[11px]`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h12v7H6z" />
                          </svg>
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t-2 border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <span>
              Page <span className="text-slate-900">{page}</span> of{' '}
              <span className="text-slate-900">{totalPages}</span>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span>
              Showing <span className="text-slate-900">{groupedTransactions.length}</span> grouped transaction{groupedTransactions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => onPageChange?.(page - 1)}
              className={`${BTN_3D_PAGINATION} px-4 py-2 text-xs`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => onPageChange?.(pageNum)}
                    className={`${page === pageNum ? BTN_3D_PAGINATION_ACTIVE : BTN_3D_PAGINATION} h-8 w-8 text-xs`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-slate-400 font-bold">...</span>
                  <button
                    type="button"
                    onClick={() => onPageChange?.(totalPages)}
                    className={`${page === totalPages ? BTN_3D_PAGINATION_ACTIVE : BTN_3D_PAGINATION} h-8 w-8 text-xs`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => onPageChange?.(page + 1)}
              className={`${BTN_3D_PAGINATION} px-4 py-2 text-xs`}
            >
              Next
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${BOX_3D} w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200`}>
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-24 w-24 rounded-full bg-white/5 blur-xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-100">Transaction Details</p>
                  <h3 className="mt-1 text-xl font-black">{selectedTransaction.transaction_number}</h3>
                  <p className="text-sm text-emerald-100/80 font-medium mt-0.5">
                    {formatDate(selectedTransaction.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-all"
                  aria-label="Close modal"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {/* Customer & Cashier Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`${BOX_3D_SUBTLE} p-3`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Cashier</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedTransaction.cashier_name || 'Unassigned'}</p>
                </div>
                <div className={`${BOX_3D_SUBTLE} p-3`}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Customer</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{selectedTransaction.customer_name || 'Walk-in'}</p>
                </div>
              </div>

              {/* Item Info */}
              <div className={`${BOX_3D_SUBTLE} border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white p-4`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">Purchased Medicines</p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-[0_1px_0_0_rgba(5,150,105,0.1)]">
                    {selectedSaleItems.length} item{selectedSaleItems.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedSaleItems.map((item) => (
                    <div key={item.id} className={`${BOX_3D_SUBTLE} flex items-center justify-between gap-3 border-emerald-100 px-3 py-2.5`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">{item.medicine_name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {item.quantity} × {formatPeso(item.price)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-extrabold text-emerald-700">
                        {formatPeso(item.total_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t-2 border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-900">{formatPeso(selectedSaleItems.reduce((sum, item) => sum + (item.total_amount || 0), 0))}</span>
                </div>
                {selectedTransaction.cash_received != null && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-500">Cash Received</span>
                    <span className="font-bold text-slate-900">{formatPeso(selectedTransaction.cash_received)}</span>
                  </div>
                )}
                {selectedTransaction.change_amount != null && (
                  <div className={`${BOX_3D_SUBTLE} flex justify-between border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-3`}>
                    <span className="font-extrabold text-emerald-700">Change</span>
                    <span className="text-lg font-extrabold text-emerald-700">
                      {formatPeso(selectedTransaction.change_amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 border-t-2 border-slate-100 bg-slate-50/80 px-6 py-4">
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(selectedTransaction.id);
                    setSelectedTransaction(null);
                  }}
                  className={`${BTN_3D_DANGER} px-4 py-2 text-sm`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Void Transaction
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedTransaction(null)}
                className={`${BTN_3D_PRIMARY} px-6 py-2.5 text-sm`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptSale && (
        <Receipt
          sale={receiptSale}
          settings={settings}
          onPrint={() => window.print()}
          onDone={() => setReceiptSale(null)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation-duration: 0.25s;
          animation-fill-mode: both;
        }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </>
  );
}
