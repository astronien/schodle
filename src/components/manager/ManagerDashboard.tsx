import { useEffect, useRef, useState, useMemo } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { filterPendingRequests } from '../../lib/schedule-utils';
import { validateAllConflicts } from '../../lib/conflict-validator';
import { subscribeToNotifications, sendTestPushToSelf } from '../../lib/push';
import { useToast } from '../../lib/toast';
import { WeeklyOffDayEditor } from './Modals/WeeklyOffDayEditor';
import { ConfirmModal } from '../ConfirmModal';
import { CoverageGrid } from './CoverageGrid';
import { RequestList } from './RequestList';
import { ReportPanel } from './ReportPanel';
import { AdminTabs, type AdminTabId } from './AdminTabs/AdminTabs';
import { ManagerSidebarNav, ManagerMobileTabs } from './ManagerSidebarNav';
import type {
  AppSettings,
  Employee,
  Position,
  PositionGroup,
  RecurringSchedule,
  ScheduleEntry,
  ShiftType,
} from '../../types';

interface ManagerDashboardProps {
  currentUser: Employee;
  schedules: ScheduleEntry[];
  employees: Employee[];
  shiftTypes: ShiftType[];
  positions: Position[];
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  createShiftType: (shiftType: Omit<ShiftType, 'id'>) => Promise<void>;
  updateShiftType: (shiftType: ShiftType) => Promise<void>;
  deleteShiftType: (id: string) => Promise<void>;
  createPosition: (position: Omit<Position, 'id'>) => Promise<void>;
  updatePosition: (position: Position) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  positionGroups: PositionGroup[];
  createPositionGroup: (group: Omit<PositionGroup, 'id'>) => Promise<void>;
  updatePositionGroup: (group: PositionGroup) => Promise<void>;
  deletePositionGroup: (id: string) => Promise<void>;
  recurringSchedules: RecurringSchedule[];
  createRecurringSchedule: (recurring: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecurringSchedule: (recurring: RecurringSchedule) => Promise<void>;
  deleteRecurringSchedule: (id: string) => Promise<void>;
  applyRecurringSchedules: (month: Date, employeeIds?: string[]) => Promise<{ count: number; message: string }>;
  updateSchedule: (entry: ScheduleEntry, forceNotify?: boolean) => Promise<void>;
  swapScheduleShifts: (requesterId: string, targetId: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  deleteSchedulesByMonth: (month: Date) => Promise<void>;
  deleteSchedulesBeforeDate: (beforeDate: string) => Promise<void>;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  generateSmartSchedule: () => void;
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

export type TabId = 'coverage' | 'requests' | 'report' | 'admin';

export function ManagerDashboard({
  currentUser,
  schedules,
  employees,
  shiftTypes,
  positions,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createShiftType,
  updateShiftType,
  deleteShiftType,
  createPosition,
  updatePosition,
  deletePosition,
  positionGroups,
  createPositionGroup,
  updatePositionGroup,
  deletePositionGroup,
  recurringSchedules,
  createRecurringSchedule,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  applyRecurringSchedules,
  updateSchedule,
  deleteSchedule,
  deleteSchedulesByMonth,
  deleteSchedulesBeforeDate,
  swapScheduleShifts,
  currentMonth,
  setCurrentMonth,
  generateSmartSchedule,
  settings,
  updateSettings,
}: ManagerDashboardProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('coverage');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>('employees');
  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string; currentShiftId?: string } | null>(null);
  const [editingWeeklyOffEmployeeId, setEditingWeeklyOffEmployeeId] = useState<string | null>(null);
  const [selectedWeeklyOffDay, setSelectedWeeklyOffDay] = useState<number | null>(null);
  const [isSavingWeeklyOffDay, setIsSavingWeeklyOffDay] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestViewMode, setRequestViewMode] = useState<'pending' | 'history'>('pending');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const prevPendingIds = useRef<Set<string>>(new Set(schedules.filter((s) => s.status === 'pending').map((s) => s.id)));

  useEffect(() => {
    const currentPendingIds = new Set(schedules.filter((s) => s.status === 'pending').map((s) => s.id));
    const newRequests = schedules.filter(
      (s) => s.status === 'pending' && !prevPendingIds.current.has(s.id)
    );
    if (newRequests.length > 0 && Notification.permission === 'granted') {
      newRequests.forEach((req) => {
        const employee = employees.find((e) => e.id === req.employeeId);
        const shiftType = shiftTypes.find((t) => t.id === req.shiftTypeId);
        new Notification('มีคำขอใหม่จากพนักงาน', {
          body: `${employee?.fullName || 'พนักงาน'} ขอ${shiftType?.name || 'ลา/หยุด'} วันที่ ${format(new Date(req.date), 'd MMM')}`,
          icon: '/favicon.ico',
        });
      });
    }
    prevPendingIds.current = currentPendingIds;
  }, [schedules, employees, shiftTypes]);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      await subscribeToNotifications(currentUser.id);
      toast.success('เปิดการแจ้งเตือนสำเร็จ');
    } catch (err: unknown) {
      toast.error('เปิดการแจ้งเตือนไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendTestPush = async () => {
    return sendTestPushToSelf(currentUser.id);
  };

  const handleUpdateShiftStatus = async (id: string, status: 'approved' | 'rejected') => {
    const request = schedules.find((s) => s.id === id);
    if (!request) return;
    try {
      if (status === 'approved' && request.swapWithId) {
        const requesterId = request.employeeId;
        const targetId = request.swapWithId;
        const date = request.date;
        const requesterShift = schedules.find((s) => s.employeeId === requesterId && s.date === date);
        const targetShift = schedules.find((s) => s.employeeId === targetId && s.date === date);
        if (requesterShift && targetShift) {
          await swapScheduleShifts(requesterShift.id, targetShift.id);
        }
        toast.success('อนุมัติและสลับกะสำเร็จ');
      } else if (status === 'rejected' && request.revertShiftTypeId) {
        await updateSchedule({
          ...request,
          shiftTypeId: request.revertShiftTypeId,
          status: 'approved',
          revertShiftTypeId: undefined,
        });
        toast.info('คืนสถานะกะเดิมให้พนักงานแล้ว');
      } else {
        await updateSchedule({ ...request, status });
        toast.success(status === 'approved' ? 'อนุมัติคำขอ' : 'ปฏิเสธคำขอ');
      }
    } catch (err: unknown) {
      toast.error('ทำรายการไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleOpenEditCell = (employeeId: string, date: string) => {
    const shift = schedules.find(
      (s) => s.employeeId === employeeId && s.date === date && s.status === 'approved'
    );
    setEditingCell({ employeeId, date, currentShiftId: shift?.shiftTypeId });
  };

  const handleAssignShift = async (shiftTypeId: string) => {
    if (!editingCell) return;
    const { employeeId, date } = editingCell;
    try {
      const existing = schedules.find((s) => s.employeeId === employeeId && s.date === date);
      if (existing) {
        await updateSchedule({ ...existing, shiftTypeId, status: 'approved', createdBy: 'manager' });
      } else {
        await updateSchedule({
          id: crypto.randomUUID(),
          employeeId,
          date,
          shiftTypeId,
          status: 'approved',
          requestType: 'shift_change',
          createdBy: 'manager',
        });
      }
      setEditingCell(null);
      toast.success('บันทึกกะงานเรียบร้อย');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleClearShift = async () => {
    if (!editingCell) return;
    const { employeeId, date } = editingCell;
    try {
      const existing = schedules.find((s) => s.employeeId === employeeId && s.date === date);
      if (existing) await deleteSchedule(existing.id);
      setEditingCell(null);
      toast.success('ลบกะออกแล้ว');
    } catch (err: unknown) {
      toast.error('ลบไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleOpenWeeklyOffDay = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    setEditingWeeklyOffEmployeeId(employeeId);
    setSelectedWeeklyOffDay(typeof emp?.weeklyOffDay === 'number' ? emp.weeklyOffDay : null);
  };

  const handleSaveWeeklyOffDay = async () => {
    if (!editingWeeklyOffEmployeeId) return;
    const emp = employees.find((e) => e.id === editingWeeklyOffEmployeeId);
    if (!emp) return;

    setIsSavingWeeklyOffDay(true);
    try {
      await updateEmployee({
        ...emp,
        weeklyOffDay: typeof selectedWeeklyOffDay === 'number' ? selectedWeeklyOffDay : undefined,
      });

      if (typeof selectedWeeklyOffDay === 'number') {
        const xShift = shiftTypes.find((t) => t.code === 'X');
        if (!xShift) {
          toast.error('ไม่พบประเภทกะ X', 'กรุณาสร้างกะ X ก่อนตั้งวันหยุดประจำสัปดาห์');
          return;
        }
        const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
        const offDates = daysInMonth
          .filter((d) => d.getDay() === selectedWeeklyOffDay)
          .map((d) => format(d, 'yyyy-MM-dd'));
        for (const date of offDates) {
          const existing = schedules.find((s) => s.employeeId === emp.id && s.date === date);
          if (existing) {
            if (existing.shiftTypeId !== xShift.id) {
              await updateSchedule({ ...existing, shiftTypeId: xShift.id, status: 'approved', createdBy: 'manager' });
            }
          } else {
            await updateSchedule({
              id: crypto.randomUUID(),
              employeeId: emp.id,
              date,
              shiftTypeId: xShift.id,
              status: 'approved',
              requestType: 'shift_change',
              createdBy: 'manager',
            });
          }
        }
      }
      setEditingWeeklyOffEmployeeId(null);
      toast.success('ตั้งวันหยุดประจำสัปดาห์เรียบร้อย');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSavingWeeklyOffDay(false);
    }
  };

  const handleDropShift = async (
    e: React.DragEvent<HTMLTableCellElement>,
    targetEmployeeId: string,
    targetDate: string
  ) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData('shift'));
    const sourceEmployeeId = dragData.employeeId;
    const sourceDate = dragData.date;
    if (sourceEmployeeId === targetEmployeeId && sourceDate === targetDate) return;
    try {
      const sourceShift = schedules.find(
        (s) => s.employeeId === sourceEmployeeId && s.date === sourceDate && s.status === 'approved'
      );
      const targetShift = schedules.find(
        (s) => s.employeeId === targetEmployeeId && s.date === targetDate && s.status === 'approved'
      );
      if (!sourceShift) return;
      if (targetShift) {
        await Promise.all([
          updateSchedule({ ...sourceShift, shiftTypeId: targetShift.shiftTypeId }),
          updateSchedule({ ...targetShift, shiftTypeId: sourceShift.shiftTypeId }),
        ]);
      } else {
        await updateSchedule({ ...sourceShift, employeeId: targetEmployeeId });
      }
    } catch (err: unknown) {
      toast.error('ย้ายกะไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const pendingRequests = filterPendingRequests(schedules);
  const resolvedRequests = schedules.filter(
    (s) => (s.status === 'approved' || s.status === 'rejected') && s.requestType && s.requestType !== 'shift_change'
  );

  const allConflicts = useMemo(
    () => validateAllConflicts(schedules, employees, shiftTypes),
    [schedules, employees, shiftTypes],
  );

  const filteredRequests = (requestViewMode === 'pending' ? pendingRequests : resolvedRequests).filter((request) => {
    const employee = employees.find((e) => e.id === request.employeeId);
    const shiftType = shiftTypes.find((t) => t.id === request.shiftTypeId);
    const haystack = [
      employee?.fullName,
      employee?.employeeCode,
      shiftType?.name,
      shiftType?.code,
      request.employeeNote,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(requestSearch.toLowerCase());
  });

  const currentMonthSchedules = useMemo(
    () => schedules.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear() && s.status === 'approved';
    }),
    [schedules, currentMonth],
  );

  const handleClearMonth = async () => {
    const count = currentMonthSchedules.length;
    if (count === 0) {
      toast.info('เดือนนี้ไม่มีตารางงานให้ล้าง');
      return;
    }
    setShowClearConfirm(true);
  };

  const handleCopyFromPrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    const prevMonthStr = format(prevMonth, 'yyyy-MM');
    const prevMonthSchedules = schedules.filter((s) => s.date.startsWith(prevMonthStr) && s.status === 'approved');
    if (prevMonthSchedules.length === 0) {
      toast.info('เดือนก่อนหน้าไม่มีตารางงาน');
      return;
    }

    const currentMonthStr = format(currentMonth, 'yyyy-MM');
    const currentMonthSchedulesExisting = schedules.filter(
      (s) => s.date.startsWith(currentMonthStr) && s.status === 'approved'
    );
    if (currentMonthSchedulesExisting.length > 0) {
      if (!confirm(`เดือนนี้มีตารางอยู่แล้ว ${currentMonthSchedulesExisting.length} รายการ\nต้องการเพิ่มทับหรือไม่?`)) {
        return;
      }
    }

    let copiedCount = 0;
    for (const prevSchedule of prevMonthSchedules) {
      const day = prevSchedule.date.split('-')[2];
      const newDate = `${currentMonthStr}-${day}`;
      const exists = schedules.some(
        (s) => s.date === newDate && s.employeeId === prevSchedule.employeeId && s.status === 'approved'
      );
      if (!exists) {
        updateSchedule({
          ...prevSchedule,
          date: newDate,
          status: 'approved',
        });
        copiedCount++;
      }
    }

    if (copiedCount > 0) {
      toast.success(`คัดลอกตารางสำเร็จ ${copiedCount} รายการ`, `จากเดือน ${format(prevMonth, 'MMMM yyyy', { locale: th })}`);
    } else {
      toast.info('ไม่มีรายการใหม่ให้คัดลอก');
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const stats = [
    { label: 'รออนุมัติ', value: pendingRequests.length, tone: 'warn' as const },
    {
      label: 'อนุมัติวันนี้',
      value: schedules.filter((s) => s.status === 'approved' && s.date === today).length,
      tone: 'success' as const,
    },
    { label: 'ตารางที่ใช้งาน', value: schedules.filter((s) => s.status === 'approved').length, tone: 'brand' as const },
    {
      label: 'จุดว่าง',
      value: 0,
      tone: 'danger' as const,
    },
  ];

  return (
    <div className="w-full">
      {/* Header + Stats (mobile & desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">Manager Control</h2>
            <p className="text-text-tertiary font-medium text-xs sm:text-sm">Store: {settings.storeName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
          {stats.map((item) => (
            <div
              key={item.label}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-center bg-bg-surface',
                item.tone === 'warn' && 'border-warn/20',
                item.tone === 'success' && 'border-success/20',
                item.tone === 'brand' && 'border-brand/20',
                item.tone === 'danger' && 'border-danger/20'
              )}
            >
              <div
                className={cn(
                  'text-lg font-bold leading-none',
                  item.tone === 'warn' && 'text-warn',
                  item.tone === 'success' && 'text-success',
                  item.tone === 'brand' && 'text-brand-accent',
                  item.tone === 'danger' && 'text-danger'
                )}
              >
                {item.value}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-text-quaternary mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: horizontal tabs + month nav */}
      <div className="lg:hidden sticky top-[calc(3.5rem+1px)] z-20 rounded-2xl border border-border-solid bg-bg-panel/80 backdrop-blur-xl p-3 sm:p-4 mb-4">
        <div className="flex flex-col gap-3">
          <ManagerMobileTabs activeTab={activeTab} onTabChange={setActiveTab} onGenerateAI={generateSmartSchedule} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
                title="เดือนก่อนหน้า"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-2 rounded-lg bg-brand/10 text-brand-accent hover:bg-brand/15 transition-colors text-xs font-semibold whitespace-nowrap"
              >
                วันนี้
              </button>
            </div>
            <div className="px-3 py-2 rounded-lg bg-bg-surface border border-white/[0.06] text-sm font-semibold text-text-primary min-w-[130px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: th })}
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
              title="เดือนถัดไป"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="flex gap-5 items-start">
        <ManagerSidebarNav activeTab={activeTab} onTabChange={setActiveTab} onGenerateAI={generateSmartSchedule} onClearMonth={handleClearMonth} scheduleCount={currentMonthSchedules.length} conflicts={allConflicts} />

        <div className="flex-1 min-w-0">
          {/* Desktop month nav */}
          <div className="hidden lg:flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
                title="เดือนก่อนหน้า"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-2 rounded-lg bg-brand/10 text-brand-accent hover:bg-brand/15 transition-colors text-xs font-semibold whitespace-nowrap"
              >
                วันนี้
              </button>
            </div>
            <div className="px-3 py-2 rounded-lg bg-bg-surface border border-white/[0.06] text-sm font-semibold text-text-primary min-w-[130px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: th })}
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="px-3 py-2 rounded-lg bg-bg-surface hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
              title="เดือนถัดไป"
            >
              ›
            </button>
          </div>

          {activeTab === 'coverage' && (
            <CoverageGrid
              currentMonth={currentMonth}
              employees={employees}
              schedules={schedules}
              shiftTypes={shiftTypes}
              positions={positions}
              editingCell={editingCell}
              onOpenCell={handleOpenEditCell}
              onAssignShift={handleAssignShift}
              onClearShift={handleClearShift}
              onCloseCell={() => setEditingCell(null)}
              onDropShift={handleDropShift}
              storeName={settings.storeName}
              onCopyFromPrevMonth={handleCopyFromPrevMonth}
            />
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border-solid pb-3">
                <button
                  onClick={() => { setRequestViewMode('pending'); setRequestSearch(''); }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                    requestViewMode === 'pending'
                      ? 'bg-brand text-white shadow-md'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface'
                  )}
                >
                  รออนุมัติ ({pendingRequests.length})
                </button>
                <button
                  onClick={() => { setRequestViewMode('history'); setRequestSearch(''); }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                    requestViewMode === 'history'
                      ? 'bg-brand text-white shadow-md'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-bg-surface'
                  )}
                >
                  ประวัติ
                </button>
              </div>
              <RequestList
                requests={filteredRequests}
                employees={employees}
                shiftTypes={shiftTypes}
                positions={positions}
                search={requestSearch}
                onSearchChange={setRequestSearch}
                onApprove={(id) => handleUpdateShiftStatus(id, 'approved')}
                onReject={(id) => handleUpdateShiftStatus(id, 'rejected')}
                readOnly={requestViewMode === 'history'}
              />
            </div>
          )}

          {activeTab === 'report' && (
            <ReportPanel
              currentMonth={currentMonth}
              schedules={schedules}
              employees={employees}
              shiftTypes={shiftTypes}
              positions={positions}
            />
          )}

          {activeTab === 'admin' && (
            <AdminTabs
              activeTab={activeAdminTab}
              onTabChange={setActiveAdminTab}
              employees={employees}
              positions={positions}
              positionGroups={positionGroups}
              employeeSearch={employeeSearch}
              onEmployeeSearchChange={setEmployeeSearch}
              onOpenWeeklyOff={handleOpenWeeklyOffDay}
              onDeleteEmployee={deleteEmployee}
              createEmployee={createEmployee}
              shiftTypes={shiftTypes}
              createShiftType={createShiftType}
              updateShiftType={updateShiftType}
              deleteShiftType={deleteShiftType}
              createPosition={createPosition}
              updatePosition={updatePosition}
              deletePosition={deletePosition}
              updateEmployee={updateEmployee}
              positionGroupsForManager={positionGroups}
              createPositionGroup={createPositionGroup}
              updatePositionGroup={updatePositionGroup}
              deletePositionGroup={deletePositionGroup}
              recurringSchedules={recurringSchedules}
              onCreateRecurring={createRecurringSchedule}
              onUpdateRecurring={updateRecurringSchedule}
              onDeleteRecurring={deleteRecurringSchedule}
              onApplyRecurring={applyRecurringSchedules}
              settings={settings}
              updateSettings={updateSettings}
              isSubscribing={isSubscribing}
              onEnableNotifications={handleEnableNotifications}
              onSendTestPush={handleSendTestPush}
              onDeleteSchedulesBeforeDate={deleteSchedulesBeforeDate}
              currentMonth={currentMonth}
            />
          )}

          <WeeklyOffDayEditor
            open={Boolean(editingWeeklyOffEmployeeId)}
            employee={employees.find((e) => e.id === editingWeeklyOffEmployeeId) ?? null}
            selectedDay={selectedWeeklyOffDay}
            isSaving={isSavingWeeklyOffDay}
            onSelectDay={setSelectedWeeklyOffDay}
            onClose={() => setEditingWeeklyOffEmployeeId(null)}
            onSave={handleSaveWeeklyOffDay}
          />

          <ConfirmModal
            open={showClearConfirm}
            title="ล้างตารางทั้งเดือน"
            message={`คุณต้องการลบตารางงานทั้งหมด ${currentMonthSchedules.length} รายการของเดือน ${format(currentMonth, 'MMMM yyyy', { locale: th })} ใช่หรือไม่?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`}
            confirmLabel="ลบทั้งหมด"
            variant="danger"
            onConfirm={async () => {
              await deleteSchedulesByMonth(currentMonth);
              toast.success('ล้างตารางเดือนนี้เรียบร้อย');
            }}
            onCancel={() => setShowClearConfirm(false)}
          />
        </div>
      </div>
    </div>
  );
}
