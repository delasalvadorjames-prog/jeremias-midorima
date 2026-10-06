import { TabId } from '../types';

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.REACT_APP_API_BASE ||
  // The local FastAPI server runs on 127.0.0.1. Using this explicit host
  // avoids localhost resolving to ::1 on macOS while the API is IPv4-only.
  'http://127.0.0.1:8000';
export const TOKEN_KEY = 'five_l_token';
export const ROLE_KEY = 'five_l_user_role';
export const ASSIGNED_CATEGORY_KEY = 'five_l_assigned_category';

export const STAFF_TAB_IDS: TabId[] = ['dashboard', 'product', 'inventory', 'transactions', 'alerts'];

export const SIDEBAR_TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'product', label: 'Point of Sales' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'staff', label: 'Staff' },
  { id: 'insights', label: 'Insights' },
  { id: 'reports', label: 'Reports' },
];
export const DEFAULT_CATEGORIES = [
  'Pain Relief',
  'Antibiotic',
  'Anti-Inflammatory',
  'Blood Pressure',
  'Diabetes',
  'Vitamins',
  'Allergy',
  'Cough & Cold',
];
