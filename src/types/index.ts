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
  targetStaff?: number;
  category?: 'morning' | 'afternoon' | 'other';
};

export type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  positionId: string;
  role: UserRole;
  phone?: string;
  email?: string;
  avatar?: string;
};

export type ScheduleStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending';

export type ScheduleEntry = {
  id: string;
  employeeId: string;
  date: string; // ISO string YYYY-MM-DD
  shiftTypeId: string;
  status: ScheduleStatus;
  employeeNote?: string;
  managerRemark?: string;
  swapWithId?: string;
  evidenceUrl?: string;
}
;

export type MonthlyCoverage = {
  date: string;
  counts: Record<string, number>; // shiftCode -> count
  isShortage: boolean;
};
export type AppSettings = {
  storeName: string;
  appName: string;
};
