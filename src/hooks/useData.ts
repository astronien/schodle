// Facade hook that composes the domain data hooks. Components keep using
// `useData()` exactly as before; the implementation now lives in:
//   hooks/data/useCoreData          — state, fetchAll, targeted refreshers
//   hooks/data/usePushNotifier      — push helpers + dedup windows
//   hooks/data/useRealtimeSchedules — realtime subscription + polling
//   hooks/data/useScheduleMutations — schedule CRUD, bulk ops, swap RPC
//   hooks/data/useEmployeeMutations — employee CRUD via Edge Functions
//   hooks/data/useCatalogMutations  — positions/groups/shift types/recurring/settings
//   lib/uploads                     — evidence upload + image compression
import { uploadFile } from '../lib/uploads';
import { useCoreData } from './data/useCoreData';
import { usePushNotifier } from './data/usePushNotifier';
import { useRealtimeSchedules } from './data/useRealtimeSchedules';
import { useScheduleMutations } from './data/useScheduleMutations';
import { useEmployeeMutations } from './data/useEmployeeMutations';
import { useCatalogMutations } from './data/useCatalogMutations';

export function useData(currentMonth?: Date) {
  const core = useCoreData(currentMonth);
  const { sendPush, sendPushRole, recentNotificationRef, pruneRecentNotifications } = usePushNotifier();

  useRealtimeSchedules({
    fetchAll: core.fetchAll,
    fetchSchedulesOnly: core.fetchSchedulesOnly,
    setSchedules: core.setSchedules,
    sendPush,
    recentNotificationRef,
    pruneRecentNotifications,
  });

  const scheduleMutations = useScheduleMutations({
    employees: core.employees,
    shiftTypes: core.shiftTypes,
    schedules: core.schedules,
    recurringSchedules: core.recurringSchedules,
    fetchAll: core.fetchAll,
    sendPush,
    sendPushRole,
    recentNotificationRef,
  });

  const employeeMutations = useEmployeeMutations({
    employees: core.employees,
    fetchAll: core.fetchAll,
    refreshEmployees: core.refreshEmployees,
    refreshRecurring: core.refreshRecurring,
  });

  const catalogMutations = useCatalogMutations({
    fetchAll: core.fetchAll,
    refreshPositions: core.refreshPositions,
  });

  return {
    employees: core.employees,
    positions: core.positions,
    shiftTypes: core.shiftTypes,
    positionGroups: core.positionGroups,
    schedules: core.schedules,
    recurringSchedules: core.recurringSchedules,
    settings: core.settings,
    loading: core.loading,
    error: core.error,
    refresh: core.fetchAll,
    refreshEmployees: core.refreshEmployees,
    refreshPositions: core.refreshPositions,
    refreshShiftTypes: core.refreshShiftTypes,
    refreshRecurring: core.refreshRecurring,
    sendPush,
    sendPushRole,
    uploadFile,
    ...scheduleMutations,
    ...employeeMutations,
    ...catalogMutations,
  };
}
