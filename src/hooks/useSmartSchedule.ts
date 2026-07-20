// Wraps the smart-schedule generator with the pre-checks and toast
// reporting that used to live inline in App.tsx.
import { useCallback } from 'react';
import { format, subMonths } from 'date-fns';
import { generateSmartSchedule as runSmartSchedule } from '../lib/schedule-generator';
import { useToast } from '../lib/toast';
import type { Employee, PositionGroup, ScheduleEntry, ShiftType } from '../types';

interface SmartScheduleDeps {
  employees: Employee[];
  shiftTypes: ShiftType[];
  positionGroups: PositionGroup[];
  schedules: ScheduleEntry[];
  currentMonth: Date;
  createSchedulesBulk: (entries: ScheduleEntry[]) => Promise<{ inserted: number; failed: number }>;
  refresh: (silent?: boolean) => Promise<void>;
}

export function useSmartSchedule({
  employees,
  shiftTypes,
  positionGroups,
  schedules,
  currentMonth,
  createSchedulesBulk,
  refresh,
}: SmartScheduleDeps) {
  const toast = useToast();

  const generateSmartSchedule = useCallback(async () => {
    if (employees.length === 0) {
      toast.warning('ไม่มีพนักงาน', 'กรุณาเพิ่มพนักงานก่อนรัน AI');
      return;
    }
    const xShift = shiftTypes.find((t) => t.code === 'X');
    if (!xShift) {
      toast.error('ไม่พบประเภทกะ X', 'กรุณาสร้างกะ X (กะหยุด) ก่อนรัน AI');
      return;
    }
    const targetShifts = shiftTypes.filter((t) => (t.targetStaff || 0) > 0);
    if (targetShifts.length === 0) {
      toast.warning(
        'ไม่มีกะที่ตั้งเป้าไว้',
        'ไปที่ "ตั้งค่า → ประเภทกะ" แล้วตั้งค่า target_staff (> 0) ให้กะที่ต้องการจัด'
      );
      return;
    }

    const { entries, warnings } = runSmartSchedule({
      month: currentMonth,
      employees,
      shiftTypes,
      positionGroups,
      existingEntries: schedules,
      // Use ALL approved entries of the previous month (manual edits and
      // template shifts included) so rotation detection reflects what people
      // actually worked instead of falling back to random.
      prevMonthSchedules: schedules.filter(
        (s) =>
          s.date.startsWith(format(subMonths(currentMonth, 1), 'yyyy-MM')) &&
          s.status === 'approved',
      ),
    });

    if (entries.length === 0) {
      console.warn('[generateSmartSchedule] no entries — shiftTypes:', shiftTypes);
      toast.error(
        'ไม่สามารถจัดตารางได้',
        'ตรวจสอบว่าพนักงานมี position_id และไม่ขัดกับกะดึก-เช้า'
      );
      return;
    }

    let failed: number;
    try {
      const result = await createSchedulesBulk(entries);
      failed = result.failed;
    } catch (err) {
      console.error('[generateSmartSchedule] bulk insert failed:', err);
      failed = entries.length;
    }
    await refresh();
    if (warnings.length > 0) {
      console.warn('[generateSmartSchedule] warnings:', warnings);
    }
    if (failed > 0) {
      toast.warning(
        `จัดตารางสำเร็จ ${entries.length - failed} รายการ`,
        `มี ${failed} รายการล้มเหลว (ดู Console)`
      );
    } else {
      toast.success(
        `จัดตารางอัตโนมัติสำเร็จ ${entries.length} รายการ`,
        'ระบบได้ตรวจสอบเงื่อนไขกะดึก-เช้าเรียบร้อยแล้ว'
      );
    }
  }, [employees, shiftTypes, positionGroups, schedules, currentMonth, createSchedulesBulk, refresh, toast]);

  return { generateSmartSchedule };
}
