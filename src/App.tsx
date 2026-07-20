import { useState, useEffect, Suspense, lazy, useCallback } from 'react';

import type { UserRole, Employee } from './types/index';

import { useData } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { useSmartSchedule } from './hooks/useSmartSchedule';
import { useWeeklyOffDay } from './hooks/useWeeklyOffDay';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdatePrompt } from './components/layout/UpdatePrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { FullScreenLoader, FullScreenError } from './components/FullScreenStatus';
import { MyRequestsTab } from './components/employee/MyRequestsTab';
import { EmployeeSettingsTab } from './components/employee/EmployeeSettingsTab';
import { ToastProvider, useToast } from './lib/toast';
import { ThemeProvider } from './lib/theme';
import { WeeklyOffDayEditor } from './components/manager/Modals/WeeklyOffDayEditor';
import { ConfirmModal } from './components/ConfirmModal';
import { SW_UPDATE_INTERVAL_MS, AUTH_EXPIRED_EVENT } from './config/constants';
import { useRealtime } from './hooks/useRealtime';

const EmployeeDashboard = lazy(() =>
  import('./components/employee/EmployeeDashboard').then((m) => ({ default: m.EmployeeDashboard }))
);
const ScheduleConfirmationBanner = lazy(() =>
  import('./components/employee/ScheduleConfirmationBanner').then((m) => ({ default: m.ScheduleConfirmationBanner }))
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

  // Listen for auth-expired events from data mutations (e.g., create-employee 401).
  // Clear session and reload — but only when not mid-mutation to avoid data loss.
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('schodle_auth_employee_id');
      sessionStorage.removeItem('schodle_session_token');
      localStorage.removeItem('schodle_session_token');
      logout();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [logout]);

  const [role, setRole] = useState<UserRole>('employee');
  const effectiveRole = !isManager && role === 'manager' ? 'employee' : role;
  const [activeMobileTab, setActiveMobileTab] = useState<'schedule' | 'requests' | 'settings'>('schedule');
  const [activeView, setActiveView] = useState<'calendar' | 'coverage'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingWeeklyOffDay, setEditingWeeklyOffDay] = useState(false);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
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
    createSchedulesBulk,
    upsertSchedulesBulk,
    deleteSchedulesByMonth,
    deleteSchedulesBeforeDate,
    swapScheduleShifts,
    createEmployee,
    updateEmployee,
    resetEmployeePassword,
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
  } = useData(currentMonth);

  const { activeEditors, syncedAt, isLive } = useRealtime({
    employeeId: currentEmployee?.id || '',
    fullName: currentEmployee?.fullName || '',
    role: currentEmployee?.role || '',
  });

  const { generateSmartSchedule } = useSmartSchedule({
    employees,
    shiftTypes,
    positionGroups,
    schedules,
    currentMonth,
    createSchedulesBulk,
    refresh,
  });

  const { applyWeeklyOffDay } = useWeeklyOffDay({
    schedules,
    shiftTypes,
    currentMonth,
    updateEmployee,
    upsertSchedulesBulk,
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const interval = setInterval(() => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update();
        });
      }, SW_UPDATE_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, []);

  const handleToggleRole = () => {
    const nextRole = effectiveRole === 'employee' ? 'manager' : 'employee';
    // Manager view only has the schedule tab, so reset the mobile tab.
    if (nextRole === 'manager') setActiveMobileTab('schedule');
    setRole(nextRole);
  };

  const handleSaveWeeklyOffDay = useCallback(async () => {
    if (!currentEmployee) return;
    setIsSavingWeeklyOffDay(true);
    try {
      await applyWeeklyOffDay(currentEmployee, selectedWeeklyOffDay, 'employee');
      setEditingWeeklyOffDay(false);
      toast.success('ตั้งวันหยุดประจำสัปดาห์เรียบร้อย');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    } finally {
      setIsSavingWeeklyOffDay(false);
    }
  }, [currentEmployee, selectedWeeklyOffDay, applyWeeklyOffDay, toast]);

  if (authLoading) {
    return <FullScreenLoader message="กำลังโหลด..." />;
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
    return <FullScreenLoader message="กำลังโหลดข้อมูล..." />;
  }

  if (error) {
    return (
      <FullScreenError
        title="โหลดข้อมูลไม่สำเร็จ"
        detail={error}
        retryLabel="ลองใหม่"
        onRetry={() => {
          refresh();
          toast.info('กำลังรีเฟรชข้อมูล...');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-bg-primary text-text-secondary font-sans pb-20 sm:pb-0 overflow-x-hidden">
      <Header
        currentUser={currentUser}
        role={effectiveRole}
        isManager={isManager}
        onToggleRole={handleToggleRole}
        onLogout={logout}
        appName={settings.appName}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        <ErrorBoundary>
          <Suspense fallback={<DashboardFallback />}>
            {effectiveRole === 'employee' ? (
              <>
                {activeMobileTab === 'schedule' && (
                  <>
                    <ScheduleConfirmationBanner
                      employeeId={currentUser.id}
                      currentMonth={currentMonth}
                    />
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
                  </>
                )}
                {activeMobileTab === 'requests' && (
                  <MyRequestsTab
                    currentUserId={currentUser.id}
                    schedules={schedules}
                    shiftTypes={shiftTypes}
                    onCancelRequest={setCancelRequestId}
                  />
                )}
                {activeMobileTab === 'settings' && (
                  <EmployeeSettingsTab
                    currentUser={currentUser}
                    schedules={schedules}
                    shiftTypes={shiftTypes}
                    positions={positions}
                    currentMonth={currentMonth}
                    onEditWeeklyOffDay={() => {
                      setSelectedWeeklyOffDay(typeof currentUser?.weeklyOffDay === 'number' ? currentUser.weeklyOffDay : null);
                      setEditingWeeklyOffDay(true);
                    }}
                  />
                )}
              </>
            ) : isManager ? (
              <ManagerDashboard
                schedules={schedules}
                employees={employees}
                shiftTypes={shiftTypes}
                positions={positions}
                createEmployee={createEmployee}
                updateEmployee={updateEmployee}
                resetEmployeePassword={resetEmployeePassword}
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
                createSchedulesBulk={createSchedulesBulk}
                upsertSchedulesBulk={upsertSchedulesBulk}
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
                activeEditors={activeEditors}
                syncedAt={syncedAt}
                isLive={isLive}
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
      <OfflineBanner />
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

      <ConfirmModal
        open={Boolean(cancelRequestId)}
        title="ยกเลิกคำขอ"
        message="คุณต้องการยกเลิกคำขอนี้ใช่หรือไม่?"
        confirmLabel="ยกเลิกคำขอ"
        variant="danger"
        onConfirm={async () => {
          if (!cancelRequestId) return;
          try {
            await deleteSchedule(cancelRequestId);
            toast.success('ยกเลิกคำขอแล้ว');
          } catch {
            toast.error('ยกเลิกไม่สำเร็จ');
          }
        }}
        onCancel={() => setCancelRequestId(null)}
      />
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
