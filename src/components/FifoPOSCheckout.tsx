import React, { useEffect, useMemo, useState } from 'react';
import { FifoInventoryService, FifoProduct } from '../services/FifoInventoryService';

type CartRow = {
  product: FifoProduct;
  quantity: number;
  validation: 'idle' | 'checking' | 'valid' | 'invalid';
  message: string;
};

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);

export default function FifoPOSCheckout() {
  const [products, setProducts] = useState<FifoProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await FifoInventoryService.listProducts();
      setProducts(rows);
      setSelectedProductId((current) => current || String(rows.find((row) => row.available_stock > 0)?.id || rows[0]?.id || ''));
    } catch (err: any) {
      setError(err?.message || 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(selectedProductId)) || null,
    [products, selectedProductId],
  );

  const total = useMemo(
    () => cart.reduce((sum, row) => sum + row.product.unit_price * row.quantity, 0),
    [cart],
  );

  const validateQuantity = async (product: FifoProduct, requestedQuantity: number) => {
    const availability = await FifoInventoryService.getAvailableStock(product.id);
    if (availability.available_stock <= 0) {
      return { valid: false, message: 'OUT OF STOCK. Only expired or empty batches exist.' };
    }
    if (requestedQuantity > availability.available_stock) {
      return { valid: false, message: `Only ${availability.available_stock} non-expired units available.` };
    }
    return { valid: true, message: `${availability.available_stock} non-expired units available.` };
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    setError('');
    setMessage('');

    const requestedQuantity = Math.max(1, Math.floor(quantity || 1));
    const result = await validateQuantity(selectedProduct, requestedQuantity);
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setCart((current) => {
      const existing = current.find((row) => row.product.id === selectedProduct.id);
      if (!existing) {
        return [...current, { product: selectedProduct, quantity: requestedQuantity, validation: 'valid', message: result.message }];
      }
      return current.map((row) =>
        row.product.id === selectedProduct.id
          ? { ...row, quantity: row.quantity + requestedQuantity, validation: 'idle', message: 'Recheck before checkout.' }
          : row,
      );
    });
    setQuantity(1);
  };

  const handleCartQuantityChange = async (productId: number, nextQuantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(nextQuantity || 1));
    setCart((current) =>
      current.map((row) =>
        row.product.id === productId
          ? { ...row, quantity: safeQuantity, validation: 'checking', message: 'Checking stock...' }
          : row,
      ),
    );

    const row = cart.find((item) => item.product.id === productId);
    if (!row) return;
    const result = await validateQuantity(row.product, safeQuantity);
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, validation: result.valid ? 'valid' : 'invalid', message: result.message }
          : item,
      ),
    );
  };

  const handleCheckout = async () => {
    if (!cart.length || checkoutLoading) return;
    setCheckoutLoading(true);
    setError('');
    setMessage('');

    try {
      for (const row of cart) {
        const result = await validateQuantity(row.product, row.quantity);
        if (!result.valid) throw new Error(`${row.product.name}: ${result.message}`);
      }

      const sale = await FifoInventoryService.processSale({
        items: cart.map((row) => ({
          product_id: row.product.id,
          quantity: row.quantity,
          unit_price: row.product.unit_price,
        })),
      });

      setMessage(`Sale ${sale.sale_number} completed. Total: ${formatPeso(sale.total_amount)}`);
      setCart([]);
      await loadProducts();
    } catch (err: any) {
      setError(err?.message || 'Unable to process sale.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-slate-900">FEFO POS Checkout</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Sales use oldest non-expired batches first.</p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}
      {message && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</div>}

      <div className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Product</span>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            disabled={loading}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id} disabled={product.available_stock <= 0}>
                {product.name} - {product.available_stock <= 0 ? 'OUT OF STOCK' : `${product.available_stock} available`}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Qty</span>
          <input
            type="number"
            min="1"
            max={selectedProduct?.available_stock || 1}
            value={quantity}
            disabled={!selectedProduct || selectedProduct.available_stock <= 0}
            onChange={(event) => setQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          />
        </label>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedProduct || selectedProduct.available_stock <= 0}
          className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Add
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Validation</th>
              <th className="px-4 py-3">Line Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-semibold text-slate-400">Cart is empty.</td>
              </tr>
            ) : (
              cart.map((row) => (
                <tr key={row.product.id}>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{row.product.name}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{row.product.available_stock}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(event) => handleCartQuantityChange(row.product.id, Number(event.target.value))}
                      className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-center font-bold outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className={`px-4 py-3 font-bold ${row.validation === 'invalid' ? 'text-rose-700' : 'text-slate-500'}`}>
                    {row.message || 'Ready'}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-slate-900">{formatPeso(row.product.unit_price * row.quantity)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setCart((current) => current.filter((item) => item.product.id !== row.product.id))}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 p-4">
        <p className="text-lg font-extrabold text-slate-900">Total: {formatPeso(total)}</p>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!cart.length || checkoutLoading || cart.some((row) => row.validation === 'invalid')}
          className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {checkoutLoading ? 'Processing...' : 'Process Sale'}
        </button>
      </div>
    </section>
  );
}
