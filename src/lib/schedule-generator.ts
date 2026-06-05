import { addDays, differenceInCalendarWeeks, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';

import type { Employee, ScheduleEntry, ShiftType } from '../types';

const DEFAULT_LATE_CODES = ['XC', 'EV', 'A2'];
const DEFAULT_EARLY_CODES = ['M1', 'M2'];

export type SmartScheduleDraft = Omit<ScheduleEntry, 'status' | 'requestType'> & {
  status: ScheduleEntry['status'];
  requestType: ScheduleEntry['requestType'];
};

export type SmartScheduleResult = {
  entries: SmartScheduleDraft[];
  warnings: string[];
};

export type SmartScheduleOptions = {
  month: Date;
  employees: Employee[];
  shiftTypes: ShiftType[];
  lateCodes?: string[];
  earlyCodes?: string[];
  /** Existing entries for the month — used to avoid duplicate assignments. */
  existingEntries?: ScheduleEntry[];
  /** Generate a new id for each draft. Defaults to crypto.randomUUID. */
  newId?: () => string;
  /** Shuffle employees each day — defaults to true. Disable for deterministic tests. */
  shuffleEmployees?: boolean;
};

type ShiftCategory = 'morning' | 'afternoon' | 'other';

export function generateSmartSchedule({
  month,
  employees,
  shiftTypes,
  lateCodes = DEFAULT_LATE_CODES,
  earlyCodes = DEFAULT_EARLY_CODES,
  existingEntries = [],
  newId,
  shuffleEmployees = true,
}: SmartScheduleOptions): SmartScheduleResult {
  const warnings: string[] = [];
  const idFactory = newId ?? (() => crypto.randomUUID());
  const targetShiftTypes = shiftTypes.filter((t) => (t.targetStaff || 0) > 0);
  const xShift = shiftTypes.find((t) => t.code === 'X');

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const monthStart = startOfMonth(month);
  const employeeOrder = [...employees]
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const existingByEmployeeDate = new Map<string, ScheduleEntry>();
  for (const entry of existingEntries) {
    existingByEmployeeDate.set(`${entry.employeeId}:${entry.date}`, entry);
  }

  const entries: SmartScheduleDraft[] = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx += 1) {
    const day = days[dayIdx];
    const dateStr = format(day, 'yyyy-MM-dd');
    const assignedThisDay = new Set<string>();
    const shuffledEmployees = shuffleEmployees
      ? [...employees].sort(() => Math.random() - 0.5)
      : [...employees];

    for (const emp of employees) {
      if (typeof emp.weeklyOffDay !== 'number') continue;
      if (new Date(`${dateStr}T00:00:00`).getDay() !== emp.weeklyOffDay) continue;
      if (!xShift) {
        warnings.push(`พนักงาน ${emp.fullName}: ไม่พบประเภทกะ X`);
        continue;
      }
      const key = `${emp.id}:${dateStr}`;
      if (existingByEmployeeDate.has(key)) continue;
      entries.push({
        id: idFactory(),
        employeeId: emp.id,
        shiftTypeId: xShift.id,
        date: dateStr,
        status: 'approved',
        requestType: 'shift_change',
      });
      assignedThisDay.add(emp.id);
    }

    const weekIndex = differenceInCalendarWeeks(day, monthStart, { weekStartsOn: 1 });

    const getWeeklyPreferred = (employeeId: string): ShiftCategory => {
      const emp = employees.find((e) => e.id === employeeId);
      if (!emp) return 'morning';
      const groupKey = emp.groupId || emp.positionId;
      const groupMembers = employeeOrder.filter((e) => (e.groupId || e.positionId) === groupKey);
      const idxInGroup = groupMembers.findIndex((e) => e.id === employeeId);
      const base: ShiftCategory = idxInGroup % 2 === 0 ? 'morning' : 'afternoon';
      return weekIndex % 2 === 0 ? base : base === 'morning' ? 'afternoon' : 'morning';
    };

    const remainingByType = new Map<string, number>(
      targetShiftTypes.map((t) => [t.id, t.targetStaff || 0]),
    );
    const retryByType = new Map<string, number>();

    let assignedMorningSlots = 0;
    let assignedAfternoonSlots = 0;

    const getRemainingSlots = (category: ShiftCategory) =>
      targetShiftTypes
        .filter((t) => (t.category || 'other') === category)
        .reduce((sum, t) => sum + (remainingByType.get(t.id) || 0), 0);

    const canAssignEmployeeToShift = (employeeId: string, shiftTypeId: string) => {
      if (assignedThisDay.has(employeeId)) return false;
      const existingKey = `${employeeId}:${dateStr}`;
      if (existingByEmployeeDate.has(existingKey)) return false;
      if (dayIdx === 0) return true;
      const yesterday = format(addDays(day, -1), 'yyyy-MM-dd');
      const yesterdayShift = entries.find(
        (e) => e.employeeId === employeeId && e.date === yesterday,
      );
      if (!yesterdayShift) {
        const existingYesterday = existingEntries.find(
          (e) => e.employeeId === employeeId && e.date === yesterday,
        );
        if (!existingYesterday) return true;
        const yesterdayShiftType = shiftTypes.find((t) => t.id === existingYesterday.shiftTypeId);
        const nextShiftType = shiftTypes.find((t) => t.id === shiftTypeId);
        if (!yesterdayShiftType || !nextShiftType) return true;
        if (
          lateCodes.includes(yesterdayShiftType.code) &&
          earlyCodes.includes(nextShiftType.code)
        ) {
          return false;
        }
        return true;
      }
      const yesterdayShiftType = shiftTypes.find((t) => t.id === yesterdayShift.shiftTypeId);
      const nextShiftType = shiftTypes.find((t) => t.id === shiftTypeId);
      if (!yesterdayShiftType || !nextShiftType) return true;
      if (
        lateCodes.includes(yesterdayShiftType.code) &&
        earlyCodes.includes(nextShiftType.code)
      ) {
        return false;
      }
      return true;
    };

    let iterations = 0;
    const MAX_ITERATIONS = targetShiftTypes.length * 8 + 10;

    while (iterations < MAX_ITERATIONS) {
      iterations += 1;
      const remainingTotal = Array.from(remainingByType.values()).reduce((s, n) => s + n, 0);
      if (remainingTotal <= 0) break;

      const remainingMorning = getRemainingSlots('morning');
      const remainingAfternoon = getRemainingSlots('afternoon');

      let desiredCategory: ShiftCategory = 'other';
      if (remainingMorning > 0 || remainingAfternoon > 0) {
        if (remainingMorning > 0 && remainingAfternoon > 0) {
          if (assignedMorningSlots - assignedAfternoonSlots >= 1) desiredCategory = 'afternoon';
          else if (assignedAfternoonSlots - assignedMorningSlots >= 1) desiredCategory = 'morning';
          else desiredCategory = remainingMorning >= remainingAfternoon ? 'morning' : 'afternoon';
        } else {
          desiredCategory = remainingMorning > 0 ? 'morning' : 'afternoon';
        }
      }

      let candidates = targetShiftTypes.filter((t) => (remainingByType.get(t.id) || 0) > 0);
      const filteredByCategory = candidates.filter(
        (t) => (t.category || 'other') === desiredCategory,
      );
      if (filteredByCategory.length > 0) candidates = filteredByCategory;
      candidates.sort((a, b) => (remainingByType.get(b.id) || 0) - (remainingByType.get(a.id) || 0));
      const shiftType = candidates[0];
      if (!shiftType) break;

      const shiftCategory = (shiftType.category || 'other') as ShiftCategory;

      let assigned = false;
      const tryAssignFrom = (candidates: Employee[]) => {
        for (const employee of candidates) {
          if (!canAssignEmployeeToShift(employee.id, shiftType.id)) continue;
          entries.push({
            id: idFactory(),
            employeeId: employee.id,
            shiftTypeId: shiftType.id,
            date: dateStr,
            status: 'approved',
            requestType: 'shift_change',
          });
          assignedThisDay.add(employee.id);
          remainingByType.set(shiftType.id, (remainingByType.get(shiftType.id) || 0) - 1);

          if (shiftType.category === 'morning') assignedMorningSlots += 1;
          if (shiftType.category === 'afternoon') assignedAfternoonSlots += 1;

          assigned = true;
          return;
        }
      };

      if (shiftCategory === 'morning' || shiftCategory === 'afternoon') {
        const preferred = shuffledEmployees.filter(
          (e) => getWeeklyPreferred(e.id) === shiftCategory,
        );
        tryAssignFrom(preferred);
      } else {
        tryAssignFrom(shuffledEmployees);
      }

      if (!assigned) {
        retryByType.set(shiftType.id, remainingByType.get(shiftType.id) || 0);
        remainingByType.set(shiftType.id, 0);
      }
    }

    for (const shiftType of targetShiftTypes) {
      let remaining = retryByType.get(shiftType.id) || 0;
      if (remaining <= 0) continue;
      for (const employee of shuffledEmployees) {
        if (remaining <= 0) break;
        if (!canAssignEmployeeToShift(employee.id, shiftType.id)) continue;
        entries.push({
          id: idFactory(),
          employeeId: employee.id,
          shiftTypeId: shiftType.id,
          date: dateStr,
          status: 'approved',
          requestType: 'shift_change',
        });
        assignedThisDay.add(employee.id);
        remaining -= 1;
      }
    }
  }

  return { entries, warnings };
}
