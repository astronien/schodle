// Shared helper: build X (off) shift entries for every employee's weekly
// off day within a month. Used by recurring-schedule apply and template
// apply so preset off days carry over when creating a new month's schedule.
// (Smart schedule already handles this internally in schedule-generator.)
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import type { CreatedBy, Employee, ScheduleEntry, ShiftType } from '../types';

interface BuildWeeklyOffDayEntriesArgs {
  month: Date;
  employees: Employee[];
  shiftTypes: ShiftType[];
  /** Entries already present (or about to be inserted) — used for dedupe. */
  existingSchedules: ScheduleEntry[];
  createdBy?: CreatedBy;
  /** Restrict to specific employees (e.g. when applying recurring for a subset). */
  employeeIds?: string[];
}

/**
 * Returns approved X-shift entries for each employee's weeklyOffDay in the
 * given month, skipping any (employee, date) that already has an entry.
 * Returns [] when no X shift type exists.
 */
export function buildWeeklyOffDayEntries({
  month,
  employees,
  shiftTypes,
  existingSchedules,
  createdBy = 'system',
  employeeIds,
}: BuildWeeklyOffDayEntriesArgs): ScheduleEntry[] {
  const xShift = shiftTypes.find((t) => t.code === 'X');
  if (!xShift) return [];

  const taken = new Set(existingSchedules.map((s) => `${s.employeeId}:${s.date}`));
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });

  const targets = employeeIds
    ? employees.filter((e) => employeeIds.includes(e.id))
    : employees;

  const entries: ScheduleEntry[] = [];
  for (const emp of targets) {
    if (typeof emp.weeklyOffDay !== 'number') continue;
    for (const day of days) {
      if (day.getDay() !== emp.weeklyOffDay) continue;
      const dateStr = format(day, 'yyyy-MM-dd');
      const key = `${emp.id}:${dateStr}`;
      if (taken.has(key)) continue;
      taken.add(key);
      entries.push({
        id: crypto.randomUUID(),
        employeeId: emp.id,
        date: dateStr,
        shiftTypeId: xShift.id,
        status: 'approved',
        requestType: 'shift_change',
        createdBy,
      });
    }
  }
  return entries;
}
