import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import logo from './assets/Fivel.png';
import { useTheme } from './lib/theme';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPanelView from './components/DashboardPanelView';
import ReportsPanel from './components/ReportsPanel';
import AlertsPanel from './components/AlertsPanel';
import AuthCard from './components/AuthCard';
import StaffDashboardPanel from './components/StaffDashboardPanel';
import StaffPanel from './components/StaffPanel';
import Insights from './components/Insights';
import TransactionPage from './components/TransactionPage';
import InventoryPanel from './components/InventoryPanel';
import ProductPanel from './components/ProductPanel';
import { SIDEBAR_TABS, STAFF_TAB_IDS, TOKEN_KEY, ROLE_KEY, ASSIGNED_CATEGORY_KEY, API_BASE } from './data/constants';
import { TabId, PharmacySettings, AuthMode, Medicine, PredictiveRow, ProductSaleEntry, ProductSaleItem, StaffCreatePayload, StaffMember, UserRole, AdminDashboardStats, AdminAlert, PriceUpdateRequest, DosageFormFilter, MedicineAuditLog, StaffPermissions } from './types';
import { summarizeInventoryStatus } from './lib/inventory';
import { getFifoAvailableStock } from './lib/fifo';
import GoogleCallback from './pages/GoogleCallback';
import StaffLogin from './pages/StaffLogin';
import ProtectedStaffRoute from './ProtectedStaffRoute';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { CURRENT_ACCOUNT_EMAIL_KEY, createEmptyAccountState, loadAccountState, saveAccountState, normalizeAccountEmail } from './lib/accountStorage';
import { GOOGLE_PENDING_SIGNUP_KEY } from './lib/googleAuth';
import { formatPeso } from './lib/format';
import FifoPanel from './components/FifoPanel';
import { createTransaction } from './services/TransactionService';
import { useFeedback } from './components/ui/feedback';
import { loadStaffStatus, removeStaffAccess, saveStaffStatus, saveStaffPermissions, STAFF_ACCESS_CHANGED_EVENT } from './lib/staffPermissions';
import { loadStaffActivityLogs, logStaffActivity, StaffActivityLog, STAFF_ACTIVITY_CHANGED_EVENT } from './lib/activityLog';

const EMPTY_NEW_ITEM = {
  name: '',
  category: '',
  stock: '',
  reorderLevel: '',
  expiry: '',
  avgDailySales: '',
  unitPrice: '',
  supplier: '',
  classification: '',
  dosageForm: '',
  strength: '',
  volume: '',
  manufacturer: '',
  unitType: '',
  conversionFactor: '1',
  lotNumber: '',
  receivedDate: '',
  sellingPrice: '',
};

const parseInventoryNumber = (value: string) => Math.max(0, Number(value) || 0);

const detectDosageForm = (label: string = ''): string => {
  const normalized = (label || '').toLowerCase();
  if (/\b(tablet|tabs?)\b/.test(normalized)) return 'Tablet';
  if (/\b(capsule|cap(s)?)\b/.test(normalized)) return 'Capsule';
  if (/\b(syrup)\b/.test(normalized)) return 'Syrup';
  if (/\b(suspension)\b/.test(normalized)) return 'Suspension';
  if (/\b(injectable|injection|vial|ampule|shot)\b/.test(normalized)) return 'Injectable';
  if (/\b(cream)\b/.test(normalized)) return 'Cream';
  if (/\b(ointment)\b/.test(normalized)) return 'Ointment';
  if (/\b(drops?)\b/.test(normalized)) return 'Drops';
  return 'Tablet';
};

const normalizeMedicine = (medicine: any): Medicine => ({
  ...medicine,
  dosage_form: (medicine.dosage_form || medicine.dosageForm || detectDosageForm(medicine.name || medicine.medicine_name || '')).toString(),
  classification: medicine.classification || 'Generic',
  baseUnit: medicine.base_unit || medicine.baseUnit || 'pcs',
  purchaseUnit: medicine.purchase_unit || medicine.purchaseUnit || medicine.unit_type || 'pcs',
  conversionFactor: Math.max(1, Number(medicine.conversion_factor ?? medicine.conversionFactor) || 1),
  unitType: medicine.unit_type || medicine.unitType || medicine.purchase_unit || 'pcs',
  supplies: Array.isArray(medicine.supplies) ? medicine.supplies.map((supply: any) => ({
    ...supply,
    isArchived: Boolean(supply.is_archived ?? supply.isArchived),
  })) : medicine.supplies,
  isArchived: Boolean(medicine.is_archived ?? medicine.isArchived),
});

const normalizeUserRole = (role?: string | null): UserRole => role === 'admin' ? 'admin' : 'staff';
const canAccessTab = (role: UserRole, tab: TabId) => role === 'admin' || STAFF_TAB_IDS.includes(tab);
const normalizeCategory = (category?: string | null) => (category || '').trim().toLowerCase();
const addDaysToDateInput = (dateInput: string, days: number) => {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + Math.max(1, Number(days) || 365));
  return date.toISOString().slice(0, 10);
};

