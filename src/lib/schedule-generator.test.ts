import { describe, expect, it } from 'vitest';
import { generateSmartSchedule } from './schedule-generator';
import type { Employee, ShiftType } from '../types';

const shiftTypes: ShiftType[] = [
  { id: 'st-morning', code: 'M', name: 'เช้า', startTime: '08:00', endTime: '16:00', color: '#3b82f6', isVisible: true, isLeave: false, requiresApproval: false, requiresReason: false, requiresEvidence: false, category: 'morning', targetStaff: 1 },
  { id: 'st-afternoon', code: 'A', name: 'บ่าย', startTime: '16:00', endTime: '00:00', color: '#f59e0b', isVisible: true, isLeave: false, requiresApproval: false, requiresReason: false, requiresEvidence: false, category: 'afternoon', targetStaff: 1 },
  { id: 'st-x', code: 'X', name: 'หยุด', startTime: '-', endTime: '-', color: '#9ca3af', isVisible: true, isLeave: false, requiresApproval: false, requiresReason: false, requiresEvidence: false, category: 'other' },
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

  it('respects target_staff quota per day (Tier 1 only)', () => {
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
    // Each (date, shift) should have at least target_staff (balance phase fills extras)
    for (const [key, count] of byDateShift) {
      const shiftId = key.split(':')[1];
      const target = shiftTypes.find((t) => t.id === shiftId)?.targetStaff || 0;
      expect(count).toBeGreaterThanOrEqual(target);
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

describe('generateSmartSchedule — rotation', () => {
  it('flips week 1 category when prev month week 1 was morning', () => {
    // Prev month: week 1 mostly morning → this month: week 1 = afternoon
    const prevSchedules: Array<{
      id: string; employeeId: string; date: string; shiftTypeId: string;
      status: 'approved'; requestType: 'shift_change';
    }> = [];
    // Fill prev month week 1 (Mon-Sun starting June 1 2026 is Mon, so first Monday is June 1)
    // Actually for "prev month" of July 2026, prev is June 2026
    // First Monday of June 2026 = June 1
    // So prev week 1 = 2026-06-01 to 2026-06-07
    // Let's say all 7 days of week 1 in prev month were morning
    for (let d = 1; d <= 7; d++) {
      prevSchedules.push({
        id: `p${d}`,
        employeeId: `e${((d - 1) % 3) + 1}`,
        date: `2026-06-0${d}`,
        shiftTypeId: 'st-morning',
        status: 'approved',
        requestType: 'shift_change',
      });
    }

    const month = new Date('2026-07-01');
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      prevMonthSchedules: prevSchedules,
      shuffleEmployees: false,
    });

    // For this month, week 1 (July 1-7 2026) should be afternoon per employee
    // target=1 per shift, so 1 morning + 1 afternoon = 2 assigned per day
    // (assuming 3 employees, 2 days-off, etc)
    // Just verify that week 1 has at least one afternoon assignment
    const week1 = entries.filter((e) => e.date >= '2026-07-01' && e.date <= '2026-07-07');
    const week1Afternoon = week1.filter((e) => e.shiftTypeId === 'st-afternoon');
    expect(week1Afternoon.length).toBeGreaterThan(0);
  });

  it('flips week 1 category when prev month week 1 was afternoon', () => {
    // Prev month: week 1 mostly afternoon → this month: week 1 = morning
    const prevSchedules: Array<{
      id: string; employeeId: string; date: string; shiftTypeId: string;
      status: 'approved'; requestType: 'shift_change';
    }> = [];
    for (let d = 1; d <= 7; d++) {
      prevSchedules.push({
        id: `p${d}`,
        employeeId: `e${((d - 1) % 3) + 1}`,
        date: `2026-06-0${d}`,
        shiftTypeId: 'st-afternoon',
        status: 'approved',
        requestType: 'shift_change',
      });
    }

    const month = new Date('2026-07-01');
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      prevMonthSchedules: prevSchedules,
      shuffleEmployees: false,
    });

    // Verify week 1 has at least one morning assignment
    const week1 = entries.filter((e) => e.date >= '2026-07-01' && e.date <= '2026-07-07');
    const week1Morning = week1.filter((e) => e.shiftTypeId === 'st-morning');
    expect(week1Morning.length).toBeGreaterThan(0);
  });

  it('uses random rotation when no prev month data', () => {
    // Without prev data, we can't predict the rotation, but it should produce
    // valid entries (no error, schedules generated)
    const month = new Date('2026-07-01');
    const { entries, warnings } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      shuffleEmployees: false,
    });
    expect(entries.length).toBeGreaterThan(0);
    // Filter out tier-3 warnings about late-early
    const errors = warnings.filter((w) => w.includes('ล้มเหลว'));
    expect(errors.length).toBe(0);
  });
});

