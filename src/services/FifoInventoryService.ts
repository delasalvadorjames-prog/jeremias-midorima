import { API_BASE } from '../data/constants';

export type FifoProduct = {
  id: number;
  sku: string;
  name: string;
  category?: string | null;
  unit_price: number;
  available_stock: number;
  status: 'AVAILABLE' | 'OUT_OF_STOCK';
  near_expiry_count: number;
  nearest_expiry_date?: string | null;
  source?: 'fifo' | 'medicine';
};

export type FifoBatch = {
  id: number;
  product_id: number;
  quantity: number;
  remaining_quantity: number;
  received_date: string;
  expiry_date: string;
  supplier?: string | null;
  batch_reference?: string | null;
  is_removed: boolean;
};

export type FifoSaleItem = {
  product_id: number;
  batch_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type FifoSaleResponse = {
  sale_id: number;
  sale_number: string;
  total_amount: number;
  items: FifoSaleItem[];
};

const authHeaders = () => {
  const token = localStorage.getItem('five_l_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    } as HeadersInit,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.detail || 'Request failed');
  }
  return data as T;
};

const toNumber = (value: unknown) => Math.max(0, Number(value) || 0);

const normalizeProduct = (row: any, source: 'fifo' | 'medicine'): FifoProduct => {
  const stock = toNumber(row.available_stock ?? row.stock);
  return {
    id: Number(row.id),
    sku: String(row.sku || row.product_code || `MED-${row.id}`),
    name: String(row.name || row.medicine_name || 'Unnamed product'),
    category: row.category || null,
    unit_price: toNumber(row.unit_price ?? row.unitPrice ?? row.selling_price),
    available_stock: stock,
    status: stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
    near_expiry_count: toNumber(row.near_expiry_count),
    nearest_expiry_date: row.nearest_expiry_date || row.expiry || null,
    source,
  };
};

const listMedicineProducts = async () => {
  const rows = await request<any[]>('/medicines');
  return (Array.isArray(rows) ? rows : []).map((row) => normalizeProduct(row, 'medicine'));
};

const fallbackMedicineSale = async (payload: {
  items: Array<{ product_id: number; quantity: number; unit_price?: number; product_source?: 'fifo' | 'medicine' }>;
  cashier_name?: string;
  customer_name?: string;
}): Promise<FifoSaleResponse> => {
  const saleNumber = `TXN-${Date.now()}`;
  const completed = [];

  for (const item of payload.items) {
    const transaction = await request<any>('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        medicine_id: item.product_id,
        quantity: item.quantity,
        price: item.unit_price || 0,
        cashier_name: payload.cashier_name,
        customer_name: payload.customer_name,
        payment_method: 'cash',
        transaction_type: 'sale',
      }),
    });
    completed.push({ item, transaction });
  }

  return {
    sale_id: Number(completed[0]?.transaction?.id || Date.now()),
    sale_number: completed[0]?.transaction?.transaction_number || saleNumber,
    total_amount: completed.reduce((sum, row) => sum + toNumber(row.transaction?.total_amount ?? row.item.quantity * (row.item.unit_price || 0)), 0),
    items: completed.map((row) => ({
      product_id: row.item.product_id,
      batch_id: 0,
      quantity: row.item.quantity,
      unit_price: row.item.unit_price || 0,
      line_total: toNumber(row.transaction?.total_amount ?? row.item.quantity * (row.item.unit_price || 0)),
    })),
  };
};

export const FifoInventoryService = {
  listProducts: async () => {
    try {
      const rows = await request<any[]>('/products');
      const products = (Array.isArray(rows) ? rows : []).map((row) => normalizeProduct(row, 'fifo'));
      return products.length > 0 ? products : listMedicineProducts();
    } catch (error) {
      return listMedicineProducts();
    }
  },

  getInventory: (productId: number) => request<FifoBatch[]>(`/inventory/${productId}`),

  getAvailableStock: async (productId: number) => {
    try {
      return await request<{ product_id: number; available_stock: number; status: string; near_expiry_count: number; nearest_expiry_date?: string | null }>(
        `/inventory/available/${productId}`,
      );
    } catch (error) {
      const medicine = await request<any>(`/medicines/${productId}`);
      const stock = toNumber(medicine.available_stock ?? medicine.stock);
      return {
        product_id: productId,
        available_stock: stock,
        status: stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
        near_expiry_count: 0,
        nearest_expiry_date: medicine.expiry || null,
      };
    }
  },

  addBatch: (payload: {
    product_id: number;
    quantity: number;
    received_date: string;
    expiry_date: string;
    supplier?: string;
    batch_reference?: string;
    product_source?: 'fifo' | 'medicine';
  }) => {
    if (payload.product_source === 'medicine') {
      return request<any>(`/medicines/${payload.product_id}/supplies`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: payload.quantity,
          expiry_date: payload.expiry_date,
          supplier: payload.supplier || 'Unknown',
          unit_cost: 0,
          selling_price: 0,
          batch_number: payload.batch_reference,
        }),
      }).then((medicine) => ({
        id: Number(medicine?.supplies?.[0]?.id || Date.now()),
        product_id: payload.product_id,
        quantity: payload.quantity,
        remaining_quantity: payload.quantity,
        received_date: payload.received_date,
        expiry_date: payload.expiry_date,
        supplier: payload.supplier,
        batch_reference: payload.batch_reference,
        is_removed: false,
      }));
    }

    return request<FifoBatch>('/inventory/add-batch', { method: 'POST', body: JSON.stringify(payload) });
  },

  processSale: (payload: {
    items: Array<{ product_id: number; quantity: number; unit_price?: number; product_source?: 'fifo' | 'medicine' }>;
    cashier_name?: string;
    customer_name?: string;
  }) => {
    if (payload.items.some((item) => item.product_source === 'medicine')) {
      return fallbackMedicineSale(payload);
    }

    return request<FifoSaleResponse>('/sales/process', { method: 'POST', body: JSON.stringify(payload) });
  },

  removeExpired: () => request<{ removed_batches: number; removed_units: number }>('/inventory/remove-expired', { method: 'POST' }),
};
