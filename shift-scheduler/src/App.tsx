import { useState, useRef } from 'react'
import { 
  Calendar, Users, Settings, Bell, 
  CheckCircle2, XCircle, Clock, ChevronRight, 
  ChevronLeft, Plus, Save, AlertCircle, Trash2,
  PlusCircle, Check, AlertTriangle
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { th } from 'date-fns/locale'
import { SHIFT_TYPES, MOCK_EMPLOYEES, MOCK_SCHEDULES, POSITIONS } from './data/mockData'
import type { ShiftType, ScheduleEntry, UserRole, Employee, Position } from './types/index'

function App() {
  const [role, setRole] = useState<UserRole>('employee')
  const [activeMobileTab, setActiveMobileTab] = useState<'schedule' | 'requests' | 'settings'>('schedule')
  const [currentUser] = useState(MOCK_EMPLOYEES[0]) // Assume first user is logged in
  const [schedules, setSchedules] = useState<ScheduleEntry[]>(MOCK_SCHEDULES)
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES)
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(SHIFT_TYPES)
  const [positions, setPositions] = useState<Position[]>(POSITIONS)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const generateSmartSchedule = () => {
    const days = eachDayOfInterval({ 
      start: startOfMonth(currentMonth), 
      end: endOfMonth(currentMonth) 
    });
    
    const newSchedules: ScheduleEntry[] = [];
    let scheduleId = Date.now();

    // 1. Clear existing schedules for this month first (optional, but cleaner)
    const monthStr = format(currentMonth, 'yyyy-MM');
    const otherMonthsSchedules = schedules.filter(s => !s.date.startsWith(monthStr));

    // 2. Prepare Shift Definitions
    const morningShifts = shiftTypes.filter(t => t.category === 'morning');
    const afternoonShifts = shiftTypes.filter(t => t.category === 'afternoon');
    const lateShifts = ['XC', 'EV', 'A2']; // Codes for shifts that end late
    const earlyShifts = ['M1', 'M2'];     // Codes for shifts that start early

    // 3. Simple Algorithm: Iterate through days and assign based on targets
    days.forEach((day, dayIdx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const assignedThisDay: string[] = []; // List of employee IDs assigned today

      // Shuffle employees for fairness each day
      const shuffledEmployees = [...employees].sort(() => Math.random() - 0.5);

      shiftTypes.forEach(shiftType => {
        if (!shiftType.targetStaff) return;
        
        let count = 0;
        for (const employee of shuffledEmployees) {
          if (count >= shiftType.targetStaff) break;
          if (assignedThisDay.includes(employee.id)) continue;

          // Check Constraint: No late shift followed by early morning shift
          if (dayIdx > 0) {
            const yesterdayDateStr = format(days[dayIdx - 1], 'yyyy-MM-dd');
            const yesterdayShift = newSchedules.find(s => s.employeeId === employee.id && s.date === yesterdayDateStr);
            if (yesterdayShift) {
              const yesterdayShiftType = shiftTypes.find(t => t.id === yesterdayShift.shiftTypeId);
              if (yesterdayShiftType && lateShifts.includes(yesterdayShiftType.code) && earlyShifts.includes(shiftType.code)) {
                continue; // Skip this employee for this early shift
              }
            }
          }

          // Check Constraint: Limit consecutive work days (e.g., max 6)
          // (Simplified for now: just assign based on target)

          newSchedules.push({
            id: (scheduleId++).toString(),
            employeeId: employee.id,
            shiftTypeId: shiftType.id,
            date: dateStr,
            status: 'approved'
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
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans pb-20 sm:pb-0 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
              <Clock className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">ShiftFlow</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700">{currentUser.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  {role === 'employee' ? 'พนักงาน' : 'ผู้จัดการ'}
                </p>
              </div>
              <button 
                onClick={() => setRole(role === 'employee' ? 'manager' : 'employee')}
                className="w-10 h-10 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-full flex items-center justify-center hover:ring-2 ring-blue-500 transition-all border border-white shadow-sm"
              >
                <Users className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-0 sm:px-8 py-4 sm:py-8">
        {role === 'employee' 
          ? (
            <>
              {activeMobileTab === 'schedule' && <EmployeeDashboard currentUser={currentUser} schedules={schedules} setSchedules={setSchedules} shiftTypes={shiftTypes} employees={employees} />}
              {activeMobileTab === 'requests' && (
                <div className="p-6 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">ระบบขอลา</h3>
                  <p className="text-slate-500">คุณยังไม่มีรายการคำขอลาในขณะนี้</p>
                </div>
              )}
              {activeMobileTab === 'settings' && (
                <div className="p-6 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">ตั้งค่า</h3>
                  <p className="text-slate-500">ส่วนการตั้งค่ากำลังอยู่ระหว่างการพัฒนา</p>
                </div>
              )}
            </>
          )
          : <ManagerDashboard schedules={schedules} setSchedules={setSchedules} employees={employees} setEmployees={setEmployees} shiftTypes={shiftTypes} setShiftTypes={setShiftTypes} positions={positions} setPositions={setPositions} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} generateSmartSchedule={generateSmartSchedule} />
        }
      </main>

      {/* Mobile Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-3 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveMobileTab('schedule')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'schedule' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-bold">ตารางงาน</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab('requests')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'requests' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-bold">คำขอลา</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold">ตั้งค่า</span>
        </button>
      </nav>
    </div>
  )
}

function EmployeeDashboard({ currentUser, schedules, setSchedules, shiftTypes, employees }: { currentUser: Employee, schedules: ScheduleEntry[], setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>, shiftTypes: ShiftType[], employees: Employee[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const userSchedules = schedules.filter(s => s.employeeId === currentUser.id)
  
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getDaySchedule = (date: Date) => {
    return userSchedules.find(s => isSameDay(new Date(s.date), date))
  }

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [requestReason, setRequestReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLateScan, setIsLateScan] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [targetSwapId, setTargetSwapId] = useState<string | null>(null)
  
  const currentShiftId = selectedShiftId || (selectedDate ? getDaySchedule(selectedDate)?.shiftTypeId : null)
  const shiftType = shiftTypes.find(t => t.id === currentShiftId)
  const handleSetShift = (shiftId: string | null, reason?: string) => {
    if (!selectedDate) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    setValidationError(null)

    const shiftType = shiftTypes.find(t => t.id === shiftId)
    
    // Rule: Dynamic configuration checks
    if (shiftType) {
      if (shiftType.requiresReason && !reason) {
        setValidationError(`กะ ${shiftType.name} จำเป็นต้องระบุเหตุผล`)
        return
      }
      if (shiftType.requiresEvidence && !attachment) {
        setValidationError(`กะ ${shiftType.name} จำเป็นต้องแนบหลักฐานรูปภาพ`)
        return
      }
    }

    const needsManager = shiftType?.requiresApproval || false

    if (shiftId === null) {
      setSchedules(prev => prev.filter(s => !(s.employeeId === currentUser.id && s.date === dateStr)))
    } else {
      const existing = userSchedules.find(s => s.date === dateStr)
      if (existing) {
        setSchedules(prev => prev.map(s => (s.employeeId === currentUser.id && s.date === dateStr) ? { 
          ...s, 
          shiftTypeId: shiftId, 
          status: needsManager ? 'pending' : 'approved',
          employeeNote: reason || ''
        } : s))
      } else {
        setSchedules(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          employeeId: currentUser.id,
          date: dateStr,
          shiftTypeId: shiftId,
          status: needsManager ? 'pending' : 'approved',
          employeeNote: reason || ''
        }])
      }
    }
    setSelectedDate(null)
    setSelectedShiftId(null)
    setRequestReason('')
    setAttachment(null)
    setIsLateScan(false)
    setIsSwapping(false)
    setTargetSwapId(null)
  }

  const handleSwapShift = () => {
    if (!selectedDate || !targetSwapId) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const targetEmp = employees.find(e => e.id === targetSwapId)
    
    setSchedules(prev => prev.map(s => {
      if (s.employeeId === currentUser.id && s.date === dateStr) {
        return { ...s, status: 'pending', swapWithId: targetSwapId, employeeNote: `ขอสลับกะกับ ${targetEmp?.fullName}` }
      }
      return s
    }))
    
    setSelectedDate(null)
    setIsSwapping(false)
    setTargetSwapId(null)
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-none sm:rounded-2xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400 opacity-10 rounded-full -ml-10 -mb-10"></div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">ตารางงานเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })}</h2>
          <p className="text-blue-100 text-sm opacity-90">จัดการกะงานและคำขอหยุดพักร้อนของคุณได้ที่นี่</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="bg-white text-blue-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all flex items-center gap-2 shadow-md">
              <Save className="w-4 h-4" /> ส่งคำขอทั้งหมด
            </button>
            <div className="bg-blue-500 bg-opacity-20 border border-blue-400 border-opacity-30 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
              กำหนดส่ง: 25 พฤษภาคม
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar Section */}
        <section className="lg:col-span-2 bg-white rounded-none sm:rounded-3xl border-y sm:border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-800 text-lg">{format(currentMonth, 'MMMM yyyy', { locale: th })}</h3>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              วันนี้
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                <div key={day} className="text-center text-[11px] sm:text-[10px] uppercase tracking-widest font-black text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {/* Padding for first day of month */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square"></div>
              ))}
              
              {days.map(day => {
                const schedule = getDaySchedule(day)
                const shift = schedule ? shiftTypes.find(t => t.id === schedule.shiftTypeId) : null
                
                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all group ${
                      isToday(day) ? 'bg-blue-50 border-blue-200' : 
                      isSameDay(selectedDate || new Date(0), day) ? 'border-blue-600 ring-2 ring-blue-100 scale-95' :
                      schedule?.status === 'rejected' ? 'bg-red-50 border-red-200' :
                      schedule?.status === 'pending' ? 'bg-amber-50/30 border-amber-100' :
                      'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-base sm:text-sm font-bold ${
                      isToday(day) ? 'text-blue-600' : 
                      schedule?.status === 'rejected' ? 'text-red-400 line-through' :
                      'text-slate-700'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {shift && (
                        <div 
                          className={`mt-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[9px] font-black tracking-tighter text-white shadow-sm transition-opacity ${
                            schedule?.status === 'rejected' ? 'opacity-40 grayscale' : ''
                          }`}
                          style={{ backgroundColor: shift.color }}
                        >
                          {shift.code}
                        </div>
                    )}
                    {schedule?.status === 'draft' && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full border border-white"></div>
                    )}
                    {schedule?.status === 'pending' && (
                      <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full border border-white animate-pulse"></div>
                        {schedule.swapWithId && <Users className="w-2.5 h-2.5 text-indigo-500" />}
                      </div>
                    )}
                    {schedule?.status === 'rejected' && (
                      <div className="absolute top-1.5 right-1.5 text-red-500">
                        <XCircle className="w-3.5 h-3.5 fill-white" />
                      </div>
                    )}
                    {schedule?.status === 'approved' && (
                      <div className="absolute top-1.5 right-1.5 text-green-500">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Shift Legend */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4">
            {shiftTypes.slice(0, 5).map(type => (
              <div key={type.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{type.code}: {type.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Summary Panel */}
        <section className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              สรุปความคืบหน้า
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">กะที่อนุมัติแล้ว</span>
                <span className="text-sm font-bold text-green-600">12 วัน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">รอการอนุมัติ</span>
                <span className="text-sm font-bold text-amber-500">4 วัน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">วันหยุดคงเหลือ</span>
                <span className="text-sm font-bold text-slate-800">2 วัน</span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[65%]"></div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">ความคืบหน้าของเดือน: 65%</p>
              </div>
            </div>
          </div>

          {/* Pending Swap Requests List */}
          {schedules.filter(s => s.employeeId === currentUser.id && s.swapWithId && s.status === 'pending').length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm animate-in slide-in-from-right-4 duration-500">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                รายการขอสลับกะ
              </h3>
              <div className="space-y-3">
                {schedules.filter(s => s.employeeId === currentUser.id && s.swapWithId && s.status === 'pending').map(s => {
                  const targetEmp = MOCK_EMPLOYEES.find(e => e.id === s.swapWithId)
                  return (
                    <div key={s.id} className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">
                            {format(new Date(s.date), 'd MMM', { locale: th })}
                          </p>
                          <p className="text-[9px] font-bold text-indigo-600">สลับกับ {targetEmp?.fullName}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded-full text-amber-500 border border-amber-100 uppercase tracking-widest animate-pulse">
                        รออนุมัติ
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Shift Selection Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedDate(null)}
          ></div>
          
          <div className="relative w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Handle for Mobile */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 sm:hidden"></div>
            
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800">เลือกกะงาน</h3>
                  <p className="text-sm font-bold text-blue-600">{format(selectedDate, 'EEEE ที่ d MMMM yyyy', { locale: th })}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedDate(null)
                    setSelectedShiftId(null)
                    setRequestReason('')
                    setValidationError(null)
                    setAttachment(null)
                    setIsLateScan(false)
                  }}
                  className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {validationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-red-600">{validationError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {shiftTypes.filter(t => t.isVisible || t.id === 'xc').map(type => {
                  const isSelected = selectedShiftId === type.id || (!selectedShiftId && getDaySchedule(selectedDate)?.shiftTypeId === type.id)
                  const count = schedules.filter(s => 
                    isSameDay(new Date(s.date), selectedDate) && 
                    s.shiftTypeId === type.id &&
                    s.status !== 'rejected'
                  ).length
                  const isFull = count >= 3 && type.id !== 'xc'

                  return (
                    <button
                      key={type.id}
                      disabled={isFull}
                      onClick={() => {
                        if (type.id === 'xc') {
                          setSelectedShiftId('xc')
                          setValidationError(null)
                        } else {
                          handleSetShift(type.id)
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' 
                          : isFull 
                            ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed shadow-none'
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-lg ${isFull ? 'grayscale' : ''}`}
                          style={{ backgroundColor: type.color }}
                        >
                          {type.code}
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${isFull ? 'text-slate-400' : 'text-slate-800'}`}>{type.name}</p>
                          <p className="text-xs text-slate-500 font-medium">{type.startTime} - {type.endTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {type.id !== 'xc' && (
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isFull ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                            {isFull ? 'เต็ม' : `${count}/3`}
                          </span>
                        )}
                        {isSelected && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Swap Shift Feature */}
              {getDaySchedule(selectedDate) && !isSwapping && (
                <button 
                  onClick={() => setIsSwapping(true)}
                  className="mt-4 w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between group hover:bg-indigo-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-indigo-800 uppercase tracking-widest">ขอสลับกะงาน</p>
                      <p className="text-[9px] text-indigo-600 font-bold">แลกกะกับเพื่อนร่วมงานในวันนี้</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-indigo-400" />
                </button>
              )}

              {isSwapping && (
                <div className="mt-4 p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">เลือกเพื่อนที่จะสลับกะด้วย</span>
                    <button onClick={() => setIsSwapping(false)} className="text-[10px] font-bold text-slate-400">ยกเลิก</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {employees.filter(e => e.id !== currentUser.id).map(emp => {
                      const empShift = schedules.find(s => s.employeeId === emp.id && s.date === format(selectedDate, 'yyyy-MM-dd'))
                      if (!empShift) return null
                      const shiftType = shiftTypes.find(t => t.id === empShift.shiftTypeId)
                      
                      return (
                        <button 
                          key={emp.id}
                          onClick={() => setTargetSwapId(emp.id)}
                          className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${targetSwapId === emp.id ? 'bg-white border-indigo-600 shadow-md' : 'bg-white/50 border-slate-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`} alt="" className="w-full h-full" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-800">{emp.fullName}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">{shiftType?.name} ({shiftType?.startTime})</p>
                            </div>
                          </div>
                          {targetSwapId === emp.id && <Check className="w-4 h-4 text-indigo-600" />}
                        </button>
                      )
                    })}
                  </div>
                  {targetSwapId && (
                    <button 
                      onClick={handleSwapShift}
                      className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 uppercase tracking-widest"
                    >
                      ยืนยันการขอสลับกะ
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-4 mt-6">
                {/* Dynamic Configuration UI */}
                {shiftType && (
                  <>
                    {shiftType.requiresEvidence && (
                      <div className="p-4 bg-indigo-50 border border-dashed border-indigo-200 rounded-2xl flex flex-col items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                        <input 
                          type="file" 
                          id="evidence" 
                          className="hidden" 
                          onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                        />
                        <label htmlFor="evidence" className="flex flex-col items-center cursor-pointer group">
                          <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600 mb-1 group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            {attachment ? attachment.name : 'แนบหลักฐานรูปภาพ'}
                          </span>
                        </label>
                      </div>
                    )}
                    
                    {shiftType.requiresReason && (
                      <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">ระบุเหตุผลความจำเป็น</label>
                        <textarea 
                          value={requestReason}
                          onChange={(e) => setRequestReason(e.target.value)}
                          placeholder="กรุณาระบุรายละเอียดเพิ่มเติม..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 ring-indigo-400 outline-none transition-all"
                          rows={2}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Late Scan Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isLateScan ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">มาสาย / ลืมแสกนนิ้ว</p>
                      <p className="text-[9px] text-slate-500">ต้องแนบหลักฐานเพื่อยืนยัน</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsLateScan(!isLateScan)}
                    className={`w-10 h-6 rounded-full transition-all relative ${isLateScan ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLateScan ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                {isLateScan && !shiftType?.requiresEvidence && (
                  <div className="p-4 bg-blue-50 border border-dashed border-blue-200 rounded-2xl flex flex-col items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <input 
                      type="file" 
                      id="evidence-late" 
                      className="hidden" 
                      onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                    />
                    <label htmlFor="evidence-late" className="flex flex-col items-center cursor-pointer group">
                      <div className="p-3 bg-white rounded-full shadow-sm text-blue-600 mb-1 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        {attachment ? attachment.name : 'แนบหลักฐาน (มาสาย)'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => handleSetShift(null)}
                  className="px-4 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  ล้างกะ
                </button>
                <button
                  disabled={(shiftType?.requiresReason && !requestReason) || (shiftType?.requiresEvidence && !attachment) || (isLateScan && !attachment)}
                  onClick={() => handleSetShift(selectedShiftId || getDaySchedule(selectedDate)?.shiftTypeId || null, requestReason)}
                  className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                    ((shiftType?.requiresReason && !requestReason) || (shiftType?.requiresEvidence && !attachment) || (isLateScan && !attachment))
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                  }`}
                >
                  ยืนยันการลงกะ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ManagerDashboard({ 
  schedules, 
  setSchedules, 
  employees, 
  setEmployees, 
  shiftTypes, 
  setShiftTypes, 
  positions, 
  setPositions,
  currentMonth,
  setCurrentMonth,
  generateSmartSchedule
}: { 
  schedules: ScheduleEntry[], 
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>,
  employees: Employee[],
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>,
  shiftTypes: ShiftType[],
  setShiftTypes: React.Dispatch<React.SetStateAction<ShiftType[]>>,
  positions: Position[],
  setPositions: React.Dispatch<React.SetStateAction<Position[]>>,
  currentMonth: Date,
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>,
  generateSmartSchedule: () => void
}) {
  const [activeTab, setActiveTab] = useState<'coverage' | 'requests' | 'admin'>('coverage');
  const [activeAdminTab, setActiveAdminTab] = useState<'employees' | 'shifts' | 'positions'>('employees');
  
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const summaryScrollRef = useRef<HTMLDivElement>(null);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (summaryScrollRef.current) {
      summaryScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleSummaryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);

  const handleUpdateShiftStatus = (id: string, status: 'approved' | 'rejected') => {
    setSchedules(prev => {
      const request = prev.find(s => s.id === id);
      if (status === 'approved' && request?.swapWithId) {
        // Find target employee's shift on the same day
        const requesterId = request.employeeId;
        const targetId = request.swapWithId;
        const date = request.date;
        
        const requesterShift = prev.find(s => s.employeeId === requesterId && s.date === date);
        const targetShift = prev.find(s => s.employeeId === targetId && s.date === date);
        
        if (requesterShift && targetShift) {
          // Swap their shift types
          const requesterShiftTypeId = requesterShift.shiftTypeId;
          const targetShiftTypeId = targetShift.shiftTypeId;
          
          return prev.map(s => {
            if (s.employeeId === requesterId && s.date === date) {
              return { ...s, shiftTypeId: targetShiftTypeId, status: 'approved' as const, swapWithId: undefined };
            }
            if (s.employeeId === targetId && s.date === date) {
              return { ...s, shiftTypeId: requesterShiftTypeId, status: 'approved' as const };
            }
            return s;
          });
        }
      }
      
      // Normal approval/rejection or fallback
      return prev.map(s => s.id === id ? { ...s, status } : s);
    });
  }
  
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Manager Control</h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">Store: Central Plaza Rama 9</p>
          </div>
          {activeTab === 'coverage' && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-bold w-32 text-center">{format(currentMonth, 'MMMM yyyy', { locale: th })}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 self-start overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('coverage')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'coverage' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ตารางรวม
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-md sm:shadow-lg sm:shadow-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            คำขอ
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'admin' ? 'bg-blue-600 text-white shadow-md sm:shadow-lg sm:shadow-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            จัดการ
          </button>
        </div>
        {activeTab === 'coverage' && (
          <button 
            onClick={generateSmartSchedule}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:scale-105 transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            จัดตาราง AI
          </button>
        )}
      </div>

      {activeTab === 'coverage' && (
        <div className="bg-white rounded-none sm:rounded-[2.5rem] p-2 sm:p-8 shadow-none sm:shadow-2xl shadow-slate-200/50 border-x-0 sm:border border-slate-100 flex flex-col max-h-[calc(100vh-120px)]">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-6 sm:mb-8 shrink-0">
            <div>
              <h2 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3 sm:gap-4 mb-2">
                <div className="w-2 sm:w-3 h-8 sm:h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-100"></div>
                ความครอบคลุมรายวัน
              </h2>
              <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest ml-5 sm:ml-7">
                ตรวจสอบความสมดุลและจำนวนพนักงาน
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* แยกแผงวิเคราะห์ความสมดุลออกมาต่างหาก */}
              {(() => {
                const imbalancedDays = daysInMonth.filter(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const salesStaffIds = employees.filter(e => e.positionId === '3' || e.positionId === '5').map(e => e.id);
                  const dailySalesSchedules = schedules.filter(s => s.date === dateStr && s.status === 'approved' && salesStaffIds.includes(s.employeeId));
                  const morningCount = dailySalesSchedules.filter(s => shiftTypes.find(t => t.id === s.shiftTypeId)?.category === 'morning').length;
                  const afternoonCount = dailySalesSchedules.filter(s => shiftTypes.find(t => t.id === s.shiftTypeId)?.category === 'afternoon').length;
                  return Math.abs(morningCount - afternoonCount) > 1;
                });

                return imbalancedDays.length > 0 && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-5 py-3 bg-rose-50 border-2 border-rose-100 rounded-[1.5rem] flex items-center gap-3 shadow-sm animate-pulse">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-rose-400 uppercase leading-none mb-1">แจ้งเตือนพนักงานขาย</div>
                        <div className="text-sm font-black text-rose-700 leading-none">พบ {imbalancedDays.length} วันที่ไม่สมดุล</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                {shiftTypes.filter(t => t.isVisible).map(type => (
                  <div key={type.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-2xl shadow-sm border border-slate-200/50">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }}></div>
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">{type.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div 
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="overflow-auto pb-4 custom-scrollbar grow border-t border-slate-50"
          >
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-50 bg-slate-50 p-3 sm:p-4 text-left border-b border-slate-100 min-w-[140px] sm:min-w-[200px] shadow-[2px_2px_0_rgba(0,0,0,0.05),inset_0_-2px_0_rgba(0,0,0,0.05)]">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">พนักงาน</span>
                  </th>
                  {daysInMonth.map(day => (
                    <th key={day.toString()} className="sticky top-0 z-20 bg-slate-50 p-2 sm:p-4 text-center border-b border-slate-100 min-w-[50px] sm:min-w-[60px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {format(day, 'EEE', { locale: th })}
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-800">{format(day, 'd')}</span>
                        {(() => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const salesStaffIds = employees.filter(e => e.positionId === '3' || e.positionId === '5').map(e => e.id);
                          const dailySalesSchedules = schedules.filter(s => s.date === dateStr && s.status === 'approved' && salesStaffIds.includes(s.employeeId));
                          const morningCount = dailySalesSchedules.filter(s => shiftTypes.find(t => t.id === s.shiftTypeId)?.category === 'morning').length;
                          const afternoonCount = dailySalesSchedules.filter(s => shiftTypes.find(t => t.id === s.shiftTypeId)?.category === 'afternoon').length;
                          const diff = Math.abs(morningCount - afternoonCount);
                          const isImbalanced = diff > 1;
                          
                          return isImbalanced && (
                            <div className="mt-2 flex flex-col items-center gap-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></div>
                              <span className="text-[7px] font-black text-rose-600 uppercase tracking-tighter bg-rose-50 px-1 rounded">
                                เช้า {morningCount} / บ่าย {afternoonCount}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50 p-4 border-b border-slate-50 transition-colors shadow-[2px_0_0_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0">
                          <img src={employee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.fullName}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-800 leading-none mb-1 truncate">{employee.fullName}</div>
                          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                            {positions.find(p => p.id === employee.positionId)?.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const shift = schedules.find(s => s.employeeId === employee.id && s.date === dateStr && s.status === 'approved');
                      const shiftType = shift ? shiftTypes.find(t => t.id === shift.shiftTypeId) : null;

                      return (
                        <td 
                          key={day.toString()} 
                          className="p-1 border-b border-slate-50"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const dragData = JSON.parse(e.dataTransfer.getData('shift'));
                            handleUpdateShiftStatus(dragData.shiftId, 'approved');
                          }}
                        >
                          {shiftType ? (
                            <div 
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('shift', JSON.stringify({ shiftId: shift.id, employeeId: employee.id, date: dateStr }))}
                              className="w-full h-8 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-[11px] font-black text-white shadow-sm transition-transform hover:scale-105 cursor-grab active:cursor-grabbing"
                              style={{ backgroundColor: shiftType.color }}
                            >
                              {shiftType.code}
                            </div>
                          ) : (
                            <div className="w-full h-8 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50/50 border border-dashed border-slate-200"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                
              </tbody>
            </table>
          </div>

          {/* New Separate Summary Section */}
          <div className="mt-6 shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">สรุปจำนวนคนรายกะ</h3>
            </div>
            
            <div 
              ref={summaryScrollRef}
              onScroll={handleSummaryScroll}
              className="overflow-x-auto pb-2 custom-scrollbar bg-slate-50/50 rounded-[2rem] border border-slate-100"
            >
              <div className="flex">
                {/* Fixed Label Column */}
                <div className="sticky left-0 z-20 bg-slate-100 p-2 sm:p-4 min-w-[120px] sm:min-w-[200px] border-r border-slate-200 flex flex-col justify-center">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">สถานะความครบ</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 mt-1">จริง / เป้า</span>
                </div>
                
                {/* Scrollable Data Columns */}
                {daysInMonth.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dailySchedules = schedules.filter(s => s.date === dateStr && s.status === 'approved');
                  
                  return (
                    <div key={day.toString()} className="p-2 sm:p-4 min-w-[80px] sm:min-w-[120px] border-r border-slate-100 last:border-r-0 flex flex-col gap-1.5 sm:gap-2">
                      {shiftTypes.filter(t => t.targetStaff && t.targetStaff > 0).map(type => {
                        const count = dailySchedules.filter(s => s.shiftTypeId === type.id).length;
                        const target = type.targetStaff || 0;
                        const isShort = count < target;
                        const isOver = count > target;
                        
                        return (
                          <div key={type.id} className="flex items-center justify-between px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black" style={{ color: type.color }}>{type.code}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-black ${isShort ? 'text-rose-600' : isOver ? 'text-amber-600' : 'text-green-600'}`}>
                                {count}/{target}
                              </span>
                              {isShort && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">คำขอที่รอการพิจารณา</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.filter(s => s.status === 'pending').map(request => {
              const employee = employees.find(e => e.id === request.employeeId);
              const shiftType = shiftTypes.find(t => t.id === request.shiftTypeId);
              return (
                <div key={request.id} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100">
                      <img src={employee?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee?.fullName}`} alt="" />
                    </div>
                    <div>
                      <div className="text-base font-black text-slate-800">{employee?.fullName}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {positions.find(p => p.id === employee?.positionId)?.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-xs font-bold text-slate-500">วันที่ขอ</span>
                      <span className="text-sm font-black text-slate-800">
                        {format(new Date(request.date), 'd MMM yyyy', { locale: th })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-xs font-bold text-slate-500">กะงาน</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: shiftType?.color }}></div>
                        <span className="text-sm font-black text-slate-800">{shiftType?.name} ({shiftType?.code})</span>
                      </div>
                    </div>

                    {/* Swap Information */}
                    {request.swapWithId && (
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">คำขอสลับกะกับ</span>
                          <Users className="w-4 h-4 text-indigo-400" />
                        </div>
                        {(() => {
                          const targetEmp = employees.find(e => e.id === request.swapWithId);
                          const targetShift = schedules.find(s => s.employeeId === request.swapWithId && s.date === request.date);
                          const targetShiftType = shiftTypes.find(t => t.id === targetShift?.shiftTypeId);
                          return (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-indigo-100 shadow-sm">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${targetEmp?.fullName}`} alt="" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800 leading-none mb-1">{targetEmp?.fullName}</p>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase">
                                  เข้ากะ {targetShiftType?.name || 'วันหยุด'} อยู่
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {request.employeeNote && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1 text-center">หมายเหตุ</span>
                        <p className="text-sm font-bold text-amber-800 text-center leading-relaxed italic">"{request.employeeNote}"</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleUpdateShiftStatus(request.id, 'rejected')}
                      className="py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-xs hover:bg-slate-200 transition-colors uppercase tracking-widest"
                    >
                      ปฏิเสธ
                    </button>
                    <button 
                      onClick={() => handleUpdateShiftStatus(request.id, 'approved')}
                      className="py-3 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase tracking-widest"
                    >
                      อนุมัติ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {schedules.filter(s => s.status === 'pending').length === 0 && (
            <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">ไม่มีคำขอรออนุมัติ</h3>
              <p className="text-sm font-bold text-slate-400">เมื่อมีพนักงานขอเปลี่ยนหรือลงกะงานพิเศษ จะปรากฏที่นี่</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">จัดการระบบ (System Admin)</h2>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setActiveAdminTab('employees')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeAdminTab === 'employees' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  พนักงาน
                </button>
                <button 
                  onClick={() => setActiveAdminTab('shifts')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeAdminTab === 'shifts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  กะงาน
                </button>
                <button 
                  onClick={() => setActiveAdminTab('positions')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeAdminTab === 'positions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  ตำแหน่ง
                </button>
              </div>
            </div>

            {activeAdminTab === 'employees' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-slate-400">รายชื่อพนักงานทั้งหมด ({employees.length} ท่าน)</span>
                  <button 
                    onClick={() => {
                      const name = prompt('ชื่อพนักงาน:');
                      const code = prompt('รหัสพนักงาน:');
                      if (name && code) {
                        setEmployees([...employees, {
                          id: `e${Date.now()}`,
                          fullName: name,
                          employeeCode: code,
                          positionId: '3',
                          role: 'employee',
                          email: `${code}@example.com`,
                          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
                        }]);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มพนักงาน
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {employees.map(emp => (
                    <div key={emp.id} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200">
                          <img src={emp.avatar} alt="" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800">{emp.fullName}</div>
                          <div className="text-[10px] font-bold text-slate-400">{emp.employeeCode}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))}
                        className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeAdminTab === 'shifts' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-slate-400">ประเภทกะงานทั้งหมด ({shiftTypes.length} ประเภท)</span>
                    <button 
                      onClick={() => {
                        const code = prompt('รหัสกะ (เช่น M3):');
                        const name = prompt('ชื่อกะ (เช่น Morning 3):');
                        if (code && name) {
                          setShiftTypes([...shiftTypes, {
                            id: code.toLowerCase(),
                            code,
                            name,
                            startTime: '09:00',
                            endTime: '18:00',
                            color: '#'+Math.floor(Math.random()*16777215).toString(16),
                            requiresApproval: false,
                            requiresReason: false,
                            requiresEvidence: false,
                            isVisible: true
                          }]);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มประเภทกะ
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {shiftTypes.map(type => (
                      <div key={type.id} className="group p-5 bg-white rounded-3xl border border-slate-100 flex flex-col gap-5 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }}></div>
                            <div>
                              <span className="text-base font-black text-slate-800 leading-none">{type.code}</span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{type.name}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShiftTypes(shiftTypes.filter(t => t.id !== type.id))}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">เริ่ม</span>
                            <span className="text-sm font-black text-slate-700">{type.startTime}</span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase">เลิก</span>
                            <span className="text-sm font-black text-slate-700">{type.endTime}</span>
                          </div>
                          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center">
                            <span className="text-[9px] font-black text-indigo-400 uppercase">เป้าคน</span>
                            <input 
                              type="number" 
                              min="0"
                              value={type.targetStaff || 0}
                              onChange={(e) => setShiftTypes(shiftTypes.map(t => t.id === type.id ? { ...t, targetStaff: parseInt(e.target.value) || 0 } : t))}
                              className="w-full bg-transparent text-center text-sm font-black text-indigo-700 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-50">
                          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase">ต้องรออนุมัติ</span>
                            <button 
                              onClick={() => setShiftTypes(shiftTypes.map(t => t.id === type.id ? { ...t, requiresApproval: !t.requiresApproval } : t))}
                              className={`w-10 h-6 rounded-full transition-all relative ${type.requiresApproval ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${type.requiresApproval ? 'right-1' : 'left-1'}`}></div>
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase">ต้องใส่เหตุผล</span>
                            <button 
                              onClick={() => setShiftTypes(shiftTypes.map(t => t.id === type.id ? { ...t, requiresReason: !t.requiresReason } : t))}
                              className={`w-10 h-6 rounded-full transition-all relative ${type.requiresReason ? 'bg-amber-500' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${type.requiresReason ? 'right-1' : 'left-1'}`}></div>
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase">ต้องแนบรูป</span>
                            <button 
                              onClick={() => setShiftTypes(shiftTypes.map(t => t.id === type.id ? { ...t, requiresEvidence: !t.requiresEvidence } : t))}
                              className={`w-10 h-6 rounded-full transition-all relative ${type.requiresEvidence ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${type.requiresEvidence ? 'right-1' : 'left-1'}`}></div>
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase">ช่วงเวลา</span>
                            <select 
                              value={type.category || 'other'}
                              onChange={(e) => setShiftTypes(shiftTypes.map(t => t.id === type.id ? { ...t, category: e.target.value as any } : t))}
                              className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border-none focus:ring-0"
                            >
                              <option value="morning">ช่วงเช้า</option>
                              <option value="afternoon">ช่วงบ่าย</option>
                              <option value="other">อื่นๆ</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase">พนักงานเลือกได้</span>
                            <button 
                              onClick={() => setShiftTypes(shiftTypes.map(t => t.id === type.id ? { ...t, isVisible: !t.isVisible } : t))}
                              className={`w-10 h-6 rounded-full transition-all relative ${type.isVisible ? 'bg-green-600' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${type.isVisible ? 'right-1' : 'left-1'}`}></div>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            )}

            {activeAdminTab === 'positions' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left Sidebar: Employee Pool */}
                  <div className="w-full lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-24">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                      <span className="text-sm font-black text-slate-800 uppercase tracking-widest">พนักงานรอจัดตำแหน่ง</span>
                    </div>

                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLDivElement).classList.add('bg-rose-50', 'border-rose-300', 'scale-105');
                      }}
                      onDragLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).classList.remove('bg-rose-50', 'border-rose-300', 'scale-105');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLDivElement).classList.remove('bg-rose-50', 'border-rose-300', 'scale-105');
                        const employeeId = e.dataTransfer.getData('employeeId');
                        if (employeeId) {
                          setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, positionId: '' } : emp));
                        }
                      }}
                      className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-slate-400 transition-all duration-300 hover:border-rose-200 hover:bg-rose-50/30 group"
                    >
                      <div className="p-3 bg-slate-50 group-hover:bg-rose-100 rounded-2xl transition-colors">
                        <Trash2 className="w-5 h-5 group-hover:text-rose-500" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">ลากมาวางที่นี่<br/>เพื่อยกเลิกตำแหน่ง</span>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {employees.filter(e => !e.positionId).length > 0 ? employees.filter(e => !e.positionId).map(emp => (
                        <div 
                          key={emp.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('employeeId', emp.id);
                            (e.currentTarget as HTMLDivElement).style.opacity = '0.4';
                          }}
                          onDragEnd={(e) => {
                            (e.currentTarget as HTMLDivElement).style.opacity = '1';
                          }}
                          className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md transition-all group"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black text-slate-800 truncate">{emp.fullName}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">รอยืนยันตำแหน่ง</div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-10 flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] border border-slate-100 px-4 text-center">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">จัดครบทุกคนแล้ว 🎉</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Content: Position Grid */}
                  <div className="flex-1 space-y-8">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest">การจัดการตำแหน่งงาน</span>
                      </div>
                      <button 
                        onClick={() => {
                          const name = prompt('ชื่อตำแหน่ง:');
                          const code = prompt('รหัสตำแหน่ง:');
                          if (name && code) {
                            setPositions([...positions, { id: code.toLowerCase(), code, name, minRequired: 1 }]);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest"
                      >
                        <Plus className="w-4 h-4" /> เพิ่มตำแหน่ง
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {positions.map(pos => {
                        const assignedEmployees = employees.filter(e => e.positionId === pos.id);
                        return (
                          <div 
                            key={pos.id} 
                            onDragOver={(e) => {
                              e.preventDefault();
                              (e.currentTarget as HTMLDivElement).classList.add('bg-indigo-50', 'border-indigo-400', 'scale-[1.01]');
                            }}
                            onDragLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).classList.remove('bg-indigo-50', 'border-indigo-400', 'scale-[1.01]');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              (e.currentTarget as HTMLDivElement).classList.remove('bg-indigo-50', 'border-indigo-400', 'scale-[1.01]');
                              const employeeId = e.dataTransfer.getData('employeeId');
                              if (employeeId) {
                                setEmployees(prev => prev.map(emp => emp.id === employeeId ? { ...emp, positionId: pos.id } : emp));
                              }
                            }}
                            className="group p-6 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col gap-4 hover:border-indigo-300 transition-all duration-300 relative"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-lg font-black text-slate-800 leading-tight">{pos.name}</div>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{pos.code}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {assignedEmployees.length > 0 && (
                                  <button 
                                    onClick={() => setEmployees(prev => prev.map(e => e.positionId === pos.id ? { ...e, positionId: '' } : e))}
                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                    title="ล้างพนักงานทั้งหมดในตำแหน่งนี้"
                                  >
                                    <Check className="w-4 h-4 rotate-45" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => setPositions(positions.filter(p => p.id !== pos.id))}
                                  className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 min-h-[80px] p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                              {assignedEmployees.length > 0 ? assignedEmployees.map(emp => (
                                <div 
                                  key={emp.id} 
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('employeeId', emp.id);
                                    (e.currentTarget as HTMLDivElement).style.opacity = '0.4';
                                  }}
                                  onDragEnd={(e) => {
                                    (e.currentTarget as HTMLDivElement).style.opacity = '1';
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:border-indigo-300 animate-in zoom-in duration-200"
                                >
                                  <div className="w-5 h-5 rounded-lg overflow-hidden bg-slate-100">
                                    <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-700">{emp.fullName}</span>
                                </div>
                              )) : (
                                <div className="w-full flex items-center justify-center py-6">
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ลากพนักงานมาวาง</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App;
