import { useState } from 'react';
import {
  Clock, ChevronRight, ChevronLeft, Save, AlertCircle,
  XCircle, CheckCircle2, Plus, Users, Check, LayoutGrid
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameDay
} from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface EmployeeDashboardProps {
  currentUser: Employee;
  schedules: ScheduleEntry[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  shiftTypes: ShiftType[];
  employees: Employee[];
  positions: Position[];
}

export function EmployeeDashboard({ currentUser, schedules, setSchedules, shiftTypes, employees, positions }: EmployeeDashboardProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'coverage'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLateScan, setIsLateScan] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [targetSwapId, setTargetSwapId] = useState<string | null>(null);

  const userSchedules = schedules.filter((s) => s.employeeId === currentUser.id);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDaySchedule = (date: Date) => {
    return userSchedules.find((s) => isSameDay(new Date(s.date), date));
  };

  const currentShiftId = selectedShiftId || (selectedDate ? getDaySchedule(selectedDate)?.shiftTypeId : null);
  const shiftType = shiftTypes.find((t) => t.id === currentShiftId);

  const handleSetShift = (shiftId: string | null, reason?: string) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setValidationError(null);

    const shiftType = shiftTypes.find((t) => t.id === shiftId);

    if (shiftType) {
      if (shiftType.requiresReason && !reason) {
        setValidationError(`กะ ${shiftType.name} จำเป็นต้องระบุเหตุผล`);
        return;
      }
      if (shiftType.requiresEvidence && !attachment) {
        setValidationError(`กะ ${shiftType.name} จำเป็นต้องแนบหลักฐานรูปภาพ`);
        return;
      }
    }

    const needsManager = shiftType?.requiresApproval || false;

    if (shiftId === null) {
      setSchedules((prev) => prev.filter((s) => !(s.employeeId === currentUser.id && s.date === dateStr)));
    } else {
      const existing = userSchedules.find((s) => s.date === dateStr);
      if (existing) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.employeeId === currentUser.id && s.date === dateStr
              ? {
                  ...s,
                  shiftTypeId: shiftId,
                  status: needsManager ? 'pending' : 'approved',
                  employeeNote: reason || '',
                }
              : s
          )
        );
      } else {
        setSchedules((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            employeeId: currentUser.id,
            date: dateStr,
            shiftTypeId: shiftId,
            status: needsManager ? 'pending' : 'approved',
            employeeNote: reason || '',
          },
        ]);
      }
    }
    setSelectedDate(null);
    setSelectedShiftId(null);
    setRequestReason('');
    setAttachment(null);
    setIsLateScan(false);
    setIsSwapping(false);
    setTargetSwapId(null);
  };

  const handleSwapShift = () => {
    if (!selectedDate || !targetSwapId) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const targetEmp = employees.find((e) => e.id === targetSwapId);

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.employeeId === currentUser.id && s.date === dateStr) {
          return {
            ...s,
            status: 'pending',
            swapWithId: targetSwapId,
            employeeNote: `ขอสลับกะกับ ${targetEmp?.fullName}`,
          };
        }
        return s;
      })
    );

    setSelectedDate(null);
    setIsSwapping(false);
    setTargetSwapId(null);
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-none sm:rounded-xl bg-bg-surface p-6 sm:p-8 border border-white/[0.08]">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-brand/5"></div>
        <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-brand/5"></div>

        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-medium mb-1 text-text-primary">
            ตารางงานเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })}
          </h2>
          <p className="text-text-tertiary text-sm">
            จัดการกะงานและคำขอหยุดพักร้อนของคุณได้ที่นี่
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">
              <Save className="w-4 h-4" />
              ส่งคำขอทั้งหมด
            </button>
            <div className="pill text-text-tertiary">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warn opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warn"></span>
              </span>
              กำหนดส่ง: 25 พฤษภาคม
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Calendar / Coverage Section */}
        <section className="lg:col-span-2 card overflow-hidden rounded-none sm:rounded-lg">
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-md hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all text-text-tertiary hover:text-text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-medium text-text-primary text-base sm:text-lg min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </h3>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-md hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all text-text-tertiary hover:text-text-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="text-sm font-medium text-brand-accent hover:bg-brand/10 px-3 py-1.5 rounded-md transition-colors"
              >
                วันนี้
              </button>
              <div className="flex bg-bg-surface p-0.5 rounded-lg border border-white/[0.05]">
                <button
                  onClick={() => setActiveView('calendar')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                    activeView === 'calendar'
                      ? 'bg-brand text-white'
                      : 'text-text-tertiary hover:text-text-secondary'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  ปฏิทิน
                </button>
                <button
                  onClick={() => setActiveView('coverage')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                    activeView === 'coverage'
                      ? 'bg-brand text-white'
                      : 'text-text-tertiary hover:text-text-secondary'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  ตารางรวม
                </button>
              </div>
            </div>
          </div>

          {activeView === 'calendar' ? (
            <>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3">
                  {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] sm:text-xs font-medium text-text-quaternary uppercase tracking-wider py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`pad-${i}`} className="aspect-square"></div>
                  ))}

                  {days.map((day) => {
                    const schedule = getDaySchedule(day);
                    const shift = schedule ? shiftTypes.find((t) => t.id === schedule.shiftTypeId) : null;

                    return (
                      <button
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all duration-200',
                          isToday(day)
                            ? 'bg-brand/10 border-brand/30'
                            : isSameDay(selectedDate || new Date(0), day)
                            ? 'border-brand ring-1 ring-brand/20 scale-[0.97]'
                            : schedule?.status === 'rejected'
                            ? 'bg-danger/10 border-danger/30'
                            : schedule?.status === 'pending'
                            ? 'bg-warn/10 border-warn/30'
                            : 'bg-bg-surface border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.03]'
                        )}
                      >
                        <span
                          className={cn(
                            'text-sm sm:text-base font-medium',
                            isToday(day)
                              ? 'text-brand-accent'
                              : schedule?.status === 'rejected'
                              ? 'text-danger line-through'
                              : 'text-text-primary'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {shift && (
                          <>
                            <div
                              className={cn(
                                'mt-1 px-1 sm:px-1.5 py-px sm:py-0.5 rounded-md text-[8px] sm:text-[10px] font-medium text-white',
                                schedule?.status === 'rejected' && 'opacity-40 grayscale'
                              )}
                              style={{ backgroundColor: shift.color }}
                            >
                              {shift.code}
                            </div>
                            {shift.startTime !== '-' && (
                              <span className="hidden sm:block text-[7px] sm:text-[8px] font-medium text-text-quaternary mt-0.5">
                                {shift.startTime}–{shift.endTime}
                              </span>
                            )}
                          </>
                        )}
                        {schedule?.status === 'draft' && (
                          <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-1.5 h-1.5 bg-warn rounded-full"></span>
                        )}
                        {schedule?.status === 'pending' && (
                          <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex items-center gap-0.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warn opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-warn"></span>
                            </span>
                            {schedule.swapWithId && <Users className="hidden sm:block w-2.5 h-2.5 text-brand-accent" />}
                          </span>
                        )}
                        {schedule?.status === 'rejected' && (
                          <XCircle className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-danger" />
                        )}
                        {schedule?.status === 'approved' && (
                          <CheckCircle2 className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-success" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift Legend */}
              <div className="px-4 sm:px-5 py-3 bg-white/[0.02] border-t border-white/[0.05] flex flex-wrap gap-x-4 gap-y-2">
                {shiftTypes
                  .filter((t) => t.isVisible)
                  .slice(0, 6)
                  .map((type) => (
                    <div key={type.id} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }}></div>
                      <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wide">
                        {type.code}: {type.name}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            /* Coverage Read-Only View */
            <div className="overflow-auto custom-scrollbar max-h-[65vh]">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-30 bg-bg-panel p-3 sm:p-4 text-left border-b border-success/20 min-w-[140px] sm:min-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">พนักงาน</span>
                    </th>
                    {days.map((day) => (
                      <th
                        key={day.toString()}
                        className="sticky top-0 z-20 bg-bg-panel p-2 sm:p-3 text-center border-b border-success/20 min-w-[48px] sm:min-w-[56px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-wider">
                            {format(day, 'EEE', { locale: th })}
                          </span>
                          <span className="text-sm font-bold text-text-primary">{format(day, 'd')}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="group hover:bg-bg-panel/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-bg-surface group-hover:bg-bg-panel p-3 sm:p-4 border-b border-white/[0.03] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-bg-surface border border-surface-200 shrink-0">
                            <img
                              src={
                                employee.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.fullName}`
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-text-primary leading-none mb-1 truncate">
                              {employee.fullName}
                            </div>
                            <div className="text-[9px] sm:text-[10px] font-semibold text-text-quaternary uppercase tracking-wider truncate">
                              {positions.find((p) => p.id === employee.positionId)?.code}
                            </div>
                          </div>
                        </div>
                      </td>
                      {days.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const shift = schedules.find(
                          (s) => s.employeeId === employee.id && s.date === dateStr && s.status === 'approved'
                        );
                        const sType = shift ? shiftTypes.find((t) => t.id === shift.shiftTypeId) : null;

                        return (
                          <td key={day.toString()} className="p-1 border-b border-white/[0.03]">
                            {shift && sType ? (
                              <div
                                className="w-full h-7 sm:h-9 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: sType.color }}
                              >
                                {sType.code}
                              </div>
                            ) : (
                              <div className="w-full h-7 sm:h-9 rounded-md bg-bg-panel border border-dashed border-surface-200"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Stats Summary Panel */}
        <section className="space-y-5">
          <div className="card p-5 sm:p-5">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-5 h-5 text-brand" />
              สรุปความคืบหน้า
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary font-medium">กะที่อนุมัติแล้ว</span>
                <span className="text-sm font-medium text-success">12 วัน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary font-medium">รอการอนุมัติ</span>
                <span className="text-sm font-medium text-warn">4 วัน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary font-medium">วันหยุดคงเหลือ</span>
                <span className="text-sm font-medium text-text-primary">2 วัน</span>
              </div>
              <div className="pt-3 border-t border-white/[0.05]">
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand h-full rounded-full transition-all duration-500 w-[65%]"></div>
                </div>
                <p className="text-[10px] font-medium text-text-quaternary mt-2 uppercase tracking-wider">
                  ความคืบหน้าของเดือน: 65%
                </p>
              </div>
            </div>
          </div>

          {/* Pending Swap Requests */}
          {schedules.filter(
            (s) => s.employeeId === currentUser.id && s.swapWithId && s.status === 'pending'
          ).length > 0 && (
            <div className="card p-5 sm:p-5 animate-fade-in">
              <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Users className="w-5 h-5 text-brand" />
                รายการขอสลับกะ
              </h3>
              <div className="space-y-2">
                {schedules
                  .filter((s) => s.employeeId === currentUser.id && s.swapWithId && s.status === 'pending')
                  .map((s) => {
                    const targetEmp = employees.find((e) => e.id === s.swapWithId);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-brand/10 rounded-lg border border-brand/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-brand/15 flex items-center justify-center text-brand-accent">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-text-primary">
                              {format(new Date(s.date), 'd MMM', { locale: th })}
                            </p>
                            <p className="text-[10px] font-medium text-brand-accent">
                              สลับกับ {targetEmp?.fullName}
                            </p>
                          </div>
                        </div>
                        <span className="pill text-warn border-warn/30">
                          รออนุมัติ
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Shift Selection Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDate(null)}
          ></div>

          <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>

            <div className="p-5 sm:p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-medium text-text-primary">เลือกกะงาน</h3>
                  <p className="text-sm font-medium text-brand-accent">
                    {format(selectedDate, 'EEEE ที่ d MMMM yyyy', { locale: th })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedShiftId(null);
                    setRequestReason('');
                    setValidationError(null);
                    setAttachment(null);
                    setIsLateScan(false);
                  }}
                  className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {validationError && (
                <div className="mb-5 p-3.5 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-danger">{validationError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                {shiftTypes
                  .filter((t) => t.isVisible || t.id === 'xc')
                  .map((type) => {
                    const isSelected =
                      selectedShiftId === type.id ||
                      (!selectedShiftId && getDaySchedule(selectedDate)?.shiftTypeId === type.id);
                    const count = schedules.filter(
                      (s) =>
                        isSameDay(new Date(s.date), selectedDate) &&
                        s.shiftTypeId === type.id &&
                        s.status !== 'rejected'
                    ).length;
                    const isFull = count >= 3 && type.id !== 'xc';

                    return (
                      <button
                        key={type.id}
                        disabled={isFull}
                        onClick={() => {
                          if (type.id === 'xc') {
                            setSelectedShiftId('xc');
                            setValidationError(null);
                          } else {
                            handleSetShift(type.id);
                          }
                        }}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 active:scale-[0.98]',
                          isSelected
                            ? 'border-brand bg-brand/10 ring-1 ring-brand/20'
                            : isFull
                            ? 'border-white/[0.05] bg-white/[0.02] opacity-50 cursor-not-allowed'
                            : 'border-white/[0.05] hover:border-white/[0.12] bg-bg-surface'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium text-white',
                              isFull && 'grayscale'
                            )}
                            style={{ backgroundColor: type.color }}
                          >
                            {type.code}
                          </div>
                          <div className="text-left">
                            <p className={cn('font-medium text-sm', isFull ? 'text-text-quaternary' : 'text-text-primary')}>
                              {type.name}
                            </p>
                            <p className="text-xs text-text-tertiary font-medium">
                              {type.startTime} - {type.endTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {type.id !== 'xc' && (
                            <span
                              className={cn(
                                'text-[10px] font-medium px-2 py-1 rounded-md',
                                isFull
                                  ? 'bg-danger/10 text-danger'
                                  : 'bg-white/[0.05] text-text-quaternary'
                              )}
                            >
                              {isFull ? 'เต็ม' : `${count}/3`}
                            </span>
                          )}
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-accent" />}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Swap Shift Feature */}
              {getDaySchedule(selectedDate) && !isSwapping && (
                <button
                  onClick={() => setIsSwapping(true)}
                  className="mt-3 w-full p-3.5 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-between group hover:bg-brand/15 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand text-white rounded-md group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-text-primary uppercase tracking-wide">ขอสลับกะงาน</p>
                      <p className="text-[10px] text-brand-accent font-medium">แลกกะกับเพื่อนร่วมงานในวันนี้</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-brand-muted" />
                </button>
              )}

              {isSwapping && (
                <div className="mt-3 p-4 bg-brand/10 rounded-lg border border-brand/20 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-text-primary uppercase tracking-wide">
                      เลือกเพื่อนที่จะสลับกะด้วย
                    </span>
                    <button
                      onClick={() => setIsSwapping(false)}
                      className="text-xs font-medium text-text-quaternary hover:text-text-primary"
                    >
                      ยกเลิก
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {employees
                      .filter((e) => e.id !== currentUser.id)
                      .map((emp) => {
                        const empShift = schedules.find(
                          (s) => s.employeeId === emp.id && s.date === format(selectedDate, 'yyyy-MM-dd')
                        );
                        if (!empShift) return null;
                        const empShiftType = shiftTypes.find((t) => t.id === empShift.shiftTypeId);

                        return (
                          <button
                            key={emp.id}
                            onClick={() => setTargetSwapId(emp.id)}
                            className={cn(
                              'w-full p-3 rounded-md border flex items-center justify-between transition-all',
                              targetSwapId === emp.id
                                ? 'bg-bg-surface border-brand shadow-raised'
                                : 'bg-white/[0.03] border-white/[0.05] hover:border-white/[0.12]'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-md overflow-hidden bg-bg-elevated">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
                                  alt=""
                                  className="w-full h-full"
                                />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-medium text-text-primary">{emp.fullName}</p>
                                <p className="text-[10px] font-medium text-text-quaternary">
                                  {empShiftType?.name} ({empShiftType?.startTime})
                                </p>
                              </div>
                            </div>
                            {targetSwapId === emp.id && <Check className="w-4 h-4 text-brand-accent" />}
                          </button>
                        );
                      })}
                  </div>
                  {targetSwapId && (
                    <button
                      onClick={handleSwapShift}
                      className="mt-3 w-full py-3 bg-brand text-white rounded-lg text-sm font-medium shadow-raised hover:bg-brand-hover transition-colors"
                    >
                      ยืนยันการขอสลับกะ
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-3 mt-5">
                {/* Dynamic Configuration UI */}
                {shiftType && (
                  <>
                    {shiftType.requiresEvidence && (
                      <div className="p-4 bg-brand/10 border border-dashed border-brand/20 rounded-lg flex flex-col items-center gap-2 animate-fade-in">
                        <input
                          type="file"
                          id="evidence"
                          className="hidden"
                          onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                        />
                        <label htmlFor="evidence" className="flex flex-col items-center cursor-pointer group">
                          <div className="p-2.5 bg-bg-surface rounded-full shadow-sm text-brand-accent mb-1 group-hover:scale-110 transition-transform border border-white/[0.08]">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-medium text-brand-accent uppercase tracking-wide">
                            {attachment ? attachment.name : 'แนบหลักฐานรูปภาพ'}
                          </span>
                        </label>
                      </div>
                    )}

                    {shiftType.requiresReason && (
                      <div className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.05] animate-fade-in">
                        <label className="block text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">
                          ระบุเหตุผลความจำเป็น
                        </label>
                        <textarea
                          value={requestReason}
                          onChange={(e) => setRequestReason(e.target.value)}
                          placeholder="กรุณาระบุรายละเอียดเพิ่มเติม..."
                          className="input-field"
                          rows={2}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Late Scan Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        isLateScan ? 'bg-warn/15 text-warn' : 'bg-white/[0.05] text-text-quaternary'
                      )}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">มาสาย / ลืมแสกนนิ้ว</p>
                      <p className="text-[10px] text-text-tertiary">ต้องแนบหลักฐานเพื่อยืนยัน</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsLateScan(!isLateScan)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      isLateScan ? 'bg-warn' : 'bg-white/[0.1]'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-bg-surface rounded-full shadow-sm transition-all',
                        isLateScan ? 'right-1' : 'left-1'
                      )}
                    ></div>
                  </button>
                </div>

                {isLateScan && !shiftType?.requiresEvidence && (
                  <div className="p-4 bg-brand/10 border border-dashed border-brand/20 rounded-lg flex flex-col items-center gap-2 animate-fade-in">
                    <input
                      type="file"
                      id="evidence-late"
                      className="hidden"
                      onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                    />
                    <label htmlFor="evidence-late" className="flex flex-col items-center cursor-pointer group">
                      <div className="p-2.5 bg-bg-surface rounded-full shadow-sm text-brand-accent mb-1 group-hover:scale-110 transition-transform border border-white/[0.08]">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-brand-accent uppercase tracking-wide">
                        {attachment ? attachment.name : 'แนบหลักฐาน (มาสาย)'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleSetShift(null)}
                  className="btn btn-ghost px-5 py-3.5 rounded-lg font-medium"
                >
                  ล้างกะ
                </button>
                <button
                  disabled={
                    (shiftType?.requiresReason && !requestReason) ||
                    (shiftType?.requiresEvidence && !attachment) ||
                    (isLateScan && !attachment)
                  }
                  onClick={() =>
                    handleSetShift(
                      selectedShiftId || getDaySchedule(selectedDate)?.shiftTypeId || null,
                      requestReason
                    )
                  }
                  className={cn(
                    'flex-1 btn rounded-lg font-medium py-3.5',
                    (shiftType?.requiresReason && !requestReason) ||
                      (shiftType?.requiresEvidence && !attachment) ||
                      (isLateScan && !attachment)
                      ? 'bg-white/[0.05] text-text-quaternary cursor-not-allowed'
                      : 'btn-primary'
                  )}
                >
                  ยืนยันการลงกะ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
