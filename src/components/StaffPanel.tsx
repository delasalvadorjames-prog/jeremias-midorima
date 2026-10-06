import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { NonDismissableDrawer } from './NonDismissableDrawer';
import { Badge, Button as FlowbiteButton } from 'flowbite-react';
import { DEFAULT_CATEGORIES } from '../data/constants';
import { PharmacySettings, StaffCreatePayload, StaffMember, Medicine, AdminDashboardStats, MedicineAuditLog, PriceUpdateRequest, StaffPermissions } from '../types';
import { loadStaffAccountSnapshots } from '../lib/accountStorage';
import { summarizeInventoryStatus } from '../lib/inventory';
import { DEFAULT_PERMISSIONS, mergeStaffPermissions } from '../lib/staffPermissions';
import { StaffActivityLog } from '../lib/activityLog';
import { DeleteConfirmationContent } from '@/components/DeleteConfirmationContent';
import { cn } from '@/lib/utils';


type Props = {
  staffMembers: StaffMember[];
  defaultSettings: PharmacySettings;
  availableCategories: string[];
  loading: boolean;
  error: string;
  createError: string;
  creatingStaff: boolean;
  savingStaffId: number | null;
  onCreateStaff: (payload: StaffCreatePayload) => Promise<boolean>;
  onAssignCategory: (staffId: number, category: string) => void;
  onDeleteStaff?: (staffId: number) => Promise<boolean>;
  onUpdateStaffStatus?: (staffId: number, status: 'active' | 'disabled' | 'suspended') => Promise<void>;
  onUpdateStaffPermissions?: (staffId: number, permissions: StaffPermissions) => Promise<void>;
  onNavigateToInventory?: (category: string, status: string, staffId?: number, staffName?: string) => void;
  onRefresh: () => void;
  globalMedicines: Medicine[];
  globalSalesTrend: any[];
  adminStats?: AdminDashboardStats | null;
  medicineAuditLogs?: MedicineAuditLog[];
  staffActivityLogs?: StaffActivityLog[];
  priceRequests?: PriceUpdateRequest[];
  onFetchPriceRequests?: () => void;
  onReviewPriceRequest?: (requestId: number, action: 'approve' | 'reject', remarks?: string) => Promise<void>;
};

