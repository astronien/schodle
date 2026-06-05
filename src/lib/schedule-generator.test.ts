import { describe, expect, it } from 'vitest';
import { generateSmartSchedule, type SmartScheduleResult } from './schedule-generator';
import type { Employee, ShiftType } from '../types';

const SHIFTS: ShiftType[] = [
  {
    id: 'shift-m1',
    code: 'M1',
    name: 'เช้า 1',
    startTime: '07:00',
    endTime: '15:00',
    color: '#3b82f6',
    requiresApproval: false,
    requiresReason: false,
    requiresEvidence: false,
    isVisible: true,
    targetStaff: 2,
    category: 'morning',
  },
  {
    id: 'shift-m2',
    code: 'M2',
    name: 'เช้า 2',
    startTime: '09:00',
    endTime: '17:00',
    color: '#10b981',
    requiresApproval: false,
    requiresReason: false,
    requiresEvidence: false,
    isVisible: true,
    targetStaff: 1,
    category: 'morning',
  },
  {
    id: 'shift-xc',
    code: 'XC',
    name: 'บ่าย',
    startTime: '15:00',
    endTime: '23:00',
    color: '#f59e0b',
    requiresApproval: false,
    requiresReason: false,
    requiresEvidence: false,
    isVisible: true,
    targetStaff: 2,
    category: 'afternoon',
  },
  {
    id: 'shift-x',
    code: 'X',
    name: 'หยุด',
    startTime: '00:00',
    endTime: '00:00',
    color: '#64748b',
    requiresApproval: false,
    requiresReason: false,
    requiresEvidence: false,
    isVisible: true,
    targetStaff: 0,
  },
];

const EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    employeeCode: 'E001',
    fullName: 'สมชาย ใจดี',
    positionId: 'pos-1',
    role: 'employee',
    weeklyOffDay: 0,
  },
  {
    id: 'emp-2',
    employeeCode: 'E002',
    fullName: 'สมหญิง รักดี',
    positionId: 'pos-1',
    role: 'employee',
    weeklyOffDay: 0,
  },
  {
    id: 'emp-3',
    employeeCode: 'E003',
    fullName: 'มานี มีตา',
    positionId: 'pos-1',
    role: 'employee',
    weeklyOffDay: 0,
  },
  {
    id: 'emp-4',
    employeeCode: 'E004',
    fullName: 'มานพ ใจกล้า',
    positionId: 'pos-1',
    role: 'employee',
    weeklyOffDay: 0,
  },
];

let idCounter = 0;
const newId = () => `id-${++idCounter}`;

describe('generateSmartSchedule', () => {
  it('returns a valid structure with entries + warnings', () => {
    const result: SmartScheduleResult = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false,
    });
    expect(result.entries.length).toBeGreaterThan(0);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('assigns X shift on each employee’s weekly off day', () => {
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false,
    });
    const xShift = SHIFTS.find((s) => s.code === 'X')!;
    // emp-1 has off day 0 (Sunday) — January 2025 has Sundays on 5,12,19,26
    const emp1OffEntries = result.entries.filter(
      (e) => e.employeeId === 'emp-1' && e.shiftTypeId === xShift.id,
    );
    const emp1OffDates = emp1OffEntries.map((e) => e.date);
    expect(emp1OffDates).toEqual(['2025-01-05', '2025-01-12', '2025-01-19', '2025-01-26']);
  });

  it('honors targetStaff per shift type', () => {
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false,
    });
    // Pick a non-off day
    const sampleDay = '2025-01-06'; // Monday
    const dayEntries = result.entries.filter((e) => e.date === sampleDay);
    const m1Count = dayEntries.filter((e) => e.shiftTypeId === 'shift-m1').length;
    const m2Count = dayEntries.filter((e) => e.shiftTypeId === 'shift-m2').length;
    const xcCount = dayEntries.filter((e) => e.shiftTypeId === 'shift-xc').length;
    expect(m1Count).toBeLessThanOrEqual(2);
    expect(m2Count).toBeLessThanOrEqual(1);
    expect(xcCount).toBeLessThanOrEqual(2);
  });

  it('produces deterministic output with shuffleEmployees=false', () => {
    const opts = {
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false as const,
    };
    idCounter = 0;
    const a = generateSmartSchedule(opts);
    idCounter = 0;
    const b = generateSmartSchedule(opts);
    expect(a.entries).toEqual(b.entries);
  });

  it('does not assign the same employee to two shifts on the same day', () => {
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false,
    });
    const seen = new Set<string>();
    for (const entry of result.entries) {
      const key = `${entry.employeeId}:${entry.date}`;
      expect(seen.has(key), `duplicate: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('marks every generated entry as approved + shift_change', () => {
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false,
    });
    for (const entry of result.entries) {
      expect(entry.status).toBe('approved');
      expect(entry.requestType).toBe('shift_change');
    }
  });

  it('warns when no X shift is configured for an employee with a weekly off day', () => {
    const noXShifts: ShiftType[] = SHIFTS.filter((s) => s.code !== 'X');
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: noXShifts,
      newId,
      shuffleEmployees: false,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('ไม่พบประเภทกะ X'))).toBe(true);
  });

  it('returns empty entries when employees is empty', () => {
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: [],
      shiftTypes: SHIFTS,
      newId,
      shuffleEmployees: false,
    });
    expect(result.entries).toEqual([]);
  });

  it('skips existing entries to avoid duplicate assignments', () => {
    const existing = [
      {
        id: 'existing-1',
        employeeId: 'emp-1',
        date: '2025-01-06',
        shiftTypeId: 'shift-m1',
        status: 'approved' as const,
        requestType: 'shift_change' as const,
      },
    ];
    const result = generateSmartSchedule({
      month: new Date(2025, 0, 1),
      employees: EMPLOYEES,
      shiftTypes: SHIFTS,
      existingEntries: existing,
      newId,
      shuffleEmployees: false,
    });
    const conflicts = result.entries.filter(
      (e) => e.employeeId === 'emp-1' && e.date === '2025-01-06',
    );
    expect(conflicts).toEqual([]);
  });
});
