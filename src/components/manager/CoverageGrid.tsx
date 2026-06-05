import { useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCoverageLookup } from '../../lib/schedule-utils';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';
import { CellEditor } from './Modals/CellEditor';

interface CoverageGridProps {
  currentMonth: Date;
  employees: Employee[];
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  positions: Position[];
  editingCell: { employeeId: string; date: string; currentShiftId?: string } | null;
  onOpenCell: (employeeId: string, date: string) => void;
  onAssignShift: (shiftTypeId: string) => void;
  onClearShift: () => void;
  onCloseCell: () => void;
  onDropShift: (
    e: React.DragEvent<HTMLTableCellElement>,
    targetEmployeeId: string,
    targetDate: string
  ) => Promise<void>;
}

const SALES_POSITION_IDS = new Set(['3', '5']);

export function CoverageGrid({
  currentMonth,
  employees,
  schedules,
  shiftTypes,
  positions,
  editingCell,
  onOpenCell,
  onAssignShift,
  onClearShift,
  onCloseCell,
  onDropShift,
}: CoverageGridProps) {
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const imbalancedDays = daysInMonth.filter((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const { morningCount, afternoonCount } = getCoverageLookup(schedules, shiftTypes, dateStr);
    return Math.abs(morningCount - afternoonCount) > 1;
  });

  const editingEmployee = editingCell
    ? employees.find((e) => e.id === editingCell.employeeId) ?? null
    : null;

  return (
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
          {imbalancedDays.length > 0 && (
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
          )}

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
        className="overflow-auto custom-scrollbar grow border-t border-success/20"
      >
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-bg-panel p-3 sm:p-4 text-left border-b border-success/20 w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px] shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                <span className="text-[10px] font-bold text-text-quaternary uppercase tracking-wider">พนักงาน</span>
              </th>
              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const salesStaffIds = employees
                  .filter((e) => SALES_POSITION_IDS.has(e.positionId))
                  .map((e) => e.id);
                const salesSchedules = schedules.filter(
                  (s) => s.date === dateStr && s.status === 'approved' && salesStaffIds.includes(s.employeeId)
                );
                const morningCount = salesSchedules.filter(
                  (s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'morning'
                ).length;
                const afternoonCount = salesSchedules.filter(
                  (s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'afternoon'
                ).length;
                const isImbalanced = Math.abs(morningCount - afternoonCount) > 1;
                return (
                  <th
                    key={day.toString()}
                    className="sticky top-0 z-20 bg-bg-panel p-2 sm:p-3 text-center border-b border-success/20 min-w-[48px] sm:min-w-[56px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-wider">
                        {format(day, 'EEE', { locale: th })}
                      </span>
                      <span className="text-sm font-bold text-text-primary">{format(day, 'd')}</span>
                      {isImbalanced && (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></div>
                          <span className="text-[7px] font-bold text-danger uppercase tracking-tighter bg-danger/10 px-1 rounded">
                            เช้า {morningCount} / บ่าย {afternoonCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
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
                      onDrop={(e) => onDropShift(e, employee.id, dateStr)}
                    >
                      {shift && shiftType ? (
                        <div
                          draggable
                          onClick={() => onOpenCell(employee.id, dateStr)}
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
                          onClick={() => onOpenCell(employee.id, dateStr)}
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
                        <div className="text-[10px] font-bold text-text-tertiary">รวม {totalCount}</div>
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
                            dailySchedules.filter((s) => s.shiftTypeId === type.id).map((s) => s.employeeId)
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

      <CellEditor
        open={Boolean(editingCell)}
        employee={editingEmployee}
        date={editingCell?.date ?? ''}
        currentShiftId={editingCell?.currentShiftId}
        shiftTypes={shiftTypes}
        onAssign={onAssignShift}
        onClear={onClearShift}
        onClose={onCloseCell}
      />
    </div>
  );
}
