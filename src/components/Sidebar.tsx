import React, { useEffect, useState } from 'react';
import logo from '../assets/Fivel.png';
import { AlertFilter, TabId, DosageFormFilter } from '../types';

type TabItem = { id: TabId; label: string };
type ProductTypeFilter = 'all' | 'generic' | 'branded';

type AlertSummary = {
  total: number;
  expired: number;
  criticalStock: number;
  lowStock: number;
  expiringSoon: number;
  healthy: number;
};

type Props = {
  logo: string;
  tabs: TabItem[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  productTypeFilter: ProductTypeFilter;
  onProductTypeFilterChange: (value: ProductTypeFilter) => void;
  onDosageFormFilterChange: (value: DosageFormFilter) => void;
  alertFilter: AlertFilter;
  onAlertFilterChange: (value: AlertFilter) => void;
  alertSummary: AlertSummary;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
};

const buttonBaseClass =
  'group flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-sans font-medium tracking-normal transition-all duration-150';

const LayoutDashboardIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const ShoppingCartIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const BoxIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const BarChart3Icon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <line x1="12" y1="3" x2="12" y2="15" />
    <line x1="19" y1="3" x2="19" y2="21" />
    <line x1="5" y1="21" x2="5" y2="9" />
  </svg>
);

const BellIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const InsightsIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <polyline points="3 3 7 7 21 7" />
    <line x1="21" y1="7" x2="21" y2="17" />
    <polyline points="21 17 17 21 3 21" />
    <line x1="3" y1="21" x2="3" y2="11" />
  </svg>
);

const CpuIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
  </svg>
);

const UsersIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const renderTabIcon = (tabId: TabId, isActive: boolean) => {
  const iconClass = isActive
    ? 'h-6 w-6 text-white'
    : 'h-6 w-6 text-white/70 group-hover:text-white transition-colors';
  switch (tabId) {
    case 'dashboard':
      return <LayoutDashboardIcon className={iconClass} />;
    case 'product':
      return <ShoppingCartIcon className={iconClass} />;
    case 'inventory':
      return <BoxIcon className={iconClass} />;
    case 'staff':
      return <UsersIcon className={iconClass} />;
    case 'insights':
      return <InsightsIcon className={iconClass} />;
    case 'reports':
      return <BarChart3Icon className={iconClass} />;
    case 'alerts':
      return <BellIcon className={iconClass} />;
    case 'transactions':
      return <CpuIcon className={iconClass} />;
    default:
      return null;
  }
};

const PRODUCT_TYPES: { label: string; value: Exclude<ProductTypeFilter, 'all'> }[] = [
  { label: 'Generic', value: 'generic' },
  { label: 'Branded', value: 'branded' },
];

const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ALERT_FILTERS: { label: string; value: Exclude<AlertFilter, 'all'>; countKey: keyof Omit<AlertSummary, 'total'> }[] = [
  { label: 'Critical', value: 'critical_stock', countKey: 'criticalStock' },
  { label: 'Low stock', value: 'low_stock', countKey: 'lowStock' },
  { label: 'Expiring', value: 'expiring_soon', countKey: 'expiringSoon' },
  { label: 'Expired', value: 'expired', countKey: 'expired' },
  { label: 'Good', value: 'healthy', countKey: 'healthy' },
];

