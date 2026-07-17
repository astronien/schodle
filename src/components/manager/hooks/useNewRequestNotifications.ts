// Fires a browser Notification when a new pending request appears while the
// manager dashboard is open. Extracted from ManagerDashboard.tsx.
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import type { Employee, ScheduleEntry, ShiftType } from '../../../types';

export function useNewRequestNotifications(
  schedules: ScheduleEntry[],
  employees: Employee[],
  shiftTypes: ShiftType[],
) {
  const prevPendingIds = useRef<Set<string>>(
    new Set(schedules.filter((s) => s.status === 'pending').map((s) => s.id)),
  );

  useEffect(() => {
    const currentPendingIds = new Set(schedules.filter((s) => s.status === 'pending').map((s) => s.id));
    const newRequests = schedules.filter(
      (s) => s.status === 'pending' && !prevPendingIds.current.has(s.id)
    );
    if (newRequests.length > 0 && Notification.permission === 'granted') {
      newRequests.forEach((req) => {
        const employee = employees.find((e) => e.id === req.employeeId);
        const shiftType = shiftTypes.find((t) => t.id === req.shiftTypeId);
        new Notification('มีคำขอใหม่จากพนักงาน', {
          body: `${employee?.fullName || 'พนักงาน'} ขอ${shiftType?.name || 'ลา/หยุด'} วันที่ ${format(new Date(req.date), 'd MMM')}`,
          icon: '/favicon.ico',
        });
      });
    }
    prevPendingIds.current = currentPendingIds;
  }, [schedules, employees, shiftTypes]);
}
