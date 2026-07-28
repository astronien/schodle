import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

import type { Employee, PositionGroup, ScheduleEntry, ShiftType } from '../types';
import {
  DEFAULT_LATE_SHIFT_CODES,
  DEFAULT_EARLY_SHIFT_CODES,
  BALANCE_TOLERANCE,
  MAX_ITERATIONS_PER_DAY_MULTIPLIER,
  MAX_ITERATIONS_PER_DAY_BASE,
  MAX_OFF_CATEGORY_DAYS_PER_WEEK,
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
  positionGroups?: PositionGroup[];
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

  // Find the first Monday that falls INSIDE the previous month.
  const prevMonthStart = startOfMonth(subMonths(currentMonth, 1));
  let firstMondayOfPrev = getMondayOfWeek(prevMonthStart);
  if (firstMondayOfPrev < prevMonthStart) {
    firstMondayOfPrev = addDays(firstMondayOfPrev, 7);
  }

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
  positionGroups,
}: SmartScheduleOptions): SmartScheduleResult {
  const warnings: string[] = [];
  const idFactory = newId ?? (() => crypto.randomUUID());
  const hasAnyTarget = (t: ShiftType) =>
    (t.targetStaff || 0) > 0 ||
    Object.values(t.groupTargets ?? {}).some((n) => (n || 0) > 0);
  const targetShiftTypes = shiftTypes.filter(hasAnyTarget);
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

  const enforceBalanceGroupMembers = new Map<string, Set<string>>();
  if (positionGroups) {
    const enforceGroups = positionGroups.filter((g) => g.enforceBalance);
    for (const group of enforceGroups) {
      const members = employees.filter((e) => e.groupId === group.id).map((e) => e.id);
      enforceBalanceGroupMembers.set(group.id, new Set(members));
    }
  }

  const entries: SmartScheduleDraft[] = [];

  // Fairness: track total shifts assigned per employee in the month so we
  // prefer employees with fewer assignments. This prevents one person from
  // getting all the shifts while others sit idle.
  const monthlyAssignedCount = new Map<string, number>();
  for (const e of employees) monthlyAssignedCount.set(e.id, 0);
  const monthPrefix = format(month, 'yyyy-MM');
  for (const entry of existingEntries) {
    if (entry.status === 'approved' && entry.date.startsWith(monthPrefix)) {
      monthlyAssignedCount.set(
        entry.employeeId,
        (monthlyAssignedCount.get(entry.employeeId) || 0) + 1,
      );
    }
  }

  // ── Scheduling groups ──────────────────────────────────────────
  // Each position group (พนักงานขาย, หัวหน้า, support…) is scheduled on its
  // own: its own headcount targets and its own candidate pool, so roles are
  // never substituted for one another.
  //
  // Shift types can carry per-group targets. If none are configured anywhere
  // we fall back to the previous behaviour — one store-wide pool using
  // targetStaff — so existing setups keep working until targets are entered.
  const usesGroupTargets = targetShiftTypes.some(
    (t) => t.groupTargets && Object.keys(t.groupTargets).length > 0,
  );

  type ScheduleGroup = { id: string | null; name: string; employees: Employee[] };
  const scheduleGroups: ScheduleGroup[] = [];
  if (usesGroupTargets) {
    const known = positionGroups ?? [];
    for (const g of known) {
      const members = employees.filter((e) => e.groupId === g.id);
      if (members.length > 0) scheduleGroups.push({ id: g.id, name: g.name, employees: members });
    }
    const ungrouped = employees.filter(
      (e) => !e.groupId || !known.some((g) => g.id === e.groupId),
    );
    if (ungrouped.length > 0) {
      scheduleGroups.push({ id: null, name: 'ไม่ได้อยู่กลุ่ม', employees: ungrouped });
    }
  } else {
    scheduleGroups.push({ id: null, name: 'ทั้งร้าน', employees: [...employees] });
  }

  const groupIdOfEmployee = (emp: Employee): string | null => {
    if (!usesGroupTargets) return null;
    const known = positionGroups ?? [];
    return emp.groupId && known.some((g) => g.id === emp.groupId) ? emp.groupId : null;
  };

  /** How many of the people already on this shift belong to the given group. */
  const countInGroup = (assigned: Set<string> | undefined, groupId: string | null): number => {
    if (!assigned) return 0;
    if (!usesGroupTargets) return assigned.size;
    let n = 0;
    for (const id of assigned) {
      const emp = employees.find((e) => e.id === id);
      if (emp && groupIdOfEmployee(emp) === groupId) n += 1;
    }
    return n;
  };

  /** Headcount this shift needs from this group on a single day. */
  const targetFor = (shiftType: ShiftType, groupId: string | null): number => {
    if (!usesGroupTargets) return shiftType.targetStaff || 0;
    if (groupId === null) return 0; // ungrouped staff have no configured demand
    return shiftType.groupTargets?.[groupId] ?? 0;
  };

  // ── Weekly shift blocks ────────────────────────────────────────
  // People can't flip between morning and afternoon day to day — their body
  // clock can't keep up. So each employee is locked to ONE category for the
  // whole week (Mon–Sun) and swaps the following week.
  //
  // Both categories still need covering every day, so the team is split into
  // two stable halves: half work mornings this week while the other half work
  // afternoons, then they trade. Splitting per position keeps each half able
  // to cover the roles a shift needs.
  const rotationGroupOf = new Map<string, 0 | 1>();
  for (const group of scheduleGroups) {
    // Split each scheduling group in half so the group itself always covers
    // both morning and afternoon. Deterministic order so the same roster
    // always yields the same halves — regenerating must not reshuffle who
    // works mornings.
    const ordered = [...group.employees].sort((a, b) => a.id.localeCompare(b.id));
    ordered.forEach((emp, i) => rotationGroupOf.set(emp.id, (i % 2) as 0 | 1));
  }

  /** The category an employee is supposed to work for the week containing `date`. */
  const getWeeklyCategoryFor = (employeeId: string, date: Date): ShiftCategory => {
    const weekIdx = weekIndexFromFirstMonday(date, firstMondayOfMonth);
    const group = rotationGroupOf.get(employeeId) ?? 0;
    // Group 0 starts on rotationStart; group 1 starts opposite. Every week
    // both groups flip, so each person alternates week to week.
    const startsOnRotation = group === 0;
    const flipped = weekIdx % 2 === 1;
    return startsOnRotation !== flipped ? rotationStart : opposite(rotationStart);
  };

  // Off-category budget: an employee may be pulled onto the other category at
  // most this many days per week, and only when a shift would otherwise go
  // unfilled. Keeps "the week is mostly my shift" true even when short-staffed.
  const offCategoryDaysThisWeek = new Map<string, number>();
  const offCategoryKey = (employeeId: string, date: Date) =>
    `${employeeId}:${weekIndexFromFirstMonday(date, firstMondayOfMonth)}`;
  const offCategoryUsed = (employeeId: string, date: Date) =>
    offCategoryDaysThisWeek.get(offCategoryKey(employeeId, date)) ?? 0;
  const canGoOffCategory = (employeeId: string, date: Date) =>
    offCategoryUsed(employeeId, date) < MAX_OFF_CATEGORY_DAYS_PER_WEEK;
  const recordOffCategory = (employeeId: string, date: Date) => {
    const key = offCategoryKey(employeeId, date);
    offCategoryDaysThisWeek.set(key, (offCategoryDaysThisWeek.get(key) ?? 0) + 1);
  };

  /** Is this shift the employee's assigned category for the week? */
  const matchesWeeklyCategory = (
    employeeId: string,
    date: Date,
    category: ShiftCategory,
  ): boolean => {
    if (category !== 'morning' && category !== 'afternoon') return true;
    return getWeeklyCategoryFor(employeeId, date) === category;
  };

  for (let dayIdx = 0; dayIdx < days.length; dayIdx += 1) {
    const day = days[dayIdx];
    const dateStr = format(day, 'yyyy-MM-dd');
    const assignedThisDay = new Set<string>();

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

    // Each position group is scheduled independently: its own staffing
    // targets, its own candidate pool, its own morning/afternoon balance.
    // A supervisor must never be used to fill a sales slot.
    for (const group of scheduleGroups) {
      const groupEmployees = group.employees;
      if (groupEmployees.length === 0) continue;
      const shuffledEmployees = shuffleEmployees
        ? [...groupEmployees].sort(() => Math.random() - 0.5)
        : [...groupEmployees];

      const remainingByType = new Map<string, number>(
        targetShiftTypes.map((t) => [t.id, targetFor(t, group.id)]),
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
        const nextShiftTypeForGroup = shiftTypes.find((t) => t.id === shiftTypeId);
        const nextCategory = (nextShiftTypeForGroup?.category || 'other') as ShiftCategory;
        if (nextCategory !== 'other') {
          for (const [, memberIds] of enforceBalanceGroupMembers.entries()) {
            if (memberIds.has(employeeId)) {
              for (const otherId of memberIds) {
                if (otherId === employeeId) continue;
                if (!assignedThisDay.has(otherId)) continue;
                const otherEntry = entries.find(
                  (e) => e.employeeId === otherId && e.date === dateStr
                );
                if (!otherEntry) continue;
                const otherShiftType = shiftTypes.find((t) => t.id === otherEntry.shiftTypeId);
                const otherCategory = otherShiftType?.category || 'other';
                if (otherCategory !== 'other' && otherCategory === nextCategory) {
                  return false;
                }
              }
            }
          }
        }
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
        /** Allow pulling someone onto the opposite category (spends budget). */
        allowOffCategory = false,
      ): boolean => {
        const shiftType = shiftTypes.find((t) => t.id === shiftTypeId);
        if (!shiftType) return false;
        const category = (shiftType.category || 'other') as ShiftCategory;

        const sortedCandidates = [...candidates].sort((a, b) => {
          // When breaking the weekly block, hurt the person who has been pulled
          // off their shift the least so far this week — spreads the pain.
          if (allowOffCategory) {
            const offA = offCategoryUsed(a.id, day);
            const offB = offCategoryUsed(b.id, day);
            if (offA !== offB) return offA - offB;
          }
          // Then by workload: employees with fewer assignments get priority.
          const countA = monthlyAssignedCount.get(a.id) || 0;
          const countB = monthlyAssignedCount.get(b.id) || 0;
          return countA - countB;
        });

        for (const employee of sortedCandidates) {
          if (!canAssignEmployeeToShift(employee.id, shiftTypeId, lateEarly)) continue;

          const offCategory = !matchesWeeklyCategory(employee.id, day, category);
          // The weekly block is a rule, not a preference: only break it when the
          // caller explicitly allows it and the person still has budget left.
          if (offCategory && (!allowOffCategory || !canGoOffCategory(employee.id, day))) {
            continue;
          }

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
          if (offCategory) recordOffCategory(employee.id, day);
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
        /** Last resort: permit crossing the weekly block to avoid an empty shift. */
        allowOffCategory = false,
      ): boolean => {
        const preferredPos = getPreferredPosition(shiftType.id);

        // Candidate pool: filter by position preference if we have one AND caller
        // wants strict position matching.
        const positionFiltered = requirePositionMatch && preferredPos
          ? shuffledEmployees.filter((e) => e.positionId === preferredPos)
          : shuffledEmployees;
        const pool = positionFiltered.length > 0 ? positionFiltered : shuffledEmployees;

        // tryAssignFrom enforces the weekly category itself, so a single pass
        // over the full pool is enough — no more silent "anyone will do" retry.
        return tryAssignFrom(pool, shiftType.id, lateEarly, allowOffCategory);
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

      // Tier 3: still short — start breaking weekly shift blocks, spending each
      // person's off-category budget. Done before relaxing the late→early rest
      // rule: working the wrong half of the day is inconvenient, working with too
      // little rest is a safety issue.
      let offCategoryWarnCount = 0;
      for (const shiftType of targetShiftTypes) {
        const remaining = remainingByType.get(shiftType.id) || 0;
        if (remaining <= 0) continue;
        for (let i = 0; i < remaining; i += 1) {
          const filled = tryFillShift(shiftType, 'strict', false, true);
          if (!filled) break;
          if (offCategoryWarnCount < 3) {
            warnings.push(
              `${dateStr}: กะ ${shiftType.code} ต้องดึงคนจากกะประจำสัปดาห์อีกฝั่ง (คนไม่พอ)`,
            );
            offCategoryWarnCount += 1;
          }
        }
      }

      // Tier 4: warn-only — allow late→early if it would otherwise leave a shift
      // empty. Cap warnings at 3/day.
      let warnCount = 0;
      for (const shiftType of targetShiftTypes) {
        const remaining = remainingByType.get(shiftType.id) || 0;
        if (remaining <= 0) continue;
        for (let i = 0; i < remaining; i += 1) {
          const filled = tryFillShift(shiftType, 'off', false, true);
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
      //
      // This phase only tops up spare capacity, so it must never break the
      // weekly block — only shifts matching the employee's category for the
      // week are eligible. Leaving someone idle is better than bouncing them
      // between mornings and afternoons.
      const empGroupId = groupIdOfEmployee(emp);
      const eligible = targetShiftTypes.filter((st) =>
        matchesWeeklyCategory(emp.id, day, (st.category || 'other') as ShiftCategory),
      );

      // Build candidate shifts. "Below target" is measured against this
      // employee's own group, counting only their group-mates — topping up
      // sales must not be satisfied by supervisors already on the shift.
      const belowTarget: ShiftType[] = [];
      for (const st of eligible) {
        const current = countInGroup(dayCounts.get(st.id), empGroupId);
        const target = targetFor(st, empGroupId);
        if (current < target) belowTarget.push(st);
      }

      let chosen: ShiftType | null = null;

      if (belowTarget.length > 0) {
        // Fill below-target first
        chosen = belowTarget[0];
      } else {
        // All targets met → balance: pick shift with fewest current people
        const sorted = [...eligible].sort((a, b) => {
          const ca = countInGroup(dayCounts.get(a.id), empGroupId);
          const cb = countInGroup(dayCounts.get(b.id), empGroupId);
          return ca - cb;
        });
        chosen = sorted[0] ?? null;
      }

      if (!chosen) continue;
      // Skip if employee already has this shift today (shouldn't happen)
      if (dayCounts.get(chosen.id)?.has(emp.id)) continue;
      // Group balance check
      const nextShiftTypeForGroup = shiftTypes.find((t) => t.id === chosen.id);
      const nextCategory = (nextShiftTypeForGroup?.category || 'other') as ShiftCategory;
      if (nextCategory !== 'other') {
        let groupConflict = false;
        for (const [, memberIds] of enforceBalanceGroupMembers.entries()) {
          if (!memberIds.has(emp.id)) continue;
          for (const otherId of memberIds) {
            if (otherId === emp.id) continue;
            if (!assignedThisDay.has(otherId)) continue;
            const otherEntry = entries.find(
              (e) => e.employeeId === otherId && e.date === dateStr
            );
            if (!otherEntry) continue;
            const otherShiftType = shiftTypes.find((t) => t.id === otherEntry.shiftTypeId);
            const otherCategory = otherShiftType?.category || 'other';
            if (otherCategory !== 'other' && otherCategory === nextCategory) {
              groupConflict = true;
              break;
            }
          }
          if (groupConflict) break;
        }
        if (groupConflict) continue;
      }
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
