// Schedule CRUD + bulk operations + swap RPC, extracted from useData.
import { useCallback, useEffect, useRef } from 'react';
import { dbInsert, dbUpsert, dbDelete } from '../../lib/db-query';
import { invokeEdgeFunction } from '../../lib/edge-functions';
import { createEmployeeLookupMaps } from '../../lib/schedule-utils';
import { buildWeeklyOffDayEntries } from '../../lib/weekly-off';
import type { Employee, RecurringSchedule, ScheduleEntry, ShiftType } from '../../types';
import { scheduleEntryToRow } from './mappers';
import type { NotifType } from './usePushNotifier';

interface ScheduleMutationDeps {
  employees: Employee[];
  shiftTypes: ShiftType[];
  schedules: ScheduleEntry[];
  recurringSchedules: RecurringSchedule[];
  refreshSchedules: () => Promise<void>;
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
  sendPush: (employeeId: string, title: string, body: string, url?: string, notifType?: NotifType) => Promise<void>;
  sendPushRole: (role: string, title: string, body: string, url?: string) => Promise<void>;
  recentNotificationRef: React.RefObject<Map<string, number>>;
}

export function useScheduleMutations({
  employees,
  shiftTypes,
  schedules,
  recurringSchedules,
  refreshSchedules,
  setSchedules,
  sendPush,
  sendPushRole,
  recentNotificationRef,
}: ScheduleMutationDeps) {
  const employeeLookupMaps = createEmployeeLookupMaps(employees, shiftTypes);

  const scheduleById = useRef<Map<string, ScheduleEntry>>(new Map());
  useEffect(() => {
    scheduleById.current = new Map(schedules.map((s) => [s.id, s]));
  }, [schedules]);

  const updateSchedule = useCallback(
    async (entry: ScheduleEntry, forceNotify?: boolean, skipWeeklyOffValidation?: boolean) => {
      const emp = employeeLookupMaps.employeeById.get(entry.employeeId);
      if (!skipWeeklyOffValidation) {
        if (typeof emp?.weeklyOffDay === 'number') {
          const day = new Date(`${entry.date}T00:00:00`).getDay();
          if (day === emp.weeklyOffDay) {
            const shiftType = employeeLookupMaps.shiftTypeById.get(entry.shiftTypeId);
            if (shiftType?.code !== 'X') {
              throw new Error(`ไม่สามารถจัดกะวันที่ ${entry.date} ได้ (วันหยุดประจำสัปดาห์)`);
            }
          }
        }
      }

      const oldEntry = scheduleById.current.get(entry.id);

      // Optimistic: reflect the change locally right away; resync from the
      // server on failure.
      setSchedules((prev) => {
        const idx = prev.findIndex((s) => s.id === entry.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = entry;
          return next;
        }
        return [...prev, entry];
      });

      const { error: upsertErr } = await dbUpsert('schedules', {
        ...scheduleEntryToRow(entry),
        updated_at: new Date().toISOString(),
      });

      if (upsertErr) {
        await refreshSchedules(); // revert optimistic state
        throw upsertErr;
      }
      const statusChanged = oldEntry && oldEntry.status !== entry.status;
      const isNewPending = (!oldEntry || oldEntry.status !== 'pending') && entry.status === 'pending';

      if (isNewPending) {
        void sendPushRole(
          'manager',
          'มีคำขอใหม่จากพนักงาน',
          `${emp?.fullName || 'พนักงาน'} ส่งคำขอใหม่ วันที่ ${entry.date}`,
          '/manager/requests',
        );
      }

      if (statusChanged || forceNotify) {
        const title = 'อัปเดตคำขอ';
        let body = '';

        if (entry.status === 'approved') {
          body = forceNotify
            ? `คำขอวันที่ ${entry.date} ได้รับการเปลี่ยนแปลง (สลับกะ)`
            : `คำขอวันที่ ${entry.date} ได้รับการอนุมัติแล้ว`;
        } else if (entry.status === 'rejected') {
          body = `คำขอวันที่ ${entry.date} ไม่ได้รับการอนุมัติ`;
        }

        if (body) {
          const key = `UPDATE:${entry.employeeId}:${entry.date}:${entry.status}:${entry.shiftTypeId}`;
          recentNotificationRef.current.set(key, Date.now());
          void sendPush(entry.employeeId, title, body, '/dashboard', 'approval_status');
        }
      }

      await refreshSchedules();
    },
    [employeeLookupMaps.employeeById, employeeLookupMaps.shiftTypeById, refreshSchedules, setSchedules, sendPush, sendPushRole, recentNotificationRef],
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const removed = scheduleById.current.get(id);
      if (removed) setSchedules((prev) => prev.filter((s) => s.id !== id)); // optimistic
      const { error: delErr } = await dbDelete('schedules', { id });
      if (delErr) {
        await refreshSchedules(); // revert optimistic state
        throw delErr;
      }
      await refreshSchedules();
    },
    [refreshSchedules, setSchedules],
  );

  // Bulk insert for AI-generated schedules. Falls back to per-row insert if
  // the batch insert fails (e.g., one row violates a constraint). Returns
  // counts so the caller can report success/failure.
  const createSchedulesBulk = useCallback(
    async (entries: ScheduleEntry[]): Promise<{ inserted: number; failed: number }> => {
      if (entries.length === 0) return { inserted: 0, failed: 0 };
      const rows = entries.map(scheduleEntryToRow);
      const { error } = await dbInsert('schedules', rows);
      if (!error) {
        await refreshSchedules();
        return { inserted: entries.length, failed: 0 };
      }
      // Fallback: insert one at a time so partial success is possible
      let inserted = 0;
      let failed = 0;
      for (const row of rows) {
        const { error: rowErr } = await dbInsert('schedules', row);
        if (rowErr) failed += 1;
        else inserted += 1;
      }
      await refreshSchedules();
      return { inserted, failed };
    },
    [refreshSchedules],
  );

  // Bulk upsert (single round-trip + single refetch) for callers that need to
  // both create and overwrite rows, e.g. applying weekly off days.
  const upsertSchedulesBulk = useCallback(
    async (entries: ScheduleEntry[]): Promise<void> => {
      if (entries.length === 0) return;
      const rows = entries.map((e) => ({
        ...scheduleEntryToRow(e),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await dbUpsert('schedules', rows);
      if (error) throw error;
      await refreshSchedules();
    },
    [refreshSchedules],
  );

  const deleteSchedulesByMonth = useCallback(
    async (month: Date) => {
      const { format, startOfMonth, endOfMonth } = await import('date-fns');
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
      const { error: delErr } = await dbDelete('schedules', {
        date: { gte: monthStart, lte: monthEnd }
      });
      if (delErr) throw delErr;
      await refreshSchedules();
    },
    [refreshSchedules],
  );

  const deleteSchedulesBeforeDate = useCallback(
    async (beforeDate: string) => {
      const { error: delErr } = await dbDelete('schedules', {
        date: { lt: beforeDate }
      });
      if (delErr) throw delErr;
      await refreshSchedules();
    },
    [refreshSchedules],
  );

  const applyRecurringSchedules = useCallback(
    async (month: Date, employeeIds?: string[]) => {
      const { format, startOfMonth, endOfMonth, eachDayOfInterval } = await import('date-fns');
      const activeRecurring = recurringSchedules.filter((r) => r.isActive);
      const targetEmployees = employeeIds ? activeRecurring.filter((r) => employeeIds.includes(r.employeeId)) : activeRecurring;

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const newEntries: ScheduleEntry[] = [];
      const batchSeen = new Set<string>(); // dedupe when two recurring rows overlap
      const xShift = shiftTypes.find((t) => t.code === 'X');

      for (const recurring of targetEmployees) {
        const shiftType = shiftTypes.find((t) => t.id === recurring.shiftTypeId);
        if (!shiftType) continue;

        for (const day of days) {
          const dayOfWeek = day.getDay();
          if (!recurring.daysOfWeek.includes(dayOfWeek)) continue;

          const dateStr = format(day, 'yyyy-MM-dd');

          // Check if recurring schedule applies to this date
          const startDate = new Date(`${recurring.startDate}T00:00:00`);
          const endDate = recurring.endDate ? new Date(`${recurring.endDate}T23:59:59`) : null;
          if (day < startDate) continue;
          if (endDate && day > endDate) continue;

          // Check if already has schedule
          const batchKey = `${recurring.employeeId}:${dateStr}`;
          if (batchSeen.has(batchKey)) continue;
          const existing = schedules.find((s) => s.employeeId === recurring.employeeId && s.date === dateStr);
          if (existing) continue;

          // Skip if it's weekly off day and shift is not X
          const emp = employees.find((e) => e.id === recurring.employeeId);
          if (typeof emp?.weeklyOffDay === 'number' && dayOfWeek === emp.weeklyOffDay) {
            if (shiftType.code !== 'X' && xShift) {
              // Could auto-assign X shift here if needed
              continue;
            }
          }

          batchSeen.add(batchKey);
          newEntries.push({
            id: crypto.randomUUID(),
            employeeId: recurring.employeeId,
            date: dateStr,
            shiftTypeId: recurring.shiftTypeId,
            status: 'approved',
            requestType: 'shift_change',
            createdBy: 'system',
            employeeNote: recurring.note || 'จากตารางซ้ำ',
          });
        }
      }

      // Carry over preset weekly off days: fill X shifts for the month so
      // off days appear even when the schedule is built from recurring rows.
      newEntries.push(
        ...buildWeeklyOffDayEntries({
          month,
          employees,
          shiftTypes,
          existingSchedules: [...schedules, ...newEntries],
          employeeIds,
        }),
      );

      if (newEntries.length === 0) {
        return { count: 0, message: 'ไม่มีรายการใหม่ที่ต้องเพิ่ม' };
      }

      const { error: bulkErr } = await dbInsert('schedules',
        newEntries.map((e) => ({
          id: e.id,
          employee_id: e.employeeId,
          date: e.date,
          shift_type_id: e.shiftTypeId,
          status: e.status,
          request_type: e.requestType,
          created_by: e.createdBy,
          employee_note: e.employeeNote,
        }))
      );

      if (bulkErr) throw bulkErr;
      await refreshSchedules();
      return { count: newEntries.length, message: `เพิ่มตารางจากตารางซ้ำ ${newEntries.length} รายการ` };
    },
    [recurringSchedules, shiftTypes, employees, schedules, refreshSchedules],
  );

  const swapScheduleShifts = useCallback(
    async (requesterId: string, targetId: string) => {
      await invokeEdgeFunction<{ swapped?: unknown[]; error?: string }>('swap-schedule-shifts', {
        requester_id: requesterId,
        target_id: targetId,
      });
      await refreshSchedules();
    },
    [refreshSchedules],
  );

  return {
    updateSchedule,
    deleteSchedule,
    createSchedulesBulk,
    upsertSchedulesBulk,
    deleteSchedulesByMonth,
    deleteSchedulesBeforeDate,
    applyRecurringSchedules,
    swapScheduleShifts,
  };
}
