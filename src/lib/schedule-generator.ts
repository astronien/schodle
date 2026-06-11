import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns';

import type { Employee, ScheduleEntry, ShiftType } from '../types';
import {
  DEFAULT_LATE_SHIFT_CODES,
  DEFAULT_EARLY_SHIFT_CODES,
  BALANCE_TOLERANCE,
  MAX_ITERATIONS_PER_DAY_MULTIPLIER,
  MAX_ITERATIONS_PER_DAY_BASE,
} from '../config/constants';

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
  /** Schedules from the PREVIOUS month (AI-generated only).
   *  Used to determine the rotation start of this month (morning vs afternoon). */
  prevMonthSchedules?: ScheduleEntry[];
  /** Generate a new id for each draft. Defaults to crypto.randomUUID. */
  newId?: () => string;
  /** Shuffle employees each day — defaults to true. Disable for deterministic tests. */
  shuffleEmployees?: boolean;
};

type ShiftCategory = 'morning' | 'afternoon' | 'other';

/** How strictly the late→early rest rule is enforced. */
type LateEarlyStrictness = 'strict' | 'relaxed' | 'off';

const opposite = (c: ShiftCategory): ShiftCategory =>
  c === 'morning' ? 'afternoon' : c === 'afternoon' ? 'morning' : 'other';

/** Monday of the week containing the given date, snapped to the same month reference. */
function getMondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Week index (0-based) from the first Monday of the month. */
function weekIndexFromFirstMonday(date: Date, firstMonday: Date): number {
  const thisMonday = getMondayOfWeek(date);
  const diffMs = thisMonday.getTime() - firstMonday.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(days / 7));
}

/**
 * Determine the rotation start of this month: which category should week 1 prefer?
 * Logic: look at the PREVIOUS month's week 1 (Mon-Sun). If most shifts were morning,
 * this month's week 1 should be afternoon (and vice versa). If no data, random.
 */
function getRotationStart(
  prevMonthSchedules: ScheduleEntry[],
  currentMonth: Date,
  shiftTypes: ShiftType[],
): ShiftCategory {
  if (prevMonthSchedules.length === 0) {
    return Math.random() < 0.5 ? 'morning' : 'afternoon';
  }

  // Find first Monday of previous month
  const prevMonth = subWeeks(startOfMonth(currentMonth), 4);
  const firstMondayOfPrev = getMondayOfWeek(prevMonth);

  // Filter prev month schedules to week 1 (Mon-Sun starting from firstMondayOfPrev)
  const week1End = addDays(firstMondayOfPrev, 6);
  const week1Schedules = prevMonthSchedules.filter((s) => {
    const d = new Date(`${s.date}T00:00:00`);
    return d >= firstMondayOfPrev && d <= week1End;
  });

  if (week1Schedules.length === 0) {
    // Fallback: try the first 7 days of prev month that have data
    const firstWithData = prevMonthSchedules[0];
    if (!firstWithData) return Math.random() < 0.5 ? 'morning' : 'afternoon';
    const fallbackStart = new Date(`${firstWithData.date}T00:00:00`);
    const fallbackEnd = addDays(fallbackStart, 6);
    const fallback = prevMonthSchedules.filter((s) => {
      const d = new Date(`${s.date}T00:00:00`);
      return d >= fallbackStart && d <= fallbackEnd;
    });
    if (fallback.length === 0) {
      return Math.random() < 0.5 ? 'morning' : 'afternoon';
    }
    return countMajority(fallback, shiftTypes);
  }

  return countMajority(week1Schedules, shiftTypes);
}

function countMajority(
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
): ShiftCategory {
  let morning = 0;
  let afternoon = 0;
  for (const s of schedules) {
    const cat = shiftTypes.find((t) => t.id === s.shiftTypeId)?.category;
    if (cat === 'morning') morning += 1;
    else if (cat === 'afternoon') afternoon += 1;
  }
  if (morning > afternoon) return 'afternoon'; // opposite
  if (afternoon > morning) return 'morning'; // opposite
  return 'morning'; // tie default
}

