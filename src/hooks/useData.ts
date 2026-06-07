/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getSessionToken } from '../lib/session';
import { sendPushToEmployee, sendPushToRole } from '../lib/push';
import type { Employee, Position, ScheduleEntry, ShiftType, AppSettings, PositionGroup } from '../types';
import { createEmployeeLookupMaps } from '../lib/schedule-utils';

const RECENT_NOTIFICATION_WINDOW_MS = 7000;
const PUSH_DEDUP_WINDOW_MS = 30000;
const REALTIME_THROTTLE_MS = 1500;

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
    if (recentPushKeys.current.size > 200) {
      for (const [k, t] of recentPushKeys.current) {
        if (now - t > PUSH_DEDUP_WINDOW_MS * 2) recentPushKeys.current.delete(k);
      }
    }
    return true;
  }, []);

  const sendPush = useCallback(async (employeeId: string, title: string, body: string, url?: string) => {
    const dedupKey = `e:${employeeId}:${title}:${body}`;
    if (!shouldSendPush(dedupKey)) return;
    try {
      const result = await sendPushToEmployee(employeeId, title, body, url);
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
    const { data, error: schedErr } = await supabase
      .from('schedules')
      .select('*')
      .order('date');
    if (schedErr) throw schedErr;
    return (data || []).map(mapScheduleRow);
  }, []);

  const fetchAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [posRes, empRes, shiftRes, groupRes, schedRes, settingsRes] = await Promise.all([
        supabase.from('positions').select('*').order('code'),
        supabase.from('employees').select('id, employee_code, full_name, position_id, group_id, role, phone, email, avatar, weekly_off_day, must_change_password, created_at').order('full_name'),
        supabase.from('shift_types').select('*').order('code'),
        supabase.from('position_groups').select('*').order('name'),
        supabase.from('schedules').select('*').order('date'),
        supabase.from('settings').select('*'),
      ]);

      if (posRes.error) throw posRes.error;
      if (empRes.error) throw empRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (groupRes.error) throw groupRes.error;
      if (schedRes.error) throw schedRes.error;

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
        })),
      );

      setSchedules((schedRes.data || []).map(mapScheduleRow));

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

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
    const channel = supabase
      .channel('realtime:schedules')
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

              if (eventType === 'INSERT') {
                body = `มีรายการตารางงานใหม่วันที่ ${date}`;
              } else if (eventType === 'DELETE') {
                body = `รายการตารางงานวันที่ ${date} ถูกลบ`;
              } else if (status === 'approved') {
                body = `กะงานวันที่ ${date} ได้รับการอนุมัติแล้ว`;
              } else if (status === 'rejected') {
                body = `กะงานวันที่ ${date} ไม่ได้รับการอนุมัติ`;
              }

              recentNotificationRef.current.set(key, Date.now());
              void sendPush(employeeId, title, body, '/dashboard');
            }
          }

          setTimeout(refreshSchedulesThrottled, REALTIME_THROTTLE_MS);
        },
      )
      .subscribe();

    const pollId = setInterval(() => {
      refreshSchedulesThrottled();
    }, 15000);

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
    };
  }, [refreshSchedulesThrottled, sendPush]);

  const updateSchedule = useCallback(
    async (entry: ScheduleEntry, forceNotify?: boolean) => {
      const emp = employeeLookupMaps.employeeById.get(entry.employeeId);
      if (typeof emp?.weeklyOffDay === 'number') {
        const day = new Date(`${entry.date}T00:00:00`).getDay();
        if (day === emp.weeklyOffDay) {
          const shiftType = employeeLookupMaps.shiftTypeById.get(entry.shiftTypeId);
          if (shiftType?.code !== 'X') {
            throw new Error(`ไม่สามารถจัดกะวันที่ ${entry.date} ได้ (วันหยุดประจำสัปดาห์)`);
          }
        }
      }

      const { error: upsertErr } = await supabase.from('schedules').upsert(
        {
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
        },
        { onConflict: 'id' },
      );

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
          void sendPush(entry.employeeId, title, body, '/dashboard');
        }
      }

      await fetchAll(true);
    },
    [employeeLookupMaps.employeeById, employeeLookupMaps.shiftTypeById, fetchAll, sendPush, sendPushRole],
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const { error: delErr } = await supabase.from('schedules').delete().eq('id', id);
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
    const compressed = await compressImage(file);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `evidence/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, compressed);
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
        throw new Error((data as { error?: string } | null)?.error ?? fnError.message);
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
      const { error: updErr } = await supabase
        .from('employees')
        .update({
          employee_code: employee.employeeCode,
          full_name: employee.fullName,
          position_id: employee.positionId,
          group_id: employee.groupId || null,
          role: employee.role,
          phone: employee.phone || null,
          email: employee.email || null,
          avatar: employee.avatar || null,
          weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
        })
        .eq('id', employee.id);

      if (updErr) {
        const msg = [updErr.message, updErr.details, updErr.hint, `code: ${updErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase update failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const { error: delErr } = await supabase.from('employees').delete().eq('id', id);
      if (delErr) {
        const msg = [delErr.message, delErr.details, delErr.hint, `code: ${delErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase delete failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const createPosition = useCallback(
    async (position: Omit<Position, 'id'>) => {
      const { error: insErr } = await supabase.from('positions').insert({
        code: position.code,
        name: position.name,
        min_required: position.minRequired,
      });
      if (insErr) {
        const msg = [insErr.message, insErr.details, insErr.hint, `code: ${insErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase insert failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deletePosition = useCallback(
    async (id: string) => {
      const { error: delErr } = await supabase.from('positions').delete().eq('id', id);
      if (delErr) {
        const msg = [delErr.message, delErr.details, delErr.hint, `code: ${delErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase delete failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updatePosition = useCallback(
    async (position: Position) => {
      const { error: updErr } = await supabase
        .from('positions')
        .update({
          code: position.code,
          name: position.name,
          min_required: position.minRequired,
        })
        .eq('id', position.id);
      if (updErr) throw updErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const createPositionGroup = useCallback(
    async (group: Omit<PositionGroup, 'id'>) => {
      const { error: insErr } = await supabase.from('position_groups').insert({ name: group.name });
      if (insErr) throw insErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updatePositionGroup = useCallback(
    async (group: PositionGroup) => {
      const { error: updErr } = await supabase.from('position_groups').update({ name: group.name }).eq('id', group.id);
      if (updErr) throw updErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deletePositionGroup = useCallback(
    async (id: string) => {
      const { error: delErr } = await supabase.from('position_groups').delete().eq('id', id);
      if (delErr) throw delErr;
      await fetchAll(true);
    },
    [fetchAll],
  );

  const createShiftType = useCallback(
    async (shiftType: Omit<ShiftType, 'id'>) => {
      const { error: insErr } = await supabase.from('shift_types').insert({
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
        const msg = [insErr.message, insErr.details, insErr.hint, `code: ${insErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase insert failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updateShiftType = useCallback(
    async (shiftType: ShiftType) => {
      const { error: updErr } = await supabase
        .from('shift_types')
        .update({
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
        })
        .eq('id', shiftType.id);
      if (updErr) {
        const msg = [updErr.message, updErr.details, updErr.hint, `code: ${updErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase update failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const deleteShiftType = useCallback(
    async (id: string) => {
      const { error: delErr } = await supabase.from('shift_types').delete().eq('id', id);
      if (delErr) {
        const msg = [delErr.message, delErr.details, delErr.hint, `code: ${delErr.code}`]
          .filter(Boolean)
          .join(' | ');
        throw new Error(msg || 'Supabase delete failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updateSettings = useCallback(
    async (newSettings: AppSettings) => {
      const results = await Promise.all([
        supabase.from('settings').upsert({ key: 'store_name', value: newSettings.storeName }),
        supabase.from('settings').upsert({ key: 'app_name', value: newSettings.appName }),
        supabase.from('settings').upsert({ key: 'allow_employee_set_shifts', value: String(newSettings.allowEmployeeSetShifts) }),
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
        throw new Error((data as { error?: string } | null)?.error ?? fnError.message);
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
    loading,
    error,
    refresh: fetchAll,
    updateSchedule,
    deleteSchedule,
    sendPush,
    sendPushRole,
    settings,
    createEmployee,
    updateEmployee,
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
    updateSettings,
    uploadFile,
    swapScheduleShifts,
  };
}
