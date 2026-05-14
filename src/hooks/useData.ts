import { useEffect, useState, useCallback, useRef } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import type { Employee, Position, ScheduleEntry, ShiftType, AppSettings, PositionGroup, ScheduleRequest } from '../types/index';
import { createEmployeeLookupMaps } from '../lib/schedule-utils';

export function useData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([]);
  const employeeLookupMaps = createEmployeeLookupMaps(employees, shiftTypes);


  const [settings, setSettings] = useState<AppSettings>({
    storeName: 'Central Plaza Rama 9',
    appName: 'ShiftFlow',
    allowEmployeeSetShifts: true,
  });
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const recentNotificationRef = useRef<Map<string, number>>(new Map());

  const sendPush = useCallback(async (employeeId: string, title: string, body: string, url?: string) => {
    try {
      await supabase.functions.invoke('send-push', {
        body: { employee_id: employeeId, title, body, url }
      });
    } catch (err) {
      console.error('[sendPush] Notification failed:', err);
    }
  }, []);

  const sendPushRole = useCallback(async (role: string, title: string, body: string, url?: string) => {
    try {
      await supabase.functions.invoke('send-push', {
        body: { role, title, body, url }
      });
    } catch (err) {
      console.error('[sendPushRole] Notification failed:', err);
    }
  }, []);

  const fetchAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);

    setError(null);
    try {
      const [posRes, empRes, shiftRes, groupRes, schedRes, reqRes, settingsRes] = await Promise.all([
        supabase.from('positions').select('*').order('code'),
        supabase.from('employees').select('*').order('full_name'),
        supabase.from('shift_types').select('*').order('code'),
        supabase.from('position_groups').select('*').order('name'),
        supabase.from('schedules').select('*').order('date'),
        supabase.from('schedule_requests').select('*').order('date'),
        supabase.from('settings').select('*'),
      ]);

      if (posRes.error) throw posRes.error;
      if (empRes.error) throw empRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (groupRes.error) throw groupRes.error;
      if (schedRes.error) throw schedRes.error;
      if (reqRes.error) throw reqRes.error;

      setPositions(
        (posRes.data || []).map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          minRequired: p.min_required,
        }))
      );

      setPositionGroups(
        (groupRes.data || []).map((g) => ({
          id: g.id,
          name: g.name,
        }))
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
        }))
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
          targetStaff: s.target_staff || undefined,
          category: (s.category as ShiftType['category']) || undefined,
        }))
      );

      setSchedules(
        (schedRes.data || []).map((s: any) => ({
          id: s.id,
          employeeId: s.employee_id,
          date: s.date,
          shiftTypeId: s.shift_type_id,
          status: s.status as ScheduleEntry['status'],
          employeeNote: s.employee_note || undefined,
          managerRemark: s.manager_remark || undefined,
          swapWithId: s.swap_with_id || undefined,
          evidenceUrl: s.evidence_url || undefined,
          revertShiftTypeId: s.revert_shift_type_id || undefined,
        }))
      );

      setScheduleRequests(
        (reqRes.data || []).map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          date: r.date,
          shiftTypeId: r.shift_type_id,
          requestType: r.request_type,
          status: r.status as ScheduleRequest['status'],
          employeeNote: r.employee_note || undefined,
          managerRemark: r.manager_remark || undefined,
          swapWithId: r.swap_with_id || undefined,
          evidenceUrl: r.evidence_url || undefined,
          revertShiftTypeId: r.revert_shift_type_id || undefined,
        }))
      );

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


    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const pruneRecent = () => {
      const now = Date.now();
      for (const [k, ts] of recentNotificationRef.current.entries()) {
        if (now - ts > 7000) recentNotificationRef.current.delete(k);
      }
    };

    const shouldSkipByRecent = (key: string) => {
      pruneRecent();
      return recentNotificationRef.current.has(key);
    };

    const markRecent = (key: string) => {
      pruneRecent();
      recentNotificationRef.current.set(key, Date.now());
    };

    const channel = supabase
      .channel('realtime:schedules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        (payload) => {
          const eventType = payload.eventType;
          const record: any = payload.new || payload.old;
          const employeeId: string | undefined = record?.employee_id;
          const date: string | undefined = record?.date;
          const status: string | undefined = record?.status;
          const shiftTypeId: string | undefined = record?.shift_type_id;

          if (employeeId && date) {
            const key = `${eventType}:${employeeId}:${date}:${status || ''}:${shiftTypeId || ''}`;
            if (!shouldSkipByRecent(key)) {
              let title = 'อัปเดตตารางงาน';
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

              markRecent(key);
              sendPush(employeeId, title, body, '/dashboard');
            }
          }

          fetchAll(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, sendPush]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchAll(true);
    }, 15000);

    const onFocus = () => {
      fetchAll(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAll(true);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchAll]);

  const updateSchedule = useCallback(async (entry: ScheduleEntry, forceNotify?: boolean) => {
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

    const { error } = await supabase.from('schedule_requests').upsert({
      id: entry.id,
      employee_id: entry.employeeId,
      date: entry.date,
      shift_type_id: entry.shiftTypeId,
      request_type: 'shift_change',
      status: entry.status,
      employee_note: entry.employeeNote || null,
      manager_remark: entry.managerRemark || null,
      swap_with_id: entry.swapWithId || null,
      evidence_url: entry.evidenceUrl || null,
      revert_shift_type_id: entry.revertShiftTypeId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) throw error;

    const oldRequest = scheduleRequests.find((request) => request.id === entry.id);
    const statusChanged = oldRequest && oldRequest.status !== entry.status;
    const isNewPending = (!oldRequest || oldRequest.status !== 'pending') && entry.status === 'pending';

    if (isNewPending) {
      sendPushRole('manager', 'มีคำขอใหม่จากพนักงาน', `${emp?.fullName || 'พนักงาน'} ส่งคำขอใหม่ วันที่ ${entry.date}`, '/manager/requests');
    }
    
    if (statusChanged || forceNotify) {
      let title = 'อัปเดตคำขอ';
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
        sendPush(entry.employeeId, title, body, '/dashboard');
      }
    }

    await fetchAll();

  }, [employeeLookupMaps.employeeById, employeeLookupMaps.shiftTypeById, fetchAll, scheduleRequests, sendPush, sendPushRole]);


  const deleteSchedule = useCallback(async (id: string) => {
    const { error } = await supabase.from('schedule_requests').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const compressImage = (file: File, maxDim = 1200, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
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
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
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

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, compressed);

    if (uploadError) {
      console.error('[uploadFile] Error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }, []);

  const createEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {

    // 1. Check for duplicate employee_code
    const dup = employeeLookupMaps.employeeById.size > 0
      ? Array.from(employeeLookupMaps.employeeById.values()).find((e) => e.employeeCode === employee.employeeCode)
      : employees.find((e) => e.employeeCode === employee.employeeCode);
    if (dup) {
      throw new Error(`รหัสพนักงาน "${employee.employeeCode}" ซ้ำ (มีอยู่แล้ว)`);
    }

    // 2. Validate UUID format for position_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(employee.positionId)) {
      throw new Error(`position_id "${employee.positionId}" ไม่ใช่ UUID ที่ถูกต้อง`);
    }

    const payload = {
      employee_code: employee.employeeCode,
      full_name: employee.fullName,
      position_id: employee.positionId,
      group_id: employee.groupId || null,
      role: employee.role,
      phone: employee.phone || null,
      email: employee.email || null,
      avatar: employee.avatar || null,
      weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
      password_hash: bcrypt.hashSync(employee.employeeCode, 10),
    };

    console.log('[createEmployee] payload:', payload);

    const { error } = await supabase.from('employees').insert(payload);
    if (error) {
      console.error('[createEmployee] Supabase error:', error);
      const msg = [
        error.message,
        error.details,
        error.hint,
        `code: ${error.code}`,
      ]
        .filter(Boolean)
        .join(' | ');
      throw new Error(msg || 'Supabase insert failed');
    }
    await fetchAll();
  }, [employeeLookupMaps.employeeById, employees, fetchAll]);

  const updateEmployee = useCallback(async (employee: Employee) => {
    console.log('[updateEmployee] payload:', employee);
    const { error } = await supabase.from('employees').update({
      employee_code: employee.employeeCode,
      full_name: employee.fullName,
      position_id: employee.positionId,
      group_id: employee.groupId || null,
      role: employee.role,
      phone: employee.phone || null,
      email: employee.email || null,
      avatar: employee.avatar || null,
      weekly_off_day: typeof employee.weeklyOffDay === 'number' ? employee.weeklyOffDay : null,
    }).eq('id', employee.id);

    if (error) {
      console.error('[updateEmployee] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase update failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const deleteEmployee = useCallback(async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      console.error('[deleteEmployee] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase delete failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const createPosition = useCallback(async (position: Omit<Position, 'id'>) => {
    const { error } = await supabase.from('positions').insert({
      code: position.code,
      name: position.name,
      min_required: position.minRequired,
    });
    if (error) {
      console.error('[createPosition] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase insert failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const deletePosition = useCallback(async (id: string) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) {
      console.error('[deletePosition] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase delete failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const updatePosition = useCallback(async (position: Position) => {
    const { error } = await supabase.from('positions').update({
      code: position.code,
      name: position.name,
      min_required: position.minRequired,
    }).eq('id', position.id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const createPositionGroup = useCallback(async (group: Omit<PositionGroup, 'id'>) => {
    const { error } = await supabase.from('position_groups').insert({
      name: group.name,
    });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const updatePositionGroup = useCallback(async (group: PositionGroup) => {
    const { error } = await supabase.from('position_groups').update({
      name: group.name,
    }).eq('id', group.id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deletePositionGroup = useCallback(async (id: string) => {
    const { error } = await supabase.from('position_groups').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);



  const createShiftType = useCallback(async (shiftType: Omit<ShiftType, 'id'>) => {
    const { error } = await supabase.from('shift_types').insert({
      code: shiftType.code,
      name: shiftType.name,
      start_time: shiftType.startTime,
      end_time: shiftType.endTime,
      color: shiftType.color,
      requires_approval: shiftType.requiresApproval,
      requires_reason: shiftType.requiresReason,
      requires_evidence: shiftType.requiresEvidence,
      is_visible: shiftType.isVisible,
      target_staff: shiftType.targetStaff || null,
      category: shiftType.category || null,
    });
    if (error) {
      console.error('[createShiftType] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase insert failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const updateShiftType = useCallback(async (shiftType: ShiftType) => {
    const { error } = await supabase.from('shift_types').update({
      code: shiftType.code,
      name: shiftType.name,
      start_time: shiftType.startTime,
      end_time: shiftType.endTime,
      color: shiftType.color,
      requires_approval: shiftType.requiresApproval,
      requires_reason: shiftType.requiresReason,
      requires_evidence: shiftType.requiresEvidence,
      is_visible: shiftType.isVisible,
      target_staff: shiftType.targetStaff || null,
      category: shiftType.category || null,
    }).eq('id', shiftType.id);
    if (error) {
      console.error('[updateShiftType] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase update failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const deleteShiftType = useCallback(async (id: string) => {
    const { error } = await supabase.from('shift_types').delete().eq('id', id);
    if (error) {
      console.error('[deleteShiftType] Supabase error:', error);
      const msg = [error.message, error.details, error.hint, `code: ${error.code}`].filter(Boolean).join(' | ');
      throw new Error(msg || 'Supabase delete failed');
    }
    await fetchAll();
  }, [fetchAll]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    const { error: err1 } = await supabase.from('settings').upsert({ key: 'store_name', value: newSettings.storeName });
    const { error: err2 } = await supabase.from('settings').upsert({ key: 'app_name', value: newSettings.appName });
    const { error: err3 } = await supabase.from('settings').upsert({ key: 'allow_employee_set_shifts', value: String(newSettings.allowEmployeeSetShifts) });
    
    if (err1 || err2 || err3) {
      console.error('[updateSettings] Error:', err1 || err2 || err3);
      throw err1 || err2 || err3;
    }
    await fetchAll(true);
  }, [fetchAll]);


  return {
    employees,
    positions,
    shiftTypes,
    positionGroups,
    schedules,
    scheduleRequests,
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
  };
}
