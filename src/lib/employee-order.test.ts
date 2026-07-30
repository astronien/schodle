import { describe, expect, it } from 'vitest';
import {
  UNGROUPED_GROUP_ID,
  UNGROUPED_GROUP_LABEL,
  groupEmployeesForSchedule,
  orderEmployeesForSchedule,
} from './employee-order';
import type { Employee, Position, PositionGroup } from '../types';

const positions: Position[] = [
  { id: 'p-cashier', code: 'CASH', name: 'แคชเชียร์', minRequired: 1 },
  { id: 'p-sales', code: 'SALES', name: 'พนักงานขาย', minRequired: 2 },
  { id: 'p-admin', code: 'ADM', name: 'ธุรการ', minRequired: 1 },
];

const groups: PositionGroup[] = [
  { id: 'g-b', name: 'บริการ' },
  { id: 'g-a', name: 'ขาย' },
];

function emp(over: Partial<Employee> & { id: string }): Employee {
  return {
    employeeCode: `EMP-${over.id}`,
    fullName: `พนักงาน ${over.id}`,
    positionId: 'p-sales',
    role: 'employee',
    ...over,
  };
}

const names = (employees: Employee[]) => employees.map((e) => e.id);

describe('employee-order', () => {
  it('groups employees by position group, groups ordered by name', () => {
    const employees = [
      emp({ id: 'b1', groupId: 'g-b' }),
      emp({ id: 'a1', groupId: 'g-a' }),
      emp({ id: 'b2', groupId: 'g-b' }),
      emp({ id: 'a2', groupId: 'g-a' }),
    ];

    const sections = groupEmployeesForSchedule(employees, groups, positions);
    // "ขาย" sorts before "บริการ" in Thai, regardless of the input group order.
    expect(sections.map((s) => s.groupId)).toEqual(['g-a', 'g-b']);
    expect(sections.map((s) => s.groupName)).toEqual(['ขาย', 'บริการ']);
    expect(names(orderEmployeesForSchedule(employees, groups, positions))).toEqual([
      'a1',
      'a2',
      'b1',
      'b2',
    ]);
  });

  it('sorts within a group by position code, then full name', () => {
    const employees = [
      emp({ id: 'z', groupId: 'g-a', positionId: 'p-sales', fullName: 'สมชาย' }),
      emp({ id: 'y', groupId: 'g-a', positionId: 'p-cashier', fullName: 'อนันต์' }),
      emp({ id: 'x', groupId: 'g-a', positionId: 'p-sales', fullName: 'กมล' }),
      emp({ id: 'w', groupId: 'g-a', positionId: 'p-admin', fullName: 'ธนา' }),
    ];

    // ADM < CASH < SALES by code; inside SALES, กมล < สมชาย by Thai name.
    expect(names(orderEmployeesForSchedule(employees, groups, positions))).toEqual([
      'w',
      'y',
      'x',
      'z',
    ]);
  });

  it('puts employees with no group last, under the Thai ungrouped label', () => {
    const employees = [
      emp({ id: 'nogroup' }),
      emp({ id: 'a1', groupId: 'g-a' }),
      emp({ id: 'b1', groupId: 'g-b' }),
    ];

    const sections = groupEmployeesForSchedule(employees, groups, positions);
    const last = sections[sections.length - 1];
    expect(last.groupId).toBe(UNGROUPED_GROUP_ID);
    expect(last.groupName).toBe(UNGROUPED_GROUP_LABEL);
    expect(last.isUngrouped).toBe(true);
    expect(names(last.employees)).toEqual(['nogroup']);
    expect(names(orderEmployeesForSchedule(employees, groups, positions))).toEqual([
      'a1',
      'b1',
      'nogroup',
    ]);
  });

  it('keeps employees whose groupId points at a deleted group, sorted last', () => {
    const employees = [
      emp({ id: 'orphan', groupId: 'g-deleted' }),
      emp({ id: 'a1', groupId: 'g-a' }),
      emp({ id: 'nogroup' }),
    ];

    const sections = groupEmployeesForSchedule(employees, groups, positions);
    expect(sections).toHaveLength(2);
    // No phantom section is invented for the missing group.
    expect(sections.map((s) => s.groupId)).toEqual(['g-a', UNGROUPED_GROUP_ID]);
    // Orphan and truly-ungrouped employees share the catch-all bucket.
    expect(names(sections[1].employees).sort()).toEqual(['nogroup', 'orphan']);
    // Nobody disappears.
    expect(orderEmployeesForSchedule(employees, groups, positions)).toHaveLength(3);
  });

  it('survives an empty groups list — everyone falls into the ungrouped bucket', () => {
    const employees = [emp({ id: 'a1', groupId: 'g-a' }), emp({ id: 'b1' })];
    const sections = groupEmployeesForSchedule(employees, [], positions);
    expect(sections).toHaveLength(1);
    expect(sections[0].groupId).toBe(UNGROUPED_GROUP_ID);
    expect(names(sections[0].employees)).toEqual(['a1', 'b1']);
  });

  it('is deterministic — input order does not change the result', () => {
    const employees = [
      emp({ id: 'a1', groupId: 'g-a', fullName: 'กมล' }),
      emp({ id: 'a2', groupId: 'g-a', fullName: 'กมล' }), // identical name on purpose
      emp({ id: 'b1', groupId: 'g-b', fullName: 'สมชาย' }),
      emp({ id: 'orphan', groupId: 'g-gone', fullName: 'อนันต์' }),
      emp({ id: 'nogroup', fullName: 'ธนา' }),
    ];

    const expected = names(orderEmployeesForSchedule(employees, groups, positions));
    // Same roster, several different input orders → identical output.
    for (const shuffled of [
      [...employees].reverse(),
      [employees[2], employees[4], employees[0], employees[3], employees[1]],
      [employees[1], employees[0], employees[3], employees[2], employees[4]],
    ]) {
      expect(names(orderEmployeesForSchedule(shuffled, groups, positions))).toEqual(expected);
    }
    // ...and running it twice on the same array is stable too.
    expect(names(orderEmployeesForSchedule(employees, groups, positions))).toEqual(expected);
  });

  it('does not mutate the arrays it is given', () => {
    const employees = [emp({ id: 'z', groupId: 'g-b' }), emp({ id: 'a', groupId: 'g-a' })];
    const before = names(employees);
    orderEmployeesForSchedule(employees, groups, positions);
    expect(names(employees)).toEqual(before);
  });

  it('handles an empty roster', () => {
    expect(groupEmployeesForSchedule([], groups, positions)).toEqual([]);
    expect(orderEmployeesForSchedule([], groups, positions)).toEqual([]);
    expect(groupEmployeesForSchedule([], [], [])).toEqual([]);
    expect(orderEmployeesForSchedule([], [], [])).toEqual([]);
  });

  it('falls back to positionId when the positions list is not supplied', () => {
    const employees = [
      emp({ id: 'b', groupId: 'g-a', positionId: 'p-sales' }),
      emp({ id: 'a', groupId: 'g-a', positionId: 'p-admin' }),
    ];
    expect(names(orderEmployeesForSchedule(employees, groups))).toEqual(['a', 'b']);
  });
});