export default function StaffPanel({
  staffMembers,
  defaultSettings,
  availableCategories,
  loading,
  error,
  createError,
  creatingStaff,
  savingStaffId,
  onCreateStaff,
  onAssignCategory,
  onDeleteStaff,
  onUpdateStaffStatus,
  onUpdateStaffPermissions,
  onNavigateToInventory,
  onRefresh,
  globalMedicines,
  globalSalesTrend,
  adminStats,
  medicineAuditLogs = [],
  staffActivityLogs = [],
  priceRequests = [],
  onFetchPriceRequests,
  onReviewPriceRequest,
}: Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('staff123');
  const [showPassword, setShowPassword] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [staffCategories, setStaffCategories] = useState<string[]>([]);
  const [editedCategories, setEditedCategories] = useState<string[]>([]);
  const [editedStatus, setEditedStatus] = useState<'active' | 'disabled' | 'suspended'>('active');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedPriceRequest, setSelectedPriceRequest] = useState<PriceUpdateRequest | null>(null);
  const [requestFilter, setRequestFilter] = useState<'all' | 'price' | 'damages' | 'count_correction' | 'expired'>('all');
  const [selectedAuditLog, setSelectedAuditLog] = useState<MedicineAuditLog | null>(null);
  const [permissions, setPermissions] = useState<StaffPermissions>({ ...DEFAULT_PERMISSIONS });
  const [isStaffRequestOpen, setIsStaffRequestOpen] = useState(false);
  const [requestAction, setRequestAction] = useState<'approve' | 'reject' | null>(null);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...DEFAULT_CATEGORIES, ...availableCategories].filter(Boolean))).sort(),
    [availableCategories]
  );

  const snapshots = useMemo(
    () => loadStaffAccountSnapshots({ medicines: globalMedicines, settings: defaultSettings, salesTrend: globalSalesTrend }, staffMembers, defaultSettings),
    [defaultSettings, staffMembers, globalMedicines, globalSalesTrend]
  );

  const selectedSnapshot = useMemo(() => {
    if (selectedStaffId === null) return null;
    return snapshots.find((snapshot) => snapshot.staff.id === selectedStaffId) || null;
  }, [selectedStaffId, snapshots]);

  const selectedSummary = selectedSnapshot
    ? summarizeInventoryStatus(selectedSnapshot.state.medicines, defaultSettings)
    : summarizeInventoryStatus([], defaultSettings);

  const totalStock = selectedSnapshot
    ? selectedSnapshot.state.medicines.reduce((sum, medicine) => sum + medicine.stock, 0)
    : 0;

  const recentAuditLogs = (medicineAuditLogs && medicineAuditLogs.length > 0)
    ? medicineAuditLogs
    : (adminStats?.recent_activities ?? []);

  const getRequestMedicineName = (request: PriceUpdateRequest) =>
    request.medicine_name || `Supply #${request.inventory_id ?? request.id}`;

  const getRequestBy = (request: PriceUpdateRequest) =>
    request.requested_by || request.updated_by || 'Staff';

  const getCurrentPrice = (request: PriceUpdateRequest) =>
    Number(request.current_price ?? request.old_price ?? 0);

  const getRequestedPrice = (request: PriceUpdateRequest) =>
    Number(request.requested_price ?? request.new_price ?? 0);

  const filteredRequests = priceRequests.filter((request) => {
    if (requestFilter === 'all') return true;
    if (requestFilter === 'price') return !request.adjustment_type;
    return request.adjustment_type === requestFilter;
  });

  const getRequestTypeLabel = (request: PriceUpdateRequest) => {
    if (!request.adjustment_type) return 'Price Update';
    if (request.adjustment_type === 'count_correction') return 'Count Correction';
    return request.adjustment_type.charAt(0).toUpperCase() + request.adjustment_type.slice(1);
  };

  const selectedStaffActivityItems = useMemo(() => {
    if (!selectedSnapshot) return [];

    const aliases = new Set(
      [
        selectedSnapshot.staff.full_name,
        selectedSnapshot.staff.identifier,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase())
    );

    const medicineActivities = recentAuditLogs
      .filter((log: MedicineAuditLog) => aliases.has((log.performed_by || '').toLowerCase()))
      .map((log: MedicineAuditLog) => ({
        id: `audit-${log.id}`,
        text: `${log.action_type} — ${log.medicine_name}`,
        detail: log.new_value || log.old_value || '',
        timestamp: log.timestamp,
        source: 'medicine' as const,
      }));

    const localActivities = staffActivityLogs
      .filter((log) => log.staffId === selectedSnapshot.staff.id)
      .map((log) => ({
        id: `staff-${log.id}`,
        text: log.action,
        detail: log.detail || '',
        timestamp: log.timestamp,
        source: 'staff' as const,
      }));

    return [...medicineActivities, ...localActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [recentAuditLogs, selectedSnapshot, staffActivityLogs]);

  const isMobile = useIsMobile();
  const swipeDirection = isMobile ? 'down' : 'right';

  const handleSubmitStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (staffCategories.length === 0) {
      setCategoryError('Please assign at least one category to this staff account.');
      return;
    }

    const created = await onCreateStaff({
      full_name: staffName,
      identifier: staffUsername,
      password: staffPassword,
      assigned_category: staffCategories.join(', '),
    });
    if (created) {
      setStaffName('');
      setStaffUsername('');
      setStaffPassword('staff123');
      setShowPassword(false);
      setCategoryError('');
      setStaffCategories([]);
      setIsCreateDropdownOpen(false);
      setIsAddStaffModalOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
  };

  const getAvatarColor = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-50 text-blue-600 border-blue-100',
      'bg-emerald-50 text-emerald-600 border-emerald-100',
      'bg-purple-50 text-purple-600 border-purple-100',
      'bg-amber-50 text-amber-600 border-amber-100',
      'bg-rose-50 text-rose-600 border-rose-100',
      'bg-indigo-50 text-indigo-600 border-indigo-100',
      'bg-cyan-50 text-cyan-600 border-cyan-100',
    ];
    return colors[hash % colors.length];
  };

  // ── 3D Button Classes ──
  const BTN_3D_EMERALD = `
    relative inline-flex items-center justify-center gap-2.5
    rounded-2xl px-6 py-3 text-sm font-bold text-white
    bg-gradient-to-b from-emerald-500 to-emerald-600
    ring-1 ring-emerald-400/40
    shadow-[0_6px_0_0_#047857,
            0_10px_20px_-4px_rgba(5,150,105,0.5),
            inset_0_2px_0_rgba(255,255,255,0.35),
            inset_0_-2px_4px_rgba(0,0,0,0.15)]
    transition-all duration-150
    hover:from-emerald-400 hover:to-emerald-500
    hover:shadow-[0_6px_0_0_#047857,
                  0_12px_24px_-4px_rgba(5,150,105,0.6),
                  inset_0_2px_0_rgba(255,255,255,0.4),
                  inset_0_-2px_4px_rgba(0,0,0,0.15)]
    active:translate-y-[4px]
    active:shadow-[0_2px_0_0_#047857,
                  inset_0_2px_0_rgba(255,255,255,0.2)]
  `;

  const BTN_3D_SLATE = `
    relative inline-flex items-center justify-center gap-2
    rounded-2xl px-5 py-2.5 text-sm font-bold text-slate-700
    bg-gradient-to-b from-white to-slate-100
    ring-1 ring-slate-300
    shadow-[0_5px_0_0_#cbd5e1,
            0_8px_16px_-4px_rgba(15,23,42,0.15),
            inset_0_2px_0_rgba(255,255,255,0.9),
            inset_0_-2px_4px_rgba(0,0,0,0.05)]
    transition-all duration-150
    hover:from-slate-50 hover:to-slate-100
    hover:text-slate-900
    hover:shadow-[0_5px_0_0_#94a3b8,
                  0_10px_20px_-4px_rgba(15,23,42,0.2),
                  inset_0_2px_0_rgba(255,255,255,1),
                  inset_0_-2px_4px_rgba(0,0,0,0.05)]
    active:translate-y-[3px]
    active:shadow-[0_2px_0_0_#94a3b8,
                  inset_0_2px_0_rgba(255,255,255,0.5)]
  `;

  const BTN_3D_ROSE = `
    relative inline-flex items-center justify-center gap-2
    rounded-xl px-4 py-2.5 text-sm font-bold text-rose-700
    bg-gradient-to-b from-rose-50 to-rose-100
    ring-1 ring-rose-200
    shadow-[0_4px_0_0_#fda4af,
            0_6px_12px_-3px_rgba(244,63,94,0.3),
            inset_0_1px_0_rgba(255,255,255,0.9),
            inset_0_-1px_2px_rgba(0,0,0,0.05)]
    transition-all duration-150
    hover:from-rose-100 hover:to-rose-100
    hover:text-rose-800
    active:translate-y-[3px]
    active:shadow-[0_1px_0_0_#fda4af,
                  inset_0_1px_0_rgba(255,255,255,0.5)]
  `;

  const BTN_3D_EMERALD_LG = `
    relative inline-flex items-center justify-center gap-2
    rounded-xl px-6 py-2.5 text-sm font-bold text-white
    bg-gradient-to-b from-emerald-500 to-emerald-600
    ring-1 ring-emerald-400/40
    shadow-[0_5px_0_0_#047857,
            0_8px_16px_-3px_rgba(5,150,105,0.5),
            inset_0_2px_0_rgba(255,255,255,0.35)]
    transition-all duration-150
    hover:from-emerald-400 hover:to-emerald-500
    active:translate-y-[3px]
    active:shadow-[0_2px_0_0_#047857,
                  inset_0_1px_0_rgba(255,255,255,0.2)]
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  // ── 3D Card Base ──
  const CARD_3D_BASE = `
    relative rounded-2xl border-2
    bg-gradient-to-b from-white to-slate-50/80
    transition-all duration-200
    shadow-[0_4px_0_0_rgba(148,163,184,0.35),
            0_8px_20px_-6px_rgba(15,23,42,0.15),
            inset_0_1px_0_rgba(255,255,255,0.9)]
  `;

  return (
    <section className="space-y-8">
      {/* Premium Header Banner */}
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-8 shadow-lg shadow-slate-200/30">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-emerald-50/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 -mb-12 h-32 w-32 rounded-full bg-blue-50/40 blur-2xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50/80 px-3 py-1 rounded-lg border border-emerald-100/50 backdrop-blur-sm">
                  Directory
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 bg-slate-50/80 px-3 py-1 rounded-lg border border-slate-100">
                  {snapshots.length} Active Accounts
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Staff Accounts & Access Controls</h1>
              <p className="mt-1.5 text-sm text-slate-500 max-w-3xl leading-relaxed">
                Perform secure staff registration, sync operational categories, manage account status levels, and monitor system activity logs.
              </p>
            </div>
          </div>
          {/* ✅ 3D Add Staff Button */}
          <button
            type="button"
            onClick={() => setIsAddStaffModalOpen(true)}
            className={BTN_3D_EMERALD}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff Member
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/80 to-white p-4 text-sm font-semibold text-rose-700 shadow-sm animate-in slide-in-from-top-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Add Staff Drawer (HINDI 3D — ganun pa din) */}
      <Drawer
        showSwipeHandle={isMobile}
        swipeDirection={swipeDirection}
        open={isAddStaffModalOpen}
        onOpenChange={setIsAddStaffModalOpen}
      >
        <DrawerContent
          className={cn(
            'z-[110]',
            'max-h-65vh',
            'min-h-[30vh]',
            'overflow-y-auto',
            'overflow-y-hidden',
            'rounded-3xl',
            'border border-slate-200',
            'bg-white',
            'shadow-[0_24px_80px_rgba(15,23,42,0.24)]',
            'w-full',
            'sm:max-w-lg',
            'mx-auto',
            'custom-scrollbar'
          )}
        >
          <DrawerHeader className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-6 pb-5 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                  Security Gate
                </span>
                <DrawerTitle className="mt-2 text-2xl font-extrabold text-slate-900">
                  Add Staff Member
                </DrawerTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Define login details and category scope for new team member.
                </p>
              </div>
              <DrawerClose
                render={
                  <button
                    type="button"
                    className="rounded-full p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                }
              />
            </div>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <form id="add-staff-form" onSubmit={handleSubmitStaff} className="space-y-5">
              <div className="space-y-4">
                {/* Full Name */}
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Full Name
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      placeholder="e.g. Stephanie Yap"
                      value={staffName}
                      onChange={(event) => setStaffName(event.target.value)}
                      required
                    />
                  </div>
                </label>

                {/* Username */}
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Username / Identifier
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <span className="text-sm font-bold font-mono">@</span>
                    </div>
                    <input
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      placeholder="e.g. stephanie2"
                      value={staffUsername}
                      onChange={(event) => setStaffUsername(event.target.value)}
                      required
                    />
                  </div>
                </label>

                {/* Password */}
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Password Access
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 py-3.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      placeholder="Default password"
                      value={staffPassword}
                      onChange={(event) => setStaffPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                {/* Categories Dropdown */}
                <div className="relative block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Assign Categories
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  >
                    <span className="truncate text-slate-600 font-medium">
                      {staffCategories.length > 0
                        ? `Selected (${staffCategories.length})`
                        : 'Assign categories...'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isCreateDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isCreateDropdownOpen && (
                    <div className="relative z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg custom-scrollbar animate-in slide-in-from-top-2">
                      {categoryOptions.map((category) => (
                        <label key={category} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 cursor-pointer rounded-xl transition-all">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                            checked={staffCategories.includes(category)}
                            onChange={(e) => {
                              setCategoryError('');
                              if (e.target.checked) {
                                setStaffCategories((prev) => [...prev, category]);
                              } else {
                                setStaffCategories((prev) => prev.filter((c) => c !== category));
                              }
                            }}
                          />
                          <span className="text-sm font-semibold text-slate-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {(createError || categoryError) && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-2 bg-rose-50 p-3.5 rounded-xl border border-rose-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                  {createError || categoryError}
                </p>
              )}
            </form>
          </div>

          <DrawerFooter className="shrink-0 border-t border-slate-100 bg-gradient-to-br from-white to-slate-50 px-6 py-4">
            <div className="flex flex-col gap-3">
              {/* ✅ 3D Submit Button */}
              <button
                type="submit"
                form="add-staff-form"
                disabled={creatingStaff}
                className={`${BTN_3D_EMERALD} w-full !py-3.5 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {creatingStaff ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Add Staff Member'
                )}
              </button>
              <DrawerClose
                render={
                  <button
                    type="button"
                    className={`${BTN_3D_SLATE} w-full`}
                  >
                    Cancel
                  </button>
                }
              />
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Main Staff Directory List */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-12">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="sr-only">Requests</span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Records</span>
                  <h2 className="text-lg font-black text-slate-900">Staff Accounts Directory</h2>
                </div>
              </div>
              {loading ? (
                <div className="flex h-5 w-5 items-center justify-center">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                  {snapshots.length} Accounts
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[420px] pr-1 custom-scrollbar">
              {snapshots.map((snapshot) => {
                const summary = summarizeInventoryStatus(snapshot.state.medicines, defaultSettings);
                const isSelected = selectedSnapshot?.staff.id === snapshot.staff.id;
                const initials = getInitials(snapshot.staff.full_name);
                const colorClasses = getAvatarColor(snapshot.staff.full_name);

                return (
                  <button
                    key={snapshot.staff.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(snapshot.staff.id);
                      setEditedCategories((snapshot.staff.assigned_category || '').split(',').map(s => s.trim()).filter(Boolean));
                      setEditedStatus(snapshot.staff.account_status || 'active');
                      setPermissions(mergeStaffPermissions(snapshot.staff.id, snapshot.staff));
                    }}
                    className={`w-full text-left rounded-2xl border-2 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-emerald-500 bg-gradient-to-r from-emerald-50/50 to-white shadow-lg shadow-emerald-100/30 ring-1 ring-emerald-500'
                        : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center font-extrabold text-sm shadow-sm transition-all ${colorClasses} ${isSelected ? 'scale-105' : ''}`}>
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-extrabold text-slate-800 text-sm tracking-tight">{snapshot.staff.full_name}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                            (snapshot.staff.account_status || 'active') === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : (snapshot.staff.account_status || 'active') === 'disabled'
                                ? 'bg-slate-50 text-slate-500 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              (snapshot.staff.account_status || 'active') === 'active' ? 'bg-emerald-600 animate-pulse' :
                              (snapshot.staff.account_status || 'active') === 'disabled' ? 'bg-slate-400' : 'bg-amber-600'
                            }`} />
                            {snapshot.staff.account_status || 'active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">@{snapshot.staff.identifier}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                          {snapshot.staff.last_login
                            ? `Last active: ${new Date(snapshot.staff.last_login).toLocaleString()}`
                            : 'Never active'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 border-t border-slate-100 pt-3 md:border-none md:pt-0">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(snapshot.staff.assigned_category || 'Unassigned').split(',').map((cat, idx) => (
                          <span key={idx} className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                            {cat.trim()}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-bold text-slate-700">{snapshot.state.medicines.length} products</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-rose-600 font-bold">{summary.counts.low_stock} Critical</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-amber-600 font-bold">{summary.counts.expiring_soon} Expiring</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!loading && snapshots.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                  <span className="sr-only">No staff</span>
                  <p className="text-base font-bold text-slate-700">No staff members found</p>
                  <p className="text-sm text-slate-400 mt-1">Use the "Add Staff Member" button to assign the first account.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Audit Logs Table & Price Requests */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/30 animate-in slide-in-from-bottom-4 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="sr-only">Security</span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Medicine Audit Logs</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click details to compare before-and-after database snapshots side-by-side.</p>
            </div>
          </div>
          {/* ✅ 3D Requests Button */}
          <button
            type="button"
            className={BTN_3D_SLATE}
            onClick={() => {
              onFetchPriceRequests?.();
              setIsRequestModalOpen(true);
              setSelectedPriceRequest(priceRequests.length === 1 ? priceRequests[0] : null);
            }}
          >
            <span className="text-sm">Requests</span>
            <Badge className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-100">
              {priceRequests.length}
            </Badge>
          </button>
        </div>

        {/* Price Requests Drawer (HINDI 3D — ganun pa din) */}
        {!selectedPriceRequest ? (
          <Drawer
            open={isRequestModalOpen}
            onOpenChange={setIsRequestModalOpen}
            showSwipeHandle={true}
            swipeDirection="down"
          >
            <DrawerContent className="h-[min(78dvh,42rem)] max-h-[calc(100dvh-1rem)] rounded-t-3xl bg-white/95 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.15)]">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/5 to-transparent pointer-events-none rounded-t-3xl" />
              <DrawerHeader className="relative border-b-2 border-slate-100/80 bg-white/60 px-4 py-3 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4 w-full">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/20">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700 border border-sky-200">
                        Review Queue
                      </span>
                      <DrawerTitle className="mt-1.5 text-xl font-black text-slate-900">
                        Pending Requests
                      </DrawerTitle>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'} awaiting review
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                    aria-label="Close drawer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </DrawerHeader>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Filter requests</span>
                  <select
                    value={requestFilter}
                    onChange={(event) => setRequestFilter(event.target.value as typeof requestFilter)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-sky-500"
                  >
                    <option value="all">All Requests</option>
                    <option value="price">Price Updates</option>
                    <option value="damages">Damages</option>
                    <option value="count_correction">Count Correction</option>
                    <option value="expired">Expired</option>
                  </select>
                </label>
                {filteredRequests.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-6 text-center">
                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-600">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No pending requests for this filter.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRequests.map((request, index) => (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => setSelectedPriceRequest(request)}
                        className="group relative w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-md hover:-translate-y-0.5"
                      >
                        {index === 0 && (
                          <span className="absolute -top-2 -right-2 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white shadow-lg">
                            NEW
                          </span>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{getRequestMedicineName(request)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Requested by <span className="font-semibold text-slate-600">{getRequestBy(request)}</span>
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold uppercase text-sky-700 border border-sky-200 group-hover:bg-sky-200 transition-colors">
                            {getRequestTypeLabel(request)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {request.adjustment_type ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                              Qty: <span className="font-black">{request.old_quantity ?? 0} → {request.new_quantity ?? 0}</span>
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                Current: <span className="font-black text-slate-800">₱{getCurrentPrice(request).toFixed(2)}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                Requested: <span className="font-black">₱{getRequestedPrice(request).toFixed(2)}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <DrawerFooter className="border-t-2 border-slate-100 bg-white/80 p-3 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className={`${BTN_3D_SLATE} w-full`}
                >
                  Close Drawer
                </button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <NonDismissableDrawer
            isOpen={isRequestModalOpen}
            onOpenChange={() => {
              setSelectedPriceRequest(null);
              setIsRequestModalOpen(false);
            }}
            title={`Review ${getRequestTypeLabel(selectedPriceRequest)}`}
            badgeText="Inventory Request Review"
            badgeColor="blue"
            onCancel={() => {
              setSelectedPriceRequest(null);
              setIsRequestModalOpen(false);
            }}
            onConfirm={async () => {
              if (selectedPriceRequest) {
                await onReviewPriceRequest?.(selectedPriceRequest.id, 'approve');
                setSelectedPriceRequest(null);
                setIsRequestModalOpen(false);
              }
            }}
            confirmText="Approve Request"
            cancelText="Back to List"
          >
            <div className="space-y-5">
              <div className="rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="sr-only">Medicine</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Medicine</p>
                    <p className="mt-0.5 text-base font-extrabold text-slate-900">{getRequestMedicineName(selectedPriceRequest)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-slate-50/50 p-3 border border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Requested by</p>
                  <p className="text-sm font-bold text-slate-800">{getRequestBy(selectedPriceRequest)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative rounded-xl bg-white p-4 shadow-sm border-2 border-slate-200">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{selectedPriceRequest.adjustment_type ? 'Current Quantity' : 'Current Price'}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {selectedPriceRequest.adjustment_type ? selectedPriceRequest.old_quantity : `₱${getCurrentPrice(selectedPriceRequest).toFixed(2)}`}
                  </p>
                </div>
                <div className="relative rounded-xl bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm border-2 border-emerald-200">
                  <span className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white shadow-lg">NEW</span>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-600">{selectedPriceRequest.adjustment_type ? 'Requested Quantity' : 'Requested Price'}</p>
                  <p className="mt-2 text-2xl font-black text-emerald-700">
                    {selectedPriceRequest.adjustment_type ? selectedPriceRequest.new_quantity : `₱${getRequestedPrice(selectedPriceRequest).toFixed(2)}`}
                  </p>
                </div>
              </div>

              {selectedPriceRequest.reason && (
                <div className="rounded-xl bg-amber-50/50 p-4 border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="sr-only">Notes</span>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-bold">Reason for Request</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{selectedPriceRequest.reason}</p>
                </div>
              )}

              {selectedPriceRequest.created_at && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="sr-only">Date</span>
                  Requested {new Date(selectedPriceRequest.created_at).toLocaleString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedPriceRequest) {
                      await onReviewPriceRequest?.(selectedPriceRequest.id, 'reject');
                      setSelectedPriceRequest(null);
                      setIsRequestModalOpen(false);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-rose-200 bg-white text-sm font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Request
                </button>
              </div>
            </div>
          </NonDismissableDrawer>
        )}

        {/* Audit Log Table */}
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500 font-medium">Track all medicine changes and price updates</p>
            </div>
            {recentAuditLogs.length > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                {recentAuditLogs.length} entr{recentAuditLogs.length === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-white border-b-2 border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                  <th className="px-5 py-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Action Type</th>
                  <th className="px-5 py-3.5">Medicine Name</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAuditLogs.length > 0 ? (
                  recentAuditLogs.map((log: MedicineAuditLog) => {
                    const actionColor =
                      log.action_type === 'medicine added' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      log.action_type === 'medicine deleted' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      log.action_type === 'stock changes' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      log.action_type.includes('price update') ? 'bg-sky-50 text-sky-800 border-sky-200' :
                      'bg-blue-50 text-blue-800 border-blue-200';

                    const isStaffPriceUpdate = log.action_type.includes('price update') && log.role === 'staff';

                    return (
                      <tr
                        key={log.id}
                        className={`group transition-all ${isStaffPriceUpdate ? 'bg-sky-50/30' : 'hover:bg-slate-50/50'}`}
                      >
                        <td className="px-5 py-3.5 text-slate-500 text-xs font-medium whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border ${actionColor}`}>
                            {isStaffPriceUpdate ? (
                              <>
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                                Staff Price Update
                              </>
                            ) : (
                              log.action_type
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          <span className="flex items-center gap-2">
                            <span className="sr-only">Medicine</span>
                            {log.medicine_name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <span className="font-semibold text-slate-700">{log.performed_by}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border border-slate-200">
                            {log.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedAuditLog(log)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-emerald-600 group-hover:border-emerald-300 group-hover:bg-emerald-50/50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Compare
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center">
                        <span className="sr-only">No activity</span>
                        <p className="text-sm font-bold text-slate-500">No activity recorded</p>
                        <p className="text-xs text-slate-400 mt-1">Changes will appear here in real-time</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Detailed Changes / Diff Modal Popup (HINDI 3D — ganun pa din) */}
      {selectedAuditLog && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Medicine Audit Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedAuditLog.action_type === 'stock changes'
                    ? 'Action: Stock Adjusted'
                    : selectedAuditLog.action_type.includes('price update')
                      ? selectedAuditLog.action_type === 'price update request'
                        ? 'Action: Price Update Requested'
                        : 'Action: Price Updated'
                      : `Action: ${selectedAuditLog.action_type}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-slate-200/80 text-slate-500 transition-all focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50/30 to-white">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Medicine</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">{selectedAuditLog.medicine_name}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Performed By</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">{selectedAuditLog.role === 'staff' ? 'Staff' : selectedAuditLog.role} - {selectedAuditLog.performed_by}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50/50 to-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-1.5">
                    Before
                  </p>
                  <div className="space-y-2 text-sm text-slate-700">
                    {(selectedAuditLog.old_value || 'None (New Record Added)').split('\n').map((line, idx) => (
                      <p key={idx} className="whitespace-pre-wrap font-medium">{line}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
                    After
                  </p>
                  <div className="space-y-2 text-sm text-slate-700">
                    {(selectedAuditLog.new_value || 'None (Record Deleted)').split('\n').map((line, idx) => (
                      <p key={idx} className="whitespace-pre-wrap font-medium">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
              {selectedAuditLog.new_value?.includes('Reason:') && (
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-amber-600">Reason</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{selectedAuditLog.new_value.split('\n').find((line) => line.startsWith('Reason:'))?.replace('Reason: ', '')}</p>
                </div>
              )}
              <div className="rounded-xl bg-slate-50/50 p-4 border border-slate-100">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{new Date(selectedAuditLog.timestamp).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-all shadow-lg shadow-slate-800/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Staff Detail Modal (HINDI 3D — ganun pa din) */}
      {selectedSnapshot && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg flex flex-col max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                    Account Profile
                  </span>
                  <h2 className="mt-1.5 text-xl font-black text-slate-900 tracking-tight truncate">{selectedSnapshot.staff.full_name}</h2>
                  <p className="text-xs font-mono text-slate-400">@{selectedSnapshot.staff.identifier}</p>
                </div>
                <div className="relative flex-shrink-0 w-48">
                  <span className="text-[10px] font-extrabold text-slate-500 block mb-1.5">Categories Assigned</span>
                  <button
                    type="button"
                    onClick={() => setIsEditDropdownOpen(!isEditDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <span className="truncate">
                      {editedCategories.length > 0
                        ? `Scope (${editedCategories.length})`
                        : 'No assigned scope'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isEditDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isEditDropdownOpen && (
                    <div className="absolute top-[100%] left-0 z-50 mt-1.5 w-full max-h-[180px] overflow-y-auto rounded-xl border-2 border-slate-200 bg-white p-2 shadow-xl animate-in slide-in-from-top-2">
                      {categoryOptions.map((category) => (
                        <label key={category} className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-all">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                            checked={editedCategories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditedCategories(prev => [...prev, category]);
                              } else {
                                setEditedCategories(prev => prev.filter(c => c !== category));
                              }
                            }}
                          />
                          <span className="text-xs font-semibold text-slate-700">{category}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Stats Grid — ✅ 3D */}
              <div className="p-5 grid gap-3 grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToInventory?.('all', 'all', selectedSnapshot.staff.id, selectedSnapshot.staff.full_name);
                    setSelectedStaffId(null);
                  }}
                  className={`${CARD_3D_BASE} border-slate-200 p-4 text-left
                    hover:-translate-y-[2px] hover:border-slate-300
                    hover:shadow-[0_6px_0_0_rgba(148,163,184,0.4),
                                  0_12px_24px_-6px_rgba(15,23,42,0.2),
                                  inset_0_1px_0_rgba(255,255,255,0.9)]
                    active:translate-y-[2px]
                    active:shadow-[0_2px_0_0_rgba(148,163,184,0.4)]`}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stock</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 tracking-tight">{totalStock}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateToInventory?.('all', 'low_stock', selectedSnapshot.staff.id, selectedSnapshot.staff.full_name);
                    setSelectedStaffId(null);
                  }}
                  className={`${CARD_3D_BASE} border-amber-200/70 bg-gradient-to-b from-white to-amber-50/40 p-4 text-left
                    hover:-translate-y-[2px] hover:border-amber-300
                    hover:shadow-[0_6px_0_0_rgba(245,158,11,0.4),
                                  0_12px_24px_-6px_rgba(217,119,6,0.2),
                                  inset_0_1px_0_rgba(255,255,255,0.9)]
                    active:translate-y-[2px]
                    active:shadow-[0_2px_0_0_rgba(245,158,11,0.4)]`}
                >
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Low Stock</p>
                  <p className="mt-1 text-2xl font-black text-amber-700 tracking-tight">{selectedSummary.counts.low_stock}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateToInventory?.('all', 'expiring_soon', selectedSnapshot.staff.id, selectedSnapshot.staff.full_name);
                    setSelectedStaffId(null);
                  }}
                  className={`${CARD_3D_BASE} border-rose-200/70 bg-gradient-to-b from-white to-rose-50/40 p-4 text-left
                    hover:-translate-y-[2px] hover:border-rose-300
                    hover:shadow-[0_6px_0_0_rgba(244,63,94,0.4),
                                  0_12px_24px_-6px_rgba(225,29,72,0.2),
                                  inset_0_1px_0_rgba(255,255,255,0.9)]
                    active:translate-y-[2px]
                    active:shadow-[0_2px_0_0_rgba(244,63,94,0.4)]`}
                >
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Expiring</p>
                  <p className="mt-1 text-2xl font-black text-rose-700 tracking-tight">{selectedSummary.counts.expiring_soon}</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateToInventory?.('all', 'healthy', selectedSnapshot.staff.id, selectedSnapshot.staff.full_name);
                    setSelectedStaffId(null);
                  }}
                  className={`${CARD_3D_BASE} border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 p-4 text-left
                    hover:-translate-y-[2px] hover:border-emerald-300
                    hover:shadow-[0_6px_0_0_rgba(16,185,129,0.4),
                                  0_12px_24px_-6px_rgba(5,150,105,0.2),
                                  inset_0_1px_0_rgba(255,255,255,0.9)]
                    active:translate-y-[2px]
                    active:shadow-[0_2px_0_0_rgba(16,185,129,0.4)]`}
                >
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Healthy</p>
                  <p className="mt-1 text-2xl font-black text-emerald-700 tracking-tight">{selectedSummary.counts.healthy}</p>
                </button>
              </div>

              {/* Account Security Level */}
              <div className="px-5 pb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">Account Security Level</span>
                <div className="flex flex-wrap gap-2">
                  {(['active', 'disabled', 'suspended'] as const).map((status) => (
                    <label key={status} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 transition-all ${
                      editedStatus === status
                        ? 'bg-slate-900 border-slate-900 text-white font-bold shadow-lg'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="account_status"
                        value={status}
                        checked={editedStatus === status}
                        onChange={() => setEditedStatus(status)}
                        className="h-3.5 w-3.5 text-slate-900 focus:ring-slate-950 border-slate-300"
                      />
                      <span className="text-xs font-bold capitalize tracking-tight">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Permissions Section — ✅ 3D */}
              <div className="px-5 pb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block mb-2.5">Permissions</span>
                <div className="grid gap-2">
                  {([
                    { key: 'can_process_pos', label: 'Can Process POS' },
                    { key: 'can_view_reports', label: 'Can View Reports' },
                    { key: 'can_adjust_inventory', label: 'Can Adjust Inventory' },
                    { key: 'can_approve_voids', label: 'Can Approve Voids' },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const updated = { ...permissions, [key]: !permissions[key] };
                        setPermissions(updated);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 ${
                        permissions[key]
                          ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/60 to-white ring-1 ring-emerald-200 shadow-[0_3px_0_0_rgba(16,185,129,0.35),0_6px_12px_-3px_rgba(5,150,105,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-[1px] hover:shadow-[0_4px_0_0_rgba(16,185,129,0.4),0_8px_16px_-3px_rgba(5,150,105,0.25),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(16,185,129,0.3)]'
                          : 'border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-[0_3px_0_0_rgba(148,163,184,0.3),0_6px_12px_-3px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_4px_0_0_rgba(148,163,184,0.4),0_8px_16px_-3px_rgba(15,23,42,0.15),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(148,163,184,0.3)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${
                          permissions[key] ? 'bg-emerald-600 border-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]' : 'bg-white border-slate-300'
                        }`}>
                          {permissions[key] && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                        permissions[key] ? 'bg-white text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {permissions[key] ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="px-5 pb-5">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block mb-2.5">Recent Activity Log</span>
                <div className="rounded-xl border-2 border-slate-100 overflow-hidden divide-y divide-slate-100">
                  {selectedStaffActivityItems.length === 0 ? (
                    <div className="px-4 py-6 bg-white text-center text-sm font-semibold text-slate-400">
                      <span className="sr-only">No activity</span>
                      No recorded activity yet.
                    </div>
                  ) : (
                    selectedStaffActivityItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-slate-50/50 transition-all">
                        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700">{item.text}</p>
                          {item.detail && (
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{item.detail}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer — ✅ 3D Buttons */}
            <div className="flex-shrink-0 flex items-center justify-between border-t-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
              {onDeleteStaff ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(selectedSnapshot.staff);
                    setSelectedStaffId(null);
                    setIsEditDropdownOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  disabled={savingStaffId === selectedSnapshot.staff.id}
                  className={BTN_3D_ROSE}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Account
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(null);
                    setIsEditDropdownOpen(false);
                  }}
                  className={BTN_3D_SLATE}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const newAssignment = editedCategories.join(', ');
                    if (newAssignment !== selectedSnapshot.staff.assigned_category) {
                      onAssignCategory(selectedSnapshot.staff.id, newAssignment);
                    }
                    if (editedStatus !== (selectedSnapshot.staff.account_status || 'active')) {
                      await onUpdateStaffStatus?.(selectedSnapshot.staff.id, editedStatus);
                    }
                    await onUpdateStaffPermissions?.(selectedSnapshot.staff.id, permissions);
                    setSelectedStaffId(null);
                    setIsEditDropdownOpen(false);
                  }}
                  disabled={savingStaffId === selectedSnapshot.staff.id}
                  className={BTN_3D_EMERALD_LG}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Account Confirmation (HINDI 3D — Drawer pa din) */}
      <NonDismissableDrawer
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete Staff Account"
        badgeText="Critical Action"
        badgeColor="rose"
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return false;
          const deleted = await onDeleteStaff?.(deleteTarget.id);
          if (deleted) {
            setIsDeleteConfirmOpen(false);
            setDeleteTarget(null);
          }
          return deleted === true;
        }}
        confirmText="Delete Account"
        cancelText="Keep Account"
        confirmVariant="destructive"
      >
        <DeleteConfirmationContent
          staff={deleteTarget}
        />
      </NonDismissableDrawer>

      {/* Non-Dismissable Staff Request Confirmation Drawer (HINDI 3D) */}
      <NonDismissableDrawer
        isOpen={isStaffRequestOpen}
        onOpenChange={setIsStaffRequestOpen}
        title="Confirm Staff Request"
        badgeText="Important Action"
        badgeColor="amber"
        onCancel={() => setRequestAction(null)}
        onConfirm={async () => {
          if (requestAction === 'approve') {
            console.log('Staff request approved');
          } else if (requestAction === 'reject') {
            console.log('Staff request rejected');
          }
          setRequestAction(null);
        }}
        confirmText={requestAction === 'approve' ? 'Approve Request' : 'Confirm Action'}
        cancelText="Cancel"
      >
        <div className="bg-gradient-to-br from-amber-50/80 to-white border-2 border-amber-200 rounded-xl p-5">
          <p className="text-sm text-slate-700 leading-relaxed">
            This drawer cannot be dismissed by clicking outside or dragging. You must use one of the buttons below to proceed with your staff request action. Please confirm you have reviewed all details before proceeding.
          </p>
        </div>
      </NonDismissableDrawer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-top-2 {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-from-bottom-4 {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation-duration: 0.25s;
          animation-fill-mode: both;
        }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </section>
  );
}