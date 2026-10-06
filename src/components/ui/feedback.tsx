import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type FeedbackType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: number;
  type: FeedbackType;
  title: string;
  message?: string;
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
};

type FeedbackContextValue = {
  notify: (toast: Omit<Toast, 'id'>) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastStyles: Record<FeedbackType, { icon: React.ReactNode; border: string; bg: string; text: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    border: 'border-sky-200',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const nextToastId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextToastId.current;
    nextToastId.current += 1;
    setToasts((current) => [{ ...toast, id }, ...current].slice(0, 4));
    window.setTimeout(() => dismissToast(id), 4200);
  }, [dismissToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ notify, confirm }), [confirm, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(92vw,24rem)] flex-col gap-3">
          {toasts.map((toast) => {
            const style = toastStyles[toast.type];
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto rounded-2xl border ${style.border} ${style.bg} p-4 text-sm shadow-2xl shadow-slate-900/10 backdrop-blur animate-fade-in`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900">{toast.title}</p>
                    {toast.message && <p className="mt-1 leading-5 text-slate-600">{toast.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                    aria-label="Close notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {confirmState && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${
              confirmState.tone === 'danger'
                ? 'border-rose-100 bg-rose-50 text-rose-600'
                : 'border-emerald-100 bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">{confirmState.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmState.message}</p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {confirmState.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition ${
                  confirmState.tone === 'danger'
                    ? 'bg-rose-600 shadow-rose-600/15 hover:bg-rose-700'
                    : 'bg-emerald-600 shadow-emerald-600/15 hover:bg-emerald-700'
                }`}
              >
                {confirmState.confirmLabel || 'Continue'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}
