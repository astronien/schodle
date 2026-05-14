/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';

import { Clock, Settings } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInCalendarWeeks } from 'date-fns';
import type { ScheduleEntry, UserRole, Employee } from './types/index';


import { useData } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { LoginPage } from './components/auth/LoginPage';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { UpdatePrompt } from './components/layout/UpdatePrompt';
import { th } from 'date-fns/locale';
import { cn } from './lib/utils';


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
    if (effectiveRole === 'manager' && activeMobileTab !== 'schedule') {
      setActiveMobileTab('schedule');
    }
  }, [effectiveRole, activeMobileTab]);



  const generateSmartSchedule = async () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const monthStart = startOfMonth(currentMonth);
    const employeeOrder = [...employees]
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const newEntries: ScheduleEntry[] = [];

    const xShift = shiftTypes.find((t) => t.code === 'X');
    if (!xShift) {
      alert('ไม่พบประเภทกะ X กรุณาสร้างกะ X ก่อน');
      return;
    }

    const lateShifts = ['XC', 'EV', 'A2'];
    const earlyShifts = ['M1', 'M2'];

    days.forEach((day, dayIdx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const assignedThisDay = new Set<string>();
      const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

      // Fill weekly off-day as shift X
      employees.forEach((emp) => {
        if (typeof emp.weeklyOffDay !== 'number') return;
        const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
        if (dayOfWeek !== emp.weeklyOffDay) return;

        newEntries.push({
          id: crypto.randomUUID(),
          employeeId: emp.id,
          shiftTypeId: xShift.id,
          date: dateStr,
          status: 'approved',
        });
        assignedThisDay.add(emp.id);
      });

      const weekIndex = differenceInCalendarWeeks(day, monthStart, { weekStartsOn: 1 });
      const getWeeklyPreferred = (employeeId: string): 'morning' | 'afternoon' => {
        const emp = employees.find((e) => e.id === employeeId);
        if (!emp) return 'morning';

        const groupKey = emp.groupId || emp.positionId;
        const groupMembers = employeeOrder.filter((e) => (e.groupId || e.positionId) === groupKey);
        const idxInGroup = groupMembers.findIndex((e) => e.id === employeeId);

        const base: 'morning' | 'afternoon' = idxInGroup % 2 === 0 ? 'morning' : 'afternoon';
        return weekIndex % 2 === 0 ? base : base === 'morning' ? 'afternoon' : 'morning';
      };


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

        const shiftCategory = (shiftType.category || 'other') as 'morning' | 'afternoon' | 'other';

        let assigned = false;
        const tryAssignFrom = (candidates: Employee[]) => {
          for (const employee of candidates) {
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
            return;
          }
        };

        if (shiftCategory === 'morning' || shiftCategory === 'afternoon') {
          const preferred = shuffledEmployees.filter(
            (e) => getWeeklyPreferred(e.id) === shiftCategory
          );
          
          tryAssignFrom(preferred);
          
          // DO NOT assign nonPreferred here yet. 
          // We will do a second pass if needed, or let the loop continue to other shifts.
        } else {
          tryAssignFrom(shuffledEmployees);
        }

        if (!assigned) {
          // Instead of giving up on this shift type immediately, 
          // let's mark it so we don't keep trying the same preferred-only logic in an infinite loop.
          // We'll allow non-preferred only if we've tried everything else.
          remainingByType.set(shiftType.id + "_retry", (remainingByType.get(shiftType.id) || 0));
          remainingByType.set(shiftType.id, 0);
        }
      }

      // Second Pass: Fill remaining slots with anyone available
      targetShiftTypes.forEach(shiftType => {
        const retryKey = shiftType.id + "_retry";
        let remaining = remainingByType.get(retryKey) || 0;
        if (remaining <= 0) return;

        for (const employee of shuffledEmployees) {
          if (remaining <= 0) break;
          if (!canAssignEmployeeToShift(employee.id, shiftType.id)) continue;

          newEntries.push({
            id: crypto.randomUUID(),
            employeeId: employee.id,
            shiftTypeId: shiftType.id,
            date: dateStr,
            status: 'approved',
          });
          assignedThisDay.add(employee.id);
          remaining--;
        }
      });


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
        role={effectiveRole}
        isManager={isManager}
        onToggleRole={() => setRole(effectiveRole === 'employee' ? 'manager' : 'employee')}
        onLogout={logout}
        appName={settings.appName}
      />


      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
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

                {schedules.filter(s => s.employeeId === currentUser?.id).length > 0 ? (
                  <div className="space-y-3 px-4">
                    {schedules
                      .filter(s => s.employeeId === currentUser?.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(s => {
                        const sType = shiftTypes.find(t => t.id === s.shiftTypeId);
                        const isApproved = s.status === 'approved';
                        const isRejected = s.status === 'rejected';
                        
                        return (
                          <div key={s.id} className={cn(
                            "p-4 rounded-2xl border transition-all duration-200 animate-fade-in",
                            isApproved ? "bg-success/5 border-success/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]" : 
                            isRejected ? "bg-error/5 border-error/20" : 
                            "bg-warn/5 border-warn/20"
                          )}>
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm",
                                  isApproved ? "bg-success" : isRejected ? "bg-error" : "bg-warn"
                                )}>
                                  {sType?.code || '??'}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-text-primary">{sType?.name || 'ไม่ทราบประเภท'}</div>
                                  <div className="text-[10px] text-text-tertiary font-medium">
                                    {format(new Date(s.date), 'eeee d MMMM yyyy', { locale: th })}
                                  </div>
                                </div>
                              </div>
                              <div className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-lg",
                                isApproved ? "bg-success/20 text-success" : 
                                isRejected ? "bg-error/20 text-error" : 
                                "bg-warn/20 text-warn"
                              )}>
                                {isApproved ? 'อนุมัติแล้ว' : isRejected ? 'ปฏิเสธ' : 'รออนุมัติ'}
                              </div>
                            </div>
                            
                            {(s.employeeNote || s.managerRemark) && (
                              <div className="space-y-2 mt-3 pt-3 border-t border-white/[0.05]">
                                {s.employeeNote && (
                                  <div className="flex gap-2">
                                    <div className="text-[10px] font-bold text-text-quaternary uppercase shrink-0">คำขอ:</div>
                                    <div className="text-xs text-text-secondary italic">"{s.employeeNote}"</div>
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

      </main>

      <MobileNav activeTab={activeMobileTab} onChangeTab={setActiveMobileTab} />
      <UpdatePrompt />
    </div>

  );
}

export default App;
