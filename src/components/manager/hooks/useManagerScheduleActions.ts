// Schedule-manipulation handlers for the manager dashboard (cell editing,
// drag & drop, swaps, approvals, copy-from-previous-month). Extracted from
// ManagerDashboard.tsx.
import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { useToast } from '../../../lib/toast';
import { buildWeeklyOffDayEntries } from '../../../lib/weekly-off';
import type { Employee, ScheduleEntry, ShiftType } from '../../../types';

export interface EditingCell {
  employeeId: string;
  date: string;
  currentShiftId?: string;
}

interface ManagerScheduleActionDeps {
  schedules: ScheduleEntry[];
  employees: Employee[];
  shiftTypes: ShiftType[];
  currentMonth: Date;
  updateSchedule: (entry: ScheduleEntry, forceNotify?: boolean, skipWeeklyOffValidation?: boolean) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  swapScheduleShifts: (requesterId: string, targetId: string) => Promise<void>;
  createSchedulesBulk: (entries: ScheduleEntry[]) => Promise<{ inserted: number; failed: number }>;
}

export function useManagerScheduleActions({
  schedules,
  employees,
  shiftTypes,
  currentMonth,
  updateSchedule,
  deleteSchedule,
  swapScheduleShifts,
  createSchedulesBulk,
}: ManagerScheduleActionDeps) {
  const toast = useToast();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [copyConfirmCount, setCopyConfirmCount] = useState<number | null>(null);

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
          await swapScheduleShifts(requesterShift.id, targetShift.id);
        }
        toast.success('อนุมัติและสลับกะสำเร็จ');
      } else if (status === 'rejected' && request.revertShiftTypeId) {
        await updateSchedule({
          ...request,
          shiftTypeId: request.revertShiftTypeId,
          status: 'approved',
          revertShiftTypeId: undefined,
        });
        toast.info('คืนสถานะกะเดิมให้พนักงานแล้ว');
      } else {
        await updateSchedule({ ...request, status });
        toast.success(status === 'approved' ? 'อนุมัติคำขอ' : 'ปฏิเสธคำขอ');
      }
    } catch (err: unknown) {
      toast.error('ทำรายการไม่สำเร็จ', err instanceof Error ? err.message : undefined);
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
        await updateSchedule({ ...existing, shiftTypeId, status: 'approved', createdBy: 'manager' }, false, true);
      } else {
        await updateSchedule({
          id: crypto.randomUUID(),
          employeeId,
          date,
          shiftTypeId,
          status: 'approved',
          requestType: 'shift_change',
          createdBy: 'manager',
        }, false, true);
      }
      setEditingCell(null);
      toast.success('บันทึกกะงานเรียบร้อย');
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleClearShift = async () => {
    if (!editingCell) return;
    const { employeeId, date } = editingCell;
    try {
      const existing = schedules.find((s) => s.employeeId === employeeId && s.date === date);
      if (existing) await deleteSchedule(existing.id);
      setEditingCell(null);
      toast.success('ลบกะออกแล้ว');
    } catch (err: unknown) {
      toast.error('ลบไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleBulkAssign = async (assignments: { employeeId: string; date: string; shiftTypeId: string }[]) => {
    try {
      for (const a of assignments) {
        const existing = schedules.find((s) => s.employeeId === a.employeeId && s.date === a.date);
        if (existing) {
          await updateSchedule({ ...existing, shiftTypeId: a.shiftTypeId, status: 'approved', createdBy: 'manager' });
        } else {
          await updateSchedule({
            id: crypto.randomUUID(),
            employeeId: a.employeeId,
            date: a.date,
            shiftTypeId: a.shiftTypeId,
            status: 'approved',
            requestType: 'shift_change',
            createdBy: 'manager',
          });
        }
      }
      toast.success('เซตกะสำเร็จ', `บันทึก ${assignments.length} รายการ`);
    } catch (err: unknown) {
      toast.error('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleMoveOffDay = async (employeeId: string, originalDate: string, newDate: string, shiftTypeId: string) => {
    try {
      const xShift = shiftTypes.find((t) => t.code === 'X');
      if (!xShift) {
        toast.error('ไม่พบประเภทกะ X (วันหยุด)');
        return;
      }

      const originalSchedule = schedules.find((s) => s.employeeId === employeeId && s.date === originalDate);
      if (originalSchedule) {
        await updateSchedule({ ...originalSchedule, shiftTypeId, status: 'approved', createdBy: 'manager' }, false, true);
      } else {
        await updateSchedule({
          id: crypto.randomUUID(),
          employeeId,
          date: originalDate,
          shiftTypeId,
          status: 'approved',
          requestType: 'shift_change',
          createdBy: 'manager',
        }, false, true);
      }

      const newDateSchedule = schedules.find((s) => s.employeeId === employeeId && s.date === newDate);
      if (newDateSchedule) {
        await updateSchedule({ ...newDateSchedule, shiftTypeId: xShift.id, status: 'approved', createdBy: 'manager' });
      } else {
        await updateSchedule({
          id: crypto.randomUUID(),
          employeeId,
          date: newDate,
          shiftTypeId: xShift.id,
          status: 'approved',
          requestType: 'shift_change',
          createdBy: 'manager',
        });
      }

      setEditingCell(null);
      toast.success('ย้ายวันหยุดเรียบร้อย', `จาก ${format(new Date(originalDate), 'd MMM', { locale: th })} เป็น ${format(new Date(newDate), 'd MMM', { locale: th })}`);
    } catch (err: unknown) {
      toast.error('ย้ายวันหยุดไม่สำเร็จ', err instanceof Error ? err.message : undefined);
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
        await Promise.all([
          updateSchedule({ ...sourceShift, shiftTypeId: targetShift.shiftTypeId }),
          updateSchedule({ ...targetShift, shiftTypeId: sourceShift.shiftTypeId }),
        ]);
      } else {
        await updateSchedule({ ...sourceShift, employeeId: targetEmployeeId });
      }
    } catch (err: unknown) {
      toast.error('ย้ายกะไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const handleSwapShifts = async (
    sourceEmployeeId: string,
    sourceDate: string,
    targetEmployeeId: string,
    targetDate: string,
  ) => {
    const sourceShift = schedules.find(
      (s) => s.employeeId === sourceEmployeeId && s.date === sourceDate && s.status === 'approved'
    );
    const targetShift = schedules.find(
      (s) => s.employeeId === targetEmployeeId && s.date === targetDate && s.status === 'approved'
    );
    if (!sourceShift && !targetShift) return;
    try {
      if (sourceShift && targetShift) {
        await Promise.all([
          updateSchedule({ ...sourceShift, shiftTypeId: targetShift.shiftTypeId }),
          updateSchedule({ ...targetShift, shiftTypeId: sourceShift.shiftTypeId }),
        ]);
        const sourceName = employees.find((e) => e.id === sourceEmployeeId)?.fullName || '';
        const targetName = employees.find((e) => e.id === targetEmployeeId)?.fullName || '';
        toast.success('สลับกะสำเร็จ', `${sourceName} ⇄ ${targetName}`);
      } else if (sourceShift) {
        await updateSchedule({ ...sourceShift, employeeId: targetEmployeeId });
        toast.success('ย้ายกะสำเร็จ');
      }
    } catch (err: unknown) {
      toast.error('สลับกะไม่สำเร็จ', err instanceof Error ? err.message : undefined);
    }
  };

  const doCopyPrevMonth = async (prevMonthSchedules: ScheduleEntry[], currentMonthStr: string) => {
    const prevMonth = subMonths(currentMonth, 1);
    const [yearStr, monthStr] = currentMonthStr.split('-');
    const daysInTargetMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate();
    const xShift = shiftTypes.find((t) => t.code === 'X');
    const empById = new Map(employees.map((e) => [e.id, e]));

    const newEntries: ScheduleEntry[] = [];
    const seen = new Set<string>();
    for (const prevSchedule of prevMonthSchedules) {
      // Skip X (off) shifts — they follow the weekly off day, which shifts
      // weekday across months; they're re-filled correctly below.
      if (xShift && prevSchedule.shiftTypeId === xShift.id) continue;

      const day = Number(prevSchedule.date.split('-')[2]);
      // Skip days that don't exist in the target month (e.g. 31 → Feb).
      if (day > daysInTargetMonth) continue;
      const newDate = `${currentMonthStr}-${String(day).padStart(2, '0')}`;

      // Skip shifts landing on the employee's weekly off day in the new month.
      const emp = empById.get(prevSchedule.employeeId);
      if (
        typeof emp?.weeklyOffDay === 'number' &&
        new Date(`${newDate}T00:00:00`).getDay() === emp.weeklyOffDay
      ) continue;

      const key = `${prevSchedule.employeeId}:${newDate}`;
      if (seen.has(key)) continue;
      const exists = schedules.some(
        (s) => s.date === newDate && s.employeeId === prevSchedule.employeeId && s.status === 'approved'
      );
      if (exists) continue;
      seen.add(key);
      newEntries.push({
        ...prevSchedule,
        id: crypto.randomUUID(), // NEW id — never reuse the old row's id
        date: newDate,
        status: 'approved',
        createdBy: 'manager',
      });
    }

    // Fill X shifts on each employee's weekly off day for the new month.
    newEntries.push(
      ...buildWeeklyOffDayEntries({
        month: currentMonth,
        employees,
        shiftTypes,
        existingSchedules: [...schedules, ...newEntries],
        createdBy: 'manager',
      }),
    );

    if (newEntries.length === 0) {
      toast.info('ไม่มีรายการใหม่ให้คัดลอก');
      return;
    }

    try {
      const { inserted, failed } = await createSchedulesBulk(newEntries);
      if (failed > 0) {
        toast.warning(`คัดลอกสำเร็จ ${inserted} รายการ`, `ล้มเหลว ${failed} รายการ`);
      } else {
        toast.success(`คัดลอกตารางสำเร็จ ${inserted} รายการ`, `จากเดือน ${format(prevMonth, 'MMMM yyyy', { locale: th })}`);
      }
    } catch (err) {
      console.error('[doCopyPrevMonth] failed:', err);
      toast.error('คัดลอกตารางไม่สำเร็จ');
    }
  };

  const handleCopyFromPrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    const prevMonthStr = format(prevMonth, 'yyyy-MM');
    const prevMonthSchedules = schedules.filter((s) => s.date.startsWith(prevMonthStr) && s.status === 'approved');
    if (prevMonthSchedules.length === 0) {
      toast.info('เดือนก่อนหน้าไม่มีตารางงาน');
      return;
    }

    const currentMonthStr = format(currentMonth, 'yyyy-MM');
    const currentMonthSchedulesExisting = schedules.filter(
      (s) => s.date.startsWith(currentMonthStr) && s.status === 'approved'
    );
    if (currentMonthSchedulesExisting.length > 0) {
      setCopyConfirmCount(currentMonthSchedulesExisting.length);
      return;
    }

    void doCopyPrevMonth(prevMonthSchedules, currentMonthStr);
  };

  const confirmCopyFromPrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    const prevMonthStr = format(prevMonth, 'yyyy-MM');
    const prevMonthSchedules = schedules.filter(
      (s) => s.date.startsWith(prevMonthStr) && s.status === 'approved',
    );
    doCopyPrevMonth(prevMonthSchedules, format(currentMonth, 'yyyy-MM'));
  };

  const handleApplyTemplate = async (assignments: { employeeId: string; date: string; shiftTypeId: string }[]) => {
    const entries: ScheduleEntry[] = assignments.map((a) => ({
      id: crypto.randomUUID(),
      employeeId: a.employeeId,
      date: a.date,
      shiftTypeId: a.shiftTypeId,
      status: 'approved',
      requestType: 'shift_change',
      createdBy: 'manager',
    }));
    const { failed } = await createSchedulesBulk(entries);
    if (failed > 0) {
      toast.warning(`ใช้เทมเพลตสำเร็จบางส่วน`, `ล้มเหลว ${failed} รายการ`);
    }
  };

  return {
    editingCell,
    setEditingCell,
    copyConfirmCount,
    setCopyConfirmCount,
    handleUpdateShiftStatus,
    handleOpenEditCell,
    handleAssignShift,
    handleClearShift,
    handleBulkAssign,
    handleMoveOffDay,
    handleDropShift,
    handleSwapShifts,
    handleCopyFromPrevMonth,
    confirmCopyFromPrevMonth,
    handleApplyTemplate,
  };
}
