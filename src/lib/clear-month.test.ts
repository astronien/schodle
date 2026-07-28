import { describe, expect, it } from 'vitest';
import { planClearMonth } from './clear-month';
import type { ScheduleEntry, ShiftType } from '../types';

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
