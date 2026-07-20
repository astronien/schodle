// Shared "save weekly off day" logic used by both the employee settings
// (App.tsx) and the manager dashboard. Saves the employee's weeklyOffDay and
// applies X (off) shifts on matching days of the current AND next month in a
// single bulk upsert (previously: one awaited network call per date, current
// month only — slow, and future months that already had schedules never got
// their off days updated).
import { useCallback } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import type { Employee, ScheduleEntry, ShiftType } from '../types';

interface WeeklyOffDayDeps {
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
  currentMonth: Date;
  updateEmployee: (employee: Employee) => Promise<void>;
  upsertSchedulesBulk: (entries: ScheduleEntry[]) => Promise<void>;
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
  upsertSchedulesBulk,
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

      // Apply to the viewed month AND the following month so an already
      // generated next month picks up the new off day too.
      const days = [currentMonth, addMonths(currentMonth, 1)].flatMap((m) =>
        eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) }),
      );
      const offDates = days
        .filter((d) => d.getDay() === selectedDay)
        .map((d) => format(d, 'yyyy-MM-dd'));

      const entries: ScheduleEntry[] = [];
      for (const date of offDates) {
        const existing = schedules.find((s) => s.employeeId === employee.id && s.date === date);
        if (existing) {
          if (existing.shiftTypeId !== xShift.id) {
            entries.push({ ...existing, shiftTypeId: xShift.id, status: 'approved', createdBy });
          }
        } else {
          entries.push({
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

      await upsertSchedulesBulk(entries);
      return { xShiftMissing: false };
    },
    [schedules, shiftTypes, currentMonth, updateEmployee, upsertSchedulesBulk],
  );

  return { applyWeeklyOffDay };
}
