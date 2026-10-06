import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Medicine } from '../types';
import { getExpiryDays } from '../lib/inventory';
import { getStrengthForDisplay, getVolumeForDisplay } from '../lib/productAttributes';

type Props = {
  medicine: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function ViewProductModal({ medicine, isOpen, onClose }: Props) {
  // Always call hooks in the same order — compute supplies even when modal is closed.
  const supplies = useMemo(() => (medicine?.supplies ?? []), [medicine?.supplies]);

  const totalStock = useMemo(
    () => supplies.reduce((sum, s) => sum + (s.quantity || 0), 0),
    [supplies]
  );

  const expiryStatus = useMemo(() => {
    if (supplies.length === 0) return { label: 'N/A', tone: 'muted' };

    const daysLeft = supplies
      .map(s => getExpiryDays(s.expiry_date?.toString()))
      .filter((d): d is number => d !== null);

    if (daysLeft.length === 0) return { label: 'Unknown', tone: 'muted' };

    const minDays = Math.min(...daysLeft);

    if (minDays < 0) return { label: 'Expired', tone: 'danger' };
    if (minDays <= 60) return { label: 'Expiring Soon', tone: 'warning' };
    return { label: 'Good', tone: 'safe' };
  }, [supplies]);

  const getExpiryTone = (expiry: string | undefined) => {
    if (!expiry) return 'muted';
    const daysLeft = getExpiryDays(expiry);
    if (daysLeft === null) return 'muted';
    if (daysLeft < 0) return 'danger';
    if (daysLeft <= 60) return 'warning';
    return 'safe';
  };

  const getExpiryText = (expiry: string | undefined) => {
    if (!expiry) return 'Unknown';
    const daysLeft = getExpiryDays(expiry);
    if (daysLeft === null) return 'Unknown date';
    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Expires today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  if (!isOpen || !medicine) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl rounded-2xl border border-emerald-200 bg-white shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-sky-50 px-6 py-4 gap-4">
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-600">Product Details</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">{medicine.name}</h3>
            <p className="mt-1 text-xs text-slate-500">View complete stock history and supply information</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-600 mt-1"
            title="Close modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Product Information Cards */}
          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">Product Code</p>
              <p className="mt-2 text-lg font-bold text-sky-900 font-mono">{medicine.product_code || `ID-${medicine.id}`}</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Total Stock</p>
              <p className="mt-2 text-lg font-bold text-emerald-900">{totalStock} <span className="text-xs font-normal">units</span></p>
            </div>

            <div className={`rounded-xl border p-3 ${
              expiryStatus.tone === 'danger'
                ? 'border-rose-200 bg-rose-50'
                : expiryStatus.tone === 'warning'
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                expiryStatus.tone === 'danger'
                  ? 'text-rose-600'
                  : expiryStatus.tone === 'warning'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}>Expiry Status</p>
              <p className={`mt-2 text-lg font-bold ${
                expiryStatus.tone === 'danger'
                  ? 'text-rose-900'
                  : expiryStatus.tone === 'warning'
                  ? 'text-amber-900'
                  : 'text-emerald-900'
              }`}>{expiryStatus.label}</p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">Classification</p>
              <p className="mt-2 text-lg font-bold text-violet-900">{medicine.classification || 'Generic'}</p>
            </div>
          </div>

          {/* Medicine Details */}
          <div className="border-t border-slate-200 px-6 py-4">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Medicine Details</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Medicine Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{medicine.medicine_name || medicine.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Dosage Form</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{medicine.dosage_form || 'Tablet'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Strength</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{getStrengthForDisplay(medicine) || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Volume</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{getVolumeForDisplay(medicine) || '—'}</p>
              </div>
              {medicine.manufacturer && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Manufacturer</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{medicine.manufacturer}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Category</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{medicine.category}</p>
              </div>
            </div>
          </div>

          {/* Supply History Table */}
          <div className="border-t border-slate-200 px-6 py-4">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Supply History ({supplies.length} batch{supplies.length !== 1 ? 'es' : ''})</h4>
            
            {supplies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No supply history found for this medicine.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Batch Number</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">Quantity</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Supplier</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Expiry Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">Unit Cost</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">Selling Price</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {supplies.map((supply) => {
                      const expiryTone = getExpiryTone(supply.expiry_date?.toString());
                      return (
                        <tr key={supply.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 font-mono">
                              {supply.batch_number}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-900">{supply.quantity}</td>
                          <td className="px-3 py-2 text-slate-600">{supply.supplier || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 font-semibold">{supply.expiry_date?.toString() || '—'}</span>
                              {supply.expiry_date && (
                                <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  expiryTone === 'danger' ? 'bg-rose-50 text-rose-600' :
                                  expiryTone === 'warning' ? 'bg-amber-50 text-amber-600' :
                                  'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {getExpiryText(supply.expiry_date?.toString())}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-bold ${
                              expiryTone === 'danger' ? 'border border-rose-200 bg-rose-50 text-rose-700' :
                              expiryTone === 'warning' ? 'border border-amber-200 bg-amber-50 text-amber-700' :
                              'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}>
                              {expiryTone === 'danger' ? 'Expired' :
                               expiryTone === 'warning' ? 'Expiring' :
                               'Good'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-900">₱{(supply.unit_cost || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-900">₱{(supply.selling_price || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-slate-600 text-[11px]">
                            {supply.created_at ? new Date(supply.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {supplies.length > 0 && (
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Summary</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Average Unit Cost</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    ₱{(supplies.reduce((sum, s) => sum + (s.unit_cost || 0), 0) / supplies.length).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Average Selling Price</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    ₱{(supplies.reduce((sum, s) => sum + (s.selling_price || 0), 0) / supplies.length).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Inventory Value</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    ₱{supplies.reduce((sum, s) => sum + (s.selling_price || 0) * s.quantity, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
