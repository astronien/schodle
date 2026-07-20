import { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { validateAssignShift } from '../../../lib/conflict-validator';
import type { Employee, ScheduleEntry, ShiftType } from '../../../types';
import { MoveOffDayModal } from './MoveOffDayModal';

interface CellEditorProps {
  open: boolean;
  employee: Employee | null;
  date: string;
  currentShiftId?: string;
  shiftTypes: ShiftType[];
  schedules: ScheduleEntry[];
  employees: Employee[];
  onAssign: (shiftTypeId: string) => void;
  onClear: () => void;
  onClose: () => void;
  onMoveOffDay?: (originalDate: string, newDate: string, shiftTypeId: string) => void;
}

export function CellEditor({
  open,
  employee,
  date,
  currentShiftId,
  shiftTypes,
  schedules,
  employees,
  onAssign,
  onClear,
  onClose,
  onMoveOffDay,
}: CellEditorProps) {
  const [selectedTmp, setSelectedTmp] = useState<string | null>(null);
  const [showMoveOffDayModal, setShowMoveOffDayModal] = useState(false);

  const selectedId = selectedTmp || currentShiftId || null;

  const xShift = shiftTypes.find((t) => t.code === 'X');
  const isCurrentShiftOffDay = currentShiftId === xShift?.id;

  const warnings = useMemo(() => {
    if (!selectedId || !employee) return [];
    return validateAssignShift(employee.id, date, selectedId, schedules, employees, shiftTypes);
  }, [selectedId, employee, date, schedules, employees, shiftTypes]);

  if (!open) return null;

  const handleAssign = (shiftTypeId: string) => {
    setSelectedTmp(shiftTypeId);
    onAssign(shiftTypeId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40 max-h-[90vh] flex flex-col">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
        <div className="p-5 flex flex-col min-h-0 flex-1">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">แก้ไขกะงาน</h3>
              <p className="text-xs font-semibold text-brand-accent mt-0.5 truncate">
                {employee?.fullName ?? ''} ·{' '}
                {format(new Date(`${date}T00:00:00`), 'EEEE ที่ d MMM yyyy', { locale: th })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2 p-2.5 rounded-xl border text-xs',
                    w.severity === 'error'
                      ? 'text-danger bg-danger/10 border-danger/20'
                      : 'text-warn bg-warn/10 border-warn/20',
                  )}
                >
                  {w.severity === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{w.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-1 -mr-1 flex-1">
            {shiftTypes
              .filter((t) => t.isVisible)
              .map((type) => {
                const isSelected = currentShiftId === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleAssign(type.id)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]',
                      isSelected
                        ? 'border-brand bg-brand/15 ring-1 ring-brand/30'
                        : 'border-border-solid bg-white/50 hover:bg-white/80 hover:border-brand/40',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: type.color }}
                      >
                        {type.code}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-sm truncate text-text-primary">
                          {type.name}
                        </p>
                        <p className="text-xs text-text-tertiary font-medium">
                          {type.startTime} - {type.endTime}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />}
                  </button>
                );
              })}
          </div>

          {currentShiftId && (
            <button
              onClick={onClear}
              className="mt-3 w-full py-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-semibold hover:bg-danger/20 transition-colors shrink-0"
            >
              ลบกะออก
            </button>
          )}

          {isCurrentShiftOffDay && onMoveOffDay && (
            <button
              onClick={() => setShowMoveOffDayModal(true)}
              className="mt-2 w-full py-3 bg-warn/10 text-warn border border-warn/20 rounded-xl text-sm font-semibold hover:bg-warn/20 transition-colors shrink-0 flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              ย้ายวันหยุดไปวันอื่น
            </button>
          )}
        </div>
      </div>

      <MoveOffDayModal
        open={showMoveOffDayModal}
        employee={employee}
        originalDate={date}
        shiftTypes={shiftTypes}
        schedules={schedules}
        onConfirm={(originalDate, newDate, shiftTypeId) => {
          setShowMoveOffDayModal(false);
          onMoveOffDay?.(originalDate, newDate, shiftTypeId);
        }}
        onClose={() => setShowMoveOffDayModal(false)}
      />
    </div>
  );
}