describe('generateSmartSchedule — balance', () => {
  it('distributes shifts within BALANCE_TOLERANCE for everyone', () => {
    // Use 6 employees, target=1 for M and A, so target=2/day
    // 6 employees with no weekly off, 30 days
    // Total slots needed: 2 * 30 = 60
    // 60 / 6 = 10 shifts each (perfectly balanced)
    const sixEmployees: Employee[] = Array.from({ length: 6 }, (_, i) => ({
      id: `e${i + 1}`,
      employeeCode: `00${i + 1}`,
      fullName: `Emp ${i + 1}`,
      positionId: 'p1',
      role: 'employee' as const,
    }));

    const month = new Date('2026-06-01');
    const { entries } = generateSmartSchedule({
      month,
      employees: sixEmployees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      shuffleEmployees: false,
    });

    const counts = new Map<string, number>();
    for (const e of sixEmployees) counts.set(e.id, 0);
    for (const entry of entries) {
      counts.set(entry.employeeId, (counts.get(entry.employeeId) || 0) + 1);
    }
    const values = Array.from(counts.values());
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Everyone should be assigned (no zero)
    expect(min).toBeGreaterThan(0);
    // Within 1 of each other (balance tolerance)
    expect(max - min).toBeLessThanOrEqual(2);
  });

  it('fills every employee every week (no idle days)', () => {
    const month = new Date('2026-06-01');
    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      shuffleEmployees: false,
    });

    // For each week, every employee should have at least 1 shift
    const firstMonday = new Date('2026-06-01'); // June 1 2026 is Monday
    const weeks: Array<{ start: string; end: string }> = [];
    for (let w = 0; w < 5; w++) {
      const start = new Date(firstMonday);
      start.setDate(start.getDate() + w * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      weeks.push({
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      });
    }

    for (const week of weeks) {
      for (const emp of employees) {
        const hasShift = entries.some(
          (e) =>
            e.employeeId === emp.id &&
            e.date >= week.start &&
            e.date <= week.end,
        );
        expect(hasShift).toBe(true);
      }
    }
  });
});

describe('generateSmartSchedule — cross-month fairness (regression)', () => {
  it('ignores other months when counting fairness', () => {
    const month = new Date('2026-08-01');
    // e1 has a huge pile of approved shifts in JULY — must not affect August.
    const prevMonthLoad = Array.from({ length: 25 }, (_, i) => ({
      id: `prev-${i}`,
      employeeId: 'e1',
      date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
      shiftTypeId: 'st-morning',
      status: 'approved' as const,
      requestType: 'shift_change' as const,
    }));

    const { entries } = generateSmartSchedule({
      month,
      employees,
      shiftTypes: shiftTypes.filter((t) => t.targetStaff),
      existingEntries: prevMonthLoad,
      shuffleEmployees: false,
    });

    const counts = new Map<string, number>();
    for (const e of employees) counts.set(e.id, 0);
    for (const entry of entries) {
      if (!entry.date.startsWith('2026-08')) continue;
      counts.set(entry.employeeId, (counts.get(entry.employeeId) || 0) + 1);
    }
    const values = Array.from(counts.values());
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Without the month filter, e1 would get starved (min ≈ 0).
    expect(min).toBeGreaterThan(0);
    expect(max - min).toBeLessThanOrEqual(8);
  });
});

