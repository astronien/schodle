// CRUD for the "catalog" tables: positions, position groups, shift types,
// recurring schedules, and app settings. Extracted from useData.
import { useCallback } from 'react';
import { dbInsert, dbUpdate, dbUpsert, dbDelete } from '../../lib/db-query';
import type { AppSettings, Position, PositionGroup, RecurringSchedule, ShiftType } from '../../types';

interface CatalogMutationDeps {
  fetchAll: (silent?: boolean) => Promise<void>;
  refreshPositions: () => Promise<void>;
}

function shiftTypeToRow(shiftType: Omit<ShiftType, 'id'>) {
  return {
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
  };
}

function recurringToRow(recurring: Omit<RecurringSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    employee_id: recurring.employeeId,
    shift_type_id: recurring.shiftTypeId,
    days_of_week: recurring.daysOfWeek,
    start_date: recurring.startDate,
    end_date: recurring.endDate || null,
    is_active: recurring.isActive,
    note: recurring.note || null,
    created_by: recurring.createdBy || null,
  };
}

export function useCatalogMutations({ fetchAll, refreshPositions }: CatalogMutationDeps) {
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
      const { error: insErr } = await dbInsert('shift_types', shiftTypeToRow(shiftType));
      if (insErr) {
        throw new Error(insErr.message || 'Supabase insert failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updateShiftType = useCallback(
    async (shiftType: ShiftType) => {
      const { error: updErr } = await dbUpdate('shift_types', shiftTypeToRow(shiftType), { id: shiftType.id });
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
      const { error: insErr } = await dbInsert('recurring_schedules', recurringToRow(recurring));
      if (insErr) {
        throw new Error(insErr.message || 'Supabase insert failed');
      }
      await fetchAll(true);
    },
    [fetchAll],
  );

  const updateRecurringSchedule = useCallback(
    async (recurring: RecurringSchedule) => {
      const { error: updErr } = await dbUpdate('recurring_schedules', recurringToRow(recurring), { id: recurring.id });
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

  return {
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
    updateSettings,
  };
}
