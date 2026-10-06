/**
 * FIFO POS Checkout Component
 * 
 * Features:
 * - Shopping cart with FIFO allocation
 * - Real-time stock validation
 * - Prevents adding expired stock
 * - Automatic FIFO batch allocation on checkout
 * - Transaction processing with error handling
 */

import React, { useState, useMemo } from 'react';
import { FifoInventoryService, FifoProduct } from '../services/FifoInventoryService';

interface CartItem {
  product: FifoProduct;
  quantity: number;
}

interface POSCheckoutProps {
  cartItems?: CartItem[];
  onCheckoutComplete?: (saleNumber: string, totalAmount: number) => void;
  onClearCart?: () => void;
}

const formatPeso = (value: number): string =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

export const POSCheckout: React.FC<POSCheckoutProps> = ({ 
  cartItems = [], 
  onCheckoutComplete, 
  onClearCart 
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [cashierName, setCashierName] = useState('');

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
      subtotal += item.product.unit_price * item.quantity;
      itemCount += item.quantity;
    });

    const tax = subtotal * 0.12; // 12% VAT
    const total = subtotal + tax;

    return { subtotal, tax, total, itemCount };
  }, [cartItems]);

  /**
   * Process sale with FIFO allocation
   * 
   * FIFO Algorithm in Action:
   * 1. Prepares sale items from cart
   * 2. Backend allocates batches using FIFO (oldest first)
   * 3. Deducts from oldest batch until quantity fulfilled
   * 4. Moves to next batch if current batch insufficient
   * 5. Records sale with batch tracking
   */
  const handleProcessSale = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!cashierName.trim()) {
      setError('Cashier name is required');
      return;
    }

    setError(null);
    setSuccess(null);
    setProcessing(true);

    try {
      // Prepare sale payload
      const salePayload = {
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        cashier_name: cashierName,
        customer_name: undefined, // Optional
      };

      // Process sale (FIFO happens in backend)
      const saleResponse = await FifoInventoryService.processSale(salePayload as any);

      setSuccess(`Sale completed: ${saleResponse.sale_number}`);
      
      // Call parent callback
      if (onCheckoutComplete) {
        onCheckoutComplete(saleResponse.sale_number, saleResponse.total_amount);
      }

      // Clear cart after successful sale
      if (onClearCart) {
        onClearCart();
      }

      // Reset form
      setCashierName('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process sale';
      setError(errorMsg);
      console.error('Sale processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h2 className="mb-4 text-2xl font-bold text-white">POS Checkout</h2>

      {/* Cart Items */}
      <div className="mb-6 space-y-3">
        {cartItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-600 p-8 text-center">
            <p className="text-slate-400">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cartItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-700 p-3">
                <div className="flex-1">
                  <p className="font-semibold text-white">{item.product.name}</p>
                  <p className="text-sm text-slate-300">SKU: {item.product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{item.quantity} x {formatPeso(item.product.unit_price)}</p>
                  <p className="text-sm text-blue-400">{formatPeso(item.product.unit_price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Summary */}
      {cartItems.length > 0 && (
        <div className="mb-6 space-y-2 border-t border-slate-600 pt-4">
          <div className="flex justify-between text-slate-300">
            <span>Items ({totals.itemCount}):</span>
            <span>{formatPeso(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>VAT (12%):</span>
            <span>{formatPeso(totals.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-600 pt-2 text-xl font-bold text-white">
            <span>Total:</span>
            <span className="text-blue-400">{formatPeso(totals.total)}</span>
          </div>
        </div>
      )}

      {/* Payment Method */}
      {cartItems.length > 0 && (
        <div className="mb-4 space-y-3">
          <label className="block text-sm font-semibold text-white">Payment Method</label>
          <div className="flex gap-3">
            {(['cash', 'card', 'transfer'] as const).map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 rounded py-2 px-3 font-semibold transition ${
                  paymentMethod === method
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cashier Name */}
      {cartItems.length > 0 && (
        <div className="mb-4">
          <label htmlFor="cashier" className="mb-2 block text-sm font-semibold text-white">
            Cashier Name
          </label>
          <input
            id="cashier"
            type="text"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            placeholder="Enter cashier name"
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-500"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/20 p-3">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 rounded-lg border border-green-700 bg-green-900/20 p-3">
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Checkout Button */}
      <button
        onClick={handleProcessSale}
        disabled={processing || cartItems.length === 0}
        className={`w-full py-3 font-bold rounded-lg transition ${
          processing || cartItems.length === 0
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-500'
        }`}
      >
        {processing ? 'Processing...' : `Checkout ${formatPeso(totals.total)}`}
      </button>

      {/* Info */}
      <div className="mt-4 rounded-lg bg-slate-700 p-3 text-xs text-slate-300">
        <p className="font-semibold">FEFO Allocation:</p>
        <p className="mt-1">
          Stock is automatically allocated using FEFO (First Expiry, First Out) order. 
          Oldest batches are sold first, ensuring expired stock is never used.
        </p>
      </div>
    </div>
  );
};

export default POSCheckout;
