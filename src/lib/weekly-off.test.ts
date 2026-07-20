import { describe, expect, it } from 'vitest';
import { buildWeeklyOffDayEntries } from './weekly-off';
import type { Employee, ScheduleEntry, ShiftType } from '../types';

const xShift = { id: 'x1', code: 'X', name: 'หยุด' } as ShiftType;
const mShift = { id: 'm1', code: 'M', name: 'เช้า' } as ShiftType;

const emp = (id: string, weeklyOffDay?: number): Employee =>
  ({ id, employeeCode: id, fullName: id, positionId: 'p1', role: 'employee', weeklyOffDay }) as Employee;

const entry = (employeeId: string, date: string): ScheduleEntry => ({
  id: `${employeeId}-${date}`,
  employeeId,
  date,
  shiftTypeId: mShift.id,
  status: 'approved',
  requestType: 'shift_change',
});

// August 2026: Saturdays = 1, 8, 15, 22, 29 (day 6); Sundays = 2, 9, 16, 23, 30 (day 0)
const aug = new Date(2026, 7, 15);

describe('buildWeeklyOffDayEntries', () => {
  it('creates X entries on every matching weekday of the month', () => {
    const result = buildWeeklyOffDayEntries({
      month: aug,
      employees: [emp('e1', 0)],
      shiftTypes: [xShift, mShift],
      existingSchedules: [],
    });
    expect(result.map((r) => r.date)).toEqual([
      '2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30',
    ]);
    expect(result.every((r) => r.shiftTypeId === xShift.id && r.status === 'approved')).toBe(true);
  });

  it('works for a future month (not just the current one)', () => {
    const nextMonth = new Date(2026, 8, 1); // Sep 2026
    const result = buildWeeklyOffDayEntries({
      month: nextMonth,
      employees: [emp('e1', 1)], // Mondays
      shiftTypes: [xShift],
      existingSchedules: [],
    });
    expect(result.length).toBe(4); // Sep 2026 Mondays: 7, 14, 21, 28
    expect(result.every((r) => r.date.startsWith('2026-09'))).toBe(true);
  });

  it('skips dates that already have an entry', () => {
    const result = buildWeeklyOffDayEntries({
      month: aug,
      employees: [emp('e1', 0)],
      shiftTypes: [xShift, mShift],
      existingSchedules: [entry('e1', '2026-08-09')],
    });
    expect(result.map((r) => r.date)).not.toContain('2026-08-09');
    expect(result.length).toBe(4);
  });

  it('skips employees without a weekly off day', () => {
    const result = buildWeeklyOffDayEntries({
      month: aug,
      employees: [emp('e1'), emp('e2', 6)],
      shiftTypes: [xShift],
      existingSchedules: [],
    });
    expect(result.every((r) => r.employeeId === 'e2')).toBe(true);
    expect(result.length).toBe(5);
  });

  it('restricts to employeeIds when provided', () => {
    const result = buildWeeklyOffDayEntries({
      month: aug,
      employees: [emp('e1', 0), emp('e2', 6)],
      shiftTypes: [xShift],
      existingSchedules: [],
      employeeIds: ['e2'],
    });
    expect(result.every((r) => r.employeeId === 'e2')).toBe(true);
  });

  it('returns empty when no X shift type exists', () => {
    const result = buildWeeklyOffDayEntries({
      month: aug,
      employees: [emp('e1', 0)],
      shiftTypes: [mShift],
      existingSchedules: [],
    });
    expect(result).toEqual([]);
  });
});
