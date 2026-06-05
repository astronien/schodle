import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { Clock, ChevronRight, ChevronLeft, Users, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../lib/toast';
import { getEmployeeMonthlyStats } from '../../lib/schedule-utils';
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
  const monthlySchedules = userSchedules.filter((s) => {
    const d = new Date(s.date);
    return d >= monthStart && d <= monthEnd;
  });
  const monthlyStats = getEmployeeMonthlyStats(currentUser.id, monthlySchedules, shiftTypes);
  const approvedDays = monthlySchedules.filter((s) => s.status === 'approved').length;
  const pendingDays = monthlySchedules.filter((s) => s.status === 'pending' || s.status === 'submitted').length;
  const targetOffDays = 4;
  const remainingOffDays = Math.max(0, targetOffDays - (monthlyStats.counts['X'] || 0));
  const progressPercent = Math.round((approvedDays / days.length) * 100);

  const getDaySchedule = (date: Date) =>
    userSchedules.find((s) => isSameDay(new Date(s.date), date));

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

  const quickActions = [
    { id: 'today', label: 'วันนี้', icon: Clock, action: () => setCurrentMonth(new Date()) },
    { id: 'requests', label: 'คำขอ', icon: Users, action: () => setSelectedDate(new Date()) },
    { id: 'coverage', label: 'ตารางรวม', icon: LayoutGrid, action: () => setActiveView('coverage') },
  ];

  const pendingSwaps = schedules.filter(
    (s) => s.employeeId === currentUser.id && s.swapWithId && s.status === 'pending'
  );

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-bg-surface p-4 sm:p-8 border border-white/[0.08]">
        <div className="absolute -right-6 -top-6 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-brand/5"></div>
        <div className="absolute -left-6 -bottom-6 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand/5"></div>

        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-text-quaternary font-semibold">
              Employee Dashboard
            </p>
            <h2 className="text-lg sm:text-2xl font-medium mt-1 text-text-primary leading-tight">
              ตารางงานเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })}
            </h2>
            <p className="text-text-tertiary text-sm max-w-xl mt-2">
              ดูตารางของคุณ ส่งคำขอ และเช็คสถานะได้แบบแตะครั้งเดียวบนมือถือ
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <div className="rounded-xl bg-bg-panel/70 border border-white/[0.05] px-3 py-2">
              <div className="text-lg font-bold text-text-primary leading-none">{approvedDays}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-quaternary mt-1">อนุมัติ</div>
            </div>
            <div className="rounded-xl bg-bg-panel/70 border border-white/[0.05] px-3 py-2">
              <div className="text-lg font-bold text-warn leading-none">{pendingDays}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-quaternary mt-1">รออนุมัติ</div>
            </div>
            <div className="rounded-xl bg-bg-panel/70 border border-white/[0.05] px-3 py-2">
              <div className="text-lg font-bold text-brand-accent leading-none">{remainingOffDays}</div>
              <div className="text-[10px] uppercase tracking-wider text-text-quaternary mt-1">วันหยุด</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="pill text-text-tertiary text-[11px] sm:text-xs">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warn opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warn"></span>
              </span>
              กำหนดส่ง: 25 พฤษภาคม
            </div>
            <div className="pill text-brand-accent bg-brand/10 border border-brand/20 text-[11px] sm:text-xs">
              แตะวันที่เพื่อบันทึกกะ/คำขอ
            </div>
          </div>
        </div>
      </div>

      <div className="fixed right-4 bottom-24 hidden lg:flex flex-col gap-2 z-40">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
              className="group flex items-center gap-2 rounded-full bg-bg-panel/90 backdrop-blur-xl border border-white/[0.08] px-3 py-2 shadow-lg hover:border-brand/30 hover:bg-brand/10 transition-all"
            >
              <Icon className="w-4 h-4 text-brand-accent" />
              <span className="text-xs font-semibold text-text-primary whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <section className="lg:col-span-2 card overflow-hidden rounded-none sm:rounded-lg order-1">
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
                    activeView === 'calendar' ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-secondary'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  ปฏิทิน
                </button>
                <button
                  onClick={() => setActiveView('coverage')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                    activeView === 'coverage' ? 'bg-brand text-white' : 'text-text-tertiary hover:text-text-secondary'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  ตารางรวม
                </button>
              </div>
            </div>
          </div>

          {activeView === 'calendar' ? (
            <Calendar
              days={days}
              currentUser={currentUser}
              shiftTypes={shiftTypes}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              getDaySchedule={getDaySchedule}
            />
          ) : (
            <CoverageView
              days={days}
              employees={employees}
              positions={positions}
              schedules={schedules}
              shiftTypes={shiftTypes}
            />
          )}
        </section>

        <section className="space-y-4 sm:space-y-5 order-2 lg:order-none">
          <div className="card p-5">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-5 h-5 text-brand" />
              สรุปความคืบหน้า
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary font-medium">กะที่อนุมัติแล้ว</span>
                <span className="text-sm font-medium text-success">{approvedDays} วัน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary font-medium">รอการอนุมัติ</span>
                <span className="text-sm font-medium text-warn">{pendingDays} วัน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-tertiary font-medium">วันหยุดคงเหลือ</span>
                <span className="text-sm font-medium text-text-primary">{remainingOffDays} วัน</span>
              </div>
              <div className="pt-3 border-t border-white/[0.05]">
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-[10px] font-medium text-text-quaternary mt-2 uppercase tracking-wider">
                  ความคืบหน้าของเดือน: {progressPercent}%
                </p>
              </div>
            </div>
          </div>

          {pendingSwaps.length > 0 && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Users className="w-5 h-5 text-brand" />
                รายการขอสลับกะ
              </h3>
              <div className="space-y-2">
                {pendingSwaps.map((s) => {
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
                      <span className="pill text-warn border-warn/30">รออนุมัติ</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <ShiftEditor
        open={selectedDate !== null}
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
