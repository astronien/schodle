import { useState, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, PlusCircle, Check,
  AlertTriangle, Trash2, Users, XCircle, CheckCircle2
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths
} from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';

interface ManagerDashboardProps {
  schedules: ScheduleEntry[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
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
  deletePosition: (id: string) => Promise<void>;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  generateSmartSchedule: () => void;
}

export function ManagerDashboard({
  schedules,
  setSchedules,
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
  currentMonth,
  setCurrentMonth,
  generateSmartSchedule,
}: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'coverage' | 'requests' | 'admin'>('coverage');
  const [activeAdminTab, setActiveAdminTab] = useState<'employees' | 'shifts' | 'positions'>('employees');
  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string; currentShiftId?: string } | null>(null);

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

  const handleUpdateShiftStatus = (id: string, status: 'approved' | 'rejected') => {
    setSchedules((prev) => {
      const request = prev.find((s) => s.id === id);
      if (status === 'approved' && request?.swapWithId) {
        const requesterId = request.employeeId;
        const targetId = request.swapWithId;
        const date = request.date;

        const requesterShift = prev.find((s) => s.employeeId === requesterId && s.date === date);
        const targetShift = prev.find((s) => s.employeeId === targetId && s.date === date);

        if (requesterShift && targetShift) {
          const requesterShiftTypeId = requesterShift.shiftTypeId;
          const targetShiftTypeId = targetShift.shiftTypeId;

          return prev.map((s) => {
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

      return prev.map((s) => (s.id === id ? { ...s, status } : s));
    });
  };

  const handleOpenEditCell = (employeeId: string, date: string) => {
    const shift = schedules.find(
      (s) => s.employeeId === employeeId && s.date === date && s.status === 'approved'
    );
    setEditingCell({ employeeId, date, currentShiftId: shift?.shiftTypeId });
  };

  const handleAssignShift = (shiftTypeId: string) => {
    if (!editingCell) return;
    const { employeeId, date } = editingCell;
    setSchedules((prev) => {
      const existing = prev.find((s) => s.employeeId === employeeId && s.date === date);
      if (existing) {
        return prev.map((s) =>
          s.employeeId === employeeId && s.date === date
            ? { ...s, shiftTypeId, status: 'approved' as const }
            : s
        );
      }
      return [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          employeeId,
          date,
          shiftTypeId,
          status: 'approved' as const,
        },
      ];
    });
    setEditingCell(null);
  };

  const handleClearShift = () => {
    if (!editingCell) return;
    const { employeeId, date } = editingCell;
    setSchedules((prev) => prev.filter((s) => !(s.employeeId === employeeId && s.date === date)));
    setEditingCell(null);
  };

  const handleDropShift = (
    e: React.DragEvent<HTMLTableCellElement>,
    targetEmployeeId: string,
    targetDate: string
  ) => {
    e.preventDefault();
    const dragData = JSON.parse(e.dataTransfer.getData('shift'));
    const sourceEmployeeId = dragData.employeeId;
    const sourceDate = dragData.date;

    if (sourceEmployeeId === targetEmployeeId && sourceDate === targetDate) return;

    setSchedules((prev) => {
      const sourceShift = prev.find(
        (s) => s.employeeId === sourceEmployeeId && s.date === sourceDate && s.status === 'approved'
      );
      const targetShift = prev.find(
        (s) => s.employeeId === targetEmployeeId && s.date === targetDate && s.status === 'approved'
      );

      if (!sourceShift) return prev;

      let next = [...prev];

      if (targetShift) {
        // swap shift types between two employees
        const sourceShiftTypeId = sourceShift.shiftTypeId;
        const targetShiftTypeId = targetShift.shiftTypeId;
        next = next.map((s) => {
          if (s.employeeId === sourceEmployeeId && s.date === sourceDate) {
            return { ...s, shiftTypeId: targetShiftTypeId };
          }
          if (s.employeeId === targetEmployeeId && s.date === targetDate) {
            return { ...s, shiftTypeId: sourceShiftTypeId };
          }
          return s;
        });
      } else {
        // move shift from source to target (source becomes empty)
        next = next.map((s) => {
          if (s.employeeId === sourceEmployeeId && s.date === sourceDate) {
            return { ...s, employeeId: targetEmployeeId };
          }
          return s;
        });
      }

      return next;
    });
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">Manager Control</h2>
            <p className="text-text-tertiary font-medium text-xs sm:text-sm">Store: Central Plaza Rama 9</p>
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
            {(['coverage', 'requests', 'admin'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-panel'
                )}
              >
                {tab === 'coverage' && 'ตารางรวม'}
                {tab === 'requests' && 'คำขอ'}
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
                  <th className="sticky top-0 left-0 z-30 bg-bg-panel p-3 sm:p-4 text-left border-b border-success/20 min-w-[140px] sm:min-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
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
                    <td className="sticky left-0 z-10 bg-bg-surface group-hover:bg-bg-panel p-3 sm:p-4 border-b border-white/[0.03] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
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
            </table>
          </div>

          {/* Summary Section */}
          <div className="p-4 sm:p-6 border-t border-success/20 shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-5 bg-brand rounded-full"></div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                สรุปจำนวนคนรายกะ
              </h3>
            </div>

            <div
              ref={summaryScrollRef}
              onScroll={handleSummaryScroll}
              className="overflow-x-auto custom-scrollbar bg-bg-panel rounded-xl border border-success/20"
            >
              <div className="flex min-w-max">
                <div className="sticky left-0 z-10 bg-bg-surface p-3 sm:p-4 min-w-[120px] sm:min-w-[180px] border-r border-surface-200 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider leading-none">
                    สถานะความครบ
                  </span>
                  <span className="text-[9px] font-semibold text-text-quaternary mt-1">จริง / เป้า</span>
                </div>

                {daysInMonth.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dailySchedules = schedules.filter((s) => s.date === dateStr && s.status === 'approved');

                  return (
                    <div
                      key={day.toString()}
                      className="p-2 sm:p-3 min-w-[72px] sm:min-w-[100px] border-r border-success/20 last:border-r-0 flex flex-col gap-1.5"
                    >
                      {shiftTypes
                        .filter((t) => t.targetStaff && t.targetStaff > 0)
                        .map((type) => {
                          const count = dailySchedules.filter((s) => s.shiftTypeId === type.id).length;
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
                  );
                })}
              </div>
            </div>
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
                    {shiftTypes
                      .filter((t) => t.isVisible)
                      .map((type) => {
                        const isSelected = editingCell.currentShiftId === type.id;
                        return (
                          <button
                            key={type.id}
                            onClick={() => handleAssignShift(type.id)}
                            className={cn(
                              'flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 active:scale-[0.98]',
                              isSelected
                                ? 'border-brand bg-brand/10 ring-1 ring-brand/20'
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
                                <p className="font-medium text-sm text-text-primary">{type.name}</p>
                                <p className="text-xs text-text-tertiary font-medium">
                                  {type.startTime} - {type.endTime}
                                </p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-accent" />}
                          </button>
                        );
                      })}
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
                {(['employees', 'shifts', 'positions'] as const).map((tab) => (
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
                    onClick={() => {
                      const name = prompt('ชื่อพนักงาน:');
                      const code = prompt('รหัสพนักงาน:');
                      if (name && code) {
                        createEmployee({
                          fullName: name,
                          employeeCode: code,
                          positionId: '3',
                          role: 'employee',
                          email: `${code}@example.com`,
                          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                        }).catch(console.error);
                      }
                    }}
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
                      className="group p-3 bg-bg-panel rounded-xl border border-success/20 flex items-center justify-between hover:border-brand/30 transition-all"
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
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEmployee(emp.id).catch(console.error)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
                      const code = prompt('รหัสกะ (เช่น M3):');
                      const name = prompt('ชื่อกะ (เช่น Morning 3):');
                      if (code && name) {
                        createShiftType({
                          code,
                          name,
                          startTime: '09:00',
                          endTime: '18:00',
                          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                          requiresApproval: false,
                          requiresReason: false,
                          requiresEvidence: false,
                          isVisible: true,
                        }).catch(console.error);
                      }
                    }}
                    className="btn btn-primary text-xs py-2 shadow-raised"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มประเภทกะ
                  </button>
                </div>
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
                          onClick={() => deleteShiftType(type.id).catch(console.error)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                                updateShiftType({ ...shift, targetStaff: parseInt(e.target.value) || 0 }).catch(console.error);
                              }
                            }}
                            className="w-full bg-transparent text-center text-sm font-bold text-brand focus:outline-none"
                          />
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
                                  updateShiftType({ ...shift, [item.key]: !shift[item.key as keyof ShiftType] }).catch(console.error);
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
                            updateEmployee({ ...employee, positionId: '' }).catch(console.error);
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
                        onClick={() => {
                          const name = prompt('ชื่อตำแหน่ง:');
                          const code = prompt('รหัสตำแหน่ง:');
                          if (name && code) {
                            createPosition({ code, name, minRequired: 1 }).catch(console.error);
                          }
                        }}
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
                                  updateEmployee({ ...employee, positionId: pos.id }).catch(console.error);
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
                                          updateEmployee({ ...e, positionId: '' }).catch(console.error);
                                        })
                                    }
                                    className="p-2 text-text-quaternary hover:text-warn hover:bg-warn/10 rounded-lg transition-all"
                                    title="ล้างพนักงานทั้งหมดในตำแหน่งนี้"
                                  >
                                    <Check className="w-4 h-4 rotate-45" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deletePosition(pos.id).catch(console.error)}
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
          </div>
        </div>
      )}
    </div>
  );
}
