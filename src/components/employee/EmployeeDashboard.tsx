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
import { Briefcase, Calendar as CalIcon, CalendarPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import { Calendar } from './Calendar';
import { CoverageView } from './CoverageView';
import { ShiftEditor } from './ShiftEditor';
import { buildICS, downloadICS } from '../../lib/calendar-export';
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
  activeView?: 'calendar' | 'coverage';
  onActiveViewChange?: (view: 'calendar' | 'coverage') => void;
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
  activeView: activeViewProp,
  onActiveViewChange,
}: EmployeeDashboardProps) {
  const toast = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeViewInner, setActiveViewInner] = useState<View>('calendar');
  const activeView = activeViewProp ?? activeViewInner;
  const setActiveView = (v: View) => {
    setActiveViewInner(v);
    onActiveViewChange?.(v);
  };
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

  const handlePillClick = (d: Date) => {
    setSelectedDate(d);
    const sched = getDaySchedule(d);
    if (!sched) {
      setEditorOpen(true);
    }
  };

  const [editorOpen, setEditorOpen] = useState(false);

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

    const needsManager = shiftType?.requiresApproval || isLateScan || false;
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
        createdBy: 'employee',
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
        createdBy: 'employee',
        requestType: 'swap',
        employeeNote: `ขอสลับกะกับ ${targetEmp?.fullName}`,
      });
      setSelectedDate(null);
      toast.success('ส่งคำขอสลับกะแล้ว', `รอการอนุมัติจากหัวหน้า`);
    } catch (err: unknown) {
      toast.error('ไม่สามารถส่งคำขอสลับกะได้', err instanceof Error ? err.message : undefined);
    }
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setValidationError(null);
  };

  const openEditorForDate = (date: Date) => {
    setSelectedDate(date);
    setEditorOpen(true);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
            สวัสดี {currentUser.fullName}
          </h1>
          <p className="text-text-tertiary text-sm mt-0.5">
            ขอให้เป็นวันที่สดใส · {format(currentMonth, 'MMMM yyyy', { locale: th })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex glass-nav rounded-full p-1">
            <button
              onClick={() => setActiveView('calendar')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                activeView === 'calendar' ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              ของฉัน
            </button>
            <button
              onClick={() => setActiveView('coverage')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                activeView === 'coverage' ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              ทั้งทีม
            </button>
          </div>
          <button
            onClick={() => {
              const events = userSchedules
                .filter((s) => s.status === 'approved')
                .map((s) => {
                  const shift = shiftTypes.find((t) => t.id === s.shiftTypeId);
                  const pos = positions.find((p) => p.id === currentUser.positionId);
                  return {
                    date: s.date,
                    startTime: shift?.startTime || '00:00',
                    endTime: shift?.endTime || '23:59',
                    summary: shift ? `${shift.name} (${shift.code})` : 'กะงาน',
                    description: `${currentUser.fullName}\n${pos?.name || ''}\n${shift ? `${shift.startTime}-${shift.endTime}` : ''}`,
                    location: '',
                    uid: `schodle-${s.id}@schodle.app`,
                  };
                });
              const ics = buildICS(events);
              downloadICS(ics, `schedule-${format(currentMonth, 'yyyy-MM')}.ics`);
            }}
            className="w-11 h-11 rounded-full glass-nav flex items-center justify-center text-brand hover:!bg-brand/10 transition-colors"
            title="เพิ่มในปฏิทิน"
          >
            <CalendarPlus className="w-5 h-5" />
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
              onClick={() => handlePillClick(d)}
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

      {/* Today's Workshift card — shows today's shift + selected day's shift in one card */}
      {activeView === 'calendar' && (() => {
        const renderShiftBlock = (date: Date, label: string, labelColor: 'brand' | 'success') => {
          const daySchedule = getDaySchedule(date);
          const shift = daySchedule ? shiftTypes.find((t) => t.id === daySchedule.shiftTypeId) : null;
          const position = positions.find((p) => p.id === currentUser.positionId);
          const toneClass = labelColor === 'brand' ? 'text-brand' : 'text-success';
          const dotClass = labelColor === 'brand' ? 'bg-brand' : 'bg-success';
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${toneClass}`}>
                  {label} · {format(date, 'd MMM', { locale: th })}
                </p>
              </div>
              {shift ? (
                <button
                  type="button"
                  onClick={() => openEditorForDate(date)}
                  className="w-full text-left rounded-2xl glass-cell p-4 space-y-3 hover:!bg-white/70 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl glass-cell flex items-center justify-center shrink-0">
                        <Briefcase className={`w-5 h-5 ${toneClass}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary truncate">
                          {position?.name || 'ไม่ระบุตำแหน่ง'}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          {shift.name}
                        </p>
                        {daySchedule?.requestType === 'late_scan' && (
                          <p className="text-[10px] font-bold text-danger mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                            มาสาย/ลืมแสกน
                          </p>
                        )}
                      </div>
                    </div>
                    {shift.startTime && (
                      <span className={`badge ${labelColor === 'brand' ? 'badge-orange' : 'badge-green'} shrink-0`}>
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

                  {daySchedule?.employeeNote && (
                    <p className="text-xs text-text-tertiary pt-2 border-t border-border-solid">
                      หมายเหตุ: {daySchedule.employeeNote}
                    </p>
                  )}
                  <p className="text-[10px] text-text-quaternary font-medium pt-1">แตะเพื่อแก้ไข</p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openEditorForDate(date)}
                  className="w-full rounded-2xl glass-cell border-dashed p-4 text-center text-text-tertiary text-sm hover:!bg-white/70 hover:border-brand hover:text-brand transition-colors"
                >
                  ไม่มีกะ — แตะเพื่อเพิ่ม
                </button>
              )}
            </div>
          );
        };

        const showSelected = selectedDate && !isSameDay(selectedDate, today);
        return (
          <div className="card p-4 sm:p-5 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">
              Today's Workshift
            </h2>
            <div className="space-y-4">
              {renderShiftBlock(today, 'วันนี้', 'brand')}
              {showSelected && selectedDate && (
                <>
                  <div className="border-t border-border-solid" />
                  {renderShiftBlock(selectedDate, 'วันที่เลือก', 'success')}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Shift list for selected day */}
      {activeView === 'calendar' ? (
        <div className="space-y-3">
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

      <ShiftEditor
        open={editorOpen}
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
