import { useEffect, useState, useCallback } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';
import type { Employee, Position, ScheduleEntry, ShiftType, AppSettings } from '../types';


export function useData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    storeName: 'Central Plaza Rama 9',
    appName: 'ShiftFlow',
  });
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);

    setError(null);
    try {
      const [posRes, empRes, shiftRes, schedRes, settingsRes] = await Promise.all([
        supabase.from('positions').select('*').order('code'),
        supabase.from('employees').select('*').order('full_name'),
        supabase.from('shift_types').select('*').order('code'),
        supabase.from('schedules').select('*').order('date'),
        supabase.from('settings').select('*'),
      ]);


      if (posRes.error) throw posRes.error;
      if (empRes.error) throw empRes.error;
      if (shiftRes.error) throw shiftRes.error;
      if (schedRes.error) throw schedRes.error;

      setPositions(
        (posRes.data || []).map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          minRequired: p.min_required,
        }))
      );

      setEmployees(
        (empRes.data || []).map((e) => ({
          id: e.id,
          employeeCode: e.employee_code,
          fullName: e.full_name,
          positionId: e.position_id,
          role: e.role as Employee['role'],
          phone: e.phone || undefined,
          email: e.email || undefined,
          avatar: e.avatar || undefined,
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
        (schedRes.data || []).map((s) => ({
          id: s.id,
          employeeId: s.employee_id,
          date: s.date,
          shiftTypeId: s.shift_type_id,
          status: s.status as ScheduleEntry['status'],
          employeeNote: s.employee_note || undefined,
          managerRemark: s.manager_remark || undefined,
          swapWithId: s.swap_with_id || undefined,
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

  const updateSchedule = useCallback(async (entry: ScheduleEntry) => {
    const { error } = await supabase.from('schedules').upsert({
      id: entry.id,
      employee_id: entry.employeeId,
      date: entry.date,
      shift_type_id: entry.shiftTypeId,
      status: entry.status,
      employee_note: entry.employeeNote || null,
      manager_remark: entry.managerRemark || null,
      swap_with_id: entry.swapWithId || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const deleteSchedule = useCallback(async (id: string) => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const createEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    // 1. Check for duplicate employee_code
    const dup = employees.find((e) => e.employeeCode === employee.employeeCode);
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
      role: employee.role,
      phone: employee.phone || null,
      email: employee.email || null,
      avatar: employee.avatar || null,
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
  }, [fetchAll, employees]);

  const updateEmployee = useCallback(async (employee: Employee) => {
    console.log('[updateEmployee] payload:', employee);
    const { error } = await supabase.from('employees').update({
      employee_code: employee.employeeCode,
      full_name: employee.fullName,
      position_id: employee.positionId,
      role: employee.role,
      phone: employee.phone || null,
      email: employee.email || null,
      avatar: employee.avatar || null,
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
    
    if (err1 || err2) {
      console.error('[updateSettings] Error:', err1 || err2);
      throw err1 || err2;
    }
    await fetchAll(true);
  }, [fetchAll]);


  return {

    employees,
    positions,
    shiftTypes,
    schedules,
    setSchedules,
    loading,
    error,
    refresh: fetchAll,
    updateSchedule,
    deleteSchedule,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    createPosition,
    deletePosition,
    createShiftType,
    updateShiftType,
    deleteShiftType,
    settings,
    updateSettings,
  };

}
