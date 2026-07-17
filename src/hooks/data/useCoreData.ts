// Core data state: fetch-all, targeted refreshers, and the offline-cache
// fallback. Mutation hooks receive the pieces they need from here.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getSessionToken } from '../../lib/session';
import { dbSelect } from '../../lib/db-query';
import { getCachedData, setCachedData } from '../../lib/offline-cache';
import type {
  AppSettings,
  Employee,
  Position,
  PositionGroup,
  RecurringSchedule,
  ScheduleEntry,
  ShiftType,
} from '../../types';
import {
  mapEmployeeRow,
  mapPositionRow,
  mapPositionGroupRow,
  mapRecurringRow,
  mapScheduleRow,
  mapShiftTypeRow,
} from './mappers';

const EMPLOYEE_COLUMNS =
  'id, employee_code, full_name, position_id, group_id, role, phone, email, avatar, weekly_off_day, must_change_password, created_at';

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Central Plaza Rama 9',
  appName: 'ShiftFlow',
  allowEmployeeSetShifts: true,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useCoreData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        dbSelect<any>('employees', undefined, EMPLOYEE_COLUMNS, { column: 'full_name', ascending: true }),
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

      setPositions((posRes.data || []).map(mapPositionRow));
      setPositionGroups((groupRes.data || []).map(mapPositionGroupRow));
      setEmployees((empRes.data || []).map(mapEmployeeRow));
      setShiftTypes((shiftRes.data || []).map(mapShiftTypeRow));
      setRecurringSchedules((recurringRes.data || []).map(mapRecurringRow));
      setSchedules((schedRes.data || []).map(mapScheduleRow));

      setCachedData('employees', empRes.data || []);
      setCachedData('positions', posRes.data || []);
      setCachedData('shift_types', shiftRes.data || []);
      setCachedData('schedules', schedRes.data || []);

      if (settingsRes.data) {
        const settingsMap: Record<string, string> = {};
        settingsRes.data.forEach((s: { key: string; value: string }) => {
          settingsMap[s.key] = s.value;
        });
        setSettings({
          storeName: settingsMap['store_name'] || DEFAULT_SETTINGS.storeName,
          appName: settingsMap['app_name'] || DEFAULT_SETTINGS.appName,
          allowEmployeeSetShifts: settingsMap['allow_employee_set_shifts'] !== 'false',
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');

      // Fall back to the offline cache so the app stays usable.
      const cachedEmps = getCachedData<any>('employees');
      const cachedPos = getCachedData<any>('positions');
      const cachedShifts = getCachedData<any>('shift_types');
      const cachedScheds = getCachedData<any>('schedules');
      if (cachedEmps) setEmployees(cachedEmps.map(mapEmployeeRow));
      if (cachedPos) setPositions(cachedPos.map(mapPositionRow));
      if (cachedShifts) setShiftTypes(cachedShifts.map(mapShiftTypeRow));
      if (cachedScheds) setSchedules(cachedScheds.map(mapScheduleRow));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred to a microtask so fetchAll's synchronous setState calls don't
    // run inside the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => { void fetchAll(); });
  }, [fetchAll]);

  // Targeted refreshers — only refetch the affected table after a mutation,
  // avoiding the cost of refetching all 7 tables on every CRUD.
  const refreshEmployees = useCallback(async () => {
    const { data, error } = await supabase.from('employees').select(EMPLOYEE_COLUMNS).order('full_name');
    if (!error && data) setEmployees(data.map(mapEmployeeRow));
  }, []);

  const refreshPositions = useCallback(async () => {
    const [posRes, groupRes] = await Promise.all([
      dbSelect<any>('positions', undefined, '*', { column: 'code', ascending: true }),
      dbSelect<any>('position_groups', undefined, '*', { column: 'name', ascending: true }),
    ]);
    if (posRes.data) setPositions(posRes.data.map(mapPositionRow));
    if (groupRes.data) setPositionGroups(groupRes.data.map(mapPositionGroupRow));
  }, []);

  const refreshShiftTypes = useCallback(async () => {
    const { data, error } = await dbSelect<any>('shift_types', undefined, '*', { column: 'code', ascending: true });
    if (!error && data) setShiftTypes(data.map(mapShiftTypeRow));
  }, []);

  const refreshRecurring = useCallback(async () => {
    const { data, error } = await dbSelect<any>('recurring_schedules', undefined, '*', { column: 'created_at', ascending: true });
    if (!error && data) setRecurringSchedules(data.map(mapRecurringRow));
  }, []);

  return {
    employees,
    positions,
    shiftTypes,
    positionGroups,
    schedules,
    recurringSchedules,
    settings,
    loading,
    error,
    setSchedules,
    fetchAll,
    fetchSchedulesOnly,
    refreshEmployees,
    refreshPositions,
    refreshShiftTypes,
    refreshRecurring,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
