import { XCircle, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Employee } from '../../../types';

const WEEKLY_OFF_DAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'จ' },
  { value: 2, label: 'อ' },
  { value: 3, label: 'พ' },
  { value: 4, label: 'พฤ' },
  { value: 5, label: 'ศ' },
  { value: 6, label: 'ส' },
  { value: 0, label: 'อา' },
];

export { WEEKLY_OFF_DAYS };

interface WeeklyOffDayEditorProps {
  open: boolean;
  employee: Employee | null;
  selectedDay: number | null;
  isSaving: boolean;
  onSelectDay: (day: number | null) => void;
  onClose: () => void;
  onSave: () => void;
}

export function WeeklyOffDayEditor({
  open,
  employee,
  selectedDay,
  isSaving,
  onSelectDay,
  onClose,
  onSave,
}: WeeklyOffDayEditorProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => !isSaving && onClose()}
      />
      <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-medium text-text-primary">วันหยุดประจำสัปดาห์</h3>
              <p className="text-sm font-medium text-brand-accent">
                {employee?.fullName || ''} · {employee?.employeeCode || ''}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {WEEKLY_OFF_DAYS.map((d) => {
              const isSelected = selectedDay === d.value;
              return (
                <button
                  key={d.value}
                  onClick={() => onSelectDay(d.value)}
                  className={cn(
                    'py-3 rounded-lg border text-sm font-medium transition-all active:scale-[0.98]',
                    isSelected
                      ? 'border-brand bg-brand/10 ring-1 ring-brand/20 text-text-primary'
                      : 'border-white/[0.05] hover:border-white/[0.12] bg-bg-surface text-text-tertiary',
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={() => onSelectDay(null)}
              disabled={isSaving}
              className="flex-1 py-3 bg-white/[0.04] text-text-tertiary border border-white/[0.06] rounded-lg text-sm font-medium hover:bg-white/[0.07] transition-colors disabled:opacity-50"
            >
              ไม่ตั้ง
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-brand/20 text-brand-accent border border-brand/20 rounded-lg text-sm font-medium hover:bg-brand/25 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin inline-block" />
              ) : (
                <>
                  <Check className="w-4 h-4 inline" /> บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
