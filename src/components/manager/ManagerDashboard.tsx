import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { planClearMonth } from '../../lib/clear-month';
import { filterPendingRequests } from '../../lib/schedule-utils';
import { validateAllConflicts } from '../../lib/conflict-validator';
import { subscribeToNotifications, sendTestPushToSelf } from '../../lib/push';
import { useToast } from '../../lib/toast';
import { useWeeklyOffDay } from '../../hooks/useWeeklyOffDay';
import { WeeklyOffDayEditor } from './Modals/WeeklyOffDayEditor';
import { ConfirmModal } from '../ConfirmModal';
import { CoverageGrid } from './CoverageGrid';
import { RequestList } from './RequestList';
import { ReportPanel } from './ReportPanel';
import { AdminTabs, type AdminTabId } from './AdminTabs/AdminTabs';
import { ManagerSidebarNav, ManagerMobileTabs } from './ManagerSidebarNav';
import { ManagerMonthNav } from './ManagerMonthNav';
import { ManagerStatsHeader } from './ManagerStatsHeader';
import { CoverageSummaryTab } from './CoverageSummaryTab';
import { useManagerScheduleActions } from './hooks/useManagerScheduleActions';
import { useNewRequestNotifications } from './hooks/useNewRequestNotifications';
import type {
  AppSettings,
  Employee,
  Position,
  PositionGroup,
  RecurringSchedule,
  ScheduleEntry,
  ShiftType,
} from '../../types';

import type { ActiveEditor } from '../../hooks/useRealtime';

interface ManagerDashboardProps {
  currentUser: Employee;
  schedules: ScheduleEntry[];
  employees: Employee[];
  shiftTypes: ShiftType[];
  positions: Position[];
  createEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  resetEmployeePassword: (employee: Employee) => Promise<void>;
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
  updateSchedule: (entry: ScheduleEntry, forceNotify?: boolean, skipWeeklyOffValidation?: boolean) => Promise<void>;
  createSchedulesBulk: (entries: ScheduleEntry[]) => Promise<{ inserted: number; failed: number }>;
  upsertSchedulesBulk: (entries: ScheduleEntry[]) => Promise<void>;
  swapScheduleShifts: (requesterId: string, targetId: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  deleteSchedulesByMonth: (month: Date) => Promise<{ deleted: number; preserved: number }>;
  deleteSchedulesBeforeDate: (beforeDate: string) => Promise<void>;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  generateSmartSchedule: () => void;
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => Promise<void>;
  activeEditors: ActiveEditor[];
  syncedAt: Date | null;
  isLive: boolean;
}

export type TabId = 'coverage' | 'coverage-summary' | 'requests' | 'report' | 'admin';

export function ManagerDashboard({
  currentUser,
  schedules,
  employees,
  shiftTypes,
  positions,
  createEmployee,
  updateEmployee,
  resetEmployeePassword,
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
  createSchedulesBulk,
  upsertSchedulesBulk,
  deleteSchedule,
  deleteSchedulesByMonth,
  deleteSchedulesBeforeDate,
  swapScheduleShifts,
  currentMonth,
  setCurrentMonth,
  generateSmartSchedule,
  settings,
  updateSettings,
  activeEditors,
  syncedAt,
  isLive,
}: ManagerDashboardProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('coverage');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>('employees');
  const [editingWeeklyOffEmployeeId, setEditingWeeklyOffEmployeeId] = useState<string | null>(null);
  const [selectedWeeklyOffDay, setSelectedWeeklyOffDay] = useState<number | null>(null);
  const [isSavingWeeklyOffDay, setIsSavingWeeklyOffDay] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestViewMode, setRequestViewMode] = useState<'pending' | 'history'>('pending');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useNewRequestNotifications(schedules, employees, shiftTypes);

  const {
    editingCell,
    setEditingCell,
    copyConfirmCount,
    setCopyConfirmCount,
    handleUpdateShiftStatus,
    handleOpenEditCell,
    handleAssignShift,
    handleClearShift,
    handleBulkAssign,
    handleMoveOffDay,
    handleDropShift,
    handleSwapShifts,
    handleCopyFromPrevMonth,
    confirmCopyFromPrevMonth,
    handleApplyTemplate,
  } = useManagerScheduleActions({
    schedules,
    employees,
    shiftTypes,
    currentMonth,
    updateSchedule,
    deleteSchedule,
    swapScheduleShifts,
    createSchedulesBulk,
  });

