import { useRef, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertTriangle, Download, Printer, Copy, ArrowLeftRight, LayoutTemplate, Megaphone, Calendar, CheckSquare, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getCoverageLookup } from '../../lib/schedule-utils';
import { exportCSV, printSchedule, exportPDF } from '../../lib/export-utils';
import { SALES_POSITION_IDS } from '../../config/constants';
import { sendPushToRole } from '../../lib/push';
import { buildICS, downloadICS } from '../../lib/calendar-export';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../../types';
import { CellEditor } from './Modals/CellEditor';
import { TemplateManager } from './Modals/TemplateManager';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../lib/toast';

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
  onSwapShifts: (sourceEmployeeId: string, sourceDate: string, targetEmployeeId: string, targetDate: string) => Promise<void>;
  onBulkAssign?: (assignments: { employeeId: string; date: string; shiftTypeId: string }[]) => void;
  onMoveOffDay?: (employeeId: string, originalDate: string, newDate: string, shiftTypeId: string) => void;
  storeName?: string;
  onCopyFromPrevMonth?: () => void;
  onApplyTemplate?: (assignments: { employeeId: string; date: string; shiftTypeId: string }[]) => void;
}

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
  onSwapShifts,
  onBulkAssign,
  onMoveOffDay,
  storeName,
  onCopyFromPrevMonth,
  onApplyTemplate,
}: CoverageGridProps) {
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const [swapMode, setSwapMode] = useState(false);
  const [swapFirst, setSwapFirst] = useState<{ employeeId: string; date: string } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  // "Fit month" — squeeze all days of the month into the viewport width
  // (no horizontal scroll). Preference persisted across sessions.
  const [fitMonth, setFitMonth] = useState<boolean>(() => {
    try { return localStorage.getItem('schodle_fit_month') !== '0'; } catch { return true; }
  });
  const toggleFitMonth = () => {
    setFitMonth((v) => {
      try { localStorage.setItem('schodle_fit_month', v ? '0' : '1'); } catch { /* ignore */ }
      return !v;
    });
  };
  const [selectedCells, setSelectedCells] = useState<Map<string, { employeeId: string; date: string }>>(new Map());
  const toast = useToast();

  const prevMonth = subMonths(currentMonth, 1);
  const prevMonthStart = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(prevMonth), 'yyyy-MM-dd');
  const prevMonthHasSchedules = schedules.some(
    (s) => s.date >= prevMonthStart && s.date <= prevMonthEnd
  );

  const imbalancedDays = daysInMonth.filter((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const { morningCount, afternoonCount } = getCoverageLookup(schedules, shiftTypes, dateStr);
    return Math.abs(morningCount - afternoonCount) > 1;
  });

  const editingEmployee = editingCell
    ? employees.find((e) => e.id === editingCell.employeeId) ?? null
    : null;

  const handleSwapClick = async (employeeId: string, date: string) => {
    if (!swapFirst) {
      setSwapFirst({ employeeId, date });
      return;
    }
    if (swapFirst.employeeId === employeeId && swapFirst.date === date) {
      setSwapFirst(null);
      return;
    }
    try {
      await onSwapShifts(swapFirst.employeeId, swapFirst.date, employeeId, date);
    } finally {
      setSwapFirst(null);
    }
  };

  const handleCellClick = (employeeId: string, dateStr: string) => {
    if (swapMode) {
      handleSwapClick(employeeId, dateStr);
    } else if (multiSelectMode) {
      const key = `${employeeId}-${dateStr}`;
      setSelectedCells((prev) => {
        const next = new Map(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, { employeeId, date: dateStr });
        }
        return next;
      });
    } else {
      onOpenCell(employeeId, dateStr);
    }
  };

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

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMultiSelectMode(!multiSelectMode); setSelectedCells(new Map()); setSwapMode(false); setSwapFirst(null); }}
              className={cn(
                'btn text-xs px-3 py-2',
                multiSelectMode ? 'bg-brand text-white' : 'btn-ghost'
              )}
              title={multiSelectMode ? 'ออกจากโหมดเลือกหลายวัน' : 'เลือกหลายวัน — เซตกะเดียวกันทีเดียว'}
            >
              <CheckSquare className="w-4 h-4" />
              {multiSelectMode ? `เลือกอยู่ (${selectedCells.size})` : 'เลือกหลายวัน'}
            </button>
            <button
              onClick={toggleFitMonth}
              className={cn('btn text-xs px-3 py-2', fitMonth ? 'bg-brand text-white' : 'btn-ghost')}
              title={fitMonth ? 'กลับเป็นแบบเลื่อนดู (ช่องใหญ่ขึ้น)' : 'ย่อให้เห็นทั้งเดือนโดยไม่ต้องเลื่อน'}
            >
              {fitMonth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {fitMonth ? 'พอดีจอ' : 'เต็มเดือน'}
            </button>
            <button
              onClick={() => { setSwapMode(!swapMode); setSwapFirst(null); setMultiSelectMode(false); setSelectedCells(new Map()); }}
              className={cn(
                'btn text-xs px-3 py-2',
                swapMode ? 'bg-brand text-white' : 'btn-ghost'
              )}
              title={swapMode ? 'ออกจากโหมดสลับ' : 'สลับกะแบบเร็ว — คลิก 2 จุด'}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {swapMode ? 'กำลังสลับ' : 'สลับ'}
            </button>
            {prevMonthHasSchedules && onCopyFromPrevMonth && (
              <button
                onClick={onCopyFromPrevMonth}
                className="btn btn-ghost text-xs px-3 py-2"
                title="คัดลอกตารางจากเดือนก่อน"
              >
                <Copy className="w-4 h-4" />
                คัดลอกเดือนก่อน
              </button>
            )}
            <button
              onClick={() => exportCSV(currentMonth, employees, schedules, shiftTypes, positions)}
              className="btn btn-ghost text-xs px-3 py-2"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => printSchedule(currentMonth, employees, schedules, shiftTypes, positions, storeName || 'Store')}
              className="btn btn-ghost text-xs px-3 py-2"
              title="พิมพ์ตาราง"
            >
              <Printer className="w-4 h-4" />
              พิมพ์
            </button>
            <button
              onClick={async () => {
                setPdfLoading(true);
                try {
                  await exportPDF(currentMonth, employees, schedules, shiftTypes, positions, storeName || 'Store');
                } catch (err: unknown) {
                  console.error('PDF export failed:', err);
                } finally {
                  setPdfLoading(false);
                }
              }}
              disabled={pdfLoading}
              className="btn btn-ghost text-xs px-3 py-2"
              title="ดาวน์โหลด PDF"
            >
              {pdfLoading ? (
                <span className="w-4 h-4 border-2 border-text-quaternary/30 border-t-text-quaternary rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              PDF
            </button>
            <button
              onClick={() => {
                const events = employees.flatMap((emp) => {
                  const pos = positions.find((p) => p.id === emp.positionId);
                  return schedules
                    .filter((s) => s.employeeId === emp.id && s.status === 'approved')
                    .map((s) => {
                      const st = shiftTypes.find((t) => t.id === s.shiftTypeId);
                      return {
                        date: s.date,
                        startTime: st?.startTime || '00:00',
                        endTime: st?.endTime || '23:59',
                        summary: st ? `${st.name} (${st.code})` : 'กะงาน',
                        description: `${emp.fullName}\n${pos?.name || ''}\n${st ? `${st.startTime}-${st.endTime}` : ''}`,
                        location: storeName || 'ร้าน',
                        uid: `schodle-${s.id}@schodle.app`,
                      };
                    });
                });
                const ics = buildICS(events);
                downloadICS(ics, `schedule-${format(currentMonth, 'yyyy-MM')}.ics`);
              }}
              className="btn btn-ghost text-xs px-3 py-2"
              title="ส่งออกปฏิทิน"
            >
              <Calendar className="w-4 h-4" />
              ปฏิทิน
            </button>
            <button
              onClick={() => setShowPublishConfirm(true)}
              className="btn text-xs px-3 py-2 bg-brand text-white hover:bg-brand-hover"
              title="ประกาศตารางให้พนักงาน"
            >
              <Megaphone className="w-4 h-4" />
              ประกาศ
            </button>
            {onApplyTemplate && (
              <button
                onClick={() => setShowTemplates(true)}
                className="btn btn-ghost text-xs px-3 py-2"
                title="จัดการเทมเพลต"
              >
                <LayoutTemplate className="w-4 h-4" />
                เทมเพลต
              </button>
            )}
          </div>

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
        <table className={cn('w-full border-separate border-spacing-0', fitMonth && 'table-fixed')}>
          <thead>
            <tr>
              <th className={cn('sticky top-0 left-0 z-30 bg-bg-panel text-left border-b border-success/20 shadow-[2px_0_0_rgba(0,0,0,0.04)]', fitMonth ? 'p-2 w-[110px] min-w-[110px] max-w-[110px]' : 'p-3 sm:p-4 w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px]')}>
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
                    className={cn('sticky top-0 z-20 bg-bg-panel text-center border-b border-success/20', fitMonth ? 'p-0.5 min-w-0' : 'p-2 sm:p-3 min-w-[48px] sm:min-w-[56px]')}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn('font-bold text-text-quaternary uppercase', fitMonth ? 'text-[7px] tracking-tight' : 'text-[9px] tracking-wider')}>
                        {format(day, 'EEE', { locale: th })}
                      </span>
                      <span className={cn('font-bold text-text-primary', fitMonth ? 'text-[11px]' : 'text-sm')}>{format(day, 'd')}</span>
                      {isImbalanced && (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></div>
                          {!fitMonth && (
                            <span className="text-[7px] font-bold text-danger uppercase tracking-tighter bg-danger/10 px-1 rounded">
                              เช้า {morningCount} / บ่าย {afternoonCount}
                            </span>
                          )}
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
                <td className={cn('sticky left-0 z-10 bg-bg-surface group-hover:bg-bg-panel border-b border-white/[0.03] shadow-[2px_0_0_rgba(0,0,0,0.04)]', fitMonth ? 'p-2 w-[110px] min-w-[110px] max-w-[110px]' : 'p-3 sm:p-4 w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px]')}>
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
                  const cellKey = `${employee.id}-${dateStr}`;
                  const isSwapFirst = swapFirst?.employeeId === employee.id && swapFirst?.date === dateStr;
                  const isDragOver = dragOverCell === cellKey;
                  const isMultiSelected = multiSelectMode && selectedCells.has(cellKey);
                  const hasTargetShift = shift && shiftType;
                  return (
                    <td
                      key={day.toString()}
                      className={cn(
                        fitMonth ? 'p-[1px] border-b border-white/[0.03] transition-colors' : 'p-1 border-b border-white/[0.03] transition-colors',
                        (swapMode || multiSelectMode) && 'cursor-pointer',
                        isSwapFirst && 'bg-brand/20 ring-2 ring-brand ring-inset',
                        isMultiSelected && 'bg-brand/20 ring-2 ring-brand ring-inset',
                        isDragOver && hasTargetShift && 'bg-warn/20 ring-2 ring-warn ring-inset',
                        isDragOver && !hasTargetShift && 'bg-success/20 ring-2 ring-success ring-inset',
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverCell(cellKey);
                      }}
                      onDragLeave={() => setDragOverCell(null)}
                      onDrop={(e) => {
                        setDragOverCell(null);
                        onDropShift(e, employee.id, dateStr);
                      }}
                    >
                      {shift && shiftType ? (
                        <div
                          draggable={!swapMode}
                          onClick={() => handleCellClick(employee.id, dateStr)}
                          onDragStart={(e) =>
                            e.dataTransfer.setData(
                              'shift',
                              JSON.stringify({ employeeId: employee.id, date: dateStr })
                            )
                          }
                          className={cn(
                            fitMonth
                              ? 'w-full h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shadow-sm transition-all cursor-grab active:cursor-grabbing'
                              : 'w-full h-7 sm:h-9 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-all cursor-grab active:cursor-grabbing',
                            !swapMode && 'hover:scale-105',
                            swapMode && 'hover:ring-2 hover:ring-white/60',
                          )}
                          style={{ backgroundColor: shiftType.color }}
                        >
                          {shiftType.code}
                        </div>
                      ) : (
                        <div
                          onClick={() => handleCellClick(employee.id, dateStr)}
                          className={cn(
                            fitMonth
                              ? 'w-full h-6 rounded border border-dashed cursor-pointer transition-colors'
                              : 'w-full h-7 sm:h-9 rounded-md border border-dashed cursor-pointer transition-colors',
                            swapMode
                              ? 'border-brand/40 bg-brand/5 hover:bg-brand/10'
                              : 'border-surface-200 bg-bg-panel hover:bg-bg-surface',
                          )}
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
              <td className={cn('sticky left-0 z-20 bg-bg-panel text-left border-t border-success/20 shadow-[2px_0_0_rgba(0,0,0,0.04)] align-top', fitMonth ? 'p-2 w-[110px] min-w-[110px] max-w-[110px]' : 'p-3 sm:p-4 w-[140px] min-w-[140px] max-w-[140px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px]')}>
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
                    className={cn('text-center border-t border-success/20 align-top', fitMonth ? 'p-0.5 min-w-0' : 'p-2 sm:p-3 min-w-[48px] sm:min-w-[56px]')}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] font-bold text-text-tertiary">รวม {totalCount}</div>
                        {isImbalanced && (
                          <div className={cn('font-bold text-danger bg-danger/10 rounded border border-danger/20', fitMonth ? 'text-[7px] px-0.5' : 'text-[9px] px-1.5 py-0.5')}>
                            {fitMonth ? `${morningCount}/${afternoonCount}` : `เช้า ${morningCount} / บ่าย ${afternoonCount}`}
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
        schedules={schedules}
        employees={employees}
        onAssign={onAssignShift}
        onClear={onClearShift}
        onClose={onCloseCell}
        onMoveOffDay={onMoveOffDay ? (originalDate, newDate, shiftTypeId) => {
          if (editingCell) onMoveOffDay(editingCell.employeeId, originalDate, newDate, shiftTypeId);
        } : undefined}
      />

      {onApplyTemplate && (
        <TemplateManager
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          currentMonth={currentMonth}
          schedules={schedules}
          employees={employees}
          shiftTypes={shiftTypes}
          onApply={onApplyTemplate}
        />
      )}

      {multiSelectMode && selectedCells.size > 0 && (
        <div className="sticky bottom-0 z-30 bg-bg-panel/95 backdrop-blur-xl border-t border-brand/20 p-3 sm:p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-brand" />
              <span className="text-xs font-bold text-text-primary">
                เลือกแล้ว {selectedCells.size} วัน
              </span>
            </div>
            <button
              onClick={() => setSelectedCells(new Map())}
              className="text-xs font-semibold text-text-tertiary hover:text-danger transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              ล้างการเลือก
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {shiftTypes
              .filter((t) => t.isVisible)
              .map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    if (!onBulkAssign) return;
                    const assignments = Array.from(selectedCells.values()).map((c) => ({
                      employeeId: c.employeeId,
                      date: c.date,
                      shiftTypeId: type.id,
                    }));
                    onBulkAssign(assignments);
                    setSelectedCells(new Map());
                    setMultiSelectMode(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-solid bg-white/50 hover:bg-white/80 hover:border-brand/40 transition-all active:scale-[0.98]"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: type.color }}
                  >
                    {type.code}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-text-primary leading-none">{type.name}</p>
                    <p className="text-[10px] text-text-tertiary font-medium">{type.startTime} - {type.endTime}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={showPublishConfirm}
        title="ประกาศตารางงาน"
        message={`แจ้งเตือนพนักงานทุกคนเกี่ยวกับตารางงานเดือน ${format(currentMonth, 'MMMM yyyy', { locale: th })}?`}
        confirmLabel="ประกาศ"
        variant="warning"
        onConfirm={async () => {
          const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: th });
          const result = await sendPushToRole(
            'employee',
            'ประกาศตารางงาน',
            `ตารางงานเดือน ${monthLabel} เผยแพร่แล้ว กรุณาตรวจสอบกะงานของคุณ`,
            '/dashboard',
          );
          if (result.success) {
            toast.success('ประกาศสำเร็จ', `แจ้งเตือนไปยังพนักงาน${result.sent ? ' ' + result.sent + ' คน' : ''}`);
          } else {
            toast.error('ประกาศไม่สำเร็จ', result.error);
          }
        }}
        onCancel={() => setShowPublishConfirm(false)}
      />
    </div>
  );
}
