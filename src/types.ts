export type TabId = 'dashboard' | 'product' | 'alerts' | 'inventory' | 'staff' | 'insights' | 'reports' | 'transactions' | 'fifo'
export type AuthMode = 'login' | 'signup';
export type UserRole = 'admin' | 'staff';
export type AlertFilter = 'all' | 'critical_stock' | 'low_stock' | 'expiring_soon' | 'expired' | 'healthy';

export interface StaffPermissions {
  can_process_pos: boolean;
  can_view_reports: boolean;
  can_adjust_inventory: boolean;
  can_approve_voids: boolean;
}

export interface SalesPoint {
  label: string;
  value: number;
  projected?: number;
}

export interface MedicineSupply {
  id: number;
  medicine_id: number;
  batch_number: string;
  quantity: number;
  supplier?: string;
  received_date?: string;
  expiry_date: string;
  unit_cost: number;
  selling_price: number;
  created_at?: string;
  isArchived?: boolean;
}

export interface Medicine {
  id: number;
  name: string;
  category: string;
  stock: number;
  reorderLevel?: number;
  expiry: string;
  avgDailySales?: number;
  unitPrice?: number;
  supplier?: string;
  added_by?: number;
  updated_by?: number;
  assigned_staff?: number;
  created_at?: string;
  updated_at?: string;
  last_restocked_at?: string;
  is_new_arrival?: boolean;
  product_code?: string;
  medicine_name?: string;
  classification?: 'generic' | 'branded';
  dosage_form?: string;
  low_stock_threshold?: number | null;
  expiry_alert_days?: number | null;
  strength?: string;
  volume?: string;
  manufacturer?: string;
  baseUnit: 'pcs' | 'box' | 'strip' | 'bottle' | 'vial' | 'tube' | 'sachet';
  purchaseUnit: string;
  conversionFactor: number;
  unitType: string;
  supplies?: MedicineSupply[];
  is_promo?: boolean;
  promo_discount?: number;
  promo_label?: string;
  isArchived?: boolean; // Add this
}

export type DosageFormFilter = 'all' | 'tablet' | 'capsule' | 'syrup' | 'suspension' | 'injectable' | 'cream' | 'ointment' | 'drops' | 'other' | 'promo';

export interface CustomPromo {
  medicineId: number;
  medicineName: string;
  discountPercent: number;
  promoPrice?: number;
  promoLabel: string;
  badgeText: string;
  isActive: boolean;
  createdAt?: string;
  startDate?: string;
  endDate?: string;   
}

export interface PredictiveRow extends Medicine {
  daysLeft: number;
  suggestedRestock: number;
}

export interface MedicineAuditLog {
  id: number;
  action_type: string;
  medicine_name: string;
  performed_by: string;
  role: string;
  timestamp: string;
  old_value: string | null;
  new_value: string | null;
}

export interface PriceUpdateRequest {
  id: number;
  medicine_name?: string;
  requested_by?: string;
  current_price?: number;
  requested_price?: number;
  inventory_id?: number;
  old_price?: number;
  new_price?: number;
  updated_by?: string;
  status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  reason?: string;
  remarks?: string | null;
  created_at?: string;
  adjustment_type?: 'damages' | 'count_correction' | 'expired' | null;
  old_quantity?: number | null;
  new_quantity?: number | null;
}

