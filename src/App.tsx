import { useState, useEffect } from 'react';

import { Clock, Settings } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { ScheduleEntry, UserRole, Employee } from './types/index';
import { useData } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { LoginPage } from './components/auth/LoginPage';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { UpdatePrompt } from './components/layout/UpdatePrompt';


function App() {
  const {
    currentEmployee,
    isLoggedIn,
    isManager,
    isLoading: authLoading,
    authError,
    login,
    logout,
  } = useAuth();

  const [role, setRole] = useState<UserRole>('employee');
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
    settings,
    updateSettings,
    uploadFile,
  } = useData();

  // Periodic check for SW updates (every 60s)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const interval = setInterval(() => {
        navigator.serviceWorker.ready.then(registration => {
          registration.update();
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, []);




  // Reset role to employee for non-managers
  useEffect(() => {
    if (!isManager && role === 'manager') {
      setRole('employee');
    }
  }, [isManager, role]);



  const generateSmartSchedule = async () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const newEntries: ScheduleEntry[] = [];

    const lateShifts = ['XC', 'EV', 'A2'];
    const earlyShifts = ['M1', 'M2'];

    days.forEach((day, dayIdx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const assignedThisDay = new Set<string>();
      const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

      const targetShiftTypes = shiftTypes.filter((t) => (t.targetStaff || 0) > 0);
      const remainingByType = new Map<string, number>(
        targetShiftTypes.map((t) => [t.id, t.targetStaff || 0])
      );

      let assignedMorningSlots = 0;
      let assignedAfternoonSlots = 0;

      const getRemainingSlots = (category: 'morning' | 'afternoon' | 'other') =>
        targetShiftTypes
          .filter((t) => (t.category || 'other') === category)
          .reduce((sum, t) => sum + (remainingByType.get(t.id) || 0), 0);

      const canAssignEmployeeToShift = (employeeId: string, shiftTypeId: string) => {
        if (assignedThisDay.has(employeeId)) return false;
        if (dayIdx <= 0) return true;

        const yesterdayDateStr = format(days[dayIdx - 1], 'yyyy-MM-dd');
        const yesterdayShift = newEntries.find(
          (s) => s.employeeId === employeeId && s.date === yesterdayDateStr
        );
        if (!yesterdayShift) return true;

        const yesterdayShiftType = shiftTypes.find((t) => t.id === yesterdayShift.shiftTypeId);
        const nextShiftType = shiftTypes.find((t) => t.id === shiftTypeId);
        if (!yesterdayShiftType || !nextShiftType) return true;

        if (lateShifts.includes(yesterdayShiftType.code) && earlyShifts.includes(nextShiftType.code)) {
          return false;
        }

        return true;
      };

      while (true) {
        const remainingTotal = Array.from(remainingByType.values()).reduce((s, n) => s + n, 0);
        if (remainingTotal <= 0) break;

        const remainingMorning = getRemainingSlots('morning');
        const remainingAfternoon = getRemainingSlots('afternoon');

        let desiredCategory: 'morning' | 'afternoon' | 'other' = 'other';
        if (remainingMorning > 0 || remainingAfternoon > 0) {
          if (remainingMorning > 0 && remainingAfternoon > 0) {
            if (assignedMorningSlots - assignedAfternoonSlots >= 1) desiredCategory = 'afternoon';
            else if (assignedAfternoonSlots - assignedMorningSlots >= 1) desiredCategory = 'morning';
            else desiredCategory = remainingMorning >= remainingAfternoon ? 'morning' : 'afternoon';
          } else {
            desiredCategory = remainingMorning > 0 ? 'morning' : 'afternoon';
          }
        }

        let candidateTypes = targetShiftTypes.filter((t) => (remainingByType.get(t.id) || 0) > 0);
        const filteredByCategory = candidateTypes.filter((t) => (t.category || 'other') === desiredCategory);
        if (filteredByCategory.length > 0) candidateTypes = filteredByCategory;

        candidateTypes.sort((a, b) => (remainingByType.get(b.id) || 0) - (remainingByType.get(a.id) || 0));
        const shiftType = candidateTypes[0];
        if (!shiftType) break;

        let assigned = false;
        for (const employee of shuffledEmployees) {
          if (!canAssignEmployeeToShift(employee.id, shiftType.id)) continue;

          newEntries.push({
            id: crypto.randomUUID(),
            employeeId: employee.id,
            shiftTypeId: shiftType.id,
            date: dateStr,
            status: 'approved',
          });
          assignedThisDay.add(employee.id);
          remainingByType.set(shiftType.id, (remainingByType.get(shiftType.id) || 0) - 1);

          if (shiftType.category === 'morning') assignedMorningSlots++;
          if (shiftType.category === 'afternoon') assignedAfternoonSlots++;

          assigned = true;
          break;
        }

        if (!assigned) {
          remainingByType.set(shiftType.id, 0);
        }
      }

    });

    for (const entry of newEntries) {
      await updateSchedule(entry);
    }
    await refresh();
    alert('จัดตารางอัตโนมัติสำเร็จ! ระบบได้ตรวจสอบเงื่อนไขกะดึก-เช้าเรียบร้อยแล้ว');
  };

  // Auth loading
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

  // Not logged in
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
          <button onClick={() => refresh()} className="btn btn-primary text-sm">

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
        role={role}
        isManager={isManager}
        onToggleRole={() => setRole(role === 'employee' ? 'manager' : 'employee')}
        onLogout={logout}
        appName={settings.appName}
      />


      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        {role === 'employee' ? (
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
              />

            )}
            {activeMobileTab === 'requests' && (
              <div className="card p-10 text-center">
                <div className="w-16 h-16 bg-bg-surface rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-1">ระบบขอลา</h3>
                <p className="text-sm text-text-tertiary">คุณยังไม่มีรายการคำขอลาในขณะนี้</p>
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
          />
        )}

      </main>

      <MobileNav activeTab={activeMobileTab} onChangeTab={setActiveMobileTab} />
      <UpdatePrompt />
    </div>

  );
}

export default App;
