import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              variant === 'danger' ? 'bg-danger/15' : 'bg-warn/15',
            )}
          >
            {variant === 'danger' ? (
              <Trash2 className="w-5 h-5 text-danger" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warn" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-white',
              variant === 'danger'
                ? 'bg-danger hover:bg-danger/90'
                : 'bg-warn hover:bg-warn/90',
            )}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}