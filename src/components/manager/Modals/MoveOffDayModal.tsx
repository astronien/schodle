import { useState, useMemo } from 'react';
import { X, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import type { Employee, ScheduleEntry, ShiftType } from '../../../types';

interface MoveOffDayModalProps {
  open: boolean;
  employee: Employee | null;
  originalDate: string;
  shiftTypes: ShiftType[];
  schedules: ScheduleEntry[];
  onConfirm: (originalDate: string, newDate: string, shiftTypeId: string) => void;
  onClose: () => void;
}

export function MoveOffDayModal({
  open,
  employee,
  originalDate,
  shiftTypes,
  schedules,
  onConfirm,
  onClose,
}: MoveOffDayModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedNewDate, setSelectedNewDate] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    if (!originalDate) return [];
    const d = new Date(`${originalDate}T00:00:00`);
    return eachDayOfInterval({ start: startOfMonth(d), end: endOfMonth(d) });
  }, [originalDate]);

  const firstDayOffset = useMemo(() => {
    if (!originalDate) return 0;
    const d = new Date(`${originalDate}T00:00:00`);
    return getDay(startOfMonth(d));
  }, [originalDate]);

  if (!open) return null;

  const workShifts = shiftTypes.filter((t) => t.isVisible && t.code !== 'X');

  const handleConfirm = () => {
    if (!selectedShiftId || !selectedNewDate) return;
    onConfirm(originalDate, selectedNewDate, selectedShiftId);
    setStep(1);
    setSelectedShiftId(null);
    setSelectedNewDate(null);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedShiftId(null);
    setSelectedNewDate(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      ></div>
      <div className="relative w-full sm:max-w-md bg-bg-panel rounded-t-2xl sm:rounded-2xl shadow-overlay overflow-hidden animate-slide-up border border-white/40 max-h-[90vh] flex flex-col">
        <div className="w-10 h-1 bg-text-quaternary/30 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
        <div className="p-5 flex flex-col min-h-0 flex-1">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary">ย้ายวันหยุด</h3>
              <p className="text-xs font-semibold text-brand-accent mt-0.5 truncate">
                {employee?.fullName ?? ''} ·{' '}
                {format(new Date(originalDate), 'EEEE ที่ d MMM yyyy', { locale: th })}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 bg-white/60 rounded-full flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white border border-border-solid transition-colors shrink-0"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
              step === 1 ? 'bg-brand/15 text-brand' : 'bg-bg-surface text-text-quaternary'
            )}>
              <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px]', step === 1 ? 'bg-brand text-white' : 'bg-text-quaternary/20')}>1</span>
              เลือกกะงาน
            </div>
            <div className={cn('h-px flex-1 transition-colors', step === 2 ? 'bg-brand/30' : 'bg-border-solid')} />
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
              step === 2 ? 'bg-brand/15 text-brand' : 'bg-bg-surface text-text-quaternary'
            )}>
              <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px]', step === 2 ? 'bg-brand text-white' : 'bg-text-quaternary/20')}>2</span>
              เลือกวันหยุดใหม่
            </div>
          </div>

          {step === 1 && (
            <>
              <p className="text-xs font-semibold text-text-tertiary mb-2">
                เลือกกะงานสำหรับวันที่ย้ายวันหยุดออก:
              </p>
              <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-1 -mr-1 flex-1">
                {workShifts.map((type) => {
                  const isSelected = selectedShiftId === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedShiftId(type.id)}
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
              <button
                disabled={!selectedShiftId}
                onClick={() => setStep(2)}
                className="mt-3 w-full py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                ถัดไป
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs font-semibold text-text-tertiary mb-2">
                เลือกวันที่จะย้ายวันหยุดไป:
              </p>
              <div className="overflow-y-auto custom-scrollbar pr-1 -mr-1 flex-1">
                <div className="p-3 bg-bg-surface rounded-xl border border-border-solid">
                  <div className="text-center mb-2">
                    <span className="text-xs font-bold text-text-primary">
                      {format(new Date(`${originalDate}T00:00:00`), 'MMMM yyyy', { locale: th })}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
                      <div key={d} className="text-center text-[10px] font-bold text-text-quaternary py-1">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: firstDayOffset }).map((_, i) => (
                      <div key={`blank-${i}`} className="aspect-square" />
                    ))}
                    {daysInMonth.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isOriginalDate = dateStr === originalDate;
                      const isDayOff = typeof employee?.weeklyOffDay === 'number' && day.getDay() === employee.weeklyOffDay;
                      const hasSchedule = schedules.some(
                        (s) => s.employeeId === employee?.id && s.date === dateStr && s.status === 'approved'
                      );
                      const isSelected = selectedNewDate === dateStr;
                      return (
                        <button
                          key={dateStr}
                          disabled={isOriginalDate}
                          onClick={() => setSelectedNewDate(dateStr)}
                          className={cn(
                            'aspect-square rounded-lg text-xs font-semibold transition-colors flex items-center justify-center relative',
                            isOriginalDate
                              ? 'bg-text-quaternary/10 text-text-quaternary cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-brand text-white ring-2 ring-brand/30'
                              : hasSchedule
                              ? 'bg-warn/10 text-warn hover:bg-warn/20'
                              : isDayOff
                              ? 'bg-bg-elevated text-text-quaternary'
                              : 'bg-bg-elevated text-text-primary hover:bg-brand/10 hover:text-brand'
                          )}
                        >
                          {format(day, 'd')}
                          {hasSchedule && !isSelected && !isOriginalDate && (
                            <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-warn" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-text-quaternary">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warn" /> มีกะแล้ว
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-text-quaternary/30" /> วันหยุดประจำสัปดาห์
                    </span>
                  </div>
                </div>
              </div>

              {selectedNewDate && (
                <div className="mt-3 p-3 bg-brand/5 rounded-xl border border-brand/20 shrink-0">
                  <p className="text-xs text-text-primary">
                    <span className="font-semibold text-brand">สรุป:</span> ย้ายวันหยุดจาก{' '}
                    <span className="font-semibold">{format(new Date(`${originalDate}T00:00:00`), 'd MMM', { locale: th })}</span>{' '}
                    ไปยัง{' '}
                    <span className="font-semibold">{format(new Date(`${selectedNewDate}T00:00:00`), 'd MMM', { locale: th })}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-3 shrink-0">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 bg-bg-surface text-text-tertiary rounded-xl text-sm font-semibold hover:bg-bg-elevated transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ย้อนกลับ
                </button>
                <button
                  disabled={!selectedNewDate}
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ย้ายวันหยุด
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
