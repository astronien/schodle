import type { Employee, ScheduleEntry, ShiftType, ScheduleRequest } from '../types';

export function isScheduleRequest(entry: ScheduleEntry | ScheduleRequest): entry is ScheduleRequest {
  return Boolean(
    (entry as ScheduleRequest).requestType ||
      entry.status === 'pending' ||
      entry.status === 'submitted'
  );
}

export function getRequestTypeLabel(request?: ScheduleRequest) {
  switch (request?.requestType) {
    case 'leave':
      return 'ลา';
    case 'swap':
      return 'สลับกะ';
    case 'shift_change':
      return 'เปลี่ยนกะ';
    case 'late_scan':
      return 'มาสาย/ลืมแสกน';
    case 'off_request':
      return 'ขอหยุด';
    default:
      return 'คำขอ';
  }
}

export type EmployeeLookupMaps = {
  employeeById: Map<string, Employee>;
  shiftTypeById: Map<string, ShiftType>;
};

export function createEmployeeLookupMaps(
  employees: Employee[],
  shiftTypes: ShiftType[]
): EmployeeLookupMaps {
  return {
    employeeById: new Map(employees.map((employee) => [employee.id, employee])),
    shiftTypeById: new Map(shiftTypes.map((shiftType) => [shiftType.id, shiftType])),
  };
}

export function createPositionLookupMap(positions: { id: string; code?: string; name?: string }[]) {
  return new Map(positions.map((position) => [position.id, position]));
}

export function filterPendingRequests(entries: Array<ScheduleEntry | ScheduleRequest>) {
  return entries.filter(isScheduleRequest);
}

export function getScheduleStatusCounts(entries: ScheduleEntry[]) {
  return entries.reduce(
    (acc, entry) => {
      acc[entry.status] += 1;
      return acc;
    },
    {
      draft: 0,
      submitted: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    } satisfies Record<ScheduleEntry['status'], number>
  );
}

export function getEmployeeMonthlyStats(
  employeeId: string,
  monthSchedules: ScheduleEntry[],
  shiftTypes: ShiftType[]
) {
  const empSchedules = monthSchedules.filter((schedule) => schedule.employeeId === employeeId);
  const counts: Record<string, number> = {};
  let workDays = 0;
  let pendingCount = 0;
  let swapCount = 0;
  let lateCount = 0;

  empSchedules.forEach((schedule) => {
    const shiftType = shiftTypes.find((type) => type.id === schedule.shiftTypeId);
    const code = shiftType?.code || schedule.shiftTypeId;

    if (schedule.status === 'pending') pendingCount += 1;
    if (schedule.swapWithId) swapCount += 1;
    if (schedule.employeeNote?.includes('มาสาย') || schedule.employeeNote?.includes('ลืมแสกน')) lateCount += 1;

    if (['XC', 'V'].includes(code) || shiftType?.requiresReason || shiftType?.requiresEvidence) {
      counts[code] = (counts[code] || 0) + 1;
    } else if (schedule.status === 'approved') {
      workDays += 1;
    }
  });

  return { counts, workDays, pendingCount, swapCount, lateCount };
}

export function getCoverageLookup(
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
  date: string
) {
  const dailySchedules = schedules.filter((schedule) => schedule.date === date && schedule.status === 'approved');
  const totalCount = new Set(dailySchedules.map((schedule) => schedule.employeeId)).size;

  const categoryCounts = {
    morning: new Set(
      dailySchedules
        .filter((schedule) => shiftTypes.find((type) => type.id === schedule.shiftTypeId)?.category === 'morning')
        .map((schedule) => schedule.employeeId)
    ).size,
    afternoon: new Set(
      dailySchedules
        .filter((schedule) => shiftTypes.find((type) => type.id === schedule.shiftTypeId)?.category === 'afternoon')
        .map((schedule) => schedule.employeeId)
    ).size,
  };

  return {
    dailySchedules,
    totalCount,
    morningCount: categoryCounts.morning,
    afternoonCount: categoryCounts.afternoon,
    isImbalanced: Math.abs(categoryCounts.morning - categoryCounts.afternoon) > 1,
  };
}