export default function Sidebar({
  logo,
  tabs,
  activeTab,
  onTabChange,
  productTypeFilter,
  onProductTypeFilterChange,
  onDosageFormFilterChange,
  alertFilter,
  onAlertFilterChange,
  alertSummary,
  onLogout,
  isOpen = true,
  onClose,
}: Props) {
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(activeTab === 'product');
  const [isAlertMenuOpen, setIsAlertMenuOpen] = useState(activeTab === 'alerts');

  useEffect(() => {
    setIsProductMenuOpen(activeTab === 'product');
    setIsAlertMenuOpen(activeTab === 'alerts');
  }, [activeTab]);

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    onClose?.();
    if (tabId === 'product') {
      setIsProductMenuOpen((open) => activeTab !== 'product' || !open);
      setIsAlertMenuOpen(false);
      return;
    }
    if (tabId === 'alerts') {
      onAlertFilterChange('all');
      setIsAlertMenuOpen((open) => activeTab !== 'alerts' || !open);
      setIsProductMenuOpen(false);
      return;
    }
    setIsProductMenuOpen(false);
    setIsAlertMenuOpen(false);
  };

  const handleProductTypeClick = (value: Exclude<ProductTypeFilter, 'all'>) => {
    onTabChange('product');
    onProductTypeFilterChange(value);
    onDosageFormFilterChange('all');
    setIsProductMenuOpen(true);
    onClose?.();
  };

  const handleAlertFilterClick = (value: Exclude<AlertFilter, 'all'>) => {
    onTabChange('alerts');
    onAlertFilterChange(value);
    setIsAlertMenuOpen(true);
    onClose?.();
  };

  function WorkspaceSwitcher({ selected, onSelect }: { selected?: string; onSelect?: (ws: string) => void }) {
    return null;
  }

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-[70] flex w-[min(320px,calc(100vw-1rem))] flex-col overflow-hidden
        bg-gradient-to-b
        from-[#059669]
        via-[#0F766E]
        to-[#1E293B]
        text-white
        p-4 pt-14
        shadow-[0_20px_60px_rgba(15,118,110,0.25)]
        border-r border-white/10
        transition-transform duration-200 md:w-[320px] md:translate-x-0
        ${isOpen
          ? 'translate-x-0 opacity-100'
          : '-translate-x-full opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto'}`}
    >
      {/* Top Gradient Accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/30 via-white/50 to-white/30" />

      {/* ══════════════════════════════════════════════════════════════════
          LOGO & BRAND — SUBTLE SOFT CARD
          ══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex items-center gap-3 mb-6 rounded-2xl p-3
          bg-gradient-to-b from-white/[0.14] to-white/[0.06]
          ring-1 ring-white/15
          shadow-[0_1px_2px_rgba(0,0,0,0.08),
                  0_6px_16px_-4px_rgba(0,0,0,0.25),
                  inset_0_1px_0_rgba(255,255,255,0.18)]"
      >
        {/* Top shine */}
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full" />

        <div
          className="relative h-14 w-14 rounded-xl flex items-center justify-center p-2
            bg-gradient-to-br from-white/20 to-white/5
            ring-1 ring-white/20
            shadow-[0_1px_2px_rgba(0,0,0,0.1),
                    0_4px_10px_-2px_rgba(0,0,0,0.2),
                    inset_0_1px_0_rgba(255,255,255,0.25)]"
        >
          <img src={logo} alt="Five-L logo" className="h-full w-full object-contain rounded-lg drop-shadow-sm" />
          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#0F766E] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-lg font-bold text-white truncate drop-shadow-sm">
            Five-L Pharmacy
          </div>
          <div className="text-sm text-white/70 font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            Operations Portal
          </div>
        </div>
      </div>

      <WorkspaceSwitcher />

      {/* Navigation Tabs — flat professional */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-2 mt-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showAlertBadge = tab.id === 'alerts' && alertSummary.total > 0;
          const isProductTab = tab.id === 'product';
          const shouldShowProductMenu = isProductTab && isProductMenuOpen;
          const isAlertsTab = tab.id === 'alerts';
          const shouldShowAlertMenu = isAlertsTab && isAlertMenuOpen;

          return (
            <div key={tab.id} className="flex flex-col gap-1.5">
              <button
                className={`group relative flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(0,0,0,0.15)] ring-1 ring-white/20'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                style={{ paddingLeft: '18px' }}
                onClick={() => handleTabClick(tab.id)}
                type="button"
                aria-expanded={isProductTab ? shouldShowProductMenu : isAlertsTab ? shouldShowAlertMenu : undefined}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-1 rounded-r-full bg-white" />
                )}

                <div className="flex items-center gap-3.5">
                  {renderTabIcon(tab.id, isActive)}
                  <span className="text-base font-medium tracking-normal truncate">{tab.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {showAlertBadge && (
                    <span className="flex items-center justify-center min-w-[24px] h-6 px-2 text-[11px] font-bold rounded-full bg-white text-[#0F766E] shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                      {alertSummary.total}
                    </span>
                  )}
                  {isProductTab && (
                    <ChevronDownIcon
                      className={`h-5 w-5 text-white/60 transition-transform duration-300 ${shouldShowProductMenu ? 'rotate-90' : ''}`}
                    />
                  )}
                  {isAlertsTab && (
                    <ChevronDownIcon
                      className={`h-5 w-5 text-white/60 transition-transform duration-300 ${shouldShowAlertMenu ? 'rotate-90' : ''}`}
                    />
                  )}
                </div>
              </button>

              {/* Product Type Submenu */}
              {shouldShowProductMenu && (
                <div className="ml-9 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  {PRODUCT_TYPES.map((type) => {
                    const isSelected = productTypeFilter === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleProductTypeClick(type.value)}
                        className={`relative flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-white/25 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_10px_-2px_rgba(0,0,0,0.2)]'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-white" />
                        )}
                        <span>{type.label}</span>
                        {isSelected && (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Alert status submenu */}
              {shouldShowAlertMenu && (
                <div className="ml-9 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  {ALERT_FILTERS.map((filter) => {
                    const isSelected = alertFilter === filter.value;
                    const count = filter.countKey === 'expired'
                      ? alertSummary.expired
                      : alertSummary[filter.countKey];
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => handleAlertFilterClick(filter.value)}
                        className={`relative flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? 'bg-white/25 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_10px_-2px_rgba(0,0,0,0.2)]'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-white" />}
                        <span>{filter.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ${isSelected ? 'bg-white text-emerald-700' : 'bg-white/15 text-white'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LOGOUT — SUBTLE SOFT BUTTON
          ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-auto pt-4 border-t border-white/15 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onLogout}
          className="group relative flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-semibold
            bg-gradient-to-b from-white/[0.14] to-white/[0.06]
            text-white
            ring-1 ring-white/15
            shadow-[0_1px_2px_rgba(0,0,0,0.08),
                    0_5px_14px_-4px_rgba(0,0,0,0.25),
                    inset_0_1px_0_rgba(255,255,255,0.18)]
            transition-all duration-200
            hover:from-white/[0.18] hover:to-white/[0.1]
            hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),
                          0_7px_18px_-4px_rgba(0,0,0,0.3),
                          inset_0_1px_0_rgba(255,255,255,0.22)]
            hover:-translate-y-[1px]
            active:translate-y-[1px] active:shadow-none"
        >
          {/* Top shine */}
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full" />

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:translate-x-0.5 drop-shadow-sm"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes slide-in-from-top-2 {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation-duration: 0.25s;
          animation-fill-mode: both;
        }
        .slide-in-from-top-2 {
          animation-name: slide-in-from-top-2;
        }
      `}</style>
    </aside>
  );
}