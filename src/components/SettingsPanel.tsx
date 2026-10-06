import React, { useState, useMemo } from 'react';
import { PharmacySettings } from '../types';
import { useFeedback } from './ui/feedback';
import CategoryManagement from './CategoryManagement';
import SupplierManagement from './SupplierManagement';
import { Switch } from './ui/Switch';

type Props = {
  settings: PharmacySettings;
  saving: boolean;
  saveMessage: string;
  onChange: <K extends keyof PharmacySettings>(field: K, value: PharmacySettings[K]) => void;
  onSave: () => void;
  onReset: () => void;
  onClose?: () => void;
  onCategoryAdded?: () => void;
  onDosageAlertConfigSaved?: () => void;
  existingInventoryCategories?: string[];
  isDirty?: boolean;
};

type TabId =
  | 'general'
  | 'inventory'
  | 'notifications'
  | 'security'
  | 'categories'
  | 'suppliers';

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-emerald-400 hover:shadow-emerald-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1';

// ─── 3D Button styles ────────────────────────────────────────────────────────

const btn3D = {
  base: `
    relative inline-flex items-center justify-center gap-2
    transition-all duration-150 ease-out
    active:translate-y-[2px] active:shadow-none
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0
  `,
  primary: `
    rounded-xl px-5 py-2 text-sm font-bold
    bg-gradient-to-b from-emerald-500 to-emerald-600
    text-white
    shadow-[0_4px_0_0_#047857,0_6px_12px_-2px_rgba(4,120,87,0.4)]
    hover:from-emerald-400 hover:to-emerald-500
    hover:shadow-[0_4px_0_0_#047857,0_8px_16px_-2px_rgba(4,120,87,0.5)]
    focus-visible:ring-emerald-500
  `,
  secondary: `
    rounded-xl px-4 py-2 text-sm font-semibold
    bg-gradient-to-b from-white to-slate-50
    text-slate-700
    border border-slate-200
    shadow-[0_4px_0_0_#cbd5e1,0_6px_12px_-2px_rgba(15,23,42,0.15)]
    hover:from-slate-50 hover:to-slate-100
    hover:shadow-[0_4px_0_0_#94a3b8,0_8px_16px_-2px_rgba(15,23,42,0.2)]
    focus-visible:ring-slate-400
  `,
  tab: `
    flex-none whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold
    transition-all duration-150 ease-out
    active:translate-y-[2px] active:shadow-none
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  `,
  tabActive: `
    bg-gradient-to-b from-emerald-500 to-emerald-600
    text-white
    shadow-[0_3px_0_0_#047857,0_5px_10px_-2px_rgba(4,120,87,0.4)]
    hover:from-emerald-400 hover:to-emerald-500
    hover:shadow-[0_3px_0_0_#047857,0_7px_14px_-2px_rgba(4,120,87,0.5)]
    focus-visible:ring-emerald-500
  `,
  tabInactive: `
    bg-gradient-to-b from-white to-slate-50
    text-slate-600
    border border-slate-200
    shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.12)]
    hover:from-slate-50 hover:to-slate-100
    hover:text-slate-800
    hover:shadow-[0_3px_0_0_#94a3b8,0_6px_12px_-2px_rgba(15,23,42,0.18)]
    focus-visible:ring-slate-400
  `,
  close: `
    relative cursor-pointer rounded-xl p-2
    border border-white/10
    bg-gradient-to-b from-white/10 to-white/5
    text-slate-300
    shadow-[0_3px_0_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]
    hover:from-emerald-500/20 hover:to-emerald-500/10
    hover:border-emerald-400/60
    hover:text-white
    hover:shadow-[0_3px_0_0_rgba(0,0,0,0.35),0_6px_12px_-2px_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
    focus-visible:ring-emerald-500
  `,
  stepBtn: `
    inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
    bg-gradient-to-b from-white to-slate-50
    text-slate-700
    border border-slate-200
    shadow-[0_3px_0_0_#cbd5e1,0_4px_8px_-2px_rgba(15,23,42,0.15)]
    transition-all duration-150 ease-out
    hover:from-slate-50 hover:to-slate-100
    hover:text-emerald-700
    hover:border-emerald-300
    hover:shadow-[0_3px_0_0_#94a3b8,0_5px_10px_-2px_rgba(15,23,42,0.2)]
    active:translate-y-[2px] active:shadow-none
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0
  `,
};

// ─── Reusable primitives ─────────────────────────────────────────────────────

function SettingsCard({
  title,
  subtitle,
  action,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/60 transition-colors hover:border-emerald-200/70">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="px-6 py-6">{children}</div>
      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-[11px] text-slate-500">
          {footer}
        </div>
      )}
    </section>
  );
}

