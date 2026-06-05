/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, Suspense, lazy } from 'react';

import { Clock, Settings } from 'lucide-react';
import { format } from 'date-fns';
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
import { th } from 'date-fns/locale';
import { cn } from './lib/utils';
import { generateSmartSchedule as runSmartSchedule } from './lib/schedule-generator';

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
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    const xShift = shiftTypes.find((t) => t.code === 'X');
    if (!xShift) {
      toast.error('ไม่พบประเภทกะ X', 'กรุณาสร้างกะ X ก่อนรัน AI');
      return;
    }

    const { entries, warnings } = runSmartSchedule({
      month: currentMonth,
      employees,
      shiftTypes,
      existingEntries: schedules,
    });

    if (entries.length === 0) {
      toast.warning(
        'ไม่สามารถจัดตารางได้',
        'ไม่มีกะที่ตั้งเป้าไว้ (target_staff > 0) — กรุณาตั้งค่ากะก่อน'
      );
      return;
    }

    for (const entry of entries) {
      await updateSchedule(entry);
    }
    await refresh();
    if (warnings.length > 0) {
      console.warn('[generateSmartSchedule] warnings:', warnings);
    }
    toast.success('จัดตารางอัตโนมัติสำเร็จ', 'ระบบได้ตรวจสอบเงื่อนไขกะดึก-เช้าเรียบร้อยแล้ว');
  };

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
                <div className="sm:hidden mb-4 rounded-2xl border border-white/[0.08] bg-bg-surface/80 backdrop-blur px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="text-text-quaternary uppercase tracking-[0.16em] font-semibold">มุมมองปัจจุบัน</p>
                      <p className="text-text-primary font-medium mt-0.5">
                        {activeMobileTab === 'schedule' ? 'ตารางงาน' : activeMobileTab === 'requests' ? 'คำขอลา' : 'ตั้งค่า'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveMobileTab('schedule')}
                      className="px-3 py-1.5 rounded-full bg-brand/10 text-brand-accent font-medium"
                    >
                      กลับสู่ตาราง
                    </button>
                  </div>
                </div>

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
                  />
                )}
                {activeMobileTab === 'requests' && (
                  <div className="space-y-4 pb-24">
                    <div className="px-4 pt-2">
                      <h2 className="text-xl font-bold text-text-primary">ระบบขอลา</h2>
                      <p className="text-xs text-text-tertiary">ติดตามสถานะคำขอลาและวันหยุดของคุณ</p>
                    </div>

                    {schedules.filter((s) => s.employeeId === currentUser?.id).length > 0 ? (
                      <div className="space-y-3 px-4">
                        {schedules
                          .filter((s) => s.employeeId === currentUser?.id)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((s) => {
                            const sType = shiftTypes.find((t) => t.id === s.shiftTypeId);
                            const isApproved = s.status === 'approved';
                            const isRejected = s.status === 'rejected';

                            return (
                              <div
                                key={s.id}
                                className={cn(
                                  'p-4 rounded-2xl border transition-all duration-200 animate-fade-in',
                                  isApproved
                                    ? 'bg-success/5 border-success/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]'
                                    : isRejected
                                    ? 'bg-error/5 border-error/20'
                                    : 'bg-warn/5 border-warn/20'
                                )}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm',
                                        isApproved ? 'bg-success' : isRejected ? 'bg-error' : 'bg-warn'
                                      )}
                                    >
                                      {sType?.code || '??'}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-text-primary">{sType?.name || 'ไม่ทราบประเภท'}</div>
                                      <div className="text-[10px] text-text-tertiary font-medium">
                                        {format(new Date(s.date), 'eeee d MMMM yyyy', { locale: th })}
                                      </div>
                                    </div>
                                  </div>
                                  <div
                                    className={cn(
                                      'text-[10px] font-bold px-2 py-1 rounded-lg',
                                      isApproved ? 'bg-success/20 text-success' : isRejected ? 'bg-error/20 text-error' : 'bg-warn/20 text-warn'
                                    )}
                                  >
                                    {isApproved ? 'อนุมัติแล้ว' : isRejected ? 'ปฏิเสธ' : 'รออนุมัติ'}
                                  </div>
                                </div>

                                {(s.employeeNote || s.managerRemark) && (
                                  <div className="space-y-2 mt-3 pt-3 border-t border-white/[0.05]">
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
                    ) : (
                      <div className="card p-10 text-center mx-4">
                        <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
                          <Clock className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-text-primary mb-1">ยังไม่มีรายการ</h3>
                        <p className="text-sm text-text-tertiary">คุณยังไม่ได้ส่งคำขอลาหรือวันหยุดในขณะนี้</p>
                      </div>
                    )}
                  </div>
                )}
                {activeMobileTab === 'settings' && (
                  <div className="card p-10 text-center">
                    <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
                      <Settings className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-1">ตั้งค่า</h3>
                    <p className="text-sm text-text-tertiary">ส่วนการตั้งค่ากำลังอยู่ระหว่างการพัฒนา</p>
                  </div>
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
                updateSchedule={updateSchedule}
                deleteSchedule={deleteSchedule}
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                generateSmartSchedule={generateSmartSchedule}
                settings={settings}
                updateSettings={updateSettings}
                currentUser={currentUser!}
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
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      <MobileNav activeTab={activeMobileTab} onChangeTab={setActiveMobileTab} />
      <UpdatePrompt />

      <ChangePasswordModal
        open={isLoggedIn && mustChangePassword}
        force
        onSuccess={async () => {
          clearMustChangePassword();
          await refreshProfile();
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallbackTitle="เกิดข้อผิดพลาดร้ายแรง">
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
