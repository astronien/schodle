import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { Play, Plus, Search, Briefcase, Calendar as CalIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import { Calendar } from './Calendar';
import { CoverageView } from './CoverageView';
import { ShiftEditor } from './ShiftEditor';
import type { AppSettings, Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface EmployeeDashboardProps {
  currentUser: Employee;
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  employees: Employee[];
  positions: Position[];
  updateSchedule: (entry: ScheduleEntry, forceNotify?: boolean) => Promise<void>;
  uploadFile: (file: File) => Promise<string>;
  settings: AppSettings;
}

type View = 'calendar' | 'coverage';

export function EmployeeDashboard({
  currentUser,
  schedules,
  updateSchedule,
  shiftTypes,
  employees,
  positions,
  uploadFile,
  settings,
}: EmployeeDashboardProps) {
  const toast = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<View>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const userSchedules = schedules.filter((s) => s.employeeId === currentUser.id);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDaySchedule = (date: Date) =>
    userSchedules.find((s) => isSameDay(new Date(s.date), date));

  // All days in the visible month for the pill selector
  const today = startOfDay(new Date());
  const pillDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );

  const selectedSchedule = selectedDate ? getDaySchedule(selectedDate) : null;
  const selectedShift = selectedSchedule
    ? shiftTypes.find((t) => t.id === selectedSchedule.shiftTypeId)
    : null;

  const handleSetShift = async (shiftId: string | null, reason?: string, evidenceUrl?: string, isLateScan?: boolean) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setValidationError(null);

    const shiftType = shiftTypes.find((t) => t.id === shiftId);
    if (shiftType) {
      if (shiftType.requiresReason && !reason) {
        setValidationError(`กะ ${shiftType.name} จำเป็นต้องระบุเหตุผล`);
        return;
      }
    }

    const needsManager = shiftType?.requiresApproval || false;
    setIsUpdating(true);
    try {
      if (shiftId === null) {
        setSelectedDate(null);
        return;
      }
      const existing = userSchedules.find((s) => s.date === dateStr);
      await updateSchedule({
        id: existing?.id || crypto.randomUUID(),
        employeeId: currentUser.id,
        date: dateStr,
        shiftTypeId: shiftId,
        status: needsManager ? 'pending' : 'approved',
        requestType: isLateScan ? 'late_scan' : 'shift_change',
        employeeNote: reason || '',
        evidenceUrl,
        revertShiftTypeId:
          needsManager && existing && existing.status === 'approved'
            ? existing.shiftTypeId
            : existing?.revertShiftTypeId,
      });
      setSelectedDate(null);
      toast.success('บันทึกกะงานเรียบร้อย');
    } catch (err: unknown) {
      console.error('[handleSetShift] Failed:', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message || '')
          : null;
      toast.error('บันทึกข้อมูลไม่สำเร็จ', msg || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSwapShift = async (targetEmployeeId: string) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const targetEmp = employees.find((e) => e.id === targetEmployeeId);
    const existing = userSchedules.find((s) => s.date === dateStr);
    if (!existing) return;
    try {
      await updateSchedule({
        ...existing,
        status: 'pending',
        swapWithId: targetEmployeeId,
        employeeNote: `ขอสลับกะกับ ${targetEmp?.fullName}`,
      });
      setSelectedDate(null);
      toast.success('ส่งคำขอสลับกะแล้ว', `รอการอนุมัติจากหัวหน้า`);
    } catch (err: unknown) {
      toast.error('ไม่สามารถส่งคำขอสลับกะได้', err instanceof Error ? err.message : undefined);
    }
  };

  const handleCloseEditor = () => {
    setSelectedDate(null);
    setValidationError(null);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight">My Shifts</h1>
          <p className="text-text-tertiary text-sm mt-0.5">
            {format(currentMonth, 'MMMM yyyy', { locale: th })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="เพิ่มกะ"
            className="w-11 h-11 rounded-full bg-bg-panel border border-border-solid shadow-card flex items-center justify-center text-text-primary hover:bg-bg-surface transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            aria-label="ค้นหา"
            className="w-11 h-11 rounded-full bg-bg-panel border border-border-solid shadow-card flex items-center justify-center text-text-primary hover:bg-bg-surface transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day pill selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
        {pillDays.map((d) => {
          const active = selectedDate ? isSameDay(d, selectedDate) : isSameDay(d, today);
          const isPast = isBefore(d, today) && !active;
          return (
            <button
              key={d.toISOString()}
              onClick={() => setSelectedDate(d)}
              data-active={active}
              className={cn(
                'day-pill shrink-0',
                !active && isPast && 'opacity-60',
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                {format(d, 'EEE', { locale: th })}
              </span>
              <span className="text-lg font-bold leading-none mt-1">
                {format(d, 'd')}
              </span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-white/90 mt-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header + "Start Now" CTA */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            {selectedDate
              ? `ตารางวันที่ ${format(selectedDate, 'd MMMM', { locale: th })}`
              : "Today's Workshift"}
          </h2>
        </div>

        {selectedShift ? (
          <button
            onClick={() => toast.info('เริ่มงาน', `${selectedShift.name} เริ่ม ${selectedShift.startTime || '-'}`)}
            className="w-full btn btn-secondary text-base"
          >
            <Play className="w-4 h-4 fill-current" />
            เริ่มงานตอนนี้
          </button>
        ) : (
          <button
            onClick={() => setSelectedDate(selectedDate ?? today)}
            className="w-full btn btn-primary text-base"
          >
            <Plus className="w-4 h-4" />
            เพิ่มกะวันนี้
          </button>
        )}
      </div>

      {/* Shift list for selected day */}
      {activeView === 'calendar' ? (
        <div className="space-y-3">
          {(() => {
            const daySchedule = selectedDate ? getDaySchedule(selectedDate) : null;
            if (!daySchedule) {
              return (
                <div className="card p-6 text-center text-text-tertiary text-sm">
                  ไม่มีกะในวันนี้ — แตะปุ่มด้านบนเพื่อเพิ่ม
                </div>
              );
            }
            const shift = shiftTypes.find((t) => t.id === daySchedule.shiftTypeId);
            if (!shift) return null;
            const position = positions.find((p) => p.id === currentUser.positionId);
            return (
              <div className="card p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-text-primary truncate">
                        {position?.name || 'ไม่ระบุตำแหน่ง'}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">
                        {shift.name}
                      </p>
                    </div>
                  </div>
                  {shift.startTime && (
                    <span className="badge badge-orange shrink-0">
                      {shift.startTime}
                    </span>
                  )}
                </div>

                {(shift.startTime || shift.endTime) && (
                  <div className="flex items-center gap-4 text-sm text-text-secondary pt-1">
                    {shift.startTime && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-quaternary">เริ่ม</span>
                        <span className="font-semibold">{shift.startTime}</span>
                      </div>
                    )}
                    {shift.endTime && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-quaternary">ถึง</span>
                        <span className="font-semibold">{shift.endTime}</span>
                      </div>
                    )}
                  </div>
                )}

                {daySchedule.employeeNote && (
                  <p className="text-xs text-text-tertiary pt-2 border-t border-border-solid">
                    หมายเหตุ: {daySchedule.employeeNote}
                  </p>
                )}
              </div>
            );
          })()}

          {/* All-month compact calendar (collapsed) */}
          <div className="card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary text-sm">
                ตารางเดือนนี้
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 rounded-full text-text-tertiary hover:bg-bg-surface"
                  aria-label="เดือนก่อนหน้า"
                >
                  <CalIcon className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-text-secondary min-w-[80px] text-center">
                  {format(currentMonth, 'MMM yyyy', { locale: th })}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 rounded-full text-text-tertiary hover:bg-bg-surface"
                  aria-label="เดือนถัดไป"
                >
                  <CalIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <Calendar
              days={days}
              currentUser={currentUser}
              shiftTypes={shiftTypes}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              getDaySchedule={getDaySchedule}
            />
          </div>
        </div>
      ) : (
        <div className="card p-4 sm:p-5">
          <CoverageView
            days={days}
            employees={employees}
            positions={positions}
            schedules={schedules}
            shiftTypes={shiftTypes}
          />
        </div>
      )}

      {/* Bottom view switcher (mobile) */}
      <div className="sm:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <div className="flex bg-bg-panel/90 backdrop-blur-xl border border-border-solid rounded-full p-1 shadow-overlay">
          <button
            onClick={() => setActiveView('calendar')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-semibold transition-all',
              activeView === 'calendar'
                ? 'bg-brand text-white'
                : 'text-text-tertiary'
            )}
          >
            ของฉัน
          </button>
          <button
            onClick={() => setActiveView('coverage')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-semibold transition-all',
              activeView === 'coverage'
                ? 'bg-brand text-white'
                : 'text-text-tertiary'
            )}
          >
            ทั้งทีม
          </button>
        </div>
      </div>

      <ShiftEditor
        open={selectedDate !== null && !selectedSchedule}
        selectedDate={selectedDate}
        currentUser={currentUser}
        employees={employees}
        schedules={schedules}
        shiftTypes={shiftTypes}
        positions={positions}
        settings={settings}
        isUpdating={isUpdating}
        validationError={validationError}
        uploadFile={uploadFile}
        onClearError={() => setValidationError(null)}
        onClose={handleCloseEditor}
        onConfirm={handleSetShift}
        onSwap={handleSwapShift}
        getDaySchedule={getDaySchedule}
      />
    </div>
  );
}
