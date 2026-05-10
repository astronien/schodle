import { useState } from 'react';
import { Clock, Settings } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { SHIFT_TYPES, MOCK_EMPLOYEES, MOCK_SCHEDULES, POSITIONS } from './data/mockData';
import type { ShiftType, ScheduleEntry, UserRole, Employee, Position } from './types/index';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';

function App() {
  const [role, setRole] = useState<UserRole>('employee');
  const [activeMobileTab, setActiveMobileTab] = useState<'schedule' | 'requests' | 'settings'>('schedule');
  const [currentUser] = useState<Employee>(MOCK_EMPLOYEES[0]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(MOCK_SCHEDULES);
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(SHIFT_TYPES);
  const [positions, setPositions] = useState<Position[]>(POSITIONS);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const generateSmartSchedule = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const newSchedules: ScheduleEntry[] = [];
    let scheduleId = Date.now();

    const monthStr = format(currentMonth, 'yyyy-MM');
    const otherMonthsSchedules = schedules.filter((s) => !s.date.startsWith(monthStr));

    const lateShifts = ['XC', 'EV', 'A2'];
    const earlyShifts = ['M1', 'M2'];

    days.forEach((day, dayIdx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const assignedThisDay: string[] = [];
      const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

      shiftTypes.forEach((shiftType) => {
        if (!shiftType.targetStaff) return;

        let count = 0;
        for (const employee of shuffledEmployees) {
          if (count >= shiftType.targetStaff) break;
          if (assignedThisDay.includes(employee.id)) continue;

          if (dayIdx > 0) {
            const yesterdayDateStr = format(days[dayIdx - 1], 'yyyy-MM-dd');
            const yesterdayShift = newSchedules.find(
              (s) => s.employeeId === employee.id && s.date === yesterdayDateStr
            );
            if (yesterdayShift) {
              const yesterdayShiftType = shiftTypes.find((t) => t.id === yesterdayShift.shiftTypeId);
              if (
                yesterdayShiftType &&
                lateShifts.includes(yesterdayShiftType.code) &&
                earlyShifts.includes(shiftType.code)
              ) {
                continue;
              }
            }
          }

          newSchedules.push({
            id: (scheduleId++).toString(),
            employeeId: employee.id,
            shiftTypeId: shiftType.id,
            date: dateStr,
            status: 'approved',
          });
          assignedThisDay.push(employee.id);
          count++;
        }
      });
    });

    setSchedules([...otherMonthsSchedules, ...newSchedules]);
    alert('จัดตารางอัตโนมัติสำเร็จ! ระบบได้ตรวจสอบเงื่อนไขกะดึก-เช้าเรียบร้อยแล้ว');
  };

  return (
    <div className="min-h-screen w-full bg-bg-primary text-text-secondary font-sans pb-20 sm:pb-0 overflow-x-hidden">
      <Header
        currentUser={currentUser}
        role={role}
        onToggleRole={() => setRole(role === 'employee' ? 'manager' : 'employee')}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        {role === 'employee' ? (
          <>
            {activeMobileTab === 'schedule' && (
              <EmployeeDashboard
                currentUser={currentUser}
                schedules={schedules}
                setSchedules={setSchedules}
                shiftTypes={shiftTypes}
                employees={employees}
                positions={positions}
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
        ) : (
          <ManagerDashboard
            schedules={schedules}
            setSchedules={setSchedules}
            employees={employees}
            setEmployees={setEmployees}
            shiftTypes={shiftTypes}
            setShiftTypes={setShiftTypes}
            positions={positions}
            setPositions={setPositions}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            generateSmartSchedule={generateSmartSchedule}
          />
        )}
      </main>

      <MobileNav activeTab={activeMobileTab} onChangeTab={setActiveMobileTab} />
    </div>
  );
}

export default App;
