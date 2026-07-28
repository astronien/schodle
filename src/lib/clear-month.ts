// Helper for "ล้างตารางเดือนนี้".
//
// Shift types flagged preserveOnClear (weekly off days, AT shifts, office
// shifts…) are kept so managers don't have to re-enter fixed assignments
// every month. Only *approved* entries are preserved — a pending request
// on a preserved shift type is still cleared along with the rest.
//
// This returns an explicit list of ids to delete rather than expressing the
// rule as a "not in" database filter: a mis-sent filter would delete the
// preserved rows too, whereas an explicit list can only ever delete less.
import type { ScheduleEntry, ShiftType } from '../types';

interface SelectSchedulesToClearArgs {
  /** Month to clear, as 'yyyy-MM'. */
  monthPrefix: string;
  schedules: ScheduleEntry[];
  shiftTypes: ShiftType[];
}

export interface ClearMonthPlan {
  /** Schedule ids that should be deleted. */
  idsToDelete: string[];
  /** How many entries are being kept (for the confirmation message). */
  preservedCount: number;
  /** Codes of the shift types being kept, for display. */
  preservedCodes: string[];
}

export function planClearMonth({
  monthPrefix,
  schedules,
  shiftTypes,
}: SelectSchedulesToClearArgs): ClearMonthPlan {
  const preservedTypeIds = new Set(
    shiftTypes.filter((t) => t.preserveOnClear).map((t) => t.id),
  );

  const idsToDelete: string[] = [];
  const preservedCodesUsed = new Set<string>();
  let preservedCount = 0;

  for (const entry of schedules) {
    if (!entry.date.startsWith(monthPrefix)) continue;

    const isPreserved = entry.status === 'approved' && preservedTypeIds.has(entry.shiftTypeId);
    if (isPreserved) {
      preservedCount += 1;
      const code = shiftTypes.find((t) => t.id === entry.shiftTypeId)?.code;
      if (code) preservedCodesUsed.add(code);
      continue;
    }
    idsToDelete.push(entry.id);
  }

  return {
    idsToDelete,
    preservedCount,
    preservedCodes: [...preservedCodesUsed].sort(),
  };
}