export interface AdminAlert {
  id: number;
  alert_type: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface AdminDashboardStats {
  total_medicines: number;
  low_stock_count: number;
  expired_count: number;
  nearing_expiry_count: number;
  total_medicines_by_staff: Array<{ staff_name: string; email: string; count: number }>;
  most_active_staff: string;
  recent_activities: MedicineAuditLog[];
  timeline: Array<{
    type: 'movement' | 'sale';
    action: string;
    medicine_name: string;
    quantity: number;
    timestamp: string;
    total?: number;
  }>;
  expiration_panel: Array<{
    id: number;
    name: string;
    expiry: string;
    days_left: number;
    status: 'expired' | 'critical' | 'warning' | 'healthy';
    stock: number;
    category: string;
  }>;
  low_stock_panel: Array<{
    id: number;
    name: string;
    stock: number;
    reorder_level: number;
    status: 'critical' | 'warning';
    category: string;
  }>;
  all_medicines_with_meta: Array<{
    id: number;
    name: string;
    category: string;
    stock: number;
    reorder_level: number;
    expiry: string;
    avg_daily_sales: number;
    unit_price: number;
    supplier: string | null;
    created_at: string | null;
    updated_at: string | null;
    last_restocked_at: string | null;
    added_by_name: string;
    added_by_email: string;
    updated_by_name: string | null;
    assigned_staff_name: string | null;
    assigned_staff_email: string | null;
  }>;
}


export interface PharmacySettings {
  pharmacyName: string;
  branchName: string;
  licenseNumber: string;
  tin: string;
  address: string;
  contactNumber: string;
  contactEmail: string;
  birCompliance: boolean;
  vatRate: number;
  operatingHours: string;
  criticalStockAlertUnits: number;
  lowStockAlertUnits: number;
  shelfLifeDays: number;
  expiryAlertDays: number;
  nonMedicineCriticalStockAlertUnits: number;
  nonMedicineLowStockAlertUnits: number;
  nonMedicineShelfLifeDays: number;
  nonMedicineExpiryAlertDays: number;
  nonMedicineExpiryNotifications: boolean;
  autoReorder: boolean;
  reorderLeadDays: number;
  requireAdminOtp: boolean;
  expiryNotificationHours: number;
}

export type ProductSaleItem = {
  medicineId: number;
  quantity: number;
  unitPrice: number;
  grossUnitPrice?: number;
  discountAmount?: number;
  seniorCitizenDiscount?: number;
  customerType?: 'regular' | 'senior_citizen' | 'pwd';
  customerId?: number;
  customerName?: string;
  customerIdNumber?: string;
  discountEligible?: boolean;
  eligibleSubtotal?: number;
  nonEligibleSubtotal?: number;
  saleUnit?: string;
  unitFactor?: number;
  category?: string;
  classification?: string;
  dosageForm?: string;
};

export type CustomerType = 'senior_citizen' | 'pwd';
export interface CustomerRecord {
  id: number;
  customer_type: CustomerType;
  id_number: string;
  full_name: string;
  status: 'active' | 'inactive';
  registered_by?: string | null;
  date_registered: string;
  updated_at: string;
}
export type ProductSaleEntry = {
  id: string;
  units: number;
  total: number;
  timestamp: string;
  items?: ProductSaleItem[];
};

export interface InventoryStatusCounts {
  all: number; healthy: number; low_stock: number; critical_stock: number; expiring_soon: number; not_for_sale?: number; expired: number;
}

export interface StaffMember {
  id: number;
  identifier: string;
  full_name: string;
  role: UserRole;
  assigned_category?: string | null;
  account_status?: 'active' | 'disabled' | 'suspended';
  can_process_pos?: boolean;
  can_view_reports?: boolean;
  can_adjust_inventory?: boolean;
  can_approve_voids?: boolean;
  last_login?: string | null;
  created_at: string;
}

export interface StaffCreatePayload {
  full_name: string;
  identifier: string;
  password: string;
  assigned_category: string;
}

export interface Transaction {
  id: number;
  transaction_number: string;
  sale_reference?: string | null;
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  customer_name?: string | null;
  customer_id?: number | null;
  customer_id_number?: string | null;
  discount_eligible?: boolean | null;
  eligible_subtotal?: number | null;
  non_eligible_subtotal?: number | null;
  sale_unit?: string | null;
  unit_factor?: number | null;
  category?: string | null;
  classification?: string | null;
  dosage_form?: string | null;
  cashier_name?: string | null;
  payment_method?: string | null;
  transaction_type: string;
  cash_received?: number | null;
  change_amount?: number | null;
  customer_type?: string | null;
  gross_amount?: number | null;
  vatable_sales?: number | null;
  vat_amount?: number | null;
  vat_exempt_sales?: number | null;
  discount_amount?: number | null;
  senior_citizen_discount?: number | null;
  pwd_discount?: number | null;
  other_discount?: number | null;
  net_sales?: number | null;
  created_at: string;
}
