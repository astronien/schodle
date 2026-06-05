import { createContext, useContext } from 'react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextValue {
  showToast: (input: {
    kind?: ToastKind;
    title: string;
    description?: string;
    durationMs?: number;
  }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
