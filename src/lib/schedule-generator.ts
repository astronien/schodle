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
  /** Existing entries for the month — used to avoid duplicate assignments,
   *  skip approved leave days, and learn position→shift preferences. */
  existingEntries?: ScheduleEntry[];
  /** Generate a new id for each draft. Defaults to crypto.randomUUID. */
  newId?: () => string;
  /** Shuffle employees each day — defaults to true. Disable for deterministic tests. */
  shuffleEmployees?: boolean;
};

type ShiftCategory = 'morning' | 'afternoon' | 'other';

/** How strictly the late→early rest rule is enforced. */
type LateEarlyStrictness = 'strict' | 'relaxed' | 'off';

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

  // Approved leaves: skip assigning these employees on these dates.
  const leaveByEmployeeDate = new Set<string>();
  for (const entry of existingEntries) {
    if (entry.requestType === 'leave' && entry.status === 'approved') {
      leaveByEmployeeDate.add(`${entry.employeeId}:${entry.date}`);
    }
  }

  // Learn position preferences: for each shift type, which position has been
  // assigned the most historically? We use that position to prioritize candidates
  // when filling that shift.
  const positionCountByShiftType = new Map<string, Map<string, number>>();
  for (const entry of existingEntries) {
    if (entry.status !== 'approved') continue;
    const emp = employees.find((e) => e.id === entry.employeeId);
    if (!emp?.positionId) continue;
    const counts = positionCountByShiftType.get(entry.shiftTypeId) ?? new Map<string, number>();
    counts.set(emp.positionId, (counts.get(emp.positionId) ?? 0) + 1);
    positionCountByShiftType.set(entry.shiftTypeId, counts);
  }
  const getPreferredPosition = (shiftTypeId: string): string | null => {
    const counts = positionCountByShiftType.get(shiftTypeId);
    if (!counts || counts.size === 0) return null;
    let best: string | null = null;
    let bestCount = 0;
    for (const [pos, count] of counts) {
      if (count > bestCount) {
        best = pos;
        bestCount = count;
      }
    }
    return best;
  };

  const entries: SmartScheduleDraft[] = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx += 1) {
    const day = days[dayIdx];
    const dateStr = format(day, 'yyyy-MM-dd');
    const assignedThisDay = new Set<string>();
    const shuffledEmployees = shuffleEmployees
      ? [...employees].sort(() => Math.random() - 0.5)
      : [...employees];

    // Auto-fill weekly off days with X shift.
    for (const emp of employees) {
      if (typeof emp.weeklyOffDay !== 'number') continue;
      if (new Date(`${dateStr}T00:00:00`).getDay() !== emp.weeklyOffDay) continue;
      const key = `${emp.id}:${dateStr}`;
      if (existingByEmployeeDate.has(key)) continue;
      if (leaveByEmployeeDate.has(key)) continue;
      if (!xShift) {
        warnings.push(`พนักงาน ${emp.fullName}: ไม่พบประเภทกะ X`);
        continue;
      }
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

    let assignedMorningSlots = 0;
    let assignedAfternoonSlots = 0;

    const getRemainingSlots = (category: ShiftCategory) =>
      targetShiftTypes
        .filter((t) => (t.category || 'other') === category)
        .reduce((sum, t) => sum + (remainingByType.get(t.id) || 0), 0);

    const canAssignEmployeeToShift = (
      employeeId: string,
      shiftTypeId: string,
      lateEarly: LateEarlyStrictness,
    ): boolean => {
      if (assignedThisDay.has(employeeId)) return false;
      const existingKey = `${employeeId}:${dateStr}`;
      if (existingByEmployeeDate.has(existingKey)) return false;
      if (leaveByEmployeeDate.has(existingKey)) return false;
      if (dayIdx === 0) return true;
      if (lateEarly === 'off') return true;
      const yesterday = format(addDays(day, -1), 'yyyy-MM-dd');
      const yesterdayShift = entries.find(
        (e) => e.employeeId === employeeId && e.date === yesterday,
      );
      let yesterdayShiftType: ShiftType | undefined;
      if (yesterdayShift) {
        yesterdayShiftType = shiftTypes.find((t) => t.id === yesterdayShift.shiftTypeId);
      } else {
        const existingYesterday = existingEntries.find(
          (e) => e.employeeId === employeeId && e.date === yesterday,
        );
        if (existingYesterday) {
          yesterdayShiftType = shiftTypes.find((t) => t.id === existingYesterday.shiftTypeId);
        } else if (lateEarly === 'relaxed') {
          return true;
        }
      }
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

    const tryAssignFrom = (
      candidates: Employee[],
      shiftTypeId: string,
      lateEarly: LateEarlyStrictness,
    ): boolean => {
      for (const employee of candidates) {
        if (!canAssignEmployeeToShift(employee.id, shiftTypeId, lateEarly)) continue;
        const shiftType = shiftTypes.find((t) => t.id === shiftTypeId);
        if (!shiftType) return false;
        entries.push({
          id: idFactory(),
          employeeId: employee.id,
          shiftTypeId: shiftType.id,
          date: dateStr,
          status: 'approved',
          requestType: 'shift_change',
        });
        assignedThisDay.add(employee.id);
        remainingByType.set(shiftTypeId, (remainingByType.get(shiftTypeId) || 0) - 1);
        if (shiftType.category === 'morning') assignedMorningSlots += 1;
        if (shiftType.category === 'afternoon') assignedAfternoonSlots += 1;
        return true;
      }
      return false;
    };

    const tryFillShift = (
      shiftType: ShiftType,
      lateEarly: LateEarlyStrictness,
      requirePositionMatch: boolean,
    ): boolean => {
      const shiftCategory = (shiftType.category || 'other') as ShiftCategory;
      const preferredPos = getPreferredPosition(shiftType.id);

      // Candidate pool: filter by position preference if we have one AND caller
      // wants strict position matching.
      const positionFiltered = requirePositionMatch && preferredPos
        ? shuffledEmployees.filter((e) => e.positionId === preferredPos)
        : shuffledEmployees;
      const pool = positionFiltered.length > 0 ? positionFiltered : shuffledEmployees;

      if (shiftCategory === 'morning' || shiftCategory === 'afternoon') {
        const preferred = pool.filter(
          (e) => getWeeklyPreferred(e.id) === shiftCategory,
        );
        if (tryAssignFrom(preferred, shiftType.id, lateEarly)) return true;
        return tryAssignFrom(pool, shiftType.id, lateEarly);
      }
      return tryAssignFrom(pool, shiftType.id, lateEarly);
    };

    let iterations = 0;
    const MAX_ITERATIONS = targetShiftTypes.length * 8 + 10;

    // Tier 1: strict — respect all rules including position preference.
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

      const filled = tryFillShift(shiftType, 'strict', true);
      if (!filled) {
        // Mark the day's remaining quota for this shift as zero so we move on.
        remainingByType.set(shiftType.id, 0);
      }
    }

    // Tier 2: relaxed — for shifts that still have remaining quota, try again
    // ignoring the position preference (so understaffed shifts get filled even
    // if no one from the "right" position is free).
    for (const shiftType of targetShiftTypes) {
      const remaining = remainingByType.get(shiftType.id) || 0;
      if (remaining <= 0) continue;
      for (let i = 0; i < remaining; i += 1) {
        const filled = tryFillShift(shiftType, 'strict', false);
        if (!filled) break;
      }
    }

    // Tier 3: warn-only — allow late→early if it would otherwise leave a shift
    // empty. We cap how many such warnings we emit per day to avoid log spam.
    let warnCount = 0;
    for (const shiftType of targetShiftTypes) {
      const remaining = remainingByType.get(shiftType.id) || 0;
      if (remaining <= 0) continue;
      for (let i = 0; i < remaining; i += 1) {
        const filled = tryFillShift(shiftType, 'off', false);
        if (filled && warnCount < 3) {
          warnings.push(
            `${dateStr}: กะ ${shiftType.code} ต้องจัดแบบละเมิดกฎดึก→เช้า (ไม่มีคนเหลือ)`,
          );
          warnCount += 1;
        } else if (!filled) {
          break;
        }
      }
    }
  }

  return { entries, warnings };
}