export function generateSmartSchedule({
  month,
  employees,
  shiftTypes,
  lateCodes = DEFAULT_LATE_SHIFT_CODES,
  earlyCodes = DEFAULT_EARLY_SHIFT_CODES,
  existingEntries = [],
  prevMonthSchedules = [],
  newId,
  shuffleEmployees = true,
}: SmartScheduleOptions): SmartScheduleResult {
  const warnings: string[] = [];
  const idFactory = newId ?? (() => crypto.randomUUID());
  const targetShiftTypes = shiftTypes.filter((t) => (t.targetStaff || 0) > 0);
  const xShift = shiftTypes.find((t) => t.code === 'X');

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const monthStart = startOfMonth(month);
  const firstMondayOfMonth = getMondayOfWeek(monthStart);

  // Determine rotation start of this month (opposite of prev month's week 1)
  const rotationStart = getRotationStart(prevMonthSchedules, month, shiftTypes);

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

  // Fairness: track total shifts assigned per employee in the month so we
  // prefer employees with fewer assignments. This prevents one person from
  // getting all the shifts while others sit idle.
  const monthlyAssignedCount = new Map<string, number>();
  for (const e of employees) monthlyAssignedCount.set(e.id, 0);
  for (const entry of existingEntries) {
    if (entry.status === 'approved') {
      monthlyAssignedCount.set(
        entry.employeeId,
        (monthlyAssignedCount.get(entry.employeeId) || 0) + 1,
      );
    }
  }

  // Compute weekly preferred category per (employee, week) using rotation start.
  // week 0 of this month follows rotationStart; week 1 flips; week 2 flips back; etc.
  // Per-employee offset (based on id parity) gives variety within the same week.
  const getWeeklyPreferredFor = (employeeId: string, date: Date): ShiftCategory => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return rotationStart;
    // Off day → not preferred
    if (typeof emp.weeklyOffDay === 'number' && date.getDay() === emp.weeklyOffDay) {
      return 'other';
    }
    const weekIdx = weekIndexFromFirstMonday(date, firstMondayOfMonth);
    // Employee offset: even id → rotationStart when even week, opposite when odd
    const isEvenId = (parseInt(emp.id.replace(/\D/g, ''), 10) || 0) % 2 === 0;
    const baseCategory: ShiftCategory =
      weekIdx % 2 === 0
        ? isEvenId
          ? rotationStart
          : opposite(rotationStart)
        : isEvenId
          ? opposite(rotationStart)
          : rotationStart;
    return baseCategory;
  };

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
      if (day.getDay() !== emp.weeklyOffDay) continue;
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
        createdBy: 'system',
      });
      assignedThisDay.add(emp.id);
    }

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
      // Sort by workload: employees with fewer assignments get priority.
      const sortedCandidates = [...candidates].sort((a, b) => {
        const countA = monthlyAssignedCount.get(a.id) || 0;
        const countB = monthlyAssignedCount.get(b.id) || 0;
        return countA - countB;
      });
      for (const employee of sortedCandidates) {
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
          createdBy: 'system',
        });
        assignedThisDay.add(employee.id);
        monthlyAssignedCount.set(employee.id, (monthlyAssignedCount.get(employee.id) || 0) + 1);
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
          (e) => getWeeklyPreferredFor(e.id, day) === shiftCategory,
        );
        if (tryAssignFrom(preferred, shiftType.id, lateEarly)) return true;
        return tryAssignFrom(pool, shiftType.id, lateEarly);
      }
      return tryAssignFrom(pool, shiftType.id, lateEarly);
    };

    let iterations = 0;
    const MAX_ITERATIONS = targetShiftTypes.length * MAX_ITERATIONS_PER_DAY_MULTIPLIER + MAX_ITERATIONS_PER_DAY_BASE;

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
    // ignoring the position preference.
    for (const shiftType of targetShiftTypes) {
      const remaining = remainingByType.get(shiftType.id) || 0;
      if (remaining <= 0) continue;
      for (let i = 0; i < remaining; i += 1) {
        const filled = tryFillShift(shiftType, 'strict', false);
        if (!filled) break;
      }
    }

    // Tier 3: warn-only — allow late→early if it would otherwise leave a shift
    // empty. Cap warnings at 3/day.
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

  // ── Phase: BALANCE ─────────────────────────────────────────────
  // After daily target placement, distribute remaining idle employees across
  // shifts so total shifts per employee stays within BALANCE_TOLERANCE.
  // Priority: shifts that haven't hit target yet, then balance across all shifts.
  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const assignedThisDay = new Set(
      entries.filter((e) => e.date === dateStr).map((e) => e.employeeId),
    );

    // Compute current counts by shift for this date
    const dayCounts = new Map<string, Set<string>>();
    for (const e of entries.filter((x) => x.date === dateStr)) {
      const set = dayCounts.get(e.shiftTypeId) ?? new Set<string>();
      set.add(e.employeeId);
      dayCounts.set(e.shiftTypeId, set);
    }

    // How many people are still idle today?
    const idleEmployees = employees.filter((e) => !assignedThisDay.has(e.id));
    if (idleEmployees.length === 0) continue;

    // Keep adding to shifts until everyone is assigned or shifts are full enough
    for (const emp of idleEmployees) {
      // Off day → skip
      if (typeof emp.weeklyOffDay === 'number' && day.getDay() === emp.weeklyOffDay) continue;
      // Already has entry today → skip
      const existingKey = `${emp.id}:${dateStr}`;
      if (existingByEmployeeDate.has(existingKey)) continue;
      if (leaveByEmployeeDate.has(existingKey)) continue;

      // Find a shift for this employee:
      // Priority 1: shifts that haven't hit target yet (fill target first)
      // Priority 2: balance equally — pick shift with fewest current people
      // In both cases, prefer the employee's weekly preferred category
      const empPreferred = getWeeklyPreferredFor(emp.id, day);

      // Build candidate shifts
      const belowTarget: ShiftType[] = [];
      for (const st of targetShiftTypes) {
        const current = dayCounts.get(st.id)?.size || 0;
        const target = st.targetStaff || 0;
        if (current < target) belowTarget.push(st);
      }

      let chosen: ShiftType | null = null;

      if (belowTarget.length > 0) {
        // Fill below-target first, prefer same category as preferred
        const sameCat = belowTarget.filter(
          (s) => (s.category || 'other') === empPreferred,
        );
        chosen = sameCat[0] ?? belowTarget[0];
      } else {
        // All targets met → balance: pick shift with smallest current count
        // Prefer same category as preferred, then fewest people
        const sorted = [...targetShiftTypes].sort((a, b) => {
          const ca = dayCounts.get(a.id)?.size || 0;
          const cb = dayCounts.get(b.id)?.size || 0;
          const aPref = (a.category || 'other') === empPreferred ? -1 : 0;
          const bPref = (b.category || 'other') === empPreferred ? -1 : 0;
          if (aPref !== bPref) return aPref - bPref;
          return ca - cb;
        });
        chosen = sorted[0] ?? null;
      }

      if (!chosen) continue;
      // Skip if employee already has this shift today (shouldn't happen)
      if (dayCounts.get(chosen.id)?.has(emp.id)) continue;
      // Late→early check
      if (!canAssignBalance(emp, day, chosen, entries, existingEntries, shiftTypes, lateCodes, earlyCodes)) continue;

      entries.push({
        id: idFactory(),
        employeeId: emp.id,
        shiftTypeId: chosen.id,
        date: dateStr,
        status: 'approved',
        requestType: 'shift_change',
        createdBy: 'system',
      });
      assignedThisDay.add(emp.id);
      monthlyAssignedCount.set(emp.id, (monthlyAssignedCount.get(emp.id) || 0) + 1);
      const set = dayCounts.get(chosen.id) ?? new Set<string>();
      set.add(emp.id);
      dayCounts.set(chosen.id, set);
    }
  }

  // Check final balance — warn if anyone is too far behind avg
  const counts = Array.from(monthlyAssignedCount.values()).filter((c) => c > 0);
  if (counts.length > 1) {
    const avg = counts.reduce((s, n) => s + n, 0) / counts.length;
    const outliers = employees.filter(
      (e) => Math.abs((monthlyAssignedCount.get(e.id) || 0) - avg) > BALANCE_TOLERANCE + 1,
    );
    if (outliers.length > 0) {
      warnings.push(
        `สมดุลไม่สมบูรณ์: ${outliers.length} คนมีจำนวนกะต่างจากค่าเฉลี่ยมาก`,
      );
    }
  }

  return { entries, warnings };
}

function canAssignBalance(
  emp: Employee,
  day: Date,
  shiftType: ShiftType,
  entries: ScheduleEntry[],
  existingEntries: ScheduleEntry[],
  shiftTypes: ShiftType[],
  lateCodes: string[],
  earlyCodes: string[],
): boolean {
  const yesterday = format(addDays(day, -1), 'yyyy-MM-dd');
  const yesterdayShift =
    entries.find((e) => e.employeeId === emp.id && e.date === yesterday) ??
    existingEntries.find((e) => e.employeeId === emp.id && e.date === yesterday);
  if (!yesterdayShift) return true;
  const yesterdayShiftType = shiftTypes.find((t) => t.id === yesterdayShift.shiftTypeId);
  if (!yesterdayShiftType) return true;
  if (lateCodes.includes(yesterdayShiftType.code) && earlyCodes.includes(shiftType.code)) {
    return false;
  }
  return true;
}
