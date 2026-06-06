import { X, Check } from 'lucide-react';
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
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={() => !isSaving && onClose()}
      />
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">วันหยุดประจำสัปดาห์</h3>
              <p className="text-xs font-semibold text-brand-accent mt-0.5 truncate">
                {employee?.fullName || ''} · {employee?.employeeCode || ''}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0 disabled:opacity-50"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
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
                    'py-3 rounded-xl border text-sm font-bold transition-all active:scale-[0.98]',
                    isSelected
                      ? 'border-brand bg-brand/15 ring-1 ring-brand/30 text-text-primary'
                      : 'border-border-solid bg-white/50 hover:bg-white/80 hover:border-brand/40 text-text-secondary',
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
              className="flex-1 py-3 bg-bg-elevated text-text-tertiary border border-border-solid rounded-xl text-sm font-semibold hover:bg-white/80 transition-colors disabled:opacity-50"
            >
              ไม่ตั้ง
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" /> บันทึก
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
