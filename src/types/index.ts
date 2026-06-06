export type UserRole = 'employee' | 'manager' | 'admin';

export type Position = {
  id: string;
  code: string;
  name: string;
  minRequired: number;
};

export type ShiftType = {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  requiresApproval: boolean;
  requiresReason: boolean;
  requiresEvidence: boolean;
  isVisible: boolean;
  isLeave?: boolean;
  targetStaff?: number;
  category?: 'morning' | 'afternoon' | 'other';
};

export type PositionGroup = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  positionId: string;
  groupId?: string;
  role: UserRole;
  phone?: string;
  email?: string;
  avatar?: string;
  weeklyOffDay?: number;
  mustChangePassword?: boolean;
};


export type ScheduleStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';
export type RequestType = 'leave' | 'swap' | 'shift_change' | 'late_scan' | 'off_request';
export type CreatedBy = 'employee' | 'manager' | 'system';

export type ScheduleEntry = {
  id: string;
  employeeId: string;
  date: string; // ISO string YYYY-MM-DD
  shiftTypeId: string;
  status: ScheduleStatus;
  requestType: RequestType;
  createdBy?: CreatedBy;
  employeeNote?: string;
  managerRemark?: string;
  swapWithId?: string;
  evidenceUrl?: string;
  revertShiftTypeId?: string;
};

// ScheduleRequest is now an alias of ScheduleEntry: the schedules table is
// the single source of truth for both published shifts and pending requests.
export type ScheduleRequest = ScheduleEntry;

export type MonthlyCoverage = {
  date: string;
  counts: Record<string, number>; // shiftCode -> count
  isShortage: boolean;
};
export type AppSettings = {
  storeName: string;
  appName: string;
  allowEmployeeSetShifts: boolean;
};
