import { describe, expect, it } from 'vitest';
import { generateSmartSchedule } from './schedule-generator';
import type { Employee, ShiftType } from '../types';

const shiftTypes: ShiftType[] = [
  { id: 'st-morning', code: 'M', name: 'เช้า', startTime: '08:00', endTime: '16:00', color: '#3b82f6', isVisible: true, isLeave: false, category: 'morning', targetStaff: 1 },
  { id: 'st-afternoon', code: 'A', name: 'บ่าย', startTime: '16:00', endTime: '00:00', color: '#f59e0b', isVisible: true, isLeave: false, category: 'afternoon', targetStaff: 1 },
  { id: 'st-x', code: 'X', name: 'หยุด', startTime: '-', endTime: '-', color: '#9ca3af', isVisible: true, isLeave: false, category: 'other' },
];

const employees: Employee[] = [
  { id: 'e1', employeeCode: '001', fullName: 'A', positionId: 'p1', role: 'employee' },
  { id: 'e2', employeeCode: '002', fullName: 'B', positionId: 'p1', role: 'employee' },
  { id: 'e3', employeeCode: '003', fullName: 'C', positionId: 'p1', role: 'employee' },
];

describe('generateSmartSchedule — fairness', () => {
  it('distributes shifts roughly equally across employees', () => {
    const month = new Date('2026-06-01');
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      shuffleEmployees: false,
    });

    const counts = new Map<string, number>();
    for (const e of employees) counts.set(e.id, 0);
    for (const entry of entries) {
      counts.set(entry.employeeId, (counts.get(entry.employeeId) || 0) + 1);
    }
    const values = Array.from(counts.values());
    // No employee should be left with 0 shifts when quota exists
    const min = Math.min(...values);
    expect(min).toBeGreaterThan(0);
    // Fairness: max difference should be < total shifts / num employees * 2
    // (i.e., no single employee should be hugely over- or under-loaded)
    const total = values.reduce((s, n) => s + n, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    expect(max).toBeLessThanOrEqual(avg * 2.5);
  });

  it('respects target_staff quota per day', () => {
    const month = new Date('2026-06-01');
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      shuffleEmployees: false,
    });

    // Group by date + shift
    const byDateShift = new Map<string, number>();
    for (const entry of entries) {
      const key = `${entry.date}:${entry.shiftTypeId}`;
      byDateShift.set(key, (byDateShift.get(key) || 0) + 1);
    }
    // Each (date, shift) should have at most target_staff entries
    for (const [key, count] of byDateShift) {
      const shiftId = key.split(':')[1];
      const target = shiftTypes.find((t) => t.id === shiftId)?.targetStaff || 0;
      expect(count).toBeLessThanOrEqual(target);
    }
  });

  it('does not assign the same employee to two shifts on the same day', () => {
    const month = new Date('2026-06-01');
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      shuffleEmployees: false,
    });

    const seen = new Set<string>();
    for (const entry of entries) {
      const key = `${entry.employeeId}:${entry.date}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('auto-fills X shift for weekly off days', () => {
    const employeesWithOff: Employee[] = employees.map((e, idx) => ({
      ...e,
      weeklyOffDay: idx % 7,
    }));
    const month = new Date('2026-06-01');
    const { entries } = generateSmartSchedule({
      month,
      employees: employeesWithOff,
      shiftTypes,
      shuffleEmployees: false,
    });

    const xEntries = entries.filter((e) => e.shiftTypeId === 'st-x');
    expect(xEntries.length).toBeGreaterThan(0);
  });

  it('skips dates with existing approved entries', () => {
    const month = new Date('2026-06-01');
    const existing = [
      {
        id: 's1', employeeId: 'e1', date: '2026-06-01', shiftTypeId: 'st-morning',
        status: 'approved' as const, requestType: 'shift_change' as const,
      },
    ];
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      existingEntries: existing,
      shuffleEmployees: false,
    });

    const e1OnDay1 = entries.filter(
      (e) => e.employeeId === 'e1' && e.date === '2026-06-01',
    );
    expect(e1OnDay1.length).toBe(0);
  });
});
