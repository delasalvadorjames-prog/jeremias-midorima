// ─── TypeScript interfaces for all Reports API responses ───────────────────

export interface ReportFiltersState {
  reportType: ReportType;
  dateFrom:   string;
  dateTo:     string;
  month:      string;
  year:       string;
  category:   string;
  paymentMethod: string;
  customerType: string;
  vatType: string;
  supplier:   string;
  search:     string;
}

export type ReportType =
  | 'sales'
  | 'inventory'
  | 'low_stock'
  | 'transactions'
  | 'purchases'
  | 'top_selling'
  | 'expiring'
  | 'damages'
  | 'expired'
  | 'count_correction'
  | 'inventory_movement'
  | 'bir'
  | 'customer_records';

// Dashboard summary
export interface DashboardStats {
  total_revenue:       number;
  total_transactions:  number;
  total_products_sold: number;
  out_of_stock:        number;
  low_stock:           number;
  expiring_medicines:  number;
}

// Sales endpoint
export interface MonthlySalesPoint {
  period:       string; // 'YYYY-MM'
  revenue:      number;
  transactions: number;
  units:        number;
}

export interface CategorySalesPoint {
  category: string;
  revenue:  number;
  units:    number;
}

export interface SalesData {
  monthly:     MonthlySalesPoint[];
  by_category: CategorySalesPoint[];
}

// Inventory endpoint
export interface InventoryItem {
  id:            number;
  medicine_name: string;
  volume?:       string | null;
  strength?:     string | null;
  dosage_form?:  string | null;
  product_code?: string | null;
  category:      string;
  stock:         number;
  reorder_level: number;
  expiry:        string | null;
  unit_price:    number;
  supplier:      string | null;
  status:        'Healthy' | 'Critical Stock' | 'Low Stock' | 'Out of Stock' | 'Expired' | 'Expiring Soon';
  days_left:     number | null;
  stock_value:   number;
  adjustment_type?: 'damages' | 'expired' | 'count_correction';
  adjustment_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  adjusted_by?: string;
  adjusted_at?: string | null;
  details?: string;
}

export interface StockMovementItem {
  id: number;
  medicine_id: number | null;
  medicine_name: string;
  category: string;
  remaining_quantity: number;
  deducted_quantity: number;
  movement_count: number;
  last_deducted_at: string | null;
}

// Top products endpoint
export interface TopProduct {
  medicine_id:   number;
  medicine_name: string;
  category:      string;
  total_units:   number;
  total_revenue: number;
  avg_price:     number;
}

// Payment methods endpoint
export interface PaymentMethodItem {
  method:    string;
  txn_count: number;
  revenue:   number;
}

// Purchases endpoint
export interface PurchasePeriod {
  period:      string;
  total_units: number;
  total_cost:  number;
  batch_count: number;
}

// Forecast endpoint
export interface ForecastPoint {
  period:  string;
  revenue: number;
  type:    'actual' | 'forecast';
}

export interface ForecastData {
  actuals:  ForecastPoint[];
  forecast: ForecastPoint[];
}

export interface BIRSummary {
  gross_sales: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  senior_citizen_discount: number;
  pwd_discount: number;
  other_discounts: number;
  net_sales: number;
  total_transactions: number;
}

export interface BIRTransaction {
  receipt_invoice_no: string;
  date: string;
  customer_type: string;
  gross_amount: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  discount: number;
  net_sales: number;
  payment_method: string;
}

export interface BIRReport extends BIRSummary {
  transactions: BIRTransaction[];
}