  const { applyWeeklyOffDay } = useWeeklyOffDay({
    schedules,
    shiftTypes,
    currentMonth,
    updateEmployee,
    upsertSchedulesBulk,
  });

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
      const { xShiftMissing } = await applyWeeklyOffDay(emp, selectedWeeklyOffDay, 'manager');
      if (xShiftMissing) {
        toast.error('ไม่พบประเภทกะ X', 'กรุณาสร้างกะ X ก่อนตั้งวันหยุดประจำสัปดาห์');
        return;
      }
      setEditingWeeklyOffEmployeeId(null);
      toast.success('ตั้งวันหยุดประจำสัปดาห์เรียบร้อย');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSavingWeeklyOffDay(false);
    }
  };

  const pendingRequests = filterPendingRequests(schedules);
  const resolvedRequests = schedules.filter(
    (s) => (s.status === 'approved' || s.status === 'rejected') && s.requestType && s.requestType !== 'shift_change'
  );

  const allConflicts = useMemo(
    () => validateAllConflicts(schedules, employees, shiftTypes, undefined, undefined, positionGroups),
    [schedules, employees, shiftTypes, positionGroups],
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
      const d = new Date(`${s.date}T00:00:00`);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear() && s.status === 'approved';
    }),
    [schedules, currentMonth],
  );

  const handleClearMonth = async () => {
    if (currentMonthSchedules.length === 0) {
      toast.info('เดือนนี้ไม่มีตารางงานให้ล้าง');
      return;
    }
    setShowClearConfirm(true);
  };

  return (
    <div className="w-full">
      <ManagerStatsHeader storeName={settings.storeName} schedules={schedules} />

      {/* Mobile: horizontal tabs + month nav */}
      <div className="lg:hidden sticky top-[calc(3.5rem+1px)] z-20 rounded-2xl border border-border-solid bg-bg-panel/80 backdrop-blur-xl p-3 sm:p-4 mb-4">
        <div className="flex flex-col gap-3">
          <ManagerMobileTabs activeTab={activeTab} onTabChange={setActiveTab} onGenerateAI={generateSmartSchedule} />
          <ManagerMonthNav
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            activeEditors={activeEditors}
            syncedAt={syncedAt}
            isLive={isLive}
          />
        </div>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="flex gap-5 items-start">
        <ManagerSidebarNav activeTab={activeTab} onTabChange={setActiveTab} onGenerateAI={generateSmartSchedule} onClearMonth={handleClearMonth} scheduleCount={currentMonthSchedules.length} conflicts={allConflicts} />

        <div className="flex-1 min-w-0">
          {/* Desktop month nav */}
          <div className="hidden lg:flex mb-4">
            <ManagerMonthNav
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              activeEditors={activeEditors}
              syncedAt={syncedAt}
              isLive={isLive}
            />
          </div>

          {activeTab === 'coverage' && (
            <CoverageGrid
              currentMonth={currentMonth}
              employees={employees}
              schedules={schedules}
              shiftTypes={shiftTypes}
              positions={positions}
              positionGroups={positionGroups}
              editingCell={editingCell}
              onOpenCell={handleOpenEditCell}
              onAssignShift={handleAssignShift}
              onClearShift={handleClearShift}
              onCloseCell={() => setEditingCell(null)}
              onDropShift={handleDropShift}
              onSwapShifts={handleSwapShifts}
              onBulkAssign={handleBulkAssign}
              onMoveOffDay={handleMoveOffDay}
              storeName={settings.storeName}
              onCopyFromPrevMonth={handleCopyFromPrevMonth}
              onApplyTemplate={handleApplyTemplate}
            />
          )}

          {activeTab === 'coverage-summary' && (
            <CoverageSummaryTab
              schedules={schedules}
              employees={employees}
              positions={positions}
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
              positionGroups={positionGroups}
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
              resetEmployeePassword={resetEmployeePassword}
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
              schedules={schedules}
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
            message={(() => {
              const plan = planClearMonth({
                monthPrefix: format(currentMonth, 'yyyy-MM'),
                schedules,
                shiftTypes,
              });
              const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: th });
              const base = `คุณต้องการลบตารางงาน ${plan.idsToDelete.length} รายการของเดือน ${monthLabel} ใช่หรือไม่?`;
              if (plan.preservedCount === 0) {
                return `${base}\n\nยังไม่ได้ตั้งกะที่ "ไม่ลบตอนล้างตาราง" — ตั้งได้ที่ ตั้งค่า → ประเภทกะ`;
              }
              return `${base}\n\nจะเก็บไว้ ${plan.preservedCount} รายการ (กะ ${plan.preservedCodes.join(', ')}) ตามที่ตั้งค่าไว้`;
            })()}
            confirmLabel="ลบตารางเดือนนี้"
            variant="danger"
            onConfirm={async () => {
              try {
                const { deleted, preserved } = await deleteSchedulesByMonth(currentMonth);
                toast.success(
                  `ล้างตารางเดือนนี้เรียบร้อย (${deleted} รายการ)`,
                  preserved > 0 ? `เก็บกะที่ตั้งค่าไว้ ${preserved} รายการ` : undefined,
                );
              } catch (err: unknown) {
                toast.error('ล้างตารางไม่สำเร็จ', err instanceof Error ? err.message : undefined);
              }
            }}
            onCancel={() => setShowClearConfirm(false)}
          />

          <ConfirmModal
            open={copyConfirmCount !== null}
            title="เพิ่มทับตารางเดือนปัจจุบัน"
            message={`เดือนนี้มีตารางอยู่แล้ว ${copyConfirmCount ?? 0} รายการ\n\nรายการที่ซ้ำกันจะถูกข้ามไป (ไม่เขียนทับ) ต้องการดำเนินการต่อหรือไม่?`}
            confirmLabel="เพิ่มต่อ"
            variant="warning"
            onConfirm={confirmCopyFromPrevMonth}
            onCancel={() => setCopyConfirmCount(null)}
          />
        </div>
      </div>
    </div>
  );
}
