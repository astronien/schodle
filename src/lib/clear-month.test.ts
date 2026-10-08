import { describe, expect, it } from 'vitest';
import { planClearMonth } from './clear-month';
import type { Employee, ScheduleEntry, ShiftType } from '../types';
import { buildWeeklyOffDayEntries } from './weekly-off';

const shift = (id: string, code: string, preserveOnClear = false): ShiftType =>
  ({ id, code, name: code, preserveOnClear }) as ShiftType;

const shiftTypes: ShiftType[] = [
  shift('m1', 'M1'),
  shift('a1', 'A1'),
  shift('x', 'X', true),
  shift('at2', 'AT2', true),
  shift('o', 'O', true),
];

const entry = (
  id: string,
  date: string,
  shiftTypeId: string,
  status: ScheduleEntry['status'] = 'approved',
): ScheduleEntry => ({
  id,
  employeeId: 'e1',
  date,
  shiftTypeId,
  status,
  requestType: 'shift_change',
});

describe('planClearMonth', () => {
  it('keeps approved entries of preserved shift types and deletes the rest', () => {
    const schedules = [
      entry('1', '2026-08-03', 'm1'),
      entry('2', '2026-08-04', 'x'),
      entry('3', '2026-08-05', 'at2'),
      entry('4', '2026-08-06', 'o'),
      entry('5', '2026-08-07', 'a1'),
    ];
    const plan = planClearMonth({ monthPrefix: '2026-08', schedules, shiftTypes });

    expect(plan.idsToDelete.sort()).toEqual(['1', '5']);
    expect(plan.preservedCount).toBe(3);
    expect(plan.preservedCodes).toEqual(['AT2', 'O', 'X']);
  });

  it('does not touch other months', () => {
    const schedules = [
      entry('jul', '2026-07-15', 'm1'),
      entry('aug', '2026-08-15', 'm1'),
      entry('sep', '2026-09-15', 'm1'),
    ];
    const plan = planClearMonth({ monthPrefix: '2026-08', schedules, shiftTypes });

    expect(plan.idsToDelete).toEqual(['aug']);
  });

  it('deletes pending entries even on preserved shift types', () => {
    const schedules = [
      entry('approved-x', '2026-08-04', 'x', 'approved'),
      entry('pending-x', '2026-08-11', 'x', 'pending'),
      entry('rejected-at', '2026-08-12', 'at2', 'rejected'),
    ];
    const plan = planClearMonth({ monthPrefix: '2026-08', schedules, shiftTypes });

    expect(plan.idsToDelete.sort()).toEqual(['pending-x', 'rejected-at']);
    expect(plan.preservedCount).toBe(1);
  });

  it('deletes everything when no shift type is flagged', () => {
    const plain = shiftTypes.map((t) => ({ ...t, preserveOnClear: false }));
    const schedules = [
      entry('1', '2026-08-03', 'm1'),
      entry('2', '2026-08-04', 'x'),
    ];
    const plan = planClearMonth({ monthPrefix: '2026-08', schedules, shiftTypes: plain });

    expect(plan.idsToDelete.sort()).toEqual(['1', '2']);
    expect(plan.preservedCount).toBe(0);
    expect(plan.preservedCodes).toEqual([]);
  });

  it('handles an empty month', () => {
    const plan = planClearMonth({ monthPrefix: '2026-08', schedules: [], shiftTypes });
    expect(plan.idsToDelete).toEqual([]);
    expect(plan.preservedCount).toBe(0);
  });

  it('reports each preserved code once even across many entries', () => {
    const schedules = [
      entry('1', '2026-08-04', 'x'),
      entry('2', '2026-08-11', 'x'),
      entry('3', '2026-08-18', 'x'),
    ];
    const plan = planClearMonth({ monthPrefix: '2026-08', schedules, shiftTypes });

    expect(plan.preservedCodes).toEqual(['X']);
    expect(plan.preservedCount).toBe(3);
  });
});


describe('clear month + weekly-off refill (as used by deleteSchedulesByMonth)', () => {
  // November 2026: Mondays are 2, 9, 16, 23, 30.
  const nov = new Date(2026, 10, 1);
  const emp = { id: 'e1', employeeCode: 'e1', fullName: 'e1', positionId: 'p', role: 'employee', weeklyOffDay: 1 } as Employee;

  const refill = (schedules: ScheduleEntry[]) => {
    const { idsToDelete } = planClearMonth({ monthPrefix: '2026-11', schedules, shiftTypes });
    const deleted = new Set(idsToDelete);
    const remaining = schedules.filter((s) => s.date.startsWith('2026-11') && !deleted.has(s.id));
    return buildWeeklyOffDayEntries({ month: nov, employees: [emp], shiftTypes, existingSchedules: remaining });
  };

  it('fills every weekly off day for a brand-new, empty month', () => {
    // The regression: preserve-only left a fresh month with no off days at all.
    const added = refill([]);
    expect(added.map((e) => e.date)).toEqual([
      '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30',
    ]);
    expect(added.every((e) => e.shiftTypeId === 'x')).toBe(true);
  });

  it('does not duplicate off days that were preserved', () => {
    const added = refill([entry('kept-x', '2026-11-02', 'x')]);
    expect(added.map((e) => e.date)).not.toContain('2026-11-02');
    expect(added).toHaveLength(4);
  });

  it('does not overwrite a preserved shift that sits on an off day', () => {
    const added = refill([entry('at-on-monday', '2026-11-09', 'at2')]);
    expect(added.map((e) => e.date)).not.toContain('2026-11-09');
  });

  it('refills an off day whose non-preserved shift was just cleared', () => {
    // m1 is not preserved, so it is deleted and the Monday becomes an X again.
    const added = refill([entry('m1-on-monday', '2026-11-16', 'm1')]);
    expect(added.map((e) => e.date)).toContain('2026-11-16');
  });
});