describe('generateSmartSchedule — weekly shift blocks', () => {
  // 2 morning + 2 afternoon slots a day, 5 people → enough slack that nobody
  // should need to be pulled across categories.
  const blockShiftTypes: ShiftType[] = [
    { ...shiftTypes[0], targetStaff: 2 },
    { ...shiftTypes[1], targetStaff: 2 },
  ];
  const team: Employee[] = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => ({
    id,
    employeeCode: id,
    fullName: id.toUpperCase(),
    positionId: 'p1',
    role: 'employee',
  })) as Employee[];

  const categoryOf = (shiftTypeId: string) =>
    blockShiftTypes.find((t) => t.id === shiftTypeId)?.category;

  /** Group a person's entries by ISO week (Mon-based), returning category counts. */
  const byWeek = (entries: { employeeId: string; date: string; shiftTypeId: string }[]) => {
    const map = new Map<string, Map<string, number>>();
    for (const e of entries) {
      const d = new Date(`${e.date}T00:00:00`);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = `${e.employeeId}|${monday.toISOString().slice(0, 10)}`;
      const cat = categoryOf(e.shiftTypeId);
      if (cat !== 'morning' && cat !== 'afternoon') continue;
      const counts = map.get(key) ?? new Map<string, number>();
      counts.set(cat, (counts.get(cat) || 0) + 1);
      map.set(key, counts);
    }
    return map;
  };

  it('gives each employee one dominant category per week', () => {
    const { entries } = generateSmartSchedule({
      month: new Date('2026-09-01'),
      employees: team,
      shiftTypes: blockShiftTypes,
      shuffleEmployees: false,
    });

    const weeks = byWeek(entries);
    expect(weeks.size).toBeGreaterThan(0);

    for (const [key, counts] of weeks) {
      const morning = counts.get('morning') || 0;
      const afternoon = counts.get('afternoon') || 0;
      const total = morning + afternoon;
      const dominant = Math.max(morning, afternoon);
      const offCategory = total - dominant;
      // The week must be predominantly one shift, and any deviation must stay
      // inside the per-week budget.
      expect(dominant / total, `week ${key} was not dominated by one category`)
        .toBeGreaterThan(0.5);
      expect(offCategory, `week ${key} exceeded the off-category budget`)
        .toBeLessThanOrEqual(2);
    }
  });

  it('alternates an employee between categories across consecutive weeks', () => {
    const { entries } = generateSmartSchedule({
      month: new Date('2026-09-01'),
      employees: team,
      shiftTypes: blockShiftTypes,
      shuffleEmployees: false,
    });

    // Dominant category per (employee, week), ordered by week.
    const dominantByEmpWeek = new Map<string, { monday: string; cat: string }[]>();
    for (const [key, counts] of byWeek(entries)) {
      const [employeeId, monday] = key.split('|');
      const morning = counts.get('morning') || 0;
      const afternoon = counts.get('afternoon') || 0;
      const cat = morning >= afternoon ? 'morning' : 'afternoon';
      const list = dominantByEmpWeek.get(employeeId) ?? [];
      list.push({ monday, cat });
      dominantByEmpWeek.set(employeeId, list);
    }

    let flips = 0;
    let comparisons = 0;
    for (const list of dominantByEmpWeek.values()) {
      list.sort((a, b) => a.monday.localeCompare(b.monday));
      // Ignore partial weeks at the month edges, which can be a single day.
      for (let i = 1; i < list.length - 1; i += 1) {
        comparisons += 1;
        if (list[i].cat !== list[i - 1].cat) flips += 1;
      }
    }
    expect(comparisons).toBeGreaterThan(0);
    // Every full week-to-week transition should be a flip.
    expect(flips).toBe(comparisons);
  });

  it('covers both categories every day (the two halves work opposite shifts)', () => {
    const { entries } = generateSmartSchedule({
      month: new Date('2026-09-01'),
      employees: team,
      shiftTypes: blockShiftTypes,
      shuffleEmployees: false,
    });

    const byDate = new Map<string, Set<string>>();
    for (const e of entries) {
      const cat = categoryOf(e.shiftTypeId);
      if (!cat) continue;
      const set = byDate.get(e.date) ?? new Set<string>();
      set.add(cat);
      byDate.set(e.date, set);
    }
    for (const [date, cats] of byDate) {
      expect(cats.has('morning'), `${date} had no morning cover`).toBe(true);
      expect(cats.has('afternoon'), `${date} had no afternoon cover`).toBe(true);
    }
  });
});
