/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, Suspense, lazy, useCallback } from 'react';

import { Clock, Calendar, Briefcase, ChevronRight } from 'lucide-react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import type { UserRole, Employee } from './types/index';


import { useData } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdatePrompt } from './components/layout/UpdatePrompt';
import { ToastProvider, useToast } from './lib/toast';
import { ThemeProvider } from './lib/theme';
import { th } from 'date-fns/locale';
import { cn } from './lib/utils';
import { generateSmartSchedule as runSmartSchedule } from './lib/schedule-generator';
import { WeeklyOffDayEditor, WEEKLY_OFF_DAYS } from './components/manager/Modals/WeeklyOffDayEditor';
import { getEmployeeMonthlyStats } from './lib/schedule-utils';

const EmployeeDashboard = lazy(() =>
  import('./components/employee/EmployeeDashboard').then((m) => ({ default: m.EmployeeDashboard }))
);
const ManagerDashboard = lazy(() =>
  import('./components/manager/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard }))
);

function DashboardFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-text-tertiary">กำลังโหลดหน้า...</p>
      </div>
    </div>
  );
}

function AppShell() {
  const toast = useToast();
  const {
    currentEmployee,
    isLoggedIn,
    isManager,
    isLoading: authLoading,
    authError,
    login,
    logout,
    refreshProfile,
    clearMustChangePassword,
  } = useAuth();

  const mustChangePassword = !!currentEmployee?.mustChangePassword;

  const [role, setRole] = useState<UserRole>('employee');
  const effectiveRole = !isManager && role === 'manager' ? 'employee' : role;
  const [activeMobileTab, setActiveMobileTab] = useState<'schedule' | 'requests' | 'settings'>('schedule');
  const [activeView, setActiveView] = useState<'calendar' | 'coverage'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingWeeklyOffDay, setEditingWeeklyOffDay] = useState(false);
  const [selectedWeeklyOffDay, setSelectedWeeklyOffDay] = useState<number | null>(null);
  const [isSavingWeeklyOffDay, setIsSavingWeeklyOffDay] = useState(false);

  const {
    employees,
    positions,
    shiftTypes,
    schedules,
    loading,
    error,
    refresh,
    updateSchedule,
    deleteSchedule,
    deleteSchedulesByMonth,
    deleteSchedulesBeforeDate,
    swapScheduleShifts,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createPosition,
    updatePosition,
    deletePosition,
    createShiftType,
    updateShiftType,
    deleteShiftType,
    positionGroups,
    createPositionGroup,
    updatePositionGroup,
    deletePositionGroup,
    recurringSchedules,
    createRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    applyRecurringSchedules,
    settings,
    updateSettings,
    uploadFile,
  } = useData();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const interval = setInterval(() => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update();
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (effectiveRole === 'manager' && activeMobileTab !== 'schedule') {
      setActiveMobileTab('schedule');
    }
  }, [effectiveRole, activeMobileTab]);

  const generateSmartSchedule = async () => {
    if (employees.length === 0) {
      toast.warning('ไม่มีพนักงาน', 'กรุณาเพิ่มพนักงานก่อนรัน AI');
      return;
    }
    const xShift = shiftTypes.find((t) => t.code === 'X');
    if (!xShift) {
      toast.error('ไม่พบประเภทกะ X', 'กรุณาสร้างกะ X (กะหยุด) ก่อนรัน AI');
      return;
    }
    const targetShifts = shiftTypes.filter((t) => (t.targetStaff || 0) > 0);
    if (targetShifts.length === 0) {
      toast.warning(
        'ไม่มีกะที่ตั้งเป้าไว้',
        'ไปที่ "ตั้งค่า → ประเภทกะ" แล้วตั้งค่า target_staff (> 0) ให้กะที่ต้องการจัด'
      );
      return;
    }

    const { entries, warnings } = runSmartSchedule({
      month: currentMonth,
      employees,
      shiftTypes,
      existingEntries: schedules,
    });

    if (entries.length === 0) {
      console.warn('[generateSmartSchedule] no entries — shiftTypes:', shiftTypes);
      toast.error(
        'ไม่สามารถจัดตารางได้',
        'ตรวจสอบว่าพนักงานมี position_id และไม่ขัดกับกะดึก-เช้า'
      );
      return;
    }

    let failed = 0;
    for (const entry of entries) {
      try {
        await updateSchedule(entry);
      } catch (err) {
        failed += 1;
        console.error('[generateSmartSchedule] update failed:', err, entry);
      }
    }
    await refresh();
    if (warnings.length > 0) {
      console.warn('[generateSmartSchedule] warnings:', warnings);
    }
    if (failed > 0) {
      toast.warning(
        `จัดตารางสำเร็จ ${entries.length - failed} รายการ`,
        `มี ${failed} รายการล้มเหลว (ดู Console)`
      );
    } else {
      toast.success(
        `จัดตารางอัตโนมัติสำเร็จ ${entries.length} รายการ`,
        'ระบบได้ตรวจสอบเงื่อนไขกะดึก-เช้าเรียบร้อยแล้ว'
      );
    }
  };

  const handleSaveWeeklyOffDay = useCallback(async () => {
    if (!currentEmployee) return;
    setIsSavingWeeklyOffDay(true);
    try {
      await updateEmployee({
        ...currentEmployee,
        weeklyOffDay: typeof selectedWeeklyOffDay === 'number' ? selectedWeeklyOffDay : undefined,
      });
      if (typeof selectedWeeklyOffDay === 'number') {
        const xShift = shiftTypes.find((t) => t.code === 'X');
        if (xShift) {
          const daysInMonth = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth),
          });
          const offDates = daysInMonth
            .filter((d) => d.getDay() === selectedWeeklyOffDay)
            .map((d) => format(d, 'yyyy-MM-dd'));
          for (const date of offDates) {
            const existing = schedules.find((s) => s.employeeId === currentEmployee.id && s.date === date);
            if (existing) {
              if (existing.shiftTypeId !== xShift.id) {
                await updateSchedule({ ...existing, shiftTypeId: xShift.id, status: 'approved', createdBy: 'employee' });
              }
            } else {
              await updateSchedule({
                id: crypto.randomUUID(), employeeId: currentEmployee.id, date,
                shiftTypeId: xShift.id, status: 'approved',
                requestType: 'shift_change', createdBy: 'employee',
              });
            }
          }
        }
      }
      setEditingWeeklyOffDay(false);
      toast.success('ตั้งวันหยุดประจำสัปดาห์เรียบร้อย');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSavingWeeklyOffDay(false);
    }
  }, [currentEmployee, selectedWeeklyOffDay, updateEmployee, updateSchedule, shiftTypes, currentMonth, schedules]);

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center text-text-secondary font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-tertiary">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={login} error={authError} isLoading={authLoading} appName={settings.appName} />;
  }

  const currentUser: Employee = currentEmployee || ({
    id: '',
    employeeCode: '',
    fullName: 'Loading...',
    positionId: '',
    role: 'employee',
  } as Employee);

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center text-text-secondary font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-tertiary">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center text-text-secondary font-sans">
        <div className="text-center space-y-3">
          <p className="text-danger font-medium">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="text-sm text-text-tertiary">{error}</p>
          <button
            onClick={() => {
              refresh();
              toast.info('กำลังรีเฟรชข้อมูล...');
            }}
            className="btn btn-primary text-sm"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-bg-primary text-text-secondary font-sans pb-20 sm:pb-0 overflow-x-hidden">
      <Header
        currentUser={currentUser}
        role={effectiveRole}
        isManager={isManager}
        onToggleRole={() => setRole(effectiveRole === 'employee' ? 'manager' : 'employee')}
        onLogout={logout}
        appName={settings.appName}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        <ErrorBoundary>
          <Suspense fallback={<DashboardFallback />}>
            {effectiveRole === 'employee' ? (
              <>
                {activeMobileTab === 'schedule' && (
                  <EmployeeDashboard
                    currentUser={currentUser}
                    schedules={schedules}
                    updateSchedule={updateSchedule}
                    shiftTypes={shiftTypes}
                    employees={employees}
                    positions={positions}
                    uploadFile={uploadFile}
                    settings={settings}
                    activeView={activeView}
                    onActiveViewChange={setActiveView}
                  />
                )}
                {activeMobileTab === 'requests' && (
                  <div className="space-y-4 pb-24">
                    <div className="px-4 pt-2">
                      <h2 className="text-xl font-bold text-text-primary">ระบบขอลา</h2>
                      <p className="text-xs text-text-tertiary">ติดตามสถานะคำขอลาและวันหยุดของคุณ</p>
                    </div>

                    {(() => {
                      const myRequests = schedules
                        .filter(
                          (s) =>
                            s.employeeId === currentUser?.id &&
                            s.createdBy === 'employee' &&
                            (s.status === 'approved' || s.status === 'pending' || s.status === 'rejected'),
                        )
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (myRequests.length === 0) {
                        return (
                          <div className="card p-10 text-center mx-4">
                            <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
                              <Clock className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-text-primary mb-1">ยังไม่มีรายการ</h3>
                            <p className="text-sm text-text-tertiary">คุณยังไม่ได้ส่งคำขอลาหรือวันหยุดในขณะนี้</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 px-4">
                          {myRequests.map((s) => {
                            const sType = shiftTypes.find((t) => t.id === s.shiftTypeId);
                            const isApproved = s.status === 'approved';

                            return (
                              <div
                                key={s.id}
                                className={cn(
                                  'p-4 rounded-2xl border transition-all duration-200 animate-fade-in',
                                  isApproved
                                    ? 'bg-success/10 border-success/30'
                                    : 'bg-warn/10 border-warn/30',
                                )}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm',
                                        isApproved ? 'bg-success' : s.status === 'rejected' ? 'bg-danger' : 'bg-warn',
                                      )}
                                    >
                                      {sType?.code || '??'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-text-primary">{sType?.name || 'ไม่ทราบประเภท'}</span>
                                        {s.requestType === 'late_scan' && (
                                          <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                                            มาสาย/ลืมแสกน
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-text-tertiary font-medium">
                                        {format(new Date(s.date), 'eeee d MMMM yyyy', { locale: th })}
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={cn(
                                      'text-[10px] font-bold px-2 py-1 rounded-lg',
                                      isApproved ? 'bg-success/20 text-success' : s.status === 'rejected' ? 'bg-danger/20 text-danger' : 'bg-warn/20 text-warn',
                                    )}
                                  >
                                    {isApproved ? 'อนุมัติแล้ว' : s.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ'}
                                  </div>
                                </div>

                                {(s.employeeNote || s.managerRemark) && (
                                  <div className="space-y-2 mt-3 pt-3 border-t border-border-solid">
                                    {s.employeeNote && (
                                      <div className="flex gap-2">
                                        <div className="text-[10px] font-bold text-text-quaternary uppercase shrink-0">คำขอ:</div>
                                        <div className="text-xs text-text-secondary italic">&ldquo;{s.employeeNote}&rdquo;</div>
                                      </div>
                                    )}
                                    {s.managerRemark && (
                                      <div className="flex gap-2">
                                        <div className="text-[10px] font-bold text-text-quaternary uppercase shrink-0">เหตุผล:</div>
                                        <div className="text-xs text-text-primary font-medium">{s.managerRemark}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {activeMobileTab === 'settings' && (() => {
                  const stats = getEmployeeMonthlyStats(
                    currentUser?.id || '',
                    schedules.filter((s) => {
                      const d = new Date(s.date);
                      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                    }),
                    shiftTypes,
                  );
                  const weeklyOffLabel = typeof currentUser?.weeklyOffDay === 'number'
                    ? WEEKLY_OFF_DAYS.find((d) => d.value === currentUser.weeklyOffDay)?.label || 'ไม่ระบุ'
                    : 'ยังไม่ได้ตั้ง';
                  const totalLeaveDays = Object.values(stats.counts).reduce((a, b) => a + b, 0);
                  const vacationDays = stats.counts['V'] || 0;
                  const sickDays = stats.counts['ป่วย'] || 0;
                  const position = positions.find((p) => p.id === currentUser?.positionId);

                  return (
                    <div className="space-y-4 pb-24">
                      {/* Profile */}
                      <div className="card p-5 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-brand/15 flex items-center justify-center text-brand font-bold text-lg">
                            {currentUser?.fullName?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-text-primary truncate">{currentUser?.fullName}</p>
                            <p className="text-xs text-text-tertiary">{currentUser?.employeeCode} · {position?.name || ''}</p>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Off Day */}
                      <div className="card p-5 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand" />
                            <h3 className="text-sm font-bold text-text-primary">วันหยุดประจำสัปดาห์</h3>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedWeeklyOffDay(typeof currentUser?.weeklyOffDay === 'number' ? currentUser.weeklyOffDay : null);
                              setEditingWeeklyOffDay(true);
                            }}
                            className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors flex items-center gap-1"
                          >
                            แก้ไข <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className={cn(
                          'p-3 rounded-xl border',
                          typeof currentUser?.weeklyOffDay === 'number'
                            ? 'bg-success/10 border-success/20'
                            : 'bg-bg-surface border-border-solid',
                        )}>
                          <p className={cn(
                            'text-sm font-bold',
                            typeof currentUser?.weeklyOffDay === 'number' ? 'text-success' : 'text-text-tertiary',
                          )}>
                            {typeof currentUser?.weeklyOffDay === 'number'
                              ? 'หยุดทุกวัน' + weeklyOffLabel
                              : 'ยังไม่ได้ตั้งวันหยุด'}
                          </p>
                          <p className="text-[10px] text-text-quaternary mt-1">กะงาน X จะถูกจัดให้อัตโนมัติทุกสัปดาห์</p>
                        </div>
                      </div>

                      {/* Leave Stats */}
                      <div className="card p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-4">
                          <Briefcase className="w-4 h-4 text-brand" />
                          <h3 className="text-sm font-bold text-text-primary">
                            สรุปวันลา เดือน{format(currentMonth, 'MMMM', { locale: th })}
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-bg-surface rounded-xl text-center">
                            <p className="text-xl font-bold text-text-primary">{totalLeaveDays}</p>
                            <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">ลาทั้งหมด</p>
                          </div>
                          <div className="p-3 bg-success/10 rounded-xl text-center">
                            <p className="text-xl font-bold text-success">{vacationDays}</p>
                            <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">ลากิจ</p>
                          </div>
                          <div className="p-3 bg-warn/10 rounded-xl text-center">
                            <p className="text-xl font-bold text-warn">{sickDays}</p>
                            <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">ลาป่วย</p>
                          </div>
                        </div>
                        {totalLeaveDays === 0 && (
                          <p className="text-[10px] text-text-quaternary text-center mt-3">เดือนนี้ยังไม่มีวันลา</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : isManager ? (
              <ManagerDashboard
                schedules={schedules}
                employees={employees}
                shiftTypes={shiftTypes}
                positions={positions}
                createEmployee={createEmployee}
                updateEmployee={updateEmployee}
                deleteEmployee={deleteEmployee}
                createShiftType={createShiftType}
                updateShiftType={updateShiftType}
                deleteShiftType={deleteShiftType}
                createPosition={createPosition}
                updatePosition={updatePosition}
                deletePosition={deletePosition}
                positionGroups={positionGroups}
                createPositionGroup={createPositionGroup}
                updatePositionGroup={updatePositionGroup}
                deletePositionGroup={deletePositionGroup}
                recurringSchedules={recurringSchedules}
                createRecurringSchedule={createRecurringSchedule}
                updateRecurringSchedule={updateRecurringSchedule}
                deleteRecurringSchedule={deleteRecurringSchedule}
                applyRecurringSchedules={applyRecurringSchedules}
                updateSchedule={updateSchedule}
                deleteSchedule={deleteSchedule}
                deleteSchedulesByMonth={deleteSchedulesByMonth}
                deleteSchedulesBeforeDate={deleteSchedulesBeforeDate}
                swapScheduleShifts={swapScheduleShifts}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                generateSmartSchedule={generateSmartSchedule}
                settings={settings}
                updateSettings={updateSettings}
                currentUser={currentUser}
              />
            ) : (
              <EmployeeDashboard
                currentUser={currentUser!}
                schedules={schedules}
                updateSchedule={updateSchedule}
                shiftTypes={shiftTypes}
                employees={employees}
                positions={positions}
                uploadFile={uploadFile}
                settings={settings}
                activeView={activeView}
                onActiveViewChange={setActiveView}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      <MobileNav activeTab={activeMobileTab} onChangeTab={setActiveMobileTab} activeView={activeView} onChangeView={setActiveView} />
      <UpdatePrompt />

      <ChangePasswordModal
        open={isLoggedIn && mustChangePassword}
        force
        onSuccess={async () => {
          clearMustChangePassword();
          await refreshProfile();
        }}
      />

      {effectiveRole === 'employee' && (
        <WeeklyOffDayEditor
          open={editingWeeklyOffDay}
          employee={currentUser}
          selectedDay={selectedWeeklyOffDay}
          isSaving={isSavingWeeklyOffDay}
          onSelectDay={setSelectedWeeklyOffDay}
          onClose={() => setEditingWeeklyOffDay(false)}
          onSave={handleSaveWeeklyOffDay}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดร้ายแรง">
      <ThemeProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
