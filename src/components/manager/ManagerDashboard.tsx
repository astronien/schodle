import { useState, useRef } from 'react';
import {
  AlertTriangle, Trash2, Users, XCircle, CheckCircle2, Bell,
  ChevronLeft, ChevronRight, Plus, PlusCircle, Check, Image, Download, Clock
} from 'lucide-react';


import { subscribeToNotifications } from '../../lib/push';

import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths
} from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { Employee, Position, ScheduleEntry, ShiftType, AppSettings, PositionGroup } from '../../types';
import { PositionGroupManager } from './PositionGroupManager';



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


  updateSchedule: (entry: ScheduleEntry, forceNotify?: boolean) => Promise<void>;

  deleteSchedule: (id: string) => Promise<void>;
  currentMonth: Date;

  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  generateSmartSchedule: () => void;
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => Promise<void>;
}


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
  deletePosition,

  positionGroups,
  createPositionGroup,
  updatePositionGroup,
  deletePositionGroup,
  updateSchedule,
  deleteSchedule,
  currentMonth,
  setCurrentMonth,
  generateSmartSchedule,
  settings,
  updateSettings,
}: ManagerDashboardProps) {



  const [activeTab, setActiveTab] = useState<'coverage' | 'requests' | 'report' | 'admin'>('coverage');
  const [activeAdminTab, setActiveAdminTab] = useState<'employees' | 'shifts' | 'positions' | 'groups' | 'settings'>('employees');


  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string; currentShiftId?: string } | null>(null);
  const [editingWeeklyOffEmployeeId, setEditingWeeklyOffEmployeeId] = useState<string | null>(null);
  const [selectedWeeklyOffDay, setSelectedWeeklyOffDay] = useState<number | null>(null);
  const [isSavingWeeklyOffDay, setIsSavingWeeklyOffDay] = useState(false);
  const [isCreatingShiftType, setIsCreatingShiftType] = useState(false);
  const [newShiftCode, setNewShiftCode] = useState('');
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStartTime, setNewShiftStartTime] = useState('09:00');
  const [newShiftEndTime, setNewShiftEndTime] = useState('18:00');
  const [newShiftColor, setNewShiftColor] = useState('#22c55e');
  const [newShiftCategory, setNewShiftCategory] = useState<'morning' | 'afternoon' | 'other'>('morning');

  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [newEmployeeGroupId, setNewEmployeeGroupId] = useState('');

  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionCode, setNewPositionCode] = useState('');
  const [reportEmployeeId, setReportEmployeeId] = useState<string | null>(null);
  
  // Local state for settings to avoid jumping on every keystroke
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      await subscribeToNotifications(currentUser.id);
      alert('เปิดการแจ้งเตือนสำเร็จ!');
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถเปิดการแจ้งเตือนได้');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCreateShiftType = async () => {
    const code = newShiftCode.trim();
    const name = newShiftName.trim();
    if (!code || !name) {
      alert('กรอก รหัสกะ และ ชื่อกะ');
      return;
    }

    try {
      await createShiftType({
        code,
        name,
        startTime: newShiftStartTime,
        endTime: newShiftEndTime,
        color: newShiftColor,
        requiresApproval: false,
        requiresReason: false,
        requiresEvidence: false,
        isVisible: true,
        category: newShiftCategory,
      });

      setIsCreatingShiftType(false);
      setNewShiftCode('');
      setNewShiftName('');
    } catch (err: any) {
      alert(err.message || 'เพิ่มกะงานไม่สำเร็จ');
    }
  };

  const handleCreateEmployee = async () => {
    const name = newEmployeeName.trim();
    const code = newEmployeeCode.trim();
    if (!name || !code) {
      alert('กรอก ชื่อพนักงาน และ รหัสพนักงาน');
      return;
    }
    const defaultPos = positions.find((p) => p.code === 'Cashier') || positions[0];
    if (!defaultPos) {
      alert('ไม่พบตำแหน่งงาน กรุณาเพิ่มตำแหน่งก่อน');
      return;
    }
    try {
      await createEmployee({
        fullName: name,
        employeeCode: code,
        positionId: defaultPos.id,
        groupId: newEmployeeGroupId || undefined,
        role: 'employee',
        email: `${code}@example.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      });
      setIsCreatingEmployee(false);
      setNewEmployeeName('');
      setNewEmployeeCode('');
      setNewEmployeeGroupId('');
    } catch (err: any) {
      alert(err.message || 'เพิ่มพนักงานไม่สำเร็จ');
    }

  };

  const handleCreatePosition = async () => {
    const name = newPositionName.trim();
    const code = newPositionCode.trim();
    if (!name || !code) {
      alert('กรอก ชื่อตำแหน่ง และ รหัสตำแหน่ง');
      return;
    }
    try {
      await createPosition({ code, name, minRequired: 1 });
      setIsCreatingPosition(false);
      setNewPositionName('');
      setNewPositionCode('');
    } catch (err: any) {
      alert(err.message || 'เพิ่มตำแหน่งไม่สำเร็จ');
    }
  };

  const [isSavingSettings, setIsSavingSettings] = useState(false);


  const tableScrollRef = useRef<HTMLDivElement>(null);

  const handleTableScroll = () => {
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
          const requesterShiftTypeId = requesterShift.shiftTypeId;
          const targetShiftTypeId = targetShift.shiftTypeId;

          // Update both shifts persistently and force notifications
          await Promise.all([
            updateSchedule({ ...requesterShift, shiftTypeId: targetShiftTypeId, status: 'approved', swapWithId: undefined }, true),
            updateSchedule({ ...targetShift, shiftTypeId: requesterShiftTypeId, status: 'approved' }, true)
          ]);

        }
      } else {
        await updateSchedule({ ...request, status });
      }
    } catch (err: any) {
      alert('ทำรายการไม่สำเร็จ: ' + (err.message || 'Unknown error'));
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
        await updateSchedule({ ...existing, shiftTypeId, status: 'approved' });
      } else {
        await updateSchedule({
          id: crypto.randomUUID(),
          employeeId,
          date,
          shiftTypeId,
          status: 'approved',
        });
      }
      setEditingCell(null);
    } catch (err: any) {
      alert('บันทึกไม่สำเร็จ: ' + (err.message || 'Unknown error'));
    }
  };

  const handleClearShift = async () => {
    if (!editingCell) return;
    const { employeeId, date } = editingCell;
    try {
      const existing = schedules.find((s) => s.employeeId === employeeId && s.date === date);
      if (existing) {
        await deleteSchedule(existing.id);
      }
      setEditingCell(null);
    } catch (err: any) {
      alert('ลบไม่สำเร็จ: ' + (err.message || 'Unknown error'));
    }
  };

  const weeklyOffDays: Array<{ value: number; label: string }> = [
    { value: 1, label: 'จ' },
    { value: 2, label: 'อ' },
    { value: 3, label: 'พ' },
    { value: 4, label: 'พฤ' },
    { value: 5, label: 'ศ' },
    { value: 6, label: 'ส' },
    { value: 0, label: 'อา' },
  ];

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
          alert('ไม่พบประเภทกะ X กรุณาสร้างกะ X ก่อน');
          return;
        }

        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const offDates = daysInMonth
          .filter((d) => d.getDay() === selectedWeeklyOffDay)
          .map((d) => format(d, 'yyyy-MM-dd'));

        for (const date of offDates) {
          const existing = schedules.find((s) => s.employeeId === emp.id && s.date === date);
          if (existing) {
            if (existing.shiftTypeId !== xShift.id) {
              await updateSchedule({ ...existing, shiftTypeId: xShift.id, status: 'approved' });
            }
          } else {
            await updateSchedule({
              id: crypto.randomUUID(),
              employeeId: emp.id,
              date,
              shiftTypeId: xShift.id,
              status: 'approved',
            });
          }
        }
      }

      setEditingWeeklyOffEmployeeId(null);
    } catch (err: any) {
      alert(err.message || 'บันทึกไม่สำเร็จ');
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
        // swap shift types between two employees
        const sourceShiftTypeId = sourceShift.shiftTypeId;
        const targetShiftTypeId = targetShift.shiftTypeId;
        await Promise.all([
          updateSchedule({ ...sourceShift, shiftTypeId: targetShiftTypeId }),
          updateSchedule({ ...targetShift, shiftTypeId: sourceShiftTypeId })
        ]);
      } else {
        // move shift from source to target
        await updateSchedule({ ...sourceShift, employeeId: targetEmployeeId });
      }
    } catch (err: any) {
      alert('ย้ายกะไม่สำเร็จ: ' + (err.message || 'Unknown error'));
    }
  };


  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSettings(localSettings);
      alert('บันทึกการตั้งค่าสำเร็จ');
    } catch (err) {
      alert('บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });


  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">Manager Control</h2>
            <p className="text-text-tertiary font-medium text-xs sm:text-sm">Store: {settings.storeName}</p>

          </div>
          {activeTab === 'coverage' && (
            <div className="flex items-center gap-2 bg-bg-surface px-3 py-1.5 rounded-lg border border-surface-200 shadow-sm">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-bg-panel rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-tertiary" />
              </button>
              <span className="text-sm font-bold w-28 text-center text-text-primary">
                {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-bg-panel rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-bg-surface p-1 rounded-lg border border-surface-200 shadow-sm">
            {(['coverage', 'requests', 'report', 'admin'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setReportEmployeeId(null); }}
                className={cn(
                  'px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-panel'
                )}
              >
                {tab === 'coverage' && 'ตารางรวม'}
                {tab === 'requests' && 'คำขอ'}
                {tab === 'report' && 'รายงาน'}
                {tab === 'admin' && 'จัดการ'}
              </button>
            ))}
          </div>
          {activeTab === 'coverage' && (
            <button
              onClick={generateSmartSchedule}
              className="btn btn-primary text-xs shadow-raised hover:shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              จัดตาราง AI
            </button>
          )}
        </div>
      </div>

      {/* Coverage Tab */}
      {activeTab === 'coverage' && (
        <div className="card rounded-none sm:rounded-xl flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-success/20 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                  ความครอบคลุมรายวัน
                </h2>
              </div>
              <p className="text-xs font-semibold text-text-quaternary uppercase tracking-wider ml-5">
                ตรวจสอบความสมดุลและจำนวนพนักงาน
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const imbalancedDays = daysInMonth.filter((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const salesStaffIds = employees
                    .filter((e) => e.positionId === '3' || e.positionId === '5')
                    .map((e) => e.id);
                  const dailySalesSchedules = schedules.filter(
                    (s) => s.date === dateStr && s.status === 'approved' && salesStaffIds.includes(s.employeeId)
                  );
                  const morningCount = dailySalesSchedules.filter(
                    (s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'morning'
                  ).length;
                  const afternoonCount = dailySalesSchedules.filter(
                    (s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'afternoon'
                  ).length;
                  return Math.abs(morningCount - afternoonCount) > 1;
                });

                return (
                  imbalancedDays.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 rounded-xl shadow-sm">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                      <div>
                        <div className="text-[10px] font-bold text-danger uppercase leading-none mb-0.5">
                          แจ้งเตือนพนักงานขาย
                        </div>
                        <div className="text-xs font-bold text-danger leading-none">
                          พบ {imbalancedDays.length} วันที่ไม่สมดุล
                        </div>
                      </div>
                    </div>
                  )
                );
              })()}

              <div className="flex gap-2 p-1.5 bg-bg-panel rounded-xl border border-success/20">
                {shiftTypes
                  .filter((t) => t.isVisible)
                  .map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-surface rounded-lg shadow-sm border border-success/20"
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }}></div>
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wide">
                        {type.code}
                      </span>
                      <span className="text-[10px] font-semibold text-text-quaternary">
                        {type.startTime} - {type.endTime}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="overflow-auto custom-scrollbar grow border-t border-success/20"
          >
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-30 bg-bg-panel p-3 sm:p-4 text-left border-b border-success/20 w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                    <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">พนักงาน</span>
                  </th>
                  {daysInMonth.map((day) => (
                    <th
                      key={day.toString()}
                      className="sticky top-0 z-20 bg-bg-panel p-2 sm:p-3 text-center border-b border-success/20 min-w-[48px] sm:min-w-[56px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-wider">
                          {format(day, 'EEE', { locale: th })}
                        </span>
                        <span className="text-sm font-bold text-text-primary">{format(day, 'd')}</span>
                        {(() => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const salesStaffIds = employees
                            .filter((e) => e.positionId === '3' || e.positionId === '5')
                            .map((e) => e.id);
                          const dailySalesSchedules = schedules.filter(
                            (s) => s.date === dateStr && s.status === 'approved' && salesStaffIds.includes(s.employeeId)
                          );
                          const morningCount = dailySalesSchedules.filter(
                            (s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'morning'
                          ).length;
                          const afternoonCount = dailySalesSchedules.filter(
                            (s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'afternoon'
                          ).length;
                          const isImbalanced = Math.abs(morningCount - afternoonCount) > 1;

                          return (
                            isImbalanced && (
                              <div className="mt-1 flex flex-col items-center gap-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></div>
                                <span className="text-[7px] font-bold text-danger uppercase tracking-tighter bg-danger/10 px-1 rounded">
                                  เช้า {morningCount} / บ่าย {afternoonCount}
                                </span>
                              </div>
                            )
                          );
                        })()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="group hover:bg-bg-panel/50 transition-colors">
                    <td className="sticky left-0 z-10 bg-bg-surface group-hover:bg-bg-panel p-3 sm:p-4 border-b border-white/[0.03] w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-bg-surface border border-surface-200 shrink-0">
                          <img
                            src={
                              employee.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.fullName}`
                            }
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-text-primary leading-none mb-1 truncate">
                            {employee.fullName}
                          </div>
                          <div className="text-[9px] sm:text-[10px] font-semibold text-text-quaternary uppercase tracking-wider truncate">
                            {positions.find((p) => p.id === employee.positionId)?.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const shift = schedules.find(
                        (s) => s.employeeId === employee.id && s.date === dateStr && s.status === 'approved'
                      );
                      const shiftType = shift ? shiftTypes.find((t) => t.id === shift.shiftTypeId) : null;

                      return (
                        <td
                          key={day.toString()}
                          className="p-1 border-b border-white/[0.03]"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropShift(e, employee.id, dateStr)}
                        >
                          {shift && shiftType ? (
                            <div
                              draggable
                              onClick={() => handleOpenEditCell(employee.id, dateStr)}
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  'shift',
                                  JSON.stringify({ employeeId: employee.id, date: dateStr })
                                )
                              }
                              className="w-full h-7 sm:h-9 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-105 cursor-grab active:cursor-grabbing"
                              style={{ backgroundColor: shiftType.color }}
                            >
                              {shiftType.code}
                            </div>
                          ) : (
                            <div
                              onClick={() => handleOpenEditCell(employee.id, dateStr)}
                              className="w-full h-7 sm:h-9 rounded-md bg-bg-panel border border-dashed border-surface-200 cursor-pointer hover:bg-bg-surface transition-colors"
                            ></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td className="sticky left-0 z-20 bg-bg-panel p-3 sm:p-4 text-left border-t border-success/20 w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)] align-top">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider leading-none">
                      สรุปจำนวนคนรายกะ
                    </span>
                    <div className="text-[9px] font-semibold text-text-quaternary mt-1">จริง / เป้า</div>
                  </td>

                  {daysInMonth.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dailySchedules = schedules.filter((s) => s.date === dateStr && s.status === 'approved');
                    const totalCount = new Set(dailySchedules.map((s) => s.employeeId)).size;
                    const morningCount = new Set(
                      dailySchedules
                        .filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'morning')
                        .map((s) => s.employeeId)
                    ).size;
                    const afternoonCount = new Set(
                      dailySchedules
                        .filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'afternoon')
                        .map((s) => s.employeeId)
                    ).size;
                    const isImbalanced = Math.abs(morningCount - afternoonCount) > 1;

                    return (
                      <td
                        key={day.toString()}
                        className="p-2 sm:p-3 text-center border-t border-success/20 min-w-[48px] sm:min-w-[56px] align-top"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-[10px] font-bold text-text-tertiary">
                              รวม {totalCount}
                            </div>
                            {isImbalanced && (
                              <div className="text-[9px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20">
                                เช้า {morningCount} / บ่าย {afternoonCount}
                              </div>
                            )}
                          </div>
                          {shiftTypes
                            .filter((t) => t.targetStaff && t.targetStaff > 0)
                            .map((type) => {
                              const count = new Set(
                                dailySchedules
                                  .filter((s) => s.shiftTypeId === type.id)
                                  .map((s) => s.employeeId)
                              ).size;
                              const target = type.targetStaff || 0;
                              const isShort = count < target;
                              const isOver = count > target;

                              return (
                                <div
                                  key={type.id}
                                  className="flex items-center justify-between px-2.5 py-1 bg-bg-surface rounded-lg border border-success/20 shadow-xs"
                                >
                                  <span className="text-[9px] font-bold" style={{ color: type.color }}>
                                    {type.code}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={cn(
                                        'text-[10px] font-bold',
                                        isShort ? 'text-danger' : isOver ? 'text-warn' : 'text-success'
                                      )}
                                    >
                                      {count}/{target}
                                    </span>
                                    {isShort && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></div>}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Edit Shift Modal */}
          {editingCell && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={() => setEditingCell(null)}
              ></div>
              <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
                <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>
                <div className="p-5 sm:p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-medium text-text-primary">แก้ไขกะงาน</h3>
                      <p className="text-sm font-medium text-brand-accent">
                        {(() => {
                          const emp = employees.find((e) => e.id === editingCell.employeeId);
                          return `${emp?.fullName} \u00b7 ${format(new Date(editingCell.date), 'EEEE \u0e17\u0e35\u0e48 d MMM yyyy', { locale: th })}`;
                        })()}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingCell(null)}
                      className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto custom-scrollbar pr-1">
                    {(() => {
                      const emp = employees.find((e) => e.id === editingCell.employeeId);
                      const isOffDay = typeof emp?.weeklyOffDay === 'number' && new Date(`${editingCell.date}T00:00:00`).getDay() === emp.weeklyOffDay;
                      return shiftTypes
                        .filter((t) => t.isVisible)
                        .map((type) => {
                          const isSelected = editingCell.currentShiftId === type.id;
                          const isDisabled = isOffDay && type.code !== 'X';
                          return (
                            <button
                              key={type.id}
                              disabled={isDisabled}
                              onClick={() => handleAssignShift(type.id)}
                              className={cn(
                                'flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 active:scale-[0.98]',
                                isSelected
                                  ? 'border-brand bg-brand/10 ring-1 ring-brand/20'
                                  : isDisabled
                                  ? 'border-white/[0.03] bg-white/[0.02] opacity-40 cursor-not-allowed'
                                  : 'border-white/[0.05] hover:border-white/[0.12] bg-bg-surface'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium text-white"
                                  style={{ backgroundColor: type.color }}
                                >
                                  {type.code}
                                </div>
                                <div className="text-left">
                                  <p className={cn('font-medium text-sm', isDisabled ? 'text-text-quaternary' : 'text-text-primary')}>{type.name}</p>
                                  <p className="text-xs text-text-tertiary font-medium">
                                    {type.startTime} - {type.endTime}
                                  </p>
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-accent" />}
                            </button>
                          );
                        });
                    })()}
                  </div>
                  {editingCell.currentShiftId && (
                    <button
                      onClick={handleClearShift}
                      className="mt-3 w-full py-3 bg-danger/10 text-danger border border-danger/20 rounded-lg text-sm font-medium hover:bg-danger/20 transition-colors"
                    >
                      ลบกะออก
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-warn rounded-full"></div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              คำขอที่รอการพิจารณา
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schedules
              .filter((s) => s.status === 'pending')
              .map((request) => {
                const employee = employees.find((e) => e.id === request.employeeId);
                const requestShiftType = shiftTypes.find((t) => t.id === request.shiftTypeId);
                return (
                  <div
                    key={request.id}
                    className="card p-5 sm:p-6 rounded-xl animate-fade-in"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg-surface border border-surface-200">
                        <img
                          src={
                            employee?.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee?.fullName}`
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">{employee?.fullName}</div>
                        <div className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">
                          {positions.find((p) => p.id === employee?.positionId)?.name}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-5">
                      <div className="flex justify-between items-center p-3 bg-bg-panel rounded-lg">
                        <span className="text-xs font-medium text-text-tertiary">วันที่ขอ</span>
                        <span className="text-sm font-bold text-text-primary">
                          {format(new Date(request.date), 'd MMM yyyy', { locale: th })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-bg-panel rounded-lg">
                        <span className="text-xs font-medium text-text-tertiary">กะงาน</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: requestShiftType?.color }}
                          ></div>
                          <span className="text-sm font-bold text-text-primary">
                            {requestShiftType?.name} ({requestShiftType?.code})
                          </span>
                        </div>
                      </div>

                      {request.swapWithId && (
                        <div className="p-3 bg-brand/15 rounded-lg border border-brand/20 animate-fade-in">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-brand uppercase tracking-wide">
                              คำขอสลับกะกับ
                            </span>
                            <Users className="w-4 h-4 text-text-primary" />
                          </div>
                          {(() => {
                            const targetEmp = employees.find((e) => e.id === request.swapWithId);
                            const targetShift = schedules.find(
                              (s) => s.employeeId === request.swapWithId && s.date === request.date
                            );
                            const targetShiftType = shiftTypes.find((t) => t.id === targetShift?.shiftTypeId);
                            return (
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-brand/20 shadow-sm">
                                  <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${targetEmp?.fullName}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-text-primary leading-none mb-0.5">
                                    {targetEmp?.fullName}
                                  </p>
                                  <p className="text-[10px] font-semibold text-brand-accent">
                                    เข้ากะ {targetShiftType?.name || 'วันหยุด'} อยู่
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {request.employeeNote && (
                        <div className="p-3 bg-warn/10 rounded-lg border border-warn/30">
                          <span className="text-[10px] font-bold text-warn uppercase tracking-wide block mb-1">
                            หมายเหตุ
                          </span>
                          <p className="text-sm font-semibold text-warn leading-relaxed">
                            &ldquo;{request.employeeNote}&rdquo;
                          </p>
                        </div>
                      )}

                      {request.evidenceUrl && (
                        <div className="p-3 bg-brand/10 rounded-lg border border-brand/20">
                          <span className="text-[10px] font-bold text-brand uppercase tracking-wide block mb-2">
                            หลักฐานแนบ
                          </span>
                          <a
                            href={request.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-white/[0.08] hover:border-brand/40 transition-colors"
                          >
                            <img
                              src={request.evidenceUrl}
                              alt="หลักฐาน"
                              className="w-full h-32 object-cover"
                            />
                            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.03] text-brand-accent text-[10px] font-semibold uppercase tracking-wide">
                              <Image className="w-3.5 h-3.5" />
                              ดูรูปเต็มขนาด
                            </div>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleUpdateShiftStatus(request.id, 'rejected')}
                        className="btn btn-ghost py-2.5 text-xs font-semibold"
                      >
                        ปฏิเสธ
                      </button>
                      <button
                        onClick={() => handleUpdateShiftStatus(request.id, 'approved')}
                        className="btn btn-primary py-2.5 text-xs font-semibold shadow-lg shadow-raised"
                      >
                        อนุมัติ
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {schedules.filter((s) => s.status === 'pending').length === 0 && (
            <div className="card p-12 sm:p-16 text-center border-dashed">
              <div className="w-14 h-14 bg-bg-panel rounded-full flex items-center justify-center mx-auto mb-4 text-text-quaternary">
                <Check className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-1">ไม่มีคำขอรออนุมัติ</h3>
              <p className="text-sm font-medium text-text-quaternary">
                เมื่อมีพนักงานขอเปลี่ยนหรือลงกะงานพิเศษ จะปรากฏที่นี่
              </p>
            </div>
          )}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (() => {
        const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
        const monthSchedules = schedules.filter((s) => {
          const d = new Date(s.date);
          return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth);
        });

        // Helper: count shift categories for an employee
        const getEmployeeStats = (empId: string) => {
          const empSchedules = monthSchedules.filter((s) => s.employeeId === empId);
          const counts: Record<string, number> = {};
          let workDays = 0;
          let pendingCount = 0;
          let swapCount = 0;
          let lateCount = 0;
          empSchedules.forEach((s) => {
            const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
            const code = st?.code || s.shiftTypeId;
            if (s.status === 'pending') pendingCount++;
            if (s.swapWithId) swapCount++;
            if (s.employeeNote?.includes('มาสาย') || s.employeeNote?.includes('ลืมแสกน')) lateCount++;
            if (['XC', 'V'].includes(code) || st?.requiresReason || st?.requiresEvidence) {
              counts[code] = (counts[code] || 0) + 1;
            } else if (s.status === 'approved') {
              workDays++;
            }
          });
          return { counts, workDays, pendingCount, swapCount, lateCount };
        };

        // Overview totals
        const totalEmployees = employees.length;
        const allXc = monthSchedules.filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.code === 'XC').length;
        const allV = monthSchedules.filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.code === 'V').length;
        const allSick = monthSchedules.filter((s) => {
          const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
          return st?.name?.includes('ป่วย') || st?.code === 'SICK';
        }).length;
        const allLate = monthSchedules.filter((s) => s.employeeNote?.includes('มาสาย') || s.employeeNote?.includes('ลืมแสกน')).length;
        const allPending = monthSchedules.filter((s) => s.status === 'pending').length;

        // CSV export
        const handleExportCSV = () => {
          const headers = ['รหัส', 'ชื่อ', 'ตำแหน่ง', ...daysInMonth.map((d) => format(d, 'd/MM')), 'วันทำงาน', 'ขาด', 'ลา', 'ป่วย', 'สาย'];
          const rows = employees.map((emp) => {
            const stats = getEmployeeStats(emp.id);
            const pos = positions.find((p) => p.id === emp.positionId);
            const dayCols = daysInMonth.map((d) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const s = monthSchedules.find((sc) => sc.employeeId === emp.id && sc.date === dateStr);
              if (!s) return '';
              const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
              let label = st?.code || '';
              if (s.status === 'pending') label += '(รอ)';
              if (s.swapWithId) label += '(สลับ)';
              return label;
            });
            return [emp.employeeCode, emp.fullName, pos?.name || '', ...dayCols, stats.workDays, stats.counts['XC'] || 0, stats.counts['V'] || 0, stats.counts['SICK'] || 0, stats.lateCount];
          });
          const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
          const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${format(currentMonth, 'yyyy-MM')}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };

        // Detail view for one employee
        if (reportEmployeeId) {
          const emp = employees.find((e) => e.id === reportEmployeeId);
          if (!emp) return null;
          const stats = getEmployeeStats(emp.id);
          const pos = positions.find((p) => p.id === emp.positionId);
          const empSchedules = monthSchedules
            .filter((s) => s.employeeId === emp.id)
            .sort((a, b) => a.date.localeCompare(b.date));

          return (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReportEmployeeId(null)}
                  className="p-2 rounded-md hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all text-text-tertiary hover:text-text-primary"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                  รายละเอียดตารางงาน
                </h2>
              </div>

              <div className="card p-5 sm:p-6 rounded-xl">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-bg-surface border border-white/[0.08]">
                    <img
                      src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">{emp.fullName}</h3>
                    <p className="text-xs font-semibold text-text-quaternary uppercase tracking-wider">{emp.employeeCode} · {pos?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <div className="p-3 bg-success/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-success">{stats.workDays}</p>
                    <p className="text-[10px] font-semibold text-success/70 uppercase">วันทำงาน</p>
                  </div>
                  <div className="p-3 bg-danger/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-danger">{stats.counts['XC'] || 0}</p>
                    <p className="text-[10px] font-semibold text-danger/70 uppercase">ขาด</p>
                  </div>
                  <div className="p-3 bg-warn/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-warn">{stats.counts['V'] || 0}</p>
                    <p className="text-[10px] font-semibold text-warn/70 uppercase">ลา</p>
                  </div>
                  <div className="p-3 bg-brand/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-brand-accent">{stats.counts['SICK'] || 0}</p>
                    <p className="text-[10px] font-semibold text-brand/70 uppercase">ป่วย</p>
                  </div>
                  <div className="p-3 bg-warn/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-warn">{stats.lateCount}</p>
                    <p className="text-[10px] font-semibold text-warn/70 uppercase">สาย</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">วันที่</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">กะงาน</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">สถานะ</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-text-quaternary uppercase tracking-wider">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysInMonth.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const s = empSchedules.find((sc) => sc.date === dateStr);
                        const st = s ? shiftTypes.find((t) => t.id === s.shiftTypeId) : null;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <tr key={dateStr} className={cn('border-b border-white/[0.03]', isWeekend && 'bg-white/[0.01]')}>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-text-primary">{format(day, 'd')}</span>
                              <span className="text-text-quaternary ml-1.5">{format(day, 'EEE', { locale: th })}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              {st ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }}></div>
                                  <span className="font-medium text-text-primary">{st.name}</span>
                                  <span className="text-text-quaternary text-xs">({st.code})</span>
                                </div>
                              ) : (
                                <span className="text-text-quaternary">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {s ? (
                                <span className={cn(
                                  'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md',
                                  s.status === 'approved' && 'bg-success/10 text-success',
                                  s.status === 'pending' && 'bg-warn/10 text-warn',
                                  s.status === 'rejected' && 'bg-danger/10 text-danger',
                                )}>
                                  {s.status === 'approved' ? 'อนุมัติ' : s.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ'}
                                </span>
                              ) : (
                                <span className="text-text-quaternary text-xs">ไม่มีข้อมูล</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {s?.swapWithId && (
                                  <span className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    สลับกับ {employees.find((e) => e.id === s.swapWithId)?.fullName || '?'}
                                  </span>
                                )}
                                {(s?.employeeNote?.includes('มาสาย') || s?.employeeNote?.includes('ลืมแสกน')) && (
                                  <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    มาสาย
                                  </span>
                                )}
                                {s?.employeeNote && !s.employeeNote.includes('มาสาย') && !s.employeeNote.includes('ลืมแสกน') && !s.employeeNote.includes('สลับกะ') && (
                                  <span className="text-[10px] text-text-tertiary">
                                    {s.employeeNote}
                                  </span>
                                )}
                                {s?.evidenceUrl && (
                                  <a
                                    href={s.evidenceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-brand/20 transition-colors"
                                  >
                                    <Image className="w-3 h-3" />
                                    ดูหลักฐาน
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        // Employee list view
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-brand rounded-full"></div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                รายงานสรุปเดือน {format(currentMonth, 'MMMM yyyy', { locale: th })}
              </h2>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="card p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-text-primary">{totalEmployees}</p>
                <p className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">พนักงานทั้งหมด</p>
              </div>
              <div className="card p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-danger">{allXc}</p>
                <p className="text-[10px] font-semibold text-danger/70 uppercase tracking-wider">วันขาด</p>
              </div>
              <div className="card p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-warn">{allV}</p>
                <p className="text-[10px] font-semibold text-warn/70 uppercase tracking-wider">วันลา</p>
              </div>
              <div className="card p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-brand-accent">{allSick}</p>
                <p className="text-[10px] font-semibold text-brand/70 uppercase tracking-wider">วันป่วย</p>
              </div>
              <div className="card p-4 rounded-xl text-center">
                <p className="text-2xl font-bold text-warn">{allLate}</p>
                <p className="text-[10px] font-semibold text-warn/70 uppercase tracking-wider">วันสาย</p>
              </div>
            </div>

            {/* Export + Pending alert */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {allPending > 0 && (
                  <span className="text-xs font-semibold bg-warn/10 text-warn px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" />
                    {allPending} คำขอรออนุมัติ
                  </span>
                )}
              </div>
              <button
                onClick={handleExportCSV}
                className="btn btn-ghost text-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Employee List */}
            <div className="space-y-3">
              {employees.map((emp) => {
                const stats = getEmployeeStats(emp.id);
                const pos = positions.find((p) => p.id === emp.positionId);
                const hasAlert = stats.pendingCount > 0 || stats.swapCount > 0;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setReportEmployeeId(emp.id)}
                    className="w-full card p-4 sm:p-5 rounded-xl flex items-center gap-4 hover:border-brand/30 transition-all text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-bg-surface border border-white/[0.08] shrink-0">
                      <img
                        src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-text-primary truncate">{emp.fullName}</p>
                        {hasAlert && (
                          <span className="w-2 h-2 bg-warn rounded-full animate-pulse shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">{emp.employeeCode} · {pos?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-md">{stats.workDays} ทำงาน</span>
                        {stats.counts['XC'] > 0 && <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-1 rounded-md">{stats.counts['XC']} ขาด</span>}
                        {stats.counts['V'] > 0 && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-1 rounded-md">{stats.counts['V']} ลา</span>}
                        {(stats.counts['SICK'] || 0) > 0 && <span className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-1 rounded-md">{stats.counts['SICK']} ป่วย</span>}
                        {stats.lateCount > 0 && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-1 rounded-md">{stats.lateCount} สาย</span>}
                        {stats.pendingCount > 0 && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-1 rounded-md">{stats.pendingCount} รอ</span>}
                        {stats.swapCount > 0 && <span className="text-[10px] font-bold bg-brand/10 text-brand-accent px-2 py-1 rounded-md">{stats.swapCount} สลับ</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-quaternary group-hover:text-brand transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Admin Tab */}
      {activeTab === 'admin' && (
        <div className="space-y-5">
          <div className="card p-5 sm:p-6 rounded-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                  จัดการระบบ
                </h2>
              </div>
              <div className="flex bg-bg-surface p-1 rounded-lg">
                {(['employees', 'shifts', 'positions', 'groups', 'settings'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveAdminTab(tab)}
                    className={cn(
                      'px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all',
                      activeAdminTab === tab
                        ? 'bg-bg-surface text-brand-accent shadow-sm'
                        : 'text-text-tertiary hover:text-text-secondary'
                    )}
                  >
                    {tab === 'employees' && 'พนักงาน'}
                    {tab === 'shifts' && 'กะงาน'}
                    {tab === 'positions' && 'ตำแหน่ง'}
                    {tab === 'groups' && 'กลุ่ม'}
                    {tab === 'settings' && 'ตั้งค่าแอป'}
                  </button>

                ))}
              </div>

            </div>

            {activeAdminTab === 'employees' && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm font-medium text-text-tertiary">
                    รายชื่อพนักงานทั้งหมด ({employees.length} ท่าน)
                  </span>
                  <button
                    onClick={() => setIsCreatingEmployee(true)}
                    className="btn btn-primary text-xs py-2 shadow-raised"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มพนักงาน
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => handleOpenWeeklyOffDay(emp.id)}
                      className="group p-3 bg-bg-panel rounded-xl border border-success/20 flex items-center justify-between hover:border-brand/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface border border-surface-200">
                          <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-text-primary">{emp.fullName}</div>
                          <div className="text-[9px] font-semibold text-text-quaternary uppercase tracking-wider">
                            {emp.employeeCode}
                          </div>
                          {typeof emp.weeklyOffDay === 'number' && (
                            <div className="mt-1 text-[9px] font-semibold text-text-tertiary uppercase tracking-wider">
                              หยุด: {weeklyOffDays.find((d) => d.value === emp.weeklyOffDay)?.label}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEmployee(emp.id).catch((err) => alert(err.message || 'ลบพนักงานไม่สำเร็จ'));
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {isCreatingEmployee && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div
                      className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                      onClick={() => setIsCreatingEmployee(false)}
                    ></div>
                    <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
                      <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>
                      <div className="p-5 sm:p-5">
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="text-lg font-medium text-text-primary">เพิ่มพนักงาน</h3>
                            <p className="text-xs font-medium text-text-tertiary">กำหนดชื่อ/รหัสพนักงาน</p>
                          </div>
                          <button
                            onClick={() => setIsCreatingEmployee(false)}
                            className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <label className="space-y-1">
                            <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อพนักงาน</div>
                            <input
                              value={newEmployeeName}
                              onChange={(e) => setNewEmployeeName(e.target.value)}
                              className="w-full input"
                              placeholder="ชื่อ-นามสกุล"
                            />
                          </label>
                          <label className="space-y-1">
                            <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสพนักงาน</div>
                            <input
                              value={newEmployeeCode}
                              onChange={(e) => setNewEmployeeCode(e.target.value)}
                              className="w-full input"
                              placeholder="รหัส"
                            />
                          </label>
                          <label className="space-y-1">
                            <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">กลุ่มตำแหน่ง (Optional)</div>
                            <select
                              value={newEmployeeGroupId}
                              onChange={(e) => setNewEmployeeGroupId(e.target.value)}
                              className="w-full input"
                            >
                              <option value="">-- เลือกกลุ่ม (ถ้ามี) --</option>
                              {positionGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>



                        <div className="mt-5 flex items-center gap-2">
                          <button
                            onClick={() => setIsCreatingEmployee(false)}
                            className="flex-1 py-3 bg-white/[0.04] text-text-tertiary border border-white/[0.06] rounded-lg text-sm font-medium hover:bg-white/[0.07] transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={handleCreateEmployee}
                            className="flex-1 py-3 bg-brand/20 text-brand-accent border border-brand/20 rounded-lg text-sm font-medium hover:bg-brand/25 transition-colors"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Weekly Off-day Modal */}
            {editingWeeklyOffEmployeeId && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                  onClick={() => !isSavingWeeklyOffDay && setEditingWeeklyOffEmployeeId(null)}
                ></div>
                <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
                  <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>
                  <div className="p-5 sm:p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-medium text-text-primary">วันหยุดประจำสัปดาห์</h3>
                        <p className="text-sm font-medium text-brand-accent">
                          {(() => {
                            const emp = employees.find((e) => e.id === editingWeeklyOffEmployeeId);
                            return `${emp?.fullName || ''} · ${emp?.employeeCode || ''}`;
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingWeeklyOffEmployeeId(null)}
                        disabled={isSavingWeeklyOffDay}
                        className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {weeklyOffDays.map((d) => {
                        const isSelected = selectedWeeklyOffDay === d.value;
                        return (
                          <button
                            key={d.value}
                            onClick={() => setSelectedWeeklyOffDay(d.value)}
                            className={cn(
                              'py-3 rounded-lg border text-sm font-medium transition-all active:scale-[0.98]',
                              isSelected
                                ? 'border-brand bg-brand/10 ring-1 ring-brand/20 text-text-primary'
                                : 'border-white/[0.05] hover:border-white/[0.12] bg-bg-surface text-text-tertiary'
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedWeeklyOffDay(null)}
                        disabled={isSavingWeeklyOffDay}
                        className="flex-1 py-3 bg-white/[0.04] text-text-tertiary border border-white/[0.06] rounded-lg text-sm font-medium hover:bg-white/[0.07] transition-colors disabled:opacity-50"
                      >
                        ไม่ตั้ง
                      </button>
                      <button
                        onClick={handleSaveWeeklyOffDay}
                        disabled={isSavingWeeklyOffDay}
                        className="flex-1 py-3 bg-brand/20 text-brand-accent border border-brand/20 rounded-lg text-sm font-medium hover:bg-brand/25 transition-colors disabled:opacity-50"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeAdminTab === 'shifts' && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm font-medium text-text-tertiary">
                    ประเภทกะงานทั้งหมด ({shiftTypes.length} ประเภท)
                  </span>
                  <button
                    onClick={() => {
                      setNewShiftColor('#' + Math.floor(Math.random() * 16777215).toString(16));
                      setIsCreatingShiftType(true);
                    }}
                    className="btn btn-primary text-xs py-2 shadow-raised"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มประเภทกะ
                  </button>
                </div>

                {isCreatingShiftType && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div
                      className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                      onClick={() => setIsCreatingShiftType(false)}
                    ></div>
                    <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
                      <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>
                      <div className="p-5 sm:p-5">
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h3 className="text-lg font-medium text-text-primary">เพิ่มประเภทกะ</h3>
                            <p className="text-xs font-medium text-text-tertiary">กำหนดรหัส/ชื่อ/เวลา/สี</p>
                          </div>
                          <button
                            onClick={() => setIsCreatingShiftType(false)}
                            className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1">
                              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสกะ</div>
                              <input
                                value={newShiftCode}
                                onChange={(e) => setNewShiftCode(e.target.value)}
                                className="w-full input"
                                placeholder="เช่น X"
                              />
                            </label>
                            <label className="space-y-1">
                              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อกะ</div>
                              <input
                                value={newShiftName}
                                onChange={(e) => setNewShiftName(e.target.value)}
                                className="w-full input"
                                placeholder="เช่น OFF"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1">
                              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">เริ่ม</div>
                              <input
                                type="time"
                                value={newShiftStartTime}
                                onChange={(e) => setNewShiftStartTime(e.target.value)}
                                className="w-full input"
                              />
                            </label>
                            <label className="space-y-1">
                              <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">เลิก</div>
                              <input
                                type="time"
                                value={newShiftEndTime}
                                onChange={(e) => setNewShiftEndTime(e.target.value)}
                                className="w-full input"
                              />
                            </label>
                          </div>
                          
                          <label className="space-y-1">
                            <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ประเภท (สำหรับ AI จัดตาราง)</div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { id: 'morning', label: 'กะเช้า' },
                                { id: 'afternoon', label: 'กะบ่าย' },
                                { id: 'other', label: 'อื่นๆ' }
                              ].map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={() => setNewShiftCategory(cat.id as any)}
                                  className={cn(
                                    "py-2 px-1 rounded-lg text-[10px] font-bold transition-all border",
                                    newShiftCategory === cat.id 
                                      ? "bg-brand/20 border-brand text-brand-accent shadow-sm" 
                                      : "bg-white/5 border-white/10 text-text-quaternary hover:bg-white/10"
                                  )}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </label>


                          <div className="flex items-center justify-between p-3 bg-bg-panel rounded-xl border border-white/[0.06]">
                            <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">สี</div>
                            <input
                              type="color"
                              value={newShiftColor}
                              onChange={(e) => setNewShiftColor(e.target.value)}
                              className="h-7 w-12 bg-transparent border-0 p-0 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                          <button
                            onClick={() => setIsCreatingShiftType(false)}
                            className="flex-1 py-3 bg-white/[0.04] text-text-tertiary border border-white/[0.06] rounded-lg text-sm font-medium hover:bg-white/[0.07] transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={handleCreateShiftType}
                            className="flex-1 py-3 bg-brand/20 text-brand-accent border border-brand/20 rounded-lg text-sm font-medium hover:bg-brand/25 transition-colors"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {shiftTypes.map((type) => (
                    <div
                      key={type.id}
                      className="card p-5 flex flex-col gap-4 hover:border-brand/30 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }}></div>
                          <div>
                            <span className="text-base font-bold text-text-primary leading-none">{type.code}</span>
                            <p className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider mt-0.5">
                              {type.name}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteShiftType(type.id).catch((err) => alert(err.message || 'ลบกะงานไม่สำเร็จ'))}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-bg-panel rounded-xl border border-success/20">
                        <span className="text-[10px] font-bold text-text-quaternary uppercase">สี</span>
                        <input
                          type="color"
                          value={type.color}
                          onChange={(e) => {
                            const shift = shiftTypes.find((t) => t.id === type.id);
                            if (shift) {
                              updateShiftType({ ...shift, color: e.target.value }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                            }
                          }}
                          className="h-7 w-12 bg-transparent border-0 p-0 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 bg-bg-panel rounded-xl border border-success/20 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-text-quaternary uppercase">เริ่ม</span>
                          <span className="text-sm font-bold text-text-secondary">{type.startTime}</span>
                        </div>
                        <div className="p-2.5 bg-bg-panel rounded-xl border border-success/20 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-text-quaternary uppercase">เลิก</span>
                          <span className="text-sm font-bold text-text-secondary">{type.endTime}</span>
                        </div>
                        <div className="p-2.5 bg-brand/15 rounded-xl border border-brand/20 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-text-primary uppercase">เป้าคน</span>
                          <input
                            type="number"
                            min="0"
                            value={type.targetStaff || 0}
                            onChange={(e) => {
                              const shift = shiftTypes.find((t) => t.id === type.id);
                              if (shift) {
                                updateShiftType({ ...shift, targetStaff: parseInt(e.target.value) || 0 }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                              }
                            }}
                            className="w-full bg-transparent text-center text-sm font-bold text-brand focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 py-3 border-t border-white/[0.03]">
                        <div className="text-[9px] font-bold text-text-quaternary uppercase tracking-wider mb-1 px-1">ประเภทกะสำหรับ AI</div>
                        <div className="grid grid-cols-3 gap-2 px-1">
                          {[
                            { id: 'morning', label: 'เช้า' },
                            { id: 'afternoon', label: 'บ่าย' },
                            { id: 'other', label: 'อื่นๆ' }
                          ].map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const shift = shiftTypes.find((t) => t.id === type.id);
                                if (shift) {
                                  updateShiftType({ ...shift, category: cat.id as any }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                                }
                              }}
                              className={cn(
                                "py-1.5 rounded-lg text-[9px] font-bold transition-all border",
                                type.category === cat.id 
                                  ? "bg-brand/20 border-brand/50 text-brand-accent shadow-sm" 
                                  : "bg-white/5 border-white/5 text-text-quaternary hover:bg-white/10"
                              )}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>


                      <div className="space-y-1 pt-2 border-t border-white/[0.03]">
                        {[
                          { label: 'ต้องรออนุมัติ', key: 'requiresApproval', activeColor: 'bg-brand' },
                          { label: 'ต้องใส่เหตุผล', key: 'requiresReason', activeColor: 'bg-warn' },
                          { label: 'ต้องแนบรูป', key: 'requiresEvidence', activeColor: 'bg-brand' },
                        ].map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between p-2 hover:bg-bg-panel rounded-lg transition-colors"
                          >
                            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wide">
                              {item.label}
                            </span>
                            <button
                              onClick={() => {
                                const shift = shiftTypes.find((t) => t.id === type.id);
                                if (shift) {
                                  updateShiftType({ ...shift, [item.key]: !shift[item.key as keyof ShiftType] }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                                }
                              }}
                              className={cn(
                                'w-10 h-5 rounded-full transition-colors relative',
                                type[item.key as keyof ShiftType] ? item.activeColor : 'bg-bg-elevated'
                              )}
                            >
                              <div
                                className={cn(
                                  'absolute top-0.5 w-4 h-4 bg-bg-surface rounded-full shadow-sm transition-all',
                                  type[item.key as keyof ShiftType] ? 'right-0.5' : 'left-0.5'
                                )}
                              ></div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeAdminTab === 'positions' && (
              <div className="animate-fade-in">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Left Sidebar: Employee Pool */}
                  <div className="w-full lg:w-72 flex-shrink-0 space-y-5 lg:sticky lg:top-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-5 bg-warn rounded-full"></div>
                      <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
                        พนักงานรอจัดตำแหน่ง
                      </span>
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLDivElement).classList.add('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
                      }}
                      onDragLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).classList.remove('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLDivElement).classList.remove('bg-danger/10', 'border-danger/40', 'scale-[1.02]');
                        const employeeId = e.dataTransfer.getData('employeeId');
                        if (employeeId) {
                          const employee = employees.find((e) => e.id === employeeId);
                          if (employee) {
                            const fallback = positions[0];
                            if (fallback) {
                              updateEmployee({ ...employee, positionId: fallback.id }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                            }
                          }
                        }
                      }}
                      className="p-5 border-2 border-dashed border-surface-200 rounded-xl flex flex-col items-center justify-center gap-3 text-text-quaternary transition-all duration-200 hover:border-danger/30 hover:bg-danger/10 group"
                    >
                      <div className="p-2.5 bg-bg-panel group-hover:bg-danger/15 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5 group-hover:text-danger" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-relaxed">
                        ลากมาวางที่นี่
                        <br />
                        เพื่อยกเลิกตำแหน่ง
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {employees.filter((e) => !e.positionId).length > 0 ? (
                        employees
                          .filter((e) => !e.positionId)
                          .map((emp) => (
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
                              className="p-3 bg-bg-surface rounded-xl border border-surface-200 shadow-sm flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-md transition-all"
                            >
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-bg-surface flex-shrink-0">
                                <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-text-primary truncate">{emp.fullName}</div>
                                <div className="text-[9px] font-semibold text-text-quaternary uppercase tracking-wider">
                                  รอยืนยันตำแหน่ง
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center bg-bg-panel rounded-xl border border-success/20 px-4 text-center">
                          <span className="text-xs font-bold text-text-quaternary uppercase tracking-wider">
                            จัดครบทุกคนแล้ว 🎉
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Content: Position Grid */}
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-brand rounded-full"></div>
                        <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
                          การจัดการตำแหน่งงาน
                        </span>
                      </div>
                      <button
                        onClick={() => setIsCreatingPosition(true)}
                        className="btn btn-primary text-xs py-2 shadow-raised"
                      >
                        <Plus className="w-4 h-4" />
                        เพิ่มตำแหน่ง
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {positions.map((pos) => {
                        const assignedEmployees = employees.filter((e) => e.positionId === pos.id);
                        return (
                          <div
                            key={pos.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              (e.currentTarget as HTMLDivElement).classList.add('bg-brand/15', 'border-brand', 'scale-[1.01]');
                            }}
                            onDragLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).classList.remove('bg-brand/15', 'border-brand', 'scale-[1.01]');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              (e.currentTarget as HTMLDivElement).classList.remove('bg-brand/15', 'border-brand', 'scale-[1.01]');
                              const employeeId = e.dataTransfer.getData('employeeId');
                              if (employeeId) {
                                const employee = employees.find((e) => e.id === employeeId);
                                if (employee) {
                                  updateEmployee({ ...employee, positionId: pos.id }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                                }
                              }
                            }}
                            className="card p-5 rounded-xl border-2 border-dashed border-surface-200 flex flex-col gap-4 hover:border-brand/30 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-base font-bold text-text-primary leading-tight">{pos.name}</div>
                                <span className="badge bg-brand/15 text-brand-accent border border-brand/20 mt-1.5">
                                  {pos.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {assignedEmployees.length > 0 && (
                                  <button
                                    onClick={() =>
                                      employees
                                        .filter((e) => e.positionId === pos.id)
                                        .forEach((e) => {
                                          const fallback = positions[0];
                                          if (fallback) {
                                            updateEmployee({ ...e, positionId: fallback.id }).catch((err) => alert(err.message || 'อัปเดตไม่สำเร็จ'));
                                          }
                                        })
                                    }
                                    className="p-2 text-text-quaternary hover:text-warn hover:bg-warn/10 rounded-lg transition-all"
                                    title="ล้างพนักงานทั้งหมดในตำแหน่งนี้"
                                  >
                                    <Check className="w-4 h-4 rotate-45" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deletePosition(pos.id).catch((err) => alert(err.message || 'ลบตำแหน่งไม่สำเร็จ'))}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-bg-panel/50 rounded-lg border border-success/20">
                              {assignedEmployees.length > 0 ? (
                                assignedEmployees.map((emp) => (
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
                                    className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-surface rounded-lg shadow-sm border border-success/20 cursor-grab active:cursor-grabbing hover:border-brand/30 transition-all animate-fade-in"
                                  >
                                    <div className="w-5 h-5 rounded-md overflow-hidden bg-bg-surface">
                                      <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[11px] font-semibold text-text-secondary">{emp.fullName}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="w-full flex items-center justify-center py-5">
                                  <span className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wider">
                                    ลากพนักงานมาวาง
                                  </span>
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

            {isCreatingPosition && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                  onClick={() => setIsCreatingPosition(false)}
                ></div>
                <div className="relative w-full sm:max-w-md bg-bg-surface rounded-t-xl sm:rounded-lg shadow-overlay overflow-hidden animate-slide-up border border-white/[0.08]">
                  <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mt-3 sm:hidden"></div>
                  <div className="p-5 sm:p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-medium text-text-primary">เพิ่มตำแหน่ง</h3>
                        <p className="text-xs font-medium text-text-tertiary">กำหนดชื่อ/รหัสตำแหน่ง</p>
                      </div>
                      <button
                        onClick={() => setIsCreatingPosition(false)}
                        className="w-9 h-9 bg-white/[0.04] rounded-md flex items-center justify-center text-text-quaternary hover:text-text-primary hover:bg-white/[0.07] transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="space-y-1">
                        <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">ชื่อตำแหน่ง</div>
                        <input
                          value={newPositionName}
                          onChange={(e) => setNewPositionName(e.target.value)}
                          className="w-full input"
                          placeholder="เช่น Cashier"
                        />
                      </label>
                      <label className="space-y-1">
                        <div className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">รหัสตำแหน่ง</div>
                        <input
                          value={newPositionCode}
                          onChange={(e) => setNewPositionCode(e.target.value)}
                          className="w-full input"
                          placeholder="เช่น CSR"
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        onClick={() => setIsCreatingPosition(false)}
                        className="flex-1 py-3 bg-white/[0.04] text-text-tertiary border border-white/[0.06] rounded-lg text-sm font-medium hover:bg-white/[0.07] transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleCreatePosition}
                        className="flex-1 py-3 bg-brand/20 text-brand-accent border border-brand/20 rounded-lg text-sm font-medium hover:bg-brand/25 transition-colors"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeAdminTab === 'groups' && (
              <PositionGroupManager
                groups={positionGroups}
                employees={employees}
                createGroup={createPositionGroup}
                updateGroup={updatePositionGroup}
                deleteGroup={deletePositionGroup}
                updateEmployee={updateEmployee}
              />
            )}


            {activeAdminTab === 'settings' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-tertiary">
                    ตั้งค่าชื่อร้านและชื่อแอปพลิเคชัน
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
                      ชื่อร้าน (Store Name)
                    </label>
                    <input
                      type="text"
                      value={localSettings.storeName}
                      onChange={(e) => setLocalSettings({ ...localSettings, storeName: e.target.value })}
                      className="input-field w-full"
                      placeholder="เช่น Central Plaza Rama 9"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
                      ชื่อเว็บ / แอป (App Name)
                    </label>
                    <input
                      type="text"
                      value={localSettings.appName}
                      onChange={(e) => setLocalSettings({ ...localSettings, appName: e.target.value })}
                      className="input-field w-full"
                      placeholder="เช่น ShiftFlow"
                    />
                  </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary-light" />
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">การแจ้งเตือนผ่านมือถือ (Native Notifications)</h4>
                      </div>
                      <p className="text-xs text-text-tertiary">รับการแจ้งเตือนทันทีบน iOS และ Android เมื่อมีการอัปเดตตารางงานหรือคำขอลา</p>
                    </div>
                    <button 
                      type="button"
                      disabled={isSubscribing}
                      onClick={handleEnableNotifications}
                      className="btn btn-secondary text-xs px-6 py-2.5 whitespace-nowrap"
                    >
                      {isSubscribing ? 'กำลังตั้งค่า...' : 'เปิดใช้งานบนอุปกรณ์นี้'}
                    </button>
                  </div>
                </div>

                </div>
                
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="btn btn-primary px-8"
                  >
                    {isSavingSettings ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        บันทึกการตั้งค่า
                      </>
                    )}
                  </button>
                </div>

                
                <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl">
                  <p className="text-xs text-brand font-medium leading-relaxed">
                    * การเปลี่ยนชื่อร้านและชื่อแอปจะมีผลกับพนักงานทุกคนทันทีในหน้า Login และหน้า Header
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
