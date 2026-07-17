import { useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { invokeEdgeFunction } from '../../lib/edge-functions';
import { cn } from '../../lib/utils';

interface ChangePasswordModalProps {
  open: boolean;
  force: boolean;
  onClose?: () => void;
  onSuccess: () => void;
}

// The form unmounts whenever the modal closes, so its state resets naturally
// on reopen — no reset-on-close effect needed.
export function ChangePasswordModal({ open, ...formProps }: ChangePasswordModalProps) {
  if (!open) return null;
  return <ChangePasswordForm {...formProps} />;
}

function ChangePasswordForm({ force, onClose, onSuccess }: Omit<ChangePasswordModalProps, 'open'>) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
      return;
    }
    if (!force && !currentPassword) {
      setError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }

    setIsSubmitting(true);
    try {
      await invokeEdgeFunction<{ success?: boolean; error?: string }>('change-password', {
        new_password: newPassword,
        current_password: force ? undefined : currentPassword,
      });
      setSuccess(true);
      setTimeout(() => onSuccess(), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm card p-6 animate-scale-in"
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              {force ? 'เปลี่ยนรหัสผ่านก่อนใช้งาน' : 'เปลี่ยนรหัสผ่าน'}
            </h2>
            <p className="text-xs text-text-tertiary">
              {force ? 'ระบบต้องการให้คุณตั้งรหัสผ่านใหม่ก่อน' : 'อัปเดตรหัสผ่านเพื่อความปลอดภัย'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-3 p-3 bg-success/10 border border-success/20 rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-success">เปลี่ยนรหัสผ่านสำเร็จ</p>
          </div>
        )}

        <div className="space-y-3">
          {!force && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                autoComplete="current-password"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          {!force && onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-ghost flex-1 text-xs"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || success}
            className={cn('btn btn-primary flex-1 text-xs', force && 'w-full')}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'บันทึกรหัสผ่านใหม่'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
