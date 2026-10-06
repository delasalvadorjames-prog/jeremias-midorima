import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface NonDismissableDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  children: React.ReactNode;
  onCancel?: () => void;
  onConfirm?: () => void | boolean | Promise<void | boolean>;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline';
  isLoading?: boolean;
}

export function NonDismissableDrawer({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  badgeText = 'Important Action',
  badgeColor = 'amber',
  children,
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmVariant = 'default',
  isLoading = false,
}: NonDismissableDrawerProps) {
  const isMobile = useIsMobile();
  const swipeDirection = isMobile ? 'down' : 'right';

  const badgeColors = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    let confirmed = true;
    if (onConfirm) {
      confirmed = (await onConfirm()) !== false;
    }
    if (confirmed) onOpenChange(false);
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
      showSwipeHandle={false}
    >
      <DrawerContent className="z-[110] inset-x-0 inset-y-1/2 mx-auto w-[calc(100%-2rem)] max-w-lg -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] max-h-[min(34rem,calc(100vh-2rem))]">
        <DrawerHeader className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-4 w-full">
            <div>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] px-2.5 py-1 rounded-lg border ${badgeColors[badgeColor]}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {badgeText}
              </span>
              <DrawerTitle className="mt-2 text-xl font-extrabold text-slate-900">
                {title}
              </DrawerTitle>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="px-6 py-5 overflow-y-auto flex-1 bg-white">
          {children}
        </div>

        <DrawerFooter className="flex flex-row gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-5">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={confirmVariant}
            className={`flex-1 rounded-xl font-semibold ${
              confirmVariant === 'default'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
                : confirmVariant === 'destructive'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20'
                : ''
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
