import React, { useEffect, useMemo, useState } from 'react';
import { Medicine } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  medicines: Medicine[];
  onCreate: (payload: {
    medicine_id: number;
    quantity: number;
    price: number;
    customer_name?: string;
    cashier_name?: string;
    payment_method?: string;
  }) => Promise<void>;
}

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

export default function AddTransactionModal({ open, onClose, medicines, onCreate }: Props) {
  const [medicineId, setMedicineId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [customer, setCustomer] = useState<string>('');
  const [payment, setPayment] = useState<string>('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setMedicineId('');
      setQuantity(1);
      setPrice(0);
      setCustomer('');
      setPayment('Cash');
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  const selected = useMemo(() => medicines.find((m) => m.id === medicineId), [medicineId, medicines]);

  useEffect(() => {
    if (selected) setPrice(selected.unitPrice || 0);
  }, [selected]);

  const total = quantity * price;

  async function handleSubmit() {
    setError('');
    if (!medicineId) {
      setError('Please select a medicine.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (selected && quantity > (selected.stock || 0)) {
      setError('Quantity exceeds available stock.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        medicine_id: medicineId as number,
        quantity,
        price,
        customer_name: customer || undefined,
        payment_method: payment,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to create transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-600">Manual Entry</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">New Transaction</h3>
            <p className="mt-1 text-sm text-slate-500">Create a sale record and deduct inventory stock.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-white hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Medicine</span>
            <select
              value={medicineId}
              onChange={(event) => setMedicineId(Number(event.target.value))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="">Select medicine</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} - stock: {medicine.stock}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Quantity</span>
              <input
                type="number"
                min="1"
                max={selected?.stock || undefined}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, parseInt(event.target.value || '1', 10)))}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Unit Price</span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(event) => setPrice(parseFloat(event.target.value || '0'))}
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Customer</span>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Optional"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Payment Method</span>
              <select
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="GCash">GCash</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total Amount</span>
              <span className="text-2xl font-black text-emerald-700">{formatPeso(total)}</span>
            </div>
            {selected && (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Available stock after sale: {Math.max(0, (selected.stock || 0) - quantity)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
