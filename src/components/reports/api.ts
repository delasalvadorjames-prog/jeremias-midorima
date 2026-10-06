// ─── Fetch helpers for all Reports API endpoints ────────────────────────────
import {
  DashboardStats,
  ForecastData,
  InventoryItem,
  PaymentMethodItem,
  PurchasePeriod,
  StockMovementItem,
  SalesData,
  TopProduct,
  BIRReport,
} from './types';
import { API_BASE } from '../../data/constants';

const REPORTS_API_BASE = API_BASE;

async function apiFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${REPORTS_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const token = localStorage.getItem('five_l_token') || localStorage.getItem('token') || '';
  const resp = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

type FilterParams = {
  date_from?:      string;
  date_to?:        string;
  month?:          string;
  year?:           string;
  category?:       string;
  payment_method?: string;
  supplier?:       string;
  search?:         string;
  customer_type?: string;
  vat_type?:       string;
  group_by?:       'day' | 'month';
  movement_type?:  string;
  critical_stock_threshold?: number;
  low_stock_threshold?: number;
  expiry_alert_days?: number;
  non_medicine_critical_stock_threshold?: number;
  non_medicine_low_stock_threshold?: number;
  non_medicine_expiry_alert_days?: number;
  include_expired?: boolean;
};

export const fetchDashboard  = (p?: FilterParams) => apiFetch<DashboardStats>('/reports/dashboard', p as any);
export const fetchSales      = (p?: FilterParams) => apiFetch<SalesData>('/reports/sales', p as any);
export const fetchInventory  = (p?: FilterParams) => apiFetch<InventoryItem[]>('/reports/inventory', p as any);
export const fetchInventoryAdjustments = (adjustmentType: 'damages' | 'expired' | 'count_correction', p?: FilterParams) =>
  apiFetch<InventoryItem[]>('/reports/inventory-adjustments', { ...p, adjustment_type: adjustmentType } as any);
export const fetchStockMovements = (p?: FilterParams) => apiFetch<StockMovementItem[]>('/reports/inventory-movements', p as any);
export const fetchTopProducts = (p?: FilterParams & { limit?: number }) => apiFetch<TopProduct[]>('/reports/top-products', p as any);
export const fetchPaymentMethods = (p?: FilterParams) => apiFetch<PaymentMethodItem[]>('/reports/payment-methods', p as any);
export const fetchPurchases  = (p?: FilterParams) => apiFetch<PurchasePeriod[]>('/reports/purchases', p as any);
export const fetchForecast   = (p?: { category?: string; months_ahead?: number }) => apiFetch<ForecastData>('/reports/forecast', p as any);
export const fetchBIRReport  = (p?: FilterParams) => apiFetch<BIRReport>('/reports/bir', p as any);
