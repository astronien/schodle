import { addDays, format } from 'date-fns';
import type { Employee, ScheduleEntry, ShiftType } from '../types';

export type ConflictSeverity = 'error' | 'warning' | 'info';

export type Conflict = {
  type: 'late_to_early' | 'weekly_off' | 'staffing_shortage' | 'staffing_over' | 'imbalance' | 'double_shift';
  severity: ConflictSeverity;
  message: string;
  date: string;
  employeeId?: string;
  employeeName?: string;
};

function getShiftTypeByEntry(entry: ScheduleEntry, shiftTypes: ShiftType[]): ShiftType | undefined {
  return shiftTypes.find((t) => t.id === entry.shiftTypeId);
}

/**
 * ตรวจสอบว่ากะ昨天 (late) → วันนี้ (early) ขัดแย้งกันไหม
 */
function checkLateToEarlyConflicts(
  schedules: ScheduleEntry[],
  employees: Employee[],
  shiftTypes: ShiftType[],
  lateCodes: string[],
  earlyCodes: string[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const approved = schedules.filter((s) => s.status === 'approved');

  for (const entry of approved) {
    const shiftType = getShiftTypeByEntry(entry, shiftTypes);
    if (!shiftType) continue;

    const date = new Date(`${entry.date}T00:00:00`);
    const yesterday = format(addDays(date, -1), 'yyyy-MM-dd');
    const prevEntry = approved.find(
      (s) => s.employeeId === entry.employeeId && s.date === yesterday,
    );
    if (!prevEntry) continue;

    const prevShift = getShiftTypeByEntry(prevEntry, shiftTypes);
    if (!prevShift) continue;

    const emp = employees.find((e) => e.id === entry.employeeId);
    if (
      lateCodes.includes(prevShift.code) &&
      earlyCodes.includes(shiftType.code)
    ) {
      conflicts.push({
        type: 'late_to_early',
        severity: 'error',
        date: entry.date,
        employeeId: entry.employeeId,
        employeeName: emp?.fullName,
        message: `พนักงาน${emp?.fullName ? ' ' + emp.fullName : ''} มีกะ${prevShift.code} (${prevShift.name}) เมื่อวาน → ${shiftType.code} (${shiftType.name}) วันนี้ (ขัดกฎดึก→เช้า)`,
      });
    }
  }

  return conflicts;
}

/**
 * ตรวจสอบว่า employee ถูก assign ในวันที่เป็น weekly off day
 */
function checkWeeklyOffConflicts(
  schedules: ScheduleEntry[],
  employees: Employee[],
  shiftTypes: ShiftType[],
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const entry of schedules) {
    if (entry.status !== 'approved') continue;
    const emp = employees.find((e) => e.id === entry.employeeId);
    if (typeof emp?.weeklyOffDay !== 'number') continue;

    const dayOfWeek = new Date(`${entry.date}T00:00:00`).getDay();
    if (dayOfWeek === emp.weeklyOffDay) {
      const shiftType = getShiftTypeByEntry(entry, shiftTypes);
      if (shiftType && shiftType.code !== 'X') {
        conflicts.push({
          type: 'weekly_off',
          severity: 'warning',
          date: entry.date,
          employeeId: entry.employeeId,
          employeeName: emp.fullName,
          message: `พนักงาน${emp.fullName} ถูกจัดกะ${shiftType.code} ในวันหยุดประจำสัปดาห์ (ควรเป็นกะ X)`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * ตรวจสอบว่าจำนวนพนักงานในแต่ละกะต่ำกว่า target หรือเกิน target
 */
function checkStaffingConflicts(
  schedules: ScheduleEntry[],
  shiftTypes: ShiftType[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const approved = schedules.filter((s) => s.status === 'approved');
  const dates = [...new Set(approved.map((s) => s.date))].sort();

  for (const date of dates) {
    const daily = approved.filter((s) => s.date === date);

    for (const st of shiftTypes) {
      if (!st.targetStaff || st.targetStaff <= 0) continue;
      const count = new Set(
        daily.filter((s) => s.shiftTypeId === st.id).map((s) => s.employeeId),
      ).size;
      const target = st.targetStaff;

      if (count < target) {
        conflicts.push({
          type: 'staffing_shortage',
          severity: 'error',
          date,
          message: `วันที่ ${date} กะ ${st.code} (${st.name}) ขาด ${target - count} คน (มี ${count}/${target})`,
        });
      } else if (count > target * 1.5) {
        conflicts.push({
          type: 'staffing_over',
          severity: 'warning',
          date,
          message: `วันที่ ${date} กะ ${st.code} (${st.name}) เกินเป้ามาก (มี ${count}/${target})`,
        });
      }
    }

    // Check morning/afternoon imbalance
    const morningCount = new Set(
      daily
        .filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'morning')
        .map((s) => s.employeeId),
    ).size;
    const afternoonCount = new Set(
      daily
        .filter((s) => shiftTypes.find((t) => t.id === s.shiftTypeId)?.category === 'afternoon')
        .map((s) => s.employeeId),
    ).size;
    if (Math.abs(morningCount - afternoonCount) > 1) {
      conflicts.push({
        type: 'imbalance',
        severity: 'warning',
        date,
        message: `วันที่ ${date} สมดุลเช้า-บ่ายไม่ดี (เช้า ${morningCount} / บ่าย ${afternoonCount})`,
      });
    }
  }

  return conflicts;
}

/**
 * ตรวจสอบการขัดแย้งทั้งหมด
 */
export function validateAllConflicts(
  schedules: ScheduleEntry[],
  employees: Employee[],
  shiftTypes: ShiftType[],
  lateCodes: string[] = ['XC', 'EV', 'A2'],
  earlyCodes: string[] = ['M1', 'M2'],
): Conflict[] {
  return [
    ...checkLateToEarlyConflicts(schedules, employees, shiftTypes, lateCodes, earlyCodes),
    ...checkWeeklyOffConflicts(schedules, employees, shiftTypes),
    ...checkStaffingConflicts(schedules, shiftTypes),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * ตรวจสอบว่าการ assign shift นี้จะมี conflict หรือไม่ (ใช้ตอนกำลังจะ assign)
 */
export function validateAssignShift(
  employeeId: string,
  date: string,
  shiftTypeId: string,
  schedules: ScheduleEntry[],
  employees: Employee[],
  shiftTypes: ShiftType[],
): Conflict[] {
  const conflicts: Conflict[] = [];
  const emp = employees.find((e) => e.id === employeeId);
  const shiftType = shiftTypes.find((t) => t.id === shiftTypeId);
  if (!shiftType) return conflicts;

  // Weekly off day check
  if (typeof emp?.weeklyOffDay === 'number') {
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    if (dayOfWeek === emp.weeklyOffDay && shiftType.code !== 'X') {
      conflicts.push({
        type: 'weekly_off',
        severity: 'warning',
        date,
        employeeId,
        employeeName: emp?.fullName,
        message: `วันนี้เป็นวันหยุดประจำสัปดาห์ของ${emp?.fullName} ควรเลือกกะ X แทน`,
      });
    }
  }

  // Late → early check
  const yesterday = format(addDays(new Date(`${date}T00:00:00`), -1), 'yyyy-MM-dd');
  const prevEntry = schedules.find(
    (s) => s.employeeId === employeeId && s.date === yesterday && s.status === 'approved',
  );
  if (prevEntry) {
    const prevShift = shiftTypes.find((t) => t.id === prevEntry.shiftTypeId);
    if (prevShift && ['XC', 'EV', 'A2'].includes(prevShift.code) && ['M1', 'M2'].includes(shiftType.code)) {
      conflicts.push({
        type: 'late_to_early',
        severity: 'error',
        date,
        employeeId,
        employeeName: emp?.fullName,
        message: `กะ${prevShift.code} (เมื่อวาน) → ${shiftType.code} (วันนี้) ขัดกฎดึก→เช้า`,
      });
    }
  }

  // Staffing check
  const daily = schedules.filter((s) => s.date === date && s.status === 'approved');
  const targetShifts = shiftTypes.filter((t) => t.targetStaff && t.targetStaff > 0);
  for (const st of targetShifts) {
    const count = new Set(
      [...daily, { employeeId, shiftTypeId: st.id === shiftTypeId ? shiftTypeId : undefined }]
        .filter((s) => s.shiftTypeId === st.id)
        .map((s) => s.employeeId),
    ).size;
    const target = st.targetStaff || 0;
    if (st.id === shiftTypeId && count > target) {
      conflicts.push({
        type: 'staffing_over',
        severity: 'warning',
        date,
        message: `กะ ${st.code} จะเกินเป้า (มี ${count - 1}/${target} จัดเพิ่มจะกลายเป็น ${count}/${target})`,
      });
    }
  }

  return conflicts;
}