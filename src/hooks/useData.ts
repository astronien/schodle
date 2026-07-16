/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getSessionToken } from '../lib/session';
import { sendPushToEmployee, sendPushToRole } from '../lib/push';
import { dbSelect, dbInsert, dbUpdate, dbUpsert, dbDelete } from '../lib/db-query';
import type { Employee, Position, ScheduleEntry, ShiftType, AppSettings, PositionGroup, RecurringSchedule } from '../types';
import { createEmployeeLookupMaps } from '../lib/schedule-utils';
import { getCachedData, setCachedData } from '../lib/offline-cache';
import {
  REALTIME_THROTTLE_MS,
  RECENT_NOTIFICATION_WINDOW_MS,
  PUSH_DEDUP_WINDOW_MS,
  PUSH_DEDUP_MAP_MAX_SIZE,
  POLL_INTERVAL_MS,
  MAX_UPLOAD_SIZE,
  ALLOWED_UPLOAD_TYPES,
  AUTH_EXPIRED_EVENT,
} from '../config/constants';

type ScheduleRow = {
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

function mapScheduleRow(row: ScheduleRow): ScheduleEntry {
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

export function useData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    storeName: 'Central Plaza Rama 9',
    appName: 'ShiftFlow',
    allowEmployeeSetShifts: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeLookupMaps = createEmployeeLookupMaps(employees, shiftTypes);

  const recentNotificationRef = useRef<Map<string, number>>(new Map());
  const realtimeInFlightRef = useRef<Promise<void> | null>(null);
  const realtimePendingRef = useRef<boolean>(false);

  const scheduleById = useRef<Map<string, ScheduleEntry>>(new Map());
  useEffect(() => {
    scheduleById.current = new Map(schedules.map((s) => [s.id, s]));
  }, [schedules]);

  const recentPushKeys = useRef(new Map<string, number>());

  const shouldSendPush = useCallback((key: string): boolean => {
    const now = Date.now();
    const last = recentPushKeys.current.get(key);
    if (last && now - last < PUSH_DEDUP_WINDOW_MS) return false;
    recentPushKeys.current.set(key, now);
    if (recentPushKeys.current.size > PUSH_DEDUP_MAP_MAX_SIZE) {
      for (const [k, t] of recentPushKeys.current) {
        if (now - t > PUSH_DEDUP_WINDOW_MS * 2) recentPushKeys.current.delete(k);
      }
    }
    return true;
  }, []);

  const sendPush = useCallback(async (employeeId: string, title: string, body: string, url?: string, notifType?: 'schedule_changes' | 'approval_status' | 'new_requests') => {
    const dedupKey = `e:${employeeId}:${title}:${body}`;
    if (!shouldSendPush(dedupKey)) return;
    try {
      const result = await sendPushToEmployee(employeeId, title, body, url, notifType);
      if (!result.success) {
        console.warn('[sendPush] Non-fatal failure:', result.error);
      } else if (typeof result.sent === 'number' && result.failed && result.failed > 0) {
        console.warn(`[sendPush] Partial delivery: ${result.sent} sent, ${result.failed} failed`);
      }
    } catch (err) {
      console.error('[sendPush] Notification failed:', err);
    }
  }, [shouldSendPush]);

  const sendPushRole = useCallback(async (role: string, title: string, body: string, url?: string) => {
    const dedupKey = `r:${role}:${title}:${body}`;
    if (!shouldSendPush(dedupKey)) return;
    try {
      const result = await sendPushToRole(role, title, body, url);
      if (!result.success) {
        console.warn('[sendPushRole] Non-fatal failure:', result.error);
      } else if (typeof result.sent === 'number' && result.failed && result.failed > 0) {
        console.warn(`[sendPushRole] Partial delivery: ${result.sent} sent, ${result.failed} failed`);
      }
    } catch (err) {
      console.error('[sendPushRole] Notification failed:', err);
    }
  }, [shouldSendPush]);

  const fetchSchedulesOnly = useCallback(async (): Promise<ScheduleEntry[]> => {
    const token = getSessionToken();
    if (!token) return [];

    const { data, error: schedErr } = await dbSelect<any>('schedules', undefined, '*', { column: 'date', ascending: true });
    if (schedErr) throw schedErr;
    return (data || []).map(mapScheduleRow);
  }, []);

  const fetchAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const token = getSessionToken();
    if (!token) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      const [posRes, empRes, shiftRes, groupRes, schedRes, recurringRes, settingsRes] = await Promise.all([
        dbSelect<any>('positions', undefined, '*', { column: 'code', ascending: true }),
        dbSelect<any>('employees', undefined, 'id, employee_code, full_name, position_id, group_id, role, phone, email, avatar, weekly_off_day, must_change_password, created_at', { column: 'full_name', ascending: true }),
        dbSelect<any>('shift_types', undefined, '*', { column: 'code', ascending: true }),
        dbSelect<any>('position_groups', undefined, '*', { column: 'name', ascending: true }),
        dbSelect<any>('schedules', undefined, '*', { column: 'date', ascending: true }),
        dbSelect<any>('recurring_schedules', undefined, '*', { column: 'created_at', ascending: true }),
        dbSelect<any>('settings'),
      ]);

      if (posRes.error) throw posRes.error;
      if (empRes.error) throw empRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (groupRes.error) throw groupRes.error;
      if (schedRes.error) throw schedRes.error;
      if (recurringRes.error) throw recurringRes.error;

      setPositions(
        (posRes.data || []).map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          minRequired: p.min_required,
        })),
      );

      setPositionGroups(
        (groupRes.data || []).map((g) => ({
          id: g.id,
          name: g.name,
          enforceBalance: g.enforce_balance ?? false,
        })),
      );

      setEmployees(
        (empRes.data || []).map((e) => ({
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
        })),
      );

      setShiftTypes(
        (shiftRes.data || []).map((s) => ({
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
        })),
      );

      setRecurringSchedules(
        (recurringRes.data || []).map((r) => ({
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
        })),
      );

      setSchedules((schedRes.data || []).map(mapScheduleRow));

      setCachedData('employees', empRes.data || []);
      setCachedData('positions', posRes.data || []);
      setCachedData('shift_types', shiftRes.data || []);
      setCachedData('schedules', schedRes.data || []);

      if (settingsRes.data) {
        const settingsMap: Record<string, string> = {};
        settingsRes.data.forEach((s) => {
          settingsMap[s.key] = s.value;
        });
        setSettings({
          storeName: settingsMap['store_name'] || 'Central Plaza Rama 9',
          appName: settingsMap['app_name'] || 'ShiftFlow',
          allowEmployeeSetShifts: settingsMap['allow_employee_set_shifts'] !== 'false',
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');

      const cachedEmps = getCachedData<any>('employees');
      const cachedPos = getCachedData<any>('positions');
      const cachedShifts = getCachedData<any>('shift_types');
      const cachedScheds = getCachedData<any>('schedules');
      if (cachedEmps) {
        setEmployees(cachedEmps.map((e: any) => ({
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
        })));
      }
      if (cachedPos) {
        setPositions(cachedPos.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          minRequired: p.min_required,
        })));
      }
      if (cachedShifts) {
        setShiftTypes(cachedShifts.map((s: any) => ({
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
        })));
      }
      if (cachedScheds) {
        setSchedules(cachedScheds.map(mapScheduleRow));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchAll();
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  // Targeted refreshers — only refetch the affected table after a mutation,
  // avoiding the cost of refetching all 7 tables on every CRUD.
  const refreshEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, position_id, group_id, role, phone, email, avatar, weekly_off_day, must_change_password, created_at')
      .order('full_name');
    if (!error && data) {
      setEmployees(data.map((e) => ({
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
      })));
    }
  }, []);

  const refreshPositions = useCallback(async () => {
    const [posRes, groupRes] = await Promise.all([
      dbSelect<any>('positions', undefined, '*', { column: 'code', ascending: true }),
      dbSelect<any>('position_groups', undefined, '*', { column: 'name', ascending: true }),
    ]);
    if (posRes.data) {
      setPositions(posRes.data.map((p) => ({
        id: p.id, code: p.code, name: p.name, minRequired: p.min_required,
      })));
    }
    if (groupRes.data) {
      setPositionGroups(groupRes.data.map((g) => ({ id: g.id, name: g.name, enforceBalance: g.enforce_balance ?? false })));
    }
  }, []);

  const refreshShiftTypes = useCallback(async () => {
    const { data, error } = await dbSelect<any>('shift_types', undefined, '*', { column: 'code', ascending: true });
    if (!error && data) {
      setShiftTypes(data.map((s) => ({
        id: s.id, code: s.code, name: s.name,
        startTime: s.start_time, endTime: s.end_time,
        color: s.color, requiresApproval: s.requires_approval,
        requiresReason: s.requires_reason, requiresEvidence: s.requires_evidence,
        isVisible: s.is_visible, isLeave: s.is_leave ?? false,
        targetStaff: s.target_staff || undefined,
        category: (s.category as ShiftType['category']) || undefined,
        annualQuota: s.annual_quota || undefined,
      })));
    }
  }, []);

  const refreshRecurring = useCallback(async () => {
    const { data, error } = await dbSelect<any>('recurring_schedules', undefined, '*', { column: 'created_at', ascending: true });
    if (!error && data) {
      setRecurringSchedules(data.map((r) => ({
        id: r.id, employeeId: r.employee_id, shiftTypeId: r.shift_type_id,
        daysOfWeek: r.days_of_week, startDate: r.start_date,
        endDate: r.end_date || undefined, isActive: r.is_active,
        note: r.note || undefined, createdBy: r.created_by || undefined,
        createdAt: r.created_at, updatedAt: r.updated_at,
      })));
    }
  }, []);

  const refreshSchedulesThrottled = useCallback(() => {
    const run = async () => {
      try {
        const fresh = await fetchSchedulesOnly();
        setSchedules(fresh);
      } catch (err) {
        console.error('[refreshSchedulesThrottled] failed:', err);
      } finally {
        realtimeInFlightRef.current = null;
        if (realtimePendingRef.current) {
          realtimePendingRef.current = false;
          void run();
        }
      }
    };
    if (realtimeInFlightRef.current) {
      realtimePendingRef.current = true;
      return;
    }
    realtimeInFlightRef.current = run();
  }, [fetchSchedulesOnly]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('realtime:schedules')
      .on('system', { event: 'CHANNEL_ERROR' }, () => {
        const token = getSessionToken();
        if (token) console.warn('[realtime] channel error — will refresh data and retry');
        void fetchAll(true);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          void fetchAll(true);
        }, 5000);
      })
      .on('system', { event: 'TIMED_OUT' }, () => {
        if (getSessionToken()) console.warn('[realtime] timed out — refreshing');
        void fetchAll(true);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          const eventType = payload.eventType;
          const record = (payload.new || payload.old) as Partial<ScheduleRow> | undefined;
          const employeeId = record?.employee_id;
          const date = record?.date;
          const status = record?.status;
          const shiftTypeId = record?.shift_type_id;

          if (employeeId && date) {
            const pruneRecent = () => {
              const now = Date.now();
              for (const [k, ts] of recentNotificationRef.current.entries()) {
                if (now - ts > RECENT_NOTIFICATION_WINDOW_MS) {
                  recentNotificationRef.current.delete(k);
                }
              }
            };
            pruneRecent();
            const key = `${eventType}:${employeeId}:${date}:${status || ''}:${shiftTypeId || ''}`;
            if (!recentNotificationRef.current.has(key)) {
              const title = 'อัปเดตตารางงาน';
              let body = `ตารางงานวันที่ ${date} มีการเปลี่ยนแปลง`;
              let notifType: 'schedule_changes' | 'approval_status' = 'schedule_changes';

              if (eventType === 'INSERT') {
                body = `มีรายการตารางงานใหม่วันที่ ${date}`;
              } else if (eventType === 'DELETE') {
                body = `รายการตารางงานวันที่ ${date} ถูกลบ`;
              } else if (status === 'approved') {
                body = `กะงานวันที่ ${date} ได้รับการอนุมัติแล้ว`;
                notifType = 'approval_status';
              } else if (status === 'rejected') {
                body = `กะงานวันที่ ${date} ไม่ได้รับการอนุมัติ`;
                notifType = 'approval_status';
              }

              recentNotificationRef.current.set(key, Date.now());
              void sendPush(employeeId, title, body, '/dashboard', notifType);
            }
          }

          setTimeout(refreshSchedulesThrottled, REALTIME_THROTTLE_MS);
        },
      )
      .subscribe();

    const pollId = setInterval(() => {
      refreshSchedulesThrottled();
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSchedulesThrottled();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisibility);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [refreshSchedulesThrottled, sendPush, fetchAll]);

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

      const { error: upsertErr } = await dbUpsert('schedules', {
        id: entry.id,
        employee_id: entry.employeeId,
        date: entry.date,
        shift_type_id: entry.shiftTypeId,
        status: entry.status,
        request_type: entry.requestType,
        created_by: entry.createdBy || null,
        employee_note: entry.employeeNote || null,
        manager_remark: entry.managerRemark || null,
        swap_with_id: entry.swapWithId || null,
        evidence_url: entry.evidenceUrl || null,
        revert_shift_type_id: entry.revertShiftTypeId || null,
        updated_at: new Date().toISOString(),
      });

      if (upsertErr) throw upsertErr;

      const oldEntry = scheduleById.current.get(entry.id);
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

      await fetchAll(true);
    },
    [employeeLookupMaps.employeeById, employeeLookupMaps.shiftTypeById, fetchAll, sendPush, sendPushRole],
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const { error: delErr } = await dbDelete('schedules', { id });
      if (delErr) throw delErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  // Bulk insert for AI-generated schedules. Falls back to per-row insert if
  // the batch insert fails (e.g., one row violates a constraint). Returns
  // counts so the caller can report success/failure.
  const createSchedulesBulk = useCallback(
    async (entries: ScheduleEntry[]): Promise<{ inserted: number; failed: number }> => {
      if (entries.length === 0) return { inserted: 0, failed: 0 };
      const rows = entries.map((e) => ({
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
      }));
      const { error } = await dbInsert('schedules', rows);
      if (!error) {
        await fetchAll(true);
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
      await fetchAll(true);
      return { inserted, failed };
    },
    [fetchAll],
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
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deleteSchedulesBeforeDate = useCallback(
    async (beforeDate: string) => {
      const { error: delErr } = await dbDelete('schedules', {
        date: { lt: beforeDate }
      });
      if (delErr) throw delErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const compressImage = (file: File, maxDim = 1200, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error(`ไฟล์มีขนาดใหญ่เกินไป (สูงสุด ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB)`);
    }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type) && !file.type.startsWith('image/')) {
      throw new Error('ประเภทไฟล์ไม่รองรับ (อนุญาตเฉพาะรูปภาพ)');
    }

    const compressed = await compressImage(file);
    const fileExt = compressed.name.split('.').pop() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `evidence/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, compressed, {
      contentType: compressed.type || 'image/jpeg',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  const createEmployee = useCallback(
    async (employee: Omit<Employee, 'id'>) => {
      const dup = employees.find((e) => e.employeeCode === employee.employeeCode);
      if (dup) {
        throw new Error(`รหัสพนักงาน "${employee.employeeCode}" ซ้ำ (มีอยู่แล้ว)`);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(employee.positionId)) {
        throw new Error(`position_id "${employee.positionId}" ไม่ใช่ UUID ที่ถูกต้อง`);
      }

      const token = getSessionToken();
      if (!token) {
        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }

      const { data, error: fnError } = await supabase.functions.invoke<{ id: string; error?: string }>(
        'create-employee',
        {
          body: {
            employee_code: employee.employeeCode,
            full_name: employee.fullName,
            position_id: employee.positionId,
            group_id: employee.groupId || null,
            role: employee.role,
            phone: employee.phone || null,
            email: employee.email || null,
            avatar: employee.avatar || null,
            weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (fnError) {
        const errBody = (fnError as { context?: Response }).context;
        let serverMsg: string | null = null;
        if (errBody && typeof errBody.json === 'function') {
          try {
            const parsed = (await errBody.json()) as { error?: string };
            serverMsg = parsed?.error ?? null;
          } catch { /* ignore */ }
        }
        const msg = serverMsg ?? (data as { error?: string } | null)?.error ?? fnError.message;
        // If 401, session expired — signal app to handle auth failure gracefully
        if (errBody?.status === 401 || msg.includes('401') || msg.includes('expired') || msg.includes('Invalid')) {
          window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
          throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        }
        throw new Error(msg);
      }
      if (data && data.error) {
        throw new Error(data.error);
      }

      await fetchAll(true);
    },
    [employees, fetchAll],
  );

  const updateEmployee = useCallback(
    async (employee: Employee) => {
      const oldEmployee = employees.find((e) => e.id === employee.id);
      const codeChanged = oldEmployee && oldEmployee.employeeCode !== employee.employeeCode;

      const updateData: Record<string, unknown> = {
        employee_code: employee.employeeCode,
        full_name: employee.fullName,
        position_id: employee.positionId,
        group_id: employee.groupId || null,
        role: employee.role,
        phone: employee.phone || null,
        email: employee.email || null,
        avatar: employee.avatar || null,
        weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
      };

      if (codeChanged) {
        updateData.password_hash = null;
        updateData.must_change_password = true;
      }

      const { error: updErr } = await dbUpdate('employees', updateData, { id: employee.id });

      if (updErr) {
        throw new Error(updErr.message || 'Supabase update failed');
      }

      await fetchAll(true);
    },
    [employees, fetchAll],
  );

  const resetEmployeePassword = useCallback(
    async (employee: Employee) => {
      const token = getSessionToken();
      if (!token) {
        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }

      const { data, error: fnError } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
        'reset-employee-password',
        {
          body: { employee_id: employee.id, employee_code: employee.employeeCode },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (fnError) {
        const errBody = (fnError as { context?: Response }).context;
        let serverMsg: string | null = null;
        if (errBody && typeof errBody.json === 'function') {
          try {
            const parsed = (await errBody.json()) as { error?: string };
            serverMsg = parsed?.error ?? null;
          } catch { /* ignore */ }
        }
        const msg = serverMsg ?? (data as { error?: string } | null)?.error ?? fnError.message;
        if (errBody?.status === 401 || msg.includes('401') || msg.includes('expired') || msg.includes('Invalid')) {
          window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
          throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        }
        throw new Error(msg);
      }
      if (data && data.error) {
        throw new Error(data.error);
      }

      await refreshEmployees();
    },
    [refreshEmployees],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      // Delete related schedules first to avoid foreign key constraint
      const { error: schedErr } = await dbDelete('schedules', { employee_id: id });
      if (schedErr) {
        console.warn('[deleteEmployee] Failed to delete related schedules:', schedErr.message);
      }
      // Also delete recurring schedules
      const { error: recErr } = await dbDelete('recurring_schedules', { employee_id: id });
      if (recErr) {
        console.warn('[deleteEmployee] Failed to delete recurring schedules:', recErr.message);
      }
      const { error: delErr } = await dbDelete('employees', { id });
      if (delErr) {
        throw new Error(delErr.message || 'Supabase delete failed');
      }
      await Promise.all([refreshEmployees(), refreshRecurring(), fetchAll(true)]);
    },
    [fetchAll, refreshEmployees, refreshRecurring],
  );

  const createPosition = useCallback(
    async (position: Omit<Position, 'id'>) => {
      const { error: insErr } = await dbInsert('positions', {
        code: position.code,
        name: position.name,
        min_required: position.minRequired,
      });
      if (insErr) {
        throw new Error(insErr.message || 'Supabase insert failed');
      }
      await refreshPositions();
    },
    [refreshPositions],
  );

  const deletePosition = useCallback(
    async (id: string) => {
      const { error: delErr } = await dbDelete('positions', { id });
      if (delErr) {
        throw new Error(delErr.message || 'Supabase delete failed');
      }
      await refreshPositions();
    },
    [refreshPositions],
  );

  const updatePosition = useCallback(
    async (position: Position) => {
      const { error: updErr } = await dbUpdate('positions', {
        code: position.code,
        name: position.name,
        min_required: position.minRequired,
      }, { id: position.id });
      if (updErr) throw updErr;
      await refreshPositions();
    },
    [refreshPositions],
  );

  const createPositionGroup = useCallback(
    async (group: Omit<PositionGroup, 'id'>) => {
      const { error: insErr } = await dbInsert('position_groups', { name: group.name, enforce_balance: group.enforceBalance ?? false });
      if (insErr) throw insErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updatePositionGroup = useCallback(
    async (group: PositionGroup) => {
      const { error: updErr } = await dbUpdate('position_groups', { name: group.name, enforce_balance: group.enforceBalance ?? false }, { id: group.id });
      if (updErr) throw updErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deletePositionGroup = useCallback(
    async (id: string) => {
      const { error: delErr } = await dbDelete('position_groups', { id });
      if (delErr) throw delErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const createShiftType = useCallback(
    async (shiftType: Omit<ShiftType, 'id'>) => {
      const { error: insErr } = await dbInsert('shift_types', {
        code: shiftType.code,
        name: shiftType.name,
        start_time: shiftType.startTime,
        end_time: shiftType.endTime,
        color: shiftType.color,
        requires_approval: shiftType.requiresApproval,
        requires_reason: shiftType.requiresReason,
        requires_evidence: shiftType.requiresEvidence,
        is_visible: shiftType.isVisible,
        is_leave: shiftType.isLeave ?? false,
        target_staff: shiftType.targetStaff || null,
        category: shiftType.category || null,
      });
      if (insErr) {
        throw new Error(insErr.message || 'Supabase insert failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updateShiftType = useCallback(
    async (shiftType: ShiftType) => {
      const { error: updErr } = await dbUpdate('shift_types', {
        code: shiftType.code,
        name: shiftType.name,
        start_time: shiftType.startTime,
        end_time: shiftType.endTime,
        color: shiftType.color,
        requires_approval: shiftType.requiresApproval,
        requires_reason: shiftType.requiresReason,
        requires_evidence: shiftType.requiresEvidence,
        is_visible: shiftType.isVisible,
        is_leave: shiftType.isLeave ?? false,
        target_staff: shiftType.targetStaff || null,
        category: shiftType.category || null,
      }, { id: shiftType.id });
      if (updErr) {
        throw new Error(updErr.message || 'Supabase update failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deleteShiftType = useCallback(
    async (id: string) => {
      const { error: delErr } = await dbDelete('shift_types', { id });
      if (delErr) {
        throw new Error(delErr.message || 'Supabase delete failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const createRecurringSchedule = useCallback(
    async (recurring: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { error: insErr } = await dbInsert('recurring_schedules', {
        employee_id: recurring.employeeId,
        shift_type_id: recurring.shiftTypeId,
        days_of_week: recurring.daysOfWeek,
        start_date: recurring.startDate,
        end_date: recurring.endDate || null,
        is_active: recurring.isActive,
        note: recurring.note || null,
        created_by: recurring.createdBy || null,
      });
      if (insErr) {
        throw new Error(insErr.message || 'Supabase insert failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updateRecurringSchedule = useCallback(
    async (recurring: RecurringSchedule) => {
      const { error: updErr } = await dbUpdate('recurring_schedules', {
        employee_id: recurring.employeeId,
        shift_type_id: recurring.shiftTypeId,
        days_of_week: recurring.daysOfWeek,
        start_date: recurring.startDate,
        end_date: recurring.endDate || null,
        is_active: recurring.isActive,
        note: recurring.note || null,
        created_by: recurring.createdBy || null,
      }, { id: recurring.id });
      if (updErr) {
        throw new Error(updErr.message || 'Supabase update failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deleteRecurringSchedule = useCallback(
    async (id: string) => {
      const { error: delErr } = await dbDelete('recurring_schedules', { id });
      if (delErr) {
        throw new Error(delErr.message || 'Supabase delete failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
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

      if (newEntries.length === 0) {
        return { count: 0, message: 'ไม่มีรายการใหม่ที่ต้องเพิ่ม' };
      }

      // Bulk insert
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
      await fetchAll(true);
      return { count: newEntries.length, message: `เพิ่มตารางจากตารางซ้ำ ${newEntries.length} รายการ` };
    },
    [recurringSchedules, shiftTypes, employees, schedules, fetchAll],
  );

  const updateSettings = useCallback(
    async (newSettings: AppSettings) => {
      const results = await Promise.all([
        dbUpsert('settings', { key: 'store_name', value: newSettings.storeName }),
        dbUpsert('settings', { key: 'app_name', value: newSettings.appName }),
        dbUpsert('settings', { key: 'allow_employee_set_shifts', value: String(newSettings.allowEmployeeSetShifts) }),
      ]);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const swapScheduleShifts = useCallback(
    async (requesterId: string, targetId: string) => {
      const token = getSessionToken();
      if (!token) {
        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
      const { data, error: fnError } = await supabase.functions.invoke<{ swapped: unknown[]; error?: string }>(
        'swap-schedule-shifts',
        {
          body: { requester_id: requesterId, target_id: targetId },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (fnError) {
        const body = (fnError as { context?: Response }).context;
        let serverMsg: string | null = null;
        if (body && typeof body.json === 'function') {
          try {
            const parsed = (await body.json()) as { error?: string };
            serverMsg = parsed?.error ?? null;
          } catch {
            // ignore parse errors
          }
        }
        throw new Error(serverMsg ?? (data as { error?: string } | null)?.error ?? fnError.message);
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  return {
    employees,
    positions,
    shiftTypes,
    positionGroups,
    schedules,
    recurringSchedules,
    loading,
    error,
    refresh: fetchAll,
    refreshEmployees,
    refreshPositions,
    refreshShiftTypes,
    refreshRecurring,
    updateSchedule,
    deleteSchedule,
    createSchedulesBulk,
    deleteSchedulesByMonth,
    deleteSchedulesBeforeDate,
    sendPush,
    sendPushRole,
    settings,
    createEmployee,
    updateEmployee,
    resetEmployeePassword,
    deleteEmployee,
    createPosition,
    updatePosition,
    deletePosition,
    createPositionGroup,
    updatePositionGroup,
    deletePositionGroup,
    createShiftType,
    updateShiftType,
    deleteShiftType,
    createRecurringSchedule,
    updateRecurringSchedule,
    deleteRecurringSchedule,
    applyRecurringSchedules,
    updateSettings,
    uploadFile,
    swapScheduleShifts,
  };
}
