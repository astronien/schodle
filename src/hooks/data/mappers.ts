// Row → domain mappers shared by fetchers, refreshers and the offline-cache
// fallback. Keeping them in one place means the snake_case → camelCase
// translation exists exactly once per table.
import type {
  Employee,
  Position,
  PositionGroup,
  RecurringSchedule,
  ScheduleEntry,
  ShiftType,
} from '../../types';

export type ScheduleRow = {
  id: string;
  employee_id: string;
  date: string;
  shift_type_id: string;
  status: ScheduleEntry['status'];
  request_type: ScheduleEntry['requestType'];
  created_by: string | null;
  employee_note: string | null;
  manager_remark: string | null;
  swap_with_id: string | null;
  evidence_url: string | null;
  revert_shift_type_id: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapScheduleRow(row: ScheduleRow): ScheduleEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    shiftTypeId: row.shift_type_id,
    status: row.status,
    requestType: row.request_type,
    createdBy: (row.created_by as ScheduleEntry['createdBy']) || undefined,
    employeeNote: row.employee_note || undefined,
    managerRemark: row.manager_remark || undefined,
    swapWithId: row.swap_with_id || undefined,
    evidenceUrl: row.evidence_url || undefined,
    revertShiftTypeId: row.revert_shift_type_id || undefined,
  };
}

export function mapEmployeeRow(e: any): Employee {
  return {
    id: e.id,
    employeeCode: e.employee_code,
    fullName: e.full_name,
    positionId: e.position_id,
    groupId: e.group_id || undefined,
    role: e.role as Employee['role'],
    phone: e.phone || undefined,
    email: e.email || undefined,
    avatar: e.avatar || undefined,
    weeklyOffDay: typeof e.weekly_off_day === 'number' ? e.weekly_off_day : undefined,
  };
}

export function mapPositionRow(p: any): Position {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    minRequired: p.min_required,
  };
}

export function mapPositionGroupRow(g: any): PositionGroup {
  return {
    id: g.id,
    name: g.name,
    enforceBalance: g.enforce_balance ?? false,
  };
}

export function mapShiftTypeRow(s: any): ShiftType {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    startTime: s.start_time,
    endTime: s.end_time,
    color: s.color,
    requiresApproval: s.requires_approval,
    requiresReason: s.requires_reason,
    requiresEvidence: s.requires_evidence,
    isVisible: s.is_visible,
    isLeave: s.is_leave ?? false,
    targetStaff: s.target_staff || undefined,
    category: (s.category as ShiftType['category']) || undefined,
    annualQuota: s.annual_quota || undefined,
    preserveOnClear: s.preserve_on_clear ?? false,
    groupTargets: (s.group_targets && typeof s.group_targets === 'object')
      ? (s.group_targets as Record<string, number>)
      : {},
  };
}

export function mapRecurringRow(r: any): RecurringSchedule {
  return {
    id: r.id,
    employeeId: r.employee_id,
    shiftTypeId: r.shift_type_id,
    daysOfWeek: r.days_of_week,
    startDate: r.start_date,
    endDate: r.end_date || undefined,
    isActive: r.is_active,
    note: r.note || undefined,
    createdBy: r.created_by || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Domain → row for schedules (used by upsert/bulk insert). */
export function scheduleEntryToRow(e: ScheduleEntry) {
  return {
    id: e.id,
    employee_id: e.employeeId,
    date: e.date,
    shift_type_id: e.shiftTypeId,
    status: e.status,
    request_type: e.requestType,
    created_by: e.createdBy || null,
    employee_note: e.employeeNote || null,
    manager_remark: e.managerRemark || null,
    swap_with_id: e.swapWithId || null,
    evidence_url: e.evidenceUrl || null,
    revert_shift_type_id: e.revertShiftTypeId || null,
  };
}