const DEFAULT_SETTINGS: PharmacySettings = {
  pharmacyName: 'Five L Pharmacy',
  branchName: 'Main Branch',
  licenseNumber: '',
  address: '',
  contactNumber: '',
  contactEmail: '',
  operatingHours: '8:00 AM – 9:00 PM',
  criticalStockAlertUnits: 5,
  lowStockAlertUnits: 20,
  shelfLifeDays: 365,
  expiryAlertDays: 30,
  autoReorder: false,
  reorderLeadDays: 7,
  requireAdminOtp: true,
  expiryNotificationHours: 48,
  tin: '',
  birCompliance: false,
  vatRate: 0,
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const autoGeneratedExpiryRef = useRef('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [canCreateAdmin, setCanCreateAdmin] = useState(false);

  const [forgotStep, setForgotStep] = useState<'none' | 'request' | 'reset'>('none');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setHasAdmin(true);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/auth/setup-status`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || 'Unable to check setup status');
        return data as { has_admin?: boolean; setup_required?: boolean; allow_signup?: boolean; admin_count?: number; max_admins?: number };
      })
      .then((data) => {
        if (cancelled) return;
        // Support both the current setup-status response and the earlier
        // allow_signup response while the backend is being restarted.
        const adminExists = data.has_admin === true || data.allow_signup === false;
        setHasAdmin(adminExists);
        setCanCreateAdmin(data.allow_signup === true || (data.admin_count === undefined && !adminExists));
        const signupRequested = new URLSearchParams(location.search).get('auth') === 'signup';
        setAuthMode(signupRequested && data.allow_signup !== false ? 'signup' : (adminExists ? 'login' : 'signup'));
      })
      .catch(() => {
        // Fail closed: do not expose public signup when setup status is unavailable.
        if (!cancelled) {
          setHasAdmin(true);
          setCanCreateAdmin(false);
          setAuthMode('login');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, location.search]);

  useEffect(() => {
    if (token || new URLSearchParams(location.search).get('auth') !== 'signup') return;

    const pendingSignup = sessionStorage.getItem(GOOGLE_PENDING_SIGNUP_KEY);
    if (!pendingSignup) return;

    try {
      const profile = JSON.parse(pendingSignup) as { email?: string; fullName?: string };
      setEmail(normalizeAccountEmail(profile.email || ''));
      setFullName(profile.fullName || '');
      setAuthMode('signup');
      setAuthError('This Google email is not connected yet. Create your administrator account to continue.');
    } catch {
      sessionStorage.removeItem(GOOGLE_PENDING_SIGNUP_KEY);
    }
  }, [location.search, token]);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const closeSidebarOnMobile = useCallback(() => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'generic' | 'branded'>('all');
  const [dosageFormFilter, setDosageFormFilter] = useState<DosageFormFilter>('all');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(
    () => localStorage.getItem(CURRENT_ACCOUNT_EMAIL_KEY) || localStorage.getItem('userEmail') || ''
  );
  const [currentUserName, setCurrentUserName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(
    () => normalizeUserRole(localStorage.getItem(ROLE_KEY) || localStorage.getItem('userRole'))
  );
  const [currentUserAssignedCategory, setCurrentUserAssignedCategory] = useState<string>(
    () => localStorage.getItem(ASSIGNED_CATEGORY_KEY) || ''
  );
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
    const val = localStorage.getItem('userId');
    return val ? parseInt(val, 10) : null;
  });
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const initialEmail = localStorage.getItem(CURRENT_ACCOUNT_EMAIL_KEY) || localStorage.getItem('userEmail') || '';
    const stored = initialEmail ? loadAccountState(initialEmail, DEFAULT_SETTINGS) : createEmptyAccountState(DEFAULT_SETTINGS);
    return stored.medicines.map(normalizeMedicine);
  });
  const [settings, setSettings] = useState<PharmacySettings>(() => {
    const initialEmail = localStorage.getItem(CURRENT_ACCOUNT_EMAIL_KEY) || localStorage.getItem('userEmail') || '';
    return initialEmail ? loadAccountState(initialEmail, DEFAULT_SETTINGS).settings : createEmptyAccountState(DEFAULT_SETTINGS).settings;
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState('');
  const [salesTrend, setSalesTrend] = useState<ProductSaleEntry[]>(() => {
    const initialEmail = localStorage.getItem(CURRENT_ACCOUNT_EMAIL_KEY) || localStorage.getItem('userEmail') || '';
    return initialEmail ? loadAccountState(initialEmail, DEFAULT_SETTINGS).salesTrend : [];
  });
  const [accountReady, setAccountReady] = useState<boolean>(false);

  const { theme, setTheme } = useTheme();

  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  const handleToggleDarkMode = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const [editingMedicineId, setEditingMedicineId] = useState<number | null>(null);
  const [medicineEditSnapshot, setMedicineEditSnapshot] = useState<Medicine | null>(null);
  const [savingMedicineId, setSavingMedicineId] = useState<number | null>(null);
  const [deletingMedicineId, setDeletingMedicineId] = useState<number | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');
  const [editError, setEditError] = useState('');
  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [createStaffError, setCreateStaffError] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [savingStaffId, setSavingStaffId] = useState<number | null>(null);
  const [inventoryFilterPreset, setInventoryFilterPreset] = useState<{ category: string; status: string; timestamp: number; staffId?: number; staffName?: string } | null>(null);
  const [inventoryPromoRequestId, setInventoryPromoRequestId] = useState<number | null>(null);
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [medicineAuditLogs, setMedicineAuditLogs] = useState<MedicineAuditLog[]>([]);
  const [priceRequests, setPriceRequests] = useState<PriceUpdateRequest[]>([]);
  const [staffAccessVersion, setStaffAccessVersion] = useState(0);
  const [currentStaffPermissions, setCurrentStaffPermissions] = useState<StaffPermissions | null>(null);
  const [staffActivityLogs, setStaffActivityLogs] = useState<StaffActivityLog[]>(() => loadStaffActivityLogs());
  const [allDatabaseCategories, setAllDatabaseCategories] = useState<string[]>([]);
  const lastLoggedStaffViewRef = useRef('');


  const visibleMedicines = useMemo(() => {
    if (currentUserRole !== 'staff') return medicines;

    const assignedCategories = currentUserAssignedCategory.split(',').map(c => normalizeCategory(c)).filter(Boolean);
    if (assignedCategories.length === 0) {
      return currentUserId !== null
        ? medicines.filter((medicine) => medicine.added_by === currentUserId)
        : [];
    }

    return medicines.filter((medicine) =>
      assignedCategories.includes(normalizeCategory(medicine.category)) ||
      (currentUserId !== null && medicine.added_by === currentUserId)
    );
  }, [currentUserAssignedCategory, currentUserRole, medicines, currentUserId]);

  const activeVisibleMedicines = useMemo(
    () => visibleMedicines.filter((medicine) => !medicine.isArchived),
    [visibleMedicines]
  );

  const inventoryOverview = useMemo(
    () => summarizeInventoryStatus(activeVisibleMedicines, settings),
    [settings, activeVisibleMedicines]
  );
  const staffPermissions = useMemo(() => {
    if (currentUserRole !== 'staff' || currentUserId === null) return null;
    return currentStaffPermissions;
  }, [currentUserRole, currentUserId, currentStaffPermissions, staffAccessVersion]);

  const currentStaffStatus = useMemo(() => {
    if (currentUserRole !== 'staff' || currentUserId === null) return 'active';
    return loadStaffStatus(currentUserId);
  }, [currentUserRole, currentUserId, staffAccessVersion]);

  const visibleSidebarTabs = useMemo(
    () => currentUserRole === 'admin'
      ? SIDEBAR_TABS
      : SIDEBAR_TABS.filter((tab) => {
        if (!STAFF_TAB_IDS.includes(tab.id)) return false;
        if (tab.id === 'product' && staffPermissions && !staffPermissions.can_process_pos) return false;
        if (tab.id === 'inventory' && staffPermissions && !staffPermissions.can_adjust_inventory) return false;
        if (tab.id === 'transactions' && staffPermissions && !staffPermissions.can_view_reports) return false;
        return true;
      }),
    [currentUserRole, staffPermissions]
  );

  const promoCandidates = useMemo(() => {
    const unitsByMedicine = new Map<number, number>();
    salesTrend.filter((sale) => Date.now() - new Date(sale.timestamp).getTime() <= 30 * 86400000).forEach((sale) => {
      (sale.items || []).forEach((item) => unitsByMedicine.set(item.medicineId, (unitsByMedicine.get(item.medicineId) || 0) + item.quantity));
    });
    return activeVisibleMedicines.filter((medicine) => {
      if (medicine.stock <= 0 || medicine.is_promo) return false;
      const units = unitsByMedicine.get(medicine.id) || 0;
      const overstock = medicine.stock > Math.max((medicine.reorderLevel || 0) * 3, (medicine.avgDailySales || 0) * 60);
      return units / 30 < 0.25 || overstock;
    });
  }, [salesTrend, activeVisibleMedicines]);

  const predictiveRows: PredictiveRow[] = useMemo(() => {
    return activeVisibleMedicines.map(m => {
      const avg = m.avgDailySales ?? 0;
      const daysLeft = avg > 0 ? Math.floor(m.stock / avg) : 999;
      const suggestedRestock = Math.max(0, (m.reorderLevel ?? 0) + 30 - m.stock);

      return {
        ...m,
        daysLeft,
        suggestedRestock,
      };
    });
  }, [activeVisibleMedicines]);

  const alertSummary = useMemo(() => {
    const alertIds = new Set<number>();
    [
      ...inventoryOverview.lowStock,
      ...inventoryOverview.criticalStock,
      ...inventoryOverview.expiringSoon,
      ...inventoryOverview.expired,
    ].forEach((medicine) => alertIds.add(medicine.id));

    return {
      total: alertIds.size,
      expired: inventoryOverview.counts.expired,
      criticalStock: inventoryOverview.counts.critical_stock,
    };
  }, [inventoryOverview]);



  useEffect(() => {
    if (!canAccessTab(currentUserRole, activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUserRole]);

  useEffect(() => {
    if (currentUserRole !== 'staff' || !staffPermissions) return;
    const permissionBlocked =
      (activeTab === 'product' && !staffPermissions.can_process_pos) ||
      (activeTab === 'inventory' && !staffPermissions.can_adjust_inventory) ||
      (activeTab === 'transactions' && !staffPermissions.can_view_reports);

    if (permissionBlocked) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUserRole, staffPermissions]);

  useEffect(() => {
    if (!token || currentUserRole !== 'staff' || currentUserId === null) return;
    const activityByTab: Partial<Record<TabId, string>> = {
      dashboard: 'Viewed staff dashboard',
      product: 'Opened POS',
      inventory: 'Viewed inventory',
      transactions: 'Viewed transactions report',
      fifo: 'Viewed FIFO module',
    };
    const action = activityByTab[activeTab];
    const logKey = `${currentUserId}:${activeTab}`;
    if (!action || lastLoggedStaffViewRef.current === logKey) return;

    lastLoggedStaffViewRef.current = logKey;
    logStaffActivity({
      staffId: currentUserId,
      staffName: currentUserName || currentUserEmail || 'Staff',
      staffIdentifier: currentUserEmail || String(currentUserId),
      action,
    });
  }, [activeTab, currentUserEmail, currentUserId, currentUserName, currentUserRole, token]);

  useEffect(() => {
    const syncAccess = () => setStaffAccessVersion((version) => version + 1);
    const syncActivity = () => setStaffActivityLogs(loadStaffActivityLogs());
    const syncStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('staff_perms_') || event.key.startsWith('staff_status_')) {
        syncAccess();
      }
      if (!event.key || event.key === 'five_l_staff_activity_logs') {
        syncActivity();
      }
    };

    window.addEventListener(STAFF_ACCESS_CHANGED_EVENT, syncAccess);
    window.addEventListener(STAFF_ACTIVITY_CHANGED_EVENT, syncActivity);
    window.addEventListener('storage', syncStorage);

    return () => {
      window.removeEventListener(STAFF_ACCESS_CHANGED_EVENT, syncAccess);
      window.removeEventListener(STAFF_ACTIVITY_CHANGED_EVENT, syncActivity);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  const isDashboardHeaderHidden = useMemo(
    () =>
      (activeTab === 'inventory' && isAddingMode) ||
      isProductModalOpen ||
      isReportsModalOpen,
    [activeTab, isAddingMode, isProductModalOpen, isReportsModalOpen]
  );

  const dashboardSalesSeries = useMemo(() => {
    if (salesTrend.length === 0) return [];

    const totalsByMonth = new Map<string, { label: string; value: number; sortKey: number }>();

    salesTrend.forEach((sale) => {
      const saleDate = new Date(sale.timestamp);
      if (Number.isNaN(saleDate.getTime())) return;

      const sortKey = saleDate.getFullYear() * 12 + saleDate.getMonth();
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: '2-digit',
      }).format(saleDate);
      const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
      const current = totalsByMonth.get(key);

      totalsByMonth.set(key, {
        label,
        sortKey,
        value: (current?.value || 0) + sale.total,
      });
    });

    return Array.from(totalsByMonth.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ label, value }) => ({ label, value }));
  }, [salesTrend]);

  const dashboardTodaySales = useMemo(() => {
    if (salesTrend.length === 0) return 0;

    const todayKey = new Date().toISOString().slice(0, 10);
    return salesTrend.reduce((sum, sale) => {
      const saleKey = new Date(sale.timestamp).toISOString().slice(0, 10);
      return saleKey === todayKey ? sum + sale.total : sum;
    }, 0);
  }, [salesTrend]);

  const dashboardMonthOverMonth = useMemo(() => {
    if (salesTrend.length === 0) return 0;

    const monthlyTotals = new Map<string, number>();
    salesTrend.forEach((sale) => {
      const saleDate = new Date(sale.timestamp);
      if (Number.isNaN(saleDate.getTime())) return;
      const key = `${saleDate.getFullYear()}-${saleDate.getMonth()}`;
      monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + sale.total);
    });

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousKey = `${previousDate.getFullYear()}-${previousDate.getMonth()}`;
    const currentTotal = monthlyTotals.get(currentKey) || 0;
    const previousTotal = monthlyTotals.get(previousKey) || 0;

    if (previousTotal <= 0) {
      return currentTotal > 0 ? 100 : 0;
    }

    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [salesTrend]);

  useEffect(() => {
    if (!token || !currentUserEmail) {
      setAccountReady(false);
      setMedicines([]);
      setSettings(DEFAULT_SETTINGS);
      setSalesTrend([]);
      setStaffMembers([]);
      return;
    }

    const accountState = loadAccountState(currentUserEmail, DEFAULT_SETTINGS);
    setMedicines(accountState.medicines);
    setSettings(accountState.settings);
    setSalesTrend(accountState.salesTrend);
    setAccountReady(true);
  }, [token, currentUserEmail]);

  // Verify the real role/assignment from the server on every page load.
  // This prevents stale localStorage data from showing the wrong view.
  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data?.detail || '';
          // Unauthorized account / session invalidated — force logout
          if (res.status === 401 || res.status === 403) {
            const isAccessDenied = detail === 'Unauthorized account access';
            handleLogout();
            if (isAccessDenied) setAuthError('Access Denied: This account is not authorized.');
            else setAuthError(detail || 'Your session has expired. Please log in again.');
          }
          return;
        }
        const data = await res.json();
        const serverRole = normalizeUserRole(data.role);
        const serverCategory = data.assigned_category || '';
        const serverName = data.full_name || '';
        const serverEmail = normalizeAccountEmail(data.email || '');
        const serverId = data.id || null;

        // Sync React state and localStorage with server truth
        setCurrentUserRole(serverRole);
        setCurrentUserAssignedCategory(serverCategory);
        setCurrentUserId(serverId);
        if (serverName) setCurrentUserName(serverName);
        if (serverEmail) setCurrentUserEmail(serverEmail);

        localStorage.setItem(ROLE_KEY, serverRole);
        localStorage.setItem('userRole', serverRole);
        localStorage.setItem(ASSIGNED_CATEGORY_KEY, serverCategory);
        localStorage.setItem('assignedCategory', serverCategory);
        localStorage.setItem('userId', serverId ? String(serverId) : '');
        if (serverName) localStorage.setItem('userName', serverName);
        if (serverEmail) {
          localStorage.setItem('userEmail', serverEmail);
          localStorage.setItem(CURRENT_ACCOUNT_EMAIL_KEY, serverEmail);
        }
      })
      .catch(() => {
        // Network error — keep existing state, don't force logout
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


  const fetchMedicines = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/medicines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((m: any) => normalizeMedicine({
          ...m,
          unitPrice: m.unit_price,
          reorderLevel: m.reorder_level,
          avgDailySales: m.avg_daily_sales,
          is_new_arrival: !!m.is_new_arrival,
          dosage_form: m.dosage_form,
        }));
        setMedicines(mappedData);
      }
    } catch (err) {
      console.error('Failed to fetch medicines', err);
    }
  }, [token]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const fetchAdminStats = useCallback(async () => {
    if (!token || currentUserRole !== 'admin') return;
    try {
      const response = await fetch(`${API_BASE}/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAdminStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    }
  }, [token, currentUserRole]);

  const fetchAdminAlerts = useCallback(async () => {
    if (!token || currentUserRole !== 'admin') return;
    try {
      const response = await fetch(`${API_BASE}/admin/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAdminAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin alerts', err);
    }
  }, [token, currentUserRole]);

  const fetchMedicineAuditLogs = useCallback(async () => {
    if (!token || currentUserRole !== 'admin') return;
    try {
      const response = await fetch(`${API_BASE}/medicine-audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMedicineAuditLogs(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch medicine audit logs', err);
    }
  }, [token, currentUserRole]);

 const loadAllCategories = useCallback(async () => {
    if (!token || currentUserRole !== 'admin') return;
    try {
      const response = await fetch(`${API_BASE}/api/settings/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const categoryNames = Array.isArray(data) ? data.map((cat: any) => cat.name || '').filter(Boolean) : [];
        setAllDatabaseCategories(categoryNames);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  }, [token, currentUserRole]);

  const handleMarkAlertRead = useCallback(async (alertId: number) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/admin/alerts/${alertId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setAdminAlerts((prev) => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
        fetchAdminStats();
      }
    } catch (err) {
      console.error('Failed to mark alert as read', err);
    }
  }, [token, fetchAdminStats]);

  // Periodic polling every 5 seconds (Requirement 12)
  useEffect(() => {
    if (!token || currentUserRole !== 'admin') return;

    fetchAdminStats();
    fetchAdminAlerts();
    fetchMedicineAuditLogs();
    loadAllCategories();

    const interval = setInterval(() => {
      fetchAdminStats();
      fetchAdminAlerts();
      fetchMedicineAuditLogs();
      loadAllCategories();
    }, 5000);

    return () => clearInterval(interval);
  }, [token, currentUserRole, fetchAdminStats, fetchAdminAlerts, fetchMedicineAuditLogs, loadAllCategories]);

  // Price update requests polling and review handlers (must be defined after fetchMedicines)
  const fetchPriceUpdateRequests = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/price-update-requests`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const normalized = (data || []).map((row: PriceUpdateRequest) => ({
        ...row,
        adjustment_type: (() => {
          const raw = String(row.adjustment_type || '').trim().toLowerCase();
          const aliases: Record<string, PriceUpdateRequest['adjustment_type']> = {
            'count correction': 'count_correction',
            'count-correction': 'count_correction',
            countcorrection: 'count_correction',
            damage: 'damages',
            expire: 'expired',
          };
          return aliases[raw] || row.adjustment_type || (row.old_quantity != null || row.new_quantity != null ? 'count_correction' : null);
        })(),
        medicine_name: row.medicine_name || `Supply #${row.inventory_id ?? row.id}`,
        requested_by: row.requested_by || row.updated_by || 'Staff',
        current_price: Number(row.current_price ?? row.old_price ?? 0),
        requested_price: Number(row.requested_price ?? row.new_price ?? 0),
      }));
      setPriceRequests(normalized);
    } catch (e) {
      // ignore
    }
  }, [token]);

  const reviewPriceUpdateRequest = useCallback(async (requestId: number, action: 'approve' | 'reject', remarks?: string) => {
    if (!token) {
      notify({ type: 'error', title: 'Authentication Error', message: 'No authorization token found' });
      return;
    }
    try {
      const apiBases = Array.from(new Set([
        API_BASE,
        API_BASE.replace('localhost', '127.0.0.1'),
        API_BASE.replace('127.0.0.1', 'localhost'),
      ]));
      let res: Response | null = null;
      let lastNetworkError: unknown;
      
      console.log(`[Price Request] Sending ${action} for request #${requestId}...`);
      
      for (const base of apiBases) {
        try {
          const payload = { action, remarks: remarks || '' };
          console.log(`[Price Request] Trying ${base}/admin/price-update-requests/${requestId}`, payload);
          
          res = await fetch(`${base}/admin/price-update-requests/${requestId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(payload),
          });
          
          if (res.ok) {
            console.log(`[Price Request] Success with ${base}`);
            break;
          } else {
            console.log(`[Price Request] ${base} returned ${res.status}`);
            if (!res.ok) break; // Try the error response
          }
        } catch (error) {
          console.warn(`[Price Request] Network error with ${base}:`, error);
          lastNetworkError = error;
        }
      }
      
      if (!res) {
        throw lastNetworkError instanceof Error ? lastNetworkError : new Error('Unable to reach the backend API');
      }
      
      if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errorDetail = err.detail || err.message || `HTTP ${res.status}`;
          console.error(`[Price Request] Backend error:`, err);
        } catch (parseErr) {
          console.error(`[Price Request] Could not parse error response:`, parseErr);
        }
        throw new Error(errorDetail);
      }
      
      const updated = await res.json();
      notify({ 
        type: 'success', 
        title: `Request ${action === 'approve' ? 'Approved' : 'Rejected'}`, 
        message: `Price request #${updated.id} has been ${updated.status || action === 'approve' ? 'approved' : 'rejected'}` 
      });
      
      // Refresh lists
      console.log('[Price Request] Refreshing data...');
      await Promise.all([
        fetchMedicines(),
        fetchPriceUpdateRequests(),
        fetchMedicineAuditLogs(),
        fetchAdminStats()
      ]);
      
    } catch (err: any) {
      const errorMsg = err?.message || err || 'Unknown error';
      console.error('[Price Request] Failed:', errorMsg);
      notify({ 
        type: 'error', 
        title: 'Review Failed', 
        message: typeof errorMsg === 'string' ? errorMsg : 'Unable to process request. Please check the console and ensure the backend is running.' 
      });
    }
  }, [token, notify, fetchMedicines, fetchPriceUpdateRequests, fetchMedicineAuditLogs, fetchAdminStats]);

  useEffect(() => {
    let pollId: any = null;
    const startPolling = () => {
      if (!token || currentUserRole !== 'admin') return;
      fetchPriceUpdateRequests();
      pollId = setInterval(() => fetchPriceUpdateRequests(), 5000);
    };
    startPolling();
    return () => { if (pollId) clearInterval(pollId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUserRole]);


  const loadStaffMembers = useCallback(async () => {
    if (!token || currentUserRole !== 'admin') {
      setStaffMembers([]);
      return;
    }

    setStaffLoading(true);
    setStaffError('');

    try {
      const response = await fetch(`${API_BASE}/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load staff');
      }

      const loadedStaff = Array.isArray(data) ? data : [];
      loadedStaff.forEach((staff: StaffMember) => {
        saveStaffStatus(staff.id, staff.account_status || 'active');
        saveStaffPermissions(staff.id, {
          can_process_pos: staff.can_process_pos !== false,
          can_view_reports: staff.can_view_reports !== false,
          can_adjust_inventory: staff.can_adjust_inventory !== false,
          can_approve_voids: staff.can_approve_voids !== false,
        });
      });
      setStaffMembers(loadedStaff);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load staff';
      setStaffError(message);
      setStaffMembers([]);
    } finally {
      setStaffLoading(false);
    }
  }, [currentUserRole, token]);

  const handleUpdateStaffPermissions = useCallback(async (staffId: number, permissions: StaffPermissions) => {
    if (!token) return;
    const response = await fetch(`${API_BASE}/staff/${staffId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(permissions),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Failed to update staff permissions');
    await loadStaffMembers();
    saveStaffPermissions(staffId, permissions);
    if (staffId === currentUserId) setCurrentStaffPermissions(permissions);
  }, [currentUserId, loadStaffMembers, token]);

  useEffect(() => {
    if (!token || currentUserRole !== 'staff') return;
    fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load permissions')))
      .then((data) => setCurrentStaffPermissions({
        can_process_pos: data.can_process_pos !== false,
        can_view_reports: data.can_view_reports !== false,
        can_adjust_inventory: data.can_adjust_inventory !== false,
        can_approve_voids: data.can_approve_voids !== false,
      }))
      .catch(() => undefined);
  }, [currentUserRole, token]);

  useEffect(() => {
    loadStaffMembers();
  }, [loadStaffMembers]);

  useEffect(() => {
    if (currentUserRole === 'admin') {
      loadAllCategories();
    }
  }, [currentUserRole, loadAllCategories]);

  useEffect(() => {
    if (!token || !currentUserEmail || !accountReady) return;

    saveAccountState(currentUserEmail, {
      medicines,
      settings,
      salesTrend,
    });
  }, [token, currentUserEmail, accountReady, medicines, settings, salesTrend]);

  const handleLogout = useCallback(() => {
    const loggingOutStaff = currentUserRole === 'staff' && currentUserId !== null
      ? {
        id: currentUserId,
        name: currentUserName || currentUserEmail || 'Staff',
        identifier: currentUserEmail || String(currentUserId),
      }
      : null;

    if (loggingOutStaff) {
      logStaffActivity({
        staffId: loggingOutStaff.id,
        staffName: loggingOutStaff.name,
        staffIdentifier: loggingOutStaff.identifier,
        action: 'Logged out of system',
      });
    }

    // Clear everything related to the user.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(CURRENT_ACCOUNT_EMAIL_KEY);
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPassword');
    localStorage.removeItem('userName');
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem('userRole');
    localStorage.removeItem(ASSIGNED_CATEGORY_KEY);
    localStorage.removeItem('assignedCategory');
    localStorage.removeItem('user');

    // optional (mas malinis)
    // localStorage.clear();

    const redirectPath = currentUserRole === 'admin' ? '/' : '/staff-login';

    setToken(null);
    setActiveTab('dashboard');
    setCurrentUserEmail('');
    setCurrentUserName('');
    setCurrentUserRole('staff');
    setCurrentStaffPermissions(null);
    setCurrentUserAssignedCategory('');
    setMedicines([]);
    setSettings(DEFAULT_SETTINGS);
    setSalesTrend([]);
    setStaffMembers([]);
    setStaffError('');
    setCreateStaffError('');
    setAccountReady(false);
    navigate(redirectPath, { replace: true });
  }, [currentUserEmail, currentUserId, currentUserName, currentUserRole, navigate]);

  useEffect(() => {
    if (!token || currentUserRole !== 'staff' || currentUserId === null || currentStaffStatus === 'active') return;

    logStaffActivity({
      staffId: currentUserId,
      staffName: currentUserName || currentUserEmail || 'Staff',
      staffIdentifier: currentUserEmail || String(currentUserId),
      action: 'Session blocked',
      detail: `Account was ${currentStaffStatus} by admin`,
    });
    notify({
      type: 'error',
      title: 'Staff access disabled',
      message: `Your account is ${currentStaffStatus}. Please contact the admin.`,
    });
    handleLogout();
  }, [currentStaffStatus, currentUserEmail, currentUserId, currentUserName, currentUserRole, handleLogout, notify, token]);

  const handleSettingsChange = <K extends keyof PharmacySettings,>(field: K, value: PharmacySettings[K]) => {
    setSettingsSaveMessage('');
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSaveSettings = useCallback(() => {
    if (!currentUserEmail) return;
    setSettingsSaving(true);
    saveAccountState(currentUserEmail, { medicines, settings, salesTrend });
    window.setTimeout(() => {
      setSettingsSaving(false);
      setSettingsSaveMessage('Settings saved successfully.');
    }, 250);
  }, [currentUserEmail, medicines, settings, salesTrend]);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSettingsSaveMessage('Settings reset to defaults. Click Save to keep the changes.');
  }, []);

  const availableInventoryCategories = useMemo(() => {
    const categories = new Set<string>();
    
    // Add all database categories
    allDatabaseCategories.forEach(cat => categories.add(cat));
    
    // Add categories from medicines
    medicines.forEach(m => categories.add(m.category));
    
    // Add categories from staff
    staffMembers.forEach(s => {
      if (s.assigned_category) {
        s.assigned_category.split(',').forEach(c => categories.add(c.trim()));
      }
    });
    
    return Array.from(categories).filter(Boolean).sort();
  }, [medicines, staffMembers, allDatabaseCategories]);

  const handleAssignStaffCategory = useCallback(async (staffId: number, category: string) => {
    const assignedCategory = category.trim();
    if (!token || !assignedCategory) return;

    setSavingStaffId(staffId);
    setStaffError('');

    try {
      const response = await fetch(`${API_BASE}/staff/${staffId}/assignment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assigned_category: assignedCategory }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update staff assignment');
      }

      setStaffMembers((current) =>
        current.map((staff) => (staff.id === staffId ? data : staff))
      );
      notify({
        type: 'success',
        title: 'Staff assignment updated',
        message: `${data.full_name || 'Staff member'} can now manage ${data.assigned_category || assignedCategory}.`,
      });
    } catch (err: any) {
      console.error('Failed to update staff assignment', err);
      notify({
        type: 'error',
        title: 'Assignment update failed',
        message: err.message || 'Please try again.',
      });
    } finally {
      setSavingStaffId(null);
    }
  }, [notify, token]);

  const handleDeleteStaff = useCallback(async (staffId: number) => {
    if (!token) return false;
    setSavingStaffId(staffId);
    try {
      const res = await fetch(`${API_BASE}/staff/${staffId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const deletedStaff = staffMembers.find((staff) => staff.id === staffId);
        setStaffMembers((prev) => prev.filter(s => s.id !== staffId));
        removeStaffAccess(staffId);
        if (deletedStaff) {
          logStaffActivity({
            staffId,
            staffName: deletedStaff.full_name,
            staffIdentifier: deletedStaff.identifier,
            action: 'Account deleted',
            detail: `Deleted by ${currentUserName || currentUserEmail || 'admin'}`,
          });
        }
        notify({
          type: 'success',
          title: 'Staff account deleted',
          message: `${deletedStaff?.full_name || 'Staff member'} was removed from the system.`,
        });
        return true;
      } else {
        const errorText = await res.text();
        console.error('Failed to delete staff member', errorText);
        notify({
          type: 'error',
          title: 'Delete staff failed',
          message: errorText || 'The server rejected the request.',
        });
        return false;
      }
    } catch (err: any) {
      console.error('Failed to delete staff member', err);
      notify({
        type: 'error',
        title: 'Delete staff failed',
        message: err.message || 'Please try again.',
      });
      return false;
    } finally {
      setSavingStaffId(null);
    }
  }, [currentUserEmail, currentUserName, notify, staffMembers, token]);

  const handleUpdateStaffStatus = useCallback(async (staffId: number, status: 'active' | 'disabled' | 'suspended') => {
    if (!token) return;

    setSavingStaffId(staffId);
    setStaffError('');

    try {
      const response = await fetch(`${API_BASE}/staff/${staffId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ account_status: status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update staff status');
      }

      setStaffMembers((current) =>
        current.map((staff) => (staff.id === staffId ? data : staff))
      );
      saveStaffStatus(staffId, data.account_status || status);
      logStaffActivity({
        staffId,
        staffName: data.full_name || 'Staff member',
        staffIdentifier: data.identifier || String(staffId),
        action: `Account ${data.account_status || status}`,
        detail: `Status changed by ${currentUserName || currentUserEmail || 'admin'}`,
      });
      notify({
        type: 'success',
        title: 'Staff status updated',
        message: `${data.full_name || 'Staff member'} is now ${data.account_status}.`,
      });
    } catch (err: any) {
      console.error('Failed to update staff status', err);
      setStaffError(err.message || 'Failed to update staff status');
      notify({
        type: 'error',
        title: 'Status update failed',
        message: err.message || 'Please try again.',
      });
    } finally {
      setSavingStaffId(null);
    }
  }, [currentUserEmail, currentUserName, notify, token]);

  const handleCreateStaff = useCallback(async (payload: StaffCreatePayload) => {
    const fullName = payload.full_name.trim();
    const identifier = normalizeAccountEmail(payload.identifier);
    const password = payload.password.trim() || 'staff123';
    const assignedCategory = payload.assigned_category.trim();

    if (!token) return false;
    if (!fullName || !identifier || !assignedCategory) {
      setCreateStaffError('Staff name, username, and assignment are required.');
      return false;
    }
    if (password.length < 6) {
      setCreateStaffError('Staff password must be at least 6 characters long.');
      return false;
    }

    setCreatingStaff(true);
    setCreateStaffError('');
    setStaffError('');

    try {
      const response = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          identifier,
          password,
          assigned_category: assignedCategory,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create staff');
      }

      setStaffMembers((current) => [...current, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      saveStaffStatus(data.id, data.account_status || 'active');
      logStaffActivity({
        staffId: data.id,
        staffName: data.full_name || fullName,
        staffIdentifier: data.identifier || identifier,
        action: 'Account created',
        detail: `Created by ${currentUserName || currentUserEmail || 'admin'}`,
      });
      notify({
        type: 'success',
        title: 'Staff account created',
        message: `${data.full_name || fullName} can now log in as ${data.identifier || identifier}.`,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create staff';
      setCreateStaffError(message);
      notify({
        type: 'error',
        title: 'Add staff failed',
        message,
      });
      return false;
    } finally {
      setCreatingStaff(false);
    }
  }, [currentUserEmail, currentUserName, notify, token]);

  const activateAuthenticatedSession = useCallback((data: { id: number; access_token: string; email: string; full_name: string; role?: string; assigned_category?: string | null; account_status?: 'active' | 'disabled' | 'suspended'; can_process_pos?: boolean; can_view_reports?: boolean; can_adjust_inventory?: boolean; can_approve_voids?: boolean }, plainPassword: string) => {
    const authenticatedEmail = normalizeAccountEmail(data.email);
    const authenticatedName = data.full_name || authenticatedEmail.split('@')[0];
    const authenticatedRole = normalizeUserRole(data.role);
    const authenticatedAssignment = data.assigned_category || '';
    const authenticatedStatus = data.account_status || (authenticatedRole === 'staff' && data.id ? loadStaffStatus(data.id) : 'active');

    if (authenticatedRole === 'staff' && authenticatedStatus !== 'active') {
      logStaffActivity({
        staffId: data.id,
        staffName: authenticatedName,
        staffIdentifier: authenticatedEmail,
        action: 'Login blocked',
        detail: `Account is ${authenticatedStatus}`,
      });
      setAuthError(`This staff account is ${authenticatedStatus}. Please contact the admin.`);
      return false;
    }

    const loadedAccountState = loadAccountState(authenticatedEmail, DEFAULT_SETTINGS);

    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('userEmail', authenticatedEmail);
    localStorage.setItem('userPassword', plainPassword);
    localStorage.setItem('userName', authenticatedName);
    localStorage.setItem(ROLE_KEY, authenticatedRole);
    localStorage.setItem('userRole', authenticatedRole);
    localStorage.setItem(ASSIGNED_CATEGORY_KEY, authenticatedAssignment);
    localStorage.setItem('assignedCategory', authenticatedAssignment);
    localStorage.setItem(CURRENT_ACCOUNT_EMAIL_KEY, authenticatedEmail);
    localStorage.setItem('user', JSON.stringify({
      email: authenticatedEmail,
      full_name: authenticatedName,
      role: authenticatedRole,
      assigned_category: authenticatedAssignment,
    }));

    setToken(data.access_token);
    setCurrentUserEmail(authenticatedEmail);
    setCurrentUserName(authenticatedName);
    setCurrentUserRole(authenticatedRole);
    setCurrentUserAssignedCategory(authenticatedAssignment);
    setCurrentUserId(data.id || null);
    setCurrentStaffPermissions(authenticatedRole === 'staff' ? {
      can_process_pos: data.can_process_pos !== false,
      can_view_reports: data.can_view_reports !== false,
      can_adjust_inventory: data.can_adjust_inventory !== false,
      can_approve_voids: data.can_approve_voids !== false,
    } : null);
    localStorage.setItem('userId', data.id ? String(data.id) : '');
    setMedicines(loadedAccountState.medicines);
    setSettings(loadedAccountState.settings);
    setSalesTrend(loadedAccountState.salesTrend);
    setAccountReady(true);
    setAuthMode('login');
    setActiveTab('dashboard');
    setAuthError('');
    setForgotError('');
    setForgotMessage('');
    setForgotStep('none');
    setResetCode('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setLoginStep('credentials');
    setLoginOtp('');
    setOtpError('');
    if (authenticatedRole === 'staff') {
      saveStaffStatus(data.id, 'active');
      logStaffActivity({
        staffId: data.id,
        staffName: authenticatedName,
        staffIdentifier: authenticatedEmail,
        action: 'Logged into system',
      });
    }
    return true;
  }, []);

  const handleAuth = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setAuthError('Please enter your full name');
        return;
      }
      if (!email.trim()) {
        setAuthError('Please enter your email');
        return;
      }
      if (!password.trim()) {
        setAuthError('Please enter your password');
        return;
      }
      if (!confirmPassword.trim()) {
        setAuthError('Please confirm your password');
        return;
      }
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match');
        return;
      }

      setAuthLoading(true);
      setAuthError('');

      try {
        const response = await fetch(`${API_BASE}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: normalizeAccountEmail(email),
            password,
            confirm_password: confirmPassword,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Signup failed');
        }

        setHasAdmin(true);
        setCanCreateAdmin(false);
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
        setLoginStep('credentials');
        setAuthError('Administrator account created. Please sign in.');
        sessionStorage.removeItem(GOOGLE_PENDING_SIGNUP_KEY);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Signup failed';
        setAuthError(message);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (!email.trim()) {
      setAuthError('Please enter your username');
      return;
    }
    if (!password.trim()) {
      setAuthError('Please enter your password');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    const normalizedEmail = normalizeAccountEmail(email);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          require_otp: settings.requireAdminOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      if (data.requires_otp) {
        setLoginStep('otp');
        setOtpError('');
        setLoginOtp('');
      } else {
        activateAuthenticatedSession(data, password);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }, [activateAuthenticatedSession, authMode, confirmPassword, email, fullName, password, settings.requireAdminOtp]);

  const handleVerifyOtp = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginOtp.trim()) {
      setOtpError('Please enter the verification code');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    const normalizedEmail = normalizeAccountEmail(email);

    try {
      const response = await fetch(`${API_BASE}/login/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail, code: loginOtp.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid verification code');
      }

      activateAuthenticatedSession(data, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  }, [activateAuthenticatedSession, email, password, loginOtp]);

  const handleForgotRequest = useCallback(async () => {
    const normalizedEmail = normalizeAccountEmail(email);
    if (!normalizedEmail) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const response = await fetch(`${API_BASE}/auth/password-reset/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send reset code');
      }

      setForgotMessage(data.message || 'Reset code sent to your email.');
      setForgotStep('reset');
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset code';
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  }, [email]);

  const handleResetPassword = useCallback(async () => {
    const normalizedEmail = normalizeAccountEmail(email);
    const code = resetCode.trim();
    const nextPassword = resetNewPassword.trim();

    if (!normalizedEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!code) {
      setForgotError('Enter the reset code sent to your email.');
      return;
    }
    if (nextPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const response = await fetch(`${API_BASE}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          code,
          new_password: nextPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Password reset failed');
      }

      activateAuthenticatedSession(data, nextPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  }, [activateAuthenticatedSession, email, resetCode, resetConfirmPassword, resetNewPassword]);

  const handleMedicineInputChange = useCallback((id: number, field: keyof Medicine, value: string) => {
    if (currentUserRole === 'staff' && field === 'category') return;

    setEditError('');
    setMedicines(prev =>
      prev.map(m => (m.id === id ? { ...m, [field]: field === 'stock' || field === 'reorderLevel' || field === 'avgDailySales' || field === 'unitPrice' ? parseInventoryNumber(value) : value } : m))
    );
  }, [currentUserRole]);

  const handleStartAddItem = useCallback(() => {
    const assignedCategories = currentUserAssignedCategory.split(',').map(c => c.trim()).filter(Boolean);

    if (currentUserRole === 'staff' && assignedCategories.length === 0) {
      setAddItemError('Admin must assign your medicine category before you can add inventory.');
      return;
    }

    setEditingMedicineId(null);
    setMedicineEditSnapshot(null);
    setAddItemError('');
    const receivedDate = new Date().toISOString().slice(0, 10);
    const defaultExpiry = addDaysToDateInput(receivedDate, settings.shelfLifeDays);
    autoGeneratedExpiryRef.current = defaultExpiry;
    setNewItem({
      ...EMPTY_NEW_ITEM,
      category: currentUserRole === 'staff' && assignedCategories.length === 1 ? assignedCategories[0] : '',
      receivedDate,
      expiry: defaultExpiry,
    });
    setIsAddingMode(true);
  }, [currentUserAssignedCategory, currentUserRole, settings.shelfLifeDays]);

  const handleCancelAddItem = useCallback(() => {
    setIsAddingMode(false);
    setAddItemError('');
    setNewItem(EMPTY_NEW_ITEM);
  }, []);

  const handleStartEditMedicine = useCallback((id: number) => {
    setEditError('');
    setMedicineEditSnapshot(medicines.find((medicine) => medicine.id === id) || null);
    setEditingMedicineId(id);
  }, [medicines]);

  const handleCancelEditMedicine = useCallback((id: number) => {
    if (medicineEditSnapshot && medicineEditSnapshot.id === id) {
      setMedicines((prev) =>
        prev.map((medicine) => (medicine.id === id ? medicineEditSnapshot : medicine))
      );
    }
    setEditError('');
    setEditingMedicineId(null);
    setMedicineEditSnapshot(null);
  }, [medicineEditSnapshot]);

  const handleSaveMedicine = useCallback(async (id: number) => {
    const target = medicines.find((medicine) => medicine.id === id);
    if (!target) return;

    const assignedCategories = currentUserAssignedCategory.split(',').map(c => normalizeCategory(c)).filter(Boolean);
    const targetCategory = normalizeCategory(target.category);

    const isAuthorized = currentUserRole !== 'staff' || assignedCategories.includes(targetCategory);

    if (!target.name.trim() || !target.category.trim() || !target.expiry) {
      setEditError('Medicine name, category, and expiry date are required before saving.');
      return;
    }

    if (!isAuthorized) {
      setEditError('You are not authorized to save items in this category.');
      return;
    }

    setEditError('');
    setSavingMedicineId(id);

    try {
      const response = await fetch(`${API_BASE}/medicines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: target.name.trim(),
          category: target.category.trim(),
          stock: target.stock,
          reorder_level: target.reorderLevel,
          expiry: target.expiry,
          avg_daily_sales: target.avgDailySales,
          unit_price: target.unitPrice,
          supplier: (target.supplier || '').trim(),
          is_new_arrival: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update medicine');
      }

      const data = await response.json();
      const updated = {
        ...data,
        unitPrice: data.unit_price,
        reorderLevel: data.reorder_level,
        avgDailySales: data.avg_daily_sales,
      };
      setMedicines((prev) =>
        prev.map((medicine) => (medicine.id === id ? updated : medicine))
      );
      if (currentUserRole === 'staff' && currentUserId !== null) {
        logStaffActivity({
          staffId: currentUserId,
          staffName: currentUserName || currentUserEmail || 'Staff',
          staffIdentifier: currentUserEmail || String(currentUserId),
          action: 'Updated inventory item',
          detail: updated.name || target.name,
        });
      }
      setEditingMedicineId(null);
      setMedicineEditSnapshot(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSavingMedicineId(null);
    }
  }, [currentUserAssignedCategory, currentUserEmail, currentUserId, currentUserName, currentUserRole, medicines, token]);

  const handleNewItemChange = useCallback((field: string, value: string) => {
    // Staff can now select from their assigned categories (or any if allowed by UI)
    // We will validate on save.

    setAddItemError('');
    if (field === 'receivedDate') {
      autoGeneratedExpiryRef.current = addDaysToDateInput(value, settings.shelfLifeDays);
    }
    setNewItem(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'receivedDate' ? { expiry: addDaysToDateInput(value, settings.shelfLifeDays) } : {}),
    }));
  }, [settings.shelfLifeDays]);

  useEffect(() => {
    if (!isAddingMode || !newItem.receivedDate) return;
    const calculatedExpiry = addDaysToDateInput(newItem.receivedDate, settings.shelfLifeDays);
    setNewItem((current) => {
      // Keep Shelf Life as the default, but never overwrite an admin-edited date.
      if (current.expiry !== autoGeneratedExpiryRef.current) return current;
      autoGeneratedExpiryRef.current = calculatedExpiry;
      return current.expiry === calculatedExpiry ? current : { ...current, expiry: calculatedExpiry };
    });
  }, [isAddingMode, newItem.receivedDate, settings.shelfLifeDays]);

  const handleAddItem = useCallback(async () => {
    const name = newItem.name.trim();
    // Products selected as "Other" belong to the stable Others category.
    const category = (['Other', 'Medical Supply', 'Medical Device'].includes(newItem.dosageForm)
      ? 'Others'
      : newItem.category).trim();
    const expiry = newItem.expiry;
    const dosageForm = newItem.dosageForm || '';
    const dosageValue = newItem.strength || newItem.volume || '';

    const assignedCategories = currentUserAssignedCategory.split(',').map(c => normalizeCategory(c)).filter(Boolean);
    const normalizedCategory = normalizeCategory(category);
    const isAuthorized = currentUserRole !== 'staff' || assignedCategories.includes(normalizedCategory);

    if (!name || !category || !expiry || !dosageForm || !newItem.classification || !dosageValue || !newItem.stock || !newItem.reorderLevel) {
      setAddItemError('Please fill in all required fields.');
      return;
    }

    if (!isAuthorized) {
      setAddItemError('You are not authorized to add items in this category.');
      return;
    }

    setAddingItem(true);
    setAddItemError('');

    try {
      const response = await fetch(`${API_BASE}/medicines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // The API formats the variant once. Sending a pre-formatted name here
          // makes the strength/dosage appear twice after the API response.
          name,
          category,
          stock: parseInventoryNumber(newItem.stock),
          reorder_level: parseInventoryNumber(newItem.reorderLevel),
          expiry,
          avg_daily_sales: parseInventoryNumber(newItem.avgDailySales),
          unit_price: parseInventoryNumber(newItem.unitPrice),
          supplier: newItem.supplier.trim(),
          medicine_name: name,
          classification: newItem.classification || 'Generic',
          dosage_form: dosageForm || 'Tablet',
          strength: newItem.strength || undefined,
          volume: newItem.volume || undefined,
          manufacturer: newItem.manufacturer || undefined,
          unit_type: newItem.unitType || 'pcs',
          base_unit: 'pcs',
          purchase_unit: newItem.unitType || 'pcs',
          conversion_factor: Math.max(1, Number(newItem.conversionFactor) || 1),
          quantity: parseInventoryNumber(newItem.stock),
          expiry_date: expiry,
          selling_price: parseInventoryNumber(newItem.sellingPrice || newItem.unitPrice),
          batch_number: newItem.lotNumber || undefined,
          received_date: newItem.receivedDate || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to add medicine');
      }

      const data = await response.json();
      const created = normalizeMedicine({
        ...data,
        unitPrice: data.unit_price,
        reorderLevel: data.reorder_level,
        avgDailySales: data.avg_daily_sales,
        supplies: data.supplies || (newItem.lotNumber || newItem.receivedDate ? [{
          batch_number: newItem.lotNumber || undefined,
          received_date: newItem.receivedDate || undefined,
          expiry_date: newItem.expiry || undefined,
          quantity: parseInventoryNumber(newItem.stock),
        }] : []),
      });
      // Re-read the API response so the screen reflects the actual database
      // record (including its generated ID, supply row, stock, and timestamps).
      await fetchMedicines();
      setIsAddingMode(false);
      setNewItem(EMPTY_NEW_ITEM);
      notify({
        type: 'success',
        title: 'Medicine added',
        message: `${created.name || newItem.name} was added to inventory.`,
      });
      if (currentUserRole === 'staff' && currentUserId !== null) {
        logStaffActivity({
          staffId: currentUserId,
          staffName: currentUserName || currentUserEmail || 'Staff',
          staffIdentifier: currentUserEmail || String(currentUserId),
          action: 'Added inventory item',
          detail: created.name || newItem.name,
        });
      }
    } catch (err: any) {
      setAddItemError(err.message);
      notify({
        type: 'error',
        title: 'Add medicine failed',
        message: err.message || 'Please review the item details.',
      });
    } finally {
      setAddingItem(false);
    }
  }, [currentUserAssignedCategory, currentUserEmail, currentUserId, currentUserName, currentUserRole, fetchMedicines, newItem, notify, token]);

  const handleAddChildProduct = useCallback(async (input: {
    motherName: string;
    category: string;
    dosageForm?: string;
    variantName: string;
    classification: string;
    sellingPrice: string;
    costPrice: string;
    reorderLevel: string;
    initialStock: string;
    lotNumber: string;
    expiryDate: string;
    supplier: string;
    receivedDate: string;
  }) => {
    const variant = input.variantName.trim();
    const assignedCategories = currentUserAssignedCategory.split(',').map(c => normalizeCategory(c)).filter(Boolean);
    if (currentUserRole === 'staff' && !assignedCategories.includes(normalizeCategory(input.category))) {
      throw new Error('You are not authorized to add items in this category.');
    }

    const response = await fetch(`${API_BASE}/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `${input.motherName} - ${variant}${input.dosageForm ? ` ${input.dosageForm}` : ''}`,
        medicine_name: input.motherName,
        category: input.category,
        stock: parseInventoryNumber(input.initialStock),
        quantity: parseInventoryNumber(input.initialStock),
        reorder_level: parseInventoryNumber(input.reorderLevel),
        expiry: input.expiryDate,
        expiry_date: input.expiryDate,
        unit_price: parseInventoryNumber(input.costPrice),
        selling_price: parseInventoryNumber(input.sellingPrice),
        supplier: input.supplier.trim(),
        classification: input.classification,
        dosage_form: input.dosageForm || 'Other',
        batch_number: input.lotNumber.trim(),
        received_date: input.receivedDate,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to add variant');
    }

    const data = await response.json();
    const created = normalizeMedicine({
      ...data,
      unitPrice: data.unit_price,
      reorderLevel: data.reorder_level,
      avgDailySales: data.avg_daily_sales,
    });
    setMedicines(prev => [created, ...prev]);
    notify({ type: 'success', title: 'Variant added', message: `${created.name || variant} was added to inventory.` });
  }, [currentUserAssignedCategory, currentUserRole, notify, token]);

  const handleDeleteMedicine = useCallback(async (id: number) => {
    setDeletingMedicineId(id);
    try {
      const response = await fetch(`${API_BASE}/medicines/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete medicine');
      }

      setMedicines((prev) => prev.filter((m) => m.id !== id));
      const deletedMedicine = medicines.find((medicine) => medicine.id === id);
      if (currentUserRole === 'staff' && currentUserId !== null) {
        logStaffActivity({
          staffId: currentUserId,
          staffName: currentUserName || currentUserEmail || 'Staff',
          staffIdentifier: currentUserEmail || String(currentUserId),
          action: 'Deleted inventory item',
          detail: deletedMedicine?.name || `Medicine #${id}`,
        });
      }
      notify({
        type: 'success',
        title: 'Medicine deleted',
        message: 'The item was removed from inventory.',
      });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Delete medicine failed',
        message: err.message || 'Please try again.',
      });
    } finally {
      setDeletingMedicineId(null);
    }
  }, [currentUserEmail, currentUserId, currentUserName, currentUserRole, medicines, notify, token]);

  const handleAddSupply = useCallback(async (id: number, addedUnits: number, expiry: string, receivedDate?: string, classification?: string) => {
    const med = medicines.find(m => m.id === id);
    if (!med) return;
    let currentMed = med;

    if (isNaN(addedUnits) || addedUnits <= 0 || !expiry) return;

    const normalizedClassification = classification?.toLowerCase() === 'branded' ? 'Branded' : 'Generic';
    const shouldUpdateClassification = normalizedClassification.toLowerCase() !== (currentMed.classification || 'generic').toLowerCase();

    setSavingMedicineId(id);
    try {
      if (shouldUpdateClassification) {
        const updateResponse = await fetch(`${API_BASE}/medicines/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: currentMed.name,
            category: currentMed.category,
            stock: currentMed.stock,
            reorder_level: currentMed.reorderLevel,
            expiry: currentMed.expiry,
            avg_daily_sales: currentMed.avgDailySales,
            unit_price: currentMed.unitPrice,
            supplier: currentMed.supplier || 'Unknown',
            is_new_arrival: false,
            classification: normalizedClassification,
          }),
        });

        if (!updateResponse.ok) {
          const data = await updateResponse.json();
          throw new Error(data.detail || 'Failed to update classification');
        }

        const updatedMedData = await updateResponse.json();
        const updatedMed = normalizeMedicine({
          ...updatedMedData,
          unitPrice: updatedMedData.unit_price,
          reorderLevel: updatedMedData.reorder_level,
          avgDailySales: updatedMedData.avg_daily_sales,
        });
        setMedicines((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));
        currentMed = updatedMed;
      }

      // Use the supplies endpoint to add a batch to existing medicine
      const response = await fetch(`${API_BASE}/medicines/${id}/supplies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: addedUnits,
          expiry_date: expiry,
          received_date: receivedDate || undefined,
          supplier: currentMed.supplier || 'Unknown',
          unit_cost: (currentMed.unitPrice || 0) * 0.7,
          selling_price: currentMed.unitPrice || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to add supply batch');
      }

      const updatedMed = await response.json();
      const updated = normalizeMedicine({
        ...updatedMed,
        unitPrice: updatedMed.unit_price,
        reorderLevel: updatedMed.reorder_level,
        avgDailySales: updatedMed.avg_daily_sales,
      });

      // Update existing medicine in state, don't create a duplicate
      setMedicines((prev) =>
        prev.map((m) => (m.id === id ? updated : m))
      );
      notify({
        type: 'success',
        title: 'Supply batch added',
        message: `${addedUnits} unit${addedUnits === 1 ? '' : 's'} added to ${currentMed.name}.`,
      });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Add supply failed',
        message: err.message || 'Please try again.',
      });
    } finally {
      setSavingMedicineId(null);
    }
  }, [medicines, notify, token]);

  const handleUpdateSupplyPrice = useCallback(async (supplyId: number, price: number, reason?: string) => {
    try {
      const body: any = { selling_price: price };
      if (reason) body.reason = reason;
      const response = await fetch(`${API_BASE}/supplies/${supplyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update supply price');
      }

      const updatedMed = await response.json();
      const updated = normalizeMedicine({
        ...updatedMed,
        unitPrice: updatedMed.unit_price,
        reorderLevel: updatedMed.reorder_level,
        avgDailySales: updatedMed.avg_daily_sales,
      });
      setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (currentUserRole === 'staff') {
        if (currentUserId !== null) {
          logStaffActivity({
            staffId: currentUserId,
            staffName: currentUserName || currentUserEmail || 'Staff',
            staffIdentifier: currentUserEmail || String(currentUserId),
            action: 'Requested price update',
            detail: `${updated.name || 'Medicine'} supply #${supplyId} to ${formatPeso(price)}${reason ? ` — ${reason}` : ''}`,
          });
        }
        notify({
          type: 'success',
          title: 'Pending Admin Approval',
          message: 'Your price update request has been submitted and will require admin approval before it becomes effective.',
        });
        fetchPriceUpdateRequests();
      } else {
        notify({
          type: 'success',
          title: 'Supply price updated',
          message: 'Batch price has been updated successfully.',
        });
        fetchMedicineAuditLogs();
      }
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Failed to update supply price',
        message: err.message || 'Please try again.',
      });
    }
  }, [currentUserEmail, currentUserId, currentUserName, currentUserRole, fetchMedicineAuditLogs, fetchPriceUpdateRequests, notify, token]);

  const handleAdjustSupply = useCallback(async (supplyId: number, quantity: number, adjustmentType: string, reason?: string) => {
    try {
      const body: any = { quantity, adjustment_type: adjustmentType };
      if (reason) body.reason = reason;
      const response = await fetch(`${API_BASE}/supplies/${supplyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to adjust supply quantity');
      }

      const updatedMed = await response.json();
      const updated = normalizeMedicine({
        ...updatedMed,
        unitPrice: updatedMed.unit_price,
        reorderLevel: updatedMed.reorder_level,
        avgDailySales: updatedMed.avg_daily_sales,
      });
      if (currentUserRole === 'staff' && currentUserId !== null) {
        logStaffActivity({
          staffId: currentUserId,
          staffName: currentUserName || currentUserEmail || 'Staff',
          staffIdentifier: currentUserEmail || String(currentUserId),
          action: 'Requested inventory adjustment',
          detail: `${updated.name || 'Medicine'} supply #${supplyId}: ${quantity} (${adjustmentType})${reason ? ` — ${reason}` : ''}`,
        });
      }
      if (currentUserRole === 'staff') {
        // The backend creates a pending PriceHistory record for staff. Do not
        // update the local medicine state until an admin approves it.
        notify({
          type: 'info',
          title: 'Pending Admin Approval',
          message: 'Your inventory adjustment was submitted. Stock will change only after admin approval.',
        });
      } else {
        setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        fetchMedicineAuditLogs();
        notify({
          type: 'success',
          title: 'Supply quantity adjusted',
          message: adjustmentType === 'count_correction'
            ? `Batch count corrected to ${quantity}.`
            : `${quantity} unit${quantity === 1 ? '' : 's'} deducted from the batch.`,
        });
      }
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Failed to adjust supply quantity',
        message: err.message || 'Please try again.',
      });
    }
  }, [currentUserEmail, currentUserId, currentUserName, currentUserRole, fetchMedicineAuditLogs, notify, token]);

  const handleArchiveSupply = useCallback(async (supplyId: number, reason?: string) => {
    try {
      const response = await fetch(`${API_BASE}/supplies/${supplyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_archived: true, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to archive supply');
      const updated = normalizeMedicine({ ...data, unitPrice: data.unit_price, reorderLevel: data.reorder_level, avgDailySales: data.avg_daily_sales });
      setMedicines((prev) => prev.map((medicine) => medicine.id === updated.id ? updated : medicine));
      notify({ type: 'success', title: 'Batch archived', message: 'The expired batch is no longer available in POS.' });
      fetchMedicineAuditLogs();
      return true;
    } catch (err: any) {
      notify({ type: 'error', title: 'Failed to archive batch', message: err.message || 'Please try again.' });
      return false;
    }
  }, [fetchMedicineAuditLogs, notify, token]);

  const handleArchiveMedicine = useCallback(async (medicineId: number, archived: boolean, reason?: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/medicines/${medicineId}/archive?is_archived=${archived}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (response.status === 404) {
        setMedicines((prev) => prev.filter((medicine) => medicine.id !== medicineId));
        throw new Error('Medicine no longer exists. The archive list was refreshed.');
      }
      if (!response.ok) throw new Error(data.detail || 'Failed to update medicine archive status');
      const updated = normalizeMedicine({ ...data, unitPrice: data.unit_price, reorderLevel: data.reorder_level, avgDailySales: data.avg_daily_sales, isArchived: archived });
      setMedicines((prev) => prev.map((medicine) => medicine.id === updated.id ? updated : medicine));
      notify({ type: 'success', title: archived ? 'Medicine archived' : 'Medicine unarchived', message: archived ? 'The medicine was removed from active batches and POS.' : 'The medicine is active again.' });
      fetchMedicineAuditLogs();
      return true;
    } catch (err: any) {
      notify({ type: 'error', title: 'Failed to update medicine', message: err.message || 'Please try again.' });
      return false;
    }
  }, [fetchMedicineAuditLogs, notify, token]);

  const handleCompleteSale = useCallback(async (items: ProductSaleItem[], cashReceived?: number, changeAmount?: number) => {
    if (!items.length) return;

    // Validate every line before creating transactions so one bad line cannot
    // leave a partially completed sale.
    const saleLines = items.map((item) => {
      const medicine = medicines.find((med) => med.id === item.medicineId);
      if (!medicine) {
        throw new Error('Medicine not found. Please refresh inventory and try again.');
      }
      const availableStock = getFifoAvailableStock(medicine);
      if (item.quantity <= 0) {
        throw new Error(`${medicine.name} has an invalid quantity.`);
      }
      if (item.quantity > availableStock) {
        throw new Error(`${medicine.name} only has ${availableStock} non-expired units available.`);
      }
      return item;
    });

    let total = 0;
    let units = 0;
    let actualPurchaseTime: string | undefined;

    for (const item of saleLines) {
      const medicine = medicines.find((med) => med.id === item.medicineId);
      if (!medicine) continue;

      const savedTransaction = await createTransaction({
        medicine_id: item.medicineId,
        quantity: item.quantity,
        price: item.unitPrice,
        gross_amount: item.grossUnitPrice ? item.grossUnitPrice * item.quantity : item.unitPrice * item.quantity,
        vatable_sales: item.customerType === 'senior_citizen' ? 0 : (item.grossUnitPrice || item.unitPrice) * item.quantity / 1.12,
        vat_amount: item.customerType === 'senior_citizen' ? 0 : ((item.grossUnitPrice || item.unitPrice) * item.quantity) - ((item.grossUnitPrice || item.unitPrice) * item.quantity / 1.12),
        vat_exempt_sales: item.customerType === 'senior_citizen' ? (item.grossUnitPrice || item.unitPrice) * item.quantity / 1.12 : 0,
        discount_amount: item.discountAmount || 0,
        senior_citizen_discount: item.customerType === 'senior_citizen' ? item.seniorCitizenDiscount || 0 : 0,
        pwd_discount: 0,
        other_discount: item.customerType === 'regular' ? item.discountAmount || 0 : 0,
        net_sales: item.unitPrice * item.quantity,
        cashier_name: currentUserEmail || currentUserName || undefined,
        payment_method: 'cash',
        transaction_type: 'sale',
        cash_received: cashReceived,
        change_amount: changeAmount,
      });

      actualPurchaseTime ??= savedTransaction.created_at;

      total += item.quantity * item.unitPrice;
      units += item.quantity;
    }

    setSalesTrend((current) => [
      {
        id: `SALE-${Date.now()}`,
        units,
        total,
        timestamp: actualPurchaseTime || new Date().toISOString(),
        items,
      },
      ...current,
    ]);

    if (currentUserRole === 'staff' && currentUserId !== null) {
      logStaffActivity({
        staffId: currentUserId,
        staffName: currentUserName || currentUserEmail || 'Staff',
        staffIdentifier: currentUserEmail || String(currentUserId),
        action: 'Processed POS sale',
        detail: `${units} unit${units === 1 ? '' : 's'} sold for ${formatPeso(total)}`,
      });
    }

    await fetchMedicines();
    fetchAdminStats();
    fetchAdminAlerts();
    notify({
      type: 'success',
      title: 'Sale completed',
      message: `${units} unit${units === 1 ? '' : 's'} sold for ${formatPeso(total)}.`,
    });
  }, [currentUserEmail, currentUserId, currentUserName, currentUserRole, fetchAdminAlerts, fetchAdminStats, fetchMedicines, medicines, notify]);

  const appTopbar = !isDashboardHeaderHidden ? (
    <Topbar
      logo={logo}
      title={settings.pharmacyName}
      email={currentUserEmail || localStorage.getItem('userEmail') || 'user@email.com'}
      userName={currentUserName || localStorage.getItem('userName') || 'Pharmacist'}
      assignmentLabel={currentUserRole === 'staff' ? `Assigned: ${currentUserAssignedCategory || 'Waiting for admin'}` : undefined}
      settings={settings}
      saving={settingsSaving}
      saveMessage={settingsSaveMessage}
      onChange={handleSettingsChange}
      onSave={handleSaveSettings}
      onReset={handleResetSettings}
      onLogout={handleLogout}
      showSettings={currentUserRole === 'admin'}
      isDarkMode={isDarkMode}
      onToggleDarkMode={handleToggleDarkMode}
      onCategoryAdded={loadAllCategories}
      existingInventoryCategories={availableInventoryCategories}
      sectionTitle={{ dashboard: 'Dashboard', product: 'Point of Sale', inventory: 'Inventory', staff: 'Staff Management', insights: 'Insights', reports: 'Reports & Analytics', alerts: 'Alerts', transactions: 'Transactions', fifo: 'FEFO Inventory' }[activeTab]}
      onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
    />
  ) : null;

  const renderContent = () => {
    const effectiveActiveTab = canAccessTab(currentUserRole, activeTab) ? activeTab : 'dashboard';

    // Helper: render a locked/no-access screen
    const renderLocked = (feature: string) => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-rose-500 mb-1">Access Restricted</p>
          <h2 className="text-xl font-black text-slate-800">No Permission</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            You don't have permission to access <span className="font-bold text-slate-700">{feature}</span>. Contact your administrator.
          </p>
        </div>
      </div>
    );

    switch (effectiveActiveTab) {
      case 'dashboard':
        if (currentUserRole === 'staff') {
          return (
            <StaffDashboardPanel
              assignedCategory={currentUserAssignedCategory}
              medicines={activeVisibleMedicines}
              healthyMeds={inventoryOverview.healthy}
              lowStockMeds={inventoryOverview.lowStock}
              criticalStockMeds={inventoryOverview.criticalStock}
              expiringSoonMeds={inventoryOverview.expiringSoon}
              expiredMeds={inventoryOverview.expired}
              onOpenInventory={() => setActiveTab('inventory')}
            />
          );
        }

        return (
          <DashboardPanelView
            lowStockCount={inventoryOverview.counts.low_stock}
            expiringSoonCount={inventoryOverview.counts.expiring_soon}
            todaySales={dashboardTodaySales}
            salesSeries={dashboardSalesSeries}
            predictiveRows={predictiveRows}
            monthOverMonth={dashboardMonthOverMonth}
            salesTrend={salesTrend}
            adminStats={adminStats}
            adminAlerts={adminAlerts}
            onMarkAlertRead={handleMarkAlertRead}
            userRole={currentUserRole}
            onRefreshAdminStats={fetchAdminStats}
            onViewInsights={() => setActiveTab('insights')}
            onViewStaff={() => setActiveTab('staff')}
            onViewInventory={(filter) => {
              const status = filter === 'low'
                ? 'low_stock'
                : filter === 'expiry'
                  ? 'expiring_soon'
                  : 'all';
              setInventoryFilterPreset({ category: 'all', status, timestamp: Date.now() });
              setActiveTab('inventory');
            }}
            onViewReports={() => setActiveTab('transactions')}
          />
        );

      case 'product':
        if (currentUserRole === 'staff' && staffPermissions && !staffPermissions.can_process_pos) {
          return renderLocked('Point of Sales');
        }
        return (
          <ProductPanel
            medicines={activeVisibleMedicines}
            onCompleteSale={handleCompleteSale}
            salesTrend={salesTrend}
            onModalOpenChange={setIsProductModalOpen}
            userRole={currentUserRole}
            assignedCategory={currentUserAssignedCategory}
            productTypeFilter={productTypeFilter}
            dosageFormFilter={dosageFormFilter}
            onProductTypeFilterChange={setProductTypeFilter}
            onDosageFormFilterChange={setDosageFormFilter}
          />
        );

      case 'fifo':
        return (
          <FifoPanel
            userRole={currentUserRole}
            userEmail={currentUserEmail}
          />
        );

      case 'transactions':
        if (currentUserRole === 'staff' && staffPermissions && !staffPermissions.can_view_reports) {
          return renderLocked('Transactions');
        }
        return (
          <TransactionPage
            onTransactionsChanged={fetchMedicines}
            canApproveVoids={currentUserRole !== 'staff' || !staffPermissions || staffPermissions.can_approve_voids}
          />
        );

      case 'inventory':
        if (currentUserRole === 'staff' && staffPermissions && !staffPermissions.can_adjust_inventory) {
          return renderLocked('Inventory');
        }
        return (
          <InventoryPanel
            medicines={visibleMedicines}
            lowStockMeds={inventoryOverview.lowStock}
            expiringSoonMeds={inventoryOverview.expiringSoon}
            purchaseNeededMeds={predictiveRows}
            addItemError={addItemError}
            editError={editError}
            editingMedicineId={editingMedicineId}
            savingMedicineId={savingMedicineId}
            deletingMedicineId={deletingMedicineId}
            addingItem={addingItem}
            isAddingMode={isAddingMode}
            newItemName={newItem.name}
            newItemCategory={newItem.category}
            newItemStock={newItem.stock}
            newItemReorderLevel={newItem.reorderLevel}
            newItemExpiry={newItem.expiry}
            newItemAvgDailySales={newItem.avgDailySales}
            newItemUnitPrice={newItem.unitPrice}
            newItemSupplier={newItem.supplier}
            newItemClassification={newItem.classification}
            newItemDosageForm={newItem.dosageForm}
            newItemStrength={newItem.strength}
            newItemVolume={newItem.volume}
            newItemManufacturer={newItem.manufacturer}
            newItemUnitType={newItem.unitType}
            newItemConversionFactor={newItem.conversionFactor}
            newItemLotNumber={newItem.lotNumber}
            newItemReceivedDate={newItem.receivedDate}
            newItemSellingPrice={newItem.sellingPrice}
            availableCategories={availableInventoryCategories}
            onNewItemChange={handleNewItemChange}
            onStartAddItem={handleStartAddItem}
            onCancelAddItem={handleCancelAddItem}
            onAddItem={handleAddItem}
            onAddChildProduct={handleAddChildProduct}
            onStartEditMedicine={handleStartEditMedicine}
            onCancelEditMedicine={handleCancelEditMedicine}
            onMedicineInputChange={handleMedicineInputChange}
            onSaveMedicine={handleSaveMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            onAddSupply={handleAddSupply}
            onUpdateSupplyPrice={handleUpdateSupplyPrice}
            onAdjustSupply={handleAdjustSupply}
            onArchiveSupply={handleArchiveSupply}
            onArchiveMedicine={handleArchiveMedicine}
            onRefreshMedicines={fetchMedicines}
            userRole={currentUserRole}
            assignedCategory={currentUserAssignedCategory}
            filterPreset={inventoryFilterPreset}
            inventoryThresholds={settings}
            promoCandidates={promoCandidates}
            promoRequestMedicineId={inventoryPromoRequestId}
          />
        );

      case 'staff':
        return (
          <StaffPanel
            staffMembers={staffMembers}
            defaultSettings={settings}
            availableCategories={availableInventoryCategories}
            loading={staffLoading}
            error={staffError}
            createError={createStaffError}
            creatingStaff={creatingStaff}
            savingStaffId={savingStaffId}
            onCreateStaff={handleCreateStaff}
            onAssignCategory={handleAssignStaffCategory}
            onDeleteStaff={handleDeleteStaff}
            onUpdateStaffStatus={handleUpdateStaffStatus}
            onUpdateStaffPermissions={handleUpdateStaffPermissions}
            onRefresh={loadStaffMembers}
            globalMedicines={medicines}
            globalSalesTrend={salesTrend}
            adminStats={adminStats}
            medicineAuditLogs={medicineAuditLogs}
            staffActivityLogs={staffActivityLogs}
            priceRequests={priceRequests}
            onFetchPriceRequests={fetchPriceUpdateRequests}
            onReviewPriceRequest={reviewPriceUpdateRequest}
            onNavigateToInventory={(category, status, staffId, staffName) => {
              setInventoryFilterPreset({ category, status, timestamp: Date.now(), staffId, staffName });
              setActiveTab('inventory');
            }}
          />
        );

      case 'reports':
        return (
          <ReportsPanel
            onDownloadMonthlySales={() => notify({ type: 'info', title: 'Preparing sales report', message: 'Monthly sales export is starting.' })}
            onDownloadInventoryStatus={() => notify({ type: 'info', title: 'Preparing inventory report', message: 'Inventory status export is starting.' })}
            onDownloadExpiryTracking={() => notify({ type: 'info', title: 'Preparing expiry report', message: 'Expiry tracking export is starting.' })}
            onViewMonthlySales={() => { }}
            onViewInventoryStatus={() => { }}
            onViewExpiryTracking={() => { }}
            onPrint={() => window.print()}
            salesTrend={salesTrend}
            medicines={medicines}
            inventoryThresholds={settings}
            onModalOpenChange={setIsReportsModalOpen}
            isDark={isDarkMode}
          />
        );

      case 'insights':
        return (
          <Insights
            medicines={medicines}
            salesTrend={salesTrend}
            formatPeso={formatPeso}
          />
        );

      case 'alerts':
        return <AlertsPanel statusCounts={inventoryOverview.counts} lowStockMeds={inventoryOverview.lowStock} criticalStockMeds={inventoryOverview.criticalStock} expiringSoonMeds={inventoryOverview.expiringSoon} expiredMeds={inventoryOverview.expired} healthyMeds={inventoryOverview.healthy} medicines={activeVisibleMedicines} notForSaleMeds={(inventoryOverview as any).notForSale} userRole={currentUserRole} inventoryThresholds={settings} />;

      default:
        return <div className="text-slate-300">Select a tab from the sidebar.</div>;
    }
  };

  return (
    <Routes>
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route
        path="/staff-login"
        element={
          <StaffLogin
            apiBase={API_BASE}
            token={token}
            currentRole={currentUserRole}
            onAuthSuccess={activateAuthenticatedSession}
          />
        }
      />
      <Route element={<ProtectedStaffRoute token={token} currentRole={currentUserRole} />}>
        <Route
          path="/staff"
          element={
            <div className={`flex min-h-screen flex-col md:flex-row transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
              <Sidebar
                logo={logo}
                tabs={visibleSidebarTabs}
                activeTab={activeTab}
                productTypeFilter={productTypeFilter}
                onProductTypeFilterChange={setProductTypeFilter}
                onDosageFormFilterChange={setDosageFormFilter}
                onTabChange={(tab) => {
                  if (canAccessTab(currentUserRole, tab)) {
                    setActiveTab(tab);
                  }
                }}
                alertSummary={alertSummary}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                onClose={closeSidebarOnMobile}
              />
              {isSidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-[60] bg-slate-950/45 md:hidden" />}
              {/* topbar-layout  */}
              <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-0 px-2 pb-2 pt-0 sm:px-3 sm:pb-3 md:ml-80">
                {appTopbar}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                  {renderContent()}
                </main>
              </div>
            </div>
          }
        />
      </Route>
      <Route
        path="/*"
        element={
          !token ? (
            <AuthCard
              authMode={authMode}
              fullName={fullName}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              authError={authError}
              authLoading={authLoading}
              forgotStep={forgotStep}
              forgotLoading={forgotLoading}
              forgotMessage={forgotMessage}
              forgotError={forgotError}
              resetCode={resetCode}
              resetNewPassword={resetNewPassword}
              resetConfirmPassword={resetConfirmPassword}
              onFullNameChange={setFullName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onSubmit={handleAuth}
              onStartForgotPassword={() => {
                setForgotStep('request');
                setForgotError('');
                setForgotMessage('');
              }}
              onCancelForgotPassword={() => {
                setForgotStep('none');
                setAuthError('');
                setForgotError('');
                setForgotMessage('');
                setForgotLoading(false);
                setResetCode('');
                setResetNewPassword('');
                setResetConfirmPassword('');
              }}
              onForgotRequest={handleForgotRequest}
              onResetCodeChange={setResetCode}
              onResetNewPasswordChange={setResetNewPassword}
              onResetConfirmPasswordChange={setResetConfirmPassword}
              onResetPassword={handleResetPassword}
              showSignupOption={canCreateAdmin}
              signupNotice={hasAdmin ? 'Create the second administrator account. Only 2 administrator accounts are allowed.' : undefined}
              onToggleMode={() => {
                setAuthMode((m) => (m === 'login' ? 'signup' : 'login'));
                setAuthError('');
                setForgotStep('none');
                setForgotError('');
                setForgotMessage('');
                setResetCode('');
                setResetNewPassword('');
                setResetConfirmPassword('');
                setLoginStep('credentials');
                setLoginOtp('');
                setOtpError('');
              }}
              apiBase={API_BASE}
              loginStep={loginStep}
              loginOtp={loginOtp}
              otpError={otpError}
              otpLoading={otpLoading}
              onLoginOtpChange={setLoginOtp}
              onVerifyOtp={handleVerifyOtp}
              onCancelOtp={() => {
                setLoginStep('credentials');
                setLoginOtp('');
                setOtpError('');
                setAuthError('');
              }}
            />
          ) : (
            <div className={`flex min-h-screen flex-col md:flex-row transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
              <Sidebar
                logo={logo}
                tabs={visibleSidebarTabs}
                activeTab={activeTab}
                productTypeFilter={productTypeFilter}
                onProductTypeFilterChange={setProductTypeFilter}
                onDosageFormFilterChange={setDosageFormFilter}
                onTabChange={(tab) => {
                  if (canAccessTab(currentUserRole, tab)) {
                    setActiveTab(tab);
                  }
                }}
                alertSummary={alertSummary}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                onClose={closeSidebarOnMobile}
              />
              {isSidebarOpen && <button type="button" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-[60] bg-slate-950/45 md:hidden" />}

              <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-0 px-2 pb-2 pt-0 sm:px-3 sm:pb-3 md:ml-80">
                {appTopbar}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                  {renderContent()}
                </main>
              </div>
            </div>
          )
        }
      />
    </Routes>
  );
}
