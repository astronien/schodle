import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from './utils';
import { ToastContext, type ToastContextValue } from './toast-context';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  durationMs: number;
}

const ICON_MAP: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLE_MAP: Record<ToastKind, string> = {
  success: 'border-success/30 bg-bg-surface',
  error: 'border-danger/30 bg-bg-surface',
  warning: 'border-warn/30 bg-bg-surface',
  info: 'border-brand/30 bg-bg-surface',
};

const ICON_TONE: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warn',
  info: 'text-brand-accent',
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>(
    ({ kind = 'info', title, description, durationMs = 4000 }) => {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, kind, title, description, durationMs }]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, description) => showToast({ kind: 'success', title, description }),
      error: (title, description) => showToast({ kind: 'error', title, description, durationMs: 6000 }),
      warning: (title, description) => showToast({ kind: 'warning', title, description }),
      info: (title, description) => showToast({ kind: 'info', title, description }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[200] inset-x-0 top-4 sm:top-auto sm:bottom-4 sm:right-4 sm:left-auto flex flex-col items-center gap-2 px-3 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const Icon = ICON_MAP[toast.kind];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto w-full sm:max-w-sm rounded-xl border shadow-overlay backdrop-blur-xl animate-slide-down flex items-start gap-3 p-3.5',
                STYLE_MAP[toast.kind]
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', ICON_TONE[toast.kind])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-tight">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-text-tertiary mt-0.5 leading-snug">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-text-quaternary hover:text-text-primary hover:bg-bg-surface transition-colors"
                aria-label="ปิดการแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
