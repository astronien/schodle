import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Max width: 'sm' | 'md' | 'lg' | 'xl' | 'full' */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-2xl',
  full: 'sm:max-w-[95vw]',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;

    if (closeOnEscape) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) return;
    // Focus the first focusable element inside the modal
    const focusable = containerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable) {
      setTimeout(() => focusable.focus(), 50);
    } else {
      containerRef.current?.focus();
    }
    return () => {
      // Restore focus on close
      previousActiveRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />
      <div
        ref={containerRef}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay animate-slide-up border border-white/40 outline-none',
          sizeClasses[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border-solid">
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors"
                aria-label="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
