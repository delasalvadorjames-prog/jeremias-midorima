import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PharmacySettings } from '../types';
import SettingsPanel from './SettingsPanel';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type Props = {
  logo: string;
  title: string;
  email: string;
  userName?: string;
  settings: PharmacySettings;
  saving: boolean;
  saveMessage: string;
  onChange: <K extends keyof PharmacySettings>(field: K, value: PharmacySettings[K]) => void;
  onSave: () => void;
  onReset: () => void;
  showSettings?: boolean;
   assignmentLabel?: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onCategoryAdded?: () => void;
  onDosageAlertConfigSaved?: () => void;
  existingInventoryCategories?: string[];
  sectionTitle?: string;
  onToggleSidebar?: () => void;
  onGoDashboard?: () => void;
};

const getInitials = (name?: string) => {
  const cleaned = (name || '').trim();
  if (!cleaned) return 'FL';

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getAvatarImageSrc = (email?: string) => {
  const initials = getInitials(email);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#047857;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f766e;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="url(#grad)" />
      <circle cx="60" cy="48" r="24" fill="#fef3c7" />
      <path d="M30 102c6-20 24-30 30-30s24 10 30 30" fill="#fef3c7" />
      <text x="60" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export default function Topbar({
  logo,
  title,
  email,
  userName,
  settings,
  saving,
  saveMessage,
  onChange,
  onSave,
  onReset,
  showSettings = true,
  assignmentLabel,
  isDarkMode = false,
  onToggleDarkMode,
  onCategoryAdded,
  onDosageAlertConfigSaved,
  onToggleSidebar,
  onGoDashboard,
  sectionTitle,
}: Props) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const isInsideTopbar = containerRef.current && target && containerRef.current.contains(target);
      const isInsideSettingsPanel = settingsPanelRef.current && target && settingsPanelRef.current.contains(target);

      if (!isInsideTopbar && !isInsideSettingsPanel) {
        setIsSettingsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSettingsOpen]);

  const displayName = userName || email?.split('@')[0] || 'User';
  const userEmail = email || 'user@example.com';

  // ── Sidebar color tokens ──
  const sidebarGradient = 'from-emerald-700 to-teal-800';

  // ── Subtle 3D button styles ──
  // Layered soft shadows — hindi matigas, hindi halata
  const btn3D = {
    base: `
      relative inline-flex items-center justify-center
      rounded-xl
      transition-all duration-200 ease-out
      active:translate-y-[1px]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    `,
    icon: isDarkMode
      ? `h-10 w-10
         bg-gradient-to-b from-slate-800 to-slate-800
         text-slate-300
         border border-slate-700/80
         shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
         hover:from-slate-700 hover:to-slate-700
         hover:text-white
         hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_6px_12px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]
         hover:-translate-y-[1px]
         focus-visible:ring-slate-500`
      : `h-10 w-10
         bg-gradient-to-b from-white to-slate-50/80
         text-slate-600
         border border-slate-200/80
         shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_-2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]
         hover:from-white hover:to-white
         hover:text-slate-900
         hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_14px_-2px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)]
         hover:-translate-y-[1px]
         focus-visible:ring-slate-400`,
    themeToggle: isDarkMode
      ? `h-10 w-10
         bg-gradient-to-b from-slate-800 to-slate-800
         text-amber-300
         border border-slate-700/80
         shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
         hover:from-slate-700 hover:to-slate-700
         hover:text-amber-200
         hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_6px_12px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]
         hover:-translate-y-[1px]
         focus-visible:ring-amber-500`
      : `h-10 w-10
         bg-gradient-to-b from-white to-slate-50/80
         text-amber-500
         border border-slate-200/80
         shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_-2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]
         hover:from-white hover:to-white
         hover:text-amber-600
         hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_14px_-2px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)]
         hover:-translate-y-[1px]
         focus-visible:ring-amber-400`,
    user: isDarkMode
      ? `gap-2 px-2 py-1.5
         bg-gradient-to-b from-slate-800 to-slate-800
         border border-slate-700/80
         shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
         hover:from-slate-700 hover:to-slate-700
         hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_6px_12px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]
         hover:-translate-y-[1px]
         focus-visible:ring-emerald-500`
      : `gap-2 px-2 py-1.5
         bg-gradient-to-b from-white to-slate-50/80
         border border-slate-200/80
         shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_10px_-2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]
         hover:from-white hover:to-white
         hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_14px_-2px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)]
         hover:-translate-y-[1px]
         focus-visible:ring-emerald-500`,
  };

  // ── Subtle 3D Avatar (soft lift) ──
  const avatar3DClass = `
    h-9 w-9 sm:h-10 sm:w-10
    rounded-lg
    bg-gradient-to-br ${sidebarGradient}
    text-sm font-bold text-white
    ring-1 ring-white/20
    shadow-[0_1px_2px_rgba(4,120,87,0.2),0_4px_10px_-2px_rgba(4,120,87,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]
    transition-all duration-200 ease-out
    group-hover:shadow-[0_1px_2px_rgba(4,120,87,0.25),0_6px_14px_-2px_rgba(4,120,87,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]
    group-hover:-translate-y-[1px]
  `;

  // ── Subtle 3D dropdown item ──
  const dropdownItem3D = `
    group/item cursor-pointer gap-2.5 py-2.5 px-3
    rounded-lg
    transition-all duration-200 ease-out
    active:translate-y-[1px]
  `;

  return (
    <header
      ref={containerRef}
      className={`sticky top-0 left-0 right-0 z-[60] mb-4 border-b transition-all ${
        isDarkMode
          ? 'border-slate-800 bg-slate-900/95 backdrop-blur-xl text-white shadow-lg shadow-slate-900/20'
          : 'border-slate-200 bg-white/95 backdrop-blur-xl text-slate-900 shadow-sm'
      }`}
    >
      {/* Top gradient accent */}
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${sidebarGradient}`} />

      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-3 sm:h-20 sm:px-6">

        {/* ── LEFT: Blangko (walang logo, walang title) ─────────────── */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile: Hamburger — 3D */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Open navigation"
              className={`${btn3D.base} ${btn3D.icon} md:hidden`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Assignment Label */}
          {assignmentLabel && (
            <div className="hidden lg:block">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isDarkMode
                    ? 'border border-slate-700 bg-slate-800 text-slate-300'
                    : 'border border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {assignmentLabel}
              </span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── RIGHT: Actions ────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">

          {/* Dashboard shortcut (mobile) — 3D */}
          {onGoDashboard && (
            <button
              type="button"
              onClick={onGoDashboard}
              aria-label="Open dashboard"
              className={`${btn3D.base} ${btn3D.icon} md:hidden`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z" />
              </svg>
            </button>
          )}

          {/* Dark Mode Toggle — 3D */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              className={`${btn3D.base} ${btn3D.themeToggle}`}
            >
              {isDarkMode ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          )}

          {/* User Dropdown — 3D trigger */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${btn3D.base} ${btn3D.user} group flex items-center transition-all sm:gap-3 sm:px-2.5 sm:py-2`}
            >
              <Avatar className={avatar3DClass}>
                <AvatarImage src={getAvatarImageSrc(email)} alt={email || 'Profile'} />
                <AvatarFallback className={`rounded-lg bg-gradient-to-br ${sidebarGradient} text-sm font-bold text-white`}>
                  {getInitials(email)}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left lg:block">
                <p className={`max-w-[140px] truncate text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {displayName}
                </p>
                <p className="max-w-[140px] truncate text-[11px] leading-tight text-slate-500">
                  {userEmail}
                </p>
              </div>

              <svg
                className={`hidden h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 lg:block ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className={`w-60 p-1.5 rounded-2xl border shadow-[0_4px_12px_-2px_rgba(15,23,42,0.12),0_12px_28px_-8px_rgba(15,23,42,0.2)] ${
                isDarkMode
                  ? 'border-slate-700/80 bg-slate-800 text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_12px_28px_-8px_rgba(0,0,0,0.5)]'
                  : 'border-slate-200/80 bg-white'
              }`}
              align="end"
            >
              <div className={`mb-1 border-b px-3 py-2.5 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{userEmail}</p>
              </div>

              {showSettings && (
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setIsSettingsOpen(true)}
                    className={`${dropdownItem3D} ${
                      isDarkMode
                        ? 'text-slate-200 hover:bg-slate-700/50 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <svg
                      className="h-4 w-4 transition-transform duration-300 group-hover/item:rotate-45"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}             
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Settings Portal */}
      {showSettings && isSettingsOpen &&
        createPortal(
          <div
            ref={settingsPanelRef}
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[3px]"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setIsSettingsOpen(false);
            }}
          >
            <div id="topbar-settings-panel" className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-xl">
                <SettingsPanel
                  settings={settings}
                  saving={saving}
                  saveMessage={saveMessage}
                  onChange={onChange}
                  onSave={onSave}
                  onReset={onReset}
                  onClose={() => setIsSettingsOpen(false)}
                  onCategoryAdded={onCategoryAdded}
                  onDosageAlertConfigSaved={onDosageAlertConfigSaved}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}