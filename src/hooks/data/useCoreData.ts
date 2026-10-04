// Core data state: fetch-all, targeted refreshers, and the offline-cache
// fallback. Mutation hooks receive the pieces they need from here.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addMonths, endOfYear, format, startOfYear, subMonths } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { getSessionToken } from '../../lib/session';
import { dbSelect, dbSelectAll } from '../../lib/db-query';
import { getCachedData, setCachedData } from '../../lib/offline-cache';
import { createResponseSequencer } from '../../lib/response-sequencer';
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

// The schedules window spans ~14 months, which for a full roster is well past
// PostgREST's 1000-row cap — it must be read page by page. Sorting by date
// alone is not a total order, so `id` breaks ties and keeps page boundaries
// stable between requests.
const SCHEDULES_ORDER = [
  { column: 'date', ascending: true },
  { column: 'id', ascending: true },
];

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Central Plaza Rama 9',
  appName: 'ShiftFlow',
  allowEmployeeSetShifts: true,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @param currentMonth month being viewed — schedules are fetched for a window
 * of [Dec of previous year .. Jan of next year] relative to this month's year,
 * so yearly reports, prev-month rotation, and cross-month conflict checks all
 * have the data they need without shipping the entire table forever.
 */
export function useCoreData(currentMonth: Date = new Date()) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [positionGroups, setPositionGroups] = useState<PositionGroup[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  // Several refetches of schedules overlap (poll, realtime, mutations); only a
  // result newer than what's already on screen may be applied. See
  // lib/response-sequencer.ts.
  const scheduleSequencerRef = useRef(createResponseSequencer());
  // Once real data has loaded, the offline cache must never replace it — the
  // cache is an older snapshot and would silently drop newer rows.
  const hasLiveSchedulesRef = useRef(false);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scheduleWindow = useMemo(() => {
    const from = format(subMonths(startOfYear(currentMonth), 1), 'yyyy-MM-dd');
    const to = format(addMonths(endOfYear(currentMonth), 1), 'yyyy-MM-dd');
    return { from, to };
  }, [currentMonth]);

  const fetchSchedulesOnly = useCallback(async (): Promise<ScheduleEntry[]> => {
    const token = getSessionToken();
    if (!token) return [];

    const { data, error: schedErr } = await dbSelectAll<any>(
      'schedules',
      { date: { gte: scheduleWindow.from, lte: scheduleWindow.to } },
      '*',
      SCHEDULES_ORDER,
    );
    if (schedErr) throw schedErr;
    return (data || []).map(mapScheduleRow);
  }, [scheduleWindow]);

  const fetchAll = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const token = getSessionToken();
    if (!token) {
      if (!silent) setLoading(false);
      return;
    }

    const scheduleTicket = scheduleSequencerRef.current.begin();
    try {
      const [posRes, empRes, shiftRes, groupRes, schedRes, recurringRes, settingsRes] = await Promise.all([
        dbSelect<any>('positions', undefined, '*', { column: 'code', ascending: true }),
        dbSelect<any>('employees', undefined, EMPLOYEE_COLUMNS, { column: 'full_name', ascending: true }),
        dbSelect<any>('shift_types', undefined, '*', { column: 'code', ascending: true }),
        dbSelect<any>('position_groups', undefined, '*', { column: 'name', ascending: true }),
        dbSelectAll<any>('schedules', { date: { gte: scheduleWindow.from, lte: scheduleWindow.to } }, '*', SCHEDULES_ORDER),
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
      if (scheduleSequencerRef.current.tryApply(scheduleTicket)) {
        setSchedules((schedRes.data || []).map(mapScheduleRow));
        setCachedData('schedules', schedRes.data || []);
        hasLiveSchedulesRef.current = true;
      }

      setCachedData('employees', empRes.data || []);
      setCachedData('positions', posRes.data || []);
      setCachedData('shift_types', shiftRes.data || []);

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

      // Fall back to the offline cache so the app stays usable — but ONLY when
      // nothing live has loaded yet (genuinely offline at startup). Once real
      // data is on screen, a transient failure must leave it alone: the cache
      // is an older snapshot, and swapping it in made newly submitted requests
      // disappear from the manager's view until the next successful refresh.
      if (!hasLiveSchedulesRef.current) {
        const cachedEmps = getCachedData<any>('employees');
        const cachedPos = getCachedData<any>('positions');
        const cachedShifts = getCachedData<any>('shift_types');
        const cachedScheds = getCachedData<any>('schedules');
        if (cachedEmps) setEmployees(cachedEmps.map(mapEmployeeRow));
        if (cachedPos) setPositions(cachedPos.map(mapPositionRow));
        if (cachedShifts) setShiftTypes(cachedShifts.map(mapShiftTypeRow));
        if (cachedScheds) setSchedules(cachedScheds.map(mapScheduleRow));
      }
    } finally {
      setLoading(false);
    }
  }, [scheduleWindow]);

  // Targeted schedules refresh — the hot path after schedule mutations.
  // Refetches ONLY the schedules table instead of all 7 tables.
  const refreshSchedules = useCallback(async () => {
    const ticket = scheduleSequencerRef.current.begin();
    try {
      const fresh = await fetchSchedulesOnly();
      if (scheduleSequencerRef.current.tryApply(ticket)) {
        setSchedules(fresh);
        hasLiveSchedulesRef.current = true;
      }
    } catch (err) {
      // Keep what's on screen; the next poll retries. Escalating to fetchAll
      // here used to multiply load exactly when the backend was struggling.
      console.warn('[refreshSchedules] failed, keeping current data:', err);
    }
  }, [fetchSchedulesOnly]);

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
    refreshSchedules,
    refreshEmployees,
    refreshPositions,
    refreshShiftTypes,
    refreshRecurring,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
