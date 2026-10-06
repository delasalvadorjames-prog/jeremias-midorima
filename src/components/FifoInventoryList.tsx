import React, { useEffect, useMemo, useState } from 'react';
import { FifoInventoryService, FifoProduct } from '../services/FifoInventoryService';

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);

export default function FifoInventoryList() {
  const [products, setProducts] = useState<FifoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      setProducts(await FifoInventoryService.listProducts());
    } catch (err: any) {
      setError(err?.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.sku, product.name, product.category]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [products, query]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">FEFO Inventory</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Available stock excludes expired batches.</p>
        </div>
        <button
          type="button"
          onClick={loadProducts}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search SKU, product, or category"
        className="mb-4 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-400">Loading inventory...</td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-400">No products found.</td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const outOfStock = product.available_stock <= 0;
                return (
                  <tr key={product.id} className="bg-white">
                    <td className="px-4 py-3 font-bold text-slate-600">{product.sku}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-500">{product.category || 'Uncategorized'}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{product.available_stock}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{formatPeso(product.unit_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${outOfStock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                          {outOfStock ? 'OUT OF STOCK' : 'AVAILABLE'}
                        </span>
                        {product.near_expiry_count > 0 && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">
                            {product.near_expiry_count} near expiry
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
