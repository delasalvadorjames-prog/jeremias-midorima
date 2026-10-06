import React, { useState, useEffect } from 'react';
import { useFeedback } from './ui/feedback';
import { TOKEN_KEY } from '../data/constants';

type Supplier = {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  payment_terms?: string;
  is_active: boolean;
  batch_count: number;
};

type Props = {
  onClose?: () => void;
};

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:z-10 placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

export default function SupplierManagement({ onClose }: Props) {
  const { notify } = useFeedback();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    payment_terms: '',
  });

  const API_BASE = 'http://localhost:8000/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/suppliers`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to load suppliers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      payment_terms: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddOrUpdate = async () => {
    if (!formData.name.trim()) {
      notify({
        type: 'warning',
        title: 'Supplier name required',
        message: 'Please enter a supplier name',
      });
      return;
    }

    try {
      setLoading(true);

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_BASE}/settings/suppliers/${editingId}`
        : `${API_BASE}/settings/suppliers`;

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name.trim(),
          contact_person: formData.contact_person.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          country: formData.country.trim() || null,
          payment_terms: formData.payment_terms.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save supplier');
      }

      const result = await response.json();

      if (editingId) {
        setSuppliers(suppliers.map(s => s.id === editingId ? result : s));
        notify({
          type: 'success',
          title: 'Supplier updated',
          message: `${result.name} has been updated`,
        });
      } else {
        setSuppliers([...suppliers, result]);
        notify({
          type: 'success',
          title: 'Supplier added',
          message: `${result.name} has been added`,
        });
      }

      resetForm();
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to save supplier',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings/suppliers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete supplier');
      }

      setSuppliers(suppliers.filter(s => s.id !== id));

      notify({
        type: 'success',
        title: 'Supplier deleted',
        message: `${name} has been removed`,
      });
    } catch (error) {
      notify({
        type: 'error',
        title: 'Failed to delete supplier',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
      payment_terms: supplier.payment_terms || '',
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Supplier Directory
        </h4>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="space-y-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100">
          <h5 className="text-xs font-bold uppercase tracking-wide text-blue-700">
            {editingId ? 'Edit Supplier' : 'Add New Supplier'}
          </h5>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplier Name *
              </span>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="e.g., Generic Pharma Inc"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact Person
              </span>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="e.g., John Doe"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
              <input
                type="email"
                className={INPUT_CLASS}
                placeholder="john@supplier.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
              <input
                type="tel"
                className={INPUT_CLASS}
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</span>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</span>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="e.g., Manila"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Country</span>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="e.g., Philippines"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment Terms
              </span>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="e.g., Net 30"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={loading}
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={resetForm}
              disabled={loading}
              className="rounded-lg bg-slate-300 text-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-400 disabled:opacity-60"
              onPointerDown={(e) => e.stopPropagation()}
            >
              Cancel
            </button>
            <button
              onClick={handleAddOrUpdate}
              disabled={loading}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {loading ? 'Saving...' : editingId ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      )}

      {/* Suppliers List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <h5 className="text-xs font-bold uppercase tracking-wide text-slate-600">Active Suppliers</h5>
        {loading && !suppliers.length ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500">Loading suppliers...</div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">No suppliers yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-900">{supplier.name}</h5>
                    {supplier.contact_person && (
                      <p className="text-xs text-slate-600">{supplier.contact_person}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(supplier)}
                      disabled={loading}
                      className="rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 disabled:opacity-60"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id, supplier.name)}
                      disabled={loading || supplier.batch_count > 0}
                      className="rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      title={
                        supplier.batch_count > 0
                          ? 'Cannot delete supplier with batches'
                          : 'Delete supplier'
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 mb-2">
                  {supplier.email && (
                    <div>
                      <span className="font-semibold">Email:</span> {supplier.email}
                    </div>
                  )}
                  {supplier.phone && (
                    <div>
                      <span className="font-semibold">Phone:</span> {supplier.phone}
                    </div>
                  )}
                  {supplier.city && (
                    <div>
                      <span className="font-semibold">City:</span> {supplier.city}
                    </div>
                  )}
                  {supplier.payment_terms && (
                    <div>
                  <span className="font-semibold">Terms:</span> {supplier.payment_terms}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                  <span>{supplier.batch_count} batch(es) in stock</span>
                  <span>{supplier.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
