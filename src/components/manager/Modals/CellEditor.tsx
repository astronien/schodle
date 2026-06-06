import { XCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import type { Employee, ShiftType } from '../../../types';

interface CellEditorProps {
  open: boolean;
  employee: Employee | null;
  date: string;
  currentShiftId?: string;
  shiftTypes: ShiftType[];
  onAssign: (shiftTypeId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function CellEditor({
  open,
  employee,
  date,
  currentShiftId,
  shiftTypes,
  onAssign,
  onClear,
  onClose,
}: CellEditorProps) {
  if (!open) return null;

  const isOffDay =
    typeof employee?.weeklyOffDay === 'number' &&
    new Date(`${date}T00:00:00`).getDay() === employee.weeklyOffDay;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-border-solid">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-medium text-text-primary">แก้ไขกะงาน</h3>
              <p className="text-sm font-medium text-brand-accent">
                {employee?.fullName ?? ''} · {format(new Date(date), 'EEEE ที่ d MMM yyyy', { locale: th })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-bg-surface rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-bg-surface transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
            {shiftTypes
              .filter((t) => t.isVisible)
              .map((type) => {
                const isSelected = currentShiftId === type.id;
                const isDisabled = isOffDay && type.code !== 'X';
                return (
                  <button
                    key={type.id}
                    disabled={isDisabled}
                    onClick={() => onAssign(type.id)}
                    className={cn(
                      'flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 active:scale-[0.98]',
                      isSelected
                        ? 'border-brand bg-brand/10 ring-1 ring-brand/20'
                        : isDisabled
                        ? 'border-white/[0.03] bg-white/[0.02] opacity-40 cursor-not-allowed'
                        : 'border-border-solid hover:border-border-solid-light bg-bg-surface'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium text-white"
                        style={{ backgroundColor: type.color }}
                      >
                        {type.code}
                      </div>
                      <div className="text-left">
                        <p className={cn('font-medium text-sm', isDisabled ? 'text-text-quaternary' : 'text-text-primary')}>
                          {type.name}
                        </p>
                        <p className="text-xs text-text-tertiary font-medium">
                          {type.startTime} - {type.endTime}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-accent" />}
                  </button>
                );
              })}
          </div>

          {currentShiftId && (
            <button
              onClick={onClear}
              className="mt-3 w-full py-3 bg-danger/10 text-danger border border-danger/20 rounded-lg text-sm font-medium hover:bg-danger/20 transition-colors"
            >
              ลบกะออก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