// ─── Number Stepper (− / +) ──────────────────────────────────────────────────

function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 3650,
  step = 1,
  suffix,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  ariaLabel?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const decrement = () => onChange(clamp(value - step));
  const increment = () => onChange(clamp(value + step));

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        aria-label={`Decrease ${ariaLabel ?? 'value'}`}
        className={btn3D.stepBtn}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>

      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          aria-label={ariaLabel}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(clamp(next));
          }}
          className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-800 shadow-sm outline-none transition hover:border-emerald-400 hover:shadow-emerald-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        aria-label={`Increase ${ariaLabel ?? 'value'}`}
        className={btn3D.stepBtn}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {suffix && (
        <span className="text-xs font-medium text-slate-500">{suffix}</span>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SettingsPanel({
  settings,
  saving,
  saveMessage,
  onChange,
  onSave,
  onReset,
  onClose,
  onCategoryAdded,
  onDosageAlertConfigSaved,
  existingInventoryCategories,
  isDirty = false,
}: Props) {
  const { notify } = useFeedback();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const passwordValid =
    newPassword.length >= 8 && newPassword === confirmPassword;

  const passwordFeedback = useMemo(() => {
    if (!newPassword && !confirmPassword) return null;
    if (newPassword.length > 0 && newPassword.length < 8) {
      return { tone: 'warn' as const, text: 'Password must be at least 8 characters.' };
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return { tone: 'warn' as const, text: 'Passwords do not match.' };
    }
    if (passwordValid) {
      return { tone: 'ok' as const, text: 'Ready to update.' };
    }
    return null;
  }, [newPassword, confirmPassword, passwordValid]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'categories', label: 'Categories' },
    { id: 'suppliers', label: 'Suppliers' },
  ];

  const footerTip =
    saveMessage ||
    (activeTab === 'inventory'
      ? 'Alert rules are saved separately with "Save Alert Rules".'
      : activeTab === 'security'
        ? 'Password changes are independent of the main Save Settings action.'
        : isDirty
          ? 'You have unsaved changes.'
          : 'Tip: Save your settings after each change.');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-700/70 bg-white shadow-2xl shadow-slate-950/40"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="relative flex shrink-0 items-start justify-between gap-4 overflow-hidden border-b border-slate-700/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 px-7 py-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
              System Settings
            </p>
            <h2 id="settings-title" className="mt-1.5 text-2xl font-bold tracking-tight">
              Pharmacy Configuration
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-300">
              Configure pharmacy profile, inventory rules, and notification preferences.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close settings"
              className={btn3D.close}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </header>

        {/* ── Tabs — 3D ──────────────────────────────────────────────── */}
        <nav
          role="tablist"
          aria-label="Settings sections"
          className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/90 px-5 py-3"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                onPointerDown={(e) => e.stopPropagation()}
                className={`${btn3D.tab} ${active ? btn3D.tabActive : btn3D.tabInactive}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50/80 px-6 py-7">
          <div className="mx-auto max-w-5xl space-y-5">
            {/* GENERAL */}
            {activeTab === 'general' && (
              <div
                id="panel-general"
                role="tabpanel"
                aria-labelledby="tab-general"
                className="space-y-5"
              >
                <SettingsCard
                  title="Pharmacy Profile"
                  subtitle="Basic information about your pharmacy"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={LABEL_CLASS}>Pharmacy Name</span>
                      <input
                        className={INPUT_CLASS}
                        value={settings.pharmacyName}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('pharmacyName', e.target.value)}
                        placeholder="e.g. Five L Pharmacy"
                        autoComplete="organization"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={LABEL_CLASS}>Branch Name</span>
                      <input
                        className={INPUT_CLASS}
                        value={settings.branchName}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('branchName', e.target.value)}
                        placeholder="e.g. Main Branch"
                      />
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className={LABEL_CLASS}>TIN</span>
                      <input
                        className={INPUT_CLASS}
                        value={settings.tin}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('tin', e.target.value)}
                        placeholder="e.g. 123-456-789-000"
                        inputMode="numeric"
                      />
                    </label>
                  </div>
                </SettingsCard>

                <SettingsCard
                  title="Contact & Operations"
                  subtitle="Address and operating details"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className={LABEL_CLASS}>Address</span>
                      <input
                        className={INPUT_CLASS}
                        value={settings.address}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('address', e.target.value)}
                        placeholder="e.g. 123 Main Street, Manila"
                        autoComplete="street-address"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={LABEL_CLASS}>Contact Number</span>
                      <input
                        className={INPUT_CLASS}
                        value={settings.contactNumber}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('contactNumber', e.target.value)}
                        placeholder="e.g. (02) 1234-5678"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className={LABEL_CLASS}>Official Email</span>
                      <input
                        type="email"
                        className={INPUT_CLASS}
                        value={settings.contactEmail}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('contactEmail', e.target.value)}
                        placeholder="e.g. info@fivel.com"
                        autoComplete="email"
                      />
                    </label>
                    <label className="grid gap-1.5 md:col-span-2">
                      <span className={LABEL_CLASS}>Operating Hours</span>
                      <input
                        className={INPUT_CLASS}
                        value={settings.operatingHours}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => onChange('operatingHours', e.target.value)}
                        placeholder="8:00 AM - 9:00 PM"
                      />
                    </label>
                  </div>
                </SettingsCard>
              </div>
            )}

            {/* INVENTORY */}
            {activeTab === 'inventory' && (
              <div
                id="panel-inventory"
                role="tabpanel"
                aria-labelledby="tab-inventory"
                className="space-y-5"
              >
                <SettingsCard
                  title="Inventory Defaults"
                  subtitle="Set stock and expiry rules for medicine products."
                  footer="Medicine thresholds remain unchanged and continue to apply only to medicine products."
                >
                  <div className="grid gap-4">
                    <div className="grid gap-1.5 md:grid-cols-2 md:gap-4">
                      <div className="grid gap-1.5">
                        <span className={LABEL_CLASS}>Critical Stock Alert</span>
                        <NumberStepper
                          value={settings.criticalStockAlertUnits ?? 5}
                          onChange={(v) => onChange('criticalStockAlertUnits', v)}
                          min={1}
                          max={100000}
                          step={1}
                          suffix="units or below"
                          ariaLabel="critical stock alert units"
                        />
                        <span className="text-[11px] text-slate-400">
                          Immediate restock warning. Default: 5 units.
                        </span>
                      </div>
                      <div className="grid gap-1.5">
                        <span className={LABEL_CLASS}>Low Stock Alert</span>
                        <NumberStepper
                          value={settings.lowStockAlertUnits}
                          onChange={(v) => onChange('lowStockAlertUnits', v)}
                          min={1}
                          max={100000}
                          step={1}
                          suffix="units or below"
                          ariaLabel="low stock alert units"
                        />
                        <span className="text-[11px] text-slate-400">
                          Replenishment warning. Default: 20 units.
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-1.5 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <span className={LABEL_CLASS}>Default Shelf Life</span>
                        <NumberStepper
                          value={settings.shelfLifeDays}
                          onChange={(v) => onChange('shelfLifeDays', v)}
                          min={1}
                          max={3650}
                          step={1}
                          suffix="days"
                          ariaLabel="default shelf life days"
                        />
                        <span className="text-[11px] text-slate-400">
                          Expiry is auto-calculated from Date Received. Click − or + to adjust.
                        </span>
                      </div>
                      <div className="grid gap-1.5">
                        <span className={LABEL_CLASS}>Expiry Alert</span>
                        <NumberStepper
                          value={settings.expiryAlertDays}
                          onChange={(v) => onChange('expiryAlertDays', v)}
                          min={1}
                          max={3650}
                          step={1}
                          suffix="days before expiry"
                          ariaLabel="medicine expiry alert days"
                        />
                        <span className="text-[11px] text-slate-400">
                          Notify when medicine products are approaching expiry. Default: 30 days.
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-bold text-slate-800">Non-Medicine Inventory Defaults</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Set default stock and expiry rules for soap, shampoo, diapers, lotion, wipes, and other personal-care products.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-1.5">
                          <span className={LABEL_CLASS}>Non-Medicine Critical Stock Alert</span>
                          <NumberStepper value={settings.nonMedicineCriticalStockAlertUnits} onChange={(v) => onChange('nonMedicineCriticalStockAlertUnits', v)} min={1} max={100000} step={1} suffix="units or below" ariaLabel="non-medicine critical stock alert units" />
                          <span className="text-[11px] text-slate-400">Immediate restock warning for non-medicine products. Default: 5 units.</span>
                        </div>
                        <div className="grid gap-1.5">
                          <span className={LABEL_CLASS}>Non-Medicine Low Stock Alert</span>
                          <NumberStepper value={settings.nonMedicineLowStockAlertUnits} onChange={(v) => onChange('nonMedicineLowStockAlertUnits', v)} min={1} max={100000} step={1} suffix="units or below" ariaLabel="non-medicine low stock alert units" />
                          <span className="text-[11px] text-slate-400">Replenishment warning for non-medicine products. Default: 10 units.</span>
                        </div>
                        <div className="grid gap-1.5">
                          <span className={LABEL_CLASS}>Non-Medicine Default Shelf Life</span>
                          <NumberStepper value={settings.nonMedicineShelfLifeDays} onChange={(v) => onChange('nonMedicineShelfLifeDays', v)} min={1} max={3650} step={1} suffix="days" ariaLabel="non-medicine shelf life days" />
                          <span className="text-[11px] text-slate-400">Used only when no explicit expiry date is provided. Default: 365 days.</span>
                        </div>
                        <div className="grid gap-1.5">
                          <span className={LABEL_CLASS}>Non-Medicine Expiry Alert</span>
                          <NumberStepper value={settings.nonMedicineExpiryAlertDays} onChange={(v) => onChange('nonMedicineExpiryAlertDays', v)} min={1} max={3650} step={1} suffix="days before expiry" ariaLabel="non-medicine expiry alert days" />
                          <span className="text-[11px] text-slate-400">Notify when a product is approaching expiry. Default: 30 days.</span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Non-Medicine Expiry Notifications</p>
                          <p className="mt-0.5 text-xs text-slate-500">Show expiring non-medicine products in inventory alerts.</p>
                        </div>
                        <Switch checked={settings.nonMedicineExpiryNotifications} onChange={(checked) => onChange('nonMedicineExpiryNotifications', checked)} />
                      </div>
                    </div>
                  </div>
                </SettingsCard>

              </div>
            )}

            {/* NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <section
                id="panel-notifications"
                role="tabpanel"
                aria-labelledby="tab-notifications"
                className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200/70"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Notification Preferences
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    How and when you get alerted
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-emerald-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        Two-Factor Authentication
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Require OTP on every admin login before an admin session is created.
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-emerald-700">
                        Admin login only · Staff login remains unchanged.
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireAdminOtp}
                      onChange={(checked) => onChange('requireAdminOtp', checked)}
                      label="Require OTP on admin login"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <span className={LABEL_CLASS}>Notify Before Expiry</span>
                  <NumberStepper
                    value={settings.expiryNotificationHours}
                    onChange={(v) => onChange('expiryNotificationHours', v)}
                    min={1}
                    max={720}
                    step={1}
                    suffix="hours"
                    ariaLabel="notify before expiry hours"
                  />
                  <span className="text-[11px] text-slate-400">
                    How many hours before expiry should the system notify you.
                  </span>
                </div>
              </section>
            )}

            {/* SECURITY */}
            {activeTab === 'security' && (
              <section
                id="panel-security"
                role="tabpanel"
                aria-labelledby="tab-security"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200/70"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Account Security</h4>
                  <p className="mt-0.5 text-xs text-slate-500">Update your password</p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className={LABEL_CLASS}>New Password</span>
                    <input
                      type="password"
                      className={INPUT_CLASS}
                      placeholder="••••••••"
                      value={newPassword}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={LABEL_CLASS}>Confirm Password</span>
                    <input
                      type="password"
                      className={INPUT_CLASS}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                {passwordFeedback && (
                  <p
                    role="status"
                    className={`mt-3 text-xs ${
                      passwordFeedback.tone === 'ok'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {passwordFeedback.text}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-sm text-xs text-slate-500">
                    Passwords must match and be at least 8 characters long.
                  </p>
                  <button
                    type="button"
                    disabled={!passwordValid}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      setNewPassword('');
                      setConfirmPassword('');
                      notify({
                        type: 'info',
                        title: 'Password update queued',
                        message: 'Password update flow is ready for backend integration.',
                      });
                    }}
                    className={`${btn3D.base} ${
                      passwordValid ? btn3D.primary : btn3D.secondary
                    }`}
                  >
                    Update Password
                  </button>
                </div>
              </section>
            )}

            {/* CATEGORIES */}
            {activeTab === 'categories' && (
              <div
                id="panel-categories"
                role="tabpanel"
                aria-labelledby="tab-categories"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200/70"
              >
                <CategoryManagement
                  onCategoryChanged={onCategoryAdded}
                  existingInventoryCategories={existingInventoryCategories}
                />
              </div>
            )}

            {/* SUPPLIERS */}
            {activeTab === 'suppliers' && (
              <div
                id="panel-suppliers"
                role="tabpanel"
                aria-labelledby="tab-suppliers"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-200/70"
              >
                <SupplierManagement />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-7 py-4">
          <p
            className={`text-sm transition-colors ${
              isDirty ? 'font-medium text-amber-600' : 'text-slate-500'
            }`}
          >
            {footerTip}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onReset}
              disabled={saving}
              className={`${btn3D.base} ${btn3D.secondary}`}
            >
              Reset Defaults
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onSave}
              disabled={saving}
              className={`${btn3D.base} ${btn3D.primary} ${
                isDirty
                  ? 'ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-white'
                  : ''
              }`}
            >
              {saving ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
