import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Employee, Position, ScheduleEntry, ShiftType } from '../types';

export function useData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, empRes, shiftRes, schedRes] = await Promise.all([
        supabase.from('positions').select('*').order('code'),
        supabase.from('employees').select('*').order('full_name'),
        supabase.from('shift_types').select('*').order('code'),
        supabase.from('schedules').select('*').order('date'),
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
  };
}
