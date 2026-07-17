// Shared "save weekly off day" logic used by both the employee settings
// (App.tsx) and the manager dashboard. Saves the employee's weeklyOffDay and
// auto-assigns X (off) shifts on matching days of the current month.
// Previously this ~40-line block was duplicated in both places.
import { useCallback } from 'react';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import type { Employee, ScheduleEntry, ShiftType } from '../types';

interface WeeklyOffDayDeps {
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  currentMonth: Date;
  updateEmployee: (employee: Employee) => Promise<void>;
  updateSchedule: (entry: ScheduleEntry, forceNotify?: boolean, skipWeeklyOffValidation?: boolean) => Promise<void>;
}

export interface ApplyWeeklyOffDayResult {
  /** true when an X shift type doesn't exist so off-shifts couldn't be assigned. */
  xShiftMissing: boolean;
}

export function useWeeklyOffDay({
  schedules,
  shiftTypes,
  currentMonth,
  updateEmployee,
  updateSchedule,
}: WeeklyOffDayDeps) {
  const applyWeeklyOffDay = useCallback(
    async (
      employee: Employee,
      selectedDay: number | null,
      createdBy: 'employee' | 'manager',
    ): Promise<ApplyWeeklyOffDayResult> => {
      await updateEmployee({
        ...employee,
        weeklyOffDay: typeof selectedDay === 'number' ? selectedDay : undefined,
      });

      if (typeof selectedDay !== 'number') return { xShiftMissing: false };

      const xShift = shiftTypes.find((t) => t.code === 'X');
      if (!xShift) return { xShiftMissing: true };

      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      });
      const offDates = daysInMonth
        .filter((d) => d.getDay() === selectedDay)
        .map((d) => format(d, 'yyyy-MM-dd'));

      for (const date of offDates) {
        const existing = schedules.find((s) => s.employeeId === employee.id && s.date === date);
        if (existing) {
          if (existing.shiftTypeId !== xShift.id) {
            await updateSchedule({ ...existing, shiftTypeId: xShift.id, status: 'approved', createdBy });
          }
        } else {
          await updateSchedule({
            id: crypto.randomUUID(),
            employeeId: employee.id,
            date,
            shiftTypeId: xShift.id,
            status: 'approved',
            requestType: 'shift_change',
            createdBy,
          });
        }
      }

      return { xShiftMissing: false };
    },
    [schedules, shiftTypes, currentMonth, updateEmployee, updateSchedule],
  );

  return { applyWeeklyOffDay };
}
